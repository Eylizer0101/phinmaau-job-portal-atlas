import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import EmployerLayout from '../../../layouts/EmployerLayout';

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
    case 'trash':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3M4 7h16" />
        </svg>
      );
    case 'x':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      );
    case 'archive':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16M5 7l1 12a2 2 0 002 2h8a2 2 0 002-2l1-12M9 11h6" />
        </svg>
      );
    case 'restore':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h11M3 10l4-4m-4 4l4 4m3 4h11" />
        </svg>
      );
    default:
      return null;
  }
};

const cn = (...classes) => classes.filter(Boolean).join(' ');


const ARCHIVED_DATE_FILTER_OPTIONS = [
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

const formatArchivedDateInput = (date) => {
  if (!date) return '';
  const value = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(value.getTime())) return '';
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatArchivedDateLabel = (value) => {
  if (!value) return 'Select date';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return 'Select date';
  return date.toLocaleDateString('en-PH', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
};

const getArchivedDateFilterLabel = (value, startDate, endDate) => {
  if (value === 'custom' && startDate && endDate) {
    return `${formatArchivedDateLabel(startDate)} - ${formatArchivedDateLabel(endDate)}`;
  }

  return ARCHIVED_DATE_FILTER_OPTIONS.find((option) => option.value === value)?.label || 'All Time';
};

const ArchivedDateFilterDropdown = ({
  value,
  startDate,
  endDate,
  disabled,
  onSelect,
  heightClass = 'h-11',
}) => {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const handleOutsideClick = (event) => {
      if (!dropdownRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    window.addEventListener('mousedown', handleOutsideClick);
    return () => window.removeEventListener('mousedown', handleOutsideClick);
  }, [open]);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((previous) => !previous)}
        className={cn(
          'flex w-full items-center justify-between rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-900 transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2 disabled:bg-gray-50 disabled:opacity-60',
          heightClass
        )}
      >
        <span className="truncate">{getArchivedDateFilterLabel(value, startDate, endDate)}</span>
        <svg
          className="h-4 w-4 shrink-0 text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3M5 11h14M6 5h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2z"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-[52px] z-[100] w-56 rounded-2xl border border-gray-100 bg-white p-2 shadow-xl ring-1 ring-black/5">
          <div className="space-y-1">
            {ARCHIVED_DATE_FILTER_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
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

const ArchivedCustomDateRangeModal = ({
  open,
  startDate,
  endDate,
  onCancel,
  onApply,
}) => {
  const todayValue = formatArchivedDateInput(new Date());
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

    setDraftStart(formatArchivedDateInput(initialStart));
    setDraftEnd(formatArchivedDateInput(initialEnd));
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

  const yearOptions = Array.from(
    { length: 21 },
    (_, index) => new Date().getFullYear() - 10 + index
  );

  const CalendarPanel = ({
    label,
    value,
    viewDate,
    onViewChange,
    onDateChange,
    minimumDate,
  }) => {
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
          <svg
            className="h-5 w-5 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3M5 11h14M6 5h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2z"
            />
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
              onViewChange(
                new Date(viewDate.getFullYear(), Number(event.target.value), 1)
              )
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
              onViewChange(
                new Date(Number(event.target.value), viewDate.getMonth(), 1)
              )
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
            <div
              key={day}
              className="pb-2 text-[11px] font-extrabold text-slate-500"
            >
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
              new Date(
                date.getFullYear(),
                date.getMonth(),
                date.getDate()
              ).getTime() <
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
                onClick={() => onDateChange(formatArchivedDateInput(date))}
                className={cn(
                  'my-1 flex h-9 w-full items-center justify-center text-sm font-semibold transition',
                  isInRange && !isRangeStart && !isRangeEnd
                    ? 'bg-[#e7edf5] text-slate-700'
                    : outsideMonth
                    ? 'text-slate-300 hover:bg-slate-50'
                    : 'text-slate-600 hover:bg-slate-100',
                  (isRangeStart || isRangeEnd) &&
                    'mx-auto w-9 rounded-lg bg-[#2e66a6] text-white shadow-sm ring-1 ring-[#dce8f7]',
                  isSelected &&
                    !isRangeStart &&
                    !isRangeEnd &&
                    'mx-auto w-9 rounded-lg bg-[#2e66a6] text-white',
                  isDisabled &&
                    !isInRange &&
                    'cursor-not-allowed text-slate-200 hover:bg-transparent'
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
                setEndView(
                  new Date(nextStart.getFullYear(), nextStart.getMonth(), 1)
                );
              }
            }}
          />

          <div className="hidden items-start pt-10 text-3xl text-slate-500 md:flex">
            →
          </div>

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


const Button = ({
  variant = 'secondary',
  size = 'md',
  leftIcon,
  children,
  className,
  disabled,
  ...props
}) => {
  const base =
    'inline-flex items-center justify-center gap-2 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed';
  const sizes = {
    sm: 'px-3 py-2 text-sm rounded-lg',
    md: 'px-4 py-3 text-sm rounded-xl',
    xs: 'px-2 py-1.5 text-xs rounded-lg',
  };

  const variants = {
    secondary:
      'border border-gray-200 bg-white text-gray-900 hover:bg-gray-50 focus-visible:ring-[#2e66a6]',
    dangerSoft:
      'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 focus-visible:ring-red-600',
    primarySoft:
      'border border-[#2e66a6]/20 bg-[#2e66a6]/10 text-[#2e66a6] hover:bg-[#2e66a6]/15 focus-visible:ring-[#2e66a6]',
  };

  return (
    <button
      type="button"
      className={cn(base, sizes[size], variants[variant], className)}
      disabled={disabled}
      {...props}
    >
      {leftIcon}
      {children}
    </button>
  );
};

const Alert = ({ type = 'error', children, onClose }) => {
  const isError = type === 'error';
  const styles = isError
    ? 'border-red-200 bg-red-50 text-red-900'
    : 'border-blue-200 bg-blue-50 text-[#2e66a6]';
  const ring = isError ? 'focus-visible:ring-red-600' : 'focus-visible:ring-[#2e66a6]';

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

const Modal = ({
  open,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onClose,
  danger = false,
  loading = false,
  loadingText = 'Processing…',
}) => {
  const confirmRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => confirmRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full max-w-md rounded-2xl bg-white shadow-xl border border-gray-200"
      >
        <div className="p-6">
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          {description && <p className="mt-2 text-sm text-gray-600">{description}</p>}
        </div>
        <div className="flex items-center justify-end gap-2 px-6 pb-6">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={loading}>
            {cancelText}
          </Button>
          <Button
            variant={danger ? 'dangerSoft' : 'primarySoft'}
            size="sm"
            onClick={onConfirm}
            ref={confirmRef}
            disabled={loading}
          >
            {loading ? loadingText : confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};

const formatDate = (dateValue) => {
  if (!dateValue) return '—';
  const d = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
};

const useDebouncedValue = (value, delay = 250) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
};

const ArchivedDeclinedApplicants = () => {
  const navigate = useNavigate();
  const API_BASE = (process.env.REACT_APP_API_URL || 'https://phinmaau-job-portal-atlas.onrender.com/api').replace(/\/api\/?$/, '');

  const [brokenAvatars, setBrokenAvatars] = useState(() => new Set());
  const [applications, setApplications] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [action, setAction] = useState({ type: '', id: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [archiveCounts, setArchiveCounts] = useState({ active: 0, archived: 0 });

  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, 250);
  const [selectedJob, setSelectedJob] = useState('all');
  const [sort, setSort] = useState('all');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [showCustomDateModal, setShowCustomDateModal] = useState(false);

  const [restoreTarget, setRestoreTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

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

  const buildApplicantName = useCallback((u) => {
    const full = (u?.fullName || '').trim();
    if (full) return full;

    const parts = [u?.firstName, u?.middleName, u?.lastName]
      .map((p) => (p || '').trim())
      .filter(Boolean);

    if (parts.length) return parts.join(' ');

    const email = (u?.email || '').trim();
    if (email && email.includes('@')) return email.split('@')[0];

    return 'Applicant';
  }, []);

  const getDeclinedStageLabel = useCallback((declinedFrom) => {
    const normalized = String(declinedFrom || '').trim();
    if (normalized === 'applicants') return 'Screening';
    if (normalized === 'forInterview') return 'Interview';
    return 'Declined';
  }, []);

  const Avatar = useCallback(
    ({ img, name, size = 48, altKey }) => {
      const initial = (name?.trim()?.[0] || 'U').toUpperCase();
      const src = img ? getImageUrl(img) : '';
      const isBroken = brokenAvatars.has(String(altKey));
      const boxStyle = { height: `${size}px`, width: `${size}px` };

      return (
        <div
          className="flex items-center justify-center rounded-full border border-gray-200 bg-gray-100 overflow-hidden shrink-0"
          style={boxStyle}
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
    },
    [brokenAvatars, getImageUrl, markBroken]
  );

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
  };

  const handleAuthError = () => {
    localStorage.removeItem('token');
    navigate('/employer/login');
  };

  const fetchJobs = useCallback(async () => {
    try {
      setJobsLoading(true);
      const res = await axios.get('https://phinmaau-job-portal-atlas.onrender.com/api/jobs/employer/my-jobs', {
        headers: getAuthHeaders(),
      });

      if (res.data?.success) {
        setJobs(res.data.jobs || []);
      } else {
        setJobs([]);
      }
    } catch (err) {
      console.error(err);
      if (err.response?.status === 401) return handleAuthError();
      setJobs([]);
    } finally {
      setJobsLoading(false);
    }
  }, [navigate]);

  const fetchArchivedDeclinedApplications = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await axios.get('https://phinmaau-job-portal-atlas.onrender.com/api/applications/employer/declined/archived', {
        headers: getAuthHeaders(),
      });

      if (res.data?.success) {
        setApplications(res.data.applications || []);
        setArchiveCounts({
          active: res.data.activeCount ?? 0,
          archived: res.data.archivedCount ?? (res.data.applications || []).length,
        });
      } else {
        setApplications([]);
      }
    } catch (err) {
      console.error(err);
      if (err.response?.status === 401) return handleAuthError();
      setError('Failed to load archived declined applicants.');
      setApplications([]);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchJobs();
    fetchArchivedDeclinedApplications();
  }, [fetchJobs, fetchArchivedDeclinedApplications]);

  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(''), 2200);
    return () => clearTimeout(t);
  }, [success]);

  const jobOptions = useMemo(() => {
    return [
      { value: 'all', label: 'All Jobs' },
      ...jobs.map((j) => ({
        value: j._id,
        label: j.title || 'Untitled Job',
      })),
    ];
  }, [jobs]);

  const filteredApplications = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    let list = [...applications];

    if (selectedJob !== 'all') {
      list = list.filter((a) => a.job?._id === selectedJob);
    }

    if (q) {
      list = list.filter((a) => {
        const u = a.jobseeker || {};
        const name = buildApplicantName(u).toLowerCase();
        const email = (u.email || '').toLowerCase();
        const jobTitle = (a.job?.title || '').toLowerCase();
        const company = (a.job?.companyName || '').toLowerCase();
        const declinedStage = getDeclinedStageLabel(a.declinedFrom).toLowerCase();
        return [name, email, jobTitle, company, declinedStage].some((t) => t.includes(q));
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
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const startOfNextYear = new Date(now.getFullYear() + 1, 0, 1);
    const startOfLastYear = new Date(now.getFullYear() - 1, 0, 1);

    const getComparableDate = (application) => {
      const archivedDate = new Date(
        application.declinedArchivedAt ||
        application.archivedAt ||
        application.updatedAt ||
        application.appliedAt ||
        0
      );

      return Number.isNaN(archivedDate.getTime()) ? new Date(0) : archivedDate;
    };

    if (sort === 'today') {
      list = list.filter((application) => {
        const date = getComparableDate(application);
        return date >= startOfToday && date < startOfTomorrow;
      });
    } else if (sort === 'yesterday') {
      list = list.filter((application) => {
        const date = getComparableDate(application);
        return date >= startOfYesterday && date < startOfToday;
      });
    } else if (sort === 'this_week') {
      list = list.filter((application) => {
        const date = getComparableDate(application);
        return date >= startOfWeek && date < startOfNextWeek;
      });
    } else if (sort === 'last_7_days') {
      list = list.filter((application) => {
        const date = getComparableDate(application);
        return date >= sevenDaysAgo && date < startOfTomorrow;
      });
    } else if (sort === 'this_month') {
      list = list.filter((application) => {
        const date = getComparableDate(application);
        return date >= startOfMonth && date < startOfNextMonth;
      });
    } else if (sort === 'last_month') {
      list = list.filter((application) => {
        const date = getComparableDate(application);
        return date >= startOfLastMonth && date < startOfMonth;
      });
    } else if (sort === 'this_year') {
      list = list.filter((application) => {
        const date = getComparableDate(application);
        return date >= startOfYear && date < startOfNextYear;
      });
    } else if (sort === 'last_year') {
      list = list.filter((application) => {
        const date = getComparableDate(application);
        return date >= startOfLastYear && date < startOfYear;
      });
    } else if (sort === 'custom' && customDateFrom && customDateTo) {
      const customStart = new Date(`${customDateFrom}T00:00:00`);
      const customEndExclusive = new Date(`${customDateTo}T00:00:00`);
      customEndExclusive.setDate(customEndExclusive.getDate() + 1);

      list = list.filter((application) => {
        const date = getComparableDate(application);
        return date >= customStart && date < customEndExclusive;
      });
    }

    return [...list].sort((a, b) => {
      const da = new Date(a.declinedArchivedAt || a.updatedAt || 0).getTime();
      const db = new Date(b.declinedArchivedAt || b.updatedAt || 0).getTime();
      return db - da;
    });
  }, [applications, buildApplicantName, debouncedQuery, sort, customDateFrom, customDateTo, selectedJob, getDeclinedStageLabel]);

  const hasActiveFilters = useMemo(() => {
    return query.trim() !== '' || sort !== 'all' || selectedJob !== 'all';
  }, [query, sort, selectedJob]);

  const clearFilters = () => {
    setQuery('');
    setSelectedJob('all');
    setSort('all');
    setCustomDateFrom('');
    setCustomDateTo('');
  };

  const handleRestore = async () => {
    if (!restoreTarget?._id) return;
    try {
      setAction({ type: 'restore', id: restoreTarget._id });
      setError('');

      const res = await axios.patch(
        `https://phinmaau-job-portal-atlas.onrender.com/api/applications/${restoreTarget._id}/restore-declined`,
        {},
        { headers: getAuthHeaders() }
      );

      if (res.data?.success) {
        setApplications((prev) => prev.filter((item) => item._id !== restoreTarget._id));
        setArchiveCounts((prev) => ({
          active: prev.active + 1,
          archived: Math.max(0, prev.archived - 1),
        }));
        setSuccess('Declined applicant restored successfully.');
        setRestoreTarget(null);
      } else {
        setError('Failed to restore declined applicant.');
      }
    } catch (err) {
      console.error(err);
      if (err.response?.status === 401) return handleAuthError();
      setError(err.response?.data?.message || 'Failed to restore declined applicant.');
    } finally {
      setAction({ type: '', id: '' });
    }
  };

  const handlePermanentDelete = async () => {
    if (!deleteTarget?._id) return;
    try {
      setAction({ type: 'delete', id: deleteTarget._id });
      setError('');

      const res = await axios.delete(
        `https://phinmaau-job-portal-atlas.onrender.com/api/applications/${deleteTarget._id}/permanent`,
        { headers: getAuthHeaders() }
      );

      if (res.data?.success) {
        setApplications((prev) => prev.filter((item) => item._id !== deleteTarget._id));
        setArchiveCounts((prev) => ({
          ...prev,
          archived: Math.max(0, prev.archived - 1),
        }));
        setSuccess('Declined applicant permanently deleted successfully.');
        setDeleteTarget(null);
      } else {
        setError('Failed to permanently delete declined applicant.');
      }
    } catch (err) {
      console.error(err);
      if (err.response?.status === 401) return handleAuthError();
      setError(err.response?.data?.message || 'Failed to permanently delete declined applicant.');
    } finally {
      setAction({ type: '', id: '' });
    }
  };

  const headerRight = useMemo(() => {
    return (
      <div className="inline-flex items-center rounded-2xl border border-gray-200 bg-white p-1 shadow-sm">
        <button
          type="button"
          onClick={() => navigate('/employer/declined')}
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
        >
          <span>Declined</span>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">
            {archiveCounts.active}
          </span>
        </button>

        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl bg-[#f5f7fb] px-4 py-2 text-sm font-semibold text-[#2e66a6]"
          aria-current="page"
        >
          <Icon name="archive" className="h-4 w-4" />
          <span>Archived</span>
          <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-[#2e66a6]">
            {archiveCounts.archived}
          </span>
        </button>
      </div>
    );
  }, [archiveCounts.active, archiveCounts.archived, navigate]);

  const inputBase =
    'w-full rounded-xl border border-gray-300 pl-11 pr-10 py-3 text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2 disabled:bg-gray-50 disabled:opacity-60';

  const selectBase =
    'w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2 disabled:bg-gray-50 disabled:opacity-60';

  return (
    <EmployerLayout>
      <div className="mx-auto max-w-7xl px-1 py-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-[33px] leading-[40px] font-semibold text-gray-900">Archived Declined Applicants</h1>
            <p className="mt-1 text-sm text-gray-600">Restore or permanently delete archived declined application records</p>
          </div>
          <div>{headerRight}</div>
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
              <div className="lg:col-span-6">
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-3.5 text-gray-400">
                    <Icon name="search" className="h-5 w-5" />
                  </span>

                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className={inputBase}
                    placeholder="Search archived applicant, email, job title, stage..."
                    disabled={loading}
                    autoComplete="off"
                  />

                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery('')}
                      className="absolute right-3 top-3.5 rounded-lg p-1 text-gray-500 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2"
                      aria-label="Clear search"
                    >
                      <Icon name="x" className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="lg:col-span-3">
                <select
                  value={selectedJob}
                  onChange={(e) => setSelectedJob(e.target.value)}
                  className={selectBase}
                  disabled={loading || jobsLoading}
                >
                  {jobOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className={hasActiveFilters ? 'lg:col-span-2' : 'lg:col-span-3'}>
                <ArchivedDateFilterDropdown
                  value={sort}
                  startDate={customDateFrom}
                  endDate={customDateTo}
                  disabled={loading}
                  heightClass="h-12"
                  onSelect={(value) => {
                    if (value === 'custom') {
                      setShowCustomDateModal(true);
                      return;
                    }

                    setSort(value);
                    setCustomDateFrom('');
                    setCustomDateTo('');
                  }}
                />
              </div>

              {hasActiveFilters && (
                <div className="lg:col-span-1">
                  <Button variant="secondary" className="w-full" onClick={clearFilters} disabled={loading}>
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
                <p className="mt-4 text-sm text-gray-600">Loading archived declined applicants…</p>
              </div>
            ) : filteredApplications.length === 0 ? (
              <div className="py-14 text-center">
                <h3 className="text-lg font-semibold text-gray-900">No archived declined applicants found</h3>
                <p className="mt-2 text-sm text-gray-600">Archived declined applications will appear here after you delete them from the declined list.</p>
              </div>
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Applicant
                        </th>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Job Applied
                        </th>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Applied Date
                        </th>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Archived Date
                        </th>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-200 bg-white">
                      {filteredApplications.map((app) => {
                        const name = buildApplicantName(app.jobseeker);
                        const email = app.jobseeker?.email || '—';
                        const jobTitle = app.job?.title || 'Job Title';
                        const companyName = app.job?.companyName || 'Company';
                        const declinedStageLabel = getDeclinedStageLabel(app.declinedFrom);
                        const busy = action.id === app._id;

                        return (
                          <tr key={app._id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-4">
                                <Avatar
                                  img={app.jobseeker?.profileImage}
                                  name={name}
                                  size={48}
                                  altKey={`archived_declined_${app._id}`}
                                />
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-semibold text-gray-900">{name}</div>
                                  <div className="truncate text-sm text-gray-600">{email}</div>
                                </div>
                              </div>
                            </td>

                            <td className="px-6 py-4">
                              <div className="max-w-[18rem] truncate text-sm font-semibold text-gray-900" title={jobTitle}>
                                {jobTitle}
                              </div>
                              <div className="mt-0.5 max-w-[18rem] truncate text-xs text-gray-600" title={companyName}>
                                {companyName}
                              </div>
                              <div className="mt-1">
                                <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-red-50 text-red-800 border border-red-200">
                                  {declinedStageLabel}
                                </span>
                              </div>
                            </td>

                            <td className="px-6 py-4 text-sm text-gray-900">{formatDate(app.appliedAt)}</td>
                            <td className="px-6 py-4 text-sm text-gray-900">{formatDate(app.declinedArchivedAt)}</td>

                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Button
                                  variant="primarySoft"
                                  size="xs"
                                  onClick={() => setRestoreTarget(app)}
                                  disabled={busy}
                                >
                                  <Icon name="restore" className="h-4 w-4" />
                                  Restore
                                </Button>

                                <Link
                                  to={`/employer/application/${app._id}`}
                                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2"
                                >
                                  <Icon name="eye" className="h-4 w-4" />
                                  View
                                </Link>

                                <Button
                                  variant="dangerSoft"
                                  size="xs"
                                  onClick={() => setDeleteTarget(app)}
                                  disabled={busy}
                                >
                                  <Icon name="trash" className="h-4 w-4" />
                                  Permanent Delete
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="space-y-3 md:hidden">
                  {filteredApplications.map((app) => {
                    const name = buildApplicantName(app.jobseeker);
                    const email = app.jobseeker?.email || '—';
                    const jobTitle = app.job?.title || 'Job Title';
                    const companyName = app.job?.companyName || 'Company';
                    const declinedStageLabel = getDeclinedStageLabel(app.declinedFrom);
                    const busy = action.id === app._id;

                    return (
                      <div key={app._id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar
                              img={app.jobseeker?.profileImage}
                              name={name}
                              size={44}
                              altKey={`archived_declined_mobile_${app._id}`}
                            />
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold text-gray-900">{name}</div>
                              <div className="truncate text-xs text-gray-600">{email}</div>
                            </div>
                          </div>

                          <span className="shrink-0 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-red-50 text-red-800 border border-red-200">
                            {declinedStageLabel}
                          </span>
                        </div>

                        <div className="mt-3 rounded-xl bg-gray-50 p-3">
                          <div className="truncate text-sm font-semibold text-gray-900" title={jobTitle}>
                            {jobTitle}
                          </div>
                          <div className="truncate text-xs text-gray-600" title={companyName}>
                            {companyName}
                          </div>
                          <div className="mt-2 text-xs text-gray-600">
                            Applied: <span className="font-semibold text-gray-800">{formatDate(app.appliedAt)}</span>
                          </div>
                          <div className="text-xs text-gray-600">
                            Archived: <span className="font-semibold text-gray-800">{formatDate(app.declinedArchivedAt)}</span>
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                          <Button
                            variant="primarySoft"
                            size="md"
                            onClick={() => setRestoreTarget(app)}
                            disabled={busy}
                          >
                            <Icon name="restore" className="h-5 w-5" />
                            Restore
                          </Button>

                          <Link
                            to={`/employer/application/${app._id}`}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2"
                          >
                            <Icon name="eye" className="h-5 w-5" />
                            View
                          </Link>

                          <Button
                            variant="dangerSoft"
                            size="md"
                            onClick={() => setDeleteTarget(app)}
                            disabled={busy}
                          >
                            <Icon name="trash" className="h-5 w-5" />
                            Permanent Delete
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        <Modal
          open={!!restoreTarget}
          title="Restore declined applicant?"
          description={
            restoreTarget
              ? `This will move ${buildApplicantName(restoreTarget.jobseeker)}'s declined application record back to the declined applicants list.`
              : ''
          }
          confirmText="Restore"
          cancelText="Cancel"
          loading={action.type === 'restore' && !!action.id}
          loadingText="Restoring…"
          onClose={() => {
            if (action.type === 'restore') return;
            setRestoreTarget(null);
          }}
          onConfirm={handleRestore}
        />

        <Modal
          open={!!deleteTarget}
          title="Permanently delete declined applicant?"
          description={
            deleteTarget
              ? `This will permanently delete ${buildApplicantName(deleteTarget.jobseeker)}'s archived declined application record. This action cannot be undone.`
              : ''
          }
          confirmText="Permanent Delete"
          cancelText="Cancel"
          danger
          loading={action.type === 'delete' && !!action.id}
          loadingText="Deleting…"
          onClose={() => {
            if (action.type === 'delete') return;
            setDeleteTarget(null);
          }}
          onConfirm={handlePermanentDelete}
        />
      </div>

      <ArchivedCustomDateRangeModal
        open={showCustomDateModal}
        startDate={customDateFrom}
        endDate={customDateTo}
        onCancel={() => setShowCustomDateModal(false)}
        onApply={(dateFrom, dateTo) => {
          setSort('custom');
          setCustomDateFrom(dateFrom);
          setCustomDateTo(dateTo);
          setShowCustomDateModal(false);
        }}
      />
    </EmployerLayout>
  );
};

export default ArchivedDeclinedApplicants;