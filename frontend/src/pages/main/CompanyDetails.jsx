// src/pages/main/CompanyDetails.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import MainNavbar from "../../components/shared/MainNavbar";
import api from "../../services/api";

const UI = {
  container:
    "relative left-1/2 right-1/2 w-[min(96vw,1650px)] max-w-none -translate-x-1/2 px-4 sm:px-6 lg:px-8 pb-12",
  card: "bg-white border border-black/10 rounded-[24px] shadow-sm w-full",
  pad: "p-6 sm:p-8",
  btnBase:
    "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none",
  btnSm: "h-10 px-4 text-sm",
  btnMd: "h-11 px-5 text-sm",
  btnPrimary: "bg-[#0F5BDC] text-white hover:bg-[#0b4ec3]",
  btnSecondary: "bg-[#F7F7F8] text-black border border-[#E5E7EB] hover:bg-[#F1F2F4]",
  ring:
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2 focus-visible:ring-offset-white",
  tabBase:
    "inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition",
  tabActive: "bg-[#EAF2FF] text-[#0F5BDC]",
  tabInactive: "text-black/70 hover:bg-black/[0.03]",
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
    case "external":
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M14 3h7v7" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M10 14L21 3" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M21 14v6a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6" />
        </svg>
      );
    case "website":
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
            d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M3 12h18" />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
            d="M12 3c2.5 2.4 4 5.6 4 9s-1.5 6.6-4 9c-2.5-2.4-4-5.6-4-9s1.5-6.6 4-9z"
          />
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
        <svg
          className={className}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M16 6l-4-4-4 4"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 2v14"
          />
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
    case "industry":
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
            d="M3 21h18M5 21V7l7-4v18M19 21V11l-6-4M9 9h.01M9 13h.01M9 17h.01M15 13h.01M15 17h.01"
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
  return value;
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

  if (normalized === "no experience required") {
    return "No experience required";
  }

  if (normalized === "1 year") return "1 Year Experience";
  if (normalized === "2 years") return "2 Years Experience";
  if (normalized === "3 years") return "3 Years Experience";
  if (normalized === "4 years") return "4 Years Experience";
  if (normalized === "5 years") return "5 Years Experience";
  if (normalized === "6+ years") return "6+ Years Experience";

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

const CompanyLogo = ({ src, name }) => {
  const [failed, setFailed] = useState(false);
  const initial = (name?.trim()?.[0] || "C").toUpperCase();

  if (!src || failed) {
    return (
      <div className="w-[58px] h-[58px] sm:w-[72px] sm:h-[72px] rounded-2xl border border-black/10 bg-black/[0.04] flex items-center justify-center shrink-0">
        <span className="text-xl sm:text-2xl font-bold text-black/60">{initial}</span>
      </div>
    );
  }

  return (
    <div className="w-[58px] h-[58px] sm:w-[72px] sm:h-[72px] rounded-2xl border border-black/10 overflow-hidden bg-white shrink-0">
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
      <div className="w-14 h-14 rounded-full border border-gray-200 bg-gray-100 flex items-center justify-center shrink-0">
        <span className="text-base font-bold text-gray-600">{initial}</span>
      </div>
    );
  }

  return (
    <div className="w-14 h-14 rounded-full border border-gray-200 overflow-hidden bg-white shrink-0">
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

const CompanyDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [company, setCompany] = useState(null);
  const [companyJobs, setCompanyJobs] = useState([]);
  const [activeTab, setActiveTab] = useState("about");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const [showGuestModal, setShowGuestModal] = useState(false);
  const firstModalBtnRef = useRef(null);
  const modalRef = useRef(null);

  const apiOrigin = useMemo(() => {
    const base = api?.defaults?.baseURL || "http://localhost:5000/api";
    return String(base).replace(/\/api\/?$/, "");
  }, []);

  const resolveLogoUrl = useCallback(
    (logo) => {
      if (!logo) return "";
      const v = String(logo).trim();
      if (!v) return "";
      if (/^https?:\/\//i.test(v)) return v;
      if (v.startsWith("/uploads")) return `${apiOrigin}${v}`;
      return `${apiOrigin}/${v.replace(/^\/+/, "")}`;
    },
    [apiOrigin]
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
            date: formatReviewDate(review?.createdAt || review?.date),
            rating: Number(review?.rating) || 0,
            message: review?.message || "",
          }))
        : [];

      setCompany({
        ...companyData,
        companyLogo: resolveLogoUrl(companyData.companyLogo),
        companyWebsite: website,
        rating: Number(companyData.rating) || 0,
        reviewCount: Number(companyData.reviewCount) || 0,
        reviews: normalizedReviews,
      });

      setCompanyJobs(filteredJobs);
    } catch (err) {
      console.error("Error fetching company details:", err);
      setError("Unable to load company details right now.");
      setCompany(null);
      setCompanyJobs([]);
    } finally {
      setLoading(false);
    }
  }, [id, resolveLogoUrl]);

  useEffect(() => {
    fetchCompanyDetails();
  }, [fetchCompanyDetails]);

  const gateReason = useMemo(() => {
    return {
      title: "Apply to this job with an AGAPAY account",
      body: "Build your profile, apply to this job, and track your application status with a AGAPAY account.",
      primary: "Sign Up",
      secondary: "Login",
      primaryAction: "signup",
    };
  }, []);

  const openGateModal = () => setShowGuestModal(true);

  const handleWriteReview = () => {
    openGateModal();
  };

  const handleSaveCompany = () => {
    openGateModal();
  };

  const handleApplyClick = () => {
    openGateModal();
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

  useEffect(() => {
    if (!showGuestModal) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    setTimeout(() => firstModalBtnRef.current?.focus(), 0);

    const onKeyDown = (e) => {
      if (e.key === "Escape") setShowGuestModal(false);

      if (e.key === "Tab" && modalRef.current) {
        const focusables = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusables.length) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [showGuestModal]);

  const goLogin = () => {
    setShowGuestModal(false);
    navigate("/login");
  };

  const openJoinAs = () => {
    setShowGuestModal(false);
    navigate("/join-as");
  };

  const reviews = company?.reviews || [];
  const jobsCount = companyJobs.length;
  const ratingValue = Number(company?.rating) || 0;
  const reviewCount = Number(company?.reviewCount) || 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F3F5FF]">
        <MainNavbar />

        <div className="pt-20">
          <div className="relative left-1/2 right-1/2 w-screen -ml-[50vw] -mr-[50vw] h-[200px] sm:h-[240px] lg:h-[250px] overflow-hidden">
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
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="min-h-screen bg-[#F3F5FF]">
        <MainNavbar />

        <div className="pt-20">
          <div className="relative left-1/2 right-1/2 w-screen -ml-[50vw] -mr-[50vw] h-[200px] sm:h-[240px] lg:h-[250px] overflow-hidden">
            <img src="/images/jobback.png" alt="Company banner" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/10" />
          </div>

          <div className={`${UI.container} -mt-16 sm:-mt-20 lg:-mt-24 relative z-10`}>
            <div className="mb-4">
              <button
                onClick={() => navigate("/companies")}
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
                onClick={() => navigate("/companies")}
                className={`${UI.btnBase} ${UI.btnMd} ${UI.btnPrimary} ${UI.ring} mt-6`}
                type="button"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3F5FF]">
      <MainNavbar />

      <div className="pt-20 ">
        <div className="relative left-1/2 right-1/2 w-screen -ml-[50vw] -mr-[50vw] -mt-32 h-[300px] sm:h-[320px] lg:h-[330px] overflow-hidden">
          <img src="/images/jobback.png" alt="Company banner" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/10" />
        </div>

        <div className={`${UI.container} -mt-16 sm:-mt-20 lg:-mt-24 relative z-10`}>
          <div className="mb-4 -mt-36">
            <button
              onClick={() => navigate("/companies")}
              className={`${UI.btnBase} ${UI.btnSm} ${UI.btnSecondary} ${UI.ring}`}
              type="button"
            >
              <SvgIcon name="arrowLeft" className="w-4 h-4" />
              Back to Companies
            </button>
          </div>

          <div className={`${UI.card} ${UI.pad}`}>
            <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-6">
              <div className="flex items-start gap-4 flex-1 min-w-0">
                <CompanyLogo src={company.companyLogo} name={company.companyName} />

                <div className="min-w-0 flex-1">
                  <h1 className="text-[34px] leading-tight font-bold text-black">
                    {company.companyName || "Company"}
                  </h1>

                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-[15px] text-black/60">
                    <span className="inline-flex items-center gap-2">
                      <span className="text-black/50">
                        <SvgIcon name="industry" className="w-4 h-4" />
                      </span>
                      <span>{company.industry || "Industry not specified"}</span>
                    </span>

                    <img
                      src="/images/checkmo.png"
                      alt="Verified"
                      className="w-5 h-5 object-contain"
                      draggable="false"
                    />
                  </div>

                  <div className="mt-2 flex items-center gap-2 text-[15px] text-black/65">
                    <span className="text-black/50">
                      <SvgIcon name="location" className="w-4 h-4" />
                    </span>
                    <span>{formatLocationDisplay(company.companyAddress || company.location)}</span>
                  </div>

                  {company.companyWebsite && (
                    <div className="mt-2 flex items-center gap-2 text-[15px] text-[#0F5BDC]">
                      <span className="text-black/50 shrink-0">
                        <SvgIcon name="website" className="w-4 h-4" />
                      </span>

                      <a
                        href={ensureUrlProtocol(company.companyWebsite)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 hover:underline break-all min-w-0"
                      >
                        <span>{company.companyWebsite}</span>
                        <SvgIcon name="external" className="w-4 h-4 shrink-0" />
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

              <div className="w-full xl:w-auto xl:min-w-[210px] xl:self-start">
                <div className="flex flex-col items-stretch xl:items-end gap-3">
                  <button
                    type="button"
                    onClick={handleWriteReview}
                    className={`${UI.btnBase} ${UI.btnMd} ${UI.btnPrimary} ${UI.ring} w-full xl:w-[220px]`}
                  >
                    <SvgIcon name="edit" className="w-4 h-4" />
                    Write a Review
                  </button>

                  <div className="grid grid-cols-2 gap-2 w-full xl:w-[220px]">
                    <button
                      type="button"
                      onClick={handleSaveCompany}
                      className={`${UI.btnBase} ${UI.btnMd} ${UI.btnSecondary} ${UI.ring} w-full`}
                    >
                      <SvgIcon name="bookmark" className="w-5 h-5" />
                      Save
                    </button>

                    <button
                      type="button"
                      onClick={handleShare}
                      className={`${UI.btnBase} ${UI.btnMd} ${UI.btnSecondary} ${UI.ring} w-full`}
                    >
                      <SvgIcon name="share" className="w-5 h-5" />
                      Share
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 border-t border-black/10 pt-5">
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
            <div className={`${UI.card} ${UI.pad} mt-5`}>
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
            <div className={`${UI.card} ${UI.pad} mt-5`}>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h2 className="text-[24px] font-bold text-black">
                    Jobs at {company.companyName || "Company"}
                  </h2>
                  <p className="mt-1 text-black/65 text-[16px]">
                    {jobsCount} Open position{jobsCount === 1 ? "" : "s"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => navigate("/jobs")}
                  className="text-[15px] font-medium text-black/70 hover:text-black inline-flex items-center gap-2"
                >
                  View all jobs <span aria-hidden="true">→</span>
                </button>
              </div>

              {companyJobs.length === 0 ? (
                <div className="mt-6 rounded-2xl border border-black/10 bg-[#F8FAFF] p-6 text-black/65">
                  No available jobs for this company right now.
                </div>
              ) : (
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {companyJobs.map((job) => {
                    const experienceBadgeLabel = getExperienceBadgeLabel(job.experienceLevel);
                    const tagFreshGrad = isFreshGraduateJob(job);

                    return (
                      <div
                        key={job._id}
                        className="rounded-[24px] border border-[#D9DDE5] bg-white p-5 shadow-[0_2px_10px_rgba(0,0,0,0.04)]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-4 min-w-0 flex-1">
                            <JobCardLogo
                              src={company.companyLogo}
                              name={company.companyName}
                            />

                            <div className="min-w-0 flex-1">
                              <h3 className="text-[18px] leading-7 font-bold text-[#1F2937] line-clamp-2">
                                {job.title || "Job Title"}
                              </h3>

                              <div className="mt-1 flex items-center gap-2 min-w-0">
                                <span className="text-[14px] text-[#4B5563] truncate">
                                  {company.companyName}
                                </span>
                                <img
                                  src="/images/checkmo.png"
                                  alt="Verified"
                                  className="w-5 h-5 object-contain shrink-0"
                                  draggable="false"
                                />
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            className="text-[#4B5563] hover:text-black shrink-0"
                            aria-label="Save job"
                          >
                            <SvgIcon name="bookmark" className="w-5 h-5" />
                          </button>
                        </div>

                        <div className="mt-5 rounded-2xl bg-[#F3F4F6] px-4 py-4 space-y-3">
                          <div className="flex items-center gap-3 text-[14px] text-[#374151]">
                            <SvgIcon name="location" className="w-4 h-4" />
                            <span>{formatShortLocation(job.location || company.location)}</span>
                          </div>

                          <div className="flex items-center gap-3 text-[14px] text-[#374151]">
                            <SvgIcon name="money" className="w-4 h-4" />
                            <span>{formatSalary(job.salaryMin, job.salaryMax)}</span>
                          </div>

                          <div className="flex items-center gap-3 text-[14px] text-[#374151]">
                            <SvgIcon name="contract" className="w-4 h-4" />
                            <span>{job.jobType || "Contract"}</span>
                          </div>
                        </div>

                        <div className="mt-5 flex flex-wrap gap-2">
                          {experienceBadgeLabel && (
                            <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-700 border border-blue-200">
                              {experienceBadgeLabel}
                            </span>
                          )}

                          {job.workMode && (
                            <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-[#DFF5E6] text-[#2F9E5B] border border-[#BFE7CB]">
                              {job.workMode}
                            </span>
                          )}

                          {tagFreshGrad && (
                            <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-purple-100 text-purple-700 border border-purple-200">
                              Open to Fresh Graduate
                            </span>
                          )}
                        </div>

                        <div className="mt-5 h-px bg-[#D1D5DB]" />

                        <div className="mt-6 flex items-center justify-between gap-4">
                          <button
                            type="button"
                            onClick={() => navigate(`/jobs/${job._id}`)}
                            className="inline-flex items-center gap-2 text-[15px] font-semibold text-[#4B5563] hover:text-black"
                          >
                            <span>View Details</span>
                            <span aria-hidden="true" className="text-lg leading-none">›</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleApplyClick}
                            className="h-11 px-6 rounded-xl bg-[#1F5FD5] text-white text-[15px] font-bold hover:bg-[#184fb3] transition"
                          >
                            Apply Now
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === "reviews" && (
            <div className={`${UI.card} ${UI.pad} mt-5`}>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h2 className="text-[24px] font-bold text-black">
                    Working at {company.companyName || "Company"}
                  </h2>
                  <p className="mt-1 text-black/65 text-[16px]">
                    {reviewCount} Open review{reviewCount === 1 ? "" : "s"}
                  </p>
                </div>

                <button
                  type="button"
                  className="text-[15px] font-medium text-black/70 hover:text-black inline-flex items-center gap-2"
                >
                  See all reviews <span aria-hidden="true">→</span>
                </button>
              </div>

              <div className="mt-6 space-y-4">
                {reviews.length === 0 ? (
                  <div className="rounded-2xl border border-black/10 bg-[#F8FAFF] p-6 text-black/65">
                    No reviews yet for this company.
                  </div>
                ) : (
                  reviews.map((review) => (
                    <div
                      key={review.id}
                      className="rounded-2xl border border-black/15 bg-white px-4 py-4 sm:px-5"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-black/[0.06] flex items-center justify-center shrink-0">
                            <span className="text-black/50 text-sm font-semibold">
                              {(review.reviewerName?.[0] || "U").toUpperCase()}
                            </span>
                          </div>

                          <div className="min-w-0">
                            <h3 className="text-[16px] font-bold text-black">
                              {review.reviewerName}
                            </h3>
                            <p className="text-[13px] text-black/50">{review.date}</p>
                          </div>
                        </div>

                        <StarRating rating={review.rating} size="w-5 h-5" />
                      </div>

                      <p className="mt-4 text-[16px] leading-7 text-black/80">
                        {review.message}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {showGuestModal && (
        <div className="fixed inset-0 z-[80]">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowGuestModal(false)} aria-hidden="true" />

          <div className="absolute inset-0 flex items-center justify-center px-4">
            <div
              ref={modalRef}
              className="w-full max-w-[460px] bg-white border border-gray-200 shadow-2xl rounded-2xl"
              role="dialog"
              aria-modal="true"
              aria-label="Access required"
            >
              <div className="flex items-start justify-end px-4 pt-4">
                <button
                  onClick={() => setShowGuestModal(false)}
                  className="h-9 w-9 rounded-full border border-gray-200 hover:bg-gray-50 flex items-center justify-center
                             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-400 transition"
                  aria-label="Close"
                  title="Close"
                >
                  <span className="text-lg leading-none text-gray-700">×</span>
                </button>
              </div>

              <div className="px-8 pb-8 -mt-1">
                <div className="flex justify-center">
                  <img
                    src="/images/agapaymo.png"
                    alt="AGAPAY"
                    className="h-14 w-auto object-contain select-none"
                    draggable="false"
                  />
                </div>

                <h3 className="mt-4 text-center text-3xl font-semibold text-gray-800 leading-snug">
                  {gateReason?.title || "Access required"}
                </h3>

                <p className="mt-3 text-center text-sm text-gray-600 leading-6">
                  {gateReason?.body || "Please login to continue."}
                </p>

                <div className="mt-6 flex flex-col gap-3">
                  <button
                    ref={firstModalBtnRef}
                    type="button"
                    onClick={openJoinAs}
                    className="w-full h-11 rounded-lg text-sm font-semibold text-white
                               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 transition bg-[#1e4ba0] hover:bg-[#1b4290]"
                  >
                    {gateReason?.primary || "Sign Up"}
                  </button>

                  <button
                    type="button"
                    onClick={goLogin}
                    className="w-full h-11 rounded-lg text-sm font-semibold text-gray-800
                               border border-gray-200 bg-gray-100 hover:bg-gray-200 transition
                               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-400"
                  >
                    {gateReason?.secondary || "Login"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyDetails;