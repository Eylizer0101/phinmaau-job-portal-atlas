import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import EmployerLayout from '../../../layouts/EmployerLayout';

const ArchivedJobs = () => {
  const navigate = useNavigate();

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [action, setAction] = useState({ type: '', jobId: '' });

  const [jobFilter, setJobFilter] = useState('all');
  const [q, setQ] = useState('');
  const [sortBy, setSortBy] = useState('all');

  const [badLogos, setBadLogos] = useState({});
  const [counts, setCounts] = useState({
    active: 0,
    archived: 0,
  });

  const [selectedJob, setSelectedJob] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const modalRef = useRef(null);
  const cancelBtnRef = useRef(null);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const response = await axios.get('http://localhost:5000/api/jobs/employer/my-jobs?archived=true', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setJobs(response.data.jobs || []);
        setCounts({
          active: response.data.activeCount ?? 0,
          archived: response.data.archivedCount ?? 0,
        });
      } else {
        setError('Failed to fetch archived jobs');
      }
    } catch (err) {
      console.error('Error fetching archived jobs:', err);
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/employer/login');
      }
      setError('Failed to load archived jobs. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(''), 3500);
    return () => clearTimeout(t);
  }, [error]);

  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(''), 2500);
    return () => clearTimeout(t);
  }, [success]);

  useEffect(() => {
    if (!showDeleteModal) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [showDeleteModal]);

  useEffect(() => {
    if (!showDeleteModal) return;

    const t = setTimeout(() => cancelBtnRef.current?.focus(), 0);

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowDeleteModal(false);
        setSelectedJob(null);
        return;
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusables = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusables.length) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [showDeleteModal]);

  const closeModal = () => {
    setShowDeleteModal(false);
    setSelectedJob(null);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const safeTitle = (job) => (job.title && job.title.trim() ? job.title : '(Untitled Draft)');
  const safeCompany = (job) => (job.companyName && job.companyName.trim() ? job.companyName : '—');

  const getVacancyValue = (job) => {
    const candidates = [
      job?.vacancy,
      job?.vacancies,
      job?.numberOfVacancies,
      job?.positionsAvailable,
      job?.slots,
      job?.headcount,
      job?.openingCount,
    ];

    const found = candidates.find((value) => value !== undefined && value !== null && value !== '');
    return found ?? '—';
  };

  const formatSalary = (job) => {
    const formatMoney = (value) => {
      const num = Number(value);
      if (Number.isNaN(num)) return null;
      return `₱${num.toLocaleString('en-PH')}`;
    };

    if (job?.salaryMin !== undefined && job?.salaryMax !== undefined) {
      const min = formatMoney(job.salaryMin);
      const max = formatMoney(job.salaryMax);
      if (min && max) return `${min} - ${max}`;
    }

    if (job?.salary !== undefined && job?.salary !== null && job?.salary !== '') {
      const single = formatMoney(job.salary);
      return single || String(job.salary);
    }

    if (job?.salaryRange && String(job.salaryRange).trim()) {
      return String(job.salaryRange).trim();
    }

    return '—';
  };

  const safeDate = (d) => {
    const x = new Date(d || 0);
    return Number.isNaN(x.getTime()) ? new Date(0) : x;
  };

  const handleRestore = async (jobId) => {
    try {
      if (action.jobId) return;
      setAction({ type: 'restore', jobId });

      const token = localStorage.getItem('token');

      await axios.patch(
        `http://localhost:5000/api/jobs/${jobId}/restore`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setJobs((prev) => prev.filter((job) => job._id !== jobId));
      setCounts((prev) => ({
        active: prev.active + 1,
        archived: Math.max(0, prev.archived - 1),
      }));
      setSuccess('Job restored successfully');
    } catch (err) {
      console.error('Error restoring job:', err);
      setError('Failed to restore job');
    } finally {
      setAction({ type: '', jobId: '' });
    }
  };

  const handlePermanentDelete = async (jobId) => {
    try {
      if (action.jobId) return;
      setAction({ type: 'permanent-delete', jobId });

      const token = localStorage.getItem('token');

      await axios.delete(`http://localhost:5000/api/jobs/${jobId}/permanent`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setJobs((prev) => prev.filter((job) => job._id !== jobId));
      setCounts((prev) => ({
        ...prev,
        archived: Math.max(0, prev.archived - 1),
      }));
      closeModal();
      setSuccess('Job permanently deleted successfully');
    } catch (err) {
      console.error('Error permanently deleting job:', err);
      setError('Failed to permanently delete job');
    } finally {
      setAction({ type: '', jobId: '' });
    }
  };

  const jobOptions = useMemo(() => {
    const map = new Map();

    jobs.forEach((job) => {
      const id = job?._id;
      if (!id) return;

      if (!map.has(id)) {
        map.set(id, {
          id,
          title: safeTitle(job),
        });
      }
    });

    return Array.from(map.values());
  }, [jobs]);

  const headerRight = useMemo(() => {
    return (
      <div className="inline-flex items-center rounded-2xl border border-gray-200 bg-white p-1 shadow-sm">
        <button
          type="button"
          onClick={() => navigate('/employer/manage-jobs')}
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 hover:text-gray-900"
        >
          <span>Active</span>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">
            {counts.active}
          </span>
        </button>

        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl bg-[#f5f7fb] px-4 py-2 text-sm font-semibold text-[#2e66a6]"
          aria-current="page"
        >
          <span>Archived</span>
          <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-[#2e66a6]">
            {counts.archived}
          </span>
        </button>
      </div>
    );
  }, [counts.active, counts.archived, navigate]);

  const filteredJobs = useMemo(() => {
    const norm = (s) => (s || '').toLowerCase().trim();
    const query = norm(q);

    let list = [...jobs];

    if (jobFilter !== 'all') {
      list = list.filter((j) => j._id === jobFilter);
    }

    if (query) {
      list = list.filter((j) => {
        const hay = [
          j.title,
          j.companyName,
          j.location,
          j.category,
          j.jobType,
          j.workMode,
          String(getVacancyValue(j)),
          formatSalary(j),
        ]
          .map(norm)
          .join(' ');
        return hay.includes(query);
      });
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - mondayOffset);
    const startOfNextWeek = new Date(startOfWeek);
    startOfNextWeek.setDate(startOfWeek.getDate() + 7);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const startOfNextYear = new Date(now.getFullYear() + 1, 0, 1);

    const getComparableDate = (job) => {
      const createdDate = safeDate(job.createdAt);
      if (createdDate.getTime() !== new Date(0).getTime()) return createdDate;

      const postedDate = safeDate(job.datePosted);
      if (postedDate.getTime() !== new Date(0).getTime()) return postedDate;

      return safeDate(job.updatedAt);
    };

    if (sortBy === 'today') {
      list = list.filter((job) => {
        const date = getComparableDate(job);
        return date >= startOfToday && date < startOfTomorrow;
      });
    } else if (sortBy === 'this_week') {
      list = list.filter((job) => {
        const date = getComparableDate(job);
        return date >= startOfWeek && date < startOfNextWeek;
      });
    } else if (sortBy === 'this_month') {
      list = list.filter((job) => {
        const date = getComparableDate(job);
        return date >= startOfMonth && date < startOfNextMonth;
      });
    } else if (sortBy === 'this_year') {
      list = list.filter((job) => {
        const date = getComparableDate(job);
        return date >= startOfYear && date < startOfNextYear;
      });
    }

    list.sort((a, b) => safeDate(b.createdAt) - safeDate(a.createdAt));

    return list;
  }, [jobs, jobFilter, q, sortBy]);

  const hasActiveFilters = useMemo(() => {
    return q.trim() !== '' || jobFilter !== 'all' || sortBy !== 'all';
  }, [q, jobFilter, sortBy]);

  const clearControls = () => {
    setJobFilter('all');
    setQ('');
    setSortBy('all');
  };

  return (
    <EmployerLayout>
      <div className="mx-auto max-w-7xl px-1 py-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-[33px] font-semibold leading-[40px] text-gray-900">Archived Jobs</h1>
            <p className="mt-1 text-sm text-gray-600">View and restore your archived job postings</p>
          </div>
          <div>{headerRight}</div>
        </div>

        <div className="relative z-20 mb-6 overflow-visible rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="p-5">
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(300px,380px)_minmax(0,1fr)] xl:items-start">
              <div className="relative min-w-0">
                <svg className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
              </svg>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search archived job title, location, category..."
                className="w-full rounded-xl border border-gray-300 py-2.5 pl-11 pr-10 text-gray-900 placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2"
              />
            </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-[minmax(140px,1fr)_minmax(170px,1fr)]">
              <select
                value={jobFilter}
                onChange={(e) => setJobFilter(e.target.value)}
                className="h-11 w-full rounded-xl border border-gray-300 bg-white px-4 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2"
              >
                <option value="all">All Jobs</option>
                {jobOptions.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.title}
                  </option>
                ))}
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="h-11 w-full rounded-xl border border-gray-300 bg-white px-4 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2"
              >
                <option value="all">SORT BY</option>
                <option value="all">All</option>
                <option value="today">Today</option>
                <option value="this_week">This Week</option>
                <option value="this_month">This Month</option>
                <option value="this_year">This Year</option>
              </select>

              </div>
            </div>

            {hasActiveFilters && (
              <div className="mt-2 flex w-full justify-end">
                <button
                  type="button"
                  onClick={clearControls}
                  className="h-11 w-full rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-900 hover:bg-gray-50 sm:w-[220px]"
                >
                  Clear
                </button>
              </div>
            )}

            <p className="mt-3 text-xs text-gray-500">
              Showing <span className="font-semibold text-gray-700">{filteredJobs.length}</span> result(s).
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4" role="alert" aria-live="assertive">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <svg className="mt-0.5 h-5 w-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <p className="text-sm font-medium text-red-900">{error}</p>
              </div>

              <button
                onClick={() => setError('')}
                className="rounded-lg px-2 py-1 text-sm font-medium text-red-700 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                aria-label="Dismiss error"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-5 rounded-xl border border-[#2e66a6]/25 bg-[#2e66a6]/10 p-4" role="status" aria-live="polite">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <svg className="mt-0.5 h-5 w-5 text-[#2e66a6]" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <p className="text-sm font-medium text-gray-900">{success}</p>
              </div>

              <button
                onClick={() => setSuccess('')}
                className="rounded-lg px-2 py-1 text-sm font-medium text-[#2e66a6] hover:bg-[#2e66a6]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6]"
                aria-label="Dismiss success"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="p-6">
            {loading ? (
              <div className="py-14 text-center">
                <div className="inline-block h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-[#2e66a6]" />
                <p className="mt-4 text-sm text-gray-600">Loading archived jobs...</p>
              </div>
            ) : filteredJobs.length === 0 ? (
              <div className="py-14 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M9 8V6a3 3 0 016 0v2m-8 0v10a2 2 0 002 2h6a2 2 0 002-2V8" />
                </svg>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">No archived jobs found</h3>
                <p className="mt-2 text-sm text-gray-600">Archived jobs will appear here after you archive them.</p>
                <div className="mt-6 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => navigate('/employer/manage-jobs')}
                    className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Go to Active Jobs
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-4 md:hidden">
                  {filteredJobs.map((job) => {
                    const title = safeTitle(job);
                    const busyThisRow = action.jobId === job._id;
                    const logoUrl = job.companyLogo && String(job.companyLogo).trim() ? job.companyLogo : '';

                    return (
                      <div key={job._id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                        <div className="flex items-start gap-3">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-gray-100">
                            {logoUrl && !badLogos[job._id] ? (
                              <img
                                src={logoUrl}
                                alt={`${safeCompany(job)} logo`}
                                className="h-full w-full object-cover"
                                onError={() => setBadLogos((prev) => ({ ...prev, [job._id]: true }))}
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-gray-100">
                                <span className="text-sm font-bold text-gray-700">
                                  {(safeCompany(job) || title || 'J').charAt(0)}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <Link
                              to={`/employer/edit-job/${job._id}`}
                              className="block truncate text-sm font-semibold text-gray-900 hover:text-[#2e66a6]"
                              title={title}
                            >
                              {title}
                            </Link>
                            <p className="mt-0.5 truncate text-xs text-gray-600">{safeCompany(job)}</p>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                          <div className="rounded-xl bg-gray-50 p-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Vacancy</p>
                            <p className="mt-1 font-medium text-gray-800">{getVacancyValue(job)}</p>
                          </div>
                          <div className="rounded-xl bg-gray-50 p-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Deadline</p>
                            <p className="mt-1 font-medium text-gray-800">{formatDate(job.applicationDeadline)}</p>
                          </div>
                          <div className="rounded-xl bg-gray-50 p-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Salary</p>
                            <p className="mt-1 font-medium text-gray-800">{formatSalary(job)}</p>
                          </div>
                          <div className="rounded-xl bg-gray-50 p-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Archived</p>
                            <p className="mt-1 font-medium text-gray-800">{formatDate(job.archivedAt)}</p>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-2">
                          <button
                            onClick={() => handleRestore(job._id)}
                            disabled={busyThisRow}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            aria-label={`Restore ${title}`}
                          >
                            {busyThisRow && action.type === 'restore' ? (
                              <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-b-2 border-t-2 border-current" />
                            ) : (
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h11M3 10l4-4m-4 4l4 4m3 4h11" />
                              </svg>
                            )}
                            Restore
                          </button>

                          <Link
                            to={`/employer/edit-job/${job._id}`}
                            className="inline-flex w-full items-center justify-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2"
                            aria-label={`Edit ${title}`}
                          >
                            View / Edit
                          </Link>

                          <button
                            onClick={() => {
                              setSelectedJob(job);
                              setShowDeleteModal(true);
                            }}
                            disabled={busyThisRow}
                            className="inline-flex w-full items-center justify-center rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            aria-label={`Permanently delete ${title}`}
                          >
                            Permanent Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="hidden overflow-x-auto md:block">
                  <table className="min-w-full divide-y divide-gray-200">
                  <colgroup>
                    <col className="w-[31%]" />
                    <col className="w-[10%]" />
                    <col className="w-[15%]" />
                    <col className="w-[14%]" />
                    <col className="w-[12%]" />
                    <col className="w-[22%]" />
                  </colgroup>

                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                        Job Title
                      </th>
                      <th scope="col" className="px-4 py-4 text-center text-xs font-semibold uppercase tracking-wider text-gray-600">
                        Vacancy
                      </th>
                      <th scope="col" className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                        Deadline
                      </th>
                      <th scope="col" className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                        Salary
                      </th>
                      <th scope="col" className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                        Date Archived
                      </th>
                      <th scope="col" className="px-4 py-4 text-center text-xs font-semibold uppercase tracking-wider text-gray-600">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-200 bg-white">
                    {filteredJobs.map((job) => {
                      const title = safeTitle(job);
                      const busyThisRow = action.jobId === job._id;
                      const logoUrl = job.companyLogo && String(job.companyLogo).trim() ? job.companyLogo : '';

                      return (
                        <tr key={job._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 align-middle">
                            <div className="flex items-center gap-3">
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-gray-100">
                                {logoUrl && !badLogos[job._id] ? (
                                  <img
                                    src={logoUrl}
                                    alt={`${safeCompany(job)} logo`}
                                    className="h-full w-full object-cover"
                                    onError={() => setBadLogos((prev) => ({ ...prev, [job._id]: true }))}
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center bg-gray-100">
                                    <span className="text-sm font-bold text-gray-700">
                                      {(safeCompany(job) || title || 'J').charAt(0)}
                                    </span>
                                  </div>
                                )}
                              </div>

                              <div className="min-w-0">
                                <Link
                                  to={`/employer/edit-job/${job._id}`}
                                  className="block truncate text-sm font-semibold text-gray-900 hover:text-[#2e66a6]"
                                  title={title}
                                >
                                  {title}
                                </Link>
                                <div className="truncate text-sm text-gray-600">{safeCompany(job)}</div>
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-4 text-center align-middle">
                            <span className="text-sm font-medium text-gray-800">{getVacancyValue(job)}</span>
                          </td>

                          <td className="px-6 py-4 align-middle">
                            <div className="text-sm font-medium text-gray-800">{formatDate(job.applicationDeadline)}</div>
                          </td>

                          <td className="px-6 py-4 align-middle">
                            <div className="text-sm font-medium text-gray-800">{formatSalary(job)}</div>
                          </td>

                          <td className="px-6 py-4 align-middle">
                            <div className="text-sm font-normal text-gray-600">{formatDate(job.archivedAt)}</div>
                          </td>

                          <td className="px-6 py-4 align-middle">
                            <div className="flex flex-col items-center justify-center gap-2">
                              <div className="flex flex-nowrap items-center justify-center gap-2">
                                <button
                                  onClick={() => handleRestore(job._id)}
                                  disabled={busyThisRow}
                                  className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                  aria-label={`Restore ${title}`}
                                >
                                  {busyThisRow && action.type === 'restore' ? (
                                    <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-b-2 border-t-2 border-current" />
                                  ) : (
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h11M3 10l4-4m-4 4l4 4m3 4h11" />
                                    </svg>
                                  )}
                                  Restore
                                </button>

                                <Link
                                  to={`/employer/edit-job/${job._id}`}
                                  className="inline-flex shrink-0 items-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2"
                                  aria-label={`Edit ${title}`}
                                >
                                  View / Edit
                                </Link>
                              </div>

                              <button
                                onClick={() => {
                                  setSelectedJob(job);
                                  setShowDeleteModal(true);
                                }}
                                disabled={busyThisRow}
                                className="inline-flex w-full max-w-[250px] items-center justify-center rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                aria-label={`Permanently delete ${title}`}
                              >
                                Permanent Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>

        {showDeleteModal && selectedJob && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) closeModal();
            }}
          >
            <div
              ref={modalRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="permanent-delete-title"
              aria-describedby="permanent-delete-desc"
              className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl"
            >
              <div className="p-6">
                <div className="mb-4 flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100">
                    <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </div>

                  <div className="min-w-0">
                    <h3 id="permanent-delete-title" className="text-lg font-semibold text-gray-900">
                      Permanently Delete Job
                    </h3>
                    <p className="mt-1 text-sm text-gray-600">This action cannot be undone.</p>
                  </div>
                </div>

                <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4">
                  <p className="font-semibold text-red-900">
                    “{selectedJob.title || 'Untitled Draft'}”
                  </p>
                  <p id="permanent-delete-desc" className="mt-1 text-sm text-red-800">
                    This job and its related archived record will be permanently deleted from the system.
                  </p>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    ref={cancelBtnRef}
                    onClick={closeModal}
                    disabled={action.type === 'permanent-delete' && action.jobId === selectedJob._id}
                    className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={() => handlePermanentDelete(selectedJob._id)}
                    disabled={action.type === 'permanent-delete' && action.jobId === selectedJob._id}
                    className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:opacity-50"
                  >
                    {action.type === 'permanent-delete' && action.jobId === selectedJob._id ? (
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-b-2 border-t-2 border-white" />
                    ) : (
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                    Permanent Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </EmployerLayout>
  );
};

export default ArchivedJobs;