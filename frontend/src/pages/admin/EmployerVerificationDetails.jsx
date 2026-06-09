// src/pages/admin/EmployerVerificationDetails.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../../services/api";
import AdminLayout from "../../layouts/AdminLayout";

const cn = (...classes) => classes.filter(Boolean).join(" ");

// ======================= UI TOKENS =======================
const UI = {
  // 60/30/10 palette rule:
  // 60% = #FFFFFF canvas/paper, 30% = soft structural surfaces, 10% = #2e66a6 highlights/actions.
  page: "mx-auto max-w-7xl px-1 py-8",
  section: "space-y-6",

  // Surfaces
  card: "bg-[#F8FAFC] border border-[#E2E8F0] rounded-3xl shadow-[0_8px_24px_rgba(15,23,42,0.05)]",
  cardSoft: "bg-[#F8FAFC] border border-[#E2E8F0] rounded-3xl shadow-[0_10px_28px_rgba(15,23,42,0.06)]",
  inset: "bg-[#FFFFFF]/85 border border-[#E2E8F0] rounded-2xl shadow-[0_1px_0_rgba(15,23,42,0.03)]",
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

  btnPrimary: "bg-[#2e66a6] text-white shadow-[0_8px_18px_rgba(46,102,166,0.22)] hover:bg-[#255587]",
  btnSecondary: "bg-[#FFFFFF] text-black border border-[#CBD5E1] hover:bg-[#F1F5F9]",
  btnDanger: "bg-[#FFFFFF] text-black border border-[#CBD5E1] hover:bg-[#F1F5F9]",
  btnSoft: "bg-[#EEF4FB] text-[#2e66a6] border border-[#BFD3EA] hover:bg-[#E2EDF8]",

  // Badges
  badgeBase: "inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border",
};

const Spinner = ({ className = "w-4 h-4" }) => (
  <svg className={`${className} animate-spin`} viewBox="0 0 24 24" aria-hidden="true">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
  </svg>
);

const SvgIcon = ({ name, className = "w-5 h-5" }) => {
  const icons = {
    back: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
      </svg>
    ),
    eye: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
        />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    check: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    x: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 9l-6 6m0-6l6 6" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    building: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M3 21h18M6 21V4a1 1 0 011-1h10a1 1 0 011 1v17M9 7h1m-1 3h1m-1 3h1m4-6h1m-1 3h1m-1 3h1"
        />
      </svg>
    ),
    doc: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    ),
    download: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 3v10m0 0l3-3m-3 3l-3-3M4 17v3a1 1 0 001 1h14a1 1 0 001-1v-3" />
      </svg>
    ),
    link: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M13.828 10.172a4 4 0 010 5.656l-1.414 1.414a4 4 0 01-5.656 0 4 4 0 010-5.656l1.06-1.06"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M10.172 13.828a4 4 0 010-5.656l1.414-1.414a4 4 0 015.656 0 4 4 0 010 5.656l-1.06 1.06"
        />
      </svg>
    ),
    info: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 16h-1v-4h-1m1-4h.01" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    pause: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10 9v6m4-6v6" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    warning: (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" fill="#EEF2FF" />
        <path d="M12 7v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="12" cy="15.5" r="1" fill="currentColor" />
      </svg>
    ),
  };

  return icons[name] || null;
};

// ======================= SMALL COMPONENTS =======================
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
  const sizes = { sm: UI.btnSm, md: UI.btnMd, lg: UI.btnLg };
  const variants = {
    primary: UI.btnPrimary,
    secondary: UI.btnSecondary,
    danger: UI.btnDanger,
    soft: UI.btnSoft,
  };

  return (
    <button
      type="button"
      className={cn(UI.btnBase, sizes[size], variants[variant], UI.ring, className, loading && "opacity-70 cursor-wait")}
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
    info: <SvgIcon name="building" className="w-5 h-5 text-[#2e66a6]" />,
  };

  return (
    <div className={cn("border rounded-2xl p-4", styles[type])} role="alert" aria-live="polite">
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{icons[type] || null}</div>
        <div className="flex-1 text-sm font-medium">{children}</div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className={cn(UI.btnBase, UI.btnSm, UI.btnSecondary, UI.ring, "!h-8 !px-2")}
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
  <div className={cn(UI.inset, "p-4 transition hover:border-black/20 hover:shadow-[0_8px_18px_rgba(0,0,0,0.05)]", className)}>
    <div className="flex items-start gap-3">
      {icon && <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F1F5F9] text-black/55">{icon}</div>}
      <div className="min-w-0 flex-1">
        <p className={UI.label}>{label}</p>
        <p className={cn(UI.value, "mt-1 break-words")}>{value || "—"}</p>
      </div>
    </div>
  </div>
);

const WebsiteCard = ({ label = "Website", url }) => {
  const hasUrl = !!url && String(url).trim() !== "";
  const safeUrl = hasUrl ? String(url).trim() : "";
  return (
    <div className={cn(UI.inset, "p-4 transition hover:border-black/20 hover:shadow-[0_8px_18px_rgba(0,0,0,0.05)]")}>
      <p className={UI.label}>{label}</p>

      {hasUrl ? (
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className={cn(UI.value, "truncate")} title={safeUrl}>
            {safeUrl}
          </p>

          <a
            href={safeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(UI.btnBase, UI.btnSm, UI.btnSoft, UI.ring, "!h-9 !px-3 shrink-0")}
          >
            <SvgIcon name="link" className="w-4 h-4" />
            Open website
          </a>
        </div>
      ) : (
        <p className={cn(UI.value, "mt-1")}>—</p>
      )}
    </div>
  );
};

const Modal = ({ open, companyName, onClose, onConfirm, loading, disabled }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4 sm:p-6">
        <div
          className="fixed inset-0 bg-black/45 backdrop-blur-[1px]"
          onClick={() => !loading && onClose()}
          aria-hidden="true"
        />

        <div
          className="relative w-full max-w-[440px] rounded-[22px] bg-[#F8FAFC] border border-[#D8E0EA] shadow-[0_18px_50px_rgba(15,23,42,0.18)] overflow-hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-approval-title"
          aria-describedby="confirm-approval-description"
        >
          <div className="px-6 pt-6 pb-5 sm:px-7">
            <div className="mx-auto text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2e66a6]/10 text-[#2e66a6]">
                <SvgIcon name="check" className="w-6 h-6" />
              </div>

              <h3
                id="confirm-approval-title"
                className="mt-4 text-[24px] sm:text-[28px] leading-tight font-bold tracking-[-0.02em] text-black"
              >
                Confirm Approval
              </h3>

              <div
                id="confirm-approval-description"
                className="mt-3 space-y-3 text-[15px] leading-7 text-[#475467]"
              >
                <p>
                  Are you sure you want to approve <span className="font-bold">{companyName}</span>? Please ensure that
                  you have thoroughly reviewed all submitted documents and verified their eligibility.
                  <span className="inline-flex align-middle ml-2 text-black/80">
                    <SvgIcon name="info" className="w-4 h-4" />
                  </span>
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-[#D8E0EA] bg-[#EEF2F6] px-5 py-4 sm:px-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                variant="secondary"
                size="lg"
                className="w-full !h-11 rounded-[14px] text-sm"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </Button>

              <Button
                variant="primary"
                size="lg"
                className="w-full !h-11 rounded-[14px] text-sm !bg-[#2e66a6] hover:!bg-[#255587]"
                onClick={onConfirm}
                loading={loading}
                disabled={disabled || loading}
              >
                Confirm
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ======================= CONSTANTS / RULES =======================
const allowedTransitions = {
  unverified: ["pending", "hold", "verified", "rejected"],
  pending: ["hold", "verified", "rejected"],
  hold: ["pending", "verified", "rejected"],
  rejected: ["pending", "hold"],
  verified: [],
};

const normalizeStatus = (s) => (s || "unverified").toLowerCase();
const canTransition = (from, to) => (allowedTransitions[normalizeStatus(from)] || []).includes(normalizeStatus(to));

const DOC_TYPES = [
  { key: "secRegistration", label: "SEC Registration", folder: "sec" },
  { key: "birRegistration", label: "BIR Registration", folder: "bir" },
  { key: "dtiRegistration", label: "DTI Registration", folder: "dti" },
  { key: "cityPermit", label: "City/Municipality Permit", folder: "city" },
  { key: "businessPermit", label: "Business Permit", folder: "business" },
];

const EMPLOYER_REJECTION_REASONS = [
  "Unclear document",
  "Expired business permit",
  "Business name mismatch",
  "Invalid registration number",
  "Suspicious/fake document",
  "Prohibited business type",
  "Incomplete submission",
  "Address mismatch",
  "Missing required documents",
  "Others",
];

// ======================= HELPERS =======================
const toPublicUrl = (path) => {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (path.startsWith("/uploads")) return `https://phinmaau-job-portal-atlas.onrender.com${path}`;
  return path;
};

const niceDateTime = (date) => {
  if (!date) return "—";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-PH", { timeZone: "Asia/Manila" });
};

const getFileName = (url) => {
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/");
    return parts[parts.length - 1] || "document";
  } catch {
    const parts = String(url).split("/");
    return parts[parts.length - 1] || "document";
  }
};

const fileTypeLabel = (url) => {
  const name = getFileName(url).toLowerCase();
  if (name.endsWith(".pdf")) return "PDF";
  if (name.endsWith(".png") || name.endsWith(".jpg") || name.endsWith(".jpeg") || name.endsWith(".webp")) return "Image";
  return "File";
};

const statusBadge = (status) => {
  const s = normalizeStatus(status);
  if (s === "verified") return <Badge variant="success">Verified</Badge>;
  if (s === "pending") return <Badge variant="warning">Pending</Badge>;
  if (s === "hold") return <Badge variant="warning">On Hold</Badge>;
  if (s === "rejected") return <Badge variant="danger">Declined</Badge>;
  return <Badge variant="neutral">Unverified</Badge>;
};

const DocumentCard = ({
  label,
  hasFile,
  meta,
  onView,
  onDownload,
  disabled,
}) => {
  return (
    <div
      className={cn(
        "flex min-h-[64px] w-full items-center justify-between gap-4 rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF]/90 px-4 py-3 transition hover:border-[#2e66a6]/30 hover:bg-white hover:shadow-[0_8px_18px_rgba(15,23,42,0.05)] sm:px-5"
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center text-[#2e66a6]" aria-hidden="true">
          <SvgIcon name="doc" className="w-5 h-5" />
        </span>

        <div className="min-w-0">
          <p className="truncate text-[15px] sm:text-base font-semibold text-black" title={label}>
            {label}
          </p>

        </div>
      </div>

      {hasFile ? (
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onView}
            disabled={disabled}
            className={cn(
              "inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#E2E8F0] bg-white text-black transition hover:border-[#2e66a6]/30 hover:bg-[#2e66a6]/[0.06]",
              UI.ring,
              disabled && "cursor-not-allowed opacity-50"
            )}
            title="View"
            aria-label={`View ${label}`}
          >
            <SvgIcon name="eye" className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onDownload}
            disabled={disabled}
            className={cn(
              "inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#E2E8F0] bg-white text-black transition hover:border-[#2e66a6]/30 hover:bg-[#2e66a6]/[0.06]",
              UI.ring,
              disabled && "cursor-not-allowed opacity-50"
            )}
            title="Download"
            aria-label={`Download ${label}`}
          >
            <SvgIcon name="download" className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <span className="shrink-0 rounded-full border border-[#E2E8F0] px-3 py-1 text-xs font-bold text-black/45">No file</span>
      )}
    </div>
  );
};

// ======================= MAIN PAGE =======================
const EmployerVerificationDetails = () => {
  const { employerId } = useParams();

  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState(null);

  const [employer, setEmployer] = useState(null);
  const [logoFailed, setLogoFailed] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [remarks, setRemarks] = useState("");
  const [showHoldModal, setShowHoldModal] = useState(false);
  const [holdDocTypes, setHoldDocTypes] = useState([]);
  const [holdReason, setHoldReason] = useState("");

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReasons, setRejectionReasons] = useState([]);
  const [rejectionMessage, setRejectionMessage] = useState("");

  const [confirm, setConfirm] = useState({ open: false, nextStatus: null });

  const DEFAULT_REJECTION_MESSAGE = "Your verification request was rejected. Please contact support.";
  const DEFAULT_REJECTION_REASON = "Verification requirements were not met.";

  const fetchDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const res = await api.get(`/admin/employers/verification/${employerId}`);
      if (res.data?.success) {
        setEmployer(res.data.employer);

        const existingRemarks = res.data.employer?.employerProfile?.verificationDocs?.remarks || "";
        setRemarks(existingRemarks);

        setLogoFailed(false);
      } else {
        setEmployer(null);
        setError("Employer not found.");
      }
    } catch (e) {
      setEmployer(null);
      setError(e.response?.data?.message || "Failed to load employer details.");
    } finally {
      setLoading(false);
    }
  }, [employerId]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const company = employer?.employerProfile || {};
  const companyName = company.companyName || "No Company Name";
  const logoUrl = toPublicUrl(company.companyLogo);

  const docs = employer?.employerProfile?.verificationDocs || {};
  const overallStatus = docs?.overallStatus || "unverified";
  const isVerified = normalizeStatus(overallStatus) === "verified";
  const isRejected = normalizeStatus(overallStatus) === "rejected";
  const canShowActionButtons = !isVerified && !isRejected;

  const docsComplete = useMemo(() => {
    const hasBusinessReg = !!(docs?.secRegistration?.url || docs?.birRegistration?.url || docs?.dtiRegistration?.url);
    const hasCityPermit = !!docs?.cityPermit?.url;
    return hasBusinessReg && hasCityPermit;
  }, [docs]);

  const missingDocsMessage = useMemo(() => {
    const hasBusinessReg = !!(docs?.secRegistration?.url || docs?.birRegistration?.url || docs?.dtiRegistration?.url);
    const hasCityPermit = !!docs?.cityPermit?.url;
    if (!hasBusinessReg && !hasCityPermit) return "Missing: Business Registration (SEC/BIR/DTI) + City Permit";
    if (!hasBusinessReg) return "Missing: Business Registration (SEC, BIR, or DTI)";
    if (!hasCityPermit) return "Missing: City/Municipality Permit";
    return "Documents complete";
  }, [docs]);

  const resetHoldModal = () => {
    setShowHoldModal(false);
    setHoldDocTypes([]);
    setHoldReason("");
  };

  const resetRejectModal = () => {
    setShowRejectModal(false);
    setRejectionReasons([]);
    setRejectionMessage("");
  };

  const toggleRejectReason = (reason) => {
    setRejectionReasons((prev) =>
      prev.includes(reason) ? prev.filter((item) => item !== reason) : [...prev, reason]
    );
  };

  const toggleHoldDocType = (docKey) => {
    setHoldDocTypes((prev) =>
      prev.includes(docKey) ? prev.filter((item) => item !== docKey) : [...prev, docKey]
    );
  };

  const validateBeforeUpdate = (newStatus) => {
    const target = normalizeStatus(newStatus);

    if (!canTransition(overallStatus, target)) {
      setError(`Invalid status change: ${normalizeStatus(overallStatus)} → ${target}`);
      return false;
    }

    if (target === "verified" && !docsComplete) {
      setError(`Cannot approve. ${missingDocsMessage}`);
      return false;
    }

    return true;
  };

  const updateStatus = async (newStatus, intent) => {
    try {
      setAction(intent);
      setError("");
      setSuccess("");

      if (!validateBeforeUpdate(newStatus)) return;

      const res = await api.put(`/admin/employers/verification/${employerId}/status`, {
        overallStatus: normalizeStatus(newStatus),
        remarks: (remarks || "").trim(),
      });

      if (res.data?.success) {
        setSuccess(res.data.message || "Updated successfully.");
        await fetchDetails();
      } else {
        setError("Failed to update verification.");
      }
    } catch (e) {
      setError(e.response?.data?.message || "Failed to update verification.");
    } finally {
      setAction(null);
    }
  };

  const handleRejectSubmit = async () => {
    const finalRejectionMessage = rejectionMessage.trim() || DEFAULT_REJECTION_MESSAGE;

    try {
      setAction("reject");
      setError("");
      setSuccess("");

      const res = await api.put(`/admin/employers/verification/${employerId}/status`, {
        overallStatus: "rejected",
        rejectionReasons: rejectionReasons.length ? rejectionReasons : [DEFAULT_REJECTION_REASON],
        rejectionMessage: finalRejectionMessage,
        remarks: finalRejectionMessage,
      });

      if (res.data?.success) {
        setSuccess(res.data?.message || "Employer declined successfully.");
        await fetchDetails();
        resetRejectModal();
      } else {
        setError("Failed to decline employer.");
      }
    } catch (e) {
      setError(e.response?.data?.message || "Failed to decline employer.");
    } finally {
      setAction(null);
    }
  };

  const handleHoldSubmit = async () => {
    if (holdDocTypes.length === 0) {
      setError("Please select at least one document that needs resubmission.");
      return;
    }

    if (!holdReason.trim()) {
      setError("Please provide the reason/message for hold.");
      return;
    }

    try {
      setAction("hold");
      setError("");
      setSuccess("");

      const res = await api.put(`/admin/employers/verification/${employerId}/hold`, {
        docType: holdDocTypes[0],
        docTypes: holdDocTypes,
        reasonMessage: holdReason.trim(),
      });

      if (res.data?.success) {
        setSuccess(res.data?.message || "Employer placed on HOLD and resubmit email sent successfully.");
        await fetchDetails();
        resetHoldModal();
      } else {
        setError("Failed to place employer on HOLD.");
      }
    } catch (e) {
      setError(e.response?.data?.message || "Failed to place employer on HOLD.");
    } finally {
      setAction(null);
    }
  };

  const getDownloadFileName = (contentDisposition, fallbackName = "document") => {
    const disposition = String(contentDisposition || "");
    const utfMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
    const normalMatch = disposition.match(/filename="?([^";]+)"?/i);

    try {
      if (utfMatch?.[1]) return decodeURIComponent(utfMatch[1]);
      if (normalMatch?.[1]) return normalMatch[1];
    } catch {
      return fallbackName;
    }

    return fallbackName;
  };

  const fetchDocumentBlob = async (docType, disposition = "inline") => {
    const response = await api.get(`/admin/employers/verification/${employerId}/docs/${docType}`, {
      params: { disposition },
      responseType: "blob",
    });

    const contentType = response.headers?.["content-type"] || "application/octet-stream";
    const fileName = getDownloadFileName(response.headers?.["content-disposition"], docType);
    const blob = new Blob([response.data], { type: contentType });

    return { blob, fileName };
  };

  const openDoc = async (docType) => {
    try {
      const { blob } = await fetchDocumentBlob(docType, "inline");
      const blobUrl = window.URL.createObjectURL(blob);
      window.open(blobUrl, "_blank", "noopener,noreferrer");
      window.setTimeout(() => window.URL.revokeObjectURL(blobUrl), 60000);
    } catch (viewError) {
      console.error("Error viewing file:", viewError);
      setError(viewError.response?.data?.message || "Unable to open this credential. Please try again.");
    }
  };

  const downloadDoc = async (docType, fallbackName = "document") => {
    try {
      const { blob, fileName } = await fetchDocumentBlob(docType, "attachment");
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");

      a.href = blobUrl;
      a.download = fileName || fallbackName;
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(blobUrl);
    } catch (downloadError) {
      console.error("Error downloading file:", downloadError);
      setError(downloadError.response?.data?.message || "Unable to download this credential. Please try again.");
    }
  };

  const openConfirm = (nextStatus) => {
    setError("");
    setSuccess("");
    setConfirm({ open: true, nextStatus: normalizeStatus(nextStatus) });
  };

  const closeConfirm = () => setConfirm({ open: false, nextStatus: null });

  if (loading) {
    return (
      <AdminLayout>
        <div className={UI.page}>
          <div className={cn(UI.card, "p-10")}>
            <div className="flex flex-col items-center justify-center gap-3">
              <Spinner className="w-10 h-10 text-[#2e66a6]" />
              <p className="text-sm text-black/70">Loading employer details…</p>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!employer) {
    return (
      <AdminLayout>
        <div className={UI.page}>
          <div className={cn(UI.card, "p-10 text-center")}>
            <div className="mx-auto w-14 h-14 rounded-2xl bg-[#2e66a6]/5 border border-[#2e66a6]/20 flex items-center justify-center text-black/60">
              <SvgIcon name="building" className="w-7 h-7" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-black">Not Found</h3>
            <p className="mt-2 text-sm text-black/70">The employer you're looking for doesn't exist or has been removed.</p>
            <div className="mt-6 flex items-center justify-center gap-2">
              <Link to="/admin/employer-verification" className={cn(UI.btnBase, UI.btnLg, UI.btnSecondary, UI.ring)}>
                <SvgIcon name="back" className="w-4 h-4" />
                Back to List
              </Link>
              <button onClick={fetchDetails} className={cn(UI.btnBase, UI.btnLg, UI.btnPrimary, UI.ring)}>
                Retry
              </button>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className={UI.page}>
        <div className={UI.section}>
          <div className="flex flex-col gap-4">
            <div className="flex items-center">
              <Link
                to="/admin/employer-verification"
                className={cn(
                  "inline-flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.06)] text-black font-medium hover:bg-gray-50",
                  UI.ring
                )}
              >
                <SvgIcon name="back" className="w-5 h-5" />
                Back to Employer Details
              </Link>
            </div>
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

          <div className={cn(UI.cardSoft, "overflow-hidden")}>
            <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4 min-w-0">
                <div className="h-16 w-16 rounded-2xl bg-white border border-[#E2E8F0] overflow-hidden flex items-center justify-center shrink-0 shadow-sm">
                  {logoUrl && !logoFailed ? (
                    <img
                      src={logoUrl}
                      alt="Company logo"
                      className="h-full w-full object-contain"
                      onError={() => setLogoFailed(true)}
                    />
                  ) : (
                    <span className="text-2xl font-bold text-[#2e66a6]" aria-hidden="true">
                      {companyName?.trim()?.[0]?.toUpperCase() || "C"}
                    </span>
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg sm:text-xl font-bold text-black truncate" title={companyName}>
                      {companyName}
                    </h2>
                    {statusBadge(overallStatus)}
                  </div>
                  <p className="text-sm text-black/70 truncate" title={company.businessEmail || employer.email || ""}>
                    {company.businessEmail || employer.email || "—"}
                  </p>

                  {!docsComplete && <p className="mt-2 text-xs text-black/70">{missingDocsMessage}</p>}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                {canShowActionButtons ? (
                  <>
                    <Button
                      variant="primary"
                      size="md"
                      onClick={() => openConfirm("verified")}
                      disabled={!docsComplete || action !== null || !canTransition(overallStatus, "verified")}
                      loading={false}
                      leftIcon={<SvgIcon name="check" className="w-4 h-4" />}
                      title={!docsComplete ? missingDocsMessage : "Approve employer"}
                    >
                      Approve
                    </Button>

                    <Button
                      variant="soft"
                      size="md"
                      onClick={() => setShowHoldModal(true)}
                      disabled={action !== null || !canTransition(overallStatus, "hold")}
                      leftIcon={<SvgIcon name="pause" className="w-4 h-4" />}
                    >
                      Hold
                    </Button>

                    <Button
                      variant="danger"
                      size="md"
                      onClick={() => setShowRejectModal(true)}
                      disabled={action !== null || !canTransition(overallStatus, "rejected")}
                      loading={action === "reject"}
                      leftIcon={<SvgIcon name="x" className="w-4 h-4" />}
                    >
                      Decline
                    </Button>
                  </>
                ) : (
                  <div className="flex items-center">
                    {statusBadge(overallStatus)}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className={cn(UI.card, "overflow-hidden")}>
            <div className="border-b border-[#E2E8F0] bg-[#EEF2F6] px-5 py-4 sm:px-6">
              <h2 className={UI.h2}>Company Information</h2>
            </div>
            <div className="p-5 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoCard icon={<SvgIcon name="building" className="w-4 h-4" />} label="Company Name" value={company.companyName} />
              <InfoCard label="Business Email" value={company.businessEmail || employer.email} />
              <InfoCard label="Mobile Number" value={company.mobileNumber} />
              <WebsiteCard url={company.companyWebsiteUrl} />
              <InfoCard label="Region / City" value={company.regionCity} />
              </div>
            </div>
          </div>

          <div className={cn(UI.card, "overflow-hidden")}>
            <div className="border-b border-[#E2E8F0] bg-[#EEF2F6] px-5 py-4 sm:px-6">
              <h2 className={UI.h2}>Verification Documents</h2>
            </div>
            <div className="p-5 sm:p-6">

            {!docsComplete && (
              <div className="mt-4">
                <Alert type="warning" onClose={null}>
                  You cannot approve unless at least one <b>Business Registration</b> (SEC/BIR/DTI) and <b>City Permit</b> are uploaded.
                </Alert>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {DOC_TYPES.map((d) => {
                const docData = docs?.[d.key] || {};
                const rawUrl = docData.url || "";
                const hasFile = !!rawUrl;

                const pub = toPublicUrl(rawUrl || "");
                const meta = hasFile ? `${fileTypeLabel(pub)} • ${getFileName(pub)}` : "";
                const uploadedAt = hasFile ? niceDateTime(docData.uploadedAt) : "";

                const isRequired = d.key === "cityPermit";

                return (
                  <DocumentCard
                    key={d.key}
                    label={d.label}
                    hasFile={hasFile}
                    meta={meta}
                    uploadedAt={uploadedAt}
                    isRequired={isRequired}
                    disabled={action !== null}
                    isVerified={isVerified}
                    docStatus={docData.status || "not_submitted"}
                    onView={() => openDoc(d.key)}
                    onDownload={() => downloadDoc(d.key, d.label)}
                  />
                );
              })}
            </div>
            </div>
          </div>

          <Modal
            open={confirm.open && confirm.nextStatus === "verified"}
            companyName={companyName}
            onClose={closeConfirm}
            onConfirm={() => {
              closeConfirm();
              updateStatus("verified", "approve");
            }}
            loading={action === "approve"}
            disabled={!docsComplete || action !== null || !canTransition(overallStatus, "verified")}
          />
        </div>
      </div>

      {showHoldModal && !isVerified && !isRejected && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4 sm:p-6">
            <div className="fixed inset-0 bg-black/45 backdrop-blur-[1px]" onClick={() => !action && resetHoldModal()} aria-hidden="true" />

            <div
              className="relative w-full max-w-2xl rounded-[24px] bg-[#F8FAFC] border border-[#D8E0EA] shadow-[0_18px_50px_rgba(15,23,42,0.18)] overflow-hidden"
              role="dialog"
              aria-modal="true"
              aria-labelledby="hold-modal-title"
            >
              <div className="max-h-[75vh] overflow-y-auto px-6 pt-6 pb-5 sm:px-7">
                <div className="max-w-2xl">
                  <h3 id="hold-modal-title" className="text-[24px] sm:text-[28px] leading-tight font-bold tracking-[-0.02em] text-black">
                    Request Credentials Resubmission
                  </h3>

                  <p className="mt-2 text-[14px] sm:text-[15px] leading-6 text-[#475467]">
                    Select all the document to be resubmitted and provide the message that will be sent to{" "}
                    <span className="font-bold">{companyName}</span>
                  </p>

                  <div className="mt-8">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {DOC_TYPES.map((doc) => {
                        const checked = holdDocTypes.includes(doc.key);

                        return (
                          <label
                            key={doc.key}
                            className="flex min-h-11 items-center gap-3 rounded-2xl border border-[#D8E0EA] bg-white/85 px-3 py-2 cursor-pointer select-none transition hover:border-[#2e66a6]/30 hover:bg-[#2e66a6]/[0.04]"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleHoldDocType(doc.key)}
                              className="h-5 w-5 rounded-md border border-[#94A3B8] text-[#2e66a6] focus:ring-[#2e66a6] focus:ring-2"
                            />
                            <span className="text-sm sm:text-[15px] font-medium text-black/75">{doc.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-8">
                    <label className="block text-sm font-semibold text-[#111827] mb-3">Message to User</label>
                    <textarea
                      value={holdReason}
                      onChange={(e) => setHoldReason(e.target.value)}
                      rows={4}
                      placeholder="Description"
                      className="w-full resize-none rounded-2xl border border-[#CBD5E1] bg-white/90 px-4 py-3 text-sm leading-6 text-black placeholder:text-black/35 focus:border-[#2e66a6] focus:outline-none focus:ring-2 focus:ring-[#2e66a6]/30"
                    />
                  </div>

                  {(!holdDocTypes.length || !holdReason.trim()) && (
                    <p className="mt-5 text-sm text-[#98A2B3]">
                      Please complete the required fields before sending the resubmit link.
                    </p>
                  )}
                </div>
              </div>

              <div className="border-t border-[#D8E0EA] bg-[#EEF2F6] px-6 py-4 sm:px-7">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Button
                    variant="secondary"
                    size="lg"
                    className="w-full !h-11 rounded-[14px] text-sm border-[#CBD5E1]"
                    onClick={resetHoldModal}
                    disabled={!!action}
                  >
                    Cancel
                  </Button>

                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full !h-11 rounded-[14px] text-sm !bg-[#2e66a6] hover:!bg-[#255587]"
                    onClick={handleHoldSubmit}
                    disabled={!holdDocTypes.length || !holdReason.trim() || !!action}
                    loading={action === "hold"}
                  >
                    Send
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showRejectModal && !isVerified && !isRejected && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4 sm:p-6">
            <div
              className="fixed inset-0 bg-black/45 backdrop-blur-[1px]"
              onClick={() => !action && resetRejectModal()}
              aria-hidden="true"
            />

            <div
              className="relative w-full max-w-xl rounded-[24px] bg-[#F8FAFC] border border-[#D8E0EA] shadow-[0_18px_50px_rgba(15,23,42,0.18)] overflow-hidden"
              role="dialog"
              aria-modal="true"
              aria-labelledby="decline-modal-title"
            >
              <div className="px-6 pt-6 pb-5 sm:px-7">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#EEF4FB] text-[#2e66a6]">
                    <SvgIcon name="warning" className="w-6 h-6 text-[#2e66a6]" />
                  </div>

                  <div className="min-w-0">
                    <h3 id="decline-modal-title" className="text-[24px] sm:text-[28px] leading-tight font-bold tracking-[-0.02em] text-black">
                      Declined Verification
                    </h3>
                    <p className="mt-2 text-[14px] sm:text-[15px] leading-6 text-[#475467]">
                      Are you sure you want to decline <span className="font-bold">{companyName}</span>? This action will notify{" "}
                      <span className="font-bold">{companyName}</span> that they do not meet the AU partner requirements.
                    </p>
                  </div>
                </div>

                <div className="mt-6">
                  <label className="block text-sm font-semibold text-black mb-2">
                    Message to User
                  </label>
                  <textarea
                    value={rejectionMessage}
                    onChange={(e) => setRejectionMessage(e.target.value)}
                    rows={4}
                    placeholder="Description"
                    className="w-full resize-none rounded-2xl border border-[#CBD5E1] bg-white/90 px-4 py-3 text-sm leading-6 text-black placeholder:text-black/35 focus:border-[#2e66a6] focus:outline-none focus:ring-2 focus:ring-[#2e66a6]/30"
                  />
                  <p className="mt-3 text-[12px] text-[#98A2B3]">
                    The candidate will receive this message in their notification portal. If left blank, a default rejection message will be used.
                  </p>
                </div>
              </div>

              <div className="border-t border-[#E2E8F0] bg-[#F8FAFC] px-6 py-5 sm:px-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Button
                    variant="secondary"
                    size="lg"
                    className="w-full !h-11 rounded-[14px] text-sm"
                    onClick={resetRejectModal}
                    disabled={action === "reject"}
                  >
                    Cancel
                  </Button>

                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full !h-11 rounded-[14px] text-sm !bg-[#2e66a6] hover:!bg-[#255587]"
                    onClick={handleRejectSubmit}
                    disabled={action === "reject"}
                    loading={action === "reject"}
                  >
                    Confirm
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

export default EmployerVerificationDetails;