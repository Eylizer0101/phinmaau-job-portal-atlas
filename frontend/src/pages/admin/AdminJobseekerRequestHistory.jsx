import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Eye, Search, UserRound } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';

const formatDate = (value) => value ? new Date(value).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
const reasonLabel = (value) => value === 'contract_ended' ? 'Contract Ended' : 'Employment Ended';
const nameOf = (user = {}) => String(user?.fullName || [user?.firstName, user?.middleName, user?.lastName].filter(Boolean).join(' ') || 'Job Seeker');
const companyNameOf = (item = {}) => String(item?.job?.companyName || item?.employer?.employerProfile?.companyName || 'Company');
const companyIndustryOf = (item = {}) => String(item?.job?.industry || item?.job?.category || item?.employer?.employerProfile?.industry || 'Industry not specified');
const companyLogoOf = (item = {}) => item?.job?.companyLogo || item?.employer?.employerProfile?.companyLogo || '';
const statusBadgeClass = (status = '') => ({
  pending: 'border-amber-300 bg-amber-50 text-amber-700',
  reviewed: 'border-emerald-300 bg-emerald-50 text-emerald-700',
  approved: 'border-emerald-300 bg-emerald-50 text-emerald-700',
  declined: 'border-red-300 bg-red-50 text-red-700',
  no_response: 'border-slate-300 bg-slate-100 text-slate-600',
}[String(status || '').toLowerCase()] || 'border-slate-300 bg-slate-50 text-slate-600');

export default function AdminJobseekerRequestHistory() {
  const { jobseekerId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState({ jobseeker: null, requests: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [company, setCompany] = useState('all');
  const [jobTitle, setJobTitle] = useState('all');
  const [type, setType] = useState('all');
  const [status, setStatus] = useState('all');
  const [time, setTime] = useState('all');
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError('');

    api.get(`/applications/admin/employment-status-requests/jobseeker/${jobseekerId}`)
      .then(({ data: response }) => {
        if (!active) return;

        setData({
          jobseeker: response?.jobseeker || null,
          requests: Array.isArray(response?.requests) ? response.requests : [],
        });
      })
      .catch((requestError) => {
        if (!active) return;
        setError(requestError.response?.data?.message || 'Unable to load request history.');
        setData((current) => ({ ...current, requests: [] }));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [jobseekerId]);

  const requests = Array.isArray(data.requests) ? data.requests : [];

  const companies = useMemo(
    () => [...new Set(requests.map((item) => companyNameOf(item)).filter(Boolean))],
    [requests]
  );

  const jobs = useMemo(
    () => [...new Set(requests.map((item) => String(item?.job?.title || '')).filter(Boolean))],
    [requests]
  );

  const filtered = useMemo(() => requests.filter((item) => {
    const requestDate = new Date(item?.employmentStatusRequest?.requestedAt);
    const companyName = companyNameOf(item);
    const title = String(item?.job?.title || '');
    const requestType = String(item?.employmentStatusRequest?.reason || '');
    const requestStatus = String(item?.employmentStatusRequest?.status || 'pending').toLowerCase();
    const text = `${companyName} ${title} ${reasonLabel(requestType)} ${requestStatus}`.toLowerCase();
    let dateMatch = true;
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (time === 'today') dateMatch = requestDate >= startToday;
    if (time === 'yesterday') {
      const start = new Date(startToday.getTime() - 86400000);
      dateMatch = requestDate >= start && requestDate < startToday;
    }
    if (time === 'week') {
      const offset = startToday.getDay() === 0 ? 6 : startToday.getDay() - 1;
      dateMatch = requestDate >= new Date(startToday.getTime() - offset * 86400000);
    }
    if (time === 'sevenDays') dateMatch = requestDate >= new Date(startToday.getTime() - 6 * 86400000);
    if (time === 'month') dateMatch = requestDate >= new Date(now.getFullYear(), now.getMonth(), 1);
    if (time === 'lastMonth') dateMatch = requestDate >= new Date(now.getFullYear(), now.getMonth() - 1, 1) && requestDate < new Date(now.getFullYear(), now.getMonth(), 1);
    if (time === 'year') dateMatch = requestDate >= new Date(now.getFullYear(), 0, 1);
    if (time === 'lastYear') dateMatch = requestDate >= new Date(now.getFullYear() - 1, 0, 1) && requestDate < new Date(now.getFullYear(), 0, 1);
    if (time === 'custom') dateMatch = (!from || requestDate >= new Date(`${from}T00:00:00`)) && (!to || requestDate <= new Date(`${to}T23:59:59`));

    return (
      (!search || text.includes(String(search).toLowerCase())) &&
      (company === 'all' || companyName === company) &&
      (jobTitle === 'all' || title === jobTitle) &&
      (type === 'all' || requestType === type) &&
      (status === 'all' || requestStatus === status) &&
      dateMatch
    );
  }), [requests, search, company, jobTitle, type, status, time, from, to]);

  const jobseeker = data.jobseeker || {};

  return <div className="mx-auto max-w-[1500px] space-y-6 py-8">
    <section className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <button onClick={() => navigate('/admin/employer-job-edit-requests')} className="inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-sm font-semibold"><ArrowLeft size={17}/>Back</button>
      {jobseeker.profileImage ? <img src={jobseeker.profileImage} alt="" className="h-12 w-12 rounded-full object-cover"/> : <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-[#2e66a6]"><UserRound/></span>}
      <div><div className="flex flex-wrap items-center gap-2"><h1 className="text-xl font-bold">{nameOf(jobseeker)}</h1>{jobseeker.jobSeekerProfile?.yearGraduated && <span className="rounded-full bg-slate-100 px-3 py-1 text-xs">Class of {jobseeker.jobSeekerProfile.yearGraduated}</span>}</div><p className="mt-1 text-sm text-slate-500">{[jobseeker.jobSeekerProfile?.campus, jobseeker.jobSeekerProfile?.course].filter(Boolean).join(' • ') || jobseeker.email}</p></div>
    </section>

    <section className="grid gap-3 rounded-2xl border bg-white p-4 shadow-sm md:grid-cols-3 xl:grid-cols-6">
      <label className="relative"><Search className="absolute left-3 top-3.5 text-slate-400" size={18}/><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search request..." className="h-11 w-full rounded-xl border pl-10 pr-3"/></label>
      <select value={company} onChange={(e)=>setCompany(e.target.value)} className="rounded-xl border px-3"><option value="all">All Company</option>{companies.map(value=><option key={value} value={value}>{value}</option>)}</select>
      <select value={jobTitle} onChange={(e)=>setJobTitle(e.target.value)} className="rounded-xl border px-3"><option value="all">All Job Title</option>{jobs.map(value=><option key={value} value={value}>{value}</option>)}</select>
      <select value={type} onChange={(e)=>setType(e.target.value)} className="rounded-xl border px-3"><option value="all">All Type</option><option value="contract_ended">Contract Ended</option><option value="employment_ended">Employment Ended</option></select>
      <select value={status} onChange={(e)=>setStatus(e.target.value)} className="rounded-xl border px-3"><option value="all">All Status</option><option value="pending">Pending</option><option value="reviewed">Reviewed</option><option value="approved">Approved</option><option value="declined">Declined</option><option value="no_response">No Response</option></select>
      <select value={time} onChange={(e)=>{setTime(e.target.value);setShowCustomDate(e.target.value === 'custom');}} className="rounded-xl border px-3"><option value="all">All Time</option><option value="today">Today</option><option value="yesterday">Yesterday</option><option value="week">This Week</option><option value="sevenDays">Last 7 Days</option><option value="month">This Month</option><option value="lastMonth">Last Month</option><option value="year">This Year</option><option value="lastYear">Last Year</option><option value="custom">Custom Range</option></select>
    </section>

    {error && <p className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}

    <section className="overflow-x-auto rounded-2xl border bg-white shadow-sm">
      <table className="w-full min-w-[900px]">
        <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
          <tr>{['Request Date','Company','Job Title','Request Type','Status','Action'].map(label=><th key={label} className="px-6 py-5">{label}</th>)}</tr>
        </thead>
        <tbody className="divide-y">
          {!loading && filtered.map(item => {
            const requestStatus = String(item?.employmentStatusRequest?.status || 'pending').toLowerCase();
            const companyLogo = companyLogoOf(item);
            const companyName = companyNameOf(item);

            return <tr key={item?._id || `${companyName}-${item?.job?.title || ''}`}>
              <td className="px-6 py-5 text-sm">{formatDate(item?.employmentStatusRequest?.requestedAt)}</td>
              <td className="px-6 py-5">
                <div className="flex items-center gap-3">
                  {companyLogo ? <img src={companyLogo} alt={`${companyName} logo`} className="h-11 w-11 shrink-0 rounded-xl border border-slate-200 object-cover"/> : <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#2e66a6] text-xs font-bold text-white">{companyName.slice(0,2).toUpperCase()}</span>}
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-950">{companyName}</p>
                    <p className="mt-1 truncate text-xs font-normal text-slate-500">{companyIndustryOf(item)}</p>
                  </div>
                </div>
              </td>
              <td className="px-6 py-5 font-semibold">{item?.job?.title || '—'}</td>
              <td className="px-6 py-5">{reasonLabel(item?.employmentStatusRequest?.reason)}</td>
              <td className="px-6 py-5"><span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase ${statusBadgeClass(requestStatus)}`}>{requestStatus.replace('_',' ')}</span></td>
              <td className="px-6 py-5"><button onClick={()=>navigate(`/admin/jobseeker-status-requests/${jobseekerId}/${item?._id}`)} className="rounded-xl border p-3 text-[#2e66a6]"><Eye size={18}/></button></td>
            </tr>;
          })}
          {!loading && !filtered.length && <tr><td colSpan="6" className="p-12 text-center text-slate-500">No requests found.</td></tr>}
        </tbody>
      </table>
    </section>

    {showCustomDate && <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4"><div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl"><h2 className="text-xl font-bold">Custom Date Range</h2><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold">Start Date<input type="date" value={from} onChange={(e)=>setFrom(e.target.value)} className="mt-2 h-12 w-full rounded-xl border px-3"/></label><label className="text-sm font-semibold">End Date<input type="date" value={to} onChange={(e)=>setTo(e.target.value)} className="mt-2 h-12 w-full rounded-xl border px-3"/></label></div><div className="mt-6 flex justify-end gap-3"><button onClick={()=>{setShowCustomDate(false);setTime('all');setFrom('');setTo('');}} className="rounded-xl border px-6 py-3 font-semibold">Cancel</button><button disabled={!from||!to} onClick={()=>setShowCustomDate(false)} className="rounded-xl bg-[#2e66a6] px-6 py-3 font-semibold text-white disabled:opacity-50">Apply Range</button></div></div></div>}
  </div>;
}
