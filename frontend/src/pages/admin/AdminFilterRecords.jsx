import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, FileSpreadsheet, FileText, Filter, RefreshCw, Search, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";

const ROLE_OPTIONS = [
  ["jobseeker", "Job Seeker"],
  ["employer", "Employer"],
  ["jobOffer", "Job Offers"],
  ["application", "Applications"],
];

const INITIAL_FILTERS = {
  role: "jobseeker",
  campus: "",
  course: "",
  yearGraduated: "",
  gender: "",
  companyName: "",
  jobTitle: "",
  applicationStatus: "",
  search: "",
};

const columnSets = {
  jobseeker: [
    ["date", "Date Registered"], ["fullName", "Full Name"], ["email", "Email"], ["contactNumber", "Contact Number"],
    ["age", "Age"], ["civilStatus", "Civil Status"], ["gender", "Gender"], ["campus", "Campus"], ["course", "Course"],
    ["yearGraduated", "Year Graduated"], ["region", "Region"], ["province", "Province"], ["cityMunicipality", "City / Municipality"], ["streetAddress", "Street Address"],
  ],
  employer: [
    ["date", "Date Registered"], ["fullName", "Full Name"], ["email", "Email"], ["contactNumber", "Contact Number"],
    ["companyName", "Company Name"], ["industry", "Industry"], ["region", "Region"], ["province", "Province"],
    ["cityMunicipality", "City / Municipality"], ["streetAddress", "Street Address"],
  ],
  jobOffer: [
    ["date", "Date Posted"], ["companyName", "Company Name"], ["industry", "Industry"], ["jobTitle", "Job Title"],
    ["workMode", "Work Mode"], ["employmentType", "Employment Type"], ["vacancy", "Vacancy"], ["applicant", "Applicant"],
    ["applicationStatus", "Status"], ["validUntil", "Valid Until"],
  ],
  application: [
    ["date", "Date Applied"], ["fullName", "Full Name"], ["email", "Email"], ["contactNumber", "Contact Number"], ["age", "Age"],
    ["civilStatus", "Civil Status"], ["gender", "Gender"], ["campus", "Campus"], ["course", "Course"], ["yearGraduated", "Year Graduated"],
    ["region", "Region"], ["province", "Province"], ["cityMunicipality", "City / Municipality"], ["streetAddress", "Street Address"],
    ["applicationStatus", "Application Status"], ["companyName", "Company Name"], ["jobTitle", "Job Title"], ["workMode", "Work Mode"],
    ["employmentType", "Employment Type"], ["processingTime", "Processing Time"], ["timesApplied", "Times Applied"], ["hiredDate", "Hired Date"],
  ],
};

const roleLabel = (value) => ROLE_OPTIONS.find(([key]) => key === value)?.[1] || "Job Seeker";
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
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">{title}</h3>
            <p className="mt-1 text-sm text-slate-500">Enter your admin password to continue the export.</p>
          </div>
          <button type="button" onClick={onClose} disabled={busy} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"><X size={18} /></button>
        </div>
        <input
          autoFocus
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter") onConfirm(); }}
          placeholder="Admin password"
          className="mt-4 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/10"
        />
        {message ? <p className="mt-2 text-sm text-rose-600">{message}</p> : null}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={busy} className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700">Cancel</button>
          <button type="button" onClick={onConfirm} disabled={!password || busy} className="h-10 rounded-xl bg-[#2e66a6] px-4 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Exporting..." : "Export"}</button>
        </div>
      </div>
    </div>
  );
};

const AdminFilterRecords = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(INITIAL_FILTERS);
  const [records, setRecords] = useState([]);
  const [options, setOptions] = useState({ campuses: [], courses: [], yearsGraduated: [], genders: [], companyNames: [], jobTitles: [], applicationStatuses: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exportType, setExportType] = useState("");
  const [exportPassword, setExportPassword] = useState("");
  const [exportMessage, setExportMessage] = useState("");
  const [exporting, setExporting] = useState(false);

  const activeColumns = columnSets[appliedFilters.role] || columnSets.jobseeker;
  const pagedRecords = useMemo(() => records, [records]);

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
    const next = { ...INITIAL_FILTERS, role: value };
    setFilters(next);
    setAppliedFilters(next);
  };

  const applyFilters = () => setAppliedFilters({ ...filters });
  const resetFilters = () => {
    const next = { ...INITIAL_FILTERS, role: filters.role };
    setFilters(next);
    setAppliedFilters(next);
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

  const showJobseekerFilters = filters.role === "jobseeker" || filters.role === "application";
  const showCompanyFilters = filters.role === "employer" || filters.role === "jobOffer" || filters.role === "application";
  const showJobFilters = filters.role === "jobOffer" || filters.role === "application";

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
                  <p className="mt-1 text-sm text-white/80">{records.length} record(s) · {roleLabel(appliedFilters.role)}</p>
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

            <div className="mt-3 flex flex-wrap items-center gap-2 px-1">
              <span className="inline-flex h-8 items-center gap-2 rounded-lg bg-[#2e66a6] px-3 text-xs font-semibold text-white"><Filter size={14} /> Active Table</span>
              <span className="rounded-full bg-[#e8f4ff] px-3 py-1.5 text-xs font-semibold text-[#2e66a6]">{roleLabel(appliedFilters.role)}</span>
              {appliedFilters.applicationStatus ? <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">{appliedFilters.applicationStatus}</span> : null}
              {appliedFilters.companyName ? <span className="max-w-[220px] truncate rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">{appliedFilters.companyName}</span> : null}
            </div>

            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-100 p-4 shadow-sm sm:p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div className="relative w-full max-w-sm">
                  <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={filters.search}
                    onChange={(event) => setFilter("search", event.target.value)}
                    onKeyDown={(event) => { if (event.key === "Enter") applyFilters(); }}
                    placeholder="Search records..."
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/10"
                  />
                </div>
                <div className="text-xs font-medium text-slate-500">Showing {records.length ? 1 : 0}-{records.length} of {records.length}</div>
              </div>

              <div className="max-h-[620px] overflow-auto bg-white">
                <table className="min-w-max border-separate border-spacing-0 text-left text-xs">
                  <thead className="sticky top-0 z-10 bg-white shadow-[0_1px_0_rgba(148,163,184,0.25)]">
                    <tr>
                      {activeColumns.map(([key, label]) => (
                        <th key={key} className="whitespace-nowrap border-r border-slate-100 bg-white px-3 py-3 font-bold text-slate-700">{label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={activeColumns.length} className="px-4 py-16 text-center text-sm text-slate-500">Loading records...</td></tr>
                    ) : error ? (
                      <tr><td colSpan={activeColumns.length} className="px-4 py-16 text-center text-sm text-rose-600">{error}</td></tr>
                    ) : pagedRecords.length === 0 ? (
                      <tr><td colSpan={activeColumns.length} className="px-4 py-16 text-center text-sm text-slate-500">No records found for the selected filters.</td></tr>
                    ) : pagedRecords.map((record, rowIndex) => (
                      <tr key={record.id || rowIndex} className={rowIndex % 2 === 0 ? "bg-slate-50/80" : "bg-white"}>
                        {activeColumns.map(([key]) => (
                          <td key={`${record.id}-${key}`} className="max-w-[300px] border-r border-t border-slate-100 px-3 py-2.5 align-top text-slate-700">
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

          <aside className="relative overflow-hidden rounded-xl bg-gradient-to-b from-[#163f72] via-[#2e66a6] to-[#38a0c8] shadow-sm xl:sticky xl:top-5 xl:self-start">
            <div className="relative z-10 flex items-center justify-between px-4 py-4 text-white">
              <div className="flex items-center gap-2"><Filter size={18} /><h2 className="text-lg font-bold">Filter Controls</h2></div>
              <button type="button" onClick={resetFilters} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-white px-3 text-xs font-semibold text-[#245a93]"><RefreshCw size={13} /> Reset</button>
            </div>

            <div className="relative z-10 mx-3 rounded-xl bg-white p-4 shadow-sm">
              <SelectField label="Role" value={filters.role} onChange={changeRole} options={ROLE_OPTIONS} placeholder="Select Role" />

              {showJobseekerFilters ? (
                <>
                  <div className="mt-3"><SelectField label="Campus" value={filters.campus} onChange={(value) => setFilter("campus", value)} options={optionItems(options.campuses)} placeholder="All Campus" /></div>
                  <div className="mt-3"><SelectField label="Course" value={filters.course} onChange={(value) => setFilter("course", value)} options={optionItems(options.courses)} placeholder="All Course" /></div>
                  <div className="mt-3"><SelectField label="Year Graduated" value={filters.yearGraduated} onChange={(value) => setFilter("yearGraduated", value)} options={optionItems(options.yearsGraduated)} placeholder="All Year Graduated" /></div>
                  <div className="mt-3"><SelectField label="Gender" value={filters.gender} onChange={(value) => setFilter("gender", value)} options={optionItems(options.genders)} placeholder="All Gender" /></div>
                </>
              ) : null}

              {showCompanyFilters ? <div className="mt-3"><SelectField label="Company Name" value={filters.companyName} onChange={(value) => setFilter("companyName", value)} options={optionItems(options.companyNames)} placeholder="All Company Name" /></div> : null}
              {showJobFilters ? <div className="mt-3"><SelectField label="Job Title" value={filters.jobTitle} onChange={(value) => setFilter("jobTitle", value)} options={optionItems(options.jobTitles)} placeholder="All Job Title" /></div> : null}
              {showJobFilters ? <div className="mt-3"><SelectField label={filters.role === "jobOffer" ? "Job Status" : "Application Status"} value={filters.applicationStatus} onChange={(value) => setFilter("applicationStatus", value)} options={optionItems(options.applicationStatuses)} placeholder="All Status" /></div> : null}
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
