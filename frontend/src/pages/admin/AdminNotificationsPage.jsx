import React, { useCallback, useEffect, useRef, useState } from "react";
import { Bell, BriefcaseBusiness, Check, ChevronLeft, Clock3, FilePenLine, FileText, Mail, Search, UserRound } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../../services/api";
import Pagination from "../../components/shared/Pagination";


const AGAPAY_ADMIN_NOTIFICATIONS_FILTERS_KEY = "agapay:admin:notifications:filters";

const readAgapayAdminNotificationsFiltersState = () => {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.sessionStorage.getItem(AGAPAY_ADMIN_NOTIFICATIONS_FILTERS_KEY) || "{}");
  } catch {
    return {};
  }
};

const saveAgapayAdminNotificationsFiltersState = (value) => {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(AGAPAY_ADMIN_NOTIFICATIONS_FILTERS_KEY, JSON.stringify(value));
  } catch {
    // Keep the page usable even when session storage is unavailable.
  }
};

const formatNotificationTime = (value) => {
  if (!value) return "Just now";
  const date = new Date(value);
  const diff = Date.now() - date.getTime();

  if (Number.isNaN(diff)) return "Just now";

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return "Just now";
  if (diff < hour) return `${Math.floor(diff / minute)} minute${Math.floor(diff / minute) === 1 ? "" : "s"} ago`;
  if (diff < day) return `${Math.floor(diff / hour)} hour${Math.floor(diff / hour) === 1 ? "" : "s"} ago`;
  const days = Math.floor(diff / day);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};


const getNotificationId = (value) => {
  const resolvedValue = value?._id || value;
  return resolvedValue ? String(resolvedValue) : "";
};

const getAdminNotificationIcon = (notification = {}) => {
  const type = String(notification?.type || "").trim().toLowerCase();
  const title = String(notification?.title || "").trim().toLowerCase();
  const metadata = notification?.metadata || {};
  const adminCategory = String(metadata.adminCategory || "").trim().toLowerCase();

  if (type === "new_message" || title.includes("message")) {
    return Mail;
  }

  if (
    type === "new_application" ||
    type === "application_update" ||
    title.includes("application")
  ) {
    return FileText;
  }

  if (
    type === "job_expiring" ||
    title.includes("expiring") ||
    title.includes("deadline")
  ) {
    return Clock3;
  }

  if (
    type === "job_edit_request" ||
    title.includes("job edit request") ||
    title.includes("edit request")
  ) {
    return FilePenLine;
  }

  if (
    adminCategory === "new_job_posted" ||
    type === "job_match" ||
    title.includes("new job") ||
    title.includes("job posted")
  ) {
    return BriefcaseBusiness;
  }

  if (
    type.includes("verification") ||
    title.includes("verification") ||
    title.includes("registration") ||
    adminCategory === "new_registration"
  ) {
    return UserRound;
  }

  return Bell;
};

const getAdminNotificationLink = (notification) => {
  const metadata = notification?.metadata || {};
  const type = String(notification?.type || "").toLowerCase();
  const title = String(notification?.title || "").toLowerCase();
  const storedLink = String(notification?.link || "").trim();
  const relatedId = getNotificationId(notification?.relatedId);
  const relatedModel = String(notification?.relatedModel || "").toLowerCase();
  const accountType = String(metadata.accountType || metadata.userRole || "").toLowerCase();

  const requestId = getNotificationId(metadata.requestId);
  if (type === "job_edit_request" || title.includes("job edit request")) {
    return requestId
      ? `/admin/employer-job-edit-requests/${requestId}`
      : storedLink || "/admin/employer-job-edit-requests";
  }

  const isVerificationNotification =
    type.includes("verification") ||
    title.includes("verification") ||
    metadata.adminCategory === "new_registration";

  if (isVerificationNotification) {
    const employerId = getNotificationId(
      metadata.employerId ||
        (accountType === "employer" ? metadata.subjectUserId || metadata.userId || relatedId : "")
    );
    const jobseekerId = getNotificationId(
      metadata.jobseekerId ||
        (accountType === "jobseeker" ? metadata.subjectUserId || metadata.userId || relatedId : "")
    );

    if (employerId || storedLink.includes("/admin/employer-verification/")) {
      return employerId ? `/admin/employer-verification/${employerId}` : storedLink;
    }
    if (jobseekerId || storedLink.includes("/admin/jobseeker-verification/")) {
      return jobseekerId ? `/admin/jobseeker-verification/${jobseekerId}` : storedLink;
    }
  }

  const applicationId = getNotificationId(metadata.applicationId);
  if (applicationId || relatedModel === "application") {
    return `/admin/applications/${applicationId || relatedId}`;
  }

  const jobId = getNotificationId(metadata.jobId);
  if (metadata.adminCategory === "new_job_posted" || (relatedModel === "job" && type !== "job_edit_request")) {
    return jobId || relatedId ? `/admin/jobs/${jobId || relatedId}` : storedLink;
  }

  return storedLink;
};

const AdminNotificationsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const notificationBackPath = typeof location.state?.backPath === "string" &&
    location.state.backPath.startsWith("/admin/") &&
    !location.state.backPath.startsWith("/admin/notifications")
    ? location.state.backPath
    : "/admin/dashboard";
  const persistedFilterState = readAgapayAdminNotificationsFiltersState();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeFilter, setActiveFilter] = useState(() => persistedFilterState.activeFilter || "all");
  const [searchQuery, setSearchQuery] = useState(() => persistedFilterState.searchQuery || "");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(() => persistedFilterState.searchQuery || "");
  const [currentPage, setCurrentPage] = useState(() => Number(persistedFilterState.currentPage || 1));
  const [pageSize, setPageSize] = useState(() => persistedFilterState.pageSize || 10);
  const [totalNotifications, setTotalNotifications] = useState(0);

  useEffect(() => {
    saveAgapayAdminNotificationsFiltersState({ activeFilter, searchQuery, pageSize, currentPage });
  }, [activeFilter, searchQuery, pageSize, currentPage]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, 350);

    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get("/notifications", {
        params: {
          page: currentPage,
          limit: pageSize,
          filter: activeFilter,
          search: debouncedSearchQuery,
        },
      });

      const data = response.data || {};
      setNotifications(Array.isArray(data.notifications) ? data.notifications : []);
      setUnreadCount(Number(data.unreadCount || 0));
      setTotalNotifications(Number(data.total || 0));
    } catch (error) {
      console.error("Error fetching admin notifications:", error);
      setNotifications([]);
      setUnreadCount(0);
      setTotalNotifications(0);
    } finally {
      setLoading(false);
    }
  }, [activeFilter, currentPage, debouncedSearchQuery, pageSize]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const totalPages = pageSize === "all"
    ? 1
    : Math.max(1, Math.ceil(totalNotifications / Math.max(Number(pageSize) || 1, 1)));

  const paginatedNotifications = notifications;

  const hasInitializedPageFilters = useRef(false);
  useEffect(() => {
    if (!hasInitializedPageFilters.current) {
      hasInitializedPageFilters.current = true;
      return;
    }
    setCurrentPage(1);
  }, [activeFilter, debouncedSearchQuery, pageSize]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  const handleMarkAsRead = async (notificationId) => {
    if (!notificationId) return;

    try {
      await api.put(`/notifications/${notificationId}/read`);
      setNotifications((items) =>
        activeFilter === "unread"
          ? items.filter((item) => item._id !== notificationId)
          : items.map((item) => (item._id === notificationId ? { ...item, isRead: true } : item))
      );
      if (activeFilter === "unread") {
        setTotalNotifications((count) => Math.max(count - 1, 0));
      }
      setUnreadCount((count) => Math.max(count - 1, 0));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setActionLoading(true);
      await api.put("/notifications/mark-all-read");
      if (activeFilter === "unread") {
        setNotifications([]);
        setTotalNotifications(0);
      } else {
        setNotifications((items) => items.map((item) => ({ ...item, isRead: true })));
      }
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleClearAll = async () => {
    try {
      setActionLoading(true);
      await api.delete("/notifications/clear-all");
      setNotifications([]);
      setUnreadCount(0);
    } catch (error) {
      console.error("Error clearing notifications:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenNotification = async (notification) => {
    try {
      if (!notification?.isRead && notification?._id) {
        await api.put(`/notifications/${notification._id}/read`);
        setNotifications((items) =>
          activeFilter === "unread"
            ? items.filter((item) => item._id !== notification._id)
            : items.map((item) => (item._id === notification._id ? { ...item, isRead: true } : item))
        );
        if (activeFilter === "unread") {
          setTotalNotifications((count) => Math.max(count - 1, 0));
        }
        setUnreadCount((count) => Math.max(count - 1, 0));
      }

      const link = getAdminNotificationLink(notification);
      if (link) {
        navigate(link, {
          state: {
            backPath: "/admin/notifications",
            backLabel: "Notifications",
            returnTo: "/admin/notifications",
            fromNotification: true,
            backState: location.state || undefined,
          },
        });
      }
    } catch (error) {
      console.error("Error opening notification:", error);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-1 py-8">
      <div className="space-y-6">
        <div>
          <button
            type="button"
            onClick={() => navigate(notificationBackPath, { state: location.state?.reopenAdminNotifications ? location.state : undefined })}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-800 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#2e66a6]/20"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            Back
          </button>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#2e66a6] text-white">
                <Bell size={24} />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">Notifications</h1>
                <p className="mt-1 text-sm text-gray-600">
                  Review admin notifications, system activity, and account updates.
                </p>
              </div>
            </div>

            <div className="relative w-full sm:max-w-md">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search notifications..."
                className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-11 pr-4 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2e66a6]/25"
                aria-label="Search admin notifications"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex w-fit items-center rounded-2xl border border-gray-200 bg-white p-1 shadow-sm">
            {[
              { key: "all", label: "All" },
              { key: "unread", label: "Unread" },
              { key: "read", label: "Read" },
            ].map((filter) => (
              <button
                type="button"
                key={filter.key}
                onClick={() => setActiveFilter(filter.key)}
                className={`h-9 rounded-xl px-4 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#2e66a6]/20 ${
                  activeFilter === filter.key
                    ? "bg-[#2e66a6] text-white"
                    : "bg-transparent text-gray-700 hover:bg-gray-100"
                }`}
              >
                {filter.label}
                {filter.key === "unread" && unreadCount > 0 ? (
                  <span className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-xs">
                    {unreadCount}
                  </span>
                ) : null}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleMarkAllAsRead}
              disabled={unreadCount === 0 || actionLoading}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 text-sm font-semibold text-[#2e66a6] transition hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-[#2e66a6]/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Check size={16} />
              Mark all as read
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {loading ? null : paginatedNotifications.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center px-4 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                <Bell size={28} />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">No notifications</h2>
              <p className="mt-1 text-sm leading-6 text-gray-500">
                {activeFilter === "all"
                  ? "There are no notifications yet."
                  : activeFilter === "unread"
                    ? "You have no unread notifications."
                    : "You have no read notifications."}
              </p>
            </div>
          ) : (
            <div className={`divide-y divide-gray-100 ${pageSize === 10 ? "overflow-y-visible" : "max-h-[812px] overflow-y-auto overscroll-contain"}`}> 
              {paginatedNotifications.map((notification) => {
                const NotificationIcon = getAdminNotificationIcon(notification);

                return (
                <div
                  key={notification._id}
                  className={`flex items-start gap-4 px-5 py-5 transition hover:bg-gray-50 ${
                    !notification.isRead ? "bg-blue-50/70" : "bg-white"
                  }`}
                >
                  <span className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                    !notification.isRead ? "bg-blue-100 text-[#2e66a6]" : "bg-gray-100 text-gray-600"
                  }`}>
                    <NotificationIcon size={22} />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold leading-5 text-gray-900">
                          {notification.title}
                        </p>
                        <p className="mt-1 break-words text-sm leading-5 text-gray-700">
                          {notification.message}
                        </p>
                      </div>

                      <div className="ml-4 flex shrink-0 items-center gap-3 pt-1">
                        <span className="whitespace-nowrap text-xs font-medium text-gray-500">
                          {formatNotificationTime(notification.createdAt)}
                        </span>
                        {!notification.isRead ? (
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#2e66a6]" aria-label="Unread" />
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleOpenNotification(notification)}
                        className="text-sm font-semibold text-[#2e66a6] transition hover:text-[#1f4a7a] focus:outline-none focus:ring-2 focus:ring-[#2e66a6]/20"
                      >
                        View Details →
                      </button>

                      {!notification.isRead ? (
                        <button
                          type="button"
                          onClick={() => handleMarkAsRead(notification._id)}
                          className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-800 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#2e66a6]/20"
                        >
                          <Check size={16} />
                          Mark as read
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          )}

          {!loading && totalNotifications >= 10 ? (
            <Pagination
              currentPage={currentPage}
              totalItems={totalNotifications}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              isLoading={loading}
              ariaLabel="Admin notifications pagination"
            
                className="!min-h-[50px] !py-2"
              />
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default AdminNotificationsPage;
