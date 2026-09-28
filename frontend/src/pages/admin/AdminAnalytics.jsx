import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  Download,
  FileCheck2,
  Filter,
  Mail,
  MessageSquare,
  RefreshCw,
  ShieldAlert,
  UserRoundCheck,
  Users,
} from "lucide-react";
import * as XLSX from "xlsx";
import api from "../../services/api";

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
    activeJobs: 0,
    applications: 0,
    hired: 0,
    hireRate: 0,
    pendingVerification: 0,
    unreadMessages: 0,
    systemFailures: 0,
  },
  trends: [],
  filters: { options: {} },
  sections: {
    users: { roles: [], statuses: [], verification: [], campuses: [] },
    jobs: { statuses: [], categories: [], employmentTypes: [], workModes: [], totalVacancies: 0, totalViews: 0 },
    applications: { funnel: [], interviewRate: 0, hireRate: 0, employmentStatus: [] },
    verification: { emailRequests: 0, emailVerified: 0, emailCompletionRate: 0, byRole: [] },
    operations: {
      editRequests: [], editRequestSections: [], messages: [], messageRead: [],
      conversationPreferences: [], notifications: [], notificationRead: [],
      community: { categories: [], posts: 0, deleted: 0, sensitive: 0, reports: 0, engagement: 0 },
      system: { statuses: [], modules: [], methods: [], p95DurationMs: 0, serverErrors: 0 },
    },
  },
};

const initialFilters = {
  date: "overall",
  dateField: "primary",
  specificDate: "",
  startDate: "",
  endDate: "",
  role: "all",
  campus: "all",
  userStatus: "all",
  verificationStatus: "all",
  jobStatus: "all",
  category: "all",
  jobType: "all",
  workMode: "all",
  applicationStatus: "all",
  company: "all",
  editRequestStatus: "all",
  messageType: "all",
  notificationType: "all",
  communityCategory: "all",
  logStatus: "all",
  logModule: "all",
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

const colors = ["#2e66a6", "#16a36f", "#dc9300", "#6366f1", "#dc2626", "#64748b", "#0891b2"];

const titleCase = (value) => String(value || "")
  .replace(/[_-]+/g, " ")
  .replace(/\b\w/g, (letter) => letter.toUpperCase());

const StatCard = ({ label, value, suffix = "", imageSrc, icon: Icon }) => (
  <div className="group relative min-h-[132px] w-full overflow-hidden rounded-2xl bg-gradient-to-br from-[#072258] via-[#2d63a0] to-[#52b2db] px-6 py-5 text-left text-white shadow-[0_10px_30px_rgba(0,0,0,0.18)] transition-all duration-500 ease-out hover:scale-[1.02] hover:brightness-105 hover:shadow-[0_20px_50px_rgba(0,0,0,0.25)]">
    <div
      className="pointer-events-none absolute right-8 top-1/2 h-[70px] w-[70px] -translate-y-1/2 rounded-full blur-[35px]"
      style={{ background: "radial-gradient(circle, rgba(255,255,255,.25) 0%, rgba(255,255,255,.14) 45%, transparent 75%)" }}
    />
    <Icon className="pointer-events-none absolute right-5 top-1/2 h-16 w-16 -translate-y-1/2 text-white/10" aria-hidden="true" />
    <img
      src={imageSrc}
      alt=""
      aria-hidden="true"
      className="pointer-events-none absolute right-[-18px] top-1/2 h-20 w-20 -translate-y-1/2 object-contain opacity-50 mix-blend-soft-light saturate-150 transition-all duration-700 group-hover:right-[-15px] group-hover:scale-105"
      style={{ WebkitMaskImage: "radial-gradient(circle at 35% 50%, #000 0%, rgba(0,0,0,.6) 55%, transparent 80%)", maskImage: "radial-gradient(circle at 35% 50%, #000 0%, rgba(0,0,0,.6) 55%, transparent 80%)" }}
    />
    <div className="relative z-10">
      <h3 className="text-3xl font-semibold leading-none">{numberFormat.format(Number(value || 0))}{suffix}</h3>
      <p className="mt-3 flex items-center gap-1 whitespace-nowrap text-sm text-white/90">
        <span>{label}</span><span className="ml-1 text-base font-bold">&gt;</span>
      </p>
    </div>
    <div className="pointer-events-none absolute inset-0 rounded-2xl border-2 border-transparent transition group-hover:border-white/20" />
  </div>
);

const FilterSelect = ({ label, value, onChange, values = [], allLabel = "All", disabled = false }) => (
  <label className="block min-w-0">
    <span className="mb-1 block text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500">{label}</span>
    <select
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none transition focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/20 disabled:bg-slate-50"
    >
      <option value="all">{allLabel}</option>
      {values.map((item) => <option key={item} value={item}>{titleCase(item)}</option>)}
    </select>
  </label>
);

const DateInput = ({ label, value, onChange }) => (
  <label className="block">
    <span className="mb-1 block text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500">{label}</span>
    <input
      type="date"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/20"
    />
  </label>
);

const ChartCard = ({ title, subtitle, children, className = "" }) => (
  <section className={`min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
    <div className="mb-4">
      <h2 className="text-sm font-extrabold text-slate-800">{title}</h2>
      {subtitle ? <p className="mt-0.5 text-[11px] text-slate-500">{subtitle}</p> : null}
    </div>
    {children}
  </section>
);

const EmptyChart = () => <div className="flex h-44 items-center justify-center text-xs font-medium text-slate-400">No data for the selected filters.</div>;

const HorizontalBars = ({ data = [], maxItems = 8, percentage = false }) => {
  const rows = data.slice(0, maxItems);
  const max = Math.max(1, ...rows.map((item) => Number(item.value || 0)));
  if (!rows.length) return <EmptyChart />;
  return (
    <div className="space-y-3">
      {rows.map((item, index) => (
        <div key={`${item.name}-${index}`} className="grid grid-cols-[minmax(90px,140px)_1fr_auto] items-center gap-3 text-xs">
          <span className="truncate text-right font-semibold text-slate-600" title={titleCase(item.name)}>{titleCase(item.name)}</span>
          <div className="h-7 overflow-hidden rounded-lg bg-slate-100">
            <div className="h-full min-w-[3px] rounded-lg transition-all" style={{ width: `${Math.max(2, (Number(item.value || 0) / max) * 100)}%`, backgroundColor: colors[index % colors.length] }} />
          </div>
          <span className="w-10 text-right font-bold text-slate-700">{numberFormat.format(Number(item.value || 0))}{percentage ? "%" : ""}</span>
        </div>
      ))}
    </div>
  );
};

const DonutChart = ({ data = [] }) => {
  const rows = data.filter((item) => Number(item.value || 0) > 0);
  const total = rows.reduce((sum, item) => sum + Number(item.value || 0), 0);
  if (!rows.length || !total) return <EmptyChart />;
  let cursor = 0;
  const stops = rows.map((item, index) => {
    const start = cursor;
    cursor += (Number(item.value || 0) / total) * 100;
    return `${colors[index % colors.length]} ${start}% ${cursor}%`;
  });
  return (
    <div className="grid min-h-48 items-center gap-5 sm:grid-cols-[170px_1fr]">
      <div className="relative mx-auto h-36 w-36 rounded-full" style={{ background: `conic-gradient(${stops.join(",")})` }}>
        <div className="absolute inset-7 flex flex-col items-center justify-center rounded-full bg-white">
          <span className="text-2xl font-extrabold text-slate-800">{numberFormat.format(total)}</span>
          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Total</span>
        </div>
      </div>
      <div className="space-y-2">
        {rows.slice(0, 8).map((item, index) => (
          <div key={item.name} className="flex items-center justify-between gap-3 text-xs">
            <span className="flex min-w-0 items-center gap-2 text-slate-600"><i className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: colors[index % colors.length] }} /><span className="truncate">{titleCase(item.name)}</span></span>
            <strong className="text-slate-800">{numberFormat.format(item.value)}</strong>
          </div>
        ))}
      </div>
    </div>
  );
};

const TrendChart = ({ data = [] }) => {
  const series = [
    ["registrations", "Registrations", "#2e66a6"],
    ["jobs", "Jobs", "#16a36f"],
    ["applications", "Applications", "#dc9300"],
    ["hires", "Hires", "#6366f1"],
  ];
  if (!data.length) return <EmptyChart />;
  const width = 760;
  const height = 250;
  const left = 42;
  const top = 18;
  const plotWidth = width - left - 18;
  const plotHeight = height - top - 45;
  const max = Math.max(1, ...data.flatMap((item) => series.map(([key]) => Number(item[key] || 0))));
  const point = (item, index, key) => {
    const x = left + (data.length === 1 ? plotWidth / 2 : (index / (data.length - 1)) * plotWidth);
    const y = top + plotHeight - (Number(item[key] || 0) / max) * plotHeight;
    return `${x},${y}`;
  };
  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[250px] w-full" role="img" aria-label="Monthly analytics trend chart">
        {[0, .25, .5, .75, 1].map((ratio) => {
          const y = top + plotHeight - ratio * plotHeight;
          return <g key={ratio}><line x1={left} y1={y} x2={width - 18} y2={y} stroke="#e2e8f0" /><text x={left - 8} y={y + 4} textAnchor="end" fontSize="10" fill="#64748b">{Math.round(max * ratio)}</text></g>;
        })}
        {series.map(([key, , color]) => <polyline key={key} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={data.map((item, index) => point(item, index, key)).join(" ")} />)}
        {data.map((item, index) => {
          if (data.length > 10 && index % Math.ceil(data.length / 8) !== 0 && index !== data.length - 1) return null;
          const x = left + (data.length === 1 ? plotWidth / 2 : (index / (data.length - 1)) * plotWidth);
          return <text key={`${item.label}-${index}`} x={x} y={height - 10} textAnchor="middle" fontSize="10" fill="#64748b">{item.label}</text>;
        })}
      </svg>
      <div className="flex flex-wrap justify-center gap-4">
        {series.map(([, label, color]) => <span key={label} className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600"><i className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />{label}</span>)}
      </div>
    </div>
  );
};

const FunnelChart = ({ data = [] }) => {
  const rows = data.filter((item) => Number(item.value || 0) > 0);
  const max = Math.max(1, ...rows.map((item) => item.value));
  if (!rows.length) return <EmptyChart />;
  return (
    <div className="space-y-2.5 py-2">
      {rows.map((item, index) => {
        const width = Math.max(28, (item.value / max) * 100);
        return (
          <div key={item.name} className="text-center">
            <div className="mx-auto flex h-9 items-center justify-center rounded-lg px-3 text-xs font-bold text-white shadow-sm" style={{ width: `${width}%`, backgroundColor: colors[index % colors.length] }}>
              <span className="truncate">{titleCase(item.name)} · {numberFormat.format(item.value)}</span>
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
      <div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-2xl font-extrabold text-slate-800">{numberFormat.format(Number(value || 0))}{suffix}</p></div>
      <div className="rounded-xl bg-[#2e66a6]/10 p-2.5 text-[#2e66a6]"><Icon size={20} /></div>
    </div>
  </div>
);

const AdminAnalytics = () => {
  const [analytics, setAnalytics] = useState(emptyAnalytics);
  const [filters, setFilters] = useState(initialFilters);
  const [activeTab, setActiveTab] = useState("overview");
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);

  const options = analytics?.filters?.options || {};
  const kpis = analytics?.kpis || emptyAnalytics.kpis;
  const sections = analytics?.sections || emptyAnalytics.sections;

  const requestParams = useMemo(() => {
    const next = { ...filters };
    if (next.date !== "specific") delete next.specificDate;
    if (next.date !== "range") { delete next.startDate; delete next.endDate; }
    return next;
  }, [filters]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/admin/analytics", { params: requestParams });
      setAnalytics({ ...emptyAnalytics, ...(response.data || {}), sections: { ...emptyAnalytics.sections, ...(response.data?.sections || {}) } });
    } catch (err) {
      console.error("Admin analytics error:", err);
      setError(err?.response?.data?.message || "Unable to load analytics data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchAnalytics, 180);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestParams]);

  const updateFilter = (name, value) => setFilters((previous) => ({ ...previous, [name]: value }));
  const resetFilters = () => setFilters(initialFilters);
  const hasFilters = JSON.stringify(filters) !== JSON.stringify(initialFilters);

  const exportAnalytics = () => {
    try {
      setExporting(true);
      const workbook = XLSX.utils.book_new();
      const addSheet = (name, rows) => XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows?.length ? rows : [{ Message: "No data" }]), name.slice(0, 31));
      addSheet("KPIs", Object.entries(kpis).map(([metric, value]) => ({ Metric: titleCase(metric), Value: value })));
      addSheet("Trends", analytics.trends || []);
      addSheet("Application Funnel", sections.applications?.funnel || []);
      addSheet("Job Categories", sections.jobs?.categories || []);
      addSheet("User Verification", sections.users?.verification || []);
      addSheet("Messages", sections.operations?.messages || []);
      addSheet("Notifications", sections.operations?.notifications || []);
      addSheet("System Modules", sections.operations?.system?.modules || []);
      XLSX.writeFile(workbook, `admin-analytics-${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (err) {
      setError("Unable to export analytics data.");
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
    <main className="mx-auto max-w-7xl px-1 py-8">
      <div className="space-y-5">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900">Admin Analytics</h1>
            <p className="text-xs text-slate-500">Compact system-wide analysis of users, jobs, applications, verification, engagement, and operations.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={fetchAnalytics} disabled={loading} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600 shadow-sm hover:bg-slate-50 disabled:opacity-60">
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
            <button type="button" onClick={exportAnalytics} disabled={loading || exporting} className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#2e66a6] px-4 text-xs font-bold text-white shadow-sm hover:bg-[#255487] disabled:opacity-60">
              <Download size={14} /> {exporting ? "Exporting..." : "Export"}
            </button>
          </div>
        </header>

        {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div> : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Users" value={kpis.totalUsers} imageSrc={statCardImages.users} icon={Users} />
          <StatCard label="Active Jobs" value={kpis.activeJobs} imageSrc={statCardImages.jobs} icon={BriefcaseBusiness} />
          <StatCard label="Applications" value={kpis.applications} imageSrc={statCardImages.applications} icon={FileCheck2} />
          <StatCard label="Hired" value={kpis.hired} imageSrc={statCardImages.hired} icon={UserRoundCheck} />
          <StatCard label="Hire Rate" value={kpis.hireRate} suffix="%" imageSrc={statCardImages.rate} icon={CheckCircle2} />
          <StatCard label="Pending Verification" value={kpis.pendingVerification} imageSrc={statCardImages.verification} icon={Building2} />
          <StatCard label="Unread Messages" value={kpis.unreadMessages} imageSrc={statCardImages.messages} icon={MessageSquare} />
          <StatCard label="System Failures" value={kpis.systemFailures} imageSrc={statCardImages.failures} icon={ShieldAlert} />
        </div>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
            <label className="block">
              <span className="mb-1 block text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500">Date Range</span>
              <select value={filters.date} onChange={(event) => updateFilter("date", event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/20">
                {dateOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500">Date Based On</span>
              <select value={filters.dateField} onChange={(event) => updateFilter("dateField", event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/20">
                <option value="primary">Primary Event Date</option><option value="created">Record Created</option><option value="outcome">Outcome / Updated Date</option>
              </select>
            </label>
            {filters.date === "specific" ? <DateInput label="Specific Date" value={filters.specificDate} onChange={(value) => updateFilter("specificDate", value)} /> : null}
            {filters.date === "range" ? <><DateInput label="From" value={filters.startDate} onChange={(value) => updateFilter("startDate", value)} /><DateInput label="To" value={filters.endDate} onChange={(value) => updateFilter("endDate", value)} /></> : null}
            <FilterSelect label="Role" value={filters.role} onChange={(value) => updateFilter("role", value)} values={options.roles} allLabel="All Roles" />
            <FilterSelect label="Campus" value={filters.campus} onChange={(value) => updateFilter("campus", value)} values={options.campuses} allLabel="All Campuses" />
            <FilterSelect label="Application Status" value={filters.applicationStatus} onChange={(value) => updateFilter("applicationStatus", value)} values={options.applicationStatuses} allLabel="All Application Statuses" />
            <FilterSelect label="Job Type" value={filters.jobType} onChange={(value) => updateFilter("jobType", value)} values={options.jobTypes} allLabel="All Job Types" />
          </div>

          {showMoreFilters ? (
            <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
              <FilterSelect label="User Status" value={filters.userStatus} onChange={(value) => updateFilter("userStatus", value)} values={options.userStatuses} allLabel="All User Statuses" />
              <FilterSelect label="Verification" value={filters.verificationStatus} onChange={(value) => updateFilter("verificationStatus", value)} values={options.verificationStatuses} allLabel="All Verification Statuses" />
              <FilterSelect label="Job Status" value={filters.jobStatus} onChange={(value) => updateFilter("jobStatus", value)} values={options.jobStatuses} allLabel="All Job Statuses" />
              <FilterSelect label="Category" value={filters.category} onChange={(value) => updateFilter("category", value)} values={options.categories} allLabel="All Categories" />
              <FilterSelect label="Work Mode" value={filters.workMode} onChange={(value) => updateFilter("workMode", value)} values={options.workModes} allLabel="All Work Modes" />
              <FilterSelect label="Company" value={filters.company} onChange={(value) => updateFilter("company", value)} values={options.companies} allLabel="All Companies" />
              <FilterSelect label="Edit Request" value={filters.editRequestStatus} onChange={(value) => updateFilter("editRequestStatus", value)} values={options.editRequestStatuses} allLabel="All Edit Requests" />
              <FilterSelect label="Message Type" value={filters.messageType} onChange={(value) => updateFilter("messageType", value)} values={options.messageTypes} allLabel="All Message Types" />
              <FilterSelect label="Notification Type" value={filters.notificationType} onChange={(value) => updateFilter("notificationType", value)} values={options.notificationTypes} allLabel="All Notification Types" />
              <FilterSelect label="Community Category" value={filters.communityCategory} onChange={(value) => updateFilter("communityCategory", value)} values={options.communityCategories} allLabel="All Community Categories" />
              <FilterSelect label="Log Status" value={filters.logStatus} onChange={(value) => updateFilter("logStatus", value)} values={options.logStatuses} allLabel="All Log Statuses" />
              <FilterSelect label="Log Module" value={filters.logModule} onChange={(value) => updateFilter("logModule", value)} values={options.logModules} allLabel="All Log Modules" />
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-3">
            <button type="button" onClick={() => setShowMoreFilters((value) => !value)} className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#2e66a6]/20 bg-[#2e66a6]/5 px-4 text-xs font-bold text-[#2e66a6] hover:bg-[#2e66a6]/10"><Filter size={13} />{showMoreFilters ? "Hide Filters" : "More Filters"}</button>
            <button type="button" onClick={resetFilters} disabled={!hasFilters} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"><RefreshCw size={13} />Clear All</button>
          </div>
        </section>

        <nav className="flex gap-6 overflow-x-auto border-b border-slate-200" aria-label="Analytics sections">
          {tabs.map(([key, label]) => <button type="button" key={key} onClick={() => setActiveTab(key)} className={`shrink-0 border-b-2 px-1 pb-3 text-xs font-bold transition ${activeTab === key ? "border-[#2e66a6] text-[#2e66a6]" : "border-transparent text-slate-500 hover:text-slate-800"}`}>{label}</button>)}
        </nav>

        {loading ? <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-slate-200 bg-white"><RefreshCw className="animate-spin text-[#2e66a6]" size={28} /></div> : null}

        {!loading && activeTab === "overview" ? (
          <div className="grid gap-5 lg:grid-cols-2">
            <ChartCard title="System Activity Trend" subtitle="Registrations, jobs, applications, and hires by month" className="lg:col-span-2"><TrendChart data={analytics.trends} /></ChartCard>
            <ChartCard title="Application Funnel" subtitle="Current recruitment outcome distribution"><FunnelChart data={sections.applications?.funnel} /></ChartCard>
            <ChartCard title="Top Job Categories" subtitle="Jobs grouped by category"><HorizontalBars data={sections.jobs?.categories} /></ChartCard>
            <ChartCard title="User Roles" subtitle="Admin, employer, and jobseeker accounts"><DonutChart data={sections.users?.roles} /></ChartCard>
            <ChartCard title="Job Status" subtitle="Lifecycle state of job postings"><DonutChart data={sections.jobs?.statuses} /></ChartCard>
          </div>
        ) : null}

        {!loading && activeTab === "recruitment" ? (
          <div className="grid gap-5 lg:grid-cols-2">
            <ChartCard title="Application Funnel" subtitle="Pending through final outcome"><FunnelChart data={sections.applications?.funnel} /></ChartCard>
            <ChartCard title="Employment Type" subtitle="Job supply grouped by employment type"><HorizontalBars data={sections.jobs?.employmentTypes} /></ChartCard>
            <ChartCard title="Work Mode" subtitle="On-site, remote, blended, and work from home"><DonutChart data={sections.jobs?.workModes} /></ChartCard>
            <ChartCard title="Employment Status" subtitle="Status recorded for hired applicants"><HorizontalBars data={sections.applications?.employmentStatus} /></ChartCard>
            <ChartCard title="Recruitment KPIs" subtitle="Capacity, attention, and conversion" className="lg:col-span-2">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <MetricTile label="Total Vacancies" value={sections.jobs?.totalVacancies} icon={BriefcaseBusiness} />
                <MetricTile label="Job Views" value={sections.jobs?.totalViews} icon={Activity} />
                <MetricTile label="Interview Rate" value={sections.applications?.interviewRate} suffix="%" icon={UserRoundCheck} />
                <MetricTile label="Hire Rate" value={sections.applications?.hireRate} suffix="%" icon={CheckCircle2} />
              </div>
            </ChartCard>
          </div>
        ) : null}

        {!loading && activeTab === "users" ? (
          <div className="grid gap-5 lg:grid-cols-2">
            <ChartCard title="Verification Status" subtitle="Employer and jobseeker verification state"><HorizontalBars data={sections.users?.verification} /></ChartCard>
            <ChartCard title="Jobseekers by Campus" subtitle="Campus distribution from jobseeker profiles"><HorizontalBars data={sections.users?.campuses} /></ChartCard>
            <ChartCard title="Account Status" subtitle="Active, inactive, suspended, and pending users"><DonutChart data={sections.users?.statuses} /></ChartCard>
            <ChartCard title="Email Registration Verification" subtitle="Pending email records are subject to TTL cleanup">
              <div className="grid gap-3 sm:grid-cols-3">
                <MetricTile label="OTP Requests" value={sections.verification?.emailRequests} icon={Mail} />
                <MetricTile label="Verified" value={sections.verification?.emailVerified} icon={CheckCircle2} />
                <MetricTile label="Completion" value={sections.verification?.emailCompletionRate} suffix="%" icon={UserRoundCheck} />
              </div>
            </ChartCard>
          </div>
        ) : null}

        {!loading && activeTab === "operations" ? (
          <div className="grid gap-5 lg:grid-cols-2">
            <ChartCard title="Job Edit Requests" subtitle="Governance requests by status"><HorizontalBars data={sections.operations?.editRequests} /></ChartCard>
            <ChartCard title="Most Requested Job Sections" subtitle="Sections employers request to edit"><HorizontalBars data={sections.operations?.editRequestSections} /></ChartCard>
            <ChartCard title="Message Types" subtitle="Conversation activity without exposing message content"><HorizontalBars data={sections.operations?.messages} /></ChartCard>
            <ChartCard title="Message Read State" subtitle="Read and unread messages"><DonutChart data={sections.operations?.messageRead} /></ChartCard>
            <ChartCard title="Notification Types" subtitle="System notifications by workflow"><HorizontalBars data={sections.operations?.notifications} /></ChartCard>
            <ChartCard title="Notification State" subtitle="Read, unread, and archived counts"><DonutChart data={sections.operations?.notificationRead} /></ChartCard>
            <ChartCard title="Community Moderation" subtitle="Engagement and moderation indicators">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <MetricTile label="Posts" value={sections.operations?.community?.posts} icon={MessageSquare} />
                <MetricTile label="Engagement" value={sections.operations?.community?.engagement} icon={Activity} />
                <MetricTile label="Reports" value={sections.operations?.community?.reports} icon={ShieldAlert} />
                <MetricTile label="Sensitive" value={sections.operations?.community?.sensitive} icon={ShieldAlert} />
                <MetricTile label="Deleted" value={sections.operations?.community?.deleted} icon={RefreshCw} />
              </div>
            </ChartCard>
            <ChartCard title="System Reliability" subtitle="Log outcome and request performance">
              <HorizontalBars data={sections.operations?.system?.statuses} />
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <MetricTile label="P95 Duration" value={sections.operations?.system?.p95DurationMs} suffix=" ms" icon={Activity} />
                <MetricTile label="Server Errors" value={sections.operations?.system?.serverErrors} icon={ShieldAlert} />
              </div>
            </ChartCard>
            <ChartCard title="System Log Modules" subtitle="Modules generating the most audit events" className="lg:col-span-2"><HorizontalBars data={sections.operations?.system?.modules} maxItems={10} /></ChartCard>
          </div>
        ) : null}

        {!loading ? <p className="text-right text-[10px] text-slate-400">Timezone: Asia/Manila · Last updated: {analytics.generatedAt ? new Date(analytics.generatedAt).toLocaleString("en-PH") : "—"}</p> : null}
      </div>
    </main>
  );
};

export default AdminAnalytics;
