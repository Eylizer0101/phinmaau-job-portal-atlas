import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BriefcaseBusiness, CalendarClock, ChevronRight, Clock3, ExternalLink, FileEdit, MapPin, RefreshCw, Search, UnlockKeyhole, Users, WalletCards, X } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';

const API_ORIGIN = 'https://phinmaau-job-portal-atlas.onrender.com';
const assetUrl = (value, fallback = '/images/jobback.png') => {
  const source = String(value || '').trim();
  if (!source) return fallback;
  if (/^(https?:|data:|blob:)/i.test(source)) return source;
  return `${API_ORIGIN}${source.startsWith('/') ? '' : '/'}${source}`;
};
const formatDateTime = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Not specified';
};
const formatDate = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) : 'Not specified';
};
const salary = (job) => {
  if (job?.hideSalary) return 'Salary not disclosed';
  const format = (value) => `₱${Number(value).toLocaleString('en-PH')}`;
  if (Number.isFinite(job?.salaryMin) && Number.isFinite(job?.salaryMax)) return `${format(job.salaryMin)} – ${format(job.salaryMax)}`;
  return Number.isFinite(job?.salaryMin) ? `From ${format(job.salaryMin)}` : Number.isFinite(job?.salaryMax) ? `Up to ${format(job.salaryMax)}` : 'Not specified';
};

const AdminEmployerJobEditRequestDetails = () => {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [approving, setApproving] = useState(false);
  const [notice, setNotice] = useState('');
  const [modalSearch, setModalSearch] = useState('');
  const [modalStatus, setModalStatus] = useState('all');

  useEffect(() => {
    let active = true;
    api.get(`/job-edit-requests/admin/${requestId}`).then(({ data }) => { if (active) setRequest(data?.request || null); })
      .catch((requestError) => { if (active) setError(requestError.response?.data?.message || 'Unable to load edit request details.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [requestId]);

  useEffect(() => {
    if (!modalOpen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const close = (event) => { if (event.key === 'Escape') setModalOpen(false); };
    window.addEventListener('keydown', close);
    return () => { document.body.style.overflow = previous; window.removeEventListener('keydown', close); };
  }, [modalOpen]);

  const job = request?.job || {};
  const company = job.companyName || request?.employer?.employerProfile?.companyName || 'Employer';
  const sections = Array.isArray(request?.requestedSections) ? request.requestedSections : [];
  const matchesModal = useMemo(() => {
    const query = modalSearch.trim().toLowerCase();
    const statusMatches = modalStatus === 'all' || request?.status === modalStatus;
    return statusMatches && (!query || sections.some((item) => item.toLowerCase().includes(query)) || String(request?.reason || '').toLowerCase().includes(query));
  }, [modalSearch, modalStatus, request, sections]);

  const approve = async () => {
    if (!request?._id || request.status !== 'pending' || approving) return;
    try {
      setApproving(true); setNotice('');
      const { data } = await api.patch(`/job-edit-requests/admin/${request._id}/approve`);
      setRequest((current) => ({ ...current, ...data?.request }));
      setNotice('Edit access approved. The employer can edit this job for one hour.');
      setModalOpen(false);
    } catch (requestError) { setNotice(requestError.response?.data?.message || 'Unable to approve this request.'); }
    finally { setApproving(false); }
  };

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><RefreshCw className="animate-spin text-blue-700" /></div>;
  if (error || !request) return <div className="mx-auto mt-10 max-w-xl rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-700">{error || 'Edit request not found.'}</div>;

  const infoCards = [
    { label: 'Salary', value: salary(job), icon: WalletCards },
    { label: 'Experience', value: job.experienceLevel || 'Not specified', icon: Clock3 },
    { label: 'Educational Requirement', value: job.educationLevel || 'Not specified', icon: BriefcaseBusiness },
    { label: 'Website / Company URL', value: request?.employer?.employerProfile?.website || 'Not provided', icon: ExternalLink },
  ];

  return <div className="mx-auto max-w-[1500px] space-y-6 py-8">
    <button type="button" onClick={() => navigate('/admin/employer-job-edit-requests')} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 font-semibold text-slate-800 shadow-sm hover:bg-slate-50"><ArrowLeft size={18} /> Back to Edit Requests</button>
    {notice && <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800">{notice}</div>}
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <img src={assetUrl(job.locationImage)} alt="Job location" className="h-56 w-full object-cover" onError={(event) => { event.currentTarget.src = '/images/jobback.png'; }} />
      <div className="flex flex-col gap-6 p-7 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-5"><img src={assetUrl(job.companyLogo, '/images/default-company-logo.png')} alt={company} className="h-20 w-20 rounded-xl border border-slate-200 bg-white object-contain p-2" /><div><h1 className="text-4xl font-extrabold text-slate-950">{job.title || 'Untitled Job'}</h1><p className="mt-2 font-semibold text-slate-600">{company}</p><p className="mt-2 flex items-center gap-2 text-sm text-slate-500"><MapPin size={16} />{job.location || 'Location not specified'}</p><div className="mt-4 flex flex-wrap gap-2">{[job.jobType, job.workMode, job.vacancies ? `${job.vacancies} Vacancies` : '', job.willingToRelocate].filter(Boolean).map((item) => <span key={item} className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800">{item}</span>)}</div><p className="mt-4 text-xs text-slate-500">Posted {formatDate(job.publishedAt || job.createdAt)} and deadline is on {formatDate(job.applicationDeadline)}</p></div></div>
        <div className="w-full max-w-sm"><button type="button" onClick={() => setModalOpen(true)} className="flex w-full items-center justify-between rounded-2xl bg-[#1456ad] px-5 py-4 text-left text-white shadow-lg hover:bg-[#10478f]"><span className="flex items-center gap-3"><span className="rounded-full bg-white/15 p-3"><UnlockKeyhole size={22} /></span><span><strong className="block">Review Request</strong><small className="text-blue-100">See what’s been requested.</small></span></span><ChevronRight /></button><p className="mt-2 flex items-center justify-end gap-1 text-xs text-slate-500"><CalendarClock size={14} />Request On: {formatDateTime(request.createdAt)}</p></div>
      </div>
    </section>
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{infoCards.map(({ label, value, icon: Icon }) => <article key={label} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><span className="rounded-xl bg-slate-50 p-3 text-slate-500"><Icon size={20} /></span><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 break-words font-bold text-slate-950">{value}</p></div></article>)}</section>
    <section className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm"><h2 className="flex items-center gap-2 text-lg font-bold text-slate-950"><FileEdit size={19} /> Job Description</h2><p className="mt-5 whitespace-pre-wrap leading-8 text-slate-700">{String(job.description || 'No job description provided.').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()}</p></section>

    {modalOpen && <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label="Review edit request" onMouseDown={(event) => { if (event.target === event.currentTarget) setModalOpen(false); }}>
      <section className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <button type="button" onClick={() => setModalOpen(false)} className="absolute right-5 top-5 z-10 rounded-lg p-2 text-slate-600 hover:bg-slate-100" aria-label="Close"><X size={22} /></button>
        <div className="overflow-y-auto p-6 sm:p-8"><h2 className="flex items-center gap-2 text-2xl font-extrabold text-slate-950"><FileEdit className="text-blue-700" /> Edit Requests</h2><p className="mt-1 text-sm text-slate-500">Review requested changes to job posts.</p>
          <div className="mt-5 flex items-center gap-3"><img src={assetUrl(job.companyLogo, '/images/default-company-logo.png')} alt="" className="h-12 w-12 rounded-xl border object-contain p-1" /><div><p className="font-bold">{job.title}</p><p className="text-sm text-slate-500">{company}</p></div></div>
          <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_180px_180px]"><label className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} /><input value={modalSearch} onChange={(e) => setModalSearch(e.target.value)} placeholder="Search request, section..." className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-3 text-sm" /></label><select value={modalStatus} onChange={(e) => setModalStatus(e.target.value)} className="h-11 rounded-xl border border-slate-200 px-3 text-sm"><option value="all">All Status</option><option value="pending">Pending</option><option value="approved">Reviewed</option></select><select className="h-11 rounded-xl border border-slate-200 px-3 text-sm"><option>Newest first</option><option>Oldest first</option></select></div>
          {matchesModal ? <article className="mt-6 rounded-2xl border border-blue-300 p-5"><div className="flex items-center justify-between"><h3 className="font-extrabold">Edit Request</h3><span className={`rounded-full border px-3 py-1 text-xs font-bold uppercase ${request.status === 'pending' ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-emerald-300 bg-emerald-50 text-emerald-700'}`}>{request.status}</span></div><h4 className="mt-5 text-sm font-bold">Sections to Edit</h4><div className="mt-2 flex flex-wrap gap-2">{sections.map((item) => <span key={item} className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800">{item}</span>)}</div><div className="mt-5 rounded-xl bg-slate-50 p-4"><p className="text-sm font-bold">Reason</p><p className="mt-2 text-sm leading-6 text-slate-600">{request.reason || 'No reason provided.'}</p></div><div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><p className="flex items-center gap-2 text-xs text-slate-500"><Clock3 size={14} />Request On: {formatDateTime(request.createdAt)}</p>{request.status === 'pending' && <button type="button" onClick={approve} disabled={approving} className="min-w-[170px] rounded-xl bg-[#1456ad] px-5 py-3 text-sm font-bold text-white hover:bg-[#10478f] disabled:opacity-60">{approving ? 'Approving...' : 'Approve & Unlock'}</button>}</div></article> : <div className="mt-6 rounded-xl border border-dashed border-slate-300 py-12 text-center text-sm text-slate-500">No request matches the selected filters.</div>}
        </div>
      </section>
    </div>}
  </div>;
};

export default AdminEmployerJobEditRequestDetails;
