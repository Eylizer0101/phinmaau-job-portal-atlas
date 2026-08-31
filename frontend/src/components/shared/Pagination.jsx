import React, { useMemo } from 'react';

const PAGE_SIZE_OPTIONS = [10, 50, 100, 'all'];

const buildPaginationItems = (currentPage, totalPages) => {
  if (totalPages <= 6) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  // Keep three moving page numbers on the left and the final three pages on
  // the right. The ellipsis is always a plain, non-clickable separator.
  const lastGroupStart = totalPages - 2;
  const maximumWindowStart = Math.max(1, lastGroupStart - 3);
  const windowStart = Math.min(
    Math.max(currentPage - 1, 1),
    maximumWindowStart
  );
  const movingPages = [windowStart, windowStart + 1, windowStart + 2];
  const lastPages = [lastGroupStart, lastGroupStart + 1, totalPages];

  return [...movingPages, 'ellipsis', ...lastPages];
};

const Pagination = ({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  showPageSize = true,
  ariaLabel = 'Pagination controls',
  className = '',
}) => {
  const isAll = pageSize === 'all';
  const numericPageSize = isAll ? Math.max(totalItems, 1) : Number(pageSize);
  const totalPages = isAll ? 1 : Math.max(1, Math.ceil(totalItems / numericPageSize));
  const safePage = Math.min(Math.max(Number(currentPage) || 1, 1), totalPages);
  const paginationItems = useMemo(
    () => buildPaginationItems(safePage, totalPages),
    [safePage, totalPages]
  );
  const rangeStart = totalItems === 0 ? 0 : isAll ? 1 : ((safePage - 1) * numericPageSize) + 1;
  const rangeEnd = totalItems === 0
    ? 0
    : isAll
      ? totalItems
      : Math.min(safePage * numericPageSize, totalItems);

  if (totalPages <= 1) return null;

  const changePage = (nextPage) => {
    const safeNextPage = Math.min(Math.max(nextPage, 1), totalPages);
    if (safeNextPage !== safePage) onPageChange(safeNextPage);
  };

  const handlePageSizeChange = (event) => {
    const nextPageSize = event.target.value === 'all'
      ? 'all'
      : Number(event.target.value);

    onPageSizeChange(nextPageSize);
    onPageChange(1);
  };

  return (
    <div
      className={`mt-0 flex min-h-[58px] flex-col gap-3 border-t border-gray-200 bg-white px-4 py-3 lg:flex-row lg:items-center lg:justify-between ${className}`}
      aria-label={ariaLabel}
    >
      <div className="whitespace-nowrap text-xs font-medium text-slate-500">
        Showing {rangeStart} to {rangeEnd} of {totalItems} results
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        {showPageSize ? <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <span className="whitespace-nowrap text-xs text-slate-500">Display Per Page:</span>
          <select
            value={pageSize}
            onChange={handlePageSizeChange}
            className="h-9 min-w-[74px] rounded-lg border border-gray-200 bg-white px-3 text-xs outline-none focus:border-[#173b78] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#173b78]/20"
          >
            {PAGE_SIZE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option === 'all' ? 'All' : option}
              </option>
            ))}
          </select>
        </label> : null}

        <nav
          className="inline-flex min-h-9 items-center bg-white"
          aria-label={ariaLabel}
        >
          <button
            type="button"
            onClick={() => changePage(safePage - 1)}
            disabled={safePage === 1}
            className="inline-flex h-9 items-center gap-1 px-2 text-xs font-semibold text-slate-800 transition hover:text-[#173b78] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#173b78]/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
           <svg
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
</svg>
            Previous
          </button>

          <div className="flex h-9 items-center gap-1 px-1">
            {paginationItems.map((item) =>
              typeof item === 'string' ? (
                <span
                  key={item}
                  className="inline-flex h-8 min-w-8 select-none items-center justify-center px-1 text-xs font-bold text-slate-500"
                  aria-hidden="true"
                >
                  ...
                </span>
              ) : (
                <button
                  key={item}
                  type="button"
                  onClick={() => changePage(item)}
                  aria-current={safePage === item ? 'page' : undefined}
                  aria-label={`Go to page ${item}`}
                  className={`h-8 min-w-8 rounded-lg px-2 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#173b78]/30 focus-visible:ring-offset-1 ${
                    safePage === item
                      ? 'bg-[#111b35] text-white shadow-sm'
                      : 'text-slate-800 hover:bg-slate-100'
                  }`}
                >
                  {item}
                </button>
              )
            )}
          </div>

          <button
            type="button"
            onClick={() => changePage(safePage + 1)}
            disabled={safePage === totalPages}
            className="inline-flex h-9 items-center gap-1 px-2 text-xs font-semibold text-slate-800 transition hover:text-[#173b78] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#173b78]/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
           <svg
               className="w-[18px] h-[18px] shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                          </svg>
          </button>
        </nav>
      </div>
    </div>
  );
};

export default Pagination;
