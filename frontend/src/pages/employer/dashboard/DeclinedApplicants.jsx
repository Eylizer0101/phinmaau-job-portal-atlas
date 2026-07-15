// src/pages/employer/dashboard/DeclinedApplicants.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import EmployerLayout from '../../../layouts/EmployerLayout';

const Icon = ({ name, className = 'h-5 w-5', ...props }) => {
  const common = { className, fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24', ...props };

  switch (name) {
    case 'search':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.3-4.3m1.3-5.2a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      );
    case 'eye':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      );
    case 'trash':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3M4 7h16" />
        </svg>
      );
    case 'x':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      );
    case 'archive':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16M5 7l1 12a2 2 0 002 2h8a2 2 0 002-2l1-12M9 11h6" />
        </svg>
      );
    default:
      return null;
  }
};

const cn = (...classes) => classes.filter(Boolean).join(' ');

const Button = ({
  variant = 'secondary',
  size = 'md',
  leftIcon,
  children,
  className,
  disabled,
  ...props
}) => {
  const base =
    'inline-flex items-center justify-center gap-2 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed';

  const sizes = {
    sm: 'px-3 py-2 text-sm rounded-lg',
    md: 'px-4 py-3 text-sm rounded-xl',
    xs: 'px-2 py-1.5 text-xs rounded-lg',
  };

  const variants = {
    secondary:
      'border border-gray-200 bg-white text-gray-900 hover:bg-gray-50 focus-visible:ring-[#2e66a6]',
    dangerSoft:
      'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 focus-visible:ring-red-600',
  };

  return (
    <button
      type="button"
      className={cn(base, sizes[size], variants[variant], className)}
      disabled={disabled}
      {...props}
    >
      {leftIcon}
      {children}
    </button>
  );
};

const Alert = ({ type = 'error', children, onClose }) => {
  const isError = type === 'error';
  const styles = isError
    ? 'border-red-200 bg-red-50 text-red-900'
    : 'border-blue-200 bg-blue-50 text-[#2e66a6]';
  const ring = isError ? 'focus-visible:ring-red-600' : 'focus-visible:ring-[#2e66a6]';

  return (
    <div
      className={cn('mb-5 flex items-start justify-between gap-4 rounded-xl border p-4 text-sm font-medium', styles)}
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
    >
      <div className="min-w-0">{children}</div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className={cn(
            'shrink-0 rounded-lg px-2 py-1 text-xs font-semibold hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2',
            ring
          )}
          aria-label="Dismiss message"
        >
          Dismiss
        </button>
      )}
    </div>
  );
};

const Modal = ({
  open,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onClose,
  danger = false,
  loading = false,
}) => {
  const confirmRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => confirmRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-xl"
      >
        <div className="p-6">
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          {description && <p className="mt-2 text-sm text-gray-600">{description}</p>}
        </div>
        <div className="flex items-center justify-end gap-2 px-6 pb-6">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={loading}>
            {cancelText}
          </Button>
          <Button
            variant={danger ? 'dangerSoft' : 'secondary'}
            size="sm"
            onClick={onConfirm}
            disabled={loading}
            ref={confirmRef}
          >
            {loading ? 'Archiving…' : confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};

const formatDate = (dateValue) => {
  if (!dateValue) return '—';
  const d = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
};

const useDebouncedValue = (value, delay = 250) => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);

  return debounced;
};

const DeclinedApplicants = () => {
  const navigate = useNavigate();
  const API_BASE = (process.env.REACT_APP_API_URL || 'https://phinmaau-job-portal-atlas.onrender.com/api').replace(/\/api\/?$/, '');

  const [brokenAvatars, setBrokenAvatars] = useState(() => new Set());
  const [applications, setApplications] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [archiveCounts, setArchiveCounts] = useState({ active: 0, archived: 0 });

  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, 250);
  const [selectedJob, setSelectedJob] = useState('all');
  const [filterBy, setFilterBy] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  const [deleteTarget, setDeleteTarget] = useState(null);

  const getImageUrl = useCallback(
    (url) => {
      if (!url) return '';
      if (url.startsWith('http')) return url;
      return `${API_BASE}${url}`;
    },
    [API_BASE]
  );

  const markBroken = useCallback((key) => {
    setBrokenAvatars((prev) => {
      const next = new Set(prev);
      next.add(String(key));
      return next;
    });
  }, []);

  const buildApplicantName = useCallback((u) => {
    const full = (u?.fullName || '').trim();
    if (full) return full;

    const parts = [u?.firstName, u?.middleName, u?.lastName]
      .map((p) => (p || '').trim())
      .filter(Boolean);

    if (parts.length) return parts.join(' ');

    const email = (u?.email || '').trim();
    if (email && email.includes('@')) return email.split('@')[0];

    return 'Applicant';
  }, []);

  const getDeclinedStageLabel = useCallback((declinedFrom) => {
    const normalized = String(declinedFrom || '').trim();

    if (normalized === 'applicants') return 'Screening';
    if (normalized === 'forInterview') return 'Interview';

    return 'Declined';
  }, []);

  const Avatar = useCallback(
    ({ img, name, size = 48, altKey }) => {
      const initial = (name?.trim()?.[0] || 'U').toUpperCase();
      const src = img ? getImageUrl(img) : '';
      const isBroken = brokenAvatars.has(String(altKey));
      const boxStyle = { height: `${size}px`, width: `${size}px` };

      return (
        <div
          className="flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-gray-100"
          style={boxStyle}
        >
          {src && !isBroken ? (
            <img
              src={src}
              alt={`${name}'s profile`}
              className="h-full w-full object-cover"
              loading="lazy"
              onError={() => markBroken(altKey)}
            />
          ) : (
            <span className="text-sm font-bold text-gray-700">{initial}</span>
          )}
        </div>
      );
    },
    [brokenAvatars, getImageUrl, markBroken]
  );

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
  };

  const handleAuthError = () => {
    localStorage.removeItem('token');
    navigate('/employer/login');
  };

  const fetchJobs = useCallback(async () => {
    try {
      setJobsLoading(true);
      const res = await axios.get('https://phinmaau-job-portal-atlas.onrender.com/api/jobs/employer/my-jobs', {
        headers: getAuthHeaders(),
      });

      if (res.data?.success) {
        setJobs(res.data.jobs || []);
      } else {
        setJobs([]);
      }
    } catch (err) {
      console.error(err);
      if (err.response?.status === 401) return handleAuthError();
      setJobs([]);
    } finally {
      setJobsLoading(false);
    }
  }, [navigate]);

  const fetchDeclinedApplications = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await axios.get('https://phinmaau-job-portal-atlas.onrender.com/api/applications/employer/declined', {
        headers: getAuthHeaders(),
      });

      if (res.data?.success) {
        setApplications(res.data.applications || []);
        setArchiveCounts({
          active: res.data.activeCount ?? (res.data.applications || []).length,
          archived: res.data.archivedCount ?? 0,
        });
      } else {
        setApplications([]);
      }
    } catch (err) {
      console.error(err);
      if (err.response?.status === 401) return handleAuthError();
      setError('Failed to load declined applicants.');
      setApplications([]);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchJobs();
    fetchDeclinedApplications();
  }, [fetchJobs, fetchDeclinedApplications]);

  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(''), 2200);
    return () => clearTimeout(t);
  }, [success]);

  const jobOptions = useMemo(() => {
    return [
      { value: 'all', label: 'All Jobs' },
      ...jobs.map((j) => ({
        value: j._id,
        label: j.title || 'Untitled Job',
      })),
    ];
  }, [jobs]);

  const filteredApplications = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    let list = [...applications];

    if (selectedJob !== 'all') {
      list = list.filter((a) => a.job?._id === selectedJob);
    }

    if (q) {
      list = list.filter((a) => {
        const u = a.jobseeker || {};
        const name = buildApplicantName(u).toLowerCase();
        const email = (u.email || '').toLowerCase();
        const jobTitle = (a.job?.title || '').toLowerCase();
        const company = (a.job?.companyName || '').toLowerCase();
        const declinedStage = getDeclinedStageLabel(a.declinedFrom).toLowerCase();

        return [name, email, jobTitle, company, declinedStage].some((t) => t.includes(q));
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
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const thirtyDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const startOfNextYear = new Date(now.getFullYear() + 1, 0, 1);

    const startOfLastYear = new Date(now.getFullYear() - 1, 0, 1);
    const startOfThisYear = new Date(now.getFullYear(), 0, 1);

    if (filterBy === 'today') {
      list = list.filter((a) => {
        const date = new Date(a.appliedAt || 0);
        return !Number.isNaN(date.getTime()) && date >= startOfToday && date < startOfTomorrow;
      });
    } else if (filterBy === 'yesterday') {
      list = list.filter((a) => {
        const date = new Date(a.appliedAt || 0);
        return !Number.isNaN(date.getTime()) && date >= startOfYesterday && date < startOfToday;
      });
    } else if (filterBy === 'this_week') {
      list = list.filter((a) => {
        const date = new Date(a.appliedAt || 0);
        return !Number.isNaN(date.getTime()) && date >= startOfWeek && date < startOfNextWeek;
      });
    } else if (filterBy === 'last_7_days') {
      list = list.filter((a) => {
        const date = new Date(a.appliedAt || 0);
        return !Number.isNaN(date.getTime()) && date >= sevenDaysAgo && date < startOfTomorrow;
      });
    } else if (filterBy === 'this_month') {
      list = list.filter((a) => {
        const date = new Date(a.appliedAt || 0);
        return !Number.isNaN(date.getTime()) && date >= startOfMonth && date < startOfNextMonth;
      });
    } else if (filterBy === 'last_30_days') {
      list = list.filter((a) => {
        const date = new Date(a.appliedAt || 0);
        return !Number.isNaN(date.getTime()) && date >= thirtyDaysAgo && date < startOfTomorrow;
      });
    } else if (filterBy === 'this_year') {
      list = list.filter((a) => {
        const date = new Date(a.appliedAt || 0);
        return !Number.isNaN(date.getTime()) && date >= startOfYear && date < startOfNextYear;
      });
    } else if (filterBy === 'last_year') {
      list = list.filter((a) => {
        const date = new Date(a.appliedAt || 0);
        return !Number.isNaN(date.getTime()) && date >= startOfLastYear && date < startOfThisYear;
      });
    }

    const getSalaryValue = (app) => {
      const job = app.job || {};
      const directSalary = job.salary ?? job.salaryRange ?? job.compensation ?? '';
      const values = [job.maxSalary, job.salaryMax, job.minSalary, job.salaryMin]
        .map((value) => Number(String(value || '').replace(/[^0-9.]/g, '')))
        .filter((value) => Number.isFinite(value) && value > 0);

      if (values.length) return Math.max(...values);

      const matches = String(directSalary).match(/\d[\d,]*(?:\.\d+)?/g) || [];
      const parsed = matches
        .map((value) => Number(value.replace(/,/g, '')))
        .filter((value) => Number.isFinite(value) && value > 0);

      return parsed.length ? Math.max(...parsed) : 0;
    };

    const getExpiryTime = (app) => {
      const dateValue = app.job?.expiryDate || app.job?.expiresAt || app.job?.applicationDeadline || app.job?.deadline;
      const time = new Date(dateValue || 0).getTime();
      return Number.isNaN(time) || time <= 0 ? Number.MAX_SAFE_INTEGER : time;
    };

    return [...list].sort((a, b) => {
      if (sortBy === 'salary_high_to_low') {
        return getSalaryValue(b) - getSalaryValue(a);
      }

      if (sortBy === 'expiry_soonest') {
        return getExpiryTime(a) - getExpiryTime(b);
      }

      const da = new Date(a.appliedAt || 0).getTime();
      const db = new Date(b.appliedAt || 0).getTime();
      return db - da;
    });
  }, [applications, buildApplicantName, debouncedQuery, filterBy, selectedJob, sortBy, getDeclinedStageLabel]);

  const hasActiveFilters = useMemo(() => {
    return query.trim() !== '' || filterBy !== 'all' || sortBy !== 'newest' || selectedJob !== 'all';
  }, [query, filterBy, sortBy, selectedJob]);

  const handleDelete = async () => {
    if (!deleteTarget?._id) return;

    try {
      setDeletingId(deleteTarget._id);
      setError('');

      const res = await axios.patch(
        `https://phinmaau-job-portal-atlas.onrender.com/api/applications/${deleteTarget._id}/archive-declined`,
        {},
        { headers: getAuthHeaders() }
      );

      if (res.data?.success) {
        setApplications((prev) => prev.filter((item) => item._id !== deleteTarget._id));
        setArchiveCounts((prev) => ({
          active: Math.max(0, prev.active - 1),
          archived: prev.archived + 1,
        }));
        setSuccess('Declined applicant archived successfully.');
        setDeleteTarget(null);
      } else {
        setError('Failed to archive declined applicant.');
      }
    } catch (err) {
      console.error(err);
      if (err.response?.status === 401) return handleAuthError();
      setError(err.response?.data?.message || 'Failed to archive declined applicant.');
    } finally {
      setDeletingId(null);
    }
  };

  const clearFilters = () => {
    setQuery('');
    setSelectedJob('all');
    setFilterBy('all');
    setSortBy('newest');
  };

  const headerRight = useMemo(() => {
    return (
      <div className="inline-flex items-center rounded-2xl border border-gray-200 bg-white p-1 shadow-sm">
        <button
          type="button"
          onClick={() => navigate('/employer/declined/archived')}
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
        >
          <Icon name="archive" className="h-4 w-4" />
          <span>Archived</span>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">
            {archiveCounts.archived}
          </span>
        </button>
      </div>
    );
  }, [archiveCounts.archived, navigate]);

  const inputBase =
    'w-full rounded-xl border border-gray-300 py-3 pl-11 pr-10 text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2 disabled:bg-gray-50 disabled:opacity-60';

  const selectBase =
    'w-full rounded-xl border border-gray-300 px-4 py-3 pr-9 text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2 disabled:bg-gray-50 disabled:opacity-60';

  return (
    <EmployerLayout>
      <div className="mx-auto max-w-7xl px-1 py-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-[33px] font-semibold leading-[40px] text-gray-900">Declined Applicants</h1>
            <p className="mt-1 text-sm text-gray-600">Applicants reviewed but not selected for position</p>
          </div>
          <div>{headerRight}</div>
        </div>

        {error && (
          <Alert type="error" onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert type="success" onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        <div className="mb-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="p-5">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
              <div className={hasActiveFilters ? 'lg:col-span-4' : 'lg:col-span-5'}>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-3.5 text-gray-400">
                    <Icon name="search" className="h-5 w-5" />
                  </span>

                  <label className="sr-only" htmlFor="declinedApplicantSearch">
                    Search declined applicants
                  </label>
                  <input
                    id="declinedApplicantSearch"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className={inputBase}
                    placeholder="Search applicant, email, job title, stage..."
                    disabled={loading}
                    autoComplete="off"
                  />

                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery('')}
                      className="absolute right-3 top-3.5 rounded-lg p-1 text-gray-500 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2"
                      aria-label="Clear search"
                    >
                      <Icon name="x" className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="lg:col-span-3">
                <label className="sr-only" htmlFor="declinedJobFilter">
                  Filter declined applicants by job
                </label>
                <select
                  id="declinedJobFilter"
                  value={selectedJob}
                  onChange={(e) => setSelectedJob(e.target.value)}
                  className={selectBase}
                  disabled={loading || jobsLoading}
                >
                  {jobOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="lg:col-span-2">
                <label className="sr-only" htmlFor="declinedDateFilter">
                  Filter declined applicants by date
                </label>
                <select
                  id="declinedDateFilter"
                  value={filterBy}
                  onChange={(e) => setFilterBy(e.target.value)}
                  className={selectBase}
                  disabled={loading}
                >
                  <option value="all">Filter By</option>
                  <option value="all">Overall</option>
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="this_week">This Week</option>
                  <option value="last_7_days">Last 7 Days</option>
                  <option value="this_month">This Month</option>
                  <option value="last_30_days">Last 30 Days</option>
                  <option value="this_year">This Year</option>
                  <option value="last_year">Last Year</option>
                </select>
              </div>

              <div className="lg:col-span-2">
                <label className="sr-only" htmlFor="sortDeclinedFilter">
                  Sort declined applicants
                </label>
                <select
                  id="sortDeclinedFilter"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className={selectBase}
                  disabled={loading}
                >
                  <option value="newest">Sort By</option>
                  <option value="salary_high_to_low">Salary Highest to Lowest</option>
                  <option value="expiry_soonest">Expiry Date Soonest to Latest</option>
                  <option value="newest">Most Recent Newest to Oldest</option>
                </select>
              </div>

              {hasActiveFilters && (
                <div className="lg:col-span-1">
                  <Button variant="secondary" className="w-full" onClick={clearFilters} disabled={loading}>
                    Clear
                  </Button>
                </div>
              )}
            </div>

            <div className="mt-3 text-xs text-gray-500">
              Showing <span className="font-semibold text-gray-700">{filteredApplications.length}</span> result(s).
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="p-6">
            {loading ? (
              <div className="py-14 text-center" role="status" aria-live="polite">
                <div className="mx-auto inline-block h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-[#2e66a6]" />
                <p className="mt-4 text-sm text-gray-600">Loading declined applicants…</p>
              </div>
            ) : filteredApplications.length === 0 ? (
              <div className="py-14 text-center">
                <h3 className="text-lg font-semibold text-gray-900">No declined applicants found</h3>
                <p className="mt-2 text-sm text-gray-600">There are currently no declined applications to display.</p>
              </div>
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                          Applicant
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                          Job Applied
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                          Applied Date
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                          Application Stage
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-200 bg-white">
                      {filteredApplications.map((app) => {
                        const name = buildApplicantName(app.jobseeker);
                        const email = app.jobseeker?.email || '—';
                        const jobTitle = app.job?.title || 'Job Title';
                        const companyName = app.job?.companyName || 'Company';
                        const rowBusy = deletingId === app._id;
                        const declinedStageLabel = getDeclinedStageLabel(app.declinedFrom);

                        return (
                          <tr
                            key={app._id}
                            role="link"
                            tabIndex={0}
                            aria-label={`View application of ${name}`}
                            onClick={(event) => {
                              if (event.target.closest?.('a, button, input, select, textarea, [role="button"]')) return;
                              navigate(`/employer/application/${app._id}?from=declined`);
                            }}
                            onKeyDown={(event) => {
                              if (event.target !== event.currentTarget) return;
                              if (event.key !== 'Enter' && event.key !== ' ') return;
                              event.preventDefault();
                              navigate(`/employer/application/${app._id}?from=declined`);
                            }}
                            className="group cursor-pointer transition-colors hover:bg-[#2e66a6]/[0.06] focus-visible:bg-[#2e66a6]/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2e66a6]"
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-4">
                                <Avatar
                                  img={app.jobseeker?.profileImage}
                                  name={name}
                                  size={48}
                                  altKey={`declined_${app._id}`}
                                />

                                <div className="min-w-0">
                                  <div className="truncate text-sm font-semibold text-gray-900">{name}</div>
                                  <div className="truncate text-sm text-gray-600">{email}</div>
                                </div>
                              </div>
                            </td>

                            <td className="px-6 py-4">
                              <div className="max-w-[18rem] truncate text-sm font-semibold text-gray-900" title={jobTitle}>
                                {jobTitle}
                              </div>
                              <div className="mt-0.5 max-w-[18rem] truncate text-xs text-gray-600" title={companyName}>
                                {companyName}
                              </div>
                            </td>

                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-900">{formatDate(app.appliedAt)}</div>
                              <div className="mt-0.5 text-xs text-gray-600">
                                {app.reviewedAt ? `Reviewed: ${formatDate(app.reviewedAt)}` : 'Not reviewed'}
                              </div>
                            </td>

                            <td className="px-6 py-4">
                              <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-800">
                                {declinedStageLabel}
                              </span>
                            </td>

                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <Link
                                  to={`/employer/application/${app._id}?from=declined`}
                                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2"
                                  aria-label={`View application of ${name}`}
                                >
                                  <Icon name="eye" className="h-4 w-4" />
                                  <span className="sr-only">View</span>
                                </Link>

                                <Button
                                  variant="dangerSoft"
                                  size="xs"
                                  onClick={() => setDeleteTarget(app)}
                                  disabled={rowBusy}
                                  aria-label={`Archive declined application of ${name}`}
                                >
                                  <Icon name="trash" className="h-4 w-4" />
                                  Archive
                                </Button>

                                {rowBusy && (
                                  <span className="inline-flex items-center gap-2 text-xs font-semibold text-gray-500">
                                    <span className="inline-block h-3 w-3 animate-spin rounded-full border-b-2 border-t-2 border-gray-400" />
                                    Archiving…
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="space-y-3 md:hidden">
                  {filteredApplications.map((app) => {
                    const name = buildApplicantName(app.jobseeker);
                    const email = app.jobseeker?.email || '—';
                    const jobTitle = app.job?.title || 'Job Title';
                    const companyName = app.job?.companyName || 'Company';
                    const rowBusy = deletingId === app._id;
                    const declinedStageLabel = getDeclinedStageLabel(app.declinedFrom);

                    return (
                      <div key={app._id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <Avatar
                              img={app.jobseeker?.profileImage}
                              name={name}
                              size={44}
                              altKey={`declined_mobile_${app._id}`}
                            />

                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold text-gray-900">{name}</div>
                              <div className="truncate text-xs text-gray-600">{email}</div>
                            </div>
                          </div>

                          <span className="inline-flex shrink-0 items-center rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-800">
                            {declinedStageLabel}
                          </span>
                        </div>

                        <div className="mt-3 rounded-xl bg-gray-50 p-3">
                          <div className="truncate text-sm font-semibold text-gray-900" title={jobTitle}>
                            {jobTitle}
                          </div>
                          <div className="truncate text-xs text-gray-600" title={companyName}>
                            {companyName}
                          </div>
                          <div className="mt-2 text-xs text-gray-600">
                            Applied: <span className="font-semibold text-gray-800">{formatDate(app.appliedAt)}</span>
                          </div>
                          <div className="text-xs text-gray-600">
                            {app.reviewedAt ? `Reviewed: ${formatDate(app.reviewedAt)}` : 'Not reviewed'}
                          </div>
                          <div className="mt-1 text-xs text-gray-600">
                            Stage: <span className="font-semibold text-gray-800">{declinedStageLabel}</span>
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <Link
                            to={`/employer/application/${app._id}?from=declined`}
                            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2"
                          >
                            <Icon name="eye" className="h-5 w-5" />
                            View
                          </Link>

                          <Button
                            variant="dangerSoft"
                            size="md"
                            className="flex-1"
                            onClick={() => setDeleteTarget(app)}
                            disabled={rowBusy}
                          >
                            <Icon name="trash" className="h-5 w-5" />
                            {rowBusy ? 'Archiving…' : 'Delete'}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        <Modal
          open={!!deleteTarget}
          title="Archive declined applicant?"
          description={
            deleteTarget
              ? `This will move ${buildApplicantName(deleteTarget.jobseeker)}'s declined application record to archive.`
              : ''
          }
          confirmText="Archive"
          cancelText="Cancel"
          danger
          loading={!!deletingId}
          onClose={() => {
            if (deletingId) return;
            setDeleteTarget(null);
          }}
          onConfirm={handleDelete}
        />
      </div>
    </EmployerLayout>
  );
};

export default DeclinedApplicants;