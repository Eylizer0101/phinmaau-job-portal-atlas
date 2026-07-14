import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../../services/api';
import AdminLayout from '../../layouts/AdminLayout';

const getRelocationDisplayLabel = (value) => {
  const normalized = String(value || '').trim().toLowerCase();

  if (normalized === 'yes - willing to relocate') {
    return 'Willing to relocate';
  }

  if (normalized === 'no - position is fixed location') {
    return 'Fixed location';
  }

  if (normalized === 'open to relocation if necessary') {
    return 'Possible to relocate';
  }

  return String(value || '').trim() || 'Fixed location';
};

const UI = {
  page: 'min-h-screen bg-[#f8fafc]',
  container: 'mx-auto max-w-7xl px-1 py-8',
  card: 'w-full rounded-[24px] border border-[#e5e7eb] bg-white shadow-sm',
  sectionCard: 'w-full rounded-[22px] border border-[#e5e7eb] bg-white shadow-sm',
  metricCard: 'rounded-[22px] border border-[#e5e7eb] bg-white px-4 py-4 min-h-[96px] shadow-sm',
  label: 'text-[11px] font-semibold uppercase tracking-[0.03em] text-[#6b7280]',
  value: 'mt-1.5 text-[15px] font-semibold leading-6 text-[#111827]',
  title: 'text-[15px] font-semibold text-[#111827]',
  body: 'text-sm leading-7 text-[#4b5563]',
  muted: 'text-sm text-[#6b7280]',
  chip:
    'inline-flex items-center gap-2 rounded-full border border-[#d7e6f5] bg-[#eef5fc] px-3 py-1 text-xs font-semibold text-[#2e66a6]',
  skillChip:
    'rounded-xl border border-[#d7e6f5] bg-[#f8fafc] px-3 py-2 text-xs font-medium text-[#374151]',
  ring:
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2 focus-visible:ring-offset-white',
};

const normalizeLocation = (jobData) => {
  const candidates = [
    jobData?.location,
    jobData?.jobLocation,
    jobData?.address,
    jobData?.employerDetails?.location,
    jobData?.employerDetails?.companyAddress,
    jobData?.employer?.companyAddress,
    jobData?.employerId?.companyAddress,
    jobData?.companyAddress,
    jobData?.regionCity && jobData?.country ? `${jobData.regionCity}, ${jobData.country}` : '',
    jobData?.employerDetails?.regionCity && jobData?.employerDetails?.country
      ? `${jobData.employerDetails.regionCity}, ${jobData.employerDetails.country}`
      : '',
  ];

  for (const c of candidates) {
    if (!c) continue;

    if (typeof c === 'object') {
      const city = c.city || c.town || c.regionCity || '';
      const prov = c.province || c.state || '';
      const country = c.country || '';
      const built = [city, prov, country].filter(Boolean).join(', ');
      if (built.trim()) return built.trim();
      continue;
    }

    const s = String(c).trim();
    if (!s) continue;

    const bad = ['not specified', 'n/a', 'not set', 'location not specified'];
    if (bad.includes(s.toLowerCase())) continue;

    return s;
  }

  return '';
};

const formatLocationDisplay = (loc) => {
  const v = String(loc || '').trim();
  return v || '—';
};

const getJobCoordinates = (jobData) => {
  const lat = Number(jobData?.locationLatitude);
  const lng = Number(jobData?.locationLongitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
};

const buildWorkLocationUrl = (jobData) => {
  const coords = getJobCoordinates(jobData);
  if (coords) {
    return `https://www.openstreetmap.org/?mlat=${coords.lat}&mlon=${coords.lng}#map=17/${coords.lat}/${coords.lng}`;
  }

  const locationText = formatLocationDisplay(jobData?.location);
  if (!locationText || locationText === '—') return '';

  return `https://www.openstreetmap.org/search?query=${encodeURIComponent(locationText)}`;
};

const isUsableCoordinates = (coords) => {
  if (!coords) return false;
  if (!Number.isFinite(coords.lat) || !Number.isFinite(coords.lng)) return false;
  if (Math.abs(coords.lat) < 0.0001 && Math.abs(coords.lng) < 0.0001) return false;
  return true;
};

const buildOpenStreetMapUrl = ({ coords, address }) => {
  const cleanAddress = String(address || '').trim();

  if (isUsableCoordinates(coords)) {
    return `https://www.openstreetmap.org/?mlat=${coords.lat}&mlon=${coords.lng}#map=17/${coords.lat}/${coords.lng}`;
  }

  if (cleanAddress && cleanAddress !== '—') {
    return `https://www.openstreetmap.org/search?query=${encodeURIComponent(cleanAddress)}`;
  }

  return 'https://www.openstreetmap.org';
};

const StaticLocationMap = ({ job, heightClass = 'h-[130px]' }) => {
  const savedCoords = getJobCoordinates(job);
  const address = formatLocationDisplay(job?.location);
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

      const cleanAddress = String(job?.location || '').trim();
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
  }, [job?.location, savedCoords?.lat, savedCoords?.lng]);

  const openMapUrl = buildOpenStreetMapUrl({ coords: resolvedCoords || savedCoords, address });

  if (!isUsableCoordinates(resolvedCoords)) {
    return (
      <a
        href={openMapUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`${heightClass} relative flex w-full items-center justify-center bg-black/5 text-black/40 hover:bg-black/10 transition`}
        title="Open work location in OpenStreetMap"
        aria-label="Open work location in OpenStreetMap"
      >
        <div className="text-center px-4">
          <SvgIcon name="location" className="mx-auto h-7 w-7" />
          <p className="mt-2 text-xs text-black/50">
            {lookupDone ? 'Click to open work location' : 'Loading work location map...'}
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
      className={`${heightClass} relative block w-full overflow-hidden bg-black/5 group`}
      title="Open work location in OpenStreetMap"
      aria-label="Open work location in OpenStreetMap"
    >
      <iframe
        title="Work location map"
        src={src}
        className="h-full w-full border-0 pointer-events-none"
        loading="lazy"
      />
      <span className="absolute inset-0 bg-transparent group-hover:bg-black/5 transition" aria-hidden="true" />
      <span className="absolute bottom-2 right-2 rounded-full bg-white/95 px-3 py-1 text-[11px] font-semibold text-[#2e66a6] shadow-sm">
        Open Map
      </span>
    </a>
  );
};

const SvgIcon = ({ name, className = 'h-4 w-4' }) => {
  switch (name) {
    case 'arrowLeft':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 19l-7-7 7-7" />
        </svg>
      );
    case 'building':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.6}
            d="M3 21h18M6 21V5a2 2 0 012-2h8a2 2 0 012 2v16M9 7h.01M9 11h.01M9 15h.01M12 7h.01M12 11h.01M12 15h.01M15 7h.01M15 11h.01M15 15h.01"
          />
        </svg>
      );
    case 'briefcase':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.6}
            d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m-3 0h14a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9a2 2 0 012-2z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M3 13h18" />
        </svg>
      );
    case 'location':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.6}
            d="M12 21s7-4.438 7-11a7 7 0 10-14 0c0 6.562 7 11 7 11z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M12 10a2 2 0 100-4 2 2 0 000 4z" />
        </svg>
      );
    case 'users':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.6}
            d="M17 20h5v-1a4 4 0 00-4-4h-1M9 20H2v-1a4 4 0 014-4h1m7-4a4 4 0 10-8 0 4 4 0 008 0zm8 2a3 3 0 10-6 0 3 3 0 006 0z"
          />
        </svg>
      );
    case 'clock':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'calendar':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.6}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      );
    case 'graduation':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M12 14l9-5-9-5-9 5 9 5z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M6 12v5c0 1.657 2.686 3 6 3s6-1.343 6-3v-5" />
        </svg>
      );
    case 'external':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M14 3h7v7" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M10 14L21 3" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M21 14v6a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6" />
        </svg>
      );
    case 'file':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.6}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      );
    case 'tools':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.6}
            d="M14.7 6.3a4 4 0 01-5.657 5.657l-5.04 5.04a2 2 0 102.829 2.828l5.04-5.04A4 4 0 0114.7 6.3z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M19 7l-3 3" />
        </svg>
      );
    case 'money':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.6}
            d="M3 7.5A1.5 1.5 0 014.5 6h15A1.5 1.5 0 0121 7.5v9A1.5 1.5 0 0119.5 18h-15A1.5 1.5 0 013 16.5v-9z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M12 9.25v5.5M14.25 10.5c0-.69-1.007-1.25-2.25-1.25s-2.25.56-2.25 1.25 1.007 1.25 2.25 1.25 2.25.56 2.25 1.25-1.007 1.25-2.25 1.25-2.25-.56-2.25-1.25" />
        </svg>
      );
    case 'eye':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      );
    default:
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" strokeWidth="1.6" />
        </svg>
      );
  }
};

const CompanyLogo = ({ src, name }) => {
  const [failed, setFailed] = useState(false);
  const initial = (name?.trim()?.[0] || 'C').toUpperCase();

  if (!src || failed) {
    return (
      <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl border border-[#d9dbe3] bg-[#f3f4f6] sm:h-16 sm:w-16">
        <span className="text-lg font-bold text-[#374151] sm:text-xl">{initial}</span>
      </div>
    );
  }

  return (
    <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl border border-[#d9dbe3] bg-white sm:h-16 sm:w-16">
      <img
        src={src}
        alt={`${name || 'Company'} logo`}
        className="h-full w-full object-cover"
        onError={() => setFailed(true)}
        loading="lazy"
      />
    </div>
  );
};

const TopMetricCard = ({ icon, title, value, isPeso = false }) => (
  <div className={UI.metricCard}>
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-[#d7e6f5] bg-[#eef5fc] text-[#2e66a6]">
        {isPeso ? <span className="text-sm font-bold">₱</span> : <SvgIcon name={icon} className="h-4 w-4" />}
      </div>

      <div className="min-w-0">
        <p className={UI.label}>{title}</p>
        <p className={UI.value}>{value}</p>
      </div>
    </div>
  </div>
);

const SectionHeader = ({ icon, title }) => (
  <div className="flex items-center gap-2">
    <span className="text-[#374151]">
      <SvgIcon name={icon} className="h-4 w-4" />
    </span>
    <h3 className={UI.title}>{title}</h3>
  </div>
);

const Skeleton = () => (
  <div className={UI.page}>
    <div className={UI.container}>
      <div className="space-y-5 animate-pulse">
        <div className="h-10 w-40 rounded-xl bg-black/5" />
        <div className="h-40 rounded-2xl bg-black/5" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="h-24 rounded-2xl bg-black/5" />
          <div className="h-24 rounded-2xl bg-black/5" />
          <div className="h-24 rounded-2xl bg-black/5" />
          <div className="h-24 rounded-2xl bg-black/5" />
        </div>
        <div className="h-64 rounded-2xl bg-black/5" />
      </div>
    </div>
  </div>
);


const getApplicantName = (application) => {
  const seeker = application?.jobseeker || application?.applicant || {};
  return seeker.fullName || [seeker.firstName, seeker.middleName, seeker.lastName].filter(Boolean).join(' ') || 'Applicant';
};

const getApplicantEmail = (application) => {
  const seeker = application?.jobseeker || application?.applicant || {};
  return seeker.email || '—';
};

const getApplicantStatusMeta = (statusRaw) => {
  const status = String(statusRaw || 'pending').toLowerCase();

  if (status === 'hired') {
    return {
      label: 'Hired',
      className: 'border-green-200 bg-green-50 text-green-700',
    };
  }

  if (status === 'declined' || status === 'rejected') {
    return {
      label: status === 'rejected' ? 'Rejected' : 'Declined',
      className: 'border-red-200 bg-red-50 text-red-700',
    };
  }

  if (status === 'for interview') {
    return {
      label: 'For Interview',
      className: 'border-[#b9d0e8] bg-[#eef5fc] text-[#2e66a6]',
    };
  }

  if (status === 'pending') {
    return {
      label: 'Pending',
      className: 'border-amber-200 bg-amber-50 text-amber-700',
    };
  }

  return {
    label: status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Pending',
    className: 'border-gray-200 bg-gray-50 text-gray-700',
  };
};

const ApplicantList = ({ applicants, formatFullDate, navigate }) => (
  <div className={`${UI.sectionCard} p-5 sm:p-6`}>
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <SectionHeader icon="users" title="Applicant List" />
      <span className="w-fit rounded-full border border-[#d7e6f5] bg-[#eef5fc] px-3 py-1 text-xs font-semibold text-[#2e66a6]">
        {applicants.length} {applicants.length === 1 ? 'Applicant' : 'Applicants'}
      </span>
    </div>

    <div className="mt-5 overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-[#e5e7eb] text-left text-xs">
          <thead className="bg-[#f8fafc] text-[10px] font-bold uppercase tracking-widest text-[#6b7280]">
            <tr>
              <th className="px-4 py-3">Applicant Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Date Applied</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#eef0f4] bg-white">
            {applicants.length > 0 ? (
              applicants.map((application) => {
                const statusMeta = getApplicantStatusMeta(application.status);

                return (
                  <tr key={application._id} className="text-[#374151] transition hover:bg-[#f8fafc]">
                    <td className="px-4 py-4 font-semibold text-[#111827]">{getApplicantName(application)}</td>
                    <td className="px-4 py-4">{getApplicantEmail(application)}</td>
                    <td className="px-4 py-4">{formatFullDate(application.appliedAt || application.createdAt)}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase ${statusMeta.className}`}>
                        {statusMeta.label}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <button
                        type="button"
                        onClick={() => navigate(`/admin/applications/${application._id}`)}
                        className={`inline-flex h-9 w-9 items-center justify-center rounded-xl text-[#4b5563] transition hover:bg-[#eef5fc] hover:text-[#2e66a6] ${UI.ring}`}
                        title="View application"
                        aria-label="View application"
                      >
                        <SvgIcon name="eye" className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="5" className="px-4 py-10 text-center text-sm text-[#6b7280]">
                  No applicants yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

const AdminJobView = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const backPath = location.state?.backPath || '/admin/users';
  const backLabel = location.state?.backLabel || 'Back';

  const handleBack = () => {
    navigate(backPath);
  };

  const [job, setJob] = useState(null);
  const [companyInfo, setCompanyInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [applicants, setApplicants] = useState([]);

  const formatSalary = useCallback((min, max) => {
    const hasMin = typeof min === 'number';
    const hasMax = typeof max === 'number';
    if (!hasMin && !hasMax) return 'Salary not specified';

    const fmt = (n) => `₱${Number(n).toLocaleString('en-PH')}`;
    if (hasMin && hasMax) return `${fmt(min)} – ${fmt(max)}`;
    if (hasMin) return `From ${fmt(min)}`;
    return `Up to ${fmt(max)}`;
  }, []);

  const formatPostedRelative = useCallback((dateString) => {
    if (!dateString) return 'Posted recently';

    const postedDate = new Date(dateString);
    const now = new Date();

    if (Number.isNaN(postedDate.getTime())) return 'Posted recently';

    const diffMs = now - postedDate;
    const minute = 1000 * 60;
    const hour = minute * 60;
    const day = hour * 24;
    const week = day * 7;
    const month = day * 30;
    const year = day * 365;

    if (diffMs < minute) return 'Posted just now';
    if (diffMs < hour) {
      const mins = Math.floor(diffMs / minute);
      return `Posted ${mins} minute${mins > 1 ? 's' : ''} ago`;
    }
    if (diffMs < day) {
      const hours = Math.floor(diffMs / hour);
      return `Posted ${hours} hour${hours > 1 ? 's' : ''} ago`;
    }
    if (diffMs < week) {
      const days = Math.floor(diffMs / day);
      return `Posted ${days} day${days > 1 ? 's' : ''} ago`;
    }
    if (diffMs < month) {
      const weeks = Math.floor(diffMs / week);
      return `Posted ${weeks} week${weeks > 1 ? 's' : ''} ago`;
    }
    if (diffMs < year) {
      const months = Math.floor(diffMs / month);
      return `Posted ${months} month${months > 1 ? 's' : ''} ago`;
    }

    const years = Math.floor(diffMs / year);
    return `Posted ${years} year${years > 1 ? 's' : ''} ago`;
  }, []);

  const formatFullDate = useCallback((dateString) => {
    if (!dateString) return 'N/A';
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return 'N/A';
    return d.toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }, []);

  const fetchJobDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const response = await api.get(`/jobs/${jobId}`);

      if (response.data.success) {
        const jobData = response.data.job;

        const normalizedLoc = normalizeLocation(jobData);
        const patchedJob = {
          ...jobData,
          location: normalizedLoc || jobData.location || '',
        };

        setJob(patchedJob);

        if (jobData.employerDetails) {
          setCompanyInfo({
            companyAddress: jobData.employerDetails.companyAddress || '',
            industry: jobData.employerDetails.industry || '',
            companyWebsite: jobData.employerDetails.companyWebsite || '',
          });
        } else {
          setCompanyInfo(null);
        }
      } else {
        setError('Job not found');
      }
    } catch (err) {
      if (err.response?.status === 404) setError('Job not found or has been removed');
      else if (err.response?.status === 500) setError('Server error. Please try again later.');
      else if (err.request) setError('Cannot connect to server. Please check your connection.');
      else setError('Error loading job details. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  const fetchJobApplicants = useCallback(async () => {
    try {
      const response = await api.get(`/applications/job/${jobId}`);
      const rows = Array.isArray(response.data?.applications) ? response.data.applications : [];
      setApplicants(rows);
    } catch {
      setApplicants([]);
    }
  }, [jobId]);

  useEffect(() => {
    fetchJobDetails();
    fetchJobApplicants();
  }, [fetchJobDetails, fetchJobApplicants]);

  const requiredSkills = useMemo(() => {
    if (Array.isArray(job?.skillsRequired)) return job.skillsRequired.filter(Boolean);
    return [];
  }, [job?.skillsRequired]);

  const perksAndBenefitsList = useMemo(() => {
    const perks = Array.isArray(job?.perksAndBenefits) ? job.perksAndBenefits.filter(Boolean) : [];
    const other = String(job?.otherBenefits || '').trim();
    return other ? [...perks, other] : perks;
  }, [job?.perksAndBenefits, job?.otherBenefits]);

  if (loading) {
    return (
      <AdminLayout>
        <Skeleton />
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className={UI.page}>
          <div className={UI.container}>
            <div className={`${UI.card} p-8 text-center`}>
              <h1 className="text-lg font-semibold text-[#111827]">{error}</h1>
              <p className="mt-2 text-sm text-[#6b7280]">Unable to load the selected job details right now.</p>

              <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                <button
                  onClick={handleBack}
                  className={`inline-flex items-center justify-center gap-2 rounded-lg border border-[#d7e6f5] bg-white px-4 py-2 text-sm font-semibold text-[#111827] hover:bg-[#eef5fc] hover:text-[#2e66a6] ${UI.ring}`}
                  type="button"
                >
                  <SvgIcon name="arrowLeft" className="h-4 w-4" />
                  {`Back to ${backLabel}`}
                </button>

                <button
                  onClick={fetchJobDetails}
                  className={`inline-flex items-center justify-center rounded-lg border border-[#d7e6f5] bg-white px-4 py-2 text-sm font-semibold text-[#111827] hover:bg-[#eef5fc] hover:text-[#2e66a6] ${UI.ring}`}
                  type="button"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!job) return null;

  return (
    <AdminLayout>
      <div className={UI.page}>
        <div className={UI.container}>
          <div className="mb-5">
            <button
              onClick={handleBack}
              className={`inline-flex items-center justify-center gap-2 rounded-lg border border-[#d7e6f5] bg-white px-4 py-2 text-sm font-semibold text-[#111827] hover:bg-[#eef5fc] hover:text-[#2e66a6] ${UI.ring}`}
              type="button"
            >
              <SvgIcon name="arrowLeft" className="h-4 w-4" />
              {backLabel}
            </button>
          </div>

          <div className={`${UI.card} mb-5 overflow-hidden`}>
            <div className="relative h-[85px] w-full overflow-hidden sm:h-[105px]">
              <img src="/images/jobback.png" alt="Job details banner" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-black/10" />
            </div>

            <div className="px-5 pb-5 pt-4 sm:px-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex min-w-0 flex-1 items-start gap-4">
                  <CompanyLogo src={job.companyLogo} name={job.companyName} />

                  <div className="min-w-0 flex-1">
                    <h1 className="text-[28px] font-bold leading-tight text-[#111827] sm:text-[32px]" title={job.title}>
                      {job.title}
                    </h1>

                    <div className="mt-2 flex items-center gap-2 text-[#4b5563]">
                      <SvgIcon name="building" className="h-4 w-4" />
                      <span className="text-sm">{job.companyName || '—'}</span>
                    </div>

                    <div className="mt-2 flex items-center gap-2 text-[#6b7280]">
                      <SvgIcon name="location" className="h-4 w-4" />
                      <span className="text-sm">{formatLocationDisplay(job.location)}</span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {job.jobType && (
                        <span className={UI.chip}>
                          <SvgIcon name="briefcase" className="h-3.5 w-3.5" />
                          {job.jobType}
                        </span>
                      )}

                      {job.workMode && (
                        <span className={UI.chip}>
                          <SvgIcon name="building" className="h-3.5 w-3.5" />
                          {job.workMode}
                        </span>
                      )}

                      {job.vacancies && (
                        <span className={UI.chip}>
                          <SvgIcon name="users" className="h-3.5 w-3.5" />
                          {job.vacancies} Vacancies
                        </span>
                      )}
                       {job.willingToRelocate && (
      <span className="rounded-full border border-[#d7e6f5] bg-[#eef5fc] px-3 py-1 text-xs font-semibold text-[#2e66a6]">
        {getRelocationDisplayLabel(job.willingToRelocate)}
      </span>
    )}
                    </div>

                    <div className="mt-3 space-y-1 text-xs text-[#6b7280]">
                      <p>{formatPostedRelative(job.createdAt)}</p>
                      {job.applicationDeadline && <p>Application deadline is on {formatFullDate(job.applicationDeadline)}</p>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <TopMetricCard icon="money" title="Salary" value={formatSalary(job.salaryMin, job.salaryMax)} isPeso />
            <TopMetricCard icon="clock" title="Experience" value={job.experienceLevel || 'No experience required'} />
            <TopMetricCard
              icon="graduation"
              title="Educational Requirements"
              value={job.educationLevel || 'Not specified'}
            />
            <TopMetricCard icon="external" title="Website Company URL" value={companyInfo?.companyWebsite || 'N/A'} />
          </div>

          <div className="mb-5">
            <div className={`${UI.sectionCard} p-5 sm:p-6`}>
              <SectionHeader icon="file" title="Job Description" />
              <div className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[#4b5563] sm:text-[15px]">
                {job.description || 'No description provided.'}
              </div>
            </div>
          </div>

          <div className="mb-5">
            <div className={`${UI.sectionCard} p-5 sm:p-6`}>
              <SectionHeader icon="tools" title="Qualification" />
              <div className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[#4b5563] sm:text-[15px]">
                {job.requirements || 'No requirements provided.'}
              </div>
            </div>
          </div>

          <div className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.1fr)_340px]">
            <div className={`${UI.sectionCard} p-5 sm:p-6`}>
              <SectionHeader icon="briefcase" title="Required Skills" />
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {requiredSkills.length > 0 ? (
                  requiredSkills.map((skill, idx) => (
                    <div key={`${skill}-${idx}`} className={UI.skillChip}>
                      {skill}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[#6b7280]">No required skills listed.</p>
                )}
              </div>
            </div>

            <div className={`${UI.sectionCard} overflow-hidden`}>
              <div className="overflow-hidden rounded-t-2xl">
                {getJobCoordinates(job) ? (
                  <StaticLocationMap job={job} heightClass="h-[160px]" />
                ) : job.locationImage ? (
                  <img
                    src={`https://phinmaau-job-portal-atlas.onrender.com${job.locationImage}`}
                    alt="Work location"
                    className="h-[160px] w-full object-cover"
                  />
                ) : (
                  <div className="flex h-[160px] items-center justify-center bg-[#eef2f7] text-[#9ca3af]">
                    <SvgIcon name="location" className="h-8 w-8" />
                  </div>
                )}
              </div>

              <div className="border-t border-[#d9dbe3] px-4 py-3">
                <div className="flex items-start gap-2 text-[#374151]">
                  <SvgIcon name="location" className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  {buildWorkLocationUrl(job) ? (
                    <a
                      href={buildWorkLocationUrl(job)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`text-sm font-medium text-[#2e66a6] hover:underline ${UI.ring} rounded`}
                      title="Open work location in OpenStreetMap"
                    >
                      {formatLocationDisplay(job.location)}
                    </a>
                  ) : (
                    <p className="text-sm">{formatLocationDisplay(job.location)}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className={`${UI.sectionCard} p-5 sm:p-6`}>
              <SectionHeader icon="briefcase" title="Perks and Benefits" />
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {perksAndBenefitsList.length > 0 ? (
                  perksAndBenefitsList.map((benefit, idx) => (
                    <div key={`${benefit}-${idx}`} className={UI.skillChip}>
                      {benefit}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[#6b7280]">No perks and benefits listed.</p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-5">
            <ApplicantList applicants={applicants} formatFullDate={formatFullDate} navigate={navigate} />
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminJobView;