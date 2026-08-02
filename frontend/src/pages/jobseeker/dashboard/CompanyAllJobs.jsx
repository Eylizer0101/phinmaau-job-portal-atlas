// src/pages/jobseeker/dashboard/CompanyAllJobs.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Bookmark,
  BriefcaseBusiness,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MapPin,
  PhilippinePeso,
  Search,
} from "lucide-react";
import api from "../../../services/api";

const PAGE_SIZE_OPTIONS = ["10", "50", "100", "All"];

const normalizeJobsResponse = (response) => {
  if (Array.isArray(response?.data?.jobs)) return response.data.jobs;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  if (Array.isArray(response?.data)) return response.data;
  return [];
};

const formatSalary = (minimum, maximum) => {
  if (!minimum && !maximum) return "Salary not specified";
  const min = minimum ? Number(minimum).toLocaleString("en-PH") : "";
  const max = maximum ? Number(maximum).toLocaleString("en-PH") : "";
  if (min && max) return `${min} - ${max}`;
  if (min) return `From ${min}`;
  return `Up to ${max}`;
};

const CompanyAllJobs = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState("10");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const [companyResponse, jobsResponse] = await Promise.all([
          api.get(`/companies/verified/${id}`),
          api.get("/jobs"),
        ]);

        const companyData = companyResponse?.data?.company;
        if (!companyData) throw new Error("Company not found.");

        const employerJobs = normalizeJobsResponse(jobsResponse).filter((job) => {
          const employerId =
            typeof job?.employer === "string"
              ? job.employer
              : job?.employer?._id || job?.employer?.id;
          return String(employerId || "") === String(companyData._id || id);
        });

        if (active) {
          setCompany(companyData);
          setJobs(employerJobs);
        }
      } catch (requestError) {
        if (active) {
          setError(requestError?.response?.data?.message || requestError?.message || "Unable to load jobs.");
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [id]);

  const filteredJobs = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return jobs;

    return jobs.filter((job) =>
      [
        job.title,
        job.companyName,
        job.location,
        job.jobType,
        job.workMode,
        job.category,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [jobs, search]);

  const numericPageSize = pageSize === "All" ? Math.max(filteredJobs.length, 1) : Number(pageSize);
  const totalPages = Math.max(1, Math.ceil(filteredJobs.length / numericPageSize));
  const safePage = Math.min(page, totalPages);
  const startIndex = pageSize === "All" ? 0 : (safePage - 1) * numericPageSize;
  const visibleJobs =
    pageSize === "All"
      ? filteredJobs
      : filteredJobs.slice(startIndex, startIndex + numericPageSize);

  useEffect(() => {
    setPage(1);
  }, [search, pageSize]);

  const pageNumbers = useMemo(() => {
    const first = Math.max(1, safePage - 2);
    const last = Math.min(totalPages, first + 4);
    const adjustedFirst = Math.max(1, last - 4);
    return Array.from({ length: last - adjustedFirst + 1 }, (_, index) => adjustedFirst + index);
  }, [safePage, totalPages]);

  if (loading) {
    return <div className="min-h-screen bg-[#f6f8fb] p-8 text-center text-gray-600">Loading jobs...</div>;
  }

  return (
    <div className="min-h-screen bg-[#f6f8fb] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1280px]">
        <button
          type="button"
          onClick={() => navigate(`/jobseeker/company-details/${id}`, { state: { activeTab: "jobs" } })}
          className="inline-flex items-center gap-2 rounded-xl border border-[#d8e2ee] bg-white px-4 py-2.5 text-sm font-semibold text-[#172033] hover:bg-[#f7faff]"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
          Back to Company Details
        </button>

        <section className="mt-5 rounded-[24px] border border-[#dfe7f0] bg-white p-5 shadow-[0_18px_45px_rgba(46,102,166,0.08)] sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[#172033] sm:text-3xl">
                All Jobs at {company?.companyName || "Company"}
              </h1>
              <p className="mt-1 text-sm text-black/60">{filteredJobs.length} open position{filteredJobs.length === 1 ? "" : "s"}</p>
            </div>

            <div className="relative w-full lg:max-w-md">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" strokeWidth={1.8} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search job title, location, type, or work mode..."
                className="h-12 w-full rounded-xl border border-[#d8e2ee] bg-white pl-12 pr-4 text-sm outline-none focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/15"
              />
            </div>
          </div>

          {error ? <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

          <div className="mt-7 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {visibleJobs.length === 0 ? (
              <div className="col-span-full rounded-2xl border border-dashed border-[#d8e2ee] px-6 py-14 text-center text-gray-500">
                No matching jobs found.
              </div>
            ) : (
              visibleJobs.map((job) => (
                <article key={job._id || job.id} className="flex min-h-[300px] flex-col rounded-2xl border border-[#dfe7f0] bg-white p-5 transition hover:shadow-md">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-bold text-[#172033]">{job.title || "Job Title"}</h2>
                      <p className="mt-1 truncate text-sm text-black/60">{company?.companyName || job.companyName || "Company"}</p>
                    </div>
                    <Bookmark className="h-5 w-5 shrink-0 text-[#60758a]" strokeWidth={1.8} />
                  </div>

                  <div className="mt-5 space-y-3 rounded-xl bg-[#f7f9fc] p-4 text-sm text-black/70">
                    <div className="flex min-w-0 items-center gap-2">
                      <MapPin className="h-4 w-4 shrink-0 text-[#60758a]" strokeWidth={1.8} />
                      <span className="truncate">{job.location || company?.location || "Location not specified"}</span>
                    </div>
                    <div className="flex min-w-0 items-center gap-2">
                      <PhilippinePeso className="h-4 w-4 shrink-0 text-[#60758a]" strokeWidth={1.8} />
                      <span className="truncate">{formatSalary(job.salaryMin, job.salaryMax)}</span>
                    </div>
                    <div className="flex min-w-0 items-center gap-2">
                      <BriefcaseBusiness className="h-4 w-4 shrink-0 text-[#60758a]" strokeWidth={1.8} />
                      <span className="truncate">{job.jobType || "Employment type not specified"}</span>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {[job.experienceLevel, job.workMode, job.openToFreshGraduates ? "Open fresh grad" : ""]
                      .filter(Boolean)
                      .slice(0, 3)
                      .map((tag) => (
                        <span key={tag} className="rounded-full border border-[#bfd4ea] bg-[#eaf2fb] px-2.5 py-1 text-[11px] font-semibold text-[#2e66a6]">
                          {tag}
                        </span>
                      ))}
                  </div>

                  <div className="mt-auto border-t border-[#e5ebf2] pt-5">
                    <button
                      type="button"
                      onClick={() => navigate(`/jobseeker/job-details/${job._id || job.id}`, { state: { sourcePage: "company-jobs" } })}
                      className="inline-flex items-center gap-2 text-sm font-semibold text-[#2e66a6] hover:text-[#25578f]"
                    >
                      View Details
                      <ChevronRight className="h-4 w-4" strokeWidth={1.8} />
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>

          <div className="mt-7 flex flex-col gap-4 border-t border-[#e5ebf2] pt-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-3 text-sm text-black/60">
              <span>Display per page</span>
              <select
                value={pageSize}
                onChange={(event) => setPageSize(event.target.value)}
                className="h-10 rounded-lg border border-[#d8e2ee] bg-white px-3 outline-none focus:border-[#2e66a6]"
              >
                {PAGE_SIZE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
              <span>
                Showing {filteredJobs.length === 0 ? 0 : startIndex + 1}-
                {pageSize === "All" ? filteredJobs.length : Math.min(startIndex + numericPageSize, filteredJobs.length)} of {filteredJobs.length}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <PaginationButton label="First Page" disabled={safePage === 1} onClick={() => setPage(1)} icon={<ChevronsLeft className="h-4 w-4" />} />
              <PaginationButton label="Previous" disabled={safePage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} icon={<ChevronLeft className="h-4 w-4" />} />
              {pageNumbers.map((number) => (
                <button
                  key={number}
                  type="button"
                  onClick={() => setPage(number)}
                  className={`h-10 min-w-10 rounded-lg border px-3 text-sm font-semibold ${
                    number === safePage
                      ? "border-[#2e66a6] bg-[#2e66a6] text-white"
                      : "border-[#d8e2ee] bg-white text-[#172033] hover:bg-[#f7faff]"
                  }`}
                >
                  {number}
                </button>
              ))}
              <PaginationButton label="Next" disabled={safePage === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))} icon={<ChevronRight className="h-4 w-4" />} iconRight />
              <PaginationButton label="Last Page" disabled={safePage === totalPages} onClick={() => setPage(totalPages)} icon={<ChevronsRight className="h-4 w-4" />} iconRight />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

const PaginationButton = ({ label, disabled, onClick, icon, iconRight = false }) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-[#d8e2ee] bg-white px-3 text-sm font-semibold text-[#172033] hover:bg-[#f7faff] disabled:cursor-not-allowed disabled:opacity-40"
  >
    {!iconRight ? icon : null}
    <span className="hidden sm:inline">{label}</span>
    {iconRight ? icon : null}
  </button>
);

export default CompanyAllJobs;
