import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import JobSeekerLayout from '../../../layouts/JobSeekerLayout';
import api from '../../../services/api';
import ApplyJobModal from '../../../components/jobseeker/ApplyJobModal';

/**
 * UPDATED:
 * ✅ Added icons on the 3 chips (job type, work mode, vacancies)
 * ✅ Added Posted Date in relative format under Share button (ex. Posted 2 weeks ago)
 * ✅ Combined Job Description and Qualification into one single card
 * ✅ Moved top metric cards inside left column only
 * ✅ Removed extra right-side info block
 * ✅ Preserved existing apply logic and overall UI
 * ✅ Added frontend save job integration
 * ✅ Apply Now now uses ApplyJobModal.jsx flow like JobSearch.jsx
 * ✅ Fixed modal success flow so it won't jump back to step 1 after submit
 * ✅ Fixed applied-check API route
 * ✅ Apply button now disables once already applied
 * ✅ Added clear applied helper text for UI/QA
 */



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
    return 'Location Fixed';
  }

  if (normalized === 'open to relocation if necessary') {
    return 'Possible to relocate';
  }

  return String(value || '').trim();
};

const getApiOrigin = () =>
  String(api?.defaults?.baseURL || process.env.REACT_APP_API_URL || 'https://phinmaau-job-portal-atlas.onrender.com/api').replace(/\/api\/?$/, '');

const resolveAssetUrl = (value = '') => {
  const cleanValue = String(value || '').trim();
  if (!cleanValue) return '';
  if (/^https?:\/\//i.test(cleanValue) || cleanValue.startsWith('data:') || cleanValue.startsWith('blob:')) {
    return cleanValue;
  }
  return cleanValue.startsWith('/')
    ? `${getApiOrigin()}${cleanValue}`
    : `${getApiOrigin()}/${cleanValue}`;
};

const normalizeExternalUrl = (value = '') => {
  const cleanValue = String(value || '').trim();
  if (!cleanValue || cleanValue.toLowerCase() === 'n/a') return '';
  return /^https?:\/\//i.test(cleanValue) ? cleanValue : `https://${cleanValue}`;
};

const getExperienceDisplayLabel = (value) => {
  const raw = String(value || '').trim();
  const normalized = raw.toLowerCase();

  if (!raw || normalized === 'no experience required') return 'No experience required';
  if (['less than 1 yr', 'less than 1 year', 'less than 1 yr exp', 'less than 1 year exp'].includes(normalized)) {
    return 'Less than 1 Yr Exp';
  }
  if (['1 year', '1 years', '2 year', '2 years', '3 year', '3 years', '1-3 years', '1-3 years exp'].includes(normalized)) {
    return '1-3 Years Exp';
  }
  if (['4 year', '4 years', '5 year', '5 years', '4-5 years', '4-5 years exp'].includes(normalized)) {
    return '4-5 Years Exp';
  }
  if (['6+ year', '6+ years', '6+ year exp', '6+ years exp'].includes(normalized)) {
    return '6+ Years Exp';
  }

  return raw;
};

const UI = {
  page: 'bg-white min-h-screen',

  container:
    'mx-auto w-full max-w-6xl px-4 pb-10 sm:px-6 lg:px-8',

  card: 'w-full rounded-2xl border border-[#e6edf5] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)]',
  metricCard: 'h-full min-h-[96px] rounded-xl border border-[#d9e2ec] bg-white px-4 py-4 shadow-[0_4px_14px_rgba(15,23,42,0.08)]',
  pad: 'p-5 sm:p-7 lg:p-8',
  insetPanel: 'w-full overflow-hidden rounded-xl border border-[#e6edf5] bg-white shadow-[0_4px_16px_rgba(15,23,42,0.04)]',
  insetHead: 'border-b border-[#e6edf5] bg-[#f8fafc] px-5 py-3.5 sm:px-6',
  insetBody: 'px-5 py-5 sm:px-6',

  grid: 'grid grid-cols-1 gap-5 items-start',
  left: 'min-w-0',
  right: 'min-w-0',

  h1: 'text-3xl sm:text-4xl font-extrabold tracking-tight text-black leading-tight',
  h2: 'text-lg sm:text-xl font-bold text-black',
  h3: 'text-base font-bold text-black',
  body: 'text-sm sm:text-base text-black/75 leading-relaxed',
  meta: 'text-sm text-black/70',
  caption: 'text-xs font-semibold uppercase tracking-wide text-black/50',
  label: 'text-sm font-semibold text-black',
  divider: 'border-t border-[#e6edf5]',
  ring:
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2 focus-visible:ring-offset-white',
  btnBase:
    'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none motion-reduce:transition-none motion-reduce:transform-none',
  btnSm: 'h-9 px-3 text-sm',
  btnMd: 'h-10 px-4 text-sm',
  btnLg: 'h-11 px-5 text-base',
  btnPrimary: 'bg-[#2e66a6] text-white hover:bg-[#25578f] active:bg-[#1f4b7c] shadow-[0_10px_22px_rgba(46,102,166,0.22)]',
  btnSecondary: 'bg-white text-black border border-[#d8e2ee] hover:border-[#2e66a6]/40 hover:bg-[#f7faff]',
  btnGhost: 'bg-transparent text-black/70 hover:bg-black/5',
  chip:
    'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border border-[#d8e2ee] bg-[#f7faff] text-black/80',
  badgeBase: 'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border',
  textarea:
    'w-full rounded-lg border border-black/20 bg-white px-4 py-3 text-sm text-black placeholder:text-black/40 resize-y',
  alertBase: 'rounded-xl border p-4',
  alertError: 'bg-red-50 border-red-200 text-black',
  alertSuccess: 'bg-[#2e66a6]/10 border-[#2e66a6]/30 text-black',
  srOnly: 'sr-only',
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

const SvgIcon = ({ name, className = 'w-4 h-4' }) => {
  switch (name) {
    case 'arrowLeft':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
        </svg>
      );
    case 'briefcase':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m-3 0h14a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9a2 2 0 012-2z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13h18" />
        </svg>
      );
    case 'location':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 21s7-4.438 7-11a7 7 0 10-14 0c0 6.562 7 11 7 11z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10a2 2 0 100-4 2 2 0 000 4z" />
        </svg>
      );
    case 'calendar':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      );
    case 'users':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M17 20h5v-1a4 4 0 00-4-4h-1M9 20H2v-1a4 4 0 014-4h1m7-4a4 4 0 10-8 0 4 4 0 008 0zm8 2a3 3 0 10-6 0 3 3 0 006 0z"
          />
        </svg>
      );
    case 'laptop':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M5 5h14a1 1 0 011 1v9H4V6a1 1 0 011-1z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M2.5 18h19M8 18h8"
          />
        </svg>
      );
    case 'building':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.6}
            d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3.75h1.5m-1.5 3.75h1.5m3-7.5H15m-1.5 3.75H15m-1.5 3.75H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21"
          />
        </svg>
      );
    case 'file':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      );
    case 'checkCircle':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
    case 'exclamation':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v4m0 4h.01" />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M10.29 3.86l-7.4 12.82A2 2 0 004.62 20h14.76a2 2 0 001.73-3.32l-7.4-12.82a2 2 0 00-3.42 0z"
          />
        </svg>
      );
    case 'calendarCheck':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 14l2 2 4-4" />
        </svg>
      );
    case 'tag':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M7 7h.01M3 11l8.586 8.586a2 2 0 002.828 0L21 13a2 2 0 000-2.828L13.414 3.586A2 2 0 0012 3H5a2 2 0 00-2 2v6z"
          />
        </svg>
      );
    case 'userTie':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 12a4 4 0 100-8 4 4 0 000 8z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 20a8 8 0 0116 0" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 14l2 2 2-2" />
        </svg>
      );
    case 'graduation':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l9-5-9-5-9 5 9 5z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 12v5c0 1.657 2.686 3 6 3s6-1.343 6-3v-5" />
        </svg>
      );
    case 'tools':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M14.7 6.3a4 4 0 01-5.657 5.657l-5.04 5.04a2 2 0 102.829 2.828l5.04-5.04A4 4 0 0114.7 6.3z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-3 3" />
        </svg>
      );
    case 'external':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 3h7v7" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 14L21 3" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 14v6a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6" />
        </svg>
      );
    case 'share':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 16V3" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 8l5-5 5 5" />
        </svg>
      );
    case 'bookmark':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M17 21l-5-3-5 3V5a2 2 0 012-2h6a2 2 0 012 2v16z"
          />
        </svg>
      );
    case 'bookmarkSolid':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 4.75A2.75 2.75 0 018.75 2h6.5A2.75 2.75 0 0118 4.75V21a.75.75 0 01-1.154.638L12 18.58l-4.846 3.058A.75.75 0 016 21V4.75z" />
        </svg>
      );
    case 'xmark':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 6l12 12M18 6L6 18" />
        </svg>
      );
    case 'clock':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'money':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M3 7.5A1.5 1.5 0 014.5 6h15A1.5 1.5 0 0121 7.5v9A1.5 1.5 0 0119.5 18h-15A1.5 1.5 0 013 16.5v-9z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9.25v5.5M14.25 10.5c0-.69-1.007-1.25-2.25-1.25s-2.25.56-2.25 1.25 1.007 1.25 2.25 1.25 2.25.56 2.25 1.25-1.007 1.25-2.25 1.25-2.25-.56-2.25-1.25" />
        </svg>
      );
    default:
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6l4 2" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
  }
};

const CompanyLogo = ({ src, name }) => {
  const [failed, setFailed] = useState(false);
  const initial = (name?.trim()?.[0] || 'C').toUpperCase();

  if (!src || failed) {
    return (
      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-center flex-shrink-0">
        <span className="font-bold text-lg sm:text-xl text-slate-600" aria-hidden="true">
          {initial}
        </span>
        <span className={UI.srOnly}>{name || 'Company'}</span>
      </div>
    );
  }

  return (
    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden border border-slate-200 bg-white flex-shrink-0">
      <img
        src={src}
        alt={`${name || 'Company'} logo`}
        className="w-full h-full object-cover object-center"
        onError={() => setFailed(true)}
        loading="lazy"
      />
    </div>
  );
};

const IconBadge = ({ icon }) => (
  <span className="w-11 h-11 rounded-2xl bg-[#2e66a6]/10 border border-[#2e66a6]/25 flex items-center justify-center flex-shrink-0 text-[#2e66a6]">
    <SvgIcon name={icon} className="w-5 h-5" />
  </span>
);

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
            className={`mt-1.5 block max-w-full truncate whitespace-nowrap text-[15px] font-semibold leading-6 text-[#2e66a6] hover:underline ${UI.ring} rounded`}
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

const BenefitItem = ({ children }) => (
  <div className="rounded-xl border border-[#e6edf5] bg-[#fdfefe] px-4 py-3 text-xs sm:text-sm text-black/70">
    {children}
  </div>
);

const Skeleton = () => (
  <div className={UI.page}>
    <div className={UI.container} aria-hidden="true">
      <div className="animate-pulse motion-reduce:animate-none space-y-6 pt-6">
        <div className="h-6 w-56 bg-black/5 rounded" />
        <div className="h-24 bg-black/5 rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-24 bg-black/5 rounded-2xl" />
          <div className="h-24 bg-black/5 rounded-2xl" />
          <div className="h-24 bg-black/5 rounded-2xl" />
        </div>
        <div className="h-96 bg-black/5 rounded-2xl" />
      </div>
    </div>
  </div>
);

const JobDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [job, setJob] = useState(null);
  const [companyInfo, setCompanyInfo] = useState(null);
  const [similarJobs, setSimilarJobs] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyingJob, setApplyingJob] = useState(null);
  const [applyModalInitialStep, setApplyModalInitialStep] = useState(1);

  const [hasApplied, setHasApplied] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState('');

  const [isSaved, setIsSaved] = useState(false);
  const [savingJob, setSavingJob] = useState(false);

  const [toast, setToast] = useState({ show: false, type: '', message: '' });

  const toastTimerRef = useRef(null);

  const sourcePage = location.state?.sourcePage || 'jobsearch';

  const companyId = useMemo(() => {
    const employer = job?.employer;
    const employerId = job?.employerId;

    if (typeof employer === 'string') return employer;
    if (employer?._id || employer?.id) return employer._id || employer.id;
    if (typeof employerId === 'string') return employerId;
    return employerId?._id || employerId?.id || '';
  }, [job]);

  const setToastWithAutoClear = useCallback((type, message, ms = 1800) => {
    setToast({ show: true, type, message });
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      setToast({ show: false, type: '', message: '' });
    }, ms);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  const handleBackButton = useCallback(() => {
    if (sourcePage === 'myapplications') navigate('/jobseeker/my-applications');
    else navigate('/jobseeker/job-search');
  }, [navigate, sourcePage]);

  const formatSalary = useCallback((min, max, hideSalary = false) => {
    if (hideSalary) return 'Salary Undisclosed';
    const hasMin = typeof min === 'number';
    const hasMax = typeof max === 'number';
    if (!hasMin && !hasMax) return 'Salary not specified';

    const fmt = (n) => Number(n).toLocaleString('en-PH');
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

  const formatApplicationDeadline = useCallback((dateString) => {
    if (!dateString) return '';

    const deadline = new Date(dateString);
    if (Number.isNaN(deadline.getTime())) return '';

    return deadline.toLocaleDateString('en-PH', {
      month: 'long',
      day: 'numeric',
    });
  }, []);

  const isJobActive = useCallback(() => {
    if (!job) return false;
    if (!job.isActive || !job.isPublished) return false;
    if (String(job.status || '').toLowerCase() === 'filled') return false;
    if (job.applicationDeadline && new Date(job.applicationDeadline) < new Date()) return false;
    return true;
  }, [job]);

  const fetchJobDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const response = await api.get(`/jobs/${id}`);

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
  }, [id]);

  const checkIfApplied = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await api.get(`/applications/job/${id}/check`);

      if (response.data.success) {
        setHasApplied(Boolean(response.data.hasApplied));
        if (response.data.application?.status) {
          setApplicationStatus(response.data.application.status);
        } else if (response.data.hasApplied) {
          setApplicationStatus('pending');
        }
      }
    } catch {
      // non-blocking
    }
  }, [id]);

  const checkIfSaved = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');

      if (!token || !userStr) {
        setIsSaved(false);
        return;
      }

      const user = JSON.parse(userStr);
      if (user.role !== 'jobseeker') {
        setIsSaved(false);
        return;
      }

      const response = await api.get(`/jobs/saved/check/${id}`);
      if (response.data?.success) {
        setIsSaved(Boolean(response.data.isSaved));
      }
    } catch {
      setIsSaved(false);
    }
  }, [id]);

  const fetchSimilarJobs = useCallback(
    async (category) => {
      try {
        if (!category) return;

        const response = await api.get('/jobs', {
          params: { category, limit: 4 },
        });

        let jobsData = [];
        if (response.data.success && response.data.jobs) jobsData = response.data.jobs;
        else if (Array.isArray(response.data)) jobsData = response.data;

        setSimilarJobs(jobsData.filter((j) => j._id !== id).slice(0, 3));
      } catch {
        // non-blocking
      }
    },
    [id]
  );

  useEffect(() => {
    fetchJobDetails();
    checkIfApplied();
    checkIfSaved();
  }, [fetchJobDetails, checkIfApplied, checkIfSaved]);

  useEffect(() => {
    if (job?.category) fetchSimilarJobs(job.category);
  }, [job?.category, fetchSimilarJobs]);

  useEffect(() => {
    if (!job) return;

    let reopenState = location.state?.reopenApplyModal ? location.state : null;

    if (!reopenState) {
      try {
        const stored = JSON.parse(sessionStorage.getItem('pendingApplyReopen') || 'null');
        if (stored?.reopenApplyModal) {
          reopenState = stored;
        }
      } catch {
        reopenState = null;
      }
    }

    if (!reopenState?.reopenApplyModal) return;

    const reopenStep = Number(reopenState?.reopenApplyStep) === 3 ? 3 : 1;
    const stateJob = reopenState?.applyJob || {};

    setApplyModalInitialStep(reopenStep);
    setApplyingJob({
      ...job,
      ...stateJob,
      _id: stateJob?._id || stateJob?.id || job?._id || job?.id,
      id: stateJob?.id || stateJob?._id || job?.id || job?._id,
      title: stateJob?.title || job?.title || '',
      companyName: stateJob?.companyName || job?.companyName || '',
      location: stateJob?.location || job?.location || '',
    });
    setShowApplyModal(true);

    try {
      sessionStorage.removeItem('pendingApplyReopen');
      sessionStorage.removeItem('pendingApplyFlow');
    } catch {}

    navigate(location.pathname, { replace: true, state: { sourcePage } });
  }, [job, location.state, location.key, location.pathname, navigate, sourcePage]);

  const statusBadge = useMemo(() => {
    if (!hasApplied) return null;

    const status = (applicationStatus || 'pending').toLowerCase();
    const map = {
      pending: { cls: 'bg-black/5 border-black/20 text-slate-700', icon: 'clock', label: 'Pending' },
      'for interview': {
        cls: 'bg-[#2e66a6]/10 border-[#2e66a6]/30 text-black',
        icon: 'checkCircle',
        label: 'For Interview'
      },
      hired: { cls: 'bg-[#2e66a6]/10 border-[#2e66a6]/30 text-black', icon: 'checkCircle', label: 'Hired' },
      declined: { cls: 'bg-black/5 border-black/20 text-black', icon: 'exclamation', label: 'Declined' },
      withdrawn: { cls: 'bg-black/5 border-black/20 text-black', icon: 'exclamation', label: 'Withdrawn' },
      cancelled: { cls: 'bg-black/5 border-black/20 text-black', icon: 'exclamation', label: 'Cancelled' },
    };
    const picked = map[status] || map.pending;

    return (
      <span className={`${UI.badgeBase} ${picked.cls}`}>
        <SvgIcon name={picked.icon} className="w-3.5 h-3.5" />
        Applied ({picked.label})
      </span>
    );
  }, [hasApplied, applicationStatus]);

  const handleShareJob = useCallback(() => {
    const jobUrl = window.location.href;
    const shareText = `Check out this job: ${job?.title} at ${job?.companyName}`;

    if (navigator.share) {
      navigator.share({ title: job?.title, text: shareText, url: jobUrl });
      return;
    }

    navigator.clipboard
      .writeText(jobUrl)
      .then(() => setToastWithAutoClear('success', 'Job link copied to clipboard.'))
      .catch(() => setToastWithAutoClear('error', 'Failed to copy link. Please try again.'));
  }, [job, setToastWithAutoClear]);

  const handleSaveJob = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');

      if (!token || !userStr) {
        navigate('/login');
        return;
      }

      const user = JSON.parse(userStr);
      if (user.role !== 'jobseeker') {
        setToastWithAutoClear('error', 'Only job seekers can save jobs.');
        return;
      }

      if (!job?._id) {
        setToastWithAutoClear('error', 'Job data not found.');
        return;
      }

      setSavingJob(true);

      if (isSaved) {
        const response = await api.delete(`/jobs/saved/${job._id}`);
        if (response.data?.success) {
          setIsSaved(false);
          setToastWithAutoClear('success', 'Job removed from bookmarks.');
        } else {
          setToastWithAutoClear('error', response.data?.message || 'Failed to remove saved job.');
        }
      } else {
        const response = await api.post(`/jobs/saved/${job._id}`);
        if (response.data?.success) {
          setIsSaved(true);
          setToastWithAutoClear('success', 'Job saved successfully.');
        } else {
          setToastWithAutoClear('error', response.data?.message || 'Failed to save job.');
        }
      }
    } catch (err) {
      setToastWithAutoClear('error', err.response?.data?.message || 'Failed to update saved job.');
    } finally {
      setSavingJob(false);
    }
  }, [navigate, job, isSaved, setToastWithAutoClear]);

  const handleApplyClick = useCallback(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (!token || !userStr) {
      navigate('/login');
      return;
    }

    try {
      const user = JSON.parse(userStr);

      if (user.role !== 'jobseeker') {
        setToastWithAutoClear('error', 'Only job seekers can apply for jobs.');
        return;
      }

      const verificationStatus = user.jobSeekerProfile?.verificationStatus;

      if (verificationStatus !== 'verified') {
        let message = 'Your account is not verified. ';
        if (verificationStatus === 'pending') {
          message += 'Your verification is pending approval from admin.';
        } else if (verificationStatus === 'rejected') {
          message += 'Your verification was rejected. Please contact admin.';
        } else {
          message += 'Please complete verification before applying.';
        }
        setToastWithAutoClear('error', message);
        return;
      }

      if (!isJobActive()) {
        setToastWithAutoClear('error', String(job?.status || '').toLowerCase() === 'filled' ? 'The vacancy is already full.' : 'This job is no longer accepting applications.');
        return;
      }

      if (hasApplied) {
        setToastWithAutoClear('success', 'Application already submitted.');
        return;
      }

      setApplyModalInitialStep(1);
      setApplyingJob(job);
      setShowApplyModal(true);
    } catch {
      setToastWithAutoClear('error', 'Error checking user information.');
    }
  }, [navigate, isJobActive, hasApplied, job, setToastWithAutoClear]);

  const perksAndBenefitsList = useMemo(() => {
    const perks = Array.isArray(job?.perksAndBenefits) ? job.perksAndBenefits.filter(Boolean) : [];
    const other = String(job?.otherBenefits || '').trim();
    return other ? [...perks, other] : perks;
  }, [job?.perksAndBenefits, job?.otherBenefits]);

  const jobActive = isJobActive();
  const isApplyDisabled = hasApplied || (!jobActive && !hasApplied);

  const primaryCtaLabel = hasApplied
    ? 'Already Applied'
    : jobActive
    ? 'Apply Now'
    : String(job?.status || '').toLowerCase() === 'filled'
    ? 'Vacancy Full'
    : 'Application Closed';

  const primaryCtaClassName = hasApplied
    ? 'bg-[#eef4ff] text-[#2e66a6] border border-[#2e66a6]/25'
    : !jobActive && !hasApplied
    ? 'bg-black/5 text-black/50 border border-black/10'
    : UI.btnPrimary;

  const applyHelperText = hasApplied
    ? ''
    : !jobActive
    ? (String(job?.status || '').toLowerCase() === 'filled' ? 'The vacancy is already full.' : 'This job is no longer accepting applications')
    : '';

  if (loading) {
    return (
      <JobSeekerLayout>
        <Skeleton />
      </JobSeekerLayout>
    );
  }

  if (error) {
    return (
      <JobSeekerLayout>
        <div className={UI.page}>
          <div className={UI.container}>
            <div className={`${UI.card} ${UI.pad} text-center`}>
              <div className="mx-auto w-14 h-14 rounded-2xl bg-black/5 border border-black/10 flex items-center justify-center mb-4 text-slate-500">
                <SvgIcon name="exclamation" className="w-7 h-7" />
              </div>

              <h1 className={UI.h2}>{error}</h1>
              <p className={`mt-2 ${UI.body}`}>The job you're looking for might have been removed or is no longer available.</p>

              <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                <button onClick={handleBackButton} className={`${UI.btnBase} ${UI.btnMd} ${UI.btnSecondary} ${UI.ring}`} type="button">
                  <SvgIcon name="arrowLeft" className="w-4 h-4" />
                  Go Back
                </button>

                <button
                  onClick={() => navigate('/jobseeker/job-search')}
                  className={`${UI.btnBase} ${UI.btnMd} ${UI.btnPrimary} ${UI.ring}`}
                  type="button"
                >
                  Browse Jobs
                </button>
              </div>
            </div>
          </div>
        </div>
      </JobSeekerLayout>
    );
  }

  if (!job) return null;

  return (
    <JobSeekerLayout>
      <>
        <div className={UI.page}>
          <div className="relative left-1/2 right-1/2 w-screen -ml-[50vw] -mr-[50vw] -mt-24 h-[240px] sm:h-[300px] lg:h-[330px] overflow-hidden bg-white">
            <img
              src={resolveAssetUrl(job?.employerDetails?.coverPhoto) || '/images/jobback.png'}
              alt={`${job.companyName || 'Company'} cover banner`}
              className="w-full h-full object-cover object-center"
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = '/images/jobback.png';
              }}
            />
          </div>

          <div className={`${UI.container} -mt-16 sm:-mt-20 lg:-mt-24 relative z-10`}>
           <div className="absolute top-[-55px] left-4 sm:left-6 lg:left-8 z-30">
              <button
                onClick={handleBackButton}
               className={`${UI.btnBase} ${UI.btnSm} ${UI.btnSecondary} ${UI.ring} shadow-sm bg-white`}
                type="button"
              >
                <SvgIcon name="arrowLeft" className="w-4 h-4" />
                Back to {sourcePage === 'myapplications' ? 'My Applications' : 'Job Search'}
              </button>
            </div>

            {toast.show && (
              <div
                className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none"
                role={toast.type === 'error' ? 'alert' : 'status'}
                aria-live="polite"
              >
                <div
                  className={`inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold shadow-lg border ${
                    toast.type === 'error'
                      ? 'border-red-200 bg-red-100 text-red-700'
                      : 'border-green-200 bg-green-100 text-green-700'
                  }`}
                >
                  {toast.type === 'error' ? (
                    <SvgIcon name="exclamation" className="w-4 h-4" />
                  ) : (
                    <SvgIcon name="checkCircle" className="w-4 h-4" />
                  )}
                  <span>{toast.message}</span>
                </div>
              </div>
            )}

            <div className={`${UI.card} ${UI.pad} mb-6 -mt-10 min-h-[210px] sm:min-h-[225px] lg:min-h-[240px] flex items-center`}>
              <div className="flex w-full flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex items-start gap-4 min-w-0 flex-1">
                  <CompanyLogo src={job.companyLogo} name={job.companyName} />

                  <div className="min-w-0 flex-1">
                <h1
                      className={`${UI.h1} overflow-hidden text-ellipsis sm:truncate`}
                      style={{ display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2 }}
                      title={job.title}
                    >
                      {job.title}
                    </h1>

                    <div className="mt-2">
                      <div className={`inline-flex items-center gap-2 ${UI.meta} min-w-0`}>
                        <span className="text-black/60">
                          <SvgIcon name="building" className="w-4 h-4" />
                        </span>
                        {companyId ? (
                          <button
                            type="button"
                            onClick={() =>
                              navigate(`/jobseeker/company-details/${companyId}`, {
                                state: {
                                  sourcePage: 'jobdetails',
                                  returnTo: `${location.pathname}${location.search}`,
                                },
                              })
                            }
                            className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[#2e66a6] hover:text-[#1f4f86] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6]/30 rounded-sm"
                            style={{ borderBottom: '1px solid currentColor', paddingBottom: '1px' }}
                            title={`View ${job.companyName || 'company'} details`}
                          >
                            {job.companyName}
                          </button>
                        ) : (
                          <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap" title={job.companyName}>
                            {job.companyName}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-1">
                      <div className={`inline-flex items-center gap-2 ${UI.caption}`}>
                        <span className="text-black/60">
                          <SvgIcon name="location" className="w-4 h-4" />
                        </span>
                        <span>{formatLocationDisplay(job.location)}</span>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {job.jobType && (
                        <span className={UI.chip}>
                          <span className="text-black/60">
                            <SvgIcon name="briefcase" className="w-3.5 h-3.5" />
                          </span>
                          {job.jobType}
                        </span>
                      )}

                      {job.workMode && (
                        <span className={UI.chip}>
                          <span className="text-black/60">
                            <SvgIcon name="laptop" className="w-3.5 h-3.5" />
                          </span>
                          {job.workMode}
                        </span>
                      )}

                      {job.vacancies && (
                        <span className={UI.chip}>
                          <span className="text-black/60">
                            <SvgIcon name="users" className="w-3.5 h-3.5" />
                          </span>
                          {job.vacancies} Vacancies
                        </span>
                      )}

                      {job.willingToRelocate && (
                        <span className={UI.chip}>
                          <span className="text-black/60">
                            <SvgIcon name="location" className="w-3.5 h-3.5" />
                          </span>
                          {getRelocationDisplayLabel(job.willingToRelocate)}
                        </span>
                      )}
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-black/80">
                      <SvgIcon name="clock" className="h-4 w-4 flex-shrink-0" />
                      <span>
                        {formatPostedRelative(job.createdAt)}
                        {job.applicationDeadline
                          ? ` and deadline of application is on ${formatApplicationDeadline(job.applicationDeadline)}`
                          : ''}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 w-full lg:w-[260px] shrink-0">
                  <button
                    onClick={handleApplyClick}
                    disabled={isApplyDisabled}
                    className={`${UI.btnBase} ${isApplyDisabled ? primaryCtaClassName : UI.btnPrimary} ${UI.ring} ${UI.btnLg} w-full`}
                    type="button"
                    aria-disabled={isApplyDisabled}
                    title={hasApplied ? 'You already applied for this job' : !jobActive ? 'This job is no longer accepting applications' : 'Apply now'}
                  >
                    {primaryCtaLabel}
                  </button>

                  {applyHelperText ? (
                    <p className="text-xs text-center font-medium text-black/55">
                      {applyHelperText}
                    </p>
                  ) : null}

                  <div className="grid w-full grid-cols-2 gap-2">
                    <button
                      onClick={handleSaveJob}
                      disabled={savingJob}
                      className={`${UI.btnBase} ${UI.btnMd} ${
                        isSaved ? 'bg-[#eef4ff] text-[#2e66a6] border border-[#2e66a6]/25' : UI.btnSecondary
                      } ${UI.ring} w-full min-w-0`}
                      type="button"
                    >
                      <SvgIcon name={isSaved ? 'bookmarkSolid' : 'bookmark'} className="w-4 h-4" />
                      {savingJob ? 'Saving...' : isSaved ? 'Saved' : 'Save'}
                    </button>

                    <button
                      onClick={handleShareJob}
                      className={`${UI.btnBase} ${UI.btnMd} ${UI.btnSecondary} ${UI.ring} w-full min-w-0`}
                      type="button"
                    >
                      <SvgIcon name="share" className="w-4 h-4" />
                      Share
                    </button>
                  </div>

                
                </div>
              </div>
            </div>

            <div className={UI.grid}>
                <div className={UI.left}>
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      <TopMetricCard
                        icon="money"
                        title="Salary"
                        value={formatSalary(job.salaryMin, job.salaryMax, job.hideSalary)}
                        isPeso
                      />
                      <TopMetricCard
                        icon="clock"
                        title="Experience"
                        value={getExperienceDisplayLabel(job.experienceLevel)}
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

                    <div className={UI.insetPanel}>
                      <div className={UI.insetBody}>
                        <section>
                          <div className="flex items-center gap-3 pt-2">
                            <IconBadge icon="file" />
                            <div className="min-w-0">
                              <h3 className={UI.h3}>Job Description</h3>
                            </div>
                          </div>
                          <div className="mt-4 text-sm leading-relaxed text-black/70 sm:text-base">
                            <RichTextContent value={job.description} fallback="No description provided." />
                          </div>
                        </section>
                      </div>
                    </div>

                    <div className={UI.insetPanel}>
                      <div className={UI.insetBody}>
                        <section>
                          <div className="flex items-center gap-3 pt-2">
                            <IconBadge icon="tools" />
                            <div className="min-w-0">
                              <h3 className={UI.h3}>Qualification</h3>
                            </div>
                          </div>
                          <div className="mt-4 text-sm leading-relaxed text-black/70 sm:text-base">
                            <RichTextContent value={job.requirements} fallback="No requirements provided." />
                          </div>
                        </section>
                      </div>
                    </div>

                    <section className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
                      <div className={UI.insetPanel}>
                        <div className={UI.insetHead}>
                          <p className="text-sm font-semibold text-black">Required Skills</p>
                        </div>
                        <div className={UI.insetBody}>
                          {Array.isArray(job.skillsRequired) && job.skillsRequired.length > 0 ? (
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                              {job.skillsRequired.map((skill, idx) => (
                                <BenefitItem key={`${skill}-${idx}`}>{skill}</BenefitItem>
                              ))}
                            </div>
                          ) : (
                            <p className={UI.meta}>No skills specified</p>
                          )}
                        </div>
                      </div>

                      <div className={UI.insetPanel}>
                        <div className={UI.insetHead}>
                          <p className="text-sm font-semibold text-black">Work Location</p>
                        </div>
                        <div className="overflow-hidden">
                          {getJobCoordinates(job) ? (
                            <StaticLocationMap job={job} heightClass="h-[180px]" />
                          ) : job.locationImage ? (
                            <img
                              src={resolveAssetUrl(job.locationImage)}
                              alt="Work location"
                              className="h-[180px] w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-[180px] items-center justify-center bg-black/5 text-black/40">
                              <SvgIcon name="location" className="h-7 w-7" />
                            </div>
                          )}
                        </div>
                        <div className="border-t border-[#e6edf5] px-4 py-3">
                          {buildWorkLocationUrl(job) ? (
                            <a
                              href={buildWorkLocationUrl(job)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`rounded text-xs font-medium text-[#2e66a6] hover:underline ${UI.ring}`}
                              title="Open work location in OpenStreetMap"
                            >
                              {formatLocationDisplay(job.location)}
                            </a>
                          ) : (
                            <p className="text-xs text-black/65">{formatLocationDisplay(job.location)}</p>
                          )}
                        </div>
                      </div>
                    </section>

                    <div className={UI.insetPanel}>
                      <div className={UI.insetHead}>
                        <p className="text-sm font-semibold text-black">Perks and Benefits</p>
                      </div>
                      <div className={UI.insetBody}>
                        {perksAndBenefitsList.length > 0 ? (
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            {perksAndBenefitsList.map((benefit, idx) => (
                              <BenefitItem key={`${benefit}-${idx}`}>{benefit}</BenefitItem>
                            ))}
                          </div>
                        ) : (
                          <p className={UI.meta}>No perks or benefits specified</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            <div className={UI.srOnly} aria-live="polite" aria-atomic="true">
              {toast.show ? toast.message : ''}
            </div>
          </div>
        </div>
        <ApplyJobModal
          isOpen={showApplyModal}
          initialStep={applyModalInitialStep}
          onClose={() => {
            setShowApplyModal(false);
            setApplyingJob(null);
            setApplyModalInitialStep(1);
            fetchJobDetails();
            checkIfApplied();
          }}
          job={applyingJob}
          onApplicationSubmitted={() => {
            setHasApplied(true);
            setApplicationStatus('pending');
          }}
        />
      </>
    </JobSeekerLayout>
  );
};

export default JobDetails;
