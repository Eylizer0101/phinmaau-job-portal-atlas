import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import EmployerLayout from '../../../layouts/EmployerLayout';
import {
  JOB_TYPES,
  EXPERIENCE_LEVELS,
  EDUCATION_LEVELS,
  WILLING_TO_RELOCATE_OPTIONS,
  PERKS_AND_BENEFITS_OPTIONS
} from '../../../constants/postJobDropdownOptions';

/* =======================
   UI helpers
======================= */
const Alert = ({ type, children, onClose }) => {
  const isError = type === 'error';
  const styles = isError
    ? 'border-red-200 bg-red-50 text-red-900'
    : 'border-[#2e66a6]/25 bg-[#2e66a6]/10 text-black';

  const ring = isError ? 'focus-visible:ring-red-600' : 'focus-visible:ring-[#2e66a6]';

  return (
    <div
      className={`mb-5 flex items-start justify-between gap-4 rounded-xl border p-4 text-sm font-medium ${styles}`}
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
    >
      <div className="min-w-0">{children}</div>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className={`shrink-0 rounded-lg px-2 py-1 text-xs font-semibold hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 ${ring}`}
          aria-label="Dismiss message"
        >
          Dismiss
        </button>
      )}
    </div>
  );
};

const Field = ({ id, label, required, hint, error, children }) => {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  const isDirectFormControl =
    React.isValidElement(children) &&
    typeof children.type === 'string' &&
    ['input', 'select', 'textarea'].includes(children.type);

  const childWithA11y =
    React.isValidElement(children)
      ? React.cloneElement(children, {
          ...(isDirectFormControl ? { id } : {}),
          'aria-describedby': describedBy,
          ...(isDirectFormControl ? { 'aria-invalid': !!error } : {}),
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

/* =======================
   Date helpers
======================= */

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

const stableStringify = (obj) => JSON.stringify(obj, Object.keys(obj).sort());

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

const parseBooleanLike = (value) => {
  if (typeof value === 'boolean') return value;
  const normalized = String(value || '').trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on';
};

const normalizePerksAndBenefits = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item).trim()).filter(Boolean);
      }
    } catch {
      return value.split(',').map((item) => item.trim()).filter(Boolean);
    }
  }

  return [];
};

const toFormSnapshot = (data) => ({
  title: data.title ?? '',
  location: data.location ?? '',
  description: data.description ?? '',
  requirements: data.requirements ?? '',
  jobType: data.jobType ?? 'Full-time',
  salaryMin: data.salaryMin === null || data.salaryMin === undefined ? '' : String(data.salaryMin),
  salaryMax: data.salaryMax === null || data.salaryMax === undefined ? '' : String(data.salaryMax),
  workMode: data.workMode ?? 'On-site',
  applicationDeadline: data.applicationDeadline ?? '',
  vacancies: data.vacancies ? String(data.vacancies) : '1',
  skillsRequired: Array.isArray(data.skillsRequired)
    ? data.skillsRequired.join(', ')
    : data.skillsRequired ?? '',
  experienceLevel: normalizeExperienceLevel(data.experienceLevel ?? 'No experience required'),
  educationLevel: data.educationLevel ?? "Bachelor / College degree graduate's",
  isActive: data.isActive ?? true,
  isPublished: data.isPublished ?? true,

  openToFreshGraduates: parseBooleanLike(data.openToFreshGraduates),
  perksAndBenefits: normalizePerksAndBenefits(data.perksAndBenefits),
  otherBenefits: data.otherBenefits ?? '',
  willingToRelocate: data.willingToRelocate ?? 'No - position is fixed location',
  locationImage: data.locationImage ?? '',
  locationLatitude: data.locationLatitude === null || data.locationLatitude === undefined ? '' : String(data.locationLatitude),
  locationLongitude: data.locationLongitude === null || data.locationLongitude === undefined ? '' : String(data.locationLongitude),
});

const EditJob = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [savingDraft, setSavingDraft] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [savingChanges, setSavingChanges] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [job, setJob] = useState(null);

  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState({});

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const modalRef = useRef(null);
  const cancelBtnRef = useRef(null);

  const initialFormRef = useRef(null);
  const hasLoadedInitialRef = useRef(false);

  const [locationImageFile, setLocationImageFile] = useState(null);
  const [locationImagePreview, setLocationImagePreview] = useState('');

  const storedUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
      return null;
    }
  }, []);

  const verificationStatus = useMemo(() => {
    return storedUser?.employerProfile?.verificationDocs?.overallStatus || 'unverified';
  }, [storedUser]);

  const canPublish = useMemo(() => {
    return verificationStatus === 'verified' || storedUser?.isVerified === true;
  }, [verificationStatus, storedUser]);

  const verificationBannerMessage = useMemo(() => {
    if (canPublish) return '';
    if (verificationStatus === 'pending') {
      return 'Verification is pending. You can save drafts, but you cannot publish until approved by admin.';
    }
    if (verificationStatus === 'rejected') {
      return 'Verification was rejected. You can save drafts, but you cannot publish until you resubmit and get approved.';
    }
    return 'Your company is not verified yet. You can save drafts, but you cannot publish until verified by admin.';
  }, [canPublish, verificationStatus]);

  const [formData, setFormData] = useState({
    title: '',
    location: '',
    description: '',
    requirements: '',
    jobType: 'Full-time',
    salaryMin: '',
    salaryMax: '',
    workMode: 'On-site',
    applicationDeadline: '',
    vacancies: '1',
    skillsRequired: '',
    experienceLevel: 'No experience required',
    educationLevel: "Bachelor / College degree graduate's",
    isActive: true,
    isPublished: true,

    openToFreshGraduates: false,
    perksAndBenefits: [],
    otherBenefits: '',
    willingToRelocate: 'No - position is fixed location',
    locationImage: '',
    locationLatitude: '',
    locationLongitude: '',
  });

  const companyCategoryDefault = useMemo(() => {
    const fromJob = normalizeCategory(job?.category);
    if (fromJob) return fromJob;
    return normalizeCategory(storedUser?.employerProfile?.industry);
  }, [job?.category, storedUser]);

  const isBusy = savingDraft || publishing || savingChanges || deleting || togglingStatus;

  const inputBase =
    'w-full rounded-xl border px-4 py-3 text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-60 disabled:bg-gray-50 disabled:cursor-not-allowed';

  const inputClass = (hasError) =>
    `${inputBase} ${
      hasError
        ? 'border-red-300 focus-visible:ring-red-600 focus-visible:border-red-600'
        : 'border-gray-300 focus-visible:ring-[#2e66a6] focus-visible:border-[#2e66a6]'
    }`;

  const selectClass =
    'w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#2e66a6] focus-visible:border-[#2e66a6] disabled:opacity-60 disabled:bg-gray-50 disabled:cursor-not-allowed';

  const markTouched = useCallback((name) => {
    setTouched((prev) => ({ ...prev, [name]: true }));
  }, []);

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  const getAxiosErrorMessage = (err, fallback) => {
    return (
      err?.response?.data?.message ||
      err?.response?.data?.error ||
      err?.message ||
      fallback
    );
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (type === 'checkbox' && name === 'openToFreshGraduates') {
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else if (name === 'experienceLevel') {
      setFormData((prev) => ({ ...prev, [name]: normalizeExperienceLevel(value) }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }

    clearMessages();
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
    clearMessages();
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
    clearMessages();
  };

  const jobTypes = JOB_TYPES;
  const experienceLevels = EXPERIENCE_LEVELS;
  const educationLevels = EDUCATION_LEVELS;
  const willingToRelocateOptions = WILLING_TO_RELOCATE_OPTIONS;
  const perksAndBenefitsOptions = PERKS_AND_BENEFITS_OPTIONS;
  const workModes = ['On-site', 'Remote', 'Blended', 'Work from Home'];

  const minDeadlineISO = useMemo(() => addDaysLocalISO(1), []);
  const todayISO = useMemo(() => getLocalISODate(new Date()), []);

  const skillsAll = useMemo(() => {
    return (formData.skillsRequired || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }, [formData.skillsRequired]);

  const skills = useMemo(() => skillsAll.slice(0, 10), [skillsAll]);
  const skillsCountValid = useMemo(() => skillsAll.length <= 10, [skillsAll.length]);

  const trimSkillsToLimit = useCallback(() => {
    const list = (formData.skillsRequired || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (list.length <= 10) return;
    setFormData((prev) => ({ ...prev, skillsRequired: list.slice(0, 10).join(', ') }));
  }, [formData.skillsRequired]);

  const salaryValid = useMemo(() => {
    if (!formData.salaryMin || !formData.salaryMax) return true;
    const min = Number(formData.salaryMin);
    const max = Number(formData.salaryMax);
    if (Number.isNaN(min) || Number.isNaN(max)) return true;
    return min <= max;
  }, [formData.salaryMin, formData.salaryMax]);

  const vacanciesValid = useMemo(() => {
    const v = Number(formData.vacancies);
    if (Number.isNaN(v)) return false;
    return v >= 1;
  }, [formData.vacancies]);

  const isDeadlineValid = useMemo(() => {
    if (!formData.applicationDeadline) return false;
    return formData.applicationDeadline >= minDeadlineISO;
  }, [formData.applicationDeadline, minDeadlineISO]);

  const derivedStatus = useMemo(() => {
    if (formData.isPublished === false) return 'Draft';
    if (!formData.applicationDeadline) return formData.isActive ? 'Open' : 'Closed';

    const expired = formData.applicationDeadline < minDeadlineISO;
    if (expired) return 'Expired';

    return formData.isActive ? 'Open' : 'Closed';
  }, [formData.isPublished, formData.isActive, formData.applicationDeadline, minDeadlineISO]);

  const requiredOk = useMemo(() => {
    return (
      formData.title.trim() &&
      formData.location.trim() &&
      formData.description.trim().length >= 80 &&
      formData.requirements.trim().length >= 40 &&
      String(formData.educationLevel || '').trim() &&
      vacanciesValid &&
      isDeadlineValid &&
      salaryValid &&
      skillsCountValid
    );
  }, [formData, vacanciesValid, isDeadlineValid, salaryValid, skillsCountValid]);

  const fieldErrors = useMemo(() => {
    const errors = {};

    if ((touched.title || submitted) && !formData.title.trim()) {
      errors.title = 'Job title is required.';
    }

    if ((touched.location || submitted) && !formData.location.trim()) {
      errors.location = 'Location (City) is required.';
    }

    if ((touched.experienceLevel || submitted) && !EXPERIENCE_LEVELS.includes(String(formData.experienceLevel || '').trim())) {
      errors.experienceLevel = 'Please select a valid experience requirement.';
    }

    if ((touched.educationLevel || submitted) && !String(formData.educationLevel || '').trim()) {
      errors.educationLevel = 'Education level is required.';
    }

    if ((touched.description || submitted) && !formData.description.trim()) {
      errors.description = 'Job description is required.';
    } else if (
      (touched.description || submitted) &&
      formData.description.trim().length > 0 &&
      formData.description.trim().length < 80
    ) {
      errors.description = 'Job description must be at least 80 characters.';
    }

    if ((touched.requirements || submitted) && !formData.requirements.trim()) {
      errors.requirements = 'Job requirements are required.';
    } else if (
      (touched.requirements || submitted) &&
      formData.requirements.trim().length > 0 &&
      formData.requirements.trim().length < 40
    ) {
      errors.requirements = 'Requirements must be at least 40 characters.';
    }

    if ((touched.vacancies || submitted) && !vacanciesValid) {
      errors.vacancies = 'Vacancies must be 1 or more.';
    }

    if ((touched.salaryMin || touched.salaryMax || submitted) && !salaryValid) {
      errors.salary = 'Minimum salary must be ≤ maximum salary.';
    }

    if ((touched.applicationDeadline || submitted) && !formData.applicationDeadline) {
      errors.applicationDeadline = 'Application deadline is required.';
    } else if (
      (touched.applicationDeadline || submitted) &&
      formData.applicationDeadline &&
      !isDeadlineValid
    ) {
      errors.applicationDeadline = 'Application deadline must be at least tomorrow.';
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
  }, [
    formData,
    touched,
    submitted,
    vacanciesValid,
    salaryValid,
    isDeadlineValid,
    skillsCountValid,
    skillsAll.length,
    locationImageFile,
  ]);

  const validateStrict = () => {
    if (!formData.title.trim()) return 'Job title is required';
    if (!formData.location.trim()) return 'Location Address is required';
    if (!String(formData.educationLevel || '').trim()) return 'Education level is required';
    if (!formData.description.trim()) return 'Job description is required';
    if (formData.description.trim().length < 80) return 'Job description must be at least 80 characters';
    if (!formData.requirements.trim()) return 'Job requirements are required';
    if (formData.requirements.trim().length < 40) return 'Requirements must be at least 40 characters';
    if (!vacanciesValid) return 'Vacancies must be 1 or more';
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

    return '';
  };

  const focusFirstError = useCallback((errors) => {
    const order = [
      'title',
      'location',
      'experienceLevel',
      'educationLevel',
      'description',
      'requirements',
      'vacancies',
      'applicationDeadline',
      'skillsRequired',
      'salary',
      'locationImage',
    ];

    const firstKey = order.find((k) => errors?.[k]);
    if (!firstKey) return;

    const idMap = {
      title: 'title',
      location: 'location',
      experienceLevel: 'experienceLevel',
      educationLevel: 'educationLevel',
      description: 'description',
      requirements: 'requirements',
      vacancies: 'vacancies',
      applicationDeadline: 'applicationDeadline',
      skillsRequired: 'skillsRequired',
      salary: 'salaryMin',
      locationImage: 'locationImage',
    };

    const el = document.getElementById(idMap[firstKey]);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => el.focus(), 150);
    }
  }, []);

  const buildPayload = ({ mode }) => {
    const payload = new FormData();

    payload.append('title', formData.title.trim());
    payload.append('location', formData.location.trim());
    payload.append('description', formData.description.trim());
    payload.append('requirements', formData.requirements.trim());
    payload.append('jobType', formData.jobType);
    payload.append('salaryMin', formData.salaryMin === '' ? '' : String(Number(formData.salaryMin)));
    payload.append('salaryMax', formData.salaryMax === '' ? '' : String(Number(formData.salaryMax)));
    payload.append('workMode', formData.workMode);
    payload.append('applicationDeadline', formData.applicationDeadline || '');
    payload.append('vacancies', formData.vacancies ? String(Number(formData.vacancies)) : '1');
    payload.append('experienceLevel', normalizeExperienceLevel(formData.experienceLevel));
    payload.append('skillsRequired', skills.join(', '));
    payload.append('educationLevel', String(formData.educationLevel || '').trim());
    payload.append('category', companyCategoryDefault || normalizeCategory(storedUser?.employerProfile?.industry));

    payload.append('openToFreshGraduates', String(formData.openToFreshGraduates));
    payload.append('otherBenefits', String(formData.otherBenefits || '').trim());
    payload.append('willingToRelocate', String(formData.willingToRelocate || '').trim());
    payload.append('perksAndBenefits', JSON.stringify(formData.perksAndBenefits || []));

    payload.append('locationLatitude', String(formData.locationLatitude || ''));
    payload.append('locationLongitude', String(formData.locationLongitude || ''));

    if (locationImageFile) {
      payload.append('locationImage', locationImageFile);
    }

    if (mode === 'draft') {
      payload.append('status', 'draft');
      payload.append('isPublished', 'false');
      payload.append('isActive', 'false');
    } else if (mode === 'publish') {
      payload.append('status', 'published');
      payload.append('isPublished', 'true');
      payload.append('isActive', 'true');
    } else {
      payload.append('status', formData.isPublished ? 'published' : 'draft');
      payload.append('isPublished', String(formData.isPublished));
      payload.append('isActive', String(formData.isActive));
    }

    return payload;
  };

  const isDirty = useMemo(() => {
    if (!hasLoadedInitialRef.current || !initialFormRef.current) return false;

    const comparableCurrent = {
      ...formData,
      locationImage: formData.locationImage || '',
    };
    const comparableInitial = {
      ...initialFormRef.current,
      locationImage: initialFormRef.current.locationImage || '',
    };

    return stableStringify(comparableInitial) !== stableStringify(comparableCurrent) || !!locationImageFile;
  }, [formData, locationImageFile]);

  const confirmLeaveIfDirty = useCallback(() => {
    if (!isDirty) return true;
    return window.confirm('You have unsaved changes. Discard and leave this page?');
  }, [isDirty]);

  useEffect(() => {
    const onBeforeUnload = (e) => {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    const onPopState = () => {
      if (!isDirty) return;
      const ok = window.confirm('You have unsaved changes. Discard and leave this page?');
      if (!ok) {
        window.history.pushState(null, '', window.location.href);
      }
    };
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [isDirty]);

  useEffect(() => {
    const fetchJob = async () => {
      try {
        setLoading(true);
        clearMessages();

        const token = localStorage.getItem('token');
        const res = await axios.get(`https://phinmaau-job-portal-atlas.onrender.com/api/jobs/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.data?.success) {
          setError('Job not found.');
          setJob(null);
          return;
        }

        const jobData = res.data.job;
        setJob(jobData);

        const nextForm = toFormSnapshot({
          ...jobData,
          applicationDeadline: jobData.applicationDeadline ? jobData.applicationDeadline.split('T')[0] : '',
          skillsRequired: Array.isArray(jobData.skillsRequired)
            ? jobData.skillsRequired.join(', ')
            : jobData.skillsRequired || '',
          perksAndBenefits: jobData.perksAndBenefits || [],
          openToFreshGraduates: jobData.openToFreshGraduates || false,
          otherBenefits: jobData.otherBenefits || '',
          willingToRelocate: jobData.willingToRelocate || 'No - position is fixed location',
          locationImage: jobData.locationImage || '',
          locationLatitude: jobData.locationLatitude === null || jobData.locationLatitude === undefined ? '' : String(jobData.locationLatitude || ''),
          locationLongitude: jobData.locationLongitude === null || jobData.locationLongitude === undefined ? '' : String(jobData.locationLongitude || ''),
        });

        setFormData(nextForm);
        initialFormRef.current = nextForm;
        hasLoadedInitialRef.current = true;

        if (jobData.locationImage) {
          setLocationImagePreview(
            jobData.locationImage.startsWith('http')
              ? jobData.locationImage
              : `https://phinmaau-job-portal-atlas.onrender.com${jobData.locationImage}`
          );
        } else {
          setLocationImagePreview('');
        }

        setSubmitted(false);
        setTouched({});
      } catch (err) {
        console.error(err);
        if (err.response?.status === 401) {
          localStorage.removeItem('token');
          navigate('/employer/login');
          return;
        }
        setError(getAxiosErrorMessage(err, 'Failed to load job details. Please try again.'));
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchJob();
  }, [id, navigate]);

  const persist = async (payload) => {
    const token = localStorage.getItem('token');
    const res = await axios.put(`https://phinmaau-job-portal-atlas.onrender.com/api/jobs/${id}`, payload, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
    });

    if (!res.data?.success) {
      throw new Error(res.data?.message || 'Failed to save.');
    }

    const updatedJob = res.data?.job;

    const snapshot = toFormSnapshot({
      ...formData,
      ...(updatedJob || {}),
      applicationDeadline: updatedJob?.applicationDeadline
        ? String(updatedJob.applicationDeadline).split('T')[0]
        : formData.applicationDeadline,
      skillsRequired:
        updatedJob?.skillsRequired && Array.isArray(updatedJob.skillsRequired)
          ? updatedJob.skillsRequired.join(', ')
          : formData.skillsRequired,
      salaryMin:
        updatedJob?.salaryMin !== undefined
          ? updatedJob.salaryMin === null
            ? ''
            : String(updatedJob.salaryMin)
          : formData.salaryMin,
      salaryMax:
        updatedJob?.salaryMax !== undefined
          ? updatedJob.salaryMax === null
            ? ''
            : String(updatedJob.salaryMax)
          : formData.salaryMax,
      vacancies:
        updatedJob?.vacancies !== undefined
          ? String(updatedJob.vacancies || 1)
          : formData.vacancies,
      isPublished:
        updatedJob?.isPublished !== undefined ? updatedJob.isPublished : formData.isPublished,
      isActive:
        updatedJob?.isActive !== undefined ? updatedJob.isActive : formData.isActive,
      location:
        updatedJob?.location !== undefined
          ? String(updatedJob.location || '')
          : formData.location,
      educationLevel:
        updatedJob?.educationLevel !== undefined
          ? String(updatedJob.educationLevel || '')
          : formData.educationLevel,
      experienceLevel:
        updatedJob?.experienceLevel !== undefined
          ? String(updatedJob.experienceLevel || 'No experience required')
          : formData.experienceLevel,
      openToFreshGraduates:
        updatedJob?.openToFreshGraduates !== undefined
          ? parseBooleanLike(updatedJob.openToFreshGraduates)
          : formData.openToFreshGraduates,
      perksAndBenefits:
        updatedJob?.perksAndBenefits !== undefined
          ? normalizePerksAndBenefits(updatedJob.perksAndBenefits)
          : formData.perksAndBenefits,
      otherBenefits:
        updatedJob?.otherBenefits !== undefined
          ? String(updatedJob.otherBenefits || '')
          : formData.otherBenefits,
      willingToRelocate:
        updatedJob?.willingToRelocate !== undefined
          ? String(updatedJob.willingToRelocate || 'No - position is fixed location')
          : formData.willingToRelocate,
      locationImage:
        updatedJob?.locationImage !== undefined
          ? String(updatedJob.locationImage || '')
          : formData.locationImage,
      locationLatitude:
        updatedJob?.locationLatitude !== undefined && updatedJob?.locationLatitude !== null
          ? String(updatedJob.locationLatitude || '')
          : formData.locationLatitude,
      locationLongitude:
        updatedJob?.locationLongitude !== undefined && updatedJob?.locationLongitude !== null
          ? String(updatedJob.locationLongitude || '')
          : formData.locationLongitude,
    });

    initialFormRef.current = snapshot;
    setFormData(snapshot);
    setLocationImageFile(null);

    if (snapshot.locationImage) {
      setLocationImagePreview(
        snapshot.locationImage.startsWith('http')
          ? snapshot.locationImage
          : `https://phinmaau-job-portal-atlas.onrender.com${snapshot.locationImage}`
      );
    } else {
      setLocationImagePreview('');
    }

    return res;
  };

  const handleSaveDraft = async () => {
    setSubmitted(true);
    clearMessages();

    if (!formData.title.trim()) {
      setError('Please add a job title before saving as draft.');
      focusFirstError({ title: 'required' });
      return;
    }

    setSavingDraft(true);
    try {
      const payload = buildPayload({ mode: 'draft' });
      await persist(payload);
      setSuccess('Draft saved.');
    } catch (err) {
      console.error(err);
      setError(getAxiosErrorMessage(err, 'Failed to save draft. Please try again.'));
    } finally {
      setSavingDraft(false);
    }
  };

  const handlePublish = async () => {
    setSubmitted(true);
    clearMessages();

    if (!canPublish) {
      setError(verificationBannerMessage || 'You cannot publish until verified.');
      return;
    }

    const msg = validateStrict();
    if (msg) {
      setError('Please fix the highlighted fields.');
      focusFirstError(fieldErrors);
      return;
    }

    setPublishing(true);
    try {
      const payload = buildPayload({ mode: 'publish' });
      await persist(payload);

      navigate('/employer/manage-jobs', {
        state: { jobEditSuccess: true, successType: 'edit-publish' },
      });
    } catch (err) {
      console.error(err);

      const serverCode = err.response?.data?.code;
      const serverMsg = err.response?.data?.message;
      if (err.response?.status === 403 && serverCode === 'EMPLOYER_NOT_VERIFIED') {
        setError(serverMsg || verificationBannerMessage || 'You cannot publish until verified.');
      } else {
        setError(getAxiosErrorMessage(err, 'Failed to publish job. Please try again.'));
      }
    } finally {
      setPublishing(false);
    }
  };

  const handleSaveChanges = async () => {
    setSubmitted(true);
    clearMessages();

    const msg = validateStrict();
    if (msg) {
      setError('Please fix the highlighted fields.');
      focusFirstError(fieldErrors);
      return;
    }

    setSavingChanges(true);
    try {
      const payload = buildPayload({ mode: 'update' });
      await persist(payload);
      navigate('/employer/manage-jobs', {
        state: { jobEditSuccess: true, successType: 'edit' },
      });
    } catch (err) {
      console.error(err);
      setError(getAxiosErrorMessage(err, 'Failed to save changes. Please try again.'));
    } finally {
      setSavingChanges(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    clearMessages();

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`https://phinmaau-job-portal-atlas.onrender.com/api/jobs/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setSuccess('Job deleted.');
      setTimeout(() => navigate('/employer/manage-jobs'), 700);
    } catch (err) {
      console.error(err);
      setError(getAxiosErrorMessage(err, 'Failed to delete job.'));
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  useEffect(() => {
    if (!showDeleteModal) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const t = setTimeout(() => cancelBtnRef.current?.focus(), 0);

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowDeleteModal(false);
        return;
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusables = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusables.length) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [showDeleteModal]);

  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(''), 2500);
    return () => clearTimeout(t);
  }, [success]);

  const descLen = formData.description.trim().length;
  const reqLen = formData.requirements.trim().length;

  const showDescCounterRed = (touched.description || submitted) && descLen > 0 && descLen < 80;
  const showReqCounterRed = (touched.requirements || submitted) && reqLen > 0 && reqLen < 40;

  const stickyStyle = {
    paddingLeft: 'var(--employer-sidebar-width, 0px)',
  };

  const isDraft = formData.isPublished === false;
  const primaryActionLabel = isDraft ? 'Publish Job' : 'Save changes';
  const primaryActionHandler = isDraft ? handlePublish : handleSaveChanges;

  if (loading) {
    return (
      <EmployerLayout>
        <div className="min-h-screen bg-gray-50">
          <div className="mx-auto max-w-6xl px-4 py-12">
            <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
              <div className="mx-auto inline-block h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-[#2e66a6]" />
              <p className="mt-4 text-sm text-gray-600">Loading job details...</p>
            </div>
          </div>
        </div>
      </EmployerLayout>
    );
  }

  if (!job && error) {
    return (
      <EmployerLayout>
        <div className="min-h-screen bg-gray-50">
          <div className="mx-auto max-w-6xl px-4 py-12">
            <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900">Error</h3>
              <p className="mt-2 text-sm text-gray-600">{error}</p>
              <div className="mt-6">
                <Link
                  to="/employer/manage-jobs"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#2e66a6] px-5 py-3 text-sm font-semibold text-white hover:bg-[#25558a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2"
                >
                  Back to Manage Jobs
                </Link>
              </div>
            </div>
          </div>
        </div>
      </EmployerLayout>
    );
  }

  return (
    <EmployerLayout>
      <div className="min-h-screen bg-gray-50 -mt-2">
        <div className="mx-auto max-w-7xl px-1 py-8">
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (!confirmLeaveIfDirty()) return;
                    navigate('/employer/manage-jobs');
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 shadow-sm transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 19l-7-7m0 0l7-7m-7 7h18"
                    />
                  </svg>
                  Back
                </button>

                {isDirty && (
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 border border-amber-200">
                    Unsaved changes
                  </span>
                )}
              </div>

              <h1 className="text-[33px] leading-[40px] font-semibold text-gray-900">Edit Job Post</h1>
              <p className="text-gray-600">Update details and preview what jobseekers will see.</p>

              {!canPublish && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-semibold text-amber-900">Verification required to publish</p>
                  <p className="mt-1 text-sm text-amber-800">
                    Status: <span className="font-bold">{verificationStatus}</span>. {verificationBannerMessage}
                  </p>
                </div>
              )}
            </div>
          </div>

          {error && (
            <Alert type="error" onClose={() => setError('')}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert type="success" onClose={() => setSuccess('')}>
              {success}
            </Alert>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
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
                          <Field id="title" label="Job Title" error={fieldErrors.title}>
                            <input
                              name="title"
                              value={formData.title}
                              onChange={handleChange}
                              onBlur={() => markTouched('title')}
                              className={inputClass(!!fieldErrors.title)}
                              placeholder="e.g., Junior Web Developer"
                              disabled={isBusy}
                            />
                          </Field>
                        </div>

                        <Field id="jobType" label="Employment Type">
                          <select
                            name="jobType"
                            value={formData.jobType}
                            onChange={handleChange}
                            onBlur={() => markTouched('jobType')}
                            className={selectClass}
                            disabled={isBusy}
                          >
                            {jobTypes.map((type) => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </select>
                        </Field>

                        <Field id="workMode" label="Work Mode">
                          <select
                            name="workMode"
                            value={formData.workMode}
                            onChange={handleChange}
                            onBlur={() => markTouched('workMode')}
                            className={selectClass}
                            disabled={isBusy}
                          >
                            {workModes.map((m) => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </select>
                        </Field>

                        <div className="md:col-span-2">
                          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                            <Field id="vacancies" label="Vacancies" error={fieldErrors.vacancies}>
                              <input
                                type="number"
                                name="vacancies"
                                value={formData.vacancies}
                                onChange={handleChange}
                                onBlur={() => markTouched('vacancies')}
                                min="1"
                                className={inputClass(!!fieldErrors.vacancies)}
                                disabled={isBusy}
                              />
                            </Field>

                            <Field
                              id="applicationDeadline"
                              label="Application Deadline"
                              error={fieldErrors.applicationDeadline}
                            >
                              <input
                                type="date"
                                name="applicationDeadline"
                                value={formData.applicationDeadline}
                                onChange={handleChange}
                                onBlur={() => markTouched('applicationDeadline')}
                                min={minDeadlineISO}
                                className={inputClass(!!fieldErrors.applicationDeadline)}
                                disabled={isBusy}
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
                              className={`${inputClass(!!fieldErrors.salary)} pl-8`}
                              placeholder="Min"
                              min="0"
                              disabled={isBusy}
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
                              className={`${inputClass(!!fieldErrors.salary)} pl-8`}
                              placeholder="Max"
                              min="0"
                              disabled={isBusy}
                            />
                          </div>
                        </Field>
                      </div>

                      {fieldErrors.salary && <p className="text-sm font-medium text-red-600">{fieldErrors.salary}</p>}
                    </section>

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
                              disabled={isBusy}
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
                            name="experienceLevel"
                            value={formData.experienceLevel}
                            onChange={handleChange}
                            onBlur={() => markTouched('experienceLevel')}
                            className={`${selectClass} ${fieldErrors.experienceLevel ? 'border-red-300' : ''}`}
                            disabled={isBusy}
                          >
                            {experienceLevels.map((level) => (
                              <option key={level} value={level}>{level}</option>
                            ))}
                          </select>
                        </Field>

                        <Field id="educationLevel" label="Educational Requirement" error={fieldErrors.educationLevel}>
                          <select
                            name="educationLevel"
                            value={formData.educationLevel}
                            onChange={handleChange}
                            onBlur={() => markTouched('educationLevel')}
                            className={selectClass}
                            disabled={isBusy}
                          >
                            {educationLevels.map((lvl) => (
                              <option key={lvl} value={lvl}>{lvl}</option>
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
                        hint="Min 80 characters. Include responsibilities, tools, and expectations."
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
                            className={inputClass(!!fieldErrors.description)}
                            placeholder="Write the role overview and day-to-day responsibilities..."
                            disabled={isBusy}
                          />
                          <div className="flex justify-end">
                          
                          </div>
                        </div>
                      </Field>

                      <Field
                        id="requirements"
                        label="Qualifications"
                        hint="Min 40 characters. Separate must-have and nice-to-have."
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
                            className={inputClass(!!fieldErrors.requirements)}
                            placeholder="Must-have: ...  | Nice-to-have: ..."
                            disabled={isBusy}
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
                          name="skillsRequired"
                          value={formData.skillsRequired}
                          onChange={handleChange}
                          onBlur={() => {
                            markTouched('skillsRequired');
                            trimSkillsToLimit();
                          }}
                          className={inputClass(!!fieldErrors.skillsRequired)}
                          placeholder="Type a skill and separate by comma (e.g., React, Communication, Excel)"
                          disabled={isBusy}
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
                              disabled={isBusy}
                              className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
                                active
                                  ? 'border-[#2e66a6] bg-blue-50 text-[#2e66a6] font-semibold'
                                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                              } ${isBusy ? 'opacity-60 cursor-not-allowed' : ''}`}
                            >
                              {perk}
                            </button>
                          );
                        })}
                      </div>

                      <Field id="otherBenefits" label="Other benefits (type to add)">
                        <input
                          name="otherBenefits"
                          value={formData.otherBenefits}
                          onChange={handleChange}
                          onBlur={() => markTouched('otherBenefits')}
                          className={inputClass(false)}
                          placeholder="e.g., Paid Bereavement/Family Leave, Paid leave, Bonuses"
                          disabled={isBusy}
                        />
                      </Field>
                    </section>

                    <div className="border-t border-gray-100" />

                    <section className="space-y-5">
                      <h3 className="text-base font-bold text-gray-900">Additional Details</h3>

                      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                        <Field id="willingToRelocate" label="Willing to Relocate">
                          <select
                            name="willingToRelocate"
                            value={formData.willingToRelocate}
                            onChange={handleChange}
                            onBlur={() => markTouched('willingToRelocate')}
                            className={selectClass}
                            disabled={isBusy}
                          >
                            {willingToRelocateOptions.map((option) => (
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
                            disabled={isBusy}
                            error={fieldErrors.location}
                            placeholder="e.g., 123 Rizal Ave, Manila, Metro Manila"
                            onChange={({ address, lat, lng }) => {
                              setFormData((prev) => ({
                                ...prev,
                                location: address,
                                locationLatitude: lat,
                                locationLongitude: lng,
                              }));
                              markTouched('location');
                              clearMessages();
                            }}
                          />
                        </Field>
                      </div>
                    </section>

                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="fixed bottom-0 right-0 left-0 lg:left-72 border-t border-gray-200 bg-white/95 backdrop-blur z-40"
            style={stickyStyle}>
            <div className="mx-auto max-w-6xl px-4 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-gray-600">
                {requiredOk ? (
                  <span className="font-semibold text-[#2e66a6]">
                    All required fields complete. You can {isDraft ? 'publish' : 'save changes'}.
                  </span>
                ) : (
                  <span>Complete required fields to publish/save.</span>
                )}
                {isDraft && !canPublish && (
                  <span className="ml-2 font-semibold text-amber-700">Verification required to publish.</span>
                )}
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!confirmLeaveIfDirty()) return;
                    navigate('/employer/manage-jobs');
                  }}
                  className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#2e66a6]"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={savingDraft || publishing || savingChanges || deleting}
                  className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#2e66a6]"
                >
                  {savingDraft ? 'Saving…' : 'Save Draft'}
                </button>

                <button
                  type="button"
                  onClick={primaryActionHandler}
                  disabled={
                    publishing ||
                    savingDraft ||
                    savingChanges ||
                    deleting ||
                    !requiredOk ||
                    (isDraft ? false : !isDirty) ||
                    (isDraft && !canPublish)
                  }
                  title={isDraft && !canPublish ? 'Verify your company to publish.' : ''}
                  className="rounded-xl bg-[#2e66a6] px-5 py-2 text-sm font-semibold text-white hover:bg-[#25558a] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#2e66a6]"
                >
                  {publishing || savingChanges
                    ? 'Saving…'
                    : isDraft && !canPublish
                    ? 'Verify to publish'
                    : primaryActionLabel}
                </button>
              </div>
            </div>
          </div>

          {showDeleteModal && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) setShowDeleteModal(false);
              }}
            >
              <div
                ref={modalRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="delete-title"
                aria-describedby="delete-desc"
                className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl"
              >
                <div className="h-2 w-full bg-red-600" />
                <div className="p-6">
                  <div className="mb-4 flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100">
                      <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                        />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <h3 id="delete-title" className="text-lg font-bold text-gray-900">
                        Delete Job Post
                      </h3>
                      <p id="delete-desc" className="mt-1 text-sm text-gray-600">
                        This action cannot be undone.
                      </p>
                    </div>
                  </div>

                  <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4">
                    <p className="font-semibold text-red-900">“{formData.title?.trim() || 'Untitled Draft'}”</p>
                    <p className="mt-1 text-sm text-red-800">
                      All applications and related data will be permanently deleted.
                    </p>
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      ref={cancelBtnRef}
                      onClick={() => setShowDeleteModal(false)}
                      disabled={deleting}
                      className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#2e66a6]"
                    >
                      Cancel
                    </button>

                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-600"
                    >
                      {deleting ? 'Deleting…' : 'Delete Job'}
                    </button>
                  </div>

                  <p className="mt-4 text-xs text-gray-500">
                    Tip: Press <span className="font-semibold">Esc</span> to close.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </EmployerLayout>
  );
};

export default EditJob;