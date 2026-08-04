import React, { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Check,
  Clock3,
  ListChecks,
  MessageSquareText,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import api from '../../services/api';

const formatRelativeTime = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return 'Just now';

  const diff = Math.max(0, Date.now() - date.getTime());
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return 'Just now';
  if (diff < hour) return `${Math.floor(diff / minute)} min ago`;
  if (diff < day) return `${Math.floor(diff / hour)} hour${Math.floor(diff / hour) === 1 ? '' : 's'} ago`;
  return `${Math.floor(diff / day)} day${Math.floor(diff / day) === 1 ? '' : 's'} ago`;
};

const getEmployerName = (request) => {
  const employer = request?.employer || {};
  return (
    employer?.employerProfile?.companyName ||
    employer?.fullName ||
    [employer?.firstName, employer?.lastName].filter(Boolean).join(' ') ||
    request?.job?.companyName ||
    'Employer'
  );
};

const AdminEmployerJobEditRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState('');
  const [message, setMessage] = useState('');

  const loadRequests = async () => {
    try {
      setLoading(true);
      const response = await api.get('/job-edit-requests/admin');
      setRequests(Array.isArray(response.data?.requests) ? response.data.requests : []);
    } catch (error) {
      console.error('Unable to load job edit requests:', error);
      setRequests([]);
      setMessage(error.response?.data?.message || 'Unable to load edit requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const pending = useMemo(
    () => requests.filter((request) => request.status === 'pending'),
    [requests]
  );

  const reviewed = useMemo(
    () => requests.filter((request) => request.status !== 'pending'),
    [requests]
  );

  const approveRequest = async (requestId) => {
    if (!requestId || approvingId) return;

    try {
      setApprovingId(requestId);
      setMessage('');
      const response = await api.patch(`/job-edit-requests/admin/${requestId}/approve`);
      const updated = response.data?.request;

      setRequests((items) =>
        items.map((item) => (item._id === requestId ? { ...item, ...updated } : item))
      );
      setMessage('Edit access approved. The employer can edit the job for one hour.');
    } catch (error) {
      console.error('Unable to approve request:', error);
      setMessage(error.response?.data?.message || 'Unable to approve this request.');
    } finally {
      setApprovingId('');
    }
  };

  const RequestCard = ({ request, reviewedCard = false }) => {
    const job = request?.job || {};
    const sections = Array.isArray(request?.requestedSections)
      ? request.requestedSections
      : [];

    return (
      <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#173f8a] text-white">
              <Building2 size={24} />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-bold text-slate-900">
                {job?.title || 'Untitled Job'}
              </h2>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                <span>{getEmployerName(request)}</span>
                {job?.category ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900">
                    <Building2 size={13} />
                    {job.category}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <span
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${
              request.status === 'approved'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : request.status === 'pending'
                  ? 'border-amber-300 bg-amber-50 text-amber-800'
                  : 'border-slate-200 bg-slate-50 text-slate-600'
            }`}
          >
            {request.status === 'approved' ? <Check size={14} /> : <Clock3 size={14} />}
            {reviewedCard ? 'Approved' : formatRelativeTime(request.createdAt)}
          </span>
        </div>

        <div className="grid gap-4 px-6 py-5 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
            <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
              <ListChecks size={16} />
              Sections to edit
            </div>
            <div className="flex flex-wrap gap-2">
              {sections.length ? (
                sections.map((section) => (
                  <span
                    key={section}
                    className="rounded-full bg-[#eaf2fb] px-3 py-1.5 text-xs font-semibold text-[#173f8a]"
                  >
                    {section}
                  </span>
                ))
              ) : (
                <span className="text-sm text-slate-500">No sections selected.</span>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
            <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
              <MessageSquareText size={16} />
              Reason
            </div>
            <p className="text-sm leading-6 text-slate-700">
              {request.reason || 'No reason provided (optional).'}
            </p>
          </div>
        </div>

        {!reviewedCard && request.status === 'pending' ? (
          <div className="flex justify-end border-t border-slate-200 px-6 py-4">
            <button
              type="button"
              onClick={() => approveRequest(request._id)}
              disabled={approvingId === request._id}
              className="inline-flex min-w-[190px] items-center justify-center gap-2 rounded-xl bg-[#173f8a] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#12336f] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {approvingId === request._id ? (
                <RefreshCw size={17} className="animate-spin" />
              ) : (
                <Check size={17} />
              )}
              Approve & unlock
            </button>
          </div>
        ) : null}
      </article>
    );
  };

  return (
    <div className="mx-auto max-w-7xl space-y-7 px-1 py-8">
      <button
        type="button"
        onClick={() => window.history.back()}
        className="text-sm font-semibold text-slate-700 transition hover:text-[#173f8a]"
      >
        ← Back to employer view
      </button>

      <section className="rounded-3xl bg-[#173f8a] px-7 py-7 text-white shadow-lg">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400 text-[#173f8a]">
              <ShieldCheck size={29} />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold">Edit Requests</h1>
              <p className="mt-1 text-sm text-blue-100">
                Review employer requests and grant temporary edit access to locked job postings.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="min-w-[105px] rounded-2xl bg-amber-400 px-5 py-3 text-center text-[#173f8a]">
              <p className="text-2xl font-extrabold">{pending.length}</p>
              <p className="text-xs font-bold uppercase">Pending</p>
            </div>
            <div className="min-w-[105px] rounded-2xl border border-white/25 px-5 py-3 text-center">
              <p className="text-2xl font-extrabold">{reviewed.length}</p>
              <p className="text-xs font-bold uppercase text-blue-100">Reviewed</p>
            </div>
          </div>
        </div>
      </section>

      {message ? (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-900">
          {message}
        </div>
      ) : null}

      <section className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
          Awaiting your decision
        </h2>

        {loading ? (
          <div className="flex justify-center rounded-2xl border border-slate-200 bg-white py-16">
            <RefreshCw className="animate-spin text-[#173f8a]" />
          </div>
        ) : pending.length ? (
          pending.map((request) => <RequestCard key={request._id} request={request} />)
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
            <ShieldCheck className="mx-auto text-slate-400" size={34} />
            <p className="mt-3 font-semibold text-slate-800">No pending edit requests.</p>
          </div>
        )}
      </section>

      {reviewed.length ? (
        <section className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
            Recent decisions
          </h2>
          {reviewed.slice(0, 10).map((request) => (
            <RequestCard key={request._id} request={request} reviewedCard />
          ))}
        </section>
      ) : null}
    </div>
  );
};

export default AdminEmployerJobEditRequests;
