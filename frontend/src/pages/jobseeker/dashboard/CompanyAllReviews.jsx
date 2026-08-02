// src/pages/jobseeker/dashboard/CompanyAllReviews.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  Star,
  Building2,
  Clock3,
  Repeat2,
} from "lucide-react";
import api from "../../../services/api";

const PAGE_SIZE_OPTIONS = ["10", "50", "100", "All"];

const normalizeReviews = (reviews = []) =>
  (Array.isArray(reviews) ? reviews : []).map((review, index) => ({
    ...review,
    id: review?._id || review?.id || `review-${index}`,
    reviewerName: review?.reviewerName || "Anonymous User",
    roleAppliedFor: String(review?.roleAppliedFor || "").trim() || "Role not provided",
    rating: Number(review?.processRating ?? review?.rating) || 0,
    message: review?.message || "",
  }));

const getOutcomeLabel = (value) => {
  const normalized = String(value || "").trim().toLowerCase().replace(/[_-]+/g, " ");
  if (normalized === "got the job" || normalized === "hired") return "Got the job";
  if (normalized === "not selected" || normalized === "declined") return "Not selected";
  if (normalized === "withdrew") return "Withdrew";
  if (normalized === "still in process" || normalized === "still in progress") return "Still in progress";
  return value || "Outcome not provided";
};

const formatDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
};

const CompanyAllReviews = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState("10");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await api.get(`/companies/verified/${id}`);
        const companyData = response?.data?.company;

        if (!companyData) throw new Error("Company not found.");

        if (active) {
          setCompany(companyData);
          setReviews(normalizeReviews(companyData.reviews));
        }
      } catch (requestError) {
        if (active) {
          setError(requestError?.response?.data?.message || requestError?.message || "Unable to load reviews.");
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [id]);

  const filteredReviews = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return reviews;

    return reviews.filter((review) =>
      [
        review.reviewerName,
        review.roleAppliedFor,
        review.message,
        getOutcomeLabel(review.outcome),
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [reviews, search]);

  const numericPageSize = pageSize === "All" ? Math.max(filteredReviews.length, 1) : Number(pageSize);
  const totalPages = Math.max(1, Math.ceil(filteredReviews.length / numericPageSize));
  const safePage = Math.min(page, totalPages);
  const startIndex = pageSize === "All" ? 0 : (safePage - 1) * numericPageSize;
  const visibleReviews =
    pageSize === "All"
      ? filteredReviews
      : filteredReviews.slice(startIndex, startIndex + numericPageSize);

  useEffect(() => {
    setPage(1);
  }, [search, pageSize]);

  const pageNumbers = useMemo(() => {
    const first = Math.max(1, safePage - 2);
    const last = Math.min(totalPages, first + 4);
    const adjustedFirst = Math.max(1, last - 4);
    return Array.from({ length: last - adjustedFirst + 1 }, (_, index) => adjustedFirst + index);
  }, [safePage, totalPages]);

  if (loading) {
    return <div className="min-h-screen bg-[#f6f8fb] p-8 text-center text-gray-600">Loading reviews...</div>;
  }

  return (
    <div className="min-h-screen bg-[#f6f8fb] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1280px]">
        <button
          type="button"
          onClick={() => navigate(`/jobseeker/company-details/${id}`, { state: { activeTab: "reviews" } })}
          className="inline-flex items-center gap-2 rounded-xl border border-[#d8e2ee] bg-white px-4 py-2.5 text-sm font-semibold text-[#172033] hover:bg-[#f7faff]"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
          Back to Company Details
        </button>

        <section className="mt-5 rounded-[24px] border border-[#dfe7f0] bg-white p-5 shadow-[0_18px_45px_rgba(46,102,166,0.08)] sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[#172033] sm:text-3xl">
                All Reviews for {company?.companyName || "Company"}
              </h1>
              <p className="mt-1 text-sm text-black/60">{filteredReviews.length} review{filteredReviews.length === 1 ? "" : "s"}</p>
            </div>

            <div className="relative w-full lg:max-w-md">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" strokeWidth={1.8} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search reviewer, role, outcome, or review..."
                className="h-12 w-full rounded-xl border border-[#d8e2ee] bg-white pl-12 pr-4 text-sm outline-none focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/15"
              />
            </div>
          </div>

          <div className="mt-7 space-y-5">
            {visibleReviews.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#d8e2ee] px-6 py-14 text-center text-gray-500">
                No matching reviews found.
              </div>
            ) : (
              visibleReviews.map((review) => (
                <article key={review.id} className="rounded-2xl border border-[#dfe7f0] bg-white p-5 sm:p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#e1e8f0] bg-[#f0f4f8] text-[#60758a]">
                        <Building2 className="h-5 w-5" strokeWidth={1.8} />
                      </div>
                      <div>
                        <h2 className="font-bold text-[#172033]">{review.reviewerName}</h2>
                        <p className="mt-0.5 text-sm text-black/55">
                          {review.roleAppliedFor}
                          {review.createdAt ? <span> · {formatDate(review.createdAt)}</span> : null}
                        </p>
                      </div>
                    </div>

                    <span className="inline-flex w-fit rounded-full border border-[#bfd4ea] bg-[#eaf2fb] px-3 py-1 text-xs font-semibold text-[#2e66a6]">
                      {getOutcomeLabel(review.outcome)}
                    </span>
                  </div>

                  <p className="mt-5 whitespace-pre-line text-[15px] leading-7 text-black/75">{review.message || "No written review provided."}</p>

                  <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {[
                      [Clock3, "First reply", review.daysToFirstResponse == null ? "Not provided" : `${Number(review.daysToFirstResponse) || 0}d`],
                      [Clock3, "Total length", review.totalProcessDays == null ? "Not provided" : `${Number(review.totalProcessDays) || 0}d`],
                      [Star, "Process", `${Number(review.processRating ?? review.rating) || 0}/5`],
                      [Repeat2, "Apply again?", review.wouldApplyAgain == null ? "Not provided" : review.wouldApplyAgain ? "Yes" : "No"],
                    ].map(([Icon, label, value]) => (
                      <div key={label} className="rounded-xl border border-[#dfe7f0] bg-[#fbfcfe] px-4 py-3">
                        <div className="flex items-center gap-2 text-sm text-black/50">
                          <Icon className="h-5 w-5" strokeWidth={1.8} />
                          {label}
                        </div>
                        <p className="mt-1 font-bold text-[#172033]">{value}</p>
                      </div>
                    ))}
                  </div>
                </article>
              ))
            )}
          </div>

          <div className="mt-7 flex flex-col gap-4 border-t border-[#e5ebf2] pt-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-3 text-sm text-black/60">
              <span>Display per page</span>
              <select
                value={pageSize}
                onChange={(event) => setPageSize(event.target.value)}
                className="h-10 rounded-lg border border-[#d8e2ee] bg-white px-3 outline-none focus:border-[#2e66a6]"
              >
                {PAGE_SIZE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
              <span>
                Showing {filteredReviews.length === 0 ? 0 : startIndex + 1}-
                {pageSize === "All" ? filteredReviews.length : Math.min(startIndex + numericPageSize, filteredReviews.length)} of {filteredReviews.length}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <PaginationButton label="First Page" disabled={safePage === 1} onClick={() => setPage(1)} icon={<ChevronsLeft className="h-4 w-4" />} />
              <PaginationButton label="Previous" disabled={safePage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} icon={<ChevronLeft className="h-4 w-4" />} />
              {pageNumbers.map((number) => (
                <button
                  key={number}
                  type="button"
                  onClick={() => setPage(number)}
                  className={`h-10 min-w-10 rounded-lg border px-3 text-sm font-semibold ${
                    number === safePage
                      ? "border-[#2e66a6] bg-[#2e66a6] text-white"
                      : "border-[#d8e2ee] bg-white text-[#172033] hover:bg-[#f7faff]"
                  }`}
                >
                  {number}
                </button>
              ))}
              <PaginationButton label="Next" disabled={safePage === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))} icon={<ChevronRight className="h-4 w-4" />} iconRight />
              <PaginationButton label="Last Page" disabled={safePage === totalPages} onClick={() => setPage(totalPages)} icon={<ChevronsRight className="h-4 w-4" />} iconRight />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

const PaginationButton = ({ label, disabled, onClick, icon, iconRight = false }) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-[#d8e2ee] bg-white px-3 text-sm font-semibold text-[#172033] hover:bg-[#f7faff] disabled:cursor-not-allowed disabled:opacity-40"
  >
    {!iconRight ? icon : null}
    <span className="hidden sm:inline">{label}</span>
    {iconRight ? icon : null}
  </button>
);

export default CompanyAllReviews;
