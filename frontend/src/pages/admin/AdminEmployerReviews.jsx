import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AdminLayout from "../../layouts/AdminLayout";
import api from "../../services/api";
import Pagination from "../../components/shared/Pagination";

const cn = (...classes) => classes.filter(Boolean).join(" ");

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

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const getOutcomeLabel = (value) => {
  const labels = {
    received_offer: "Received offer",
    rejected: "Rejected",
    ghosted: "Ghosted",
    withdrew: "Withdrew",
    still_in_process: "Still in process",
  };
  return labels[String(value || "").trim()] || "Outcome not provided";
};

const getOutcomeBadgeClass = (value) => {
  const classes = {
    received_offer: "border-emerald-200 bg-emerald-50 text-emerald-700",
    rejected: "border-red-200 bg-red-50 text-red-700",
    ghosted: "border-amber-200 bg-amber-50 text-amber-700",
    withdrew: "border-gray-200 bg-gray-100 text-gray-700",
    still_in_process: "border-blue-200 bg-blue-50 text-blue-700",
  };
  return classes[String(value || "").trim()] || classes.still_in_process;
};

const ReviewStars = ({ rating }) => {
  const numericRating = Number(rating);
  const safeRating = Number.isFinite(numericRating)
    ? Math.min(5, Math.max(0, Math.round(numericRating)))
    : 0;

  return (
    <div
      className="flex items-center gap-1"
      aria-label={`${safeRating} out of 5 stars`}
      title={`${safeRating} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={cn(
            "text-xl leading-none",
            star <= safeRating ? "text-[#e5a900]" : "text-[#d7dee8]"
          )}
          aria-hidden="true"
        >
          ★
        </span>
      ))}
    </div>
  );
};

const AdminEmployerReviews = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
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

  const paginatedReviews = useMemo(() => {
    if (pageSize === "all") return reviews;
    const start = (currentPage - 1) * pageSize;
    return reviews.slice(start, start + pageSize);
  }, [currentPage, pageSize, reviews]);

  return (
    <AdminLayout>
      <div className="min-h-screen bg-[#f7f9fc] px-0 py-8">
        <div className="w-full space-y-5">
          <button
            type="button"
            onClick={() => navigate(`/admin/users/${userId}`)}
            className="inline-flex items-center gap-2 rounded-xl border border-[#d8e2ee] bg-white px-4 py-2.5 text-sm font-semibold text-black shadow-sm transition hover:border-[#2e66a6]/35 hover:bg-[#f7faff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2"
          >
            <Icon name="arrowLeft" className="h-4 w-4" />
            Back to Employer Profile
          </button>

          <section className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-sm sm:p-7">
            <div>
              <h1 className="text-3xl font-bold text-black">Application process at {companyName}</h1>
              <p className="mt-1 text-base text-black/60">
                {reviews.length} review{reviews.length === 1 ? "" : "s"}
              </p>
            </div>

            {loading ? (
              <div className="mt-8 rounded-2xl border border-dashed border-[#d8e2ee] bg-[#f8fbff] px-6 py-14 text-center text-sm text-black/50">
                Loading reviews...
              </div>
            ) : error ? (
              <div className="mt-8 rounded-2xl border border-red-100 bg-red-50 px-6 py-5 text-sm text-red-700">
                {error}
              </div>
            ) : reviews.length === 0 ? (
              <div className="mt-8 rounded-2xl border border-dashed border-[#d8e2ee] bg-[#f8fbff] px-6 py-14 text-center">
                <p className="font-semibold text-black">No reviews yet</p>
                <p className="mt-1 text-sm text-black/50">Candidate feedback will appear here once submitted.</p>
              </div>
            ) : (
              <div className="mt-8 space-y-5">
                {paginatedReviews.map((review, index) => (
                  <article
                    key={review?._id || index}
                    className="rounded-2xl border border-[#dfe7f0] bg-white px-5 py-5 shadow-[0_10px_28px_rgba(46,102,166,0.06)] sm:px-6 sm:py-6"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#e1e8f0] bg-[#f0f4f8]">
                          <Icon name="building" className="h-5 w-5 text-[#60758a]" />
                        </div>
                        <div className="min-w-0">
                          <h2 className="text-[17px] font-bold text-black">{review?.reviewerName || "Anonymous User"}</h2>
                          <p className="mt-0.5 text-sm text-black/55">
                            {review?.roleAppliedFor || "Role not provided"} · {formatDate(review?.createdAt)}
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-col items-end gap-3">
                        <span className={cn(
                          "inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-semibold",
                          getOutcomeBadgeClass(review?.outcome)
                        )}>
                          {getOutcomeLabel(review?.outcome)}
                        </span>

                        <ReviewStars rating={review?.processRating ?? review?.rating} />
                      </div>
                    </div>

                    <p className="mt-5 whitespace-pre-line text-base leading-7 text-black/80">
                      {review?.message || review?.review || review?.comment || "No written feedback provided."}
                    </p>

                    <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-xl border border-[#dfe7f0] bg-[#fbfcfe] px-4 py-3">
                        <div className="flex items-center gap-2 text-black/50">
                          <Icon name="clock" className="h-5 w-5" />
                          <span className="text-sm">First reply</span>
                        </div>
                        <p className="mt-1 text-lg font-bold text-black">
                          {review?.daysToFirstResponse == null ? "Not provided" : `${Number(review.daysToFirstResponse) || 0}d`}
                        </p>
                      </div>

                      <div className="rounded-xl border border-[#dfe7f0] bg-[#fbfcfe] px-4 py-3">
                        <div className="flex items-center gap-2 text-black/50">
                          <Icon name="clock" className="h-5 w-5" />
                          <span className="text-sm">Total length</span>
                        </div>
                        <p className="mt-1 text-lg font-bold text-black">
                          {review?.totalProcessDays == null ? "Not provided" : `${Number(review.totalProcessDays) || 0}d`}
                        </p>
                      </div>

                      <div className="rounded-xl border border-[#dfe7f0] bg-[#fbfcfe] px-4 py-3">
                        <div className="flex items-center gap-2 text-black/50">
                          <Icon name="starOutline" className="h-5 w-5" />
                          <span className="text-sm">Process</span>
                        </div>
                        <p className="mt-1 text-lg font-bold text-black">
                          {review?.processRating == null ? "Not provided" : `${Number(review.processRating) || 0}/5`}
                        </p>
                      </div>

                      <div className="rounded-xl border border-[#dfe7f0] bg-[#fbfcfe] px-4 py-3">
                        <div className="flex items-center gap-2 text-black/50">
                          <span className="text-lg leading-none">♧</span>
                          <span className="text-sm">Apply again?</span>
                        </div>
                        <p className="mt-1 text-lg font-bold text-black">
                          {review?.wouldApplyAgain == null ? "Not provided" : review.wouldApplyAgain ? "Yes" : "No"}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
                <Pagination
                  currentPage={currentPage}
                  totalItems={reviews.length}
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
