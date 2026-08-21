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
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(rawValue);
  const isUtcMidnight =
    deadline.getUTCHours() === 0 &&
    deadline.getUTCMinutes() === 0 &&
    deadline.getUTCSeconds() === 0 &&
    deadline.getUTCMilliseconds() === 0;

  if (isDateOnly || isUtcMidnight) {
    return Date.UTC(
      deadline.getUTCFullYear(),
      deadline.getUTCMonth(),
      deadline.getUTCDate(),
      15,
      59,
      59,
      999
    );
  }

  return deadline.getTime();
};

export const isOpenJobListing = (job, now = new Date()) => {
  if (!job) return false;
  if (isFalseValue(job.isPublished) || isFalseValue(job.isActive)) return false;
  if (isTrueValue(job.isArchived) || isTrueValue(job.isDeleted) || isTrueValue(job.deleted)) return false;
  if (isFalseValue(job.isAvailable)) return false;

  const status = normalizeStatus(job.status);
  if (HIDDEN_PUBLIC_JOB_STATUSES.has(status)) return false;

  const deadlineExpiryTime = getDeadlineExpiryTime(job.applicationDeadline);
  if (deadlineExpiryTime !== null && deadlineExpiryTime < now.getTime()) return false;

  return true;
};

export const filterOpenJobListings = (jobs, now = new Date()) =>
  (Array.isArray(jobs) ? jobs : []).filter((job) => isOpenJobListing(job, now));
