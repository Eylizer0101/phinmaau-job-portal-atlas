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
                  <article key={job._id} className="relative flex min-h-[375px] flex-col rounded-2xl border border-[#E5E7EB] bg-white p-7 shadow-sm transition hover:shadow-md">
                    {job.isUrgent ? <img src="/images/gentneeded.png" alt="Urgent Hiring" className="pointer-events-none absolute -left-[50px] -top-[52px] z-10 w-[230px] max-w-none select-none" /> : null}
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
                      <p className="truncate">⌖ {shortLocation(job.location || company.location)}</p>
                      <p className="mt-2 truncate">₱ {formatSalary(job.salaryMin, job.salaryMax, job.hideSalary).replace(/^₱\s*/, "")}</p>
                      <p className="mt-2 truncate">▣ {job.jobType || "Employment type not specified"}</p>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {[job.experienceLevel, job.workMode, job.openToFreshGraduates ? "Open Fresh Grads" : ""].filter(Boolean).map((tag) => <span key={tag} className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-[#2e66a6]">{tag}</span>)}
                    </div>

                    <div className="mt-auto pt-5">
                      <div className="mb-5 h-px w-full bg-gray-300/80" />
                      <div className="flex items-center justify-between gap-4">
                        <button type="button" onClick={() => navigate(`/jobseeker/job-details/${job._id}`, { state: { sourcePage: "company-all-jobs", companyId: id } })} className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-800">View Details <span aria-hidden="true">›</span></button>
                        <button type="button" onClick={() => handleApply(job)} disabled={applied} className={`rounded-lg px-5 py-2 text-sm font-semibold transition disabled:pointer-events-none ${applied ? "border border-blue-200 bg-blue-100 text-blue-700" : "bg-[#1e4ba0] text-white hover:bg-[#1b4290]"}`}>{applied ? "Already Applied" : "Apply Now"}</button>
                      </div>
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
