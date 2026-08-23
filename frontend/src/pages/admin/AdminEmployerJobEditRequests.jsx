import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Eye, RefreshCw, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const formatDate = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime())
    ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';
};
const companyName = (item) => item?.job?.companyName || item?.employer?.employerProfile?.companyName || item?.employer?.fullName || 'Employer';
const dateStart = (filter) => {
  const now = new Date();
  if (filter === 'today') return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (filter === 'week') { const date = new Date(now.getFullYear(), now.getMonth(), now.getDate()); date.setDate(date.getDate() - date.getDay()); return date; }
  if (filter === 'month') return new Date(now.getFullYear(), now.getMonth(), 1);
  return null;
};

const AdminEmployerJobEditRequests = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [time, setTime] = useState('all');
  const [sort, setSort] = useState('newest');

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
    const start = dateStart(time);
    return requests.filter((item) => {
      const itemStatus = item.status === 'pending' ? 'pending' : 'reviewed';
      const created = new Date(item.createdAt);
      return (!query || companyName(item).toLowerCase().includes(query) || String(item?.job?.title || '').toLowerCase().includes(query)) &&
        (status === 'all' || status === itemStatus) && (!start || (!Number.isNaN(created.getTime()) && created >= start));
    }).sort((a, b) => (sort === 'oldest' ? 1 : -1) * ((new Date(a.createdAt).getTime() || 0) - (new Date(b.createdAt).getTime() || 0)));
  }, [requests, search, status, time, sort]);

  return <div className="mx-auto max-w-[1500px] space-y-6 py-8">
    <header> <h1 className="text-[33px] font-semibold leading-[40px] text-gray-900">Edit Requests</h1><p className="mt-2 text-base text-slate-600">Review employer requests and grant temporary edit access to locked job postings.</p></header>
    <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[minmax(300px,1fr)_220px_220px_220px]">
      <label className="relative block"><Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search company, job title..." className="h-14 w-full rounded-xl border border-slate-200 pl-12 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
      <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-14 rounded-xl border border-slate-200 bg-white px-4 text-sm"><option value="all">All Status</option><option value="pending">Pending</option><option value="reviewed">Reviewed</option></select>
      <div className="relative"><select value={time} onChange={(e) => setTime(e.target.value)} className="h-14 w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 pr-11 text-sm"><option value="all">All Time</option><option value="today">Today</option><option value="week">This Week</option><option value="month">This Month</option></select><CalendarDays className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} /></div>
      <select value={sort} onChange={(e) => setSort(e.target.value)} className="h-14 rounded-xl border border-slate-200 bg-white px-4 text-sm"><option value="newest">Sort By: Newest</option><option value="oldest">Sort By: Oldest</option></select>
    </section>
    {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {loading ? <div className="flex justify-center py-20"><RefreshCw className="animate-spin text-blue-700" /></div> : <div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-left">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500"><tr><th className="px-6 py-5">Request Date</th><th className="px-6 py-5">Job Title</th><th className="px-6 py-5">Company</th><th className="px-6 py-5">Status</th><th className="px-6 py-5">Valid Until</th><th className="px-6 py-5 text-center">Actions</th></tr></thead>
        <tbody className="divide-y divide-slate-200">{rows.map((item) => { const job = item.job || {}; const reviewed = item.status !== 'pending'; return <tr key={item._id} className="hover:bg-slate-50/80">
          <td className="px-6 py-5 text-sm text-slate-600">{formatDate(item.createdAt)}</td><td className="px-6 py-5"><p className="font-bold text-slate-950">{job.title || 'Untitled Job'}</p><p className="mt-1 text-xs text-slate-500">{[job.jobType, job.workMode].filter(Boolean).join(' • ') || 'Job posting'}</p></td><td className="px-6 py-5"><p className="font-bold text-slate-950">{companyName(item)}</p><p className="mt-1 text-xs text-slate-500">{job.category || 'Company'}</p></td>
          <td className="px-6 py-5"><span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase ${reviewed ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-amber-300 bg-amber-50 text-amber-700'}`}>{reviewed ? 'Reviewed' : 'Pending'}</span></td><td className="px-6 py-5 text-sm text-slate-600">{formatDate(job.applicationDeadline)}</td><td className="px-6 py-5 text-center"><button type="button" onClick={() => navigate(`/admin/employer-job-edit-requests/${item._id}`)} className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700" aria-label="View edit request"><Eye size={19} /></button></td>
        </tr>; })}{!rows.length && <tr><td colSpan="6" className="px-6 py-16 text-center text-sm text-slate-500">No edit requests match the selected filters.</td></tr>}</tbody>
      </table></div>}
    </section>
  </div>;
};

export default AdminEmployerJobEditRequests;
