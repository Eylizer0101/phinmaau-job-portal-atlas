import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import EmployerLayout from '../../../layouts/EmployerLayout';

/* =======================
   Small UI helpers
======================= */
const Icon = ({ name, className = 'h-5 w-5', ...props }) => {
  const common = { className, fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24', ...props };
  switch (name) {
    case 'search':
      return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.3-4.3m1.3-5.2a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>;
    case 'eye':
      return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
    case 'check':
      return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>;
    case 'x':
      return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>;
    case 'plus':
      return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" /></svg>;
    case 'calendar':
      return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3M5 11h14M6 5h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2z" /></svg>;
    case 'archive':
      return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7H4m2 0v11a2 2 0 002 2h8a2 2 0 002-2V7M9 11h6M5 7l1-3h12l1 3" /></svg>;
    case 'edit':
      return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>;
    case 'trash':
      return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14M10 11v5m4-5v5" /></svg>;
    default:
      return null;
  }
};

const cn = (...classes) => classes.filter(Boolean).join(' ');

const ITEMS_PER_PAGE = 9;

const Button = ({ variant = 'secondary', size = 'md', leftIcon, children, className, disabled, ...props }) => {
  const base = 'inline-flex items-center justify-center gap-2 font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-80';
  const sizes = { xs: 'px-2 py-1.5 text-xs rounded-lg', sm: 'px-3 py-2 text-sm rounded-lg', md: 'px-4 py-3 text-sm rounded-xl' };
  const variants = {
    secondary: 'border border-gray-200 bg-white text-gray-900 hover:bg-gray-50 focus-visible:ring-[#2e66a6]',
    primary: 'bg-[#2e66a6] text-white hover:bg-[#23508a] focus-visible:ring-[#2e66a6]',
    dangerSoft: 'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 focus-visible:ring-red-600',
  };

  return (
    <button type="button" className={cn(base, sizes[size], variants[variant], className)} disabled={disabled} {...props}>
      {leftIcon}
      {children}
    </button>
  );
};

const Alert = ({ type = 'error', children, onClose }) => {
  const isError = type === 'error';
  const styles = isError ? 'border-red-200 bg-red-50 text-red-900' : 'border-blue-200 bg-blue-50 text-[#2e66a6]';
  return (
    <div className={cn('mb-5 flex items-start justify-between gap-4 rounded-xl border p-4 text-sm font-medium', styles)} role={isError ? 'alert' : 'status'} aria-live={isError ? 'assertive' : 'polite'}>
      <div className="min-w-0">{children}</div>
      {onClose && (
        <button type="button" onClick={onClose} className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6]" aria-label="Dismiss message">
          Dismiss
        </button>
      )}
    </div>
  );
};

const ManageJobs = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  const [selectedJob, setSelectedJob] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [action, setAction] = useState({ type: '', jobId: '' });

  const modalRef = useRef(null);
  const cancelBtnRef = useRef(null);

  const [jobFilter, setJobFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('overall');
  const [q, setQ] = useState('');
  const [sortBy, setSortBy] = useState('most_recent');
  const [currentPage, setCurrentPage] = useState(1);

  const [badLogos, setBadLogos] = useState({});
  const [counts, setCounts] = useState({
    active: 0,
    archived: 0,
  });

  const storedUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
      return null;
    }
  }, []);

  const employerVerificationStatus =
    storedUser?.employerProfile?.verificationDocs?.overallStatus || 'unverified';

  const isEmployerVerified =
    employerVerificationStatus === 'verified' || storedUser?.isVerified === true;

  const verificationBannerMessage = useMemo(() => {
    if (isEmployerVerified) return '';
    if (employerVerificationStatus === 'pending') {
      return 'Verification is pending. You can save and edit drafts, but you cannot publish until approved by admin.';
    }
    if (employerVerificationStatus === 'rejected') {
      return 'Verification was rejected. You can save and edit drafts, but you cannot publish until you resubmit and get approved.';
    }
    if (employerVerificationStatus === 'suspended') {
      return 'Your company is suspended. You can save drafts, but publishing is disabled.';
    }
    return 'Your company is not verified yet. You can save and edit drafts, but you cannot publish until verified by admin.';
  }, [isEmployerVerified, employerVerificationStatus]);

  const closeModal = () => {
    setShowDeleteModal(false);
    setSelectedJob(null);
  };

  useEffect(() => {
    if (!showDeleteModal) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [showDeleteModal]);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const response = await axios.get('https://phinmaau-job-portal-atlas.onrender.com/api/jobs/employer/my-jobs?archived=false', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setJobs(response.data.jobs || []);
        setCounts({
          active: response.data.activeCount ?? 0,
          archived: response.data.archivedCount ?? 0,
        });
      } else {
        setError('Failed to fetch jobs');
      }
    } catch (err) {
      console.error('Error fetching jobs:', err);
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/employer/login');
      }
      setError('Failed to load jobs. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const successType = location.state?.successType;

    if (!location.state?.jobPostSuccess && !location.state?.jobEditSuccess && !successType) return;

    if (location.state?.jobPostSuccess || successType === 'post') {
      setSuccess({
        type: 'post',
        title: 'Job Posted Successfully',
        message: 'Your job listing is now live and visible to applicants.',
      });
    } else if (successType === 'edit-publish') {
      setSuccess({
        type: 'edit',
        title: 'Job Updated & Published Successfully',
        message: 'Your updated job listing is now live and visible to applicants.',
      });
    } else {
      setSuccess({
        type: 'edit',
        title: 'Job Edited Successfully',
        message: 'Your job listing is now updated in Manage Jobs.',
      });
    }

    navigate(location.pathname, { replace: true, state: {} });
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(''), 3500);
    return () => clearTimeout(t);
  }, [error]);

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

  const isExpired = (dateString) => {
    if (!dateString) return false;
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return false;
    return d < new Date();
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

  const getApplicantValue = (job) => {
    const candidates = [
      job?.applicationCount,
      Array.isArray(job?.applications) ? job.applications.length : undefined,
      job?.applicantCount,
      job?.applicantsCount,
      job?.totalApplicants,
    ];

    const found = candidates.find((value) => value !== undefined && value !== null && value !== '');
    return found ?? 0;
  };

  const getDerivedStatus = (job) => {
    if (String(job?.status || '').toLowerCase() === 'filled') return 'filled';
    if (job.isPublished === false) return 'draft';
    if (job.isActive && isExpired(job.applicationDeadline)) return 'expired';
    return job.isActive ? 'open' : 'closed';
  };

  const getStatusPill = (job) => {
    const s = getDerivedStatus(job);
    if (s === 'draft') return 'border border-gray-200 bg-gray-100 text-gray-700';
    if (s === 'open') return 'border border-blue-200 bg-blue-50 text-[#2e66a6]';
    if (s === 'expired') return 'border border-amber-200 bg-amber-50 text-amber-700';
    if (s === 'filled') return 'border border-orange-200 bg-orange-50 text-orange-700';
    return 'border border-gray-300 bg-gray-50 text-gray-700';
  };

  const getStatusText = (job) => {
    const s = getDerivedStatus(job);
    if (s === 'draft') return 'Draft';
    if (s === 'open') return 'Open';
    if (s === 'expired') return 'Expired';
    if (s === 'filled') return 'Filled';
    return 'Closed';
  };

  const safeDate = (d) => {
    const x = new Date(d || 0);
    return Number.isNaN(x.getTime()) ? new Date(0) : x;
  };

  const getComparableDate = (job) => {
    const createdDate = safeDate(job.createdAt);
    if (createdDate.getTime() !== new Date(0).getTime()) return createdDate;

    const postedDate = safeDate(job.datePosted);
    if (postedDate.getTime() !== new Date(0).getTime()) return postedDate;

    return safeDate(job.updatedAt);
  };

  const handlePublish = async (jobId) => {
    try {
      if (!isEmployerVerified) {
        setError(verificationBannerMessage || 'Your company is not verified yet. Publishing is disabled.');
        return;
      }

      const jobToUpdate = jobs.find((job) => job._id === jobId);
      if (!jobToUpdate) return;

      if (action.jobId) return;
      setAction({ type: 'publish', jobId });

      const token = localStorage.getItem('token');

      const updateData = {
        ...jobToUpdate,
        isPublished: true,
        isActive: true,
        status: 'published',
      };

      await axios.put(`https://phinmaau-job-portal-atlas.onrender.com/api/jobs/${jobId}`, updateData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      setJobs((prev) =>
        prev.map((job) => (job._id === jobId ? { ...job, isPublished: true, isActive: true, status: 'published' } : job))
      );

      setSuccess({ type: 'publish', title: 'Job Published Successfully', message: 'This draft is now live and visible to applicants.' });
    } catch (err) {
      console.error('Error publishing job:', err);

      if (err.response?.status === 403 && err.response?.data?.code === 'EMPLOYER_NOT_VERIFIED') {
        setError(err.response?.data?.message || verificationBannerMessage || 'Verification required to publish.');
      } else {
        setError('Failed to publish job. Please complete required fields and try again.');
      }
    } finally {
      setAction({ type: '', jobId: '' });
    }
  };

  const handleDelete = async (jobId) => {
    try {
      if (action.jobId) return;
      setAction({ type: 'delete', jobId });

      const token = localStorage.getItem('token');

      await axios.delete(`https://phinmaau-job-portal-atlas.onrender.com/api/jobs/${jobId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setJobs((prev) => prev.filter((job) => job._id !== jobId));
      setCounts((prev) => ({
        active: Math.max(0, prev.active - 1),
        archived: prev.archived + 1,
      }));
      closeModal();
      setSuccess({ type: 'archive', title: 'Job Archived Successfully', message: 'The job has been moved to archived jobs.' });
    } catch (err) {
      console.error('Error archiving job:', err);
      setError('Failed to delete job');
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
          className="inline-flex items-center gap-2 rounded-xl bg-[#f5f7fb] px-4 py-2 text-sm font-semibold text-[#2e66a6]"
          aria-current="page"
        >
          <span>Active</span>
          <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-[#2e66a6]">
            {counts.active}
          </span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/employer/manage-jobs/archived')}
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 hover:text-gray-900"
        >
          <span>Archived</span>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">
            {counts.archived}
          </span>
        </button>
      </div>
    );
  }, [counts.active, counts.archived, navigate]);

  const filteredJobs = useMemo(() => {
    const norm = (s) => String(s || '').toLowerCase().trim();
    const query = norm(q);

    let list = [...jobs];

    if (jobFilter !== 'all') {
      list = list.filter((j) => j._id === jobFilter);
    }

    if (statusFilter !== 'all') {
      list = list.filter((j) => getDerivedStatus(j) === statusFilter);
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
          String(getApplicantValue(j)),
          getStatusText(j),
          formatDate(j.createdAt),
          formatDate(j.applicationDeadline),
        ]
          .map(norm)
          .join(' ');

        return hay.includes(query);
      });
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);

    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - mondayOffset);
    const startOfNextWeek = new Date(startOfWeek);
    startOfNextWeek.setDate(startOfWeek.getDate() + 7);

    const sevenDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
    const thirtyDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const startOfNextYear = new Date(now.getFullYear() + 1, 0, 1);

    const startOfLastYear = new Date(now.getFullYear() - 1, 0, 1);
    const startOfCurrentYear = new Date(now.getFullYear(), 0, 1);

    if (dateFilter === 'today') {
      list = list.filter((job) => {
        const date = getComparableDate(job);
        return date >= startOfToday && date < startOfTomorrow;
      });
    } else if (dateFilter === 'yesterday') {
      list = list.filter((job) => {
        const date = getComparableDate(job);
        return date >= startOfYesterday && date < startOfToday;
      });
    } else if (dateFilter === 'this_week') {
      list = list.filter((job) => {
        const date = getComparableDate(job);
        return date >= startOfWeek && date < startOfNextWeek;
      });
    } else if (dateFilter === 'last_7_days') {
      list = list.filter((job) => {
        const date = getComparableDate(job);
        return date >= sevenDaysAgo && date < startOfTomorrow;
      });
    } else if (dateFilter === 'this_month') {
      list = list.filter((job) => {
        const date = getComparableDate(job);
        return date >= startOfMonth && date < startOfNextMonth;
      });
    } else if (dateFilter === 'last_30_days') {
      list = list.filter((job) => {
        const date = getComparableDate(job);
        return date >= thirtyDaysAgo && date < startOfTomorrow;
      });
    } else if (dateFilter === 'this_year') {
      list = list.filter((job) => {
        const date = getComparableDate(job);
        return date >= startOfYear && date < startOfNextYear;
      });
    } else if (dateFilter === 'last_year') {
      list = list.filter((job) => {
        const date = getComparableDate(job);
        return date >= startOfLastYear && date < startOfCurrentYear;
      });
    }

    list.sort((a, b) => {
      if (sortBy === 'salary_high_to_low') {
        const aSalary = Number(a?.salaryMax ?? a?.salaryMin ?? 0);
        const bSalary = Number(b?.salaryMax ?? b?.salaryMin ?? 0);
        return bSalary - aSalary;
      }

      if (sortBy === 'expiry_soonest_to_latest') {
        return safeDate(a.applicationDeadline) - safeDate(b.applicationDeadline);
      }

      return safeDate(b.createdAt) - safeDate(a.createdAt);
    });

    return list;
  }, [jobs, jobFilter, statusFilter, dateFilter, q, sortBy]);


  const totalItems = filteredJobs.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const paginatedJobs = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredJobs.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredJobs, currentPage]);
  const showingStart = totalItems === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const showingEnd = Math.min(currentPage * ITEMS_PER_PAGE, totalItems);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const hasActiveFilters = useMemo(() => {
    return (
      q.trim() !== '' ||
      jobFilter !== 'all' ||
      statusFilter !== 'all' ||
      dateFilter !== 'overall' ||
      sortBy !== 'most_recent'
    );
  }, [q, jobFilter, statusFilter, dateFilter, sortBy]);

  const clearControls = () => {
    setJobFilter('all');
    setStatusFilter('all');
    setDateFilter('overall');
    setQ('');
    setSortBy('most_recent');
  };

  useEffect(() => {
    if (!showDeleteModal) return;

    const t = setTimeout(() => cancelBtnRef.current?.focus(), 0);

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeModal();
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

  return (
    <EmployerLayout>
      <div className="mx-auto max-w-7xl px-1 py-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-[33px] font-semibold leading-[40px] text-gray-900">Manage Jobs</h1>
            <p className="mt-1 text-sm text-gray-600">View, edit, and manage your job postings</p>

            {!isEmployerVerified && (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-900">Verification required to publish</p>
                <p className="mt-1 text-sm text-amber-800">
                  Status: <span className="font-semibold">{employerVerificationStatus}</span>. {verificationBannerMessage}
                </p>
              </div>
            )}
          </div>
          <div>{headerRight}</div>
        </div>

        {error && (
          <Alert type="error" onClose={() => setError('')}>
{error}
          </Alert>
        )}



        <div className="relative z-20 mb-6 overflow-visible rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="p-5">
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(300px,380px)_minmax(0,1fr)] xl:items-start">
              <div className="relative min-w-0">
                <svg
                  className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
                </svg>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search job title, company, location, status…"
                  className="w-full rounded-xl border border-gray-300 py-2.5 pl-11 pr-10 text-gray-900 placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2"
                />
              </div>

              <div
                className={cn(
                  'grid grid-cols-1 gap-2 sm:grid-cols-2',
                  hasActiveFilters
                    ? 'lg:grid-cols-5 xl:grid-cols-[minmax(130px,1fr)_minmax(105px,0.72fr)_minmax(115px,0.76fr)_minmax(145px,0.9fr)_minmax(100px,0.62fr)]'
                    : 'lg:grid-cols-4 xl:grid-cols-[minmax(140px,1fr)_minmax(120px,0.75fr)_minmax(130px,0.8fr)_minmax(170px,1fr)]'
                )}
              >
                <select
                  value={jobFilter}
                  onChange={(e) => setJobFilter(e.target.value)}
                  className="h-11 w-full rounded-xl border border-gray-300 bg-white px-4 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2"
                >
                  <option value="all">Job Title</option>
                  {jobOptions.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.title}
                    </option>
                  ))}
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-11 w-full rounded-xl border border-gray-300 bg-white px-4 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2"
                >
                  <option value="all">Status</option>
                  <option value="open">Open</option>
                  <option value="closed">Closed</option>
                  <option value="filled">Filled</option>
                  <option value="expired">Expired</option>
                  <option value="draft">Draft</option>
                </select>

                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="h-11 w-full rounded-xl border border-gray-300 bg-white px-4 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2"
                >
                  <option value="overall">Filter By</option>
                  <option value="overall">Overall</option>
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="this_week">This Week</option>
                  <option value="last_7_days">Last 7 Days</option>
                  <option value="this_month">This Month</option>
                  <option value="last_30_days">Last 30 Days</option>
                  <option value="this_year">This Year</option>
                  <option value="last_year">Last Year</option>
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="h-11 w-full rounded-xl border border-gray-300 bg-white px-4 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2"
                >
                  <option value="most_recent">Sort By</option>
                  <option value="salary_high_to_low">Salary Highest to Lowest</option>
                  <option value="expiry_soonest_to_latest">Expiry Date Soonest to Latest</option>
                  <option value="most_recent">Most Recent Newest to Oldest</option>
                </select>

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearControls}
                    className="h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-900 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <p className="mt-3 text-xs text-gray-500">
              Showing <span className="font-semibold text-gray-700">{filteredJobs.length}</span> result(s).
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="p-6">
            {loading ? (
              <div className="py-14 text-center">
                <div className="inline-block h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-[#2e66a6]" />
                <p className="mt-4 text-sm text-gray-600">Loading jobs...</p>
              </div>
            ) : filteredJobs.length === 0 ? (
              <div className="py-14 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">No matching jobs</h3>
                <p className="mt-2 text-sm text-gray-600">Try adjusting your search or filters.</p>
                <div className="mt-6 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={clearControls}
                    className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Clear filters
                  </button>
                  <button
                    onClick={() => navigate('/employer/post-job')}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#2e66a6] px-5 py-3 text-sm font-semibold text-white hover:bg-[#25558a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Post New Job
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-4 md:hidden">
                  {paginatedJobs.map((job) => {
                    const title = safeTitle(job);
                    const busyThisRow = action.jobId === job._id;
                    const logoUrl = job.companyLogo && String(job.companyLogo).trim() ? job.companyLogo : '';
                    const derivedStatus = getDerivedStatus(job);

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
                            <p className="truncate text-sm text-gray-600">{safeCompany(job)}</p>
                            <span className={cn('mt-2 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold', getStatusPill(job))}>
                              {getStatusText(job)}
                            </span>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                          <div className="rounded-xl bg-gray-50 p-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Date Posted</p>
                            <p className="mt-1 font-medium text-gray-800">{formatDate(job.createdAt)}</p>
                          </div>
                          <div className="rounded-xl bg-gray-50 p-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Valid Until</p>
                            <p className="mt-1 font-medium text-gray-800">{formatDate(job.applicationDeadline)}</p>
                          </div>
                          <div className="rounded-xl bg-gray-50 p-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Vacancy</p>
                            <p className="mt-1 font-medium text-gray-800">{getVacancyValue(job)}</p>
                          </div>
                          <div className="rounded-xl bg-gray-50 p-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Applicant</p>
                            <p className="mt-1 font-medium text-gray-800">{getApplicantValue(job)}</p>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-2">
                          <Link
                            to={`/employer/manage-jobs/${job._id}/view`}
                            state={{
                              from: 'manageJobs',
                              backPath: '/employer/manage-jobs',
                              backLabel: 'Manage Jobs',
                            }}
                            className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-900 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2"
                            aria-label={`View ${title}`}
                            title="View"
                          >
                            <Icon name="eye" className="h-4 w-4" />
                          </Link>

                          <Link
                            to={`/employer/edit-job/${job._id}`}
                            className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-900 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2"
                            aria-label={`Edit ${title}`}
                            title="Edit"
                          >
                            <Icon name="edit" className="h-4 w-4" />
                          </Link>

                          {derivedStatus === 'draft' && (
                            <button
                              onClick={() => handlePublish(job._id)}
                              disabled={busyThisRow || !isEmployerVerified}
                              title={!isEmployerVerified ? 'Verify your company to publish jobs.' : 'Publish this job'}
                              className="col-span-2 inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              aria-label={`Publish ${title}`}
                            >
                              {busyThisRow && action.type === 'publish' ? (
                                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-b-2 border-t-2 border-current" />
                              ) : (
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                              Publish
                            </button>
                          )}

                          <button
                            onClick={() => {
                              setSelectedJob(job);
                              setShowDeleteModal(true);
                            }}
                            disabled={busyThisRow}
                            className="col-span-2 inline-flex h-10 items-center justify-center rounded-lg border border-red-200 bg-red-50 px-3 text-sm font-semibold text-red-700 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            aria-label={`Archive ${title}`}
                            title="Archive"
                          >
                            <Icon name="trash" className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="hidden overflow-x-auto md:block">
                <div className="">
                  <table className="min-w-full divide-y divide-gray-200">
                    <colgroup>
                      <col className="w-[13%]" />
                      <col className="w-[22%]" />
                      <col className="w-[8%]" />
                      <col className="w-[9%]" />
                      <col className="w-[11%]" />
                      <col className="w-[13%]" />
                      <col className="w-[24%]" />
                    </colgroup>

                    <thead className="bg-gray-50">
                      <tr >
                        <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                          Date Posted
                        </th>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                          Job Title
                        </th>
                        <th scope="col" className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-gray-600">
                          Vacancy
                        </th>
                        <th scope="col" className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-gray-600">
                          Applicant
                        </th>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                          Status
                        </th>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                          Valid Until
                        </th>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-200 bg-white">
                      {paginatedJobs.map((job) => {
                        const title = safeTitle(job);
                        const busyThisRow = action.jobId === job._id;
                        const logoUrl = job.companyLogo && String(job.companyLogo).trim() ? job.companyLogo : '';
                        const derivedStatus = getDerivedStatus(job);

                        return (
                          <tr
                            key={job._id}
                            role="link"
                            tabIndex={0}
                            aria-label={`View ${title}`}
                            onClick={(event) => {
                              if (event.target.closest?.('a, button, input, select, textarea')) return;

                              navigate(`/employer/manage-jobs/${job._id}/view`, {
                                state: {
                                  from: 'manageJobs',
                                  backPath: '/employer/manage-jobs',
                                  backLabel: 'Manage Jobs',
                                },
                              });
                            }}
                            onKeyDown={(event) => {
                              if (event.target !== event.currentTarget) return;
                              if (event.key !== 'Enter' && event.key !== ' ') return;

                              event.preventDefault();
                              navigate(`/employer/manage-jobs/${job._id}/view`, {
                                state: {
                                  from: 'manageJobs',
                                  backPath: '/employer/manage-jobs',
                                  backLabel: 'Manage Jobs',
                                },
                              });
                            }}
                            className="group cursor-pointer transition-colors hover:bg-[#2e66a6]/[0.06] focus-visible:bg-[#2e66a6]/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2e66a6]"
                          >
                            <td className="px-6 py-4 align-middle text-sm font-medium text-gray-700">
                              {formatDate(job.createdAt)}
                            </td>

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
                                  <div
                                    className="block truncate text-sm font-semibold text-gray-900 transition-colors group-hover:text-[#2e66a6]"
                                    title={title}
                                  >
                                    {title}
                                  </div>
                                  <div className="truncate text-sm text-gray-600">{safeCompany(job)}</div>
                                </div>
                              </div>
                            </td>

                            <td className="px-6 py-4 text-center align-middle text-sm font-medium text-gray-800">
                              {getVacancyValue(job)}
                            </td>

                            <td className="px-6 py-4 text-center align-middle text-sm font-medium text-gray-800">
                              {getApplicantValue(job)}
                            </td>

                            <td className="px-6 py-4 align-middle">
                              <span className={cn('inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold', getStatusPill(job))}>{getStatusText(job)}</span>
                            </td>

                            <td className="px-6 py-4 align-middle text-sm font-medium text-gray-600">
                              {formatDate(job.applicationDeadline)}
                            </td>

                            <td className="px-6 py-4 align-middle">
                              <div className="flex flex-nowrap items-center gap-2">
                                <Link
                                  to={`/employer/manage-jobs/${job._id}/view`}
                                  state={{
                                    from: 'manageJobs',
                                    backPath: '/employer/manage-jobs',
                                    backLabel: 'Manage Jobs',
                                  }}
                                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2"
                                  aria-label={`View ${title}`}
                                  title="View"
                                >
                                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M1.5 12s3.5-7 10.5-7 10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12z"
                                    />
                                    <circle cx="12" cy="12" r="3" strokeWidth={2} />
                                  </svg>
                                  <span className="sr-only">View</span>
                                </Link>

                                <Link
                                  to={`/employer/edit-job/${job._id}`}
                                  className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-900 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2"
                                  aria-label={`Edit ${title}`}
                                  title="Edit"
                                >
                                  <Icon name="edit" className="h-4 w-4" />
                                </Link>

                                {derivedStatus === 'draft' && (
                                  <button
                                    onClick={() => handlePublish(job._id)}
                                    disabled={busyThisRow || !isEmployerVerified}
                                    title={!isEmployerVerified ? 'Verify your company to publish jobs.' : 'Publish this job'}
                                    className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    aria-label={`Publish ${title}`}
                                  >
                                    {busyThisRow && action.type === 'publish' ? (
                                      <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-b-2 border-t-2 border-current" />
                                    ) : (
                                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      </svg>
                                    )}
                                    Publish
                                  </button>
                                )}

                                <button
                                  onClick={() => {
                                    setSelectedJob(job);
                                    setShowDeleteModal(true);
                                  }}
                                  disabled={busyThisRow}
                                  className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg border border-red-200 bg-red-50 px-3 text-sm font-semibold text-red-700 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                  aria-label={`Archive ${title}`}
                                  title="Archive"
                                >
                                  <Icon name="trash" className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4 text-sm text-gray-600 sm:flex-row sm:items-center sm:justify-between">
                <span>
                  Showing {showingStart} to {showingEnd} of {totalItems} result(s)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    disabled={currentPage === 1}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="rounded-lg bg-[#2e66a6] px-3 py-2 text-sm font-semibold text-white">
                    {currentPage}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                    disabled={currentPage >= totalPages}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
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
              aria-labelledby="delete-title"
              aria-describedby="delete-desc"
              className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl"
            >
              <div className="p-6">
                <div className="mb-4 flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100">
                    <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>

                  <div className="min-w-0">
                    <h3 id="delete-title" className="text-lg font-semibold text-gray-900">
                      Archive Job Post
                    </h3>
                  </div>
                </div>

                <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4">
                  <p className="font-semibold text-red-900">
                    “{selectedJob.title || 'Untitled Draft'}”
                  </p>
                  <p id="delete-desc" className="mt-1 text-sm text-red-800">
                    This job will be removed from your active jobs and moved to archived jobs.
                  </p>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    ref={cancelBtnRef}
                    onClick={closeModal}
                    disabled={action.type === 'delete' && action.jobId === selectedJob._id}
                    className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={() => handleDelete(selectedJob._id)}
                    disabled={action.type === 'delete' && action.jobId === selectedJob._id}
                    className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:opacity-50"
                  >
                    {action.type === 'delete' && action.jobId === selectedJob._id ? (
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-b-2 border-t-2 border-white" />
                    ) : (
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                    Archive Job
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>


        {success && (
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30 px-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="job-success-title"
          >
            <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white text-center shadow-2xl">
              <div className="px-8 pb-6 pt-8">
                <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full text-white bg-[#2e66a6]`}>
                  <svg className="h-10 w-10" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-7.25 7.25a1 1 0 01-1.414 0l-3.25-3.25a1 1 0 111.414-1.414L8.75 11.836l6.543-6.543a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>

                <h2 id="job-success-title" className="text-xl font-bold text-gray-900">
                  {success.title}
                </h2>
                <p className="mt-2 text-sm text-gray-600">
                  {success.message}
                </p>
              </div>

              <div className="border-t border-gray-200 px-8 py-4">
                <button
                  type="button"
                  onClick={() => setSuccess(null)}
                  className="w-full rounded-xl bg-[#2e66a6] px-5 py-3 text-sm font-semibold text-white hover:bg-[#23508a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}
    </EmployerLayout>
  );
};

export default ManageJobs;