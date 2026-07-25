// src/pages/jobseeker/dashboard/JobseekerCompanies.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../services/api";


const normalizeCompanyLocationKey = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\bcity of\b/g, "")
    .replace(/\bcity\b/g, "")
    .replace(/[^a-z0-9ñ\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const buildCompanyLocationGroups = (companies, formatLocation, fallbackLocations = []) => {
  const counts = new Map();

  (companies || []).forEach((company) => {
    const label = formatLocation(company?.location);
    const key = normalizeCompanyLocationKey(label);

    if (!key || label === "Location not specified") return;

    const current = counts.get(key);
    if (current) {
      current.count += 1;
    } else {
      counts.set(key, { label, count: 1 });
    }
  });

  (fallbackLocations || []).forEach((location) => {
    const label = formatLocation(location);
    const key = normalizeCompanyLocationKey(label);

    if (!key || label === "Location not specified" || counts.has(key)) return;
    counts.set(key, { label, count: 0 });
  });

  const ranked = Array.from(counts.values()).sort(
    (a, b) => b.count - a.count || a.label.localeCompare(b.label)
  );

  const repeatedLocations = ranked.filter((item) => item.count > 1);
  const topSource = repeatedLocations.length > 0 ? repeatedLocations : ranked;

  const topLocations = topSource.slice(0, 5).map((item) => item.label);
  const topKeys = new Set(topLocations.map(normalizeCompanyLocationKey));

  const allLocations = ranked
    .map((item) => item.label)
    .filter((label) => !topKeys.has(normalizeCompanyLocationKey(label)))
    .sort((a, b) => a.localeCompare(b));

  return { topLocations, allLocations };
};

const JobseekerCompanies = () => {
  const navigate = useNavigate();

  const [companies, setCompanies] = useState([]);
  const [allCompaniesForFilters, setAllCompaniesForFilters] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const [jobCountByEmployerId, setJobCountByEmployerId] = useState({});

  const [search, setSearch] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState("");

  const [locations, setLocations] = useState([]);
  const [industries, setIndustries] = useState([]);

  const [openDropdown, setOpenDropdown] = useState(null);
  const [locationSearch, setLocationSearch] = useState("");
  const [expandedCardId, setExpandedCardId] = useState(null);
  const filterBoxRef = useRef(null);

  const debounceRef = useRef(null);

  const COLORS = useMemo(
    () => ({
      primary: "#2e66a6",
      primaryHover: "#25578f",
      primaryActive: "#1f4b7c",

      pageBg: "#FFFFFF",
      card: "#FFFFFF",
      border: "#d8e2ee",
      mutedBox: "#f7faff",

      text: "#000000",
      subtext: "#000000",
      structure: "#2e66a6",
    }),
    []
  );

  const apiOrigin = useMemo(() => {
    const base = api?.defaults?.baseURL || process.env.REACT_APP_API_URL || "https://phinmaau-job-portal-atlas.onrender.com/api";
    return String(base).replace(/\/api\/?$/, "");
  }, []);

  const resolveLogoUrl = (logo) => {
    if (!logo) return "";
    const v = String(logo).trim();
    if (!v) return "";
    if (/^https?:\/\//i.test(v)) return v;
    if (v.startsWith("/uploads")) return `${apiOrigin}${v}`;
    return `${apiOrigin}/${v.replace(/^\/+/, "")}`;
  };

  const formatCompanyLocation = (loc) => {
    const v = String(loc || "").trim();
    if (!v) return "Location not specified";

    if (v.includes(" - ")) {
      const parts = v.split(" - ");
      const last = parts[parts.length - 1]?.trim();
      return last || v;
    }

    if (v.includes(",")) {
      const first = v.split(",")[0]?.trim();
      return first || v;
    }

    return v;
  };

  const shortenIndustry = (value, max = 24) => {
    const v = String(value || "").trim();
    if (!v) return "Industry";
    if (v.length <= max) return v;
    return `${v.slice(0, max).trim()}...`;
  };

  const normalizeJobsResponse = (response) => {
    let jobsData = [];
    if (response?.data?.success && response.data?.jobs) jobsData = response.data.jobs;
    else if (response?.data?.data) jobsData = response.data.data;
    else if (Array.isArray(response?.data)) jobsData = response.data;
    else if (response?.data?.success && response.data?.data) jobsData = response.data.data;
    return jobsData || [];
  };

  const getAccurateRatingSummary = (company) => {
    const breakdown = company?.ratingBreakdown || {};

    const counts = {
      5: Number(breakdown?.[5] || 0),
      4: Number(breakdown?.[4] || 0),
      3: Number(breakdown?.[3] || 0),
      2: Number(breakdown?.[2] || 0),
      1: Number(breakdown?.[1] || 0),
    };

    const totalReviews =
      counts[5] + counts[4] + counts[3] + counts[2] + counts[1];

    if (totalReviews > 0) {
      const totalPoints =
        counts[5] * 5 +
        counts[4] * 4 +
        counts[3] * 3 +
        counts[2] * 2 +
        counts[1] * 1;

      return {
        rating: totalPoints / totalReviews,
        reviewCount: totalReviews,
      };
    }

    return {
      rating: Number(company?.rating) || 0,
      reviewCount: Number(company?.reviewCount) || 0,
    };
  };

  const formatRatingValue = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return "0.0";
    return numeric.toFixed(1);
  };

  const formatReviewText = (rating, reviewCount) => {
    const safeRating = formatRatingValue(rating);
    const safeReviewCount = Number(reviewCount) || 0;
    return `${safeRating} • ${safeReviewCount} review${safeReviewCount === 1 ? "" : "s"}`;
  };

  const StarRating = ({ rating = 0, size = "w-[15px] h-[15px]" }) => {
    const normalized = Math.max(0, Math.min(5, Number(rating) || 0));
    const fullStars = Math.floor(normalized);

    return (
      <div className="flex items-center gap-[6px]">
        {[0, 1, 2, 3, 4].map((idx) => {
          const filled = idx < fullStars;
          return (
            <svg
              key={idx}
              className={`${size} text-[#2e66a6]`}
              viewBox="0 0 20 20"
              fill={filled ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="1.6"
              aria-hidden="true"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.539 1.118l-2.8-2.034a1 1 0 00-1.176 0l-2.8 2.034c-.783.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81H7.03a1 1 0 00.95-.69l1.07-3.292z" />
            </svg>
          );
        })}
      </div>
    );
  };

  const getBreakdownRows = (company) => {
    const breakdown = company?.ratingBreakdown || {};
    const total = Number(company?.reviewCount) || 0;

    return [5, 4, 3, 2, 1].map((star) => {
      const count = Number(breakdown?.[star] || 0);
      const percent = total > 0 ? (count / total) * 100 : 0;

      return {
        star,
        count,
        percent,
      };
    });
  };

  const fetchCompanies = async (opts = {}) => {
    try {
      setErrorMsg("");
      setLoadingInitial(true);

      const params = {};
      const s = String(opts.search ?? search).trim();
      const loc = String(opts.location ?? selectedLocation).trim();
      const ind = String(opts.industry ?? selectedIndustry).trim();

      if (s) params.search = s;
      if (loc) params.location = loc;
      if (ind) params.industry = ind;

      const res = await api.get("/companies/verified", { params });
      const list = res?.data?.companies || [];
      setCompanies(list);

      if (!s && !loc && !ind) {
        setAllCompaniesForFilters(list);
      }

      const f = res?.data?.filters || {};
      setLocations(Array.isArray(f.locations) ? f.locations : []);
      setIndustries(Array.isArray(f.industries) ? f.industries : []);

      try {
        const jobsRes = await api.get("/jobs");
        const jobs = normalizeJobsResponse(jobsRes);

        const countMap = {};
        (jobs || []).forEach((job) => {
          const employerId =
            typeof job?.employer === "string"
              ? job.employer
              : job?.employer?._id || job?.employer?.id;

          if (!employerId) return;
          countMap[employerId] = (countMap[employerId] || 0) + 1;
        });

        setJobCountByEmployerId(countMap);
      } catch (e) {
        console.error("Error fetching jobs for company counts:", e);
        setJobCountByEmployerId({});
      }
    } catch (e) {
      console.error("Error fetching companies:", e);
      setCompanies([]);
      setJobCountByEmployerId({});
      setLocations([]);
      setIndustries([]);
      setErrorMsg("We couldn’t load companies right now. Please try again.");
    } finally {
      setLoadingInitial(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      fetchCompanies({
        search,
        location: selectedLocation,
        industry: selectedIndustry,
      });
    }, 350);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, selectedLocation, selectedIndustry]);

  useEffect(() => {
    if (openDropdown !== "location") {
      setLocationSearch("");
    }
  }, [openDropdown]);

  useEffect(() => {
    const onClick = (e) => {
      if (!openDropdown) return;
      if (!filterBoxRef.current) return;
      if (!filterBoxRef.current.contains(e.target)) {
        setOpenDropdown(null);
      }
    };

    const onKey = (e) => {
      if (e.key === "Escape") setOpenDropdown(null);
    };

    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [openDropdown]);

  const { topLocations, allLocations } = useMemo(
    () =>
      buildCompanyLocationGroups(
        allCompaniesForFilters.length ? allCompaniesForFilters : companies,
        formatCompanyLocation,
        locations
      ),
    [allCompaniesForFilters, companies, locations]
  );

  const searchableLocations = useMemo(
    () => Array.from(new Set([...topLocations, ...allLocations])),
    [topLocations, allLocations]
  );

  const filteredLocationResults = useMemo(() => {
    const query = locationSearch.trim().toLowerCase();
    if (!query) return searchableLocations;

    return searchableLocations.filter((location) =>
      location.toLowerCase().includes(query)
    );
  }, [locationSearch, searchableLocations]);

  const hasAnyFilter = Boolean(search.trim() || selectedLocation || selectedIndustry);

  const clearAll = () => {
    setSearch("");
    setSelectedLocation("");
    setSelectedIndustry("");
    setOpenDropdown(null);
    setExpandedCardId(null);
  };

  const searchBox =
    "w-full lg:w-[430px] h-[46px] bg-white/95 border border-white/30 rounded-xl px-4 " +
    "flex items-center gap-3 flex-shrink-0 shadow-sm";

  const pillBtn =
    "h-[46px] rounded-xl px-5 bg-white/95 border border-white/30 text-sm font-semibold text-black " +
    "flex items-center gap-2 hover:bg-white transition flex-shrink-0 shadow-sm";

  const filterRowClass = "flex flex-wrap items-center gap-3";

  const handleViewCompanyDetails = (company) => {
    const companyId = company?._id || company?.id;
    if (!companyId) return;
    navigate(`/jobseeker/company-details/${companyId}`);
  };

  const handleToggleBreakdown = (companyId) => {
    setExpandedCardId((prev) => (prev === companyId ? null : companyId));
  };

  const LocationDropdown = () => {
    const isOpen = openDropdown === "location";
    const isSearching = Boolean(locationSearch.trim());
    const displayItems = isSearching ? filteredLocationResults : topLocations;

    return (
      <div className="relative inline-block">
        <button
          type="button"
          className={pillBtn}
          onClick={() => setOpenDropdown(isOpen ? null : "location")}
          aria-expanded={isOpen}
          aria-controls="location-menu"
        >
          <span className="max-w-[140px] truncate whitespace-nowrap">
            {selectedLocation || "Location"}
          </span>

          <svg
            className={`ml-1 h-4 w-4 text-black/70 transition ${isOpen ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <div
            id="location-menu"
            className="absolute left-0 top-full z-[80] mt-2 w-[300px] max-w-[92vw] rounded-xl border border-[#d8e2ee] bg-white p-4 shadow-xl"
            role="dialog"
            aria-label="Location filter"
          >
            <input
              value={locationSearch}
              onChange={(event) => setLocationSearch(event.target.value)}
              placeholder="Search location"
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800 outline-none focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/20"
              autoFocus
            />

            <div className="mt-4 max-h-[280px] overflow-auto pr-1">
              {selectedLocation && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedLocation("");
                    setOpenDropdown(null);
                  }}
                  className="mb-2 w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-[#2e66a6] hover:bg-[#f7faff]"
                >
                  Clear location
                </button>
              )}

              <div className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">
                {isSearching ? "Search Results" : "Top Locations"}
              </div>

              {displayItems.length === 0 ? (
                <div className="py-4 text-sm text-gray-500">
                  {isSearching ? "No location found" : "No top locations available"}
                </div>
              ) : (
                displayItems.map((location) => (
                  <label
                    key={location}
                    className="flex cursor-pointer items-center gap-3 py-2 text-sm text-gray-800"
                  >
                    <input
                      type="checkbox"
                      checked={
                        normalizeCompanyLocationKey(selectedLocation) ===
                        normalizeCompanyLocationKey(location)
                      }
                      onChange={() => {
                        setSelectedLocation(
                          normalizeCompanyLocationKey(selectedLocation) ===
                            normalizeCompanyLocationKey(location)
                            ? ""
                            : location
                        );
                        setOpenDropdown(null);
                      }}
                      className="h-4 w-4"
                    />
                    <span className="select-none">{location}</span>
                  </label>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const DropdownPill = ({
    id,
    label,
    items,
    selectedValue,
    onSelect,
    formatter,
    menuWidth = "w-[280px]",
    showClearOption = true,
  }) => {
    const isOpen = openDropdown === id;

    return (
      <div className="relative inline-block">
        <button
          type="button"
          className={pillBtn}
          onClick={() => setOpenDropdown(isOpen ? null : id)}
          aria-expanded={isOpen}
          aria-controls={`${id}-menu`}
        >
          <span className="whitespace-nowrap truncate max-w-[140px]">
            {selectedValue ? (formatter ? formatter(selectedValue) : selectedValue) : label}
          </span>

          <svg
            className={`w-4 h-4 text-black/70 ml-1 transition ${isOpen ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <div
            id={`${id}-menu`}
            className={`absolute left-0 top-full z-[80] mt-2 ${menuWidth} max-w-[92vw] bg-white border border-[#d8e2ee] rounded-xl shadow-xl p-3`}
            role="dialog"
            aria-label={`${label} filter`}
          >
            <div className="max-h-[260px] overflow-auto pr-1">
              {showClearOption && (
                <button
                  type="button"
                  onClick={() => {
                    onSelect("");
                    setOpenDropdown(null);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm text-black hover:bg-[#f7faff]"
                >
                  All
                </button>
              )}

              {items.length === 0 ? (
                <div className="px-3 py-2 text-sm text-black/60">No results</div>
              ) : (
                items.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      onSelect(item);
                      setOpenDropdown(null);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-[#f7faff] ${
                      selectedValue === item ? "text-[#2e66a6] font-semibold bg-[#f7faff]" : "text-black"
                    }`}
                    title={item}
                  >
                    {formatter ? formatter(item) : item}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="pb-12">
        <div className="max-w-screen-2xl mx-auto px-6 lg:px-10 2xl:px-16 mt-10">
          <div className="mb-8" ref={filterBoxRef}>
            <div
              className="
                relative rounded-[26px] border border-gray-200 p-6 md:p-8
                shadow-[0_4px_20px_rgba(0,0,0,0.08)]
                overflow-visible text-white bg-gradient-to-br
                from-[#061e4e] via-[#244e7f] to-[#52b2db]
                transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)]
              "
            >
              <div className="pointer-events-none absolute inset-0 z-0">
                <div
                  className="
                    absolute w-[160px] md:w-[200px] h-[160px] md:h-[200px]
                    rounded-full blur-[40px] md:blur-[50px]
                    top-[40%] right-[15%] md:right-[20%] opacity-60
                  "
                  style={{
                    background:
                      "radial-gradient(circle, rgba(46,102,166,0.25) 0%, rgba(46,102,166,0.12) 45%, transparent 75%)",
                  }}
                />
              </div>

              <img
                src="/images/findjob.png"
                alt="Companies illustration"
                className="
                  pointer-events-none absolute right-[20px] md:right-[40px]
                  top-1/3 -translate-y-1/2 w-34 h-34 md:w-49 md:h-48
                  object-contain opacity-50 mix-blend-soft-light saturate-120 z-0
                "
                style={{
                  WebkitMaskImage:
                    "radial-gradient(circle at 35% 50%, rgba(0,0,0,1) 0%, rgba(0,0,0,0.5) 55%, rgba(0,0,0,0) 80%)",
                  maskImage:
                    "radial-gradient(circle at 35% 50%, rgba(0,0,0,1) 0%, rgba(0,0,0,0.5) 55%, rgba(0,0,0,0) 80%)",
                }}
              />

              <div className="relative z-10">
                <div className="mb-6">
                  <h1 className="text-[28px] md:text-[30px] font-semibold leading-tight text-white">
                    Companies
                  </h1>
                  <p className="mt-2 text-[16px] text-blue-100/90">
                    Browse verified companies and discover new job offers.
                  </p>
                </div>

                <div className={filterRowClass}>
                  <div className={searchBox}>
                    <svg
                      className="w-5 h-5 text-black/60"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>

                    <input
                      type="text"
                      placeholder="Search companies, location, or industry..."
                      className="w-full h-full outline-none text-sm text-black bg-transparent"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      aria-label="Search companies"
                    />
                  </div>

                  <LocationDropdown />

                  <DropdownPill
                    id="industry"
                    label="Industry"
                    items={industries}
                    selectedValue={selectedIndustry}
                    onSelect={setSelectedIndustry}
                    menuWidth="w-[240px]"
                    showClearOption={false}
                  />

                  {hasAnyFilter && (
                    <button type="button" className={pillBtn} onClick={clearAll}>
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Clear all
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10">
            {loadingInitial ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {[...Array(8)].map((_, index) => (
                  <div
                    key={index}
                    className="rounded-[24px] p-6 animate-pulse bg-white h-[340px]"
                    style={{ border: `1px solid ${COLORS.border}` }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-14 w-14 rounded-[18px]" style={{ backgroundColor: COLORS.mutedBox }} />
                      <div className="flex-1">
                        <div className="h-5 w-3/4 rounded" style={{ backgroundColor: COLORS.mutedBox }} />
                      </div>
                    </div>

                    <div className="mt-5 h-20 rounded-[16px]" style={{ backgroundColor: COLORS.mutedBox }} />
                    <div className="mt-6 h-14 rounded-[16px]" style={{ backgroundColor: COLORS.mutedBox }} />
                    <div className="mt-8 flex items-center justify-between">
                      <div className="h-5 w-24 rounded" style={{ backgroundColor: COLORS.mutedBox }} />
                      <div className="h-9 w-28 rounded-full" style={{ backgroundColor: COLORS.mutedBox }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : errorMsg ? (
              <div className="bg-white border border-[#d8e2ee] rounded-2xl p-8 text-center shadow-sm">
                <h3 className="text-lg font-bold text-black">Something went wrong</h3>
                <p className="mt-2 text-sm text-black/70">{errorMsg}</p>
                <button
                  className="mt-5 px-4 py-2 rounded-xl text-sm font-semibold border border-[#d8e2ee] text-black hover:bg-[#f7faff]
                             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-400 transition"
                  onClick={() =>
                    fetchCompanies({
                      search,
                      location: selectedLocation,
                      industry: selectedIndustry,
                    })
                  }
                >
                  Try again
                </button>
              </div>
            ) : companies.length === 0 ? (
              <div className="bg-white border border-[#d8e2ee] rounded-2xl p-8 text-center shadow-sm">
                <h3 className="text-lg font-bold text-black">No verified companies found</h3>
                <p className="mt-2 text-sm text-black/70">
                  {hasAnyFilter ? "No results match your filters." : "Once employers are verified, they will appear here."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {companies.map((c) => {
                  const logoUrl = resolveLogoUrl(c.companyLogo);

                  const employerId = c?._id || c?.id;
                  const jobCount = employerId ? Number(jobCountByEmployerId?.[employerId] || 0) : 0;
                  const accurateRatingSummary = getAccurateRatingSummary(c);
                  const averageRating = accurateRatingSummary.rating;
                  const reviewCount = accurateRatingSummary.reviewCount;
                  const isExpanded = expandedCardId === employerId;
                  const breakdownRows = getBreakdownRows(c);

                  return (
                    <div
                      key={c._id}
                      className={`rounded-[24px] bg-white border shadow-[0_12px_28px_rgba(46,102,166,0.06)] hover:shadow-[0_16px_34px_rgba(46,102,166,0.10)] transition flex flex-col px-6 pt-6 pb-7 ${
                        isExpanded ? "min-h-[470px]" : "h-[320px]"
                      }`}
                      style={{ borderColor: COLORS.border }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-12 h-12 rounded-[14px] overflow-hidden border border-[#E5E7EB] bg-[#F3F4F6] shrink-0">
                            {logoUrl ? (
                              <img
                                src={logoUrl}
                                alt={c.companyName || "Company logo"}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                }}
                              />
                            ) : (
                              <div className="w-full h-full bg-[#eef4fb]" />
                            )}
                          </div>

                          <div className="min-w-0 flex items-center gap-1.5 max-w-full">
                            <h3 className="min-w-0 truncate text-[19px] leading-[1.2] font-semibold text-black">
                              {c.companyName || "Company"}
                            </h3>

                            <span
                              className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white shrink-0"
                              title="Verified"
                              aria-label="Verified company"
                            >
                              <img
                                src="/images/checkmo.png"
                                alt="Verified"
                                className="w-7 h-7 object-contain"
                                draggable="false"
                              />
                            </span>
                          </div>
                        </div>
                      </div>

                      <div
                        className="mt-3 rounded-[16px] px-4 py-4"
                        style={{ backgroundColor: COLORS.mutedBox }}
                      >
                        <div className="flex items-center gap-2 text-[13px] text-black leading-none">
                          <svg
                            className="w-[16px] h-[16px] text-black/70 shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="1.9"
                              d="M3 21h18M5 21V7l7-4v18M19 21V11l-6-4M9 9h.01M9 13h.01M9 17h.01M15 13h.01M15 17h.01"
                            />
                          </svg>
                          <span className="font-semibold">Industry:</span>
                          <span className="truncate" title={c.industry || "Industry"}>
                            {shortenIndustry(c.industry, 22)}
                          </span>
                        </div>

                        <div className="mt-3 flex items-center gap-2 text-[13px] text-black leading-none">
                          <svg
                            className="w-[16px] h-[16px] text-black/70 shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="1.9"
                              d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z"
                            />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="font-semibold">Location:</span>
                          <span className="truncate">{formatCompanyLocation(c.location)}</span>
                        </div>
                      </div>

                      <div className="mt-6 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="text-[22px] leading-none font-semibold text-black shrink-0">
                            {formatRatingValue(averageRating)}
                          </div>

                          <div className="w-px h-[46px] bg-[#D6D6D6] shrink-0" />

                          <div className="min-w-0">
                            <StarRating rating={averageRating} size="w-[15px] h-[15px]" />
                            <p className="mt-2 text-[12px] leading-none text-black whitespace-nowrap">
                              {formatReviewText(averageRating, reviewCount)}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleToggleBreakdown(employerId)}
                          className="w-[30px] h-[30px] rounded-[9px] border border-[#CFCFCF] flex items-center justify-center shrink-0 bg-white"
                          aria-label={isExpanded ? "Hide rating breakdown" : "Show rating breakdown"}
                          aria-expanded={isExpanded}
                        >
                          <svg
                            className={`w-[16px] h-[16px] text-black/45 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 10l5 5 5-5" />
                          </svg>
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="mt-5 pt-4 border-t border-[#E8E8E8]">
                          <div className="space-y-[8px]">
                            {breakdownRows.map((row) => (
                              <div
                                key={row.star}
                                className="flex items-center gap-[10px]"
                                aria-label={`${row.star}.0 stars, ${row.count} ${row.count === 1 ? "review" : "reviews"}`}
                              >
                                <div className="w-[30px] shrink-0 text-[12px] font-medium text-black/70">
                                  {row.star}.0
                                </div>

                                <div className="h-[10px] flex-1 overflow-hidden rounded-full bg-[#EFEFEF]">
                                  <div
                                    className="h-full rounded-full bg-[#2e66a6] transition-all duration-300"
                                    style={{ width: `${row.percent}%` }}
                                  />
                                </div>

                                <div
                                  className="w-[28px] shrink-0 text-right text-[12px] font-semibold text-black/70"
                                  title={`${row.count} ${row.count === 1 ? "review" : "reviews"}`}
                                >
                                  {row.count}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="mt-auto pt-5 flex items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => handleViewCompanyDetails(c)}
                          className="text-[15px] font-medium text-black inline-flex items-center gap-2 leading-none transition hover:opacity-80"
                        >
                          <span className="leading-none">View details</span>
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

                        <span className="px-4 h-[38px] rounded-full text-[12px] font-medium bg-[#f7faff] text-[#2e66a6] border border-[#d8e2ee] whitespace-nowrap inline-flex items-center">
                          {jobCount} New Job Offer{jobCount === 1 ? "" : "s"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobseekerCompanies;