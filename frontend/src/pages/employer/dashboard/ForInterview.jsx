import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import EmployerLayout from '../../../layouts/EmployerLayout';
import api from '../../../services/api';

const cn = (...classes) => classes.filter(Boolean).join(' ');

const Icon = ({ name, className = 'h-5 w-5', ...props }) => {
  const common = { className, fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24', ...props };

  switch (name) {
    case 'search':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.3-4.3m1.3-5.2a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      );
    case 'eye':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      );
    case 'check':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      );
    case 'x':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      );
    case 'calendar':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10m-13 9h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v11a2 2 0 002 2z" />
        </svg>
      );
    case 'clock':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'chevron-left':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      );
    case 'chevron-right':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      );
    case 'location':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      );
    case 'video':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14m-9 4h8a2 2 0 002-2V8a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      );
    case 'user':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A9.953 9.953 0 0112 15c2.4 0 4.605.846 6.326 2.255M15 9a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      );
    case 'dots-vertical':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5h.01M12 12h.01M12 19h.01" />
        </svg>
      );
    case 'chevron-down':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      );
    default:
      return null;
  }
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

const Button = ({ variant = 'secondary', className = '', children, ...props }) => {
  const variants = {
    secondary: 'border border-gray-200 bg-white text-gray-900 hover:bg-gray-50',
    success: 'bg-[#2e66a6] text-white hover:bg-[#23508a]',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    outlineBlue: 'border border-[#2e66a6] bg-white text-[#2e66a6] hover:bg-blue-50',
    softWarning: 'border border-[#e7c86a] bg-[#fff4cc] text-[#9a6a00] hover:bg-[#ffefb3]',
    dangerSoft: 'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100',
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

const buildApplicantName = (u) => {
  const full = (u?.fullName || '').trim();
  if (full) return full;

  const parts = [u?.firstName, u?.middleName, u?.lastName]
    .map((p) => (p || '').trim())
    .filter(Boolean);

  if (parts.length) return parts.join(' ');

  const email = (u?.email || '').trim();
  if (email && email.includes('@')) return email.split('@')[0];

  return 'Applicant';
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

const FOR_INTERVIEW_DECLINE_REASONS = [
  'Interview performance did not meet expectations',
  'Skills assessment below required level',
  'Communication skills need improvement',
  'Schedule or availability conflict',
  'Position requirements not fully met',
  'Failed to attend scheduled interview',
];

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

const getStatusButtonLabel = (application) =>
  application?.interviewSchedule?.scheduledAt ? 'Reschedule Interview' : 'Schedule Interview';

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

  const applicantName = buildApplicantName(application.jobseeker);
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
              <Icon name="x" className="h-5 w-5" />
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
                  <Icon name="chevron-left" className="h-5 w-5" />
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
                  <Icon name="chevron-right" className="h-5 w-5" />
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
                        <Icon name="video" className="h-5 w-5 text-[#1ab1a7]" />
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
                        <Icon name="location" className="h-5 w-5 text-gray-600" />
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
                            <Icon name="user" className="h-5 w-5 text-gray-500" />
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
                            <Icon name="check" className="h-5 w-5" />
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
                      <Icon name="calendar" className="h-4 w-4 text-[#1154cc]" />
                      {existingDateTime ? formatDate(existingDateTime) : '—'}
                    </div>
                  </div>

                  <div>
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">Time</div>
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                      <Icon name="clock" className="h-4 w-4 text-[#1154cc]" />
                      {existingDateTime ? formatTimeOnly(existingDateTime) : '—'}
                    </div>
                  </div>

                  <div>
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">Type</div>
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                      {meetingType === 'Video Call' ? (
                        <Icon name="video" className="h-4 w-4 text-[#1ab1a7]" />
                      ) : (
                        <Icon name="location" className="h-4 w-4 text-[#1154cc]" />
                      )}
                      {meetingType}
                    </div>
                  </div>

                  <div>
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">Interviewer</div>
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                      <Icon name="user" className="h-4 w-4 text-[#1154cc]" />
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
                An interview invitation will be saved for this applicant with the interview details.
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-6 py-5">
          <Button variant="secondary" onClick={handleBack}>
            <Icon name="chevron-left" className="h-4 w-4" />
            {step === 1 ? 'Cancel' : 'Back'}
          </Button>

          {step < 3 ? (
            <Button variant="success" onClick={handleNext}>
              Next
              <Icon name="chevron-right" className="h-4 w-4" />
            </Button>
          ) : (
            <Button variant="success" onClick={handleConfirm} disabled={submitting}>
              {submitting ? 'Saving...' : 'Confirm & Schedule'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

const DeclineReasonModal = ({
  open,
  applicantName,
  selectedReason,
  comment,
  onReasonChange,
  onCommentChange,
  onClose,
  onConfirm,
  isSubmitting = false,
}) => {
  const closeButtonRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => closeButtonRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, onClose, isSubmitting]);

  if (!open) return null;

  const canSubmit = !!selectedReason && !isSubmitting;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center px-4 py-6">
      <div
        className="absolute inset-0 bg-black/45"
        onClick={() => {
          if (!isSubmitting) onClose?.();
        }}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="for-interview-decline-title"
        className="relative w-full max-w-5xl rounded-[28px] border border-gray-200 bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-5 sm:px-8">
          <div>
            <h2 id="for-interview-decline-title" className="text-2xl font-bold text-gray-900">
              Do you want to decline this application?
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-gray-500">
              If yes, please choose one of the following reasons or leave a comment.
            </p>
            <p className="text-sm leading-7 text-gray-500">
              so the applicant receives feedback.
              {applicantName ? ` Applicant: ${applicantName}.` : ''}
            </p>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Close decline modal"
          >
            <Icon name="x" className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-gray-200 px-6 py-6 sm:px-8">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {FOR_INTERVIEW_DECLINE_REASONS.map((reason) => {
              const isSelected = selectedReason === reason;

              return (
                <button
                  key={reason}
                  type="button"
                  onClick={() => onReasonChange(reason)}
                  disabled={isSubmitting}
                  className={cn(
                    'min-h-[84px] rounded-2xl border px-4 py-4 text-center text-sm font-medium leading-7 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60',
                    isSelected
                      ? 'border-[#9db9df] bg-[#f4f8fd] text-gray-900 shadow-sm'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                  )}
                >
                  {reason}
                </button>
              );
            })}
          </div>
        </div>

        <div className="px-6 py-6 sm:px-8">
          <label htmlFor="forInterviewDeclineComment" className="sr-only">
            Leave a comment for the applicant
          </label>
          <textarea
            id="forInterviewDeclineComment"
            value={comment}
            onChange={(e) => onCommentChange(e.target.value)}
            disabled={isSubmitting}
            rows={5}
            placeholder="Leave a comment for the applicant..."
            className="w-full rounded-2xl border border-gray-200 px-4 py-4 text-sm text-gray-900 placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-60"
          />

          {!selectedReason && (
            <div className="mt-3 text-sm font-medium text-red-600">
              Please select a decline reason before continuing.
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 pb-6 sm:px-8">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting} className="min-w-[110px]">
            Cancel
          </Button>
          <Button
            variant="dangerSoft"
            onClick={onConfirm}
            disabled={!canSubmit}
            className="min-w-[170px] bg-red-600 text-white border-red-600 hover:bg-red-700 disabled:opacity-100 disabled:bg-red-300 disabled:text-white disabled:border-red-300"
          >
            {isSubmitting ? 'Declining...' : 'Decline Application'}
          </Button>
        </div>
      </div>
    </div>
  );
};

const ActionMenu = ({ app, name, rowBusy, onHire, onDecline, openMenuId, setOpenMenuId }) => {
  const isOpen = openMenuId === app._id;
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(event.target)) {
        setOpenMenuId((prev) => (prev === app._id ? null : prev));
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, setOpenMenuId, app._id]);

  return (
    <div ref={wrapperRef} className="relative flex items-center justify-center gap-2">
      <Link
        to={`/employer/application/${app._id}`}
        className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2"
        aria-label={`View application of ${name}`}
      >
        <Icon name="eye" className="h-5 w-5" />
      </Link>

      <button
        type="button"
        onClick={() => setOpenMenuId((prev) => (prev === app._id ? null : app._id))}
        className="inline-flex h-11 w-16 items-center justify-center gap-1 rounded-xl border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2"
        aria-label={`Open actions for ${name}`}
      >
        <Icon name="dots-vertical" className="h-5 w-5" />
        <Icon name="chevron-down" className="h-4 w-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-14 z-30 w-44 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
          <button
            type="button"
            onClick={() => {
              onHire();
              setOpenMenuId(null);
            }}
            disabled={rowBusy}
            className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-[#2e66a6] hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Icon name="check" className="h-4 w-4" />
            Hired
          </button>

          <button
            type="button"
            onClick={() => {
              onDecline();
              setOpenMenuId(null);
            }}
            disabled={rowBusy}
            className="flex w-full items-center gap-3 border-t border-gray-100 px-4 py-3 text-left text-sm font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Icon name="x" className="h-4 w-4" />
            Declined
          </button>
        </div>
      )}
    </div>
  );
};

const ForInterview = () => {
  const API_BASE = (process.env.REACT_APP_API_URL || 'https://phinmaau-job-portal-atlas.onrender.com/api').replace(/\/api\/?$/, '');
  const [brokenAvatars, setBrokenAvatars] = useState(() => new Set());

  const [applications, setApplications] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [interviewerOptions, setInterviewerOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [interviewersLoading, setInterviewersLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [query, setQuery] = useState('');
  const [selectedJob, setSelectedJob] = useState('all');
  const [filterBy, setFilterBy] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [openFilterMenu, setOpenFilterMenu] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);

  const [declineModalOpen, setDeclineModalOpen] = useState(false);
  const [declineTarget, setDeclineTarget] = useState(null);
  const [declineReason, setDeclineReason] = useState('');
  const [declineComment, setDeclineComment] = useState('');

  const getImageUrl = useCallback(
    (url) => {
      if (!url) return '';
      if (url.startsWith('http')) return url;
      return `${API_BASE}${url}`;
    },
    [API_BASE]
  );

  const markBroken = useCallback((key) => {
    setBrokenAvatars((prev) => {
      const next = new Set(prev);
      next.add(String(key));
      return next;
    });
  }, []);

  const Avatar = ({ img, name, size = 46, altKey }) => {
    const initial = (name?.trim()?.[0] || 'U').toUpperCase();
    const src = img ? getImageUrl(img) : '';
    const isBroken = brokenAvatars.has(String(altKey));

    return (
      <div
        className="flex items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-gray-100 shrink-0"
        style={{ height: `${size}px`, width: `${size}px` }}
      >
        {src && !isBroken ? (
          <img
            src={src}
            alt={`${name}'s profile`}
            className="h-full w-full object-cover"
            loading="lazy"
            onError={() => markBroken(altKey)}
          />
        ) : (
          <span className="text-sm font-bold text-gray-700">{initial}</span>
        )}
      </div>
    );
  };

  const resetDeclineState = () => {
    setDeclineModalOpen(false);
    setDeclineTarget(null);
    setDeclineReason('');
    setDeclineComment('');
  };

  const openDeclineModal = (application) => {
    setError('');
    setSuccess('');
    setDeclineTarget(application);
    setDeclineReason('');
    setDeclineComment('');
    setDeclineModalOpen(true);
  };

  const fetchJobs = useCallback(async () => {
    try {
      setJobsLoading(true);
      const res = await api.get('/jobs/employer/my-jobs');
      if (res.data?.success) {
        setJobs(res.data.jobs || []);
      } else {
        setJobs([]);
      }
    } catch (err) {
      console.error(err);
      setJobs([]);
    } finally {
      setJobsLoading(false);
    }
  }, []);

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

  const fetchForInterviewApplications = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const params = selectedJob !== 'all' ? { jobId: selectedJob } : {};
      const res = await api.get('/applications/employer/for-interview', { params });

      if (res.data?.success) {
        setApplications(res.data.applications || []);
      } else {
        setApplications([]);
      }
    } catch (err) {
      console.error(err);
      setApplications([]);
      setError('Failed to load for interview applicants.');
    } finally {
      setLoading(false);
    }
  }, [selectedJob]);

  useEffect(() => {
    fetchJobs();
    fetchInterviewerOptions();
  }, [fetchJobs, fetchInterviewerOptions]);

  useEffect(() => {
    fetchForInterviewApplications();
  }, [fetchForInterviewApplications]);

  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(''), 2200);
    return () => clearTimeout(t);
  }, [success]);

  const filteredApplications = useMemo(() => {
    const q = query.trim().toLowerCase();

    let list = [...applications];

    if (q) {
      list = list.filter((app) => {
        const name = buildApplicantName(app.jobseeker).toLowerCase();
        const email = (app.jobseeker?.email || '').toLowerCase();
        const jobTitle = (app.job?.title || '').toLowerCase();
        return [name, email, jobTitle].some((v) => v.includes(q));
      });
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - mondayOffset);
    const startOfNextWeek = new Date(startOfWeek);
    startOfNextWeek.setDate(startOfWeek.getDate() + 7);
    const sevenDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const thirtyDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const startOfNextYear = new Date(now.getFullYear() + 1, 0, 1);

    const getComparableDate = (app) => {
      const dateValue = app?.interviewSchedule?.scheduledAt || app?.appliedAt || 0;
      const parsed = new Date(dateValue);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    };

    if (filterBy === 'today') {
      list = list.filter((app) => {
        const date = getComparableDate(app);
        return date && date >= startOfToday && date < startOfTomorrow;
      });
    } else if (filterBy === 'yesterday') {
      list = list.filter((app) => {
        const date = getComparableDate(app);
        return date && date >= startOfYesterday && date < startOfToday;
      });
    } else if (filterBy === 'this_week') {
      list = list.filter((app) => {
        const date = getComparableDate(app);
        return date && date >= startOfWeek && date < startOfNextWeek;
      });
    } else if (filterBy === 'last_7_days') {
      list = list.filter((app) => {
        const date = getComparableDate(app);
        return date && date >= sevenDaysAgo && date < startOfTomorrow;
      });
    } else if (filterBy === 'this_month') {
      list = list.filter((app) => {
        const date = getComparableDate(app);
        return date && date >= startOfMonth && date < startOfNextMonth;
      });
    } else if (filterBy === 'last_30_days') {
      list = list.filter((app) => {
        const date = getComparableDate(app);
        return date && date >= thirtyDaysAgo && date < startOfTomorrow;
      });
    } else if (filterBy === 'this_year') {
      list = list.filter((app) => {
        const date = getComparableDate(app);
        return date && date >= startOfYear && date < startOfNextYear;
      });
    } else if (filterBy === 'last_year') {
      const startOfLastYear = new Date(now.getFullYear() - 1, 0, 1);
      list = list.filter((app) => {
        const date = getComparableDate(app);
        return date && date >= startOfLastYear && date < startOfYear;
      });
    }

    const getSalaryValue = (app) => {
      const job = app?.job || {};
      const raw = job.salaryMax ?? job.maxSalary ?? job.salaryTo ?? job.salary ?? job.salaryMin ?? job.minSalary ?? job.salaryFrom ?? 0;
      const numeric = Number(String(raw).replace(/[^0-9.]/g, ''));
      return Number.isNaN(numeric) ? 0 : numeric;
    };

    const getExpiryValue = (app) => {
      const raw = app?.job?.expiryDate || app?.job?.expiresAt || app?.job?.deadline || app?.job?.applicationDeadline || 0;
      const time = new Date(raw).getTime();
      return Number.isNaN(time) ? Number.MAX_SAFE_INTEGER : time;
    };

    const getRecentValue = (app) => {
      const time = new Date(app?.interviewSchedule?.scheduledAt || app?.appliedAt || 0).getTime();
      return Number.isNaN(time) ? 0 : time;
    };

    if (sortBy === 'salary_highest') {
      list.sort((a, b) => getSalaryValue(b) - getSalaryValue(a));
    } else if (sortBy === 'expiry_soonest') {
      list.sort((a, b) => getExpiryValue(a) - getExpiryValue(b));
    } else {
      list.sort((a, b) => getRecentValue(b) - getRecentValue(a));
    }

    return list;
  }, [applications, query, filterBy, sortBy]);

  const jobOptions = useMemo(() => {
    return [
      { value: 'all', label: 'All Jobs' },
      ...jobs.map((j) => ({
        value: j._id,
        label: j.title || 'Untitled Job',
      })),
    ];
  }, [jobs]);

  const hasActiveFilters = useMemo(() => {
    return query.trim() !== '' || selectedJob !== 'all' || filterBy !== 'all' || sortBy !== 'recent';
  }, [query, selectedJob, filterBy, sortBy]);

  const handleStatusUpdate = async (applicationId, status, extraPayload = {}) => {
    try {
      if (updatingId) return;
      setUpdatingId(applicationId);
      setError('');
      setSuccess('');

      const res = await api.put(`/applications/${applicationId}/status`, { status, ...extraPayload });

      if (res.data?.success) {
        setApplications((prev) => prev.filter((item) => item._id !== applicationId));
        setSuccess(
          status === 'hired'
            ? 'Applicant marked as Hired.'
            : 'Applicant marked as Declined.'
        );
      } else {
        setError('Failed to update application status.');
      }
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || 'Failed to update application status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleConfirmDecline = async () => {
    if (!declineTarget) return;

    const selectedReason = declineReason.trim();
    const comment = declineComment.trim();

    if (!selectedReason) {
      setError('Please select a decline reason before declining the application.');
      return;
    }

    const applicationId = declineTarget._id;
    resetDeclineState();

    await handleStatusUpdate(applicationId, 'declined', {
      declineReason: selectedReason,
      declineComment: comment,
      declinedFrom: 'forInterview',
    });
  };

  const clearFilters = () => {
    setQuery('');
    setSelectedJob('all');
    setFilterBy('all');
    setSortBy('recent');
    setOpenFilterMenu(null);
  };

  const openScheduleModal = (application) => {
    setSelectedApplication(application);
    setModalOpen(true);
  };

  const closeScheduleModal = () => {
    if (savingSchedule) return;
    setModalOpen(false);
    setSelectedApplication(null);
  };

  const handleScheduleSubmit = async (payload) => {
    try {
      setSavingSchedule(true);
      setError('');
      setSuccess('');

      const res = await api.put(`/applications/${payload.applicationId}/interview-schedule`, {
        scheduledAt: payload.scheduledAt,
        meetingType: payload.meetingType,
        interviewerId: payload.interviewerId,
        notes: payload.notes,
      });

      if (res.data?.success) {
        const updatedApplication = res.data.application;

        setApplications((prev) =>
          prev.map((item) => (item._id === updatedApplication._id ? updatedApplication : item))
        );

        setSuccess(updatedApplication?.interviewSchedule?.status === 'rescheduled' ? 'Interview rescheduled and sent to chat successfully.' : 'Interview scheduled and sent to chat successfully.');
        setModalOpen(false);
        setSelectedApplication(null);
      } else {
        setError('Failed to save interview schedule.');
      }
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || 'Failed to save interview schedule.');
    } finally {
      setSavingSchedule(false);
    }
  };

  const inputBase =
  'h-[50px] w-full rounded-xl border border-gray-300 pl-11 pr-10 text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2';

const selectBase =
  'h-[50px] w-full rounded-xl border border-gray-300 px-4 text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2';

  return (
    <EmployerLayout>
      <div className="mx-auto max-w-7xl px-1 py-8">
        <div className="mb-6">
          <h1 className="text-[33px] leading-[40px] font-semibold text-gray-900">For Interview</h1>
          <p className="mt-1 text-sm text-gray-600">
            Applicants selected and scheduled for interview
          </p>
        </div>

        {error && (
          <Alert type="error" onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert type="success" onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        <div className="mb-6 overflow-visible rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="p-5">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
              <div className={hasActiveFilters ? 'lg:col-span-5' : 'lg:col-span-6'}>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-3.5 text-gray-400">
                    <Icon name="search" className="h-5 w-5" />
                  </span>

                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className={inputBase}
                    placeholder="Search applicant, email, job title..."
                    autoComplete="off"
                  />
                </div>
              </div>

              <div className="lg:col-span-3">
                <select
                  value={selectedJob}
                  onChange={(e) => setSelectedJob(e.target.value)}
                  className={selectBase}
                  disabled={jobsLoading}
                >
                  {jobOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="lg:col-span-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setOpenFilterMenu((prev) => (prev === 'filter' ? null : 'filter'))}
                      className="inline-flex h-[50px] w-full items-center justify-between gap-2 whitespace-nowrap rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-900 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2 sm:w-auto"
                    >
                      Filter By
                      <Icon name="chevron-down" className="h-4 w-4" />
                    </button>

                    {openFilterMenu === 'filter' && (
                      <div className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-xl border border-gray-200 bg-white py-2 shadow-lg">
                        {[
                          ['all', 'Overall'],
                          ['today', 'Today'],
                          ['yesterday', 'Yesterday'],
                          ['this_week', 'This Week'],
                          ['last_7_days', 'Last 7 Days'],
                          ['this_month', 'This Month'],
                          ['last_30_days', 'Last 30 Days'],
                          ['this_year', 'This Year'],
                          ['last_year', 'Last Year'],
                        ].map(([value, label]) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => {
                              setFilterBy(value);
                              setOpenFilterMenu(null);
                            }}
                            className={cn(
                              'block w-full px-4 py-2 text-left text-sm hover:bg-gray-50',
                              filterBy === value ? 'font-semibold text-[#1154cc]' : 'text-gray-700'
                            )}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setOpenFilterMenu((prev) => (prev === 'sort' ? null : 'sort'))}
                      className="inline-flex h-[50px] w-full items-center justify-between gap-2 whitespace-nowrap rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-900 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2 sm:w-auto"
                    >
                      Sort By
                      <Icon name="chevron-down" className="h-4 w-4" />
                    </button>

                    {openFilterMenu === 'sort' && (
                      <div className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border border-gray-200 bg-white py-2 shadow-lg">
                        {[
                          ['salary_highest', 'Salary Highest to Lowest'],
                          ['expiry_soonest', 'Expiry Date Soonest to Latest'],
                          ['recent', 'Most Recent Newest to Oldest'],
                        ].map(([value, label]) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => {
                              setSortBy(value);
                              setOpenFilterMenu(null);
                            }}
                            className={cn(
                              'block w-full px-4 py-2 text-left text-sm hover:bg-gray-50',
                              sortBy === value ? 'font-semibold text-[#1154cc]' : 'text-gray-700'
                            )}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {hasActiveFilters && (
                <div className="lg:col-span-1">
                  <Button variant="secondary" className="w-full" onClick={clearFilters}>
                    Clear
                  </Button>
                </div>
              )}
            </div>

            <div className="mt-3 text-xs text-gray-500">
              Showing <span className="font-semibold text-gray-700">{filteredApplications.length}</span> result(s).
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="p-6">
            {loading ? (
              <div className="py-14 text-center" role="status" aria-live="polite">
                <div className="mx-auto inline-block h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-[#2e66a6]" />
                <p className="mt-4 text-sm text-gray-600">Loading interview applicants…</p>
              </div>
            ) : filteredApplications.length === 0 ? (
              <div className="py-14 text-center">
                <h3 className="text-lg font-semibold text-gray-900">No for interview applicants found</h3>
                <p className="mt-2 text-sm text-gray-600">Try changing filters or search.</p>
              </div>
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Applicant
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Job Applied
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Applied Date
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Interview Type / Date & Time
                        </th>
                        <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Interview Applicants
                        </th>
                        <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-200 bg-white">
                      {filteredApplications.map((app) => {
                        const name = buildApplicantName(app.jobseeker);
                        const email = app.jobseeker?.email || '—';
                        const jobTitle = app.job?.title || 'Job Title';
                        const companyName = app.job?.companyName || 'Company';
                        const rowBusy = updatingId === app._id;
                        const interview = getInterviewMeta(app);

                        return (
                          <tr key={app._id} className="hover:bg-gray-50">
                            <td className="px-6 py-5 align-middle">
                              <div className="flex items-center gap-4">
                                <Avatar
                                  img={app.jobseeker?.profileImage}
                                  name={name}
                                  size={48}
                                  altKey={`for_interview_${app._id}`}
                                />
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-semibold text-gray-900">{name}</div>
                                  <div className="truncate text-sm text-gray-600">{email}</div>
                                </div>
                              </div>
                            </td>

                            <td className="px-6 py-5 align-middle">
                              <div className="max-w-[16rem] truncate text-sm font-semibold text-gray-900" title={jobTitle}>
                                {jobTitle}
                              </div>
                              <div className="mt-0.5 text-sm text-gray-600">{companyName}</div>
                            </td>

                            <td className="px-6 py-5 align-middle">
                              <div className="text-sm text-gray-900">{formatDate(app.appliedAt)}</div>
                            </td>

                            <td className="px-6 py-5 align-middle">
                              {interview.scheduledAt ? (
                                <div className="text-sm">
                                  <div className="font-semibold text-gray-900">
                                    {formatDateTime(interview.scheduledAt)}
                                  </div>
                                  <div className="mt-0.5 text-sm text-gray-600">
                                    {interview.meetingType || 'Interview'}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-sm">
                                  <div className="font-semibold text-gray-900">TBS</div>
                                  <div className="mt-0.5 text-sm text-gray-600">( To be scheduled )</div>
                                </div>
                              )}
                            </td>

                            <td className="px-6 py-5 align-middle text-center">
                              <div className="flex justify-center">
                                <Button
                                  variant="softWarning"
                                  className="min-w-[160px] rounded-full leading-tight"
                                  onClick={() => openScheduleModal(app)}
                                  disabled={interviewersLoading}
                                >
                                  <span className="whitespace-pre-line text-center">
                                    {interview.scheduledAt ? 'Reschedule\nInterview' : 'Schedule\nInterview'}
                                  </span>
                                </Button>
                              </div>
                            </td>

                            <td className="px-6 py-5 align-middle">
                              <ActionMenu
                                app={app}
                                name={name}
                                rowBusy={rowBusy}
                                openMenuId={openMenuId}
                                setOpenMenuId={setOpenMenuId}
                                onHire={() => handleStatusUpdate(app._id, 'hired')}
                                onDecline={() => openDeclineModal(app)}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="space-y-3 md:hidden">
                  {filteredApplications.map((app) => {
                    const name = buildApplicantName(app.jobseeker);
                    const email = app.jobseeker?.email || '—';
                    const jobTitle = app.job?.title || 'Job Title';
                    const companyName = app.job?.companyName || 'Company';
                    const interview = getInterviewMeta(app);
                    const rowBusy = updatingId === app._id;

                    return (
                      <div key={app._id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                        <div className="flex items-center gap-3">
                          <Avatar
                            img={app.jobseeker?.profileImage}
                            name={name}
                            size={44}
                            altKey={`for_interview_mobile_${app._id}`}
                          />

                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-gray-900">{name}</div>
                            <div className="truncate text-xs text-gray-600">{email}</div>
                          </div>
                        </div>

                        <div className="mt-3 rounded-xl bg-gray-50 p-3">
                          <div className="text-sm font-semibold text-gray-900">{jobTitle}</div>
                          <div className="text-xs text-gray-600">{companyName}</div>

                          <div className="mt-2 text-xs text-gray-600">
                            Applied: <span className="font-semibold text-gray-800">{formatDate(app.appliedAt)}</span>
                          </div>

                          <div className="mt-1 text-xs text-gray-600">
                            Interview:
                            <span className="ml-1 font-semibold text-gray-800">
                              {interview.scheduledAt ? formatDateTime(interview.scheduledAt) : 'TBS'}
                            </span>
                          </div>

                          <div className="text-xs text-gray-600">
                            Type:
                            <span className="ml-1 font-semibold text-gray-800">
                              {interview.meetingType || '( To be scheduled )'}
                            </span>
                          </div>
                        </div>

                        <div className="mt-3">
                          <Button
                            variant="softWarning"
                            className="w-full rounded-full leading-tight"
                            onClick={() => openScheduleModal(app)}
                            disabled={interviewersLoading}
                          >
                            <span className="whitespace-pre-line text-center">
                              {interview.scheduledAt ? 'Reschedule\nInterview' : 'Schedule\nInterview'}
                            </span>
                          </Button>
                        </div>

                        <div className="mt-3 flex items-center justify-between">
                          <Link
                            to={`/employer/application/${app._id}`}
                            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                          >
                            <Icon name="eye" className="h-5 w-5" />
                          </Link>

                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setOpenMenuId((prev) => (prev === app._id ? null : app._id))}
                              className="inline-flex h-11 w-16 items-center justify-center gap-1 rounded-xl border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                            >
                              <Icon name="dots-vertical" className="h-5 w-5" />
                              <Icon name="chevron-down" className="h-4 w-4" />
                            </button>

                            {openMenuId === app._id && (
                              <div className="absolute right-0 top-14 z-30 w-44 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleStatusUpdate(app._id, 'hired');
                                    setOpenMenuId(null);
                                  }}
                                  disabled={rowBusy}
                                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-[#2e66a6] hover:bg-blue-50 disabled:opacity-60"
                                >
                                  <Icon name="check" className="h-4 w-4" />
                                  Hired
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    openDeclineModal(app);
                                    setOpenMenuId(null);
                                  }}
                                  disabled={rowBusy}
                                  className="flex w-full items-center gap-3 border-t border-gray-100 px-4 py-3 text-left text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
                                >
                                  <Icon name="x" className="h-4 w-4" />
                                  Declined
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <ScheduleInterviewModal
        open={modalOpen}
        onClose={closeScheduleModal}
        application={selectedApplication}
        interviewerOptions={interviewerOptions}
        onSubmit={handleScheduleSubmit}
        submitting={savingSchedule}
      />

      <DeclineReasonModal
        open={declineModalOpen}
        applicantName={declineTarget ? buildApplicantName(declineTarget.jobseeker) : ''}
        selectedReason={declineReason}
        comment={declineComment}
        onReasonChange={setDeclineReason}
        onCommentChange={setDeclineComment}
        onClose={resetDeclineState}
        onConfirm={handleConfirmDecline}
        isSubmitting={!!updatingId}
      />
    </EmployerLayout>
  );
};

export default ForInterview;