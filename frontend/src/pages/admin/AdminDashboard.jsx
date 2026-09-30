import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  CalendarDays,
  Clock3,
  ChevronDown,
  Download,
  Filter,
  RefreshCw,
  Repeat2,
  Building2,
  UserRoundMinus,
  X,
} from "lucide-react";
import api from "../../services/api";
import {
  FaAward,
  FaBookOpen,
  FaBriefcase,
  FaCheckCircle,
  FaFileAlt,
  FaFolderOpen,
  FaGraduationCap,
  FaListOl,
  FaListUl,
  FaPen,
  FaUniversity,
  FaUser,
  FaUserCheck,
  FaUsers,
  FaWaveSquare,
} from "../../components/shared/JobseekerIcons";


const numberFormat = new Intl.NumberFormat("en-US");

const dateOptions = [
  ["overall", "Overall"],
  ["today", "Today"],
  ["yesterday", "Yesterday"],
  ["thisWeek", "This Week"],
  ["lastWeek", "Last Week"],
  ["thisMonth", "This Month"],
  ["lastMonth", "Last Month"],
  ["thisYear", "This Year"],
  ["lastYear", "Last Year"],
  ["specific", "Specific Date"],
  ["range", "Date Range"],
];

const emptyAnalytics = {
  kpis: {
    totalUsers: 0,
    totalJobseekers: 0,
    totalEmployers: 0,
    totalRegisteredUsers: 0,
    totalJobPosts: 0,
    activeJobs: 0,
    applications: 0,
    hired: 0,
    hireRate: 0,
    pendingVerification: 0,
    pendingJobseekers: 0,
    pendingEmployers: 0,
    pendingEditRequests: 0,
    unreadMessages: 0,
    systemFailures: 0,
  },
  trends: [],
  filters: { options: {} },
  sections: {
    users: { roles: [], statuses: [], verification: [], campuses: [], genders: [], availabilities: [], relocation: [], experiences: [], educationLevels: [] },
    jobs: {
      statuses: [],
      categories: [],
      employmentTypes: [],
      workModes: [],
      totalVacancies: 0,
      totalViews: 0,
    },
    applications: {
      funnel: [],
      interviewRate: 0,
      hireRate: 0,
      employmentStatus: [],
      topHiringCompanies: [],
      applicationProcessDuration: { averageDays: 0, shortestDays: 0, longestDays: 0, buckets: [] },
      withdrawalByStage: [],
      applicationsBeforeHire: [],
      hireRateByCampus: [],
    },
    verification: {
      emailRequests: 0,
      emailVerified: 0,
      emailCompletionRate: 0,
      byRole: [],
    },
    operations: {
      editRequests: [],
      editRequestSections: [],
      employmentStatusRequestTypes: [],
      employmentStatusUpdates: [],
      messages: [],
      messageRead: [],
      conversationPreferences: [],
      notifications: [],
      notificationRead: [],
      system: {
        statuses: [],
        modules: [],
        methods: [],
        p95DurationMs: 0,
        serverErrors: 0,
      },
    },
  },
};

const initialFilters = {
  date: "overall",
  specificDate: "",
  startDate: "",
  endDate: "",
  campus: "",
  yearGraduated: "",
  course: "",
  gender: "",
};

const statCardImages = {
  users: "/images/admin_1.png",
  jobs: "/images/case.png",
  applications: "/images/admin_3.png",
  hired: "/images/admin_2.png",
  rate: "/images/admin_4.png",
  verification: "/images/admin_3.png",
  messages: "/images/admin_1.png",
  failures: "/images/case.png",
};

const colors = [
  "#2e66a6",
  "#16a36f",
  "#dc9300",
  "#6366f1",
  "#dc2626",
  "#64748b",
  "#0891b2",
];

const chartColorPalettes = [
  ["#2f6eaa", "#3f86bd", "#58a8cf"],
  ["#15966c", "#21ad7d", "#45c79a"],
  ["#cf870b", "#e29a19", "#f0b340"],
  ["#5f59cf", "#766fdc", "#9389e8"],
  ["#c93b43", "#dc4d55", "#ec6f76"],
  ["#64748b", "#7c8b9e", "#9aa8b8"],
  ["#1788a1", "#2ca5ba", "#58bfd0"],
];

const getChartGradient = (index = 0, angle = 180) => {
  const [start, middle, end] = chartColorPalettes[index % chartColorPalettes.length];
  return `linear-gradient(${angle}deg, ${start} 0%, ${middle} 55%, ${end} 100%)`;
};

const getChartShadow = (index = 0) => {
  const [, base] = chartColorPalettes[index % chartColorPalettes.length];
  return `0 2px 5px ${base}20`;
};

const getDonutStops = (rows = [], total = 0, colorMap = {}) => {
  let cursor = 0;
  const stops = [];

  rows.forEach((item, index) => {
    const value = Number(item?.value || 0);
    if (!value || !total) return;

    const start = cursor;
    cursor += (value / total) * 100;

    const color =
      colorMap[item.name] ||
      colors[index % colors.length];

    stops.push(`${color} ${start}% ${cursor}%`);
  });

  return stops;
};

const titleCase = (value) =>
  String(value || "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const HeaderStatusCard = ({ label, value, onClick, icon: Icon }) => (
  <button
    type="button"
    onClick={onClick}
    className="group relative flex h-[66px] min-w-[150px] items-center gap-3 rounded-2xl border border-slate-200/90 bg-white px-3.5 text-left shadow-[0_8px_24px_rgba(15,23,42,0.07)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#2e66a6]/30 hover:shadow-[0_12px_28px_rgba(46,102,166,0.14)]"
  >
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#2e66a6]/8 text-[#2e66a6] transition group-hover:bg-[#2e66a6]/12">
      {Icon ? <Icon size={19} /> : null}
    </span>
    <span className="min-w-0 pr-7">
      <span className="block whitespace-nowrap text-[10px] font-bold text-slate-700">{label}</span>
    </span>
    <span className="absolute right-3 top-2.5 flex h-6 min-w-9 items-center justify-center rounded-lg bg-[#2e66a6] px-2 text-[11px] font-extrabold leading-none text-white shadow-sm">
      {numberFormat.format(Number(value || 0))}
    </span>
  </button>
);

const StatCard = ({ label, value, suffix = "", imageSrc, onClick }) => {
  const content = (
    <>
      <div
        className="pointer-events-none absolute right-7 top-1/2 h-[56px] w-[56px] -translate-y-1/2 rounded-full blur-[30px]"
        style={{
          background:
            "radial-gradient(circle, rgba(255,255,255,.25) 0%, rgba(255,255,255,.14) 45%, transparent 75%)",
        }}
      />
      <img
        src={imageSrc}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute right-[-14px] top-1/2 h-16 w-16 -translate-y-1/2 object-contain opacity-50 mix-blend-soft-light saturate-150 transition-all duration-700 group-hover:right-[-12px] group-hover:scale-105"
        style={{
          WebkitMaskImage:
            "radial-gradient(circle at 35% 50%, #000 0%, rgba(0,0,0,.6) 55%, transparent 80%)",
          maskImage:
            "radial-gradient(circle at 35% 50%, #000 0%, rgba(0,0,0,.6) 55%, transparent 80%)",
        }}
      />
      <div className="relative z-10 flex min-h-[76px] flex-col justify-center text-left">
        <h3 className="text-[26px] font-semibold leading-none">
          {numberFormat.format(Number(value || 0))}
          {suffix}
        </h3>
        <p className="mt-2 flex items-center gap-1 whitespace-nowrap text-[13px] text-white/90">
          <span>{label}</span>
          {onClick ? <span className="ml-0.5 text-[15px] font-bold">&gt;</span> : null}
        </p>
      </div>
      <div className="pointer-events-none absolute inset-0 rounded-2xl border-2 border-transparent transition group-hover:border-white/20" />
    </>
  );

  const className = "group relative min-h-[104px] w-full overflow-hidden rounded-2xl bg-gradient-to-br from-[#072258] via-[#2d63a0] to-[#52b2db] px-4 py-3.5 text-left text-white shadow-[0_10px_30px_rgba(0,0,0,0.18)] transition-all duration-500 ease-out hover:brightness-105 hover:shadow-[0_20px_50px_rgba(0,0,0,0.25)]";

  if (!onClick) return <div className={className}>{content}</div>;

  return (
    <button type="button" onClick={onClick} className={`${className} hover:scale-[1.02]`}>
      {content}
    </button>
  );
};

const FilterSelect = ({
  label,
  value,
  onChange,
  values = [],
  allLabel = "All",
  placeholderLabel = "Select",
  disabled = false,
  preserveCase = false,
}) => (
  <label className="block min-w-0">
    <span className="mb-1 block text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500">
      {label}
    </span>
    <select
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none transition focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/20 disabled:bg-slate-50"
    >
      <option value="" disabled>{placeholderLabel}</option>
      <option value="all">{allLabel}</option>
      {values.map((item) => (
        <option key={item} value={item}>
          {preserveCase ? item : titleCase(item)}
        </option>
      ))}
    </select>
  </label>
);

const DateInput = ({ label, value, onChange }) => (
  <label className="block">
    <span className="mb-1 block text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500">
      {label}
    </span>
    <input
      type="date"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/20"
    />
  </label>
);

const formatDateInput = (date) => {
  if (!date) return "";
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return "";
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
};

const formatDateLabel = (value) => {
  if (!value) return "Select date";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "Select date";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
};

const addCalendarMonths = (date, amount) => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + amount);
  return next;
};

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const dummyMonthlyTrends = [
  { key: "2026-01", label: "January", registrations: 18, jobs: 11, applications: 32, hires: 6 },
  { key: "2026-02", label: "February", registrations: 22, jobs: 13, applications: 38, hires: 7 },
  { key: "2026-03", label: "March", registrations: 27, jobs: 15, applications: 44, hires: 9 },
  { key: "2026-04", label: "April", registrations: 24, jobs: 16, applications: 41, hires: 8 },
  { key: "2026-05", label: "May", registrations: 31, jobs: 18, applications: 49, hires: 11 },
  { key: "2026-06", label: "June", registrations: 36, jobs: 20, applications: 56, hires: 13 },
  { key: "2026-07", label: "July", registrations: 33, jobs: 19, applications: 52, hires: 12 },
  { key: "2026-08", label: "August", registrations: 40, jobs: 23, applications: 63, hires: 15 },
  { key: "2026-09", label: "September", registrations: 46, jobs: 27, applications: 71, hires: 18 },
  { key: "2026-10", label: "October", registrations: 42, jobs: 25, applications: 67, hires: 16 },
  { key: "2026-11", label: "November", registrations: 49, jobs: 29, applications: 76, hires: 20 },
  { key: "2026-12", label: "December", registrations: 54, jobs: 31, applications: 82, hires: 22 },
];

const getDummyFilterMultiplier = (filters = {}) => {
  const filterWeights = {
    campus: 0.72,
    verificationStatus: 0.8,
    jobStatus: 0.84,
    industry: 0.74,
    jobType: 0.78,
    workMode: 0.8,
    applicationStatus: 0.76,
    requestEditStatus: 0.9,
    yearGraduated: 0.84,
    course: 0.78,
    availability: 0.88,
    experience: 0.84,
    gender: 0.9,
    educationLevel: 0.82,
  };

  return Object.entries(filterWeights).reduce((multiplier, [key, weight]) => {
    const value = String(filters?.[key] || "all").toLowerCase();
    return value && value !== "all" ? multiplier * weight : multiplier;
  }, 1);
};

const getDummyTrendData = (filters = {}) => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const multiplier = getDummyFilterMultiplier(filters);

  let rows = dummyMonthlyTrends.map((item) => ({ ...item }));

  const pickMonth = (monthIndex) =>
    rows.filter((item) => Number(item.key.slice(5, 7)) - 1 === monthIndex);

  if (["today", "yesterday", "thisWeek", "lastWeek", "thisMonth"].includes(filters.date)) {
    rows = pickMonth(currentMonth);
  } else if (filters.date === "lastMonth") {
    rows = pickMonth((currentMonth + 11) % 12);
  } else if (filters.date === "specific" && filters.specificDate) {
    const specific = new Date(`${filters.specificDate}T00:00:00`);
    if (!Number.isNaN(specific.getTime()) && specific.getFullYear() === 2026) {
      rows = pickMonth(specific.getMonth());
    } else {
      rows = [];
    }
  } else if (filters.date === "range" && filters.startDate && filters.endDate) {
    const start = new Date(`${filters.startDate}T00:00:00`);
    const end = new Date(`${filters.endDate}T23:59:59`);
    rows = rows.filter((item) => {
      const rowDate = new Date(`${item.key}-01T00:00:00`);
      return rowDate >= start && rowDate <= end;
    });
  } else if (filters.date === "lastYear") {
    rows = rows.map((item) => ({
      ...item,
      key: item.key.replace("2026", String(currentYear - 1)),
      label: item.label,
    }));
  }

  return rows.map((item, index) => {
    const variation = 0.96 + (index % 4) * 0.025;
    const factor = multiplier * variation;

    return {
      ...item,
      registrations: Math.max(1, Math.round(item.registrations * factor)),
      jobs: Math.max(1, Math.round(item.jobs * factor)),
      applications: Math.max(1, Math.round(item.applications * factor)),
      hires: Math.max(1, Math.round(item.hires * factor)),
    };
  });
};


const dummyFilterOptions = {
  campuses: ["AU Main", "AU San Jose", "AU South"],
  applicationStatuses: ["pending", "screening", "for interview", "hired", "declined", "withdrawn"],
  jobTypes: ["Part Time", "Full Time", "Contractual", "Permanent"],
  workModes: ["Onsite", "Remote", "Hybrid / Blended"],
  industries: ["Information Technology", "Banking / Financial Services", "Education", "Retail", "Manufacturing", "Healthcare", "Hospitality", "Oil / Gas / Petroleum"],
  jobStatuses: ["published", "draft", "filled", "closed"],
  verificationStatuses: ["pending", "verified", "declined", "on hold"],
  requestEditStatuses: ["pending", "approved", "declined"],
  yearsGraduated: ["2026", "2025", "2024", "2023", "2022", "2021", "2020"],
  courses: ["BSIT", "BSCE", "BSCRIM", "BSBA", "BSA", "BSED", "BSN"],
  availabilities: ["Ready to Start", "Within a Few Days", "Within 1 Week", "Within 2 Weeks", "Within 1 Month"],
  experiences: ["No Experience", "< 1 Year", "1-3 Years", "4-5 Years", "6+ Years"],
  genders: ["Male", "Female", "Prefer Not to Say"],
  educationLevels: ["College Graduate", "Master's Degree", "Doctorate"],
};

const scaleDummyRows = (rows = [], multiplier = 1, selected = "") => {
  const cleanSelected = String(selected || "").trim().toLowerCase();
  const filtered = cleanSelected && cleanSelected !== "all"
    ? rows.filter((item) => String(item.name || "").trim().toLowerCase() === cleanSelected)
    : rows;

  return filtered.map((item, index) => ({
    ...item,
    value: Math.max(1, Math.round(Number(item.value || 0) * multiplier * (0.97 + (index % 3) * 0.025))),
  }));
};

const getDummyAnalytics = (filters = {}) => {
  const multiplier = Math.max(0.16, getDummyFilterMultiplier(filters));
  const scale = (value, minimum = 1) => Math.max(minimum, Math.round(Number(value || 0) * multiplier));

  const roles = scaleDummyRows([
    { name: "Employer", value: 64 },
    { name: "Jobseeker", value: 186 },
    { name: "Admin", value: 4 },
  ], multiplier);

  const verification = scaleDummyRows([
    { name: "Verified", value: 174 },
    { name: "Pending", value: 29 },
    { name: "On Hold", value: 17 },
    { name: "Declined", value: 12 },
  ], multiplier, filters.verificationStatus);

  const campuses = scaleDummyRows([
    { name: "AU Main", value: 92 },
    { name: "AU San Jose", value: 54 },
    { name: "AU South", value: 40 },
  ], multiplier, filters.campus);

  const genders = scaleDummyRows([
    { name: "Male", value: 103 },
    { name: "Female", value: 77 },
    { name: "Prefer Not to Say", value: 6 },
  ], multiplier, filters.gender);

  const availabilities = scaleDummyRows([
    { name: "Ready to Start", value: 48 },
    { name: "Within a Few Days", value: 42 },
    { name: "Within 1 Week", value: 38 },
    { name: "Within 2 Weeks", value: 31 },
    { name: "Within 1 Month", value: 27 },
  ], multiplier, filters.availability);

  const relocation = scaleDummyRows([
    { name: "Yes", value: 105 },
    { name: "Open to Discuss", value: 55 },
    { name: "No", value: 26 },
  ], multiplier);

  const experiences = scaleDummyRows([
    { name: "No Experience", value: 28 },
    { name: "< 1 Year", value: 39 },
    { name: "1-3 Years", value: 58 },
    { name: "4-5 Years", value: 37 },
    { name: "6+ Years", value: 24 },
  ], multiplier, filters.experience);

  const educationLevels = scaleDummyRows([
    { name: "College Graduate", value: 137 },
    { name: "Master's Degree", value: 34 },
    { name: "Doctorate", value: 15 },
  ], multiplier, filters.educationLevel);

  const jobStatuses = scaleDummyRows([
    { name: "Published", value: 52 },
    { name: "Draft", value: 18 },
    { name: "Filled", value: 24 },
    { name: "Closed", value: 13 },
  ], multiplier, filters.jobStatus);

  const industries = scaleDummyRows([
    { name: "Information Technology", value: 31 },
    { name: "Banking / Financial Services", value: 24 },
    { name: "Education", value: 19 },
    { name: "Retail", value: 16 },
    { name: "Manufacturing", value: 14 },
    { name: "Healthcare", value: 12 },
  ], multiplier, filters.industry);

  const employmentTypes = scaleDummyRows([
    { name: "Part Time", value: 18 },
    { name: "Full Time", value: 72 },
    { name: "Contractual", value: 11 },
    { name: "Permanent", value: 9 },
  ], multiplier, filters.jobType);

  const workModes = scaleDummyRows([
    { name: "Onsite", value: 58 },
    { name: "Remote", value: 21 },
    { name: "Hybrid / Blended", value: 31 },
  ], multiplier, filters.workMode);

  const funnel = scaleDummyRows([
    { name: "Pending", value: 128 },
    { name: "Screening", value: 91 },
    { name: "For Interview", value: 56 },
    { name: "Hired", value: 34 },
    { name: "Declined", value: 29 },
    { name: "Withdrawn", value: 14 },
  ], multiplier, filters.applicationStatus);

  const topHiringCompanies = scaleDummyRows([
    { name: "BDO Unibank", value: 18 },
    { name: "SM Corporation", value: 15 },
    { name: "Jollibee Foods Corporation", value: 13 },
    { name: "Petron Corporation", value: 10 },
    { name: "McDonald's", value: 8 },
  ], multiplier);

  const employmentStatus = scaleDummyRows([
    { name: "Inactive", value: 20 },
    { name: "Active", value: 8 },
  ], multiplier);

  const durationBuckets = scaleDummyRows([
    { name: "< 1 week", value: 18 },
    { name: "1-2 weeks", value: 31 },
    { name: "2-4 weeks", value: 25 },
    { name: "1-2 months", value: 16 },
    { name: "> 2 months", value: 8 },
  ], multiplier);

  const withdrawalByStage = scaleDummyRows([
    { name: "Pending", value: 11 },
    { name: "For Interview", value: 7 },
  ], multiplier);

  const applicationsBeforeHire = scaleDummyRows([
    { name: "1 time", value: 45 },
    { name: "2 times", value: 25 },
    { name: "3 times", value: 15 },
    { name: "4+ times", value: 10 },
  ], multiplier);

  const hireRateByCampusBase = [
    { name: "AU Main", value: 85, hired: 34, total: 40 },
    { name: "AU South", value: 75, hired: 24, total: 32 },
    { name: "AU San Jose", value: 67, hired: 18, total: 27 },
  ];
  const selectedCampus = String(filters.campus || "").toLowerCase();
  const hireRateByCampus = hireRateByCampusBase
    .filter((item) => !selectedCampus || selectedCampus === "all" || item.name.toLowerCase() === selectedCampus)
    .map((item) => ({ ...item, hired: scale(item.hired), total: scale(item.total) }));

  const editRequests = scaleDummyRows([
    { name: "Pending", value: 14 },
    { name: "Approved", value: 33 },
    { name: "Declined", value: 8 },
  ], multiplier, filters.requestEditStatus);

  const editRequestSections = scaleDummyRows([
    { name: "Job Description", value: 17 },
    { name: "Qualifications", value: 13 },
    { name: "Salary", value: 10 },
    { name: "Skills & Benefits", value: 8 },
    { name: "Work Locations", value: 7 },
  ], multiplier);

  const employmentStatusRequestTypes = [
    { name: "Contract Ended", value: scale(12) },
    { name: "Employment Ended", value: scale(8) },
  ];

  const employmentStatusUpdates = [
    { name: "Pending", value: scale(5) },
    { name: "Approved", value: scale(5) },
    { name: "Declined", value: scale(1) },
    { name: "No Response", value: scale(0, 0) },
  ];

  const messages = scaleDummyRows([
    { name: "Text", value: 196 },
    { name: "Image", value: 44 },
    { name: "File", value: 18 },
  ], multiplier);

  const notifications = scaleDummyRows([
    { name: "Job Match", value: 136 },
    { name: "System", value: 57 },
    { name: "New Application", value: 49 },
    { name: "Verification", value: 32 },
    { name: "Application Update", value: 25 },
    { name: "Interview", value: 18 },
  ], multiplier);

  const modules = scaleDummyRows([
    { name: "Authentication", value: 388 },
    { name: "Profile", value: 160 },
    { name: "Applications", value: 78 },
    { name: "Job Management", value: 43 },
    { name: "Verification", value: 18 },
    { name: "Company", value: 13 },
  ], multiplier);

  const totalJobseekers = scale(186);
  const totalEmployers = scale(64);
  const applications = scale(352);
  const hired = scale(34);
  const totalUsers = totalJobseekers + totalEmployers + scale(4);

  return {
    generatedAt: new Date().toISOString(),
    kpis: {
      totalUsers,
      totalJobseekers,
      totalEmployers,
      totalRegisteredUsers: totalJobseekers + totalEmployers,
      totalJobPosts: scale(110),
      activeJobs: scale(52),
      applications,
      hired,
      hireRate: applications ? Number(((hired / applications) * 100).toFixed(1)) : 0,
      pendingVerification: scale(29),
      pendingJobseekers: scale(18),
      pendingEmployers: scale(11),
      pendingEditRequests: scale(14),
      unreadMessages: scale(63),
      systemFailures: scale(4, 0),
    },
    trends: getDummyTrendData(filters),
    filters: { options: dummyFilterOptions },
    sections: {
      users: { roles, statuses: scaleDummyRows([{ name: "Active", value: 224 }, { name: "Inactive", value: 18 }, { name: "Suspended", value: 5 }, { name: "Pending", value: 7 }], multiplier), verification, campuses, genders, availabilities, relocation, experiences, educationLevels },
      jobs: { statuses: jobStatuses, categories: industries, industries, employmentTypes, workModes, totalVacancies: scale(164), totalViews: scale(7840) },
      applications: {
        funnel, interviewRate: 15.9, hireRate: applications ? Number(((hired / applications) * 100).toFixed(1)) : 0, employmentStatus, topHiringCompanies,
        applicationProcessDuration: { averageDays: 24, shortestDays: 4, longestDays: 76, buckets: durationBuckets },
        withdrawalByStage, applicationsBeforeHire, hireRateByCampus,
      },
      verification: { emailRequests: scale(73), emailVerified: scale(61), emailCompletionRate: 83.6, byRole: verification },
      operations: {
        editRequests, editRequestSections, employmentStatusRequestTypes, employmentStatusUpdates, messages,
        messageRead: scaleDummyRows([{ name: "Read", value: 195 }, { name: "Unread", value: 63 }], multiplier),
        conversationPreferences: scaleDummyRows([{ name: "Enabled", value: 74 }, { name: "Muted", value: 16 }], multiplier),
        notifications, notificationRead: scaleDummyRows([{ name: "Read", value: 271 }, { name: "Unread", value: 46 }], multiplier),
        system: { statuses: scaleDummyRows([{ name: "Success", value: 654 }, { name: "Failed", value: 69 }], multiplier), modules, methods: scaleDummyRows([{ name: "GET", value: 442 }, { name: "POST", value: 201 }, { name: "PATCH", value: 58 }, { name: "DELETE", value: 22 }], multiplier), p95DurationMs: 4012, serverErrors: scale(4, 0) },
      },
    },
  };
};

const getYearOptions = () => {
  const firstYear = 1950;
  const currentYear = new Date().getFullYear();
  return Array.from(
    { length: currentYear - firstYear + 1 },
    (_, index) => currentYear - index,
  );
};

const CalendarMonth = ({
  monthDate,
  startDate,
  endDate,
  onPickDate,
  onChangeMonth,
}) => {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const gridStart = new Date(year, month, 1 - firstDay.getDay());
  const start = startDate ? new Date(`${startDate}T00:00:00`) : null;
  const end = endDate ? new Date(`${endDate}T00:00:00`) : null;
  const days = Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + index);
    return day;
  });

  const sameDay = (first, second) =>
    first && second && first.toDateString() === second.toDateString();
  const withinRange = (day) => start && end && day >= start && day <= end;

  return (
    <div className="min-w-0 flex-1">
      <div className="mb-3 grid grid-cols-[34px_1fr_34px] items-center gap-2">
        <button
          type="button"
          onClick={() => onChangeMonth(addCalendarMonths(monthDate, -1))}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-xl text-slate-600 transition hover:bg-slate-100"
          aria-label="Previous month"
        >
          ‹
        </button>
        <div className="grid grid-cols-[1fr_82px] gap-2">
          <select
            value={month}
            onChange={(event) =>
              onChangeMonth(new Date(year, Number(event.target.value), 1))
            }
            className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-center text-xs font-bold text-[#2e66a6] outline-none focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/20"
            aria-label="Select month"
          >
            {monthNames.map((name, index) => (
              <option key={name} value={index}>
                {name}
              </option>
            ))}
          </select>
          <select
            value={year}
            onChange={(event) =>
              onChangeMonth(new Date(Number(event.target.value), month, 1))
            }
            className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-center text-xs font-bold text-[#2e66a6] outline-none focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/20"
            aria-label="Select year"
          >
            {getYearOptions().map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={() => onChangeMonth(addCalendarMonths(monthDate, 1))}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-xl text-slate-600 transition hover:bg-slate-100"
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 text-center text-[10px] font-bold uppercase text-slate-400">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-y-1 text-center text-xs">
        {days.map((day) => {
          const value = formatDateInput(day);
          const outside = day.getMonth() !== month;
          const selected = sameDay(day, start) || sameDay(day, end);
          const ranged = withinRange(day);
          return (
            <button
              type="button"
              key={value}
              onClick={() => onPickDate(value)}
              className={`mx-auto flex h-8 w-full items-center justify-center transition ${outside ? "text-slate-300" : "text-slate-700"} ${ranged ? "bg-[#2e66a6]/10 text-[#2e66a6]" : ""} ${selected ? "rounded-lg bg-[#2e66a6] font-bold text-white shadow-sm" : "rounded-md hover:bg-[#2e66a6]/10"}`}
              aria-label={formatDateLabel(value)}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const CustomDateRangeModal = ({
  open,
  startDate,
  endDate,
  onCancel,
  onApply,
}) => {
  const today = formatDateInput(new Date());
  const [draftStart, setDraftStart] = useState(startDate || today);
  const [draftEnd, setDraftEnd] = useState(endDate || today);
  const [leftMonth, setLeftMonth] = useState(
    new Date(`${startDate || today}T00:00:00`),
  );
  const [rightMonth, setRightMonth] = useState(
    addCalendarMonths(new Date(`${endDate || today}T00:00:00`), 1),
  );
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const nextStart = startDate || today;
    const nextEnd = endDate || today;
    setDraftStart(nextStart);
    setDraftEnd(nextEnd);
    setLeftMonth(new Date(`${nextStart}T00:00:00`));
    setRightMonth(addCalendarMonths(new Date(`${nextEnd}T00:00:00`), 1));
    const previousOverflow = document.body.style.overflow;
    previousFocusRef.current = document.activeElement;
    document.body.style.overflow = "hidden";
    const focusTimer = setTimeout(() => closeRef.current?.focus(), 0);
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onCancel();
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll(
        'button:not([disabled]), select:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      }
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      previousFocusRef.current?.focus?.();
    };
    // onCancel is intentionally omitted because the parent supplies an inline close handler.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, startDate, endDate, today]);

  if (!open) return null;

  const pickDate = (value) => {
    if (!draftStart || draftEnd) {
      setDraftStart(value);
      setDraftEnd("");
    } else if (
      new Date(`${value}T00:00:00`) < new Date(`${draftStart}T00:00:00`)
    ) {
      setDraftEnd(draftStart);
      setDraftStart(value);
    } else {
      setDraftEnd(value);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/65 px-3 py-5 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="analytics-date-range-title"
        className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4">
          <div>
            <h2
              id="analytics-date-range-title"
              className="text-base font-bold text-slate-900"
            >
              Select Date Range
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Choose the starting and ending dates for the analytics report.
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onCancel}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2e66a6]/25"
            aria-label="Close date range modal"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-3 bg-slate-50/80 px-5 py-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <span className="block text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
              Start Date
            </span>
            <span className="mt-1 flex items-center gap-2 text-sm font-bold text-[#2e66a6]">
              <CalendarDays size={16} />
              {formatDateLabel(draftStart)}
            </span>
          </div>
          <span className="hidden text-lg text-slate-400 sm:block">→</span>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <span className="block text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
              End Date
            </span>
            <span className="mt-1 flex items-center gap-2 text-sm font-bold text-[#2e66a6]">
              <CalendarDays size={16} />
              {formatDateLabel(draftEnd)}
            </span>
          </div>
        </div>

        <div className="grid gap-7 px-5 py-5 md:grid-cols-2">
          <CalendarMonth
            monthDate={leftMonth}
            startDate={draftStart}
            endDate={draftEnd}
            onPickDate={pickDate}
            onChangeMonth={setLeftMonth}
          />
          <CalendarMonth
            monthDate={rightMonth}
            startDate={draftStart}
            endDate={draftEnd}
            onPickDate={pickDate}
            onChangeMonth={setRightMonth}
          />
        </div>

        <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-slate-100 bg-white px-5 py-4">
          <button
            type="button"
            onClick={onCancel}
            className="h-10 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() =>
              draftStart && draftEnd && onApply(draftStart, draftEnd)
            }
            disabled={!draftStart || !draftEnd}
            className="h-10 rounded-xl bg-[#2e66a6] px-6 text-sm font-bold text-white shadow-md shadow-[#2e66a6]/20 transition hover:bg-[#255487] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Apply Range
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

const SpecificDateModal = ({ open, value, onCancel, onApply }) => {
  const today = formatDateInput(new Date());
  const [draftDate, setDraftDate] = useState(value || today);
  const [monthDate, setMonthDate] = useState(new Date(`${value || today}T00:00:00`));

  useEffect(() => {
    if (!open) return;
    const next = value || today;
    setDraftDate(next);
    setMonthDate(new Date(`${next}T00:00:00`));
  }, [open, value, today]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/65 px-3 py-5 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Select Specific Date</h2>
            <p className="mt-0.5 text-xs text-slate-500">Choose one date for the analytics report.</p>
          </div>
          <button type="button" onClick={onCancel} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Close specific date modal">
            <X size={18} />
          </button>
        </div>
        <div className="bg-slate-50/80 px-5 py-4">
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <span className="block text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">Selected Date</span>
            <span className="mt-1 flex items-center gap-2 text-sm font-bold text-[#2e66a6]">
              <CalendarDays size={16} />
              {formatDateLabel(draftDate)}
            </span>
          </div>
        </div>
        <div className="px-5 py-5">
          <CalendarMonth
            monthDate={monthDate}
            startDate={draftDate}
            endDate={draftDate}
            onPickDate={setDraftDate}
            onChangeMonth={setMonthDate}
          />
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-5 py-4">
          <button type="button" onClick={onCancel} className="h-10 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
          <button type="button" onClick={() => draftDate && onApply(draftDate)} className="h-10 rounded-xl bg-[#2e66a6] px-6 text-sm font-bold text-white shadow-md shadow-[#2e66a6]/20 hover:bg-[#255487]">Apply Date</button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

const DateFilterDropdown = ({
  value,
  specificDate,
  startDate,
  endDate,
  onSelect,
  disabled,
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const selectedLabel =
    value === "specific" && specificDate
      ? formatDateLabel(specificDate)
      : value === "range" && startDate && endDate
        ? `${formatDateLabel(startDate)} – ${formatDateLabel(endDate)}`
        : dateOptions.find(([optionValue]) => optionValue === value)?.[1] ||
          "Overall";

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    };
    const closeWithEscape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", close);
    window.addEventListener("keydown", closeWithEscape);
    return () => {
      window.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", closeWithEscape);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative min-w-0">
      <span className="mb-1 block text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500">
        Date Range
      </span>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className="flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 text-left text-xs font-semibold text-slate-700 outline-none transition hover:bg-slate-50 focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/20 disabled:bg-slate-50"
        aria-expanded={open}
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-slate-400 transition ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open ? (
        <div className="absolute left-0 top-[48px] z-40 w-56 rounded-xl border border-slate-100 bg-white p-2 shadow-xl">
          {dateOptions.map(([optionValue, label]) => (
            <button
              type="button"
              key={optionValue}
              onClick={() => {
                setOpen(false);
                onSelect(optionValue);
              }}
              className={`w-full rounded-lg px-3 py-2 text-left text-xs font-semibold transition ${value === optionValue ? "bg-[#2e66a6]/10 text-[#2e66a6]" : "text-slate-600 hover:bg-slate-50"}`}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
};

const ChartCard = ({
  title,
  subtitle,
  children,
  className = "",
  icon: Icon = Activity,
}) => (
  <section
    className={`min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}
  >
    <div className="mb-3 flex items-start gap-2 border-b border-slate-100 pb-3">
      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2e66a6] text-white shadow-sm">
        <Icon size={17} />
      </span>
      <div className="min-w-0">
        <h2 className="text-sm font-bold text-slate-800">{title}</h2>
        {subtitle ? (
          <p className="mt-0.5 text-[11px] text-slate-500">{subtitle}</p>
        ) : null}
      </div>
    </div>
    {children}
  </section>
);

const EmptyChart = () => (
  <div className="flex h-32 items-center justify-center rounded-xl bg-slate-50 text-xs font-medium text-slate-400">
    No data for the selected filters.
  </div>
);

const HorizontalBars = ({ data = [], maxItems = 8, percentage = false, centered = false }) => {
  const rows = data.slice(0, maxItems);
  const max = Math.max(1, ...rows.map((item) => Number(item.value || 0)));
  if (!rows.length) return <EmptyChart />;
  return (
    <div className={`${centered ? "flex min-h-40 flex-col justify-center" : ""} space-y-2.5`}>
      {rows.map((item, index) => (
        <div
          key={`${item.name}-${index}`}
          className="grid grid-cols-[minmax(90px,140px)_1fr_auto] items-center gap-3 text-xs"
        >
          <span
            className="truncate text-right font-semibold text-slate-600"
            title={titleCase(item.name)}
          >
            {titleCase(item.name)}
          </span>
          <div className="h-6 overflow-hidden rounded-md bg-slate-100">
            <div
              className="h-full min-w-[3px] rounded-lg transition-all"
              style={{
                width: `${Math.max(2, (Number(item.value || 0) / max) * 100)}%`,
                backgroundImage: getChartGradient(index, 180),
                boxShadow: getChartShadow(index),
                border: "1px solid rgba(15,23,42,.035)",
              }}
            />
          </div>
          <span className="w-10 text-right font-bold text-slate-700">
            {numberFormat.format(Number(item.value || 0))}
            {percentage ? "%" : ""}
          </span>
        </div>
      ))}
    </div>
  );
};

const VerticalBars = ({ data = [], maxItems = 6, percentage = false }) => {
  const rows = data.slice(0, maxItems);
  const max = Math.max(1, ...rows.map((item) => Number(item.value || 0)));
  if (!rows.length) return <EmptyChart />;
  return (
    <div className="grid min-h-48 items-end gap-3" style={{ gridTemplateColumns: `repeat(${rows.length}, minmax(0, 1fr))` }}>
      {rows.map((item, index) => {
        const value = Number(item.value || 0);
        return (
          <div key={`${item.name}-${index}`} className="flex min-w-0 flex-col items-center justify-end gap-2">
            <span className="text-[11px] font-bold text-slate-700">{numberFormat.format(value)}{percentage ? "%" : ""}</span>
            <div className="flex h-32 w-full items-end justify-center rounded-lg bg-slate-50 px-2 pt-2">
              <div
                className="w-full max-w-[54px] rounded-t-lg transition-all"
                style={{
                  height: `${Math.max(4, (value / max) * 100)}%`,
                  backgroundImage: getChartGradient(index, 180),
                  boxShadow: getChartShadow(index),
                  border: "1px solid rgba(15,23,42,.035)",
                }}
              />
            </div>
            <span className="min-h-[32px] text-center text-[10px] font-semibold leading-4 text-slate-600" title={titleCase(item.name)}>
              {titleCase(item.name)}
            </span>
          </div>
        );
      })}
    </div>
  );
};

const DonutChart = ({ data = [], showPercentage = false }) => {
  const rows = data.filter((item) => Number(item.value || 0) > 0);
  const total = rows.reduce((sum, item) => sum + Number(item.value || 0), 0);
  if (!rows.length || !total) return <EmptyChart />;
  const stops = getDonutStops(rows, total);
  return (
    <div className="flex min-h-40 flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6">
      <div
        className="relative mx-auto h-32 w-32 overflow-hidden rounded-full"
        style={{
          background: `conic-gradient(${stops.join(",")})`,
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,.32), 0 5px 12px rgba(15,23,42,.10)",
          filter: "saturate(1.04)",
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,.18) 0%, rgba(255,255,255,.04) 46%, rgba(15,23,42,.08) 100%)",
            WebkitMaskImage:
              "radial-gradient(circle, transparent 0 46%, #000 47% 100%)",
            maskImage:
              "radial-gradient(circle, transparent 0 46%, #000 47% 100%)",
          }}
        />
        <div className="absolute inset-6 flex flex-col items-center justify-center rounded-full bg-white shadow-[inset_0_1px_2px_rgba(15,23,42,.05)]">
          <span className="text-2xl font-extrabold text-slate-800">
            {numberFormat.format(total)}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
            Total
          </span>
        </div>
      </div>
      <div className="w-full max-w-[285px] rounded-xl border border-slate-200 bg-white p-3.5 shadow-md shadow-slate-200/60">
        <div className="space-y-2">
          {rows.slice(0, 8).map((item, index) => {
            const value = Number(item.value || 0);
            const percentage = total ? Math.round((value / total) * 100) : 0;

            return (
              <div
                key={item.name}
                className="grid grid-cols-[minmax(0,1fr)_44px_54px] items-center gap-2 rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2 text-xs"
              >
                <span className="flex min-w-0 items-center gap-2 text-slate-600">
                  <i
                    className="h-2.5 w-2.5 shrink-0 rounded-sm"
                    style={{ backgroundColor: colors[index % colors.length] }}
                  />
                  <span className="truncate">{titleCase(item.name)}</span>
                </span>

                <strong className="text-center text-slate-800">
                  {numberFormat.format(value)}
                </strong>

                {showPercentage ? (
                  <span className="text-center font-normal text-slate-500">
                    ({percentage}%)
                  </span>
                ) : (
                  <span />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};


const EmploymentRequestDonut = ({ data = [], colorMap = {} }) => {
  const rows = Array.isArray(data) ? data : [];
  const total = rows.reduce((sum, item) => sum + Number(item?.value || 0), 0);
  const positiveRows = rows.filter((item) => Number(item?.value || 0) > 0);

  if (!rows.length) return <EmptyChart />;

  const stops = getDonutStops(positiveRows, total, colorMap);

  const donutBackground = total && stops.length
    ? `conic-gradient(${stops.join(",")})`
    : "#e2e8f0";

  return (
    <div className="flex min-h-52 items-center justify-center">
      <div className="flex w-fit max-w-full flex-col items-center justify-center gap-5 sm:flex-row sm:gap-6">
        <div
          className="relative h-40 w-40 shrink-0 overflow-hidden rounded-full"
          style={{
            background: donutBackground,
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,.34), 0 6px 14px rgba(15,23,42,.11)",
            filter: "saturate(1.04)",
          }}
        >
          <div
            className="pointer-events-none absolute inset-0 rounded-full"
            style={{
              background:
                "linear-gradient(180deg, rgba(255,255,255,.18) 0%, rgba(255,255,255,.04) 46%, rgba(15,23,42,.08) 100%)",
              WebkitMaskImage:
                "radial-gradient(circle, transparent 0 50%, #000 51% 100%)",
              maskImage:
                "radial-gradient(circle, transparent 0 50%, #000 51% 100%)",
            }}
          />
          <div className="absolute inset-7 flex flex-col items-center justify-center rounded-full bg-white text-center shadow-[inset_0_1px_2px_rgba(15,23,42,.05)]">
            <span className="text-[11px] font-semibold text-slate-500">Total</span>
            <span className="text-3xl font-extrabold leading-none text-slate-800">
              {numberFormat.format(total)}
            </span>
            <span className="mt-1 text-[11px] font-semibold text-slate-500">
              Requests
            </span>
          </div>
        </div>

        <div className="w-full max-w-[285px] rounded-xl border border-slate-200 bg-white p-3.5 shadow-md shadow-slate-200/60">
          <div className="space-y-2">
            {rows.map((item, index) => {
              const value = Number(item?.value || 0);
              const percentage = total ? Math.round((value / total) * 100) : 0;
              const color = colorMap[item.name] || colors[index % colors.length];

              return (
                <div
                  key={`${item.name}-${index}`}
                  className="grid grid-cols-[minmax(0,1fr)_44px_54px] items-center gap-2 rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2 text-xs"
                >
                  <span className="flex min-w-0 items-center gap-2 font-medium text-slate-700">
                    <i
                      className="h-3 w-3 shrink-0 rounded-sm"
                      style={{ backgroundColor: color }}
                    />
                    <span className="truncate">{titleCase(item.name)}</span>
                  </span>
                  <strong className="text-center text-slate-800">
                    {numberFormat.format(value)}
                  </strong>
                  <span className="text-center font-normal text-slate-500">
                    ({percentage}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

const TrendChart = ({ data = [] }) => {
  const getMonthAxisLabel = (item) => {
    const key = String(item?.key || "");
    const monthFromKey = Number(key.slice(5, 7));

    if (monthFromKey >= 1 && monthFromKey <= 12) {
      return monthNames[monthFromKey - 1];
    }

    const rawLabel = String(item?.label || "").trim();
    const shortMonth = rawLabel.split(/\s+/)[0].slice(0, 3).toLowerCase();
    const monthIndex = monthNames.findIndex(
      (month) => month.slice(0, 3).toLowerCase() === shortMonth,
    );

    return monthIndex >= 0 ? monthNames[monthIndex] : rawLabel;
  };

  const series = [
    ["registrations", "Registrations", "#79aee0", "#4f89bd"],
    ["jobs", "Jobs", "#45c79a", "#209f74"],
    ["applications", "Applications", "#efb43b", "#d68f16"],
    ["hires", "Hires", "#9488e8", "#7168d4"],
  ];

  if (!data.length) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-xs font-medium text-white/65">
        No data for the selected filters.
      </div>
    );
  }

  const summary = series.map(([key, label, color]) => ({
    key,
    label,
    color,
    value: data.reduce((sum, item) => sum + Number(item[key] || 0), 0),
  }));

  const summaryTotal = Math.max(
    1,
    summary.reduce((sum, item) => sum + Number(item.value || 0), 0),
  );

  const width = 940;
  const height = 280;
  const left = 42;
  const right = 10;
  const top = 18;
  const bottom = 38;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const max = Math.max(
    1,
    ...data.flatMap((item) => series.map(([key]) => Number(item[key] || 0))),
  );

  const groupWidth = plotWidth / data.length;
  const groupPadding = Math.min(14, groupWidth * 0.12);
  const usableGroupWidth = Math.max(12, groupWidth - groupPadding * 2);
  const barGap = Math.min(5, usableGroupWidth * 0.05);
  const barWidth = Math.max(
    3,
    (usableGroupWidth - barGap * (series.length - 1)) / series.length,
  );

  const showLabel = (index) =>
    data.length <= 12 ||
    index % Math.ceil(data.length / 8) === 0 ||
    index === data.length - 1;

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_270px] xl:items-stretch">
      <div className="min-w-0 xl:-ml-1">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-[245px] w-full"
          role="img"
          aria-label="Monthly analytics grouped bar chart"
        >
          <defs>
            {series.map(([key, , color, endColor]) => (
              <linearGradient
                key={`trend-gradient-${key}`}
                id={`trend-gradient-${key}`}
                x1="0"
                y1="0"
                x2="1"
                y2="1"
              >
                <stop offset="0%" stopColor={color} />
                <stop offset="100%" stopColor={endColor} />
              </linearGradient>
            ))}
          </defs>
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = top + plotHeight - ratio * plotHeight;
            return (
              <g key={ratio}>
                <line
                  x1={left}
                  y1={y}
                  x2={width - right}
                  y2={y}
                  stroke="rgba(255,255,255,0.22)"
                  strokeWidth="1.15"
                />
                <text
                  x={left - 8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="10"
                  fill="rgba(255,255,255,0.78)"
                >
                  {Math.round(max * ratio)}
                </text>
              </g>
            );
          })}

          {data.slice(0, -1).map((item, dataIndex) => {
            const x = left + (dataIndex + 1) * groupWidth;
            return (
              <line
                key={`divider-${item.key || item.label}-${dataIndex}`}
                x1={x}
                y1={top}
                x2={x}
                y2={top + plotHeight}
                stroke="rgba(255,255,255,0.24)"
                strokeWidth="1.15"
              />
            );
          })}

          {data.map((item, dataIndex) => {
            const groupStart = left + dataIndex * groupWidth + groupPadding;

            return (
              <g key={`${item.key || item.label}-${dataIndex}`}>
                {series.map(([key, label, color, endColor], seriesIndex) => {
                  const value = Number(item[key] || 0);
                  const barHeight = (value / max) * plotHeight;
                  const x = groupStart + seriesIndex * (barWidth + barGap);
                  const y = top + plotHeight - barHeight;

                  return (
                    <rect
                      key={`${key}-${dataIndex}`}
                      x={x}
                      y={y}
                      width={barWidth}
                      height={Math.max(0, barHeight)}
                      rx={Math.min(4, barWidth / 3)}
                      fill={`url(#trend-gradient-${key})`}
                      opacity="0.98"
                      stroke="rgba(15,23,42,0.035)"
                      strokeWidth="0.6"
                    >
                      <title>{`${label}: ${numberFormat.format(value)}`}</title>
                    </rect>
                  );
                })}

                {showLabel(dataIndex) ? (
                  <text
                    x={left + dataIndex * groupWidth + groupWidth / 2}
                    y={height - 12}
                    textAnchor="middle"
                    fontSize="10"
                    fill="rgba(255,255,255,0.82)"
                  >
                    {getMonthAxisLabel(item)}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>
      </div>

      <aside className="flex min-h-[220px] flex-col rounded-2xl border border-slate-200 bg-white p-3.5 text-slate-800 shadow-[0_12px_28px_rgba(15,23,42,0.14)]">
        <div className="flex flex-1 flex-col justify-center divide-y divide-slate-200">
          {summary.map((item) => {
            const percentage = (
              (Number(item.value || 0) / summaryTotal) *
              100
            ).toFixed(1);

            return (
              <div
                key={item.key}
                className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 py-2.5"
              >
                <span className="flex min-w-0 items-center gap-3 text-sm font-semibold text-slate-700">
                  <i
                    className="h-3.5 w-3.5 shrink-0 rounded-sm"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="truncate">{item.label}</span>
                </span>
                <strong className="w-10 text-right text-sm font-extrabold text-slate-900">
                  {numberFormat.format(Number(item.value || 0))}
                </strong>
                <span className="w-14 text-right text-sm font-medium text-slate-500">
                  {percentage}%
                </span>
              </div>
            );
          })}
        </div>
      </aside>
    </div>
  );
};

const RecruitmentCardTitle = ({ icon: Icon, title, subtitle }) => (
  <div className="mb-3 flex items-start gap-2 border-b border-slate-100 pb-3">
    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2e66a6] text-white shadow-sm">
      <Icon size={17} />
    </span>
    <div className="min-w-0">
      <h2 className="text-sm font-bold text-slate-800">{title}</h2>
      <p className="mt-0.5 text-[11px] text-slate-500">{subtitle}</p>
    </div>
  </div>
);

const ApplicationProcessDurationCard = ({ data = {} }) => {
  const rows = Array.isArray(data?.buckets) ? data.buckets : [];
  return (
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm xl:col-span-6">
      <RecruitmentCardTitle
        icon={FaWaveSquare}
        title="Application Processing Time"
        subtitle="Average time from application to hire"
      />
      <div className="grid gap-4 lg:grid-cols-[180px_1fr]">
        <div className="space-y-3">
          <div className="rounded-xl bg-[#2e66a6]/5 p-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Average Time to Hire</p>
            <p className="mt-1 text-3xl font-extrabold text-[#2e66a6]">{numberFormat.format(Number(data?.averageDays || 0))} days</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-slate-50 p-3 text-center">
              <p className="text-[10px] font-bold text-slate-500">Shortest</p>
              <p className="mt-1 text-sm font-extrabold text-slate-800">{numberFormat.format(Number(data?.shortestDays || 0))} days</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 text-center">
              <p className="text-[10px] font-bold text-slate-500">Longest</p>
              <p className="mt-1 text-sm font-extrabold text-slate-800">{numberFormat.format(Number(data?.longestDays || 0))} days</p>
            </div>
          </div>
        </div>
        <VerticalBars data={rows} maxItems={5} />
      </div>
    </section>
  );
};

const WithdrawalStageCard = ({ data = [] }) => {
  const total = data.reduce((sum, item) => sum + Number(item.value || 0), 0);
  return (
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm xl:col-span-6">
      <RecruitmentCardTitle
        icon={FaUser}
        title="Withdrawal by Application Stage"
        subtitle="Withdrawn applications by stage"
      />
      <DonutChart data={data} />
      {total > 0 ? (
        <div className="mt-4 rounded-xl bg-[#2e66a6]/5 px-4 py-3 text-[11px] font-medium text-slate-600">
          Withdrawn applicants are grouped by the last active application stage recorded before withdrawal.
        </div>
      ) : null}
    </section>
  );
};

const ApplicationsBeforeHireCard = ({ data = [] }) => (
  <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm xl:col-span-6">
    <RecruitmentCardTitle
      icon={FaListOl}
      title="Applications Before Hire"
      subtitle="Average number of applications submitted before being hired."
    />
    <VerticalBars data={data} maxItems={4} />
  </section>
);

const HireRateByCampusCard = ({ data = [] }) => {
  const rows = Array.isArray(data) ? data : [];
  if (!rows.length) {
    return (
      <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm xl:col-span-6">
        <RecruitmentCardTitle
          icon={FaUniversity}
          title="Hire Rate by Campus"
          subtitle="Percentage of applicants hired from each campus."
        />
        <EmptyChart />
      </section>
    );
  }
  const max = Math.max(1, ...rows.map((item) => Number(item.value || 0)));
  return (
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm xl:col-span-6">
      <RecruitmentCardTitle
        icon={Building2}
        title="Hire Rate by Campus"
        subtitle="Percentage of applicants hired from each campus."
      />
      <div className="grid min-h-48 items-end gap-5" style={{ gridTemplateColumns: `repeat(${rows.length}, minmax(0, 1fr))` }}>
        {rows.map((item, index) => {
          const value = Number(item.value || 0);
          return (
            <div key={item.name} className="flex min-w-0 flex-col items-center justify-end gap-2">
              <span className="text-xs font-extrabold text-slate-700">{value}%</span>
              <div className="flex h-32 w-full items-end justify-center rounded-lg bg-slate-50 px-3 pt-2">
                <div
                  className="w-full max-w-[68px] rounded-t-lg transition-all"
                  style={{
                    height: `${Math.max(4, (value / max) * 100)}%`,
                    backgroundImage: getChartGradient(index, 180),
                    boxShadow: getChartShadow(index),
                    border: "1px solid rgba(15,23,42,.035)",
                  }}
                />
              </div>
              <span className="text-center text-[10px] font-bold leading-4 text-slate-700">{item.name}</span>
              <span className="text-[9px] font-medium text-slate-400">{numberFormat.format(Number(item.hired || 0))} / {numberFormat.format(Number(item.total || 0))} hired</span>
            </div>
          );
        })}
      </div>
    </section>
  );
};

const FunnelChart = ({ data = [] }) => {
  const rows = data.filter((item) => Number(item.value || 0) > 0);
  const max = Math.max(1, ...rows.map((item) => item.value));
  if (!rows.length) return <EmptyChart />;
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-2 py-1">
      {rows.map((item, index) => {
        const proportionalWidth = (Number(item.value || 0) / max) * 100;
        const width = Math.max(44, Math.min(100, proportionalWidth));
        return (
          <div key={item.name} className="w-full text-center">
            <div
              className="mx-auto flex h-8 items-center justify-center rounded-lg px-3 text-xs font-bold text-white shadow-sm"
              style={{
                width: `${width}%`,
                backgroundImage: getChartGradient(index, 180),
                    boxShadow: getChartShadow(index),
                    border: "1px solid rgba(15,23,42,.035)",
              }}
            >
              <span className="truncate">
                {titleCase(item.name)} · {numberFormat.format(item.value)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const MetricTile = ({ label, value, suffix = "", icon: Icon }) => (
  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
          {label}
        </p>
        <p className="mt-1 text-2xl font-extrabold text-slate-800">
          {numberFormat.format(Number(value || 0))}
          {suffix}
        </p>
      </div>
      <div className="rounded-xl bg-[#2e66a6]/10 p-2.5 text-[#2e66a6]">
        <Icon size={20} />
      </div>
    </div>
  </div>
);

const AnalyticsSkeleton = () => (
  <div
    className="grid animate-pulse grid-cols-1 gap-4 xl:grid-cols-12"
    aria-label="Loading analytics charts"
  >
    <div className="h-56 rounded-2xl border border-slate-200 bg-white p-4 xl:col-span-12">
      <div className="h-4 w-40 rounded bg-slate-200" />
      <div className="mt-5 h-36 rounded-xl bg-slate-100" />
    </div>
    <div className="h-60 rounded-2xl border border-slate-200 bg-white p-4 xl:col-span-7">
      <div className="h-4 w-36 rounded bg-slate-200" />
      <div className="mt-5 space-y-3">
        {[100, 86, 72, 58].map((width) => (
          <div
            key={width}
            className="mx-auto h-7 rounded-lg bg-slate-100"
            style={{ width: `${width}%` }}
          />
        ))}
      </div>
    </div>
    <div className="h-60 rounded-2xl border border-slate-200 bg-white p-4 xl:col-span-5">
      <div className="h-4 w-32 rounded bg-slate-200" />
      <div className="mt-5 space-y-3">
        {["w-full", "w-4/5", "w-3/5", "w-2/5"].map((width) => (
          <div key={width} className={`h-6 rounded-md bg-slate-100 ${width}`} />
        ))}
      </div>
    </div>
  </div>
);

const ExportPasswordModal = ({ open, actionLabel, password, onPasswordChange, onCancel, onConfirm, submitting, message }) => {
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/45 px-4 py-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">Confirm Export</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Enter your admin password before accessing {actionLabel || "this export"}.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50"
            aria-label="Close"
          >
            <X size={17} />
          </button>
        </div>

        <label className="mt-5 block">
          <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Admin Password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => onPasswordChange(event.target.value.slice(0, 25))}
            onKeyDown={(event) => {
              if (event.key === "Enter" && password && !submitting) onConfirm();
            }}
            autoFocus
            maxLength={25}
            autoComplete="current-password"
            placeholder="Enter password"
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/20"
          />
        </label>

        {message ? (
          <p className="mt-2 text-xs font-medium text-red-600">{message}</p>
        ) : null}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!password || submitting}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#2e66a6] px-4 text-xs font-bold text-white shadow-sm transition hover:bg-[#255487] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download size={14} /> {submitting ? "Preparing..." : "Continue Export"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(emptyAnalytics);
  const [filters, setFilters] = useState(initialFilters);
  const [activeTab, setActiveTab] = useState("overview");
  const [showCustomDateModal, setShowCustomDateModal] = useState(false);
  const [showSpecificDateModal, setShowSpecificDateModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportRequest, setExportRequest] = useState(null);
  const [exportPassword, setExportPassword] = useState("");
  const [exportPasswordMessage, setExportPasswordMessage] = useState("");
  const [dummyMode, setDummyMode] = useState(false);

  const dummyAnalytics = useMemo(
    () => getDummyAnalytics(filters),
    [filters],
  );
  const displayedAnalytics = dummyMode ? dummyAnalytics : analytics;
  const options = displayedAnalytics?.filters?.options || {};
  const kpis = displayedAnalytics?.kpis || emptyAnalytics.kpis;
  const sections = displayedAnalytics?.sections || emptyAnalytics.sections;
  const displayedTrends = displayedAnalytics?.trends || [];

  const requestParams = useMemo(() => {
    const next = { ...filters };
    if (next.date !== "specific") delete next.specificDate;
    if (next.date !== "range") {
      delete next.startDate;
      delete next.endDate;
    }
    return next;
  }, [filters]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/admin/analytics", {
        params: requestParams,
      });
      setAnalytics({
        ...emptyAnalytics,
        ...(response.data || {}),
        sections: {
          ...emptyAnalytics.sections,
          ...(response.data?.sections || {}),
        },
      });
    } catch (err) {
      console.error("Admin analytics error:", err);
      setError(
        err?.response?.data?.message || "Unable to load analytics data.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (dummyMode) {
      setLoading(false);
      setError("");
      return undefined;
    }
    const timer = setTimeout(fetchAnalytics, 180);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestParams, dummyMode]);

  const updateFilter = (name, value) =>
    setFilters((previous) => ({ ...previous, [name]: value }));
  const selectDateFilter = (value) => {
    if (value === "specific") {
      setShowSpecificDateModal(true);
      return;
    }
    if (value === "range") {
      setShowCustomDateModal(true);
      return;
    }
    setFilters((previous) => ({
      ...previous,
      date: value,
      specificDate: "",
      startDate: "",
      endDate: "",
    }));
  };
  const applySpecificDate = (specificDate) => {
    setFilters((previous) => ({
      ...previous,
      date: "specific",
      specificDate,
      startDate: "",
      endDate: "",
    }));
    setShowSpecificDateModal(false);
  };
  const applyCustomDateRange = (startDate, endDate) => {
    setFilters((previous) => ({
      ...previous,
      date: "range",
      specificDate: "",
      startDate,
      endDate,
    }));
    setShowCustomDateModal(false);
  };
  const resetFilters = () => setFilters(initialFilters);
  const hasFilters = JSON.stringify(filters) !== JSON.stringify(initialFilters);

  const openExportPassword = (type, label) => {
    setExportRequest({ type, label });
    setExportPassword("");
    setExportPasswordMessage("");
  };

  const closeExportPassword = () => {
    if (exporting) return;
    setExportRequest(null);
    setExportPassword("");
    setExportPasswordMessage("");
  };

  const downloadExport = async () => {
    if (!exportRequest || !exportPassword) return;

    try {
      setExporting(true);
      setExportPasswordMessage("");

      const exportFilters = {
        date: filters.date,
        specificDate: filters.specificDate,
        startDate: filters.startDate,
        endDate: filters.endDate,
        campus: filters.campus,
        yearGraduated: filters.yearGraduated,
        course: filters.course,
        gender: filters.gender,
      };

      const response = await api.post(
        "/admin/exports/excel",
        {
          mode: exportRequest.type,
          filters: exportRequest.type === "all" ? {} : exportFilters,
        },
        {
          responseType: "blob",
          headers: { "x-admin-password": exportPassword },
        },
      );

      const disposition = response.headers?.["content-disposition"] || "";
      const encodedMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
      const plainMatch = disposition.match(/filename="?([^";]+)"?/i);
      const filename = encodedMatch?.[1]
        ? decodeURIComponent(encodedMatch[1])
        : plainMatch?.[1] || `agapay-export-${new Date().toISOString().slice(0, 10)}.xlsx`;

      const blobUrl = window.URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);

      setExportRequest(null);
      setExportPassword("");
      setExportPasswordMessage("");
    } catch (err) {
      let message = "Unable to export records.";

      if (err?.response?.data instanceof Blob) {
        try {
          const payload = JSON.parse(await err.response.data.text());
          message = payload?.message || message;
        } catch (_) {
          // Keep the fallback message when the response is not JSON.
        }
      } else {
        message = err?.response?.data?.message || message;
      }

      setExportPasswordMessage(message);
    } finally {
      setExporting(false);
    }
  };

  const tabs = [
    ["overview", "Overview"],
    ["recruitment", "Recruitment"],
    ["users", "Users & Verification"],
    ["operations", "Operations"],
  ];

  return (
    <main className="mx-auto w-full max-w-[1600px] px-1 py-6">
      <div className="space-y-4">
        <header className="relative overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -right-12 -top-20 h-56 w-[520px] rounded-[50%] bg-[#2e66a6]/[0.045] blur-2xl" />
            <div className="absolute right-24 top-16 h-24 w-[440px] rotate-[-8deg] rounded-[50%] border-t border-[#2e66a6]/10" />
          </div>

          <div className="relative px-5 pb-4 pt-5 lg:px-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-[76px] w-[76px] shrink-0 items-center justify-center rounded-2xl bg-white shadow-[0_10px_28px_rgba(46,102,166,0.14)] ring-1 ring-[#2e66a6]/10">
                  <img
                    src="/images/dashboardtile.png"
                    alt="Dashboard analytics"
                    className="h-[66px] w-[66px] object-contain"
                  />
                </div>
                <div className="min-w-0">
                  <h1 className="text-[26px] font-extrabold leading-tight tracking-[-0.02em] text-slate-900 sm:text-[30px]">
                    Admin Dashboard
                  </h1>
                  <p className="mt-1 max-w-[620px] text-xs leading-5 text-slate-500">
                    Compact system-wide analysis of users, jobs, applications, verification, engagement, and operations.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 xl:justify-end">
                <HeaderStatusCard
                  label="Pending Jobseeker"
                  value={kpis.pendingJobseekers}
                  icon={UserRoundMinus}
                  onClick={() => navigate("/admin/dashboard/pending-seekers")}
                />
                <HeaderStatusCard
                  label="Pending Employers"
                  value={kpis.pendingEmployers}
                  icon={Building2}
                  onClick={() => navigate("/admin/dashboard/pending-employers")}
                />
                <HeaderStatusCard
                  label="Request Edit"
                  value={kpis.pendingEditRequests}
                  icon={FaFileAlt}
                  onClick={() => navigate("/admin/employer-job-edit-requests")}
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3.5">
              <button type="button" onClick={() => openExportPassword("all", "Export All Records")} disabled={loading || exporting} className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#2e66a6]/25 bg-white px-4 text-xs font-bold text-[#2e66a6] shadow-sm transition hover:border-[#2e66a6]/45 hover:bg-[#2e66a6]/5 disabled:opacity-60">
                <Download size={15} /> Export All Records
              </button>
              <button type="button" onClick={() => openExportPassword("filtered", "Filter Records")} disabled={loading || exporting} className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#2e66a6]/25 bg-white px-4 text-xs font-bold text-[#2e66a6] shadow-sm transition hover:border-[#2e66a6]/45 hover:bg-[#2e66a6]/5 disabled:opacity-60">
                <Filter size={15} /> Filter Records
              </button>
              <button type="button" onClick={() => openExportPassword("report", "AGAPAY Reports")} disabled={loading || exporting} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#2e66a6] px-5 text-xs font-bold text-white shadow-[0_7px_18px_rgba(46,102,166,0.24)] transition hover:bg-[#255487] disabled:opacity-60">
                <Activity size={15} /> AGAPAY Reports
              </button>

              <div className="ml-auto hidden h-9 w-px bg-slate-200 lg:block" />
              <label className="inline-flex h-10 cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-700 shadow-sm">
                <span className="whitespace-nowrap">Dummy Data</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={dummyMode}
                  onClick={() => setDummyMode((value) => !value)}
                  className={`relative h-5 w-10 rounded-full transition ${dummyMode ? "bg-[#2e66a6]" : "bg-slate-300"}`}
                >
                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition ${dummyMode ? "left-[22px]" : "left-0.5"}`} />
                </button>
                <span className={`text-[10px] font-extrabold ${dummyMode ? "text-[#2e66a6]" : "text-slate-400"}`}>
                  {dummyMode ? "ON" : "OFF"}
                </span>
              </label>
            </div>
          </div>
        </header>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard
            label="Jobseekers"
            value={kpis.totalJobseekers}
            imageSrc={statCardImages.users}
            onClick={() => navigate("/admin/dashboard/job-seekers")}
          />
          <StatCard
            label="Employers"
            value={kpis.totalEmployers}
            imageSrc={statCardImages.verification}
            onClick={() => navigate("/admin/dashboard/employers")}
          />
          <StatCard
            label="Registered Users"
            value={kpis.totalRegisteredUsers}
            imageSrc={statCardImages.applications}
            onClick={() => navigate("/admin/users")}
          />
          <StatCard
            label="Job Posts"
            value={kpis.totalJobPosts}
            imageSrc={statCardImages.jobs}
            onClick={() => navigate("/admin/job-offers")}
          />
          <StatCard
            label="Applications"
            value={kpis.applications}
            imageSrc={statCardImages.applications}
            onClick={() => navigate("/admin/applications")}
          />
          <StatCard
            label="Hire Rate"
            value={kpis.hireRate}
            suffix="%"
            imageSrc={statCardImages.rate}
          />
        </div>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className={`grid gap-3 sm:grid-cols-2 lg:grid-cols-3 ${hasFilters ? "xl:grid-cols-[repeat(5,minmax(0,1fr))_auto]" : "xl:grid-cols-5"}`}>
            <DateFilterDropdown
              value={filters.date}
              specificDate={filters.specificDate}
              startDate={filters.startDate}
              endDate={filters.endDate}
              onSelect={selectDateFilter}
              disabled={loading}
            />
            <FilterSelect label="Campus" value={filters.campus} onChange={(value) => updateFilter("campus", value)} values={["AU Main", "AU San Jose", "AU South"]} placeholderLabel="Select Campus" allLabel="All Campuses" preserveCase />
            <FilterSelect label="Year Graduated" value={filters.yearGraduated} onChange={(value) => updateFilter("yearGraduated", value)} values={options.yearsGraduated || []} placeholderLabel="Select Year" allLabel="All Year Graduated" preserveCase />
            <FilterSelect label="Course" value={filters.course} onChange={(value) => updateFilter("course", value)} values={options.courses || []} placeholderLabel="Select Course" allLabel="All Course" preserveCase />
            <FilterSelect label="Gender" value={filters.gender} onChange={(value) => updateFilter("gender", value)} values={options.genders || []} placeholderLabel="Select Gender" allLabel="All Gender" preserveCase />

            {hasFilters ? (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex h-10 self-end items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
              >
                <RefreshCw size={13} /> Clear All
              </button>
            ) : null}
          </div>
        </section>

        <nav
          className="flex gap-6 overflow-x-auto border-b border-slate-200"
          aria-label="Analytics sections"
        >
          {tabs.map(([key, label]) => (
            <button
              type="button"
              key={key}
              onClick={() => setActiveTab(key)}
              className={`shrink-0 border-b-2 px-1 pb-3 text-xs font-bold transition ${activeTab === key ? "border-[#2e66a6] text-[#2e66a6]" : "border-transparent text-slate-500 hover:text-slate-800"}`}
            >
              {label}
            </button>
          ))}
        </nav>

        {loading ? <AnalyticsSkeleton /> : null}

        {!loading && activeTab === "overview" ? (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            <section className="relative overflow-hidden rounded-2xl border border-[#2e66a6]/30 bg-gradient-to-br from-[#072258] via-[#245b98] to-[#52b2db] p-4 text-white shadow-[0_12px_30px_rgba(46,102,166,0.20)] xl:col-span-12">
              <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-24 left-1/3 h-52 w-52 rounded-full bg-cyan-200/10 blur-3xl" />

              <div className="relative z-10 mb-3 border-b border-white/15 pb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-bold text-white">
                    System Activity Trend
                  </h2>
                  {dummyMode ? (
                    <span className="rounded-full border border-white/20 bg-white/15 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-white">
                      Dummy Data
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 text-[11px] text-white/70">
                  {dummyMode
                    ? "January to December preview data — filters update the sample chart"
                    : "Registrations, jobs, applications, and hires by month"}
                </p>
              </div>

              <div className="relative z-10">
                <TrendChart data={displayedTrends} />
              </div>
            </section>
            <ChartCard
              title="Top Hiring Companies"
              subtitle="Companies with the most hires"
              className="xl:col-span-6"
              icon={FaBriefcase}
            >
              <HorizontalBars data={sections.applications?.topHiringCompanies || []} maxItems={5} />
            </ChartCard>
            <ChartCard
              title="Top Industries"
              subtitle="Industries with the most job opportunities"
              className="xl:col-span-6"
              icon={FaWaveSquare}
            >
              <HorizontalBars data={sections.jobs?.industries || sections.jobs?.categories || []} maxItems={6} />
            </ChartCard>
            <ChartCard
              title="User Roles"
              subtitle="Admin, employer, and jobseeker accounts"
              className="xl:col-span-6"
              icon={FaUsers}
            >
              <DonutChart data={sections.users?.roles} showPercentage />
            </ChartCard>
            <ChartCard
              title="Job Status"
              subtitle="Lifecycle state of job postings"
              className="xl:col-span-6"
              icon={FaFileAlt}
            >
              <DonutChart data={sections.jobs?.statuses} showPercentage />
            </ChartCard>
          </div>
        ) : null}

        {!loading && activeTab === "recruitment" ? (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            <ChartCard
              title="Application Status"
              subtitle="Application status breakdown"
              className="xl:col-span-6"
            >
              <HorizontalBars data={sections.applications?.funnel} maxItems={6} />
            </ChartCard>
            <ChartCard
              title="Employment Type"
              subtitle="Job supply grouped by employment type"
              className="xl:col-span-6"
              icon={FaBriefcase}
            >
              <HorizontalBars data={sections.jobs?.employmentTypes} centered />
            </ChartCard>

            <ChartCard
              title="Work Mode"
              subtitle="On-site, remote, blended, and work from home"
              className="xl:col-span-6"
            >
              <DonutChart data={sections.jobs?.workModes} showPercentage />
            </ChartCard>
            <WithdrawalStageCard data={sections.applications?.withdrawalByStage || []} />

            <ApplicationsBeforeHireCard data={sections.applications?.applicationsBeforeHire || []} />
            <HireRateByCampusCard data={sections.applications?.hireRateByCampus || []} />

            <ChartCard
              title="Employment Status"
              subtitle="Status recorded for hired applicants"
              className="xl:col-span-6"
              icon={FaUserCheck}
            >
              <VerticalBars data={sections.applications?.employmentStatus} maxItems={6} />
            </ChartCard>
            <ApplicationProcessDurationCard data={sections.applications?.applicationProcessDuration} />
          </div>
        ) : null}

        {!loading && activeTab === "users" ? (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            <ChartCard
              title="Verification Status"
              subtitle="Employer and jobseeker verification state"
              className="xl:col-span-6"
              icon={FaCheckCircle}
            >
              <HorizontalBars data={sections.users?.verification} />
            </ChartCard>
            <ChartCard
              title="Jobseekers by Campus"
              subtitle="Campus distribution from jobseeker profiles"
              className="xl:col-span-6"
              icon={FaUniversity}
            >
              <HorizontalBars data={sections.users?.campuses} centered />
            </ChartCard>
            <ChartCard
              title="Gender Distribution"
              subtitle="Job seekers by gender"
              className="xl:col-span-6"
              icon={FaUser}
            >
              <DonutChart data={sections.users?.genders} showPercentage />
            </ChartCard>
            <ChartCard
              title="How Soon Can They Start?"
              subtitle="Applicant start availability"
              className="xl:col-span-6"
              icon={FaAward}
            >
              <VerticalBars data={sections.users?.availabilities} maxItems={5} />
            </ChartCard>
            <ChartCard
              title="Relocation Preference"
              subtitle="Job seekers' willingness to relocate"
              className="xl:col-span-6"
            >
              <HorizontalBars data={sections.users?.relocation} maxItems={5} centered />
            </ChartCard>
            <ChartCard
              title="Experience Level"
              subtitle="Job seekers by years of professional work experience"
              className="xl:col-span-6"
            >
              <VerticalBars data={sections.users?.experiences} maxItems={6} />
            </ChartCard>
            <ChartCard
              title="Educational Attainment"
              subtitle="Job seekers by highest completed qualification"
              className="xl:col-span-12"
              icon={FaGraduationCap}
            >
              <HorizontalBars data={sections.users?.educationLevels} maxItems={6} />
              <div className="mt-4 flex items-center gap-3 rounded-xl bg-slate-100 px-4 py-3 text-xs font-medium text-slate-600">
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2e66a6]/10 text-[#2e66a6]">🎓</span>
                <span>Most applicants are college graduates.</span>
              </div>
            </ChartCard>
          </div>
        ) : null}

        {!loading && activeTab === "operations" ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard
              title="Job Edit Requests"
              subtitle="Governance requests by status"
              icon={FaPen}
            >
              <HorizontalBars data={sections.operations?.editRequests} centered />
            </ChartCard>
            <ChartCard
              title="Most Requested Job Sections"
              subtitle="Sections employers request to edit"
            >
              <HorizontalBars data={sections.operations?.editRequestSections} />
            </ChartCard>

            <ChartCard
              title="Employment Status Request Types"
              subtitle="Distribution of requests by ending reason"
              icon={FaListOl}
            >
              <EmploymentRequestDonut
                data={sections.operations?.employmentStatusRequestTypes || []}
                colorMap={{
                  "Contract Ended": "#0b3b66",
                  "Employment Ended": "#f5aa22",
                }}
              />
            </ChartCard>

            <ChartCard
              title="Employment Status Updates"
              subtitle="Distribution of requests to update employment records"
              icon={FaCheckCircle}
            >
              <EmploymentRequestDonut
                data={sections.operations?.employmentStatusUpdates || []}
                colorMap={{
                  Pending: "#f5aa22",
                  Approved: "#43a047",
                  Declined: "#dc2626",
                  "No Response": "#94a3b8",
                }}
              />
            </ChartCard>
          </div>
        ) : null}

        {!loading ? (
          <p className="text-right text-[10px] text-slate-400">
            Timezone: Asia/Manila · Last updated:{" "}
            {displayedAnalytics.generatedAt
              ? new Date(displayedAnalytics.generatedAt).toLocaleString("en-PH")
              : "—"}
          </p>
        ) : null}

        <SpecificDateModal
          open={showSpecificDateModal}
          value={filters.specificDate}
          onCancel={() => setShowSpecificDateModal(false)}
          onApply={applySpecificDate}
        />

        <CustomDateRangeModal
          open={showCustomDateModal}
          startDate={filters.startDate}
          endDate={filters.endDate}
          onCancel={() => setShowCustomDateModal(false)}
          onApply={applyCustomDateRange}
        />

        <ExportPasswordModal
          open={Boolean(exportRequest)}
          actionLabel={exportRequest?.label}
          password={exportPassword}
          onPasswordChange={(value) => { setExportPassword(value); setExportPasswordMessage(""); }}
          onCancel={closeExportPassword}
          onConfirm={downloadExport}
          submitting={exporting}
          message={exportPasswordMessage}
        />
      </div>
    </main>
  );
};

export default AdminDashboard;
