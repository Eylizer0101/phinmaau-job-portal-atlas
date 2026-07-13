import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import EmployerLayout from '../../../layouts/EmployerLayout';
import {
  JOB_TYPES,
  EXPERIENCE_LEVELS,
  EDUCATION_LEVELS,
  WILLING_TO_RELOCATE_OPTIONS,
  PERKS_AND_BENEFITS_OPTIONS
} from '../../../constants/postJobDropdownOptions';

const Alert = ({ type, children }) => {
  const isError = type === 'error';
  const styles = isError
    ? 'border-red-200 bg-red-50 text-red-900'
    : 'border-blue-200 bg-blue-50 text-blue-900';

  return (
    <div
      className={`mb-5 rounded-xl border p-4 text-sm font-medium ${styles}`}
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
    >
      {children}
    </div>
  );
};

const Field = ({ id, label, required, hint, error, children }) => {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  const childWithA11y =
    React.isValidElement(children)
      ? React.cloneElement(children, {
          'aria-describedby': describedBy,
        })
      : children;

  const showHint = Boolean(hint) && !Boolean(error);

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-semibold text-gray-900">
        {label} {required && <span className="text-red-600">*</span>}
      </label>

      {childWithA11y}

      {showHint && (
        <p id={hintId} className="text-xs text-gray-500 leading-5">
          {hint}
        </p>
      )}

      {error && (
        <p id={errorId} className="text-xs font-medium text-red-600 leading-5">
          {error}
        </p>
      )}
    </div>
  );
};


const DEFAULT_MAP_CENTER = { lat: 14.5995, lng: 120.9842 };

const toCoordinate = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const createPinIcon = () => {
  return L.divIcon({
    className: 'agapay-leaflet-pin',
    html: '<div style="width:28px;height:28px;border-radius:999px;background:#2563eb;border:3px solid white;box-shadow:0 6px 14px rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center;"><div style="width:8px;height:8px;border-radius:999px;background:white;"></div></div>',
    iconSize: [28, 28],
    iconAnchor: [14, 28],
  });
};

const LocationMapPicker = ({ value, latitude, longitude, onChange, disabled, error, placeholder }) => {
  const mapElRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const debounceRef = useRef(null);
  const [query, setQuery] = useState(value || '');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [status, setStatus] = useState('');

  const lat = toCoordinate(latitude);
  const lng = toCoordinate(longitude);
  const hasCoordinates = lat !== null && lng !== null;

  const updateMarker = useCallback((nextLat, nextLng, shouldZoom = true) => {
    if (!mapRef.current) return;

    const nextPoint = [nextLat, nextLng];

    if (!markerRef.current) {
      markerRef.current = L.marker(nextPoint, {
        draggable: !disabled,
        icon: createPinIcon(),
      }).addTo(mapRef.current);

      markerRef.current.on('dragend', async () => {
        const point = markerRef.current.getLatLng();
        await reverseLookup(point.lat, point.lng);
      });
    } else {
      markerRef.current.setLatLng(nextPoint);
    }

    if (shouldZoom) {
      mapRef.current.setView(nextPoint, 16);
    }
  }, [disabled]);

  const reverseLookup = useCallback(async (nextLat, nextLng) => {
    const roundedLat = Number(nextLat.toFixed(6));
    const roundedLng = Number(nextLng.toFixed(6));

    setStatus('Getting address...');

    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${roundedLat}&lon=${roundedLng}&accept-language=en`;
      const response = await fetch(url);
      const data = await response.json();
      const address = data?.display_name || `${roundedLat}, ${roundedLng}`;

      setQuery(address);
      setResults([]);
      setStatus('Exact map location selected.');
      onChange({ address, lat: roundedLat, lng: roundedLng });
      updateMarker(roundedLat, roundedLng, false);
    } catch (err) {
      const fallbackAddress = `${roundedLat}, ${roundedLng}`;
      setQuery(fallbackAddress);
      setResults([]);
      setStatus('Location selected. Address lookup failed, but coordinates are saved.');
      onChange({ address: fallbackAddress, lat: roundedLat, lng: roundedLng });
      updateMarker(roundedLat, roundedLng, false);
    }
  }, [onChange, updateMarker]);

  const searchLocation = useCallback(async (searchText) => {
    const clean = String(searchText || '').trim();
    if (clean.length < 3) {
      setResults([]);
      return;
    }

    setSearching(true);
    setStatus('Searching location...');

    try {
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&countrycodes=ph&accept-language=en&q=${encodeURIComponent(clean)}`;
      const response = await fetch(url);
      const data = await response.json();
      setResults(Array.isArray(data) ? data : []);
      setStatus(Array.isArray(data) && data.length ? 'Choose a result below or click the map.' : 'No result found. Try a more specific address.');
    } catch (err) {
      setResults([]);
      setStatus('Search failed. You can still click the map to set the pin.');
    } finally {
      setSearching(false);
    }
  }, []);

  const handlePickResult = useCallback((item) => {
    const nextLat = Number(item.lat);
    const nextLng = Number(item.lon);
    if (!Number.isFinite(nextLat) || !Number.isFinite(nextLng)) return;

    const address = item.display_name || `${nextLat}, ${nextLng}`;
    const roundedLat = Number(nextLat.toFixed(6));
    const roundedLng = Number(nextLng.toFixed(6));

    setQuery(address);
    setResults([]);
    setStatus('Exact map location selected.');
    onChange({ address, lat: roundedLat, lng: roundedLng });
    updateMarker(roundedLat, roundedLng, true);
  }, [onChange, updateMarker]);

  useEffect(() => {
    if (!mapElRef.current || mapRef.current) return;

    const startLat = hasCoordinates ? lat : DEFAULT_MAP_CENTER.lat;
    const startLng = hasCoordinates ? lng : DEFAULT_MAP_CENTER.lng;

    mapRef.current = L.map(mapElRef.current, {
      center: [startLat, startLng],
      zoom: hasCoordinates ? 16 : 12,
      scrollWheelZoom: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(mapRef.current);

    mapRef.current.on('click', async (e) => {
      if (disabled) return;
      await reverseLookup(e.latlng.lat, e.latlng.lng);
    });

    if (hasCoordinates) {
      updateMarker(lat, lng, false);
    }

    setTimeout(() => mapRef.current?.invalidateSize(), 250);

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (hasCoordinates) {
      updateMarker(lat, lng, false);
    }
  }, [hasCoordinates, lat, lng, updateMarker]);

  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      searchLocation(query);
    }, 550);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query, searchLocation]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <input
          id="location"
          name="location"
          value={query}
          disabled={disabled}
          onChange={(e) => {
            const nextValue = e.target.value;
            setQuery(nextValue);
            onChange({ address: nextValue, lat: latitude || '', lng: longitude || '' });
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              searchLocation(query);
            }
          }}
          aria-invalid={!!error}
          className={`w-full rounded-xl border px-4 py-3 text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:border-[#2e66a6] ${error ? 'border-red-300' : 'border-gray-300'} ${disabled ? 'bg-gray-50 opacity-70 cursor-not-allowed' : ''}`}
          placeholder={placeholder || 'Search address or place name'}
          autoComplete="off"
        />

        {results.length > 0 && !disabled && (
          <div className="absolute left-0 right-0 top-full z-[1000] mt-2 max-h-64 overflow-auto rounded-2xl border border-gray-200 bg-white shadow-lg">
            {results.map((item) => (
              <button
                key={`${item.place_id}-${item.lat}-${item.lon}`}
                type="button"
                onClick={() => handlePickResult(item)}
                className="flex w-full items-start gap-2 border-b border-gray-100 px-4 py-3 text-left text-sm text-gray-700 hover:bg-blue-50 last:border-b-0"
              >
                <span className="mt-0.5 text-[#2e66a6]">●</span>
                <span>{item.display_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div ref={mapElRef} className="h-[310px] w-full" />
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-900">
        Search a location, choose a result, or click/drag the pin on the map to set the exact work location.
      </div>

      <div className="grid grid-cols-1 gap-3 text-xs text-gray-600 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white px-3 py-2">
          Latitude: <span className="font-semibold text-gray-900">{latitude || 'Not selected'}</span>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white px-3 py-2">
          Longitude: <span className="font-semibold text-gray-900">{longitude || 'Not selected'}</span>
        </div>
      </div>

      <p className="text-xs text-gray-500" aria-live="polite">
        {searching ? 'Searching...' : status || 'OpenStreetMap is free and does not require an API key.'}
      </p>
    </div>
  );
};

const getLocalISODate = (d = new Date()) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const addDaysLocalISO = (days) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return getLocalISODate(d);
};

const normalizeExperienceLevel = (level) => {
  return String(level || '').trim();
};

const normalizeCategory = (industry) => {
  const v = String(industry || '').trim();
  if (!v) return 'Others';
  if (v === 'Other') return 'Others';
  if (v === 'Others') return 'Others';
  return v;
};


const hasUsableCoordinates = (latValue, lngValue) => {
  const lat = Number(latValue);
  const lng = Number(lngValue);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (Math.abs(lat) < 0.0001 && Math.abs(lng) < 0.0001) return false;
  return true;
};

const geocodeAddressIfNeeded = async ({ address, lat, lng }) => {
  const cleanAddress = String(address || '').trim();

  if (hasUsableCoordinates(lat, lng)) {
    return { address: cleanAddress, lat, lng };
  }

  if (!cleanAddress) {
    return { address: cleanAddress, lat: '', lng: '' };
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=ph&accept-language=en&q=${encodeURIComponent(cleanAddress)}`;
    const response = await fetch(url);
    const data = await response.json();
    const first = Array.isArray(data) ? data[0] : null;
    const nextLat = Number(first?.lat);
    const nextLng = Number(first?.lon);

    if (Number.isFinite(nextLat) && Number.isFinite(nextLng)) {
      return {
        address: first?.display_name || cleanAddress,
        lat: Number(nextLat.toFixed(6)),
        lng: Number(nextLng.toFixed(6)),
      };
    }
  } catch {
    // Keep typed address even if lookup fails.
  }

  return { address: cleanAddress, lat: '', lng: '' };
};

const PostJob = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState({});

  const getStoredUser = useCallback(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
      return null;
    }
  }, []);

  const [storedUser, setStoredUser] = useState(() => getStoredUser());

  useEffect(() => {
    const fetchCurrentEmployer = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('https://phinmaau-job-portal-atlas.onrender.com/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });

        const user = response.data?.user;
        if (response.data?.success && user) {
          localStorage.setItem('user', JSON.stringify(user));
          setStoredUser(user);
        }
      } catch (err) {
        console.error('Unable to refresh employer profile:', err);
        setStoredUser(getStoredUser());
      }
    };

    fetchCurrentEmployer();
  }, [getStoredUser]);

  const isCompanyProfileComplete = useMemo(() => {
    const p = storedUser?.employerProfile || {};

    return Boolean(
      String(p.companyName || '').trim() &&
        String(p.businessEmail || '').trim() &&
        String(p.mobileNumber || '').trim() &&
        String(p.regionCity || '').trim() &&
        String(p.industry || '').trim() &&
        String(p.companyAddress || '').trim() &&
        String(p.companyDescription || '').trim() &&
        String(p.companyLogo || '').trim()
    );
  }, [storedUser]);

  const companyLocationFromProfile =
    String(storedUser?.employerProfile?.companyAddress || '').trim() || 'Company location';

  const companyCategoryDefault = normalizeCategory(storedUser?.employerProfile?.industry);

  const verificationStatus =
    storedUser?.employerProfile?.verificationDocs?.overallStatus || 'unverified';
  const isEmployerVerified = verificationStatus === 'verified' || storedUser?.isVerified === true;

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    requirements: '',
    jobType: 'Full-time',
    salaryMin: '',
    salaryMax: '',
    hideSalary: false,
    isUrgent: false,
    workMode: 'On-site',
    applicationDeadline: '',
    vacancies: '1',
    skillsRequired: '',
    experienceLevel: 'No experience required',
    location: '',
    educationLevel: "Bachelor / College degree graduate's",

    openToFreshGraduates: false,
    perksAndBenefits: [],
    otherBenefits: '',
    willingToRelocate: 'No - position is fixed location',
    locationLatitude: '',
    locationLongitude: '',
  });

  const [locationImageFile, setLocationImageFile] = useState(null);
  const [locationImagePreview, setLocationImagePreview] = useState('');

  const jobTypes = JOB_TYPES;
  const workModes = ['On-site', 'Remote', 'Blended', 'Work from Home'];
  const experienceLevels = EXPERIENCE_LEVELS;
  const educationLevels = EDUCATION_LEVELS;
  const willingToRelocateOptions = WILLING_TO_RELOCATE_OPTIONS;
  const perksAndBenefitsOptions = PERKS_AND_BENEFITS_OPTIONS;

  const minDeadlineISO = useMemo(() => addDaysLocalISO(1), []);

  const markTouched = useCallback((name) => {
    setTouched((prev) => ({ ...prev, [name]: true }));
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (type === 'checkbox' && name === 'openToFreshGraduates') {
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (name === 'experienceLevel') {
      setFormData(prev => ({ ...prev, [name]: normalizeExperienceLevel(value) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    setError('');
    setSuccess('');
  };

  const handlePerkToggle = (perk) => {
    setFormData((prev) => {
      const exists = prev.perksAndBenefits.includes(perk);
      return {
        ...prev,
        perksAndBenefits: exists
          ? prev.perksAndBenefits.filter((item) => item !== perk)
          : [...prev.perksAndBenefits, perk],
      };
    });
    setError('');
    setSuccess('');
  };

  const handleLocationImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowed.includes(file.type)) {
      setError('Location image must be JPG, JPEG, or PNG only.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Location image must not exceed 5MB.');
      return;
    }

    setLocationImageFile(file);
    setLocationImagePreview(URL.createObjectURL(file));
    setError('');
    setSuccess('');
  };

  const salaryValid = useMemo(() => {
    if (!formData.salaryMin || !formData.salaryMax) return true;
    const min = Number(formData.salaryMin);
    const max = Number(formData.salaryMax);
    if (Number.isNaN(min) || Number.isNaN(max)) return true;
    return min <= max;
  }, [formData.salaryMin, formData.salaryMax]);

  const isDeadlineValid = useMemo(() => {
    if (!formData.applicationDeadline) return false;
    return formData.applicationDeadline >= minDeadlineISO;
  }, [formData.applicationDeadline, minDeadlineISO]);

  const skillsAll = useMemo(() => {
    return (formData.skillsRequired || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
  }, [formData.skillsRequired]);

  const skills = useMemo(() => skillsAll.slice(0, 10), [skillsAll]);
  const skillsCountValid = useMemo(() => skillsAll.length <= 10, [skillsAll.length]);

  const salaryRangeText = useMemo(() => {
    const min = formData.salaryMin ? Number(formData.salaryMin).toLocaleString() : '';
    const max = formData.salaryMax ? Number(formData.salaryMax).toLocaleString() : '';
    if (!min && !max) return 'Salary not specified';
    if (min && !max) return `₱${min}`;
    if (!min && max) return `Up to ₱${max}`;
    return `₱${min} – ₱${max}`;
  }, [formData.salaryMin, formData.salaryMax]);

  const requiredOk = useMemo(() => {
    return (
      formData.title.trim() &&
      formData.description.trim().length >= 80 &&
      formData.requirements.trim().length >= 40 &&
      formData.location.trim() &&
      isDeadlineValid &&
      salaryValid &&
      skillsCountValid
    );
  }, [formData, isDeadlineValid, salaryValid, skillsCountValid]);

  const fieldErrors = useMemo(() => {
    const errors = {};

    if ((touched.title || submitted) && !formData.title.trim()) {
      errors.title = 'Job title is required.';
    }

    if ((touched.description || submitted) && formData.description.trim().length > 0 && formData.description.trim().length < 80) {
      errors.description = 'Job description must be at least 80 characters.';
    }
    if ((touched.description || submitted) && submitted && !formData.description.trim()) {
      errors.description = 'Job description is required.';
    }

    if ((touched.requirements || submitted) && formData.requirements.trim().length > 0 && formData.requirements.trim().length < 40) {
      errors.requirements = 'Requirements must be at least 40 characters.';
    }
    if ((touched.requirements || submitted) && submitted && !formData.requirements.trim()) {
      errors.requirements = 'Job requirements are required.';
    }

    if ((touched.location || submitted) && !formData.location.trim()) {
      errors.location = 'Location (City) is required.';
    }

    if ((touched.experienceLevel || submitted) && !EXPERIENCE_LEVELS.includes(String(formData.experienceLevel || '').trim())) {
      errors.experienceLevel = 'Please select a valid experience requirement.';
    }

    if ((touched.salaryMin || touched.salaryMax || submitted) && !salaryValid) {
      errors.salary = 'Minimum salary must be ≤ maximum salary.';
    }

    if ((touched.applicationDeadline || submitted) && submitted && !formData.applicationDeadline) {
      errors.applicationDeadline = 'Application deadline is required.';
    } else if ((touched.applicationDeadline || submitted) && formData.applicationDeadline && !isDeadlineValid) {
      errors.applicationDeadline = 'Application deadline must be in the future.';
    }

    if ((touched.skillsRequired || submitted) && !skillsCountValid) {
      errors.skillsRequired = `Please limit skills to 10. You entered ${skillsAll.length}.`;
    }

    if ((touched.locationImage || submitted) && locationImageFile) {
      const allowed = ['image/jpeg', 'image/jpg', 'image/png'];
      if (!allowed.includes(locationImageFile.type)) {
        errors.locationImage = 'Location image must be JPG, JPEG, or PNG only.';
      }
    }

    return errors;
  }, [formData, touched, submitted, salaryValid, isDeadlineValid, skillsCountValid, skillsAll.length, locationImageFile]);

  const validateForPublish = () => {
    if (!formData.title.trim()) return 'Job title is required';
    if (!formData.description.trim()) return 'Job description is required';
    if (formData.description.trim().length < 80) return 'Job description must be at least 80 characters';
    if (!formData.requirements.trim()) return 'Job requirements are required';
    if (formData.requirements.trim().length < 40) return 'Requirements must be at least 40 characters';
    if (!formData.location.trim()) return 'Location (City) is required';
    if (!formData.applicationDeadline) return 'Application deadline is required';
    if (!isDeadlineValid) return 'Application deadline must be in the future';
    if (!salaryValid) return 'Minimum salary cannot be greater than maximum salary';
    if (!skillsCountValid) return 'Skills must be 10 or fewer';

    const exp = normalizeExperienceLevel(formData.experienceLevel);
    if (!EXPERIENCE_LEVELS.includes(exp)) return 'Invalid experience level';

    const edu = String(formData.educationLevel || '').trim();
    if (!edu) return 'Education level is required';
    if (!EDUCATION_LEVELS.includes(edu)) return 'Invalid education level';

    const relocate = String(formData.willingToRelocate || '').trim();
    if (relocate && !WILLING_TO_RELOCATE_OPTIONS.includes(relocate)) return 'Invalid relocate option';

    if (locationImageFile) {
      const allowed = ['image/jpeg', 'image/jpg', 'image/png'];
      if (!allowed.includes(locationImageFile.type)) return 'Location image must be JPG, JPEG, or PNG only';
    }

    const employerIndustry = normalizeCategory(storedUser?.employerProfile?.industry);
    if (!employerIndustry) return 'Please set your company industry first.';

    return '';
  };

  const postJob = async ({ isDraft }) => {
    const token = localStorage.getItem('token');

    const normalizedSkillsString = skills.join(', ');
    const normalizedExperienceLevel = normalizeExperienceLevel(formData.experienceLevel);

    const payload = new FormData();
    payload.append('title', formData.title);
    payload.append('description', formData.description);
    payload.append('requirements', formData.requirements);
    payload.append('jobType', formData.jobType);
    payload.append('salaryMin', formData.salaryMin);
    payload.append('salaryMax', formData.salaryMax);
    payload.append('hideSalary', String(Boolean(formData.hideSalary)));
    payload.append('isUrgent', String(Boolean(formData.isUrgent)));
    payload.append('workMode', formData.workMode);
    payload.append('applicationDeadline', formData.applicationDeadline);
    payload.append('vacancies', formData.vacancies);
    payload.append('skillsRequired', normalizedSkillsString);
    payload.append('experienceLevel', normalizedExperienceLevel);
    payload.append('status', isDraft ? 'draft' : 'published');
    payload.append('category', companyCategoryDefault);
    payload.append('location', String(formData.location || '').trim());
    payload.append('educationLevel', String(formData.educationLevel || '').trim());

    payload.append('openToFreshGraduates', String(formData.openToFreshGraduates));
    payload.append('otherBenefits', String(formData.otherBenefits || '').trim());
    payload.append('willingToRelocate', String(formData.willingToRelocate || '').trim());
    payload.append('perksAndBenefits', JSON.stringify(formData.perksAndBenefits || []));

    payload.append('locationLatitude', String(formData.locationLatitude || ''));
    payload.append('locationLongitude', String(formData.locationLongitude || ''));

    if (locationImageFile) {
      payload.append('locationImage', locationImageFile);
    }

    return axios.post('https://phinmaau-job-portal-atlas.onrender.com/api/jobs', payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
    });
  };

  const handleSaveDraft = async () => {
    setSavingDraft(true);
    setError('');
    setSuccess('');
    try {
      await postJob({ isDraft: true });
      setSuccess('Draft saved!');
      setTimeout(() => setSuccess(''), 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save draft. Please try again.');
    } finally {
      setSavingDraft(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    setLoading(true);
    setError('');
    setSuccess('');

    if (!isCompanyProfileComplete) {
      setError('You have not yet completed your company profile. A complete company profile is required to post a job.');
      setLoading(false);
      return;
    }

    if (!isEmployerVerified) {
      setError('Your company is not verified yet. You can save drafts, but you can’t publish until verified.');
      setLoading(false);
      return;
    }

    const msg = validateForPublish();
    if (msg) {
      setError('Please fix the highlighted fields.');
      setLoading(false);
      return;
    }

    try {
      const response = await postJob({ isDraft: false });
      if (response.data?.success) {
        navigate('/employer/manage-jobs', {
          state: { jobPostSuccess: true, successType: 'post' },
        });
      } else {
        setError(response.data?.message || 'Failed to post job');
      }
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Session expired. Please login again.');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setTimeout(() => navigate('/employer/login'), 1200);
      } else if (err.response?.status === 403) {
        if (err.response?.data?.code === 'COMPANY_PROFILE_INCOMPLETE') {
          setError(err.response?.data?.message || 'You have not yet completed your company profile.');
        } else if (err.response?.data?.code === 'EMPLOYER_NOT_VERIFIED') {
          setError(err.response?.data?.message || 'Your company is not verified yet.');
        } else {
          setError('Only employers can post jobs.');
        }
      } else {
        setError(err.response?.data?.message || 'Failed to post job. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const descLen = formData.description.trim().length;
  const reqLen = formData.requirements.trim().length;

  const showDescCounterRed = (touched.description || submitted) && descLen > 0 && descLen < 80;
  const showReqCounterRed = (touched.requirements || submitted) && reqLen > 0 && reqLen < 40;

  const stickyStyle = {
    paddingLeft: 'var(--employer-sidebar-width, 0px)',
  };

  return (
    <EmployerLayout>
      <div className="min-h-screen bg-gray-50 -mt-2">
        <div className="mx-auto max-w-7xl px-1 py-8">
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-[33px] leading-[40px] font-semibold text-gray-900">Post a Job</h1>
              <p className="text-gray-600">Create a job post that attracts the right candidates.</p>

              {!isCompanyProfileComplete && (
                <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4">
                  <p className="text-sm font-semibold text-blue-900">
                    Complete company profile required
                  </p>
                  <p className="mt-1 text-sm text-blue-800">
                    You have not yet completed your company profile. A complete company profile is required to post a job.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate('/employer/company-profile')}
                    className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#075fc8] px-4 py-2 text-sm font-semibold text-white hover:bg-[#064da3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                  >
                    Go to Company Profile
                  </button>
                </div>
              )}

              {isCompanyProfileComplete && !isEmployerVerified && (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-semibold text-amber-900">
                    Verification required to publish
                  </p>
                  <p className="mt-1 text-sm text-amber-800">
                    Status: <span className="font-bold">{verificationStatus}</span>. You can save drafts anytime, but publishing is disabled until verified.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate('/employer/company-profile')}
                    className="mt-3 inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
                  >
                    Go to Company Profile
                  </button>
                </div>
              )}
            </div>
          </div>

          {error && <Alert type="error">{error}</Alert>}
          {success && <Alert type="success">{success}</Alert>}

          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="lg:col-span-12">
              <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-200 px-6 py-5">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">Job information</h2>
                      <p className="text-sm text-gray-500">Keep it clear and specific.</p>
                    </div>
                  </div>
                </div>

                <div className="px-6 py-6">
                  <div className="mx-auto w-full max-w-5xl space-y-10">
                    <section className="space-y-5">
                      <h3 className="text-base font-bold text-gray-900">Basics</h3>

                      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                        <div className="md:col-span-2">
                          <Field
                            id="title"
                            label="Job Title "
                            error={fieldErrors.title}
                          >
                            <input
                              id="title"
                              name="title"
                              value={formData.title}
                              onChange={handleChange}
                              onBlur={() => markTouched('title')}
                              aria-invalid={!!fieldErrors.title}
                              className={`w-full rounded-xl border px-4 py-3 text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:border-[#2e66a6] ${
                                fieldErrors.title ? 'border-red-300' : 'border-gray-300'
                              }`}
                              placeholder="e.g., Junior Web Developer"
                              required
                            />
                          </Field>
                          <label className="mt-4 flex items-start gap-3 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(formData.isUrgent)}
                              onChange={(e) => setFormData((prev) => ({ ...prev, isUrgent: e.target.checked }))}
                              className="mt-1 h-4 w-4 accent-orange-500"
                            />
                            <span>
                              <span className="block text-sm font-semibold text-gray-900">Urgently Needed</span>
                              <span className="block text-xs leading-5 text-gray-500">
                                Show an Urgently Needed badge with the fire icon on job cards.
                              </span>
                            </span>
                          </label>

                        </div>

                        <Field id="jobType" label="Employment Type">
                          <select
                            id="jobType"
                            name="jobType"
                            value={formData.jobType}
                            onChange={handleChange}
                            onBlur={() => markTouched('jobType')}
                            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:border-[#2e66a6]"
                          >
                            {jobTypes.map(type => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </select>
                        </Field>

                        <Field id="workMode" label="Work Mode">
                          <select
                            id="workMode"
                            name="workMode"
                            value={formData.workMode}
                            onChange={handleChange}
                            onBlur={() => markTouched('workMode')}
                            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:border-[#2e66a6]"
                          >
                            {workModes.map(m => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </select>
                        </Field>

                        <div className="md:col-span-2">
                          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                            <Field id="vacancies" label="Vacancies">
                              <input
                                id="vacancies"
                                type="number"
                                name="vacancies"
                                value={formData.vacancies}
                                onChange={handleChange}
                                onBlur={() => markTouched('vacancies')}
                                min="1"
                                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:border-[#2e66a6]"
                                required
                              />
                            </Field>

                            <Field
                              id="applicationDeadline"
                              label="Application Deadline"
                            
                              error={fieldErrors.applicationDeadline}
                            >
                              <input
                                id="applicationDeadline"
                                type="date"
                                name="applicationDeadline"
                                value={formData.applicationDeadline}
                                onChange={handleChange}
                                onBlur={() => markTouched('applicationDeadline')}
                                min={minDeadlineISO}
                                aria-invalid={!!fieldErrors.applicationDeadline}
                                className={`w-full rounded-xl border px-4 py-3 text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:border-[#2e66a6] ${
                                  fieldErrors.applicationDeadline ? 'border-red-300' : 'border-gray-300'
                                }`}
                                required
                              />
                            </Field>
                          </div>
                        </div>
                      </div>
                    </section>

                    <div className="border-t border-gray-100" />

                    <section className="space-y-5">
                      <div className="flex items-end justify-between">
                        <h3 className="text-base font-bold text-gray-900">Salary Range</h3>
                        <span className="text-gray-400 font-semibold">(optional)</span>
                      </div>

                      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                        <Field id="salaryMin" label="Minimum Salary">
                          <div className="relative">
                            <span className="absolute left-3 top-3 text-gray-500">₱</span>
                            <input
                              id="salaryMin"
                              type="number"
                              name="salaryMin"
                              value={formData.salaryMin}
                              onChange={handleChange}
                              onBlur={() => markTouched('salaryMin')}
                              className={`w-full rounded-xl border px-4 py-3 pl-8 text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:border-[#2e66a6] ${
                                fieldErrors.salary ? 'border-red-300' : 'border-gray-300'
                              }`}
                              placeholder="Min"
                              min="0"
                            />
                          </div>
                        </Field>

                        <Field id="salaryMax" label="Maximum Salary">
                          <div className="relative">
                            <span className="absolute left-3 top-3 text-gray-500">₱</span>
                            <input
                              id="salaryMax"
                              type="number"
                              name="salaryMax"
                              value={formData.salaryMax}
                              onChange={handleChange}
                              onBlur={() => markTouched('salaryMax')}
                              className={`w-full rounded-xl border px-4 py-3 pl-8 text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:border-[#2e66a6] ${
                                fieldErrors.salary ? 'border-red-300' : 'border-gray-300'
                              }`}
                              placeholder="Max"
                              min="0"
                            />
                          </div>
                        </Field>
                      </div>

                      {fieldErrors.salary && (
                        <p className="text-sm font-medium text-red-600">{fieldErrors.salary}</p>
                      )}
                    </section>

                    
                      <label className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(formData.hideSalary)}
                          onChange={(e) => setFormData((prev) => ({ ...prev, hideSalary: e.target.checked }))}
                          className="mt-1 h-4 w-4 accent-[#2e66a6]"
                        />
                        <span>
                          <span className="block text-sm font-semibold text-gray-900">Hide salary from jobseekers</span>
                          <span className="block text-xs leading-5 text-gray-500">
                            Job cards will show “Salary Undisclosed” instead of the salary range.
                          </span>
                        </span>
                      </label>


                    <div className="border-t border-gray-100" />

                    <section className="space-y-5">
                      <h3 className="text-base font-bold text-gray-900">Applicant Requirements</h3>

                      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">Open to Fresh Graduates</p>
                            <p className="text-xs text-gray-500">
                              Only candidates with the required experience and credentials for this position may apply.
                            </p>
                          </div>

                          <label className="relative inline-flex cursor-pointer items-center">
                            <input
                              type="checkbox"
                              name="openToFreshGraduates"
                              checked={formData.openToFreshGraduates}
                              onChange={handleChange}
                              onBlur={() => markTouched('openToFreshGraduates')}
                              className="peer sr-only"
                            />
                            <div className="h-6 w-11 rounded-full bg-gray-300 transition peer-checked:bg-[#2e66a6] after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-5"></div>
                          </label>
                        </div>

                        {formData.openToFreshGraduates && (
                          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                            Fresh graduates are welcome! Candidates will be evaluated based on their resume/CV regardless of high credential requirements.
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                        <Field id="experienceLevel" label="Experience Required" error={fieldErrors.experienceLevel}>
                          <select
                            id="experienceLevel"
                            name="experienceLevel"
                            value={formData.experienceLevel}
                            onChange={handleChange}
                            onBlur={() => markTouched('experienceLevel')}
                            className={`w-full rounded-xl border px-4 py-3 text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:border-[#2e66a6] ${
                              fieldErrors.experienceLevel ? 'border-red-300' : 'border-gray-300'
                            }`}
                          >
                            {experienceLevels.map(level => (
                              <option key={level} value={level}>{level}</option>
                            ))}
                          </select>
                        </Field>

                        <Field id="educationLevel" label="Educational Requirement">
                          <select
                            id="educationLevel"
                            name="educationLevel"
                            value={formData.educationLevel}
                            onChange={handleChange}
                            onBlur={() => markTouched('educationLevel')}
                            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:border-[#2e66a6]"
                          >
                            {educationLevels.map(level => (
                              <option key={level} value={level}>{level}</option>
                            ))}
                          </select>
                        </Field>
                      </div>
                    </section>

                    <div className="border-t border-gray-100" />

                    <section className="space-y-5">
                      <h3 className="text-base font-bold text-gray-900">Job Details</h3>

                      <Field
                        id="description"
                        label="Job Description"
                        error={fieldErrors.description}
                      >
                        <div>
                          <textarea
                            id="description"
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            onBlur={() => markTouched('description')}
                            rows={7}
                            aria-invalid={!!fieldErrors.description}
                            className={`w-full rounded-xl border px-4 py-3 text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:border-[#2e66a6] ${
                              fieldErrors.description ? 'border-red-300' : 'border-gray-300'
                            }`}
                            placeholder="Describe the role, responsibilities, and what a typical day looks like..."
                            required
                          />
                          <div className="flex justify-end">
                           
                          </div>
                        </div>
                      </Field>

                      <Field
                        id="requirements"
                        label="Qualifications"
                        error={fieldErrors.requirements}
                      >
                        <div>
                          <textarea
                            id="requirements"
                            name="requirements"
                            value={formData.requirements}
                            onChange={handleChange}
                            onBlur={() => markTouched('requirements')}
                            rows={6}
                            aria-invalid={!!fieldErrors.requirements}
                            className={`w-full rounded-xl border px-4 py-3 text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:border-[#2e66a6] ${
                              fieldErrors.requirements ? 'border-red-300' : 'border-gray-300'
                            }`}
                            placeholder="List the qualifications, certifications or requirements..."
                            required
                          />
                          <div className="flex justify-end">
                           
                          </div>
                        </div>
                      </Field>
                    </section>

                    <div className="border-t border-gray-100" />

                    <section className="space-y-5">
                      <h3 className="text-base font-bold text-gray-900">Required Skills</h3>

                      <Field
                        id="skillsRequired"
                        label="Required Skills"
                        error={fieldErrors.skillsRequired}
                      >
                        <input
                          id="skillsRequired"
                          name="skillsRequired"
                          value={formData.skillsRequired}
                          onChange={handleChange}
                          onBlur={() => markTouched('skillsRequired')}
                          aria-invalid={!!fieldErrors.skillsRequired}
                          className={`w-full rounded-xl border px-4 py-3 text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:border-[#2e66a6] ${
                            fieldErrors.skillsRequired ? 'border-red-300' : 'border-gray-300'
                          }`}
                          placeholder="Type a skill and separate by comma (e.g., React, Communication, Excel)"
                        />
                      </Field>

                      {skills.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {skills.map((s, idx) => (
                            <span
                              key={`${s}-${idx}`}
                              className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-800"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                    </section>

                    <div className="border-t border-gray-100" />

                    <section className="space-y-5">
                      <h3 className="text-base font-bold text-gray-900">Perks and Benefits</h3>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {perksAndBenefitsOptions.map((perk) => {
                          const active = formData.perksAndBenefits.includes(perk);
                          return (
                            <button
                              key={perk}
                              type="button"
                              onClick={() => handlePerkToggle(perk)}
                              className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
                                active
                                  ? 'border-[#2e66a6] bg-blue-50 text-[#2e66a6] font-semibold'
                                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              {perk}
                            </button>
                          );
                        })}
                      </div>

                      <Field
                        id="otherBenefits"
                        label="Other benefits (type to add)"
                      >
                        <input
                          id="otherBenefits"
                          name="otherBenefits"
                          value={formData.otherBenefits}
                          onChange={handleChange}
                          onBlur={() => markTouched('otherBenefits')}
                          className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:border-[#2e66a6]"
                          placeholder="e.g., Paid Bereavement/Family Leave, Paid leave, Bonuses"
                        />
                      </Field>
                    </section>

                    <div className="border-t border-gray-100" />

                    <section className="space-y-5">
                      <h3 className="text-base font-bold text-gray-900">Additional Details</h3>

                      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                        <Field id="willingToRelocate" label="Willing to Relocate">
                          <select
                            id="willingToRelocate"
                            name="willingToRelocate"
                            value={formData.willingToRelocate}
                            onChange={handleChange}
                            onBlur={() => markTouched('willingToRelocate')}
                            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:border-[#2e66a6]"
                          >
                            {willingToRelocateOptions.map(option => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        </Field>

                        <div className="hidden md:block" />
                      </div>

                      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                        Let applicants know if there's a possibility of relocation for this position. This helps candidates plan ahead.
                      </div>
                    </section>

                    <div className="border-t border-gray-100" />
                    <section className="space-y-5">
                      <h3 className="text-base font-bold text-gray-900">Additional Details</h3>

                      <div className="grid grid-cols-1 gap-5">
                        <Field
                          id="location"
                          label="Location Address / OpenStreetMap"
                          hint="Free map picker powered by OpenStreetMap. Search a place or click the map to set the exact pin."
                          error={fieldErrors.location}
                        >
                          <LocationMapPicker
                            value={formData.location}
                            latitude={formData.locationLatitude}
                            longitude={formData.locationLongitude}
                            error={fieldErrors.location}
                            placeholder={companyLocationFromProfile !== 'Company location' ? companyLocationFromProfile : 'e.g., 123 Rizal Ave, Manila, Metro Manila'}
                            onChange={({ address, lat, lng }) => {
                              setFormData((prev) => ({
                                ...prev,
                                location: address,
                                locationLatitude: lat,
                                locationLongitude: lng,
                              }));
                              markTouched('location');
                              setError('');
                              setSuccess('');
                            }}
                          />
                        </Field>
                      </div>
                    </section>
                  </div>
                </div>
              </div>
            </div>

            <br></br>

            <div
              className="fixed bottom-0 right-0 left-0 lg:left-72 border-t border-gray-200 bg-white/95 backdrop-blur z-40"
              style={stickyStyle}
            >
              <div className="mx-auto max-w-6xl px-4 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-gray-600">
                  {requiredOk ? (
                    <span className="font-semibold text-[#2e66a6]">Ready to publish.</span>
                  ) : (
                    <span>Complete required fields to publish.</span>
                  )}
                  {!isCompanyProfileComplete && (
                    <span className="ml-2 font-semibold text-blue-700">Complete company profile required to publish.</span>
                  )}
                  {isCompanyProfileComplete && !isEmployerVerified && (
                    <span className="ml-2 font-semibold text-amber-700">Verification required to publish.</span>
                  )}
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => navigate('/employer/dashboard')}
                    className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6]"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    disabled={savingDraft}
                    className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6]"
                  >
                    {savingDraft ? 'Saving…' : 'Save Draft'}
                  </button>

                  <button
                    type="submit"
                    disabled={loading || !requiredOk || !isCompanyProfileComplete || !isEmployerVerified}
                    title={!isCompanyProfileComplete ? 'Complete your company profile to publish.' : !isEmployerVerified ? 'Verify your company to publish.' : ''}
                    className="rounded-xl bg-[#2e66a6] px-5 py-2 text-sm font-semibold text-white hover:bg-[#23508a] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6]"
                  >
                    {loading ? 'Publishing…' : !isCompanyProfileComplete ? 'Complete Profile' : isEmployerVerified ? 'Publish Job' : 'Verify to publish'}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </EmployerLayout>
  );
};

export default PostJob;