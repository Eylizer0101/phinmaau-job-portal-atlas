import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import AdminLayout from '../../layouts/AdminLayout';
import api from '../../services/api';
import Pagination from '../../components/shared/Pagination';

const cn = (...classes) => classes.filter(Boolean).join(' ');
const ROLE_OPTIONS = [['all', 'All Roles'], ['jobseeker', 'Jobseeker'], ['employer', 'Employer']];
const ACTION_CODES = {
  'auth.login': 'LOGIN', 'auth.register_jobseeker': 'REGISTER', 'auth.register_employer': 'REGISTER',
  'profile.updated': 'UPDATE_PROFILE', 'company.profile_updated': 'UPDATE_PROFILE',
  'profile.salary_expectation_updated': 'UPDATE_PROFILE', 'profile.resume_uploaded': 'UPDATE_PROFILE',
  'profile.photo_uploaded': 'UPDATE_PROFILE', 'profile.work_experience_created': 'UPDATE_PROFILE',
  'profile.work_experience_updated': 'UPDATE_PROFILE', 'profile.work_experience_deleted': 'UPDATE_PROFILE',
  'verification.jobseeker_document_uploaded': 'UPLOAD_CREDENTIAL',
  'verification.employer_document_uploaded': 'UPLOAD_CREDENTIAL',
  'verification.document_resubmitted': 'RESUBMIT_CREDENTIAL',
  'job.created': 'JOB_POST', 'job.updated': 'UPDATE_JOB', 'job.archived': 'ARCHIVE_JOB',
  'job.permanently_deleted': 'DELETE_JOB', 'job.restored': 'RESTORE_JOB',
  'job.status_updated': 'UPDATE_JOB_STATUS', 'job.edit_requested': 'EDIT_REQUEST',
  'application.submitted': 'APPLY', 'application.withdrawn': 'WITHDRAW_APPLICATION',
  'application.reactivated': 'REACTIVATE_APPLICATION', 'application.status_updated': 'UPDATE_APPLICATION',
  'application.interview_scheduled': 'UPDATE_INTERVIEW',
  'application.hiring_stage_updated': 'UPDATE_APPLICATION', 'company.review_submitted': 'SUBMIT_REVIEW',
};

const Icon = ({ name, className = 'h-5 w-5' }) => {
  const paths = {
    search: <path strokeLinecap="round" d="m21 21-4.4-4.4m1.4-5.1a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z" />,
    calendar: <><path strokeLinecap="round" d="M7 3v3m10-3v3M4.5 9.5h15" /><rect x="4.5" y="5" width="15" height="15" rx="2.5" /></>,
    down: <path strokeLinecap="round" d="m8 10 4 4 4-4" />,
    activity: <path strokeLinecap="round" d="M4 18V9m5 9V5m5 13v-7m5 7V3" />,
  };
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.9" aria-hidden="true">{paths[name]}</svg>;
};

const Dropdown = ({ value, options, onChange, label, icon }) => {
  const [open, setOpen] = useState(false);
  const selected = options.find(([key]) => key === value) || options[0];
  return <div className="relative">
    <button type="button" onClick={() => setOpen(!open)} onBlur={() => window.setTimeout(() => setOpen(false), 120)} aria-label={label}
      className="flex h-11 w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 shadow-sm hover:border-slate-300 focus:border-[#212C61] focus:outline-none focus:ring-2 focus:ring-[#212C61]/10">
      {icon ? <Icon name={icon} className="h-4 w-4 text-slate-500" /> : null}
      <span className="flex-1 text-left">{selected[1]}</span><Icon name="down" className={`h-4 w-4 transition ${open ? 'rotate-180' : ''}`} />
    </button>
    {open ? <div className="absolute left-0 top-[calc(100%+6px)] z-50 min-w-full rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
      {options.map(([key, text]) => <button key={key} type="button" onMouseDown={(event) => event.preventDefault()}
        onClick={() => { onChange(key); setOpen(false); }}
        className={`block w-full whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50 ${key === value ? 'bg-[#212C61]/10 font-bold text-[#212C61]' : 'text-slate-700'}`}>{text}</button>)}
    </div> : null}
  </div>;
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

  return createPortal(
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
    </div>,
    document.body
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



const formatDateTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  const datePart = date.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric' });
  const timePart = date.toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit', hour12: true });
  return `${datePart} ${timePart}`;
};
const getInitials = (name = '') => String(name).trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'U';
const getActionCode = (action = '') => ACTION_CODES[action] || (String(action).split('.').pop() || 'ACTIVITY').replace(/[^a-z0-9]+/gi, '_').toUpperCase();
const getActionLabel = (action = '') => getActionCode(action)
  .toLowerCase()
  .split('_')
  .filter(Boolean)
  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
  .join(' ');

const AdminSystemLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pagination, setPagination] = useState({ page: 1, pageCount: 1, total: 0 });
  const [filters, setFilters] = useState({
    search: '',
    role: 'all',
    date: 'all',
    dateFrom: '',
    dateTo: '',
  });
  const [search, setSearch] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(filters.search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [filters.search]);

  const updateFilter = (key, value) => { setFilters((old) => ({ ...old, [key]: value })); setPage(1); };
  const loadLogs = useCallback(async () => {
    try {
      setLoading(true); setError('');
      const response = await api.get('/admin/system-logs', {
        params: {
          q: search,
          role: filters.role,
          date: filters.date,
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
          page,
          limit: pageSize === 'all' ? 100000 : pageSize,
        },
      });
      if (!response.data?.success) throw new Error(response.data?.message || 'Unable to load activity logs.');
      setLogs(response.data.data || []);
      setPagination(response.data.pagination || { page: 1, pageCount: 1, total: 0 });
    } catch (requestError) {
      setLogs([]); setError(requestError.response?.data?.message || requestError.message || 'Failed to load activity logs.');
    } finally { setLoading(false); }
  }, [search, filters.role, filters.date, filters.dateFrom, filters.dateTo, page, pageSize]);
  useEffect(() => { loadLogs(); }, [loadLogs]);

  return <AdminLayout><main className="mx-auto w-full max-w-[1480px] px-1 py-7 sm:py-8">
    <header className="mb-5"><h1 className="text-[30px] font-semibold leading-tight tracking-[-0.02em] text-slate-950 sm:text-[34px]">Activity Logs</h1>
      <p className="mt-1.5 text-sm text-slate-500">Monitor the important activities performed by Jobseekers and Employers.</p></header>
    <section className="relative z-30 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_28px_rgba(15,23,42,0.06)]">
      <div className="grid gap-3 md:grid-cols-[minmax(320px,1fr)_220px_220px]">
        <label className="relative"><span className="sr-only">Search activity logs</span><Icon name="search" className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input type="search" value={filters.search} onChange={(event) => updateFilter('search', event.target.value)} placeholder="Search user or activity..."
            className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-4 text-sm text-slate-900 shadow-sm outline-none focus:border-[#212C61] focus:ring-2 focus:ring-[#212C61]/10" /></label>
        <Dropdown value={filters.role} options={ROLE_OPTIONS} onChange={(value) => updateFilter('role', value)} label="Filter by role" />
        <DateFilterDropdown
          value={filters.date}
          dateFrom={filters.dateFrom}
          dateTo={filters.dateTo}
          onChange={({ date, dateFrom, dateTo }) => {
            setFilters((old) => ({ ...old, date, dateFrom, dateTo }));
            setPage(1);
          }}
        />
      </div>
    </section>
    <section className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_32px_rgba(15,23,42,0.06)]">
      <div className="max-w-full overflow-x-auto lg:overflow-x-hidden"><div className="min-w-[760px] lg:min-w-0">
        <div className="grid grid-cols-[1fr_1.5fr_0.8fr_1.2fr] gap-5 border-b border-slate-200 bg-[#2e66a6]/[0.055] px-5 py-4 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-600">
          <span>Date & Time</span><span>Performed By</span><span>Role</span><span>Action</span>
        </div>
        {loading ? <div className="p-16 text-center text-sm text-slate-500">Loading activity logs...</div>
          : error ? <div className="p-16 text-center"><p className="font-bold text-rose-600">{error}</p><button type="button" onClick={loadLogs} className="mt-4 rounded-xl bg-[#212C61] px-4 py-2 text-sm font-bold text-white">Retry</button></div>
          : logs.length === 0 ? <div className="flex min-h-[300px] flex-col items-center justify-center text-center"><Icon name="activity" className="h-8 w-8 text-[#212C61]" /><h2 className="mt-3 font-bold text-slate-900">No activity logs found</h2><p className="mt-1 text-sm text-slate-500">Jobseeker and Employer activities will appear here.</p></div>
          : <div className="divide-y divide-slate-100">{logs.map((log) => {
            const created = formatDateTime(log.createdAt);
            const employer = String(log.actorRole).toLowerCase() === 'employer';
            return <div key={log.id} className="grid grid-cols-[1fr_1.5fr_0.8fr_1.2fr] items-center gap-5 px-5 py-4 transition-colors hover:bg-[#2e66a6]/[0.045]">
              <div><p className="text-sm font-bold text-slate-800">{created}</p></div>
              <div className="flex min-w-0 items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#212C61]/10 text-[11px] font-bold text-[#212C61]">{getInitials(log.actorName)}</span><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-900">{log.actorName || 'Unknown user'}</p><p className="truncate text-[11px] text-slate-500">{log.actorEmail || 'No email recorded'}</p></div></div>
              <span className={`w-fit rounded-full border px-3 py-1 text-[11px] font-bold capitalize ${employer ? 'border-violet-200 bg-violet-50 text-violet-700' : 'border-blue-200 bg-blue-50 text-blue-700'}`}>{log.actorRole}</span>
              <div className="min-w-0"><p className="truncate text-sm font-bold text-slate-900" title={getActionCode(log.action)}>{getActionLabel(log.action)}</p><p className="truncate text-[11px] font-medium text-[#212C61]/70">{log.module || 'Activity'}</p></div>
            </div>;
          })}</div>}
      </div></div>
      <Pagination
        currentPage={pagination.page || page}
        totalItems={pagination.total || 0}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        ariaLabel="Activity logs pagination"
        className={loading ? 'pointer-events-none opacity-60' : ''}
      />
    </section>
  </main></AdminLayout>;
};

export default AdminSystemLogs;
