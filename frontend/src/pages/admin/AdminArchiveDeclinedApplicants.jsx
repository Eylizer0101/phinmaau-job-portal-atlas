import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import AdminLayout from "../../layouts/AdminLayout";
import api from "../../services/api";
import Pagination from "../../components/shared/Pagination";

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-PH", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
};

const Icon = ({ name, className = "h-4 w-4" }) => {
  const paths = {
    arrowLeft: <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />,
    search: <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m1.1-5.4a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" />,
    eye: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12s3.75-6.75 9.75-6.75S21.75 12 21.75 12 18 18.75 12 18.75 2.25 12 2.25 12z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </>
    ),
  };

  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" aria-hidden="true">
      {paths[name] || null}
    </svg>
  );
};

const DATE_OPTIONS = [
  { value: "all", label: "All Time" },
  { value: "today", label: "Today" },
  { value: "7days", label: "Last 7 Days" },
  { value: "30days", label: "Last 30 Days" },
];

const getDateStart = (value) => {
  const now = new Date();
  if (value === "today") return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (value === "7days") return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
  if (value === "30days") return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
  return null;
};

const AdminArchiveDeclinedApplicants = () => {
  const { employerId, jobId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState("all");
  const [date, setDate] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const backPath = location.state?.backPath || `/admin/archive/account/${employerId}`;

  const loadRecord = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const response = await api.get(`/admin/archive/account/${employerId}`);
      const records = Array.isArray(response.data?.records) ? response.data.records : [];
      const matched = records.find(
        (item) =>
          item.archiveType === "declined-applicants" &&
          String(item.jobId || "") === String(jobId || "")
      );

      if (!matched) {
        setRecord(null);
        setErrorMessage("Declined applicants for this archived job were not found.");
        return;
      }

      setRecord(matched);
    } catch (error) {
      console.error("Failed to load declined applicants:", error);
      setRecord(null);
      setErrorMessage(error?.response?.data?.message || "Failed to load declined applicants.");
    } finally {
      setLoading(false);
    }
  }, [employerId, jobId]);

  useEffect(() => {
    loadRecord();
  }, [loadRecord]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, level, date]);

  const applicants = useMemo(
    () => (Array.isArray(record?.applicants) ? record.applicants : []),
    [record]
  );

  const levels = useMemo(
    () =>
      [...new Set(applicants.map((item) => String(item.jobSeekerLevel || "").trim()).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b)),
    [applicants]
  );

  const filteredApplicants = useMemo(() => {
    const query = search.trim().toLowerCase();
    const startDate = getDateStart(date);

    return applicants.filter((applicant) => {
      if (level !== "all" && String(applicant.jobSeekerLevel || "") !== level) return false;

      if (query) {
        const searchable = [
          applicant.applicantName,
          applicant.email,
          applicant.jobSeekerLevel,
          applicant.declinedStage,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!searchable.includes(query)) return false;
      }

      if (startDate) {
        const declinedAt = new Date(applicant.declinedAt || applicant.archivedAt || 0);
        if (Number.isNaN(declinedAt.getTime()) || declinedAt < startDate) return false;
      }

      return true;
    });
  }, [applicants, date, level, search]);

  const pageCount = pageSize === "all" ? 1 : Math.max(1, Math.ceil(filteredApplicants.length / pageSize));
  const safePage = Math.min(currentPage, pageCount);
  const paginatedApplicants = useMemo(() => {
    if (pageSize === "all") return filteredApplicants;
    const start = (safePage - 1) * pageSize;
    return filteredApplicants.slice(start, start + pageSize);
  }, [filteredApplicants, pageSize, safePage]);

  const jobTitle = record?.title || location.state?.jobTitle || "Archived Job";
  const count = applicants.length;

  const viewProfile = (applicant) => {
    const userId = applicant?.jobseekerId;
    if (!userId) return;
    navigate(`/admin/users/${userId}?tab=resume`, {
      state: {
        fromArchive: true,
        archiveBackPath: location.pathname,
      },
    });
  };

  return (
    <AdminLayout>
      <main className="mx-auto w-full max-w-[1180px] px-1 py-8">
        <button
          type="button"
          onClick={() => navigate(backPath)}
          className="mb-5 inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-black shadow-sm hover:bg-slate-50"
        >
          <Icon name="arrowLeft" />
          Back
        </button>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <header className="border-b border-slate-200 px-5 py-5">
            <h1 className="text-2xl font-bold text-black">{jobTitle} – Declined Applicants</h1>
            <p className="mt-2 text-sm text-slate-600">
              {count} {count === 1 ? "applicant" : "applicants"} declined for {jobTitle}
            </p>
          </header>

          <div className="grid gap-3 border-b border-slate-200 p-4 lg:grid-cols-[minmax(320px,1.5fr)_minmax(220px,0.8fr)_minmax(190px,0.7fr)]">
            <label className="relative block">
              <span className="sr-only">Search declined applicants</span>
              <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search applicant..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/10"
              />
            </label>

            <select
              value={level}
              onChange={(event) => setLevel(event.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#2e66a6]"
            >
              <option value="all">All Job Seeker Level</option>
              {levels.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>

            <select
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#2e66a6]"
            >
              {DATE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[980px]">
              <div className="grid grid-cols-[1fr_1.35fr_1fr_1fr_0.9fr_0.55fr] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4 text-[11px] font-bold uppercase tracking-wide text-slate-600">
                <span>Applied Date</span>
                <span>Applicant</span>
                <span>Jobseeker Level</span>
                <span className="text-center">Decline Stage</span>
                <span>Archived Date</span>
                <span className="text-center">Actions</span>
              </div>

              {loading ? (
                <div className="flex min-h-[240px] items-center justify-center text-sm text-slate-500">
                  Loading declined applicants...
                </div>
              ) : errorMessage ? (
                <div className="flex min-h-[240px] items-center justify-center px-6 text-center text-sm text-red-600">
                  {errorMessage}
                </div>
              ) : paginatedApplicants.length === 0 ? (
                <div className="flex min-h-[240px] items-center justify-center text-sm text-slate-500">
                  No declined applicants found.
                </div>
              ) : (
                paginatedApplicants.map((applicant) => (
                  <div
                    key={applicant.applicationId || applicant._id}
                    className="grid grid-cols-[1fr_1.35fr_1fr_1fr_0.9fr_0.55fr] items-center gap-4 border-b border-slate-200 px-5 py-4 last:border-b-0"
                  >
                    <span className="text-sm text-slate-600">{formatDate(applicant.appliedAt)}</span>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-black">{applicant.applicantName || "Jobseeker"}</p>
                      <p className="truncate text-xs text-slate-500">{applicant.email || "—"}</p>
                    </div>

                    <span className="text-sm text-slate-600">{applicant.jobSeekerLevel || "Not specified"}</span>

                    <div className="text-center">
                      <p className="text-sm font-semibold text-red-600">{applicant.declinedStage || "Declined"}</p>
                      <p className="mt-1 text-xs text-slate-500">{formatDate(applicant.declinedAt)}</p>
                    </div>

                    <span className="text-sm text-slate-600">{formatDate(applicant.archivedAt)}</span>

                    <div className="flex justify-center">
                      <button
                        type="button"
                        onClick={() => viewProfile(applicant)}
                        disabled={!applicant.jobseekerId}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-[#2e66a6] transition hover:bg-[#f7faff] disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label={`View ${applicant.applicantName || "applicant"} profile`}
                        title="View profile"
                      >
                        <Icon name="eye" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <Pagination
            currentPage={safePage}
            totalItems={filteredApplicants.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        </section>
      </main>
    </AdminLayout>
  );
};

export default AdminArchiveDeclinedApplicants;
