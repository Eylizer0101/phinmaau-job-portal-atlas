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
  faChevronUp,
  faArrowLeft,
  faEye,
  faInfoCircle,
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
  shell: 'bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden',

  grid: 'flex min-h-[690px] h-[calc(100vh-180px)]',
  sidebar: 'w-full sm:w-[320px] md:w-[340px] lg:w-[360px] border-r border-gray-200 flex flex-col bg-white',
  main: 'flex-1 flex flex-col bg-white min-w-0',

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

  badge: 'inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold border',
  badgeUnread: 'bg-[#2e66a6] bg-opacity-10 text-[#2e66a6] border-[#2e66a6] border-opacity-20',

  convItem:
    'relative p-3 rounded-xl border border-transparent hover:bg-gray-50 hover:border-gray-200 transition cursor-pointer',
  convActive: 'bg-[#2e66a6] bg-opacity-5 border-[#2e66a6] ring-1 ring-[#2e66a6]',

  chatHeader: 'p-4 border-b border-gray-200 bg-white',
  chatBody: 'flex-1 overflow-y-auto px-4 sm:px-6 py-4 bg-gray-50',
  chatInputWrap:
    'sticky bottom-0 border-t border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80',

  bubbleBase: 'w-fit max-w-[92%] sm:max-w-[70%] lg:max-w-[68%] rounded-2xl p-3',
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
  const [jobseekers, setJobseekers] = useState([]);

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
  const [jsSearch, setJsSearch] = useState('');

  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);

  const [isJobseekersOpen, setIsJobseekersOpen] = useState(true);
  const [showSidebar, setShowSidebar] = useState(true);

  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const chatBodyRef = useRef(null);

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
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await api.get('/messages/conversations');
      if (res.data?.success) setConversations(res.data.data || []);
    } catch (err) {
      console.error(err);
      showToast({ type: 'error', title: 'Failed to load conversations', message: 'Please refresh the page.' });
    }
  }, [showToast]);

  const fetchJobseekers = useCallback(async () => {
    try {
      const res = await api.get('/messages/employer/jobseekers');
      if (res.data?.success) setJobseekers(res.data.data || []);
    } catch (err) {
      console.error(err);
      showToast({ type: 'error', title: 'Failed to load job seekers', message: 'Please refresh the page.' });
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
    async (jobseekerId) => {
      if (!jobseekerId) {
        setApplicationStatus(null);
        setSelectedApplication(null);
        return;
      }

      try {
        setCheckingStatus(true);

        const applicationsRes = await api.get('/applications/employer/all');
        if (applicationsRes.data?.success) {
          const applications = applicationsRes.data.applications || [];
          const jobseekerApplications = applications.filter(
            (app) =>
              app.jobseeker?._id === jobseekerId ||
              app.jobseeker?._id?.toString() === jobseekerId.toString()
          );

          if (jobseekerApplications.length > 0) {
            const latestApplication = jobseekerApplications[0];
            setSelectedApplication(latestApplication);
            setApplicationStatus(String(latestApplication.status || '').toLowerCase());
          } else {
            setSelectedApplication(null);
            setApplicationStatus(null);
          }
        } else {
          setSelectedApplication(null);
          setApplicationStatus(null);
        }
      } catch (err) {
        console.error('Error fetching conversation application:', err);
        setSelectedApplication(null);
        setApplicationStatus(null);
      } finally {
        setCheckingStatus(false);
      }
    },
    []
  );

  const fetchMessages = useCallback(
    async (conversationId) => {
      try {
        const res = await api.get(`/messages/conversation/${conversationId}`);
        if (res.data?.success) {
          setMessages(res.data.data || []);
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
        fetchConversations();
      } catch (err) {
        console.log('Mark read endpoint not available, continuing...');
      }
    },
    [fetchConversations]
  );

  const getOrCreateConversation = useCallback(
    async (receiverId) => {
      const existing = conversations.find((c) => c?.otherUser?._id === receiverId);
      if (existing) return existing;

      return {
        _id: `temp_${currentUserId}_${receiverId}`,
        otherUser: { _id: receiverId, fullName: 'Unknown Jobseeker', profileImage: '' },
        lastMessage: null,
        unreadCount: 0,
        __temp: true,
      };
    },
    [conversations, currentUserId]
  );

  useEffect(() => {
    const boot = async () => {
      setLoading(true);
      await Promise.all([fetchConversations(), fetchJobseekers(), fetchInterviewerOptions()]);
      setLoading(false);
    };
    boot();
  }, [fetchConversations, fetchJobseekers, fetchInterviewerOptions]);

  useEffect(() => {
    if (!selectedConversation?._id) return;
    fetchMessages(selectedConversation._id);
    markConversationRead(selectedConversation._id);

    if (selectedConversation?.otherUser?._id) {
      fetchConversationApplication(selectedConversation.otherUser._id);
    } else {
      setApplicationStatus(null);
      setSelectedApplication(null);
    }
  }, [selectedConversation?._id, fetchMessages, markConversationRead, fetchConversationApplication]);

  useEffect(() => {
    if (isNearBottom()) scrollToBottom(true);
  }, [messages, isNearBottom, scrollToBottom]);

  useEffect(() => {
    if (selectedConversation) setIsJobseekersOpen(false);
  }, [selectedConversation]);

  const filteredConversations = useMemo(() => {
    const q = convSearch.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((conv) => {
      const name = buildDisplayName(conv.otherUser).toLowerCase() || '';
      const last = conv.lastMessage?.content?.toLowerCase() || '';
      return name.includes(q) || last.includes(q);
    });
  }, [conversations, convSearch]);

  const filteredJobseekers = useMemo(() => {
    const q = jsSearch.trim().toLowerCase();
    if (!q) return jobseekers;
    return jobseekers.filter((js) => buildDisplayName(js?.jobseeker).toLowerCase().includes(q));
  }, [jobseekers, jsSearch]);

  const selectedHeaderTitle = useMemo(() => {
    if (!selectedConversation) return '';
    return buildDisplayName(selectedConversation.otherUser) || 'Unknown User';
  }, [selectedConversation]);

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
    setSelectedConversation(conv);
    setShowSidebar(false);
  };

  const handleSelectJobseeker = useCallback(
    async (jobseeker) => {
      if (!requireSession()) return;

      const receiverId = jobseeker?._id;
      if (!receiverId) {
        showToast({ type: 'error', title: 'Jobseeker missing', message: 'Please try again.' });
        return;
      }

      const conv = await getOrCreateConversation(receiverId);

      conv.otherUser = { ...(conv.otherUser || {}), ...(jobseeker || {}), _id: receiverId };
      conv.otherUser.profileImage = jobseeker?.profileImage || conv.otherUser.profileImage || '';

      setSelectedConversation(conv);

      if (conv.__temp) setMessages([]);

      setShowSidebar(false);

      fetchConversationApplication(receiverId);
    },
    [getOrCreateConversation, requireSession, showToast, fetchConversationApplication]
  );

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
        fetchConversations();
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

        fetchConversations();
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
              <div className={[UI.sidebar, showSidebar ? 'block' : 'hidden', 'sm:block'].join(' ')}>
                <div className={`${UI.panelPad} ${UI.divider}`}>
                  <div className="flex items-center justify-between gap-2">
                    <p className={`${UI.h2} ${UI.textPrimary}`}>Conversations</p>

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
                      onChange={(e) => setConvSearch(e.target.value)}
                      className={`${UI.input} ${UI.ring}`}
                      placeholder="Search conversations…"
                      aria-label="Search conversations"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-3">
                  {filteredConversations.length === 0 ? (
                    <div className="text-center py-10">
                      <FontAwesomeIcon icon={faComments} className="w-10 h-10 text-gray-300 mx-auto mb-3" aria-hidden="true" />
                      <p className={`font-semibold ${UI.textPrimary}`}>No conversations</p>
                      <p className={`text-sm ${UI.textMuted} mt-1`}>Select a job seeker below to start.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredConversations.map((conv) => {
                        const active = selectedConversation?._id === conv._id;
                        const title = buildDisplayName(conv.otherUser);
                        const time = formatTime(conv.lastMessageTime || conv.lastMessage?.createdAt);
                        const last = conv.lastMessage?.content || 'No messages yet';

                        const avatarUrl = getProfileImageUrl(conv.otherUser?.profileImage);

                        return (
                          <button
                            key={conv._id}
                            type="button"
                            onClick={() => handleSelectConversation(conv)}
                            className={['w-full text-left', UI.convItem, active ? UI.convActive : '', UI.ring].join(' ')}
                            aria-current={active ? 'page' : undefined}
                          >
                            {active && <span className="absolute left-0 top-2 bottom-2 w-1 rounded-full bg-[#2e66a6]" />}

                            <div className="flex items-start gap-3">
                              <div className="h-10 w-10 rounded-full overflow-hidden bg-[#2e66a6] bg-opacity-10 border border-[#2e66a6] border-opacity-20 flex items-center justify-center flex-shrink-0">
                                {avatarUrl ? (
                                  <img
                                    src={avatarUrl}
                                    alt={title}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <span className="text-[#2e66a6] font-bold text-sm">
                                    {(title?.trim()?.[0] || 'U').toUpperCase()}
                                  </span>
                                )}
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-2">
                                  <p className={`font-semibold ${UI.textPrimary} truncate`} title={title}>
                                    {title}
                                  </p>
                                  <span className={`text-xs ${UI.textMuted} flex-shrink-0`}>{time}</span>
                                </div>

                                <p className={`text-sm ${UI.textSecondary} mt-1 line-clamp-2`} title={last}>
                                  {last}
                                </p>

                                {conv.unreadCount > 0 && (
                                  <span className={`${UI.badge} ${UI.badgeUnread} mt-2`}>{conv.unreadCount} new</span>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setIsJobseekersOpen((v) => !v)}
                    className={`w-full ${UI.panelPad} flex items-center justify-between ${UI.btnBase} ${UI.btnGhost} ${UI.ring}`}
                    aria-expanded={isJobseekersOpen}
                  >
                    <div className="text-left">
                      <span className={`${UI.h2} ${UI.textPrimary}`}>Available Job Seekers</span>
                      <div className={`text-xs ${UI.textMuted} mt-0.5`}>Start a new conversation</div>
                    </div>
                    <FontAwesomeIcon icon={isJobseekersOpen ? faChevronUp : faChevronDown} aria-hidden="true" />
                  </button>

                  {isJobseekersOpen && (
                    <div className="px-4 pb-4">
                      <div className="relative mb-3">
                        <FontAwesomeIcon
                          icon={faSearch}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                          aria-hidden="true"
                        />
                        <input
                          value={jsSearch}
                          onChange={(e) => setJsSearch(e.target.value)}
                          className={`${UI.input} ${UI.ring}`}
                          placeholder="Search job seekers…"
                          aria-label="Search job seekers"
                        />
                      </div>

                      <div className="space-y-2 max-h-44 overflow-y-auto">
                        {filteredJobseekers.length > 0 ? (
                          filteredJobseekers.map((js) => {
                            const jobseeker = js.jobseeker;
                            const name = buildDisplayName(jobseeker);
                            const id = jobseeker?._id;

                            const avatarUrl = getProfileImageUrl(jobseeker?.profileImage);

                            return (
                              <button
                                key={id}
                                type="button"
                                onClick={() => handleSelectJobseeker(jobseeker)}
                                className={`w-full text-left p-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition ${UI.ring}`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="h-9 w-9 rounded-full overflow-hidden bg-[#2e66a6] bg-opacity-10 border border-[#2e66a6] border-opacity-20 flex items-center justify-center flex-shrink-0">
                                    {avatarUrl ? (
                                      <img
                                        src={avatarUrl}
                                        alt={name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          e.currentTarget.style.display = 'none';
                                        }}
                                      />
                                    ) : (
                                      <span className="text-[#2e66a6] font-bold text-xs">
                                        {(name?.trim()?.[0] || 'J').toUpperCase()}
                                      </span>
                                    )}
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <p className={`text-sm font-semibold ${UI.textPrimary} truncate`} title={name}>
                                      {name}
                                    </p>
                                    <p className={`text-xs ${UI.textMuted}`}>Tap to start chat</p>
                                  </div>
                                </div>
                              </button>
                            );
                          })
                        ) : (
                          <p className={`text-sm ${UI.textMuted} text-center py-2`}>No job seekers available</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className={[UI.main, showSidebar ? 'hidden sm:flex' : 'flex'].join(' ')}>
                {selectedConversation ? (
                  <>
                    <div className={UI.chatHeader}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <button
                            type="button"
                            onClick={() => setShowSidebar(true)}
                            className={`sm:hidden ${UI.btnBase} ${UI.btnIcon} ${UI.btnGhost} ${UI.ring}`}
                            aria-label="Back to conversations"
                          >
                            <FontAwesomeIcon icon={faArrowLeft} aria-hidden="true" />
                          </button>

                          {(() => {
                            const title = selectedHeaderTitle;
                            const avatarUrl = getProfileImageUrl(selectedConversation.otherUser?.profileImage);

                            return (
                              <div className="h-10 w-10 rounded-full overflow-hidden bg-[#2e66a6] bg-opacity-10 border border-[#2e66a6] border-opacity-20 flex items-center justify-center flex-shrink-0">
                                {avatarUrl ? (
                                  <img
                                    src={avatarUrl}
                                    alt={title}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <span className="text-[#2e66a6] font-bold text-sm">
                                    {(title?.trim()?.[0] || 'U').toUpperCase()}
                                  </span>
                                )}
                              </div>
                            );
                          })()}

                          <div className="min-w-0">
                            <p className={`font-bold ${UI.textPrimary} truncate`} title={selectedHeaderTitle}>
                              {selectedHeaderTitle}
                            </p>
                            <p className={`text-sm ${UI.textSecondary} truncate`}>
                              {selectedApplication?.job?.title || 'Job Seeker'}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 mt-0.5">
                              <span className="text-xs font-medium text-gray-500">Status:</span>
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full ${
                                  applicationStatus === 'for interview'
                                    ? 'bg-[#2e66a6] bg-opacity-10 text-[#2e66a6]'
                                    : applicationStatus === 'hired'
                                    ? 'bg-green-100 text-green-800'
                                    : applicationStatus === 'pending'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : applicationStatus === 'declined'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {checkingStatus
                                  ? 'Checking...'
                                  : applicationStatus
                                  ? applicationStatus
                                      .split(' ')
                                      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                                      .join(' ')
                                  : 'Not Applied'}
                              </span>
                            </div>
                          </div>
                        </div>

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
                      Select a conversation from the list, or choose a job seeker to start a new chat.
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
                        onClick={() => {
                          setShowSidebar(true);
                          setIsJobseekersOpen(true);
                        }}
                        className={`${UI.btnBase} ${UI.btnMd} ${UI.btnSecondary} ${UI.ring}`}
                      >
                        Start new chat
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