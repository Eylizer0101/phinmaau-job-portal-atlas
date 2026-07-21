import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
  "Community Member";

const getInitials = (name) => {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  return `${parts[0]?.[0] || "C"}${parts[1]?.[0] || ""}`.toUpperCase();
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
    archive: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M5 7l1 13h12l1-13M9 11h6" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 3h10l1 4H6l1-4z" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path strokeLinecap="round" d="m20 20-3.5-3.5" />
      </>
    ),
    eye: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z" />
        <circle cx="12" cy="12" r="2.5" />
      </>
    ),
    calendar: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 3v3m12-3v3M4 9h16M5 5h14a1 1 0 011-1v14H4V6a1 1 0 011-1z" />
      </>
    ),
    campus: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l9 5-9 5-9-5 9-5z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 10v6m14-6v6M3 20h18" />
      </>
    ),
    course: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 5h16v14H4z" />
        <path strokeLinecap="round" d="M8 9h8M8 13h6" />
      </>
    ),
    dormant: (
      <>
        <circle cx="12" cy="8" r="3" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 20a7 7 0 0114 0M18 4v4m-2-2h4" />
      </>
    ),
    building: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 21V4h14v17M3 21h18M9 8h2m2 0h2M9 12h2m2 0h2M9 16h2m2 0h2" />
      </>
    ),
  };

  return <svg {...common}>{icons[name]}</svg>;
};

const AdminArchive = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const initialTab = ["community", "dormant", "jobs"].includes(requestedTab) ? requestedTab : "community";

  const [activeTab, setActiveTab] = useState(initialTab);
  const [communityAuthors, setCommunityAuthors] = useState([]);
  const [dormantUsers, setDormantUsers] = useState([]);
  const [jobArchives, setJobArchives] = useState([]);
  const [options, setOptions] = useState({
    campuses: [],
    courses: [],
    dormantRoles: [],
    dormantIndustries: [],
    jobCompanies: [],
  });
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [filters, setFilters] = useState({
    search: "",
    type: "all",
    campus: "all",
    course: "all",
    role: "all",
    industry: "all",
    inactivity: "6-12",
    jobStatus: "all",
    company: "all",
    date: "all",
    dateFrom: "",
    dateTo: "",
  });

  const loadArchive = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const params =
        activeTab === "community"
          ? {
              tab: "community",
              q: filters.search,
              status: filters.type,
              campus: filters.campus,
              course: filters.course,
              date: filters.date,
              dateFrom: filters.dateFrom,
              dateTo: filters.dateTo,
            }
          : activeTab === "dormant"
            ? {
                tab: "dormant",
                q: filters.search,
                role: filters.role,
                industry: filters.industry,
                inactivity: filters.inactivity,
              }
            : {
                tab: "jobs",
                q: filters.search,
                status: filters.jobStatus,
                company: filters.company,
                date: filters.date,
                dateFrom: filters.dateFrom,
                dateTo: filters.dateTo,
              };

      const response = await api.get("/admin/archive", { params });

      if (activeTab === "community") {
        setCommunityAuthors(response.data?.communityAuthors || []);
      } else if (activeTab === "dormant") {
        setDormantUsers(response.data?.dormantUsers || []);
      } else {
        setJobArchives(response.data?.jobArchives || []);
      }

      setOptions((previous) => ({
        ...previous,
        ...(response.data?.options || {}),
      }));
    } catch (error) {
      console.error("Failed to load admin archive:", error);
      if (activeTab === "community") setCommunityAuthors([]);
      else if (activeTab === "dormant") setDormantUsers([]);
      else setJobArchives([]);
      setErrorMessage(error?.response?.data?.message || "Failed to load archive records.");
    } finally {
      setLoading(false);
    }
  }, [activeTab, filters]);

  useEffect(() => {
    const timer = setTimeout(loadArchive, 250);
    return () => clearTimeout(timer);
  }, [loadArchive]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, filters]);

  const changeTab = (tab) => {
    setActiveTab(tab);
    setSearchParams(tab === "community" ? {} : { tab });
  };

  const updateFilter = (key, value) => {
    if (key === "date") {
      const range = getPresetRange(value);
      setFilters((previous) => ({ ...previous, date: value, ...range }));
      return;
    }

    setFilters((previous) => ({ ...previous, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      search: "",
      type: "all",
      campus: "all",
      course: "all",
      role: "all",
      industry: "all",
      inactivity: "6-12",
      jobStatus: "all",
      company: "all",
      date: "all",
      dateFrom: "",
      dateTo: "",
    });
  };

  const hasActiveFilters =
    filters.search.trim() !== "" ||
    filters.type !== "all" ||
    filters.campus !== "all" ||
    filters.course !== "all" ||
    filters.role !== "all" ||
    filters.industry !== "all" ||
    filters.inactivity !== "6-12" ||
    filters.jobStatus !== "all" ||
    filters.company !== "all" ||
    filters.date !== "all";

  const activeItems = activeTab === "community" ? communityAuthors : activeTab === "dormant" ? dormantUsers : jobArchives;
  const pageCount = Math.max(1, Math.ceil(activeItems.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, pageCount);

  const paginatedItems = useMemo(() => {
    const start = (safePage - 1) * ITEMS_PER_PAGE;
    return activeItems.slice(start, start + ITEMS_PER_PAGE);
  }, [activeItems, safePage]);

  const openCommunityHistory = (authorId) => {
    navigate(`/admin/archive/community-author/${authorId}`);
  };

  const openDormantDetails = (userId) => {
    navigate(`/admin/archive/dormant-user/${userId}`);
  };

  const openJobDetails = (jobId) => {
    navigate(`/admin/archive/job/${jobId}`);
  };

  return (
    <AdminLayout>
      <main className="mx-auto w-full max-w-[1280px] px-2 py-5 sm:px-4 sm:py-6 lg:px-6">
        <header className="mb-5 flex items-center gap-3">
        
          <div>
            <h1 className="text-2xl font-bold tracking-[-0.02em] text-slate-950 sm:text-3xl">Archive</h1>
            <p className="mt-1 text-sm text-slate-500">
              Review archived records across the platform.
            </p>
          </div>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className={`grid gap-3 ${activeTab === "dormant" ? "lg:grid-cols-[minmax(0,1fr)_auto]" : "sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_180px_auto]"}`}>
            <label className="relative block">
              <span className="sr-only">Search archive records</span>
              <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={filters.search}
                onChange={(event) => updateFilter("search", event.target.value)}
                placeholder={
                  activeTab === "community"
                    ? "Search community records"
                    : activeTab === "dormant"
                    ? "Search dormant accounts"
                    : "Search jobs or applicants"
                }
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-[#2e66a6] focus:bg-white focus:ring-2 focus:ring-[#2e66a6]/15"
              />
            </label>

            {activeTab !== "dormant" ? (
              <label className="relative block">
                <span className="sr-only">Filter by archived date</span>
                <select
                  value={filters.date}
                  onChange={(event) => updateFilter("date", event.target.value)}
                  className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 pr-10 text-sm font-medium text-slate-700 outline-none transition hover:border-slate-300 focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/15"
                >
                  <option value="all">All time</option>
                  <option value="today">Today</option>
                  <option value="7days">Last 7 days</option>
                  <option value="30days">Last 30 days</option>
                  <option value="thisMonth">This month</option>
                  <option value="custom">Custom range</option>
                </select>
                <Icon name="calendar" className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              </label>
            ) : null}

            <button
              type="button"
              onClick={resetFilters}
              disabled={!hasActiveFilters}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-[#2e66a6]/40 hover:bg-[#2e66a6]/5 hover:text-[#2e66a6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6]/25 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Clear
            </button>
          </div>

          {activeTab !== "dormant" && filters.date === "custom" ? (
            <div className="mt-3 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2">
              <label className="text-xs font-semibold text-slate-600">
                Start date
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(event) => updateFilter("dateFrom", event.target.value)}
                  className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/10"
                />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                End date
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(event) => updateFilter("dateTo", event.target.value)}
                  className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/10"
                />
              </label>
            </div>
          ) : null}
        </section>

        <div
          className="mb-5 mt-4 flex w-full items-center gap-6 overflow-x-auto border-b border-slate-200 px-1"
          role="tablist"
          aria-label="Archive categories"
        >
          {[
            { id: "community", label: "Community" },
            { id: "dormant", label: "Dormant" },
            { id: "jobs", label: "Jobs" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => changeTab(tab.id)}
              className={`relative min-h-11 shrink-0 px-1 pb-3 pt-2 text-sm font-semibold outline-none transition-colors duration-200 focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-[#2e66a6]/25 ${
                activeTab === tab.id
                  ? "text-[#2e66a6] after:absolute after:bottom-[-1px] after:left-0 after:right-0 after:h-0.5 after:rounded-full after:bg-[#2e66a6]"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="p-4 sm:p-5">

            {activeTab === "community" ? (
              <>
                <div className="mb-4">
                  <h3 className="text-sm font-bold text-slate-950">Deleted community content</h3>
               
                </div>

                <div className="mb-4 grid gap-3 md:grid-cols-3">
                  <select
                    value={filters.type}
                    onChange={(event) => updateFilter("type", event.target.value)}
                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition hover:border-slate-300 focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/10"
                  >
                    <option value="all">All types</option>
                    <option value="post">Deleted posts</option>
                    <option value="comment">Deleted comments</option>
                  </select>

                  <select
                    value={filters.campus}
                    onChange={(event) => updateFilter("campus", event.target.value)}
                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition hover:border-slate-300 focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/10"
                  >
                    <option value="all">All campuses</option>
                    {(options.campuses || []).map((campus) => (
                      <option key={campus} value={campus}>{campus}</option>
                    ))}
                  </select>

                  <select
                    value={filters.course}
                    onChange={(event) => updateFilter("course", event.target.value)}
                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition hover:border-slate-300 focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/10"
                  >
                    <option value="all">All courses</option>
                    {(options.courses || []).map((course) => (
                      <option key={course} value={course}>{course}</option>
                    ))}
                  </select>
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <div className="hidden grid-cols-[1.25fr_0.9fr_1.3fr_1fr_150px] gap-4 border-b border-slate-200 bg-slate-50/80 px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-500 md:grid">
                    <span>Author</span>
                    <span className="inline-flex items-center gap-1"><Icon name="campus" /> Campus</span>
                    <span className="inline-flex items-center gap-1"><Icon name="course" /> Course</span>
                    <span>Deleted items</span>
                    <span className="text-right">Actions</span>
                  </div>

                  {loading ? (
                    <div className="flex min-h-[180px] items-center justify-center px-6 text-center text-sm text-slate-500">
                      Loading archived community records...
                    </div>
                  ) : errorMessage ? (
                    <div className="flex min-h-[180px] items-center justify-center px-6 text-center text-sm font-medium text-red-600">
                      {errorMessage}
                    </div>
                  ) : paginatedItems.length === 0 ? (
                    <div className="flex min-h-[180px] items-center justify-center px-6 text-center text-sm text-slate-500">
                      No archived community records found.
                    </div>
                  ) : (
                    paginatedItems.map((entry) => {
                      const author = entry.author || {};
                      const authorName = getName(author);

                      return (
                        <div
                          key={entry.authorId}
                          className="grid gap-3 border-b border-slate-100 px-4 py-3.5 transition hover:bg-slate-50/60 last:border-b-0 md:grid-cols-[1.25fr_0.9fr_1.3fr_1fr_150px] md:items-center md:gap-4"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-700">
                              {getInitials(authorName)}
                            </div>
                            <span className="truncate text-sm font-semibold text-slate-900">{authorName}</span>
                          </div>

                          <div className="text-sm text-slate-500">{entry.campus || "Unspecified"}</div>
                          <div className="text-sm text-slate-500">{entry.course || "Unspecified"}</div>

                          <div className="flex flex-wrap gap-2">
                            <span className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700">
                              {entry.postCount || 0} {Number(entry.postCount) === 1 ? "post" : "posts"}
                            </span>
                            <span className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700">
                              {entry.commentCount || 0} {Number(entry.commentCount) === 1 ? "comment" : "comments"}
                            </span>
                          </div>

                          <div className="flex justify-start md:justify-end">
                            <button
                              type="button"
                              onClick={() => openCommunityHistory(entry.authorId)}
                              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 shadow-sm transition hover:border-[#2e66a6]/40 hover:bg-[#2e66a6]/5"
                            >
                              <Icon name="eye" />
                              View history
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            ) : activeTab === "dormant" ? (
              <>
                <div className="mb-4">
                  <h3 className="text-sm font-bold text-slate-950">Dormant accounts</h3>
                
                </div>

                <div className="mb-4 grid gap-3 md:grid-cols-3">
                  <select
                    value={filters.role}
                    onChange={(event) => updateFilter("role", event.target.value)}
                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition hover:border-slate-300 focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/10"
                  >
                    <option value="all">All account types</option>
                    <option value="jobseeker">Jobseekers</option>
                    <option value="employer">Employers</option>
                  </select>

                  <select
                    value={filters.industry}
                    onChange={(event) => updateFilter("industry", event.target.value)}
                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition hover:border-slate-300 focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/10"
                  >
                    <option value="all">All industries / courses</option>
                    {(options.dormantIndustries || []).map((industry) => (
                      <option key={industry} value={industry}>{industry}</option>
                    ))}
                  </select>

                  <select
                    value={filters.inactivity}
                    onChange={(event) => updateFilter("inactivity", event.target.value)}
                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition hover:border-slate-300 focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/10"
                  >
                    <option value="6-12">Inactive for 6–12 months</option>
                    <option value="6-8">Inactive for 6–8 months</option>
                    <option value="9-12">Inactive for 9–12 months</option>
                  </select>
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <div className="hidden grid-cols-[1.4fr_1fr_0.9fr_0.8fr_1fr_130px] gap-4 border-b border-slate-200 bg-slate-50/80 px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-500 md:grid">
                    <span>Account</span>
                    <span>Industry / Course</span>
                    <span>Last active</span>
                    <span>Inactivity</span>
                    <span>Status</span>
                    <span className="text-right">Actions</span>
                  </div>

                  {loading ? (
                    <div className="flex min-h-[180px] items-center justify-center px-6 text-center text-sm text-slate-500">
                      Loading dormant accounts...
                    </div>
                  ) : errorMessage ? (
                    <div className="flex min-h-[180px] items-center justify-center px-6 text-center text-sm font-medium text-red-600">
                      {errorMessage}
                    </div>
                  ) : paginatedItems.length === 0 ? (
                    <div className="flex min-h-[180px] items-center justify-center px-6 text-center text-sm text-slate-500">
                      No accounts currently match the 6–12 month dormant rule.
                    </div>
                  ) : (
                    paginatedItems.map((entry) => {
                      const account = entry.user || {};
                      const accountName = getName(account);

                      return (
                        <div
                          key={entry.userId}
                          className="grid gap-3 border-b border-slate-100 px-4 py-3.5 transition hover:bg-slate-50/60 last:border-b-0 md:grid-cols-[1.4fr_1fr_0.9fr_0.8fr_1fr_130px] md:items-center md:gap-4"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                              {account.role === "employer" ? (
                                <Icon name="building" className="h-4 w-4" />
                              ) : (
                                <span className="text-[11px] font-bold">{getInitials(accountName)}</span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-900">{accountName}</p>
                              <p className="truncate text-[11px] text-slate-500">{account.email || "—"}</p>
                            </div>
                          </div>

                          <div className="text-sm text-slate-600">{entry.industryOrCourse || "Unspecified"}</div>
                          <div className="text-sm text-slate-500">{formatDate(entry.lastActive)}</div>
                          <div className="text-sm font-semibold text-slate-700">
                            {entry.inactivityMonths} {Number(entry.inactivityMonths) === 1 ? "month" : "months"}
                          </div>
                          <div>
                            <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                              Dormant Account
                            </span>
                          </div>

                          <div className="flex justify-start md:justify-end">
                            <button
                              type="button"
                              onClick={() => openDormantDetails(entry.userId)}
                              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 shadow-sm transition hover:border-[#2e66a6]/40 hover:bg-[#2e66a6]/5"
                            >
                              <Icon name="eye" />
                              View
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="mb-4">
                  <h3 className="text-sm font-bold text-slate-950">Archived jobs</h3>
                 
                </div>

                <div className="mb-4 grid gap-3 md:grid-cols-2">
                  <select
                    value={filters.jobStatus}
                    onChange={(event) => updateFilter("jobStatus", event.target.value)}
                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition hover:border-slate-300 focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/10"
                  >
                    <option value="all">All job records</option>
                    <option value="closed">Closed jobs</option>
                    <option value="expired">Expired jobs</option>
                    <option value="declined">Jobs with declined applicants</option>
                  </select>

                  <select
                    value={filters.company}
                    onChange={(event) => updateFilter("company", event.target.value)}
                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition hover:border-slate-300 focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/10"
                  >
                    <option value="all">All companies</option>
                    {(options.jobCompanies || []).map((company) => (
                      <option key={company} value={company}>{company}</option>
                    ))}
                  </select>
                </div>

                {loading ? (
                  <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-slate-200 text-sm text-slate-500">
                    Loading archived job records...
                  </div>
                ) : errorMessage ? (
                  <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-slate-200 px-6 text-center text-sm text-red-600">
                    {errorMessage}
                  </div>
                ) : paginatedItems.length === 0 ? (
                  <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-slate-200 text-sm text-slate-500">
                    No closed, expired, or declined-applicant job records found.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {paginatedItems.map((entry) => (
                      <article
                        key={entry.jobId}
                        className="overflow-hidden rounded-xl border border-slate-200 bg-white"
                      >
                        <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="flex min-w-0 gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                              <Icon name="building" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="text-sm font-bold text-slate-950">{entry.job?.title || "Untitled job"}</h4>
                                {entry.isClosed ? (
                                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-700">Closed</span>
                                ) : null}
                                {entry.isExpired ? (
                                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700">Expired</span>
                                ) : null}
                                {entry.declinedApplicants?.length ? (
                                  <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[10px] font-bold text-rose-700">
                                    {entry.declinedApplicants.length} declined
                                  </span>
                                ) : null}
                              </div>
                              <p className="mt-1 text-xs font-medium text-slate-500">{entry.job?.companyName || "Unspecified company"}</p>
                              <p className="mt-1 text-[11px] text-slate-400">
                                {entry.isExpired
                                  ? `Deadline: ${formatDate(entry.job?.applicationDeadline)}`
                                  : `Updated: ${formatDate(entry.job?.updatedAt)}`}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => openJobDetails(entry.jobId)}
                            className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 shadow-sm transition hover:border-[#2e66a6]/40 hover:bg-[#2e66a6]/5"
                          >
                            <Icon name="eye" />
                            View
                          </button>
                        </div>

                        {entry.declinedApplicants?.length ? (
                          <div className="border-t border-slate-200 bg-slate-50/60 p-3">
                            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                              <div className="grid min-w-[680px] grid-cols-[1.3fr_0.9fr_1fr_0.9fr] gap-3 border-b border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-bold text-slate-500">
                                <span>Applicant</span>
                                <span>Jobseeker level</span>
                                <span>Declined at stage</span>
                                <span>Date applied</span>
                              </div>
                              {entry.declinedApplicants.map((application) => (
                                <div
                                  key={application._id}
                                  className="grid min-w-[680px] grid-cols-[1.3fr_0.9fr_1fr_0.9fr] gap-3 border-b border-slate-100 px-3 py-2.5 text-xs last:border-b-0"
                                >
                                  <span className="font-semibold text-slate-900">{application.applicantName}</span>
                                  <span className="text-slate-600">{application.jobseekerLevel || "Not specified"}</span>
                                  <span>
                                    <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-1 font-semibold text-rose-700">
                                      {application.declinedStage}
                                    </span>
                                  </span>
                                  <span className="text-slate-500">{formatDate(application.appliedAt)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </article>
                    ))}
                  </div>
                )}
              </>
            )}

            <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
              <span>
                Showing {activeItems.length === 0 ? 0 : (safePage - 1) * ITEMS_PER_PAGE + 1} to{" "}
                {Math.min(safePage * ITEMS_PER_PAGE, activeItems.length)} of {activeItems.length} results
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-3 font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6]/20 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="flex h-9 min-w-9 items-center justify-center rounded-lg bg-[#2e66a6] px-3 font-bold text-white">
                  {safePage}
                </span>
                <button
                  type="button"
                  disabled={safePage >= pageCount}
                  onClick={() => setCurrentPage((page) => Math.min(pageCount, page + 1))}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-3 font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6]/20 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </AdminLayout>
  );
};

export default AdminArchive;
