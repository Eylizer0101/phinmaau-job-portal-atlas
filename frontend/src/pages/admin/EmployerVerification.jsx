// src/pages/admin/EmployerVerification.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import AdminLayout from "../../layouts/AdminLayout";
import Pagination from "../../components/shared/Pagination";

const cn = (...classes) => classes.filter(Boolean).join(" ");

const Icon = ({ name, className = "h-5 w-5", ...props }) => {
  const common = {
    className,
    fill: "none",
    stroke: "currentColor",
    viewBox: "0 0 24 24",
    strokeWidth: 2,
    ...props,
  };

  const icons = {
    search: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.3-4.3m1.3-5.2a7 7 0 11-14 0 7 7 0 0114 0z" />
    ),
    refresh: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v6h6M20 20v-6h-6" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 9A8 8 0 006.3 5.3L4 10M4 15a8 8 0 0013.7 3.7L20 14" />
      </>
    ),
    restore: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h6V4" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.93 19.07A9 9 0 1012 3a9 9 0 00-7.07 3.43L3 10" />
      </>
    ),
    eye: (
      <>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
        />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </>
    ),
    trash: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 11v6M14 11v6" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3M4 7h16" />
      </>
    ),
    x: <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />,
    calendar: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10m-13 9h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v11a2 2 0 002 2z" />
      </>
    ),
    chevronLeft: <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />,
    chevronRight: <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />,
    building: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
      />
    ),
  };

  return <svg {...common}>{icons[name] || null}</svg>;
};

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2";

const inputBase =
  "h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-900 placeholder-gray-400 shadow-sm " +
  focusRing +
  " disabled:bg-gray-50 disabled:opacity-60";

const Button = ({
  variant = "secondary",
  size = "md",
  leftIcon,
  rightIcon,
  children,
  className,
  disabled,
  loading,
  ...props
}) => {
  const base =
    "inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 " +
    focusRing +
    " disabled:cursor-not-allowed";

  const sizes = {
    sm: "px-3.5 py-2 text-sm rounded-xl",
    md: "px-4 py-2.5 text-sm rounded-xl",
  };

  const variants = {
    primary:
      "bg-[#2e66a6] text-white hover:bg-[#255487] shadow-sm disabled:bg-gray-200 disabled:text-gray-500 disabled:hover:bg-gray-200",
    secondary:
      "border border-gray-200 bg-white text-gray-800 hover:bg-gray-50 shadow-sm disabled:hover:bg-white disabled:shadow-none",
    danger:
      "bg-red-600 text-white hover:bg-red-700 shadow-sm disabled:bg-red-200 disabled:text-red-800 disabled:hover:bg-red-200",
  };

  return (
    <button
      type="button"
      className={cn(base, sizes[size], variants[variant], className, loading && "opacity-70 cursor-wait")}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : (
        leftIcon
      )}
      <span>{children}</span>
      {!loading && rightIcon}
    </button>
  );
};

const IconButton = ({ label, children, className, ...props }) => (
  <button
    type="button"
    className={cn(
      "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed",
      focusRing,
      className
    )}
    aria-label={label}
    {...props}
  >
    {children}
  </button>
);

const Alert = ({ type = "error", title, children, onClose }) => {
  const styles = {
    error: "border-red-200 bg-red-50 text-red-900",
    success: "border-green-200 bg-green-50 text-green-900",
  };

  return (
    <div className={cn("mb-5 flex items-start gap-3 rounded-2xl border p-4", styles[type])}>
      <div className="flex-1 min-w-0">
        {title ? <div className="font-semibold mb-1">{title}</div> : null}
        <div className="text-sm">{children}</div>
      </div>
      {onClose ? (
        <button type="button" onClick={onClose} className={cn("rounded-lg p-1 hover:bg-black/5", focusRing)} aria-label="Dismiss">
          <Icon name="x" className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
};

const Card = ({ children, className, padding = true }) => (
  <div className={cn("rounded-2xl bg-white border border-gray-200 shadow-sm ring-1 ring-black/5", padding && "p-5", className)}>{children}</div>
);

const SummaryCard = ({ label, value, image }) => (
  <div className="relative rounded-2xl overflow-hidden group">
    <div className="pointer-events-none absolute inset-0 z-0">
      <div
        className="absolute w-[70px] h-[70px] rounded-full blur-[35px] top-[38%] right-[22%] transition-all duration-700 ease-out
        group-hover:scale-110 group-hover:blur-[45px] group-hover:opacity-80"
        style={{
          background:
            "radial-gradient(circle, rgba(46,102,166,0.25) 0%, rgba(46,102,166,0.14) 45%, transparent 75%)",
        }}
      />
    </div>

    <div
      className="relative z-10 h-full p-6 rounded-2xl overflow-hidden text-white
      bg-gradient-to-br from-[#072258] via-[#2d63a0] to-[#52b2db]
      shadow-[0_10px_24px_rgba(46,102,166,0.18)] transition-all duration-300 ease-out
      group-hover:shadow-[0_16px_34px_rgba(46,102,166,0.24)] group-hover:-translate-y-0.5 group-active:scale-[0.99]
      group-hover:brightness-[1.03] min-h-[118px]"
    >
      {image ? (
        <img
          src={image}
          alt=""
          className="pointer-events-none absolute right-[-18px] top-1/2 -translate-y-1/2 w-20 h-20 md:w-22 md:h-22 object-contain opacity-50 mix-blend-soft-light saturate-150
          transition-all duration-700 ease-out group-hover:opacity-50 group-hover:saturate-180 group-hover:scale-105 group-hover:right-[-15px]"
          style={{
            WebkitMaskImage:
              "radial-gradient(circle at 35% 50%, rgba(0,0,0,1) 0%, rgba(0,0,0,0.6) 55%, rgba(0,0,0,0) 80%)",
            maskImage:
              "radial-gradient(circle at 35% 50%, rgba(0,0,0,1) 0%, rgba(0,0,0,0.6) 55%, rgba(0,0,0,0) 80%)",
          }}
        />
      ) : null}

      <div className="relative z-10">
        <p className="text-3xl font-semibold leading-none transition-all duration-400 ease-out group-hover:text-[32px]">
          {Number(value || 0).toLocaleString()}
        </p>

        <div className="flex items-center justify-between mt-2 gap-2">
          <p className="text-sm text-white/90 flex items-center gap-1 transition-all duration-400 group-hover:text-white whitespace-nowrap">
            <span className="whitespace-nowrap">{label}</span>
          </p>
        </div>
      </div>

      <div className="absolute inset-0 bg-gradient-to-t from-transparent to-transparent opacity-0 group-hover:opacity-5 group-hover:to-white/10 transition-all duration-500 ease-out" />
    </div>

    <div className="absolute inset-0 rounded-2xl border-2 border-transparent group-hover:border-white/20 transition-all duration-500 ease-out pointer-events-none" />
  </div>
);

const Badge = ({ children, variant = "neutral" }) => {
  const variants = {
    neutral: "bg-gray-100 text-gray-700",
    success: "bg-green-100 text-green-700",
    warning: "bg-amber-100 text-amber-700",
    danger: "bg-red-100 text-red-700",
    hold: "bg-[#2e66a6]/10 text-[#2e66a6]",
  };

  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold", variants[variant])}>
      {children}
    </span>
  );
};

const statusBadge = (status) => {
  const normalized = String(status || "unverified").toLowerCase();
  if (normalized === "verified") return <Badge variant="success">Verified</Badge>;
  if (normalized === "pending") return <Badge variant="warning">Pending</Badge>;
  if (normalized === "hold") return <Badge variant="hold">Hold</Badge>;
  if (normalized === "rejected" || normalized === "declined") return <Badge variant="danger">Declined</Badge>;
  return <Badge variant="neutral">Unverified</Badge>;
};

const formatDate = (dateString) => {
  if (!dateString) return "—";
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-PH", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    timeZone: "Asia/Manila",
  });
};

const buildLocationDisplay = (item) => {
  const profile = item?.employerProfile || {};
  const rawAddress = String(item?.address || profile?.regionCity || "").trim();

  const region =
    item?.region ||
    profile?.region ||
    profile?.companyRegion ||
    rawAddress.split(" - ")[0]?.trim() ||
    "—";

  const city =
    item?.city ||
    item?.municipality ||
    profile?.city ||
    profile?.municipality ||
    profile?.companyCity ||
    "";

  const province =
    item?.province ||
    profile?.province ||
    profile?.companyProvince ||
    "";

  const addressParts = rawAddress
    .split(" - ")
    .map((part) => part.trim())
    .filter(Boolean);

  const fallbackProvince = addressParts[1] || "";
  const fallbackCity = addressParts[2] || "";

  const cityProvince =
    [city || fallbackCity, province || fallbackProvince]
      .filter(Boolean)
      .filter((value, index, values) => values.indexOf(value) === index)
      .join(", ") ||
    fallbackProvince ||
    "—";

  return { region, cityProvince };
};

const buildAvatar = (item) => {
  const companyName = item?.companyName || item?.employerProfile?.companyName || "";
  return (companyName.trim().charAt(0) || "?").toUpperCase();
};

const dateOptions = [
  { value: "all", label: "All Time" },
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "thisWeek", label: "This Week" },
  { value: "7days", label: "Last 7 Days" },
  { value: "thisMonth", label: "This Month" },
  { value: "lastMonth", label: "Last Month" },
  { value: "thisYear", label: "This Year" },
  { value: "lastYear", label: "Last Year" },
  { value: "custom", label: "Custom Range" },
];

const formatDateInput = (date) => {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const getPresetDateRange = (value) => {
  const today = new Date();
  const current = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  if (value === "today") {
    return { dateFrom: formatDateInput(current), dateTo: formatDateInput(current) };
  }

  if (value === "yesterday") {
    const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
    return { dateFrom: formatDateInput(yesterday), dateTo: formatDateInput(yesterday) };
  }

  if (value === "thisWeek") {
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    return {
      dateFrom: formatDateInput(
        new Date(today.getFullYear(), today.getMonth(), today.getDate() - mondayOffset)
      ),
      dateTo: formatDateInput(current),
    };
  }

  if (value === "7days") {
    return {
      dateFrom: formatDateInput(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6)),
      dateTo: formatDateInput(current),
    };
  }

  if (value === "thisMonth") {
    return {
      dateFrom: formatDateInput(new Date(today.getFullYear(), today.getMonth(), 1)),
      dateTo: formatDateInput(current),
    };
  }

  if (value === "lastMonth") {
    return {
      dateFrom: formatDateInput(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
      dateTo: formatDateInput(new Date(today.getFullYear(), today.getMonth(), 0)),
    };
  }

  if (value === "thisYear") {
    return {
      dateFrom: formatDateInput(new Date(today.getFullYear(), 0, 1)),
      dateTo: formatDateInput(current),
    };
  }

  if (value === "lastYear") {
    return {
      dateFrom: formatDateInput(new Date(today.getFullYear() - 1, 0, 1)),
      dateTo: formatDateInput(new Date(today.getFullYear() - 1, 11, 31)),
    };
  }

  return { dateFrom: "", dateTo: "" };
};

const formatDateLabel = (value) => {
  if (!value) return "Select date";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "Select date";
  return date.toLocaleDateString("en-PH", { month: "short", day: "2-digit", year: "numeric" });
};

const getDateOptionLabel = (value, startDate, endDate) => {
  if (value === "custom" && startDate && endDate) {
    return `${formatDateLabel(startDate)} - ${formatDateLabel(endDate)}`;
  }

  return dateOptions.find((option) => option.value === value)?.label || "All Time";
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
  const startYear = 1950;
  const endYear = new Date().getFullYear();
  return Array.from({ length: endYear - startYear + 1 }, (_, index) => startYear + index);
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
  const inRange = (d) => start && end && d >= start && d <= end;
  const changeByMonth = (amount) => onChangeMonth(addCalendarMonths(monthDate, amount));
  const changeMonthSelect = (nextMonth) => onChangeMonth(new Date(year, Number(nextMonth), 1));
  const changeYearSelect = (nextYear) => onChangeMonth(new Date(Number(nextYear), month, 1));

  return (
    <div className="min-w-0 flex-1">
      <div className="mb-4 grid grid-cols-[32px_1fr_32px] items-center gap-2">
        <button type="button" onClick={() => changeByMonth(-1)} className="flex h-8 w-8 items-center justify-center rounded-lg text-2xl leading-none text-slate-700 transition hover:bg-slate-100" aria-label="Previous month">‹</button>

        <div className="grid grid-cols-[1fr_86px] gap-2">
          <select value={month} onChange={(event) => changeMonthSelect(event.target.value)} className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-center text-sm font-extrabold text-[#2e66a6] outline-none focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/20" aria-label="Select month">
            {monthNames.map((name, index) => (
              <option key={name} value={index}>{name}</option>
            ))}
          </select>

          <select value={year} onChange={(event) => changeYearSelect(event.target.value)} className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-center text-sm font-extrabold text-[#2e66a6] outline-none focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/20" aria-label="Select year">
            {getYearOptions().map((yearOption) => (
              <option key={yearOption} value={yearOption}>{yearOption}</option>
            ))}
          </select>
        </div>

        <button type="button" onClick={() => changeByMonth(1)} className="flex h-8 w-8 items-center justify-center rounded-lg text-2xl leading-none text-slate-700 transition hover:bg-slate-100" aria-label="Next month">›</button>
      </div>

      <div className="grid grid-cols-7 gap-y-2 text-center text-xs font-bold text-slate-500">
        {["SU", "MO", "TU", "WE", "TH", "FR", "SA"].map((day) => <div key={day}>{day}</div>)}
      </div>

      <div className="mt-3 grid grid-cols-7 gap-y-1 text-center text-sm text-slate-600">
        {days.map((day) => {
          const value = formatDateInput(day);
          const outside = day.getMonth() !== month;
          const selected = isSameDay(day, start) || isSameDay(day, end);
          const ranged = inRange(day);
          return (
            <button type="button" key={value} onClick={() => onPickDate(value)} className={cn("mx-auto flex h-9 w-full items-center justify-center transition", outside ? "text-slate-300" : "text-slate-700", ranged ? "bg-[#2e66a6]/10 text-[#2e66a6]" : "", selected ? "rounded-lg bg-[#2e66a6] font-extrabold text-white shadow-md" : "hover:bg-[#2e66a6]/10")}>{day.getDate()}</button>
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
  const [rightMonth, setRightMonth] = useState(addCalendarMonths(new Date(`${initialEnd}T00:00:00`), 0));

  useEffect(() => {
    if (!open) return;
    const nextStart = startDate || formatDateInput(today);
    const nextEnd = endDate || formatDateInput(today);
    setDraftStart(nextStart);
    setDraftEnd(nextEnd);
    setLeftMonth(new Date(`${nextStart}T00:00:00`));
    setRightMonth(addCalendarMonths(new Date(`${nextEnd}T00:00:00`), 0));
  }, [open, startDate, endDate]);

  if (!open) return null;

  const pickDate = (value) => {
    if (!draftStart || (draftStart && draftEnd)) {
      setDraftStart(value);
      setDraftEnd("");
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
      <div className="w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="grid gap-5 px-6 pb-5 pt-5 md:grid-cols-[1fr_auto_1fr] md:items-end">
          <div>
            <div className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-500">Start Date</div>
            <div className="flex h-12 items-center gap-3 rounded-xl bg-slate-100 px-4 text-lg font-bold text-[#2e66a6]"><Icon name="calendar" className="h-5 w-5" /> {formatDateLabel(draftStart)}</div>
          </div>
          <div className="hidden pb-3 text-3xl text-slate-500 md:block">→</div>
          <div>
            <div className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-500">End Date</div>
            <div className="flex h-12 items-center gap-3 rounded-xl bg-slate-100 px-4 text-lg font-bold text-[#2e66a6]"><Icon name="calendar" className="h-5 w-5" /> {formatDateLabel(draftEnd)}</div>
          </div>
        </div>

        <div className="grid gap-8 px-6 pb-5 md:grid-cols-2">
          <CalendarMonth monthDate={leftMonth} startDate={draftStart} endDate={draftEnd} onPickDate={pickDate} onChangeMonth={setLeftMonth} />
          <CalendarMonth monthDate={rightMonth} startDate={draftStart} endDate={draftEnd} onPickDate={pickDate} onChangeMonth={setRightMonth} />
        </div>

        <div className="flex items-center justify-end gap-5 border-t border-slate-100 px-6 py-5">
          <button type="button" onClick={onCancel} className="text-base font-bold text-slate-600">Cancel</button>
          <button type="button" onClick={apply} disabled={!draftStart || !draftEnd} className="h-11 rounded-xl bg-[#2e66a6] px-8 text-base font-extrabold text-white shadow-lg shadow-[#2e66a6]/25 transition hover:bg-[#255487] disabled:opacity-60">Apply Range</button>
        </div>
      </div>
    </div>
  );
};

const DEFAULT_FILTERS = {
  search: "",
  company: "all",
  industry: "all",
  status: "all",
  date: "all",
  dateFrom: "",
  dateTo: "",
  sort: "newest",
  page: 1,
  limit: 10,
};

const DateFilterDropdown = ({ value, startDate, endDate, disabled, onSelect }) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return undefined;

    const close = () => setOpen(false);
    window.addEventListener("click", close);

    return () => window.removeEventListener("click", close);
  }, [open]);

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((prev) => !prev);
        }}
        className={cn(
          "flex h-11 w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-800 shadow-sm transition hover:bg-gray-50",
          focusRing,
          "disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-60"
        )}
      >
        <span className="truncate">{getDateOptionLabel(value, startDate, endDate)}</span>
        <Icon name="calendar" className="h-4 w-4 text-slate-500" />
      </button>

      {open ? (
        <div
          onClick={(event) => event.stopPropagation()}
          className="absolute left-0 top-[68px] z-50 w-56 rounded-2xl border border-gray-100 bg-white p-2 shadow-xl ring-1 ring-black/5"
        >
          <div className="space-y-1">
            {dateOptions.map((option) => (
              <button
                type="button"
                key={option.value}
                onClick={() => {
                  setOpen(false);
                  onSelect(option.value);
                }}
                className={cn(
                  "w-full rounded-xl px-3 py-2 text-left text-sm font-semibold transition",
                  value === option.value ? "bg-[#2e66a6]/10 text-[#2e66a6]" : "text-slate-600 hover:bg-slate-50"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};

const Modal = ({ open, title, description, children, onClose, size = "md" }) => {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    const prevActive = document.activeElement;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };

    document.addEventListener("keydown", onKey);

    setTimeout(() => {
      const focusable = panelRef.current?.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      focusable?.focus?.();
    }, 0);

    return () => {
      document.removeEventListener("keydown", onKey);
      prevActive?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  const sizes = {
    md: "max-w-lg",
    lg: "max-w-2xl",
  };

  const trapFocus = (e) => {
    if (e.key !== "Tab") return;

    const focusables = panelRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (!focusables || focusables.length === 0) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-[70]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          ref={panelRef}
          onKeyDown={trapFocus}
          className={cn("w-full rounded-3xl bg-white shadow-xl border border-gray-200", sizes[size])}
          role="dialog"
          aria-modal="true"
        >
          <div className="p-5 sm:p-6 border-b border-gray-100">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-gray-900">{title}</h3>
                {description ? <p className="mt-1 text-sm text-gray-600">{description}</p> : null}
              </div>

              <button type="button" onClick={onClose} className={cn("rounded-xl p-2 hover:bg-gray-50", focusRing)} aria-label="Close dialog">
                <Icon name="x" className="h-5 w-5 text-gray-700" />
              </button>
            </div>
          </div>

          <div className="p-5 sm:p-6">{children}</div>
        </div>
      </div>
    </div>
  );
};

const RestoreConfirmationModal = ({ open, name, loading, onCancel, onConfirm }) => {
  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !loading) onCancel();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, loading, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 px-4 py-6">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        onClick={loading ? undefined : onCancel}
        aria-label="Close restore confirmation"
      />

      <div
        className="relative w-full max-w-[460px] rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl sm:p-7"
        role="dialog"
        aria-modal="true"
        aria-labelledby="restore-employer-title"
      >
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className={cn("absolute right-4 top-4 rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800", focusRing)}
          aria-label="Close"
        >
          <Icon name="x" className="h-5 w-5" />
        </button>

        <div className="flex items-start gap-4 pr-8">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#2e66a6]/10 text-[#2e66a6]">
            <Icon name="refresh" className="h-5 w-5" />
          </div>
          <div>
            <h2 id="restore-employer-title" className="text-xl font-bold text-gray-900">
              Restore {name}
            </h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Are you sure you want to restore <strong className="font-semibold text-gray-900">{name}</strong>? This action will allow the Employer to proceed with the verification and review process again.
            </p>
          </div>
        </div>

        <div className="mt-7 flex justify-end gap-3">
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={onConfirm} loading={loading}>
            Restore
          </Button>
        </div>
      </div>
    </div>
  );
};

const EmployerVerification = () => {
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    verified: 0,
    rejected: 0,
    hold: 0,
    unverified: 0,
  });

  const [filterOptions, setFilterOptions] = useState({
    companies: [],
    industries: [],
    statuses: [],
  });

  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [searchDraft, setSearchDraft] = useState("");

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalItems: 0,
    totalPages: 1,
    hasPrevPage: false,
    hasNextPage: false,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showCustomDateModal, setShowCustomDateModal] = useState(false);
  const [archiveMode, setArchiveMode] = useState(false);
  const [restoringId, setRestoringId] = useState("");
  const [restoreTarget, setRestoreTarget] = useState(null);

  const clearMessages = useCallback(() => {
    setError("");
    setSuccess("");
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((prev) => ({
        ...prev,
        search: searchDraft.trim(),
        page: 1,
      }));
    }, 350);

    return () => clearTimeout(timer);
  }, [searchDraft]);

  const fetchEmployers = useCallback(
    async ({ silent = false } = {}) => {
      try {
        clearMessages();
        if (silent) setRefreshing(true);
        else setLoading(true);

        const params = {
          page: filters.page,
          limit: filters.limit === "all" ? 100000 : filters.limit,
          sort: filters.sort,
        };

        if (filters.search) params.search = filters.search;
        if (filters.company !== "all") params.company = filters.company;
        if (filters.industry !== "all") params.industry = filters.industry;
        if (archiveMode) params.status = "rejected";
        else if (filters.status !== "all") params.status = filters.status;
        if (filters.dateFrom) params.dateFrom = filters.dateFrom;
        if (filters.dateTo) params.dateTo = filters.dateTo;

        const res = await api.get("/admin/employers/verification", { params });
        const payload = res?.data || {};

        if (!payload.success) {
          throw new Error(payload.message || "Failed to load employers.");
        }

        setRows(payload.employers || []);
        setStats(
          payload.stats || {
            total: 0,
            pending: 0,
            verified: 0,
            rejected: 0,
            hold: 0,
            unverified: 0,
          }
        );
        setFilterOptions(
          payload.filters || {
            companies: [],
            industries: [],
            statuses: [],
          }
        );
        setPagination(
          payload.pagination || {
            page: 1,
            limit: 10,
            totalItems: 0,
            totalPages: 1,
            hasPrevPage: false,
            hasNextPage: false,
          }
        );
      } catch (err) {
        setRows([]);
        setError(err?.response?.data?.message || err.message || "Failed to load employers.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [filters, archiveMode, clearMessages]
  );

  useEffect(() => {
    fetchEmployers();
  }, [fetchEmployers]);

  const onChangeFilter = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: key === "page" ? value : 1,
    }));
  };

  const onChangeDateFilter = (value) => {
    if (value === "custom") {
      setShowCustomDateModal(true);
      return;
    }

    const range = getPresetDateRange(value);

    setFilters((prev) => ({
      ...prev,
      date: value,
      dateFrom: range.dateFrom,
      dateTo: range.dateTo,
      page: 1,
    }));
  };

  const applyCustomDateRange = (dateFrom, dateTo) => {
    setFilters((prev) => ({
      ...prev,
      date: "custom",
      dateFrom,
      dateTo,
      page: 1,
    }));
    setShowCustomDateModal(false);
  };

  const clearAllFilters = () => {
    setSearchDraft("");
    setFilters(DEFAULT_FILTERS);
  };

  const onDeleteEmployer = async () => {
    if (!deleteTarget?._id) return;

    try {
      setDeleteLoading(true);
      clearMessages();

      const res = await api.delete(`/admin/users/${deleteTarget._id}`);

      if (!res.data?.success) {
        throw new Error(res.data?.message || "Failed to delete employer.");
      }

      setSuccess("Employer deleted successfully.");
      setDeleteTarget(null);

      const isOnlyItemOnPage = visibleRows.length === 1 && pagination.page > 1;
      if (isOnlyItemOnPage) {
        setFilters((prev) => ({ ...prev, page: prev.page - 1 }));
      } else {
        fetchEmployers({ silent: true });
      }
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Failed to delete employer.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const restoreEmployer = async (item) => {
    if (!item?._id) return;
    try {
      setRestoringId(item._id);
      const response = await api.patch(`/admin/employers/verification/${item._id}/restore`);
      setSuccess(response.data?.message || "Employer restored successfully.");
      setRestoreTarget(null);
      await fetchEmployers({ silent: true });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to restore employer.");
    } finally {
      setRestoringId("");
    }
  };

  const visibleRows = useMemo(() => {
    return rows.filter((item) => {
      const status = String(item?.overallStatus || "unverified").toLowerCase();
      return archiveMode
        ? status === "rejected" || status === "declined"
        : status !== "verified" && status !== "rejected" && status !== "declined";
    });
  }, [rows, archiveMode]);

  const visibleStatusOptions = useMemo(() => {
    return (filterOptions.statuses || []).filter((status) => {
      const value = String(status?.value || "").toLowerCase();
      return value !== "unverified" && value !== "verified" && value !== "rejected" && value !== "declined";
    });
  }, [filterOptions.statuses]);

  const desktopRows = visibleRows;
  const mobileRows = visibleRows;

  const hasActiveFilters =
    searchDraft.trim() !== "" ||
    filters.company !== "all" ||
    filters.industry !== "all" ||
    filters.status !== "all" ||
    filters.date !== "all" ||
    filters.dateFrom !== "" ||
    filters.dateTo !== "";

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl px-1 py-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-[33px] font-semibold leading-[40px] text-gray-900">Employer Verification</h1>
            <p className="mt-1 text-sm text-gray-600">Review, filter, and manage employer verification requests</p>
          </div>
          <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
            <button type="button" onClick={() => { setArchiveMode(false); setFilters((prev) => ({ ...prev, status: "all", page: 1 })); }} className={cn("rounded-lg px-4 py-2 text-sm font-semibold", !archiveMode ? "bg-[#2e66a6]/10 text-[#2e66a6]" : "text-gray-600")}>Active <span className="ml-1 rounded-full bg-white px-2 py-0.5">{Math.max(0, stats.total - stats.rejected - stats.verified)}</span></button>
            <button type="button" onClick={() => { setArchiveMode(true); setFilters((prev) => ({ ...prev, status: "all", page: 1 })); }} className={cn("rounded-lg px-4 py-2 text-sm font-semibold", archiveMode ? "bg-[#2e66a6]/10 text-[#2e66a6]" : "text-gray-600")}>Archived <span className="ml-1 rounded-full bg-white px-2 py-0.5">{stats.rejected}</span></button>
          </div>
        </div>

        {error ? (
          <Alert type="error" title="Error" onClose={() => setError("")}>
            {error}
          </Alert>
        ) : null}

        {success ? (
          <Alert type="success" title="Success" onClose={() => setSuccess("")}>
            {success}
          </Alert>
        ) : null}

        <Card className="relative z-20 mb-6 overflow-visible" padding={false}>
          <div className="p-4 sm:p-5">
            <div
              className={cn(
                "grid grid-cols-1 gap-3 xl:items-end",
                hasActiveFilters ? "xl:grid-cols-6" : "xl:grid-cols-5"
              )}
            >
              <div className={archiveMode ? "xl:col-span-2" : ""}>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <Icon name="search" className="h-5 w-5" />
                  </span>

                  <input
                    value={searchDraft}
                    onChange={(e) => setSearchDraft(e.target.value)}
                    className={cn(inputBase, "pl-11 pr-10")}
                    placeholder="Search company, email..."
                    disabled={loading}
                  />

                  {searchDraft ? (
                    <button
                      type="button"
                      onClick={() => setSearchDraft("")}
                      className={cn("absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-gray-500 hover:bg-gray-100", focusRing)}
                      aria-label="Clear search"
                    >
                      <Icon name="x" className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              </div>

              <div>
                <select
                  value={filters.company}
                  onChange={(e) => onChangeFilter("company", e.target.value)}
                  className={inputBase}
                  disabled={loading}
                >
                  <option value="all">All Company</option>
                  {(filterOptions.companies || []).map((company) => (
                    <option key={company} value={company}>
                      {company}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={filters.industry}
                  onChange={(e) => onChangeFilter("industry", e.target.value)}
                  className={inputBase}
                  disabled={loading}
                >
                  <option value="all">All Industries</option>
                  {filterOptions.industries.map((industry) => (
                    <option key={industry} value={industry}>
                      {industry}
                    </option>
                  ))}
                </select>
              </div>

              {!archiveMode ? <div>
                <select
                  value={filters.status}
                  onChange={(e) => onChangeFilter("status", e.target.value)}
                  className={inputBase}
                  disabled={loading}
                >
                  <option value="all">All Status</option>
                  {visibleStatusOptions.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label === "Rejected" ? "Declined" : status.label}
                    </option>
                  ))}
                </select>
              </div> : null}

              <div>
                <DateFilterDropdown
                  value={filters.date}
                  startDate={filters.dateFrom}
                  endDate={filters.dateTo}
                  disabled={loading}
                  onSelect={onChangeDateFilter}
                />
              </div>

              {hasActiveFilters ? (
                <div>
                  <Button variant="secondary" className="h-11 w-full" onClick={clearAllFilters} disabled={loading}>
                    Clear All
                  </Button>
                </div>
              ) : null}
            </div>

          </div>
        </Card>

        <Card className="overflow-hidden" padding={false}>
          <div>
            {loading ? (
              <div className="py-16 text-center">
                <div className="mx-auto inline-block h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-[#2e66a6]" />
                <p className="mt-4 text-sm text-gray-600">Loading employers...</p>
              </div>
            ) : visibleRows.length === 0 ? (
              <div className="py-14 text-center">
                <h3 className="text-lg font-semibold text-gray-900">No employers found</h3>
                <p className="mt-2 text-sm text-gray-600">Try changing filters or search.</p>
              </div>
            ) : (
              <>
                <div className="hidden lg:block overflow-x-hidden">
                  <table className="w-full table-fixed">
                    <thead className="bg-slate-50 border-b border-gray-100">
                      <tr>
                        <th className="w-[13%] px-4 py-4 text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Date Registered</th>
                        <th className="w-[24%] px-4 py-4 text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Name</th>
                        <th className="w-[20%] px-4 py-4 text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Company</th>
                        <th className="w-[18%] px-4 py-4 text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Industry</th>
                        <th className="w-[12%] px-4 py-4 text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Status</th>
                        {archiveMode ? <th className="w-[13%] px-4 py-4 text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Date Declined</th> : null}
                        <th className="w-[10%] px-4 py-4 text-right text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Actions</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100 bg-white">
                      {desktopRows.map((item) => {
                        const companyName = item.companyName || item.employerProfile?.companyName || "No Company";
                        const contactName =
                          item.fullName ||
                          [item.firstName, item.middleName, item.lastName].filter(Boolean).join(" ") ||
                          companyName;
                        const companyEmail = item.businessEmail || item.email || "—";
                        const industry = item.industry || item.employerProfile?.industry || "—";
                        const status = item.overallStatus || "unverified";

                        return (
                          <tr
                            key={item._id}
                            role="link"
                            tabIndex={0}
                            onClick={(event) => {
                              if (event.target.closest("button, a, input, select, textarea, label")) return;
                              navigate(`/admin/employer-verification/${item._id}`);
                            }}
                            onKeyDown={(event) => {
                              if (event.target !== event.currentTarget) return;
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                navigate(`/admin/employer-verification/${item._id}`);
                              }
                            }}
                            className="cursor-pointer transition-colors hover:bg-[#2e66a6]/10 focus:bg-[#2e66a6]/10 focus:outline-none"
                          >
                            <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700">
                              {formatDate(item.createdAt)}
                            </td>

                            <td className="px-4 py-4">
                              <div className="flex items-center gap-3 min-w-0">
                                <img
                                  src={item.companyLogo || "/images/default-company.svg"}
                                  alt={companyName}
                                  className="h-11 w-11 rounded-xl object-cover border border-gray-200 bg-white"
                                  onError={(e) => {
                                    e.currentTarget.onerror = null;
                                    e.currentTarget.src = "/images/default-company.svg";
                                  }}
                                />

                                <div className="min-w-0">
                                  <div className="text-sm font-semibold text-gray-900 leading-5 truncate">{contactName}</div>
                                  <div className="text-xs text-gray-500 truncate">{companyEmail}</div>
                                </div>
                              </div>
                            </td>

                            <td className="px-4 py-4 text-sm text-gray-700">
                              <div className="truncate whitespace-nowrap" title={companyName}>{companyName}</div>
                            </td>

                            <td className="px-4 py-4 text-sm text-gray-700">
                              <div className="truncate whitespace-nowrap" title={industry}>{industry}</div>
                            </td>

                            <td className="px-4 py-4">{statusBadge(status)}</td>
                            {archiveMode ? (
                              <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700">
                                {formatDate(item.rejectedAt)}
                              </td>
                            ) : null}
                            <td className="px-4 py-4">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  leftIcon={<Icon name="eye" className="h-4 w-4" />}
                                  onClick={() => navigate(`/admin/employer-verification/${item._id}${archiveMode ? "?archived=1" : ""}`)}
                                  title="View"
                                >
                                
                                </Button>
                                {archiveMode ? (
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    leftIcon={<Icon name="restore" className="h-4 w-4" />}
                                    onClick={() => setRestoreTarget(item)}
                                    disabled={restoringId === item._id}
                                    title="Restore"
                                    aria-label={`Restore ${companyName}`}
                                  />
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="space-y-3 p-4 lg:hidden">
                  {mobileRows.map((item) => {
                    const companyName = item.companyName || item.employerProfile?.companyName || "No Company";
                    const companyEmail = item.businessEmail || item.email || "—";
                    const industry = item.industry || item.employerProfile?.industry || "—";
                    const { region, cityProvince } = buildLocationDisplay(item);
                    const status = item.overallStatus || "unverified";

                    return (
                      <Card key={item._id} className="p-4">
                        <div className="flex items-start gap-3">
                          <img
                            src={item.companyLogo || "/images/default-company.svg"}
                            alt={companyName}
                            className="h-11 w-11 shrink-0 rounded-xl object-cover border border-gray-200 bg-white"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = "/images/default-company.svg";
                            }}
                          />

                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-semibold text-gray-900">{companyName}</div>
                            <div className="text-xs text-gray-500 truncate">{companyEmail}</div>

                            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-600">
                              <div>
                                <span className="font-semibold text-gray-800">Industry:</span> {industry}
                              </div>
                              <div>
                                <span className="font-semibold text-gray-800">Registered:</span> {formatDate(item.createdAt)}
                              </div>
                              <div className="min-w-0">
                                <span className="font-semibold text-gray-800">Region:</span>
                                <span className="ml-1 block truncate whitespace-nowrap" title={region}>{region}</span>
                              </div>
                              <div className="min-w-0">
                                <span className="font-semibold text-gray-800">City / Province:</span>
                                <span className="ml-1 block truncate whitespace-nowrap" title={cityProvince}>{cityProvince}</span>
                              </div>
                              <div className="col-span-2">{statusBadge(status)}</div>
                              {archiveMode ? (
                                <div className="col-span-2">
                                  <span className="font-semibold text-gray-800">Declined:</span> {formatDate(item.rejectedAt)}
                                </div>
                              ) : null}
                            </div>

                            <div className="mt-4 flex justify-end gap-2">
                              <IconButton label={`View ${companyName}`} onClick={() => navigate(`/admin/employer-verification/${item._id}`)}>
                                <Icon name="eye" className="h-4 w-4" />
                              </IconButton>

                              {archiveMode ? (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  leftIcon={<Icon name="restore" className="h-4 w-4" />}
                                  onClick={() => setRestoreTarget(item)}
                                  disabled={restoringId === item._id}
                                  title="Restore"
                                  aria-label={`Restore ${companyName}`}
                                />
                              ) : null}

                              {!archiveMode ? <IconButton
                                label={`Delete ${companyName}`}
                                onClick={() => setDeleteTarget(item)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Icon name="trash" className="h-4 w-4" />
                              </IconButton> : null}
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>

                <Pagination
                  currentPage={filters.page}
                  totalItems={pagination.totalItems}
                  pageSize={filters.limit}
                  onPageChange={(page) => onChangeFilter("page", page)}
                  onPageSizeChange={(limit) => onChangeFilter("limit", limit)}
                />
              </>
            )}
          </div>
        </Card>
      </div>

      <Modal
        open={!!deleteTarget}
        title="Delete employer?"
        description={
          deleteTarget
            ? `This will soft delete "${deleteTarget.companyName || deleteTarget.employerProfile?.companyName || deleteTarget.email}". The record will be marked as deleted.`
            : ""
        }
        onClose={() => {
          if (deleteLoading) return;
          setDeleteTarget(null);
        }}
      >
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-800">
          This action uses your existing delete user backend endpoint.
        </div>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={deleteLoading}>
            Cancel
          </Button>
          <Button variant="danger" loading={deleteLoading} onClick={onDeleteEmployer}>
            Confirm Delete
          </Button>
        </div>
      </Modal>

      <CustomDateRangeModal
        open={showCustomDateModal}
        startDate={filters.dateFrom}
        endDate={filters.dateTo}
        onCancel={() => setShowCustomDateModal(false)}
        onApply={applyCustomDateRange}
      />

      <RestoreConfirmationModal
        open={!!restoreTarget}
        name={restoreTarget?.companyName || restoreTarget?.employerProfile?.companyName || "this Employer"}
        loading={!!restoreTarget && restoringId === restoreTarget._id}
        onCancel={() => {
          if (restoringId) return;
          setRestoreTarget(null);
        }}
        onConfirm={() => restoreEmployer(restoreTarget)}
      />
    </AdminLayout>
  );
};

export default EmployerVerification;
