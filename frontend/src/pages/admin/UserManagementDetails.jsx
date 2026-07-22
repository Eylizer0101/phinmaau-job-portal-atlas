import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AdminLayout from "../../layouts/AdminLayout";
import api from "../../services/api";

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

const TABS = [
  { key: "personal", label: "Personal Info", icon: "user" },
  { key: "career", label: "Career Profile", icon: "briefcase" },
  { key: "credentials", label: "Credentials", icon: "shield" },
  { key: "education", label: "Education", icon: "academic" },
  { key: "applications", label: "Application History", icon: "history" },
];

const APPLICATIONS_PER_PAGE = 6;

const UserManagementDetails = () => {
  const { userId } = useParams();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [applications, setApplications] = useState([]);
  const [jobPosts, setJobPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("personal");
  const [activeEmployerTab, setActiveEmployerTab] = useState("about");
  const [applicationPage, setApplicationPage] = useState(1);
  const [brokenAvatar, setBrokenAvatar] = useState(false);

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
      .split(/[,\n]/)
      .map((item) => item.trim())
      .filter(Boolean);
  };

  const fetchUserDetails = useCallback(async (opts = { silent: false }) => {
    try {
      if (opts.silent) setRefreshing(true);
      else setLoading(true);
      setError("");

      const response = await api.get(`/admin/users/${userId}`);
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
  const isVerified = String(docs.overallStatus || profile.verificationStatus || "").toLowerCase() === "verified" || user?.isVerified;
  const skills = [...splitList(profile.technicalSkills), ...splitList(profile.softSkills)];
  const educationEntries = Array.isArray(profile.educationEntries) ? profile.educationEntries : [];
  const workExperiences = Array.isArray(profile.workExperiences) ? profile.workExperiences : [];

  const HeaderProfile = () => {
    const avatarUrl = getFileUrl(user?.profileImage);
    const locationText = profile.address || [profile.cityProvince, profile.region].filter(Boolean).join(", ") || "Location not provided";

    return (
      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="px-5 pt-5 pb-5 sm:px-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="h-24 w-24 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-md sm:h-28 sm:w-28">
              {avatarUrl && !brokenAvatar ? (
                <img
                  src={avatarUrl}
                  alt={fullName}
                  className="h-full w-full object-cover"
                  onError={() => setBrokenAvatar(true)}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[#2e66a6]/10 text-4xl font-bold text-[#2e66a6]">
                  {fullName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1 pt-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-2xl font-bold leading-tight text-black sm:text-3xl">
                  {fullName}
                </h1>

                {isVerified && (
                  <span className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-[11px] font-bold uppercase text-green-700">
                    Verified
                  </span>
                )}

                <span className="rounded-full border border-[#2e66a6]/20 bg-[#2e66a6]/10 px-3 py-1 text-[11px] font-bold uppercase text-[#2e66a6]">
                  Jobseeker
                </span>

                {profile.yearGraduated && (
                  <span className="rounded-full border border-[#2e66a6]/20 bg-[#2e66a6]/10 px-3 py-1 text-[11px] font-bold uppercase text-[#2e66a6]">
                    Class of {profile.yearGraduated}
                  </span>
                )}
              </div>

              <div className="mt-3 flex flex-col gap-2 text-sm text-gray-600">
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                  <span className="inline-flex min-w-0 items-center gap-2">
                    <Icon name="academic" className="h-4 w-4 shrink-0 text-[#2e66a6]" />
                    <span className="truncate">{profile.campus || "Campus not specified"}</span>
                  </span>

                  <span className="inline-flex min-w-0 items-center gap-2">
                    <Icon name="briefcase" className="h-4 w-4 shrink-0 text-[#2e66a6]" />
                    <span className="truncate">{profile.course || profile.studyField || "Course not specified"}</span>
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                  <span className="inline-flex min-w-0 items-center gap-2">
                    <Icon name="mail" className="h-4 w-4 shrink-0 text-[#2e66a6]" />
                    <span className="truncate">{user?.email || "Email not provided"}</span>
                  </span>

                  <span className="inline-flex min-w-0 items-center gap-2">
                    <Icon name="phone" className="h-4 w-4 shrink-0 text-[#2e66a6]" />
                    <span className="truncate">{profile.phoneNumber || "Phone not provided"}</span>
                  </span>
                </div>

                <span className="inline-flex min-w-0 items-start gap-2">
                  <Icon name="mapPin" className="mt-0.5 h-4 w-4 shrink-0 text-[#2e66a6]" />
                  <span className="leading-relaxed">{locationText}</span>
                </span>

                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-1 text-xs text-gray-600">
                  <span>
                    <span className="font-semibold text-black">Date Registered:</span>{" "}
                    {formatDate(user?.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  };

  const InfoItem = ({ label, value }) => (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-800">{value || "—"}</p>
    </div>
  );

  const EmptyState = ({ text }) => (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">{text}</div>
  );

  const PersonalInfo = () => (
    <section className="space-y-4">
      <h3 className="text-lg font-bold text-slate-900">Personal Information</h3>
      <div className="grid gap-5 sm:grid-cols-2">
        <InfoItem label="Birthday" value={formatDate(profile.birthday)} />
        <InfoItem label="Civil Status" value={profile.civilStatus} />
        <InfoItem label="Height" value={profile.height} />
        <InfoItem label="Weight" value={profile.weight} />
        <InfoItem label="Nationality" value={profile.nationality} />
        <InfoItem label="Preferred Language" value={profile.preferredLanguage} />
        <InfoItem label="Gender" value={profile.gender} />
       
      </div>
    </section>
  );

  const CareerProfile = () => (
    <section className="space-y-5">
      <h3 className="text-lg font-bold text-slate-900">Career Profile</h3>
      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">Skills</p>
        {skills.length ? (
          <div className="flex flex-wrap gap-2">
            {skills.map((skill, index) => <span key={`${skill}-${index}`} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{skill}</span>)}
          </div>
        ) : <p className="text-sm text-slate-500">—</p>}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <InfoItem label="Preferred Work Mode" value={profile.preferredWorkMode} />
        <InfoItem label="Employment Type" value={profile.employmentType} />
        <InfoItem label="Educational Attainment" value={profile.educationalAttainment} />
        <InfoItem label="Study Field" value={profile.studyField} />
        <InfoItem label="Willing to Relocate" value={profile.willingToRelocate} />
        <InfoItem label="How Soon Can You Start" value={profile.howSoonCanYouStart} />
      </div>
    </section>
  );

  const Credentials = () => {
    const docKeys = Object.keys(DOC_LABELS);
    return (
      <section className="space-y-4">
        <h3 className="text-lg font-bold text-slate-900">Credentials</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {docKeys.map((key) => {
            const doc = docs[key] || {};
            const url = getFileUrl(doc.url);
            return (
              <div key={key} className="flex items-center justify-between gap-3 rounded-xl border border-indigo-100 bg-indigo-50/50 px-4 py-3">
                <div className="flex min-w-0 items-center gap-2 text-sm font-semibold text-indigo-700">
                  <Icon name="document" className="h-4 w-4 shrink-0" />
                  <span className="truncate">{DOC_LABELS[key]}</span>
                </div>
                {url ? (
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => handleViewCredential(key)} className="rounded-lg p-1.5 text-slate-600 hover:bg-white hover:text-blue-700" title="View"><Icon name="eye" /></button>
                    <button type="button" onClick={() => handleDownloadCredential(key, DOC_LABELS[key])} className="rounded-lg p-1.5 text-slate-600 hover:bg-white hover:text-blue-700" title="Download"><Icon name="download" /></button>
                  </div>
                ) : <span className="text-xs font-medium text-slate-400">No file</span>}
              </div>
            );
          })}
        </div>
      </section>
    );
  };

  const Education = () => (
    <section className="space-y-4">
      <h3 className="text-lg font-bold text-slate-900">Educational Background</h3>
      {educationEntries.length ? (
        <div className="space-y-3">
          {educationEntries.map((item, index) => (
            <div key={index} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700"><Icon name="academic" /></div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{item.level || "Education"}</p>
                  <p className="text-sm font-bold text-slate-900">{item.campus || "—"}</p>
                  <p className="text-xs text-slate-700">{item.course || item.studyField || item.educationalAttainment || "—"}</p>
                  <p className="mt-1 text-xs font-medium text-slate-500">{formatYearRange(item)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : <EmptyState text="Wala pang educational background na nakalagay." />}
    </section>
  );

  const ApplicationHistory = () => (
    <section className="space-y-4">
      <h3 className="text-lg font-bold text-slate-900">Application History</h3>
      {applications.length ? (
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-widest text-slate-500">
              <tr>
                <th className="px-4 py-3">Job Title</th>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Address</th>
                <th className="px-4 py-3">Date Applied</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {paginatedApplications.map((app) => {
                const job = app.job || {};
                const employerProfile = app.employer?.employerProfile || {};
                return (
                  <tr key={app._id} className="text-slate-700">
                    <td className="px-4 py-3 font-semibold text-slate-900">{job.title || job.jobTitle || "—"}</td>
                    <td className="px-4 py-3">{job.companyName || employerProfile.companyName || "—"}</td>
                    <td className="px-4 py-3">{job.location || job.address || employerProfile.regionCity || "—"}</td>
                    <td className="px-4 py-3">{formatDate(app.appliedAt || app.createdAt)}</td>
                    <td className="px-4 py-3">
                      {(() => {
                        const status = String(app.status || "pending").toLowerCase();
                        const statusClass =
                          status === "hired"
                            ? "border-green-200 bg-green-50 text-green-700"
                            : status === "for interview"
                              ? "border-[#2e66a6]/20 bg-[#2e66a6]/10 text-[#2e66a6]"
                              : status === "declined" || status === "rejected"
                                ? "border-red-200 bg-red-50 text-red-700"
                                : status === "pending"
                                  ? "border-amber-200 bg-amber-50 text-amber-700"
                                  : "border-gray-200 bg-gray-50 text-gray-700";
                        return (
                          <span className={cn(
                            "inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold capitalize",
                            statusClass
                          )}>
                            {app.status || "pending"}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => navigate(`/admin/applications/${app._id}`)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition hover:bg-blue-50 hover:text-blue-700"
                        title="View application"
                        aria-label="View application"
                      >
                        <Icon name="eye" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {applications.length > APPLICATIONS_PER_PAGE && (
            <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs font-medium text-slate-500">
                Showing {(applicationPage - 1) * APPLICATIONS_PER_PAGE + 1} to {Math.min(applicationPage * APPLICATIONS_PER_PAGE, applications.length)} of {applications.length} results
              </p>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setApplicationPage((page) => Math.max(page - 1, 1))}
                  disabled={applicationPage === 1}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-xs font-bold transition",
                    applicationPage === 1
                      ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  )}
                >
                  Previous
                </button>

                <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">
                  Page {applicationPage} of {totalApplicationPages}
                </span>

                <button
                  type="button"
                  onClick={() => setApplicationPage((page) => Math.min(page + 1, totalApplicationPages))}
                  disabled={applicationPage === totalApplicationPages}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-xs font-bold transition",
                    applicationPage === totalApplicationPages
                      ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  )}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      ) : <EmptyState text="Wala pang application history." />}
    </section>
  );

  if (loading) {
    return (
      <AdminLayout>
        <div className="w-full px-0 py-10">
          <button onClick={() => navigate("/admin/users")} className="mb-6 rounded-full p-2 hover:bg-slate-100" aria-label="Back"><Icon name="arrowLeft" className="h-5 w-5" /></button>
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
          <button onClick={() => navigate("/admin/users")} className="mb-6 rounded-full p-2 hover:bg-slate-100" aria-label="Back"><Icon name="arrowLeft" className="h-5 w-5" /></button>
          <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-red-700">{error || "User not found."}</div>
        </div>
      </AdminLayout>
    );
  }

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
                  {job?.isUrgent && (
                    <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-full bg-[#171717] pr-4 text-sm font-bold leading-none text-white shadow-sm">
                      <span className="flex h-9 w-12 items-center justify-center overflow-visible">
                        <img src="/images/fire.png" alt="" className="h-14 w-14 max-w-none object-contain" />
                      </span>
                      Urgently Needed
                    </div>
                  )}

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

                  <div className="mt-4 rounded-xl bg-gray-100 p-4">
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
              onClick={() => navigate("/admin/users")}
              className="inline-flex w-fit items-center gap-2 rounded-xl border border-[#d8e2ee] bg-white px-4 py-2.5 text-sm font-semibold text-black shadow-sm transition hover:border-[#2e66a6]/35 hover:bg-[#f7faff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2"
            >
              <Icon name="arrowLeft" className="h-4 w-4" />
              Back to Users
            </button>

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
                    <div className="-mt-10 flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-white text-[#2e66a6] shadow-md sm:h-28 sm:w-28">
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

                     <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-white transition group-hover:translate-x-0.5">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                    </button>

                    <div className="w-full whitespace-nowrap rounded-xl border border-[#d8e2ee] bg-[#f8fbff] px-4 py-2.5 text-center text-xs text-black/60 shadow-sm">
                      <span className="font-semibold text-black">
                        Last profile update:
                      </span>{" "}
                      {formatDate(user.updatedAt, true)}
                    </div>
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
    personal: <PersonalInfo />,
    career: <CareerProfile />,
    credentials: <Credentials />,
    education: <Education />,
    applications: <ApplicationHistory />,
  }[activeTab];

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gray-50 px-0 py-8">
        <div className="w-full space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => navigate("/admin/users")}
              className="inline-flex w-fit items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-800 shadow-sm transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2"
            >
              <Icon name="arrowLeft" className="h-4 w-4" />
              Back to Users
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex items-center justify-center gap-3 rounded-2xl border border-gray-200 bg-white px-5 py-4 text-center text-sm text-gray-700 shadow-sm">
              <Icon name="history" className="h-4 w-4 text-[#2e66a6]" />
              <span>Last profile update:</span>
              <span className="font-semibold text-black">{formatDate(user.updatedAt, true)}</span>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-5 py-4 text-sm text-gray-700 shadow-sm">
              <Icon name="user" className="h-4 w-4 text-[#2e66a6]" />
              <span>Verified by</span>
              <span className="font-semibold text-black">Admin</span>
            </div>
          </div>

          <HeaderProfile />

          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="px-5 py-5 sm:px-7">
              <section className="rounded-2xl border border-gray-200 bg-white p-5">
                <h2 className="text-lg font-bold text-black">About Me</h2>
                <p className="mt-3 max-w-5xl text-sm leading-relaxed text-gray-600">
                  {profile.aboutMe || "No about me information yet."}
                </p>
              </section>

              <section className="mt-5 rounded-2xl border border-gray-200 bg-white p-5">
                <h2 className="text-sm font-bold uppercase tracking-widest text-black">
                  Work Experience
                </h2>

                {workExperiences.length ? (
                  <div className="mt-4 space-y-4">
                    {workExperiences.map((item, index) => (
                      <div
                        key={item._id || index}
                        className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-4"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <h3 className="text-sm font-bold text-black">
                              {item.companyName || "Company not provided"}
                            </h3>
                            <p className="mt-1 text-xs font-medium italic text-gray-600">
                              {item.positionTitle || "Position not provided"}
                            </p>
                          </div>

                          <p className="shrink-0 text-xs font-semibold text-[#2e66a6]">
                            {formatYearRange(item)}
                          </p>
                        </div>

                        {item.description && (
                          <p className="mt-3 text-xs leading-relaxed text-gray-600">
                            {item.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-4 text-sm text-gray-500">
                    No work experience added yet.
                  </p>
                )}
              </section>
            </div>

            <div className="border-t border-gray-200 px-4 sm:px-6">
              <div className="flex gap-5 overflow-x-auto">
                {TABS.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={cn(
                      "inline-flex shrink-0 items-center gap-2 border-b-2 px-1 py-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2",
                      activeTab === tab.key
                        ? "border-[#2e66a6] text-[#2e66a6]"
                        : "border-transparent text-gray-500 hover:text-black"
                    )}
                  >
                    <Icon name={tab.icon} className="h-4 w-4" />
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="px-5 py-5 sm:px-7 sm:py-6">{activeContent}</div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default UserManagementDetails;
