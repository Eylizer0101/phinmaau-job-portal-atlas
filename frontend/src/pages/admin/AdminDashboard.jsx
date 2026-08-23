import React, { useEffect, useMemo, useState } from "react";
import {
  RefreshCw,
  CalendarDays,
  Briefcase,
  Users,
  Building2,
  UserCheck,
  FileClock,
  Download,
  Bell,
  ChevronDown,
  UserRound,
  LogOut,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../../services/api";
import * as XLSX from "xlsx";

const numberFormat = new Intl.NumberFormat("en-US");

const BRAND_BLUE = "#2e66a6";

const statCardImages = {
  jobs: "/images/case.png",
  jobSeekers: "/images/admin_1.png",
  employers: "/images/admin_2.png",
  pendingSeekers: "/images/admin_3.png",
  pendingEmployers: "/images/admin_4.png",
};

const dateOptions = [
  { value: "all", label: "All Time" },
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "thisWeek", label: "This Week" },
  { value: "7days", label: "Last 7 Days" },
  { value: "thisMonth", label: "This Month" },
  { value: "lastMonth", label: "Last Month" },
  { value: "thisYear", label: "This Year" },
  { value: "lastYear", label: "Last Year" },
  { value: "custom", label: "Custom Range" },
];

const defaultDashboard = {
  stats: {
    totalJobs: 0,
    totalJobSeekers: 0,
    totalEmployers: 0,
    pendingSeekers: 0,
    pendingEmployers: 0,
  },
  filters: {
    options: {
      campuses: [],
      employmentTypes: [],
      workModes: [],
      applicationStatuses: [],
    },
  },
  charts: {
    applicationTrends: [],
    jobPostingTrends: [],
    registrationTrends: [],
    employmentTypeDistribution: [],
    topJobCategories: [],
    hireRateByCampus: [],
    applicationStatus: [],
    workModeDistribution: [],
    topHiringCompanies: [],
  },
};

const DUMMY_RECORD_COUNT = 6000;
const DUMMY_START_YEAR = 1950;

const ADMIN_DASHBOARD_CAMPUSES = ["AU Main", "AU South", "AU San Jose"];

const dummyCampuses = ["AU Main", "AU South", "AU San Jose"];
const dummyEmploymentTypes = ["Full-time", "Part-time", "Contractual", "Internship", "Project-based"];
const dummyWorkModes = ["On-site", "Hybrid", "Remote", "Work From Home"];
const dummyApplicationStatuses = ["pending", "for interview", "hired", "declined"];
const dummyJobCategories = [
  "Banking / Finance",
  "Catering / Restaurant",
  "Arts / Design",
  "Chemical / Food Tech",
  "Information Technology",
  "Education",
  "Healthcare",
  "Engineering",
  "Sales / Marketing",
  "Administration",
  "Customer Service",
  "Hospitality",
];
const dummyCompanies = [
  "Araw Talent Hub",
  "Blue Harbor Solutions",
  "NorthStar Careers",
  "PrimePath Industries",
  "Silverline Services",
  "MetroBridge Corp",
  "FutureWorks PH",
  "BrightMind Careers",
  "CampusConnect Jobs",
  "Agapay Partner Group",
];

const seededRandom = (seed) => {
  const value = Math.sin(seed) * 10000;
  return value - Math.floor(value);
};

const pickDummyValue = (items, seed) => items[Math.floor(seededRandom(seed) * items.length) % items.length];

const getDummyDateForRecord = (index, endYear) => {
  const yearSpan = endYear - DUMMY_START_YEAR + 1;
  const year = DUMMY_START_YEAR + (index % yearSpan);
  const month = Math.floor(seededRandom(index * 17 + 3) * 12);
  const day = 1 + Math.floor(seededRandom(index * 19 + 7) * 28);
  return new Date(year, month, day);
};

const getDummyDateRange = (filters = {}) => {
  const today = new Date();
  const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
  let start = new Date(DUMMY_START_YEAR, 0, 1);
  let end = endOfToday;

  if (filters.date === "today") {
    start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  } else if (filters.date === "yesterday") {
    start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
    end = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 23, 59, 59);
  } else if (filters.date === "thisWeek") {
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - mondayOffset);
  } else if (filters.date === "7days") {
    start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6);
  } else if (filters.date === "thisMonth") {
    start = new Date(today.getFullYear(), today.getMonth(), 1);
  } else if (filters.date === "lastMonth") {
    start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    end = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59);
  } else if (filters.date === "thisYear") {
    start = new Date(today.getFullYear(), 0, 1);
  } else if (filters.date === "lastYear") {
    start = new Date(today.getFullYear() - 1, 0, 1);
    end = new Date(today.getFullYear() - 1, 11, 31, 23, 59, 59);
  } else if (filters.date === "custom" && filters.startDate && filters.endDate) {
    start = new Date(`${filters.startDate}T00:00:00`);
    end = new Date(`${filters.endDate}T23:59:59`);
  }

  return { start, end };
};

const isWithinDummyFilters = (record, filters = {}) => {
  const { start, end } = getDummyDateRange(filters);
  const recordDate = record.date;

  if (recordDate < start || recordDate > end) return false;
  if (filters.campus !== "all" && record.campus !== filters.campus) return false;
  if (filters.applicationStatus !== "all" && record.status !== filters.applicationStatus) return false;
  if (filters.employmentType !== "all" && record.employmentType !== filters.employmentType) return false;
  if (filters.workMode !== "all" && record.workMode !== filters.workMode) return false;

  return true;
};

const getMonthLabel = (date) => {
  return date.toLocaleDateString("en-US", { month: "short" });
};

const addCampusValue = (map, label, campus, value = 1) => {
  if (!map.has(label)) map.set(label, { label });
  const row = map.get(label);
  row[campus] = Number(row[campus] || 0) + value;
};

const addCountValue = (map, key, value = 1) => {
  map.set(key, Number(map.get(key) || 0) + value);
};

const mapToNameValueRows = (map) => {
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
};

const buildDummyDashboardData = (filters = {}) => {
  const endYear = new Date().getFullYear();
  const records = Array.from({ length: DUMMY_RECORD_COUNT }, (_, index) => {
    const date = getDummyDateForRecord(index, endYear);
    const campus = pickDummyValue(dummyCampuses, index + 11);
    const employmentType = pickDummyValue(dummyEmploymentTypes, index + 23);
    const workMode = pickDummyValue(dummyWorkModes, index + 37);
    const status = pickDummyValue(dummyApplicationStatuses, index + 41);
    const category = pickDummyValue(dummyJobCategories, index + 53);
    const companyName = pickDummyValue(dummyCompanies, index + 67);
    const isJobRecord = seededRandom(index + 79) > 0.42;
    const isEmployerRecord = seededRandom(index + 83) > 0.58;
    const isPendingSeeker = status === "pending" && seededRandom(index + 89) > 0.35;
    const isPendingEmployer = isEmployerRecord && seededRandom(index + 97) > 0.72;

    return {
      id: index + 1,
      date,
      campus,
      employmentType,
      workMode,
      status,
      category,
      companyName,
      isJobRecord,
      isEmployerRecord,
      isPendingSeeker,
      isPendingEmployer,
    };
  }).filter((record) => isWithinDummyFilters(record, filters));

  const applicationTrendsMap = new Map();
  const jobPostingTrendsMap = new Map();
  const registrationTrendsMap = new Map();
  const hireRateByCampusMap = new Map();
  const employmentTypeMap = new Map();
  const topJobCategoriesMap = new Map();
  const applicationStatusMap = new Map();
  const workModeMap = new Map();
  const topHiringCompaniesMap = new Map();

  records.forEach((record) => {
    const label = getMonthLabel(record.date);

    addCampusValue(applicationTrendsMap, label, record.campus, 1);

    if (record.isJobRecord) {
      addCampusValue(jobPostingTrendsMap, label, record.campus, 1);
      addCountValue(employmentTypeMap, record.employmentType, 1);
      addCountValue(topJobCategoriesMap, record.category, 1);
      addCountValue(workModeMap, record.workMode, 1);
      addCountValue(topHiringCompaniesMap, record.companyName, 1);
    }

    addCampusValue(registrationTrendsMap, label, record.campus, record.status === "pending" ? 1 : 0);
    addCampusValue(hireRateByCampusMap, label, record.campus, record.status === "hired" ? 1 : 0);
    addCountValue(applicationStatusMap, record.status, 1);
  });

  const sortedSeries = (map) => sortMonthlySeries(Array.from(map.values()));

  const jobRecords = records.filter((record) => record.isJobRecord);
  const employerRecords = records.filter((record) => record.isEmployerRecord);

  return {
    stats: {
      totalJobs: jobRecords.length,
      totalJobSeekers: records.length,
      totalEmployers: employerRecords.length,
      pendingSeekers: records.filter((record) => record.isPendingSeeker).length,
      pendingEmployers: records.filter((record) => record.isPendingEmployer).length,
    },
    filters: {
      options: {
        campuses: dummyCampuses,
        employmentTypes: dummyEmploymentTypes,
        workModes: dummyWorkModes,
        applicationStatuses: dummyApplicationStatuses,
      },
    },
    charts: {
      applicationTrends: sortedSeries(applicationTrendsMap),
      jobPostingTrends: sortedSeries(jobPostingTrendsMap),
      registrationTrends: sortedSeries(registrationTrendsMap),
      employmentTypeDistribution: mapToNameValueRows(employmentTypeMap),
      topJobCategories: mapToNameValueRows(topJobCategoriesMap),
      hireRateByCampus: sortedSeries(hireRateByCampusMap),
      applicationStatus: mapToNameValueRows(applicationStatusMap),
      workModeDistribution: mapToNameValueRows(workModeMap),
      topHiringCompanies: Array.from(topHiringCompaniesMap.entries())
        .map(([companyName, count]) => ({ companyName, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
    },
  };
};

const SampleDataToggle = ({ enabled, onChange }) => (
  <button
    type="button"
    onClick={() => onChange((prev) => !prev)}
    aria-pressed={enabled}
    className={`inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-bold shadow-sm transition focus:outline-none focus:ring-2 focus:ring-[#2e66a6]/20 focus:ring-offset-2 ${
      enabled
        ? "border-[#2e66a6]/30 bg-[#2e66a6]/10 text-[#2e66a6]"
        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
    }`}
  >
    <span
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${
        enabled ? "bg-[#2e66a6]" : "bg-slate-300"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white shadow transition ${
          enabled ? "translate-x-4" : "translate-x-0.5"
        }`}
      />
    </span>
    {enabled ? "Sample Data ON" : "Sample Data OFF"}
  </button>
);

const sanitizeSheetName = (name) => String(name || "Sheet").replace(/[\\/?*\[\]:]/g, " ").slice(0, 31);

const toSheetRows = (rows = []) => {
  if (!Array.isArray(rows) || rows.length === 0) return [{ Message: "No data available" }];
  return rows.map((row) => {
    if (!row || typeof row !== "object") return { Value: row };
    return Object.fromEntries(
      Object.entries(row).map(([key, value]) => [
        key,
        value && typeof value === "object" ? JSON.stringify(value) : value,
      ])
    );
  });
};

const addWorksheet = (workbook, sheetName, rows) => {
  const worksheet = XLSX.utils.json_to_sheet(toSheetRows(rows));
  XLSX.utils.book_append_sheet(workbook, worksheet, sanitizeSheetName(sheetName));
};

const buildDashboardWorkbook = ({ dashboard, filters, campusKeys }) => {
  const workbook = XLSX.utils.book_new();
  const stats = dashboard?.stats || defaultDashboard.stats;
  const charts = dashboard?.charts || defaultDashboard.charts;

  addWorksheet(workbook, "Summary", [
    { Metric: "Total Jobs", Value: stats.totalJobs || 0 },
    { Metric: "Total Job Seekers", Value: stats.totalJobSeekers || 0 },
    { Metric: "Total Employers", Value: stats.totalEmployers || 0 },
    { Metric: "Pending Seekers", Value: stats.pendingSeekers || 0 },
    { Metric: "Pending Employers", Value: stats.pendingEmployers || 0 },
  ]);

  addWorksheet(workbook, "Filters", [
    { Filter: "Date", Value: filters.date || "all" },
    { Filter: "Start Date", Value: filters.startDate || "" },
    { Filter: "End Date", Value: filters.endDate || "" },
    { Filter: "Campus", Value: filters.campus || "all" },
    { Filter: "Application Status", Value: filters.applicationStatus || "all" },
    { Filter: "Employment Type", Value: filters.employmentType || "all" },
    { Filter: "Work Mode", Value: filters.workMode || "all" },
    { Filter: "Exported At", Value: new Date().toLocaleString("en-US") },
  ]);

  addWorksheet(workbook, "Applications Trend", mergeCampusSeries(charts.applicationTrends || []));
  addWorksheet(workbook, "Job Posting Trends", mergeCampusSeries(charts.jobPostingTrends || []));
  addWorksheet(workbook, "Registration Trends", mergeCampusSeries(charts.registrationTrends || []));
  addWorksheet(workbook, "Hire Rate By Campus", mergeCampusSeries(charts.hireRateByCampus || []));
  addWorksheet(workbook, "Employment Types", charts.employmentTypeDistribution || []);
  addWorksheet(workbook, "Top Job Categories", charts.topJobCategories || []);
  addWorksheet(workbook, "Application Status", charts.applicationStatus || []);
  addWorksheet(workbook, "Work Mode", charts.workModeDistribution || []);
  addWorksheet(workbook, "Top Hiring Companies", charts.topHiringCompanies || []);
  addWorksheet(workbook, "Campus Keys", (campusKeys || []).map((campus) => ({ Campus: campus })));

  return workbook;
};

const buildChartsWorkbook = ({ dashboard, filters, campusKeys }) => {
  const workbook = XLSX.utils.book_new();
  const charts = dashboard?.charts || defaultDashboard.charts;

  addWorksheet(workbook, "Export Info", [
    { Field: "Report", Value: "Admin Dashboard Charts Export" },
    { Field: "Date", Value: filters.date || "all" },
    { Field: "Start Date", Value: filters.startDate || "" },
    { Field: "End Date", Value: filters.endDate || "" },
    { Field: "Campus", Value: filters.campus || "all" },
    { Field: "Application Status", Value: filters.applicationStatus || "all" },
    { Field: "Employment Type", Value: filters.employmentType || "all" },
    { Field: "Work Mode", Value: filters.workMode || "all" },
    { Field: "Exported At", Value: new Date().toLocaleString("en-US") },
  ]);

  addWorksheet(workbook, "Applications Trend", mergeCampusSeries(charts.applicationTrends || []));
  addWorksheet(workbook, "Applications By Campus", mergeCampusSeries(charts.applicationTrends || []));
  addWorksheet(workbook, "Top Job Categories", charts.topJobCategories || []);
  addWorksheet(workbook, "Application Status", charts.applicationStatus || []);
  addWorksheet(workbook, "Work Mode Distribution", charts.workModeDistribution || []);
  addWorksheet(workbook, "Top Hiring Companies", charts.topHiringCompanies || []);
  addWorksheet(workbook, "Employment Types", charts.employmentTypeDistribution || []);
  addWorksheet(workbook, "Job Seeker Registrations", mergeCampusSeries(charts.registrationTrends || []));
  addWorksheet(workbook, "Hire Rate By Campus", mergeCampusSeries(charts.hireRateByCampus || []));
  addWorksheet(workbook, "Job Posting Trends", mergeCampusSeries(charts.jobPostingTrends || []));
  addWorksheet(workbook, "Campus Keys", (campusKeys || []).map((campus) => ({ Campus: campus })));

  return workbook;
};

const normalizeCampusLabel = (value) => {
  const text = String(value || "").trim();
  if (!text) return "";

  const compact = text
    .toLowerCase()
    .replace(/phinma/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!compact) return "";

  if (compact.includes("san jose") || compact.includes("sanjose")) return "AU San Jose";
  if (compact.includes("south")) return "AU South";
  if (compact.includes("main")) return "AU Main";

  return text;
};

const mergeCampusSeries = (series = []) => {
  const mergedByMonth = new Map();

  series.forEach((item) => {
    const monthLabel = String(item?.label || "").slice(0, 3);
    const label = monthShortNames.includes(monthLabel) ? monthLabel : item?.label;

    if (!mergedByMonth.has(label)) {
      mergedByMonth.set(label, { label });
    }

    const merged = mergedByMonth.get(label);

    Object.entries(item || {}).forEach(([key, value]) => {
      if (key === "label") return;
      const campus = normalizeCampusLabel(key);
      merged[campus] = Number(merged[campus] || 0) + Number(value || 0);
    });
  });

  return sortMonthlySeries(Array.from(mergedByMonth.values()));
};

const uniqueCampuses = (campuses = []) => {
  const normalized = campuses.map(normalizeCampusLabel).filter((campus) => ADMIN_DASHBOARD_CAMPUSES.includes(campus));
  const merged = [...new Set([...ADMIN_DASHBOARD_CAMPUSES, ...normalized])];
  return ADMIN_DASHBOARD_CAMPUSES.filter((campus) => merged.includes(campus));
};

const campusColors = ["#063b69", "#0f9f6e", "#d89000", "#6366f1", "#ef4444", "#64748b"];
const statusColors = ["#f59e0b", "#2563eb", "#10b981", "#ef4444", "#8b5cf6", "#64748b"];

const StatCard = ({ label, value, icon: Icon, imageSrc = "/images/case.png", onClick, ariaLabel }) => {
  const cardContent = (
    <>
      <div
        className="pointer-events-none absolute right-8 top-1/2 h-[70px] w-[70px] -translate-y-1/2 rounded-full blur-[35px] transition-all duration-700 ease-out group-hover:scale-110 group-hover:blur-[45px]"
        style={{
          background:
            "radial-gradient(circle, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.14) 45%, transparent 75%)",
        }}
      />

      <img
        src={imageSrc}
        alt=""
        aria-hidden="true"
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
        <h3 className="text-3xl font-semibold leading-none transition-all duration-300 ease-out group-hover:text-[34px]">
          {numberFormat.format(value || 0)}
        </h3>
        <div className="mt-3 flex items-center justify-between gap-2">
          <p className="flex items-center gap-1 whitespace-nowrap text-sm text-white/90 transition-all duration-300 group-hover:text-white">
            <span>{label}</span>
            <span className="ml-1 text-base font-bold opacity-90 transition-all duration-300 group-hover:ml-2 group-hover:opacity-100">
              &gt;
            </span>
          </p>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 rounded-2xl border-2 border-transparent transition-all duration-500 ease-out group-hover:border-white/20" />
    </>
  );

  const className =
    "group relative w-full overflow-hidden rounded-2xl bg-gradient-to-br from-[#072258] via-[#2d63a0] to-[#52b2db] px-6 py-5 text-left text-white shadow-[0_10px_30px_rgba(0,0,0,0.18)] transition-all duration-500 ease-out hover:scale-[1.02] hover:brightness-105 hover:shadow-[0_20px_50px_rgba(0,0,0,0.25)] focus:outline-none focus:ring-2 focus:ring-[#2e66a6] focus:ring-offset-2 active:scale-[0.99]";

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className} aria-label={ariaLabel || `Open ${label}`}>
        {cardContent}
      </button>
    );
  }

  return <div className={className}>{cardContent}</div>;
};

const FilterSelect = ({ label, value, onChange, options, disabled }) => (
  <label className="block">
    <span className="mb-1 block text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500">{label}</span>
    <select
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none transition focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/20 disabled:cursor-not-allowed disabled:bg-slate-50"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </label>
);

const formatDateInput = (date) => {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const formatDateLabel = (value) => {
  if (!value) return "Select date";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "Select date";
  return date.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
};

const getDateOptionLabel = (value, startDate, endDate) => {
  if (value === "custom" && startDate && endDate) return `${formatDateLabel(startDate)} - ${formatDateLabel(endDate)}`;
  return dateOptions.find((option) => option.value === value)?.label || "Date Filter";
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

const monthShortNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const getMonthIndex = (label) => {
  const text = String(label || "").slice(0, 3);
  const index = monthShortNames.indexOf(text);
  return index === -1 ? 999 : index;
};

const sortMonthlySeries = (series = []) => {
  return [...series].sort((a, b) => getMonthIndex(a.label) - getMonthIndex(b.label));
};

const normalizeMonthlyChartSeries = (series = [], keys = []) => {
  const mergedByMonth = new Map();
  const normalizedKeys = uniqueCampuses(keys);

  (series || []).forEach((item) => {
    const monthLabel = String(item?.label || "").slice(0, 3);
    const label = monthShortNames.includes(monthLabel) ? monthLabel : item?.label;

    if (!label) return;

    if (!mergedByMonth.has(label)) {
      mergedByMonth.set(label, { label });
    }

    const row = mergedByMonth.get(label);
    normalizedKeys.forEach((key) => {
      row[key] = Number(row[key] || 0);
    });

    Object.entries(item || {}).forEach(([key, value]) => {
      if (key === "label") return;

      const campus = normalizeCampusLabel(key);
      if (!normalizedKeys.includes(campus)) return;

      row[campus] = Number(row[campus] || 0) + Number(value || 0);
    });
  });

  return sortMonthlySeries(Array.from(mergedByMonth.values()));
};

const getYearOptions = () => {
  const startYear = 1950;
  const endYear = new Date().getFullYear();
  return Array.from({ length: endYear - startYear + 1 }, (_, index) => startYear + index);
};

const CalendarMonth = ({ monthDate, startDate, endDate, onPickDate, onChangeMonth }) => {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const firstWeekday = firstDay.getDay();
  const gridStart = new Date(year, month, 1 - firstWeekday);
  const start = startDate ? new Date(`${startDate}T00:00:00`) : null;
  const end = endDate ? new Date(`${endDate}T00:00:00`) : null;
  const days = Array.from({ length: 42 }, (_, index) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + index);
    return d;
  });

  const isSameDay = (a, b) => a && b && a.toDateString() === b.toDateString();
  const inRange = (d) => start && end && d >= start && d <= end;
  const changeByMonth = (amount) => onChangeMonth(addCalendarMonths(monthDate, amount));
  const changeMonthSelect = (nextMonth) => onChangeMonth(new Date(year, Number(nextMonth), 1));
  const changeYearSelect = (nextYear) => onChangeMonth(new Date(Number(nextYear), month, 1));

  return (
    <div className="min-w-0 flex-1">
      <div className="mb-4 grid grid-cols-[32px_1fr_32px] items-center gap-2">
        <button
          type="button"
          onClick={() => changeByMonth(-1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-2xl leading-none text-slate-700 transition hover:bg-slate-100"
          aria-label="Previous month"
        >
          ‹
        </button>

        <div className="grid grid-cols-[1fr_86px] gap-2">
          <select
            value={month}
            onChange={(event) => changeMonthSelect(event.target.value)}
            className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-center text-sm font-extrabold text-[#2e66a6] outline-none focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/20"
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
            onChange={(event) => changeYearSelect(event.target.value)}
            className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-center text-sm font-extrabold text-[#2e66a6] outline-none focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/20"
            aria-label="Select year"
          >
            {getYearOptions(monthDate).map((yearOption) => (
              <option key={yearOption} value={yearOption}>
                {yearOption}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => changeByMonth(1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-2xl leading-none text-slate-700 transition hover:bg-slate-100"
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-y-2 text-center text-xs font-bold text-slate-500">
        {["SU", "MO", "TU", "WE", "TH", "FR", "SA"].map((day) => <div key={day}>{day}</div>)}
      </div>

      <div className="mt-3 grid grid-cols-7 gap-y-1 text-center text-sm text-slate-600">
        {days.map((day) => {
          const value = formatDateInput(day);
          const outside = day.getMonth() !== month;
          const selected = isSameDay(day, start) || isSameDay(day, end);
          const ranged = inRange(day);
          return (
            <button
              type="button"
              key={value}
              onClick={() => onPickDate(value)}
              className={`mx-auto flex h-9 w-full items-center justify-center transition ${outside ? "text-slate-300" : "text-slate-700"} ${ranged ? "bg-[#2e66a6]/10 text-[#2e66a6]" : ""} ${selected ? "rounded-lg bg-[#2e66a6] font-extrabold text-white shadow-md" : "hover:bg-[#2e66a6]/10"}`}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const CustomDateRangeModal = ({ open, startDate, endDate, onCancel, onApply }) => {
  const today = new Date();
  const initialStart = startDate || formatDateInput(today);
  const initialEnd = endDate || formatDateInput(today);
  const [draftStart, setDraftStart] = useState(initialStart);
  const [draftEnd, setDraftEnd] = useState(initialEnd);
  const [leftMonth, setLeftMonth] = useState(new Date(`${initialStart}T00:00:00`));
  const [rightMonth, setRightMonth] = useState(addCalendarMonths(new Date(`${initialEnd}T00:00:00`), 0));

  useEffect(() => {
    if (!open) return;
    const nextStart = startDate || formatDateInput(today);
    const nextEnd = endDate || formatDateInput(today);
    setDraftStart(nextStart);
    setDraftEnd(nextEnd);
    setLeftMonth(new Date(`${nextStart}T00:00:00`));
    setRightMonth(addCalendarMonths(new Date(`${nextEnd}T00:00:00`), 0));
  }, [open, startDate, endDate]);

  if (!open) return null;

  const pickDate = (value) => {
    if (!draftStart || (draftStart && draftEnd)) {
      setDraftStart(value);
      setDraftEnd("");
      return;
    }
    if (new Date(`${value}T00:00:00`) < new Date(`${draftStart}T00:00:00`)) {
      setDraftEnd(draftStart);
      setDraftStart(value);
    } else {
      setDraftEnd(value);
    }
  };

  const apply = () => {
    if (!draftStart || !draftEnd) return;
    onApply(draftStart, draftEnd);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 px-4 py-6">
      <div className="w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="grid gap-5 px-6 pb-5 pt-5 md:grid-cols-[1fr_auto_1fr] md:items-end">
          <div>
            <div className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-500">Start Date</div>
            <div className="flex h-12 items-center gap-3 rounded-xl bg-slate-100 px-4 text-lg font-bold text-[#2e66a6]">
              <CalendarDays size={18} /> {formatDateLabel(draftStart)}
            </div>
          </div>
          <div className="hidden pb-3 text-3xl text-slate-500 md:block">→</div>
          <div>
            <div className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-500">End Date</div>
            <div className="flex h-12 items-center gap-3 rounded-xl bg-slate-100 px-4 text-lg font-bold text-[#2e66a6]">
              <CalendarDays size={18} /> {formatDateLabel(draftEnd)}
            </div>
          </div>
        </div>

        <div className="grid gap-8 px-6 pb-5 md:grid-cols-2">
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

        <div className="flex items-center justify-end gap-5 border-t border-slate-100 px-6 py-5">
          <button type="button" onClick={onCancel} className="text-base font-bold text-slate-600">Cancel</button>
          <button type="button" onClick={apply} disabled={!draftStart || !draftEnd} className="h-11 rounded-xl bg-[#2e66a6] px-8 text-base font-extrabold text-white shadow-lg shadow-[#2e66a6]/25 transition hover:bg-[#255487] disabled:opacity-60">Apply Range</button>
        </div>
      </div>
    </div>
  );
};

const DateFilterDropdown = ({ value, startDate, endDate, disabled, onSelect }) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const close = () => setOpen(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [open]);

  return (
    <div className="relative">
      <span className="mb-1 block text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500">Date</span>
      <button
        type="button"
        disabled={disabled}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((prev) => !prev);
        }}
        className="flex h-9 w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none transition hover:bg-slate-50 focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/20 disabled:cursor-not-allowed disabled:bg-slate-50"
      >
        <span className="truncate">{getDateOptionLabel(value, startDate, endDate)}</span>
        <CalendarDays size={14} className="text-slate-500" />
      </button>

      {open ? (
        <div onClick={(event) => event.stopPropagation()} className="absolute left-0 top-[44px] z-50 w-52 rounded-2xl border border-slate-100 bg-white p-2 shadow-xl">
          <div className="space-y-1">
            {dateOptions.map((option) => (
              <button
                type="button"
                key={option.value}
                onClick={() => {
                  setOpen(false);
                  onSelect(option.value);
                }}
                className={`w-full rounded-xl px-3 py-2 text-left text-sm font-semibold transition ${value === option.value ? "bg-[#2e66a6]/10 text-[#2e66a6]" : "text-slate-600 hover:bg-slate-50"}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};

const EmptyState = () => <div className="flex h-44 items-center justify-center text-xs text-slate-400">No data available</div>;

const MultiValueTooltip = ({ tooltip, width, padding = 32 }) => {
  if (!tooltip) return null;

  const rowHeight = 16;
  const boxWidth = 132;
  const boxHeight = 28 + tooltip.items.length * rowHeight;
  const boxX = Math.min(Math.max(tooltip.x - boxWidth / 2, 8), width - boxWidth - 8);
  const boxY = Math.max(tooltip.y - boxHeight - 8, 8);

  return (
    <g pointerEvents="none">
      <line x1={tooltip.x} y1={padding} x2={tooltip.x} y2={tooltip.chartHeight - padding} stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />
      <rect x={boxX} y={boxY} width={boxWidth} height={boxHeight} rx="8" fill="#ffffff" stroke="#e2e8f0" filter="drop-shadow(0 6px 10px rgb(15 23 42 / 0.14))" />
      <text x={boxX + 12} y={boxY + 18} fontSize="10" fontWeight="700" fill="#0f172a">
        {tooltip.label}
      </text>
      {tooltip.items.map((item, index) => (
        <g key={item.key} transform={`translate(${boxX + 12}, ${boxY + 34 + index * rowHeight})`}>
          <circle cx="4" cy="-4" r="3.5" fill={item.color} />
          <text x="14" y="0" fontSize="10" fill="#334155">
            {item.key}: {numberFormat.format(item.value)}
          </text>
        </g>
      ))}
    </g>
  );
};

const LineChart = ({ data, keys }) => {
  const [tooltip, setTooltip] = useState(null);
  const monthlyData = normalizeMonthlyChartSeries(data || [], keys);
  const width = 560;
  const height = 210;
  const padding = 32;
  const allValues = monthlyData.flatMap((item) => keys.map((key) => Number(item[key] || 0)));
  const max = Math.max(...allValues, 1);
  const stepX = monthlyData.length > 1 ? (width - padding * 2) / (monthlyData.length - 1) : 0;
  const y = (value) => height - padding - (Number(value || 0) / max) * (height - padding * 2);

  if (!monthlyData.length || !keys.length) return <EmptyState />;

  const showTooltip = (item, index) => {
    const cx = padding + index * stepX;
    const values = keys.map((key, keyIndex) => ({
      key,
      value: Number(item[key] || 0),
      color: campusColors[keyIndex % campusColors.length],
    }));
    const highestValue = Math.max(...values.map((entry) => entry.value), 0);

    setTooltip({
      x: cx,
      y: y(highestValue),
      label: item.label,
      items: values,
      chartHeight: height,
    });
  };

  return (
    <div className="overflow-hidden">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-56 w-full" onMouseLeave={() => setTooltip(null)}>
        {[0, 1, 2, 3].map((line) => {
          const gy = padding + line * ((height - padding * 2) / 3);
          return <line key={line} x1={padding} y1={gy} x2={width - padding} y2={gy} stroke="#edf2f7" strokeWidth="1" />;
        })}
        {keys.map((key, index) => {
          const points = monthlyData.map((item, i) => `${padding + i * stepX},${y(item[key])}`).join(" ");
          return <polyline key={key} fill="none" stroke={campusColors[index % campusColors.length]} strokeWidth="2.5" points={points} strokeLinecap="round" strokeLinejoin="round" />;
        })}
        {keys.map((key, keyIndex) =>
          monthlyData.map((item, pointIndex) => {
            const cx = padding + pointIndex * stepX;
            const cy = y(item[key]);

            return (
              <circle
                key={`${key}-${item.label}-${pointIndex}`}
                cx={cx}
                cy={cy}
                r="4"
                fill={campusColors[keyIndex % campusColors.length]}
                stroke="#ffffff"
                strokeWidth="1.5"
                className={tooltip?.label === item.label ? "opacity-100" : "opacity-0 transition"}
              />
            );
          })
        )}
        {monthlyData.map((item, index) => {
          const cx = padding + index * stepX;
          return (
            <rect
              key={`hover-${item.label}-${index}`}
              x={cx - Math.max(stepX / 2, 14)}
              y={padding}
              width={Math.max(stepX, 28)}
              height={height - padding * 2}
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={() => showTooltip(item, index)}
              onMouseMove={() => showTooltip(item, index)}
            />
          );
        })}
        {monthlyData.map((item, index) => (
          <text key={`${item.label}-${index}`} x={padding + index * stepX} y={height - 8} textAnchor="middle" fontSize="9" fill="#94a3b8">
            {item.label}
          </text>
        ))}
        <MultiValueTooltip tooltip={tooltip} width={width} padding={padding} />
      </svg>
      <Legend keys={keys} colors={campusColors} />
    </div>
  );
};

const BarChart = ({ data, keys, horizontal = false }) => {
  const [tooltip, setTooltip] = useState(null);

  if (!data.length) return <EmptyState />;

  if (horizontal) {
    const max = Math.max(...data.map((item) => item.count || 0), 1);
    return (
      <div className="space-y-3 pt-4">
        {data.map((item) => (
          <div key={item.companyName} className="group relative grid grid-cols-[150px_1fr_35px] items-center gap-3 text-xs">
            <span className="truncate text-right text-slate-600">{item.companyName}</span>
            <div className="h-6 overflow-hidden rounded bg-slate-100">
              <div className="h-full rounded bg-[#2e66a6]" style={{ width: `${Math.max((item.count / max) * 100, 4)}%` }} />
            </div>
            <span className="font-semibold text-slate-700">{item.count}</span>
            <div className="pointer-events-none absolute left-40 top-[-38px] z-10 hidden rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-700 shadow-lg group-hover:block">
              {item.companyName}: {numberFormat.format(item.count || 0)}
            </div>
          </div>
        ))}
      </div>
    );
  }

  const monthlyData = normalizeMonthlyChartSeries(data || [], keys);
  const width = 560;
  const height = 210;
  const padding = 34;
  const max = Math.max(...monthlyData.flatMap((item) => keys.map((key) => Number(item[key] || 0))), 1);
  const groupWidth = (width - padding * 2) / Math.max(monthlyData.length, 1);
  const barWidth = Math.max(groupWidth / Math.max(keys.length + 1, 2), 5);

  const showTooltip = (item, index) => {
    const values = keys.map((key, keyIndex) => ({
      key,
      value: Number(item[key] || 0),
      color: campusColors[keyIndex % campusColors.length],
    }));
    const highestValue = Math.max(...values.map((entry) => entry.value), 0);
    const barHeight = (highestValue / max) * (height - padding * 2);

    setTooltip({
      x: padding + index * groupWidth + groupWidth / 2,
      y: height - padding - barHeight,
      label: item.label,
      items: values,
      chartHeight: height,
    });
  };

  return (
    <div className="overflow-hidden">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-56 w-full" onMouseLeave={() => setTooltip(null)}>
        {[0, 1, 2, 3].map((line) => {
          const gy = padding + line * ((height - padding * 2) / 3);
          return <line key={line} x1={padding} y1={gy} x2={width - padding} y2={gy} stroke="#edf2f7" strokeWidth="1" />;
        })}
        {monthlyData.map((item, i) =>
          keys.map((key, ki) => {
            const barHeight = (Number(item[key] || 0) / max) * (height - padding * 2);
            const x = padding + i * groupWidth + ki * barWidth + 5;
            const y = height - padding - barHeight;
            return (
              <rect
                key={`${item.label}-${key}`}
                x={x}
                y={y}
                width={barWidth - 2}
                height={barHeight}
                rx="2"
                fill={campusColors[ki % campusColors.length]}
              />
            );
          })
        )}
        {monthlyData.map((item, index) => {
          const x = padding + index * groupWidth;
          return (
            <rect
              key={`bar-hover-${item.label}-${index}`}
              x={x}
              y={padding}
              width={groupWidth}
              height={height - padding * 2}
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={() => showTooltip(item, index)}
              onMouseMove={() => showTooltip(item, index)}
            />
          );
        })}
        {monthlyData.map((item, index) => (
          <text key={`${item.label}-${index}`} x={padding + index * groupWidth + groupWidth / 2} y={height - 8} textAnchor="middle" fontSize="9" fill="#94a3b8">
            {item.label}
          </text>
        ))}
        <MultiValueTooltip tooltip={tooltip} width={width} padding={padding} />
      </svg>
      <Legend keys={keys} colors={campusColors} />
    </div>
  );
};

const DonutChart = ({ data, colors = statusColors }) => {
  const total = data.reduce((sum, item) => sum + Number(item.value || 0), 0);
  let current = 0;

  if (!total) return <EmptyState />;

  const circle = 2 * Math.PI * 42;

  return (
    <div className="flex flex-wrap items-center justify-center gap-6 py-3">
      <svg viewBox="0 0 120 120" className="h-44 w-44 -rotate-90">
        <circle cx="60" cy="60" r="42" fill="none" stroke="#eef2f7" strokeWidth="18" />
        {data.map((item, index) => {
          const length = (Number(item.value || 0) / total) * circle;
          const dash = `${length} ${circle - length}`;
          const offset = -current;
          current += length;
          return (
            <circle key={item.name} cx="60" cy="60" r="42" fill="none" stroke={colors[index % colors.length]} strokeWidth="18" strokeDasharray={dash} strokeDashoffset={offset}>
              <title>{`${item.name}: ${numberFormat.format(Number(item.value || 0))}`}</title>
            </circle>
          );
        })}
      </svg>
      <div className="grid gap-2 text-xs">
        {data.map((item, index) => (
          <div key={item.name} className="flex items-center gap-2 text-slate-600">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />
            <span className="capitalize">{item.name}</span>
            <span className="font-bold text-slate-900">{Math.round((Number(item.value || 0) / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};


const VerticalBarChart = ({ data = [], labelKey = "name", valueKey = "value" }) => {
  const [tooltip, setTooltip] = useState(null);
  const filtered = (data || []).filter((item) => Number(item[valueKey] || 0) > 0).slice(0, 6);

  if (!filtered.length) return <EmptyState />;

  const width = 560;
  const height = 220;
  const padding = 36;
  const max = Math.max(...filtered.map((item) => Number(item[valueKey] || 0)), 1);
  const barSpace = (width - padding * 2) / Math.max(filtered.length, 1);
  const barWidth = Math.min(46, Math.max(barSpace * 0.48, 18));

  const shortLabel = (label) => {
    const text = String(label || "Unknown");
    return text.length > 13 ? `${text.slice(0, 12)}…` : text;
  };

  return (
    <div className="overflow-hidden">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-56 w-full" onMouseLeave={() => setTooltip(null)}>
        {[0, 1, 2, 3].map((line) => {
          const gy = padding + line * ((height - padding * 2) / 3);
          return <line key={line} x1={padding} y1={gy} x2={width - padding} y2={gy} stroke="#edf2f7" strokeWidth="1" />;
        })}

        {filtered.map((item, index) => {
          const label = item[labelKey] || "Unknown";
          const value = Number(item[valueKey] || 0);
          const barHeight = (value / max) * (height - padding * 2);
          const x = padding + index * barSpace + (barSpace - barWidth) / 2;
          const y = height - padding - barHeight;
          const color = campusColors[index % campusColors.length];

          return (
            <g key={label}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx="6"
                fill={color}
                className="transition-opacity hover:opacity-90"
              />
              <rect
                x={padding + index * barSpace}
                y={padding}
                width={barSpace}
                height={height - padding * 2}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() =>
                  setTooltip({
                    x: padding + index * barSpace + barSpace / 2,
                    y: Math.max(y - 10, 28),
                    label,
                    value,
                    color,
                  })
                }
                onMouseMove={() =>
                  setTooltip({
                    x: padding + index * barSpace + barSpace / 2,
                    y: Math.max(y - 10, 28),
                    label,
                    value,
                    color,
                  })
                }
              />
              <text x={x + barWidth / 2} y={Math.max(y - 6, 20)} textAnchor="middle" fontSize="10" fontWeight="700" fill="#334155">
                {numberFormat.format(value)}
              </text>
              <text x={x + barWidth / 2} y={height - 10} textAnchor="middle" fontSize="9" fill="#64748b">
                {shortLabel(label)}
              </text>
            </g>
          );
        })}

        {tooltip && (
          <g>
            <rect
              x={Math.min(Math.max(tooltip.x - 72, 8), width - 150)}
              y={Math.max(tooltip.y - 48, 8)}
              width="144"
              height="42"
              rx="8"
              fill="white"
              stroke="#e2e8f0"
              filter="drop-shadow(0 8px 14px rgba(15, 23, 42, 0.14))"
            />
            <circle cx={Math.min(Math.max(tooltip.x - 60, 20), width - 138)} cy={Math.max(tooltip.y - 24, 32)} r="4" fill={tooltip.color} />
            <text x={Math.min(Math.max(tooltip.x - 50, 30), width - 128)} y={Math.max(tooltip.y - 27, 29)} fontSize="10" fontWeight="700" fill="#0f172a">
              {String(tooltip.label).length > 18 ? `${String(tooltip.label).slice(0, 17)}…` : tooltip.label}
            </text>
            <text x={Math.min(Math.max(tooltip.x - 50, 30), width - 128)} y={Math.max(tooltip.y - 13, 43)} fontSize="10" fill="#475569">
              Jobs: {numberFormat.format(tooltip.value)}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
};


const SimpleBarList = ({ data, labelKey = "name", valueKey = "value" }) => {
  const filtered = (data || []).filter((item) => Number(item[valueKey] || 0) > 0);
  const max = Math.max(...filtered.map((item) => Number(item[valueKey] || 0)), 1);

  if (!filtered.length) return <EmptyState />;

  return (
    <div className="space-y-3 pt-4">
      {filtered.map((item, index) => {
        const label = item[labelKey] || "Unknown";
        const value = Number(item[valueKey] || 0);

        return (
          <div key={label} className="group relative grid grid-cols-[150px_1fr_40px] items-center gap-3 text-xs">
            <span className="truncate text-right font-semibold text-slate-600">{label}</span>
            <div className="h-7 overflow-hidden rounded-lg bg-slate-100">
              <div
                className="h-full rounded-lg transition-all group-hover:opacity-90"
                style={{
                  width: `${Math.max((value / max) * 100, 5)}%`,
                  backgroundColor: campusColors[index % campusColors.length],
                }}
              />
            </div>
            <span className="font-extrabold text-slate-800">{numberFormat.format(value)}</span>
            <div className="pointer-events-none absolute left-40 top-[-38px] z-10 hidden rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-700 shadow-lg group-hover:block">
              {label}: {numberFormat.format(value)}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const Legend = ({ keys, colors }) => (
  <div className="flex flex-wrap justify-center gap-4 text-[10px] font-semibold text-slate-600">
    {keys.map((key, index) => (
      <span key={key} className="inline-flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />
        {key}
      </span>
    ))}
  </div>
);

const ChartCard = ({ title, subtitle, children, className = "" }) => (
  <div className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
    <div className="mb-3">
      <h2 className="text-sm font-extrabold text-slate-800">{title}</h2>
      <p className="text-[11px] text-slate-500">{subtitle}</p>
    </div>
    {children}
  </div>
);

const getStoredAdmin = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
};

const getAdminName = (user) => {
  const fullName = [user?.firstName, user?.middleName, user?.lastName]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  return user?.fullName || fullName || user?.username || user?.email || "Admin";
};

const getInitials = (name) => {
  const clean = String(name || "Admin").trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return clean.slice(0, 2).toUpperCase();
};

const formatNotificationTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  const diff = Date.now() - date.getTime();

  if (Number.isNaN(diff)) return "";
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return "Just now";
  if (diff < hour) return `${Math.floor(diff / minute)} minute${Math.floor(diff / minute) === 1 ? "" : "s"} ago`;
  if (diff < day) return `${Math.floor(diff / hour)} hour${Math.floor(diff / hour) === 1 ? "" : "s"} ago`;
  if (diff < day * 2) return "Yesterday";

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const AdminTopActions = () => {
  const navigate = useNavigate();
  const [admin] = useState(getStoredAdmin);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [isSignOutModalVisible, setIsSignOutModalVisible] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const adminName = getAdminName(admin);
  const adminImage = admin?.profileImage || admin?.avatar || admin?.image || "";

  const openSignOutModal = () => {
    if (isSigningOut) return;
    setIsProfileOpen(false);
    setIsNotificationOpen(false);
    setShowSignOutModal(true);
    window.setTimeout(() => setIsSignOutModalVisible(true), 30);
  };

  const closeSignOutModal = () => {
    if (isSigningOut) return;
    setIsSignOutModalVisible(false);
    window.setTimeout(() => setShowSignOutModal(false), 180);
  };

  const handleSignOut = () => {
    if (isSigningOut) return;

    setIsSigningOut(true);
    setIsSignOutModalVisible(false);

    window.setTimeout(() => {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      sessionStorage.clear();
      setShowSignOutModal(false);
      setIsSigningOut(false);
      navigate("/admin/login");
    }, 180);
  };

  const fetchNotifications = async () => {
    try {
      const response = await api.get("/notifications");
      const data = response.data || {};
      setNotifications(Array.isArray(data.notifications) ? data.notifications : []);
      setUnreadCount(Number(data.unreadCount || 0));
    } catch (error) {
      console.error("Admin notifications error:", error);
      setNotifications([]);
      setUnreadCount(0);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    const closeDropdowns = () => {
      setIsNotificationOpen(false);
      setIsProfileOpen(false);
    };

    window.addEventListener("click", closeDropdowns);
    return () => window.removeEventListener("click", closeDropdowns);
  }, []);

  const markAllAsRead = async () => {
    try {
      await api.put("/notifications/mark-all-read");
      setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Mark all notifications error:", error);
    }
  };

  const openNotification = async (notification) => {
    try {
      if (!notification?.isRead && notification?._id) {
        await api.put(`/notifications/${notification._id}/read`);
        setNotifications((prev) =>
          prev.map((item) => (item._id === notification._id ? { ...item, isRead: true } : item))
        );
        setUnreadCount((prev) => Math.max(prev - 1, 0));
      }

      if (notification?.link) {
        navigate(notification.link);
      }
    } catch (error) {
      console.error("Open notification error:", error);
    }
  };

  return (
    <div className="relative flex items-center justify-end gap-2">
      <div className="relative">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setIsNotificationOpen((prev) => !prev);
            setIsProfileOpen(false);
          }}
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-700 transition hover:bg-slate-100"
          aria-label="Open notifications"
        >
          <Bell size={18} />
          {unreadCount > 0 ? (
            <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-[#2e66a6] ring-2 ring-white" />
          ) : null}
        </button>

        {isNotificationOpen ? (
          <div
            onClick={(event) => event.stopPropagation()}
            className="absolute right-0 top-12 z-50 w-[360px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl ring-1 ring-black/5"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h3 className="text-base font-bold text-slate-900">Notifications</h3>
              <button
                type="button"
                onClick={markAllAsRead}
                className="text-xs font-semibold text-[#2e66a6] transition hover:text-[#255487] focus:outline-none focus:ring-2 focus:ring-[#2e66a6]/20 rounded-md px-1 py-0.5"
              >
                Mark all as read
              </button>
            </div>

            <div className="max-h-[420px] overflow-y-auto">
              {notifications.length ? (
                notifications.slice(0, 8).map((notification) => (
                  <button
                    type="button"
                    key={notification._id}
                    onClick={() => openNotification(notification)}
                    className={`flex w-full items-start gap-3 px-5 py-4 text-left transition hover:bg-slate-50 ${
                      !notification.isRead ? "bg-slate-100" : "bg-white"
                    }`}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[#2e66a6]">
                      <UserRound size={22} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-5 text-slate-700">
                        <span className="font-semibold">{notification.title}</span>{" "}
                        {notification.message}
                      </p>
                      <p className="mt-1 text-xs font-medium text-slate-500">
                        {formatNotificationTime(notification.createdAt)}
                      </p>
                    </div>
                    {!notification.isRead ? <span className="mt-4 h-2.5 w-2.5 shrink-0 rounded-full bg-[#2e66a6]" /> : null}
                  </button>
                ))
              ) : (
                <div className="px-5 py-10 text-center">
                  <p className="text-sm font-semibold text-slate-800">No notifications yet.</p>
                  <p className="mt-1 text-xs font-normal text-slate-500">New updates and activity will appear here.</p>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setIsNotificationOpen(false);
                navigate("/admin/notifications");
              }}
              className="block w-full border-t border-slate-100 px-5 py-4 text-center text-sm font-semibold text-[#2e66a6] transition hover:bg-slate-50 hover:text-[#255487] focus:outline-none focus:ring-2 focus:ring-[#2e66a6]/20 focus:ring-inset"
            >
              View all notifications
            </button>
          </div>
        ) : null}
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setIsProfileOpen((prev) => !prev);
            setIsNotificationOpen(false);
          }}
          className="inline-flex items-center gap-2 rounded-full px-1.5 py-1 transition hover:bg-slate-100"
          aria-label="Open admin profile"
        >
          {adminImage ? (
            <img src={adminImage} alt={adminName} className="h-9 w-9 rounded-full object-cover" />
          ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-xs font-extrabold text-slate-700">
              {getInitials(adminName)}
            </span>
          )}
          <span className="hidden max-w-[120px] truncate text-xs font-bold text-slate-800 sm:block">{adminName}</span>
          <ChevronDown size={14} className="text-slate-500" />
        </button>

        {isProfileOpen ? (
          <div
            onClick={(event) => event.stopPropagation()}
            className="absolute right-0 top-12 z-50 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl ring-1 ring-black/5"
          >
            <div className="px-4 py-4">
              <p className="truncate text-sm font-semibold text-slate-900">{adminName}</p>
              <p className="mt-0.5 truncate text-xs text-slate-500">{admin?.email || "Admin account"}</p>
            </div>

            <div className="border-t border-slate-100 p-2">
              <button
                type="button"
                onClick={() => {
                  setIsProfileOpen(false);
                  navigate("/admin/profile");
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-[#2e66a6] focus:outline-none focus:ring-2 focus:ring-[#2e66a6]/20"
              >
                <UserRound size={16} />
                Admin Profile
              </button>

              <button
                type="button"
                onClick={openSignOutModal}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition hover:bg-red-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-red-500/20"
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </div>
          </div>
        ) : null}
      </div>
      {showSignOutModal ? (
        <div
          className={`fixed inset-0 z-[9999] flex items-center justify-center bg-black/10 px-4 transition-opacity duration-200 ${
            isSignOutModalVisible ? "opacity-100" : "opacity-0"
          }`}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeSignOutModal();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-signout-title"
            aria-describedby="admin-signout-description"
            className={`w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all duration-200 ${
              isSignOutModalVisible ? "scale-100 opacity-100" : "scale-95 opacity-0"
            }`}
          >
            <div className="p-6 text-center sm:p-7">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full">
                <img
                  src="/images/error.png"
                  alt=""
                  aria-hidden="true"
                  className="h-14 w-14 object-contain"
                  draggable="false"
                />
              </div>

              <h2 id="admin-signout-title" className="text-xl font-bold text-slate-900">
                Sign out?
              </h2>

              <p id="admin-signout-description" className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-600">
                You will be signed out of your admin account. You can sign in again anytime.
              </p>

              <div className="mt-6 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={closeSignOutModal}
                  disabled={isSigningOut}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-6 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#2e66a6]/20 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-red-600 px-6 text-sm font-semibold text-white transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSigningOut ? "Signing out..." : "Sign Out"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(
    location.pathname === "/admin/analytics" ? "trends" : "overview"
  );
  const [dashboard, setDashboard] = useState(defaultDashboard);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportingCharts, setExportingCharts] = useState(false);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    date: "all",
    startDate: "",
    endDate: "",
    campus: "all",
    applicationStatus: "all",
    employmentType: "all",
    workMode: "all",
  });
  const [showCustomDateModal, setShowCustomDateModal] = useState(false);
  const [useSampleData, setUseSampleData] = useState(false);

  const sampleDashboard = useMemo(() => buildDummyDashboardData(filters), [filters]);
  const activeDashboard = useSampleData ? sampleDashboard : dashboard;

  useEffect(() => {
    setActiveTab(location.pathname === "/admin/analytics" ? "trends" : "overview");
  }, [location.pathname]);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/admin/dashboard", { params: filters });
      const payload = response.data || defaultDashboard;
      const campuses = uniqueCampuses(payload?.filters?.options?.campuses || []);
      const payloadCharts = payload?.charts || defaultDashboard.charts;
      const normalizedCharts = {
        ...payloadCharts,
        applicationTrends: mergeCampusSeries(payloadCharts.applicationTrends || []),
        jobPostingTrends: mergeCampusSeries(payloadCharts.jobPostingTrends || []),
        registrationTrends: mergeCampusSeries(payloadCharts.registrationTrends || []),
        hireRateByCampus: mergeCampusSeries(payloadCharts.hireRateByCampus || []),
      };

      setDashboard({
        ...payload,
        charts: normalizedCharts,
        filters: {
          ...(payload.filters || {}),
          options: {
            ...(payload?.filters?.options || {}),
            campuses,
          },
        },
      });
    } catch (err) {
      console.error("Admin dashboard error:", err);
      setError(err?.response?.data?.message || "Unable to load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    try {
      setExporting(true);
      const workbook = buildDashboardWorkbook({ dashboard: activeDashboard, filters, campusKeys });
      const dateStamp = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(workbook, `admin-dashboard-export-${dateStamp}.xlsx`);
    } catch (err) {
      console.error("Admin dashboard export error:", err);
      setError("Unable to export dashboard data.");
    } finally {
      setExporting(false);
    }
  };

  const handleExportCharts = () => {
    try {
      setExportingCharts(true);
      const workbook = buildChartsWorkbook({ dashboard: activeDashboard, filters, campusKeys });
      const dateStamp = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(workbook, `admin-dashboard-charts-export-${dateStamp}.xlsx`);
    } catch (err) {
      console.error("Admin dashboard charts export error:", err);
      setError("Unable to export chart data.");
    } finally {
      setExportingCharts(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.date, filters.startDate, filters.endDate, filters.campus, filters.applicationStatus, filters.employmentType, filters.workMode]);

  const filterOptions = activeDashboard?.filters?.options || defaultDashboard.filters.options;

  const campusKeys = useMemo(() => {
    const campuses = uniqueCampuses(filterOptions.campuses || []);
    if (filters.campus !== "all") {
      const selectedCampus = normalizeCampusLabel(filters.campus);
      return campuses.filter((campus) => campus === selectedCampus);
    }
    return campuses;
  }, [filterOptions.campuses, filters.campus]);

  const updateFilter = (key, value) => setFilters((prev) => ({ ...prev, [key]: value }));
  const updateDateFilter = (value) => {
    if (value === "custom") {
      setShowCustomDateModal(true);
      return;
    }

    setFilters((prev) => ({ ...prev, date: value, startDate: "", endDate: "" }));
  };
  const applyCustomDateRange = (startDate, endDate) => {
    setFilters((prev) => ({ ...prev, date: "custom", startDate, endDate }));
    setShowCustomDateModal(false);
  };
  const clearFilters = () => setFilters({ date: "all", startDate: "", endDate: "", campus: "all", applicationStatus: "all", employmentType: "all", workMode: "all" });

  const hasFilter = filters.date !== "all" || filters.campus !== "all" || filters.applicationStatus !== "all" || filters.employmentType !== "all" || filters.workMode !== "all";
  const stats = activeDashboard?.stats || defaultDashboard.stats;
  const charts = activeDashboard?.charts || defaultDashboard.charts;

  return (
    <div className="mx-auto max-w-7xl px-1 py-8">
      <div className="space-y-5">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900">Admin Dashboard</h1>
            <p className="text-xs text-slate-500">Overview of jobs, users, applications, and hiring activity.</p>
          </div>

          <AdminTopActions />
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <SampleDataToggle enabled={useSampleData} onChange={setUseSampleData} />

          <button
            type="button"
            onClick={handleExportCharts}
            disabled={(loading && !useSampleData) || exportingCharts}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#2e66a6]/20 bg-white px-4 text-xs font-bold text-[#2e66a6] shadow-sm transition hover:bg-[#2e66a6]/10 focus:outline-none focus:ring-2 focus:ring-[#2e66a6]/20 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {exportingCharts ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
            {exportingCharts ? "Exporting Charts..." : "Export Charts"}
          </button>

          <button
            type="button"
            onClick={handleExport}
            disabled={(loading && !useSampleData) || exporting}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#2e66a6] px-4 text-xs font-bold text-white shadow-sm transition hover:bg-[#255487] focus:outline-none focus:ring-2 focus:ring-[#2e66a6]/30 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {exporting ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
            {exporting ? "Exporting..." : "Export"}
          </button>
        </div>

        {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div> : null}

        {useSampleData ? (
          <div className="rounded-xl border border-[#2e66a6]/20 bg-[#2e66a6]/10 px-4 py-3 text-xs font-semibold text-[#2e66a6]">
            Sample Data Mode is ON. Charts and cards are using 6,000 generated demo records from 1950 to the current year.
          </div>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 mb-6">
          <StatCard
            label="Jobs"
            value={stats.totalJobs}
            imageSrc={statCardImages.jobs}
            icon={Briefcase}
            onClick={() => navigate("/admin/dashboard/jobs")}
            ariaLabel="Open all jobs"
          />
          <StatCard
            label="Job Seekers"
            value={stats.totalJobSeekers}
            imageSrc={statCardImages.jobSeekers}
            icon={Users}
            onClick={() => navigate("/admin/dashboard/job-seekers")}
            ariaLabel="Open all job seekers"
          />
          <StatCard
            label="Employers"
            value={stats.totalEmployers}
            imageSrc={statCardImages.employers}
            icon={Building2}
            onClick={() => navigate("/admin/dashboard/employers")}
            ariaLabel="Open all employers"
          />
          <StatCard
            label="Pending Seekers"
            value={stats.pendingSeekers}
            imageSrc={statCardImages.pendingSeekers}
            icon={UserCheck}
            onClick={() => navigate("/admin/dashboard/pending-seekers")}
            ariaLabel="Open pending job seekers"
          />
          <StatCard
            label="Pending Employers"
            value={stats.pendingEmployers}
            imageSrc={statCardImages.pendingEmployers}
            icon={FileClock}
            onClick={() => navigate("/admin/dashboard/pending-employers")}
            ariaLabel="Open pending employers"
          />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_1fr_auto] lg:items-end">
            <DateFilterDropdown value={filters.date} startDate={filters.startDate} endDate={filters.endDate} disabled={loading} onSelect={updateDateFilter} />
            <FilterSelect label="Campus" value={filters.campus} disabled={loading} onChange={(value) => updateFilter("campus", value)} options={[{ value: "all", label: "All Campus" }, ...(filterOptions.campuses || []).map((campus) => ({ value: campus, label: campus }))]} />
            <FilterSelect label="Application Status" value={filters.applicationStatus} disabled={loading} onChange={(value) => updateFilter("applicationStatus", value)} options={[{ value: "all", label: "All Status" }, ...(filterOptions.applicationStatuses || []).map((status) => ({ value: status, label: status.charAt(0).toUpperCase() + status.slice(1) }))]} />
            <FilterSelect label="Employment Type" value={filters.employmentType} disabled={loading} onChange={(value) => updateFilter("employmentType", value)} options={[{ value: "all", label: "All Types" }, ...(filterOptions.employmentTypes || []).map((type) => ({ value: type, label: type }))]} />
            <FilterSelect label="Work Mode" value={filters.workMode} disabled={loading} onChange={(value) => updateFilter("workMode", value)} options={[{ value: "all", label: "All Modes" }, ...(filterOptions.workModes || []).map((mode) => ({ value: mode, label: mode }))]} />
            <button
              type="button"
              onClick={clearFilters}
              disabled={loading || !hasFilter}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw size={13} /> Clear All
            </button>
          </div>
        </div>

        <div className="border-b border-slate-200">
          {[
            { key: "overview", label: "Overview" },
            { key: "trends", label: "Trends" },
          ].map((tab) => (
            <button
              type="button"
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`mr-6 border-b-2 px-1 pb-3 text-xs font-bold transition ${activeTab === tab.key ? "border-[#2e66a6] text-[#2e66a6]" : "border-transparent text-slate-500 hover:text-slate-800"}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading && !useSampleData ? (
          <div className="flex h-80 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-500">
            <RefreshCw size={18} className="mr-2 animate-spin" /> Loading dashboard data...
          </div>
        ) : activeTab === "overview" ? (
          <div className="grid gap-5 lg:grid-cols-2">
            <ChartCard title="Applications Trend" subtitle="Last records by campus">
              <LineChart data={charts.applicationTrends || []} keys={campusKeys} />
            </ChartCard>
            <ChartCard title="Top Job Categories" subtitle="Active jobs grouped by category">
              <VerticalBarChart data={charts.topJobCategories || []} />
            </ChartCard>
            <ChartCard title="Application Status" subtitle="Breakdown by current status">
              <DonutChart data={(charts.applicationStatus || []).filter((item) => item.value > 0)} />
            </ChartCard>
            <ChartCard title="Work Mode Distribution" subtitle="Across all active jobs">
              <DonutChart data={(charts.workModeDistribution || []).filter((item) => item.value > 0)} colors={["#6366f1", "#063b69", "#c48a00", "#198754"]} />
            </ChartCard>
            <ChartCard title="Top 5 Companies Hiring" subtitle="By number of active job postings" className="lg:col-span-2">
              <BarChart data={charts.topHiringCompanies || []} horizontal />
            </ChartCard>
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            <ChartCard title="Applications by Campus" subtitle="Monthly trend overview">
              <LineChart data={charts.applicationTrends || []} keys={campusKeys} />
            </ChartCard>
            <ChartCard title="Active Jobs by Employment Type" subtitle="Current active jobs grouped by type">
              <SimpleBarList data={charts.employmentTypeDistribution || []} />
            </ChartCard>
            <ChartCard title="Job Seeker Registrations" subtitle="Monthly new registrations by campus">
              <BarChart data={charts.registrationTrends || []} keys={campusKeys} />
            </ChartCard>
            <ChartCard title="Hire Rate by Campus" subtitle="Hired jobseekers by campus over time">
              <LineChart data={charts.hireRateByCampus || []} keys={campusKeys} />
            </ChartCard>
          </div>
        )}

        <CustomDateRangeModal
          open={showCustomDateModal}
          startDate={filters.startDate}
          endDate={filters.endDate}
          onCancel={() => setShowCustomDateModal(false)}
          onApply={applyCustomDateRange}
        />

       
      </div>
    </div>
  );
};

export default AdminDashboard;
