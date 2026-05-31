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
    case 'restore':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h11M3 10l4-4m-4 4l4 4m3 4h11" />
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
    primarySoft:
      'border border-[#2e66a6]/20 bg-[#2e66a6]/10 text-[#2e66a6] hover:bg-[#2e66a6]/15 focus-visible:ring-[#2e66a6]',
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
          className={cn('shrink-0 rounded-lg px-2 py-1 text-xs font-semibold hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2', ring)}
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
  loadingText = 'Processing…',
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
        className="relative w-full max-w-md rounded-2xl bg-white shadow-xl border border-gray-200"
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
            variant={danger ? 'dangerSoft' : 'primarySoft'}
            size="sm"
            onClick={onConfirm}
            ref={confirmRef}
            disabled={loading}
          >
            {loading ? loadingText : confirmText}
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

const ArchivedDeclinedApplicants = () => {
  const navigate = useNavigate();
  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  const [brokenAvatars, setBrokenAvatars] = useState(() => new Set());
  const [applications, setApplications] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [action, setAction] = useState({ type: '', id: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [archiveCounts, setArchiveCounts] = useState({ active: 0, archived: 0 });

  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, 250);
  const [selectedJob, setSelectedJob] = useState('all');
  const [sort, setSort] = useState('all');

  const [restoreTarget, setRestoreTarget] = useState(null);
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
          className="flex items-center justify-center rounded-full border border-gray-200 bg-gray-100 overflow-hidden shrink-0"
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
      const res = await axios.get('http://localhost:5000/api/jobs/employer/my-jobs', {
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

  const fetchArchivedDeclinedApplications = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await axios.get('http://localhost:5000/api/applications/employer/declined/archived', {
        headers: getAuthHeaders(),
      });

      if (res.data?.success) {
        setApplications(res.data.applications || []);
        setArchiveCounts({
          active: res.data.activeCount ?? 0,
          archived: res.data.archivedCount ?? (res.data.applications || []).length,
        });
      } else {
        setApplications([]);
      }
    } catch (err) {
      console.error(err);
      if (err.response?.status === 401) return handleAuthError();
      setError('Failed to load archived declined applicants.');
      setApplications([]);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchJobs();
    fetchArchivedDeclinedApplications();
  }, [fetchJobs, fetchArchivedDeclinedApplications]);

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
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - mondayOffset);
    const startOfNextWeek = new Date(startOfWeek);
    startOfNextWeek.setDate(startOfWeek.getDate() + 7);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const startOfNextYear = new Date(now.getFullYear() + 1, 0, 1);

    if (sort === 'today') {
      list = list.filter((a) => {
        const date = new Date(a.appliedAt || 0);
        return !Number.isNaN(date.getTime()) && date >= startOfToday && date < startOfTomorrow;
      });
    } else if (sort === 'this_week') {
      list = list.filter((a) => {
        const date = new Date(a.appliedAt || 0);
        return !Number.isNaN(date.getTime()) && date >= startOfWeek && date < startOfNextWeek;
      });
    } else if (sort === 'this_month') {
      list = list.filter((a) => {
        const date = new Date(a.appliedAt || 0);
        return !Number.isNaN(date.getTime()) && date >= startOfMonth && date < startOfNextMonth;
      });
    } else if (sort === 'this_year') {
      list = list.filter((a) => {
        const date = new Date(a.appliedAt || 0);
        return !Number.isNaN(date.getTime()) && date >= startOfYear && date < startOfNextYear;
      });
    }

    return [...list].sort((a, b) => {
      const da = new Date(a.declinedArchivedAt || a.updatedAt || 0).getTime();
      const db = new Date(b.declinedArchivedAt || b.updatedAt || 0).getTime();
      return db - da;
    });
  }, [applications, buildApplicantName, debouncedQuery, sort, selectedJob, getDeclinedStageLabel]);

  const hasActiveFilters = useMemo(() => {
    return query.trim() !== '' || sort !== 'all' || selectedJob !== 'all';
  }, [query, sort, selectedJob]);

  const clearFilters = () => {
    setQuery('');
    setSelectedJob('all');
    setSort('all');
  };

  const handleRestore = async () => {
    if (!restoreTarget?._id) return;
    try {
      setAction({ type: 'restore', id: restoreTarget._id });
      setError('');

      const res = await axios.patch(
        `http://localhost:5000/api/applications/${restoreTarget._id}/restore-declined`,
        {},
        { headers: getAuthHeaders() }
      );

      if (res.data?.success) {
        setApplications((prev) => prev.filter((item) => item._id !== restoreTarget._id));
        setArchiveCounts((prev) => ({
          active: prev.active + 1,
          archived: Math.max(0, prev.archived - 1),
        }));
        setSuccess('Declined applicant restored successfully.');
        setRestoreTarget(null);
      } else {
        setError('Failed to restore declined applicant.');
      }
    } catch (err) {
      console.error(err);
      if (err.response?.status === 401) return handleAuthError();
      setError(err.response?.data?.message || 'Failed to restore declined applicant.');
    } finally {
      setAction({ type: '', id: '' });
    }
  };

  const handlePermanentDelete = async () => {
    if (!deleteTarget?._id) return;
    try {
      setAction({ type: 'delete', id: deleteTarget._id });
      setError('');

      const res = await axios.delete(
        `http://localhost:5000/api/applications/${deleteTarget._id}/permanent`,
        { headers: getAuthHeaders() }
      );

      if (res.data?.success) {
        setApplications((prev) => prev.filter((item) => item._id !== deleteTarget._id));
        setArchiveCounts((prev) => ({
          ...prev,
          archived: Math.max(0, prev.archived - 1),
        }));
        setSuccess('Declined applicant permanently deleted successfully.');
        setDeleteTarget(null);
      } else {
        setError('Failed to permanently delete declined applicant.');
      }
    } catch (err) {
      console.error(err);
      if (err.response?.status === 401) return handleAuthError();
      setError(err.response?.data?.message || 'Failed to permanently delete declined applicant.');
    } finally {
      setAction({ type: '', id: '' });
    }
  };

  const headerRight = useMemo(() => {
    return (
      <div className="inline-flex items-center rounded-2xl border border-gray-200 bg-white p-1 shadow-sm">
        <button
          type="button"
          onClick={() => navigate('/employer/declined')}
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
        >
          <span>Declined</span>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">
            {archiveCounts.active}
          </span>
        </button>

        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl bg-[#f5f7fb] px-4 py-2 text-sm font-semibold text-[#2e66a6]"
          aria-current="page"
        >
          <Icon name="archive" className="h-4 w-4" />
          <span>Archived</span>
          <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-[#2e66a6]">
            {archiveCounts.archived}
          </span>
        </button>
      </div>
    );
  }, [archiveCounts.active, archiveCounts.archived, navigate]);

  const inputBase =
    'w-full rounded-xl border border-gray-300 pl-11 pr-10 py-3 text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2 disabled:bg-gray-50 disabled:opacity-60';

  const selectBase =
    'w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2 disabled:bg-gray-50 disabled:opacity-60';

  return (
    <EmployerLayout>
      <div className="mx-auto max-w-7xl px-1 py-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-[33px] leading-[40px] font-semibold text-gray-900">Archived Declined Applicants</h1>
            <p className="mt-1 text-sm text-gray-600">Restore or permanently delete archived declined application records</p>
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
              <div className="lg:col-span-6">
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-3.5 text-gray-400">
                    <Icon name="search" className="h-5 w-5" />
                  </span>

                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className={inputBase}
                    placeholder="Search archived applicant, email, job title, stage..."
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
                <select
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

              <div className={hasActiveFilters ? 'lg:col-span-2' : 'lg:col-span-3'}>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className={selectBase}
                  disabled={loading}
                >
                  <option value="all">SORT BY</option>
                  <option value="all">All</option>
                  <option value="today">Today</option>
                  <option value="this_week">This Week</option>
                  <option value="this_month">This Month</option>
                  <option value="this_year">This Year</option>
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
                <p className="mt-4 text-sm text-gray-600">Loading archived declined applicants…</p>
              </div>
            ) : filteredApplications.length === 0 ? (
              <div className="py-14 text-center">
                <h3 className="text-lg font-semibold text-gray-900">No archived declined applicants found</h3>
                <p className="mt-2 text-sm text-gray-600">Archived declined applications will appear here after you delete them from the declined list.</p>
              </div>
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Applicant
                        </th>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Job Applied
                        </th>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Applied Date
                        </th>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Archived Date
                        </th>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
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
                        const declinedStageLabel = getDeclinedStageLabel(app.declinedFrom);
                        const busy = action.id === app._id;

                        return (
                          <tr key={app._id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-4">
                                <Avatar
                                  img={app.jobseeker?.profileImage}
                                  name={name}
                                  size={48}
                                  altKey={`archived_declined_${app._id}`}
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
                              <div className="mt-1">
                                <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-red-50 text-red-800 border border-red-200">
                                  {declinedStageLabel}
                                </span>
                              </div>
                            </td>

                            <td className="px-6 py-4 text-sm text-gray-900">{formatDate(app.appliedAt)}</td>
                            <td className="px-6 py-4 text-sm text-gray-900">{formatDate(app.declinedArchivedAt)}</td>

                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Button
                                  variant="primarySoft"
                                  size="xs"
                                  onClick={() => setRestoreTarget(app)}
                                  disabled={busy}
                                >
                                  <Icon name="restore" className="h-4 w-4" />
                                  Restore
                                </Button>

                                <Link
                                  to={`/employer/application/${app._id}`}
                                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2"
                                >
                                  <Icon name="eye" className="h-4 w-4" />
                                  View
                                </Link>

                                <Button
                                  variant="dangerSoft"
                                  size="xs"
                                  onClick={() => setDeleteTarget(app)}
                                  disabled={busy}
                                >
                                  <Icon name="trash" className="h-4 w-4" />
                                  Permanent Delete
                                </Button>
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
                    const declinedStageLabel = getDeclinedStageLabel(app.declinedFrom);
                    const busy = action.id === app._id;

                    return (
                      <div key={app._id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar
                              img={app.jobseeker?.profileImage}
                              name={name}
                              size={44}
                              altKey={`archived_declined_mobile_${app._id}`}
                            />
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold text-gray-900">{name}</div>
                              <div className="truncate text-xs text-gray-600">{email}</div>
                            </div>
                          </div>

                          <span className="shrink-0 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-red-50 text-red-800 border border-red-200">
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
                            Archived: <span className="font-semibold text-gray-800">{formatDate(app.declinedArchivedAt)}</span>
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                          <Button
                            variant="primarySoft"
                            size="md"
                            onClick={() => setRestoreTarget(app)}
                            disabled={busy}
                          >
                            <Icon name="restore" className="h-5 w-5" />
                            Restore
                          </Button>

                          <Link
                            to={`/employer/application/${app._id}`}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2"
                          >
                            <Icon name="eye" className="h-5 w-5" />
                            View
                          </Link>

                          <Button
                            variant="dangerSoft"
                            size="md"
                            onClick={() => setDeleteTarget(app)}
                            disabled={busy}
                          >
                            <Icon name="trash" className="h-5 w-5" />
                            Permanent Delete
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
          open={!!restoreTarget}
          title="Restore declined applicant?"
          description={
            restoreTarget
              ? `This will move ${buildApplicantName(restoreTarget.jobseeker)}'s declined application record back to the declined applicants list.`
              : ''
          }
          confirmText="Restore"
          cancelText="Cancel"
          loading={action.type === 'restore' && !!action.id}
          loadingText="Restoring…"
          onClose={() => {
            if (action.type === 'restore') return;
            setRestoreTarget(null);
          }}
          onConfirm={handleRestore}
        />

        <Modal
          open={!!deleteTarget}
          title="Permanently delete declined applicant?"
          description={
            deleteTarget
              ? `This will permanently delete ${buildApplicantName(deleteTarget.jobseeker)}'s archived declined application record. This action cannot be undone.`
              : ''
          }
          confirmText="Permanent Delete"
          cancelText="Cancel"
          danger
          loading={action.type === 'delete' && !!action.id}
          loadingText="Deleting…"
          onClose={() => {
            if (action.type === 'delete') return;
            setDeleteTarget(null);
          }}
          onConfirm={handlePermanentDelete}
        />
      </div>
    </EmployerLayout>
  );
};

export default ArchivedDeclinedApplicants;