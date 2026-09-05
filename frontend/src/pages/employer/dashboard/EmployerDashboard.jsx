// src/pages/employer/dashboard/EmployerDashboard.jsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBell,
  faBriefcase,
  faCalendarAlt,
  faClock,
  faEnvelope,
  faFileAlt,
  faTimes,
} from '@fortawesome/free-solid-svg-icons';

import EmployerLayout from '../../../layouts/EmployerLayout';

const PROFILE_REMINDER_ICON = '/images/clock.png';

const EmployerDashboard = () => {
  const navigate = useNavigate();

  const [dashboardData, setDashboardData] = useState({
    jobs: { total: 0, active: 0, closed: 0, expiringSoon: 0 },
    applications: {
      total: 0,
      pending: 0,
      forInterview: 0,
      hired: 0,
      declined: 0,
      new7d: 0,
      needsReview: 0,
    },
    messages: { total: 0, unread: 0, interviews7d: 0 },
    recentJobs: [],
    recentApplications: [],
    recentMessages: [],
  });

  const [userData, setUserData] = useState({
    companyName: '',
    email: '',
    profileComplete: false,
    avatarUrl: '',
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notifUnreadCount, setNotifUnreadCount] = useState(0);
  const [notifLoading, setNotifLoading] = useState(false);

  const [profileOpen, setProfileOpen] = useState(false);
  const [companyLogoError, setCompanyLogoError] = useState(false);
  const [showProfileReminder, setShowProfileReminder] = useState(true);

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLogoutModalVisible, setIsLogoutModalVisible] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const notifWrapRef = useRef(null);
  const profileWrapRef = useRef(null);
  const profileButtonRef = useRef(null);
  const profileMenuItemRefs = useRef([]);
  const [profileMenuFocusIndex, setProfileMenuFocusIndex] = useState(-1);
  const logoutDialogRef = useRef(null);
  const logoutCancelBtnRef = useRef(null);
  const logoutPrimaryBtnRef = useRef(null);
  const lastFocusBeforeLogoutRef = useRef(null);
  const logoutTimerRef = useRef(null);

  const [interviewCalendarMonth, setInterviewCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedInterviewDate, setSelectedInterviewDate] = useState(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  });
  const [interviewSchedules, setInterviewSchedules] = useState([]);
  const [interviewLoading, setInterviewLoading] = useState(true);
  const [interviewError, setInterviewError] = useState('');

  // ✅ FORCE PASSWORD CHANGE STATES
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });
  const [passwordErrors, setPasswordErrors] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
    general: '',
  });
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    currentPassword: false,
    newPassword: false,
    confirmNewPassword: false,
  });

  const formatLocationDisplay = (loc) => {
    return String(loc || '').trim();
  };

  const formatSalary = (min, max) => {
    if (!min && !max) return 'Salary not specified';

    const minNum = min ? Number(min) : null;
    const maxNum = max ? Number(max) : null;

    const formattedMin = Number.isFinite(minNum) ? minNum.toLocaleString() : '';
    const formattedMax = Number.isFinite(maxNum) ? maxNum.toLocaleString() : '';

    if (formattedMin && formattedMax) return `${formattedMin} - ${formattedMax}`;
    if (formattedMin) return `From ${formattedMin}`;
    return `Up to ${formattedMax}`;
  };

  const normalizeWorkModeLabel = (value) => {
    const v = String(value || '').trim().toLowerCase();
    if (!v) return '';
    if (v.includes('hybrid') || v.includes('blended')) return 'Blended';
    if (v.includes('work from home') || v.includes('wfh')) return 'Work from Home';
    if (v.includes('remote')) return 'Remote';
    if (v.includes('on-site') || v.includes('onsite') || v.includes('on site')) return 'On-site';
    return String(value || '').trim();
  };

  const formatExperienceBadge = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return '';

    const normalized = raw.toLowerCase();

    if (normalized === 'no experience required') return 'No Experience';
    if (
      ['less than 1 yr', 'less than 1 year', 'less than 1 yr exp', 'less than 1 year exp'].includes(
        normalized
      )
    ) {
      return 'Less than 1 Yr Exp';
    }
    if (
      ['1 year', '1 years', '2 year', '2 years', '3 year', '3 years', '1-3 years', '1-3 years exp'].includes(
        normalized
      )
    ) {
      return '1-3 Years Exp';
    }
    if (
      ['4 year', '4 years', '5 year', '5 years', '4-5 years', '4-5 years exp'].includes(
        normalized
      )
    ) {
      return '4-5 Years Exp';
    }
    if (
      ['6+ year', '6+ years', '6+ year exp', '6+ years exp'].includes(normalized)
    ) {
      return '6+ Years Exp';
    }

    return raw;
  };

  const isOpenToFreshGraduate = (job) => {
    return Boolean(
      job?.openToFreshGraduates === true ||
        job?.openToFreshGraduates === 'true' ||
        job?.freshGraduate === true ||
        job?.freshGraduate === 'true'
    );
  };

  const isCompanyVerified = (job) => {
    return Boolean(job?.companyVerified ?? job?.isCompanyVerified ?? job?.isVerified ?? job?.verified);
  };

  const passwordRuleChecks = useMemo(() => {
    const password = String(passwordForm.newPassword || '');
    return {
      minLength: password.length >= 8,
      uppercase: /^[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[^A-Za-z0-9]/.test(password),
    };
  }, [passwordForm.newPassword]);

  const syncMustChangePasswordState = () => {
    try {
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      const flag = Boolean(
        storedUser?.mustChangePassword ??
          storedUser?.isTempPassword ??
          storedUser?.firstLogin
      );

      setMustChangePassword(flag);
      setPasswordModalOpen(flag);
    } catch (err) {
      console.error('Error reading employer mustChangePassword flag:', err);
      setMustChangePassword(false);
      setPasswordModalOpen(false);
    }
  };

  useEffect(() => {
    fetchUserData();
    fetchDashboardData();
    fetchNotifications({ silent: true });
    fetchUpcomingInterviews();
    syncMustChangePasswordState();
  }, []);

  useEffect(() => {
    const onDocMouseDown = (e) => {
      if (passwordModalOpen) return;

      if (notifOpen && notifWrapRef.current && !notifWrapRef.current.contains(e.target)) {
        setNotifOpen(false);
      }

      if (profileOpen && profileWrapRef.current && !profileWrapRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };

    const onKeyDown = (e) => {
      if (passwordModalOpen) return;

      if (e.key === 'Escape') {
        if (notifOpen) setNotifOpen(false);
        if (profileOpen) setProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', onDocMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [notifOpen, profileOpen, passwordModalOpen]);

  useEffect(() => {
    if (!profileOpen) {
      setProfileMenuFocusIndex(-1);
      return undefined;
    }

    const onKeyDown = (e) => {
      if (passwordModalOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setProfileMenuFocusIndex((prev) => {
          const next = prev < 2 ? prev + 1 : 0;
          profileMenuItemRefs.current[next]?.focus?.();
          return next;
        });
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setProfileMenuFocusIndex((prev) => {
          const next = prev > 0 ? prev - 1 : 2;
          profileMenuItemRefs.current[next]?.focus?.();
          return next;
        });
      }

      if (e.key === 'Home') {
        e.preventDefault();
        setProfileMenuFocusIndex(0);
        profileMenuItemRefs.current[0]?.focus?.();
      }

      if (e.key === 'End') {
        e.preventDefault();
        setProfileMenuFocusIndex(2);
        profileMenuItemRefs.current[2]?.focus?.();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [profileOpen, passwordModalOpen]);

  useEffect(() => {
    if (!profileOpen) return undefined;

    return () => {
      profileButtonRef.current?.focus?.();
    };
  }, [profileOpen]);

  // ✅ smooth fade/scale in animation for logout modal
  useEffect(() => {
    if (showLogoutModal) {
      setIsLogoutModalVisible(false);
      const t = setTimeout(() => {
        setIsLogoutModalVisible(true);
      }, 50);
      return () => clearTimeout(t);
    } else {
      setIsLogoutModalVisible(false);
    }
  }, [showLogoutModal]);

  useEffect(() => {
    if (!showLogoutModal) return undefined;

    lastFocusBeforeLogoutRef.current = document.activeElement;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    setTimeout(() => {
      (logoutCancelBtnRef.current || logoutPrimaryBtnRef.current)?.focus?.();
    }, 0);

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (!isLoggingOut) closeLogoutModal();
        return;
      }

      if (e.key !== 'Tab') return;

      const root = logoutDialogRef.current;
      if (!root) return;

      const focusable = root.querySelectorAll(
        'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
      const el = lastFocusBeforeLogoutRef.current;
      if (el && typeof el.focus === 'function') el.focus();
    };
  }, [showLogoutModal, isLoggingOut]);

  useEffect(() => {
    return () => {
      if (logoutTimerRef.current) {
        clearTimeout(logoutTimerRef.current);
        logoutTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!passwordModalOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [passwordModalOpen]);

  const isCompanyProfileComplete = (user) => {
    const p = user?.employerProfile || {};

    const galleryImages = Array.isArray(p.galleryImages) ? p.galleryImages : [];
    const hasSavedGalleryPhoto = galleryImages.some((item) => {
      const url = String(typeof item === 'string' ? item : item?.url || '').trim();
      return Boolean(url) && !/^(blob:|data:)/i.test(url);
    });
    const hasSocialMedia = [p.facebookUrl, p.instagramUrl, p.youtubeUrl, p.xUrl]
      .some((value) => /^https?:\/\/\S+$/i.test(String(value || '').trim()));

    const requiredFields = [
      p.companyName,
      p.businessEmail || user?.email,
      p.mobileNumber,
      p.regionCity,
      p.industry,
      p.companyAddress,
      p.companyDescription,
      p.companyLogo,
      p.coverPhoto,
      p.companyWebsiteUrl,
    ];

    const locationParts = String(p.regionCity || '')
      .split(' - ')
      .map((part) => part.trim())
      .filter(Boolean);

    return requiredFields.every((value) => String(value || '').trim())
      && locationParts.length >= 3
      && hasSavedGalleryPhoto
      && hasSocialMedia;
  };

  const applyUserData = (user) => {
    const profileComplete = isCompanyProfileComplete(user);
    const employerProfile = user?.employerProfile || {};

    setUserData({
      companyName: employerProfile.companyName || user?.fullName || 'Company',
      email: user?.email || '',
      profileComplete,
      avatarUrl: employerProfile.companyLogo || '',
    });
    setCompanyLogoError(false);

  };

  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem('token');

      const response = await axios.get('https://phinmaau-job-portal-atlas.onrender.com/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const user = response.data?.user;

      if (response.data?.success && user) {
        localStorage.setItem('user', JSON.stringify(user));
        applyUserData(user);
        return;
      }
    } catch (err) {
      console.error('Error fetching employer profile:', err);
    }

    try {
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      applyUserData(storedUser);
    } catch {
      applyUserData({});
    }
  };

  const fetchNotifications = async (opts = { silent: false }) => {
    const { silent } = opts;
    try {
      if (!silent) setNotifLoading(true);

      const token = localStorage.getItem('token');

      const res = await axios.get('https://phinmaau-job-portal-atlas.onrender.com/api/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const list = res?.data?.notifications || [];
      const unread = res?.data?.unreadCount ?? 0;

      setNotifications(list.slice(0, 10));
      setNotifUnreadCount(unread);
    } catch (e) {
      console.error('Error fetching notifications:', e);
    } finally {
      setNotifLoading(false);
    }
  };

  const markNotifAsRead = async (notifId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`https://phinmaau-job-portal-atlas.onrender.com/api/notifications/${notifId}/read`, null, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (e) {
      console.error('Error marking notification as read:', e);
    }
  };

  const markAllNotificationsAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        'https://phinmaau-job-portal-atlas.onrender.com/api/notifications/mark-all-read',
        null,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNotifications((prev) => prev.map((notification) => ({ ...notification, isRead: true })));
      setNotifUnreadCount(0);
    } catch (e) {
      console.error('Error marking all notifications as read:', e);
    }
  };

  const handleNotifItemClick = async (notif) => {
    const link = String(notif?.link || '').trim();
    const id = notif?._id;

    if (id && notif?.isRead === false) {
      await markNotifAsRead(id);
    }

    setNotifOpen(false);
    fetchNotifications({ silent: true });

    if (link) {
      navigate(link);
      return;
    }

    if (notif?.type === 'new_application') navigate('/employer/applicants');
    else if (notif?.type === 'new_message') navigate('/employer/messages');
    else if (notif?.type === 'job_expiring') navigate('/employer/manage-jobs');
  };

  const fetchDashboardData = async (opts = { silent: false }) => {
    const { silent } = opts;

    try {
      setError('');
      if (silent) setRefreshing(true);
      else setLoading(true);

      const token = localStorage.getItem('token');

      const jobsResponse = await axios.get('https://phinmaau-job-portal-atlas.onrender.com/api/jobs/employer/my-jobs', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const appsResponse = await axios.get('https://phinmaau-job-portal-atlas.onrender.com/api/applications/employer/all', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const conversationsResponse = await axios
        .get('https://phinmaau-job-portal-atlas.onrender.com/api/messages/conversations', {
          headers: { Authorization: `Bearer ${token}` },
        })
        .catch(() => ({ data: { success: false, data: [] } }));

      const unreadCountResponse = await axios
        .get('https://phinmaau-job-portal-atlas.onrender.com/api/messages/unread-count', {
          headers: { Authorization: `Bearer ${token}` },
        })
        .catch(() => ({ data: { success: false, data: { unreadCount: 0 } } }));

      const conversations = conversationsResponse?.data?.data || [];
      const unreadFromUnreadCount = unreadCountResponse?.data?.data?.unreadCount ?? 0;
      const unreadFromConversations = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
      const finalUnread = Math.max(unreadFromUnreadCount, unreadFromConversations);

      const now = new Date();
      const msInDay = 24 * 60 * 60 * 1000;

      const withinNextDays = (dateString, days) => {
        if (!dateString) return false;
        const d = new Date(dateString);
        const diff = d - now;
        return diff >= 0 && diff <= days * msInDay;
      };

      const withinLastDays = (dateString, days) => {
        if (!dateString) return false;
        const d = new Date(dateString);
        return now - d <= days * msInDay;
      };

      if (jobsResponse.data.success) {
        const allJobs = jobsResponse.data.jobs || [];
        const jobsStats = jobsResponse.data.stats || {};
        const activeJobs = allJobs.filter((job) => job.isActive && job.isPublished);

        const expiringSoon =
          typeof jobsStats.expiringSoon === 'number'
            ? jobsStats.expiringSoon
            : activeJobs.filter((job) => withinNextDays(job.applicationDeadline, 3)).length;

        if (appsResponse.data.success) {
          const allApplications = appsResponse.data.applications || [];
          const appStats = appsResponse.data.stats || {};

          const pendingApplications = allApplications.filter(
            (app) => app.status === 'pending' && !app.alreadyEmployed
          );
          const forInterviewApplications = allApplications.filter((app) => app.status === 'for interview');
          const hiredApplications = allApplications.filter((app) => app.status === 'hired');
          const declinedApplications = allApplications.filter((app) => app.status === 'declined');

          const new7d =
            typeof appStats.new7d === 'number'
              ? appStats.new7d
              : allApplications.filter((app) => withinLastDays(app.appliedAt, 7)).length;

          const needsReview =
            typeof appStats.needsReview === 'number'
              ? appStats.needsReview
              : allApplications.filter((app) => ['pending', 'for interview'].includes(app.status)).length;

          const sortedJobs = [...allJobs].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          const recentJobs = sortedJobs.slice(0, 3);

          setDashboardData({
            jobs: {
              total: typeof jobsStats.total === 'number' ? jobsStats.total : allJobs.length,
              active: typeof jobsStats.active === 'number' ? jobsStats.active : activeJobs.length,
              closed:
                typeof jobsStats.closed === 'number'
                  ? jobsStats.closed
                  : allJobs.length - activeJobs.length,
              expiringSoon,
            },
            applications: {
              total: typeof appStats.total === 'number' ? appStats.total : allApplications.length,
              pending: pendingApplications.length,
              forInterview:
                typeof appStats.forInterview === 'number'
                  ? appStats.forInterview
                  : forInterviewApplications.length,
              hired:
                typeof appStats.hired === 'number'
                  ? appStats.hired
                  : hiredApplications.length,
              declined:
                typeof appStats.declined === 'number'
                  ? appStats.declined
                  : declinedApplications.length,
              new7d,
              needsReview,
            },
            messages: {
              total: conversations.length,
              unread: finalUnread,
              interviews7d: 0,
            },
            recentJobs,
            recentApplications: [],
            recentMessages: [],
          });

          setLastUpdated(new Date());
        } else {
          setDashboardData((prev) => ({
            ...prev,
            jobs: {
              total: typeof jobsStats.total === 'number' ? jobsStats.total : allJobs.length,
              active: typeof jobsStats.active === 'number' ? jobsStats.active : activeJobs.length,
              closed:
                typeof jobsStats.closed === 'number'
                  ? jobsStats.closed
                  : allJobs.length - activeJobs.length,
              expiringSoon,
            },
            messages: {
              total: conversations.length,
              unread: finalUnread,
              interviews7d: prev?.messages?.interviews7d ?? 0,
            },
            recentJobs: [...allJobs].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 3),
            recentApplications: [],
            recentMessages: [],
          }));

          setLastUpdated(new Date());
        }
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('We couldn’t load your dashboard. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchUpcomingInterviews = async () => {
    try {
      setInterviewLoading(true);
      setInterviewError('');

      const token = localStorage.getItem('token');

      const res = await axios.get('https://phinmaau-job-portal-atlas.onrender.com/api/applications/employer/interview-calendar', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const interviews = res?.data?.success ? res.data.interviews || [] : [];
      setInterviewSchedules(interviews);

      if (interviews.length > 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const hasToday = interviews.some((item) => {
          const d = new Date(item.scheduledAt);
          d.setHours(0, 0, 0, 0);
          return d.getTime() === today.getTime();
        });

        if (hasToday) {
          setSelectedInterviewDate(today);
        } else {
          const firstUpcoming = interviews
            .map((item) => new Date(item.scheduledAt))
            .filter((d) => !Number.isNaN(d.getTime()))
            .sort((a, b) => a - b)[0];

          if (firstUpcoming) {
            const normalized = new Date(firstUpcoming);
            normalized.setHours(0, 0, 0, 0);
            setSelectedInterviewDate(normalized);
            setInterviewCalendarMonth(new Date(normalized.getFullYear(), normalized.getMonth(), 1));
          }
        }
      }
    } catch (err) {
      console.error('Error fetching upcoming interviews:', err);
      setInterviewSchedules([]);
      setInterviewError('We couldn’t load upcoming interviews.');
    } finally {
      setInterviewLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatApplicationDeadline = (deadline) => {
    if (!deadline) return 'Application deadline not specified';

    const date = new Date(deadline);
    if (Number.isNaN(date.getTime())) return 'Application deadline not specified';

    return `Deadline of application: ${date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
    })}`;
  };

  const formatInterviewTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const formatInterviewLongDate = (dateObj) => {
    if (!dateObj) return '';
    return dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  };

  const getApplicantsCount = (job) => {
    if (typeof job?.applicationCount === 'number') return job.applicationCount;
    if (Array.isArray(job?.applications)) return job.applications.length;
    if (typeof job?.applications === 'number') return job.applications;
    return 0;
  };

  const handleManageJobs = () => navigate('/employer/manage-jobs');

  const handleCompanyProfileClick = () => {
    setProfileOpen(false);
    navigate('/employer/company-profile');
  };

  const handleSettingsClick = () => {
    setProfileOpen(false);
    navigate('/employer/settings');
  };

  const handleMessagesClick = () => {
    setNotifOpen(false);
    setProfileOpen(false);
    navigate('/employer/messages');
  };

  const closeLogoutModal = () => {
    if (isLoggingOut) return;

    setIsLogoutModalVisible(false);
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    logoutTimerRef.current = setTimeout(() => {
      setShowLogoutModal(false);
    }, 220);
  };

  const openLogoutModal = () => {
    if (isLoggingOut) return;
    setProfileOpen(false);
    setNotifOpen(false);
    setShowLogoutModal(true);
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;

    try {
      setIsLoggingOut(true);
      setIsLogoutModalVisible(false);

      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = setTimeout(() => {
        setShowLogoutModal(false);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      }, 220);
    } finally {
      setTimeout(() => setIsLoggingOut(false), 260);
    }
  };

  const validatePasswordForm = () => {
    const errors = {
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
      general: '',
    };

    if (!String(passwordForm.currentPassword || '').trim()) {
      errors.currentPassword = 'Current password is required.';
    }

    if (!String(passwordForm.newPassword || '').trim()) {
      errors.newPassword = 'New password is required.';
    } else {
      const failedRules = [];
      if (!passwordRuleChecks.minLength) failedRules.push('at least 8 characters');
      if (!passwordRuleChecks.uppercase) failedRules.push('an uppercase letter at the beginning');
      if (!passwordRuleChecks.lowercase) failedRules.push('one lowercase letter');
      if (!passwordRuleChecks.number) failedRules.push('one number');
      if (!passwordRuleChecks.special) failedRules.push('one special character');

      if (failedRules.length > 0) {
        errors.newPassword = `Password must contain ${failedRules.join(', ')}.`;
      }
    }

    if (!String(passwordForm.confirmNewPassword || '').trim()) {
      errors.confirmNewPassword = 'Please confirm your new password.';
    } else if (passwordForm.newPassword !== passwordForm.confirmNewPassword) {
      errors.confirmNewPassword = 'Confirm password does not match.';
    }

    if (
      passwordForm.currentPassword &&
      passwordForm.newPassword &&
      passwordForm.currentPassword === passwordForm.newPassword
    ) {
      errors.newPassword = 'New password must be different from your current password.';
    }

    setPasswordErrors(errors);
    return !errors.currentPassword && !errors.newPassword && !errors.confirmNewPassword;
  };

  const handlePasswordInputChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    setPasswordErrors((prev) => ({
      ...prev,
      [name]: '',
      general: '',
    }));
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleForcedPasswordChangeSubmit = async (e) => {
    e.preventDefault();

    if (passwordSubmitting) return;
    if (!validatePasswordForm()) return;

    try {
      setPasswordSubmitting(true);
      setPasswordErrors((prev) => ({ ...prev, general: '' }));

      const token = localStorage.getItem('token');

      const response = await axios.put(
        'https://phinmaau-job-portal-atlas.onrender.com/api/auth/change-temporary-password',
        {
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
          confirmNewPassword: passwordForm.confirmNewPassword,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const updatedUser =
        response?.data?.user ||
        response?.data?.data ||
        null;

      if (updatedUser) {
        localStorage.setItem('user', JSON.stringify(updatedUser));
      } else {
        const rawUser = JSON.parse(localStorage.getItem('user') || '{}');
        const mergedUser = {
          ...rawUser,
          mustChangePassword: false,
          isTempPassword: false,
          firstLogin: false,
        };
        localStorage.setItem('user', JSON.stringify(mergedUser));
      }

      setMustChangePassword(false);
      setPasswordModalOpen(false);
      window.dispatchEvent(new Event('employer-password-change-complete'));
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: '',
      });
      setPasswordErrors({
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: '',
        general: '',
      });
      setShowPasswords({
        currentPassword: false,
        newPassword: false,
        confirmNewPassword: false,
      });

      fetchUserData();
    } catch (err) {
      console.error('Employer forced password change error:', err);
      const message =
        err?.response?.data?.message ||
        'Unable to update password right now. Please try again.';

      setPasswordErrors((prev) => ({
        ...prev,
        general: message,
      }));
    } finally {
      setPasswordSubmitting(false);
    }
  };

  const passwordRequirementRow = (label, passed) => (
    <div className="flex items-center gap-2" key={label}>
      <span
        className={`inline-flex h-5 w-5 items-center justify-center rounded-full border text-[11px] font-bold ${
          passed
            ? 'border-[#2e66a6] bg-[#2e66a6] text-white'
            : 'border-gray-300 bg-white text-gray-400'
        }`}
      >
        ✓
      </span>
      <span className={`${passed ? 'text-gray-700' : 'text-gray-600'}`}>{label}</span>
    </div>
  );

  const OutlineIcon = ({ name, className = 'w-5 h-5' }) => {
    switch (name) {
      case 'briefcase':
        return (
          <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" shapeRendering="geometricPrecision">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
              d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        );
      case 'plus':
        return (
          <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" shapeRendering="geometricPrecision">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
              d="M12 5v14m7-7H5"
            />
          </svg>
        );
      case 'bell':
        return (
          <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" shapeRendering="geometricPrecision">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0a3 3 0 01-6 0m6 0H9"
            />
          </svg>
        );
      case 'chat':
        return (
          <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" shapeRendering="geometricPrecision">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
              d="M8 10h8m-8 4h5m-7 6l-4-4V7a2 2 0 012-2h14a2 2 0 012 2v9a2 2 0 01-2 2H8z"
            />
          </svg>
        );
      case 'arrow':
        return (
          <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" shapeRendering="geometricPrecision">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} vectorEffect="non-scaling-stroke" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        );
      case 'alert':
        return (
          <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" shapeRendering="geometricPrecision">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
              d="M12 9v4m0 4h.01M10.29 3.86l-8.12 14.06A2 2 0 003.9 21h16.2a2 2 0 001.73-3.08L13.71 3.86a2 2 0 00-3.42 0z"
            />
          </svg>
        );
      case 'users':
        return (
          <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" shapeRendering="geometricPrecision">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
              d="M17 20v-1a4 4 0 00-4-4H7a4 4 0 00-4 4v1m14-10a4 4 0 11-8 0 4 4 0 018 0zm6 10v-1a3 3 0 00-2.2-2.9"
            />
          </svg>
        );
      case 'clock':
        return (
          <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" shapeRendering="geometricPrecision">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
              d="M12 8v5l3 2m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
      case 'calendar':
        return (
          <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" shapeRendering="geometricPrecision">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
              d="M8 7V3m8 4V3m-9 8h10m-13 9h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v11a2 2 0 002 2z"
            />
          </svg>
        );
      case 'video':
        return (
          <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" shapeRendering="geometricPrecision">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14m-9 4h8a2 2 0 002-2V8a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        );
      case 'location':
        return (
          <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" shapeRendering="geometricPrecision">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
              d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
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
      case 'settings':
        return (
          <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" shapeRendering="geometricPrecision">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.7}
              vectorEffect="non-scaling-stroke"
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.7}
              vectorEffect="non-scaling-stroke"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        );
      case 'logout':
        return (
          <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" shapeRendering="geometricPrecision">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.7}
              vectorEffect="non-scaling-stroke"
              d="M17 16l4-4m0 0l-4-4m4 4H9m4 8H7a2 2 0 01-2-2V6a2 2 0 012-2h6"
            />
          </svg>
        );
      case 'chevronDown':
        return (
          <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" shapeRendering="geometricPrecision">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
              d="M6 9l6 6 6-6"
            />
          </svg>
        );
      case 'x':
        return (
          <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" shapeRendering="geometricPrecision">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        );
      default:
        return (
          <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" shapeRendering="geometricPrecision">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
              d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
    }
  };

  const IconBadge = ({ name }) => (
    <div className="h-10 w-10 rounded-lg border flex items-center justify-center bg-gray-100 text-gray-600 border-gray-200">
      <OutlineIcon name={name || 'briefcase'} className="w-[18px] h-[18px]" />
    </div>
  );

  const Panel = ({ title, subtitle, iconName, actionLabel, onAction, children }) => (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <IconBadge name={iconName} />
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-gray-900 truncate">{title}</h2>
                {subtitle ? <p className="text-sm text-gray-500 mt-1">{subtitle}</p> : null}
              </div>
            </div>
          </div>

          {actionLabel ? (
            <button
              type="button"
              onClick={onAction}
              className="text-sm text-[#2e66a6] font-semibold underline-offset-4 hover:underline
                         focus:outline-none focus:ring-2 focus:ring-[#2e66a6] rounded px-1"
            >
              {actionLabel}
            </button>
          ) : null}
        </div>
      </div>
      {children}
    </div>
  );

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const weekdayLabels = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const getCalendarDays = (visibleMonth) => {
    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const firstWeekDay = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];

    for (let i = 0; i < firstWeekDay; i += 1) {
      days.push(null);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const normalizeToDayKey = (dateValue) => {
    const d = new Date(dateValue);
    if (Number.isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const isSameDay = (a, b) => {
    if (!a || !b) return false;
    return normalizeToDayKey(a) === normalizeToDayKey(b);
  };

  const groupedInterviewsByDate = useMemo(() => {
    return interviewSchedules.reduce((acc, item) => {
      const key = normalizeToDayKey(item.scheduledAt);
      if (!key) return acc;
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});
  }, [interviewSchedules]);

  const selectedInterviewDayKey = useMemo(
    () => normalizeToDayKey(selectedInterviewDate),
    [selectedInterviewDate]
  );

  const selectedDateInterviews = useMemo(() => {
    const list = groupedInterviewsByDate[selectedInterviewDayKey] || [];
    return [...list].sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
  }, [groupedInterviewsByDate, selectedInterviewDayKey]);

  const limitedSelectedDateInterviews = useMemo(() => {
    return selectedDateInterviews.slice(0, 4);
  }, [selectedDateInterviews]);

  const interviewCalendarDays = useMemo(
    () => getCalendarDays(interviewCalendarMonth),
    [interviewCalendarMonth]
  );

  const Skeleton = () => (
    <EmployerLayout>
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="h-6 w-56 bg-gray-100 rounded animate-pulse" />
          <div className="h-4 w-72 bg-gray-100 rounded animate-pulse mt-3" />
          <div className="h-10 w-40 bg-gray-100 rounded animate-pulse mt-4" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="h-4 w-28 bg-gray-100 rounded animate-pulse" />
              <div className="h-8 w-16 bg-gray-100 rounded animate-pulse mt-2" />
              <div className="h-3 w-40 bg-gray-100 rounded animate-pulse mt-2" />
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-200">
            <div className="h-5 w-44 bg-gray-100 rounded animate-pulse" />
            <div className="h-4 w-60 bg-gray-100 rounded animate-pulse mt-2" />
          </div>
          <div className="p-5 space-y-4">
            {[...Array(4)].map((__, r) => (
              <div key={r} className="flex items-center justify-between">
                <div className="h-4 w-52 bg-gray-100 rounded animate-pulse" />
                <div className="h-4 w-20 bg-gray-100 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </EmployerLayout>
  );

  const forcedPasswordModal = passwordModalOpen ? (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/10 px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="forced-password-modal-title"
      aria-describedby="forced-password-modal-description"
    >
      <div className="w-full max-w-4xl overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-2xl">
        <div className="grid grid-cols-1 md:grid-cols-[1.05fr_1.2fr]">
          <div className="bg-white">
            <div className="bg-[#2e66a6] px-6 py-4 text-white">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.8"
                      d="M12 11c1.657 0 3-1.567 3-3.5S13.657 4 12 4 9 5.567 9 7.5 10.343 11 12 11zm0 0c-2.761 0-5 2.239-5 5v1h10v-1c0-2.761-2.239-5-5-5z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.8"
                      d="M7 10V8a5 5 0 0110 0v2"
                    />
                  </svg>
                </div>

                <div>
                  <p className="text-sm font-bold tracking-wide">SECURITY REQUIRED</p>
                  <p className="text-xs text-white/80">Mandatory Password Update</p>
                </div>
              </div>
            </div>

            <div className="px-6 py-7 md:px-8 md:py-8">
              <h2
                id="forced-password-modal-title"
                className="text-[32px] font-extrabold leading-tight text-gray-700"
              >
                CHANGE YOUR PASSWORD
              </h2>

              <p
                id="forced-password-modal-description"
                className="mt-3 max-w-md text-[16px] leading-7 text-gray-700"
              >
                For your security, a mandatory password update is required for all accounts.
                This helps protect your company account and dashboard access.
              </p>

              <div className="mt-7 rounded-2xl bg-[#F7F9FC] p-5 ring-1 ring-gray-200">
                <p className="text-sm font-bold uppercase tracking-wide text-gray-700">
                  Password Requirements
                </p>

                <div className="mt-4 space-y-3 text-sm">
                  {passwordRequirementRow('At least 8 characters', passwordRuleChecks.minLength)}
                  {passwordRequirementRow('Starts with an uppercase letter', passwordRuleChecks.uppercase)}
                  {passwordRequirementRow('One lowercase letter', passwordRuleChecks.lowercase)}
                  {passwordRequirementRow('One number', passwordRuleChecks.number)}
                  {passwordRequirementRow('One special character', passwordRuleChecks.special)}
                </div>
              </div>

              <div className="mt-5 flex items-start gap-2 text-sm text-gray-500">
                <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p>
                  This is a one-time required security measure for your account&apos;s protection.
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 bg-white px-6 py-7 md:border-l md:border-t-0 md:px-8 md:py-8">
            <form onSubmit={handleForcedPasswordChangeSubmit} className="space-y-5" noValidate>
              <div className="flex w-full justify-center pb-1">
                <img
                  src="/images/agpay.png"
                  alt="AGAPAY"
                  className="h-16 w-auto max-w-[220px] object-contain"
                />
              </div>

              <div>
                <label htmlFor="currentPassword" className="mb-2 block text-sm font-bold text-gray-700">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    id="currentPassword"
                    name="currentPassword"
                    type={showPasswords.currentPassword ? 'text' : 'password'}
                    value={passwordForm.currentPassword}
                    onChange={handlePasswordInputChange}
                    disabled={passwordSubmitting}
                    className={`block h-12 w-full rounded-xl border bg-white px-4 pr-12 text-sm text-gray-700 shadow-sm outline-none transition ${
                      passwordErrors.currentPassword
                        ? 'border-red-400 focus:border-red-500'
                        : 'border-gray-300 focus:border-[#2e66a6]'
                    }`}
                    placeholder="Enter your temporary password"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('currentPassword')}
                    className="absolute inset-y-0 right-0 inline-flex items-center px-4 text-gray-500"
                    tabIndex={-1}
                  >
                    {showPasswords.currentPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
                <p className="mt-2 text-xs text-gray-500">Enter your temporary password.</p>
                {passwordErrors.currentPassword ? (
                  <p className="mt-1 text-xs text-red-600">{passwordErrors.currentPassword}</p>
                ) : null}
              </div>

              <div>
                <label htmlFor="newPassword" className="mb-2 block text-sm font-bold text-gray-700">
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="newPassword"
                    name="newPassword"
                    type={showPasswords.newPassword ? 'text' : 'password'}
                    value={passwordForm.newPassword}
                    onChange={handlePasswordInputChange}
                    disabled={passwordSubmitting}
                    className={`block h-12 w-full rounded-xl border bg-white px-4 pr-12 text-sm text-black shadow-sm outline-none transition ${
                      passwordErrors.newPassword
                        ? 'border-red-400 focus:border-red-500'
                        : 'border-gray-300 focus:border-[#2e66a6]'
                    }`}
                    placeholder="Create a strong new password"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('newPassword')}
                    className="absolute inset-y-0 right-0 inline-flex items-center px-4 text-gray-500"
                    tabIndex={-1}
                  >
                    {showPasswords.newPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
                <p className="mt-2 text-xs text-gray-500">Set a new, strong password.</p>
                {passwordErrors.newPassword ? (
                  <p className="mt-1 text-xs text-red-600">{passwordErrors.newPassword}</p>
                ) : null}
              </div>

              <div>
                <label htmlFor="confirmNewPassword" className="mb-2 block text-sm font-bold text-gray-700">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    id="confirmNewPassword"
                    name="confirmNewPassword"
                    type={showPasswords.confirmNewPassword ? 'text' : 'password'}
                    value={passwordForm.confirmNewPassword}
                    onChange={handlePasswordInputChange}
                    disabled={passwordSubmitting}
                    className={`block h-12 w-full rounded-xl border bg-white px-4 pr-12 text-sm text-gray-700 shadow-sm outline-none transition ${
                      passwordErrors.confirmNewPassword
                        ? 'border-red-400 focus:border-red-500'
                        : 'border-gray-300 focus:border-[#2e66a6]'
                    }`}
                    placeholder="Verify your new password"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('confirmNewPassword')}
                    className="absolute inset-y-0 right-0 inline-flex items-center px-4 text-gray-500"
                    tabIndex={-1}
                  >
                    {showPasswords.confirmNewPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
                <p className="mt-2 text-xs text-gray-500">Re-enter to confirm your new password.</p>
                {passwordErrors.confirmNewPassword ? (
                  <p className="mt-1 text-xs text-red-600">{passwordErrors.confirmNewPassword}</p>
                ) : null}
              </div>

              {passwordErrors.general ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                  <p className="text-sm font-medium text-red-700">{passwordErrors.general}</p>
                </div>
              ) : null}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={passwordSubmitting}
                  className="inline-flex h-12 w-full items-center justify-center rounded-full bg-[#2e66a6] px-6 text-sm font-bold text-white transition hover:bg-[#245387] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {passwordSubmitting ? 'UPDATING PASSWORD...' : 'UPDATE PASSWORD'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  if (loading) return <Skeleton />;

  const formatNotifMeta = (dateString) => {
    if (!dateString) return '';

    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '';

    const now = new Date();
    const diffMs = Math.max(0, now.getTime() - date.getTime());
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const getNotificationGroup = (dateString) => {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return 'Last Week';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const notificationDay = new Date(date);
    notificationDay.setHours(0, 0, 0, 0);

    const diffDays = Math.floor((today.getTime() - notificationDay.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return 'Last Week';
  };

  const groupedNotifications = ['Today', 'Yesterday', 'Last Week']
    .map((label) => ({
      label,
      items: notifications.slice(0, 10).filter((notification) => getNotificationGroup(notification.createdAt) === label),
    }))
    .filter((group) => group.items.length > 0);

  const getNotifIcon = (notification) => {
    switch (String(notification?.type || '').trim().toLowerCase()) {
      case 'new_application':
      case 'application_update':
        return faFileAlt;
      case 'new_message':
        return faEnvelope;
      case 'job_expiring':
        return faClock;
      case 'interview':
        return faCalendarAlt;
      case 'job_match':
        return faBriefcase;
      default:
        return faBell;
    }
  };

  return (
    <EmployerLayout>
      <style>{`
        @keyframes profileMenuIn {
          from { opacity: 0; transform: translateY(-6px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
      {forcedPasswordModal}

      <div
        className={`space-y-6 -mt-2 ${passwordModalOpen ? 'pointer-events-none select-none blur-[1px]' : ''}`}
        aria-hidden={passwordModalOpen ? 'true' : 'false'}
      >
        {showLogoutModal && (
          <div
            className={[
              'fixed inset-0 z-[70] flex items-center justify-center px-4',
              'bg-black/10',
              'transition-opacity duration-200',
              isLogoutModalVisible ? 'opacity-100' : 'opacity-0',
            ].join(' ')}
            role="presentation"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) closeLogoutModal();
            }}
          >
            <div
              ref={logoutDialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="logout-title"
              aria-describedby="logout-desc"
              className={[
                'w-full max-w-md rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden',
                'transform transition-all duration-200',
                isLogoutModalVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95',
              ].join(' ')}
            >
              <div className="p-6 sm:p-7">
                <div className="mx-auto mb-4 w-14 h-14 rounded-full flex items-center justify-center">
                  <img
                    src="/images/error.png"
                    alt="Error"
                    className="w-14 h-14 object-contain"
                    draggable="false"
                  />
                </div>

                <h2
                  id="logout-title"
                  className="text-lg sm:text-xl font-extrabold text-gray-900 text-center"
                >
                  Sign out?
                </h2>

                <p
                  id="logout-desc"
                  className="mt-2 text-sm sm:text-base text-gray-600 text-center"
                >
                  <span className="block">Are you sure you want to sign out of your account?</span>
                  <span className="block">You can sign in again anytime.</span>
                </p>

                <div className="mt-6 flex items-center justify-center gap-3">
                  <button
                    ref={logoutCancelBtnRef}
                    type="button"
                    onClick={closeLogoutModal}
                    disabled={isLoggingOut}
                    className={[
                      'px-6 py-3 rounded-xl font-semibold',
                      'bg-white text-gray-800 border border-gray-300 hover:bg-gray-50 transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/40 focus-visible:ring-offset-2',
                      isLoggingOut ? 'opacity-70 cursor-not-allowed' : '',
                    ].join(' ')}
                  >
                    Cancel
                  </button>

                  <button
                    ref={logoutPrimaryBtnRef}
                    type="button"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className={[
                      'px-6 py-3 rounded-xl font-semibold',
                      'bg-red-600 text-white hover:bg-red-700 transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/40 focus-visible:ring-offset-2',
                      isLoggingOut ? 'opacity-70 cursor-not-allowed' : '',
                    ].join(' ')}
                  >
                    {isLoggingOut ? 'Logging out…' : 'Sign out'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pr-4 gap-6">
          <div className="min-w-0 mt-8 shrink-0">
            <h1 className="text-[34px] leading-[40px] font-semibold text-gray-900">Overview</h1>
          </div>



          <div className="flex min-w-0 flex-1 items-center justify-end gap-4 shrink-0">
            {!userData.profileComplete && showProfileReminder && (
              <div className="mt-8 w-full max-w-[640px]">
                <div className="relative flex items-center justify-between gap-4 rounded-[28px] border border-[#D9E3F2] bg-white px-5 py-4 shadow-sm">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center">
                      <img
                        src={PROFILE_REMINDER_ICON}
                        alt="Reminder"
                        className="h-8 w-8 object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>

                    <div className="min-w-0">
                      <p className="text-[14px] leading-5 text-black">
                        <span className="font-semibold">Reminder:</span>{' '}
                        A complete company profile is required before you can post a job.
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <button
                      type="button"
                      onClick={() => navigate('/employer/company-profile', { state: { openEdit: true } })}
                      className="inline-flex h-10 items-center justify-center rounded-[10px] bg-[#2e66a6] px-4 text-[12px] font-bold uppercase tracking-[0.03em] text-white transition hover:bg-[#245387]"
                    >
                      Go to Profile
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowProfileReminder(false)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition hover:bg-white hover:text-black"
                      aria-label="Dismiss company profile reminder"
                    >
                      <FontAwesomeIcon icon={faTimes} className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => navigate('/employer/post-job')}
              className="mt-8 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#2e66a6] px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-[#064da3] focus:outline-none focus:ring-2 focus:ring-[#2e66a6] focus:ring-offset-2"
            >
              <OutlineIcon name="plus" className="h-4 w-4" />
              <span>Post Job</span>
            </button>

            <div className="relative" ref={notifWrapRef}>
              <button
                ref={profileButtonRef}
                type="button"
                onClick={() => {
                  const next = !notifOpen;
                  setNotifOpen(next);
                  setProfileOpen(false);
                  if (next) fetchNotifications({ silent: false });
                }}
                className={[
                  'relative mt-8 inline-flex h-10 w-10 items-center justify-center rounded-lg p-2',
                  'border-0 bg-transparent text-gray-900 shadow-none transition-colors',
                  'hover:bg-transparent hover:text-gray-900',
                  'active:scale-[0.98]',
                  'focus:border-0 focus:outline-none focus:ring-0 focus:ring-offset-0',
                ].join(' ')}
                aria-label="Notifications"
                aria-haspopup="menu"
                aria-expanded={notifOpen}
                aria-controls="employer-notifications-menu"
                title="Notifications"
              >
                <OutlineIcon name="bell" className="h-6 w-6" />

                {notifUnreadCount > 0 ? (
                  <>
                    <span
                      className="absolute -top-2 -right-2 min-w-[20px] h-[20px] px-1
                                 bg-red-600 text-white text-[11px] font-bold
                                 rounded-full flex items-center justify-center
                                 border-2 border-white shadow-sm"
                      aria-label={`${notifUnreadCount} unread notifications`}
                    >
                      {notifUnreadCount > 99 ? '99+' : notifUnreadCount}
                    </span>
                  </>
                ) : null}
              </button>

              {notifOpen ? (
                <div
                  id="employer-notifications-menu"
                  className={[
                    'fixed left-1/2 top-[76px] z-[80] w-[calc(100vw-1.5rem)] max-w-sm -translate-x-1/2',
                    'md:absolute md:left-auto md:right-0 md:top-auto md:mt-2 md:w-96 md:max-w-[calc(100vw-1.5rem)] md:translate-x-0 md:z-50',
                    'max-h-[520px] overflow-y-auto rounded-xl border border-gray-200 bg-white py-2 shadow-xl',
                  ].join(' ')}
                  role="menu"
                  aria-label="Notifications panel"
                >
                  <div className="border-b border-gray-100 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-[#2e66a6]/10 p-2">
                          <OutlineIcon name="bell" className="h-4 w-4 text-[#2e66a6]" />
                        </div>
                        <h3 className="font-semibold text-gray-900">Notifications</h3>
                      </div>

                      {notifUnreadCount > 0 ? (
                        <button
                          type="button"
                          onClick={markAllNotificationsAsRead}
                          className="rounded-md px-2 py-1 text-sm font-medium text-[#2e66a6] transition hover:text-[#25558c] focus:outline-none focus:ring-2 focus:ring-[#2e66a6] focus:ring-offset-2"
                        >
                          Mark all as read
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <div className="px-1 py-2">
                    {notifLoading ? (
                      <div className="p-4 space-y-3">
                        {[...Array(4)].map((_, i) => (
                          <div key={i} className="flex gap-3 items-start">
                            <div className="h-9 w-9 rounded-xl bg-gray-100 animate-pulse" />
                            <div className="flex-1">
                              <div className="h-4 w-40 bg-gray-100 rounded animate-pulse" />
                              <div className="h-3 w-64 bg-gray-100 rounded animate-pulse mt-2" />
                              <div className="h-3 w-36 bg-gray-100 rounded animate-pulse mt-2" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center">
                        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                          <OutlineIcon name="bell" className="h-6 w-6 text-gray-400" />
                        </div>
                        <p className="text-sm text-gray-600">No new notifications</p>
                        <p className="mt-1 text-xs text-gray-400">You're all caught up!</p>
                      </div>
                    ) : (
                      <div className="space-y-3 px-1">
                        {groupedNotifications.map((group) => (
                          <div key={group.label}>
                            <div className="px-3 pb-1 pt-2 text-xs font-bold uppercase tracking-wide text-gray-500">
                              {group.label}
                            </div>

                            {group.items.map((n) => {
                              const isUnread = n?.isRead === false;
                              const notificationIcon = getNotifIcon(n);
                              return (
                                <button
                                  key={n._id}
                                  type="button"
                                  onClick={() => handleNotifItemClick(n)}
                                  role="menuitem"
                                  className={[
                                    'flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition-colors',
                                    'focus:outline-none focus:ring-2 focus:ring-[#2e66a6] focus:ring-inset',
                                    'hover:bg-gray-50',
                                    isUnread ? 'bg-blue-50' : 'bg-white',
                                  ].join(' ')}
                                >
                                  <div
                                    className={[
                                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                                      isUnread ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600',
                                    ].join(' ')}
                                    aria-hidden="true"
                                  >
                                    <FontAwesomeIcon icon={notificationIcon} className="h-4 w-4" />
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="min-w-0 flex-1">
                                        <p
                                          className={[
                                            'min-w-0 flex-1 break-words text-sm font-semibold leading-5',
                                            isUnread ? 'text-gray-900' : 'text-gray-800',
                                          ].join(' ')}
                                        >
                                          {n.title || 'Notification'}
                                        </p>

                                        {n.message ? (
                                          <p className="mt-1 line-clamp-2 break-words text-sm leading-5 text-gray-700">{n.message}</p>
                                        ) : null}
                                      </div>

                                      <span className="shrink-0 pt-0.5 text-xs font-medium text-gray-400">
                                        {n.createdAt ? formatNotifMeta(n.createdAt) : ''}
                                      </span>
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {notifications.length > 0 && !notifLoading ? (
                    <div className="border-t border-gray-100 px-4 py-3">
                     <button
  type="button"
  onClick={() => {
    setNotifOpen(false);
    navigate('/employer/notifications');
  }}
  className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[#2e66a6] transition hover:text-[#25558c]"
>
  View all notifications
  <OutlineIcon name="arrow" className="h-4 w-4 text-[#2e66a6]" />
</button>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="relative mt-8" ref={profileWrapRef}>
              <button
                type="button"
                onClick={() => {
                  const next = !profileOpen;
                  setProfileOpen(next);
                  setNotifOpen(false);
                }}
                className="inline-flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-[#2e66a6] focus:ring-offset-2"
                aria-label="Open profile menu"
                aria-haspopup="menu"
                aria-expanded={profileOpen}
                aria-controls="employer-profile-menu"
              >
                {userData.avatarUrl && !companyLogoError ? (
                  <img
                    src={userData.avatarUrl}
                    alt={`${userData.companyName} company logo`}
                    className="w-10 h-10 rounded-full object-cover border border-gray-200 bg-white"
                    onError={() => setCompanyLogoError(true)}
                  />
                ) : (
                  <img
                    src="/images/profiledot.png"
                    alt="Default profile"
                    className="h-10 w-10 rounded-full border border-gray-200 bg-white object-cover"
                  />
                )}
                <OutlineIcon
                  name="chevronDown"
                  className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {profileOpen ? (
                <div
                  id="employer-profile-menu"
                  className="absolute right-0 mt-3 w-60 origin-top-right rounded-2xl border border-gray-200 bg-white shadow-lg z-50 overflow-hidden transition-all duration-200 ease-out animate-[profileMenuIn_160ms_ease-out]"
                  role="menu"
                  aria-label="Profile dropdown"
                >
                  <div className="py-2">
                    <button
                      ref={(el) => { profileMenuItemRefs.current[0] = el; }}
                      type="button"
                      onClick={handleCompanyProfileClick}
                      role="menuitem"
                      tabIndex={0}
                      className="w-full min-h-[44px] flex items-center gap-3 px-5 py-3 text-left text-gray-700 hover:bg-gray-50 focus:outline-none focus:bg-gray-50 focus:ring-2 focus:ring-[#2e66a6] focus:ring-inset"
                    >
                      <OutlineIcon name="building" className="w-5 h-5 text-gray-600" />
                      <span className="text-[15px]">Company Profile</span>
                    </button>

                    <button
                      ref={(el) => { profileMenuItemRefs.current[1] = el; }}
                      type="button"
                      onClick={handleSettingsClick}
                      role="menuitem"
                      tabIndex={0}
                      className="w-full min-h-[44px] flex items-center gap-3 px-5 py-3 text-left text-gray-700 hover:bg-gray-50 focus:outline-none focus:bg-gray-50 focus:ring-2 focus:ring-[#2e66a6] focus:ring-inset"
                    >
                      <OutlineIcon name="settings" className="w-5 h-5 text-gray-600" />
                      <span className="text-[15px]">Account Settings</span>
                    </button>

                    <div className="border-t border-gray-100 mt-2 pt-2">
                      <button
                        ref={(el) => { profileMenuItemRefs.current[2] = el; }}
                        type="button"
                        onClick={openLogoutModal}
                        role="menuitem"
                        tabIndex={0}
                        className="w-full min-h-[44px] flex items-center gap-3 px-5 py-3 text-left text-red-600 hover:bg-red-50 focus:outline-none focus:bg-red-50 focus:ring-2 focus:ring-red-500 focus:ring-inset"
                      >
                        <OutlineIcon name="logout" className="w-5 h-5 text-red-600" />
                        <span className="text-[15px]">Sign out</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>



        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-lg bg-red-100 border border-red-200 flex items-center justify-center text-red-700">
                <OutlineIcon name="alert" className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-red-900">{error}</p>
                <p className="text-sm text-red-800 mt-1">Check your connection or token, then retry.</p>
                <button
                  type="button"
                  onClick={() => fetchDashboardData({ silent: true })}
                  className="mt-3 inline-flex items-center px-3 py-2 rounded-lg
                         bg-red-600 hover:bg-red-700 text-white text-sm font-semibold
                         transition focus:outline-none focus:ring-2 focus:ring-red-600"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {[
            {
              key: 'postedJobs',
              label: 'Posted Jobs',
              value: dashboardData.jobs.active,
              image: '/images/case.png',
              href: '/employer/manage-jobs',
            },
            {
              key: 'pending',
              label: 'Pending Applicants',
              value: dashboardData.applications.pending,
              image: '/images/pending7.png',
              href: '/employer/applicants?status=pending',
            },
            {
              key: 'forInterview',
              label: 'For Interview',
              value: dashboardData.applications.forInterview,
              image: '/images/employer1.png',
              href: '/employer/for-interview',
            },
            {
              key: 'hired',
              label: 'Hired Applicants',
              value: dashboardData.applications.hired,
              image: '/images/dashboardcheckicon.png',
              href: '/employer/hired',
            },
            {
              key: 'declined',
              label: 'Declined Applicants',
              value: dashboardData.applications.declined,
              image: '/images/employer3.png',
              href: '/employer/declined',
            },
          ].map((card) => (
            <Link
              key={card.key}
              to={card.href}
              className="relative rounded-2xl overflow-hidden group focus:outline-none focus:ring-2 focus:ring-[#2e66a6]"
              aria-label={`${card.label}: ${card.value}. Click to view.`}
            >
              <div className="pointer-events-none absolute inset-0 z-0">
                <div
                  className="absolute w-[70px] h-[70px] rounded-full blur-[35px] top-[38%] right-[22%] transition-all duration-700 ease-out
                    group-hover:scale-110 group-hover:blur-[45px] group-hover:opacity-80"
                  style={{
                    background:
                      'radial-gradient(circle, rgba(46,102,166,0.25) 0%, rgba(46,102,166,0.14) 45%, transparent 75%)',
                  }}
                />
              </div>

              <div
                className="relative z-10 h-full p-6 rounded-2xl overflow-hidden text-white
                  bg-gradient-to-br from-[#072258] via-[#2d63a0] to-[#52b2db]
                  shadow-[0_10px_30px_rgba(0,0,0,0.25)] transition-all duration-500 ease-out
                  group-hover:shadow-[0_20px_50px_rgba(0,0,0,0.35)] group-hover:scale-[1.02] group-active:scale-[0.98]
                  group-hover:brightness-105"
              >
                <div className="absolute top-4 right-4 transition-all duration-500 ease-out opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0">
                  <OutlineIcon name="arrow" className="w-5 h-5 text-white/90" />
                </div>

                <img
                  src={card.image}
                  alt=""
                  className="pointer-events-none absolute right-[-18px] top-1/2 -translate-y-1/2 w-20 h-20 md:w-22 md:h-22 object-contain opacity-50 mix-blend-soft-light saturate-150
                    transition-all duration-700 ease-out group-hover:opacity-50 group-hover:saturate-180 group-hover:scale-105 group-hover:right-[-15px]"
                  style={{
                    WebkitMaskImage:
                      'radial-gradient(circle at 35% 50%, rgba(0,0,0,1) 0%, rgba(0,0,0,0.6) 55%, rgba(0,0,0,0) 80%)',
                    maskImage:
                      'radial-gradient(circle at 35% 50%, rgba(0,0,0,1) 0%, rgba(0,0,0,0.6) 55%, rgba(0,0,0,0) 80%)',
                  }}
                />

                <div className="relative z-10">
                  <p className="text-3xl font-semibold leading-none transition-all duration-400 ease-out group-hover:text-[34px]">
                    {card.value}
                  </p>

                  <div className="flex items-center justify-between mt-2 gap-2">
                    <p className="text-sm text-white/90 flex items-center gap-1 transition-all duration-400 group-hover:text-white whitespace-nowrap">
                      <span className="whitespace-nowrap">{card.label}</span>
                      <span className="text-base font-bold opacity-90 ml-1 transition-all duration-400 group-hover:ml-2 group-hover:opacity-100 shrink-0">
                        &gt;
                      </span>
                    </p>

                    <div className="text-xs text-white/70 transition-all duration-500 ease-out opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 shrink-0">
                      Click to view
                    </div>
                  </div>
                </div>

                <div className="absolute inset-0 bg-gradient-to-t from-transparent to-transparent opacity-0 group-hover:opacity-5 group-hover:to-white/10 transition-all duration-500 ease-out" />
              </div>

              <div className="absolute inset-0 rounded-2xl border-2 border-transparent group-hover:border-white/20 transition-all duration-500 ease-out pointer-events-none" />
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1">
          <Panel
            title="Recent job posts"
            iconName="briefcase"
            actionLabel={
              <span className="inline-flex items-center gap-1">
                <span>View all</span>
                <svg className="w-4 h-4 transition-transform duration-300 hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </span>
            }
            onAction={handleManageJobs}
          >
            {dashboardData.recentJobs.length > 0 ? (
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {dashboardData.recentJobs.map((job) => {
                    const jobId = job?._id || job?.id;

                    const expBadge = formatExperienceBadge(job?.experienceLevel);
                    const wmLabel = normalizeWorkModeLabel(job?.workMode);

                    const badgeClass =
                      'px-2.5 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap bg-white text-[#2e66a6] border border-[#2e66a6]/30 shadow-sm';

                    const recentJobBadges = [
                      expBadge,
                      wmLabel,
                      isOpenToFreshGraduate(job) ? 'Open fresh grad' : '',
                    ]
                      .map((badge) => String(badge || '').trim())
                      .filter(Boolean)
                      .filter((badge, index, arr) => arr.findIndex((item) => item.toLowerCase() === badge.toLowerCase()) === index)
                      .slice(0, 3);

                    const verified = isCompanyVerified(job) || job?.companyVerified == null;
                    const jobViewPath = jobId ? `/employer/manage-jobs/${jobId}/view` : '/employer/manage-jobs';

                    return (
                      <Link
                        key={jobId || job?.title || 'recent-job'}
                        to={jobViewPath}
                        state={{
                          backPath: '/employer/dashboard',
                          backLabel: 'Dashboard',
                        }}
                        className="group rounded-2xl p-7 bg-white shadow-sm hover:shadow-md transition flex flex-col min-h-[280px] focus:outline-none focus:ring-2 focus:ring-[#2e66a6] focus:ring-offset-2"
                        style={{ border: '1px solid #E5E7EB' }}
                        aria-label={`View job details for ${String(job?.title || 'Job Title').replaceAll('"', '')}`}
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 border border-gray-200 bg-white">
                            {job?.companyLogo ? (
                              <img
                                src={job.companyLogo}
                                alt={job.companyName || 'Company logo'}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className="w-full h-full bg-gray-200" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <h3 className="text-lg font-bold text-black leading-snug line-clamp-2 group-hover:text-[#2e66a6] transition-colors">
                              {String(job?.title || 'Job Title').replaceAll('"', '')}
                            </h3>

                            <div className="mt-1 flex items-center gap-2 min-w-0">
                              <span className="text-sm font-medium text-gray-700 truncate">
                                {job?.companyName || userData.companyName || 'Company'}
                              </span>

                              {verified && (
                                <span
                                  className="inline-flex items-center justify-center w-5 h-5 rounded-full flex-shrink-0"
                                  title="Verified"
                                  aria-label="Verified company"
                                >
                                  <img
                                    src="/images/checkmo.png"
                                    alt="Verified"
                                    className="w-5 h-5 object-contain"
                                    draggable="false"
                                  />
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className={`relative mt-4 overflow-hidden rounded-xl bg-[#F3F4F6] p-4 ${job?.isUrgent ? 'pr-[108px]' : ''}`}>
                          {job?.isUrgent ? (
                            <img
                              src="/images/urgentneed.png"
                              alt="Urgent Hiring"
                              draggable="false"
                              className="pointer-events-none absolute -right-5 bottom-1 h-auto w-[112px] max-w-[38%] select-none object-contain"
                            />
                          ) : null}

                          <div className="flex items-center gap-2 text-sm text-gray-700 min-w-0">
                            <svg
                              className="w-4 h-4 min-w-[16px] min-h-[16px] flex-shrink-0 text-gray-600"
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
                            <span className="truncate min-w-0">
                              {formatLocationDisplay(job?.location) || 'Location not specified'}
                            </span>
                          </div>

                          <div className="mt-2 flex items-center gap-2 text-sm text-gray-700">
                            <span className="w-4 h-4 text-gray-600 flex items-center justify-center font-extrabold text-[14px] leading-none">
                              ₱
                            </span>
                            <span className="truncate">{formatSalary(job?.salaryMin, job?.salaryMax)}</span>
                          </div>

                          <div className="mt-2 flex items-center gap-2 text-sm text-gray-700">
                            <svg
                              className="w-4 h-4 text-gray-600"
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
                            <span className="truncate">{job?.jobType || 'Full Time Work'}</span>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center gap-2 text-[13px] font-medium text-black/65">
                          <svg
                            className="w-4 h-4 text-black/55 flex-shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M8 7V3m8 4V3m-9 8h10m-11 9h12a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v11a2 2 0 002 2z"
                            />
                          </svg>
                          <span className="truncate">{formatApplicationDeadline(job?.applicationDeadline)}</span>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-2 min-h-[28px]">
                          {recentJobBadges.map((badge) => (
                            <span key={badge} className={badgeClass}>
                              {badge}
                            </span>
                          ))}
                        </div>

                        <div className="mt-4 w-full h-px bg-gray-300/80" />
                      </Link>
                    );
                  })}                </div>
              </div>
            ) : (
              <div className="p-8 text-center">
                <div className="w-14 h-14 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-3 text-gray-600">
                  <OutlineIcon name="briefcase" className="w-6 h-6" />
                </div>
                <p className="font-semibold text-gray-900">No jobs yet</p>
                <p className="text-sm text-gray-600 mt-1">Post a job to start receiving applications.</p>
                <button
                  type="button"
                  onClick={() => navigate('/employer/post-job')}
                  className="mt-4 inline-flex items-center px-4 py-2 bg-[#2e66a6] hover:bg-[#25558a] text-white rounded-lg font-semibold
                             transition focus:outline-none focus:ring-2 focus:ring-[#2e66a6]"
                >
                  <OutlineIcon name="plus" className="w-5 h-5 mr-2" />
                  Post job
                </button>
              </div>
            )}
          </Panel>
        </div>
      </div>
    </EmployerLayout>
  );
};

export default EmployerDashboard;
