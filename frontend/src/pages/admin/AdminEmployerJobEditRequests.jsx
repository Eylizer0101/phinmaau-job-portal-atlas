import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Eye, RefreshCw, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import Pagination from '../../components/shared/Pagination';

const cn = (...classes) => classes.filter(Boolean).join(' ');
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const formatDate = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime())
    ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';
};
const companyName = (item) => item?.job?.companyName || item?.employer?.employerProfile?.companyName || item?.employer?.fullName || 'Employer';
const industryName = (item) => item?.job?.industry || item?.job?.category || item?.employer?.employerProfile?.industry || 'Company';
const statusBadgeClass = (status = '') => ({
  pending: 'border-[#f0c58d] bg-[#fff6e8] text-[#d97706]',
  approved: 'border-[#9fe4bf] bg-[#e8fbf0] text-[#059669]',
  rejected: 'border-[#ffb8b8] bg-[#fff0f0] text-[#ef4444]',
  declined: 'border-[#ffb8b8] bg-[#fff0f0] text-[#ef4444]',
  expired: 'border-slate-300 bg-slate-100 text-slate-600',
  no_response: 'border-slate-300 bg-slate-100 text-slate-600',
}[String(status).toLowerCase()] || 'border-slate-300 bg-slate-50 text-slate-600');

const companyLogo = (item) => item?.job?.companyLogo || item?.employer?.employerProfile?.companyLogo || '';
const displayStatus = (status = '') => {
  const normalized = String(status || 'pending').toLowerCase();
  if (normalized === 'rejected') return 'Declined';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1).replaceAll('_', ' ');
};
const getInitials = (name = '') => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'CO';
  if (parts.length === 1) return parts[0].slice(0, 3).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
};

const CompanyLogo = ({ item, name }) => {
  const [failed, setFailed] = useState(false);
  const logo = companyLogo(item);

  if (!logo || failed) {
    return <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#1458ad] px-1 text-center text-[10px] font-extrabold text-white shadow-sm">{getInitials(name)}</div>;
  }

  return <img src={logo} alt={`${name} logo`} onError={() => setFailed(true)} className="h-11 w-11 shrink-0 rounded-xl border border-slate-100 bg-white object-cover shadow-sm" />;
};
const formatDateInput = (date) => {
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return '';
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
};

const formatDateRangeLabel = (value) => {
  if (!value) return 'Select date';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return 'Select date';
  return date.toLocaleDateString('en-PH', { month: 'short', day: '2-digit', year: 'numeric' });
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
  const firstWeekday = new Date(year, month, 1).getDay();
  const gridStart = new Date(year, month, 1 - firstWeekday);
  const start = startDate ? new Date(`${startDate}T00:00:00`) : null;
  const end = endDate ? new Date(`${endDate}T00:00:00`) : null;
  const days = Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + index);
    return day;
  });
  const isSameDay = (a, b) => a && b && a.toDateString() === b.toDateString();
  const inRange = (day) => start && end && day >= start && day <= end;

  return <div className="min-w-0 flex-1">
    <div className="mb-4 grid grid-cols-[32px_1fr_32px] items-center gap-2">
      <button type="button" onClick={() => onChangeMonth(addCalendarMonths(monthDate, -1))} className="flex h-8 w-8 items-center justify-center rounded-lg text-2xl text-slate-600 hover:bg-slate-100" aria-label="Previous month">‹</button>
      <div className="grid grid-cols-[1fr_92px] gap-2">
        <select value={month} onChange={(event) => onChangeMonth(new Date(year, Number(event.target.value), 1))} className="h-10 rounded-lg border border-slate-200 bg-white px-2 text-center text-sm font-extrabold text-[#2e66a6] outline-none focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/20" aria-label="Select month">
          {MONTH_NAMES.map((name, index) => <option key={name} value={index}>{name}</option>)}
        </select>
        <select value={year} onChange={(event) => onChangeMonth(new Date(Number(event.target.value), month, 1))} className="h-10 rounded-lg border border-slate-200 bg-white px-2 text-center text-sm font-extrabold text-[#2e66a6] outline-none focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/20" aria-label="Select year">
          {getYearOptions().map((yearOption) => <option key={yearOption} value={yearOption}>{yearOption}</option>)}
        </select>
      </div>
      <button type="button" onClick={() => onChangeMonth(addCalendarMonths(monthDate, 1))} className="flex h-8 w-8 items-center justify-center rounded-lg text-2xl text-slate-600 hover:bg-slate-100" aria-label="Next month">›</button>
    </div>
    <div className="grid grid-cols-7 gap-y-2 text-center text-xs font-bold text-slate-500">
      {['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'].map((day) => <div key={day}>{day}</div>)}
    </div>
    <div className="mt-3 grid grid-cols-7 gap-y-1 text-center text-sm text-slate-600">
      {days.map((day) => {
        const value = formatDateInput(day);
        const outside = day.getMonth() !== month;
        const selected = isSameDay(day, start) || isSameDay(day, end);
        return <button type="button" key={value} onClick={() => onPickDate(value)} className={cn(
          'mx-auto flex h-10 w-full items-center justify-center transition focus:outline-none focus:ring-2 focus:ring-[#2e66a6]/20',
          outside ? 'text-slate-300' : 'text-slate-700',
          inRange(day) ? 'bg-[#2e66a6]/10 text-[#2e66a6]' : '',
          selected ? 'rounded-lg bg-[#2e66a6] font-extrabold text-white shadow-md' : 'hover:bg-[#2e66a6]/10'
        )}>{day.getDate()}</button>;
      })}
    </div>
  </div>;
};

const CustomDateRangeModal = ({ open, startDate, endDate, onCancel, onApply }) => {
  const todayValue = formatDateInput(new Date());
  const initialStart = startDate || todayValue;
  const initialEnd = endDate || todayValue;
  const [draftStart, setDraftStart] = useState(initialStart);
  const [draftEnd, setDraftEnd] = useState(initialEnd);
  const [leftMonth, setLeftMonth] = useState(new Date(`${initialStart}T00:00:00`));
  const [rightMonth, setRightMonth] = useState(new Date(`${initialEnd}T00:00:00`));

  useEffect(() => {
    if (!open) return;
    const nextStart = startDate || formatDateInput(new Date());
    const nextEnd = endDate || nextStart;
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
    } else if (new Date(`${value}T00:00:00`) < new Date(`${draftStart}T00:00:00`)) {
      setDraftEnd(draftStart);
      setDraftStart(value);
    } else {
      setDraftEnd(value);
    }
  };

  return <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 px-4 py-6">
    <div className="w-full max-w-[920px] overflow-hidden rounded-xl bg-white shadow-2xl">
      <div className="grid gap-6 px-6 pb-5 pt-6 md:grid-cols-[1fr_auto_1fr] md:items-end">
        <div><div className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-500">Start Date</div><div className="flex h-14 items-center gap-3 rounded-xl bg-slate-100 px-5 text-xl font-extrabold text-[#2e66a6]"><CalendarDays size={20} />{formatDateRangeLabel(draftStart)}</div></div>
        <div className="hidden pb-4 text-3xl text-slate-500 md:block">→</div>
        <div><div className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-500">End Date</div><div className="flex h-14 items-center gap-3 rounded-xl bg-slate-100 px-5 text-xl font-extrabold text-[#2e66a6]"><CalendarDays size={20} />{formatDateRangeLabel(draftEnd)}</div></div>
      </div>
      <div className="grid gap-8 px-6 pb-5 md:grid-cols-2">
        <CalendarMonth monthDate={leftMonth} startDate={draftStart} endDate={draftEnd} onPickDate={pickDate} onChangeMonth={setLeftMonth} />
        <CalendarMonth monthDate={rightMonth} startDate={draftStart} endDate={draftEnd} onPickDate={pickDate} onChangeMonth={setRightMonth} />
      </div>
      <div className="flex items-center justify-end gap-5 border-t border-slate-100 px-6 py-5">
        <button type="button" onClick={onCancel} className="text-base font-bold text-slate-600 transition hover:text-slate-900">Cancel</button>
        <button type="button" onClick={() => draftStart && draftEnd && onApply(draftStart, draftEnd)} disabled={!draftStart || !draftEnd} className="h-12 rounded-xl bg-[#2e66a6] px-9 text-base font-extrabold text-white shadow-lg shadow-[#2e66a6]/25 transition hover:bg-[#255487] disabled:cursor-not-allowed disabled:opacity-60">Apply Range</button>
      </div>
    </div>
  </div>;
};
const presetRange = (filter) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const result = { from: null, to: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999) };
  if (filter === 'all') return { from: null, to: null };
  if (filter === 'today') result.from = today;
  if (filter === 'yesterday') { result.from = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1); result.to = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 23, 59, 59, 999); }
  if (filter === 'week') { const offset = today.getDay() === 0 ? 6 : today.getDay() - 1; result.from = new Date(today.getFullYear(), today.getMonth(), today.getDate() - offset); }
  if (filter === 'sevenDays') result.from = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6);
  if (filter === 'month') result.from = new Date(today.getFullYear(), today.getMonth(), 1);
  if (filter === 'lastMonth') { result.from = new Date(today.getFullYear(), today.getMonth() - 1, 1); result.to = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999); }
  if (filter === 'year') result.from = new Date(today.getFullYear(), 0, 1);
  if (filter === 'lastYear') { result.from = new Date(today.getFullYear() - 1, 0, 1); result.to = new Date(today.getFullYear() - 1, 11, 31, 23, 59, 59, 999); }
  return result;
};

const statusRequestStatus = (item = {}) => {
  const request = item?.employmentStatusRequest || {};
  const directStatus = String(request.status || '').toLowerCase();
  if (['approved', 'declined', 'no_response'].includes(directStatus)) return directStatus;

  const employerDecision = String(request.employerResponse?.decision || '').toLowerCase();
  if (['approved', 'declined', 'no_response'].includes(employerDecision)) return employerDecision;

  const legacyAdminDecision = String(request.adminDecision?.decision || '').toLowerCase();
  if (['approved', 'declined'].includes(legacyAdminDecision)) return legacyAdminDecision;

  return 'pending';
};

const personName = (user = {}) =>
  user?.fullName ||
  [user?.firstName, user?.middleName, user?.lastName].filter(Boolean).join(' ') ||
  'Job Seeker';

const requestRowName = (item = {}) =>
  item.rowType === 'status_request'
    ? personName(item.jobseeker)
    : companyName(item);

const requestRowSubtext = (item = {}) => {
  if (item.rowType === 'status_request') {
    return item?.jobseeker?.email || item?.job?.companyName || 'Job Seeker';
  }

  return (
    item?.employer?.employerProfile?.companyWebsiteUrl ||
    item?.employer?.email ||
    industryName(item)
  );
};

const requestRoleLabel = (item = {}) =>
  item.rowType === 'status_request' ? 'Job Seeker' : 'Employer';

const requestTypeLabel = (item = {}) =>
  item.rowType === 'status_request' ? 'Status Request' : 'Job Post';

const requestDateValue = (item = {}) =>
  item.rowType === 'status_request'
    ? item?.employmentStatusRequest?.requestedAt
    : item?.createdAt;

const normalizedRowStatus = (item = {}) => {
  if (item.rowType === 'status_request') return statusRequestStatus(item);
  const value = String(item.status || 'pending').toLowerCase();
  return value === 'rejected' ? 'declined' : value;
};

const rowDetailsPath = (item = {}) => {
  if (item.rowType === 'status_request') {
    const jobseekerId = item?.jobseeker?._id || item?.jobseeker;
    return jobseekerId ? `/admin/jobseeker-status-requests/${jobseekerId}` : '';
  }

  return item?._id ? `/admin/employer-job-edit-requests/${item._id}/review` : '';
};

const AdminEmployerJobEditRequests = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('all');
  const [requestType, setRequestType] = useState('all');
  const [status, setStatus] = useState('all');
  const [time, setTime] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError('');

    Promise.all([
      api.get('/job-edit-requests/admin'),
      api.get('/applications/admin/employment-status-requests'),
    ])
      .then(([jobEditResponse, statusRequestResponse]) => {
        if (!active) return;

        const employerRequests = (jobEditResponse.data?.requests || []).map((item) => ({
          ...item,
          rowType: 'job_post',
        }));

        const jobseekerRequests = (statusRequestResponse.data?.requests || []).map((item) => ({
          ...item,
          rowType: 'status_request',
        }));

        setRequests([...employerRequests, ...jobseekerRequests]);
      })
      .catch((requestError) => {
        if (!active) return;
        setError(requestError.response?.data?.message || 'Unable to load edit requests.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (role === 'employer' && status === 'no_response') {
      setStatus('all');
    }
  }, [role, status]);

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    const range = time === 'custom'
      ? {
          from: dateFrom ? new Date(`${dateFrom}T00:00:00`) : null,
          to: dateTo ? new Date(`${dateTo}T23:59:59.999`) : null,
        }
      : presetRange(time);

    return requests
      .filter((item) => {
        const rowRole = item.rowType === 'status_request' ? 'jobseeker' : 'employer';
        const rowType = item.rowType;
        const rowStatus = normalizedRowStatus(item);
        const created = new Date(requestDateValue(item));
        const name = requestRowName(item);
        const subtext = requestRowSubtext(item);
        const searchable = [
          name,
          subtext,
          requestRoleLabel(item),
          requestTypeLabel(item),
          item?.job?.companyName,
          item?.job?.title,
          industryName(item),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return (
          (!query || searchable.includes(query)) &&
          (role === 'all' || role === rowRole) &&
          (requestType === 'all' || requestType === rowType) &&
          (status === 'all' || status === rowStatus) &&
          (!range.from || (!Number.isNaN(created.getTime()) && created >= range.from)) &&
          (!range.to || (!Number.isNaN(created.getTime()) && created <= range.to))
        );
      })
      .sort(
        (a, b) =>
          (new Date(requestDateValue(b)).getTime() || 0) -
          (new Date(requestDateValue(a)).getTime() || 0)
      );
  }, [requests, search, role, requestType, status, time, dateFrom, dateTo]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, role, requestType, status, time, dateFrom, dateTo]);

  const paginatedRows = useMemo(() => {
    if (pageSize === 'all') return rows;
    const start = (currentPage - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, currentPage, pageSize]);

  const changeTime = (value) => {
    if (value === 'custom') {
      setShowCustomDate(true);
      return;
    }

    setTime(value);
    setDateFrom('');
    setDateTo('');
  };

  const hasActiveFilters =
    Boolean(search.trim()) ||
    role !== 'all' ||
    requestType !== 'all' ||
    status !== 'all' ||
    time !== 'all' ||
    Boolean(dateFrom) ||
    Boolean(dateTo);

  const clearFilters = () => {
    setSearch('');
    setRole('all');
    setRequestType('all');
    setStatus('all');
    setTime('all');
    setDateFrom('');
    setDateTo('');
    setShowCustomDate(false);
  };

  const openRequest = (item) => {
    const path = rowDetailsPath(item);
    if (!path) return;

    if (item.rowType === 'status_request') {
      navigate(path);
      return;
    }

    navigate(path);
  };

  return <div className="mx-auto max-w-[1500px] space-y-6 py-8">
    <header>
      <h1 className="text-[33px] font-semibold leading-[40px] text-slate-950">Edit Requests</h1>
      <p className="mt-1 text-sm text-[#526d91]">Manage employer requests and job seeker status approvals.</p>
    </header>

    <section className={cn(
      'grid gap-3 rounded-2xl border border-[#dbe3ee] bg-white p-4 shadow-[0_2px_5px_rgba(15,23,42,0.08)] md:grid-cols-2',
      hasActiveFilters
        ? 'xl:grid-cols-[1.45fr_repeat(4,minmax(0,1fr))_96px]'
        : 'xl:grid-cols-[1.45fr_repeat(4,minmax(0,1fr))]'
    )}>
      <label className="relative block min-w-0">
        <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#667f9f]" size={18} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search request..."
          className="h-12 w-full rounded-xl border border-[#d7e0eb] bg-white pl-11 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-[#526d91] focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/10"
        />
      </label>

      <select value={role} onChange={(e) => setRole(e.target.value)} className="h-12 w-full rounded-xl border border-[#d7e0eb] bg-white px-4 text-sm text-slate-900 outline-none focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/10">
        <option value="all">All Role</option>
        <option value="jobseeker">Job Seeker</option>
        <option value="employer">Employer</option>
      </select>

      <select value={requestType} onChange={(e) => setRequestType(e.target.value)} className="h-12 w-full rounded-xl border border-[#d7e0eb] bg-white px-4 text-sm text-slate-900 outline-none focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/10">
        <option value="all">All Type</option>
        <option value="status_request">Status Request</option>
        <option value="job_post">Job Post</option>
      </select>

      <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-12 w-full rounded-xl border border-[#d7e0eb] bg-white px-4 text-sm text-slate-900 outline-none focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/10">
        <option value="all">All Status</option>
        <option value="pending">Pending</option>
        <option value="approved">Approved</option>
        <option value="declined">Declined</option>
        {role !== 'employer' && <option value="no_response">No Response</option>}
      </select>

      <div className="relative min-w-0">
        <select value={time} onChange={(e) => changeTime(e.target.value)} className="h-12 w-full appearance-none rounded-xl border border-[#d7e0eb] bg-white px-4 pr-11 text-sm text-slate-900 outline-none focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/10">
          <option value="all">All Time</option>
          <option value="today">Today</option>
          <option value="yesterday">Yesterday</option>
          <option value="week">This Week</option>
          <option value="sevenDays">Last 7 Days</option>
          <option value="month">This Month</option>
          <option value="lastMonth">Last Month</option>
          <option value="year">This Year</option>
          <option value="lastYear">Last Year</option>
          <option value="custom">Custom Range</option>
        </select>
        <CalendarDays className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#667f9f]" size={17} />
      </div>

      {hasActiveFilters && (
        <button
          type="button"
          onClick={clearFilters}
          className="inline-flex h-12 w-full min-w-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-[#2e66a6]/30 bg-[#2e66a6]/5 px-3 text-sm font-semibold text-[#24558d] transition-all duration-200 hover:border-[#2e66a6] hover:bg-[#2e66a6] hover:text-white focus:outline-none focus-visible:ring-4 focus-visible:ring-[#2e66a6]/15"
        >
          <RefreshCw size={16} /> Clear All
        </button>
      )}
    </section>

    {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

    <section className="overflow-hidden rounded-2xl border border-[#dbe3ee] bg-white shadow-[0_2px_5px_rgba(15,23,42,0.08)]">
      <div className={cn('overflow-x-auto overscroll-auto', pageSize === 10 ? 'overflow-y-visible' : 'max-h-[812px] overflow-y-auto')}>
        <table className="w-full min-w-[1040px] text-left">
          <thead className="border-b border-[#dbe3ee] bg-white text-[11px] font-medium uppercase tracking-[0.08em] text-[#526d91]">
            <tr>
              <th className="px-6 py-5">Request Date</th>
              <th className="px-6 py-5">Name</th>
              <th className="px-6 py-5">Role</th>
              <th className="px-6 py-5">Request Type</th>
              <th className="px-6 py-5">Status</th>
              <th className="px-6 py-5 text-center">Action</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[#dbe3ee]">
            {loading && <tr aria-hidden="true"><td colSpan="6" className="h-56 bg-white" /></tr>}

            {!loading && paginatedRows.map((item) => {
              const name = requestRowName(item);
              const subtext = requestRowSubtext(item);
              const itemStatus = normalizedRowStatus(item);

              return <tr
                key={`${item.rowType}-${item._id}`}
                role="button"
                tabIndex={0}
                onClick={() => openRequest(item)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openRequest(item);
                  }
                }}
                className="cursor-pointer transition hover:bg-[#f7faff] focus-visible:bg-[#f7faff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2e66a6]/25"
                aria-label={`View ${requestTypeLabel(item)} for ${name}`}
              >
                <td className="px-6 py-[18px] text-[13px] text-[#526d91]">{formatDate(requestDateValue(item))}</td>

                <td className="px-6 py-[18px]">
                  <div className="min-w-[220px]">
                    <p className="truncate text-sm font-semibold text-slate-950">{name}</p>
                    <p className="mt-1 truncate text-xs text-[#526d91]">{subtext || '—'}</p>
                  </div>
                </td>

                <td className="px-6 py-[18px] text-sm text-slate-900">{requestRoleLabel(item)}</td>
                <td className="px-6 py-[18px] text-sm text-slate-900">{requestTypeLabel(item)}</td>

                <td className="px-6 py-[18px]">
                  <span className={`inline-flex min-w-[82px] justify-center rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${statusBadgeClass(itemStatus)}`}>
                    {displayStatus(itemStatus)}
                  </span>
                </td>

                <td className="px-6 py-[18px] text-center">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      openRequest(item);
                    }}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-[#2e66a6] hover:bg-[#2e66a6] hover:text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2e66a6]/15"
                    aria-label="View request"
                    title="View request"
                  >
                    <Eye size={17} />
                  </button>
                </td>
              </tr>;
            })}

            {!loading && !rows.length && (
              <tr>
                <td colSpan="6" className="px-6 py-16 text-center text-sm text-slate-500">
                  No requests match the selected filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {!loading && rows.length >= 10 && (
        <Pagination
          currentPage={currentPage}
          totalItems={rows.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          isLoading={loading}
          enableLoadingTransition
          className="!min-h-[50px] !py-2"
        />
      )}
    </section>

    <CustomDateRangeModal
      open={showCustomDate}
      startDate={dateFrom}
      endDate={dateTo}
      onCancel={() => setShowCustomDate(false)}
      onApply={(from, to) => {
        setDateFrom(from);
        setDateTo(to);
        setTime('custom');
        setShowCustomDate(false);
      }}
    />
  </div>;
};

export default AdminEmployerJobEditRequests;
