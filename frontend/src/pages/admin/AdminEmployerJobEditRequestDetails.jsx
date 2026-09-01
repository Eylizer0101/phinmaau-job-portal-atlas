import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BriefcaseBusiness, CalendarClock, CalendarDays, ChevronRight, Clock3, ExternalLink, FileEdit, MapPin, RefreshCw, Search, UnlockKeyhole, Users, WalletCards, X } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import {
  BuildingIcon,
  FaGraduationCap,
  FileIcon,
  GlobeIcon,
  LocationIcon,
  MyApplicationsSvgIcon,
} from '../../components/shared/JobseekerIcons';

const cn = (...classes) => classes.filter(Boolean).join(' ');
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const formatDateInput = (date) => {
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return '';
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
};

const formatDateRangeLabel = (value) => {
  if (!value) return 'Select date';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return 'Select date';
  return date.toLocaleDateString('en-PH', { month: 'short', day: '2-digit', year: 'numeric' });
};

const addCalendarMonths = (date, amount) => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + amount);
  return next;
};

const getYearOptions = () => {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: currentYear - 1949 }, (_, index) => 1950 + index);
};

const CalendarMonth = ({ monthDate, startDate, endDate, onPickDate, onChangeMonth }) => {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const gridStart = new Date(year, month, 1 - firstWeekday);
  const start = startDate ? new Date(`${startDate}T00:00:00`) : null;
  const end = endDate ? new Date(`${endDate}T00:00:00`) : null;
  const days = Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + index);
    return day;
  });
  const isSameDay = (a, b) => a && b && a.toDateString() === b.toDateString();
  const inRange = (day) => start && end && day >= start && day <= end;

  return (
    <div className="min-w-0 flex-1">
      <div className="mb-4 grid grid-cols-[32px_1fr_32px] items-center gap-2">
        <button type="button" onClick={() => onChangeMonth(addCalendarMonths(monthDate, -1))} className="flex h-8 w-8 items-center justify-center rounded-lg text-2xl text-slate-600 hover:bg-slate-100" aria-label="Previous month">‹</button>
        <div className="grid grid-cols-[1fr_92px] gap-2">
          <select value={month} onChange={(event) => onChangeMonth(new Date(year, Number(event.target.value), 1))} className="h-10 rounded-lg border border-slate-200 bg-white px-2 text-center text-sm font-extrabold text-[#2e66a6] outline-none focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/20" aria-label="Select month">
            {MONTH_NAMES.map((name, index) => <option key={name} value={index}>{name}</option>)}
          </select>
          <select value={year} onChange={(event) => onChangeMonth(new Date(Number(event.target.value), month, 1))} className="h-10 rounded-lg border border-slate-200 bg-white px-2 text-center text-sm font-extrabold text-[#2e66a6] outline-none focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/20" aria-label="Select year">
            {getYearOptions().map((yearOption) => <option key={yearOption} value={yearOption}>{yearOption}</option>)}
          </select>
        </div>
        <button type="button" onClick={() => onChangeMonth(addCalendarMonths(monthDate, 1))} className="flex h-8 w-8 items-center justify-center rounded-lg text-2xl text-slate-600 hover:bg-slate-100" aria-label="Next month">›</button>
      </div>
      <div className="grid grid-cols-7 gap-y-2 text-center text-xs font-bold text-slate-500">
        {['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'].map((day) => <div key={day}>{day}</div>)}
      </div>
      <div className="mt-3 grid grid-cols-7 gap-y-1 text-center text-sm text-slate-600">
        {days.map((day) => {
          const value = formatDateInput(day);
          const outside = day.getMonth() !== month;
          const selected = isSameDay(day, start) || isSameDay(day, end);
          return (
            <button type="button" key={value} onClick={() => onPickDate(value)} className={cn(
              'mx-auto flex h-10 w-full items-center justify-center transition focus:outline-none focus:ring-2 focus:ring-[#2e66a6]/20',
              outside ? 'text-slate-300' : 'text-slate-700',
              inRange(day) ? 'bg-[#2e66a6]/10 text-[#2e66a6]' : '',
              selected ? 'rounded-lg bg-[#2e66a6] font-extrabold text-white shadow-md' : 'hover:bg-[#2e66a6]/10'
            )}>{day.getDate()}</button>
          );
        })}
      </div>
    </div>
  );
};

const CustomDateRangeModal = ({ open, startDate, endDate, onCancel, onApply }) => {
  const todayValue = formatDateInput(new Date());
  const initialStart = startDate || todayValue;
  const initialEnd = endDate || todayValue;
  const [draftStart, setDraftStart] = useState(initialStart);
  const [draftEnd, setDraftEnd] = useState(initialEnd);
  const [leftMonth, setLeftMonth] = useState(new Date(`${initialStart}T00:00:00`));
  const [rightMonth, setRightMonth] = useState(new Date(`${initialEnd}T00:00:00`));

  useEffect(() => {
    if (!open) return;
    const nextStart = startDate || formatDateInput(new Date());
    const nextEnd = endDate || nextStart;
    setDraftStart(nextStart);
    setDraftEnd(nextEnd);
    setLeftMonth(new Date(`${nextStart}T00:00:00`));
    setRightMonth(new Date(`${nextEnd}T00:00:00`));
  }, [open, startDate, endDate]);

  if (!open) return null;

  const pickDate = (value) => {
    if (!draftStart || (draftStart && draftEnd)) {
      setDraftStart(value);
      setDraftEnd('');
    } else if (new Date(`${value}T00:00:00`) < new Date(`${draftStart}T00:00:00`)) {
      setDraftEnd(draftStart);
      setDraftStart(value);
    } else {
      setDraftEnd(value);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 px-4 py-6" role="dialog" aria-modal="true" aria-label="Select custom date range">
      <div className="w-full max-w-[920px] overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="grid gap-6 px-6 pb-5 pt-6 md:grid-cols-[1fr_auto_1fr] md:items-end">
          <div><div className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-500">Start Date</div><div className="flex h-14 items-center gap-3 rounded-xl bg-slate-100 px-5 text-xl font-extrabold text-[#2e66a6]"><CalendarDays size={20} />{formatDateRangeLabel(draftStart)}</div></div>
          <div className="hidden pb-4 text-3xl text-slate-500 md:block">→</div>
          <div><div className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-500">End Date</div><div className="flex h-14 items-center gap-3 rounded-xl bg-slate-100 px-5 text-xl font-extrabold text-[#2e66a6]"><CalendarDays size={20} />{formatDateRangeLabel(draftEnd)}</div></div>
        </div>
        <div className="grid gap-8 px-6 pb-5 md:grid-cols-2">
          <CalendarMonth monthDate={leftMonth} startDate={draftStart} endDate={draftEnd} onPickDate={pickDate} onChangeMonth={setLeftMonth} />
          <CalendarMonth monthDate={rightMonth} startDate={draftStart} endDate={draftEnd} onPickDate={pickDate} onChangeMonth={setRightMonth} />
        </div>
        <div className="flex items-center justify-end gap-5 border-t border-slate-100 px-6 py-5">
          <button type="button" onClick={onCancel} className="text-base font-bold text-slate-600 transition hover:text-slate-900">Cancel</button>
          <button type="button" onClick={() => draftStart && draftEnd && onApply(draftStart, draftEnd)} disabled={!draftStart || !draftEnd} className="h-12 rounded-xl bg-[#2e66a6] px-9 text-base font-extrabold text-white shadow-lg shadow-[#2e66a6]/25 transition hover:bg-[#255487] disabled:cursor-not-allowed disabled:opacity-60">Apply Range</button>
        </div>
      </div>
    </div>
  );
};

const API_ORIGIN = 'https://phinmaau-job-portal-atlas.onrender.com';
const assetUrl = (value, fallback = '/images/jobback.png') => {
  const source = String(value || '').trim();
  if (!source) return fallback;
  if (/^(https?:|data:|blob:)/i.test(source)) return source;
  return `${API_ORIGIN}${source.startsWith('/') ? '' : '/'}${source}`;
};

const formatDateTime = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Not specified';
};

const formatDate = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) : 'Not specified';
};

const salary = (job) => {
  if (job?.hideSalary) return 'Salary not disclosed';
  const format = (value) => Number(value).toLocaleString('en-PH');
  if (Number.isFinite(job?.salaryMin) && Number.isFinite(job?.salaryMax)) return `${format(job.salaryMin)} – ${format(job.salaryMax)}`;
  return Number.isFinite(job?.salaryMin) ? `From ${format(job.salaryMin)}` : Number.isFinite(job?.salaryMax) ? `Up to ${format(job.salaryMax)}` : 'Not specified';
};

const formatPostedRelative = (value) => {
  if (!value) return 'Posted recently';
  const posted = new Date(value);
  if (Number.isNaN(posted.getTime())) return 'Posted recently';

  const diff = Date.now() - posted.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;
  const year = 365 * day;

  if (diff < minute) return 'Posted just now';
  if (diff < hour) {
    const count = Math.floor(diff / minute);
    return `Posted ${count} minute${count === 1 ? '' : 's'} ago`;
  }
  if (diff < day) {
    const count = Math.floor(diff / hour);
    return `Posted ${count} hour${count === 1 ? '' : 's'} ago`;
  }
  if (diff < week) {
    const count = Math.floor(diff / day);
    return `Posted ${count} day${count === 1 ? '' : 's'} ago`;
  }
  if (diff < month) {
    const count = Math.floor(diff / week);
    return `Posted ${count} week${count === 1 ? '' : 's'} ago`;
  }
  if (diff < year) {
    const count = Math.floor(diff / month);
    return `Posted ${count} month${count === 1 ? '' : 's'} ago`;
  }

  const count = Math.floor(diff / year);
  return `Posted ${count} year${count === 1 ? '' : 's'} ago`;
};

const getRelocationDisplayLabel = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'yes - willing to relocate') return 'Willing to relocate';
  if (normalized === 'no - position is fixed location') return 'Fixed location';
  if (normalized === 'open to relocation if necessary') return 'Possible to relocate';
  return String(value || '').trim() || 'Relocation preference not specified';
};

const normalizeExternalUrl = (value = '') => {
  const cleanValue = String(value || '').trim();
  if (!cleanValue || cleanValue.toLowerCase() === 'n/a' || cleanValue.toLowerCase() === 'not provided') return '';
  return /^https?:\/\//i.test(cleanValue) ? cleanValue : `https://${cleanValue}`;
};

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
    .querySelectorAll('script, style, iframe, object, embed, form, input, button, textarea, select, option, link, meta, base')
    .forEach((node) => node.remove());

  doc.body.querySelectorAll('*').forEach((element) => {
    [...element.attributes].forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const rawValue = String(attribute.value || '').trim();
      const valueText = rawValue.toLowerCase();

      if (
        name.startsWith('on') ||
        name === 'srcdoc' ||
        name === 'class' ||
        name === 'style' ||
        ((name === 'href' || name === 'src') &&
          (valueText.startsWith('javascript:') || valueText.startsWith('data:text/html')))
      ) {
        element.removeAttribute(attribute.name);
      }
    });

    if (element.tagName === 'A') {
      element.setAttribute('target', '_blank');
      element.setAttribute('rel', 'noopener noreferrer');
    }
  });

  return doc.body.innerHTML;
};

const RichTextContent = ({ value, fallback }) => {
  const sanitizedHtml = useMemo(() => sanitizeRichTextHtml(value || fallback || ''), [value, fallback]);

  return (
    <div
      className="break-words [&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1 [&_strong]:font-bold [&_b]:font-bold [&_em]:italic [&_i]:italic [&_u]:underline [&_a]:text-[#2e66a6] [&_a]:underline"
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
};

const UI = {
  page: 'min-h-screen bg-white',
  container: 'mx-auto w-full max-w-6xl px-4 pb-10 sm:px-6 lg:px-8',
  card: 'w-full rounded-2xl border border-[#e6edf5] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)]',
  sectionCard: 'w-full overflow-hidden rounded-xl border border-[#e6edf5] bg-white shadow-[0_4px_16px_rgba(15,23,42,0.04)]',
  metricCard: 'h-full min-h-[96px] rounded-xl border border-[#d9e2ec] bg-white px-4 py-4 shadow-[0_4px_14px_rgba(15,23,42,0.08)]',
  insetHead: 'border-b border-[#e6edf5] bg-[#f8fafc] px-5 py-3.5 sm:px-6',
  insetBody: 'px-5 py-5 sm:px-6',
  label: 'text-sm font-semibold text-black',
  value: 'mt-1 text-[15px] leading-6 text-black',
  title: 'text-base font-bold text-black',
  muted: 'text-sm text-black/60',
  chip: 'inline-flex items-center gap-2 rounded-full border border-[#d8e2ee] bg-[#f7faff] px-3 py-1.5 text-xs font-semibold text-black/80',
  skillChip: 'rounded-xl border border-[#d9e2ec] bg-white px-4 py-3 text-sm text-black/75',
};


const SvgIcon = ({ name, className = 'h-4 w-4' }) => {
  switch (name) {
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
    default:
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" strokeWidth="1.6" />
        </svg>
      );
  }
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

  if (cleanAddress) {
    return `https://www.openstreetmap.org/search?query=${encodeURIComponent(cleanAddress)}`;
  }

  return 'https://www.openstreetmap.org';
};

const StaticLocationMap = ({ job, heightClass = 'h-[180px]' }) => {
  const savedCoords = getJobCoordinates(job);
  const address = String(job?.location || '').trim();
  const [resolvedCoords, setResolvedCoords] = useState(
    isUsableCoordinates(savedCoords) ? savedCoords : null
  );
  const [lookupDone, setLookupDone] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const runLookup = async () => {
      if (isUsableCoordinates(savedCoords)) {
        setResolvedCoords(savedCoords);
        setLookupDone(true);
        return;
      }

      if (!address) {
        setResolvedCoords(null);
        setLookupDone(true);
        return;
      }

      try {
        const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=ph&accept-language=en&q=${encodeURIComponent(address)}`;
        const response = await fetch(url);
        const data = await response.json();
        const first = Array.isArray(data) ? data[0] : null;
        const lat = Number(first?.lat);
        const lng = Number(first?.lon);

        if (!cancelled && Number.isFinite(lat) && Number.isFinite(lng)) {
          setResolvedCoords({
            lat: Number(lat.toFixed(6)),
            lng: Number(lng.toFixed(6)),
          });
        } else if (!cancelled) {
          setResolvedCoords(null);
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
  }, [address, savedCoords?.lat, savedCoords?.lng]);

  const openMapUrl = buildOpenStreetMapUrl({
    coords: resolvedCoords || savedCoords,
    address,
  });

  if (!isUsableCoordinates(resolvedCoords)) {
    return (
      <a
        href={openMapUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`${heightClass} relative flex w-full items-center justify-center bg-[#eef2f7] text-[#9ca3af] transition hover:bg-[#e7edf5]`}
        title="Open work location in OpenStreetMap"
      >
        <div className="text-center px-4">
          <SvgIcon name="location" className="mx-auto h-8 w-8" />
          <p className="mt-2 text-xs text-[#6b7280]">
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
      className={`${heightClass} relative block w-full overflow-hidden bg-[#eef2f7] group`}
      title="Open work location in OpenStreetMap"
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

const TopMetricCard = ({ title, value, icon, isPeso = false, href = '' }) => (
  <article className={`${UI.metricCard} min-w-0`}>
    <div className="flex h-full min-w-0 items-start gap-3">
      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-[#d9dbe3] bg-[#f9fafb] text-[#6b7280]">
        {isPeso ? (
          <span className="text-sm font-bold">₱</span>
        ) : icon === 'globe' ? (
          <GlobeIcon className="h-4 w-4" />
        ) : (
          <SvgIcon name={icon} className="h-4 w-4" />
        )}
      </span>
      <div className="min-w-0">
        <p className={UI.label}>{title}</p>
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className="mt-1.5 block break-all text-[15px] font-semibold leading-6 text-[#2e66a6] hover:underline">
            {value}
          </a>
        ) : (
          <p className={UI.value}>{value}</p>
        )}
      </div>
    </div>
  </article>
);

const SectionHeader = ({ icon, title }) => (
  <div className="flex items-center gap-2">
    {icon ? (
      <span className="text-[#374151]">
        {icon === 'graduation' ? (
          <FaGraduationCap className="h-4 w-4" />
        ) : (
          <SvgIcon name={icon} className="h-4 w-4" />
        )}
      </span>
    ) : null}
    <h2 className={UI.title}>{title}</h2>
  </div>
);

const AdminEmployerJobEditRequestDetails = () => {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [approving, setApproving] = useState(false);
  const [notice, setNotice] = useState('');
  const [modalSearch, setModalSearch] = useState('');
  const [modalStatus, setModalStatus] = useState('pending');
  const [modalTime, setModalTime] = useState('all');
  const [modalSort, setModalSort] = useState('');
  const [showModalCustomDate, setShowModalCustomDate] = useState(false);
  const [modalDateFrom, setModalDateFrom] = useState('');
  const [modalDateTo, setModalDateTo] = useState('');

  useEffect(() => {
    let active = true;
    api.get(`/job-edit-requests/admin/${requestId}`).then(({ data }) => { if (active) setRequest(data?.request || null); })
      .catch((requestError) => { if (active) setError(requestError.response?.data?.message || 'Unable to load edit request details.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [requestId]);

  useEffect(() => {
    if (!modalOpen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const close = (event) => { if (event.key === 'Escape') setModalOpen(false); };
    window.addEventListener('keydown', close);
    return () => { document.body.style.overflow = previous; window.removeEventListener('keydown', close); };
  }, [modalOpen]);

  const job = request?.job || {};
  const company = job.companyName || request?.employer?.employerProfile?.companyName || 'Employer';
  const sections = Array.isArray(request?.requestedSections) ? request.requestedSections : [];
  const requestDateLabel = String(request?.status || '').toLowerCase() === 'pending'
    ? 'Request On'
    : 'Last edit request';
  const matchesModal = useMemo(() => {
    const query = modalSearch.trim().toLowerCase();
    const statusMatches = modalStatus === 'all' || request?.status === modalStatus;
    const created = request?.createdAt ? new Date(request.createdAt) : null;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let from = null;
    let to = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    if (modalTime === 'today') from = today;
    if (modalTime === 'yesterday') {
      from = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
      to = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 23, 59, 59, 999);
    }
    if (modalTime === 'week') {
      const offset = today.getDay() === 0 ? 6 : today.getDay() - 1;
      from = new Date(today.getFullYear(), today.getMonth(), today.getDate() - offset);
    }
    if (modalTime === 'sevenDays') from = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6);
    if (modalTime === 'month') from = new Date(now.getFullYear(), now.getMonth(), 1);
    if (modalTime === 'lastMonth') {
      from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      to = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);
    }
    if (modalTime === 'year') from = new Date(today.getFullYear(), 0, 1);
    if (modalTime === 'lastYear') {
      from = new Date(today.getFullYear() - 1, 0, 1);
      to = new Date(today.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
    }
    if (modalTime === 'custom') {
      from = modalDateFrom ? new Date(`${modalDateFrom}T00:00:00`) : null;
      to = modalDateTo ? new Date(`${modalDateTo}T23:59:59.999`) : null;
    }
    if (modalTime === 'all') to = null;
    const timeMatches = (!from || (created && !Number.isNaN(created.getTime()) && created >= from)) && (!to || (created && !Number.isNaN(created.getTime()) && created <= to));
    return statusMatches && timeMatches && (!query || sections.some((item) => item.toLowerCase().includes(query)) || String(request?.reason || '').toLowerCase().includes(query));
  }, [modalSearch, modalStatus, modalTime, modalDateFrom, modalDateTo, request, sections]);

  const openReviewModal = () => {
    setModalSearch('');
    setModalStatus('pending');
    setModalTime('all');
    setModalSort('');
    setModalDateFrom('');
    setModalDateTo('');
    setModalOpen(true);
  };

  const changeModalTime = (value) => {
    if (value === 'custom') {
      setShowModalCustomDate(true);
      return;
    }
    setModalTime(value);
    setModalDateFrom('');
    setModalDateTo('');
  };

  const approve = async () => {
    if (!request?._id || request.status !== 'pending' || approving) return;
    try {
      setApproving(true); setNotice('');
      const { data } = await api.patch(`/job-edit-requests/admin/${request._id}/approve`);
      setRequest((current) => ({ ...current, ...data?.request }));
      setNotice('Edit access approved. The employer can edit this job for one hour.');
      setModalOpen(false);
    } catch (requestError) { setNotice(requestError.response?.data?.message || 'Unable to approve this request.'); }
    finally { setApproving(false); }
  };

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><RefreshCw className="animate-spin text-blue-700" /></div>;
  if (error || !request) return <div className="mx-auto mt-10 max-w-xl rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-700">{error || 'Edit request not found.'}</div>;

  const employerProfile = request?.employer?.employerProfile || {};
  const website = String(
    employerProfile.companyWebsiteUrl ||
      employerProfile.companyWebsite ||
      employerProfile.website ||
      employerProfile.websiteUrl ||
      employerProfile.companyUrl ||
      employerProfile.companyURL ||
      ''
  ).trim();
  const requiredSkills = Array.isArray(job.skillsRequired) ? job.skillsRequired.filter(Boolean) : [];
  const perks = Array.isArray(job.perksAndBenefits) ? job.perksAndBenefits.filter(Boolean) : [];
  const otherBenefit = String(job.otherBenefits || '').trim();
  const perksAndBenefits = otherBenefit ? [...perks, otherBenefit] : perks;
  const vacancyText = job.vacancies ? `${job.vacancies} ${Number(job.vacancies) === 1 ? 'Vacancy' : 'Vacancies'}` : 'Number of vacancies not specified';

  const infoCards = [
    { title: 'Salary', value: salary(job), icon: 'money', isPeso: true },
    { title: 'Experience', value: job.experienceLevel || 'No experience required', icon: 'clock' },
    { title: 'Educational Requirement', value: job.educationLevel || 'Educational requirement not specified', icon: 'graduation' },
    { title: 'Website / Company URL', value: website || 'N/A', icon: 'globe', href: normalizeExternalUrl(website) },
  ];

  return <div className={UI.page}>
    <div className="relative left-1/2 right-1/2 w-screen -ml-[50vw] -mr-[50vw] h-[240px] sm:h-[300px] lg:h-[330px] overflow-hidden bg-white">
      <img
        src={assetUrl(employerProfile.coverPhoto, '/images/jobback.png')}
        alt={`${company || 'Company'} cover banner`}
        className="h-full w-full object-cover object-center"
        onError={(event) => {
          event.currentTarget.onerror = null;
          event.currentTarget.src = '/images/jobback.png';
        }}
      />
    </div>

    <div className={`${UI.container} -mt-16 sm:-mt-20 lg:-mt-24 relative z-10`}>
      <div className="absolute top-[-55px] left-4 sm:left-6 lg:left-8 z-30">
        <button
          type="button"
          onClick={() => navigate('/admin/employer-job-edit-requests')}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-[#d8e2ee] bg-white px-3 text-sm font-semibold text-black shadow-sm transition hover:border-[#2e66a6]/40 hover:bg-[#f7faff] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2"
        >
          <ArrowLeft size={16} /> Back to Edit Requests
        </button>
      </div>

      {notice && <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800">{notice}</div>}

      <section className={`${UI.card} mb-6 -mt-10 min-h-[210px] sm:min-h-[225px] lg:min-h-[240px] p-5 sm:p-7 lg:p-8 flex items-center`}>
        <div className="flex w-full flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-1 items-start gap-4">
            <img
              src={assetUrl(job.companyLogo, '/images/default-company-logo.png')}
              alt={company}
              className="h-[58px] w-[58px] shrink-0 rounded-2xl border border-[#d8e2ee] bg-white object-contain p-1 sm:h-[72px] sm:w-[72px]"
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = '/images/default-company-logo.png';
              }}
            />

            <div className="min-w-0 flex-1">
              <h1
                className="overflow-hidden text-ellipsis text-3xl font-extrabold leading-tight tracking-tight text-black sm:text-4xl"
                style={{ display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2 }}
                title={job.title || 'Untitled Job'}
              >
                {job.title || 'Untitled Job'}
              </h1>

              <div className="mt-2 inline-flex min-w-0 items-center gap-2 text-sm text-black/70">
                <BuildingIcon className="h-4 w-4 text-black/60" />
                <span className="min-w-0 truncate">{company}</span>
              </div>

              <div className="mt-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-black/50">
                <SvgIcon name="location" className="h-4 w-4 text-black/60" />
                <span>{job.location || 'Location not specified'}</span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className={UI.chip}><SvgIcon name="briefcase" className="h-3.5 w-3.5 text-black/60" />{job.jobType || 'Employment type not specified'}</span>
                <span className={UI.chip}><MyApplicationsSvgIcon name="laptop" className="h-3.5 w-3.5 text-black/60" />{job.workMode || 'Work mode not specified'}</span>
                <span className={UI.chip}><SvgIcon name="users" className="h-3.5 w-3.5 text-black/60" />{vacancyText}</span>
                <span className={UI.chip}><LocationIcon className="h-3.5 w-3.5 text-black/60" />{getRelocationDisplayLabel(job.willingToRelocate)}</span>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-black/80">
                <SvgIcon name="clock" className="h-4 w-4 shrink-0" />
                <span>
                  {formatPostedRelative(job.publishedAt || job.createdAt)}
                  {job.applicationDeadline ? ` and deadline of application is on ${formatDate(job.applicationDeadline)}` : ''}
                </span>
              </div>
            </div>
          </div>

          <div className="flex w-full shrink-0 flex-col gap-2 lg:w-[260px]">
            <button
              type="button"
              onClick={openReviewModal}
              className="group inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#2e66a6] px-5 text-base font-semibold text-white shadow-[0_10px_22px_rgba(46,102,166,0.22)] transition hover:bg-[#25578f] active:bg-[#1f4b7c]"
            >
              <FileIcon className="h-4 w-4" />
              Review Request
              <ChevronRight size={17} className="transition group-hover:translate-x-0.5" />
            </button>
            <p className="flex items-center justify-center gap-1 text-center text-xs font-medium text-black/55">
              <CalendarClock size={14} />{requestDateLabel}: {formatDateTime(request.createdAt)}
            </p>
          </div>
        </div>
      </section>

      <div className="space-y-5">
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {infoCards.map(({ title, value, icon, isPeso, href }) => <TopMetricCard key={title} title={title} value={value} icon={icon} isPeso={isPeso} href={href} />)}
        </section>

        <section className={UI.sectionCard}>
          <div className={UI.insetBody}>
            <div className="flex items-center gap-3 pt-2">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#b9d0ea] bg-[#eef5fc] text-[#2e66a6]">
                <SvgIcon name="file" className="h-5 w-5" />
              </span>
              <h2 className={UI.title}>Job Description</h2>
            </div>
            <div className="mt-4 text-sm leading-relaxed text-black/70 sm:text-base">
              <RichTextContent value={job.description} fallback="No job description provided." />
            </div>
          </div>
        </section>

        <section className={UI.sectionCard}>
          <div className={UI.insetBody}>
            <div className="flex items-center gap-3 pt-2">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#b9d0ea] bg-[#eef5fc] text-[#2e66a6]">
                <SvgIcon name="tools" className="h-5 w-5" />
              </span>
              <h2 className={UI.title}>Qualification</h2>
            </div>
            <div className="mt-4 text-sm leading-relaxed text-black/70 sm:text-base">
              <RichTextContent value={job.requirements} fallback="No qualifications specified." />
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className={UI.sectionCard}>
            <div className={UI.insetHead}>
              <p className="text-sm font-semibold text-black">Required Skills</p>
            </div>
            <div className={UI.insetBody}>
              {requiredSkills.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {requiredSkills.map((skill, index) => <div key={`${skill}-${index}`} className={UI.skillChip}>{skill}</div>)}
                </div>
              ) : (
                <p className={UI.muted}>No skills specified</p>
              )}
            </div>
          </div>

          <div className={UI.sectionCard}>
            <div className={UI.insetHead}>
              <p className="text-sm font-semibold text-black">Work Location</p>
            </div>
            <div className="overflow-hidden">
              {String(job.location || '').trim() || getJobCoordinates(job) ? (
                <StaticLocationMap job={job} heightClass="h-[180px]" />
              ) : job.locationImage ? (
                <img
                  src={assetUrl(job.locationImage)}
                  alt="Work location"
                  className="h-[180px] w-full object-cover"
                  onError={(event) => { event.currentTarget.style.display = 'none'; }}
                />
              ) : (
                <div className="flex h-[180px] items-center justify-center bg-black/5 text-black/40">
                  <SvgIcon name="location" className="h-7 w-7" />
                </div>
              )}
            </div>
            <div className="border-t border-[#e6edf5] px-4 py-3">
              <a
                href={buildOpenStreetMapUrl({ coords: getJobCoordinates(job), address: job.location })}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded text-xs font-medium text-[#2e66a6] hover:underline"
                title="Open work location in OpenStreetMap"
              >
                {job.location || 'Work address not specified'}
              </a>
            </div>
          </div>
        </section>

        <section className={UI.sectionCard}>
          <div className={UI.insetHead}>
            <p className="text-sm font-semibold text-black">Perks and Benefits</p>
          </div>
          <div className={UI.insetBody}>
            {perksAndBenefits.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {perksAndBenefits.map((benefit, index) => <div key={`${benefit}-${index}`} className={UI.skillChip}>{benefit}</div>)}
              </div>
            ) : (
              <p className={UI.muted}>No perks or benefits specified</p>
            )}
          </div>
        </section>
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Review edit request"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setModalOpen(false);
          }}
        >
          <section className="relative flex max-h-[92vh] w-full max-w-[760px] flex-col overflow-hidden rounded-xl border border-[#d9dee7] bg-white shadow-2xl">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="absolute right-5 top-5 z-10 flex h-9 w-9 items-center justify-center rounded-md text-[#374151] transition hover:bg-[#f3f4f6]"
              aria-label="Close"
            >
              <X size={20} />
            </button>

            <div className="overflow-y-auto">
              <div className="px-6 pb-5 pt-6 sm:px-7">
                <h2 className="flex items-center gap-2 text-[19px] font-bold text-[#111827]">
                  <FileEdit size={20} className="text-[#0b63ce]" />
                  Edit Requests
                </h2>

                <p className="mt-2 text-sm text-[#55708f]">
                  Review requested changes to job posts.
                </p>

                <div className="mt-4 flex items-center gap-3">
                  <img
                    src={assetUrl(job.companyLogo, '/images/default-company-logo.png')}
                    alt=""
                    className="h-11 w-11 rounded-xl border border-[#d7e6f5] bg-white object-contain p-1"
                  />

                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[#111827]">
                      {job.title || 'Untitled Job'}
                    </p>
                    <p className="truncate text-xs text-[#55708f]">{company}</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1.55fr)_145px_145px_145px]">
                  <label className="relative">
                    <Search
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7890aa]"
                      size={17}
                    />
                    <input
                      value={modalSearch}
                      onChange={(e) => setModalSearch(e.target.value)}
                      placeholder="Search request, section..."
                      className="h-11 w-full rounded-lg border border-[#cbdcf0] bg-white pl-10 pr-3 text-sm text-[#334155] outline-none transition placeholder:text-[#7890aa] focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/10"
                    />
                  </label>

                  <select
                    value={modalStatus}
                    onChange={(e) => setModalStatus(e.target.value)}
                    className="h-11 rounded-lg border border-[#cbdcf0] bg-white px-3 text-sm text-[#111827] outline-none transition focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/10"
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Reviewed</option>
                  </select>

                  <select
                    value={modalTime}
                    onChange={(e) => changeModalTime(e.target.value)}
                    className="h-11 rounded-lg border border-[#cbdcf0] bg-white px-3 text-sm text-[#111827] outline-none transition focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/10"
                  >
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="yesterday">Yesterday</option>
                    <option value="week">This Week</option>
                    <option value="sevenDays">Last 7 Days</option>
                    <option value="month">This Month</option>
                    <option value="lastMonth">Last Month</option>
                    <option value="year">This Year</option>
                    <option value="lastYear">Last Year</option>
                    <option value="custom">Custom Range</option>
                  </select>

                  <select
                    value={modalSort}
                    onChange={(e) => setModalSort(e.target.value)}
                    className="h-11 rounded-lg border border-[#cbdcf0] bg-white px-3 text-sm text-[#111827] outline-none transition focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/10"
                  >
                    <option value="" disabled>Sort By</option>
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-[#e5e7eb] bg-[#fbfdff] px-6 py-6 sm:px-7">
                {matchesModal ? (
                  <article className="rounded-xl border border-[#75aef0] bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.05)]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <h3 className="text-[15px] font-bold text-[#111827]">Edit Request</h3>
                        {request.status === 'pending' && (
                          <span className="text-[10px] font-bold uppercase text-[#0b63ce]">NEW</span>
                        )}
                      </div>

                      <span
                        className={`rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase leading-none ${
                          request.status === 'pending'
                            ? 'border-[#f5c979] bg-[#fff7e8] text-[#b55c00]'
                            : 'border-emerald-300 bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {request.status}
                      </span>
                    </div>

                    <div className="mt-4">
                      <h4 className="flex items-center gap-2 text-sm font-bold text-[#111827]">
                        <span className="text-[#0b63ce]">☷</span>
                        Sections to Edit
                      </h4>

                      <div className="mt-2 flex flex-wrap gap-2">
                        {sections.map((item) => (
                          <span
                            key={item}
                            className="rounded-lg border border-[#80b3ed] bg-[#f3f8fe] px-3 py-2 text-xs font-semibold text-[#0b63ce]"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="mt-5 rounded-lg border border-[#d7e0ea] bg-[#f4f7fa] p-4">
                      <p className="flex items-center gap-2 text-sm font-bold text-[#111827]">
                        <FileEdit size={15} className="text-[#0b63ce]" />
                        Reason
                      </p>
                      <p className="mt-2 text-sm leading-6 text-[#55708f]">
                        {request.reason || 'No reason provided.'}
                      </p>
                    </div>

                    <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="flex items-center gap-1.5 text-xs text-[#55708f]">
                        <Clock3 size={15} />
                        {requestDateLabel}: {formatDateTime(request.createdAt)}
                      </p>

                      {request.status === 'pending' && (
                        <button
                          type="button"
                          onClick={approve}
                          disabled={approving}
                          className="inline-flex min-w-[165px] items-center justify-center gap-2 rounded-lg border border-[#6da5e7] bg-white px-5 py-2.5 text-sm font-semibold text-[#0b63ce] transition hover:bg-[#eef5fc] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <UnlockKeyhole size={16} />
                          {approving ? 'Approving...' : 'Approve & Unlock'}
                        </button>
                      )}
                    </div>
                  </article>
                ) : (
                  <div className="rounded-xl border border-dashed border-[#cbd5e1] bg-white py-12 text-center text-sm text-[#64748b]">
                    No request matches the selected filters.
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      )}
      <CustomDateRangeModal
        open={showModalCustomDate}
        startDate={modalDateFrom}
        endDate={modalDateTo}
        onCancel={() => setShowModalCustomDate(false)}
        onApply={(from, to) => {
          setModalDateFrom(from);
          setModalDateTo(to);
          setModalTime('custom');
          setShowModalCustomDate(false);
        }}
      />
    </div>
  </div>;
};

export default AdminEmployerJobEditRequestDetails;
