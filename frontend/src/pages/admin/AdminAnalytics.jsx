import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Download,
  Eye,
  Filter,
  Mail,
  RefreshCw,
  ShieldAlert,
  TrendingUp,
  UserRoundCheck,
  UsersRound,
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
    activeJobs: 0,
    applications: 0,
    hired: 0,
    hireRate: 0,
    pendingVerification: 0,
    unreadMessages: 0,
    systemFailures: 0,
  },
  trends: [],
  filters: { options: {} },
  sections: {
    users: {
      roles: [],
      statuses: [],
      verification: [],
      campuses: [],
      ageGroups: [],
      genders: [],
      education: [],
      employmentTypes: [],
      employerIndustries: [],
    },
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
      statuses: [],
      interviewRate: 0,
      hireRate: 0,
      viewToApplicationRate: 0,
      uniqueApplicants: 0,
      applicationsPerJob: 0,
      averageTimeToHireDays: 0,
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

const formatMetric = (value, suffix = "") => {
  const numeric = Number(value || 0);
  return `${Number.isInteger(numeric) ? numberFormat.format(numeric) : numeric.toLocaleString("en-US", { maximumFractionDigits: 1 })}${suffix}`;
};

const StatCard = ({ label, value, suffix = "", note }) => (
  <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-[0_8px_24px_rgba(15,23,42,0.05)] transition duration-300 hover:-translate-y-0.5 hover:border-[#2e66a6]/30 hover:shadow-[0_14px_35px_rgba(46,102,166,0.10)]">
    <div className="absolute inset-x-0 top-0 h-1 bg-[#2e66a6]" />
    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
    <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">{formatMetric(value, suffix)}</p>
    <p className="mt-2 min-h-[18px] text-[11px] leading-4 text-slate-500">{note}</p>
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


const ChartCard = ({ title, subtitle, children, className = "", headerRight = null }) => (
  <section className={`min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_28px_rgba(15,23,42,0.045)] ${className}`}>
    <div className="mb-5 flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h2 className="text-[15px] font-bold tracking-tight text-slate-900">{title}</h2>
        {subtitle ? <p className="mt-1 text-xs leading-5 text-slate-500">{subtitle}</p> : null}
      </div>
      {headerRight ? <div className="shrink-0">{headerRight}</div> : null}
    </div>
    {children}
  </section>
);

const EmptyChart = () => (
  <div className="flex h-44 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-4 text-center">
    <p className="text-sm font-semibold text-slate-500">No data available</p>
    <p className="mt-1 text-[11px] text-slate-400">Try changing or clearing the selected filters.</p>
  </div>
);

const HorizontalBars = ({ data = [], maxItems = 8, percentage = false }) => {
  const rows = data.slice(0, maxItems);
  const max = Math.max(1, ...rows.map((item) => Number(item.value || 0)));
  const total = rows.reduce((sum, item) => sum + Number(item.value || 0), 0);
  if (!rows.length) return <EmptyChart />;

  return (
    <div className="space-y-3.5">
      {rows.map((item, index) => {
        const value = Number(item.value || 0);
        const share = total ? (value / total) * 100 : 0;
        return (
          <div key={`${item.name}-${index}`}>
            <div className="mb-1.5 flex items-end justify-between gap-4 text-xs">
              <span className="min-w-0 truncate font-semibold text-slate-700" title={titleCase(item.name)}>
                {titleCase(item.name)}
              </span>
              <span className="shrink-0 font-bold tabular-nums text-slate-900">
                {numberFormat.format(value)}{percentage ? "%" : ""}
                {!percentage && total ? <span className="ml-1 font-medium text-slate-400">({share.toFixed(1)}%)</span> : null}
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full min-w-[4px] rounded-full transition-all duration-700"
                style={{ width: `${Math.max(2, (value / max) * 100)}%`, backgroundColor: colors[index % colors.length] }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

const ColumnChart = ({ data = [], valueSuffix = "" }) => {
  if (!data.length) return <EmptyChart />;
  const max = Math.max(1, ...data.map((item) => Number(item.value || 0)));
  return (
    <div className="overflow-x-auto pb-1">
      <div className="flex h-56 min-w-[520px] items-end gap-3 border-b border-slate-200 px-2 pt-5">
        {data.map((item, index) => {
          const value = Number(item.value || 0);
          const height = Math.max(8, (value / max) * 165);
          return (
            <div key={`${item.name}-${index}`} className="group flex min-w-[54px] flex-1 flex-col items-center justify-end self-stretch">
              <div className="mb-2 rounded-md bg-slate-900 px-2 py-1 text-[10px] font-semibold text-white opacity-0 shadow-lg transition group-hover:opacity-100">
                {numberFormat.format(value)}{valueSuffix}
              </div>
              <div
                className="w-full max-w-[62px] rounded-t-lg transition-all duration-700 group-hover:brightness-95"
                style={{ height, backgroundColor: colors[index % colors.length] }}
              />
              <span className="mt-2 max-w-[86px] truncate text-center text-[10px] font-semibold text-slate-500" title={titleCase(item.name)}>
                {titleCase(item.name)}
              </span>
            </div>
          );
        })}
      </div>
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
    <div className="grid min-h-[210px] items-center gap-6 sm:grid-cols-[170px_1fr]">
      <div className="relative mx-auto h-36 w-36 rounded-full shadow-inner" style={{ background: `conic-gradient(${stops.join(",")})` }}>
        <div className="absolute inset-7 flex flex-col items-center justify-center rounded-full bg-white shadow-sm">
          <span className="text-2xl font-bold tracking-tight text-slate-900">{numberFormat.format(total)}</span>
          <span className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">Total</span>
        </div>
      </div>
      <div className="space-y-2.5">
        {rows.slice(0, 8).map((item, index) => {
          const value = Number(item.value || 0);
          return (
            <div key={`${item.name}-${index}`} className="flex items-center justify-between gap-4 rounded-lg px-2 py-1.5 transition hover:bg-slate-50">
              <span className="flex min-w-0 items-center gap-2.5 text-xs font-medium text-slate-600">
                <i className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />
                <span className="truncate">{titleCase(item.name)}</span>
              </span>
              <span className="shrink-0 text-xs font-bold tabular-nums text-slate-900">
                {numberFormat.format(value)} <span className="font-medium text-slate-400">{((value / total) * 100).toFixed(1)}%</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const useElementWidth = () => {
  const ref = useRef(null);
  const [width, setWidth] = useState(900);
  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    const update = () => setWidth(Math.max(320, node.clientWidth || 900));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
};

const TrendChart = ({ data = [] }) => {
  const [containerRef, width] = useElementWidth();
  const [hoverIndex, setHoverIndex] = useState(null);
  const series = [
    ["registrations", "Registrations", "#2e66a6"],
    ["jobs", "Jobs", "#16a36f"],
    ["applications", "Applications", "#dc9300"],
    ["hires", "Hires", "#6366f1"],
  ];
  if (!data.length) return <EmptyChart />;

  const height = 300;
  const left = 46;
  const right = 18;
  const top = 22;
  const bottom = 44;
  const plotWidth = Math.max(1, width - left - right);
  const plotHeight = height - top - bottom;
  const maxValue = Math.max(1, ...data.flatMap((item) => series.map(([key]) => Number(item[key] || 0))));
  const max = Math.ceil(maxValue / 10) * 10 || 10;
  const xAt = (index) => left + (data.length === 1 ? plotWidth / 2 : (index / (data.length - 1)) * plotWidth);
  const yAt = (value) => top + plotHeight - (Number(value || 0) / max) * plotHeight;
  const pointsFor = (key) => data.map((item, index) => `${xAt(index)},${yAt(item[key])}`).join(" ");
  const areaPointsFor = (key) => `${left},${top + plotHeight} ${pointsFor(key)} ${left + plotWidth},${top + plotHeight}`;
  const latest = data[data.length - 1] || {};
  const hovered = hoverIndex === null ? null : data[hoverIndex];
  const hoverX = hoverIndex === null ? 0 : xAt(hoverIndex);

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-medium text-slate-400">Monthly totals · Hover a data point for details</p>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">
          {data[0]?.label} – {latest?.label}
        </span>
      </div>
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-b from-slate-50/60 to-white">
        <svg width={width} height={height} className="block w-full" role="img" aria-label="Monthly analytics trend chart">
          <defs>
            {series.map(([key, , color]) => (
              <linearGradient key={key} id={`area-${key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.13" />
                <stop offset="100%" stopColor={color} stopOpacity="0" />
              </linearGradient>
            ))}
          </defs>
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = top + plotHeight - ratio * plotHeight;
            return (
              <g key={ratio}>
                <line x1={left} y1={y} x2={width - right} y2={y} stroke="#dbe4ee" strokeDasharray="4 6" />
                <text x={left - 10} y={y + 4} textAnchor="end" fontSize="10" fill="#64748b">{Math.round(max * ratio)}</text>
              </g>
            );
          })}
          <line x1={left} y1={top} x2={left} y2={top + plotHeight} stroke="#cbd5e1" />
          <line x1={left} y1={top + plotHeight} x2={width - right} y2={top + plotHeight} stroke="#cbd5e1" />
          {series.map(([key]) => <polygon key={`area-${key}`} points={areaPointsFor(key)} fill={`url(#area-${key})`} />)}
          {series.map(([key, , color]) => (
            <polyline key={key} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={pointsFor(key)} />
          ))}
          {data.map((item, index) => {
            const x = xAt(index);
            const showLabel = data.length <= 8 || index % Math.ceil(data.length / 7) === 0 || index === data.length - 1;
            return (
              <g key={`${item.key || item.label}-${index}`}>
                <rect x={Math.max(left, x - plotWidth / Math.max(2, data.length) / 2)} y={top} width={plotWidth / Math.max(1, data.length - 1)} height={plotHeight} fill="transparent" onMouseEnter={() => setHoverIndex(index)} />
                {showLabel ? <text x={x} y={height - 14} textAnchor="middle" fontSize="10" fill="#64748b">{item.label}</text> : null}
                {series.map(([key, , color]) => (
                  <circle key={key} cx={x} cy={yAt(item[key])} r={hoverIndex === index ? 5 : 3.5} fill={color} stroke="white" strokeWidth="2" onMouseEnter={() => setHoverIndex(index)} />
                ))}
              </g>
            );
          })}
          {hoverIndex !== null ? <line x1={hoverX} y1={top} x2={hoverX} y2={top + plotHeight} stroke="#94a3b8" strokeDasharray="3 4" /> : null}
          <text x="13" y={top + plotHeight / 2} transform={`rotate(-90 13 ${top + plotHeight / 2})`} textAnchor="middle" fontSize="10" fill="#64748b">Count</text>
        </svg>
        {hovered ? (
          <div
            className="pointer-events-none absolute top-5 z-10 min-w-[170px] rounded-xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur"
            style={{ left: Math.min(Math.max(8, hoverX + 12), Math.max(8, width - 190)) }}
          >
            <p className="mb-2 text-xs font-bold text-slate-900">{hovered.label}</p>
            <div className="space-y-1.5">
              {series.map(([key, label, color]) => (
                <div key={key} className="flex items-center justify-between gap-5 text-[11px]">
                  <span className="flex items-center gap-2 text-slate-600"><i className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />{label}</span>
                  <strong className="tabular-nums text-slate-900">{numberFormat.format(Number(hovered[key] || 0))}</strong>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {series.map(([key, label, color]) => (
          <div key={key} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5">
            <i className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
            <div className="min-w-0">
              <p className="truncate text-[10px] font-semibold text-slate-500">{label}</p>
              <p className="text-base font-bold tabular-nums text-slate-900">{numberFormat.format(Number(latest[key] || 0))}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const FunnelChart = ({ data = [] }) => {
  const rows = data.filter((item) => Number(item.value || 0) >= 0);
  if (!rows.length) return <EmptyChart />;
  const first = Math.max(1, Number(rows[0]?.value || 0));
  return (
    <div className="space-y-3">
      {rows.map((item, index) => {
        const value = Number(item.value || 0);
        const width = Math.max(28, (value / first) * 100);
        const conversion = index === 0 ? 100 : (value / first) * 100;
        return (
          <div key={`${item.name}-${index}`}>
            <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
              <span className="font-semibold text-slate-700">{titleCase(item.name)}</span>
              <span className="font-bold tabular-nums text-slate-900">{numberFormat.format(value)} <span className="font-medium text-slate-400">{conversion.toFixed(1)}%</span></span>
            </div>
            <div className="h-9 overflow-hidden rounded-lg bg-slate-100">
              <div className="flex h-full items-center rounded-lg px-3 text-[10px] font-bold text-white transition-all duration-700" style={{ width: `${width}%`, backgroundColor: colors[index % colors.length] }}>
                {index === 0 ? "Baseline" : `${conversion.toFixed(1)}% of submitted`}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const MetricTile = ({ label, value, suffix = "", icon: Icon, helper }) => (
  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 transition hover:border-[#2e66a6]/25 hover:bg-[#2e66a6]/[0.03]">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">{label}</p>
        <p className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900">{formatMetric(value, suffix)}</p>
        {helper ? <p className="mt-1 text-[10px] leading-4 text-slate-400">{helper}</p> : null}
      </div>
      {Icon ? <div className="rounded-lg bg-[#2e66a6]/10 p-2 text-[#2e66a6]"><Icon size={17} /></div> : null}
    </div>
  </div>
);

const AnalyticsSkeleton = () => (
  <div className="grid animate-pulse grid-cols-1 gap-4 xl:grid-cols-12" aria-label="Loading analytics charts">
    <div className="h-80 rounded-2xl border border-slate-200 bg-white p-5 xl:col-span-12"><div className="h-4 w-44 rounded bg-slate-200" /><div className="mt-5 h-56 rounded-xl bg-slate-100" /></div>
    <div className="h-64 rounded-2xl border border-slate-200 bg-white p-5 xl:col-span-7"><div className="h-4 w-36 rounded bg-slate-200" /><div className="mt-5 h-44 rounded-xl bg-slate-100" /></div>
    <div className="h-64 rounded-2xl border border-slate-200 bg-white p-5 xl:col-span-5"><div className="h-4 w-32 rounded bg-slate-200" /><div className="mt-5 h-44 rounded-xl bg-slate-100" /></div>
  </div>
);

const AdminAnalytics = () => {
  const [analytics, setAnalytics] = useState(emptyAnalytics);
  const [filters, setFilters] = useState(initialFilters);
  const [activeTab, setActiveTab] = useState("overview");
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [showCustomDateModal, setShowCustomDateModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);

  const options = analytics?.filters?.options || {};
  const kpis = analytics?.kpis || emptyAnalytics.kpis;
  const sections = {
    ...emptyAnalytics.sections,
    ...(analytics?.sections || {}),
    users: { ...emptyAnalytics.sections.users, ...(analytics?.sections?.users || {}) },
    jobs: { ...emptyAnalytics.sections.jobs, ...(analytics?.sections?.jobs || {}) },
    applications: { ...emptyAnalytics.sections.applications, ...(analytics?.sections?.applications || {}) },
    verification: { ...emptyAnalytics.sections.verification, ...(analytics?.sections?.verification || {}) },
    operations: {
      ...emptyAnalytics.sections.operations,
      ...(analytics?.sections?.operations || {}),
      system: { ...emptyAnalytics.sections.operations.system, ...(analytics?.sections?.operations?.system || {}) },
    },
  };

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
      const response = await api.get("/admin/analytics", { params: requestParams });
      setAnalytics({ ...emptyAnalytics, ...(response.data || {}) });
    } catch (err) {
      console.error("Admin analytics error:", err);
      setError(err?.response?.data?.message || "Unable to load analytics data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchAnalytics, 180);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestParams]);

  const updateFilter = (name, value) => setFilters((previous) => ({ ...previous, [name]: value }));
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
    setFilters((previous) => ({ ...previous, date: "range", specificDate: "", startDate, endDate }));
    setShowCustomDateModal(false);
  };
  const resetFilters = () => setFilters(initialFilters);
  const hasFilters = JSON.stringify(filters) !== JSON.stringify(initialFilters);

  const activeFilterLabels = useMemo(() => {
    const labels = [];
    if (filters.date !== "overall") labels.push(dateOptions.find(([value]) => value === filters.date)?.[1] || filters.date);
    const mapping = [
      ["role", "Role"], ["campus", "Campus"], ["applicationStatus", "Application"], ["jobType", "Job Type"],
      ["userStatus", "User Status"], ["verificationStatus", "Verification"], ["jobStatus", "Job Status"],
      ["category", "Category"], ["workMode", "Work Mode"], ["company", "Company"], ["editRequestStatus", "Edit Request"],
      ["messageType", "Message Type"], ["notificationType", "Notification"], ["logStatus", "Log Status"], ["logModule", "Log Module"],
    ];
    mapping.forEach(([key, label]) => {
      if (filters[key] && filters[key] !== "all") labels.push(`${label}: ${titleCase(filters[key])}`);
    });
    return labels;
  }, [filters]);

  const exportAnalytics = () => {
    try {
      setExporting(true);
      const workbook = XLSX.utils.book_new();
      const addSheet = (name, rows) => XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(rows?.length ? rows : [{ Message: "No data" }]),
        name.slice(0, 31),
      );
      addSheet("KPIs", Object.entries(kpis).map(([metric, value]) => ({ Metric: titleCase(metric), Value: value })));
      addSheet("Trends", analytics.trends || []);
      addSheet("Application Funnel", sections.applications?.funnel || []);
      addSheet("Application Status", sections.applications?.statuses || []);
      addSheet("Job Categories", sections.jobs?.categories || []);
      addSheet("Age Distribution", sections.users?.ageGroups || []);
      addSheet("Gender Distribution", sections.users?.genders || []);
      addSheet("Education", sections.users?.education || []);
      addSheet("Campuses", sections.users?.campuses || []);
      addSheet("Employer Industries", sections.users?.employerIndustries || []);
      addSheet("User Verification", sections.users?.verification || []);
      addSheet("Messages", sections.operations?.messages || []);
      addSheet("Notifications", sections.operations?.notifications || []);
      addSheet("System Modules", sections.operations?.system?.modules || []);
      XLSX.writeFile(workbook, `admin-analytics-${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (err) {
      setError("Unable to export analytics data.");
    } finally {
      setExporting(false);
    }
  };

  const tabs = [
    ["overview", "Overview"],
    ["recruitment", "Recruitment"],
    ["users", "Users & Demographics"],
    ["operations", "Operations"],
  ];

  return (
    <main className="mx-auto w-full max-w-[1680px] px-1 py-6">
      <div className="space-y-5">
        <header className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#2e66a6]" />
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#2e66a6]">Decision Support</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Admin Analytics</h1>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">
              System-wide analysis of user growth, recruitment performance, demographics, verification, engagement, and operational reliability.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={fetchAnalytics} disabled={loading} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60">
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
            <button type="button" onClick={exportAnalytics} disabled={loading || exporting} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#2e66a6] px-4 text-xs font-bold text-white shadow-sm transition hover:bg-[#255487] disabled:opacity-60">
              <Download size={14} /> {exporting ? "Exporting..." : "Export Excel"}
            </button>
          </div>
        </header>

        {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div> : null}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total Users" value={kpis.totalUsers} note="Accounts matching the selected analytics filters" />
          <StatCard label="Active Jobs" value={kpis.activeJobs} note="Published and currently active job postings" />
          <StatCard label="Applications" value={kpis.applications} note="Applications submitted in the selected scope" />
          <StatCard label="Hired" value={kpis.hired} note="Applications with a successful hiring outcome" />
          <StatCard label="Hire Rate" value={kpis.hireRate} suffix="%" note="Hired applications ÷ total applications" />
          <StatCard label="Pending Verification" value={kpis.pendingVerification} note="User accounts awaiting verification action" />
          <StatCard label="Unread Messages" value={kpis.unreadMessages} note="Unread conversation messages in scope" />
          <StatCard label="System Failures" value={kpis.systemFailures} note="Failed system log events in scope" />
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Analysis Filters</h2>
              <p className="mt-0.5 text-[11px] text-slate-500">Filters apply across the dashboard so each view uses the same analysis scope.</p>
            </div>
            {activeFilterLabels.length ? (
              <div className="flex max-w-3xl flex-wrap justify-end gap-1.5">
                {activeFilterLabels.slice(0, 5).map((label) => <span key={label} className="rounded-full bg-[#2e66a6]/8 px-2.5 py-1 text-[10px] font-semibold text-[#2e66a6]">{label}</span>)}
                {activeFilterLabels.length > 5 ? <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-500">+{activeFilterLabels.length - 5} more</span> : null}
              </div>
            ) : <span className="text-[10px] font-semibold text-slate-400">No active filters</span>}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
            <DateFilterDropdown value={filters.date} startDate={filters.startDate} endDate={filters.endDate} onSelect={selectDateFilter} disabled={loading} />
            <label className="block">
              <span className="mb-1 block text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500">Date Based On</span>
              <select value={filters.dateField} onChange={(event) => updateFilter("dateField", event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/20">
                <option value="primary">Relevant Event Date</option>
                <option value="created">Record Created</option>
                <option value="outcome">Outcome / Updated Date</option>
              </select>
            </label>
            {filters.date === "specific" ? <DateInput label="Specific Date" value={filters.specificDate} onChange={(value) => updateFilter("specificDate", value)} /> : null}
            <FilterSelect label="Role" value={filters.role} onChange={(value) => updateFilter("role", value)} values={options.roles} allLabel="All Roles" />
            <FilterSelect label="Campus" value={filters.campus} onChange={(value) => updateFilter("campus", value)} values={options.campuses} allLabel="All Campuses" />
            <FilterSelect label="Application Status" value={filters.applicationStatus} onChange={(value) => updateFilter("applicationStatus", value)} values={options.applicationStatuses} allLabel="All Application Statuses" />
            <FilterSelect label="Job Type" value={filters.jobType} onChange={(value) => updateFilter("jobType", value)} values={options.jobTypes} allLabel="All Job Types" />
          </div>

          {showMoreFilters ? (
            <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
              <FilterSelect label="User Status" value={filters.userStatus} onChange={(value) => updateFilter("userStatus", value)} values={options.userStatuses} allLabel="All User Statuses" />
              <FilterSelect label="Verification" value={filters.verificationStatus} onChange={(value) => updateFilter("verificationStatus", value)} values={options.verificationStatuses} allLabel="All Verification Statuses" />
              <FilterSelect label="Job Status" value={filters.jobStatus} onChange={(value) => updateFilter("jobStatus", value)} values={options.jobStatuses} allLabel="All Job Statuses" />
              <FilterSelect label="Category" value={filters.category} onChange={(value) => updateFilter("category", value)} values={options.categories} allLabel="All Categories" />
              <FilterSelect label="Work Mode" value={filters.workMode} onChange={(value) => updateFilter("workMode", value)} values={options.workModes} allLabel="All Work Modes" />
              <FilterSelect label="Company" value={filters.company} onChange={(value) => updateFilter("company", value)} values={options.companies} allLabel="All Companies" />
              <FilterSelect label="Edit Request" value={filters.editRequestStatus} onChange={(value) => updateFilter("editRequestStatus", value)} values={options.editRequestStatuses} allLabel="All Edit Requests" />
              <FilterSelect label="Message Type" value={filters.messageType} onChange={(value) => updateFilter("messageType", value)} values={options.messageTypes} allLabel="All Message Types" />
              <FilterSelect label="Notification Type" value={filters.notificationType} onChange={(value) => updateFilter("notificationType", value)} values={options.notificationTypes} allLabel="All Notification Types" />
              <FilterSelect label="Log Status" value={filters.logStatus} onChange={(value) => updateFilter("logStatus", value)} values={options.logStatuses} allLabel="All Log Statuses" />
              <FilterSelect label="Log Module" value={filters.logModule} onChange={(value) => updateFilter("logModule", value)} values={options.logModules} allLabel="All Log Modules" />
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
            <button type="button" onClick={() => setShowMoreFilters((value) => !value)} className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#2e66a6]/20 bg-[#2e66a6]/5 px-4 text-xs font-bold text-[#2e66a6] hover:bg-[#2e66a6]/10">
              <Filter size={13} /> {showMoreFilters ? "Hide Filters" : "More Filters"}
            </button>
            <button type="button" onClick={resetFilters} disabled={!hasFilters} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
              <RefreshCw size={13} /> Clear All
            </button>
          </div>
        </section>

        <nav className="flex gap-7 overflow-x-auto border-b border-slate-200" aria-label="Analytics sections">
          {tabs.map(([key, label]) => (
            <button type="button" key={key} onClick={() => setActiveTab(key)} className={`shrink-0 border-b-2 px-1 pb-3 text-xs font-bold transition ${activeTab === key ? "border-[#2e66a6] text-[#2e66a6]" : "border-transparent text-slate-500 hover:text-slate-800"}`}>{label}</button>
          ))}
        </nav>

        {loading ? <AnalyticsSkeleton /> : null}

        {!loading && activeTab === "overview" ? (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            <ChartCard title="System Activity Trend" subtitle="Monthly registrations, job postings, applications, and successful hires. Missing months are shown as zero instead of being skipped." className="xl:col-span-12">
              <TrendChart data={analytics.trends} />
            </ChartCard>
            <ChartCard title="Application Funnel" subtitle="Applicant progression from submission to review, interview, and hiring outcome." className="xl:col-span-7">
              <FunnelChart data={sections.applications?.funnel} />
            </ChartCard>
            <ChartCard title="Top Job Categories" subtitle="Job postings ranked by category within the selected analysis scope." className="xl:col-span-5">
              <HorizontalBars data={sections.jobs?.categories} />
            </ChartCard>
            <ChartCard title="Users by Role" subtitle="Distribution of Admin, Employer, and Jobseeker accounts." className="xl:col-span-4">
              <DonutChart data={sections.users?.roles} />
            </ChartCard>
            <ChartCard title="Job Status Distribution" subtitle="Current lifecycle state of job postings." className="xl:col-span-4">
              <DonutChart data={sections.jobs?.statuses} />
            </ChartCard>
            <ChartCard title="Application Status Distribution" subtitle="Current distribution of applications across recruitment outcomes." className="xl:col-span-4">
              <DonutChart data={sections.applications?.statuses} />
            </ChartCard>
          </div>
        ) : null}

        {!loading && activeTab === "recruitment" ? (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            <ChartCard title="Application Funnel" subtitle="Conversion through submitted, reviewed, interviewed, and hired stages." className="xl:col-span-7">
              <FunnelChart data={sections.applications?.funnel} />
            </ChartCard>
            <ChartCard title="Application Status Distribution" subtitle="Current recruitment outcome of applications in the selected scope." className="xl:col-span-5">
              <HorizontalBars data={sections.applications?.statuses} />
            </ChartCard>
            <ChartCard title="Employment Type" subtitle="Job supply grouped by employment type." className="xl:col-span-6"><HorizontalBars data={sections.jobs?.employmentTypes} /></ChartCard>
            <ChartCard title="Work Mode" subtitle="Distribution of on-site, remote, blended, and work-from-home opportunities." className="xl:col-span-6"><DonutChart data={sections.jobs?.workModes} /></ChartCard>
            <ChartCard title="Recruitment Performance" subtitle="Capacity, reach, conversion, and hiring-speed indicators." className="xl:col-span-12">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
                <MetricTile label="Total Vacancies" value={sections.jobs?.totalVacancies} icon={BriefcaseBusiness} helper="Available positions across jobs" />
                <MetricTile label="Job Views" value={sections.jobs?.totalViews} icon={Eye} helper="Recorded job listing views" />
                <MetricTile label="Unique Applicants" value={sections.applications?.uniqueApplicants} icon={UsersRound} helper="Distinct jobseekers who applied" />
                <MetricTile label="Interview Rate" value={sections.applications?.interviewRate} suffix="%" icon={UserRoundCheck} helper="Reached interview ÷ applications" />
                <MetricTile label="Hire Rate" value={sections.applications?.hireRate} suffix="%" icon={CheckCircle2} helper="Hired ÷ applications" />
                <MetricTile label="Avg. Time to Hire" value={sections.applications?.averageTimeToHireDays} suffix=" days" icon={Clock3} helper="Application date to hire date" />
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <MetricTile label="Applications per Job" value={sections.applications?.applicationsPerJob} icon={TrendingUp} helper="Average application volume per job" />
                <MetricTile label="View-to-Application Rate" value={sections.applications?.viewToApplicationRate} suffix="%" icon={Activity} helper="Applications ÷ recorded job views" />
              </div>
            </ChartCard>
            <ChartCard title="Employment Status of Hires" subtitle="Recorded active or inactive employment state for hired applicants." className="xl:col-span-12"><HorizontalBars data={sections.applications?.employmentStatus} /></ChartCard>
          </div>
        ) : null}

        {!loading && activeTab === "users" ? (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            <ChartCard title="Jobseeker Age Distribution" subtitle="Registered jobseekers grouped into ordered age ranges." className="xl:col-span-7"><ColumnChart data={sections.users?.ageGroups} /></ChartCard>
            <ChartCard title="Jobseekers by Gender" subtitle="Gender distribution from jobseeker profile data." className="xl:col-span-5"><DonutChart data={sections.users?.genders} /></ChartCard>
            <ChartCard title="Jobseekers by Campus" subtitle="Distribution of jobseekers across recorded campuses." className="xl:col-span-6"><HorizontalBars data={sections.users?.campuses} /></ChartCard>
            <ChartCard title="Educational Attainment" subtitle="Highest recorded educational level from jobseeker profiles." className="xl:col-span-6"><HorizontalBars data={sections.users?.education} /></ChartCard>
            <ChartCard title="Verification Status" subtitle="Verification state of Employer and Jobseeker accounts." className="xl:col-span-6"><HorizontalBars data={sections.users?.verification} /></ChartCard>
            <ChartCard title="Account Status" subtitle="Distribution of active, inactive, suspended, and pending accounts." className="xl:col-span-6"><DonutChart data={sections.users?.statuses} /></ChartCard>
            <ChartCard title="Employers by Industry" subtitle="Registered employers grouped by industry or business type." className="xl:col-span-7"><HorizontalBars data={sections.users?.employerIndustries} maxItems={10} /></ChartCard>
            <ChartCard title="Email Registration Verification" subtitle="OTP request volume and completion for pending email registration records." className="xl:col-span-5">
              <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
                <MetricTile label="OTP Requests" value={sections.verification?.emailRequests} icon={Mail} />
                <MetricTile label="Verified" value={sections.verification?.emailVerified} icon={CheckCircle2} />
                <MetricTile label="Completion" value={sections.verification?.emailCompletionRate} suffix="%" icon={UserRoundCheck} />
              </div>
            </ChartCard>
          </div>
        ) : null}

        {!loading && activeTab === "operations" ? (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            <ChartCard title="Job Edit Requests" subtitle="Administrative edit requests grouped by current status." className="xl:col-span-6"><HorizontalBars data={sections.operations?.editRequests} /></ChartCard>
            <ChartCard title="Most Requested Job Sections" subtitle="Job sections employers most frequently request to modify." className="xl:col-span-6"><HorizontalBars data={sections.operations?.editRequestSections} /></ChartCard>
            <ChartCard title="Message Types" subtitle="Conversation activity grouped by message type without exposing message content." className="xl:col-span-6"><HorizontalBars data={sections.operations?.messages} /></ChartCard>
            <ChartCard title="Message Read State" subtitle="Distribution of read and unread messages." className="xl:col-span-6"><DonutChart data={sections.operations?.messageRead} /></ChartCard>
            <ChartCard title="Notification Types" subtitle="System notifications grouped by workflow." className="xl:col-span-6"><HorizontalBars data={sections.operations?.notifications} /></ChartCard>
            <ChartCard title="Notification State" subtitle="Read, unread, and archived notification counts." className="xl:col-span-6"><DonutChart data={sections.operations?.notificationRead} /></ChartCard>
            <ChartCard title="System Reliability" subtitle="Audit-log outcomes and request performance indicators." className="xl:col-span-5">
              <HorizontalBars data={sections.operations?.system?.statuses} />
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <MetricTile label="P95 Duration" value={sections.operations?.system?.p95DurationMs} suffix=" ms" icon={Activity} />
                <MetricTile label="Server Errors" value={sections.operations?.system?.serverErrors} icon={ShieldAlert} />
              </div>
            </ChartCard>
            <ChartCard title="System Log Modules" subtitle="Modules generating the most audit events." className="xl:col-span-7"><HorizontalBars data={sections.operations?.system?.modules} maxItems={10} /></ChartCard>
          </div>
        ) : null}

        {!loading ? (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3 text-[10px] text-slate-400">
            <span>All rates are calculated from records matching the selected filters.</span>
            <span>Timezone: Asia/Manila · Last updated: {analytics.generatedAt ? new Date(analytics.generatedAt).toLocaleString("en-PH") : "—"}</span>
          </div>
        ) : null}

        <CustomDateRangeModal open={showCustomDateModal} startDate={filters.startDate} endDate={filters.endDate} onCancel={() => setShowCustomDateModal(false)} onApply={applyCustomDateRange} />
      </div>
    </main>
  );
};

export default AdminAnalytics;
