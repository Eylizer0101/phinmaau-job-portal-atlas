import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import EmployerLayout from '../../../layouts/EmployerLayout';
import Pagination from '../../../components/shared/Pagination';

/* =======================
   Small UI helpers
======================= */
const Icon = ({ name, className = 'h-5 w-5', ...props }) => {
  const common = { className, fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24', ...props };
  switch (name) {
    case 'search':
      return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.3-4.3m1.3-5.2a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>;
    case 'eye':
      return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
    case 'check':
      return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M5 13l4 4L19 7" /></svg>;
    case 'x':
      return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>;
    case 'plus':
      return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" /></svg>;
    case 'calendar':
      return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3M5 11h14M6 5h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2z" /></svg>;
    case 'archive':
      return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7H4m2 0v11a2 2 0 002 2h8a2 2 0 002-2V7M9 11h6M5 7l1-3h12l1 3" /></svg>;
    case 'edit':
      return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>;
    case 'trash':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3M4 7h16" />
        </svg>
      );
    case 'publish':
      return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 16V4m0 0L7 9m5-5 5 5M5 20h14" /></svg>;
    case 'openJob':
      return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 11V9a5 5 0 019-3M7 11h10a2 2 0 012 2v6a2 2 0 01-2 2H7a2 2 0 01-2-2v-6a2 2 0 012-2z" /></svg>;
    case 'closeJob':
      return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M7 11V8a5 5 0 0110 0v3m-10 0h10a2 2 0 012 2v6a2 2 0 01-2 2H7a2 2 0 01-2-2v-6a2 2 0 012-2z" /></svg>;
    case 'more':
      return <svg {...common}><circle cx="12" cy="5" r="1.5" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" /><circle cx="12" cy="19" r="1.5" fill="currentColor" stroke="none" /></svg>;
    case 'lock':
      return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11V8a5 5 0 0110 0v3m-10 0h10a2 2 0 012 2v6a2 2 0 01-2 2H7a2 2 0 01-2-2v-6a2 2 0 012-2z" /></svg>;
    case 'shield':
      return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-3z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.5 12l1.6 1.6 3.7-4" /></svg>;
    case 'send':
      return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M22 2L11 13" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M22 2l-7 20-4-9-9-4 20-7z" /></svg>;
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
        className="flex h-11 w-full items-center justify-between rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-900 transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2 disabled:bg-gray-50 disabled:opacity-60"
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


const Button = ({ variant = 'secondary', size = 'md', leftIcon, children, className, disabled, ...props }) => {
  const base = 'inline-flex items-center justify-center gap-2 font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-80';
  const sizes = { xs: 'px-2 py-1.5 text-xs rounded-lg', sm: 'px-3 py-2 text-sm rounded-lg', md: 'px-4 py-3 text-sm rounded-xl' };
  const variants = {
    secondary: 'border border-gray-200 bg-white text-gray-900 hover:bg-gray-50 focus-visible:ring-[#2e66a6]',
    primary: 'bg-[#2e66a6] text-white hover:bg-[#23508a] focus-visible:ring-[#2e66a6]',
    dangerSoft: 'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 focus-visible:ring-red-600',
  };

  return (
    <button type="button" className={cn(base, sizes[size], variants[variant], className)} disabled={disabled} {...props}>
      {leftIcon}
      {children}
    </button>
  );
};

const Alert = ({ type = 'error', children, onClose }) => {
  const isError = type === 'error';
  const styles = isError ? 'border-red-200 bg-red-50 text-red-900' : 'border-blue-200 bg-blue-50 text-[#2e66a6]';
  return (
    <div className={cn('mb-5 flex items-start justify-between gap-4 rounded-xl border p-4 text-sm font-medium', styles)} role={isError ? 'alert' : 'status'} aria-live={isError ? 'assertive' : 'polite'}>
      <div className="min-w-0">{children}</div>
      {onClose && (
        <button type="button" onClick={onClose} className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6]" aria-label="Dismiss message">
          Dismiss
        </button>
      )}
    </div>
  );
};

const ManageJobs = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);
  const [recentlySavedDraftId, setRecentlySavedDraftId] = useState('');

  const [selectedJob, setSelectedJob] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [openStatusMenuId, setOpenStatusMenuId] = useState('');
  const [statusConfirmationJob, setStatusConfirmationJob] = useState(null);

  const [action, setAction] = useState({ type: '', jobId: '' });
  const [editRequests, setEditRequests] = useState([]);
  const [lockedJob, setLockedJob] = useState(null);
  const [showLockedModal, setShowLockedModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestSections, setRequestSections] = useState([]);
  const [requestReason, setRequestReason] = useState('');
  const [requestSubmitting, setRequestSubmitting] = useState(false);

  const modalRef = useRef(null);
  const cancelBtnRef = useRef(null);

  const [jobFilter, setJobFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [showCustomDateModal, setShowCustomDateModal] = useState(false);
  const [q, setQ] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [badLogos, setBadLogos] = useState({});
  const [counts, setCounts] = useState({
    active: 0,
    archived: 0,
  });

  const storedUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
      return null;
    }
  }, []);

  const employerVerificationStatus =
    storedUser?.employerProfile?.verificationDocs?.overallStatus || 'unverified';

  const isEmployerVerified =
    employerVerificationStatus === 'verified' || storedUser?.isVerified === true;

  const verificationBannerMessage = useMemo(() => {
    if (isEmployerVerified) return '';
    if (employerVerificationStatus === 'pending') {
      return 'Verification is pending. You can save and edit drafts, but you cannot publish until approved by admin.';
    }
    if (employerVerificationStatus === 'rejected') {
      return 'Verification was rejected. You can save and edit drafts, but you cannot publish until you resubmit and get approved.';
    }
    if (employerVerificationStatus === 'suspended') {
      return 'Your company is suspended. You can save drafts, but publishing is disabled.';
    }
    return 'Your company is not verified yet. You can save and edit drafts, but you cannot publish until verified by admin.';
  }, [isEmployerVerified, employerVerificationStatus]);

  const closeModal = () => {
    setShowDeleteModal(false);
    setSelectedJob(null);
  };

  useEffect(() => {
    if (!openStatusMenuId) return undefined;

    const handlePointerDown = (event) => {
      if (!event.target.closest?.('[data-job-status-menu]')) {
        setOpenStatusMenuId('');
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setOpenStatusMenuId('');
    };

    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [openStatusMenuId]);

  useEffect(() => {
    if (!statusConfirmationJob) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleEscape = (event) => {
      if (event.key === 'Escape' && !action.jobId) {
        setStatusConfirmationJob(null);
      }
    };

    window.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleEscape);
    };
  }, [statusConfirmationJob, action.jobId]);

  useEffect(() => {
    if (!showDeleteModal) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [showDeleteModal]);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const [response, requestResponse] = await Promise.all([
        axios.get('https://phinmaau-job-portal-atlas.onrender.com/api/jobs/employer/my-jobs?archived=false', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get('https://phinmaau-job-portal-atlas.onrender.com/api/job-edit-requests/employer', {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => ({ data: { requests: [] } })),
      ]);

      setEditRequests(Array.isArray(requestResponse.data?.requests) ? requestResponse.data.requests : []);

      if (response.data.success) {
        setJobs(response.data.jobs || []);
        setCounts({
          active: response.data.activeCount ?? 0,
          archived: response.data.archivedCount ?? 0,
        });
      } else {
        setError('Failed to fetch jobs');
      }
    } catch (err) {
      console.error('Error fetching jobs:', err);
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/employer/login');
      }
      setError('Failed to load jobs. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!location.state?.editLocked || !location.state?.lockedJobId || !jobs.length) return;

    const job = jobs.find((item) => String(item._id) === String(location.state.lockedJobId));
    if (job) {
      openEditRequestFlow(job);
    }

    navigate(location.pathname, { replace: true, state: {} });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobs, location.pathname, location.state, navigate]);

  useEffect(() => {
    const successType = location.state?.successType;
    const draftWasSaved =
      location.state?.jobDraftSaved ||
      successType === 'post-draft' ||
      successType === 'edit-draft';

    if (
      !location.state?.jobPostSuccess &&
      !location.state?.jobEditSuccess &&
      !successType &&
      !draftWasSaved
    ) {
      return;
    }

    if (draftWasSaved) {
      const savedJobTitle = String(location.state?.savedJobTitle || 'Your job').trim();

      setRecentlySavedDraftId(String(location.state?.savedJobId || ''));
      setSuccess({
        type: 'draft',
        title: 'Draft Saved Successfully',
        message: `${savedJobTitle || 'Your job'} was saved as a draft. The saved job is highlighted below.`,
      });
    } else if (location.state?.jobPostSuccess || successType === 'post') {
      setSuccess({
        type: 'post',
        title: 'Job Posted Successfully',
        message: 'Your job listing is now live and visible to applicants.',
      });
    } else if (successType === 'edit-publish') {
      setSuccess({
        type: 'edit',
        title: 'Job Updated & Published Successfully',
        message: 'Your updated job listing is now live and visible to applicants.',
      });
    } else {
      setSuccess({
        type: 'edit',
        title: 'Job Edited Successfully',
        message: 'Your job listing is now updated in Manage Jobs.',
      });
    }

    navigate(location.pathname, { replace: true, state: {} });
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    if (!recentlySavedDraftId) return undefined;

    const timer = window.setTimeout(() => {
      setRecentlySavedDraftId('');
    }, 10000);

    return () => window.clearTimeout(timer);
  }, [recentlySavedDraftId]);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(''), 3500);
    return () => clearTimeout(t);
  }, [error]);

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const isExpired = (dateString) => {
    if (!dateString) return false;
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return false;
    return d < new Date();
  };

  const safeTitle = (job) => (job.title && job.title.trim() ? job.title : '—');
  const safeCompany = (job) => (job.companyName && job.companyName.trim() ? job.companyName : '—');

  const getApplicantValue = (job) => {
    const candidates = [
      job?.applicationCount,
      Array.isArray(job?.applications) ? job.applications.length : undefined,
      job?.applicantCount,
      job?.applicantsCount,
      job?.totalApplicants,
    ];

    const found = candidates.find((value) => value !== undefined && value !== null && value !== '');
    return found ?? 0;
  };

  const getDerivedStatus = (job) => {
    const explicitStatus = String(job?.status || '').trim().toLowerCase();

    if (explicitStatus === 'draft' || job.isPublished === false) return 'draft';
    if (explicitStatus === 'filled') return 'filled';
    if (explicitStatus === 'closed') return 'closed';
    if (isExpired(job.applicationDeadline)) return 'expired';
    return job.isActive ? 'open' : 'closed';
  };

  const getStatusPill = (job) => {
    const s = getDerivedStatus(job);
    if (s === 'draft') return 'border border-gray-200 bg-gray-100 text-gray-700';
    if (s === 'open') return 'border border-blue-200 bg-blue-50 text-[#2e66a6]';
    if (s === 'expired') return 'border border-amber-200 bg-amber-50 text-amber-700';
    if (s === 'filled') return 'border border-orange-200 bg-orange-50 text-orange-700';
    return 'border border-gray-300 bg-gray-50 text-gray-700';
  };

  const getStatusText = (job) => {
    const s = getDerivedStatus(job);
    if (s === 'draft') return 'Draft';
    if (s === 'open') return 'Open';
    if (s === 'expired') return 'Expired';
    if (s === 'filled') return 'Filled';
    return 'Closed';
  };

  const getArchiveConfirmationMessage = (job) => {
    const status = getDerivedStatus(job);

    if (status === 'open') {
      return 'This job post is currently Open. Archiving it will remove it from the job offers and listings, and job seekers will no longer be able to view or apply for it.';
    }

    if (status === 'closed') {
      return 'This job post is currently Closed. Archiving it will move the job post to your archived records for future reference.';
    }

    if (status === 'expired') {
      return 'This job has Expired. Archiving it will remove it from your active job posts while keeping it available in your archived records.';
    }

    if (status === 'draft') {
      return 'This job is currently a Draft. Archiving it will remove the draft from your active list and store it in your archived records. It will remain unpublished and invisible to job seekers.';
    }

    if (status === 'filled') {
      return 'This job is currently Filled. Archiving it will remove it from your active job posts while keeping it available in your archived records.';
    }

    return 'Archiving this job will remove it from your active jobs and move it to your archived records.';
  };

  const safeDate = (d) => {
    const x = new Date(d || 0);
    return Number.isNaN(x.getTime()) ? new Date(0) : x;
  };

  const getComparableDate = (job) => {
    const createdDate = safeDate(job.createdAt);
    if (createdDate.getTime() !== new Date(0).getTime()) return createdDate;

    const postedDate = safeDate(job.datePosted);
    if (postedDate.getTime() !== new Date(0).getTime()) return postedDate;

    return safeDate(job.updatedAt);
  };

  const getPublishedDate = (job) => {
    const value = job?.publishedAt || job?.createdAt;
    const date = value ? new Date(value) : null;
    return date && !Number.isNaN(date.getTime()) ? date : null;
  };

  const getLatestEditRequest = (jobId) =>
    editRequests.find((request) => String(request?.job?._id || request?.job) === String(jobId));

  const getEditRequestBadge = (jobId) => {
    const status = String(getLatestEditRequest(jobId)?.status || '').toLowerCase();

    if (status === 'pending') {
      return {
        label: 'Edit Request Pending',
        icon: 'shield',
        className: 'border-amber-300 bg-amber-50 text-amber-800',
      };
    }

    if (status === 'approved') {
      return {
        label: 'Edit Request Approved',
        icon: 'check',
        className: 'border-emerald-300 bg-emerald-50 text-emerald-700',
      };
    }

    return null;
  };

  const hasTemporaryEditAccess = (job) => {
    const unlockUntil = job?.editUnlockedUntil ? new Date(job.editUnlockedUntil) : null;
    return Boolean(
      unlockUntil &&
      !Number.isNaN(unlockUntil.getTime()) &&
      unlockUntil.getTime() > Date.now()
    );
  };

  const isJobEditLocked = (job) => {
    if (!job || job.isPublished === false || getDerivedStatus(job) === 'draft') return false;
    if (hasTemporaryEditAccess(job)) return false;

    const publishedAt = getPublishedDate(job);
    return Boolean(publishedAt && Date.now() - publishedAt.getTime() >= 60 * 60 * 1000);
  };

  const openEditRequestFlow = (job) => {
    setLockedJob(job);
    setShowLockedModal(true);
    setShowRequestModal(false);
    setRequestSections([]);
    setRequestReason('');
  };

  const handleEditAction = (job) => {
    if (isJobEditLocked(job)) {
      openEditRequestFlow(job);
      return;
    }

    navigate(`/employer/edit-job/${job._id}`);
  };

  const toggleRequestSection = (section) => {
    setRequestSections((current) =>
      current.includes(section)
        ? current.filter((item) => item !== section)
        : [...current, section]
    );
  };

  const submitEditRequest = async () => {
    if (!lockedJob?._id || requestSubmitting) return;
    if (!requestSections.length) {
      setError('Select at least one section that needs to be edited.');
      return;
    }

    try {
      setRequestSubmitting(true);
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `https://phinmaau-job-portal-atlas.onrender.com/api/job-edit-requests/job/${lockedJob._id}`,
        {
          requestedSections: requestSections,
          reason: requestReason,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data?.request) {
        setEditRequests((current) => [
          response.data.request,
          ...current.filter((item) => String(item?._id) !== String(response.data.request._id)),
        ]);
      }

      setShowRequestModal(false);
      setShowLockedModal(false);
      setSuccess({
        type: 'edit-request',
        title: 'Edit request sent',
        message: 'An administrator will review it shortly.',
      });
    } catch (err) {
      console.error('Error sending edit request:', err);
      const pendingRequest = err.response?.data?.request;
      if (pendingRequest) {
        setEditRequests((current) => [
          pendingRequest,
          ...current.filter((item) => String(item?._id) !== String(pendingRequest._id)),
        ]);
      }
      setError(err.response?.data?.message || 'Failed to send the edit request. Please try again.');
    } finally {
      setRequestSubmitting(false);
    }
  };

  const handlePublish = async (jobId) => {
    try {
      if (!isEmployerVerified) {
        setError(verificationBannerMessage || 'Your company is not verified yet. Publishing is disabled.');
        return;
      }

      const jobToUpdate = jobs.find((job) => job._id === jobId);
      if (!jobToUpdate) return;

      if (action.jobId) return;
      setAction({ type: 'publish', jobId });

      const token = localStorage.getItem('token');

      const updateData = {
        ...jobToUpdate,
        isPublished: true,
        isActive: true,
        status: 'published',
      };

      await axios.put(`https://phinmaau-job-portal-atlas.onrender.com/api/jobs/${jobId}`, updateData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      setJobs((prev) =>
        prev.map((job) => (job._id === jobId ? { ...job, isPublished: true, isActive: true, status: 'published' } : job))
      );

      setSuccess({ type: 'publish', title: 'Job Published Successfully', message: 'This draft is now live and visible to applicants.' });
    } catch (err) {
      console.error('Error publishing job:', err);

      if (err.response?.status === 403 && err.response?.data?.code === 'EMPLOYER_NOT_VERIFIED') {
        setError(err.response?.data?.message || verificationBannerMessage || 'Verification required to publish.');
      } else {
        setError('Failed to publish job. Please complete required fields and try again.');
      }
    } finally {
      setAction({ type: '', jobId: '' });
    }
  };

  const handleToggleJobStatus = async (job) => {
    const jobId = job?._id;
    const currentStatus = getDerivedStatus(job);

    if (!jobId || !['open', 'closed', 'expired'].includes(currentStatus) || action.jobId) return;

    const shouldOpen = currentStatus !== 'open';

    try {
      setOpenStatusMenuId('');
      setError('');
      setAction({ type: shouldOpen ? 'open' : 'close', jobId });

      const token = localStorage.getItem('token');
      const response = await axios.patch(
        `https://phinmaau-job-portal-atlas.onrender.com/api/jobs/${jobId}/status`,
        { isActive: shouldOpen },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const updatedJob = response.data?.job || {
        ...job,
        isActive: shouldOpen,
        isPublished: true,
        status: shouldOpen ? 'published' : 'closed',
      };

      setJobs((prev) =>
        prev.map((item) => (item._id === jobId ? { ...item, ...updatedJob } : item))
      );

      setSuccess({
        type: shouldOpen ? 'open' : 'close',
        title: shouldOpen ? 'Job Opened Successfully' : 'Job Closed Successfully',
        message: shouldOpen
          ? 'The job is visible in Job Offers again and jobseekers can apply.'
          : 'The job is no longer visible in Job Offers, but its existing applicants are still available for review.',
      });
      setStatusConfirmationJob(null);
    } catch (err) {
      console.error(`Error ${shouldOpen ? 'opening' : 'closing'} job:`, err);
      setError(
        err.response?.data?.message ||
          `Failed to ${shouldOpen ? 'open' : 'close'} the job. Please try again.`
      );
    } finally {
      setAction({ type: '', jobId: '' });
    }
  };

  const handleDelete = async (jobId) => {
    try {
      if (action.jobId) return;
      setAction({ type: 'delete', jobId });

      const token = localStorage.getItem('token');

      await axios.delete(`https://phinmaau-job-portal-atlas.onrender.com/api/jobs/${jobId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setJobs((prev) => prev.filter((job) => job._id !== jobId));
      setCounts((prev) => ({
        active: Math.max(0, prev.active - 1),
        archived: prev.archived + 1,
      }));
      closeModal();
      setSuccess({ type: 'archive', title: 'Job Archived Successfully', message: 'The job has been moved to archived jobs.' });
    } catch (err) {
      console.error('Error archiving job:', err);
      setError('Failed to archive job');
    } finally {
      setAction({ type: '', jobId: '' });
    }
  };

  const jobOptions = useMemo(() => {
    const map = new Map();

    jobs.forEach((job) => {
      const id = job?._id;
      if (!id) return;

      if (!map.has(id)) {
        map.set(id, {
          id,
          title: safeTitle(job),
        });
      }
    });

    return Array.from(map.values());
  }, [jobs]);

  const headerRight = useMemo(() => {
    return (
      <div className="inline-flex items-center rounded-2xl border border-gray-200 bg-white p-1 shadow-sm">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl bg-[#f5f7fb] px-4 py-2 text-sm font-semibold text-[#2e66a6]"
          aria-current="page"
        >
          <span>Active</span>
          <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-[#2e66a6]">
            {counts.active}
          </span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/employer/manage-jobs/archived')}
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 hover:text-gray-900"
        >
          <span>Archived</span>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">
            {counts.archived}
          </span>
        </button>
      </div>
    );
  }, [counts.active, counts.archived, navigate]);

  const filteredJobs = useMemo(() => {
    const norm = (s) => String(s || '').toLowerCase().trim();
    const query = norm(q);

    let list = [...jobs];

    if (jobFilter !== 'all') {
      list = list.filter((j) => j._id === jobFilter);
    }

    if (statusFilter !== 'all') {
      list = list.filter((j) => getDerivedStatus(j) === statusFilter);
    }

    if (query) {
      list = list.filter((j) => {
        const hay = [
          j.title,
          j.companyName,
          j.location,
          j.category,
          j.jobType,
          j.workMode,
          String(getApplicantValue(j)),
          getStatusText(j),
          formatDate(j.createdAt),
          formatDate(j.applicationDeadline),
        ]
          .map(norm)
          .join(' ');

        return hay.includes(query);
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
    const thirtyDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const startOfNextYear = new Date(now.getFullYear() + 1, 0, 1);

    const startOfLastYear = new Date(now.getFullYear() - 1, 0, 1);
    const startOfCurrentYear = new Date(now.getFullYear(), 0, 1);

    if (dateFilter === 'today') {
      list = list.filter((job) => {
        const date = getComparableDate(job);
        return date >= startOfToday && date < startOfTomorrow;
      });
    } else if (dateFilter === 'yesterday') {
      list = list.filter((job) => {
        const date = getComparableDate(job);
        return date >= startOfYesterday && date < startOfToday;
      });
    } else if (dateFilter === 'this_week') {
      list = list.filter((job) => {
        const date = getComparableDate(job);
        return date >= startOfWeek && date < startOfNextWeek;
      });
    } else if (dateFilter === 'last_7_days') {
      list = list.filter((job) => {
        const date = getComparableDate(job);
        return date >= sevenDaysAgo && date < startOfTomorrow;
      });
    } else if (dateFilter === 'this_month') {
      list = list.filter((job) => {
        const date = getComparableDate(job);
        return date >= startOfMonth && date < startOfNextMonth;
      });
    } else if (dateFilter === 'last_month') {
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      list = list.filter((job) => {
        const date = getComparableDate(job);
        return date >= startOfLastMonth && date < startOfCurrentMonth;
      });
    } else if (dateFilter === 'this_year') {
      list = list.filter((job) => {
        const date = getComparableDate(job);
        return date >= startOfYear && date < startOfNextYear;
      });
    } else if (dateFilter === 'last_year') {
      list = list.filter((job) => {
        const date = getComparableDate(job);
        return date >= startOfLastYear && date < startOfCurrentYear;
      });
    } else if (dateFilter === 'custom' && customDateFrom && customDateTo) {
      const customStart = new Date(`${customDateFrom}T00:00:00`);
      const customEndExclusive = new Date(`${customDateTo}T00:00:00`);
      customEndExclusive.setDate(customEndExclusive.getDate() + 1);
      list = list.filter((job) => {
        const date = getComparableDate(job);
        return date >= customStart && date < customEndExclusive;
      });
    }

    list.sort((a, b) => {
      const createdA = safeDate(a?.createdAt);
      const createdB = safeDate(b?.createdAt);
      const applicantsA = Number(getApplicantValue(a)) || 0;
      const applicantsB = Number(getApplicantValue(b)) || 0;
      const expiryA = safeDate(a?.applicationDeadline);
      const expiryB = safeDate(b?.applicationDeadline);

      if (sortBy === 'oldest_first') return createdA - createdB;
      if (sortBy === 'most_applicants') return applicantsB - applicantsA || createdB - createdA;
      if (sortBy === 'fewest_applicants') return applicantsA - applicantsB || createdB - createdA;
      if (sortBy === 'expiring_soon') return expiryA - expiryB || createdB - createdA;
      if (sortBy === 'latest_expiration') return expiryB - expiryA || createdB - createdA;

      return createdB - createdA;
    });

    return list;
  }, [jobs, jobFilter, statusFilter, dateFilter, customDateFrom, customDateTo, q, sortBy]);


  const totalItems = filteredJobs.length;
  const numericPageSize = pageSize === 'all' ? Math.max(totalItems, 1) : Number(pageSize);
  const totalPages = Math.max(1, Math.ceil(totalItems / numericPageSize));
  const paginatedJobs = useMemo(() => {
    if (pageSize === 'all') return filteredJobs;
    const start = (currentPage - 1) * numericPageSize;
    return filteredJobs.slice(start, start + numericPageSize);
  }, [filteredJobs, currentPage, numericPageSize, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const hasActiveFilters = useMemo(() => {
    return (
      q.trim() !== '' ||
      jobFilter !== 'all' ||
      statusFilter !== 'all' ||
      dateFilter !== 'all' ||
      sortBy !== ''
    );
  }, [q, jobFilter, statusFilter, dateFilter, sortBy]);

  const clearControls = () => {
    setJobFilter('all');
    setStatusFilter('all');
    setDateFilter('all');
    setCustomDateFrom('');
    setCustomDateTo('');
    setQ('');
    setSortBy('');
  };

  useEffect(() => {
    if (!showDeleteModal) return;

    const t = setTimeout(() => cancelBtnRef.current?.focus(), 0);

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeModal();
        return;
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusables = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusables.length) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [showDeleteModal]);

  return (
    <EmployerLayout>
      <div className="mx-auto max-w-7xl px-1 py-8">
        <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(240px,auto)_minmax(320px,1fr)_auto] xl:items-start">
          <div>
            <h1 className="text-[33px] font-semibold leading-[40px] text-gray-900">Manage Jobs</h1>
            <p className="mt-1 text-sm text-gray-600">View, edit, and manage your job postings</p>

            {!isEmployerVerified && (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-900">Verification required to publish</p>
                <p className="mt-1 text-sm text-amber-800">
                  Status: <span className="font-semibold">{employerVerificationStatus}</span>. {verificationBannerMessage}
                </p>
              </div>
            )}
          </div>

          <div className="min-w-0 xl:pt-1 [&>div]:mb-0">
            {error && (
              <Alert type="error" onClose={() => setError('')}>
                {error}
              </Alert>
            )}
          </div>

          <div className="xl:pt-1">{headerRight}</div>
        </div>


        <div className="relative z-20 mb-6 overflow-visible rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="p-5">
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(300px,380px)_minmax(0,1fr)] xl:items-start">
              <div className="relative min-w-0">
                <svg
                  className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
                </svg>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search job title, company, location, status…"
                  className="w-full rounded-xl border border-gray-300 py-2.5 pl-11 pr-10 text-gray-900 placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2"
                />
              </div>

              <div
                className={cn(
                  'grid grid-cols-1 gap-2 sm:grid-cols-2',
                  hasActiveFilters
                    ? 'lg:grid-cols-5 xl:grid-cols-[minmax(130px,1fr)_minmax(105px,0.72fr)_minmax(115px,0.76fr)_minmax(145px,0.9fr)_minmax(100px,0.62fr)]'
                    : 'lg:grid-cols-4 xl:grid-cols-[minmax(140px,1fr)_minmax(120px,0.75fr)_minmax(130px,0.8fr)_minmax(170px,1fr)]'
                )}
              >
                <select
                  value={jobFilter}
                  onChange={(e) => setJobFilter(e.target.value)}
                  className="h-11 w-full rounded-xl border border-gray-300 bg-white px-4 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2"
                >
                  <option value="all">All Job Title</option>
                  {jobOptions.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.title}
                    </option>
                  ))}
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-11 w-full rounded-xl border border-gray-300 bg-white px-4 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2"
                >
                  <option value="all">All Status</option>
                  <option value="open">Open</option>
                  <option value="closed">Closed</option>
                  <option value="expired">Expired</option>
                  <option value="draft">Draft</option>
                </select>

                <EmployerDateFilterDropdown
                  value={dateFilter}
                  startDate={customDateFrom}
                  endDate={customDateTo}
                  onSelect={(value) => {
                    if (value === 'custom') {
                      setShowCustomDateModal(true);
                      return;
                    }
                    setDateFilter(value);
                    setCustomDateFrom('');
                    setCustomDateTo('');
                    setCurrentPage(1);
                  }}
                />

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="h-11 w-full rounded-xl border border-gray-300 bg-white px-4 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2"
                >
                  <option value="" disabled>Sort By</option>
                  <option value="most_recent">Newest First</option>
                  <option value="oldest_first">Oldest First</option>
                  <option value="most_applicants">Most Applicants</option>
                  <option value="fewest_applicants">Fewest Applicants</option>
                  <option value="expiring_soon">Expiring Soon</option>
                  <option value="latest_expiration">Latest Expiration</option>
                </select>

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearControls}
                    className="h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-900 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <p className="mt-3 text-xs text-gray-500">
              Showing <span className="font-semibold text-gray-700">{filteredJobs.length}</span> result(s).
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="p-6">
            {loading ? (
              <div className="py-14 text-center">
                <div className="inline-block h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-[#2e66a6]" />
                <p className="mt-4 text-sm text-gray-600">Loading jobs...</p>
              </div>
            ) : filteredJobs.length === 0 ? (
              <div className="py-14 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">No matching jobs</h3>
                <p className="mt-2 text-sm text-gray-600">Try adjusting your search or filters.</p>
                <div className="mt-6 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={clearControls}
                    className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Clear filters
                  </button>
                  <button
                    onClick={() => navigate('/employer/post-job')}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#2e66a6] px-5 py-3 text-sm font-semibold text-white hover:bg-[#25558a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Post New Job
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-4 md:hidden">
                  {paginatedJobs.map((job) => {
                    const title = safeTitle(job);
                    const busyThisRow = action.jobId === job._id;
                    const logoUrl = job.companyLogo && String(job.companyLogo).trim() ? job.companyLogo : '';
                    const derivedStatus = getDerivedStatus(job);

                    return (
                      <div
                        key={job._id}
                        className={cn(
                          'rounded-2xl border bg-white p-4 shadow-sm transition',
                          String(job._id) === recentlySavedDraftId
                            ? 'border-amber-300 bg-amber-50/40 ring-2 ring-amber-200'
                            : 'border-gray-200'
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-gray-100">
                            {logoUrl && !badLogos[job._id] ? (
                              <img
                                src={logoUrl}
                                alt={`${safeCompany(job)} logo`}
                                className="h-full w-full object-cover"
                                onError={() => setBadLogos((prev) => ({ ...prev, [job._id]: true }))}
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-gray-100">
                                <span className="text-sm font-bold text-gray-700">
                                  {(safeCompany(job) || title || 'J').charAt(0)}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <button
                              type="button"
                              onClick={() => handleEditAction(job)}
                              className="block w-full truncate text-left text-sm font-semibold text-gray-900 hover:text-[#2e66a6]"
                              title={title}
                            >
                              {title}
                            </button>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <span className={cn('inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold', getStatusPill(job))}>
                                {getStatusText(job)}
                              </span>
                              {(() => {
                                const badge = getEditRequestBadge(job._id);
                                return badge ? (
                                  <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold', badge.className)}>
                                    <Icon name={badge.icon} className="h-3 w-3" />
                                    {badge.label}
                                  </span>
                                ) : null;
                              })()}
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                          <div className="rounded-xl bg-gray-50 p-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Date Posted</p>
                            <p className="mt-1 font-medium text-gray-800">{formatDate(job.createdAt)}</p>
                          </div>
                          <div className="rounded-xl bg-gray-50 p-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Valid Until</p>
                            <p className="mt-1 font-medium text-gray-800">{formatDate(job.applicationDeadline)}</p>
                          </div>
                          <div className="rounded-xl bg-gray-50 p-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Vacancy</p>
                            <p className="mt-1 font-medium text-gray-800">{job.vacancies ?? '—'}</p>
                          </div>
                          <div className="rounded-xl bg-gray-50 p-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Applicant</p>
                            <p className="mt-1 font-medium text-gray-800">{getApplicantValue(job)}</p>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-2">
                          <Link
                            to={`/employer/manage-jobs/${job._id}/view`}
                            state={{
                              from: 'manageJobs',
                              backPath: '/employer/manage-jobs',
                              backLabel: 'Manage Jobs',
                            }}
                            className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-900 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2"
                            aria-label={`View ${title}`}
                            title="View"
                          >
                            <Icon name="eye" className="h-4 w-4" />
                          </Link>

                          <button
                            type="button"
                            onClick={() => handleEditAction(job)}
                            className={cn(
                              'inline-flex h-10 items-center justify-center rounded-lg border px-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                              'border-gray-200 bg-white text-gray-900 hover:bg-gray-50 focus-visible:ring-[#2e66a6]'
                            )}
                            aria-label={`${isJobEditLocked(job) ? 'Request edit access for' : 'Edit'} ${title}`}
                            title={isJobEditLocked(job) ? 'Editing locked — request access' : 'Edit'}
                          >
                            <Icon name="edit" className="h-4 w-4" />
                          </button>

                          {['open', 'closed', 'expired'].includes(derivedStatus) && (
                            <button
                              type="button"
                              onClick={() => setStatusConfirmationJob(job)}
                              disabled={busyThisRow}
                              className={cn(
                                'inline-flex h-10 w-[42px] items-center justify-center rounded-lg border px-0 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
                                'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 focus-visible:ring-amber-500'
                              )}
                              aria-label={`${derivedStatus === 'open' ? 'Close Job' : 'Open Job'} ${title}`}
                              title={derivedStatus === 'open' ? 'Close Job' : 'Open Job'}
                            >
                              {busyThisRow && ['open', 'close'].includes(action.type) ? (
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-[#2e66a6]" />
                              ) : derivedStatus === 'open' ? (
                                  <span
                                    className="h-7 w-7 bg-current"
                                    style={{
                                      WebkitMaskImage: "url('/images/lockerist.png')",
                                      maskImage: "url('/images/lockerist.png')",
                                      WebkitMaskPosition: 'center',
                                      maskPosition: 'center',
                                      WebkitMaskRepeat: 'no-repeat',
                                      maskRepeat: 'no-repeat',
                                      WebkitMaskSize: 'contain',
                                      maskSize: 'contain',
                                    }}
                                    aria-hidden="true"
                                  />
                                ) : (
                                  <Icon name="closeJob" className="h-3 w-3" />
                              )}
                            </button>
                          )}

                          {derivedStatus === 'draft' && (
                            <button
                              onClick={() => handlePublish(job._id)}
                              disabled={busyThisRow || !isEmployerVerified}
                              title={!isEmployerVerified ? 'Verify your company to publish jobs.' : 'Publish'}
                              className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-900 transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              aria-label={`Publish ${title}`}
                            >
                              {busyThisRow && action.type === 'publish' ? (
                                <span className="inline-block h-4 w-4 animate-spin rounded-full border-b-2 border-t-2 border-current" />
                              ) : (
                                <Icon name="check" className="h-4 w-4" />
                              )}
                            </button>
                          )}

                          <button
                            onClick={() => {
                              setSelectedJob(job);
                              setShowDeleteModal(true);
                            }}
                            disabled={busyThisRow}
                            className="inline-flex h-10 items-center justify-center rounded-lg border border-red-200 bg-red-50 px-3 text-sm font-semibold text-red-700 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            aria-label={`Archive ${title}`}
                            title="Archive"
                          >
                            <Icon name="trash" className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="hidden overflow-x-auto md:block">
                <div className="">
                  <table className="min-w-full divide-y divide-gray-200">
                    <colgroup>
                      <col className="w-[12%]" />
                      <col className="w-[22%]" />
                      <col className="w-[8%]" />
                      <col className="w-[9%]" />
                      <col className="w-[11%]" />
                      <col className="w-[14%]" />
                      <col className="w-[24%]" />
                    </colgroup>

                    <thead className="bg-gray-50">
                      <tr >
                        <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                          Date Posted
                        </th>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                          Job Title
                        </th>
                        <th scope="col" className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-gray-600">
                          Vacancy
                        </th>
                        <th scope="col" className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-gray-600">
                          Applicant
                        </th>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                          Status
                        </th>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                          Valid Until
                        </th>
                        <th scope="col" className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-gray-600">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-200 bg-white">
                      {paginatedJobs.map((job) => {
                        const title = safeTitle(job);
                        const busyThisRow = action.jobId === job._id;
                        const logoUrl = job.companyLogo && String(job.companyLogo).trim() ? job.companyLogo : '';
                        const derivedStatus = getDerivedStatus(job);

                        return (
                          <tr
                            key={job._id}
                            role="link"
                            className={cn(
                              'group cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2e66a6]',
                              String(job._id) === recentlySavedDraftId
                                ? 'bg-amber-50 ring-2 ring-inset ring-amber-200'
                                : 'hover:bg-[#2e66a6]/[0.06] focus-visible:bg-[#2e66a6]/[0.08]'
                            )}
                            tabIndex={0}
                            aria-label={`View ${title}`}
                            onClick={(event) => {
                              if (event.target.closest?.('a, button, input, select, textarea')) return;

                              navigate(`/employer/manage-jobs/${job._id}/view`, {
                                state: {
                                  from: 'manageJobs',
                                  backPath: '/employer/manage-jobs',
                                  backLabel: 'Manage Jobs',
                                },
                              });
                            }}
                            onKeyDown={(event) => {
                              if (event.target !== event.currentTarget) return;
                              if (event.key !== 'Enter' && event.key !== ' ') return;

                              event.preventDefault();
                              navigate(`/employer/manage-jobs/${job._id}/view`, {
                                state: {
                                  from: 'manageJobs',
                                  backPath: '/employer/manage-jobs',
                                  backLabel: 'Manage Jobs',
                                },
                              });
                            }}
                          >
                            <td className="px-6 py-4 align-middle text-sm font-medium text-gray-700">
                              {formatDate(job.createdAt)}
                            </td>

                            <td className="px-6 py-4 align-middle">
                              <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-gray-100">
                                  {logoUrl && !badLogos[job._id] ? (
                                    <img
                                      src={logoUrl}
                                      alt={`${safeCompany(job)} logo`}
                                      className="h-full w-full object-cover"
                                      onError={() => setBadLogos((prev) => ({ ...prev, [job._id]: true }))}
                                    />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center bg-gray-100">
                                      <span className="text-sm font-bold text-gray-700">
                                        {(safeCompany(job) || title || 'J').charAt(0)}
                                      </span>
                                    </div>
                                  )}
                                </div>

                                <div className="min-w-0">
                                  <div
                                    className="block truncate text-sm font-semibold text-gray-900 transition-colors group-hover:text-[#2e66a6]"
                                    title={title}
                                  >
                                    {title}
                                  </div>
                                  {(() => {
                                    const badge = getEditRequestBadge(job._id);
                                    return badge ? (
                                      <span className={cn('mt-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold', badge.className)}>
                                        <Icon name={badge.icon} className="h-3 w-3" />
                                        {badge.label}
                                      </span>
                                    ) : null;
                                  })()}
                                </div>
                              </div>
                            </td>

                            <td className="px-6 py-4 text-center align-middle text-sm font-medium text-gray-800">
                              {job.vacancies ?? '—'}
                            </td>

                            <td className="px-6 py-4 text-center align-middle text-sm font-medium text-gray-800">
                              {getApplicantValue(job)}
                            </td>

                            <td className="px-6 py-4 align-middle">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={cn('inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold', getStatusPill(job))}>
                                  {getStatusText(job)}
                                </span>

                              </div>
                            </td>

                            <td className="px-6 py-4 align-middle text-sm font-medium text-gray-600">
                              {formatDate(job.applicationDeadline)}
                            </td>

                            <td className="px-6 py-4 text-center align-middle">
                              <div className="flex flex-nowrap items-center justify-center gap-2">
                                <Link
                                  to={`/employer/manage-jobs/${job._id}/view`}
                                  state={{
                                    from: 'manageJobs',
                                    backPath: '/employer/manage-jobs',
                                    backLabel: 'Manage Jobs',
                                  }}
                                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2"
                                  aria-label={`View ${title}`}
                                  title="View"
                                >
                                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M1.5 12s3.5-7 10.5-7 10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12z"
                                    />
                                    <circle cx="12" cy="12" r="3" strokeWidth={2} />
                                  </svg>
                                  <span className="sr-only">View</span>
                                </Link>

                                <button
                                  type="button"
                                  onClick={() => handleEditAction(job)}
                                  className={cn(
                                    'inline-flex h-10 shrink-0 items-center justify-center rounded-lg border px-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                                    'border-gray-200 bg-white text-gray-900 hover:bg-gray-50 focus-visible:ring-[#2e66a6]'
                                  )}
                                  aria-label={`${isJobEditLocked(job) ? 'Request edit access for' : 'Edit'} ${title}`}
                                  title={isJobEditLocked(job) ? 'Editing locked — request access' : 'Edit'}
                                >
                                  <Icon name="edit" className="h-4 w-4" />
                                </button>

                                {['open', 'closed', 'expired'].includes(derivedStatus) && (
                                  <button
                                    type="button"
                                    onClick={() => setStatusConfirmationJob(job)}
                                    disabled={busyThisRow}
                                    className={cn(
                                      'inline-flex h-10 w-[42px] shrink-0 items-center justify-center rounded-lg border px-0 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
                                      'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 focus-visible:ring-amber-500'
                                    )}
                                    aria-label={`${derivedStatus === 'open' ? 'Close Job' : 'Open Job'} ${title}`}
                                    title={derivedStatus === 'open' ? 'Close Job' : 'Open Job'}
                                  >
                                    {busyThisRow && ['open', 'close'].includes(action.type) ? (
                                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-[#2e66a6]" />
                                    ) : derivedStatus === 'open' ? (
                                        <span
                                          className="h-7 w-7 bg-current"
                                          style={{
                                            WebkitMaskImage: "url('/images/lockerist.png')",
                                            maskImage: "url('/images/lockerist.png')",
                                            WebkitMaskPosition: 'center',
                                            maskPosition: 'center',
                                            WebkitMaskRepeat: 'no-repeat',
                                            maskRepeat: 'no-repeat',
                                            WebkitMaskSize: 'contain',
                                            maskSize: 'contain',
                                          }}
                                          aria-hidden="true"
                                        />
                                      ) : (
                                        <Icon name="closeJob" className="h-3 w-3" />
                                    )}
                                  </button>
                                )}

                                {derivedStatus === 'draft' && (
                                  <button
                                    onClick={() => handlePublish(job._id)}
                                    disabled={busyThisRow || !isEmployerVerified}
                                    title={!isEmployerVerified ? 'Verify your company to publish jobs.' : 'Publish'}
                                    className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-900 transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    aria-label={`Publish ${title}`}
                                  >
                                    {busyThisRow && action.type === 'publish' ? (
                                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-b-2 border-t-2 border-current" />
                                    ) : (
                                      <Icon name="check" className="h-4 w-4" />
                                    )}
                                  </button>
                                )}

                                <button
                                  onClick={() => {
                                    setSelectedJob(job);
                                    setShowDeleteModal(true);
                                  }}
                                  disabled={busyThisRow}
                                  className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg border border-red-200 bg-red-50 px-3 text-sm font-semibold text-red-700 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                  aria-label={`Archive ${title}`}
                                  title="Archive"
                                >
                                  <Icon name="trash" className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <Pagination currentPage={currentPage} totalItems={totalItems} pageSize={pageSize} onPageChange={setCurrentPage} onPageSizeChange={setPageSize} ariaLabel="Manage jobs pagination" />

              </>
            )}
          </div>
        </div>

        {showLockedModal && lockedJob ? (
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setShowLockedModal(false);
            }}
          >
            <div className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl">
              <div className="relative px-8 pb-8 pt-7 text-center">
                <button
                  type="button"
                  onClick={() => setShowLockedModal(false)}
                  className="absolute right-5 top-5 rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                  aria-label="Close"
                >
                  <Icon name="x" className="h-5 w-5" />
                </button>

                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-amber-300 bg-amber-50 text-[#173f8a]">
                  <Icon name="lock" className="h-8 w-8" />
                </div>

                <h2 className="mt-4 text-2xl font-bold text-[#173f8a]">Editing Locked</h2>
                <p className="mx-auto mt-2 max-w-md text-base leading-6 text-gray-500">
                  This job post has been published for more than 1 hour and can no longer be edited.
                </p>

                <div className="mt-6 rounded-2xl border border-gray-200 border-l-4 border-l-amber-400 bg-slate-50 px-5 py-4 text-left">
                  <p className="font-bold text-[#173f8a]">{safeTitle(lockedJob)}</p>
                  <p className="mt-1 text-sm text-gray-500">{safeCompany(lockedJob)}</p>
                  <p className="mt-3 text-sm text-gray-500">
                    Posted {formatDate(getPublishedDate(lockedJob))} · Valid until {formatDate(lockedJob.applicationDeadline)}
                  </p>
                </div>

                <p className="mt-6 text-sm text-gray-500">
                  Need to make changes? Submit an edit request to the administrator.
                </p>

                <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
                  <button
                    type="button"
                    onClick={() => setShowLockedModal(false)}
                    className="min-w-[150px] rounded-xl border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const pending = getLatestEditRequest(lockedJob._id)?.status === 'pending';
                      if (pending) {
                        setError('An edit request for this job is already pending.');
                        return;
                      }
                      setShowLockedModal(false);
                      setShowRequestModal(true);
                    }}
                    className="inline-flex min-w-[170px] items-center justify-center gap-2 rounded-xl bg-[#173f8a] px-5 py-3 text-sm font-bold text-white hover:bg-[#12336f]"
                  >
                    <Icon name="send" className="h-4 w-4" />
                    Request Edit
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {showRequestModal && lockedJob ? (
          <div
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !requestSubmitting) {
                setShowRequestModal(false);
              }
            }}
          >
            <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
              <div className="border-b border-gray-200 px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                      <Icon name="shield" className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-[#173f8a]">Submit edit request</h2>
                      <p className="mt-1 text-sm leading-6 text-gray-500">
                        The administrator will review your request and temporarily unlock “{safeTitle(lockedJob)}” if approved.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowRequestModal(false)}
                    disabled={requestSubmitting}
                    className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                    aria-label="Close"
                  >
                    <Icon name="x" className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="space-y-4 px-5 py-4">
                <div>
                  <p className="mb-3 text-base font-bold text-[#173f8a]">What needs to change?</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      'Job Details',
                      'Requirements & Qualifications',
                      'Skills & Benefits',
                      'Work Locations',
                      'Salary',
                      'Deadline',
                    ].map((section) => (
                      <label
                        key={section}
                        className={cn(
                          'flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition',
                          requestSections.includes(section)
                            ? 'border-[#2e66a6] bg-blue-50 text-[#173f8a]'
                            : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={requestSections.includes(section)}
                          onChange={() => toggleRequestSection(section)}
                          className="h-5 w-5 accent-[#2e66a6]"
                        />
                        {section}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="edit-request-reason" className="block text-base font-bold text-[#173f8a]">
                    Reason for the request <span className="font-normal text-gray-400">(optional)</span>
                  </label>
                  <textarea
                    id="edit-request-reason"
                    value={requestReason}
                    onChange={(event) => setRequestReason(event.target.value)}
                    rows={4}
                    maxLength={1000}
                    placeholder="Explain why this post needs to be edited..."
                    className="mt-2 w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/20"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-gray-200 px-5 py-4">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  disabled={requestSubmitting}
                  className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitEditRequest}
                  disabled={requestSubmitting || !requestSections.length}
                  className="inline-flex min-w-[165px] items-center justify-center gap-2 rounded-xl bg-[#173f8a] px-5 py-3 text-sm font-bold text-white hover:bg-[#12336f] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {requestSubmitting ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  ) : (
                    <Icon name="send" className="h-4 w-4" />
                  )}
                  Send request
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {statusConfirmationJob && (() => {
          const status = getDerivedStatus(statusConfirmationJob);
          const isReopening = status !== 'open';
          const isExpiredJob = status === 'expired';
          const busy =
            action.jobId === statusConfirmationJob._id &&
            ['open', 'close'].includes(action.type);

          return (
            <div
              className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/50 p-4"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget && !busy) {
                  setStatusConfirmationJob(null);
                }
              }}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="status-confirmation-title"
                aria-describedby="status-confirmation-description"
                className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
              >
                <div className="p-6">
                  <div className="flex items-start gap-4">
                    <div
                      className={cn(
                        'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl',
                        isReopening
                          ? 'bg-blue-100 text-[#2e66a6]'
                          : 'bg-amber-100 text-amber-700'
                      )}
                    >
                      {isReopening ? (
                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12a8 8 0 0114.93-4M20 4v5h-5M20 12a8 8 0 01-14.93 4M4 20v-5h5" />
                        </svg>
                      ) : (
                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6M5 12a7 7 0 1014 0 7 7 0 00-14 0z" />
                        </svg>
                      )}
                    </div>

                    <div className="min-w-0">
                      <h2 id="status-confirmation-title" className="text-xl font-bold text-gray-900">
                        {isExpiredJob ? 'Application Deadline Expired' : isReopening ? 'Open Job' : 'Close Job'}
                      </h2>
                      <p className="mt-1 truncate text-sm font-semibold text-gray-600">
                        {safeTitle(statusConfirmationJob)}
                      </p>
                    </div>
                  </div>

                  <div
                    id="status-confirmation-description"
                    className={cn(
                      'mt-5 rounded-xl border p-4',
                      isReopening
                        ? 'border-blue-200 bg-blue-50'
                        : 'border-amber-200 bg-amber-50'
                    )}
                  >
                    <p className={cn(
                      'text-sm font-semibold',
                      isReopening ? 'text-blue-900' : 'text-amber-900'
                    )}>
                      {isExpiredJob
                        ? 'This job cannot be reopened because its application deadline has expired.'
                        : isReopening
                        ? 'Are you sure you want to reopen this job post?'
                        : 'Are you sure you want to close this job post?'}
                    </p>
                    <p className={cn(
                      'mt-2 text-sm leading-6',
                      isReopening ? 'text-blue-800' : 'text-amber-800'
                    )}>
                      {isExpiredJob
                        ? 'Please use the existing edit process and update the Application Deadline first. After the new deadline is approved and saved, you can return here and reopen the job.'
                        : isReopening
                        ? 'It will start accepting new applications again.'
                        : 'It will no longer be visible to job seekers or accept new applications.'}
                    </p>
                  </div>

                  <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={() => setStatusConfirmationJob(null)}
                      disabled={busy}
                      className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-800 transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (isExpiredJob) {
                          const jobToEdit = statusConfirmationJob;
                          setStatusConfirmationJob(null);
                          handleEditAction(jobToEdit);
                          return;
                        }
                        handleToggleJobStatus(statusConfirmationJob);
                      }}
                      disabled={busy}
                      className={cn(
                        'inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60',
                        isReopening
                          ? 'bg-[#2e66a6] hover:bg-[#255487] focus-visible:ring-[#2e66a6]'
                          : 'bg-amber-600 hover:bg-amber-700 focus-visible:ring-amber-600'
                      )}
                    >
                      {busy && (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      )}
                      {isExpiredJob ? 'Go to Edit Job' : isReopening ? 'Open Job' : 'Close Job'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {showDeleteModal && selectedJob && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) closeModal();
            }}
          >
            <div
              ref={modalRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-title"
              aria-describedby="delete-desc"
              className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl"
            >
              <div className="p-6">
                <div className="mb-4 flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100">
                    <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>

                  <div className="min-w-0">
                    <h3 id="delete-title" className="text-lg font-semibold text-gray-900">
                      Archive Job Post
                    </h3>
                  </div>
                </div>

                <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4">
                  <p className="font-semibold text-red-900">
                    “{selectedJob.title || 'Untitled Draft'}”
                  </p>
                  <p id="delete-desc" className="mt-1 text-sm text-red-800">
                    {getArchiveConfirmationMessage(selectedJob)}
                  </p>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    ref={cancelBtnRef}
                    onClick={closeModal}
                    disabled={action.type === 'delete' && action.jobId === selectedJob._id}
                    className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={() => handleDelete(selectedJob._id)}
                    disabled={action.type === 'delete' && action.jobId === selectedJob._id}
                    className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:opacity-50"
                  >
                    {action.type === 'delete' && action.jobId === selectedJob._id ? (
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-b-2 border-t-2 border-white" />
                    ) : (
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                    Archive Job
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>


        {success && (
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30 px-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="job-success-title"
          >
            <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white text-center shadow-2xl">
              <div className="px-8 pb-6 pt-8">
                <div
                  className={cn(
                    'mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full text-white',
                    'bg-[#2e66a6]'
                  )}
                >
                  <svg className="h-10 w-10" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-7.25 7.25a1 1 0 01-1.414 0l-3.25-3.25a1 1 0 111.414-1.414L8.75 11.836l6.543-6.543a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>

                <h2 id="job-success-title" className="text-xl font-bold text-gray-900">
                  {success.title}
                </h2>
                <p className="mt-2 text-sm text-gray-600">
                  {success.message}
                </p>
              </div>

              <div className="border-t border-gray-200 px-8 py-4">
                <button
                  type="button"
                  onClick={() => setSuccess(null)}
                  className="w-full rounded-xl bg-[#2e66a6] px-5 py-3 text-sm font-semibold text-white hover:bg-[#23508a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}

      <EmployerCustomDateRangeModal
        open={showCustomDateModal}
        startDate={customDateFrom}
        endDate={customDateTo}
        onCancel={() => setShowCustomDateModal(false)}
        onApply={(dateFrom, dateTo) => {
          setDateFilter('custom');
          setCustomDateFrom(dateFrom);
          setCustomDateTo(dateTo);
          setShowCustomDateModal(false);
          setCurrentPage(1);
        }}
      />
    </EmployerLayout>
  );
};

export default ManageJobs;
