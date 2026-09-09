import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AdminLayout from "../../layouts/AdminLayout";
import api from "../../services/api";
import Pagination from "../../components/shared/Pagination";

const API_ORIGIN = (process.env.REACT_APP_API_URL || "https://phinmaau-job-portal-atlas.onrender.com/api")
  .replace(/\/api\/?$/, "");

const getProfileImageUrl = (value) => {
  const source = String(value || "").trim();
  if (!source) return "/images/profile.png";
  if (/^(https?:|data:|blob:)/i.test(source)) return source;
  return `${API_ORIGIN}${source.startsWith("/") ? "" : "/"}${source}`;
};

const Icon = ({ name, className = "h-5 w-5" }) => {
  const common = {
    className,
    fill: "none",
    stroke: "currentColor",
    viewBox: "0 0 24 24",
    strokeWidth: 2,
  };

  const icons = {
    arrowLeft: <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />,
    building: <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1" />,
    clock: <><circle cx="12" cy="12" r="9" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 2" /></>,
    starOutline: <path strokeLinecap="round" strokeLinejoin="round" d="M12 3.5l2.65 5.37 5.93.86-4.29 4.18 1.01 5.9L12 17.02 6.7 19.81l1.01-5.9-4.29-4.18 5.93-.86L12 3.5z" />,
  };

  return <svg {...common}>{icons[name] || null}</svg>;
};

const formatTimeAgo = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const days = Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000));
  if (days === 0) return "Today";
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months === 1 ? "" : "s"} ago`;
};

const outcomeLabel = (value) => ({
  still_in_process: "Still in process",
  offered: "Offered",
  not_offered: "Not offered",
  withdrew: "Withdrew",
}[String(value || "").toLowerCase()] || value || "Outcome not provided");

const Metric = ({ label, value }) => (
  <div className="rounded-xl border border-[#dfe7f0] bg-[#fbfcfe] px-4 py-3">
    <p className="text-sm text-black/50">{label}</p>
    <p className="mt-1 text-lg font-bold text-black">{value}</p>
  </div>
);

const AdminEmployerReviews = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await api.get(`/admin/users/${userId}`);
        if (!active) return;

        if (!response.data?.success) {
          setError("Unable to load employer reviews.");
          return;
        }

        const nextUser = response.data.user || null;
        const nextReviews = Array.isArray(nextUser?.employerProfile?.reviews)
          ? [...nextUser.employerProfile.reviews].sort(
              (a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0)
            )
          : [];

        setUser(nextUser);
        setReviews(nextReviews);
      } catch (err) {
        if (!active) return;
        setError(err.response?.data?.message || "Unable to load employer reviews.");
      } finally {
        if (active) setLoading(false);
      }
    };

    if (userId) load();
    return () => {
      active = false;
    };
  }, [userId]);

  const companyName = useMemo(
    () => user?.employerProfile?.companyName || user?.fullName || "Company",
    [user]
  );

  const summary = useMemo(() => {
    const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let points = 0;
    reviews.forEach((review) => {
      const rating = Number(review?.processRating ?? review?.rating);
      if (!Number.isFinite(rating) || rating < 1 || rating > 5) return;
      breakdown[Math.max(1, Math.min(5, Math.round(rating)))] += 1;
      points += rating;
    });
    const count = Object.values(breakdown).reduce((sum, value) => sum + value, 0);
    return { breakdown, count, rating: count ? points / count : 0 };
  }, [reviews]);

  const filteredReviews = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return reviews;
    return reviews.filter((review) =>
      [review?.reviewerName, review?.roleAppliedFor, review?.message, review?.review, review?.comment]
        .some((value) => String(value || "").toLowerCase().includes(query))
    );
  }, [reviews, search]);

  const numericPageSize = pageSize === "all" ? Math.max(filteredReviews.length, 1) : Number(pageSize);
  const totalPages = pageSize === "all" ? 1 : Math.max(1, Math.ceil(filteredReviews.length / numericPageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedReviews = pageSize === "all"
    ? filteredReviews
    : filteredReviews.slice((safePage - 1) * numericPageSize, safePage * numericPageSize);

  useEffect(() => setCurrentPage(1), [search, pageSize]);
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  return (
    <AdminLayout>
      <div className="min-h-screen px-1 py-8">
        <div className="mx-auto w-full max-w-7xl space-y-5">
          <button
            type="button"
            onClick={() => navigate(`/admin/users/${userId}`)}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2"
          >
            <Icon name="arrowLeft" className="h-4 w-4" />
            Back to Employer Profile
          </button>

          <section className="rounded-[18px] border border-[#d1d5db] bg-white p-5 shadow-[0_2px_6px_rgba(15,23,42,0.05)] sm:p-7">
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_340px_360px] lg:items-center">
              <div>
                <h1 className="text-xl font-bold text-black sm:text-[22px] xl:whitespace-nowrap">
                  All Applications Reviews at {companyName}
                </h1>
                <p className="mt-1 text-black/65">
                  {reviews.length} Total Application{reviews.length === 1 ? "" : "s"}
                </p>
              </div>

              {!loading && !error ? (
                <div className="w-full max-w-[340px] lg:justify-self-center lg:translate-x-10">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[115px_minmax(0,1fr)] sm:items-center">
                    <div className="text-center sm:border-r sm:border-[#dfe7f0] sm:pr-3">
                      <p className="text-4xl font-bold leading-none text-[#27364a]">{summary.rating.toFixed(1)}</p>
                      <div className="mt-1 flex justify-center gap-0.5" aria-label={`${summary.rating.toFixed(1)} out of 5 stars`}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span key={star} className={`text-lg ${star <= Math.round(summary.rating) ? "text-[#f2b313]" : "text-[#d9e0e8]"}`}>★</span>
                        ))}
                      </div>
                      <p className="mt-1 text-[12px] text-black/65">{summary.count} ratings in total</p>
                    </div>

                    <div className="space-y-1.5">
                      {[5, 4, 3, 2, 1].map((star) => {
                        const count = summary.breakdown[star];
                        const percent = summary.count ? Math.min(100, (count / summary.count) * 100) : 0;
                        return (
                          <div key={star} className="grid grid-cols-[14px_minmax(0,1fr)_24px] items-center gap-2">
                            <span className="text-xs font-medium text-black/70">{star}</span>
                            <div className="h-2 overflow-hidden rounded-full bg-[#e9edf2]">
                              <div className="h-full rounded-full bg-[#f2b313]" style={{ width: `${percent}%` }} />
                            </div>
                            <span className="text-right text-xs text-black/65">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : <div />}

              <div className="relative w-full lg:w-[320px] lg:justify-self-end">
                <svg className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-black/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="m21 21-4.35-4.35m1.35-5.65a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" />
                </svg>
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search reviews, name, or messages..."
                  className="h-12 w-full rounded-xl border border-[#d8e2ee] py-3 pl-12 pr-4 text-sm outline-none focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/15"
                />
              </div>
            </div>

            {loading ? null : error ? (
              <div className="mt-8 rounded-2xl border border-red-100 bg-red-50 px-6 py-5 text-sm text-red-700">
                {error}
              </div>
            ) : paginatedReviews.length === 0 ? (
              <div className="mt-8 rounded-2xl border border-dashed border-[#d8e2ee] bg-[#f8fbff] px-6 py-14 text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#2e66a6] shadow-sm ring-1 ring-[#d8e2ee]">
                  <Icon name="starOutline" className="h-5 w-5" />
                </span>
                <p className="mt-4 font-semibold text-black">{reviews.length ? "No reviews match your search." : "No reviews yet"}</p>
                {!reviews.length ? <p className="mt-1 text-sm text-black/50">Candidate feedback will appear here once submitted.</p> : null}
              </div>
            ) : (
              <div className="mt-8 space-y-5">
                {paginatedReviews.map((review, index) => (
                  <article
                    key={review?._id || index}
                    className="rounded-2xl border border-[#dfe7f0] bg-white px-5 py-5 shadow-[0_10px_28px_rgba(46,102,166,0.06)] sm:px-6 sm:py-6"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#e1e8f0] bg-[#f0f4f8]">
                          <img
                            src={getProfileImageUrl(review?.reviewerProfileImage)}
                            alt={review?.reviewerName || "Reviewer"}
                            className="h-full w-full object-cover"
                            onError={(event) => {
                              event.currentTarget.onerror = null;
                              event.currentTarget.src = "/images/profile.png";
                            }}
                          />
                        </div>
                        <div className="min-w-0">
                          <h2 className="text-[17px] font-bold text-black">{review?.reviewerName || "Anonymous User"}</h2>
                          <p className="mt-1 text-sm text-black/55">
                            {review?.roleAppliedFor || "Role not provided"}
                            {formatTimeAgo(review?.createdAt) ? ` · ${formatTimeAgo(review.createdAt)}` : ""}
                          </p>
                        </div>
                      </div>

                      <span className="rounded-full border border-[#dfe7f0] bg-transparent px-3 py-1 text-xs font-semibold text-black/60">
                        {outcomeLabel(review?.outcome)}
                      </span>
                    </div>

                    <p className="mt-5 whitespace-pre-line text-base leading-7 text-black/80">
                      {review?.message || review?.review || review?.comment || "No written feedback provided."}
                    </p>

                    <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <Metric label="First reply" value={review?.daysToFirstResponse == null ? "Not provided" : `${Number(review.daysToFirstResponse) || 0}d`} />
                      <Metric label="Total length" value={review?.totalProcessDays == null ? "Not provided" : `${Number(review.totalProcessDays) || 0}d`} />
                      <Metric label="Process" value={`${Number(review?.processRating ?? review?.rating) || 0}/5`} />
                      <Metric label="Apply again?" value={typeof review?.wouldApplyAgain === "boolean" ? (review.wouldApplyAgain ? "Yes" : "No") : "Not provided"} />
                    </div>
                  </article>
                ))}
                <Pagination
                  currentPage={safePage}
                  totalItems={filteredReviews.length}
                  pageSize={pageSize}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={setPageSize}
                />
              </div>
            )}
          </section>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminEmployerReviews;
