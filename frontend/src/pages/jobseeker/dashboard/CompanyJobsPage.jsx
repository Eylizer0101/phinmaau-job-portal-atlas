import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../../services/api";

const PAGE_OPTIONS = [10, 50, 100, "all"];

const normalizeJobsResponse = (response) => {
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.jobs)) return response.data.jobs;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  return [];
};

const money = (value) => `₱${Number(value || 0).toLocaleString("en-PH")}`;
const formatSalary = (job) => {
  if (job?.salaryMin != null && job?.salaryMax != null) return `${money(job.salaryMin)} - ${money(job.salaryMax)}`;
  if (job?.salaryMin != null) return `From ${money(job.salaryMin)}`;
  if (job?.salaryMax != null) return `Up to ${money(job.salaryMax)}`;
  return "Salary not specified";
};

const Pagination = ({ currentPage, totalPages, onPageChange, pageSize, onPageSizeChange }) => {
  const pages = useMemo(() => {
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, start + 4);
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }, [currentPage, totalPages]);
  return (
    <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-[#dfe7f0] bg-white p-4 lg:flex-row lg:items-center lg:justify-between">
      <label className="flex items-center gap-3 text-sm text-black/70">Display per page
        <select value={pageSize} onChange={(event) => onPageSizeChange(event.target.value)} className="h-10 rounded-lg border border-[#d8e2ee] bg-white px-3 outline-none focus:border-[#2e66a6]">
          {PAGE_OPTIONS.map((option) => <option key={option} value={option}>{option === "all" ? "All" : option}</option>)}
        </select>
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => onPageChange(1)} disabled={currentPage === 1} className="h-10 rounded-lg border border-[#d8e2ee] px-3 text-sm disabled:opacity-40">First Page</button>
        <button type="button" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} className="h-10 rounded-lg border border-[#d8e2ee] px-3 text-sm disabled:opacity-40">Previous</button>
        {pages.map((page) => <button key={page} type="button" onClick={() => onPageChange(page)} className={`h-10 min-w-10 rounded-lg border px-3 text-sm font-semibold ${page === currentPage ? "border-[#2e66a6] bg-[#2e66a6] text-white" : "border-[#d8e2ee] bg-white"}`}>{page}</button>)}
        <button type="button" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} className="h-10 rounded-lg border border-[#d8e2ee] px-3 text-sm disabled:opacity-40">Next</button>
        <button type="button" onClick={() => onPageChange(totalPages)} disabled={currentPage === totalPages} className="h-10 rounded-lg border border-[#d8e2ee] px-3 text-sm disabled:opacity-40">Last Page</button>
      </div>
    </div>
  );
};

const CompanyJobsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState("10");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const [companyResponse, jobsResponse] = await Promise.all([api.get(`/companies/verified/${id}`), api.get("/jobs")]);
        const companyData = companyResponse?.data?.company || null;
        const allJobs = normalizeJobsResponse(jobsResponse);
        const companyJobs = allJobs.filter((job) => {
          const employerId = typeof job?.employer === "string" ? job.employer : job?.employer?._id || job?.employer?.id;
          return String(employerId || "") === String(id);
        });
        if (active) { setCompany(companyData); setJobs(companyJobs); }
      } catch (requestError) {
        if (active) setError(requestError?.response?.data?.message || "Unable to load company jobs.");
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [id]);

  const filteredJobs = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return jobs;
    return jobs.filter((job) => [job?.title, job?.companyName, job?.location, job?.jobType, job?.workMode, job?.category, job?.description]
      .some((value) => String(value || "").toLowerCase().includes(query)));
  }, [jobs, search]);

  const numericPageSize = pageSize === "all" ? Math.max(1, filteredJobs.length) : Number(pageSize);
  const totalPages = Math.max(1, Math.ceil(filteredJobs.length / numericPageSize));
  const safePage = Math.min(currentPage, totalPages);
  const visibleJobs = pageSize === "all" ? filteredJobs : filteredJobs.slice((safePage - 1) * numericPageSize, safePage * numericPageSize);
  useEffect(() => { setCurrentPage(1); }, [search, pageSize]);

  if (loading) return <div className="mx-auto max-w-6xl px-6 py-16 text-center">Loading jobs...</div>;
  if (error || !company) return <div className="mx-auto max-w-6xl px-6 py-16 text-center text-red-600">{error || "Company not found."}</div>;

  return (
    <main className="mx-auto w-full max-w-[1280px] px-4 pb-12 pt-8 sm:px-6 lg:px-8">
      <button type="button" onClick={() => navigate(`/jobseeker/company-details/${id}`, { state: { activeTab: "jobs" } })} className="mb-5 inline-flex items-center gap-2 rounded-xl border border-[#d8e2ee] bg-white px-4 py-2.5 text-sm font-semibold hover:bg-[#f7faff]">← Back to Company Details</button>
      <section className="rounded-[1.35rem] border border-[#e6edf5] bg-white p-5 shadow-[0_18px_45px_rgba(46,102,166,0.08)] sm:p-7 lg:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#2e66a6]">Company Jobs</p>
            <h1 className="mt-2 text-3xl font-bold text-black">All jobs at {company.companyName || "Company"}</h1>
            <p className="mt-2 text-black/60">{filteredJobs.length} job{filteredJobs.length === 1 ? "" : "s"} found</p>
          </div>
          <div className="w-full lg:max-w-md">
            <label htmlFor="job-search" className="mb-2 block text-sm font-semibold text-black/70">Search jobs</label>
            <input id="job-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search title, location, type, or work mode..." className="h-12 w-full rounded-xl border border-[#d8e2ee] px-4 outline-none focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/15" />
          </div>
        </div>

        <div className="mt-7 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {visibleJobs.length === 0 ? <div className="col-span-full rounded-2xl border border-dashed border-[#cbd8e6] bg-[#fbfcfe] p-10 text-center text-black/60">No jobs matched your search.</div> : visibleJobs.map((job) => (
            <article key={job?._id || job?.id} className="flex min-h-[310px] flex-col rounded-2xl border border-[#dfe7f0] bg-white p-6 shadow-[0_10px_28px_rgba(46,102,166,0.06)]">
              <div>
                <h2 className="text-xl font-bold text-black">{job?.title || "Untitled Job"}</h2>
                <p className="mt-1 text-sm text-black/60">{company.companyName}</p>
              </div>
              <div className="mt-5 space-y-3 rounded-xl bg-[#f7f9fc] p-4 text-sm text-black/70">
                <p>📍 {job?.location || "Location not specified"}</p>
                <p>💰 {formatSalary(job)}</p>
                <p>💼 {job?.jobType || "Employment type not specified"}</p>
                <p>🏢 {job?.workMode || "Work mode not specified"}</p>
              </div>
              <div className="mt-auto pt-6">
                <button type="button" onClick={() => navigate(`/jobseeker/job-details/${job?._id || job?.id}`)} className="h-11 w-full rounded-xl bg-[#2e66a6] px-5 text-sm font-semibold text-white hover:bg-[#25578f]">View Job</button>
              </div>
            </article>
          ))}
        </div>

        {filteredJobs.length > 0 ? <Pagination currentPage={safePage} totalPages={totalPages} onPageChange={(page) => setCurrentPage(Math.min(Math.max(1, page), totalPages))} pageSize={pageSize} onPageSizeChange={setPageSize} /> : null}
      </section>
    </main>
  );
};

export default CompanyJobsPage;
