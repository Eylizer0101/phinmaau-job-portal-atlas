import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import EmployerLayout from '../../../layouts/EmployerLayout';
import api from '../../../services/api';

const cn = (...classes) => classes.filter(Boolean).join(' ');


const EMPLOYER_DATE_FILTER_OPTIONS = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'this_week', label: 'This Week' },
  { value: 'last_7_days', label: 'Last 7 Days' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'this_year', label: 'This Year' },
  { value: 'last_year', label: 'Last Year' },
  { value: 'custom', label: 'Custom Range' },
];

const formatEmployerDateInput = (date) => {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const formatEmployerDateLabel = (value) => {
  if (!value) return 'Select date';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return 'Select date';
  return date.toLocaleDateString('en-PH', { month: 'short', day: '2-digit', year: 'numeric' });
};

const getEmployerDateFilterLabel = (value, startDate, endDate) => {
  if (value === 'custom' && startDate && endDate) {
    return `${formatEmployerDateLabel(startDate)} - ${formatEmployerDateLabel(endDate)}`;
  }
  return EMPLOYER_DATE_FILTER_OPTIONS.find((option) => option.value === value)?.label || 'All Time';
};

const EmployerDateFilterDropdown = ({ value, startDate, endDate, disabled, onSelect }) => {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const handleClick = (event) => {
      if (!dropdownRef.current?.contains(event.target)) setOpen(false);
    };
    window.addEventListener('mousedown', handleClick);
    return () => window.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-[50px] w-full items-center justify-between rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-900 transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2 disabled:bg-gray-50 disabled:opacity-60"
      >
        <span className="truncate">{getEmployerDateFilterLabel(value, startDate, endDate)}</span>
        <svg className="h-4 w-4 shrink-0 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3M5 11h14M6 5h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2z" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-[52px] z-50 w-56 rounded-2xl border border-gray-100 bg-white p-2 shadow-xl ring-1 ring-black/5">
          <div className="space-y-1">
            {EMPLOYER_DATE_FILTER_OPTIONS.map((option) => (
              <button
                type="button"
                key={option.value}
                onClick={() => {
                  setOpen(false);
                  onSelect(option.value);
                }}
                className={cn(
                  'w-full rounded-xl px-3 py-2 text-left text-sm font-semibold transition',
                  value === option.value
                    ? 'bg-[#2e66a6]/10 text-[#2e66a6]'
                    : 'text-slate-600 hover:bg-slate-50'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const EmployerCustomDateRangeModal = ({ open, startDate, endDate, onCancel, onApply }) => {
  const todayValue = formatEmployerDateInput(new Date());
  const [draftStart, setDraftStart] = useState(startDate || todayValue);
  const [draftEnd, setDraftEnd] = useState(endDate || todayValue);
  const [startView, setStartView] = useState(() => new Date());
  const [endView, setEndView] = useState(() => new Date());

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const weekdayNames = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

  const parseDateValue = (value) => {
    if (!value) return null;
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const toDateValue = (date) => formatEmployerDateInput(date);

  const sameDate = (first, second) =>
    first &&
    second &&
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate();

  const getCalendarCells = (viewDate) => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startOffset = firstDay.getDay();
    const cells = [];

    for (let index = 0; index < 42; index += 1) {
      cells.push(new Date(year, month, index - startOffset + 1));
    }

    return cells;
  };

  useEffect(() => {
    if (!open) return;

    const initialStart = parseDateValue(startDate) || new Date();
    const initialEnd = parseDateValue(endDate) || initialStart;

    setDraftStart(toDateValue(initialStart));
    setDraftEnd(toDateValue(initialEnd));
    setStartView(new Date(initialStart.getFullYear(), initialStart.getMonth(), 1));
    setEndView(new Date(initialEnd.getFullYear(), initialEnd.getMonth(), 1));
  }, [open, startDate, endDate]);

  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleEscape = (event) => {
      if (event.key === 'Escape') onCancel();
    };

    window.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleEscape);
    };
  }, [open, onCancel]);

  if (!open) return null;

  const selectedStart = parseDateValue(draftStart);
  const selectedEnd = parseDateValue(draftEnd);

  const invalidRange =
    !selectedStart ||
    !selectedEnd ||
    selectedStart.getTime() > selectedEnd.getTime();

  const yearOptions = Array.from({ length: 21 }, (_, index) => new Date().getFullYear() - 10 + index);

  const CalendarPanel = ({ label, value, viewDate, onViewChange, onDateChange, minimumDate }) => {
    const selectedDate = parseDateValue(value);
    const cells = getCalendarCells(viewDate);

    const moveMonth = (amount) => {
      onViewChange(new Date(viewDate.getFullYear(), viewDate.getMonth() + amount, 1));
    };

    return (
      <div className="min-w-0">
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">
          {label}
        </p>

        <div className="mt-3 flex h-14 items-center gap-3 rounded-xl bg-[#edf3fb] px-5 text-[#2e66a6]">
          <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3M5 11h14M6 5h12a2 2 0 012 2v12a2 2 0 01-2-2V7a2 2 0 012-2z" />
          </svg>
          <span className="truncate text-lg font-extrabold">
            {selectedDate
              ? selectedDate.toLocaleDateString('en-PH', {
                  month: 'short',
                  day: '2-digit',
                  year: 'numeric',
                })
              : 'Select date'}
          </span>
        </div>

        <div className="mt-5 flex items-center gap-2">
          <button
            type="button"
            onClick={() => moveMonth(-1)}
            className="flex h-10 w-8 shrink-0 items-center justify-center rounded-lg text-xl font-bold text-slate-600 hover:bg-slate-100"
            aria-label={`Previous month for ${label}`}
          >
            ‹
          </button>

          <select
            value={viewDate.getMonth()}
            onChange={(event) =>
              onViewChange(new Date(viewDate.getFullYear(), Number(event.target.value), 1))
            }
            className="h-10 min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-3 text-center text-sm font-bold text-[#2e66a6] outline-none focus:border-[#2e66a6]"
          >
            {monthNames.map((month, index) => (
              <option key={month} value={index}>
                {month}
              </option>
            ))}
          </select>

          <select
            value={viewDate.getFullYear()}
            onChange={(event) =>
              onViewChange(new Date(Number(event.target.value), viewDate.getMonth(), 1))
            }
            className="h-10 w-[94px] rounded-lg border border-gray-200 bg-white px-3 text-center text-sm font-bold text-[#2e66a6] outline-none focus:border-[#2e66a6]"
          >
            {yearOptions.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => moveMonth(1)}
            className="flex h-10 w-8 shrink-0 items-center justify-center rounded-lg text-xl font-bold text-slate-600 hover:bg-slate-100"
            aria-label={`Next month for ${label}`}
          >
            ›
          </button>
        </div>

        <div className="mt-4 grid grid-cols-7 text-center">
          {weekdayNames.map((day) => (
            <div key={day} className="pb-2 text-[11px] font-extrabold text-slate-500">
              {day}
            </div>
          ))}

          {cells.map((date) => {
            const outsideMonth = date.getMonth() !== viewDate.getMonth();
            const isSelected = sameDate(date, selectedDate);
            const isRangeStart = sameDate(date, selectedStart);
            const isRangeEnd = sameDate(date, selectedEnd);
            const isInRange =
              selectedStart &&
              selectedEnd &&
              date.getTime() >= selectedStart.getTime() &&
              date.getTime() <= selectedEnd.getTime();
            const isDisabled =
              minimumDate &&
              new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() <
                new Date(
                  minimumDate.getFullYear(),
                  minimumDate.getMonth(),
                  minimumDate.getDate()
                ).getTime();

            return (
              <button
                key={`${label}-${date.toISOString()}`}
                type="button"
                disabled={isDisabled}
                onClick={() => onDateChange(toDateValue(date))}
                className={cn(
                  'my-1 flex h-9 w-full items-center justify-center text-sm font-semibold transition',
                  isInRange && !isRangeStart && !isRangeEnd
                    ? 'bg-[#e7edf5] text-slate-700'
                    : outsideMonth
                    ? 'text-slate-300 hover:bg-slate-50'
                    : 'text-slate-600 hover:bg-slate-100',
                  (isRangeStart || isRangeEnd) &&
                    'mx-auto w-9 rounded-lg bg-[#2e66a6] text-white shadow-sm ring-1 ring-[#dce8f7]',
                  isSelected && !isRangeStart && !isRangeEnd && 'mx-auto w-9 rounded-lg bg-[#2e66a6] text-white',
                  isDisabled && !isInRange && 'cursor-not-allowed text-slate-200 hover:bg-transparent'
                )}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 px-4 py-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Select custom date range"
        className="w-full max-w-[960px] overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="grid gap-8 px-6 pb-8 pt-6 md:grid-cols-[1fr_auto_1fr] md:px-8">
          <CalendarPanel
            label="Start Date"
            value={draftStart}
            viewDate={startView}
            onViewChange={setStartView}
            onDateChange={(value) => {
              setDraftStart(value);
              const nextStart = parseDateValue(value);
              const currentEnd = parseDateValue(draftEnd);

              if (!currentEnd || (nextStart && nextStart > currentEnd)) {
                setDraftEnd(value);
                setEndView(new Date(nextStart.getFullYear(), nextStart.getMonth(), 1));
              }
            }}
          />

          <div className="hidden items-start pt-10 text-3xl text-slate-500 md:flex">→</div>

          <CalendarPanel
            label="End Date"
            value={draftEnd}
            viewDate={endView}
            onViewChange={setEndView}
            onDateChange={setDraftEnd}
            minimumDate={selectedStart}
          />
        </div>

        {invalidRange && (
          <p className="px-6 pb-3 text-sm font-semibold text-red-600 md:px-8">
            End date must be the same as or later than the start date.
          </p>
        )}

        <div className="flex items-center justify-end gap-5 border-t border-gray-100 px-6 py-5 md:px-8">
          <button
            type="button"
            onClick={onCancel}
            className="text-sm font-extrabold text-slate-600 transition hover:text-slate-900"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={invalidRange}
            onClick={() => onApply(draftStart, draftEnd)}
            className="h-12 rounded-xl bg-[#2e66a6] px-8 text-base font-extrabold text-white shadow-lg shadow-[#2e66a6]/20 transition hover:bg-[#255487] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Apply Range
          </button>
        </div>
      </div>
    </div>
  );
};

const ITEMS_PER_PAGE = 9;


const Icon = ({ name, className = 'h-5 w-5', ...props }) => {
  const common = { className, fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24', ...props };

  switch (name) {
    case 'search':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.3-4.3m1.3-5.2a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      );
    case 'eye':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      );
    case 'check':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      );
    case 'x':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      );
    case 'calendar':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10m-13 9h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v11a2 2 0 002 2z" />
        </svg>
      );
    case 'clock':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'chevron-left':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      );
    case 'chevron-right':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      );
    case 'location':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      );
    case 'video':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14m-9 4h8a2 2 0 002-2V8a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      );
    case 'user':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A9.953 9.953 0 0112 15c2.4 0 4.605.846 6.326 2.255M15 9a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      );
    case 'message':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h8m-8 4h5m7-2a8 8 0 01-8 8 8.7 8.7 0 01-3.7-.8L4 20l.8-4.3A8 8 0 1120 12z" />
        </svg>
      );
    case 'refresh':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v6h6M20 20v-6h-6M5.6 15A7 7 0 0018 17.4M18.4 9A7 7 0 006 6.6" />
        </svg>
      );
    case 'trash':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 7h12m-9 0V5h6v2m-8 0 1 13h8l1-13M10 11v5m4-5v5" />
        </svg>
      );
    case 'send':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 11l18-8-8 18-2-7-8-3zM11 14l4-4" />
        </svg>
      );
    case 'dots-vertical':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5h.01M12 12h.01M12 19h.01" />
        </svg>
      );
    case 'chevron-down':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      );
    default:
      return null;
  }
};

const Alert = ({ type = 'error', children, onClose }) => {
  const isError = type === 'error';
  const styles = isError
    ? 'border-red-200 bg-red-50 text-red-900'
    : 'border-green-200 bg-green-50 text-green-900';
  const ring = isError ? 'focus-visible:ring-red-600' : 'focus-visible:ring-green-600';

  return (
    <div
      className={cn('mb-5 flex items-start justify-between gap-4 rounded-xl border p-4 text-sm font-medium', styles)}
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
    >
      <div className="min-w-0">{children}</div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className={cn('shrink-0 rounded-lg px-2 py-1 text-xs font-semibold hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2', ring)}
          aria-label="Dismiss message"
        >
          Dismiss
        </button>
      )}
    </div>
  );
};

const Button = ({ variant = 'secondary', className = '', children, ...props }) => {
  const variants = {
    secondary: 'border border-gray-200 bg-white text-gray-900 hover:bg-gray-50',
    success: 'bg-[#2e66a6] text-white hover:bg-[#23508a]',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    outlineBlue: 'border border-[#2e66a6] bg-white text-[#2e66a6] hover:bg-blue-50',
    softWarning: 'border border-[#e7c86a] bg-[#fff4cc] text-[#9a6a00] hover:bg-[#ffefb3]',
    dangerSoft: 'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100',
  };

  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

const formatDate = (dateValue) => {
  if (!dateValue) return 'TBS';
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return 'TBS';
  return d.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const formatTimeOnly = (dateValue) => {
  if (!dateValue) return '';
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-PH', {
    hour: 'numeric',
    minute: '2-digit',
  });
};

const buildApplicantName = (u) => {
  const full = (u?.fullName || '').trim();
  if (full) return full;

  const parts = [u?.firstName, u?.middleName, u?.lastName]
    .map((p) => (p || '').trim())
    .filter(Boolean);

  if (parts.length) return parts.join(' ');

  const email = (u?.email || '').trim();
  if (email && email.includes('@')) return email.split('@')[0];

  return 'Applicant';
};

const getApplicantContact = (jobseeker) =>
  String(
    jobseeker?.phoneNumber ||
      jobseeker?.contactNumber ||
      jobseeker?.jobSeekerProfile?.phoneNumber ||
      jobseeker?.jobSeekerProfile?.mobileNumber ||
      ''
  ).trim() || '—';

const FOR_INTERVIEW_DECLINE_REASONS = [
  'Interview performance did not meet expectations',
  'Skills assessment below required level',
  'Communication skills need improvement',
  'Schedule or availability conflict',
  'Position requirements not fully met',
  'Failed to attend scheduled interview',
];

const DeclineReasonModal = ({
  open,
  applicantName,
  selectedReason,
  comment,
  onReasonChange,
  onCommentChange,
  onClose,
  onConfirm,
  isSubmitting = false,
}) => {
  const closeButtonRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => closeButtonRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, onClose, isSubmitting]);

  if (!open) return null;

  const canSubmit = !!selectedReason && !isSubmitting;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center px-4 py-6">
      <div
        className="absolute inset-0 bg-black/45"
        onClick={() => {
          if (!isSubmitting) onClose?.();
        }}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="for-interview-decline-title"
        className="relative w-full max-w-5xl rounded-[28px] border border-gray-200 bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-5 sm:px-8">
          <div>
            <h2 id="for-interview-decline-title" className="text-2xl font-bold text-gray-900">
              Do you want to decline this application?
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-gray-500">
              If yes, please choose one of the following reasons or leave a comment.
            </p>
            <p className="text-sm leading-7 text-gray-500">
              so the applicant receives feedback.
              {applicantName ? ` Applicant: ${applicantName}.` : ''}
            </p>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Close decline modal"
          >
            <Icon name="x" className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-gray-200 px-6 py-6 sm:px-8">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {FOR_INTERVIEW_DECLINE_REASONS.map((reason) => {
              const isSelected = selectedReason === reason;

              return (
                <button
                  key={reason}
                  type="button"
                  onClick={() => onReasonChange(reason)}
                  disabled={isSubmitting}
                  className={cn(
                    'min-h-[84px] rounded-2xl border px-4 py-4 text-center text-sm font-medium leading-7 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60',
                    isSelected
                      ? 'border-[#9db9df] bg-[#f4f8fd] text-gray-900 shadow-sm'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                  )}
                >
                  {reason}
                </button>
              );
            })}
          </div>
        </div>

        <div className="px-6 py-6 sm:px-8">
          <label htmlFor="forInterviewDeclineComment" className="sr-only">
            Leave a comment for the applicant
          </label>
          <textarea
            id="forInterviewDeclineComment"
            value={comment}
            onChange={(e) => onCommentChange(e.target.value)}
            disabled={isSubmitting}
            rows={5}
            placeholder="Leave a comment for the applicant..."
            className="w-full rounded-2xl border border-gray-200 px-4 py-4 text-sm text-gray-900 placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-60"
          />

          {!selectedReason && (
            <div className="mt-3 text-sm font-medium text-red-600">
              Please select a decline reason before continuing.
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 pb-6 sm:px-8">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting} className="min-w-[110px]">
            Cancel
          </Button>
          <Button
            variant="dangerSoft"
            onClick={onConfirm}
            disabled={!canSubmit}
            className="min-w-[170px] bg-red-600 text-white border-red-600 hover:bg-red-700 disabled:opacity-100 disabled:bg-red-300 disabled:text-white disabled:border-red-300"
          >
            {isSubmitting ? 'Declining...' : 'Decline Application'}
          </Button>
        </div>
      </div>
    </div>
  );
};

const MessagePopup = ({ open, onClose, application }) => {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);

  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  }, []);

  const applicant = application?.jobseeker;
  const applicantId = applicant?._id || applicant?.id;
  const employerId = currentUser?._id || currentUser?.id || application?.employer?._id || application?.employer;
  const conversationId = applicantId && employerId
    ? [String(applicantId), String(employerId)].sort().join('_')
    : '';

  const loadMessages = useCallback(async () => {
    if (!open || !conversationId) return;

    try {
      setLoading(true);
      setError('');
      const response = await api.get(`/messages/conversation/${conversationId}`);
      setMessages(response.data?.data || []);
      await api.put(`/messages/mark-read/${conversationId}`).catch(() => {});
    } catch (loadError) {
      setError(loadError?.response?.data?.message || 'Failed to load messages.');
    } finally {
      setLoading(false);
    }
  }, [open, conversationId]);

  useEffect(() => {
    if (!open) {
      setMessages([]);
      setText('');
      setError('');
      return;
    }
    loadMessages();
  }, [open, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!open || !application) return null;

  const sendMessage = async () => {
    const content = text.trim();
    if (!content || sending || !applicantId) return;

    try {
      setSending(true);
      setError('');
      const response = await api.post('/messages/send', {
        receiverId: applicantId,
        content,
        jobId: application?.job?._id || application?.job,
        applicationId: application?._id,
      });

      setText('');
      if (response.data?.data) {
        setMessages((previous) => [...previous, response.data.data]);
      } else {
        await loadMessages();
      }
    } catch (sendError) {
      setError(sendError?.response?.data?.message || 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true" aria-label="Messages">
      <div className="flex h-[78vh] w-full max-w-2xl flex-col overflow-hidden rounded-[24px] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="font-semibold text-gray-900">Messages</h2>
            <p className="text-sm text-gray-500">{buildApplicantName(applicant)}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 hover:bg-gray-100" aria-label="Close messages">
            <Icon name="x" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-gray-50 p-5">
          {loading ? (
            <div className="flex justify-center py-10 text-[#2e66a6]">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-current border-r-transparent" />
            </div>
          ) : messages.length ? (
            <div className="space-y-3">
              {messages.map((message) => {
                const mine = String(message.sender?._id || message.sender) === String(employerId);
                return (
                  <div key={message._id || `${message.createdAt}-${message.content}`} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                    <div className={cn('max-w-[78%] rounded-2xl px-4 py-3 text-sm', mine ? 'rounded-br-md bg-[#2e66a6] text-white' : 'rounded-bl-md border bg-white text-gray-900')}>
                      <p className="whitespace-pre-wrap break-words">{message.content}</p>
                      <div className={cn('mt-1 text-[10px]', mine ? 'text-blue-100' : 'text-gray-400')}>
                        {formatTimeOnly(message.createdAt)}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          ) : (
            <div className="py-16 text-center text-sm text-gray-500">
              No messages yet. Start the conversation with this applicant.
            </div>
          )}

          {error ? <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
        </div>

        <div className="border-t p-4">
          <div className="flex gap-2">
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  sendMessage();
                }
              }}
              rows={2}
              placeholder="Type a message..."
              className="flex-1 resize-none rounded-xl border px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#2e66a6] focus:outline-none"
            />
            <button
              type="button"
              onClick={sendMessage}
              disabled={!text.trim() || sending}
              className="flex h-11 w-11 items-center justify-center self-end rounded-xl bg-[#2e66a6] text-white disabled:opacity-50"
              aria-label="Send message"
            >
              {sending ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-r-transparent" /> : <Icon name="send" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const HiringStageModal = ({
  open,
  application,
  defaultStages,
  customStages,
  busy,
  onClose,
  onSelect,
  onAddCustom,
  onDeleteStage,
}) => {
  const [customStage, setCustomStage] = useState('');
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (open) {
      setCustomStage('');
      setLocalError('');
    }
  }, [open, application?._id]);

  if (!open || !application) return null;

  const currentStage = String(application?.hiringStage || '').trim();
  const stages = [...defaultStages, ...customStages];

  const addCustomStage = async () => {
    const value = customStage.replace(/\s+/g, ' ').trim();
    if (!value) {
      setLocalError('Enter a custom stage name.');
      return;
    }
    setLocalError('');
    const added = await onAddCustom(value);
    if (added) setCustomStage('');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4 py-6" role="dialog" aria-modal="true" aria-label="Update hiring stage">
      <div className="w-full max-w-[520px] overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between px-6 pb-3 pt-5">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Update Hiring Stage</h2>
            <p className="mt-1 text-sm text-gray-500">
              {buildApplicantName(application.jobseeker)} — {application.job?.title || 'Job'} @ {application.job?.companyName || 'Company'}
            </p>
          </div>
          <button type="button" onClick={onClose} disabled={busy} className="rounded-full p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-50" aria-label="Close hiring stage modal">
            <Icon name="x" className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 pb-5">
          <div className="mb-2 flex items-center justify-between text-xs font-semibold text-gray-700">
            <span>Select stage</span>
            <span className="text-gray-500">{stages.length} stage(s)</span>
          </div>

          <div className="max-h-[330px] space-y-2 overflow-y-auto pr-1">
            {stages.map((stage) => {
              const selected = stage.toLowerCase() === currentStage.toLowerCase();

              return (
                <div
                  key={stage}
                  className={cn(
                    'flex min-h-[48px] items-center rounded-xl border bg-white transition',
                    selected ? 'border-[#102a78] ring-1 ring-[#102a78]' : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onSelect(stage)}
                    className="flex min-w-0 flex-1 items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold text-gray-900 disabled:opacity-60"
                  >
                    <span className="truncate">{stage}</span>
                    {selected ? <Icon name="check" className="h-4 w-4 shrink-0" /> : null}
                  </button>

                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onDeleteStage(stage)}
                    className="mr-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-50"
                    aria-label={`Delete ${stage}`}
                    title={`Delete ${stage}`}
                  >
                    <Icon name="trash" className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="mt-4">
            <label htmlFor="customHiringStage" className="text-sm font-semibold text-gray-800">
              Not listed? Add a custom stage
            </label>
            <div className="mt-2 flex gap-2">
              <input
                id="customHiringStage"
                value={customStage}
                onChange={(event) => setCustomStage(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    addCustomStage();
                  }
                }}
                maxLength={80}
                placeholder="e.g. Panel Interview"
                className="h-11 min-w-0 flex-1 rounded-xl border border-gray-300 px-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#2e66a6] focus:outline-none focus:ring-2 focus:ring-[#2e66a6]/20"
              />
              <button
                type="button"
                disabled={busy || !customStage.trim()}
                onClick={addCustomStage}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#102a78] px-5 text-sm font-semibold text-white hover:bg-[#0d2365] disabled:opacity-50"
              >
                <span className="text-lg leading-none">+</span>
                Add
              </button>
            </div>
            {localError ? <p className="mt-2 text-xs font-medium text-red-600">{localError}</p> : null}
          </div>

          <div className="mt-4 flex justify-end">
            <button type="button" onClick={onClose} disabled={busy} className="h-10 rounded-xl border border-gray-300 bg-white px-5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ActionMenu = ({
  app,
  name,
  rowBusy,
  onHire,
  onDecline,
  openMenuId,
  setOpenMenuId,
}) => {
  const isOpen = openMenuId === app._id;
  const wrapperRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const [menuPosition, setMenuPosition] = useState(null);
  const [triggerVisible, setTriggerVisible] = useState(false);

  const updateMenuPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger || typeof window === 'undefined') {
      setMenuPosition(null);
      setTriggerVisible(false);
      return false;
    }

    const triggerRect = trigger.getBoundingClientRect();
    const isActuallyVisible =
      triggerRect.width > 0 &&
      triggerRect.height > 0 &&
      triggerRect.bottom > 0 &&
      triggerRect.right > 0 &&
      triggerRect.top < window.innerHeight &&
      triggerRect.left < window.innerWidth;

    if (!isActuallyVisible) {
      setMenuPosition(null);
      setTriggerVisible(false);
      return false;
    }

    const menuWidth = menuRef.current?.offsetWidth || 224;
    const menuHeight = menuRef.current?.offsetHeight || 112;
    const viewportPadding = 12;
    const gap = 8;

    let left = triggerRect.right - menuWidth;
    left = Math.max(
      viewportPadding,
      Math.min(left, window.innerWidth - menuWidth - viewportPadding)
    );

    let top = triggerRect.bottom + gap;
    if (top + menuHeight > window.innerHeight - viewportPadding) {
      top = triggerRect.top - menuHeight - gap;
    }
    top = Math.max(
      viewportPadding,
      Math.min(top, window.innerHeight - menuHeight - viewportPadding)
    );

    setTriggerVisible(true);
    setMenuPosition({ top, left });
    return true;
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setMenuPosition(null);
      setTriggerVisible(false);
      return undefined;
    }

    const visible = updateMenuPosition();
    if (!visible) return undefined;

    const handleClickOutside = (event) => {
      const clickedTriggerArea = wrapperRef.current?.contains(event.target);
      const clickedMenu = menuRef.current?.contains(event.target);

      if (!clickedTriggerArea && !clickedMenu) {
        setOpenMenuId((previous) => (previous === app._id ? null : previous));
      }
    };

    const animationFrame = window.requestAnimationFrame(updateMenuPosition);

    document.addEventListener('mousedown', handleClickOutside, true);
    window.addEventListener('resize', updateMenuPosition);
    window.addEventListener('scroll', updateMenuPosition, true);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      document.removeEventListener('mousedown', handleClickOutside, true);
      window.removeEventListener('resize', updateMenuPosition);
      window.removeEventListener('scroll', updateMenuPosition, true);
    };
  }, [isOpen, setOpenMenuId, app._id, updateMenuPosition]);

  const runAction = (event, action) => {
    event.preventDefault();
    event.stopPropagation();
    setOpenMenuId(null);
    if (typeof action === 'function') action();
  };

  const actionDropdown =
    isOpen && triggerVisible && menuPosition && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={menuRef}
            className="fixed z-[9999] w-56 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-xl pointer-events-auto"
            style={{
              top: `${menuPosition.top}px`,
              left: `${menuPosition.left}px`,
            }}
            role="menu"
            aria-label={`Actions for ${name}`}
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onMouseDown={(event) => event.stopPropagation()}
              onClick={(event) => runAction(event, onHire)}
              disabled={rowBusy || app.alreadyEmployed}
              title={app.alreadyEmployed ? 'This applicant is already employed through another job application.' : ''}
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
              role="menuitem"
            >
              <Icon name="check" className="h-4 w-4" />
              Hired
            </button>

            <button
              type="button"
              onMouseDown={(event) => event.stopPropagation()}
              onClick={(event) => runAction(event, onDecline)}
              disabled={rowBusy}
              className="flex w-full items-center gap-3 border-t border-gray-100 px-4 py-3 text-left text-sm font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              role="menuitem"
            >
              <Icon name="x" className="h-4 w-4" />
              Decline
            </button>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <div
        ref={wrapperRef}
        className="relative flex items-center justify-end gap-2 whitespace-nowrap"
        onClick={(event) => event.stopPropagation()}
      >
        <Link
          to={`/employer/application/${app._id}?from=for-interview`}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          aria-label={`View application of ${name}`}
        >
          <Icon name="eye" className="h-4 w-4" />
          View
        </Link>

        <button
          ref={triggerRef}
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();

            if (isOpen) {
              setOpenMenuId(null);
              return;
            }

            setMenuPosition(null);
            setTriggerVisible(false);
            setOpenMenuId(app._id);
          }}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
          aria-label={`More actions for ${name}`}
          aria-expanded={isOpen}
          aria-haspopup="menu"
        >
          <Icon name="dots-vertical" className="h-5 w-5" />
        </button>
      </div>

      {actionDropdown}
    </>
  );
};

const ForInterview = () => {
  const navigate = useNavigate();
  const API_BASE = (process.env.REACT_APP_API_URL || 'https://phinmaau-job-portal-atlas.onrender.com/api').replace(/\/api\/?$/, '');
  const [brokenAvatars, setBrokenAvatars] = useState(() => new Set());

  const [applications, setApplications] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [defaultHiringStages, setDefaultHiringStages] = useState([
    'Initial Interview',
    'Assessment',
    'Final Interview',
    'Job Offer',
  ]);
  const [customHiringStages, setCustomHiringStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [query, setQuery] = useState('');
  const [selectedJob, setSelectedJob] = useState('all');
  const [filterBy, setFilterBy] = useState('all');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [showCustomDateModal, setShowCustomDateModal] = useState(false);
  const [sortBy, setSortBy] = useState('recent');
  const [currentPage, setCurrentPage] = useState(1);
  const [openFilterMenu, setOpenFilterMenu] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [stageModalOpen, setStageModalOpen] = useState(false);
  const [stageTarget, setStageTarget] = useState(null);
  const [stageBusy, setStageBusy] = useState(false);
  const [messageOpen, setMessageOpen] = useState(false);
  const [messageTarget, setMessageTarget] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);

  const [declineModalOpen, setDeclineModalOpen] = useState(false);
  const [declineTarget, setDeclineTarget] = useState(null);
  const [declineReason, setDeclineReason] = useState('');
  const [declineComment, setDeclineComment] = useState('');

  const getImageUrl = useCallback(
    (url) => {
      if (!url) return '';
      if (url.startsWith('http')) return url;
      return `${API_BASE}${url}`;
    },
    [API_BASE]
  );

  const markBroken = useCallback((key) => {
    setBrokenAvatars((prev) => {
      const next = new Set(prev);
      next.add(String(key));
      return next;
    });
  }, []);

  const Avatar = ({ img, name, size = 46, altKey }) => {
    const initial = (name?.trim()?.[0] || 'U').toUpperCase();
    const src = img ? getImageUrl(img) : '';
    const isBroken = brokenAvatars.has(String(altKey));

    return (
      <div
        className="flex items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-gray-100 shrink-0"
        style={{ height: `${size}px`, width: `${size}px` }}
      >
        {src && !isBroken ? (
          <img
            src={src}
            alt={`${name}'s profile`}
            className="h-full w-full object-cover"
            loading="lazy"
            onError={() => markBroken(altKey)}
          />
        ) : (
          <span className="text-sm font-bold text-gray-700">{initial}</span>
        )}
      </div>
    );
  };

  const resetDeclineState = () => {
    setDeclineModalOpen(false);
    setDeclineTarget(null);
    setDeclineReason('');
    setDeclineComment('');
  };

  const openDeclineModal = (application) => {
    setError('');
    setSuccess('');
    setDeclineTarget(application);
    setDeclineReason('');
    setDeclineComment('');
    setDeclineModalOpen(true);
  };

  const fetchJobs = useCallback(async () => {
    try {
      setJobsLoading(true);
      const res = await api.get('/jobs/employer/my-jobs');
      if (res.data?.success) {
        setJobs(res.data.jobs || []);
      } else {
        setJobs([]);
      }
    } catch (err) {
      console.error(err);
      setJobs([]);
    } finally {
      setJobsLoading(false);
    }
  }, []);


  const fetchForInterviewApplications = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const params = selectedJob !== 'all' ? { jobId: selectedJob } : {};
      const res = await api.get('/applications/employer/for-interview', { params });

      if (res.data?.success) {
        setApplications(res.data.applications || []);
        if (Array.isArray(res.data.defaultHiringStages) && res.data.defaultHiringStages.length) {
          setDefaultHiringStages(res.data.defaultHiringStages);
        }
        setCustomHiringStages(Array.isArray(res.data.customHiringStages) ? res.data.customHiringStages : []);
      } else {
        setApplications([]);
      }
    } catch (err) {
      console.error(err);
      setApplications([]);
      setError('Failed to load for interview applicants.');
    } finally {
      setLoading(false);
    }
  }, [selectedJob]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  useEffect(() => {
    fetchForInterviewApplications();
  }, [fetchForInterviewApplications]);

  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(''), 2200);
    return () => clearTimeout(t);
  }, [success]);

  const filteredApplications = useMemo(() => {
    const q = query.trim().toLowerCase();

    let list = [...applications];

    if (q) {
      list = list.filter((app) => {
        const name = buildApplicantName(app.jobseeker).toLowerCase();
        const email = (app.jobseeker?.email || '').toLowerCase();
        const jobTitle = (app.job?.title || '').toLowerCase();
        return [name, email, jobTitle].some((v) => v.includes(q));
      });
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - mondayOffset);
    const startOfNextWeek = new Date(startOfWeek);
    startOfNextWeek.setDate(startOfWeek.getDate() + 7);
    const sevenDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const thirtyDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const startOfNextYear = new Date(now.getFullYear() + 1, 0, 1);

    const getComparableDate = (app) => {
      const dateValue = app?.appliedAt || 0;
      const parsed = new Date(dateValue);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    };

    if (filterBy === 'today') {
      list = list.filter((app) => {
        const date = getComparableDate(app);
        return date && date >= startOfToday && date < startOfTomorrow;
      });
    } else if (filterBy === 'yesterday') {
      list = list.filter((app) => {
        const date = getComparableDate(app);
        return date && date >= startOfYesterday && date < startOfToday;
      });
    } else if (filterBy === 'this_week') {
      list = list.filter((app) => {
        const date = getComparableDate(app);
        return date && date >= startOfWeek && date < startOfNextWeek;
      });
    } else if (filterBy === 'last_7_days') {
      list = list.filter((app) => {
        const date = getComparableDate(app);
        return date && date >= sevenDaysAgo && date < startOfTomorrow;
      });
    } else if (filterBy === 'this_month') {
      list = list.filter((app) => {
        const date = getComparableDate(app);
        return date && date >= startOfMonth && date < startOfNextMonth;
      });
    } else if (filterBy === 'last_month') {
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      list = list.filter((app) => {
        const date = getComparableDate(app);
        return date && date >= startOfLastMonth && date < startOfCurrentMonth;
      });
    } else if (filterBy === 'this_year') {
      list = list.filter((app) => {
        const date = getComparableDate(app);
        return date && date >= startOfYear && date < startOfNextYear;
      });
    } else if (filterBy === 'last_year') {
      const startOfLastYear = new Date(now.getFullYear() - 1, 0, 1);
      list = list.filter((app) => {
        const date = getComparableDate(app);
        return date && date >= startOfLastYear && date < startOfYear;
      });
    } else if (filterBy === 'custom' && customDateFrom && customDateTo) {
      const customStart = new Date(`${customDateFrom}T00:00:00`);
      const customEndExclusive = new Date(`${customDateTo}T00:00:00`);
      customEndExclusive.setDate(customEndExclusive.getDate() + 1);
      list = list.filter((app) => {
        const date = getComparableDate(app);
        return date && date >= customStart && date < customEndExclusive;
      });
    }

    const getSalaryValue = (app) => {
      const job = app?.job || {};
      const raw = job.salaryMax ?? job.maxSalary ?? job.salaryTo ?? job.salary ?? job.salaryMin ?? job.minSalary ?? job.salaryFrom ?? 0;
      const numeric = Number(String(raw).replace(/[^0-9.]/g, ''));
      return Number.isNaN(numeric) ? 0 : numeric;
    };

    const getExpiryValue = (app) => {
      const raw = app?.job?.expiryDate || app?.job?.expiresAt || app?.job?.deadline || app?.job?.applicationDeadline || 0;
      const time = new Date(raw).getTime();
      return Number.isNaN(time) ? Number.MAX_SAFE_INTEGER : time;
    };

    const getRecentValue = (app) => {
      const time = new Date(app?.appliedAt || 0).getTime();
      return Number.isNaN(time) ? 0 : time;
    };

    if (sortBy === 'salary_highest') {
      list.sort((a, b) => getSalaryValue(b) - getSalaryValue(a));
    } else if (sortBy === 'expiry_soonest') {
      list.sort((a, b) => getExpiryValue(a) - getExpiryValue(b));
    } else {
      list.sort((a, b) => getRecentValue(b) - getRecentValue(a));
    }

    return list;
  }, [applications, query, filterBy, customDateFrom, customDateTo, sortBy]);


  const totalItems = filteredApplications.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const paginatedApplications = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredApplications.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredApplications, currentPage]);
  const showingStart = totalItems === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const showingEnd = Math.min(currentPage * ITEMS_PER_PAGE, totalItems);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const jobOptions = useMemo(() => {
    return [
      { value: 'all', label: 'All Jobs' },
      ...jobs.map((j) => ({
        value: j._id,
        label: j.title || 'Untitled Job',
      })),
    ];
  }, [jobs]);

  const hasActiveFilters = useMemo(() => {
    return query.trim() !== '' || selectedJob !== 'all' || filterBy !== 'all' || sortBy !== 'recent';
  }, [query, selectedJob, filterBy, sortBy]);

  const handleStatusUpdate = async (applicationId, status, extraPayload = {}) => {
    try {
      if (updatingId) return;
      setUpdatingId(applicationId);
      setError('');
      setSuccess('');

      const res = await api.put(`/applications/${applicationId}/status`, { status, ...extraPayload });

      if (res.data?.success) {
        setApplications((prev) => prev.filter((item) => item._id !== applicationId));
        setSuccess(
          status === 'hired'
            ? 'Applicant marked as Hired.'
            : 'Applicant marked as Declined.'
        );
      } else {
        setError('Failed to update application status.');
      }
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || 'Failed to update application status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleConfirmDecline = async () => {
    if (!declineTarget) return;

    const selectedReason = declineReason.trim();
    const comment = declineComment.trim();

    if (!selectedReason) {
      setError('Please select a decline reason before declining the application.');
      return;
    }

    const applicationId = declineTarget._id;
    resetDeclineState();

    await handleStatusUpdate(applicationId, 'declined', {
      declineReason: selectedReason,
      declineComment: comment,
      declinedFrom: 'forInterview',
    });
  };

  const clearFilters = () => {
    setQuery('');
    setSelectedJob('all');
    setFilterBy('all');
    setCustomDateFrom('');
    setCustomDateTo('');
    setSortBy('recent');
    setOpenFilterMenu(null);
  };

  const updateApplicationInState = useCallback((updatedApplication) => {
    if (!updatedApplication?._id) return;

    setApplications((previous) =>
      previous.map((item) =>
        item._id === updatedApplication._id
          ? { ...item, ...updatedApplication, alreadyEmployed: item.alreadyEmployed }
          : item
      )
    );

    setStageTarget((previous) =>
      previous?._id === updatedApplication._id
        ? { ...previous, ...updatedApplication, alreadyEmployed: previous.alreadyEmployed }
        : previous
    );
  }, []);

  const applyHiringStageResponse = useCallback((responseData) => {
    if (Array.isArray(responseData?.defaultHiringStages) && responseData.defaultHiringStages.length) {
      setDefaultHiringStages(responseData.defaultHiringStages);
    }
    if (Array.isArray(responseData?.customHiringStages)) {
      setCustomHiringStages(responseData.customHiringStages);
    }
    if (responseData?.application) {
      updateApplicationInState(responseData.application);
    }
  }, [updateApplicationInState]);

  const openHiringStageModal = (application) => {
    if (!application?._id) {
      setError('Unable to update the hiring stage for this applicant.');
      return;
    }
    setError('');
    setSuccess('');
    setOpenMenuId(null);
    setStageTarget(application);
    setStageModalOpen(true);
  };

  const closeHiringStageModal = () => {
    if (stageBusy) return;
    setStageModalOpen(false);
    setStageTarget(null);
  };

  const handleSelectHiringStage = async (stage) => {
    if (!stageTarget?._id || stageBusy) return false;

    try {
      setStageBusy(true);
      setError('');
      const response = await api.put(`/applications/${stageTarget._id}/hiring-stage`, {
        action: 'set',
        hiringStage: stage,
      });
      const responseData = response.data || {};
      if (responseData.success === false) {
        throw new Error(responseData.message || 'Failed to update hiring stage.');
      }
      applyHiringStageResponse(responseData);
      if (!responseData.application) {
        updateApplicationInState({ ...stageTarget, hiringStage: stage });
      }
      setSuccess('Hiring stage updated.');
      return true;
    } catch (stageError) {
      setError(stageError?.response?.data?.message || stageError?.message || 'Failed to update hiring stage.');
      return false;
    } finally {
      setStageBusy(false);
    }
  };

  const handleAddCustomStage = async (stage) => {
    if (!stageTarget?._id || stageBusy) return false;

    try {
      setStageBusy(true);
      setError('');
      const addResponse = await api.put(`/applications/${stageTarget._id}/hiring-stage`, {
        action: 'addCustom',
        hiringStage: stage,
      });
      const addResponseData = addResponse.data || {};
      if (addResponseData.success === false) {
        throw new Error(addResponseData.message || 'Failed to add custom hiring stage.');
      }
      applyHiringStageResponse(addResponseData);

      const setResponse = await api.put(`/applications/${stageTarget._id}/hiring-stage`, {
        action: 'set',
        hiringStage: stage,
      });
      const setResponseData = setResponse.data || {};
      if (setResponseData.success === false) {
        throw new Error(setResponseData.message || 'Failed to select the custom hiring stage.');
      }
      applyHiringStageResponse(setResponseData);
      if (!setResponseData.application) {
        updateApplicationInState({ ...stageTarget, hiringStage: stage });
      }
      setSuccess('Custom hiring stage added and selected.');
      return true;
    } catch (stageError) {
      setError(stageError?.response?.data?.message || stageError?.message || 'Failed to add custom hiring stage.');
      return false;
    } finally {
      setStageBusy(false);
    }
  };

  const handleDeleteHiringStage = async (stage) => {
    if (!stageTarget?._id || stageBusy) return;

    try {
      setStageBusy(true);
      setError('');
      const response = await api.put(`/applications/${stageTarget._id}/hiring-stage`, {
        action: 'delete',
        hiringStage: stage,
      });
      applyHiringStageResponse(response.data);
      await fetchForInterviewApplications();
      setSuccess('Hiring stage deleted.');
    } catch (stageError) {
      setError(stageError?.response?.data?.message || 'Failed to delete hiring stage.');
    } finally {
      setStageBusy(false);
    }
  };

  const handleResetHiringStage = async (application) => {
    if (!application?._id || updatingId) return;

    try {
      setUpdatingId(application._id);
      setError('');
      setSuccess('');
      const response = await api.put(`/applications/${application._id}/hiring-stage`, {
        action: 'reset',
      });
      const responseData = response.data || {};
      if (responseData.success === false) {
        throw new Error(responseData.message || 'Failed to reset hiring stage.');
      }
      applyHiringStageResponse(responseData);
      if (!responseData.application) {
        updateApplicationInState({ ...application, hiringStage: '' });
      }
      setSuccess('Hiring stage reset to No stage set.');
    } catch (stageError) {
      setError(stageError?.response?.data?.message || stageError?.message || 'Failed to reset hiring stage.');
    } finally {
      setUpdatingId(null);
    }
  };

  const openMessageModal = (application) => {
    if (!application?._id || !application?.jobseeker) {
      setError('Unable to open messages for this applicant.');
      return;
    }
    setError('');
    setSuccess('');
    setOpenMenuId(null);
    setMessageTarget(application);
    setMessageOpen(true);
  };

  const closeMessageModal = () => {
    setMessageOpen(false);
    setMessageTarget(null);
  };

  const inputBase =
  'h-[50px] w-full rounded-xl border border-gray-300 pl-11 pr-10 text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2';

const selectBase =
  'h-[50px] w-full rounded-xl border border-gray-300 px-4 text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2';

  return (
    <EmployerLayout>
      <div className="mx-auto max-w-7xl px-1 py-8">
        <div className="mb-6">
          <h1 className="text-[33px] leading-[40px] font-semibold text-gray-900">For Interview</h1>
          <p className="mt-1 text-sm text-gray-600">
            Applicants selected for interview
          </p>
        </div>

        {error && (
          <Alert type="error" onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert type="success" onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        <div className="mb-6 overflow-visible rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="p-5">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
              <div className={hasActiveFilters ? 'lg:col-span-4' : 'lg:col-span-5'}>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-3.5 text-gray-400">
                    <Icon name="search" className="h-5 w-5" />
                  </span>

                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className={inputBase}
                    placeholder="Search applicant, email, job title..."
                    autoComplete="off"
                  />
                </div>
              </div>

              <div className="lg:col-span-3">
                <select
                  value={selectedJob}
                  onChange={(e) => setSelectedJob(e.target.value)}
                  className={selectBase}
                  disabled={jobsLoading}
                >
                  {jobOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="lg:col-span-2">
                <EmployerDateFilterDropdown
                  value={filterBy}
                  startDate={customDateFrom}
                  endDate={customDateTo}
                  onSelect={(value) => {
                    if (value === 'custom') {
                      setShowCustomDateModal(true);
                      return;
                    }
                    setFilterBy(value);
                    setCustomDateFrom('');
                    setCustomDateTo('');
                    setCurrentPage(1);
                  }}
                />
              </div>

              <div className="relative lg:col-span-2">
                <button
                  type="button"
                  onClick={() => setOpenFilterMenu((prev) => (prev === 'sort' ? null : 'sort'))}
                  className="inline-flex h-[50px] w-full items-center justify-between gap-2 whitespace-nowrap rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-900 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2"
                >
                  Sort By
                  <Icon name="chevron-down" className="h-4 w-4" />
                </button>

                {openFilterMenu === 'sort' && (
                  <div className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border border-gray-200 bg-white py-2 shadow-lg">
                    {[
                      ['salary_highest', 'Salary Highest to Lowest'],
                      ['expiry_soonest', 'Expiry Date Soonest to Latest'],
                      ['recent', 'Most Recent Newest to Oldest'],
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => {
                          setSortBy(value);
                          setOpenFilterMenu(null);
                        }}
                        className={cn(
                          'block w-full px-4 py-2 text-left text-sm hover:bg-gray-50',
                          sortBy === value ? 'font-semibold text-[#1154cc]' : 'text-gray-700'
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {hasActiveFilters && (
                <div className="lg:col-span-1">
                  <Button
                    variant="secondary"
                    className="h-[50px] w-full px-3"
                    onClick={clearFilters}
                  >
                    Clear
                  </Button>
                </div>
              )}
            </div>

            <div className="mt-3 text-xs text-gray-500">
              Showing <span className="font-semibold text-gray-700">{filteredApplications.length}</span> result(s).
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="p-6">
            {loading ? (
              <div className="py-14 text-center" role="status" aria-live="polite">
                <div className="mx-auto inline-block h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-[#2e66a6]" />
                <p className="mt-4 text-sm text-gray-600">Loading interview applicants…</p>
              </div>
            ) : filteredApplications.length === 0 ? (
              <div className="py-14 text-center">
                <h3 className="text-lg font-semibold text-gray-900">No for interview applicants found</h3>
                <p className="mt-2 text-sm text-gray-600">Try changing filters or search.</p>
              </div>
            ) : (
              <>
                <div className="hidden md:block">
                  <table className="w-full table-fixed divide-y divide-gray-200">
                    <colgroup>
                      <col className="w-[13%]" />
                      <col className="w-[25%]" />
                      <col className="w-[19%]" />
                      <col className="w-[14%]" />
                      <col className="w-[16%]" />
                      <col className="w-[13%]" />
                    </colgroup>
                    <thead className="bg-gray-50">
                      <tr>
                        {['Applied Date', 'Applicant', 'Job Applied', 'Contact Number', 'Hiring Stage', 'Actions'].map((heading) => (
                          <th
                            key={heading}
                            className={cn(
                              'px-3 py-4 text-xs font-semibold uppercase tracking-wider text-gray-600',
                              heading === 'Actions' ? 'text-right' : 'text-left'
                            )}
                          >
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-200 bg-white">
                      {paginatedApplications.map((app) => {
                        const name = buildApplicantName(app.jobseeker);
                        const email = app.jobseeker?.email || '—';
                        const contactNumber = getApplicantContact(app.jobseeker);
                        const jobTitle = app.job?.title || 'Job Title';
                        const companyName = app.job?.companyName || 'Company';
                        const hiringStage = String(app.hiringStage || '').trim();
                        const rowBusy = updatingId === app._id;

                        return (
                          <tr
                            key={app._id}
                            role="link"
                            tabIndex={0}
                            aria-label={`View application of ${name}`}
                            onClick={(event) => {
                              if (event.target.closest?.('a, button, input, select, textarea, [role="button"]')) return;
                              navigate(`/employer/application/${app._id}?from=for-interview`);
                            }}
                            onKeyDown={(event) => {
                              if (event.target !== event.currentTarget) return;
                              if (event.key !== 'Enter' && event.key !== ' ') return;
                              event.preventDefault();
                              navigate(`/employer/application/${app._id}?from=for-interview`);
                            }}
                            className="group cursor-pointer transition-colors hover:bg-[#2e66a6]/[0.06] focus-visible:bg-[#2e66a6]/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2e66a6]"
                          >
                            <td className="whitespace-nowrap px-3 py-5 align-middle text-sm text-gray-700">
                              {formatDate(app.appliedAt)}
                            </td>

                            <td className="px-3 py-5 align-middle">
                              <div className="flex min-w-0 items-center gap-3">
                                <Avatar img={app.jobseeker?.profileImage} name={name} size={44} altKey={`for_interview_${app._id}`} />
                                <div className="min-w-0 flex-1">
                                  <div className="truncate text-sm font-semibold text-gray-900" title={name}>
                                    {name}
                                  </div>
                                  <div className="mt-0.5 truncate text-xs text-gray-500" title={email}>
                                    {email}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="px-3 py-5 align-middle">
                              <div className="truncate text-sm font-semibold text-gray-900" title={jobTitle}>{jobTitle}</div>
                              <div className="mt-0.5 truncate text-xs text-gray-500" title={companyName}>{companyName}</div>
                            </td>


                            <td className="px-3 py-5 align-middle text-sm text-gray-600">
                              <span className="block truncate" title={contactNumber}>{contactNumber}</span>
                            </td>

                            <td className="px-3 py-5 align-middle">
                              <div className={cn('truncate text-sm font-semibold', hiringStage ? 'text-gray-900' : 'italic text-gray-500')} title={hiringStage || 'No stage set'}>
                                {hiringStage || 'No stage set'}
                              </div>
                              <button
                                type="button"
                                onClick={() => openHiringStageModal(app)}
                                className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-gray-900 hover:text-[#2e66a6]"
                              >
                                {hiringStage ? 'Change stage' : 'Choose stage'}
                                <Icon name="chevron-right" className="h-3.5 w-3.5" />
                              </button>
                            </td>

                            <td className="px-3 py-5 align-middle">
                              <ActionMenu
                                app={app}
                                name={name}
                                rowBusy={rowBusy}
                                openMenuId={openMenuId}
                                setOpenMenuId={setOpenMenuId}
                                onHire={() => handleStatusUpdate(app._id, 'hired')}
                                onDecline={() => openDeclineModal(app)}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="space-y-3 md:hidden">
                  {paginatedApplications.map((app) => {
                    const name = buildApplicantName(app.jobseeker);
                    const email = app.jobseeker?.email || '—';
                    const contactNumber = getApplicantContact(app.jobseeker);
                    const jobTitle = app.job?.title || 'Job Title';
                    const companyName = app.job?.companyName || 'Company';
                    const hiringStage = String(app.hiringStage || '').trim();
                    const rowBusy = updatingId === app._id;

                    return (
                      <div key={app._id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                        <div className="flex items-center gap-3">
                          <Avatar img={app.jobseeker?.profileImage} name={name} size={44} altKey={`for_interview_mobile_${app._id}`} />
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-gray-900">{name}</div>
                            <div className="max-w-[230px] truncate text-xs text-gray-600" title={email}>{email}</div>
                          </div>
                        </div>

                        <div className="mt-3 space-y-2 rounded-xl bg-gray-50 p-3 text-xs text-gray-600">
                          <div><span className="font-semibold text-gray-800">Applied:</span> {formatDate(app.appliedAt)}</div>
                          <div><span className="font-semibold text-gray-800">Job:</span> {jobTitle}</div>
                          <div><span className="font-semibold text-gray-800">Company:</span> {companyName}</div>
                          <div><span className="font-semibold text-gray-800">Contact:</span> {contactNumber}</div>
                          <div>
                            <div className={cn('font-semibold', hiringStage ? 'text-gray-900' : 'italic text-gray-500')}>
                              {hiringStage || 'No stage set'}
                            </div>
                            <button type="button" onClick={() => openHiringStageModal(app)} className="mt-1 inline-flex items-center gap-1 font-semibold text-gray-900 hover:text-[#2e66a6]">
                              {hiringStage ? 'Change stage' : 'Choose stage'}
                              <Icon name="chevron-right" className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="mt-3 overflow-x-auto pb-1">
                          <ActionMenu
                            app={app}
                            name={name}
                            rowBusy={rowBusy}
                            openMenuId={openMenuId}
                            setOpenMenuId={setOpenMenuId}
                            onHire={() => handleStatusUpdate(app._id, 'hired')}
                            onDecline={() => openDeclineModal(app)}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

              <div className="flex flex-col gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4 text-sm text-gray-600 sm:flex-row sm:items-center sm:justify-between">
                <span>
                  Showing {showingStart} to {showingEnd} of {totalItems} results
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    disabled={currentPage === 1}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="rounded-lg bg-[#2e66a6] px-3 py-2 text-sm font-semibold text-white">
                    {currentPage}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                    disabled={currentPage >= totalPages}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>

              </>
            )}
          </div>
        </div>
      </div>

      <HiringStageModal
        open={stageModalOpen}
        application={stageTarget}
        defaultStages={defaultHiringStages}
        customStages={customHiringStages}
        busy={stageBusy}
        onClose={closeHiringStageModal}
        onSelect={handleSelectHiringStage}
        onAddCustom={handleAddCustomStage}
        onDeleteStage={handleDeleteHiringStage}
      />

      <MessagePopup
        open={messageOpen}
        application={messageTarget}
        onClose={closeMessageModal}
      />

      <DeclineReasonModal
        open={declineModalOpen}
        applicantName={declineTarget ? buildApplicantName(declineTarget.jobseeker) : ''}
        selectedReason={declineReason}
        comment={declineComment}
        onReasonChange={setDeclineReason}
        onCommentChange={setDeclineComment}
        onClose={resetDeclineState}
        onConfirm={handleConfirmDecline}
        isSubmitting={!!updatingId}
      />

      <EmployerCustomDateRangeModal
        open={showCustomDateModal}
        startDate={customDateFrom}
        endDate={customDateTo}
        onCancel={() => setShowCustomDateModal(false)}
        onApply={(dateFrom, dateTo) => {
          setFilterBy('custom');
          setCustomDateFrom(dateFrom);
          setCustomDateTo(dateTo);
          setShowCustomDateModal(false);
          setCurrentPage(1);
        }}
      />
    </EmployerLayout>
  );
};

export default ForInterview;