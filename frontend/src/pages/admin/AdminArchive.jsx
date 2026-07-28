import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../layouts/AdminLayout";
import api from "../../services/api";

const ITEMS_PER_PAGE = 10;
const PRIMARY = "#212C61";
const cn = (...classes) => classes.filter(Boolean).join(" ");

const TYPE_OPTIONS = [
  { value: "all", label: "All Type" },
  { value: "post", label: "Post" },
  { value: "comment", label: "Comment" },
  { value: "job-post", label: "Job Post" },
  { value: "declined-applicants", label: "Declined Applicants" },
  { value: "inactive-account", label: "Inactive Account" },
];

const formatDateInput = (date) => {
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return "";
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
};

const DATE_OPTIONS = [
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

const getPresetRange = (value) => {
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
  return date.toLocaleDateString("en-PH", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
};

const getDateOptionLabel = (value, startDate, endDate) => {
  if (value === "custom" && startDate && endDate) {
    return `${formatDateLabel(startDate)} - ${formatDateLabel(endDate)}`;
  }

  return DATE_OPTIONS.find((option) => option.value === value)?.label || "All Time";
};

const addCalendarMonths = (date, amount) => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + amount);
  return next;
};

const MONTH_NAMES = [
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

const getName = (entry = {}) =>
  entry?.displayName ||
  entry?.account?.fullName ||
  [
    entry?.account?.firstName,
    entry?.account?.middleName,
    entry?.account?.lastName,
    entry?.account?.extensionName,
  ]
    .filter(Boolean)
    .join(" ") ||
  entry?.account?.email ||
  "Archived account";

const getInitials = (name) => {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  return `${parts[0]?.[0] || "A"}${parts[1]?.[0] || ""}`.toUpperCase();
};

const API_ORIGIN = String(
  process.env.REACT_APP_API_URL || "https://phinmaau-job-portal-atlas.onrender.com/api"
).replace(/\/api\/?$/, "");

const resolveMediaUrl = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^(https?:|data:|blob:)/i.test(raw)) return raw;
  return `${API_ORIGIN}${raw.startsWith("/") ? raw : `/${raw}`}`;
};

const getAvatarUrl = (entry = {}) => {
  const account = entry.account || {};
  return resolveMediaUrl(
    account?.profileImage ||
      account?.jobSeekerProfile?.profileImage ||
      account?.employerProfile?.companyLogo ||
      account?.companyLogo ||
      ""
  );
};

const Icon = ({ name, className = "h-4 w-4" }) => {
  const common = {
    className,
    fill: "none",
    stroke: "currentColor",
    viewBox: "0 0 24 24",
    strokeWidth: 2,
  };

  const icons = {
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path strokeLinecap="round" d="m20 20-3.5-3.5" />
      </>
    ),
    eye: (
      <>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z"
        />
        <circle cx="12" cy="12" r="2.5" />
      </>
    ),
    calendar: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 3v3m12-3v3M4 9h16" />
        <rect x="4" y="5" width="16" height="16" rx="2" />
      </>
    ),
    chevron: <path strokeLinecap="round" strokeLinejoin="round" d="m8 10 4 4 4-4" />,
  };

  return <svg {...common}>{icons[name]}</svg>;
};

const typeBadgeStyles = {
  post: "bg-cyan-100 text-cyan-800",
  comment: "bg-green-100 text-green-800",
  "job-post": "bg-sky-100 text-sky-800",
  "declined-applicants": "bg-orange-100 text-orange-800",
  "inactive-account": "bg-rose-100 text-rose-700",
};

const ArchiveTypeBadges = ({ types = [] }) => (
  <div className="flex flex-wrap gap-2">
    {types.map((type) => (
      <span
        key={type.key}
        className={`inline-flex max-w-full items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
          typeBadgeStyles[type.key] || "bg-slate-100 text-slate-700"
        }`}
      >
        {type.label}
      </span>
    ))}
  </div>
);

const SelectField = ({ value, onChange, children, ariaLabel, icon }) => (
  <label className="relative block">
    <span className="sr-only">{ariaLabel}</span>
    <select
      value={value}
      onChange={onChange}
      className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 pr-9 text-sm font-medium text-slate-800 outline-none transition hover:border-slate-300 focus:border-[#212C61] focus:ring-2 focus:ring-[#212C61]/10"
    >
      {children}
    </select>
    {icon === "calendar" ? (
      <Icon
        name="calendar"
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
      />
    ) : (
      <Icon
        name="chevron"
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
      />
    )}
  </label>
);


const CalendarMonth = ({ monthDate, startDate, endDate, onPickDate, onChangeMonth }) => {
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
  const changeByMonth = (amount) => onChangeMonth(addCalendarMonths(monthDate, amount));
  const changeMonthSelect = (nextMonth) => onChangeMonth(new Date(year, Number(nextMonth), 1));
  const changeYearSelect = (nextYear) => onChangeMonth(new Date(Number(nextYear), month, 1));

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
            className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-center text-sm font-extrabold text-[#212C61] outline-none focus:border-[#212C61] focus:ring-2 focus:ring-[#212C61]/20"
            aria-label="Select month"
          >
            {MONTH_NAMES.map((name, index) => (
              <option key={name} value={index}>
                {name}
              </option>
            ))}
          </select>

          <select
            value={year}
            onChange={(event) => changeYearSelect(event.target.value)}
            className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-center text-sm font-extrabold text-[#212C61] outline-none focus:border-[#212C61] focus:ring-2 focus:ring-[#212C61]/20"
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
        {["SU", "MO", "TU", "WE", "TH", "FR", "SA"].map((day) => (
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
              key={value}
              onClick={() => onPickDate(value)}
              className={cn(
                "mx-auto flex h-9 w-full items-center justify-center transition",
                outside ? "text-slate-300" : "text-slate-700",
                ranged ? "bg-[#212C61]/10 text-[#212C61]" : "",
                selected
                  ? "rounded-lg bg-[#212C61] font-extrabold text-white shadow-md"
                  : "hover:bg-[#212C61]/10"
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
            <div className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
              Start Date
            </div>
            <div className="flex h-12 items-center gap-3 rounded-xl bg-slate-100 px-4 text-lg font-bold text-[#212C61]">
              <Icon name="calendar" className="h-5 w-5" /> {formatDateLabel(draftStart)}
            </div>
          </div>

          <div className="hidden pb-3 text-3xl text-slate-500 md:block">→</div>

          <div>
            <div className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
              End Date
            </div>
            <div className="flex h-12 items-center gap-3 rounded-xl bg-slate-100 px-4 text-lg font-bold text-[#212C61]">
              <Icon name="calendar" className="h-5 w-5" /> {formatDateLabel(draftEnd)}
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
          <button type="button" onClick={onCancel} className="text-base font-bold text-slate-600">
            Cancel
          </button>
          <button
            type="button"
            onClick={apply}
            disabled={!draftStart || !draftEnd}
            className="h-11 rounded-xl bg-[#212C61] px-8 text-base font-extrabold text-white shadow-lg shadow-[#212C61]/25 transition hover:bg-[#18204b] disabled:opacity-60"
          >
            Apply Range
          </button>
        </div>
      </div>
    </div>
  );
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
          setOpen((previous) => !previous);
        }}
        className={cn(
          "flex h-11 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-slate-50",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#212C61] focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60"
        )}
      >
        <span className="truncate">{getDateOptionLabel(value, startDate, endDate)}</span>
        <Icon name="calendar" className="h-4 w-4 text-slate-500" />
      </button>

      {open ? (
        <div
          onClick={(event) => event.stopPropagation()}
          className="absolute left-0 top-[52px] z-50 w-56 rounded-2xl border border-slate-100 bg-white p-2 shadow-xl ring-1 ring-black/5"
        >
          <div className="space-y-1">
            {DATE_OPTIONS.map((option) => (
              <button
                type="button"
                key={option.value}
                onClick={() => {
                  setOpen(false);
                  onSelect(option.value);
                }}
                className={cn(
                  "w-full rounded-xl px-3 py-2 text-left text-sm font-semibold transition",
                  value === option.value
                    ? "bg-[#212C61]/10 text-[#212C61]"
                    : "text-slate-600 hover:bg-slate-50"
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

const AdminArchive = () => {
  const navigate = useNavigate();
  const [archiveGroups, setArchiveGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showCustomDateModal, setShowCustomDateModal] = useState(false);
  const [filters, setFilters] = useState({
    search: "",
    role: "all",
    type: "all",
    date: "all",
    dateFrom: "",
    dateTo: "",
    sort: "newest",
  });

  const updateFilter = (key, value) => {
    setFilters((previous) => ({ ...previous, [key]: value }));
  };

  const handleDateFilterChange = (value) => {
    if (value === "custom") {
      setShowCustomDateModal(true);
      return;
    }

    const range = getPresetRange(value);
    setFilters((previous) => ({ ...previous, date: value, ...range }));
    setCurrentPage(1);
  };

  const applyCustomDateRange = (dateFrom, dateTo) => {
    setFilters((previous) => ({
      ...previous,
      date: "custom",
      dateFrom,
      dateTo,
    }));
    setShowCustomDateModal(false);
    setCurrentPage(1);
  };

  const loadArchive = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const response = await api.get("/admin/archive", {
        params: {
          q: filters.search,
          role: filters.role,
          type: filters.type,
          date: filters.date,
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
          sort: filters.sort,
        },
      });

      setArchiveGroups(response.data?.archiveGroups || []);
    } catch (error) {
      console.error("Failed to load admin archive:", error);
      setArchiveGroups([]);
      setErrorMessage(error?.response?.data?.message || "Failed to load archived records.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const timer = window.setTimeout(loadArchive, 250);
    return () => window.clearTimeout(timer);
  }, [loadArchive]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const pageCount = Math.max(1, Math.ceil(archiveGroups.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, pageCount);

  const paginatedGroups = useMemo(() => {
    const start = (safePage - 1) * ITEMS_PER_PAGE;
    return archiveGroups.slice(start, start + ITEMS_PER_PAGE);
  }, [archiveGroups, safePage]);

  return (
    <AdminLayout>
      <main className="mx-auto w-full max-w-[1280px] px-1 py-8">
        <header className="mb-5">
          <h1 className="text-2xl font-bold tracking-[-0.02em] text-black sm:text-3xl">Archived</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage archived jobseekers, employers, posts, comments, and inactive accounts.
          </p>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-[minmax(280px,1.8fr)_minmax(130px,0.65fr)_minmax(150px,0.75fr)_minmax(150px,0.75fr)_minmax(160px,0.8fr)]">
            <label className="relative block">
              <span className="sr-only">Search archived records</span>
              <Icon
                name="search"
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
              />
              <input
                type="search"
                value={filters.search}
                onChange={(event) => updateFilter("search", event.target.value)}
                placeholder="Search name, role, archived type..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-[#212C61] focus:ring-2 focus:ring-[#212C61]/10"
              />
            </label>

            <SelectField
              value={filters.role}
              onChange={(event) => updateFilter("role", event.target.value)}
              ariaLabel="Filter by role"
            >
              <option value="all">All Roles</option>
              <option value="jobseeker">Jobseeker</option>
              <option value="employer">Employer</option>
            </SelectField>

            <SelectField
              value={filters.type}
              onChange={(event) => updateFilter("type", event.target.value)}
              ariaLabel="Filter by archived type"
            >
              {TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectField>

            <DateFilterDropdown
              value={filters.date}
              startDate={filters.dateFrom}
              endDate={filters.dateTo}
              disabled={loading}
              onSelect={handleDateFilterChange}
            />

            <SelectField
              value={filters.sort}
              onChange={(event) => updateFilter("sort", event.target.value)}
              ariaLabel="Sort archived records"
            >
              <option value="newest">Sort By</option>
              <option value="newest">Most Recent Newest to Oldest</option>
              <option value="oldest">Oldest First</option>
              <option value="name_asc">A to Z</option>
              <option value="name_desc">Z to A</option>
            </SelectField>
          </div>

          <p className="mt-3 text-xs text-slate-500">
            Showing <span className="font-semibold text-slate-800">{archiveGroups.length}</span> result(s).
          </p>
        </section>

        <section className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <div className="min-w-[900px]">
              <div className="grid grid-cols-[1.45fr_0.7fr_1.4fr_0.8fr_0.65fr] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4 text-[11px] font-bold uppercase tracking-wide text-slate-600">
                <span>Name</span>
                <span>Role</span>
                <span>Archived Type</span>
                <span>Contact Number</span>
                <span>Actions</span>
              </div>

              {loading ? (
                <div className="flex min-h-[260px] items-center justify-center px-6 text-sm text-slate-500">
                  Loading archived records...
                </div>
              ) : errorMessage ? (
                <div className="flex min-h-[260px] items-center justify-center px-6 text-center text-sm font-medium text-red-600">
                  {errorMessage}
                </div>
              ) : paginatedGroups.length === 0 ? (
                <div className="flex min-h-[260px] items-center justify-center px-6 text-sm text-slate-500">
                  No archived records found.
                </div>
              ) : (
                paginatedGroups.map((entry) => {
                  const name = getName(entry);
                  const avatarUrl = getAvatarUrl(entry);

                  return (
                    <div
                      key={entry.accountId}
                      className="grid grid-cols-[1.45fr_0.7fr_1.4fr_0.8fr_0.65fr] items-center gap-4 border-b border-slate-200 px-5 py-3.5 last:border-b-0 hover:bg-slate-50/50"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-xs font-bold text-[#212C61]">
                          {avatarUrl ? (
                            <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
                          ) : (
                            getInitials(name)
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-black">{name}</p>
                          <p className="truncate text-[11px] text-slate-500">
                            {entry.secondaryText || entry.account?.email || "—"}
                          </p>
                        </div>
                      </div>

                      <div>
                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold capitalize text-black">
                          {entry.role || "—"}
                        </span>
                      </div>

                      <ArchiveTypeBadges types={entry.archivedTypes || []} />

                      <span className="text-sm text-slate-600">{entry.contactNumber || "—"}</span>

                      <div className="flex items-center">
                        <button
                          type="button"
                          onClick={() => navigate(`/admin/archive/account/${entry.accountId}`)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-[#212C61]/40 hover:bg-[#212C61]/5 hover:text-[#212C61] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#212C61]/20"
                          aria-label={`View archived records of ${name}`}
                          title="View archived records"
                        >
                          <Icon name="eye" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/40 px-5 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Showing {archiveGroups.length === 0 ? 0 : (safePage - 1) * ITEMS_PER_PAGE + 1} to{" "}
              {Math.min(safePage * ITEMS_PER_PAGE, archiveGroups.length)} of {archiveGroups.length} results
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                className="h-9 rounded-lg border border-slate-200 bg-white px-3 font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>
              <span
                className="flex h-9 min-w-9 items-center justify-center rounded-lg px-3 font-bold text-white"
                style={{ backgroundColor: PRIMARY }}
              >
                {safePage}
              </span>
              <button
                type="button"
                disabled={safePage >= pageCount}
                onClick={() => setCurrentPage((page) => Math.min(pageCount, page + 1))}
                className="h-9 rounded-lg border border-slate-200 bg-white px-3 font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </section>
      </main>

      <CustomDateRangeModal
        open={showCustomDateModal}
        startDate={filters.dateFrom}
        endDate={filters.dateTo}
        onCancel={() => setShowCustomDateModal(false)}
        onApply={applyCustomDateRange}
      />
    </AdminLayout>
  );
};

export default AdminArchive;
