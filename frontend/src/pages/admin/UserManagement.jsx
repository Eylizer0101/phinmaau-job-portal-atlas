import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import AdminLayout from '../../layouts/AdminLayout';
import Pagination from '../../components/shared/Pagination';

const cn = (...classes) => classes.filter(Boolean).join(' ');

const API_BASE_URL = (process.env.REACT_APP_API_URL || 'https://phinmaau-job-portal-atlas.onrender.com/api').replace(/\/api\/?$/, '');

const resolveMediaUrl = (url) => {
  const raw = String(url || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw) || /^data:/i.test(raw) || /^blob:/i.test(raw)) return raw;
  if (raw.startsWith('/uploads')) return `${API_BASE_URL}${raw}`;
  if (raw.startsWith('uploads/')) return `${API_BASE_URL}/${raw}`;
  return raw;
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
    <div className="relative inline-block">
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
        className="inline-block"
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
    success: 'text-[#2e66a6] hover:bg-[#2e66a6]/10'
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

// ======================= ENHANCED UI COMPONENTS =======================
const Icon = ({ name, className = 'h-5 w-5', ...props }) => {
  const common = {
    className,
    fill: 'none',
    stroke: 'currentColor',
    viewBox: '0 0 24 24',
    strokeWidth: 2,
    ...props
  };

  const icons = {
    search: <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.3-4.3m1.3-5.2a7 7 0 11-14 0 7 7 0 0114 0z" />,
    refresh: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v6h6M20 20v-6h-6" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 9A8 8 0 006.3 5.3L4 10M4 15a8 8 0 0013.7 3.7L20 14" />
      </>
    ),
    eye: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </>
    ),
    check: <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />,
    x: <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />,
    mail: <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />,
    lock: <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />,
    download: <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
    filter: <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />,
    user: <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />,
    building: <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />,
    shield: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />,
    calendar: <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />,
    clock: <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />,
    chevronDown: <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />,
    chevronUp: <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />,
    chevronLeft: <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />,
    chevronRight: <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />,
    edit: <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />,
    trash: <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />,
    users: <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-2.5a4 4 0 11-8 0 4 4 0 018 0z" />,
    moreVertical: <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />,
    info: <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h1m0-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
    export: <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  };

  return (
    <svg {...common} aria-hidden="true">
      {icons[name] || null}
    </svg>
  );
};

const SummaryCard = ({ label, value, image }) => (
  <div className="relative rounded-2xl overflow-hidden group">
    <div className="pointer-events-none absolute inset-0 z-0">
      <div
        className="absolute w-[70px] h-[70px] rounded-full blur-[35px] top-[38%] right-[22%] transition-all duration-700 ease-out
        group-hover:scale-110 group-hover:blur-[45px] group-hover:opacity-80"
        style={{
          background:
            'radial-gradient(circle, rgba(46,102,166,0.25) 0%, rgba(46,102,166,0.14) 45%, transparent 75%)'
        }}
      />
    </div>

    <div
      className="relative z-10 h-full p-6 rounded-2xl overflow-hidden text-white
      bg-gradient-to-br from-[#072258] via-[#2d63a0] to-[#52b2db]
      shadow-[0_10px_24px_rgba(46,102,166,0.18)] transition-all duration-300 ease-out
      group-hover:shadow-[0_16px_34px_rgba(46,102,166,0.24)] group-hover:-translate-y-0.5 group-active:scale-[0.99]
      group-hover:brightness-[1.03] min-h-[118px]"
    >
      {image ? (
        <img
          src={image}
          alt=""
          className="pointer-events-none absolute right-[-18px] top-1/2 -translate-y-1/2 w-20 h-20 md:w-22 md:h-22 object-contain opacity-50 mix-blend-soft-light saturate-150
          transition-all duration-700 ease-out group-hover:opacity-50 group-hover:saturate-180 group-hover:scale-105 group-hover:right-[-15px]"
          style={{
            WebkitMaskImage:
              'radial-gradient(circle at 35% 50%, rgba(0,0,0,1) 0%, rgba(0,0,0,0.6) 55%, rgba(0,0,0,0) 80%)',
            maskImage:
              'radial-gradient(circle at 35% 50%, rgba(0,0,0,1) 0%, rgba(0,0,0,0.6) 55%, rgba(0,0,0,0) 80%)'
          }}
        />
      ) : null}

      <div className="relative z-10">
        <p className="text-3xl font-semibold leading-none transition-all duration-400 ease-out group-hover:text-[32px]">
          {Number(value || 0).toLocaleString()}
        </p>

        <div className="flex items-center justify-between mt-2 gap-2">
          <p className="text-sm text-white/90 flex items-center gap-1 transition-all duration-400 group-hover:text-white whitespace-nowrap">
            <span className="whitespace-nowrap">{label}</span>
          </p>
        </div>
      </div>

      <div className="absolute inset-0 bg-gradient-to-t from-transparent to-transparent opacity-0 group-hover:opacity-5 group-hover:to-white/10 transition-all duration-500 ease-out" />
    </div>

    <div className="absolute inset-0 rounded-2xl border-2 border-transparent group-hover:border-white/20 transition-all duration-500 ease-out pointer-events-none" />
  </div>
);

const Button = ({
  variant = 'secondary',
  size = 'md',
  leftIcon,
  rightIcon,
  children,
  className,
  disabled,
  loading,
  fullWidth = false,
  ...props
}) => {
  const base = 'inline-flex items-center justify-center gap-2 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200';

  const sizes = {
    xs: 'px-2.5 py-1.5 text-xs rounded-lg',
    sm: 'px-3 py-2 text-sm rounded-lg',
    md: 'px-4 py-2.5 text-sm rounded-xl',
    lg: 'px-5 py-3 text-base rounded-xl'
  };

  const variants = {
    secondary: 'border border-gray-200 bg-white text-gray-900 hover:bg-gray-50 focus-visible:ring-[#2e66a6] shadow-sm',
    primary: 'bg-[#2e66a6] text-white hover:bg-[#255487] focus-visible:ring-[#2e66a6] shadow-sm',
    neutral: 'border border-gray-300 bg-gray-50 text-gray-900 hover:bg-gray-100 focus-visible:ring-[#2e66a6] shadow-sm',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600 shadow-sm',
    dangerSoft: 'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 focus-visible:ring-red-600',
    warning: 'bg-amber-500 text-white hover:bg-amber-600 focus-visible:ring-amber-600 shadow-sm',
    ghost: 'bg-transparent text-gray-900 hover:bg-gray-100 focus-visible:ring-[#2e66a6]',
    success: 'bg-[#2e66a6] text-white hover:bg-[#2e66a6] focus-visible:ring-[#2e66a6] shadow-sm'
  };

  return (
    <button
      type="button"
      className={cn(
        base,
        sizes[size],
        variants[variant],
        fullWidth && 'w-full',
        loading && 'opacity-70 cursor-wait',
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg
          className="h-4 w-4 animate-spin"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {!loading && leftIcon}
      <span className={cn(loading && 'opacity-0', 'whitespace-nowrap')}>
        {children}
      </span>
      {!loading && rightIcon}
    </button>
  );
};

const Alert = ({
  type = 'error',
  title,
  children,
  onClose,
  autoDismiss = 5000
}) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (autoDismiss) {
      const timer = setTimeout(() => {
        setVisible(false);
        if (onClose) onClose();
      }, autoDismiss);
      return () => clearTimeout(timer);
    }
  }, [autoDismiss, onClose]);

  if (!visible) return null;

  const styles = {
    error: 'border-red-200 bg-red-50 text-red-900',
    success: 'border-[#2e66a6]/20 bg-[#2e66a6]/10 text-blue-900',
    warning: 'border-amber-200 bg-amber-50 text-amber-900',
    info: 'border-[#2e66a6]/20 bg-[#2e66a6]/10 text-blue-900'
  };

  const icons = {
    error: <Icon name="x" className="h-5 w-5 text-red-500" />,
    success: <Icon name="check" className="h-5 w-5 text-blue-500" />,
    warning: <Icon name="lock" className="h-5 w-5 text-amber-500" />,
    info: <Icon name="info" className="h-5 w-5 text-blue-500" />
  };

  return (
    <div
      className={cn('mb-5 flex items-start gap-3 rounded-xl border p-4 animate-fadeIn', styles[type])}
      role={type === 'error' ? 'alert' : 'status'}
      aria-live="assertive"
    >
      <div className="mt-0.5 shrink-0" aria-hidden="true">
        {icons[type]}
      </div>
      <div className="flex-1 min-w-0">
        {title && (
          <div className="font-semibold mb-1" id={`alert-title-${Date.now()}`}>
            {title}
          </div>
        )}
        <div className="text-sm">{children}</div>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={() => {
            setVisible(false);
            onClose();
          }}
          className="shrink-0 rounded-lg p-1 hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          aria-label="Dismiss message"
        >
          <Icon name="x" className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

const Card = ({ children, className, hover = false, padding = true }) => (
  <div
    className={cn(
      'rounded-2xl border border-gray-200 bg-white shadow-sm ring-1 ring-black/5',
      hover && 'hover:shadow-md transition-shadow duration-200',
      padding && 'p-6',
      className
    )}
  >
    {children}
  </div>
);

const Badge = ({ children, variant = 'neutral', className, icon }) => {
  const variants = {
    neutral: 'bg-gray-100 text-gray-800 border-gray-200',
    success: 'bg-green-100 text-green-700 border-green-200',
    warning: 'bg-amber-100 text-amber-800 border-amber-200',
    danger: 'bg-red-100 text-red-800 border-red-200',
    info: 'bg-[#2e66a6]/10 text-[#2e66a6] border-[#2e66a6]/20',
    purple: 'bg-purple-100 text-purple-800 border-purple-200'
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold',
        variants[variant],
        className
      )}
      role="status"
    >
      {icon && <span className="w-3 h-3">{icon}</span>}
      {children}
    </span>
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
  size = 'md',
  children,
  confirmDisabled = false
}) => {
  const modalRef = useRef(null);
  const confirmRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => confirmRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!open) return;

      if (e.key === 'Escape') onClose?.();

      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-describedby="modal-description"
    >
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={modalRef}
        className={cn(
          'relative w-full rounded-2xl bg-white shadow-2xl border border-gray-200 max-h-[90vh] overflow-hidden animate-scaleIn',
          sizeClasses[size]
        )}
      >
        <div className="flex items-center justify-between border-b border-gray-200 p-6">
          <div>
            <h3 id="modal-title" className="text-xl font-bold text-gray-900">
              {title}
            </h3>
            {description && (
              <p id="modal-description" className="mt-1 text-sm text-gray-600">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6]"
            aria-label="Close modal"
          >
            <Icon name="x" className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="max-h-[calc(90vh-160px)] overflow-y-auto p-6">
          {children}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-200 p-6">
          {cancelText && (
            <Button
              variant="secondary"
              size="md"
              onClick={onClose}
              aria-label="Cancel action"
            >
              {cancelText}
            </Button>
          )}
          <Button
            variant={danger ? 'danger' : 'primary'}
            size="md"
            onClick={onConfirm}
            disabled={confirmDisabled}
            aria-label={confirmText}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};

const getRolePill = (role) => {
  const roleMap = {
    admin: { variant: 'danger', label: 'Admin', icon: 'shield', ariaLabel: 'Administrator role' },
    employer: { variant: 'info', label: 'Employer', icon: 'building', ariaLabel: 'Employer role' },
    jobseeker: { variant: 'purple', label: 'Job Seeker', icon: 'user', ariaLabel: 'Job seeker role' }
  };
  return roleMap[role] || { variant: 'neutral', label: 'Unknown', icon: 'user', ariaLabel: 'Unknown role' };
};

const getVerificationBadge = (status) => {
  const normalizedStatus = String(status || 'unverified').toLowerCase();

  if (normalizedStatus === 'verified') {
    return { label: 'VERIFIED', variant: 'success' };
  }

  if (normalizedStatus === 'hold' || normalizedStatus === 'onhold') {
    return { label: 'ON HOLD', variant: 'info' };
  }

  return { label: 'UNVERIFIED', variant: 'warning' };
};

const formatDate = (dateString, options = {}) => {
  if (!dateString) return '—';
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return '—';

  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'Asia/Manila'
  };

  return d.toLocaleDateString('en-PH', { ...defaultOptions, ...options });
};

const dateOptions = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'thisWeek', label: 'This Week' },
  { value: '7days', label: 'Last 7 Days' },
  { value: 'thisMonth', label: 'This Month' },
  { value: 'lastMonth', label: 'Last Month' },
  { value: 'thisYear', label: 'This Year' },
  { value: 'lastYear', label: 'Last Year' },
  { value: 'custom', label: 'Custom Range' },
];

const formatDateInput = (date) => {
  if (!date) return '';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const getPresetDateRange = (value) => {
  const today = new Date();
  const current = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  if (value === 'today') {
    return { dateFrom: formatDateInput(current), dateTo: formatDateInput(current) };
  }

  if (value === 'yesterday') {
    const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
    return { dateFrom: formatDateInput(yesterday), dateTo: formatDateInput(yesterday) };
  }

  if (value === 'thisWeek') {
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    return {
      dateFrom: formatDateInput(
        new Date(today.getFullYear(), today.getMonth(), today.getDate() - mondayOffset)
      ),
      dateTo: formatDateInput(current),
    };
  }

  if (value === '7days') {
    return {
      dateFrom: formatDateInput(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6)),
      dateTo: formatDateInput(current),
    };
  }

  if (value === 'thisMonth') {
    return {
      dateFrom: formatDateInput(new Date(today.getFullYear(), today.getMonth(), 1)),
      dateTo: formatDateInput(current),
    };
  }

  if (value === 'lastMonth') {
    return {
      dateFrom: formatDateInput(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
      dateTo: formatDateInput(new Date(today.getFullYear(), today.getMonth(), 0)),
    };
  }

  if (value === 'thisYear') {
    return {
      dateFrom: formatDateInput(new Date(today.getFullYear(), 0, 1)),
      dateTo: formatDateInput(current),
    };
  }

  if (value === 'lastYear') {
    return {
      dateFrom: formatDateInput(new Date(today.getFullYear() - 1, 0, 1)),
      dateTo: formatDateInput(new Date(today.getFullYear() - 1, 11, 31)),
    };
  }

  return { dateFrom: '', dateTo: '' };
};

const formatDateLabel = (value) => {
  if (!value) return 'Select date';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return 'Select date';
  return date.toLocaleDateString('en-PH', { month: 'short', day: '2-digit', year: 'numeric' });
};

const getDateOptionLabel = (value, startDate, endDate) => {
  if (value === 'custom' && startDate && endDate) {
    return `${formatDateLabel(startDate)} - ${formatDateLabel(endDate)}`;
  }

  return dateOptions.find((option) => option.value === value)?.label || 'All Time';
};

const addCalendarMonths = (date, amount) => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + amount);
  return next;
};

const monthNames = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];

const getYearOptions = () => {
  const startYear = 1950;
  const endYear = new Date().getFullYear();
  return Array.from({ length: endYear - startYear + 1 }, (_, index) => startYear + index);
};

const CalendarMonth = ({ monthDate, startDate, endDate, onPickDate, onChangeMonth }) => {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const firstWeekday = firstDay.getDay();
  const gridStart = new Date(year, month, 1 - firstWeekday);
  const start = startDate ? new Date(`${startDate}T00:00:00`) : null;
  const end = endDate ? new Date(`${endDate}T00:00:00`) : null;

  const days = Array.from({ length: 42 }, (_, index) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + index);
    return d;
  });

  const isSameDay = (a, b) => a && b && a.toDateString() === b.toDateString();
  const inRange = (d) => start && end && d >= start && d <= end;
  const changeByMonth = (amount) => onChangeMonth(addCalendarMonths(monthDate, amount));
  const changeMonthSelect = (nextMonth) => onChangeMonth(new Date(year, Number(nextMonth), 1));
  const changeYearSelect = (nextYear) => onChangeMonth(new Date(Number(nextYear), month, 1));

  return (
    <div className="min-w-0 flex-1">
      <div className="mb-4 grid grid-cols-[32px_1fr_32px] items-center gap-2">
        <button
          type="button"
          onClick={() => changeByMonth(-1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-2xl leading-none text-slate-700 transition hover:bg-slate-100"
          aria-label="Previous month"
        >
          ‹
        </button>

        <div className="grid grid-cols-[1fr_86px] gap-2">
          <select
            value={month}
            onChange={(event) => changeMonthSelect(event.target.value)}
            className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-center text-sm font-extrabold text-[#2e66a6] outline-none focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/20"
            aria-label="Select month"
          >
            {monthNames.map((name, index) => (
              <option key={name} value={index}>{name}</option>
            ))}
          </select>

          <select
            value={year}
            onChange={(event) => changeYearSelect(event.target.value)}
            className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-center text-sm font-extrabold text-[#2e66a6] outline-none focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/20"
            aria-label="Select year"
          >
            {getYearOptions().map((yearOption) => (
              <option key={yearOption} value={yearOption}>{yearOption}</option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => changeByMonth(1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-2xl leading-none text-slate-700 transition hover:bg-slate-100"
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-y-2 text-center text-xs font-bold text-slate-500">
        {['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'].map((day) => <div key={day}>{day}</div>)}
      </div>

      <div className="mt-3 grid grid-cols-7 gap-y-1 text-center text-sm text-slate-600">
        {days.map((day) => {
          const value = formatDateInput(day);
          const outside = day.getMonth() !== month;
          const selected = isSameDay(day, start) || isSameDay(day, end);
          const ranged = inRange(day);

          return (
            <button
              type="button"
              key={value}
              onClick={() => onPickDate(value)}
              className={cn(
                'mx-auto flex h-9 w-full items-center justify-center transition',
                outside ? 'text-slate-300' : 'text-slate-700',
                ranged ? 'bg-[#2e66a6]/10 text-[#2e66a6]' : '',
                selected ? 'rounded-lg bg-[#2e66a6] font-extrabold text-white shadow-md' : 'hover:bg-[#2e66a6]/10'
              )}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const CustomDateRangeModal = ({ open, startDate, endDate, onCancel, onApply }) => {
  const today = new Date();
  const initialStart = startDate || formatDateInput(today);
  const initialEnd = endDate || formatDateInput(today);
  const [draftStart, setDraftStart] = useState(initialStart);
  const [draftEnd, setDraftEnd] = useState(initialEnd);
  const [leftMonth, setLeftMonth] = useState(new Date(`${initialStart}T00:00:00`));
  const [rightMonth, setRightMonth] = useState(addCalendarMonths(new Date(`${initialEnd}T00:00:00`), 0));

  useEffect(() => {
    if (!open) return;
    const nextStart = startDate || formatDateInput(today);
    const nextEnd = endDate || formatDateInput(today);
    setDraftStart(nextStart);
    setDraftEnd(nextEnd);
    setLeftMonth(new Date(`${nextStart}T00:00:00`));
    setRightMonth(addCalendarMonths(new Date(`${nextEnd}T00:00:00`), 0));
  }, [open, startDate, endDate]);

  if (!open) return null;

  const pickDate = (value) => {
    if (!draftStart || (draftStart && draftEnd)) {
      setDraftStart(value);
      setDraftEnd('');
      return;
    }

    if (new Date(`${value}T00:00:00`) < new Date(`${draftStart}T00:00:00`)) {
      setDraftEnd(draftStart);
      setDraftStart(value);
    } else {
      setDraftEnd(value);
    }
  };

  const apply = () => {
    if (!draftStart || !draftEnd) return;
    onApply(draftStart, draftEnd);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 px-4 py-6">
      <div className="w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="grid gap-5 px-6 pb-5 pt-5 md:grid-cols-[1fr_auto_1fr] md:items-end">
          <div>
            <div className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-500">Start Date</div>
            <div className="flex h-12 items-center gap-3 rounded-xl bg-slate-100 px-4 text-lg font-bold text-[#2e66a6]">
              <Icon name="calendar" className="h-5 w-5" /> {formatDateLabel(draftStart)}
            </div>
          </div>

          <div className="hidden pb-3 text-3xl text-slate-500 md:block">→</div>

          <div>
            <div className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-500">End Date</div>
            <div className="flex h-12 items-center gap-3 rounded-xl bg-slate-100 px-4 text-lg font-bold text-[#2e66a6]">
              <Icon name="calendar" className="h-5 w-5" /> {formatDateLabel(draftEnd)}
            </div>
          </div>
        </div>

        <div className="grid gap-8 px-6 pb-5 md:grid-cols-2">
          <CalendarMonth monthDate={leftMonth} startDate={draftStart} endDate={draftEnd} onPickDate={pickDate} onChangeMonth={setLeftMonth} />
          <CalendarMonth monthDate={rightMonth} startDate={draftStart} endDate={draftEnd} onPickDate={pickDate} onChangeMonth={setRightMonth} />
        </div>

        <div className="flex items-center justify-end gap-5 border-t border-slate-100 px-6 py-5">
          <button type="button" onClick={onCancel} className="text-base font-bold text-slate-600">Cancel</button>
          <button
            type="button"
            onClick={apply}
            disabled={!draftStart || !draftEnd}
            className="h-11 rounded-xl bg-[#2e66a6] px-8 text-base font-extrabold text-white shadow-lg shadow-[#2e66a6]/25 transition hover:bg-[#255487] disabled:opacity-60"
          >
            Apply Range
          </button>
        </div>
      </div>
    </div>
  );
};

const DateFilterDropdown = ({ value, startDate, endDate, disabled, onSelect }) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return undefined;

    const close = () => setOpen(false);
    window.addEventListener('click', close);

    return () => window.removeEventListener('click', close);
  }, [open]);

  return (
    <div className="relative">
    

      <button
        type="button"
        disabled={disabled}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((prev) => !prev);
        }}
        className={cn(
          'flex h-11 w-full items-center justify-between rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-800 shadow-sm transition hover:bg-gray-50',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-60'
        )}
      >
        <span className="truncate">{getDateOptionLabel(value, startDate, endDate)}</span>
        <Icon name="calendar" className="h-4 w-4 text-slate-500" />
      </button>

      {open ? (
        <div
          onClick={(event) => event.stopPropagation()}
          className="absolute left-0 top-[68px] z-50 w-56 rounded-2xl border border-gray-100 bg-white p-2 shadow-xl ring-1 ring-black/5"
        >
          <div className="space-y-1">
            {dateOptions.map((option) => (
              <button
                type="button"
                key={option.value}
                onClick={() => {
                  setOpen(false);
                  onSelect(option.value);
                }}
                className={cn(
                  'w-full rounded-xl px-3 py-2 text-left text-sm font-semibold transition',
                  value === option.value ? 'bg-[#2e66a6]/10 text-[#2e66a6]' : 'text-slate-600 hover:bg-slate-50'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};

const useDebouncedValue = (value, delay = 300) => {
  const [debounced, setDebounced] = useState(value);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setDebounced(value);
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delay]);

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  return [debounced, cancel];
};

const Avatar = React.memo(({ img, name, role = 'jobseeker', size = 40, className }) => {
  const [imageError, setImageError] = useState(false);
  const fallbackImage = '/images/profile.png';

  const boxStyle = {
    height: `${size}px`,
    width: `${size}px`,
    fontSize: `${Math.max(12, size * 0.4)}px`
  };

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full border border-gray-200 bg-[#2e66a6]/10 text-[#2e66a6] shadow-sm overflow-hidden shrink-0',
        className
      )}
      style={boxStyle}
      aria-label={`${name}'s profile picture`}
    >
      <img
        src={img && !imageError ? img : fallbackImage}
        alt={`${name}'s profile`}
        className="h-full w-full object-cover bg-white"
        loading="lazy"
        onError={() => setImageError(true)}
      />
    </div>
  );
});

Avatar.displayName = 'Avatar';

const normalizeCampusName = (value) => {
  const text = String(value || '').trim();
  if (!text) return '';

  const compact = text
    .toLowerCase()
    .replace(/phinma/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (compact.includes('san jose') || compact.includes('sanjose')) return 'AU San Jose';
  if (compact.includes('south')) return 'AU South';
  if (compact.includes('main')) return 'AU Main';

  return text.replace(/\s+/g, ' ');
};

const uniqueNormalizedOptions = (values, normalizer = (value) => String(value || '').trim()) => {
  const optionMap = new Map();

  values.forEach((value) => {
    const normalizedValue = normalizer(value);
    if (!normalizedValue) return;

    const duplicateKey = normalizedValue.toLocaleLowerCase();
    if (!optionMap.has(duplicateKey)) {
      optionMap.set(duplicateKey, normalizedValue);
    }
  });

  return [...optionMap.values()].sort((a, b) => a.localeCompare(b));
};

const UserManagement = () => {
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    jobseekers: 0,
    employers: 0,
    pending: 0,
    verified: 0,
    rejected: 0
  });
  const [filterOptions, setFilterOptions] = useState({
    campuses: [],
    courses: [],
    companies: [],
    industries: [],
  });

  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [roleFilter, setRoleFilter] = useState('all');
  const [campusFilter, setCampusFilter] = useState('all');
  const [courseFilter, setCourseFilter] = useState('all');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [industryFilter, setIndustryFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('newest');
  const [dateFilter, setDateFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showCustomDateModal, setShowCustomDateModal] = useState(false);

  const [actionTarget, setActionTarget] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalUsers, setTotalUsers] = useState(0);

  const desktopTableMinHeight = pageSize === 'all'
    ? undefined
    : `${54 + (Number(pageSize) * 66)}px`;

  const [userActionLoading, setUserActionLoading] = useState({});

  const [debouncedQuery, cancelQuery] = useDebouncedValue(query, 300);

  const clearMessages = useCallback(() => {
    setError('');
    setSuccess('');
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      clearMessages();

      const hasSearch = Boolean(debouncedQuery);
      const params = {
        page: currentPage,
        limit: pageSize === 'all' ? 100000 : pageSize,
        search: debouncedQuery || undefined,
        sort,
        role: !hasSearch && roleFilter !== 'all' ? roleFilter : undefined,
        campus: !hasSearch && roleFilter === 'jobseeker' && campusFilter !== 'all' ? campusFilter : undefined,
        course: !hasSearch && roleFilter === 'jobseeker' && courseFilter !== 'all' ? courseFilter : undefined,
        company: !hasSearch && roleFilter === 'employer' && companyFilter !== 'all' ? companyFilter : undefined,
        industry: !hasSearch && roleFilter === 'employer' && industryFilter !== 'all' ? industryFilter : undefined,
        dateFrom: !hasSearch && dateFrom ? dateFrom : undefined,
        dateTo: !hasSearch && dateTo ? dateTo : undefined
      };

      const response = await api.get('/admin/users', { params });

      if (response.data?.success) {
        const formattedUsers = (response.data.users || [])
          .filter(user => user.role !== 'admin')
          .map(user => ({
          key: user._id,
          id: user._id,
          email: user.email,
          name: user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'No Name',
          role: user.role,
          status: user.status || 'active',
          isVerified: user.isVerified || false,
          verificationStatus: user.verificationStatus || (user.isVerified ? 'verified' : 'unverified'),
          profileImage: user.profileImage,
          avatarImage: resolveMediaUrl(
            user.role === 'employer'
              ? user.employerProfile?.companyLogo || user.profileImage
              : user.profileImage
          ),
          createdAt: user.createdAt,
          studentId: user.jobSeekerProfile?.studentId,
          companyName: user.employerProfile?.companyName || '',
          industry: user.employerProfile?.industry || '',
          campus: normalizeCampusName(
            user.jobSeekerProfile?.campus ||
              user.jobSeekerProfile?.educationEntries?.find((entry) => entry?.campus)?.campus ||
              ''
          ),
          course:
            user.jobSeekerProfile?.course ||
            user.jobSeekerProfile?.educationEntries?.find((entry) => entry?.course)?.course ||
            '',
          contactNumber:
            user.role === 'employer'
              ? user.employerProfile?.mobileNumber || 'Not provided'
              : user.role === 'jobseeker'
              ? user.jobSeekerProfile?.phoneNumber || 'Not provided'
              : 'Not provided'
        }));

        setUsers(formattedUsers);
        setTotalUsers(response.data.pagination?.totalItems || response.data.total || formattedUsers.length);

        setStats(
          response.data.stats || {
            total: 0,
            jobseekers: 0,
            employers: 0,
            pending: 0,
            verified: 0,
            rejected: 0
          }
        );
        setFilterOptions(
          response.data.options || {
            campuses: [],
            courses: [],
            companies: [],
            industries: [],
          }
        );
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err.response?.data?.message || 'Failed to load users. Please try again.');
      setUsers([]);
      setTotalUsers(0);
      setStats({
        total: 0,
        jobseekers: 0,
        employers: 0,
        pending: 0,
        verified: 0,
        rejected: 0
      });
    } finally {
      setLoading(false);
    }
  }, [
    currentPage,
    pageSize,
    roleFilter,
    campusFilter,
    courseFilter,
    companyFilter,
    industryFilter,
    debouncedQuery,
    sort,
    dateFrom,
    dateTo,
    clearMessages,
  ]);

  useEffect(() => {
    fetchUsers();
    return () => cancelQuery();
  }, [fetchUsers, cancelQuery]);

  const handleStatusUpdate = async (userId, newStatus) => {
    setUserActionLoading(prev => ({ ...prev, [userId]: true }));
    clearMessages();

    try {
      const response = await api.put(`/admin/users/${userId}/status`, {
        status: newStatus,
        reason: `Status changed to ${newStatus} by admin`
      });

      if (response.data?.success) {
        setSuccess(`User status updated to ${newStatus}`);
        fetchUsers();
      } else {
        setError('Failed to update user status');
      }
    } catch (err) {
      console.error('Error updating status:', err);
      setError(err.response?.data?.message || 'Failed to update user status');
    } finally {
      setUserActionLoading(prev => ({ ...prev, [userId]: false }));
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedRowKeys.length === 0) {
      setError('Please select users first');
      return;
    }

    if (action === 'delete') {
      setActionTarget({
        type: 'bulk',
        count: selectedRowKeys.length,
        action: 'delete'
      });
      return;
    }

    try {
      setLoading(true);
      clearMessages();

      let status;
      if (action === 'activate') status = 'active';
      else if (action === 'deactivate') status = 'inactive';
      else if (action === 'suspend') status = 'suspended';

      if (status) {
        const response = await api.put('/admin/users/bulk-status', {
          userIds: selectedRowKeys,
          status
        });

        if (response.data?.success) {
          setSuccess(`Updated ${response.data.modifiedCount} user(s) to ${status}`);
          setSelectedRowKeys([]);
          fetchUsers();
        } else {
          setError('Failed to update users');
        }
      }
    } catch (err) {
      console.error('Error in bulk action:', err);
      setError(err.response?.data?.message || 'Failed to perform bulk action');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    setUserActionLoading(prev => ({ ...prev, [userId]: true }));
    clearMessages();

    try {
      const response = await api.delete(`/admin/users/${userId}`);

      if (response.data?.success) {
        setSuccess('User deleted successfully');
        fetchUsers();
        setActionTarget(null);
      } else {
        setError('Failed to delete user');
      }
    } catch (err) {
      console.error('Error deleting user:', err);
      setError(err.response?.data?.message || 'Failed to delete user');
    } finally {
      setUserActionLoading(prev => ({ ...prev, [userId]: false }));
    }
  };

  const filteredUsers = useMemo(() => {
    let filtered = users;

    if (!debouncedQuery && roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    if (!debouncedQuery && roleFilter === 'jobseeker' && campusFilter !== 'all') {
      filtered = filtered.filter((user) => user.campus === campusFilter);
    }

    if (!debouncedQuery && roleFilter === 'jobseeker' && courseFilter !== 'all') {
      filtered = filtered.filter((user) => user.course === courseFilter);
    }

    if (!debouncedQuery && roleFilter === 'employer' && companyFilter !== 'all') {
      filtered = filtered.filter((user) => user.companyName === companyFilter);
    }

    if (!debouncedQuery && roleFilter === 'employer' && industryFilter !== 'all') {
      filtered = filtered.filter((user) => user.industry === industryFilter);
    }

    if (debouncedQuery) {
      const q = debouncedQuery.toLowerCase();
      filtered = filtered.filter(user =>
        user.email?.toLowerCase().includes(q) ||
        user.name?.toLowerCase().includes(q) ||
        user.companyName?.toLowerCase().includes(q) ||
        user.studentId?.toLowerCase().includes(q)
      );
    }

    if (!debouncedQuery && (dateFrom || dateTo)) {
      const start = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
      const end = dateTo ? new Date(`${dateTo}T23:59:59`) : null;

      filtered = filtered.filter(user => {
        const registeredDate = user.createdAt ? new Date(user.createdAt) : null;
        if (!registeredDate || Number.isNaN(registeredDate.getTime())) return false;
        if (start && registeredDate < start) return false;
        if (end && registeredDate > end) return false;
        return true;
      });
    }

    return [...filtered].sort((a, b) => {
      switch (sort) {
        case 'newest': return new Date(b.createdAt) - new Date(a.createdAt);
        case 'oldest': return new Date(a.createdAt) - new Date(b.createdAt);
        case 'name_asc': return a.name.localeCompare(b.name);
        case 'name_desc': return b.name.localeCompare(a.name);
        default: return 0;
      }
    });
  }, [
    users,
    roleFilter,
    campusFilter,
    courseFilter,
    companyFilter,
    industryFilter,
    debouncedQuery,
    sort,
    dateFrom,
    dateTo,
  ]);

  const campusOptions = useMemo(
    () => uniqueNormalizedOptions(filterOptions.campuses || [], normalizeCampusName),
    [filterOptions.campuses]
  );

  const courseOptions = useMemo(
    () => [...new Set((filterOptions.courses || []).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [filterOptions.courses]
  );

  const companyOptions = useMemo(
    () => [...new Set((filterOptions.companies || []).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [filterOptions.companies]
  );

  const industryOptions = useMemo(
    () => [...new Set((filterOptions.industries || []).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [filterOptions.industries]
  );

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedRowKeys(filteredUsers.map(user => user.key));
    } else {
      setSelectedRowKeys([]);
    }
  };

  const handleDateFilterChange = (value) => {
    if (value === 'custom') {
      setShowCustomDateModal(true);
      return;
    }

    const range = getPresetDateRange(value);

    setDateFilter(value);
    setDateFrom(range.dateFrom);
    setDateTo(range.dateTo);
    setCurrentPage(1);
  };

  const applyCustomDateRange = (startDate, endDate) => {
    setDateFilter('custom');
    setDateFrom(startDate);
    setDateTo(endDate);
    setShowCustomDateModal(false);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setQuery('');
    setRoleFilter('all');
    setCampusFilter('all');
    setCourseFilter('all');
    setCompanyFilter('all');
    setIndustryFilter('all');
    setSort('newest');
    setDateFilter('all');
    setDateFrom('');
    setDateTo('');
    setSelectedRowKeys([]);
    setCurrentPage(1);
    cancelQuery();
  };

  const handleViewDetails = (userId) => {
    navigate(`/admin/users/${userId}`);
  };

  const exportToCSV = () => {
    const headers = ['Name', 'Email', 'Role', 'Status', 'Verified', 'Created At'];
    const csvData = filteredUsers.map(user => [
      user.name,
      user.email,
      user.role,
      user.status,
      user.isVerified ? 'Yes' : 'No',
      formatDate(user.createdAt)
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `users_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.setAttribute('aria-label', 'Download users as CSV');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setSuccess('Export completed successfully');
  };

  const inputBase = 'h-11 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-10 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition-all duration-200 hover:border-[#2e66a6]/40 focus-visible:border-[#2e66a6] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2e66a6]/10 disabled:bg-slate-50 disabled:opacity-60';
  const selectBase = 'h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 shadow-sm transition-all duration-200 hover:border-[#2e66a6]/40 focus-visible:border-[#2e66a6] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2e66a6]/10 disabled:bg-slate-50 disabled:opacity-60';

  return (
    <AdminLayout>
      <div className="mx-auto max-w-[1480px] px-1 py-7 sm:py-8">
        {error && (
          <Alert
            type="error"
            title="Error"
            onClose={() => setError('')}
            autoDismiss={5000}
          >
            {error}
          </Alert>
        )}

        {success && (
          <Alert
            type="success"
            title="Success"
            onClose={() => setSuccess('')}
            autoDismiss={3500}
          >
            {success}
          </Alert>
        )}

        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-[30px] font-semibold leading-tight tracking-[-0.02em] text-slate-950 sm:text-[34px]">
              User Management
            </h1>
            <p className="mt-1.5 text-sm text-slate-600">View, filter, and manage registered users</p>
          </div>
        </div>

        <div className="relative z-20 mb-6 overflow-visible rounded-2xl border border-slate-200 bg-white shadow-[0_8px_28px_rgba(15,23,42,0.06)]">
          <div className="p-5">
            <div
              className={cn(
                'grid grid-cols-1 gap-3 md:grid-cols-2 2xl:items-center',
                roleFilter === 'all'
                  ? '2xl:grid-cols-[minmax(300px,1.45fr)_repeat(3,minmax(180px,1fr))_auto]'
                  : '2xl:grid-cols-[minmax(300px,1.4fr)_repeat(4,minmax(160px,1fr))_auto]'
              )}
            >
              <div className="relative min-w-0">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <Icon name="search" className="h-4 w-4" />
                </span>
                <label htmlFor="userSearch" className="sr-only">
                  Search users
                </label>
                <input
                  id="userSearch"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className={inputBase}
                  placeholder="Search name, email, company, or student ID"
                  disabled={loading}
                  autoComplete="off"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-gray-500 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6]"
                    aria-label="Clear search"
                  >
                    <Icon name="x" className="h-4 w-4" />
                  </button>
                )}
              </div>

              <select
                value={roleFilter}
                onChange={(e) => {
                  const nextRole = e.target.value;
                  setRoleFilter(nextRole);
                  setCampusFilter('all');
                  setCourseFilter('all');
                  setCompanyFilter('all');
                  setIndustryFilter('all');
                  if (nextRole !== 'all') {
                    setSort('newest');
                  }
                  setCurrentPage(1);
                }}
                className={selectBase}
                disabled={loading}
                aria-label="Filter by role"
              >
                <option value="all">All Roles</option>
                <option value="jobseeker">Jobseeker</option>
                <option value="employer">Employer</option>
              </select>

              {roleFilter === 'jobseeker' && (
                <>
                  <select
                    value={campusFilter}
                    onChange={(e) => {
                      setCampusFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className={selectBase}
                    disabled={loading}
                    aria-label="Filter by campus"
                  >
                    <option value="all">All Campus</option>
                    {campusOptions.map((campus) => (
                      <option key={campus} value={campus}>{campus}</option>
                    ))}
                  </select>

                  <select
                    value={courseFilter}
                    onChange={(e) => {
                      setCourseFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className={selectBase}
                    disabled={loading}
                    aria-label="Filter by course"
                  >
                    <option value="all">All Course</option>
                    {courseOptions.map((course) => (
                      <option key={course} value={course}>{course}</option>
                    ))}
                  </select>
                </>
              )}

              {roleFilter === 'employer' && (
                <>
                  <select
                    value={companyFilter}
                    onChange={(e) => {
                      setCompanyFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className={selectBase}
                    disabled={loading}
                    aria-label="Filter by company"
                  >
                    <option value="all">All Company</option>
                    {companyOptions.map((company) => (
                      <option key={company} value={company}>{company}</option>
                    ))}
                  </select>

                  <select
                    value={industryFilter}
                    onChange={(e) => {
                      setIndustryFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className={selectBase}
                    disabled={loading}
                    aria-label="Filter by industry"
                  >
                    <option value="all">All Industry</option>
                    {industryOptions.map((industry) => (
                      <option key={industry} value={industry}>{industry}</option>
                    ))}
                  </select>
                </>
              )}

              <DateFilterDropdown
                value={dateFilter}
                startDate={dateFrom}
                endDate={dateTo}
                disabled={loading}
                onSelect={handleDateFilterChange}
              />

              {roleFilter === 'all' && (
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className={selectBase}
                  disabled={loading}
                  aria-label="Sort users"
                >
                  <option value="newest">Sort By</option>
                  <option value="newest">Most Recent Newest to Oldest</option>
                  <option value="oldest">Oldest First</option>
                  <option value="name_asc">A to Z</option>
                  <option value="name_desc">Z to A</option>
                </select>
              )}

              {(query.trim() !== '' ||
                roleFilter !== 'all' ||
                campusFilter !== 'all' ||
                courseFilter !== 'all' ||
                companyFilter !== 'all' ||
                industryFilter !== 'all' ||
                sort !== 'newest' ||
                dateFilter !== 'all' ||
                dateFrom !== '' ||
                dateTo !== '') && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="h-11 whitespace-nowrap rounded-xl border border-[#2e66a6]/30 bg-[#2e66a6]/5 px-5 text-sm font-semibold text-[#24558d] transition-all duration-200 hover:border-[#2e66a6] hover:bg-[#2e66a6] hover:text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2e66a6]/15 disabled:opacity-60 md:col-span-2 2xl:col-span-1"
                  disabled={loading}
                >
                  Clear
                </button>
              )}
            </div>

           
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_32px_rgba(15,23,42,0.06)]">
          <div className="p-4 sm:p-6">

            {loading && users.length === 0 ? (
              <div className="py-14 text-center" role="status" aria-live="polite">
                <div
                  className="inline-block h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-[#2e66a6]"
                  aria-hidden="true"
                />
                <p className="mt-4 text-sm text-gray-600">Loading users...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-14 text-center">
                <div
                  className="mx-auto mb-4 h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-gray-100 flex items-center justify-center"
                  aria-hidden="true"
                >
                  <Icon name="user" className="h-7 w-7 sm:h-8 sm:w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">No users found</h3>
                <p className="mt-2 text-sm text-gray-600">
                  Try adjusting your filters or search terms
                </p>
              </div>
            ) : (
              <>
                <div
                  className="hidden md:block overflow-x-auto"
                  style={{ minHeight: desktopTableMinHeight }}
                >
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-[#2e66a6]/[0.055]">
                      <tr>
                        <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                          Date Registered
                        </th>
                        <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                          Name
                        </th>
                        <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                          Role
                        </th>
                        {roleFilter === 'jobseeker' && (
                          <>
                            <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Campus</th>
                            <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Course</th>
                          </>
                        )}
                        {roleFilter === 'employer' && (
                          <>
                            <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Company</th>
                            <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Industry</th>
                          </>
                        )}
                        <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                          Contact Number
                        </th>
                        <th className="px-5 py-4 text-center text-xs font-semibold uppercase tracking-wider text-gray-600">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-200 bg-white">
                      {filteredUsers.map((user) => {
                        const roleInfo = getRolePill(user.role);
                        const isLoading = userActionLoading[user.key];

                        return (
                          <tr
                            key={user.key}
                            role="link"
                            tabIndex={0}
                            onClick={(event) => {
                              if (event.target.closest("button, a, input, select, textarea, label")) return;
                              handleViewDetails(user.key);
                            }}
                            onKeyDown={(event) => {
                              if (event.target !== event.currentTarget) return;
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                handleViewDetails(user.key);
                              }
                            }}
                            className="group cursor-pointer transition-all duration-200 hover:bg-[#2e66a6]/[0.055] focus:bg-[#2e66a6]/[0.08] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2e66a6]"
                          >
                            <td className="px-5 py-4 text-sm text-gray-700 whitespace-nowrap">
                              {formatDate(user.createdAt)}
                            </td>

                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3 min-w-0">
                                <Avatar
                                  img={user.avatarImage}
                                  name={user.role === 'employer' ? user.companyName || user.name : user.name}
                                  role={user.role}
                                />
                                <div className="min-w-0">
                                  <div className="text-sm font-semibold text-gray-900 truncate">
                                    {user.name}
                                  </div>
                                  <div className="text-xs text-gray-500 truncate">
                                    {user.email}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="px-5 py-4">
                              <div className="inline-flex items-center gap-2 text-sm text-gray-700">
                                <Icon name={roleInfo.icon} className="h-4 w-4 text-gray-500" />
                                <span>{roleInfo.label}</span>
                              </div>
                            </td>

                            {roleFilter === 'jobseeker' && (
                              <>
                                <td className="px-5 py-4 text-sm text-gray-700">{user.campus || 'Not provided'}</td>
                                <td className="px-5 py-4 text-sm text-gray-700">{user.course || 'Not provided'}</td>
                              </>
                            )}

                            {roleFilter === 'employer' && (
                              <>
                                <td className="px-5 py-4 text-sm text-gray-700">{user.companyName || 'Not provided'}</td>
                                <td className="px-5 py-4 text-sm text-gray-700">{user.industry || 'Not provided'}</td>
                              </>
                            )}

                            <td className="px-5 py-4 text-sm text-gray-700 whitespace-nowrap">
                              {user.contactNumber || 'Not provided'}
                            </td>

                            <td className="px-5 py-4">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleViewDetails(user.key)}
                                  disabled={isLoading}
                                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-transparent text-slate-500 transition-all duration-200 group-hover:border-[#2e66a6]/15 group-hover:bg-white group-hover:text-[#2e66a6] group-hover:shadow-sm hover:!border-[#2e66a6]/25 hover:!bg-[#2e66a6] hover:!text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2e66a6]/15"
                                  aria-label={`View ${user.name}`}
                                >
                                  <Icon name="eye" className="h-4 w-4" />
                                </button>

                             
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="space-y-4 md:hidden">
                  {filteredUsers.map((user) => {
                    const roleInfo = getRolePill(user.role);
                    const isLoading = userActionLoading[user.key];

                    return (
                      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#2e66a6]/25 hover:shadow-md">
                        <div className="h-1 bg-gradient-to-r from-[#2e66a6] to-[#73b7dc]" aria-hidden="true" />
                        <div className="p-4">
                          <div className="flex items-start gap-3">
                            <Avatar
                              img={user.avatarImage}
                              name={user.role === 'employer' ? user.companyName || user.name : user.name}
                              role={user.role}
                              size={44}
                            />

                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-semibold text-gray-900">{user.name}</div>
                              <div className="text-xs text-gray-500 truncate">{user.email}</div>

                              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-600">
                                <div>
                                  <span className="font-semibold text-gray-800">Role:</span> {roleInfo.label}
                                </div>
                                <div>
                                  <span className="font-semibold text-gray-800">Registered:</span> {formatDate(user.createdAt)}
                                </div>
                                <div className="col-span-2">
                                  <span className="font-semibold text-gray-800">Contact Number:</span> {user.contactNumber || 'Not provided'}
                                </div>
                              </div>

                              <div className="mt-4 flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleViewDetails(user.key)}
                                  disabled={isLoading}
                                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#2e66a6]/10 text-[#2e66a6] transition-colors hover:bg-[#2e66a6] hover:text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2e66a6]/15"
                                  aria-label={`View ${user.name}`}
                                >
                                  <Icon name="eye" className="h-4 w-4" />
                                </button>

                                <AccessibleDropdown
                                  trigger={
                                    <button
                                      type="button"
                                      disabled={isLoading}
                                      className="inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6]"
                                      aria-label={`More actions for ${user.name}`}
                                    >
                                      <Icon name="moreVertical" className="h-4 w-4" />
                                    </button>
                                  }
                                  align="right"
                                  width="w-48"
                                >
                                  <DropdownItem
                                    onClick={() => handleStatusUpdate(user.key, 'active')}
                                    icon={<Icon name="check" className="h-4 w-4 text-[#2e66a6]" />}
                                    variant="success"
                                    disabled={user.status === 'active' || isLoading}
                                  >
                                    Activate
                                  </DropdownItem>
                                  <DropdownItem
                                    onClick={() => handleStatusUpdate(user.key, 'inactive')}
                                    icon={<Icon name="x" className="h-4 w-4 text-gray-600" />}
                                    disabled={user.status === 'inactive' || isLoading}
                                  >
                                    Deactivate
                                  </DropdownItem>
                                  <DropdownItem
                                    onClick={() => handleStatusUpdate(user.key, 'suspended')}
                                    icon={<Icon name="lock" className="h-4 w-4 text-amber-600" />}
                                    variant="warning"
                                    disabled={user.status === 'suspended' || isLoading}
                                  >
                                    Suspend
                                  </DropdownItem>
                                  <div className="border-t border-gray-200 my-1" role="separator" />
                                  <DropdownItem
                                    onClick={() => {
                                      setActionTarget({
                                        type: 'single',
                                        user,
                                        action: 'delete'
                                      });
                                    }}
                                    icon={<Icon name="trash" className="h-4 w-4" />}
                                    variant="danger"
                                    disabled={isLoading}
                                  >
                                    Delete User
                                  </DropdownItem>
                                </AccessibleDropdown>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <Pagination
                  currentPage={currentPage}
                  totalItems={totalUsers}
                  pageSize={pageSize}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={setPageSize}
                />
              </>
            )}
          </div>
        </div>
      </div>

      <CustomDateRangeModal
        open={showCustomDateModal}
        startDate={dateFrom}
        endDate={dateTo}
        onCancel={() => setShowCustomDateModal(false)}
        onApply={applyCustomDateRange}
      />

      <Modal
        open={!!actionTarget}
        title={
          actionTarget?.type === 'bulk'
            ? `Delete ${actionTarget.count} users?`
            : `Delete user ${actionTarget?.user?.name}?`
        }
        description={
          actionTarget?.type === 'bulk'
            ? `This will permanently delete ${actionTarget.count} selected users. This action cannot be undone.`
            : "This will mark the user as deleted (soft delete). The user's email will be modified to prevent re-registration."
        }
        confirmText="Delete"
        cancelText="Cancel"
        danger={true}
        size="md"
        onClose={() => setActionTarget(null)}
        onConfirm={() => {
          if (actionTarget?.type === 'bulk') {
            handleBulkAction('delete');
          } else if (actionTarget?.type === 'single') {
            handleDeleteUser(actionTarget.user.key);
          }
          setActionTarget(null);
        }}
        confirmDisabled={userActionLoading[actionTarget?.user?.key] || loading}
      >
        <div className="space-y-4">
          <Alert type="warning" title="Warning">
            This action cannot be undone. Deleted users will be marked as deleted but can be restored within 30 days.
          </Alert>
          {actionTarget?.type === 'single' && (
            <div className="rounded-lg bg-gray-50 p-4">
              <div className="flex items-center gap-3">
                <Avatar
                  img={actionTarget.user.avatarImage}
                  name={actionTarget.user.name}
                  role={actionTarget.user.role}
                />
                <div>
                  <p className="font-medium text-gray-900">{actionTarget.user.name}</p>
                  <p className="text-sm text-gray-600">{actionTarget.user.email}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </AdminLayout>
  );
};

export default UserManagement;
