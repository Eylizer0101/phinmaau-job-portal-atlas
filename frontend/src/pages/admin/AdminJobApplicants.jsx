import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import AdminLayout from '../../layouts/AdminLayout';
import api from '../../services/api';
import Pagination from '../../components/shared/Pagination';

const cn = (...classes) => classes.filter(Boolean).join(' ');

const UI = {
  page: 'min-h-screen bg-[#f8fafc]',
  container: 'mx-auto max-w-7xl px-1 py-8',
  card: 'w-full rounded-[22px] border border-[#e5e7eb] bg-white shadow-sm',
  ring: 'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2',
};

const DATE_FILTER_OPTIONS = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'thisWeek', label: 'This Week' },
  { value: '7days', label: 'Last 7 Days' },
  { value: 'thisMonth', label: 'This Month' },
  { value: 'lastMonth', label: 'Last Month' },
  { value: 'thisYear', label: 'This Year' },
  { value: 'custom', label: 'Custom Range' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'nameAsc', label: 'Applicant A-Z' },
  { value: 'nameDesc', label: 'Applicant Z-A' },
];

const SvgIcon = ({ name, className = 'h-4 w-4' }) => {
  const common = {
    className,
    fill: 'none',
    stroke: 'currentColor',
    viewBox: '0 0 24 24',
    strokeWidth: 1.8,
  };

  const icons = {
    arrowLeft: <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />,
    users: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-1a4 4 0 00-4-4h-1M9 20H2v-1a4 4 0 014-4h1" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M14 8a4 4 0 11-8 0 4 4 0 018 0zM22 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </>
    ),
    search: <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m1.1-5.4a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" />,
    calendar: <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3M5 11h14M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />,
    chevron: <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />,
    x: <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />,
    refresh: <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v6h6M20 20v-6h-6M5 15a7 7 0 0012 3l3-4M19 9A7 7 0 007 6L4 10" />,
    eye: <><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12s3.75-6.75 9.75-6.75S21.75 12 21.75 12 18 18.75 12 18.75 2.25 12 2.25 12z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path strokeLinecap="round" strokeLinejoin="round" d="m4 7 8 6 8-6" /></>,
    phone: <path strokeLinecap="round" strokeLinejoin="round" d="M5 4h4l2 5-3 2a16 16 0 007 7l2-3 5 2v4a2 2 0 01-2 2C10 23 1 14 1 4a2 2 0 012-2h2z" />,
    arrow: <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-5-5 5 5-5 5" />,
    sparkle: <><path strokeLinecap="round" strokeLinejoin="round" d="M12 3l1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2L12 3z" /><path strokeLinecap="round" strokeLinejoin="round" d="M5 14l.8 2.2L8 17l-2.2.8L5 20l-.8-2.2L2 17l2.2-.8L5 14z" /></>,
  };

  return <svg {...common}>{icons[name] || null}</svg>;
};

const formatFullDate = (dateString) => {
  if (!dateString) return 'N/A';

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 'N/A';

  return date.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const formatDateInput = (date) => {
  if (!date) return '';

  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return '';

  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const getApplicationDate = (application) =>
  application?.appliedAt || application?.createdAt || null;

const getApplicantName = (application) => {
  const user = application?.jobseeker || {};
  const name = [user.firstName, user.middleName, user.lastName, user.extensionName]
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join(' ');

  return name || user.fullName || 'Applicant';
};

const getApplicantEmail = (application) =>
  application?.jobseeker?.email || application?.email || 'N/A';

const getApplicantUserId = (application) => {
  const jobseeker = application?.jobseeker;
  if (typeof jobseeker === 'string') return jobseeker;
  return jobseeker?._id || jobseeker?.id || application?.jobseekerId || '';
};

const getProfile = (application) =>
  application?.jobseeker?.jobSeekerProfile || {};

const getEducationEntry = (application) => {
  const entries = getProfile(application)?.educationEntries;
  return Array.isArray(entries) && entries.length ? entries[0] : {};
};

const normalizeFilterKey = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

const normalizeCampusValue = (value) => {
  const text = String(value || '').trim();
  if (!text) return '';

  const compact = text
    .toLowerCase()
    .replace(/phinma/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (compact.includes('san jose') || compact.includes('sanjose')) return 'AU San Jose';
  if (compact.includes('south')) return 'AU South';
  if (compact.includes('main')) return 'AU Main';

  return text.replace(/\s+/g, ' ');
};

const normalizeCourseValue = (value) => {
  const text = String(value || '').trim().replace(/\s+/g, ' ');

  if (
    text.toLowerCase() === 'bs information technology (business informatics)' ||
    text.toLowerCase() === 'bs information technology (system development)'
  ) {
    return 'BS Information Technology';
  }

  return text;
};

const uniqueNormalizedOptions = (
  values,
  normalizeDisplay = (value) => String(value || '').trim()
) => {
  const optionMap = new Map();

  (values || []).forEach((value) => {
    const displayValue = normalizeDisplay(value);
    const key = normalizeFilterKey(displayValue);

    if (!key || key === 'not specified') return;
    if (!optionMap.has(key)) optionMap.set(key, displayValue);
  });

  return Array.from(optionMap.values()).sort((a, b) => a.localeCompare(b));
};

const getApplicantCampus = (application) => {
  const profile = getProfile(application);
  const education = getEducationEntry(application);

  return normalizeCampusValue(
    profile.campus ||
    education.campus ||
    education.school ||
    ''
  ) || 'Not specified';
};

const getApplicantCourse = (application) => {
  const profile = getProfile(application);
  const education = getEducationEntry(application);

  return normalizeCourseValue(
    profile.course ||
    education.course ||
    education.studyField ||
    profile.studyField ||
    ''
  ) || 'Not specified';
};

const hasMeaningfulProfileEntry = (entry) => {
  if (!entry) return false;

  if (typeof entry !== 'object') {
    return Boolean(String(entry || '').trim());
  }

  return Object.entries(entry).some(([key, value]) => {
    if (['_id', 'createdAt', 'updatedAt', '__v'].includes(key)) return false;

    if (Array.isArray(value)) {
      return value.some((item) => hasMeaningfulProfileEntry(item));
    }

    if (value && typeof value === 'object') {
      return hasMeaningfulProfileEntry(value);
    }

    return Boolean(String(value || '').trim());
  });
};

const countProfileSkills = (value) => {
  if (!value) return 0;

  if (Array.isArray(value)) {
    return value
      .flatMap((item) => {
        if (item && typeof item === 'object') {
          const skill = String(item.skill || item.name || '').trim();
          return skill ? [skill] : [];
        }

        const clean = String(item || '').trim();
        if (!clean) return [];

        return clean.includes('||')
          ? clean.split('||').map((part) => part.trim()).filter(Boolean)
          : [clean];
      })
      .filter(Boolean)
      .length;
  }

  const clean = String(value || '').trim();
  if (!clean) return 0;

  if (clean.includes('||')) {
    return clean.split('||').map((part) => part.trim()).filter(Boolean).length;
  }

  if (/\s[—-]\s(Basic|Novice|Intermediate|Advanced|Expert)$/i.test(clean)) {
    return 1;
  }

  return clean.split(',').map((part) => part.trim()).filter(Boolean).length;
};

const getJobseekerLevel = (application) => {
  const profile = getProfile(application);

  const counts = {
    skills:
      countProfileSkills(profile.technicalSkills) +
      countProfileSkills(profile.softSkills),
    certifications: Array.isArray(profile.certifications)
      ? profile.certifications.filter(hasMeaningfulProfileEntry).length
      : 0,
    projects: Array.isArray(profile.projects)
      ? profile.projects.filter(hasMeaningfulProfileEntry).length
      : 0,
    seminars: Array.isArray(profile.seminars)
      ? profile.seminars.filter(hasMeaningfulProfileEntry).length
      : 0,
    awards: Array.isArray(profile.awards)
      ? profile.awards.filter(hasMeaningfulProfileEntry).length
      : 0,
    work: Array.isArray(profile.workExperiences)
      ? profile.workExperiences.filter(hasMeaningfulProfileEntry).length
      : 0,
  };

  const tiers = [
    {
      name: 'First Time Job Seeker',
      requirements: {
        skills: 0,
        certifications: 0,
        projects: 0,
        seminars: 0,
        awards: 0,
        work: 0,
      },
    },
    {
      name: 'Intermediate',
      requirements: {
        skills: 5,
        certifications: 1,
        projects: 1,
        seminars: 1,
        awards: 1,
        work: 0,
      },
    },
    {
      name: 'Expert',
      requirements: {
        skills: 9,
        certifications: 2,
        projects: 2,
        seminars: 2,
        awards: 2,
        work: 1,
      },
    },
    {
      name: 'Pro',
      requirements: {
        skills: 13,
        certifications: 5,
        projects: 5,
        seminars: 5,
        awards: 5,
        work: 2,
      },
    },
    {
      name: 'Legend',
      requirements: {
        skills: 17,
        certifications: 7,
        projects: 7,
        seminars: 7,
        awards: 7,
        work: 3,
      },
    },
  ];

  const meetsRequirements = (requirements) =>
    Object.entries(requirements).every(
      ([key, required]) => counts[key] >= required
    );

  let currentTier = tiers[0];

  tiers.forEach((tier) => {
    if (meetsRequirements(tier.requirements)) {
      currentTier = tier;
    }
  });

  return currentTier.name;
};

const getApplicantStatusMeta = (statusRaw) => {
  const status = String(statusRaw || '').trim().toLowerCase();

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

  if (status === 'withdrawn' || status === 'cancelled' || status === 'vacancy full') {
    return {
      label: status.replace(/\b\w/g, (letter) => letter.toUpperCase()),
      className: 'border-gray-200 bg-gray-50 text-gray-700',
    };
  }

  return {
    label: status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Pending',
    className: 'border-gray-200 bg-gray-50 text-gray-700',
  };
};

const getPresetDateRange = (value) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (value === 'today') {
    const current = formatDateInput(today);
    return { from: current, to: current };
  }

  if (value === 'yesterday') {
    const date = new Date(today);
    date.setDate(date.getDate() - 1);
    const current = formatDateInput(date);
    return { from: current, to: current };
  }

  if (value === 'thisWeek') {
    const day = today.getDay();
    const mondayOffset = day === 0 ? 6 : day - 1;
    const start = new Date(today);
    start.setDate(start.getDate() - mondayOffset);

    return {
      from: formatDateInput(start),
      to: formatDateInput(today),
    };
  }

  if (value === '7days') {
    const start = new Date(today);
    start.setDate(start.getDate() - 6);

    return {
      from: formatDateInput(start),
      to: formatDateInput(today),
    };
  }

  if (value === 'thisMonth') {
    return {
      from: formatDateInput(new Date(today.getFullYear(), today.getMonth(), 1)),
      to: formatDateInput(today),
    };
  }

  if (value === 'lastMonth') {
    return {
      from: formatDateInput(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
      to: formatDateInput(new Date(today.getFullYear(), today.getMonth(), 0)),
    };
  }

  if (value === 'thisYear') {
    return {
      from: formatDateInput(new Date(today.getFullYear(), 0, 1)),
      to: formatDateInput(today),
    };
  }

  return { from: '', to: '' };
};

const isDateWithinRange = (value, from, to) => {
  if (!from && !to) return true;
  if (!value) return false;

  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return false;

  const targetTime = new Date(
    target.getFullYear(),
    target.getMonth(),
    target.getDate()
  ).getTime();

  const fromTime = from ? new Date(`${from}T00:00:00`).getTime() : null;
  const toTime = to ? new Date(`${to}T23:59:59.999`).getTime() : null;

  if (fromTime && targetTime < fromTime) return false;
  if (toTime && targetTime > toTime) return false;

  return true;
};


const addCalendarMonths = (date, amount) => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + amount);
  return next;
};

const monthNames = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const getYearOptions = () => {
  const startYear = 1950;
  const endYear = new Date().getFullYear() + 10;
  return Array.from({ length: endYear - startYear + 1 }, (_, index) => startYear + index);
};

const CalendarMonth = ({
  monthDate,
  startDate,
  endDate,
  onPickDate,
  onChangeMonth,
}) => {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const firstWeekday = firstDay.getDay();
  const gridStart = new Date(year, month, 1 - firstWeekday);
  const start = startDate ? new Date(`${startDate}T00:00:00`) : null;
  const end = endDate ? new Date(`${endDate}T00:00:00`) : null;

  const days = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return date;
  });

  const isSameDay = (first, second) =>
    first && second && first.toDateString() === second.toDateString();

  const inRange = (date) => start && end && date >= start && date <= end;

  const changeByMonth = (amount) =>
    onChangeMonth(addCalendarMonths(monthDate, amount));

  const changeMonthSelect = (nextMonth) =>
    onChangeMonth(new Date(year, Number(nextMonth), 1));

  const changeYearSelect = (nextYear) =>
    onChangeMonth(new Date(Number(nextYear), month, 1));

  return (
    <div className="min-w-0 flex-1">
      <div className="mb-4 grid grid-cols-[32px_1fr_32px] items-center gap-2">
        <button
          type="button"
          onClick={() => changeByMonth(-1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-2xl leading-none text-slate-700 transition hover:bg-slate-100"
          aria-label="Previous month"
        >
          ‹
        </button>

        <div className="grid grid-cols-[1fr_86px] gap-2">
          <select
            value={month}
            onChange={(event) => changeMonthSelect(event.target.value)}
            className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-center text-sm font-extrabold text-[#2e66a6] outline-none focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/20"
            aria-label="Select month"
          >
            {monthNames.map((name, index) => (
              <option key={name} value={index}>
                {name}
              </option>
            ))}
          </select>

          <select
            value={year}
            onChange={(event) => changeYearSelect(event.target.value)}
            className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-center text-sm font-extrabold text-[#2e66a6] outline-none focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/20"
            aria-label="Select year"
          >
            {getYearOptions().map((yearOption) => (
              <option key={yearOption} value={yearOption}>
                {yearOption}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => changeByMonth(1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-2xl leading-none text-slate-700 transition hover:bg-slate-100"
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-y-2 text-center text-xs font-bold text-slate-500">
        {['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'].map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-7 gap-y-1 text-center text-sm text-slate-600">
        {days.map((day) => {
          const value = formatDateInput(day);
          const outside = day.getMonth() !== month;
          const selected = isSameDay(day, start) || isSameDay(day, end);
          const ranged = inRange(day);

          return (
            <button
              type="button"
              key={`${value}-${month}`}
              onClick={() => onPickDate(value)}
              className={cn(
                'mx-auto flex h-9 w-full items-center justify-center transition',
                outside ? 'text-slate-300' : 'text-slate-700',
                ranged ? 'bg-[#2e66a6]/10 text-[#2e66a6]' : '',
                selected
                  ? 'rounded-lg bg-[#2e66a6] font-extrabold text-white shadow-md'
                  : 'hover:bg-[#2e66a6]/10'
              )}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const CustomDateRangeModal = ({
  open,
  startDate,
  endDate,
  onCancel,
  onApply,
}) => {
  const today = new Date();
  const initialStart = startDate || formatDateInput(today);
  const initialEnd = endDate || formatDateInput(today);
  const [draftStart, setDraftStart] = useState(initialStart);
  const [draftEnd, setDraftEnd] = useState(initialEnd);
  const [leftMonth, setLeftMonth] = useState(
    new Date(`${initialStart}T00:00:00`)
  );
  const [rightMonth, setRightMonth] = useState(
    new Date(`${initialEnd}T00:00:00`)
  );

  useEffect(() => {
    if (!open) return;

    const nextStart = startDate || formatDateInput(today);
    const nextEnd = endDate || formatDateInput(today);

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
      return;
    }

    if (
      new Date(`${value}T00:00:00`) <
      new Date(`${draftStart}T00:00:00`)
    ) {
      setDraftEnd(draftStart);
      setDraftStart(value);
    } else {
      setDraftEnd(value);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 px-4 py-6">
      <div className="w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="grid gap-5 px-6 pb-5 pt-5 md:grid-cols-[1fr_auto_1fr] md:items-end">
          <div>
            <div className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
              Start Date
            </div>
            <div className="flex h-12 items-center gap-3 rounded-xl bg-slate-100 px-4 text-lg font-bold text-[#2e66a6]">
              <SvgIcon name="calendar" className="h-5 w-5" />
              {formatFullDate(draftStart)}
            </div>
          </div>

          <div className="hidden pb-3 text-3xl text-slate-500 md:block">→</div>

          <div>
            <div className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
              End Date
            </div>
            <div className="flex h-12 items-center gap-3 rounded-xl bg-slate-100 px-4 text-lg font-bold text-[#2e66a6]">
              <SvgIcon name="calendar" className="h-5 w-5" />
              {draftEnd ? formatFullDate(draftEnd) : 'Select date'}
            </div>
          </div>
        </div>

        <div className="grid gap-8 px-6 pb-5 md:grid-cols-2">
          <CalendarMonth
            monthDate={leftMonth}
            startDate={draftStart}
            endDate={draftEnd}
            onPickDate={pickDate}
            onChangeMonth={setLeftMonth}
          />
          <CalendarMonth
            monthDate={rightMonth}
            startDate={draftStart}
            endDate={draftEnd}
            onPickDate={pickDate}
            onChangeMonth={setRightMonth}
          />
        </div>

        <div className="flex items-center justify-end gap-5 border-t border-slate-100 px-6 py-5">
          <button
            type="button"
            onClick={onCancel}
            className="text-base font-bold text-slate-600"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              if (draftStart && draftEnd) onApply(draftStart, draftEnd);
            }}
            disabled={!draftStart || !draftEnd}
            className="h-11 rounded-xl bg-[#2e66a6] px-8 text-base font-extrabold text-white shadow-lg shadow-[#2e66a6]/25 transition hover:bg-[#255487] disabled:opacity-60"
          >
            Apply Range
          </button>
        </div>
      </div>
    </div>
  );
};


const DateFilterDropdown = ({
  value,
  dateFrom,
  dateTo,
  onChange,
}) => {
  const [open, setOpen] = useState(false);
  const [showCustom, setShowCustom] = useState(false);

  useEffect(() => {
    if (!open) return undefined;

    const close = () => setOpen(false);
    window.addEventListener('click', close);

    return () => window.removeEventListener('click', close);
  }, [open]);

  const selectOption = (nextValue) => {
    if (nextValue === 'custom') {
      setOpen(false);
      setShowCustom(true);
      return;
    }

    const range = getPresetDateRange(nextValue);

    onChange({
      date: nextValue,
      dateFrom: range.from,
      dateTo: range.to,
    });

    setOpen(false);
  };

  const applyCustomRange = (customFrom, customTo) => {
    onChange({
      date: 'custom',
      dateFrom: customFrom,
      dateTo: customTo,
    });

    setShowCustom(false);
  };

  return (
    <div className="relative w-full">
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setOpen((previous) => !previous);
        }}
        className="flex h-12 w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-gray-300 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2"
      >
        <span className="truncate">
          {value === 'custom' && dateFrom && dateTo
            ? `${formatFullDate(dateFrom)} - ${formatFullDate(dateTo)}`
            : DATE_FILTER_OPTIONS.find((option) => option.value === value)?.label ||
              'All Time'}
        </span>

        <SvgIcon name="calendar" className="h-4 w-4 shrink-0 text-gray-500" />
      </button>

      {open ? (
        <div
          onClick={(event) => event.stopPropagation()}
          className="absolute left-0 top-[56px] z-50 w-64 rounded-2xl border border-gray-100 bg-white p-2 shadow-xl ring-1 ring-black/5"
        >
          <div className="space-y-1">
            {DATE_FILTER_OPTIONS.map((option) => (
              <button
                type="button"
                key={option.value}
                onClick={() => selectOption(option.value)}
                className={cn(
                  'w-full rounded-xl px-3 py-2 text-left text-sm font-semibold transition',
                  value === option.value
                    ? 'bg-[#2e66a6]/10 text-[#2e66a6]'
                    : 'text-gray-600 hover:bg-gray-50'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <CustomDateRangeModal
        open={showCustom}
        startDate={dateFrom}
        endDate={dateTo}
        onCancel={() => setShowCustom(false)}
        onApply={applyCustomRange}
      />
    </div>
  );
};


const API_HOST = process.env.REACT_APP_API_URL
  ? process.env.REACT_APP_API_URL.replace(/\/api\/?$/, "")
  : "https://phinmaau-job-portal-atlas.onrender.com";

const stripHtmlForMatch = (value = "") =>
  String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();

const normalizeMatchText = (value = "") =>
  stripHtmlForMatch(value)
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const normalizeSkillName = (value = "") =>
  normalizeMatchText(value)
    .replace(/\s[—-]\s(?:basic|novice|intermediate|advanced|expert)$/i, "")
    .trim();

const parseSkills = (value) => {
  const raw = Array.isArray(value) ? value : String(value || "").split(/\|\||,|\n/);
  return raw
    .map((item) => {
      if (item && typeof item === "object") {
        return {
          skill: item.skill || item.name || "",
          proficiency: item.proficiency || "Basic",
        };
      }

      const clean = String(item || "").trim();
      const match = clean.match(
        /^(.*?)\s+[—-]\s+(Basic|Novice|Intermediate|Advanced|Expert)$/i
      );

      return match
        ? { skill: match[1].trim(), proficiency: match[2] }
        : { skill: clean, proficiency: "Basic" };
    })
    .filter((item) => item.skill);
};

const getRequiredExperienceYears = (value = "") => {
  const normalized = normalizeMatchText(value);
  if (!normalized || normalized.includes("no experience")) return 0;
  const match = normalized.match(/(\d+)/);
  return match ? Number(match[1]) : 0;
};

const getApplicantExperienceYears = (workExperiences = [], profileExperience = "") => {
  const dateBasedYears = (Array.isArray(workExperiences) ? workExperiences : []).reduce(
    (total, item) => {
      const start = new Date(item?.startDate);
      const end = item?.isPresent ? new Date() : new Date(item?.endDate);
      if (
        Number.isNaN(start.getTime()) ||
        Number.isNaN(end.getTime()) ||
        end < start
      ) {
        return total;
      }

      return total + (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    },
    0
  );

  if (dateBasedYears > 0) return dateBasedYears;

  const normalized = normalizeMatchText(profileExperience);
  if (!normalized || normalized.includes("no experience")) return 0;
  if (normalized.includes("less than 1")) return 0.5;

  const rangeMatch = normalized.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (rangeMatch) return Number(rangeMatch[2]);

  const numberMatch = normalized.match(/(\d+)/);
  return numberMatch ? Number(numberMatch[1]) : 0;
};

const getEducationRank = (value = "") => {
  const normalized = normalizeMatchText(value);
  if (!normalized) return 0;
  if (normalized.includes("doctor")) return 5;
  if (normalized.includes("master")) return 4;
  if (
    normalized.includes("bachelor") ||
    normalized.includes("college degree") ||
    normalized.includes("college graduate")
  ) {
    return 3;
  }
  if (normalized.includes("associate") || normalized.includes("vocational")) return 2;
  if (normalized.includes("high school") || normalized.includes("senior high")) return 1;
  return 0;
};

const calculateApplicationMatch = ({ job = {}, profile = {}, skills = [], work = [], education = [] }) => {
  let totalWeight = 0;
  let earnedWeight = 0;

  const requiredSkills = (Array.isArray(job.skillsRequired) ? job.skillsRequired : [])
    .map(normalizeSkillName)
    .filter(Boolean);

  if (requiredSkills.length) {
    totalWeight += 45;
    const applicantSkills = skills.map((item) => normalizeSkillName(item?.skill || item)).filter(Boolean);
    const matchedSkills = requiredSkills.filter((required) =>
      applicantSkills.some(
        (applicantSkill) =>
          applicantSkill === required ||
          applicantSkill.includes(required) ||
          required.includes(applicantSkill)
      )
    );
    earnedWeight += 45 * (matchedSkills.length / requiredSkills.length);
  }

  const requiredExperience = getRequiredExperienceYears(job.experienceLevel);
  if (job.experienceLevel) {
    totalWeight += 25;
    if (requiredExperience === 0) {
      earnedWeight += 25;
    } else {
      const applicantExperience = getApplicantExperienceYears(work, profile.experience);
      earnedWeight += 25 * Math.min(1, applicantExperience / requiredExperience);
    }
  }

  if (job.educationLevel) {
    totalWeight += 20;
    const requiredRank = getEducationRank(job.educationLevel);
    const educationValues = [
      profile.educationalAttainment,
      profile.educationLevel,
      ...education.map((item) => item?.degree || item?.educationLevel || item?.course || ""),
    ];
    const applicantRank = Math.max(0, ...educationValues.map(getEducationRank));

    if (requiredRank === 0 || applicantRank >= requiredRank) {
      earnedWeight += 20;
    } else if (applicantRank > 0) {
      earnedWeight += 20 * (applicantRank / requiredRank);
    }
  }

  const categoryText = normalizeMatchText(job.category);
  if (categoryText) {
    totalWeight += 10;
    const applicantText = normalizeMatchText(
      [
        profile.studyField,
        profile.course,
        profile.objective,
        ...work.map((item) => `${item?.position || ""} ${item?.companyName || item?.company || ""}`),
      ].join(" ")
    );

    if (applicantText.includes(categoryText) || categoryText.includes(applicantText)) {
      earnedWeight += 10;
    }
  }

  if (totalWeight <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((earnedWeight / totalWeight) * 100)));
};

const hasMeaningfulObjectValue = (value) => {
  if (Array.isArray(value)) return value.some(hasMeaningfulObjectValue);
  if (value && typeof value === "object") {
    return Object.values(value).some(hasMeaningfulObjectValue);
  }
  return value !== undefined && value !== null && String(value).trim() !== "";
};

const calculateJobSeekerLevel = ({
  skills = [],
  certifications = [],
  projects = [],
  seminars = [],
  awards = [],
  workExperiences = [],
}) => {
  const score =
    skills.length +
    certifications.filter(hasMeaningfulObjectValue).length * 2 +
    projects.filter(hasMeaningfulObjectValue).length * 2 +
    seminars.filter(hasMeaningfulObjectValue).length +
    awards.filter(hasMeaningfulObjectValue).length * 2 +
    workExperiences.filter(hasMeaningfulObjectValue).length * 3;

  if (score >= 30) return "Legend";
  if (score >= 20) return "Pro";
  if (score >= 12) return "Expert";
  if (score >= 6) return "Intermediate";
  return "First Time Job Seeker";
};

const formatRelativeTime = (value) => {
  const date = new Date(value || 0);
  if (Number.isNaN(date.getTime())) return "date unavailable";

  const diffMs = Date.now() - date.getTime();
  const future = diffMs < 0;
  const absoluteMs = Math.abs(diffMs);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (absoluteMs < minute) return future ? "in a moment" : "just now";
  if (absoluteMs < hour) {
    const count = Math.max(1, Math.floor(absoluteMs / minute));
    return future ? `in ${count} minute${count === 1 ? "" : "s"}` : `${count} minute${count === 1 ? "" : "s"} ago`;
  }
  if (absoluteMs < day) {
    const count = Math.max(1, Math.floor(absoluteMs / hour));
    return future ? `in ${count} hour${count === 1 ? "" : "s"}` : `${count} hour${count === 1 ? "" : "s"} ago`;
  }

  const count = Math.max(1, Math.floor(absoluteMs / day));
  return future ? `in ${count} day${count === 1 ? "" : "s"}` : `${count} day${count === 1 ? "" : "s"} ago`;
};

const statusStyle = (status) => {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "hired") return "bg-emerald-100 text-emerald-700";
  if (normalized === "declined") return "bg-red-100 text-red-700";
  if (normalized === "for interview") return "bg-blue-100 text-blue-700";
  if (normalized === "withdrawn" || normalized === "cancelled") return "bg-gray-100 text-gray-600";
  if (normalized === "vacancy full") return "bg-amber-100 text-amber-700";
  return "bg-yellow-100 text-yellow-700";
};

const statusLabel = (status) => {
  const normalized = String(status || "").trim().toLowerCase();
  if (!normalized) return "Pending";
  if (normalized === "for interview") return "For Interview";
  if (normalized === "vacancy full") return "Vacancy Full";
  return normalized.replace(/\b\w/g, (character) => character.toUpperCase());
};

const levelStyle = (level) => {
  if (level === "Legend") return "bg-amber-100 text-amber-800";
  if (level === "Pro") return "bg-purple-100 text-purple-700";
  if (level === "Expert") return "bg-blue-100 text-blue-700";
  if (level === "Intermediate") return "bg-cyan-100 text-cyan-700";
  return "bg-[#f3f4f6] text-[#4b5563]";
};

const resolveApplicantImage = (user) => {
  const image = String(user?.profileImage || "").trim();
  if (!image) return "/images/profile.png";
  if (/^(https?:|data:|blob:)/i.test(image)) return image;
  return `${API_HOST}${image.startsWith("/") ? "" : "/"}${image}`;
};

const AdminJobApplicants = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [job, setJob] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [customDateFrom, setCustomDateFrom] = useState("");
  const [customDateTo, setCustomDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const backPath = location.state?.backPath || `/admin/jobs/${jobId}`;
  const backLabel = location.state?.backLabel || "Back to job details";

  const fetchApplicants = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get(`/applications/job/${jobId}`);
      setJob(response.data?.job || null);
      setApplicants(
        Array.isArray(response.data?.applications)
          ? response.data.applications
          : []
      );
    } catch (err) {
      if (err.response?.status === 404) {
        setError("Job or applicant list not found.");
      } else if (err.request) {
        setError("Cannot connect to the server. Please check your connection.");
      } else {
        setError("Unable to load the applicant list right now.");
      }
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    fetchApplicants();
  }, [fetchApplicants]);

  const applicantCards = useMemo(
    () =>
      applicants.map((application) => {
        const user = application?.jobseeker || {};
        const profile = user?.jobSeekerProfile || {};
        const work = Array.isArray(profile.workExperiences)
          ? profile.workExperiences
          : [];
        const education = Array.isArray(profile.educationEntries)
          ? profile.educationEntries
          : [];
        const skills = [
          ...parseSkills(profile.technicalSkills),
          ...parseSkills(profile.softSkills),
        ];

        const level = calculateJobSeekerLevel({
          skills,
          certifications: Array.isArray(profile.certifications)
            ? profile.certifications
            : [],
          projects: Array.isArray(profile.projects) ? profile.projects : [],
          seminars: Array.isArray(profile.seminars) ? profile.seminars : [],
          awards: Array.isArray(profile.awards) ? profile.awards : [],
          workExperiences: work,
        });

        return {
          application,
          user,
          profile,
          level,
          matchScore: calculateApplicationMatch({
            job: job || {},
            profile,
            skills,
            work,
            education,
          }),
        };
      }),
    [applicants, job]
  );

  const statusOptions = useMemo(
    () =>
      [
        ...new Set(
          applicantCards
            .map(({ application }) =>
              String(application?.status || "").trim().toLowerCase()
            )
            .filter(Boolean)
        ),
      ].sort((a, b) => a.localeCompare(b)),
    [applicantCards]
  );

  const filteredApplicants = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const dateRange =
      dateFilter === "custom"
        ? { from: customDateFrom, to: customDateTo }
        : getPresetDateRange(dateFilter);

    return applicantCards.filter(({ application, user, profile, level }) => {
      const name =
        user.fullName ||
        [user.firstName, user.middleName, user.lastName, user.extensionName]
          .filter(Boolean)
          .join(" ");

      const searchableText = [
        name,
        user.email,
        profile.phoneNumber,
        profile.contactNumber,
        profile.mobileNumber,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (normalizedSearch && !searchableText.includes(normalizedSearch)) {
        return false;
      }

      if (normalizedSearch) return true;

      if (statusFilter !== "all") {
        const status = String(application?.status || "").toLowerCase();
        if (status !== statusFilter.toLowerCase()) return false;
      }

      if (levelFilter !== "all" && level !== levelFilter) {
        return false;
      }

      if (
        dateFilter !== "all" &&
        !isDateWithinRange(
          getApplicationDate(application),
          dateRange.from,
          dateRange.to
        )
      ) {
        return false;
      }

      return true;
    });
  }, [
    applicantCards,
    customDateFrom,
    customDateTo,
    dateFilter,
    levelFilter,
    search,
    statusFilter,
  ]);

  const totalPages =
    pageSize === "all"
      ? 1
      : Math.max(1, Math.ceil(filteredApplicants.length / Number(pageSize)));

  useEffect(() => {
    setCurrentPage(1);
  }, [
    search,
    statusFilter,
    levelFilter,
    dateFilter,
    customDateFrom,
    customDateTo,
  ]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const paginatedApplicants = useMemo(() => {
    if (pageSize === "all") return filteredApplicants;
    const startIndex = (currentPage - 1) * Number(pageSize);
    return filteredApplicants.slice(
      startIndex,
      startIndex + Number(pageSize)
    );
  }, [currentPage, filteredApplicants, pageSize]);

  const openPositions = Math.max(
    0,
    Number(job?.vacancies || 0) -
      applicants.filter(
        (application) =>
          String(application?.status || "").toLowerCase() === "hired"
      ).length
  );

  const handleViewProfile = (application) => {
    const applicantUserId = getApplicantUserId(application);
    if (!applicantUserId) return;

    navigate(`/admin/users/${applicantUserId}?tab=resume`, {
      state: {
        backPath: `/admin/jobs/${jobId}/applicants`,
        backLabel: "Applicant List",
      },
    });
  };

  return (
    <AdminLayout>
      <div className={UI.page}>
        <div className="mx-auto max-w-7xl px-1 py-8">
          <button
            type="button"
            onClick={() => navigate(backPath)}
            className={`inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#111827] shadow-sm transition hover:bg-gray-50 ${UI.ring}`}
          >
            <SvgIcon name="arrowLeft" className="h-4 w-4" />
            {backLabel}
          </button>

          <div className="mt-7">
            <p className="text-sm font-bold uppercase tracking-wide text-[#2e66a6]">
              Applicants
            </p>
            <h1 className="mt-1 text-3xl font-bold text-[#111827]">
              {job?.title || location.state?.jobTitle || "Job Applicants"}
            </h1>
            <p className="mt-2 text-lg text-[#6b7280]">
              {applicants.length} candidate{applicants.length === 1 ? "" : "s"} applied
              {" · "}
              {openPositions} open position{openPositions === 1 ? "" : "s"}
            </p>
          </div>

          <div className="mt-8 rounded-3xl border border-[#e3e5ef] bg-white p-5 shadow-sm">
            <div className="grid gap-3 lg:grid-cols-[1.4fr_0.8fr_0.9fr_0.8fr]">
              <label className="relative block">
                <span className="sr-only">Search applicants</span>
                <SvgIcon
                  name="search"
                  className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search applicant name, email..."
                  className="h-12 w-full rounded-xl border border-gray-200 bg-white pl-12 pr-4 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/20"
                />
              </label>

              <label className="relative block">
                <span className="sr-only">Filter by status</span>
                <select
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(event.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-12 w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 pr-10 text-sm text-gray-900 outline-none transition focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/20"
                >
                  <option value="all">All Status</option>
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {statusLabel(status)}
                    </option>
                  ))}
                </select>
                <SvgIcon
                  name="chevron"
                  className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
                />
              </label>

              <label className="relative block">
                <span className="sr-only">Filter by jobseeker level</span>
                <select
                  value={levelFilter}
                  onChange={(event) => {
                    setLevelFilter(event.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-12 w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 pr-10 text-sm text-gray-900 outline-none transition focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/20"
                >
                  <option value="all">All Job Seeker Level</option>
                  <option value="First Time Job Seeker">First Time Job Seeker</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Expert">Expert</option>
                  <option value="Pro">Pro</option>
                  <option value="Legend">Legend</option>
                </select>
                <SvgIcon
                  name="chevron"
                  className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
                />
              </label>

              <DateFilterDropdown
                value={dateFilter}
                dateFrom={customDateFrom}
                dateTo={customDateTo}
                onChange={(next) => {
                  setDateFilter(next.date);
                  setCustomDateFrom(next.dateFrom);
                  setCustomDateTo(next.dateTo);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>

          {loading ? (
            <div className="mt-8 rounded-3xl border border-[#e3e5ef] bg-white p-12 text-center text-[#6b7280] shadow-sm">
              Loading applicants...
            </div>
          ) : error ? (
            <div className="mt-8 rounded-3xl border border-[#e3e5ef] bg-white p-12 text-center shadow-sm">
              <p className="text-sm font-semibold text-red-600">{error}</p>
              <button
                type="button"
                onClick={fetchApplicants}
                className={`mt-4 rounded-xl border border-[#d7e6f5] bg-white px-4 py-2 text-sm font-semibold text-[#111827] hover:bg-[#eef5fc] ${UI.ring}`}
              >
                Retry
              </button>
            </div>
          ) : paginatedApplicants.length > 0 ? (
            <>
              <div className="mt-8 max-h-[508px] space-y-5 overflow-y-auto overscroll-auto pr-1">
                {paginatedApplicants.map(
                  ({ application, user, profile, level, matchScore }) => {
                    const name =
                      user.fullName ||
                      [
                        user.firstName,
                        user.middleName,
                        user.lastName,
                        user.extensionName,
                      ]
                        .filter(Boolean)
                        .join(" ") ||
                      "Applicant";

                    const phone =
                      profile.phoneNumber ||
                      profile.contactNumber ||
                      profile.mobileNumber ||
                      "Not provided";

                    const applicantUserId = getApplicantUserId(application);

                    return (
                      <article
                        key={application._id}
                        className="rounded-3xl border border-[#e3e5ef] bg-white p-6 shadow-sm"
                      >
                        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                          <div className="flex min-w-0 items-center gap-5">
                            <img
                              src={resolveApplicantImage(user)}
                              alt={name}
                              className="h-20 w-20 shrink-0 rounded-full object-cover"
                              onError={(event) => {
                                event.currentTarget.onerror = null;
                                event.currentTarget.src = "/images/profile.png";
                              }}
                            />

                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-3">
                                <h2 className="text-xl font-bold text-[#111827]">
                                  {name}
                                </h2>

                                <span
                                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                    application.alreadyEmployed
                                      ? "bg-amber-100 text-amber-800"
                                      : statusStyle(application.status)
                                  }`}
                                >
                                  {application.alreadyEmployed
                                    ? "Already Employed"
                                    : statusLabel(application.status)}
                                </span>
                              </div>

                              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[#7b8190]">
                                <span className="inline-flex items-center gap-1.5">
                                  <SvgIcon name="mail" className="h-4 w-4" />
                                  {user.email || "Not provided"}
                                </span>
                                <span className="hidden text-[#c2c5ce] sm:inline">
                                  |
                                </span>
                                <span className="inline-flex items-center gap-1.5">
                                  <SvgIcon name="phone" className="h-4 w-4" />
                                  {phone}
                                </span>
                              </div>

                              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                                <span
                                  className={`rounded-full px-3 py-1 text-xs font-semibold ${levelStyle(
                                    level
                                  )}`}
                                >
                                  ★ {level}
                                </span>

                                <span className="inline-flex items-center gap-1.5 text-[#7b8190]">
                                  <SvgIcon name="calendar" className="h-4 w-4" />
                                  Applied{" "}
                                  {formatRelativeTime(
                                    application.appliedAt ||
                                      application.createdAt
                                  )}
                                </span>

                                {application.applicationHistorySummary ? (
                                  <span className="inline-flex overflow-hidden rounded-full border border-[#dbe3ee] bg-white text-xs font-semibold text-[#5f6b7a]">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1">
                                      Previously Hired:
                                      <span className="font-bold text-[#374151]">
                                        {application.applicationHistorySummary
                                          ?.hired ?? 0}
                                      </span>
                                    </span>
                                    <span
                                      className="h-auto w-px bg-[#dbe3ee]"
                                      aria-hidden="true"
                                    />
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1">
                                      Total Withdrawals:
                                      <span className="font-bold text-[#374151]">
                                        {application.applicationHistorySummary
                                          ?.withdrawn ?? 0}
                                      </span>
                                    </span>
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-row items-center gap-3 md:flex-col md:items-stretch">
                            <div className="inline-flex items-center justify-center gap-2 rounded-full bg-[#eaf0ff] px-5 py-2 text-sm font-bold text-[#2e66a6]">
                              <SvgIcon name="sparkle" className="h-4 w-4" />
                              {matchScore}% match
                            </div>

                            <button
                              type="button"
                              disabled={!applicantUserId}
                              onClick={() => handleViewProfile(application)}
                              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#2e66a6] px-6 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-[#25578f] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              View profile
                              <SvgIcon name="arrow" className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  }
                )}
              </div>

              <Pagination
                currentPage={currentPage}
                totalItems={filteredApplicants.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
                ariaLabel="Admin job applicants pagination"
              
                className="sticky bottom-0 z-20 shrink-0"
              />
            </>
          ) : (
            <div className="mt-8 rounded-3xl border border-[#e3e5ef] bg-white p-12 text-center text-[#6b7280] shadow-sm">
              {applicants.length
                ? "No applicants found for the selected filters."
                : "No applicants yet."}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminJobApplicants;
