// src/pages/employer/dashboard/ApplicationDetails.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import EmployerLayout from '../../../layouts/EmployerLayout';
import { normalizeUserToResumeData } from '../../../components/shared/resumePrintTemplate';

const API_HOST = process.env.REACT_APP_API_URL
  ? process.env.REACT_APP_API_URL.replace(/\/api\/?$/, '')
  : 'https://phinmaau-job-portal-atlas.onrender.com';

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

const PROFICIENCY_STYLES = {
  Basic: 'border-slate-200 bg-slate-100 text-slate-600',
  Novice: 'border-sky-200 bg-sky-50 text-sky-700',
  Intermediate: 'border-amber-200 bg-amber-50 text-amber-700',
  Advanced: 'border-violet-200 bg-violet-50 text-violet-700',
  Expert: 'border-emerald-200 bg-emerald-50 text-emerald-700',
};

const SvgIcon = ({ name, className = 'h-5 w-5' }) => {
  const common = { className, fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' };
  const paths = {
    back: 'M15 19l-7-7 7-7', calendar: 'M8 7V3m8 4V3M5 11h14M6 5h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2z',
    check: 'M5 13l4 4L19 7', x: 'M6 18L18 6M6 6l12 12', mail: 'M4 6h16v12H4z M4 7l8 6 8-6',
    message: 'M8 10h8m-8 4h5m7-2a8 8 0 01-8 8 8.7 8.7 0 01-3.7-.8L4 20l.8-4.3A8 8 0 1120 12z',
    resume: 'M7 3h7l4 4v14H7z M14 3v5h5 M10 13h5m-5 4h5', activity: 'M12 8v4l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z',
    send: 'M3 11l18-8-8 18-2-7-8-3z M11 14l4-4',
    eye: 'M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
    user: 'M16 7a4 4 0 11-8 0 4 4 0 018 0z M5 21a7 7 0 0114 0',
  };
  return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.9} d={paths[name] || paths.user} /></svg>;
};

const Spinner = () => <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-r-transparent" />;

const formatDate = (value, options = {}) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value || '');
  return date.toLocaleDateString('en-PH', options.year ? options : { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatRelativeTime = (value) => {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const diffMilliseconds = Date.now() - date.getTime();
  const isFuture = diffMilliseconds < 0;
  const absoluteMilliseconds = Math.abs(diffMilliseconds);

  const minutes = Math.floor(absoluteMilliseconds / (1000 * 60));
  const hours = Math.floor(absoluteMilliseconds / (1000 * 60 * 60));
  const days = Math.floor(absoluteMilliseconds / (1000 * 60 * 60 * 24));
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  let valueText = '';

  if (minutes < 1) valueText = 'just now';
  else if (minutes < 60) valueText = `${minutes} minute${minutes === 1 ? '' : 's'}`;
  else if (hours < 24) valueText = `${hours} hour${hours === 1 ? '' : 's'}`;
  else if (days < 30) valueText = `${days} day${days === 1 ? '' : 's'}`;
  else if (months < 12) valueText = `${months} month${months === 1 ? '' : 's'}`;
  else valueText = `${years} year${years === 1 ? '' : 's'}`;

  if (valueText === 'just now') return valueText;
  return isFuture ? `in ${valueText}` : `${valueText} ago`;
};

const formatDateTime = (value) => {
  if (!value) return { date: '', time: '' };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { date: '', time: '' };
  return {
    date: date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase(),
    time: date.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }),
  };
};

const monthYear = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value || '');
  return date.toLocaleDateString('en-PH', { month: 'short', year: 'numeric' });
};

const entryDate = (item = {}) => {
  if (item.date) return item.date;
  const start = [item.startMonth, item.startYear].filter(Boolean).join(' ') || monthYear(item.startDate);
  const end = item.isPresent ? 'Present' : ([item.endMonth, item.endYear || item.yearGraduated].filter(Boolean).join(' ') || monthYear(item.endDate));
  return [start, end].filter(Boolean).join(' – ');
};

const parseSkills = (value) => {
  const raw = Array.isArray(value) ? value : String(value || '').split(/\|\||,|\n/);
  return raw.map((item) => {
    if (item && typeof item === 'object') return { skill: item.skill || item.name || '', proficiency: item.proficiency || 'Basic' };
    const clean = String(item || '').trim();
    const match = clean.match(/^(.*?)\s+[—-]\s+(Basic|Novice|Intermediate|Advanced|Expert)$/i);
    return match ? { skill: match[1].trim(), proficiency: match[2][0].toUpperCase() + match[2].slice(1).toLowerCase() } : { skill: clean, proficiency: 'Basic' };
  }).filter((item) => item.skill);
};

const richText = (value) => {
  const text = String(value || '').trim();
  if (!text) return null;
  const lines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  return <div className="space-y-1">{lines.map((line, index) => <p key={`${line}-${index}`}>{line}</p>)}</div>;
};

const Section = ({ title, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section className="border-b border-[#d8e2ee] last:border-b-0">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        className="flex min-h-[54px] w-full items-center gap-3 py-3 text-left focus:outline-none"
      >
        <svg
          className={cn(
            'h-4 w-4 shrink-0 text-gray-500 transition-transform duration-200',
            isOpen ? 'rotate-0' : '-rotate-90'
          )}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 15l7-7 7 7"
          />
        </svg>

        <h3 className="font-serif text-[17px] font-bold uppercase tracking-[0.01em] text-[#111827] sm:text-[19px]">
          {title}
        </h3>
      </button>

      {isOpen ? children : null}
    </section>
  );
};

const EmptyLine = ({ children }) => <div className="pb-5 pt-1 font-serif text-[13px] italic text-gray-500">{children}</div>;

const ProfileEntries = ({ items = [], type }) => {
  if (!items.length) return <EmptyLine>No information added yet.</EmptyLine>;
  if (type === 'references') {
    return <div className="grid grid-cols-1 gap-x-6 gap-y-5 pb-5 pt-2 font-serif text-[13px] leading-5 text-gray-900 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item, index) => <div key={item._id || index} className="min-w-0 py-1">
        <div className="font-bold">{item.name || item.title || 'Reference'}</div>
        {item.position ? <div>{item.position}</div> : null}{item.company ? <div>{item.company}</div> : null}
        {item.phone ? <div>{item.phone}</div> : null}{item.email ? <div className="break-all text-[#2e66a6]">{item.email}</div> : null}
      </div>)}
    </div>;
  }
  return <div className="space-y-3 pb-5 pt-2 font-serif text-[13px] leading-5 text-gray-900">
    {items.map((item, index) => {
      const title = item.title || item.name || item.organization || 'Untitled';
      const sub = item.issuer || item.role || item.organization || item.company || '';
      return <div key={item._id || index} className="py-1">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0"><div className="font-bold">{title}</div>{sub ? <div className="italic">{sub}</div> : null}</div>
          {entryDate(item) ? <div className="shrink-0 whitespace-nowrap italic text-gray-700">{entryDate(item)}</div> : null}
        </div>
        {item.description ? <div className="mt-2">{richText(item.description)}</div> : null}
      </div>;
    })}
  </div>;
};

const DeclineReasonModal = ({ open, applicantName, reasons, selectedReason, comment, onReasonChange, onCommentChange, onClose, onConfirm, submitting }) => {
  if (!open) return null;
  return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4">
    <div className="w-full max-w-4xl rounded-[26px] bg-white shadow-2xl">
      <div className="flex items-start justify-between border-b p-6"><div><h2 className="text-2xl font-semibold">Decline application</h2><p className="mt-2 text-sm text-gray-500">Choose a reason for {applicantName}.</p></div><button onClick={onClose}><SvgIcon name="x" /></button></div>
      <div className="p-6"><div className="grid gap-3 md:grid-cols-3">{reasons.map((reason) => <button key={reason} onClick={() => onReasonChange(reason)} className={cn('rounded-2xl border p-4 text-sm', selectedReason === reason ? 'border-[#2e66a6] bg-[#eef5fc]' : 'border-gray-200')}>{reason}</button>)}</div><textarea value={comment} onChange={(e) => onCommentChange(e.target.value)} rows={4} className="mt-5 w-full rounded-xl border p-3" placeholder="Additional comment..." /></div>
      <div className="flex justify-end gap-3 border-t p-5"><button onClick={onClose} className="rounded-xl border px-5 py-2">Cancel</button><button disabled={!selectedReason || submitting} onClick={onConfirm} className="rounded-xl bg-red-600 px-5 py-2 font-semibold text-white disabled:opacity-50">{submitting ? 'Declining...' : 'Decline Application'}</button></div>
    </div>
  </div>;
};

const MessagePopup = ({ open, onClose, applicant, application }) => {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);
  const currentUser = useMemo(() => { try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; } }, []);
  const applicantId = applicant?._id;
  const employerId = currentUser?._id || application?.employer?._id || application?.employer;
  const conversationId = applicantId && employerId ? [String(applicantId), String(employerId)].sort().join('_') : '';
  const token = localStorage.getItem('token');

  const load = useCallback(async () => {
    if (!open || !conversationId) return;
    try { setLoading(true); setError(''); const res = await axios.get(`${API_HOST}/api/messages/conversation/${conversationId}`, { headers: { Authorization: `Bearer ${token}` } }); setMessages(res.data?.data || []); await axios.put(`${API_HOST}/api/messages/mark-read/${conversationId}`, {}, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {}); }
    catch (err) { setError(err.response?.data?.message || 'Failed to load messages.'); }
    finally { setLoading(false); }
  }, [open, conversationId, token]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  if (!open) return null;

  const send = async () => {
    const content = text.trim(); if (!content || sending) return;
    try { setSending(true); setError(''); const res = await axios.post(`${API_HOST}/api/messages/send`, { receiverId: applicantId, content, jobId: application?.job?._id, applicationId: application?._id }, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }); setText(''); if (res.data?.data) setMessages((prev) => [...prev, res.data.data]); else await load(); }
    catch (err) { setError(err.response?.data?.message || 'Failed to send message.'); }
    finally { setSending(false); }
  };

  return <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 p-4">
    <div className="flex h-[78vh] w-full max-w-2xl flex-col overflow-hidden rounded-[24px] bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b px-5 py-4"><div><h2 className="font-semibold text-gray-900">Messages</h2><p className="text-sm text-gray-500">{applicant?.fullName || [applicant?.firstName, applicant?.lastName].filter(Boolean).join(' ')}</p></div><button onClick={onClose} className="rounded-full p-2 hover:bg-gray-100"><SvgIcon name="x" /></button></div>
      <div className="flex-1 overflow-y-auto bg-gray-50 p-5">{loading ? <div className="flex justify-center py-10 text-[#2e66a6]"><Spinner /></div> : messages.length ? <div className="space-y-3">{messages.map((msg) => { const mine = String(msg.sender?._id || msg.sender) === String(employerId); return <div key={msg._id || `${msg.createdAt}-${msg.content}`} className={cn('flex', mine ? 'justify-end' : 'justify-start')}><div className={cn('max-w-[78%] rounded-2xl px-4 py-3 text-sm', mine ? 'rounded-br-md bg-[#2e66a6] text-white' : 'rounded-bl-md border bg-white text-gray-900')}><p>{msg.content}</p><div className={cn('mt-1 text-[10px]', mine ? 'text-blue-100' : 'text-gray-400')}>{formatDateTime(msg.createdAt).time}</div></div></div>; })}<div ref={bottomRef} /></div> : <div className="py-16 text-center text-sm text-gray-500">No messages yet. Start the conversation with this applicant.</div>}{error ? <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}</div>
      <div className="border-t p-4"><div className="flex gap-2"><textarea value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} rows={2} placeholder="Type a message..." className="flex-1 resize-none rounded-xl border px-3 py-2 text-sm focus:border-[#2e66a6] focus:outline-none" /><button onClick={send} disabled={!text.trim() || sending} className="flex h-11 w-11 items-center justify-center self-end rounded-xl bg-[#2e66a6] text-white disabled:opacity-50">{sending ? <Spinner /> : <SvgIcon name="send" />}</button></div></div>
    </div>
  </div>;
};

const ApplicationDetails = () => {
  const navigate = useNavigate();
  const { applicationId } = useParams();
  const [loading, setLoading] = useState(true);
  const [application, setApplication] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('resume');
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [declineComment, setDeclineComment] = useState('');
  const [messageOpen, setMessageOpen] = useState(false);
  const [avatarBroken, setAvatarBroken] = useState(false);

  const fetchDetails = useCallback(async () => {
    try { setLoading(true); setError(''); const res = await axios.get(`${API_HOST}/api/applications/${applicationId}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }); setApplication(res.data?.application || null); }
    catch (err) { if (err.response?.status === 401) { localStorage.removeItem('token'); navigate('/employer/login'); } else setError(err.response?.data?.message || 'Failed to load application details.'); }
    finally { setLoading(false); }
  }, [applicationId, navigate]);
  useEffect(() => { fetchDetails(); }, [fetchDetails]);

  const updateStatus = async (status, extra = {}) => {
    try { setStatusUpdating(true); setError(''); const res = await axios.put(`${API_HOST}/api/applications/${applicationId}/status`, { status, ...extra }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }); setApplication((prev) => ({ ...prev, ...(res.data?.application || {}), jobseeker: prev.jobseeker, employer: prev.employer })); setSuccess(res.data?.message || 'Application status updated.'); setTimeout(() => setSuccess(''), 3000); }
    catch (err) { setError(err.response?.data?.message || 'Failed to update application status.'); }
    finally { setStatusUpdating(false); }
  };

  if (loading) return <EmployerLayout><div className="mx-auto max-w-7xl px-4 py-10"><div className="flex justify-center rounded-2xl border bg-white py-16 text-[#2e66a6]"><Spinner /></div></div></EmployerLayout>;
  if (!application) return <EmployerLayout><div className="mx-auto max-w-7xl px-4 py-10"><div className="rounded-2xl border bg-white p-10 text-center"><p>{error || 'Application not found.'}</p><Link to="/employer/applicants" className="mt-5 inline-block text-[#2e66a6]">Back to Applicants</Link></div></div></EmployerLayout>;

  const user = application.jobseeker || {};
  const profile = user.jobSeekerProfile || {};
  const name = user.fullName || [user.firstName, user.middleName, user.lastName, user.extensionName].filter(Boolean).join(' ') || 'Applicant';
  const currentStatus = String(application.status || 'pending').toLowerCase();
  const image = user.profileImage ? (String(user.profileImage).startsWith('http') ? user.profileImage : `${API_HOST}${user.profileImage}`) : '';
  const education = Array.isArray(profile.educationEntries) ? profile.educationEntries : [];
  const work = Array.isArray(profile.workExperiences) ? profile.workExperiences : [];
  const skills = [...parseSkills(profile.technicalSkills), ...parseSkills(profile.softSkills)];
  const salary = [profile.minimumSalary, profile.maximumSalary].filter(Boolean).join(' - ');
  const activities = Array.isArray(application.activityHistory) && application.activityHistory.length
    ? [...application.activityHistory].sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt))
    : [
        application.reviewedAt ? { type: 'reviewed', title: 'Application reviewed', description: 'The employer reviewed this application.', occurredAt: application.reviewedAt } : null,
        { type: 'submitted', title: 'Application received', description: `${name} applied for ${application.job?.title || 'this position'}.`, occurredAt: application.appliedAt || application.createdAt },
      ].filter(Boolean);
  const declineReasons = currentStatus === 'for interview' ? FOR_INTERVIEW_DECLINE_REASONS : APPLICANTS_DECLINE_REASONS;

  const openFullResumePreview = () => {
    const resumeData = normalizeUserToResumeData({
      userData: user,
      profile,
      workExperiences: work,
    });

    sessionStorage.setItem(
      'resumePreviewData',
      JSON.stringify({
        ...resumeData,
        returnTo: `/employer/application/${applicationId}`,
        viewerMode: 'employer',
      })
    );

    navigate('/employer/application/resume-preview');
  };

  return <EmployerLayout>
    <div className="mx-auto max-w-7xl px-1 py-8">
      <Link to="/employer/applicants" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-[#174b91]"><SvgIcon name="back" className="h-4 w-4" /> Back to Applicants</Link>
      {error ? <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}{success ? <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">{success}</div> : null}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
        <main className="overflow-hidden rounded-[20px] border border-[#d8e2ee] bg-white">
          <div className="flex flex-col gap-5 p-5 sm:p-7 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-5">
              <div className="h-[108px] w-[108px] shrink-0 overflow-hidden rounded-full bg-[#eef5fc]">{image && !avatarBroken ? <img src={image} alt={name} onError={() => setAvatarBroken(true)} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-[#2e66a6]">{name[0]}</div>}</div>
              <div className="min-w-0"><div className="flex flex-wrap items-center gap-3"><h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">{name}</h1><span className="rounded-md bg-green-50 px-2 py-1 text-xs font-semibold text-green-700">{currentStatus}</span></div><p className="mt-2 text-sm text-gray-500">Applied for <span className="font-semibold text-[#174b91]">{application.job?.title || 'Job Position'}</span></p><p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-500">
                <SvgIcon name="calendar" className="h-4 w-4" />
                <span>Applied on {formatDate(application.appliedAt || application.createdAt)}</span>
                <span aria-hidden="true">•</span>
                <span>{formatRelativeTime(application.appliedAt || application.createdAt)}</span>
              </p></div>
            </div>
            <div className="rounded-xl border border-[#d8e2ee] px-5 py-3 text-center"><div className="text-[11px] text-gray-500">JOBSEEKER LEVEL</div><div className="mt-1 text-lg font-bold text-[#174b91]">{profile.jobseekerLevel || profile.level || 'Applicant'}</div></div>
          </div>
          <div className="flex border-t border-[#d8e2ee] px-5 sm:px-7"><button onClick={() => setActiveTab('resume')} className={cn('relative flex h-14 items-center gap-2 px-3 text-sm font-semibold', activeTab === 'resume' ? 'text-[#174b91]' : 'text-gray-500')}><SvgIcon name="resume" className="h-4 w-4" /> Resume<span className={cn('absolute bottom-0 left-0 right-0 h-[3px]', activeTab === 'resume' ? 'bg-[#174b91]' : '')} /></button><button onClick={() => setActiveTab('activity')} className={cn('relative flex h-14 items-center gap-2 px-5 text-sm font-semibold', activeTab === 'activity' ? 'text-[#174b91]' : 'text-gray-500')}><SvgIcon name="activity" className="h-4 w-4" /> Activity<span className={cn('absolute bottom-0 left-0 right-0 h-[3px]', activeTab === 'activity' ? 'bg-[#174b91]' : '')} /></button></div>

          {activeTab === 'resume' ? <div className="border-t border-[#d8e2ee] px-6 pb-8 pt-4 sm:px-10 lg:px-12">
            <div className="flex justify-end pb-2">
              <button
                type="button"
                onClick={openFullResumePreview}
                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 hover:text-[#174b91] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6]/30"
              >
                <SvgIcon name="eye" className="h-4 w-4" />
                Open full view
              </button>
            </div>
            <Section title="Basic Information" defaultOpen><div className="pb-8 pt-5 text-center"><div className="flex items-start justify-center gap-8"><div className="min-w-0 flex-1"><h2 className="font-serif text-[26px] font-bold uppercase leading-tight tracking-[0.22em] text-[#111827] sm:text-[34px]">{name}</h2><div className="mt-2 font-serif text-[13px]">{profile.address || 'Address not provided'}</div><div className="mt-1 font-serif text-[13px]">{[user.email, profile.phoneNumber].filter(Boolean).join(' • ')}</div><div className="mt-2 font-serif text-[13px] italic text-gray-500">{[profile.campus, profile.course, profile.yearGraduated ? `Class of ${profile.yearGraduated}` : ''].filter(Boolean).join(', ')}</div></div></div></div></Section>
            <Section title="Objective" defaultOpen>{profile.aboutMe ? <div className="pb-5 pt-2 text-justify font-serif text-[13px] leading-5 text-gray-900">{richText(profile.aboutMe)}</div> : <EmptyLine>No objective added yet.</EmptyLine>}</Section>
            <Section title="Availability & Preferences"><div className="grid grid-cols-1 gap-x-12 gap-y-4 pb-5 pt-2 font-serif text-[13px] leading-5 md:grid-cols-3"><div className="space-y-1"><div><b>Preferred Work Mode:</b> {profile.preferredWorkMode || 'Not provided'}</div><div><b>Employment Type:</b> {profile.employmentType || 'Not provided'}</div><div><b>Willing to Relocate:</b> {profile.willingToRelocate || 'Not provided'}</div><div><b>How Soon Can Start:</b> {profile.howSoonCanYouStart || 'Not provided'}</div><div><b>Experience:</b> {profile.experience || profile.whatHaveYouDone || 'Not provided'}</div></div><div className="space-y-1"><div><b>Preferred Language:</b> {profile.preferredLanguage || 'Not provided'}</div><div><b>Educational Attainment:</b> {profile.educationalAttainment || 'Not provided'}</div><div><b>Double Degree:</b> {profile.studyField || profile.course || 'Not provided'}</div><div><b>Salary:</b> {salary || 'Not provided'}</div><div><b>Nationality:</b> {profile.nationality || 'Not provided'}</div></div><div className="space-y-1"><div><b>Height:</b> {profile.height || 'Not provided'}</div><div><b>Weight:</b> {profile.weight || 'Not provided'}</div><div><b>Gender:</b> {profile.gender || 'Not provided'}</div><div><b>Civil Status:</b> {profile.civilStatus || 'Not provided'}</div><div><b>Birthday:</b> {profile.birthday || 'Not provided'}</div></div></div></Section>
            <Section title="Work Experience">{work.length ? <div className="space-y-4 pb-5 pt-2 font-serif text-[13px] leading-5">{work.map((item, index) => <div key={item._id || index} className="py-1"><div className="flex flex-col justify-between gap-1 sm:flex-row"><div><div className="font-bold">{item.companyName || 'Company Name'}</div><div className="italic">{item.positionTitle || 'Position'}</div></div><div className="whitespace-nowrap italic text-gray-700">{entryDate(item)}</div></div>{item.description ? <div className="mt-2">{richText(item.description)}</div> : null}</div>)}</div> : <EmptyLine>No work experience added yet.</EmptyLine>}</Section>
            <Section title="Skills">{skills.length ? <div className="flex flex-wrap gap-2 pb-5 pt-2 font-serif text-[13px]">{skills.map((item, index) => <span key={`${item.skill}-${index}`} className="inline-flex overflow-hidden whitespace-nowrap rounded-full border border-[#d8e2ee]"><span className="px-3 py-1">{item.skill}</span><span className={cn('border-l px-2.5 py-1 font-semibold', PROFICIENCY_STYLES[item.proficiency] || PROFICIENCY_STYLES.Basic)}>{item.proficiency}</span></span>)}</div> : <EmptyLine>No skills added yet.</EmptyLine>}</Section>
            <Section title="Education">{education.length ? <div className="space-y-3 pb-5 pt-2 font-serif text-[13px] leading-5">{education.map((item, index) => <div key={item._id || index} className="flex flex-col justify-between gap-1 py-1 sm:flex-row"><div><div className="font-bold">{item.school || item.campus || 'School / University'}</div><div className="italic">{item.educationalAttainment || item.level || 'Educational Attainment'}</div>{item.description ? <div className="mt-1">{richText(item.description)}</div> : null}</div><div className="whitespace-nowrap italic text-gray-700">{entryDate(item)}</div></div>)}</div> : <EmptyLine>No education added yet.</EmptyLine>}</Section>
            <Section title="Certifications"><ProfileEntries items={profile.certifications || []} /></Section><Section title="Projects"><ProfileEntries items={profile.projects || []} /></Section><Section title="Seminars and Trainings"><ProfileEntries items={profile.seminars || []} /></Section><Section title="Awards and Achievements"><ProfileEntries items={profile.awards || []} /></Section><Section title="Affiliations"><ProfileEntries items={profile.affiliations || []} /></Section><Section title="Co-Curricular Activities"><ProfileEntries items={profile.cocurricular || []} /></Section><Section title="References"><ProfileEntries items={profile.references || []} type="references" /></Section>
          </div> : <div className="border-t border-[#d8e2ee] px-6 py-8 sm:px-10"><div className="relative ml-3 border-l-2 border-gray-200 pl-8">{activities.map((item, index) => { const dt = formatDateTime(item.occurredAt || item.createdAt); return <div key={item._id || `${item.type}-${index}`} className="relative pb-10 last:pb-0"><div className="absolute -left-[43px] top-0 flex h-6 w-6 items-center justify-center rounded-full border-4 border-white bg-[#2e66a6] shadow"><SvgIcon name={item.type === 'message' ? 'message' : item.type === 'submitted' ? 'resume' : 'activity'} className="h-3 w-3 text-white" /></div><h3 className="text-lg font-semibold text-gray-900">{item.title || 'Application updated'}</h3><p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500">{item.description || 'The application record was updated.'}</p><div className="mt-2 text-xs font-bold tracking-wide text-gray-500">{dt.date}{dt.time ? ` · ${dt.time}` : ''}</div></div>; })}</div></div>}
        </main>

        <aside className="space-y-5"><div className="rounded-[20px] border border-[#d8e2ee] bg-white p-5"><h2 className="text-lg font-bold">Application Summary</h2><div className="mt-5 space-y-4 text-sm"><div className="border-b pb-4"><div className="text-gray-500">Status</div><div className="mt-1 text-lg font-bold capitalize text-[#174b91]">{currentStatus}</div></div><div><div className="text-gray-500">Education</div><div className="mt-1 font-semibold">{profile.educationalAttainment || profile.course || 'Not provided'}</div></div><div><div className="text-gray-500">Experience</div><div className="mt-1 font-semibold">{profile.experience || profile.whatHaveYouDone || 'Not provided'}</div></div><div><div className="text-gray-500">Skills</div><div className="mt-1 font-semibold">{skills.length ? `${skills.length} listed skills` : 'Not provided'}</div></div></div></div>
          <div className="rounded-[20px] border border-[#d8e2ee] bg-white p-5"><h2 className="text-lg font-bold">Employer Actions</h2><div className="mt-5 space-y-3">{currentStatus === 'pending' ? <button onClick={() => updateStatus('for interview')} disabled={statusUpdating} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#102a78] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{statusUpdating ? <Spinner /> : <SvgIcon name="calendar" />} Move to Interview</button> : null}{currentStatus === 'for interview' ? <button onClick={() => updateStatus('hired')} disabled={statusUpdating} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#102a78] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{statusUpdating ? <Spinner /> : <SvgIcon name="check" />} Hired</button> : null}<button onClick={() => setMessageOpen(true)} className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#174b91] px-4 py-3 text-sm font-semibold text-[#174b91]"><SvgIcon name="message" /> Send Message</button>{['pending', 'for interview'].includes(currentStatus) ? <button onClick={() => setDeclineOpen(true)} className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-400 px-4 py-3 text-sm font-semibold text-red-600"><SvgIcon name="x" /> Decline Application</button> : null}</div></div></aside>
      </div>
      <DeclineReasonModal open={declineOpen} applicantName={name} reasons={declineReasons} selectedReason={declineReason} comment={declineComment} onReasonChange={setDeclineReason} onCommentChange={setDeclineComment} onClose={() => { setDeclineOpen(false); setDeclineReason(''); setDeclineComment(''); }} onConfirm={async () => { const from = currentStatus === 'for interview' ? 'forInterview' : 'applicants'; setDeclineOpen(false); await updateStatus('declined', { declineReason, declineComment, declinedFrom: from }); }} submitting={statusUpdating} />
      <MessagePopup open={messageOpen} onClose={() => setMessageOpen(false)} applicant={user} application={application} />
    </div>
  </EmployerLayout>;
};

export default ApplicationDetails;