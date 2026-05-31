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

const formatYearRange = (item = {}) => {
  const start = item.startYear || item.startDate || '';
  const end = item.endYear || item.endDate || item.yearGraduated || '';
  if (start && end) return `${start} - ${end}`;
  return start || end || item.date || '';
};

const parseList = (value) => {
  if (Array.isArray(value)) return value.map((x) => String(x || '').trim()).filter(Boolean);
  return String(value || '')
    .split(/[\n,•]+/g)
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

const ApplicationDetails = () => {
  const navigate = useNavigate();
  const { applicationId } = useParams();

  const [avatarBroken, setAvatarBroken] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [application, setApplication] = useState(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');
  const [isDeclineModalOpen, setIsDeclineModalOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [declineComment, setDeclineComment] = useState('');

  const tabs = useMemo(
    () => [
      { key: 'personal', label: 'Personal Information', icon: 'user' },
      { key: 'overview', label: 'Overview', icon: 'globe' },
      { key: 'experience', label: 'Experience', icon: 'briefcase' },
      { key: 'achievements', label: 'Achievements', icon: 'award' },
      { key: 'preferences', label: 'Preferences', icon: 'check' },
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
          status: newStatus,
          reviewedAt: response.data.application?.reviewedAt || new Date().toISOString(),
          declineReason: response.data.application?.declineReason || '',
          declineComment: response.data.application?.declineComment || '',
          declinedFrom: response.data.application?.declinedFrom || '',
        }));
        setToast(setSuccess, newStatus === 'for interview' ? 'Status updated: For Interview' : newStatus === 'hired' ? 'Status updated: Hired' : 'Application marked as Declined with feedback saved.');
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
    : [{ level: profile.educationalAttainment || 'Education', campus: profile.campus, course: profile.course, studyField: profile.studyField, endYear: profile.yearGraduated }].filter((item) => item.campus || item.course || item.studyField || item.endYear);

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

  return (
    <EmployerLayout>
      <div className={UI.page}>
        <div className="overflow-hidden border border-gray-200 bg-white sm:rounded-[24px]">
          <div className="border-b border-gray-200 bg-white px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <Link to="/employer/applicants" className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 hover:text-[#2e66a6]">
                  <SvgIcon name="back" className="h-3.5 w-3.5" /> Applying for
                </Link>
                <h1 className="mt-4 text-[24px] font-semibold leading-tight tracking-[-0.01em] text-slate-900 sm:mt-5 sm:text-[32px]">{display(application?.job?.title, 'Job Position')}</h1>
                <div className="mt-3 flex flex-col items-start gap-1.5 text-sm font-medium text-gray-600">
                  <span className="inline-flex items-center gap-1.5"><SvgIcon name="briefcase" className="h-3.5 w-3.5" />{display(application?.job?.companyName, 'Company')}</span>
                  <span className="inline-flex items-center gap-1.5"><SvgIcon name="location" className="h-3.5 w-3.5" />{display(application?.job?.location, 'Location not specified')}</span>
                  {application?.job?._id ? (
                    <Link
                      to={`/employer/manage-jobs/${application.job._id}/view`}
                      state={{
                        from: 'applicationDetails',
                        backPath: `/employer/application/${applicationId}`,
                        backLabel: 'Application Details',
                      }}
                      className="inline-flex items-center gap-1.5 text-[#2e66a6] hover:underline"
                    >
                      <SvgIcon name="folder" className="h-3.5 w-3.5" />
                      View Job Description
                    </Link>
                  ) : null}
                </div>
              </div>

              <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center lg:justify-end">
                <div className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-[#f8fafc] px-3 py-2 text-sm font-semibold text-gray-700 sm:justify-start">
                  <SvgIcon name="calendar" className="h-3.5 w-3.5" /> Applied {formatDate(application?.appliedAt)}
                </div>
                {currentStatus === 'pending' ? (
                  <button type="button" onClick={() => handleStatusUpdate('for interview')} disabled={statusUpdating} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#2e66a6] px-4 text-sm font-semibold text-white shadow-none hover:bg-[#25578e] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60">
                    {statusUpdating ? <Spinner /> : <SvgIcon name="calendar" />} Move to Interview
                  </button>
                ) : null}

                {currentStatus === 'for interview' ? (
                  <button type="button" onClick={() => handleStatusUpdate('hired')} disabled={statusUpdating} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#2e66a6] px-4 text-sm font-semibold text-white shadow-none hover:bg-[#25578e] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60">
                    {statusUpdating ? <Spinner /> : <SvgIcon name="check" />} Hired
                  </button>
                ) : null}

                {['pending', 'for interview'].includes(currentStatus) ? (
                  <button type="button" onClick={() => setIsDeclineModalOpen(true)} disabled={statusUpdating} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white shadow-none hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60">
                    <SvgIcon name="x" /> Declined
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="bg-[#f8fafc] px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
            {error ? <div className="mb-4"><Alert type="error" onClose={() => setError('')}>{error}</Alert></div> : null}
            {success ? <div className="mb-4"><Alert type="success" onClose={() => setSuccess('')}>{success}</Alert></div> : null}

            <div className="flex flex-col gap-5 rounded-[20px] border border-gray-200 bg-white p-4 shadow-none sm:p-5 md:flex-row md:items-center md:justify-between">
              <div className="flex min-w-0 flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
                <div className="h-[88px] w-[88px] shrink-0 overflow-hidden rounded-2xl border border-gray-200 bg-[#eef5fc] shadow-none sm:h-[96px] sm:w-[96px]">
                  {profileImage && !avatarBroken ? (
                    <img src={profileImage} alt={applicantName} className="h-full w-full object-cover" onError={() => setAvatarBroken(true)} />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-3xl font-semibold text-[#2e66a6]">{initials}</div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start sm:gap-3">
                    <h2 className="max-w-full break-words text-[20px] font-semibold leading-tight tracking-[-0.01em] text-slate-900 sm:text-[25px]" title={applicantName}>{applicantName}</h2>
                    <span className="rounded-md bg-[#eef5fc] px-2.5 py-1 text-[10px] font-semibold uppercase text-[#2e66a6]">{classOfText}</span>
                    <span className={cn('rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase', status.cls)}>{status.label}</span>
                  </div>
                  <div className="mt-3 flex flex-col items-center gap-1.5 text-xs font-medium text-gray-600 sm:items-start sm:text-sm md:flex-row md:flex-wrap md:gap-x-5 md:gap-y-2">
                    <span className="inline-flex items-center gap-1.5"><SvgIcon name="school" className="h-3.5 w-3.5" />{display(profile.course, 'Course not provided')}</span>
                    <span className="inline-flex items-center gap-1.5"><SvgIcon name="mail" className="h-3.5 w-3.5" />{applicantEmail}</span>
                    <span className="inline-flex items-center gap-1.5"><SvgIcon name="phone" className="h-3.5 w-3.5" />{display(profile.phoneNumber, 'No phone')}</span>
                    <span className="inline-flex items-center gap-1.5"><SvgIcon name="location" className="h-3.5 w-3.5" />{address}</span>
                  </div>
                </div>
              </div>

              <button type="button" onClick={downloadResume} disabled={!resumeUrl} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-5 text-sm font-semibold text-slate-800 shadow-none hover:border-[#2e66a6] hover:bg-[#eef5fc] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto">
                <SvgIcon name="download" /> {resumeUrl ? 'Download CV' : 'No CV'}
              </button>
            </div>
          </div>

          <div className="border-t border-gray-200 bg-white px-4 sm:px-6 lg:px-8">
            <div className="-mx-4 flex gap-4 overflow-x-auto px-4 sm:mx-0 sm:gap-6 sm:px-0" role="tablist" aria-label="Applicant profile sections">
              {tabs.map((tab) => {
                const active = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setActiveTab(tab.key)}
                    className={cn('relative inline-flex h-14 shrink-0 items-center gap-2 px-1 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2 sm:text-sm', active ? 'text-[#2e66a6]' : 'text-gray-500 hover:text-gray-700')}
                  >
                    <SvgIcon name={tab.icon} className="h-3.5 w-3.5" />
                    {tab.label}
                    <span className={cn('absolute bottom-0 left-0 right-0 h-[3px] rounded-full', active ? 'bg-[#2e66a6]' : 'bg-transparent')} />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-gray-200 bg-white px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
            {activeTab === 'personal' ? (
              <section className="space-y-5">
                <h3 className="text-lg font-semibold tracking-[-0.005em] text-slate-900">Personal Information</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <DetailField label="Birthday" value={profile.birthday ? formatDate(profile.birthday) : ''} />
                  <DetailField label="Civil Status" value={profile.civilStatus} />
                  <DetailField label="Height" value={profile.height} />
                  <DetailField label="Weight" value={profile.weight} />
                  <DetailField label="Nationality" value={profile.nationality} />
                  <DetailField label="Gender" value={profile.gender} />
                </div>
              </section>
            ) : null}

            {activeTab === 'overview' ? (
              <section className="space-y-7">
                <div>
                  <h3 className="text-lg font-semibold tracking-[-0.005em] text-slate-900">About Me</h3>
                  <p className="mt-3 text-sm leading-7 text-gray-600">{display(profile.aboutMe, 'No about me added yet.')}</p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold tracking-[-0.005em] text-slate-900">Educational Background</h3>
                  <div className="mt-4 space-y-3">
                    {educationEntries.length ? educationEntries.map((edu, index) => (
                      <TimelineItem key={`${edu.level || edu.course}-${index}`} icon="school" title={display(edu.course || edu.level || edu.educationalAttainment, 'Education')} subtitle={display(edu.campus || edu.studyField, '')} date={formatYearRange(edu)}>
                        {edu.studyField && edu.course !== edu.studyField ? <p>{edu.studyField}</p> : null}
                      </TimelineItem>
                    )) : <EmptyState text="No educational background added yet." />}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold tracking-[-0.005em] text-slate-900">Skills</h3>
                  <div className="mt-4 space-y-4">
                    <div>
                      <div className={UI.label}>Technical Skills</div>
                      <div className="mt-2"><TagList items={profile.technicalSkills} emptyText="No technical skills added." /></div>
                    </div>
                    <div>
                      <div className={UI.label}>Soft Skills</div>
                      <div className="mt-2"><TagList items={profile.softSkills} emptyText="No soft skills added." /></div>
                    </div>
                  </div>
                </div>
              </section>
            ) : null}

            {activeTab === 'experience' ? (
              <section className="space-y-7">
                <div>
                  <h3 className="text-lg font-semibold tracking-[-0.005em] text-slate-900">Work Experience</h3>
                  <div className="mt-4 space-y-3">
                    {Array.isArray(profile.workExperiences) && profile.workExperiences.length ? profile.workExperiences.map((exp, index) => (
                      <TimelineItem key={exp._id || `${exp.companyName}-${index}`} icon="briefcase" title={display(exp.positionTitle, 'Work Experience')} subtitle={display(exp.companyName, '')} date={exp.isPresent ? `${formatDate(exp.startDate)} - Present` : `${formatDate(exp.startDate)} - ${formatDate(exp.endDate)}`}>
                        {exp.description ? <p>{exp.description}</p> : null}
                      </TimelineItem>
                    )) : <EmptyState text="No work experience added yet." />}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold tracking-[-0.005em] text-slate-900">Projects</h3>
                  <div className="mt-4"><MoreEntryList items={profile.projects} type="project" emptyText="No projects added yet." /></div>
                </div>
              </section>
            ) : null}

            {activeTab === 'achievements' ? (
              <section className="space-y-7">
                <div>
                  <h3 className="text-lg font-semibold tracking-[-0.005em] text-slate-900">Awards &amp; Achievements</h3>
                  <div className="mt-4"><MoreEntryList items={profile.awards} type="award" emptyText="No awards and achievements added yet." /></div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold tracking-[-0.005em] text-slate-900">Seminars &amp; Certifications</h3>
                  <div className="mt-4 space-y-3">
                    <MoreEntryList items={profile.certifications} type="certification" emptyText="No certifications added yet." />
                    <MoreEntryList items={profile.seminars} type="certification" emptyText="No seminars added yet." />
                  </div>
                </div>
              </section>
            ) : null}

            {activeTab === 'preferences' ? (
              <section className="space-y-5">
                <h3 className="text-lg font-semibold tracking-[-0.005em] text-slate-900">Availability &amp; Preferences</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <InfoCard icon="globe" label="Preferred Language" value={display(profile.preferredLanguage)} />
                  <InfoCard icon="briefcase" label="Experience" value={display(profile.whatHaveYouDone)} />
                  <InfoCard icon="folder" label="Preferred Work Mode" value={display(profile.preferredWorkMode)} />
                  <InfoCard icon="briefcase" label="Employment Type" value={display(profile.employmentType)} />
                  <InfoCard icon="school" label="Educational Attainment" value={display(profile.educationalAttainment)} />
                  <InfoCard icon="location" label="Willing to Relocate" value={display(profile.willingToRelocate)} />
                  <InfoCard icon="calendar" label="How Soon Can You Start" value={display(profile.howSoonCanYouStart)} />
                </div>
              </section>
            ) : null}
          </div>
        </div>

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
