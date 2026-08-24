import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AdminLayout from "../../layouts/AdminLayout";
import api from "../../services/api";
import Pagination from "../../components/shared/Pagination";

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
      label: "Not Selected",
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
      label: "Resume Under Review",
      progress: 35,
      description: "Employer opened and reviewed the applicant's resume",
      badgeClass: "border-amber-200 bg-amber-50 text-amber-700",
      barClass: "bg-amber-500",
    };
  }

  return {
    label: "Submitted",
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

  if (presentation.label === "Not Selected") {
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
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchApplicationHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get(`/admin/users/${userId}`);

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

  const filterCounts = useMemo(() => {
    const counts = {
      all: preparedApplications.length,
      Submitted: 0,
      "Resume Under Review": 0,
      "For Interview": 0,
      Offered: 0,
      Hired: 0,
      "Not Selected": 0,
    };

    preparedApplications.forEach(({ presentation }) => {
      if (Object.prototype.hasOwnProperty.call(counts, presentation.label)) {
        counts[presentation.label] += 1;
      }
    });

    return counts;
  }, [preparedApplications]);

  const filteredApplications = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return preparedApplications.filter(({ application, presentation }) => {
      if (
        activeFilter !== "all" &&
        presentation.label !== activeFilter
      ) {
        return false;
      }

      if (!normalizedQuery) return true;

      const job = application.job || {};
      const employerProfile = application.employer?.employerProfile || {};
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
  }, [activeFilter, preparedApplications, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter, searchQuery]);

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

          <section className="rounded-[20px] border border-[#d8e2ee] bg-white p-5 shadow-sm sm:p-7">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#2e66a6]">
                {fullName}
              </p>
              <h1 className="mt-1 text-2xl font-bold text-black sm:text-3xl">
                Full Application History
              </h1>
              <p className="mt-2 text-sm text-gray-500">
                Every company this jobseeker has applied to, with stage-by-stage progress.
              </p>
            </div>

            <div className="mt-6 flex flex-col gap-3 rounded-xl border border-[#d8e2ee] bg-[#fbfdff] p-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0">
                {FILTERS.map((filter) => {
                  const isActive = activeFilter === filter.key;

                  return (
                    <button
                      key={filter.key}
                      type="button"
                      onClick={() => setActiveFilter(filter.key)}
                      className={cn(
                        "inline-flex h-9 shrink-0 items-center gap-2 rounded-full border px-3 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2",
                        isActive
                          ? "border-[#163c70] bg-[#163c70] text-white"
                          : "border-[#d8e2ee] bg-white text-gray-600 hover:border-[#2e66a6]/40 hover:text-[#174b91]"
                      )}
                    >
                      {filter.label}
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-0.5 text-[10px]",
                          isActive
                            ? "bg-white/15 text-white"
                            : "bg-[#eef5fc] text-[#2e66a6]"
                        )}
                      >
                        {filterCounts[filter.key] || 0}
                      </span>
                    </button>
                  );
                })}
              </div>

              <label className="relative block w-full lg:max-w-[330px]">
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
                  className="h-10 w-full rounded-lg border border-[#d8e2ee] bg-white pl-9 pr-3 text-sm text-black outline-none transition placeholder:text-gray-400 focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/15"
                />
              </label>
            </div>

            {filteredApplications.length ? (
              <div className="mt-5 space-y-4">
                {paginatedApplications.map(
                  ({ application, presentation }) => {
                    const job = application.job || {};
                    const employerProfile =
                      application.employer?.employerProfile || {};
                    const companyName =
                      job.companyName ||
                      employerProfile.companyName ||
                      "Company not specified";
                    const jobTitle =
                      job.title || job.jobTitle || "Job position";
                    const locationText =
                      job.location ||
                      job.address ||
                      employerProfile.regionCity ||
                      "Location not specified";
                    const timeline = buildProgressTimeline(
                      application,
                      presentation
                    );

                    return (
                      <article
                        key={application._id}
                        className="rounded-[18px] border border-[#d8e2ee] bg-white p-4 shadow-[0_4px_14px_rgba(15,23,42,0.04)] transition hover:border-[#b9cce1] sm:p-5"
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="flex min-w-0 items-start gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#eef5fc] text-[#2e66a6]">
                              <Icon name="briefcase" className="h-5 w-5" />
                            </div>

                            <div className="min-w-0">
                              <h2 className="text-base font-bold text-black">
                                {jobTitle}
                              </h2>
                              <p className="mt-0.5 text-sm font-medium text-gray-600">
                                {companyName}
                              </p>

                              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                                <span className="inline-flex items-center gap-1.5">
                                  <Icon name="mapPin" className="h-3.5 w-3.5" />
                                  {locationText}
                                </span>
                                <span aria-hidden="true">•</span>
                                <span className="inline-flex items-center gap-1.5">
                                  <Icon name="calendar" className="h-3.5 w-3.5" />
                                  Applied{" "}
                                  {formatDate(
                                    application.appliedAt ||
                                      application.createdAt
                                  )}
                                </span>
                                <span aria-hidden="true">•</span>
                                <span>
                                  {formatRelativeTime(
                                    application.updatedAt ||
                                      application.reviewedAt ||
                                      application.appliedAt ||
                                      application.createdAt
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>

                          <span
                            className={cn(
                              "inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-semibold",
                              presentation.badgeClass
                            )}
                          >
                            {presentation.label}
                          </span>
                        </div>

                        <div className="mt-5 flex items-center justify-between gap-4 text-xs">
                          <span className="font-medium text-gray-600">
                            {presentation.description}
                          </span>
                          <span className="shrink-0 font-semibold text-black">
                            {presentation.progress}%
                          </span>
                        </div>

                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#edf2f7]">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              presentation.barClass
                            )}
                            style={{
                              width: `${presentation.progress}%`,
                            }}
                          />
                        </div>

                        <div className="mt-4 rounded-xl bg-[#f7f9fc] px-4 py-4">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#2e66a6]">
                            Progress Timeline
                          </p>

                          {timeline.length ? (
                            <ul className="mt-3 space-y-3">
                              {timeline.map((item) => (
                                <li
                                  key={item.key}
                                  className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 sm:grid-cols-[auto_minmax(0,1fr)_auto]"
                                >
                                  <span className="mt-1.5 h-2 w-2 rounded-full bg-[#3875ff]" />
                                  <span className="min-w-0 text-xs font-medium leading-5 text-gray-700">
                                    {item.title}
                                  </span>
                                  <span className="col-start-2 text-[11px] text-gray-400 sm:col-start-3 sm:whitespace-nowrap">
                                    {formatDate(item.date)}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="mt-3 text-xs text-gray-500">
                              No progress events are available yet.
                            </p>
                          )}
                        </div>

                        <div className="mt-4 flex justify-end">
                          <button
                            type="button"
                            onClick={() =>
                              navigate(
                                `/admin/applications/${application._id}`
                              )
                            }
                            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-[#174b91] transition hover:bg-[#f7faff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2"
                          >
                            <Icon name="eye" className="h-4 w-4" />
                            View application
                          </button>
                        </div>
                      </article>
                    );
                  }
                )}
              </div>
            ) : (
              <div className="mt-5 rounded-xl border border-dashed border-[#d8e2ee] bg-[#f8fafc] px-5 py-14 text-center">
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
