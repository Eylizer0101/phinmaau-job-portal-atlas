import React, { useMemo } from 'react';

const PAGE_SIZE_OPTIONS = [10, 50, 'all'];

const buildPaginationItems = (currentPage, totalPages) => {
  if (totalPages <= 3) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  let windowStart;
  let windowEnd;

  if (currentPage <= 2) {
    windowStart = 1;
    windowEnd = 3;
  } else if (currentPage >= totalPages - 1) {
    windowStart = totalPages - 2;
    windowEnd = totalPages;
  } else {
    windowStart = currentPage - 1;
    windowEnd = currentPage + 1;
  }

  const items = [];

  if (windowStart > 1) {
    items.push(1);
    if (windowStart > 2) items.push('ellipsis-left');
  }

  for (let page = windowStart; page <= windowEnd; page += 1) {
    items.push(page);
  }

  if (windowEnd < totalPages) {
    if (windowEnd < totalPages - 1) items.push('ellipsis-right');
    items.push(totalPages);
  }

  return items;
};

const Pagination = ({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
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

  if (totalItems <= 10) return null;

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
      className={`mt-8 flex min-h-[78px] flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between ${className}`}
      aria-label={ariaLabel}
    >
      <div className="whitespace-nowrap rounded-lg bg-[#2e66a6]/10 px-3 py-2 text-sm font-bold text-[#2e66a6]">
        Page {safePage} of {totalPages} · {totalItems} total
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <span className="whitespace-nowrap">Display per page</span>
          <select
            value={pageSize}
            onChange={handlePageSizeChange}
            className="h-11 rounded-xl border border-gray-200 bg-white px-3 outline-none focus:border-[#2e66a6] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2"
          >
            {PAGE_SIZE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option === 'all' ? 'All' : option}
              </option>
            ))}
          </select>
        </label>

        <nav
          className="inline-flex min-h-11 items-center overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
          aria-label={ariaLabel}
        >
          <button
            type="button"
            onClick={() => changePage(safePage - 1)}
            disabled={safePage === 1}
            className="inline-flex h-11 items-center gap-2 border-r border-gray-200 px-4 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2e66a6] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span aria-hidden="true">‹</span>
            Previous
          </button>

          <div className="flex h-11 items-center px-2">
            {paginationItems.map((item) =>
              typeof item === 'string' ? (
                <span
                  key={item}
                  className="inline-flex h-9 min-w-9 items-center justify-center px-2 text-sm font-semibold text-gray-400"
                  aria-hidden="true"
                >
                  …
                </span>
              ) : (
                <button
                  key={item}
                  type="button"
                  onClick={() => changePage(item)}
                  aria-current={safePage === item ? 'page' : undefined}
                  aria-label={`Go to page ${item}`}
                  className={`h-9 min-w-9 rounded-lg px-3 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-1 ${
                    safePage === item
                      ? 'bg-[#2e66a6] text-white shadow-sm'
                      : 'text-gray-700 hover:bg-gray-100'
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
            className="inline-flex h-11 items-center gap-2 border-l border-gray-200 px-4 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2e66a6] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
            <span aria-hidden="true">›</span>
          </button>
        </nav>
      </div>
    </div>
  );
};

export default Pagination;
