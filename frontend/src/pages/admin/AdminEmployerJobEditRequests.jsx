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

const AdminEmployerJobEditRequests = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [company, setCompany] = useState('all');
  const [industry, setIndustry] = useState('all');
  const [jobTitle, setJobTitle] = useState('all');
  const [status, setStatus] = useState('pending');
  const [time, setTime] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    let active = true;
    api.get('/job-edit-requests/admin').then(({ data }) => {
      if (active) setRequests(Array.isArray(data?.requests) ? data.requests : []);
    }).catch((requestError) => {
      if (active) setError(requestError.response?.data?.message || 'Unable to load edit requests.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const companyOptions = useMemo(() => [...new Set(requests.map(companyName).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [requests]);
  const industryOptions = useMemo(() => [...new Set(requests.map(industryName).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [requests]);
  const jobTitleOptions = useMemo(() => [...new Set(requests.map((item) => item?.job?.title).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [requests]);

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    const range = time === 'custom'
      ? { from: dateFrom ? new Date(`${dateFrom}T00:00:00`) : null, to: dateTo ? new Date(`${dateTo}T23:59:59.999`) : null }
      : presetRange(time);
    return requests.filter((item) => {
      const itemStatus = item.status === 'pending' ? 'pending' : 'reviewed';
      const created = new Date(item.createdAt);
      return (!query || companyName(item).toLowerCase().includes(query) || String(item?.job?.title || '').toLowerCase().includes(query)) &&
        (company === 'all' || companyName(item) === company) &&
        (industry === 'all' || industryName(item) === industry) &&
        (jobTitle === 'all' || item?.job?.title === jobTitle) &&
        (status === 'all' || status === itemStatus) &&
        (!range.from || (!Number.isNaN(created.getTime()) && created >= range.from)) &&
        (!range.to || (!Number.isNaN(created.getTime()) && created <= range.to));
    }).sort((a, b) => (new Date(b.createdAt).getTime() || 0) - (new Date(a.createdAt).getTime() || 0));
  }, [requests, search, company, industry, jobTitle, status, time, dateFrom, dateTo]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, company, industry, jobTitle, status, time, dateFrom, dateTo]);

  const paginatedRows = useMemo(() => {
    if (pageSize === 'all') return rows;
    const start = (currentPage - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, currentPage, pageSize]);

  const changeTime = (value) => {
    if (value === 'custom') { setShowCustomDate(true); return; }
    setTime(value); setDateFrom(''); setDateTo('');
  };

  const hasActiveFilters = Boolean(search.trim()) || company !== 'all' || industry !== 'all' || jobTitle !== 'all' || status !== 'pending' || time !== 'all' || Boolean(dateFrom) || Boolean(dateTo);

  const clearFilters = () => {
    setSearch('');
    setCompany('all');
    setIndustry('all');
    setJobTitle('all');
    setStatus('pending');
    setTime('all');
    setDateFrom('');
    setDateTo('');
    setShowCustomDate(false);
  };

  return <div className="mx-auto max-w-[1480px] space-y-6 py-7 sm:py-8">
    <header> <h1 className="text-[30px] font-semibold leading-tight tracking-[-0.02em] text-slate-950 sm:text-[34px]">Edit Requests</h1><p className="mt-1.5 text-sm text-slate-600">Review employer requests and grant temporary edit access to locked job postings.</p></header>
    <section className={cn('grid min-w-0 gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_28px_rgba(15,23,42,0.06)] md:grid-cols-2 xl:grid-cols-3 2xl:items-center', hasActiveFilters ? '2xl:grid-cols-[minmax(250px,1.3fr)_repeat(4,minmax(130px,0.72fr))_minmax(170px,0.9fr)_120px]' : '2xl:grid-cols-[minmax(280px,1.4fr)_repeat(4,minmax(140px,0.8fr))_minmax(180px,1fr)]')}>
      <label className="relative block min-w-0"><Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={19} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search company, job title..." className="h-12 w-full rounded-xl border border-slate-200 pl-11 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
      <select value={company} onChange={(e) => setCompany(e.target.value)} className="h-12 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-4 text-sm"><option value="all">All Company</option>{companyOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select>
      <select value={industry} onChange={(e) => setIndustry(e.target.value)} className="h-12 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-4 text-sm"><option value="all">All Industry</option>{industryOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select>
      <select value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} className="h-12 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-4 text-sm"><option value="all">All Job Title</option>{jobTitleOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select>
      <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-12 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-4 text-sm"><option value="all">All Status</option><option value="pending">Pending</option><option value="reviewed">Reviewed</option></select>
      <div className="relative min-w-0"><select value={time} onChange={(e) => changeTime(e.target.value)} className="h-12 w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 pr-11 text-sm"><option value="all">All Time</option><option value="today">Today</option><option value="yesterday">Yesterday</option><option value="week">This Week</option><option value="sevenDays">Last 7 Days</option><option value="month">This Month</option><option value="lastMonth">Last Month</option><option value="year">This Year</option><option value="lastYear">Last Year</option><option value="custom">Custom Range</option></select><CalendarDays className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" size={17} /></div>
      {hasActiveFilters && <button type="button" onClick={clearFilters} className="inline-flex h-12 w-full min-w-0 items-center justify-center gap-2 rounded-xl border border-[#2e66a6]/30 bg-[#2e66a6]/5 px-3 text-sm font-semibold text-[#24558d] transition hover:border-[#2e66a6] hover:bg-[#2e66a6] hover:text-white md:col-span-2 xl:col-span-3 2xl:col-span-1"><RefreshCw size={16} />Clear All</button>}
    </section>
    {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {loading ? <div className="flex justify-center py-20"><RefreshCw className="animate-spin text-blue-700" /></div> : <div className="max-w-full overflow-x-auto lg:overflow-x-hidden"><table className="w-full min-w-[980px] table-fixed text-left lg:min-w-0">
        <thead className="border-b border-slate-200 bg-[#2e66a6]/[0.055] text-xs font-bold uppercase tracking-wider text-slate-600"><tr><th className="px-4 py-4">Request Date</th><th className="px-4 py-4">Company</th><th className="px-4 py-4">Job Title</th><th className="px-4 py-4 text-center">Vacancy</th><th className="px-4 py-4 text-center">Applicant</th><th className="px-4 py-4">Status</th><th className="px-4 py-4">Valid Until</th><th className="px-4 py-4 text-center">Actions</th></tr></thead>
        <tbody className="divide-y divide-slate-200">{paginatedRows.map((item) => { const job = item.job || {}; const reviewed = item.status !== 'pending'; const detailsPath = `/admin/employer-job-edit-requests/${item._id}`; return <tr key={item._id} role="link" tabIndex={0} onClick={() => navigate(detailsPath)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); navigate(detailsPath); } }} className="cursor-pointer transition hover:bg-slate-50/80 focus:bg-blue-50/70 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500">
          <td className="px-6 py-5 text-sm text-slate-600">{formatDate(item.createdAt)}</td><td className="px-6 py-5"><div className="flex items-center gap-3">{job.companyLogo ? <img src={job.companyLogo} alt="" className="h-11 w-11 rounded-xl border object-cover" /> : <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-700 text-xs font-bold text-white">{companyName(item).slice(0, 2).toUpperCase()}</span>}<div><p className="font-bold text-slate-950">{companyName(item)}</p><p className="mt-1 text-xs text-slate-500">{job.category || 'Company'}</p></div></div></td><td className="px-6 py-5"><p className="font-bold text-slate-950">{job.title || 'Untitled Job'}</p><p className="mt-1 text-xs text-slate-500">{[job.jobType, job.workMode].filter(Boolean).join(' • ') || 'Job posting'}</p></td><td className="px-6 py-5 text-center font-semibold">{job.vacancies ?? 0}</td><td className="px-6 py-5 text-center font-semibold">{job.applicationCount ?? 0}</td>
          <td className="px-6 py-5"><span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase ${reviewed ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-amber-300 bg-amber-50 text-amber-700'}`}>{reviewed ? 'Reviewed' : 'Pending'}</span></td><td className="px-6 py-5 text-sm text-slate-600">{formatDate(job.applicationDeadline)}</td><td className="px-6 py-5 text-center"><button type="button" onClick={(event) => { event.stopPropagation(); navigate(detailsPath); }} className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700" aria-label="View edit request"><Eye size={19} /></button></td>
        </tr>; })}{!rows.length && <tr><td colSpan="8" className="px-6 py-16 text-center text-sm text-slate-500">No edit requests match the selected filters.</td></tr>}</tbody>
      </table></div>}
      {!loading && <Pagination currentPage={currentPage} totalItems={rows.length} pageSize={pageSize} onPageChange={setCurrentPage} onPageSizeChange={setPageSize} />}
    </section>
    <CustomDateRangeModal open={showCustomDate} startDate={dateFrom} endDate={dateTo} onCancel={() => setShowCustomDate(false)} onApply={(from, to) => { setDateFrom(from); setDateTo(to); setTime('custom'); setShowCustomDate(false); }} />
  </div>;
};

export default AdminEmployerJobEditRequests;
