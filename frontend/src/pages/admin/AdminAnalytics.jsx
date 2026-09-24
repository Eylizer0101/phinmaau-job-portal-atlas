import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronDown,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  UserRoundCheck,
  UsersRound,
  X,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Funnel,
  FunnelChart,
  LabelList,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import * as XLSX from "xlsx";
import api from "../../services/api";

const numberFormat = new Intl.NumberFormat("en-US");
const pesoFormat = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
});

const chartColors = ["#17365D", "#2e66a6", "#16a36f", "#7c8ca5", "#d89b2b", "#8b5cf6"];

const dateOptions = [
  ["overall", "All Time"],
  ["today", "Today"],
  ["yesterday", "Yesterday"],
  ["thisWeek", "This Week"],
  ["lastWeek", "Last Week"],
  ["thisMonth", "This Month"],
  ["lastMonth", "Last Month"],
  ["thisYear", "This Year"],
  ["lastYear", "Last Year"],
  ["range", "Custom Range"],
];

const initialFilters = {
  date: "overall",
  startDate: "",
  endDate: "",
  campus: "all",
  yearGraduated: "all",
  course: "all",
  applicationStatus: "all",
  jobStatus: "all",
  industry: "all",
  jobType: "all",
  workMode: "all",
  educationLevel: "all",
  experienceLevel: "all",
  verificationStatus: "all",
  editRequestStatus: "all",
  role: "all",
};

const emptyAnalytics = {
  generatedAt: null,
  timezone: "Asia/Manila",
  filters: { options: {} },
  kpis: {
    totalRegisteredUsers: 0,
    totalJobPosts: 0,
    totalApplications: 0,
    hireRate: 0,
  },
  overview: {
    historicalTrend: [],
    hiredPercentageByCampus: [],
    systemGrowthBreakdown: [],
    applicationsByCourseCampus: [],
  },
  applications: {
    kpis: {
      reviewRate: 0,
      avgApplicationsBeforeHire: 0,
      avgTimeToFirstResponseDays: 0,
      interviewConversionRate: 0,
      totalDropOffs: 0,
    },
    funnel: [],
    dropOffs: [],
    byWorkModeJobType: [],
    jobTypeSeries: [],
    declineReasons: [],
    byExperienceLevel: [],
  },
  jobOffers: {
    kpis: {
      activeJobPosts: 0,
      vacancyFillRate: 0,
      urgentPostings: 0,
      pendingEditRequests: 0,
      averageEmployerRating: 0,
    },
    industryDistribution: [],
    editRequestsBySection: [],
    educationRequirements: [],
    salaryByWorkMode: [],
  },
  verification: {
    kpis: {
      pendingVerification: 0,
      approvalRate: 0,
      avgTurnaroundDays: 0,
      declinedRate: 0,
      documentHoldRate: 0,
    },
    jobseekerStatusByCampus: [],
    employerDeclineReasons: [],
    alumniRejectionHoldReasons: [],
    submissionVolumeByRole: [],
  },
};

const titleCase = (value) =>
  String(value || "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const formatValue = (value, format = "number") => {
  const numeric = Number(value || 0);
  if (format === "percent") return `${numeric.toFixed(1)}%`;
  if (format === "days") return `${numeric.toFixed(1)} days`;
  if (format === "rating") return `${numeric.toFixed(2)} / 5`;
  if (format === "peso") return pesoFormat.format(numeric);
  return numberFormat.format(numeric);
};

const SelectFilter = ({ label, value, onChange, options = [], allLabel = "All" }) => (
  <label className="min-w-[150px] flex-1">
    <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.11em] text-slate-500">
      {label}
    </span>
    <div className="relative">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-9 text-xs font-medium text-slate-700 outline-none transition focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/15"
      >
        <option value="all">{allLabel}</option>
        {options.map((option) => (
          <option key={String(option)} value={option}>
            {titleCase(option)}
          </option>
        ))}
      </select>
      <ChevronDown
        size={14}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
      />
    </div>
  </label>
);

const DateRangeFilter = ({ value, onChange }) => (
  <label className="min-w-[150px] flex-1">
    <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.11em] text-slate-500">
      Date Range
    </span>
    <div className="relative">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-9 text-xs font-medium text-slate-700 outline-none transition focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/15"
      >
        {dateOptions.map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={14}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
      />
    </div>
  </label>
);

const DateInput = ({ label, value, onChange }) => (
  <label className="min-w-[150px] flex-1">
    <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.11em] text-slate-500">
      {label}
    </span>
    <input
      type="date"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none transition focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/15"
    />
  </label>
);

const getAnalyticsCardImage = (label = "") => {
  const text = String(label).toLowerCase();

  if (text.includes("employer") || text.includes("rating")) return "/images/admin_2.png";
  if (text.includes("verification") || text.includes("hold")) return "/images/admin_3.png";
  if (text.includes("job") || text.includes("vacancy") || text.includes("posting")) return "/images/case.png";
  if (text.includes("application") || text.includes("hire") || text.includes("interview")) return "/images/admin_1.png";

  return "/images/admin_4.png";
};

const AnalyticsKpiCardVisual = ({ label, value, format = "number", note, compact = false }) => {
  const imageSrc = getAnalyticsCardImage(label);

  return (
    <div
      className={`group relative w-full overflow-hidden rounded-2xl bg-gradient-to-br from-[#072258] via-[#2d63a0] to-[#52b2db] text-left text-white shadow-[0_10px_30px_rgba(0,0,0,0.18)] transition-all duration-500 ease-out hover:scale-[1.02] hover:brightness-105 hover:shadow-[0_20px_50px_rgba(0,0,0,0.25)] ${
        compact ? "px-5 py-4" : "px-6 py-5"
      }`}
      title={note || label}
    >
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
        className={`pointer-events-none absolute right-[-18px] top-1/2 -translate-y-1/2 object-contain opacity-50 mix-blend-soft-light saturate-150 transition-all duration-700 ease-out group-hover:right-[-15px] group-hover:scale-105 group-hover:opacity-50 group-hover:saturate-180 ${
          compact ? "h-16 w-16 md:h-[72px] md:w-[72px]" : "h-20 w-20 md:h-[88px] md:w-[88px]"
        }`}
        style={{
          WebkitMaskImage:
            "radial-gradient(circle at 35% 50%, rgba(0,0,0,1) 0%, rgba(0,0,0,0.6) 55%, rgba(0,0,0,0) 80%)",
          maskImage:
            "radial-gradient(circle at 35% 50%, rgba(0,0,0,1) 0%, rgba(0,0,0,0.6) 55%, rgba(0,0,0,0) 80%)",
        }}
      />

      <div className="relative z-10 min-w-0 pr-12">
        <p
          className={`${
            compact ? "text-2xl" : "text-3xl"
          } font-semibold leading-none tracking-tight transition-all duration-300 ease-out group-hover:scale-[1.02]`}
        >
          {formatValue(value, format)}
        </p>
        <p
          className={`mt-3 font-medium text-white/90 transition-all duration-300 group-hover:text-white ${
            compact ? "text-[11px] uppercase tracking-[0.08em]" : "text-sm"
          }`}
        >
          {label}
        </p>
      </div>

      <div className="pointer-events-none absolute inset-0 rounded-2xl border-2 border-transparent transition-all duration-500 ease-out group-hover:border-white/20" />
    </div>
  );
};

const GlobalKpiCard = ({ label, value, format = "number", icon: Icon, note }) => (
  <AnalyticsKpiCardVisual label={label} value={value} format={format} note={note} />
);

const TabKpiCard = ({ label, value, format = "number", icon: Icon, note }) => (
  <AnalyticsKpiCardVisual label={label} value={value} format={format} note={note} compact />
);

const EmptyChart = ({ message = "No data available for the selected filters." }) => (
  <div className="grid h-[280px] place-items-center rounded-lg border border-dashed border-slate-200 bg-slate-50/50 px-6 text-center text-xs text-slate-500">
    {message}
  </div>
);

const ChartCard = ({ title, subtitle, children, className = "", unit }) => (
  <section className={`rounded-xl border border-slate-200 bg-white p-5 shadow-[0_7px_22px_rgba(15,23,42,0.045)] ${className}`}>
    <div className="mb-4 flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-3">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {subtitle ? <p className="mt-1 text-[11px] leading-5 text-slate-500">{subtitle}</p> : null}
      </div>
      {unit ? <span className="rounded-md bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-500">{unit}</span> : null}
    </div>
    {children}
  </section>
);

const chartAxisTick = { fontSize: 10, fill: "#64748b" };
const tooltipStyle = {
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  boxShadow: "0 8px 24px rgba(15,23,42,.08)",
  fontSize: 11,
};

const HistoricalTrendChart = ({ data }) => {
  if (!data?.length) return <EmptyChart />;
  return (
    <div className="h-[340px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8edf3" />
          <XAxis dataKey="label" tick={chartAxisTick} axisLine={false} tickLine={false} />
          <YAxis yAxisId="count" tick={chartAxisTick} axisLine={false} tickLine={false} allowDecimals={false} />
          <YAxis yAxisId="rate" orientation="right" domain={[0, 100]} tick={chartAxisTick} axisLine={false} tickLine={false} tickFormatter={(value) => `${value}%`} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 10, paddingTop: 10 }} />
          <Line yAxisId="count" type="monotone" dataKey="registeredUsers" name="Registered Users" stroke="#17365D" strokeWidth={2.3} dot={{ r: 2.5 }} activeDot={{ r: 4 }} />
          <Line yAxisId="count" type="monotone" dataKey="jobPosts" name="Job Posts" stroke="#2e66a6" strokeWidth={2.3} dot={{ r: 2.5 }} activeDot={{ r: 4 }} />
          <Line yAxisId="count" type="monotone" dataKey="applications" name="Applications" stroke="#16a36f" strokeWidth={2.3} dot={{ r: 2.5 }} activeDot={{ r: 4 }} />
          <Line yAxisId="rate" type="monotone" dataKey="hireRate" name="Hire Rate %" stroke="#d89b2b" strokeWidth={2.3} strokeDasharray="6 4" dot={{ r: 2.5 }} activeDot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

const HorizontalBarChart = ({ data, valueFormatter, maxItems = 12 }) => {
  const rows = (data || []).slice(0, maxItems);
  if (!rows.length) return <EmptyChart />;
  const height = Math.max(280, rows.length * 38);
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 24, left: 18, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#edf1f5" />
          <XAxis type="number" tick={chartAxisTick} axisLine={false} tickLine={false} allowDecimals={false} />
          <YAxis type="category" dataKey="name" width={135} tick={chartAxisTick} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} formatter={(value) => valueFormatter ? valueFormatter(value) : numberFormat.format(Number(value || 0))} />
          <Bar dataKey="value" name="Value" fill="#2e66a6" radius={[0, 6, 6, 0]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

const GroupedBarChart = ({ data, series = [], stacked = false, currency = false }) => {
  if (!data?.length || !series?.length) return <EmptyChart />;
  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 14, left: currency ? 20 : -8, bottom: 14 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#edf1f5" />
          <XAxis dataKey={data[0]?.label !== undefined ? "label" : "name"} tick={chartAxisTick} axisLine={false} tickLine={false} interval={0} angle={data.length > 7 ? -18 : 0} textAnchor={data.length > 7 ? "end" : "middle"} height={data.length > 7 ? 52 : 30} />
          <YAxis tick={chartAxisTick} axisLine={false} tickLine={false} allowDecimals={false} tickFormatter={(value) => currency ? `₱${numberFormat.format(Number(value || 0))}` : numberFormat.format(Number(value || 0))} />
          <Tooltip contentStyle={tooltipStyle} formatter={(value) => currency ? pesoFormat.format(Number(value || 0)) : numberFormat.format(Number(value || 0))} />
          <Legend wrapperStyle={{ fontSize: 10, paddingTop: 8 }} />
          {series.map((key, index) => (
            <Bar
              key={key}
              dataKey={key}
              name={titleCase(key)}
              stackId={stacked ? "stack" : undefined}
              fill={chartColors[index % chartColors.length]}
              radius={stacked ? 0 : [5, 5, 0, 0]}
              maxBarSize={34}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

const SimpleVerticalBarChart = ({ data, valueFormatter }) => {
  if (!data?.length) return <EmptyChart />;
  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 12, right: 14, left: -8, bottom: 50 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#edf1f5" />
          <XAxis dataKey="name" tick={chartAxisTick} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={70} />
          <YAxis tick={chartAxisTick} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip contentStyle={tooltipStyle} formatter={(value) => valueFormatter ? valueFormatter(value) : numberFormat.format(Number(value || 0))} />
          <Bar dataKey="value" name="Value" fill="#2e66a6" radius={[6, 6, 0, 0]} maxBarSize={42} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

const RecruitmentFunnel = ({ data, dropOffs }) => {
  if (!data?.length) return <EmptyChart />;
  return (
    <div>
      <div className="h-[310px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <FunnelChart>
            <Tooltip contentStyle={tooltipStyle} formatter={(value) => numberFormat.format(Number(value || 0))} />
            <Funnel dataKey="value" data={data} isAnimationActive nameKey="name">
              {data.map((entry, index) => (
                <Cell key={`${entry.name}-${index}`} fill={chartColors[index % 4]} />
              ))}
              <LabelList position="right" fill="#334155" stroke="none" dataKey="name" fontSize={11} />
            </Funnel>
          </FunnelChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {(dropOffs || []).map((item) => (
          <div key={item.name} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">{titleCase(item.name)}</p>
            <p className="mt-1 text-lg font-semibold text-slate-800">{numberFormat.format(Number(item.value || 0))}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const LoadingState = () => (
  <div className="grid min-h-[440px] place-items-center rounded-xl border border-slate-200 bg-white">
    <div className="flex items-center gap-3 text-sm font-medium text-slate-500">
      <RefreshCw size={17} className="animate-spin text-[#2e66a6]" />
      Loading analytics...
    </div>
  </div>
);

const ErrorState = ({ message, onRetry }) => (
  <div className="grid min-h-[380px] place-items-center rounded-xl border border-rose-200 bg-rose-50/40 p-6 text-center">
    <div>
      <p className="text-sm font-semibold text-slate-800">Analytics data could not be loaded.</p>
      <p className="mt-2 text-xs text-slate-500">{message || "Please try again."}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-[#2e66a6] px-4 text-xs font-semibold text-white hover:bg-[#25578e]"
      >
        <RefreshCw size={14} /> Retry
      </button>
    </div>
  </div>
);

const ExportModal = ({ open, onClose, selected, setSelected, format, setFormat, onExport }) => {
  if (!open) return null;
  const sections = [
    ["overview", "Overview"],
    ["applications", "Applications"],
    ["jobOffers", "Job Offers"],
    ["verification", "Verification"],
  ];
  const hasSelection = Object.values(selected).some(Boolean);

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/45 p-4" role="dialog" aria-modal="true" aria-label="Export analytics report">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Export Reports</h3>
            <p className="mt-1 text-xs text-slate-500">Choose the analytics sections and output format.</p>
          </div>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Close export modal">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5 p-5">
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.11em] text-slate-500">Sections</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {sections.map(([key, label]) => (
                <label key={key} className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3 py-3 text-xs font-medium text-slate-700 hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={selected[key]}
                    onChange={(event) => setSelected((current) => ({ ...current, [key]: event.target.checked }))}
                    className="h-4 w-4 rounded border-slate-300 text-[#2e66a6] focus:ring-[#2e66a6]"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.11em] text-slate-500">Format</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-3 ${format === "xlsx" ? "border-[#2e66a6] bg-[#eef4fb]" : "border-slate-200"}`}>
                <input type="radio" name="exportFormat" value="xlsx" checked={format === "xlsx"} onChange={() => setFormat("xlsx")} />
                <FileSpreadsheet size={18} className="text-[#2e66a6]" />
                <span className="text-xs font-semibold text-slate-700">Microsoft Excel (.xlsx)</span>
              </label>
              <label className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-3 ${format === "pdf" ? "border-[#2e66a6] bg-[#eef4fb]" : "border-slate-200"}`}>
                <input type="radio" name="exportFormat" value="pdf" checked={format === "pdf"} onChange={() => setFormat("pdf")} />
                <FileText size={18} className="text-[#2e66a6]" />
                <span className="text-xs font-semibold text-slate-700">Executive PDF (.pdf)</span>
              </label>
            </div>
            {format === "pdf" ? (
              <p className="mt-2 text-[10px] leading-4 text-slate-500">The browser print dialog will open so the report can be saved as PDF without adding another frontend dependency.</p>
            ) : null}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button type="button" onClick={onClose} className="h-9 rounded-lg border border-slate-200 px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
          <button
            type="button"
            disabled={!hasSelection}
            onClick={onExport}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#17365D] px-4 text-xs font-semibold text-white hover:bg-[#102947] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download size={14} /> Export File
          </button>
        </div>
      </div>
    </div>
  );
};

const AdminAnalytics = () => {
  const [analytics, setAnalytics] = useState(emptyAnalytics);
  const [filters, setFilters] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exportOpen, setExportOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState("xlsx");
  const [exportSections, setExportSections] = useState({ overview: true, applications: true, jobOffers: true, verification: true });

  const options = analytics?.filters?.options || {};
  const metricNotes = analytics?.metricNotes || {};

  const fetchAnalytics = async (currentFilters = appliedFilters) => {
    setLoading(true);
    setError("");
    try {
      const params = {};
      Object.entries(currentFilters).forEach(([key, value]) => {
        if (value !== "" && value !== null && value !== undefined) params[key] = value;
      });
      const response = await api.get("/admin/analytics", { params });
      setAnalytics(response?.data?.success ? response.data : emptyAnalytics);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError?.message || "Unable to load analytics data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics(appliedFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedFilters]);

  const setFilter = (key, value) => {
    setFilters((current) => ({
      ...current,
      [key]: value,
      ...(key === "date" && value !== "range" ? { startDate: "", endDate: "" } : {}),
    }));
  };

  const applyFilters = () => {
    if (filters.date === "range") {
      if (!filters.startDate || !filters.endDate) {
        setError("Select both the start date and end date for the custom range.");
        return;
      }
      if (new Date(`${filters.startDate}T00:00:00`) > new Date(`${filters.endDate}T00:00:00`)) {
        setError("The start date must be earlier than or equal to the end date.");
        return;
      }
    }
    setError("");
    setAppliedFilters({ ...filters });
  };

  const clearFilters = () => {
    setFilters(initialFilters);
    setAppliedFilters(initialFilters);
    setError("");
  };

  const activeFilterChips = useMemo(() => {
    const labelByKey = {
      campus: "Campus",
      yearGraduated: "Year Graduated",
      course: "Course",
      applicationStatus: "Application Status",
      jobStatus: "Job Status",
      industry: "Industry",
      jobType: "Job Type",
      workMode: "Work Mode",
      educationLevel: "Education Required",
      experienceLevel: "Experience Level",
      verificationStatus: "Verification Status",
      editRequestStatus: "Request Edit Status",
      role: "Role",
    };
    const chips = [];
    if (appliedFilters.date !== "overall") {
      const dateLabel = dateOptions.find(([key]) => key === appliedFilters.date)?.[1] || "Date";
      chips.push(["date", `Date: ${dateLabel}`]);
    }
    Object.entries(labelByKey).forEach(([key, label]) => {
      const value = appliedFilters[key];
      if (value && value !== "all") chips.push([key, `${label}: ${titleCase(value)}`]);
    });
    return chips;
  }, [appliedFilters]);

  const removeChip = (key) => {
    const next = {
      ...appliedFilters,
      [key]: key === "date" ? "overall" : "all",
      ...(key === "date" ? { startDate: "", endDate: "" } : {}),
    };
    setAppliedFilters(next);
    setFilters(next);
  };

  const tabs = [
    ["overview", "Overview"],
    ["applications", "Applications"],
    ["jobOffers", "Job Offers"],
    ["verification", "Verification"],
  ];

  const globalKpis = [
    { label: "Total Registered Users", value: analytics.kpis?.totalRegisteredUsers, icon: UsersRound },
    { label: "Total Job Posts", value: analytics.kpis?.totalJobPosts, icon: BriefcaseBusiness, note: metricNotes.totalJobPosts },
    { label: "Total Applications", value: analytics.kpis?.totalApplications, icon: BarChart3 },
    { label: "Hire Rate", value: analytics.kpis?.hireRate, icon: TrendingUp, format: "percent", note: metricNotes.hireRate },
  ];

  const addSheet = (workbook, name, rows) => {
    const safeRows = Array.isArray(rows) && rows.length ? rows : [{ Message: "No data for selected filters" }];
    const sheet = XLSX.utils.json_to_sheet(safeRows);
    XLSX.utils.book_append_sheet(workbook, sheet, name.slice(0, 31));
  };

  const buildFilterContextRows = () => [
    { Field: "Generated At", Value: analytics.generatedAt ? new Date(analytics.generatedAt).toLocaleString("en-PH") : "" },
    { Field: "Timezone", Value: analytics.timezone || "Asia/Manila" },
    ...Object.entries(appliedFilters).map(([key, value]) => ({ Field: titleCase(key), Value: value || "" })),
  ];

  const exportExcel = () => {
    const workbook = XLSX.utils.book_new();
    addSheet(workbook, "Filter Context", buildFilterContextRows());

    if (exportSections.overview) {
      addSheet(workbook, "Overview KPIs", globalKpis.map((item) => ({ Metric: item.label, Value: item.value || 0 })));
      addSheet(workbook, "Historical Trend", analytics.overview?.historicalTrend || []);
      addSheet(workbook, "Hired by Campus", analytics.overview?.hiredPercentageByCampus || []);
      addSheet(workbook, "System Growth", analytics.overview?.systemGrowthBreakdown || []);
      addSheet(workbook, "Course Campus Volume", analytics.overview?.applicationsByCourseCampus || []);
    }

    if (exportSections.applications) {
      addSheet(workbook, "Application KPIs", Object.entries(analytics.applications?.kpis || {}).map(([key, value]) => ({ Metric: titleCase(key), Value: value })));
      addSheet(workbook, "Recruitment Funnel", analytics.applications?.funnel || []);
      addSheet(workbook, "Application Dropoffs", analytics.applications?.dropOffs || []);
      addSheet(workbook, "Work Mode Job Type", analytics.applications?.byWorkModeJobType || []);
      addSheet(workbook, "Decline Reasons", analytics.applications?.declineReasons || []);
      addSheet(workbook, "Experience Level", analytics.applications?.byExperienceLevel || []);
    }

    if (exportSections.jobOffers) {
      addSheet(workbook, "Job Offer KPIs", Object.entries(analytics.jobOffers?.kpis || {}).map(([key, value]) => ({ Metric: titleCase(key), Value: value })));
      addSheet(workbook, "Industry Distribution", analytics.jobOffers?.industryDistribution || []);
      addSheet(workbook, "Edit Request Sections", analytics.jobOffers?.editRequestsBySection || []);
      addSheet(workbook, "Education Required", analytics.jobOffers?.educationRequirements || []);
      addSheet(workbook, "Salary Work Mode", analytics.jobOffers?.salaryByWorkMode || []);
    }

    if (exportSections.verification) {
      addSheet(workbook, "Verification KPIs", Object.entries(analytics.verification?.kpis || {}).map(([key, value]) => ({ Metric: titleCase(key), Value: value })));
      addSheet(workbook, "Jobseeker Campus Status", analytics.verification?.jobseekerStatusByCampus || []);
      addSheet(workbook, "Employer Decline Reasons", analytics.verification?.employerDeclineReasons || []);
      addSheet(workbook, "Alumni Reasons", analytics.verification?.alumniRejectionHoldReasons || []);
      addSheet(workbook, "Verification Volume", analytics.verification?.submissionVolumeByRole || []);
    }

    XLSX.writeFile(workbook, `AGAPAY_Analytics_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const exportPdf = () => {
    const reportWindow = window.open("", "_blank", "noopener,noreferrer");
    if (!reportWindow) {
      setError("The PDF report window was blocked. Allow pop-ups for this site and try again.");
      return;
    }

    const selectedNames = Object.entries(exportSections)
      .filter(([, enabled]) => enabled)
      .map(([key]) => tabs.find(([tabKey]) => tabKey === key)?.[1] || titleCase(key));
    const filterText = activeFilterChips.length ? activeFilterChips.map(([, label]) => label).join(" • ") : "All Time / No additional filters";

    const kpiRows = globalKpis
      .map((item) => `<tr><td>${item.label}</td><td>${formatValue(item.value, item.format)}</td></tr>`)
      .join("");

    reportWindow.document.write(`<!doctype html><html><head><title>AGAPAY Analytics Report</title><style>
      body{font-family:Arial,sans-serif;color:#172033;margin:32px}.header{border-bottom:3px solid #17365D;padding-bottom:14px;margin-bottom:18px}h1{font-size:24px;margin:0;color:#17365D}h2{font-size:16px;margin-top:26px;color:#17365D}.meta{font-size:11px;color:#64748b;margin-top:6px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}table{width:100%;border-collapse:collapse;margin-top:10px;font-size:11px}th,td{border:1px solid #dbe3ec;padding:8px;text-align:left}th{background:#eef4fb;color:#17365D}.section{page-break-inside:avoid;margin-top:18px}.note{font-size:10px;color:#64748b} @media print{button{display:none}}
    </style></head><body>
      <div class="header"><h1>PHINMA Araullo University Job Portal</h1><div>Descriptive Analytics & Reporting</div><div class="meta">Generated: ${new Date().toLocaleString("en-PH")} • Timezone: ${analytics.timezone || "Asia/Manila"}</div></div>
      <div class="section"><h2>Filter Context</h2><p class="note">${filterText}</p></div>
      <div class="section"><h2>Global KPI Summary</h2><table><tbody>${kpiRows}</tbody></table></div>
      <div class="section"><h2>Selected Sections</h2><p>${selectedNames.join(", ")}</p></div>
      ${exportSections.applications ? `<div class="section"><h2>Applications KPI Summary</h2><table><tbody>${Object.entries(analytics.applications?.kpis || {}).map(([k,v]) => `<tr><td>${titleCase(k)}</td><td>${v}</td></tr>`).join("")}</tbody></table></div>` : ""}
      ${exportSections.jobOffers ? `<div class="section"><h2>Job Offers KPI Summary</h2><table><tbody>${Object.entries(analytics.jobOffers?.kpis || {}).map(([k,v]) => `<tr><td>${titleCase(k)}</td><td>${v}</td></tr>`).join("")}</tbody></table></div>` : ""}
      ${exportSections.verification ? `<div class="section"><h2>Verification KPI Summary</h2><table><tbody>${Object.entries(analytics.verification?.kpis || {}).map(([k,v]) => `<tr><td>${titleCase(k)}</td><td>${v}</td></tr>`).join("")}</tbody></table></div>` : ""}
      <script>window.onload=()=>{window.print();}</script>
    </body></html>`);
    reportWindow.document.close();
  };

  const handleExport = () => {
    if (exportFormat === "xlsx") exportExcel();
    else exportPdf();
    setExportOpen(false);
  };

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-[1480px] px-1 py-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#2e66a6]">Reports & Analytics</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Analytics & Reporting</h1>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">
              Descriptive analytics for registration, job supply, applications, hiring outcomes, and verification activity.
            </p>
          </div>
          <div className="flex items-center gap-2">
          
            <button
              type="button"
              onClick={() => setExportOpen(true)}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#17365D] px-4 text-xs font-semibold text-white shadow-sm hover:bg-[#102947]"
            >
              <Download size={14} /> Export Reports
            </button>
          </div>
        </header>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_7px_22px_rgba(15,23,42,0.04)]" aria-label="Global analytics filters">
          <div className="mb-3 flex items-center gap-2">
            <Filter size={15} className="text-[#2e66a6]" />
            <h2 className="text-xs font-semibold text-slate-800">Global Filters</h2>
            <span className="text-[10px] text-slate-400">Applied to supported metrics and visuals across all analytics tabs.</span>
          </div>

          <div className="flex flex-wrap gap-3">
            <DateRangeFilter value={filters.date} onChange={(value) => setFilter("date", value)} />
            <SelectFilter label="Campus" value={filters.campus} onChange={(value) => setFilter("campus", value)} options={options.campuses || []} allLabel="All Campuses" />
            <SelectFilter label="Year Graduated" value={filters.yearGraduated} onChange={(value) => setFilter("yearGraduated", value)} options={options.yearsGraduated || []} allLabel="All Years" />
            <SelectFilter label="Course" value={filters.course} onChange={(value) => setFilter("course", value)} options={options.courses || []} allLabel="All Courses" />
            <SelectFilter label="Application Status" value={filters.applicationStatus} onChange={(value) => setFilter("applicationStatus", value)} options={options.applicationStatuses || []} allLabel="All Statuses" />
            <SelectFilter label="Job Status" value={filters.jobStatus} onChange={(value) => setFilter("jobStatus", value)} options={options.jobStatuses || []} allLabel="All Statuses" />
            <SelectFilter label="Industry" value={filters.industry} onChange={(value) => setFilter("industry", value)} options={options.industries || []} allLabel="All Industries" />
            <SelectFilter label="Job Type" value={filters.jobType} onChange={(value) => setFilter("jobType", value)} options={options.jobTypes || []} allLabel="All Job Types" />
            <SelectFilter label="Work Mode" value={filters.workMode} onChange={(value) => setFilter("workMode", value)} options={options.workModes || []} allLabel="All Work Modes" />
            <SelectFilter label="Education Required" value={filters.educationLevel} onChange={(value) => setFilter("educationLevel", value)} options={options.educationLevels || []} allLabel="All Education" />
            <SelectFilter label="Experience Level" value={filters.experienceLevel} onChange={(value) => setFilter("experienceLevel", value)} options={options.experienceLevels || []} allLabel="All Experience" />
            <SelectFilter label="Verification Status" value={filters.verificationStatus} onChange={(value) => setFilter("verificationStatus", value)} options={options.verificationStatuses || []} allLabel="All Statuses" />
            <SelectFilter label="Request Edit Status" value={filters.editRequestStatus} onChange={(value) => setFilter("editRequestStatus", value)} options={options.editRequestStatuses || []} allLabel="All Statuses" />
            <SelectFilter label="Role" value={filters.role} onChange={(value) => setFilter("role", value)} options={options.roles || []} allLabel="All Roles" />
          </div>

          {filters.date === "range" ? (
            <div className="mt-3 flex max-w-[430px] flex-wrap gap-3 rounded-lg border border-[#2e66a6]/15 bg-[#f5f9fd] p-3">
              <DateInput label="Start Date" value={filters.startDate} onChange={(value) => setFilter("startDate", value)} />
              <DateInput label="End Date" value={filters.endDate} onChange={(value) => setFilter("endDate", value)} />
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
            <div className="flex min-h-7 flex-wrap items-center gap-2">
              {activeFilterChips.length ? activeFilterChips.map(([key, label]) => (
                <button
                  type="button"
                  key={key}
                  onClick={() => removeChip(key)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#2e66a6]/15 bg-[#eef4fb] px-2.5 py-1 text-[10px] font-semibold text-[#285b94] hover:bg-[#e4eef9]"
                  title="Remove filter"
                >
                  {label} <X size={11} />
                </button>
              )) : <span className="text-[10px] text-slate-400">No additional filters applied.</span>}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={clearFilters} className="h-9 rounded-lg border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50">Clear All</button>
              <button type="button" onClick={applyFilters} className="h-9 rounded-lg bg-[#2e66a6] px-4 text-xs font-semibold text-white hover:bg-[#25578e]">Apply Filters</button>
            </div>
          </div>
        </section>

        <section className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Global KPI bar">
          {globalKpis.map((item) => <GlobalKpiCard key={item.label} {...item} />)}
        </section>

        <nav className="flex gap-7 overflow-x-auto border-b border-slate-200 bg-transparent" aria-label="Analytics tabs">
          {tabs.map(([key, label]) => (
            <button
              type="button"
              key={key}
              onClick={() => setActiveTab(key)}
              className={`shrink-0 border-b-2 px-1 pb-3 pt-1 text-xs font-semibold transition ${activeTab === key ? "border-[#2e66a6] text-[#2e66a6]" : "border-transparent text-slate-500 hover:text-slate-800"}`}
            >
              {label}
            </button>
          ))}
        </nav>

        {error && !loading ? (
          <div className="flex items-start justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
            <span>{error}</span>
            <button type="button" onClick={() => setError("")} aria-label="Close error message"><X size={14} /></button>
          </div>
        ) : null}

        {loading ? <LoadingState /> : null}
        {!loading && error && analytics === emptyAnalytics ? <ErrorState message={error} onRetry={() => fetchAnalytics(appliedFilters)} /> : null}

        {!loading && activeTab === "overview" ? (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            <ChartCard title="Historical Trend" subtitle="Registered users, job posts, applications, and hire rate over time." unit="Monthly" className="xl:col-span-12">
              <HistoricalTrendChart data={analytics.overview?.historicalTrend} />
            </ChartCard>
            <ChartCard title="Hired Percentage by Campus" subtitle="Hiring outcomes across AU Main, AU San Jose, and AU South." unit="Percent" className="xl:col-span-5">
              <HorizontalBarChart data={analytics.overview?.hiredPercentageByCampus} valueFormatter={(value) => `${Number(value || 0).toFixed(1)}%`} />
            </ChartCard>
            <ChartCard title="System Growth Breakdown" subtitle="Jobseeker registrations, employer registrations, and published jobs." unit="Count" className="xl:col-span-7">
              <GroupedBarChart data={analytics.overview?.systemGrowthBreakdown} series={["jobseekers", "employers", "publishedJobs"]} />
            </ChartCard>
            <ChartCard title="Application Volume by Course & Campus" subtitle="Application concentration by course and campus." unit="Applications" className="xl:col-span-12">
              <GroupedBarChart data={analytics.overview?.applicationsByCourseCampus} series={["AU Main", "AU San Jose", "AU South", "Other"]} stacked />
            </ChartCard>
          </div>
        ) : null}

        {!loading && activeTab === "applications" ? (
          <div className="space-y-4">
            <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <TabKpiCard label="Application Review Rate" value={analytics.applications?.kpis?.reviewRate} format="percent" icon={CheckCircle2} note="Reviewed or viewed applications divided by submitted applications." />
              <TabKpiCard label="Avg. Applications Before Hire" value={analytics.applications?.kpis?.avgApplicationsBeforeHire} icon={BarChart3} />
              <TabKpiCard label="Avg. Time-to-First-Response" value={analytics.applications?.kpis?.avgTimeToFirstResponseDays} format="days" icon={TrendingUp} />
              <TabKpiCard label="Interview Conversion Rate" value={analytics.applications?.kpis?.interviewConversionRate} format="percent" icon={UserRoundCheck} />
              <TabKpiCard label="Total Application Drop-offs" value={analytics.applications?.kpis?.totalDropOffs} icon={X} />
            </section>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
              <ChartCard title="Recruitment Funnel Dynamics" subtitle="Applied → Viewed → For Interview → Hired, with recorded drop-off outcomes." className="xl:col-span-7">
                <RecruitmentFunnel data={analytics.applications?.funnel} dropOffs={analytics.applications?.dropOffs} />
              </ChartCard>
              <ChartCard title="Employer Decline Reasons Breakdown" subtitle="Recorded reasons for employer rejection." unit="Applications" className="xl:col-span-5">
                <SimpleVerticalBarChart data={analytics.applications?.declineReasons} />
              </ChartCard>
              <ChartCard title="Applications by Work Mode & Job Type" subtitle="Application demand by work arrangement and employment type." unit="Applications" className="xl:col-span-7">
                <GroupedBarChart data={analytics.applications?.byWorkModeJobType} series={analytics.applications?.jobTypeSeries || []} />
              </ChartCard>
              <ChartCard title="Application Volume by Required Experience Level" subtitle="Applications grouped by the job's required experience level." unit="Applications" className="xl:col-span-5">
                <HorizontalBarChart data={analytics.applications?.byExperienceLevel} />
              </ChartCard>
            </div>
          </div>
        ) : null}

        {!loading && activeTab === "jobOffers" ? (
          <div className="space-y-4">
            <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <TabKpiCard label="Active Job Post" value={analytics.jobOffers?.kpis?.activeJobPosts} icon={BriefcaseBusiness} />
              <TabKpiCard label="Vacancy Fill Rate" value={analytics.jobOffers?.kpis?.vacancyFillRate} format="percent" icon={CheckCircle2} note={metricNotes.vacancyFillRate} />
              <TabKpiCard label="Urgent Postings" value={analytics.jobOffers?.kpis?.urgentPostings} format="percent" icon={TrendingUp} />
              <TabKpiCard label="Pending Job Edit Requests" value={analytics.jobOffers?.kpis?.pendingEditRequests} icon={FileText} />
              <TabKpiCard label="Average Employer Rating" value={analytics.jobOffers?.kpis?.averageEmployerRating} format="rating" icon={ShieldCheck} />
            </section>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <ChartCard title="Job Listings Distribution by Industry Sector" subtitle="Active and historical published job supply by industry." unit="Job Posts">
                <HorizontalBarChart data={analytics.jobOffers?.industryDistribution} />
              </ChartCard>
              <ChartCard title="Job Post Edit Requests Volume by Target Section" subtitle="Sections employers most frequently request to edit." unit="Requests">
                <HorizontalBarChart data={analytics.jobOffers?.editRequestsBySection} />
              </ChartCard>
              <ChartCard title="Educational Level Requirement Breakdown" subtitle="Published job posts grouped by education requirement." unit="Job Posts">
                <SimpleVerticalBarChart data={analytics.jobOffers?.educationRequirements} />
              </ChartCard>
              <ChartCard title="Average Salary Distribution across Work Modes" subtitle="Average midpoint salary for visible salary ranges by work mode." unit="PHP">
                <SimpleVerticalBarChart data={analytics.jobOffers?.salaryByWorkMode} valueFormatter={(value) => pesoFormat.format(Number(value || 0))} />
              </ChartCard>
            </div>
          </div>
        ) : null}

        {!loading && activeTab === "verification" ? (
          <div className="space-y-4">
            <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <TabKpiCard label="Pending Verification" value={analytics.verification?.kpis?.pendingVerification} icon={ShieldCheck} />
              <TabKpiCard label="Verification Approval Rate" value={analytics.verification?.kpis?.approvalRate} format="percent" icon={CheckCircle2} note={metricNotes.verificationRates} />
              <TabKpiCard label="Avg. Verification Turnaround" value={analytics.verification?.kpis?.avgTurnaroundDays} format="days" icon={TrendingUp} />
              <TabKpiCard label="Verification Declined Rate" value={analytics.verification?.kpis?.declinedRate} format="percent" icon={X} note={metricNotes.verificationRates} />
              <TabKpiCard label="Document Hold Rate" value={analytics.verification?.kpis?.documentHoldRate} format="percent" icon={FileText} />
            </section>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
              <ChartCard title="Jobseeker Verification Status by Campus" subtitle="Pending, approved, declined, and hold status composition by campus." unit="Records" className="xl:col-span-7">
                <GroupedBarChart data={analytics.verification?.jobseekerStatusByCampus} series={["Pending", "Approved", "Declined", "Hold"]} stacked />
              </ChartCard>
              <ChartCard title="Employer Verification Status & Declined Reasons" subtitle="Recorded employer verification decline reasons." unit="Records" className="xl:col-span-5">
                <SimpleVerticalBarChart data={analytics.verification?.employerDeclineReasons} />
              </ChartCard>
              <ChartCard title="Alumni Verification Rejection & Hold Reasons" subtitle="Recorded jobseeker rejection reasons and held document categories." unit="Records" className="xl:col-span-5">
                <SimpleVerticalBarChart data={analytics.verification?.alumniRejectionHoldReasons} />
              </ChartCard>
              <ChartCard title="Verification Submission Volume Over Time by Role" subtitle="Jobseeker and employer verification workload over time." unit="Monthly" className="xl:col-span-7">
                <GroupedBarChart data={analytics.verification?.submissionVolumeByRole} series={["Jobseeker", "Employer"]} />
              </ChartCard>
            </div>
          </div>
        ) : null}

        {!loading ? (
          <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3 text-[10px] text-slate-400">
            <span>Descriptive analytics only • No predictive scoring</span>
            <span>
              Timezone: {analytics.timezone || "Asia/Manila"} • Last updated: {analytics.generatedAt ? new Date(analytics.generatedAt).toLocaleString("en-PH") : "—"}
            </span>
          </footer>
        ) : null}
      </div>

      <ExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        selected={exportSections}
        setSelected={setExportSections}
        format={exportFormat}
        setFormat={setExportFormat}
        onExport={handleExport}
      />
    </main>
  );
};

export default AdminAnalytics;
