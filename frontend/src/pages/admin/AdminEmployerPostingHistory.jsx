import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AdminLayout from "../../layouts/AdminLayout";
import api from "../../services/api";

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

const getDateStart = (filter) => {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  if (filter === "today") return start;
  if (filter === "last7") {
    start.setDate(start.getDate() - 6);
    return start;
  }
  if (filter === "last30") {
    start.setDate(start.getDate() - 29);
    return start;
  }
  if (filter === "thisMonth") {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
  if (filter === "thisYear") {
    return new Date(now.getFullYear(), 0, 1);
  }

  return null;
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
  }, [search, jobTitle, status, dateFilter, sortBy]);

  const companyName =
    user?.employerProfile?.companyName ||
    user?.fullName ||
    "Employer";

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
    const dateStart = getDateStart(dateFilter);

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

      const createdDate = new Date(job?.createdAt || 0);
      const matchesDate =
        !dateStart ||
        (!Number.isNaN(createdDate.getTime()) &&
          createdDate.getTime() >= dateStart.getTime());

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
  }, [jobs, search, jobTitle, status, dateFilter, sortBy, companyName]);

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
                <div className="grid gap-3 lg:grid-cols-[1.7fr_1fr_0.9fr_0.9fr_1fr]">
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

                  <select
                    value={dateFilter}
                    onChange={(event) => setDateFilter(event.target.value)}
                    className="h-12 rounded-xl border border-gray-300 bg-white px-4 text-sm font-medium text-black outline-none transition focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/15"
                  >
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="last7">Last 7 Days</option>
                    <option value="last30">Last 30 Days</option>
                    <option value="thisMonth">This Month</option>
                    <option value="thisYear">This Year</option>
                  </select>

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
                </div>

                <p className="mt-3 text-xs text-black/50">
                  Showing {filteredJobs.length} result(s).
                </p>
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
                              className="transition hover:bg-[#f8fbff]"
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
                                  onClick={() =>
                                    navigate(`/admin/jobs/${job._id}`, {
                                      state: {
                                        backPath: `/admin/users/${userId}/posting-history`,
                                        backLabel: "Back to Posting History",
                                      },
                                    })
                                  }
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
