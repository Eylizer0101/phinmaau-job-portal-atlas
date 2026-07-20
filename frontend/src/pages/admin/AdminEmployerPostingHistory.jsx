import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AdminLayout from "../../layouts/AdminLayout";
import api from "../../services/api";

const cn = (...classes) => classes.filter(Boolean).join(" ");

const Icon = ({ name, className = "h-5 w-5" }) => {
  const common = {
    className,
    fill: "none",
    stroke: "currentColor",
    viewBox: "0 0 24 24",
    strokeWidth: 2,
  };

  if (name === "arrowLeft") {
    return (
      <svg {...common}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
    );
  }

  if (name === "search") {
    return (
      <svg {...common}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.3-4.3m1.3-5.2a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    );
  }

  if (name === "eye") {
    return (
      <svg {...common}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    );
  }

  if (name === "calendar") {
    return (
      <svg {...common}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3M5 11h14M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    );
  }

  if (name === "x") {
    return (
      <svg {...common}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    );
  }

  return null;
};

const PAGE_SIZE = 9;

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const getJobStatus = (job) => {
  const storedStatus = String(job?.status || "").trim().toLowerCase();
  const deadline = new Date(
    job?.applicationDeadline || job?.validUntil || job?.deadline || ""
  );
  const isExpired =
    !Number.isNaN(deadline.getTime()) && deadline.getTime() < Date.now();

  if (job?.isArchived) return "archived";
  if (storedStatus === "filled") return "filled";
  if (storedStatus === "closed") return "closed";
  if (isExpired) return "expired";
  if (
    storedStatus === "draft" ||
    job?.isPublished === false ||
    job?.isActive === false
  ) {
    return "draft";
  }

  return "open";
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

const StatusBadge = ({ status }) => {
  const classes = {
    open: "border-blue-200 bg-blue-50 text-[#2e66a6]",
    draft: "border-gray-200 bg-gray-100 text-gray-600",
    closed: "border-slate-200 bg-slate-100 text-slate-600",
    filled: "border-emerald-200 bg-emerald-50 text-emerald-700",
    expired: "border-amber-200 bg-amber-50 text-amber-700",
    archived: "border-violet-200 bg-violet-50 text-violet-700",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize ${
        classes[status] || classes.draft
      }`}
    >
      {status}
    </span>
  );
};

const AdminEmployerPostingHistory = () => {
  const { userId } = useParams();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [jobTitle, setJobTitle] = useState("all");
  const [status, setStatus] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const fetchPostingHistory = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get(`/admin/users/${userId}`);

        if (!response.data?.success) {
          setError("Unable to load employer posting history.");
          return;
        }

        setUser(response.data.user || null);
        setJobs(
          Array.isArray(response.data.jobPosts) ? response.data.jobPosts : []
        );
      } catch (requestError) {
        console.error("Error loading employer posting history:", requestError);
        setError(
          requestError.response?.data?.message ||
            "Unable to load employer posting history."
        );
      } finally {
        setLoading(false);
      }
    };

    if (userId) fetchPostingHistory();
  }, [userId]);

  useEffect(() => {
    setPage(1);
  }, [search, jobTitle, status, dateFilter, dateFrom, dateTo, sortBy]);

  const companyName =
    user?.employerProfile?.companyName ||
    user?.fullName ||
    "Employer";

  const hasActiveFilters =
    search.trim() !== "" ||
    jobTitle !== "all" ||
    status !== "all" ||
    dateFilter !== "all" ||
    sortBy !== "newest";

  const clearFilters = () => {
    setSearch("");
    setJobTitle("all");
    setStatus("all");
    setDateFilter("all");
    setDateFrom("");
    setDateTo("");
    setSortBy("newest");
    setPage(1);
  };

  const titleOptions = useMemo(() => {
    return [...new Set(
      jobs
        .map((job) =>
          String(job?.title || job?.jobTitle || "").trim()
        )
        .filter(Boolean)
    )].sort((a, b) => a.localeCompare(b));
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    const query = search.trim().toLowerCase();

    const list = jobs.filter((job) => {
      const title = String(job?.title || job?.jobTitle || "").trim();
      const company = String(job?.companyName || companyName).trim();
      const location = String(job?.location || "").trim();
      const jobStatus = getJobStatus(job);

      const matchesSearch =
        !query ||
        title.toLowerCase().includes(query) ||
        company.toLowerCase().includes(query) ||
        location.toLowerCase().includes(query) ||
        jobStatus.includes(query);

      const matchesTitle = jobTitle === "all" || title === jobTitle;
      const matchesStatus = status === "all" || jobStatus === status;

      const matchesDate = isDateInRange(
        job?.createdAt,
        dateFrom,
        dateTo
      );

      return (
        matchesSearch &&
        matchesTitle &&
        matchesStatus &&
        matchesDate
      );
    });

    return [...list].sort((a, b) => {
      if (sortBy === "oldest") {
        return new Date(a?.createdAt || 0) - new Date(b?.createdAt || 0);
      }

      if (sortBy === "titleAsc") {
        return String(a?.title || a?.jobTitle || "").localeCompare(
          String(b?.title || b?.jobTitle || "")
        );
      }

      if (sortBy === "titleDesc") {
        return String(b?.title || b?.jobTitle || "").localeCompare(
          String(a?.title || a?.jobTitle || "")
        );
      }

      if (sortBy === "mostApplicants") {
        return (
          Number(b?.applicantCount || 0) -
          Number(a?.applicantCount || 0)
        );
      }

      return new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0);
    });
  }, [jobs, search, jobTitle, status, dateFrom, dateTo, sortBy, companyName]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredJobs.length / PAGE_SIZE)
  );

  const currentPage = Math.min(page, totalPages);
  const paginatedJobs = filteredJobs.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const startResult =
    filteredJobs.length === 0
      ? 0
      : (currentPage - 1) * PAGE_SIZE + 1;
  const endResult = Math.min(
    currentPage * PAGE_SIZE,
    filteredJobs.length
  );

  if (loading) {
    return (
      <AdminLayout>
        <div className="min-h-screen bg-[#f7f9fc] py-8">
          <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-gray-200 bg-white">
            <div className="text-center">
              <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-gray-200 border-t-[#2e66a6]" />
              <p className="mt-4 text-sm text-gray-500">
                Loading posting history...
              </p>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="min-h-screen bg-[#f7f9fc] py-8">
        <div className="space-y-6">
          <div>
            <button
              type="button"
              onClick={() => navigate(`/admin/users/${userId}`)}
              className="inline-flex items-center gap-2 rounded-xl border border-[#d8e2ee] bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:border-[#2e66a6]/40 hover:bg-[#f7faff] hover:text-[#2e66a6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6]"
            >
              <Icon name="arrowLeft" className="h-4 w-4" />
              Back to Employer Profile
            </button>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-3xl font-bold text-black">
                  Posting History
                </h1>
                <p className="mt-1 text-sm text-black/55">
                  View all job postings of {companyName}.
                </p>
              </div>

              <span className="w-fit rounded-full bg-[#edf4fb] px-3 py-1.5 text-xs font-bold text-[#2e66a6]">
                {jobs.length} total
              </span>
            </div>
          </div>

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
              {error}
            </div>
          ) : (
            <>
              <section className="rounded-2xl border border-[#dfe5ec] bg-white p-5 shadow-sm">
                <div className={`grid gap-3 ${hasActiveFilters ? "lg:grid-cols-[1.7fr_1fr_0.9fr_1fr_1fr_auto]" : "lg:grid-cols-[1.7fr_1fr_0.9fr_1fr_1fr]"}`}>
                  <label className="relative block">
                    <span className="sr-only">Search jobs</span>
                    <Icon
                      name="search"
                      className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="search"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search job title, company, location, status."
                      className="h-12 w-full rounded-xl border border-gray-300 bg-white pl-11 pr-4 text-sm text-black outline-none transition placeholder:text-gray-400 focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/15"
                    />
                  </label>

                  <select
                    value={jobTitle}
                    onChange={(event) => setJobTitle(event.target.value)}
                    className="h-12 rounded-xl border border-gray-300 bg-white px-4 text-sm font-medium text-black outline-none transition focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/15"
                  >
                    <option value="all">All Job Title</option>
                    {titleOptions.map((title) => (
                      <option key={title} value={title}>
                        {title}
                      </option>
                    ))}
                  </select>

                  <select
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                    className="h-12 rounded-xl border border-gray-300 bg-white px-4 text-sm font-medium text-black outline-none transition focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/15"
                  >
                    <option value="all">All Status</option>
                    <option value="open">Open</option>
                    <option value="draft">Draft</option>
                    <option value="filled">Filled</option>
                    <option value="closed">Closed</option>
                    <option value="expired">Expired</option>
                    <option value="archived">Archived</option>
                  </select>

                  <DateFilterDropdown
                    value={dateFilter}
                    dateFrom={dateFrom}
                    dateTo={dateTo}
                    onChange={({ date, dateFrom: nextFrom, dateTo: nextTo }) => {
                      setDateFilter(date);
                      setDateFrom(nextFrom);
                      setDateTo(nextTo);
                    }}
                  />

                  <select
                    value={sortBy}
                    onChange={(event) => setSortBy(event.target.value)}
                    className="h-12 rounded-xl border border-gray-300 bg-white px-4 text-sm font-medium text-black outline-none transition focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/15"
                  >
                    <option value="newest">Sort By</option>
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="titleAsc">Job Title A–Z</option>
                    <option value="titleDesc">Job Title Z–A</option>
                    <option value="mostApplicants">Most Applicants</option>
                  </select>

                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 text-sm font-bold text-red-600 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
                    >
                      <Icon name="x" className="h-4 w-4" />
                      Clear
                    </button>
                  )}
                </div>

              
              </section>

              <section className="overflow-hidden rounded-2xl border border-[#dfe5ec] bg-white p-5 shadow-sm">
                <div className="overflow-x-auto">
                  <table className="min-w-[980px] w-full text-left text-sm">
                    <thead className="border-y border-[#e5e7eb] bg-[#f8fafc] text-[11px] font-bold uppercase tracking-wider text-black/60">
                      <tr>
                        <th className="px-5 py-4">Date Posted</th>
                        <th className="px-5 py-4">Job Title</th>
                        <th className="px-5 py-4 text-center">Vacancy</th>
                        <th className="px-5 py-4 text-center">Applicant</th>
                        <th className="px-5 py-4">Status</th>
                        <th className="px-5 py-4">Valid Until</th>
                        <th className="px-5 py-4 text-center">Actions</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-[#e5e7eb]">
                      {paginatedJobs.length ? (
                        paginatedJobs.map((job) => {
                          const jobStatus = getJobStatus(job);

                          return (
                            <tr
                              key={job._id}
                              role="button"
                              tabIndex={0}
                              onClick={() =>
                                navigate(`/admin/jobs/${job._id}`, {
                                  state: {
                                    backPath: `/admin/users/${userId}/posting-history`,
                                    backLabel: "Back to Posting History",
                                  },
                                })
                              }
                              onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                  event.preventDefault();
                                  navigate(`/admin/jobs/${job._id}`, {
                                    state: {
                                      backPath: `/admin/users/${userId}/posting-history`,
                                      backLabel: "Back to Posting History",
                                    },
                                  });
                                }
                              }}
                              className="cursor-pointer transition hover:bg-[#f8fbff] focus-within:bg-[#f8fbff] focus:outline-none"
                            >
                              <td className="whitespace-nowrap px-5 py-5 font-medium text-black/75">
                                {formatDate(job?.createdAt)}
                              </td>

                              <td className="px-5 py-5">
                                <p className="max-w-[260px] truncate font-bold text-black">
                                  {job?.title ||
                                    job?.jobTitle ||
                                    "Untitled Job"}
                                </p>
                                <p className="mt-1 max-w-[260px] truncate text-xs text-black/50">
                                  {job?.companyName || companyName}
                                </p>
                              </td>

                              <td className="px-5 py-5 text-center font-semibold text-black">
                                {Number(job?.vacancies || 0)}
                              </td>

                              <td className="px-5 py-5 text-center font-semibold text-black">
                                {Number(
                                  job?.applicantCount ??
                                    job?.applicantsCount ??
                                    0
                                )}
                              </td>

                              <td className="px-5 py-5">
                                <StatusBadge status={jobStatus} />
                              </td>

                              <td className="whitespace-nowrap px-5 py-5 text-black/75">
                                {formatDate(
                                  job?.applicationDeadline ||
                                    job?.validUntil ||
                                    job?.deadline
                                )}
                              </td>

                              <td className="px-5 py-5 text-center">
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    navigate(`/admin/jobs/${job._id}`, {
                                      state: {
                                        backPath: `/admin/users/${userId}/posting-history`,
                                        backLabel: "Back to Posting History",
                                      },
                                    });
                                  }}
                                  className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#dfe5ec] bg-white text-black transition hover:border-[#2e66a6]/40 hover:bg-[#f7faff] hover:text-[#2e66a6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6]"
                                  title="View job"
                                  aria-label={`View ${
                                    job?.title ||
                                    job?.jobTitle ||
                                    "job"
                                  }`}
                                >
                                  <Icon name="eye" className="h-5 w-5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td
                            colSpan={7}
                            className="px-5 py-16 text-center text-sm text-black/45"
                          >
                            No job postings match the selected filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col gap-4 border-t border-[#e5e7eb] bg-[#fbfcfe] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-black/55">
                    Showing {startResult} to {endResult} of{" "}
                    {filteredJobs.length} result(s)
                  </p>

                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      disabled={currentPage === 1}
                      onClick={() =>
                        setPage((previous) =>
                          Math.max(1, previous - 1)
                        )
                      }
                      className="h-10 rounded-xl border border-[#dfe5ec] bg-white px-4 text-sm font-semibold text-black transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400"
                    >
                      Previous
                    </button>

                    <span className="inline-flex h-10 min-w-10 items-center justify-center rounded-xl bg-[#2e66a6] px-3 text-sm font-bold text-white">
                      {currentPage}
                    </span>

                    <button
                      type="button"
                      disabled={currentPage === totalPages}
                      onClick={() =>
                        setPage((previous) =>
                          Math.min(totalPages, previous + 1)
                        )
                      }
                      className="h-10 rounded-xl border border-[#dfe5ec] bg-white px-4 text-sm font-semibold text-black transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminEmployerPostingHistory;
