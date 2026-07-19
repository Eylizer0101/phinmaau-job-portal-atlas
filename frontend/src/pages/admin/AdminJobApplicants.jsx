import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import AdminLayout from '../../layouts/AdminLayout';
import api from '../../services/api';

const cn = (...classes) => classes.filter(Boolean).join(' ');

const UI = {
  page: 'min-h-screen bg-[#f8fafc]',
  container: 'mx-auto max-w-7xl px-1 py-8',
  card: 'w-full rounded-[22px] border border-[#e5e7eb] bg-white shadow-sm',
  ring: 'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2',
};

const DATE_FILTER_OPTIONS = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'thisWeek', label: 'This Week' },
  { value: '7days', label: 'Last 7 Days' },
  { value: 'thisMonth', label: 'This Month' },
  { value: 'lastMonth', label: 'Last Month' },
  { value: 'thisYear', label: 'This Year' },
  { value: 'custom', label: 'Custom Range' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'nameAsc', label: 'Applicant A-Z' },
  { value: 'nameDesc', label: 'Applicant Z-A' },
];

const SvgIcon = ({ name, className = 'h-4 w-4' }) => {
  const common = {
    className,
    fill: 'none',
    stroke: 'currentColor',
    viewBox: '0 0 24 24',
    strokeWidth: 1.8,
  };

  const icons = {
    arrowLeft: <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />,
    users: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-1a4 4 0 00-4-4h-1M9 20H2v-1a4 4 0 014-4h1" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M14 8a4 4 0 11-8 0 4 4 0 018 0zM22 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </>
    ),
    search: <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m1.1-5.4a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" />,
    calendar: <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3M5 11h14M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />,
    x: <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />,
    refresh: <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v6h6M20 20v-6h-6M5 15a7 7 0 0012 3l3-4M19 9A7 7 0 007 6L4 10" />,
  };

  return <svg {...common}>{icons[name] || null}</svg>;
};

const formatFullDate = (dateString) => {
  if (!dateString) return 'N/A';

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 'N/A';

  return date.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const formatDateInput = (date) => {
  if (!date) return '';

  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return '';

  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const getApplicationDate = (application) =>
  application?.appliedAt || application?.createdAt || null;

const getApplicantName = (application) => {
  const user = application?.jobseeker || {};
  const name = [user.firstName, user.middleName, user.lastName, user.extensionName]
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join(' ');

  return name || user.fullName || 'Applicant';
};

const getApplicantEmail = (application) =>
  application?.jobseeker?.email || application?.email || 'N/A';

const getProfile = (application) =>
  application?.jobseeker?.jobSeekerProfile || {};

const getEducationEntry = (application) => {
  const entries = getProfile(application)?.educationEntries;
  return Array.isArray(entries) && entries.length ? entries[0] : {};
};

const getApplicantCampus = (application) => {
  const profile = getProfile(application);
  const education = getEducationEntry(application);

  return String(profile.campus || education.campus || education.school || '').trim() || 'Not specified';
};

const getApplicantCourse = (application) => {
  const profile = getProfile(application);
  const education = getEducationEntry(application);

  return String(profile.course || education.course || education.studyField || profile.studyField || '').trim() || 'Not specified';
};

const getJobseekerLevel = (application) => {
  const profile = getProfile(application);
  const education = getEducationEntry(application);

  return String(
    profile.educationalAttainment ||
    education.educationalAttainment ||
    education.level ||
    ''
  ).trim() || 'Not specified';
};

const getApplicantStatusMeta = (statusRaw) => {
  const status = String(statusRaw || '').trim().toLowerCase();

  if (status === 'hired') {
    return {
      label: 'Hired',
      className: 'border-green-200 bg-green-50 text-green-700',
    };
  }

  if (status === 'declined' || status === 'rejected') {
    return {
      label: status === 'rejected' ? 'Rejected' : 'Declined',
      className: 'border-red-200 bg-red-50 text-red-700',
    };
  }

  if (status === 'for interview') {
    return {
      label: 'For Interview',
      className: 'border-[#b9d0e8] bg-[#eef5fc] text-[#2e66a6]',
    };
  }

  if (status === 'pending') {
    return {
      label: 'Pending',
      className: 'border-amber-200 bg-amber-50 text-amber-700',
    };
  }

  if (status === 'withdrawn' || status === 'cancelled' || status === 'vacancy full') {
    return {
      label: status.replace(/\b\w/g, (letter) => letter.toUpperCase()),
      className: 'border-gray-200 bg-gray-50 text-gray-700',
    };
  }

  return {
    label: status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Pending',
    className: 'border-gray-200 bg-gray-50 text-gray-700',
  };
};

const getPresetDateRange = (value) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (value === 'today') {
    const current = formatDateInput(today);
    return { from: current, to: current };
  }

  if (value === 'yesterday') {
    const date = new Date(today);
    date.setDate(date.getDate() - 1);
    const current = formatDateInput(date);
    return { from: current, to: current };
  }

  if (value === 'thisWeek') {
    const day = today.getDay();
    const mondayOffset = day === 0 ? 6 : day - 1;
    const start = new Date(today);
    start.setDate(start.getDate() - mondayOffset);

    return {
      from: formatDateInput(start),
      to: formatDateInput(today),
    };
  }

  if (value === '7days') {
    const start = new Date(today);
    start.setDate(start.getDate() - 6);

    return {
      from: formatDateInput(start),
      to: formatDateInput(today),
    };
  }

  if (value === 'thisMonth') {
    return {
      from: formatDateInput(new Date(today.getFullYear(), today.getMonth(), 1)),
      to: formatDateInput(today),
    };
  }

  if (value === 'lastMonth') {
    return {
      from: formatDateInput(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
      to: formatDateInput(new Date(today.getFullYear(), today.getMonth(), 0)),
    };
  }

  if (value === 'thisYear') {
    return {
      from: formatDateInput(new Date(today.getFullYear(), 0, 1)),
      to: formatDateInput(today),
    };
  }

  return { from: '', to: '' };
};

const isDateWithinRange = (value, from, to) => {
  if (!from && !to) return true;
  if (!value) return false;

  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return false;

  const targetTime = new Date(
    target.getFullYear(),
    target.getMonth(),
    target.getDate()
  ).getTime();

  const fromTime = from ? new Date(`${from}T00:00:00`).getTime() : null;
  const toTime = to ? new Date(`${to}T23:59:59.999`).getTime() : null;

  if (fromTime && targetTime < fromTime) return false;
  if (toTime && targetTime > toTime) return false;

  return true;
};


const addCalendarMonths = (date, amount) => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + amount);
  return next;
};

const monthNames = [
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

const getYearOptions = () => {
  const startYear = 1950;
  const endYear = new Date().getFullYear() + 10;
  return Array.from({ length: endYear - startYear + 1 }, (_, index) => startYear + index);
};

const CalendarMonth = ({
  monthDate,
  startDate,
  endDate,
  onPickDate,
  onChangeMonth,
}) => {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const firstWeekday = firstDay.getDay();
  const gridStart = new Date(year, month, 1 - firstWeekday);
  const start = startDate ? new Date(`${startDate}T00:00:00`) : null;
  const end = endDate ? new Date(`${endDate}T00:00:00`) : null;

  const days = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return date;
  });

  const isSameDay = (first, second) =>
    first && second && first.toDateString() === second.toDateString();

  const inRange = (date) => start && end && date >= start && date <= end;

  const changeByMonth = (amount) =>
    onChangeMonth(addCalendarMonths(monthDate, amount));

  const changeMonthSelect = (nextMonth) =>
    onChangeMonth(new Date(year, Number(nextMonth), 1));

  const changeYearSelect = (nextYear) =>
    onChangeMonth(new Date(Number(nextYear), month, 1));

  return (
    <div className="min-w-0 flex-1">
      <div className="mb-4 grid grid-cols-[32px_1fr_32px] items-center gap-2">
        <button
          type="button"
          onClick={() => changeByMonth(-1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-2xl leading-none text-slate-700 transition hover:bg-slate-100"
          aria-label="Previous month"
        >
          ‹
        </button>

        <div className="grid grid-cols-[1fr_86px] gap-2">
          <select
            value={month}
            onChange={(event) => changeMonthSelect(event.target.value)}
            className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-center text-sm font-extrabold text-[#2e66a6] outline-none focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/20"
            aria-label="Select month"
          >
            {monthNames.map((name, index) => (
              <option key={name} value={index}>
                {name}
              </option>
            ))}
          </select>

          <select
            value={year}
            onChange={(event) => changeYearSelect(event.target.value)}
            className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-center text-sm font-extrabold text-[#2e66a6] outline-none focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/20"
            aria-label="Select year"
          >
            {getYearOptions().map((yearOption) => (
              <option key={yearOption} value={yearOption}>
                {yearOption}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => changeByMonth(1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-2xl leading-none text-slate-700 transition hover:bg-slate-100"
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-y-2 text-center text-xs font-bold text-slate-500">
        {['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'].map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-7 gap-y-1 text-center text-sm text-slate-600">
        {days.map((day) => {
          const value = formatDateInput(day);
          const outside = day.getMonth() !== month;
          const selected = isSameDay(day, start) || isSameDay(day, end);
          const ranged = inRange(day);

          return (
            <button
              type="button"
              key={`${value}-${month}`}
              onClick={() => onPickDate(value)}
              className={cn(
                'mx-auto flex h-9 w-full items-center justify-center transition',
                outside ? 'text-slate-300' : 'text-slate-700',
                ranged ? 'bg-[#2e66a6]/10 text-[#2e66a6]' : '',
                selected
                  ? 'rounded-lg bg-[#2e66a6] font-extrabold text-white shadow-md'
                  : 'hover:bg-[#2e66a6]/10'
              )}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const CustomDateRangeModal = ({
  open,
  startDate,
  endDate,
  onCancel,
  onApply,
}) => {
  const today = new Date();
  const initialStart = startDate || formatDateInput(today);
  const initialEnd = endDate || formatDateInput(today);
  const [draftStart, setDraftStart] = useState(initialStart);
  const [draftEnd, setDraftEnd] = useState(initialEnd);
  const [leftMonth, setLeftMonth] = useState(
    new Date(`${initialStart}T00:00:00`)
  );
  const [rightMonth, setRightMonth] = useState(
    new Date(`${initialEnd}T00:00:00`)
  );

  useEffect(() => {
    if (!open) return;

    const nextStart = startDate || formatDateInput(today);
    const nextEnd = endDate || formatDateInput(today);

    setDraftStart(nextStart);
    setDraftEnd(nextEnd);
    setLeftMonth(new Date(`${nextStart}T00:00:00`));
    setRightMonth(new Date(`${nextEnd}T00:00:00`));
  }, [open, startDate, endDate]);

  if (!open) return null;

  const pickDate = (value) => {
    if (!draftStart || (draftStart && draftEnd)) {
      setDraftStart(value);
      setDraftEnd('');
      return;
    }

    if (
      new Date(`${value}T00:00:00`) <
      new Date(`${draftStart}T00:00:00`)
    ) {
      setDraftEnd(draftStart);
      setDraftStart(value);
    } else {
      setDraftEnd(value);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 px-4 py-6">
      <div className="w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="grid gap-5 px-6 pb-5 pt-5 md:grid-cols-[1fr_auto_1fr] md:items-end">
          <div>
            <div className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
              Start Date
            </div>
            <div className="flex h-12 items-center gap-3 rounded-xl bg-slate-100 px-4 text-lg font-bold text-[#2e66a6]">
              <SvgIcon name="calendar" className="h-5 w-5" />
              {formatFullDate(draftStart)}
            </div>
          </div>

          <div className="hidden pb-3 text-3xl text-slate-500 md:block">→</div>

          <div>
            <div className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
              End Date
            </div>
            <div className="flex h-12 items-center gap-3 rounded-xl bg-slate-100 px-4 text-lg font-bold text-[#2e66a6]">
              <SvgIcon name="calendar" className="h-5 w-5" />
              {draftEnd ? formatFullDate(draftEnd) : 'Select date'}
            </div>
          </div>
        </div>

        <div className="grid gap-8 px-6 pb-5 md:grid-cols-2">
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

        <div className="flex items-center justify-end gap-5 border-t border-slate-100 px-6 py-5">
          <button
            type="button"
            onClick={onCancel}
            className="text-base font-bold text-slate-600"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              if (draftStart && draftEnd) onApply(draftStart, draftEnd);
            }}
            disabled={!draftStart || !draftEnd}
            className="h-11 rounded-xl bg-[#2e66a6] px-8 text-base font-extrabold text-white shadow-lg shadow-[#2e66a6]/25 transition hover:bg-[#255487] disabled:opacity-60"
          >
            Apply Range
          </button>
        </div>
      </div>
    </div>
  );
};

const AdminJobApplicants = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [job, setJob] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [campusFilter, setCampusFilter] = useState('all');
  const [courseFilter, setCourseFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  const [customDateOpen, setCustomDateOpen] = useState(false);
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const ITEMS_PER_PAGE = 6;
  const MAX_VISIBLE_PAGES = 6;

  const backPath = location.state?.backPath || `/admin/jobs/${jobId}`;
  const backLabel = location.state?.backLabel || 'Job Details';

  const fetchApplicants = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const [jobResponse, applicationsResponse] = await Promise.all([
        api.get(`/jobs/${jobId}`),
        api.get(`/applications/job/${jobId}`),
      ]);

      setJob(jobResponse.data?.job || null);
      setApplicants(
        Array.isArray(applicationsResponse.data?.applications)
          ? applicationsResponse.data.applications
          : []
      );
    } catch (err) {
      if (err.response?.status === 404) {
        setError('Job or applicant list not found.');
      } else if (err.request) {
        setError('Cannot connect to the server. Please check your connection.');
      } else {
        setError('Unable to load the applicant list right now.');
      }
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    fetchApplicants();
  }, [fetchApplicants]);

  useEffect(() => {
    if (!customDateOpen) return;

    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setCustomDateOpen(false);
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [customDateOpen]);

  const campusOptions = useMemo(
    () =>
      [...new Set(applicants.map(getApplicantCampus).filter((value) => value !== 'Not specified'))]
        .sort((a, b) => a.localeCompare(b)),
    [applicants]
  );

  const courseOptions = useMemo(
    () =>
      [...new Set(applicants.map(getApplicantCourse).filter((value) => value !== 'Not specified'))]
        .sort((a, b) => a.localeCompare(b)),
    [applicants]
  );

  const statusOptions = useMemo(
    () =>
      [...new Set(
        applicants
          .map((application) => String(application?.status || '').trim().toLowerCase())
          .filter(Boolean)
      )].sort((a, b) => a.localeCompare(b)),
    [applicants]
  );

  const filteredApplicants = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    const dateRange =
      dateFilter === 'custom'
        ? { from: customDateFrom, to: customDateTo }
        : getPresetDateRange(dateFilter);

    const filtered = applicants.filter((application) => {
      const name = getApplicantName(application).toLowerCase();
      const email = getApplicantEmail(application).toLowerCase();
      const campus = getApplicantCampus(application);
      const course = getApplicantCourse(application);
      const status = String(application?.status || '').trim().toLowerCase();

      const matchesSearch =
        !normalizedSearch ||
        name.includes(normalizedSearch) ||
        email.includes(normalizedSearch);

      const matchesCampus =
        campusFilter === 'all' || campus.toLowerCase() === campusFilter.toLowerCase();

      const matchesCourse =
        courseFilter === 'all' || course.toLowerCase() === courseFilter.toLowerCase();

      const matchesStatus =
        statusFilter === 'all' || status === statusFilter.toLowerCase();

      const matchesDate =
        dateFilter === 'all' ||
        isDateWithinRange(getApplicationDate(application), dateRange.from, dateRange.to);

      return matchesSearch && matchesCampus && matchesCourse && matchesStatus && matchesDate;
    });

    return [...filtered].sort((first, second) => {
      if (sortBy === 'oldest') {
        return new Date(getApplicationDate(first) || 0) - new Date(getApplicationDate(second) || 0);
      }

      if (sortBy === 'nameAsc') {
        return getApplicantName(first).localeCompare(getApplicantName(second));
      }

      if (sortBy === 'nameDesc') {
        return getApplicantName(second).localeCompare(getApplicantName(first));
      }

      return new Date(getApplicationDate(second) || 0) - new Date(getApplicationDate(first) || 0);
    });
  }, [
    applicants,
    campusFilter,
    courseFilter,
    customDateFrom,
    customDateTo,
    dateFilter,
    search,
    sortBy,
    statusFilter,
  ]);

  const hasActiveFilters =
    search.trim() ||
    campusFilter !== 'all' ||
    courseFilter !== 'all' ||
    statusFilter !== 'all' ||
    dateFilter !== 'all' ||
    sortBy !== 'newest';

  const clearFilters = () => {
    setSearch('');
    setCampusFilter('all');
    setCourseFilter('all');
    setStatusFilter('all');
    setDateFilter('all');
    setSortBy('newest');
    setCustomDateFrom('');
    setCustomDateTo('');
    setCurrentPage(1);
  };

  const handleDateFilterChange = (value) => {
    if (value === 'custom') {
      setCustomDateOpen(true);
      return;
    }

    setDateFilter(value);
    setCurrentPage(1);
  };

  const applyCustomDate = (startDate, endDate) => {
    setCustomDateFrom(startDate);
    setCustomDateTo(endDate);
    setDateFilter('custom');
    setCurrentPage(1);
    setCustomDateOpen(false);
  };

  const dateFilterLabel =
    dateFilter === 'custom' && customDateFrom && customDateTo
      ? `${formatFullDate(customDateFrom)} - ${formatFullDate(customDateTo)}`
      : DATE_FILTER_OPTIONS.find((option) => option.value === dateFilter)?.label || 'All Time';


  const totalPages = Math.max(
    1,
    Math.ceil(filteredApplicants.length / ITEMS_PER_PAGE)
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [
    search,
    campusFilter,
    courseFilter,
    statusFilter,
    dateFilter,
    customDateFrom,
    customDateTo,
    sortBy,
  ]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const paginatedApplicants = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredApplicants.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [currentPage, filteredApplicants]);

  const firstShown =
    filteredApplicants.length === 0
      ? 0
      : (currentPage - 1) * ITEMS_PER_PAGE + 1;

  const lastShown = Math.min(
    currentPage * ITEMS_PER_PAGE,
    filteredApplicants.length
  );

  const pageWindowStart =
    Math.floor((currentPage - 1) / MAX_VISIBLE_PAGES) *
      MAX_VISIBLE_PAGES +
    1;

  const visiblePageNumbers = Array.from(
    {
      length: Math.min(
        MAX_VISIBLE_PAGES,
        totalPages - pageWindowStart + 1
      ),
    },
    (_, index) => pageWindowStart + index
  );

  return (
    <AdminLayout>
      <div className={UI.page}>
        <div className={UI.container}>
          <button
            type="button"
            onClick={() => navigate(backPath)}
            className={`mb-5 inline-flex items-center justify-center gap-2 rounded-lg border border-[#d7e6f5] bg-white px-4 py-2 text-sm font-semibold text-[#111827] transition hover:bg-[#eef5fc] hover:text-[#2e66a6] ${UI.ring}`}
          >
            <SvgIcon name="arrowLeft" className="h-4 w-4" />
            {backLabel}
          </button>

          <div className={`${UI.card} overflow-visible`}>
            <div className="flex flex-col gap-3 border-b border-[#e5e7eb] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div>
                <div className="flex items-center gap-2">
                  <SvgIcon name="users" className="h-5 w-5 text-[#4b5563]" />
                  <h1 className="text-lg font-bold text-[#111827]">
                    Applicant List
                  </h1>
                </div>
                <p className="mt-1 text-sm text-[#6b7280]">
                  {job?.title || location.state?.jobTitle || 'Selected Job'}
                </p>
              </div>

              <span className="w-fit rounded-full border border-[#d7e6f5] bg-[#eef5fc] px-3 py-1 text-xs font-semibold text-[#2e66a6]">
                {filteredApplicants.length} of {applicants.length}{' '}
                {applicants.length === 1 ? 'Applicant' : 'Applicants'}
              </span>
            </div>

            {!loading && !error && (
              <div className="px-5 py-5 sm:px-6">
                <div className="overflow-x-auto pb-1">
                  <div className="flex min-w-[1320px] items-center gap-3">
                    <label className="relative min-w-[290px] flex-1">
                      <span className="sr-only">Search applicants</span>
                      <SvgIcon
                        name="search"
                        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ca3af]"
                      />
                      <input
                        type="search"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search name or email"
                        className={`h-11 w-full rounded-xl border border-[#d7e6f5] bg-white pl-10 pr-4 text-sm text-[#111827] outline-none transition placeholder:text-[#9ca3af] hover:border-[#b9d0e8] focus:border-[#2e66a6] ${UI.ring}`}
                      />
                    </label>

                    <select
                      value={campusFilter}
                      onChange={(event) => setCampusFilter(event.target.value)}
                      className={`h-11 w-[155px] rounded-xl border border-[#d7e6f5] bg-white px-3 text-sm font-medium text-[#374151] outline-none transition hover:border-[#b9d0e8] focus:border-[#2e66a6] ${UI.ring}`}
                      aria-label="Filter by campus"
                    >
                      <option value="all">All Campus</option>
                      {campusOptions.map((campus) => (
                        <option key={campus} value={campus}>
                          {campus}
                        </option>
                      ))}
                    </select>

                    <select
                      value={courseFilter}
                      onChange={(event) => setCourseFilter(event.target.value)}
                      className={`h-11 w-[155px] rounded-xl border border-[#d7e6f5] bg-white px-3 text-sm font-medium text-[#374151] outline-none transition hover:border-[#b9d0e8] focus:border-[#2e66a6] ${UI.ring}`}
                      aria-label="Filter by course"
                    >
                      <option value="all">All Course</option>
                      {courseOptions.map((course) => (
                        <option key={course} value={course}>
                          {course}
                        </option>
                      ))}
                    </select>

                    <select
                      value={statusFilter}
                      onChange={(event) => setStatusFilter(event.target.value)}
                      className={`h-11 w-[145px] rounded-xl border border-[#d7e6f5] bg-white px-3 text-sm font-medium text-[#374151] outline-none transition hover:border-[#b9d0e8] focus:border-[#2e66a6] ${UI.ring}`}
                      aria-label="Filter by status"
                    >
                      <option value="all">All Status</option>
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {getApplicantStatusMeta(status).label}
                        </option>
                      ))}
                    </select>

                    <select
                      value={dateFilter}
                      onChange={(event) =>
                        handleDateFilterChange(event.target.value)
                      }
                      className={`h-11 w-[175px] rounded-xl border border-[#d7e6f5] bg-white px-3 text-sm font-medium text-[#374151] outline-none transition hover:border-[#b9d0e8] focus:border-[#2e66a6] ${UI.ring}`}
                      aria-label="Filter by date applied"
                    >
                      {DATE_FILTER_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.value === 'custom' &&
                          dateFilter === 'custom'
                            ? dateFilterLabel
                            : option.label}
                        </option>
                      ))}
                    </select>

                    <label className="flex h-11 items-center gap-2 whitespace-nowrap rounded-xl border border-[#d7e6f5] bg-white px-3">
                      <span className="text-xs font-semibold text-[#6b7280]">
                        Sort by
                      </span>
                      <select
                        value={sortBy}
                        onChange={(event) => setSortBy(event.target.value)}
                        className={`h-9 min-w-[125px] border-0 bg-transparent px-1 text-sm font-medium text-[#374151] outline-none ${UI.ring}`}
                      >
                        {SORT_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <button
                      type="button"
                      onClick={clearFilters}
                      disabled={!hasActiveFilters}
                      className={`inline-flex h-11 min-w-[92px] items-center justify-center gap-2 rounded-xl border border-[#d7e6f5] bg-white px-4 text-xs font-semibold text-[#4b5563] transition hover:bg-[#eef5fc] hover:text-[#2e66a6] disabled:cursor-not-allowed disabled:opacity-45 ${UI.ring}`}
                    >
                      <SvgIcon name="refresh" className="h-4 w-4" />
                      Clear
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className={`${UI.card} mt-5 overflow-hidden`}>
            {loading ? (
              <div className="px-6 py-16 text-center text-sm text-[#6b7280]">
                Loading applicants...
              </div>
            ) : error ? (
              <div className="px-6 py-16 text-center">
                <p className="text-sm font-semibold text-red-600">{error}</p>
                <button
                  type="button"
                  onClick={fetchApplicants}
                  className={`mt-4 rounded-lg border border-[#d7e6f5] bg-white px-4 py-2 text-sm font-semibold text-[#111827] hover:bg-[#eef5fc] ${UI.ring}`}
                >
                  Retry
                </button>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-[#e5e7eb] text-left text-xs">
                    <thead className="bg-[#f8fafc] text-[10px] font-bold uppercase tracking-widest text-[#6b7280]">
                      <tr>
                        <th className="px-5 py-4">Date Applied</th>
                        <th className="px-5 py-4">Applicant</th>
                        <th className="px-5 py-4">Campus</th>
                        <th className="px-5 py-4">Course</th>
                        <th className="px-5 py-4">Jobseeker Level</th>
                        <th className="px-5 py-4">Status</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-[#eef0f4] bg-white">
                      {paginatedApplicants.length > 0 ? (
                        paginatedApplicants.map((application) => {
                          const statusMeta = getApplicantStatusMeta(
                            application.status
                          );

                          return (
                            <tr
                              key={application._id}
                              className="text-[#374151] transition hover:bg-[#f8fafc]"
                            >
                              <td className="whitespace-nowrap px-5 py-4 font-medium text-[#4b5563]">
                                {formatFullDate(
                                  getApplicationDate(application)
                                )}
                              </td>
                              <td className="min-w-[220px] px-5 py-4">
                                <p className="font-semibold text-[#111827]">
                                  {getApplicantName(application)}
                                </p>
                                <p className="mt-1 break-all text-[11px] text-[#6b7280]">
                                  {getApplicantEmail(application)}
                                </p>
                              </td>
                              <td className="min-w-[130px] px-5 py-4">
                                {getApplicantCampus(application)}
                              </td>
                              <td className="min-w-[180px] px-5 py-4">
                                {getApplicantCourse(application)}
                              </td>
                              <td className="min-w-[170px] px-5 py-4">
                                {getJobseekerLevel(application)}
                              </td>
                              <td className="whitespace-nowrap px-5 py-4">
                                <span
                                  className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase ${statusMeta.className}`}
                                >
                                  {statusMeta.label}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td
                            colSpan="6"
                            className="px-5 py-14 text-center text-sm text-[#6b7280]"
                          >
                            {applicants.length
                              ? 'No applicants match the selected filters.'
                              : 'No applicants yet.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col gap-3 border-t border-[#e5e7eb] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-[#6b7280]">
                    Showing {firstShown} to {lastShown} of{' '}
                    {filteredApplicants.length} results
                  </p>

                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentPage((page) => Math.max(1, page - 1))
                      }
                      disabled={currentPage === 1}
                      className={`h-9 rounded-lg border border-[#d7e6f5] bg-white px-4 text-xs font-semibold text-[#374151] transition hover:bg-[#eef5fc] disabled:cursor-not-allowed disabled:opacity-45 ${UI.ring}`}
                    >
                      Previous
                    </button>

                    {visiblePageNumbers.map((pageNumber) => (
                      <button
                        type="button"
                        key={pageNumber}
                        onClick={() => setCurrentPage(pageNumber)}
                        className={`flex h-9 min-w-9 items-center justify-center rounded-lg border px-3 text-xs font-semibold transition ${
                          currentPage === pageNumber
                            ? 'border-[#2e66a6] bg-[#2e66a6] text-white'
                            : 'border-[#d7e6f5] bg-white text-[#374151] hover:bg-[#eef5fc]'
                        } ${UI.ring}`}
                      >
                        {pageNumber}
                      </button>
                    ))}

                    <button
                      type="button"
                      onClick={() =>
                        setCurrentPage((page) =>
                          Math.min(totalPages, page + 1)
                        )
                      }
                      disabled={currentPage === totalPages}
                      className={`h-9 rounded-lg border border-[#d7e6f5] bg-white px-4 text-xs font-semibold text-[#374151] transition hover:bg-[#eef5fc] disabled:cursor-not-allowed disabled:opacity-45 ${UI.ring}`}
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

      <CustomDateRangeModal
        open={customDateOpen}
        startDate={customDateFrom}
        endDate={customDateTo}
        onCancel={() => setCustomDateOpen(false)}
        onApply={applyCustomDate}
      />
    </AdminLayout>
  );
};

export default AdminJobApplicants;
