import React, { useEffect, useMemo, useState } from "react";
import { Bell, Check, RefreshCw, Search, Trash2, UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import Pagination from "../../components/shared/Pagination";

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
  if (diff < day * 2) return "Yesterday";

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const getNotificationId = (value) => {
  const resolvedValue = value?._id || value;
  return resolvedValue ? String(resolvedValue) : "";
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
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await api.get("/notifications");
      const data = response.data || {};
      setNotifications(Array.isArray(data.notifications) ? data.notifications : []);
      setUnreadCount(Number(data.unreadCount || 0));
    } catch (error) {
      console.error("Error fetching admin notifications:", error);
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const filteredNotifications = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return notifications.filter((item) => {
      const matchesFilter =
        activeFilter === "unread" ? !item.isRead : activeFilter === "read" ? item.isRead : true;

      if (!matchesFilter) return false;
      if (!query) return true;

      return [item.title, item.message, item.type, item.metadata?.companyName, item.metadata?.jobTitle]
        .some((value) => String(value || "").toLowerCase().includes(query));
    });
  }, [activeFilter, notifications, searchQuery]);

  const numericPageSize = pageSize === "all" ? Math.max(filteredNotifications.length, 1) : Number(pageSize);
  const totalPages = pageSize === "all" ? 1 : Math.max(1, Math.ceil(filteredNotifications.length / numericPageSize));

  const paginatedNotifications = useMemo(() => {
    if (pageSize === "all") return filteredNotifications;
    const startIndex = (currentPage - 1) * numericPageSize;
    return filteredNotifications.slice(startIndex, startIndex + numericPageSize);
  }, [currentPage, filteredNotifications, numericPageSize, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter, searchQuery, pageSize]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  const handleMarkAllAsRead = async () => {
    try {
      setActionLoading(true);
      await api.put("/notifications/mark-all-read");
      setNotifications((items) => items.map((item) => ({ ...item, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteNotification = async (notification) => {
    if (!notification?._id) return;

    try {
      setActionLoading(true);
      await api.delete(`/notifications/${notification._id}`);
      setNotifications((items) => items.filter((item) => item._id !== notification._id));
      if (!notification.isRead) setUnreadCount((count) => Math.max(count - 1, 0));
    } catch (error) {
      console.error("Error deleting notification:", error);
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
          items.map((item) => (item._id === notification._id ? { ...item, isRead: true } : item))
        );
        setUnreadCount((count) => Math.max(count - 1, 0));
      }

      const link = getAdminNotificationLink(notification);
      if (link) {
        const navigationState = link.startsWith("/admin/jobs/")
          ? { backPath: "/admin/job-offers", backLabel: "Job Offers", fromNotification: true }
          : link.startsWith("/admin/applications/")
          ? { backPath: "/admin/applications", backLabel: "Applications", fromNotification: true }
          : link.startsWith("/admin/employer-job-edit-requests/")
          ? { backPath: "/admin/employer-job-edit-requests", backLabel: "Edit Requests", fromNotification: true }
          : undefined;

        navigate(link, navigationState ? { state: navigationState } : undefined);
      }
    } catch (error) {
      console.error("Error opening notification:", error);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-1 py-8">
      <div className="space-y-6">
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

            {notifications.length > 0 ? (
              <button
                type="button"
                onClick={handleClearAll}
                disabled={actionLoading}
                className="inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-red-600 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 size={16} />
                Clear all
              </button>
            ) : null}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {loading ? (
            <div className="flex h-64 flex-col items-center justify-center text-sm font-medium text-gray-500">
              <RefreshCw size={22} className="mb-3 animate-spin" />
              Loading notifications...
            </div>
          ) : filteredNotifications.length === 0 ? (
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
            <div className="divide-y divide-gray-100">
              {paginatedNotifications.map((notification) => (
                <div
                  key={notification._id}
                  className={`group flex items-start gap-4 px-5 py-5 transition hover:bg-gray-50 ${
                    !notification.isRead ? "bg-blue-50/70" : "bg-white"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleOpenNotification(notification)}
                    className="flex min-w-0 flex-1 items-start gap-4 text-left"
                  >
                    <span className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                      !notification.isRead ? "bg-blue-100 text-[#2e66a6]" : "bg-gray-100 text-gray-600"
                    }`}>
                      <UserRound size={22} />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold leading-5 text-gray-900">
                        {notification.title}
                      </span>
                      <span className="mt-1 block break-words text-sm leading-5 text-gray-700">
                        {notification.message}
                      </span>
                      <span className="mt-2 block text-xs font-medium text-gray-500">
                        {formatNotificationTime(notification.createdAt)}
                      </span>
                    </span>

                    {!notification.isRead ? (
                      <span className="mt-4 h-2.5 w-2.5 shrink-0 rounded-full bg-[#2e66a6]" aria-label="Unread" />
                    ) : null}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteNotification(notification)}
                    disabled={actionLoading}
                    className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-400 opacity-100 transition hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500/20 disabled:cursor-not-allowed disabled:opacity-50 sm:opacity-0 sm:group-hover:opacity-100"
                    aria-label="Delete notification"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {!loading ? (
            <Pagination
              currentPage={currentPage}
              totalItems={filteredNotifications.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              ariaLabel="Admin notifications pagination"
            />
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default AdminNotificationsPage;
