import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Mail,
  Phone,
  UserRound,
  XCircle,
} from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';

const API_ORIGIN = 'https://phinmaau-job-portal-atlas.onrender.com';

const assetUrl = (value, fallback = '/images/default-company-logo.png') => {
  const source = String(value || '').trim();
  if (!source) return fallback;
  if (/^(https?:|data:|blob:)/i.test(source)) return source;
  return `${API_ORIGIN}${source.startsWith('/') ? '' : '/'}${source}`;
};

const formatDate = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatDateTime = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '—';

  const dateLabel = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const timeLabel = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return `${dateLabel} • ${timeLabel}`;
};

const fullName = (user = {}) =>
  user?.fullName ||
  [user?.firstName, user?.middleName, user?.lastName].filter(Boolean).join(' ') ||
  '—';

const requestReasonLabel = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'contract_ended' || normalized === 'contract_end') return 'Contract Ended';
  if (normalized === 'employment_ended') return 'Employment Ended';
  if (normalized === 'resigned' || normalized === 'resignation') return 'Resigned';
  if (normalized === 'terminated' || normalized === 'termination') return 'Terminated';
  return String(value || '').replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) || 'Employment Ended';
};

const requestStatus = (request = {}) => {
  const statusRequest = request?.employmentStatusRequest || {};
  const directStatus = String(statusRequest.status || '').toLowerCase();
  if (['approved', 'declined', 'no_response'].includes(directStatus)) return directStatus;

  const employerDecision = String(statusRequest.employerResponse?.decision || '').toLowerCase();
  if (['approved', 'declined', 'no_response'].includes(employerDecision)) return employerDecision;

  const legacyAdminDecision = String(statusRequest.adminDecision?.decision || '').toLowerCase();
  if (['approved', 'declined'].includes(legacyAdminDecision)) return legacyAdminDecision;

  return 'pending';
};

const employmentDuration = (request = {}) => {
  const start = request?.hiredAt || request?.reviewedAt;
  if (!start) return '—';

  const startDate = new Date(start);
  const endDate = request?.employmentEndedAt ? new Date(request.employmentEndedAt) : new Date();

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return '—';

  const totalDays = Math.max(0, Math.floor((endDate.getTime() - startDate.getTime()) / 86400000));
  if (totalDays < 30) return `${totalDays} day${totalDays === 1 ? '' : 's'}`;

  const months = Math.max(1, Math.floor(totalDays / 30));
  return `${months} month${months === 1 ? '' : 's'}`;
};

const responseDeadline = (requestedAt) => {
  const date = requestedAt ? new Date(requestedAt) : null;
  if (!date || Number.isNaN(date.getTime())) return null;
  return new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000);
};

const InfoValue = ({ label, value, icon = null }) => (
  <div className="min-w-0">
    <p className="flex items-center gap-2 text-[11px] font-medium text-[#60758f]">
      {icon ? <span className="shrink-0 text-[#2e66a6]">{icon}</span> : null}
      {label}
    </p>
    <p className="mt-1 break-words text-sm font-semibold text-slate-950">{value || '—'}</p>
  </div>
);

const AdminJobseekerRequestDetails = () => {
  const { jobseekerId, requestId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [request, setRequest] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    setError('');

    api
      .get(`/applications/admin/employment-status-requests/jobseeker/${jobseekerId}/${requestId}`)
      .then(({ data }) => {
        if (active) setRequest(data?.request || null);
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError.response?.data?.message || 'Unable to load request.');
        }
      });

    return () => {
      active = false;
    };
  }, [jobseekerId, requestId]);

  const status = useMemo(() => requestStatus(request), [request]);

  if (!request) {
    if (error) {
      return <div className="mx-auto mt-10 max-w-xl rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-700">{error}</div>;
    }

    return <div className="min-h-[70vh] w-full bg-white" aria-hidden="true" />;
  }

  const statusRequest = request.employmentStatusRequest || {};
  const employerResponse = statusRequest.employerResponse || {};
  const requestedAt = statusRequest.requestedAt;
  const respondedAt = employerResponse.respondedAt || statusRequest.reviewedAt;
  const noResponseAt = statusRequest.noResponseAt;
  const deadline = responseDeadline(requestedAt);

  const isPending = status === 'pending';
  const isApproved = status === 'approved';
  const isDeclined = status === 'declined';
  const isNoResponse = status === 'no_response';

  const employer = request.employer || {};
  const jobseeker = request.jobseeker || {};
  const job = request.job || {};
  const companyName = job.companyName || employer?.employerProfile?.companyName || fullName(employer);
  const companyLogo = job.companyLogo || employer?.employerProfile?.companyLogo;
  const companyAddress = job.location || 'Location not specified';
  const employerContact =
    employer?.employerProfile?.mobileNumber ||
    employer.contactNumber ||
    employer.phoneNumber ||
    employer?.employerProfile?.contactNumber ||
    '—';

  const backPath =
    location.state?.backPath ||
    `/admin/jobseeker-status-requests/${jobseekerId}`;

  const statusMeta = isApproved
    ? {
        title: 'Request Approved',
        description: 'The employer has approved the request.',
        sideLabel: 'Approved On',
        sideValue: formatDateTime(respondedAt),
        banner: 'border-emerald-300 bg-emerald-50 text-emerald-700',
        icon: <CheckCircle2 size={29} />,
      }
    : isDeclined
      ? {
          title: 'Request Declined',
          description: 'The employer has declined this request.',
          sideLabel: 'Declined On',
          sideValue: formatDateTime(respondedAt),
          banner: 'border-red-300 bg-red-50 text-red-700',
          icon: <XCircle size={29} />,
        }
      : isNoResponse
        ? {
            title: 'No Response',
            description: 'The employer did not respond within the 7-days response period.',
            sideLabel: 'Requested On',
            sideValue: formatDateTime(requestedAt),
            banner: 'border-slate-300 bg-slate-100 text-slate-600',
            icon: <Clock3 size={29} />,
          }
        : {
            title: 'Awaiting Employer Response',
            description: 'The employer has not responded to this request yet.',
            sideLabel: 'Requested On',
            sideValue: formatDateTime(requestedAt),
            banner: 'border-amber-300 bg-amber-50 text-amber-700',
            icon: <Clock3 size={29} />,
          };

  const responseCardClass = isApproved
    ? 'border-emerald-200 bg-emerald-50'
    : isDeclined
      ? 'border-red-200 bg-red-50'
      : 'border-slate-200 bg-slate-50';

  const responseValue = isApproved
    ? 'Approved'
    : isDeclined
      ? 'Declined'
      : isNoResponse
        ? 'No Response'
        : 'Pending';

  const responseTimeLabel = isNoResponse ? 'Response Deadline' : 'Response Date and Time';
  const responseTimeValue = isPending
    ? 'Awaiting response'
    : isNoResponse
      ? formatDateTime(deadline || noResponseAt)
      : formatDateTime(respondedAt);

  const responseNotice = isApproved
    ? {
        title: 'Status Updated',
        text: "The job seeker's employment status has been updated to Inactive.",
      }
    : isDeclined
      ? {
          title: 'Request Declined',
          text: 'The job seeker employment status remains Active.',
        }
      : isNoResponse
        ? {
            title: 'No Employer Response',
            text: 'The employer did not respond within the 7-days response period.',
          }
        : {
            title: 'Response Pending',
            text: 'The employment status will remain unchanged until the employer responds.',
          };

  return (
    <div className="mx-auto max-w-[1450px] space-y-5 px-1 py-8">
      <header className="flex items-center gap-5">
        <button
          type="button"
          onClick={() => navigate(backPath, { state: location.state?.backState })}
          className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-50"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-[28px] font-bold leading-tight text-slate-950">Employment Status Request</h1>
          </div>
          <p className="mt-1 text-sm text-[#60758f]">Review the job seeker's request and the employer's response.</p>
        </div>
      </header>

      <section className={`flex flex-col gap-4 rounded-xl border px-5 py-4 md:flex-row md:items-center md:justify-between ${statusMeta.banner}`}>
        <div className="flex min-w-0 items-center gap-4">
          <span className="shrink-0">{statusMeta.icon}</span>
          <div className="min-w-0">
            <h2 className="text-sm font-bold">{statusMeta.title}</h2>
            <p className="mt-1 text-xs">{statusMeta.description}</p>
          </div>
        </div>

        <div className="shrink-0 border-t border-current/15 pt-3 md:border-l md:border-t-0 md:pl-6 md:pt-0">
          <p className="text-[11px] opacity-70">{statusMeta.sideLabel}</p>
          <p className="mt-1 text-sm font-bold">{statusMeta.sideValue}</p>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-bold text-slate-950">Employer Response</h2>

        <div className={`grid gap-4 rounded-lg border p-4 md:grid-cols-[1fr_1fr_1.15fr] md:items-stretch ${responseCardClass}`}>
          <InfoValue label="Response" value={responseValue} />

          <div className="border-t border-slate-200/70 pt-4 md:border-l md:border-t-0 md:pl-5 md:pt-0">
            <InfoValue label={responseTimeLabel} value={responseTimeValue} />
          </div>

          <div className="border-t border-slate-200/70 pt-4 md:border-l md:border-t-0 md:pl-5 md:pt-0">
            <div className="h-full rounded-lg border border-current/15 bg-white/35 px-4 py-3">
              <p className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                {isApproved ? <CheckCircle2 size={15} /> : isDeclined ? <XCircle size={15} /> : <Clock3 size={15} />}
                {responseNotice.title}
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-600">{responseNotice.text}</p>
            </div>
          </div>
        </div>
      </section>

      {isDeclined && (
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[#60758f]">
                Status Request Decline Reason
              </p>
              <p className="mt-2 text-sm font-medium text-slate-900">
                {employerResponse.declineReason || '—'}
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[#60758f]">
                Explanation
              </p>
              <p className="mt-2 text-sm font-medium text-slate-900">
                {employerResponse.explanation || '—'}
              </p>
            </div>
          </div>
        </section>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-5 text-sm font-bold text-slate-950">Employer Contact Details</h2>
        <div className="grid gap-5 md:grid-cols-3">
          <InfoValue label="Employer Name" value={fullName(employer)} icon={<UserRound size={16} />} />
          <InfoValue label="Email" value={employer.email} icon={<Mail size={16} />} />
          <InfoValue label="Contact Number" value={employerContact} icon={<Phone size={16} />} />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-5 text-sm font-bold text-slate-950">Job Seeker Information</h2>
        <div className="grid gap-5 md:grid-cols-[1.3fr_1fr_1fr] md:items-center">
          <div className="flex min-w-0 items-center gap-3">
            {jobseeker.profileImage ? (
              <img src={assetUrl(jobseeker.profileImage, '/images/default-avatar.png')} alt={fullName(jobseeker)} className="h-12 w-12 rounded-full border border-slate-200 object-cover" />
            ) : (
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#eef4fb] text-sm font-bold text-[#2e66a6]">
                {fullName(jobseeker).split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-950">{fullName(jobseeker)}</p>
              <p className="mt-1 truncate text-xs text-[#60758f]">{jobseeker.email || '—'}</p>
            </div>
          </div>

          <InfoValue label="Course" value={jobseeker?.jobSeekerProfile?.course} />
          <InfoValue label="Campus" value={jobseeker?.jobSeekerProfile?.campus} />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-5 text-sm font-bold text-slate-950">Company Information</h2>
          <div className="flex items-center gap-4">
            <img
              src={assetUrl(companyLogo)}
              alt={`${companyName} logo`}
              className="h-12 w-12 shrink-0 rounded-xl border border-slate-200 bg-white object-cover"
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = '/images/default-company-logo.png';
              }}
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-950">{companyName}</p>
              <p className="mt-1 text-xs text-[#60758f]">{companyAddress}</p>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-5 text-sm font-bold text-slate-950">Job Details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <InfoValue label="Job Title" value={job.title} icon={<BriefcaseBusiness size={15} />} />
            <InfoValue label="Employment Type" value={job.jobType} />
            <InfoValue label="Work Mode" value={job.workMode} />

            <div className="flex items-end">
              <button
                type="button"
                disabled={!job?._id}
                onClick={() => {
                  if (!job?._id) return;
                  navigate(`/admin/jobs/${job._id}`, {
                    state: {
                      backPath: location.pathname,
                      backLabel: 'Employment Status Request',
                      backState: location.state,
                    },
                  });
                }}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 shadow-sm transition hover:border-[#2e66a6] hover:text-[#2e66a6] disabled:cursor-not-allowed disabled:opacity-50"
              >
                View Job
                <ExternalLink size={15} />
              </button>
            </div>
          </div>
        </section>
      </div>

      <section className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
        <InfoValue label="Applied Date" value={formatDate(request.appliedAt)} icon={<CalendarDays size={15} />} />
        <InfoValue label="Date Hired" value={formatDate(request.hiredAt || request.reviewedAt)} icon={<CalendarDays size={15} />} />
        <InfoValue label="Employment Duration" value={employmentDuration(request)} icon={<Clock3 size={15} />} />
        <InfoValue label="Request Date" value={formatDate(requestedAt)} icon={<Building2 size={15} />} />
      </section>

      <section className="sr-only" aria-hidden="true">
        {requestReasonLabel(statusRequest.reason)}
      </section>
    </div>
  );
};

export default AdminJobseekerRequestDetails;
