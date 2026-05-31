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

// ======================= ICONS =======================
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
    user: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    document: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    ),
    graduation: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 14l9-5-9-5-9 5 9 5zm0 0v6m0-6l-9 5m9-5l9 5" />
      </svg>
    ),
    mail: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M3 8l7.89-4.26a2 2 0 012.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
      </svg>
    ),
    phone: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
        />
      </svg>
    ),
    calendar: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    briefcase: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m-3 0h14a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9a2 2 0 012-2z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 13h18" />
      </svg>
    ),
    download: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 3v12m0 0l4-4m-4 4l-4-4m-5 8h18" />
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
    dangerTriangle: (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" fill="#FEE4E2" />
        <path d="M12 8v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="12" cy="16" r="1" fill="currentColor" />
      </svg>
    ),
  };

  return icons[name] || null;
};

const Spinner = ({ className = "w-4 h-4" }) => (
  <svg className={`${className} animate-spin`} viewBox="0 0 24 24" aria-hidden="true">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
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
    info: <SvgIcon name="check" className="w-5 h-5 text-[#2e66a6]" />,
  };

  return (
    <div className={cn("border rounded-2xl p-4", styles[type])} role="alert" aria-live="polite">
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{icons[type]}</div>
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
  { key: "cv", label: "CV / Resume", icon: "document" },
  { key: "validId", label: "Valid ID", icon: "document" },
  { key: "tin", label: "TIN", icon: "document" },
  { key: "tor", label: "TOR (Transcript of Records)", icon: "document" },
  { key: "diploma", label: "Diploma", icon: "document" },
  { key: "sss", label: "SSS", icon: "document" },
  { key: "philhealth", label: "PhilHealth", icon: "document" },
  { key: "pagibig", label: "Pag-IBIG", icon: "document" },
];

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

  const [holdDocTypes, setHoldDocTypes] = useState([]);
  const [holdReason, setHoldReason] = useState("");

  const API_BASE = api?.defaults?.baseURL || "";
  const DEFAULT_DECLINE_MESSAGE = "Your verification request was rejected. Please contact support.";
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

  const handleDownloadFile = async (url, fallbackName = "document") => {
    const fileUrl = buildFileUrl(url);
    if (!fileUrl) return;

    try {
      const response = await fetch(fileUrl, { credentials: "include" });

      if (!response.ok) {
        throw new Error("Download failed");
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const downloadLink = document.createElement("a");

      downloadLink.href = blobUrl;
      downloadLink.download = getFileNameFromUrl(url, fallbackName);
      document.body.appendChild(downloadLink);
      downloadLink.click();
      downloadLink.remove();

      window.URL.revokeObjectURL(blobUrl);
    } catch (downloadError) {
      console.error("Error downloading file:", downloadError);

      const fallbackLink = document.createElement("a");
      fallbackLink.href = fileUrl;
      fallbackLink.download = getFileNameFromUrl(url, fallbackName);
      fallbackLink.rel = "noopener noreferrer";
      document.body.appendChild(fallbackLink);
      fallbackLink.click();
      fallbackLink.remove();
    }
  };

  const fetchJobseekerDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const res = await api.get(`/admin/jobseekers/verification/${id}`);

      if (res.data?.success) {
        setJobseeker(res.data.jobseeker);
      } else {
        setError("Jobseeker not found");
      }
    } catch (e) {
      console.error("Error fetching jobseeker details:", e);
      setError(e.response?.data?.message || "Failed to load jobseeker details.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchJobseekerDetails();
  }, [fetchJobseekerDetails]);

  const resetDeclineModal = () => {
    setShowDeclineModal(false);
    setDeclineMessage("");
  };

  const resetHoldModal = () => {
    setShowHoldModal(false);
    setHoldDocTypes([]);
    setHoldReason("");
  };

  const toggleHoldDocType = (docKey) => {
    setHoldDocTypes((prev) =>
      prev.includes(docKey) ? prev.filter((item) => item !== docKey) : [...prev, docKey]
    );
  };

  const handleStatusUpdate = async (newStatus, remarks = "", extraPayload = {}) => {
    try {
      setActionLoading(true);
      setError("");
      setSuccess("");

      const res = await api.put(`/admin/jobseekers/verification/${id}/status`, {
        overallStatus: newStatus,
        adminRemarks: remarks,
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
        resetDeclineModal();
      } else {
        setError("Failed to update status.");
      }
    } catch (e) {
      console.error("Error updating status:", e);
      setError(e.response?.data?.message || "Failed to update verification status.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleHoldSubmit = async () => {
    if (holdDocTypes.length === 0) {
      setError("Please select at least one document that needs resubmission.");
      return;
    }

    if (!holdReason.trim()) {
      setError("Please provide the message for the user.");
      return;
    }

    const selectedDocs = documentTypes
      .filter((doc) => holdDocTypes.includes(doc.key))
      .map((doc) => ({ key: doc.key, label: doc.label }));

    try {
      setActionLoading(true);
      setError("");
      setSuccess("");

      const res = await api.put(`/admin/jobseekers/verification/${id}/hold`, {
        docType: holdDocTypes[0],
        docTypes: holdDocTypes,
        requestedDocuments: selectedDocs,
        reasonMessage: holdReason.trim(),
      });

      if (res.data?.success) {
        setSuccess(res.data?.message || "Jobseeker placed on hold and resubmission request sent successfully.");
        await fetchJobseekerDetails();
        resetHoldModal();
      } else {
        setError("Failed to place jobseeker on hold.");
      }
    } catch (e) {
      console.error("Error placing jobseeker on hold:", e);
      setError(e.response?.data?.message || "Failed to place jobseeker on hold.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeclineSubmit = async () => {
    const finalDeclineMessage = declineMessage.trim() || DEFAULT_DECLINE_MESSAGE;
    const remarks = `Declined verification request. Message to user: ${finalDeclineMessage}`;

    await handleStatusUpdate("rejected", remarks, {
      rejectionReasons: [DEFAULT_DECLINE_REASON],
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
              <p className="text-sm text-black/70">Loading jobseeker details…</p>
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
              <Link to="/admin/jobseeker-verification" className={cn(UI.btnBase, UI.btnLg, UI.btnPrimary, UI.ring)}>
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
            <p className="mt-2 text-sm text-black/70">The jobseeker you're looking for doesn't exist or has been removed.</p>
            <div className="mt-6">
              <Link to="/admin/jobseeker-verification" className={cn(UI.btnBase, UI.btnLg, UI.btnSecondary, UI.ring)}>
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

  const overallStatus = verificationSummary.overallStatus || "not_submitted";
  const isApproved = overallStatus === "verified";
  const isRejected = overallStatus === "rejected";
  const canShowActionButtons = !isApproved && !isRejected;
  const fullName = `${jobseeker.firstName || ""} ${jobseeker.middleName || ""} ${jobseeker.lastName || ""}`.replace(/\s+/g, " ").trim();
  const displayPhone = profile.phoneNumber || profile.mobileNumber || "—";
  const submittedCount = verificationSummary.submittedCount || 0;
  const totalDocs = verificationSummary.totalDocs || 8;
  const combinedSkills = formatSkills(profile.technicalSkills, profile.softSkills);

  return (
    <AdminLayout>
      <div className={UI.page}>
        <div className={UI.section}>
          <div className="flex flex-col gap-4">
           <div className="flex items-center">
  <Link
    to="/admin/jobseeker-verification"
    className={cn(
      "inline-flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.06)] text-black font-medium hover:bg-gray-50",
      UI.ring
    )}
  >
    <SvgIcon name="back" className="w-5 h-5" />
    Back to Jobseeker Details
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
                {jobseeker.profileImage ? (
                  <img
                    src={buildFileUrl(jobseeker.profileImage)}
                    alt={fullName}
                    className="h-16 w-16 rounded-2xl object-cover border border-[#E2E8F0] shrink-0 shadow-sm"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-2xl bg-[#2e66a6] flex items-center justify-center border border-[#2e66a6]/20 shrink-0 shadow-sm">
                    <span className="text-2xl font-bold text-white" aria-hidden="true">
                      {(fullName || "?").charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg sm:text-xl font-bold text-black truncate" title={fullName}>
                      {fullName}
                    </h2>
                    {getStatusBadge(overallStatus)}
                  </div>

                  <div className="mt-1 flex flex-col gap-1 text-sm text-black/70">
                    <div className="inline-flex items-center gap-2">
                      <SvgIcon name="graduation" className="w-4 h-4 text-black/40" />
                      <span>Year Graduated: {profile.yearGraduated || "—"}</span>
                    </div>
                    <div className="inline-flex items-center gap-2">
                      <SvgIcon name="calendar" className="w-4 h-4 text-black/40" />
                      <span>Registered: {formatDate(jobseeker.createdAt, false)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 flex-wrap lg:justify-end">
                {canShowActionButtons ? (
                  <>
                    <Button
                      variant="primary"
                      size="md"
                      onClick={() => setShowApproveModal(true)}
                      disabled={actionLoading || submittedCount === 0}
                      loading={false}
                      leftIcon={<SvgIcon name="check" className="w-4 h-4" />}
                    >
                      Approve
                    </Button>

                    <Button
                      variant="soft"
                      size="md"
                      onClick={() => setShowHoldModal(true)}
                      disabled={actionLoading || submittedCount === 0}
                      leftIcon={<SvgIcon name="pause" className="w-4 h-4" />}
                    >
                      Hold
                    </Button>

                    <Button
                      variant="secondary"
                      size="md"
                      onClick={() => setShowDeclineModal(true)}
                      disabled={actionLoading}
                      leftIcon={<SvgIcon name="x" className="w-4 h-4" />}
                    >
                      Decline
                    </Button>

                    {submittedCount === 0 && (
                      <p className="text-xs text-black/60 text-center sm:text-left mt-2 sm:mt-0 sm:ml-2">
                        No documents
                      </p>
                    )}
                  </>
                ) : (
                  <div className="flex items-center">
                    {getStatusBadge(overallStatus)}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className={cn(UI.card, "overflow-hidden")}>
              <div className="border-b border-[#E2E8F0] bg-[#EEF2F6] px-5 py-4 sm:px-6">
                <h2 className={UI.h2}>Basic Information</h2>
               
              </div>
              <div className="p-5 sm:p-6">

                <div className="mt-4 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InfoCard icon={<SvgIcon name="mail" className="w-4 h-4" />} label="Email Address" value={jobseeker.email} />
                    <InfoCard icon={<SvgIcon name="phone" className="w-4 h-4" />} label="Contact Number" value={displayPhone} />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InfoCard icon={<SvgIcon name="graduation" className="w-4 h-4" />} label="Campus" value={profile.campus} />
                    <InfoCard icon={<SvgIcon name="briefcase" className="w-4 h-4" />} label="Course" value={profile.course} />
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <InfoCard icon={<SvgIcon name="document" className="w-4 h-4" />} label="Current Address" value={profile.address} />
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <InfoCard
                      icon={<SvgIcon name="document" className="w-4 h-4" />}
                      label="Technical & Soft Skills"
                      value={combinedSkills}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <InfoCard label="What Have You Done?" value={profile.whatHaveYouDone} />
                    <InfoCard label="Preferred Work Mode" value={profile.preferredWorkMode} />
                    <InfoCard label="How Soon Can You Start" value={profile.howSoonCanYouStart} />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InfoCard icon={<SvgIcon name="graduation" className="w-4 h-4" />} label="Year Graduated" value={profile.yearGraduated} />
                    <InfoCard
                      icon={<SvgIcon name="calendar" className="w-4 h-4" />}
                      label="Date Registered"
                      value={formatDate(jobseeker.createdAt, false)}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className={cn(UI.card, "overflow-hidden")}>
              <div className="border-b border-[#E2E8F0] bg-[#EEF2F6] px-5 py-4 sm:px-6">
                <h2 className={UI.h2}>Credentials</h2>
              
              </div>
              <div className="p-5 sm:p-6">

                <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {documentTypes.map((docType) => {
                    const doc = documentDetails[docType.key] || {};
                    const hasFile = !!doc.url;

                    return (
                      <div
                        key={docType.key}
                        className="flex min-h-[64px] w-full items-center justify-between gap-4 rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF]/90 px-4 py-3 transition hover:border-[#2e66a6]/30 hover:bg-white hover:shadow-[0_8px_18px_rgba(15,23,42,0.05)] sm:px-5"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <SvgIcon name={docType.icon} className="w-5 h-5 shrink-0 text-[#2e66a6]" />
                          <span className="truncate text-[15px] sm:text-base font-semibold text-black">
                            {docType.label}
                          </span>
                        </div>

                        {hasFile ? (
                          <div className="flex shrink-0 items-center gap-2">
                            <a
                              href={buildFileUrl(doc.url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={cn(
                                "inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#E2E8F0] bg-white text-black transition hover:border-[#2e66a6]/30 hover:bg-[#2e66a6]/[0.06]",
                                UI.ring
                              )}
                              aria-label={`View ${docType.label}`}
                              title={`View ${docType.label}`}
                            >
                              <SvgIcon name="eye" className="w-4 h-4" />
                            </a>

                            <button
                              type="button"
                              onClick={() => handleDownloadFile(doc.url, docType.label)}
                              className={cn(
                                "inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#E2E8F0] bg-white text-black transition hover:border-[#2e66a6]/30 hover:bg-[#2e66a6]/[0.06]",
                                UI.ring
                              )}
                              aria-label={`Download ${docType.label}`}
                              title={`Download ${docType.label}`}
                            >
                              <SvgIcon name="download" className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <span className="shrink-0 rounded-full border border-[#E2E8F0] px-3 py-1 text-xs font-bold text-black/45">No file</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showApproveModal && !isApproved && !isRejected && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4 sm:p-6">
            <div
              className="fixed inset-0 bg-black/45 backdrop-blur-[1px]"
              onClick={() => !actionLoading && setShowApproveModal(false)}
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
                      Are you sure you want to approve <span className="font-bold text-black">{fullName}</span>?
                    </p>

                    <div className="rounded-2xl border border-[#D8E0EA] bg-white/80 px-4 py-3 text-left">
                      <div className="flex gap-3">
                        <SvgIcon name="info" className="mt-0.5 h-5 w-5 shrink-0 text-[#2e66a6]" />
                        <p className="text-sm leading-6 text-[#475467]">
                          Make sure all submitted documents are reviewed and the applicant is verified as a PHINMA AU Graduate.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-[#D8E0EA] bg-[#EEF2F6] px-5 py-4 sm:px-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Button
                    variant="secondary"
                    size="lg"
                    className="w-full !h-11 rounded-[14px] text-sm"
                    onClick={() => setShowApproveModal(false)}
                    disabled={actionLoading}
                  >
                    Cancel
                  </Button>

                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full !h-11 rounded-[14px] text-sm !bg-[#2e66a6] hover:!bg-[#255587]"
                    onClick={() => handleStatusUpdate("verified", "Approved by admin")}
                    loading={actionLoading}
                    disabled={actionLoading}
                  >
                    Confirm
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
            <div className="fixed inset-0 bg-black/45 backdrop-blur-[1px]" onClick={() => !actionLoading && resetHoldModal()} aria-hidden="true" />

           <div
  className="relative w-full max-w-2xl rounded-[24px] bg-[#F8FAFC] border border-[#D8E0EA] shadow-[0_18px_50px_rgba(15,23,42,0.18)] overflow-hidden"
  role="dialog"
  aria-modal="true"
  aria-labelledby="hold-modal-title"
>
              <div className="max-h-[75vh] overflow-y-auto px-6 pt-6 pb-5 sm:px-7">
                <div>
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#2e66a6]/10 text-[#2e66a6]">
                      <SvgIcon name="pause" className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                      <h3 id="hold-modal-title" className="text-[24px] sm:text-[28px] leading-tight font-bold tracking-[-0.02em] text-black">
                        Request Resubmission
                      </h3>

                      <p className="mt-2 text-[14px] sm:text-[15px] leading-6 text-[#475467]">
                        Select the documents that need to be resubmitted and write the message for{" "}
                        <span className="font-bold text-black">{fullName}</span>.
                      </p>
                    </div>
                  </div>

         <div className="mt-6">
  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-[#64748B]">Documents needed</p>
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
    {documentTypes.map((doc) => {
      const checked = holdDocTypes.includes(doc.key);

      return (
        <label
          key={doc.key}
          className={cn(
            "flex min-h-11 items-center gap-3 rounded-2xl border px-3 py-2 cursor-pointer select-none transition",
            checked
              ? "border-[#2e66a6]/50 bg-[#2e66a6]/[0.08]"
              : "border-[#D8E0EA] bg-white/85 hover:border-[#2e66a6]/30 hover:bg-[#2e66a6]/[0.04]"
          )}
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

                  <div className="mt-6">
                    <label className="block text-sm font-semibold text-black mb-2">Message to User</label>
                    <textarea
                      value={holdReason}
                      onChange={(e) => setHoldReason(e.target.value)}
                      rows={4}
                      placeholder="Explain what needs to be corrected or re-uploaded."
                      className="w-full resize-none rounded-2xl border border-[#CBD5E1] bg-white/90 px-4 py-3 text-sm leading-6 text-black placeholder:text-black/35 focus:border-[#2e66a6] focus:outline-none focus:ring-2 focus:ring-[#2e66a6]/30"
                    />
                  </div>

                  {(!holdDocTypes.length || !holdReason.trim()) && (
                    <p className="mt-4 rounded-2xl border border-[#D8E0EA] bg-white/70 px-4 py-3 text-sm text-[#64748B]">
                      Please select at least one document and add a message before sending.
                    </p>
                  )}
                </div>
              </div>

              <div className="border-t border-[#D8E0EA] bg-[#EEF2F6] px-6 py-4 sm:px-7">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Button
                    variant="secondary"
                    size="lg"
                    className="w-full !h-11 rounded-[14px] text-sm border-[#CBD5E1]"
                    onClick={resetHoldModal}
                    disabled={actionLoading}
                  >
                    Cancel
                  </Button>

                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full !h-11 rounded-[14px] text-sm !bg-[#2e66a6] hover:!bg-[#255587]"
                    onClick={handleHoldSubmit}
                    disabled={!holdDocTypes.length || !holdReason.trim() || actionLoading}
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
            <div className="fixed inset-0 bg-black/45 backdrop-blur-[1px]" onClick={() => !actionLoading && resetDeclineModal()} aria-hidden="true" />

            <div
              className="relative w-full max-w-xl rounded-[24px] bg-[#F8FAFC] border border-[#D8E0EA] shadow-[0_18px_50px_rgba(15,23,42,0.18)] overflow-hidden"
              role="dialog"
              aria-modal="true"
              aria-labelledby="decline-modal-title"
            >
              <div className="px-6 pt-6 pb-5 sm:px-7">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#FEE4E2] text-[#D92D20]">
                    <SvgIcon name="dangerTriangle" className="w-6 h-6 text-[#D92D20]" />
                  </div>

                  <div className="min-w-0">
                    <h3 id="decline-modal-title" className="text-[24px] sm:text-[28px] leading-tight font-bold tracking-[-0.02em] text-black">
                      Decline Verification
                    </h3>

                    <p className="mt-2 text-[14px] sm:text-[15px] leading-6 text-[#475467]">
                      Are you sure you want to decline <span className="font-bold text-black">{fullName}</span>? The applicant will be notified that they do not meet the PHINMA AU Graduate requirement.
                    </p>
                  </div>
                </div>

                <div className="mt-6">
                  <label className="block text-sm font-semibold text-black mb-2">
                    Message to User
                  </label>
                  <textarea
                    value={declineMessage}
                    onChange={(e) => setDeclineMessage(e.target.value)}
                    rows={4}
                    placeholder="Add a clear reason or leave blank to use the default message."
                    className="w-full resize-none rounded-2xl border border-[#CBD5E1] bg-white/90 px-4 py-3 text-sm leading-6 text-black placeholder:text-black/35 focus:border-[#2e66a6] focus:outline-none focus:ring-2 focus:ring-[#2e66a6]/30"
                  />
                  <p className="mt-3 rounded-2xl border border-[#D8E0EA] bg-white/70 px-4 py-3 text-sm leading-6 text-[#64748B]">
                    The candidate will receive this message in their notification portal. If left blank, the default rejection message will be used.
                  </p>
                </div>
              </div>

              <div className="border-t border-[#E2E8F0] bg-[#F8FAFC] px-6 py-5 sm:px-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Button
                    variant="secondary"
                    size="lg"
                    className="w-full !h-11 rounded-[14px] text-sm border-[#CBD5E1]"
                    onClick={resetDeclineModal}
                    disabled={actionLoading}
                  >
                    Cancel
                  </Button>

                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full !h-11 rounded-[14px] text-sm !bg-[#2e66a6] hover:!bg-[#255587]"
                    onClick={handleDeclineSubmit}
                    disabled={actionLoading}
                    loading={actionLoading}
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

export default JobseekerVerificationDetails;