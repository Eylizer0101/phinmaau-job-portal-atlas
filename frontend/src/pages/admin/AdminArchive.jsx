import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../layouts/AdminLayout";
import api from "../../services/api";

const ITEMS_PER_PAGE = 10;
const PRIMARY = "#212C61";

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

const getPresetRange = (value) => {
  const now = new Date();
  const end = formatDateInput(now);

  if (value === "today") return { dateFrom: end, dateTo: end };

  if (value === "7days") {
    const start = new Date(now);
    start.setDate(start.getDate() - 6);
    return { dateFrom: formatDateInput(start), dateTo: end };
  }

  if (value === "30days") {
    const start = new Date(now);
    start.setDate(start.getDate() - 29);
    return { dateFrom: formatDateInput(start), dateTo: end };
  }

  if (value === "thisMonth") {
    return {
      dateFrom: formatDateInput(new Date(now.getFullYear(), now.getMonth(), 1)),
      dateTo: end,
    };
  }

  return { dateFrom: "", dateTo: "" };
};

const getName = (entry = {}) =>
  entry?.displayName ||
  entry?.account?.employerProfile?.companyName ||
  entry?.account?.companyName ||
  entry?.account?.fullName ||
  [entry?.account?.firstName, entry?.account?.middleName, entry?.account?.lastName]
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
    account?.employerProfile?.companyLogo ||
      account?.companyLogo ||
      account?.profileImage ||
      account?.jobSeekerProfile?.profileImage ||
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

const AdminArchive = () => {
  const navigate = useNavigate();
  const [archiveGroups, setArchiveGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    search: "",
    role: "all",
    type: "all",
    date: "all",
    dateFrom: "",
    dateTo: "",
    sort: "recent",
  });

  const updateFilter = (key, value) => {
    if (key === "date") {
      const range = getPresetRange(value);
      setFilters((previous) => ({ ...previous, date: value, ...range }));
      return;
    }

    setFilters((previous) => ({ ...previous, [key]: value }));
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

            <SelectField
              value={filters.date}
              onChange={(event) => updateFilter("date", event.target.value)}
              ariaLabel="Filter by archived date"
              icon="calendar"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="thisMonth">This Month</option>
              <option value="custom">Custom Range</option>
            </SelectField>

            <SelectField
              value={filters.sort}
              onChange={(event) => updateFilter("sort", event.target.value)}
              ariaLabel="Sort archived records"
            >
              <option value="recent">Sort By: Recent</option>
              <option value="oldest">Sort By: Oldest</option>
              <option value="name-asc">Sort By: Name A-Z</option>
              <option value="name-desc">Sort By: Name Z-A</option>
            </SelectField>
          </div>

          {filters.date === "custom" ? (
            <div className="mt-3 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2">
              <label className="text-xs font-semibold text-slate-600">
                Start date
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(event) => updateFilter("dateFrom", event.target.value)}
                  className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#212C61] focus:ring-2 focus:ring-[#212C61]/10"
                />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                End date
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(event) => updateFilter("dateTo", event.target.value)}
                  className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#212C61] focus:ring-2 focus:ring-[#212C61]/10"
                />
              </label>
            </div>
          ) : null}

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
                <span>Date Archived</span>
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

                      <span className="text-sm text-slate-600">{formatDate(entry.latestArchivedAt)}</span>

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
    </AdminLayout>
  );
};

export default AdminArchive;
