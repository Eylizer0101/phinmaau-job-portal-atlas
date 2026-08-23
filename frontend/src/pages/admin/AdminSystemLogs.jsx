import React, { useCallback, useEffect, useState } from 'react';
import AdminLayout from '../../layouts/AdminLayout';
import api from '../../services/api';

const ITEMS_PER_PAGE = 15;
const DATE_OPTIONS = [
  ['all', 'All Time'], ['today', 'Today'], ['thisWeek', 'This Week'], ['thisMonth', 'This Month'],
];
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

const formatDateTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { date: 'Date unavailable', time: '' };
  return {
    date: date.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric' }),
    time: date.toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true }),
  };
};
const getInitials = (name = '') => String(name).trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'U';
const getActionCode = (action = '') => ACTION_CODES[action] || (String(action).split('.').pop() || 'ACTIVITY').replace(/[^a-z0-9]+/gi, '_').toUpperCase();

const AdminSystemLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, pageCount: 1, total: 0 });
  const [filters, setFilters] = useState({ search: '', role: 'all', date: 'all' });
  const [search, setSearch] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(filters.search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [filters.search]);

  const updateFilter = (key, value) => { setFilters((old) => ({ ...old, [key]: value })); setPage(1); };
  const loadLogs = useCallback(async () => {
    try {
      setLoading(true); setError('');
      const response = await api.get('/admin/system-logs', { params: { q: search, role: filters.role, date: filters.date, page, limit: ITEMS_PER_PAGE } });
      if (!response.data?.success) throw new Error(response.data?.message || 'Unable to load activity logs.');
      setLogs(response.data.data || []);
      setPagination(response.data.pagination || { page: 1, pageCount: 1, total: 0 });
    } catch (requestError) {
      setLogs([]); setError(requestError.response?.data?.message || requestError.message || 'Failed to load activity logs.');
    } finally { setLoading(false); }
  }, [search, filters.role, filters.date, page]);
  useEffect(() => { loadLogs(); }, [loadLogs]);

  return <AdminLayout><main className="mx-auto w-full max-w-[1420px] px-1 py-8">
    <header className="mb-5"><h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">Activity Logs</h1>
      <p className="mt-1.5 text-sm text-slate-500">Monitor the important activities performed by Jobseekers and Employers.</p></header>
    <section className="relative z-30 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-3 md:grid-cols-[minmax(320px,1fr)_220px_220px]">
        <label className="relative"><span className="sr-only">Search activity logs</span><Icon name="search" className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input type="search" value={filters.search} onChange={(event) => updateFilter('search', event.target.value)} placeholder="Search user or activity..."
            className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-4 text-sm text-slate-900 shadow-sm outline-none focus:border-[#212C61] focus:ring-2 focus:ring-[#212C61]/10" /></label>
        <Dropdown value={filters.role} options={ROLE_OPTIONS} onChange={(value) => updateFilter('role', value)} label="Filter by role" />
        <Dropdown value={filters.date} options={DATE_OPTIONS} onChange={(value) => updateFilter('date', value)} label="Filter by date" icon="calendar" />
      </div>
    </section>
    <section className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto"><div className="min-w-[820px]">
        <div className="grid grid-cols-[1fr_1.5fr_0.8fr_1.2fr] gap-5 border-b border-slate-200 bg-slate-50 px-5 py-4 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
          <span>Date & Time</span><span>Performed By</span><span>Role</span><span>Action</span>
        </div>
        {loading ? <div className="p-16 text-center text-sm text-slate-500">Loading activity logs...</div>
          : error ? <div className="p-16 text-center"><p className="font-bold text-rose-600">{error}</p><button type="button" onClick={loadLogs} className="mt-4 rounded-xl bg-[#212C61] px-4 py-2 text-sm font-bold text-white">Retry</button></div>
          : logs.length === 0 ? <div className="flex min-h-[300px] flex-col items-center justify-center text-center"><Icon name="activity" className="h-8 w-8 text-[#212C61]" /><h2 className="mt-3 font-bold text-slate-900">No activity logs found</h2><p className="mt-1 text-sm text-slate-500">Jobseeker and Employer activities will appear here.</p></div>
          : <div className="divide-y divide-slate-100">{logs.map((log) => {
            const created = formatDateTime(log.createdAt);
            const employer = String(log.actorRole).toLowerCase() === 'employer';
            return <div key={log.id} className="grid grid-cols-[1fr_1.5fr_0.8fr_1.2fr] items-center gap-5 px-5 py-4 hover:bg-slate-50/70">
              <div><p className="text-sm font-bold text-slate-800">{created.date}</p><p className="mt-0.5 text-[11px] text-slate-500">{created.time}</p></div>
              <div className="flex min-w-0 items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#212C61]/10 text-[11px] font-bold text-[#212C61]">{getInitials(log.actorName)}</span><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-900">{log.actorName || 'Unknown user'}</p><p className="truncate text-[11px] text-slate-500">{log.actorEmail || 'No email recorded'}</p></div></div>
              <span className={`w-fit rounded-full border px-3 py-1 text-[11px] font-bold capitalize ${employer ? 'border-violet-200 bg-violet-50 text-violet-700' : 'border-blue-200 bg-blue-50 text-blue-700'}`}>{log.actorRole}</span>
              <div className="min-w-0"><p className="truncate text-sm font-bold tracking-wide text-slate-900">{getActionCode(log.action)}</p><p className="truncate text-[11px] font-medium text-[#212C61]/70">{log.module || 'Activity'}</p></div>
            </div>;
          })}</div>}
      </div></div>
      <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/50 px-5 py-3 text-xs text-slate-500">
        <span>Showing {pagination.total ? (pagination.page - 1) * ITEMS_PER_PAGE + 1 : 0} to {Math.min(pagination.page * ITEMS_PER_PAGE, pagination.total || 0)} of {pagination.total || 0} results</span>
        <div className="flex items-center gap-2"><button type="button" disabled={page <= 1 || loading} onClick={() => setPage((old) => Math.max(1, old - 1))} className="h-9 rounded-lg border bg-white px-3 font-bold disabled:opacity-40">Previous</button><span className="rounded-lg bg-[#212C61] px-3 py-2 font-bold text-white">{pagination.page || page}</span><button type="button" disabled={page >= (pagination.pageCount || 1) || loading} onClick={() => setPage((old) => Math.min(pagination.pageCount || 1, old + 1))} className="h-9 rounded-lg border bg-white px-3 font-bold disabled:opacity-40">Next</button></div>
      </div>
    </section>
  </main></AdminLayout>;
};

export default AdminSystemLogs;
