import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  GraduationCap,
  Clock3,
  ExternalLink,
  Mail,
  MapPin,
  Phone,
  UserRound,
  XCircle,
} from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import { JobDetailsSvgIcon } from '../../components/shared/JobseekerIcons';

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


const formatSalary = (job = {}) => {
  if (job?.hideSalary) return 'Salary Undisclosed';

  const minimum = Number(job?.salaryMin);
  const maximum = Number(job?.salaryMax);
  const hasMinimum = Number.isFinite(minimum) && minimum > 0;
  const hasMaximum = Number.isFinite(maximum) && maximum > 0;

  const amount = (value) => Number(value).toLocaleString('en-PH');

  if (hasMinimum && hasMaximum) return `${amount(minimum)} – ${amount(maximum)}`;
  if (hasMinimum) return amount(minimum);
  if (hasMaximum) return amount(maximum);
  return '—';
};

const experienceLabel = (value) => {
  const normalized = String(value || '').trim();
  if (!normalized) return '—';
  if (normalized.toLowerCase() === 'no experience required') return 'No experience';
  return normalized;
};

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
            text: "Waiting for the employer's response.",
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
            <h1 className="text-[26px] font-semibold leading-tight text-gray-900 sm:text-[33px]">Employment Status Request</h1>
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

      <section className="rounded-[22px] border border-gray-300 bg-white p-4 shadow-sm">
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
        <section className="rounded-[22px] border border-gray-300 bg-white p-4 shadow-sm">
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

      <section className="overflow-hidden rounded-[22px] border border-gray-300 bg-white shadow-sm">
        <div className="grid min-h-[140px] md:grid-cols-[1.28fr_0.86fr_0.86fr]">
          <div
            className="relative flex min-h-[140px] items-center overflow-hidden px-7 py-5 text-white"
            style={{
              backgroundImage: "url('/images/papel.png')",
              backgroundPosition: '75% center',
              backgroundRepeat: 'no-repeat',
              backgroundSize: 'cover',
            }}
          >
            <div className="relative z-10 flex min-w-0 items-center gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm">
                <svg
                  className="h-[23px] w-[23px]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.7"
                    d="M3.75 21h16.5M5.25 21V3h13.5v18M9 7h1.5M9 11h1.5m3-4H15m-1.5 4H15M9 21v-4.5h6V21"
                  />
                </svg>
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-medium text-white/80">Employer Contact Details</p>
                <p className="mt-1 truncate text-[15px] font-semibold text-white">{fullName(employer)}</p>
                <p className="mt-1 text-[11px] font-medium text-white/80">Employer</p>
                <span className="mt-1.5 block h-[2px] w-10 rounded-full bg-white/90" />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 border-t border-slate-100 px-6 py-5 md:border-l md:border-t-0">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#eaf2fb] text-[#2e66a6]">
              <Mail size={18} />
            </span>
            <InfoValue label="Email" value={employer.email} />
          </div>

          <div className="flex items-center gap-3 border-t border-slate-100 px-6 py-5 md:border-l md:border-t-0">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#eaf2fb] text-[#2e66a6]">
              <Phone size={18} />
            </span>
            <InfoValue label="Contact Number" value={employerContact} />
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          <section className="rounded-[22px] border border-gray-300 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2e66a6] text-white">
                <UserRound size={17} />
              </span>
              <div>
                <h2 className="text-sm font-bold text-slate-950">Job Seeker Information</h2>
                <span className="mt-1 block h-[2px] w-10 rounded-full bg-[#2e66a6]" />
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-[1.15fr_1.25fr_0.75fr] md:items-center">
              <div className="flex min-w-0 items-center gap-3">
                {jobseeker.profileImage ? (
                  <img src={assetUrl(jobseeker.profileImage, '/images/default-avatar.png')} alt={fullName(jobseeker)} className="h-12 w-12 rounded-full border border-slate-200 object-cover" />
                ) : (
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#eef4fb] text-sm font-bold text-[#2e66a6]">
                    {fullName(jobseeker).split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}
                  </span>
                )}
                <div className="min-w-0">
                  <p
                    className={`whitespace-nowrap font-semibold leading-5 text-slate-950 ${
                      fullName(jobseeker).length > 36
                        ? 'text-[9px]'
                        : fullName(jobseeker).length > 28
                        ? 'text-[10px]'
                        : fullName(jobseeker).length > 20
                        ? 'text-[11px]'
                        : 'text-sm'
                    }`}
                  >
                    {fullName(jobseeker)}
                  </p>
                  <p className="mt-1 truncate text-xs text-[#60758f]">{jobseeker.email || '—'}</p>
                </div>
              </div>

              <div className="flex min-w-0 items-center gap-3 border-slate-100 md:border-l md:pl-5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#eaf2fb] text-[#2e66a6]">
                  <GraduationCap size={17} />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-[#60758f]">Course</p>
                  <p
                    className={`mt-1 break-words font-semibold leading-5 text-slate-950 ${
                      String(jobseeker?.jobSeekerProfile?.course || '').length > 40
                        ? 'text-[10px]'
                        : String(jobseeker?.jobSeekerProfile?.course || '').length > 26
                        ? 'text-[12px]'
                        : 'text-sm'
                    }`}
                  >
                    {jobseeker?.jobSeekerProfile?.course || '—'}
                  </p>
                </div>
              </div>

              <div className="flex min-w-0 items-center gap-3 border-slate-100 md:border-l md:pl-5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#eaf2fb] text-[#2e66a6]">
                  <Building2 size={17} />
                </span>
                <InfoValue label="Campus" value={jobseeker?.jobSeekerProfile?.campus} />
              </div>
            </div>
          </section>

          <section className="rounded-[22px] border border-gray-300 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2e66a6] text-white">
                <svg
                  className="h-[17px] w-[17px]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.7"
                    d="M3.75 21h16.5M5.25 21V3h13.5v18M9 7h1.5M9 11h1.5m3-4H15m-1.5 4H15M9 21v-4.5h6V21"
                  />
                </svg>
              </span>
              <div>
                <h2 className="text-sm font-bold text-slate-950">Company Information</h2>
                <span className="mt-1 block h-[2px] w-10 rounded-full bg-[#2e66a6]" />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <img
                src={assetUrl(companyLogo)}
                alt={`${companyName} logo`}
                className="h-14 w-14 shrink-0 rounded-xl border border-slate-200 bg-white object-cover"
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = '/images/default-company-logo.png';
                }}
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-950">{companyName}</p>
                <p className="mt-1 flex items-center gap-2 text-xs text-[#60758f]">
                  <BriefcaseBusiness size={13} className="shrink-0 text-[#2e66a6]" />
                  <span className="truncate">{job.industry || employer?.employerProfile?.industry || '—'}</span>
                </p>
                <p className="mt-1 flex items-start gap-2 text-xs leading-5 text-[#60758f]">
                  <MapPin size={13} className="mt-0.5 shrink-0 text-[#2e66a6]" />
                  <span>{companyAddress}</span>
                </p>
              </div>
            </div>
          </section>
        </div>

        <section className="flex flex-col rounded-[22px] border border-gray-300 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2e66a6] text-white">
              <JobDetailsSvgIcon name="briefcase" className="h-[17px] w-[17px]" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-950">Job Details</h2>
              <span className="mt-1 block h-[2px] w-10 rounded-full bg-[#2e66a6]" />
            </div>
          </div>

          <div className="flex flex-1 flex-col">
            <div className="grid gap-0 border-b border-slate-100 pb-4 sm:grid-cols-2">
              <div className="flex min-w-0 items-center gap-3 sm:pr-5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#eaf2fb] text-[#2e66a6]">
                  <JobDetailsSvgIcon name="file" className="h-4 w-4" />
                </span>
                <InfoValue label="Job Title" value={job.title} />
              </div>

              <div className="mt-4 flex min-w-0 items-center gap-3 border-slate-100 sm:mt-0 sm:border-l sm:pl-5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#eaf2fb] text-[#2e66a6]">
                  <JobDetailsSvgIcon name="briefcase" className="h-4 w-4" />
                </span>
                <InfoValue label="Employment Type" value={job.jobType} />
              </div>
            </div>

            <div className="grid gap-0 border-b border-slate-100 py-4 sm:grid-cols-3">
              <div className="flex min-w-0 items-center gap-3 sm:pr-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#eaf2fb] text-[#2e66a6]">
                  <JobDetailsSvgIcon name="location" className="h-4 w-4" />
                </span>
                <InfoValue label="Work Mode" value={job.workMode} />
              </div>

              <div className="mt-4 flex min-w-0 items-center gap-3 border-slate-100 sm:mt-0 sm:border-l sm:px-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#eaf2fb] text-[#2e66a6]">
                  <span className="text-[17px] font-bold leading-none">₱</span>
                </span>
                <InfoValue label="Salary" value={formatSalary(job)} />
              </div>

              <div className="mt-4 flex min-w-0 items-center gap-3 border-slate-100 sm:mt-0 sm:border-l sm:pl-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#eaf2fb] text-[#2e66a6]">
                  <UserRound size={16} />
                </span>
                <InfoValue label="Experience" value={experienceLabel(job.experienceLevel)} />
              </div>
            </div>

            <div className="grid flex-1 gap-4 pt-4 sm:grid-cols-3 sm:items-center">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#eaf2fb] text-[#2e66a6]">
                  <JobDetailsSvgIcon name="clock" className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="whitespace-nowrap text-[10px] font-medium text-[#60758f]">Employment Duration</p>
                  <p className="mt-1 whitespace-nowrap text-sm font-semibold text-slate-950">{employmentDuration(request)}</p>
                </div>
              </div>

              <div className="flex min-w-0 items-center sm:h-full sm:justify-center sm:border-l sm:border-slate-100 sm:px-4">
                <span className="inline-flex whitespace-nowrap rounded-full bg-[#fff1e8] px-3 py-1.5 text-[10px] font-semibold text-[#d96b2b]">
                  {requestReasonLabel(statusRequest.reason)}
                </span>
              </div>

              <div className="flex min-w-0 items-center sm:h-full sm:justify-center sm:border-l sm:border-slate-100 sm:pl-4">
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
                  className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-[#2e66a6]/30 bg-white px-5 text-sm font-semibold text-[#2e66a6] shadow-sm transition hover:bg-[#f4f8fd] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  View Job
                  <ExternalLink size={15} />
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="grid gap-4 rounded-[22px] border border-gray-300 bg-white p-5 shadow-sm sm:grid-cols-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#eaf2fb] text-[#2e66a6]"><CalendarDays size={17} /></span>
          <InfoValue label="Applied Date" value={formatDate(request.appliedAt)} />
        </div>
        <div className="flex items-center gap-3 border-slate-100 sm:border-l sm:pl-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#eaf2fb] text-[#2e66a6]"><CalendarDays size={17} /></span>
          <InfoValue label="Date Hired" value={formatDate(request.hiredAt || request.reviewedAt)} />
        </div>
        <div className="flex items-center gap-3 border-slate-100 sm:border-l sm:pl-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#eaf2fb] text-[#2e66a6]"><CalendarDays size={17} /></span>
          <InfoValue label="Request Date" value={formatDate(requestedAt)} />
        </div>
      </section>

      <section className="sr-only" aria-hidden="true">
        {requestReasonLabel(statusRequest.reason)}
      </section>
    </div>
  );
};

export default AdminJobseekerRequestDetails;
