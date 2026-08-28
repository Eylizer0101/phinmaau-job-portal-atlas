import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
} from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';

import EmployerLayout from '../../../layouts/EmployerLayout';

const UI = {
  pageBg: 'bg-gray-50',
  container: 'mx-auto max-w-7xl px-1 py-8',
  shell: 'bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden',

  textPrimary: 'text-black',
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

  btnPrimary: 'bg-[#2e66a6] text-white hover:bg-[#25558a]',
  btnSecondary: 'bg-white text-black border border-gray-200 hover:bg-gray-50',
  btnSoft: 'bg-[#2e66a6]/10 text-[#2e66a6] hover:bg-[#2e66a6]/15 border border-[#2e66a6]/20',
  btnGhost: 'bg-transparent text-gray-700 hover:bg-gray-100',
  btnDangerGhost: 'bg-transparent text-red-600 hover:bg-red-50',

  badge: 'inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold border',
  badgeUnread: 'bg-[#2e66a6]/10 text-[#2e66a6] border-[#2e66a6]/20',
};

const EmployerNotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
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

    if (notification.link) {
      navigate(notification.link);
      return;
    }

    if (notification.type === 'new_application') navigate('/employer/applicants');
    else if (notification.type === 'new_message') navigate('/employer/messages');
    else if (notification.type === 'job_expiring') navigate('/employer/manage-jobs');
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
      case 'new_application':
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

  const getNotificationTone = (type, isUnread) => {
    if (!isUnread) return 'text-gray-600 bg-white border-gray-200';

    switch (type) {
      case 'new_application':
      case 'application_update':
        return 'text-[#2e66a6] bg-white border-[#2e66a6]/30';
      case 'new_message':
        return 'text-[#2e66a6] bg-white border-[#2e66a6]/30';
      case 'job_expiring':
        return 'text-[#2e66a6] bg-white border-[#2e66a6]/30';
      default:
        return 'text-[#2e66a6] bg-white border-[#2e66a6]/30';
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
    if (s === 'hired') return 'bg-white text-[#2e66a6] border-[#2e66a6]/30';
    if (s === 'for interview') return 'bg-white text-[#2e66a6] border-[#2e66a6]/30';
    if (s === 'declined') return 'bg-red-50 text-red-700 border-red-200';
    return 'bg-white text-black border-gray-200';
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
        notif.metadata?.status,
      ];

      return searchableValues.some((value) =>
        String(value || '').toLowerCase().includes(query)
      );
    });
  }, [notifications, filter, searchQuery]);

  const numericPageSize =
    pageSize === 'all' ? Math.max(filteredNotifications.length, 1) : Number(pageSize);
  const totalPages =
    pageSize === 'all'
      ? 1
      : Math.max(1, Math.ceil(filteredNotifications.length / numericPageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedNotifications =
    pageSize === 'all'
      ? filteredNotifications
      : filteredNotifications.slice(
          (safePage - 1) * numericPageSize,
          safePage * numericPageSize
        );

  const pageNumbers = useMemo(() => {
    const startPage = Math.max(1, Math.min(safePage - 2, totalPages - 4));
    const endPage = Math.min(totalPages, startPage + 4);
    return Array.from(
      { length: endPage - startPage + 1 },
      (_, index) => startPage + index
    );
  }, [safePage, totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchQuery, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const unreadInlineCount = unreadCount;

  return (
    <EmployerLayout>
      <div className={UI.pageBg}>
        <div className={UI.container}>
          <div className={`${UI.shell} p-5 sm:p-6 mb-6`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4 min-w-0">
                <div className="h-12 w-12 rounded-2xl bg-[#2e66a6] flex items-center justify-center flex-shrink-0">
                  <FontAwesomeIcon icon={faBell} className="w-6 h-6 text-white" />
                </div>

                <div className="min-w-0">
                  <h1 className={`${UI.h1} ${UI.textPrimary}`}>Notifications</h1>
                  <p className={`text-sm ${UI.textSecondary} mt-1`}>
                    Stay updated with applications, messages, interviews, and job alerts.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap justify-start sm:justify-end">
                {unreadCount > 0 && <span className={`${UI.badge} ${UI.badgeUnread}`}>{unreadCount} unread</span>}

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
            </div>
          </div>

          <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
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
                  <span className="ml-2 inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-xs bg-red-600 text-white border border-white/30">
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

            <div className="relative w-full lg:max-w-md">
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

          <div className={UI.shell}>
            {loading ? (
              <div className="p-12 text-center">
                <div className="h-12 w-12 rounded-full border-2 border-gray-200 border-t-[#2e66a6] animate-spin mx-auto" />
                <p className={`mt-4 ${UI.textMuted}`}>Loading notifications...</p>
              </div>
            ) : paginatedNotifications.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 mx-auto bg-white border border-gray-200 rounded-full flex items-center justify-center mb-4">
                  <FontAwesomeIcon icon={faBell} className="w-8 h-8 text-[#2e66a6]" />
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
                {paginatedNotifications.map((notification) => {
                  const isUnread = !notification.isRead;
                  const status = notification?.metadata?.newStatus || notification?.metadata?.status || '';

                  return (
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
                        isUnread ? 'bg-[#2e66a6]/[0.04]' : 'bg-white',
                        'hover:bg-gray-50',
                      ].join(' ')}
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className={`flex-shrink-0 w-10 h-10 rounded-lg border flex items-center justify-center transition-all duration-300 hover:scale-105 ${getNotificationTone(notification.type, isUnread)}`}
                        >
                          <FontAwesomeIcon icon={getNotificationIcon(notification.type)} className="w-4 h-4" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 min-w-0">
                                <h3 className="font-semibold text-black truncate">
                                  {notification.title || 'Notification'}
                                </h3>
                                {isUnread && (
                                  <span className="inline-flex w-2.5 h-2.5 bg-[#2e66a6] rounded-full flex-shrink-0" />
                                )}
                              </div>

                              <p className="mt-1 text-sm text-gray-700 leading-6">
                                {notification.message}
                              </p>

                              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                                <span>{formatTime(notification.createdAt)}</span>

                                {status ? (
                                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border font-semibold ${getStatusBadge(status)}`}>
                                    <FontAwesomeIcon icon={getStatusIcon(status)} className="w-3 h-3" />
                                    {getStatusLabel(status)}
                                  </span>
                                ) : null}

                                {notification?.metadata?.jobTitle ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full border bg-white text-[#2e66a6] border-[#2e66a6]/20 font-semibold">
                                    <FontAwesomeIcon icon={faBriefcase} className="w-3 h-3" />
                                    {notification.metadata.jobTitle}
                                  </span>
                                ) : null}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                              {!notification.isRead && (
                                <button
                                  type="button"
                                  onClick={() => handleMarkAsRead(notification._id)}
                                  className={`${UI.btnBase} ${UI.btnSm} ${UI.btnSoft} ${UI.ring}`}
                                  title="Mark as read"
                                >
                                  <FontAwesomeIcon icon={faCheck} className="w-3 h-3" />
                                  Read
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {filteredNotifications.length > 0 && (
            <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
              <p className="text-sm text-gray-500">
                Page {safePage} of {totalPages} · {filteredNotifications.length} total
              </p>

              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <nav className="inline-flex min-h-11 items-center overflow-hidden rounded-xl border border-gray-200 bg-white" aria-label="Notification pagination">
                  <button type="button" onClick={() => setCurrentPage(1)} disabled={safePage === 1} className="h-11 border-r border-gray-200 px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40">First</button>
                  <button type="button" onClick={() => setCurrentPage((pageNumber) => Math.max(1, pageNumber - 1))} disabled={safePage === 1} className="inline-flex h-11 items-center gap-1 border-r border-gray-200 px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"><span aria-hidden="true">‹</span> Previous</button>

                  <div className="flex h-11 items-center px-1">
                    {pageNumbers.map((pageNumber) => (
                      <button
                        key={pageNumber}
                        type="button"
                        onClick={() => setCurrentPage(pageNumber)}
                        aria-current={safePage === pageNumber ? 'page' : undefined}
                        className={`h-9 min-w-9 rounded-lg px-3 text-sm font-semibold transition ${safePage === pageNumber ? 'bg-[#2e66a6] text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                      >
                        {pageNumber}
                      </button>
                    ))}
                  </div>

                  <button type="button" onClick={() => setCurrentPage((pageNumber) => Math.min(totalPages, pageNumber + 1))} disabled={safePage === totalPages} className="inline-flex h-11 items-center gap-1 border-l border-gray-200 px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40">Next <span aria-hidden="true">›</span></button>
                  <button type="button" onClick={() => setCurrentPage(totalPages)} disabled={safePage === totalPages} className="h-11 border-l border-gray-200 px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40">Last</button>
                </nav>

                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <span className="whitespace-nowrap">Display per page</span>
                  <select
                    value={pageSize}
                    onChange={(event) => setPageSize(event.target.value === 'all' ? 'all' : Number(event.target.value))}
                    className="h-11 rounded-xl border border-gray-200 bg-white px-3 outline-none focus:border-[#2e66a6]"
                  >
                    <option value={10}>10</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value="all">All</option>
                  </select>
                </label>
              </div>
            </div>
          )}
        </div>
      </div>
    </EmployerLayout>
  );
};

export default EmployerNotificationsPage;
