// src/pages/main/Companies.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import MainNavbar from "../../components/shared/MainNavbar";
import api from "../../services/api";

const MainFooter = () => {
  return (
    <footer className="bg-white border-t border-[#D7E2EE]">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-12 md:py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          <div>
            <img src="/images/agapay.png" alt="AGAPAY" className="h-10 w-auto" />

            <h3 className="mt-6 text-[20px] md:text-[22px] font-bold text-black leading-tight max-w-[320px]">
              Your Future Employer is Looking for Someone Exactly Like You!
            </h3>

            <p className="mt-4 text-black/70 text-base leading-relaxed max-w-[340px]">
              The job market is competitive but you are prepared.
            </p>

            <div className="mt-6 space-y-3 text-black/70 text-sm md:text-[15px]">
              <p>✉ agapay@au.phinma.edu.ph</p>
              <p>☎ +63 (2) 8123-4567</p>

              <p className="flex items-start gap-2">
                <svg
                  className="w-5 h-5 text-black mt-0.5 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z" />
                </svg>
                <span>PHINMA - Araullo University, Cabanatuan City, Nueva Ecija</span>
              </p>
            </div>

            <div className="mt-6 flex items-center gap-4">
              <div className="w-9 h-9 rounded-full bg-white border border-[#D7E2EE] flex items-center justify-center shadow-sm">
                <svg className="w-4 h-4 text-[#2e66a6]" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M22 12a10 10 0 1 0-11.5 9.9v-7h-2.6v-2.9h2.6V9.8c0-2.6 1.5-4 3.9-4 1.1 0 2.3.2 2.3.2v2.5h-1.3c-1.3 0-1.7.8-1.7 1.6v2h2.9l-.5 2.9h-2.4v7A10 10 0 0 0 22 12z" />
                </svg>
              </div>

              <div className="w-9 h-9 rounded-full bg-white border border-[#D7E2EE] flex items-center justify-center shadow-sm">
                <svg className="w-4 h-4 text-[#2e66a6]" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.5 8h4v12h-4V8zm7.5 0h3.6v1.6h.1c.5-.9 1.7-1.8 3.5-1.8 3.7 0 4.4 2.4 4.4 5.6V20h-4v-5.3c0-1.3 0-3-1.9-3s-2.2 1.5-2.2 2.9V20h-4V8z" />
                </svg>
              </div>

              <div className="w-9 h-9 rounded-full bg-white border border-[#D7E2EE] flex items-center justify-center shadow-sm">
                <svg className="w-4 h-4 text-[#2e66a6]" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M24 4.6a9.8 9.8 0 0 1-2.8.8 4.9 4.9 0 0 0 2.2-2.7 9.8 9.8 0 0 1-3.1 1.2 4.9 4.9 0 0 0-8.4 4.5A13.9 13.9 0 0 1 1.7 3.1 4.9 4.9 0 0 0 3.2 9a4.8 4.8 0 0 1-2.2-.6v.1a4.9 4.9 0 0 0 3.9 4.8 4.9 4.9 0 0 1-2.2.1 4.9 4.9 0 0 0 4.6 3.4A9.9 9.9 0 0 1 0 19.5 13.9 13.9 0 0 0 7.5 22c9 0 13.9-7.5 13.9-14v-.6A9.7 9.7 0 0 0 24 4.6z" />
                </svg>
              </div>

              <div className="w-9 h-9 rounded-full bg-white border border-[#D7E2EE] flex items-center justify-center shadow-sm">
                <svg className="w-4 h-4 text-[#2e66a6]" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.6 31.6 0 0 0 0 12a31.6 31.6 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.6 31.6 0 0 0 24 12a31.6 31.6 0 0 0-.5-5.8zM9.8 15.5v-7l6.2 3.5-6.2 3.5z" />
                </svg>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-extrabold tracking-[0.16em] text-black uppercase">
              Job Seeker
            </h4>

            <ul className="mt-6 space-y-4 text-black/70 text-[15px]">
              <li>Job Search</li>
              <li>Job Offers</li>
              <li>Job Application</li>
              <li>Saved Jobs</li>
              <li>Companies</li>
              <li>Job Seeker Profile</li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-extrabold tracking-[0.16em] text-black uppercase">
              Employers
            </h4>

            <ul className="mt-6 space-y-4 text-black/70 text-[15px]">
              <li>Post Job</li>
              <li>Find Talent</li>
              <li>Company Profile</li>
              <li>Manage Talent</li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-extrabold tracking-[0.16em] text-black uppercase">
              About Agapay
            </h4>

            <ul className="mt-6 space-y-4 text-black/70 text-[15px]">
              <li>About Us</li>
              <li>Contact Us</li>
              <li>Careers</li>
              <li>Partners with Us</li>
              <li>Help Center</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-[#D7E2EE] pt-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <p className="text-black/55 text-sm">
            © 2026 PHINMA ARAULLO UNIVERSITY. All rights reserved.
          </p>

          <div className="flex items-center gap-4 text-black/55 text-sm">
            <span>Privacy Policy</span>
            <span>|</span>
            <span>Terms of Use</span>
          </div>
        </div>
      </div>
    </footer>
  );
};


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

  const topLocations = ranked
    .filter((item) => item.count >= 5)
    .slice(0, 5)
    .map((item) => item.label);
  const topKeys = new Set(topLocations.map(normalizeCompanyLocationKey));

  const allLocations = ranked
    .map((item) => item.label)
    .filter((label) => !topKeys.has(normalizeCompanyLocationKey(label)))
    .sort((a, b) => a.localeCompare(b));

  return { topLocations, allLocations };
};

const Companies = () => {
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

  const [filtersOpen, setFiltersOpen] = useState(true);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [locationSearch, setLocationSearch] = useState("");
  const [expandedCardId, setExpandedCardId] = useState(null);
  const filterBoxRef = useRef(null);

  const [showGuestModal, setShowGuestModal] = useState(false);
  const firstModalBtnRef = useRef(null);
  const modalRef = useRef(null);

  const debounceRef = useRef(null);

  const COLORS = useMemo(
    () => ({
      primary: "#2e66a6",
      primaryHover: "#28598f",
      primaryActive: "#214a78",

      pageBg: "#FFFFFF",
      card: "#FFFFFF",
      border: "#D7E2EE",
      mutedBox: "#F7FAFD",

      text: "#000000",
      subtext: "#404040",
    }),
    []
  );

  const apiOrigin = useMemo(() => {
    const base = api?.defaults?.baseURL || "https://phinmaau-job-portal-atlas.onrender.com/api";
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

  const pillBtn =
    "min-h-[44px] rounded-xl px-4 bg-white border border-[#C9D8E8] shadow-[0_1px_2px_rgba(0,0,0,0.04)] text-sm font-semibold text-black/75 " +
    "flex items-center gap-2 hover:border-[#2e66a6]/55 hover:bg-[#F7FAFD] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2 transition-all flex-shrink-0";

  const searchBox =
    "w-full lg:w-[520px] h-[46px] bg-white border border-[#C9D8E8] rounded-xl px-4 " +
    "flex items-center gap-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)] flex-shrink-0 transition-all duration-200 focus-within:border-[#2e66a6] focus-within:ring-2 focus-within:ring-[#2e66a6]/20";

  const selectPill =
    "h-[46px] rounded-xl px-4 bg-white border border-[#C9D8E8] shadow-[0_1px_2px_rgba(0,0,0,0.04)] text-sm font-semibold text-black/75 " +
    "hover:border-[#2e66a6]/55 hover:bg-[#F7FAFD] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2 transition-all flex-shrink-0";

  useEffect(() => {
    if (openDropdown !== "location") {
      setLocationSearch("");
    }
  }, [openDropdown]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!openDropdown || !filterBoxRef.current) return;
      if (!filterBoxRef.current.contains(event.target)) {
        setOpenDropdown(null);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setOpenDropdown(null);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
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

  const clearAll = () => {
    setSearch("");
    setSelectedLocation("");
    setSelectedIndustry("");
    setOpenDropdown(null);
    setLocationSearch("");
    setExpandedCardId(null);
  };

  const hasAnyFilter = Boolean(search.trim() || selectedLocation || selectedIndustry);

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
          aria-controls="main-company-location-menu"
        >
          <span className="max-w-[135px] truncate whitespace-nowrap">
            {selectedLocation || "Location"}
          </span>
          <svg
            className={`ml-1 h-4 w-4 text-black/65 transition ${isOpen ? "rotate-180" : ""}`}
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
            id="main-company-location-menu"
            className="absolute left-0 top-full z-[80] mt-2 w-[300px] max-w-[92vw] rounded-xl border border-[#D7E2EE] bg-white p-4 shadow-xl"
            role="dialog"
            aria-label="Location filter"
          >
            <input
              value={locationSearch}
              onChange={(event) => setLocationSearch(event.target.value)}
              placeholder="Search location"
              className="w-full rounded-xl border border-[#D7E2EE] bg-[#F7FAFD] px-4 py-3 text-sm text-black outline-none focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/20"
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
                  className="mb-2 w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-[#2e66a6] hover:bg-[#F7FAFD]"
                >
                  Clear location
                </button>
              )}

              <div className="mb-2 text-xs font-bold uppercase tracking-wide text-black/55">
                {isSearching ? "Search Results" : "Top Locations"}
              </div>

              {displayItems.length === 0 ? (
                <div className="py-4 text-sm text-black/55">
                  {isSearching ? "No location found" : "No top locations available"}
                </div>
              ) : (
                displayItems.map((location) => (
                  <label
                    key={location}
                    className="flex cursor-pointer items-center gap-3 py-2 text-sm text-black"
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

  const IndustryDropdown = () => {
    const isOpen = openDropdown === "industry";

    return (
      <div className="relative inline-block">
        <button
          type="button"
          className={`${pillBtn} px-4`}
          onClick={() => setOpenDropdown(isOpen ? null : "industry")}
          aria-expanded={isOpen}
          aria-controls="main-company-industry-menu"
        >
          <span className="max-w-[135px] truncate whitespace-nowrap">
            {selectedIndustry || "Industry"}
          </span>
          <svg
            className={`ml-1 h-4 w-4 text-black/65 transition ${isOpen ? "rotate-180" : ""}`}
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
            id="main-company-industry-menu"
            className="absolute left-0 top-full z-[80] mt-2 w-[240px] max-w-[92vw] rounded-xl border border-[#D7E2EE] bg-white p-2 shadow-xl"
            role="dialog"
            aria-label="Industry filter"
          >
            <div className="max-h-[230px] overflow-auto">
              {industries.length === 0 ? (
                <div className="px-3 py-2 text-sm text-black/55">No industries available</div>
              ) : (
                industries.map((industry) => (
                  <button
                    key={industry}
                    type="button"
                    onClick={() => {
                      setSelectedIndustry(industry);
                      setOpenDropdown(null);
                    }}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                      selectedIndustry === industry
                        ? "bg-[#F7FAFD] font-semibold text-[#2e66a6]"
                        : "text-black hover:bg-[#F7FAFD]"
                    }`}
                    title={industry}
                  >
                    {industry}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const openGateModal = () => setShowGuestModal(true);

  const gateReason = useMemo(() => {
    return {
      title: "View company details with an AGAPAY account",
      body: "Create an account or login to view more company information and discover available job offers.",
      primary: "Sign Up",
      secondary: "Login",
    };
  }, []);

  const handleViewDetails = (company) => {
    const companyId = company?._id || company?.id;
    if (!companyId) return;
    openGateModal();
  };

  useEffect(() => {
    if (!showGuestModal) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    setTimeout(() => firstModalBtnRef.current?.focus(), 0);

    const onKeyDown = (e) => {
      if (e.key === "Escape") setShowGuestModal(false);

      if (e.key === "Tab" && modalRef.current) {
        const focusables = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusables.length) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [showGuestModal]);

  const goLogin = () => {
    setShowGuestModal(false);
    navigate("/login");
  };

  const openJoinAs = () => {
    setShowGuestModal(false);
    navigate("/join-as");
  };

  const ghostLink =
    "min-h-[44px] px-1 text-sm font-semibold text-black/70 hover:text-[#2e66a6] leading-none " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2 " +
    "rounded-lg inline-flex items-center gap-2 transition-colors";

  return (
    <div className="min-h-screen bg-white">
      <MainNavbar />

      <div className="pt-24 pb-14">
        <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <div className="rounded-[24px] border border-[#D7E2EE] bg-[#F7FAFD] px-5 py-5 md:px-6 md:py-5 shadow-[0_8px_24px_rgba(46,102,166,0.06)]">
              <div className="relative z-10">
                <div className="mb-6">
                  <h1 className="text-[28px] md:text-[32px] font-bold tracking-tight text-black leading-tight">Companies</h1>
                  <p className="mt-2 text-[15px] text-black/65 leading-relaxed">Browse verified companies and discover new job offers.</p>
                </div>

                <div ref={filterBoxRef} className="flex flex-wrap items-center gap-3">
                  <div className={searchBox}>
                    <svg
                      className="w-5 h-5 text-black/55"
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
                      className="w-full outline-none text-sm text-black/75 bg-transparent"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      aria-label="Search companies"
                    />
                  </div>

                  {filtersOpen ? (
                    <>
                      <LocationDropdown />
                      <IndustryDropdown />
                    </>
                  ) : null}

                  {hasAnyFilter ? (
                    <button type="button" className={pillBtn} onClick={clearAll}>
                      Clear all
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6">
            {!loadingInitial && !errorMsg && (
              <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <p className="text-sm font-medium text-black/65">
                  Showing <span className="font-bold text-black">{companies.length}</span> verified compan{companies.length === 1 ? "y" : "ies"}
                </p>

                {hasAnyFilter && (
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#2e66a6]">Filtered results</p>
                )}
              </div>
            )}

            {loadingInitial ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5 xl:gap-6">
                {[...Array(8)].map((_, index) => (
                  <div
                    key={index}
                    className="rounded-[22px] p-6 animate-pulse bg-white min-h-[360px]"
                    style={{ border: `1px solid ${COLORS.border}` }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-14 w-14 rounded-[18px]" style={{ backgroundColor: COLORS.mutedBox }} />
                      <div className="flex-1">
                        <div className="h-5 w-3/4 rounded" style={{ backgroundColor: COLORS.mutedBox }} />
                      </div>
                    </div>

                    <div className="mt-4 h-20 rounded-[16px]" style={{ backgroundColor: COLORS.mutedBox }} />
                    <div className="mt-6 flex items-center justify-between">
                      <div className="h-12 w-32 rounded" style={{ backgroundColor: COLORS.mutedBox }} />
                      <div className="h-8 w-8 rounded-[9px]" style={{ backgroundColor: COLORS.mutedBox }} />
                    </div>
                    <div className="mt-6 h-px w-full" style={{ backgroundColor: "#E5E7EB" }} />
                    <div className="mt-6 flex items-center justify-between">
                      <div className="h-5 w-24 rounded" style={{ backgroundColor: COLORS.mutedBox }} />
                      <div className="h-10 w-28 rounded-full" style={{ backgroundColor: COLORS.mutedBox }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : errorMsg ? (
              <div className="bg-white border border-[#D7E2EE] rounded-[24px] p-8 text-center shadow-[0_8px_24px_rgba(0,0,0,0.05)]">
                <h3 className="text-lg font-bold text-black">Something went wrong</h3>
                <p className="mt-2 text-sm text-black/65">{errorMsg}</p>
                <button
                  className="mt-5 px-4 py-2 rounded-xl text-sm font-semibold border border-[#AFC6DD] text-black/75 hover:bg-[#F7FAFD]
                             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#2e66a6] transition"
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
              <div className="bg-white border border-[#D7E2EE] rounded-[24px] p-8 text-center shadow-[0_8px_24px_rgba(0,0,0,0.05)]">
                <h3 className="text-lg font-bold text-black">No verified companies found</h3>
                <p className="mt-2 text-sm text-black/65">
                  {hasAnyFilter ? "No results match your filters." : "Once employers are verified, they will appear here."}
                </p>

                {hasAnyFilter && (
                  <button
                    type="button"
                    onClick={clearAll}
                    className="mt-5 px-4 py-2 rounded-xl text-sm font-semibold border border-[#AFC6DD] text-black/75 hover:bg-[#F7FAFD] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#2e66a6] transition"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 items-start md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5 xl:gap-6">
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
                      className={`group self-start rounded-[22px] bg-white border shadow-[0_6px_18px_rgba(0,0,0,0.045)] hover:shadow-[0_14px_34px_rgba(46,102,166,0.13)] hover:-translate-y-0.5 transition-all duration-200 flex flex-col px-6 pt-6 pb-7 ${
                        isExpanded ? "min-h-[470px]" : "min-h-[342px]"
                      }`}
                      style={{ borderColor: COLORS.border }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-14 h-14 rounded-[16px] overflow-hidden border border-[#D7E2EE] bg-white shadow-sm shrink-0">
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
                              <div className="w-full h-full bg-[#EAF1F8]" />
                            )}
                          </div>

                          <div className="min-w-0 flex items-center gap-1.5 max-w-full">
                            <h3 className="min-w-0 truncate text-[18px] md:text-[19px] leading-[1.25] font-bold text-black group-hover:text-[#2e66a6] transition">
                              {c.companyName || "Company"}
                            </h3>

                            <span
                              className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white border border-[#D7E2EE] shadow-sm shrink-0"
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
                        className="mt-4 rounded-2xl px-4 py-4 border border-[#E8F0F8]"
                        style={{ backgroundColor: COLORS.mutedBox }}
                      >
                        <div className="flex items-center gap-2 text-[13px] text-black/75 leading-none">
                          <svg
                            className="w-[16px] h-[16px] text-black/65 shrink-0"
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

                        <div className="mt-3 flex items-center gap-2 text-[13px] text-black/75 leading-none">
                          <svg
                            className="w-[16px] h-[16px] text-black/65 shrink-0"
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

                          <div className="w-px h-[46px] bg-[#D7E2EE] shrink-0" />

                          <div className="min-w-0">
                            <StarRating rating={averageRating} size="w-[15px] h-[15px]" />
                            <p className="mt-2 text-[12px] leading-none text-black/65 whitespace-nowrap">
                              {formatReviewText(averageRating, reviewCount)}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleToggleBreakdown(employerId)}
                          className="w-[34px] h-[34px] rounded-xl border border-[#D7E2EE] flex items-center justify-center shrink-0 bg-white hover:bg-[#F7FAFD] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2 transition"
                          aria-label={isExpanded ? "Hide rating breakdown" : "Show rating breakdown"}
                          aria-expanded={isExpanded}
                        >
                          <svg
                            className={`w-[16px] h-[16px] text-black/55 transition-transform ${isExpanded ? "rotate-180" : ""}`}
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
                        <div className="mt-5 pt-4 border-t border-[#D7E2EE]">
                          <div className="space-y-[8px]">
                            {breakdownRows.map((row) => (
                              <div
                                key={row.star}
                                className="flex items-center gap-[10px]"
                                aria-label={`${row.star}.0 stars, ${row.count} ${row.count === 1 ? "review" : "reviews"}`}
                              >
                                <div className="w-[30px] shrink-0 text-[12px] font-medium text-[#595959]">
                                  {row.star}.0
                                </div>

                                <div className="h-[10px] flex-1 overflow-hidden rounded-full bg-[#EAF1F8]">
                                  <div
                                    className="h-full rounded-full bg-[#2e66a6] transition-all duration-300"
                                    style={{ width: `${row.percent}%` }}
                                  />
                                </div>

                                <div
                                  className="w-[28px] shrink-0 text-right text-[12px] font-semibold text-[#595959]"
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
                        <button type="button" onClick={() => handleViewDetails(c)} className={ghostLink}>
                          <span className="leading-none">View Details</span>
                          <svg
                            className="w-4 h-4 self-center shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                          </svg>
                        </button>

                        <span className="px-4 h-[38px] rounded-full text-[12px] font-semibold bg-[#2e66a6]/10 text-[#2e66a6] border border-[#2e66a6]/25 whitespace-nowrap inline-flex items-center">
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

      <MainFooter />

      {showGuestModal && (
        <div className="fixed inset-0 z-[80]">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={() => setShowGuestModal(false)} aria-hidden="true" />

          <div className="absolute inset-0 flex items-center justify-center px-4">
            <div
              ref={modalRef}
              className="w-full max-w-[460px] bg-white border border-[#D7E2EE] shadow-[0_24px_80px_rgba(0,0,0,0.24)] rounded-[24px]"
              role="dialog"
              aria-modal="true"
              aria-label="Access required"
            >
              <div className="flex items-start justify-end px-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowGuestModal(false)}
                  className="h-9 w-9 rounded-full border border-[#D7E2EE] hover:bg-[#F7FAFD] flex items-center justify-center
                             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#2e66a6] transition"
                  aria-label="Close"
                  title="Close"
                >
                  <span className="text-lg leading-none text-black/75">×</span>
                </button>
              </div>

              <div className="px-8 pb-8 -mt-1">
                <div className="flex justify-center">
                  <img
                    src="/images/agapaymo.png"
                    alt="AGAPAY"
                    className="h-14 w-auto object-contain select-none"
                    draggable="false"
                  />
                </div>

                <h3 className="mt-4 text-center text-2xl md:text-3xl font-bold text-black leading-snug">
                  {gateReason?.title || "Access required"}
                </h3>

                <p className="mt-3 text-center text-sm text-black/65 leading-6">
                  {gateReason?.body || "Please login to continue."}
                </p>

                <div className="mt-6 flex flex-col gap-3">
                  <button
                    ref={firstModalBtnRef}
                    type="button"
                    onClick={openJoinAs}
                    className="w-full h-11 rounded-lg text-sm font-semibold text-white
                               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 transition"
                    style={{ backgroundColor: COLORS.primary }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = COLORS.primaryHover)}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = COLORS.primary)}
                    onMouseDown={(e) => (e.currentTarget.style.backgroundColor = COLORS.primaryActive)}
                    onMouseUp={(e) => (e.currentTarget.style.backgroundColor = COLORS.primaryHover)}
                  >
                    {gateReason?.primary || "Sign Up"}
                  </button>

                  <button
                    type="button"
                    onClick={goLogin}
                    className="w-full h-11 rounded-lg text-sm font-semibold text-black
                               border border-[#D7E2EE] bg-[#F5F8FC] hover:bg-[#EAF1F8] transition
                               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#2e66a6]"
                  >
                    {gateReason?.secondary || "Login"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Companies;