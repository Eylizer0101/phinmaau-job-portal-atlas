import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  CalendarDays,
  ChevronDown,
  Download,
  Filter,
  RefreshCw,
  X,
} from "lucide-react";
import * as XLSX from "xlsx";
import api from "../../services/api";

const numberFormat = new Intl.NumberFormat("en-US");

const dateOptions = [
  ["overall", "Overall"],
  ["today", "Today"],
  ["yesterday", "Yesterday"],
  ["thisWeek", "This Week"],
  ["lastWeek", "Last Week"],
  ["thisMonth", "This Month"],
  ["lastMonth", "Last Month"],
  ["thisYear", "This Year"],
  ["lastYear", "Last Year"],
  ["specific", "Specific Date"],
  ["range", "Date Range"],
];

const emptyAnalytics = {
  kpis: {
    totalUsers: 0,
    totalJobseekers: 0,
    totalEmployers: 0,
    totalRegisteredUsers: 0,
    totalJobPosts: 0,
    activeJobs: 0,
    applications: 0,
    hired: 0,
    hireRate: 0,
    pendingVerification: 0,
    pendingJobseekers: 0,
    pendingEmployers: 0,
    pendingEditRequests: 0,
    unreadMessages: 0,
    systemFailures: 0,
  },
  trends: [],
  filters: { options: {} },
  sections: {
    users: { roles: [], statuses: [], verification: [], campuses: [] },
    jobs: {
      statuses: [],
      categories: [],
      employmentTypes: [],
      workModes: [],
      totalVacancies: 0,
      totalViews: 0,
    },
    applications: {
      funnel: [],
      interviewRate: 0,
      hireRate: 0,
      employmentStatus: [],
    },
    verification: {
      emailRequests: 0,
      emailVerified: 0,
      emailCompletionRate: 0,
      byRole: [],
    },
    operations: {
      editRequests: [],
      editRequestSections: [],
      messages: [],
      messageRead: [],
      conversationPreferences: [],
      notifications: [],
      notificationRead: [],
      system: {
        statuses: [],
        modules: [],
        methods: [],
        p95DurationMs: 0,
        serverErrors: 0,
      },
    },
  },
};

const initialFilters = {
  date: "overall",
  dateField: "primary",
  specificDate: "",
  startDate: "",
  endDate: "",
  role: "all",
  campus: "all",
  userStatus: "all",
  verificationStatus: "all",
  jobStatus: "all",
  category: "all",
  jobType: "all",
  workMode: "all",
  applicationStatus: "all",
  company: "all",
  editRequestStatus: "all",
  messageType: "all",
  notificationType: "all",
  logStatus: "all",
  logModule: "all",
};

const statCardImages = {
  users: "/images/admin_1.png",
  jobs: "/images/case.png",
  applications: "/images/admin_3.png",
  hired: "/images/admin_2.png",
  rate: "/images/admin_4.png",
  verification: "/images/admin_3.png",
  messages: "/images/admin_1.png",
  failures: "/images/case.png",
};

const colors = [
  "#2e66a6",
  "#16a36f",
  "#dc9300",
  "#6366f1",
  "#dc2626",
  "#64748b",
  "#0891b2",
];

const titleCase = (value) =>
  String(value || "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const HeaderStatusCard = ({ label, value }) => (
  <div className="relative inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-bold text-slate-700 shadow-sm">
    <span className="absolute -top-2 right-2 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-[#2e66a6] px-1 text-[10px] font-extrabold leading-none text-white shadow-sm">
      {numberFormat.format(Number(value || 0))}
    </span>
    <span className="whitespace-nowrap">{label}</span>
  </div>
);

const StatCard = ({ label, value, suffix = "", imageSrc }) => (
  <div className="group relative min-h-[104px] w-full overflow-hidden rounded-2xl bg-gradient-to-br from-[#072258] via-[#2d63a0] to-[#52b2db] px-4 py-3.5 text-left text-white shadow-[0_10px_30px_rgba(0,0,0,0.18)] transition-all duration-500 ease-out hover:scale-[1.02] hover:brightness-105 hover:shadow-[0_20px_50px_rgba(0,0,0,0.25)]">
    <div
      className="pointer-events-none absolute right-7 top-1/2 h-[56px] w-[56px] -translate-y-1/2 rounded-full blur-[30px]"
      style={{
        background:
          "radial-gradient(circle, rgba(255,255,255,.25) 0%, rgba(255,255,255,.14) 45%, transparent 75%)",
      }}
    />
    <img
      src={imageSrc}
      alt=""
      aria-hidden="true"
      className="pointer-events-none absolute right-[-14px] top-1/2 h-16 w-16 -translate-y-1/2 object-contain opacity-50 mix-blend-soft-light saturate-150 transition-all duration-700 group-hover:right-[-12px] group-hover:scale-105"
      style={{
        WebkitMaskImage:
          "radial-gradient(circle at 35% 50%, #000 0%, rgba(0,0,0,.6) 55%, transparent 80%)",
        maskImage:
          "radial-gradient(circle at 35% 50%, #000 0%, rgba(0,0,0,.6) 55%, transparent 80%)",
      }}
    />
    <div className="relative z-10 flex min-h-[76px] flex-col justify-center text-left">
      <h3 className="text-[26px] font-semibold leading-none">
        {numberFormat.format(Number(value || 0))}
        {suffix}
      </h3>
      <p className="mt-2 flex items-center gap-1 whitespace-nowrap text-[13px] text-white/90">
        <span>{label}</span>
        <span className="ml-0.5 text-[15px] font-bold">&gt;</span>
      </p>
    </div>
    <div className="pointer-events-none absolute inset-0 rounded-2xl border-2 border-transparent transition group-hover:border-white/20" />
  </div>
);

const FilterSelect = ({
  label,
  value,
  onChange,
  values = [],
  allLabel = "All",
  disabled = false,
}) => (
  <label className="block min-w-0">
    <span className="mb-1 block text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500">
      {label}
    </span>
    <select
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none transition focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/20 disabled:bg-slate-50"
    >
      <option value="all">{allLabel}</option>
      {values.map((item) => (
        <option key={item} value={item}>
          {titleCase(item)}
        </option>
      ))}
    </select>
  </label>
);

const DateInput = ({ label, value, onChange }) => (
  <label className="block">
    <span className="mb-1 block text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500">
      {label}
    </span>
    <input
      type="date"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/20"
    />
  </label>
);

const formatDateInput = (date) => {
  if (!date) return "";
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return "";
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
};

const formatDateLabel = (value) => {
  if (!value) return "Select date";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "Select date";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
};

const addCalendarMonths = (date, amount) => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + amount);
  return next;
};

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const dummyMonthlyTrends = [
  { key: "2026-01", label: "Jan 26", registrations: 18, jobs: 11, applications: 32, hires: 6 },
  { key: "2026-02", label: "Feb 26", registrations: 22, jobs: 13, applications: 38, hires: 7 },
  { key: "2026-03", label: "Mar 26", registrations: 27, jobs: 15, applications: 44, hires: 9 },
  { key: "2026-04", label: "Apr 26", registrations: 24, jobs: 16, applications: 41, hires: 8 },
  { key: "2026-05", label: "May 26", registrations: 31, jobs: 18, applications: 49, hires: 11 },
  { key: "2026-06", label: "Jun 26", registrations: 36, jobs: 20, applications: 56, hires: 13 },
  { key: "2026-07", label: "Jul 26", registrations: 33, jobs: 19, applications: 52, hires: 12 },
  { key: "2026-08", label: "Aug 26", registrations: 40, jobs: 23, applications: 63, hires: 15 },
  { key: "2026-09", label: "Sep 26", registrations: 46, jobs: 27, applications: 71, hires: 18 },
  { key: "2026-10", label: "Oct 26", registrations: 42, jobs: 25, applications: 67, hires: 16 },
  { key: "2026-11", label: "Nov 26", registrations: 49, jobs: 29, applications: 76, hires: 20 },
  { key: "2026-12", label: "Dec 26", registrations: 54, jobs: 31, applications: 82, hires: 22 },
];

const getDummyFilterMultiplier = (filters = {}) => {
  const filterWeights = {
    role: 0.82,
    campus: 0.72,
    userStatus: 0.88,
    verificationStatus: 0.8,
    jobStatus: 0.84,
    category: 0.74,
    jobType: 0.78,
    workMode: 0.8,
    applicationStatus: 0.76,
    company: 0.68,
    editRequestStatus: 0.9,
    messageType: 0.92,
    notificationType: 0.92,
    logStatus: 0.94,
    logModule: 0.9,
  };

  return Object.entries(filterWeights).reduce((multiplier, [key, weight]) => {
    const value = String(filters?.[key] || "all").toLowerCase();
    return value && value !== "all" ? multiplier * weight : multiplier;
  }, 1);
};

const getDummyTrendData = (filters = {}) => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const multiplier = getDummyFilterMultiplier(filters);

  let rows = dummyMonthlyTrends.map((item) => ({ ...item }));

  const pickMonth = (monthIndex) =>
    rows.filter((item) => Number(item.key.slice(5, 7)) - 1 === monthIndex);

  if (["today", "yesterday", "thisWeek", "lastWeek", "thisMonth"].includes(filters.date)) {
    rows = pickMonth(currentMonth);
  } else if (filters.date === "lastMonth") {
    rows = pickMonth((currentMonth + 11) % 12);
  } else if (filters.date === "specific" && filters.specificDate) {
    const specific = new Date(`${filters.specificDate}T00:00:00`);
    if (!Number.isNaN(specific.getTime()) && specific.getFullYear() === 2026) {
      rows = pickMonth(specific.getMonth());
    } else {
      rows = [];
    }
  } else if (filters.date === "range" && filters.startDate && filters.endDate) {
    const start = new Date(`${filters.startDate}T00:00:00`);
    const end = new Date(`${filters.endDate}T23:59:59`);
    rows = rows.filter((item) => {
      const rowDate = new Date(`${item.key}-01T00:00:00`);
      return rowDate >= start && rowDate <= end;
    });
  } else if (filters.date === "lastYear") {
    rows = rows.map((item) => ({
      ...item,
      key: item.key.replace("2026", String(currentYear - 1)),
      label: item.label.replace("26", String(currentYear - 1).slice(-2)),
    }));
  }

  return rows.map((item, index) => {
    const dateFieldFactor = filters.dateField === "created" ? 0.94 : filters.dateField === "outcome" ? 0.86 : 1;
    const variation = 0.96 + (index % 4) * 0.025;
    const factor = multiplier * dateFieldFactor * variation;

    return {
      ...item,
      registrations: Math.max(1, Math.round(item.registrations * factor)),
      jobs: Math.max(1, Math.round(item.jobs * factor)),
      applications: Math.max(1, Math.round(item.applications * factor)),
      hires: Math.max(1, Math.round(item.hires * factor)),
    };
  });
};

const getYearOptions = () => {
  const firstYear = 1950;
  const currentYear = new Date().getFullYear();
  return Array.from(
    { length: currentYear - firstYear + 1 },
    (_, index) => currentYear - index,
  );
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
  const gridStart = new Date(year, month, 1 - firstDay.getDay());
  const start = startDate ? new Date(`${startDate}T00:00:00`) : null;
  const end = endDate ? new Date(`${endDate}T00:00:00`) : null;
  const days = Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + index);
    return day;
  });

  const sameDay = (first, second) =>
    first && second && first.toDateString() === second.toDateString();
  const withinRange = (day) => start && end && day >= start && day <= end;

  return (
    <div className="min-w-0 flex-1">
      <div className="mb-3 grid grid-cols-[34px_1fr_34px] items-center gap-2">
        <button
          type="button"
          onClick={() => onChangeMonth(addCalendarMonths(monthDate, -1))}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-xl text-slate-600 transition hover:bg-slate-100"
          aria-label="Previous month"
        >
          ‹
        </button>
        <div className="grid grid-cols-[1fr_82px] gap-2">
          <select
            value={month}
            onChange={(event) =>
              onChangeMonth(new Date(year, Number(event.target.value), 1))
            }
            className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-center text-xs font-bold text-[#2e66a6] outline-none focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/20"
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
            onChange={(event) =>
              onChangeMonth(new Date(Number(event.target.value), month, 1))
            }
            className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-center text-xs font-bold text-[#2e66a6] outline-none focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/20"
            aria-label="Select year"
          >
            {getYearOptions().map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={() => onChangeMonth(addCalendarMonths(monthDate, 1))}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-xl text-slate-600 transition hover:bg-slate-100"
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 text-center text-[10px] font-bold uppercase text-slate-400">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-y-1 text-center text-xs">
        {days.map((day) => {
          const value = formatDateInput(day);
          const outside = day.getMonth() !== month;
          const selected = sameDay(day, start) || sameDay(day, end);
          const ranged = withinRange(day);
          return (
            <button
              type="button"
              key={value}
              onClick={() => onPickDate(value)}
              className={`mx-auto flex h-8 w-full items-center justify-center transition ${outside ? "text-slate-300" : "text-slate-700"} ${ranged ? "bg-[#2e66a6]/10 text-[#2e66a6]" : ""} ${selected ? "rounded-lg bg-[#2e66a6] font-bold text-white shadow-sm" : "rounded-md hover:bg-[#2e66a6]/10"}`}
              aria-label={formatDateLabel(value)}
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
  const today = formatDateInput(new Date());
  const [draftStart, setDraftStart] = useState(startDate || today);
  const [draftEnd, setDraftEnd] = useState(endDate || today);
  const [leftMonth, setLeftMonth] = useState(
    new Date(`${startDate || today}T00:00:00`),
  );
  const [rightMonth, setRightMonth] = useState(
    addCalendarMonths(new Date(`${endDate || today}T00:00:00`), 1),
  );
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const nextStart = startDate || today;
    const nextEnd = endDate || today;
    setDraftStart(nextStart);
    setDraftEnd(nextEnd);
    setLeftMonth(new Date(`${nextStart}T00:00:00`));
    setRightMonth(addCalendarMonths(new Date(`${nextEnd}T00:00:00`), 1));
    const previousOverflow = document.body.style.overflow;
    previousFocusRef.current = document.activeElement;
    document.body.style.overflow = "hidden";
    const focusTimer = setTimeout(() => closeRef.current?.focus(), 0);
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onCancel();
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll(
        'button:not([disabled]), select:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      }
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      previousFocusRef.current?.focus?.();
    };
    // onCancel is intentionally omitted because the parent supplies an inline close handler.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, startDate, endDate, today]);

  if (!open) return null;

  const pickDate = (value) => {
    if (!draftStart || draftEnd) {
      setDraftStart(value);
      setDraftEnd("");
    } else if (
      new Date(`${value}T00:00:00`) < new Date(`${draftStart}T00:00:00`)
    ) {
      setDraftEnd(draftStart);
      setDraftStart(value);
    } else {
      setDraftEnd(value);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/65 px-3 py-5 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="analytics-date-range-title"
        className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4">
          <div>
            <h2
              id="analytics-date-range-title"
              className="text-base font-bold text-slate-900"
            >
              Select Date Range
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Choose the starting and ending dates for the analytics report.
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onCancel}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2e66a6]/25"
            aria-label="Close date range modal"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-3 bg-slate-50/80 px-5 py-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <span className="block text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
              Start Date
            </span>
            <span className="mt-1 flex items-center gap-2 text-sm font-bold text-[#2e66a6]">
              <CalendarDays size={16} />
              {formatDateLabel(draftStart)}
            </span>
          </div>
          <span className="hidden text-lg text-slate-400 sm:block">→</span>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <span className="block text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
              End Date
            </span>
            <span className="mt-1 flex items-center gap-2 text-sm font-bold text-[#2e66a6]">
              <CalendarDays size={16} />
              {formatDateLabel(draftEnd)}
            </span>
          </div>
        </div>

        <div className="grid gap-7 px-5 py-5 md:grid-cols-2">
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

        <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-slate-100 bg-white px-5 py-4">
          <button
            type="button"
            onClick={onCancel}
            className="h-10 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() =>
              draftStart && draftEnd && onApply(draftStart, draftEnd)
            }
            disabled={!draftStart || !draftEnd}
            className="h-10 rounded-xl bg-[#2e66a6] px-6 text-sm font-bold text-white shadow-md shadow-[#2e66a6]/20 transition hover:bg-[#255487] disabled:cursor-not-allowed disabled:opacity-50"
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
  startDate,
  endDate,
  onSelect,
  disabled,
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const selectedLabel =
    value === "range" && startDate && endDate
      ? `${formatDateLabel(startDate)} – ${formatDateLabel(endDate)}`
      : dateOptions.find(([optionValue]) => optionValue === value)?.[1] ||
        "Overall";

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    };
    const closeWithEscape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", close);
    window.addEventListener("keydown", closeWithEscape);
    return () => {
      window.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", closeWithEscape);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative min-w-0">
      <span className="mb-1 block text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500">
        Date Range
      </span>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className="flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 text-left text-xs font-semibold text-slate-700 outline-none transition hover:bg-slate-50 focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/20 disabled:bg-slate-50"
        aria-expanded={open}
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-slate-400 transition ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open ? (
        <div className="absolute left-0 top-[48px] z-40 w-56 rounded-xl border border-slate-100 bg-white p-2 shadow-xl">
          {dateOptions.map(([optionValue, label]) => (
            <button
              type="button"
              key={optionValue}
              onClick={() => {
                setOpen(false);
                onSelect(optionValue);
              }}
              className={`w-full rounded-lg px-3 py-2 text-left text-xs font-semibold transition ${value === optionValue ? "bg-[#2e66a6]/10 text-[#2e66a6]" : "text-slate-600 hover:bg-slate-50"}`}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
};

const ChartCard = ({ title, subtitle, children, className = "" }) => (
  <section
    className={`min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}
  >
    <div className="mb-3 border-b border-slate-100 pb-3">
      <h2 className="text-sm font-bold text-slate-800">{title}</h2>
      {subtitle ? (
        <p className="mt-0.5 text-[11px] text-slate-500">{subtitle}</p>
      ) : null}
    </div>
    {children}
  </section>
);

const EmptyChart = () => (
  <div className="flex h-32 items-center justify-center rounded-xl bg-slate-50 text-xs font-medium text-slate-400">
    No data for the selected filters.
  </div>
);

const HorizontalBars = ({ data = [], maxItems = 8, percentage = false }) => {
  const rows = data.slice(0, maxItems);
  const max = Math.max(1, ...rows.map((item) => Number(item.value || 0)));
  if (!rows.length) return <EmptyChart />;
  return (
    <div className="space-y-2.5">
      {rows.map((item, index) => (
        <div
          key={`${item.name}-${index}`}
          className="grid grid-cols-[minmax(90px,140px)_1fr_auto] items-center gap-3 text-xs"
        >
          <span
            className="truncate text-right font-semibold text-slate-600"
            title={titleCase(item.name)}
          >
            {titleCase(item.name)}
          </span>
          <div className="h-6 overflow-hidden rounded-md bg-slate-100">
            <div
              className="h-full min-w-[3px] rounded-lg transition-all"
              style={{
                width: `${Math.max(2, (Number(item.value || 0) / max) * 100)}%`,
                backgroundColor: colors[index % colors.length],
              }}
            />
          </div>
          <span className="w-10 text-right font-bold text-slate-700">
            {numberFormat.format(Number(item.value || 0))}
            {percentage ? "%" : ""}
          </span>
        </div>
      ))}
    </div>
  );
};

const DonutChart = ({ data = [] }) => {
  const rows = data.filter((item) => Number(item.value || 0) > 0);
  const total = rows.reduce((sum, item) => sum + Number(item.value || 0), 0);
  if (!rows.length || !total) return <EmptyChart />;
  let cursor = 0;
  const stops = rows.map((item, index) => {
    const start = cursor;
    cursor += (Number(item.value || 0) / total) * 100;
    return `${colors[index % colors.length]} ${start}% ${cursor}%`;
  });
  return (
    <div className="grid min-h-40 items-center gap-4 sm:grid-cols-[150px_1fr]">
      <div
        className="relative mx-auto h-32 w-32 rounded-full"
        style={{ background: `conic-gradient(${stops.join(",")})` }}
      >
        <div className="absolute inset-6 flex flex-col items-center justify-center rounded-full bg-white">
          <span className="text-2xl font-extrabold text-slate-800">
            {numberFormat.format(total)}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
            Total
          </span>
        </div>
      </div>
      <div className="space-y-2">
        {rows.slice(0, 8).map((item, index) => (
          <div
            key={item.name}
            className="flex items-center justify-between gap-3 text-xs"
          >
            <span className="flex min-w-0 items-center gap-2 text-slate-600">
              <i
                className="h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: colors[index % colors.length] }}
              />
              <span className="truncate">{titleCase(item.name)}</span>
            </span>
            <strong className="text-slate-800">
              {numberFormat.format(item.value)}
            </strong>
          </div>
        ))}
      </div>
    </div>
  );
};

const TrendChart = ({ data = [] }) => {
  const series = [
    ["registrations", "Registrations", "#dbeafe"],
    ["jobs", "Jobs", "#6ee7b7"],
    ["applications", "Applications", "#fcd34d"],
    ["hires", "Hires", "#c4b5fd"],
  ];

  if (!data.length) {
    return (
      <div className="flex h-32 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-xs font-medium text-white/65">
        No data for the selected filters.
      </div>
    );
  }

  const width = 920;
  const height = 235;
  const left = 48;
  const right = 18;
  const top = 14;
  const bottom = 42;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const max = Math.max(
    1,
    ...data.flatMap((item) => series.map(([key]) => Number(item[key] || 0))),
  );

  const groupWidth = plotWidth / data.length;
  const groupPadding = Math.min(12, groupWidth * 0.13);
  const usableGroupWidth = Math.max(8, groupWidth - groupPadding * 2);
  const barGap = Math.min(4, usableGroupWidth * 0.04);
  const barWidth = Math.max(
    2,
    (usableGroupWidth - barGap * (series.length - 1)) / series.length,
  );

  const showLabel = (index) =>
    data.length <= 10 ||
    index % Math.ceil(data.length / 8) === 0 ||
    index === data.length - 1;

  return (
    <div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-[205px] w-full"
        role="img"
        aria-label="Monthly analytics grouped bar chart"
      >
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = top + plotHeight - ratio * plotHeight;
          return (
            <g key={ratio}>
              <line
                x1={left}
                y1={y}
                x2={width - right}
                y2={y}
                stroke="rgba(255,255,255,0.18)"
                strokeWidth="1"
              />
              <text
                x={left - 8}
                y={y + 4}
                textAnchor="end"
                fontSize="10"
                fill="rgba(255,255,255,0.72)"
              >
                {Math.round(max * ratio)}
              </text>
            </g>
          );
        })}

        {data.slice(0, -1).map((item, dataIndex) => {
          const x = left + (dataIndex + 1) * groupWidth;
          return (
            <line
              key={`divider-${item.key || item.label}-${dataIndex}`}
              x1={x}
              y1={top}
              x2={x}
              y2={top + plotHeight}
              stroke="rgba(255,255,255,0.13)"
              strokeWidth="1"
            />
          );
        })}

        {data.map((item, dataIndex) => {
          const groupStart = left + dataIndex * groupWidth + groupPadding;

          return (
            <g key={`${item.key || item.label}-${dataIndex}`}>
              {series.map(([key, label, color], seriesIndex) => {
                const value = Number(item[key] || 0);
                const barHeight = (value / max) * plotHeight;
                const x = groupStart + seriesIndex * (barWidth + barGap);
                const y = top + plotHeight - barHeight;

                return (
                  <rect
                    key={`${key}-${dataIndex}`}
                    x={x}
                    y={y}
                    width={barWidth}
                    height={Math.max(0, barHeight)}
                    rx={Math.min(3, barWidth / 3)}
                    fill={color}
                    opacity="0.96"
                  >
                    <title>{`${label}: ${numberFormat.format(value)}`}</title>
                  </rect>
                );
              })}

              {showLabel(dataIndex) ? (
                <text
                  x={left + dataIndex * groupWidth + groupWidth / 2}
                  y={height - 11}
                  textAnchor="middle"
                  fontSize="10"
                  fill="rgba(255,255,255,0.78)"
                >
                  {item.label}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>

      <div className="mt-1 flex flex-wrap justify-center gap-x-5 gap-y-2 border-t border-white/15 pt-3">
        {series.map(([, label, color]) => (
          <span
            key={label}
            className="flex items-center gap-1.5 text-[11px] font-semibold text-white/85"
          >
            <i
              className="h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: color }}
            />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
};

const FunnelChart = ({ data = [] }) => {
  const rows = data.filter((item) => Number(item.value || 0) > 0);
  const max = Math.max(1, ...rows.map((item) => item.value));
  if (!rows.length) return <EmptyChart />;
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-2 py-1">
      {rows.map((item, index) => {
        const proportionalWidth = (Number(item.value || 0) / max) * 100;
        const width = Math.max(44, Math.min(100, proportionalWidth));
        return (
          <div key={item.name} className="w-full text-center">
            <div
              className="mx-auto flex h-8 items-center justify-center rounded-lg px-3 text-xs font-bold text-white shadow-sm"
              style={{
                width: `${width}%`,
                backgroundColor: colors[index % colors.length],
              }}
            >
              <span className="truncate">
                {titleCase(item.name)} · {numberFormat.format(item.value)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const MetricTile = ({ label, value, suffix = "", icon: Icon }) => (
  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
          {label}
        </p>
        <p className="mt-1 text-2xl font-extrabold text-slate-800">
          {numberFormat.format(Number(value || 0))}
          {suffix}
        </p>
      </div>
      <div className="rounded-xl bg-[#2e66a6]/10 p-2.5 text-[#2e66a6]">
        <Icon size={20} />
      </div>
    </div>
  </div>
);

const AnalyticsSkeleton = () => (
  <div
    className="grid animate-pulse grid-cols-1 gap-4 xl:grid-cols-12"
    aria-label="Loading analytics charts"
  >
    <div className="h-56 rounded-2xl border border-slate-200 bg-white p-4 xl:col-span-12">
      <div className="h-4 w-40 rounded bg-slate-200" />
      <div className="mt-5 h-36 rounded-xl bg-slate-100" />
    </div>
    <div className="h-60 rounded-2xl border border-slate-200 bg-white p-4 xl:col-span-7">
      <div className="h-4 w-36 rounded bg-slate-200" />
      <div className="mt-5 space-y-3">
        {[100, 86, 72, 58].map((width) => (
          <div
            key={width}
            className="mx-auto h-7 rounded-lg bg-slate-100"
            style={{ width: `${width}%` }}
          />
        ))}
      </div>
    </div>
    <div className="h-60 rounded-2xl border border-slate-200 bg-white p-4 xl:col-span-5">
      <div className="h-4 w-32 rounded bg-slate-200" />
      <div className="mt-5 space-y-3">
        {["w-full", "w-4/5", "w-3/5", "w-2/5"].map((width) => (
          <div key={width} className={`h-6 rounded-md bg-slate-100 ${width}`} />
        ))}
      </div>
    </div>
  </div>
);

const AdminDashboard = () => {
  const [analytics, setAnalytics] = useState(emptyAnalytics);
  const [filters, setFilters] = useState(initialFilters);
  const [activeTab, setActiveTab] = useState("overview");
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [showCustomDateModal, setShowCustomDateModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [dummyMode, setDummyMode] = useState(false);

  const options = analytics?.filters?.options || {};
  const kpis = analytics?.kpis || emptyAnalytics.kpis;
  const sections = analytics?.sections || emptyAnalytics.sections;
  const displayedTrends = useMemo(
    () => (dummyMode ? getDummyTrendData(filters) : analytics.trends || []),
    [dummyMode, filters, analytics.trends],
  );

  const requestParams = useMemo(() => {
    const next = { ...filters };
    if (next.date !== "specific") delete next.specificDate;
    if (next.date !== "range") {
      delete next.startDate;
      delete next.endDate;
    }
    return next;
  }, [filters]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/admin/analytics", {
        params: requestParams,
      });
      setAnalytics({
        ...emptyAnalytics,
        ...(response.data || {}),
        sections: {
          ...emptyAnalytics.sections,
          ...(response.data?.sections || {}),
        },
      });
    } catch (err) {
      console.error("Admin analytics error:", err);
      setError(
        err?.response?.data?.message || "Unable to load analytics data.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchAnalytics, 180);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestParams]);

  const updateFilter = (name, value) =>
    setFilters((previous) => ({ ...previous, [name]: value }));
  const selectDateFilter = (value) => {
    if (value === "range") {
      setShowCustomDateModal(true);
      return;
    }
    setFilters((previous) => ({
      ...previous,
      date: value,
      specificDate: value === "specific" ? previous.specificDate : "",
      startDate: "",
      endDate: "",
    }));
  };
  const applyCustomDateRange = (startDate, endDate) => {
    setFilters((previous) => ({
      ...previous,
      date: "range",
      specificDate: "",
      startDate,
      endDate,
    }));
    setShowCustomDateModal(false);
  };
  const resetFilters = () => setFilters(initialFilters);
  const hasFilters = JSON.stringify(filters) !== JSON.stringify(initialFilters);

  const exportAnalytics = () => {
    try {
      setExporting(true);
      const workbook = XLSX.utils.book_new();
      const addSheet = (name, rows) =>
        XLSX.utils.book_append_sheet(
          workbook,
          XLSX.utils.json_to_sheet(
            rows?.length ? rows : [{ Message: "No data" }],
          ),
          name.slice(0, 31),
        );
      addSheet(
        "KPIs",
        Object.entries(kpis).map(([metric, value]) => ({
          Metric: titleCase(metric),
          Value: value,
        })),
      );
      addSheet("Trends", displayedTrends);
      addSheet("Application Funnel", sections.applications?.funnel || []);
      addSheet("Job Categories", sections.jobs?.categories || []);
      addSheet("User Verification", sections.users?.verification || []);
      addSheet("Messages", sections.operations?.messages || []);
      addSheet("Notifications", sections.operations?.notifications || []);
      addSheet("System Modules", sections.operations?.system?.modules || []);
      XLSX.writeFile(
        workbook,
        `admin-analytics-${new Date().toISOString().slice(0, 10)}.xlsx`,
      );
    } catch (err) {
      setError("Unable to export analytics data.");
    } finally {
      setExporting(false);
    }
  };

  const tabs = [
    ["overview", "Overview"],
    ["recruitment", "Recruitment"],
    ["users", "Users & Verification"],
    ["operations", "Operations"],
  ];

  return (
    <main className="mx-auto w-full max-w-[1600px] px-1 py-6">
      <div className="space-y-4">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900">
              Admin Dashboard
            </h1>
            <p className="text-xs text-slate-500">
              Compact system-wide analysis of users, jobs, applications,
              verification, engagement, and operations.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-2 sm:justify-end">
            <HeaderStatusCard
              label="Pending Jobseeker"
              value={kpis.pendingJobseekers}
            />
            <HeaderStatusCard
              label="Pending Employers"
              value={kpis.pendingEmployers}
            />
            <HeaderStatusCard
              label="Edit Request"
              value={kpis.pendingEditRequests}
            />
            <button
              type="button"
              onClick={exportAnalytics}
              disabled={loading || exporting}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#2e66a6] px-4 text-xs font-bold text-white shadow-sm hover:bg-[#255487] disabled:opacity-60"
            >
              <Download size={14} /> {exporting ? "Exporting..." : "Export"}
            </button>
          </div>
        </header>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard
            label="Jobseekers"
            value={kpis.totalJobseekers}
            imageSrc={statCardImages.users}
          />
          <StatCard
            label="Employers"
            value={kpis.totalEmployers}
            imageSrc={statCardImages.verification}
          />
          <StatCard
            label="Registered Users"
            value={kpis.totalRegisteredUsers}
            imageSrc={statCardImages.applications}
          />
          <StatCard
            label="Job Posts"
            value={kpis.totalJobPosts}
            imageSrc={statCardImages.jobs}
          />
          <StatCard
            label="Applications"
            value={kpis.applications}
            imageSrc={statCardImages.applications}
          />
          <StatCard
            label="Hire Rate"
            value={kpis.hireRate}
            suffix="%"
            imageSrc={statCardImages.rate}
          />
        </div>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
            <DateFilterDropdown
              value={filters.date}
              startDate={filters.startDate}
              endDate={filters.endDate}
              onSelect={selectDateFilter}
              disabled={loading}
            />
            <label className="block">
              <span className="mb-1 block text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500">
                Date Based On
              </span>
              <select
                value={filters.dateField}
                onChange={(event) =>
                  updateFilter("dateField", event.target.value)
                }
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/20"
              >
                <option value="primary">Primary Event Date</option>
                <option value="created">Record Created</option>
                <option value="outcome">Outcome / Updated Date</option>
              </select>
            </label>
            {filters.date === "specific" ? (
              <DateInput
                label="Specific Date"
                value={filters.specificDate}
                onChange={(value) => updateFilter("specificDate", value)}
              />
            ) : null}
            <FilterSelect
              label="Role"
              value={filters.role}
              onChange={(value) => updateFilter("role", value)}
              values={options.roles}
              allLabel="All Roles"
            />
            <FilterSelect
              label="Campus"
              value={filters.campus}
              onChange={(value) => updateFilter("campus", value)}
              values={options.campuses}
              allLabel="All Campuses"
            />
            <FilterSelect
              label="Application Status"
              value={filters.applicationStatus}
              onChange={(value) => updateFilter("applicationStatus", value)}
              values={options.applicationStatuses}
              allLabel="All Application Statuses"
            />
            <FilterSelect
              label="Job Type"
              value={filters.jobType}
              onChange={(value) => updateFilter("jobType", value)}
              values={options.jobTypes}
              allLabel="All Job Types"
            />
          </div>

          {showMoreFilters ? (
            <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
              <FilterSelect
                label="User Status"
                value={filters.userStatus}
                onChange={(value) => updateFilter("userStatus", value)}
                values={options.userStatuses}
                allLabel="All User Statuses"
              />
              <FilterSelect
                label="Verification"
                value={filters.verificationStatus}
                onChange={(value) => updateFilter("verificationStatus", value)}
                values={options.verificationStatuses}
                allLabel="All Verification Statuses"
              />
              <FilterSelect
                label="Job Status"
                value={filters.jobStatus}
                onChange={(value) => updateFilter("jobStatus", value)}
                values={options.jobStatuses}
                allLabel="All Job Statuses"
              />
              <FilterSelect
                label="Category"
                value={filters.category}
                onChange={(value) => updateFilter("category", value)}
                values={options.categories}
                allLabel="All Categories"
              />
              <FilterSelect
                label="Work Mode"
                value={filters.workMode}
                onChange={(value) => updateFilter("workMode", value)}
                values={options.workModes}
                allLabel="All Work Modes"
              />
              <FilterSelect
                label="Company"
                value={filters.company}
                onChange={(value) => updateFilter("company", value)}
                values={options.companies}
                allLabel="All Companies"
              />
              <FilterSelect
                label="Edit Request"
                value={filters.editRequestStatus}
                onChange={(value) => updateFilter("editRequestStatus", value)}
                values={options.editRequestStatuses}
                allLabel="All Edit Requests"
              />
              <FilterSelect
                label="Message Type"
                value={filters.messageType}
                onChange={(value) => updateFilter("messageType", value)}
                values={options.messageTypes}
                allLabel="All Message Types"
              />
              <FilterSelect
                label="Notification Type"
                value={filters.notificationType}
                onChange={(value) => updateFilter("notificationType", value)}
                values={options.notificationTypes}
                allLabel="All Notification Types"
              />
              <FilterSelect
                label="Log Status"
                value={filters.logStatus}
                onChange={(value) => updateFilter("logStatus", value)}
                values={options.logStatuses}
                allLabel="All Log Statuses"
              />
              <FilterSelect
                label="Log Module"
                value={filters.logModule}
                onChange={(value) => updateFilter("logModule", value)}
                values={options.logModules}
                allLabel="All Log Modules"
              />
            </div>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-3">
            <label className="mr-auto inline-flex h-9 cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-700">
              <span className="whitespace-nowrap">Dummy Data</span>
              <button
                type="button"
                role="switch"
                aria-checked={dummyMode}
                onClick={() => setDummyMode((value) => !value)}
                className={`relative h-5 w-10 rounded-full transition ${dummyMode ? "bg-[#2e66a6]" : "bg-slate-300"}`}
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition ${dummyMode ? "left-[22px]" : "left-0.5"}`}
                />
              </button>
              <span className={`text-[10px] font-extrabold ${dummyMode ? "text-[#2e66a6]" : "text-slate-400"}`}>
                {dummyMode ? "ON" : "OFF"}
              </span>
            </label>
            <button
              type="button"
              onClick={() => setShowMoreFilters((value) => !value)}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#2e66a6]/20 bg-[#2e66a6]/5 px-4 text-xs font-bold text-[#2e66a6] hover:bg-[#2e66a6]/10"
            >
              <Filter size={13} />
              {showMoreFilters ? "Hide Filters" : "More Filters"}
            </button>
            <button
              type="button"
              onClick={resetFilters}
              disabled={!hasFilters}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw size={13} />
              Clear All
            </button>
          </div>
        </section>

        <nav
          className="flex gap-6 overflow-x-auto border-b border-slate-200"
          aria-label="Analytics sections"
        >
          {tabs.map(([key, label]) => (
            <button
              type="button"
              key={key}
              onClick={() => setActiveTab(key)}
              className={`shrink-0 border-b-2 px-1 pb-3 text-xs font-bold transition ${activeTab === key ? "border-[#2e66a6] text-[#2e66a6]" : "border-transparent text-slate-500 hover:text-slate-800"}`}
            >
              {label}
            </button>
          ))}
        </nav>

        {loading ? <AnalyticsSkeleton /> : null}

        {!loading && activeTab === "overview" ? (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            <section className="relative overflow-hidden rounded-2xl border border-[#2e66a6]/30 bg-gradient-to-br from-[#072258] via-[#245b98] to-[#52b2db] p-4 text-white shadow-[0_12px_30px_rgba(46,102,166,0.20)] xl:col-span-12">
              <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-24 left-1/3 h-52 w-52 rounded-full bg-cyan-200/10 blur-3xl" />

              <div className="relative z-10 mb-3 border-b border-white/15 pb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-bold text-white">
                    System Activity Trend
                  </h2>
                  {dummyMode ? (
                    <span className="rounded-full border border-white/20 bg-white/15 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-white">
                      Dummy Data
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 text-[11px] text-white/70">
                  {dummyMode
                    ? "January to December preview data — filters update the sample chart"
                    : "Registrations, jobs, applications, and hires by month"}
                </p>
              </div>

              <div className="relative z-10">
                <TrendChart data={displayedTrends} />
              </div>
            </section>
            <ChartCard
              title="Application Funnel"
              subtitle="Current recruitment outcome distribution"
              className="xl:col-span-7"
            >
              <FunnelChart data={sections.applications?.funnel} />
            </ChartCard>
            <ChartCard
              title="Top Job Categories"
              subtitle="Jobs grouped by category"
              className="xl:col-span-5"
            >
              <HorizontalBars data={sections.jobs?.categories} />
            </ChartCard>
            <ChartCard
              title="User Roles"
              subtitle="Admin, employer, and jobseeker accounts"
              className="xl:col-span-6"
            >
              <DonutChart data={sections.users?.roles} />
            </ChartCard>
            <ChartCard
              title="Job Status"
              subtitle="Lifecycle state of job postings"
              className="xl:col-span-6"
            >
              <DonutChart data={sections.jobs?.statuses} />
            </ChartCard>
          </div>
        ) : null}

        {!loading && activeTab === "recruitment" ? (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            <ChartCard
              title="Application Funnel"
              subtitle="Pending through final outcome"
              className="xl:col-span-7"
            >
              <FunnelChart data={sections.applications?.funnel} />
            </ChartCard>
            <ChartCard
              title="Employment Type"
              subtitle="Job supply grouped by employment type"
              className="xl:col-span-5"
            >
              <HorizontalBars data={sections.jobs?.employmentTypes} />
            </ChartCard>
            <ChartCard
              title="Work Mode"
              subtitle="On-site, remote, blended, and work from home"
              className="xl:col-span-6"
            >
              <DonutChart data={sections.jobs?.workModes} />
            </ChartCard>
            <ChartCard
              title="Employment Status"
              subtitle="Status recorded for hired applicants"
              className="xl:col-span-6"
            >
              <HorizontalBars data={sections.applications?.employmentStatus} />
            </ChartCard>
          </div>
        ) : null}

        {!loading && activeTab === "users" ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard
              title="Verification Status"
              subtitle="Employer and jobseeker verification state"
            >
              <HorizontalBars data={sections.users?.verification} />
            </ChartCard>
            <ChartCard
              title="Jobseekers by Campus"
              subtitle="Campus distribution from jobseeker profiles"
            >
              <HorizontalBars data={sections.users?.campuses} />
            </ChartCard>
          </div>
        ) : null}

        {!loading && activeTab === "operations" ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard
              title="Job Edit Requests"
              subtitle="Governance requests by status"
            >
              <HorizontalBars data={sections.operations?.editRequests} />
            </ChartCard>
            <ChartCard
              title="Most Requested Job Sections"
              subtitle="Sections employers request to edit"
            >
              <HorizontalBars data={sections.operations?.editRequestSections} />
            </ChartCard>
          </div>
        ) : null}

        {!loading ? (
          <p className="text-right text-[10px] text-slate-400">
            Timezone: Asia/Manila · Last updated:{" "}
            {analytics.generatedAt
              ? new Date(analytics.generatedAt).toLocaleString("en-PH")
              : "—"}
          </p>
        ) : null}

        <CustomDateRangeModal
          open={showCustomDateModal}
          startDate={filters.startDate}
          endDate={filters.endDate}
          onCancel={() => setShowCustomDateModal(false)}
          onApply={applyCustomDateRange}
        />
      </div>
    </main>
  );
};

export default AdminDashboard;
