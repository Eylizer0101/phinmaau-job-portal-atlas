import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHome,
  faFileAlt,
  faBell,
  faUser,
  faCog,
  faBookmark,
  faSignOutAlt,
  faBars,
  faTimes,
  faChevronDown,
  faCheck,
  faTrash,
  faBriefcase,
  faCheckCircle,
  faTimesCircle,
  faClock,
} from '@fortawesome/free-solid-svg-icons';
import api from '../services/api.js';
import ChatbotWidget from '../components/shared/ChatbotWidget';

/** Helpers */
function useOnClickOutside(refs, handler, enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const listener = (event) => {
      const isInside = refs.some((ref) => ref?.current && ref.current.contains(event.target));
      if (!isInside) handler(event);
    };

    document.addEventListener('mousedown', listener, true);
    document.addEventListener('touchstart', listener, true);

    return () => {
      document.removeEventListener('mousedown', listener, true);
      document.removeEventListener('touchstart', listener, true);
    };
  }, [refs, handler, enabled]);
}

function useEscapeKey(handler, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') handler(e);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handler, enabled]);
}

const JobSeekerLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [userInitials, setUserInitials] = useState('JS');
  const [userFirstName, setUserFirstName] = useState('Jobseeker');

  // ✅ profile image state
  const [profileImage, setProfileImage] = useState('');
  const [avatarBroken, setAvatarBroken] = useState(false);
  const [defaultAvatarBroken, setDefaultAvatarBroken] = useState(false);

  // Notifications
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [notificationDeleteConfirmation, setNotificationDeleteConfirmation] = useState(null);
  const [isDeletingNotification, setIsDeletingNotification] = useState(false);

  // Messages unread count
  const [messageUnreadCount, setMessageUnreadCount] = useState(0);

  // Logout modal
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLogoutModalVisible, setIsLogoutModalVisible] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Scroll hide/show navbar
  const [isNavbarVisible, setIsNavbarVisible] = useState(true);
  const lastScrollYRef = useRef(0);
  const tickingRef = useRef(false);

  // click-outside refs
  const notifBtnRef = useRef(null);
  const notifMenuRef = useRef(null);
  const desktopProfileBtnRef = useRef(null);
  const desktopProfileMenuRef = useRef(null);
  const mobileProfileBtnRef = useRef(null);
  const mobileProfileMenuRef = useRef(null);

  // Logout modal a11y + focus management
  const logoutDialogRef = useRef(null);
  const logoutCancelBtnRef = useRef(null);
  const logoutPrimaryBtnRef = useRef(null);
  const lastFocusBeforeLogoutRef = useRef(null);
  const logoutTimerRef = useRef(null);

  const navItems = useMemo(
    () => [
      { name: 'Home', path: '/jobseeker/dashboard', icon: faHome, mobileLabel: 'Home' },
      { name: 'Application', path: '/jobseeker/my-applications', icon: faFileAlt, mobileLabel: 'Recent' },
      { name: 'Job Offers', path: '/jobseeker/job-search', icon: faBriefcase, mobileLabel: 'Offers' },
      { name: 'Companies', path: '/jobseeker/companies', icon: faBriefcase, mobileLabel: 'Companies' },
    ],
    []
  );

  const profileItems = useMemo(
    () => [
      { name: 'My Profile', path: '/jobseeker/my-profile', icon: faUser },
      { name: 'Bookmarks', path: '/jobseeker/bookmarks', icon: faBookmark },
      { name: 'Account Settings', path: '/jobseeker/settings', icon: faCog },
    ],
    []
  );

  const isActive = (path) => location.pathname === path;
  const isJobDetailsPage = location.pathname.startsWith('/jobseeker/job-details/');
  const isBookmarksPage = location.pathname.startsWith('/jobseeker/bookmarks');
  const isMyProfilePage = location.pathname.startsWith('/jobseeker/my-profile');
  const allowsStickyContent = isJobDetailsPage || isBookmarksPage || isMyProfilePage;

  const getDisplayFirstName = (user = {}) => {
    const firstName = String(user?.firstName || '').trim();
    if (firstName) return firstName;

    const fullName = String(user?.fullName || '').trim();
    if (fullName) return fullName.split(/\s+/)[0] || 'Jobseeker';

    const username = String(user?.username || '').trim();
    if (username) return username;

    return 'Jobseeker';
  };

  const focusRing =
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2';

  const getPublicBaseUrl = useCallback(() => {
    const base = api?.defaults?.baseURL || '';
    return String(base).replace(/\/api\/?$/i, '');
  }, []);

  const getAvatarSrc = useCallback(() => {
    const raw = String(profileImage || '').trim();
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw)) return raw;

    const publicBase = getPublicBaseUrl();
    if (!publicBase) return raw;
    if (raw.startsWith('/')) return `${publicBase}${raw}`;
    return `${publicBase}/${raw}`;
  }, [profileImage, getPublicBaseUrl]);

  const syncUserFromLocalStorage = useCallback(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setUserFirstName(getDisplayFirstName(user));

    if (user.firstName && user.lastName) {
      setUserInitials(`${user.firstName[0]}${user.lastName[0]}`.toUpperCase());
    } else if (user.fullName) {
      const parts = String(user.fullName).trim().split(/\s+/);
      const first = parts[0]?.[0] || 'J';
      const second = parts[1]?.[0] || parts[0]?.[1] || 'S';
      setUserInitials(`${first}${second}`.toUpperCase());
    }

    setProfileImage(user?.profileImage || '');
    setAvatarBroken(false);
    setDefaultAvatarBroken(false);
  }, []);

  const refreshCurrentUser = useCallback(async () => {
    try {
      const res = await api.get('/auth/me');
      if (res?.data?.success && res?.data?.user) {
        const latest = res.data.user;

        const existing = JSON.parse(localStorage.getItem('user') || '{}');
        const merged = { ...existing, ...latest };
        localStorage.setItem('user', JSON.stringify(merged));

        setUserFirstName(getDisplayFirstName(merged));

        if (merged.firstName && merged.lastName) {
          setUserInitials(`${merged.firstName[0]}${merged.lastName[0]}`.toUpperCase());
        } else if (merged.fullName) {
          const parts = String(merged.fullName).trim().split(/\s+/);
          const first = parts[0]?.[0] || 'J';
          const second = parts[1]?.[0] || parts[0]?.[1] || 'S';
          setUserInitials(`${first}${second}`.toUpperCase());
        }

        setProfileImage(merged?.profileImage || '');
        setAvatarBroken(false);
        setDefaultAvatarBroken(false);
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const fetchMessageUnreadCount = useCallback(async () => {
    try {
      const response = await api.get('/messages/unread-count');
      if (response.data?.success) {
        const count = Number(response.data?.data?.unreadCount || 0);
        setMessageUnreadCount(Number.isFinite(count) ? count : 0);
      }
    } catch (error) {
      console.error('Error fetching unread messages:', error);
    }
  }, []);

  useEffect(() => {
    if (showLogoutModal) {
      setIsLogoutModalVisible(false);
      const t = setTimeout(() => setIsLogoutModalVisible(true), 50);
      return () => clearTimeout(t);
    } else {
      setIsLogoutModalVisible(false);
    }
  }, [showLogoutModal]);

  useEffect(() => {
    return () => {
      if (logoutTimerRef.current) {
        clearTimeout(logoutTimerRef.current);
        logoutTimerRef.current = null;
      }
    };
  }, []);

  const openLogoutModal = () => {
    if (isLoggingOut) return;
    setShowLogoutModal(true);
    setIsNotificationOpen(false);
    setIsProfileOpen(false);
    setIsMobileMenuOpen(false);
  };

  const closeLogoutModal = () => {
    if (isLoggingOut) return;

    setIsLogoutModalVisible(false);
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    logoutTimerRef.current = setTimeout(() => {
      setShowLogoutModal(false);
    }, 220);
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (!token) {
      navigate('/login');
      return;
    }

    if (user?.role === 'admin') {
      navigate('/admin/dashboard');
      return;
    }

    if (user?.role === 'employer') {
      navigate('/employer/dashboard');
      return;
    }

    if (user?.role && user.role !== 'jobseeker') {
      navigate('/');
      return;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    syncUserFromLocalStorage();
    refreshCurrentUser();
    fetchNotifications();
    fetchMessageUnreadCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchMessageUnreadCount]);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'user') {
        syncUserFromLocalStorage();
      }
    };
    const onUserUpdated = () => {
      syncUserFromLocalStorage();
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener('user:updated', onUserUpdated);

    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('user:updated', onUserUpdated);
    };
  }, [syncUserFromLocalStorage]);

  useEffect(() => {
    let intervalId = null;

    const startPolling = () => {
      if (intervalId) return;
      intervalId = setInterval(() => {
        fetchNotifications();
        fetchMessageUnreadCount();
      }, 30000);
    };
    const stopPolling = () => {
      if (intervalId) clearInterval(intervalId);
      intervalId = null;
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') stopPolling();
      else {
        startPolling();
        fetchMessageUnreadCount();
      }
    };

    startPolling();
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchMessageUnreadCount]);

  useEffect(() => {
    const refreshUnreadMessages = () => fetchMessageUnreadCount();

    window.addEventListener('focus', refreshUnreadMessages);
    window.addEventListener('messages:unread-updated', refreshUnreadMessages);

    return () => {
      window.removeEventListener('focus', refreshUnreadMessages);
      window.removeEventListener('messages:unread-updated', refreshUnreadMessages);
    };
  }, [fetchMessageUnreadCount]);

  useEffect(() => {
    fetchMessageUnreadCount();
  }, [location.pathname, fetchMessageUnreadCount]);

  useEffect(() => {
    if (isMyProfilePage) {
      setIsNavbarVisible(true);
      return undefined;
    }

    const TOP_SHOW_PX = 8;
    const HIDE_AFTER_PX = 120;
    const DELTA_THRESHOLD = 8;

    const onScroll = () => {
      if (tickingRef.current) return;

      tickingRef.current = true;
      window.requestAnimationFrame(() => {
        const currentY = window.scrollY;
        const lastY = lastScrollYRef.current;
        const delta = currentY - lastY;

        if (currentY <= TOP_SHOW_PX) {
          setIsNavbarVisible(true);
        } else if (Math.abs(delta) >= DELTA_THRESHOLD) {
          if (delta > 0 && currentY > HIDE_AFTER_PX) {
            if (!isNotificationOpen && !isProfileOpen && !isMobileMenuOpen && !showLogoutModal) {
              setIsNavbarVisible(false);
            }
          }
          if (delta < 0) {
            setIsNavbarVisible(true);
          }
        }

        lastScrollYRef.current = currentY;
        tickingRef.current = false;
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isNotificationOpen, isProfileOpen, isMobileMenuOpen, showLogoutModal, isMyProfilePage]);

  useOnClickOutside([notifBtnRef, notifMenuRef], () => setIsNotificationOpen(false), isNotificationOpen);
  useOnClickOutside([desktopProfileBtnRef, desktopProfileMenuRef, mobileProfileBtnRef, mobileProfileMenuRef], () => setIsProfileOpen(false), isProfileOpen);

  useEscapeKey(() => {
    setIsNotificationOpen(false);
    setIsProfileOpen(false);
    setIsMobileMenuOpen(false);
    if (showLogoutModal) closeLogoutModal();
  }, isNotificationOpen || isProfileOpen || isMobileMenuOpen || showLogoutModal);

  const fetchNotifications = async () => {
    try {
      setNotificationLoading(true);
      const response = await api.get('/notifications');
      if (response.data.success) {
        setNotifications(response.data.notifications || []);
        setUnreadCount(response.data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setNotificationLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await api.put(`/notifications/${notificationId}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === notificationId ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.put('/notifications/mark-all-read');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    try {
      await api.delete(`/notifications/${notificationId}`);
      setNotifications((prev) => {
        const deleted = prev.find((n) => n._id === notificationId);
        if (deleted && !deleted.isRead) setUnreadCount((c) => Math.max(0, c - 1));
        return prev.filter((n) => n._id !== notificationId);
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const openNotificationDeleteConfirmation = (notificationId) => {
    setNotificationDeleteConfirmation(notificationId);
  };

  const closeNotificationDeleteConfirmation = () => {
    if (isDeletingNotification) return;
    setNotificationDeleteConfirmation(null);
  };

  const confirmNotificationDelete = async () => {
    if (!notificationDeleteConfirmation || isDeletingNotification) return;

    setIsDeletingNotification(true);
    try {
      await handleDeleteNotification(notificationDeleteConfirmation);
      setNotificationDeleteConfirmation(null);
    } finally {
      setIsDeletingNotification(false);
    }
  };

  const handleLogout = () => {
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

  useEffect(() => {
    if (!showLogoutModal) return;

    lastFocusBeforeLogoutRef.current = document.activeElement;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    setTimeout(() => {
      (logoutCancelBtnRef.current || logoutPrimaryBtnRef.current)?.focus?.();
    }, 0);

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeLogoutModal();
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

  // ✅ UPDATED: match new statuses
  const getNotificationColor = (type) => {
    switch (type) {
      case 'job_match':
        return 'text-blue-700 bg-blue-50';
      case 'application_update':
        return 'text-[#2e66a6] bg-[#2e66a6]/10';
      case 'new_message':
        return 'text-purple-700 bg-purple-50';
      case 'interview':
        return 'text-orange-700 bg-orange-50';
      default:
        return 'text-gray-700 bg-gray-50';
    }
  };

  const getApplicationStatusBadgeStyle = (status) => {
    const s = String(status || '').trim().toLowerCase();

    if (s === 'for interview' || s === 'shortlisted') {
      return 'text-[#2e66a6] bg-[#2e66a6]/10';
    }
    if (s === 'hired' || s === 'accepted') {
      return 'text-green-700 bg-green-50';
    }
    if (s === 'declined' || s === 'rejected') {
      return 'text-red-700 bg-red-50';
    }
    return 'text-amber-700 bg-amber-50';
  };

  const getApplicationStatusIcon = (status) => {
    const s = String(status || '').trim().toLowerCase();

    if (s === 'for interview' || s === 'shortlisted') return faCheckCircle;
    if (s === 'hired' || s === 'accepted') return faCheckCircle;
    if (s === 'declined' || s === 'rejected') return faTimesCircle;
    return faClock;
  };

  const getApplicationStatusLabel = (status) => {
    const s = String(status || '').trim().toLowerCase();

    if (s === 'shortlisted') return 'For Interview';
    if (s === 'accepted') return 'Hired';
    if (s === 'rejected') return 'Declined';
    if (!s) return 'Pending';

    return s
      .split(/[\s_-]+/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getNotificationGroupLabel = (dateString) => {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return 'Last Week';

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfNotificationDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffDays = Math.floor((startOfToday - startOfNotificationDay) / 86400000);

    if (diffDays <= 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return 'Last Week';
  };

  const groupedDropdownNotifications = useMemo(() => {
    const groups = {
      Today: [],
      Yesterday: [],
      'Last Week': [],
    };

    notifications.slice(0, 10).forEach((notification) => {
      groups[getNotificationGroupLabel(notification.createdAt)].push(notification);
    });

    return ['Today', 'Yesterday', 'Last Week']
      .map((label) => ({ label, items: groups[label] }))
      .filter((group) => group.items.length > 0);
  }, [notifications]);

  const MessageIcon = ({ className = 'w-5 h-5' }) => (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M6.75 5.75H17.25C18.3546 5.75 19.25 6.64543 19.25 7.75V14.25C19.25 15.3546 18.3546 16.25 17.25 16.25H10.75L6.75 19.25V16.25C5.64543 16.25 4.75 15.3546 4.75 14.25V7.75C4.75 6.64543 5.64543 5.75 6.75 5.75Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M8.5 9.25H15.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M8.5 12.25H13.25" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );

  const AvatarCircle = ({ sizeClass = 'w-9 h-9', textClass = 'text-sm' }) => {
    const src = getAvatarSrc();
    const defaultSrc = '/images/profile.png';
    const useUploaded = !!src && !avatarBroken;

    const finalSrc = useUploaded ? src : defaultSrc;
    const showImage = useUploaded ? true : !defaultAvatarBroken;

    return (
      <div className={`${sizeClass} rounded-full overflow-hidden flex items-center justify-center bg-[#2e66a6]`}>
        {showImage ? (
          <img
            src={finalSrc}
            alt="Profile"
            className="w-full h-full object-cover"
            onError={() => {
              if (useUploaded) setAvatarBroken(true);
              else setDefaultAvatarBroken(true);
            }}
            loading="eager"
          />
        ) : (
          <span className={`font-semibold text-white ${textClass}`}>{userInitials}</span>
        )}
      </div>
    );
  };

  return (
    <div className={`min-h-screen bg-gray-50 ${allowsStickyContent ? '' : 'overflow-x-hidden'}`} >
      {notificationDeleteConfirmation && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 px-4"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeNotificationDeleteConfirmation();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="notification-delete-title"
            aria-describedby="notification-delete-description"
            className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-xl"
          >
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-red-50">
              <FontAwesomeIcon icon={faTrash} className="h-5 w-5 text-red-600" />
            </div>

            <h2 id="notification-delete-title" className="mt-4 text-center text-lg font-bold text-gray-900">
              Delete notification?
            </h2>

            <p id="notification-delete-description" className="mt-2 text-center text-sm text-gray-600">
              This notification will be removed from your list.
            </p>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={closeNotificationDeleteConfirmation}
                disabled={isDeletingNotification}
                className={`flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-60 ${focusRing}`}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmNotificationDelete}
                disabled={isDeletingNotification}
                className={`flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60 ${focusRing}`}
              >
                {isDeletingNotification ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showLogoutModal && (
        <div
          className={[
            'fixed inset-0 z-[70] flex items-center justify-center px-4',
            'bg-black/60 backdrop-blur-[2px]',
            'transition-opacity duration-300',
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
              'transform transition-all duration-300',
              isLogoutModalVisible
                ? 'opacity-100 scale-100 translate-y-0'
                : 'opacity-0 scale-95 translate-y-2',
            ].join(' ')}
          >
            <div className="p-6 sm:p-7">
              <div className="mx-auto mb-4 w-14 h-14 rounded-full flex items-center justify-center shadow-sm">
                <img
                  src="/images/error.png"
                  alt="Error"
                  className="w-14 h-14 object-contain"
                  draggable="false"
                />
              </div>

              <h2
                id="logout-title"
                className="text-lg sm:text-xl font-extrabold text-gray-900 text-center tracking-tight"
              >
                Sign out?
              </h2>

              <p
                id="logout-desc"
                className="mt-2 text-sm sm:text-[15px] text-gray-600 text-center leading-relaxed"
              >
                Are you sure you want to sign out of your job seeker account?
              </p>

              <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  ref={logoutPrimaryBtnRef}
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className={[
                    'inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold',
                    'bg-red-600 text-white hover:bg-red-700 transition-colors',
                    'shadow-sm hover:shadow-md active:scale-[0.99] transition-transform',
                    focusRing,
                    isLoggingOut ? 'opacity-70 cursor-not-allowed' : '',
                  ].join(' ')}
                >
                  {isLoggingOut && (
                    <span
                      className="inline-block h-4 w-4 rounded-full border-2 border-white/90 border-t-transparent animate-spin"
                      aria-hidden="true"
                    />
                  )}
                  {isLoggingOut ? 'Logging out…' : 'Sign out'}
                </button>

                <button
                  ref={logoutCancelBtnRef}
                  type="button"
                  onClick={closeLogoutModal}
                  disabled={isLoggingOut}
                  className={[
                    'inline-flex items-center justify-center px-6 py-3 rounded-xl font-semibold',
                    'bg-white text-gray-800 border border-gray-200 hover:bg-gray-50 transition-colors',
                    'shadow-sm active:scale-[0.99] transition-transform',
                    focusRing,
                    isLoggingOut ? 'opacity-70 cursor-not-allowed' : '',
                  ].join(' ')}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DESKTOP NAVBAR */}
      <nav
        className={`
          bg-white border-b border-gray-200 fixed top-0 left-0 right-0 z-40
          md:block hidden transition-transform duration-300 ease-in-out
          ${isNavbarVisible ? 'translate-y-0' : '-translate-y-full'}
        `}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link
                to="/jobseeker/dashboard"
                className={`flex items-center gap-2 min-w-[200px] ${focusRing}`}
                aria-label="AGAPAY Home"
              >
                <img
                  src="/images/phinma-logo.png"
                  alt="PHINMA"
                  className="h-9 w-auto"
                  loading="eager"
                />
                <img
                  src="/images/agapay.png"
                  alt="AGAPAY Job Portal"
                  className="h-9 w-auto"
                  width="140"
                  height="35"
                  loading="eager"
                />
              </Link>

              <div className="ml-8 flex items-center gap-6">
                {navItems.map((item) =>
                  item.path ? (
                    <Link
                      key={item.name}
                      to={item.path}
                      className={`
                        text-sm font-medium transition-colors
                        ${focusRing}
                        ${
                          isActive(item.path)
                            ? 'text-[#2e66a6] font-semibold'
                            : 'text-gray-700 hover:text-[#2e66a6]'
                        }
                      `}
                      aria-current={isActive(item.path) ? 'page' : undefined}
                    >
                      {item.name}
                    </Link>
                  ) : (
                    <span
                      key={item.name}
                      className="text-sm font-medium text-gray-700 cursor-default select-none"
                    >
                      {item.name}
                    </span>
                  )
                )}
              </div>
            </div>

            <div className="flex items-center space-x-1">
              <Link
                to="/jobseeker/messages"
                className={`p-2 text-gray-700 hover:text-[#2e66a6] transition-colors relative rounded-lg ${focusRing}`}
                aria-label="Messages"
              >
                <MessageIcon className="w-7 h-7" />
                {messageUnreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center leading-none">
                    {messageUnreadCount > 99 ? '99+' : messageUnreadCount}
                  </span>
                )}
              </Link>

              <div className="relative">
                <button
                  ref={notifBtnRef}
                  type="button"
                  className={`p-2 text-gray-700 hover:text-[#2e66a6] transition-colors relative rounded-lg ${focusRing}`}
                  aria-label="Notifications"
                  aria-haspopup="menu"
                  aria-expanded={isNotificationOpen}
                  aria-controls="notifications-menu"
                  onClick={() => {
                    setIsNotificationOpen((v) => !v);
                    setIsProfileOpen(false);
                  }}
                >
                  <FontAwesomeIcon icon={faBell} className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {isNotificationOpen && (
                  <div
                    ref={notifMenuRef}
                    id="notifications-menu"
                    role="menu"
                    className="
                      absolute right-0 mt-2
                      w-[min(24rem,calc(100vw-1.5rem))] max-w-[calc(100vw-1.5rem)]
                      bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50
                      max-h-[520px] overflow-y-auto
                    "
                  >
                    <div className="px-4 py-3 border-b border-gray-100">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-[#2e66a6]/10 rounded-lg">
                            <FontAwesomeIcon icon={faBell} className="w-4 h-4 text-[#2e66a6]" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">Notifications</h3>
                        
                          </div>
                        </div>
                        {unreadCount > 0 && (
                          <button
                            type="button"
                            onClick={handleMarkAllAsRead}
                            className={`text-sm text-[#2e66a6] hover:text-[#2e66a6] font-medium rounded-md px-2 py-1 ${focusRing}`}
                          >
                            Mark all as read
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="px-1 py-2">
                      {notificationLoading ? (
                        <div className="px-4 py-8 text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2e66a6] mx-auto" />
                          <p className="text-gray-500 mt-2 text-sm">Loading notifications...</p>
                        </div>
                      ) : notifications.length === 0 ? (
                        <div className="px-4 py-8 text-center">
                          <div className="w-12 h-12 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-3">
                            <FontAwesomeIcon icon={faBell} className="w-6 h-6 text-gray-400" />
                          </div>
                          <p className="text-gray-600 text-sm">No new notifications</p>
                          <p className="text-gray-400 text-xs mt-1">You're all caught up!</p>
                        </div>
                      ) : (
                        <div className="space-y-3 px-1">
                          {groupedDropdownNotifications.map((group) => (
                            <section key={group.label} aria-labelledby={`notification-group-${group.label.replace(/\s+/g, '-').toLowerCase()}`}>
                              <h4
                                id={`notification-group-${group.label.replace(/\s+/g, '-').toLowerCase()}`}
                                className="px-3 pb-1 pt-2 text-xs font-bold uppercase tracking-wide text-gray-500"
                              >
                                {group.label}
                              </h4>

                              <div className="space-y-1">
                                {group.items.map((n) => (
                                  <div
                                    key={n._id}
                                    role="menuitem"
                                    tabIndex={0}
                                    className={`rounded-lg px-3 py-3 outline-none transition-colors hover:bg-gray-50 ${
                                      !n.isRead ? 'bg-blue-50' : 'bg-white'
                                    } ${focusRing}`}
                                    onClick={async () => {
                                      if (!n.isRead) await handleMarkAsRead(n._id);
                                      if (n.link) {
                                        navigate(n.link);
                                        setIsNotificationOpen(false);
                                      }
                                    }}
                                    onKeyDown={async (e) => {
                                      if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        if (!n.isRead) await handleMarkAsRead(n._id);
                                        if (n.link) {
                                          navigate(n.link);
                                          setIsNotificationOpen(false);
                                        }
                                      }
                                    }}
                                  >
                                    <div className="flex items-start gap-3">
                                      <div
                                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                                          !n.isRead ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                                        }`}
                                      >
                                        {n.type === 'job_match' ? (
                                          <FontAwesomeIcon icon={faBriefcase} className="h-4 w-4" />
                                        ) : n.type === 'new_message' ? (
                                          <MessageIcon className="h-4 w-4" />
                                        ) : n.type === 'application_update' ? (
                                          <FontAwesomeIcon icon={faFileAlt} className="h-4 w-4" />
                                        ) : (
                                          <FontAwesomeIcon icon={faBell} className="h-4 w-4" />
                                        )}
                                      </div>

                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-start justify-between gap-3">
                                          <h5 className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-900">
                                            {n.title}
                                          </h5>
                                          <span className="shrink-0 text-xs text-gray-500">
                                            {formatTime(n.createdAt)}
                                          </span>
                                        </div>
                                        <p className="mt-1 line-clamp-2 text-sm text-gray-700">{n.message}</p>

                                        {n.type === 'application_update' && n.metadata?.newStatus && (
                                          <div
                                            className={`mt-2 inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getApplicationStatusBadgeStyle(
                                              n.metadata.newStatus
                                            )}`}
                                          >
                                            <FontAwesomeIcon
                                              icon={getApplicationStatusIcon(n.metadata.newStatus)}
                                              className="mr-1 h-3 w-3"
                                            />
                                            {getApplicationStatusLabel(n.metadata.newStatus)}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </section>
                          ))}
                        </div>
                      )}
                    </div>

                    {notifications.length > 0 && (
                      <div className="border-t border-gray-100 px-4 py-3">
                        <Link
                          to="/jobseeker/notifications"
                          className={`flex items-center justify-center w-full px-3 py-2 text-sm text-[#2e66a6] hover:text-[#2e66a6] font-medium rounded-lg ${focusRing}`}
                          onClick={() => setIsNotificationOpen(false)}
                        >
                          View all notifications
                          <FontAwesomeIcon icon={faChevronDown} className="w-3 h-3 ml-2 -rotate-90" />
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="relative">
                <button
                  ref={desktopProfileBtnRef}
                  type="button"
                  onClick={() => {
                    setIsProfileOpen((v) => !v);
                    setIsNotificationOpen(false);
                  }}
                  className={`flex items-center gap-2 rounded-full px-2 py-1.5 hover:bg-gray-50 transition-colors ${focusRing}`}
                  aria-label="Profile menu"
                  aria-haspopup="menu"
                  aria-expanded={isProfileOpen}
                  aria-controls="profile-menu"
                >
                  <AvatarCircle sizeClass="w-9 h-9" textClass="text-sm" />
                  <span className="hidden lg:inline-block max-w-[120px] truncate text-sm font-semibold text-gray-900">
                    {userFirstName}
                  </span>

                  <FontAwesomeIcon
                    icon={faChevronDown}
                    className={`w-3.5 h-3.5 text-gray-900 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {isProfileOpen && (
                  <div
                    ref={desktopProfileMenuRef}
                    id="profile-menu"
                    role="menu"
                    className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50"
                  >
                   

                    {profileItems.map((item) => (
                      <Link
                        key={item.name}
                        to={item.path}
                        role="menuitem"
                        className={`flex items-center px-4 py-3 text-sm text-gray-700 hover:text-[#2e66a6] hover:bg-gray-50 transition-colors ${focusRing}`}
                        onClick={() => setIsProfileOpen(false)}
                      >
                        <FontAwesomeIcon icon={item.icon} className="w-4 h-4 mr-3" />
                        {item.name}
                      </Link>
                    ))}

                    <div className="border-t border-gray-100 my-1" />
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileOpen(false);
                        openLogoutModal();
                      }}
                      className={`flex items-center w-full px-4 py-3 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors ${focusRing}`}
                    >
                      <FontAwesomeIcon icon={faSignOutAlt} className="w-4 h-4 mr-3" />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* MOBILE LAYOUT */}
      <div className="md:hidden">
        <div
          className={`
            fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-30
            transition-transform duration-300 ease-in-out
            ${isNavbarVisible ? 'translate-y-0' : '-translate-y-full'}
          `}
        >
          <div className="flex justify-between items-center h-14 px-4">
            <Link to="/jobseeker/dashboard" className={`flex items-center gap-2 ${focusRing}`}>
              <img src="/images/agapay.png" alt="AGAPAY" className="h-7 w-auto" />
              <img src="/images/phinma-logo.png" alt="PHINMA" className="h-7 w-auto" />
            </Link>

            <div className="flex items-center gap-2">
              <Link
                to="/jobseeker/messages"
                className={`p-2 text-gray-800 rounded-lg relative ${focusRing}`}
                aria-label="Messages"
                onClick={() => {
                  setIsNotificationOpen(false);
                  setIsProfileOpen(false);
                  setIsMobileMenuOpen(false);
                }}
              >
                <MessageIcon className="h-5 w-5" />
                {messageUnreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center leading-none">
                    {messageUnreadCount > 99 ? '99+' : messageUnreadCount}
                  </span>
                )}
              </Link>

              <button
                type="button"
                className={`p-2 text-gray-800 rounded-lg relative ${focusRing}`}
                aria-label="Notifications"
                aria-expanded={isNotificationOpen}
                onClick={() => {
                  setIsNotificationOpen(true);
                  setIsProfileOpen(false);
                  setIsMobileMenuOpen(false);
                }}
              >
                <FontAwesomeIcon icon={faBell} className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                className={`p-2 text-gray-800 rounded-lg ${focusRing}`}
                onClick={() => {
                  setIsMobileMenuOpen(true);
                  setIsNotificationOpen(false);
                  setIsProfileOpen(false);
                }}
                aria-label="Open menu"
              >
                <FontAwesomeIcon icon={faBars} className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        <main className={`pt-28 pb-20 px-2 sm:px-4 ${isJobDetailsPage ? 'overflow-x-clip' : 'overflow-x-hidden'}`}>{children}</main>

        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40">
          <div className="flex justify-around py-2">
            {navItems.filter((item) => item.path).map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className={`
                  flex flex-col items-center p-2 flex-1 transition-colors min-w-0
                  ${focusRing}
                  ${isActive(item.path) ? 'text-[#2e66a6]' : 'text-gray-700 hover:text-[#2e66a6]'}
                `}
                aria-label={item.name}
                onClick={() => window.scrollTo(0, 0)}
              >
                <div className="relative">
                  <FontAwesomeIcon icon={item.icon} className="w-5 h-5" />
                  {isActive(item.path) && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-[#2e66a6] rounded-full" />
                  )}
                </div>
                <span className="text-xs font-medium mt-1 truncate w-full text-center">
                  {item.mobileLabel}
                </span>
              </Link>
            ))}

            <button
              ref={mobileProfileBtnRef}
              type="button"
              onClick={() => {
                setIsProfileOpen((v) => !v);
                setIsNotificationOpen(false);
                setIsMobileMenuOpen(false);
              }}
              className={`flex flex-col items-center p-2 flex-1 transition-colors ${focusRing} ${isProfileOpen ? 'text-[#2e66a6]' : 'text-gray-700 hover:text-[#2e66a6]'}`}
              aria-label="Profile"
              aria-haspopup="menu"
              aria-expanded={isProfileOpen}
              aria-controls="mobile-profile-menu"
            >
              <AvatarCircle sizeClass="w-7 h-7" textClass="text-xs" />
              <span className="text-xs font-medium mt-1">Profile</span>
            </button>
          </div>

          {isProfileOpen && (
            <div
              ref={mobileProfileMenuRef}
              id="mobile-profile-menu"
              role="menu"
              className="absolute bottom-full left-0 right-0 z-[60] bg-white border-t border-gray-200 shadow-lg py-2"
            >
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-900">{userFirstName}</p>
                <p className="text-xs text-gray-500">Job Seeker Account</p>
              </div>

              {profileItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center px-4 py-3 text-sm text-gray-700 hover:text-[#2e66a6] hover:bg-gray-50 transition-colors ${focusRing}`}
                  onClick={() => setIsProfileOpen(false)}
                >
                  <FontAwesomeIcon icon={item.icon} className="w-4 h-4 mr-3" />
                  {item.name}
                </Link>
              ))}

              <div className="border-t border-gray-100 my-1" />
              <button
                type="button"
                onClick={() => {
                  setIsProfileOpen(false);
                  openLogoutModal();
                }}
                className={`flex items-center w-full px-4 py-3 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors ${focusRing}`}
              >
                <FontAwesomeIcon icon={faSignOutAlt} className="w-4 h-4 mr-3" />
               Sign out
              </button>
            </div>
          )}
        </nav>

        {isNotificationOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-50"
            role="dialog"
            aria-modal="true"
            onClick={() => setIsNotificationOpen(false)}
          >
            <div
              className="absolute top-16 right-4 left-4 bg-white rounded-xl shadow-xl border border-gray-200 max-h-[75vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#2e66a6]/10 rounded-lg">
                    <FontAwesomeIcon icon={faBell} className="w-4 h-4 text-[#2e66a6]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Notifications</h3>
                    <p className="text-xs text-gray-500">Updates about your job search</p>
                  </div>
                </div>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllAsRead}
                    className={`text-sm text-[#2e66a6] hover:text-[#2e66a6] font-medium rounded-md px-2 py-1 ${focusRing}`}
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="px-2 py-2">
                {notificationLoading ? (
                  <div className="px-4 py-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2e66a6] mx-auto" />
                    <p className="text-gray-500 mt-2 text-sm">Loading notifications...</p>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <div className="w-12 h-12 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-3">
                      <FontAwesomeIcon icon={faBell} className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-gray-600 text-sm">No new notifications</p>
                    <p className="text-gray-400 text-xs mt-1">You're all caught up!</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {notifications.slice(0, 10).map((n) => (
                      <div
                        key={n._id}
                        className={`px-3 py-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer ${!n.isRead ? 'bg-blue-50' : ''}`}
                        onClick={async () => {
                          if (!n.isRead) await handleMarkAsRead(n._id);
                          if (n.link) {
                            navigate(n.link);
                            setIsNotificationOpen(false);
                          }
                        }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div
                              className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300 hover:scale-105 ${
                                !n.isRead
                                  ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              {(() => {
                                switch (n.type) {
                                  case 'job_match':
                                    return (
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                      </svg>
                                    );
                                  case 'application_update':
                                    return (
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                    );
                                  case 'new_message':
                                    return (
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                      </svg>
                                    );
                                  case 'interview':
                                    return (
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                      </svg>
                                    );
                                  default:
                                    return (
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v-1a3 3 0 11-6 0v1m6 0H9" />
                                      </svg>
                                    );
                                }
                              })()}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-3 mb-1">
                                <h4 className="text-sm font-semibold text-gray-900 truncate">{n.title}</h4>
                              </div>
                              <p className="text-sm text-gray-700 line-clamp-2">{n.message}</p>

                              {n.type === 'application_update' && n.metadata?.newStatus && (
                                <div
                                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-2 ${getApplicationStatusBadgeStyle(
                                    n.metadata.newStatus
                                  )}`}
                                >
                                  <FontAwesomeIcon
                                    icon={getApplicationStatusIcon(n.metadata.newStatus)}
                                    className="w-3 h-3 mr-1"
                                  />
                                  {getApplicationStatusLabel(n.metadata.newStatus)}
                                </div>
                              )}
                            </div>
                          </div>
                          <span className="shrink-0 text-xs text-gray-500">{formatTime(n.createdAt)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {notifications.length > 0 && (
                <div className="border-t border-gray-100 px-4 py-3">
                  <Link
                    to="/jobseeker/notifications"
                    className={`flex items-center justify-center w-full px-3 py-2 text-sm text-[#2e66a6] hover:text-[#2e66a6] font-medium rounded-lg ${focusRing}`}
                    onClick={() => setIsNotificationOpen(false)}
                  >
                    View all notifications
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {isMobileMenuOpen && (
          <>
            <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setIsMobileMenuOpen(false)} aria-hidden="true" />
            <div className="fixed inset-y-0 right-0 w-72 bg-white shadow-xl z-50">
              <div className="px-5 pt-6 pb-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img src="/images/agapay.png" alt="AGAPAY" className="h-7 w-auto" />
                    <img src="/images/phinma-logo.png" alt="PHINMA" className="h-7 w-auto" />
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`p-2 text-gray-800 rounded-lg ${focusRing}`}
                    aria-label="Close menu"
                  >
                    <FontAwesomeIcon icon={faTimes} className="h-5 w-5" />
                  </button>
                </div>

                <div className="mt-6 flex items-center gap-3">
                  <AvatarCircle sizeClass="w-10 h-10" textClass="text-sm" />

                  <div>
                    <p className="text-sm font-semibold text-gray-900">{userFirstName}</p>
                    <Link to="/jobseeker/my-profile" className={`text-xs text-gray-500 hover:text-[#2e66a6] ${focusRing}`}>
                      View Profile
                    </Link>
                  </div>
                </div>
              </div>

              <div className="py-4 overflow-y-auto max-h-[calc(100vh-180px)]">
                <div className="px-3 space-y-1">
                  {navItems.map((item) =>
                    item.path ? (
                      <Link
                        key={item.name}
                        to={item.path}
                        className={`
                          flex items-center px-3 py-3.5 rounded-lg transition-colors
                          ${focusRing}
                          ${isActive(item.path) ? 'bg-[#2e66a6]/10 text-[#2e66a6]' : 'text-gray-900 hover:bg-gray-50 hover:text-[#2e66a6]'}
                        `}
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <FontAwesomeIcon icon={item.icon} className="w-5 h-5 mr-4 text-gray-500" />
                        <span className="text-base font-medium">{item.name}</span>
                      </Link>
                    ) : (
                      <div
                        key={item.name}
                        className="flex items-center px-3 py-3.5 rounded-lg text-gray-900 cursor-default"
                      >
                        <FontAwesomeIcon icon={item.icon} className="w-5 h-5 mr-4 text-gray-500" />
                        <span className="text-base font-medium">{item.name}</span>
                      </div>
                    )
                  )}

                  <Link
                    to="/jobseeker/messages"
                    className={`flex items-center px-3 py-3.5 rounded-lg transition-colors text-gray-900 hover:bg-gray-50 hover:text-[#2e66a6] ${focusRing}`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span className="relative mr-4 flex h-5 w-5 items-center justify-center text-gray-500">
                      <MessageIcon className="w-5 h-5" />
                      {messageUnreadCount > 0 && (
                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center leading-none">
                          {messageUnreadCount > 99 ? '99+' : messageUnreadCount}
                        </span>
                      )}
                    </span>
                    <span className="text-base font-medium">Messages</span>
                  </Link>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200 px-3">
                  <div className="space-y-1">
                    {profileItems.map((item) => (
                      <Link
                        key={item.name}
                        to={item.path}
                        className={`flex items-center px-3 py-3 rounded-lg text-gray-900 hover:bg-gray-50 hover:text-[#2e66a6] transition-colors ${focusRing}`}
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <FontAwesomeIcon icon={item.icon} className="w-4 h-4 mr-4 text-gray-500" />
                        <span className="text-base font-medium">{item.name}</span>
                      </Link>
                    ))}
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200 px-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      openLogoutModal();
                    }}
                    className={`flex items-center w-full px-3 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors ${focusRing}`}
                  >
                    <FontAwesomeIcon icon={faSignOutAlt} className="w-4 h-4 mr-4" />
                    <span className="text-base font-medium">Logout</span>
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <main className="w-full py-8 pt-20 hidden md:block">{children}</main>

      <ChatbotWidget role="jobseeker" />
    </div>
  );
};

export default JobSeekerLayout;