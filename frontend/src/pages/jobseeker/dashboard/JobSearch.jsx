import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import JobSeekerLayout from '../../../layouts/JobSeekerLayout';
import { JOB_TYPES, EXPERIENCE_LEVELS, EDUCATION_LEVELS } from '../../../constants/postJobDropdownOptions';
import { PH_PROVINCES_BY_REGION, PH_CITIES_BY_PROVINCE } from '../../../constants/phLocations';
import api from '../../../services/api';
import ApplyJobModal from '../../../components/jobseeker/ApplyJobModal';

const normalizeAmount = (value) => String(value || '').replace(/[^\d]/g, '');

const formatAmountInput = (value) => {
  const digits = normalizeAmount(value);
  return digits ? Number(digits).toLocaleString('en-PH') : '';
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
  if (typeof value === 'boolean') return value;
  const v = String(value || '').trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes' || v === 'on';
};

const normalizeExperienceLevelValue = (value) => String(value || '').trim().toLowerCase();

const isFreshGraduateJob = (job) => {
  return normalizeBoolean(job?.openToFreshGraduates);
};

const isNoExperienceJob = (experienceLevel) => {
  return normalizeExperienceLevelValue(experienceLevel) === 'no experience required';
};

const getExperienceBadgeLabel = (experienceLevel) => {
  const raw = String(experienceLevel || '').trim();
  if (!raw) return '';

  const normalized = normalizeExperienceLevelValue(raw);

  if (normalized === 'no experience required') return 'No Experience';
  if (['less than 1 yr', 'less than 1 year', 'less than 1 yr exp', 'less than 1 year exp'].includes(normalized)) return 'Less than 1 Yr Exp';
  if (['1 year', '1 years', '2 year', '2 years', '3 year', '3 years', '1-3 years', '1-3 years exp'].includes(normalized)) return '1-3 Years Exp';
  if (['4 year', '4 years', '5 year', '5 years', '4-5 years', '4-5 years exp'].includes(normalized)) return '4-5 Years Exp';
  if (['6+ year', '6+ years', '6+ year exp', '6+ years exp'].includes(normalized)) return '6+ Years Exp';

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
  menuWidth = 'w-[320px]',
  openDropdown,
  setOpenDropdown,
  pillBtn,
  topItems = [],
  allItems = []
}) => {
  const [localSearch, setLocalSearch] = useState('');

  useEffect(() => {
    if (openDropdown !== id) setLocalSearch('');
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
    <div className="relative inline-block overflow-visible">
      <button
        type="button"
        className={pillBtn}
        onClick={() => setOpenDropdown(isOpen ? null : id)}
        aria-expanded={isOpen}
        aria-controls={`${id}-menu`}
      >
        <span className="whitespace-nowrap">{label}</span>

        {count > 0 && (
          <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-[#2e66a6] border border-blue-200">
            {count}
          </span>
        )}

        <svg
          className={`w-4 h-4 text-gray-600 ml-1 transition ${isOpen ? 'rotate-180' : ''}`}
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
          className={`absolute left-0 top-full z-[999] mt-2 ${menuWidth} max-w-[92vw] bg-white border border-gray-200 rounded-xl shadow-xl p-4`}
          role="dialog"
          aria-label={`${label} filter`}
        >
          {enableSearch && (
            <input
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder={placeholder}
              className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 outline-none text-sm text-gray-800"
            />
          )}

          <div className={`${enableSearch ? 'mt-4' : ''} max-h-[280px] overflow-auto pr-1`}>
            {hasGroupedItems ? (
              isSearchingGroupedItems ? (
                filteredSearchResults.length > 0 ? (
                  <div>
                    <div className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">
                      Search Results
                    </div>
                    {filteredSearchResults.map((opt) => (
                      <label key={`search-${opt}`} className="flex items-center gap-3 py-2 text-sm text-gray-800 cursor-pointer">
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
                  <div className="text-sm text-gray-500 py-4">No location found</div>
                )
              ) : topItems.length > 0 ? (
                <div>
                  <div className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">
                    Top Locations
                  </div>
                  {topItems.map((opt) => (
                    <label key={`top-${opt}`} className="flex items-center gap-3 py-2 text-sm text-gray-800 cursor-pointer">
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
                <div className="text-sm text-gray-500 py-4">No top locations available</div>
              )
            ) : filtered.length === 0 ? (
              <div className="text-sm text-gray-500 py-4">No results</div>
            ) : (
              filtered.map((opt) => (
                <label key={opt} className="flex items-center gap-3 py-2 text-sm text-gray-800 cursor-pointer">
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

const SalaryDropdown = ({ id, label, value, setValue, openDropdown, setOpenDropdown, pillBtn }) => {
  const isOpen = openDropdown === id;

  return (
    <div className="relative inline-block overflow-visible">
      <button
        type="button"
        className={pillBtn}
        onClick={() => setOpenDropdown(isOpen ? null : id)}
        aria-expanded={isOpen}
        aria-controls={`${id}-menu`}
      >
        <span className="whitespace-nowrap">{label}</span>

        {value ? (
          <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-[#2e66a6] border border-blue-200">
            1
          </span>
        ) : null}

        <svg
          className={`w-4 h-4 text-gray-600 ml-1 transition ${isOpen ? 'rotate-180' : ''}`}
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
          className="absolute right-0 top-full z-[999] mt-2 w-[320px] max-w-[92vw] bg-white border border-gray-200 rounded-xl shadow-xl p-4"
          role="dialog"
          aria-label={`${label} filter`}
        >
          <div className="space-y-3">
            <div className="flex items-center overflow-hidden rounded-xl border border-[#1E63E9] bg-white">
              <div className="px-4 py-3 text-[18px] font-semibold text-gray-700 border-r border-gray-200">PHP</div>
              <input
                type="text"
                inputMode="numeric"
                value={formatAmountInput(value)}
                onChange={(e) => setValue(normalizeAmount(e.target.value))}
                placeholder="Indicate minimum salary"
                className="w-full px-4 py-3 outline-none text-sm text-gray-700 bg-white"
              />
            </div>

            <button
              type="button"
              className="w-full h-[50px] rounded-xl text-sm font-semibold text-white bg-[#3472b9] hover:bg-[#2e66a6] transition"
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
  pillBtn
}) => {
  const isOpen = openDropdown === id;

  const options = [
    {
      group: 'Salary',
      items: [{ value: 'salary_desc', label: 'Highest to Lowest' }]
    },
    {
      group: 'Expiry Date',
      items: [{ value: 'expiry_asc', label: 'Soonest to Latest' }]
    },
    {
      group: 'Freshness',
      items: [{ value: 'newest', label: 'Newest to Oldest' }]
    }
  ];

  return (
    <div className="relative inline-block overflow-visible">
      <button
        type="button"
        className={pillBtn}
        onClick={() => setOpenDropdown(isOpen ? null : id)}
        aria-expanded={isOpen}
        aria-controls={`${id}-menu`}
      >
        <span className="whitespace-nowrap">{label}</span>

        {value ? (
          <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-[#2e66a6] border border-blue-200">
            1
          </span>
        ) : null}

        <svg
          className={`w-4 h-4 text-gray-600 ml-1 transition ${isOpen ? 'rotate-180' : ''}`}
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
          className="absolute right-0 top-full z-[999] mt-2 w-[280px] max-w-[92vw] bg-white border border-gray-200 rounded-xl shadow-xl p-3"
          role="dialog"
          aria-label={`${label} filter`}
        >
          <div className="space-y-2">
            {options.map((section) => (
              <div key={section.group} className="rounded-lg border border-gray-100 overflow-hidden">
                <div className="px-3 py-2 bg-gray-50 text-xs font-bold uppercase tracking-wide text-gray-500">
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
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'text-gray-700 hover:bg-gray-50 border border-transparent'
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
                  setValue('');
                  setOpenDropdown(null);
                }}
                className="w-full mt-1 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
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
      light ? 'text-white' : 'text-[#1F2937]'
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

const JobSearch = () => {
  const navigate = useNavigate();
  const filterBoxRef = useRef(null);
  const toastTimerRef = useRef(null);

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [visibleJobCount, setVisibleJobCount] = useState(16);
  const [loadingMoreJobs, setLoadingMoreJobs] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [location, setLocation] = useState('');

  const [filters, setFilters] = useState({
    jobType: '',
    industry: '',
    workMode: '',
    minSalary: '',
    maxSalary: '',
    experienceLevel: ''
  });

  const [layoutView, setLayoutView] = useState('grid');
  const [applyingJob, setApplyingJob] = useState(null);
  const [showApplyModal, setShowApplyModal] = useState(false);

  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [debouncedLocation, setDebouncedLocation] = useState('');

  const [openDropdown, setOpenDropdown] = useState(null);
  const [searchFocused, setSearchFocused] = useState(false);

  const [selectedLocations, setSelectedLocations] = useState([]);
  const [selectedJobTitles, setSelectedJobTitles] = useState([]);
  const [selectedEmploymentTypes, setSelectedEmploymentTypes] = useState([]);
  const [selectedEducationLevels, setSelectedEducationLevels] = useState([]);
  const [selectedCompanies, setSelectedCompanies] = useState([]);
  const [salaryMinInput, setSalaryMinInput] = useState('');
  const [sortBy, setSortBy] = useState('');

  const [freshGraduate, setFreshGraduate] = useState(false);
  const [noExperience, setNoExperience] = useState(false);

  const [savedJobIds, setSavedJobIds] = useState([]);
  const [savingJobId, setSavingJobId] = useState('');
  const [appliedJobIds, setAppliedJobIds] = useState([]);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const COLORS = useMemo(
    () => ({
      primary: '#1e4ba0',
      primaryHover: '#1b4290',
      primaryActive: '#163879',
      pageBg: '#EEF3FF',
      card: '#FFFFFF',
      border: '#E5E7EB',
      mutedBox: '#F3F4F6',
      text: '#111827',
      subtext: '#4B5563'
    }),
    []
  );

  const jobTypes = JOB_TYPES;
  const experienceLevels = EXPERIENCE_LEVELS;

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });

    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }

    toastTimerRef.current = setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 2200);
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const formatLocationDisplay = (loc) => {
    const v = String(loc || '').trim();
    return v || '—';
  };

  const normalizeWorkModeLabel = (value) => {
    const v = String(value || '').trim().toLowerCase();

    if (!v) return '';
    if (v.includes('hybrid') || v.includes('blended')) return 'Blended';
    if (v.includes('work from home') || v.includes('wfh')) return 'Work from Home';
    if (v.includes('remote')) return 'Remote';
    if (v.includes('on-site') || v.includes('onsite') || v.includes('on site')) return 'On-site';

    return '';
  };

  const formatApplicationDeadline = (deadline) => {
    if (!deadline) return 'Application deadline not specified';

    const date = new Date(deadline);

    if (Number.isNaN(date.getTime())) {
      return 'Application deadline not specified';
    }

    return `Deadline of application: ${date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric'
    })}`;
  };

  const formatSalary = (min, max, hideSalary = false) => {
    if (hideSalary) return 'Salary Undisclosed';
    if (!min && !max) return 'Salary not specified';

    const minNum = min ? Number(min) : null;
    const maxNum = max ? Number(max) : null;

    const formattedMin = Number.isFinite(minNum) ? minNum.toLocaleString() : '';
    const formattedMax = Number.isFinite(maxNum) ? maxNum.toLocaleString() : '';

    if (formattedMin && formattedMax) return `${formattedMin} - ${formattedMax}`;
    if (formattedMin) return `From ${formattedMin}`;
    return `Up to ${formattedMax}`;
  };

  const jobMatchesSearch = (job, term) => {
    const searchText = String(term || '').trim().toLowerCase();
    if (!searchText) return true;

    const compactSearchText = searchText.replace(/[^a-z0-9ñ]+/g, '');
    const workModeLabel = normalizeWorkModeLabel(job?.workMode);
    const experienceLabel = getExperienceBadgeLabel(job?.experienceLevel);
    const locationLabels = getJobLocationLabels(job);

    const searchableValues = [
      job?.title,
      job?.companyName,
      job?.location,
      job?.locationCity,
      job?.locationProvince,
      ...locationLabels,
      job?.jobType,
      job?.workMode,
      workModeLabel,
      job?.experienceLevel,
      experienceLabel,
      job?.educationLevel,
      job?.category,
      job?.industry,
      job?.description,
      job?.requirements,
      ...(Array.isArray(job?.skillsRequired) ? job.skillsRequired : [job?.skillsRequired]),
      ...(Array.isArray(job?.perksAndBenefits) ? job.perksAndBenefits : [job?.perksAndBenefits]),
      job?.otherBenefits,
      job?.salaryMin,
      job?.salaryMax,
      formatSalary(job?.salaryMin, job?.salaryMax, job?.hideSalary),
      formatApplicationDeadline(job?.applicationDeadline),
      isFreshGraduateJob(job) ? 'fresh graduate fresh grads open to fresh graduates' : '',
      isNoExperienceJob(job?.experienceLevel) ? 'no experience no experience required' : '',
      job?.isUrgent ? 'urgent hiring urgently needed' : ''
    ]
      .filter((value) => value !== undefined && value !== null && value !== '')
      .map((value) => String(value).toLowerCase());

    const combinedText = searchableValues.join(' ');

    if (combinedText.includes(searchText)) return true;

    if (compactSearchText) {
      const compactCombinedText = combinedText.replace(/[^a-z0-9ñ]+/g, '');
      if (compactCombinedText.includes(compactSearchText)) return true;
    }

    return searchText
      .split(/\s+/)
      .filter(Boolean)
      .every((word) => combinedText.includes(word));
  };

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedLocation(location.trim()), 400);
    return () => clearTimeout(t);
  }, [location]);

  useEffect(() => {
    fetchJobs();
    // Initial fetch only; search and filters are applied together client-side.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      if (e.key === 'Escape') setOpenDropdown(null);
    };

    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [openDropdown]);

  const safeSalaryRange = useMemo(() => {
    const min = filters.minSalary !== '' ? Number(filters.minSalary) : '';
    const max = filters.maxSalary !== '' ? Number(filters.maxSalary) : '';

    if (min !== '' && max !== '' && !Number.isNaN(min) && !Number.isNaN(max) && min > max) {
      return { minSalary: String(max), maxSalary: String(min) };
    }

    return { minSalary: filters.minSalary, maxSalary: filters.maxSalary };
  }, [filters.minSalary, filters.maxSalary]);

  const fetchSavedJobs = async () => {
    try {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');

      if (!token || !userStr) {
        setSavedJobIds([]);
        return;
      }

      const parsedUser = JSON.parse(userStr);
      if (parsedUser.role !== 'jobseeker') {
        setSavedJobIds([]);
        return;
      }

      const response = await api.get('/jobs/saved');
      if (response.data?.success && Array.isArray(response.data.jobs)) {
        setSavedJobIds(response.data.jobs.map((job) => job._id || job.id).filter(Boolean));
      } else {
        setSavedJobIds([]);
      }
    } catch {
      setSavedJobIds([]);
    }
  };

  const fetchAppliedJobs = async () => {
    try {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');

      if (!token || !userStr) {
        setAppliedJobIds([]);
        return;
      }

      const parsedUser = JSON.parse(userStr);
      if (parsedUser.role !== 'jobseeker') {
        setAppliedJobIds([]);
        return;
      }

      const response = await api.get('/applications/my-applications');

      if (response.data?.success && Array.isArray(response.data.applications)) {
        const ids = response.data.applications
          .map((application) => application?.job?._id || application?.job?.id)
          .filter(Boolean);

        setAppliedJobIds(Array.from(new Set(ids)));
      } else {
        setAppliedJobIds([]);
      }
    } catch {
      setAppliedJobIds([]);
    }
  };

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      // Kunin ang available jobs once. Search at filters are combined below.

      let response;
      try {
        response = await api.get(`/jobs/recommended?${params.toString()}`);
      } catch (recommendedError) {
        console.error('Error fetching recommended jobs, falling back to all jobs:', recommendedError);
        response = await api.get(`/jobs?${params.toString()}`);
      }

      let jobsData = [];

      if (response.data.success && response.data.jobs) {
        jobsData = response.data.jobs;
      } else if (response.data.data) {
        jobsData = response.data.data;
      } else if (Array.isArray(response.data)) {
        jobsData = response.data;
      } else if (response.data.success && response.data.data) {
        jobsData = response.data.data;
      }

      const now = new Date();
      const filteredJobs = (jobsData || []).filter((job) => {
        if (!job) return false;
        if (job.isPublished === false) return false;
        if (job.isActive === false) return false;
        if (String(job.status || '').toLowerCase() === 'filled') return false;

        if (!job.applicationDeadline) return true;
        const d = new Date(job.applicationDeadline);
        if (Number.isNaN(d.getTime())) return true;
        return d >= now;
      });

      setJobs(filteredJobs);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSavedJobs();
    fetchAppliedJobs();
  }, []);

  useEffect(() => {
    if (selectedLocations.length > 0) {
      setLocation(selectedLocations[0]);
      setDebouncedLocation(selectedLocations[0]);
    } else {
      setLocation('');
      setDebouncedLocation('');
    }
  }, [selectedLocations]);

  useEffect(() => {
    handleFilterChange('jobType', selectedEmploymentTypes[0] || '');
  }, [selectedEmploymentTypes]);

  useEffect(() => {
    handleFilterChange('minSalary', salaryMinInput);
  }, [salaryMinInput]);

  const options = useMemo(() => {
    const uniq = (arr) => Array.from(new Set(arr.filter(Boolean)));

    const locationGroups = buildLocationGroups(jobs);

    const jobTitles = uniq(
      jobs
        .map((j) => String(j?.title || '').replaceAll('"', '').trim())
        .filter(Boolean)
    ).sort((a, b) => a.localeCompare(b));

    const employmentTypes = uniq(jobs.map((j) => String(j?.jobType || '').trim()).filter(Boolean)).sort((a, b) =>
      a.localeCompare(b)
    );

    const companies = uniq(jobs.map((j) => String(j?.companyName || '').trim()).filter(Boolean)).sort((a, b) =>
      a.localeCompare(b)
    );

    const educationLevels = EDUCATION_LEVELS;

    return { ...locationGroups, jobTitles, employmentTypes, companies, educationLevels };
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    const salaryMinValue = Number(normalizeAmount(salaryMinInput));

    const toSalaryNumber = (value) => {
      if (value === undefined || value === null || value === '') return null;
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
      String(a?.title || '').localeCompare(String(b?.title || ''));

    const filtered = jobs
      .filter((job) => jobMatchesSearch(job, debouncedSearch))
      .filter((job) => jobMatchesSelectedLocations(job, selectedLocations))
      .filter((job) =>
        selectedJobTitles.length
          ? selectedJobTitles.includes(String(job?.title || '').replaceAll('"', '').trim())
          : true
      )
      .filter((job) =>
        selectedEmploymentTypes.length
          ? selectedEmploymentTypes.includes(String(job?.jobType || '').trim())
          : true
      )
      .filter((job) =>
        selectedEducationLevels.length
          ? selectedEducationLevels.includes(String(job?.educationLevel || '').trim())
          : true
      )
      .filter((job) =>
        selectedCompanies.length
          ? selectedCompanies.includes(String(job?.companyName || '').trim())
          : true
      )
      .filter((job) =>
        filters.industry
          ? String(job?.industry || job?.category || '').trim() === filters.industry
          : true
      )
      .filter((job) =>
        filters.experienceLevel
          ? String(job?.experienceLevel || '').trim() === filters.experienceLevel
          : true
      )
      .filter((job) =>
        filters.workMode
          ? normalizeWorkModeLabel(job?.workMode) === normalizeWorkModeLabel(filters.workMode)
          : true
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

    if (sortBy === 'salary_desc') {
      sorted.sort((a, b) => {
        const maxDifference = getSalaryMaxComparable(b) - getSalaryMaxComparable(a);
        if (maxDifference !== 0) return maxDifference;

        const minDifference = getSalaryMinComparable(b) - getSalaryMinComparable(a);
        if (minDifference !== 0) return minDifference;

        return compareByTitle(a, b);
      });
    } else if (sortBy === 'expiry_asc') {
      sorted.sort((a, b) => {
        const deadlineDifference = getExpiryComparable(a) - getExpiryComparable(b);
        if (deadlineDifference !== 0) return deadlineDifference;

        const freshnessDifference = getFreshnessComparable(b) - getFreshnessComparable(a);
        if (freshnessDifference !== 0) return freshnessDifference;

        return compareByTitle(a, b);
      });
    } else if (sortBy === 'newest') {
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
    } else {
      sorted.sort((a, b) => {
        const matchDiff = Number(b?.matchScore || 0) - Number(a?.matchScore || 0);
        if (matchDiff !== 0) return matchDiff;

        const freshnessDifference = getFreshnessComparable(b) - getFreshnessComparable(a);
        if (freshnessDifference !== 0) return freshnessDifference;

        return compareByTitle(a, b);
      });
    }

    return sorted;
  }, [
    jobs,
    debouncedSearch,
    selectedLocations,
    selectedJobTitles,
    selectedEmploymentTypes,
    selectedEducationLevels,
    selectedCompanies,
    filters.industry,
    filters.workMode,
    filters.experienceLevel,
    salaryMinInput,
    freshGraduate,
    noExperience,
    sortBy
  ]);

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

  const handleSearch = (e) => {
    e.preventDefault();
    setDebouncedSearch(searchTerm.trim());
    setDebouncedLocation(location.trim());
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setSearchTerm('');
    setLocation('');
    setDebouncedSearch('');
    setDebouncedLocation('');
    setSelectedLocations([]);
    setSelectedJobTitles([]);
    setSelectedEmploymentTypes([]);
    setSelectedEducationLevels([]);
    setSelectedCompanies([]);
    setSalaryMinInput('');
    setSortBy('');
    setFreshGraduate(false);
    setNoExperience(false);
    setFilters({
      jobType: '',
      industry: '',
      workMode: '',
      minSalary: '',
      maxSalary: '',
      experienceLevel: ''
    });
    setOpenDropdown(null);
  };

  const handleSaveJob = async (job) => {
    try {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      const jobId = job?._id || job?.id;

      if (!token || !userStr) {
        navigate('/login');
        return;
      }

      const parsedUser = JSON.parse(userStr);

      if (parsedUser.role !== 'jobseeker') {
        alert('Only job seekers can save jobs.');
        return;
      }

      if (!jobId) {
        alert('Job data not found.');
        return;
      }

      setSavingJobId(jobId);

      const isSaved = savedJobIds.includes(jobId);

      if (isSaved) {
        const response = await api.delete(`/jobs/saved/${jobId}`);
        if (response.data?.success) {
          setSavedJobIds((prev) => prev.filter((id) => id !== jobId));
          showToast('Saved job removed', 'success');
        } else {
          alert(response.data?.message || 'Failed to remove saved job.');
        }
      } else {
        const response = await api.post(`/jobs/saved/${jobId}`);
        if (response.data?.success) {
          setSavedJobIds((prev) => (prev.includes(jobId) ? prev : [...prev, jobId]));
          showToast('Saved job', 'success');
        } else {
          alert(response.data?.message || 'Failed to save job.');
        }
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to update saved job.');
    } finally {
      setSavingJobId('');
    }
  };

  const handleApplyClick = (job) => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    const jobId = job?._id || job?.id;

    if (!token || !user) {
      alert('Please login to apply for jobs');
      navigate('/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(user);

      if (parsedUser.role !== 'jobseeker') {
        alert('Only job seekers can apply for jobs');
        return;
      }

      const verificationStatus = parsedUser.jobSeekerProfile?.verificationStatus;

      if (verificationStatus !== 'verified') {
        let message = 'Your account is not verified. ';
        if (verificationStatus === 'pending') message += 'Your verification is pending approval from admin.';
        else if (verificationStatus === 'rejected') message += 'Your verification was rejected. Please contact admin.';
        else message += 'Please complete verification before applying.';
        alert(message);
        return;
      }

      if (!job.isActive || !job.isPublished || String(job.status || '').toLowerCase() === 'filled') {
        alert(String(job.status || '').toLowerCase() === 'filled' ? 'The vacancy is already full.' : 'This job is no longer accepting applications');
        return;
      }

      if (job.applicationDeadline && new Date(job.applicationDeadline) < new Date()) {
        alert('Application deadline has passed');
        return;
      }

      if (appliedJobIds.includes(jobId)) {
        showToast('Application already submitted', 'success');
        return;
      }

      setApplyingJob(job);
      setShowApplyModal(true);
    } catch (error) {
      console.error('Error checking user:', error);
      alert('Error checking user information');
    }
  };

  const handleViewJobDetails = (job) => {
    navigate(`/jobseeker/job-details/${job._id || job.id}`);
  };

  const hasActiveFilters =
    searchTerm.trim() ||
    location.trim() ||
    filters.jobType ||
    filters.industry ||
    filters.workMode ||
    filters.minSalary ||
    filters.maxSalary ||
    filters.experienceLevel ||
    sortBy ||
    freshGraduate ||
    noExperience;

  const primaryBtn =
    'px-5 py-2 h-[40px] rounded-xl text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 transition disabled:opacity-60 disabled:cursor-not-allowed disabled:pointer-events-none';

  const ghostLink =
    'text-sm font-medium text-gray-600 hover:text-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-400 inline-flex items-center gap-2 transition';

  const pillBtn =
    'h-[44px] rounded-xl px-4 bg-white border border-[#BFC3C9] text-sm font-medium text-gray-700 flex items-center gap-2 hover:bg-gray-50 transition flex-shrink-0';

  const pillBtnHero =
    'h-[44px] rounded-xl px-4 bg-white/95 border border-white/30 text-sm font-medium text-gray-700 flex items-center gap-2 hover:bg-white transition flex-shrink-0';

  const searchBox =
    'w-full lg:w-auto lg:min-w-[220px] lg:max-w-[370px] lg:flex-1 h-[44px] bg-white/95 border border-white/30 rounded-xl px-4 flex items-center gap-3 shrink transition-all duration-300 ease-in-out focus-within:ring-2 focus-within:ring-blue-200';

  const filterRowClass = 'flex flex-wrap items-center gap-3';

  const renderSkeleton = () => (
    <div className={`grid ${layoutView === 'grid' ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4' : 'grid-cols-1'} gap-6`}>
      {[...Array(layoutView === 'grid' ? 8 : 6)].map((_, index) => (
        <div
          key={index}
          className="rounded-2xl p-7 animate-pulse"
          style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.border}` }}
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-gray-200" />
            <div className="flex-1">
              <div className="h-5 w-3/4 rounded mb-2 bg-gray-200" />
              <div className="h-4 w-1/2 rounded bg-gray-200" />
            </div>
          </div>
          <div className="mt-4 h-24 rounded-xl bg-gray-100" />
          <div className="mt-4 h-5 w-1/2 rounded bg-gray-200" />
          <div className="mt-4 w-full h-px bg-gray-300/80" />
          <div className="mt-5 flex items-center justify-between">
            <div className="h-4 w-24 rounded bg-gray-200" />
            <div className="h-10 w-28 rounded bg-gray-200" />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <JobSeekerLayout>
      <div className="min-h-screen bg-slate-50">
        <div className="-mt-10 pb-12">
          <div className="max-w-[1500px] mx-auto px-3 lg:px-4 2xl:px-6">
         {toast.show && (
  <div className="fixed top-[100px] left-1/2 -translate-x-1/2 z-[9999] pointer-events-none">
    <div className="inline-flex items-center gap-2 rounded-xl border border-green-200 bg-green-100 px-5 py-3 text-sm font-semibold text-green-700 shadow-lg">
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
      </svg>
      <span>{toast.message}</span>
    </div>
  </div>
)}
            <div className="bg-transparent">
              <form
                onSubmit={handleSearch}
                ref={filterBoxRef}
                className={`
                  relative ${openDropdown ? "z-[1000]" : "z-20"} rounded-[26px] border border-gray-200 p-6 md:p-8
                  shadow-[0_4px_20px_rgba(0,0,0,0.08)]
                  overflow-visible text-white bg-gradient-to-br
                  from-[#061e4e] via-[#244e7f] to-[#52b2db]
                  transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)]
                `}
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
                        'radial-gradient(circle, rgba(46,102,166,0.25) 0%, rgba(46,102,166,0.12) 45%, transparent 75%)'
                    }}
                  />
                </div>

                <img
                  src="/images/findjob.png"
                  alt="Job search illustration"
                  className="
                    pointer-events-none absolute right-[20px] md:right-[40px]
                    top-1/3 -translate-y-1/2 w-34 h-34 md:w-49 md:h-48
                    object-contain opacity-50 mix-blend-soft-light saturate-120 z-0
                  "
                  style={{
                    WebkitMaskImage:
                      'radial-gradient(circle at 35% 50%, rgba(0,0,0,1) 0%, rgba(0,0,0,0.5) 55%, rgba(0,0,0,0) 80%)',
                    maskImage:
                      'radial-gradient(circle at 35% 50%, rgba(0,0,0,1) 0%, rgba(0,0,0,0.5) 55%, rgba(0,0,0,0) 80%)'
                  }}
                />

                <div className="relative z-10">
                  <div className="mb-6">
                    <h1 className="text-[28px] md:text-[30px] font-semibold leading-tight text-white">
                      Job Search
                    </h1>
                    <p className="mt-2 text-[16px] text-blue-100/90">
                      Browse available jobs and apply immediately.
                    </p>
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
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
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
                      pillBtn={pillBtnHero}
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
                      pillBtn={pillBtnHero}
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
                      pillBtn={pillBtnHero}
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
                      pillBtn={pillBtnHero}
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
                      pillBtn={pillBtnHero}
                    />

                    <SalaryDropdown
                      id="salary"
                      label="Salary"
                      value={salaryMinInput}
                      setValue={setSalaryMinInput}
                      openDropdown={openDropdown}
                      setOpenDropdown={setOpenDropdown}
                      pillBtn={pillBtnHero}
                    />

                    <SortDropdown
                      id="sortBy"
                      label="Sort by"
                      value={sortBy}
                      setValue={setSortBy}
                      openDropdown={openDropdown}
                      setOpenDropdown={setOpenDropdown}
                      pillBtn={pillBtnHero}
                    />

                    <FilterCheck
                      label="No Experience Required"
                      checked={noExperience}
                      onChange={(e) => setNoExperience(e.target.checked)}
                      light
                    />

                    <FilterCheck
                      label="Open to Fresh grads"
                      checked={freshGraduate}
                      onChange={(e) => setFreshGraduate(e.target.checked)}
                      light
                    />

                    <FilterCheck
                      label="On-site"
                      checked={filters.workMode === 'On-site'}
                      onChange={() => handleFilterChange('workMode', filters.workMode === 'On-site' ? '' : 'On-site')}
                      light
                    />

                    <FilterCheck
                      label="Blended"
                      checked={filters.workMode === 'Blended'}
                      onChange={() => handleFilterChange('workMode', filters.workMode === 'Blended' ? '' : 'Blended')}
                      light
                    />

                    <FilterCheck
                      label="Remote"
                      checked={filters.workMode === 'Remote'}
                      onChange={() => handleFilterChange('workMode', filters.workMode === 'Remote' ? '' : 'Remote')}
                      light
                    />

                    <FilterCheck
                      label="Work from Home"
                      checked={filters.workMode === 'Work from Home'}
                      onChange={() =>
                        handleFilterChange(
                          'workMode',
                          filters.workMode === 'Work from Home' ? '' : 'Work from Home'
                        )
                      }
                      light
                    />

                    {hasActiveFilters && (
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 h-[40px] px-4 rounded-xl border border-white/30 bg-white/95 text-[15px] font-medium text-[#6B7280] hover:bg-white transition"
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
              </form>
            </div>

            <div className="mt-7">
              {loading ? (
                renderSkeleton()
              ) : filteredJobs.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center shadow-sm">
                            <h3 className="text-lg font-bold text-gray-800">No results found</h3>
                  <p className="mt-2 text-sm text-gray-600">Try adjusting your filters or search terms.</p>

                  <div className="mt-5 flex items-center justify-center gap-3">
                    {hasActiveFilters && (
                      <button
                        className="px-4 py-2 rounded-xl text-sm font-semibold border border-gray-300 text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-400 transition"
                        onClick={clearFilters}
                      >
                        Clear filters
                      </button>
                    )}

                    <button
                      className="px-4 py-2 rounded-xl text-sm font-semibold border border-gray-300 text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-400 transition"
                      onClick={fetchJobs}
                    >
                      Refresh
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className={`grid ${layoutView === 'grid' ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4' : 'grid-cols-1'} gap-6`}>
                  {visibleJobs.map((job) => {
                    const jobId = job._id || job.id;

                    const experienceBadgeLabel = getExperienceBadgeLabel(job.experienceLevel);
                    const tagFreshGrad = isFreshGraduateJob(job);

                    const wmSource = job.workMode || job.workArrangement || job.workSetup || job.setup || '';
                    const wmLabel = normalizeWorkModeLabel(wmSource);

                    const tagBlended = wmLabel === 'Blended';
                    const tagOnsite = wmLabel === 'On-site';
                    const tagRemote = wmLabel === 'Remote';
                    const tagWFH = wmLabel === 'Work from Home';
                    const isSaved = savedJobIds.includes(jobId);
                    const hasApplied = appliedJobIds.includes(jobId);
                  const isFilled = String(job.status || '').toLowerCase() === 'filled';
                  const isJobClosed = job.isActive === false || job.isPublished === false || isFilled;

                    return (
                      <div
                      key={jobId}
                      className="group relative overflow-visible rounded-[22px] p-5 bg-white shadow-[0_6px_18px_rgba(0,0,0,0.045)] hover:shadow-[0_14px_34px_rgba(33,44,97,0.13)] hover:-translate-y-0.5 transition-all duration-200 flex flex-col min-h-[350px]"
                      style={{ border: `1px solid ${COLORS.border}` }}
                    >
                      {job.isUrgent ? (
                        <img
                          src="/images/gentneeded.png"
                          alt="Urgent Hiring"
                          draggable="false"
                         className={`pointer-events-none absolute -top-[48px] -left-[50px] z-10 w-[230px] max-w-none select-none transition-opacity ${openDropdown ? "invisible opacity-0" : "visible opacity-100"}`}
                        />
                      ) : null}

                        <button
                          type="button"
                          onClick={() => handleSaveJob(job)}
                          disabled={savingJobId === jobId}
                          className={`absolute top-5 right-5 h-10 w-10 rounded-xl  flex items-center justify-center transition ${
                            isSaved
                              ? '  hover:bg-blue-100'
                              : '  hover:bg-gray-50'
                          }`}
                          aria-label={`${isSaved ? 'Remove saved' : 'Save'} ${job.title || 'job'}`}
                          title={isSaved ? 'Remove Saved Job' : 'Save Job'}
                        >
                          {isSaved ? (
                            <svg
                              className="w-5 h-5 text-blue-700"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                              aria-hidden="true"
                            >
                              <path d="M6 4.75A2.75 2.75 0 018.75 2h6.5A2.75 2.75 0 0118 4.75V21a.75.75 0 01-1.154.638L12 18.58l-4.846 3.058A.75.75 0 016 21V4.75z" />
                            </svg>
                          ) : (
                            <svg
                              className="w-5 h-5 text-gray-700"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              aria-hidden="true"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="1.8"
                                d="M17 21l-5-3-5 3V5a2 2 0 012-2h6a2 2 0 012 2v16z"
                              />
                            </svg>
                          )}
                        </button>

                        <div className="flex items-start gap-4 pr-12">
                          <div className="w-12 h-12 rounded-[14px] overflow-hidden flex-shrink-0 border border-gray-200 bg-white">
                            {job.companyLogo ? (
                              <img
                                src={job.companyLogo}
                                alt={job.companyName || 'Company logo'}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className="w-full h-full bg-gray-200" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <h3 className="min-w-0 truncate whitespace-nowrap text-lg font-bold text-gray-800 leading-snug">
                              {String(job.title || 'Job Title').replaceAll('"', '')}
                            </h3>

                            <div className="mt-1 flex items-center gap-2 min-w-0">
                              <span className="text-sm font-medium text-gray-600 truncate">
                                {job.companyName || 'Company'}
                              </span>
                              <img
                                src="/images/checkmo.png"
                                alt="Verified"
                                className="w-5 h-5 object-contain flex-shrink-0"
                                draggable="false"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 rounded-xl p-4" style={{ backgroundColor: COLORS.mutedBox }}>
                          <div className="flex items-center gap-2 text-sm text-gray-700 min-w-0">
                            <svg
                              className="w-4 h-4 text-gray-600 flex-shrink-0"
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
                            <span className="min-w-0 flex-1 truncate">{formatLocationDisplay(job.location)}</span>
                          </div>

                          <div className="mt-2 flex items-center gap-2 text-sm text-gray-700">
                            <span className="w-4 h-4 text-gray-600 flex flex-shrink-0 items-center justify-center font-extrabold text-[14px] leading-none">
                              ₱
                            </span>
                            <span className="min-w-0 flex-1 truncate">{formatSalary(job.salaryMin, job.salaryMax, job.hideSalary)}</span>
                          </div>

                          <div className="mt-2 flex items-center gap-2 text-sm text-gray-700">
                            <svg
                              className="w-4 h-4 text-gray-600 flex-shrink-0"
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
                            <span className="min-w-0 flex-1 truncate">{job.jobType || 'Full Time Work'}</span>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center gap-2 text-[13px] font-medium text-gray-600">
                          <svg
                            className="w-4 h-4 text-gray-500 flex-shrink-0"
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

                        <div className="mt-4 flex flex-wrap items-center gap-2">

                          {experienceBadgeLabel && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap bg-blue-50 text-[#2e66a6] border border-blue-200">
                              {experienceBadgeLabel}
                            </span>
                          )}

                          {tagBlended && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap bg-blue-50 text-[#2e66a6] border border-blue-200">
                              Blended
                            </span>
                          )}

                          {tagOnsite && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap bg-blue-50 text-[#2e66a6] border border-blue-200">
                              On-site
                            </span>
                          )}

                          {tagRemote && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap bg-blue-50 text-[#2e66a6] border border-blue-200">
                              Remote
                            </span>
                          )}

                          {tagWFH && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap bg-blue-50 text-[#2e66a6] border border-blue-200">
                              Work from Home
                            </span>
                          )}

                          {tagFreshGrad && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap bg-blue-50 text-[#2e66a6] border border-blue-200">
                              Open fresh grad
                            </span>
                          )}
                        </div>

                        <div className="mt-3 w-full h-px bg-gray-300/80" />

                        <div className="pt-4">
                          <button
                            type="button"
                            onClick={() => handleViewJobDetails(job)}
                            disabled={hasApplied || isJobClosed}
                            className={`${primaryBtn} w-full justify-center`}
                            style={{
                              backgroundColor: hasApplied ? '#dbeafe' : isJobClosed ? '#e5e7eb' : COLORS.primary,
                              color: hasApplied ? '#1d4ed8' : isJobClosed ? '#6b7280' : '#ffffff',
                              border: hasApplied ? '1px solid #bfdbfe' : isJobClosed ? '1px solid #d1d5db' : '1px solid transparent'
                            }}
                            onMouseEnter={(e) => {
                              if (!hasApplied && !isJobClosed) e.currentTarget.style.backgroundColor = COLORS.primaryHover;
                            }}
                            onMouseLeave={(e) => {
                              if (!hasApplied && !isJobClosed) e.currentTarget.style.backgroundColor = COLORS.primary;
                            }}
                            onMouseDown={(e) => {
                              if (!hasApplied && !isJobClosed) e.currentTarget.style.backgroundColor = COLORS.primaryActive;
                            }}
                            onMouseUp={(e) => {
                              if (!hasApplied && !isJobClosed) e.currentTarget.style.backgroundColor = COLORS.primaryHover;
                            }}
                            aria-disabled={hasApplied || isJobClosed}
                            title={hasApplied ? 'You already applied for this job' : isFilled ? 'The vacancy is already full' : isJobClosed ? 'This job is no longer accepting applications' : 'Open job details to apply'}
                          >
                            {hasApplied ? 'Already Applied' : isFilled ? 'Vacancy Full' : isJobClosed ? 'Closed' : 'Apply Now'}
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
                      className="inline-flex min-w-[190px] items-center justify-center gap-2 rounded-xl border border-[#2e66a6] bg-white px-6 py-3 text-sm font-semibold text-[#2e66a6] transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loadingMoreJobs && (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#2e66a6] border-r-transparent" />
                      )}
                      {loadingMoreJobs ? 'Loading jobs...' : 'View More Jobs'}
                    </button>
                  </div>
                )}
                </>
              )}
            </div>
          </div>
        </div>

        <ApplyJobModal
          isOpen={showApplyModal}
          onClose={() => {
            setShowApplyModal(false);
            setApplyingJob(null);
          }}
          job={applyingJob}
          onApplicationSubmitted={() => {
            const appliedJobId = applyingJob?._id || applyingJob?.id;

            if (appliedJobId) {
              setAppliedJobIds((prev) => (prev.includes(appliedJobId) ? prev : [...prev, appliedJobId]));
            }

            fetchJobs();
            fetchAppliedJobs();
          }}
        />

        <style>{`
          input:focus,
          textarea:focus,
          select:focus {
            outline: none;
          }
        `}</style>
      </div>
    </JobSeekerLayout>
  );
};

export default JobSearch;