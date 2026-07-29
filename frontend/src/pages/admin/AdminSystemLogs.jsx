import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AdminLayout from '../../layouts/AdminLayout';
import api from '../../services/api';

const PRIMARY = '#212C61';
const ITEMS_PER_PAGE = 15;
const cn = (...classes) => classes.filter(Boolean).join(' ');

const DATE_OPTIONS = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'thisWeek', label: 'This Week' },
  { value: '7days', label: 'Last 7 Days' },
  { value: 'thisMonth', label: 'This Month' },
  { value: 'lastMonth', label: 'Last Month' },
  { value: 'thisYear', label: 'This Year' },
  { value: 'lastYear', label: 'Last Year' },
  { value: 'custom', label: 'Custom Range' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Most Recent' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'name_asc', label: 'User A to Z' },
  { value: 'name_desc', label: 'User Z to A' },
  { value: 'action_asc', label: 'Action A to Z' },
];

const ROLE_OPTIONS = [
  { value: 'all', label: 'All Roles' },
  { value: 'admin', label: 'Admin' },
  { value: 'employer', label: 'Employer' },
  { value: 'jobseeker', label: 'Jobseeker' },
  { value: 'system', label: 'System' },
  { value: 'unknown', label: 'Unknown' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'success', label: 'Success' },
  { value: 'failed', label: 'Failed' },
  { value: 'warning', label: 'Warning' },
];

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const Icon = ({ name, className = 'h-5 w-5' }) => {
  const common = {
    className,
    fill: 'none',
    stroke: 'currentColor',
    viewBox: '0 0 24 24',
    strokeWidth: 1.9,
    'aria-hidden': true,
  };

  const icons = {
    search: <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35m1.35-5.15a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z" />,
    calendar: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 3v3m10-3v3M4.5 9.5h15" />
        <rect x="4.5" y="5" width="15" height="15" rx="2.5" />
      </>
    ),
    chevronDown: <path strokeLinecap="round" strokeLinejoin="round" d="m8 10 4 4 4-4" />,
    eye: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 12s3.6-6 9.5-6 9.5 6 9.5 6-3.6 6-9.5 6-9.5-6-9.5-6Z" />
        <circle cx="12" cy="12" r="2.5" />
      </>
    ),
    close: <path strokeLinecap="round" strokeLinejoin="round" d="m6 6 12 12M18 6 6 18" />,
    refresh: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7v5h-5M4 17v-5h5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.1 8.2A7 7 0 0 1 18.6 9M17.9 15.8A7 7 0 0 1 5.4 15" />
      </>
    ),
    check: <path strokeLinecap="round" strokeLinejoin="round" d="m5 12.5 4.2 4.2L19 7" />,
    warning: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.3 4.2 2.8 17.3A1.8 1.8 0 0 0 4.4 20h15.2a1.8 1.8 0 0 0 1.6-2.7L13.7 4.2a2 2 0 0 0-3.4 0Z" />
        <path strokeLinecap="round" d="M12 9v4m0 3h.01" />
      </>
    ),
    xCircle: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path strokeLinecap="round" d="m9 9 6 6m0-6-6 6" />
      </>
    ),
    activity: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 18V9m5 9V5m5 13v-7m5 7V3" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 2" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="3.5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 20a7 7 0 0 1 14 0" />
      </>
    ),
    target: (
      <>
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    shield: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3 5 6v5c0 4.7 2.8 8 7 10 4.2-2 7-5.3 7-10V6l-7-3Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="m9.2 12 1.8 1.8 3.8-4" />
      </>
    ),
    clear: <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h18M8 10l4 4m0-4-4 4m9-4v8M7 18h10" />,
  };

  return <svg {...common}>{icons[name] || null}</svg>;
};

const formatDateInput = (date) => {
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return '';
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
};

const formatDateLabel = (value) => {
  if (!value) return 'Select date';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return 'Select date';
  return date.toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatDateTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { date: 'Date unavailable', time: '' };

  return {
    date: date.toLocaleDateString('en-PH', {
      timeZone: 'Asia/Manila',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    time: date.toLocaleTimeString('en-PH', {
      timeZone: 'Asia/Manila',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }),
  };
};

const formatDuration = (value) => {
  const duration = Number(value) || 0;
  if (duration < 1000) return `${duration} ms`;
  return `${(duration / 1000).toFixed(duration < 10000 ? 1 : 0)} s`;
};

const getInitials = (name) => {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  return `${parts[0]?.[0] || 'S'}${parts[1]?.[0] || ''}`.toUpperCase();
};

const getDateLabel = (value, dateFrom, dateTo) => {
  if (value === 'custom' && dateFrom && dateTo) {
    return `${formatDateLabel(dateFrom)} – ${formatDateLabel(dateTo)}`;
  }
  return DATE_OPTIONS.find((option) => option.value === value)?.label || 'All Time';
};

const getYearOptions = () => {
  const current = new Date().getFullYear();
  return Array.from({ length: 30 }, (_, index) => current - 20 + index);
};

const CustomDropdown = ({
  value,
  options,
  onChange,
  label,
  icon,
  disabled = false,
  widthClass = 'w-full',
  menuWidthClass = 'min-w-full',
}) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const selected = options.find((option) => option.value === value) || options[0];

  useEffect(() => {
    if (!open) return undefined;

    const closeOnOutside = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn('relative', widthClass)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((previous) => !previous)}
        className={cn(
          'flex h-11 w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3.5 text-left text-sm font-semibold text-slate-700 shadow-sm transition',
          'hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#212C61]/25 focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60'
        )}
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="flex min-w-0 items-center gap-2.5">
          {icon ? <Icon name={icon} className="h-4 w-4 shrink-0 text-slate-500" /> : null}
          <span className="truncate">{selected?.label || label}</span>
        </span>
        <Icon
          name="chevronDown"
          className={cn('h-4 w-4 shrink-0 text-slate-400 transition-transform', open && 'rotate-180')}
        />
      </button>

      {open ? (
        <div
          className={cn(
            'absolute left-0 top-[calc(100%+8px)] z-[80] max-h-72 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_18px_50px_rgba(15,23,42,0.16)] ring-1 ring-black/5',
            menuWidthClass
          )}
          role="listbox"
          aria-label={label}
        >
          {options.map((option) => {
            const active = option.value === value;
            return (
              <button
                type="button"
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={cn(
                  'flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition',
                  active
                    ? 'bg-[#212C61]/10 text-[#212C61]'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                )}
                role="option"
                aria-selected={active}
              >
                <span className="truncate">{option.label}</span>
                {active ? <Icon name="check" className="h-4 w-4 shrink-0" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};

const CalendarMonth = ({ monthDate, startDate, endDate, onPickDate, onChangeMonth }) => {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const gridStart = new Date(year, month, 1 - firstWeekday);
  const start = startDate ? new Date(`${startDate}T00:00:00`) : null;
  const end = endDate ? new Date(`${endDate}T00:00:00`) : null;
  const days = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return date;
  });

  const sameDay = (first, second) =>
    first && second && first.toDateString() === second.toDateString();
  const inRange = (date) => start && end && date >= start && date <= end;

  return (
    <div className="min-w-0 flex-1">
      <div className="mb-4 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChangeMonth(new Date(year, month - 1, 1))}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xl text-slate-600 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#212C61]/25"
          aria-label="Previous month"
        >
          ‹
        </button>

        <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_90px] gap-2">
          <select
            value={month}
            onChange={(event) => onChangeMonth(new Date(year, Number(event.target.value), 1))}
            className="h-9 min-w-0 rounded-lg border border-slate-200 bg-white px-2 text-sm font-bold text-[#212C61] outline-none focus:border-[#212C61] focus:ring-2 focus:ring-[#212C61]/20"
            aria-label="Select month"
          >
            {MONTH_NAMES.map((name, index) => (
              <option key={name} value={index}>{name}</option>
            ))}
          </select>
          <select
            value={year}
            onChange={(event) => onChangeMonth(new Date(Number(event.target.value), month, 1))}
            className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm font-bold text-[#212C61] outline-none focus:border-[#212C61] focus:ring-2 focus:ring-[#212C61]/20"
            aria-label="Select year"
          >
            {getYearOptions().map((yearOption) => (
              <option key={yearOption} value={yearOption}>{yearOption}</option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => onChangeMonth(new Date(year, month + 1, 1))}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xl text-slate-600 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#212C61]/25"
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 text-center text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => <span key={day}>{day}</span>)}
      </div>

      <div className="mt-2 grid grid-cols-7 gap-y-1 text-center text-sm">
        {days.map((day) => {
          const dateValue = formatDateInput(day);
          const outside = day.getMonth() !== month;
          const selected = sameDay(day, start) || sameDay(day, end);
          const ranged = inRange(day);

          return (
            <button
              type="button"
              key={`${dateValue}-${day.getMonth()}`}
              onClick={() => onPickDate(dateValue)}
              className={cn(
                'mx-auto flex h-9 w-full items-center justify-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#212C61]/25',
                outside ? 'text-slate-300' : 'text-slate-700',
                ranged && !selected ? 'bg-[#212C61]/10 text-[#212C61]' : '',
                selected
                  ? 'rounded-lg bg-[#212C61] font-bold text-white shadow-sm'
                  : 'rounded-md hover:bg-slate-100'
              )}
              aria-label={day.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const DateRangeModal = ({ open, startDate, endDate, onClose, onApply }) => {
  const today = useMemo(() => new Date(), []);
  const [draftStart, setDraftStart] = useState(startDate || formatDateInput(today));
  const [draftEnd, setDraftEnd] = useState(endDate || formatDateInput(today));
  const [leftMonth, setLeftMonth] = useState(new Date());
  const [rightMonth, setRightMonth] = useState(new Date(today.getFullYear(), today.getMonth() + 1, 1));

  useEffect(() => {
    if (!open) return;
    const nextStart = startDate || formatDateInput(today);
    const nextEnd = endDate || formatDateInput(today);
    const start = new Date(`${nextStart}T00:00:00`);
    const end = new Date(`${nextEnd}T00:00:00`);
    setDraftStart(nextStart);
    setDraftEnd(nextEnd);
    setLeftMonth(new Date(start.getFullYear(), start.getMonth(), 1));
    setRightMonth(new Date(end.getFullYear(), end.getMonth(), 1));
  }, [open, startDate, endDate, today]);

  useEffect(() => {
    if (!open) return undefined;
    const handleEscape = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  if (!open) return null;

  const pickDate = (value) => {
    if (!draftStart || (draftStart && draftEnd)) {
      setDraftStart(value);
      setDraftEnd('');
      return;
    }

    if (new Date(`${value}T00:00:00`) < new Date(`${draftStart}T00:00:00`)) {
      setDraftEnd(draftStart);
      setDraftStart(value);
    } else {
      setDraftEnd(value);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/50 px-4 py-6 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="system-log-date-range-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-4xl overflow-hidden rounded-[24px] border border-white/20 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.28)]">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Date Filter</p>
            <h2 id="system-log-date-range-title" className="mt-1 text-xl font-bold text-slate-950">Select custom range</h2>
            <p className="mt-1 text-sm text-slate-500">Choose a start and end date for the system log report.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#212C61]/25"
            aria-label="Close custom date range"
          >
            <Icon name="close" className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-4 bg-slate-50/70 px-6 py-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Start Date</p>
            <p className="mt-1 flex items-center gap-2 text-sm font-bold text-[#212C61]">
              <Icon name="calendar" className="h-4 w-4" /> {formatDateLabel(draftStart)}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">End Date</p>
            <p className="mt-1 flex items-center gap-2 text-sm font-bold text-[#212C61]">
              <Icon name="calendar" className="h-4 w-4" /> {formatDateLabel(draftEnd)}
            </p>
          </div>
        </div>

        <div className="grid gap-8 px-6 py-6 md:grid-cols-2">
          <CalendarMonth
            monthDate={leftMonth}
            startDate={draftStart}
            endDate={draftEnd}
            onPickDate={pickDate}
            onChangeMonth={setLeftMonth}
          />
          <CalendarMonth
            monthDate={rightMonth}
            startDate={draftStart}
            endDate={draftEnd}
            onPickDate={pickDate}
            onChangeMonth={setRightMonth}
          />
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-5">
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!draftStart || !draftEnd}
            onClick={() => onApply(draftStart, draftEnd)}
            className="h-11 rounded-xl bg-[#212C61] px-6 text-sm font-bold text-white shadow-sm transition hover:bg-[#18204b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#212C61] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Apply Range
          </button>
        </div>
      </div>
    </div>
  );
};

const StatusBadge = ({ status }) => {
  const normalized = String(status || '').toLowerCase();
  const config = {
    success: { label: 'Success', classes: 'border-emerald-200 bg-emerald-50 text-emerald-700', icon: 'check' },
    failed: { label: 'Failed', classes: 'border-rose-200 bg-rose-50 text-rose-700', icon: 'xCircle' },
    warning: { label: 'Warning', classes: 'border-amber-200 bg-amber-50 text-amber-700', icon: 'warning' },
  }[normalized] || { label: 'Unknown', classes: 'border-slate-200 bg-slate-50 text-slate-600', icon: 'warning' };

  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold', config.classes)}>
      <Icon name={config.icon} className="h-3.5 w-3.5" />
      {config.label}
    </span>
  );
};

const RoleBadge = ({ role }) => {
  const normalized = String(role || 'unknown').toLowerCase();
  const labels = {
    admin: 'Admin',
    employer: 'Employer',
    jobseeker: 'Jobseeker',
    system: 'System',
    unknown: 'Unknown',
  };

  return (
    <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-600">
      {labels[normalized] || 'Unknown'}
    </span>
  );
};

const DetailRow = ({ label, children, full = false }) => {
  if (children === undefined || children === null || children === '') return null;
  return (
    <div className={cn('rounded-xl border border-slate-200 bg-slate-50/60 p-4', full && 'sm:col-span-2')}>
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <div className="mt-1.5 break-words text-sm font-semibold leading-6 text-slate-800">{children}</div>
    </div>
  );
};

const LogDetailsModal = ({ log, onClose }) => {
  useEffect(() => {
    if (!log) return undefined;
    const handleEscape = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [log, onClose]);

  if (!log) return null;
  const created = formatDateTime(log.createdAt);
  const changedFields = Array.isArray(log.metadata?.changedFields)
    ? log.metadata.changedFields.filter(Boolean)
    : [];
  const requestedValues = log.metadata?.requestedValues && typeof log.metadata.requestedValues === 'object'
    ? log.metadata.requestedValues
    : {};

  return (
    <div
      className="fixed inset-0 z-[180] flex items-center justify-center bg-slate-950/50 px-4 py-6 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="system-log-details-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-[24px] border border-white/20 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.28)]">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={log.status} />
              <RoleBadge role={log.actorRole} />
            </div>
            <h2 id="system-log-details-title" className="mt-3 text-xl font-bold text-slate-950">System log details</h2>
            <p className="mt-1 text-sm text-slate-500">Review the complete audit record for this system activity.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#212C61]/25"
            aria-label="Close system log details"
          >
            <Icon name="close" className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[calc(92vh-92px)] overflow-y-auto px-6 py-6">
          <div className="rounded-2xl border border-[#212C61]/10 bg-[#212C61]/[0.035] p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#212C61]/60">Action</p>
            <h3 className="mt-1 text-lg font-bold text-[#212C61]">{log.actionLabel || 'System action'}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{log.description || 'No additional description was recorded.'}</p>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <DetailRow label="Performed By">
              <div>{log.actorName || 'Unknown user'}</div>
              {log.actorEmail ? <div className="text-xs font-medium text-slate-500">{log.actorEmail}</div> : null}
            </DetailRow>
            <DetailRow label="Date and Time">
              <div>{created.date}</div>
              <div className="text-xs font-medium text-slate-500">{created.time} · Philippine Time</div>
            </DetailRow>
            <DetailRow label="Module">{log.module}</DetailRow>
            <DetailRow label="Target">
              <div>{log.targetName || log.targetType || 'System record'}</div>
              {log.targetId ? <div className="font-mono text-[11px] font-medium text-slate-500">ID: {log.targetId}</div> : null}
            </DetailRow>
            <DetailRow label="Request">
              <div>{log.method || '—'} {log.path || ''}</div>
              <div className="text-xs font-medium text-slate-500">HTTP {log.statusCode || '—'} · {formatDuration(log.durationMs)}</div>
            </DetailRow>
            <DetailRow label="Source">
              <div>{log.ipAddress || 'IP unavailable'}</div>
              {log.requestId ? <div className="font-mono text-[11px] font-medium text-slate-500">Request: {log.requestId}</div> : null}
            </DetailRow>
            {changedFields.length ? (
              <DetailRow label="Changed Fields" full>
                <div className="flex flex-wrap gap-2">
                  {changedFields.map((field) => (
                    <span key={field} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-600">{field}</span>
                  ))}
                </div>
              </DetailRow>
            ) : null}
            {Object.keys(requestedValues).length ? (
              <DetailRow label="Requested Values" full>
                <div className="grid gap-2 sm:grid-cols-2">
                  {Object.entries(requestedValues).map(([key, value]) => (
                    <div key={key} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                      <span className="text-xs font-bold text-slate-500">{key}: </span>
                      <span className="text-xs font-semibold text-slate-800">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </DetailRow>
            ) : null}
            {log.metadata?.errorMessage ? (
              <DetailRow label="Error Message" full>
                <span className="text-rose-700">{log.metadata.errorMessage}</span>
              </DetailRow>
            ) : null}
            {log.userAgent ? (
              <DetailRow label="Browser / Device" full>
                <span className="text-xs font-medium text-slate-600">{log.userAgent}</span>
              </DetailRow>
            ) : null}
          </div>

          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-500">
            Sensitive values such as passwords, tokens, private messages, and uploaded document contents are intentionally excluded from system logs.
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="h-11 rounded-xl bg-[#212C61] px-6 text-sm font-bold text-white transition hover:bg-[#18204b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#212C61] focus-visible:ring-offset-2"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const LoadingRows = () => (
  <div className="divide-y divide-slate-100" aria-label="Loading system logs">
    {Array.from({ length: 7 }, (_, index) => (
      <div key={index} className="grid grid-cols-[1fr_1.25fr_0.7fr_1.45fr_1.15fr_0.65fr_0.42fr] items-center gap-4 px-5 py-4">
        {Array.from({ length: 7 }, (__, column) => (
          <div key={column} className={cn('h-4 animate-pulse rounded bg-slate-100', column === 1 ? 'w-4/5' : 'w-3/4')} />
        ))}
      </div>
    ))}
  </div>
);

const AdminSystemLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);
  const [showDateRangeModal, setShowDateRangeModal] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, pageCount: 1, total: 0 });
  const [filterOptions, setFilterOptions] = useState({ actions: [], modules: [] });
  const [filters, setFilters] = useState({
    search: '',
    role: 'all',
    action: 'all',
    module: 'all',
    status: 'all',
    date: 'all',
    dateFrom: '',
    dateTo: '',
    sort: 'newest',
  });
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(filters.search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [filters.search]);

  const updateFilter = (key, value) => {
    setFilters((previous) => ({ ...previous, [key]: value }));
    setPage(1);
  };

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage('');

      const response = await api.get('/admin/system-logs', {
        params: {
          q: debouncedSearch,
          role: filters.role,
          action: filters.action,
          module: filters.module,
          status: filters.status,
          date: filters.date,
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
          sort: filters.sort,
          page,
          limit: ITEMS_PER_PAGE,
        },
      });

      if (!response.data?.success) throw new Error(response.data?.message || 'Unable to load system logs.');

      setLogs(response.data.data || []);
      setPagination(response.data.pagination || { page: 1, pageCount: 1, total: 0 });
      setFilterOptions(response.data.filterOptions || { actions: [], modules: [] });
    } catch (error) {
      console.error('Error loading system logs:', error);
      setLogs([]);
      setErrorMessage(error.response?.data?.message || error.message || 'Failed to load system logs.');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filters.action, filters.date, filters.dateFrom, filters.dateTo, filters.module, filters.role, filters.sort, filters.status, page]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const actionOptions = useMemo(
    () => [
      { value: 'all', label: 'All Actions' },
      ...(filterOptions.actions || []).map((option) => ({ value: option.value, label: option.label })),
    ],
    [filterOptions.actions]
  );

  const moduleOptions = useMemo(
    () => [
      { value: 'all', label: 'All Modules' },
      ...(filterOptions.modules || []).map((moduleName) => ({ value: moduleName, label: moduleName })),
    ],
    [filterOptions.modules]
  );

  const hasActiveFilters = Boolean(
    filters.search ||
      filters.role !== 'all' ||
      filters.action !== 'all' ||
      filters.module !== 'all' ||
      filters.status !== 'all' ||
      filters.date !== 'all' ||
      filters.sort !== 'newest'
  );

  const clearFilters = () => {
    setFilters({
      search: '',
      role: 'all',
      action: 'all',
      module: 'all',
      status: 'all',
      date: 'all',
      dateFrom: '',
      dateTo: '',
      sort: 'newest',
    });
    setPage(1);
  };

  const handleDateChange = (value) => {
    if (value === 'custom') {
      setShowDateRangeModal(true);
      return;
    }
    setFilters((previous) => ({
      ...previous,
      date: value,
      dateFrom: '',
      dateTo: '',
    }));
    setPage(1);
  };

  const dateOptionsWithSelection = useMemo(
    () => DATE_OPTIONS.map((option) => (
      option.value === 'custom' && filters.date === 'custom' && filters.dateFrom && filters.dateTo
        ? { ...option, label: getDateLabel('custom', filters.dateFrom, filters.dateTo) }
        : option
    )),
    [filters.date, filters.dateFrom, filters.dateTo]
  );

  return (
    <AdminLayout>
      <main className="mx-auto w-full max-w-[1420px] px-1 py-8">
        <header className="mb-5">
          <h1 className="text-2xl font-bold tracking-[-0.02em] text-slate-950 sm:text-3xl">System Logs</h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">
            Review account, verification, job, application, archive, and community activity.
          </p>
        </header>

        <section className="relative z-30 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(280px,1.7fr)_150px_190px_180px_150px_170px]">
            <label className="relative block">
              <span className="sr-only">Search system logs</span>
              <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={filters.search}
                onChange={(event) => updateFilter('search', event.target.value)}
                placeholder="Search user, action, target…"
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm font-medium text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-[#212C61] focus:ring-2 focus:ring-[#212C61]/10"
              />
            </label>

            <CustomDropdown
              value={filters.role}
              options={ROLE_OPTIONS}
              onChange={(value) => updateFilter('role', value)}
              label="Filter by role"
            />
            <CustomDropdown
              value={filters.action}
              options={actionOptions}
              onChange={(value) => updateFilter('action', value)}
              label="Filter by action"
              menuWidthClass="min-w-full xl:w-72"
            />
            <CustomDropdown
              value={filters.module}
              options={moduleOptions}
              onChange={(value) => updateFilter('module', value)}
              label="Filter by module"
              menuWidthClass="min-w-full xl:w-64"
            />
            <CustomDropdown
              value={filters.status}
              options={STATUS_OPTIONS}
              onChange={(value) => updateFilter('status', value)}
              label="Filter by status"
            />
            <CustomDropdown
              value={filters.date}
              options={dateOptionsWithSelection}
              onChange={handleDateChange}
              label="Filter by date"
              icon="calendar"
              menuWidthClass="min-w-full xl:w-60"
            />
          </div>

          <div className="mt-3 flex flex-col gap-3 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-medium text-slate-500">
              <span className="font-bold text-slate-800">{pagination.total || 0}</span> record(s) found
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <CustomDropdown
                value={filters.sort}
                options={SORT_OPTIONS}
                onChange={(value) => updateFilter('sort', value)}
                label="Sort system logs"
                widthClass="w-full sm:w-52"
                menuWidthClass="w-60"
              />
              <button
                type="button"
                onClick={clearFilters}
                disabled={!hasActiveFilters}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Icon name="clear" className="h-4 w-4" />
                Clear Filters
              </button>
            </div>
          </div>
        </section>

        <section className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <div className="min-w-[1080px]">
              <div className="grid grid-cols-[1fr_1.25fr_0.7fr_1.45fr_1.15fr_0.65fr_0.42fr] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                <span>Date & Time</span>
                <span>Performed By</span>
                <span>Role</span>
                <span>Action / Module</span>
                <span>Target</span>
                <span>Status</span>
                <span>Actions</span>
              </div>

              {loading ? (
                <LoadingRows />
              ) : errorMessage ? (
                <div className="flex min-h-[360px] flex-col items-center justify-center px-6 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                    <Icon name="warning" className="h-7 w-7" />
                  </div>
                  <h2 className="mt-4 text-lg font-bold text-slate-900">Unable to load system logs</h2>
                  <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">{errorMessage}</p>
                  <button
                    type="button"
                    onClick={() => loadLogs()}
                    className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-[#212C61] px-4 text-sm font-bold text-white transition hover:bg-[#18204b]"
                  >
                    <Icon name="refresh" className="h-4 w-4" /> Retry
                  </button>
                </div>
              ) : logs.length === 0 ? (
                <div className="flex min-h-[360px] flex-col items-center justify-center px-6 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#212C61]/10 text-[#212C61]">
                    <Icon name="activity" className="h-7 w-7" />
                  </div>
                  <h2 className="mt-4 text-lg font-bold text-slate-900">{hasActiveFilters ? 'No matching logs found' : 'No system logs yet'}</h2>
                  <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">
                    {hasActiveFilters
                      ? 'Try adjusting or clearing the current filters.'
                      : 'Important system activities will appear here after users perform supported actions.'}
                  </p>
                  {hasActiveFilters ? (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="mt-4 h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                    >
                      Clear Filters
                    </button>
                  ) : null}
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {logs.map((log) => {
                    const created = formatDateTime(log.createdAt);
                    return (
                      <div
                        key={log.id}
                        className="grid grid-cols-[1fr_1.25fr_0.7fr_1.45fr_1.15fr_0.65fr_0.42fr] items-center gap-4 px-5 py-4 transition hover:bg-slate-50/70"
                      >
                        <div>
                          <p className="text-sm font-bold text-slate-800">{created.date}</p>
                          <p className="mt-0.5 text-[11px] font-medium text-slate-500">{created.time}</p>
                        </div>

                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#212C61]/10 text-[11px] font-bold text-[#212C61]">
                            {getInitials(log.actorName)}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-slate-900">{log.actorName || 'Unknown user'}</p>
                            <p className="mt-0.5 truncate text-[11px] text-slate-500">{log.actorEmail || 'No email recorded'}</p>
                          </div>
                        </div>

                        <RoleBadge role={log.actorRole} />

                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-900">{log.actionLabel || 'System action'}</p>
                          <p className="mt-0.5 truncate text-[11px] font-medium text-[#212C61]/70">{log.module || 'System'}</p>
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-700">{log.targetName || log.targetType || 'System record'}</p>
                          <p className="mt-0.5 truncate text-[11px] text-slate-500">{log.targetType || 'System'}</p>
                        </div>

                        <StatusBadge status={log.status} />

                        <button
                          type="button"
                          onClick={() => setSelectedLog(log)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-[#212C61]/40 hover:bg-[#212C61]/5 hover:text-[#212C61] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#212C61]/20"
                          aria-label={`View details for ${log.actionLabel || 'system log'}`}
                          title="View log details"
                        >
                          <Icon name="eye" className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/50 px-5 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Showing {pagination.total === 0 ? 0 : (pagination.page - 1) * ITEMS_PER_PAGE + 1} to{' '}
              {Math.min(pagination.page * ITEMS_PER_PAGE, pagination.total || 0)} of {pagination.total || 0} results
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="h-9 rounded-lg border border-slate-200 bg-white px-3 font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>
              <span className="flex h-9 min-w-9 items-center justify-center rounded-lg px-3 font-bold text-white" style={{ backgroundColor: PRIMARY }}>
                {pagination.page || page}
              </span>
              <span className="px-1 text-slate-400">of {pagination.pageCount || 1}</span>
              <button
                type="button"
                disabled={page >= (pagination.pageCount || 1) || loading}
                onClick={() => setPage((current) => Math.min(pagination.pageCount || 1, current + 1))}
                className="h-9 rounded-lg border border-slate-200 bg-white px-3 font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </section>
      </main>

      <DateRangeModal
        open={showDateRangeModal}
        startDate={filters.dateFrom}
        endDate={filters.dateTo}
        onClose={() => setShowDateRangeModal(false)}
        onApply={(dateFrom, dateTo) => {
          setFilters((previous) => ({ ...previous, date: 'custom', dateFrom, dateTo }));
          setShowDateRangeModal(false);
          setPage(1);
        }}
      />
      <LogDetailsModal log={selectedLog} onClose={() => setSelectedLog(null)} />
    </AdminLayout>
  );
};

export default AdminSystemLogs;
