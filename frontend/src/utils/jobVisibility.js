const HIDDEN_PUBLIC_JOB_STATUSES = new Set([
  "draft",
  "closed",
  "expired",
  "filled",
  "archived",
  "inactive",
  "declined",
  "rejected",
  "deleted",
  "unavailable",
]);

const normalizeStatus = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

const isFalseValue = (value) =>
  value === false || String(value || "").trim().toLowerCase() === "false";

const isTrueValue = (value) =>
  value === true || String(value || "").trim().toLowerCase() === "true";

const getDeadlineExpiryTime = (value) => {
  if (!value) return null;

  const deadline = new Date(value);
  if (Number.isNaN(deadline.getTime())) return null;

  const rawValue = String(value).trim();
  const dateMatch = rawValue.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const isUtcMidnight =
    deadline.getUTCHours() === 0 &&
    deadline.getUTCMinutes() === 0 &&
    deadline.getUTCSeconds() === 0 &&
    deadline.getUTCMilliseconds() === 0;

  if (dateMatch || isUtcMidnight) {
    const year = dateMatch ? Number(dateMatch[1]) : deadline.getUTCFullYear();
    const monthIndex = dateMatch ? Number(dateMatch[2]) - 1 : deadline.getUTCMonth();
    const day = dateMatch ? Number(dateMatch[3]) : deadline.getUTCDate();

    // A deadline date starts expiring at 12:00 AM in Asia/Manila (UTC+8).
    return Date.UTC(
      year,
      monthIndex,
      day - 1,
      16
    );
  }

  return deadline.getTime();
};

export const isOpenJobListing = (job, now = new Date()) => {
  if (!job) return false;
  if (!isTrueValue(job.isPublished) || !isTrueValue(job.isActive)) return false;
  if (isTrueValue(job.isArchived) || isTrueValue(job.isDeleted) || isTrueValue(job.deleted)) return false;
  if (isFalseValue(job.isAvailable)) return false;

  const status = normalizeStatus(job.status);
  if (HIDDEN_PUBLIC_JOB_STATUSES.has(status)) return false;

  const deadlineExpiryTime = getDeadlineExpiryTime(job.applicationDeadline);
  if (deadlineExpiryTime !== null && deadlineExpiryTime <= now.getTime()) return false;

  return true;
};

export const getJobPostingStatus = (job, now = new Date()) => {
  if (!job) return "unavailable";

  const status = normalizeStatus(job.status);
  if (status === "filled") return "filled";
  if (status === "draft") return "draft";
  if (isTrueValue(job.isArchived) || isTrueValue(job.isDeleted) || isTrueValue(job.deleted)) {
    return "unavailable";
  }

  if (
    status === "closed" ||
    isFalseValue(job.isPublished) ||
    isFalseValue(job.isActive) ||
    isFalseValue(job.isAvailable)
  ) {
    return "closed";
  }

  const deadlineExpiryTime = getDeadlineExpiryTime(job.applicationDeadline);
  if (deadlineExpiryTime !== null && deadlineExpiryTime <= now.getTime()) return "expired";

  return isOpenJobListing(job, now) ? "open" : "unavailable";
};


const formatRelativeLifecycleTime = (value, prefix, now = new Date()) => {
  if (!value) return `${prefix} recently`;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return `${prefix} recently`;

  const diffMs = Math.max(0, now.getTime() - date.getTime());
  const minute = 1000 * 60;
  const hour = minute * 60;
  const day = hour * 24;
  const week = day * 7;
  const month = day * 30;
  const year = day * 365;

  if (diffMs < minute) return `${prefix} just now`;
  if (diffMs < hour) {
    const minutes = Math.floor(diffMs / minute);
    return `${prefix} ${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }
  if (diffMs < day) {
    const hours = Math.floor(diffMs / hour);
    return `${prefix} ${hours} hour${hours === 1 ? "" : "s"} ago`;
  }
  if (diffMs < week) {
    const days = Math.floor(diffMs / day);
    return `${prefix} ${days} day${days === 1 ? "" : "s"} ago`;
  }
  if (diffMs < month) {
    const weeks = Math.floor(diffMs / week);
    return `${prefix} ${weeks} week${weeks === 1 ? "" : "s"} ago`;
  }
  if (diffMs < year) {
    const months = Math.floor(diffMs / month);
    return `${prefix} ${months} month${months === 1 ? "" : "s"} ago`;
  }

  const years = Math.floor(diffMs / year);
  return `${prefix} ${years} year${years === 1 ? "" : "s"} ago`;
};

const formatLifecycleDate = (value) => {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("en-PH", {
    month: "long",
    day: "numeric",
  });
};

export const formatJobLifecycleText = (job, now = new Date()) => {
  if (!job) return "";

  const postingStatus = getJobPostingStatus(job, now);

  if (postingStatus === "draft") {
    return `${formatRelativeLifecycleTime(job.createdAt, "Created", now)} and not yet published`;
  }

  const postedAt = job.publishedAt || job.createdAt;
  const postedText = formatRelativeLifecycleTime(postedAt, "Posted", now);

  if (postingStatus === "filled") {
    const filledDate = formatLifecycleDate(job.filledAt || job.updatedAt);
    return filledDate
      ? `${postedText} and position filled on ${filledDate}`
      : `${postedText} and position filled`;
  }

  if (postingStatus === "closed") {
    const closedDate = formatLifecycleDate(job.closedAt || job.updatedAt);
    return closedDate
      ? `${postedText} and closed on ${closedDate}`
      : `${postedText} and closed`;
  }

  if (postingStatus === "expired") {
    const expiredDate = formatLifecycleDate(job.applicationDeadline);
    return expiredDate
      ? `${postedText} and expired on ${expiredDate}`
      : `${postedText} and expired`;
  }

  const deadlineDate = formatLifecycleDate(job.applicationDeadline);

  if (postingStatus === "open" && job.deadlineExtendedAt && deadlineDate) {
    return `${postedText} and deadline extended until ${deadlineDate}`;
  }

  if (postingStatus === "open" && deadlineDate) {
    return `${postedText} and deadline of application is on ${deadlineDate}`;
  }

  return postedText;
};

export const filterOpenJobListings = (jobs, now = new Date()) =>
  (Array.isArray(jobs) ? jobs : []).filter((job) => isOpenJobListing(job, now));
