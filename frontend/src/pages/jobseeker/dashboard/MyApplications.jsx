import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import api from '../../../services/api';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const UI = {
  pageBg: 'bg-gray-50',
  container:
    'relative left-1/2 right-1/2 w-[min(96vw,1650px)] max-w-none -translate-x-1/2 px-4 sm:px-6 lg:px-8 py-8',
  section: 'space-y-4',

  card: 'bg-white border border-gray-200 rounded-xl shadow-sm',
  cardHover: 'hover:shadow-md hover:border-gray-300 transition duration-200 motion-reduce:transition-none',
  inset: 'bg-gray-50 border border-gray-200 rounded-lg',

  textPrimary: 'text-gray-900',
  textSecondary: 'text-gray-600',
  textMuted: 'text-gray-500',

  heading1: 'text-2xl sm:text-3xl font-bold tracking-tight',
  heading2: 'text-sm font-semibold',
  heading3: 'text-lg sm:text-xl font-bold',
  body: 'text-sm sm:text-base',
  caption: 'text-xs',

  ring: 'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2',

  btnBase:
    'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition active:scale-[0.99] disabled:opacity-60 disabled:pointer-events-none motion-reduce:transition-none motion-reduce:transform-none',
  btnSm: 'h-9 px-3 text-sm',
  btnMd: 'h-10 px-4 text-sm',
  btnLg: 'h-11 px-5 text-base',

  btnPrimary: 'bg-[#2e66a6] text-white hover:bg-[#2e66a6]/90',
  btnSecondary: 'bg-white text-gray-800 border border-gray-200 hover:bg-gray-100',
  btnInfo: 'bg-[#2e66a6]/10 text-[#2e66a6] border border-[#2e66a6]/20 hover:bg-[#2e66a6]/15',
  btnDangerSoft: 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100',
  btnSuccessSoft: 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100',

  chipBase: 'inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border',
  badgeBase: 'px-4 py-2 rounded-full font-semibold text-sm border',

  divider: 'border-t border-gray-100',
  spinner: 'animate-spin motion-reduce:animate-none',
};

const ACTIVE_STATUSES = ['pending', 'for interview', 'hired', 'vacancy full'];
const INACTIVE_STATUSES = ['declined', 'withdrawn', 'cancelled'];
const REACTIVATABLE_STATUSES = ['withdrawn', 'cancelled'];

const SvgIcon = ({ name, className = 'w-4 h-4' }) => {
  switch (name) {
    case 'file':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      );
    case 'clock':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
    case 'checkCircle':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
    case 'timesCircle':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M15 9l-6 6m0-6l6 6m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
    case 'eye':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      );
    case 'briefcase':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m-3 0h14a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9a2 2 0 012-2z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 13h18" />
        </svg>
      );
    case 'laptop':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M5 5h14a1 1 0 011 1v9H4V6a1 1 0 011-1z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M2.5 18h19M8 18h8"
          />
        </svg>
      );
    case 'building':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.6}
            d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3.75h1.5m-1.5 3.75h1.5m3-7.5H15m-1.5 3.75H15m-1.5 3.75H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21"
          />
        </svg>
      );
    case 'calendar':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      );
    case 'location':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.9}
            d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.9}
            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      );
    case 'download':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 3v12m0 0l4-4m-4 4l-4-4" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 21h14" />
        </svg>
      );
    case 'refresh':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 4v6h6M20 20v-6h-6" />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M20 10a8 8 0 00-14.657-4.657L4 10m0 4a8 8 0 0014.657 4.657L20 14"
          />
        </svg>
      );
    case 'login':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10 17l5-5-5-5" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12H3" />
        </svg>
      );
    case 'star':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M11.48 3.499a1 1 0 011.04 0l2.4 1.384a1 1 0 00.75.105l2.74-.7a1 1 0 011.21 1.21l-.7 2.74a1 1 0 00.105.75l1.384 2.4a1 1 0 010 1.04l-1.384 2.4a1 1 0 00-.105.75l.7 2.74a1 1 0 01-1.21 1.21l-2.74-.7a1 1 0 00-.75.105l-2.4 1.384a1 1 0 01-1.04 0l-2.4-1.384a1 1 0 00-.75-.105l-2.74.7A1 1 0 013.5 19.3l.7-2.74a1 1 0 00-.105-.75l-1.384-2.4a1 1 0 010-1.04l1.384-2.4a1 1 0 00.105-.75l-.7-2.74A1 1 0 014.71 3.594l2.74.7a1 1 0 00.75-.105l2.28-1.31z"
          />
        </svg>
      );
    case 'dots':
      return (
        <svg className={className} fill="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="5" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="12" cy="19" r="1.8" />
        </svg>
      );
    case 'arrowPath':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 4v6h6" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20 20v-6h-6" />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M20 10a8 8 0 00-13.657-4.657L4 10m0 4a8 8 0 0013.657 4.657L20 14"
          />
        </svg>
      );
    default:
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 6v6l4 2" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
  }
};

const CompanyLogo = ({ logoUrl, companyName }) => {
  const [failed, setFailed] = useState(false);
  const initial = (companyName?.trim()?.[0] || 'C').toUpperCase();

  if (!logoUrl || failed) {
    return (
      <div className="w-14 h-14 rounded-xl border border-gray-200 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center flex-shrink-0">
        <span className="font-bold text-lg text-gray-700" aria-hidden="true">
          {initial}
        </span>
        <span className="sr-only">{companyName || 'Company'}</span>
      </div>
    );
  }

  return (
    <div className="w-14 h-14 rounded-xl overflow-hidden border border-gray-200 bg-white flex-shrink-0">
      <img
        src={logoUrl}
        alt={`${companyName || 'Company'} logo`}
        className="w-full h-full object-cover"
        onError={() => setFailed(true)}
        loading="lazy"
      />
    </div>
  );
};

const LoadingSkeleton = () => (
  <div className="space-y-4 animate-pulse motion-reduce:animate-none" aria-hidden="true">
    <div className={`${UI.card} p-4`}>
      <div className="h-5 w-48 bg-gray-100 rounded mb-2" />
      <div className="h-4 w-80 bg-gray-100 rounded" />
    </div>
    <div className="grid gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className={`${UI.card} p-6`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gray-100 rounded-lg" />
              <div className="space-y-2">
                <div className="h-5 w-64 bg-gray-100 rounded" />
                <div className="h-4 w-80 bg-gray-100 rounded" />
                <div className="h-4 w-52 bg-gray-100 rounded" />
              </div>
            </div>
            <div className="h-8 w-28 bg-gray-100 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

const MyApplications = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [mainTab, setMainTab] = useState('active');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const location = useLocation();
  const navigate = useNavigate();

  const inFlightRef = useRef(false);
  const tabRefs = useRef({});
  const subTabRefs = useRef({});

  const apiOrigin = useMemo(() => {
    const base = api?.defaults?.baseURL || process.env.REACT_APP_API_URL || 'https://phinmaau-job-portal-atlas.onrender.com/api';
    return String(base).replace(/\/api\/?$/, '');
  }, []);

  const getCompanyLogo = (application) => {
    if (application.job?.companyLogo) {
      const logo = application.job.companyLogo;
      if (logo.startsWith('http')) return logo;
      if (logo.startsWith('/')) return `${apiOrigin}${logo}`;
      return `${apiOrigin}/uploads/logos/${logo}`;
    }

    if (application.employer?.employerProfile?.companyLogo) {
      const logo = application.employer.employerProfile.companyLogo;
      if (logo.startsWith('http')) return logo;
      if (logo.startsWith('/')) return `${apiOrigin}${logo}`;
      return `${apiOrigin}/uploads/logos/${logo}`;
    }

    return null;
  };

  const formatLocationDisplay = (loc) => {
    const v = String(loc || '').trim();
    return v || '—';
  };

  const getQueryParams = useCallback(() => {
    const searchParams = new URLSearchParams(location.search);
    const tabParam = searchParams.get('tab') || 'active';
    const statusParam = searchParams.get('status') || 'all';

    return {
      tab: tabParam === 'inactive' ? 'inactive' : 'active',
      status: statusParam === 'vacancy full'
        ? 'pending'
        : ['all', 'pending', 'for interview', 'hired', 'declined'].includes(statusParam)
          ? statusParam
          : 'all',
    };
  }, [location.search]);

  const formatAppliedDateTime = (dateString) => {
    if (!dateString) return 'N/A';

    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return 'N/A';

    const formattedDate = date.toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    const formattedTime = date.toLocaleTimeString('en-PH', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    return `${formattedDate} at ${formattedTime}`;
  };

  const formatPesoRange = (min, max) => {
    const toNum = (v) => {
      if (v === null || v === undefined || v === '') return null;
      const n = typeof v === 'number' ? v : Number(String(v).replace(/,/g, ''));
      return Number.isFinite(n) ? n : null;
    };

    const minN = toNum(min);
    const maxN = toNum(max);

    if (minN === null && maxN === null) return null;

    const fmt = (n) => n.toLocaleString('en-PH');

    if (minN !== null && maxN !== null) return `₱${fmt(minN)}–${fmt(maxN)}`;
    if (minN !== null) return `₱${fmt(minN)}+`;
    return `Up to ₱${fmt(maxN)}`;
  };

  const getPendingDisplayState = (application) => {
    const statusValue = String(application?.status || '').toLowerCase();

    if (statusValue === 'pending') {
      return {
        text: 'Pending',
        badgeClass: 'text-amber-700',
      };
    }

    return null;
  };

  const getStatusText = (applicationOrStatus) => {
    const application =
      typeof applicationOrStatus === 'object' && applicationOrStatus !== null
        ? applicationOrStatus
        : null;

    const rawStatus = application ? application.status : applicationOrStatus;
    const normalizedStatus = String(rawStatus || '').toLowerCase();

    const pendingDisplay = application ? getPendingDisplayState(application) : null;
    if (pendingDisplay) return pendingDisplay.text;

    switch (normalizedStatus) {
      case 'for interview': {
        const hiringStage = String(application?.hiringStage || '').trim();
        return hiringStage ? `For Interview – ${hiringStage}` : 'For Interview';
      }
      case 'hired':
        return 'Hired';
      case 'declined':
        return 'Declined';
      case 'vacancy full':
        return 'Positions Filled';
      case 'withdrawn':
        return 'You withdrawn this application';
      case 'cancelled':
        return 'Cancelled';
      case 'pending':
      default:
        return 'Pending';
    }
  };

  const getStatusBadgeClass = (applicationOrStatus) => {
    const application =
      typeof applicationOrStatus === 'object' && applicationOrStatus !== null
        ? applicationOrStatus
        : null;

    const rawStatus = application ? application.status : applicationOrStatus;
    const normalizedStatus = String(rawStatus || '').toLowerCase();

    const pendingDisplay = application ? getPendingDisplayState(application) : null;
    if (pendingDisplay) return pendingDisplay.badgeClass;

    switch (normalizedStatus) {
      case 'for interview':
        return 'text-[#2e66a6]';
      case 'hired':
        return 'text-emerald-700';
      case 'withdrawn':
        return 'text-red-700';
      case 'cancelled':
        return 'text-gray-600';
      case 'declined':
        return 'text-red-700';
      case 'vacancy full':
        return 'text-orange-700';
      case 'pending':
      default:
        return 'text-gray-700';
    }
  };

  const fetchApplications = useCallback(async () => {
    if (inFlightRef.current) return;

    try {
      inFlightRef.current = true;

      setRefreshing(true);
      setLoading(true);
      setError('');
      setNeedsLogin(false);

      const token = localStorage.getItem('token');
      if (!token) {
        setNeedsLogin(true);
        setError('Please login to view your applications.');
        setApplications([]);
        return;
      }

      const response = await api.get('/applications/my-applications');

      if (response.data.success) {
        setApplications(response.data.applications || []);
        setLastUpdated(new Date());
      } else {
        setError(response.data.message || 'Failed to fetch applications.');
      }
    } catch (err) {
      console.error('Error fetching applications:', err);
      setError(err.response?.data?.message || 'Error loading applications. Please try again.');
    } finally {
      setRefreshing(false);
      setLoading(false);
      inFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    const params = getQueryParams();
    setMainTab(params.tab);
    setStatusFilter(params.tab === 'inactive' ? (params.status === 'declined' ? 'declined' : 'all') : params.status);
    fetchApplications();
  }, [getQueryParams, fetchApplications]);

  const updateUrl = (tabValue, statusValue) => {
    const params = new URLSearchParams();

    if (tabValue === 'inactive') {
      params.set('tab', 'inactive');
    }

    if (statusValue && statusValue !== 'all') {
      params.set('status', statusValue);
    }

    const qs = params.toString();
    navigate(`/jobseeker/my-applications${qs ? `?${qs}` : ''}`);
  };

  const handleMainTabChange = (nextTab) => {
    setMainTab(nextTab);
    setActionMessage('');

    if (nextTab === 'inactive') {
      if (statusFilter !== 'declined') {
        setStatusFilter('all');
        updateUrl('inactive', 'all');
      } else {
        updateUrl('inactive', 'declined');
      }
      return;
    }

    const nextStatus = ['pending', 'for interview', 'hired'].includes(statusFilter) ? statusFilter : 'all';
    setStatusFilter(nextStatus);
    updateUrl('active', nextStatus);
  };

  const handleStatusFilterChange = (nextStatus) => {
    setActionMessage('');

    if (nextStatus === 'declined') {
      setMainTab('inactive');
      setStatusFilter('declined');
      updateUrl('inactive', 'declined');
      return;
    }

    setMainTab('active');
    setStatusFilter(nextStatus);
    updateUrl('active', nextStatus);
  };

  const counts = useMemo(() => {
    const activeApps = applications.filter((app) =>
      ACTIVE_STATUSES.includes((app.status || '').toLowerCase())
    );
    const inactiveApps = applications.filter((app) =>
      INACTIVE_STATUSES.includes((app.status || '').toLowerCase())
    );

    return {
      active: activeApps.length,
      inactive: inactiveApps.length,
      pending: activeApps.filter((app) => ['pending', 'vacancy full'].includes((app.status || '').toLowerCase())).length,
      forInterview: activeApps.filter((app) => (app.status || '').toLowerCase() === 'for interview').length,
      hired: activeApps.filter((app) => (app.status || '').toLowerCase() === 'hired').length,
      declined: inactiveApps.filter((app) => (app.status || '').toLowerCase() === 'declined').length,
    };
  }, [applications]);

  const topFilters = useMemo(
    () => [
      { key: 'pending', label: 'Pending', count: counts.pending, icon: 'clock' },
      { key: 'for interview', label: 'For Interview', count: counts.forInterview, icon: 'star' },
      { key: 'hired', label: 'Hired', count: counts.hired, icon: 'checkCircle' },
      { key: 'declined', label: 'Declined', count: counts.declined, icon: 'timesCircle' },
    ],
    [counts]
  );

  const filteredApplications = useMemo(() => {
    if (statusFilter === 'declined') {
      return applications.filter((app) => (app.status || '').toLowerCase() === 'declined');
    }

    if (mainTab === 'inactive') {
      return applications.filter((app) => {
        const status = (app.status || '').toLowerCase();
        return status === 'withdrawn' || status === 'cancelled';
      });
    }

    const activeApps = applications.filter((app) =>
      ACTIVE_STATUSES.includes((app.status || '').toLowerCase())
    );

    if (statusFilter === 'all') return activeApps;

    if (statusFilter === 'pending') {
      return activeApps.filter((app) =>
        ['pending', 'vacancy full'].includes((app.status || '').toLowerCase())
      );
    }

    return activeApps.filter((app) => (app.status || '').toLowerCase() === statusFilter);
  }, [applications, mainTab, statusFilter]);

  const searchedApplications = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return filteredApplications;

    return applications.filter((application) => {
      const statusText = getStatusText(application);
      const salaryText = formatPesoRange(application.job?.salaryMin, application.job?.salaryMax) || '';
      const appliedDateText = formatAppliedDateTime(application.appliedAt);
      const searchableValues = [
        application.job?.title,
        application.job?.companyName,
        application.job?.location,
        application.job?.workOfficeAddress,
        application.job?.officeAddress,
        application.job?.jobType,
        application.job?.workMode,
        application.job?.industry,
        application.job?.companyIndustry,
        application.employer?.employerProfile?.industry,
        application.employer?.employerProfile?.companyAddress,
        application.status,
        application.hiringStage,
        salaryText,
        statusText,
        appliedDateText,
      ];

      return searchableValues.some((value) =>
        String(value || '').toLowerCase().includes(query)
      );
    });
  }, [applications, filteredApplications, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(searchedApplications.length / pageSize));

  const paginatedApplications = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return searchedApplications.slice(startIndex, startIndex + pageSize);
  }, [searchedApplications, currentPage, pageSize]);

  const showPagination = searchedApplications.length > pageSize;

  useEffect(() => {
    setCurrentPage(1);
  }, [mainTab, statusFilter, searchQuery, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const paginationItems = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, 'ellipsis-right', totalPages];
    }

    if (currentPage >= totalPages - 3) {
      return [
        1,
        'ellipsis-left',
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ];
    }

    return [
      1,
      'ellipsis-left',
      currentPage - 1,
      currentPage,
      currentPage + 1,
      'ellipsis-right',
      totalPages,
    ];
  }, [currentPage, totalPages]);

  const filterLabel = useMemo(() => {
    if (statusFilter === 'declined') return 'Declined Applications';
    if (mainTab === 'inactive') return 'Withdrawn / Cancelled Applications';
    if (statusFilter === 'pending') return 'Pending Applications';
    if (statusFilter === 'for interview') return 'For Interview Applications';
    if (statusFilter === 'hired') return 'Hired Applications';
    return 'Active Applications';
  }, [mainTab, statusFilter]);

  const updatedText = useMemo(() => {
    if (!lastUpdated) return '';
    return lastUpdated.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
  }, [lastUpdated]);

  const focusTab = (key, refMap) => {
    const el = refMap.current[key];
    if (el) el.focus();
  };

  const onMainTabKeyDown = (e, currentKey) => {
    const keys = ['active', 'inactive'];
    const currentIndex = keys.indexOf(currentKey);

    const go = (nextIndex) => {
      const nextKey = keys[nextIndex];
      handleMainTabChange(nextKey);
      setTimeout(() => focusTab(nextKey, tabRefs), 0);
    };

    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        go((currentIndex + 1) % keys.length);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        go((currentIndex - 1 + keys.length) % keys.length);
        break;
      default:
        break;
    }
  };

  const onStatusTabKeyDown = (e, currentKey) => {
    const keys = topFilters.map((item) => item.key);
    const currentIndex = keys.indexOf(currentKey);

    const go = (nextIndex) => {
      const nextKey = keys[nextIndex];
      handleStatusFilterChange(nextKey);
      setTimeout(() => focusTab(nextKey, subTabRefs), 0);
    };

    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        go((currentIndex + 1) % keys.length);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        go((currentIndex - 1 + keys.length) % keys.length);
        break;
      default:
        break;
    }
  };

  const handleWithdraw = async (applicationId) => {
    try {
      setActionLoadingId(applicationId);
      setActionMessage('');
      setError('');
  
      const response = await api.put(`/applications/${applicationId}/withdraw`);

      if (response.data.success) {
        const updatedApplication = response.data.application;
        setApplications((prev) =>
          prev.map((app) => (app._id === applicationId ? updatedApplication : app))
        );
        setLastUpdated(new Date());
        setActionMessage('Application withdrawn successfully.');
      }
    } catch (err) {
      console.error('Error withdrawing application:', err);
      setError(err.response?.data?.message || 'Failed to withdraw application.');
    } finally {
      setActionLoadingId('');
    }
  };

  const handleReactivate = async (applicationId) => {
    try {
      setActionLoadingId(applicationId);
      setActionMessage('');
      setError('');

      const response = await api.put(`/applications/${applicationId}/reactivate`);

      if (response.data.success) {
        const updatedApplication = response.data.application;
        setApplications((prev) =>
          prev.map((app) => (app._id === applicationId ? updatedApplication : app))
        );
        setLastUpdated(new Date());
        setActionMessage('Application reactivated successfully.');
      }
    } catch (err) {
      console.error('Error reactivating application:', err);
      setError(err.response?.data?.message || 'Failed to reactivate application.');
    } finally {
      setActionLoadingId('');
    }
  };

  return (
    <div className={`${UI.pageBg} min-h-screen`}>
      <div className="max-w-[1400px] mx-auto mt-2 px-4 sm:px-6 lg:px-8 py-8">
        <div className={UI.section}>
          <div
            className="
              relative rounded-[26px]
              bg-gradient-to-r from-[#082764] via-[#244e7f] to-[#4a9fc3]
              p-6 sm:p-8 text-white shadow-sm overflow-hidden
            "
          >
            <div className="pointer-events-none absolute inset-0 z-0">
              <div
                className="
                  absolute
                  w-[70px] sm:w-[110px] h-[70px] sm:h-[110px]
                  rounded-full blur-[28px] sm:blur-[38px]
                  bottom-[-55px] sm:bottom-[-70px]
                  right-[-40px]
                  opacity-60
                "
                style={{
                  background:
                    'radial-gradient(circle, rgba(110,231,183,0.25) 0%, rgba(110,231,183,0.12) 45%, transparent 75%)',
                }}
              />
            </div>

            <img
              src="/images/myapplication1.png"
              alt=""
              className="
                pointer-events-none absolute
                right-[18px] sm:right-[28px]
                top-1/2 -translate-y-1/2
                w-44 h-44 sm:w-56 sm:h-56
                object-contain opacity-60
                mix-blend-soft-light saturate-120 z-0
              "
              style={{
                WebkitMaskImage:
                  'radial-gradient(circle at 35% 50%, rgba(0,0,0,1) 0%, rgba(0,0,0,0.5) 55%, rgba(0,0,0,0) 80%)',
                maskImage:
                  'radial-gradient(circle at 35% 50%, rgba(0,0,0,1) 0%, rgba(0,0,0,0.5) 55%, rgba(0,0,0,0) 80%)',
              }}
            />

            <div className="relative z-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div className="space-y-1">
                <h1 className={UI.heading1}>My Applications</h1>

                <p className="text-sm sm:text-base text-white/90">
                  Track the status of your job applications
                </p>

                {lastUpdated && (
                  <p className="text-xs text-white/70" aria-live="polite">
                    Updated {updatedText}
                  </p>
                )}
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-black/15 bg-black/5 p-4" role="alert" aria-live="polite">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <p className="text-black font-semibold">{error}</p>

                <div className="flex flex-col sm:flex-row gap-2">
                  {needsLogin ? (
                    <Link to="/login" className={`${UI.btnBase} ${UI.btnMd} ${UI.btnPrimary} ${UI.ring} w-full sm:w-auto`}>
                      <span className="inline-flex items-center justify-center w-5 h-5">
                        <SvgIcon name="login" className="w-4 h-4" />
                      </span>
                      Login
                    </Link>
                  ) : (
                    <button
                      onClick={fetchApplications}
                      disabled={loading || refreshing}
                      className={`${UI.btnBase} ${UI.btnMd} ${UI.btnSecondary} ${UI.ring} w-full sm:w-auto`}
                      type="button"
                    >
                      <span className="inline-flex items-center justify-center w-5 h-5">
                        {refreshing ? (
                          <svg className={`w-4 h-4 ${UI.spinner}`} viewBox="0 0 24 24" fill="none">
                            <path d="M12 2a10 10 0 1010 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          </svg>
                        ) : (
                          <SvgIcon name="refresh" className="w-4 h-4" />
                        )}
                      </span>
                      Try Again
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {actionMessage && !error && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4" role="status" aria-live="polite">
              <p className="text-emerald-800 font-semibold">{actionMessage}</p>
            </div>
          )}

          <div className={`${UI.card} p-4`}>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[130px_minmax(220px,1fr)_auto] lg:items-center">
              <div>
                <h2 className={`${UI.heading2} ${UI.textPrimary}`}>Status</h2>
                <p className={`text-sm ${UI.textSecondary}`}>Filter Application</p>
              </div>

              <div className="relative w-full">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="m21 21-4.35-4.35m1.35-5.65a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search applications..."
                  className={`h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 transition hover:border-[#2e66a6]/60 hover:shadow-md focus:border-[#2e66a6] focus:shadow-[0_0_0_3px_rgba(46,102,166,0.12)] ${UI.ring}`}
                  aria-label="Search applications"
                />
              </div>

              <div
                role="tablist"
                aria-label="Application status filters"
                className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:w-auto lg:grid-cols-4"
              >
                {topFilters.map((item) => {
                  const active =
                    item.key === 'declined'
                      ? statusFilter === 'declined'
                      : mainTab === 'active' && statusFilter === item.key;

                  return (
                    <button
                      key={item.key}
                      ref={(el) => (subTabRefs.current[item.key] = el)}
                      role="tab"
                      aria-selected={active}
                      tabIndex={active ? 0 : -1}
                      onKeyDown={(e) => onStatusTabKeyDown(e, item.key)}
                      onClick={() => handleStatusFilterChange(item.key)}
                      className={[
                        UI.btnBase,
                        'min-h-[44px] justify-start rounded-xl border px-3 py-2 text-sm',
                        UI.ring,
                        active
                          ? 'border-[#2e66a6]/30 bg-[#2e66a6]/5 text-[#2e66a6] shadow-sm'
                          : 'border-gray-200 bg-white text-gray-700 shadow-sm hover:border-[#2e66a6]/45 hover:bg-[#2e66a6]/5',
                      ].join(' ')}
                      type="button"
                    >
                      <span className={`flex-shrink-0 ${active ? 'text-[#2e66a6]' : 'text-gray-700'}`}>
                        <SvgIcon name={item.icon} className="w-[18px] h-[18px]" />
                      </span>
                      <span className="whitespace-nowrap">{item.label}</span>
                      <span className="ml-1 inline-flex items-center justify-center min-w-[26px] px-2 py-0.5 rounded-full text-xs bg-gray-200 text-gray-800">
                        {item.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="pt-2">
            <div className={`${UI.card} p-6`}>
                  <div>
                    <h3 className={`text-lg font-bold tracking-tight ${UI.textPrimary}`}>Understanding Application Status</h3>
                    <p className={`mt-1 text-sm ${UI.textSecondary}`}>Quick guide for what each status means.</p>
                  </div>

                  <div className="mt-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl border border-gray-200 bg-white">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 text-black/70">
                          <SvgIcon name="clock" className="w-6 h-6" />
                        </div>
                        <div>
                          <p className={`font-semibold ${UI.textPrimary}`}>Pending</p>
                          <p className={`mt-1 text-sm ${UI.textSecondary}`}>Your application was sent successfully and it is still under review.</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-gray-200 bg-white">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 text-[#2e66a6]">
                          <SvgIcon name="star" className="w-6 h-6" />
                        </div>
                        <div>
                          <p className={`font-semibold ${UI.textPrimary}`}>For Interview</p>
                          <p className={`mt-1 text-sm ${UI.textSecondary}`}>You passed initial screening. Wait for interview or next steps.</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-gray-200 bg-white">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 text-emerald-700">
                          <SvgIcon name="checkCircle" className="w-6 h-6" />
                        </div>
                        <div>
                          <p className={`font-semibold ${UI.textPrimary}`}>Hired</p>
                          <p className={`mt-1 text-sm ${UI.textSecondary}`}>The employer has hired you for the role.</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-gray-200 bg-white">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 text-black/70">
                          <SvgIcon name="timesCircle" className="w-6 h-6" />
                        </div>
                        <div>
                          <p className={`font-semibold ${UI.textPrimary}`}>Declined</p>
                          <p className={`mt-1 text-sm ${UI.textSecondary}`}>Not selected this time. You can also view the employer's decline reason and feedback here.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                
            </div>
          </div>

          <div className="border-b border-gray-200">
            <div className="flex items-center gap-8">
              {[
                { key: 'active', label: 'Active' },
                { key: 'inactive', label: 'Inactive' },
              ].map((item) => {
                const active = mainTab === item.key;

                return (
                  <button
                    key={item.key}
                    ref={(el) => (tabRefs.current[item.key] = el)}
                    role="tab"
                    aria-selected={active}
                    tabIndex={active ? 0 : -1}
                    onKeyDown={(e) => onMainTabKeyDown(e, item.key)}
                    onClick={() => handleMainTabChange(item.key)}
                    className={[
                      'relative pb-3 text-sm font-semibold transition-colors',
                      active ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700',
                    ].join(' ')}
                    type="button"
                  >
                    {item.label}
                    <span
                      className={[
                        'absolute left-0 right-0 -bottom-px h-0.5 rounded-full transition-opacity',
                        active ? 'bg-[#2e66a6] opacity-100' : 'bg-transparent opacity-0',
                      ].join(' ')}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {loading ? (
            <div aria-live="polite" aria-busy="true">
              <LoadingSkeleton />
            </div>
          ) : searchedApplications.length === 0 ? (
            <div className={`${UI.card} p-8 sm:p-10 text-center`}>
              <div className="mx-auto w-16 h-16 rounded-2xl bg-black/5 flex items-center justify-center mb-5 text-black/60">
                <SvgIcon name="file" className="w-7 h-7" />
              </div>

              <h3 className={`text-xl sm:text-2xl font-bold tracking-tight ${UI.textPrimary}`}>
                {statusFilter === 'declined'
                  ? 'No Declined Applications'
                  : mainTab === 'inactive'
                  ? 'No Inactive Applications'
                  : 'No Applications Found'}
              </h3>

              <p className={`mt-2 max-w-lg mx-auto ${UI.body} ${UI.textSecondary}`}>
                {statusFilter === 'declined'
                  ? 'You have no declined applications right now.'
                  : mainTab === 'inactive'
                  ? 'You have no withdrawn or cancelled applications right now.'
                  : 'No applications match the selected status filter.'}
              </p>

              <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                {statusFilter === 'declined' ? (
                  <button
                    onClick={() => handleMainTabChange('active')}
                    className={`${UI.btnBase} ${UI.btnLg} ${UI.btnSecondary} ${UI.ring}`}
                    type="button"
                  >
                    View Active
                  </button>
                ) : mainTab === 'active' ? (
                  <button
                    onClick={() => handleStatusFilterChange('all')}
                    className={`${UI.btnBase} ${UI.btnLg} ${UI.btnSecondary} ${UI.ring}`}
                    type="button"
                  >
                    View All Active
                  </button>
                ) : (
                  <button
                    onClick={() => handleMainTabChange('active')}
                    className={`${UI.btnBase} ${UI.btnLg} ${UI.btnSecondary} ${UI.ring}`}
                    type="button"
                  >
                    View Active
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid gap-6">
                {paginatedApplications.map((application) => {
                  const statusValue = (application.status || '').toLowerCase();
                  const statusText = getStatusText(application);
                  const statusBadge = getStatusBadgeClass(application);

                  const jobId = application.job?._id;
                  const jobTitle = application.job?.title || 'Job Title Not Available';
                  const companyName = application.job?.companyName || 'Company Not Specified';
                  const appliedAt = formatAppliedDateTime(application.appliedAt);

                  const industryText =
                    application.job?.industry ||
                    application.job?.companyIndustry ||
                    application.employer?.employerProfile?.industry ||
                    null;
                  const workOfficeAddressText =
                    application.job?.workOfficeAddress ||
                    application.job?.officeAddress ||
                    application.job?.location ||
                    application.employer?.employerProfile?.companyAddress ||
                    null;
                  const workModeText = application.job?.workMode || null;
                  const salaryText = formatPesoRange(application.job?.salaryMin, application.job?.salaryMax);
                  const jobTypeText = application.job?.jobType || null;

                  const resumeUrl = application.jobseeker?.jobSeekerProfile?.resumeUrl || '';
                  const logoUrl = getCompanyLogo(application);

                  const isActiveCard = ACTIVE_STATUSES.includes(statusValue);
                  const isReactivatableCard = REACTIVATABLE_STATUSES.includes(statusValue);
                  const isDeclinedCard = statusValue === 'declined';
                  const isActionLoading = actionLoadingId === application._id;

                  const declineReason = String(application.declineReason || '').trim();
                  const declineComment = String(application.declineComment || '').trim();

                  return (
                    <div key={application._id} className={`${UI.card} ${UI.cardHover} overflow-hidden`}>
                      <div className="p-5 sm:p-6">
                        <div className="flex items-start gap-4">
                          <CompanyLogo logoUrl={logoUrl} companyName={companyName} />

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                              <h3 className={`${UI.heading3} ${UI.textPrimary}`} title={jobTitle}>
                                {jobTitle}
                              </h3>
                              <span className={`text-sm font-semibold ${statusBadge}`} aria-label={`Status: ${statusText}`}>
                                {statusText}
                              </span>
                            </div>

                            <div className={`mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm ${UI.textSecondary}`}>
                              <span className="inline-flex min-w-0 items-center gap-1.5" title={companyName}>
                                <SvgIcon name="building" className="h-[18px] w-[18px] flex-shrink-0 text-gray-500" />
                                <span className="truncate">{companyName}</span>
                              </span>

                              {industryText && (
                                <>
                                  <span className="font-medium text-gray-300" aria-hidden="true">|</span>
                                  <span className="inline-flex min-w-0 items-center gap-1.5" title={industryText}>
                                    <SvgIcon name="building" className="h-[18px] w-[18px] flex-shrink-0 text-gray-500" />
                                    <span className="truncate">{industryText}</span>
                                  </span>
                                </>
                              )}

                              {workOfficeAddressText && (
                                <>
                                  <span className="font-medium text-gray-300" aria-hidden="true">|</span>
                                  <span
                                    className="inline-flex min-w-0 items-center gap-1.5"
                                    title={formatLocationDisplay(workOfficeAddressText)}
                                  >
                                    <SvgIcon name="location" className="h-[18px] w-[18px] flex-shrink-0 text-gray-500" />
                                    <span className="truncate">{formatLocationDisplay(workOfficeAddressText)}</span>
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                          <div className="flex min-w-0 flex-wrap gap-2">
                            {jobTypeText && (
                              <span className={`${UI.chipBase} bg-gray-50 text-gray-700 border-gray-200`}>
                                <span className="text-gray-500"><SvgIcon name="briefcase" className="w-4 h-4" /></span>
                                {jobTypeText}
                              </span>
                            )}
                            {workModeText && (
                              <span className={`${UI.chipBase} bg-gray-50 text-gray-700 border-gray-200`}>
                                <span className="text-gray-500"><SvgIcon name="laptop" className="w-4 h-4" /></span>
                                {workModeText}
                              </span>
                            )}
                            {salaryText && (
                              <span className={`${UI.chipBase} bg-[#2e66a6]/10 text-[#2e66a6] border-[#2e66a6]/20`}>
                                {salaryText}
                              </span>
                            )}
                            <span className={`${UI.chipBase} bg-gray-50 text-gray-700 border-gray-200`}>
                              <span className="text-gray-500"><SvgIcon name="calendar" className="w-4 h-4" /></span>
                              Applied on {appliedAt}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 xl:flex-shrink-0 xl:justify-end">
                            {isActiveCard && (
                              <button
                                type="button"
                                onClick={() => handleWithdraw(application._id)}
                                disabled={isActionLoading}
                                className={`${UI.btnBase} ${UI.btnMd} ${UI.btnDangerSoft} ${UI.ring}`}
                              >
                                Withdraw
                              </button>
                            )}

                            {isReactivatableCard && (
                              <button
                                type="button"
                                onClick={() => handleReactivate(application._id)}
                                disabled={isActionLoading}
                                className={`${UI.btnBase} ${UI.btnMd} ${UI.btnSuccessSoft} ${UI.ring}`}
                              >
                                <SvgIcon name="arrowPath" className="w-4 h-4" />
                                Reactivate
                              </button>
                            )}

                            {jobId ? (
                              <Link
                                to={`/jobseeker/job-details/${jobId}`}
                                state={{ sourcePage: 'myapplications' }}
                                className={`${UI.btnBase} ${UI.btnMd} ${UI.btnInfo} ${UI.ring}`}
                              >
                                <SvgIcon name="eye" className="w-4 h-4" />
                                View Job
                              </Link>
                            ) : (
                              <span className={`${UI.btnBase} ${UI.btnMd} ${UI.btnInfo} opacity-60 cursor-not-allowed`} aria-disabled="true">
                                <SvgIcon name="eye" className="w-4 h-4" />
                                View Job
                              </span>
                            )}
                          </div>
                        </div>

                        {isDeclinedCard && (
                          <div className={`mt-4 pt-4 ${UI.divider}`}>
                            <h4 className={`text-sm font-semibold ${UI.textPrimary}`}>Decline Feedback</h4>

                            <div className="mt-2 space-y-3">
                              <div className={`${UI.inset} p-3`}>
                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                  Reason
                                </p>
                                <p className={`mt-1 text-sm leading-relaxed ${UI.textSecondary}`}>
                                  {declineReason || 'No decline reason was provided.'}
                                </p>
                              </div>

                              {declineComment && (
                                <div className={`${UI.inset} p-3`}>
                                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                    Additional Comment
                                  </p>
                                  <p className={`mt-1 text-sm leading-relaxed ${UI.textSecondary}`}>
                                    {declineComment}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {application.notes && statusValue !== 'vacancy full' && (
                          <div className={`mt-4 pt-4 ${UI.divider}`}>
                            <h4 className={`text-sm font-semibold ${UI.textPrimary}`}>Employer Notes</h4>
                            <div className={`mt-2 ${UI.inset} p-3`}>
                              <p className={`text-sm leading-relaxed ${UI.textSecondary}`}>{application.notes}</p>
                            </div>
                          </div>
                        )}

                        {isActionLoading && (
                          <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                            <p className="text-sm text-gray-600">Updating application status...</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {showPagination && (
                <div
                  className="mt-8 flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between"
                  aria-label="Application pagination"
                >
                  <div className="whitespace-nowrap rounded-lg bg-[#2e66a6]/10 px-3 py-2 text-sm font-bold text-[#2e66a6]">
                    Page {currentPage} of {totalPages} · {searchedApplications.length} total
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <span className="whitespace-nowrap">Display per page</span>
                      <select
                        value={pageSize}
                        onChange={(event) => setPageSize(Number(event.target.value))}
                        className={`h-11 rounded-xl border border-gray-200 bg-white px-3 outline-none focus:border-[#2e66a6] ${UI.ring}`}
                      >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                    </label>

                    <nav
                      className="inline-flex min-h-11 items-center overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
                      aria-label="Application pagination controls"
                    >
                      <button
                        type="button"
                        onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                        disabled={currentPage === 1}
                        className={`inline-flex h-11 items-center gap-2 border-r border-gray-200 px-4 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 ${UI.ring}`}
                      >
                        <span aria-hidden="true">‹</span>
                        Previous
                      </button>

                      <div className="flex h-11 items-center px-2">
                        {paginationItems.map((item) =>
                          typeof item === 'string' ? (
                            <span
                              key={item}
                              className="inline-flex h-9 min-w-9 items-center justify-center px-2 text-sm font-semibold text-gray-400"
                              aria-hidden="true"
                            >
                              …
                            </span>
                          ) : (
                            <button
                              key={item}
                              type="button"
                              onClick={() => setCurrentPage(item)}
                              aria-current={currentPage === item ? 'page' : undefined}
                              className={`h-9 min-w-9 rounded-lg px-3 text-sm font-semibold transition ${UI.ring} ${
                                currentPage === item
                                  ? 'bg-[#2e66a6] text-white shadow-sm'
                                  : 'text-gray-700 hover:bg-gray-100'
                              }`}
                            >
                              {item}
                            </button>
                          )
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                        disabled={currentPage === totalPages}
                        className={`inline-flex h-11 items-center gap-2 border-l border-gray-200 px-4 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 ${UI.ring}`}
                      >
                        Next
                        <span aria-hidden="true">›</span>
                      </button>
                    </nav>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyApplications;