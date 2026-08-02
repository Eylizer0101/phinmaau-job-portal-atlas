import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../../services/api";

const PAGE_OPTIONS = [10, 50, 100, "all"];

const formatTimeAgo = (value) => {
  const date = new Date(value || 0);
  if (Number.isNaN(date.getTime())) return "Date not available";
  const diff = Math.max(0, Date.now() - date.getTime());
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years === 1 ? "" : "s"} ago`;
};

const outcomeLabel = (value) => {
  const labels = {
    still_in_process: "Still in process",
    hired: "Hired",
    declined: "Declined",
    withdrew: "Withdrew",
  };
  return labels[value] || "Outcome not provided";
};

const Pagination = ({ currentPage, totalPages, onPageChange, pageSize, onPageSizeChange }) => {
  const pages = useMemo(() => {
    if (totalPages <= 1) return [1];
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, start + 4);
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }, [currentPage, totalPages]);

  return (
    <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-[#dfe7f0] bg-white p-4 lg:flex-row lg:items-center lg:justify-between">
      <label className="flex items-center gap-3 text-sm text-black/70">
        Display per page
        <select
          value={pageSize}
          onChange={(event) => onPageSizeChange(event.target.value)}
          className="h-10 rounded-lg border border-[#d8e2ee] bg-white px-3 outline-none focus:border-[#2e66a6]"
        >
          {PAGE_OPTIONS.map((option) => (
            <option key={option} value={option}>{option === "all" ? "All" : option}</option>
          ))}
        </select>
      </label>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => onPageChange(1)} disabled={currentPage === 1} className="h-10 rounded-lg border border-[#d8e2ee] px-3 text-sm disabled:opacity-40">First Page</button>
        <button type="button" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} className="h-10 rounded-lg border border-[#d8e2ee] px-3 text-sm disabled:opacity-40">Previous</button>
        {pages.map((page) => (
          <button
            key={page}
            type="button"
            onClick={() => onPageChange(page)}
            className={`h-10 min-w-10 rounded-lg border px-3 text-sm font-semibold ${page === currentPage ? "border-[#2e66a6] bg-[#2e66a6] text-white" : "border-[#d8e2ee] bg-white"}`}
          >
            {page}
          </button>
        ))}
        <button type="button" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} className="h-10 rounded-lg border border-[#d8e2ee] px-3 text-sm disabled:opacity-40">Next</button>
        <button type="button" onClick={() => onPageChange(totalPages)} disabled={currentPage === totalPages} className="h-10 rounded-lg border border-[#d8e2ee] px-3 text-sm disabled:opacity-40">Last Page</button>
      </div>
    </div>
  );
};

const CompanyReviewsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState("10");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    let active = true;
    const loadCompany = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await api.get(`/companies/verified/${id}`);
        if (active) setCompany(response?.data?.company || null);
      } catch (requestError) {
        if (active) setError(requestError?.response?.data?.message || "Unable to load company reviews.");
      } finally {
        if (active) setLoading(false);
      }
    };
    loadCompany();
    return () => { active = false; };
  }, [id]);

  const reviews = useMemo(() => Array.isArray(company?.reviews) ? company.reviews : [], [company]);
  const filteredReviews = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return reviews;
    return reviews.filter((review) => [review?.reviewerName, review?.roleAppliedFor, review?.message, outcomeLabel(review?.outcome)]
      .some((value) => String(value || "").toLowerCase().includes(query)));
  }, [reviews, search]);

  const numericPageSize = pageSize === "all" ? Math.max(1, filteredReviews.length) : Number(pageSize);
  const totalPages = Math.max(1, Math.ceil(filteredReviews.length / numericPageSize));
  const safePage = Math.min(currentPage, totalPages);
  const visibleReviews = pageSize === "all"
    ? filteredReviews
    : filteredReviews.slice((safePage - 1) * numericPageSize, safePage * numericPageSize);

  useEffect(() => { setCurrentPage(1); }, [search, pageSize]);

  if (loading) return <div className="mx-auto max-w-6xl px-6 py-16 text-center">Loading reviews...</div>;
  if (error || !company) return <div className="mx-auto max-w-6xl px-6 py-16 text-center text-red-600">{error || "Company not found."}</div>;

  return (
    <main className="mx-auto w-full max-w-[1280px] px-4 pb-12 pt-8 sm:px-6 lg:px-8">
      <button type="button" onClick={() => navigate(`/jobseeker/company-details/${id}`, { state: { activeTab: "reviews" } })} className="mb-5 inline-flex items-center gap-2 rounded-xl border border-[#d8e2ee] bg-white px-4 py-2.5 text-sm font-semibold hover:bg-[#f7faff]">← Back to Company Details</button>

      <section className="rounded-[1.35rem] border border-[#e6edf5] bg-white p-5 shadow-[0_18px_45px_rgba(46,102,166,0.08)] sm:p-7 lg:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#2e66a6]">Company Reviews</p>
            <h1 className="mt-2 text-3xl font-bold text-black">All reviews for {company.companyName || "Company"}</h1>
            <p className="mt-2 text-black/60">{filteredReviews.length} review{filteredReviews.length === 1 ? "" : "s"} found</p>
          </div>
          <div className="w-full lg:max-w-md">
            <label htmlFor="review-search" className="mb-2 block text-sm font-semibold text-black/70">Search reviews</label>
            <input id="review-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search reviewer, role, message, or outcome..." className="h-12 w-full rounded-xl border border-[#d8e2ee] px-4 outline-none focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/15" />
          </div>
        </div>

        <div className="mt-7 space-y-5">
          {visibleReviews.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#cbd8e6] bg-[#fbfcfe] p-10 text-center text-black/60">No reviews matched your search.</div>
          ) : visibleReviews.map((review, index) => (
            <article key={review?._id || index} className="rounded-2xl border border-[#dfe7f0] bg-white p-5 shadow-[0_10px_28px_rgba(46,102,166,0.06)] sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-black">{review?.reviewerName || "Anonymous User"}</h2>
                  <p className="mt-1 text-sm text-black/55">{review?.roleAppliedFor || "Role not provided"} · {formatTimeAgo(review?.createdAt)}</p>
                </div>
                <span className="w-fit rounded-full border border-[#bdd2ec] bg-[#f0f6fd] px-3 py-1 text-xs font-semibold text-[#2e66a6]">{outcomeLabel(review?.outcome)}</span>
              </div>
              <p className="mt-5 text-base leading-7 text-black/80">{review?.message || "No written review provided."}</p>
              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border border-[#dfe7f0] bg-[#fbfcfe] p-4"><p className="text-sm text-black/50">First reply</p><p className="mt-1 text-lg font-bold">{review?.daysToFirstResponse == null ? "Not provided" : `${Number(review.daysToFirstResponse) || 0}d`}</p></div>
                <div className="rounded-xl border border-[#dfe7f0] bg-[#fbfcfe] p-4"><p className="text-sm text-black/50">Total length</p><p className="mt-1 text-lg font-bold">{review?.totalProcessDays == null ? "Not provided" : `${Number(review.totalProcessDays) || 0}d`}</p></div>
                <div className="rounded-xl border border-[#dfe7f0] bg-[#fbfcfe] p-4"><p className="text-sm text-black/50">Process</p><p className="mt-1 text-lg font-bold">{review?.processRating == null ? "Not provided" : `${Number(review.processRating) || 0}/5`}</p></div>
                <div className="rounded-xl border border-[#dfe7f0] bg-[#fbfcfe] p-4"><p className="text-sm text-black/50">Apply again?</p><p className="mt-1 text-lg font-bold">{review?.wouldApplyAgain == null ? "Not provided" : review.wouldApplyAgain ? "Yes" : "No"}</p></div>
              </div>
            </article>
          ))}
        </div>

        {filteredReviews.length > 0 ? <Pagination currentPage={safePage} totalPages={totalPages} onPageChange={(page) => setCurrentPage(Math.min(Math.max(1, page), totalPages))} pageSize={pageSize} onPageSizeChange={setPageSize} /> : null}
      </section>
    </main>
  );
};

export default CompanyReviewsPage;
