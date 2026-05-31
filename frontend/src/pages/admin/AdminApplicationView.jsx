import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AdminLayout from "../../layouts/AdminLayout";
import api from "../../services/api";

const UI = {
  page: "min-h-screen bg-[#f8fafc] px-0 py-8",
  card: "w-full overflow-hidden rounded-[24px] border border-gray-200 bg-white shadow-sm",
  sectionCard: "w-full rounded-[22px] border border-gray-200 bg-white shadow-sm",
  metricCard: "rounded-[22px] border border-gray-200 bg-white px-5 py-5 shadow-sm",
  label: "text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500",
  value: "mt-1.5 text-sm font-bold leading-6 text-black",
  chip: "inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700",
  skillChip: "rounded-xl border border-[#d7e6f5] bg-[#eef5fc] px-3 py-2 text-xs font-semibold text-[#2e66a6]",
  ring: "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2",
};

const cn = (...classes) => classes.filter(Boolean).join(" ");

const Icon = ({ name, className = "h-4 w-4", ...props }) => {
  const common = {
    className,
    fill: "none",
    stroke: "currentColor",
    viewBox: "0 0 24 24",
    strokeWidth: 1.8,
    ...props,
  };

  const icons = {
    arrowLeft: <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />,
    building: <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M6 21V5a2 2 0 012-2h8a2 2 0 012 2v16M9 7h.01M9 11h.01M9 15h.01M12 7h.01M12 11h.01M12 15h.01M15 7h.01M15 11h.01M15 15h.01" />,
    briefcase: <><path strokeLinecap="round" strokeLinejoin="round" d="M10 6V5a2 2 0 012-2h0a2 2 0 012 2v1m-9 0h10a2 2 0 012 2v10a2 2 0 01-2 2H7a2 2 0 01-2-2V8a2 2 0 012-2z" /><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" /></>,
    mapPin: <><path strokeLinecap="round" strokeLinejoin="round" d="M12 21s7-5.1 7-11a7 7 0 10-14 0c0 5.9 7 11 7 11z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 10.5h.01" /></>,
    calendar: <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3M5 11h14M6 5h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2z" />,
    money: <><path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5A1.5 1.5 0 014.5 6h15A1.5 1.5 0 0121 7.5v9A1.5 1.5 0 0119.5 18h-15A1.5 1.5 0 013 16.5v-9z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 9.25v5.5M14.25 10.5c0-.69-1.007-1.25-2.25-1.25s-2.25.56-2.25 1.25 1.007 1.25 2.25 1.25 2.25.56 2.25 1.25-1.007 1.25-2.25 1.25-2.25-.56-2.25-1.25" /></>,
    clock: <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />,
    graduation: <><path strokeLinecap="round" strokeLinejoin="round" d="M12 4L3 9l9 5 9-5-9-5z" /><path strokeLinecap="round" strokeLinejoin="round" d="M5 11v5c2 2 12 2 14 0v-5" /></>,
    file: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
    tools: <path strokeLinecap="round" strokeLinejoin="round" d="M14.7 6.3a4 4 0 01-5.657 5.657l-5.04 5.04a2 2 0 102.829 2.828l5.04-5.04A4 4 0 0114.7 6.3zM19 7l-3 3" />,
    user: <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM5 21a7 7 0 0114 0" />,
    external: <><path strokeLinecap="round" strokeLinejoin="round" d="M14 3h7v7" /><path strokeLinecap="round" strokeLinejoin="round" d="M10 14L21 3" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 14v6a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6" /></>,
  };

  return <svg {...common}>{icons[name] || null}</svg>;
};

const formatSalary = (min, max) => {
  const hasMin = typeof min === "number";
  const hasMax = typeof max === "number";
  if (!hasMin && !hasMax) return "Salary not specified";
  const fmt = (n) => `₱${Number(n).toLocaleString("en-PH")}`;
  if (hasMin && hasMax) return `${fmt(min)} - ${fmt(max)}`;
  if (hasMin) return `From ${fmt(min)}`;
  return `Up to ${fmt(max)}`;
};

const formatDate = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const getList = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  return String(value || "")
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
};

const statusMeta = (statusRaw) => {
  const status = String(statusRaw || "pending").toLowerCase();

  if (status === "pending") {
    return {
      label: "Pending",
      className: "border-amber-200 bg-amber-50 text-amber-800",
    };
  }

  if (status === "for interview") {
    return {
      label: "For Interview",
      className: "border-[#b9d0e8] bg-[#eef5fc] text-[#2e66a6]",
    };
  }

  if (status === "hired") {
    return {
      label: "Hired",
      className: "border-green-200 bg-green-50 text-green-700",
    };
  }

  if (status === "declined") {
    return {
      label: "Declined",
      className: "border-red-200 bg-red-50 text-red-700",
    };
  }

  return {
    label: status ? status.charAt(0).toUpperCase() + status.slice(1) : "Pending",
    className: "border-gray-200 bg-gray-50 text-gray-700",
  };
};

const getJobCoordinates = (jobData) => {
  const lat = Number(jobData?.locationLatitude);
  const lng = Number(jobData?.locationLongitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
};

const isUsableCoordinates = (coords) => {
  if (!coords) return false;
  if (!Number.isFinite(coords.lat) || !Number.isFinite(coords.lng)) return false;
  if (Math.abs(coords.lat) < 0.0001 && Math.abs(coords.lng) < 0.0001) return false;
  return true;
};

const buildOpenStreetMapUrl = ({ coords, address }) => {
  const cleanAddress = String(address || "").trim();

  if (isUsableCoordinates(coords)) {
    return `https://www.openstreetmap.org/?mlat=${coords.lat}&mlon=${coords.lng}#map=17/${coords.lat}/${coords.lng}`;
  }

  if (cleanAddress && cleanAddress !== "—") {
    return `https://www.openstreetmap.org/search?query=${encodeURIComponent(cleanAddress)}`;
  }

  return "https://www.openstreetmap.org";
};

const StaticLocationMap = ({ job, address, heightClass = "h-[158px]" }) => {
  const savedCoords = getJobCoordinates(job);
  const cleanAddress = String(address || job?.location || job?.address || "").trim();
  const [resolvedCoords, setResolvedCoords] = useState(isUsableCoordinates(savedCoords) ? savedCoords : null);
  const [lookupDone, setLookupDone] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const runLookup = async () => {
      if (isUsableCoordinates(savedCoords)) {
        setResolvedCoords(savedCoords);
        setLookupDone(true);
        return;
      }

      if (!cleanAddress || cleanAddress === "—") {
        setResolvedCoords(null);
        setLookupDone(true);
        return;
      }

      try {
        const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=ph&accept-language=en&q=${encodeURIComponent(cleanAddress)}`;
        const response = await fetch(url);
        const data = await response.json();
        const first = Array.isArray(data) ? data[0] : null;
        const nextLat = Number(first?.lat);
        const nextLng = Number(first?.lon);

        if (!cancelled && Number.isFinite(nextLat) && Number.isFinite(nextLng)) {
          setResolvedCoords({
            lat: Number(nextLat.toFixed(6)),
            lng: Number(nextLng.toFixed(6)),
          });
        }
      } catch {
        if (!cancelled) setResolvedCoords(null);
      } finally {
        if (!cancelled) setLookupDone(true);
      }
    };

    runLookup();

    return () => {
      cancelled = true;
    };
  }, [cleanAddress, savedCoords?.lat, savedCoords?.lng]);

  const openMapUrl = buildOpenStreetMapUrl({ coords: resolvedCoords || savedCoords, address: cleanAddress });

  if (!isUsableCoordinates(resolvedCoords)) {
    return (
      <a
        href={openMapUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          heightClass,
          "relative flex w-full items-center justify-center overflow-hidden rounded-2xl border border-gray-200 bg-[#f8fafc] text-slate-400 transition hover:bg-[#eef5fc]",
          UI.ring
        )}
        title="Open work location in OpenStreetMap"
        aria-label="Open work location in OpenStreetMap"
      >
        <div className="px-4 text-center">
          <Icon name="mapPin" className="mx-auto h-7 w-7 text-[#2e66a6]" />
          <p className="mt-2 text-xs font-medium text-slate-500">
            {lookupDone ? "Click to open work location" : "Loading work location map..."}
          </p>
        </div>
      </a>
    );
  }

  const bbox = `${resolvedCoords.lng - 0.01},${resolvedCoords.lat - 0.01},${resolvedCoords.lng + 0.01},${resolvedCoords.lat + 0.01}`;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${resolvedCoords.lat},${resolvedCoords.lng}`;

  return (
    <a
      href={openMapUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(heightClass, "group relative block w-full overflow-hidden rounded-2xl border border-gray-200 bg-[#f8fafc]", UI.ring)}
      title="Open work location in OpenStreetMap"
      aria-label="Open work location in OpenStreetMap"
    >
      <iframe title="Work location map" src={src} className="pointer-events-none h-full w-full border-0" loading="lazy" />
      <span className="absolute inset-0 bg-transparent transition group-hover:bg-black/5" aria-hidden="true" />
      <span className="absolute bottom-2 right-2 rounded-full bg-white/95 px-3 py-1 text-[11px] font-semibold text-[#2e66a6] shadow-sm">
        Open Map
      </span>
    </a>
  );
};

const CompanyLogo = ({ src, name }) => {
  const apiHost = (process.env.REACT_APP_API_URL || "https://phinmaau-job-portal-atlas.onrender.com/api").replace(/\/api\/?$/, "");
  const url = src ? (/^https?:\/\//i.test(src) ? src : `${apiHost}${src.startsWith("/") ? src : `/${src}`}`) : "";
  const initial = String(name || "C").charAt(0).toUpperCase();

  return (
    <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-gray-200 bg-[#eef5fc] text-xl font-bold text-[#2e66a6] shadow-sm">
      {url ? <img src={url} alt={name || "Company"} className="h-full w-full object-cover" /> : initial}
    </div>
  );
};

const SectionHeader = ({ icon, title, subtitle }) => (
  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
    <div className="flex items-center gap-2 text-black">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eef5fc] text-[#2e66a6]">
        <Icon name={icon} className="h-4 w-4" />
      </span>
      <h2 className="text-base font-bold tracking-[-0.01em]">{title}</h2>
    </div>
    {subtitle ? <p className="text-xs font-medium text-slate-500">{subtitle}</p> : null}
  </div>
);

const MetricCard = ({ icon, title, value }) => (
  <div className={UI.metricCard}>
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eef5fc] text-[#2e66a6]">
        <Icon name={icon} className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className={UI.label}>{title}</p>
        <p className={UI.value}>{value || "—"}</p>
      </div>
    </div>
  </div>
);

const LoadingState = () => (
  <AdminLayout>
    <div className={UI.page}>
      <div className="flex flex-col items-center justify-center rounded-[24px] border border-gray-200 bg-white py-20 shadow-sm">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-[#2e66a6]" />
        <p className="mt-4 text-sm font-medium text-slate-600">Loading application details...</p>
      </div>
    </div>
  </AdminLayout>
);

const AdminApplicationView = () => {
  const { applicationId } = useParams();
  const navigate = useNavigate();
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchApplication = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get(`/applications/${applicationId}`);
      if (response.data?.success) setApplication(response.data.application || null);
      else setError("Application not found.");
    } catch (err) {
      console.error("Error fetching application:", err);
      setError(err.response?.data?.message || "Failed to load application details.");
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  useEffect(() => {
    if (applicationId) fetchApplication();
  }, [applicationId, fetchApplication]);

  const job = application?.job || {};
  const employer = application?.employer || {};
  const employerProfile = employer?.employerProfile || {};
  const jobseeker = application?.jobseeker || {};
  const companyName = job.companyName || employerProfile.companyName || employer.fullName || "Company";
  const location = job.location || job.address || employerProfile.companyAddress || employer.companyAddress || "—";
  const status = statusMeta(application?.status);
  const requiredSkills = useMemo(() => getList(job.skillsRequired), [job.skillsRequired]);
  const perksAndBenefits = useMemo(() => {
    const list = getList(job.perksAndBenefits);
    const other = String(job.otherBenefits || "").trim();
    return other ? [...list, other] : list;
  }, [job.perksAndBenefits, job.otherBenefits]);

  const applicantName =
    jobseeker.fullName ||
    [jobseeker.firstName, jobseeker.middleName, jobseeker.lastName, jobseeker.extensionName].filter(Boolean).join(" ") ||
    jobseeker.email ||
    "—";

  const companyWebsite =
    employerProfile.companyWebsiteUrl ||
    employerProfile.companyWebsite ||
    employer.companyWebsite ||
    job.companyWebsite ||
    "N/A";

  if (loading) return <LoadingState />;

  if (error || !application) {
    return (
      <AdminLayout>
        <div className={UI.page}>
          <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <button
              onClick={() => navigate(-1)}
              className={cn("mb-5 inline-flex items-center gap-2 rounded-lg border border-[#d7e6f5] bg-white px-4 py-2 text-sm font-semibold text-[#111827] shadow-sm transition hover:bg-[#eef5fc] hover:text-[#2e66a6]", UI.ring)}
              type="button"
            >
              <Icon name="arrowLeft" /> Back
            </button>

            <div className="rounded-[24px] border border-red-100 bg-red-50 p-6 text-sm font-semibold text-red-700 shadow-sm">
              {error || "Application not found."}
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className={UI.page}>
        <div className="mx-auto max-w-7xl px-1 py-8">
          <div className="mb-5">
            <button
              onClick={() => navigate(-1)}
              className={cn("inline-flex items-center gap-2 rounded-lg border border-[#d7e6f5] bg-white px-4 py-2 text-sm font-semibold text-[#111827] shadow-sm transition hover:bg-[#eef5fc] hover:text-[#2e66a6]", UI.ring)}
              type="button"
            >
              <Icon name="arrowLeft" /> Back
            </button>
          </div>

          <section className={`${UI.card} mb-5 overflow-hidden`}>
            <div className="relative h-[85px] w-full overflow-hidden sm:h-[105px]">
              <img src="/images/jobback.png" alt="Application details banner" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-black/10" />
            </div>

            <div className="px-5 pb-5 pt-4 sm:px-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex min-w-0 flex-1 items-start gap-4">
                  <CompanyLogo src={job.companyLogo || employerProfile.companyLogo} name={companyName} />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <h1 className="text-[28px] font-bold leading-tight tracking-[-0.02em] text-[#111827] sm:text-[32px]" title={job.title || job.jobTitle || "Untitled Job"}>
                        {job.title || job.jobTitle || "Untitled Job"}
                      </h1>
                      <span className={cn("inline-flex rounded-full border px-3 py-1 text-[11px] font-bold uppercase", status.className)}>
                        {status.label}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center gap-2 text-[#4b5563]">
                      <Icon name="building" className="h-4 w-4 text-[#2e66a6]" />
                      <span className="text-sm font-medium">{companyName}</span>
                    </div>

                    <div className="mt-2 flex items-start gap-2 text-[#6b7280]">
                      <Icon name="mapPin" className="mt-0.5 h-4 w-4 shrink-0 text-[#2e66a6]" />
                      <span className="text-sm leading-6">{location}</span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {job.jobType && (
                        <span className={UI.chip}>
                          <Icon name="briefcase" className="h-3.5 w-3.5 text-[#2e66a6]" />
                          {job.jobType}
                        </span>
                      )}

                      {job.workMode && (
                        <span className={UI.chip}>
                          <Icon name="building" className="h-3.5 w-3.5 text-[#2e66a6]" />
                          {job.workMode}
                        </span>
                      )}

                      {application.appliedAt && (
                        <span className={UI.chip}>
                          <Icon name="calendar" className="h-3.5 w-3.5 text-[#2e66a6]" />
                          Applied {formatDate(application.appliedAt)}
                        </span>
                      )}
                    </div>

                    <div className="mt-3 space-y-1 text-xs font-medium text-[#6b7280]">
                      <p>Date applied: {formatDate(application.appliedAt || application.createdAt)}</p>
                      {job.applicationDeadline && <p>Application deadline is on {formatDate(job.applicationDeadline)}</p>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard icon="money" title="Salary" value={formatSalary(job.salaryMin, job.salaryMax)} />
            <MetricCard icon="clock" title="Experience" value={job.experienceLevel || "No experience required"} />
            <MetricCard icon="graduation" title="Educational Requirements" value={job.educationLevel || job.educationalRequirements || "Not specified"} />
            <MetricCard icon="user" title="Applicant" value={applicantName} />
          </div>

          <div className="mb-5">
            <section className={`${UI.sectionCard} p-5 sm:p-6`}>
              <SectionHeader icon="file" title="Job Description" />
              <div className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[#4b5563] sm:text-[15px]">
                {job.description || "No description provided."}
              </div>
            </section>
          </div>

          <div className="mb-5">
            <section className={`${UI.sectionCard} p-5 sm:p-6`}>
              <SectionHeader icon="tools" title="Qualification" />
              <div className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[#4b5563] sm:text-[15px]">
                {job.requirements || job.qualification || "No requirements provided."}
              </div>
            </section>
          </div>

          <div className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.1fr)_340px]">
            <section className={`${UI.sectionCard} p-5 sm:p-6`}>
              <SectionHeader icon="briefcase" title="Required Skills" subtitle={`${requiredSkills.length} item${requiredSkills.length === 1 ? "" : "s"}`} />
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {requiredSkills.length ? (
                  requiredSkills.map((skill, index) => (
                    <div key={`${skill}-${index}`} className={UI.skillChip}>
                      {skill}
                    </div>
                  ))
                ) : (
                  <p className="text-sm font-medium text-[#6b7280]">No required skills listed.</p>
                )}
              </div>
            </section>

            <section className={`${UI.sectionCard} overflow-hidden`}>
              <div className="overflow-hidden rounded-t-[22px]">
                <StaticLocationMap job={job} address={location} heightClass="h-[160px]" />
              </div>
              <div className="border-t border-[#e5e7eb] px-4 py-3">
                <div className="flex items-start gap-2 text-[#374151]">
                  <Icon name="mapPin" className="mt-0.5 h-4 w-4 shrink-0 text-[#2e66a6]" />
                  <p className="text-sm font-medium leading-6">{location}</p>
                </div>
              </div>
            </section>
          </div>

          <section className={`${UI.sectionCard} p-5 sm:p-6`}>
            <SectionHeader icon="briefcase" title="Perks and Benefits" subtitle={`${perksAndBenefits.length} item${perksAndBenefits.length === 1 ? "" : "s"}`} />
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {perksAndBenefits.length ? (
                perksAndBenefits.map((benefit, index) => (
                  <div key={`${benefit}-${index}`} className={UI.skillChip}>
                    {benefit}
                  </div>
                ))
              ) : (
                <p className="text-sm font-medium text-[#6b7280]">No perks and benefits listed.</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminApplicationView;
