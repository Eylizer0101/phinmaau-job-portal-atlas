// src/pages/employer/dashboard/HiredApplicants.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
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
    case 'request':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4l16 8-16 8 3-8-3-8Z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12h13" />
        </svg>
      );
    case 'edit':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M16.732 3.732a2.5 2.5 0 113.536 3.536L8.5 19.036 4 20l.964-4.5L16.732 3.732z" />
        </svg>
      );
    case 'check':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m5 12 4 4L19 6" />
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
  const location = useLocation();
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
  const [employmentFilter, setEmploymentFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [showCustomDateModal, setShowCustomDateModal] = useState(false);
  const [sortBy, setSortBy] = useState('recent');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [brokenAvatars, setBrokenAvatars] = useState(() => new Set());
  const [reviewApplication, setReviewApplication] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewResult, setReviewResult] = useState(null);
  const [updateApplication, setUpdateApplication] = useState(null);
  const [updateReason, setUpdateReason] = useState('');
  const [updateStep, setUpdateStep] = useState('reason');
  const [updateLoading, setUpdateLoading] = useState(false);

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

  useEffect(() => {
    if (!reviewResult) return undefined;
    const timer = window.setTimeout(() => setReviewResult(null), 3000);
    return () => window.clearTimeout(timer);
  }, [reviewResult]);

  useEffect(() => {
    const applicationId = new URLSearchParams(location.search).get('statusRequest');
    if (!applicationId || loading) return;
    setQuery('');
    setSelectedJob('all');
    setDateFilter('all');
    setSortBy('recent');
    const targetIndex = applications.findIndex((application) => String(application._id) === String(applicationId));
    if (targetIndex >= 0 && pageSize !== 'all') {
      setCurrentPage(Math.floor(targetIndex / Number(pageSize)) + 1);
    }
    window.setTimeout(() => {
      const prefix = window.innerWidth < 768 ? 'hired-application-mobile' : 'hired-application';
      document.getElementById(`${prefix}-${applicationId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }, [location.search, loading, applications, pageSize]);

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

    const employmentFiltered = employmentFilter === 'all'
      ? searched
      : searched.filter((application) =>
          String(application.employmentStatus || 'active').toLowerCase() === employmentFilter
        );

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

    const filteredByDate = employmentFiltered.filter((a) => {
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
  }, [applications, buildApplicantName, dateFilter, customDateFrom, customDateTo, debouncedQuery, employmentFilter, selectedJob, sortBy]);


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
    setEmploymentFilter('all');
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
    query.trim() || selectedJob !== 'all' || employmentFilter !== 'all' || dateFilter !== 'all' || sortBy !== 'recent';

  const openEmploymentUpdate = (application) => {
    setUpdateApplication(application);
    setUpdateReason('');
    setUpdateStep('reason');
  };

  const closeEmploymentUpdate = () => {
    if (updateLoading) return;
    setUpdateApplication(null);
    setUpdateReason('');
    setUpdateStep('reason');
  };

  const handleEmployerEmploymentUpdate = async () => {
    if (!updateApplication?._id || !updateReason || updateLoading) return;
    try {
      setUpdateLoading(true);
      setError('');
      const response = await axios.put(
        `https://phinmaau-job-portal-atlas.onrender.com/api/applications/${updateApplication._id}/employment-status`,
        { reason: updateReason },
        { headers: getAuthHeaders() }
      );
      if (response.data?.success) {
        const updatedApplication = response.data.application;
        setApplications((previous) => previous.map((application) =>
          application._id === updatedApplication._id
            ? { ...updatedApplication, _recordStatus: 'hired' }
            : application
        ));
        setUpdateApplication(null);
        setUpdateReason('');
        setUpdateStep('reason');
        setReviewResult({
          title: 'Employment status updated successfully!',
          description: "The job seeker's employment status has been changed from Active to Inactive."
        });
      }
    } catch (updateError) {
      setError(updateError?.response?.data?.message || 'Failed to update the employment status.');
    } finally {
      setUpdateLoading(false);
    }
  };

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

  const handleReviewStatusRequest = async (decision) => {
    if (!reviewApplication?._id || reviewLoading) return;

    try {
      setReviewLoading(true);
      setError('');
      const response = await axios.put(
        `https://phinmaau-job-portal-atlas.onrender.com/api/applications/${reviewApplication._id}/employment-status-request/review`,
        { decision },
        { headers: getAuthHeaders() }
      );

      if (response.data?.success) {
        const updatedApplication = response.data.application;
        setApplications((previous) =>
          previous.map((application) =>
            application._id === updatedApplication._id
              ? { ...updatedApplication, _recordStatus: 'hired' }
              : application
          )
        );
        setReviewApplication(null);
        setReviewResult({
          decision,
          title: decision === 'approved'
            ? 'Status change approved successfully!'
            : 'Status change request declined!',
          description: decision === 'approved'
            ? "The job seeker's employment status has been changed from Active to Inactive."
            : "The job seeker's employment status remains Active."
        });
      }
    } catch (reviewError) {
      setError(reviewError?.response?.data?.message || 'Failed to review the status change request.');
    } finally {
      setReviewLoading(false);
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
              <div className={hasActiveFilters ? 'lg:col-span-2' : 'lg:col-span-3'}>
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

              <div className="lg:col-span-2">
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
                <label className="sr-only" htmlFor="employmentFilter">Filter by employment status</label>
                <select
                  id="employmentFilter"
                  value={employmentFilter}
                  onChange={(event) => {
                    setEmploymentFilter(event.target.value);
                    setCurrentPage(1);
                  }}
                  className={selectBase}
                  disabled={loading}
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
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
                      <th className="px-6 py-5 text-left text-sm font-semibold uppercase tracking-wide text-gray-700">
                        Status
                      </th>
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
                          id={`hired-application-${app._id}`}
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
                          className={cn(
                            'border-b border-gray-200 last:border-b-0 group cursor-pointer transition-colors hover:bg-[#2e66a6]/[0.06] focus-visible:bg-[#2e66a6]/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2e66a6]',
                            String(app.employmentStatusRequest?.status || '').toLowerCase() === 'pending' && 'bg-[#2e66a6]/[0.08]'
                          )}
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

                          <td className="px-6 py-4">
                            {String(app.employmentStatus || 'active').toLowerCase() === 'inactive' ? (
                              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">Inactive</span>
                            ) : (
                              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Active</span>
                            )}
                          </td>

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
                              {String(app.employmentStatusRequest?.status || '').toLowerCase() === 'pending' && (
                                <button
                                  type="button"
                                  onClick={() => setReviewApplication(app)}
                                  className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#2e66a6]/25 bg-[#2e66a6]/5 text-[#2e66a6] hover:bg-[#2e66a6]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2"
                                  aria-label={`Review employment status request from ${name}`}
                                  title="Review employment status request"
                                >
                                  <Icon name="request" className="h-4 w-4" />
                                  <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-red-500" aria-hidden="true" />
                                </button>
                              )}
                              {String(app.employmentStatus || 'active').toLowerCase() === 'active' &&
                                String(app.employmentStatusRequest?.status || 'none').toLowerCase() !== 'pending' && (
                                <button
                                  type="button"
                                  onClick={() => openEmploymentUpdate(app)}
                                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#2e66a6]/25 bg-[#2e66a6]/5 text-[#2e66a6] hover:bg-[#2e66a6]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2"
                                  aria-label={`Update employment status of ${name}`}
                                  title="Update employment status"
                                >
                                  <Icon name="edit" className="h-4 w-4" />
                                </button>
                              )}
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
                    <div key={app._id} id={`hired-application-mobile-${app._id}`} className={cn('rounded-2xl border border-gray-200 bg-white p-4 shadow-sm', String(app.employmentStatusRequest?.status || '').toLowerCase() === 'pending' && 'border-[#2e66a6]/30 bg-[#2e66a6]/[0.06]')}>
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

                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Status</p>
                          <p className={cn('text-sm font-semibold', String(app.employmentStatus || 'active').toLowerCase() === 'inactive' ? 'text-gray-700' : 'text-emerald-700')}>
                            {String(app.employmentStatus || 'active').toLowerCase() === 'inactive' ? 'Inactive' : 'Active'}
                          </p>
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
                        {String(app.employmentStatusRequest?.status || '').toLowerCase() === 'pending' && (
                          <button
                            type="button"
                            onClick={() => setReviewApplication(app)}
                            className="relative mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#2e66a6]/25 bg-[#2e66a6]/5 px-4 py-2 text-sm font-semibold text-[#2e66a6] hover:bg-[#2e66a6]/10"
                          >
                            <Icon name="request" className="h-4 w-4" />
                            Review Status Request
                            <span className="absolute right-3 top-2 h-2.5 w-2.5 rounded-full bg-red-500" aria-hidden="true" />
                          </button>
                        )}
                        {String(app.employmentStatus || 'active').toLowerCase() === 'active' &&
                          String(app.employmentStatusRequest?.status || 'none').toLowerCase() !== 'pending' && (
                          <button
                            type="button"
                            onClick={() => openEmploymentUpdate(app)}
                            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#2e66a6]/25 bg-[#2e66a6]/5 px-4 py-2 text-sm font-semibold text-[#2e66a6] hover:bg-[#2e66a6]/10"
                          >
                            <Icon name="edit" className="h-4 w-4" />
                            Update Status
                          </button>
                        )}
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

      {updateApplication && updateStep === 'reason' && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 px-4" role="dialog" aria-modal="true" aria-labelledby="update-employment-title">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="update-employment-title" className="text-lg font-bold text-gray-900">Why are you updating this job seeker's employment status?</h2>
                <p className="mt-1 text-sm text-gray-500">Select the reason for ending this job seeker's current employment.</p>
              </div>
              <button type="button" onClick={closeEmploymentUpdate} className="rounded-lg p-1 text-gray-500 hover:bg-gray-100" aria-label="Close update employment modal">
                <Icon name="x" className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-5 space-y-3">
              {[
                { value: 'contract_ended', title: 'Contract Ended', description: 'Previous contract has finished' },
                { value: 'employment_ended', title: 'Employment Ended', description: 'No longer employed in this role' }
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setUpdateReason(option.value)}
                  className={cn('w-full rounded-xl border px-4 py-3 text-left transition', updateReason === option.value ? 'border-[#2e66a6] bg-[#2e66a6]/5 ring-2 ring-[#2e66a6]/10' : 'border-gray-200 hover:border-[#2e66a6]/50')}
                  aria-pressed={updateReason === option.value}
                >
                  <span className="block text-sm font-semibold text-gray-900">{option.title}</span>
                  <span className="mt-0.5 block text-xs text-gray-500">{option.description}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setUpdateStep('confirm')}
              disabled={!updateReason}
              className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#2e66a6] px-4 text-sm font-semibold text-white hover:bg-[#25558c] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {updateApplication && updateStep === 'confirm' && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 px-4" role="dialog" aria-modal="true" aria-labelledby="confirm-employment-title">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="confirm-employment-title" className="text-lg font-bold text-gray-900">End Employment?</h2>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  Are you sure you want to update the job seeker's employment status? Their current status will change from Active to Inactive.{' '}
                  (<strong className="text-gray-900">{updateReason === 'contract_ended' ? 'Contract Ended' : 'Employment Ended'}</strong>)
                </p>
              </div>
              <button type="button" onClick={closeEmploymentUpdate} disabled={updateLoading} className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-50" aria-label="Close confirmation modal">
                <Icon name="x" className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setUpdateStep('reason')} disabled={updateLoading} className="inline-flex h-11 items-center justify-center rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">Back</button>
              <button type="button" onClick={handleEmployerEmploymentUpdate} disabled={updateLoading} className="inline-flex h-11 items-center justify-center rounded-xl bg-[#2e66a6] px-4 text-sm font-semibold text-white hover:bg-[#25558c] disabled:opacity-50">
                {updateLoading ? 'Updating...' : 'Update Status'}
              </button>
            </div>
          </div>
        </div>
      )}

      {reviewApplication && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 px-4" role="dialog" aria-modal="true" aria-labelledby="review-request-title">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="review-request-title" className="text-lg font-bold text-gray-900">Approve Request?</h2>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  Are you sure you want to approve the job seeker's request to end their current employment status? Their employment record will change from Active to Inactive.
                </p>
              </div>
              <button type="button" onClick={() => !reviewLoading && setReviewApplication(null)} className="rounded-lg p-1 text-gray-500 hover:bg-gray-100" aria-label="Close request review modal">
                <Icon name="x" className="h-5 w-5" />
              </button>
            </div>

            <p className="mt-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
              Request reason:{' '}
              <strong className="text-gray-900">
                {reviewApplication.employmentStatusRequest?.reason === 'contract_ended' ? 'Contract Ended' : 'Employment Ended'}
              </strong>
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button type="button" onClick={() => handleReviewStatusRequest('declined')} disabled={reviewLoading} className="inline-flex h-11 items-center justify-center rounded-xl border border-red-200 bg-white px-4 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60">
                Decline Request
              </button>
              <button type="button" onClick={() => handleReviewStatusRequest('approved')} disabled={reviewLoading} className="inline-flex h-11 items-center justify-center rounded-xl bg-[#2e66a6] px-4 text-sm font-semibold text-white hover:bg-[#25558c] disabled:opacity-60">
                {reviewLoading ? 'Processing...' : 'Approve Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {reviewResult && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/25 px-4" role="status" aria-live="polite">
          <div className="w-full max-w-sm rounded-2xl bg-white px-6 py-7 text-center shadow-2xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#eaf2fb] text-[#2e66a6]">
              <Icon name="check" className="h-8 w-8" />
            </div>
            <h2 className="mt-4 text-xl font-bold text-gray-900">{reviewResult.title}</h2>
            <p className="mt-2 text-sm text-gray-500">{reviewResult.description}</p>
          </div>
        </div>
      )}
    </EmployerLayout>
  );
};

export default HiredApplicants;
