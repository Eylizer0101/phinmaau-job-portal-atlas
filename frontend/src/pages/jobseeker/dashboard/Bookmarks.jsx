// src/pages/jobseeker/dashboard/Bookmarks.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import JobSeekerLayout from '../../../layouts/JobSeekerLayout';
import api from '../../../services/api';
import ApplyJobModal from '../../../components/jobseeker/ApplyJobModal';



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

  return String(value || '').trim() || 'Location Fixed';
};

const getApiOrigin = () =>
  String(api?.defaults?.baseURL || process.env.REACT_APP_API_URL || 'https://phinmaau-job-portal-atlas.onrender.com/api').replace(/\/api\/?$/, '');

const UI = {
  page: 'bg-[#FFFFFF] min-h-screen',
  container:
    'relative left-1/2 right-1/2 w-[min(96vw,1440px)] max-w-none -translate-x-1/2 px-4 sm:px-6 lg:px-8 pb-10',
  card: 'bg-[#FFFFFF] border border-black/10 rounded-2xl shadow-sm w-full',
  pad: 'p-5 sm:p-6 lg:p-7',
  insetPanel: 'rounded-2xl border border-black/10 overflow-hidden bg-[#FFFFFF] shadow-sm w-full',
  insetHead: 'px-5 sm:px-6 py-4 bg-[#FFFFFF] border-b border-black/10',
  insetBody: 'px-5 sm:px-6 py-6',
  grid: 'grid grid-cols-1 xl:grid-cols-[340px_minmax(0,1fr)] gap-6 xl:gap-7',
  detailsGrid: 'grid grid-cols-1 gap-6',
  metricsGrid: 'grid grid-cols-1 md:grid-cols-3 gap-4',
  lowerGrid: 'grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-6 xl:gap-7',
  h1: 'text-[28px] sm:text-[34px] font-bold tracking-tight text-[#000000] leading-tight',
  h2: 'text-base sm:text-lg font-semibold text-[#000000]',
  h3: 'text-sm font-semibold text-[#000000]',
  body: 'text-sm sm:text-[15px] text-black/70 leading-6',
  meta: 'text-sm text-black/70',
  caption: 'text-xs font-medium tracking-wide text-black/55',
  label: 'text-sm font-semibold text-[#000000]',
  divider: 'border-t border-black/10',
  ring:
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2 focus-visible:ring-offset-white',
  btnBase:
    'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors duration-150 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none motion-reduce:transition-none motion-reduce:transform-none',
  btnSm: 'h-10 px-3.5 text-sm',
  btnMd: 'h-11 px-4 text-sm',
  btnLg: 'h-12 px-5 text-base',
  btnPrimary: 'bg-[#2e66a6] text-white hover:bg-[#27598f] active:bg-[#214d7c] shadow-sm',
  btnSecondary: 'bg-[#FFFFFF] text-[#000000] border border-black/20 hover:bg-black/5',
  btnGhost: 'bg-transparent text-black/70 hover:bg-black/5',
  chip:
    'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border border-black/10 bg-[#FFFFFF] text-black/80',
  alertBase: 'rounded-2xl border p-4 shadow-sm',
  alertError: 'bg-black/5 border-black/15 text-[#000000]',
  alertSuccess: 'bg-[#2e66a6]/10 border-[#2e66a6]/20 text-[#000000]',
  badgeBase: 'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border',
  textarea:
    'w-full rounded-xl border border-black/20 bg-[#FFFFFF] px-4 py-3 text-sm text-[#000000] placeholder:text-black/40 resize-y',
  srOnly: 'sr-only',
  structureBg: 'bg-[#2e66a6]',
  structureSoft: 'bg-[#2e66a6]/8',
  structureBorder: 'border-[#2e66a6]/15',
  highlight: 'text-[#2e66a6]',
  tabBase: 'px-2 py-3 text-sm font-semibold border-b-2 transition-colors',
  tabActive: 'text-[#2e66a6] border-[#2e66a6]',
  tabInactive: 'text-black/50 border-transparent hover:text-black/70',
};

const SvgIcon = ({ name, className = 'w-4 h-4' }) => {
  switch (name) {
    case 'arrowLeft':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 19l-7-7 7-7" />
        </svg>
      );
    case 'building':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.75}
            d="M3 21h18M6 21V5a2 2 0 012-2h8a2 2 0 012 2v16M9 7h.01M9 11h.01M9 15h.01M12 7h.01M12 11h.01M12 15h.01M15 7h.01M15 11h.01M15 15h.01"
          />
        </svg>
      );
    case 'location':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.75}
            d="M12 21s7-4.438 7-11a7 7 0 10-14 0c0 6.562 7 11 7 11z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 10a2 2 0 100-4 2 2 0 000 4z" />
        </svg>
      );
    case 'briefcase':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.75}
            d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m-3 0h14a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9a2 2 0 012-2z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 13h18" />
        </svg>
      );
    case 'users':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.75}
            d="M17 20h5v-1a4 4 0 00-4-4h-1M9 20H2v-1a4 4 0 014-4h1m7-4a4 4 0 10-8 0 4 4 0 008 0zm8 2a3 3 0 10-6 0 3 3 0 006 0z"
          />
        </svg>
      );
    case 'bookmark':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.75}
            d="M17 21l-5-3-5 3V5a2 2 0 012-2h6a2 2 0 012 2v16z"
          />
        </svg>
      );
    case 'bookmarkFilled':
      return (
        <svg className={className} fill="currentColor" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.75}
            d="M17 21l-5-3-5 3V5a2 2 0 012-2h6a2 2 0 012 2v16z"
          />
        </svg>
      );
    case 'xmark':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M6 6l12 12M18 6L6 18" />
        </svg>
      );
    case 'clock':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'money':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.75}
            d="M3 7.5A1.5 1.5 0 014.5 6h15A1.5 1.5 0 0121 7.5v9A1.5 1.5 0 0119.5 18h-15A1.5 1.5 0 013 16.5v-9z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 9.25v5.5M14.25 10.5c0-.69-1.007-1.25-2.25-1.25s-2.25.56-2.25 1.25 1.007 1.25 2.25 1.25 2.25.56 2.25 1.25-1.007 1.25-2.25 1.25-2.25-.56-2.25-1.25" />
        </svg>
      );
    case 'graduation':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 14l9-5-9-5-9 5 9 5z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M6 12v5c0 1.657 2.686 3 6 3s6-1.343 6-3v-5" />
        </svg>
      );
    case 'file':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.75}
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
            strokeWidth={1.75}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
    case 'exclamation':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 9v4m0 4h.01" />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.75}
            d="M10.29 3.86l-7.4 12.82A2 2 0 004.62 20h14.76a2 2 0 001.73-3.32l-7.4-12.82a2 2 0 00-3.42 0z"
          />
        </svg>
      );
    case 'share':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 16V3" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M7 8l5-5 5 5" />
        </svg>
      );
    case 'external':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M14 3h7v7" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M10 14L21 3" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M21 14v6a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6" />
        </svg>
      );
    case 'sparkles':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8L12 3zM19 16l.9 2.1L22 19l-2.1.9L19 22l-.9-2.1L16 19l2.1-.9L19 16zM5 14l.9 2.1L8 17l-2.1.9L5 20l-.9-2.1L2 17l2.1-.9L5 14z" />
        </svg>
      );
    case 'industry':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 21h18" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M5 21V8l7-4v17" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 21V12l7-4v13" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 10h.01M8 14h.01M8 18h.01M15 12h.01M15 16h.01" />
        </svg>
      );
    case 'link':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.75}
            d="M10 13a5 5 0 007.07 0l2.12-2.12a5 5 0 00-7.07-7.07L10.7 5.22"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.75}
            d="M14 11a5 5 0 00-7.07 0L4.81 13.12a5 5 0 107.07 7.07l1.41-1.41"
          />
        </svg>
      );
    case 'edit':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.75}
            d="M16.862 3.487a2.1 2.1 0 112.97 2.97L8.75 17.54 4 19l1.46-4.75 11.402-10.763z"
          />
        </svg>
      );
    case 'image':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <rect x="3" y="5" width="18" height="14" rx="2" strokeWidth="1.75" />
          <circle cx="8.5" cy="10" r="1.5" strokeWidth="1.75" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M21 15l-5-5-7 7" />
        </svg>
      );
    case 'facebook':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M13.5 21v-7h2.4l.4-3h-2.8V9.1c0-.9.3-1.5 1.6-1.5H16V4.9c-.2 0-.9-.1-1.8-.1-1.8 0-3.1 1.1-3.1 3.2V11H9v3h2.3v7h2.2z" />
        </svg>
      );
    case 'instagram':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" strokeWidth="1.75" />
          <circle cx="12" cy="12" r="3.75" strokeWidth="1.75" />
          <circle cx="17.3" cy="6.7" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'linkedin':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M6.94 8.5a1.44 1.44 0 110-2.88 1.44 1.44 0 010 2.88zM5.7 18.5h2.47v-8H5.7v8zm4.03-8h2.37v1.1h.03c.33-.63 1.14-1.3 2.35-1.3 2.52 0 2.99 1.66 2.99 3.81v4.39H15v-3.89c0-.93-.02-2.12-1.29-2.12-1.3 0-1.49 1.01-1.49 2.06v3.95H9.73v-8z" />
        </svg>
      );
    case 'twitter':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.9 5H16.5l-3.1 3.5L10.9 5H5l5.3 6.8L5.2 19h2.4l3.8-4.3 3.3 4.3H20l-5.5-7L18.9 5z" />
        </svg>
      );
    default:
      return null;
  }
};

const normalizeApplicationStatus = (status) => {
  const value = String(status || '').trim().toLowerCase();

  if (!value) return 'pending';
  if (value === 'pending') return 'pending';

  if (
    value === 'for interview' ||
    value === 'interview' ||
    value === 'interview_scheduled' ||
    value === 'interview scheduled' ||
    value === 'shortlisted'
  ) {
    return 'for interview';
  }

  if (value === 'hired' || value === 'accepted') {
    return 'hired';
  }

  if (value === 'declined' || value === 'rejected') {
    return 'declined';
  }

  if (value === 'withdrawn') return 'withdrawn';
  if (value === 'cancelled' || value === 'canceled') return 'cancelled';

  return value;
};

const CompanyLogo = ({ src, name, size = 'md' }) => {
  const initial = (name?.trim()?.[0] || 'C').toUpperCase();
  const [imgError, setImgError] = useState(false);

  const sizeCls =
    size === 'lg'
      ? 'w-14 h-14 sm:w-16 sm:h-16 rounded-2xl'
      : size === 'xl'
      ? 'w-[58px] h-[58px] sm:w-[72px] sm:h-[72px] rounded-2xl'
      : 'w-11 h-11 rounded-xl';

  if (!src || imgError) {
    return (
      <div className={`${sizeCls} border border-black/10 bg-[#FFFFFF] flex items-center justify-center flex-shrink-0`}>
        <span className="font-bold text-sm text-[#000000]/70">{initial}</span>
      </div>
    );
  }

  return (
    <div className={`${sizeCls} overflow-hidden border border-black/10 bg-[#FFFFFF] flex-shrink-0`}>
      <img
        src={src}
        alt={`${name || 'Company'} logo`}
        className="w-full h-full object-cover"
        onError={() => setImgError(true)}
      />
    </div>
  );
};

const normalizeLocation = (jobData) => {
  const candidates = [
    jobData?.location,
    jobData?.jobLocation,
    jobData?.address,
    jobData?.employerDetails?.location,
    jobData?.employerDetails?.companyAddress,
    jobData?.employer?.companyAddress,
    jobData?.companyAddress,
  ];

  for (const c of candidates) {
    if (!c) continue;
    const s = String(c).trim();
    if (s) return s;
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

const StaticLocationMap = ({ job, heightClass = 'h-[160px]' }) => {
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

const formatSalary = (min, max) => {
  const hasMin = min !== undefined && min !== null && min !== '' && !Number.isNaN(Number(min));
  const hasMax = max !== undefined && max !== null && max !== '' && !Number.isNaN(Number(max));
  if (!hasMin && !hasMax) return 'Salary not specified';

  const fmt = (n) => `₱${Number(n).toLocaleString('en-PH')}`;
  if (hasMin && hasMax) return `${fmt(min)} – ${fmt(max)}`;
  if (hasMin) return `From ${fmt(min)}`;
  return `Up to ${fmt(max)}`;
};

const formatApplicationDeadline = (deadline) => {
  if (!deadline) return 'Application deadline not specified';

  const date = new Date(deadline);

  if (Number.isNaN(date.getTime())) {
    return 'Application deadline not specified';
  }

  return `Deadline of application: ${date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
  })}`;
};

const formatApplicationDeadlineDate = (deadline) => {
  if (!deadline) return '';

  const date = new Date(deadline);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
  });
};

const normalizeWorkModeLabel = (value) => {
  const v = String(value || '').trim().toLowerCase();

  if (!v) return '';
  if (v.includes('hybrid') || v.includes('blended')) return 'Blended';
  if (v.includes('work from home') || v.includes('wfh')) return 'Work from Home';
  if (v.includes('remote')) return 'Remote';
  if (v.includes('on-site') || v.includes('onsite') || v.includes('on site')) return 'On-site';

  return '';
};

const normalizeBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  const v = String(value || '').trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes' || v === 'on';
};

const normalizeExperienceLevelValue = (value) => String(value || '').trim().toLowerCase();

const isFreshGraduateJob = (job) => {
  return normalizeBoolean(job?.openToFreshGraduates);
};

const getExperienceBadgeLabel = (experienceLevel) => {
  const raw = String(experienceLevel || '').trim();
  if (!raw) return '';

  const normalized = normalizeExperienceLevelValue(raw);

  if (normalized === 'no experience required') return 'No experience required';
  if (normalized === '1 year') return '1 Year Experience';
  if (normalized === '2 years') return '2 Years Experience';
  if (normalized === '3 years') return '3 Years Experience';
  if (normalized === '4 years') return '4 Years Experience';
  if (normalized === '5 years') return '5 Years Experience';
  if (normalized === '6+ years') return '6+ Years Experience';

  return raw;
};

const formatCountLabel = (count, singular, plural = `${singular}s`) => {
  const safeCount = Number(count);
  if (!Number.isFinite(safeCount)) return plural;
  return `${safeCount} ${safeCount === 1 ? singular : plural}`;
};

const formatEducationDisplay = (education) => {
  const value = String(education || '').trim();
  if (!value) return 'Not specified';

  const lower = value.toLowerCase();
  if (lower === 'master degree') return "Master's degree";
  if (lower === 'bachelor degree') return "Bachelor's degree";
  if (lower === 'doctorate degree') return 'Doctorate degree';

  return value;
};

const formatWorkModeDisplay = (workMode) => {
  const value = String(workMode || '').trim();
  if (!value) return '';
  if (value.toLowerCase() === 'blended') return 'Hybrid';
  return value;
};

const formatPostedRelative = (dateString) => {
  if (!dateString) return 'Posted recently';

  const postedDate = new Date(dateString);
  const now = new Date();

  if (Number.isNaN(postedDate.getTime())) return 'Posted recently';

  const diffMs = now - postedDate;
  if (diffMs < 0) return 'Posted recently';

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
    if (days === 1) return 'Posted yesterday';
    return `Posted ${days} days ago`;
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
};

const getCompanyWebsiteUrl = (job) => {
  const candidates = [
    job?.employer?.employerProfile?.companyWebsiteUrl,
    job?.employerDetails?.companyWebsite,
    job?.companyWebsiteUrl,
    job?.companyWebsite,
  ];

  for (const candidate of candidates) {
    const value = String(candidate || '').trim();
    if (value) {
      if (/^https?:\/\//i.test(value)) return value;
      return `https://${value}`;
    }
  }

  return '';
};

const ensureUrlProtocol = (url) => {
  const value = String(url || '').trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
};

const getCompanyStorageKey = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const userId = user?._id || user?.id || 'guest';
    return `savedCompanies:${userId}`;
  } catch {
    return 'savedCompanies:guest';
  }
};

const getLocalSavedCompanies = () => {
  try {
    const raw = localStorage.getItem(getCompanyStorageKey());
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const setLocalSavedCompanies = (companies) => {
  try {
    localStorage.setItem(getCompanyStorageKey(), JSON.stringify(Array.isArray(companies) ? companies : []));
  } catch {}
};

const formatReviewDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const getOutcomeLabel = (value) => {
  const labels = {
    received_offer: 'Received offer',
    rejected: 'Rejected',
    ghosted: 'Ghosted',
    withdrew: 'Withdrew',
    still_in_process: 'Still in process',
  };

  return labels[String(value || '').trim()] || 'Still in process';
};

const getOutcomeBadgeClass = (value) => {
  const classes = {
    received_offer: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rejected: 'bg-red-50 text-red-700 border-red-200',
    ghosted: 'bg-amber-50 text-amber-700 border-amber-200',
    withdrew: 'bg-gray-100 text-gray-700 border-gray-200',
    still_in_process: 'bg-blue-50 text-blue-700 border-blue-200',
  };

  return classes[String(value || '').trim()] || classes.still_in_process;
};

const normalizeGalleryItems = (galleryImages) => {
  if (!galleryImages) return [];

  if (Array.isArray(galleryImages)) {
    return galleryImages
      .map((item, index) => {
        if (typeof item === 'string') {
          const url = item.trim();
          if (!url) return null;
          return {
            _id: `string-${index}-${url}`,
            url,
            caption: '',
            uploadedAt: null,
          };
        }

        if (item && typeof item === 'object') {
          const url = String(item.url || '').trim();
          if (!url) return null;
          return {
            _id: item._id || `obj-${index}-${url}`,
            url,
            caption: item.caption || '',
            uploadedAt: item.uploadedAt || null,
          };
        }

        return null;
      })
      .filter(Boolean);
  }

  if (typeof galleryImages === 'string' && galleryImages.trim()) {
    return galleryImages
      .split(',')
      .map((item, index) => {
        const url = item.trim();
        if (!url) return null;
        return {
          _id: `csv-${index}-${url}`,
          url,
          caption: '',
          uploadedAt: null,
        };
      })
      .filter(Boolean);
  }

  return [];
};

const calculateAccurateCompanyRating = (company = {}, reviews = []) => {
  const breakdown = company?.ratingBreakdown || {};
  const counts = {
    5: Number(breakdown?.[5] || 0),
    4: Number(breakdown?.[4] || 0),
    3: Number(breakdown?.[3] || 0),
    2: Number(breakdown?.[2] || 0),
    1: Number(breakdown?.[1] || 0),
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
    rating: Number(company?.rating) || 0,
    reviewCount: Number(company?.reviewCount) || 0,
  };
};

const normalizeCompanyFromAny = (company) => {
  if (!company) return null;

  const reviews = Array.isArray(company.reviews)
    ? company.reviews.map((review, index) => ({
        id: review?._id || review?.id || `review-${index}`,
        reviewerName: review?.reviewerName || 'Anonymous User',
        date: formatReviewDate(review?.createdAt || review?.date),
        rating: Number(review?.processRating ?? review?.rating) || 0,
        processRating:
          review?.processRating === undefined || review?.processRating === null
            ? null
            : Number(review.processRating),
        roleAppliedFor: String(review?.roleAppliedFor || '').trim() || null,
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
          typeof review?.wouldApplyAgain === 'boolean' ? review.wouldApplyAgain : null,
        message: review?.message || '',
        createdAt: review?.createdAt || review?.date || null,
      }))
    : [];

  const jobs = Array.isArray(company.jobs)
    ? company.jobs.map((job) => ({
        ...job,
        companyName: job.companyName || company.companyName || '',
        companyLogo: job.companyLogo || company.companyLogo || '',
        location: normalizeLocation(job) || company.location || company.companyAddress || '',
      }))
    : [];

  const galleryItems = normalizeGalleryItems(
    company.galleryImages || company.gallery || company.employerProfile?.galleryImages || []
  );

  const accurateRatingSummary = calculateAccurateCompanyRating(company, reviews);

  return {
    _id: company._id || company.id || '',
    companyName: company.companyName || 'Company',
    industry: company.industry || '',
    location: company.location || company.companyAddress || '',
    companyAddress: company.companyAddress || company.location || '',
    companyLogo: company.companyLogo || '',
    companyWebsite: company.companyWebsite || company.website || '',
    about: company.about || company.companyDescription || 'No company description provided.',
    rating: accurateRatingSummary.rating,
    reviewCount: accurateRatingSummary.reviewCount,
    ratingBreakdown: company.ratingBreakdown || {},
    reviews,
    jobs,
    createdAt: company.createdAt || '',
    facebookUrl: company.facebookUrl || company.employerProfile?.facebookUrl || '',
    instagramUrl: company.instagramUrl || company.employerProfile?.instagramUrl || '',
    linkedinUrl: company.linkedinUrl || company.employerProfile?.linkedinUrl || '',
    xUrl: company.xUrl || company.employerProfile?.xUrl || '',
    coverPhoto: company.coverPhoto || company.employerProfile?.coverPhoto || '',
    galleryImages: galleryItems,
  };
};

const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    return null;
  }
};

const TopMetricCard = ({ icon, title, value, isPeso = false }) => (
  <div className="rounded-2xl border border-black/10 bg-[#FFFFFF] px-4 py-4 min-h-[110px] shadow-sm">
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg border border-[#2e66a6]/15 bg-[#2e66a6]/10 flex items-center justify-center text-[#2e66a6] flex-shrink-0 mt-0.5">
        {isPeso ? <span className="font-bold text-[13px] leading-none">₱</span> : <SvgIcon name={icon} className="w-4 h-4" />}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-[0.08em] font-semibold text-black/50">{title}</p>
        <p className="mt-2 text-sm sm:text-[15px] leading-7 font-semibold text-[#000000] break-words">{value}</p>
      </div>
    </div>
  </div>
);

const BookmarkCard = ({ job, selected, onClick, onRemove, removing }) => {
  return (
    <div
      className={`group relative border-b border-black/10 last:border-b-0 transition-colors ${
        selected ? 'bg-[#2e66a6]/8' : 'bg-[#FFFFFF] hover:bg-black/[0.02]'
      }`}
    >
      <button type="button" onClick={onClick} className={`w-full text-left p-4 pr-14 ${UI.ring}`} aria-pressed={selected}>

        <div className="flex items-start gap-3 min-w-0">
          <CompanyLogo src={job.companyLogo} name={job.companyName} />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="min-w-0 truncate whitespace-nowrap text-[15px] font-semibold text-[#000000] leading-5">{job.title}</h3>
            </div>

            <p className="text-xs text-black/70 mt-1 line-clamp-1">{job.companyName}</p>
            <p className="text-xs text-black/55 mt-1 line-clamp-1">{formatLocationDisplay(job.location)}</p>

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
              <p className="text-xs font-semibold text-[#000000]">{formatSalary(job.salaryMin, job.salaryMax)}</p>
              <span className="text-[11px] text-black/35">•</span>
              <p className="text-xs text-black/70">{job.jobType || 'N/A'}</p>
            </div>
          </div>
        </div>
      </button>

      <button
        type="button"
        onClick={() => onRemove(job._id)}
        disabled={removing}
        aria-label={`Remove ${job.title} from bookmarks`}
        className={`absolute top-4 right-4 ${UI.btnBase} h-9 w-9 p-0 ${
          'text-[#2e66a6] bg-[#FFFFFF] border border-[#2e66a6]/20 hover:bg-[#f7faff]'
        } ${UI.ring}`}
      >
        {removing ? (
          <span className="inline-block w-4 h-4 rounded-full border-2 border-black/20 border-t-black/70 animate-spin motion-reduce:animate-none" />
        ) : (
          <SvgIcon name="bookmarkFilled" className="w-4 h-4 text-[#2e66a6]" />
        )}
      </button>
    </div>
  );
};

const SavedCompanyCard = ({ company, selected, onClick, onRemove, removing }) => {
  const jobsCount = Array.isArray(company.jobs) ? company.jobs.length : 0;

  return (
    <div
      className={`group relative border-b border-black/10 last:border-b-0 transition-colors ${
        selected ? 'bg-[#2e66a6]/8' : 'bg-[#FFFFFF] hover:bg-black/[0.02]'
      }`}
    >
      <button type="button" onClick={onClick} className={`w-full text-left p-4 pr-14 ${UI.ring}`} aria-pressed={selected}>
        <div className="flex items-start gap-3 min-w-0">
          <CompanyLogo src={company.companyLogo} name={company.companyName} />
          <div className="min-w-0 flex-1">
            <h3 className="min-w-0 truncate whitespace-nowrap text-[15px] font-semibold text-[#000000] leading-5">{company.companyName}</h3>

            <p className="text-xs text-black/70 mt-1 line-clamp-1">{company.industry || 'Industry not specified'}</p>
            <p className="text-xs text-black/55 mt-1 line-clamp-1">{formatLocationDisplay(company.companyAddress || company.location)}</p>

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
              <p className="text-xs font-semibold text-[#000000]">{formatCountLabel(jobsCount, 'Open Position')}</p>
              <span className="text-[11px] text-black/35">•</span>
              <p className="text-xs text-black/70">{Number(company.rating || 0).toFixed(1)} rating</p>
            </div>
          </div>
        </div>
      </button>

      <button
        type="button"
        onClick={() => onRemove(company._id)}
        disabled={removing}
        aria-label={`Remove ${company.companyName} from bookmarks`}
        className={`absolute top-4 right-4 ${UI.btnBase} h-9 w-9 p-0 ${
          'text-[#2e66a6] bg-[#FFFFFF] border border-[#2e66a6]/20 hover:bg-[#f7faff]'
        } ${UI.ring}`}
      >
        {removing ? (
          <span className="inline-block w-4 h-4 rounded-full border-2 border-black/20 border-t-black/70 animate-spin motion-reduce:animate-none" />
        ) : (
          <SvgIcon name="bookmarkFilled" className="w-4 h-4 text-[#2e66a6]" />
        )}
      </button>
    </div>
  );
};

const StarRating = ({ rating = 0, size = 'w-5 h-5' }) => {
  const normalized = Math.max(0, Math.min(5, Number(rating) || 0));
  const fullStars = Math.floor(normalized);

  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2, 3, 4].map((idx) => {
        const filled = idx < fullStars;
        return (
          <svg
            key={idx}
            className={`${size} ${filled ? 'text-[#E4B321]' : 'text-[#E4B321]/45'}`}
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
            className={`transition ${disabled ? 'cursor-not-allowed' : 'cursor-pointer hover:scale-105'}`}
            aria-label={`Rate ${value} star${value > 1 ? 's' : ''}`}
            disabled={disabled}
          >
            <svg
              className={`w-8 h-8 ${filled ? 'text-[#E4B321]' : 'text-[#E4B321]/45'}`}
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

const CompanyJobMiniCard = ({ job, onViewDetails, onApply, onSave, saving, isSaved, alreadyApplied }) => {
  const jobId = job?._id || job?.id;
  const experienceBadgeLabel = getExperienceBadgeLabel(job.experienceLevel);
  const tagFreshGrad = isFreshGraduateJob(job);

  const wmSource = job.workMode || job.workArrangement || job.workSetup || job.setup || '';
  const wmLabel = normalizeWorkModeLabel(wmSource);
  const tagBlended = wmLabel === 'Blended';
  const tagOnsite = wmLabel === 'On-site';
  const tagRemote = wmLabel === 'Remote';
  const tagWFH = wmLabel === 'Work from Home';
  const locationText = formatLocationDisplay(job.location);

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={(event) => {
            event.stopPropagation();
            onViewDetails();
          }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onViewDetails();
        }
      }}
      className="rounded-2xl p-7 bg-white shadow-sm hover:shadow-md transition flex flex-col min-h-[375px] relative cursor-pointer border border-[#E5E7EB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2"
      aria-label={`View details for ${job.title || 'job'}`}
    >

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onSave(job);
        }}
        disabled={saving}
        className={`absolute top-5 right-5 h-10 w-10 rounded-xl flex items-center justify-center transition ${
          isSaved ? 'hover:bg-blue-100' : 'hover:bg-gray-50'
        }`}
        aria-label={isSaved ? 'Saved job' : 'Save job'}
        title={isSaved ? 'Saved job' : 'Save job'}
      >
        {saving ? (
          <span className="inline-block w-5 h-5 rounded-full border-2 border-black/20 border-t-[#2e66a6] animate-spin motion-reduce:animate-none" />
        ) : isSaved ? (
          <svg className="w-5 h-5 text-blue-700" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M6 4.75A2.75 2.75 0 018.75 2h6.5A2.75 2.75 0 0118 4.75V21a.75.75 0 01-1.154.638L12 18.58l-4.846 3.058A.75.75 0 016 21V4.75z" />
          </svg>
        ) : (
          <SvgIcon name="bookmark" className="w-5 h-5 text-gray-700" />
        )}
      </button>

      <div className="flex items-start gap-4 pr-12">
        <CompanyLogo src={job.companyLogo} name={job.companyName} />
        <div className="min-w-0 flex-1">
          <h3 className="min-w-0 truncate whitespace-nowrap text-lg font-bold text-gray-800 leading-snug">
            {String(job.title || 'Job Title').replaceAll('"', '')}
          </h3>

          <div className="mt-1 flex items-center gap-2 min-w-0">
            <span className="text-sm font-medium text-gray-600 truncate">
              {job.companyName || 'Company'}
            </span>
            <img src="/images/checkmo.png" alt="Verified" className="w-5 h-5 object-contain flex-shrink-0" draggable="false" />
          </div>
        </div>
      </div>

      <div
        className={`relative mt-4 rounded-xl bg-[#F3F4F6] p-4 overflow-hidden ${
          normalizeBoolean(job?.isUrgent) ? 'pr-[112px]' : ''
        }`}
      >
        {normalizeBoolean(job?.isUrgent) ? (
         <img
                              src="/images/urgentneed.png"
                              alt="Urgent Hiring"
                              draggable="false"
                             className="pointer-events-none absolute -right-5 bottom-1 w-[112px] max-w-[38%] h-auto object-contain select-none"
                            />
        ) : null}
        <div className="flex items-center gap-2 text-sm text-gray-700 min-w-0">
          <SvgIcon name="location" className="w-4 h-4 text-gray-600 shrink-0" />
          <span className="min-w-0 flex-1 truncate" title={locationText}>
            {locationText}
          </span>
        </div>

        <div className="mt-2 flex items-center gap-2 text-sm text-gray-700 min-w-0">
          <span className="w-4 h-4 text-gray-600 flex shrink-0 items-center justify-center font-extrabold text-[14px] leading-none">
            ₱
          </span>
          <span className="min-w-0 flex-1 truncate">{formatSalary(job.salaryMin, job.salaryMax)}</span>
        </div>

        <div className="mt-2 flex items-center gap-2 text-sm text-gray-700 min-w-0">
          <SvgIcon name="briefcase" className="w-4 h-4 text-gray-600 shrink-0" />
          <span className="min-w-0 flex-1 truncate">{job.jobType || 'Full Time Work'}</span>
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
            Open Fresh Grads
          </span>
        )}
      </div>

      <div className="mt-4 w-full h-px bg-gray-300/80" />

      <div className="mt-auto pt-5">
        <button
          type="button"
          onClick={onViewDetails}
          disabled={alreadyApplied}
          className={`h-[40px] w-full rounded-xl px-5 text-sm font-semibold transition disabled:pointer-events-none ${
            alreadyApplied
              ? 'bg-blue-100 text-blue-700 border border-blue-200'
              : 'bg-[#1e4ba0] text-white border border-transparent hover:bg-[#1b4290]'
          }`}
          aria-disabled={alreadyApplied}
          title={alreadyApplied ? 'You already applied for this job' : 'Open job details to apply'}
        >
          {alreadyApplied ? 'Already Applied' : 'Apply Now'}
        </button>
      </div>
    </div>
  );
};

const CompanyTabButton = ({ active, onClick, children, badge }) => (
  <button
    type="button"
    onClick={onClick}
    className={`inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold transition border ${
      active
        ? 'bg-[#f7faff] text-[#2e66a6] border-[#d8e2ee] shadow-sm'
        : 'bg-white text-black/70 border-black/10 hover:bg-black/[0.03]'
    }`}
  >
    <span>{children}</span>
    {badge !== undefined && badge !== null ? (
      <span
        className={`inline-flex items-center justify-center min-w-[22px] h-[22px] px-1 rounded-full text-[11px] ${
          active ? 'bg-[#eaf2fb] text-[#2e66a6]' : 'bg-[#F1F5F9] text-black/60'
        }`}
      >
        {badge}
      </span>
    ) : null}
  </button>
);

const SocialMediaCard = ({ icon, label, url }) => {
  const safeUrl = ensureUrlProtocol(url);

  return (
    <a
      href={safeUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between gap-4 rounded-2xl border border-black/10 bg-white p-4 hover:border-[#d8e2ee] hover:bg-[#fbfdff] transition"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-11 h-11 rounded-xl border border-black/10 bg-[#f7faff] flex items-center justify-center text-[#2e66a6] shrink-0">
          <SvgIcon name={icon} className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-black">{label}</p>
          <p className="text-[13px] text-black/60 truncate">{url}</p>
        </div>
      </div>

      <div className="text-[#2e66a6] shrink-0">
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




const EmptyCompanyTabState = ({ icon = 'file', title, description }) => (
  <div className="mt-6 min-h-[260px] rounded-2xl border border-black/10 bg-white px-5 py-10 flex items-center justify-center text-center">
    <div className="max-w-[420px] mx-auto">
      <div className="mx-auto text-black/50 flex items-center justify-center">
        <SvgIcon name={icon} className="w-12 h-12" />
      </div>

      <h3 className="mt-5 text-[15px] font-bold text-black/70">{title}</h3>
      <p className="mt-2 text-[14px] leading-6 text-black/35">{description}</p>
    </div>
  </div>
);

const EmptyCompanyBookmarks = () => (
  <div className="p-6 flex-1">
    <div className="h-full min-h-[300px] rounded-2xl border border-black/10 bg-white px-5 py-10 flex items-center justify-center text-center">
      <div className="max-w-[360px] mx-auto">
        <img
          src="/images/NoSavedCompanies.png"
          alt="No saved companies"
          className="mx-auto w-[120px]  h-auto object-contain"
          draggable="false"
        />

        <h3 className="mt-5 text-[15px] font-bold text-black/70">No saved companies yet</h3>
      </div>
    </div>
  </div>
);

const Bookmarks = () => {
  const navigate = useNavigate();

  const [activeSection, setActiveSection] = useState('jobs');

  const [savedJobs, setSavedJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState('');
  const [toast, setToast] = useState({ type: '', message: '' });

  const [savedCompanies, setSavedCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [removingCompanyId, setRemovingCompanyId] = useState('');
  const [activeCompanyTab, setActiveCompanyTab] = useState('about');

  const [showApplyModal, setShowApplyModal] = useState(false);
  const [modalJob, setModalJob] = useState(null);

  const [appliedMap, setAppliedMap] = useState({});
  const [checkingApplied, setCheckingApplied] = useState(false);

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewProcessRating, setReviewProcessRating] = useState(0);
  const [reviewRoleAppliedFor, setReviewRoleAppliedFor] = useState('');
  const [reviewDaysToFirstResponse, setReviewDaysToFirstResponse] = useState('');
  const [reviewTotalProcessDays, setReviewTotalProcessDays] = useState('');
  const [reviewOutcome, setReviewOutcome] = useState('still_in_process');
  const [reviewWouldApplyAgain, setReviewWouldApplyAgain] = useState(true);
  const [reviewMessage, setReviewMessage] = useState('');
  const [reviewerName, setReviewerName] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState('');

  const [savingJobId, setSavingJobId] = useState('');
  const [removeJobModal, setRemoveJobModal] = useState({
    isOpen: false,
    jobId: '',
    jobTitle: '',
  });
  const [removeCompanyModal, setRemoveCompanyModal] = useState({
    isOpen: false,
    companyId: '',
    companyName: '',
  });

  const toastTimerRef = useRef(null);

  const setToastMessage = useCallback((type, message, ms = 1800) => {
    setToast({ type, message });
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      setToast({ type: '', message: '' });
    }, ms);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  const fetchSavedJobs = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/jobs/saved');

      if (response.data?.success) {
        const jobs = Array.isArray(response.data.jobs) ? response.data.jobs : [];
        const normalizedJobs = jobs.map((job) => ({
          ...job,
          location: normalizeLocation(job),
        }));

        setSavedJobs(normalizedJobs);

        if (normalizedJobs.length > 0) {
          setSelectedJobId((prev) => {
            const exists = normalizedJobs.some((item) => item._id === prev);
            return exists ? prev : normalizedJobs[0]._id;
          });
        } else {
          setSelectedJobId('');
        }
      }
    } catch (err) {
      setToastMessage('error', err.response?.data?.message || 'Failed to load bookmarks.');
    } finally {
      setLoading(false);
    }
  }, [setToastMessage]);

  const fetchSavedCompanies = useCallback(async () => {
    try {
      setLoadingCompanies(true);

      let companies = [];
      let usedLocal = false;

      try {
        const response = await api.get('/companies/saved');
        if (response.data?.success) {
          companies = Array.isArray(response.data.companies) ? response.data.companies : [];
        } else {
          companies = [];
        }
      } catch {
        companies = getLocalSavedCompanies();
        usedLocal = true;
      }

      const normalized = companies.map(normalizeCompanyFromAny).filter(Boolean);

      setSavedCompanies(normalized);

      if (normalized.length > 0) {
        setSelectedCompanyId((prev) => {
          const exists = normalized.some((item) => item._id === prev);
          return exists ? prev : normalized[0]._id;
        });
      } else {
        setSelectedCompanyId('');
      }

      if (usedLocal) {
        setLocalSavedCompanies(normalized);
      }
    } catch {
      setSavedCompanies([]);
      setSelectedCompanyId('');
    } finally {
      setLoadingCompanies(false);
    }
  }, []);

  const checkAppliedStatuses = useCallback(async (jobs) => {
    try {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');

      const uniqueJobs = Array.from(
        new Map(
          (Array.isArray(jobs) ? jobs : [])
            .filter((job) => job?._id || job?.id)
            .map((job) => [String(job._id || job.id), job])
        ).values()
      );

      if (!token || !userStr || uniqueJobs.length === 0) {
        setAppliedMap({});
        return;
      }

      const user = JSON.parse(userStr);
      if (user.role !== 'jobseeker') {
        setAppliedMap({});
        return;
      }

      setCheckingApplied(true);

      const results = await Promise.all(
        uniqueJobs.map(async (job) => {
          const jobId = job._id || job.id;

          try {
            const response = await api.get(`/applications/job/${jobId}/check`);

            if (response.data?.success) {
              return [
                jobId,
                {
                  hasApplied: Boolean(response.data.hasApplied),
                  applicationStatus: normalizeApplicationStatus(response.data.application?.status || ''),
                },
              ];
            }

            return [jobId, { hasApplied: false, applicationStatus: '' }];
          } catch {
            return [jobId, { hasApplied: false, applicationStatus: '' }];
          }
        })
      );

      setAppliedMap(Object.fromEntries(results));
    } finally {
      setCheckingApplied(false);
    }
  }, []);

  useEffect(() => {
    fetchSavedJobs();
    fetchSavedCompanies();
  }, [fetchSavedJobs, fetchSavedCompanies]);

  const companyJobsForAppliedCheck = useMemo(() => {
    return savedCompanies.flatMap((company) => (Array.isArray(company.jobs) ? company.jobs : []));
  }, [savedCompanies]);

  useEffect(() => {
    const jobsToCheck = [...savedJobs, ...companyJobsForAppliedCheck];

    if (jobsToCheck.length > 0) {
      checkAppliedStatuses(jobsToCheck);
    } else {
      setAppliedMap({});
    }
  }, [savedJobs, companyJobsForAppliedCheck, checkAppliedStatuses]);

  const closeApplyModal = useCallback(() => {
    setShowApplyModal(false);
    setModalJob(null);
  }, []);

  const handleRemoveSavedJob = useCallback(
    (jobId) => {
      const targetJob = savedJobs.find((job) => job._id === jobId);

      setRemoveJobModal({
        isOpen: true,
        jobId,
        jobTitle: targetJob?.title || 'this job',
      });
    },
    [savedJobs]
  );

  const closeRemoveJobModal = useCallback(() => {
    if (removingId) return;

    setRemoveJobModal({
      isOpen: false,
      jobId: '',
      jobTitle: '',
    });
  }, [removingId]);

  const confirmRemoveSavedJob = useCallback(async () => {
    const jobId = removeJobModal.jobId;
    if (!jobId) return;

    try {
      setRemovingId(jobId);
      const response = await api.delete(`/jobs/saved/${jobId}`);

      if (response.data?.success) {
        const updated = savedJobs.filter((job) => job._id !== jobId);
        setSavedJobs(updated);

        if (selectedJobId === jobId) {
          setSelectedJobId(updated[0]?._id || '');
        }

        setRemoveJobModal({
          isOpen: false,
          jobId: '',
          jobTitle: '',
        });
        setToastMessage('success', 'Job removed from bookmarks.');
      } else {
        setToastMessage('error', response.data?.message || 'Failed to remove bookmark.');
      }
    } catch (err) {
      setToastMessage('error', err.response?.data?.message || 'Failed to remove bookmark.');
    } finally {
      setRemovingId('');
    }
  }, [removeJobModal.jobId, savedJobs, selectedJobId, setToastMessage]);

  const handleRemoveSavedCompany = useCallback(
    (companyId) => {
      const targetCompany = savedCompanies.find((company) => company._id === companyId);

      setRemoveCompanyModal({
        isOpen: true,
        companyId,
        companyName: targetCompany?.companyName || 'this company',
      });
    },
    [savedCompanies]
  );

  const closeRemoveCompanyModal = useCallback(() => {
    if (removingCompanyId) return;

    setRemoveCompanyModal({
      isOpen: false,
      companyId: '',
      companyName: '',
    });
  }, [removingCompanyId]);

  const confirmRemoveSavedCompany = useCallback(async () => {
    const companyId = removeCompanyModal.companyId;
    if (!companyId) return;

    try {
      setRemovingCompanyId(companyId);

      let removed = false;

      try {
        const response = await api.delete(`/companies/saved/${companyId}`);
        removed = Boolean(response.data?.success);
      } catch {
        const updatedLocal = getLocalSavedCompanies().filter(
          (company) => String(company._id || company.id) !== String(companyId)
        );
        setLocalSavedCompanies(updatedLocal);
        removed = true;
      }

      if (removed) {
        const updated = savedCompanies.filter((company) => company._id !== companyId);
        setSavedCompanies(updated);

        if (selectedCompanyId === companyId) {
          setSelectedCompanyId(updated[0]?._id || '');
        }

        setRemoveCompanyModal({
          isOpen: false,
          companyId: '',
          companyName: '',
        });
        setToastMessage('success', 'Company removed from bookmarks.');
      } else {
        setToastMessage('error', 'Failed to remove saved company.');
      }
    } catch {
      setToastMessage('error', 'Failed to remove saved company.');
    } finally {
      setRemovingCompanyId('');
    }
  }, [removeCompanyModal.companyId, savedCompanies, selectedCompanyId, setToastMessage]);

  const selectedJob = useMemo(() => savedJobs.find((job) => job._id === selectedJobId) || null, [savedJobs, selectedJobId]);

  const selectedCompany = useMemo(
    () => savedCompanies.find((company) => company._id === selectedCompanyId) || null,
    [savedCompanies, selectedCompanyId]
  );

  const companyWebsiteUrl = useMemo(() => getCompanyWebsiteUrl(selectedJob), [selectedJob]);

  const selectedJobApplyState = selectedJob
    ? appliedMap[selectedJob._id] || { hasApplied: false, applicationStatus: '' }
    : { hasApplied: false, applicationStatus: '' };

  const hasApplied = Boolean(selectedJobApplyState.hasApplied);
  const applicationStatus = normalizeApplicationStatus(selectedJobApplyState.applicationStatus || '');

  const statusBadge = useMemo(() => {
    if (!hasApplied) return null;

    const status = normalizeApplicationStatus(applicationStatus || 'pending');
    const map = {
      pending: { cls: 'bg-black/5 border-black/15 text-[#000000]', icon: 'clock', label: 'Pending' },
      'for interview': { cls: 'bg-[#2e66a6]/10 border-[#2e66a6]/20 text-[#000000]', icon: 'checkCircle', label: 'For Interview' },
      hired: { cls: 'bg-[#2e66a6]/10 border-[#2e66a6]/20 text-[#000000]', icon: 'checkCircle', label: 'Hired' },
      declined: { cls: 'bg-black/5 border-black/15 text-[#000000]', icon: 'exclamation', label: 'Declined' },
      withdrawn: { cls: 'bg-black/5 border-black/15 text-[#000000]', icon: 'exclamation', label: 'Withdrawn' },
      cancelled: { cls: 'bg-black/5 border-black/15 text-[#000000]', icon: 'exclamation', label: 'Cancelled' },
    };

    const picked = map[status] || map.pending;

    return (
      <span className={`${UI.badgeBase} ${picked.cls}`}>
        <SvgIcon name={picked.icon} className="w-3.5 h-3.5" />
        Applied ({picked.label})
      </span>
    );
  }, [hasApplied, applicationStatus]);

  const isJobActive = useCallback((job) => {
    if (!job) return false;
    if (job.isActive === false || job.isPublished === false) return false;
    if (job.applicationDeadline && new Date(job.applicationDeadline) < new Date()) return false;
    return true;
  }, []);

  const handleShareJob = useCallback(
    async (job) => {
      if (!job?._id) {
        setToastMessage('error', 'Job link not available.');
        return;
      }

      const jobUrl = `${window.location.origin}/jobseeker/job-details/${job._id}`;
      const shareText = `Check out this job: ${job?.title} at ${job?.companyName}`;

      if (navigator.share) {
        try {
          await navigator.share({ title: job?.title, text: shareText, url: jobUrl });
          setToastMessage('success', 'Job shared successfully.');
        } catch {}
        return;
      }

      navigator.clipboard
        .writeText(jobUrl)
        .then(() => setToastMessage('success', 'Job link copied to clipboard.'))
        .catch(() => setToastMessage('error', 'Failed to copy link. Please try again.'));
    },
    [setToastMessage]
  );

  const handleShareCompany = useCallback(
    async (company) => {
      if (!company?._id) {
        setToastMessage('error', 'Company link not available.');
        return;
      }

      const companyUrl = `${window.location.origin}/jobseeker/company-details/${company._id}`;
      const shareText = `Check out this company: ${company?.companyName}`;

      if (navigator.share) {
        try {
          await navigator.share({ title: company?.companyName, text: shareText, url: companyUrl });
          setToastMessage('success', 'Company shared successfully.');
        } catch {}
        return;
      }

      navigator.clipboard
        .writeText(companyUrl)
        .then(() => setToastMessage('success', 'Company link copied to clipboard.'))
        .catch(() => setToastMessage('error', 'Failed to copy link. Please try again.'));
    },
    [setToastMessage]
  );

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
        setToastMessage('error', 'Only job seekers can apply for jobs.');
        return;
      }

      const verificationStatus = user.jobSeekerProfile?.verificationStatus;

      if (verificationStatus !== 'verified') {
        let message = 'Your account is not verified. ';
        if (verificationStatus === 'pending') message += 'Your verification is pending approval from admin.';
        else if (verificationStatus === 'rejected') message += 'Your verification was rejected. Please contact admin.';
        else message += 'Please complete verification before applying.';
        setToastMessage('error', message);
        return;
      }

      if (!isJobActive(selectedJob)) {
        setToastMessage('error', 'This job is no longer accepting applications.');
        return;
      }

      if (hasApplied) {
        navigate('/jobseeker/my-applications');
        return;
      }

      setModalJob(selectedJob);
      setShowApplyModal(true);
    } catch {
      setToastMessage('error', 'Error checking user information.');
    }
  }, [navigate, selectedJob, hasApplied, isJobActive, setToastMessage]);

  const handleApplyFromCompanyJob = useCallback(
    async (job) => {
      const token = localStorage.getItem('token');
      const user = localStorage.getItem('user');

      if (!token || !user) {
        setToastMessage('error', 'Please login to apply for jobs.');
        navigate('/login');
        return;
      }

      try {
        const parsedUser = JSON.parse(user);

        if (parsedUser.role !== 'jobseeker') {
          setToastMessage('error', 'Only job seekers can apply for jobs.');
          return;
        }

        const verificationStatus = parsedUser.jobSeekerProfile?.verificationStatus;

        if (verificationStatus !== 'verified') {
          let message = 'Your account is not verified. ';
          if (verificationStatus === 'pending') message += 'Your verification is pending approval from admin.';
          else if (verificationStatus === 'rejected') message += 'Your verification was rejected. Please contact admin.';
          else message += 'Please complete verification before applying.';
          setToastMessage('error', message);
          return;
        }

        if (!job?.isActive || !job?.isPublished) {
          setToastMessage('error', 'This job is no longer accepting applications.');
          return;
        }

        if (job?.applicationDeadline && new Date(job.applicationDeadline) < new Date()) {
          setToastMessage('error', 'Application deadline has passed.');
          return;
        }

        const alreadyApplied = Boolean(appliedMap?.[job?._id]?.hasApplied);
        if (alreadyApplied) {
          navigate('/jobseeker/my-applications');
          return;
        }

        setModalJob(job);
        setShowApplyModal(true);
      } catch {
        setToastMessage('error', 'Error checking user information.');
      }
    },
    [navigate, appliedMap, setToastMessage]
  );

  const resetReviewForm = useCallback(() => {
    const storedUser = getStoredUser();
    const defaultReviewerName = [
      storedUser?.firstName,
      storedUser?.middleName,
      storedUser?.lastName,
    ]
      .filter(Boolean)
      .join(' ')
      .trim();

    setReviewProcessRating(0);
    setReviewRoleAppliedFor('');
    setReviewDaysToFirstResponse('');
    setReviewTotalProcessDays('');
    setReviewOutcome('still_in_process');
    setReviewWouldApplyAgain(true);
    setReviewMessage('');
    setReviewerName(
      defaultReviewerName ||
        storedUser?.fullName ||
        storedUser?.username ||
        storedUser?.email?.split('@')?.[0] ||
        ''
    );
  }, []);

  const handleOpenCompanyReviewModal = useCallback(() => {
    const token = localStorage.getItem('token');
    const user = getStoredUser();

    if (!token || !user) {
      setToastMessage('error', 'Please login to write a review.');
      navigate('/login');
      return;
    }

    if (user.role !== 'jobseeker') {
      setToastMessage('error', 'Only job seekers can submit reviews.');
      return;
    }

    if (!selectedCompany?._id) {
      setToastMessage('error', 'No company selected.');
      return;
    }

    setReviewError('');
    resetReviewForm();
    setActiveCompanyTab('reviews');
    setShowReviewModal(true);
  }, [navigate, resetReviewForm, selectedCompany, setToastMessage]);

  const closeReviewModal = useCallback(() => {
    if (reviewSubmitting) return;
    setShowReviewModal(false);
    setReviewError('');
    resetReviewForm();
  }, [reviewSubmitting, resetReviewForm]);

  const handleSubmitReview = useCallback(async () => {
    const token = localStorage.getItem('token');
    const user = getStoredUser();

    if (!token || !user) {
      setToastMessage('error', 'Please login to write a review.');
      navigate('/login');
      return;
    }

    if (user.role !== 'jobseeker') {
      setReviewError('Only job seekers can submit reviews.');
      return;
    }

    if (!selectedCompany?._id) {
      setReviewError('Company not found.');
      return;
    }

    const trimmedRoleAppliedFor = String(reviewRoleAppliedFor || '').trim();
    const trimmedMessage = String(reviewMessage || '').trim();
    const daysToFirstResponse =
      reviewDaysToFirstResponse === '' ? 0 : Number(reviewDaysToFirstResponse);
    const totalProcessDays =
      reviewTotalProcessDays === '' ? 0 : Number(reviewTotalProcessDays);

    if (!trimmedRoleAppliedFor) {
      setReviewError('Please enter the role you applied for.');
      return;
    }

    if (!reviewProcessRating || reviewProcessRating < 1 || reviewProcessRating > 5) {
      setReviewError('Please select an application process rating from 1 to 5.');
      return;
    }

    if (!Number.isFinite(daysToFirstResponse) || daysToFirstResponse < 0) {
      setReviewError('Days to first response must be 0 or higher.');
      return;
    }

    if (!Number.isFinite(totalProcessDays) || totalProcessDays < 0) {
      setReviewError('Total process length must be 0 or higher.');
      return;
    }

    if (!trimmedMessage) {
      setReviewError('Please enter your review.');
      return;
    }

    try {
      setReviewSubmitting(true);
      setReviewError('');

      const response = await api.post(`/companies/verified/${selectedCompany._id}/reviews`, {
        processRating: reviewProcessRating,
        roleAppliedFor: trimmedRoleAppliedFor,
        daysToFirstResponse,
        totalProcessDays,
        outcome: reviewOutcome,
        wouldApplyAgain: reviewWouldApplyAgain,
        message: trimmedMessage,
      });

      if (response?.data?.success) {
        await fetchSavedCompanies();
        setActiveCompanyTab('reviews');
        setShowReviewModal(false);
        setReviewError('');
        resetReviewForm();
        setToastMessage('success', response.data.message || 'Review submitted successfully!');
      }
    } catch (err) {
      console.error('Error submitting review:', err);

      if (err.response?.data?.message) {
        setReviewError(String(err.response.data.message));
      } else if (err.response?.data?.error) {
        setReviewError(String(err.response.data.error));
      } else if (err.response?.status === 401) {
        setReviewError('Session expired. Please login again.');
      } else if (err.response?.status === 403) {
        setReviewError('Only job seekers can submit reviews.');
      } else if (err.response?.status === 400) {
        setReviewError('Unable to submit review.');
      } else {
        setReviewError('Failed to submit review. Please try again.');
      }
    } finally {
      setReviewSubmitting(false);
    }
  }, [
    fetchSavedCompanies,
    navigate,
    resetReviewForm,
    reviewDaysToFirstResponse,
    reviewMessage,
    reviewOutcome,
    reviewProcessRating,
    reviewRoleAppliedFor,
    reviewTotalProcessDays,
    reviewWouldApplyAgain,
    selectedCompany,
    setToastMessage,
  ]);

  const handleSaveJobFromCompanyTab = useCallback(
    async (job) => {
      const token = localStorage.getItem('token');
      const user = getStoredUser();

      if (!token || !user) {
        setToastMessage('error', 'Please login to save jobs.');
        navigate('/login');
        return;
      }

      if (user.role !== 'jobseeker') {
        setToastMessage('error', 'Only job seekers can save jobs.');
        return;
      }

      if (!job?._id || savingJobId) return;

      try {
        setSavingJobId(job._id);
        const response = await api.post(`/jobs/saved/${job._id}`);

        if (response.data?.success) {
          const exists = savedJobs.some((savedJob) => savedJob._id === job._id);

          if (!exists) {
            const normalizedJob = { ...job, location: normalizeLocation(job) };
            setSavedJobs((prev) => [normalizedJob, ...prev]);
          }

          setToastMessage('success', response.data?.alreadySaved ? 'Job already saved.' : 'Job saved successfully.');
        } else {
          setToastMessage('error', response.data?.message || 'Failed to save job.');
        }
      } catch (err) {
        setToastMessage('error', err.response?.data?.message || 'Failed to save job.');
      } finally {
        setSavingJobId('');
      }
    },
    [navigate, savedJobs, savingJobId, setToastMessage]
  );

  const primaryCtaLabel = hasApplied ? 'View Application' : selectedJob && isJobActive(selectedJob) ? 'Apply Now' : 'Application Closed';

  const perksAndBenefitsList = useMemo(() => {
    if (!selectedJob) return [];
    const perks = Array.isArray(selectedJob.perksAndBenefits) ? selectedJob.perksAndBenefits.filter(Boolean) : [];
    const other = String(selectedJob.otherBenefits || '').trim();
    return other ? [...perks, other] : perks;
  }, [selectedJob]);

  const selectedCompanyJobs = useMemo(() => (Array.isArray(selectedCompany?.jobs) ? selectedCompany.jobs : []), [selectedCompany]);

  const selectedCompanyReviews = useMemo(
    () => (Array.isArray(selectedCompany?.reviews) ? selectedCompany.reviews : []),
    [selectedCompany]
  );
  const selectedCompanyPreviewReviews = selectedCompanyReviews.slice(0, 6);

  const selectedCompanyRating = Number(selectedCompany?.rating) || 0;
  const selectedCompanyReviewCount = Number(selectedCompany?.reviewCount) || selectedCompanyReviews.length || 0;

  const selectedCompanySocialLinks = useMemo(() => {
    if (!selectedCompany) return [];

    const items = [
      { key: 'facebook', label: 'Facebook', url: selectedCompany.facebookUrl, icon: 'facebook' },
      { key: 'instagram', label: 'Instagram', url: selectedCompany.instagramUrl, icon: 'instagram' },
      { key: 'linkedin', label: 'LinkedIn', url: selectedCompany.linkedinUrl, icon: 'linkedin' },
      { key: 'x', label: 'X / Twitter', url: selectedCompany.xUrl, icon: 'twitter' },
    ];

    return items.filter((item) => String(item.url || '').trim());
  }, [selectedCompany]);

  const selectedCompanyGallery = useMemo(() => {
    return Array.isArray(selectedCompany?.galleryImages) ? selectedCompany.galleryImages : [];
  }, [selectedCompany]);

  return (
    <JobSeekerLayout>
      <>
        <div className={UI.page}>
          <div className={UI.container}>
            {toast.message && (
              <div className={`${UI.alertBase} ${toast.type === 'error' ? UI.alertError : UI.alertSuccess} mb-5`} role="status" aria-live="polite">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold leading-6">{toast.message}</p>
                  <button
                    onClick={() => setToast({ type: '', message: '' })}
                    className={`${UI.btnBase} ${UI.btnSm} ${UI.btnGhost} ${UI.ring}`}
                    type="button"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            <div
              className="
                relative rounded-[26px]
                bg-gradient-to-r from-[#082764] via-[#244e7f] to-[#4a9fc3]
                p-6 sm:p-8 text-white shadow-sm overflow-hidden mb-6 -mt-10
              "
            >
              <div className="pointer-events-none absolute inset-0 z-0">
                <div
                  className="
                    absolute
                    w-[70px] sm:w-[110px] h-[70px] sm:h-[110px]
                    rounded-full blur-[28px] sm:blur-[38px]
                    bottom-[-55px] sm:bottom-[-70px]
                    right-[-40px]
                    opacity-60
                  "
                  style={{
                    background:
                      'radial-gradient(circle, rgba(110,231,183,0.25) 0%, rgba(110,231,183,0.12) 45%, transparent 75%)',
                  }}
                />
              </div>

              <img
                src="/images/myapplication1.png"
                alt=""
                className="
                  pointer-events-none absolute
                  right-[18px] sm:right-[28px]
                  top-1/2 -translate-y-1/2
                  w-44 h-44 sm:w-56 sm:h-56
                  object-contain opacity-60
                  mix-blend-soft-light saturate-120 z-0
                  hidden sm:block
                "
                style={{
                  WebkitMaskImage:
                    'radial-gradient(circle at 35% 50%, rgba(0,0,0,1) 0%, rgba(0,0,0,0.5) 55%, rgba(0,0,0,0) 80%)',
                  maskImage:
                    'radial-gradient(circle at 35% 50%, rgba(0,0,0,1) 0%, rgba(0,0,0,0.5) 55%, rgba(0,0,0,0) 80%)',
                }}
              />

              <div className="relative z-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div className="max-w-2xl">
                  <h1 className="mt-4 text-3xl sm:text-4xl lg:text-[42px] font-bold tracking-tight leading-tight">
                    {activeSection === 'jobs' ? 'My Saved Jobs' : 'My Saved Companies'}
                  </h1>

                  <p className="mt-3 text-sm sm:text-base text-white/90 leading-7 max-w-xl">
                    {activeSection === 'jobs' ? 'Your Handpicked Jobs and Companies Collection.' : 'Review your saved companies.'}
                  </p>

                  <p className="mt-4 text-xs sm:text-sm text-white/80 font-medium">
                    {activeSection === 'jobs'
                      ? loading
                        ? 'Loading saved jobs...'
                        : `${formatCountLabel(savedJobs.length, 'Saved Job')}`
                      : loadingCompanies
                      ? 'Loading saved companies...'
                      : `${formatCountLabel(savedCompanies.length, 'Saved Companie')}`}
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-5 flex items-center gap-6 border-b border-black/10">
              <button
                type="button"
                className={`${UI.tabBase} ${activeSection === 'jobs' ? UI.tabActive : UI.tabInactive}`}
                onClick={() => setActiveSection('jobs')}
                aria-current={activeSection === 'jobs' ? 'page' : undefined}
              >
                Jobs
              </button>

              <button
                type="button"
                className={`${UI.tabBase} ${activeSection === 'companies' ? UI.tabActive : UI.tabInactive}`}
                onClick={() => setActiveSection('companies')}
                aria-current={activeSection === 'companies' ? 'page' : undefined}
              >
                Companies
              </button>
            </div>

            {activeSection === 'jobs' ? (
              <div className={UI.grid}>
                <div className="min-w-0">
                  <div className="h-full rounded-2xl border border-black/10 overflow-hidden bg-[#FFFFFF] shadow-sm flex flex-col">
                    <div className="px-4 py-4 bg-[#2e66a6] text-white flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">{formatCountLabel(savedJobs.length, 'Saved Job')}</p>
                        <p className="text-xs text-white/75 mt-1">Your next opportunity is waiting</p>
                      </div>

                      <button
                        type="button"
                        className="text-sm font-medium hover:opacity-80 disabled:opacity-40"
                        disabled={savedJobs.length === 0}
                        onClick={async () => {
                          if (savedJobs.length === 0) return;

                          const confirmed = window.confirm('Remove all saved jobs from your bookmarks?');
                          if (!confirmed) return;

                          try {
                            await Promise.all(savedJobs.map((job) => api.delete(`/jobs/saved/${job._id}`)));
                            setSavedJobs([]);
                            setSelectedJobId('');
                            setToastMessage('success', 'All saved jobs removed.');
                          } catch {
                            setToastMessage('error', 'Failed to remove all saved jobs.');
                          }
                        }}
                      >
                        Remove All
                      </button>
                    </div>

                    {loading ? (
                      <div className="p-6">
                        <div className="space-y-4 animate-pulse motion-reduce:animate-none">
                          {[1, 2, 3].map((item) => (
                            <div key={item} className="flex items-start gap-3">
                              <div className="w-11 h-11 rounded-xl bg-black/10" />
                              <div className="flex-1 min-w-0">
                                <div className="h-4 bg-black/10 rounded w-3/4" />
                                <div className="h-3 bg-black/10 rounded w-1/2 mt-2" />
                                <div className="h-3 bg-black/10 rounded w-2/3 mt-2" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : savedJobs.length === 0 ? (
                      <div className="p-6 flex-1">
                        <div className="h-full min-h-[300px] rounded-2xl border border-dashed border-black/20 bg-black/[0.02] px-5 py-8 text-center flex flex-col items-center justify-center">
                          <img
                            src="/images/NoSaveJobs.png"
                            alt="No saved jobs"
                            className="mx-auto w-[150px] max-w-full h-auto object-contain"
                            draggable="false"
                          />

                          <h3 className="mt-4 text-base font-semibold text-[#000000]">No saved jobs yet</h3>
                        </div>
                      </div>
                    ) : (
                      savedJobs.map((job) => (
                        <BookmarkCard
                          key={job._id}
                          job={job}
                          selected={selectedJobId === job._id}
                          onClick={() => setSelectedJobId(job._id)}
                          onRemove={handleRemoveSavedJob}
                          removing={removingId === job._id}
                        />
                      ))
                    )}
                  </div>
                </div>

                <div className="min-w-0">
                  {savedJobs.length === 0 ? (
                    <div className={`${UI.card} min-h-[430px] px-6 py-12 flex items-center justify-center text-center`}>
                      <div className="mx-auto max-w-[460px]">
                        <img
                          src="/images/NoSaveJobs.png"
                          alt="No saved jobs"
                          className="mx-auto w-[230px] max-w-full h-auto object-contain"
                          draggable="false"
                        />

                        <h2 className="mt-5 text-xl font-semibold text-[#000000]">
                          No saved jobs yet
                        </h2>
                        <p className="mt-3 text-sm sm:text-[15px] text-black/70 leading-6">
                          You haven&apos;t saved any jobs.
                          <br />
                          Click &quot;Browse Jobs&quot; to start exploring opportunities and save jobs you want to revisit later.
                        </p>

                        <div className="mt-6">
                          <button
                            type="button"
                            onClick={() => navigate('/jobseeker/job-search')}
                            className={`${UI.btnBase} ${UI.btnMd} ${UI.btnPrimary} ${UI.ring}`}
                          >
                            Browse Jobs
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : !selectedJob ? (
                    <div className={`${UI.card} ${UI.pad}`}>
                      <h2 className={UI.h2}>No job selected</h2>
                      <p className={`mt-2 ${UI.body}`}>Select a saved job from the left panel to view its details.</p>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      <div className={`${UI.card} ${UI.pad}`}>
                        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                          <div className="flex items-start gap-4 min-w-0 flex-1">
                            <CompanyLogo src={selectedJob.companyLogo} name={selectedJob.companyName} size="lg" />

                            <div className="min-w-0 flex-1">
                              <h1 className={`${UI.h1} line-clamp-2`}>{selectedJob.title}</h1>

                              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                                <div className={`inline-flex items-center gap-2 ${UI.meta} min-w-0`}>
                                  <span className="text-black/55">
                                    <SvgIcon name="building" className="w-4 h-4" />
                                  </span>
                                  <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{selectedJob.companyName}</span>
                                </div>

                                <div className={`inline-flex items-center gap-2 ${UI.caption}`}>
                                  <span className="text-black/55">
                                    <SvgIcon name="location" className="w-4 h-4" />
                                  </span>
                                  <span>{formatLocationDisplay(selectedJob.location)}</span>
                                </div>
                              </div>

                              <div className="mt-4 flex flex-wrap gap-2">
                                {selectedJob.jobType && (
                                  <span className={UI.chip}>
                                    <SvgIcon name="briefcase" className="w-3.5 h-3.5" />
                                    {selectedJob.jobType}
                                  </span>
                                )}

                                {selectedJob.workMode && (
                                  <span className={UI.chip}>
                                    <SvgIcon name="building" className="w-3.5 h-3.5" />
                                    {formatWorkModeDisplay(selectedJob.workMode)}
                                  </span>
                                )}

                                {selectedJob.vacancies ? (
                                  <span className={UI.chip}>
                                    <SvgIcon name="users" className="w-3.5 h-3.5" />
                                    {`${selectedJob.vacancies} Vacancy`}
                                  </span>
                                ) : null}
                              </div>

                              <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-black/80">
                                <span className="text-black/55">
                                  <SvgIcon name="clock" className="w-4 h-4" />
                                </span>
                                <span>
                                  {formatPostedRelative(selectedJob.createdAt)}
                                  {selectedJob.applicationDeadline
                                    ? ` and deadline of application is on ${formatApplicationDeadlineDate(selectedJob.applicationDeadline)}`
                                    : ''}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col gap-3 w-full lg:w-[220px] shrink-0">
                            <button
                              type="button"
                              onClick={
                                hasApplied
                                  ? () => {
                                      navigate('/jobseeker/my-applications');
                                    }
                                  : isJobActive(selectedJob)
                                  ? handleApplyClick
                                  : undefined
                              }
                              disabled={(!isJobActive(selectedJob) && !hasApplied) || checkingApplied}
                              className={`${UI.btnBase} ${UI.btnLg} ${
                                !isJobActive(selectedJob) && !hasApplied
                                  ? 'bg-black/5 text-black/50 border border-black/10'
                                  : UI.btnPrimary
                              } ${UI.ring} w-full`}
                            >
                              {primaryCtaLabel}
                            </button>

                            <div className="grid grid-cols-2 gap-2 w-full">
                              <button
                                type="button"
                                onClick={() => handleRemoveSavedJob(selectedJob._id)}
                                disabled={removingId === selectedJob._id}
                                aria-label={`Remove ${selectedJob.title} from saved jobs`}
                                title="Saved — click to remove"
                                className={`${UI.btnBase} ${UI.btnSm} ${UI.btnSecondary} ${UI.ring} w-full text-[#2e66a6]`}
                              >
                                {removingId === selectedJob._id ? (
                                  <span className="inline-block w-4 h-4 rounded-full border-2 border-[#2e66a6]/25 border-t-[#2e66a6] animate-spin motion-reduce:animate-none" />
                                ) : (
                                  <SvgIcon name="bookmarkFilled" className="w-4 h-4 text-[#2e66a6]" />
                                )}
                                Saved
                              </button>

                              <button
                                type="button"
                                onClick={() => handleShareJob(selectedJob)}
                                className={`${UI.btnBase} ${UI.btnSm} ${UI.btnSecondary} ${UI.ring} w-full`}
                              >
                                <SvgIcon name="share" className="w-4 h-4" />
                                Share
                              </button>
                            </div>

                            {statusBadge ? (
                              <div className="mt-1 flex justify-start">
                                {statusBadge}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <div className={UI.detailsGrid}>
                        <div className={UI.metricsGrid}>
                          <TopMetricCard icon="money" title="Salary" value={formatSalary(selectedJob.salaryMin, selectedJob.salaryMax)} isPeso />
                          <TopMetricCard icon="clock" title="Experience" value={selectedJob.experienceLevel || 'No experience required'} />
                          <TopMetricCard icon="graduation" title="Educational Requirements" value={formatEducationDisplay(selectedJob.educationLevel)} />
                        </div>

                        <div className={UI.lowerGrid}>
                          <div className="min-w-0">
                            <div className="space-y-5">
                              <div className={UI.insetPanel}>
                                <div className={UI.insetHead}>
                                  <div className="flex items-center gap-2">
                                    <SvgIcon name="file" className="w-4 h-4 text-black/55" />
                                    <p className="text-sm font-semibold text-[#000000]">Job Details</p>
                                  </div>
                                </div>

                                <div className={`${UI.insetBody} space-y-8`}>
                                  <section>
                                    <h3 className={`${UI.h3} pt-1`}>Job Description</h3>
                                    <div className="mt-4 text-sm sm:text-[15px] text-black/75 leading-7">
                                      <RichTextContent
                                        value={selectedJob.description}
                                        fallback="No description provided."
                                      />
                                    </div>
                                  </section>

                                  <div className={UI.divider} />

                                  <section>
                                    <h3 className={`${UI.h3} pt-1`}>Qualification</h3>
                                    <div className="mt-4 text-sm sm:text-[15px] text-black/75 leading-7">
                                      <RichTextContent
                                        value={selectedJob.requirements}
                                        fallback="No requirements provided."
                                      />
                                    </div>
                                  </section>
                                </div>
                              </div>

                              <div className={UI.insetPanel}>
                                <div className={UI.insetHead}>
                                  <p className="text-sm font-semibold text-[#000000]">Perks and Benefits</p>
                                </div>

                                <div className={UI.insetBody}>
                                  {perksAndBenefitsList.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                      {perksAndBenefitsList.map((benefit, idx) => (
                                        <div
                                          key={`${benefit}-${idx}`}
                                          className="rounded-xl border border-black/10 bg-[#FFFFFF] px-4 py-3 text-sm text-black/75"
                                        >
                                          {benefit}
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className={UI.meta}>No perks or benefits specified</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="min-w-0 lg:sticky lg:top-24 lg:self-start">
                            <div className={UI.insetPanel}>
                              <div className={UI.insetHead}>
                                <p className="text-sm font-semibold text-[#000000]">Job Overview</p>
                              </div>

                              <div className={`${UI.insetBody} space-y-6`}>
                                <div>
                                  <p className={UI.caption}>Willing to Relocate?</p>
                                  <p className={`${UI.meta} mt-1`}>{getRelocationDisplayLabel(selectedJob.willingToRelocate)}</p>
                                </div>

                                <div>
                                  <p className={UI.caption}>Website / Company URL</p>
                                  {companyWebsiteUrl ? (
                                    <a
                                      href={companyWebsiteUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className={`inline-flex items-center gap-2 font-semibold text-[#2e66a6] hover:underline ${UI.ring} rounded mt-1`}
                                    >
                                      <span className="break-all">{companyWebsiteUrl}</span>
                                      <SvgIcon name="external" className="w-3.5 h-3.5" />
                                    </a>
                                  ) : (
                                    <p className={`${UI.meta} mt-1`}>N/A</p>
                                  )}
                                </div>

                                <div>
                                  <p className={UI.caption}>Required Skills</p>
                                  {Array.isArray(selectedJob.skillsRequired) && selectedJob.skillsRequired.length > 0 ? (
                                    <div className="mt-2 flex flex-wrap gap-2">
                                      {selectedJob.skillsRequired.map((skill, idx) => (
                                        <span
                                          key={`${skill}-${idx}`}
                                          className="px-2.5 py-1 rounded-full text-[11px] font-medium border border-black/10 bg-[#FFFFFF] text-black/75"
                                        >
                                          {skill}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className={`${UI.meta} mt-1`}>No skills specified</p>
                                  )}
                                </div>

                                <div>
                                  <p className={UI.caption}>Work Location</p>
                                  <div className="mt-2 rounded-xl border border-black/10 overflow-hidden bg-[#FFFFFF]">
                                    <StaticLocationMap job={selectedJob} heightClass="h-[160px]" />

                                    <div className="px-3 py-2.5 border-t border-black/10">
                                      <p className="text-xs text-black/70">{formatLocationDisplay(selectedJob.location)}</p>
                                    </div>
                                  </div>
                                </div>

                                <div className="rounded-2xl bg-[#f7faff] border border-[#d8e2ee] p-5 text-center shadow-[0_14px_32px_rgba(46,102,166,0.08)]">
                                  <h3 className="text-sm font-bold text-black/55">Interested in this role?</h3>

                                  <button
                                    onClick={hasApplied ? () => navigate('/jobseeker/my-applications') : isJobActive(selectedJob) ? handleApplyClick : undefined}
                                    disabled={(!isJobActive(selectedJob) && !hasApplied) || checkingApplied}
                                    className={`w-full mt-4 h-12 rounded-xl text-base font-bold transition-all duration-200 ${UI.ring} ${
                                      !isJobActive(selectedJob) && !hasApplied
                                        ? 'bg-black/5 text-black/50 border border-black/10 cursor-not-allowed'
                                        : hasApplied
                                        ? 'bg-[#eaf2fb] text-[#2e66a6] border border-[#d8e2ee]'
                                        : 'bg-[#2e66a6] text-white hover:bg-[#25578f] shadow-[0_14px_28px_rgba(46,102,166,0.22)]'
                                    }`}
                                    type="button"
                                  >
                                    {primaryCtaLabel}
                                  </button>

                                  <p className="mt-4 text-xs text-black/45">
                                    {selectedJob.applicationDeadline
                                      ? `Deadline: ${new Date(selectedJob.applicationDeadline).toLocaleDateString('en-US', {
                                          month: 'long',
                                          day: 'numeric',
                                          year: 'numeric',
                                        })}`
                                      : 'Deadline not specified'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className={UI.grid}>
                <div className="min-w-0">
                  <div className="h-full rounded-2xl border border-black/10 overflow-hidden bg-[#FFFFFF] shadow-sm flex flex-col">
                    <div className="px-4 py-4 bg-[#2e66a6] text-white flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">{formatCountLabel(savedCompanies.length, 'Saved Companie')}</p>
                        <p className="text-xs text-white/75 mt-1">Discover employers you'll love.</p>
                      </div>

                      <button
                        type="button"
                        className="text-sm font-medium hover:opacity-80 disabled:opacity-40"
                        disabled={savedCompanies.length === 0}
                        onClick={async () => {
                          if (savedCompanies.length === 0) return;

                          const confirmed = window.confirm('Remove all saved companies from your bookmarks?');
                          if (!confirmed) return;

                          try {
                            try {
                              await api.delete('/companies/saved');
                            } catch {
                              setLocalSavedCompanies([]);
                            }

                            setSavedCompanies([]);
                            setSelectedCompanyId('');
                            setToastMessage('success', 'All saved companies removed.');
                          } catch {
                            setToastMessage('error', 'Failed to remove all saved companies.');
                          }
                        }}
                      >
                        Remove All
                      </button>
                    </div>

                    {loadingCompanies ? (
                      <div className="p-6">
                        <div className="space-y-4 animate-pulse motion-reduce:animate-none">
                          {[1, 2, 3].map((item) => (
                            <div key={item} className="flex items-start gap-3">
                              <div className="w-11 h-11 rounded-xl bg-black/10" />
                              <div className="flex-1 min-w-0">
                                <div className="h-4 bg-black/10 rounded w-3/4" />
                                <div className="h-3 bg-black/10 rounded w-1/2 mt-2" />
                                <div className="h-3 bg-black/10 rounded w-2/3 mt-2" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : savedCompanies.length === 0 ? (
                      <EmptyCompanyBookmarks />
                    ) : (
                      savedCompanies.map((company) => (
                        <SavedCompanyCard
                          key={company._id}
                          company={company}
                          selected={selectedCompanyId === company._id}
                          onClick={() => {
                            setSelectedCompanyId(company._id);
                            setActiveCompanyTab('about');
                          }}
                          onRemove={handleRemoveSavedCompany}
                          removing={removingCompanyId === company._id}
                        />
                      ))
                    )}
                  </div>
                </div>

                <div className="min-w-0">
                  {savedCompanies.length === 0 ? (
                    <div className={`${UI.card} min-h-[430px] px-6 py-12 flex items-center justify-center text-center`}>
                      <div className="mx-auto max-w-[460px]">
                        <img
                          src="/images/NoSavedCompanies.png"
                          alt="No saved companies"
                          className="mx-auto w-[180px] h-auto object-contain"
                          draggable="false"
                        />

                        <h2 className="mt-5 text-xl font-semibold text-[#000000]">
                          No saved companies yet
                        </h2>
                        <p className="mt-3 text-sm sm:text-[15px] text-black/70 leading-6">
                          You haven&apos;t saved any companies.
                          <br />
                          Click &quot;Browse Companies&quot; to start exploring companies and save companies you want to revisit later.
                        </p>

                        <div className="mt-6">
                          <button
                            type="button"
                            onClick={() => navigate('/jobseeker/companies')}
                            className={`${UI.btnBase} ${UI.btnMd} ${UI.btnPrimary} ${UI.ring}`}
                          >
                            Browse Companies
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : !selectedCompany ? (
                    <div className={`${UI.card} ${UI.pad}`}>
                      <h2 className={UI.h2}>No company selected</h2>
                      <p className={`mt-2 ${UI.body}`}>Select a saved company from the left panel to view its details.</p>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      <div className={`${UI.card} ${UI.pad}`}>
                        <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-6">
                          <div className="flex items-start gap-4 flex-1 min-w-0">
                            <CompanyLogo src={selectedCompany.companyLogo} name={selectedCompany.companyName} size="xl" />

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 min-w-0">
                                <h1 className="min-w-0 truncate text-[28px] sm:text-[32px] leading-tight font-bold text-black">
                                  {selectedCompany.companyName || 'Company'}
                                </h1>
                                <img
                                  src="/images/checkmo.png"
                                  alt="Verified"
                                  className="w-5 h-5 object-contain flex-shrink-0"
                                  draggable="false"
                                />
                              </div>

                              <div className="mt-2 flex items-center gap-2 text-[15px] text-black/60">
                                <span className="text-black/50">
                                  <SvgIcon name="industry" className="w-4 h-4" />
                                </span>
                                <span>{selectedCompany.industry || 'Industry not specified'}</span>
                              </div>

                              <div className="mt-2 flex items-center gap-2 text-[15px] text-black/65">
                                <span className="text-black/50">
                                  <SvgIcon name="location" className="w-4 h-4" />
                                </span>
                                <span>{formatLocationDisplay(selectedCompany.companyAddress || selectedCompany.location)}</span>
                              </div>

                              {selectedCompany.companyWebsite && (
                                <div className="mt-2">
                                  <a
                                    href={ensureUrlProtocol(selectedCompany.companyWebsite)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 text-[15px] text-[#2e66a6] hover:underline break-all"
                                  >
                                    <span className="text-black/50">
                                      <SvgIcon name="link" className="w-4 h-4" />
                                    </span>
                                    <span>{selectedCompany.companyWebsite}</span>
                                    <SvgIcon name="external" className="w-4 h-4" />
                                  </a>
                                </div>
                              )}

                              <div className="mt-4 flex items-center gap-2 flex-wrap">
                                <StarRating rating={selectedCompanyRating} />
                                <span className="text-[15px] text-black/80">{Number(selectedCompanyRating).toFixed(1)}</span>
                                <span className="text-[14px] text-black/50">({selectedCompanyReviewCount} reviews)</span>
                              </div>
                            </div>
                          </div>

                          <div className="w-full xl:w-auto xl:min-w-[210px] xl:self-start">
                            <div className="flex flex-col items-stretch xl:items-end gap-3">
                              <button
                                type="button"
                                onClick={handleOpenCompanyReviewModal}
                                className={`${UI.btnBase} ${UI.btnMd} ${UI.btnPrimary} ${UI.ring} w-full xl:w-[210px]`}
                              >
                                <SvgIcon name="edit" className="w-4 h-4" />
                                Write a Review
                              </button>

                              <div className="flex items-center gap-2 w-full xl:w-auto">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveSavedCompany(selectedCompany._id)}
                                  disabled={removingCompanyId === selectedCompany._id}
                                  className={`${UI.btnBase} ${UI.btnMd} ${UI.btnSecondary} ${UI.ring} flex-1 text-[#2e66a6] xl:flex-none xl:w-[100px]`}
                                >
                                  {removingCompanyId === selectedCompany._id ? (
                                    <span className="inline-block w-4 h-4 rounded-full border-2 border-black/20 border-t-black/70 animate-spin motion-reduce:animate-none" />
                                  ) : (
                                    <SvgIcon name="bookmarkFilled" className="w-5 h-5 text-[#2e66a6]" />
                                  )}
                                  Saved
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleShareCompany(selectedCompany)}
                                  className={`${UI.btnBase} ${UI.btnMd} ${UI.btnSecondary} ${UI.ring} flex-1 xl:flex-none xl:w-[100px]`}
                                >
                                  <SvgIcon name="share" className="w-5 h-5" />
                                  Share
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-6 border-t border-black/10 pt-5">
                          <div className="flex flex-wrap items-center gap-3">
                            <CompanyTabButton
                              active={activeCompanyTab === 'about'}
                              onClick={() => setActiveCompanyTab('about')}
                            >
                              About
                            </CompanyTabButton>

                            <CompanyTabButton
                              active={activeCompanyTab === 'jobs'}
                              onClick={() => setActiveCompanyTab('jobs')}
                              badge={selectedCompanyJobs.length}
                            >
                              Jobs
                            </CompanyTabButton>

                            <CompanyTabButton
                              active={activeCompanyTab === 'social'}
                              onClick={() => setActiveCompanyTab('social')}
                              badge={selectedCompanySocialLinks.length}
                            >
                              Social Media
                            </CompanyTabButton>

                            <CompanyTabButton
                              active={activeCompanyTab === 'gallery'}
                              onClick={() => setActiveCompanyTab('gallery')}
                              badge={selectedCompanyGallery.length}
                            >
                              Gallery
                            </CompanyTabButton>

                            <CompanyTabButton
                              active={activeCompanyTab === 'reviews'}
                              onClick={() => setActiveCompanyTab('reviews')}
                              badge={selectedCompanyReviewCount}
                            >
                              Reviews
                            </CompanyTabButton>
                          </div>
                        </div>
                      </div>

                      {activeCompanyTab === 'about' && (
                        <div className={`${UI.card} ${UI.pad}`}>
                          <h2 className="text-[24px] font-bold text-black">About {selectedCompany.companyName || 'Company'}</h2>
                          <div className="mt-6 text-[17px] leading-8 text-black/80 whitespace-pre-line">{selectedCompany.about}</div>
                        </div>
                      )}

                      {activeCompanyTab === 'jobs' && (
                        <div className={`${UI.card} ${UI.pad}`}>
                          <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div>
                              <h2 className="text-[24px] font-bold text-black">Jobs at {selectedCompany.companyName || 'Company'}</h2>
                              <p className="mt-1 text-black/65 text-[16px]">
                                {selectedCompanyJobs.length} Open position{selectedCompanyJobs.length === 1 ? '' : 's'}
                              </p>
                            </div>

                            {selectedCompanyJobs.length > 6 ? (
                              <button
                                type="button"
                                onClick={() =>
                                  navigate(`/jobseeker/company-details/${selectedCompany._id}/jobs`)
                                }
                                className="text-[15px] font-medium text-black/70 hover:text-black inline-flex items-center gap-2"
                              >
                                View all jobs <span aria-hidden="true">→</span>
                              </button>
                            ) : null}
                          </div>

                          {selectedCompanyJobs.length === 0 ? (
                            <EmptyCompanyTabState
                              icon="briefcase"
                              title="No jobs available yet."
                              description="This company has not posted any open positions yet. Please check back later."
                            />
                          ) : (
                            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6">
                              {selectedCompanyJobs.map((job) => {
                                const jobId = job?._id || job?.id;
                                const isSavedJob = savedJobs.some((savedJob) => String(savedJob._id || savedJob.id) === String(jobId));
                                const alreadyApplied = Boolean(appliedMap?.[jobId]?.hasApplied);

                                return (
                                  <CompanyJobMiniCard
                                    key={jobId}
                                    job={job}
                                    onViewDetails={() =>
                                      navigate(`/jobseeker/job-details/${jobId}`, {
                                        state: { sourcePage: 'bookmarks' },
                                      })
                                    }
                                    onApply={handleApplyFromCompanyJob}
                                    onSave={handleSaveJobFromCompanyTab}
                                    saving={String(savingJobId) === String(jobId)}
                                    isSaved={isSavedJob}
                                    alreadyApplied={alreadyApplied}
                                  />
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {activeCompanyTab === 'social' && (
                        <div className={`${UI.card} ${UI.pad}`}>
                          <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div>
                              <h2 className="text-[24px] font-bold text-black">Social Media</h2>
                              <p className="mt-1 text-black/65 text-[16px]">
                                Official company links and online presence
                              </p>
                            </div>
                          </div>

                          {selectedCompanySocialLinks.length === 0 ? (
                            <EmptyCompanyTabState
                              icon="link"
                              title="No social accounts linked yet."
                              description="This company has not added any social media links yet."
                            />
                          ) : (
                            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                              {selectedCompanySocialLinks.map((item) => (
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

                      {activeCompanyTab === 'gallery' && (
                        <div className={`${UI.card} ${UI.pad}`}>
                          <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div>
                              <h2 className="text-[24px] font-bold text-black">Gallery</h2>
                              <p className="mt-1 text-black/65 text-[16px]">
                                Photos and visual highlights from {selectedCompany.companyName || 'this company'}
                              </p>
                            </div>
                          </div>

                          {selectedCompanyGallery.length === 0 ? (
                            <EmptyCompanyTabState
                              icon="image"
                              title="No photos added yet."
                              description="This company has not uploaded any company photos yet."
                            />
                          ) : (
                            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                              {selectedCompanyGallery.map((item, index) => (
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

                      {activeCompanyTab === 'reviews' && (
                        <div className={`${UI.card} ${UI.pad}`}>
                          <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div>
                              <h2 className="text-[24px] font-bold text-black">
                                Application process at {selectedCompany.companyName || 'Company'}
                              </h2>
                              <p className="mt-1 text-black/65 text-[16px]">
                                {selectedCompanyReviewCount} review{selectedCompanyReviewCount === 1 ? '' : 's'}
                              </p>
                            </div>

                            {selectedCompanyReviewCount > 6 ? (
                              <button
                                type="button"
                                onClick={() =>
                                  navigate(`/jobseeker/company-details/${selectedCompany._id}/reviews`)
                                }
                                className="text-[15px] font-medium text-[#2e66a6] hover:text-[#25578f] inline-flex items-center gap-2"
                              >
                                See all reviews <span aria-hidden="true">→</span>
                              </button>
                            ) : null}
                          </div>

                          <div className="mt-6 space-y-5">
                            {selectedCompanyReviews.length === 0 ? (
                              <EmptyCompanyTabState
                                icon="edit"
                                title="No reviews yet."
                                description="Be the first to share your hiring process experience with this company."
                              />
                            ) : (
                              selectedCompanyPreviewReviews.map((review) => (
                                <article
                                  key={review.id || review._id}
                                  className="rounded-2xl border border-[#dfe6ee] bg-white px-5 py-5 sm:px-6"
                                >
                                  <div className="flex items-start justify-between gap-4 flex-wrap">
                                    <div className="flex items-start gap-3 min-w-0">
                                      <div className="w-11 h-11 rounded-xl border border-[#dfe6ee] bg-[#f7faff] flex items-center justify-center shrink-0">
                                        <SvgIcon name="industry" className="w-5 h-5 text-black/45" />
                                      </div>

                                      <div className="min-w-0">
                                        <h3 className="text-[16px] font-bold text-black">
                                          {review.reviewerName || 'Anonymous User'}
                                        </h3>
                                        <p className="mt-1 text-[14px] text-black/55">
                                          {review.roleAppliedFor || 'Role not specified'}
                                          {review.date ? ` · ${review.date}` : ''}
                                        </p>
                                      </div>
                                    </div>

                                    {review.outcome ? (
                                      <span
                                        className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${getOutcomeBadgeClass(
                                          review.outcome
                                        )}`}
                                      >
                                        {getOutcomeLabel(review.outcome)}
                                      </span>
                                    ) : null}
                                  </div>

                                  <p className="mt-5 text-[16px] leading-7 text-black/80">
                                    {review.message}
                                  </p>

                                  <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                                    <div className="rounded-xl border border-[#dfe6ee] bg-[#fbfcfe] px-4 py-3">
                                      <p className="text-sm text-black/50">First reply</p>
                                      <p className="mt-1 text-[18px] font-bold text-black">
                                        {review.daysToFirstResponse ?? 0}d
                                      </p>
                                    </div>

                                    <div className="rounded-xl border border-[#dfe6ee] bg-[#fbfcfe] px-4 py-3">
                                      <p className="text-sm text-black/50">Total length</p>
                                      <p className="mt-1 text-[18px] font-bold text-black">
                                        {review.totalProcessDays ?? 0}d
                                      </p>
                                    </div>

                                    <div className="rounded-xl border border-[#dfe6ee] bg-[#fbfcfe] px-4 py-3">
                                      <p className="text-sm text-black/50">Process</p>
                                      <p className="mt-1 text-[18px] font-bold text-black">
                                        {Number(review.processRating ?? review.rating ?? 0)}/5
                                      </p>
                                    </div>

                                    <div className="rounded-xl border border-[#dfe6ee] bg-[#fbfcfe] px-4 py-3">
                                      <p className="text-sm text-black/50">Apply again?</p>
                                      <p className="mt-1 text-[18px] font-bold text-black">
                                        {review.wouldApplyAgain === null || review.wouldApplyAgain === undefined
                                          ? 'Not specified'
                                          : review.wouldApplyAgain
                                          ? 'Yes'
                                          : 'No'}
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
                  )}
                </div>
              </div>
            )}

            <div className={UI.srOnly} aria-live="polite" aria-atomic="true">
              {toast.message}
            </div>
          </div>
        </div>

        {removeJobModal.isOpen &&
          ReactDOM.createPortal(
            <div className="fixed inset-0 z-[9999]">
              <div
                className="absolute inset-0 bg-black/30 backdrop-blur-[1px]"
                onClick={closeRemoveJobModal}
                aria-hidden="true"
              />

              <div className="relative flex min-h-screen items-center justify-center p-4">
                <div
                  className="w-full max-w-[460px] rounded-2xl border border-black/10 bg-white shadow-2xl"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="removeSavedJobTitle"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="px-6 pb-6 pt-7 sm:px-7">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#2e66a6]/10 text-[#2e66a6]">
                      <SvgIcon name="bookmarkFilled" className="h-6 w-6" />
                    </div>

                    <h3
                      id="removeSavedJobTitle"
                      className="mt-4 text-center text-xl font-bold text-black"
                    >
                      Remove Saved Job?
                    </h3>

                    <p className="mt-2 text-center text-sm leading-6 text-black/60">
                      Are you sure you want to remove{' '}
                      <span className="font-semibold text-black">
                        “{removeJobModal.jobTitle}”
                      </span>{' '}
                      from your saved jobs?
                    </p>

                    <div className="mt-6 flex gap-3">
                      <button
                        type="button"
                        onClick={closeRemoveJobModal}
                        disabled={Boolean(removingId)}
                        className={`${UI.btnBase} ${UI.btnMd} ${UI.btnSecondary} ${UI.ring} flex-1`}
                      >
                        Cancel
                      </button>

                      <button
                        type="button"
                        onClick={confirmRemoveSavedJob}
                        disabled={Boolean(removingId)}
                        className={`${UI.btnBase} ${UI.btnMd} ${UI.btnPrimary} ${UI.ring} flex-1`}
                      >
                        {removingId ? (
                          <>
                            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white motion-reduce:animate-none" />
                            Removing
                          </>
                        ) : (
                          'Remove'
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )}

        {removeCompanyModal.isOpen &&
          ReactDOM.createPortal(
            <div className="fixed inset-0 z-[9999]">
              <div
                className="absolute inset-0 bg-black/30 backdrop-blur-[1px]"
                onClick={closeRemoveCompanyModal}
                aria-hidden="true"
              />

              <div className="relative flex min-h-screen items-center justify-center p-4">
                <div
                  className="w-full max-w-[460px] rounded-2xl border border-black/10 bg-white shadow-2xl"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="removeSavedCompanyTitle"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="px-6 pb-6 pt-7 sm:px-7">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#2e66a6]/10 text-[#2e66a6]">
                      <SvgIcon name="bookmarkFilled" className="h-6 w-6" />
                    </div>

                    <h3
                      id="removeSavedCompanyTitle"
                      className="mt-4 text-center text-xl font-bold text-black"
                    >
                      Remove Saved Company?
                    </h3>

                    <p className="mt-2 text-center text-sm leading-6 text-black/60">
                      Are you sure you want to remove{' '}
                      <span className="font-semibold text-black">
                        “{removeCompanyModal.companyName}”
                      </span>{' '}
                      from your saved companies?
                    </p>

                    <div className="mt-6 flex gap-3">
                      <button
                        type="button"
                        onClick={closeRemoveCompanyModal}
                        disabled={Boolean(removingCompanyId)}
                        className={`${UI.btnBase} ${UI.btnMd} ${UI.btnSecondary} ${UI.ring} flex-1`}
                      >
                        Cancel
                      </button>

                      <button
                        type="button"
                        onClick={confirmRemoveSavedCompany}
                        disabled={Boolean(removingCompanyId)}
                        className={`${UI.btnBase} ${UI.btnMd} ${UI.btnPrimary} ${UI.ring} flex-1`}
                      >
                        {removingCompanyId ? (
                          <>
                            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white motion-reduce:animate-none" />
                            Removing
                          </>
                        ) : (
                          'Remove'
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )}

        <ApplyJobModal
          isOpen={showApplyModal}
          onClose={() => {
            closeApplyModal();
            fetchSavedJobs();
            fetchSavedCompanies();
          }}
          job={modalJob}
          onApplicationSubmitted={() => {
            const jobId = modalJob?._id || modalJob?.id;

            if (jobId) {
              setAppliedMap((prev) => ({
                ...prev,
                [jobId]: {
                  hasApplied: true,
                  applicationStatus: 'pending',
                },
              }));
            }

            fetchSavedJobs();
            fetchSavedCompanies();
          }}
        />

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
                      value={selectedCompany?.companyName || ""}
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

      </>
    </JobSeekerLayout>
  );
};

export default Bookmarks;