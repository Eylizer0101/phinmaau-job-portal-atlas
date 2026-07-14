// src/pages/employer/dashboard/ApplicationDetails.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import EmployerLayout from '../../../layouts/EmployerLayout';
import { normalizeUserToResumeData, openResumePrintWindow } from '../../../components/shared/resumePrintTemplate';

const API_HOST = process.env.REACT_APP_API_URL
  ? process.env.REACT_APP_API_URL.replace(/\/api\/?$/, '')
  : 'https://phinmaau-job-portal-atlas.onrender.com';

const UI = {
  page: 'mx-auto max-w-7xl px-1 py-8',
  card: 'rounded-[24px] border border-gray-200 bg-white ',
  softCard: 'rounded-2xl border border-gray-200 bg-[#f8fafc]',
  label: 'text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500',
  value: 'mt-1.5 text-[15px] font-medium text-slate-800 break-words',
  ring: 'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2',
};

const cn = (...classes) => classes.filter(Boolean).join(' ');

const FOR_INTERVIEW_DECLINE_REASONS = [
  'Interview performance did not meet expectations',
  'Skills assessment below required level',
  'Communication skills need improvement',
  'Schedule or availability conflict',
  'Position requirements not fully met',
  'Failed to attend scheduled interview',
];

const APPLICANTS_DECLINE_REASONS = [
  'Did not meet minimum qualifications',
  'Insufficient relevant experience',
  'Skills not aligned with job requirements',
  'Incomplete application information',
  'Unavailable for required work schedule',
  'Does not meet screening criteria',
];

const SvgIcon = ({ name, className = 'w-4 h-4' }) => {
  const common = { className, fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' };

  switch (name) {
    case 'back':
      return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>;
    case 'calendar':
      return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3M5 11h14M6 5h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2z" /></svg>;
    case 'briefcase':
      return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10 6V5a2 2 0 012-2h0a2 2 0 012 2v1m-9 0h10a2 2 0 012 2v10a2 2 0 01-2 2H7a2 2 0 01-2-2V8a2 2 0 012-2z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 12h14" /></svg>;
    case 'mail':
      return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6h16v12H4z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 7l8 6 8-6" /></svg>;
    case 'phone':
      return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 5.5C3 4.7 3.7 4 4.5 4H7l1.2 4-1.8 1.2a13 13 0 006.4 6.4L14 13.8l4 1.2v2.5c0 .8-.7 1.5-1.5 1.5A13.5 13.5 0 013 5.5z" /></svg>;
    case 'location':
      return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 21s7-5.1 7-11a7 7 0 10-14 0c0 5.9 7 11 7 11z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 10.5h.01" /></svg>;
    case 'user':
      return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM5 21a7 7 0 0114 0" /></svg>;
    case 'school':
      return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4L3 9l9 5 9-5-9-5z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 11v5c2 2 12 2 14 0v-5" /></svg>;
    case 'award':
      return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15a6 6 0 100-12 6 6 0 000 12z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 14l-1 7 4-2 4 2-1-7" /></svg>;
    case 'folder':
      return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 7a2 2 0 012-2h5l2 2h7a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>;
    case 'globe':
      return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 21a9 9 0 100-18 9 9 0 000 18z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 12h18M12 3c2.2 2.4 3.3 5.4 3.3 9S14.2 18.6 12 21c-2.2-2.4-3.3-5.4-3.3-9S9.8 5.4 12 3z" /></svg>;
    case 'check':
      return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>;
    case 'x':
      return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>;
    case 'download':
      return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 3v12m0 0l4-4m-4 4l-4-4M5 21h14" /></svg>;
    default:
      return <span className={className} />;
  }
};

const Spinner = ({ className = 'w-4 h-4' }) => (
  <svg className={`${className} animate-spin`} viewBox="0 0 24 24" aria-hidden="true">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
  </svg>
);

const Alert = ({ type = 'error', children, onClose }) => (
  <div className={cn('rounded-xl border px-4 py-3 text-sm font-medium', type === 'success' ? 'border-[#b9d0e8] bg-[#eef5fc] text-[#17436f]' : 'border-red-200 bg-red-50 text-red-900')}>
    <div className="flex items-start justify-between gap-3">
      <div>{children}</div>
      {onClose ? <button type="button" onClick={onClose} className="font-bold">×</button> : null}
    </div>
  </div>
);

const DeclineReasonModal = ({ open, applicantName, selectedReason, comment, reasons = APPLICANTS_DECLINE_REASONS, onReasonChange, onCommentChange, onClose, onConfirm, isSubmitting = false }) => {
  const closeButtonRef = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const t = setTimeout(() => closeButtonRef.current?.focus(), 0);
    const onKeyDown = (e) => e.key === 'Escape' && !isSubmitting && onClose?.();
    window.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, onClose, isSubmitting]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 py-6">
      <div className="absolute inset-0 bg-black/50" onClick={() => !isSubmitting && onClose?.()} aria-hidden="true" />
      <div role="dialog" aria-modal="true" className="relative w-full max-w-4xl overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-[0_24px_80px_rgba(0,0,0,.22)]">
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-5 sm:px-8">
          <div>
            <h2 className="text-2xl font-semibold text-slate-800">Do you want to decline this application?</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
              Please choose one of the following reasons or leave an additional comment so the applicant receives feedback.
              {applicantName ? ` Applicant: ${applicantName}.` : ''}
            </p>
          </div>
          <button ref={closeButtonRef} type="button" onClick={onClose} disabled={isSubmitting} className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200" aria-label="Close decline modal">
            <SvgIcon name="x" className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-6 sm:px-8">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {reasons.map((reason) => (
              <button
                key={reason}
                type="button"
                onClick={() => onReasonChange(reason)}
                disabled={isSubmitting}
                className={cn(
                  'min-h-[78px] rounded-2xl border px-4 py-4 text-center text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60',
                  selectedReason === reason ? 'border-[#9db9df] bg-[#f4f8fd] text-gray-900 shadow-sm' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                )}
              >
                {reason}
              </button>
            ))}
          </div>

          <textarea
            value={comment}
            onChange={(e) => onCommentChange(e.target.value)}
            disabled={isSubmitting}
            rows={5}
            placeholder="Leave a comment for the applicant..."
            className="mt-6 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-60"
          />

          {!selectedReason ? <div className="mt-3 text-sm font-medium text-red-600">Please select a decline reason before continuing.</div> : null}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-5 sm:px-8">
          <button type="button" onClick={onClose} disabled={isSubmitting} className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
          <button type="button" onClick={onConfirm} disabled={!selectedReason || isSubmitting} className="min-w-[170px] rounded-xl border border-red-600 bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:border-red-300 disabled:bg-red-300">
            {isSubmitting ? 'Declining...' : 'Decline Application'}
          </button>
        </div>
      </div>
    </div>
  );
};

const formatDate = (dateValue, withTime = false) => {
  if (!dateValue) return '—';
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return '—';
  const options = withTime
    ? { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { year: 'numeric', month: 'long', day: 'numeric' };
  return d.toLocaleDateString('en-PH', options);
};

const joinMonthYear = (month, year) =>
  [month, year].map((item) => String(item || '').trim()).filter(Boolean).join(' ');

const formatYearRange = (item = {}) => {
  if (item.date) return item.date;

  const start = joinMonthYear(item.startMonth, item.startYear) || item.startYear || item.startDate || '';
  const end = item.isPresent
    ? 'Present'
    : joinMonthYear(item.endMonth, item.endYear || item.yearGraduated) || item.endYear || item.endDate || item.yearGraduated || '';

  if (start && end) return `${start} - ${end}`;
  return start || end || '';
};

const parseList = (value) => {
  if (Array.isArray(value)) return value.map((x) => String(x || '').trim()).filter(Boolean);
  return String(value || '')
    .split(/\|\||[\n,•]+/g)
    .map((x) => x.trim())
    .filter(Boolean);
};

const display = (value, fallback = 'Not provided') => {
  const v = String(value || '').trim();
  return v || fallback;
};

const statusMeta = (statusRaw) => {
  const s = String(statusRaw || 'pending').toLowerCase();
  if (s === 'pending') return { label: 'Pending', cls: 'bg-amber-50 text-amber-800 border-amber-200' };
  if (s === 'for interview') return { label: 'For Interview', cls: 'bg-[#eef5fc] text-[#2e66a6] border-[#b9d0e8]' };
  if (s === 'hired') return { label: 'Hired', cls: 'bg-green-50 text-green-700 border-green-200' };
  if (s === 'declined') return { label: 'Declined', cls: 'bg-red-50 text-red-700 border-red-200' };
  if (s === 'vacancy full') return { label: 'Vacancy Full', cls: 'bg-orange-50 text-orange-700 border-orange-200' };
  return { label: s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Pending', cls: 'bg-gray-50 text-gray-700 border-gray-200' };
};

const InfoCard = ({ icon, label, value }) => (
  <div className="rounded-2xl border border-gray-200 bg-[#f8fafc] px-4 py-4 sm:px-5">
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef5fc] text-[#2e66a6]">
        <SvgIcon name={icon} className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] font-semibold uppercase tracking-[0.13em] text-slate-500">{label}</div>
        <div className="truncate text-sm font-medium text-slate-800" title={String(value)}>{value}</div>
      </div>
    </div>
  </div>
);

const DetailField = ({ label, value }) => (
  <div className="rounded-2xl border border-gray-200 bg-[#f8fafc] px-4 py-4 sm:px-5">
    <div className={UI.label}>{label}</div>
    <div className={UI.value}>{display(value, '—')}</div>
  </div>
);

const TagList = ({ items, emptyText = 'No data added yet' }) => {
  const list = parseList(items);
  if (!list.length) return <p className="text-sm font-medium text-gray-400">{emptyText}</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {list.map((item, index) => (
        <span key={`${item}-${index}`} className="rounded-md border border-[#d7e6f5] bg-[#eef5fc] px-3 py-1 text-xs font-semibold text-[#2e66a6]">
          {item}
        </span>
      ))}
    </div>
  );
};

const EmptyState = ({ text = 'No data added yet.' }) => (
  <div className="rounded-xl border border-dashed border-gray-200 bg-white px-5 py-8 text-center text-sm font-medium text-gray-400">{text}</div>
);

const TimelineItem = ({ icon, title, subtitle, date, children, color = 'blue' }) => (
  <div className="rounded-2xl border border-gray-200 bg-[#f8fafc] px-4 py-4 sm:px-5">
    <div className="flex items-start gap-4">
      <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', color === 'yellow' ? 'bg-yellow-50 text-yellow-600' : color === 'green' ? 'bg-green-50 text-green-600' : 'bg-[#eef5fc] text-[#2e66a6]')}>
        <SvgIcon name={icon} className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h4 className="text-sm font-semibold text-slate-800">{title}</h4>
            {subtitle ? <p className="mt-1 text-xs font-medium text-gray-500">{subtitle}</p> : null}
          </div>
          {date ? <span className="shrink-0 text-xs font-semibold text-gray-500">{date}</span> : null}
        </div>
        {children ? <div className="mt-3 text-sm leading-6 text-gray-600">{children}</div> : null}
      </div>
    </div>
  </div>
);

const MoreEntryList = ({ items = [], type = 'default', emptyText }) => {
  const list = Array.isArray(items) ? items : [];
  if (!list.length) return <EmptyState text={emptyText} />;

  return (
    <div className="space-y-3">
      {list.map((item, index) => {
        const title = item.title || item.organization || item.name || 'Untitled';
        const subtitle = type === 'references'
          ? [item.position, item.company].filter(Boolean).join(' · ')
          : item.issuer || item.organization || item.role || '';
        const date = item.date || formatYearRange(item);

        return (
          <TimelineItem key={item._id || `${title}-${index}`} icon={type === 'project' ? 'folder' : type === 'certification' ? 'check' : 'award'} title={title} subtitle={subtitle} date={date} color={type === 'certification' ? 'green' : 'yellow'}>
            {item.description ? <p>{item.description}</p> : null}
            {type === 'references' ? (
              <div className="space-y-1">
                {item.phone ? <p>{item.phone}</p> : null}
                {item.email ? <p className="break-all text-[#2e66a6]">{item.email}</p> : null}
              </div>
            ) : null}
          </TimelineItem>
        );
      })}
    </div>
  );
};


const sanitizeReadOnlyHtml = (value = '') => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (typeof window === 'undefined' || typeof window.DOMParser === 'undefined') return raw;
  const allowed = new Set(['B','STRONG','I','EM','U','P','DIV','BR','UL','OL','LI','H1','H2']);
  const parser = new window.DOMParser();
  const doc = parser.parseFromString(`<div>${raw}</div>`, 'text/html');
  const root = doc.body.firstElementChild;
  if (!root) return '';
  const clean = (node) => Array.from(node.childNodes).forEach((child) => {
    if (child.nodeType !== window.Node.ELEMENT_NODE) return;
    if (!allowed.has(child.tagName)) {
      child.replaceWith(...Array.from(child.childNodes));
      return;
    }
    Array.from(child.attributes).forEach((attr) => child.removeAttribute(attr.name));
    clean(child);
  });
  clean(root);
  return root.innerHTML;
};

const ReadOnlyRichText = ({ value, empty = 'No information added.' }) => {
  const html = sanitizeReadOnlyHtml(value);
  if (!html) return <p className="text-sm text-gray-400">{empty}</p>;
  return (
    <div
      className="text-sm leading-7 text-gray-700 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1 [&_h1]:text-xl [&_h1]:font-bold [&_h2]:text-lg [&_h2]:font-bold"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

const ReadOnlySection = ({ title, children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="border-b border-gray-200 last:border-b-0">
      <button type="button" onClick={() => setOpen((value) => !value)} className="flex w-full items-center justify-between gap-4 py-4 text-left">
        <span className="text-[17px] font-bold uppercase tracking-wide text-slate-900">{title}</span>
        <span className={`text-slate-500 transition ${open ? 'rotate-180' : ''}`}>⌄</span>
      </button>
      {open ? <div className="pb-5">{children}</div> : null}
    </section>
  );
};

const ApplicantMessageModal = ({ open, applicant, application, onClose }) => {
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [messageError, setMessageError] = useState('');

  if (!open) return null;

  const sendMessage = async (event) => {
    event.preventDefault();
    if (!content.trim() || sending) return;
    try {
      setSending(true);
      setMessageError('');
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('receiverId', applicant?._id || applicant?.id || '');
      formData.append('content', content.trim());
      formData.append('messageType', 'text');
      formData.append('applicationId', application?._id || '');
      formData.append('jobId', application?.job?._id || '');
      await axios.post(`${API_HOST}/api/messages/send`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setContent('');
      onClose?.();
    } catch (error) {
      setMessageError(error.response?.data?.message || 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center px-4 py-6">
      <button type="button" className="absolute inset-0 bg-black/45" onClick={onClose} aria-label="Close message popup" />
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Message applicant</h3>
            <p className="text-sm text-gray-500">{applicant?.fullName || applicant?.email || 'Applicant'}</p>
          </div>
          <button type="button" onClick={onClose} className="h-9 w-9 rounded-lg border border-gray-200 text-gray-500">×</button>
        </div>
        <form onSubmit={sendMessage} className="p-5">
          <textarea value={content} onChange={(event) => setContent(event.target.value)} rows={6} placeholder="Write your message..." className="w-full rounded-xl border border-gray-200 p-4 text-sm outline-none focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/20" />
          {messageError ? <p className="mt-2 text-sm text-red-600">{messageError}</p> : null}
          <div className="mt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="h-10 rounded-xl border border-gray-200 px-4 text-sm font-semibold">Cancel</button>
            <button type="submit" disabled={sending || !content.trim()} className="h-10 rounded-xl bg-[#2e66a6] px-5 text-sm font-semibold text-white disabled:opacity-60">{sending ? 'Sending...' : 'Send Message'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ApplicationDetails = () => {
  const navigate = useNavigate();
  const { applicationId } = useParams();

  const [avatarBroken, setAvatarBroken] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [application, setApplication] = useState(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState('resume');
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [isDeclineModalOpen, setIsDeclineModalOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [declineComment, setDeclineComment] = useState('');

  const tabs = useMemo(
    () => [
      { key: 'resume', label: 'Resume', icon: 'folder' },
      { key: 'messages', label: 'Messages', icon: 'mail' },
      { key: 'activity', label: 'Activity', icon: 'calendar' },
    ],
    []
  );

  const getAssetUrl = useCallback((url) => {
    if (!url) return '';
    if (String(url).startsWith('http')) return url;
    return `${API_HOST}${url}`;
  }, []);

  const setToast = useCallback((setter, msg) => {
    setter(msg);
    window.setTimeout(() => setter(''), 3000);
  }, []);

  const fetchApplicationDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_HOST}/api/applications/${applicationId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setApplication(response.data.application);
        setAvatarBroken(false);
      } else {
        setError('Application not found');
      }
    } catch (err) {
      console.error('Error fetching application details:', err);
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/employer/login');
      } else if (err.response?.status === 403) {
        setError('You are not authorized to view this application');
      } else if (err.response?.status === 404) {
        setError('Application not found');
      } else {
        setError('Failed to load application details');
      }
    } finally {
      setLoading(false);
    }
  }, [applicationId, navigate]);

  useEffect(() => {
    fetchApplicationDetails();
  }, [fetchApplicationDetails]);

  const resetDeclineModal = useCallback(() => {
    setIsDeclineModalOpen(false);
    setDeclineReason('');
    setDeclineComment('');
  }, []);

  const handleStatusUpdate = async (newStatus, extraPayload = {}) => {
    try {
      setStatusUpdating(true);
      setError('');
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `${API_HOST}/api/applications/${applicationId}/status`,
        { status: newStatus, ...extraPayload },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setApplication((prev) => ({
          ...prev,
          status: response.data.application?.status || newStatus,
          reviewedAt: response.data.application?.reviewedAt || new Date().toISOString(),
          declineReason: response.data.application?.declineReason || '',
          declineComment: response.data.application?.declineComment || '',
          declinedFrom: response.data.application?.declinedFrom || '',
          activityHistory: response.data.application?.activityHistory || prev?.activityHistory || [],
        }));
        setToast(setSuccess, response.data?.vacancy?.isFull ? 'Status updated: Hired. The job post is now Filled because the vacancy is already full.' : newStatus === 'for interview' ? 'Status updated: For Interview' : newStatus === 'hired' ? 'Status updated: Hired' : 'Application marked as Declined with feedback saved.');
      }
    } catch (err) {
      console.error('Error updating status:', err);
      setToast(setError, err.response?.data?.message || 'Failed to update application status');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleConfirmDecline = async () => {
    const reason = declineReason.trim();
    if (!reason) {
      setToast(setError, 'Please select a decline reason before declining the application.');
      return;
    }

    const declinedFrom = String(application?.status || '').toLowerCase() === 'for interview' ? 'forInterview' : 'applicants';
    resetDeclineModal();
    await handleStatusUpdate('declined', {
      declineReason: reason,
      declineComment: declineComment.trim(),
      declinedFrom,
    });
  };

  if (loading) {
    return (
      <EmployerLayout>
        <div className={UI.page}>
          <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
            <Spinner className="mx-auto h-10 w-10 text-[#2e66a6]" />
            <p className="mt-3 text-sm text-gray-600">Loading application details...</p>
          </div>
        </div>
      </EmployerLayout>
    );
  }

  if (error && !application) {
    return (
      <EmployerLayout>
        <div className={UI.page}>
          <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
            <h3 className="text-lg font-semibold text-slate-800">Error</h3>
            <p className="mt-2 text-sm text-gray-600">{error}</p>
            <Link to="/employer/applicants" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#2e66a6] px-5 py-3 shadow-sm hover:bg-[#25578e] text-sm font-semibold text-white">
              <SvgIcon name="back" /> Back to Applicants
            </Link>
          </div>
        </div>
      </EmployerLayout>
    );
  }

  const jobseeker = application?.jobseeker || {};
  const profile = jobseeker?.jobSeekerProfile || {};
  const status = statusMeta(application?.status);
  const currentStatus = String(application?.status || 'pending').toLowerCase();
  const declineReasons = currentStatus === 'for interview' ? FOR_INTERVIEW_DECLINE_REASONS : APPLICANTS_DECLINE_REASONS;
  const applicantName = display(jobseeker.fullName || [jobseeker.firstName, jobseeker.middleName, jobseeker.lastName, jobseeker.extensionName].filter(Boolean).join(' '), 'Applicant');
  const applicantEmail = display(jobseeker.email, 'No email');
  const initials = (applicantName.trim()[0] || 'A').toUpperCase();
  const profileImage = jobseeker.profileImage ? getAssetUrl(jobseeker.profileImage) : '';
  const classOfText = profile.yearGraduated ? `CLASS OF ${profile.yearGraduated}` : 'YEAR NOT SET';
  const address = display(profile.address, 'Address not provided');
  const resumeUrlRaw = application?.appliedResume?.url || profile?.verificationDocs?.cv?.url || profile?.resumeUrl || '';
  const resumeFileName = application?.appliedResume?.filename || profile?.verificationDocs?.cv?.filename || 'Resume';
  const resumeUrl = resumeUrlRaw ? getAssetUrl(resumeUrlRaw) : '';

  const educationEntries = Array.isArray(profile.educationEntries) && profile.educationEntries.length
    ? profile.educationEntries
    : [{ level: profile.educationalAttainment || 'Education', school: profile.campus, campus: profile.campus, endYear: profile.yearGraduated }].filter((item) => item.school || item.campus || item.endYear);

  const downloadResume = async () => {
    const resumeData = normalizeUserToResumeData({
      userData: jobseeker,
      profile,
      workExperiences: profile.workExperiences || [],
    });

    const downloaded = await openResumePrintWindow(resumeData);

    if (!downloaded) {
      setToast(setError, 'Failed to download applicant CV. Please check your internet connection and try again.');
    }
  };

  const activityItems = (() => {
    const history = Array.isArray(application?.activityHistory) ? application.activityHistory : [];
    if (history.length) {
      return [...history].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    const fallback = [];
    if (application?.appliedAt) fallback.push({ title: 'Application received', description: `${applicantName} submitted an application.`, createdAt: application.appliedAt });
    if (application?.viewedAt || application?.reviewedAt) fallback.push({ title: 'Application reviewed', description: 'The employer opened and reviewed the application.', createdAt: application.viewedAt || application.reviewedAt });
    if (currentStatus !== 'pending') fallback.push({ title: `Status: ${status.label}`, description: `The application is currently marked as ${status.label}.`, createdAt: application?.updatedAt || application?.reviewedAt });
    return fallback.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  })();

  const profileSections = {
    workExperiences: Array.isArray(profile.workExperiences) ? profile.workExperiences : [],
    certifications: Array.isArray(profile.certifications) ? profile.certifications : [],
    projects: Array.isArray(profile.projects) ? profile.projects : [],
    seminars: Array.isArray(profile.seminars) ? profile.seminars : [],
    awards: Array.isArray(profile.awards) ? profile.awards : [],
    affiliations: Array.isArray(profile.affiliations) ? profile.affiliations : [],
    cocurricular: Array.isArray(profile.cocurricular) ? profile.cocurricular : [],
    references: Array.isArray(profile.references) ? profile.references : [],
  };

  const renderSimpleEntries = (items, emptyText) => (
    items.length ? (
      <div className="space-y-4">
        {items.map((item, index) => (
          <div key={item._id || index} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="font-semibold text-slate-900">{display(item.title || item.organization || item.name || item.positionTitle || item.level, 'Untitled')}</div>
                <div className="text-sm italic text-gray-500">{[item.role, item.issuer, item.company, item.companyName, item.school, item.campus].filter(Boolean).join(' • ')}</div>
              </div>
              <div className="text-xs font-semibold text-gray-500">{display(item.date || formatYearRange(item), '')}</div>
            </div>
            {item.description ? <div className="mt-3"><ReadOnlyRichText value={item.description} /></div> : null}
            {item.phone ? <div className="mt-2 text-sm text-gray-600">{item.phone}</div> : null}
            {item.email ? <div className="text-sm text-[#2e66a6]">{item.email}</div> : null}
          </div>
        ))}
      </div>
    ) : <EmptyState text={emptyText} />
  );

  return (
    <EmployerLayout>
      <div className={UI.page}>
        <div className="overflow-hidden rounded-[24px] border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-5 py-5 sm:px-7">
            <Link to="/employer/applicants" className="inline-flex items-center gap-2 text-sm font-semibold text-[#2e66a6]"><SvgIcon name="back" /> Back to Applicants</Link>
            <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border border-gray-200 bg-[#eef5fc]">
                  {profileImage && !avatarBroken ? <img src={profileImage} alt={applicantName} className="h-full w-full object-cover" onError={() => setAvatarBroken(true)} /> : <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-[#2e66a6]">{initials}</div>}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="truncate text-2xl font-bold text-slate-900">{applicantName}</h1>
                    <span className={cn('rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase', status.cls)}>{status.label}</span>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">Applied for <span className="font-semibold text-slate-800">{display(application?.job?.title, 'Job Position')}</span></p>
                  <p className="mt-1 text-xs text-gray-400">Applied {formatDate(application?.appliedAt, true)}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                {currentStatus === 'pending' ? <button type="button" onClick={() => handleStatusUpdate('for interview')} disabled={statusUpdating} className="h-11 rounded-xl bg-[#2e66a6] px-4 text-sm font-semibold text-white">Move to Interview</button> : null}
                {currentStatus === 'for interview' ? <button type="button" onClick={() => handleStatusUpdate('hired')} disabled={statusUpdating} className="h-11 rounded-xl bg-[#2e66a6] px-4 text-sm font-semibold text-white">Hired</button> : null}
                {['pending','for interview'].includes(currentStatus) ? <button type="button" onClick={() => setIsDeclineModalOpen(true)} disabled={statusUpdating} className="h-11 rounded-xl border border-red-200 bg-white px-4 text-sm font-semibold text-red-600">Decline Application</button> : null}
              </div>
            </div>
          </div>

          {error ? <div className="px-5 pt-4"><Alert type="error" onClose={() => setError('')}>{error}</Alert></div> : null}
          {success ? <div className="px-5 pt-4"><Alert type="success" onClose={() => setSuccess('')}>{success}</Alert></div> : null}

          <div className="border-b border-gray-200 px-5 sm:px-7">
            <div className="flex gap-6 overflow-x-auto" role="tablist">
              {tabs.map((tab) => {
                const active = activeTab === tab.key;
                return <button key={tab.key} type="button" onClick={() => tab.key === 'messages' ? setIsMessageModalOpen(true) : setActiveTab(tab.key)} className={cn('relative h-14 shrink-0 px-1 text-sm font-semibold', active ? 'text-[#2e66a6]' : 'text-gray-500')}><SvgIcon name={tab.icon} className="mr-2 inline h-4 w-4" />{tab.label}<span className={cn('absolute bottom-0 left-0 right-0 h-[3px]', active ? 'bg-[#2e66a6]' : 'bg-transparent')} /></button>;
              })}
            </div>
          </div>

          <div className="p-5 sm:p-7">
            {activeTab === 'resume' ? (
              <div className="mx-auto max-w-5xl">
                <ReadOnlySection title="Basic Information" defaultOpen>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <DetailField label="Full Name" value={applicantName} />
                    <DetailField label="Email" value={jobseeker.email} />
                    <DetailField label="Phone" value={profile.phoneNumber} />
                    <DetailField label="Address" value={profile.address} />
                    <DetailField label="Course" value={profile.course} />
                    <DetailField label="Campus" value={profile.campus} />
                    <DetailField label="Class Of" value={profile.yearGraduated} />
                    <DetailField label="Birthday" value={profile.birthday ? formatDate(profile.birthday) : ''} />
                    <DetailField label="Nationality" value={profile.nationality} />
                  </div>
                </ReadOnlySection>
                <ReadOnlySection title="Objective"><ReadOnlyRichText value={profile.aboutMe} empty="No objective added." /></ReadOnlySection>
                <ReadOnlySection title="Availability & Preferences">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <DetailField label="Preferred Work Mode" value={profile.preferredWorkMode} />
                    <DetailField label="Employment Type" value={profile.employmentType} />
                    <DetailField label="Willing to Relocate" value={profile.willingToRelocate} />
                    <DetailField label="How Soon Can Start" value={profile.howSoonCanYouStart} />
                    <DetailField label="Experience" value={profile.experience || profile.whatHaveYouDone} />
                    <DetailField label="Preferred Language" value={profile.preferredLanguage} />
                    <DetailField label="Educational Attainment" value={profile.educationalAttainment} />
                    <DetailField label="Double Degree" value={profile.studyField} />
                    <DetailField label="Civil Status" value={profile.civilStatus} />
                  </div>
                </ReadOnlySection>
                <ReadOnlySection title="Work Experience">{renderSimpleEntries(profileSections.workExperiences, 'No work experience added.')}</ReadOnlySection>
                <ReadOnlySection title="Skills"><TagList items={[...parseList(profile.technicalSkills), ...parseList(profile.softSkills)]} emptyText="No skills added." /></ReadOnlySection>
                <ReadOnlySection title="Education">{renderSimpleEntries(educationEntries, 'No education added.')}</ReadOnlySection>
                <ReadOnlySection title="Credentials">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {Object.entries(profile.verificationDocs || {}).map(([key, document]) => document?.url ? <a key={key} href={getAssetUrl(document.url)} target="_blank" rel="noreferrer" className="rounded-xl border border-gray-200 p-4 text-sm font-semibold capitalize text-[#2e66a6]">{key} — View document</a> : null)}
                  </div>
                </ReadOnlySection>
                <ReadOnlySection title="Certifications">{renderSimpleEntries(profileSections.certifications, 'No certifications added.')}</ReadOnlySection>
                <ReadOnlySection title="Projects">{renderSimpleEntries(profileSections.projects, 'No projects added.')}</ReadOnlySection>
                <ReadOnlySection title="Seminars and Trainings">{renderSimpleEntries(profileSections.seminars, 'No seminars and trainings added.')}</ReadOnlySection>
                <ReadOnlySection title="Awards and Achievements">{renderSimpleEntries(profileSections.awards, 'No awards and achievements added.')}</ReadOnlySection>
                <ReadOnlySection title="Affiliations">{renderSimpleEntries(profileSections.affiliations, 'No affiliations added.')}</ReadOnlySection>
                <ReadOnlySection title="Co-Curricular Activities">{renderSimpleEntries(profileSections.cocurricular, 'No co-curricular activities added.')}</ReadOnlySection>
                <ReadOnlySection title="References">{renderSimpleEntries(profileSections.references, 'No references added.')}</ReadOnlySection>
              </div>
            ) : null}

            {activeTab === 'activity' ? (
              <div className="mx-auto max-w-3xl">
                <h2 className="text-xl font-bold text-slate-900">Application Activity</h2>
                <div className="relative mt-6 space-y-6 before:absolute before:left-[11px] before:top-2 before:h-[calc(100%-16px)] before:w-px before:bg-gray-200">
                  {activityItems.length ? activityItems.map((item, index) => (
                    <div key={`${item.createdAt}-${index}`} className="relative pl-10">
                      <span className="absolute left-0 top-1.5 h-6 w-6 rounded-full border-4 border-white bg-[#2e66a6] shadow-sm" />
                      <div className="rounded-xl border border-gray-200 bg-white p-4">
                        <h3 className="font-bold text-slate-900">{item.title}</h3>
                        <p className="mt-1 text-sm text-gray-600">{item.description}</p>
                        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-gray-400">{formatDate(item.createdAt, true)}</p>
                      </div>
                    </div>
                  )) : <EmptyState text="No application activity available yet." />}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <ApplicantMessageModal open={isMessageModalOpen} applicant={jobseeker} application={application} onClose={() => setIsMessageModalOpen(false)} />

        <DeclineReasonModal
          open={isDeclineModalOpen}
          applicantName={applicantName}
          reasons={declineReasons}
          selectedReason={declineReason}
          comment={declineComment}
          onReasonChange={setDeclineReason}
          onCommentChange={setDeclineComment}
          onClose={resetDeclineModal}
          onConfirm={handleConfirmDecline}
          isSubmitting={statusUpdating}
        />
      </div>
    </EmployerLayout>
  );
};

export default ApplicationDetails;
