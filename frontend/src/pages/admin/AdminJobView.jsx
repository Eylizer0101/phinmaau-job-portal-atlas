import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../../services/api';
import AdminLayout from '../../layouts/AdminLayout';

const cn = (...classes) => classes.filter(Boolean).join(' ');


const sanitizeRichTextHtml = (value = '') => {
  const raw = String(value || '').trim();
  if (!raw) return '';

  if (typeof window === 'undefined' || typeof window.DOMParser === 'undefined') {
    return raw
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\r?\n/g, '<br>');
  }

  const containsHtml = /<\/?[a-z][\s\S]*>/i.test(raw);
  const source = containsHtml
    ? raw
    : raw
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\r?\n/g, '<br>');

  const parser = new window.DOMParser();
  const doc = parser.parseFromString(source, 'text/html');

  doc
    .querySelectorAll(
      'script, style, iframe, object, embed, form, input, button, textarea, select, option, link, meta, base'
    )
    .forEach((node) => node.remove());

  doc.body.querySelectorAll('*').forEach((element) => {
    [...element.attributes].forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const rawValue = String(attribute.value || '').trim();
      const valueText = rawValue.toLowerCase();

      if (name === 'style') {
        const safeStyles = rawValue
          .split(';')
          .map((rule) => rule.trim())
          .filter(Boolean)
          .map((rule) => {
            const separatorIndex = rule.indexOf(':');
            if (separatorIndex < 0) return '';

            const property = rule.slice(0, separatorIndex).trim().toLowerCase();
            const propertyValue = rule.slice(separatorIndex + 1).trim().toLowerCase();

            if (
              property === 'text-align' &&
              ['left', 'center', 'right', 'justify'].includes(propertyValue)
            ) {
              return `text-align: ${propertyValue}`;
            }

            if (property === 'margin-left') {
              const match = propertyValue.match(/^(\d+(?:\.\d+)?)(px|em|rem)$/);
              if (!match) return '';

              const amount = Number(match[1]);
              const unit = match[2];
              const maximum = unit === 'px' ? 160 : 10;

              if (Number.isFinite(amount) && amount >= 0 && amount <= maximum) {
                return `margin-left: ${amount}${unit}`;
              }
            }

            return '';
          })
          .filter(Boolean);

        if (safeStyles.length) {
          element.setAttribute('style', safeStyles.join('; '));
        } else {
          element.removeAttribute('style');
        }

        return;
      }

      if (
        name.startsWith('on') ||
        name === 'srcdoc' ||
        name === 'class' ||
        ((name === 'href' || name === 'src') &&
          (valueText.startsWith('javascript:') || valueText.startsWith('data:text/html')))
      ) {
        element.removeAttribute(attribute.name);
      }
    });

    if (element.hasAttribute('align')) {
      const alignment = String(element.getAttribute('align') || '').toLowerCase();
      if (['left', 'center', 'right', 'justify'].includes(alignment)) {
        element.style.textAlign = alignment;
      }
      element.removeAttribute('align');
    }

    if (element.tagName === 'A') {
      element.setAttribute('target', '_blank');
      element.setAttribute('rel', 'noopener noreferrer');
    }
  });

  return doc.body.innerHTML;
};

const RichTextContent = ({ value, fallback }) => {
  const sanitizedHtml = useMemo(
    () => sanitizeRichTextHtml(value || fallback || ''),
    [value, fallback]
  );

  return (
    <div
      className={[
        'break-words',
        '[&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0',
        '[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6',
        '[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6',
        '[&_li]:my-1',
        '[&_h1]:my-3 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:leading-tight',
        '[&_h2]:my-3 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:leading-tight',
        '[&_strong]:font-bold [&_b]:font-bold',
        '[&_em]:italic [&_i]:italic [&_u]:underline',
        '[&_a]:text-[#2e66a6] [&_a]:underline',
      ].join(' ')}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
};

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

  return String(value || '').trim() || 'Relocation preference not specified';
};

const normalizeExternalUrl = (value = '') => {
  const cleanValue = String(value || '').trim();
  if (!cleanValue || cleanValue.toLowerCase() === 'n/a') return '';
  return /^https?:\/\//i.test(cleanValue) ? cleanValue : `https://${cleanValue}`;
};

const UI = {
  page: 'min-h-screen bg-[#f8fafc]',
  container: 'mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8',
  card: 'w-full rounded-2xl border border-[#e5e7eb] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)]',
  sectionCard: 'w-full rounded-xl border border-[#e5e7eb] bg-white shadow-[0_4px_16px_rgba(15,23,42,0.04)]',
  metricCard: 'h-full min-h-[96px] rounded-xl border border-[#d9e2ec] bg-white px-4 py-4 shadow-[0_4px_14px_rgba(15,23,42,0.08)]',
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
  return v || 'Location not specified';
};

const getJobCoordinates = (jobData) => {
  const rawLat = jobData?.locationLatitude;
  const rawLng = jobData?.locationLongitude;

  if (
    rawLat === null ||
    rawLat === undefined ||
    rawLat === '' ||
    rawLng === null ||
    rawLng === undefined ||
    rawLng === ''
  ) {
    return null;
  }

  const lat = Number(rawLat);
  const lng = Number(rawLng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) < 0.0001 && Math.abs(lng) < 0.0001) return null;

  return { lat, lng };
};

const buildWorkLocationUrl = (jobData) => {
  const coords = getJobCoordinates(jobData);
  if (coords) {
    return `https://www.openstreetmap.org/?mlat=${coords.lat}&mlon=${coords.lng}#map=17/${coords.lat}/${coords.lng}`;
  }

  const locationText = formatLocationDisplay(jobData?.location);
  if (!locationText || locationText === 'Location not specified') return '';

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

  if (
    cleanAddress &&
    cleanAddress !== 'Location not specified' &&
    cleanAddress !== 'Work address not specified'
  ) {
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

const TopMetricCard = ({ icon, title, value, isPeso = false, href = '' }) => (
  <div className={`${UI.metricCard} min-w-0`}>
    <div className="flex h-full min-w-0 items-start gap-3">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-[#d9dbe3] bg-[#f9fafb] text-[#6b7280]">
        {isPeso ? <span className="text-sm font-bold">₱</span> : <SvgIcon name={icon} className="h-4 w-4" />}
      </div>

      <div className="min-w-0">
        <p className={UI.label}>{title}</p>
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={`mt-1.5 block break-all text-[15px] font-semibold leading-6 text-[#2e66a6] hover:underline ${UI.ring} rounded`}
            title={`Open ${title}`}
          >
            {value}
          </a>
        ) : (
          <p className={UI.value}>{value}</p>
        )}
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

const AdminJobView = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isArchivedView = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return Boolean(location.state?.isArchivedView) || params.get('archive') === '1';
  }, [location.search, location.state]);

  const backPath = location.state?.backPath || (isArchivedView ? '/admin/archive' : '/admin/users');
  const backLabel = location.state?.backLabel || (isArchivedView ? 'Archive' : 'Back');

  const handleBack = () => {
    navigate(backPath);
  };

  const [job, setJob] = useState(null);
  const [companyInfo, setCompanyInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [applicants, setApplicants] = useState([]);

  const applicantPreview = useMemo(() => applicants.slice(0, 3), [applicants]);

  const getApplicantImage = useCallback((application) => {
    const value =
      application?.jobseeker?.profileImage ||
      application?.jobseeker?.jobSeekerProfile?.profileImage ||
      '';

    if (!value) return '';

    const cleanValue = String(value).trim();
    if (/^https?:\/\//i.test(cleanValue) || cleanValue.startsWith('data:') || cleanValue.startsWith('blob:')) {
      return cleanValue;
    }

    return cleanValue.startsWith('/')
      ? `https://phinmaau-job-portal-atlas.onrender.com${cleanValue}`
      : `https://phinmaau-job-portal-atlas.onrender.com/${cleanValue}`;
  }, []);

  const getApplicantName = useCallback((application) => {
    const person = application?.jobseeker || {};
    return (
      person.fullName ||
      [person.firstName, person.middleName, person.lastName]
        .map((part) => String(part || '').trim())
        .filter(Boolean)
        .join(' ') ||
      'Applicant'
    );
  }, []);

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
      month: 'long',
      day: 'numeric',
    });
  }, []);

  const formatArchivedDate = useCallback((dateString) => {
    if (!dateString) return 'Not specified';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return 'Not specified';
    return date.toLocaleDateString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, []);

  const fetchJobDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const response = await api.get(
        isArchivedView ? `/admin/archive/job/${jobId}` : `/jobs/${jobId}`
      );

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
  }, [isArchivedView, jobId]);

  const fetchJobApplicants = useCallback(async () => {
    if (isArchivedView) {
      setApplicants([]);
      return;
    }

    try {
      const response = await api.get(`/applications/job/${jobId}`);
      const rows = Array.isArray(response.data?.applications) ? response.data.applications : [];
      setApplicants(rows);
    } catch {
      setApplicants([]);
    }
  }, [isArchivedView, jobId]);

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

  const isLocationMissing = !String(job.location || '').trim();
  const isJobTypeMissing = !String(job.jobType || '').trim();
  const isWorkModeMissing = !String(job.workMode || '').trim();
  const isVacanciesMissing =
    job.vacancies === undefined ||
    job.vacancies === null ||
    job.vacancies === '' ||
    Number(job.vacancies) <= 0;
  const isRelocationMissing = !String(job.willingToRelocate || '').trim();

  const useSingleRowPlaceholders =
    isJobTypeMissing &&
    isWorkModeMissing &&
    isVacanciesMissing &&
    isRelocationMissing;

  const regularDetailChipClass =
    'inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-[#d7e6f5] bg-[#eef5fc] px-3 py-1 text-xs font-semibold text-[#2e66a6]';
  const compactPlaceholderChipClass =
    'inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-[#d7e6f5] bg-[#eef5fc] px-2 py-1 text-[10px] font-semibold text-[#2e66a6]';
  const regularRelocationChipClass =
    'shrink-0 whitespace-nowrap rounded-full border border-[#d7e6f5] bg-[#eef5fc] px-3 py-1 text-xs font-semibold text-[#2e66a6]';
  const compactRelocationChipClass =
    'shrink-0 whitespace-nowrap rounded-full border border-[#d7e6f5] bg-[#eef5fc] px-2 py-1 text-[10px] font-semibold text-[#2e66a6]';

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

                    <div className="mt-2 flex items-center gap-2 text-[#6b7280]">
                      <SvgIcon name="location" className="h-4 w-4" />
                      <span className={isLocationMissing ? 'text-[11px]' : 'text-sm'}>
                        {formatLocationDisplay(job.location)}
                      </span>
                    </div>

                    <div
                      className={cn(
                        'mt-4 flex flex-wrap gap-2',
                        useSingleRowPlaceholders && 'lg:flex-nowrap lg:gap-1.5'
                      )}
                    >
                      <span
                        className={
                          isJobTypeMissing
                            ? compactPlaceholderChipClass
                            : regularDetailChipClass
                        }
                      >
                        <SvgIcon
                          name="briefcase"
                          className={isJobTypeMissing ? 'h-3 w-3' : 'h-3.5 w-3.5'}
                        />
                        {String(job.jobType || '').trim() || 'Employment type not specified'}
                      </span>

                      <span
                        className={
                          isWorkModeMissing
                            ? compactPlaceholderChipClass
                            : regularDetailChipClass
                        }
                      >
                        <SvgIcon
                          name="building"
                          className={isWorkModeMissing ? 'h-3 w-3' : 'h-3.5 w-3.5'}
                        />
                        {String(job.workMode || '').trim() || 'Work mode not specified'}
                      </span>

                      <span
                        className={
                          isVacanciesMissing
                            ? compactPlaceholderChipClass
                            : regularDetailChipClass
                        }
                      >
                        <SvgIcon
                          name="users"
                          className={isVacanciesMissing ? 'h-3 w-3' : 'h-3.5 w-3.5'}
                        />
                        {!isVacanciesMissing
                          ? `${job.vacancies} ${Number(job.vacancies) === 1 ? 'Vacancy' : 'Vacancies'}`
                          : 'Number of vacancies not specified'}
                      </span>

                      <span
                        className={
                          isRelocationMissing
                            ? compactRelocationChipClass
                            : regularRelocationChipClass
                        }
                      >
                        {getRelocationDisplayLabel(job.willingToRelocate)}
                      </span>
                    </div>

                    <div className="mt-3 text-xs text-[#6b7280]">
                      <p>
                        {formatPostedRelative(job.createdAt)}
                        {job.applicationDeadline
                          ? ` and deadline of application is on ${formatFullDate(job.applicationDeadline)}`
                          : ' and no application deadline specified'}
                      </p>
                    </div>
                  </div>
                </div>

                {isArchivedView ? (
                  <div className="flex w-full justify-center lg:w-[420px] lg:self-center">
                    <div className="min-w-[220px] rounded-xl border border-[#d7e6f5] bg-[#f8fafc] px-5 py-4 text-center shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6b7280]">
                        Archived Date
                      </p>
                      <p className="mt-1.5 text-center text-base font-bold text-[#111827]">
                        {formatArchivedDate(job.archivedAt || job.updatedAt)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex w-full justify-start lg:w-auto lg:self-center lg:justify-end">
                    <button
                    type="button"
                    onClick={() =>
                      navigate(`/admin/jobs/${jobId}/applicants`, {
                        state: {
                          jobTitle: job.title,
                          backPath: `/admin/jobs/${jobId}`,
                          backLabel: 'Job Details',
                        },
                      })
                    }
                    className={`group flex w-full max-w-[285px] items-center gap-3 rounded-xl bg-[#2e66a6] px-4 py-3 text-left text-white shadow-md transition hover:bg-[#25598f] sm:w-auto ${UI.ring}`}
                    aria-label={`View ${applicants.length} ${applicants.length === 1 ? 'applicant' : 'applicants'}`}
                  >
                    <div className="flex -space-x-2">
                      {applicantPreview.length > 0 ? (
                        applicantPreview.map((application, index) => {
                          const image = getApplicantImage(application);
                          const applicantName = getApplicantName(application);

                          return image ? (
                            <img
                              key={application._id || index}
                              src={image}
                              alt={applicantName}
                              className="h-8 w-8 rounded-full border-2 border-white object-cover"
                            />
                          ) : (
                            <span
                              key={application._id || index}
                              className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-[#dbeafe] text-[10px] font-bold text-[#1d4ed8]"
                            >
                              {applicantName.charAt(0).toUpperCase()}
                            </span>
                          );
                        })
                      ) : (
                        <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-white/20">
                          <SvgIcon name="users" className="h-4 w-4" />
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold">
                        {applicants.length} {applicants.length === 1 ? 'Applicant' : 'Applicants'}
                      </p>
                      <p className="truncate text-[10px] text-blue-100">View submitted applications</p>
                    </div>

                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-white transition group-hover:translate-x-0.5">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 items-start gap-5">
            <div className="min-w-0 space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <TopMetricCard
                  icon="money"
                  title="Salary"
                  value={formatSalary(job.salaryMin, job.salaryMax)}
                  isPeso
                />
                <TopMetricCard
                  icon="clock"
                  title="Experience"
                  value={job.experienceLevel || 'No experience required'}
                />
                <TopMetricCard
                  icon="briefcase"
                  title="Employment Type"
                  value={String(job.jobType || '').trim() || 'Employment type not specified'}
                />
                <TopMetricCard
                  icon="external"
                  title="Website / Company URL"
                  value={companyInfo?.companyWebsite || 'N/A'}
                  href={normalizeExternalUrl(companyInfo?.companyWebsite)}
                />
              </div>

              <div className={`${UI.sectionCard} overflow-hidden`}>
                <div className="p-5 sm:p-6">
                  <SectionHeader icon="file" title="Job Description" />
                  <div className="mt-4 text-sm leading-7 text-[#4b5563] sm:text-[15px]">
                    <RichTextContent value={job.description} fallback="No job description provided" />
                  </div>
                </div>
              </div>

              <div className={`${UI.sectionCard} overflow-hidden`}>
                <div className="p-5 sm:p-6">
                  <SectionHeader icon="tools" title="Qualification" />
                  <div className="mt-4 text-sm leading-7 text-[#4b5563] sm:text-[15px]">
                    <RichTextContent value={job.requirements} fallback="No qualifications specified" />
                  </div>
                </div>
              </div>

              <section className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className={`${UI.sectionCard} p-5 sm:p-6`}>
                  <SectionHeader icon="tools" title="Required Skills" />
                  {requiredSkills.length > 0 ? (
                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {requiredSkills.map((skill, idx) => (
                        <div key={`${skill}-${idx}`} className={UI.skillChip}>
                          {skill}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className={`mt-4 ${UI.muted}`}>No skills specified</p>
                  )}
                </div>

                <div className={`${UI.sectionCard} overflow-hidden`}>
                  <div className="px-5 pt-5 sm:px-6 sm:pt-6">
                    <SectionHeader icon="location" title="Work Location" />
                  </div>
                  <div className="mt-4 overflow-hidden">
                    {getJobCoordinates(job) ? (
                      <StaticLocationMap job={job} heightClass="h-[180px]" />
                    ) : job.locationImage ? (
                      <img
                        src={`https://phinmaau-job-portal-atlas.onrender.com${job.locationImage}`}
                        alt="Work location"
                        className="h-[180px] w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-[180px] items-center justify-center bg-[#eef2f7] text-[#9ca3af]">
                        <SvgIcon name="location" className="h-8 w-8" />
                      </div>
                    )}
                  </div>
                  <div className="border-t border-[#e5e7eb] px-4 py-3 sm:px-5">
                    {buildWorkLocationUrl(job) ? (
                      <a
                        href={buildWorkLocationUrl(job)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`rounded text-xs font-medium text-[#2e66a6] hover:underline ${UI.ring}`}
                        title="Open work location in OpenStreetMap"
                      >
                        {String(job.location || '').trim() || 'Work address not specified'}
                      </a>
                    ) : (
                      <p className="text-xs text-[#6b7280]">
                        {String(job.location || '').trim() || 'Work address not specified'}
                      </p>
                    )}
                  </div>
                </div>
              </section>

              <div className={`${UI.sectionCard} overflow-hidden`}>
                <div className="border-b border-[#e5e7eb] px-5 py-4 sm:px-6">
                  <h3 className={UI.title}>Perks and Benefits</h3>
                </div>
                <div className="p-5 sm:p-6">
                  {perksAndBenefitsList.length > 0 ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      {perksAndBenefitsList.map((benefit, idx) => (
                        <div key={`${benefit}-${idx}`} className={UI.skillChip}>
                          {benefit}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[#6b7280]">No perks or benefits specified</p>
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminJobView;