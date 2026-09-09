import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Building2,
  CalendarClock,
  Check,
  Clock3,
  FileEdit,
  Search,
  ShieldAlert,
  UnlockKeyhole,
  XCircle,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';

const API_ORIGIN = 'https://phinmaau-job-portal-atlas.onrender.com';

const assetUrl = (value, fallback = '/images/default-company-logo.png') => {
  const source = String(value || '').trim();
  if (!source) return fallback;
  if (/^(https?:|data:|blob:)/i.test(source)) return source;
  return `${API_ORIGIN}${source.startsWith('/') ? '' : '/'}${source}`;
};

const formatDateTime = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return 'Not specified';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const startOfDay = (value) => {
  const date = new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const AdminEmployerJobEditRequestReview = () => {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('pending');
  const [time, setTime] = useState('all');
  const [sort, setSort] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [confirmation, setConfirmation] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    let active = true;
    api
      .get(`/job-edit-requests/admin/${requestId}`)
      .then(({ data }) => {
        if (active) setRequest(data?.request || null);
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || 'Unable to load edit request details.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [requestId]);

  useEffect(() => {
    if (!confirmation && !success) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [confirmation, success]);

  useEffect(() => {
    if (!success) return undefined;
    const timer = window.setTimeout(() => setSuccess(null), 3000);
    return () => window.clearTimeout(timer);
  }, [success]);

  const job = request?.job || {};
  const employerProfile = request?.employer?.employerProfile || {};
  const companyName = job.companyName || employerProfile.companyName || 'Employer';
  const industry = job.industry || employerProfile.industry || employerProfile.companyIndustry || 'Industry not specified';
  const sections = Array.isArray(request?.requestedSections) ? request.requestedSections : [];

  const requestMatches = useMemo(() => {
    if (!request) return false;

    const query = search.trim().toLowerCase();
    const normalizedStatus = String(request.status || '').toLowerCase();
    const statusMatches = status === 'all' || normalizedStatus === status;
    const createdAt = request.createdAt ? new Date(request.createdAt) : null;
    const validCreatedAt = createdAt && !Number.isNaN(createdAt.getTime());
    const today = startOfDay(new Date());
    let from = null;
    let to = null;

    if (time === 'today') {
      from = today;
      to = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    } else if (time === 'yesterday') {
      from = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
      to = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 23, 59, 59, 999);
    } else if (time === 'sevenDays') {
      from = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6);
      to = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    } else if (time === 'month') {
      from = new Date(today.getFullYear(), today.getMonth(), 1);
      to = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (time === 'lastMonth') {
      from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      to = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);
    } else if (time === 'custom') {
      from = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
      to = dateTo ? new Date(`${dateTo}T23:59:59.999`) : null;
    }

    const timeMatches =
      (!from || (validCreatedAt && createdAt >= from)) &&
      (!to || (validCreatedAt && createdAt <= to));
    const textMatches =
      !query ||
      sections.some((section) => String(section).toLowerCase().includes(query)) ||
      String(request.reason || '').toLowerCase().includes(query) ||
      String(job.title || '').toLowerCase().includes(query);

    return statusMatches && timeMatches && textMatches;
  }, [dateFrom, dateTo, job.title, request, search, sections, status, time]);

  const submitDecision = async () => {
    if (!confirmation || submitting || request?.status !== 'pending') return;

    try {
      setSubmitting(true);
      setError('');
      const endpoint = confirmation === 'approve' ? 'approve' : 'decline';
      const { data } = await api.patch(`/job-edit-requests/admin/${request._id}/${endpoint}`);
      setRequest((current) => ({ ...current, ...data?.request }));
      setConfirmation(null);
      setStatus('all');
      setSuccess(
        confirmation === 'approve'
          ? {
              title: 'Edit Request Approved',
              message: 'The employer can now edit the job post.',
            }
          : {
              title: 'Edit Request Cancelled',
              message: 'The employer’s edit request was cancelled.',
            }
      );
    } catch (requestError) {
      setConfirmation(null);
      setError(
        requestError.response?.data?.message ||
          `Unable to ${confirmation === 'approve' ? 'approve' : 'decline'} this request.`
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-[#d9e7f5] border-t-[#2e66a6]" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="mx-auto mt-10 max-w-xl rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
        {error || 'Edit request not found.'}
      </div>
    );
  }

  const isPending = request.status === 'pending';
  const statusLabel = request.status === 'rejected' ? 'Declined' : request.status;

  return (
    <div className="min-h-screen bg-transparent">
      <div className="mx-auto max-w-7xl px-1 py-8">
        <header className="mb-6 flex flex-col gap-4 rounded-2xl border border-[#e6edf5] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)] sm:flex-row sm:items-center sm:p-6">
          <button
            type="button"
            onClick={() => navigate(`/admin/employer-job-edit-requests/${requestId}`)}
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-[#d8e2ee] bg-white px-4 text-sm font-semibold text-black shadow-sm transition hover:border-[#2e66a6]/40 hover:bg-[#f7faff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6]"
          >
            <ArrowLeft size={17} /> Back
          </button>

          <img
            src={assetUrl(job.companyLogo || employerProfile.companyLogo || employerProfile.logo)}
            alt={`${companyName} logo`}
            className="h-16 w-16 shrink-0 rounded-full border border-[#e6edf5] bg-white object-contain p-1"
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = '/images/default-company-logo.png';
            }}
          />

          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold text-black sm:text-3xl">{companyName}</h1>
            <p className="mt-1 flex items-center gap-2 text-sm text-[#55708f] sm:text-base">
              <Building2 size={16} className="shrink-0" />
              <span className="truncate">{industry}</span>
            </p>
          </div>
        </header>

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        <section className="overflow-hidden rounded-2xl border border-[#d8e2ee] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
          <div className="border-b border-[#e6edf5] px-5 py-5 sm:px-6">
            <h2 className="flex items-center gap-2 text-xl font-semibold text-black">
              <FileEdit size={21} className="text-[#2e66a6]" /> Edit Request
            </h2>

            <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1.55fr)_145px_145px_145px]">
              <label className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7890aa]" size={17} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search request, section..."
                  className="h-11 w-full rounded-lg border border-[#cbdcf0] bg-white pl-10 pr-3 text-sm outline-none focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/10"
                />
              </label>

              <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-11 rounded-lg border border-[#cbdcf0] bg-white px-3 text-sm outline-none focus:border-[#2e66a6]">
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Declined</option>
              </select>

              <select value={time} onChange={(event) => setTime(event.target.value)} className="h-11 rounded-lg border border-[#cbdcf0] bg-white px-3 text-sm outline-none focus:border-[#2e66a6]">
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="sevenDays">Last 7 Days</option>
                <option value="month">This Month</option>
                <option value="lastMonth">Last Month</option>
                <option value="custom">Custom Range</option>
              </select>

              <select value={sort} onChange={(event) => setSort(event.target.value)} className="h-11 rounded-lg border border-[#cbdcf0] bg-white px-3 text-sm outline-none focus:border-[#2e66a6]">
                <option value="" disabled>Sort By</option>
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select>
            </div>

            {time === 'custom' && (
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:justify-end">
                <label className="text-xs font-semibold text-[#55708f]">
                  From
                  <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="ml-2 h-10 rounded-lg border border-[#cbdcf0] px-3 text-sm text-black" />
                </label>
                <label className="text-xs font-semibold text-[#55708f]">
                  To
                  <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="ml-2 h-10 rounded-lg border border-[#cbdcf0] px-3 text-sm text-black" />
                </label>
              </div>
            )}
          </div>

          <div className="bg-[#fbfdff] p-5 sm:p-6">
            {requestMatches ? (
              <article className="rounded-xl border border-[#75aef0] bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#55708f]">Job title</p>
                    <h3 className="mt-1 truncate text-lg font-semibold text-[#2e66a6]">{job.title || 'Untitled Job'}</h3>
                  </div>
                  <span className={`w-fit rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase ${isPending ? 'border-[#f5c979] bg-[#fff7e8] text-[#b55c00]' : request.status === 'approved' ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
                    {statusLabel}
                  </span>
                </div>

                <div className="mt-5">
                  <h4 className="text-sm font-semibold text-black">Sections to Edit</h4>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {sections.length ? sections.map((section) => (
                      <span key={section} className="rounded-lg border border-[#80b3ed] bg-[#f3f8fe] px-3 py-2 text-xs font-semibold text-[#2e66a6]">
                        {section}
                      </span>
                    )) : <span className="text-sm text-[#55708f]">No sections specified.</span>}
                  </div>
                </div>

                <div className="mt-5 rounded-lg border border-[#d7e0ea] bg-[#f4f7fa] p-4">
                  <p className="flex items-center gap-2 text-sm font-semibold text-black">
                    <FileEdit size={15} className="text-[#2e66a6]" /> Reason
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#55708f]">{request.reason || 'No reason provided.'}</p>
                </div>

                <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <p className="flex items-center gap-1.5 text-xs text-[#55708f]">
                    <Clock3 size={15} /> Request On: {formatDateTime(request.createdAt)}
                  </p>

                  {isPending && (
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <button type="button" onClick={() => setConfirmation('decline')} className="inline-flex h-11 min-w-[160px] items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-5 text-sm font-semibold text-red-600 transition hover:bg-red-50">
                        <XCircle size={17} /> Decline Request
                      </button>
                      <button type="button" onClick={() => setConfirmation('approve')} className="inline-flex h-11 min-w-[175px] items-center justify-center gap-2 rounded-xl bg-[#2e66a6] px-5 text-sm font-semibold text-white transition hover:bg-[#25578f]">
                        <UnlockKeyhole size={17} /> Approve &amp; Unlock
                      </button>
                    </div>
                  )}
                </div>
              </article>
            ) : (
              <div className="rounded-xl border border-dashed border-[#cbd5e1] bg-white py-12 text-center text-sm text-[#64748b]">
                No request matches the selected filters.
              </div>
            )}
          </div>
        </section>
      </div>

      {confirmation && (
        <div className="fixed inset-0 z-[10050] flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true" aria-labelledby="decision-title">
          <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-4">
              <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${confirmation === 'approve' ? 'bg-[#e8f1ff] text-[#2e66a6]' : 'bg-red-50 text-red-600'}`}>
                {confirmation === 'approve' ? <UnlockKeyhole size={23} /> : <ShieldAlert size={23} />}
              </span>
              <div>
                <h2 id="decision-title" className="text-lg font-semibold text-gray-900">
                  {confirmation === 'approve' ? 'Approve & Unlock Edit Request?' : 'Decline Edit Request?'}
                </h2>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  {confirmation === 'approve'
                    ? 'The employer will be able to edit this job post for one hour.'
                    : 'The employer’s edit request will be cancelled and the job post will remain locked.'}
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setConfirmation(null)} disabled={submitting} className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60">
                Cancel
              </button>
              <button type="button" onClick={submitDecision} disabled={submitting} className={`rounded-xl px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60 ${confirmation === 'approve' ? 'bg-[#2e66a6] hover:bg-[#25578f]' : 'bg-red-600 hover:bg-red-700'}`}>
                {submitting ? 'Processing...' : confirmation === 'approve' ? 'Approve & Unlock' : 'Decline Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="fixed inset-0 z-[10060] flex items-center justify-center bg-black/25 px-4" role="status" aria-live="polite">
          <div className="w-full max-w-sm rounded-2xl border border-gray-100 bg-white px-8 py-8 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#e8f1ff]">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2e66a6] text-white">
                <Check size={25} strokeWidth={3} />
              </span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900">{success.title}</h2>
            <p className="mt-2 text-sm text-gray-600">{success.message}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminEmployerJobEditRequestReview;
