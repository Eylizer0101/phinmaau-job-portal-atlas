import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AdminLayout from "../../layouts/AdminLayout";
import api from "../../services/api";
import Pagination from "../../components/shared/Pagination";
import ApplicationHistoryCard from "../../components/admin/ApplicationHistoryCard";
import ApplicationDateFilter, { isApplicationDateInRange } from "../../components/admin/ApplicationDateFilter";

const cn = (...classes) => classes.filter(Boolean).join(" ");

const Icon = ({ name, className = "h-4 w-4" }) => {
  const common = {
    className,
    fill: "none",
    stroke: "currentColor",
    viewBox: "0 0 24 24",
    strokeWidth: 2,
  };

  const icons = {
    arrowLeft: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10 19l-7-7m0 0l7-7m-7 7h18"
      />
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path strokeLinecap="round" d="m20 20-3.5-3.5" />
      </>
    ),
    mapPin: (
      <>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M17.657 16.657 13.414 20.9a2 2 0 0 1-2.828 0l-4.243-4.243a8 8 0 1 1 11.314 0z"
        />
        <circle cx="12" cy="11" r="2.5" />
      </>
    ),
    calendar: (
      <>
        <path strokeLinecap="round" d="M8 3v4m8-4v4M5 10h14" />
        <rect x="4" y="5" width="16" height="16" rx="2" />
      </>
    ),
    briefcase: (
      <>
        <rect x="3" y="7" width="18" height="13" rx="2" />
        <path strokeLinecap="round" d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 12h18" />
      </>
    ),
    eye: (
      <>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
        />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
  };

  return <svg {...common}>{icons[name] || null}</svg>;
};

const FILTERS = [
  { key: "all", label: "All" },
  { key: "Submitted", label: "Submitted" },
  { key: "Resume Under Review", label: "In Review" },
  { key: "For Interview", label: "For Interview" },

  { key: "Hired", label: "Offered" },
  { key: "Not Selected", label: "Not Selected" },
];

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

const formatDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
};

const formatSalary = (job = {}) => {
  if (job.hideSalary) return "Salary hidden";
  const minimum = Number(job.salaryMin);
  const maximum = Number(job.salaryMax);
  const money = (value) => `₱${value.toLocaleString("en-PH")}`;
  if (Number.isFinite(minimum) && Number.isFinite(maximum)) return `${money(minimum)}–${money(maximum)}`;
  if (Number.isFinite(minimum)) return `From ${money(minimum)}`;
  if (Number.isFinite(maximum)) return `Up to ${money(maximum)}`;
  return "Salary not specified";
};

const formatRelativeTime = (value) => {
  if (!value) return "Updated recently";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Updated recently";

  const difference = Math.max(0, Date.now() - date.getTime());
  const minutes = Math.floor(difference / 60000);
  const hours = Math.floor(difference / 3600000);
  const days = Math.floor(difference / 86400000);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (minutes < 1) return "Updated just now";
  if (minutes < 60) {
    return `Updated ${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }
  if (hours < 24) {
    return `Updated ${hours} hour${hours === 1 ? "" : "s"} ago`;
  }
  if (days < 7) {
    return `Updated ${days} day${days === 1 ? "" : "s"} ago`;
  }
  if (weeks < 5) {
    return `Updated ${weeks} week${weeks === 1 ? "" : "s"} ago`;
  }

  return `Updated ${months} month${months === 1 ? "" : "s"} ago`;
};

const normalizeStageName = (value) =>
  String(value || "").replace(/\s+/g, " ").trim();

const isOfferStage = (value) => {
  const normalized = normalizeStageName(value).toLowerCase();
  return normalized === "job offer" || normalized === "offered" || normalized.includes("offer");
};

const getInterviewProgress = (application = {}) => {
  const stage = normalizeStageName(application.hiringStage).toLowerCase();

  if (isOfferStage(stage)) return 90;
  if (stage.includes("final")) return 80;
  if (stage.includes("assessment")) return 70;
  if (stage.includes("initial")) return 60;
  if (application?.interviewSchedule?.scheduledAt) return 75;
  if (stage) return 70;
  return 55;
};

const getApplicationPresentation = (application = {}) => {
  const normalizedStatus = String(application.status || "pending").toLowerCase();
  const hiringStage = normalizeStageName(application.hiringStage);

  if (normalizedStatus === "hired") {
    return {
      label: "Hired",
      progress: 100,
      description: "Applicant was hired",
      badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
      barClass: "bg-emerald-500",
    };
  }

  if (normalizedStatus === "declined" || normalizedStatus === "vacancy full") {
    return {
      label: "Declined",
      progress: 100,
      description:
        application.declineReason ||
        (normalizedStatus === "vacancy full"
          ? "Position filled"
          : "Application was not selected"),
      badgeClass: "border-rose-200 bg-rose-50 text-rose-700",
      barClass: "bg-rose-400",
    };
  }

  if (normalizedStatus === "withdrawn" || normalizedStatus === "cancelled") {
    return {
      label: "Withdrawn",
      progress: 30,
      description: "Application withdrawn by the applicant",
      badgeClass: "border-slate-200 bg-slate-50 text-slate-700",
      barClass: "bg-slate-400",
    };
  }

  if (normalizedStatus === "for interview") {
    if (isOfferStage(hiringStage)) {
      return {
        label: "Offered",
        progress: 90,
        description: "Applicant reached the job offer stage",
        badgeClass: "border-violet-200 bg-violet-50 text-violet-700",
        barClass: "bg-violet-500",
      };
    }

    return {
      label: "For Interview",
      progress: getInterviewProgress(application),
      description:
        hiringStage ||
        (application?.interviewSchedule?.scheduledAt
          ? "Interview scheduled"
          : "Applicant is in the interview process"),
      badgeClass: "border-blue-200 bg-blue-50 text-blue-700",
      barClass: "bg-blue-500",
    };
  }

  if (application.reviewedAt || application.viewedAt || application.isViewedByEmployer) {
    return {
      label: "Pending",
      progress: 35,
      description: "Employer opened and reviewed the applicant's resume",
      badgeClass: "border-amber-200 bg-amber-50 text-amber-700",
      barClass: "bg-amber-500",
    };
  }

  return {
    label: "Pending",
    progress: 15,
    description: "Application received by the employer",
    badgeClass: "border-slate-200 bg-slate-50 text-slate-700",
    barClass: "bg-blue-500",
  };
};

const getActivityTimelineTitle = (activity = {}) => {
  const type = String(activity.type || "").toLowerCase();
  const title = String(activity.title || "").trim();
  const description = String(activity.description || "").trim();
  const toStatus = normalizeStageName(activity.toStatus);
  const normalizedToStatus = toStatus.toLowerCase();

  if (type === "submitted") return "Application submitted";
  if (type === "reviewed") return "Resume under review";
  if (type === "hired" || normalizedToStatus === "hired") return "Hired";

  if (type === "declined" || normalizedToStatus === "declined") {
    return description ? `Not Selected — ${description}` : "Not Selected";
  }

  if (
    title.toLowerCase().includes("hiring stage") ||
    (type === "interview" &&
      normalizedToStatus &&
      normalizedToStatus !== "for interview")
  ) {
    if (isOfferStage(toStatus)) return "Offered";
    return toStatus || title || "Hiring stage updated";
  }

  if (normalizedToStatus === "for interview" || type === "interview") {
    return "For Interview";
  }

  if (isOfferStage(title) || isOfferStage(toStatus)) return "Offered";

  return title || description || "Application updated";
};

const normalizeTimelineEntry = (activity, index, applicationId) => ({
  key: activity?._id || `${applicationId || "application"}-${index}`,
  title: getActivityTimelineTitle(activity),
  date:
    activity?.occurredAt ||
    activity?.createdAt ||
    activity?.updatedAt,
});

const buildProgressTimeline = (application = {}, presentation) => {
  const history = Array.isArray(application.activityHistory)
    ? application.activityHistory
        .map((activity, index) =>
          normalizeTimelineEntry(activity, index, application._id)
        )
        .filter((item) => item.title && item.date)
    : [];

  const normalizedTitles = history.map((item) =>
    String(item.title || "").toLowerCase()
  );

  const addFallback = (title, date, matchingWords = []) => {
    if (!date) return;

    const alreadyExists = normalizedTitles.some((existingTitle) =>
      matchingWords.some((word) => existingTitle.includes(word))
    );

    if (!alreadyExists) {
      history.push({
        key: `${title}-${date}`,
        title,
        date,
      });
      normalizedTitles.push(String(title).toLowerCase());
    }
  };

  addFallback(
    "Application submitted",
    application.appliedAt || application.createdAt,
    ["submitted", "application received"]
  );

  addFallback(
    "Resume under review",
    application.viewedAt || application.reviewedAt,
    ["resume under review", "application reviewed", "reviewed"]
  );

  const normalizedStatus = String(application.status || "").toLowerCase();
  const reachedInterview =
    normalizedStatus === "for interview" ||
    normalizedStatus === "hired" ||
    normalizedStatus === "declined" ||
    Boolean(normalizeStageName(application.hiringStage));

  if (reachedInterview) {
    const interviewActivity = Array.isArray(application.activityHistory)
      ? application.activityHistory.find((activity) => {
          const type = String(activity?.type || "").toLowerCase();
          const toStatus = String(activity?.toStatus || "").toLowerCase();
          return type === "interview" || toStatus === "for interview";
        })
      : null;

    addFallback(
      "For Interview",
      interviewActivity?.occurredAt ||
        application?.interviewSchedule?.setAt ||
        application.reviewedAt ||
        application.updatedAt,
      ["for interview", "moved to interview"]
    );
  }

  const currentHiringStage = normalizeStageName(application.hiringStage);
  if (currentHiringStage) {
    addFallback(
      isOfferStage(currentHiringStage) ? "Offered" : currentHiringStage,
      application.updatedAt,
      [currentHiringStage.toLowerCase(), isOfferStage(currentHiringStage) ? "offered" : ""].filter(Boolean)
    );
  }

  if (application?.interviewSchedule?.scheduledAt) {
    addFallback(
      "Interview scheduled",
      application?.interviewSchedule?.setAt ||
        application?.interviewSchedule?.scheduledAt,
      ["interview scheduled", "technical interview"]
    );
  }

  if (presentation.label === "Offered") {
    addFallback("Offered", application.updatedAt, ["offered", "job offer"]);
  }

  if (presentation.label === "Hired") {
    addFallback("Hired", application.updatedAt, ["hired"]);
  }

  if (presentation.label === "Declined") {
    const reason = [
      application.declineReason,
      application.declineComment,
    ]
      .filter(Boolean)
      .join(" — ");

    addFallback(
      reason ? `Not Selected — ${reason}` : "Not Selected",
      application.updatedAt,
      ["not selected", "declined", "position filled"]
    );
  }

  return history.sort((first, second) => {
    const firstTime = new Date(first.date).getTime();
    const secondTime = new Date(second.date).getTime();
    return secondTime - firstTime;
  });
};

const AdminUserApplicationHistory = () => {
  const { userId } = useParams();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [applications, setApplications] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [industryFilter, setIndustryFilter] = useState("all");
  const [jobTitleFilter, setJobTitleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchApplicationHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get(`/admin/users/${userId}`, {
        params: { fresh: Date.now() },
      });

      if (!response.data?.success) {
        setError("Unable to load the application history.");
        return;
      }

      setUser(response.data.user || null);
      setApplications(
        Array.isArray(response.data.applications)
          ? response.data.applications
          : []
      );
    } catch (requestError) {
      console.error("Error loading full application history:", requestError);
      setError(
        requestError.response?.data?.message ||
          "Failed to load the application history. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) fetchApplicationHistory();
  }, [fetchApplicationHistory, userId]);

  const fullName = useMemo(() => {
    if (!user) return "Jobseeker";

    return (
      user.fullName ||
      [user.firstName, user.middleName, user.lastName, user.extensionName]
        .filter(Boolean)
        .join(" ") ||
      user.email ||
      "Jobseeker"
    );
  }, [user]);

  const preparedApplications = useMemo(
    () =>
      applications.map((application) => ({
        application,
        presentation: getApplicationPresentation(application),
      })),
    [applications]
  );

  const filterOptions = useMemo(() => {
    const unique = (values) => [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
    return {
      companies: unique(applications.map((item) => item.job?.companyName || item.employer?.employerProfile?.companyName)),
      industries: unique(applications.map((item) => item.job?.industry || item.employer?.employerProfile?.industry)),
      jobTitles: unique(applications.map((item) => item.job?.title || item.job?.jobTitle)),
    };
  }, [applications]);

  const hasActiveFilters = useMemo(
    () =>
      searchQuery.trim() !== "" ||
      companyFilter !== "all" ||
      industryFilter !== "all" ||
      jobTitleFilter !== "all" ||
      statusFilter !== "all" ||
      timeFilter !== "all" ||
      dateFrom !== "" ||
      dateTo !== "",
    [searchQuery, companyFilter, industryFilter, jobTitleFilter, statusFilter, timeFilter, dateFrom, dateTo]
  );

  const clearAllFilters = useCallback(() => {
    setSearchQuery("");
    setCompanyFilter("all");
    setIndustryFilter("all");
    setJobTitleFilter("all");
    setStatusFilter("all");
    setTimeFilter("all");
    setDateFrom("");
    setDateTo("");
  }, []);

  const filteredApplications = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return preparedApplications.filter(({ application, presentation }) => {
      const job = application.job || {};
      const employerProfile = application.employer?.employerProfile || {};
      const companyName = job.companyName || employerProfile.companyName || "";
      const industry = job.industry || employerProfile.industry || "";
      const jobTitle = job.title || job.jobTitle || "";
      const normalizedStatus = String(application.status || "pending").toLowerCase();
      const appliedDate = application.appliedAt || application.createdAt;

      if (companyFilter !== "all" && companyName !== companyFilter) return false;
      if (industryFilter !== "all" && industry !== industryFilter) return false;
      if (jobTitleFilter !== "all" && jobTitle !== jobTitleFilter) return false;
      if (statusFilter !== "all" && normalizedStatus !== statusFilter) return false;
      if (timeFilter !== "all" && !isApplicationDateInRange(appliedDate, dateFrom, dateTo)) return false;
      if (!normalizedQuery) return true;

      const searchableText = [
        job.title,
        job.jobTitle,
        job.companyName,
        employerProfile.companyName,
        job.location,
        job.address,
        job.workMode,
        job.jobType,
        presentation.label,
        application.hiringStage,
        application.declineReason,
        application.declineComment,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(normalizedQuery);
    });
  }, [companyFilter, dateFrom, dateTo, industryFilter, jobTitleFilter, preparedApplications, searchQuery, statusFilter, timeFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [companyFilter, dateFrom, dateTo, industryFilter, jobTitleFilter, searchQuery, statusFilter, timeFilter]);

  const paginatedApplications = useMemo(() => {
    if (pageSize === "all") return filteredApplications;
    const start = (currentPage - 1) * pageSize;
    return filteredApplications.slice(start, start + pageSize);
  }, [currentPage, filteredApplications, pageSize]);

  if (loading) {
    return (
      <AdminLayout>
        <div className="min-h-screen bg-[#f7f9fc] px-0 py-8">
          <div className="flex min-h-[420px] items-center justify-center rounded-[20px] border border-[#d8e2ee] bg-white">
            <div className="text-center">
              <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-slate-200 border-t-[#2e66a6]" />
              <p className="mt-4 text-sm text-gray-600">
                Loading application history...
              </p>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="min-h-screen bg-[#f7f9fc] px-0 py-8">
          <button
            type="button"
            onClick={() => navigate(`/admin/users/${userId}`)}
            className="mb-5 inline-flex items-center gap-2 rounded-xl border border-[#d8e2ee] bg-white px-4 py-2.5 text-sm font-semibold text-black shadow-sm transition hover:bg-[#f7faff]"
          >
            <Icon name="arrowLeft" />
            Back to User Details
          </button>

          <div className="rounded-[20px] border border-red-200 bg-red-50 px-6 py-12 text-center text-sm text-red-700">
            {error}
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="min-h-screen bg-[#f7f9fc] px-0 py-8">
        <div className="w-full space-y-5">
          <button
            type="button"
            onClick={() => navigate(`/admin/users/${userId}`)}
            className="inline-flex w-fit items-center gap-2 rounded-xl border border-[#d8e2ee] bg-white px-4 py-2.5 text-sm font-semibold text-black shadow-sm transition hover:border-[#2e66a6]/35 hover:bg-[#f7faff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2"
          >
            <Icon name="arrowLeft" />
            Back to User Details
          </button>

          <section className="flex min-h-[760px] flex-col rounded-[20px] border border-[#d8e2ee] bg-white p-5 shadow-sm sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div><h1 className="text-2xl font-bold text-black sm:text-3xl">
                Full Application History
              </h1>
              <p className="mt-2 text-sm text-gray-500">
                Every company this applicant has applied to, with stage-by-stage progress.
              </p></div>
              <span className="text-sm font-medium text-gray-500">{applications.length} Applications</span>
            </div>

            <div className="mt-6 rounded-xl border border-[#d8e2ee] bg-[#fbfdff] p-3">
              <label className="relative block w-full">
                <span className="sr-only">
                  Search application history
                </span>
                <Icon
                  name="search"
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search company, role, location..."
                  className="h-10 w-full rounded-lg border border-[#d8e2ee] bg-white pl-9 pr-3 text-sm text-black outline-none transition placeholder:text-gray-400 focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/15 lg:max-w-none"
                />
              </label>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <div className="grid flex-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
                {[
                  [companyFilter, setCompanyFilter, "All Company", filterOptions.companies],
                  [industryFilter, setIndustryFilter, "All Industry", filterOptions.industries],
                  [jobTitleFilter, setJobTitleFilter, "All Job Title", filterOptions.jobTitles],
                ].map(([value, setter, label, options]) => <select key={label} value={value} onChange={(event) => setter(event.target.value)} className="h-10 rounded-lg border border-[#d8e2ee] bg-white px-3 text-sm outline-none focus:border-[#2e66a6]"><option value="all">{label}</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select>)}
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-10 rounded-lg border border-[#d8e2ee] bg-white px-3 text-sm outline-none focus:border-[#2e66a6]"><option value="all">All Status</option><option value="pending">Pending</option><option value="for interview">For Interview</option><option value="hired">Hired</option><option value="declined">Declined</option><option value="withdrawn">Withdrawn</option></select>
                <ApplicationDateFilter
                  value={timeFilter}
                  dateFrom={dateFrom}
                  dateTo={dateTo}
                  onChange={({ value, dateFrom: nextFrom, dateTo: nextTo }) => {
                    setTimeFilter(value);
                    setDateFrom(nextFrom);
                    setDateTo(nextTo);
                  }}
                />
                </div>

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="flex h-10 items-center gap-2 rounded-lg border border-[#d8e2ee] bg-white px-4 text-sm font-medium text-[#2e66a6] transition hover:border-[#2e66a6] hover:bg-[#f7faff]"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v6h6M20 20v-6h-6M5.64 18.36A9 9 0 1020 12" />
                    </svg>
                    Clear
                  </button>
                )}
              </div>

              <p className="mt-2 text-xs text-gray-500">Showing {filteredApplications.length} of {applications.length} applications</p>
            </div>

            {filteredApplications.length ? (
              <div className="mt-5 flex-1 space-y-4">
                {paginatedApplications.map(({ application }) => (
                  <ApplicationHistoryCard
                    key={application._id}
                    application={application}
                    onView={() => navigate(`/admin/applications/${application._id}`)}
                  />
                ))}
              </div>
            ) : (
              <div className="mt-5 flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-[#d8e2ee] bg-[#f8fafc] px-5 py-14 text-center">
                <p className="text-sm font-semibold text-gray-700">
                  No matching applications found.
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Try a different status filter or search term.
                </p>
              </div>
            )}
            <Pagination
              currentPage={currentPage}
              totalItems={filteredApplications.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          </section>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminUserApplicationHistory;
