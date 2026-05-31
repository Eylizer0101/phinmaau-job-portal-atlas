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
  };

  return <svg {...common}>{icons[name] || null}</svg>;
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
  const [brokenAvatar, setBrokenAvatar] = useState(false);

  const apiHost = useMemo(() => {
    const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
    return apiUrl.replace(/\/api\/?$/, "");
  }, []);

  const getFileUrl = (url) => {
    if (!url) return "";
    if (/^https?:\/\//i.test(url)) return url;
    return `${apiHost}${url.startsWith("/") ? url : `/${url}`}`;
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
                    <a href={url} target="_blank" rel="noreferrer" className="rounded-lg p-1.5 text-slate-600 hover:bg-white hover:text-blue-700" title="View"><Icon name="eye" /></a>
                    <a href={url} download className="rounded-lg p-1.5 text-slate-600 hover:bg-white hover:text-blue-700" title="Download"><Icon name="download" /></a>
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
              {applications.map((app) => {
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
      { key: "facebookUrl", label: "Facebook", url: employerProfile.facebookUrl },
      { key: "instagramUrl", label: "Instagram", url: employerProfile.instagramUrl },
      { key: "linkedinUrl", label: "LinkedIn", url: employerProfile.linkedinUrl },
      { key: "xUrl", label: "X / Twitter", url: employerProfile.xUrl },
    ].filter((item) => String(item.url || "").trim());
    const galleryItems = Array.isArray(employerProfile.galleryImages)
      ? employerProfile.galleryImages.filter(Boolean)
      : [];

    const EmployerEmptyState = ({ icon = "document", title, subtitle }) => (
      <div className="flex min-h-[120px] flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 px-5 py-6 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-400 shadow-sm">
          <Icon name={icon} className="h-5 w-5" />
        </div>
        <p className="mt-3 text-sm font-semibold text-gray-800">{title}</p>
        {subtitle && <p className="mt-1 text-xs leading-relaxed text-gray-500">{subtitle}</p>}
      </div>
    );

    const EmployerCredentials = () => (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900">Business Credentials</h3>
        <p className="mt-1 text-xs text-slate-500">Submitted during account creation</p>
        <div className="mt-5 space-y-3">
          {Object.keys(EMPLOYER_DOC_LABELS).map((key) => {
            const doc = employerDocs[key] || {};
            const url = getFileUrl(doc.url);
            return (
              <div key={key} className="flex items-center justify-between gap-3 rounded-xl border border-indigo-100 bg-indigo-50/50 px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-indigo-700">
                    <Icon name="document" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-800">{EMPLOYER_DOC_LABELS[key]}</p>
                    <p className="truncate text-xs text-slate-500">{doc.filename || doc.originalName || doc.status || "Document file"}</p>
                  </div>
                </div>
                {url ? (
                  <div className="flex items-center gap-1">
                    <a href={url} target="_blank" rel="noreferrer" className="rounded-lg p-1.5 text-slate-600 hover:bg-white hover:text-blue-700" title="View"><Icon name="eye" /></a>
                    <a href={url} download className="rounded-lg p-1.5 text-slate-600 hover:bg-white hover:text-blue-700" title="Download"><Icon name="download" /></a>
                  </div>
                ) : <span className="text-xs font-semibold text-slate-400">No file</span>}
              </div>
            );
          })}
        </div>
      </section>
    );

    const EmployerPostingHistory = () => (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900">Posting History</h3>
        {jobPosts.length ? (
          <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="px-4 py-3">Job Title</th>
                  <th className="px-4 py-3">Applicant</th>
                  <th className="px-4 py-3">Date Posted</th>
                  <th className="px-4 py-3">Valid Until</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {jobPosts.map((job) => {
                  const status = job.isArchived ? "closed" : job.isActive === false || job.isPublished === false ? "closed" : "open";
                  return (
                    <tr key={job._id} className="text-slate-700">
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-900">{job.title || job.jobTitle || "—"}</p>
                        <p className="text-[11px] text-slate-500">{[job.jobType, job.workMode].filter(Boolean).join(" • ") || "—"}</p>
                      </td>
                      <td className="px-4 py-3">{job.applicantCount ?? job.applicantsCount ?? 0}</td>
                      <td className="px-4 py-3">{formatDate(job.createdAt)}</td>
                      <td className="px-4 py-3">{formatDate(job.validUntil || job.deadline || job.applicationDeadline)}</td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase",
                          status === "open" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"
                        )}>{status}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => navigate(`/admin/jobs/${job._id}`, {
                            state: {
                              backPath: `/admin/users/${userId}`,
                              backLabel: "Back to Employer Profile",
                            },
                          })}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-blue-50 hover:text-blue-700"
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
        ) : <EmployerEmptyState icon="briefcase" title="No job posts yet." />}
      </section>
    );

    const employerActiveContent = {
      about: (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900">About</h3>
          {String(employerProfile.companyDescription || employerProfile.aboutCompany || employerProfile.description || "").trim() ? (
            <p className="mt-4 text-sm leading-relaxed text-slate-600">{employerProfile.companyDescription || employerProfile.aboutCompany || employerProfile.description}</p>
          ) : <EmployerEmptyState title="No description added yet." />}
        </section>
      ),
      credentials: <EmployerCredentials />,
      social: (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900">Linked Accounts</h3>
          {socialLinks.length ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {socialLinks.map((item) => (
                <a key={item.key} href={normalizeUrl(item.url)} target="_blank" rel="noreferrer" className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-50">
                  {item.label}: <span className="font-medium text-slate-600">{item.url}</span>
                </a>
              ))}
            </div>
          ) : <EmployerEmptyState icon="mail" title="No social accounts linked yet." />}
        </section>
      ),
      gallery: (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900">Gallery</h3>
          {galleryItems.length ? (
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {galleryItems.map((item, index) => {
                const imgUrl = getFileUrl(item.url || item.imageUrl || item.path || item);
                return imgUrl ? <img key={item._id || index} src={imgUrl} alt={`Company gallery ${index + 1}`} className="h-52 w-full rounded-xl object-cover" /> : null;
              })}
            </div>
          ) : <EmployerEmptyState icon="document" title="No photos added yet." />}
        </section>
      ),
      posts: <EmployerPostingHistory />,
    }[activeEmployerTab];

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
              <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-5 py-4 text-sm text-gray-700 shadow-sm">
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

            <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="h-44 overflow-hidden bg-[#eaf2fb] sm:h-56">
  {coverUrl ? (
    <img
      src={coverUrl}
      alt={`${companyName} cover`}
      className="h-full w-full object-cover"
    />
  ) : (
    <img
      src="/images/company_9.png"
      alt="Company Cover"
      className="h-full w-full object-cover"
    />
  )}
</div>

              <div className="px-5 pb-5 sm:px-7">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                  <div className="-mt-10 flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-white text-[#2e66a6] shadow-md">
                    {logoUrl && !brokenAvatar ? (
                      <img src={logoUrl} alt={`${companyName} logo`} className="h-full w-full object-cover" onError={() => setBrokenAvatar(true)} />
                    ) : (
                      <Icon name="building" className="h-9 w-9" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1 pt-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="truncate text-2xl font-bold leading-tight text-black sm:text-3xl">{companyName}</h1>
                      {employerVerified && <span className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-[11px] font-bold uppercase text-green-700">Verified</span>}
                      <span className="rounded-full border border-[#2e66a6]/20 bg-[#2e66a6]/10 px-3 py-1 text-[11px] font-bold uppercase text-[#2e66a6]">Employer</span>
                    </div>

                    <div className="mt-3 flex flex-col gap-2 text-sm text-gray-600">
                      <span className="inline-flex min-w-0 items-center gap-2">
                        <Icon name="building" className="h-4 w-4 shrink-0 text-[#2e66a6]" />
                        <span className="truncate">{employerProfile.industry || "Industry not specified"}</span>
                      </span>

                      {employerProfile.companyWebsiteUrl && (
                        <a
                          href={normalizeUrl(employerProfile.companyWebsiteUrl)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex min-w-0 items-center gap-2 font-medium text-[#2e66a6] hover:underline"
                        >
                          <Icon name="mail" className="h-4 w-4 shrink-0" />
                          <span className="truncate">{employerProfile.companyWebsiteUrl}</span>
                        </a>
                      )}

                      <span className="inline-flex min-w-0 items-start gap-2">
                        <Icon name="mapPin" className="mt-0.5 h-4 w-4 shrink-0 text-[#2e66a6]" />
                        <span className="leading-relaxed">{employerProfile.companyAddress || employerProfile.regionCity || "Location not provided"}</span>
                      </span>

                      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-1 text-xs text-gray-600">
                        <span>
                          <span className="font-semibold text-black">Contact Person:</span>{" "}
                          {[user.firstName, user.lastName].filter(Boolean).join(" ") || employerProfile.position || "—"}
                        </span>
                        <span>
                          <span className="font-semibold text-black">Date Registered:</span>{" "}
                          {formatDate(user.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 px-4 sm:px-6">
                <div className="flex gap-5 overflow-x-auto">
                  {EMPLOYER_TABS.map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveEmployerTab(tab.key)}
                      className={cn(
                        "shrink-0 border-b-2 px-1 py-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2",
                        activeEmployerTab === tab.key ? "border-[#2e66a6] text-[#2e66a6]" : "border-transparent text-gray-500 hover:text-black"
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <div className="pb-4">{employerActiveContent}</div>
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
            <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-5 py-4 text-sm text-gray-700 shadow-sm">
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
