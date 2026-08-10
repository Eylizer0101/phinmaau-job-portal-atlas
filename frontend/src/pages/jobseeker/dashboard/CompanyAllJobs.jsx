import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../../services/api";
import ApplyJobModal from "../../../components/jobseeker/ApplyJobModal";
import Pagination from "../../../components/shared/Pagination";
import { filterOpenJobListings } from "../../../utils/jobVisibility";

const normalizeJobsResponse = (response) => {
  const data = response?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.jobs)) return data.jobs;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};
const formatSalary = (min, max, hidden) => hidden ? "Salary not disclosed" : (min || max) ? `${Number(min || 0).toLocaleString("en-PH")} - ${Number(max || min || 0).toLocaleString("en-PH")}` : "Salary not specified";
const shortLocation = (value) => String(value || "Location not specified").split(",").slice(0, 3).join(", ");

const normalizeBoolean = (value) => {
  if (typeof value === "boolean") return value;
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "on";
};

const normalizeExperienceLevelValue = (value) => String(value || "").trim().toLowerCase();

const isFreshGraduateJob = (job) => normalizeBoolean(job?.openToFreshGraduates);

const getExperienceBadgeLabel = (experienceLevel) => {
  const raw = String(experienceLevel || "").trim();
  if (!raw) return "";

  const normalized = normalizeExperienceLevelValue(raw);

  if (normalized === "no experience required") return "No Experience";
  if (["less than 1 yr", "less than 1 year", "less than 1 yr exp", "less than 1 year exp"].includes(normalized)) return "Less than 1 Yr Exp";
  if (["1 year", "1 years", "2 year", "2 years", "3 year", "3 years", "1-3 years", "1-3 years exp"].includes(normalized)) return "1-3 Years Exp";
  if (["4 year", "4 years", "5 year", "5 years", "4-5 years", "4-5 years exp"].includes(normalized)) return "4-5 Years Exp";
  if (["6+ year", "6+ years", "6+ year exp", "6+ years exp"].includes(normalized)) return "6+ Years Exp";

  return raw;
};

const normalizeWorkModeLabel = (value) => {
  const normalized = String(value || "").trim().toLowerCase();

  if (!normalized) return "";
  if (normalized.includes("hybrid") || normalized.includes("blended")) return "Blended";
  if (normalized.includes("work from home") || normalized.includes("wfh")) return "Work from Home";
  if (normalized.includes("remote")) return "Remote";
  if (normalized.includes("on-site") || normalized.includes("onsite") || normalized.includes("on site")) return "On-site";

  return "";
};

const CompanyAllJobs = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedJob, setSelectedJob] = useState(null);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [appliedIds, setAppliedIds] = useState([]);
  const [savedJobIds, setSavedJobIds] = useState([]);
  const [savingJobId, setSavingJobId] = useState("");
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const toastTimerRef = useRef(null);

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });

    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }

    toastTimerRef.current = window.setTimeout(() => {
      setToast({ show: false, message: "", type: "success" });
    }, 2200);
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const [companyResponse, jobsResponse] = await Promise.all([
          api.get(`/companies/verified/${id}`),
          api.get("/jobs"),
        ]);
        if (!mounted) return;
        const companyData = companyResponse?.data?.company || null;
        setCompany(companyData);
        setJobs(filterOpenJobListings(normalizeJobsResponse(jobsResponse)).filter((job) => String(job?.employer?._id || job?.employer || "") === String(id)));
      } catch (err) {
        if (mounted) setError(err?.response?.data?.message || "Unable to load company jobs.");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [id]);

  useEffect(() => {
    let mounted = true;
    const checkApplications = async () => {
      const token = localStorage.getItem("token");
      if (!token || !jobs.length) return;
      const results = await Promise.all(jobs.map(async (job) => {
        try {
          const response = await api.get(`/applications/job/${job._id}/check`);
          return response?.data?.hasApplied || response?.data?.applied ? job._id : null;
        } catch { return null; }
      }));
      if (mounted) setAppliedIds(results.filter(Boolean));
    };
    checkApplications();
    return () => { mounted = false; };
  }, [jobs]);

  useEffect(() => {
    let mounted = true;

    const fetchSavedJobs = async () => {
      try {
        const token = localStorage.getItem("token");
        const userStr = localStorage.getItem("user");

        if (!token || !userStr) {
          if (mounted) setSavedJobIds([]);
          return;
        }

        const parsedUser = JSON.parse(userStr);
        if (parsedUser.role !== "jobseeker") {
          if (mounted) setSavedJobIds([]);
          return;
        }

        const response = await api.get("/jobs/saved");
        if (!mounted) return;

        if (response.data?.success && Array.isArray(response.data.jobs)) {
          setSavedJobIds(response.data.jobs.map((job) => job._id || job.id).filter(Boolean));
        } else {
          setSavedJobIds([]);
        }
      } catch {
        if (mounted) setSavedJobIds([]);
      }
    };

    fetchSavedJobs();
    return () => { mounted = false; };
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return jobs;
    return jobs.filter((job) => [job?.title, job?.location, job?.jobType, job?.workMode, job?.category, company?.companyName].some((value) => String(value || "").toLowerCase().includes(query)));
  }, [jobs, search, company]);

  const numericPageSize = pageSize === "all" ? Math.max(filtered.length, 1) : Number(pageSize);
  const totalPages = pageSize === "all" ? 1 : Math.max(1, Math.ceil(filtered.length / numericPageSize));
  const safePage = Math.min(page, totalPages);
  const visibleJobs = pageSize === "all"
    ? filtered
    : filtered.slice((safePage - 1) * numericPageSize, safePage * numericPageSize);

  useEffect(() => { setPage(1); }, [search, pageSize]);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  const handleApply = (job) => {
    if (appliedIds.includes(job._id)) return;
    setSelectedJob(job);
    setShowApplyModal(true);
  };

  const handleSaveJob = async (job) => {
    try {
      const token = localStorage.getItem("token");
      const userStr = localStorage.getItem("user");
      const jobId = job?._id || job?.id;

      if (!token || !userStr) {
        navigate("/login");
        return;
      }

      const parsedUser = JSON.parse(userStr);

      if (parsedUser.role !== "jobseeker") {
        alert("Only job seekers can save jobs.");
        return;
      }

      if (!jobId) {
        alert("Job data not found.");
        return;
      }

      setSavingJobId(jobId);

      const isSaved = savedJobIds.includes(jobId);

      if (isSaved) {
        const response = await api.delete(`/jobs/saved/${jobId}`);
        if (response.data?.success) {
          setSavedJobIds((prev) => prev.filter((savedId) => savedId !== jobId));
          showToast("Saved job removed", "success");
        } else {
          alert(response.data?.message || "Failed to remove saved job.");
        }
      } else {
        const response = await api.post(`/jobs/saved/${jobId}`);
        if (response.data?.success) {
          setSavedJobIds((prev) => (prev.includes(jobId) ? prev : [...prev, jobId]));
          showToast("Job Saved Successfully!", "success");
        } else {
          alert(response.data?.message || "Failed to save job.");
        }
      }
    } catch (error) {
      alert(error.response?.data?.message || "Failed to update saved job.");
    } finally {
      setSavingJobId("");
    }
  };

  if (loading) return <div className="min-h-[70vh] flex items-center justify-center text-black/60">Loading jobs...</div>;
  if (error || !company) return <div className="min-h-[70vh] flex items-center justify-center text-red-600">{error || "Company not found."}</div>;

  return (
    <main className="min-h-screen bg-[#f7f9fc] px-4 py-8 sm:px-6 lg:px-8">
      {toast.show && (
        <div className="fixed top-[100px] left-1/2 -translate-x-1/2 z-[9999] pointer-events-none">
          <div className={`inline-flex items-center gap-3 rounded-2xl border px-7 py-4 text-base font-semibold shadow-xl ${
            toast.type === "error"
              ? "border-red-200 bg-red-100 text-red-700"
              : "border-blue-200 bg-blue-100 text-blue-700"
          }`}>
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
            <span>{toast.message}</span>
          </div>
        </div>
      )}
      <div className="mx-auto w-full max-w-[1280px]">
        <button type="button" onClick={() => navigate(`/jobseeker/company-details/${id}`, { state: { activeTab: "jobs" } })} className="mb-5 inline-flex items-center gap-2 rounded-xl border border-[#d8e2ee] bg-white px-4 py-2.5 text-sm font-semibold text-[#2e66a6] hover:bg-[#f7faff]">
          <svg
            className="w-[18px] h-[18px] shrink-0 rotate-180"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
          Back to Company Details
        </button>

        <section className="rounded-[1.35rem] border border-[#e6edf5] bg-white p-5 shadow-[0_18px_45px_rgba(46,102,166,0.08)] sm:p-7 lg:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-black sm:text-3xl">All Jobs at {company.companyName || "Company"}</h1>
              <p className="mt-1 text-black/60">{jobs.length} open position{jobs.length === 1 ? "" : "s"}</p>
            </div>
            <div className="w-full lg:max-w-md">
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-black/35">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="m21 21-4.35-4.35m1.35-5.65a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
                <input
                  id="job-search"
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search jobs, title, or location"
                  className="h-12 w-full rounded-xl border border-[#d8e2ee] pl-12 pr-4 text-sm outline-none focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/15"
                  aria-label="Search jobs"
                />
              </div>
            </div>
          </div>

          {visibleJobs.length === 0 ? (
            <div className="mt-7 rounded-2xl border border-dashed border-[#d8e2ee] px-6 py-14 text-center text-black/55">
              {jobs.length === 0 ? "No open positions available." : "No jobs found matching your search."}
            </div>
          ) : (
            <div className="mt-7 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {visibleJobs.map((job) => {
                const applied = appliedIds.includes(job._id);
                const jobId = job._id || job.id;
                const isSavedJob = savedJobIds.includes(jobId);
                const isSavingThisJob = savingJobId === jobId;
                return (
                  <article
                    key={job._id}
                    role="link"
                    tabIndex={0}
                    onClick={() =>
                      navigate(`/jobseeker/job-details/${job._id}`, {
                        state: {
                          sourcePage: "company-all-jobs",
                          companyId: id,
                        },
                      })
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        navigate(`/jobseeker/job-details/${job._id}`, {
                          state: {
                            sourcePage: "company-all-jobs",
                            companyId: id,
                          },
                        });
                      }
                    }}
                    className="group relative flex cursor-pointer self-start flex-col overflow-visible rounded-[22px] border border-[#E5E7EB] bg-white p-5 shadow-[0_6px_18px_rgba(0,0,0,0.045)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(33,44,97,0.13)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2"
                    aria-label={`View details for ${job.title || "job"}`}
                  >
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleSaveJob(job);
                      }}
                      disabled={isSavingThisJob}
                      className={`absolute top-5 right-5 h-10 w-10 rounded-xl flex items-center justify-center transition ${
                        isSavedJob ? "text-blue-700 hover:bg-blue-100" : "text-gray-700 hover:bg-gray-50"
                      }`}
                      aria-label={`${isSavedJob ? "Remove saved" : "Save"} ${job.title || "job"}`}
                      title={isSavedJob ? "Remove Saved Job" : "Save Job"}
                    >
                      {isSavingThisJob ? (
                        <span className="inline-block w-5 h-5 rounded-full border-2 border-gray-300 border-t-blue-700 animate-spin" />
                      ) : isSavedJob ? (
                        <svg
                          className="w-5 h-5 text-blue-700"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <path d="M6 4.75A2.75 2.75 0 018.75 2h6.5A2.75 2.75 0 0118 4.75V21a.75.75 0 01-1.154.638L12 18.58l-4.846 3.058A.75.75 0 016 21V4.75z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="1.8"
                            d="M6 4.75A1.75 1.75 0 017.75 3h8.5A1.75 1.75 0 0118 4.75V21l-5-3-5 3V4.75z"
                          />
                        </svg>
                      )}
                    </button>

                    <div className="flex items-start gap-4 pr-10">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#d8e2ee] bg-white p-1">
  {company.companyLogo ? (
    <img
      src={company.companyLogo}
      alt={company.companyName || "Company"}
      className="h-full w-full rounded-2xl object-cover"
    />
  ) : (
    <span className="text-xl font-bold text-[#2e66a6]">
      {String(company.companyName || "C").charAt(0)}
    </span>
  )}
</div>
                      <div className="min-w-0 flex-1">
                        <h2 className="truncate text-lg font-bold text-gray-800">{String(job.title || "Job Title").replaceAll('"', "")}</h2>
                        <div className="mt-1 flex items-center gap-2"><span className="truncate text-sm font-medium text-gray-600">{company.companyName}</span><img src="/images/checkmo.png" alt="Verified" className="h-5 w-5 shrink-0 object-contain" /></div>
                      </div>
                    </div>

                    <div
                      className={`relative mt-4 overflow-hidden rounded-xl bg-[#F3F4F6] p-4 text-sm text-gray-700 ${
                        normalizeBoolean(job?.isUrgent) ? "pr-[108px]" : ""
                      }`}
                    >
                      {normalizeBoolean(job?.isUrgent) ? (
                       <img
                              src="/images/urgentneed.png"
                              alt="Urgent Hiring"
                              draggable="false"
                             className="pointer-events-none absolute -right-5 bottom-1 w-[112px] max-w-[38%] h-auto object-contain select-none"
                            />
                      ) : null}
                      <div className="flex min-w-0 items-center gap-2">
                        <svg
                          className="h-4 w-4 shrink-0 text-gray-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                        <span className="min-w-0 flex-1 truncate">
                          {shortLocation(job.location || company.location)}
                        </span>
                      </div>

                      <div className="mt-2 flex min-w-0 items-center gap-2">
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center text-[14px] font-extrabold leading-none text-gray-600">
                          ₱
                        </span>
                        <span className="min-w-0 flex-1 truncate">
                          {formatSalary(job.salaryMin, job.salaryMax, job.hideSalary)}
                        </span>
                      </div>

                      <div className="mt-2 flex min-w-0 items-center gap-2">
                        <svg
                          className="h-4 w-4 shrink-0 text-gray-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                          />
                        </svg>
                        <span className="min-w-0 flex-1 truncate">
                          {job.jobType || "Full Time Work"}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      {getExperienceBadgeLabel(job.experienceLevel) ? (
                        <span className="whitespace-nowrap rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-[#2e66a6]">
                          {getExperienceBadgeLabel(job.experienceLevel)}
                        </span>
                      ) : null}

                      {normalizeWorkModeLabel(job.workMode || job.workArrangement || job.workSetup || job.setup) ? (
                        <span className="whitespace-nowrap rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-[#2e66a6]">
                          {normalizeWorkModeLabel(job.workMode || job.workArrangement || job.workSetup || job.setup)}
                        </span>
                      ) : null}

                      {isFreshGraduateJob(job) ? (
                        <span className="whitespace-nowrap rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-[#2e66a6]">
                          Open fresh grad
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-3">
                      <div className="mb-4 h-px w-full bg-gray-300/80" />
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          navigate(`/jobseeker/job-details/${job._id}`, {
                            state: {
                              sourcePage: "company-all-jobs",
                              companyId: id,
                            },
                          });
                        }}
                        disabled={applied}
                        className={`h-[40px] w-full rounded-xl px-5 text-sm font-semibold transition disabled:pointer-events-none ${
                          applied
                            ? "border border-blue-200 bg-blue-100 text-blue-700"
                            : "bg-[#1e4ba0] text-white hover:bg-[#1b4290]"
                        }`}
                        aria-disabled={applied}
                        title={applied ? "You already applied for this job" : "Open job details to apply"}
                      >
                        {applied ? "Already Applied" : "Apply Now"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <Pagination
            currentPage={safePage}
            totalItems={filtered.length}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            ariaLabel="Company jobs pagination"
          />
        </section>
      </div>

      {showApplyModal && selectedJob ? (
        <ApplyJobModal
          job={selectedJob}
          isOpen={showApplyModal}
          onClose={() => { setShowApplyModal(false); setSelectedJob(null); }}
          onApplicationSubmitted={() => { setAppliedIds((current) => [...new Set([...current, selectedJob._id])]); }}
        />
      ) : null}
    </main>
  );
};

export default CompanyAllJobs;
