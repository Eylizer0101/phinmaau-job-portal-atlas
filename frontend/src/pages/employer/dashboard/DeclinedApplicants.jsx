// src/pages/employer/dashboard/DeclinedApplicants.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import EmployerLayout from '../../../layouts/EmployerLayout';
import Pagination from '../../../components/shared/Pagination';
import CenteredIndicator from '../../../components/shared/CenteredIndicator';

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
    default:
      return null;
  }
};

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
        className="flex h-12 w-full items-center justify-between rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-900 transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2 disabled:bg-gray-50 disabled:opacity-60"
      >
        <span className="truncate">{getEmployerDateFilterLabel(value, startDate, endDate)}</span>
        <svg className="h-4 w-4 shrink-0 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3M5 11h14M6 5h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2z" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-[56px] z-[100] w-56 rounded-2xl border border-gray-100 bg-white p-2 shadow-xl ring-1 ring-black/5">
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
          className={cn(
            'shrink-0 rounded-lg px-2 py-1 text-xs font-semibold hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2',
            ring
          )}
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
  applicantName,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onClose,
  danger = false,
  loading = false,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl"
      >
        <div className="flex items-start gap-5 px-6 py-6">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600">
            <Icon name="trash" className="h-6 w-6" />
          </div>

          <div className="min-w-0 flex-1 text-left">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              This will move “<span className="font-semibold text-[#2e66a6]">{applicantName}</span>” application to the archived records.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
          <button type="button" onClick={onClose} disabled={loading} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 disabled:opacity-50">
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            ref={confirmRef}
            className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-b-2 border-t-2 border-white" /> : <Icon name="trash" className="h-5 w-5" />}
            {loading ? 'Archiving…' : confirmText}
          </button>
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

const DeclinedApplicants = () => {
  const navigate = useNavigate();
  const API_BASE = (process.env.REACT_APP_API_URL || 'https://phinmaau-job-portal-atlas.onrender.com/api').replace(/\/api\/?$/, '');

  const [brokenAvatars, setBrokenAvatars] = useState(() => new Set());
  const [applications, setApplications] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [archiveCounts, setArchiveCounts] = useState({ active: 0, archived: 0 });

  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, 250);
  const [selectedJob, setSelectedJob] = useState('all');
  const [filterBy, setFilterBy] = useState('all');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [showCustomDateModal, setShowCustomDateModal] = useState(false);
  const [sortBy, setSortBy] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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
      const src = img ? getImageUrl(img) : '';
      const isBroken = brokenAvatars.has(String(altKey));
      const boxStyle = { height: `${size}px`, width: `${size}px` };

      return (
        <div
          className="flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-gray-100"
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
            <img src="/images/profile.png" alt="Default profile" className="h-full w-full object-cover" />
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

  const fetchDeclinedApplications = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await axios.get('https://phinmaau-job-portal-atlas.onrender.com/api/applications/employer/declined', {
        headers: getAuthHeaders(),
      });

      if (res.data?.success) {
        setApplications(res.data.applications || []);
        setArchiveCounts({
          active: res.data.activeCount ?? (res.data.applications || []).length,
          archived: res.data.archivedCount ?? 0,
        });
      } else {
        setApplications([]);
      }
    } catch (err) {
      console.error(err);
      if (err.response?.status === 401) return handleAuthError();
      setError('Failed to load declined applicants.');
      setApplications([]);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchJobs();
    fetchDeclinedApplications();
  }, [fetchJobs, fetchDeclinedApplications]);

  const jobOptions = useMemo(() => {
    return [
      { value: 'all', label: 'All Job Title' },
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
    const thirtyDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const startOfNextYear = new Date(now.getFullYear() + 1, 0, 1);

    const startOfLastYear = new Date(now.getFullYear() - 1, 0, 1);
    const startOfThisYear = new Date(now.getFullYear(), 0, 1);

    if (filterBy === 'today') {
      list = list.filter((a) => {
        const date = new Date(a.appliedAt || 0);
        return !Number.isNaN(date.getTime()) && date >= startOfToday && date < startOfTomorrow;
      });
    } else if (filterBy === 'yesterday') {
      list = list.filter((a) => {
        const date = new Date(a.appliedAt || 0);
        return !Number.isNaN(date.getTime()) && date >= startOfYesterday && date < startOfToday;
      });
    } else if (filterBy === 'this_week') {
      list = list.filter((a) => {
        const date = new Date(a.appliedAt || 0);
        return !Number.isNaN(date.getTime()) && date >= startOfWeek && date < startOfNextWeek;
      });
    } else if (filterBy === 'last_7_days') {
      list = list.filter((a) => {
        const date = new Date(a.appliedAt || 0);
        return !Number.isNaN(date.getTime()) && date >= sevenDaysAgo && date < startOfTomorrow;
      });
    } else if (filterBy === 'this_month') {
      list = list.filter((a) => {
        const date = new Date(a.appliedAt || 0);
        return !Number.isNaN(date.getTime()) && date >= startOfMonth && date < startOfNextMonth;
      });
    } else if (filterBy === 'last_month') {
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      list = list.filter((a) => {
        const date = new Date(a.appliedAt || 0);
        return !Number.isNaN(date.getTime()) && date >= startOfLastMonth && date < startOfCurrentMonth;
      });
    } else if (filterBy === 'this_year') {
      list = list.filter((a) => {
        const date = new Date(a.appliedAt || 0);
        return !Number.isNaN(date.getTime()) && date >= startOfYear && date < startOfNextYear;
      });
    } else if (filterBy === 'last_year') {
      list = list.filter((a) => {
        const date = new Date(a.appliedAt || 0);
        return !Number.isNaN(date.getTime()) && date >= startOfLastYear && date < startOfThisYear;
      });
    } else if (filterBy === 'custom' && customDateFrom && customDateTo) {
      const customStart = new Date(`${customDateFrom}T00:00:00`);
      const customEndExclusive = new Date(`${customDateTo}T00:00:00`);
      customEndExclusive.setDate(customEndExclusive.getDate() + 1);
      list = list.filter((a) => {
        const date = new Date(a.appliedAt || 0);
        return !Number.isNaN(date.getTime()) && date >= customStart && date < customEndExclusive;
      });
    }

    const getAppliedTime = (app) => {
      const time = new Date(app?.appliedAt || 0).getTime();
      return Number.isNaN(time) ? 0 : time;
    };

    const getDeclinedTime = (app) => {
      const declinedActivityTimes = (Array.isArray(app?.activityHistory) ? app.activityHistory : [])
        .filter((activity) => String(activity?.type || '').toLowerCase() === 'declined')
        .map((activity) => new Date(activity?.occurredAt || 0).getTime())
        .filter((time) => Number.isFinite(time));

      const candidates = [
        ...declinedActivityTimes,
        new Date(app?.declinedAt || 0).getTime(),
        new Date(app?.reviewedAt || 0).getTime(),
        new Date(app?.updatedAt || 0).getTime(),
        getAppliedTime(app),
      ].filter((time) => Number.isFinite(time));

      return candidates.length ? Math.max(...candidates) : 0;
    };

    return [...list].sort((a, b) => {
      if (sortBy === 'oldest_first') return getAppliedTime(a) - getAppliedTime(b);
      if (sortBy === 'recently_declined') return getDeclinedTime(b) - getDeclinedTime(a);
      if (sortBy === 'least_recently_declined') return getDeclinedTime(a) - getDeclinedTime(b);

      return getAppliedTime(b) - getAppliedTime(a);
    });
  }, [applications, buildApplicantName, debouncedQuery, filterBy, customDateFrom, customDateTo, selectedJob, sortBy, getDeclinedStageLabel]);


  const totalItems = filteredApplications.length;
  const numericPageSize = pageSize === 'all' ? Math.max(totalItems, 1) : Number(pageSize);
  const totalPages = Math.max(1, Math.ceil(totalItems / numericPageSize));
  const paginatedApplications = useMemo(() => {
    if (pageSize === 'all') return filteredApplications;
    const start = (currentPage - 1) * numericPageSize;
    return filteredApplications.slice(start, start + numericPageSize);
  }, [filteredApplications, currentPage, numericPageSize, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const hasActiveFilters = useMemo(() => {
    return query.trim() !== '' || filterBy !== 'all' || sortBy !== '' || selectedJob !== 'all';
  }, [query, filterBy, sortBy, selectedJob]);

  const handleDelete = async () => {
    if (!deleteTarget?._id) return;

    try {
      setDeletingId(deleteTarget._id);
      setError('');

      const res = await axios.patch(
        `https://phinmaau-job-portal-atlas.onrender.com/api/applications/${deleteTarget._id}/archive-declined`,
        {},
        { headers: getAuthHeaders() }
      );

      if (res.data?.success) {
        setApplications((prev) => prev.filter((item) => item._id !== deleteTarget._id));
        setArchiveCounts((prev) => ({
          active: Math.max(0, prev.active - 1),
          archived: prev.archived + 1,
        }));
        setSuccess('Declined applicant archived successfully.');
        setDeleteTarget(null);
      } else {
        setError('Failed to archive declined applicant.');
      }
    } catch (err) {
      console.error(err);
      if (err.response?.status === 401) return handleAuthError();
      setError(err.response?.data?.message || 'Failed to archive declined applicant.');
    } finally {
      setDeletingId(null);
    }
  };

  const clearFilters = () => {
    setQuery('');
    setSelectedJob('all');
    setFilterBy('all');
    setCustomDateFrom('');
    setCustomDateTo('');
    setSortBy('');
  };

  const headerRight = useMemo(() => {
    return (
      <div className="inline-flex items-center rounded-2xl border border-gray-200 bg-white p-1 shadow-sm">
        <button
          type="button"
          onClick={() => navigate('/employer/declined/archived')}
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
        >
          <Icon name="archive" className="h-4 w-4" />
          <span>Archived</span>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">
            {archiveCounts.archived}
          </span>
        </button>
      </div>
    );
  }, [archiveCounts.archived, navigate]);

  const inputBase =
    'w-full rounded-xl border border-gray-300 py-3 pl-11 pr-10 text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2 disabled:bg-gray-50 disabled:opacity-60';

  const selectBase =
    'w-full rounded-xl border border-gray-300 px-4 py-3 pr-9 text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2 disabled:bg-gray-50 disabled:opacity-60';

  return (
    <EmployerLayout>
      <div className="mx-auto max-w-7xl px-1 py-8">
        <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(300px,auto)_minmax(320px,1fr)_auto] xl:items-start">
          <div>
            <h1 className="text-[33px] font-semibold leading-[40px] text-gray-900">Declined Applicants</h1>
            <p className="mt-1 text-sm text-gray-600">Applicants reviewed but not selected for position</p>
          </div>

          <div className="min-w-0 xl:pt-1">
            <CenteredIndicator type="error" message={error} onClose={() => setError('')} />
            <CenteredIndicator type="success" message={success} onClose={() => setSuccess('')} />
          </div>

          <div className="xl:pt-1">{headerRight}</div>
        </div>

        <div className="mb-6 overflow-visible rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="p-5">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
              <div className={hasActiveFilters ? 'lg:col-span-4' : 'lg:col-span-5'}>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-3.5 text-gray-400">
                    <Icon name="search" className="h-5 w-5" />
                  </span>

                  <label className="sr-only" htmlFor="declinedApplicantSearch">
                    Search declined applicants
                  </label>
                  <input
                    id="declinedApplicantSearch"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className={inputBase}
                    placeholder="Search applicant, email, job title, stage..."
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
                <label className="sr-only" htmlFor="declinedJobFilter">
                  Filter declined applicants by job
                </label>
                <select
                  id="declinedJobFilter"
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

              <div className="lg:col-span-2">
                <label className="sr-only" htmlFor="declinedDateFilter">
                  Filter declined applicants by date
                </label>
                <EmployerDateFilterDropdown
                  value={filterBy}
                  startDate={customDateFrom}
                  endDate={customDateTo}
                  disabled={loading}
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

              <div className="lg:col-span-2">
                <label className="sr-only" htmlFor="sortDeclinedFilter">
                  Sort declined applicants
                </label>
                <select
                  id="sortDeclinedFilter"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className={selectBase}
                  disabled={loading}
                >
                  <option value="" disabled>Sort By</option>
                  <option value="newest">Newest First</option>
                  <option value="oldest_first">Oldest First</option>
                  <option value="recently_declined">Recently Declined</option>
                  <option value="least_recently_declined">Least Recently Declined</option>
                </select>
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
                <p className="mt-4 text-sm text-gray-600">Loading declined applicants…</p>
              </div>
            ) : filteredApplications.length === 0 ? (
              <div className="py-14 text-center">
                <h3 className="text-lg font-semibold text-gray-900">No declined applicants found</h3>
                <p className="mt-2 text-sm text-gray-600">There are currently no declined applications to display.</p>
              </div>
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                          Applied Date
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                          Applicant
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                          Job Applied
                        </th>
                        <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-gray-600">
                          Decline Stage
                        </th>
                        <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-gray-600">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-200 bg-white">
                      {paginatedApplications.map((app) => {
                        const name = buildApplicantName(app.jobseeker);
                        const email = app.jobseeker?.email || '—';
                        const jobTitle = app.job?.title || 'Job Title';
                        const rowBusy = deletingId === app._id;
                        const declinedStageLabel = getDeclinedStageLabel(app.declinedFrom);

                        return (
                          <tr
                            key={app._id}
                            role="link"
                            tabIndex={0}
                            aria-label={`View application of ${name}`}
                            onClick={(event) => {
                              if (event.target.closest?.('a, button, input, select, textarea, [role="button"]')) return;
                              navigate(`/employer/application/${app._id}?from=declined`);
                            }}
                            onKeyDown={(event) => {
                              if (event.target !== event.currentTarget) return;
                              if (event.key !== 'Enter' && event.key !== ' ') return;
                              event.preventDefault();
                              navigate(`/employer/application/${app._id}?from=declined`);
                            }}
                            className="group cursor-pointer transition-colors hover:bg-[#2e66a6]/[0.06] focus-visible:bg-[#2e66a6]/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2e66a6]"
                          >
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-900">{formatDate(app.appliedAt)}</div>
                            </td>

                            <td className="px-6 py-4">
                              <div className="flex items-center gap-4">
                                <Avatar
                                  img={app.jobseeker?.profileImage}
                                  name={name}
                                  size={48}
                                  altKey={`declined_${app._id}`}
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
                            </td>

                            <td className="px-6 py-4 text-center align-middle">
                              <div className="flex w-full flex-col items-center justify-center text-center">
                                <span className="text-sm font-semibold text-red-600">
                                  {declinedStageLabel}
                                </span>
                                <div className="mt-1 text-xs text-gray-600">
                                  {formatDate(app.reviewedAt)}
                                </div>
                              </div>
                            </td>

                            <td className="px-6 py-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <Link
                                  to={`/employer/application/${app._id}?from=declined`}
                                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2"
                                  aria-label={`View application of ${name}`}
                                >
                                  <Icon name="eye" className="h-4 w-4" />
                                  <span className="sr-only">View</span>
                                </Link>

                                <button
                                  type="button"
                                  onClick={() => setDeleteTarget(app)}
                                  disabled={rowBusy}
                                  aria-label={`Archive declined application of ${name}`}
                                  title="Archive"
                                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-700 transition hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  <Icon name="trash" className="h-4 w-4" />
                                </button>

                                {rowBusy && (
                                  <span className="inline-flex items-center gap-2 text-xs font-semibold text-gray-500">
                                    <span className="inline-block h-3 w-3 animate-spin rounded-full border-b-2 border-t-2 border-gray-400" />
                                    Archiving…
                                  </span>
                                )}
                              </div>
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
                    const jobTitle = app.job?.title || 'Job Title';
                    const rowBusy = deletingId === app._id;
                    const declinedStageLabel = getDeclinedStageLabel(app.declinedFrom);

                    return (
                      <div key={app._id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <Avatar
                              img={app.jobseeker?.profileImage}
                              name={name}
                              size={44}
                              altKey={`declined_mobile_${app._id}`}
                            />

                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold text-gray-900">{name}</div>
                              <div className="truncate text-xs text-gray-600">{email}</div>
                            </div>
                          </div>

                          <span className="shrink-0 text-xs font-semibold text-red-600">
                            {declinedStageLabel}
                          </span>
                        </div>

                        <div className="mt-3 rounded-xl bg-gray-50 p-3">
                          <div className="truncate text-sm font-semibold text-gray-900" title={jobTitle}>
                            {jobTitle}
                          </div>
                          <div className="mt-2 text-xs text-gray-600">
                            Applied: <span className="font-semibold text-gray-800">{formatDate(app.appliedAt)}</span>
                          </div>
                          <div className="mt-1 text-xs text-gray-600">
                            Stage: <span className="font-semibold text-gray-800">{declinedStageLabel}</span>
                          </div>
                          <div className="text-xs text-gray-600">
                            Declined: <span className="font-semibold text-gray-800">{formatDate(app.reviewedAt)}</span>
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <Link
                            to={`/employer/application/${app._id}?from=declined`}
                            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2"
                          >
                            <Icon name="eye" className="h-5 w-5" />
                            View
                          </Link>

                          <Button
                            variant="dangerSoft"
                            size="md"
                            className="flex-1"
                            onClick={() => setDeleteTarget(app)}
                            disabled={rowBusy}
                          >
                            <Icon name="trash" className="h-5 w-5" />
                            {rowBusy ? 'Archiving…' : 'Delete'}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>

              <Pagination currentPage={currentPage} totalItems={totalItems} pageSize={pageSize} onPageChange={setCurrentPage} onPageSizeChange={setPageSize} ariaLabel="Declined applicants pagination" />

              </>
            )}
          </div>
        </div>

        <Modal
          open={!!deleteTarget}
          title="Archive Declined Applicant?"
          applicantName={deleteTarget ? buildApplicantName(deleteTarget.jobseeker) : ''}
          confirmText="Archive"
          cancelText="Cancel"
          danger
          loading={!!deletingId}
          onClose={() => {
            if (deletingId) return;
            setDeleteTarget(null);
          }}
          onConfirm={handleDelete}
        />
      </div>

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

export default DeclinedApplicants;
