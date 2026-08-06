import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBell,
  faCheck,
  faEnvelope,
  faBriefcase,
  faFileAlt,
  faCalendarAlt,
  faCheckCircle,
  faClock,
  faTimesCircle,
  faCircle
} from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';

const UI = {
  pageBg: 'bg-gray-50',
  container: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8',
  shell: 'bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden',

  textPrimary: 'text-gray-900',
  textSecondary: 'text-gray-600',
  textMuted: 'text-gray-500',

  h1: 'text-2xl sm:text-3xl font-bold tracking-tight',
  h2: 'text-base font-semibold',
  caption: 'text-xs',

  ring: 'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2',

  btnBase:
    'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition disabled:opacity-60 disabled:pointer-events-none active:scale-[0.99] motion-reduce:transition-none motion-reduce:transform-none',
  btnSm: 'h-9 px-3 text-sm',
  btnMd: 'h-10 px-4 text-sm',
  btnIcon: 'h-10 w-10',

  btnPrimary: 'bg-[#2e66a6] text-white hover:bg-[#1f4a7a]',
  btnSecondary: 'bg-white text-gray-800 border border-gray-200 hover:bg-gray-50',
  btnSoft: 'bg-blue-50 text-[#2e66a6] hover:bg-blue-100 border border-blue-100',
  btnGhost: 'bg-transparent text-gray-700 hover:bg-gray-100',
  btnDangerGhost: 'bg-transparent text-red-600 hover:bg-red-50',

  badge: 'inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold border',
  badgeUnread: 'bg-blue-50 text-[#1f4a7a] border-blue-200',
};

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, unread, read
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const navigate = useNavigate();

  const api = axios.create({
    baseURL: process.env.REACT_APP_API_URL || 'https://phinmaau-job-portal-atlas.onrender.com/api',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  });

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await api.get('/notifications');

      if (response.data.success) {
        setNotifications(response.data.notifications || []);
        setUnreadCount(response.data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      if (error.response && error.response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await api.get('/notifications/unread-count');
      if (response.data.success) setUnreadCount(response.data.count || 0);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();

    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 30000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMarkAsRead = async (notificationId) => {
    try {
      const response = await api.put(`/notifications/${notificationId}/read`);

      if (response.data.success) {
        setNotifications((prev) =>
          prev.map((notif) => (notif._id === notificationId ? { ...notif, isRead: true } : notif))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.isRead) {
      await handleMarkAsRead(notification._id);
    }
    if (notification.link) navigate(notification.link);
  };

  const handleMarkAllAsRead = async () => {
    try {
      const response = await api.put('/notifications/mark-all-read');
      if (response.data.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'job_match':
        return faBriefcase;
      case 'application_update':
        return faFileAlt;
      case 'new_message':
        return faEnvelope;
      case 'interview':
        return faCalendarAlt;
      default:
        return faBell;
    }
  };

  const getNotificationTone = (type) => {
    switch (type) {
      case 'job_match':
        return 'text-blue-700 bg-blue-50 border-blue-100';
      case 'application_update':
        return 'text-[#2e66a6] bg-blue-50 border-blue-100';
      case 'new_message':
        return 'text-violet-700 bg-violet-50 border-violet-100';
      case 'interview':
        return 'text-amber-700 bg-amber-50 border-amber-100';
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'for interview':
      case 'hired':
        return faCheckCircle;
      case 'declined':
        return faTimesCircle;
      default:
        return faClock;
    }
  };

  const getStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'hired') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (s === 'for interview') return 'bg-blue-50 text-[#1f4a7a] border-blue-200';
    if (s === 'declined') return 'bg-red-50 text-red-700 border-red-200';
    return 'bg-amber-50 text-amber-800 border-amber-200';
  };

  const getStatusLabel = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'for interview') return 'For Interview';
    if (s === 'hired') return 'Hired';
    if (s === 'declined') return 'Declined';
    if (s === 'pending') return 'Pending';
    if (s === 'withdrawn') return 'Withdrawn';
    if (s === 'cancelled') return 'Cancelled';
    return status || 'Unknown';
  };

  const getNotificationDisplayTitle = (notification = {}) => {
    const type = String(notification?.type || '').trim().toLowerCase();

    if (type === 'job_match') return 'New Job Match!';
    if (type === 'new_message') return 'New Message';
    if (type === 'application_update') return 'Application Update';
    if (type === 'verification') return 'Credentials';

    return String(notification?.title || 'Notification').trim() || 'Notification';
  };

  const getNotificationDisplayMessage = (notification = {}) => {
    const type = String(notification?.type || '').trim().toLowerCase();
    const metadata = notification?.metadata || {};

    if (type === 'verification') {
      const remaining = Number(
        metadata?.remainingCredentials ??
        metadata?.missingCredentialCount ??
        metadata?.remainingCount
      );

      if (Number.isFinite(remaining) && remaining > 0) {
        return `You still have ${remaining} credential${remaining === 1 ? '' : 's'} that need to be submitted.`;
      }
    }

    if (type === 'new_message' && metadata?.lastMessage) {
      const senderName = String(metadata?.senderName || 'User').trim() || 'User';
      return `New message from ${senderName}: ${String(metadata.lastMessage).trim()}`;
    }

    return String(notification?.message || '').trim();
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

  const filteredNotifications = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return notifications.filter((notif) => {
      const matchesFilter =
        filter === 'unread' ? !notif.isRead : filter === 'read' ? notif.isRead : true;

      if (!matchesFilter) return false;
      if (!query) return true;

      const searchableValues = [
        notif.title,
        notif.message,
        notif.type,
        notif.metadata?.companyName,
        notif.metadata?.jobTitle,
        notif.metadata?.newStatus,
      ];

      return searchableValues.some((value) =>
        String(value || '').toLowerCase().includes(query)
      );
    });
  }, [notifications, filter, searchQuery]);

  const numericPageSize = pageSize === 'all' ? Math.max(filteredNotifications.length, 1) : Number(pageSize);
  const totalPages = pageSize === 'all'
    ? 1
    : Math.max(1, Math.ceil(filteredNotifications.length / numericPageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedNotifications = pageSize === 'all'
    ? filteredNotifications
    : filteredNotifications.slice(
        (safePage - 1) * numericPageSize,
        safePage * numericPageSize
      );

  const paginationItems = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    if (safePage <= 4) {
      return [1, 2, 3, 4, 5, 'ellipsis-right', totalPages];
    }

    if (safePage >= totalPages - 3) {
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
      safePage - 1,
      safePage,
      safePage + 1,
      'ellipsis-right',
      totalPages,
    ];
  }, [safePage, totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchQuery, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const unreadInlineCount = useMemo(() => notifications.filter((n) => !n.isRead).length, [notifications]);

  return (
    <div className={UI.pageBg}>

      <div className={UI.container}>
        {/* Header (match Messages page style) */}
        <div className={`${UI.shell} p-5 sm:p-6 mb-6`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4 min-w-0">
              <div className="h-12 w-12 rounded-2xl bg-[#2e66a6] flex items-center justify-center flex-shrink-0">
                <FontAwesomeIcon icon={faBell} className="w-6 h-6 text-white" />
              </div>

              <div className="min-w-0">
                <h1 className={`${UI.h1} ${UI.textPrimary}`}>Notifications</h1>
                <p className={`text-sm ${UI.textSecondary} mt-1`}>
                  Stay updated with job matches, application status, and messages
                </p>
              </div>
            </div>

            <div className="relative w-full sm:max-w-md">
              <svg
                className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="m21 21-4.35-4.35m1.35-5.65a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" />
              </svg>
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search notifications..."
                className={`h-11 w-full rounded-xl border border-gray-200 bg-white pl-11 pr-4 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 ${UI.ring}`}
                aria-label="Search notifications"
              />
            </div>
          </div>
        </div>

        {/* Filters + Mark all as read */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex items-center rounded-2xl bg-white border border-gray-200 p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={[
                UI.btnBase,
                'h-9 px-4 text-sm rounded-xl',
                filter === 'all' ? 'bg-[#2e66a6] text-white' : 'bg-transparent text-gray-700 hover:bg-gray-100',
                UI.ring,
              ].join(' ')}
            >
              All
            </button>

            <button
              type="button"
              onClick={() => setFilter('unread')}
              className={[
                UI.btnBase,
                'h-9 px-4 text-sm rounded-xl',
                filter === 'unread' ? 'bg-[#2e66a6] text-white' : 'bg-transparent text-gray-700 hover:bg-gray-100',
                UI.ring,
              ].join(' ')}
            >
              Unread
              {unreadInlineCount > 0 && (
                <span className="ml-2 inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-xs bg-white/20 border border-white/30">
                  {unreadInlineCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setFilter('read')}
              className={[
                UI.btnBase,
                'h-9 px-4 text-sm rounded-xl',
                filter === 'read' ? 'bg-[#2e66a6] text-white' : 'bg-transparent text-gray-700 hover:bg-gray-100',
                UI.ring,
              ].join(' ')}
            >
              Read
            </button>
          </div>

          <button
            onClick={handleMarkAllAsRead}
            disabled={unreadCount === 0}
            className={`${UI.btnBase} ${UI.btnMd} ${unreadCount === 0 ? UI.btnSecondary : UI.btnSoft} ${UI.ring}`}
            type="button"
          >
            <FontAwesomeIcon icon={faCheck} className="w-4 h-4" />
            Mark all as read
          </button>
        </div>

        {/* List */}
        <div className={UI.shell}>
          {loading ? (
            <div className="p-12 text-center">
              <div className="h-12 w-12 rounded-full border-2 border-gray-200 border-t-[#2e66a6] animate-spin mx-auto" />
              <p className={`mt-4 ${UI.textMuted}`}>Loading notifications...</p>
            </div>
          ) : paginatedNotifications.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <FontAwesomeIcon icon={faBell} className="w-8 h-8 text-gray-300" />
              </div>
              <h3 className={`text-lg font-semibold ${UI.textPrimary} mb-2`}>No notifications</h3>
              <p className={UI.textMuted}>
                {filter === 'all'
                  ? "You're all caught up! New notifications will appear here."
                  : filter === 'unread'
                  ? "You don't have any unread notifications."
                  : "You don't have any read notifications."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {paginatedNotifications.map((notification) => (
                <div
                  key={notification._id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleNotificationClick(notification)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') handleNotificationClick(notification);
                  }}
                  className={[
                    'p-4 sm:p-5 cursor-pointer transition',
                    !notification.isRead ? 'bg-blue-50/40' : 'bg-white',
                    'hover:bg-gray-50',
                  ].join(' ')}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300 hover:scale-105 ${
                        !notification.isRead
                          ? 'bg-blue-100 text-[#2e66a6] hover:bg-blue-200'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {(() => {
                        switch (notification.type) {
                          case 'job_match':
                            return (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={1.5}
                                  d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                />
                              </svg>
                            );
                          case 'application_update':
                            return (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={1.5}
                                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                            );
                          case 'new_message':
                            return (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={1.5}
                                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                                />
                              </svg>
                            );
                          case 'interview':
                            return (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={1.5}
                                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                              </svg>
                            );
                          default:
                            return (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={1.5}
                                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                                />
                              </svg>
                            );
                        }
                      })()}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p
                            className={`font-semibold ${UI.textPrimary} break-words`}
                            title={getNotificationDisplayTitle(notification)}
                          >
                            {getNotificationDisplayTitle(notification)}
                          </p>
                          <p className={`text-sm ${UI.textSecondary} mt-1 break-words leading-6`}>
                            {getNotificationDisplayMessage(notification)}
                          </p>
                        </div>

                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className={`text-xs ${UI.textMuted}`}>{formatTime(notification.createdAt)}</span>

                          {!notification.isRead && (
                            <span className="inline-flex items-center" aria-label="Unread">
                              <FontAwesomeIcon icon={faCircle} className="w-2 h-2 text-[#2e66a6]" />
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Status badge */}
                      {notification.type === 'application_update' && notification.metadata?.newStatus && (
                        <div className="mt-3">
                          <span className={[UI.badge, getStatusBadge(notification.metadata.newStatus)].join(' ')}>
                            <FontAwesomeIcon icon={getStatusIcon(notification.metadata.newStatus)} className="w-3 h-3" />
                            {getStatusLabel(notification.metadata.newStatus)}
                          </span>
                        </div>
                      )}

                      {/* Metadata */}
                      {notification.metadata && (
                        <div className={`mt-3 text-sm ${UI.textMuted} space-y-1`}>
                          {notification.metadata.companyName && <p>Company: {notification.metadata.companyName}</p>}
                          {notification.metadata.jobTitle && <p>Job: {notification.metadata.jobTitle}</p>}
                          {notification.metadata.interviewDate && (
                            <p className="flex items-center gap-2">
                              <FontAwesomeIcon icon={faCalendarAlt} className="w-3.5 h-3.5" />
                              <span>Interview: {new Date(notification.metadata.interviewDate).toLocaleDateString()}</span>
                            </p>
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="mt-4 flex items-center gap-3 flex-wrap">
                        {notification.link && (
                          <Link
                            to={notification.link}
                            className="text-[#2e66a6] hover:text-[#1f4a7a] font-semibold text-sm"
                            onClick={(e) => e.stopPropagation()}
                          >
                            View Details →
                          </Link>
                        )}

                        {!notification.isRead && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkAsRead(notification._id);
                            }}
                            className={`${UI.btnBase} ${UI.btnSm} ${UI.btnSecondary} ${UI.ring}`}
                          >
                            <FontAwesomeIcon icon={faCheck} className="w-4 h-4" />
                            Mark as read
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {filteredNotifications.length > 0 && (
          <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
            <p className="whitespace-nowrap rounded-lg bg-[#2e66a6]/10 px-3 py-2 text-sm font-bold text-[#2e66a6]">
              Page {safePage} of {totalPages} · {filteredNotifications.length} total
            </p>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <span className="whitespace-nowrap">Display per page</span>
                <select
                  value={pageSize}
                  onChange={(event) => setPageSize(event.target.value === 'all' ? 'all' : Number(event.target.value))}
                  className="h-11 rounded-xl border border-gray-200 bg-white px-3 outline-none focus:border-[#2e66a6]"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value="all">All</option>
                </select>
              </label>

              <nav className="inline-flex min-h-11 items-center overflow-hidden rounded-xl border border-gray-200 bg-white" aria-label="Notification pagination">
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={safePage === 1}
                  className="inline-flex h-11 items-center gap-1 border-r border-gray-200 px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <span aria-hidden="true">‹</span> Previous
                </button>

                <div className="flex h-11 items-center px-1">
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
                        aria-current={safePage === item ? 'page' : undefined}
                        className={`h-9 min-w-9 rounded-lg px-3 text-sm font-semibold transition ${
                          safePage === item
                            ? 'bg-[#2e66a6] text-white'
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
                  disabled={safePage === totalPages}
                  className="inline-flex h-11 items-center gap-1 border-l border-gray-200 px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next <span aria-hidden="true">›</span>
                </button>
              </nav>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;