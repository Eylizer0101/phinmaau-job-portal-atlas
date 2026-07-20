import React, { useCallback, useEffect, useMemo, useState } from "react";
import AdminLayout from "../../layouts/AdminLayout";
import api from "../../services/api";

const cn = (...classes) => classes.filter(Boolean).join(" ");

const ITEMS_PER_PAGE = 10;


const statusOptions = [
  { value: "all", label: "All Types" },
  { value: "post", label: "Deleted Posts" },
  { value: "comment", label: "Deleted Comments" },
  { value: "declined", label: "Declined" },
  { value: "closed", label: "Closed" },
  { value: "expired", label: "Expired" },
];


function formatArchiveDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}




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
  const profileName = user?.role === "employer" ? user?.employerProfile?.companyName : "";
  return (
    profileName ||
    user?.companyName ||
    user?.fullName ||
    [user?.firstName, user?.middleName, user?.lastName].filter(Boolean).join(" ") ||
    user?.email ||
    "Unknown"
  );
};

const getAddress = (item) => {
  const u = item?.user || item?.jobseeker || item?.employer || item;
  return (
    item?.address ||
    item?.location ||
    u?.jobSeekerProfile?.address ||
    u?.employerProfile?.companyAddress ||
    u?.employerProfile?.regionCity ||
    "—"
  );
};

const getCompanyName = (item) => {
  const employer = item?.employer || item?.job?.employer || item;
  return employer?.employerProfile?.companyName || item?.companyName || item?.job?.companyName || getName(employer);
};

const getStatusClass = (status) => {
  const s = String(status || "").toLowerCase();
  if (s.includes("declined") || s.includes("rejected")) return "bg-red-50 text-red-700 ring-1 ring-red-100";
  if (s.includes("closed")) return "bg-slate-100 text-slate-700 ring-1 ring-slate-200";
  if (s.includes("expired")) return "bg-orange-50 text-orange-700 ring-1 ring-orange-100";
  return "bg-slate-100 text-slate-700 ring-1 ring-slate-200";
};

const getApiAssetUrl = (src) => {
  if (!src) return "";
  const value = String(src).trim();
  if (!value) return "";
  if (/^(https?:|data:|blob:)/i.test(value)) return value;

  const apiBase = api?.defaults?.baseURL || process.env.REACT_APP_API_URL || "https://phinmaau-job-portal-atlas.onrender.com/api";
  const apiHost = apiBase.replace(/\/api\/?$/, "").replace(/\/$/, "");
  return `${apiHost}${value.startsWith("/") ? value : `/${value}`}`;
};

const getArchiveCompanyLogo = (item = {}) => {
  return (
    item?.companyLogo ||
    item?.job?.companyLogo ||
    item?.employer?.companyLogo ||
    item?.employer?.employerProfile?.companyLogo ||
    item?.employerProfile?.companyLogo ||
    ""
  );
};

const getArchiveUserImage = (user = {}) => {
  return (
    user?.profileImage ||
    user?.avatar ||
    user?.photoUrl ||
    user?.image ||
    user?.jobSeekerProfile?.profileImage ||
    user?.jobSeekerProfile?.avatar ||
    user?.jobSeekerProfile?.photoUrl ||
    user?.employerProfile?.profileImage ||
    user?.employerProfile?.companyLogo ||
    ""
  );
};

const ArchiveLogo = ({ src, name, icon = "briefcase" }) => {
  const [failed, setFailed] = useState(false);
  const imageUrl = !failed ? getApiAssetUrl(src) : "";
  const initial = String(name || "C").trim().charAt(0).toUpperCase() || "C";

  if (imageUrl) {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <img
          src={imageUrl}
          alt={`${name || "Company"} logo`}
          className="h-full w-full object-cover"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      </div>
    );
  }

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#D7E6F5] bg-[#EEF5FC] text-[#2e66a6] shadow-sm">
      {icon ? <Icon name={icon} className="h-5 w-5" /> : <span className="text-sm font-bold">{initial}</span>}
    </div>
  );
};

const Icon = ({ name, className = "h-4 w-4" }) => {
  const common = { className, fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", strokeWidth: 2 };
  const icons = {
    search: <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m1.35-5.15a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" />,
    calendar: <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3M5 11h14M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />,
    eye: <><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></>,
    restore: <path strokeLinecap="round" strokeLinejoin="round" d="M3 10a9 9 0 103-6.708M3 10V4m0 6h6" />,
    user: <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />,
    briefcase: <path strokeLinecap="round" strokeLinejoin="round" d="M10 6h4a2 2 0 012 2v1h3a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2v-7a2 2 0 012-2h3V8a2 2 0 012-2zm0 3h4V8h-4v1z" />,
  };
  return <svg {...common}>{icons[name]}</svg>;
};

const RestoreModal = ({ item, type, onCancel, onConfirm, loading }) => {
  if (!item) return null;

  const title = type === "community-post" ? "Restore Post" : type === "community-comment" ? "Restore Comment" : type === "job" ? "Restore Job" : type === "application" ? "Restore Application" : "Restore User";
  const name =
    type === "community-post" || type === "community-comment"
      ? (item?.content || "this community item")
      : type === "job"
      ? item?.title || "this job"
      : type === "application"
      ? getName(item?.jobseeker)
      : getName(item);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
      <div className="w-full max-w-[520px] rounded-3xl border border-slate-200 bg-white px-7 py-8 text-center shadow-2xl ring-1 ring-black/5">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#2e66a6]/10 text-[#2e66a6]">
          <Icon name="restore" className="h-8 w-8" />
        </div>
        <h2 className="mt-6 text-2xl font-bold tracking-[-0.02em] text-slate-900">{title}</h2>
        <p className="mx-auto mt-4 max-w-[420px] text-base leading-7 text-slate-600">
          Are you sure you want to restore {type === "job" ? "the" : "the"}{" "}
          <span className="font-semibold text-slate-900">{name}</span>
          {type === "community-post" ? " post" : type === "community-comment" ? " comment" : type === "job" ? " job post" : type === "application" ? " application" : " account"}?
        </p>
        <div className="my-7 h-px bg-slate-200" />
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="h-12 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#2e66a6]/20 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className="h-12 rounded-xl bg-[#2e66a6] text-sm font-semibold text-white shadow-sm transition hover:bg-[#255487] focus:outline-none focus:ring-2 focus:ring-[#2e66a6]/30 focus:ring-offset-2 disabled:opacity-60"
          >
            {loading ? "Restoring..." : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
};

const AdminArchive = () => {
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    role: "all",
    company: "all",
    industry: "all",
    date: "all",
    dateFrom: "",
    dateTo: "",
  });
  const [data, setData] = useState([]);
  const [options, setOptions] = useState({ campuses: [], courses: [] });
  const [loading, setLoading] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState(null);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const loadArchive = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        tab: "community",
        q: filters.search,
        status: filters.status,
        campus: filters.role,
        course: filters.company,
        date: filters.date,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
      };
      const res = await api.get("/admin/archive", { params });
      const payload = res.data || {};
      setData(payload.community || []);
      setOptions(payload.options || { campuses: [], courses: [] });
    } catch (err) {
      console.error("Archive load error:", err);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadArchive();
  }, [loadArchive]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters.search, filters.status, filters.role, filters.company, filters.date, filters.dateFrom, filters.dateTo]);

  const rows = data.filter((item) => isDateInRange(item.archivedAt || item.dateArchived || item.updatedAt || item.createdAt, filters.dateFrom, filters.dateTo));
  const totalPages = Math.max(Math.ceil(rows.length / ITEMS_PER_PAGE), 1);
  const paginatedRows = rows.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const showingStart = rows.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const showingEnd = Math.min(currentPage * ITEMS_PER_PAGE, rows.length);

  const tableHeaders = useMemo(() => ["Author", "Type", "Deleted Content", "Campus / Course", "Date Deleted", "Actions"], []);


  const hasActiveFilters = filters.search || filters.status !== "all" || filters.role !== "all" || filters.company !== "all" || filters.industry !== "all" || filters.date !== "all" || filters.dateFrom || filters.dateTo;

  const handleDateFilterChange = (next) => {
    setFilters((prev) => ({ ...prev, ...next }));
  };

  const resetFilters = () => {
    setFilters({ search: "", status: "all", role: "all", company: "all", industry: "all", date: "all", dateFrom: "", dateTo: "" });
  };

  const openDetails = (row) => {
    window.alert(`${row.archiveType === "comment" ? "Deleted Comment" : "Deleted Post"}

${row.content || "No content"}${row.postContent ? `

Original post: ${row.postContent}` : ""}`);
  };

  const confirmRestore = async () => {
    if (!restoreTarget) return;
    setRestoreLoading(true);
    try {
      await api.patch(`/admin/archive/${restoreTarget.type}/${restoreTarget.item._id}/restore`);
      setRestoreTarget(null);
      await loadArchive();
    } catch (err) {
      console.error("Restore error:", err);
      alert(err?.response?.data?.message || "Failed to restore item.");
    } finally {
      setRestoreLoading(false);
    }
  };

  const permanentlyDeleteCommunityItem = async (row) => {
    const type = row.archiveType === "comment" ? "community-comment" : "community-post";
    const confirmed = window.confirm("Permanently delete this archived community content? This action cannot be undone.");
    if (!confirmed) return;

    try {
      await api.delete(`/admin/archive/${type}/${row._id}`);
      await loadArchive();
    } catch (err) {
      console.error("Permanent delete error:", err);
      alert(err?.response?.data?.message || "Unable to permanently delete this item.");
    }
  };

  const renderAvatar = (row, type = "user") => {
    if (type === "company") {
      return <ArchiveLogo src={getArchiveCompanyLogo(row)} name={getCompanyName(row)} icon="briefcase" />;
    }

    return <ArchiveLogo src={getArchiveUserImage(row)} name={getName(row)} icon="user" />;
  };

  const renderRows = () => {
    if (loading) {
      return (
        <tr>
          <td colSpan={tableHeaders.length} className="py-12 text-center text-sm text-slate-500">
            Loading archived data...
          </td>
        </tr>
      );
    }

    if (!paginatedRows.length) {
      return (
        <tr>
          <td colSpan={tableHeaders.length} className="py-12 text-center text-sm text-slate-500">
            No archived data found.
          </td>
        </tr>
      );
    }

    return paginatedRows.map((row) => {
      const status = row.archiveStatus || row.statusLabel || row.status || "Archived";
      const archiveDate = row.archivedAt || row.dateArchived || row.updatedAt || row.createdAt;

      const author = row.author || {};
        const campus = author?.jobSeekerProfile?.campus || "—";
        const course = author?.jobSeekerProfile?.course || "—";
        const restoreType = row.archiveType === "comment" ? "community-comment" : "community-post";
        return (
          <tr
            key={`${row.archiveType}-${row._id}`}
            tabIndex={0}
            onDoubleClick={() => openDetails(row)}
            className="border-b border-slate-100 transition-colors last:border-b-0 hover:bg-[#2e66a6]/5"
          >
            <td className="px-6 py-4">
              <div className="flex items-center gap-3">
                {renderAvatar(author, "user")}
                <div>
                  <p className="font-semibold text-slate-800">{getName(author)}</p>
                  <p className="text-xs text-slate-500">{author.email || "—"}</p>
                </div>
              </div>
            </td>
            <td className="px-6 py-4">
              <span className={cn(
                "rounded-full px-3 py-1 text-[11px] font-semibold uppercase ring-1",
                row.archiveType === "comment"
                  ? "bg-violet-50 text-violet-700 ring-violet-100"
                  : "bg-blue-50 text-blue-700 ring-blue-100"
              )}>
                {row.archiveType === "comment" ? "Comment" : "Post"}
              </span>
            </td>
            <td className="max-w-[360px] px-6 py-4">
              <p className="line-clamp-2 font-medium text-slate-700">{row.content || "—"}</p>
              {row.postContent ? <p className="mt-1 line-clamp-1 text-xs text-slate-500">From post: {row.postContent}</p> : null}
            </td>
            <td className="px-6 py-4 text-slate-600">
              <p>{campus}</p>
              <p className="text-xs text-slate-500">{course}</p>
            </td>
            <td className="px-6 py-4 text-slate-600">{formatArchiveDate(archiveDate)}</td>
            <td className="px-6 py-4">
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => openDetails(row)} title="View" className="rounded-lg p-1 text-slate-500 transition hover:bg-[#2e66a6]/10 hover:text-[#2e66a6]"><Icon name="eye" /></button>
                <button type="button" onClick={() => setRestoreTarget({ type: restoreType, item: row })} title="Restore" className="rounded-lg p-1 text-slate-500 transition hover:bg-[#2e66a6]/10 hover:text-[#2e66a6]"><Icon name="restore" /></button>
                <button type="button" onClick={() => permanentlyDeleteCommunityItem(row)} title="Delete permanently" className="rounded-lg p-1 text-red-500 transition hover:bg-red-50 hover:text-red-700">
                  <span className="text-lg leading-none">×</span>
                </button>
              </div>
            </td>
          </tr>
        );
    });
  };

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl px-1 py-8">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-[33px] font-semibold leading-[40px] text-gray-900">Archive</h1>
            <p className="mt-1 text-sm text-gray-600">Review deleted community posts and comments, then restore or permanently delete them.</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm ring-1 ring-black/5">
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(240px,1.4fr)_repeat(4,minmax(135px,0.75fr))_minmax(190px,1fr)_auto] xl:items-end">
              <div className="relative min-w-0">
                <Icon name="search" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  value={filters.search}
                  onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                  placeholder="Search author or deleted content..."
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-12 pr-4 text-sm text-slate-700 outline-none shadow-sm transition hover:border-slate-300 focus:border-[#2e66a6] focus:bg-white focus:ring-2 focus:ring-[#2e66a6]/20"
                />
              </div>
              <select value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))} className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none shadow-sm transition hover:border-slate-300 focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/20">
                {statusOptions.slice(0, 3).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <select value={filters.role} onChange={(e) => setFilters((f) => ({ ...f, role: e.target.value }))} className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none shadow-sm transition hover:border-slate-300 focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/20">
                <option value="all">All Campuses</option>
                {(options.campuses || []).map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
              <select value={filters.company} onChange={(e) => setFilters((f) => ({ ...f, company: e.target.value }))} className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none shadow-sm transition hover:border-slate-300 focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/20">
                <option value="all">All Courses</option>
                {(options.courses || []).map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
              <div className="hidden xl:block" />

              <DateFilterDropdown
                value={filters.date}
                dateFrom={filters.dateFrom}
                dateTo={filters.dateTo}
                onChange={handleDateFilterChange}
              />

              {hasActiveFilters ? (
                <button type="button" onClick={resetFilters} className="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#2e66a6]/20">
                  <Icon name="restore" /> Clear All
                </button>
              ) : null}
            </div>
          </div>


          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ring-1 ring-black/5">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.12em] text-slate-500">
                  <tr>
                    {tableHeaders.map((h) => <th key={h} className="px-6 py-4 font-bold">{h}</th>)}
                  </tr>
                </thead>
                <tbody>{renderRows()}</tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-4 text-xs text-slate-500">
              <span>Showing {showingStart} to {showingEnd} of {rows.length || 0} results</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={currentPage === 1}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>
                {Array.from({ length: Math.min(totalPages, 3) }, (_, index) => index + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setCurrentPage(pageNum)}
                    className={cn(
                      "rounded-lg px-3 py-1.5 font-semibold shadow-sm",
                      currentPage === pageNum
                        ? "bg-[#2e66a6] text-white"
                        : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    {pageNum}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={currentPage >= totalPages}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <RestoreModal
        item={restoreTarget?.item}
        type={restoreTarget?.type}
        loading={restoreLoading}
        onCancel={() => setRestoreTarget(null)}
        onConfirm={confirmRestore}
      />
    </AdminLayout>
  );
};

export default AdminArchive;
