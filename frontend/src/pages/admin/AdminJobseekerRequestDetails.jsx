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
  const load = () => api.get(`/applications/admin/employment-status-requests/jobseeker/${jobseekerId}/${requestId}`).then(({data})=>setRequest(data.request)).catch(err=>setError(err.response?.data?.message || 'Unable to load request.'));
  useEffect(() => {
    load();
  }, [jobseekerId, requestId]);
  if (!request) {
    if (error) return <div className="p-10 text-center">{error}</div>;
    return <div className="min-h-[70vh] w-full bg-white" aria-hidden="true" />;
  }

  const statusRequest = request.employmentStatusRequest || {};
  const employerResponse = statusRequest.employerResponse || {};
  const employerDecision = String(employerResponse.decision || 'pending').toLowerCase();
  const employerAnswered = ['approved','declined','no_response'].includes(employerDecision) || statusRequest.status === 'no_response';
  const status = String(statusRequest.status || 'pending').toLowerCase();
  const isApproved = status === 'approved';
  const isDeclined = status === 'declined';
  const isWaiting = status === 'pending';
  const showDecisionDetails = employerAnswered && employerDecision !== 'no_response';
  const showDeclineDetails = employerDecision === 'declined';
  const companyName = request.job?.companyName || request.employer?.employerProfile?.companyName || '—';
  const responseReason = String(employerResponse.declineReason || employerResponse.reason || '').trim();
  const responseComment = String(employerResponse.explanation || employerResponse.comment || '').trim();
  const decisionPerson = employerResponse.respondedBy || request.employer;
  const decisionDate = employerResponse.respondedAt || statusRequest.reviewedAt;

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
          <h1 className="text-[22px] font-bold leading-tight text-slate-900">Employment Status Update Request</h1>
          <p className="mt-1 text-sm text-slate-500">View the Employer's response to this employment status request.</p>
        </div>
      </div>
    </header>

    <section className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
      <div className="grid gap-y-5 md:grid-cols-[1.15fr_1fr_1fr_1.15fr_0.9fr] md:divide-x md:divide-slate-200">
        <SummaryInfo
          icon={<UserRound size={18}/>} 
          label="Employer"
          value={name(request.employer)}
          sub={request.employer?.email}
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
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${isDeclined ? 'bg-red-600' : isApproved ? 'bg-emerald-600' : status === 'no_response' ? 'bg-amber-500' : 'bg-slate-400'} text-white`}>
            {isWaiting ? <Clock3 size={22}/> : isDeclined || status === 'no_response' ? <X size={22}/> : <Check size={22}/>} 
          </span>
          <div className="min-w-0 flex-1">
            <h2 className={`text-lg font-semibold capitalize ${isDeclined ? 'text-red-600' : isApproved ? 'text-emerald-700' : 'text-slate-700'}`}>
              {status === 'no_response' ? 'No Response' : status.replace('_',' ')}
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {status === 'pending'
                ? 'Waiting for the employer to respond to this request.'
                : status === 'no_response'
                  ? 'The employer did not respond to this request within 7 days.'
                  : status === 'approved'
                    ? 'The Employment status has been approved.'
                    : 'The Employment status has been declined.'}
            </p>
          </div>
        </div>

        {showDecisionDetails && <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <DetailItem
            icon={<UserRound size={16}/>} 
            label={employerResponse.decision === 'declined' ? 'Declined By' : 'Approved By'}
            value={name(decisionPerson)}
          />
          <DetailItem
            icon={<CalendarDays size={16}/>} 
            label="Date & Time"
            value={date(decisionDate, true)}
          />
        </div>}
      </section>
    </div>

    {showDeclineDetails && <div className="grid gap-5 lg:grid-cols-2">
      <section className="rounded-2xl border border-purple-200 bg-purple-50/50 p-6 shadow-sm">
        <h2 className="flex items-center gap-2 text-[16px] font-semibold text-purple-800">
          <FileText size={19}/>
          Reason
        </h2>
        <div className="mt-4 rounded-xl border border-purple-200 bg-white/80 px-4 py-4 text-sm leading-6 text-slate-700">
          {responseReason || 'No decline reason was provided.'}
        </div>
      </section>

      <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-6 shadow-sm">
        <h2 className="flex items-center gap-2 text-[16px] font-semibold text-amber-800">
          <MessageSquare size={19}/>
          Comment
        </h2>
        <div className="mt-4 min-h-[64px] rounded-xl border border-amber-200 bg-white/80 px-4 py-4 text-sm leading-6 text-slate-700">
          {responseComment || 'No additional comment was provided.'}
        </div>
      </section>
    </div>}

  </div>;
}

const SummaryInfo = ({ icon, label, value, sub, first = false, badge = false }) => <div className={`min-w-0 ${first ? 'md:pr-5' : 'md:px-5'}`}><div className="flex items-start gap-3">{first && <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">{icon}</span>}<div className="min-w-0"><p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500">{!first && <span className="shrink-0 text-slate-500">{icon}</span>}{label}</p><p className={`mt-2 break-words text-sm font-semibold ${badge ? 'inline-flex rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-500' : 'text-slate-900'}`}>{value || '—'}</p>{sub&&<p className="mt-0.5 break-all text-xs text-slate-500">{sub}</p>}</div></div></div>;
const DetailItem = ({ icon, label, value }) => <div className="min-w-0"><p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500"><span className="text-slate-400">{icon}</span>{label}</p><p className="mt-2 break-words text-sm font-semibold text-slate-900">{value || '—'}</p></div>;
