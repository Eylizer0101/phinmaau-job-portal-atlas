import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSearch,
  faPaperPlane,
  faCalendarAlt,
  faClock,
  faMapMarkerAlt,
  faVideo,
  faPaperclip,
  faCheckDouble,
  faCheck,
  faComments,
  faEnvelope,
  faFilePdf,
  faFileImage,
  faFileWord,
  faFile,
  faDownload,
  faTimes,
  faSpinner,
  faChevronDown,
  faArrowLeft,
  faEye,
  faChevronLeft,
  faChevronRight,
  faUser,
} from '@fortawesome/free-solid-svg-icons';
import EmployerLayout from '../../../layouts/EmployerLayout';
import api from '../../../services/api';

// ---------------- UI TOKENS ----------------
const UI = {
  pageBg: 'bg-gray-50',
  container: 'mx-auto max-w-7xl px-1 py-8',
  shell: 'bg-white border border-[#e6edf5] rounded-[24px] shadow-[0_18px_45px_rgba(46,102,166,0.08)] overflow-hidden',

  grid: 'flex h-[calc(100dvh-235px)] min-h-[620px] max-h-[760px] overflow-hidden',
  sidebar: 'w-full sm:w-[320px] md:w-[350px] lg:w-[380px] min-h-0 overflow-hidden border-r border-[#e6edf5] flex flex-col bg-white',
  main: 'flex-1 min-h-0 overflow-hidden flex flex-col bg-white min-w-0',

  textPrimary: 'text-gray-900',
  textSecondary: 'text-gray-600',
  textMuted: 'text-gray-500',

  h1: 'text-2xl sm:text-3xl font-bold tracking-tight',
  h2: 'text-base font-semibold',
  caption: 'text-xs',

  panelPad: 'p-4',
  inset: 'bg-gray-50 border border-gray-200 rounded-xl',
  divider: 'border-t border-gray-100',

  ring: 'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2',
  input:
    'w-full h-10 px-10 pr-4 border border-gray-200 rounded-xl bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6] focus:ring-opacity-20',

  btnBase:
    'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition disabled:opacity-60 disabled:pointer-events-none active:scale-[0.99] motion-reduce:transition-none motion-reduce:transform-none',
  btnSm: 'h-9 px-3 text-sm',
  btnMd: 'h-10 px-4 text-sm',
  btnIcon: 'h-10 w-10',

  btnPrimary: 'bg-[#2e66a6] text-white hover:bg-[#23508a]',
  btnSecondary: 'bg-white text-gray-800 border border-gray-200 hover:bg-gray-50',
  btnGhost: 'bg-transparent text-gray-700 hover:bg-gray-100',
  btnDangerGhost: 'bg-transparent text-gray-600 hover:bg-gray-100',

  convItem:
    'relative p-3 rounded-2xl border border-transparent hover:bg-[#f7faff] hover:border-[#d8e2ee] transition cursor-pointer',
  convActive: 'bg-[#f7faff] border-[#2e66a6] ring-1 ring-[#2e66a6]/80 shadow-[0_8px_20px_rgba(46,102,166,0.08)]',

  chatHeader: 'p-4 border-b border-[#e6edf5] bg-white',
  chatBody: 'flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 sm:px-6 py-5 bg-[#f8fafc] pb-28',
  chatInputWrap:
    'sticky bottom-0 border-t border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80',

  bubbleBase: 'w-fit max-w-[86%] sm:max-w-[66%] lg:max-w-[58%] rounded-2xl px-4 py-3 shadow-sm',
  bubbleTextMe: 'bg-[#2e66a6] text-white rounded-br-md',
  bubbleTextOther: 'bg-white border border-gray-200 text-gray-900 rounded-bl-md',

  attachWrap: 'w-full max-w-[92%] sm:max-w-[70%] lg:max-w-[68%]',
  attachBar: 'inline-flex w-full items-center gap-3 rounded-xl px-3 py-2 border',
  attachBarMe: 'border-[#2e66a6] bg-[#2e66a6] bg-opacity-10 text-gray-900',
  attachBarOther: 'border-gray-200 bg-white text-gray-900',
  attachIconWrapMe:
    'h-10 w-10 rounded-xl bg-white border border-[#2e66a6] flex items-center justify-center flex-shrink-0',
  attachIconWrapOther:
    'h-10 w-10 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0',
  attachBtn: 'h-9 w-9 rounded-xl border transition flex items-center justify-center',
  attachBtnMe: 'border-[#2e66a6] bg-white hover:bg-[#2e66a6] hover:bg-opacity-10',
  attachBtnOther: 'border-gray-200 bg-gray-50 hover:bg-gray-100',

  imgWrap: 'relative w-full max-w-[92%] sm:max-w-[70%] lg:max-w-[68%] group',
  imgOnly: 'w-full max-h-80 object-contain rounded-xl border border-gray-200 bg-white',
  imgOverlay: 'absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition',
  imgOverlayBtn:
    'h-9 w-9 rounded-lg bg-white/90 backdrop-blur border border-gray-200 shadow-sm flex items-center justify-center hover:bg-white',
};

// ---------------- CONSTANTS ----------------
const MAX_FILE_MB = 10;
const CONVERSATIONS_PER_PAGE = 7;

const STATUS_FILTER_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'for interview', label: 'For Interview' },
  { value: 'hired', label: 'Hired' },
  { value: 'declined', label: 'Declined' },
];

const VISIBLE_APPLICATION_STATUSES = new Set(
  STATUS_FILTER_OPTIONS.map((option) => option.value)
);

const ALLOWED_MIMES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const weekdayLabels = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const TIME_SLOTS = [
  '09:00',
  '09:30',
  '10:00',
  '10:30',
  '11:00',
  '11:30',
  '13:00',
  '13:30',
  '14:00',
  '14:30',
  '15:00',
  '15:30',
  '16:00',
  '16:30',
];

// ---------------- HELPERS ----------------
const getToken = () => localStorage.getItem('token');

const getUserId = () => {
  const userData = localStorage.getItem('user');
  if (!userData) return null;
  try {
    const user = JSON.parse(userData);
    return user.id || user._id || null;
  } catch {
    return null;
  }
};

const formatTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;

  const diffMinutes = Math.floor(diff / (1000 * 60));
  const diffHours = Math.floor(diff / (1000 * 60 * 60));
  const diffDays = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatFileSize = (bytes) => {
  if (!bytes) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const normalizeFileType = (mimeOrType, name = '') => {
  const lower = (mimeOrType || '').toLowerCase();
  const ext = name.split('.').pop()?.toLowerCase();

  if (lower.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif'].includes(ext)) return 'image';
  if (lower === 'application/pdf' || ext === 'pdf') return 'pdf';
  if (lower.includes('word') || lower.includes('msword') || ['doc', 'docx'].includes(ext)) return 'document';
  return 'other';
};

const getFileIcon = (type) => {
  if (type === 'image') return faFileImage;
  if (type === 'pdf') return faFilePdf;
  if (type === 'document') return faFileWord;
  return faFile;
};

const makeClientId = () => `c_${Date.now()}_${Math.random().toString(16).slice(2)}`;

const buildDisplayName = (u) => {
  if (!u) return 'Unknown Jobseeker';

  const parts = [u?.firstName, u?.middleName, u?.lastName]
    .map((p) => String(p || '').trim())
    .filter(Boolean);

  if (parts.length) return parts.join(' ');

  const full = String(u?.fullName || '').trim();
  if (full) return full;

  const username = String(u?.username || '').trim();
  if (username) return username;

  const email = String(u?.email || '').trim();
  if (email) return email;

  return 'Unknown Jobseeker';
};

const formatApplicationStatus = (value = '') => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return 'Not Applied';

  return normalized
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const getApplicationStatusLabel = (status = '', hiringStage = '') => {
  const normalizedStatus = String(status || '').trim().toLowerCase();
  const normalizedHiringStage = String(hiringStage || '').replace(/\s+/g, ' ').trim();
  const statusLabel = formatApplicationStatus(normalizedStatus);

  if (normalizedStatus === 'for interview' && normalizedHiringStage) {
    return `${statusLabel} (${normalizedHiringStage})`;
  }

  return statusLabel;
};

const getApplicationStatusDotClass = (status = '') => {
  const normalized = String(status || '').trim().toLowerCase();

  if (normalized === 'for interview') return 'bg-[#2e66a6]';
  if (normalized === 'hired') return 'bg-green-600';
  if (normalized === 'pending') return 'bg-yellow-500';
  if (normalized === 'declined') return 'bg-red-600';
  return 'bg-gray-500';
};

const getApplicationStatusClass = (status = '') => {
  const normalized = String(status || '').trim().toLowerCase();

  if (normalized === 'for interview') return 'bg-[#eaf3ff] text-[#2e66a6]';
  if (normalized === 'hired') return 'bg-green-100 text-green-800';
  if (normalized === 'pending') return 'bg-yellow-100 text-yellow-800';
  if (normalized === 'declined') return 'bg-red-100 text-red-800';
  return 'bg-gray-100 text-gray-700';
};

const cn = (...classes) => classes.filter(Boolean).join(' ');

const formatDate = (dateValue) => {
  if (!dateValue) return 'TBS';
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return 'TBS';
  return d.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const formatDateTime = (dateValue) => {
  if (!dateValue) return 'TBS';
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return 'TBS';

  return d.toLocaleString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const formatTimeOnly = (dateValue) => {
  if (!dateValue) return '';
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-PH', {
    hour: 'numeric',
    minute: '2-digit',
  });
};

const getInterviewMeta = (application) => {
  const scheduledAt = application?.interviewSchedule?.scheduledAt || null;
  const meetingType = application?.interviewSchedule?.meetingType || '';
  const notes = application?.interviewSchedule?.notes || '';
  const interviewer = application?.interviewSchedule?.interviewer || null;
  const interviewerName =
    application?.interviewSchedule?.interviewerName ||
    interviewer?.fullName ||
    interviewer?.email ||
    '';
  const status = application?.interviewSchedule?.status || '';

  return {
    scheduledAt,
    meetingType,
    notes,
    interviewer,
    interviewerName,
    status,
  };
};

const getStepLabelClass = (step, currentStep) => {
  if (step === currentStep) return 'text-[#1154cc] border-b-2 border-[#1154cc]';
  if (step < currentStep) return 'text-[#1154cc] border-b-2 border-[#1154cc]';
  return 'text-gray-400 border-b-2 border-gray-200';
};

const parseTimeLabel = (time24) => {
  const [hourStr, minuteStr] = String(time24 || '00:00').split(':');
  let hour = Number(hourStr);
  const minute = Number(minuteStr);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12 || 12;
  return `${hour}:${String(minute).padStart(2, '0')} ${suffix}`;
};

const buildDateTimeFromParts = (dateObj, time24) => {
  if (!dateObj || !time24) return null;
  const [hour, minute] = time24.split(':').map(Number);
  const next = new Date(dateObj);
  next.setHours(hour, minute, 0, 0);
  return next;
};

const isSameDay = (a, b) =>
  a &&
  b &&
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const getCalendarDays = (visibleMonth) => {
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const firstWeekDay = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days = [];

  for (let i = 0; i < firstWeekDay; i += 1) {
    days.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    days.push(new Date(year, month, day));
  }

  return days;
};

const Alert = ({ type = 'error', children, onClose }) => {
  const isError = type === 'error';
  const styles = isError
    ? 'border-red-200 bg-red-50 text-red-900'
    : 'border-green-200 bg-green-50 text-green-900';
  const ring = isError ? 'focus-visible:ring-red-600' : 'focus-visible:ring-green-600';

  return (
    <div
      className={cn('mb-5 flex items-start justify-between gap-4 rounded-xl border p-4 text-sm font-medium', styles)}
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
    >
      <div className="min-w-0">{children}</div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className={cn('shrink-0 rounded-lg px-2 py-1 text-xs font-semibold hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2', ring)}
          aria-label="Dismiss message"
        >
          Dismiss
        </button>
      )}
    </div>
  );
};

const ScheduleButton = ({ variant = 'secondary', className = '', children, ...props }) => {
  const variants = {
    secondary: 'border border-gray-200 bg-white text-gray-900 hover:bg-gray-50',
    success: 'bg-[#2e66a6] text-white hover:bg-[#23508a]',
    softWarning: 'border border-[#e7c86a] bg-[#fff4cc] text-[#9a6a00] hover:bg-[#ffefb3]',
  };

  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

const ScheduleInterviewModal = ({
  open,
  onClose,
  application,
  interviewerOptions,
  onSubmit,
  submitting,
}) => {
  const [step, setStep] = useState(1);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState('');
  const [meetingType, setMeetingType] = useState('Video Call');
  const [selectedInterviewerId, setSelectedInterviewerId] = useState('');
  const [notes, setNotes] = useState('');
  const [modalError, setModalError] = useState('');

  useEffect(() => {
    if (!open || !application) return;

    const existingSchedule = application?.interviewSchedule?.scheduledAt
      ? new Date(application.interviewSchedule.scheduledAt)
      : null;

    const initialDate = existingSchedule && !Number.isNaN(existingSchedule.getTime())
      ? existingSchedule
      : null;

    setStep(1);
    setModalError('');
    setVisibleMonth(
      initialDate
        ? new Date(initialDate.getFullYear(), initialDate.getMonth(), 1)
        : new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    );
    setSelectedDate(initialDate ? new Date(initialDate.getFullYear(), initialDate.getMonth(), initialDate.getDate()) : null);
    setSelectedTime(
      initialDate
        ? `${String(initialDate.getHours()).padStart(2, '0')}:${String(initialDate.getMinutes()).padStart(2, '0')}`
        : ''
    );
    setMeetingType(application?.interviewSchedule?.meetingType || 'Video Call');
    setSelectedInterviewerId(application?.interviewSchedule?.interviewer?._id || application?.interviewSchedule?.interviewer || '');
    setNotes(application?.interviewSchedule?.notes || '');
  }, [open, application]);

  useEffect(() => {
    if (!selectedInterviewerId && interviewerOptions.length > 0) {
      setSelectedInterviewerId(interviewerOptions[0]._id);
    }
  }, [interviewerOptions, selectedInterviewerId]);

  if (!open || !application) return null;

  const applicantName = buildDisplayName(application.jobseeker);
  const existingDateTime = buildDateTimeFromParts(selectedDate, selectedTime);
  const calendarDays = getCalendarDays(visibleMonth);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const selectedInterviewer = interviewerOptions.find((item) => String(item._id) === String(selectedInterviewerId));

  const availableSlots = TIME_SLOTS.filter((slot) => {
    if (!selectedDate) return true;
    const slotDateTime = buildDateTimeFromParts(selectedDate, slot);
    if (!slotDateTime) return false;

    const now = new Date();
    if (isSameDay(selectedDate, now)) {
      return slotDateTime.getTime() > now.getTime();
    }

    return slotDateTime.getTime() >= today.getTime();
  });

  const handleNext = () => {
    setModalError('');

    if (step === 1) {
      if (!selectedDate) {
        setModalError('Please select an interview date.');
        return;
      }
      if (!selectedTime) {
        setModalError('Please select an interview time.');
        return;
      }
      setStep(2);
      return;
    }

    if (step === 2) {
      if (!meetingType) {
        setModalError('Please select an interview type.');
        return;
      }
      if (!selectedInterviewerId) {
        setModalError('Please select an interviewer.');
        return;
      }
      setStep(3);
    }
  };

  const handleBack = () => {
    setModalError('');
    if (step === 1) {
      onClose();
      return;
    }
    setStep((prev) => Math.max(1, prev - 1));
  };

  const handleConfirm = async () => {
    setModalError('');

    if (!selectedDate || !selectedTime) {
      setModalError('Please select date and time.');
      setStep(1);
      return;
    }

    if (!meetingType || !selectedInterviewerId) {
      setModalError('Please complete the interview details.');
      setStep(2);
      return;
    }

    const scheduledAt = buildDateTimeFromParts(selectedDate, selectedTime);
    if (!scheduledAt) {
      setModalError('Invalid interview schedule.');
      return;
    }

    await onSubmit({
      applicationId: application._id,
      scheduledAt: scheduledAt.toISOString(),
      meetingType,
      interviewerId: selectedInterviewerId,
      notes: notes.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <div className="flex h-[95vh] w-full max-w-3xl flex-col overflow-hidden rounded-[26px] bg-white shadow-2xl">
        <div className="border-b border-gray-200 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-2xl font-semibold text-gray-900">
                {application?.interviewSchedule?.scheduledAt ? 'Reschedule Interview' : 'Schedule Interview'}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {applicantName} · {application?.job?.title || 'Applicant'}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              aria-label="Close modal"
            >
              <FontAwesomeIcon icon={faTimes} className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2 text-[11px] font-semibold uppercase tracking-wider">
            <div className={cn('pb-2 text-center', getStepLabelClass(1, step))}>Date & Time</div>
            <div className={cn('pb-2 text-center', getStepLabelClass(2, step))}>Details</div>
            <div className={cn('pb-2 text-center', getStepLabelClass(3, step))}>Confirm</div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 pb-8">
          {modalError && (
            <Alert type="error" onClose={() => setModalError('')}>
              {modalError}
            </Alert>
          )}

          {step === 1 && (
            <div>
              <div className="mb-5 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() =>
                    setVisibleMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
                  }
                  className="rounded-full p-2 text-gray-600 hover:bg-gray-100"
                >
                  <FontAwesomeIcon icon={faChevronLeft} className="h-5 w-5" />
                </button>

                <div className="text-2xl font-semibold text-gray-900">
                  {monthNames[visibleMonth.getMonth()]} {visibleMonth.getFullYear()}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setVisibleMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
                  }
                  className="rounded-full p-2 text-gray-600 hover:bg-gray-100"
                >
                  <FontAwesomeIcon icon={faChevronRight} className="h-5 w-5" />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-2 text-center text-sm text-gray-500">
                {weekdayLabels.map((label) => (
                  <div key={label} className="py-2 font-medium">
                    {label}
                  </div>
                ))}
              </div>

              <div className="mt-2 grid grid-cols-7 gap-2">
                {calendarDays.map((dateObj, idx) => {
                  if (!dateObj) {
                    return <div key={`blank_${idx}`} className="h-12" />;
                  }

                  const isPast = dateObj.getTime() < today.getTime();
                  const isSelected = selectedDate && isSameDay(dateObj, selectedDate);
                  const isToday = isSameDay(dateObj, new Date());

                  return (
                    <button
                      key={dateObj.toISOString()}
                      type="button"
                      disabled={isPast}
                      onClick={() => {
                        setSelectedDate(dateObj);
                        setSelectedTime('');
                      }}
                      className={cn(
                        'h-12 rounded-xl text-sm font-semibold transition-colors',
                        isPast && 'cursor-not-allowed bg-gray-50 text-gray-300',
                        !isPast && !isSelected && 'bg-white text-gray-800 hover:bg-gray-100',
                        isSelected && 'bg-[#1154cc] text-white',
                        isToday && !isSelected && 'border border-[#1154cc] text-[#1154cc]'
                      )}
                    >
                      {dateObj.getDate()}
                    </button>
                  );
                })}
              </div>

              <div className="mt-8">
                <div className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Select Time
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {TIME_SLOTS.map((slot) => {
                    const isAvailable = availableSlots.includes(slot);
                    const isSelected = selectedTime === slot;

                    return (
                      <button
                        key={slot}
                        type="button"
                        disabled={!selectedDate || !isAvailable}
                        onClick={() => setSelectedTime(slot)}
                        className={cn(
                          'rounded-xl border px-3 py-3 text-sm font-semibold transition-colors',
                          !selectedDate && 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-300',
                          selectedDate && !isAvailable && 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-300',
                          isAvailable && !isSelected && 'border-gray-200 bg-white text-gray-800 hover:border-[#1154cc] hover:text-[#1154cc]',
                          isSelected && 'border-[#1154cc] bg-blue-50 text-[#1154cc]'
                        )}
                      >
                        {parseTimeLabel(slot)}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-7">
              <div>
                <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Interview Type
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setMeetingType('Video Call')}
                    className={cn(
                      'rounded-2xl border p-5 text-left transition-colors',
                      meetingType === 'Video Call'
                        ? 'border-[#1ab1a7] bg-[#eafaf8]'
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className="rounded-full bg-white p-2 shadow-sm">
                        <FontAwesomeIcon icon={faVideo} className="h-5 w-5 text-[#1ab1a7]" />
                      </span>
                      <div>
                        <div className="text-lg font-semibold text-[#11857f]">Video Call</div>
                        <div className="text-sm text-gray-500">Google Meet / Zoom</div>
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMeetingType('On-site')}
                    className={cn(
                      'rounded-2xl border p-5 text-left transition-colors',
                      meetingType === 'On-site'
                        ? 'border-[#1154cc] bg-blue-50'
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className="rounded-full bg-white p-2 shadow-sm">
                        <FontAwesomeIcon icon={faMapMarkerAlt} className="h-5 w-5 text-gray-600" />
                      </span>
                      <div>
                        <div className="text-lg font-semibold text-gray-900">On-site</div>
                        <div className="text-sm text-gray-500">Office visit</div>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Interviewer
                </div>

                <div className="space-y-3">
                  {interviewerOptions.map((interviewer) => {
                    const selected = String(selectedInterviewerId) === String(interviewer._id);

                    return (
                      <button
                        key={interviewer._id}
                        type="button"
                        onClick={() => setSelectedInterviewerId(interviewer._id)}
                        className={cn(
                          'flex w-full items-center justify-between rounded-2xl border p-4 text-left transition-colors',
                          selected
                            ? 'border-[#1154cc] bg-blue-50'
                            : 'border-gray-200 bg-white hover:bg-gray-50'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <span className="rounded-full bg-gray-100 p-2">
                            <FontAwesomeIcon icon={faUser} className="h-5 w-5 text-gray-500" />
                          </span>
                          <div>
                            <div className="text-base font-semibold text-gray-900">
                              {interviewer.fullName || interviewer.email}
                            </div>
                            <div className="text-sm text-gray-500">
                              {interviewer.roleLabel || interviewer.email}
                            </div>
                          </div>
                        </div>

                        {selected && (
                          <span className="text-[#1154cc]">
                            <FontAwesomeIcon icon={faCheck} className="h-5 w-5" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Notes (Optional)
                </div>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={5}
                  placeholder="Add interview instructions or notes..."
                  className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1154cc] focus-visible:ring-offset-2"
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div className="rounded-3xl border border-gray-200 bg-gray-50 p-6">
                <div className="mb-5 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Confirmation
                </div>

                <div className="mb-6 flex items-center gap-4 border-b border-gray-200 pb-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#1154cc] text-lg font-semibold text-[#1154cc]">
                    {(applicantName?.trim()?.[0] || 'A').toUpperCase()}
                  </div>
                  <div>
                    <div className="text-2xl font-semibold text-gray-900">{applicantName}</div>
                    <div className="text-sm text-gray-500">{application?.job?.title || 'Applicant'}</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div>
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">Date</div>
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                      <FontAwesomeIcon icon={faCalendarAlt} className="h-4 w-4 text-[#1154cc]" />
                      {existingDateTime ? formatDate(existingDateTime) : '—'}
                    </div>
                  </div>

                  <div>
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">Time</div>
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                      <FontAwesomeIcon icon={faClock} className="h-4 w-4 text-[#1154cc]" />
                      {existingDateTime ? formatTimeOnly(existingDateTime) : '—'}
                    </div>
                  </div>

                  <div>
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">Type</div>
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                      {meetingType === 'Video Call' ? (
                        <FontAwesomeIcon icon={faVideo} className="h-4 w-4 text-[#1ab1a7]" />
                      ) : (
                        <FontAwesomeIcon icon={faMapMarkerAlt} className="h-4 w-4 text-[#1154cc]" />
                      )}
                      {meetingType}
                    </div>
                  </div>

                  <div>
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">Interviewer</div>
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                      <FontAwesomeIcon icon={faUser} className="h-4 w-4 text-[#1154cc]" />
                      {selectedInterviewer?.fullName || selectedInterviewer?.email || '—'}
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">Notes</div>
                    <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700">
                      {notes?.trim() ? notes : 'No notes added.'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-[#bce9e3] bg-[#f1fffc] px-4 py-3 text-sm text-[#12756f]">
                An interview schedule will be saved for this applicant with the selected details.
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-6 py-5">
          <ScheduleButton variant="secondary" onClick={handleBack}>
            <FontAwesomeIcon icon={faChevronLeft} className="h-4 w-4" />
            {step === 1 ? 'Cancel' : 'Back'}
          </ScheduleButton>

          {step < 3 ? (
            <ScheduleButton variant="success" onClick={handleNext}>
              Next
              <FontAwesomeIcon icon={faChevronRight} className="h-4 w-4" />
            </ScheduleButton>
          ) : (
            <ScheduleButton variant="success" onClick={handleConfirm} disabled={submitting}>
              {submitting ? 'Saving...' : 'Confirm & Schedule'}
            </ScheduleButton>
          )}
        </div>
      </div>
    </div>
  );
};

const EmployerMessages = () => {
  const navigate = useNavigate();
  const API_BASE = (process.env.REACT_APP_API_URL || 'https://phinmaau-job-portal-atlas.onrender.com/api').replace(/\/api$/, '');

  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [applications, setApplications] = useState([]);

  const [applicationStatus, setApplicationStatus] = useState(null);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [checkingStatus, setCheckingStatus] = useState(false);

  const [interviewerOptions, setInterviewerOptions] = useState([]);
  const [interviewersLoading, setInterviewersLoading] = useState(true);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const [convSearch, setConvSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('pending');
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [visibleConversationCount, setVisibleConversationCount] = useState(CONVERSATIONS_PER_PAGE);

  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);

  const [showSidebar, setShowSidebar] = useState(true);

  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const chatBodyRef = useRef(null);
  const statusMenuRef = useRef(null);

  const currentUserId = useMemo(() => getUserId(), []);

  const showToast = useCallback((t) => {
    setToast(t);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 5500);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  const getFileUrl = useCallback(
    (fileUrl) => {
      if (!fileUrl) return '';
      if (fileUrl.startsWith('http')) return fileUrl;
      return `${API_BASE}${fileUrl}`;
    },
    [API_BASE]
  );

  const getProfileImageUrl = useCallback(
    (imgPath) => {
      if (!imgPath) return '';
      if (imgPath.startsWith('http')) return imgPath;
      return `${API_BASE}${imgPath}`;
    },
    [API_BASE]
  );

  const openFile = useCallback(
    (fileData) => {
      const url = getFileUrl(fileData?.fileUrl);
      if (!url) return;
      window.open(url, '_blank', 'noopener,noreferrer');
    },
    [getFileUrl]
  );

  const downloadFile = useCallback(
    (fileData) => {
      const url = getFileUrl(fileData?.fileUrl);
      if (!url) return;

      const link = document.createElement('a');
      link.href = url;
      link.download = fileData?.originalName || 'file';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },
    [getFileUrl]
  );

  const isNearBottom = useCallback(() => {
    const el = chatBodyRef.current;
    if (!el) return true;
    const threshold = 160;
    return el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
  }, []);

  const scrollToBottom = useCallback((smooth = true) => {
    const chatBody = chatBodyRef.current;
    if (!chatBody) return;

    chatBody.scrollTo({
      top: chatBody.scrollHeight,
      behavior: smooth ? 'smooth' : 'auto',
    });
  }, []);

  const fetchConversations = useCallback(async (view = 'active') => {
    try {
      const res = await api.get('/messages/conversations', { params: { view } });
      if (res.data?.success) {
        const nextConversations = res.data.data || [];
        setConversations(nextConversations);
        return nextConversations;
      }
    } catch (err) {
      console.error(err);
      showToast({ type: 'error', title: 'Failed to load conversations', message: 'Please refresh the page.' });
    }

    return [];
  }, [showToast]);

  const fetchApplications = useCallback(async () => {
    try {
      const [allResult, declinedResult] = await Promise.allSettled([
        api.get('/applications/employer/all'),
        api.get('/applications/employer/declined'),
      ]);

      const allApplications =
        allResult.status === 'fulfilled' && allResult.value.data?.success
          ? allResult.value.data.applications || []
          : [];

      const declinedApplications =
        declinedResult.status === 'fulfilled' && declinedResult.value.data?.success
          ? declinedResult.value.data.applications || []
          : [];

      const applicationsById = new Map();

      [...allApplications, ...declinedApplications].forEach((application) => {
        const applicationId = String(application?._id || '');
        if (!applicationId) return;
        applicationsById.set(applicationId, application);
      });

      setApplications(Array.from(applicationsById.values()));

      if (
        allResult.status === 'rejected' &&
        declinedResult.status === 'rejected'
      ) {
        throw allResult.reason || declinedResult.reason;
      }
    } catch (err) {
      console.error(err);
      setApplications([]);
      showToast({
        type: 'error',
        title: 'Failed to load applicants',
        message: 'Please refresh the page.',
      });
    }
  }, [showToast]);

  const fetchInterviewerOptions = useCallback(async () => {
    try {
      setInterviewersLoading(true);
      const res = await api.get('/applications/employer/interviewer-options');
      if (res.data?.success) {
        setInterviewerOptions(res.data.interviewers || []);
      } else {
        setInterviewerOptions([]);
      }
    } catch (err) {
      console.error(err);
      setInterviewerOptions([]);
    } finally {
      setInterviewersLoading(false);
    }
  }, []);

  const fetchConversationApplication = useCallback(
    (jobseekerId) => {
      if (!jobseekerId) {
        setApplicationStatus(null);
        setSelectedApplication(null);
        return;
      }

      setCheckingStatus(true);

      const jobseekerApplications = applications
        .filter(
          (application) =>
            String(application?.jobseeker?._id || application?.jobseeker || '') ===
            String(jobseekerId)
        )
        .sort(
          (first, second) =>
            new Date(second?.appliedAt || second?.createdAt || 0).getTime() -
            new Date(first?.appliedAt || first?.createdAt || 0).getTime()
        );

      const latestApplication = jobseekerApplications[0] || null;
      setSelectedApplication(latestApplication);
      setApplicationStatus(
        latestApplication?.status
          ? String(latestApplication.status).toLowerCase()
          : null
      );
      setCheckingStatus(false);
    },
    [applications]
  );

  const fetchMessages = useCallback(
    async (conversationId) => {
      try {
        const res = await api.get(`/messages/conversation/${conversationId}`);
        if (res.data?.success) {
          setMessages(res.data.data || []);
          setConversations((previous) =>
            previous.map((conversation) =>
              conversation._id === conversationId
                ? { ...conversation, unreadCount: 0 }
                : conversation
            )
          );
          setSelectedConversation((previous) =>
            previous?._id === conversationId
              ? { ...previous, unreadCount: 0 }
              : previous
          );
          window.dispatchEvent(new Event('messages:unread-updated'));
          setTimeout(() => scrollToBottom(false), 0);
        }
      } catch (err) {
        console.error(err);
        showToast({ type: 'error', title: 'Failed to load messages', message: 'Try selecting the conversation again.' });
      }
    },
    [scrollToBottom, showToast]
  );

  const markConversationRead = useCallback(
    async (conversationId) => {
      if (!conversationId) return;
      try {
        await api.put(`/messages/mark-read/${conversationId}`);
        fetchConversations('active');
      } catch (err) {
        console.log('Mark read endpoint not available, continuing...');
      }
    },
    [fetchConversations]
  );

  useEffect(() => {
    const boot = async () => {
      setLoading(true);
      await Promise.all([
        fetchConversations('active'),
        fetchApplications(),
        fetchInterviewerOptions(),
      ]);
      setLoading(false);
    };
    boot();
  }, [fetchConversations, fetchApplications, fetchInterviewerOptions]);

  useEffect(() => {
    if (!selectedConversation?._id) return;

    if (selectedConversation.__temp) {
      setMessages([]);
    } else {
      fetchMessages(selectedConversation._id);
      markConversationRead(selectedConversation._id);
    }

    if (selectedConversation?.application) {
      setSelectedApplication(selectedConversation.application);
      setApplicationStatus(
        selectedConversation.application?.status
          ? String(selectedConversation.application.status).toLowerCase()
          : null
      );
    } else if (selectedConversation?.otherUser?._id) {
      fetchConversationApplication(selectedConversation.otherUser._id);
    } else {
      setApplicationStatus(null);
      setSelectedApplication(null);
    }
  }, [
    selectedConversation?._id,
    selectedConversation?._entryId,
    selectedConversation?.__temp,
    selectedConversation?.application,
    fetchMessages,
    markConversationRead,
    fetchConversationApplication,
  ]);

  useEffect(() => {
    if (isNearBottom()) scrollToBottom(true);
  }, [messages, isNearBottom, scrollToBottom]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!statusMenuRef.current?.contains(event.target)) setStatusMenuOpen(false);
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const visibleApplications = useMemo(
    () =>
      [...applications]
        .filter((application) => {
          const status = String(application?.status || '').trim().toLowerCase();
          const jobseekerId = application?.jobseeker?._id || application?.jobseeker;
          return Boolean(jobseekerId) && VISIBLE_APPLICATION_STATUSES.has(status);
        })
        .sort(
          (first, second) =>
            new Date(second?.appliedAt || second?.createdAt || 0).getTime() -
            new Date(first?.appliedAt || first?.createdAt || 0).getTime()
        ),
    [applications]
  );

  const conversationEntries = useMemo(() => {
    const conversationByJobseeker = new Map();

    conversations.forEach((conversation) => {
      const jobseekerId = String(conversation?.otherUser?._id || '');
      if (jobseekerId && !conversationByJobseeker.has(jobseekerId)) {
        conversationByJobseeker.set(jobseekerId, conversation);
      }
    });

    return visibleApplications
      .map((application) => {
        const applicationId = String(application?._id || '');
        const jobseekerId = String(
          application?.jobseeker?._id || application?.jobseeker || ''
        );

        if (!applicationId || !jobseekerId) return null;

        const existingConversation = conversationByJobseeker.get(jobseekerId) || null;
        const jobseeker =
          application?.jobseeker && typeof application.jobseeker === 'object'
            ? application.jobseeker
            : existingConversation?.otherUser || { _id: jobseekerId };

        if (existingConversation) {
          return {
            ...existingConversation,
            _entryId: `${existingConversation._id}_${applicationId}`,
            application,
            otherUser: {
              ...(existingConversation.otherUser || {}),
              ...jobseeker,
              _id: jobseekerId,
            },
          };
        }

        const temporaryId = `temp_${currentUserId}_${jobseekerId}_${applicationId}`;

        return {
          _id: temporaryId,
          _entryId: temporaryId,
          otherUser: {
            ...jobseeker,
            _id: jobseekerId,
          },
          application,
          lastMessage: null,
          lastMessageTime: application?.appliedAt || application?.createdAt || null,
          unreadCount: 0,
          __temp: true,
        };
      })
      .filter(Boolean)
      .sort((first, second) => {
        const firstTime = new Date(
          first?.lastMessageTime ||
            first?.lastMessage?.createdAt ||
            first?.application?.appliedAt ||
            first?.application?.createdAt ||
            0
        ).getTime();
        const secondTime = new Date(
          second?.lastMessageTime ||
            second?.lastMessage?.createdAt ||
            second?.application?.appliedAt ||
            second?.application?.createdAt ||
            0
        ).getTime();
        return secondTime - firstTime;
      });
  }, [conversations, currentUserId, visibleApplications]);

  const filteredConversations = useMemo(() => {
    const q = convSearch.trim().toLowerCase();

    return conversationEntries.filter((conversation) => {
      const application = conversation.application || {};
      const applicationStatusValue = String(application.status || '')
        .trim()
        .toLowerCase();

      if (activeTab === 'unread' && Number(conversation.unreadCount || 0) <= 0) {
        return false;
      }

      if (activeTab === 'status' && applicationStatusValue !== selectedStatusFilter) {
        return false;
      }

      if (!q) return true;

      const searchableValues = [
        buildDisplayName(conversation.otherUser),
        conversation.otherUser?.email,
        application.job?.title,
        application.job?.companyName,
        applicationStatusValue,
        formatApplicationStatus(applicationStatusValue),
        application.hiringStage,
        getApplicationStatusLabel(applicationStatusValue, application.hiringStage),
        conversation.lastMessage?.content,
      ];

      return searchableValues.some((value) =>
        String(value || '').toLowerCase().includes(q)
      );
    });
  }, [
    conversationEntries,
    convSearch,
    activeTab,
    selectedStatusFilter,
  ]);

  const visibleConversations = useMemo(
    () => filteredConversations.slice(0, visibleConversationCount),
    [filteredConversations, visibleConversationCount]
  );

  const hasMoreConversations = visibleConversationCount < filteredConversations.length;

  useEffect(() => {
    setVisibleConversationCount(CONVERSATIONS_PER_PAGE);
  }, [convSearch, activeTab, selectedStatusFilter]);

  const selectedHeaderTitle = useMemo(() => {
    if (!selectedConversation) return '';
    return buildDisplayName(selectedConversation.otherUser) || 'Unknown User';
  }, [selectedConversation]);

  const selectedApplicationSummary = useMemo(
    () => selectedApplication || selectedConversation?.application || null,
    [selectedApplication, selectedConversation?.application]
  );

  const scheduleButtonLabel = useMemo(() => {
    return selectedApplication?.interviewSchedule?.scheduledAt ? 'Reschedule Interview' : 'Schedule Interview';
  }, [selectedApplication]);

  const selectedInterviewMeta = useMemo(() => {
    return getInterviewMeta(selectedApplication);
  }, [selectedApplication]);

  const requireSession = useCallback(() => {
    const token = getToken();
    if (!token) {
      showToast({ type: 'error', title: 'Session expired', message: 'Please login again.' });
      navigate('/login');
      return false;
    }
    return true;
  }, [navigate, showToast]);

  const handleSelectConversation = (conv) => {
    const openedConversation = { ...conv, unreadCount: 0 };
    const conversationApplication = conv.application || null;

    setSelectedConversation(openedConversation);
    if (conv.__temp) {
      setMessages([]);
    } else {
      setConversations((previous) =>
        previous.map((conversation) =>
          conversation._id === conv._id
            ? { ...conversation, unreadCount: 0 }
            : conversation
        )
      );
    }
    setSelectedApplication(conversationApplication);
    setApplicationStatus(
      conversationApplication?.status
        ? String(conversationApplication.status).toLowerCase()
        : null
    );
    setShowSidebar(false);
  };

  const handleOpenApplicationDetails = useCallback(() => {
    const applicationId =
      selectedApplication?._id || selectedConversation?.application?._id;

    if (!applicationId) return;
    navigate(`/employer/application/${applicationId}?from=messages`);
  }, [navigate, selectedApplication?._id, selectedConversation?.application?._id]);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      showToast({ type: 'error', title: 'File too large', message: `Max ${MAX_FILE_MB}MB.` });
      e.target.value = '';
      return;
    }

    if (!ALLOWED_MIMES.includes(file.type)) {
      showToast({
        type: 'error',
        title: 'Unsupported file type',
        message: 'Only images, PDFs, DOC/DOCX, and TXT are allowed.',
      });
      e.target.value = '';
      return;
    }

    setSelectedFile(file);

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => setFilePreview(ev.target.result);
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }

    e.target.value = '';
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
  };

  const handleSendMessage = useCallback(async () => {
    if ((!newMessage.trim() && !selectedFile) || !selectedConversation) return;
    if (!requireSession()) return;

    const receiverId = selectedConversation.otherUser?._id;
    if (!receiverId) {
      showToast({ type: 'error', title: 'Receiver missing', message: 'Please re-open the conversation.' });
      return;
    }

    const optimisticId = makeClientId();
    const optimisticMsg = {
      _id: optimisticId,
      clientId: optimisticId,
      sender: { _id: currentUserId },
      receiver: { _id: receiverId },
      content: newMessage || '',
      createdAt: new Date().toISOString(),
      isRead: false,
      messageType: selectedFile ? 'file' : 'text',
      file: selectedFile
        ? {
            originalName: selectedFile.name,
            fileType: selectedFile.type,
            fileSize: selectedFile.size,
            fileUrl: null,
          }
        : null,
      __optimistic: true,
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setNewMessage('');
    const fileToSend = selectedFile;
    removeSelectedFile();
    setTimeout(() => scrollToBottom(true), 0);

    try {
      setSending(true);

      const formData = new FormData();
      if (fileToSend) formData.append('file', fileToSend);
      formData.append('receiverId', receiverId);
      formData.append('content', optimisticMsg.content);

      const res = await api.post('/messages/send', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data?.success) {
        const serverMsg = res.data.data;

        setMessages((prev) => prev.map((m) => (m._id === optimisticId ? serverMsg : m)));

        const refreshedConversations = await fetchConversations('active');
        const createdConversation = refreshedConversations.find(
          (conversation) =>
            String(conversation?.otherUser?._id || '') === String(receiverId)
        );

        if (createdConversation) {
          setSelectedConversation({
            ...createdConversation,
            application:
              createdConversation.application || selectedApplication || null,
            unreadCount: 0,
          });
        }

        setTimeout(() => scrollToBottom(true), 0);
      } else {
        throw new Error('Send failed');
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => prev.filter((m) => m._id !== optimisticId));
      showToast({ type: 'error', title: 'Send failed', message: err.response?.data?.message || err.message });
    } finally {
      setSending(false);
    }
  }, [
    currentUserId,
    fetchConversations,
    newMessage,
    requireSession,
    scrollToBottom,
    selectedApplication,
    selectedConversation,
    selectedFile,
    showToast,
  ]);

  const handleOpenScheduleModal = useCallback(() => {
    if (!selectedConversation) return;

    if (!selectedApplication?._id) {
      showToast({
        type: 'error',
        title: 'No application found',
        message: 'This conversation has no application record available for interview scheduling.',
      });
      return;
    }

    setScheduleModalOpen(true);
  }, [selectedConversation, selectedApplication, showToast]);

  const handleCloseScheduleModal = useCallback(() => {
    if (savingSchedule) return;
    setScheduleModalOpen(false);
  }, [savingSchedule]);

  const handleScheduleSubmit = useCallback(
    async (payload) => {
      try {
        setSavingSchedule(true);

        const res = await api.put(`/applications/${payload.applicationId}/interview-schedule`, {
          scheduledAt: payload.scheduledAt,
          meetingType: payload.meetingType,
          interviewerId: payload.interviewerId,
          notes: payload.notes,
        });

        if (!res.data?.success) {
          throw new Error('Failed to save interview schedule.');
        }

        const updatedApplication = res.data.application;

        setSelectedApplication(updatedApplication);
        setApplicationStatus(String(updatedApplication.status || 'for interview').toLowerCase());

        if (res.data?.interviewMessage) {
          setMessages((prev) => {
            const exists = prev.some((msg) => msg._id === res.data.interviewMessage._id);
            return exists ? prev : [...prev, res.data.interviewMessage];
          });
          setTimeout(() => scrollToBottom(true), 0);
        }

        fetchConversations('active');
        setScheduleModalOpen(false);

        showToast({
          type: 'success',
          title: 'Interview schedule saved',
          message:
            updatedApplication?.interviewSchedule?.status === 'rescheduled'
              ? 'The interview was successfully rescheduled and sent to chat.'
              : 'The interview was successfully scheduled and sent to chat.',
        });
      } catch (err) {
        console.error(err);
        showToast({
          type: 'error',
          title: 'Schedule failed',
          message: err?.response?.data?.message || 'Failed to save interview schedule.',
        });
      } finally {
        setSavingSchedule(false);
      }
    },
    [fetchConversations, scrollToBottom, showToast]
  );

  if (loading) {
    return (
      <EmployerLayout>
        <div className={UI.container}>
          <div className={`${UI.shell} p-10`}>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gray-100 animate-pulse" />
              <div className="space-y-2">
                <div className="h-4 w-56 bg-gray-100 rounded animate-pulse" />
                <div className="h-3 w-80 bg-gray-100 rounded animate-pulse" />
              </div>
            </div>
            <div className="mt-6 h-[520px] bg-gray-50 border border-gray-200 rounded-2xl animate-pulse" />
          </div>
        </div>
      </EmployerLayout>
    );
  }

  const MessageMeta = ({ me, time, isRead, variant = 'bubble' }) => {
    const timeClass = variant === 'bubble' ? (me ? 'text-white/80' : 'text-gray-500') : 'text-gray-500';

    const checkClass =
      variant === 'bubble'
        ? me
          ? isRead
            ? 'text-white/90'
            : 'text-white/60'
          : 'text-[#2e66a6] text-opacity-80'
        : 'text-[#2e66a6] text-opacity-80';

    return (
      <div className="flex items-center justify-between gap-3 mt-2">
        <span className={`text-xs ${timeClass}`}>{time}</span>
        {me && (
          <FontAwesomeIcon
            icon={isRead ? faCheckDouble : faCheck}
            className={`text-xs ${checkClass}`}
            aria-label={isRead ? 'Read' : 'Sent'}
          />
        )}
      </div>
    );
  };

  const InterviewBubble = ({ msg, me }) => {
    let confirmationData = null;

    try {
      confirmationData = msg?.interviewDetails?.notes ? JSON.parse(msg.interviewDetails.notes) : null;
    } catch {
      confirmationData = null;
    }

    const isConfirmationCard = !!confirmationData?.confirmationCard;
    const meetingLink =
      msg?.interviewDetails?.meetingLink ||
      confirmationData?.meetingLink ||
      msg?.application?.interviewSchedule?.meetingLink ||
      '';

    if (isConfirmationCard) {
      return (
        <div
          className={`${UI.bubbleBase} border border-gray-200 bg-white text-gray-900 shadow-sm ${
            me ? 'rounded-br-md' : 'rounded-bl-md'
          }`}
        >
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">
            Confirmation
          </div>

          <div className="mt-3 flex items-center gap-4 border-b border-gray-200 pb-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#d9ae22] text-lg font-semibold text-gray-900">
              {(confirmationData.applicantName?.trim()?.[0] || 'A').toUpperCase()}
            </div>

            <div className="min-w-0">
              <div className="truncate text-[18px] font-semibold text-gray-900">
                {confirmationData.applicantName}
              </div>
              <div className="truncate text-sm text-gray-500">
                {confirmationData.jobTitle}
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4">
            <div>
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                Date
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-900">
                <FontAwesomeIcon icon={faCalendarAlt} className="text-gray-500" />
                <span>{confirmationData.dateLabel}</span>
              </div>
            </div>

            <div>
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                Time
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-900">
                <FontAwesomeIcon icon={faClock} className="text-gray-500" />
                <span>{confirmationData.timeLabel}</span>
              </div>
            </div>

            <div>
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                Type
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-900">
                {confirmationData.typeLabel === 'Video Call' ? (
                  <FontAwesomeIcon icon={faVideo} className="text-gray-500" />
                ) : (
                  <FontAwesomeIcon icon={faMapMarkerAlt} className="text-gray-500" />
                )}
                <span>{confirmationData.typeLabel}</span>
              </div>
            </div>

            <div>
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                Interviewer
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-900">
                <FontAwesomeIcon icon={faUser} className="text-gray-500" />
                <span>{confirmationData.interviewerLabel}</span>
              </div>
            </div>
          </div>

          {meetingLink ? (
            <a
              href={meetingLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#2e66a6] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#23508a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2"
            >
              <FontAwesomeIcon icon={faVideo} className="h-4 w-4" aria-hidden="true" />
              Join Google Meet
            </a>
          ) : null}

          {confirmationData.rawNotes ? (
            <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
              {confirmationData.rawNotes}
            </div>
          ) : null}

          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-gray-500">{formatTime(msg.createdAt)}</span>
            {me && (
              <FontAwesomeIcon
                icon={msg.isRead ? faCheckDouble : faCheck}
                className="text-xs text-[#2e66a6]/80"
                aria-label={msg.isRead ? 'Read' : 'Sent'}
              />
            )}
          </div>
        </div>
      );
    }

    const details = msg.interviewDetails;
    return (
      <div
        className={`${UI.bubbleBase} bg-amber-50 border border-amber-200 text-amber-900 ${
          me ? 'rounded-br-md' : 'rounded-bl-md'
        }`}
      >
        <div className="flex items-center gap-2 font-semibold">
          <FontAwesomeIcon icon={faCalendarAlt} aria-hidden="true" />
          <span>Interview Scheduled</span>
        </div>

        {details && (
          <div className="mt-3 space-y-2 text-sm text-amber-900/90">
            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={faCalendarAlt} className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Date: {new Date(details.date).toLocaleDateString('en-PH')}</span>
            </div>

            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={faClock} className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Time: {details.time}</span>
            </div>

            {details.location && (
              <div className="flex items-start gap-2">
                <FontAwesomeIcon icon={faMapMarkerAlt} className="w-3.5 h-3.5 mt-0.5" aria-hidden="true" />
                <span className="break-words">Location: {details.location}</span>
              </div>
            )}

            {details.meetingLink && (
              <div className="flex items-center gap-2">
                <FontAwesomeIcon icon={faVideo} className="w-3.5 h-3.5" aria-hidden="true" />
                <a
                  href={details.meetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#2e66a6] underline break-all"
                >
                  Join Meeting
                </a>
              </div>
            )}
          </div>
        )}

        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-amber-900/70">{formatTime(msg.createdAt)}</span>
          {me && (
            <FontAwesomeIcon
              icon={msg.isRead ? faCheckDouble : faCheck}
              className="text-xs text-amber-900/70"
              aria-label={msg.isRead ? 'Read' : 'Sent'}
            />
          )}
        </div>
      </div>
    );
  };

  return (
    <EmployerLayout>
      <div className={UI.pageBg}>
        <div className={UI.container}>
          <div className="mb-6">
            <h1 className="text-[33px] leading-[40px] font-semibold text-gray-900">Messages</h1>
            <p className="text-gray-600 mt-2">Communicate with job seekers for interviews and follow-ups</p>
          </div>

          <div className={UI.shell}>
            <div className={UI.grid}>
              <div className={[UI.sidebar, showSidebar ? 'flex' : 'hidden', 'sm:flex'].join(' ')}>
                <div className={`${UI.panelPad} ${UI.divider}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className={`${UI.h2} ${UI.textPrimary}`}>Messages</p>

                    </div>

                    <button
                      type="button"
                      onClick={() => setShowSidebar(false)}
                      className={`sm:hidden ${UI.btnBase} ${UI.btnIcon} ${UI.btnGhost} ${UI.ring}`}
                      aria-label="Close sidebar"
                    >
                      <FontAwesomeIcon icon={faTimes} aria-hidden="true" />
                    </button>
                  </div>

                  <div className="mt-3 relative">
                    <FontAwesomeIcon
                      icon={faSearch}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      aria-hidden="true"
                    />
                    <input
                      value={convSearch}
                      onChange={(event) => setConvSearch(event.target.value)}
                      className={`${UI.input} ${UI.ring}`}
                      placeholder="Search conversations..."
                      aria-label="Search conversations"
                    />
                  </div>

                  <div className="mt-3 flex items-center gap-1.5">
                    {[
                      { key: 'all', label: 'All' },
                      { key: 'unread', label: 'Unread' },
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => {
                          setActiveTab(tab.key);
                          setStatusMenuOpen(false);
                        }}
                        className={`rounded-full px-3 py-2 text-sm font-semibold transition ${
                          activeTab === tab.key
                            ? 'bg-[#eaf3ff] text-[#2e66a6]'
                            : 'text-gray-600 hover:bg-[#f7faff]'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}

                    <div ref={statusMenuRef} className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          setStatusMenuOpen((open) => !open);
                        }}
                        className={`inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm font-semibold transition ${
                          activeTab === 'status'
                            ? 'bg-[#eaf3ff] text-[#2e66a6]'
                            : 'text-gray-600 hover:bg-[#f7faff]'
                        }`}
                        aria-expanded={statusMenuOpen}
                        aria-haspopup="menu"
                      >
                        {activeTab === 'status'
                          ? formatApplicationStatus(selectedStatusFilter)
                          : 'Status'}
                        <FontAwesomeIcon icon={faChevronDown} className="h-3 w-3" />
                      </button>

                      {statusMenuOpen && (
                        <div
                          className="absolute left-0 top-11 z-40 w-44 rounded-xl border border-[#e6edf5] bg-white p-1.5 shadow-xl"
                          role="menu"
                          aria-label="Filter conversations by application status"
                        >
                          {STATUS_FILTER_OPTIONS.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => {
                                setSelectedStatusFilter(option.value);
                                setActiveTab('status');
                                setStatusMenuOpen(false);
                              }}
                              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-semibold transition ${
                                activeTab === 'status' &&
                                selectedStatusFilter === option.value
                                  ? 'bg-[#eaf3ff] text-[#2e66a6]'
                                  : 'text-gray-700 hover:bg-[#f7faff]'
                              }`}
                              role="menuitem"
                            >
                              <span>{option.label}</span>
                              {activeTab === 'status' &&
                                selectedStatusFilter === option.value && (
                                  <FontAwesomeIcon icon={faCheck} className="h-3.5 w-3.5" />
                                )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                  </div>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3">
                  {filteredConversations.length === 0 ? (
                    <div className="text-center py-10">
                      <FontAwesomeIcon
                        icon={faComments}
                        className="mx-auto mb-3 h-10 w-10 text-gray-300"
                        aria-hidden="true"
                      />
                      <p className={`font-semibold ${UI.textPrimary}`}>
                        {activeTab === 'unread'
                          ? 'No unread conversations'
                          : activeTab === 'status'
                          ? `No ${formatApplicationStatus(selectedStatusFilter)} conversations`
                          : 'No conversations'}
                      </p>
                      <p className={`mt-1 text-sm ${UI.textMuted}`}>
                        {convSearch
                          ? 'Try another search term.'
                          : 'Applicants with Pending, For Interview, Hired, or Declined status will appear here.'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {visibleConversations.map((conversation) => {
                        const entryId = conversation._entryId || conversation._id;
                        const active =
                          (selectedConversation?._entryId || selectedConversation?._id) === entryId;
                        const title = buildDisplayName(conversation.otherUser);
                        const time = formatTime(
                          conversation.lastMessageTime ||
                            conversation.lastMessage?.createdAt
                        );
                        const last = conversation.__temp
                          ? 'Tap to start chat'
                          : conversation.lastMessage?.content || 'No messages yet';
                        const avatarUrl = getProfileImageUrl(
                          conversation.otherUser?.profileImage
                        );
                        return (
                          <div
                            key={entryId}
                            role="button"
                            tabIndex={0}
                            onClick={() => handleSelectConversation(conversation)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                handleSelectConversation(conversation);
                              }
                            }}
                            className={[
                              'group w-full text-left',
                              UI.convItem,
                              active ? UI.convActive : '',
                              UI.ring,
                            ].join(' ')}
                            aria-current={active ? 'page' : undefined}
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#2e66a6]/20 bg-[#2e66a6]/10">
                                {avatarUrl ? (
                                  <img
                                    src={avatarUrl}
                                    alt={title}
                                    className="h-full w-full object-cover"
                                    onError={(event) => {
                                      event.currentTarget.style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <span className="text-sm font-bold text-[#2e66a6]">
                                    {(title?.trim()?.[0] || 'U').toUpperCase()}
                                  </span>
                                )}
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <p
                                      className={`truncate font-semibold ${UI.textPrimary}`}
                                      title={title}
                                    >
                                      {title}
                                    </p>
                                  </div>

                                  <span className={`flex-shrink-0 text-xs ${UI.textMuted}`}>
                                    {time}
                                  </span>
                                </div>

                                <p
                                  className={`mt-1 truncate text-sm ${UI.textSecondary}`}
                                  title={last}
                                >
                                  {last}
                                </p>

                                {Number(conversation.unreadCount || 0) > 0 && (
                                  <p className="mt-1.5 text-xs font-semibold text-[#2e66a6]">
                                    {conversation.unreadCount}{' '}
                                    {Number(conversation.unreadCount) === 1
                                      ? 'unread message'
                                      : 'unread messages'}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {hasMoreConversations && (
                        <div className="flex justify-center px-2 pb-2 pt-3">
                          <button
                            type="button"
                            onClick={() =>
                              setVisibleConversationCount((current) =>
                                Math.min(
                                  current + CONVERSATIONS_PER_PAGE,
                                  filteredConversations.length
                                )
                              )
                            }
                            className={`w-full rounded-xl border border-[#d8e2ee] bg-white px-4 py-2.5 text-sm font-semibold text-[#2e66a6] transition hover:border-[#2e66a6]/40 hover:bg-[#f7faff] ${UI.ring}`}
                          >
                            View More
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

              </div>


              <div className={[UI.main, showSidebar ? 'hidden sm:flex' : 'flex'].join(' ')}>
                {selectedConversation ? (
                  <>
                    <div className={UI.chatHeader}>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setShowSidebar(true)}
                          className={`sm:hidden ${UI.btnBase} ${UI.btnIcon} ${UI.btnGhost} ${UI.ring}`}
                          aria-label="Back to conversations"
                        >
                          <FontAwesomeIcon icon={faArrowLeft} aria-hidden="true" />
                        </button>

                        <button
                          type="button"
                          onClick={handleOpenApplicationDetails}
                          disabled={!selectedApplicationSummary?._id}
                          className={`group flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2 py-1.5 text-left transition ${
                            selectedApplicationSummary?._id
                              ? 'hover:bg-[#f7faff]'
                              : 'cursor-default'
                          } ${UI.ring}`}
                          title={
                            selectedApplicationSummary?._id
                              ? 'Open application details and resume'
                              : 'No application details available'
                          }
                        >
                          {(() => {
                            const title = selectedHeaderTitle;
                            const avatarUrl = getProfileImageUrl(
                              selectedConversation.otherUser?.profileImage
                            );

                            return (
                              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#2e66a6]/20 bg-[#2e66a6]/10">
                                {avatarUrl ? (
                                  <img
                                    src={avatarUrl}
                                    alt={title}
                                    className="h-full w-full object-cover"
                                    onError={(event) => {
                                      event.currentTarget.style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <span className="text-sm font-bold text-[#2e66a6]">
                                    {(title?.trim()?.[0] || 'U').toUpperCase()}
                                  </span>
                                )}
                              </div>
                            );
                          })()}

                          <span className="min-w-0 flex-1">
                            <span
                              className={`block truncate font-bold ${UI.textPrimary}`}
                              title={selectedHeaderTitle}
                            >
                              {selectedHeaderTitle}
                            </span>

                            <span
                              className={`block truncate text-sm ${UI.textSecondary}`}
                              title={selectedApplicationSummary?.job?.title || 'Job Seeker'}
                            >
                              {selectedApplicationSummary?.job?.title
                                ? `Applied for: ${selectedApplicationSummary.job.title}`
                                : 'Job Seeker'}
                            </span>


                          </span>

                          {selectedApplicationSummary?._id && (
                            <span
                              className={`ml-auto inline-flex max-w-[220px] flex-shrink-0 items-center justify-end gap-2 rounded-full px-3 py-1.5 text-right text-xs font-semibold leading-4 ${getApplicationStatusClass(
                                applicationStatus ||
                                  selectedApplicationSummary?.status
                              )}`}
                              title={
                                checkingStatus
                                  ? 'Checking status'
                                  : getApplicationStatusLabel(
                                      applicationStatus ||
                                        selectedApplicationSummary?.status,
                                      selectedApplicationSummary?.hiringStage
                                    )
                              }
                            >
                              <span
                                className={`h-2 w-2 flex-shrink-0 rounded-full ${getApplicationStatusDotClass(
                                  applicationStatus ||
                                    selectedApplicationSummary?.status
                                )}`}
                                aria-hidden="true"
                              />
                              <span>
                                {checkingStatus
                                  ? 'Checking...'
                                  : getApplicationStatusLabel(
                                      applicationStatus ||
                                        selectedApplicationSummary?.status,
                                      selectedApplicationSummary?.hiringStage
                                    )}
                              </span>
                            </span>
                          )}
                        </button>
                      </div>
                    </div>

                    <div ref={chatBodyRef} className={UI.chatBody}>
                      {messages.length === 0 ? (
                        <div className="text-center py-14">
                          <FontAwesomeIcon icon={faEnvelope} className="w-14 h-14 text-gray-300 mx-auto mb-4" aria-hidden="true" />
                          <p className={`font-semibold ${UI.textPrimary}`}>No messages yet</p>
                          <p className={`text-sm ${UI.textMuted} mt-1`}>Send the first message to start the conversation.</p>
                        </div>
                      ) : (
                        <div className="space-y-3 pb-4">
                          {messages.map((msg) => {
                            const me = msg.sender?._id === currentUserId;
                            const hasFile = msg.messageType === 'file' && msg.file;
                            const isInterview = msg.messageType === 'interview';

                            const stableKey = msg._id || msg.clientId || `${msg.createdAt}_${msg.sender?._id || 'u'}`;

                            return (
                              <div key={stableKey} className={`flex ${me ? 'justify-end' : 'justify-start'}`}>
                                {hasFile ? (
                                  <div className={UI.attachWrap}>
                                    {(() => {
                                      const f = msg.file;
                                      const fType = normalizeFileType(f.fileType, f.originalName);

                                      if (fType === 'image') {
                                        const imgSrc = f.fileUrl ? getFileUrl(f.fileUrl) : filePreview;

                                        return (
                                          <>
                                            <div className={UI.imgWrap}>
                                              <img
                                                src={imgSrc || 'https://via.placeholder.com/200x200?text=Image'}
                                                alt={f.originalName || 'Image'}
                                                className={UI.imgOnly}
                                                loading="lazy"
                                                onError={(e) => {
                                                  e.currentTarget.src = 'https://via.placeholder.com/200x200?text=Image+Not+Found';
                                                }}
                                              />

                                              {f.fileUrl && (
                                                <div className={UI.imgOverlay}>
                                                  <button
                                                    type="button"
                                                    onClick={() => openFile(f)}
                                                    className={UI.imgOverlayBtn}
                                                    aria-label="View image"
                                                    title="View"
                                                  >
                                                    <FontAwesomeIcon icon={faEye} aria-hidden="true" />
                                                  </button>

                                                  <button
                                                    type="button"
                                                    onClick={() => downloadFile(f)}
                                                    className={UI.imgOverlayBtn}
                                                    aria-label="Download image"
                                                    title="Download"
                                                  >
                                                    <FontAwesomeIcon icon={faDownload} aria-hidden="true" />
                                                  </button>
                                                </div>
                                              )}
                                            </div>

                                            {msg.content && <p className="mt-2 text-sm text-gray-800 break-words">{msg.content}</p>}

                                            <MessageMeta me={me} time={formatTime(msg.createdAt)} isRead={msg.isRead} variant="file" />
                                          </>
                                        );
                                      }

                                      const icon = getFileIcon(fType);
                                      const barClass = `${UI.attachBar} ${me ? UI.attachBarMe : UI.attachBarOther}`;
                                      const iconWrap = me ? UI.attachIconWrapMe : UI.attachIconWrapOther;
                                      const btnClass = `${UI.attachBtn} ${me ? UI.attachBtnMe : UI.attachBtnOther}`;

                                      return (
                                        <>
                                          <div className={barClass}>
                                            <div className={iconWrap}>
                                              <FontAwesomeIcon icon={icon} className="text-gray-700" aria-hidden="true" />
                                            </div>

                                            <div className="min-w-0 flex-1">
                                              <p className="text-sm font-semibold truncate" title={f.originalName}>
                                                {f.originalName}
                                              </p>
                                              <p className="text-xs text-gray-500">{formatFileSize(f.fileSize)}</p>
                                            </div>

                                            {f.fileUrl && (
                                              <>
                                                <button type="button" onClick={() => openFile(f)} className={btnClass} aria-label="View">
                                                  <FontAwesomeIcon icon={faEye} className="text-gray-800" aria-hidden="true" />
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => downloadFile(f)}
                                                  className={btnClass}
                                                  aria-label="Download"
                                                >
                                                  <FontAwesomeIcon icon={faDownload} className="text-gray-800" aria-hidden="true" />
                                                </button>
                                              </>
                                            )}
                                          </div>

                                          {msg.content && <p className="mt-2 text-sm text-gray-800 break-words">{msg.content}</p>}

                                          <MessageMeta me={me} time={formatTime(msg.createdAt)} isRead={msg.isRead} variant="file" />
                                        </>
                                      );
                                    })()}
                                  </div>
                                ) : isInterview ? (
                                  <InterviewBubble msg={msg} me={me} />
                                ) : (
                                  <div className={`${UI.bubbleBase} ${me ? UI.bubbleTextMe : UI.bubbleTextOther}`}>
                                    <p className={`${me ? 'text-white' : 'text-gray-800'} text-sm break-words`}>{msg.content}</p>
                                    <MessageMeta me={me} time={formatTime(msg.createdAt)} isRead={msg.isRead} />
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          <div ref={messagesEndRef} />
                        </div>
                      )}
                    </div>

                    {selectedFile && (
                      <div className="px-4 pt-3 border-t border-gray-200 bg-white">
                        <div className={`${UI.inset} p-3 flex items-start justify-between gap-3`}>
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="h-10 w-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                              <FontAwesomeIcon
                                icon={getFileIcon(normalizeFileType(selectedFile.type, selectedFile.name))}
                                className="text-gray-700"
                                aria-hidden="true"
                              />
                            </div>

                            <div className="min-w-0">
                              <p className={`text-sm font-semibold ${UI.textPrimary} truncate`} title={selectedFile.name}>
                                {selectedFile.name}
                              </p>
                              <p className={`text-xs ${UI.textMuted}`}>{formatFileSize(selectedFile.size)}</p>

                              {filePreview && (
                                <div className="mt-2">
                                  <img
                                    src={filePreview}
                                    alt="Selected preview"
                                    className="max-h-32 rounded-xl border border-gray-200 object-contain bg-white"
                                  />
                                </div>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={removeSelectedFile}
                            className={`${UI.btnBase} ${UI.btnIcon} ${UI.btnDangerGhost} ${UI.ring}`}
                            aria-label="Remove selected file"
                          >
                            <FontAwesomeIcon icon={faTimes} aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    )}

                    <div className={`${UI.chatInputWrap} p-4`}>
                      <div className="flex items-end gap-2 w-full overflow-x-hidden">
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileSelect}
                          className="hidden"
                          accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.txt"
                        />

                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className={`${UI.btnBase} ${UI.btnIcon} ${UI.btnSecondary} ${UI.ring}`}
                          aria-label="Attach file"
                          disabled={sending}
                        >
                          <FontAwesomeIcon icon={faPaperclip} aria-hidden="true" />
                        </button>

                        <textarea
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.isComposing) return;
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendMessage();
                            }
                          }}
                          placeholder="Type a message…"
                          rows={1}
                          className={`flex-1 min-w-0 min-h-10 max-h-32 px-4 py-2 border border-gray-200 rounded-xl text-sm resize-none ${UI.ring} focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6] focus:ring-opacity-20`}
                          disabled={sending}
                          aria-label="Message input"
                        />

                        <button
                          type="button"
                          onClick={handleSendMessage}
                          disabled={(!newMessage.trim() && !selectedFile) || sending}
                          className={`${UI.btnBase} h-10 px-3 sm:px-4 ${UI.btnPrimary} ${UI.ring} shrink-0`}
                          aria-label="Send message"
                        >
                          {sending ? (
                            <>
                              <FontAwesomeIcon icon={faSpinner} className="animate-spin" aria-hidden="true" />
                              <span className="hidden sm:inline">Sending</span>
                            </>
                          ) : (
                            <>
                              <FontAwesomeIcon icon={faPaperPlane} aria-hidden="true" />
                              <span className="hidden sm:inline">Send</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-10 bg-white">
                    <FontAwesomeIcon icon={faComments} className="w-16 h-16 text-gray-300 mb-4" aria-hidden="true" />
                    <p className={`text-lg font-bold ${UI.textPrimary}`}>No conversation selected</p>
                    <p className={`mt-1 text-sm ${UI.textSecondary} text-center max-w-md`}>
                      Select an applicant or conversation from the list to start chatting.
                    </p>

                    <div className="mt-6 flex flex-col sm:flex-row gap-3">
                      <button
                        type="button"
                        onClick={() => setShowSidebar(true)}
                        className={`sm:hidden ${UI.btnBase} ${UI.btnMd} ${UI.btnPrimary} ${UI.ring}`}
                      >
                        Open Conversations
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowSidebar(true)}
                        className={`${UI.btnBase} ${UI.btnMd} ${UI.btnSecondary} ${UI.ring}`}
                      >
                        View Applicants
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <ScheduleInterviewModal
            open={scheduleModalOpen}
            onClose={handleCloseScheduleModal}
            application={selectedApplication}
            interviewerOptions={interviewerOptions}
            onSubmit={handleScheduleSubmit}
            submitting={savingSchedule}
          />

          {toast && (
            <div className="fixed bottom-5 right-5 z-[60] w-[92vw] max-w-sm">
              <div
                className={[
                  'rounded-2xl border shadow-lg bg-white p-4',
                  toast.type === 'error' ? 'border-red-200' : '',
                  toast.type === 'success' ? 'border-[#2e66a6] border-opacity-20' : '',
                  toast.type === 'info' ? 'border-gray-200' : '',
                ].join(' ')}
                role="status"
                aria-live="polite"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={[
                      'h-10 w-10 rounded-xl flex items-center justify-center border',
                      toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-700' : '',
                      toast.type === 'success' ? 'bg-[#2e66a6] bg-opacity-10 border-[#2e66a6] border-opacity-20 text-[#2e66a6]' : '',
                      toast.type === 'info' ? 'bg-gray-50 border-gray-200 text-gray-700' : '',
                    ].join(' ')}
                    aria-hidden="true"
                  >
                    <span className="text-lg font-bold">!</span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900">{toast.title}</p>
                    {toast.message && <p className="text-sm text-gray-600 mt-0.5 break-words">{toast.message}</p>}
                  </div>

                  <button
                    type="button"
                    onClick={() => setToast(null)}
                    className={`${UI.btnBase} ${UI.btnIcon} ${UI.btnGhost} ${UI.ring}`}
                    aria-label="Close notification"
                  >
                    <FontAwesomeIcon icon={faTimes} aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </EmployerLayout>
  );
};

export default EmployerMessages; 