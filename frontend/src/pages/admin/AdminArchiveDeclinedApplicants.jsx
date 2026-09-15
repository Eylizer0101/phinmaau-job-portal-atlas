import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import AdminLayout from "../../layouts/AdminLayout";
import api from "../../services/api";
import Pagination from "../../components/shared/Pagination";

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-PH", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
};

const Icon = ({ name, className = "h-4 w-4" }) => {
  const paths = {
    arrowLeft: <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />,
    search: <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m1.1-5.4a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" />,
    eye: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12s3.75-6.75 9.75-6.75S21.75 12 21.75 12 18 18.75 12 18.75 2.25 12 2.25 12z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </>
    ),
  };

  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" aria-hidden="true">
      {paths[name] || null}
    </svg>
  );
};

const DATE_OPTIONS = [
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

const formatDateInput = (date) => {
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return "";
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getPresetRange = (value) => {
  const today = new Date();
  const current = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  if (value === "today") return { dateFrom: formatDateInput(current), dateTo: formatDateInput(current) };
  if (value === "yesterday") {
    const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
    return { dateFrom: formatDateInput(yesterday), dateTo: formatDateInput(yesterday) };
  }
  if (value === "thisWeek") {
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    return {
      dateFrom: formatDateInput(new Date(today.getFullYear(), today.getMonth(), today.getDate() - mondayOffset)),
      dateTo: formatDateInput(current),
    };
  }
  if (value === "7days") {
    return {
      dateFrom: formatDateInput(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6)),
      dateTo: formatDateInput(current),
    };
  }
  if (value === "thisMonth") {
    return { dateFrom: formatDateInput(new Date(today.getFullYear(), today.getMonth(), 1)), dateTo: formatDateInput(current) };
  }
  if (value === "lastMonth") {
    return {
      dateFrom: formatDateInput(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
      dateTo: formatDateInput(new Date(today.getFullYear(), today.getMonth(), 0)),
    };
  }
  if (value === "thisYear") {
    return { dateFrom: formatDateInput(new Date(today.getFullYear(), 0, 1)), dateTo: formatDateInput(current) };
  }
  if (value === "lastYear") {
    return {
      dateFrom: formatDateInput(new Date(today.getFullYear() - 1, 0, 1)),
      dateTo: formatDateInput(new Date(today.getFullYear() - 1, 11, 31)),
    };
  }
  return { dateFrom: "", dateTo: "" };
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const addCalendarMonths = (date, amount) => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + amount);
  return next;
};

const CalendarMonth = ({ monthDate, startDate, endDate, onPickDate, onChangeMonth }) => {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const gridStart = new Date(year, month, 1 - new Date(year, month, 1).getDay());
  const start = startDate ? new Date(`${startDate}T00:00:00`) : null;
  const end = endDate ? new Date(`${endDate}T00:00:00`) : null;
  const days = Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + index);
    return day;
  });
  const years = Array.from({ length: new Date().getFullYear() - 1949 }, (_, index) => 1950 + index);
  const sameDay = (a, b) => a && b && a.toDateString() === b.toDateString();

  return (
    <div className="min-w-0 flex-1">
      <div className="mb-4 grid grid-cols-[32px_1fr_32px] items-center gap-2">
        <button type="button" onClick={() => onChangeMonth(addCalendarMonths(monthDate, -1))} className="flex h-8 w-8 items-center justify-center rounded-lg text-2xl text-slate-700 hover:bg-slate-100">‹</button>
        <div className="grid grid-cols-[1fr_86px] gap-2">
          <select value={month} onChange={(e) => onChangeMonth(new Date(year, Number(e.target.value), 1))} className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-center text-sm font-extrabold text-[#212C61]">
            {MONTH_NAMES.map((name, index) => <option key={name} value={index}>{name}</option>)}
          </select>
          <select value={year} onChange={(e) => onChangeMonth(new Date(Number(e.target.value), month, 1))} className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-center text-sm font-extrabold text-[#212C61]">
            {years.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </div>
        <button type="button" onClick={() => onChangeMonth(addCalendarMonths(monthDate, 1))} className="flex h-8 w-8 items-center justify-center rounded-lg text-2xl text-slate-700 hover:bg-slate-100">›</button>
      </div>
      <div className="grid grid-cols-7 gap-y-2 text-center text-xs font-bold text-slate-500">
        {["SU","MO","TU","WE","TH","FR","SA"].map((day) => <div key={day}>{day}</div>)}
      </div>
      <div className="mt-3 grid grid-cols-7 gap-y-1 text-center text-sm">
        {days.map((day) => {
          const value = formatDateInput(day);
          const outside = day.getMonth() !== month;
          const selected = sameDay(day, start) || sameDay(day, end);
          const ranged = start && end && day >= start && day <= end;
          return (
            <button type="button" key={value} onClick={() => onPickDate(value)}
              className={`mx-auto flex h-9 w-full items-center justify-center transition ${outside ? "text-slate-300" : "text-slate-700"} ${ranged ? "bg-[#212C61]/10 text-[#212C61]" : ""} ${selected ? "rounded-lg bg-[#212C61] font-extrabold text-white shadow-md" : "hover:bg-[#212C61]/10"}`}>
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const CustomDateRangeModal = ({ open, startDate, endDate, onCancel, onApply }) => {
  const todayValue = formatDateInput(new Date());
  const [draftStart, setDraftStart] = useState(startDate || todayValue);
  const [draftEnd, setDraftEnd] = useState(endDate || todayValue);
  const [leftMonth, setLeftMonth] = useState(new Date(`${startDate || todayValue}T00:00:00`));
  const [rightMonth, setRightMonth] = useState(new Date(`${endDate || todayValue}T00:00:00`));

  useEffect(() => {
    if (!open) return;
    const nextStart = startDate || todayValue;
    const nextEnd = endDate || todayValue;
    setDraftStart(nextStart);
    setDraftEnd(nextEnd);
    setLeftMonth(new Date(`${nextStart}T00:00:00`));
    setRightMonth(new Date(`${nextEnd}T00:00:00`));
  }, [open, startDate, endDate, todayValue]);

  if (!open) return null;

  const pickDate = (value) => {
    if (!draftStart || (draftStart && draftEnd)) {
      setDraftStart(value);
      setDraftEnd("");
    } else if (new Date(`${value}T00:00:00`) < new Date(`${draftStart}T00:00:00`)) {
      setDraftEnd(draftStart);
      setDraftStart(value);
    } else {
      setDraftEnd(value);
    }
  };

  const formatLabel = (value) => new Date(`${value}T00:00:00`).toLocaleDateString("en-PH", { month: "short", day: "2-digit", year: "numeric" });

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 px-4 py-6" role="dialog" aria-modal="true">
      <div className="w-full max-w-[920px] overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="grid gap-6 px-6 pb-5 pt-6 md:grid-cols-[1fr_auto_1fr] md:items-end">
          <div><div className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-500">Start Date</div><div className="flex h-14 items-center gap-3 rounded-xl bg-slate-100 px-5 text-xl font-extrabold text-[#212C61]">{formatLabel(draftStart)}</div></div>
          <div className="hidden pb-4 text-3xl text-slate-500 md:block">→</div>
          <div><div className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-500">End Date</div><div className="flex h-14 items-center gap-3 rounded-xl bg-slate-100 px-5 text-xl font-extrabold text-[#212C61]">{draftEnd ? formatLabel(draftEnd) : "Select date"}</div></div>
        </div>
        <div className="grid gap-8 px-6 pb-5 md:grid-cols-2">
          <CalendarMonth monthDate={leftMonth} startDate={draftStart} endDate={draftEnd} onPickDate={pickDate} onChangeMonth={setLeftMonth} />
          <CalendarMonth monthDate={rightMonth} startDate={draftStart} endDate={draftEnd} onPickDate={pickDate} onChangeMonth={setRightMonth} />
        </div>
        <div className="flex items-center justify-end gap-5 border-t border-slate-100 px-6 py-5">
          <button type="button" onClick={onCancel} className="text-base font-bold text-slate-600 hover:text-slate-900">Cancel</button>
          <button type="button" onClick={() => draftStart && draftEnd && onApply(draftStart, draftEnd)} disabled={!draftStart || !draftEnd} className="h-12 rounded-xl bg-[#212C61] px-9 text-base font-extrabold text-white shadow-lg disabled:opacity-60">Apply Range</button>
        </div>
      </div>
    </div>
  );
};

const AdminArchiveDeclinedApplicants = () => {
  const { employerId, jobId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState("all");
  const [date, setDate] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showCustomDateModal, setShowCustomDateModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [openingProfileId, setOpeningProfileId] = useState("");

  const backPath = location.state?.backPath || `/admin/archive/account/${employerId}`;

  const loadRecord = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const response = await api.get(`/admin/archive/account/${employerId}`);
      const records = Array.isArray(response.data?.records) ? response.data.records : [];
      const matched = records.find(
        (item) =>
          item.archiveType === "declined-applicants" &&
          String(item.jobId || "") === String(jobId || "")
      );

      if (!matched) {
        setRecord(null);
        setErrorMessage("Declined applicants for this archived job were not found.");
        return;
      }

      setRecord(matched);
    } catch (error) {
      console.error("Failed to load declined applicants:", error);
      setRecord(null);
      setErrorMessage(error?.response?.data?.message || "Failed to load declined applicants.");
    } finally {
      setLoading(false);
    }
  }, [employerId, jobId]);

  useEffect(() => {
    loadRecord();
  }, [loadRecord]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, level, date]);

  const applicants = useMemo(
    () => (Array.isArray(record?.applicants) ? record.applicants : []),
    [record]
  );

  const levels = useMemo(
    () =>
      [...new Set(applicants.map((item) => String(item.jobSeekerLevel || "").trim()).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b)),
    [applicants]
  );

  const filteredApplicants = useMemo(() => {
    const query = search.trim().toLowerCase();
    const startDate = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
    const endDate = dateTo ? new Date(`${dateTo}T23:59:59.999`) : null;

    return applicants.filter((applicant) => {
      if (level !== "all" && String(applicant.jobSeekerLevel || "") !== level) return false;

      if (query) {
        const searchable = [
          applicant.applicantName,
          applicant.email,
          applicant.jobSeekerLevel,
          applicant.declinedStage,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!searchable.includes(query)) return false;
      }

      if (date !== "all") {
        const declinedAt = new Date(applicant.declinedAt || applicant.archivedAt || 0);
        if (Number.isNaN(declinedAt.getTime())) return false;
        if (startDate && declinedAt < startDate) return false;
        if (endDate && declinedAt > endDate) return false;
      }

      return true;
    });
  }, [applicants, date, dateFrom, dateTo, level, search]);

  const pageCount = pageSize === "all" ? 1 : Math.max(1, Math.ceil(filteredApplicants.length / pageSize));
  const safePage = Math.min(currentPage, pageCount);
  const paginatedApplicants = useMemo(() => {
    if (pageSize === "all") return filteredApplicants;
    const start = (safePage - 1) * pageSize;
    return filteredApplicants.slice(start, start + pageSize);
  }, [filteredApplicants, pageSize, safePage]);

  const jobTitle = record?.title || location.state?.jobTitle || "Archived Job";
  const count = applicants.length;

  const getDirectJobseekerId = (applicant) => {
    const possibleIds = [
      applicant?.jobseekerId,
      applicant?.jobSeekerId,
      applicant?.userId,
      applicant?.jobseeker?._id,
      applicant?.jobseeker?.id,
      typeof applicant?.jobseeker === "string" ? applicant.jobseeker : "",
    ];

    return String(possibleIds.find(Boolean) || "").trim();
  };

  const viewProfile = async (applicant) => {
    const applicantEmail = String(applicant?.email || "").trim().toLowerCase();
    const applicationId = String(
      applicant?.applicationId || applicant?._id || ""
    ).trim();
    const loadingKey = String(
      applicationId || getDirectJobseekerId(applicant) || applicantEmail || "profile"
    );

    try {
      setOpeningProfileId(loadingKey);

      let resolvedUserId = getDirectJobseekerId(applicant);

      if (!resolvedUserId && applicationId) {
        try {
          const applicationResponse = await api.get(`/applications/${applicationId}`);
          const applicationData =
            applicationResponse.data?.application ||
            applicationResponse.data?.data ||
            applicationResponse.data ||
            {};

          resolvedUserId = String(
            applicationData?.jobseeker?._id ||
              applicationData?.jobseeker?.id ||
              applicationData?.jobseeker ||
              applicationData?.jobseekerId ||
              applicationData?.jobSeekerId ||
              ""
          ).trim();
        } catch (applicationError) {
          console.warn(
            "Unable to resolve Jobseeker from archived application:",
            applicationError
          );
        }
      }

      if (!resolvedUserId && applicantEmail) {
        const response = await api.get("/admin/users", {
          params: {
            role: "jobseeker",
            search: applicantEmail,
            page: 1,
            limit: 100,
          },
        });

        const users = Array.isArray(response.data?.users)
          ? response.data.users
          : [];

        const matchedUser =
          users.find(
            (user) =>
              String(user?.email || "").trim().toLowerCase() === applicantEmail
          ) || users[0];

        resolvedUserId = String(
          matchedUser?._id || matchedUser?.id || ""
        ).trim();
      }

      if (!resolvedUserId) {
        window.alert("Unable to find this Jobseeker profile.");
        return;
      }

      navigate(`/admin/users/${resolvedUserId}`, {
        state: {
          fromArchive: true,
          archiveBackPath: location.pathname,
        },
      });
    } catch (error) {
      console.error("Failed to open Jobseeker profile:", error);
      window.alert(
        error?.response?.data?.message ||
          "Unable to open this Jobseeker profile right now."
      );
    } finally {
      setOpeningProfileId("");
    }
  };

  const handleDateChange = (value) => {
    if (value === "custom") {
      setShowCustomDateModal(true);
      return;
    }
    const range = getPresetRange(value);
    setDate(value);
    setDateFrom(range.dateFrom);
    setDateTo(range.dateTo);
    setCurrentPage(1);
  };

  const applyCustomDateRange = (startDate, endDate) => {
    setDate("custom");
    setDateFrom(startDate);
    setDateTo(endDate);
    setShowCustomDateModal(false);
    setCurrentPage(1);
  };

  return (
    <AdminLayout>
      <main className="mx-auto w-full max-w-[1180px] px-1 py-8">
        <button
          type="button"
          onClick={() => navigate(backPath)}
          className="mb-5 inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-black shadow-sm hover:bg-slate-50"
        >
          <Icon name="arrowLeft" />
          Back
        </button>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <header className="border-b border-slate-200 px-5 py-5">
            <h1 className="text-2xl font-bold text-black">{jobTitle} – Declined Applicants</h1>
            <p className="mt-2 text-sm text-slate-600">
              {count} {count === 1 ? "applicant" : "applicants"} declined for {jobTitle}
            </p>
          </header>

          <div className="grid gap-3 border-b border-slate-200 p-4 lg:grid-cols-[minmax(320px,1.5fr)_minmax(220px,0.8fr)_minmax(190px,0.7fr)]">
            <label className="relative block">
              <span className="sr-only">Search declined applicants</span>
              <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search applicant..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/10"
              />
            </label>

            <select
              value={level}
              onChange={(event) => setLevel(event.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#2e66a6]"
            >
              <option value="all">All Job Seeker Level</option>
              {levels.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>

            <select
              value={date}
              onChange={(event) => handleDateChange(event.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#2e66a6]"
            >
              {DATE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div className={pageSize === 10 ? "overflow-x-auto overflow-y-visible" : "max-h-[812px] overflow-x-auto overflow-y-auto overscroll-auto"}> 
            <div className="min-w-[980px]">
              <div className="grid grid-cols-[1fr_1.35fr_1fr_1fr_0.9fr_0.55fr] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4 text-[11px] font-bold uppercase tracking-wide text-slate-600">
                <span>Applied Date</span>
                <span>Applicant</span>
                <span>Jobseeker Level</span>
                <span className="text-center">Decline Stage</span>
                <span>Archived Date</span>
                <span className="text-center">Actions</span>
              </div>

              {loading ? (
                <div className="min-h-[240px] bg-white" aria-hidden="true" />
              ) : errorMessage ? (
                <div className="flex min-h-[240px] items-center justify-center px-6 text-center text-sm text-red-600">
                  {errorMessage}
                </div>
              ) : paginatedApplicants.length === 0 ? (
                <div className="flex min-h-[240px] items-center justify-center text-sm text-slate-500">
                  No declined applicants found.
                </div>
              ) : (
                paginatedApplicants.map((applicant) => (
                  <div
                    key={applicant.applicationId || applicant._id}
                    className="grid grid-cols-[1fr_1.35fr_1fr_1fr_0.9fr_0.55fr] items-center gap-4 border-b border-slate-200 px-5 py-4 last:border-b-0"
                  >
                    <span className="text-sm text-slate-600">{formatDate(applicant.appliedAt)}</span>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-black">{applicant.applicantName || "Jobseeker"}</p>
                      <p className="truncate text-xs text-slate-500">{applicant.email || "—"}</p>
                    </div>

                    <span className="text-sm text-slate-600">{applicant.jobSeekerLevel || "Not specified"}</span>

                    <div className="text-center">
                      <p className="text-sm font-semibold text-red-600">{String(applicant.declinedStage || "").toLowerCase().includes("interview") ? "Interview" : "Screening"}</p>
                      <p className="mt-1 text-xs text-slate-500">{formatDate(applicant.declinedAt)}</p>
                    </div>

                    <span className="text-sm text-slate-600">{formatDate(applicant.archivedAt)}</span>

                    <div className="flex justify-center">
                      <button
                        type="button"
                        onClick={() => viewProfile(applicant)}
                        disabled={
                          openingProfileId ===
                          String(
                            applicant.applicationId ||
                              applicant._id ||
                              getDirectJobseekerId(applicant) ||
                              applicant.email ||
                              "profile"
                          )
                        }
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-[#2e66a6] transition hover:border-[#2e66a6] hover:bg-[#f7faff] disabled:cursor-wait disabled:opacity-60"
                        aria-label={`View ${applicant.applicantName || "applicant"} profile`}
                        title="View profile"
                      >
                        <Icon name="eye" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {filteredApplicants.length > 10 ? (
            <Pagination
              currentPage={safePage}
              totalItems={filteredApplicants.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          ) : null}
        </section>
      </main>
      <CustomDateRangeModal
        open={showCustomDateModal}
        startDate={dateFrom}
        endDate={dateTo}
        onCancel={() => setShowCustomDateModal(false)}
        onApply={applyCustomDateRange}
      />
    </AdminLayout>
  );
};

export default AdminArchiveDeclinedApplicants;
