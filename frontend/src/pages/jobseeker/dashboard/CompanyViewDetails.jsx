// src/pages/jobseeker/dashboard/CompanyViewDetails.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import api from "../../../services/api";
import ApplyJobModal from "../../../components/jobseeker/ApplyJobModal";

const calculateAccurateReviewSummary = ({
  reviews = [],
  ratingBreakdown = {},
  fallbackRating = 0,
  fallbackCount = 0,
} = {}) => {
  const counts = {
    5: Number(ratingBreakdown?.[5] || 0),
    4: Number(ratingBreakdown?.[4] || 0),
    3: Number(ratingBreakdown?.[3] || 0),
    2: Number(ratingBreakdown?.[2] || 0),
    1: Number(ratingBreakdown?.[1] || 0),
  };

  const breakdownReviewCount =
    counts[5] + counts[4] + counts[3] + counts[2] + counts[1];

  if (breakdownReviewCount > 0) {
    const totalPoints =
      counts[5] * 5 +
      counts[4] * 4 +
      counts[3] * 3 +
      counts[2] * 2 +
      counts[1] * 1;

    return {
      rating: totalPoints / breakdownReviewCount,
      reviewCount: breakdownReviewCount,
    };
  }

  const validRatings = (Array.isArray(reviews) ? reviews : [])
    .map((review) => Number(review?.processRating ?? review?.rating))
    .filter((rating) => Number.isFinite(rating) && rating >= 1 && rating <= 5);

  if (validRatings.length > 0) {
    const totalPoints = validRatings.reduce((sum, rating) => sum + rating, 0);

    return {
      rating: totalPoints / validRatings.length,
      reviewCount: validRatings.length,
    };
  }

  return {
    rating: Number(fallbackRating) || 0,
    reviewCount: Number(fallbackCount) || 0,
  };
};

const UI = {
  container:
    "relative left-1/2 right-1/2 w-[min(94vw,1280px)] max-w-none -translate-x-1/2 px-4 sm:px-6 lg:px-8 pb-12",
  card: "bg-white border border-[#e6edf5] rounded-[1.35rem] shadow-[0_18px_45px_rgba(46,102,166,0.08)] w-full",
  pad: "p-5 sm:p-7 lg:p-8",
  btnBase:
    "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none",
  btnSm: "h-10 px-4 text-sm",
  btnMd: "h-11 px-5 text-sm",
  btnPrimary: "bg-[#2e66a6] text-white hover:bg-[#25578f] active:bg-[#1f4b7c] shadow-[0_10px_22px_rgba(46,102,166,0.22)]",
  btnSecondary: "bg-white text-black border border-[#d8e2ee] hover:border-[#2e66a6]/40 hover:bg-[#f7faff]",
  ring:
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2 focus-visible:ring-offset-white",
  tabBase:
    "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition",
  tabActive: "bg-[#f7faff] text-[#2e66a6] border border-[#d8e2ee]",
  tabInactive: "text-black/70 hover:bg-[#f7faff] border border-transparent",
};

const SvgIcon = ({ name, className = "w-4 h-4" }) => {
  switch (name) {
    case "arrowLeft":
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15 19l-7-7 7-7" />
        </svg>
      );
    case "location":
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
            d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      );
    case "industry":
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M3 21h18" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M5 21V8l7-4v17" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 21V12l7-4v13" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M8 10h.01M8 14h.01M8 18h.01M15 12h.01M15 16h.01" />
        </svg>
      );
    case "link":
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
            d="M10 13a5 5 0 007.07 0l2.12-2.12a5 5 0 00-7.07-7.07L10.7 5.22"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
            d="M14 11a5 5 0 00-7.07 0L4.81 13.12a5 5 0 107.07 7.07l1.41-1.41"
          />
        </svg>
      );
    case "external":
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M14 3h7v7" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M10 14L21 3" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M21 14v6a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6" />
        </svg>
      );
    case "bookmark":
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
            d="M6 4.75A1.75 1.75 0 017.75 3h8.5A1.75 1.75 0 0118 4.75V21l-5-3-5 3V4.75z"
          />
        </svg>
      );
    case "share":
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 6l-4-4-4 4" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 2v14" />
        </svg>
      );
    case "edit":
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
            d="M16.862 3.487a2.1 2.1 0 112.97 2.97L8.75 17.54 4 19l1.46-4.75 11.402-10.763z"
          />
        </svg>
      );
    case "briefcase":
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
            d="M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2m-9 0h12a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2V9a2 2 0 012-2z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4 13h16" />
        </svg>
      );
    case "money":
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
            d="M12 8c-1.657 0-3 1.12-3 2.5S10.343 13 12 13s3 1.12 3 2.5S13.657 18 12 18m0-10v10m9-6a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
    case "contract":
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
            d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2m3 0H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2z"
          />
        </svg>
      );
    case "facebook":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M13.5 21v-7h2.4l.4-3h-2.8V9.1c0-.9.3-1.5 1.6-1.5H16V4.9c-.2 0-.9-.1-1.8-.1-1.8 0-3.1 1.1-3.1 3.2V11H9v3h2.3v7h2.2z" />
        </svg>
      );
    case "instagram":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" strokeWidth="1.75" />
          <circle cx="12" cy="12" r="3.75" strokeWidth="1.75" />
          <circle cx="17.3" cy="6.7" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case "linkedin":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M6.94 8.5a1.44 1.44 0 110-2.88 1.44 1.44 0 010 2.88zM5.7 18.5h2.47v-8H5.7v8zm4.03-8h2.37v1.1h.03c.33-.63 1.14-1.3 2.35-1.3 2.52 0 2.99 1.66 2.99 3.81v4.39H15v-3.89c0-.93-.02-2.12-1.29-2.12-1.3 0-1.49 1.01-1.49 2.06v3.95H9.73v-8z" />
        </svg>
      );
    case "twitter":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.9 5H16.5l-3.1 3.5L10.9 5H5l5.3 6.8L5.2 19h2.4l3.8-4.3 3.3 4.3H20l-5.5-7L18.9 5z" />
        </svg>
      );
    case "image":
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <rect x="3" y="5" width="18" height="14" rx="2" strokeWidth="1.8" />
          <circle cx="8.5" cy="10" r="1.5" strokeWidth="1.8" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M21 15l-5-5-7 7" />
        </svg>
      );
    case "paperPlane":
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
            d="M21 3L3.8 10.2c-.95.4-.9 1.77.08 2.08l6.55 2.07 2.07 6.55c.31.98 1.68 1.03 2.08.08L21 3z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M10.5 14.5L21 3" />
        </svg>
      );
    case "starOutline":
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
            d="M11.48 4.15a.6.6 0 011.04 0l2.18 4.42 4.88.71a.6.6 0 01.33 1.02l-3.53 3.44.83 4.86a.6.6 0 01-.87.63L12 16.95l-4.36 2.29a.6.6 0 01-.87-.63l.83-4.86-3.53-3.44a.6.6 0 01.33-1.02l4.88-.71 2.2-4.43z"
          />
        </svg>
      );
    default:
      return null;
  }
};

const normalizeJobsResponse = (response) => {
  let jobsData = [];
  if (response?.data?.success && response.data?.jobs) jobsData = response.data.jobs;
  else if (response?.data?.data) jobsData = response.data.data;
  else if (Array.isArray(response?.data)) jobsData = response.data;
  else if (response?.data?.success && response.data?.data) jobsData = response.data.data;
  return jobsData || [];
};

const formatLocationDisplay = (loc) => {
  const value = String(loc || "").trim();
  if (!value) return "Location not specified";

  return value
    .split(/\s+-\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .join(", ");
};

const formatShortLocation = (loc) => {
  const value = String(loc || "").trim();
  return value || "Location not specified";
};

const ensureUrlProtocol = (url) => {
  const value = String(url || "").trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
};

const formatSalary = (min, max) => {
  const hasMin = min !== undefined && min !== null && min !== "";
  const hasMax = max !== undefined && max !== null && max !== "";
  const money = (n) => `₱${Number(n).toLocaleString("en-PH")}`;

  if (hasMin && hasMax) return `${money(min)} - ${money(max)}`;
  if (hasMin) return `From ${money(min)}`;
  if (hasMax) return `Up to ${money(max)}`;
  return "Salary not specified";
};

const formatApplicationDeadline = (deadline) => {
  if (!deadline) return "Application deadline not specified";

  const date = new Date(deadline);

  if (Number.isNaN(date.getTime())) {
    return "Application deadline not specified";
  }

  return `Deadline of application: ${date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  })}`;
};

const normalizeWorkModeLabel = (value) => {
  const v = String(value || "").trim().toLowerCase();

  if (!v) return "";
  if (v.includes("hybrid") || v.includes("blended")) return "Blended";
  if (v.includes("work from home") || v.includes("wfh")) return "Work from Home";
  if (v.includes("remote")) return "Remote";
  if (v.includes("on-site") || v.includes("onsite") || v.includes("on site")) return "On-site";

  return "";
};

const normalizeBoolean = (value) => {
  if (typeof value === "boolean") return value;
  const v = String(value || "").trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes" || v === "on";
};

const normalizeExperienceLevelValue = (value) => String(value || "").trim().toLowerCase();

const isFreshGraduateJob = (job) => {
  return normalizeBoolean(job?.openToFreshGraduates);
};

const getExperienceBadgeLabel = (experienceLevel) => {
  const raw = String(experienceLevel || "").trim();
  if (!raw) return "";

  const normalized = normalizeExperienceLevelValue(raw);

  if (normalized === "no experience required") return "No Experience";
  if (
    ["less than 1 yr", "less than 1 year", "less than 1 yr exp", "less than 1 year exp"].includes(
      normalized
    )
  ) {
    return "Less than 1 Yr Exp";
  }
  if (
    ["1 year", "1 years", "2 year", "2 years", "3 year", "3 years", "1-3 years", "1-3 years exp"].includes(
      normalized
    )
  ) {
    return "1-3 Years Exp";
  }
  if (
    ["4 year", "4 years", "5 year", "5 years", "4-5 years", "4-5 years exp"].includes(
      normalized
    )
  ) {
    return "4-5 Years Exp";
  }
  if (["6+ year", "6+ years", "6+ year exp", "6+ years exp"].includes(normalized)) {
    return "6+ Years Exp";
  }

  return raw;
};

const formatReviewDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatReviewTimeAgo = (value) => {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.max(0, Math.floor(diffMs / 86400000));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 30) return `${diffDays} days ago`;

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths === 1) return "1 month ago";
  if (diffMonths < 12) return `${diffMonths} months ago`;

  const diffYears = Math.floor(diffMonths / 12);
  return diffYears === 1 ? "1 year ago" : `${diffYears} years ago`;
};

const getOutcomeLabel = (value) => {
  const labels = {
    received_offer: "Received offer",
    rejected: "Rejected",
    ghosted: "Ghosted",
    withdrew: "Withdrew",
    still_in_process: "Still in process",
  };

  return labels[String(value || "").trim()] || "Still in process";
};

const getOutcomeBadgeClass = (value) => {
  const classes = {
    received_offer: "bg-emerald-50 text-emerald-700 border-emerald-200",
    rejected: "bg-red-50 text-red-700 border-red-200",
    ghosted: "bg-amber-50 text-amber-700 border-amber-200",
    withdrew: "bg-gray-100 text-gray-700 border-gray-200",
    still_in_process: "bg-blue-50 text-blue-700 border-blue-200",
  };

  return classes[String(value || "").trim()] || classes.still_in_process;
};

const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
};

const getCompanyStorageKey = () => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    const userId = user?._id || user?.id || "guest";
    return `savedCompanies:${userId}`;
  } catch {
    return "savedCompanies:guest";
  }
};

const getLocalSavedCompanies = () => {
  try {
    const raw = localStorage.getItem(getCompanyStorageKey());
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const setLocalSavedCompanies = (companies) => {
  try {
    localStorage.setItem(
      getCompanyStorageKey(),
      JSON.stringify(Array.isArray(companies) ? companies : [])
    );
  } catch {}
};

const normalizeGalleryItems = (galleryImages) => {
  if (!galleryImages) return [];

  if (Array.isArray(galleryImages)) {
    return galleryImages
      .map((item, index) => {
        if (typeof item === "string") {
          const url = item.trim();
          if (!url) return null;
          return {
            _id: `string-${index}-${url}`,
            url,
            caption: "",
            uploadedAt: null,
          };
        }

        if (item && typeof item === "object") {
          const url = String(item.url || "").trim();
          if (!url) return null;
          return {
            _id: item._id || `obj-${index}-${url}`,
            url,
            caption: item.caption || "",
            uploadedAt: item.uploadedAt || null,
          };
        }

        return null;
      })
      .filter(Boolean);
  }

  if (typeof galleryImages === "string" && galleryImages.trim()) {
    return galleryImages
      .split(",")
      .map((item, index) => {
        const url = item.trim();
        if (!url) return null;
        return {
          _id: `csv-${index}-${url}`,
          url,
          caption: "",
          uploadedAt: null,
        };
      })
      .filter(Boolean);
  }

  return [];
};

const EmptyTabState = ({ icon = "image", title, description }) => {
  return (
    <div className="mt-6 min-h-[260px] rounded-[22px] border border-[#e6edf5] bg-[#fdfefe] flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-4 text-black/45">
        <SvgIcon name={icon} className="w-14 h-14" />
      </div>
      <p className="text-[16px] font-bold text-black/70">{title}</p>
      {description ? (
        <p className="mt-2 text-[14px] text-black/40">{description}</p>
      ) : null}
    </div>
  );
};

const CompanyLogo = ({ src, name }) => {
  const [failed, setFailed] = useState(false);
  const initial = (name?.trim()?.[0] || "C").toUpperCase();

  if (!src || failed) {
    return (
      <div className="w-[58px] h-[58px] sm:w-[72px] sm:h-[72px] rounded-2xl border border-[#d8e2ee] bg-[#f7faff] flex items-center justify-center shrink-0">
        <span className="text-xl sm:text-2xl font-bold text-black/60">{initial}</span>
      </div>
    );
  }

  return (
    <div className="w-[58px] h-[58px] sm:w-[72px] sm:h-[72px] rounded-2xl border border-[#d8e2ee] overflow-hidden bg-white shrink-0">
      <img
        src={src}
        alt={`${name || "Company"} logo`}
        className="w-full h-full object-cover"
        onError={() => setFailed(true)}
      />
    </div>
  );
};

const JobCardLogo = ({ src, name }) => {
  const [failed, setFailed] = useState(false);
  const initial = (name?.trim()?.[0] || "C").toUpperCase();

  if (!src || failed) {
    return (
      <div className="w-12 h-12 rounded-[14px] border border-gray-200 bg-gray-100 flex items-center justify-center shrink-0">
        <span className="text-base font-bold text-gray-600">{initial}</span>
      </div>
    );
  }

  return (
    <div className="w-12 h-12 rounded-[14px] border border-gray-200 overflow-hidden bg-white shrink-0">
      <img
        src={src}
        alt={`${name || "Company"} logo`}
        className="w-full h-full object-cover"
        onError={() => setFailed(true)}
      />
    </div>
  );
};

const StarRating = ({ rating = 0, size = "w-5 h-5" }) => {
  const normalized = Math.max(0, Math.min(5, Number(rating) || 0));
  const fullStars = Math.floor(normalized);

  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2, 3, 4].map((idx) => {
        const filled = idx < fullStars;
        return (
          <svg
            key={idx}
            className={`${size} ${filled ? "text-[#E4B321]" : "text-[#E4B321]/45"}`}
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.539 1.118l-2.8-2.034a1 1 0 00-1.176 0l-2.8 2.034c-.783.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81H7.03a1 1 0 00.95-.69l1.07-3.292z" />
          </svg>
        );
      })}
    </div>
  );
};

const ReviewStarInput = ({ rating, onChange, disabled = false }) => {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((value) => {
        const filled = value <= rating;
        return (
          <button
            key={value}
            type="button"
            onClick={() => !disabled && onChange(value)}
            className={`transition ${disabled ? "cursor-not-allowed" : "cursor-pointer hover:scale-105"}`}
            aria-label={`Rate ${value} star${value > 1 ? "s" : ""}`}
            disabled={disabled}
          >
            <svg
              className={`w-8 h-8 ${filled ? "text-[#E4B321]" : "text-[#E4B321]/45"}`}
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.539 1.118l-2.8-2.034a1 1 0 00-1.176 0l-2.8 2.034c-.783.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81H7.03a1 1 0 00.95-.69l1.07-3.292z" />
            </svg>
          </button>
        );
      })}
    </div>
  );
};

const SocialMediaCard = ({ icon, label, url }) => {
  const safeUrl = ensureUrlProtocol(url);

  return (
    <a
      href={safeUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between gap-4 rounded-2xl border border-[#e6edf5] bg-white p-4 shadow-[0_8px_22px_rgba(46,102,166,0.04)] hover:border-[#d8e2ee] hover:bg-[#f7faff] transition"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-11 h-11 rounded-xl border border-black/10 bg-[#F8FAFF] flex items-center justify-center text-[#0F5BDC] shrink-0">
          <SvgIcon name={icon} className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-black">{label}</p>
          <p className="text-[13px] text-black/60 truncate">{url}</p>
        </div>
      </div>

      <div className="text-[#0F5BDC] shrink-0">
        <SvgIcon name="external" className="w-4 h-4" />
      </div>
    </a>
  );
};

const GalleryImageCard = ({ item, index }) => {
  return (
    <div className="overflow-hidden rounded-[18px] border border-black/10 bg-white shadow-sm">
      <img
        src={item.url}
        alt={item.caption || `Gallery ${index + 1}`}
        className="w-full h-[220px] object-cover"
      />
      {item.caption ? (
        <div className="px-4 py-3 border-t border-black/10">
          <p className="text-sm text-black/70">{item.caption}</p>
        </div>
      ) : null}
    </div>
  );
};

const CompanyViewDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [company, setCompany] = useState(null);
  const [companyJobs, setCompanyJobs] = useState([]);
  const [activeTab, setActiveTab] = useState(
    location.state?.activeTab === "jobs" ? "jobs" : "about"
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewProcessRating, setReviewProcessRating] = useState(0);
  const [reviewRoleAppliedFor, setReviewRoleAppliedFor] = useState("");
  const [reviewDaysToFirstResponse, setReviewDaysToFirstResponse] = useState("");
  const [reviewTotalProcessDays, setReviewTotalProcessDays] = useState("");
  const [reviewOutcome, setReviewOutcome] = useState("still_in_process");
  const [reviewWouldApplyAgain, setReviewWouldApplyAgain] = useState(true);
  const [reviewMessage, setReviewMessage] = useState("");
  const [reviewerName, setReviewerName] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState("");

  const [applyingJob, setApplyingJob] = useState(null);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [appliedJobIds, setAppliedJobIds] = useState([]);
  const [savedJobIds, setSavedJobIds] = useState([]);
  const [savingJobId, setSavingJobId] = useState("");
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const toastTimerRef = useRef(null);
  const reviewsListRef = useRef(null);

  const apiOrigin = useMemo(() => {
    const base = api?.defaults?.baseURL || process.env.REACT_APP_API_URL || "https://phinmaau-job-portal-atlas.onrender.com/api";
    return String(base).replace(/\/api\/?$/, "");
  }, []);

  const showToast = useCallback((message, type = "success") => {
    setToast({ show: true, message, type });

    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }

    toastTimerRef.current = window.setTimeout(() => {
      setToast({ show: false, message: "", type: "success" });
    }, 2200);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  const resolveAssetUrl = useCallback(
    (value) => {
      if (!value) return "";
      const v = String(value).trim();
      if (!v) return "";
      if (/^https?:\/\//i.test(v)) return v;
      if (v.startsWith("/uploads")) return `${apiOrigin}${v}`;
      return `${apiOrigin}/${v.replace(/^\/+/, "")}`;
    },
    [apiOrigin]
  );

  const resolveLogoUrl = useCallback(
    (logo) => {
      return resolveAssetUrl(logo);
    },
    [resolveAssetUrl]
  );

  const buildCompanyBookmarkPayload = useCallback(
    (companyData, jobs = []) => {
      if (!companyData) return null;

      const normalizedReviews = Array.isArray(companyData.reviews)
        ? companyData.reviews.map((review, index) => ({
            _id: review?._id || review?.id || `review-${index}`,
            reviewerName: review?.reviewerName || "Anonymous User",
            roleAppliedFor: String(review?.roleAppliedFor || "").trim() || null,
            rating: Number(review?.rating) || 0,
            processRating:
              review?.processRating === undefined || review?.processRating === null
                ? null
                : Number(review.processRating),
            daysToFirstResponse:
              review?.daysToFirstResponse === undefined || review?.daysToFirstResponse === null
                ? null
                : Number(review.daysToFirstResponse),
            totalProcessDays:
              review?.totalProcessDays === undefined || review?.totalProcessDays === null
                ? null
                : Number(review.totalProcessDays),
            outcome: review?.outcome || null,
            wouldApplyAgain:
              typeof review?.wouldApplyAgain === "boolean" ? review.wouldApplyAgain : null,
            message: review?.message || "",
            createdAt: review?.createdAt || review?.date || null,
            date: review?.date || formatReviewDate(review?.createdAt || review?.date),
          }))
        : [];

      const normalizedJobs = Array.isArray(jobs)
        ? jobs.map((job) => ({
            ...job,
            companyName: companyData.companyName || job.companyName || "",
            companyLogo: resolveLogoUrl(companyData.companyLogo || job.companyLogo || ""),
            location: job.location || companyData.location || companyData.companyAddress || "",
          }))
        : [];

      return {
        _id: companyData._id,
        companyName: companyData.companyName || "",
        industry: companyData.industry || "",
        location: companyData.location || companyData.companyAddress || "",
        companyAddress: companyData.companyAddress || companyData.location || "",
        companyLogo: resolveLogoUrl(companyData.companyLogo || ""),
        companyWebsite: companyData.companyWebsite || companyData.website || companyData.link || "",
        about: companyData.about || companyData.companyDescription || "",
        rating: calculateAccurateReviewSummary({
          reviews: normalizedReviews,
          ratingBreakdown: companyData.ratingBreakdown,
          fallbackRating: companyData.rating,
          fallbackCount: companyData.reviewCount,
        }).rating,
        reviewCount: calculateAccurateReviewSummary({
          reviews: normalizedReviews,
          ratingBreakdown: companyData.ratingBreakdown,
          fallbackRating: companyData.rating,
          fallbackCount: companyData.reviewCount,
        }).reviewCount,
        ratingBreakdown: companyData.ratingBreakdown || {},
        reviews: normalizedReviews,
        jobs: normalizedJobs,
        createdAt: companyData.createdAt || new Date().toISOString(),
        facebookUrl: companyData.facebookUrl || "",
        instagramUrl: companyData.instagramUrl || "",
        linkedinUrl: companyData.linkedinUrl || "",
        xUrl: companyData.xUrl || "",
        coverPhoto: companyData.coverPhoto || "",
        galleryImages: Array.isArray(companyData.galleryImages) ? companyData.galleryImages : [],
      };
    },
    [resolveLogoUrl]
  );

  const checkIfSaved = useCallback(
    async (companyData, jobs = []) => {
      const token = localStorage.getItem("token");
      const user = getStoredUser();

      if (!token || !user || user.role !== "jobseeker") {
        setSaved(false);
        return;
      }

      try {
        const response = await api.get(`/companies/saved/check/${id}`);
        if (response?.data?.success) {
          setSaved(Boolean(response.data.isSaved));
          return;
        }
      } catch {
        const localSavedCompanies = getLocalSavedCompanies();
        const isSavedLocally = localSavedCompanies.some(
          (savedCompany) => String(savedCompany?._id || savedCompany?.id) === String(id)
        );

        if (!isSavedLocally && companyData) {
          const freshPayload = buildCompanyBookmarkPayload(companyData, jobs);
          const tokenExists = Boolean(token);
          if (tokenExists && freshPayload && false) {
            setSaved(true);
            return;
          }
        }

        setSaved(isSavedLocally);
      }
    },
    [id, buildCompanyBookmarkPayload]
  );

  const fetchCompanyDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [companyRes, jobsRes] = await Promise.all([
        api.get(`/companies/verified/${id}`),
        api.get("/jobs"),
      ]);

      const companyData = companyRes?.data?.company || null;
      const jobs = normalizeJobsResponse(jobsRes);

      if (!companyData) {
        setError("Company not found.");
        setCompany(null);
        setCompanyJobs([]);
        return;
      }

      const filteredJobs = (jobs || []).filter((job) => {
        const employerId =
          typeof job?.employer === "string"
            ? job.employer
            : job?.employer?._id || job?.employer?.id;

        return String(employerId || "") === String(companyData._id || "");
      });

      const website =
        companyData.companyWebsite ||
        companyData.website ||
        companyData.link ||
        "";

      const normalizedReviews = Array.isArray(companyData.reviews)
        ? companyData.reviews.map((review, index) => ({
            id: review?._id || review?.id || `review-${index}`,
            reviewerName: review?.reviewerName || "Anonymous User",
            roleAppliedFor: String(review?.roleAppliedFor || "").trim() || null,
            date: formatReviewDate(review?.createdAt || review?.date),
            rating: Number(review?.rating) || 0,
            processRating:
              review?.processRating === undefined || review?.processRating === null
                ? null
                : Number(review.processRating),
            daysToFirstResponse:
              review?.daysToFirstResponse === undefined || review?.daysToFirstResponse === null
                ? null
                : Number(review.daysToFirstResponse),
            totalProcessDays:
              review?.totalProcessDays === undefined || review?.totalProcessDays === null
                ? null
                : Number(review.totalProcessDays),
            outcome: review?.outcome || null,
            wouldApplyAgain:
              typeof review?.wouldApplyAgain === "boolean" ? review.wouldApplyAgain : null,
            message: review?.message || "",
            createdAt: review?.createdAt || null,
            updatedAt: review?.updatedAt || null,
          }))
        : [];

      const normalizedGallery = normalizeGalleryItems(companyData.galleryImages || []).map((item) => ({
        ...item,
        url: resolveAssetUrl(item.url),
      }));

      const normalizedCompany = {
        ...companyData,
        companyLogo: resolveLogoUrl(companyData.companyLogo),
        companyWebsite: website,
        rating: calculateAccurateReviewSummary({
          reviews: normalizedReviews,
          ratingBreakdown: companyData.ratingBreakdown,
          fallbackRating: companyData.rating,
          fallbackCount: companyData.reviewCount,
        }).rating,
        reviewCount: calculateAccurateReviewSummary({
          reviews: normalizedReviews,
          ratingBreakdown: companyData.ratingBreakdown,
          fallbackRating: companyData.rating,
          fallbackCount: companyData.reviewCount,
        }).reviewCount,
        reviews: normalizedReviews,
        facebookUrl: companyData.facebookUrl || "",
        instagramUrl: companyData.instagramUrl || "",
        linkedinUrl: companyData.linkedinUrl || "",
        xUrl: companyData.xUrl || "",
        coverPhoto: resolveAssetUrl(companyData.coverPhoto),
        galleryImages: normalizedGallery,
      };

      setCompany(normalizedCompany);
      setCompanyJobs(filteredJobs);
      await checkIfSaved(normalizedCompany, filteredJobs);
    } catch (err) {
      console.error("Error fetching company details:", err);
      setError("Unable to load company details right now.");
      setCompany(null);
      setCompanyJobs([]);
    } finally {
      setLoading(false);
    }
  }, [id, resolveLogoUrl, resolveAssetUrl, checkIfSaved]);

  useEffect(() => {
    fetchCompanyDetails();
  }, [fetchCompanyDetails]);

  const fetchAppliedJobs = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const userStr = localStorage.getItem("user");

      if (!token || !userStr) {
        setAppliedJobIds([]);
        return;
      }

      const parsedUser = JSON.parse(userStr);
      if (parsedUser.role !== "jobseeker") {
        setAppliedJobIds([]);
        return;
      }

      const response = await api.get("/applications/my-applications");

      if (response.data?.success && Array.isArray(response.data.applications)) {
        const ids = response.data.applications
          .map((application) => application?.job?._id || application?.job?.id)
          .filter(Boolean);

        setAppliedJobIds(Array.from(new Set(ids)));
      } else {
        setAppliedJobIds([]);
      }
    } catch {
      setAppliedJobIds([]);
    }
  }, []);

  useEffect(() => {
    fetchAppliedJobs();
  }, [fetchAppliedJobs]);

  const fetchSavedJobs = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const userStr = localStorage.getItem("user");

      if (!token || !userStr) {
        setSavedJobIds([]);
        return;
      }

      const parsedUser = JSON.parse(userStr);
      if (parsedUser.role !== "jobseeker") {
        setSavedJobIds([]);
        return;
      }

      const response = await api.get("/jobs/saved");

      if (response.data?.success && Array.isArray(response.data.jobs)) {
        setSavedJobIds(response.data.jobs.map((job) => job._id || job.id).filter(Boolean));
      } else {
        setSavedJobIds([]);
      }
    } catch {
      setSavedJobIds([]);
    }
  }, []);

  useEffect(() => {
    fetchSavedJobs();
  }, [fetchSavedJobs]);

  const handleSaveJob = async (job) => {
    try {
      const token = localStorage.getItem("token");
      const userStr = localStorage.getItem("user");
      const jobId = job?._id || job?.id;

      if (!token || !userStr) {
        navigate("/login");
        return;
      }

      const parsedUser = JSON.parse(userStr);

      if (parsedUser.role !== "jobseeker") {
        alert("Only job seekers can save jobs.");
        return;
      }

      if (!jobId) {
        alert("Job data not found.");
        return;
      }

      setSavingJobId(jobId);

      const isSaved = savedJobIds.includes(jobId);

      if (isSaved) {
        const response = await api.delete(`/jobs/saved/${jobId}`);
        if (response.data?.success) {
          setSavedJobIds((prev) => prev.filter((id) => id !== jobId));
          showToast("Saved job removed", "success");
        } else {
          alert(response.data?.message || "Failed to remove saved job.");
        }
      } else {
        const response = await api.post(`/jobs/saved/${jobId}`);
        if (response.data?.success) {
          setSavedJobIds((prev) => (prev.includes(jobId) ? prev : [...prev, jobId]));
          showToast("Saved job", "success");
        } else {
          alert(response.data?.message || "Failed to save job.");
        }
      }
    } catch (error) {
      alert(error.response?.data?.message || "Failed to update saved job.");
    } finally {
      setSavingJobId("");
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    const title = company?.companyName || "Company Details";

    try {
      if (navigator.share) {
        await navigator.share({
          title,
          text: `Check out this company: ${title}`,
          url,
        });
        return;
      }

      await navigator.clipboard.writeText(url);
      alert("Company link copied to clipboard.");
    } catch (err) {
      console.error("Share failed:", err);
    }
  };

  const handleToggleSaveCompany = async () => {
    const token = localStorage.getItem("token");
    const user = getStoredUser();

    if (!token || !user) {
      alert("Please login to save companies.");
      navigate("/login");
      return;
    }

    if (user.role !== "jobseeker") {
      alert("Only job seekers can save companies.");
      return;
    }

    if (!company?._id || saveLoading) return;

    const bookmarkPayload = buildCompanyBookmarkPayload(company, companyJobs);

    try {
      setSaveLoading(true);

      if (saved) {
        let removed = false;

        try {
          const response = await api.delete(`/companies/saved/${company._id}`);
          removed = Boolean(response?.data?.success);
        } catch {
          const localSavedCompanies = getLocalSavedCompanies().filter(
            (savedCompany) => String(savedCompany?._id || savedCompany?.id) !== String(company._id)
          );
          setLocalSavedCompanies(localSavedCompanies);
          removed = true;
        }

        if (removed) {
          setSaved(false);
        }
        return;
      }

      let stored = false;

      try {
        const response = await api.post(`/companies/saved/${company._id}`);
        stored = Boolean(response?.data?.success);
      } catch {
        const localSavedCompanies = getLocalSavedCompanies();
        const exists = localSavedCompanies.some(
          (savedCompany) => String(savedCompany?._id || savedCompany?.id) === String(company._id)
        );

        if (!exists && bookmarkPayload) {
          localSavedCompanies.unshift(bookmarkPayload);
          setLocalSavedCompanies(localSavedCompanies);
        }

        stored = true;
      }

      if (stored) {
        if (bookmarkPayload) {
          const localSavedCompanies = getLocalSavedCompanies();
          const exists = localSavedCompanies.some(
            (savedCompany) => String(savedCompany?._id || savedCompany?.id) === String(company._id)
          );

          if (!exists) {
            localSavedCompanies.unshift(bookmarkPayload);
            setLocalSavedCompanies(localSavedCompanies);
          }
        }

        setSaved(true);
      }
    } catch (error) {
      console.error("Error saving company:", error);
      alert("Failed to update saved company. Please try again.");
    } finally {
      setSaveLoading(false);
    }
  };

  const resetReviewForm = () => {
    const storedUser = getStoredUser();
    const defaultReviewerName = [
      storedUser?.firstName,
      storedUser?.middleName,
      storedUser?.lastName,
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

    setReviewProcessRating(0);
    setReviewRoleAppliedFor("");
    setReviewDaysToFirstResponse("");
    setReviewTotalProcessDays("");
    setReviewOutcome("still_in_process");
    setReviewWouldApplyAgain(true);
    setReviewMessage("");
    setReviewerName(
      defaultReviewerName ||
        storedUser?.fullName ||
        storedUser?.username ||
        storedUser?.email?.split("@")?.[0] ||
        ""
    );
  };

  const openReviewModal = () => {
    const token = localStorage.getItem("token");
    const user = getStoredUser();

    if (!token || !user) {
      alert("Please login to write a review.");
      navigate("/login");
      return;
    }

    if (user.role !== "jobseeker") {
      alert("Only job seekers can submit reviews.");
      return;
    }

    setReviewError("");
    resetReviewForm();
    setShowReviewModal(true);
  };

  const closeReviewModal = () => {
    if (reviewSubmitting) return;
    setShowReviewModal(false);
    setReviewError("");
    resetReviewForm();
  };

  const handleSubmitReview = async () => {
    const token = localStorage.getItem("token");
    const user = getStoredUser();

    if (!token || !user) {
      alert("Please login to write a review.");
      navigate("/login");
      return;
    }

    if (user.role !== "jobseeker") {
      setReviewError("Only job seekers can submit reviews.");
      return;
    }

    const trimmedRoleAppliedFor = String(reviewRoleAppliedFor || "").trim();
    const trimmedMessage = String(reviewMessage || "").trim();
    const daysToFirstResponse =
      reviewDaysToFirstResponse === "" ? 0 : Number(reviewDaysToFirstResponse);
    const totalProcessDays =
      reviewTotalProcessDays === "" ? 0 : Number(reviewTotalProcessDays);

    if (!trimmedRoleAppliedFor) {
      setReviewError("Please enter the role you applied for.");
      return;
    }

    if (!reviewProcessRating || reviewProcessRating < 1 || reviewProcessRating > 5) {
      setReviewError("Please select an application process rating from 1 to 5.");
      return;
    }

    if (!Number.isFinite(daysToFirstResponse) || daysToFirstResponse < 0) {
      setReviewError("Days to first response must be 0 or higher.");
      return;
    }

    if (!Number.isFinite(totalProcessDays) || totalProcessDays < 0) {
      setReviewError("Total process length must be 0 or higher.");
      return;
    }

    if (!trimmedMessage) {
      setReviewError("Please enter your review.");
      return;
    }

    try {
      setReviewSubmitting(true);
      setReviewError("");

      const response = await api.post(`/companies/verified/${id}/reviews`, {
        processRating: reviewProcessRating,
        roleAppliedFor: trimmedRoleAppliedFor,
        daysToFirstResponse,
        totalProcessDays,
        outcome: reviewOutcome,
        wouldApplyAgain: reviewWouldApplyAgain,
        message: trimmedMessage,
      });

      if (response?.data?.success) {
        if (response.data.company) {
          setCompany(response.data.company);
        }

        setActiveTab("reviews");
        setShowReviewModal(false);
        setReviewError("");
        resetReviewForm();
        showToast(response.data.message || "Review submitted successfully!", "success");

        try {
          await fetchCompanyDetails();
        } catch (refreshError) {
          console.error("Error refreshing company after review:", refreshError);
        }
      }
    } catch (err) {
      console.error("Error submitting review:", err);

      if (err.response?.data?.message) {
        setReviewError(String(err.response.data.message));
      } else if (err.response?.data?.error) {
        setReviewError(String(err.response.data.error));
      } else if (err.response?.status === 401) {
        setReviewError("Session expired. Please login again.");
      } else if (err.response?.status === 403) {
        setReviewError("Only job seekers can submit reviews.");
      } else if (err.response?.status === 400) {
        setReviewError("Unable to submit review.");
      } else {
        setReviewError("Failed to submit review. Please try again.");
      }
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleWriteReview = () => {
    openReviewModal();
  };

  const handleApplyClick = async (job) => {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");
    const jobId = job?._id || job?.id;

    if (!token || !user) {
      alert("Please login to apply for jobs");
      navigate("/login");
      return;
    }

    try {
      const parsedUser = JSON.parse(user);

      if (parsedUser.role !== "jobseeker") {
        alert("Only job seekers can apply for jobs");
        return;
      }

      const verificationStatus = parsedUser.jobSeekerProfile?.verificationStatus;

      if (verificationStatus !== "verified") {
        let message = "Your account is not verified. ";
        if (verificationStatus === "pending") message += "Your verification is pending approval from admin.";
        else if (verificationStatus === "rejected") message += "Your verification was rejected. Please contact admin.";
        else message += "Please complete verification before applying.";
        alert(message);
        return;
      }

      if (!job.isActive || !job.isPublished) {
        alert("This job is no longer accepting applications");
        return;
      }

      if (job.applicationDeadline && new Date(job.applicationDeadline) < new Date()) {
        alert("Application deadline has passed");
        return;
      }

      if (jobId && appliedJobIds.includes(jobId)) {
        alert("Application already submitted");
        return;
      }

      setApplyingJob(job);
      setShowApplyModal(true);
    } catch (error) {
      console.error("Error checking user:", error);
      alert("Error checking user information");
    }
  };

  const reviews = company?.reviews || [];
  const jobsCount = companyJobs.length;
  const accurateReviewSummary = calculateAccurateReviewSummary({
    reviews,
    ratingBreakdown: company?.ratingBreakdown,
    fallbackRating: company?.rating,
    fallbackCount: company?.reviewCount,
  });
  const ratingValue = accurateReviewSummary.rating;
  const reviewCount = accurateReviewSummary.reviewCount;
  const ratingBreakdown = {
    5: Number(company?.ratingBreakdown?.[5] || 0),
    4: Number(company?.ratingBreakdown?.[4] || 0),
    3: Number(company?.ratingBreakdown?.[3] || 0),
    2: Number(company?.ratingBreakdown?.[2] || 0),
    1: Number(company?.ratingBreakdown?.[1] || 0),
  };
  const previewJobs = companyJobs.slice(0, 6);
  const previewReviews = reviews.slice(0, 6);

  const socialLinks = useMemo(() => {
    if (!company) return [];

    return [
      { key: "facebook", label: "Facebook", url: company.facebookUrl, icon: "facebook" },
      { key: "instagram", label: "Instagram", url: company.instagramUrl, icon: "instagram" },
      { key: "linkedin", label: "LinkedIn", url: company.linkedinUrl, icon: "linkedin" },
      { key: "x", label: "X / Twitter", url: company.xUrl, icon: "twitter" },
    ].filter((item) => String(item.url || "").trim());
  }, [company]);

  const galleryItems = useMemo(() => {
    return Array.isArray(company?.galleryImages) ? company.galleryImages : [];
  }, [company]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F3F5FF]">
        <div className="relative left-1/2 right-1/2 w-screen -ml-[50vw] -mr-[50vw] -mt-32 h-[220px] sm:h-[270px] lg:h-[290px] overflow-hidden">
          <img src="/images/jobback.png" alt="Company banner" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/10" />
        </div>

        <div className={`${UI.container} -mt-16 sm:-mt-20 lg:-mt-24 relative z-10`}>
          <div className={`${UI.card} ${UI.pad} animate-pulse`}>
            <div className="h-8 w-52 bg-black/5 rounded mb-6" />
            <div className="h-24 bg-black/5 rounded-2xl mb-6" />
            <div className="h-72 bg-black/5 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="min-h-screen bg-[#F3F5FF]">
        <div className="relative left-1/2 right-1/2 w-screen -ml-[50vw] -mr-[50vw] -mt-32 h-[220px] sm:h-[270px] lg:h-[290px] overflow-hidden">
          <img src="/images/jobback.png" alt="Company banner" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/10" />
        </div>

        <div className={`${UI.container} -mt-16 sm:-mt-20 lg:-mt-24 relative z-10`}>
          <div className="mb-4">
            <button
              onClick={() => navigate("/jobseeker/companies")}
              className={`${UI.btnBase} ${UI.btnSm} ${UI.btnSecondary} ${UI.ring}`}
              type="button"
            >
              <SvgIcon name="arrowLeft" className="w-4 h-4" />
              Back to Companies
            </button>
          </div>

          <div className={`${UI.card} ${UI.pad} text-center`}>
            <h1 className="text-2xl font-bold text-black">Company details unavailable</h1>
            <p className="mt-2 text-black/70">{error || "The company you are looking for could not be found."}</p>

            <button
              onClick={() => navigate("/jobseeker/companies")}
              className={`${UI.btnBase} ${UI.btnMd} ${UI.btnPrimary} ${UI.ring} mt-6`}
              type="button"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {toast.show && (
        <div className="fixed top-[100px] left-1/2 -translate-x-1/2 z-[9999] pointer-events-none">
          <div
            className={`inline-flex items-center gap-2 rounded-xl border px-5 py-3 text-sm font-semibold shadow-lg ${
              toast.type === "error"
                ? "border-red-200 bg-red-100 text-red-700"
                : "border-green-200 bg-green-100 text-green-700"
            }`}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
            <span>{toast.message}</span>
          </div>
        </div>
      )}
      <div className="relative left-1/2 right-1/2 w-screen -ml-[50vw] -mr-[50vw] -mt-20 h-[240px] sm:h-[300px] lg:h-[330px] overflow-hidden bg-white">
        <img
          src={company.coverPhoto || "/images/jobback.png"}
          alt={`${company.companyName || "Company"} cover banner`}
          className="w-full h-full object-cover object-center"
          onError={(event) => {
            event.currentTarget.onerror = null;
            event.currentTarget.src = "/images/jobback.png";
          }}
        />
      </div>

      <div className={`${UI.container} -mt-16 sm:-mt-20 lg:-mt-24 relative z-10`}>
        <div className="absolute top-[-58px] left-4 sm:left-6 lg:left-8 z-30">
          <button
            onClick={() => navigate("/jobseeker/companies")}
            className={`${UI.btnBase} ${UI.btnSm} ${UI.btnSecondary} ${UI.ring}`}
            type="button"
          >
            <SvgIcon name="arrowLeft" className="w-4 h-4" />
            Back to Companies
          </button>
        </div>

        <div className={`${UI.card} ${UI.pad} min-h-[245px] sm:min-h-[260px] lg:min-h-[275px]`}>
          <div className="flex w-full flex-col xl:flex-row xl:items-start justify-between gap-8">
            <div className="flex items-start gap-4 flex-1 min-w-0">
              <CompanyLogo src={company.companyLogo} name={company.companyName} />

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 min-w-0">
                  <h1 className="min-w-0 truncate text-3xl sm:text-4xl font-extrabold tracking-tight text-black leading-tight">
                    {company.companyName || "Company"}
                  </h1>
                  <img
                    src="/images/checkmo.png"
                    alt="Verified"
                    className="w-5 h-5 sm:w-6 sm:h-6 object-contain shrink-0"
                    draggable="false"
                  />
                </div>

                <div className="mt-2 flex items-center gap-2 text-[15px] text-black/60">
                  <span className="text-black/50">
                    <SvgIcon name="industry" className="w-4 h-4" />
                  </span>
                  <span>{company.industry || "Industry not specified"}</span>
                </div>

                <div className="mt-2 flex items-center gap-2 text-[15px] text-black/65">
                  <span className="text-black/50">
                    <SvgIcon name="location" className="w-4 h-4" />
                  </span>
                  <span>{formatLocationDisplay(company.location || company.companyAddress)}</span>
                </div>

                {company.companyWebsite && (
                  <div className="mt-2">
                    <a
                      href={ensureUrlProtocol(company.companyWebsite)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-[15px] text-[#0F5BDC] hover:underline break-all"
                    >
                      <span className="text-black/50">
                        <SvgIcon name="link" className="w-4 h-4" />
                      </span>
                      <span>{company.companyWebsite}</span>
                      <SvgIcon name="external" className="w-4 h-4" />
                    </a>
                  </div>
                )}

                <div className="mt-4 flex items-center gap-2 flex-wrap">
                  <StarRating rating={ratingValue} />
                  <span className="text-[15px] text-black/80">
                    {Number(ratingValue).toFixed(1)}
                  </span>
                  <span className="text-[14px] text-black/50">({reviewCount} reviews)</span>
                </div>
              </div>
            </div>

            <div className="w-full xl:w-[270px] shrink-0">
              <div className="flex flex-col items-stretch gap-3 rounded-2xl border border-[#e6edf5] bg-[#f7faff] p-4">
                <button
                  type="button"
                  onClick={handleWriteReview}
                  className={`${UI.btnBase} ${UI.btnMd} ${UI.btnPrimary} ${UI.ring} w-full`}
                >
                  <SvgIcon name="edit" className="w-4 h-4" />
                  Write a Review
                </button>

                <div className="flex items-center gap-2 w-full xl:w-auto">
                  <button
                    type="button"
                    onClick={handleToggleSaveCompany}
                    disabled={saveLoading}
                    className={`${UI.btnBase} ${UI.btnMd} ${UI.btnSecondary} ${UI.ring} flex-1`}
                  >
                    {saveLoading ? (
                      <span className="inline-block w-4 h-4 rounded-full border-2 border-black/20 border-t-black/70 animate-spin" />
                    ) : (
                      <SvgIcon name="bookmark" className="w-6 h-6" />
                    )}
                    {saved ? "Saved" : "Save"}
                  </button>

                  <button
                    type="button"
                    onClick={handleShare}
                    className={`${UI.btnBase} ${UI.btnMd} ${UI.btnSecondary} ${UI.ring} flex-1`}
                  >
                    <SvgIcon name="share" className="w-6 h-6" />
                    Share
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-7 border-t border-[#e6edf5] pt-5">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("about")}
                className={`${UI.tabBase} ${activeTab === "about" ? UI.tabActive : UI.tabInactive}`}
              >
                About
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("jobs")}
                className={`${UI.tabBase} ${activeTab === "jobs" ? UI.tabActive : UI.tabInactive}`}
              >
                Jobs
                <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1 rounded-full text-[11px] bg-[#DCE8FF] text-[#285DCC]">
                  {jobsCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("social")}
                className={`${UI.tabBase} ${activeTab === "social" ? UI.tabActive : UI.tabInactive}`}
              >
                Social Media
                <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1 rounded-full text-[11px] bg-[#DCE8FF] text-[#285DCC]">
                  {socialLinks.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("gallery")}
                className={`${UI.tabBase} ${activeTab === "gallery" ? UI.tabActive : UI.tabInactive}`}
              >
                Gallery
                <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1 rounded-full text-[11px] bg-[#DCE8FF] text-[#285DCC]">
                  {galleryItems.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("reviews")}
                className={`${UI.tabBase} ${activeTab === "reviews" ? UI.tabActive : UI.tabInactive}`}
              >
                Reviews
                <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1 rounded-full text-[11px] bg-[#E9ECF5] text-black/70">
                  {reviewCount}
                </span>
              </button>
            </div>
          </div>
        </div>

        {activeTab === "about" && (
          <div className={`${UI.card} ${UI.pad} mt-6`}>
            <h2 className="text-[24px] font-bold text-black">
              About {company.companyName || "Company"}
            </h2>

            <div className="mt-6 text-[17px] leading-8 text-black/80 whitespace-pre-line">
              {company.about ||
                company.companyDescription ||
                `NovaTech Solutions is a leading company committed to building high-quality services, supporting growth, and creating meaningful opportunities for professionals.

The organization focuses on delivering reliable solutions, strengthening long-term partnerships, and maintaining a collaborative environment where employees can continue to learn and grow.

With a strong commitment to innovation, service quality, and people development, ${company.companyName || "this company"} continues to expand its impact across different industries while staying focused on operational excellence and scalability.

The company also values transparency, teamwork, and continuous improvement, creating a workplace that encourages productivity, responsibility, and long-term success.`}
            </div>
          </div>
        )}

        {activeTab === "jobs" && (
          <div className={`${UI.card} ${UI.pad} mt-6`}>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-[24px] font-bold text-black">
                  Jobs at {company.companyName || "Company"}
                </h2>
                <p className="mt-1 text-black/65 text-[16px]">
                  {jobsCount} Open position{jobsCount === 1 ? "" : "s"}
                </p>
              </div>

              {jobsCount > 6 ? (
                <button
                  type="button"
                  onClick={() => navigate(`/jobseeker/company-details/${id}/jobs`)}
                  className="text-[15px] font-medium text-black/70 hover:text-black inline-flex items-center gap-2"
                >
                  View all jobs <span aria-hidden="true">→</span>
                </button>
              ) : null}
            </div>

            {companyJobs.length === 0 ? (
              <EmptyTabState
                icon="briefcase"
                title="No jobs posted yet."
                description="New openings from this company will appear here once available."
              />
            ) : (
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {previewJobs.map((job) => {
                  const jobId = job._id || job.id;
                  const experienceBadgeLabel = getExperienceBadgeLabel(job.experienceLevel);
                  const tagFreshGrad = isFreshGraduateJob(job);

                  const wmSource = job.workMode || job.workArrangement || job.workSetup || job.setup || "";
                  const wmLabel = normalizeWorkModeLabel(wmSource);
                  const tagBlended = wmLabel === "Blended";
                  const tagOnsite = wmLabel === "On-site";
                  const tagRemote = wmLabel === "Remote";
                  const tagWFH = wmLabel === "Work from Home";
                  const hasApplied = appliedJobIds.includes(jobId);
                  const isSavedJob = savedJobIds.includes(jobId);
                  const isSavingThisJob = savingJobId === jobId;

                  return (
                    <div
                      key={jobId}
                      className="group relative overflow-visible rounded-[22px] p-5 bg-white shadow-[0_6px_18px_rgba(0,0,0,0.045)] hover:shadow-[0_14px_34px_rgba(33,44,97,0.13)] hover:-translate-y-0.5 transition-all duration-200 flex flex-col min-h-[350px] border border-[#E5E7EB]"
                    >
                      {job.isUrgent ? (
                        <img
                          src="/images/gentneeded.png"
                          alt="Urgent Hiring"
                          draggable="false"
                          className="pointer-events-none absolute -top-[48px] -left-[50px] z-10 w-[230px] max-w-none select-none"
                        />
                      ) : null}

                      <button
                        type="button"
                        onClick={() => handleSaveJob(job)}
                        disabled={isSavingThisJob}
                        className={`absolute top-5 right-5 h-10 w-10 rounded-xl flex items-center justify-center transition ${
                          isSavedJob ? "text-blue-700 hover:bg-blue-100" : "text-gray-700 hover:bg-gray-50"
                        }`}
                        aria-label={`${isSavedJob ? "Remove saved" : "Save"} ${job.title || "job"}`}
                        title={isSavedJob ? "Remove Saved Job" : "Save Job"}
                      >
                        {isSavingThisJob ? (
                          <span className="inline-block w-5 h-5 rounded-full border-2 border-gray-300 border-t-blue-700 animate-spin" />
                        ) : isSavedJob ? (
                          <svg
                            className="w-5 h-5 text-blue-700"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            aria-hidden="true"
                          >
                            <path d="M6 4.75A2.75 2.75 0 018.75 2h6.5A2.75 2.75 0 0118 4.75V21a.75.75 0 01-1.154.638L12 18.58l-4.846 3.058A.75.75 0 016 21V4.75z" />
                          </svg>
                        ) : (
                          <SvgIcon name="bookmark" className="w-5 h-5" />
                        )}
                      </button>

                      <div className="flex items-start gap-4 pr-12">
                        <JobCardLogo
                          src={company.companyLogo}
                          name={company.companyName}
                        />

                        <div className="min-w-0 flex-1">
                          <h3 className="min-w-0 truncate whitespace-nowrap text-lg font-bold text-gray-800 leading-snug">
                            {String(job.title || "Job Title").replaceAll('"', "")}
                          </h3>

                          <div className="mt-1 flex items-center gap-2 min-w-0">
                            <span className="text-sm font-medium text-gray-600 truncate">
                              {company.companyName}
                            </span>
                            <img
                              src="/images/checkmo.png"
                              alt="Verified"
                              className="w-5 h-5 object-contain flex-shrink-0"
                              draggable="false"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 rounded-xl bg-[#F3F4F6] p-4 overflow-hidden">
                        <div className="flex items-center gap-2 text-sm text-gray-700 min-w-0">
                          <SvgIcon name="location" className="w-4 h-4 text-gray-600 shrink-0" />
                          <span className="min-w-0 flex-1 truncate" title={formatShortLocation(job.location || company.location)}>
                            {formatShortLocation(job.location || company.location)}
                          </span>
                        </div>

                        <div className="mt-2 flex items-center gap-2 text-sm text-gray-700 min-w-0">
                          <span className="w-4 h-4 text-gray-600 flex shrink-0 items-center justify-center font-extrabold text-[14px] leading-none">
                            ₱
                          </span>
                          <span className="min-w-0 flex-1 truncate">{formatSalary(job.salaryMin, job.salaryMax)}</span>
                        </div>

                        <div className="mt-2 flex items-center gap-2 text-sm text-gray-700 min-w-0">
                          <SvgIcon name="contract" className="w-4 h-4 text-gray-600 shrink-0" />
                          <span className="min-w-0 flex-1 truncate">{job.jobType || "Full Time Work"}</span>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center gap-2 text-[13px] font-medium text-gray-600 min-w-0">
                        <svg
                          className="w-4 h-4 text-gray-500 flex-shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M8 7V3m8 4V3m-9 8h10m-11 9h12a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v11a2 2 0 002 2z"
                          />
                        </svg>
                        <span className="min-w-0 flex-1 truncate">{formatApplicationDeadline(job.applicationDeadline)}</span>
                      </div>

                      <div className="mt-4 flex flex-nowrap items-center gap-2 overflow-hidden">
                        {experienceBadgeLabel && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap bg-blue-50 text-[#2e66a6] border border-blue-200">
                            {experienceBadgeLabel}
                          </span>
                        )}

                        {tagBlended && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap bg-blue-50 text-[#2e66a6] border border-blue-200">
                            Blended
                          </span>
                        )}

                        {tagOnsite && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap bg-blue-50 text-[#2e66a6] border border-blue-200">
                            On-site
                          </span>
                        )}

                        {tagRemote && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap bg-blue-50 text-[#2e66a6] border border-blue-200">
                            Remote
                          </span>
                        )}

                        {tagWFH && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap bg-blue-50 text-[#2e66a6] border border-blue-200">
                            Work from Home
                          </span>
                        )}

                        {tagFreshGrad && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap bg-blue-50 text-[#2e66a6] border border-blue-200">
                            Open fresh grad
                          </span>
                        )}
                      </div>

                      <div className="mt-3 w-full h-px bg-gray-300/80" />

                      <div className="pt-4">
                        <button
                          type="button"
                          onClick={() => handleApplyClick(job)}
                          disabled={hasApplied}
                          className={`w-full min-h-10 px-5 py-2 rounded-lg text-sm font-semibold transition disabled:pointer-events-none ${
                            hasApplied
                              ? "bg-blue-100 text-blue-700 border border-blue-200"
                              : "bg-[#1e4ba0] text-white border border-transparent hover:bg-[#1b4290]"
                          }`}
                          aria-disabled={hasApplied}
                          title={hasApplied ? "You already applied for this job" : "Apply now"}
                        >
                          {hasApplied ? "Already Applied" : "Apply Now"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "social" && (
          <div className={`${UI.card} ${UI.pad} mt-6`}>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-[24px] font-bold text-black">Social Media</h2>
                <p className="mt-1 text-black/65 text-[16px]">
                  Official company links and online presence
                </p>
              </div>
            </div>

            {socialLinks.length === 0 ? (
              <EmptyTabState
                icon="paperPlane"
                title="No social accounts linked yet."
                description='Click "Edit Profile" to connect your accounts.'
              />
            ) : (
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                {socialLinks.map((item) => (
                  <SocialMediaCard
                    key={item.key}
                    icon={item.icon}
                    label={item.label}
                    url={item.url}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "gallery" && (
          <div className={`${UI.card} ${UI.pad} mt-6`}>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-[24px] font-bold text-black">Gallery</h2>
                <p className="mt-1 text-black/65 text-[16px]">
                  Photos and visual highlights from {company.companyName || "this company"}
                </p>
              </div>
            </div>

         

            {galleryItems.length === 0 ? (
              <EmptyTabState
                icon="image"
                title="No photos added yet."
                description='Click "Edit Profile" to upload company photos.'
              />
            ) : (
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {galleryItems.map((item, index) => (
                  <GalleryImageCard
                    key={`${item._id || item.url}-${index}`}
                    item={item}
                    index={index}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "reviews" && (
          <div className={`${UI.card} ${UI.pad} mt-6`}>
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[430px_440px] xl:items-start xl:justify-start">
              <div>
                <h2 className="text-[24px] font-bold text-black">
                  Application process at {company.companyName || "Company"}
                </h2>
                <p className="mt-1 text-black/65 text-[16px]">
                  {reviewCount} review{reviewCount === 1 ? "" : "s"}
                </p>
              </div>

              <div className="w-full max-w-[390px] rounded-xl border border-[#dfe7f0] bg-[#fbfcfe] px-3 py-2.5">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[125px_minmax(0,1fr)] sm:items-center">
                  <div className="text-center sm:border-r sm:border-[#dfe7f0] sm:pr-3">
                    <p className="text-4xl font-bold leading-none text-[#27364a]">
                      {Number(ratingValue || 0).toFixed(1)}
                    </p>
                    <div className="mt-1 flex justify-center gap-0.5" aria-label={`${Number(ratingValue || 0).toFixed(1)} out of 5 stars`}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span key={star} className={`text-lg ${star <= Math.round(ratingValue) ? "text-[#f2b313]" : "text-[#d9e0e8]"}`}>★</span>
                      ))}
                    </div>
                    <p className="mt-1 text-[12px] text-black/65">{reviewCount} ratings in total</p>
                  </div>

                  <div className="space-y-1.5">
                    {[5, 4, 3, 2, 1].map((star) => {
                      const count = ratingBreakdown[star] || 0;
                      const percent = reviewCount > 0 ? Math.min(100, (count / reviewCount) * 100) : 0;
                      return (
                        <div key={star} className="grid grid-cols-[14px_minmax(0,1fr)_24px] items-center gap-2">
                          <span className="text-xs font-medium text-black/70">{star}</span>
                          <div className="h-2 overflow-hidden rounded-full bg-[#e9edf2]">
                            <div className="h-full rounded-full bg-[#f2b313]" style={{ width: `${percent}%` }} />
                          </div>
                          <span className="text-right text-xs text-black/65">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {reviewCount > 6 ? (
              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={() => navigate(`/jobseeker/company-details/${id}/reviews`)}
                  className="text-[15px] font-medium text-[#2e66a6] hover:text-[#25578f] inline-flex items-center gap-2"
                >
                  See all reviews <span aria-hidden="true">→</span>
                </button>
              </div>
            ) : null}

            <div ref={reviewsListRef} className="mt-6 space-y-5 scroll-mt-24">
              {reviews.length === 0 ? (
                <EmptyTabState
                  icon="starOutline"
                  title="No reviews yet."
                  description="Be the first to share your hiring process experience with this company."
                />
              ) : (
                previewReviews.map((review) => (
                  <article
                    key={review.id || review._id}
                    className="rounded-2xl border border-[#dfe7f0] bg-white px-5 py-5 sm:px-6 sm:py-6 shadow-[0_10px_28px_rgba(46,102,166,0.06)]"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-xl bg-[#f0f4f8] border border-[#e1e8f0] flex items-center justify-center shrink-0">
                          <SvgIcon name="industry" className="w-5 h-5 text-[#60758a]" />
                        </div>

                        <div className="min-w-0">
                          <h3 className="text-[17px] font-bold text-black">
                            {review.reviewerName || "Anonymous User"}
                          </h3>
                          <p className="mt-0.5 text-[14px] text-black/55">
                            {review.roleAppliedFor || "Role not provided"}
                            <span className="mx-1.5">·</span>
                            {formatReviewTimeAgo(review.createdAt) || review.date}
                          </p>
                        </div>
                      </div>

                      <div className="flex w-full flex-col items-start gap-3 sm:w-auto sm:items-end">
                        <span
                          className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-semibold ${getOutcomeBadgeClass(
                            review.outcome
                          )}`}
                        >
                          {review.outcome ? getOutcomeLabel(review.outcome) : "Outcome not provided"}
                        </span>

                      </div>
                    </div>

                    <p className="mt-5 text-[16px] leading-7 text-black/80">
                      {review.message}
                    </p>

                    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                      <div className="rounded-xl border border-[#dfe7f0] bg-[#fbfcfe] px-4 py-3">
                        <div className="flex items-center gap-2 text-black/50">
                          <SvgIcon name="clock" className="w-5 h-5" />
                          <span className="text-sm">First reply</span>
                        </div>
                        <p className="mt-1 text-[18px] font-bold text-black">
                          {review.daysToFirstResponse === null
                            ? "Not provided"
                            : `${Number(review.daysToFirstResponse) || 0}d`}
                        </p>
                      </div>

                      <div className="rounded-xl border border-[#dfe7f0] bg-[#fbfcfe] px-4 py-3">
                        <div className="flex items-center gap-2 text-black/50">
                          <SvgIcon name="clock" className="w-5 h-5" />
                          <span className="text-sm">Total length</span>
                        </div>
                        <p className="mt-1 text-[18px] font-bold text-black">
                          {review.totalProcessDays === null
                            ? "Not provided"
                            : `${Number(review.totalProcessDays) || 0}d`}
                        </p>
                      </div>

                      <div className="rounded-xl border border-[#dfe7f0] bg-[#fbfcfe] px-4 py-3">
                        <div className="flex items-center gap-2 text-black/50">
                          <SvgIcon name="starOutline" className="w-5 h-5" />
                          <span className="text-sm">Process</span>
                        </div>
                        <p className="mt-1 text-[18px] font-bold text-black">
                          {review.processRating === null
                            ? "Not provided"
                            : `${Number(review.processRating) || 0}/5`}
                        </p>
                      </div>

                      <div className="rounded-xl border border-[#dfe7f0] bg-[#fbfcfe] px-4 py-3">
                        <div className="flex items-center gap-2 text-black/50">
                          <span className="text-lg leading-none">♧</span>
                          <span className="text-sm">Apply again?</span>
                        </div>
                        <p className="mt-1 text-[18px] font-bold text-black">
                          {review.wouldApplyAgain === null
                            ? "Not provided"
                            : review.wouldApplyAgain
                              ? "Yes"
                              : "No"}
                        </p>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {showReviewModal && (
        <div className="fixed inset-0 z-[85]">
          <div
            className="absolute inset-0 bg-black/55 backdrop-blur-[1px]"
            onClick={closeReviewModal}
            aria-hidden="true"
          />

          <div className="absolute inset-0 overflow-y-auto px-4 py-6 sm:py-10">
            <div className="mx-auto w-full max-w-[760px] rounded-2xl border border-[#dfe6ee] bg-white shadow-2xl">
              <div className="flex items-start justify-between gap-4 border-b border-[#e7edf3] px-5 py-5 sm:px-7">
                <div>
                  <h3 className="text-[22px] font-bold text-[#172033]">
                    Rate a company's hiring process
                  </h3>
                  <p className="mt-1 text-sm text-black/55">
                    Help other jobseekers know what to expect — especially how long it took.
                  </p>
                </div>

                <button
                  onClick={closeReviewModal}
                  className="h-9 w-9 shrink-0 rounded-full hover:bg-gray-100 flex items-center justify-center transition"
                  aria-label="Close"
                  title="Close"
                  disabled={reviewSubmitting}
                  type="button"
                >
                  <span className="text-2xl leading-none text-gray-600">×</span>
                </button>
              </div>

              <div className="px-5 py-6 sm:px-7">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-2 text-sm font-semibold text-gray-900">
                      Company *
                    </label>
                    <input
                      value={company?.companyName || ""}
                      disabled
                      className="w-full h-11 rounded-lg border border-gray-200 bg-gray-50 px-4 text-sm text-gray-700"
                    />
                  </div>

                  <div>
                    <label className="block mb-2 text-sm font-semibold text-gray-900">
                      Role you applied for *
                    </label>
                    <input
                      value={reviewRoleAppliedFor}
                      onChange={(e) => setReviewRoleAppliedFor(e.target.value)}
                      placeholder="e.g. Frontend Engineer"
                      maxLength={160}
                      disabled={reviewSubmitting}
                      className="w-full h-11 rounded-lg border border-gray-200 px-4 text-sm outline-none focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/15"
                    />
                  </div>

                </div>

                <div className="mt-5 rounded-xl border border-[#dfe6ee] bg-[#fafbfd] p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                    <SvgIcon name="clock" className="w-5 h-5 text-gray-600" />
                    How long did it take?
                  </div>

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-2 text-sm font-semibold text-gray-900">
                        Days to first response
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={reviewDaysToFirstResponse}
                        onChange={(e) => setReviewDaysToFirstResponse(e.target.value)}
                        placeholder="e.g. 3"
                        disabled={reviewSubmitting}
                        className="w-full h-11 rounded-lg border border-gray-200 px-4 text-sm outline-none focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/15"
                      />
                      <p className="mt-1.5 text-xs text-black/45">From when you applied.</p>
                    </div>

                    <div>
                      <label className="block mb-2 text-sm font-semibold text-gray-900">
                        Total process length (days)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={reviewTotalProcessDays}
                        onChange={(e) => setReviewTotalProcessDays(e.target.value)}
                        placeholder="e.g. 21"
                        disabled={reviewSubmitting}
                        className="w-full h-11 rounded-lg border border-gray-200 px-4 text-sm outline-none focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/15"
                      />
                      <p className="mt-1.5 text-xs text-black/45">Application to final decision.</p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-2 text-sm font-semibold text-gray-900">
                      Application process rating *
                    </label>
                    <ReviewStarInput
                      rating={reviewProcessRating}
                      onChange={setReviewProcessRating}
                      disabled={reviewSubmitting}
                    />
                  </div>

                  <div>
                    <label className="block mb-3 text-sm font-semibold text-gray-900">
                      Would you apply again?
                    </label>
                    <div className="flex items-center gap-5">
                      <label className="inline-flex items-center gap-2 text-sm text-gray-800 cursor-pointer">
                        <input
                          type="radio"
                          name="wouldApplyAgain"
                          checked={reviewWouldApplyAgain === true}
                          onChange={() => setReviewWouldApplyAgain(true)}
                          disabled={reviewSubmitting}
                          className="h-4 w-4 accent-[#172033]"
                        />
                        Yes
                      </label>
                      <label className="inline-flex items-center gap-2 text-sm text-gray-800 cursor-pointer">
                        <input
                          type="radio"
                          name="wouldApplyAgain"
                          checked={reviewWouldApplyAgain === false}
                          onChange={() => setReviewWouldApplyAgain(false)}
                          disabled={reviewSubmitting}
                          className="h-4 w-4 accent-[#172033]"
                        />
                        No
                      </label>
                    </div>
                  </div>
                </div>

                <div className="mt-5">
                  <label className="block mb-2 text-sm font-semibold text-gray-900">
                    Outcome
                  </label>
                  <select
                    value={reviewOutcome}
                    onChange={(e) => setReviewOutcome(e.target.value)}
                    disabled={reviewSubmitting}
                    className="w-full h-11 rounded-lg border border-gray-200 bg-white px-4 text-sm outline-none focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/15"
                  >
                    <option value="received_offer">Received offer</option>
                    <option value="rejected">Rejected</option>
                    <option value="ghosted">Ghosted</option>
                    <option value="withdrew">Withdrew</option>
                    <option value="still_in_process">Still in process</option>
                  </select>
                </div>

                <div className="mt-5">
                  <label className="block mb-2 text-sm font-semibold text-gray-900">
                    Your review *
                  </label>
                  <textarea
                    value={reviewMessage}
                    onChange={(e) => setReviewMessage(e.target.value)}
                    rows="5"
                    maxLength={2000}
                    className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none resize-y focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/15"
                    placeholder="How were the interviews? Communication? Timing? What surprised you?"
                    disabled={reviewSubmitting}
                  />
                </div>

                <div className="mt-5">
                  <label className="block mb-2 text-sm font-semibold text-gray-900">
                    Your name
                  </label>
                  <input
                    value={reviewerName}
                    readOnly
                    aria-readonly="true"
                    className="w-full h-11 cursor-not-allowed rounded-lg border border-gray-200 bg-gray-50 px-4 text-sm text-gray-700 outline-none"
                  />
                </div>

                {reviewError && (
                  <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">
                    <p className="text-sm font-medium">{reviewError}</p>
                  </div>
                )}

                <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                  <button
                    onClick={closeReviewModal}
                    className="h-11 rounded-lg px-6 text-sm font-semibold text-gray-800 hover:bg-gray-100 transition"
                    disabled={reviewSubmitting}
                    type="button"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={handleSubmitReview}
                    disabled={reviewSubmitting}
                    className="h-11 rounded-lg bg-[#172033] px-6 text-sm font-semibold text-white transition hover:bg-[#0f1726] disabled:opacity-60"
                    type="button"
                  >
                    {reviewSubmitting ? "Posting..." : "Post review"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <ApplyJobModal
        isOpen={showApplyModal}
        onClose={() => {
          setShowApplyModal(false);
          setApplyingJob(null);
          fetchCompanyDetails();
        }}
        job={applyingJob}
        onApplicationSubmitted={() => {
          const appliedJobId = applyingJob?._id || applyingJob?.id;

          if (appliedJobId) {
            setAppliedJobIds((prev) => (prev.includes(appliedJobId) ? prev : [...prev, appliedJobId]));
          }

          fetchCompanyDetails();
          fetchAppliedJobs();
        }}
      />
    </div>
  );
};

export default CompanyViewDetails;