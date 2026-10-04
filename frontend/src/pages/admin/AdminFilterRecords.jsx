import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Eye, EyeOff, FileSpreadsheet, FileText, Filter, RefreshCw, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";


const AGAPAY_ADMIN_FILTER_RECORDS_FILTERS_KEY = "agapay:admin:filter-records:filters";

const readAgapayAdminFilterRecordsFiltersState = () => {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.sessionStorage.getItem(AGAPAY_ADMIN_FILTER_RECORDS_FILTERS_KEY) || "{}");
  } catch {
    return {};
  }
};

const saveAgapayAdminFilterRecordsFiltersState = (value) => {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(AGAPAY_ADMIN_FILTER_RECORDS_FILTERS_KEY, JSON.stringify(value));
  } catch {
    // Keep the page usable even when session storage is unavailable.
  }
};

const ROLE_OPTIONS = [
  ["jobseeker", "Job Seeker"],
  ["employer", "Employer"],
];

const INITIAL_FILTERS = {
  role: "",
  campus: "",
  course: "",
  yearGraduated: "",
  gender: "",
  companyName: "",
  industry: "",
  jobTitle: "",
  applicationStatus: "",
  workMode: "",
  employmentType: "",
};

const columnSets = {
  all: [
    ["date", "Date Registered"], ["fullName", "Full Name"], ["email", "Email"], ["contactNumber", "Contact Number"],
    ["roleLabel", "Role"], ["region", "Region"], ["province", "Province"], ["cityMunicipality", "City / Municipality"],
  ],
  jobseeker: [
    ["date", "Date Registered"], ["fullName", "Full Name"], ["email", "Email"], ["contactNumber", "Contact Number"],
    ["age", "Age"], ["civilStatus", "Civil Status"], ["gender", "Gender"], ["campus", "Campus"], ["course", "Course"],
    ["yearGraduated", "Year Graduated"], ["region", "Region"], ["province", "Province"], ["cityMunicipality", "City / Municipality"],
  ],
  employer: [
    ["date", "Date Registered"], ["fullName", "Full Name"], ["email", "Email"], ["contactNumber", "Contact Number"],
    ["companyName", "Company Name"], ["industry", "Industry"], ["region", "Region"], ["province", "Province"],
    ["cityMunicipality", "City / Municipality"],
  ],
  jobOffer: [
    ["date", "Date Posted"], ["companyName", "Company Name"], ["industry", "Industry"], ["jobTitle", "Job Title"],
    ["workMode", "Work Mode"], ["employmentType", "Employment Type"], ["vacancy", "Vacancy"], ["applicant", "Applicant"],
    ["applicationStatus", "Status"], ["validUntil", "Valid Until"],
  ],
  application: [
    ["date", "Date Applied"], ["fullName", "Full Name"], ["email", "Email"], ["contactNumber", "Contact Number"], ["age", "Age"],
    ["civilStatus", "Civil Status"], ["gender", "Gender"], ["campus", "Campus"], ["course", "Course"], ["yearGraduated", "Year Graduated"],
    ["region", "Region"], ["province", "Province"], ["cityMunicipality", "City / Municipality"], ["companyName", "Company Name"],
    ["jobTitle", "Job Title"], ["workMode", "Work Mode"], ["employmentType", "Employment Type"], ["applicationStatus", "Application Status"],
    ["processingTime", "Processing Time"], ["timesApplied", "Times Applied"], ["hiredDate", "Hired Date"],
  ],
};

const roleLabel = (value) => {
  if (value === "all") return "All Roles";
  if (value === "application") return "Applications";
  if (value === "jobOffer") return "Job Offers";
  return ROLE_OPTIONS.find(([key]) => key === value)?.[1] || "All Roles";
};

const optionItems = (values = []) => values.map((value) => [value, value]);

const StatusBadge = ({ value }) => {
  const text = String(value || "").trim();
  if (!text) return <span className="text-slate-400">—</span>;
  const normalized = text.toLowerCase();
  let cls = "bg-slate-100 text-slate-700";
  if (["hired", "approved", "open", "published", "active"].includes(normalized)) cls = "bg-emerald-50 text-emerald-700";
  else if (["pending", "for interview", "screening"].includes(normalized)) cls = "bg-amber-50 text-amber-700";
  else if (["declined", "closed", "expired", "withdrawn", "cancelled"].includes(normalized)) cls = "bg-rose-50 text-rose-700";
  return <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${cls}`}>{text}</span>;
};

const SelectField = ({ label, value, onChange, options, placeholder = "All" }) => (
  <label className="block">
    <span className="mb-1.5 block text-xs font-semibold text-slate-700">{label}</span>
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/10"
    >
      <option value="">{placeholder}</option>
      {options.map(([key, text]) => <option key={`${label}-${key}`} value={key}>{text}</option>)}
    </select>
  </label>
);

const PasswordModal = ({ open, title, password, setPassword, message, busy, onClose, onConfirm }) => {
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (open) setShowPassword(false);
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">{title}</h3>
            <p className="mt-1 text-sm text-slate-500">Enter your password to continue the export.</p>
          </div>
          <button type="button" onClick={onClose} disabled={busy} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"><X size={18} /></button>
        </div>

        <label className="mt-4 block">
          <span className="mb-1.5 block text-sm font-bold text-slate-700">Password</span>
          <div className="relative">
            <input
              autoFocus
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter") onConfirm(); }}
              placeholder="Enter your password"
              className="h-11 w-full rounded-xl border border-slate-200 px-3 pr-11 text-sm outline-none focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              disabled={busy}
              className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center text-slate-500 hover:text-[#2e66a6] disabled:opacity-50"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </label>

        {message ? <p className="mt-2 text-sm text-rose-600">{message}</p> : null}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={busy} className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700">Cancel</button>
          <button type="button" onClick={onConfirm} disabled={!password || busy} className="h-10 rounded-xl bg-[#2e66a6] px-4 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Exporting..." : "Confirm Export"}</button>
        </div>
      </div>
    </div>
  );
};

const AdminFilterRecords = () => {
  const navigate = useNavigate();
  const persistedFilterState = readAgapayAdminFilterRecordsFiltersState();
  const [filters, setFilters] = useState(() => ({ ...INITIAL_FILTERS, ...(persistedFilterState.filters || {}) }));
  const [appliedFilters, setAppliedFilters] = useState(() => ({ ...INITIAL_FILTERS, role: "all", ...(persistedFilterState.appliedFilters || {}) }));
  const [records, setRecords] = useState([]);
  const [options, setOptions] = useState({
    campuses: [], courses: [], yearsGraduated: [], genders: [], companyNames: [], industries: [], jobTitles: [],
    applicationStatuses: [], jobStatuses: [], workModes: [], employmentTypes: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exportType, setExportType] = useState("");
  const [exportPassword, setExportPassword] = useState("");
  const [exportMessage, setExportMessage] = useState("");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    saveAgapayAdminFilterRecordsFiltersState({ filters, appliedFilters });
  }, [filters, appliedFilters]);

  const activeColumns = columnSets[appliedFilters.role] || columnSets.all;
  const pagedRecords = useMemo(() => records, [records]);
  const baseRole = appliedFilters.role === "application" ? "jobseeker" : appliedFilters.role === "jobOffer" ? "employer" : appliedFilters.role;

  useEffect(() => {
    let cancelled = false;
    const loadRecords = async () => {
      try {
        setLoading(true);
        setError("");
        const params = Object.fromEntries(Object.entries(appliedFilters).filter(([, value]) => String(value || "").trim() !== ""));
        const response = await api.get("/admin/filter-records", { params });
        if (cancelled) return;
        setRecords(Array.isArray(response.data?.records) ? response.data.records : []);
        setOptions(response.data?.options || {});
      } catch (err) {
        if (cancelled) return;
        setRecords([]);
        setError(err?.response?.data?.message || "Unable to load filter records.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadRecords();
    return () => { cancelled = true; };
  }, [appliedFilters]);

  const setFilter = (name, value) => {
    setFilters((previous) => ({ ...previous, [name]: value }));
  };

  const changeRole = (value) => {
    setFilters({ ...INITIAL_FILTERS, role: value });
  };

  const applyFilters = () => {
    let targetRole = filters.role || "all";
    if (activeRole === "application" && filters.role === "jobseeker") targetRole = "application";
    if (activeRole === "jobOffer" && filters.role === "employer") targetRole = "jobOffer";
    setAppliedFilters({ ...filters, role: targetRole });
  };

  const resetFilters = () => {
    setFilters(INITIAL_FILTERS);
    setAppliedFilters({ ...INITIAL_FILTERS, role: "all" });
  };

  const switchTable = (tableRole) => {
    const nextBaseRole = tableRole === "application" ? "jobseeker" : tableRole === "jobOffer" ? "employer" : tableRole;
    const nextFilters = {
      ...INITIAL_FILTERS,
      role: nextBaseRole,
      ...(nextBaseRole === "jobseeker" ? {
        campus: filters.campus,
        course: filters.course,
        yearGraduated: filters.yearGraduated,
        gender: filters.gender,
      } : {
        companyName: filters.companyName,
        industry: filters.industry,
      }),
    };
    setFilters(nextFilters);
    setAppliedFilters({ ...nextFilters, role: tableRole });
  };

  const openExport = (type) => {
    setExportType(type);
    setExportPassword("");
    setExportMessage("");
  };

  const closeExport = () => {
    if (exporting) return;
    setExportType("");
    setExportPassword("");
    setExportMessage("");
  };

  const runExport = async () => {
    if (!exportType || !exportPassword) return;
    try {
      setExporting(true);
      setExportMessage("");
      const response = await api.post(
        `/admin/filter-records/export/${exportType}`,
        { filters: appliedFilters },
        { responseType: "blob", headers: { "x-admin-password": exportPassword } },
      );
      const disposition = response.headers?.["content-disposition"] || "";
      const encodedMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
      const plainMatch = disposition.match(/filename="?([^";]+)"?/i);
      const filename = encodedMatch?.[1]
        ? decodeURIComponent(encodedMatch[1])
        : plainMatch?.[1] || `agapay-filter-records.${exportType === "pdf" ? "pdf" : "xlsx"}`;
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setExportType("");
      setExportPassword("");
      setExportMessage("");
    } catch (err) {
      let message = "Unable to export records.";
      if (err?.response?.data instanceof Blob) {
        try {
          const json = JSON.parse(await err.response.data.text());
          message = json?.message || message;
        } catch (_) {
          // Keep fallback.
        }
      } else {
        message = err?.response?.data?.message || message;
      }
      setExportMessage(message);
    } finally {
      setExporting(false);
    }
  };

  const activeRole = appliedFilters.role;
  const showJobseekerFilters = activeRole === "jobseeker";
  const showEmployerFilters = activeRole === "employer";
  const showApplicationFilters = activeRole === "application";
  const showJobOfferFilters = activeRole === "jobOffer";

  return (
    <div className="min-h-screen bg-white py-3">
      <div className="w-full">
        <button
          type="button"
          onClick={() => navigate("/admin/dashboard")}
          className="mb-4 inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </button>

        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_270px]">
          <main className="min-w-0">
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#163f72] via-[#2e66a6] to-[#49a9d5] px-5 py-5 text-white shadow-sm sm:px-6">
              <img
                src="/images/WhiteDoutton.png"
                alt=""
                aria-hidden="true"
                className="pointer-events-none absolute -right-8 top-1/2 h-44 w-44 -translate-y-1/2 rotate-[18deg] object-contain opacity-[0.20]"
              />
              <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold">Filter Records</h1>
                  <p className="mt-1 text-sm text-white/80">{records.length} record(s) · {roleLabel(activeRole)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => openExport("pdf")} className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-[#245a93] shadow-sm hover:bg-slate-50">
                    <FileText size={16} /> Export PDF
                  </button>
                  <button type="button" onClick={() => openExport("excel")} className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-[#245a93] shadow-sm hover:bg-slate-50">
                    <FileSpreadsheet size={16} /> Export Excel
                  </button>
                </div>
              </div>
            </div>

            {baseRole === "jobseeker" || baseRole === "employer" ? (
              <div className="mt-3 flex flex-wrap items-center gap-2 px-1">
                <button
                  type="button"
                  onClick={() => switchTable(baseRole)}
                  className={`inline-flex h-8 items-center gap-2 rounded-lg px-3 text-xs font-semibold ${activeRole === baseRole ? "bg-[#2e66a6] text-white" : "bg-[#e8f4ff] text-[#2e66a6]"}`}
                >
                  <Filter size={14} /> {baseRole === "jobseeker" ? "Job Seeker" : "Employer"}
                </button>
                <button
                  type="button"
                  onClick={() => switchTable(baseRole === "jobseeker" ? "application" : "jobOffer")}
                  className={`inline-flex h-8 items-center rounded-lg px-3 text-xs font-semibold ${activeRole === (baseRole === "jobseeker" ? "application" : "jobOffer") ? "bg-[#2e66a6] text-white" : "bg-[#e8f4ff] text-[#2e66a6]"}`}
                >
                  {baseRole === "jobseeker" ? "Applications" : "Job Offers"}
                </button>
              </div>
            ) : null}

            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-100 p-4 shadow-sm sm:p-5">
              <div className="max-h-[620px] overflow-auto rounded-xl bg-white p-1">
                <table className="min-w-max border-separate border-spacing-x-0 border-spacing-y-1 text-left text-xs">
                  <thead className="sticky top-0 z-10 bg-white">
                    <tr>
                      <th className="whitespace-nowrap rounded-l-xl bg-white px-3 py-3 text-center font-bold text-slate-700 shadow-sm">#</th>
                      {activeColumns.map(([key, label], index) => (
                        <th
                          key={key}
                          className={`whitespace-nowrap bg-white px-3 py-3 font-bold text-slate-700 shadow-sm ${index === activeColumns.length - 1 ? "rounded-r-xl" : ""}`}
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={activeColumns.length + 1} className="px-4 py-16 text-center text-sm text-slate-500">Loading records...</td></tr>
                    ) : error ? (
                      <tr><td colSpan={activeColumns.length + 1} className="px-4 py-16 text-center text-sm text-rose-600">{error}</td></tr>
                    ) : pagedRecords.length === 0 ? (
                      <tr><td colSpan={activeColumns.length + 1} className="px-4 py-16 text-center text-sm text-slate-500">No records found for the selected filters.</td></tr>
                    ) : pagedRecords.map((record, rowIndex) => (
                      <tr key={record.id || rowIndex} className={rowIndex % 2 === 0 ? "bg-slate-50/90" : "bg-white"}>
                        <td className="border-r border-slate-100 px-3 py-2.5 text-center font-medium text-slate-700">{rowIndex + 1}</td>
                        {activeColumns.map(([key]) => (
                          <td key={`${record.id}-${key}`} className="max-w-[300px] border-r border-slate-100 px-3 py-2.5 align-top text-slate-700">
                            {key === "applicationStatus" ? <StatusBadge value={record[key]} /> : <span className="whitespace-normal break-words">{record[key] === "" || record[key] === null || record[key] === undefined ? "—" : String(record[key])}</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </main>

          <aside className="relative min-h-[660px] overflow-hidden rounded-xl bg-gradient-to-b from-[#163f72] via-[#2e66a6] to-[#38a0c8] shadow-sm xl:sticky xl:top-5 xl:self-start">
            <div className="relative z-10 flex items-center justify-between px-4 py-4 text-white">
              <div className="flex items-center gap-2"><Filter size={18} /><h2 className="text-lg font-bold">Filter Controls</h2></div>
              <button type="button" onClick={resetFilters} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-white px-3 text-xs font-semibold text-[#245a93]"><RefreshCw size={13} /> Reset</button>
            </div>

            <div className="relative z-10 mx-3 rounded-xl bg-white p-4 shadow-sm">
              <SelectField label="Role" value={filters.role} onChange={changeRole} options={ROLE_OPTIONS} placeholder="Select Role" />

              {(showJobseekerFilters || showApplicationFilters) ? (
                <>
                  <div className="mt-3"><SelectField label="Campus" value={filters.campus} onChange={(value) => setFilter("campus", value)} options={optionItems(options.campuses)} placeholder="All Campus" /></div>
                  <div className="mt-3"><SelectField label="Course" value={filters.course} onChange={(value) => setFilter("course", value)} options={optionItems(options.courses)} placeholder="All Course" /></div>
                  <div className="mt-3"><SelectField label="Year Graduated" value={filters.yearGraduated} onChange={(value) => setFilter("yearGraduated", value)} options={optionItems(options.yearsGraduated)} placeholder="All Year Graduated" /></div>
                  <div className="mt-3"><SelectField label="Gender" value={filters.gender} onChange={(value) => setFilter("gender", value)} options={optionItems(options.genders)} placeholder="All Gender" /></div>
                </>
              ) : null}

              {(showEmployerFilters || showJobOfferFilters) ? <div className="mt-3"><SelectField label="Company Name" value={filters.companyName} onChange={(value) => setFilter("companyName", value)} options={optionItems(options.companyNames)} placeholder="All Company Name" /></div> : null}
              {(showEmployerFilters || showJobOfferFilters) ? <div className="mt-3"><SelectField label="Industry" value={filters.industry} onChange={(value) => setFilter("industry", value)} options={optionItems(options.industries)} placeholder="All Industry" /></div> : null}

              {showApplicationFilters ? <div className="mt-3"><SelectField label="Company Name" value={filters.companyName} onChange={(value) => setFilter("companyName", value)} options={optionItems(options.companyNames)} placeholder="All Company Name" /></div> : null}
              {showApplicationFilters ? <div className="mt-3"><SelectField label="Job Title" value={filters.jobTitle} onChange={(value) => setFilter("jobTitle", value)} options={optionItems(options.jobTitles)} placeholder="All Job Title" /></div> : null}
              {showApplicationFilters ? <div className="mt-3"><SelectField label="Application Status" value={filters.applicationStatus} onChange={(value) => setFilter("applicationStatus", value)} options={optionItems(options.applicationStatuses)} placeholder="All Status" /></div> : null}

              {showJobOfferFilters ? <div className="mt-3"><SelectField label="Job Status" value={filters.applicationStatus} onChange={(value) => setFilter("applicationStatus", value)} options={optionItems(options.jobStatuses)} placeholder="All Job Status" /></div> : null}
              {showJobOfferFilters ? <div className="mt-3"><SelectField label="Work Mode" value={filters.workMode} onChange={(value) => setFilter("workMode", value)} options={optionItems(options.workModes)} placeholder="All Work Mode" /></div> : null}
              {showJobOfferFilters ? <div className="mt-3"><SelectField label="Employment Type" value={filters.employmentType} onChange={(value) => setFilter("employmentType", value)} options={optionItems(options.employmentTypes)} placeholder="All Employment Type" /></div> : null}
            </div>

            <div className="relative z-10 px-3 pb-4 pt-3">
              <button type="button" onClick={applyFilters} className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-bold text-[#245a93] shadow-md"><Filter size={15} /> Apply Filter</button>
            </div>

            <img
              src="/images/GlossyIcon.png"
              alt=""
              aria-hidden="true"
              className="pointer-events-none ml-auto mr-2 mb-3 mt-1 h-40 w-40 object-contain opacity-25"
            />
          </aside>
        </div>
      </div>

      <PasswordModal
        open={Boolean(exportType)}
        title={exportType === "pdf" ? "Export PDF" : "Export Excel"}
        password={exportPassword}
        setPassword={setExportPassword}
        message={exportMessage}
        busy={exporting}
        onClose={closeExport}
        onConfirm={runExport}
      />
    </div>
  );
};

export default AdminFilterRecords;
