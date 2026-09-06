// src/pages/employer/dashboard/HiredApplicants.jsx
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
    case 'x':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      );
    case 'trash':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.9 12.1A2 2 0 0116.1 21H7.9a2 2 0 01-2-1.9L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3M4 7h16" />
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
        className="flex h-[54px] w-full items-center justify-between rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-900 transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2 disabled:bg-gray-50 disabled:opacity-60"
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


const formatDate = (dateValue) => {
  if (!dateValue) return '—';
  const d = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
};

const formatSalary = (min, max) => {
  const hasMin = Number.isFinite(Number(min));
  const hasMax = Number.isFinite(Number(max));

  if (!hasMin && !hasMax) return '—';

  const peso = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  });

  if (hasMin && hasMax) return `${peso.format(Number(min))} - ${peso.format(Number(max))}`;
  if (hasMin) return `${peso.format(Number(min))}+`;
  return `Up to ${peso.format(Number(max))}`;
};

const useDebouncedValue = (value, delay = 250) => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);

  return debounced;
};

const HiredApplicants = () => {
  const navigate = useNavigate();
  const API_BASE = (process.env.REACT_APP_API_URL || 'https://phinmaau-job-portal-atlas.onrender.com/api').replace(/\/api\/?$/, '');

  const [applications, setApplications] = useState([]);
  const [statusFilter] = useState('hired');
  const [archivedDeclinedCount, setArchivedDeclinedCount] = useState(0);
  const [archivingId, setArchivingId] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [error, setError] = useState('');

  const [query, setQuery] = useState('');
  const [selectedJob, setSelectedJob] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [showCustomDateModal, setShowCustomDateModal] = useState(false);
  const [sortBy, setSortBy] = useState('recent');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [brokenAvatars, setBrokenAvatars] = useState(() => new Set());

  const debouncedQuery = useDebouncedValue(query, 250);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
  };

  const handleAuthError = useCallback(() => {
    localStorage.removeItem('token');
    navigate('/employer/login');
  }, [navigate]);

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

  const getApplicantContact = useCallback((jobseeker) =>
    String(
      jobseeker?.phoneNumber ||
        jobseeker?.contactNumber ||
        jobseeker?.jobSeekerProfile?.phoneNumber ||
        jobseeker?.jobSeekerProfile?.mobileNumber ||
        ''
    ).trim() || '—', []);

  const getDeclineStageLabel = useCallback((value) => {
    const normalized = String(value || '').replace(/([a-z])([A-Z])/g, '$1 $2').trim();
    if (normalized.toLowerCase() === 'applicants') return 'Screening';
    return normalized ? normalized.replace(/\b\w/g, (letter) => letter.toUpperCase()) : 'Declined';
  }, []);

  const Avatar = useCallback(
    ({ img, name, size = 48, altKey }) => {
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
            <img src="/images/profile.png" alt="Default profile" className="h-full w-full object-cover" />
          )}
        </div>
      );
    },
    [brokenAvatars, getImageUrl, markBroken]
  );

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
  }, [handleAuthError]);

  const fetchHiredApplicants = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const response = await axios.get(
        'https://phinmaau-job-portal-atlas.onrender.com/api/applications/employer/hired',
        { headers: getAuthHeaders() }
      );
      const combined = (response.data?.applications || []).map((application) => ({
          ...application,
          _recordStatus: 'hired',
        }));
      setApplications(combined);
    } catch (err) {
      console.error(err);
      if (err.response?.status === 401) return handleAuthError();
      setError('Failed to load hired applicants.');
      setApplications([]);
    } finally {
      setLoading(false);
    }
  }, [handleAuthError, selectedJob]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  useEffect(() => {
    fetchHiredApplicants();
  }, [fetchHiredApplicants]);

  const filteredApplications = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();

    const jobFiltered = !q && selectedJob !== 'all'
      ? applications.filter((a) => a.job?._id === selectedJob)
      : applications;

    const searched = !q
      ? jobFiltered
      : jobFiltered.filter((a) => {
          const name = buildApplicantName(a.jobseeker).toLowerCase();
          const email = String(a.jobseeker?.email || '').toLowerCase();
          const jobTitle = String(a.job?.title || '').toLowerCase();
          return [name, email, jobTitle].some((v) => v.includes(q));
        });

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

    const filteredByDate = searched.filter((a) => {
      if (q || dateFilter === 'all') return true;

      const appliedDate = new Date(a.appliedAt || 0);
      if (Number.isNaN(appliedDate.getTime())) return false;

      if (dateFilter === 'today') {
        return appliedDate >= startOfToday && appliedDate < startOfTomorrow;
      }

      if (dateFilter === 'yesterday') {
        return appliedDate >= startOfYesterday && appliedDate < startOfToday;
      }

      if (dateFilter === 'this_week') {
        return appliedDate >= startOfWeek && appliedDate < startOfNextWeek;
      }

      if (dateFilter === 'last_7_days') {
        return appliedDate >= sevenDaysAgo && appliedDate < startOfTomorrow;
      }

      if (dateFilter === 'this_month') {
        return appliedDate >= startOfMonth && appliedDate < startOfNextMonth;
      }

      if (dateFilter === 'last_month') {
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return appliedDate >= startOfLastMonth && appliedDate < startOfCurrentMonth;
      }

      if (dateFilter === 'this_year') {
        return appliedDate >= startOfYear && appliedDate < startOfNextYear;
      }

      if (dateFilter === 'last_year') {
        const startOfLastYear = new Date(now.getFullYear() - 1, 0, 1);
        const startOfThisYear = new Date(now.getFullYear(), 0, 1);
        return appliedDate >= startOfLastYear && appliedDate < startOfThisYear;
      }

      if (dateFilter === 'custom' && customDateFrom && customDateTo) {
        const customStart = new Date(`${customDateFrom}T00:00:00`);
        const customEndExclusive = new Date(`${customDateTo}T00:00:00`);
        customEndExclusive.setDate(customEndExclusive.getDate() + 1);
        return appliedDate >= customStart && appliedDate < customEndExclusive;
      }

      return true;
    });

    const getAppliedTime = (app) => {
      const time = new Date(app?.appliedAt || 0).getTime();
      return Number.isNaN(time) ? 0 : time;
    };

    const getHiredTime = (app) => {
      const hiredActivityTimes = (Array.isArray(app?.activityHistory) ? app.activityHistory : [])
        .filter((activity) => String(activity?.type || '').toLowerCase() === 'hired')
        .map((activity) => new Date(activity?.occurredAt || 0).getTime())
        .filter((time) => Number.isFinite(time));

      const candidates = [
        ...hiredActivityTimes,
        new Date(app?.hiredAt || 0).getTime(),
        new Date(app?.reviewedAt || 0).getTime(),
        new Date(app?.updatedAt || 0).getTime(),
        getAppliedTime(app),
      ].filter((time) => Number.isFinite(time));

      return candidates.length ? Math.max(...candidates) : 0;
    };

    const getDeclinedTime = (app) => {
      const candidates = [app?.reviewedAt, app?.updatedAt, app?.appliedAt]
        .map((value) => new Date(value || 0).getTime())
        .filter(Number.isFinite);
      return candidates.length ? Math.max(...candidates) : 0;
    };

    const sorted = [...filteredByDate].sort((a, b) => {
      if (sortBy === 'oldest_first') return getAppliedTime(a) - getAppliedTime(b);
      if (sortBy === 'recently_hired') return getHiredTime(b) - getHiredTime(a);
      if (sortBy === 'least_recently_hired') return getHiredTime(a) - getHiredTime(b);
      if (sortBy === 'recently_declined') return getDeclinedTime(b) - getDeclinedTime(a);
      if (sortBy === 'least_recently_declined') return getDeclinedTime(a) - getDeclinedTime(b);

      return getAppliedTime(b) - getAppliedTime(a);
    });

    return sorted;
  }, [applications, buildApplicantName, dateFilter, customDateFrom, customDateTo, debouncedQuery, selectedJob, sortBy]);


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

  const clearFilters = () => {
    setQuery('');
    setSelectedJob('all');
    setDateFilter('all');
    setCustomDateFrom('');
    setCustomDateTo('');
    setSortBy('recent');
  };

  const jobOptions = useMemo(() => {
    return [
      { value: 'all', label: 'All Job Title' },
      ...jobs.map((j) => ({
        value: j._id,
        label: j.title || '(Untitled)',
      })),
    ];
  }, [jobs]);


  const sortOptions = [
    { value: 'recent', label: 'Newest First' },
    { value: 'oldest_first', label: 'Oldest First' },
    { value: 'recently_hired', label: 'Recently Hired' },
    { value: 'least_recently_hired', label: 'Least Recently Hired' },
  ];

  const hasActiveFilters =
    query.trim() || selectedJob !== 'all' || dateFilter !== 'all' || sortBy !== 'recent';

  const handleArchiveDeclined = async (applicationId) => {
    if (archivingId) return;
    try {
      setArchivingId(applicationId);
      await axios.patch(
        `https://phinmaau-job-portal-atlas.onrender.com/api/applications/${applicationId}/archive-declined`,
        {},
        { headers: getAuthHeaders() }
      );
      setApplications((previous) => previous.filter((item) => item._id !== applicationId));
      setArchivedDeclinedCount((count) => count + 1);
    } catch (archiveError) {
      setError(archiveError?.response?.data?.message || 'Failed to archive declined applicant.');
    } finally {
      setArchivingId(null);
    }
  };

  const DropdownFilter = ({ id, label, value, onChange, options, disabled }) => {
    const isOpen = openDropdown === id;

    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpenDropdown(isOpen ? null : id)}
          className="inline-flex h-[54px] w-full min-w-[105px] items-center justify-between gap-2 whitespace-nowrap rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-900 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2 disabled:bg-gray-50 disabled:opacity-60"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <span>{label}</span>
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute right-0 z-[9999] mt-2 w-64 overflow-hidden rounded-xl border border-gray-200 bg-white py-2 shadow-xl">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpenDropdown(null);
                }}
                className={cn(
                  'block w-full px-4 py-2 text-left text-sm hover:bg-gray-100',
                  value === option.value ? 'font-semibold text-[#0b5bd3]' : 'font-medium text-gray-800'
                )}
                role="option"
                aria-selected={value === option.value}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const inputBase =
  'h-[54px] w-full rounded-xl border border-gray-300 pl-11 pr-10 text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2 disabled:bg-gray-50 disabled:opacity-60';

const selectBase =
  'h-[54px] w-full rounded-xl border border-gray-300 px-4 text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2 disabled:bg-gray-50 disabled:opacity-60';

  return (
    <EmployerLayout>
      <div className="mx-auto max-w-7xl px-1 py-8">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-[33px] leading-[40px] font-semibold text-gray-900">
              Hired Applicants
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Applicants successfully hired and officially joined company
            </p>
          </div>
          {statusFilter === 'declined' && (
            <button
              type="button"
              onClick={() => navigate('/employer/declined/archived')}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-800 hover:bg-gray-50"
            >
              Archived <span className="rounded-full bg-gray-100 px-2 py-0.5">{archivedDeclinedCount}</span>
            </button>
          )}
        </div>

        <CenteredIndicator type="error" message={error} onClose={() => setError('')} />

        {/* Filters */}
        <div className="relative z-20 mb-6 overflow-visible rounded-[22px] border border-gray-300 bg-[#ffffff] shadow-sm">
          <div className="overflow-visible p-5">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
              <div className={hasActiveFilters ? 'lg:col-span-3' : 'lg:col-span-4'}>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-3.5 text-gray-400">
                    <Icon name="search" className="h-5 w-5" />
                  </span>

                  <label className="sr-only" htmlFor="hiredSearch">
                    Search hired applicants
                  </label>
                  <input
                    id="hiredSearch"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className={inputBase}
                    placeholder="Search applicant, email, job title..."
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
                <label className="sr-only" htmlFor="jobFilter">
                  Filter by job
                </label>
                <select
                  id="jobFilter"
                  value={selectedJob}
                  onChange={(e) => setSelectedJob(e.target.value)}
                  className={selectBase}
                  disabled={jobsLoading}
                >
                  {jobOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="lg:col-span-2">
                <EmployerDateFilterDropdown
                  value={dateFilter}
                  startDate={customDateFrom}
                  endDate={customDateTo}
                  disabled={loading}
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
              </div>

              <div className="lg:col-span-3">
                <DropdownFilter
                  id="sortFilter"
                  label="Sort By"
                  value={sortBy}
                  onChange={setSortBy}
                  options={sortOptions}
                  disabled={loading}
                />
              </div>

              {hasActiveFilters && (
                <div className="lg:col-span-1">
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="inline-flex h-[54px] w-full items-center justify-center rounded-xl border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            <div className="mt-4 text-sm text-gray-600">
              Showing <span className="font-semibold text-gray-800">{filteredApplications.length}</span> result(s).
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-[22px] border border-gray-300 bg-white shadow-sm">
          {loading ? (
            <div className="py-14 text-center" role="status" aria-live="polite">
              <div className="mx-auto inline-block h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-[#2e66a6]" />
              <p className="mt-4 text-sm text-gray-600">Loading applicants…</p>
            </div>
          ) : filteredApplications.length === 0 ? (
            <div className="py-14 text-center">
              <h3 className="text-lg font-semibold text-gray-900">No hired applicants found</h3>
              <p className="mt-2 text-sm text-gray-600">Try changing filters or search.</p>
            </div>
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-full">
                  <thead className="border-b border-gray-200 bg-[#fafafa]">
                    <tr>
                      <th className="px-6 py-5 text-left text-sm font-semibold uppercase tracking-wide text-gray-700">
                        Applied Date
                      </th>
                      <th className="px-6 py-5 text-left text-sm font-semibold uppercase tracking-wide text-gray-700">
                        Applicant
                      </th>
                      <th className="px-6 py-5 text-left text-sm font-semibold uppercase tracking-wide text-gray-700">
                        Contact Number
                      </th>
                      <th className="px-6 py-5 text-left text-sm font-semibold uppercase tracking-wide text-gray-700">
                        Job Applied
                      </th>
                      {statusFilter === 'all' && (
                        <th className="px-6 py-5 text-left text-sm font-semibold uppercase tracking-wide text-gray-700">Status</th>
                      )}
                      {statusFilter === 'declined' && (
                        <th className="px-6 py-5 text-left text-sm font-semibold uppercase tracking-wide text-gray-700">Decline Stage</th>
                      )}
                      <th className="px-6 py-5 text-center text-sm font-semibold uppercase tracking-wide text-gray-700">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {paginatedApplications.map((app) => {
                      const name = buildApplicantName(app.jobseeker);
                      const email = app.jobseeker?.email || '—';
                      const contactNumber = getApplicantContact(app.jobseeker);
                      const jobTitle = app.job?.title || '—';

                      return (
                        <tr
                          key={app._id}
                          role="link"
                          tabIndex={0}
                          aria-label={`View application of ${name}`}
                          onClick={(event) => {
                            if (event.target.closest?.('a, button, input, select, textarea, [role="button"]')) return;
                            navigate(`/employer/application/${app._id}?from=hired`);
                          }}
                          onKeyDown={(event) => {
                            if (event.target !== event.currentTarget) return;
                            if (event.key !== 'Enter' && event.key !== ' ') return;
                            event.preventDefault();
                            navigate(`/employer/application/${app._id}?from=hired`);
                          }}
                          className="border-b border-gray-200 last:border-b-0 group cursor-pointer transition-colors hover:bg-[#2e66a6]/[0.06] focus-visible:bg-[#2e66a6]/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2e66a6]"
                        >
                          <td className="px-6 py-4 text-[15px] text-gray-700">
                            {formatDate(app.appliedAt)}
                          </td>

                          <td className="px-6 py-4">
                            <div className="flex items-center gap-4">
                              <Avatar
                                img={app.jobseeker?.profileImage}
                                name={name}
                                size={48}
                                altKey={`hired_${app._id}`}
                              />
                              <div className="min-w-0">
                                <div className="truncate text-[15px] font-semibold text-gray-900">{name}</div>
                                <div className="truncate text-sm text-gray-500">{email}</div>
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-4 text-sm text-gray-700">
                            <span className="block truncate" title={contactNumber}>{contactNumber}</span>
                          </td>

                          <td className="px-6 py-4">
                            <div className="text-[15px] font-semibold text-gray-900">{jobTitle}</div>
                          </td>

                          {statusFilter === 'all' && (
                            <td className="px-6 py-4">
                              <span className={cn('rounded-full px-3 py-1 text-xs font-semibold', app._recordStatus === 'declined' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700')}>
                                {app._recordStatus === 'declined' ? 'Declined' : 'Hired'}
                              </span>
                            </td>
                          )}

                          {statusFilter === 'declined' && (
                            <td className="px-6 py-4 text-sm text-gray-700">
                              {app._recordStatus === 'declined' ? getDeclineStageLabel(app.declinedFrom) : '—'}
                            </td>
                          )}

                          <td className="px-6 py-4 text-center">
                            <div className="flex flex-nowrap items-center justify-center gap-2 whitespace-nowrap">
                              <Link
                                to={`/employer/application/${app._id}?from=hired`}
                                className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2"
                                aria-label={`View details of ${name}`}
                              >
                                <Icon name="eye" className="h-4 w-4" />
                                <span>Application</span>
                              </Link>
                              {app._recordStatus === 'declined' && (
                                <button
                                  type="button"
                                  onClick={() => handleArchiveDeclined(app._id)}
                                  disabled={archivingId === app._id}
                                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50"
                                  aria-label={`Archive declined application of ${name}`}
                                  title="Archive declined application"
                                >
                                  <Icon name="trash" className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile */}
              <div className="space-y-3 p-4 md:hidden">
                {paginatedApplications.map((app) => {
                  const name = buildApplicantName(app.jobseeker);
                  const email = app.jobseeker?.email || '—';
                  const contactNumber = getApplicantContact(app.jobseeker);
                  const jobTitle = app.job?.title || '—';

                  return (
                    <div key={app._id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                      <div className="flex items-start gap-3">
                        <Avatar
                          img={app.jobseeker?.profileImage}
                          name={name}
                          size={46}
                          altKey={`hired_mobile_${app._id}`}
                        />

                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-gray-900">{name}</div>
                          <div className="truncate text-xs text-gray-600">{email}</div>
                        </div>
                      </div>

                      <div className="mt-4 space-y-2 rounded-xl bg-gray-50 p-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Applied Date</p>
                          <p className="text-sm text-gray-800">{formatDate(app.appliedAt)}</p>
                        </div>

                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Contact Number</p>
                          <p className="text-sm text-gray-800">{contactNumber}</p>
                        </div>

                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Job Applied</p>
                          <p className="text-sm font-semibold text-gray-900">{jobTitle}</p>
                        </div>

                        {statusFilter === 'declined' && app._recordStatus === 'declined' && (
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Decline Stage</p>
                            <p className="text-sm text-gray-800">{getDeclineStageLabel(app.declinedFrom)}</p>
                          </div>
                        )}
                      </div>

                      <div className="mt-3">
                        <Link
                          to={`/employer/application/${app._id}?from=hired`}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2"
                        >
                          <Icon name="eye" className="h-4 w-4" />
                          <span>Application</span>
                        </Link>
                        {app._recordStatus === 'declined' && (
                          <button
                            type="button"
                            onClick={() => handleArchiveDeclined(app._id)}
                            disabled={archivingId === app._id}
                            className="mt-2 inline-flex w-full items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                          >
                            Archive
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <Pagination currentPage={currentPage} totalItems={totalItems} pageSize={pageSize} onPageChange={setCurrentPage} onPageSizeChange={setPageSize} ariaLabel="Hired applicants pagination" />

            </>
          )}
        </div>
      </div>

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

export default HiredApplicants;
