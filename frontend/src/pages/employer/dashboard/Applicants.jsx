import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import EmployerLayout from '../../../layouts/EmployerLayout';

/* =======================
   Small UI helpers
======================= */
const Icon = ({ name, className = 'h-5 w-5', ...props }) => {
  const common = { className, fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24', ...props };
  switch (name) {
    case 'search':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.3-4.3m1.3-5.2a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      );
    case 'refresh':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v6h6M20 20v-6h-6" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 9A8 8 0 006.3 5.3L4 10M4 15a8 8 0 0013.7 3.7L20 14" />
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
    case 'star':
      return (
        <svg {...common}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l2.07 6.37a1 1 0 00.95.69h6.699c.969 0 1.371 1.24.588 1.81l-5.42 3.94a1 1 0 00-.364 1.118l2.07 6.37c.3.921-.755 1.688-1.538 1.118l-5.42-3.94a1 1 0 00-1.176 0l-5.42 3.94c-.783.57-1.838-.197-1.538-1.118l2.07-6.37a1 1 0 00-.364-1.118l-5.42-3.94c-.783-.57-.38-1.81.588-1.81h6.699a1 1 0 00.95-.69l2.07-6.37z"
          />
        </svg>
      );
    case 'chevron-down':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      );
    case 'more-vertical':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
        </svg>
      );
    case 'mail':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6h16v12H4z M4 7l8 6 8-6" />
        </svg>
      );
    case 'phone':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 4h4l2 5-3 2a16 16 0 007 7l2-3 5 2v4a2 2 0 01-2 2C10 23 1 14 1 4a2 2 0 012-2h2z" />
        </svg>
      );
    case 'calendar':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3M5 11h14M6 5h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2z" />
        </svg>
      );
    case 'arrow':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 12h14m-5-5 5 5-5 5" />
        </svg>
      );
    case 'sparkle':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 3l1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2L12 3z M5 14l.8 2.2L8 17l-2.2.8L5 20l-.8-2.2L2 17l2.2-.8L5 14z" />
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
    default:
      return null;
  }
};

const cn = (...classes) => classes.filter(Boolean).join(' ');

const Button = ({
  variant = 'secondary',
  size = 'md',
  leftIcon,
  children,
  className,
  disabled,
  ...props
}) => {
  const base =
    'inline-flex items-center justify-center gap-2 font-semibold leading-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-80 disabled:cursor-not-allowed';
  const sizes = {
    sm: 'h-10 px-3 text-sm rounded-lg',
    md: 'h-12 px-4 text-sm rounded-xl',
    xs: 'h-9 px-2 text-xs rounded-lg',
  };

  const variants = {
    secondary:
      'border border-gray-200 bg-white text-gray-900 hover:bg-gray-50 focus-visible:ring-[#2e66a6]',
    primary:
      'bg-[#2e66a6] text-white hover:bg-[#23508a] focus-visible:ring-[#2e66a6]',
    neutral:
      'border border-gray-300 bg-gray-50 text-gray-900 hover:bg-gray-100 focus-visible:ring-[#2e66a6]',
    dangerSoft:
      'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 focus-visible:ring-red-600',
    ghost:
      'bg-transparent text-gray-900 hover:bg-gray-100 focus-visible:ring-[#2e66a6]',
  };

  return (
    <button
      type="button"
      className={cn(base, sizes[size], variants[variant], className)}
      disabled={disabled}
      {...props}
    >
      {leftIcon}
      {children}
    </button>
  );
};

// ======================= ACCESSIBLE DROPDOWN COMPONENT =======================
const AccessibleDropdown = ({
  trigger,
  children,
  align = 'right',
  width = 'w-48'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const firstFocusable = dropdownRef.current.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (firstFocusable) {
        setTimeout(() => firstFocusable.focus(), 0);
      }
    }
  }, [isOpen]);

  const alignClasses = {
    left: 'left-0',
    right: 'right-0',
    center: 'left-1/2 transform -translate-x-1/2'
  };

  return (
    <div className="relative inline-block w-full">
      <div
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
          if (e.key === 'ArrowDown' && !isOpen) {
            setIsOpen(true);
          }
        }}
        role="button"
        tabIndex={0}
        aria-haspopup="true"
        aria-expanded={isOpen}
        className="inline-block w-full"
      >
        {trigger}
      </div>

      {isOpen && (
        <div
          ref={dropdownRef}
          className={`absolute ${alignClasses[align]} mt-1 ${width} z-50 bg-white rounded-lg shadow-lg border border-gray-200 py-1 focus:outline-none`}
          role="menu"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setIsOpen(false);
              triggerRef.current?.focus();
            }
            if (e.key === 'Tab' && !e.shiftKey) {
              const focusableElements = dropdownRef.current.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
              );
              if (e.target === focusableElements[focusableElements.length - 1]) {
                setIsOpen(false);
              }
            }
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
};

const DropdownItem = ({
  children,
  onClick,
  icon,
  variant = 'default',
  disabled = false
}) => {
  const variants = {
    default: 'text-gray-700 hover:bg-gray-50',
    danger: 'text-red-600 hover:bg-red-50',
    warning: 'text-amber-600 hover:bg-amber-50',
    success: 'text-[#2e66a6] hover:bg-blue-50'
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-2 px-4 py-2 text-sm w-full text-left disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:bg-gray-50 ${variants[variant]}`}
      role="menuitem"
      tabIndex={0}
    >
      {icon && <span className="w-4 h-4">{icon}</span>}
      {children}
    </button>
  );
};

const Alert = ({ type = 'error', children, onClose }) => {
  const isError = type === 'error';
  const styles = isError
    ? 'border-red-200 bg-red-50 text-red-900'
    : 'border-blue-200 bg-blue-50 text-[#2e66a6]';
  const ring = isError ? 'focus-visible:ring-red-600' : 'focus-visible:ring-[#2e66a6]';

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

const Modal = ({
  open,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onClose,
  danger = false,
}) => {
  const confirmRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => confirmRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full max-w-md rounded-2xl bg-white shadow-xl border border-gray-200"
      >
        <div className="p-6">
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          {description && <p className="mt-2 text-sm text-gray-600">{description}</p>}
        </div>
        <div className="flex items-center justify-end gap-2 px-6 pb-6">
          <Button variant="secondary" size="sm" onClick={onClose}>
            {cancelText}
          </Button>
          <Button
            variant={danger ? 'dangerSoft' : 'primary'}
            size="sm"
            onClick={onConfirm}
            ref={confirmRef}
          >
            {confirmText}
          </Button>
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

  const reasons = [
    'Did not meet minimum qualifications',
    'Insufficient relevant experience',
    'Skills not aligned with job requirements',
    'Incomplete application information',
    'Unavailable for required work schedule',
    'Does not meet screening criteria',
  ];

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
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 py-6">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => {
          if (!isSubmitting) onClose?.();
        }}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="decline-reason-title"
        className="relative w-full max-w-4xl rounded-[28px] border border-gray-200 bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-5 sm:px-8">
          <div>
            <h2 id="decline-reason-title" className="text-2xl font-bold text-gray-900">
              Do you want to decline this application?
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
              Please choose one of the following reasons or leave an additional comment so the applicant receives feedback.
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

        <div className="px-6 py-6 sm:px-8">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {reasons.map((reason) => {
              const isSelected = selectedReason === reason;

              return (
                <button
                  key={reason}
                  type="button"
                  onClick={() => onReasonChange(reason)}
                  disabled={isSubmitting}
                  className={cn(
                    'min-h-[78px] rounded-2xl border px-4 py-4 text-center text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60',
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

          <div className="mt-6">
            <label htmlFor="decline-comment" className="sr-only">
              Leave a comment for the applicant
            </label>
            <textarea
              id="decline-comment"
              value={comment}
              onChange={(e) => onCommentChange(e.target.value)}
              disabled={isSubmitting}
              rows={5}
              placeholder="Leave a comment for the applicant..."
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-60"
            />
          </div>

          {!selectedReason && (
            <div className="mt-3 text-sm font-medium text-red-600">
              Please select a decline reason before continuing.
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-5 sm:px-8">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="dangerSoft"
            size="sm"
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

const getStatusPill = (status) => {
  switch (status) {
    case 'pending':
      return 'border border-[#f1d37a] bg-[#fff7df] text-[#b36b00]';
    case 'for interview':
      return 'bg-gray-100 text-gray-800 border border-gray-300';
    case 'hired':
      return 'bg-green-50 text-green-800 border border-green-200';
    case 'declined':
      return 'bg-red-50 text-red-800 border border-red-200';
    case 'vacancy full':
      return 'bg-orange-50 text-orange-800 border border-orange-200';
    default:
      return 'bg-gray-100 text-gray-800 border border-gray-200';
  }
};

const prettyStatus = (s = '') => {
  if (!s) return '—';
  return s
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const getStatusDisplayLabel = (status = '') => {
  if (!status) return '—';
  if (status.toLowerCase() === 'pending') return 'Review Application';
  return prettyStatus(status);
};

// ✅ FIX: accept string OR Date object
const formatDate = (dateValue) => {
  if (!dateValue) return '—';
  const d = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
};

// Debounce hook
const useDebouncedValue = (value, delay = 250) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
};

/* =======================
   Page
======================= */
const Applicants = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { jobId } = useParams();

  // ✅ API base (same pattern with EmployerMessages.jsx)
  const API_BASE = (process.env.REACT_APP_API_URL || 'https://phinmaau-job-portal-atlas.onrender.com/api').replace(/\/api\/?$/, '');

  // ✅ track broken avatars so we can fallback to initials
  const [brokenAvatars, setBrokenAvatars] = useState(() => new Set());

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

  const Avatar = useCallback(
    ({ img, name, size = 48, altKey }) => {
      const initial = (name?.trim()?.[0] || 'U').toUpperCase();
      const src = img ? getImageUrl(img) : '';
      const isBroken = brokenAvatars.has(String(altKey));

      const boxStyle = { height: `${size}px`, width: `${size}px` };

      return (
        <div
          className="flex items-center justify-center rounded-full border border-gray-200 bg-gray-100 overflow-hidden shrink-0"
          style={boxStyle}
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
    },
    [brokenAvatars, getImageUrl, markBroken]
  );

  const [jobs, setJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(true);

  const [allApplications, setAllApplications] = useState([]);
  const [appsLoading, setAppsLoading] = useState(true);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [selectedJob, setSelectedJob] = useState(jobId || 'all');
  const [statusFilter, setStatusFilter] = useState('pending');

  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, 250);

  const [filterBy, setFilterBy] = useState('all');
  const [sortBy, setSortBy] = useState('most_recent');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  const [updatingId, setUpdatingId] = useState(null);

  // Reject confirm modal state
  const [rejectTarget, setRejectTarget] = useState(null); // { id, name } | null
  const [declineReason, setDeclineReason] = useState('');
  const [declineComment, setDeclineComment] = useState('');

  const isLoading = jobsLoading || appsLoading;
  const isBusy = !!updatingId;

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  // ✅ NEW: Build applicant name like ApplicationDetails.jsx
  const buildApplicantName = useCallback((u) => {
    const full = (u?.fullName || '').trim();
    if (full) return full;

    const parts = [u?.firstName, u?.middleName, u?.lastName]
      .map((p) => (p || '').trim())
      .filter(Boolean);

    if (parts.length) return parts.join(' ');

    const email = (u?.email || '').trim();
    if (email && email.includes('@')) return email.split('@')[0];

    return 'Applicant';
  }, []);

  // keep selected job from route
  useEffect(() => {
    if (jobId) setSelectedJob(jobId);
  }, [jobId]);

  // always keep this page on pending-only mode
  useEffect(() => {
    setStatusFilter('pending');
  }, [location.search]);

  // auto-clear success
  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(''), 2200);
    return () => clearTimeout(t);
  }, [success]);

  const syncStatusToURL = (value) => {
    setStatusFilter(value);

    const params = new URLSearchParams(location.search);
    if (value === 'all') params.delete('status');
    else params.set('status', value);

    navigate(
      { pathname: location.pathname, search: params.toString() ? `?${params.toString()}` : '' },
      { replace: true }
    );
  };

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
  };

  const handleAuthError = () => {
    localStorage.removeItem('token');
    navigate('/employer/login');
  };

  const resetDeclineModal = () => {
    setRejectTarget(null);
    setDeclineReason('');
    setDeclineComment('');
  };

  const openDeclineModal = (target) => {
    clearMessages();
    setRejectTarget(target);
    setDeclineReason('');
    setDeclineComment('');
  };

  const fetchJobs = useCallback(async () => {
    try {
      setJobsLoading(true);
      const res = await axios.get('https://phinmaau-job-portal-atlas.onrender.com/api/jobs/employer/my-jobs', {
        headers: getAuthHeaders(),
      });
      if (res.data?.success) setJobs(res.data.jobs || []);
      else setJobs([]);
    } catch (err) {
      console.error(err);
      if (err.response?.status === 401) return handleAuthError();
      setError('Failed to load jobs.');
      setJobs([]);
    } finally {
      setJobsLoading(false);
    }
  }, [navigate]);

  const fetchApplications = useCallback(async () => {
    try {
      setAppsLoading(true);
      clearMessages();

      let url = 'https://phinmaau-job-portal-atlas.onrender.com/api/applications/employer/all';
      if (selectedJob !== 'all') url = `https://phinmaau-job-portal-atlas.onrender.com/api/applications/job/${selectedJob}`;

      const res = await axios.get(url, { headers: getAuthHeaders() });

      if (res.data?.success) setAllApplications(res.data.applications || []);
      else setAllApplications([]);
    } catch (err) {
      console.error(err);
      if (err.response?.status === 401) return handleAuthError();
      if (err.response?.status === 404) {
        setAllApplications([]);
        return;
      }
      setError('Failed to load applications. Please try again.');
      setAllApplications([]);
    } finally {
      setAppsLoading(false);
    }
  }, [selectedJob, navigate]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  useEffect(() => {
    if (!jobsLoading) fetchApplications();
  }, [jobsLoading, selectedJob, fetchApplications]);

  const summary = useMemo(() => {
    const total = allApplications.length;
    const pending = allApplications.filter((a) => a.status === 'pending').length;
    const forInterview = allApplications.filter((a) => a.status === 'for interview').length;
    const hired = allApplications.filter((a) => a.status === 'hired').length;
    const declined = allApplications.filter((a) => a.status === 'declined').length;
    const vacancyFull = allApplications.filter((a) => a.status === 'vacancy full').length;
    return { total, pending, forInterview, hired, declined, vacancyFull };
  }, [allApplications]);

  const jobOptions = useMemo(() => {
    return [
      { value: 'all', label: 'All jobs' },
      ...jobs.map((j) => ({
        value: j._id,
        label: `${j.title || '(Untitled)'} (${j.applicationCount || 0})`,
      })),
    ];
  }, [jobs]);

  const filteredApplications = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();

    const pendingOnly = allApplications.filter(
      (a) => (a.status || '').toLowerCase() === 'pending'
    );

    const statusFiltered = pendingOnly.filter((a) => !a.alreadyEmployed);

    const searched = !q
      ? statusFiltered
      : statusFiltered.filter((a) => {
          const u = a.jobseeker || {};
          const name = buildApplicantName(u).toLowerCase();
          const email = (u.email || '').toLowerCase();
          const jobTitle = (a.job?.title || '').toLowerCase();
          const company = (a.job?.companyName || '').toLowerCase();
          const loc = (a.job?.location || '').toLowerCase();
          return [name, email, jobTitle, company, loc].some((t) => t.includes(q));
        });

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
    const thirtyDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const startOfNextYear = new Date(now.getFullYear() + 1, 0, 1);
    const startOfLastYear = new Date(now.getFullYear() - 1, 0, 1);
    const startOfThisYear = new Date(now.getFullYear(), 0, 1);

    const filteredBySort = searched.filter((a) => {
      if (filterBy === 'all') return true;

      const appliedDate = new Date(a.appliedAt || 0);
      if (Number.isNaN(appliedDate.getTime())) return false;

      if (filterBy === 'today') {
        return appliedDate >= startOfToday && appliedDate < startOfTomorrow;
      }

      if (filterBy === 'yesterday') {
        return appliedDate >= startOfYesterday && appliedDate < startOfToday;
      }

      if (filterBy === 'this_week') {
        return appliedDate >= startOfWeek && appliedDate < startOfNextWeek;
      }

      if (filterBy === 'last_7_days') {
        return appliedDate >= sevenDaysAgo && appliedDate < startOfTomorrow;
      }

      if (filterBy === 'this_month') {
        return appliedDate >= startOfMonth && appliedDate < startOfNextMonth;
      }

      if (filterBy === 'last_30_days') {
        return appliedDate >= thirtyDaysAgo && appliedDate < startOfTomorrow;
      }

      if (filterBy === 'this_year') {
        return appliedDate >= startOfYear && appliedDate < startOfNextYear;
      }

      if (filterBy === 'last_year') {
        return appliedDate >= startOfLastYear && appliedDate < startOfThisYear;
      }

      return true;
    });

    const getSalaryValue = (app) => {
      const job = app.job || {};
      const salaryFields = [
        job.salary,
        job.salaryMax,
        job.maxSalary,
        job.maximumSalary,
        job.salary_max,
        job.salaryRange,
        job.monthlySalary,
      ];

      const numbers = salaryFields
        .flatMap((value) => String(value || '').match(/\d+(?:,\d{3})*(?:\.\d+)?/g) || [])
        .map((value) => Number(value.replace(/,/g, '')))
        .filter((value) => !Number.isNaN(value));

      return numbers.length ? Math.max(...numbers) : 0;
    };

    const getExpiryDate = (app) => {
      const job = app.job || {};
      const rawExpiry = job.expiryDate || job.expiresAt || job.deadline || job.applicationDeadline || job.expirationDate || job.closingDate;
      const expiryTime = new Date(rawExpiry || 0).getTime();
      return Number.isNaN(expiryTime) || expiryTime === 0 ? Number.MAX_SAFE_INTEGER : expiryTime;
    };

    const sorted = [...filteredBySort].sort((a, b) => {
      if (sortBy === 'salary_high_to_low') {
        return getSalaryValue(b) - getSalaryValue(a);
      }

      if (sortBy === 'expiry_soonest') {
        return getExpiryDate(a) - getExpiryDate(b);
      }

      const da = new Date(a.appliedAt || 0).getTime();
      const db = new Date(b.appliedAt || 0).getTime();
      return db - da;
    });

    return sorted;
  }, [allApplications, buildApplicantName, debouncedQuery, filterBy, sortBy, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredApplications.length / itemsPerPage));
  const paginatedApplications = useMemo(
    () => filteredApplications.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage),
    [filteredApplications, currentPage]
  );
  const firstShown = filteredApplications.length ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const lastShown = Math.min(currentPage * itemsPerPage, filteredApplications.length);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedQuery, filterBy, selectedJob]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const hasActiveFilters = useMemo(() => {
    return (
      query.trim() !== '' ||
      filterBy !== 'all' ||
      sortBy !== 'most_recent' ||
      selectedJob !== 'all'
    );
  }, [query, filterBy, sortBy, selectedJob]);

  const handleStatusUpdate = async (applicationId, newStatus, extraPayload = {}) => {
    try {
      if (isBusy) return;
      setUpdatingId(applicationId);
      clearMessages();

      const payload = { status: newStatus, ...extraPayload };

      const res = await axios.put(
        `https://phinmaau-job-portal-atlas.onrender.com/api/applications/${applicationId}/status`,
        payload,
        { headers: getAuthHeaders() }
      );

      if (res.data?.success) {
        setAllApplications((prev) =>
          prev.map((app) =>
            app._id === applicationId
              ? {
                  ...app,
                  status: res.data.application?.status || newStatus,
                  reviewedAt: res.data.application?.reviewedAt || new Date(),
                  declineReason: res.data.application?.declineReason || app.declineReason || '',
                  declineComment: res.data.application?.declineComment || '',
                  declinedFrom: res.data.application?.declinedFrom || '',
                }
              : app
          )
        );

        if (res.data?.vacancy?.isFull) {
          await fetchApplications();
          await fetchJobs();
          setSuccess(`Applicant marked as Hired. The job post is now Filled because the vacancy is already full.`);
        } else if (newStatus === 'for interview') {
          setSuccess(` Applicant moved to For Interview! Messaging is now enabled.`);
        } else if (newStatus === 'hired') {
          setSuccess(` Applicant marked as Hired! Messaging remains enabled.`);
        } else if (newStatus === 'declined') {
          setSuccess(`Application marked as Declined with feedback saved.`);
        } else {
          setSuccess(`Application marked as ${prettyStatus(newStatus)}.`);
        }
      } else {
        setError('Failed to update application status.');
      }
    } catch (err) {
      console.error(err);
      if (err.response?.status === 401) return handleAuthError();
      setError(err.response?.data?.message || 'Failed to update application status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleConfirmDecline = async () => {
    if (!rejectTarget) return;

    const reason = declineReason.trim();
    const comment = declineComment.trim();

    if (!reason) {
      setError('Please select a decline reason before declining the application.');
      return;
    }

    const { id } = rejectTarget;
    resetDeclineModal();

    await handleStatusUpdate(id, 'declined', {
      declineReason: reason,
      declineComment: comment,
      declinedFrom: 'applicants',
    });
  };

  const tabs = useMemo(
    () => [
      { key: 'all', label: 'All', count: summary.total },
      { key: 'pending', label: 'Pending', count: summary.pending },
      { key: 'for interview', label: 'For Interview', count: summary.forInterview },
      { key: 'hired', label: 'Hired', count: summary.hired },
      { key: 'declined', label: 'Declined', count: summary.declined },
      { key: 'vacancy full', label: 'Vacancy Full', count: summary.vacancyFull },
    ],
    [summary]
  );


  const filterOptions = [
    { value: 'all', label: 'Overall' },
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'this_week', label: 'This Week' },
    { value: 'last_7_days', label: 'Last 7 Days' },
    { value: 'this_month', label: 'This Month' },
    { value: 'last_30_days', label: 'Last 30 Days' },
    { value: 'this_year', label: 'This Year' },
    { value: 'last_year', label: 'Last Year' },
  ];

  const sortOptions = [
    { value: 'salary_high_to_low', label: 'Salary Highest to Lowest' },
    { value: 'expiry_soonest', label: 'Expiry Date Soonest to Latest' },
    { value: 'most_recent', label: 'Most Recent Newest to Oldest' },
  ];

  const clearFilters = () => {
    setQuery('');
    setFilterBy('all');
    setSortBy('most_recent');
    setSelectedJob('all');
    syncStatusToURL('pending');
    setCurrentPage(1);
  };

  const selectBase =
    'h-12 w-full rounded-xl border border-gray-300 px-4 text-sm font-medium text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2 disabled:bg-gray-50 disabled:opacity-60';
  const inputBase =
    'h-12 w-full rounded-xl border border-gray-300 pl-11 pr-10 text-sm font-medium text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2 disabled:bg-gray-50 disabled:opacity-60';

  return (
    <EmployerLayout>
      <div className="mx-auto max-w-7xl px-1 py-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-[33px] leading-[40px] font-semibold text-gray-900">Applicants</h1>
            <p className="mt-1 text-sm text-gray-600">Manage and review job applications</p>
          </div>
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

        {/* Filters Bar */}
        <div className="relative z-20 mb-8 overflow-visible rounded-3xl border border-[#e3e5ef] bg-white p-5 shadow-sm">
          <div
            className={
              hasActiveFilters
                ? 'grid gap-3 lg:grid-cols-[1.45fr_0.8fr_0.9fr_auto]'
                : 'grid gap-3 lg:grid-cols-[1.45fr_0.8fr_0.9fr]'
            }
          >
            <div className="relative">
              <Icon name="search" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                id="applicantSearch"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search applicant name, email..."
                className="h-12 w-full rounded-xl border border-gray-200 bg-white pl-12 pr-10 text-sm text-gray-900 outline-none focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/20"
                disabled={isLoading}
                autoComplete="off"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setCurrentPage(1);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-gray-500 hover:bg-gray-100"
                  aria-label="Clear search"
                >
                  <Icon name="x" className="h-4 w-4" />
                </button>
              )}
            </div>

            <select
              value="pending"
              disabled
              className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-900 opacity-100"
              aria-label="Application status"
            >
              <option value="pending">Pending Applicants</option>
            </select>

            <div className="relative">
              <Icon name="calendar" className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
              <select
                value={filterBy}
                onChange={(event) => {
                  setFilterBy(event.target.value);
                  setCurrentPage(1);
                }}
                className="h-12 w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 pr-12 text-sm font-medium text-gray-900 outline-none focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/20"
                disabled={isLoading}
                aria-label="Filter applicants by date"
              >
                {filterOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label === 'Overall' ? 'All Time' : option.label}
                  </option>
                ))}
              </select>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex h-12 items-center justify-center whitespace-nowrap rounded-xl border border-gray-200 bg-white px-5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Clear All
              </button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="rounded-3xl border border-[#e3e5ef] bg-white p-12 text-center text-[#6b7280] shadow-sm">
            Loading applicants...
          </div>
        ) : paginatedApplications.length ? (
          <>
            <div className="space-y-5">
              {paginatedApplications.map((app) => {
                const user = app.jobseeker || {};
                const profile = user.jobSeekerProfile || {};
                const name = buildApplicantName(user);
                const email = user.email || 'Not provided';
                const phone = profile.phoneNumber || profile.contactNumber || 'Not provided';
                const level = profile.jobSeekerLevel || profile.level || 'Intermediate';
                const matchValue = Number(
                  app.matchScore ??
                  app.matchPercentage ??
                  app.compatibilityScore ??
                  0
                );
                const matchScore = Number.isFinite(matchValue)
                  ? Math.max(0, Math.min(100, Math.round(matchValue)))
                  : 0;

                return (
                  <article
                    key={app._id}
                    className="rounded-3xl border border-[#e3e5ef] bg-white p-6 shadow-sm"
                  >
                    <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                      <div className="flex min-w-0 items-center gap-5">
                        <Avatar
                          img={user.profileImage}
                          name={name}
                          size={80}
                          altKey={`pending_applicant_${app._id}`}
                        />

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-3">
                            <h2 className="text-xl font-bold text-[#111827]">{name}</h2>
                            {app.alreadyEmployed && (
                              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                                Already Employed
                              </span>
                            )}
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[#7b8190]">
                            <span className="inline-flex items-center gap-1.5">
                              <Icon name="mail" className="h-4 w-4" />
                              {email}
                            </span>
                            <span className="hidden text-[#c2c5ce] sm:inline">|</span>
                            <span className="inline-flex items-center gap-1.5">
                              <Icon name="phone" className="h-4 w-4" />
                              {phone}
                            </span>
                          </div>

                          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                            <span className="rounded-full bg-[#e8edff] px-3 py-1 text-xs font-semibold text-[#2e66a6]">
                              ★ {level}
                            </span>
                            <span className="inline-flex items-center gap-1.5 text-[#7b8190]">
                              <Icon name="calendar" className="h-4 w-4" />
                              Applied {formatDate(app.appliedAt || app.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-row items-center gap-3 md:flex-col md:items-stretch">
                        <div className="inline-flex items-center justify-center gap-2 rounded-full bg-[#eaf0ff] px-5 py-2 text-sm font-bold text-[#2e66a6]">
                          <Icon name="sparkle" className="h-4 w-4" />
                          {matchScore}% match
                        </div>

                        <button
                          type="button"
                          onClick={() => navigate(`/employer/application/${app._id}?from=applicants`)}
                          className="inline-flex items-center justify-center gap-2 rounded-full bg-[#2e66a6] px-6 py-2.5 text-sm font-bold text-white shadow-md hover:bg-[#25578f]"
                        >
                          View profile
                          <Icon name="arrow" className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-[#e3e5ef] bg-white px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-gray-500">
                Showing {firstShown} to {lastShown} of {filteredApplications.length} pending applicants
              </p>

              <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  className="inline-flex h-9 items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Icon name="chevron-left" className="h-4 w-4" />
                  Previous
                </button>

                <div className="inline-flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
                    <button
                      key={pageNumber}
                      type="button"
                      onClick={() => setCurrentPage(pageNumber)}
                      className={cn(
                        'inline-flex h-9 min-w-[36px] items-center justify-center rounded-lg border px-3 text-sm font-semibold transition',
                        pageNumber === currentPage
                          ? 'border-[#2e66a6] bg-[#2e66a6] text-white'
                          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                      )}
                    >
                      {pageNumber}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  className="inline-flex h-9 items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                  <Icon name="chevron-right" className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-3xl border border-[#e3e5ef] bg-white p-12 text-center shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900">No pending applicants found</h3>
            <p className="mt-2 text-sm text-gray-600">Try changing the search or date filter.</p>
          </div>
        )}

        <DeclineReasonModal
          open={!!rejectTarget}
          applicantName={rejectTarget?.name || ''}
          selectedReason={declineReason}
          comment={declineComment}
          onReasonChange={setDeclineReason}
          onCommentChange={setDeclineComment}
          onClose={resetDeclineModal}
          onConfirm={handleConfirmDecline}
          isSubmitting={!!updatingId}
        />

        <Modal
          open={false}
          title="Decline application?"
          description=""
          confirmText="Decline"
          cancelText="Cancel"
          danger
          onClose={() => {}}
          onConfirm={() => {}}
        />
      </div>
    </EmployerLayout>
  );
};

export default Applicants;