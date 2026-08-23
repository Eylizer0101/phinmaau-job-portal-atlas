import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Eye, RefreshCw, Search, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const formatDate = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime())
    ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';
};
const companyName = (item) => item?.job?.companyName || item?.employer?.employerProfile?.companyName || item?.employer?.fullName || 'Employer';
const formatDateInput = (date) => {
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return '';
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
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
  const [status, setStatus] = useState('all');
  const [time, setTime] = useState('all');
  const [sort, setSort] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showCustomDate, setShowCustomDate] = useState(false);

  useEffect(() => {
    let active = true;
    api.get('/job-edit-requests/admin').then(({ data }) => {
      if (active) setRequests(Array.isArray(data?.requests) ? data.requests : []);
    }).catch((requestError) => {
      if (active) setError(requestError.response?.data?.message || 'Unable to load edit requests.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    const range = time === 'custom'
      ? { from: dateFrom ? new Date(`${dateFrom}T00:00:00`) : null, to: dateTo ? new Date(`${dateTo}T23:59:59.999`) : null }
      : presetRange(time);
    return requests.filter((item) => {
      const itemStatus = item.status === 'pending' ? 'pending' : 'reviewed';
      const created = new Date(item.createdAt);
      return (!query || companyName(item).toLowerCase().includes(query) || String(item?.job?.title || '').toLowerCase().includes(query)) &&
        (status === 'all' || status === itemStatus) &&
        (!range.from || (!Number.isNaN(created.getTime()) && created >= range.from)) &&
        (!range.to || (!Number.isNaN(created.getTime()) && created <= range.to));
    }).sort((a, b) => {
      if (sort === 'name_asc' || sort === 'name_desc') {
        const compared = companyName(a).localeCompare(companyName(b));
        return sort === 'name_desc' ? -compared : compared;
      }
      const compared = (new Date(a.createdAt).getTime() || 0) - (new Date(b.createdAt).getTime() || 0);
      return sort === 'oldest' ? compared : -compared;
    });
  }, [requests, search, status, time, sort, dateFrom, dateTo]);

  const changeTime = (value) => {
    if (value === 'custom') { setShowCustomDate(true); return; }
    setTime(value); setDateFrom(''); setDateTo('');
  };

  return <div className="mx-auto max-w-[1500px] space-y-6 py-8">
    <header> <h1 className="text-[33px] font-semibold leading-[40px] text-gray-900">Edit Requests</h1><p className="mt-2 text-base text-slate-600">Review employer requests and grant temporary edit access to locked job postings.</p></header>
    <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[minmax(300px,1fr)_220px_240px_250px]">
      <label className="relative block"><Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search company, job title..." className="h-14 w-full rounded-xl border border-slate-200 pl-12 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
      <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-14 rounded-xl border border-slate-200 bg-white px-4 text-sm"><option value="all">All Status</option><option value="pending">Pending</option><option value="reviewed">Reviewed</option></select>
      <div className="relative"><select value={time} onChange={(e) => changeTime(e.target.value)} className="h-14 w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 pr-11 text-sm"><option value="all">All Time</option><option value="today">Today</option><option value="yesterday">Yesterday</option><option value="week">This Week</option><option value="sevenDays">Last 7 Days</option><option value="month">This Month</option><option value="lastMonth">Last Month</option><option value="year">This Year</option><option value="lastYear">Last Year</option><option value="custom">Custom Range</option></select><CalendarDays className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} /></div>
      <select value={sort} onChange={(e) => setSort(e.target.value)} className="h-14 rounded-xl border border-slate-200 bg-white px-4 text-sm"><option value="">Sort By</option><option value="newest">Most Recent Newest to Oldest</option><option value="oldest">Oldest First</option><option value="name_asc">A to Z</option><option value="name_desc">Z to A</option></select>
    </section>
    {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {loading ? <div className="flex justify-center py-20"><RefreshCw className="animate-spin text-blue-700" /></div> : <div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-left">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500"><tr><th className="px-6 py-5">Request Date</th><th className="px-6 py-5">Company</th><th className="px-6 py-5">Job Title</th><th className="px-6 py-5 text-center">Vacancy</th><th className="px-6 py-5 text-center">Applicant</th><th className="px-6 py-5">Status</th><th className="px-6 py-5">Valid Until</th><th className="px-6 py-5 text-center">Actions</th></tr></thead>
        <tbody className="divide-y divide-slate-200">{rows.map((item) => { const job = item.job || {}; const reviewed = item.status !== 'pending'; return <tr key={item._id} className="hover:bg-slate-50/80">
          <td className="px-6 py-5 text-sm text-slate-600">{formatDate(item.createdAt)}</td><td className="px-6 py-5"><div className="flex items-center gap-3">{job.companyLogo ? <img src={job.companyLogo} alt="" className="h-11 w-11 rounded-xl border object-cover" /> : <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-700 text-xs font-bold text-white">{companyName(item).slice(0, 2).toUpperCase()}</span>}<div><p className="font-bold text-slate-950">{companyName(item)}</p><p className="mt-1 text-xs text-slate-500">{job.category || 'Company'}</p></div></div></td><td className="px-6 py-5"><p className="font-bold text-slate-950">{job.title || 'Untitled Job'}</p><p className="mt-1 text-xs text-slate-500">{[job.jobType, job.workMode].filter(Boolean).join(' • ') || 'Job posting'}</p></td><td className="px-6 py-5 text-center font-semibold">{job.vacancies ?? 0}</td><td className="px-6 py-5 text-center font-semibold">{job.applicationCount ?? 0}</td>
          <td className="px-6 py-5"><span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase ${reviewed ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-amber-300 bg-amber-50 text-amber-700'}`}>{reviewed ? 'Reviewed' : 'Pending'}</span></td><td className="px-6 py-5 text-sm text-slate-600">{formatDate(job.applicationDeadline)}</td><td className="px-6 py-5 text-center"><button type="button" onClick={() => navigate(`/admin/employer-job-edit-requests/${item._id}`)} className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700" aria-label="View edit request"><Eye size={19} /></button></td>
        </tr>; })}{!rows.length && <tr><td colSpan="8" className="px-6 py-16 text-center text-sm text-slate-500">No edit requests match the selected filters.</td></tr>}</tbody>
      </table></div>}
    </section>
    {showCustomDate && <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4"><section className="relative w-full max-w-2xl rounded-2xl bg-white p-7 shadow-2xl"><button type="button" onClick={() => setShowCustomDate(false)} className="absolute right-4 top-4 rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={20} /></button><h2 className="text-xl font-bold text-slate-950">Custom Date Range</h2><p className="mt-1 text-sm text-slate-500">Select the request start and end dates.</p><div className="mt-6 grid gap-5 sm:grid-cols-2"><label className="text-sm font-semibold text-slate-700">Start Date<input type="date" value={dateFrom || formatDateInput(new Date())} onChange={(e) => setDateFrom(e.target.value)} className="mt-2 h-14 w-full rounded-xl border border-slate-200 px-4" /></label><label className="text-sm font-semibold text-slate-700">End Date<input type="date" value={dateTo || formatDateInput(new Date())} min={dateFrom} onChange={(e) => setDateTo(e.target.value)} className="mt-2 h-14 w-full rounded-xl border border-slate-200 px-4" /></label></div><div className="mt-7 flex justify-end gap-3"><button type="button" onClick={() => setShowCustomDate(false)} className="rounded-xl border border-slate-200 px-5 py-3 font-semibold">Cancel</button><button type="button" onClick={() => { const from = dateFrom || formatDateInput(new Date()); const to = dateTo || from; setDateFrom(from); setDateTo(to); setTime('custom'); setShowCustomDate(false); }} className="rounded-xl bg-[#2e66a6] px-6 py-3 font-bold text-white">Apply Range</button></div></section></div>}
  </div>;
};

export default AdminEmployerJobEditRequests;
