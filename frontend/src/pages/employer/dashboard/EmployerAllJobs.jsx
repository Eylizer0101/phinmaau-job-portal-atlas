import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import EmployerLayout from '../../../layouts/EmployerLayout';
import Pagination from '../../../components/shared/Pagination';
import api from '../../../services/api';

const formatSalary = (job) => {
  if (job?.hideSalary) return 'Salary not disclosed';
  const min = Number(job?.salaryMin || 0);
  const max = Number(job?.salaryMax || min || 0);
  if (!min && !max) return 'Salary not specified';
  return `${min.toLocaleString('en-PH')} - ${max.toLocaleString('en-PH')}`;
};

const EmployerAllJobs = () => {
  const navigate = useNavigate();
  const [company, setCompany] = useState({ companyName: '', companyLogo: '' });
  const [jobs, setJobs] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const [profileResponse, jobsResponse] = await Promise.all([
          api.get('/auth/me'),
          api.get('/jobs/employer/my-jobs'),
        ]);
        if (!mounted) return;
        const user = profileResponse?.data?.user || {};
        const profile = user?.employerProfile || {};
        const allJobs = Array.isArray(jobsResponse?.data?.jobs) ? jobsResponse.data.jobs : [];
        setCompany({ companyName: profile.companyName || 'Company', companyLogo: profile.companyLogo || '' });
        setJobs(allJobs.filter((job) => job?.isPublished === true && job?.isActive === true && job?.isArchived !== true));
      } catch (requestError) {
        if (mounted) setError(requestError?.response?.data?.message || 'Unable to load your job posts.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  const filteredJobs = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return jobs;
    return jobs.filter((job) => [job?.title, job?.location].some((value) => String(value || '').toLowerCase().includes(query)));
  }, [jobs, search]);

  const numericPageSize = pageSize === 'all' ? Math.max(filteredJobs.length, 1) : Number(pageSize);
  const totalPages = pageSize === 'all' ? 1 : Math.max(1, Math.ceil(filteredJobs.length / numericPageSize));
  const safePage = Math.min(page, totalPages);
  const visibleJobs = pageSize === 'all' ? filteredJobs : filteredJobs.slice((safePage - 1) * numericPageSize, safePage * numericPageSize);

  useEffect(() => { setPage(1); }, [search, pageSize]);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  return (
    <EmployerLayout>
      <main className="min-h-screen px-1 py-8">
        <div className="mx-auto w-full max-w-7xl">
          <button type="button" onClick={() => navigate('/employer/company-profile', { state: { activeTab: 'jobs' } })} className="mb-5 inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm
           hover:bg-gray-50">
            <svg
               className="w-[18px] h-[18px] shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                          </svg>Back
          </button>

          <section className="rounded-[18px] border border-[#d1d5db] bg-white p-5 shadow-[0_2px_6px_rgba(15,23,42,0.05)] sm:p-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-black sm:text-3xl">All Jobs Post at {company.companyName || 'Company'}</h1>
                <p className="mt-1 text-black/65">{jobs.length} Active Position{jobs.length === 1 ? '' : 's'}</p>
              </div>
              <div className="relative w-full lg:max-w-md">
                <svg className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-black/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="m21 21-4.35-4.35m1.35-5.65a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" /></svg>
                <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search job title or location" className="h-12 w-full rounded-xl border border-[#d8e2ee] py-3 pl-12 pr-4 text-sm outline-none focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/15" />
              </div>
            </div>

            {loading ? <p className="py-16 text-center text-black/60">Loading job posts...</p> : error ? <p className="py-16 text-center text-red-600">{error}</p> : visibleJobs.length === 0 ? (
              <div className="mt-7 rounded-2xl border border-dashed border-[#d8e2ee] px-6 py-14 text-center text-black/55">{jobs.length ? 'No job posts match your search.' : 'No active job posts yet.'}</div>
            ) : (
              <div className="mt-7 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                {visibleJobs.map((job) => (
                  <article key={job._id} className="flex min-h-[315px] flex-col rounded-[22px] border border-[#E5E7EB] bg-white p-5 shadow-[0_6px_18px_rgba(0,0,0,0.045)]">
                    <div className="flex items-start gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#e5e7eb] bg-[#eef3fa]">
                        {company.companyLogo ? <img src={company.companyLogo} alt="" className="h-full w-full object-cover" /> : <span className="text-xl font-bold text-[#2e66a6]">{company.companyName.charAt(0)}</span>}
                      </div>
                      <div className="min-w-0"><h2 className="truncate text-lg font-bold text-gray-800">{job.title || 'Job Title'}</h2><p className="mt-1 truncate text-sm font-medium text-gray-600">{company.companyName}</p></div>
                    </div>
                    <div className="mt-4 space-y-2 rounded-xl bg-[#F3F4F6] p-4 text-sm text-gray-700">
                      <p className="truncate">⌖ &nbsp;{job.location || 'Location not specified'}</p>
                      <p className="truncate">₱ &nbsp;{formatSalary(job)}</p>
                      <p className="truncate">▣ &nbsp;{job.jobType || 'Type not specified'}</p>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">{[job.experienceLevel, job.workMode, job.openToFreshGraduates ? 'Open fresh grad' : ''].filter(Boolean).map((tag) => <span key={tag} className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-[#2e66a6]">{tag}</span>)}</div>
                    <div className="mt-auto border-t border-gray-200 pt-4"><button type="button" onClick={() => navigate(`/employer/manage-jobs/${job._id}/view`)} className="h-10 w-full rounded-xl bg-[#1e4ba0] px-5 text-sm font-semibold text-white hover:bg-[#1b4290]">View Job</button></div>
                  </article>
                ))}
              </div>
            )}

            {!loading && !error ? <Pagination currentPage={safePage} totalItems={filteredJobs.length} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} ariaLabel="Employer job posts pagination" /> : null}
          </section>
        </div>
      </main>
    </EmployerLayout>
  );
};

export default EmployerAllJobs;
