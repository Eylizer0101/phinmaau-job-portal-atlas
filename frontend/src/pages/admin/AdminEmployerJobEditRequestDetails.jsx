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

const formatPostedRelative = (value) => {
  if (!value) return 'Posted recently';
  const posted = new Date(value);
  if (Number.isNaN(posted.getTime())) return 'Posted recently';

  const diff = Date.now() - posted.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;
  const year = 365 * day;

  if (diff < minute) return 'Posted just now';
  if (diff < hour) {
    const count = Math.floor(diff / minute);
    return `Posted ${count} minute${count === 1 ? '' : 's'} ago`;
  }
  if (diff < day) {
    const count = Math.floor(diff / hour);
    return `Posted ${count} hour${count === 1 ? '' : 's'} ago`;
  }
  if (diff < week) {
    const count = Math.floor(diff / day);
    return `Posted ${count} day${count === 1 ? '' : 's'} ago`;
  }
  if (diff < month) {
    const count = Math.floor(diff / week);
    return `Posted ${count} week${count === 1 ? '' : 's'} ago`;
  }
  if (diff < year) {
    const count = Math.floor(diff / month);
    return `Posted ${count} month${count === 1 ? '' : 's'} ago`;
  }

  const count = Math.floor(diff / year);
  return `Posted ${count} year${count === 1 ? '' : 's'} ago`;
};

const getRelocationDisplayLabel = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'yes - willing to relocate') return 'Willing to relocate';
  if (normalized === 'no - position is fixed location') return 'Fixed location';
  if (normalized === 'open to relocation if necessary') return 'Possible to relocate';
  return String(value || '').trim() || 'Relocation preference not specified';
};

const normalizeExternalUrl = (value = '') => {
  const cleanValue = String(value || '').trim();
  if (!cleanValue || cleanValue.toLowerCase() === 'n/a' || cleanValue.toLowerCase() === 'not provided') return '';
  return /^https?:\/\//i.test(cleanValue) ? cleanValue : `https://${cleanValue}`;
};

const sanitizeRichTextHtml = (value = '') => {
  const raw = String(value || '').trim();
  if (!raw) return '';

  if (typeof window === 'undefined' || typeof window.DOMParser === 'undefined') {
    return raw
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\r?\n/g, '<br>');
  }

  const containsHtml = /<\/?[a-z][\s\S]*>/i.test(raw);
  const source = containsHtml
    ? raw
    : raw
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\r?\n/g, '<br>');

  const parser = new window.DOMParser();
  const doc = parser.parseFromString(source, 'text/html');

  doc
    .querySelectorAll('script, style, iframe, object, embed, form, input, button, textarea, select, option, link, meta, base')
    .forEach((node) => node.remove());

  doc.body.querySelectorAll('*').forEach((element) => {
    [...element.attributes].forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const rawValue = String(attribute.value || '').trim();
      const valueText = rawValue.toLowerCase();

      if (
        name.startsWith('on') ||
        name === 'srcdoc' ||
        name === 'class' ||
        name === 'style' ||
        ((name === 'href' || name === 'src') &&
          (valueText.startsWith('javascript:') || valueText.startsWith('data:text/html')))
      ) {
        element.removeAttribute(attribute.name);
      }
    });

    if (element.tagName === 'A') {
      element.setAttribute('target', '_blank');
      element.setAttribute('rel', 'noopener noreferrer');
    }
  });

  return doc.body.innerHTML;
};

const RichTextContent = ({ value, fallback }) => {
  const sanitizedHtml = useMemo(() => sanitizeRichTextHtml(value || fallback || ''), [value, fallback]);

  return (
    <div
      className="break-words [&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1 [&_strong]:font-bold [&_b]:font-bold [&_em]:italic [&_i]:italic [&_u]:underline [&_a]:text-[#2e66a6] [&_a]:underline"
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
};

const UI = {
  card: 'w-full rounded-2xl border border-[#e5e7eb] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)]',
  sectionCard: 'w-full rounded-xl border border-[#e5e7eb] bg-white shadow-[0_4px_16px_rgba(15,23,42,0.04)]',
  metricCard: 'h-full min-h-[96px] rounded-xl border border-[#d9e2ec] bg-white px-4 py-4 shadow-[0_4px_14px_rgba(15,23,42,0.08)]',
  label: 'text-[11px] font-semibold uppercase tracking-[0.03em] text-[#6b7280]',
  value: 'mt-1.5 text-[15px] font-semibold leading-6 text-[#111827]',
  title: 'text-[15px] font-semibold text-[#111827]',
  muted: 'text-sm text-[#6b7280]',
  chip: 'inline-flex items-center gap-2 rounded-full border border-[#d7e6f5] bg-[#eef5fc] px-3 py-1 text-xs font-semibold text-[#2e66a6]',
  skillChip: 'rounded-xl border border-[#d7e6f5] bg-[#f8fafc] px-3 py-2 text-xs font-medium text-[#374151]',
};

const TopMetricCard = ({ label, value, icon: Icon, href = '' }) => (
  <article className={`${UI.metricCard} min-w-0`}>
    <div className="flex h-full min-w-0 items-start gap-3">
      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-[#d9dbe3] bg-[#f9fafb] text-[#6b7280]">
        <Icon size={18} />
      </span>
      <div className="min-w-0">
        <p className={UI.label}>{label}</p>
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className="mt-1.5 block break-all text-[15px] font-semibold leading-6 text-[#2e66a6] hover:underline">
            {value}
          </a>
        ) : (
          <p className={UI.value}>{value}</p>
        )}
      </div>
    </div>
  </article>
);

const SectionHeader = ({ icon: Icon, title }) => (
  <div className="flex items-center gap-2">
    <span className="text-[#374151]"><Icon size={16} /></span>
    <h2 className={UI.title}>{title}</h2>
  </div>
);

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
  const [modalTime, setModalTime] = useState('all');
  const [modalSort, setModalSort] = useState('newest');

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
    const created = request?.createdAt ? new Date(request.createdAt) : null;
    const now = new Date();
    let from = null;
    if (modalTime === 'today') from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (modalTime === 'week') {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const offset = today.getDay() === 0 ? 6 : today.getDay() - 1;
      from = new Date(today.getFullYear(), today.getMonth(), today.getDate() - offset);
    }
    if (modalTime === 'month') from = new Date(now.getFullYear(), now.getMonth(), 1);
    const timeMatches = !from || (created && !Number.isNaN(created.getTime()) && created >= from);
    return statusMatches && timeMatches && (!query || sections.some((item) => item.toLowerCase().includes(query)) || String(request?.reason || '').toLowerCase().includes(query));
  }, [modalSearch, modalStatus, modalTime, request, sections]);

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

  const website = request?.employer?.employerProfile?.website || '';
  const requiredSkills = Array.isArray(job.skillsRequired) ? job.skillsRequired.filter(Boolean) : [];
  const perks = Array.isArray(job.perksAndBenefits) ? job.perksAndBenefits.filter(Boolean) : [];
  const otherBenefit = String(job.otherBenefits || '').trim();
  const perksAndBenefits = otherBenefit ? [...perks, otherBenefit] : perks;
  const vacancyText = job.vacancies ? `${job.vacancies} ${Number(job.vacancies) === 1 ? 'Vacancy' : 'Vacancies'}` : 'Number of vacancies not specified';

  const infoCards = [
    { label: 'Salary', value: salary(job), icon: WalletCards },
    { label: 'Experience', value: job.experienceLevel || 'No experience required', icon: Clock3 },
    { label: 'Educational Requirement', value: job.educationLevel || 'Educational requirement not specified', icon: BriefcaseBusiness },
    { label: 'Website / Company URL', value: website || 'N/A', icon: ExternalLink, href: normalizeExternalUrl(website) },
  ];

  return <div className="min-h-screen bg-[#f8fafc]">
    <div className="mx-auto max-w-7xl px-1 py-8">
      <div className="mb-5">
        <button type="button" onClick={() => navigate('/admin/employer-job-edit-requests')} className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#d7e6f5] bg-white px-4 py-2 text-sm font-semibold text-[#111827] hover:bg-[#eef5fc] hover:text-[#2e66a6]"><ArrowLeft size={17} /> Back to Edit Requests</button>
      </div>

      {notice && <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800">{notice}</div>}

      <section className={`${UI.card} mb-5 overflow-hidden`}>
        <div className="relative h-[85px] w-full overflow-hidden sm:h-[105px]">
          <img src="/images/jobback.png" alt="Job details banner" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-black/10" />
        </div>

        <div className="px-5 pb-5 pt-4 sm:px-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 flex-1 items-start gap-4">
              <img src={assetUrl(job.companyLogo, '/images/default-company-logo.png')} alt={company} className="h-14 w-14 flex-shrink-0 rounded-xl border border-[#d9dbe3] bg-white object-contain p-1 sm:h-16 sm:w-16" />

              <div className="min-w-0 flex-1">
                <h1 className="text-[28px] font-bold leading-tight text-[#111827] sm:text-[32px]" title={job.title || 'Untitled Job'}>{job.title || 'Untitled Job'}</h1>

                <div className="mt-2 flex items-center gap-2 text-[#6b7280]">
                  <MapPin size={16} />
                  <span className="text-sm">{job.location || 'Location not specified'}</span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className={UI.chip}><BriefcaseBusiness size={14} />{job.jobType || 'Employment type not specified'}</span>
                  <span className={UI.chip}>{job.workMode || 'Work mode not specified'}</span>
                  <span className={UI.chip}><Users size={14} />{vacancyText}</span>
                  <span className={UI.chip}>{getRelocationDisplayLabel(job.willingToRelocate)}</span>
                </div>

                <p className="mt-3 text-xs text-[#6b7280]">
                  {formatPostedRelative(job.publishedAt || job.createdAt)}{job.applicationDeadline ? ` and deadline of application is on ${formatDate(job.applicationDeadline)}` : ' and no application deadline specified'}
                </p>
              </div>
            </div>

            <div className="w-full max-w-sm lg:self-center"><button type="button" onClick={() => setModalOpen(true)} className="flex w-full items-center justify-between rounded-2xl bg-[#1456ad] px-5 py-4 text-left text-white shadow-lg hover:bg-[#10478f]"><span className="flex items-center gap-3"><span className="rounded-full bg-white/15 p-3"><UnlockKeyhole size={22} /></span><span><strong className="block">Review Request</strong><small className="text-blue-100">See what’s been requested.</small></span></span><ChevronRight /></button><p className="mt-2 flex items-center justify-end gap-1 text-xs text-slate-500"><CalendarClock size={14} />Request On: {formatDateTime(request.createdAt)}</p></div>
          </div>
        </div>
      </section>

      <div className="space-y-5">
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {infoCards.map(({ label, value, icon, href }) => <TopMetricCard key={label} label={label} value={value} icon={icon} href={href} />)}
        </section>

        <section className={`${UI.sectionCard} overflow-hidden`}>
          <div className="p-5 sm:p-6">
            <SectionHeader icon={FileEdit} title="Job Description" />
            <div className="mt-4 text-sm leading-7 text-[#4b5563] sm:text-[15px]">
              <RichTextContent value={job.description} fallback="No job description provided." />
            </div>
          </div>
        </section>

        <section className={`${UI.sectionCard} overflow-hidden`}>
          <div className="p-5 sm:p-6">
            <SectionHeader icon={BriefcaseBusiness} title="Qualification" />
            <div className="mt-4 text-sm leading-7 text-[#4b5563] sm:text-[15px]">
              <RichTextContent value={job.requirements} fallback="No qualifications specified." />
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className={`${UI.sectionCard} p-5 sm:p-6`}>
            <SectionHeader icon={BriefcaseBusiness} title="Required Skills" />
            {requiredSkills.length > 0 ? (
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {requiredSkills.map((skill, index) => <div key={`${skill}-${index}`} className={UI.skillChip}>{skill}</div>)}
              </div>
            ) : (
              <p className={`mt-4 ${UI.muted}`}>No skills specified</p>
            )}
          </div>

          <div className={`${UI.sectionCard} overflow-hidden`}>
            <div className="px-5 pt-5 sm:px-6 sm:pt-6">
              <SectionHeader icon={MapPin} title="Work Location" />
            </div>
            <div className="mt-4 overflow-hidden">
              {job.locationImage ? (
                <img src={assetUrl(job.locationImage)} alt="Work location" className="h-[180px] w-full object-cover" onError={(event) => { event.currentTarget.style.display = 'none'; }} />
              ) : (
                <div className="flex h-[180px] items-center justify-center bg-[#eef2f7] text-[#9ca3af]"><MapPin size={32} /></div>
              )}
            </div>
            <div className="border-t border-[#e5e7eb] px-4 py-3 sm:px-5">
              <p className="text-xs font-medium text-[#2e66a6]">{job.location || 'Work address not specified'}</p>
            </div>
          </div>
        </section>

        <section className={`${UI.sectionCard} overflow-hidden`}>
          <div className="border-b border-[#e5e7eb] px-5 py-4 sm:px-6">
            <h2 className={UI.title}>Perks and Benefits</h2>
          </div>
          <div className="p-5 sm:p-6">
            {perksAndBenefits.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {perksAndBenefits.map((benefit, index) => <div key={`${benefit}-${index}`} className={UI.skillChip}>{benefit}</div>)}
              </div>
            ) : (
              <p className={UI.muted}>No perks or benefits specified</p>
            )}
          </div>
        </section>
      </div>

      {modalOpen && <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label="Review edit request" onMouseDown={(event) => { if (event.target === event.currentTarget) setModalOpen(false); }}>
        <section className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
          <button type="button" onClick={() => setModalOpen(false)} className="absolute right-5 top-5 z-10 rounded-lg p-2 text-slate-600 hover:bg-slate-100" aria-label="Close"><X size={22} /></button>
          <div className="overflow-y-auto p-6 sm:p-8"><h2 className="flex items-center gap-2 text-2xl font-extrabold text-slate-950"><FileEdit className="text-blue-700" /> Edit Requests</h2><p className="mt-1 text-sm text-slate-500">Review requested changes to job posts.</p>
            <div className="mt-5 flex items-center gap-3"><img src={assetUrl(job.companyLogo, '/images/default-company-logo.png')} alt="" className="h-12 w-12 rounded-xl border object-contain p-1" /><div><p className="font-bold">{job.title}</p><p className="text-sm text-slate-500">{company}</p></div></div>
            <div className="mt-5 grid gap-3 md:grid-cols-[minmax(220px,1fr)_145px_145px_150px]"><label className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} /><input value={modalSearch} onChange={(e) => setModalSearch(e.target.value)} placeholder="Search request, section..." className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-3 text-sm" /></label><select value={modalStatus} onChange={(e) => setModalStatus(e.target.value)} className="h-11 rounded-xl border border-slate-200 px-3 text-sm"><option value="all">All Status</option><option value="pending">Pending</option><option value="approved">Reviewed</option></select><select value={modalTime} onChange={(e) => setModalTime(e.target.value)} className="h-11 rounded-xl border border-slate-200 px-3 text-sm"><option value="all">All Time</option><option value="today">Today</option><option value="week">This Week</option><option value="month">This Month</option></select><select value={modalSort} onChange={(e) => setModalSort(e.target.value)} className="h-11 rounded-xl border border-slate-200 px-3 text-sm"><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></div>
            {matchesModal ? <article className="mt-6 rounded-2xl border border-blue-300 p-5"><div className="flex items-center justify-between"><h3 className="font-extrabold">Edit Request</h3><span className={`rounded-full border px-3 py-1 text-xs font-bold uppercase ${request.status === 'pending' ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-emerald-300 bg-emerald-50 text-emerald-700'}`}>{request.status}</span></div><h4 className="mt-5 text-sm font-bold">Sections to Edit</h4><div className="mt-2 flex flex-wrap gap-2">{sections.map((item) => <span key={item} className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800">{item}</span>)}</div><div className="mt-5 rounded-xl bg-slate-50 p-4"><p className="text-sm font-bold">Reason</p><p className="mt-2 text-sm leading-6 text-slate-600">{request.reason || 'No reason provided.'}</p></div><div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><p className="flex items-center gap-2 text-xs text-slate-500"><Clock3 size={14} />Request On: {formatDateTime(request.createdAt)}</p>{request.status === 'pending' && <button type="button" onClick={approve} disabled={approving} className="min-w-[170px] rounded-xl bg-[#1456ad] px-5 py-3 text-sm font-bold text-white hover:bg-[#10478f] disabled:opacity-60">{approving ? 'Approving...' : 'Approve & Unlock'}</button>}</div></article> : <div className="mt-6 rounded-xl border border-dashed border-slate-300 py-12 text-center text-sm text-slate-500">No request matches the selected filters.</div>}
          </div>
        </section>
      </div>}
    </div>
  </div>;
};

export default AdminEmployerJobEditRequestDetails;
