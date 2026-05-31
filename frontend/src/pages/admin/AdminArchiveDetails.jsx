import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AdminLayout from "../../layouts/AdminLayout";
import api from "../../services/api";

const cn = (...classes) => classes.filter(Boolean).join(" ");

const UI = {
  page: "mx-auto max-w-7xl px-1 py-8",
  container: "mx-auto max-w-7xl space-y-6",
  card: "overflow-hidden rounded-3xl border border-[#E2E8F0] bg-[#F8FAFC] shadow-[0_8px_24px_rgba(15,23,42,0.05)]",
  cardSoft: "overflow-hidden rounded-3xl border border-[#E2E8F0] bg-[#F8FAFC] shadow-[0_10px_28px_rgba(15,23,42,0.06)]",
  panel: "border-b border-[#E2E8F0] bg-[#EEF2F6] px-5 py-4 sm:px-6",
  inset: "rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF]/90 shadow-[0_1px_0_rgba(15,23,42,0.03)]",
  insetGray: "rounded-2xl border border-[#DCE3EA] bg-[#EEF2F6] shadow-[0_1px_0_rgba(15,23,42,0.03)]",
  h1: "text-2xl font-bold tracking-[-0.02em] text-black sm:text-3xl",
  h2: "text-lg font-bold tracking-[-0.01em] text-black",
  h3: "text-base font-bold text-black",
  body: "text-sm leading-6 text-[#475467]",
  label: "text-xs font-semibold uppercase tracking-[0.08em] text-[#64748B]",
  value: "text-sm font-semibold leading-6 text-[#111827] sm:text-[15px]",
  ring: "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2 focus-visible:ring-offset-white",
  btnBase: "inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition duration-150 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-60",
  btnPrimary: "bg-[#2e66a6] px-6 py-3 text-sm font-bold text-white shadow-[0_8px_18px_rgba(46,102,166,0.22)] hover:bg-[#255587]",
  btnSecondary: "border border-[#E2E8F0] bg-white px-6 py-3 text-sm font-semibold text-black shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:bg-[#F8FAFC]",
};

const fmtDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const getName = (user) => {
  if (!user) return "Unknown";
  return (
    user?.employerProfile?.companyName ||
    user?.companyName ||
    user?.fullName ||
    [user?.firstName, user?.middleName, user?.lastName].filter(Boolean).join(" ") ||
    user?.email ||
    "Unknown"
  );
};

const getAddress = (item) =>
  item?.location ||
  item?.job?.location ||
  item?.jobseeker?.jobSeekerProfile?.address ||
  item?.employer?.employerProfile?.companyAddress ||
  item?.employerProfile?.companyAddress ||
  item?.employerProfile?.regionCity ||
  item?.jobSeekerProfile?.address ||
  "—";

const getCompanyName = (item) => {
  const employer = item?.employer || item?.job?.employer || item;
  return employer?.employerProfile?.companyName || item?.companyName || item?.job?.companyName || getName(employer);
};

const listify = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  return String(value || "")
    .split(/[\n,•]+/g)
    .map((v) => v.trim())
    .filter(Boolean);
};

const normalizeLocation = (jobData) => {
  const candidates = [
    jobData?.location,
    jobData?.jobLocation,
    jobData?.address,
    jobData?.employerDetails?.location,
    jobData?.employerDetails?.companyAddress,
    jobData?.employer?.companyAddress,
    jobData?.employer?.employerProfile?.companyAddress,
    jobData?.employer?.employerProfile?.regionCity,
    jobData?.employerId?.companyAddress,
    jobData?.companyAddress,
    jobData?.regionCity && jobData?.country ? `${jobData.regionCity}, ${jobData.country}` : "",
    jobData?.employerDetails?.regionCity && jobData?.employerDetails?.country
      ? `${jobData.employerDetails.regionCity}, ${jobData.employerDetails.country}`
      : "",
  ];

  for (const c of candidates) {
    if (!c) continue;

    if (typeof c === "object") {
      const city = c.city || c.town || c.regionCity || "";
      const prov = c.province || c.state || "";
      const country = c.country || "";
      const built = [city, prov, country].filter(Boolean).join(", ");
      if (built.trim()) return built.trim();
      continue;
    }

    const s = String(c).trim();
    if (!s) continue;

    const bad = ["not specified", "n/a", "not set", "location not specified", "—"];
    if (bad.includes(s.toLowerCase())) continue;

    return s;
  }

  return "";
};

const formatLocationDisplay = (loc) => {
  const v = String(loc || "").trim();
  return v || "—";
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

const buildWorkLocationUrl = (jobData) => {
  const coords = getJobCoordinates(jobData);
  const address = formatLocationDisplay(normalizeLocation(jobData) || jobData?.location);

  return buildOpenStreetMapUrl({ coords, address });
};

const StaticLocationMap = ({ job, heightClass = "h-[160px]" }) => {
  const normalizedJob = useMemo(
    () => ({
      ...job,
      location: normalizeLocation(job) || job?.location || "",
    }),
    [job]
  );

  const savedCoords = getJobCoordinates(normalizedJob);
  const address = formatLocationDisplay(normalizedJob?.location);
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

      const cleanAddress = String(normalizedJob?.location || "").trim();
      if (!cleanAddress) {
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
  }, [normalizedJob?.location, savedCoords?.lat, savedCoords?.lng]);

  const openMapUrl = buildOpenStreetMapUrl({ coords: resolvedCoords || savedCoords, address });

  if (!isUsableCoordinates(resolvedCoords)) {
    return (
      <a
        href={openMapUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`${heightClass} relative flex w-full items-center justify-center bg-[#EEF2F6] text-[#2e66a6] transition hover:bg-[#E7EDF3]`}
        title="Open work location in OpenStreetMap"
        aria-label="Open work location in OpenStreetMap"
      >
        <div className="px-4 text-center">
          <Icon name="mapPin" className="mx-auto h-8 w-8" />
          <p className="mt-2 text-xs font-semibold text-[#64748B]">
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
      className={`${heightClass} group relative block w-full overflow-hidden bg-[#EEF2F6]`}
      title="Open work location in OpenStreetMap"
      aria-label="Open work location in OpenStreetMap"
    >
      <iframe
        title="Work location map"
        src={src}
        className="h-full w-full border-0 pointer-events-none"
        loading="lazy"
      />
      <span className="absolute inset-0 bg-transparent transition group-hover:bg-black/5" aria-hidden="true" />
      <span className="absolute bottom-2 right-2 rounded-full bg-white/95 px-3 py-1 text-[11px] font-semibold text-[#2e66a6] shadow-sm">
        Open Map
      </span>
    </a>
  );
};


const Icon = ({ name, className = "h-4 w-4" }) => {
  const common = { className, fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", strokeWidth: 2 };
  const icons = {
    arrowLeft: <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />,
    restore: <path strokeLinecap="round" strokeLinejoin="round" d="M3 10a9 9 0 103-6.708M3 10V4m0 6h6" />,
    user: <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />,
    building: <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1" />,
    briefcase: <path strokeLinecap="round" strokeLinejoin="round" d="M10 6h4a2 2 0 012 2v1h3a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2v-7a2 2 0 012-2h3V8a2 2 0 012-2zm0 3h4V8h-4v1z" />,
    mail: <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />,
    phone: <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.95.68l1.5 4.5a1 1 0 01-.5 1.21l-2.26 1.13a11.04 11.04 0 005.52 5.52l1.13-2.26a1 1 0 011.21-.5l4.49 1.5a1 1 0 01.68.95V19a2 2 0 01-2 2h-1C9.72 21 3 14.28 3 6V5z" />,
    mapPin: <><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></>,
    file: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
    money: <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V6m0 12v-2" />,
    clock: <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />,
    graduation: <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422A12.083 12.083 0 0118.825 17 11.952 11.952 0 0012 20.055 11.952 11.952 0 005.176 17a12.078 12.078 0 01.665-6.479L12 14z" />,
    calendar: <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />,
    link: <><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 010 5.656l-1.414 1.414a4 4 0 01-5.656-5.656l1.06-1.06" /><path strokeLinecap="round" strokeLinejoin="round" d="M10.172 13.828a4 4 0 010-5.656l1.414-1.414a4 4 0 015.656 5.656l-1.06 1.06" /></>,
  };
  return <svg {...common}>{icons[name]}</svg>;
};

const RestoreModal = ({ item, type, onCancel, onConfirm, loading }) => {
  if (!item) return null;
  const title = type === "jobs" ? "Restore Job" : type === "applications" ? "Restore Application" : "Restore User";
  const name = type === "jobs" ? item.title : type === "applications" ? getName(item.jobseeker) : getName(item);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 px-4 backdrop-blur-[1px]">
      <div className="w-full max-w-[460px] overflow-hidden rounded-[24px] border border-[#D8E0EA] bg-[#F8FAFC] text-center shadow-[0_18px_50px_rgba(15,23,42,0.18)]">
        <div className="px-6 pt-7 pb-6">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#2e66a6]/10 text-[#2e66a6]">
            <Icon name="restore" className="h-7 w-7" />
          </div>
          <h2 className="mt-5 text-2xl font-bold tracking-[-0.02em] text-black">{title}</h2>
          <p className="mx-auto mt-3 max-w-[360px] text-[15px] leading-7 text-[#475467]">
            Are you sure you want to restore <span className="font-bold text-black">{name || "this item"}</span>?
          </p>
        </div>
        <div className="border-t border-[#D8E0EA] bg-[#EEF2F6] px-6 py-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button type="button" onClick={onCancel} disabled={loading} className={cn(UI.btnBase, UI.ring, "h-11 rounded-[14px] border border-[#CBD5E1] bg-white text-sm text-black hover:bg-[#F8FAFC]")}>Cancel</button>
            <button type="button" onClick={onConfirm} disabled={loading} className={cn(UI.btnBase, UI.ring, "h-11 rounded-[14px] bg-[#2e66a6] text-sm text-white shadow-[0_8px_18px_rgba(46,102,166,0.22)] hover:bg-[#255587]")}>{loading ? "Restoring..." : "Confirm"}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Badge = ({ children }) => (
  <span className="inline-flex items-center gap-2 rounded-full border border-[#CBD5E1] bg-white px-3 py-1 text-xs font-bold text-black">
    <span className="h-2 w-2 rounded-full bg-black/45" />
    {children}
  </span>
);

const HeaderLine = ({ icon, children }) => (
  <span className="inline-flex min-w-0 items-center gap-2 text-sm text-[#475467]">
    <Icon name={icon} className="h-4 w-4 shrink-0 text-black/45" />
    <span className="truncate">{children || "—"}</span>
  </span>
);

const InfoCard = ({ icon, label, value, className = "" }) => (
  <div className={cn(UI.insetGray, "p-4 transition hover:border-[#C8D2DC] hover:bg-[#E7EDF3]", className)}>
    <div className="flex items-start gap-3">
      {icon && <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#2e66a6]"><Icon name={icon} /></div>}
      <div className="min-w-0 flex-1">
        <p className={UI.label}>{label}</p>
        <p className={cn(UI.value, "mt-1 break-words")}>{value || "—"}</p>
      </div>
    </div>
  </div>
);

const SkillPill = ({ children }) => (
  <span className="rounded-full bg-[#EEF2F6] px-4 py-2 text-xs font-bold text-[#2e66a6]">{children}</span>
);

const CredentialCard = ({ title, sub, href }) => (
  <div className="flex min-h-[64px] items-center justify-between gap-4 rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF]/90 px-4 py-3 transition hover:border-[#2e66a6]/30 hover:bg-white hover:shadow-[0_8px_18px_rgba(15,23,42,0.05)] sm:px-5">
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EEF2F6] text-[#2e66a6]"><Icon name="file" /></div>
      <div className="min-w-0">
        <p className="truncate text-[15px] font-semibold text-black" title={title}>{title}</p>
        {sub && <p className="mt-0.5 truncate text-xs text-[#64748B]" title={sub}>{sub}</p>}
      </div>
    </div>
    {href ? (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cn(UI.ring, "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#E2E8F0] bg-white text-black transition hover:border-[#2e66a6]/30 hover:bg-[#2e66a6]/[0.06]")} aria-label={`Open ${title}`} title={`Open ${title}`}>
        <Icon name="file" />
      </a>
    ) : (
      <span className="shrink-0 rounded-full border border-[#E2E8F0] bg-white px-3 py-1 text-xs font-bold text-black/45">No file</span>
    )}
  </div>
);

const ArchiveMeta = ({ item, archiveMeta }) => (
  <div className={cn(UI.cardSoft, "grid gap-4 bg-[#EEF2F6] px-5 py-4 text-xs text-[#475467] md:grid-cols-3")}>
    <div>
      <p className="font-bold uppercase text-[#2e66a6]">Date Archived</p>
      <p className="font-bold text-[#111827]">{fmtDate(item.archivedAt || item.dateArchived || item.updatedAt)}</p>
    </div>
    <div>
      <p className="font-bold uppercase text-[#2e66a6]">Archived By</p>
      <p className="font-bold text-[#111827]">{archiveMeta.archivedByName || "Admin"}</p>
    </div>
    <div>
      <p className="font-bold uppercase text-[#2e66a6]">Archive Reason</p>
      <p className="font-bold text-[#111827]">{archiveMeta.reason || item.archiveReason || "Archived data"}</p>
    </div>
  </div>
);

const AdminArchiveDetails = () => {
  const { type, id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRestore, setShowRestore] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);

  const cleanType = useMemo(() => {
    if (["users", "jobs", "applications"].includes(type)) return type;
    return "users";
  }, [type]);

  const loadDetails = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/archive/${cleanType}/${id}`);
      setItem(res.data?.item || null);
    } catch (err) {
      console.error("Archive detail load error:", err);
      setItem(null);
    } finally {
      setLoading(false);
    }
  }, [cleanType, id]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  const confirmRestore = async () => {
    setRestoreLoading(true);
    try {
      await api.patch(`/admin/archive/${cleanType.slice(0, -1)}/${id}/restore`);
      navigate(`/admin/archive?tab=${cleanType}`);
    } catch (err) {
      console.error("Restore error:", err);
      alert(err?.response?.data?.message || "Failed to restore item.");
    } finally {
      setRestoreLoading(false);
    }
  };

  const archiveMeta = item?.archiveMeta || {};
  const statusLabel = item?.archiveStatus || item?.statusLabel || item?.status || "ARCHIVED";

  const buildHref = (url) => {
    if (!url) return "";
    return url.startsWith("http") ? url : `${process.env.REACT_APP_API_URL?.replace(/\/api$/, "") || "http://localhost:5000"}${url}`;
  };

  const getDocUrl = (profile, docKey) => {
    const doc = profile?.verificationDocs?.[docKey];
    return doc?.url || doc?.fileUrl || doc?.path || "";
  };

  const renderUser = () => {
    const isEmployer = item?.role === "employer";
    const profile = isEmployer ? item?.employerProfile || {} : item?.jobSeekerProfile || {};

    if (isEmployer) {
      const docs = [
        ["secRegistration", "SEC Registration", "Securities and Exchange Commission"],
        ["birRegistration", "BIR Registration", "Bureau of Internal Revenue"],
        ["dtiRegistration", "DTI Registration", "Department of Trade and Industry"],
        ["cityPermit", "City / Municipality Permit", "Local Government Unit"],
        ["businessPermit", "Business Permit", "Mayor's / Business Permit"],
      ];

      return (
        <div className="space-y-6">
          <div className={cn(UI.cardSoft)}>
            <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-[#E2E8F0] bg-[#EEF2F6] text-[#2e66a6] shadow-sm">
                  <Icon name="building" className="h-9 w-9" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="truncate text-lg font-bold text-black sm:text-xl" title={getName(item)}>{getName(item)}</h1>
                    <Badge>{statusLabel}</Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                    <HeaderLine icon="briefcase">{profile.industry || "Employer"}</HeaderLine>
                    <HeaderLine icon="mail">{profile.businessEmail || item?.email || "—"}</HeaderLine>
                    <HeaderLine icon="phone">{profile.mobileNumber || profile.phoneNumber || "—"}</HeaderLine>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center lg:justify-end">
                <button type="button" onClick={() => setShowRestore(true)} className={cn(UI.btnBase, UI.btnPrimary, UI.ring)}>Restore</button>
                <p className="text-xs font-semibold text-[#64748B] sm:text-right">Date Registered: {fmtDate(item?.createdAt)}</p>
              </div>
            </div>
          </div>

          <div className={cn(UI.card)}>
            <div className={UI.panel}><h2 className={UI.h2}>Company Information</h2></div>
            <div className="p-5 sm:p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <InfoCard icon="building" label="Company Name" value={getName(item)} />
                <InfoCard icon="user" label="Contact Person" value={profile.contactPerson || profile.contactName || getName(item)} />
                <InfoCard icon="mail" label="Business Email" value={profile.businessEmail || item?.email} />
                <InfoCard icon="phone" label="Mobile Number" value={profile.mobileNumber || profile.phoneNumber} />
                <InfoCard icon="mapPin" label="Address" value={getAddress(item)} className="sm:col-span-2" />
              </div>
            </div>
          </div>

          <div className={cn(UI.card)}>
            <div className={UI.panel}>
              <h2 className={UI.h2}>Credentials</h2>
             
            </div>
            <div className="p-5 sm:p-6">
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {docs.map(([key, title, sub]) => <CredentialCard key={key} title={title} sub={sub} href={buildHref(getDocUrl(profile, key))} />)}
              </div>
            </div>
          </div>
        </div>
      );
    }

    const technicalSkills = [
      ...listify(profile?.technicalSkills),
      ...listify(profile?.softSkills),
      ...listify(profile?.skills),
    ].filter(Boolean);
    const skillList = technicalSkills.length ? [...new Set(technicalSkills)].slice(0, 8) : ["No skills available"];
    const course = profile?.course || profile?.program || profile?.studyField || "—";
    const campus = profile?.campus || profile?.school || "—";
    const classYear = profile?.yearGraduated || profile?.graduationYear || profile?.batchYear || "";
    const workDone = profile?.experienceType || profile?.whatHaveYouDone || profile?.workExperience || profile?.internship || "—";
    const preferredWorkMode = profile?.preferredWorkMode || profile?.workMode || "—";
    const availability = profile?.availability || profile?.howSoonCanYouStart || profile?.startAvailability || "—";

    return (
      <div className="space-y-6">
        <div className={cn(UI.cardSoft)}>
          <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-[#E2E8F0] bg-[#EEF2F6] text-[#2e66a6] shadow-sm">
                <Icon name="user" className="h-10 w-10" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-lg font-bold text-black sm:text-xl" title={getName(item)}>{getName(item)}</h1>
                  <Badge>{statusLabel}</Badge>
                </div>
                <p className="mt-2 text-sm leading-6 text-[#64748B]">Archived jobseeker profile</p>
              </div>
            </div>
            <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center lg:justify-end">
              <button type="button" onClick={() => setShowRestore(true)} className={cn(UI.btnBase, UI.btnPrimary, UI.ring)}>Restore</button>
              <p className="text-xs font-semibold text-[#64748B] sm:text-right">Date Registered: {fmtDate(item?.createdAt)}</p>
            </div>
          </div>
        </div>

        <div className={cn(UI.card)}>
          <div className={UI.panel}><h2 className={UI.h2}>Basic Information</h2></div>
          <div className="p-5 sm:p-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <InfoCard icon="mail" label="Email Address" value={item?.email} />
                <InfoCard icon="phone" label="Contact Number" value={profile?.phoneNumber || profile?.mobileNumber} />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <InfoCard icon="building" label="Campus" value={campus} />
                <InfoCard icon="graduation" label="Course" value={course} />
              </div>
              <InfoCard icon="mapPin" label="Current Address" value={getAddress(item)} />
              <InfoCard icon="calendar" label="Year Graduated" value={classYear || "—"} />
            </div>
          </div>
        </div>

        <div className={cn(UI.card)}>
          <div className={UI.panel}><h2 className={UI.h2}>Technical & Soft Skills</h2></div>
          <div className="p-5 sm:p-6">
            <div className="flex flex-wrap gap-3">
              {skillList.map((skill, i) => <SkillPill key={`${skill}-${i}`}>{skill}</SkillPill>)}
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <InfoCard label="What Have You Done?" value={workDone} />
              <InfoCard label="Preferred Work Mode" value={preferredWorkMode} />
              <InfoCard label="How Soon Can You Start" value={availability} />
            </div>
          </div>
        </div>

        <div className={cn(UI.card)}>
          <div className={UI.panel}>
            <h2 className={UI.h2}>Credentials</h2>
           
          </div>
          <div className="p-5 sm:p-6">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              <CredentialCard title="CV / Resume" href={buildHref(getDocUrl(profile, "cv"))} />
              <CredentialCard title="Valid ID" href={buildHref(getDocUrl(profile, "validId"))} />
              <CredentialCard title="Diploma" href={buildHref(getDocUrl(profile, "diploma"))} />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderJob = () => {
    const skills = listify(item?.skillsRequired);
    const perks = listify(item?.perksAndBenefits);
    const companyName = getCompanyName(item);
    const companyLogo =
      item?.companyLogo ||
      item?.employer?.companyLogo ||
      item?.employer?.employerProfile?.companyLogo ||
      item?.employerProfile?.companyLogo ||
      "";
    const salaryText =
      item?.salaryMin || item?.salaryMax
        ? `₱${Number(item?.salaryMin || 0).toLocaleString()} - ₱${Number(item?.salaryMax || 0).toLocaleString()}`
        : "Salary not specified";
    const websiteUrl = item?.employer?.employerProfile?.website || item?.employerProfile?.website || "—";
    const otherBenefits = listify(item?.otherBenefits);
    const allPerks = [...perks, ...otherBenefits].filter(Boolean);

    return (
      <div className="space-y-6">
        <div className="overflow-hidden rounded-[24px] border border-[#E2E8F0] bg-white shadow-sm">
          <div className="relative h-[85px] w-full overflow-hidden sm:h-[105px]">
            <img src="/images/jobback.png" alt="Job details banner" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-black/10" />
          </div>

          <div className="px-5 pb-5 pt-4 sm:px-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex min-w-0 flex-1 items-start gap-4">
                {companyLogo ? (
                  <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl border border-[#D9DBE3] bg-white sm:h-16 sm:w-16">
                    <img src={companyLogo} alt={`${companyName || "Company"} logo`} className="h-full w-full object-cover" />
                  </div>
                ) : (
                  <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl border border-[#D9DBE3] bg-[#F3F4F6] text-[#2e66a6] sm:h-16 sm:w-16">
                    <Icon name="briefcase" className="h-8 w-8" />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="truncate text-[28px] font-bold leading-tight text-[#111827] sm:text-[32px]" title={item?.title}>
                      {item?.title || "Untitled Job"}
                    </h1>
                    <Badge>{statusLabel}</Badge>
                  </div>

                  <div className="mt-2 flex items-center gap-2 text-[#4B5563]">
                    <Icon name="building" className="h-4 w-4" />
                    <span className="text-sm">{companyName || "—"}</span>
                  </div>

                  <div className="mt-2 flex items-center gap-2 text-[#6B7280]">
                    <Icon name="mapPin" className="h-4 w-4" />
                    <span className="text-sm">{item?.location || "—"}</span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {item?.jobType && (
                      <span className="inline-flex items-center gap-2 rounded-full border border-[#D7E6F5] bg-[#EEF5FC] px-3 py-1 text-xs font-semibold text-[#2e66a6]">
                        <Icon name="briefcase" className="h-3.5 w-3.5" />
                        {item.jobType}
                      </span>
                    )}

                    {item?.workMode && (
                      <span className="inline-flex items-center gap-2 rounded-full border border-[#D7E6F5] bg-[#EEF5FC] px-3 py-1 text-xs font-semibold text-[#2e66a6]">
                        <Icon name="building" className="h-3.5 w-3.5" />
                        {item.workMode}
                      </span>
                    )}

                    {item?.vacancies && (
                      <span className="inline-flex items-center gap-2 rounded-full border border-[#D7E6F5] bg-[#EEF5FC] px-3 py-1 text-xs font-semibold text-[#2e66a6]">
                        <Icon name="user" className="h-3.5 w-3.5" />
                        {item.vacancies} Vacancies
                      </span>
                    )}
                  </div>

                  <div className="mt-3 space-y-1 text-xs text-[#6B7280]">
                    <p>Date archived: {fmtDate(item?.archivedAt || item?.dateArchived || item?.updatedAt)}</p>
                    {item?.applicationDeadline && <p>Application deadline is on {fmtDate(item.applicationDeadline)}</p>}
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-start gap-2 lg:items-end">
                <button type="button" onClick={() => setShowRestore(true)} className={cn(UI.btnBase, UI.btnPrimary, UI.ring)}>
                  Restore
                </button>
                <p className="text-xs font-semibold text-[#64748B] lg:text-right">Job archived record</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <InfoCard icon="money" label="Salary" value={salaryText} />
          <InfoCard icon="clock" label="Experience" value={item?.experienceLevel || "No experience required"} />
          <InfoCard icon="graduation" label="Educational Requirements" value={item?.educationLevel || "Not specified"} />
          <InfoCard icon="link" label="Website Company URL" value={websiteUrl} />
        </div>

        <div className={cn(UI.card)}>
          <div className={UI.panel}>
            <h2 className={UI.h2}>Job Description</h2>
          </div>
          <div className="p-5 sm:p-6">
            <p className="whitespace-pre-wrap text-sm leading-7 text-[#475467] sm:text-[15px]">
              {item?.description || "No job description available."}
            </p>
          </div>
        </div>

        <div className={cn(UI.card)}>
          <div className={UI.panel}>
            <h2 className={UI.h2}>Qualification</h2>
          </div>
          <div className="p-5 sm:p-6">
            <div className="whitespace-pre-wrap text-sm leading-7 text-[#475467] sm:text-[15px]">
              {item?.requirements || "No qualifications available."}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.1fr)_340px]">
          <div className={cn(UI.card)}>
            <div className={UI.panel}>
              <h2 className={UI.h2}>Required Skills</h2>
            </div>
            <div className="p-5 sm:p-6">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {skills.length ? (
                  skills.map((skill, idx) => (
                    <div key={`${skill}-${idx}`} className="rounded-xl border border-[#D7E6F5] bg-[#F8FAFC] px-3 py-2 text-xs font-medium text-[#374151]">
                      {skill}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[#64748B]">No required skills listed.</p>
                )}
              </div>
            </div>
          </div>

          <div className={cn(UI.card)}>
            <StaticLocationMap job={{ ...item, location: normalizeLocation(item) || item?.location || "" }} heightClass="h-[160px]" />
            <div className="border-t border-[#E2E8F0] px-4 py-3">
              <div className="flex items-start gap-2 text-[#374151]">
                <Icon name="mapPin" className="mt-0.5 h-4 w-4 flex-shrink-0" />
                {buildWorkLocationUrl(item) ? (
                  <a
                    href={buildWorkLocationUrl(item)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(UI.ring, "rounded text-sm font-medium text-[#2e66a6] hover:underline")}
                    title="Open work location in OpenStreetMap"
                  >
                    {formatLocationDisplay(normalizeLocation(item) || item?.location)}
                  </a>
                ) : (
                  <p className="text-sm font-medium text-[#475467]">{formatLocationDisplay(normalizeLocation(item) || item?.location)}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className={cn(UI.card)}>
          <div className={UI.panel}>
            <h2 className={UI.h2}>Perks and Benefits</h2>
          </div>
          <div className="p-5 sm:p-6">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {allPerks.length ? (
                allPerks.map((benefit, idx) => (
                  <div key={`${benefit}-${idx}`} className="rounded-xl border border-[#D7E6F5] bg-[#F8FAFC] px-3 py-2 text-xs font-medium text-[#374151]">
                    {benefit}
                  </div>
                ))
              ) : (
                <p className="text-sm text-[#64748B]">No perks and benefits listed.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderApplication = () => {
    const job = item?.job || {};
    const jobseeker = item?.jobseeker || item?.applicant || {};
    const employer = item?.employer || job?.employer || {};
    const employerProfile = employer?.employerProfile || {};
    const skills = listify(job?.skillsRequired);
    const perks = [...listify(job?.perksAndBenefits), ...listify(job?.otherBenefits)].filter(Boolean);
    const companyName = job.companyName || employerProfile.companyName || employer.fullName || getCompanyName({ employer, job });
    const location = job.location || job.address || employerProfile.companyAddress || employer.companyAddress || "—";
    const applicantName =
      jobseeker.fullName ||
      [jobseeker.firstName, jobseeker.middleName, jobseeker.lastName, jobseeker.extensionName].filter(Boolean).join(" ") ||
      jobseeker.email ||
      "—";
    const companyLogo = job.companyLogo || employerProfile.companyLogo || employer.companyLogo || "";
    const salaryText =
      typeof job.salaryMin === "number" || typeof job.salaryMax === "number"
        ? `${typeof job.salaryMin === "number" ? `₱${Number(job.salaryMin).toLocaleString("en-PH")}` : "From"} - ${typeof job.salaryMax === "number" ? `₱${Number(job.salaryMax).toLocaleString("en-PH")}` : "Up"}`
        : job.salaryMin || job.salaryMax
        ? `₱${Number(job.salaryMin || 0).toLocaleString("en-PH")} - ₱${Number(job.salaryMax || 0).toLocaleString("en-PH")}`
        : "Salary not specified";

    return (
      <div className="space-y-6">
        <section className="overflow-hidden rounded-[24px] border border-[#E2E8F0] bg-white shadow-sm">
          <div className="relative h-[85px] w-full overflow-hidden sm:h-[105px]">
            <img src="/images/jobback.png" alt="Application details banner" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-black/10" />
          </div>

          <div className="px-5 pb-5 pt-4 sm:px-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex min-w-0 flex-1 items-start gap-4">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#E2E8F0] bg-[#EEF5FC] text-xl font-bold text-[#2e66a6] shadow-sm">
                  {companyLogo ? (
                    <img src={companyLogo} alt={companyName || "Company"} className="h-full w-full object-cover" />
                  ) : (
                    String(companyName || "C").charAt(0).toUpperCase()
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-[28px] font-bold leading-tight tracking-[-0.02em] text-[#111827] sm:text-[32px]" title={job.title || job.jobTitle || "Untitled Job"}>
                      {job.title || job.jobTitle || "Untitled Job"}
                    </h1>
                    <Badge>{statusLabel}</Badge>
                  </div>

                  <div className="mt-2 flex items-center gap-2 text-[#4B5563]">
                    <Icon name="building" className="h-4 w-4 text-[#2e66a6]" />
                    <span className="text-sm font-medium">{companyName || "—"}</span>
                  </div>

                  <div className="mt-2 flex items-start gap-2 text-[#6B7280]">
                    <Icon name="mapPin" className="mt-0.5 h-4 w-4 shrink-0 text-[#2e66a6]" />
                    <span className="text-sm leading-6">{location}</span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {job.jobType && (
                      <span className="inline-flex items-center gap-2 rounded-full border border-[#D7E6F5] bg-[#EEF5FC] px-3 py-1.5 text-xs font-semibold text-[#2e66a6]">
                        <Icon name="briefcase" className="h-3.5 w-3.5" />
                        {job.jobType}
                      </span>
                    )}

                    {job.workMode && (
                      <span className="inline-flex items-center gap-2 rounded-full border border-[#D7E6F5] bg-[#EEF5FC] px-3 py-1.5 text-xs font-semibold text-[#2e66a6]">
                        <Icon name="building" className="h-3.5 w-3.5" />
                        {job.workMode}
                      </span>
                    )}

                    {(item.appliedAt || item.createdAt) && (
                      <span className="inline-flex items-center gap-2 rounded-full border border-[#D7E6F5] bg-[#EEF5FC] px-3 py-1.5 text-xs font-semibold text-[#2e66a6]">
                        <Icon name="calendar" className="h-3.5 w-3.5" />
                        Applied {fmtDate(item.appliedAt || item.createdAt)}
                      </span>
                    )}
                  </div>

                  <div className="mt-3 space-y-1 text-xs font-medium text-[#6B7280]">
                    <p>Date applied: {fmtDate(item.appliedAt || item.createdAt)}</p>
                    {job.applicationDeadline && <p>Application deadline is on {fmtDate(job.applicationDeadline)}</p>}
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-start gap-2 lg:items-end">
                <button type="button" onClick={() => setShowRestore(true)} className={cn(UI.btnBase, UI.btnPrimary, UI.ring)}>
                  Restore
                </button>
                <p className="text-xs font-semibold text-[#64748B] lg:text-right">Applicant: {applicantName}</p>
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <InfoCard icon="money" label="Salary" value={salaryText} />
          <InfoCard icon="clock" label="Experience" value={job.experienceLevel || "No experience required"} />
          <InfoCard icon="graduation" label="Educational Requirements" value={job.educationLevel || job.educationalRequirements || "Not specified"} />
          <InfoCard icon="user" label="Applicant" value={applicantName} />
        </div>


        <div className={cn(UI.card)}>
          <div className={UI.panel}>
            <h2 className={UI.h2}>Job Description</h2>
          </div>
          <div className="p-5 sm:p-6">
            <div className="whitespace-pre-wrap text-sm leading-7 text-[#475467] sm:text-[15px]">
              {job.description || "No description provided."}
            </div>
          </div>
        </div>

        <div className={cn(UI.card)}>
          <div className={UI.panel}>
            <h2 className={UI.h2}>Qualification</h2>
          </div>
          <div className="p-5 sm:p-6">
            <div className="whitespace-pre-wrap text-sm leading-7 text-[#475467] sm:text-[15px]">
              {job.requirements || job.qualification || "No requirements provided."}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.1fr)_340px]">
          <div className={cn(UI.card)}>
            <div className={UI.panel}>
              <h2 className={UI.h2}>Required Skills</h2>
            </div>
            <div className="p-5 sm:p-6">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {skills.length ? (
                  skills.map((skill, index) => (
                    <div key={`${skill}-${index}`} className="rounded-xl border border-[#D7E6F5] bg-[#F8FAFC] px-3 py-2 text-xs font-medium text-[#374151]">
                      {skill}
                    </div>
                  ))
                ) : (
                  <p className="text-sm font-medium text-[#64748B]">No required skills listed.</p>
                )}
              </div>
            </div>
          </div>

          <div className={cn(UI.card)}>
            <StaticLocationMap job={{ ...job, location }} heightClass="h-[160px]" />
            <div className="border-t border-[#E2E8F0] px-4 py-3">
              <div className="flex items-start gap-2 text-[#374151]">
                <Icon name="mapPin" className="mt-0.5 h-4 w-4 shrink-0 text-[#2e66a6]" />
                {buildWorkLocationUrl({ ...job, location }) ? (
                  <a
                    href={buildWorkLocationUrl({ ...job, location })}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(UI.ring, "rounded text-sm font-medium leading-6 text-[#2e66a6] hover:underline")}
                    title="Open work location in OpenStreetMap"
                  >
                    {formatLocationDisplay(location)}
                  </a>
                ) : (
                  <p className="text-sm font-medium leading-6 text-[#475467]">{formatLocationDisplay(location)}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className={cn(UI.card)}>
          <div className={UI.panel}>
            <h2 className={UI.h2}>Perks and Benefits</h2>
          </div>
          <div className="p-5 sm:p-6">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {perks.length ? (
                perks.map((benefit, index) => (
                  <div key={`${benefit}-${index}`} className="rounded-xl border border-[#D7E6F5] bg-[#F8FAFC] px-3 py-2 text-xs font-medium text-[#374151]">
                    {benefit}
                  </div>
                ))
              ) : (
                <p className="text-sm font-medium text-[#64748B]">No perks and benefits listed.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className={UI.page}>
        <div className={UI.container}>
          <button type="button" onClick={() => navigate(-1)} className={cn(UI.btnBase, UI.btnSecondary, UI.ring)}>
            <Icon name="arrowLeft" /> Back
          </button>

          {item && <ArchiveMeta item={item} archiveMeta={archiveMeta} />}

          {loading ? (
            <div className={cn(UI.card, "p-12 text-center text-[#64748B]")}>Loading details...</div>
          ) : !item ? (
            <div className={cn(UI.card, "p-12 text-center text-[#64748B]")}>Archive data not found.</div>
          ) : cleanType === "applications" ? renderApplication() : cleanType === "jobs" ? renderJob() : renderUser()}
        </div>
      </div>

      {showRestore && (
        <RestoreModal
          item={item}
          type={cleanType}
          loading={restoreLoading}
          onCancel={() => setShowRestore(false)}
          onConfirm={confirmRestore}
        />
      )}
    </AdminLayout>
  );
};

export default AdminArchiveDetails;
