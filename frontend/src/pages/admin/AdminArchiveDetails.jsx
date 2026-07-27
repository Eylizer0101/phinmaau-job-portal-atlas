import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AdminLayout from "../../layouts/AdminLayout";
import api from "../../services/api";

const ITEMS_PER_PAGE = 10;

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

const getName = (user = {}) =>
  user?.employerProfile?.companyName ||
  user?.companyName ||
  user?.fullName ||
  [user?.firstName, user?.middleName, user?.lastName].filter(Boolean).join(" ") ||
  user?.email ||
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

const normalizeUrl = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
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
    arrowLeft: <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5m6-6-6 6 6 6" />,
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
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path strokeLinecap="round" d="m20 20-3.5-3.5" />
      </>
    ),
    close: <path strokeLinecap="round" strokeLinejoin="round" d="m6 6 12 12M18 6 6 18" />,
    building: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 21V4h14v17M3 21h18" />
        <path strokeLinecap="round" d="M9 8h2m2 0h2M9 12h2m2 0h2M9 16h2m2 0h2" />
      </>
    ),
    location: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s7-6 7-12a7 7 0 1 0-14 0c0 6 7 12 7 12z" />
        <circle cx="12" cy="9" r="2" />
      </>
    ),
    calendar: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 3v3m12-3v3M4 9h16" />
        <rect x="4" y="5" width="16" height="16" rx="2" />
      </>
    ),
    chevron: <path strokeLinecap="round" strokeLinejoin="round" d="m8 10 4 4 4-4" />,
    users: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 20a6 6 0 0 1 12 0M16 5a3 3 0 0 1 0 6m1 3a5 5 0 0 1 4 5" />
      </>
    ),
    link: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 13a5 5 0 0 0 7.07 0l2.12-2.12a5 5 0 0 0-7.07-7.07L10.7 5.22" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M14 11a5 5 0 0 0-7.07 0l-2.12 2.12a5 5 0 0 0 7.07 7.07l1.42-1.41" />
      </>
    ),
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

const TypeBadge = ({ type, label }) => (
  <span
    className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
      typeBadgeStyles[type] || "bg-slate-100 text-slate-700"
    }`}
  >
    {label}
  </span>
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
    <Icon
      name={icon === "calendar" ? "calendar" : "chevron"}
      className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
    />
  </label>
);

const CommunityContentModal = ({ record, onClose }) => {
  if (!record) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4 py-8 backdrop-blur-sm">
      <div className="max-h-full w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-black">
              {record.archiveType === "post" ? "Archived Post" : "Archived Comment"}
            </h2>
            <p className="mt-1 text-xs text-slate-500">Archived on {formatDate(record.archivedAt)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
            aria-label="Close archived content"
          >
            <Icon name="close" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              {record.archiveType === "post" ? "Post content" : "Comment content"}
            </p>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-900">
              {record.content || "No content available."}
            </p>
          </div>

          {record.archiveType === "comment" && record.postContent ? (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Original post</p>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
                {record.postContent}
              </p>
            </div>
          ) : null}

          {record.imageUrl ? (
            <img
              src={resolveMediaUrl(record.imageUrl)}
              alt="Archived post attachment"
              className="max-h-[360px] w-full rounded-xl border border-slate-200 object-contain"
            />
          ) : null}

          {record.linkUrl ? (
            <a
              href={normalizeUrl(record.linkUrl)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 break-all text-sm font-semibold text-[#212C61] hover:underline"
            >
              <Icon name="link" />
              {record.linkUrl}
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
};

const DeclinedApplicantsModal = ({ record, onClose, onViewApplicant }) => {
  if (!record) return null;
  const applicants = Array.isArray(record.applicants) ? record.applicants : [];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4 py-8 backdrop-blur-sm">
      <div className="max-h-full w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-black">Declined Applicants · {record.title}</h2>
            <p className="mt-1 text-xs text-slate-500">{record.companyName || "Archived employer"}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
            aria-label="Close declined applicants"
          >
            <Icon name="close" />
          </button>
        </div>

        <div className="p-5">
          <div className="mb-3 flex items-center gap-2 text-sm text-slate-600">
            <Icon name="users" />
            <span>
              {applicants.length} applicant{applicants.length === 1 ? "" : "s"} declined for{" "}
              <strong className="text-black">{record.title}</strong>
            </span>
          </div>

          {applicants.length === 0 ? (
            <div className="flex min-h-[150px] items-center justify-center rounded-xl border border-slate-200 text-sm text-slate-500">
              No archived declined applicants found.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <div className="min-w-[700px]">
                <div className="grid grid-cols-[1.2fr_1fr_1fr_0.8fr_0.65fr] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  <span>Applicant</span>
                  <span>Job Title Applied</span>
                  <span>Decline Stage</span>
                  <span>Declined On</span>
                  <span>Actions</span>
                </div>

                {applicants.map((applicant) => (
                  <div
                    key={applicant.applicationId || applicant._id}
                    className="grid grid-cols-[1.2fr_1fr_1fr_0.8fr_0.65fr] items-center gap-3 border-b border-slate-100 px-4 py-3 text-xs last:border-b-0"
                  >
                    <div>
                      <p className="font-semibold text-black">{applicant.applicantName || "Applicant"}</p>
                      <p className="mt-0.5 truncate text-[11px] text-slate-500">{applicant.email || "—"}</p>
                    </div>
                    <span className="text-slate-600">{applicant.jobTitle || record.title}</span>
                    <span>
                      <span className="inline-flex rounded-full bg-rose-100 px-2 py-1 text-[10px] font-semibold text-rose-700">
                        {applicant.declinedStage || "Application Review"}
                      </span>
                    </span>
                    <span className="text-slate-500">{formatDate(applicant.declinedAt)}</span>
                    <button
                      type="button"
                      onClick={() => onViewApplicant(applicant)}
                      className="inline-flex h-8 w-fit items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 font-semibold text-slate-700 hover:border-[#212C61]/40 hover:text-[#212C61]"
                    >
                      <Icon name="eye" className="h-3.5 w-3.5" />
                      View
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="mt-3 text-xs text-slate-500">Archived on {formatDate(record.archivedAt)}</p>
        </div>
      </div>
    </div>
  );
};

const AdminArchiveDetails = () => {
  const navigate = useNavigate();
  const { type, id } = useParams();

  const [account, setAccount] = useState(null);
  const [summary, setSummary] = useState({});
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [communityModalRecord, setCommunityModalRecord] = useState(null);
  const [declinedModalRecord, setDeclinedModalRecord] = useState(null);
  const [filters, setFilters] = useState({
    search: "",
    type: "all",
    title: "all",
    date: "all",
    dateFrom: "",
    dateTo: "",
    sort: "recent",
  });

  const loadDetails = useCallback(async () => {
    if (type !== "account") {
      setErrorMessage("Unsupported archive detail type.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const response = await api.get(`/admin/archive/account/${id}`);
      setAccount(response.data?.account || null);
      setSummary(response.data?.summary || {});
      setRecords(response.data?.records || []);
    } catch (error) {
      console.error("Failed to load archive details:", error);
      setAccount(null);
      setSummary({});
      setRecords([]);
      setErrorMessage(error?.response?.data?.message || "Failed to load archived account details.");
    } finally {
      setLoading(false);
    }
  }, [id, type]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  const updateFilter = (key, value) => {
    if (key === "date") {
      const range = getPresetRange(value);
      setFilters((previous) => ({ ...previous, date: value, ...range }));
      return;
    }

    setFilters((previous) => ({ ...previous, [key]: value }));
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const jobTitles = useMemo(
    () =>
      [
        ...new Set(
          records
            .filter((record) =>
              ["job-post", "declined-applicants"].includes(record.archiveType)
            )
            .map((record) => String(record.title || "").trim())
            .filter(Boolean)
        ),
      ].sort((a, b) => a.localeCompare(b)),
    [records]
  );

  const visibleRecords = useMemo(() => {
    const query = filters.search.trim().toLowerCase();
    const from = filters.dateFrom ? new Date(`${filters.dateFrom}T00:00:00`) : null;
    const to = filters.dateTo ? new Date(`${filters.dateTo}T23:59:59.999`) : null;

    const filtered = records.filter((record) => {
      if (filters.type !== "all" && record.archiveType !== filters.type) return false;
      if (filters.title !== "all" && record.title !== filters.title) return false;

      if (query) {
        const searchable = [
          record.typeLabel,
          record.title,
          record.content,
          record.postContent,
          ...(Array.isArray(record.applicants)
            ? record.applicants.flatMap((applicant) => [
                applicant.applicantName,
                applicant.email,
                applicant.declinedStage,
              ])
            : []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!searchable.includes(query)) return false;
      }

      if (filters.date !== "all") {
        const archivedAt = new Date(record.archivedAt || 0);
        if (Number.isNaN(archivedAt.getTime())) return false;
        if (from && archivedAt < from) return false;
        if (to && archivedAt > to) return false;
      }

      return true;
    });

    return [...filtered].sort((first, second) => {
      if (filters.sort === "oldest") {
        return new Date(first.archivedAt || 0) - new Date(second.archivedAt || 0);
      }
      if (filters.sort === "title-asc") return String(first.title || "").localeCompare(String(second.title || ""));
      if (filters.sort === "title-desc") return String(second.title || "").localeCompare(String(first.title || ""));
      return new Date(second.archivedAt || 0) - new Date(first.archivedAt || 0);
    });
  }, [filters, records]);

  const pageCount = Math.max(1, Math.ceil(visibleRecords.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, pageCount);
  const paginatedRecords = useMemo(() => {
    const start = (safePage - 1) * ITEMS_PER_PAGE;
    return visibleRecords.slice(start, start + ITEMS_PER_PAGE);
  }, [safePage, visibleRecords]);

  const handleViewRecord = (record) => {
    if (record.archiveType === "job-post" && record.jobId) {
      navigate(`/admin/jobs/${record.jobId}?archive=1`, {
        state: {
          isArchivedView: true,
          backPath: `/admin/archive/account/${id}`,
          backLabel: "Archive Details",
        },
      });
      return;
    }

    if (record.archiveType === "declined-applicants") {
      setDeclinedModalRecord(record);
      return;
    }

    if (record.archiveType === "post" || record.archiveType === "comment") {
      setCommunityModalRecord(record);
      return;
    }

    if (record.archiveType === "inactive-account") {
      navigate(`/admin/users/${id}?archive=1`, {
        state: {
          fromArchive: true,
          archiveBackPath: `/admin/archive/account/${id}`,
          archivedAt: record.archivedAt,
          lastActive: summary.lastActive,
          inactivityDays: summary.inactivityDays,
        },
      });
    }
  };

  const accountName = getName(account || {});
  const avatarUrl = resolveMediaUrl(
    account?.employerProfile?.companyLogo ||
      account?.companyLogo ||
      account?.profileImage ||
      account?.jobSeekerProfile?.profileImage ||
      ""
  );

  return (
    <AdminLayout>
      <main className="mx-auto w-full max-w-[1180px] px-1 py-8">
        <header className="mb-5 flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={() => navigate("/admin/archive")}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-black shadow-sm hover:bg-slate-50"
          >
            <Icon name="arrowLeft" />
            Back
          </button>

          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-fuchsia-200 text-sm font-bold text-[#212C61]">
            {avatarUrl ? <img src={avatarUrl} alt={accountName} className="h-full w-full object-cover" /> : getInitials(accountName)}
          </div>

          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold text-black">{accountName}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <Icon name="building" className="h-3.5 w-3.5" />
                {summary.industryOrCourse || account?.role || "Archived account"}
              </span>
              {summary.location ? (
                <span className="inline-flex items-center gap-1.5">
                  <Icon name="location" className="h-3.5 w-3.5" />
                  {summary.location}
                </span>
              ) : null}
            </div>
          </div>
        </header>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-3 border-b border-slate-200 p-4 lg:grid-cols-[minmax(250px,1.5fr)_minmax(130px,0.7fr)_minmax(160px,0.9fr)_minmax(145px,0.75fr)_minmax(160px,0.8fr)]">
            <label className="relative block">
              <span className="sr-only">Search archived records</span>
              <Icon
                name="search"
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              />
              <input
                type="search"
                value={filters.search}
                onChange={(event) => updateFilter("search", event.target.value)}
                placeholder="Search job title or content..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#212C61] focus:ring-2 focus:ring-[#212C61]/10"
              />
            </label>

            <SelectField
              value={filters.type}
              onChange={(event) => updateFilter("type", event.target.value)}
              ariaLabel="Filter by archived type"
            >
              <option value="all">All Type</option>
              <option value="post">Post</option>
              <option value="comment">Comment</option>
              <option value="job-post">Job Post</option>
              <option value="declined-applicants">Declined Applicants</option>
              <option value="inactive-account">Inactive Account</option>
            </SelectField>

            <SelectField
              value={filters.title}
              onChange={(event) => updateFilter("title", event.target.value)}
              ariaLabel="Filter by job title"
            >
              <option value="all">All Job Title</option>
              {jobTitles.map((title) => (
                <option key={title} value={title}>
                  {title}
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
              ariaLabel="Sort archived details"
            >
              <option value="recent">Sort By: Recent</option>
              <option value="oldest">Sort By: Oldest</option>
              <option value="title-asc">Sort By: Title A-Z</option>
              <option value="title-desc">Sort By: Title Z-A</option>
            </SelectField>
          </div>

          {filters.date === "custom" ? (
            <div className="grid gap-3 border-b border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
              <label className="text-xs font-semibold text-slate-600">
                Start date
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(event) => updateFilter("dateFrom", event.target.value)}
                  className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#212C61]"
                />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                End date
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(event) => updateFilter("dateTo", event.target.value)}
                  className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#212C61]"
                />
              </label>
            </div>
          ) : null}

          <div className="overflow-x-auto">
            <div className="min-w-[760px]">
              <div className="grid grid-cols-[0.8fr_1.65fr_0.9fr_0.65fr] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4 text-[11px] font-bold uppercase tracking-wide text-slate-600">
                <span>Type</span>
                <span>Job Title</span>
                <span>Archived Date</span>
                <span>Actions</span>
              </div>

              {loading ? (
                <div className="flex min-h-[230px] items-center justify-center text-sm text-slate-500">
                  Loading archived account details...
                </div>
              ) : errorMessage ? (
                <div className="flex min-h-[230px] items-center justify-center px-6 text-center text-sm text-red-600">
                  {errorMessage}
                </div>
              ) : paginatedRecords.length === 0 ? (
                <div className="flex min-h-[230px] items-center justify-center text-sm text-slate-500">
                  No archived records found for this account.
                </div>
              ) : (
                paginatedRecords.map((record) => (
                  <div
                    key={record.recordId}
                    className="grid grid-cols-[0.8fr_1.65fr_0.9fr_0.65fr] items-center gap-4 border-b border-slate-200 px-5 py-4 last:border-b-0 hover:bg-slate-50/50"
                  >
                    <div>
                      <TypeBadge type={record.archiveType} label={record.typeLabel} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-black">
                        {record.title || "Archived record"}
                      </p>
                      {record.subtitle ? (
                        <p className="mt-1 truncate text-[11px] text-slate-500">{record.subtitle}</p>
                      ) : null}
                    </div>
                    <span className="text-sm text-slate-600">{formatDate(record.archivedAt)}</span>
                    <button
                      type="button"
                      onClick={() => handleViewRecord(record)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-[#212C61]/40 hover:bg-[#212C61]/5 hover:text-[#212C61]"
                      aria-label={`View ${record.typeLabel}`}
                      title={`View ${record.typeLabel}`}
                    >
                      <Icon name="eye" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/40 px-5 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Showing {visibleRecords.length === 0 ? 0 : (safePage - 1) * ITEMS_PER_PAGE + 1} to{" "}
              {Math.min(safePage * ITEMS_PER_PAGE, visibleRecords.length)} of {visibleRecords.length} results
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                className="h-9 rounded-lg border border-slate-200 bg-white px-3 font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>
              <span className="flex h-9 min-w-9 items-center justify-center rounded-lg bg-[#212C61] px-3 font-bold text-white">
                {safePage}
              </span>
              <button
                type="button"
                disabled={safePage >= pageCount}
                onClick={() => setCurrentPage((page) => Math.min(pageCount, page + 1))}
                className="h-9 rounded-lg border border-slate-200 bg-white px-3 font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </section>
      </main>

      <CommunityContentModal record={communityModalRecord} onClose={() => setCommunityModalRecord(null)} />
      <DeclinedApplicantsModal
        record={declinedModalRecord}
        onClose={() => setDeclinedModalRecord(null)}
        onViewApplicant={(applicant) => {
          const applicationId = applicant.applicationId || applicant._id;
          if (!applicationId) return;
          navigate(`/admin/applications/${applicationId}`);
        }}
      />
    </AdminLayout>
  );
};

export default AdminArchiveDetails;
