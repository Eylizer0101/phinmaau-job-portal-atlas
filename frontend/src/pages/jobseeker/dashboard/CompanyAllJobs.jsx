import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../../services/api";
import ApplyJobModal from "../../../components/jobseeker/ApplyJobModal";

const PAGE_OPTIONS = ["10", "50", "100", "All"];
const normalizeJobsResponse = (response) => {
  const data = response?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.jobs)) return data.jobs;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};
const formatSalary = (min, max, hidden) => hidden ? "Salary not disclosed" : (min || max) ? `₱${Number(min || 0).toLocaleString("en-PH")} - ₱${Number(max || min || 0).toLocaleString("en-PH")}` : "Salary not specified";
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
  const [perPage, setPerPage] = useState("10");
  const [selectedJob, setSelectedJob] = useState(null);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [appliedIds, setAppliedIds] = useState([]);

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
        setJobs(normalizeJobsResponse(jobsResponse).filter((job) => String(job?.employer?._id || job?.employer || "") === String(id)));
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

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return jobs;
    return jobs.filter((job) => [job?.title, job?.location, job?.jobType, job?.workMode, job?.category, company?.companyName].some((value) => String(value || "").toLowerCase().includes(query)));
  }, [jobs, search, company]);

  const pageSize = perPage === "All" ? Math.max(filtered.length, 1) : Number(perPage);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const visibleJobs = perPage === "All" ? filtered : filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const pageNumbers = useMemo(() => {
    const start = Math.max(1, Math.min(safePage - 2, totalPages - 4));
    const end = Math.min(totalPages, start + 4);
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }, [safePage, totalPages]);

  useEffect(() => { setPage(1); }, [search, perPage]);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  const handleApply = (job) => {
    if (appliedIds.includes(job._id)) return;
    setSelectedJob(job);
    setShowApplyModal(true);
  };

  if (loading) return <div className="min-h-[70vh] flex items-center justify-center text-black/60">Loading jobs...</div>;
  if (error || !company) return <div className="min-h-[70vh] flex items-center justify-center text-red-600">{error || "Company not found."}</div>;

  return (
    <main className="min-h-screen bg-[#f7f9fc] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1280px]">
        <button type="button" onClick={() => navigate(`/jobseeker/company-details/${id}`, { state: { activeTab: "jobs" } })} className="mb-5 inline-flex items-center gap-2 rounded-xl border border-[#d8e2ee] bg-white px-4 py-2.5 text-sm font-semibold text-[#2e66a6] hover:bg-[#f7faff]">
          <span aria-hidden="true">←</span> Back to Company Details
        </button>

        <section className="rounded-[1.35rem] border border-[#e6edf5] bg-white p-5 shadow-[0_18px_45px_rgba(46,102,166,0.08)] sm:p-7 lg:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-black sm:text-3xl">All Jobs at {company.companyName || "Company"}</h1>
              <p className="mt-1 text-black/60">{filtered.length} open position{filtered.length === 1 ? "" : "s"}</p>
            </div>
            <div className="w-full lg:max-w-md">
              <label htmlFor="job-search" className="mb-2 block text-sm font-semibold text-black/70">Search jobs</label>
              <input id="job-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search title, location, type, or work mode" className="h-12 w-full rounded-xl border border-[#d8e2ee] px-4 text-sm outline-none focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/15" />
            </div>
          </div>

          {visibleJobs.length === 0 ? (
            <div className="mt-7 rounded-2xl border border-dashed border-[#d8e2ee] px-6 py-14 text-center text-black/55">No jobs found.</div>
          ) : (
            <div className="mt-7 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {visibleJobs.map((job) => {
                const applied = appliedIds.includes(job._id);
                return (
                  <article key={job._id} className="group relative flex self-start flex-col overflow-visible rounded-[22px] border border-[#E5E7EB] bg-white p-5 shadow-[0_6px_18px_rgba(0,0,0,0.045)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(33,44,97,0.13)]">
                    {job.isUrgent ? <img src="/images/gentneeded.png" alt="Urgent Hiring" className="pointer-events-none absolute -top-[48px] -left-[50px] z-10 w-[230px] max-w-none select-none" /> : null}
                    <div className="flex items-start gap-4 pr-10">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#d8e2ee] bg-white">
                        {company.companyLogo ? <img src={company.companyLogo} alt={company.companyName || "Company"} className="h-full w-full object-contain p-1" /> : <span className="text-xl font-bold text-[#2e66a6]">{String(company.companyName || "C").charAt(0)}</span>}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h2 className="truncate text-lg font-bold text-gray-800">{String(job.title || "Job Title").replaceAll('"', "")}</h2>
                        <div className="mt-1 flex items-center gap-2"><span className="truncate text-sm font-medium text-gray-600">{company.companyName}</span><img src="/images/checkmo.png" alt="Verified" className="h-5 w-5 shrink-0 object-contain" /></div>
                      </div>
                    </div>

                    <div className="mt-4 overflow-hidden rounded-xl bg-[#F3F4F6] p-4 text-sm text-gray-700">
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
                          {formatSalary(job.salaryMin, job.salaryMax, job.hideSalary).replace(/^₱\s*/, "")}
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
                        onClick={() =>
                          navigate(`/jobseeker/job-details/${job._id}`, {
                            state: {
                              sourcePage: "company-all-jobs",
                              companyId: id,
                            },
                          })
                        }
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

          <Pagination page={safePage} totalPages={totalPages} setPage={setPage} perPage={perPage} setPerPage={setPerPage} pageNumbers={pageNumbers} totalItems={filtered.length} />
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

const Pagination = ({ page, totalPages, setPage, perPage, setPerPage, pageNumbers, totalItems }) => (
  <div className="mt-8 flex flex-col gap-4 border-t border-[#e6edf5] pt-6 xl:flex-row xl:items-center xl:justify-between">
    <div className="text-sm text-black/60">Page {page} of {totalPages} · {totalItems} total</div>
    <div className="flex flex-wrap items-center gap-2">
      <PageButton label="First" disabled={page === 1} onClick={() => setPage(1)} />
      <PageButton label="Previous" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))} />
      {pageNumbers.map((number) => <PageButton key={number} label={String(number)} active={number === page} onClick={() => setPage(number)} />)}
      <PageButton label="Next" disabled={page === totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} />
      <PageButton label="Last" disabled={page === totalPages} onClick={() => setPage(totalPages)} />
      <label className="ml-0 flex items-center gap-2 text-sm font-medium text-black/70 sm:ml-2">Display per page
        <select value={perPage} onChange={(event) => setPerPage(event.target.value)} className="h-10 rounded-lg border border-[#d8e2ee] bg-white px-3 outline-none focus:border-[#2e66a6]">{PAGE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select>
      </label>
    </div>
  </div>
);
const PageButton = ({ label, disabled, active, onClick }) => <button type="button" disabled={disabled} onClick={onClick} className={`h-10 rounded-lg border px-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${active ? "border-[#2e66a6] bg-[#2e66a6] text-white" : "border-[#d8e2ee] bg-white text-black/70 hover:border-[#2e66a6]/50 hover:bg-[#f7faff]"}`}>{label}</button>;

export default CompanyAllJobs;
