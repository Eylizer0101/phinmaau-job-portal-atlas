import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AdminLayout from "../../layouts/AdminLayout";
import api from "../../services/api";

const getName = (user = {}) =>
  user?.employerProfile?.companyName ||
  user?.companyName ||
  user?.fullName ||
  [user?.firstName, user?.middleName, user?.lastName].filter(Boolean).join(" ") ||
  user?.email ||
  "Community Member";

const getInitials = (name) => {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  return `${parts[0]?.[0] || "C"}${parts[1]?.[0] || ""}`.toUpperCase();
};

const formatDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
};

const Icon = ({ name, className = "h-4 w-4" }) => {
  const common = {
    className,
    fill: "none",
    stroke: "currentColor",
    viewBox: "0 0 24 24",
    strokeWidth: 2,
  };

  const icons = {
    arrowLeft: <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5m6-6-6 6 6 6" />,
    restore: <path strokeLinecap="round" strokeLinejoin="round" d="M4 10a8 8 0 108-6M4 4v6h6" />,
    trash: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13" />
        <path strokeLinecap="round" d="M10 11v5m4-5v5" />
      </>
    ),
    calendar: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 3v3m12-3v3M4 9h16M5 5h14a1 1 0 011-1v14H4V6a1 1 0 011-1z" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="3" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 20a7 7 0 0114 0" />
      </>
    ),
    building: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 21V4h14v17M3 21h18M9 8h2m2 0h2M9 12h2m2 0h2M9 16h2m2 0h2" />
      </>
    ),
    mail: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18v12H3z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="m3 7 9 6 9-6" />
      </>
    ),
    phone: <path strokeLinecap="round" strokeLinejoin="round" d="M5 4h3l2 5-2 1a14 14 0 006 6l1-2 5 2v3a2 2 0 01-2 2C10 21 3 14 3 6a2 2 0 012-2z" />,
    location: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s7-6 7-12a7 7 0 10-14 0c0 6 7 12 7 12z" />
        <circle cx="12" cy="9" r="2" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 2" />
      </>
    ),
  };

  return <svg {...common}>{icons[name]}</svg>;
};

const ConfirmModal = ({ target, action, loading, onCancel, onConfirm }) => {
  if (!target) return null;

  const isDelete = action === "delete";
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-2xl">
        <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${isDelete ? "bg-red-50 text-red-600" : "bg-[#2e66a6]/10 text-[#2e66a6]"}`}>
          <Icon name={isDelete ? "trash" : "restore"} className="h-7 w-7" />
        </div>
        <h2 className="mt-5 text-xl font-bold text-slate-950">
          {isDelete ? "Delete permanently?" : "Restore archived item?"}
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          {isDelete
            ? "This record will be removed permanently and cannot be recovered."
            : "This record will be returned to the Community page."}
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="h-11 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={`h-11 rounded-xl text-sm font-bold text-white ${isDelete ? "bg-red-600 hover:bg-red-700" : "bg-[#2e66a6] hover:bg-[#255487]"}`}
          >
            {loading ? "Please wait..." : isDelete ? "Delete" : "Restore"}
          </button>
        </div>
      </div>
    </div>
  );
};

const InfoCard = ({ icon, label, value, full = false }) => (
  <div className={`rounded-xl border border-slate-200 bg-slate-50 p-4 ${full ? "sm:col-span-2" : ""}`}>
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#2e66a6] shadow-sm">
        <Icon name={icon} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
        <p className="mt-1 break-words text-sm font-semibold text-slate-900">{value || "—"}</p>
      </div>
    </div>
  </div>
);

const DormantDetails = ({ data, loading, errorMessage, onBack }) => {
  if (loading) {
    return <div className="flex min-h-[320px] items-center justify-center text-sm text-slate-500">Loading dormant account details...</div>;
  }

  if (errorMessage || !data) {
    return <div className="flex min-h-[320px] items-center justify-center px-6 text-center text-sm text-red-600">{errorMessage || "Dormant account not found."}</div>;
  }

  const user = data.user || {};
  const name = getName(user);
  const isEmployer = user.role === "employer";

  return (
    <div className="px-5 pb-6 pt-4">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 hover:text-[#2e66a6]"
      >
        <Icon name="arrowLeft" />
        Back to Dormant
      </button>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-[#2e66a6] shadow-sm">
              {isEmployer ? <Icon name="building" className="h-8 w-8" /> : <span className="text-lg font-bold">{getInitials(name)}</span>}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-xl font-bold text-slate-950">{name}</h1>
                <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                  Dormant Account
                </span>
              </div>
              <p className="mt-2 text-sm capitalize text-slate-500">{user.role || "user"} account</p>
            </div>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-center">
            <p className="text-2xl font-bold text-amber-700">{data.inactivityMonths}</p>
            <p className="text-xs font-semibold text-amber-700">months inactive</p>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <InfoCard icon="mail" label="Email Address" value={user.email} />
        <InfoCard icon="phone" label="Contact Number" value={data.phoneNumber} />
        <InfoCard icon="calendar" label="Date Registered" value={formatDate(user.createdAt)} />
        <InfoCard icon="clock" label="Last Login / Activity" value={formatDate(data.lastActive)} />
        <InfoCard icon={isEmployer ? "building" : "user"} label={isEmployer ? "Industry" : "Course"} value={data.industryOrCourse} />
        <InfoCard icon="user" label="Account Status" value={user.status || "active"} />
        <InfoCard icon="location" label={isEmployer ? "Company Address" : "Campus / Address"} value={data.location} full />
      </div>

      <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 px-5 py-4 text-sm leading-6 text-blue-800">
        This account appears automatically in Dormant because its last login, or registration date when no login exists, is between 6 and 12 months ago.
      </div>
    </div>
  );
};


const JobArchiveDetails = ({ data, loading, errorMessage, onBack }) => {
  if (loading) {
    return <div className="flex min-h-[320px] items-center justify-center text-sm text-slate-500">Loading archived job details...</div>;
  }

  if (errorMessage || !data?.job) {
    return <div className="flex min-h-[320px] items-center justify-center px-6 text-center text-sm text-red-600">{errorMessage || "Archived job not found."}</div>;
  }

  const job = data.job;
  const applicants = data.declinedApplicants || [];

  return (
    <div className="px-5 pb-6 pt-4">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 hover:text-[#2e66a6]"
      >
        <Icon name="arrowLeft" />
        Back to Jobs
      </button>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-slate-950">{job.title || "Untitled job"}</h1>
              {data.isClosed ? <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700">Closed</span> : null}
              {data.isExpired ? <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">Expired</span> : null}
            </div>
            <p className="mt-2 text-sm font-semibold text-slate-600">{job.companyName || "Unspecified company"}</p>
            <p className="mt-1 text-xs text-slate-500">{job.location || "Location not specified"} · {job.workMode || "Work mode not specified"}</p>
          </div>

          <div className="rounded-xl border border-rose-200 bg-rose-50 px-5 py-3 text-center">
            <p className="text-2xl font-bold text-rose-700">{applicants.length}</p>
            <p className="text-xs font-semibold text-rose-700">declined applicants</p>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <InfoCard icon="calendar" label="Application Deadline" value={formatDate(job.applicationDeadline)} />
        <InfoCard icon="clock" label="Last Updated" value={formatDate(job.updatedAt)} />
        <InfoCard icon="building" label="Employment Type" value={job.jobType} />
        <InfoCard icon="location" label="Work Location" value={job.location} />
      </div>

      <div className="mt-6">
        <h2 className="text-sm font-bold text-slate-950">Declined applicants</h2>
        <p className="mt-1 text-xs text-slate-500">Applicants are shown with the stage where the employer declined them.</p>

        {applicants.length === 0 ? (
          <div className="mt-4 flex min-h-[140px] items-center justify-center rounded-xl border border-slate-200 text-sm text-slate-500">
            No declined applicants were found for this job.
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
            <div className="grid min-w-[760px] grid-cols-[1.3fr_0.9fr_1fr_0.9fr_0.9fr] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold text-slate-500">
              <span>Applicant</span>
              <span>Jobseeker level</span>
              <span>Declined stage</span>
              <span>Date applied</span>
              <span>Date declined</span>
            </div>
            {applicants.map((application) => (
              <div
                key={application._id}
                className="grid min-w-[760px] grid-cols-[1.3fr_0.9fr_1fr_0.9fr_0.9fr] gap-3 border-b border-slate-100 px-4 py-3 text-xs last:border-b-0"
              >
                <span className="font-semibold text-slate-900">{application.applicantName}</span>
                <span className="text-slate-600">{application.jobseekerLevel || "Not specified"}</span>
                <span><span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-1 font-semibold text-rose-700">{application.declinedStage}</span></span>
                <span className="text-slate-500">{formatDate(application.appliedAt)}</span>
                <span className="text-slate-500">{formatDate(application.declinedAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const AdminArchiveDetails = () => {
  const navigate = useNavigate();
  const { type, id } = useParams();

  const [author, setAuthor] = useState(null);
  const [items, setItems] = useState([]);
  const [dormantData, setDormantData] = useState(null);
  const [jobData, setJobData] = useState(null);
  const [filterType, setFilterType] = useState("all");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [confirmState, setConfirmState] = useState({ target: null, action: "" });
  const [actionLoading, setActionLoading] = useState(false);

  const isDormantView = type === "dormant-user";
  const isJobView = type === "job";

  const loadDetails = useCallback(async () => {
    if (!["community-author", "dormant-user", "job"].includes(type)) {
      setErrorMessage("Unsupported archive detail type.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const response = await api.get(`/admin/archive/${type}/${id}`);

      if (type === "dormant-user") {
        setDormantData(response.data || null);
      } else if (type === "job") {
        setJobData(response.data || null);
      } else {
        setAuthor(response.data?.author || null);
        setItems(response.data?.items || []);
      }
    } catch (error) {
      console.error("Failed to load archive details:", error);
      setAuthor(null);
      setItems([]);
      setDormantData(null);
      setJobData(null);
      setErrorMessage(error?.response?.data?.message || "Failed to load archive details.");
    } finally {
      setLoading(false);
    }
  }, [id, type]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  const visibleItems = useMemo(() => {
    if (filterType === "all") return items;
    return items.filter((item) => item.archiveType === filterType);
  }, [filterType, items]);

  const runAction = async () => {
    const target = confirmState.target;
    if (!target) return;

    const endpointType = target.archiveType === "post" ? "community-post" : "community-comment";
    setActionLoading(true);

    try {
      if (confirmState.action === "restore") {
        await api.patch(`/admin/archive/${endpointType}/${target._id}/restore`);
      } else {
        await api.delete(`/admin/archive/${endpointType}/${target._id}`);
      }

      setConfirmState({ target: null, action: "" });
      await loadDetails();
    } catch (error) {
      console.error("Community archive action failed:", error);
      window.alert(error?.response?.data?.message || "The requested action failed.");
    } finally {
      setActionLoading(false);
    }
  };

  if (isJobView) {
    return (
      <AdminLayout>
        <main className="mx-auto w-full max-w-[1120px] px-4 py-8 sm:px-6 lg:px-8">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h1 className="text-sm font-bold text-slate-950">Archived Job Details</h1>
              <p className="mt-0.5 text-xs text-slate-500">
                Review the closed or expired job and its declined applicants.
              </p>
            </div>
            <JobArchiveDetails
              data={jobData}
              loading={loading}
              errorMessage={errorMessage}
              onBack={() => navigate("/admin/archive?tab=jobs")}
            />
          </section>
        </main>
      </AdminLayout>
    );
  }

  if (isDormantView) {
    return (
      <AdminLayout>
        <main className="mx-auto w-full max-w-[1120px] px-4 py-8 sm:px-6 lg:px-8">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h1 className="text-sm font-bold text-slate-950">Dormant Account Details</h1>
              <p className="mt-0.5 text-xs text-slate-500">
                Review the profile and inactivity information of this account.
              </p>
            </div>
            <DormantDetails
              data={dormantData}
              loading={loading}
              errorMessage={errorMessage}
              onBack={() => navigate("/admin/archive?tab=dormant")}
            />
          </section>
        </main>
      </AdminLayout>
    );
  }

  const authorName = getName(author || {});

  return (
    <AdminLayout>
      <main className="mx-auto w-full max-w-[1280px] px-4 py-8 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h1 className="text-sm font-bold text-slate-950">Archive Manager</h1>
            <p className="mt-0.5 text-xs text-slate-500">
              Review, restore, or permanently delete archived community records.
            </p>
          </div>

          <div className="px-5 pb-5 pt-4">
            <div className="mb-5 inline-flex h-10 items-center rounded-lg border border-slate-200 bg-slate-50 px-5 text-sm font-bold text-slate-900 shadow-sm">
              Community
            </div>

            <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate("/admin/archive")}
                  className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 hover:text-[#2e66a6]"
                >
                  <Icon name="arrowLeft" />
                  Back
                </button>

                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">
                  {getInitials(authorName)}
                </div>

                <div>
                  <h2 className="text-sm font-bold text-slate-950">{authorName}</h2>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                    <span>{author?.campus || "Unspecified campus"}</span>
                    <span>{author?.course || "Unspecified course"}</span>
                  </div>
                </div>
              </div>

              <select
                value={filterType}
                onChange={(event) => setFilterType(event.target.value)}
                className="h-10 min-w-[150px] rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#2e66a6]"
              >
                <option value="all">All types</option>
                <option value="post">Posts</option>
                <option value="comment">Comments</option>
              </select>
            </div>

            {loading ? (
              <div className="flex min-h-[220px] items-center justify-center text-sm text-slate-500">
                Loading deletion history...
              </div>
            ) : errorMessage ? (
              <div className="flex min-h-[220px] items-center justify-center px-6 text-center text-sm text-red-600">
                {errorMessage}
              </div>
            ) : visibleItems.length === 0 ? (
              <div className="flex min-h-[220px] items-center justify-center text-sm text-slate-500">
                No archived posts or comments found for this jobseeker.
              </div>
            ) : (
              <div className="space-y-3">
                {visibleItems.map((item) => (
                  <article
                    key={`${item.archiveType}-${item._id}`}
                    className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex items-start gap-3">
                        <span className={`mt-0.5 rounded-md px-2 py-1 text-[10px] font-bold ${item.archiveType === "post" ? "bg-blue-50 text-blue-700 ring-1 ring-blue-100" : "bg-violet-50 text-violet-700 ring-1 ring-violet-100"}`}>
                          {item.archiveType === "post" ? "Post" : "Comment"}
                        </span>
                        <div className="min-w-0">
                          <p className="break-words text-sm font-medium leading-6 text-slate-900">
                            {item.content || "No content"}
                          </p>
                          {item.archiveType === "comment" && item.postContent ? (
                            <p className="mt-1 line-clamp-1 text-xs text-slate-400">
                              On post: {item.postContent}
                            </p>
                          ) : null}
                          <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-slate-500">
                            <Icon name="calendar" className="h-3 w-3" />
                            {formatDate(item.deletedAt)}
                            {item.deletedByName ? ` · by ${item.deletedByName}` : ""}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2 sm:justify-end">
                      <button
                        type="button"
                        onClick={() => setConfirmState({ target: item, action: "restore" })}
                        className="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                      >
                        <Icon name="restore" />
                        Restore
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmState({ target: item, action: "delete" })}
                        className="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                      >
                        <Icon name="trash" />
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <ConfirmModal
        target={confirmState.target}
        action={confirmState.action}
        loading={actionLoading}
        onCancel={() => !actionLoading && setConfirmState({ target: null, action: "" })}
        onConfirm={runAction}
      />
    </AdminLayout>
  );
};

export default AdminArchiveDetails;
