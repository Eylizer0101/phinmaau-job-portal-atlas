import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import api from "../../../services/api";
import Pagination from "../../../components/shared/Pagination";


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
  const location = useLocation();
  const fromEmployerProfile = location.state?.source === "employer-profile";
  const handleBack = () => navigate(location.state?.returnTo || `/jobseeker/company-details/${id}`, { state: { activeTab: "reviews" } });
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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

  const numericPageSize = pageSize === "all" ? Math.max(filtered.length, 1) : Number(pageSize);
  const totalPages = pageSize === "all" ? 1 : Math.max(1, Math.ceil(filtered.length / numericPageSize));
  const safePage = Math.min(page, totalPages);
  const visibleReviews = pageSize === "all"
    ? filtered
    : filtered.slice((safePage - 1) * numericPageSize, safePage * numericPageSize);

  useEffect(() => { setPage(1); }, [search, pageSize]);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  if (loading) return <div className="min-h-[70vh] flex items-center justify-center text-black/60">Loading reviews...</div>;
  if (error || !company) return <div className="min-h-[70vh] flex items-center justify-center text-red-600">{error || "Company not found."}</div>;

  return (
    <main className="min-h-screen bg-[#f7f9fc] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1280px]">
        <button
          type="button"
          onClick={handleBack}
          className="mb-5 inline-flex items-center gap-2 rounded-xl border border-[#d8e2ee] bg-white px-4 py-2.5 text-sm font-semibold text-[#2e66a6] hover:bg-[#f7faff]"
        >
          <svg
            className="w-[18px] h-[18px] shrink-0 rotate-180"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
          {fromEmployerProfile ? "Back to Company Profile" : "Back to Company Details"}
        </button>

        <section className="rounded-[1.35rem] border border-[#e6edf5] bg-white p-5 shadow-[0_18px_45px_rgba(46,102,166,0.08)] sm:p-7 lg:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-black sm:text-3xl">All Reviews for {company.companyName || "Company"}</h1>
              <p className="mt-1 text-black/60">{filtered.length} review{filtered.length === 1 ? "" : "s"}</p>
            </div>
            <div className="w-full lg:max-w-md">
              <div className="relative">
                <svg
                  className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-black/40"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.8"
                    d="m21 21-4.35-4.35m1.35-5.65a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"
                  />
                </svg>
                <input
                  id="review-search"
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search reviews, name, or message"
                  aria-label="Search reviews"
                  className="h-12 w-full rounded-xl border border-[#d8e2ee] py-3 pl-12 pr-4 text-sm outline-none focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/15"
                />
              </div>
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

          <Pagination
            currentPage={safePage}
            totalItems={filtered.length}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            ariaLabel="Company reviews pagination"
          />
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

export default CompanyAllReviews;
