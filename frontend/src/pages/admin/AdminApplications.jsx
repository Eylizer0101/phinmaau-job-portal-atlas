import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../layouts/AdminLayout';
import api from '../../services/api';

const STATUS_OPTIONS = ['Pending', 'For Interview', 'Hired', 'Declined'];
const SORT_OPTIONS = [
  'Newest First',
  'Oldest First',
  'Applicant A-Z',
  'Applicant Z-A',
];
const ITEMS_PER_PAGE = 10;

const cn = (...classes) => classes.filter(Boolean).join(' ');

const Icon = ({ name, className = 'h-4 w-4' }) => {
  const common = { className, fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24', strokeWidth: 2 };
  const icons = {
    search: <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 110-15 7.5 7.5 0 010 15z" />,
    chevronDown: <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />,
    eye: <><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12s3.75-6.75 9.75-6.75S21.75 12 21.75 12 18 18.75 12 18.75 2.25 12 2.25 12z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></>,
    calendar: <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3M5 11h14M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />,
    refresh: <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v6h6M20 20v-6h-6M5.5 14A7 7 0 0018 17.5M18.5 10A7 7 0 006 6.5" />,
    user: <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />,
  };
  return <svg {...common}>{icons[name] || null}</svg>;
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
  { value: 'lastYear', label: 'Last Year' },
  { value: 'custom', label: 'Custom Range' },
];

const MONTH_NAMES = [
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

const formatDateInput = (date) => {
  if (!date) return '';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const getPresetDateRange = (value) => {
  const today = new Date();
  const current = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  if (value === 'today') {
    return { dateFrom: formatDateInput(current), dateTo: formatDateInput(current) };
  }

  if (value === 'yesterday') {
    const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
    return { dateFrom: formatDateInput(yesterday), dateTo: formatDateInput(yesterday) };
  }

  if (value === 'thisWeek') {
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    return {
      dateFrom: formatDateInput(
        new Date(today.getFullYear(), today.getMonth(), today.getDate() - mondayOffset)
      ),
      dateTo: formatDateInput(current),
    };
  }

  if (value === '7days') {
    return {
      dateFrom: formatDateInput(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6)),
      dateTo: formatDateInput(current),
    };
  }

  if (value === 'thisMonth') {
    return {
      dateFrom: formatDateInput(new Date(today.getFullYear(), today.getMonth(), 1)),
      dateTo: formatDateInput(current),
    };
  }

  if (value === 'lastMonth') {
    return {
      dateFrom: formatDateInput(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
      dateTo: formatDateInput(new Date(today.getFullYear(), today.getMonth(), 0)),
    };
  }

  if (value === 'thisYear') {
    return {
      dateFrom: formatDateInput(new Date(today.getFullYear(), 0, 1)),
      dateTo: formatDateInput(current),
    };
  }

  if (value === 'lastYear') {
    return {
      dateFrom: formatDateInput(new Date(today.getFullYear() - 1, 0, 1)),
      dateTo: formatDateInput(new Date(today.getFullYear() - 1, 11, 31)),
    };
  }

  return { dateFrom: '', dateTo: '' };
};

const formatDateRangeLabel = (value) => {
  if (!value) return 'Select date';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return 'Select date';
  return date.toLocaleDateString('en-PH', { month: 'short', day: '2-digit', year: 'numeric' });
};

const getDateFilterLabel = (value, dateFrom, dateTo) => {
  if (value === 'custom' && dateFrom && dateTo) {
    return `${formatDateRangeLabel(dateFrom)} - ${formatDateRangeLabel(dateTo)}`;
  }
  return DATE_FILTER_OPTIONS.find((option) => option.value === value)?.label || 'All Time';
};

const isDateInRange = (dateValue, dateFrom, dateTo) => {
  if (!dateFrom && !dateTo) return true;
  if (!dateValue) return false;

  const target = new Date(dateValue);
  if (Number.isNaN(target.getTime())) return false;

  const targetTime = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  const fromTime = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null;
  const toTime = dateTo ? new Date(`${dateTo}T00:00:00`).getTime() : null;

  if (fromTime && targetTime < fromTime) return false;
  if (toTime && targetTime > toTime) return false;
  return true;
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
  const firstDay = new Date(year, month, 1);
  const firstWeekday = firstDay.getDay();
  const gridStart = new Date(year, month, 1 - firstWeekday);
  const start = startDate ? new Date(`${startDate}T00:00:00`) : null;
  const end = endDate ? new Date(`${endDate}T00:00:00`) : null;

  const days = Array.from({ length: 42 }, (_, index) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + index);
    return d;
  });

  const isSameDay = (a, b) => a && b && a.toDateString() === b.toDateString();
  const inRange = (day) => start && end && day >= start && day <= end;
  const changeByMonth = (amount) => onChangeMonth(addCalendarMonths(monthDate, amount));
  const changeMonthSelect = (nextMonth) => onChangeMonth(new Date(year, Number(nextMonth), 1));
  const changeYearSelect = (nextYear) => onChangeMonth(new Date(Number(nextYear), month, 1));

  return (
    <div className="min-w-0 flex-1">
      <div className="mb-4 grid grid-cols-[32px_1fr_32px] items-center gap-2">
        <button
          type="button"
          onClick={() => changeByMonth(-1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-2xl leading-none text-slate-600 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#2e66a6]/20"
          aria-label="Previous month"
        >
          ‹
        </button>

        <div className="grid grid-cols-[1fr_92px] gap-2">
          <select
            value={month}
            onChange={(event) => changeMonthSelect(event.target.value)}
            className="h-10 rounded-lg border border-slate-200 bg-white px-2 text-center text-sm font-extrabold text-[#2e66a6] outline-none focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/20"
            aria-label="Select month"
          >
            {MONTH_NAMES.map((name, index) => (
              <option key={name} value={index}>{name}</option>
            ))}
          </select>

          <select
            value={year}
            onChange={(event) => changeYearSelect(event.target.value)}
            className="h-10 rounded-lg border border-slate-200 bg-white px-2 text-center text-sm font-extrabold text-[#2e66a6] outline-none focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/20"
            aria-label="Select year"
          >
            {getYearOptions().map((yearOption) => (
              <option key={yearOption} value={yearOption}>{yearOption}</option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => changeByMonth(1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-2xl leading-none text-slate-600 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#2e66a6]/20"
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-y-2 text-center text-xs font-bold text-slate-500">
        {['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'].map((day) => <div key={day}>{day}</div>)}
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
              key={value}
              onClick={() => onPickDate(value)}
              className={cn(
                'mx-auto flex h-10 w-full items-center justify-center transition focus:outline-none focus:ring-2 focus:ring-[#2e66a6]/20',
                outside ? 'text-slate-300' : 'text-slate-700',
                ranged ? 'bg-[#2e66a6]/10 text-[#2e66a6]' : '',
                selected ? 'rounded-lg bg-[#2e66a6] font-extrabold text-white shadow-md' : 'hover:bg-[#2e66a6]/10'
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

const CustomDateRangeModal = ({ open, startDate, endDate, onCancel, onApply }) => {
  const today = new Date();
  const initialStart = startDate || formatDateInput(today);
  const initialEnd = endDate || formatDateInput(today);
  const [draftStart, setDraftStart] = useState(initialStart);
  const [draftEnd, setDraftEnd] = useState(initialEnd);
  const [leftMonth, setLeftMonth] = useState(new Date(`${initialStart}T00:00:00`));
  const [rightMonth, setRightMonth] = useState(new Date(`${initialEnd}T00:00:00`));

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

    if (new Date(`${value}T00:00:00`) < new Date(`${draftStart}T00:00:00`)) {
      setDraftEnd(draftStart);
      setDraftStart(value);
    } else {
      setDraftEnd(value);
    }
  };

  const apply = () => {
    if (!draftStart || !draftEnd) return;
    onApply(draftStart, draftEnd);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 px-4 py-6">
      <div className="w-full max-w-[920px] overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="grid gap-6 px-6 pb-5 pt-6 md:grid-cols-[1fr_auto_1fr] md:items-end">
          <div>
            <div className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-500">Start Date</div>
            <div className="flex h-14 items-center gap-3 rounded-xl bg-slate-100 px-5 text-xl font-extrabold text-[#2e66a6]">
              <Icon name="calendar" className="h-5 w-5" />
              {formatDateRangeLabel(draftStart)}
            </div>
          </div>

          <div className="hidden pb-4 text-3xl text-slate-500 md:block">→</div>

          <div>
            <div className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-500">End Date</div>
            <div className="flex h-14 items-center gap-3 rounded-xl bg-slate-100 px-5 text-xl font-extrabold text-[#2e66a6]">
              <Icon name="calendar" className="h-5 w-5" />
              {formatDateRangeLabel(draftEnd)}
            </div>
          </div>
        </div>

        <div className="grid gap-8 px-6 pb-5 md:grid-cols-2">
          <CalendarMonth monthDate={leftMonth} startDate={draftStart} endDate={draftEnd} onPickDate={pickDate} onChangeMonth={setLeftMonth} />
          <CalendarMonth monthDate={rightMonth} startDate={draftStart} endDate={draftEnd} onPickDate={pickDate} onChangeMonth={setRightMonth} />
        </div>

        <div className="flex items-center justify-end gap-5 border-t border-slate-100 px-6 py-5">
          <button type="button" onClick={onCancel} className="text-base font-bold text-slate-600 transition hover:text-slate-900">
            Cancel
          </button>
          <button
            type="button"
            onClick={apply}
            disabled={!draftStart || !draftEnd}
            className="h-12 rounded-xl bg-[#2e66a6] px-9 text-base font-extrabold text-white shadow-lg shadow-[#2e66a6]/25 transition hover:bg-[#255487] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Apply Range
          </button>
        </div>
      </div>
    </div>
  );
};

const DateFilterDropdown = ({ value, dateFrom, dateTo, onChange }) => {
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
    onChange({ date: nextValue, dateFrom: range.dateFrom, dateTo: range.dateTo });
    setOpen(false);
  };

  const applyCustomRange = (customFrom, customTo) => {
    onChange({ date: 'custom', dateFrom: customFrom, dateTo: customTo });
    setShowCustom(false);
  };

  return (
    <div className="relative w-full">
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setOpen((prev) => !prev);
        }}
        className="flex h-11 w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-gray-300 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2"
      >
        <span className="truncate">{getDateFilterLabel(value, dateFrom, dateTo)}</span>
        <Icon name="calendar" className="h-4 w-4 text-gray-500" />
      </button>

      {open ? (
        <div
          onClick={(event) => event.stopPropagation()}
          className="absolute left-0 top-[68px] z-50 w-64 rounded-2xl border border-gray-100 bg-white p-2 shadow-xl ring-1 ring-black/5"
        >
          <div className="space-y-1">
            {DATE_FILTER_OPTIONS.map((option) => (
              <button
                type="button"
                key={option.value}
                onClick={() => selectOption(option.value)}
                className={cn(
                  'w-full rounded-xl px-3 py-2 text-left text-sm font-semibold transition',
                  value === option.value ? 'bg-[#2e66a6]/10 text-[#2e66a6]' : 'text-gray-600 hover:bg-gray-50'
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

const getName = (user) => {
  const full = String(user?.fullName || '').trim();
  if (full) return full;
  return [user?.firstName, user?.middleName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'Applicant';
};


const getJobseekerProfile = (application) =>
  application?.jobseeker?.jobSeekerProfile || {};

const getPrimaryEducation = (application) => {
  const entries = getJobseekerProfile(application)?.educationEntries;
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

const uniqueNormalizedOptions = (values, normalizeDisplay = (value) => String(value || '').trim()) => {
  const optionMap = new Map();

  (values || []).forEach((value) => {
    const displayValue = normalizeDisplay(value);
    const key = normalizeFilterKey(displayValue);

    if (!key || key === 'not specified') return;
    if (!optionMap.has(key)) optionMap.set(key, displayValue);
  });

  return Array.from(optionMap.values()).sort((a, b) => a.localeCompare(b));
};

const getCampus = (application) => {
  const profile = getJobseekerProfile(application);
  const education = getPrimaryEducation(application);

  return normalizeCampusValue(
    profile.campus ||
    education.campus ||
    education.school ||
    ''
  ) || 'Not specified';
};

const getCourse = (application) => {
  const profile = getJobseekerProfile(application);
  const education = getPrimaryEducation(application);

  return normalizeCourseValue(
    profile.course ||
    education.course ||
    education.studyField ||
    profile.studyField ||
    ''
  ) || 'Not specified';
};

const getJobTitle = (application) =>
  String(
    application?.job?.title ||
    application?.job?.jobTitle ||
    ''
  ).trim() || 'Untitled Job';

const getCompany = (application) =>
  String(
    application?.job?.companyName ||
    application?.employer?.employerProfile?.companyName ||
    ''
  ).trim() || 'Company';

const getIndustry = (application) =>
  String(
    application?.job?.category ||
    application?.employer?.employerProfile?.industry ||
    ''
  ).trim() || 'Not specified';

const formatDate = (value) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
};

const toTitleStatus = (status) => String(status || 'pending')
  .split(' ')
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
  .join(' ');

const statusClass = (status) => {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'for interview') return 'bg-[#2e66a6]/10 text-[#2e66a6]';
  if (normalized === 'hired') return 'bg-emerald-50 text-emerald-700';
  if (normalized === 'declined') return 'bg-red-50 text-red-700';
  return 'bg-orange-50 text-orange-700';
};

const truncate = (value, max = 22) => {
  const text = String(value || '').trim();
  if (!text) return '—';
  return text.length > max ? `${text.slice(0, max)}...` : text;
};

const ApplicantAvatar = ({ user }) => {
  const name = getName(user);
  const apiHost = (process.env.REACT_APP_API_URL || 'https://phinmaau-job-portal-atlas.onrender.com/api').replace(/\/api\/?$/, '');
  const src = user?.profileImage ? (/^https?:\/\//i.test(user.profileImage) ? user.profileImage : `${apiHost}${user.profileImage.startsWith('/') ? user.profileImage : `/${user.profileImage}`}`) : '';

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#2e66a6]/10 text-[#2e66a6]">
      {src ? <img src={src} alt={name} className="h-full w-full object-cover" /> : <Icon name="user" className="h-7 w-7" />}
    </div>
  );
};

const StatCard = ({ label, value }) => (
  <div
    className="group relative min-h-[118px] overflow-hidden rounded-2xl px-6 py-5 text-white shadow-[0_10px_24px_rgba(46,102,166,0.18)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:brightness-[1.03] hover:shadow-[0_16px_34px_rgba(46,102,166,0.24)]"
    style={{
      background:
        "linear-gradient(135deg, #123d72 0%, #2e66a6 56%, #5aa9d6 100%)",
    }}
  >
    <div
      className="pointer-events-none absolute right-7 top-1/2 h-16 w-16 -translate-y-1/2 rounded-full blur-2xl transition-all duration-500 ease-out group-hover:scale-110"
      style={{
        background:
          "radial-gradient(circle, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.12) 45%, transparent 75%)",
      }}
    />
    <img
      src="/images/case.png"
      alt=""
      aria-hidden="true"
      className="pointer-events-none absolute right-[-14px] top-1/2 h-20 w-20 -translate-y-1/2 object-contain opacity-40 mix-blend-soft-light saturate-150 transition-all duration-500 ease-out group-hover:right-[-10px] group-hover:scale-105 group-hover:opacity-45 md:h-24 md:w-24"
      style={{
        WebkitMaskImage:
          "radial-gradient(circle at 35% 50%, rgba(0,0,0,1) 0%, rgba(0,0,0,0.65) 55%, rgba(0,0,0,0) 82%)",
        maskImage:
          "radial-gradient(circle at 35% 50%, rgba(0,0,0,1) 0%, rgba(0,0,0,0.65) 55%, rgba(0,0,0,0) 82%)",
      }}
    />
    <div className="relative z-10">
      <p className="text-[30px] font-semibold leading-none tracking-[-0.02em]">{Number(value || 0).toLocaleString('en-PH')}</p>
      <p className="mt-4 text-[13px] font-medium text-white/90">{label}</p>
    </div>
  </div>
);

const AdminApplications = () => {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, forInterview: 0, hired: 0, declined: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [campusFilter, setCampusFilter] = useState('All Campus');
  const [courseFilter, setCourseFilter] = useState('All Course');
  const [jobTitleFilter, setJobTitleFilter] = useState('All Job Title');
  const [companyFilter, setCompanyFilter] = useState('All Company');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [currentPage, setCurrentPage] = useState(1);

  const fetchApplications = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/applications/admin/all');
      if (response.data?.success) {
        setApplications(Array.isArray(response.data.applications) ? response.data.applications : []);
        setStats(response.data.stats || { total: 0, pending: 0, forInterview: 0, hired: 0, declined: 0 });
      } else {
        setError('Failed to load applications.');
      }
    } catch (err) {
      console.error('Error fetching admin applications:', err);
      setError(err.response?.data?.message || 'Failed to load applications.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const campuses = useMemo(
    () => uniqueNormalizedOptions(applications.map(getCampus), normalizeCampusValue),
    [applications]
  );

  const courses = useMemo(
    () => uniqueNormalizedOptions(applications.map(getCourse), normalizeCourseValue),
    [applications]
  );

  const jobTitles = useMemo(
    () => uniqueNormalizedOptions(applications.map(getJobTitle)),
    [applications]
  );

  const companies = useMemo(
    () => uniqueNormalizedOptions(applications.map(getCompany)),
    [applications]
  );

  const filteredApplications = useMemo(() => {
    const term = search.trim().toLowerCase();

    const filtered = applications.filter((app) => {
      const applicant = getName(app.jobseeker);
      const email = app.jobseeker?.email || '';
      const campus = getCampus(app);
      const course = getCourse(app);
      const title = getJobTitle(app);
      const company = getCompany(app);
      const status = toTitleStatus(app.status);

      const haystack = [
        applicant,
        email,
        campus,
        course,
        title,
        company,
        status,
      ].join(' ').toLowerCase();

      if (term && !haystack.includes(term)) return false;
      if (
        campusFilter !== 'All Campus' &&
        normalizeFilterKey(campus) !== normalizeFilterKey(campusFilter)
      ) return false;

      if (
        courseFilter !== 'All Course' &&
        normalizeFilterKey(course) !== normalizeFilterKey(courseFilter)
      ) return false;

      if (
        jobTitleFilter !== 'All Job Title' &&
        normalizeFilterKey(title) !== normalizeFilterKey(jobTitleFilter)
      ) return false;

      if (
        companyFilter !== 'All Company' &&
        normalizeFilterKey(company) !== normalizeFilterKey(companyFilter)
      ) return false;

      if (
        statusFilter !== 'All Status' &&
        normalizeFilterKey(status) !== normalizeFilterKey(statusFilter)
      ) return false;

      return true;
    });

    return [...filtered].sort(
      (first, second) =>
        new Date(second.appliedAt || second.createdAt || 0) -
        new Date(first.appliedAt || first.createdAt || 0)
    );
  }, [
    applications,
    search,
    campusFilter,
    courseFilter,
    jobTitleFilter,
    companyFilter,
    statusFilter,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    search,
    campusFilter,
    courseFilter,
    jobTitleFilter,
    companyFilter,
    statusFilter,
  ]);

  const totalPages = Math.max(Math.ceil(filteredApplications.length / ITEMS_PER_PAGE), 1);

  const paginatedApplications = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredApplications.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredApplications, currentPage]);

  const showingStart = filteredApplications.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const showingEnd = Math.min(currentPage * ITEMS_PER_PAGE, filteredApplications.length);

  const clearFilters = () => {
    setSearch('');
    setCampusFilter('All Campus');
    setCourseFilter('All Course');
    setJobTitleFilter('All Job Title');
    setCompanyFilter('All Company');
    setStatusFilter('All Status');
  };

  const hasActiveFilters =
    search ||
    campusFilter !== 'All Campus' ||
    courseFilter !== 'All Course' ||
    jobTitleFilter !== 'All Job Title' ||
    companyFilter !== 'All Company' ||
    statusFilter !== 'All Status';

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl px-1 py-8">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-[33px] font-semibold leading-[40px] text-gray-900">Applications</h1>
            <p className="mt-1 text-sm text-gray-600">View, filter, and review applicant submissions.</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ring-1 ring-black/5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-[minmax(280px,1.8fr)_minmax(130px,1fr)_minmax(130px,1fr)_minmax(140px,1fr)_minmax(140px,1fr)_minmax(125px,0.9fr)_minmax(90px,0.65fr)]">
            <div className="relative min-w-0 sm:col-span-2 lg:col-span-2 xl:col-span-1">
              <Icon name="search" className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-12 pr-4 text-sm text-slate-700 outline-none shadow-sm transition hover:border-slate-300 focus:border-[#2e66a6] focus:bg-white focus:ring-2 focus:ring-[#2e66a6]/20"
                placeholder="Search applicant, job title..."
                type="search"
              />
            </div>

            <FilterSelect
              value={campusFilter}
              onChange={setCampusFilter}
              options={['All Campus', ...campuses]}
            />

            <FilterSelect
              value={courseFilter}
              onChange={setCourseFilter}
              options={['All Course', ...courses]}
            />

            <FilterSelect
              value={jobTitleFilter}
              onChange={setJobTitleFilter}
              options={['All Job Title', ...jobTitles]}
            />

            <FilterSelect
              value={companyFilter}
              onChange={setCompanyFilter}
              options={['All Company', ...companies]}
            />

            <FilterSelect
              value={statusFilter}
              onChange={setStatusFilter}
              options={['All Status', ...STATUS_OPTIONS]}
            />

            {hasActiveFilters ? (
              <button
                onClick={clearFilters}
                type="button"
                className="inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                <Icon name="refresh" />
                Clear
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ring-1 ring-black/5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-600">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
              <p className="mt-4 text-sm">Loading applications...</p>
            </div>
          ) : error ? (
            <div className="p-6 text-sm font-semibold text-red-600">{error}</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1050px] divide-y divide-slate-200 text-left">
                  <thead className="bg-slate-50">
                    <tr>
                      {[
                        'Applicant',
                        'Campus',
                        'Course',
                        'Job Title',
                        'Company',
                        'Status',
                        'Actions',
                      ].map((head) => (
                        <th
                          key={head}
                          className="whitespace-nowrap px-5 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-500"
                        >
                          {head}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {paginatedApplications.length ? paginatedApplications.map((app) => {
                      const applicantName = getName(app.jobseeker);
                      const campus = getCampus(app);
                      const course = getCourse(app);
                      const jobTitle = getJobTitle(app);
                      const company = getCompany(app);
                                      return (
                        <tr
                          key={app._id}
                          role="link"
                          tabIndex={0}
                          onClick={(event) => {
                            if (event.target.closest("button, a, input, select, textarea, label")) return;
                            navigate(`/admin/applications/${app._id}`);
                          }}
                          onKeyDown={(event) => {
                            if (event.target !== event.currentTarget) return;
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              navigate(`/admin/applications/${app._id}`);
                            }
                          }}
                          className="cursor-pointer transition-colors hover:bg-[#2e66a6]/10 focus:bg-[#2e66a6]/10 focus:outline-none"
                        >
                          <td className="min-w-[220px] px-5 py-4">
                            <div className="flex items-center gap-3">
                              <ApplicantAvatar user={app.jobseeker} />
                              <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-slate-900">
                                  {applicantName}
                                </p>
                                <p className="truncate text-xs text-slate-500">
                                  {app.jobseeker?.email || 'No email'}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="min-w-[130px] px-5 py-4 text-sm text-slate-600">
                            {campus}
                          </td>

                          <td className="min-w-[190px] px-5 py-4 text-sm text-slate-600">
                            {course}
                          </td>

                          <td className="min-w-[180px] px-5 py-4">
                            <p className="text-sm font-bold text-slate-800">
                              {truncate(jobTitle, 22)}
                            </p>
                            <p className="text-xs text-slate-500">
                              {[app.job?.jobType, app.job?.workMode]
                                .filter(Boolean)
                                .join(' • ') || '—'}
                            </p>
                          </td>

                          <td className="min-w-[170px] px-5 py-4">
                            <p className="text-sm font-bold text-slate-800">
                              {truncate(company, 22)}
                            </p>
                          </td>

                          <td className="whitespace-nowrap px-5 py-4">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${statusClass(app.status)}`}
                            >
                              {toTitleStatus(app.status)}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <button
                              onClick={() => navigate(`/admin/applications/${app._id}`)}
                              type="button"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-[#2e66a6]/10 hover:text-[#2e66a6]"
                              title="View application"
                              aria-label="View application"
                            >
                              <Icon name="eye" />
                            </button>
                          </td>
                        </tr>
                      );
                    }) : (
                      <tr>
                        <td colSpan="7" className="px-6 py-12 text-center text-sm text-slate-500">No applications found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                <span>Showing {showingStart} to {showingEnd} of {filteredApplications.length} results</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    disabled={currentPage === 1}
                    className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Previous
                  </button>
                  {Array.from({ length: Math.min(totalPages, 3) }, (_, index) => index + 1)
                    .map((pageNum) => (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setCurrentPage(pageNum)}
                        className={cn(
                          "rounded-md px-3 py-1.5 text-xs font-semibold",
                          currentPage === pageNum
                            ? "bg-[#2e66a6] text-white"
                            : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        )}
                      >
                        {pageNum}
                      </button>
                    ))}
                  <button
                    type="button"
                    onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                    disabled={currentPage >= totalPages}
                    className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

const FilterSelect = ({ value, onChange, options }) => (
  <div className="relative w-full">
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-12 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 pr-10 text-sm font-medium text-slate-700 outline-none transition focus:border-[#2e66a6] focus:bg-white focus:ring-2 focus:ring-[#2e66a6]/20"
    >
      {options.map((option) => <option key={option} value={option}>{option}</option>)}
    </select>
    <Icon name="chevronDown" className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
  </div>
);

export default AdminApplications;
