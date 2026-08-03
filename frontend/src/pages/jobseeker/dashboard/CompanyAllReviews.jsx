import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../../services/api";

const PAGE_OPTIONS = ["10", "50", "100", "All"];

const getOutcomeLabel = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "still_in_process") return "Still in process";
  if (normalized === "offered") return "Offered";
  if (normalized === "not_offered") return "Not offered";
  if (normalized === "withdrew") return "Withdrew";
  return value || "Outcome not provided";
};

const formatTimeAgo = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const diff = Date.now() - date.getTime();
  const days = Math.max(0, Math.floor(diff / 86400000));
  if (days === 0) return "Today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years === 1 ? "" : "s"} ago`;
};

const CompanyAllReviews = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState("10");

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await api.get(`/companies/verified/${id}`);
        if (mounted) setCompany(response?.data?.company || null);
      } catch (err) {
        if (mounted) setError(err?.response?.data?.message || "Unable to load company reviews.");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [id]);

  const reviews = useMemo(() => Array.isArray(company?.reviews) ? company.reviews : [], [company]);
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return reviews;
    return reviews.filter((review) => [
      review?.reviewerName,
      review?.roleAppliedFor,
      review?.message,
      getOutcomeLabel(review?.outcome),
    ].some((value) => String(value || "").toLowerCase().includes(query)));
  }, [reviews, search]);

  const pageSize = perPage === "All" ? Math.max(filtered.length, 1) : Number(perPage);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const visibleReviews = perPage === "All"
    ? filtered
    : filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  useEffect(() => { setPage(1); }, [search, perPage]);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  const pageNumbers = useMemo(() => {
    const start = Math.max(1, Math.min(safePage - 2, totalPages - 4));
    const end = Math.min(totalPages, start + 4);
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }, [safePage, totalPages]);

  if (loading) return <div className="min-h-[70vh] flex items-center justify-center text-black/60">Loading reviews...</div>;
  if (error || !company) return <div className="min-h-[70vh] flex items-center justify-center text-red-600">{error || "Company not found."}</div>;

  return (
    <main className="min-h-screen bg-[#f7f9fc] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1280px]">
        <button
          type="button"
          onClick={() => navigate(`/jobseeker/company-details/${id}`, { state: { activeTab: "reviews" } })}
          className="mb-5 inline-flex items-center gap-2 rounded-xl border border-[#d8e2ee] bg-white px-4 py-2.5 text-sm font-semibold text-[#2e66a6] hover:bg-[#f7faff]"
        >
          <span aria-hidden="true">←</span> Back to Company Details
        </button>

        <section className="rounded-[1.35rem] border border-[#e6edf5] bg-white p-5 shadow-[0_18px_45px_rgba(46,102,166,0.08)] sm:p-7 lg:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-black sm:text-3xl">All Reviews for {company.companyName || "Company"}</h1>
              <p className="mt-1 text-black/60">{filtered.length} review{filtered.length === 1 ? "" : "s"}</p>
            </div>
            <div className="w-full lg:max-w-md">
              <label htmlFor="review-search" className="mb-2 block text-sm font-semibold text-black/70">Search reviews</label>
              <input
                id="review-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, role, message, or outcome"
                className="h-12 w-full rounded-xl border border-[#d8e2ee] px-4 text-sm outline-none focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/15"
              />
            </div>
          </div>

          <div className="mt-7 space-y-5">
            {visibleReviews.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#d8e2ee] px-6 py-14 text-center text-black/55">No reviews found.</div>
            ) : visibleReviews.map((review, index) => (
              <article key={review?._id || `${safePage}-${index}`} className="rounded-2xl border border-[#dfe7f0] bg-white px-5 py-5 shadow-[0_10px_28px_rgba(46,102,166,0.06)] sm:px-6 sm:py-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#e1e8f0] bg-[#f0f4f8] text-[#60758a]">▥</div>
                    <div>
                      <h2 className="text-[17px] font-bold text-black">{review?.reviewerName || "Anonymous User"}</h2>
                      <p className="mt-0.5 text-sm text-black/55">
                        {review?.roleAppliedFor || "Role not provided"}<span className="mx-1.5">·</span>{formatTimeAgo(review?.createdAt)}
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex w-fit rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{getOutcomeLabel(review?.outcome)}</span>
                </div>

                <p className="mt-5 text-base leading-7 text-black/80">{review?.message || "No written review provided."}</p>

                <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <Metric label="First reply" value={review?.daysToFirstResponse == null ? "Not provided" : `${Number(review.daysToFirstResponse) || 0}d`} />
                  <Metric label="Total length" value={review?.totalProcessDays == null ? "Not provided" : `${Number(review.totalProcessDays) || 0}d`} />
                  <Metric label="Process" value={`${Number(review?.processRating ?? review?.rating) || 0}/5`} />
                  <Metric label="Apply again?" value={typeof review?.wouldApplyAgain === "boolean" ? (review.wouldApplyAgain ? "Yes" : "No") : "Not provided"} />
                </div>
              </article>
            ))}
          </div>

          <Pagination page={safePage} totalPages={totalPages} setPage={setPage} perPage={perPage} setPerPage={setPerPage} pageNumbers={pageNumbers} totalItems={filtered.length} />
        </section>
      </div>
    </main>
  );
};

const Metric = ({ label, value }) => (
  <div className="rounded-xl border border-[#dfe7f0] bg-[#fbfcfe] px-4 py-3">
    <p className="text-sm text-black/50">{label}</p>
    <p className="mt-1 text-lg font-bold text-black">{value}</p>
  </div>
);

const Pagination = ({ page, totalPages, setPage, perPage, setPerPage, pageNumbers, totalItems }) => (
  <div className="mt-8 flex flex-col gap-4 border-t border-[#e6edf5] pt-6 xl:flex-row xl:items-center xl:justify-between">
    <div className="text-sm text-black/60">Page {page} of {totalPages} · {totalItems} total</div>
    <div className="flex flex-wrap items-center gap-2">
      <PageButton label="First" disabled={page === 1} onClick={() => setPage(1)} />
      <PageButton label="Previous" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))} />
      {pageNumbers.map((number) => <PageButton key={number} label={String(number)} active={number === page} onClick={() => setPage(number)} />)}
      <PageButton label="Next" disabled={page === totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} />
      <PageButton label="Last" disabled={page === totalPages} onClick={() => setPage(totalPages)} />
      <label className="ml-0 flex items-center gap-2 text-sm font-medium text-black/70 sm:ml-2">
        Display per page
        <select value={perPage} onChange={(event) => setPerPage(event.target.value)} className="h-10 rounded-lg border border-[#d8e2ee] bg-white px-3 outline-none focus:border-[#2e66a6]">
          {PAGE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      </label>
    </div>
  </div>
);

const PageButton = ({ label, disabled, active, onClick }) => (
  <button type="button" disabled={disabled} onClick={onClick} className={`h-10 rounded-lg border px-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${active ? "border-[#2e66a6] bg-[#2e66a6] text-white" : "border-[#d8e2ee] bg-white text-black/70 hover:border-[#2e66a6]/50 hover:bg-[#f7faff]"}`}>{label}</button>
);

export default CompanyAllReviews;
