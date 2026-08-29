// src/pages/admin/JobseekerVerificationDetails.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../../services/api";
import AdminLayout from "../../layouts/AdminLayout";

const cn = (...classes) => classes.filter(Boolean).join(" ");

// ======================= UI TOKENS =======================
const UI = {
  // 60/30/10 palette rule:
  // 60% = #FFFFFF canvas/paper, 30% = soft structural surfaces, 10% = #2e66a6 highlights/actions. Cards use soft off-white to reduce eye strain.
  page: "mx-auto max-w-7xl px-1 py-8",
  section: "space-y-6",

  // Surfaces
  card: "bg-[#F8FAFC] border border-[#E2E8F0] rounded-3xl shadow-[0_8px_24px_rgba(15,23,42,0.05)]",
  cardSoft:
    "bg-[#F8FAFC] border border-[#E2E8F0] rounded-3xl shadow-[0_10px_28px_rgba(15,23,42,0.06)]",
  inset:
    "bg-[#FFFFFF]/85 border border-[#E2E8F0] rounded-2xl shadow-[0_1px_0_rgba(15,23,42,0.03)]",
  panel: "bg-[#EEF2F6] border border-[#E2E8F0] rounded-2xl",
  divider: "border-t border-[#E2E8F0]",

  // Text
  h1: "text-2xl sm:text-3xl font-bold tracking-[-0.02em] text-[#000000]",
  h2: "text-lg font-bold tracking-[-0.01em] text-[#000000]",
  h3: "text-base font-bold text-[#000000]",
  body: "text-sm leading-6 text-[#475467]",
  label: "text-xs font-semibold uppercase tracking-[0.08em] text-[#64748B]",
  value: "text-sm sm:text-[15px] font-semibold leading-6 text-[#111827]",

  // Focus
  ring: "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2 focus-visible:ring-offset-white",

  // Buttons
  btnBase:
    "inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition duration-150 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none",
  btnSm: "min-h-9 px-3 text-sm",
  btnMd: "min-h-10 px-4 text-sm",
  btnLg: "min-h-12 px-5 text-sm sm:text-base",

  btnPrimary:
    "bg-[#2e66a6] text-white shadow-[0_8px_18px_rgba(46,102,166,0.22)] hover:bg-[#255587]",
  btnSecondary:
    "bg-[#FFFFFF] text-black border border-[#CBD5E1] hover:bg-[#F1F5F9]",
  btnDanger:
    "bg-[#FFFFFF] text-black border border-[#CBD5E1] hover:bg-[#F1F5F9]",
  btnSoft:
    "bg-[#EEF4FB] text-[#2e66a6] border border-[#BFD3EA] hover:bg-[#E2EDF8]",

  // Badges
  badgeBase:
    "inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border",
};

// ======================= ICONS =======================
const SvgIcon = ({ name, className = "w-5 h-5" }) => {
  const icons = {
    back: (
      <svg
        className={className}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10 19l-7-7m0 0l7-7m-7 7h18"
        />
      </svg>
    ),
    eye: (
      <svg
        className={className}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    ),
    eyeOff: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 3l18 18M10.58 10.58a2 2 0 002.83 2.83M9.88 4.24A10.8 10.8 0 0112 4c5.5 0 9.5 4.5 10.5 8a13.7 13.7 0 01-2.08 3.87M6.61 6.61C3.9 8.32 2.25 10.67 1.5 12c1 3.5 5 8 10.5 8 1.5 0 2.88-.33 4.12-.9" />
      </svg>
    ),
    check: (
      <svg
        className={className}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    restore: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h6V4" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.93 19.07A9 9 0 1012 3a9 9 0 00-7.07 3.43L3 10" />
      </>
    ),
    x: (
      <svg
        className={className}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M15 9l-6 6m0-6l6 6"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    user: (
      <svg
        className={className}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
        />
      </svg>
    ),
    document: (
      <svg
        className={className}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    ),
    graduation: (
      <svg
        className={className}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M12 14l9-5-9-5-9 5 9 5zm0 0v6m0-6l-9 5m9-5l9 5"
        />
      </svg>
    ),
    mail: (
      <svg
        className={className}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M3 8l7.89-4.26a2 2 0 012.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
      </svg>
    ),
    phone: (
      <svg
        className={className}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
        />
      </svg>
    ),
    calendar: (
      <svg
        className={className}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    ),
    briefcase: (
      <svg
        className={className}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m-3 0h14a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9a2 2 0 012-2z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M3 13h18"
        />
      </svg>
    ),
    download: (
      <svg
        className={className}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M12 3v12m0 0l4-4m-4 4l-4-4m-5 8h18"
        />
      </svg>
    ),
    info: (
      <svg
        className={className}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M13 16h-1v-4h-1m1-4h.01"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    pause: (
      <svg
        className={className}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M10 9v6m4-6v6"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    warning: (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" fill="#EEF2FF" />
        <path
          d="M12 7v5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <circle cx="12" cy="15.5" r="1" fill="currentColor" />
      </svg>
    ),
    dangerTriangle: (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" fill="#FEE4E2" />
        <path
          d="M12 8v5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <circle cx="12" cy="16" r="1" fill="currentColor" />
      </svg>
    ),
  };

  return icons[name] || null;
};

const Spinner = ({ className = "w-4 h-4" }) => (
  <svg
    className={`${className} animate-spin`}
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
      fill="none"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z"
    />
  </svg>
);

// ======================= COMPONENTS =======================
const Badge = ({ children, variant = "neutral" }) => {
  const variants = {
    neutral: "bg-white text-black border-[#CBD5E1]",
    success: "bg-[#2e66a6]/10 text-[#2e66a6] border-[#2e66a6]/25",
    warning: "bg-[#F1F5F9] text-black border-[#CBD5E1]",
    danger: "bg-white text-black border-[#CBD5E1]",
    info: "bg-[#2e66a6]/10 text-[#2e66a6] border-[#2e66a6]/25",
  };

  const dots = {
    neutral: "bg-black/40",
    success: "bg-[#2e66a6]",
    warning: "bg-black/55",
    danger: "bg-black/70",
    info: "bg-[#2e66a6]",
  };

  return (
    <span className={cn(UI.badgeBase, variants[variant])}>
      <span className={cn("w-2 h-2 rounded-full", dots[variant])} />
      {children}
    </span>
  );
};

const Button = ({
  children,
  variant = "secondary",
  size = "md",
  leftIcon,
  rightIcon,
  onClick,
  disabled = false,
  loading = false,
  className = "",
  ...props
}) => {
  const sizes = {
    sm: UI.btnSm,
    md: UI.btnMd,
    lg: UI.btnLg,
  };

  const variants = {
    primary: UI.btnPrimary,
    secondary: UI.btnSecondary,
    danger: UI.btnDanger,
    soft: UI.btnSoft,
  };

  return (
    <button
      type="button"
      className={cn(
        UI.btnBase,
        sizes[size],
        variants[variant],
        UI.ring,
        className,
        loading && "opacity-70 cursor-wait",
      )}
      onClick={onClick}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Spinner /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  );
};

const Alert = ({ type = "error", children, onClose }) => {
  const styles = {
    error: "bg-white border-[#CBD5E1] text-black",
    success: "bg-[#2e66a6]/10 border-[#2e66a6]/25 text-[#2e66a6]",
    warning: "bg-white border-[#CBD5E1] text-black",
    info: "bg-[#2e66a6]/10 border-[#2e66a6]/25 text-[#2e66a6]",
  };

  const icons = {
    error: <SvgIcon name="x" className="w-5 h-5 text-black/70" />,
    success: <SvgIcon name="check" className="w-5 h-5 text-[#2e66a6]" />,
    warning: <SvgIcon name="pause" className="w-5 h-5 text-black/70" />,
    info: <SvgIcon name="check" className="w-5 h-5 text-[#2e66a6]" />,
  };

  return (
    <div
      className={cn("border rounded-2xl p-4", styles[type])}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{icons[type]}</div>
        <div className="flex-1 text-sm font-medium">{children}</div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className={cn(
              UI.btnBase,
              UI.btnSm,
              UI.btnSecondary,
              UI.ring,
              "!h-8 !px-2",
            )}
            aria-label="Close alert"
          >
            <span className="text-black/70">✕</span>
          </button>
        )}
      </div>
    </div>
  );
};

const InfoCard = ({ icon, label, value, className }) => (
  <div
    className={cn(
      UI.inset,
      "p-4 transition hover:border-black/20 hover:shadow-[0_8px_18px_rgba(0,0,0,0.05)]",
      className,
    )}
  >
    <div className="flex items-start gap-3">
      {icon && (
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F1F5F9] text-black/55">
          {icon}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className={UI.label}>{label}</p>
        <p className={cn(UI.value, "mt-1 break-words")}>{value || "—"}</p>
      </div>
    </div>
  </div>
);

// ======================= HELPERS =======================
const formatDate = (dateString, includeTime = true) => {
  if (!dateString) return "—";
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return "—";

  const options = {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "Asia/Manila",
  };

  if (includeTime) {
    options.hour = "2-digit";
    options.minute = "2-digit";
  }

  return d.toLocaleDateString("en-PH", options);
};

const formatFileSize = (bytes) => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
};

const formatSkills = (technicalSkills, softSkills) => {
  const normalize = (value) => {
    if (Array.isArray(value)) {
      return value.map((item) => String(item || "").trim()).filter(Boolean);
    }
    if (typeof value === "string") {
      return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
    return [];
  };

  const merged = [...normalize(technicalSkills), ...normalize(softSkills)];
  return [...new Set(merged)].join(", ");
};

const documentTypes = [
  { key: "validId", label: "Valid ID", icon: "document" },
  { key: "cv", label: "Resume", icon: "document" },
  { key: "diploma", label: "Diploma", icon: "document" },
  { key: "tor", label: "TOR", icon: "document" },
  { key: "sss", label: "SSS", icon: "document" },
  { key: "philhealth", label: "PhilHealth", icon: "document" },
  { key: "pagibig", label: "Pag-IBIG", icon: "document" },
  { key: "tin", label: "TIN", icon: "document" },
];

const RESUBMISSION_REASONS = [
  "Blurry or unreadable document",
  "Incomplete document",
  "Incorrect document upload",
  "Information does not match your profile",
  "Expired Credential",
  "Missing required pages",
  "Low-quality image",
  "Other",
];

const DECLINE_REASONS = [...RESUBMISSION_REASONS];

const ReasonDropdown = ({ value, onChange, options, placeholder = "Add a clear reason..." }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-lg border bg-white px-3 text-left text-[13px] font-normal leading-5 shadow-sm transition",
          "border-[#CBD5E1] text-[#475467] hover:border-[#94A3B8]",
          "focus:outline-none focus:ring-2 focus:ring-[#2e66a6]/20",
          isOpen && "border-[#2e66a6] ring-2 ring-[#2e66a6]/10",
        )}
      >
        <span className={cn("truncate", !value && "text-[#98A2B3]")}>{value || placeholder}</span>
        <svg className={cn("ml-3 h-4 w-4 shrink-0 text-[#98A2B3] transition-transform", isOpen && "rotate-180")} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {isOpen ? (
        <div
          className="absolute left-0 right-0 top-full z-[80] mt-1 max-h-[220px] overflow-y-auto rounded-lg border border-[#D0D5DD] bg-white py-1 shadow-[0_12px_30px_rgba(15,23,42,0.18)]"
          role="listbox"
        >
          {options.map((option) => (
            <button
              key={option}
              type="button"
              role="option"
              aria-selected={value === option}
              onClick={() => {
                onChange(option);
                setIsOpen(false);
              }}
              className={cn(
                "block w-full px-3 py-2 text-left text-[13px] font-normal leading-5 transition",
                value === option
                  ? "bg-[#EEF4FB] text-[#245487]"
                  : "text-[#344054] hover:bg-[#F2F4F7] hover:text-[#1D2939]",
              )}
            >
              {option}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
};

// ======================= MAIN PAGE =======================
const JobseekerVerificationDetails = () => {
  const { id } = useParams();

  const [jobseeker, setJobseeker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [showHoldModal, setShowHoldModal] = useState(false);

  const [declineMessage, setDeclineMessage] = useState("");
  const [declineReason, setDeclineReason] = useState("");

  const [holdDocTypes, setHoldDocTypes] = useState([]);
  const [holdReason, setHoldReason] = useState("");
  const [holdSelectedReason, setHoldSelectedReason] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [credentialPassword, setCredentialPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [pendingCredentialAction, setPendingCredentialAction] = useState(null);
  const [showCredentialPassword, setShowCredentialPassword] = useState(false);
  const [checkingDoc, setCheckingDoc] = useState("");
  const [verifyCredential, setVerifyCredential] = useState(null);
  const [approvalPassword, setApprovalPassword] = useState("");
  const [showRestoreModal, setShowRestoreModal] = useState(false);

  const API_BASE = api?.defaults?.baseURL || "";
  const DEFAULT_DECLINE_MESSAGE =
    "Your verification request was rejected. Please contact support.";
  const DEFAULT_DECLINE_REASON = "Verification requirements were not met.";

  const buildFileUrl = (url) => {
    if (!url) return "";
    if (/^https?:\/\//i.test(url)) return url;
    return `${API_BASE}${url}`;
  };

  const getFileNameFromUrl = (url, fallback = "document") => {
    if (!url) return fallback;

    try {
      const cleanUrl = url.split("?")[0];
      const fileName = cleanUrl.split("/").filter(Boolean).pop();
      return fileName || fallback;
    } catch {
      return fallback;
    }
  };

  const getDownloadFileName = (
    contentDisposition,
    fallbackName = "document",
    contentType = "",
  ) => {
    const disposition = String(contentDisposition || "");
    const utfMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
    const normalMatch = disposition.match(/filename="?([^";]+)"?/i);

    const extensionByContentType = {
      "application/pdf": "pdf",
      "image/png": "png",
      "image/jpeg": "jpg",
      "image/jpg": "jpg",
      "image/gif": "gif",
      "image/webp": "webp",
    };

    const ensureExtension = (fileName) => {
      const cleanFileName = String(fileName || fallbackName).trim() || fallbackName;
      if (/\.[a-z0-9]{1,10}$/i.test(cleanFileName)) return cleanFileName;

      const cleanContentType = String(contentType || "")
        .split(";")[0]
        .trim()
        .toLowerCase();
      const extension = extensionByContentType[cleanContentType];

      return extension ? `${cleanFileName}.${extension}` : cleanFileName;
    };

    try {
      if (utfMatch?.[1]) return ensureExtension(decodeURIComponent(utfMatch[1]));
      if (normalMatch?.[1]) return ensureExtension(normalMatch[1]);
    } catch {
      return ensureExtension(fallbackName);
    }

    return ensureExtension(fallbackName);
  };

  const fetchDocumentBlob = async (
    docType,
    disposition = "inline",
    password = "",
  ) => {
    const response = await api.get(
      `/admin/jobseekers/verification/${id}/docs/${docType}`,
      {
        params: { disposition },
        responseType: "blob",
        headers: {
          "x-admin-password": password,
        },
      },
    );

    const contentType =
      response.headers?.["content-type"] || "application/octet-stream";
    const fileName = getDownloadFileName(
      response.headers?.["content-disposition"],
      docType,
      contentType,
    );
    const blob = new Blob([response.data], { type: contentType });
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const startsWith = (...signature) =>
      signature.every((value, index) => bytes[index] === value);
    const cleanContentType = String(contentType).split(";")[0].trim().toLowerCase();

    if (cleanContentType === "application/pdf") {
      const header = new TextDecoder("ascii").decode(bytes.slice(0, 5));
      const tail = new TextDecoder("latin1").decode(
        bytes.slice(Math.max(0, bytes.length - 2048)),
      );
      if (header !== "%PDF-" || !tail.includes("%%EOF")) {
        throw new Error(
          "The stored PDF is invalid or corrupted. Please ask the user to resubmit a valid PDF file.",
        );
      }
    } else if (
      cleanContentType === "image/jpeg" &&
      !startsWith(0xff, 0xd8, 0xff)
    ) {
      throw new Error(
        "The stored image is invalid or corrupted. Please ask the user to resubmit a valid image.",
      );
    } else if (
      cleanContentType === "image/png" &&
      !startsWith(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)
    ) {
      throw new Error(
        "The stored image is invalid or corrupted. Please ask the user to resubmit a valid image.",
      );
    }

    return { blob, fileName, contentType };
  };

  const closePasswordModal = () => {
    if (passwordLoading) return;
    setShowPasswordModal(false);
    setShowCredentialPassword(false);
    setCredentialPassword("");
    setPasswordError("");
    setPendingCredentialAction(null);
  };

  const requestCredentialAccess = (action, docType, label = "credential") => {
    setPendingCredentialAction({ action, docType, label });
    setCredentialPassword("");
    setShowCredentialPassword(false);
    setPasswordError("");
    setShowPasswordModal(true);
  };

  const performViewFile = async (docType, password) => {
    const previewWindow = window.open("", "_blank");

    if (!previewWindow) {
      throw new Error("Please allow pop-ups to view this credential.");
    }

    try {
      const { blob, fileName, contentType } = await fetchDocumentBlob(
        docType,
        "inline",
        password,
      );
      const blobUrl = window.URL.createObjectURL(blob);
      const previewDocument = previewWindow.document;

      previewDocument.title = fileName || docType;
      previewDocument.body.innerHTML = "";
      previewDocument.body.style.margin = "0";
      previewDocument.body.style.background = "#f1f5f9";
      previewDocument.body.style.fontFamily = "Arial, sans-serif";

      const toolbar = previewDocument.createElement("div");
      toolbar.style.display = "flex";
      toolbar.style.alignItems = "center";
      toolbar.style.justifyContent = "space-between";
      toolbar.style.gap = "16px";
      toolbar.style.padding = "12px 18px";
      toolbar.style.background = "#ffffff";
      toolbar.style.borderBottom = "1px solid #cbd5e1";

      const title = previewDocument.createElement("strong");
      title.textContent = fileName || docType;
      title.style.overflow = "hidden";
      title.style.textOverflow = "ellipsis";
      title.style.whiteSpace = "nowrap";

      const downloadButton = previewDocument.createElement("a");
      downloadButton.href = blobUrl;
      downloadButton.download = fileName || docType;
      downloadButton.textContent = "Download";
      downloadButton.style.flexShrink = "0";
      downloadButton.style.padding = "9px 16px";
      downloadButton.style.borderRadius = "8px";
      downloadButton.style.background = "#2e66a6";
      downloadButton.style.color = "#ffffff";
      downloadButton.style.fontSize = "14px";
      downloadButton.style.fontWeight = "700";
      downloadButton.style.textDecoration = "none";

      toolbar.appendChild(title);
      toolbar.appendChild(downloadButton);
      previewDocument.body.appendChild(toolbar);

      const previewContentType = String(blob.type || contentType || "").toLowerCase();
      if (previewContentType.startsWith("image/")) {
        const image = previewDocument.createElement("img");
        image.src = blobUrl;
        image.alt = fileName || docType;
        image.style.display = "block";
        image.style.maxWidth = "calc(100% - 32px)";
        image.style.maxHeight = "calc(100vh - 90px)";
        image.style.margin = "16px auto";
        image.style.objectFit = "contain";
        previewDocument.body.appendChild(image);
      } else {
        const embeddedDocument = previewDocument.createElement("embed");
        embeddedDocument.src = blobUrl;
        embeddedDocument.type = previewContentType || "application/pdf";
        embeddedDocument.title = fileName || docType;
        embeddedDocument.style.display = "block";
        embeddedDocument.style.width = "100%";
        embeddedDocument.style.height = "calc(100vh - 62px)";
        embeddedDocument.style.border = "0";
        previewDocument.body.appendChild(embeddedDocument);
      }

      previewWindow.addEventListener(
        "beforeunload",
        () => window.URL.revokeObjectURL(blobUrl),
        { once: true },
      );
      window.setTimeout(() => window.URL.revokeObjectURL(blobUrl), 10 * 60 * 1000);
    } catch (viewError) {
      previewWindow.close();
      throw viewError;
    }
  };

  const performDownloadFile = async (docType, fallbackName, password) => {
    const { blob, fileName } = await fetchDocumentBlob(
      docType,
      "attachment",
      password,
    );
    const blobUrl = window.URL.createObjectURL(blob);
    const downloadLink = document.createElement("a");

    downloadLink.href = blobUrl;
    downloadLink.download = fileName || fallbackName;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();

    window.setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
  };

  const confirmCredentialAccess = async () => {
    if (!credentialPassword.trim()) {
      setPasswordError("Please enter your password.");
      return;
    }

    if (!pendingCredentialAction) return;

    try {
      setPasswordLoading(true);
      setPasswordError("");

      if (pendingCredentialAction.action === "view") {
        await performViewFile(
          pendingCredentialAction.docType,
          credentialPassword,
        );
      } else if (pendingCredentialAction.action === "download") {
        await performDownloadFile(
          pendingCredentialAction.docType,
          pendingCredentialAction.label,
          credentialPassword,
        );
      } else {
        await fetchDocumentBlob(
          pendingCredentialAction.docType,
          "inline",
          credentialPassword,
        );

        setApprovalPassword(credentialPassword);
        if (pendingCredentialAction.action === "approveAccount") {
          setShowApproveModal(true);
        } else if (pendingCredentialAction.action === "approveCredential") {
          setVerifyCredential({
            key: pendingCredentialAction.docType,
            label: pendingCredentialAction.label,
          });
        }
      }

      setShowPasswordModal(false);
      setCredentialPassword("");
      setPendingCredentialAction(null);
    } catch (credentialError) {
      console.error("Credential access error:", credentialError);

      let serverMessage = "";

      if (credentialError.response?.data instanceof Blob) {
        try {
          const errorText = await credentialError.response.data.text();
          const parsedError = JSON.parse(errorText);
          serverMessage = parsedError?.message || "";
        } catch {
          serverMessage = "";
        }
      } else {
        serverMessage =
          credentialError.response?.data?.message ||
          credentialError.message ||
          "";
      }

      if (credentialError.response?.status === 401) {
        setPasswordError(
          serverMessage || "Incorrect password. Please try again.",
        );
      } else {
        setPasswordError(
          serverMessage ||
            "Unable to access this credential. Please try again.",
        );
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleViewFile = (docType, label = "credential") => {
    requestCredentialAccess("view", docType, label);
  };

  const handleDownloadFile = (docType, fallbackName = "document") => {
    requestCredentialAccess("download", docType, fallbackName);
  };

  const handleCheckFile = async (docType) => {
    try {
      setCheckingDoc(docType);
      setError("");
      const response = await api.patch(
        `/admin/jobseekers/verification/${id}/docs/${docType}/check`,
        {},
        { headers: { "x-admin-password": approvalPassword } },
      );
      setSuccess(response.data?.message || "Document marked as checked.");
      await fetchJobseekerDetails();
    } catch (checkError) {
      setError(
        checkError.response?.data?.message || "Unable to check this document.",
      );
    } finally {
      setCheckingDoc("");
    }
  };

  const restoreJobseeker = async () => {
    try {
      setActionLoading(true);
      const response = await api.patch(
        `/admin/jobseekers/verification/${id}/restore`,
      );
      setSuccess(response.data?.message || "Jobseeker restored successfully.");
      setShowRestoreModal(false);
      await fetchJobseekerDetails();
    } catch (restoreError) {
      setError(
        restoreError.response?.data?.message || "Unable to restore jobseeker.",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const fetchJobseekerDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const res = await api.get(`/admin/jobseekers/verification/${id}`);

      if (res.data?.success) {
        setJobseeker(res.data.jobseeker);
        setReviewNotes(
          res.data.jobseeker?.verificationSummary?.adminRemarks || "",
        );
      } else {
        setError("Jobseeker not found");
      }
    } catch (e) {
      console.error("Error fetching jobseeker details:", e);
      setError(
        e.response?.data?.message || "Failed to load jobseeker details.",
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchJobseekerDetails();
  }, [fetchJobseekerDetails]);

  useEffect(() => {
    if (!success) return undefined;

    const successTimer = window.setTimeout(() => {
      setSuccess("");
    }, 3000);

    return () => window.clearTimeout(successTimer);
  }, [success]);

  const resetDeclineModal = () => {
    setShowDeclineModal(false);
    setDeclineMessage("");
    setDeclineReason("");
  };

  const resetHoldModal = () => {
    setShowHoldModal(false);
    setHoldDocTypes([]);
    setHoldReason("");
    setHoldSelectedReason("");
  };

  const toggleHoldDocType = (docKey) => {
    setHoldDocTypes((prev) => (prev.includes(docKey) ? [] : [docKey]));
  };

  const handleStatusUpdate = async (
    newStatus,
    remarks = "",
    extraPayload = {},
  ) => {
    try {
      setActionLoading(true);
      setError("");
      setSuccess("");

      const res = await api.put(`/admin/jobseekers/verification/${id}/status`, {
        overallStatus: newStatus,
        adminRemarks: remarks,
        ...(newStatus === "verified" ? { adminPassword: approvalPassword } : {}),
        ...extraPayload,
      });

      if (res.data?.success) {
        const successLabel =
          newStatus === "verified"
            ? "approved"
            : newStatus === "rejected"
              ? "declined"
              : newStatus;

        setSuccess(`Jobseeker ${successLabel} successfully.`);
        await fetchJobseekerDetails();
        setShowApproveModal(false);
        setApprovalPassword("");
        resetDeclineModal();
      } else {
        setError("Failed to update status.");
      }
    } catch (e) {
      console.error("Error updating status:", e);
      setError(
        e.response?.data?.message || "Failed to update verification status.",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleHoldSubmit = async () => {
    if (holdDocTypes.length === 0) {
      setError("Please select at least one document that needs resubmission.");
      return;
    }

    if (!holdSelectedReason && !holdReason.trim()) {
      setError("Please select a reason or write a message for the user.");
      return;
    }

    const selectedDocs = documentTypes
      .filter((doc) => holdDocTypes.includes(doc.key))
      .map((doc) => ({ key: doc.key, label: doc.label }));

    try {
      setActionLoading(true);
      setError("");
      setSuccess("");

      const finalHoldMessage = [holdSelectedReason, holdReason.trim()]
        .filter(Boolean)
        .join(" — ");
      const res = await api.put(`/admin/jobseekers/verification/${id}/hold`, {
        docType: holdDocTypes[0],
        docTypes: holdDocTypes,
        requestedDocuments: selectedDocs,
        reasonMessage: finalHoldMessage,
      });

      if (res.data?.success) {
        setSuccess(
          res.data?.message ||
            "Jobseeker placed on hold and resubmission request sent successfully.",
        );
        await fetchJobseekerDetails();
        resetHoldModal();
      } else {
        setError("Failed to place jobseeker on hold.");
      }
    } catch (e) {
      console.error("Error placing jobseeker on hold:", e);
      setError(
        e.response?.data?.message || "Failed to place jobseeker on hold.",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeclineSubmit = async () => {
    const finalDeclineMessage =
      declineMessage.trim() || declineReason || DEFAULT_DECLINE_MESSAGE;
    const remarks = `Declined verification request. Message to user: ${finalDeclineMessage}`;

    await handleStatusUpdate("rejected", remarks, {
      rejectionReasons: [declineReason || DEFAULT_DECLINE_REASON],
      declineMessage: finalDeclineMessage,
      rejectionMessage: finalDeclineMessage,
    });
  };

  const getStatusBadge = (status) => {
    const s = (status || "not_submitted").toLowerCase();
    if (s === "verified") return <Badge variant="success">Approved</Badge>;
    if (s === "pending") return <Badge variant="warning">Pending</Badge>;
    if (s === "rejected") return <Badge variant="danger">Declined</Badge>;
    if (s === "hold") return <Badge variant="warning">On Hold</Badge>;
    return <Badge variant="neutral">Not Submitted</Badge>;
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className={UI.page}>
          <div className={cn(UI.card, "p-10")}>
            <div className="flex flex-col items-center justify-center gap-3">
              <Spinner className="w-10 h-10 text-[#2e66a6]" />
              <p className="text-sm text-black/70">
                Loading jobseeker details…
              </p>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error && !jobseeker) {
    return (
      <AdminLayout>
        <div className={UI.page}>
          <div className={cn(UI.card, "p-10 text-center")}>
            <div className="mx-auto w-14 h-14 rounded-2xl bg-[#FDF2F2] border border-[#F3D1D1] flex items-center justify-center text-[#B42318]">
              <SvgIcon name="x" className="w-7 h-7" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-black">Error</h3>
            <p className="mt-2 text-sm text-black/70">{error}</p>
            <div className="mt-6">
              <Link
                to="/admin/jobseeker-verification"
                className={cn(UI.btnBase, UI.btnLg, UI.btnPrimary, UI.ring)}
              >
                <SvgIcon name="back" className="w-4 h-4" />
                Back to List
              </Link>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!jobseeker) {
    return (
      <AdminLayout>
        <div className={UI.page}>
          <div className={cn(UI.card, "p-10 text-center")}>
            <div className="mx-auto w-14 h-14 rounded-2xl bg-[#F5F7FA] border border-[#E2E8F0] flex items-center justify-center text-black/50">
              <SvgIcon name="user" className="w-7 h-7" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-black">Not Found</h3>
            <p className="mt-2 text-sm text-black/70">
              The jobseeker you're looking for doesn't exist or has been
              removed.
            </p>
            <div className="mt-6">
              <Link
                to="/admin/jobseeker-verification"
                className={cn(UI.btnBase, UI.btnLg, UI.btnSecondary, UI.ring)}
              >
                <SvgIcon name="back" className="w-4 h-4" />
                Back to List
              </Link>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const profile = jobseeker.jobSeekerProfile || {};
  const verificationSummary = jobseeker.verificationSummary || {};
  const documentDetails = jobseeker.documentDetails || {};
  const firstSubmittedDocument = documentTypes.find(
    (docType) => Boolean(documentDetails[docType.key]?.url),
  );

  const overallStatus = verificationSummary.overallStatus || "not_submitted";
  const isApproved = overallStatus === "verified";
  const isRejected = overallStatus === "rejected";
  const followUpDocumentTypes = ["sss", "philhealth", "pagibig", "tin"];
  const hasPendingFollowUpCredential = followUpDocumentTypes.some((docType) => {
    const document = documentDetails[docType] || {};
    const status = String(document.status || "").toLowerCase();
    return Boolean(document.url) && ["pending", "submitted", "hold", "action_needed"].includes(status);
  });
  const isFollowUpReview = jobseeker.isVerified === true && hasPendingFollowUpCredential;
  const canShowActionButtons = !isApproved && !isRejected;
  const fullName =
    `${jobseeker.firstName || ""} ${jobseeker.middleName || ""} ${jobseeker.lastName || ""}`
      .replace(/\s+/g, " ")
      .trim();
  const displayPhone = profile.phoneNumber || profile.mobileNumber || "—";
  const submittedCount = verificationSummary.submittedCount || 0;
  const totalDocs = verificationSummary.totalDocs || 8;
  const combinedSkills = formatSkills(
    profile.technicalSkills,
    profile.softSkills,
  );

  const registrationId =
    jobseeker.registrationId ||
    `JS-${new Date(jobseeker.createdAt || Date.now()).getFullYear()}-${String(
      jobseeker._id || "",
    )
      .slice(-6)
      .toUpperCase()}`;

  const completeName = [
    jobseeker.firstName,
    jobseeker.middleName,
    jobseeker.lastName,
    jobseeker.extensionName,
  ]
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(" ");

  const infoRowsLeft = [
    ["Full Name", completeName],
    ["Campus", profile.campus],
    ["Course", profile.course],
    ["Year Graduated", profile.yearGraduated],
  ];

  const infoRowsRight = [
    ["Preferred Work Mode", profile.preferredWorkMode],
    ["Email", jobseeker.email],
    ["Contact Number", displayPhone],
    ["Date Registered", formatDate(jobseeker.createdAt, true)],
  ];

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl px-1 py-8">
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-black sm:text-3xl">
            Account Review
          </h1>
          <p className="mt-1 text-sm text-black/60">
            Review and verify job seeker account registrations and submitted
            documents.
          </p>
        </div>

        {error && (
          <Alert type="error" onClose={() => setError("")}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert type="success" onClose={() => setSuccess("")}>
            {success}
          </Alert>
        )}

        <div className="rounded-xl border border-black/15 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-5 flex flex-col gap-4 border-b border-black/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <Link
              to="/admin/jobseeker-verification"
              className={cn(
                "inline-flex w-fit items-center gap-2 text-sm font-semibold text-[#2e66a6] hover:text-[#245487]",
                UI.ring,
              )}
            >
              <SvgIcon name="back" className="h-4 w-4" />
              Back to List
            </Link>
            {canShowActionButtons ? (
              <div className="flex flex-wrap items-center gap-2">
                {!isFollowUpReview ? (
                  <>
                <button
                  type="button"
                  onClick={() => firstSubmittedDocument && requestCredentialAccess("approveAccount", firstSubmittedDocument.key, "approve this Job Seeker")}
                  disabled={actionLoading}
                  className={cn(
                    "inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#2e66a6] px-4 text-sm font-bold text-white shadow-sm hover:bg-[#255587] disabled:opacity-50",
                    UI.ring,
                  )}
                >
                  <SvgIcon name="check" className="h-4 w-4" />
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeclineModal(true)}
                  disabled={actionLoading}
                  className={cn(
                    "inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-black/15 bg-white px-4 text-sm font-bold text-black shadow-sm hover:bg-black/5 disabled:opacity-50",
                    UI.ring,
                  )}
                >
                  <SvgIcon name="x" className="h-4 w-4" />
                  Decline
                </button>
                  </>
                ) : null}
                <button
                  type="button"
                  onClick={() => setShowHoldModal(true)}
                  disabled={actionLoading}
                  className={cn(
                    "inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-black px-4 text-sm font-bold text-white shadow-sm hover:bg-black/90 disabled:opacity-50",
                    UI.ring,
                  )}
                >
                  <SvgIcon name="pause" className="h-4 w-4" />
                  Hold
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {getStatusBadge(overallStatus)}
                {isRejected ? (
                  <button
                    type="button"
                    onClick={() => setShowRestoreModal(true)}
                    disabled={actionLoading}
                    className={cn(
                      "inline-flex h-10 items-center justify-center rounded-lg border border-[#2e66a6] px-4 text-sm font-bold text-[#2e66a6]",
                      UI.ring,
                    )}
                  >
                    Restore
                  </button>
                ) : null}
              </div>
            )}
          </div>

          <section className="rounded-xl border border-black/15 bg-white p-4 sm:p-5">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-[#2e66a6]">
                <SvgIcon name="user" className="h-5 w-5" />
                <h2 className="text-base font-bold">Job Seeker Information</h2>
              </div>

              {canShowActionButtons ? (
                <div className="hidden flex-wrap items-center gap-2">
                  {!isFollowUpReview ? (
                    <>
                  <button
                    type="button"
                    onClick={() => firstSubmittedDocument && requestCredentialAccess("approveAccount", firstSubmittedDocument.key, "approve this Job Seeker")}
                    disabled={actionLoading}
                    className={cn(
                      "inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#2e66a6] px-4 text-sm font-bold text-white hover:bg-[#255587] disabled:opacity-50",
                      UI.ring,
                    )}
                  >
                    <SvgIcon name="check" className="h-4 w-4" />
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeclineModal(true)}
                    disabled={actionLoading}
                    className={cn(
                      "inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#2e66a6] bg-white px-4 text-sm font-bold text-[#2e66a6] hover:bg-[#2e66a6]/10 disabled:opacity-50",
                      UI.ring,
                    )}
                  >
                    <SvgIcon name="x" className="h-4 w-4" />
                    Decline
                  </button>
                    </>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setShowHoldModal(true)}
                    disabled={actionLoading}
                    className={cn(
                      "inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-black px-4 text-sm font-bold text-white hover:bg-black/90 disabled:opacity-50",
                      UI.ring,
                    )}
                  >
                    <SvgIcon name="pause" className="h-4 w-4" />
                    Hold
                  </button>
                </div>
              ) : (
                <div className="hidden items-center gap-2">
                  {getStatusBadge(overallStatus)}
                  {isRejected ? (
                    <button
                      type="button"
                      onClick={() => setShowRestoreModal(true)}
                      disabled={actionLoading}
                      className={cn(
                        "inline-flex h-10 items-center justify-center rounded-lg border border-[#2e66a6] px-4 text-sm font-bold text-[#2e66a6]",
                        UI.ring,
                      )}
                    >
                      Restore
                    </button>
                  ) : null}
                </div>
              )}
            </div>

            <div className="grid gap-5 lg:grid-cols-[1fr_1fr_220px]">
              <div className="space-y-2">
                {infoRowsLeft.map(([label, value]) => (
                  <div
                    key={label}
                    className="grid grid-cols-[120px_1fr] gap-3 text-sm"
                  >
                    <span className="text-black/60">{label}:</span>
                    <span className="font-semibold text-black">
                      {value || "—"}
                    </span>
                  </div>
                ))}
              </div>

              <div className="space-y-2 border-black/15 lg:border-l lg:pl-6">
                {infoRowsRight.map(([label, value]) => (
                  <div
                    key={label}
                    className="grid grid-cols-[150px_1fr] gap-3 text-sm"
                  >
                    <span className="text-black/65">{label}:</span>
                    <span className="font-semibold text-black">
                      {value || "—"}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col items-center justify-center">
                {jobseeker.profileImage ? (
                  <img
                    src={buildFileUrl(jobseeker.profileImage)}
                    alt={`${fullName} registration`}
                    className="h-36 w-36 rounded-full border-4 border-black/10 object-cover shadow-sm"
                  />
                ) : (
                  <div className="flex h-36 w-36 items-center justify-center rounded-full border-4 border-black/10 bg-white text-[#94A3B8] shadow-sm">
                    <SvgIcon name="user" className="h-16 w-16" />
                  </div>
                )}

                <span
                  className={cn(
                    "mt-3 rounded-full border px-3 py-1 text-xs font-semibold",
                    jobseeker.profileImage
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-black/15 bg-white text-black/60",
                  )}
                >
                  {jobseeker.profileImage
                    ? "ID Photo Submitted"
                    : "No Photo Submitted"}
                </span>
              </div>
            </div>
          </section>

          <section className="mt-4 rounded-xl border border-black/15 bg-white p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <SvgIcon name="document" className="h-5 w-5 text-[#2e66a6]" />
              <h2 className="text-base font-bold text-[#2e66a6]">
                Credentials
              </h2>
              <span className="text-xs font-semibold text-[#2e66a6]">
                ({submittedCount}/{totalDocs} Submitted)
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
              {documentTypes.map((docType, index) => {
                const doc = documentDetails[docType.key] || {};
                const hasFile = Boolean(doc.url);
                const credentialStatus = String(
                  doc.status || (doc.checked ? "approved" : hasFile ? "pending" : "not_submitted"),
                ).toLowerCase();
                const credentialApproved = credentialStatus === "approved" || doc.checked;
                const credentialNeedsAction = ["hold", "rejected", "action_needed"].includes(credentialStatus);
                const credentialStatusLabel = credentialApproved
                  ? "Approved"
                  : credentialNeedsAction
                    ? "Action Needed"
                    : ["pending", "submitted"].includes(credentialStatus)
                      ? "Pending"
                      : "Not submitted";
                const fileName =
                  doc.filename || getFileNameFromUrl(doc.url, docType.label);
                const fileSize = formatFileSize(doc.fileSize);

                return (
                  <article
                    key={docType.key}
                    className="flex min-h-[160px] flex-col rounded-lg border border-black/15 bg-white p-3"
                  >
                    <div className="flex items-start gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#2e66a6]/10 text-xs font-bold text-[#2e66a6]">
                        {index + 1}
                      </span>
                      <h3 className="min-w-0 text-xs font-bold leading-5 text-black/75">
                        {docType.label}
                      </h3>
                    </div>

                    <span
                      className={cn(
                        "mt-2 inline-flex w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        credentialApproved
                          ? "bg-emerald-50 text-emerald-700"
                          : credentialNeedsAction
                            ? "bg-red-50 text-red-700"
                            : hasFile
                              ? "bg-amber-50 text-amber-700"
                              : "bg-black/5 text-black/50",
                      )}
                    >
                      {credentialStatusLabel}
                    </span>

                    <div className="mt-3 flex flex-1 items-start gap-2">
                      <div
                        className={cn(
                          "flex h-10 w-9 shrink-0 items-center justify-center rounded",
                          hasFile
                            ? "bg-red-50 text-red-600"
                            : "bg-black/5 text-black/45",
                        )}
                      >
                        <SvgIcon name="document" className="h-5 w-5" />
                      </div>

                      <div className="min-w-0">
                        <p
                          className="truncate text-[11px] font-semibold text-black/75"
                          title={fileName}
                        >
                          {hasFile ? fileName : "No file"}
                        </p>
                        {fileSize ? (
                          <p className="mt-1 text-[10px] text-black/45">
                            ({fileSize})
                          </p>
                        ) : null}
                      </div>
                    </div>

                    {hasFile ? (
                      <div className="mt-3 grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            handleViewFile(docType.key, docType.label)
                          }
                          className={cn(
                            "flex h-8 items-center justify-center rounded border border-black/15 bg-white text-[#2e66a6] hover:bg-[#2e66a6]/10",
                            UI.ring,
                          )}
                          aria-label={`View ${docType.label}`}
                          title={`View ${docType.label}`}
                        >
                          <SvgIcon name="eye" className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => requestCredentialAccess("approveCredential", docType.key, docType.label)}
                          disabled={
                            checkingDoc === docType.key ||
                            credentialApproved ||
                            !["pending", "submitted"].includes(credentialStatus)
                          }
                          className={cn(
                            "flex h-8 items-center justify-center rounded border border-black/15 text-black/70",
                            credentialApproved
                              ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                              : "bg-white hover:bg-black/5",
                            UI.ring,
                          )}
                          aria-label={`Check ${docType.label}`}
                          title={
                            credentialApproved
                              ? `${docType.label} checked`
                              : `Check ${docType.label}`
                          }
                        >
                          <SvgIcon name="check" className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="mt-3 flex h-8 items-center justify-center rounded border border-black/15 bg-white text-[11px] font-semibold text-black/45">
                        Not submitted
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      </div>

      {showRestoreModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="restore-jobseeker-title">
            <div className="px-6 pt-6">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#2e66a6]/10 text-[#2e66a6]"><SvgIcon name="restore" className="h-6 w-6" /></div>
              <h3 id="restore-jobseeker-title" className="mt-4 text-center text-xl font-bold text-black">Restore {jobseeker?.fullName || "Job Seeker"}</h3>
              <p className="mt-2 text-center text-sm leading-6 text-black/65">Are you sure you want to restore <strong>{jobseeker?.fullName || "this Job Seeker"}</strong>? This action will allow the Job Seeker to proceed with verification and review process again.</p>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
              <button type="button" onClick={() => setShowRestoreModal(false)} disabled={actionLoading} className={cn("h-10 rounded-lg border border-slate-300 bg-white text-sm font-semibold text-black", UI.ring)}>Cancel</button>
              <button type="button" onClick={restoreJobseeker} disabled={actionLoading} className={cn("h-10 rounded-lg bg-[#2e66a6] text-sm font-bold text-white disabled:opacity-50", UI.ring)}>{actionLoading ? "Restoring..." : "Restore"}</button>
            </div>
          </div>
        </div>
      )}

      {verifyCredential && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4">
          <div
            className="w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="verify-credential-title"
          >
            <div className="flex items-start justify-between px-5 pt-5">
              <div>
                <h3
                  id="verify-credential-title"
                  className="text-lg font-bold text-black"
                >
                  Approve {verifyCredential.label} Credential?
                </h3>
                <p className="mt-1 text-sm text-[#2e66a6]">
                  This will confirm that the <strong>{verifyCredential.label}</strong> credential has been reviewed and verified.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setVerifyCredential(null)}
                disabled={Boolean(checkingDoc)}
                className="rounded p-1 text-black/60 hover:bg-black/5"
                aria-label="Close"
              >
                <SvgIcon name="x" className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4">
              <button
                type="button"
                onClick={() => setVerifyCredential(null)}
                disabled={Boolean(checkingDoc)}
                className={cn(
                  "h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-black shadow-sm",
                  UI.ring,
                )}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={Boolean(checkingDoc)}
                onClick={async () => {
                  const target = verifyCredential;
                  await handleCheckFile(target.key);
                  setVerifyCredential(null);
                }}
                className={cn(
                  "inline-flex h-10 items-center justify-center rounded-lg bg-[#2e66a6] px-4 text-sm font-bold text-white shadow-sm hover:bg-[#255587] disabled:opacity-50",
                  UI.ring,
                )}
              >
                {checkingDoc ? "Approving..." : "Approve"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPasswordModal && (
        <div className="fixed inset-0 z-[60] overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/45"
              onClick={closePasswordModal}
              aria-hidden="true"
            />

            <div
              className="relative w-full max-w-md overflow-hidden rounded-2xl border border-black/15 bg-white shadow-2xl"
              role="dialog"
              aria-modal="true"
              aria-labelledby="credential-password-title"
            >
              <div className="p-6 sm:p-7">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#2e66a6]/10 text-[#2e66a6]">
                  <SvgIcon
                    name={
                      pendingCredentialAction?.action === "download"
                        ? "download"
                        : "eye"
                    }
                    className="h-6 w-6"
                  />
                </div>

                <h3
                  id="credential-password-title"
                  className="mt-4 text-center text-2xl font-bold text-black"
                >
                  Enter Password
                </h3>

                <p className="mt-2 text-center text-sm leading-6 text-black/65">
                  Enter your admin password to{" "}
                  {pendingCredentialAction?.action === "download"
                    ? "download"
                    : pendingCredentialAction?.action === "view"
                      ? "view"
                      : "approve"}{" "}
                  {pendingCredentialAction?.label || "this credential"}.
                </p>

                <div className="mt-5">
                  <label
                    htmlFor="credentialPassword"
                    className="block text-sm font-semibold text-black"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="credentialPassword"
                      type={showCredentialPassword ? "text" : "password"}
                      value={credentialPassword}
                      onChange={(event) => {
                        setCredentialPassword(event.target.value);
                        setPasswordError("");
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          confirmCredentialAccess();
                        }
                      }}
                      autoFocus
                      disabled={passwordLoading}
                      className={cn(
                        "mt-2 h-11 w-full rounded-xl border bg-white px-4 pr-12 text-sm text-black placeholder-black/35",
                        passwordError ? "border-black" : "border-black/20",
                        UI.ring,
                      )}
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowCredentialPassword((value) => !value)
                      }
                      className="absolute right-3 top-1/2 mt-1 -translate-y-1/2 text-black/55"
                      aria-label={
                        showCredentialPassword
                          ? "Hide password"
                          : "Show password"
                      }
                    >
                      <SvgIcon name={showCredentialPassword ? "eyeOff" : "eye"} className="h-5 w-5" />
                    </button>
                  </div>

                  {passwordError ? (
                    <p
                      className="mt-2 text-sm font-medium text-black"
                      role="alert"
                    >
                      {passwordError}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 border-t border-black/10 bg-white px-6 py-4">
                <button
                  type="button"
                  onClick={closePasswordModal}
                  disabled={passwordLoading}
                  className={cn(
                    "h-11 rounded-xl border border-black/20 bg-white text-sm font-semibold text-black hover:bg-black/5 disabled:opacity-50",
                    UI.ring,
                  )}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={confirmCredentialAccess}
                  disabled={passwordLoading}
                  className={cn(
                    "flex h-11 items-center justify-center gap-2 rounded-xl bg-[#2e66a6] text-sm font-semibold text-white hover:bg-[#2e66a6]/90 disabled:opacity-50",
                    UI.ring,
                  )}
                >
                  {passwordLoading ? <Spinner /> : null}
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showApproveModal && !isApproved && !isRejected && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4 sm:p-6">
            <div
              className="fixed inset-0 bg-black/45 backdrop-blur-[1px]"
              onClick={() => !actionLoading && setShowApproveModal(false)}
              aria-hidden="true"
            />

            <div
              className="relative w-full max-w-[375px] overflow-hidden rounded-xl border border-[#D8E0EA] bg-[#F8FAFC] shadow-[0_18px_50px_rgba(15,23,42,0.24)]"
              role="dialog"
              aria-modal="true"
              aria-labelledby="confirm-approval-title"
              aria-describedby="confirm-approval-description"
            >
              <button
                type="button"
                onClick={() => !actionLoading && setShowApproveModal(false)}
                disabled={actionLoading}
                className="absolute right-4 top-4 rounded p-1 text-[#667085] hover:bg-black/5"
                aria-label="Close approval modal"
              >
                <SvgIcon name="x" className="h-4 w-4" />
              </button>
              <div className="px-5 pb-5 pt-7 sm:px-6">
                <div className="mx-auto text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#EEF6FF] text-[#2e66a6]">
                    <SvgIcon name="check" className="h-5 w-5" />
                  </div>

                  <h3
                    id="confirm-approval-title"
                    className="mt-4 text-[25px] font-bold leading-tight tracking-[-0.03em] text-black"
                  >
                    Verified {fullName}?
                  </h3>

                  <div
                    id="confirm-approval-description"
                    className="mt-3 text-sm leading-6 text-[#667085]"
                  >
                    <p>Are you sure you want to verified this Job Seeker?</p>
                    <p>
                      This will confirm that{" "}
                      <span className="font-bold text-black">{fullName}</span>{" "}
                      has been reviewed and verified as a PHINMA AU graduate.
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t border-[#D8E0EA] bg-[#F8FAFC] px-5 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    variant="secondary"
                    size="lg"
                    className="w-full !h-10 rounded-lg text-sm"
                    onClick={() => setShowApproveModal(false)}
                    disabled={actionLoading}
                  >
                    Cancel
                  </Button>

                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full !h-10 rounded-lg text-sm !bg-[#2e66a6] hover:!bg-[#255587]"
                    onClick={() =>
                      handleStatusUpdate("verified", "Approved by admin")
                    }
                    loading={actionLoading}
                    disabled={actionLoading}
                  >
                    Verified
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showHoldModal && !isApproved && !isRejected && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4 sm:p-6">
            <div
              className="fixed inset-0 bg-black/45 backdrop-blur-[1px]"
              onClick={() => !actionLoading && resetHoldModal()}
              aria-hidden="true"
            />

            <div
              className="relative w-full max-w-[480px] overflow-visible rounded-xl border border-[#D8E0EA] bg-[#F8FAFC] shadow-[0_18px_50px_rgba(15,23,42,0.24)]"
              role="dialog"
              aria-modal="true"
              aria-labelledby="hold-modal-title"
            >
              <button
                type="button"
                onClick={() => !actionLoading && resetHoldModal()}
                disabled={actionLoading}
                className="absolute right-4 top-4 z-10 rounded p-1 text-[#667085] hover:bg-black/5"
                aria-label="Close resubmission modal"
              >
                <SvgIcon name="x" className="h-4 w-4" />
              </button>
              <div className="max-h-[82vh] overflow-y-auto px-5 pb-4 pt-5 sm:px-6">
                <div>
                  <div className="flex items-start gap-3 pr-6">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EEF6FF] text-[#2e66a6]">
                      <SvgIcon name="pause" className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h3
                        id="hold-modal-title"
                        className="text-xl font-bold leading-tight tracking-[-0.02em] text-black"
                      >
                        Request Resubmission
                      </h3>

                      <p className="mt-2 text-sm leading-5 text-[#667085]">
                        Select the documents that need to be resubmitted and
                        choose at least one reason or write message for{" "}
                        <span className="font-bold text-black">{fullName}</span>
                        .
                      </p>
                    </div>
                  </div>

                  <div className="mt-5">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#475467]">
                      Documents needed
                    </p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {documentTypes.filter((doc) => {
                        const status = String(documentDetails[doc.key]?.status || "").toLowerCase();
                        return ["pending", "submitted", "hold"].includes(status);
                      }).map((doc) => {
                        const checked = holdDocTypes.includes(doc.key);

                        return (
                          <label
                            key={doc.key}
                            className={cn(
                              "flex min-h-9 cursor-pointer select-none items-center gap-3 rounded-lg border px-3 py-2 transition",
                              checked
                                ? "border-[#2e66a6]/50 bg-[#2e66a6]/[0.08]"
                                : "border-[#D8E0EA] bg-white/85 hover:border-[#2e66a6]/30 hover:bg-[#2e66a6]/[0.04]",
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleHoldDocType(doc.key)}
                              className="h-4 w-4 rounded border border-[#94A3B8] text-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]"
                            />
                            <span className="text-sm sm:text-[15px] font-medium text-black/75">
                              {doc.label}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="mb-1 block text-xs font-medium text-[#475467]">
                      Reason for Resubmission (Select at least one reason){" "}
                      <span className="text-[#667085]">(Optional)</span>
                    </label>
                    <ReasonDropdown
                      value={holdSelectedReason}
                      onChange={setHoldSelectedReason}
                      options={RESUBMISSION_REASONS}
                    />
                  </div>

                  <div className="mt-4">
                    <label className="mb-1 block text-sm font-semibold text-black">
                      Message to {fullName}
                    </label>
                    <textarea
                      value={holdReason}
                      onChange={(e) => setHoldReason(e.target.value)}
                      rows={4}
                      placeholder="Explain what needs to be corrected or re-uploaded."
                      className="w-full resize-none rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-sm leading-5 text-black placeholder:text-black/35 focus:border-[#2e66a6] focus:outline-none focus:ring-2 focus:ring-[#2e66a6]/20"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-[#D8E0EA] bg-[#F8FAFC] px-5 py-3 sm:px-6">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="secondary"
                    size="lg"
                    className="!h-10 rounded-lg border-[#CBD5E1] px-5 text-sm"
                    onClick={resetHoldModal}
                    disabled={actionLoading}
                  >
                    Cancel
                  </Button>

                  <Button
                    variant="primary"
                    size="lg"
                    className="!h-10 rounded-lg px-5 text-sm !bg-[#2e66a6] hover:!bg-[#255587]"
                    onClick={handleHoldSubmit}
                    disabled={
                      !holdDocTypes.length ||
                      (!holdSelectedReason && !holdReason.trim()) ||
                      actionLoading
                    }
                    loading={actionLoading}
                  >
                    Send
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeclineModal && !isApproved && !isRejected && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4 sm:p-6">
            <div
              className="fixed inset-0 bg-black/45 backdrop-blur-[1px]"
              onClick={() => !actionLoading && resetDeclineModal()}
              aria-hidden="true"
            />

            <div
              className="relative w-full max-w-[430px] overflow-visible rounded-xl border border-[#D8E0EA] bg-[#F8FAFC] shadow-[0_18px_50px_rgba(15,23,42,0.24)]"
              role="dialog"
              aria-modal="true"
              aria-labelledby="decline-modal-title"
            >
              <button
                type="button"
                onClick={() => !actionLoading && resetDeclineModal()}
                disabled={actionLoading}
                className="absolute right-4 top-4 rounded p-1 text-[#667085] hover:bg-black/5"
                aria-label="Close decline modal"
              >
                <SvgIcon name="x" className="h-4 w-4" />
              </button>
              <div className="px-5 pb-4 pt-5 sm:px-6">
                <div className="flex items-start gap-3 pr-6">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FEE4E2] text-[#D92D20]">
                    <SvgIcon
                      name="dangerTriangle"
                      className="h-5 w-5 text-[#D92D20]"
                    />
                  </div>

                  <div className="min-w-0">
                    <h3
                      id="decline-modal-title"
                      className="text-xl font-bold leading-tight tracking-[-0.02em] text-black"
                    >
                      Decline Verification
                    </h3>

                    <p className="mt-2 text-sm leading-5 text-[#667085]">
                      Are you sure you want to decline{" "}
                      <span className="font-bold text-black">{fullName}</span>?
                      The Job Seeker will be notified that they do not meet the
                      PHINMA AU Graduate requirements.
                    </p>
                  </div>
                </div>

                <div className="mt-5">
                  <label className="mb-1 block text-xs font-medium leading-5 text-[#475467]">
                    Reason for Declining{" "}
                    <span className="font-semibold text-black">{fullName}</span>{" "}
                    (Select at least one reason){" "}
                    <span className="text-[#667085]">(Optional)</span>
                  </label>
                  <ReasonDropdown
                    value={declineReason}
                    onChange={setDeclineReason}
                    options={DECLINE_REASONS}
                  />
                </div>

                <div className="mt-4">
                  <label className="mb-1 block text-sm font-semibold text-black">
                    Message to {fullName}
                  </label>
                  <textarea
                    value={declineMessage}
                    onChange={(e) => setDeclineMessage(e.target.value)}
                    rows={4}
                    placeholder="Add a clear reason why the credential was not verified and what the Job Seeker needs to do next."
                    className="w-full resize-none rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-sm leading-5 text-black placeholder:text-black/45 focus:border-[#2e66a6] focus:outline-none focus:ring-2 focus:ring-[#2e66a6]/20"
                  />
                </div>
              </div>

              <div className="border-t border-[#E2E8F0] bg-[#F8FAFC] px-5 py-3 sm:px-6">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="secondary"
                    size="lg"
                    className="!h-10 rounded-lg border-[#CBD5E1] px-5 text-sm"
                    onClick={resetDeclineModal}
                    disabled={actionLoading}
                  >
                    Cancel
                  </Button>

                  <Button
                    variant="primary"
                    size="lg"
                    className="!h-10 rounded-lg px-5 text-sm !bg-[#2e66a6] hover:!bg-[#255587]"
                    onClick={handleDeclineSubmit}
                    disabled={actionLoading}
                    loading={actionLoading}
                  >
                    Decline
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default JobseekerVerificationDetails;
