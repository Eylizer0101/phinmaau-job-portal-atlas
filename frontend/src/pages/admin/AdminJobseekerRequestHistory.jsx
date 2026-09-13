import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CalendarDays, Eye, Search, UserRound } from 'lucide-react';
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

  const changeTime = (value) => {
    if (value === 'custom') {
      setShowCustomDate(true);
      return;
    }
    setTime(value);
    setFrom('');
    setTo('');
  };

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
      <select value={time} onChange={(e)=>changeTime(e.target.value)} className="rounded-xl border px-3"><option value="all">All Time</option><option value="today">Today</option><option value="yesterday">Yesterday</option><option value="week">This Week</option><option value="sevenDays">Last 7 Days</option><option value="month">This Month</option><option value="lastMonth">Last Month</option><option value="year">This Year</option><option value="lastYear">Last Year</option><option value="custom">Custom Range</option></select>
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

    <CustomDateRangeModal
      open={showCustomDate}
      startDate={from}
      endDate={to}
      onCancel={() => setShowCustomDate(false)}
      onApply={(startDate, endDate) => {
        setFrom(startDate);
        setTo(endDate);
        setTime('custom');
        setShowCustomDate(false);
      }}
    />
  </div>;
}
