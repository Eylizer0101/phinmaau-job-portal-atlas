import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import EmployerLayout from '../../../layouts/EmployerLayout';
import Pagination from '../../../components/shared/Pagination';
import api from '../../../services/api';

const formatTimeAgo = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const days = Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000));
  if (days === 0) return 'Today';
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months === 1 ? '' : 's'} ago`;
};

const outcomeLabel = (value) => ({ still_in_process: 'Still in process', offered: 'Offered', not_offered: 'Not offered', withdrew: 'Withdrew' }[String(value || '').toLowerCase()] || value || 'Outcome not provided');

const Metric = ({ label, value }) => <div className="rounded-xl border border-[#dfe7f0] bg-[#fbfcfe] px-4 py-3"><p className="text-sm text-black/50">{label}</p><p className="mt-1 text-lg font-bold text-black">{value}</p></div>;

const resolveReviewerImage = (value) => {
  const image = String(value || '').trim();
  if (!image || /^https?:\/\//i.test(image)) return image;
  const apiOrigin = String(api?.defaults?.baseURL || process.env.REACT_APP_API_URL || 'https://phinmaau-job-portal-atlas.onrender.com/api').replace(/\/api\/?$/, '');
  return `${apiOrigin}/${image.replace(/^\/+/, '')}`;
};

const ReviewerAvatar = ({ src, name }) => {
  const fallbackProfileImage = '/images/profile.png';
  const [imageSrc, setImageSrc] = useState(src || fallbackProfileImage);

  useEffect(() => {
    setImageSrc(src || fallbackProfileImage);
  }, [src]);

  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#dfe7f0] bg-[#eef5fc]">
      <img
        src={imageSrc}
        alt={`${name || 'Reviewer'} profile`}
        className="h-full w-full object-cover"
        onError={() => {
          if (imageSrc !== fallbackProfileImage) {
            setImageSrc(fallbackProfileImage);
          }
        }}
      />
    </div>
  );
};

const EmployerAllReviews = () => {
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState('Company');
  const [reviews, setReviews] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    api.get('/auth/me').then((response) => {
      if (!mounted) return;
      const profile = response?.data?.user?.employerProfile || {};
      setCompanyName(profile.companyName || 'Company');
      const fallbackReviews = Array.isArray(profile.reviews) ? profile.reviews : [];
      if (response?.data?.user?._id) {
        return api.get(`/companies/verified/${response.data.user._id}`)
          .then((companyResponse) => {
            if (!mounted) return;
            const companyReviews = companyResponse?.data?.company?.reviews;
            setReviews(Array.isArray(companyReviews) ? companyReviews : fallbackReviews);
          })
          .catch(() => { if (mounted) setReviews(fallbackReviews); });
      }
      setReviews(fallbackReviews);
    }).catch((requestError) => {
      if (mounted) setError(requestError?.response?.data?.message || 'Unable to load application reviews.');
    }).finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

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
    return reviews.filter((review) => [review?.reviewerName, review?.message].some((value) => String(value || '').toLowerCase().includes(query)));
  }, [reviews, search]);
  const numericPageSize = pageSize === 'all' ? Math.max(filteredReviews.length, 1) : Number(pageSize);
  const totalPages = pageSize === 'all' ? 1 : Math.max(1, Math.ceil(filteredReviews.length / numericPageSize));
  const safePage = Math.min(page, totalPages);
  const visibleReviews = pageSize === 'all' ? filteredReviews : filteredReviews.slice((safePage - 1) * numericPageSize, safePage * numericPageSize);
  useEffect(() => { setPage(1); }, [search, pageSize]);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  return (
    <EmployerLayout>
      <main className="min-h-screen px-1 py-8">
        <div className="mx-auto w-full max-w-7xl">
          <button type="button" onClick={() => navigate('/employer/company-profile', { state: { activeTab: 'reviews' } })} className="mb-5 inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700
           shadow-sm hover:bg-gray-50"><svg
  className="w-[18px] h-[18px] shrink-0"
  fill="none"
  stroke="currentColor"
  viewBox="0 0 24 24"
  aria-hidden="true"
>
  <path
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="2"
    d="M15 19l-7-7 7-7"
  />
</svg>Back</button>
          <section className="rounded-[18px] border border-[#d1d5db] bg-white p-5 shadow-[0_2px_6px_rgba(15,23,42,0.05)] sm:p-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div><h1 className="text-xl font-bold text-black sm:text-[22px] xl:whitespace-nowrap">All Applications Reviews at {companyName}</h1><p className="mt-1 text-black/65">{reviews.length} Total Application{reviews.length === 1 ? '' : 's'}</p></div>
              <div className="relative w-full lg:max-w-md"><svg className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-black/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="m21 21-4.35-4.35m1.35-5.65a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" /></svg><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search reviews, name, or messages..." className="h-12 w-full rounded-xl border border-[#d8e2ee] py-3 pl-12 pr-4 text-sm outline-none focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/15" /></div>
            </div>

            {loading ? <p className="py-16 text-center text-black/60">Loading reviews...</p> : error ? <p className="py-16 text-center text-red-600">{error}</p> : <>
              <div className="mt-6 w-full max-w-[340px]">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[115px_minmax(0,1fr)] sm:items-center">
                  <div className="text-center sm:border-r sm:border-[#dfe7f0] sm:pr-3"><p className="text-4xl font-bold leading-none text-[#27364a]">{summary.rating.toFixed(1)}</p><div className="mt-1 flex justify-center gap-0.5">{[1, 2, 3, 4, 5].map((star) => <span key={star} className={`text-lg ${star <= Math.round(summary.rating) ? 'text-[#f2b313]' : 'text-[#d9e0e8]'}`}>★</span>)}</div><p className="mt-1 text-[12px] text-black/65">{summary.count} ratings in total</p></div>
                  <div className="space-y-1.5">{[5, 4, 3, 2, 1].map((star) => { const count = summary.breakdown[star]; const percent = summary.count ? Math.min(100, (count / summary.count) * 100) : 0; return <div key={star} className="grid grid-cols-[14px_minmax(0,1fr)_24px] items-center gap-2"><span className="text-xs font-medium text-black/70">{star}</span><div className="h-2 overflow-hidden rounded-full bg-[#e9edf2]"><div className="h-full rounded-full bg-[#f2b313]" style={{ width: `${percent}%` }} /></div><span className="text-right text-xs text-black/65">{count}</span></div>; })}</div>
                </div>
              </div>
              <div className="mt-7 space-y-5">{visibleReviews.length === 0 ? <div className="rounded-2xl border border-dashed border-[#d8e2ee] px-6 py-14 text-center text-black/55">{reviews.length ? 'No reviews match your search.' : 'No application reviews yet.'}</div> : visibleReviews.map((review, index) => <article key={review._id || `${safePage}-${index}`} className="rounded-2xl border border-[#dfe7f0] bg-white px-5 py-5 shadow-[0_10px_28px_rgba(46,102,166,0.06)] sm:px-6 sm:py-6"><div className="flex flex-wrap items-start justify-between gap-3"><div className="flex min-w-0 items-start gap-3"><ReviewerAvatar src={resolveReviewerImage(review.reviewerProfileImage || review.profileImage)} name={review.reviewerName || 'Anonymous User'} /><div><h2 className="text-[17px] font-bold text-black">{review.reviewerName || 'Anonymous User'}</h2><p className="mt-1 text-sm text-black/55">{review.roleAppliedFor || 'Role not provided'}{formatTimeAgo(review.createdAt) ? ` · ${formatTimeAgo(review.createdAt)}` : ''}</p></div></div><span className="rounded-full border border-[#dfe7f0] bg-[#fbfcfe] px-3 py-1 text-xs font-semibold text-[#2e66a6]">{outcomeLabel(review.outcome)}</span></div><p className="mt-5 whitespace-pre-line text-[16px] leading-7 text-black/80">{review.message || 'No written review provided.'}</p><div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="First reply" value={review.daysToFirstResponse == null ? 'Not provided' : `${Number(review.daysToFirstResponse) || 0}d`} /><Metric label="Total length" value={review.totalProcessDays == null ? 'Not provided' : `${Number(review.totalProcessDays) || 0}d`} /><Metric label="Process" value={`${Number(review.processRating ?? review.rating) || 0}/5`} /><Metric label="Apply again?" value={typeof review.wouldApplyAgain === 'boolean' ? (review.wouldApplyAgain ? 'Yes' : 'No') : 'Not provided'} /></div></article>)}</div>
              <Pagination currentPage={safePage} totalItems={filteredReviews.length} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} ariaLabel="Employer application reviews pagination" />
            </>}
          </section>
        </div>
      </main>
    </EmployerLayout>
  );
};

export default EmployerAllReviews;
