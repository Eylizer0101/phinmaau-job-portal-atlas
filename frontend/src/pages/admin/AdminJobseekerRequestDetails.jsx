import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  BriefcaseBusiness,
  Building2,
  CalendarCheck2,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  FileText,
  MessageSquare,
  UserRound,
  X,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';

const date = (value, withTime = false) => value ? new Date(value).toLocaleString('en-PH', withTime ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'medium' }) : '—';
const name = (user = {}) => user.fullName || [user.firstName, user.middleName, user.lastName].filter(Boolean).join(' ') || '—';
const reason = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  const labels = {
    contract_ended: 'Contract Ended',
    contract_end: 'Contract Ended',
    resigned: 'Resigned',
    resignation: 'Resigned',
    terminated: 'Terminated',
    termination: 'Terminated',
    still_employed: 'Still Employed',
    no_resignation: 'Still Employed / No Resignation',
    employment_ended: 'Employment Ended',
  };
  return labels[normalized] || String(value || '').replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) || 'Employment Ended';
};
const duration = (item) => { const start = new Date(item.hiredAt || item.reviewedAt); const end = item.employmentEndedAt ? new Date(item.employmentEndedAt) : new Date(); if (Number.isNaN(start.getTime())) return '—'; const days = Math.max(0, Math.floor((end-start)/86400000)); return days < 30 ? `${days} days` : `${Math.floor(days/30)} months and ${days%30} days`; };

export default function AdminJobseekerRequestDetails() {
  const { jobseekerId, requestId } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const load = () => api.get(`/applications/admin/employment-status-requests/jobseeker/${jobseekerId}/${requestId}`).then(({data})=>setRequest(data.request)).catch(err=>setError(err.response?.data?.message || 'Unable to load request.'));
  useEffect(() => {
    load();
  }, [jobseekerId, requestId]);
  const decide = async () => { try { setSaving(true); const {data}=await api.put(`/applications/admin/employment-status-requests/${requestId}/final-decision`, { decision: confirm }); setRequest(data.application); setSuccess(confirm === 'approved' ? "Request Approved Successfully\nThe job seeker's employment status request has been approved." : "Request Declined Successfully\nThe job seeker's employment status request has been declined."); setConfirm(''); } catch(err){ setError(err.response?.data?.message || 'Unable to save decision.'); } finally { setSaving(false); } };
  if (!request) return <div className="p-10 text-center">{error || 'Loading request...'}</div>;

  const statusRequest = request.employmentStatusRequest || {};
  const employerResponse = statusRequest.employerResponse || {};
  const adminDecision = statusRequest.adminDecision || {};
  const employerAnswered = ['approved','declined','no_response'].includes(employerResponse.decision) || statusRequest.status === 'no_response';
  const final = ['approved','declined'].includes(adminDecision.decision);
  const status = final ? adminDecision.decision : statusRequest.status;
  const isApproved = status === 'approved';
  const isDeclined = status === 'declined';
  const companyName = request.job?.companyName || request.employer?.employerProfile?.companyName || '—';
  const responseReason = employerResponse.declineReason || employerResponse.reason || '—';
  const responseComment = employerResponse.explanation || employerResponse.comment || '—';
  const decisionPerson = final ? adminDecision.decidedBy : employerResponse.respondedBy || request.employer;
  const decisionDate = final ? adminDecision.decidedAt : employerResponse.respondedAt;

  return <div className="mx-auto max-w-[1450px] space-y-5 px-1 py-8">
    <header className="flex flex-wrap items-center justify-between gap-4 px-1">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={()=>navigate(`/admin/jobseeker-status-requests/${jobseekerId}`)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
          aria-label="Back"
        >
          <ArrowLeft size={19}/>
        </button>
        <div>
          <h1 className="text-[22px] font-bold leading-tight text-slate-900">Job Seeker Request</h1>
          <p className="mt-1 text-sm text-slate-500">Review the details below and take action on the request.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          disabled={!employerAnswered || final}
          onClick={()=>setConfirm('approved')}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          <Check size={17}/>Approve Request
        </button>
        <button
          disabled={!employerAnswered || final}
          onClick={()=>setConfirm('declined')}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-red-600 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          <X size={17}/>Decline Request
        </button>
      </div>
    </header>

    <section className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
      <div className="grid gap-y-5 md:grid-cols-[1.15fr_1fr_1fr_1.15fr_0.9fr] md:divide-x md:divide-slate-200">
        <SummaryInfo
          icon={<UserRound size={18}/>} 
          label="Jobseeker"
          value={name(request.jobseeker)}
          sub={request.jobseeker?.email}
          first
        />
        <SummaryInfo icon={<CalendarDays size={17}/>} label="Requested Date" value={date(statusRequest.requestedAt)} />
        <SummaryInfo icon={<Building2 size={17}/>} label="Company" value={companyName} />
        <SummaryInfo icon={<BriefcaseBusiness size={17}/>} label="Job Title" value={request.job?.title} />
        <SummaryInfo
          icon={<FileText size={17}/>} 
          label="Request"
          value={reason(statusRequest.reason)}
          badge
        />
      </div>
    </section>

    <div className="grid gap-5 lg:grid-cols-2">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-6 flex items-center gap-2 text-[16px] font-semibold text-emerald-700">
          <CalendarCheck2 size={19}/>
          Employment Details
        </h2>
        <div className="grid gap-5 sm:grid-cols-3">
          <DetailItem icon={<CalendarDays size={16}/>} label="Applied Date" value={date(request.appliedAt)} />
          <DetailItem icon={<Clock3 size={16}/>} label="Date Hired" value={date(request.hiredAt || request.reviewedAt)} />
          <DetailItem icon={<Clock3 size={16}/>} label="Employment Duration" value={duration(request)} />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${isDeclined ? 'bg-red-600' : isApproved ? 'bg-emerald-600' : 'bg-slate-400'} text-white`}>
            {isDeclined ? <X size={22}/> : <Check size={22}/>} 
          </span>
          <div className="min-w-0 flex-1">
            <h2 className={`text-lg font-semibold capitalize ${isDeclined ? 'text-red-600' : isApproved ? 'text-emerald-700' : 'text-slate-700'}`}>
              {status === 'no_response' ? 'No Response' : status.replace('_',' ')}
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {status === 'pending' ? 'Waiting for the employer to respond to this request.' : status === 'no_response' ? 'No response received. The employer did not respond to this request within 7 days.' : `The request has been ${status}.`}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <DetailItem
            icon={<UserRound size={16}/>} 
            label={final ? (adminDecision.decision === 'approved' ? 'Approved By' : 'Declined By') : (employerResponse.decision === 'declined' ? 'Declined By' : 'Approved By')}
            value={name(decisionPerson)}
          />
          <DetailItem
            icon={<CalendarDays size={16}/>} 
            label="Date & Time"
            value={date(decisionDate, true)}
          />
        </div>
      </section>
    </div>

    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="flex items-center gap-2 text-[16px] font-semibold text-slate-900">
        <FileText size={19}/>
        Reason
      </h2>
      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-700">
        {responseReason === '—' ? reason(statusRequest.reason) : reason(responseReason)}
      </div>
    </section>

    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="flex items-center gap-2 text-[16px] font-semibold text-slate-900">
        <MessageSquare size={19}/>
        Comment
      </h2>
      <div className="mt-4 min-h-[64px] rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-700">
        {responseComment}
      </div>
    </section>

    {confirm && <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4"><div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><h2 className="text-xl font-bold capitalize">{confirm} Request?</h2><p className="mt-3 text-slate-600">{confirm === 'approved' ? "Are you sure you want to approve this request to end the job seeker's current employment status? The status will change from Active to Inactive." : "Are you sure you want to decline the job seeker's request? The current employment status will remain Active."}</p><p className="mt-4 rounded-xl bg-slate-50 p-4"><b>Request Reason:</b> {reason(statusRequest.reason)}</p><div className="mt-5 grid grid-cols-2 gap-3"><button onClick={()=>setConfirm('')} className="rounded-xl border py-3 font-semibold">Cancel</button><button disabled={saving} onClick={decide} className={`rounded-xl py-3 font-semibold text-white ${confirm === 'approved' ? 'bg-[#2e66a6]' : 'bg-red-600'}`}>{saving ? 'Processing...' : `${confirm === 'approved' ? 'Approve' : 'Decline'} Request`}</button></div></div></div>}
    {success && <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4"><div className="w-full max-w-md rounded-2xl bg-white p-7 text-center shadow-2xl"><CheckCircle2 className="mx-auto text-emerald-600" size={42}/>{success.split('\n').map(line=><p key={line} className="mt-3 first:text-xl first:font-bold">{line}</p>)}<button onClick={()=>setSuccess('')} className="mt-5 rounded-xl bg-[#2e66a6] px-8 py-3 font-semibold text-white">Close</button></div></div>}
  </div>;
}

const SummaryInfo = ({ icon, label, value, sub, first = false, badge = false }) => <div className={`min-w-0 ${first ? 'md:pr-5' : 'md:px-5'}`}><div className="flex items-start gap-3">{first && <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">{icon}</span>}<div className="min-w-0"><p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500">{!first && <span className="shrink-0 text-slate-500">{icon}</span>}{label}</p><p className={`mt-2 break-words text-sm font-semibold ${badge ? 'inline-flex rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-500' : 'text-slate-900'}`}>{value || '—'}</p>{sub&&<p className="mt-0.5 break-all text-xs text-slate-500">{sub}</p>}</div></div></div>;
const DetailItem = ({ icon, label, value }) => <div className="min-w-0"><p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500"><span className="text-slate-400">{icon}</span>{label}</p><p className="mt-2 break-words text-sm font-semibold text-slate-900">{value || '—'}</p></div>;
