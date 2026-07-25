// src/pages/main/JobOffers.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import MainNavbar from "../../components/shared/MainNavbar";
import api from "../../services/api";
import { EDUCATION_LEVELS } from "../../constants/postJobDropdownOptions";
import { PH_PROVINCES_BY_REGION, PH_CITIES_BY_PROVINCE } from "../../constants/phLocations";

const normalizeAmount = (value) => String(value || "").replace(/[^\d]/g, "");

const formatAmountInput = (value) => {
  const digits = normalizeAmount(value);
  return digits ? Number(digits).toLocaleString("en-PH") : "";
};


const normalizeLocationPart = (value) => String(value || '').trim();

const normalizeLocationKey = (value) =>
  normalizeLocationPart(value)
    .toLowerCase()
    .replace(/\bcity of\b/g, '')
    .replace(/\bcity\b/g, '')
    .replace(/[^a-z0-9ñ\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const PROVINCE_OPTIONS = Array.from(
  new Set(Object.values(PH_PROVINCES_BY_REGION).flat().filter(Boolean))
);

const CITY_OPTIONS = Array.from(
  new Set(Object.values(PH_CITIES_BY_PROVINCE).flat().filter(Boolean))
);

const buildCanonicalLocationMap = (items) => {
  const map = new Map();

  items.forEach((item) => {
    const key = normalizeLocationKey(item);
    if (key && !map.has(key)) map.set(key, item);
  });

  return map;
};

const PROVINCE_BY_KEY = buildCanonicalLocationMap(PROVINCE_OPTIONS);
const CITY_BY_KEY = buildCanonicalLocationMap(CITY_OPTIONS);

const findCanonicalLocation = (value, preferredType = '') => {
  const raw = normalizeLocationPart(value);
  if (!raw || /^\d+$/.test(raw)) return '';

  const key = normalizeLocationKey(raw);
  if (!key) return '';

  if (preferredType === 'city') return CITY_BY_KEY.get(key) || '';
  if (preferredType === 'province') return PROVINCE_BY_KEY.get(key) || '';

  return CITY_BY_KEY.get(key) || PROVINCE_BY_KEY.get(key) || '';
};

const getJobLocationLabels = (job) => {
  const city = findCanonicalLocation(job?.locationCity, 'city');
  const province = findCanonicalLocation(job?.locationProvince, 'province');
  const savedLabels = [city, province].filter(Boolean);

  if (savedLabels.length) return Array.from(new Set(savedLabels));

  const address = normalizeLocationPart(job?.location);
  if (!address) return [];

  const parts = address
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .reverse();

  const fallbackProvince = parts
    .map((part) => findCanonicalLocation(part, 'province'))
    .find(Boolean) || '';

  const fallbackCity = parts
    .map((part) => findCanonicalLocation(part, 'city'))
    .find((label) =>
      label && normalizeLocationKey(label) !== normalizeLocationKey(fallbackProvince)
    ) || '';

  return Array.from(new Set([fallbackCity, fallbackProvince].filter(Boolean)));
};

const jobMatchesSelectedLocations = (job, selectedLocations) => {
  if (!selectedLocations?.length) return true;

  const labels = getJobLocationLabels(job).map(normalizeLocationKey);
  return selectedLocations.some((selected) => labels.includes(normalizeLocationKey(selected)));
};

const buildLocationGroups = (jobs) => {
  const counts = new Map();

  (jobs || []).forEach((job) => {
    getJobLocationLabels(job).forEach((label) => {
      counts.set(label, (counts.get(label) || 0) + 1);
    });
  });

  const ranked = Array.from(counts.entries()).sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0])
  );

  const topLocations = ranked
    .filter(([, count]) => count > 1)
    .slice(0, 5)
    .map(([label]) => label);

  const topSet = new Set(topLocations);
  const allLocations = ranked
    .map(([label]) => label)
    .filter((label) => !topSet.has(label))
    .sort((a, b) => a.localeCompare(b));

  return { topLocations, allLocations };
};

const normalizeBoolean = (value) => {
  if (typeof value === "boolean") return value;
  const v = String(value || "").trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes" || v === "on";
};

const normalizeExperienceLevel = (value) => String(value || "").trim().toLowerCase();

const isFreshGraduateJob = (job) => {
  return normalizeBoolean(job?.openToFreshGraduates);
};

const isNoExperienceJob = (experienceLevel) => {
  return normalizeExperienceLevel(experienceLevel) === "no experience required";
};

const getExperienceBadgeLabel = (experienceLevel) => {
  const raw = String(experienceLevel || "").trim();
  if (!raw) return "";

  const normalized = normalizeExperienceLevel(raw);

  if (normalized === "no experience required") return "No Experience";
  if (["less than 1 yr", "less than 1 year", "less than 1 yr exp", "less than 1 year exp"].includes(normalized)) return "Less than 1 Yr Exp";
  if (["1 year", "1 years", "2 year", "2 years", "3 year", "3 years", "1-3 years", "1-3 years exp"].includes(normalized)) return "1-3 Years Exp";
  if (["4 year", "4 years", "5 year", "5 years", "4-5 years", "4-5 years exp"].includes(normalized)) return "4-5 Years Exp";
  if (["6+ year", "6+ years", "6+ year exp", "6+ years exp"].includes(normalized)) return "6+ Years Exp";

  return raw;
};

const CheckboxDropdown = ({
  id,
  label,
  placeholder,
  items,
  selected,
  setSelected,
  enableSearch = false,
  menuWidth = "w-[320px]",
  openDropdown,
  setOpenDropdown,
  pillBtn,
  topItems = [],
  allItems = [],
}) => {
  const [localSearch, setLocalSearch] = useState("");

  useEffect(() => {
    if (openDropdown !== id) setLocalSearch("");
  }, [openDropdown, id]);

  const toggleValue = (val) => {
    setSelected((prev) => {
      const exists = prev.includes(val);
      if (exists) return prev.filter((x) => x !== val);
      return [...prev, val];
    });
  };

  const searchValue = localSearch.toLowerCase().trim();
  const filterItems = (values) =>
    enableSearch
      ? (values || []).filter((item) =>
          String(item || '').toLowerCase().includes(searchValue)
        )
      : values || [];

  const hasGroupedItems = topItems.length > 0 || allItems.length > 0;
  const searchableGroupedItems = Array.from(new Set([...topItems, ...allItems]));
  const isSearchingGroupedItems = hasGroupedItems && Boolean(searchValue);
  const filteredSearchResults = filterItems(searchableGroupedItems);
  const filtered = filterItems(items);

  const count = selected.length;
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
        <span className="whitespace-nowrap">{label}</span>

        {count > 0 && (
          <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-bold bg-[#2e66a6]/10 text-[#2e66a6] border border-[#2e66a6]/25">
            {count}
          </span>
        )}

        <svg
          className={`w-4 h-4 text-black/65 ml-1 transition ${isOpen ? "rotate-180" : ""}`}
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
          className={`absolute z-50 mt-2 ${menuWidth} max-w-[92vw] bg-white border border-[#D7E2EE] rounded-xl shadow-xl p-4`}
          role="dialog"
          aria-label={`${label} filter`}
        >
          {enableSearch && (
            <input
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder={placeholder}
              className="w-full px-4 py-3 rounded-xl bg-[#F7FAFD] border border-[#D7E2EE] outline-none text-sm text-black placeholder:text-black/45 caret-[#2e66a6] focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/20"
            />
          )}

          <div className={`${enableSearch ? 'mt-4' : ''} max-h-[280px] overflow-auto pr-1`}>
            {hasGroupedItems ? (
              isSearchingGroupedItems ? (
                filteredSearchResults.length > 0 ? (
                  <div>
                    <div className="mb-2 text-xs font-bold uppercase tracking-wide text-black/55">
                      Search Results
                    </div>
                    {filteredSearchResults.map((opt) => (
                      <label key={`search-${opt}`} className="flex items-center gap-3 py-2 text-sm text-black cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selected.includes(opt)}
                          onChange={() => toggleValue(opt)}
                          className="h-4 w-4"
                        />
                        <span className="select-none whitespace-nowrap">{opt}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-black/55 py-4">No location found</div>
                )
              ) : topItems.length > 0 ? (
                <div>
                  <div className="mb-2 text-xs font-bold uppercase tracking-wide text-black/55">
                    Top Locations
                  </div>
                  {topItems.map((opt) => (
                    <label key={`top-${opt}`} className="flex items-center gap-3 py-2 text-sm text-black cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selected.includes(opt)}
                        onChange={() => toggleValue(opt)}
                        className="h-4 w-4"
                      />
                      <span className="select-none whitespace-nowrap">{opt}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-black/55 py-4">No top locations available</div>
              )
            ) : filtered.length === 0 ? (
              <div className="text-sm text-black/55 py-4">No results</div>
            ) : (
              filtered.map((opt) => (
                <label key={opt} className="flex items-center gap-3 py-2 text-sm text-black cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selected.includes(opt)}
                    onChange={() => toggleValue(opt)}
                    className="h-4 w-4"
                  />
                  <span className="select-none whitespace-nowrap">{opt}</span>
                </label>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const SalaryDropdown = ({
  id,
  label,
  value,
  setValue,
  openDropdown,
  setOpenDropdown,
  pillBtn,
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
        <span className="whitespace-nowrap">{label}</span>

        {value ? (
          <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-bold bg-[#2e66a6]/10 text-[#2e66a6] border border-[#2e66a6]/25">
            1
          </span>
        ) : null}

        <svg
          className={`w-4 h-4 text-black/65 ml-1 transition ${isOpen ? "rotate-180" : ""}`}
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
          className="absolute right-0 z-50 mt-2 w-[320px] max-w-[92vw] bg-white border border-[#D7E2EE] rounded-xl shadow-xl p-4"
          role="dialog"
          aria-label={`${label} filter`}
        >
          <div className="space-y-3">
            <div className="flex items-center overflow-hidden rounded-xl border border-[#2e66a6] bg-white">
              <div className="px-4 py-3 text-[18px] font-semibold text-black/75 border-r border-[#D7E2EE]">
                PHP
              </div>
              <input
                type="text"
                inputMode="numeric"
                value={formatAmountInput(value)}
                onChange={(e) => setValue(normalizeAmount(e.target.value))}
                placeholder="Indicate minimum salary"
                className="w-full px-4 py-3 outline-none text-sm text-black/75 bg-white"
              />
            </div>

            <button
              type="button"
              className="w-full h-[50px] rounded-xl text-sm font-semibold text-white bg-[#2e66a6] hover:bg-[#28598f] transition"
              onClick={() => setOpenDropdown(null)}
            >
              Add Filter
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const SortDropdown = ({
  id,
  label,
  value,
  setValue,
  openDropdown,
  setOpenDropdown,
  pillBtn,
}) => {
  const isOpen = openDropdown === id;

  const options = [
    {
      group: "Salary",
      items: [{ value: "salary_desc", label: "Highest to Lowest" }],
    },
    {
      group: "Expiry Date",
      items: [{ value: "expiry_asc", label: "Soonest to Latest" }],
    },
    {
      group: "Freshness",
      items: [{ value: "newest", label: "Newest to Oldest" }],
    },
  ];

  return (
    <div className="relative inline-block">
      <button
        type="button"
        className={pillBtn}
        onClick={() => setOpenDropdown(isOpen ? null : id)}
        aria-expanded={isOpen}
        aria-controls={`${id}-menu`}
      >
        <span className="whitespace-nowrap">{label}</span>

        {value ? (
          <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-bold bg-[#2e66a6]/10 text-[#2e66a6] border border-[#2e66a6]/25">
            1
          </span>
        ) : null}

        <svg
          className={`w-4 h-4 text-black/65 ml-1 transition ${isOpen ? "rotate-180" : ""}`}
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
          className="absolute right-0 z-50 mt-2 w-[280px] max-w-[92vw] bg-white border border-[#D7E2EE] rounded-xl shadow-xl p-3"
          role="dialog"
          aria-label={`${label} filter`}
        >
          <div className="space-y-2">
            {options.map((section) => (
              <div key={section.group} className="rounded-lg border border-gray-100 overflow-hidden">
                <div className="px-3 py-2 bg-[#F7FAFD] text-xs font-bold uppercase tracking-wide text-black/55">
                  {section.group}
                </div>

                <div className="p-1">
                  {section.items.map((item) => {
                    const selected = value === item.value;

                    return (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => {
                          setValue(item.value);
                          setOpenDropdown(null);
                        }}
                        className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm transition ${
                          selected
                            ? "bg-blue-50 text-[#2e66a6] border border-blue-200"
                            : "text-black/75 hover:bg-[#F7FAFD] border border-transparent"
                        }`}
                      >
                        <span>{item.label}</span>
                        {selected && (
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {value && (
              <button
                type="button"
                onClick={() => {
                  setValue("");
                  setOpenDropdown(null);
                }}
                className="w-full mt-1 rounded-lg border border-[#D7E2EE] px-3 py-2 text-sm font-medium text-black/75 hover:bg-[#F7FAFD] transition"
              >
                Clear Sort
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const FilterCheck = ({ label, checked, onChange, light = false }) => (
  <label
    className={`inline-flex items-center gap-2 h-[40px] px-2 text-[15px] font-semibold whitespace-nowrap cursor-pointer select-none ${
      light ? "text-white" : "text-[#1F2937]"
    }`}
  >
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className="h-[16px] w-[16px] rounded border border-[#BFC3C9]"
    />
    <span>{label}</span>
  </label>
);

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

const JobOffers = () => {
  const navigate = useNavigate();

  const [allJobs, setAllJobs] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [visibleJobCount, setVisibleJobCount] = useState(16);
  const [loadingMoreJobs, setLoadingMoreJobs] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [showGuestModal, setShowGuestModal] = useState(false);
  const firstModalBtnRef = useRef(null);
  const modalRef = useRef(null);

  const [searchFocused, setSearchFocused] = useState(false);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [selectedLocations, setSelectedLocations] = useState([]);
  const [selectedJobTitles, setSelectedJobTitles] = useState([]);
  const [selectedEmploymentTypes, setSelectedEmploymentTypes] = useState([]);
  const [selectedEducationLevels, setSelectedEducationLevels] = useState([]);
  const [selectedCompanies, setSelectedCompanies] = useState([]);
  const [selectedWorkModes, setSelectedWorkModes] = useState([]);

  const [salaryMinInput, setSalaryMinInput] = useState("");

  const [sortBy, setSortBy] = useState("");

  const [freshGraduate, setFreshGraduate] = useState(false);
  const [noExperience, setNoExperience] = useState(false);

  const [openDropdown, setOpenDropdown] = useState(null);
  const filterBoxRef = useRef(null);

  const getStoredUser = () => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  };

  const token = localStorage.getItem("token");
  const user = getStoredUser();
  const isGuest = !token || !user;

  const COLORS = useMemo(
    () => ({
      primary: "#2e66a6",
      primaryHover: "#28598f",
      primaryActive: "#214a78",

      pageBg: "#FFFFFF",
      frame: "#F5F8FC",
      card: "#FFFFFF",
      border: "#D7E2EE",
      borderStrong: "#AFC6DD",
      mutedBox: "#F7FAFD",

      text: "#000000",
      subtext: "#404040",
    }),
    []
  );

  const formatLocationDisplay = (loc) => {
    const v = String(loc || "").trim();
    return v || "—";
  };

  const normalizeJobsResponse = (response) => {
    let jobsData = [];
    if (response.data?.success && response.data?.jobs) jobsData = response.data.jobs;
    else if (response.data?.data) jobsData = response.data.data;
    else if (Array.isArray(response.data)) jobsData = response.data;
    else if (response.data?.success && response.data?.data) jobsData = response.data.data;
    return jobsData || [];
  };

  const formatSalary = (min, max, hideSalary = false) => {
    if (hideSalary) return 'Salary Undisclosed';
    if (!min && !max) return "Salary not specified";

    const minNum = min ? Number(min) : null;
    const maxNum = max ? Number(max) : null;

    const formattedMin = Number.isFinite(minNum) ? minNum.toLocaleString() : "";
    const formattedMax = Number.isFinite(maxNum) ? maxNum.toLocaleString() : "";

    if (formattedMin && formattedMax) return `${formattedMin} - ${formattedMax}`;
    if (formattedMin) return `From ${formattedMin}`;
    return `Up to ${formattedMax}`;
  };

  const formatApplicationDeadline = (deadline) => {
    if (!deadline) return "Application deadline not specified";

    const date = new Date(deadline);

    if (Number.isNaN(date.getTime())) {
      return "Application deadline not specified";
    }

    return `Deadline of application: ${date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
    })}`;
  };

  const jobMatchesSearch = (job, term) => {
    const searchText = String(term || "").trim().toLowerCase();
    if (!searchText) return true;

    const compactSearchText = searchText.replace(/[^a-z0-9ñ]+/g, "");
    const experienceBadge = getExperienceBadgeLabel(job?.experienceLevel);
    const workModeBadge = normalizeWorkModeLabel(job?.workMode);
    const locationLabels = getJobLocationLabels(job);
    const freshGraduateAliases = isFreshGraduateJob(job)
      ? "open fresh grads open to fresh graduates fresh graduate fresh grads"
      : "";
    const noExperienceAliases = isNoExperienceJob(job?.experienceLevel)
      ? "no experience no experience required without experience"
      : "";

    const searchableValues = [
      job?.title,
      job?.companyName,
      job?.location,
      job?.locationCity,
      job?.locationProvince,
      ...locationLabels,
      job?.jobType,
      job?.workMode,
      workModeBadge,
      job?.experienceLevel,
      experienceBadge,
      job?.educationLevel,
      job?.category,
      job?.description,
      job?.requirements,
      ...(Array.isArray(job?.skillsRequired) ? job.skillsRequired : [job?.skillsRequired]),
      ...(Array.isArray(job?.perksAndBenefits) ? job.perksAndBenefits : [job?.perksAndBenefits]),
      job?.otherBenefits,
      job?.willingToRelocate,
      job?.salaryMin,
      job?.salaryMax,
      formatSalary(job?.salaryMin, job?.salaryMax, job?.hideSalary),
      formatApplicationDeadline(job?.applicationDeadline),
      freshGraduateAliases,
      noExperienceAliases,
      job?.hideSalary ? "salary undisclosed hidden salary" : "",
      job?.isUrgent ? "urgent urgently needed" : "",
    ]
      .filter((value) => value !== undefined && value !== null && value !== "")
      .map((value) => String(value).toLowerCase());

    const combinedText = searchableValues.join(" ");
    if (combinedText.includes(searchText)) return true;

    if (compactSearchText) {
      const compactCombinedText = combinedText.replace(/[^a-z0-9ñ]+/g, "");
      if (compactCombinedText.includes(compactSearchText)) return true;
    }

    return searchText
      .split(/\s+/)
      .filter(Boolean)
      .every((word) => combinedText.includes(word));
  };

  const normalizeWorkModeLabel = (value) => {
    const v = String(value || "").trim().toLowerCase();

    if (!v) return "";

    if (v.includes("hybrid") || v.includes("blended")) return "Blended";
    if (v.includes("work from home") || v.includes("wfh")) return "Work from Home";
    if (v.includes("remote")) return "Remote";
    if (v.includes("on-site") || v.includes("onsite") || v.includes("on site")) return "On-site";

    return String(value || "").trim();
  };

  const fetchAllJobs = async () => {
    try {
      setErrorMsg("");
      setLoadingInitial(true);
      const response = await api.get("/jobs");
      const jobsData = normalizeJobsResponse(response);

      const now = new Date();
      const eligible = (jobsData || []).filter((job) => {
        if (!job) return false;

        if (job.isPublished === false) return false;
        if (job.isActive === false) return false;

        if (!job.applicationDeadline) return true;
        const d = new Date(job.applicationDeadline);
        if (Number.isNaN(d.getTime())) return true;
        return d >= now;
      });

      setAllJobs(eligible);
    } catch (e) {
      console.error("Error fetching jobs:", e);
      setAllJobs([]);
      setErrorMsg("We couldn’t load job posts right now. Please try again.");
    } finally {
      setLoadingInitial(false);
    }
  };

  useEffect(() => {
    fetchAllJobs();
  }, []);

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

  useEffect(() => {
    setUpdating(true);
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setUpdating(false);
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  const options = useMemo(() => {
    const uniq = (arr) => Array.from(new Set(arr.filter(Boolean)));

    const locationGroups = buildLocationGroups(allJobs);

    const jobTitles = uniq(
      allJobs
        .map((j) => String(j?.title || "").replaceAll('"', "").trim())
        .filter(Boolean)
    ).sort((a, b) => a.localeCompare(b));

    const employmentTypes = uniq(allJobs.map((j) => String(j?.jobType || "").trim()).filter(Boolean)).sort(
      (a, b) => a.localeCompare(b)
    );

    const educationLevels = EDUCATION_LEVELS;

    const companies = uniq(allJobs.map((j) => String(j?.companyName || "").trim()).filter(Boolean)).sort(
      (a, b) => a.localeCompare(b)
    );

    return { ...locationGroups, jobTitles, employmentTypes, educationLevels, companies };
  }, [allJobs]);

  const visibleJobs = useMemo(
    () => filteredJobs.slice(0, visibleJobCount),
    [filteredJobs, visibleJobCount]
  );

  const hasMoreJobs = visibleJobCount < filteredJobs.length;

  useEffect(() => {
    setVisibleJobCount(16);
    setLoadingMoreJobs(false);
  }, [filteredJobs]);

  const handleViewMoreJobs = () => {
    if (loadingMoreJobs || !hasMoreJobs) return;

    setLoadingMoreJobs(true);
    window.setTimeout(() => {
      setVisibleJobCount((current) => Math.min(current + 16, filteredJobs.length));
      setLoadingMoreJobs(false);
    }, 500);
  };

  const hasActiveFilters =
    search.trim() ||
    selectedLocations.length ||
    selectedJobTitles.length ||
    selectedEmploymentTypes.length ||
    selectedEducationLevels.length ||
    selectedCompanies.length ||
    selectedWorkModes.length ||
    salaryMinInput.trim() ||
    sortBy ||
    freshGraduate ||
    noExperience;

  useEffect(() => {
    if (!loadingInitial) {
      setUpdating(true);
      const t = setTimeout(() => setUpdating(false), 120);
      return () => clearTimeout(t);
    }
  }, [
    loadingInitial,
    selectedLocations,
    selectedJobTitles,
    selectedEmploymentTypes,
    selectedEducationLevels,
    selectedCompanies,
    selectedWorkModes,
    salaryMinInput,
    sortBy,
    freshGraduate,
    noExperience,
  ]);

  const filteredJobs = useMemo(() => {
    const salaryMinValue = Number(normalizeAmount(salaryMinInput));

    const toSalaryNumber = (value) => {
      if (value === undefined || value === null || value === "") return null;
      const numericValue = Number(value);
      return Number.isFinite(numericValue) ? numericValue : null;
    };

    const getSalaryMinComparable = (job) => {
      if (job?.hideSalary) return Number.MAX_SAFE_INTEGER;
      return toSalaryNumber(job?.salaryMin) ?? Number.MAX_SAFE_INTEGER;
    };

    const getSalaryMaxComparable = (job) => {
      if (job?.hideSalary) return -1;
      return toSalaryNumber(job?.salaryMax) ?? toSalaryNumber(job?.salaryMin) ?? -1;
    };

    const getExpiryComparable = (job) => {
      const date = new Date(job?.applicationDeadline || 0).getTime();
      return Number.isNaN(date) || date <= 0 ? Number.MAX_SAFE_INTEGER : date;
    };

    const getFreshnessComparable = (job) => {
      const created = new Date(job?.createdAt || job?.updatedAt || 0).getTime();
      return Number.isNaN(created) ? 0 : created;
    };

    const compareByTitle = (a, b) =>
      String(a?.title || "").localeCompare(String(b?.title || ""));

    const filtered = (allJobs || [])
      .filter((job) => jobMatchesSearch(job, debouncedSearch))
      .filter((job) => jobMatchesSelectedLocations(job, selectedLocations))
      .filter((job) =>
        selectedJobTitles.length ? selectedJobTitles.includes(String(job.title || "").replaceAll('"', "").trim()) : true
      )
      .filter((job) =>
        selectedEmploymentTypes.length ? selectedEmploymentTypes.includes(String(job.jobType || "").trim()) : true
      )
      .filter((job) =>
        selectedEducationLevels.length ? selectedEducationLevels.includes(String(job.educationLevel || "").trim()) : true
      )
      .filter((job) =>
        selectedCompanies.length ? selectedCompanies.includes(String(job.companyName || "").trim()) : true
      )
      .filter((job) =>
        selectedWorkModes.length ? selectedWorkModes[0] === normalizeWorkModeLabel(job.workMode) : true
      )
      .filter((job) => {
        if (!salaryMinInput.trim() || Number.isNaN(salaryMinValue)) return true;
        if (job?.hideSalary) return false;

        const jobMin = toSalaryNumber(job?.salaryMin);
        return jobMin !== null && jobMin >= salaryMinValue;
      })
      .filter((job) => {
        if (!freshGraduate && !noExperience) return true;

        const matchesFreshGraduate = freshGraduate ? isFreshGraduateJob(job) : false;
        const matchesNoExperience = noExperience ? isNoExperienceJob(job?.experienceLevel) : false;

        if (freshGraduate && noExperience) return matchesFreshGraduate && matchesNoExperience;
        if (freshGraduate) return matchesFreshGraduate;
        return matchesNoExperience;
      });

    const sorted = [...filtered];

    if (sortBy === "salary_desc") {
      sorted.sort((a, b) => {
        const maxDifference = getSalaryMaxComparable(b) - getSalaryMaxComparable(a);
        if (maxDifference !== 0) return maxDifference;

        const minDifference = getSalaryMinComparable(b) - getSalaryMinComparable(a);
        if (minDifference !== 0) return minDifference;

        return compareByTitle(a, b);
      });
    } else if (sortBy === "expiry_asc") {
      sorted.sort((a, b) => {
        const deadlineDifference = getExpiryComparable(a) - getExpiryComparable(b);
        if (deadlineDifference !== 0) return deadlineDifference;

        const freshnessDifference = getFreshnessComparable(b) - getFreshnessComparable(a);
        if (freshnessDifference !== 0) return freshnessDifference;

        return compareByTitle(a, b);
      });
    } else if (sortBy === "newest") {
      sorted.sort((a, b) => {
        const freshnessDifference = getFreshnessComparable(b) - getFreshnessComparable(a);
        if (freshnessDifference !== 0) return freshnessDifference;

        return compareByTitle(a, b);
      });
    } else if (salaryMinInput.trim()) {
      sorted.sort((a, b) => {
        const minDifference = getSalaryMinComparable(a) - getSalaryMinComparable(b);
        if (minDifference !== 0) return minDifference;

        const maxDifference = getSalaryMaxComparable(a) - getSalaryMaxComparable(b);
        if (maxDifference !== 0) return maxDifference;

        return compareByTitle(a, b);
      });
    }

    return sorted;
  }, [
    allJobs,
    debouncedSearch,
    selectedLocations,
    selectedJobTitles,
    selectedEmploymentTypes,
    selectedEducationLevels,
    selectedCompanies,
    selectedWorkModes,
    salaryMinInput,
    sortBy,
    freshGraduate,
    noExperience,
  ]);

  const clearFilters = () => {
    setSearch("");
    setSelectedLocations([]);
    setSelectedJobTitles([]);
    setSelectedEmploymentTypes([]);
    setSelectedEducationLevels([]);
    setSelectedCompanies([]);
    setSelectedWorkModes([]);
    setSalaryMinInput("");
    setSortBy("");
    setFreshGraduate(false);
    setNoExperience(false);
    setOpenDropdown(null);
  };

  const openGateModal = () => setShowGuestModal(true);

  const gateReason = useMemo(() => {
    return {
      title: "Apply to this job with an AGAPAY account",
      body: "Build your profile, apply to this job, and track your application status with a AGAPAY account.",
      primary: "Sign Up",
      secondary: "Login",
      primaryAction: "signup",
    };
  }, []);

  const handleLearnMore = (job) => {
    const jobId = job?._id || job?.id;
    if (!jobId) return;
    navigate(`/jobs/${jobId}`);
  };

  const handleApply = (job) => {
    const jobId = job?._id || job?.id;
    if (!jobId) return;
    openGateModal();
  };

  const handleSaveJob = (job) => {
    const jobId = job?._id || job?.id;
    if (!jobId) return;
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

  const primaryBtn =
    "min-h-[44px] px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-[0_8px_18px_rgba(46,102,166,0.18)] " +
    "hover:shadow-[0_10px_22px_rgba(46,102,166,0.24)] active:scale-[0.99] " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2 transition-all";

  const ghostLink =
    "min-h-[44px] px-1 text-sm font-semibold text-black/70 hover:text-[#2e66a6] leading-none " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2 " +
    "inline-flex items-center gap-2 transition-colors";

  const pillBtn =
    "h-[44px] rounded-xl px-4 bg-white/95 border border-white/30 text-sm font-medium text-gray-700 flex items-center gap-2 hover:bg-white transition flex-shrink-0";

  const searchBox =
    "w-full lg:w-auto lg:min-w-[220px] lg:max-w-[370px] lg:flex-1 h-[44px] bg-white/95 border border-white/30 rounded-xl px-4 flex items-center gap-3 shrink transition-all duration-300 ease-in-out focus-within:ring-2 focus-within:ring-blue-200";

  const filterRowClass = "flex flex-wrap items-center gap-3";

  const toggleWorkMode = (label) => {
    setSelectedWorkModes((prev) => (prev[0] === label ? [] : [label]));
  };

  const isCompanyVerified = (job) => {
    return Boolean(job?.companyVerified ?? job?.isCompanyVerified ?? job?.isVerified ?? job?.verified);
  };

  return (
    <div className="min-h-screen bg-white">
      <MainNavbar />

      <div className="pt-24 pb-14">
        <div className="max-w-[1500px] mx-auto px-3 lg:px-4 2xl:px-6">
          <div className="bg-transparent">
            <div
              ref={filterBoxRef}
              className="relative rounded-[26px] border border-gray-200 p-6 md:p-8 shadow-[0_4px_20px_rgba(0,0,0,0.08)] overflow-visible text-white bg-gradient-to-br from-[#061e4e] via-[#244e7f] to-[#52b2db] transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)]"
            >
              <div className="mb-6">
                <h1 className="text-[28px] md:text-[30px] font-semibold leading-tight text-white">Job Offers</h1>
                <p className="mt-2 text-[16px] text-blue-100/90">Browse available jobs and apply immediately.</p>
              </div>

              <div className={filterRowClass}>
                <div className={searchBox}>
                  <svg
                    className="w-5 h-5 text-gray-500"
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
                    placeholder="Find a Job or Company..."
                    className="w-full h-full outline-none text-sm text-gray-700 bg-transparent placeholder:text-gray-400"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => setSearchFocused(false)}
                    aria-label="Search jobs"
                  />
                </div>

                <CheckboxDropdown
                  id="location"
                  label="Location"
                  placeholder="Search location"
                  items={[]}
                  topItems={options.topLocations}
                  allItems={options.allLocations}
                  selected={selectedLocations}
                  setSelected={setSelectedLocations}
                  enableSearch
                  menuWidth="w-[300px]"
                  openDropdown={openDropdown}
                  setOpenDropdown={setOpenDropdown}
                  pillBtn={pillBtn}
                />

                <CheckboxDropdown
                  id="jobTitle"
                  label="Job title"
                  placeholder=""
                  items={options.jobTitles}
                  selected={selectedJobTitles}
                  setSelected={setSelectedJobTitles}
                  menuWidth="w-[300px]"
                  openDropdown={openDropdown}
                  setOpenDropdown={setOpenDropdown}
                  pillBtn={pillBtn}
                />

                <CheckboxDropdown
                  id="employmentType"
                  label="Employment Type"
                  placeholder=""
                  items={options.employmentTypes}
                  selected={selectedEmploymentTypes}
                  setSelected={setSelectedEmploymentTypes}
                  menuWidth="w-[300px]"
                  openDropdown={openDropdown}
                  setOpenDropdown={setOpenDropdown}
                  pillBtn={pillBtn}
                />

                <CheckboxDropdown
                  id="educationLevel"
                  label="Education Level"
                  placeholder=""
                  items={options.educationLevels}
                  selected={selectedEducationLevels}
                  setSelected={setSelectedEducationLevels}
                  menuWidth="w-[320px]"
                  openDropdown={openDropdown}
                  setOpenDropdown={setOpenDropdown}
                  pillBtn={pillBtn}
                />

                <CheckboxDropdown
                  id="company"
                  label="Company"
                  placeholder="Search companies"
                  items={options.companies}
                  selected={selectedCompanies}
                  setSelected={setSelectedCompanies}
                  enableSearch
                  menuWidth="w-[300px]"
                  openDropdown={openDropdown}
                  setOpenDropdown={setOpenDropdown}
                  pillBtn={pillBtn}
                />

                <SalaryDropdown
                  id="salary"
                  label="Salary"
                  value={salaryMinInput}
                  setValue={setSalaryMinInput}
                  openDropdown={openDropdown}
                  setOpenDropdown={setOpenDropdown}
                  pillBtn={pillBtn}
                />

                <SortDropdown
                  id="sortBy"
                  label="Sort by"
                  value={sortBy}
                  setValue={setSortBy}
                  openDropdown={openDropdown}
                  setOpenDropdown={setOpenDropdown}
                  pillBtn={pillBtn}
                />

                <FilterCheck
                  label="No Experience Required"
                  checked={noExperience}
                  onChange={(e) => setNoExperience(e.target.checked)}
                light
                />

                <FilterCheck
                  label="Open to Fresh graduates"
                  checked={freshGraduate}
                  onChange={(e) => setFreshGraduate(e.target.checked)}
                light
                />

                <FilterCheck
                  label="On-site"
                  checked={selectedWorkModes.includes("On-site")}
                  onChange={() => toggleWorkMode("On-site")}
                light
                />

                <FilterCheck
                  label="Blended"
                  checked={selectedWorkModes.includes("Blended")}
                  onChange={() => toggleWorkMode("Blended")}
                light
                />

                <FilterCheck
                  label="Remote"
                  checked={selectedWorkModes.includes("Remote")}
                  onChange={() => toggleWorkMode("Remote")}
                light
                />

                <FilterCheck
                  label="Work from Home"
                  checked={selectedWorkModes.includes("Work from Home")}
                  onChange={() => toggleWorkMode("Work from Home")}
                light
                />

                {hasActiveFilters && (
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 h-[40px] px-4 rounded-xl border border-[#D7E2EE] bg-white text-[15px] font-medium text-black/60 hover:bg-[#F7FAFD] transition"
                    onClick={clearFilters}
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Clear All
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6">
            {loadingInitial ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5 xl:gap-6">
                {[...Array(8)].map((_, index) => (
                  <div
                    key={index}
                    className="rounded-2xl p-7 animate-pulse"
                    style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.border}` }}
                  >
                    <div className="h-6 w-3/4 rounded mb-4" style={{ backgroundColor: COLORS.mutedBox }} />
                    <div className="h-4 w-1/2 rounded mb-5" style={{ backgroundColor: COLORS.mutedBox }} />
                    <div className="h-24 rounded mb-5" style={{ backgroundColor: COLORS.mutedBox }} />
                    <div className="h-9 w-2/3 rounded mb-5" style={{ backgroundColor: COLORS.mutedBox }} />
                    <div className="flex items-center justify-between">
                      <div className="h-4 w-24 rounded" style={{ backgroundColor: COLORS.mutedBox }} />
                      <div className="h-10 w-28 rounded" style={{ backgroundColor: COLORS.mutedBox }} />
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
                  onClick={fetchAllJobs}
                >
                  Try again
                </button>
              </div>
            ) : filteredJobs.length === 0 ? (
              <div className="bg-white border border-[#D7E2EE] rounded-[24px] p-8 text-center shadow-[0_8px_24px_rgba(0,0,0,0.05)]">
                <h3 className="text-lg font-bold text-black">No results found</h3>
                <p className="mt-2 text-sm text-black/65">Try adjusting your filters or search terms.</p>

                <div className="mt-5 flex items-center justify-center gap-3">
                  {hasActiveFilters && (
                    <button
                      className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#AFC6DD] text-black/75 hover:bg-[#F7FAFD]
                                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#2e66a6] transition"
                      onClick={clearFilters}
                    >
                      Clear filters
                    </button>
                  )}

                  <button
                    className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#AFC6DD] text-black/75 hover:bg-[#F7FAFD]
                               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#2e66a6] transition"
                    onClick={fetchAllJobs}
                  >
                    Refresh
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5 xl:gap-6">
                {visibleJobs.map((job) => {
                  const jobId = job._id || job.id;

                  const experienceBadgeLabel = getExperienceBadgeLabel(job.experienceLevel);
                  const tagFreshGrad = isFreshGraduateJob(job);

                  const wmLabel = normalizeWorkModeLabel(job.workMode);
                  const tagBlended = wmLabel === "Blended";
                  const tagOnsite = wmLabel === "On-site";
                  const tagRemote = wmLabel === "Remote";
                  const tagWorkFromHome = wmLabel === "Work from Home";

                  const verified = isCompanyVerified(job) || job?.companyVerified == null;

                  return (
                    <div
                      key={jobId}
                      className="group relative overflow-visible rounded-[22px] p-5 bg-white shadow-[0_6px_18px_rgba(0,0,0,0.045)] hover:shadow-[0_14px_34px_rgba(46,102,166,0.13)] hover:-translate-y-0.5 transition-all duration-200 flex flex-col min-h-[372px]"
                      style={{ border: `1px solid ${COLORS.border}` }}
                    >
                      {job.isUrgent ? (
                        <img
                          src="/images/urgentss.png"
                          alt="Urgent Hiring"
                          draggable="false"
                          className="pointer-events-none absolute -top-[66px] -left-[50px] z-10 w-[230px] max-w-none select-none"
                        />
                      ) : null}

                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-4 min-w-0 flex-1">
                          <div className="w-12 h-12 rounded-[14px] overflow-hidden flex-shrink-0 border border-[#D7E2EE] bg-white shadow-sm">
                            {job.companyLogo ? (
                              <img
                                src={job.companyLogo}
                                alt={job.companyName || "Company logo"}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                }}
                              />
                            ) : (
                              <div className="w-full h-full bg-[#EAF1F8]" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <h3 className="min-w-0 truncate whitespace-nowrap text-[17px] md:text-lg font-bold text-black leading-snug group-hover:text-[#2e66a6] transition">
                              {String(job.title || "Job Title").replaceAll('"', "")}
                            </h3>

                            <div className="mt-1 flex items-center gap-2 min-w-0">
                              <span className="text-sm font-medium text-black/65 truncate">
                                {job.companyName || "Company"}
                              </span>

                              {verified && (
                                <span
                                  className="inline-flex items-center justify-center w-5 h-5 rounded-full flex-shrink-0"
                                  title="Verified"
                                  aria-label="Verified company"
                                >
                                  <img
                                    src="/images/checkmo.png"
                                    alt="Verified"
                                    className="w-5 h-5 object-contain"
                                    draggable="false"
                                  />
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSaveJob(job)}
                          className="flex items-center justify-center w-10 h-10 rounded-xl text-black/65 hover:bg-[#F7FAFD] hover:text-[#2e66a6] transition flex-shrink-0"
                          aria-label="Save job"
                          title="Save job"
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M17 21l-5-3-5 3V5a2 2 0 012-2h6a2 2 0 012 2v16z"
                            />
                          </svg>
                        </button>
                      </div>

                      <div className="mt-4 rounded-2xl p-3.5" style={{ backgroundColor: COLORS.mutedBox }}>
                        <div className="flex items-center gap-2 text-sm text-black/75 min-h-[20px] min-w-0">
                          <svg
                            className="w-4 h-4 text-black/65 flex-shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                          </svg>
                          <span className="truncate min-w-0 flex-1">{formatLocationDisplay(job.location)}</span>
                        </div>

                        <div className="mt-2 flex items-center gap-2 text-sm text-black/75">
                          <span className="w-4 h-4 text-black/65 flex items-center justify-center font-extrabold text-[14px] leading-none">
                            ₱
                          </span>
                          <span className="truncate">{formatSalary(job.salaryMin, job.salaryMax, job.hideSalary)}</span>
                        </div>

                        <div className="mt-2 flex items-center gap-2 text-sm text-black/75">
                          <svg
                            className="w-4 h-4 text-black/65"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                            />
                          </svg>
                          <span className="truncate">{job.jobType || "Full Time Work"}</span>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center gap-2 text-[13px] font-medium text-black/65">
                        <svg
                          className="w-4 h-4 text-black/55 flex-shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M8 7V3m8 4V3m-9 8h10m-11 9h12a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v11a2 2 0 002 2z"
                          />
                        </svg>
                        <span className="truncate">{formatApplicationDeadline(job.applicationDeadline)}</span>
                      </div>

                      <div className="mt-4 flex flex-nowrap items-center gap-2 overflow-hidden whitespace-nowrap">
                        {experienceBadgeLabel && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap flex-shrink-0 bg-blue-50 text-[#2e66a6] border border-blue-200">
                            {experienceBadgeLabel}
                          </span>
                        )}

                        {tagBlended && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap flex-shrink-0 bg-blue-50 text-[#2e66a6] border border-blue-200">
                            Blended
                          </span>
                        )}
                        {tagOnsite && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap flex-shrink-0 bg-blue-50 text-[#2e66a6] border border-blue-200">
                            On-site
                          </span>
                        )}
                        {tagRemote && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap flex-shrink-0 bg-blue-50 text-[#2e66a6] border border-blue-200">
                            Remote
                          </span>
                        )}
                        {tagWorkFromHome && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap flex-shrink-0 bg-blue-50 text-[#2e66a6] border border-blue-200">
                            Work from Home
                          </span>
                        )}

                        {tagFreshGrad && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap flex-shrink-0 bg-blue-50 text-[#2e66a6] border border-blue-200">
                            Open fresh grad
                          </span>
                        )}
                      </div>

                      <div className="mt-4 w-full h-px bg-[#D7E2EE]" />

                      <div className="mt-auto pt-4 flex items-center justify-between gap-3">
                        <button type="button" onClick={() => handleLearnMore(job)} className={ghostLink}>
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

                        <button
                          type="button"
                          onClick={() => handleApply(job)}
                          className={primaryBtn}
                          style={{ backgroundColor: COLORS.primary }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = COLORS.primaryHover)}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = COLORS.primary)}
                          onMouseDown={(e) => (e.currentTarget.style.backgroundColor = COLORS.primaryActive)}
                          onMouseUp={(e) => (e.currentTarget.style.backgroundColor = COLORS.primaryHover)}
                        >
                          Apply Now
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {hasMoreJobs && (
                <div className="mt-8 flex justify-center">
                  <button
                    type="button"
                    onClick={handleViewMoreJobs}
                    disabled={loadingMoreJobs}
                    className="inline-flex min-w-[190px] items-center justify-center gap-2 rounded-xl border border-[#2e66a6] bg-white px-6 py-3 text-sm font-semibold text-[#2e66a6] transition hover:bg-[#F7FAFD] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loadingMoreJobs && (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#2e66a6] border-r-transparent" />
                    )}
                    {loadingMoreJobs ? "Loading jobs..." : "View More Jobs"}
                  </button>
                </div>
              )}
              </>
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

export default JobOffers;
