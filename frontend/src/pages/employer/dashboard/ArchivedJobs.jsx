import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import EmployerLayout from '../../../layouts/EmployerLayout';
import Pagination from '../../../components/shared/Pagination';
import CenteredIndicator from '../../../components/shared/CenteredIndicator';

const cn = (...classes) => classes.filter(Boolean).join(' ');

const ActionIcon = ({ name, className = 'h-5 w-5' }) => {
  const common = {
    className,
    fill: 'none',
    stroke: 'currentColor',
    viewBox: '0 0 24 24',
    'aria-hidden': true,
  };

  if (name === 'view') {
    return (
      <svg {...common}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    );
  }

  if (name === 'edit') {
    return (
      <svg {...common}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
        />
      </svg>
    );
  }

  if (name === 'restore') {
    return (
     <img 
  src="/images/restorist.png" 
  alt="" 
  className={`${className} scale-125`}
  aria-hidden="true" 
/>
    );
  }

  if (name === 'delete') {
    return (
      <svg {...common}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
        />
      </svg>
    );
  }

  return null;
};


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


const ArchivedJobs = () => {
  const navigate = useNavigate();

  const [jobs, setJobs] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [action, setAction] = useState({ type: '', jobId: '' });

  const [jobFilter, setJobFilter] = useState('all');
  const [q, setQ] = useState('');
  const [sortBy, setSortBy] = useState('all');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [showCustomDateModal, setShowCustomDateModal] = useState(false);

  const [badLogos, setBadLogos] = useState({});
  const [counts, setCounts] = useState({
    active: 0,
    archived: 0,
  });

  const [selectedJob, setSelectedJob] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [restoreJobCandidate, setRestoreJobCandidate] = useState(null);

  const modalRef = useRef(null);
  const cancelBtnRef = useRef(null);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const response = await axios.get('https://phinmaau-job-portal-atlas.onrender.com/api/jobs/employer/my-jobs?archived=true', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setJobs(response.data.jobs || []);
        setCounts({
          active: response.data.activeCount ?? 0,
          archived: response.data.archivedCount ?? 0,
        });
      } else {
        setError('Failed to fetch archived jobs');
      }
    } catch (err) {
      console.error('Error fetching archived jobs:', err);
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/employer/login');
      }
      setError('Failed to load archived jobs. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!showDeleteModal) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [showDeleteModal]);

  useEffect(() => {
    if (!showDeleteModal) return;

    const t = setTimeout(() => cancelBtnRef.current?.focus(), 0);

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowDeleteModal(false);
        setSelectedJob(null);
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

  const closeModal = () => {
    setShowDeleteModal(false);
    setSelectedJob(null);
  };

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

  const safeTitle = (job) => (job.title && job.title.trim() ? job.title : '—');
  const safeCompany = (job) => (job.companyName && job.companyName.trim() ? job.companyName : '—');

  const getVacancyValue = (job) => {
    const candidates = [
      job?.vacancy,
      job?.vacancies,
      job?.numberOfVacancies,
      job?.positionsAvailable,
      job?.slots,
      job?.headcount,
      job?.openingCount,
    ];

    const found = candidates.find((value) => value !== undefined && value !== null && value !== '');
    return found ?? '—';
  };

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

  const isExpired = (dateString) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return false;
    return date < new Date();
  };

  const getDerivedStatus = (job) => {
    const archivedStatus = String(job?.statusBeforeArchive || '').trim().toLowerCase();
    if (['draft', 'open', 'closed', 'expired', 'filled'].includes(archivedStatus)) {
      return archivedStatus;
    }

    const explicitStatus = String(job?.status || '').trim().toLowerCase();

    if (explicitStatus === 'draft' || job.isPublished === false) return 'draft';
    if (explicitStatus === 'filled') return 'filled';
    if (explicitStatus === 'closed') return 'closed';
    if (isExpired(job.applicationDeadline)) return 'expired';
    if (explicitStatus === 'published') return 'open';
    return job.isActive ? 'open' : 'closed';
  };

  const getStatusPill = (job) => {
    const status = getDerivedStatus(job);
    if (status === 'draft') return 'border border-gray-200 bg-gray-100 text-gray-700';
    if (status === 'open') return 'border border-blue-200 bg-blue-50 text-[#2e66a6]';
    if (status === 'expired') return 'border border-amber-200 bg-amber-50 text-amber-700';
    if (status === 'filled') return 'border border-orange-200 bg-orange-50 text-orange-700';
    return 'border border-gray-300 bg-gray-50 text-gray-700';
  };

  const getStatusText = (job) => {
    const status = getDerivedStatus(job);
    if (status === 'draft') return 'Draft';
    if (status === 'open') return 'Open';
    if (status === 'expired') return 'Expired';
    if (status === 'filled') return 'Filled';
    return 'Closed';
  };

  const getRestoreConfirmationMessage = (job) => {
    const status = getDerivedStatus(job);

    if (status === 'open') {
      return 'This job post was archived while Open. Restoring it will return it as Closed and keep it unavailable to job seekers until you choose to reopen the job post again.';
    }

    if (status === 'closed') {
      return 'Restoring it will return the closed job post to your active list while keeping its Closed status for future reference or management.';
    }

    if (status === 'expired') {
      return 'Restoring it will return the expired job post to your active list while keeping its Expired status. You can update the job post and republish it if needed.';
    }

    if (status === 'draft') {
      return 'Restoring it will return the draft to your active list, where you can continue editing and complete the job post before publishing.';
    }

    if (status === 'filled') {
      return 'Restoring it will return the filled job post to your active list while keeping its Filled status and application records for future reference.';
    }

    return 'This job post will be restored to your active job posts using the status it had before it was archived.';
  };

  const formatSalary = (job) => {
    const formatMoney = (value) => {
      const num = Number(value);
      if (Number.isNaN(num)) return null;
      return `₱${num.toLocaleString('en-PH')}`;
    };

    if (job?.salaryMin !== undefined && job?.salaryMax !== undefined) {
      const min = formatMoney(job.salaryMin);
      const max = formatMoney(job.salaryMax);
      if (min && max) return `${min} - ${max}`;
    }

    if (job?.salary !== undefined && job?.salary !== null && job?.salary !== '') {
      const single = formatMoney(job.salary);
      return single || String(job.salary);
    }

    if (job?.salaryRange && String(job.salaryRange).trim()) {
      return String(job.salaryRange).trim();
    }

    return '—';
  };

  const safeDate = (d) => {
    const x = new Date(d || 0);
    return Number.isNaN(x.getTime()) ? new Date(0) : x;
  };

  const handleRestore = async (jobId) => {
    try {
      if (action.jobId) return;
      setAction({ type: 'restore', jobId });

      const token = localStorage.getItem('token');

      await axios.patch(
        `https://phinmaau-job-portal-atlas.onrender.com/api/jobs/${jobId}/restore`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setJobs((prev) => prev.filter((job) => job._id !== jobId));
      setCounts((prev) => ({
        active: prev.active + 1,
        archived: Math.max(0, prev.archived - 1),
      }));
      setRestoreJobCandidate(null);
      setSuccess('Job restored successfully');
    } catch (err) {
      console.error('Error restoring job:', err);
      setError('Failed to restore job');
    } finally {
      setAction({ type: '', jobId: '' });
    }
  };

  const handlePermanentDelete = async (jobId) => {
    try {
      if (action.jobId) return;
      setAction({ type: 'permanent-delete', jobId });

      const token = localStorage.getItem('token');

      await axios.delete(`https://phinmaau-job-portal-atlas.onrender.com/api/jobs/${jobId}/permanent`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setJobs((prev) => prev.filter((job) => job._id !== jobId));
      setCounts((prev) => ({
        ...prev,
        archived: Math.max(0, prev.archived - 1),
      }));
      closeModal();
      setSuccess('Job permanently deleted successfully');
    } catch (err) {
      console.error('Error permanently deleting job:', err);
      setError('Failed to permanently delete job');
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
          onClick={() => navigate('/employer/manage-jobs')}
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 hover:text-gray-900"
        >
          <span>Active</span>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">
            {counts.active}
          </span>
        </button>

        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl bg-[#f5f7fb] px-4 py-2 text-sm font-semibold text-[#2e66a6]"
          aria-current="page"
        >
          <span>Archived</span>
          <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-[#2e66a6]">
            {counts.archived}
          </span>
        </button>
      </div>
    );
  }, [counts.active, counts.archived, navigate]);

  const filteredJobs = useMemo(() => {
    const norm = (s) => (s || '').toLowerCase().trim();
    const query = norm(q);

    let list = [...jobs];

    if (jobFilter !== 'all') {
      list = list.filter((j) => j._id === jobFilter);
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
          String(getVacancyValue(j)),
          formatSalary(j),
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
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const startOfNextYear = new Date(now.getFullYear() + 1, 0, 1);
    const startOfLastYear = new Date(now.getFullYear() - 1, 0, 1);

    const getComparableDate = (job) => {
      const archivedDate = safeDate(job.archivedAt);
      if (archivedDate.getTime() !== new Date(0).getTime()) return archivedDate;

      const createdDate = safeDate(job.createdAt);
      if (createdDate.getTime() !== new Date(0).getTime()) return createdDate;

      return safeDate(job.updatedAt);
    };

    if (sortBy === 'today') {
      list = list.filter((job) => {
        const date = getComparableDate(job);
        return date >= startOfToday && date < startOfTomorrow;
      });
    } else if (sortBy === 'yesterday') {
      list = list.filter((job) => {
        const date = getComparableDate(job);
        return date >= startOfYesterday && date < startOfToday;
      });
    } else if (sortBy === 'this_week') {
      list = list.filter((job) => {
        const date = getComparableDate(job);
        return date >= startOfWeek && date < startOfNextWeek;
      });
    } else if (sortBy === 'last_7_days') {
      list = list.filter((job) => {
        const date = getComparableDate(job);
        return date >= sevenDaysAgo && date < startOfTomorrow;
      });
    } else if (sortBy === 'this_month') {
      list = list.filter((job) => {
        const date = getComparableDate(job);
        return date >= startOfMonth && date < startOfNextMonth;
      });
    } else if (sortBy === 'last_month') {
      list = list.filter((job) => {
        const date = getComparableDate(job);
        return date >= startOfLastMonth && date < startOfMonth;
      });
    } else if (sortBy === 'this_year') {
      list = list.filter((job) => {
        const date = getComparableDate(job);
        return date >= startOfYear && date < startOfNextYear;
      });
    } else if (sortBy === 'last_year') {
      list = list.filter((job) => {
        const date = getComparableDate(job);
        return date >= startOfLastYear && date < startOfYear;
      });
    } else if (sortBy === 'custom' && customDateFrom && customDateTo) {
      const customStart = new Date(`${customDateFrom}T00:00:00`);
      const customEndExclusive = new Date(`${customDateTo}T00:00:00`);
      customEndExclusive.setDate(customEndExclusive.getDate() + 1);

      list = list.filter((job) => {
        const date = getComparableDate(job);
        return date >= customStart && date < customEndExclusive;
      });
    }

    list.sort((a, b) => safeDate(b.archivedAt) - safeDate(a.archivedAt));

    return list;
  }, [jobs, jobFilter, q, sortBy, customDateFrom, customDateTo]);

  const totalItems = filteredJobs.length;
  const numericPageSize = pageSize === 'all' ? Math.max(totalItems, 1) : Number(pageSize);
  const totalPages = Math.max(1, Math.ceil(totalItems / numericPageSize));
  const paginatedJobs = useMemo(() => {
    if (pageSize === 'all') return filteredJobs;
    const start = (currentPage - 1) * numericPageSize;
    return filteredJobs.slice(start, start + numericPageSize);
  }, [filteredJobs, currentPage, numericPageSize, pageSize]);

  useEffect(() => setCurrentPage(1), [q, jobFilter, sortBy, customDateFrom, customDateTo, pageSize]);
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const hasActiveFilters = useMemo(() => {
    return q.trim() !== '' || jobFilter !== 'all' || sortBy !== 'all';
  }, [q, jobFilter, sortBy]);

  const clearControls = () => {
    setJobFilter('all');
    setQ('');
    setSortBy('all');
    setCustomDateFrom('');
    setCustomDateTo('');
  };

  return (
    <EmployerLayout>
      <div className="mx-auto max-w-7xl px-1 py-8">
        <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(260px,auto)_minmax(320px,1fr)_auto] xl:items-start">
          <div>
            <h1 className="text-[33px] font-semibold leading-[40px] text-gray-900">Archived Jobs</h1>
            <p className="mt-1 text-sm text-gray-600">View and restore your archived job postings</p>
          </div>

          <div className="min-w-0 xl:pt-1">
            <CenteredIndicator type="error" message={error} onClose={() => setError('')} />
            <CenteredIndicator type="success" message={success} onClose={() => setSuccess('')} />
          </div>

          <div className="xl:pt-1">{headerRight}</div>
        </div>

        <div className="relative z-20 mb-6 overflow-visible rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="p-5">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-12 lg:items-center">
              <div className="relative min-w-0 lg:col-span-6">
                <svg className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
                </svg>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search archived job title, location, category..."
                  className="h-11 w-full rounded-xl border border-gray-300 py-2.5 pl-11 pr-10 text-gray-900 placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2"
                />
              </div>

              <div className="lg:col-span-3">
                <select
                  value={jobFilter}
                  onChange={(e) => setJobFilter(e.target.value)}
                  className="h-11 w-full rounded-xl border border-gray-300 bg-white px-4 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2"
                >
                  <option value="all">All Jobs</option>
                  {jobOptions.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className={hasActiveFilters ? 'lg:col-span-2' : 'lg:col-span-3'}>
                <ArchivedDateFilterDropdown
                  value={sortBy}
                  startDate={customDateFrom}
                  endDate={customDateTo}
                  disabled={loading}
                  onSelect={(value) => {
                    if (value === 'custom') {
                      setShowCustomDateModal(true);
                      return;
                    }

                    setSortBy(value);
                    setCustomDateFrom('');
                    setCustomDateTo('');
                  }}
                />
              </div>

              {hasActiveFilters && (
                <div className="lg:col-span-1">
                  <button
                    type="button"
                    onClick={clearControls}
                    className="h-11 w-full rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-900 transition hover:bg-gray-50"
                  >
                    Clear
                  </button>
                </div>
              )}
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
                <p className="mt-4 text-sm text-gray-600">Loading archived jobs...</p>
              </div>
            ) : filteredJobs.length === 0 ? (
              <div className="py-14 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M9 8V6a3 3 0 016 0v2m-8 0v10a2 2 0 002 2h6a2 2 0 002-2V8" />
                </svg>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">No archived jobs found</h3>
                <p className="mt-2 text-sm text-gray-600">Archived jobs will appear here after you archive them.</p>
                <div className="mt-6 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => navigate('/employer/manage-jobs')}
                    className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Go to Active Jobs
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

                    return (
                      <div key={job._id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
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
                            <Link
                              to={`/employer/manage-jobs/${job._id}/view`}
                              state={{
                                from: 'archivedJobs',
                                backPath: '/employer/manage-jobs/archived',
                                backLabel: 'Archived Jobs',
                              }}
                              className="block truncate text-sm font-semibold text-gray-900 hover:text-[#2e66a6]"
                              title={title}
                            >
                              {title}
                            </Link>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                          <div className="rounded-xl bg-gray-50 p-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Date Archived</p>
                            <p className="mt-1 font-medium text-gray-800">{formatDate(job.archivedAt)}</p>
                          </div>
                          <div className="rounded-xl bg-gray-50 p-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Valid Until</p>
                            <p className="mt-1 font-medium text-gray-800">{formatDate(job.applicationDeadline)}</p>
                          </div>
                          <div className="rounded-xl bg-gray-50 p-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Vacancy</p>
                            <p className="mt-1 font-medium text-gray-800">{getVacancyValue(job)}</p>
                          </div>
                          <div className="rounded-xl bg-gray-50 p-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Applicant</p>
                            <p className="mt-1 font-medium text-gray-800">{getApplicantValue(job)}</p>
                          </div>
                          <div className="col-span-2 rounded-xl bg-gray-50 p-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Status</p>
                            <span className={cn('mt-1 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold', getStatusPill(job))}>
                              {getStatusText(job)}
                            </span>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-2">
                          <Link
                            to={`/employer/manage-jobs/${job._id}/view`}
                            state={{
                              from: 'archivedJobs',
                              backPath: '/employer/manage-jobs/archived',
                              backLabel: 'Archived Jobs',
                            }}
                            className="inline-flex h-11 w-full items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 transition hover:border-[#2e66a6]/40 hover:bg-[#2e66a6]/[0.06] hover:text-[#2e66a6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2"
                            aria-label={`View ${title}`}
                            title="View"
                          >
                            <ActionIcon name="view" />
                          </Link>

                          <button
                            type="button"
                            onClick={() => setRestoreJobCandidate(job)}
                            disabled={busyThisRow}
                            className="inline-flex h-11 w-full items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-[#2e66a6] transition hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            aria-label={`Restore ${title}`}
                            title="Restore"
                          >
                            {busyThisRow && action.type === 'restore' ? (
                              <span className="inline-block h-4 w-4 animate-spin rounded-full border-b-2 border-t-2 border-current" />
                            ) : (
                              <ActionIcon name="restore" />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="hidden overflow-x-auto md:block">
                  <table className="min-w-full divide-y divide-gray-200">
                    <colgroup>
                      <col className="w-[13%]" />
                      <col className="w-[22%]" />
                      <col className="w-[8%]" />
                      <col className="w-[9%]" />
                      <col className="w-[11%]" />
                      <col className="w-[13%]" />
                      <col className="w-[24%]" />
                    </colgroup>

                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                          Date Archived
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

                        return (
                          <tr
                            key={job._id}
                            role="link"
                            tabIndex={0}
                            aria-label={`View ${title}`}
                            className="group cursor-pointer transition-colors hover:bg-[#2e66a6]/[0.06] focus-visible:bg-[#2e66a6]/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2e66a6]"
                            onClick={(event) => {
                              if (event.target.closest?.('a, button, input, select, textarea')) return;

                              navigate(`/employer/manage-jobs/${job._id}/view`, {
                                state: {
                                  from: 'archivedJobs',
                                  backPath: '/employer/manage-jobs/archived',
                                  backLabel: 'Archived Jobs',
                                },
                              });
                            }}
                            onKeyDown={(event) => {
                              if (event.target !== event.currentTarget) return;
                              if (event.key !== 'Enter' && event.key !== ' ') return;

                              event.preventDefault();
                              navigate(`/employer/manage-jobs/${job._id}/view`, {
                                state: {
                                  from: 'archivedJobs',
                                  backPath: '/employer/manage-jobs/archived',
                                  backLabel: 'Archived Jobs',
                                },
                              });
                            }}
                          >
                            <td className="px-6 py-4 align-middle text-sm font-medium text-gray-700">
                              {formatDate(job.archivedAt)}
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
                                        {(safeCompany(job) !== '—' ? safeCompany(job) : title !== '—' ? title : 'J').charAt(0)}
                                      </span>
                                    </div>
                                  )}
                                </div>

                                <div className="min-w-0">
                                  <Link
                                    to={`/employer/manage-jobs/${job._id}/view`}
                                    state={{
                                      from: 'archivedJobs',
                                      backPath: '/employer/manage-jobs/archived',
                                      backLabel: 'Archived Jobs',
                                    }}
                                    className="block truncate text-sm font-semibold text-gray-900 hover:text-[#2e66a6]"
                                    title={title}
                                  >
                                    {title}
                                  </Link>
                                </div>
                              </div>
                            </td>

                            <td className="px-6 py-4 text-center align-middle text-sm font-medium text-gray-800">
                              {getVacancyValue(job)}
                            </td>

                            <td className="px-6 py-4 text-center align-middle text-sm font-medium text-gray-800">
                              {getApplicantValue(job)}
                            </td>

                            <td className="px-6 py-4 align-middle">
                              <span className={cn('inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold', getStatusPill(job))}>
                                {getStatusText(job)}
                              </span>
                            </td>

                            <td className="px-6 py-4 align-middle text-sm font-medium text-gray-600">
                              {formatDate(job.applicationDeadline)}
                            </td>

                            <td className="px-6 py-4 text-center align-middle">
                              <div className="flex items-center justify-center gap-2">
                                <Link
                                  to={`/employer/manage-jobs/${job._id}/view`}
                                  state={{
                                    from: 'archivedJobs',
                                    backPath: '/employer/manage-jobs/archived',
                                    backLabel: 'Archived Jobs',
                                  }}
                                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 transition hover:border-[#2e66a6]/40 hover:bg-[#2e66a6]/[0.06] hover:text-[#2e66a6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2"
                                  aria-label={`View ${title}`}
                                  title="View"
                                >
                                  <ActionIcon name="view" className="h-4 w-4" />
                                </Link>

                                <button
                                  type="button"
                                  onClick={() => setRestoreJobCandidate(job)}
                                  disabled={busyThisRow}
                                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-[#2e66a6] transition hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                  aria-label={`Restore ${title}`}
                                  title="Restore"
                                >
                                  {busyThisRow && action.type === 'restore' ? (
                                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-b-2 border-t-2 border-current" />
                                  ) : (
                                    <ActionIcon name="restore" className="h-4 w-4" />
                                  )}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <Pagination currentPage={currentPage} totalItems={totalItems} pageSize={pageSize} onPageChange={setCurrentPage} onPageSizeChange={setPageSize} ariaLabel="Archived jobs pagination" />
              </>
            )}
          </div>
        </div>

        {restoreJobCandidate && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !action.jobId) {
                setRestoreJobCandidate(null);
              }
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="restore-job-title"
              aria-describedby="restore-job-description"
              className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl"
            >
              <div className="flex items-start gap-5 px-6 py-6">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#2e66a6]/10 text-[#2e66a6]">
                    <ActionIcon name="restore" className="h-6 w-6" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 id="restore-job-title" className="text-lg font-semibold text-gray-900">
                      Restore Job Post
                    </h3>
                    <p id="restore-job-description" className="mt-2 text-sm leading-6 text-gray-600">
                      Are you sure you want to restore this “<span className="font-semibold text-[#2e66a6]">{restoreJobCandidate.title || 'Untitled Draft'}</span>” job post?{' '}
                      {getRestoreConfirmationMessage(restoreJobCandidate)}
                    </p>
                  </div>
              </div>

                <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
                  <button
                    type="button"
                    onClick={() => setRestoreJobCandidate(null)}
                    disabled={action.type === 'restore' && action.jobId === restoreJobCandidate._id}
                    className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRestore(restoreJobCandidate._id)}
                    disabled={action.type === 'restore' && action.jobId === restoreJobCandidate._id}
                    className="inline-flex items-center gap-2 rounded-md bg-[#2e66a6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#255487] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] disabled:opacity-50"
                  >
                    {action.type === 'restore' && action.jobId === restoreJobCandidate._id ? (
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-b-2 border-t-2 border-white" />
                    ) : (
                      <ActionIcon name="restore" />
                    )}
                    Restore Job
                  </button>
                </div>
            </div>
          </div>
        )}


      </div>

      <ArchivedCustomDateRangeModal
        open={showCustomDateModal}
        startDate={customDateFrom}
        endDate={customDateTo}
        onCancel={() => setShowCustomDateModal(false)}
        onApply={(dateFrom, dateTo) => {
          setSortBy('custom');
          setCustomDateFrom(dateFrom);
          setCustomDateTo(dateTo);
          setShowCustomDateModal(false);
        }}
      />
    </EmployerLayout>
  );
};

export default ArchivedJobs;
