import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import AdminLayout from "../../layouts/AdminLayout";
import api from "../../services/api";
import { normalizeUserToResumeData } from "../../components/shared/resumePrintTemplate";
import Pagination from "../../components/shared/Pagination";

const cn = (...classes) => classes.filter(Boolean).join(" ");

const Icon = ({ name, className = "h-4 w-4", ...props }) => {
  const common = {
    className,
    fill: "none",
    stroke: "currentColor",
    viewBox: "0 0 24 24",
    strokeWidth: 2,
    ...props,
  };

  const icons = {
    arrowLeft: <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />,
    user: <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />,
    briefcase: <path strokeLinecap="round" strokeLinejoin="round" d="M10 6h4a2 2 0 012 2v1h3a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2v-7a2 2 0 012-2h3V8a2 2 0 012-2zm0 3h4V8h-4v1z" />,
    shield: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z" />,
    academic: <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />,
    history: <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-2.64-6.36M21 3v6h-6" />,
    mail: <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />,
    phone: <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.95.68l1.5 4.5a1 1 0 01-.5 1.21l-2.26 1.13a11.04 11.04 0 005.52 5.52l1.13-2.26a1 1 0 011.21-.5l4.49 1.5a1 1 0 01.68.95V19a2 2 0 01-2 2h-1C9.72 21 3 14.28 3 6V5z" />,
    mapPin: <><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></>,
    calendar: <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3M5 11h14M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />,
    document: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
    eye: <><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></>,
    download: <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
    
    building: <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1" />,
    link: <><path strokeLinecap="round" strokeLinejoin="round" d="M10 13a5 5 0 007.07 0l2.12-2.12a5 5 0 00-7.07-7.07L10.7 5.22" /><path strokeLinecap="round" strokeLinejoin="round" d="M14 11a5 5 0 00-7.07 0L4.81 13.12a5 5 0 107.07 7.07l1.41-1.41" /></>,
    external: <><path strokeLinecap="round" strokeLinejoin="round" d="M14 3h7v7" /><path strokeLinecap="round" strokeLinejoin="round" d="M10 14L21 3" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 14v6a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 2" /></>,
    starOutline: <path strokeLinecap="round" strokeLinejoin="round" d="M12 3.5l2.65 5.37 5.93.86-4.29 4.18 1.01 5.9L12 17.02 6.7 19.81l1.01-5.9-4.29-4.18 5.93-.86L12 3.5z" />,
    facebook: <path fill="currentColor" stroke="none" d="M13.5 21v-7h2.4l.4-3h-2.8V9.1c0-.9.3-1.5 1.6-1.5H16V4.9c-.2 0-.9-.1-1.8-.1-1.8 0-3.1 1.1-3.1 3.2V11H9v3h2.3v7h2.2z" />,
    instagram: <><rect x="3.5" y="3.5" width="17" height="17" rx="4.5" /><circle cx="12" cy="12" r="3.75" /><circle cx="17.3" cy="6.7" r="1" fill="currentColor" stroke="none" /></>,
    youtube: <path fill="currentColor" stroke="none" d="M21.58 7.19a2.9 2.9 0 00-2.04-2.05C17.74 4.65 12 4.65 12 4.65s-5.74 0-7.54.49A2.9 2.9 0 002.42 7.2C1.94 9 1.94 12 1.94 12s0 3 .48 4.81a2.9 2.9 0 002.04 2.05c1.8.49 7.54.49 7.54.49s5.74 0 7.54-.49a2.9 2.9 0 002.04-2.05C22.02 15 22.02 12 22.02 12s0-3-.44-4.81zM9.95 15.13V8.87L15.18 12l-5.23 3.13z" />,
    linkedin: <path fill="currentColor" stroke="none" d="M6.94 8.5a1.44 1.44 0 110-2.88 1.44 1.44 0 010 2.88zM5.7 18.5h2.47v-8H5.7v8zm4.03-8h2.37v1.1h.03c.33-.63 1.14-1.3 2.35-1.3 2.52 0 2.99 1.66 2.99 3.81v4.39H15v-3.89c0-.93-.02-2.12-1.29-2.12-1.3 0-1.49 1.01-1.49 2.06v3.95H9.73v-8z" />,
    twitter: <path fill="currentColor" stroke="none" d="M18.9 5H16.5l-3.1 3.5L10.9 5H5l5.3 6.8L5.2 19h2.4l3.8-4.3 3.3 4.3H20l-5.5-7L18.9 5z" />,
  };

  return <svg {...common}>{icons[name] || null}</svg>;
};

const ReviewStars = ({ rating }) => {
  const numericRating = Number(rating);
  const safeRating = Number.isFinite(numericRating)
    ? Math.min(5, Math.max(0, Math.round(numericRating)))
    : 0;

  return (
    <div
      className="flex items-center gap-1"
      aria-label={`${safeRating} out of 5 stars`}
      title={`${safeRating} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={cn(
            "text-xl leading-none",
            star <= safeRating ? "text-[#e5a900]" : "text-[#d7dee8]"
          )}
          aria-hidden="true"
        >
          ★
        </span>
      ))}
    </div>
  );
};

const EMPLOYER_DOC_LABELS = {
  secRegistration: "SEC Registration",
  birRegistration: "BIR Registration",
  dtiRegistration: "DTI Registration",
  cityPermit: "City / Municipality Permit",
  businessPermit: "Business Permit",
};

const DOC_LABELS = {
  cv: "CV / Resume",
  validId: "Valid ID",
  tin: "TIN",
  tor: "TOR (Transcript of Records)",
  diploma: "Diploma",
  sss: "SSS",
  philhealth: "PhilHealth",
  pagibig: "Pag-IBIG",
};

const EMPLOYER_TABS = [
  { key: "about", label: "About" },
  { key: "credentials", label: "Credentials" },
  { key: "social", label: "Social Media" },
  { key: "gallery", label: "Gallery" },
  { key: "posts", label: "Posting History" },
];

const JOB_SEEKER_LEVEL_BADGES = {
  "First Time Job Seeker": "/images/Firstime.png",
  Intermediate: "/images/Intermediate.png",
  Expert: "/images/Expert.png",
  Pro: "/images/Pro.png",
  Legend: "/images/Legend.png",
};

const JobSeekerLevelBadgeCard = ({
  currentRank = "First Time Job Seeker",
}) => {
  const [showLevelModal, setShowLevelModal] = useState(false);
  const badgeImage =
    JOB_SEEKER_LEVEL_BADGES[currentRank] ||
    JOB_SEEKER_LEVEL_BADGES["First Time Job Seeker"];
  const jobSeekerLevels = Object.entries(JOB_SEEKER_LEVEL_BADGES);

  useEffect(() => {
    if (!showLevelModal) return undefined;

    const handleEscape = (event) => {
      if (event.key === "Escape") setShowLevelModal(false);
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [showLevelModal]);

  return (
    <>
      <button
        type="button"
        onClick={() => setShowLevelModal(true)}
        className="group inline-flex w-fit items-center gap-3 rounded-xl px-2 py-1.5 text-left transition hover:bg-[#f7faff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2"
        aria-label="View all job seeker levels"
        aria-haspopup="dialog"
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white">
          <img
            src={badgeImage}
            alt={`${currentRank} badge`}
            className="h-10 w-10 object-contain transition duration-200 group-hover:scale-105 group-hover:drop-shadow-[0_5px_8px_rgba(46,102,166,0.22)]"
          />
        </div>

        <div className="min-w-0">
          <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-gray-500 sm:text-[13px]">
            Jobseeker Level
          </p>
          <p className="mt-0.5 whitespace-nowrap text-[12px] font-bold text-[#2f3b8f] sm:text-[13px]">
            {currentRank}
          </p>
        </div>
      </button>

      {showLevelModal ? (
        <div
          className="fixed inset-0 z-[10060] flex items-center justify-center bg-black/50 px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-job-seeker-levels-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowLevelModal(false);
            }
          }}
        >
          <div className="w-full max-w-[980px] overflow-hidden rounded-[22px] bg-white shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
            <div className="flex items-center justify-between gap-4 bg-[#2e66a6] px-5 py-4 sm:px-7">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/75">
                  Job Seeker Ranking
                </p>
                <h2
                  id="admin-job-seeker-levels-title"
                  className="mt-1 text-[21px] font-bold text-white sm:text-[24px]"
                >
                  Job Seeker Levels
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setShowLevelModal(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full text-[28px] leading-none text-white transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                aria-label="Close job seeker levels"
              >
                ×
              </button>
            </div>

            <div className="max-h-[78vh] overflow-y-auto px-5 py-6 sm:px-7 sm:py-7">
              <p className="text-sm leading-6 text-gray-600">
                View the jobseeker&apos;s current rank and the complete job seeker level progression.
              </p>

              <div className="mt-4 overflow-x-auto rounded-xl border border-[#d8e2ee] bg-[#f8fbff] px-4 py-3">
                <div className="flex min-w-max items-center gap-2 text-sm font-semibold text-[#2e66a6]">
                  {jobSeekerLevels.map(([levelName], index) => (
                    <React.Fragment key={levelName}>
                      <span
                        className={
                          levelName === currentRank
                            ? "font-extrabold text-black"
                            : ""
                        }
                      >
                        {levelName}
                      </span>
                      {index < jobSeekerLevels.length - 1 ? (
                        <span className="text-gray-400" aria-hidden="true">
                          →
                        </span>
                      ) : null}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                {jobSeekerLevels.map(([levelName, levelBadge], index) => {
                  const isCurrentLevel = levelName === currentRank;

                  return (
                    <div
                      key={levelName}
                      className={cn(
                        "relative flex min-h-[210px] flex-col items-center rounded-[18px] border px-3 py-5 text-center transition",
                        isCurrentLevel
                          ? "border-[#2e66a6] bg-[#f3f8ff] shadow-[0_10px_30px_rgba(46,102,166,0.16)]"
                          : "border-gray-200 bg-white"
                      )}
                    >
                      <span
                        className={cn(
                          "absolute left-3 top-3 flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[11px] font-bold",
                          isCurrentLevel
                            ? "bg-[#2e66a6] text-white"
                            : "bg-gray-100 text-gray-500"
                        )}
                      >
                        {index + 1}
                      </span>

                      <img
                        src={levelBadge}
                        alt={`${levelName} badge`}
                        className="h-[112px] w-[112px] object-contain"
                      />

                      <h3 className="mt-3 text-[15px] font-bold leading-5 text-gray-900">
                        {levelName}
                      </h3>

                      {isCurrentLevel ? (
                        <span className="mt-2 inline-flex rounded-full bg-[#2e66a6] px-3 py-1 text-[11px] font-bold text-white">
                          Current Level
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowLevelModal(false)}
                  className="h-11 rounded-lg bg-[#2e66a6] px-6 text-sm font-semibold text-white transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};

const TABS = [
  { key: "resume", label: "Resume", icon: "document" },
  { key: "activity", label: "Activity", icon: "clock" },
  { key: "applications", label: "Application History", icon: "history" },
];

const APPLICATIONS_PER_PAGE = 5;

const hasMeaningfulObjectValue = (item = {}) =>
  Boolean(
    item &&
      typeof item === "object" &&
      Object.entries(item).some(([key, value]) => {
        if (["_id", "id", "createdAt", "updatedAt", "__v"].includes(key)) return false;
        if (Array.isArray(value)) return value.length > 0;
        if (value && typeof value === "object") return hasMeaningfulObjectValue(value);
        return Boolean(String(value ?? "").trim());
      })
  );

const calculateJobSeekerLevel = ({
  skills = [],
  certifications = [],
  projects = [],
  seminars = [],
  awards = [],
  workExperiences = [],
}) => {
  const counts = {
    skills: Array.isArray(skills) ? skills.filter(Boolean).length : 0,
    certifications: Array.isArray(certifications)
      ? certifications.filter(hasMeaningfulObjectValue).length
      : 0,
    projects: Array.isArray(projects)
      ? projects.filter(hasMeaningfulObjectValue).length
      : 0,
    seminars: Array.isArray(seminars)
      ? seminars.filter(hasMeaningfulObjectValue).length
      : 0,
    awards: Array.isArray(awards)
      ? awards.filter(hasMeaningfulObjectValue).length
      : 0,
    work: Array.isArray(workExperiences)
      ? workExperiences.filter(hasMeaningfulObjectValue).length
      : 0,
  };

  const tiers = [
    {
      name: "First Time Job Seeker",
      requirements: {
        skills: 0,
        certifications: 0,
        projects: 0,
        seminars: 0,
        awards: 0,
        work: 0,
      },
    },
    {
      name: "Intermediate",
      requirements: {
        skills: 5,
        certifications: 1,
        projects: 1,
        seminars: 1,
        awards: 1,
        work: 0,
      },
    },
    {
      name: "Expert",
      requirements: {
        skills: 9,
        certifications: 2,
        projects: 2,
        seminars: 2,
        awards: 2,
        work: 1,
      },
    },
    {
      name: "Pro",
      requirements: {
        skills: 13,
        certifications: 5,
        projects: 5,
        seminars: 5,
        awards: 5,
        work: 2,
      },
    },
    {
      name: "Legend",
      requirements: {
        skills: 17,
        certifications: 7,
        projects: 7,
        seminars: 7,
        awards: 7,
        work: 3,
      },
    },
  ];

  const meetsRequirements = (requirements) =>
    Object.entries(requirements).every(([key, required]) => counts[key] >= required);

  let currentTierIndex = 0;
  tiers.forEach((tier, index) => {
    if (meetsRequirements(tier.requirements)) currentTierIndex = index;
  });

  return tiers[currentTierIndex].name;
};

const UserManagementDetails = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isArchiveView = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return Boolean(location.state?.fromArchive) || params.get("archive") === "1";
  }, [location.search, location.state]);
  const archiveBackPath = location.state?.archiveBackPath || `/admin/archive/account/${userId}`;
  const detailsBackPath = location.state?.backPath || "/admin/users";
  const detailsBackLabel = location.state?.backLabel || "Back to Users";

  const handleBack = () => {
    navigate(isArchiveView ? archiveBackPath : detailsBackPath);
  };

  const [user, setUser] = useState(null);
  const [applications, setApplications] = useState([]);
  const [jobPosts, setJobPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState(() => {
    const requestedTab = new URLSearchParams(location.search).get("tab");
    return TABS.some((tab) => tab.key === requestedTab) ? requestedTab : "resume";
  });
  const [activeEmployerTab, setActiveEmployerTab] = useState("about");
  const [applicationPage, setApplicationPage] = useState(1);
  const [brokenAvatar, setBrokenAvatar] = useState(false);
  const [showAllActivity, setShowAllActivity] = useState(false);
  const [activityPage, setActivityPage] = useState(1);
  const [activityPageSize, setActivityPageSize] = useState(10);

  const apiHost = useMemo(() => {
    const apiUrl = process.env.REACT_APP_API_URL || "https://phinmaau-job-portal-atlas.onrender.com/api";
    return apiUrl.replace(/\/api\/?$/, "");
  }, []);

  const getFileUrl = (url) => {
    if (!url) return "";
    if (/^https?:\/\//i.test(url)) return url;
    return `${apiHost}${url.startsWith("/") ? url : `/${url}`}`;
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

  const fetchCredentialBlob = async (docType, disposition = "inline") => {
    const response = await api.get(`/admin/users/${userId}/documents/${docType}`, {
      params: { disposition },
      responseType: "blob",
    });

    const contentType = response.headers?.["content-type"] || "application/octet-stream";
    const fileName = getDownloadFileName(response.headers?.["content-disposition"], docType);
    const blob = new Blob([response.data], { type: contentType });

    return { blob, fileName };
  };

  const handleViewCredential = async (docType) => {
    try {
      const { blob } = await fetchCredentialBlob(docType, "inline");
      const blobUrl = window.URL.createObjectURL(blob);
      window.open(blobUrl, "_blank", "noopener,noreferrer");
      window.setTimeout(() => window.URL.revokeObjectURL(blobUrl), 60000);
    } catch (err) {
      console.error("Error viewing credential:", err);
      alert(err.response?.data?.message || "Unable to open this credential. Please try again.");
    }
  };

  const handleDownloadCredential = async (docType, fallbackName = "document") => {
    try {
      const { blob, fileName } = await fetchCredentialBlob(docType, "attachment");
      const blobUrl = window.URL.createObjectURL(blob);
      const downloadLink = document.createElement("a");

      downloadLink.href = blobUrl;
      downloadLink.download = fileName || fallbackName;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      downloadLink.remove();

      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Error downloading credential:", err);
      alert(err.response?.data?.message || "Unable to download this credential. Please try again.");
    }
  };

  const normalizeUrl = (url) => {
    const value = String(url || "").trim();
    if (!value) return "";
    return /^https?:\/\//i.test(value) ? value : `https://${value}`;
  };

  const formatDate = (value, withTime = false) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
    });
  };

  const formatYearRange = (item) => {
    const start = item?.startYear || (item?.startDate ? new Date(item.startDate).getFullYear() : "");
    const end = item?.yearGraduated || item?.endYear || (item?.isPresent ? "Present" : item?.endDate ? new Date(item.endDate).getFullYear() : "");
    if (start && end) return `${start} - ${end}`;
    return start || end || "—";
  };

  const splitList = (value) => {
    if (Array.isArray(value)) return value.filter(Boolean);
    return String(value || "")
      .split(/\|\||[,\n]/)
      .map((item) => item.trim())
      .filter(Boolean);
  };

  const fetchUserDetails = useCallback(async (opts = { silent: false }) => {
    try {
      if (opts.silent) setRefreshing(true);
      else setLoading(true);
      setError("");

      const response = await api.get(`/admin/users/${userId}`, {
        params: { fresh: Date.now() },
      });
      if (response.data?.success) {
        setUser(response.data.user || null);
        setApplications(response.data.applications || []);
        setJobPosts(response.data.jobPosts || []);
      } else {
        setError("User not found or data format invalid.");
      }
    } catch (err) {
      console.error("Error fetching user details:", err);
      setError(err.response?.data?.message || "Failed to load user details. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) fetchUserDetails();
  }, [userId, fetchUserDetails]);

  useEffect(() => {
    if (userId && activeTab === "resume") fetchUserDetails({ silent: true });
  }, [activeTab, fetchUserDetails, userId]);

  useEffect(() => {
    setBrokenAvatar(false);
  }, [userId, user?.profileImage]);

  useEffect(() => {
    setApplicationPage(1);
  }, [userId, applications.length]);

  const totalApplicationPages = Math.max(1, Math.ceil(applications.length / APPLICATIONS_PER_PAGE));

  const paginatedApplications = useMemo(() => {
    const startIndex = (applicationPage - 1) * APPLICATIONS_PER_PAGE;
    return applications.slice(startIndex, startIndex + APPLICATIONS_PER_PAGE);
  }, [applications, applicationPage]);

  const profile = user?.jobSeekerProfile || {};
  const docs = profile.verificationDocs || {};

  const fullName = useMemo(() => {
    if (!user) return "";
    return user.fullName || [user.firstName, user.middleName, user.lastName, user.extensionName].filter(Boolean).join(" ") || user.email || "User";
  }, [user]);

  const isJobseeker = String(user?.role || "").toLowerCase() === "jobseeker";
  const skills = [...splitList(profile.technicalSkills), ...splitList(profile.softSkills)];
  const educationEntries = Array.isArray(profile.educationEntries) ? profile.educationEntries : [];
  const workExperiences = Array.isArray(profile.workExperiences) ? profile.workExperiences : [];

  const toPlainText = (value = "") => {
    const raw = String(value || "").trim();
    if (!raw) return "";

    if (typeof window !== "undefined" && typeof window.DOMParser !== "undefined") {
      const parser = new window.DOMParser();
      const documentValue = parser.parseFromString(raw, "text/html");
      return String(documentValue.body?.textContent || "")
        .replace(/\u00a0/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
    }

    return raw
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>|<\/div>|<\/li>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  };

  const formatMonthYear = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value || "");
    return date.toLocaleDateString("en-PH", {
      month: "short",
      year: "numeric",
    });
  };

  const formatEntryDate = (item = {}) => {
    if (item.date) return String(item.date);
    const start =
      [item.startMonth, item.startYear].filter(Boolean).join(" ") ||
      formatMonthYear(item.startDate);
    const end = item.isPresent
      ? "Present"
      : [item.endMonth, item.endYear || item.yearGraduated]
          .filter(Boolean)
          .join(" ") || formatMonthYear(item.endDate);

    return [start, end].filter(Boolean).join(" – ");
  };

  const formatActivityDateTime = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfActivityDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const differenceInDays = Math.round(
      (startOfToday.getTime() - startOfActivityDay.getTime()) / 86400000
    );

    const dateLabel =
      differenceInDays === 0
        ? "Today"
        : differenceInDays === 1
          ? "Yesterday"
          : date.toLocaleDateString("en-PH", {
              month: "short",
              day: "numeric",
              year: date.getFullYear() === now.getFullYear() ? undefined : "numeric",
            });

    const timeLabel = date.toLocaleTimeString("en-PH", {
      hour: "2-digit",
      minute: "2-digit",
    });

    return `${dateLabel} · ${timeLabel}`;
  };

  const formatRelativeTime = (value) => {
    if (!value) return "Updated recently";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Updated recently";

    const difference = Math.max(0, Date.now() - date.getTime());
    const minutes = Math.floor(difference / 60000);
    const hours = Math.floor(difference / 3600000);
    const days = Math.floor(difference / 86400000);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);

    if (minutes < 1) return "Updated just now";
    if (minutes < 60) return `Updated ${minutes} minute${minutes === 1 ? "" : "s"} ago`;
    if (hours < 24) return `Updated ${hours} hour${hours === 1 ? "" : "s"} ago`;
    if (days < 7) return `Updated ${days} day${days === 1 ? "" : "s"} ago`;
    if (weeks < 5) return `Updated ${weeks} week${weeks === 1 ? "" : "s"} ago`;
    return `Updated ${months} month${months === 1 ? "" : "s"} ago`;
  };

  const resumeSkills = skills.map((value) => {
    const cleanValue = String(value || "").trim();
    const match = cleanValue.match(
      /^(.*?)\s+[—-]\s+(Basic|Novice|Intermediate|Advanced|Expert)$/i
    );

    if (!match) {
      return {
        skill: cleanValue,
        proficiency: "",
      };
    }

    return {
      skill: match[1].trim(),
      proficiency:
        match[2].charAt(0).toUpperCase() + match[2].slice(1).toLowerCase(),
    };
  });

  const meaningfulWorkExperiences = workExperiences.filter(hasMeaningfulObjectValue);
  const meaningfulEducationEntries = educationEntries.filter(hasMeaningfulObjectValue);
  const meaningfulReferences = Array.isArray(profile.references)
    ? profile.references.filter(hasMeaningfulObjectValue)
    : [];

  const resumeProfileSections = [
    ["Certifications", profile.certifications || []],
    ["Projects", profile.projects || []],
    ["Seminars and Trainings", profile.seminars || []],
    ["Awards and Achievements", profile.awards || []],
    ["Affiliations", profile.affiliations || []],
    ["Co-Curricular Activities", profile.cocurricular || []],
  ]
    .map(([title, items]) => [
      title,
      (Array.isArray(items) ? items : []).filter(hasMeaningfulObjectValue),
    ])
    .filter(([, items]) => items.length > 0);

  const personalInformationRows = [
    ["Preferred Work Mode", profile.preferredWorkMode],
    ["Employment Type", profile.employmentType],
    ["Willing to Relocate", profile.willingToRelocate],
    ["How Soon Can Start", profile.howSoonCanYouStart],
    ["Experience", profile.experience || profile.whatHaveYouDone],
    ["Preferred Language", profile.preferredLanguage],
    ["Educational Attainment", profile.educationalAttainment],
    ["Field of Study", profile.studyField || profile.course],
    [
      "Salary",
      [profile.minimumSalary, profile.maximumSalary].filter(Boolean).join(" - "),
    ],
    ["Nationality", profile.nationality],
    ["Height", profile.height],
    ["Weight", profile.weight],
    ["Gender", profile.gender],
    ["Civil Status", profile.civilStatus],
    ["Birthday", profile.birthday],
  ].filter(([, value]) => String(value || "").trim());

  const jobSeekerLevel = calculateJobSeekerLevel({
    skills: resumeSkills,
    certifications: profile.certifications || [],
    projects: profile.projects || [],
    seminars: profile.seminars || [],
    awards: profile.awards || [],
    workExperiences,
  });

  const activityItems = useMemo(() => {
    const items = [];

    (user?.activityLogs || []).forEach((log, index) => {
      items.push({
        key: log._id || log.id || `system-log-${index}`,
        type: log.action || "activity",
        title: log.actionLabel || "Activity recorded",
        description: log.description || log.targetName || log.module || "User activity",
        occurredAt: log.createdAt,
      });
    });

    const cvDocument = profile?.verificationDocs?.cv || {};
    if (cvDocument.uploadedAt) {
      items.push({
        key: `resume-${cvDocument.uploadedAt}`,
        type: "resume",
        title: "Updated resume",
        description: cvDocument.filename
          ? `Uploaded ${cvDocument.filename}`
          : "Uploaded a new resume file.",
        occurredAt: cvDocument.uploadedAt,
      });
    }

    (applications || []).forEach((application) => {
      const job = application?.job || {};
      const employerProfile = application?.employer?.employerProfile || {};
      const companyName =
        job.companyName ||
        employerProfile.companyName ||
        "a company";
      const jobTitle = job.title || job.jobTitle || "a job position";
      const history = Array.isArray(application?.activityHistory)
        ? application.activityHistory
        : [];

      history.forEach((activity, index) => {
        items.push({
          key:
            activity?._id ||
            `${application?._id || "application"}-${activity?.occurredAt || index}`,
          type: activity?.type || "application",
          title: activity?.title || "Application updated",
          description:
            activity?.description ||
            `${jobTitle} at ${companyName}`,
          occurredAt:
            activity?.occurredAt ||
            activity?.createdAt ||
            application?.updatedAt,
        });
      });

      const hasSubmittedActivity = history.some(
        (activity) =>
          String(activity?.type || "").toLowerCase() === "submitted"
      );

      if (!hasSubmittedActivity) {
        items.push({
          key: `application-${application?._id || jobTitle}`,
          type: "application",
          title: `Applied to ${companyName}`,
          description: jobTitle,
          occurredAt:
            application?.appliedAt ||
            application?.createdAt,
        });
      }

      if (application?.viewedAt) {
        items.push({
          key: `viewed-${application?._id}`,
          type: "viewed",
          title: "Application viewed by employer",
          description: `${jobTitle} at ${companyName}`,
          occurredAt: application.viewedAt,
        });
      }

      if (application?.interviewSchedule?.scheduledAt) {
        items.push({
          key: `interview-${application?._id}`,
          type: "interview",
          title: "Interview scheduled",
          description: `${jobTitle} at ${companyName}`,
          occurredAt:
            application?.interviewSchedule?.setAt ||
            application?.updatedAt ||
            application?.interviewSchedule?.scheduledAt,
        });
      }
    });

    if (user?.updatedAt) {
      items.push({
        key: `profile-${user.updatedAt}`,
        type: "profile",
        title: "Updated profile",
        description: "The jobseeker profile information was updated.",
        occurredAt: user.updatedAt,
      });
    }

    return items
      .filter((item) => item.occurredAt)
      .sort(
        (first, second) =>
          new Date(second.occurredAt).getTime() -
          new Date(first.occurredAt).getTime()
      );
  }, [applications, profile, user?.activityLogs, user?.updatedAt]);

  const visibleActivityItems = showAllActivity
    ? activityPageSize === "all"
      ? activityItems
      : activityItems.slice((activityPage - 1) * activityPageSize, activityPage * activityPageSize)
    : activityItems.slice(0, 10);

  const getApplicationPresentation = (application = {}) => {
    const normalizedStatus = String(application.status || "pending").toLowerCase();

    if (normalizedStatus === "for interview") {
      return {
        label: "Interview",
        progress: 75,
        barClass: "bg-blue-500",
        badgeClass: "border-blue-200 bg-blue-50 text-blue-700",
        description: application?.interviewSchedule?.scheduledAt
          ? `Interview scheduled for ${formatDate(
              application.interviewSchedule.scheduledAt,
              true
            )}`
          : "Interview stage",
      };
    }

    if (normalizedStatus === "hired") {
      return {
        label: "Offered",
        progress: 100,
        barClass: "bg-emerald-500",
        badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
        description: "Application marked as hired",
      };
    }

    if (
      normalizedStatus === "declined" ||
      normalizedStatus === "vacancy full"
    ) {
      return {
        label: "Not Selected",
        progress: 100,
        barClass: "bg-rose-400",
        badgeClass: "border-rose-200 bg-rose-50 text-rose-700",
        description:
          application.declineReason ||
          (normalizedStatus === "vacancy full"
            ? "Position filled"
            : "Application was not selected"),
      };
    }

    if (
      normalizedStatus === "withdrawn" ||
      normalizedStatus === "cancelled"
    ) {
      return {
        label: normalizedStatus === "withdrawn" ? "Withdrawn" : "Cancelled",
        progress: 100,
        barClass: "bg-slate-400",
        badgeClass: "border-slate-200 bg-slate-50 text-slate-700",
        description:
          normalizedStatus === "withdrawn"
            ? "Application withdrawn"
            : "Application cancelled",
      };
    }

    if (application.reviewedAt || application.isViewedByEmployer) {
      return {
        label: "In Review",
        progress: 40,
        barClass: "bg-blue-500",
        badgeClass: "border-amber-200 bg-amber-50 text-amber-700",
        description: "Resume under review",
      };
    }

    return {
      label: "Submitted",
      progress: 15,
      barClass: "bg-blue-500",
      badgeClass: "border-slate-200 bg-slate-50 text-slate-700",
      description: "Application received",
    };
  };

  const handleOpenResumeFullView = () => {
    const resumeData = normalizeUserToResumeData({
      userData: user,
      profile,
      workExperiences,
    });

    sessionStorage.setItem(
      "resumePreviewData",
      JSON.stringify({
        ...resumeData,
        verificationDocs: docs,
        returnTo: `/admin/users/${userId}`,
        viewerMode: "admin",
      })
    );

    navigate(`/admin/users/${userId}/resume-preview`);
  };

  const HeaderProfile = () => (
    <section className="overflow-hidden rounded-[20px] border border-[#d8e2ee] bg-white shadow-sm">
      <div className="flex flex-col gap-3 px-5 sm:px-7 lg:flex-row lg:items-center lg:gap-8">
        <div className="min-w-0 shrink-0">
          <div className="flex gap-5 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "relative inline-flex h-12 shrink-0 items-center px-1 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2 sm:text-[15px]",
                  activeTab === tab.key
                    ? "text-[#174b91]"
                    : "text-gray-500 hover:text-black"
                )}
              >
                {tab.label}
                <span
                  className={cn(
                    "absolute bottom-0 left-0 right-0 h-[2px]",
                    activeTab === tab.key ? "bg-[#174b91]" : "bg-transparent"
                  )}
                />
              </button>
            ))}
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col items-start gap-1 py-1 lg:flex-row lg:items-center lg:justify-end lg:gap-6">
          <JobSeekerLevelBadgeCard currentRank={jobSeekerLevel} />

          <div className="inline-flex items-center gap-2 whitespace-nowrap text-sm font-semibold text-gray-500 sm:text-[15px]">
            <Icon name="clock" className="h-4 w-4 shrink-0" />
            <span>
              Last profile update: {formatDate(user?.updatedAt, true)}
            </span>
          </div>
        </div>
      </div>
    </section>
  );

  const ResumePreview = () => {
    const avatarUrl = getFileUrl(user?.profileImage);
    const initials = fullName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "JS";

    return (
      <section className="overflow-hidden rounded-[20px] border border-[#d8e2ee] bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-[#d8e2ee] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div />

          <button
            type="button"
            onClick={handleOpenResumeFullView}
            className="inline-flex w-fit items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-[#174b91] transition hover:bg-[#f7faff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2 sm:text-[15px]"
          >
            <Icon name="eye" className="h-4 w-4" />
            Full Resume
          </button>
        </div>

        <div className="px-5 py-7 sm:px-8 lg:px-10">
          <article className="mx-auto w-full bg-white font-serif text-[12px] leading-[1.45] text-black sm:text-[13px]">
            <header className="relative flex min-h-[120px] flex-col items-center justify-center border-b border-[#d8e2ee] pb-6 pr-0 text-center sm:pr-[132px]">
              <h2 className="text-[28px] font-bold uppercase leading-tight tracking-[0.02em] sm:text-[31px]">
                {fullName}
              </h2>

              {profile.address ? (
                <p className="mt-2 break-words text-[11px] leading-relaxed sm:text-[12px]">
                  {profile.address}
                </p>
              ) : null}

              <p className={`${profile.address ? "mt-1" : "mt-2"} break-words text-[11px] leading-relaxed sm:text-[12px]`}>
                {[user?.email, profile.phoneNumber || user?.phoneNumber || user?.contactNumber]
                  .filter(Boolean)
                  .join(" | ") || "Contact information not provided"}
              </p>

              <p className="mt-1 break-words text-[11px] leading-relaxed text-[#56616f] sm:text-[12px]">
                {[
                  profile.campus,
                  profile.course,
                  profile.yearGraduated ? `Class of ${profile.yearGraduated}` : "",
                ].filter(Boolean).join(", ")}
              </p>

              {avatarUrl && !brokenAvatar ? (
                <img
                  src={avatarUrl}
                  alt={fullName}
                  onError={() => setBrokenAvatar(true)}
                  className="mt-4 h-[88px] w-[88px] object-cover sm:absolute sm:right-2 sm:top-0 sm:mt-0 sm:h-[96px] sm:w-[96px]"
                />
              ) : (
                <div className="mt-4 flex h-[88px] w-[88px] items-center justify-center bg-[#1f2430] text-[28px] font-bold text-white sm:absolute sm:right-2 sm:top-0 sm:mt-0 sm:h-[96px] sm:w-[96px]">
                  {initials}
                </div>
              )}
            </header>

            {String(profile.aboutMe || "").trim() ? (
              <section className="pt-5">
                <h3 className="border-b border-black pb-0.5 text-[12px] font-bold uppercase leading-[1.35] sm:text-[13px]">
                  Objective
                </h3>
                <p className="whitespace-pre-line pt-1 text-justify">
                  {toPlainText(profile.aboutMe)}
                </p>
              </section>
            ) : null}

            {personalInformationRows.length ? (
              <section className="pt-5">
                <h3 className="border-b border-black pb-0.5 text-[12px] font-bold uppercase leading-[1.35] sm:text-[13px]">
                  Personal Information
                </h3>
                <div className="grid grid-cols-1 gap-x-7 gap-y-1.5 pt-1.5 sm:grid-cols-3">
                  {personalInformationRows.map(([label, value]) => (
                    <div key={label}>
                      <b>{label}:</b> {value}
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {meaningfulWorkExperiences.length ? (
              <section className="pt-5">
                <h3 className="border-b border-black pb-0.5 text-[12px] font-bold uppercase leading-[1.35] sm:text-[13px]">
                  Work Experience
                </h3>
                <div className="space-y-3 pt-1.5">
                  {meaningfulWorkExperiences.map((item, index) => (
                    <div key={item._id || index}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          {item.positionTitle || item.title ? (
                            <div className="font-bold">
                              {item.positionTitle || item.title}
                            </div>
                          ) : null}
                          {item.companyName || item.company ? (
                            <div className="italic">
                              {item.companyName || item.company}
                            </div>
                          ) : null}
                        </div>

                        {formatEntryDate(item) ? (
                          <div className="shrink-0 whitespace-nowrap italic">
                            {formatEntryDate(item)}
                          </div>
                        ) : null}
                      </div>

                      {item.description ? (
                        <p className="mt-1 whitespace-pre-line text-justify">
                          {toPlainText(item.description)}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {resumeSkills.length ? (
              <section className="pt-5">
                <h3 className="border-b border-black pb-0.5 text-[12px] font-bold uppercase leading-[1.35] sm:text-[13px]">
                  Skills
                </h3>
                <ul className="grid list-disc grid-cols-1 gap-x-8 gap-y-1.5 pl-5 pt-1.5 sm:grid-cols-2 lg:grid-cols-3">
                  {resumeSkills.map((item, index) => (
                    <li key={`${item.skill}-${index}`}>
                      {item.skill}
                      {item.proficiency ? ` — ${item.proficiency}` : ""}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {meaningfulEducationEntries.length ? (
              <section className="pt-5">
                <h3 className="border-b border-black pb-0.5 text-[12px] font-bold uppercase leading-[1.35] sm:text-[13px]">
                  Education
                </h3>
                <div className="space-y-3 pt-1.5">
                  {meaningfulEducationEntries.map((item, index) => (
                    <div
                      key={item._id || index}
                      className="flex items-start justify-between gap-4"
                    >
                      <div className="min-w-0">
                        {item.educationalAttainment ||
                        item.level ||
                        item.course ? (
                          <div className="font-bold">
                            {item.educationalAttainment ||
                              item.level ||
                              item.course}
                          </div>
                        ) : null}

                        {item.school || item.campus ? (
                          <div className="italic">
                            {item.school || item.campus}
                          </div>
                        ) : null}

                        {item.description ? (
                          <p className="whitespace-pre-line">
                            {toPlainText(item.description)}
                          </p>
                        ) : null}
                      </div>

                      {formatEntryDate(item) ? (
                        <div className="shrink-0 whitespace-nowrap italic">
                          {formatEntryDate(item)}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {resumeProfileSections.map(([sectionTitle, items]) => (
              <section key={sectionTitle} className="pt-5">
                <h3 className="border-b border-black pb-0.5 text-[12px] font-bold uppercase leading-[1.35] sm:text-[13px]">
                  {sectionTitle}
                </h3>
                <div className="space-y-3 pt-1.5">
                  {items.map((item, index) => (
                    <div key={item._id || `${sectionTitle}-${index}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          {item.title || item.name || item.organization ? (
                            <div className="font-bold">
                              {item.title || item.name || item.organization}
                            </div>
                          ) : null}

                          {item.issuer ||
                          item.role ||
                          item.company ||
                          item.organization ? (
                            <div className="italic">
                              {item.issuer ||
                                item.role ||
                                item.company ||
                                item.organization}
                            </div>
                          ) : null}
                        </div>

                        {formatEntryDate(item) ? (
                          <div className="shrink-0 whitespace-nowrap italic">
                            {formatEntryDate(item)}
                          </div>
                        ) : null}
                      </div>

                      {item.description ? (
                        <p className="mt-1 whitespace-pre-line text-justify">
                          {toPlainText(item.description)}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>
            ))}

            {meaningfulReferences.length ? (
              <section className="pt-5">
                <h3 className="border-b border-black pb-0.5 text-[12px] font-bold uppercase leading-[1.35] sm:text-[13px]">
                  References
                </h3>
                <div className="grid grid-cols-1 gap-x-8 gap-y-3 pt-1.5 sm:grid-cols-2">
                  {meaningfulReferences.map((item, index) => (
                    <div key={item._id || index}>
                      {item.name || item.title ? (
                        <div className="font-bold">
                          {item.name || item.title}
                        </div>
                      ) : null}
                      {item.position ? (
                        <div className="italic">{item.position}</div>
                      ) : null}
                      {item.company ? <div>{item.company}</div> : null}
                      {item.phone ? <div>{item.phone}</div> : null}
                      {item.email ? (
                        <div className="break-all text-blue-700 underline">
                          {item.email}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {!String(profile.aboutMe || "").trim() &&
            !personalInformationRows.length &&
            !meaningfulWorkExperiences.length &&
            !resumeSkills.length &&
            !meaningfulEducationEntries.length &&
            !resumeProfileSections.length &&
            !meaningfulReferences.length ? (
              <div className="py-16 text-center font-sans text-sm text-gray-500">
                No resume information is available yet.
              </div>
            ) : null}
          </article>
        </div>
      </section>
    );
  };

  const ActivityTimeline = () => (
    <section className="flex min-h-[620px] flex-col rounded-[20px] border border-[#d8e2ee] bg-white p-5 shadow-sm sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="text-lg font-bold text-black">{showAllActivity ? "All Activity" : "Recent Activity"}</h2>{showAllActivity ? <p className="mt-1 text-xs text-gray-500">Complete activity log for this user.</p> : null}</div>
        <button type="button" onClick={() => { setShowAllActivity((value) => !value); setActivityPage(1); }} className="text-xs font-semibold text-[#174b91] hover:underline">
          {showAllActivity ? "← Back to Recent Activity" : "View All Activity →"}
        </button>
      </div>

      {activityItems.length ? (
        <div className={cn("mt-5 flex-1", showAllActivity ? "divide-y divide-[#e5edf5]" : "max-w-4xl space-y-5")}>
          {visibleActivityItems.map((item) => (
            <article
              key={item.key}
              className={cn("relative pl-5", showAllActivity ? "py-4" : "border-l border-[#d8e2ee] pb-1 last:border-l-transparent")}
            >
              <span className="absolute -left-[5px] top-1 h-2.5 w-2.5 rounded-full bg-[#3875ff]" />

              <p className="text-xs font-medium text-gray-500">
                {formatActivityDateTime(item.occurredAt)}
              </p>
              <h3 className="mt-1 text-sm font-bold text-black">
                {item.title}
              </h3>
              <p className="mt-1 text-xs leading-5 text-gray-600">
                {item.description}
              </p>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-xl border border-dashed border-[#d8e2ee] bg-[#f8fafc] px-5 py-12 text-center text-sm text-gray-500">
          No recent activity is available for this jobseeker.
        </div>
      )}
      {showAllActivity && activityItems.length ? <Pagination currentPage={activityPage} totalItems={activityItems.length} pageSize={activityPageSize} onPageChange={setActivityPage} onPageSizeChange={(value) => { setActivityPageSize(value); setActivityPage(1); }} /> : null}
    </section>
  );

  const ApplicationHistory = () => (
    <section className="rounded-[20px] border border-[#d8e2ee] bg-white p-5 shadow-sm sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-black">Application History</h2>
          <p className="mt-1 text-xs text-gray-500">
            Track where this user has applied and their progress.
          </p>
        </div>
        <div className="text-right"><button type="button" onClick={() => navigate(`/admin/users/${userId}/application-history`)} className="text-xs font-semibold text-[#174b91] hover:underline">View full tracking history →</button><p className="mt-1 text-[11px] text-gray-500">{applications.length} Total Applications</p></div>
      </div>

      {applications.length ? (
        <div className="mt-5 space-y-3">
          {paginatedApplications.map((application) => {
            const job = application.job || {};
            const employerProfile = application.employer?.employerProfile || {};
            const presentation = getApplicationPresentation(application);
            const companyName =
              job.companyName ||
              employerProfile.companyName ||
              "Company not specified";
            const locationText =
              job.location ||
              job.address ||
              employerProfile.regionCity ||
              "Location not specified";
            const timeline = (Array.isArray(application.activityHistory) ? application.activityHistory : [])
              .map((item, index) => ({ key: item._id || `${application._id}-${index}`, title: item.title || item.description || "Application updated", date: item.occurredAt || item.createdAt || application.updatedAt }))
              .filter((item) => item.date)
              .sort((first, second) => new Date(second.date).getTime() - new Date(first.date).getTime())
              .slice(0, 4);

            return (
              <article
                key={application._id}
                className="rounded-xl border border-[#d8e2ee] bg-white px-4 py-4 transition hover:border-[#b9cce1] sm:px-5"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-black">
                      {job.title || job.jobTitle || "Job position"}
                    </h3>
                    <p className="mt-1 text-xs font-medium text-gray-600">
                      {companyName}
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500">
                      <span className="inline-flex items-center gap-1">
                        <Icon name="mapPin" className="h-3.5 w-3.5" />
                        {locationText}
                      </span>
                      <span aria-hidden="true">•</span>
                      <span>
                        Applied{" "}
                        {formatDate(
                          application.appliedAt || application.createdAt
                        )}
                      </span>
                    </div>
                  </div>

                  <span
                    className={cn(
                      "inline-flex w-fit items-center rounded-full border px-3 py-1 text-[10px] font-semibold",
                      presentation.badgeClass
                    )}
                  >
                    {presentation.label}
                  </span>
                </div>

                <div className="mt-4 flex items-center justify-between gap-4 text-[11px]">
                  <span className="text-gray-600">
                    {presentation.description}
                  </span>
                  <span className="shrink-0 font-semibold text-black">
                    {presentation.progress}%
                  </span>
                </div>

                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#edf2f7]">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      presentation.barClass
                    )}
                    style={{ width: `${presentation.progress}%` }}
                  />
                </div>

                <div className="mt-3 rounded-lg border border-[#e5edf5] bg-[#fbfdff] px-3 py-3">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#2e66a6]">Progress Timeline</p>
                  <div className="mt-2 space-y-1.5">{(timeline.length ? timeline : [{ key: `${application._id}-submitted`, title: "Application submitted", date: application.appliedAt || application.createdAt }]).map((item) => <div key={item.key} className="flex items-center justify-between gap-4 text-[10px]"><span className="text-gray-600">{item.title}</span><span className="shrink-0 text-gray-400">{formatDate(item.date)}</span></div>)}</div>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-[10px] text-gray-400">
                    {formatRelativeTime(
                      application.updatedAt ||
                        application.reviewedAt ||
                        application.appliedAt ||
                        application.createdAt
                    )}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      navigate(`/admin/applications/${application._id}`)
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#174b91] transition hover:bg-[#f7faff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2"
                  >
                    <Icon name="eye" className="h-3.5 w-3.5" />
                    View application
                  </button>
                </div>
              </article>
            );
          })}

          {applications.length > APPLICATIONS_PER_PAGE ? (
            <div className="flex flex-col gap-3 border-t border-[#d8e2ee] pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-gray-500">
                Showing{" "}
                {(applicationPage - 1) * APPLICATIONS_PER_PAGE + 1} to{" "}
                {Math.min(
                  applicationPage * APPLICATIONS_PER_PAGE,
                  applications.length
                )}{" "}
                of {applications.length}
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setApplicationPage((page) => Math.max(page - 1, 1))
                  }
                  disabled={applicationPage === 1}
                  className="rounded-lg border border-[#d8e2ee] bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  Previous
                </button>

                <span className="rounded-lg bg-[#eef5fc] px-3 py-1.5 text-xs font-semibold text-[#2e66a6]">
                  Page {applicationPage} of {totalApplicationPages}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setApplicationPage((page) =>
                      Math.min(page + 1, totalApplicationPages)
                    )
                  }
                  disabled={applicationPage === totalApplicationPages}
                  className="rounded-lg border border-[#d8e2ee] bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}

        </div>
      ) : (
        <div className="mt-5 rounded-xl border border-dashed border-[#d8e2ee] bg-[#f8fafc] px-5 py-12 text-center text-sm text-gray-500">
          No application history is available for this jobseeker.
        </div>
      )}
    </section>
  );

  if (loading) {
    return (
      <AdminLayout>
        <div className="w-full px-0 py-10">
          <button onClick={handleBack} className="mb-6 rounded-full p-2 hover:bg-slate-100" aria-label="Back"><Icon name="arrowLeft" className="h-5 w-5" /></button>
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-20">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
            <p className="mt-4 text-sm text-slate-600">Loading user profile...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error || !user) {
    return (
      <AdminLayout>
        <div className="w-full px-0 py-10">
          <button onClick={handleBack} className="mb-6 rounded-full p-2 hover:bg-slate-100" aria-label="Back"><Icon name="arrowLeft" className="h-5 w-5" /></button>
          <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-red-700">{error || "User not found."}</div>
        </div>
      </AdminLayout>
    );
  }

  const archiveLastActive = location.state?.lastActive || user.lastLogin || user.updatedAt || user.createdAt;
  const archiveDate = location.state?.archivedAt || user.updatedAt || user.createdAt;
  const archiveInactivityDays = Number.isFinite(Number(location.state?.inactivityDays))
    ? Number(location.state.inactivityDays)
    : Math.max(
        0,
        Math.floor((Date.now() - new Date(archiveLastActive || Date.now()).getTime()) / 86400000)
      );

  const archiveBanner = isArchiveView ? (
    <div className="flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-bold">Account marked as inactive</p>
        <p className="mt-0.5 text-xs text-rose-600">
          Archived on {formatDate(archiveDate)} due to prolonged inactivity.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
        <span className="rounded-full border border-rose-200 bg-white px-3 py-1.5">
          Last Active: {formatDate(archiveLastActive)}
        </span>
        <span className="rounded-full border border-rose-200 bg-white px-3 py-1.5">
          Total Inactivity: {archiveInactivityDays} days
        </span>
      </div>
    </div>
  ) : null;

  if (!isJobseeker) {
    const employerProfile = user.employerProfile || {};
    const employerDocs = employerProfile.verificationDocs || {};
    const companyName = employerProfile.companyName || fullName || "Company";
    const logoUrl = getFileUrl(employerProfile.companyLogo || user.profileImage);
    const coverUrl = getFileUrl(employerProfile.coverPhoto);
    const employerVerified =
      String(employerDocs.overallStatus || "").toLowerCase() === "verified" || user?.isVerified;

    const socialLinks = [
      { key: "facebookUrl", label: "Facebook", icon: "facebook", url: employerProfile.facebookUrl },
      { key: "instagramUrl", label: "Instagram", icon: "instagram", url: employerProfile.instagramUrl },
      { key: "youtubeUrl", label: "YouTube", icon: "youtube", url: employerProfile.youtubeUrl },
      { key: "linkedinUrl", label: "LinkedIn", icon: "linkedin", url: employerProfile.linkedinUrl },
      { key: "xUrl", label: "X / Twitter", icon: "twitter", url: employerProfile.xUrl },
    ].filter((item) => String(item.url || "").trim());

    const galleryItems = Array.isArray(employerProfile.galleryImages)
      ? employerProfile.galleryImages.filter(Boolean)
      : [];

    const reviewItems = Array.isArray(employerProfile.reviews)
      ? [...employerProfile.reviews].sort(
          (a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0)
        )
      : [];

    const getJobStatus = (job) => {
      const storedStatus = String(job?.status || "").toLowerCase();
      const deadline = new Date(job?.applicationDeadline || job?.validUntil || job?.deadline || "");
      const isExpired = !Number.isNaN(deadline.getTime()) && deadline.getTime() < Date.now();

      if (job?.isArchived || storedStatus === "closed" || storedStatus === "filled") {
        return storedStatus === "filled" ? "filled" : "closed";
      }

      if (isExpired) return "expired";
      if (job?.isActive === false || job?.isPublished === false || storedStatus === "draft") return "inactive";
      return "open";
    };

    const activeJobs = jobPosts.filter((job) => getJobStatus(job) === "open");
    const totalApplicants = jobPosts.reduce(
      (total, job) => total + Number(job?.applicantCount ?? job?.applicantsCount ?? 0),
      0
    );

    const formatJobSalary = (job) => {
      if (job?.hideSalary) return "Salary not specified";

      const min = Number(job?.salaryMin);
      const max = Number(job?.salaryMax);
      const hasMin = Number.isFinite(min) && min > 0;
      const hasMax = Number.isFinite(max) && max > 0;

      if (hasMin && hasMax) return `₱${min.toLocaleString()} - ₱${max.toLocaleString()}`;
      if (hasMin) return `From ₱${min.toLocaleString()}`;
      if (hasMax) return `Up to ₱${max.toLocaleString()}`;
      return "Salary not specified";
    };

    const formatApplicationDeadline = (job) => {
      const value =
        job?.applicationDeadline ||
        job?.validUntil ||
        job?.deadline;

      if (!value) return "Application deadline not specified";

      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        return "Application deadline not specified";
      }

      return `Deadline of application: ${date.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
      })}`;
    };

    const normalizeWorkModeLabel = (value) => {
      const normalized = String(value || "").trim().toLowerCase();
      if (!normalized) return "";
      if (normalized.includes("hybrid") || normalized.includes("blended")) return "Blended";
      if (normalized.includes("work from home") || normalized.includes("wfh")) return "Work from Home";
      if (normalized.includes("remote")) return "Remote";
      if (normalized.includes("on-site") || normalized.includes("onsite") || normalized.includes("on site")) return "On-site";
      return String(value || "").trim();
    };

    const formatExperienceBadge = (value) => {
      const raw = String(value || "").trim();
      const normalized = raw.toLowerCase();

      if (!raw) return "";
      if (normalized.includes("no experience")) return "No Experience Required";

      const yearMatch = normalized.match(/(\d+)\s*\+?\s*year/);
      if (yearMatch) {
        const years = yearMatch[1];
        return `${years} ${years === "1" ? "Year" : "Years"} Experience`;
      }

      if (normalized.includes("6+")) return "6+ Years Experience";
      return raw;
    };

    const isOpenToFreshGraduate = (job) =>
      job?.openToFreshGraduates === true ||
      job?.openToFreshGraduates === "true" ||
      job?.freshGraduate === true ||
      job?.freshGraduate === "true";

    const averageReview =
      reviewItems.length > 0
        ? reviewItems.reduce(
            (total, review) => total + (Number(review?.processRating ?? review?.rating) || 0),
            0
          ) / reviewItems.length
        : 0;

    const getOutcomeLabel = (value) => {
      const labels = {
        received_offer: "Received offer",
        rejected: "Rejected",
        ghosted: "Ghosted",
        withdrew: "Withdrew",
        still_in_process: "Still in process",
      };
      return labels[String(value || "").trim()] || "Outcome not provided";
    };

    const getOutcomeBadgeClass = (value) => {
      const classes = {
        received_offer: "border-emerald-200 bg-emerald-50 text-emerald-700",
        rejected: "border-red-200 bg-red-50 text-red-700",
        ghosted: "border-amber-200 bg-amber-50 text-amber-700",
        withdrew: "border-gray-200 bg-gray-100 text-gray-700",
        still_in_process: "border-blue-200 bg-blue-50 text-blue-700",
      };
      return classes[String(value || "").trim()] || classes.still_in_process;
    };

    const EmployerEmptyState = ({ icon = "document", title, subtitle }) => (
      <div className="flex min-h-[180px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#d8e2ee] bg-[#f8fbff] px-6 py-10 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#2e66a6] shadow-sm ring-1 ring-[#d8e2ee]">
          <Icon name={icon} className="h-5 w-5" />
        </div>
        <p className="mt-4 text-sm font-bold text-black">{title}</p>
        {subtitle && <p className="mt-1 max-w-md text-xs leading-relaxed text-black/50">{subtitle}</p>}
      </div>
    );

    const JobStatusBadge = ({ status }) => {
      const styles = {
        open: "border-[#2e66a6]/20 bg-[#2e66a6]/10 text-[#2e66a6]",
        filled: "border-emerald-200 bg-emerald-50 text-emerald-700",
        closed: "border-slate-200 bg-slate-100 text-slate-600",
        expired: "border-amber-200 bg-amber-50 text-amber-700",
        inactive: "border-slate-200 bg-slate-50 text-slate-500",
      };

      return (
        <span
          className={cn(
            "inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide",
            styles[status] || styles.inactive
          )}
        >
          {status}
        </span>
      );
    };

    const EmployerJobs = () => (
      <section className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 border-b border-[#edf2f7] pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
    
            <h3 className="text-2xl font-bold text-black">Jobs at {companyName}</h3>
            <p className="mt-1 text-base text-black/65">
              {activeJobs.length} Open position{activeJobs.length === 1 ? "" : "s"}
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate(`/admin/users/${userId}/posting-history`)}
            className="inline-flex w-fit items-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold text-black/70 transition hover:bg-[#f7faff] hover:text-[#2e66a6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2"
          >
            View all jobs
            <span
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10"
              aria-hidden="true"
            >
              <span className="relative left-[2px] flex items-center justify-center text-[28px] font-extrabold leading-none">
                →
              </span>
            </span>
          </button>
        </div>

        {activeJobs.length ? (
          <div className="mt-5 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {activeJobs.map((job) => {
              const experienceBadge = formatExperienceBadge(job?.experienceLevel);
              const workModeBadge = normalizeWorkModeLabel(job?.workMode);
              const badges = [
                experienceBadge,
                workModeBadge,
                isOpenToFreshGraduate(job) ? "Open Fresh Grads" : "",
              ]
                .map((badge) => String(badge || "").trim())
                .filter(Boolean)
                .filter(
                  (badge, index, items) =>
                    items.findIndex((item) => item.toLowerCase() === badge.toLowerCase()) === index
                )
                .slice(0, 3);

              const jobLogo = getFileUrl(job?.companyLogo) || logoUrl;

              return (
                <article
                  key={job._id}
                  className="group flex min-h-[320px] flex-col rounded-2xl border border-[#e5e7eb] bg-white p-7 shadow-sm transition hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-4">
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full border border-gray-200 bg-white">
                        {jobLogo ? (
                          <img
                            src={jobLogo}
                            alt={`${job?.companyName || companyName} logo`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gray-100 text-[#2e66a6]">
                            <Icon name="building" className="h-5 w-5" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h4
                          className="max-w-[150px] truncate whitespace-nowrap text-lg font-bold leading-snug text-black transition-colors group-hover:text-[#2e66a6]"
                          title={String(job?.title || job?.jobTitle || "Job Title").replaceAll('"', "")}
                        >
                          {String(job?.title || job?.jobTitle || "Job Title").replaceAll('"', "")}
                        </h4>

                        <div className="mt-1 flex min-w-0 items-center gap-2">
                          <span className="truncate text-sm font-medium text-gray-700">
                            {job?.companyName || companyName}
                          </span>

                          {employerVerified && (
                            <span
                              className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                              title="Verified"
                              aria-label="Verified company"
                            >
                              <img
                                src="/images/checkmo.png"
                                alt="Verified"
                                className="h-5 w-5 object-contain"
                                draggable="false"
                              />
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <JobStatusBadge status="open" />
                  </div>

                  <div
                    className={`relative mt-4 overflow-hidden rounded-xl bg-[#F3F4F6] p-4 ${
                      job?.isUrgent ? "pr-[108px]" : ""
                    }`}
                  >
                    {job?.isUrgent ? (
                      <img
                        src="/images/urgentneed.png"
                        alt="Urgent Hiring"
                        draggable="false"
                        className="pointer-events-none absolute -right-5 bottom-1 h-auto w-[112px] max-w-[38%] select-none object-contain"
                      />
                    ) : null}
                    <div className="flex min-w-0 items-center gap-2 text-sm text-gray-700">
                      <Icon name="mapPin" className="h-4 w-4 shrink-0 text-gray-600" />
                      <span className="truncate">{job?.location || "Location not specified"}</span>
                    </div>

                    <div className="mt-2 flex items-center gap-2 text-sm text-gray-700">
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center text-[14px] font-extrabold leading-none text-gray-600">
                        ₱
                      </span>
                      <span className="truncate">{formatJobSalary(job)}</span>
                    </div>

                    <div className="mt-2 flex items-center gap-2 text-sm text-gray-700">
                      <Icon name="briefcase" className="h-4 w-4 shrink-0 text-gray-600" />
                      <span className="truncate">{job?.jobType || "Full-time"}</span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Icon name="calendar" className="h-4 w-4 shrink-0 text-gray-600" />
                    <span className="truncate">{formatApplicationDeadline(job)}</span>
                  </div>

                  <div className="mt-4 flex min-h-[28px] flex-wrap items-center gap-2">
                    {badges.map((badge) => (
                      <span
                        key={badge}
                        className="whitespace-nowrap rounded-full border border-[#2e66a6]/30 bg-white px-2.5 py-1 text-[10px] font-semibold text-[#2e66a6] shadow-sm"
                      >
                        {badge}
                      </span>
                    ))}
                  </div>

                  <div className="mt-4 mb-5 h-px w-full bg-gray-300/80" />

                  <button
                    type="button"
                    onClick={() =>
                      navigate(`/admin/jobs/${job._id}`, {
                        state: {
                          backPath: `/admin/users/${userId}`,
                          backLabel: "Back to Employer Profile",
                        },
                      })
                    }
                    className="mt-auto inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#d8e2ee] bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:border-[#2e66a6]/40 hover:bg-[#f7faff] hover:text-[#2e66a6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2"
                  >
                    <Icon name="eye" className="h-4 w-4" />
                    View Job
                  </button>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="mt-5">
            <EmployerEmptyState
              icon="briefcase"
              title="No active job openings"
              subtitle="This company's current and previous job posts remain available through Posting History."
            />
          </div>
        )}
      </section>
    );

    const EmployerPostingHistory = () => (
      <section className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-2 border-b border-[#edf2f7] pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#2e66a6]">Company activity</p>
            <h3 className="mt-1 text-xl font-bold text-black">Posting History</h3>
            <p className="mt-1 text-sm text-black/50">Complete record of current and previous job postings.</p>
          </div>
          <span className="w-fit rounded-full bg-[#f1f6fc] px-3 py-1.5 text-xs font-bold text-[#2e66a6]">
            {jobPosts.length} total
          </span>
        </div>

        {jobPosts.length ? (
          <div className="mt-5 overflow-x-auto rounded-2xl border border-[#e2e8f0]">
            <table className="min-w-[820px] w-full text-left text-sm">
              <thead className="bg-[#f8fbff] text-[11px] font-bold uppercase tracking-wider text-black/50">
                <tr>
                  <th className="px-5 py-3.5">Job Title</th>
                  <th className="px-5 py-3.5">Applicants</th>
                  <th className="px-5 py-3.5">Date Posted</th>
                  <th className="px-5 py-3.5">Valid Until</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf2f7] bg-white">
                {jobPosts.map((job) => {
                  const status = getJobStatus(job);
                  return (
                    <tr key={job._id} className="text-black/70 transition hover:bg-[#fbfdff]">
                      <td className="px-5 py-4">
                        <p className="font-bold text-black">{job.title || job.jobTitle || "—"}</p>
                        <p className="mt-0.5 text-xs text-black/45">
                          {[job.jobType, job.workMode].filter(Boolean).join(" • ") || "—"}
                        </p>
                      </td>
                      <td className="px-5 py-4 font-semibold text-black">
                        {job.applicantCount ?? job.applicantsCount ?? 0}
                      </td>
                      <td className="px-5 py-4">{formatDate(job.createdAt)}</td>
                      <td className="px-5 py-4">
                        {formatDate(job.validUntil || job.deadline || job.applicationDeadline)}
                      </td>
                      <td className="px-5 py-4">
                        <JobStatusBadge status={status} />
                      </td>
                      <td className="px-5 py-4 text-center">
                        <button
                          type="button"
                          onClick={() =>
                            navigate(`/admin/jobs/${job._id}`, {
                              state: {
                                backPath: `/admin/users/${userId}`,
                                backLabel: "Back to Employer Profile",
                              },
                            })
                          }
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-transparent text-black/55 transition hover:border-[#d8e2ee] hover:bg-[#f7faff] hover:text-[#2e66a6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6]"
                          title="View job post"
                          aria-label="View job post"
                        >
                          <Icon name="eye" className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-5">
            <EmployerEmptyState icon="briefcase" title="No job posts yet" />
          </div>
        )}
      </section>
    );

    const employerActiveContent = {
      about: (
        <section className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-sm sm:p-6">
          <div className="border-b border-[#edf2f7] pb-5">
         
            <h3 className="mt-1 text-xl font-bold text-black">About {companyName}</h3>
          </div>

          {String(
            employerProfile.companyDescription ||
              employerProfile.aboutCompany ||
              employerProfile.description ||
              ""
          ).trim() ? (
            <div className="mt-5 space-y-5">
              <p className="whitespace-pre-line text-sm leading-7 text-black/65">
                {employerProfile.companyDescription ||
                  employerProfile.aboutCompany ||
                  employerProfile.description}
              </p>

            </div>
          ) : (
            <div className="mt-5">
              <EmployerEmptyState title="No company description added yet" />
            </div>
          )}
        </section>
      ),
      jobs: <EmployerJobs />,
      social: (
        <section className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-sm sm:p-7">
          <div>
            <h3 className="text-2xl font-bold text-black">Social Media of {companyName}</h3>
            <p className="mt-1 text-base text-black/65">Official company links and online presence</p>
          </div>

          {socialLinks.length ? (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {socialLinks.map((item) => (
                <a
                  key={item.key}
                  href={normalizeUrl(item.url)}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex min-w-0 items-center gap-4 rounded-2xl border border-[#dfe7f0] bg-white p-4 transition hover:border-[#2e66a6]/35 hover:bg-[#f8fbff]"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#dfe7f0] bg-[#f8fbff] text-[#2e66a6]">
                    <Icon name={item.icon} className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-semibold text-black">{item.label}</span>
                    <span className="mt-0.5 block truncate text-sm text-black/55">{item.url}</span>
                  </span>
                  <Icon name="external" className="h-5 w-5 shrink-0 text-[#2e66a6]" />
                </a>
              ))}
            </div>
          ) : (
            <div className="mt-6">
              <EmployerEmptyState icon="link" title="No social accounts linked yet" />
            </div>
          )}
        </section>
      ),
      gallery: (
        <section className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-sm sm:p-7">
          <div>
            <h3 className="text-2xl font-bold text-black">Gallery of {companyName}</h3>
            <p className="mt-1 text-base text-black/65">Photos and visual highlights from {companyName}</p>
          </div>

          {galleryItems.length ? (
            <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {galleryItems.map((item, index) => {
                const imgUrl = getFileUrl(item?.url || item?.imageUrl || item?.path || item);
                if (!imgUrl) return null;

                return (
                  <figure
                    key={item?._id || index}
                    className="group overflow-hidden rounded-2xl border border-[#e2e8f0] bg-[#f8fbff]"
                  >
                    <img
                      src={imgUrl}
                      alt={item?.caption || `Company gallery ${index + 1}`}
                      className="h-56 w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                    />
                    {item?.caption && (
                      <figcaption className="border-t border-[#edf2f7] bg-white px-4 py-3 text-sm text-black/60">
                        {item.caption}
                      </figcaption>
                    )}
                  </figure>
                );
              })}
            </div>
          ) : (
            <div className="mt-6">
              <EmployerEmptyState icon="document" title="No company photos added yet" />
            </div>
          )}
        </section>
      ),
      reviews: (
        <section className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="text-2xl font-bold text-black">Application process at {companyName}</h3>
              <p className="mt-1 text-base text-black/65">
                {reviewItems.length} review{reviewItems.length === 1 ? "" : "s"}
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate(`/admin/users/${userId}/reviews`)}
              className="inline-flex items-center gap-2 rounded-lg px-2 py-2 text-[15px] font-medium text-[#2e66a6] transition hover:bg-[#f7faff] hover:text-[#25578f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2"
            >
              See all reviews <span
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-[28px] font-extrabold leading-none"
              aria-hidden="true"
            >
              →
            </span>
            </button>
          </div>

          {reviewItems.length ? (
            <div className="mt-6 space-y-5">
              {reviewItems.slice(0, 3).map((review, index) => (
                <article
                  key={review?._id || index}
                  className="rounded-2xl border border-[#dfe7f0] bg-white px-5 py-5 shadow-[0_10px_28px_rgba(46,102,166,0.06)] sm:px-6 sm:py-6"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#e1e8f0] bg-[#f0f4f8]">
                        <Icon name="building" className="h-5 w-5 text-[#60758a]" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-[17px] font-bold text-black">{review?.reviewerName || "Anonymous User"}</h4>
                        <p className="mt-0.5 text-sm text-black/55">
                          {review?.roleAppliedFor || "Role not provided"} · {formatDate(review?.createdAt)}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-3">
                      <span className={cn(
                        "inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-semibold",
                        getOutcomeBadgeClass(review?.outcome)
                      )}>
                        {getOutcomeLabel(review?.outcome)}
                      </span>

                      <ReviewStars rating={review?.processRating ?? review?.rating} />
                    </div>
                  </div>

                  <p className="mt-5 whitespace-pre-line text-base leading-7 text-black/80">
                    {review?.message || review?.review || review?.comment || "No written feedback provided."}
                  </p>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-xl border border-[#dfe7f0] bg-[#fbfcfe] px-4 py-3">
                      <div className="flex items-center gap-2 text-black/50">
                        <Icon name="clock" className="h-5 w-5" />
                        <span className="text-sm">First reply</span>
                      </div>
                      <p className="mt-1 text-lg font-bold text-black">
                        {review?.daysToFirstResponse == null ? "Not provided" : `${Number(review.daysToFirstResponse) || 0}d`}
                      </p>
                    </div>

                    <div className="rounded-xl border border-[#dfe7f0] bg-[#fbfcfe] px-4 py-3">
                      <div className="flex items-center gap-2 text-black/50">
                        <Icon name="clock" className="h-5 w-5" />
                        <span className="text-sm">Total length</span>
                      </div>
                      <p className="mt-1 text-lg font-bold text-black">
                        {review?.totalProcessDays == null ? "Not provided" : `${Number(review.totalProcessDays) || 0}d`}
                      </p>
                    </div>

                    <div className="rounded-xl border border-[#dfe7f0] bg-[#fbfcfe] px-4 py-3">
                      <div className="flex items-center gap-2 text-black/50">
                        <Icon name="starOutline" className="h-5 w-5" />
                        <span className="text-sm">Process</span>
                      </div>
                      <p className="mt-1 text-lg font-bold text-black">
                        {review?.processRating == null ? "Not provided" : `${Number(review.processRating) || 0}/5`}
                      </p>
                    </div>

                    <div className="rounded-xl border border-[#dfe7f0] bg-[#fbfcfe] px-4 py-3">
                      <div className="flex items-center gap-2 text-black/50">
                        <span className="text-lg leading-none">♧</span>
                        <span className="text-sm">Apply again?</span>
                      </div>
                      <p className="mt-1 text-lg font-bold text-black">
                        {review?.wouldApplyAgain == null ? "Not provided" : review.wouldApplyAgain ? "Yes" : "No"}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-6">
              <EmployerEmptyState icon="document" title="No reviews yet" subtitle="Candidate feedback will appear here once submitted." />
            </div>
          )}
        </section>
      ),
    }[activeEmployerTab];

    return (
      <AdminLayout>
        <div className="min-h-screen bg-[#f7f9fc] px-0 py-8">
          <div className="w-full space-y-5">
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex w-fit items-center gap-2 rounded-xl border border-[#d8e2ee] bg-white px-4 py-2.5 text-sm font-semibold text-black shadow-sm transition hover:border-[#2e66a6]/35 hover:bg-[#f7faff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2"
            >
              <Icon name="arrowLeft" className="h-4 w-4" />
              {isArchiveView ? "Back to Archive" : detailsBackLabel}
            </button>

            {archiveBanner}

            <section className="overflow-hidden rounded-2xl border border-[#dfe7f0] bg-white shadow-[0_16px_40px_rgba(46,102,166,0.08)]">
              <div className="h-44 overflow-hidden bg-[#eaf2fb] sm:h-56 lg:h-64">
                {coverUrl ? (
                  <img src={coverUrl} alt={`${companyName} cover`} className="h-full w-full object-cover" />
                ) : (
                  <img src="/images/company_9.png" alt="Company cover" className="h-full w-full object-cover" />
                )}
              </div>

              <div className="px-5 pb-5 sm:px-7">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                  <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end">
                   <div className="relative z-10 -translate-y-10 flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-white text-[#2e66a6] shadow-md sm:-translate-y-12 sm:h-28 sm:w-28">
                      {logoUrl && !brokenAvatar ? (
                        <img
                          src={logoUrl}
                          alt={`${companyName} logo`}
                          className="h-full w-full object-cover"
                          onError={() => setBrokenAvatar(true)}
                        />
                      ) : (
                        <Icon name="building" className="h-10 w-10" />
                      )}
                    </div>

                    <div className="min-w-0 pb-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h1 className="break-words text-2xl font-bold leading-tight text-black sm:text-3xl">{companyName}</h1>
                      </div>

                      <div className="mt-3 space-y-2 text-sm text-black/60">
                        <p className="flex items-start gap-2">
                          <Icon name="building" className="mt-0.5 h-4 w-4 shrink-0 text-[#2e66a6]" />
                          <span>{employerProfile.industry || "Industry not specified"}</span>
                        </p>
                        <p className="flex items-start gap-2">
                          <Icon name="mapPin" className="mt-0.5 h-4 w-4 shrink-0 text-[#2e66a6]" />
                          <span>{employerProfile.companyAddress || employerProfile.regionCity || "Location not provided"}</span>
                        </p>
                        {employerProfile.companyWebsiteUrl && (
                          <a
                            href={normalizeUrl(employerProfile.companyWebsiteUrl)}
                            target="_blank"
                            rel="noreferrer"
                            className="flex min-w-0 items-center gap-2 font-medium text-[#2e66a6] hover:underline"
                          >
                            <Icon name="link" className="h-4 w-4 shrink-0" />
                            <span className="truncate">{employerProfile.companyWebsiteUrl}</span>
                          </a>
                        )}

                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <ReviewStars rating={averageReview} />
                          <span className="text-sm font-medium text-black/70">
                            {averageReview.toFixed(1)}
                          </span>
                          <span className="text-sm text-black/45">
                            ({reviewItems.length} review{reviewItems.length === 1 ? "" : "s"})
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex w-full flex-col items-center gap-3 lg:mt-7 lg:w-[290px]">
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/users/${userId}/posting-history`)}
                      className="group flex w-full items-center gap-3 rounded-2xl bg-[#2e66a6] px-4 py-3 text-left text-white shadow-sm transition hover:bg-[#285c96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/95 text-[#2e66a6]">
                        <Icon name="history" className="h-5 w-5" />
                      </span>

                      <span className="min-w-0">
                        <span className="block whitespace-nowrap text-[15px] font-semibold leading-tight">
                          Posting History
                        </span>
                        <span className="mt-0.5 block whitespace-nowrap text-xs text-white/75">
                          View job postings
                        </span>
                      </span>

                     <span className="ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-white transition group-hover:translate-x-0.5">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                    </button>

                    {!isArchiveView ? (
                      <div className="w-full whitespace-nowrap rounded-xl border border-[#d8e2ee] bg-[#f8fbff] px-4 py-2.5 text-center text-xs text-black/60 shadow-sm">
                        <span className="font-semibold text-black">
                          Last profile update:
                        </span>{" "}
                        {formatDate(user.updatedAt, true)}
                      </div>
                    ) : null}
                  </div>
                </div>


              </div>

              <div className="border-t border-[#e2e8f0] px-4 sm:px-6">
                <div className="flex gap-5 overflow-x-auto">
                  {[
                    { key: "about", label: "About" },
                    { key: "jobs", label: "Jobs" },
                    { key: "social", label: "Social Media" },
                    { key: "gallery", label: "Gallery" },
                    { key: "reviews", label: "Reviews" },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveEmployerTab(tab.key)}
                      className={cn(
                        "shrink-0 border-b-2 px-1 py-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2",
                        activeEmployerTab === tab.key
                          ? "border-[#2e66a6] text-[#2e66a6]"
                          : "border-transparent text-black/50 hover:text-black"
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <div className="pb-4">
              {activeEmployerTab === "postingHistory" ? <EmployerPostingHistory /> : employerActiveContent}
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const activeContent = {
    resume: <ResumePreview />,
    activity: <ActivityTimeline />,
    applications: <ApplicationHistory />,
  }[activeTab];

  return (
    <AdminLayout>
      <div className="min-h-screen bg-[#f7f9fc] px-0 py-8">
        <div className="w-full space-y-5">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex w-fit items-center gap-2 rounded-xl border border-[#d8e2ee] bg-white px-4 py-2.5 text-sm font-semibold text-black shadow-sm transition hover:border-[#2e66a6]/35 hover:bg-[#f7faff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2"
          >
            <Icon name="arrowLeft" className="h-4 w-4" />
            {isArchiveView ? "Back to Archive" : detailsBackLabel}
          </button>

          {archiveBanner}

          <HeaderProfile />

          <div>{activeContent}</div>
        </div>
      </div>
    </AdminLayout>
  );

};

export default UserManagementDetails;
