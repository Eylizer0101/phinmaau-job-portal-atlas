import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../layouts/AdminLayout';
import api from '../../services/api';

const cn = (...classes) => classes.filter(Boolean).join(' ');

const ITEMS_PER_PAGE = 10;

const Icon = ({ name, className = 'h-4 w-4' }) => {
  const common = { className, fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24', strokeWidth: 2 };
  const icons = {
    search: <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m1.1-5.4a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" />,
    calendar: <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3M5 11h14M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />,
    chevron: <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />,
    eye: <><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12s3.75-6.75 9.75-6.75S21.75 12 21.75 12 18 18.75 12 18.75 2.25 12 2.25 12z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></>,
    user: <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 7.5a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 21a7.5 7.5 0 0115 0" />,
    refresh: <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v6h6M20 20v-6h-6M5 15a7 7 0 0012 3l3-4M19 9A7 7 0 007 6L4 10" />,
    briefcase: <><path strokeLinecap="round" strokeLinejoin="round" d="M10 6h4a2 2 0 012 2v1h3a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2v-7a2 2 0 012-2h3V8a2 2 0 012-2z" /><path strokeLinecap="round" strokeLinejoin="round" d="M10 9h4" /></>,
    building: <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1" />,
    clock: <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />,
    x: <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />,
  };
  return <svg {...common}>{icons[name] || null}</svg>;
};

const formatDate = (value) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
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
  { value: 'lastYear', label: 'Last Year' },
  { value: 'custom', label: 'Custom Range' },
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

const formatDateInput = (date) => {
  if (!date) return '';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const getPresetDateRange = (value) => {
  const today = new Date();
  const current = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  if (value === 'today') {
    return { dateFrom: formatDateInput(current), dateTo: formatDateInput(current) };
  }

  if (value === 'yesterday') {
    const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
    return { dateFrom: formatDateInput(yesterday), dateTo: formatDateInput(yesterday) };
  }

  if (value === 'thisWeek') {
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    return {
      dateFrom: formatDateInput(
        new Date(today.getFullYear(), today.getMonth(), today.getDate() - mondayOffset)
      ),
      dateTo: formatDateInput(current),
    };
  }

  if (value === '7days') {
    return {
      dateFrom: formatDateInput(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6)),
      dateTo: formatDateInput(current),
    };
  }

  if (value === 'thisMonth') {
    return {
      dateFrom: formatDateInput(new Date(today.getFullYear(), today.getMonth(), 1)),
      dateTo: formatDateInput(current),
    };
  }

  if (value === 'lastMonth') {
    return {
      dateFrom: formatDateInput(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
      dateTo: formatDateInput(new Date(today.getFullYear(), today.getMonth(), 0)),
    };
  }

  if (value === 'thisYear') {
    return {
      dateFrom: formatDateInput(new Date(today.getFullYear(), 0, 1)),
      dateTo: formatDateInput(current),
    };
  }

  if (value === 'lastYear') {
    return {
      dateFrom: formatDateInput(new Date(today.getFullYear() - 1, 0, 1)),
      dateTo: formatDateInput(new Date(today.getFullYear() - 1, 11, 31)),
    };
  }

  return { dateFrom: '', dateTo: '' };
};

const formatDateRangeLabel = (value) => {
  if (!value) return 'Select date';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return 'Select date';
  return date.toLocaleDateString('en-PH', { month: 'short', day: '2-digit', year: 'numeric' });
};

const getDateFilterLabel = (value, dateFrom, dateTo) => {
  if (value === 'custom' && dateFrom && dateTo) {
    return `${formatDateRangeLabel(dateFrom)} - ${formatDateRangeLabel(dateTo)}`;
  }
  return DATE_FILTER_OPTIONS.find((option) => option.value === value)?.label || 'All Time';
};

const isDateInRange = (dateValue, dateFrom, dateTo) => {
  if (!dateFrom && !dateTo) return true;
  if (!dateValue) return false;

  const target = new Date(dateValue);
  if (Number.isNaN(target.getTime())) return false;

  const targetTime = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  const fromTime = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null;
  const toTime = dateTo ? new Date(`${dateTo}T00:00:00`).getTime() : null;

  if (fromTime && targetTime < fromTime) return false;
  if (toTime && targetTime > toTime) return false;
  return true;
};

const addCalendarMonths = (date, amount) => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + amount);
  return next;
};

const getYearOptions = () => {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: currentYear - 1949 }, (_, index) => 1950 + index);
};

const CalendarMonth = ({ monthDate, startDate, endDate, onPickDate, onChangeMonth }) => {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const firstWeekday = firstDay.getDay();
  const gridStart = new Date(year, month, 1 - firstWeekday);
  const start = startDate ? new Date(`${startDate}T00:00:00`) : null;
  const end = endDate ? new Date(`${endDate}T00:00:00`) : null;

  const days = Array.from({ length: 42 }, (_, index) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + index);
    return d;
  });

  const isSameDay = (a, b) => a && b && a.toDateString() === b.toDateString();
  const inRange = (day) => start && end && day >= start && day <= end;
  const changeByMonth = (amount) => onChangeMonth(addCalendarMonths(monthDate, amount));
  const changeMonthSelect = (nextMonth) => onChangeMonth(new Date(year, Number(nextMonth), 1));
  const changeYearSelect = (nextYear) => onChangeMonth(new Date(Number(nextYear), month, 1));

  return (
    <div className="min-w-0 flex-1">
      <div className="mb-4 grid grid-cols-[32px_1fr_32px] items-center gap-2">
        <button
          type="button"
          onClick={() => changeByMonth(-1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-2xl leading-none text-slate-600 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#2e66a6]/20"
          aria-label="Previous month"
        >
          ‹
        </button>

        <div className="grid grid-cols-[1fr_92px] gap-2">
          <select
            value={month}
            onChange={(event) => changeMonthSelect(event.target.value)}
            className="h-10 rounded-lg border border-slate-200 bg-white px-2 text-center text-sm font-extrabold text-[#2e66a6] outline-none focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/20"
            aria-label="Select month"
          >
            {MONTH_NAMES.map((name, index) => (
              <option key={name} value={index}>{name}</option>
            ))}
          </select>

          <select
            value={year}
            onChange={(event) => changeYearSelect(event.target.value)}
            className="h-10 rounded-lg border border-slate-200 bg-white px-2 text-center text-sm font-extrabold text-[#2e66a6] outline-none focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/20"
            aria-label="Select year"
          >
            {getYearOptions().map((yearOption) => (
              <option key={yearOption} value={yearOption}>{yearOption}</option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => changeByMonth(1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-2xl leading-none text-slate-600 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#2e66a6]/20"
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-y-2 text-center text-xs font-bold text-slate-500">
        {['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'].map((day) => <div key={day}>{day}</div>)}
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
              key={value}
              onClick={() => onPickDate(value)}
              className={cn(
                'mx-auto flex h-10 w-full items-center justify-center transition focus:outline-none focus:ring-2 focus:ring-[#2e66a6]/20',
                outside ? 'text-slate-300' : 'text-slate-700',
                ranged ? 'bg-[#2e66a6]/10 text-[#2e66a6]' : '',
                selected ? 'rounded-lg bg-[#2e66a6] font-extrabold text-white shadow-md' : 'hover:bg-[#2e66a6]/10'
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

const CustomDateRangeModal = ({ open, startDate, endDate, onCancel, onApply }) => {
  const today = new Date();
  const initialStart = startDate || formatDateInput(today);
  const initialEnd = endDate || formatDateInput(today);
  const [draftStart, setDraftStart] = useState(initialStart);
  const [draftEnd, setDraftEnd] = useState(initialEnd);
  const [leftMonth, setLeftMonth] = useState(new Date(`${initialStart}T00:00:00`));
  const [rightMonth, setRightMonth] = useState(new Date(`${initialEnd}T00:00:00`));

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

    if (new Date(`${value}T00:00:00`) < new Date(`${draftStart}T00:00:00`)) {
      setDraftEnd(draftStart);
      setDraftStart(value);
    } else {
      setDraftEnd(value);
    }
  };

  const apply = () => {
    if (!draftStart || !draftEnd) return;
    onApply(draftStart, draftEnd);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 px-4 py-6">
      <div className="w-full max-w-[920px] overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="grid gap-6 px-6 pb-5 pt-6 md:grid-cols-[1fr_auto_1fr] md:items-end">
          <div>
            <div className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-500">Start Date</div>
            <div className="flex h-14 items-center gap-3 rounded-xl bg-slate-100 px-5 text-xl font-extrabold text-[#2e66a6]">
              <Icon name="calendar" className="h-5 w-5" />
              {formatDateRangeLabel(draftStart)}
            </div>
          </div>

          <div className="hidden pb-4 text-3xl text-slate-500 md:block">→</div>

          <div>
            <div className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-500">End Date</div>
            <div className="flex h-14 items-center gap-3 rounded-xl bg-slate-100 px-5 text-xl font-extrabold text-[#2e66a6]">
              <Icon name="calendar" className="h-5 w-5" />
              {formatDateRangeLabel(draftEnd)}
            </div>
          </div>
        </div>

        <div className="grid gap-8 px-6 pb-5 md:grid-cols-2">
          <CalendarMonth monthDate={leftMonth} startDate={draftStart} endDate={draftEnd} onPickDate={pickDate} onChangeMonth={setLeftMonth} />
          <CalendarMonth monthDate={rightMonth} startDate={draftStart} endDate={draftEnd} onPickDate={pickDate} onChangeMonth={setRightMonth} />
        </div>

        <div className="flex items-center justify-end gap-5 border-t border-slate-100 px-6 py-5">
          <button type="button" onClick={onCancel} className="text-base font-bold text-slate-600 transition hover:text-slate-900">
            Cancel
          </button>
          <button
            type="button"
            onClick={apply}
            disabled={!draftStart || !draftEnd}
            className="h-12 rounded-xl bg-[#2e66a6] px-9 text-base font-extrabold text-white shadow-lg shadow-[#2e66a6]/25 transition hover:bg-[#255487] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Apply Range
          </button>
        </div>
      </div>
    </div>
  );
};

const DateFilterDropdown = ({ value, dateFrom, dateTo, onChange }) => {
  const [open, setOpen] = useState(false);
  const [showCustom, setShowCustom] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const close = () => setOpen(false);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [open]);

  const selectOption = (nextValue) => {
    if (nextValue === 'custom') {
      setOpen(false);
      setShowCustom(true);
      return;
    }

    const range = getPresetDateRange(nextValue);
    onChange({ date: nextValue, dateFrom: range.dateFrom, dateTo: range.dateTo });
    setOpen(false);
  };

  const applyCustomRange = (customFrom, customTo) => {
    onChange({ date: 'custom', dateFrom: customFrom, dateTo: customTo });
    setShowCustom(false);
  };

  return (
    <div className="relative w-full">
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setOpen((prev) => !prev);
        }}
        className="flex h-11 w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-gray-300 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2"
      >
        <span className="truncate">{getDateFilterLabel(value, dateFrom, dateTo)}</span>
        <Icon name="calendar" className="h-4 w-4 text-gray-500" />
      </button>

      {open ? (
        <div
          onClick={(event) => event.stopPropagation()}
          className="absolute left-0 top-[68px] z-50 w-64 rounded-2xl border border-gray-100 bg-white p-2 shadow-xl ring-1 ring-black/5"
        >
          <div className="space-y-1">
            {DATE_FILTER_OPTIONS.map((option) => (
              <button
                type="button"
                key={option.value}
                onClick={() => selectOption(option.value)}
                className={cn(
                  'w-full rounded-xl px-3 py-2 text-left text-sm font-semibold transition',
                  value === option.value ? 'bg-[#2e66a6]/10 text-[#2e66a6]' : 'text-gray-600 hover:bg-gray-50'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <CustomDateRangeModal
        open={showCustom}
        startDate={dateFrom}
        endDate={dateTo}
        onCancel={() => setShowCustom(false)}
        onApply={applyCustomRange}
      />
    </div>
  );
};

const truncate = (value, max = 28) => {
  const text = String(value || '').trim();
  if (!text) return 'N/A';
  return text.length > max ? `${text.slice(0, max)}...` : text;
};

const getLogoUrl = (logo) => {
  if (!logo) return '';
  const value = String(logo);
  if (value.startsWith('http')) return value;
  const base = (process.env.REACT_APP_API_URL || 'https://phinmaau-job-portal-atlas.onrender.com/api').replace('/api', '');
  return `${base}${value.startsWith('/') ? value : `/${value}`}`;
};

const statusMeta = (status) => {
  const s = String(status || 'open').toLowerCase();
  if (s === 'open' || s === 'active') {
    return {
      label: 'Open',
      className: 'border-green-200 bg-green-50 text-green-700',
    };
  }
  if (s === 'closed') {
    return {
      label: 'Closed',
      className: 'border-slate-200 bg-slate-100 text-slate-700',
    };
  }
  if (s === 'expired') {
    return {
      label: 'Expired',
      className: 'border-red-200 bg-red-50 text-red-700',
    };
  }
  return {
    label: status || 'Open',
    className: 'border-[#b9d0e8] bg-[#eef5fc] text-[#2e66a6]',
  };
};

const StatCard = ({ label, value, icon }) => (
  <div className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#2e66a6]/30 hover:shadow-md">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-500">{label}</p>
        <p className="mt-3 text-3xl font-bold tracking-[-0.03em] text-black">
          {Number(value || 0).toLocaleString('en-PH')}
        </p>
      </div>
      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#2e66a6]/15 bg-[#2e66a6]/10 text-[#2e66a6]">
        <Icon name={icon} className="h-5 w-5" />
      </div>
    </div>
  </div>
);

const EmptyState = ({ title = 'No job offers found.', subtitle = 'Try changing or clearing the filters to see more results.' }) => (
  <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#2e66a6]/10 text-[#2e66a6]">
      <Icon name="briefcase" className="h-6 w-6" />
    </div>
    <p className="mt-4 text-sm font-bold text-black">{title}</p>
    <p className="mt-1 max-w-sm text-sm text-gray-500">{subtitle}</p>
  </div>
);

const AdminJobOffers = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [stats, setStats] = useState({ totalJobs: 0, active: 0, closed: 0, expired: 0 });
  const [options, setOptions] = useState({ companies: [], industries: [], jobTitles: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({
    search: '',
    status: 'All Status',
    company: 'All Company',
    industry: 'All Industry',
    jobTitle: 'All Job Title',
    date: 'all',
    dateFrom: '',
    dateTo: '',
  });

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = {
        page,
        limit: ITEMS_PER_PAGE,
        search: filters.search,
        status: filters.status !== 'All Status' ? filters.status.toLowerCase() : '',
        company: filters.company !== 'All Company' ? filters.company : '',
        industry: filters.industry !== 'All Industry' ? filters.industry : '',
        jobTitle: filters.jobTitle !== 'All Job Title' ? filters.jobTitle : '',
        date: filters.date,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
      };
      const response = await api.get('/admin/job-offers', { params });
      setJobs(Array.isArray(response.data?.jobs) ? response.data.jobs : []);
      setStats(response.data?.stats || { totalJobs: 0, active: 0, closed: 0, expired: 0 });
      setOptions(response.data?.options || { companies: [], industries: [], jobTitles: [] });
      setTotal(response.data?.pagination?.total || 0);
      setTotalPages(response.data?.pagination?.totalPages || 1);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load job offers.');
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const updateFilter = (key, value) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setPage(1);
    setFilters({ search: '', status: 'All Status', company: 'All Company', industry: 'All Industry', jobTitle: 'All Job Title', date: 'all', dateFrom: '', dateTo: '' });
  };

  const cards = useMemo(() => [
    { label: 'Total Jobs', value: stats.totalJobs, icon: 'briefcase' },
    { label: 'Active', value: stats.active, icon: 'calendar' },
    { label: 'Closed', value: stats.closed, icon: 'x' },
    { label: 'Expired', value: stats.expired, icon: 'clock' },
  ], [stats]);

  const hasActiveFilters = filters.search || filters.status !== 'All Status' || filters.company !== 'All Company' || filters.industry !== 'All Industry' || filters.jobTitle !== 'All Job Title' || filters.date !== 'all' || filters.dateFrom || filters.dateTo;

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gray-50 px-0 py-8">
        <div className="mx-auto w-full max-w-7xl space-y-5 px-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-[-0.02em] text-black">Job Offers</h1>
              <p className="mt-1 text-sm text-gray-600">View, filter, and review all posted job opportunities.</p>
            </div>
          </div>

          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(240px,1.4fr)_repeat(4,minmax(135px,0.75fr))_minmax(190px,1fr)_auto] xl:items-end">
              <label className="relative block">
                <span className="sr-only">Search job offers</span>
                <Icon name="search" className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  value={filters.search}
                  onChange={(e) => updateFilter('search', e.target.value)}
                  placeholder="Search company, job title..."
                  className="h-12 w-full rounded-xl border border-gray-200 bg-white pl-12 pr-4 text-sm text-black outline-none transition placeholder:text-gray-400 hover:border-gray-300 focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/15"
                />
              </label>

              <Select value={filters.jobTitle} onChange={(v) => updateFilter('jobTitle', v)} options={['All Job Title', ...options.jobTitles]} />
              <Select value={filters.company} onChange={(v) => updateFilter('company', v)} options={['All Company', ...options.companies]} />
              <Select value={filters.industry} onChange={(v) => updateFilter('industry', v)} options={['All Industry', ...options.industries]} />
              <Select value={filters.status} onChange={(v) => updateFilter('status', v)} options={['All Status', 'Open', 'Closed', 'Expired']} />

              <DateFilterDropdown
                value={filters.date}
                dateFrom={filters.dateFrom}
                dateTo={filters.dateTo}
                onChange={(next) => setFilters((prev) => ({ ...prev, ...next }))}
              />

              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2"
                >
                  <Icon name="refresh" /> Clear All
                </button>
              ) : null}
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-5 py-4">
              <div>
                <h2 className="text-base font-bold text-black">Job Offer List</h2>
                <p className="mt-0.5 text-xs text-gray-500">Showing {jobs.length ? (page - 1) * ITEMS_PER_PAGE + 1 : 0} to {Math.min(page * ITEMS_PER_PAGE, total)} of {total} results</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {['Company', 'Job Title', 'Applicant', 'Date Posted', 'Valid Until', 'Status', 'Actions'].map((header) => (
                      <th key={header} className="whitespace-nowrap px-6 py-4 text-left text-[11px] font-bold uppercase tracking-[0.14em] text-gray-500">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {loading ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center text-sm text-gray-500">
                        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-[#2e66a6]" />
                        <p className="mt-3">Loading job offers...</p>
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-10">
                        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-semibold text-red-700">
                          {error}
                        </div>
                      </td>
                    </tr>
                  ) : jobs.length === 0 ? (
                    <tr>
                      <td colSpan="7">
                        <EmptyState />
                      </td>
                    </tr>
                  ) : (
                    jobs.map((job) => {
                      const status = statusMeta(job.adminStatus);
                      return (
                        <tr
                          key={job._id}
                          role="link"
                          tabIndex={0}
                          onClick={(event) => {
                            if (event.target.closest("button, a, input, select, textarea, label")) return;
                            navigate(`/admin/jobs/${job._id}`, { state: { backPath: '/admin/job-offers', backLabel: 'Job Offers' } });
                          }}
                          onKeyDown={(event) => {
                            if (event.target !== event.currentTarget) return;
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              navigate(`/admin/jobs/${job._id}`, { state: { backPath: '/admin/job-offers', backLabel: 'Job Offers' } });
                            }
                          }}
                          className="cursor-pointer transition-colors hover:bg-[#2e66a6]/10 focus:bg-[#2e66a6]/10 focus:outline-none"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#2e66a6]/15 bg-[#2e66a6]/10 text-[#2e66a6]">
                                {job.companyLogo ? (
                                  <img src={getLogoUrl(job.companyLogo)} alt={`${job.companyName || 'Company'} logo`} className="h-full w-full object-cover" />
                                ) : (
                                  <Icon name="building" className="h-5 w-5" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="whitespace-nowrap text-sm font-bold text-black">{job.companyName || 'N/A'}</p>
                                <p className="whitespace-nowrap text-xs text-gray-500">{job.category || 'N/A'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <p className="whitespace-nowrap text-sm font-bold text-black">{job.title || 'N/A'}</p>
                            <p className="whitespace-nowrap text-xs text-gray-500">{[job.jobType, job.workMode].filter(Boolean).join(' • ') || 'N/A'}</p>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-center text-sm font-semibold text-black">{job.applicantCount || 0}</td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">{formatDate(job.createdAt)}</td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">{formatDate(job.applicationDeadline)}</td>
                          <td className="whitespace-nowrap px-6 py-4">
                            <span className={cn('inline-flex rounded-full border px-3 py-1 text-[11px] font-bold uppercase', status.className)}>
                              {status.label}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-center">
                            <button
                              type="button"
                              onClick={() => navigate(`/admin/jobs/${job._id}`, { state: { backPath: '/admin/job-offers', backLabel: 'Job Offers' } })}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-gray-500 transition hover:bg-[#eef5fc] hover:text-[#2e66a6] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2"
                              title="View job offer"
                              aria-label="View job offer"
                            >
                              <Icon name="eye" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 px-6 py-4">
              <p className="text-xs text-gray-500">Page {page} of {totalPages}</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>
                {[...Array(Math.min(totalPages, 3))].map((_, i) => {
                  const num = i + 1;
                  return (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setPage(num)}
                      className={cn(
                        'rounded-lg px-3 py-1.5 text-xs font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2',
                        page === num ? 'bg-[#2e66a6] text-white' : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                      )}
                    >
                      {num}
                    </button>
                  );
                })}
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </AdminLayout>
  );
};

const Select = ({ value, onChange, options }) => (
  <label className="relative block">
    <span className="sr-only">Filter option</span>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-12 w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 pr-10 text-sm font-semibold text-gray-700 outline-none transition hover:border-gray-300 focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/15"
    >
      {options.map((option) => <option key={option} value={option}>{option}</option>)}
    </select>
    <Icon name="chevron" className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
  </label>
);

export default AdminJobOffers;
