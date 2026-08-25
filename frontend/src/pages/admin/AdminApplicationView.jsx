import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AdminLayout from "../../layouts/AdminLayout";
import api from "../../services/api";

const UI = {
  page: "min-h-screen bg-[#f8fafc]",
  card: "w-full rounded-2xl border border-[#e5e7eb] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)]",
  sectionCard: "w-full rounded-xl border border-[#e5e7eb] bg-white shadow-[0_4px_16px_rgba(15,23,42,0.04)]",
  metricCard: "h-full min-h-[96px] rounded-xl border border-[#d9e2ec] bg-white px-4 py-4 shadow-[0_4px_14px_rgba(15,23,42,0.08)]",
  label: "text-[11px] font-semibold uppercase tracking-[0.03em] text-[#6b7280]",
  value: "mt-1.5 text-[15px] font-semibold leading-6 text-[#111827]",
  title: "text-[15px] font-semibold text-[#111827]",
  chip: "inline-flex items-center gap-2 rounded-full border border-[#d7e6f5] bg-[#eef5fc] px-3 py-1 text-xs font-semibold text-[#2e66a6]",
  skillChip: "rounded-xl border border-[#d7e6f5] bg-[#f8fafc] px-3 py-2 text-xs font-medium text-[#374151]",
  ring: "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2 focus-visible:ring-offset-white",
};

const cn = (...classes) => classes.filter(Boolean).join(" ");

const sanitizeRichTextHtml = (value = "") => {
  const raw = String(value || "").trim();
  if (!raw) return "";

  if (typeof window === "undefined" || typeof window.DOMParser === "undefined") {
    return raw
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\r?\n/g, "<br>");
  }

  const containsHtml = /<\/?[a-z][\s\S]*>/i.test(raw);
  const source = containsHtml
    ? raw
    : raw
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\r?\n/g, "<br>");

  const parser = new window.DOMParser();
  const doc = parser.parseFromString(source, "text/html");

  doc
    .querySelectorAll(
      "script, style, iframe, object, embed, form, input, button, textarea, select, option, link, meta, base"
    )
    .forEach((node) => node.remove());

  doc.body.querySelectorAll("*").forEach((element) => {
    [...element.attributes].forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const rawValue = String(attribute.value || "").trim();
      const valueText = rawValue.toLowerCase();

      if (name === "style") {
        const safeStyles = rawValue
          .split(";")
          .map((rule) => rule.trim())
          .filter(Boolean)
          .map((rule) => {
            const separatorIndex = rule.indexOf(":");
            if (separatorIndex < 0) return "";

            const property = rule.slice(0, separatorIndex).trim().toLowerCase();
            const propertyValue = rule.slice(separatorIndex + 1).trim().toLowerCase();

            if (
              property === "text-align" &&
              ["left", "center", "right", "justify"].includes(propertyValue)
            ) {
              return `text-align: ${propertyValue}`;
            }

            if (property === "margin-left") {
              const match = propertyValue.match(/^(\d+(?:\.\d+)?)(px|em|rem)$/);
              if (!match) return "";

              const amount = Number(match[1]);
              const unit = match[2];
              const maximum = unit === "px" ? 160 : 10;

              if (Number.isFinite(amount) && amount >= 0 && amount <= maximum) {
                return `margin-left: ${amount}${unit}`;
              }
            }

            return "";
          })
          .filter(Boolean);

        if (safeStyles.length) {
          element.setAttribute("style", safeStyles.join("; "));
        } else {
          element.removeAttribute("style");
        }

        return;
      }

      if (
        name.startsWith("on") ||
        name === "srcdoc" ||
        name === "class" ||
        ((name === "href" || name === "src") &&
          (valueText.startsWith("javascript:") || valueText.startsWith("data:text/html")))
      ) {
        element.removeAttribute(attribute.name);
      }
    });

    if (element.hasAttribute("align")) {
      const alignment = String(element.getAttribute("align") || "").toLowerCase();
      if (["left", "center", "right", "justify"].includes(alignment)) {
        element.style.textAlign = alignment;
      }
      element.removeAttribute("align");
    }

    if (element.tagName === "A") {
      element.setAttribute("target", "_blank");
      element.setAttribute("rel", "noopener noreferrer");
    }
  });

  return doc.body.innerHTML;
};

const RichTextContent = ({ value, fallback }) => {
  const sanitizedHtml = useMemo(
    () => sanitizeRichTextHtml(value || fallback || ""),
    [value, fallback]
  );

  return (
    <div
      className={[
        "break-words",
        "[&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0",
        "[&_div]:my-2 [&_div:first-child]:mt-0 [&_div:last-child]:mb-0",
        "[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6",
        "[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6",
        "[&_li]:my-1",
        "[&_h1]:my-3 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:leading-tight",
        "[&_h2]:my-3 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:leading-tight",
        "[&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-gray-300 [&_blockquote]:pl-4",
        "[&_strong]:font-bold [&_b]:font-bold",
        "[&_em]:italic [&_i]:italic [&_u]:underline",
        "[&_a]:text-[#2e66a6] [&_a]:underline",
      ].join(" ")}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
};

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
    briefcase: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m-3 0h14a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9a2 2 0 012-2z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M3 13h18" /></>,
    mapPin: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M12 21s7-4.438 7-11a7 7 0 10-14 0c0 6.562 7 11 7 11z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M12 10a2 2 0 100-4 2 2 0 000 4z" /></>,
    calendar: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />,
    money: <><path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5A1.5 1.5 0 014.5 6h15A1.5 1.5 0 0121 7.5v9A1.5 1.5 0 0119.5 18h-15A1.5 1.5 0 013 16.5v-9z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 9.25v5.5M14.25 10.5c0-.69-1.007-1.25-2.25-1.25s-2.25.56-2.25 1.25 1.007 1.25 2.25 1.25 2.25.56 2.25 1.25-1.007 1.25-2.25 1.25-2.25-.56-2.25-1.25" /></>,
    clock: <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />,
    graduation: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M12 14l9-5-9-5-9 5 9 5z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M6 12v5c0 1.657 2.686 3 6 3s6-1.343 6-3v-5" /></>,
    file: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
    tools: <path strokeLinecap="round" strokeLinejoin="round" d="M14.7 6.3a4 4 0 01-5.657 5.657l-5.04 5.04a2 2 0 102.829 2.828l5.04-5.04A4 4 0 0114.7 6.3zM19 7l-3 3" />,
    user: <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM5 21a7 7 0 0114 0" />,
    users: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M17 20h5v-1a4 4 0 00-4-4h-1M9 20H2v-1a4 4 0 014-4h1m7-4a4 4 0 10-8 0 4 4 0 008 0zm8 2a3 3 0 10-6 0 3 3 0 006 0z" />,
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
    month: "long",
    day: "numeric",
  });
};


const formatPostedTime = (value) => {
  if (!value) return "Posted date unavailable";

  const postedDate = new Date(value);
  if (Number.isNaN(postedDate.getTime())) return "Posted date unavailable";

  const now = new Date();
  const differenceMs = Math.max(0, now.getTime() - postedDate.getTime());
  const differenceDays = Math.floor(differenceMs / (1000 * 60 * 60 * 24));

  if (differenceDays === 0) return "Posted today";
  if (differenceDays === 1) return "Posted 1 day ago";
  if (differenceDays < 7) return `Posted ${differenceDays} days ago`;

  const differenceWeeks = Math.floor(differenceDays / 7);
  if (differenceDays < 30) {
    return `Posted ${differenceWeeks} ${differenceWeeks === 1 ? "week" : "weeks"} ago`;
  }

  const differenceMonths = Math.floor(differenceDays / 30);
  if (differenceDays < 365) {
    return `Posted ${differenceMonths} ${differenceMonths === 1 ? "month" : "months"} ago`;
  }

  const differenceYears = Math.floor(differenceDays / 365);
  return `Posted ${differenceYears} ${differenceYears === 1 ? "year" : "years"} ago`;
};

const getRelocationDisplayLabel = (value) => {
  const normalized = String(value || "").trim().toLowerCase();

  if (normalized === "yes - willing to relocate") return "Willing to relocate";
  if (normalized === "no - position is fixed location") return "Fixed location";
  if (normalized === "open to relocation if necessary") return "Possible to relocate";

  return String(value || "").trim() || "Fixed location";
};

const normalizeWebsiteUrl = (value) => {
  const website = String(value || "").trim();
  if (!website || website === "N/A") return "";

  return /^https?:\/\//i.test(website)
    ? website
    : `https://${website}`;
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
    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#d9dbe3] bg-white text-lg font-bold text-[#374151] sm:h-16 sm:w-16 sm:text-xl">
      {url ? <img src={url} alt={name || "Company"} className="h-full w-full object-cover" /> : initial}
    </div>
  );
};

const SectionHeader = ({ icon, title, subtitle }) => (
  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
    <div className="flex items-center gap-2">
      <span className="text-[#374151]">
        <Icon name={icon} className="h-4 w-4" />
      </span>
      <h2 className={UI.title}>{title}</h2>
    </div>
    {subtitle ? <p className="text-xs font-medium text-slate-500">{subtitle}</p> : null}
  </div>
);

const MetricCard = ({ icon, title, value }) => (
  <div className={`${UI.metricCard} min-w-0`}>
    <div className="flex h-full min-w-0 items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#d9dbe3] bg-[#f9fafb] text-[#6b7280]">
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
      if (response.data?.success) {
        const applicationData = response.data.application || null;
        const jobId =
          applicationData?.job?._id ||
          applicationData?.job?.id ||
          applicationData?.jobId?._id ||
          applicationData?.jobId;

        if (applicationData && jobId) {
          try {
            const jobResponse = await api.get(`/jobs/${jobId}`);
            const completeJob = jobResponse.data?.job;

            if (jobResponse.data?.success && completeJob) {
              setApplication({
                ...applicationData,
                job: {
                  ...(applicationData.job || {}),
                  ...completeJob,
                },
              });
            } else {
              setApplication(applicationData);
            }
          } catch {
            setApplication(applicationData);
          }
        } else {
          setApplication(applicationData);
        }
      } else setError("Application not found.");
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
  const requiredSkills = useMemo(() => getList(job.skillsRequired), [job.skillsRequired]);
  const perksAndBenefits = useMemo(() => {
    const list = getList(job.perksAndBenefits);
    const other = String(job.otherBenefits || "").trim();
    return other ? [...list, other] : list;
  }, [job.perksAndBenefits, job.otherBenefits]);

  const companyWebsite =
    employerProfile.companyWebsiteUrl ||
    employerProfile.companyWebsite ||
    employer.companyWebsite ||
    job.companyWebsite ||
    "N/A";

  const companyWebsiteUrl = normalizeWebsiteUrl(companyWebsite);
  const companyCoverPhoto = job.coverPhoto || job.companyCoverPhoto || employerProfile.coverPhoto || employerProfile.companyCoverPhoto || "";
  const apiHost = (process.env.REACT_APP_API_URL || "https://phinmaau-job-portal-atlas.onrender.com/api").replace(/\/api\/?$/, "");
  const companyCoverUrl = companyCoverPhoto
    ? (/^https?:\/\//i.test(companyCoverPhoto)
        ? companyCoverPhoto
        : `${apiHost}${companyCoverPhoto.startsWith("/") ? companyCoverPhoto : `/${companyCoverPhoto}`}`)
    : "/images/jobback.png";

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
            <div className="relative h-[120px] w-full overflow-hidden sm:h-[145px]">
              <img
                src={companyCoverUrl}
                alt={`${companyName} cover`}
                className="h-full w-full object-cover"
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = "/images/jobback.png";
                }}
              />
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
                      {job.jobType ? (
                        <span className={UI.chip}>
                          <Icon name="briefcase" className="h-3.5 w-3.5" />
                          {job.jobType}
                        </span>
                      ) : null}

                      {job.workMode ? (
                        <span className={UI.chip}>
                          <Icon name="building" className="h-3.5 w-3.5" />
                          {job.workMode}
                        </span>
                      ) : null}

                      {job.vacancies ? (
                        <span className={UI.chip}>
                          <Icon name="users" className="h-3.5 w-3.5" />
                          {job.vacancies} {Number(job.vacancies) === 1 ? "Vacancy" : "Vacancies"}
                        </span>
                      ) : null}

                      {job.willingToRelocate ? (
                        <span className={UI.chip}>
                          <Icon name="mapPin" className="h-3.5 w-3.5" />
                          {getRelocationDisplayLabel(job.willingToRelocate)}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-3 text-xs font-medium text-[#6b7280]">
                      <p>
                        {formatPostedTime(job.createdAt || application.appliedAt || application.createdAt)}
                        {job.applicationDeadline
                          ? ` and deadline of application is on ${formatDate(job.applicationDeadline)}`
                          : ""}
                      </p>
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
            <MetricCard
              icon="external"
              title="Website Company URL"
              value={
                companyWebsiteUrl ? (
                  <a
                    href={companyWebsiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all text-[#2e66a6] underline decoration-[#2e66a6]/30 underline-offset-2 transition hover:text-[#255487]"
                    title={companyWebsite}
                  >
                    {companyWebsite}
                  </a>
                ) : (
                  "N/A"
                )
              }
            />
          </div>

          <div className="mb-5">
            <section className={`${UI.sectionCard} p-5 sm:p-6`}>
              <SectionHeader icon="file" title="Job Description" />
              <div className="mt-4 text-sm leading-7 text-[#4b5563] sm:text-[15px]">
                <RichTextContent
                  value={job.description}
                  fallback="No description provided."
                />
              </div>
            </section>
          </div>

          <div className="mb-5">
            <section className={`${UI.sectionCard} p-5 sm:p-6`}>
              <SectionHeader icon="tools" title="Qualification" />
              <div className="mt-4 text-sm leading-7 text-[#4b5563] sm:text-[15px]">
                <RichTextContent
                  value={job.requirements || job.qualification}
                  fallback="No requirements provided."
                />
              </div>
            </section>
          </div>

          <div className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <section className={`${UI.sectionCard} p-5 sm:p-6`}>
              <SectionHeader icon="tools" title="Required Skills" subtitle={`${requiredSkills.length} item${requiredSkills.length === 1 ? "" : "s"}`} />
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
              <div className="px-5 pt-5 sm:px-6 sm:pt-6">
                <SectionHeader icon="mapPin" title="Work Location" />
              </div>
              <div className="mt-4 overflow-hidden">
                <StaticLocationMap job={job} address={location} heightClass="h-[180px]" />
              </div>
              <div className="border-t border-[#e5e7eb] px-4 py-3 sm:px-5">
                <div className="flex items-start gap-2 text-[#374151]">
                  <Icon name="mapPin" className="mt-0.5 h-4 w-4 shrink-0 text-[#2e66a6]" />
                  <p className="text-sm font-medium leading-6">{location}</p>
                </div>
              </div>
            </section>
          </div>

          <section className={`${UI.sectionCard} p-5 sm:p-6`}>
            <SectionHeader icon="briefcase" title="Perks and Benefits" subtitle={`${perksAndBenefits.length} item${perksAndBenefits.length === 1 ? "" : "s"}`} />
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
