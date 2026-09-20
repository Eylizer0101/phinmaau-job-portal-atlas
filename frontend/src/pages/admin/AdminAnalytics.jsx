import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Download,
  Filter,
  GraduationCap,
  RefreshCw,
  ShieldCheck,
  Target,
  TrendingUp,
  UserRoundCheck,
  UsersRound,
  X,
} from "lucide-react";
import * as XLSX from "xlsx";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import api from "../../services/api";

const numberFormat = new Intl.NumberFormat("en-US");
const percentFormat = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
});

const CHART_COLORS = [
  "#2e66a6",
  "#1f9d71",
  "#d99300",
  "#6366f1",
  "#dc4c4c",
  "#64748b",
  "#0f8ea8",
  "#8b5cf6",
];

const dateOptions = [
  ["overall", "All Time"],
  ["today", "Today"],
  ["yesterday", "Yesterday"],
  ["thisWeek", "This Week"],
  ["lastWeek", "Last Week"],
  ["thisMonth", "This Month"],
  ["lastMonth", "Last Month"],
  ["thisYear", "This Year"],
  ["lastYear", "Last Year"],
  ["specific", "Specific Date"],
  ["range", "Custom Range"],
];

const initialFilters = {
  date: "overall",
  dateField: "primary",
  specificDate: "",
  startDate: "",
  endDate: "",
  role: "all",
  campus: "all",
  yearGraduated: "all",
  course: "all",
  userStatus: "all",
  verificationStatus: "all",
  jobStatus: "all",
  industry: "all",
  category: "all",
  jobType: "all",
  workMode: "all",
  educationLevel: "all",
  experienceLevel: "all",
  applicationStatus: "all",
  company: "all",
  skill: "all",
  certification: "all",
  editRequestStatus: "all",
};

const emptyAnalytics = {
  generatedAt: null,
  timezone: "Asia/Manila",
  privacyThreshold: 5,
  filters: { options: {} },
  appliedFilters: {},
  kpis: {
    registeredUsers: 0,
    activeJobs: 0,
    applications: 0,
    hired: 0,
    hireRate: 0,
    avgTimeToHireDays: 0,
  },
  kpiMeta: {},
  kpiComparison: {},
  trends: [],
  overview: {
    funnel: [],
    topIndustriesByHires: [],
  },
  sections: {
    applications: {
      funnel: [],
      applicationsBeforeHire: [],
      stageDurations: [],
      employerResponsiveness: [],
      dropoutNodes: [],
      declineReasons: [],
      salaryBands: [],
      employmentStatus: [],
      metrics: {},
    },
    jobs: {
      statuses: [],
      categories: [],
      jobTypes: [],
      workModes: [],
      educationLevels: [],
      experienceLevels: [],
      demandedSkills: [],
      salaryVisibility: [],
      metrics: {},
    },
    verification: {
      statuses: [],
      backlogAging: [],
      editRequests: [],
      editRequestSections: [],
      employmentRequests: [],
      registrationByRole: [],
      metrics: {},
    },
  },
  planCoverage: {
    implemented: [],
    schemaLimited: [],
  },
};

const titleCase = (value) =>
  String(value || "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const formatDateInput = (date) => {
  if (!date) return "";
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return "";
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(value.getDate()).padStart(2, "0")}`;
};

const formatDateLabel = (value) => {
  if (!value) return "Select date";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "Select date";
  return date.toLocaleDateString("en-PH", {
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

const getDisplayValue = (row, suffix = "") => {
  if (!row) return "0";
  if (row.suppressed) return row.displayValue || "n < 5";
  return `${numberFormat.format(Number(row.value || 0))}${suffix}`;
};

const ChartTooltip = ({ active, payload, label, valueSuffix = "" }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-xl">
      {label ? (
        <p className="mb-1.5 text-xs font-semibold text-slate-800">{label}</p>
      ) : null}
      <div className="space-y-1">
        {payload.map((entry) => {
          const row = entry?.payload || {};
          const value = row.suppressed
            ? row.displayValue || "n < 5"
            : `${numberFormat.format(Number(entry.value || 0))}${valueSuffix}`;
          return (
            <div
              key={`${entry.dataKey}-${entry.name}`}
              className="flex items-center justify-between gap-5 text-xs"
            >
              <span className="text-slate-500">{entry.name}</span>
              <span className="font-semibold text-slate-800">{value}</span>
            </div>
          );
        })}
      </div>
    </div>
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

        <div className="grid grid-cols-[1fr_86px] gap-2">
          <select
            value={month}
            onChange={(event) =>
              onChangeMonth(new Date(year, Number(event.target.value), 1))
            }
            className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-center text-xs font-semibold text-[#2e66a6] outline-none focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/20"
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
            className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-center text-xs font-semibold text-[#2e66a6] outline-none focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/20"
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

      <div className="grid grid-cols-7 text-center text-[10px] font-semibold uppercase text-slate-400">
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
              className={`mx-auto flex h-8 w-full items-center justify-center transition ${
                outside ? "text-slate-300" : "text-slate-700"
              } ${
                ranged ? "bg-[#2e66a6]/10 text-[#2e66a6]" : ""
              } ${
                selected
                  ? "rounded-lg bg-[#2e66a6] font-semibold text-white"
                  : "rounded-md hover:bg-[#2e66a6]/10"
              }`}
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

  useEffect(() => {
    if (!open) return undefined;
    const nextStart = startDate || today;
    const nextEnd = endDate || today;
    setDraftStart(nextStart);
    setDraftEnd(nextEnd);
    setLeftMonth(new Date(`${nextStart}T00:00:00`));
    setRightMonth(addCalendarMonths(new Date(`${nextEnd}T00:00:00`), 1));

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = setTimeout(() => closeRef.current?.focus(), 0);

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, startDate, endDate, onCancel, today]);

  if (!open) return null;

  const pickDate = (value) => {
    if (!draftStart || draftEnd) {
      setDraftStart(value);
      setDraftEnd("");
      return;
    }

    if (
      new Date(`${value}T00:00:00`) <
      new Date(`${draftStart}T00:00:00`)
    ) {
      setDraftEnd(draftStart);
      setDraftStart(value);
      return;
    }

    setDraftEnd(value);
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 px-3 py-5 backdrop-blur-[2px]"
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
              className="text-base font-semibold text-slate-900"
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
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            aria-label="Close date range modal"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-3 bg-slate-50/80 px-5 py-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              Start Date
            </span>
            <span className="mt-1 flex items-center gap-2 text-sm font-semibold text-[#2e66a6]">
              <CalendarDays size={16} />
              {formatDateLabel(draftStart)}
            </span>
          </div>

          <span className="hidden text-lg text-slate-400 sm:block">→</span>

          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              End Date
            </span>
            <span className="mt-1 flex items-center gap-2 text-sm font-semibold text-[#2e66a6]">
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
            className="h-10 rounded-xl border border-slate-200 bg-white px-5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() =>
              draftStart && draftEnd && onApply(draftStart, draftEnd)
            }
            disabled={!draftStart || !draftEnd}
            className="h-10 rounded-xl bg-[#2e66a6] px-6 text-sm font-semibold text-white transition hover:bg-[#255487] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Apply Range
          </button>
        </div>
      </div>
    </div>
  );
};

const FilterSelect = ({
  label,
  value,
  onChange,
  values = [],
  allLabel = "All",
  disabled = false,
}) => (
  <label className="block min-w-0">
    <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">
      {label}
    </span>
    <select
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none transition focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/15 disabled:bg-slate-50"
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
        "All Time";

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
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">
        Date Range
      </span>

      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className="flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 text-left text-xs font-medium text-slate-700 outline-none transition hover:bg-slate-50 focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/15 disabled:bg-slate-50"
        aria-expanded={open}
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-slate-400 transition ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open ? (
        <div className="absolute left-0 top-[48px] z-50 w-56 rounded-xl border border-slate-100 bg-white p-2 shadow-xl">
          {dateOptions.map(([optionValue, label]) => (
            <button
              type="button"
              key={optionValue}
              onClick={() => {
                setOpen(false);
                onSelect(optionValue);
              }}
              className={`w-full rounded-lg px-3 py-2 text-left text-xs font-medium transition ${
                value === optionValue
                  ? "bg-[#2e66a6]/10 text-[#2e66a6]"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
};

const ChartCard = ({
  title,
  subtitle,
  children,
  className = "",
  action = null,
}) => (
  <section
    className={`min-w-0 rounded-2xl border border-slate-200 bg-white p-5 ${className}`}
  >
    <div className="mb-4 flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold text-slate-900">{title}</h2>
        {subtitle ? (
          <p className="mt-1 text-xs leading-5 text-slate-500">{subtitle}</p>
        ) : null}
      </div>
      {action}
    </div>
    {children}
  </section>
);

const EmptyChart = ({ message = "No data for the selected filters." }) => (
  <div className="flex h-[260px] items-center justify-center rounded-xl bg-slate-50 px-5 text-center text-sm text-slate-400">
    {message}
  </div>
);

const HorizontalBarChart = ({
  data = [],
  valueLabel = "Count",
  valueSuffix = "",
  height = 300,
}) => {
  if (!data.length) return <EmptyChart />;

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 6, right: 22, bottom: 6, left: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
          <YAxis
            type="category"
            dataKey="name"
            width={145}
            tick={{ fontSize: 11 }}
            tickFormatter={(value) =>
              String(value).length > 22
                ? `${String(value).slice(0, 22)}…`
                : value
            }
          />
          <Tooltip content={<ChartTooltip valueSuffix={valueSuffix} />} />
          <Bar
            dataKey="value"
            name={valueLabel}
            fill="#2e66a6"
            radius={[0, 7, 7, 0]}
            animationDuration={650}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

const DonutChart = ({ data = [], centerLabel = "Total", height = 270 }) => {
  if (!data.length) return <EmptyChart />;

  const total = data.reduce(
    (sum, row) => sum + (row.suppressed ? 0 : Number(row.value || 0)),
    0,
  );

  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="48%"
            innerRadius={68}
            outerRadius={98}
            paddingAngle={2}
            animationDuration={650}
          >
            {data.map((entry, index) => (
              <Cell
                key={`${entry.name}-${index}`}
                fill={CHART_COLORS[index % CHART_COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
          <Legend
            verticalAlign="bottom"
            iconType="circle"
            formatter={(value) => (
              <span className="text-xs text-slate-600">{titleCase(value)}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>

      <div className="pointer-events-none absolute left-1/2 top-[44%] -translate-x-1/2 -translate-y-1/2 text-center">
        <div className="text-2xl font-semibold text-slate-900">
          {numberFormat.format(total)}
        </div>
        <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-slate-400">
          {centerLabel}
        </div>
      </div>
    </div>
  );
};

const TrendChart = ({ data = [] }) => {
  if (!data.length) return <EmptyChart />;

  return (
    <div className="h-[330px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 10, right: 24, bottom: 5, left: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis
            yAxisId="count"
            allowDecimals={false}
            tick={{ fontSize: 11 }}
          />
          <YAxis
            yAxisId="rate"
            orientation="right"
            domain={[0, 100]}
            tick={{ fontSize: 11 }}
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip content={<ChartTooltip />} />
          <Legend
            formatter={(value) => (
              <span className="text-xs text-slate-600">{value}</span>
            )}
          />
          <Line
            yAxisId="count"
            type="monotone"
            dataKey="applications"
            name="Applications"
            stroke="#2e66a6"
            strokeWidth={3}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
            animationDuration={700}
          />
          <Line
            yAxisId="count"
            type="monotone"
            dataKey="hires"
            name="Hires"
            stroke="#1f9d71"
            strokeWidth={3}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
            animationDuration={700}
          />
          <Line
            yAxisId="rate"
            type="monotone"
            dataKey="hireRate"
            name="Hire Rate (%)"
            stroke="#d99300"
            strokeWidth={2}
            strokeDasharray="6 4"
            dot={false}
            animationDuration={700}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

const KpiCard = ({
  label,
  value,
  suffix = "",
  icon: Icon,
  meta,
  comparison,
  inverseComparison = false,
}) => {
  const suppressed = Boolean(meta?.suppressed);
  const renderedValue = suppressed
    ? "n < 5"
    : `${typeof value === "number" ? numberFormat.format(value) : value}${suffix}`;

  const hasComparison = Number.isFinite(comparison);
  const good =
    hasComparison && (inverseComparison ? comparison <= 0 : comparison >= 0);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
            {renderedValue}
          </p>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#2e66a6]/10 text-[#2e66a6]">
          <Icon size={21} />
        </div>
      </div>

      <div className="mt-4 min-h-[20px]">
        {hasComparison ? (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium ${
              good
                ? "bg-emerald-50 text-emerald-700"
                : "bg-rose-50 text-rose-700"
            }`}
          >
            <TrendingUp
              size={12}
              className={comparison < 0 ? "rotate-180" : ""}
            />
            {comparison > 0 ? "+" : ""}
            {percentFormat.format(comparison)}% vs previous period
          </span>
        ) : (
          <span className="text-[11px] text-slate-400">
            {meta?.sampleSize
              ? `Sample: ${numberFormat.format(meta.sampleSize)}`
              : "All Time has no previous-period comparison"}
          </span>
        )}
      </div>

      {meta?.formula ? (
        <p
          className="mt-3 line-clamp-2 text-[11px] leading-4 text-slate-400"
          title={meta.formula}
        >
          {meta.formula}
        </p>
      ) : null}
    </div>
  );
};

const MetricTile = ({ label, value, suffix = "", icon: Icon }) => (
  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-[11px] font-medium text-slate-500">{label}</p>
        <p className="mt-1.5 text-2xl font-semibold text-slate-900">
          {numberFormat.format(Number(value || 0))}
          {suffix}
        </p>
      </div>
      <div className="rounded-xl bg-[#2e66a6]/10 p-2.5 text-[#2e66a6]">
        <Icon size={19} />
      </div>
    </div>
  </div>
);

const SectionTabs = ({ tabs, active, onChange }) => (
  <div className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1.5">
    {tabs.map(([key, label]) => (
      <button
        type="button"
        key={key}
        onClick={() => onChange(key)}
        className={`shrink-0 rounded-lg px-4 py-2 text-xs font-medium transition ${
          active === key
            ? "bg-[#2e66a6] text-white"
            : "text-slate-600 hover:bg-slate-50"
        }`}
      >
        {label}
      </button>
    ))}
  </div>
);

const AnalyticsSkeleton = () => (
  <div className="space-y-4 animate-pulse" aria-label="Loading analytics">
    <div className="h-44 rounded-2xl border border-slate-200 bg-white" />
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }, (_, index) => (
        <div
          key={index}
          className="h-40 rounded-2xl border border-slate-200 bg-white"
        />
      ))}
    </div>
    <div className="h-80 rounded-2xl border border-slate-200 bg-white" />
  </div>
);

const AdminAnalytics = () => {
  const [analytics, setAnalytics] = useState(emptyAnalytics);
  const [filters, setFilters] = useState(initialFilters);
  const [activeTab, setActiveTab] = useState("overview");
  const [applicationTab, setApplicationTab] = useState("journey");
  const [jobsTab, setJobsTab] = useState("demand");
  const [verificationTab, setVerificationTab] = useState("verification");
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [showCustomDateModal, setShowCustomDateModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);

  const options = analytics?.filters?.options || {};
  const sections = analytics?.sections || emptyAnalytics.sections;

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
        overview: {
          ...emptyAnalytics.overview,
          ...(response.data?.overview || {}),
        },
        sections: {
          applications: {
            ...emptyAnalytics.sections.applications,
            ...(response.data?.sections?.applications || {}),
          },
          jobs: {
            ...emptyAnalytics.sections.jobs,
            ...(response.data?.sections?.jobs || {}),
          },
          verification: {
            ...emptyAnalytics.sections.verification,
            ...(response.data?.sections?.verification || {}),
          },
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
  const hasFilters =
    JSON.stringify(filters) !== JSON.stringify(initialFilters);

  const exportAnalytics = () => {
    try {
      setExporting(true);
      const workbook = XLSX.utils.book_new();

      const appendSheet = (name, rows) => {
        const data = rows?.length ? rows : [{ Message: "No data" }];
        XLSX.utils.book_append_sheet(
          workbook,
          XLSX.utils.json_to_sheet(data),
          name.slice(0, 31),
        );
      };

      appendSheet(
        "KPIs",
        Object.entries(analytics.kpis || {}).map(([metric, value]) => ({
          Metric: titleCase(metric),
          Value: value,
          Formula: analytics.kpiMeta?.[metric]?.formula || "",
          Sample_Size: analytics.kpiMeta?.[metric]?.sampleSize ?? "",
        })),
      );

      appendSheet(
        "Filters_Applied",
        Object.entries(analytics.appliedFilters || {}).map(([filter, value]) => ({
          Filter: titleCase(filter),
          Value: value || "All",
        })),
      );

      appendSheet("Trend", analytics.trends || []);
      appendSheet("Hiring_Funnel", analytics.overview?.funnel || []);
      appendSheet(
        "Top_Industries",
        analytics.overview?.topIndustriesByHires || [],
      );
      appendSheet(
        "Applications_Before_Hire",
        sections.applications?.applicationsBeforeHire || [],
      );
      appendSheet(
        "Stage_Durations",
        sections.applications?.stageDurations || [],
      );
      appendSheet(
        "Dropout_Nodes",
        sections.applications?.dropoutNodes || [],
      );
      appendSheet("Job_Status", sections.jobs?.statuses || []);
      appendSheet("Demanded_Skills", sections.jobs?.demandedSkills || []);
      appendSheet(
        "Verification_Backlog",
        sections.verification?.backlogAging || [],
      );
      appendSheet(
        "Edit_Requests",
        sections.verification?.editRequests || [],
      );

      XLSX.writeFile(
        workbook,
        `admin-analytics-${new Date().toISOString().slice(0, 10)}.xlsx`,
      );
    } catch (err) {
      console.error("Analytics export error:", err);
      setError("Unable to export analytics data.");
    } finally {
      setExporting(false);
    }
  };

  const tabs = [
    ["overview", "Overview"],
    ["applications", "Applications & Offers"],
    ["jobs", "Posted Jobs"],
    ["verification", "Verification & Requests"],
  ];

  return (
    <main className="mx-auto w-full max-w-[1600px] px-1 py-6">
      <div className="space-y-4">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">
              Admin Analytics
            </h1>
            <p className="mt-1 max-w-3xl text-sm leading-5 text-slate-500">
              Filter-reactive institutional analytics for users, applications,
              job demand, hiring outcomes, verification, and administrative
              requests.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={fetchAnalytics}
              disabled={loading}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>

            <button
              type="button"
              onClick={exportAnalytics}
              disabled={loading || exporting}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#2e66a6] px-4 text-xs font-semibold text-white transition hover:bg-[#255487] disabled:opacity-60"
            >
              <Download size={14} />
              {exporting ? "Exporting..." : "Export XLSX"}
            </button>
          </div>
        </header>

        {error ? (
          <div className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError("")}
              aria-label="Close message"
            >
              <X size={16} />
            </button>
          </div>
        ) : null}

        {/* GLOBAL FILTER PANEL - intentionally above the KPI bar */}
        <section className="sticky top-0 z-30 rounded-2xl border border-slate-200 bg-white/95 p-4 backdrop-blur">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Filter size={16} className="text-[#2e66a6]" />
                Global Filter Panel
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                One filter state drives the KPI cards, charts, and export.
              </p>
            </div>

            <button
              type="button"
              onClick={resetFilters}
              disabled={!hasFilters}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <RefreshCw size={13} />
              Reset
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
            <DateFilterDropdown
              value={filters.date}
              startDate={filters.startDate}
              endDate={filters.endDate}
              onSelect={selectDateFilter}
              disabled={loading}
            />

            <label className="block">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                Date Based On
              </span>
              <select
                value={filters.dateField}
                onChange={(event) =>
                  updateFilter("dateField", event.target.value)
                }
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/15"
              >
                <option value="primary">Primary Event Date</option>
                <option value="created">Record Created</option>
                <option value="outcome">Outcome / Updated Date</option>
              </select>
            </label>

            {filters.date === "specific" ? (
              <label className="block">
                <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                  Specific Date
                </span>
                <input
                  type="date"
                  value={filters.specificDate}
                  onChange={(event) =>
                    updateFilter("specificDate", event.target.value)
                  }
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/15"
                />
              </label>
            ) : null}

            <FilterSelect
              label="Campus"
              value={filters.campus}
              onChange={(value) => updateFilter("campus", value)}
              values={options.campuses}
              allLabel="All Campus"
            />

            <FilterSelect
              label="Year Graduated"
              value={filters.yearGraduated}
              onChange={(value) => updateFilter("yearGraduated", value)}
              values={options.yearsGraduated}
              allLabel="All Batch"
            />

            <FilterSelect
              label="Course / Program"
              value={filters.course}
              onChange={(value) => updateFilter("course", value)}
              values={options.courses}
              allLabel="All Programs"
            />

            <FilterSelect
              label="Application Status"
              value={filters.applicationStatus}
              onChange={(value) => updateFilter("applicationStatus", value)}
              values={options.applicationStatuses}
              allLabel="All Application Statuses"
            />

            <FilterSelect
              label="Job Status"
              value={filters.jobStatus}
              onChange={(value) => updateFilter("jobStatus", value)}
              values={options.jobStatuses}
              allLabel="All Job Statuses"
            />
          </div>

          {showMoreFilters ? (
            <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
              <FilterSelect
                label="User Role"
                value={filters.role}
                onChange={(value) => updateFilter("role", value)}
                values={options.roles}
                allLabel="Job Seeker & Employer"
              />
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
                onChange={(value) =>
                  updateFilter("verificationStatus", value)
                }
                values={options.verificationStatuses}
                allLabel="All Verification Statuses"
              />
              <FilterSelect
                label="Industry / Sector"
                value={filters.industry}
                onChange={(value) => updateFilter("industry", value)}
                values={options.industries}
                allLabel="All Industries"
              />
              <FilterSelect
                label="Job Category"
                value={filters.category}
                onChange={(value) => updateFilter("category", value)}
                values={options.categories}
                allLabel="All Categories"
              />
              <FilterSelect
                label="Job Type"
                value={filters.jobType}
                onChange={(value) => updateFilter("jobType", value)}
                values={options.jobTypes}
                allLabel="All Job Types"
              />
              <FilterSelect
                label="Work Mode"
                value={filters.workMode}
                onChange={(value) => updateFilter("workMode", value)}
                values={options.workModes}
                allLabel="All Work Modes"
              />
              <FilterSelect
                label="Education Required"
                value={filters.educationLevel}
                onChange={(value) => updateFilter("educationLevel", value)}
                values={options.educationLevels}
                allLabel="All Education Levels"
              />
              <FilterSelect
                label="Experience Required"
                value={filters.experienceLevel}
                onChange={(value) => updateFilter("experienceLevel", value)}
                values={options.experienceLevels}
                allLabel="All Experience Levels"
              />
              <FilterSelect
                label="Company"
                value={filters.company}
                onChange={(value) => updateFilter("company", value)}
                values={options.companies}
                allLabel="All Companies"
              />
              <FilterSelect
                label="Skill"
                value={filters.skill}
                onChange={(value) => updateFilter("skill", value)}
                values={options.skills}
                allLabel="All Skills"
              />
              <FilterSelect
                label="Certification"
                value={filters.certification}
                onChange={(value) => updateFilter("certification", value)}
                values={options.certifications}
                allLabel="All Certifications"
              />
              <FilterSelect
                label="Edit Request Status"
                value={filters.editRequestStatus}
                onChange={(value) =>
                  updateFilter("editRequestStatus", value)
                }
                values={options.editRequestStatuses}
                allLabel="All Edit Request Statuses"
              />
            </div>
          ) : null}

          <div className="mt-3 flex justify-end border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => setShowMoreFilters((value) => !value)}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#2e66a6]/20 bg-[#2e66a6]/5 px-4 text-xs font-medium text-[#2e66a6] transition hover:bg-[#2e66a6]/10"
            >
              <Filter size={13} />
              {showMoreFilters ? "Hide More Filters" : "More Filters"}
            </button>
          </div>
        </section>

        {loading ? (
          <AnalyticsSkeleton />
        ) : (
          <>
            {/* KPI BAR - intentionally below the global filters */}
            <section>
              <div className="mb-3 flex items-end justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    Key Performance Indicators
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Dynamic K1–K6 metrics recalculated using the current filter
                    scope.
                  </p>
                </div>
                <span className="text-[11px] text-slate-400">
                  Small groups use n &lt; {analytics.privacyThreshold || 5}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <KpiCard
                  label="Registered Users"
                  value={analytics.kpis.registeredUsers}
                  icon={UsersRound}
                  meta={analytics.kpiMeta.registeredUsers}
                  comparison={analytics.kpiComparison.registeredUsers}
                />
                <KpiCard
                  label="Active Jobs"
                  value={analytics.kpis.activeJobs}
                  icon={BriefcaseBusiness}
                  meta={analytics.kpiMeta.activeJobs}
                  comparison={analytics.kpiComparison.activeJobs}
                />
                <KpiCard
                  label="Applications"
                  value={analytics.kpis.applications}
                  icon={BarChart3}
                  meta={analytics.kpiMeta.applications}
                  comparison={analytics.kpiComparison.applications}
                />
                <KpiCard
                  label="Hired Applicants"
                  value={analytics.kpis.hired}
                  icon={UserRoundCheck}
                  meta={analytics.kpiMeta.hired}
                  comparison={analytics.kpiComparison.hired}
                />
                <KpiCard
                  label="Hire Rate"
                  value={analytics.kpis.hireRate}
                  suffix="%"
                  icon={Target}
                  meta={analytics.kpiMeta.hireRate}
                  comparison={analytics.kpiComparison.hireRate}
                />
                <KpiCard
                  label="Average Time-to-Hire"
                  value={analytics.kpis.avgTimeToHireDays}
                  suffix=" days"
                  icon={Clock3}
                  meta={analytics.kpiMeta.avgTimeToHireDays}
                  comparison={analytics.kpiComparison.avgTimeToHireDays}
                  inverseComparison
                />
              </div>
            </section>

            <nav
              className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2"
              aria-label="Analytics sections"
            >
              {tabs.map(([key, label]) => (
                <button
                  type="button"
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`shrink-0 rounded-xl px-4 py-2.5 text-xs font-medium transition ${
                    activeTab === key
                      ? "bg-[#2e66a6] text-white"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </nav>

            {activeTab === "overview" ? (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
                <ChartCard
                  title="Applications & Hires Trend"
                  subtitle="Shows submitted applications, hires, and hire rate over time so placement movement is easy to see."
                  className="xl:col-span-12"
                >
                  <TrendChart data={analytics.trends} />
                </ChartCard>

                <ChartCard
                  title="Hiring Funnel"
                  subtitle="Shows where applicants are currently concentrated or leaving the recruitment pipeline."
                  className="xl:col-span-7"
                >
                  <HorizontalBarChart
                    data={analytics.overview.funnel}
                    valueLabel="Applications"
                    height={330}
                  />
                </ChartCard>

                <ChartCard
                  title="Top Industries by Hires"
                  subtitle="Shows which employer sectors are absorbing the most graduates under the current filters."
                  className="xl:col-span-5"
                >
                  <HorizontalBarChart
                    data={analytics.overview.topIndustriesByHires}
                    valueLabel="Hires"
                    height={330}
                  />
                </ChartCard>
              </div>
            ) : null}

            {activeTab === "applications" ? (
              <div className="space-y-4">
                <SectionTabs
                  tabs={[
                    ["journey", "Journey"],
                    ["behaviour", "Behaviour"],
                    ["speed", "Speed"],
                    ["dropouts", "Drop-outs"],
                  ]}
                  active={applicationTab}
                  onChange={setApplicationTab}
                />

                {applicationTab === "journey" ? (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <MetricTile
                        label="Median Time-to-Hire"
                        value={sections.applications.metrics?.medianTimeToHireDays}
                        suffix=" days"
                        icon={Clock3}
                      />
                      <MetricTile
                        label="P75 Time-to-Hire"
                        value={sections.applications.metrics?.p75TimeToHireDays}
                        suffix=" days"
                        icon={Activity}
                      />
                      <MetricTile
                        label="Interview Rate"
                        value={sections.applications.metrics?.interviewRate}
                        suffix="%"
                        icon={UserRoundCheck}
                      />
                      <MetricTile
                        label="Withdrawal Rate"
                        value={sections.applications.metrics?.withdrawalRate}
                        suffix="%"
                        icon={TrendingUp}
                      />
                    </div>

                    <div className="grid gap-4 xl:grid-cols-12">
                      <ChartCard
                        title="Applicant Journey Funnel"
                        subtitle="Pending through final outcomes, using the same application-status definitions as the analytics plan."
                        className="xl:col-span-7"
                      >
                        <HorizontalBarChart
                          data={sections.applications.funnel}
                          valueLabel="Applications"
                          height={330}
                        />
                      </ChartCard>

                      <ChartCard
                        title="Employment Status of Hires"
                        subtitle="Current active or inactive employment state for applicants already marked as hired."
                        className="xl:col-span-5"
                      >
                        <DonutChart
                          data={sections.applications.employmentStatus}
                          centerLabel="Hired"
                        />
                      </ChartCard>
                    </div>
                  </>
                ) : null}

                {applicationTab === "behaviour" ? (
                  <div className="grid gap-4 lg:grid-cols-2">
                    <ChartCard
                      title="Applications Before First Hire"
                      subtitle="Answers how many applications a job seeker submitted before reaching the first hired outcome."
                    >
                      <HorizontalBarChart
                        data={sections.applications.applicationsBeforeHire}
                        valueLabel="Job Seekers"
                        height={330}
                      />
                    </ChartCard>

                    <ChartCard
                      title="Advertised Salary Band of Hires"
                      subtitle="Uses the midpoint of the job's advertised salary range because actual offered salary is not stored in the current schema."
                    >
                      <HorizontalBarChart
                        data={sections.applications.salaryBands}
                        valueLabel="Hires"
                        height={330}
                      />
                    </ChartCard>
                  </div>
                ) : null}

                {applicationTab === "speed" ? (
                  <div className="grid gap-4 lg:grid-cols-2">
                    <ChartCard
                      title="Stage Duration Profile"
                      subtitle="Median calendar days spent from application to first action, interview to decision, and total process time."
                    >
                      <HorizontalBarChart
                        data={sections.applications.stageDurations}
                        valueLabel="Median Days"
                        valueSuffix=" days"
                        height={290}
                      />
                    </ChartCard>

                    <ChartCard
                      title="Employer Responsiveness"
                      subtitle="Employers with the longest median days from application submission to the first recorded employer action."
                    >
                      <HorizontalBarChart
                        data={sections.applications.employerResponsiveness}
                        valueLabel="Median Days"
                        valueSuffix=" days"
                        height={330}
                      />
                    </ChartCard>
                  </div>
                ) : null}

                {applicationTab === "dropouts" ? (
                  <div className="grid gap-4 lg:grid-cols-2">
                    <ChartCard
                      title="Drop-out Node Breakdown"
                      subtitle="Shows where non-hired applications leave or stall in the recruitment journey."
                    >
                      <HorizontalBarChart
                        data={sections.applications.dropoutNodes}
                        valueLabel="Applications"
                        height={340}
                      />
                    </ChartCard>

                    <ChartCard
                      title="Top Decline Reasons"
                      subtitle="Ranks the currently stored employer decline reasons. Free-text reasons may still require future standardisation."
                    >
                      <HorizontalBarChart
                        data={sections.applications.declineReasons}
                        valueLabel="Declined Applications"
                        height={340}
                      />
                    </ChartCard>
                  </div>
                ) : null}
              </div>
            ) : null}

            {activeTab === "jobs" ? (
              <div className="space-y-4">
                <SectionTabs
                  tabs={[
                    ["demand", "Demand & Health"],
                    ["requirements", "Requirements"],
                    ["skills", "Skills & Salary"],
                  ]}
                  active={jobsTab}
                  onChange={setJobsTab}
                />

                {jobsTab === "demand" ? (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <MetricTile
                        label="Total Vacancies"
                        value={sections.jobs.metrics?.totalVacancies}
                        icon={BriefcaseBusiness}
                      />
                      <MetricTile
                        label="Applications / Job"
                        value={sections.jobs.metrics?.applicationsPerJob}
                        icon={BarChart3}
                      />
                      <MetricTile
                        label="View-to-Application"
                        value={sections.jobs.metrics?.viewToApplicationRate}
                        suffix="%"
                        icon={Target}
                      />
                      <MetricTile
                        label="Median Time-to-Fill"
                        value={sections.jobs.metrics?.medianTimeToFillDays}
                        suffix=" days"
                        icon={Clock3}
                      />
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                      <ChartCard
                        title="Job Status"
                        subtitle="Derived job lifecycle state using status, publish state, archive state, activity, and application deadline."
                      >
                        <DonutChart
                          data={sections.jobs.statuses}
                          centerLabel="Jobs"
                        />
                      </ChartCard>

                      <ChartCard
                        title="Jobs by Category"
                        subtitle="Current job supply grouped by job category under the active global filters."
                      >
                        <HorizontalBarChart
                          data={sections.jobs.categories}
                          valueLabel="Jobs"
                          height={320}
                        />
                      </ChartCard>
                    </div>
                  </>
                ) : null}

                {jobsTab === "requirements" ? (
                  <div className="grid gap-4 lg:grid-cols-2">
                    <ChartCard
                      title="Job Type Mix"
                      subtitle="Distribution of Full-time, Part-time, Contractual, Permanent, and legacy unspecified postings."
                    >
                      <HorizontalBarChart
                        data={sections.jobs.jobTypes}
                        valueLabel="Jobs"
                        height={300}
                      />
                    </ChartCard>

                    <ChartCard
                      title="Work Mode Mix"
                      subtitle="Distribution of On-site, Remote, Blended, and Work from Home jobs."
                    >
                      <HorizontalBarChart
                        data={sections.jobs.workModes}
                        valueLabel="Jobs"
                        height={300}
                      />
                    </ChartCard>

                    <ChartCard
                      title="Education Requirement"
                      subtitle="Canonical education levels so legacy Bachelor, Master, and Doctorate labels do not split the counts."
                    >
                      <HorizontalBarChart
                        data={sections.jobs.educationLevels}
                        valueLabel="Jobs"
                        height={300}
                      />
                    </ChartCard>

                    <ChartCard
                      title="Experience Requirement"
                      subtitle="Legacy experience values are grouped into the five analytics-plan buckets."
                    >
                      <HorizontalBarChart
                        data={sections.jobs.experienceLevels}
                        valueLabel="Jobs"
                        height={300}
                      />
                    </ChartCard>
                  </div>
                ) : null}

                {jobsTab === "skills" ? (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <MetricTile
                        label="Applications / Vacancy"
                        value={sections.jobs.metrics?.applicationsPerVacancy}
                        icon={Activity}
                      />
                      <MetricTile
                        label="Fill Rate"
                        value={sections.jobs.metrics?.fillRate}
                        suffix="%"
                        icon={CheckCircle2}
                      />
                      <MetricTile
                        label="Salary Transparency"
                        value={sections.jobs.metrics?.salaryTransparencyRate}
                        suffix="%"
                        icon={ShieldCheck}
                      />
                      <MetricTile
                        label="Fresh Graduate Open"
                        value={sections.jobs.metrics?.freshGraduateOpenRate}
                        suffix="%"
                        icon={GraduationCap}
                      />
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                      <ChartCard
                        title="Top Demanded Skills"
                        subtitle="Counts how frequently each required skill appears in job postings within the current scope."
                      >
                        <HorizontalBarChart
                          data={sections.jobs.demandedSkills}
                          valueLabel="Jobs Requiring Skill"
                          height={360}
                        />
                      </ChartCard>

                      <ChartCard
                        title="Salary Visibility"
                        subtitle="Compares job postings that show an advertised salary with postings that hide it."
                      >
                        <DonutChart
                          data={sections.jobs.salaryVisibility}
                          centerLabel="Jobs"
                        />
                      </ChartCard>
                    </div>
                  </>
                ) : null}
              </div>
            ) : null}

            {activeTab === "verification" ? (
              <div className="space-y-4">
                <SectionTabs
                  tabs={[
                    ["verification", "Verification"],
                    ["requests", "Requests"],
                  ]}
                  active={verificationTab}
                  onChange={setVerificationTab}
                />

                {verificationTab === "verification" ? (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <MetricTile
                        label="Pending / Hold Backlog"
                        value={sections.verification.metrics?.pendingBacklog}
                        icon={ShieldCheck}
                      />
                      <MetricTile
                        label="Email OTP Requests"
                        value={sections.verification.metrics?.emailRequests}
                        icon={Activity}
                      />
                      <MetricTile
                        label="Email Verified"
                        value={sections.verification.metrics?.emailVerified}
                        icon={CheckCircle2}
                      />
                      <MetricTile
                        label="Email Completion"
                        value={sections.verification.metrics?.emailCompletionRate}
                        suffix="%"
                        icon={Target}
                      />
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                      <ChartCard
                        title="Verification Status"
                        subtitle="Overall verification state for job seekers and employers, using canonical Verified, Declined, Pending, Hold, and Not Submitted labels."
                      >
                        <DonutChart
                          data={sections.verification.statuses}
                          centerLabel="Users"
                        />
                      </ChartCard>

                      <ChartCard
                        title="Verification Backlog Aging"
                        subtitle="Pending and Hold verification records grouped by the age of the earliest uploaded document."
                      >
                        <HorizontalBarChart
                          data={sections.verification.backlogAging}
                          valueLabel="Users"
                          height={290}
                        />
                      </ChartCard>

                      <ChartCard
                        title="Registration Verification by Role"
                        subtitle="Email registration OTP records grouped by job seeker and employer role."
                      >
                        <HorizontalBarChart
                          data={sections.verification.registrationByRole}
                          valueLabel="Requests"
                          height={260}
                        />
                      </ChartCard>
                    </div>
                  </>
                ) : null}

                {verificationTab === "requests" ? (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <MetricTile
                        label="Edit Request Approval"
                        value={sections.verification.metrics?.editRequestApprovalRate}
                        suffix="%"
                        icon={CheckCircle2}
                      />
                      <MetricTile
                        label="Edit Request Turnaround"
                        value={
                          sections.verification.metrics
                            ?.editRequestMedianTurnaroundDays
                        }
                        suffix=" days"
                        icon={Clock3}
                      />
                      <MetricTile
                        label="Employment Request Turnaround"
                        value={
                          sections.verification.metrics
                            ?.employmentRequestMedianTurnaroundDays
                        }
                        suffix=" days"
                        icon={Clock3}
                      />
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                      <ChartCard
                        title="Job Edit Request Outcomes"
                        subtitle="Pending, Approved, Rejected, and Expired job edit requests."
                      >
                        <DonutChart
                          data={sections.verification.editRequests}
                          centerLabel="Requests"
                        />
                      </ChartCard>

                      <ChartCard
                        title="Most Requested Job Sections"
                        subtitle="Shows which parts of published job posts employers most often request to unlock for editing."
                      >
                        <HorizontalBarChart
                          data={sections.verification.editRequestSections}
                          valueLabel="Requests"
                          height={320}
                        />
                      </ChartCard>

                      <ChartCard
                        title="Employment Status Requests"
                        subtitle="Current outcomes of hired-applicant employment status requests, including pending, approved, declined, and no-response states."
                      >
                        <DonutChart
                          data={sections.verification.employmentRequests}
                          centerLabel="Requests"
                        />
                      </ChartCard>
                    </div>
                  </>
                ) : null}
              </div>
            ) : null}

            <footer className="flex flex-col gap-1 border-t border-slate-200 pt-3 text-[11px] text-slate-400 sm:flex-row sm:items-center sm:justify-between">
              <span>
                Timezone: {analytics.timezone || "Asia/Manila"} · Small-group
                threshold: n &lt; {analytics.privacyThreshold || 5}
              </span>
              <span>
                Last updated:{" "}
                {analytics.generatedAt
                  ? new Date(analytics.generatedAt).toLocaleString("en-PH")
                  : "—"}
              </span>
            </footer>
          </>
        )}
      </div>

      <CustomDateRangeModal
        open={showCustomDateModal}
        startDate={filters.startDate}
        endDate={filters.endDate}
        onCancel={() => setShowCustomDateModal(false)}
        onApply={applyCustomDateRange}
      />
    </main>
  );
};

export default AdminAnalytics;
