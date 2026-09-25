import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Check,
  CalendarDays,
  Clock3,
  RefreshCw,
  FileEdit,
  Search,
  ShieldAlert,
  UnlockKeyhole,
  XCircle,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import { BookmarksSvgIcon, JobDetailsSvgIcon } from '../../components/shared/JobseekerIcons';

const API_ORIGIN = 'https://phinmaau-job-portal-atlas.onrender.com';

const assetUrl = (value, fallback = '/images/default-company-logo.png') => {
  const source = String(value || '').trim();
  if (!source) return fallback;
  if (/^(https?:|data:|blob:)/i.test(source)) return source;
  return `${API_ORIGIN}${source.startsWith('/') ? '' : '/'}${source}`;
};

const formatDateTime = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return 'Not specified';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const startOfDay = (value) => {
  const date = new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const cn = (...classes) => classes.filter(Boolean).join(' ');
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

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

const AdminEmployerJobEditRequestReview = () => {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [requestHistory, setRequestHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [time, setTime] = useState('all');
  const [sort, setSort] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [confirmation, setConfirmation] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    let active = true;
    api
      .get(`/job-edit-requests/admin/${requestId}`)
      .then(({ data }) => {
        if (active) {
          const currentRequest = data?.request || null;
          setRequest(currentRequest);
          setRequestHistory(Array.isArray(data?.history) && data.history.length ? data.history : currentRequest ? [currentRequest] : []);
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || 'Unable to load edit request details.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [requestId]);

  useEffect(() => {
    if (!confirmation && !success) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [confirmation, success]);

  useEffect(() => {
    if (!success) return undefined;
    const timer = window.setTimeout(() => setSuccess(null), 3000);
    return () => window.clearTimeout(timer);
  }, [success]);

  const job = request?.job || {};
  const employerProfile = request?.employer?.employerProfile || {};
  const companyName = job.companyName || employerProfile.companyName || 'Employer';
  const industry = job.industry || employerProfile.industry || employerProfile.companyIndustry || 'Industry not specified';

  const filteredRequests = useMemo(() => {
    const query = search.trim().toLowerCase();
    const today = startOfDay(new Date());
    let from = null;
    let to = null;

    if (time === 'today') {
      from = today;
      to = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    } else if (time === 'yesterday') {
      from = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
      to = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 23, 59, 59, 999);
    } else if (time === 'week') {
      const offset = today.getDay() === 0 ? 6 : today.getDay() - 1;
      from = new Date(today.getFullYear(), today.getMonth(), today.getDate() - offset);
      to = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    } else if (time === 'sevenDays') {
      from = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6);
      to = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    } else if (time === 'month') {
      from = new Date(today.getFullYear(), today.getMonth(), 1);
      to = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (time === 'lastMonth') {
      from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      to = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);
    } else if (time === 'year') {
      from = new Date(today.getFullYear(), 0, 1);
      to = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999);
    } else if (time === 'lastYear') {
      from = new Date(today.getFullYear() - 1, 0, 1);
      to = new Date(today.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
    } else if (time === 'custom') {
      from = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
      to = dateTo ? new Date(`${dateTo}T23:59:59.999`) : null;
    }

    const matches = requestHistory.filter((item) => {
      const normalizedStatus = String(item.status || '').toLowerCase();
      const statusMatches = status === 'all' || normalizedStatus === status;
      const createdAt = item.createdAt ? new Date(item.createdAt) : null;
      const validCreatedAt = createdAt && !Number.isNaN(createdAt.getTime());
      const timeMatches =
        (!from || (validCreatedAt && createdAt >= from)) &&
        (!to || (validCreatedAt && createdAt <= to));
      const itemSections = Array.isArray(item.requestedSections) ? item.requestedSections : [];
      const textMatches =
        !query ||
        itemSections.some((section) => String(section).toLowerCase().includes(query)) ||
        String(item.reason || '').toLowerCase().includes(query) ||
        String(item.job?.title || job.title || '').toLowerCase().includes(query);
      return statusMatches && timeMatches && textMatches;
    });

    return [...matches].sort((a, b) => {
      const difference = new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      return sort === 'oldest' ? -difference : difference;
    });
  }, [dateFrom, dateTo, job.title, requestHistory, search, sort, status, time]);

  const hasActiveFilters =
    search.trim() !== '' ||
    status !== 'all' ||
    time !== 'all' ||
    sort !== '' ||
    Boolean(dateFrom) ||
    Boolean(dateTo);

  const clearFilters = () => {
    setSearch('');
    setStatus('all');
    setTime('all');
    setSort('');
    setDateFrom('');
    setDateTo('');
    setShowCustomDate(false);
  };

  const handleTimeChange = (value) => {
    if (value === 'custom') {
      setShowCustomDate(true);
      return;
    }
    setTime(value);
    setDateFrom('');
    setDateTo('');
  };

  const submitDecision = async () => {
    if (!confirmation || submitting || request?.status !== 'pending') return;

    try {
      setSubmitting(true);
      setError('');
      const endpoint = confirmation === 'approve' ? 'approve' : 'decline';
      const { data } = await api.patch(`/job-edit-requests/admin/${request._id}/${endpoint}`);
      setRequest((current) => ({ ...current, ...data?.request }));
      setRequestHistory((items) => items.map((item) => item._id === request._id ? { ...item, ...data?.request } : item));
      setConfirmation(null);
      setStatus('all');
      setSuccess(
        confirmation === 'approve'
          ? {
              title: 'Edit Request Approved',
              message: 'The employer can now edit the job post.',
            }
          : {
              title: 'Edit Request Cancelled',
              message: 'The employer’s edit request was cancelled.',
            }
      );
    } catch (requestError) {
      setConfirmation(null);
      setError(
        requestError.response?.data?.message ||
          `Unable to ${confirmation === 'approve' ? 'approve' : 'decline'} this request.`
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return null;

  if (!request) {
    return (
      <div className="mx-auto mt-10 max-w-xl rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
        {error || 'Edit request not found.'}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent">
      <div className="mx-auto max-w-7xl px-1 py-8">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => navigate(`/admin/employer-job-edit-requests/${requestId}`)}
            className="inline-flex h-11 w-fit shrink-0 items-center justify-center gap-2 rounded-xl border border-[#d8e2ee] bg-white px-4 text-sm font-semibold text-black shadow-sm transition hover:border-[#2e66a6]/40 hover:bg-[#f7faff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6]"
          >
            <ArrowLeft size={17} /> Back
          </button>

          <img
            src={assetUrl(job.companyLogo || employerProfile.companyLogo || employerProfile.logo)}
            alt={`${companyName} logo`}
            className="h-14 w-14 shrink-0 rounded-full border border-[#e6edf5] bg-white object-contain p-1"
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = '/images/default-company-logo.png';
            }}
          />

          <div className="min-w-0">
            <h1 className="min-w-0 text-xl font-semibold text-black sm:text-2xl">
              <span className="truncate">{job.title || 'Untitled Job'}</span>
            </h1>

            <div className="mt-1 flex min-w-0 flex-nowrap items-center gap-x-5 text-sm text-[#55708f]">
              <span className="inline-flex min-w-0 items-center gap-2">
                <JobDetailsSvgIcon name="building" className="h-4 w-4 shrink-0" />
                <span className="truncate">{companyName}</span>
              </span>

              <span className="inline-flex min-w-0 items-center gap-2">
                <BookmarksSvgIcon name="industry" className="h-4 w-4 shrink-0" />
                <span className="truncate">{industry}</span>
              </span>
            </div>
          </div>
        </header>

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        <section className="overflow-hidden rounded-2xl border border-[#d8e2ee] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
          <div className="border-b border-[#e6edf5] px-5 py-5 sm:px-6">
            <div className={cn(
              "grid gap-3",
              hasActiveFilters
                ? "md:grid-cols-[minmax(0,1.55fr)_145px_155px_145px_auto]"
                : "md:grid-cols-[minmax(0,1.55fr)_145px_155px_145px]"
            )}>
              <label className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7890aa]" size={17} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search request, section..."
                  className="h-11 w-full rounded-lg border border-[#cbdcf0] bg-white pl-10 pr-3 text-sm outline-none focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/10"
                />
              </label>

              <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-11 rounded-lg border border-[#cbdcf0] bg-white px-3 text-sm outline-none focus:border-[#2e66a6]">
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Declined</option>
              </select>

              <div className="relative min-w-0">
                <select value={time} onChange={(event) => handleTimeChange(event.target.value)} className="h-11 w-full appearance-none rounded-lg border border-[#cbdcf0] bg-white px-3 pr-9 text-sm outline-none focus:border-[#2e66a6]">
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
                <CalendarDays className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#7890aa]" size={16} />
              </div>

              <select value={sort} onChange={(event) => setSort(event.target.value)} className="h-11 rounded-lg border border-[#cbdcf0] bg-white px-3 text-sm outline-none focus:border-[#2e66a6]">
                <option value="" disabled>Sort By</option>
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-[#2e66a6]/30 bg-[#2e66a6]/5 px-3 text-sm font-semibold text-[#24558d] transition hover:border-[#2e66a6] hover:bg-[#2e66a6] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6]/20"
                >
                  <RefreshCw size={15} /> Clear All
                </button>
              )}
            </div>
          </div>

          <div className="bg-[#fbfdff] p-5 sm:p-6">
            {filteredRequests.length ? (
              <div className="space-y-4">
              {filteredRequests.map((item) => {
                const itemSections = Array.isArray(item.requestedSections) ? item.requestedSections : [];
                const itemIsPending = item.status === 'pending';
                const itemStatusLabel = item.status === 'rejected' ? 'Declined' : item.status;
                const chronologicalNumber = requestHistory
                  .slice()
                  .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0))
                  .findIndex((entry) => entry._id === item._id) + 1;
                const isLatest = requestHistory[0]?._id === item._id;

                return (
              <article key={item._id} className="rounded-xl border border-[#75aef0] bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="flex items-center gap-2 text-lg font-semibold text-black">
                      #{chronologicalNumber} Edit Request
                      {isLatest ? <span className="text-[11px] font-bold uppercase tracking-wide text-[#2e66a6]">New</span> : null}
                    </h3>
                  </div>
                  <span className={`w-fit rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase ${itemIsPending ? 'border-[#f5c979] bg-[#fff7e8] text-[#b55c00]' : item.status === 'approved' ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
                    {itemStatusLabel}
                  </span>
                </div>

                <div className="mt-5">
                  <h4 className="flex items-center gap-2 text-sm font-semibold text-black">
                    <FileEdit size={16} className="shrink-0 text-[#2e66a6]" /> Sections to Edit
                  </h4>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {itemSections.length ? itemSections.map((section) => (
                      <span key={section} className="rounded-lg border border-[#80b3ed] bg-[#f3f8fe] px-3 py-2 text-xs font-semibold text-[#2e66a6]">
                        {section}
                      </span>
                    )) : <span className="text-sm text-[#55708f]">No sections specified.</span>}
                  </div>
                </div>

                <div className="mt-5 rounded-lg border border-[#d7e0ea] bg-[#f4f7fa] p-4">
                  <p className="flex items-center gap-2 text-sm font-semibold text-black">
                    <FileEdit size={15} className="text-[#2e66a6]" /> Reason
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#55708f]">{item.reason || 'No reason provided.'}</p>
                </div>

                <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <p className="flex items-center gap-1.5 text-xs text-[#55708f]">
                    <Clock3 size={15} /> Request On: {formatDateTime(item.createdAt)}
                  </p>

                  {itemIsPending && item._id === request._id && (
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <button type="button" onClick={() => setConfirmation('decline')} className="inline-flex h-11 min-w-[160px] items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-5 text-sm font-semibold text-red-600 transition hover:bg-red-50">
                        <XCircle size={17} /> Decline Request
                      </button>
                      <button type="button" onClick={() => setConfirmation('approve')} className="inline-flex h-11 min-w-[175px] items-center justify-center gap-2 rounded-xl bg-[#2e66a6] px-5 text-sm font-semibold text-white transition hover:bg-[#25578f]">
                        <UnlockKeyhole size={17} /> Approve &amp; Unlock
                      </button>
                    </div>
                  )}
                </div>
              </article>
                );
              })}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[#cbd5e1] bg-white py-12 text-center text-sm text-[#64748b]">
                No request matches the selected filters.
              </div>
            )}
          </div>
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
      </div>

      {confirmation && (
        <div className="fixed inset-0 z-[10050] flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true" aria-labelledby="decision-title">
          <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-4">
              <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${confirmation === 'approve' ? 'bg-[#e8f1ff] text-[#2e66a6]' : 'bg-red-50 text-red-600'}`}>
                {confirmation === 'approve' ? <UnlockKeyhole size={23} /> : <ShieldAlert size={23} />}
              </span>
              <div>
                <h2 id="decision-title" className="text-lg font-semibold text-gray-900">
                  {confirmation === 'approve' ? 'Approve & Unlock Edit Request?' : 'Decline Edit Request?'}
                </h2>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  {confirmation === 'approve'
                    ? 'The employer will be able to edit this job post for one hour.'
                    : 'The employer’s edit request will be cancelled and the job post will remain locked.'}
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setConfirmation(null)} disabled={submitting} className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60">
                Cancel
              </button>
              <button type="button" onClick={submitDecision} disabled={submitting} className={`rounded-xl px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60 ${confirmation === 'approve' ? 'bg-[#2e66a6] hover:bg-[#25578f]' : 'bg-red-600 hover:bg-red-700'}`}>
                {submitting ? 'Processing...' : confirmation === 'approve' ? 'Approve & Unlock' : 'Decline Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="fixed inset-0 z-[10060] flex items-center justify-center bg-black/25 px-4" role="status" aria-live="polite">
          <div className="w-full max-w-sm rounded-2xl border border-gray-100 bg-white px-8 py-8 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#e8f1ff]">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2e66a6] text-white">
                <Check size={25} strokeWidth={3} />
              </span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900">{success.title}</h2>
            <p className="mt-2 text-sm text-gray-600">{success.message}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminEmployerJobEditRequestReview;
