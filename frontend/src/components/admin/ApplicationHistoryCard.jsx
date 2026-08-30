import React from "react";

const cn = (...classes) => classes.filter(Boolean).join(" ");

const Icon = ({ name, className = "h-4 w-4" }) => {
  const paths = {
    briefcase: <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 12h18" /></>,
    building: <><path d="M4 21V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v16M2 21h20M8 7h2m-2 4h2m-2 4h2m4-8h1m-1 4h1m-1 4h1" /></>,
    monitor: <><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8m-4-4v4" /></>,
    mapPin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4m8-4v4M3 10h18" /></>,
    eye: <><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="3" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  };
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
};

const formatDate = (value) => {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return "Not specified";
  return date.toLocaleDateString("en-PH", { month: "short", day: "2-digit", year: "numeric" });
};

const formatDateTime = (value) => {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return "Not specified";
  return date.toLocaleString("en-PH", { month: "short", day: "2-digit", year: "numeric", hour: "numeric", minute: "2-digit" });
};

const formatRelativeTime = (value) => {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return "Updated recently";
  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (minutes < 1) return "Updated just now";
  if (minutes < 60) return `Updated ${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Updated ${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `Updated ${days} day${days === 1 ? "" : "s"} ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `Updated ${weeks} week${weeks === 1 ? "" : "s"} ago`;
  const months = Math.floor(days / 30);
  return `Updated ${months} month${months === 1 ? "" : "s"} ago`;
};

const formatSalary = (job) => {
  if (job.hideSalary) return "Salary hidden";
  const minimum = Number(job.salaryMin);
  const maximum = Number(job.salaryMax);
  const money = (value) => `₱${value.toLocaleString("en-PH")}`;
  if (Number.isFinite(minimum) && Number.isFinite(maximum)) return `${money(minimum)}–${money(maximum)}`;
  if (Number.isFinite(minimum)) return `From ${money(minimum)}`;
  if (Number.isFinite(maximum)) return `Up to ${money(maximum)}`;
  return "Salary not specified";
};

const normalizeStage = (value) => String(value || "").replace(/\s+/g, " ").trim();
const isOfferStage = (value) => normalizeStage(value).toLowerCase().includes("offer");

export const getApplicationPresentation = (application = {}) => {
  const status = String(application.status || "pending").toLowerCase();
  const stage = normalizeStage(application.hiringStage);
  if (status === "hired") return { label: "Hired", progress: 100, description: "Offer accepted", color: "emerald", statusIcon: "clock" };
  if (status === "declined" || status === "vacancy full") return { label: "Declined", progress: 100, description: application.declineReason || (status === "vacancy full" ? "Position filled by another candidate" : "Application was not selected"), color: "rose", statusIcon: "clock" };
  if (status === "withdrawn" || status === "cancelled") return { label: status === "withdrawn" ? "Withdrawn" : "Cancelled", progress: 30, description: status === "withdrawn" ? "Withdrawn by applicant" : "Application cancelled", color: "slate", statusIcon: "clock" };
  if (status === "for interview") {
    if (isOfferStage(stage)) return { label: "Offered", progress: 90, description: "Job offer stage", color: "violet", statusIcon: "clock" };
    const progress = stage.toLowerCase().includes("final") ? 85 : application?.interviewSchedule?.scheduledAt ? 75 : 70;
    return { label: "For Interview", progress, description: stage || (application?.interviewSchedule?.scheduledAt ? "Interview scheduled" : "Interview stage"), color: "blue", statusIcon: "clock" };
  }
  if (application.reviewedAt || application.viewedAt || application.isViewedByEmployer) return { label: "Pending", progress: 40, description: "Resume under review", color: "blue", statusTextClass: "text-amber-600", statusIcon: "clock" };
  return { label: "Pending", progress: 25, description: "Application received", color: "blue", statusTextClass: "text-amber-600", statusIcon: "clock" };
};

const timelineTitle = (activity = {}) => {
  const type = String(activity.type || "").toLowerCase();
  const target = normalizeStage(activity.toStatus);
  if (type === "submitted") return "Application submitted";
  if (type === "reviewed") return "Resume under review";
  if (type === "hired" || target.toLowerCase() === "hired") return "Hired";
  if (type === "declined" || target.toLowerCase() === "declined") return "Declined";
  if (target.toLowerCase() === "for interview" || type === "interview") return target && target.toLowerCase() !== "for interview" ? target : "For Interview";
  return activity.title || activity.description || target || "Application updated";
};

export const buildApplicationTimeline = (application = {}, presentation = getApplicationPresentation(application)) => {
  const entries = Array.isArray(application.activityHistory)
    ? application.activityHistory.map((item, index) => ({ key: item._id || `${application._id}-${index}`, title: timelineTitle(item), date: item.occurredAt || item.createdAt || item.updatedAt })).filter((item) => item.date)
    : [];
  const add = (title, date, words) => {
    if (!date || entries.some((item) => words.some((word) => item.title.toLowerCase().includes(word)))) return;
    entries.push({ key: `${title}-${date}`, title, date });
  };
  add("Application submitted", application.appliedAt || application.createdAt, ["submitted", "received"]);
  add("Resume under review", application.viewedAt || application.reviewedAt, ["review"]);
  if (["For Interview", "Offered", "Hired", "Declined"].includes(presentation.label)) add("For Interview", application?.interviewSchedule?.setAt || application.reviewedAt || application.updatedAt, ["interview"]);
  if (application.hiringStage) add(application.hiringStage, application.updatedAt, [application.hiringStage.toLowerCase()]);
  if (["Hired", "Declined", "Withdrawn", "Cancelled"].includes(presentation.label)) add(presentation.label, application.updatedAt, [presentation.label.toLowerCase()]);
  return entries.sort((a, b) => new Date(b.date) - new Date(a.date));
};

const colorClasses = {
  blue: { text: "text-blue-600", bar: "bg-blue-500", logo: "bg-blue-600", chip: "bg-blue-50 text-blue-700" },
  amber: { text: "text-amber-600", bar: "bg-amber-500", logo: "bg-[#173b78]", chip: "bg-amber-50 text-amber-700" },
  emerald: { text: "text-emerald-600", bar: "bg-emerald-500", logo: "bg-sky-500", chip: "bg-emerald-50 text-emerald-700" },
  rose: { text: "text-rose-600", bar: "bg-rose-400", logo: "bg-fuchsia-600", chip: "bg-rose-50 text-rose-700" },
  violet: { text: "text-violet-600", bar: "bg-violet-500", logo: "bg-violet-600", chip: "bg-violet-50 text-violet-700" },
  slate: { text: "text-slate-600", bar: "bg-slate-400", logo: "bg-indigo-600", chip: "bg-slate-50 text-slate-700" },
};

const initials = (company) => company.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join("").toUpperCase() || "CO";

const ApplicationHistoryCard = ({ application, onView }) => {
  const job = application?.job || {};
  const profile = application?.employer?.employerProfile || {};
  const company = job.companyName || profile.companyName || "Company not specified";
  const title = job.title || job.jobTitle || "Job position";
  const location = job.location || job.address || profile.regionCity || "Location not specified";
  const logo = job.companyLogo || profile.companyLogo;
  const presentation = getApplicationPresentation(application);
  const colors = colorClasses[presentation.color] || colorClasses.blue;
  const timeline = buildApplicationTimeline(application, presentation).slice(0, 5);

  return (
    <article className="rounded-[18px] border border-[#d8e2ee] bg-white p-4 shadow-[0_2px_5px_rgba(15,23,42,0.08)] sm:p-5">
      <div className="flex items-start gap-3">
        <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[10px] text-[10px] font-bold text-white", colors.logo)}>
          {logo ? <img src={logo} alt={`${company} logo`} className="h-full w-full object-cover" /> : initials(company)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="text-sm font-bold text-black sm:text-base">{title}</h3>
            <span className={cn("inline-flex items-center gap-1 text-xs font-medium", presentation.statusTextClass || colors.text)}><Icon name={presentation.statusIcon} className="h-3.5 w-3.5" />{presentation.label}</span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#48617d]">
            <span className="inline-flex items-center gap-1"><Icon name="building" className="h-3.5 w-3.5 text-[#8ca2bb]" />{company}</span>
            <span className="text-[#c4d0dc]">|</span>
            <span className="inline-flex items-center gap-1"><Icon name="briefcase" className="h-3.5 w-3.5 text-[#8ca2bb]" />{job.industry || profile.industry || "Industry not specified"}</span>
            <span className="text-[#c4d0dc]">|</span>
            <span className="inline-flex min-w-0 items-center gap-1"><Icon name="mapPin" className="h-3.5 w-3.5 shrink-0 text-[#8ca2bb]" /><span className="truncate">{location}</span></span>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-[#243b55]">
        <span className="inline-flex items-center gap-1 rounded-full border border-[#d8e2ee] px-3 py-1.5"><Icon name="briefcase" className="h-3.5 w-3.5" />{job.jobType || job.employmentType || "Type not specified"}</span>
        <span className="inline-flex items-center gap-1 rounded-full border border-[#d8e2ee] px-3 py-1.5"><Icon name="monitor" className="h-3.5 w-3.5" />{job.workMode || "Setup not specified"}</span>
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1.5 text-blue-700"><span className="text-sm font-bold leading-none" aria-hidden="true">₱</span>{formatSalary(job)}</span>
        <span className="inline-flex items-center gap-1 rounded-full border border-[#d8e2ee] px-3 py-1.5"><Icon name="calendar" className="h-3.5 w-3.5" />Applied on {formatDateTime(application.appliedAt || application.createdAt)}</span>
      </div>

      <div className="mt-3 rounded-xl bg-[#f7f9fc] px-3 py-3">
        <div className="flex items-center justify-between gap-3 text-[11px]"><span className="font-medium text-[#243b55]">{presentation.description}</span><span className="font-semibold text-black">{presentation.progress}%</span></div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#dfe6ef]"><div className={cn("h-full rounded-full", colors.bar)} style={{ width: `${presentation.progress}%` }} /></div>
      </div>

      <div className="mt-3 rounded-xl border border-[#e5edf5] px-3 py-3">
        <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#6681a0]">Progress Timeline</p>
        <div className="mt-2 space-y-1.5">
          {(timeline.length ? timeline : [{ key: "submitted", title: "Application submitted", date: application.appliedAt || application.createdAt }]).map((item) => (
            <div key={item.key} className="flex items-center justify-between gap-4 text-[10px] sm:text-[11px]"><span className="text-[#243b55]">{item.title}</span><span className="shrink-0 text-[#8ca2bb]">{formatDate(item.date)}</span></div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1 text-[10px] text-[#6681a0]"><Icon name="clock" className="h-3 w-3" />{formatRelativeTime(application.updatedAt || application.reviewedAt || application.appliedAt || application.createdAt)}</span>
        <button type="button" onClick={onView} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-[#0057d9] transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"><Icon name="eye" className="h-3.5 w-3.5" />View Application</button>
      </div>
    </article>
  );
};

export default ApplicationHistoryCard;
