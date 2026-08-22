// src/pages/employer/dashboard/CompanyProfile.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import EmployerLayout from '../../../layouts/EmployerLayout';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  PH_REGIONS,
  PH_PROVINCES_BY_REGION,
  PH_CITIES_BY_PROVINCE,
} from '../../../constants/phLocations';
import api from '../../../services/api';

const cx = (...classes) => classes.filter(Boolean).join(' ');

const JobCardIcon = ({ name, className = 'w-4 h-4' }) => {
  if (name === 'location') {
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
          d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z"
        />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    );
  }

  if (name === 'contract') {
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
          d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2m3 0H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2z"
        />
      </svg>
    );
  }

  return null;
};

const formatJobSalary = (job) => {
  if (job?.hideSalary) return 'Salary not disclosed';
  const min = Number(job?.salaryMin || 0);
  const max = Number(job?.salaryMax || min || 0);
  if (!min && !max) return 'Salary not specified';
  return `${min.toLocaleString('en-PH')} - ${max.toLocaleString('en-PH')}`;
};

const formatJobDeadline = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Deadline not specified';
  return `Deadline of application: ${date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`;
};

const formatReviewAge = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const days = Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000));
  if (days === 0) return 'Today';
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months === 1 ? '' : 's'} ago`;
};

const getReviewOutcome = (value) => ({
  still_in_process: 'Still in process',
  offered: 'Offered',
  not_offered: 'Not offered',
  withdrew: 'Withdrew',
}[String(value || '').toLowerCase()] || value || 'Outcome not provided');

const MAX_LOGO_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_COVER_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_GALLERY_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_GALLERY_IMAGES = 12;

const MAX_COMPANY_NAME_LENGTH = 150;
const MAX_INDUSTRY_LENGTH = 100;
const MIN_COMPANY_DESCRIPTION_LENGTH = 500;
const MAX_COMPANY_DESCRIPTION_LENGTH = 1500;
const MAX_OFFICE_ADDRESS_LENGTH = 150;

const MIN_LOGO_DIM = 128;
const MIN_RATIO = 0.25;
const MAX_RATIO = 4;

const MAX_DOC_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_DOC_EXT = ['pdf', 'jpg', 'jpeg', 'png', 'webp'];

const DOC_TYPES = [
  { key: 'secRegistration', label: 'SEC Registration', hint: 'Securities and Exchange Commission' },
  { key: 'birRegistration', label: 'BIR Registration', hint: 'Bureau of Internal Revenue' },
  { key: 'dtiRegistration', label: 'DTI Registration', hint: 'Department of Trade and Industry' },
  { key: 'cityPermit', label: 'City / Municipality Permit', hint: 'Local Government Unit' },
  { key: 'businessPermit', label: 'Business Permit', hint: "Mayor's / Business Permit" },
];

const INDUSTRY_OPTIONS = [
  'Accounting / Audit / Tax Services',
  'Advertising / Marketing / Promotion / PR',
  'Aerospace / Aviation / Airline',
  'Agricultural / Plantation / Poultry / Fisheries',
  'Apparel / Fashion',
  'Architectural Services / Interior Designing',
  'Arts / Design',
  'Automobile / Automotive Ancillary / Vehicle',
  'Banking / Financial Services',
  'BioTechnology / Pharmaceutical / Clinical research',
  'Catering / Restaurant Service',
  'Chemical / Fertilizers / Pesticides',
  'Commodities Production / Distribution',
  'Computer / Information Technology (Hardware)',
  'Computer / Information Technology (Software)',
  'Construction / Building / Engineering',
  'Consulting (Business and Management)',
  'Consulting (IT, Science, Engineering and Technical)',
  'Consumer Products / FMCG',
  'Education',
  'Electrical and Electronics',
  'Entertainment / Media',
  'Environment / Health / Safety',
  'Exhibitions / Event Management / MICE',
  'Food and Beverage',
  'Gems / Jewellery',
  'General and Wholesale Trading',
  'Government',
  'Grooming / Beauty / Fitness',
  'Healthcare / Medical',
  'Heavy Industrial / Machinery / Equipment',
  'Home Furnishing / Furniture',
  'Hotel / Hospitality',
  'Human Resources Management / Consulting',
  'Insurance',
  'Journalism',
  'Law / Legal',
  'Oil / Gas / Petroleum',
  'Online / E-commerce Business',
  'Others',
  'Outsourcing (Call Center / BPO)',
  'Polymer / Plastic / Rubber / Tyres',
  'Printing / Publishing',
  'Property / Real Estate',
  'Repair and Maintenance Services',
  'Research and Development',
  'Retail / Merchandising',
  'Science and Technology',
  'Security / Law Enforcement',
  'Semiconductor / Wafer Fabrication',
  'Sports',
  'Stockbroking / Securities',
  'Telecommunication',
  'Textiles / Garment',
  'Tobacco and Liquor',
  'Transportation / Logistics',
  'Travel / Tourism',
  'Utilities / Power',
  'Wood / Fibre / Paper',
];

const isEqualShallow = (a, b) => {
  const ka = Object.keys(a || {});
  const kb = Object.keys(b || {});
  if (ka.length !== kb.length) return false;
  for (const k of ka) {
    if (a[k] !== b[k]) return false;
  }
  return true;
};

const normalizeLocationToken = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\b(city|municipality of)\b/g, ' ')
    .replace(/[^a-z0-9ñ\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const parseRegionLocation = (regionCity, companyAddress = '') => {
  const rawRegionCity = String(regionCity || '').trim();
  if (!rawRegionCity) {
    return { region: '', province: '', city: '' };
  }

  const parts = rawRegionCity
    .split(' - ')
    .map((part) => part.trim())
    .filter(Boolean);

  const region = parts[0] || '';
  const validProvinces = PH_PROVINCES_BY_REGION?.[region] || [];

  let province = '';
  let city = '';

  if (parts.length >= 3) {
    province = parts[1] || '';
    city = parts.slice(2).join(' - ').trim();
  } else if (parts.length === 2) {
    const legacyValue = parts[1] || '';

    if (validProvinces.includes(legacyValue)) {
      province = legacyValue;
    } else {
      city = legacyValue;
      province =
        validProvinces.find((provinceName) =>
          (PH_CITIES_BY_PROVINCE?.[provinceName] || []).includes(legacyValue)
        ) || '';
    }
  }

  if (province && !city) {
    const normalizedAddress = normalizeLocationToken(companyAddress);
    const provinceCities = PH_CITIES_BY_PROVINCE?.[province] || [];

    city =
      provinceCities.find((cityName) => {
        const normalizedCity = normalizeLocationToken(cityName);
        return normalizedCity && normalizedAddress.includes(normalizedCity);
      }) || '';
  }

  return { region, province, city };
};

const composeRegionCity = (region, province, city) =>
  [region, province, city]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .join(' - ');

const composeCompanyAddress = (province, city) =>
  [city, province]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .join(', ');

const formatCompanyLocation = (regionCity, companyAddress = '') => {
  const parsed = parseRegionLocation(regionCity, companyAddress);
  const fullLocation = [parsed.region, parsed.province, parsed.city]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .join(', ');

  return fullLocation || String(companyAddress || regionCity || '').trim() || 'Location not provided';
};

const normalizeUrl = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw}`;
};

const normalizeIndustryValue = (value) => {
  const cleanValue = String(value || '').trim().replace(/\s+/g, ' ');
  if (!cleanValue) return '';

  const existingOption = INDUSTRY_OPTIONS.find(
    (option) => option.toLowerCase() === cleanValue.toLowerCase()
  );

  return existingOption || cleanValue;
};

const normalizeGalleryItems = (galleryImages) => {
  if (!galleryImages) return [];

  if (Array.isArray(galleryImages)) {
    return galleryImages
      .map((item, index) => {
        if (typeof item === 'string') {
          const url = item.trim();
          if (!url) return null;
          return {
            _id: `string-${index}-${url}`,
            url,
            caption: '',
            uploadedAt: null,
          };
        }

        if (item && typeof item === 'object') {
          const url = String(item.url || '').trim();
          if (!url) return null;
          return {
            _id: item._id || `obj-${index}-${url}`,
            url,
            caption: item.caption || '',
            uploadedAt: item.uploadedAt || null,
          };
        }

        return null;
      })
      .filter(Boolean);
  }

  if (typeof galleryImages === 'string' && galleryImages.trim()) {
    return galleryImages
      .split(',')
      .map((item, index) => {
        const url = item.trim();
        if (!url) return null;
        return {
          _id: `csv-${index}-${url}`,
          url,
          caption: '',
          uploadedAt: null,
        };
      })
      .filter(Boolean);
  }

  return [];
};

const EditIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M16.862 3.487a2.1 2.1 0 112.97 2.97L8.75 17.54 4 19l1.46-4.75 11.402-10.763z" />
  </svg>
);

const CloseIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
  </svg>
);

const UploadIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M12 16V5m0 0l-4 4m4-4l4 4M5 19h14" />
  </svg>
);

const CompanyLogoUploadIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
    <rect x="4" y="6" width="12" height="11" rx="1.8" strokeWidth="1.7" />
    <circle cx="8" cy="10" r="1.35" strokeWidth="1.7" />
    <path strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" d="M5.5 15l3.2-3.1 2.35 2.15 2.15-2.05 2.8 3" />
    <circle cx="17.5" cy="7.5" r="3.5" fill="white" />
    <path strokeWidth="1.7" strokeLinecap="round" d="M17.5 5.7v3.6M15.7 7.5h3.6" />
  </svg>
);

const EyeIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z" />
    <circle cx="12" cy="12" r="2.75" strokeWidth="1.8" />
  </svg>
);

const DownloadIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0l-4-4m4 4l4-4M5 20h14" />
  </svg>
);

const BuildingIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M6 21V7l6-3v17M18 21V11l-6-2" />
    <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M9 10h.01M9 13h.01M9 16h.01M15 13h.01M15 16h.01" />
  </svg>
);

const GlobeIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M3 12h18M12 3c3.5 4 3.5 14 0 18m0-18c-3.5 4-3.5 14 0 18M4.5 7.5h15M4.5 16.5h15" />
    <circle cx="12" cy="12" r="9" strokeWidth="1.8" />
  </svg>
);

const LocationIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" />
    <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const LinkIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M10 13a5 5 0 007.07 0l2.12-2.12a5 5 0 10-7.07-7.07L10.7 5.22" />
    <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M14 11a5 5 0 00-7.07 0L4.81 13.12a5 5 0 107.07 7.07l1.41-1.41" />
  </svg>
);

const ExternalIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M14 3h7v7M10 14L21 3M21 14v6a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6" />
  </svg>
);

const FileIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5z" />
    <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M14 3v5h5" />
  </svg>
);

const ImageIcon = ({ className = 'w-14 h-14' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <rect x="3" y="4" width="18" height="16" rx="2" strokeWidth="1.8" />
    <circle cx="8.5" cy="9" r="1.5" strokeWidth="1.8" />
    <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M21 15l-5-5L5 20" />
  </svg>
);

const PaperPlaneIcon = ({ className = 'w-14 h-14' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M21 3L10 14" />
    <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M21 3L14.5 21l-4.5-7-7-4.5L21 3z" />
  </svg>
);

const AboutEmptyIcon = ({ className = 'w-14 h-14' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5z" />
    <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M14 3v5h5M9 13h6M9 17h6" />
  </svg>
);

const SpinnerIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={cx(className, 'animate-spin')} viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9M20 20v-5h-.581m0 0a8.003 8.003 0 01-15.357-2" />
  </svg>
);

const WarningIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 4h.01m-7.938 4h15.876c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.34 17.5c-.77.833.192 2.5 1.732 2.5z" />
  </svg>
);

const CheckCircleIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const MiniPencilIcon = ({ className = 'w-3.5 h-3.5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M16.862 3.487a2.1 2.1 0 112.97 2.97L8.75 17.54 4 19l1.46-4.75 11.402-10.763z" />
  </svg>
);

const PhotoStackIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <rect x="4" y="7" width="14" height="12" rx="2" strokeWidth="1.8" />
    <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M8 13l2.5-2.5 2 2 3.5-3.5L18 11" />
    <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M9 7V5a2 2 0 012-2h7a2 2 0 012 2v10a2 2 0 01-2 2h-2" />
  </svg>
);

const CoverPhotoIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <rect x="3" y="5" width="18" height="14" rx="2" strokeWidth="1.8" />
    <circle cx="9" cy="10" r="1.5" strokeWidth="1.8" />
    <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M21 15l-4.5-4.5L9 18" />
  </svg>
);

const StatusPill = ({ status, url }) => {
  const hasUploadedFile = Boolean(String(url || '').trim());
  const normalized = String(status || '').toLowerCase();

  const map = {
    uploaded: 'bg-[#e8f7ee] text-[#15803d]',
    rejected: 'bg-red-100 text-red-700',
    hold: 'bg-orange-100 text-orange-700',
    missing: 'bg-gray-100 text-gray-500',
  };

  let label = 'Missing';
  let variant = map.missing;

  if (hasUploadedFile) {
    label = 'Uploaded';
    variant = map.uploaded;
  } else if (normalized === 'rejected') {
    label = 'Rejected';
    variant = map.rejected;
  } else if (normalized === 'hold') {
    label = 'On Hold';
    variant = map.hold;
  }

  return (
    <span className={cx('inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold', variant)}>
      {label}
    </span>
  );
};

const TabButton = ({ active, children, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={cx(
      'relative pb-3 text-[14px] font-medium transition-colors',
      active ? 'text-[#2e66a6]' : 'text-[#6b7280] hover:text-[#374151]'
    )}
  >
    {children}
    <span
      className={cx(
        'absolute left-0 right-0 -bottom-[1px] h-[2px] rounded-full transition-opacity',
        active ? 'bg-[#2e66a6] opacity-100' : 'bg-transparent opacity-0'
      )}
    />
  </button>
);

const FormField = ({ label, required, error, children }) => (
  <div className="space-y-1.5">
    <label className="block text-[12px] font-semibold text-[#374151]">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {children}
    {error ? <p className="text-[12px] text-red-600">{error}</p> : null}
  </div>
);

const EmptyState = ({ icon, title, subtitle }) => {
  const Icon = icon;
  return (
    <div className="flex min-h-[290px] flex-col items-center justify-center px-6 text-center">
      <div className="text-[#6b7280]">
        <Icon className="w-14 h-14" />
      </div>
      <h3 className="mt-6 text-[22px] font-semibold text-[#4b5563]">{title}</h3>
      <p className="mt-2 text-[14px] text-[#6b7280]">{subtitle}</p>
    </div>
  );
};

const ImageCropEditor = ({ source, mode, fileName, onCancel, onApply }) => {
  const frameRef = useRef(null);
  const imageRef = useRef(null);
  const dragRef = useRef(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [frameSize, setFrameSize] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [applying, setApplying] = useState(false);

  const isLogo = mode === 'logo';

  useEffect(() => {
    const updateFrameSize = () => {
      const rect = frameRef.current?.getBoundingClientRect();
      if (rect) setFrameSize({ width: rect.width, height: rect.height });
    };

    updateFrameSize();
    window.addEventListener('resize', updateFrameSize);
    return () => window.removeEventListener('resize', updateFrameSize);
  }, []);

  const baseScale = useMemo(() => {
    if (!frameSize.width || !frameSize.height || !imageSize.width || !imageSize.height) return 1;
    return Math.max(frameSize.width / imageSize.width, frameSize.height / imageSize.height);
  }, [frameSize, imageSize]);

  const renderedScale = baseScale * zoom;
  const renderedWidth = imageSize.width * renderedScale;
  const renderedHeight = imageSize.height * renderedScale;
  const maxOffsetX = Math.max(0, (renderedWidth - frameSize.width) / 2);
  const maxOffsetY = Math.max(0, (renderedHeight - frameSize.height) / 2);

  const clampPosition = useCallback(
    (next) => ({
      x: Math.max(-maxOffsetX, Math.min(maxOffsetX, next.x)),
      y: Math.max(-maxOffsetY, Math.min(maxOffsetY, next.y)),
    }),
    [maxOffsetX, maxOffsetY]
  );

  useEffect(() => {
    setPosition((current) => clampPosition(current));
  }, [clampPosition]);

  const handlePointerDown = (event) => {
    event.currentTarget.setPointerCapture?.(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: position.x,
      originY: position.y,
    };
  };

  const handlePointerMove = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    setPosition(
      clampPosition({
        x: drag.originX + event.clientX - drag.startX,
        y: drag.originY + event.clientY - drag.startY,
      })
    );
  };

  const handlePointerEnd = (event) => {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  };

  const handleApply = async () => {
    const image = imageRef.current;
    if (!image || !frameSize.width || !frameSize.height || !renderedScale) return;

    setApplying(true);
    try {
      const outputWidth = isLogo ? 800 : 1500;
      const outputHeight = isLogo ? 800 : 500;
      const sourceWidth = frameSize.width / renderedScale;
      const sourceHeight = frameSize.height / renderedScale;
      const sourceX = imageSize.width / 2 - sourceWidth / 2 - position.x / renderedScale;
      const sourceY = imageSize.height / 2 - sourceHeight / 2 - position.y / renderedScale;

      const canvas = document.createElement('canvas');
      canvas.width = outputWidth;
      canvas.height = outputHeight;
      const context = canvas.getContext('2d');
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.drawImage(
        image,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        outputWidth,
        outputHeight
      );

      const mimeType = isLogo ? 'image/png' : 'image/jpeg';
      const extension = isLogo ? 'png' : 'jpg';
      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          (result) => (result ? resolve(result) : reject(new Error('Unable to crop image.'))),
          mimeType,
          isLogo ? undefined : 0.92
        );
      });

      const cleanName = String(fileName || (isLogo ? 'company-logo' : 'company-cover'))
        .replace(/\.[^/.]+$/, '')
        .replace(/[^a-zA-Z0-9-_]+/g, '-');
      onApply(new File([blob], `${cleanName}-cropped.${extension}`, { type: mimeType }));
    } catch (cropError) {
      console.error('Image crop failed:', cropError);
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 px-4 py-6">
      <div className="w-full max-w-[760px] overflow-hidden rounded-[18px] bg-white shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
        <div className="flex items-start justify-between gap-4 border-b border-[#e5e7eb] px-6 py-5">
          <div>
            <h3 className="text-[22px] font-semibold text-[#111827]">
              {isLogo ? 'Adjust Company Logo' : 'Adjust Cover Photo'}
            </h3>
            <p className="mt-1 text-[13px] text-[#6b7280]">
              Drag the photo to reposition it, then use the slider to zoom.
            </p>
          </div>
          <button type="button" onClick={onCancel} className="rounded-full p-2 text-[#4b5563] hover:bg-[#f3f4f6]" aria-label="Close image editor">
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="bg-[#111827] px-4 py-6 sm:px-8">
          <div
            ref={frameRef}
            className={cx(
              'relative mx-auto touch-none select-none overflow-hidden bg-black cursor-grab active:cursor-grabbing',
              isLogo ? 'aspect-square w-full max-w-[430px] rounded-full' : 'aspect-[3/1] w-full rounded-[12px]'
            )}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            onPointerCancel={handlePointerEnd}
          >
            <img
              ref={imageRef}
              src={source}
              alt="Crop preview"
              draggable="false"
              onLoad={(event) => {
                setImageSize({
                  width: event.currentTarget.naturalWidth,
                  height: event.currentTarget.naturalHeight,
                });
                setPosition({ x: 0, y: 0 });
                setZoom(1);
              }}
              className="pointer-events-none absolute left-1/2 top-1/2 max-w-none"
              style={{
                width: renderedWidth || 'auto',
                height: renderedHeight || 'auto',
                transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`,
              }}
            />
            <div className={cx('pointer-events-none absolute inset-0 border-2 border-white/90', isLogo ? 'rounded-full' : 'rounded-[12px]')} />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="rounded-full bg-black/45 px-3 py-1.5 text-[12px] font-medium text-white">Drag to reposition</span>
            </div>
          </div>
        </div>

        <div className="space-y-5 px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="text-[12px] font-semibold text-[#4b5563]">Zoom</span>
            <input
              type="range"
              min="1"
              max="3"
              step="0.01"
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
              className="h-2 flex-1 cursor-pointer accent-[#2e66a6]"
              aria-label="Image zoom"
            />
            <span className="w-12 text-right text-[12px] font-semibold text-[#4b5563]">{Math.round(zoom * 100)}%</span>
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" onClick={onCancel} disabled={applying} className="h-[42px] rounded-[10px] border border-[#d1d5db] px-5 text-sm font-semibold text-[#374151] hover:bg-[#f9fafb] disabled:opacity-60">
              Cancel
            </button>
            <button type="button" onClick={handleApply} disabled={applying || !imageSize.width} className="inline-flex h-[42px] items-center justify-center gap-2 rounded-[10px] bg-[#2e66a6] px-5 text-sm font-semibold text-white hover:bg-[#255487] disabled:cursor-not-allowed disabled:opacity-60">
              {applying ? <><SpinnerIcon className="h-4 w-4" /> Applying...</> : 'Apply Photo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const CredentialRow = ({
  item,
  uploading,
  inputRef,
  onUpload,
  onView,
  editable,
  saving,
}) => {
  const verification = item?.verification || { url: '', status: 'not_submitted' };
  const hasUploadedFile = Boolean(String(verification.url || '').trim());

  return (
    <div className="flex items-center justify-between gap-4 rounded-[12px] border border-[#d1d5db] bg-[#f3f4f6] px-4 py-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#d1d5db] bg-white text-[#6b7280]">
          <FileIcon className="w-4 h-4" />
        </div>

        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-[#000000]">{item.label}</p>
          <p className="text-[11px] text-[#6b7280]">{item.hint}</p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {hasUploadedFile ? (
          <button
            type="button"
            onClick={() => onView?.(item.key)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#d1d5db] bg-white text-[#2e66a6] transition hover:bg-[#f9fafb] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6]/30"
            aria-label={`Export ${item.label}`}
            title={`Export ${item.label}`}
          >
            <EyeIcon className="h-4 w-4" />
          </button>
        ) : (
          <StatusPill status={verification.status} url={verification.url} />
        )}

        {editable && !hasUploadedFile ? (
          <>
            <input
              ref={(el) => {
                inputRef.current[item.key] = el;
              }}
              type="file"
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={onUpload(item.key)}
              disabled={uploading || saving}
            />
            <button
              type="button"
              onClick={() => inputRef.current[item.key]?.click()}
              disabled={uploading || saving}
              className="inline-flex items-center gap-2 rounded-full border border-[#d1d5db] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#374151] hover:bg-[#f9fafb] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {uploading ? (
                <>
                  <SpinnerIcon className="w-3.5 h-3.5" />
                  Uploading
                </>
              ) : (
                'Upload'
              )}
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
};

const CompanyProfile = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [companyData, setCompanyData] = useState({
    companyName: '',
    companyWebsiteUrl: '',
    businessEmail: '',
    mobileNumber: '',
    regionCity: '',
    industry: '',
    profileVisible: true,

    companyAddress: '',
    companyDescription: '',
    facebookUrl: '',
    instagramUrl: '',
    youtubeUrl: '',
    linkedinUrl: '',
    xUrl: '',
    coverPhoto: '',
    galleryImages: [],
  });

  const [initialData, setInitialData] = useState(companyData);
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [industryDropdownOpen, setIndustryDropdownOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editStep, setEditStep] = useState(1);
  const [activeTab, setActiveTab] = useState(location.state?.activeTab || 'about');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [previewLogo, setPreviewLogo] = useState(null);
  const [logoFile, setLogoFile] = useState(null);

  const [previewCover, setPreviewCover] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [cropEditor, setCropEditor] = useState({
    isOpen: false,
    mode: 'logo',
    source: '',
    fileName: '',
  });

  const [galleryFiles, setGalleryFiles] = useState([]);
  const [galleryPreviews, setGalleryPreviews] = useState([]);

  const [verification, setVerification] = useState({
    secRegistration: { url: '', status: 'not_submitted' },
    birRegistration: { url: '', status: 'not_submitted' },
    dtiRegistration: { url: '', status: 'not_submitted' },
    cityPermit: { url: '', status: 'not_submitted' },
    businessPermit: { url: '', status: 'not_submitted' },
    overallStatus: 'unverified',
    remarks: '',
  });

  const [credentialPreview, setCredentialPreview] = useState({
    isOpen: false,
    url: '',
    title: '',
    fileName: '',
  });

  const [credentialAccess, setCredentialAccess] = useState({
    isOpen: false,
    docType: '',
    mode: 'view',
    password: '',
    error: '',
    verifying: false,
  });
  const [showCredentialPassword, setShowCredentialPassword] = useState(false);
  const [companyJobs, setCompanyJobs] = useState([]);
  const [companyReviews, setCompanyReviews] = useState([]);
  const [showAllCompanyJobs, setShowAllCompanyJobs] = useState(false);
  const [showAllCompanyReviews, setShowAllCompanyReviews] = useState(false);
  const [companyActivityLoading, setCompanyActivityLoading] = useState(false);

  const [docUploading, setDocUploading] = useState({
    secRegistration: false,
    birRegistration: false,
    dtiRegistration: false,
    cityPermit: false,
    businessPermit: false,
  });

  const logoInputRef = useRef(null);
  const docInputRefs = useRef({});
  const modalLogoInputRef = useRef(null);
  const modalCoverInputRef = useRef(null);
  const modalGalleryInputRef = useRef(null);
  const industryComboboxRef = useRef(null);
  const defaultBanner = '/images/jobback.png';

  const logoFallback = useMemo(() => {
    const name = encodeURIComponent(companyData.companyName || 'Company');
    return `https://ui-avatars.com/api/?name=${name}&background=e8eefc&color=24416b&size=256&bold=true`;
  }, [companyData.companyName]);

  const provinceOptions = useMemo(() => {
    const region = String(selectedRegion || '').trim();
    if (!region) return [];
    return PH_PROVINCES_BY_REGION?.[region] || [];
  }, [selectedRegion]);

  const cityOptions = useMemo(() => {
    const province = String(selectedProvince || '').trim();
    if (!province) return [];
    return PH_CITIES_BY_PROVINCE?.[province] || [];
  }, [selectedProvince]);

  const filteredIndustryOptions = useMemo(() => {
    const query = String(companyData.industry || '').trim().toLowerCase();

    if (!query) return INDUSTRY_OPTIONS;

    return INDUSTRY_OPTIONS.filter((option) =>
      option.toLowerCase().includes(query)
    );
  }, [companyData.industry]);

  const socialLinks = useMemo(
    () =>
      [
        { key: 'facebookUrl', label: 'Facebook', url: companyData.facebookUrl },
        { key: 'instagramUrl', label: 'Instagram', url: companyData.instagramUrl },
        { key: 'youtubeUrl', label: 'YouTube', url: companyData.youtubeUrl },
        { key: 'linkedinUrl', label: 'LinkedIn', url: companyData.linkedinUrl },
        { key: 'xUrl', label: 'X / Twitter', url: companyData.xUrl },
      ].filter((item) => String(item.url || '').trim()),
    [companyData.facebookUrl, companyData.instagramUrl, companyData.youtubeUrl, companyData.linkedinUrl, companyData.xUrl]
  );

  const persistedGalleryItems = useMemo(() => normalizeGalleryItems(companyData.galleryImages), [companyData.galleryImages]);

  const galleryDisplayItems = useMemo(() => {
    const localItems = galleryPreviews.map((item, index) => ({
      _id: item.id || `local-${index}`,
      url: item.url,
      caption: item.caption || '',
      uploadedAt: null,
      isLocal: true,
    }));
    return [...persistedGalleryItems, ...localItems];
  }, [persistedGalleryItems, galleryPreviews]);

  const isDirty = useMemo(() => {
    if (logoFile || coverFile || galleryFiles.length > 0) return true;
    return !isEqualShallow(companyData, initialData);
  }, [companyData, initialData, logoFile, coverFile, galleryFiles]);

  const clearMessages = useCallback(() => {
    setError('');
    setSuccess('');
  }, []);

  const clearFieldErrors = useCallback(() => {
    setFieldErrors({});
  }, []);

  const revokeLocalPreviewUrls = useCallback(() => {
    setGalleryPreviews((prev) => {
      prev.forEach((item) => {
        if (item?.url?.startsWith('blob:')) URL.revokeObjectURL(item.url);
      });
      return [];
    });
  }, []);

  const resetLocalUploads = useCallback(() => {
    if (previewLogo?.startsWith('blob:')) URL.revokeObjectURL(previewLogo);
    if (previewCover?.startsWith('blob:')) URL.revokeObjectURL(previewCover);
    revokeLocalPreviewUrls();

    setLogoFile(null);
    setCoverFile(null);
    setGalleryFiles([]);
  }, [previewCover, previewLogo, revokeLocalPreviewUrls]);

  const closeCropEditor = useCallback(() => {
    setCropEditor((current) => {
      if (current.source?.startsWith('blob:')) URL.revokeObjectURL(current.source);
      return { isOpen: false, mode: 'logo', source: '', fileName: '' };
    });
  }, []);

  const fetchCompanyProfile = useCallback(async () => {
    try {
      setLoading(true);
      clearMessages();
      clearFieldErrors();

      const response = await api.get('/auth/me');

      if (response.data?.success) {
        const user = response.data.user;
        const p = user?.employerProfile || {};

        const next = {
          companyName: p?.companyName || '',
          companyWebsiteUrl: p?.companyWebsiteUrl || '',
          businessEmail: p?.businessEmail || user?.email || '',
          mobileNumber: p?.mobileNumber || '',
          regionCity: p?.regionCity || '',
          industry: p?.industry || '',
          profileVisible: p?.profileVisible !== false,

          companyAddress: p?.companyAddress || '',
          companyDescription: p?.companyDescription || '',
          facebookUrl: p?.facebookUrl || '',
          instagramUrl: p?.instagramUrl || '',
          youtubeUrl: p?.youtubeUrl || '',
          linkedinUrl: p?.linkedinUrl || '',
          xUrl: p?.xUrl || '',
          coverPhoto: p?.coverPhoto || '',
          galleryImages: Array.isArray(p?.galleryImages) ? p.galleryImages : [],
        };

        setCompanyData(next);
        setInitialData(next);
        setPreviewLogo(p?.companyLogo || null);
        setPreviewCover(p?.coverPhoto || null);
        setLogoFile(null);
        setCoverFile(null);
        revokeLocalPreviewUrls();
        setGalleryFiles([]);
        setCompanyReviews(Array.isArray(p?.reviews) ? p.reviews : []);

        setCompanyActivityLoading(true);
        try {
          const jobsResponse = await api.get('/jobs/employer/my-jobs');
          const jobs = Array.isArray(jobsResponse?.data?.jobs) ? jobsResponse.data.jobs : [];
          setCompanyJobs(
            jobs.filter((job) =>
              job?.isPublished === true &&
              job?.isActive === true &&
              job?.isArchived !== true
            )
          );
        } catch (jobsError) {
          console.error('Failed to load company jobs:', jobsError);
          setCompanyJobs([]);
        } finally {
          setCompanyActivityLoading(false);
        }

        const parsed = parseRegionLocation(next.regionCity, next.companyAddress);
        setSelectedRegion(parsed.region);
        setSelectedProvince(parsed.province);
        setSelectedCity(parsed.city);

        const v = p?.verificationDocs || {};
        setVerification({
          secRegistration: { url: v?.secRegistration?.url || '', status: v?.secRegistration?.status || 'not_submitted' },
          birRegistration: { url: v?.birRegistration?.url || '', status: v?.birRegistration?.status || 'not_submitted' },
          dtiRegistration: { url: v?.dtiRegistration?.url || '', status: v?.dtiRegistration?.status || 'not_submitted' },
          cityPermit: { url: v?.cityPermit?.url || '', status: v?.cityPermit?.status || 'not_submitted' },
          businessPermit: { url: v?.businessPermit?.url || '', status: v?.businessPermit?.status || 'not_submitted' },
          overallStatus: v?.overallStatus || 'unverified',
          remarks: v?.remarks || '',
        });
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
      setError('Failed to load company profile.');
    } finally {
      setLoading(false);
    }
  }, [clearFieldErrors, clearMessages, revokeLocalPreviewUrls]);

  useEffect(() => {
    fetchCompanyProfile();
  }, [fetchCompanyProfile]);

  useEffect(() => {
    return () => {
      if (previewLogo?.startsWith('blob:')) URL.revokeObjectURL(previewLogo);
      if (previewCover?.startsWith('blob:')) URL.revokeObjectURL(previewCover);
      galleryPreviews.forEach((item) => {
        if (item?.url?.startsWith('blob:')) URL.revokeObjectURL(item.url);
      });
    };
  }, [galleryPreviews, previewCover, previewLogo]);

  useEffect(() => {
    return () => {
      if (credentialPreview.url) window.URL.revokeObjectURL(credentialPreview.url);
    };
  }, [credentialPreview.url]);

  useEffect(() => {
    return () => {
      if (cropEditor.source?.startsWith('blob:')) URL.revokeObjectURL(cropEditor.source);
    };
  }, [cropEditor.source]);

  useEffect(() => {
    if (location.hash) {
      const hash = location.hash.replace('#', '').toLowerCase();
      if (['about', 'credentials', 'social-media', 'gallery'].includes(hash)) {
        if (hash === 'social-media') setActiveTab('social');
        else setActiveTab(hash);
      }
    }
  }, [location.hash]);

  useEffect(() => {
    if (!isEditOpen) return;

    const combinedRegionCity = composeRegionCity(
      selectedRegion,
      selectedProvince,
      selectedCity
    );

    setCompanyData((prev) => {
      if (prev.regionCity === combinedRegionCity) {
        return prev;
      }

      return {
        ...prev,
        regionCity: combinedRegionCity,
      };
    });
  }, [selectedRegion, selectedProvince, selectedCity, isEditOpen]);

  useEffect(() => {
    if (!industryDropdownOpen) return undefined;

    const handleOutsideClick = (event) => {
      if (
        industryComboboxRef.current &&
        !industryComboboxRef.current.contains(event.target)
      ) {
        setIndustryDropdownOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIndustryDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [industryDropdownOpen]);

  const handleInputChange = useCallback(
    (e) => {
      const { name, value } = e.target;
      setCompanyData((prev) => ({ ...prev, [name]: value }));
      clearMessages();
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    },
    [clearMessages]
  );

  const validateImageDimensions = useCallback(async (file, minDimension = null) => {
    const blobUrl = URL.createObjectURL(file);

    try {
      const dims = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ w: img.width, h: img.height });
        img.onerror = reject;
        img.src = blobUrl;
      });

      if (minDimension && (dims.w < minDimension || dims.h < minDimension)) {
        throw new Error(`Image must be at least ${minDimension}×${minDimension} pixels.`);
      }

      return { blobUrl, ...dims };
    } catch (err) {
      URL.revokeObjectURL(blobUrl);
      throw err;
    }
  }, []);

  const handleLogoChange = useCallback(
    async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      clearMessages();
      clearFieldErrors();

      if (!file.type.startsWith('image/')) {
        setError('Please select an image file.');
        return;
      }

      if (file.size > MAX_LOGO_SIZE_BYTES) {
        setError('Logo must be less than 5MB.');
        return;
      }

      try {
        const { blobUrl, w, h } = await validateImageDimensions(file, MIN_LOGO_DIM);

        const ratio = w / h;
        if (ratio < MIN_RATIO || ratio > MAX_RATIO) {
          URL.revokeObjectURL(blobUrl);
          setError('Logo aspect ratio is too extreme.');
          return;
        }

        setCropEditor({
          isOpen: true,
          mode: 'logo',
          source: blobUrl,
          fileName: file.name,
        });
      } catch (err) {
        console.error(err);
        setError(err.message || 'Could not read image.');
      } finally {
        e.target.value = '';
      }
    },
    [clearFieldErrors, clearMessages, validateImageDimensions]
  );

  const handleCoverChange = useCallback(
    async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      clearMessages();
      clearFieldErrors();

      if (!file.type.startsWith('image/')) {
        setError('Please select a valid cover image.');
        return;
      }

      if (file.size > MAX_COVER_SIZE_BYTES) {
        setError('Cover photo must be 5MB or smaller.');
        return;
      }

      const blobUrl = URL.createObjectURL(file);
      setCropEditor({
        isOpen: true,
        mode: 'cover',
        source: blobUrl,
        fileName: file.name,
      });
      e.target.value = '';
    },
    [clearFieldErrors, clearMessages]
  );

  const applyCroppedImage = useCallback(
    (croppedFile) => {
      const previewUrl = URL.createObjectURL(croppedFile);

      if (cropEditor.mode === 'logo') {
        if (previewLogo?.startsWith('blob:')) URL.revokeObjectURL(previewLogo);
        setLogoFile(croppedFile);
        setPreviewLogo(previewUrl);
      } else {
        if (previewCover?.startsWith('blob:')) URL.revokeObjectURL(previewCover);
        setCoverFile(croppedFile);
        setPreviewCover(previewUrl);
      }

      closeCropEditor();
    },
    [closeCropEditor, cropEditor.mode, previewCover, previewLogo]
  );

  const handleGalleryPick = useCallback(
    (e) => {
      const pickedFiles = Array.from(e.target.files || []);
      if (!pickedFiles.length) return;

      clearMessages();
      clearFieldErrors();

      const currentCount = persistedGalleryItems.length + galleryPreviews.length;
      if (currentCount + pickedFiles.length > MAX_GALLERY_IMAGES) {
        setError(`You can upload up to ${MAX_GALLERY_IMAGES} gallery images only.`);
        e.target.value = '';
        return;
      }

      const invalid = pickedFiles.find((file) => !file.type.startsWith('image/'));
      if (invalid) {
        setError('Only image files are allowed in the gallery.');
        e.target.value = '';
        return;
      }

      const tooLarge = pickedFiles.find((file) => file.size > MAX_GALLERY_SIZE_BYTES);
      if (tooLarge) {
        setError('Each gallery image must be 5MB or smaller.');
        e.target.value = '';
        return;
      }

      const nextFiles = [];
      const nextPreviews = [];

      pickedFiles.forEach((file, index) => {
        const blobUrl = URL.createObjectURL(file);
        const id = `${Date.now()}-${index}-${file.name}`;
        nextFiles.push(file);
        nextPreviews.push({
          id,
          file,
          url: blobUrl,
          caption: '',
        });
      });

      setGalleryFiles((prev) => [...prev, ...nextFiles]);
      setGalleryPreviews((prev) => [...prev, ...nextPreviews]);

      e.target.value = '';
    },
    [clearFieldErrors, clearMessages, galleryPreviews.length, persistedGalleryItems.length]
  );

  const removeLocalGalleryPreview = useCallback((id) => {
    setGalleryPreviews((prev) => {
      const found = prev.find((item) => item.id === id);
      if (found?.url?.startsWith('blob:')) {
        URL.revokeObjectURL(found.url);
      }
      return prev.filter((item) => item.id !== id);
    });

    setGalleryFiles((prev) => {
      const index = galleryPreviews.findIndex((item) => item.id === id);
      if (index < 0) return prev;
      return prev.filter((_, i) => i !== index);
    });
  }, [galleryPreviews]);

  const openEditModal = useCallback(() => {
    clearMessages();
    clearFieldErrors();

    const parsed = parseRegionLocation(
      companyData.regionCity,
      companyData.companyAddress
    );
    setSelectedRegion(parsed.region);
    setSelectedProvince(parsed.province);
    setSelectedCity(parsed.city);
    setIndustryDropdownOpen(false);
    setEditStep(1);
    setIsEditOpen(true);
  }, [
    clearFieldErrors,
    clearMessages,
    companyData.companyAddress,
    companyData.regionCity,
  ]);

  const handleCancel = useCallback(async () => {
    if (isDirty && !window.confirm('Discard unsaved changes?')) return;

    clearMessages();
    clearFieldErrors();
    setIndustryDropdownOpen(false);
    setIsEditOpen(false);
    resetLocalUploads();
    await fetchCompanyProfile();
  }, [clearFieldErrors, clearMessages, fetchCompanyProfile, isDirty, resetLocalUploads]);

  const validateClient = useCallback(() => {
    const next = {};

    const companyName = String(companyData.companyName || '').trim();
    const businessEmail = String(companyData.businessEmail || '').trim();
    const mobileNumber = String(companyData.mobileNumber || '').trim();
    const companyAddress = String(companyData.companyAddress || '').trim();
    const industry = String(companyData.industry || '').trim();
    const companyDescription = String(companyData.companyDescription || '').trim();

    if (!previewLogo) next.companyLogo = 'Company logo is required.';

    if (!companyName) next.companyName = 'Company name is required.';
    else if (companyName.length > MAX_COMPANY_NAME_LENGTH) {
      next.companyName = `Company name must not exceed ${MAX_COMPANY_NAME_LENGTH} characters.`;
    }

    if (!selectedRegion?.trim()) next.region = 'Region is required.';
    if (!selectedProvince?.trim()) next.province = 'Province is required.';
    if (!selectedCity?.trim()) next.city = 'City / Municipality is required.';

    if (!companyAddress) {
      next.companyAddress = 'Complete office address is required.';
    } else if (companyAddress.length > MAX_OFFICE_ADDRESS_LENGTH) {
      next.companyAddress = `Office address must not exceed ${MAX_OFFICE_ADDRESS_LENGTH} characters.`;
    }

    if (!businessEmail) {
      next.businessEmail = 'Contact email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(businessEmail)) {
      next.businessEmail = 'Enter a valid contact email.';
    }

    if (!mobileNumber) {
      next.mobileNumber = 'Contact number is required.';
    }

    if (!industry) next.industry = 'Industry is required.';
    else if (industry.length > MAX_INDUSTRY_LENGTH) {
      next.industry = `Industry must not exceed ${MAX_INDUSTRY_LENGTH} characters.`;
    }

    if (!companyDescription) {
      next.companyDescription = 'Company description is required.';
    } else if (companyDescription.length < MIN_COMPANY_DESCRIPTION_LENGTH) {
      next.companyDescription = `Company description must contain at least ${MIN_COMPANY_DESCRIPTION_LENGTH} characters.`;
    } else if (companyDescription.length > MAX_COMPANY_DESCRIPTION_LENGTH) {
      next.companyDescription = `Company description must not exceed ${MAX_COMPANY_DESCRIPTION_LENGTH} characters.`;
    }

    if (!(previewCover || companyData.coverPhoto)) {
      next.coverPhoto = 'Cover photo is required.';
    }

    if (galleryDisplayItems.length === 0) {
      next.galleryImages = 'At least one gallery photo is required.';
    }

    setFieldErrors(next);
    return { ok: Object.keys(next).length === 0, errors: next };
  }, [
    companyData.businessEmail,
    companyData.companyAddress,
    companyData.companyDescription,
    companyData.companyName,
    companyData.coverPhoto,
    companyData.industry,
    companyData.mobileNumber,
    galleryDisplayItems.length,
    previewCover,
    previewLogo,
    selectedCity,
    selectedProvince,
    selectedRegion,
  ]);

  const validateEditStep = useCallback((step) => {
    const all = validateClient().errors;
    const stepKeys = {
      1: ['companyLogo', 'companyName', 'region', 'province', 'city', 'companyAddress', 'businessEmail', 'mobileNumber'],
      2: ['industry', 'companyDescription'],
      3: ['coverPhoto'],
      4: ['galleryImages'],
    };

    const allowedKeys = new Set(stepKeys[step] || []);
    const stepErrors = Object.fromEntries(
      Object.entries(all).filter(([key]) => allowedKeys.has(key))
    );

    setFieldErrors(stepErrors);

    if (Object.keys(stepErrors).length > 0) {
      setError('Please complete the required fields before continuing.');
      return false;
    }

    clearMessages();
    return true;
  }, [clearMessages, validateClient]);

  const goToNextEditStep = useCallback(() => {
    if (!validateEditStep(editStep)) return;
    setEditStep((current) => Math.min(4, current + 1));
    window.requestAnimationFrame(() => {
      document.querySelector('[data-company-edit-top="true"]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [editStep, validateEditStep]);

  const goToPreviousEditStep = useCallback(() => {
    clearMessages();
    setFieldErrors({});
    setEditStep((current) => Math.max(1, current - 1));
    window.requestAnimationFrame(() => {
      document.querySelector('[data-company-edit-top="true"]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [clearMessages]);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      clearMessages();
      clearFieldErrors();

      const v = validateClient();
      if (!v.ok) {
        setError('Please fix the highlighted fields.');
        return;
      }

      setSaving(true);

      try {
        const fd = new FormData();

        Object.keys(companyData).forEach((key) => {
          if (key === 'galleryImages') {
            const retainedUrls = persistedGalleryItems.map((item) => item.url);
            fd.append('galleryImages', JSON.stringify(retainedUrls));
            return;
          }

          if (key === 'coverPhoto') {
            fd.append(key, companyData[key] ?? '');
            return;
          }

          fd.append(key, companyData[key] ?? '');
        });

        fd.set(
          'regionCity',
          composeRegionCity(selectedRegion, selectedProvince, selectedCity)
        );
        fd.set(
          'companyAddress',
          String(companyData.companyAddress || '').trim()
        );
        fd.set('industry', normalizeIndustryValue(companyData.industry));

        if (logoFile) fd.append('companyLogo', logoFile);
        if (coverFile) fd.append('coverPhotoFile', coverFile);
        galleryFiles.forEach((file) => {
          fd.append('galleryImagesFiles', file);
        });

        const response = await api.put('/auth/update-company-profile', fd, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        if (response.data?.success) {
          setSuccess('Company profile updated successfully.');
          setIsEditOpen(false);
          resetLocalUploads();
          await fetchCompanyProfile();
        }
      } catch (err) {
        console.error('Update failed:', err);
        setError(err.response?.data?.message || 'Failed to update profile.');
      } finally {
        setSaving(false);
      }
    },
    [
      clearFieldErrors,
      clearMessages,
      companyData,
      coverFile,
      fetchCompanyProfile,
      galleryFiles,
      logoFile,
      persistedGalleryItems,
      resetLocalUploads,
      selectedCity,
      selectedProvince,
      selectedRegion,
      validateClient,
    ]
  );

  const closeCredentialPreview = useCallback(() => {
    setCredentialPreview((prev) => {
      if (prev.url) window.URL.revokeObjectURL(prev.url);
      return { isOpen: false, url: '', title: '', fileName: '' };
    });
  }, []);

  const openCredentialAccess = useCallback((docType, mode) => {
    clearMessages();
    setShowCredentialPassword(false);
    setCredentialAccess({
      isOpen: true,
      docType,
      mode,
      password: '',
      error: '',
      verifying: false,
    });
  }, [clearMessages]);

  const closeCredentialAccess = useCallback(() => {
    setShowCredentialPassword(false);
    setCredentialAccess({
      isOpen: false,
      docType: '',
      mode: 'view',
      password: '',
      error: '',
      verifying: false,
    });
  }, []);

  const getCredentialFileName = useCallback((response, docLabel) => {
    const disposition = response.headers?.['content-disposition'] || '';
    const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
    const basicMatch = disposition.match(/filename="?([^";]+)"?/i);
    const rawName = utf8Match?.[1] || basicMatch?.[1] || `${docLabel} - credential`;
    try {
      return decodeURIComponent(rawName);
    } catch {
      return rawName;
    }
  }, []);

  const submitCredentialAccess = useCallback(
    async (event) => {
      event.preventDefault();

      const password = String(credentialAccess.password || '').trim();
      if (!password) {
        setCredentialAccess((prev) => ({ ...prev, error: 'Please enter your password.' }));
        return;
      }

      const docType = credentialAccess.docType;
      const mode = credentialAccess.mode;
      const docLabel = DOC_TYPES.find((doc) => doc.key === docType)?.label || 'Credential';

      try {
        setCredentialAccess((prev) => ({ ...prev, verifying: true, error: '' }));

        const response = await api.post(
          `/auth/verification/${docType}/secure-access`,
          {
            password,
            disposition: mode === 'download' ? 'attachment' : 'inline',
          },
          { responseType: 'blob' }
        );

        const blob = new Blob([response.data], {
          type: response.headers?.['content-type'] || 'application/octet-stream',
        });
        const fileUrl = window.URL.createObjectURL(blob);
        const fileName = getCredentialFileName(response, docLabel);

        closeCredentialAccess();

        if (mode === 'download') {
          const anchor = document.createElement('a');
          anchor.href = fileUrl;
          anchor.download = fileName;
          document.body.appendChild(anchor);
          anchor.click();
          anchor.remove();
          window.setTimeout(() => window.URL.revokeObjectURL(fileUrl), 1000);
          return;
        }

        setCredentialPreview((prev) => {
          if (prev.url) window.URL.revokeObjectURL(prev.url);
          return {
            isOpen: true,
            url: fileUrl,
            title: docLabel,
            fileName,
          };
        });
      } catch (err) {
        let message = 'Unable to access this credential. Please try again.';

        if (err.response?.data instanceof Blob) {
          try {
            const errorText = await err.response.data.text();
            const parsed = JSON.parse(errorText);
            message = parsed?.message || message;
          } catch {
            // Keep fallback message.
          }
        } else if (err.response?.data?.message) {
          message = err.response.data.message;
        }

        setCredentialAccess((prev) => ({
          ...prev,
          verifying: false,
          error: message,
        }));
      }
    },
    [closeCredentialAccess, credentialAccess, getCredentialFileName]
  );

  const viewVerificationDoc = useCallback(
    (docType) => openCredentialAccess(docType, 'view'),
    [openCredentialAccess]
  );

  const uploadVerificationDoc = useCallback(
    async (docType, file) => {
      clearMessages();

      if (!file) return;

      if (file.size > MAX_DOC_SIZE_BYTES) {
        setError('File must be less than 10MB.');
        return;
      }

      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!ext || !ALLOWED_DOC_EXT.includes(ext)) {
        setError(`Allowed formats: ${ALLOWED_DOC_EXT.join(', ').toUpperCase()}`);
        return;
      }

      try {
        setDocUploading((prev) => ({ ...prev, [docType]: true }));

        const fd = new FormData();
        fd.append('file', file);

        const res = await api.post(`/auth/upload-verification/${docType}`, fd, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        if (res.data?.success) {
          setSuccess('Document uploaded successfully.');
          await fetchCompanyProfile();
        }
      } catch (err) {
        console.error('Upload failed:', err);
        setError(err.response?.data?.message || 'Failed to upload document.');
      } finally {
        setDocUploading((prev) => ({ ...prev, [docType]: false }));
      }
    },
    [clearMessages, fetchCompanyProfile]
  );

  const handleDocPick = useCallback(
    (docType) => (e) => {
      const file = e.target.files?.[0];
      if (file) uploadVerificationDoc(docType, file);
      e.target.value = '';
    },
    [uploadVerificationDoc]
  );

  const coverImage = previewCover || companyData.coverPhoto || defaultBanner;
  const hasAbout = Boolean(String(companyData.companyDescription || '').trim());
  const hasGallery = galleryDisplayItems.length > 0;
  const activeCredentialLabel =
    DOC_TYPES.find((doc) => doc.key === credentialAccess.docType)?.label || 'Credential';
  const hasSocial = socialLinks.length > 0;

  if (loading) {
    return (
      <EmployerLayout>
        <div className="min-h-screen bg-[#FFFFFF]">
          <div className="mx-auto max-w-[1180px] px-4 py-10">
            <div className="flex min-h-[420px] items-center justify-center">
              <div className="text-center">
                <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-[#2e66a6] border-t-transparent" />
                <p className="mt-4 text-sm text-[#6b7280]">Loading company profile...</p>
              </div>
            </div>
          </div>
        </div>
      </EmployerLayout>
    );
  }

  return (
    <EmployerLayout>
      <div className="min-h-screen ">
    <div className="mx-auto max-w-7xl px-1 py-8">
          <button
            type="button"
            onClick={() => navigate('/employer/dashboard')}
            className="mb-5 inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
          >
            <span className="text-lg leading-none">←</span>
            Back
          </button>

          {(error || success) && (
            <div className="mb-4 space-y-3">
              {error ? (
                <div className="rounded-[14px] border border-red-200 bg-red-50 px-4 py-3">
                  <div className="flex items-center gap-2 text-red-700">
                    <WarningIcon className="h-5 w-5" />
                    <p className="text-sm font-medium">{error}</p>
                  </div>
                </div>
              ) : null}

              {success ? (
                <div className="rounded-[14px] border border-[#d1d5db] bg-[#f3f4f6] px-4 py-3">
                  <div className="flex items-center gap-2 text-[#2e66a6]">
                    <CheckCircleIcon className="h-5 w-5" />
                    <p className="text-sm font-medium">{success}</p>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          <div className="overflow-hidden rounded-[16px]">
            <div className="relative h-[220px] sm:h-[260px] lg:h-[300px] overflow-hidden rounded-t-[16px] border border-b-0 border-[#d1d5db] bg-white">
              <img src={coverImage} alt="Company cover" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-black/5" />
            </div>

            <div className="rounded-b-[16px] border border-t-0 border-[#d1d5db] bg-[#f8f9f9] px-3 pb-0 pt-0">
              <div className="rounded-b-[16px] bg-[#f8f9f9]">
                <div className="flex flex-col gap-5 px-2 pb-0 pt-0 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="mt-2 sm:mt-3">
                      <div className="flex h-[86px] w-[86px] items-center justify-center overflow-hidden rounded-[14px] border border-[#d1d5db] bg-[#f3f4f6] shadow-sm">
                        <img
                          src={previewLogo || logoFallback}
                          alt="Company logo"
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = logoFallback;
                          }}
                        />
                      </div>
                    </div>

                    <div className="pt-2 mt-4">
                      <h1 className="text-[28px] font-bold leading-[1.15] text-[#000000]">
                        {companyData.companyName || 'Your Company'}
                      </h1>

                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[13px] font-medium text-[#2e66a6]">
                        <BuildingIcon className="h-4 w-4 text-[#000000]" />
                        <span>{companyData.industry || 'Industry not specified'}</span>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[15px] text-[#374151]">
                        <LocationIcon className="h-4 w-4 text-[#000000]" />
                        <span>{formatCompanyLocation(companyData.regionCity, companyData.companyAddress)}</span>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <GlobeIcon className="h-4 w-4 text-[#2e66a6]" />
                        {companyData.companyWebsiteUrl ? (
                          <a
                            href={normalizeUrl(companyData.companyWebsiteUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-[15px] text-[#2e66a6] hover:underline"
                          >
                            <span>{companyData.companyWebsiteUrl}</span>
                            <ExternalIcon className="h-3.5 w-3.5" />
                          </a>
                        ) : (
                          <span className="text-[15px] text-[#6b7280]">No website added yet.</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 lg:pt-6">
                    <button
                      type="button"
                      onClick={openEditModal}
                      className="inline-flex h-[36px] items-center gap-2 rounded-full bg-[#2e66a6] px-4 text-[12px] font-semibold text-white shadow-sm transition hover:bg-[#255487]"
                    >
                      <MiniPencilIcon className="h-3.5 w-3.5" />
                      Edit Profile
                    </button>
                  </div>
                </div>

                <div className="mt-6 border-b border-[#d1d5db] px-4">
                  <div className="flex flex-wrap items-center gap-8">
                    <TabButton active={activeTab === 'about'} onClick={() => setActiveTab('about')}>
                      About
                    </TabButton>
                    <TabButton active={activeTab === 'jobs'} onClick={() => setActiveTab('jobs')}>
                      Jobs <span className="ml-1 text-xs text-[#6b7280]">({companyJobs.length})</span>
                    </TabButton>
                    <TabButton active={activeTab === 'credentials'} onClick={() => setActiveTab('credentials')}>
                      Credentials
                    </TabButton>
                    <TabButton active={activeTab === 'social'} onClick={() => setActiveTab('social')}>
                      Social Media
                    </TabButton>
                    <TabButton active={activeTab === 'gallery'} onClick={() => setActiveTab('gallery')}>
                      Gallery
                    </TabButton>
                    <TabButton active={activeTab === 'reviews'} onClick={() => setActiveTab('reviews')}>
                      Reviews <span className="ml-1 text-xs text-[#6b7280]">({companyReviews.length})</span>
                    </TabButton>
                  </div>
                </div>

                <div className="px-2 py-3">
                  {activeTab === 'about' && (
                    <div className="rounded-[18px] border border-[#d1d5db] bg-white p-8 shadow-[0_2px_6px_rgba(15,23,42,0.05)]">
                      <h2 className="text-[28px] font-semibold text-[#000000]">About</h2>

                      {hasAbout ? (
                        <div className="mt-5 whitespace-pre-line text-[15px] leading-8 text-[#4b5563]">
                          {companyData.companyDescription}
                        </div>
                      ) : (
                        <EmptyState
                          icon={AboutEmptyIcon}
                          title="No description added yet."
                          subtitle={'Click "Edit Profile" to add your company story.'}
                        />
                      )}
                    </div>
                  )}

                  {activeTab === 'credentials' && (
                    <div className="rounded-[18px] border border-[#d1d5db] bg-white p-7 shadow-[0_2px_6px_rgba(15,23,42,0.05)]">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h2 className="text-[30px] font-semibold text-[#000000]">Business Credentials</h2>
                          <p className="mt-1 text-[13px] text-[#6b7280]">Submit during account creation</p>
                        </div>
                      </div>

                      <div className="mt-5 space-y-3">
                        {DOC_TYPES.map((doc) => (
                          <CredentialRow
                            key={doc.key}
                            item={{ ...doc, verification: verification[doc.key] }}
                            uploading={docUploading[doc.key]}
                            inputRef={docInputRefs}
                            onUpload={handleDocPick}
                            onView={viewVerificationDoc}
                            editable={true}
                            saving={saving}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {activeTab === 'social' && (
                    <div className="rounded-[18px] border border-[#d1d5db] bg-white p-7 shadow-[0_2px_6px_rgba(15,23,42,0.05)]">
                      <h2 className="text-[30px] font-semibold text-[#000000]">Linked Accounts</h2>

                      {hasSocial ? (
                        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
                          {socialLinks.map((item) => (
                            <a
                              key={item.key}
                              href={normalizeUrl(item.url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-between rounded-[14px] border border-[#d1d5db] bg-[#FFFFFF] px-4 py-4 transition hover:border-[#d1d5db]"
                            >
                              <div className="flex min-w-0 items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#d1d5db] bg-white text-[#6b7280]">
                                  <LinkIcon className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-[#000000]">{item.label}</p>
                                  <p className="truncate text-xs text-[#6b7280]">{item.url}</p>
                                </div>
                              </div>
                              <ExternalIcon className="h-4 w-4 shrink-0 text-[#2e66a6]" />
                            </a>
                          ))}
                        </div>
                      ) : (
                        <EmptyState
                          icon={PaperPlaneIcon}
                          title="No social accounts linked yet."
                          subtitle={'Click "Edit Profile" to connect your accounts.'}
                        />
                      )}
                    </div>
                  )}

                  {activeTab === 'gallery' && (
                    <div className="rounded-[18px] border border-[#d1d5db] bg-white p-7 shadow-[0_2px_6px_rgba(15,23,42,0.05)]">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h2 className="text-[30px] font-semibold text-[#000000]">Gallery</h2>
                          {hasGallery ? (
                            <p className="mt-1 text-[13px] text-[#6b7280]">Company photos and visual highlights</p>
                          ) : null}
                        </div>

                      </div>

                      {hasGallery ? (
                        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          {galleryDisplayItems.map((image, index) => (
                            <div
                              key={`${image._id || image.url}-${index}`}
                              className="overflow-hidden rounded-[16px] border border-[#d1d5db] bg-[#FFFFFF]"
                            >
                              <img
                                src={image.url}
                                alt={`Gallery ${index + 1}`}
                                className="h-[220px] w-full object-cover"
                              />
                              {image.caption ? (
                                <div className="border-t border-[#d1d5db] bg-white px-4 py-3 text-[13px] text-[#4b5563]">
                                  {image.caption}
                                </div>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <EmptyState
                          icon={ImageIcon}
                          title="No photos added yet."
                          subtitle={'Click "Edit Profile" to upload company photos.'}
                        />
                      )}
                    </div>
                  )}

                  {activeTab === 'jobs' && (
                    <div className="rounded-[18px] border border-[#d1d5db] bg-white p-7 shadow-[0_2px_6px_rgba(15,23,42,0.05)]">
                      {showAllCompanyJobs ? (
                        <button type="button" onClick={() => setShowAllCompanyJobs(false)} className="mb-5 inline-flex items-center gap-2 rounded-xl border border-[#d1d5db] bg-white px-4 py-2 text-[14px] font-semibold text-[#2e66a6] hover:bg-[#f5f8fc]">
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
</svg> Back 
                        </button>
                      ) : null}
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <h2 className="text-[24px] font-bold text-black">Jobs at {companyData.companyName || 'Company'}</h2>
                          <p className="mt-1 text-[16px] text-black/65">{companyJobs.length} Open position{companyJobs.length === 1 ? '' : 's'}</p>
                        </div>
                        {companyJobs.length && !showAllCompanyJobs ? (
                          <button type="button" onClick={() => setShowAllCompanyJobs(true)} className="inline-flex items-center gap-2 
                          text-[15px] font-medium text-[#2e66a6] 
                          hover:text-[#25578f]">View all jobs  <svg
                            className="w-[18px] h-[18px] shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                          </svg></button>
                        ) : null}
                      </div>

                      {companyActivityLoading ? (
                        <div className="flex justify-center py-12"><SpinnerIcon className="h-6 w-6 text-[#2e66a6]" /></div>
                      ) : companyJobs.length ? (
                        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                          {(showAllCompanyJobs ? companyJobs : companyJobs.slice(0, 6)).map((job) => (
                            <article key={job._id} className="flex min-h-[350px] flex-col rounded-[22px] border border-[#E5E7EB] bg-white p-5 shadow-[0_6px_18px_rgba(0,0,0,0.045)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(33,44,97,0.13)]">
                              <div className="flex items-start gap-4">
                                <img src={previewLogo || logoFallback} alt="" className="h-14 w-14 shrink-0 rounded-xl border border-[#e5e7eb] object-cover" />
                                <div className="min-w-0"><h3 className="truncate text-lg font-bold text-gray-800">{job.title || 'Job Title'}</h3><div className="mt-1 flex items-center gap-2"><span className="truncate text-sm font-medium text-gray-600">{companyData.companyName}</span><img src="/images/checkmo.png" alt="Verified" className="h-5 w-5 shrink-0 object-contain" /></div></div>
                              </div>
                              <div className="mt-4 rounded-xl bg-[#F3F4F6] p-4 text-sm text-gray-700">
                                <div className="flex min-w-0 items-center gap-2">
                                  <JobCardIcon name="location" className="h-4 w-4 shrink-0 text-gray-600" />
                                  <span className="min-w-0 flex-1 truncate">{job.location || 'Location not specified'}</span>
                                </div>
                                <div className="mt-2 flex min-w-0 items-center gap-2">
                                  <span className="flex h-4 w-4 shrink-0 items-center justify-center text-[14px] font-extrabold leading-none text-gray-600">₱</span>
                                  <span className="min-w-0 flex-1 truncate">{formatJobSalary(job)}</span>
                                </div>
                                <div className="mt-2 flex min-w-0 items-center gap-2">
                                  <JobCardIcon name="contract" className="h-4 w-4 shrink-0 text-gray-600" />
                                  <span className="min-w-0 flex-1 truncate">{job.jobType || 'Type not specified'}</span>
                                </div>
                              </div>
                              <div className="mt-3 flex min-w-0 items-center gap-2 text-[13px] font-medium text-gray-600">
                                <svg className="h-4 w-4 flex-shrink-0 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10m-11 9h12a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v11a2 2 0 002 2z" />
                                </svg>
                                <span className="min-w-0 flex-1 truncate">{formatJobDeadline(job.applicationDeadline)}</span>
                              </div>
                              <div className="mt-4 flex flex-wrap gap-2">{[job.experienceLevel, job.workMode, job.openToFreshGraduates ? 'Open fresh grad' : ''].filter(Boolean).map((tag) => <span key={tag} className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-[#2e66a6]">{tag}</span>)}</div>
                              <div className="mt-auto border-t border-gray-300/80 pt-4"><button type="button" onClick={() => navigate(`/employer/manage-jobs/${job._id}/view`)} className="h-10 w-full rounded-xl bg-[#1e4ba0] px-5 text-sm font-semibold text-white hover:bg-[#1b4290]">View Job</button></div>
                            </article>
                          ))}
                        </div>
                      ) : (
                        <EmptyState icon={AboutEmptyIcon} title="No job posts yet." subtitle="Your company's job posts will appear here." />
                      )}
                    </div>
                  )}

                  {activeTab === 'reviews' && (
                    <div className="rounded-[18px] border border-[#d1d5db] bg-white p-7 shadow-[0_2px_6px_rgba(15,23,42,0.05)]">
                      {showAllCompanyReviews ? (
                        <button type="button" onClick={() => setShowAllCompanyReviews(false)} className="mb-5 inline-flex items-center gap-2 rounded-xl border border-[#d1d5db] bg-white px-4 py-2 text-[14px] font-semibold text-[#2e66a6] hover:bg-[#f5f8fc]">
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
</svg> Back 
                        </button>
                      ) : null}
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div><h2 className="text-[24px] font-bold text-black">Application process at {companyData.companyName || 'Company'}</h2><p className="mt-1 text-[16px] text-black/65">{companyReviews.length} review{companyReviews.length === 1 ? '' : 's'}</p></div>
                        {companyReviews.length && !showAllCompanyReviews ? <button type="button" onClick={() => setShowAllCompanyReviews(true)} 
                        className="inline-flex items-center gap-2 text-[15px] font-medium text-[#2e66a6] 
                        hover:text-[#25578f]">See all reviews<svg
                            className="w-[18px] h-[18px] shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                          </svg></button> : null}
                      </div>

                      {companyReviews.length ? (
                        <div className="mt-6 space-y-5">
                          {(showAllCompanyReviews ? companyReviews : companyReviews.slice(0, 6)).map((review, index) => (
                            <article key={review._id || index} className="rounded-2xl border border-[#dfe7f0] bg-white px-5 py-5 shadow-[0_10px_28px_rgba(46,102,166,0.06)] sm:px-6 sm:py-6">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div><h3 className="text-[17px] font-bold text-black">{review.reviewerName || 'Anonymous User'}</h3><p className="mt-1 text-sm text-black/55">{review.roleAppliedFor || 'Role not provided'}{formatReviewAge(review.createdAt) ? ` · ${formatReviewAge(review.createdAt)}` : ''}</p></div>
                                <span className="rounded-full border border-[#dfe7f0] bg-[#fbfcfe] px-3 py-1 text-xs font-semibold text-[#2e66a6]">{getReviewOutcome(review.outcome)}</span>
                              </div>
                              {review.message ? <p className="mt-5 whitespace-pre-line text-[16px] leading-7 text-black/80">{review.message}</p> : null}
                              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">{[['First reply', review.daysToFirstResponse == null ? 'Not provided' : `${Number(review.daysToFirstResponse) || 0}d`], ['Total length', review.totalProcessDays == null ? 'Not provided' : `${Number(review.totalProcessDays) || 0}d`], ['Process', review.processRating == null ? 'Not provided' : `${Number(review.processRating) || 0}/5`], ['Rating', `${Number(review.rating ?? review.processRating) || 0}/5`]].map(([label, value]) => <div key={label} className="rounded-xl border border-[#dfe7f0] bg-[#fbfcfe] px-4 py-3"><p className="text-sm text-black/50">{label}</p><p className="mt-1 text-[18px] font-bold text-black">{value}</p></div>)}</div>
                            </article>
                          ))}
                        </div>
                      ) : (
                        <EmptyState icon={AboutEmptyIcon} title="No reviews yet." subtitle="Job seeker reviews will appear here." />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        {cropEditor.isOpen && cropEditor.source ? (
          <ImageCropEditor
            source={cropEditor.source}
            mode={cropEditor.mode}
            fileName={cropEditor.fileName}
            onCancel={closeCropEditor}
            onApply={applyCroppedImage}
          />
        ) : null}

        {credentialAccess.isOpen ? (
          <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 px-4 py-6" role="dialog" aria-modal="true">
            <div className="w-full max-w-md overflow-hidden rounded-[22px] border border-gray-100 bg-white shadow-2xl">
              <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-5">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Enter Password</h3>
                  <p className="mt-1 text-sm leading-5 text-gray-500">
                    For your security, enter your account password before viewing this credential.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeCredentialAccess}
                  disabled={credentialAccess.verifying}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-60"
                  aria-label="Close password modal"
                >
                  <CloseIcon className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={submitCredentialAccess} className="space-y-4 px-6 py-6">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showCredentialPassword ? 'text' : 'password'}
                      value={credentialAccess.password}
                      onChange={(event) =>
                        setCredentialAccess((prev) => ({
                          ...prev,
                          password: event.target.value,
                          error: '',
                        }))
                      }
                      placeholder="Enter your password"
                      autoFocus
                      disabled={credentialAccess.verifying}
                      className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 pr-12 text-gray-900 outline-none focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/20 disabled:bg-gray-50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCredentialPassword((visible) => !visible)}
                      disabled={credentialAccess.verifying}
                      className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-gray-500 hover:text-[#2e66a6] disabled:opacity-60"
                      aria-label={showCredentialPassword ? 'Hide password' : 'Show password'}
                      title={showCredentialPassword ? 'Hide password' : 'Show password'}
                    >
                      <EyeIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {credentialAccess.error ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {credentialAccess.error}
                  </div>
                ) : null}

                <div className="flex justify-end gap-3 pt-1">
                  <button
                    type="button"
                    onClick={closeCredentialAccess}
                    disabled={credentialAccess.verifying}
                    className="h-10 rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={credentialAccess.verifying}
                    className="inline-flex h-10 min-w-[110px] items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[#2e66a6] px-4 text-sm font-semibold text-white hover:bg-[#255487] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {credentialAccess.verifying ? (
                      <>
                        <SpinnerIcon className="h-4 w-4" />
                        Verifying
                      </>
                    ) : (
                      <>
                        <DownloadIcon className="h-4 w-4" />
                        Export {activeCredentialLabel}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}

        {credentialPreview.isOpen && credentialPreview.url ? (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 px-4 py-6">
            <div className="flex h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between gap-3 border-b border-[#d1d5db] px-5 py-4">
                <div className="min-w-0">
                  <h3 className="truncate text-base font-semibold text-[#111827]">{credentialPreview.title}</h3>
                  <p className="text-xs text-[#6b7280]">Credential preview</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={closeCredentialPreview}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#d1d5db] bg-white text-[#374151] hover:bg-[#f9fafb]"
                    aria-label="Close credential preview"
                  >
                    <CloseIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <iframe
                src={credentialPreview.url}
                title={credentialPreview.title || 'Credential preview'}
                className="h-full w-full flex-1 bg-white"
              />
            </div>
          </div>
        ) : null}

        {isEditOpen && (
          <div className="fixed inset-0 z-[70] bg-[#f5f7fb]">
            <div className="h-full overflow-y-auto">
              <div data-company-edit-top="true" className="mx-auto min-h-full max-w-[1180px] px-4 py-5 sm:px-6 lg:px-8">
                <div className="mb-5">
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={saving}
                    className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-[#d5dde8] bg-white px-4 text-[13px] font-medium text-[#172033] shadow-sm hover:bg-[#f8fafc] disabled:opacity-60"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                    Back
                  </button>

                  <h2 className="mt-5 text-[34px] font-bold leading-tight text-[#061a35]">Edit Company Profile</h2>
                  <p className="mt-1 text-[14px] text-[#66758b]">
                    Fill in the details to set up your company page — step {editStep} of 4.
                  </p>
                </div>

                <div className="mb-5 rounded-[18px] border border-[#d5dde8] bg-white px-5 py-4 shadow-[0_3px_10px_rgba(15,23,42,0.06)]">
                  <div className="flex flex-wrap items-center justify-center gap-3 text-[12px] font-semibold sm:gap-4">
                    {[
                      [1, 'Company Information'],
                      [2, 'Business Details'],
                      [3, 'Cover Photo & Social Media'],
                      [4, 'Gallery Photos'],
                    ].map(([step, label], index) => {
                      const completed = editStep > step;
                      const active = editStep === step;
                      return (
                        <React.Fragment key={step}>
                          <button
                            type="button"
                            onClick={() => {
                              if (step < editStep) {
                                setFieldErrors({});
                                clearMessages();
                                setEditStep(step);
                              }
                            }}
                            className={cx(
                              'inline-flex items-center gap-2 rounded-full px-3 py-2 transition',
                              active ? 'bg-[#e7f1ff] text-[#145eb8]' : '',
                              completed ? 'text-[#07854f]' : '',
                              !active && !completed ? 'text-[#64748b]' : '',
                              step > editStep ? 'cursor-default' : 'hover:bg-[#f4f7fb]'
                            )}
                          >
                            <span
                              className={cx(
                                'inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold',
                                active ? 'bg-[#1769c2] text-white' : '',
                                completed ? 'bg-[#07854f] text-white' : '',
                                !active && !completed ? 'bg-[#eef2f7] text-[#718096]' : ''
                              )}
                            >
                              {completed ? '✓' : step}
                            </span>
                            {label}
                          </button>
                          {index < 3 ? <span className="text-[#98a5b6]">›</span> : null}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>

                <form onSubmit={handleSubmit}>
                  {error ? (
                    <div className="mb-4 rounded-[12px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                      {error}
                    </div>
                  ) : null}

                  {editStep === 1 ? (
                    <div className="rounded-[18px] border border-[#d5dde8] bg-white p-6 shadow-[0_3px_10px_rgba(15,23,42,0.05)]">
                      <div className="mb-6 flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f1f5f9] text-[#66758b]">
                          <BuildingIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="text-[21px] font-bold text-[#081b35]">Company Information</h3>
                          <p className="text-[13px] text-[#66758b]">Your company details & location.</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[170px_minmax(0,1fr)] lg:items-start">
                        <div className="flex w-full flex-col items-center text-center lg:pt-1">
                          <button
                            type="button"
                            onClick={() => modalLogoInputRef.current?.click()}
                            className={cx(
                              'relative flex h-[122px] w-[122px] flex-col items-center justify-center overflow-hidden rounded-[16px] border border-dashed text-[#66758b] transition hover:border-[#9fb6d0] hover:bg-[#f8fafc]',
                              fieldErrors.companyLogo ? 'border-red-400' : 'border-[#cbd5e1]',
                              !previewLogo
                                ? 'bg-[linear-gradient(45deg,#f1f5f9_25%,transparent_25%),linear-gradient(-45deg,#f1f5f9_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f1f5f9_75%),linear-gradient(-45deg,transparent_75%,#f1f5f9_75%)] bg-[length:14px_14px] bg-[position:0_0,0_7px,7px_-7px,-7px_0px] bg-white'
                                : 'bg-white'
                            )}
                            disabled={saving}
                            aria-label="Upload company logo"
                          >
                            {previewLogo ? (
                              <img src={previewLogo} alt="Company logo preview" className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex flex-col items-center justify-center px-3">
                                <CompanyLogoUploadIcon className="h-6 w-6 text-[#6f7d90]" />
                                <span className="mt-2 max-w-[84px] text-center text-[9px] font-medium leading-[13px] text-[#66758b]">
                                  Drop or upload your logo
                                </span>
                              </div>
                            )}
                          </button>

                          <p className="mt-2 text-center text-[11px] font-medium text-[#66758b]">Company Logo *</p>
                          {fieldErrors.companyLogo ? (
                            <p className="mt-1 max-w-[160px] text-center text-[11px] font-medium leading-4 text-red-600">
                              {fieldErrors.companyLogo}
                            </p>
                          ) : null}

                          <input
                            ref={modalLogoInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleLogoChange}
                            disabled={saving}
                          />

                          <button
                            type="button"
                            onClick={() => modalLogoInputRef.current?.click()}
                            className="mt-3 inline-flex h-9 items-center justify-center gap-2 rounded-[9px] border border-[#d5dde8] bg-white px-4 text-[12px] font-semibold text-[#172033] shadow-sm transition hover:bg-[#f8fafc]"
                            disabled={saving}
                          >
                            <UploadIcon className="h-4 w-4" />
                            Upload
                          </button>

                          <p className="mt-3 max-w-[170px] text-center text-[10px] leading-4 text-[#66758b]">
                            Square image, JPG or PNG, max 5 MB. Portrait photos can be cropped.
                          </p>
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                          <div className="md:col-span-2 lg:col-span-3">
                            <FormField label="Company Name" required error={fieldErrors.companyName}>
                              <input
                                type="text"
                                name="companyName"
                                value={companyData.companyName}
                                onChange={handleInputChange}
                                maxLength={MAX_COMPANY_NAME_LENGTH}
                                placeholder="e.g. BDO Unibank"
                                disabled={saving}
                                className={cx('w-full rounded-[10px] border px-4 py-3 text-[14px] outline-none', fieldErrors.companyName ? 'border-red-400' : 'border-[#cbd5e1] focus:border-[#1769c2]')}
                              />
                            </FormField>
                          </div>

                          <FormField label="Region" required error={fieldErrors.region}>
                            <select
                              value={selectedRegion}
                              onChange={(event) => {
                                setSelectedRegion(event.target.value);
                                setSelectedProvince('');
                                setSelectedCity('');
                                clearMessages();
                                setFieldErrors((prev) => ({ ...prev, region: undefined, province: undefined, city: undefined }));
                              }}
                              disabled={saving}
                              className={cx('w-full rounded-[10px] border bg-white px-4 py-3 text-[14px] outline-none', fieldErrors.region ? 'border-red-400' : 'border-[#cbd5e1] focus:border-[#1769c2]')}
                            >
                              <option value="">Select region</option>
                              {PH_REGIONS.map((region) => <option key={region} value={region}>{region}</option>)}
                            </select>
                          </FormField>

                          <FormField label="Province" required error={fieldErrors.province}>
                            <select
                              value={selectedProvince}
                              onChange={(event) => {
                                setSelectedProvince(event.target.value);
                                setSelectedCity('');
                                clearMessages();
                                setFieldErrors((prev) => ({ ...prev, province: undefined, city: undefined }));
                              }}
                              disabled={saving || !selectedRegion}
                              className={cx('w-full rounded-[10px] border bg-white px-4 py-3 text-[14px] outline-none', fieldErrors.province ? 'border-red-400' : 'border-[#cbd5e1] focus:border-[#1769c2]')}
                            >
                              <option value="">{selectedRegion ? 'Select province' : 'Select region first'}</option>
                              {provinceOptions.map((province) => <option key={province} value={province}>{province}</option>)}
                            </select>
                          </FormField>

                          <FormField label="City / Municipality" required error={fieldErrors.city}>
                            <select
                              value={selectedCity}
                              onChange={(event) => {
                                setSelectedCity(event.target.value);
                                clearMessages();
                                setFieldErrors((prev) => ({ ...prev, city: undefined }));
                              }}
                              disabled={saving || !selectedProvince}
                              className={cx('w-full rounded-[10px] border bg-white px-4 py-3 text-[14px] outline-none', fieldErrors.city ? 'border-red-400' : 'border-[#cbd5e1] focus:border-[#1769c2]')}
                            >
                              <option value="">{selectedProvince ? 'Select city' : 'Select province first'}</option>
                              {cityOptions.map((city) => <option key={city} value={city}>{city}</option>)}
                            </select>
                          </FormField>

                          <div className="md:col-span-2 lg:col-span-3">
                            <FormField label="Complete Office Address" required error={fieldErrors.companyAddress}>
                              <input
                                type="text"
                                name="companyAddress"
                                value={companyData.companyAddress}
                                onChange={handleInputChange}
                                maxLength={MAX_OFFICE_ADDRESS_LENGTH}
                                placeholder="e.g., Bldg. 1, 3rd Floor, 123 Main St."
                                disabled={saving}
                                className={cx('w-full rounded-[10px] border px-4 py-3 text-[14px] outline-none', fieldErrors.companyAddress ? 'border-red-400' : 'border-[#cbd5e1] focus:border-[#1769c2]')}
                              />
                            </FormField>
                          </div>

                          <FormField label="Contact Email" required error={fieldErrors.businessEmail}>
                            <input
                              type="email"
                              name="businessEmail"
                              value={companyData.businessEmail}
                              onChange={handleInputChange}
                              placeholder="careers@company.com"
                              disabled={saving}
                              className={cx('w-full rounded-[10px] border px-4 py-3 text-[14px] outline-none', fieldErrors.businessEmail ? 'border-red-400' : 'border-[#cbd5e1] focus:border-[#1769c2]')}
                            />
                          </FormField>

                          <div className="lg:col-span-2">
                            <FormField label="Contact Number" required error={fieldErrors.mobileNumber}>
                              <input
                                type="text"
                                name="mobileNumber"
                                value={companyData.mobileNumber}
                                onChange={handleInputChange}
                                placeholder="+63 900 000 0000"
                                disabled={saving}
                                className={cx('w-full rounded-[10px] border px-4 py-3 text-[14px] outline-none', fieldErrors.mobileNumber ? 'border-red-400' : 'border-[#cbd5e1] focus:border-[#1769c2]')}
                              />
                            </FormField>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {editStep === 2 ? (
                    <div className="rounded-[18px] border border-[#d5dde8] bg-white p-6 shadow-[0_3px_10px_rgba(15,23,42,0.05)]">
                      <div className="mb-6 flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f1f5f9] text-[#66758b]">
                          <BuildingIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="text-[21px] font-bold text-[#081b35]">Business Details</h3>
                          <p className="text-[13px] text-[#66758b]">Industry, website, and description.</p>
                        </div>
                      </div>

                      <div className="space-y-5">
                        <FormField label="Industry" required error={fieldErrors.industry}>
                          <div ref={industryComboboxRef} className="relative">
                            <input
                              type="text"
                              name="industry"
                              value={companyData.industry}
                              onChange={(event) => {
                                handleInputChange(event);
                                setIndustryDropdownOpen(true);
                              }}
                              onFocus={() => setIndustryDropdownOpen(true)}
                              maxLength={MAX_INDUSTRY_LENGTH}
                              placeholder="Select your industry"
                              autoComplete="off"
                              disabled={saving}
                              className={cx('w-full rounded-[10px] border px-4 py-3 pr-10 text-[14px] outline-none', fieldErrors.industry ? 'border-red-400' : 'border-[#cbd5e1] focus:border-[#1769c2]')}
                            />
                            <button type="button" onClick={() => setIndustryDropdownOpen((open) => !open)} className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-[#64748b]">
                              <span>⌄</span>
                            </button>
                            {industryDropdownOpen ? (
                              <div className="absolute z-40 mt-2 max-h-64 w-full overflow-y-auto rounded-[12px] border border-[#d5dde8] bg-white py-1 shadow-[0_12px_30px_rgba(15,23,42,0.16)]">
                                {filteredIndustryOptions.length ? filteredIndustryOptions.map((option) => (
                                  <button
                                    key={option}
                                    type="button"
                                    onMouseDown={(event) => event.preventDefault()}
                                    onClick={() => {
                                      setCompanyData((prev) => ({ ...prev, industry: option }));
                                      setFieldErrors((prev) => ({ ...prev, industry: undefined }));
                                      clearMessages();
                                      setIndustryDropdownOpen(false);
                                    }}
                                    className="block w-full px-4 py-3 text-left text-[14px] text-[#172033] hover:bg-[#f3f6fb]"
                                  >
                                    {option}
                                  </button>
                                )) : (
                                  <div className="px-4 py-3 text-[13px] text-[#66758b]">No matching option.</div>
                                )}
                              </div>
                            ) : null}
                          </div>
                        </FormField>

                        <FormField label="Company Website (Optional)" error={fieldErrors.companyWebsiteUrl}>
                          <input
                            type="text"
                            name="companyWebsiteUrl"
                            value={companyData.companyWebsiteUrl}
                            onChange={handleInputChange}
                            placeholder="https://www.yourcompany.com"
                            disabled={saving}
                            className="w-full rounded-[10px] border border-[#cbd5e1] px-4 py-3 text-[14px] outline-none focus:border-[#1769c2]"
                          />
                        </FormField>

                        <FormField label="Company Description" required error={fieldErrors.companyDescription}>
                          <textarea
                            name="companyDescription"
                            value={companyData.companyDescription}
                            onChange={handleInputChange}
                            rows={9}
                            minLength={MIN_COMPANY_DESCRIPTION_LENGTH}
                            maxLength={MAX_COMPANY_DESCRIPTION_LENGTH}
                            placeholder="Tell job seekers who you are, what you do, and what makes your company a great place to work."
                            disabled={saving}
                            className={cx('w-full resize-y rounded-[10px] border px-4 py-3 text-[14px] outline-none', fieldErrors.companyDescription ? 'border-red-400' : 'border-[#cbd5e1] focus:border-[#1769c2]')}
                          />
                          <div className="mt-1 flex items-center justify-between gap-3 text-[11px] text-[#66758b]">
                            <span>Write in short paragraphs — mention your services, culture, and growth opportunities.</span>
                            <span>{String(companyData.companyDescription || '').length}/{MAX_COMPANY_DESCRIPTION_LENGTH}</span>
                          </div>
                        </FormField>
                      </div>
                    </div>
                  ) : null}

                  {editStep === 3 ? (
                    <div className="space-y-5">
                      <div className="rounded-[18px] border border-[#d5dde8] bg-white p-6 shadow-[0_3px_10px_rgba(15,23,42,0.05)]">
                        <div className="mb-5 flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f1f5f9] text-[#66758b]">
                            <CoverPhotoIcon className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="text-[21px] font-bold text-[#081b35]">Cover Photo</h3>
                            <p className="text-[13px] text-[#66758b]">Upload a header image for your company profile.</p>
                          </div>
                        </div>

                        <div className="mb-5 rounded-[16px] border border-[#d5dde8] bg-[#f8fbff] p-5">
                          <h4 className="text-[14px] font-bold text-[#081b35]">Make a Great First Impression</h4>
                          <p className="mt-1 text-[12px] leading-5 text-[#66758b]">
                            Choose a clear, professional image that represents your actual company or workplace.
                          </p>
                          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="rounded-xl border border-[#d5dde8] bg-white px-4 py-3"><p className="text-[10px] uppercase tracking-wide text-[#66758b]">Accepted Formats</p><p className="mt-1 text-[12px] font-semibold">JPG, JPEG, PNG</p></div>
                            <div className="rounded-xl border border-[#d5dde8] bg-white px-4 py-3"><p className="text-[10px] uppercase tracking-wide text-[#66758b]">Maximum File Size</p><p className="mt-1 text-[12px] font-semibold">5 MB</p></div>
                            <div className="rounded-xl border border-[#d5dde8] bg-white px-4 py-3"><p className="text-[10px] uppercase tracking-wide text-[#66758b]">Recommended Aspect Ratio</p><p className="mt-1 text-[12px] font-semibold">16:9</p></div>
                            <div className="rounded-xl border border-[#d5dde8] bg-white px-4 py-3"><p className="text-[10px] uppercase tracking-wide text-[#66758b]">Recommended Size</p><p className="mt-1 text-[12px] font-semibold">1920 × 1080 px or higher</p></div>
                          </div>
                        </div>

                        <input ref={modalCoverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverChange} disabled={saving} />
                        <button
                          type="button"
                          onClick={() => modalCoverInputRef.current?.click()}
                          className={cx(
                            'flex min-h-[320px] w-full flex-col items-center justify-center overflow-hidden rounded-[18px] border border-dashed bg-white text-center transition hover:bg-[#f8fafc]',
                            fieldErrors.coverPhoto ? 'border-red-400' : 'border-[#cbd5e1]'
                          )}
                          disabled={saving}
                        >
                          {previewCover || companyData.coverPhoto ? (
                            <img src={previewCover || companyData.coverPhoto} alt="Cover preview" className="h-[320px] w-full object-cover" />
                          ) : (
                            <>
                              <UploadIcon className="h-8 w-8 text-[#66758b]" />
                              <p className="mt-3 text-[13px] font-bold text-[#172033]">Drag and drop your cover photo here</p>
                              <p className="mt-1 text-[11px] text-[#66758b]">or use the upload button — JPG, JPEG, PNG, max 5 MB</p>
                            </>
                          )}
                        </button>
                        {fieldErrors.coverPhoto ? <p className="mt-2 text-[12px] font-medium text-red-600">{fieldErrors.coverPhoto}</p> : null}

                        <button
                          type="button"
                          onClick={() => modalCoverInputRef.current?.click()}
                          className="mt-4 inline-flex h-10 items-center gap-2 rounded-[10px] border border-[#d5dde8] bg-white px-4 text-[12px] font-semibold text-[#172033] hover:bg-[#f8fafc]"
                          disabled={saving}
                        >
                          <UploadIcon className="h-4 w-4" /> Upload Cover Photo
                        </button>
                      </div>

                      <div className="rounded-[18px] border border-[#d5dde8] bg-white p-6 shadow-[0_3px_10px_rgba(15,23,42,0.05)]">
                        <div className="mb-5 flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f1f5f9] text-[#66758b]">
                            <LinkIcon className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="text-[21px] font-bold text-[#081b35]">Social Media (Optional)</h3>
                            <p className="text-[13px] text-[#66758b]">Connect your official company accounts.</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <FormField label="Facebook">
                            <input type="text" name="facebookUrl" value={companyData.facebookUrl} onChange={handleInputChange} placeholder="https://www.facebook.com/yourcompany" disabled={saving} className="w-full rounded-[10px] border border-[#cbd5e1] px-4 py-3 text-[14px] outline-none focus:border-[#1769c2]" />
                          </FormField>
                          <FormField label="Instagram">
                            <input type="text" name="instagramUrl" value={companyData.instagramUrl} onChange={handleInputChange} placeholder="https://www.instagram.com/yourcompany" disabled={saving} className="w-full rounded-[10px] border border-[#cbd5e1] px-4 py-3 text-[14px] outline-none focus:border-[#1769c2]" />
                          </FormField>
                          <FormField label="YouTube">
                            <input type="text" name="youtubeUrl" value={companyData.youtubeUrl} onChange={handleInputChange} placeholder="https://www.youtube.com/@yourcompany" disabled={saving} className="w-full rounded-[10px] border border-[#cbd5e1] px-4 py-3 text-[14px] outline-none focus:border-[#1769c2]" />
                          </FormField>
                          <FormField label="X / Twitter">
                            <input type="text" name="xUrl" value={companyData.xUrl} onChange={handleInputChange} placeholder="https://x.com/yourcompany" disabled={saving} className="w-full rounded-[10px] border border-[#cbd5e1] px-4 py-3 text-[14px] outline-none focus:border-[#1769c2]" />
                          </FormField>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {editStep === 4 ? (
                    <div className="rounded-[18px] border border-[#d5dde8] bg-white p-6 shadow-[0_3px_10px_rgba(15,23,42,0.05)]">
                      <div className="mb-5 flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f1f5f9] text-[#66758b]">
                          <PhotoStackIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="text-[21px] font-bold text-[#081b35]">Gallery Photos</h3>
                          <p className="text-[13px] text-[#66758b]">Upload company images for your gallery tab.</p>
                        </div>
                      </div>

                      <div className="mb-5 rounded-[16px] border border-[#d5dde8] bg-[#f8fbff] p-5">
                        <h4 className="text-[14px] font-bold text-[#081b35]">Showcase Your Workplace</h4>
                        <p className="mt-1 text-[12px] leading-5 text-[#66758b]">
                          Upload clear photos that give job seekers a better look at your workplace, team, culture, and environment.
                        </p>
                        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div className="rounded-xl border border-[#d5dde8] bg-white px-4 py-3"><p className="text-[10px] uppercase tracking-wide text-[#66758b]">Accepted Formats</p><p className="mt-1 text-[12px] font-semibold">JPG, JPEG, PNG</p></div>
                          <div className="rounded-xl border border-[#d5dde8] bg-white px-4 py-3"><p className="text-[10px] uppercase tracking-wide text-[#66758b]">Maximum File Size</p><p className="mt-1 text-[12px] font-semibold">5 MB per image</p></div>
                        </div>
                      </div>

                      <input ref={modalGalleryInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleGalleryPick} disabled={saving} />
                      <button
                        type="button"
                        onClick={() => modalGalleryInputRef.current?.click()}
                        className={cx(
                          'flex min-h-[180px] w-full flex-col items-center justify-center rounded-[18px] border border-dashed bg-white text-center hover:bg-[#f8fafc]',
                          fieldErrors.galleryImages ? 'border-red-400' : 'border-[#cbd5e1]'
                        )}
                        disabled={saving}
                      >
                        <UploadIcon className="h-8 w-8 text-[#66758b]" />
                        <p className="mt-3 text-[13px] font-bold text-[#172033]">Drag and drop your photos here</p>
                        <p className="mt-1 text-[11px] text-[#66758b]">JPG, JPEG, PNG · max 5 MB each · up to {MAX_GALLERY_IMAGES} images</p>
                        <span className="mt-3 inline-flex h-9 items-center gap-2 rounded-[9px] border border-[#d5dde8] bg-white px-4 text-[12px] font-semibold">
                          <UploadIcon className="h-4 w-4" /> Upload Gallery Images
                        </span>
                        <span className="mt-2 text-[11px] text-[#66758b]">{galleryDisplayItems.length} of {MAX_GALLERY_IMAGES} images used</span>
                      </button>
                      {fieldErrors.galleryImages ? <p className="mt-2 text-[12px] font-medium text-red-600">{fieldErrors.galleryImages}</p> : null}

                      {galleryDisplayItems.length > 0 ? (
                        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          {persistedGalleryItems.map((item, index) => (
                            <div key={`persisted-${item._id || item.url}-${index}`} className="overflow-hidden rounded-[14px] border border-[#d5dde8] bg-white">
                              <img src={item.url} alt={`Saved gallery ${index + 1}`} className="h-[170px] w-full object-cover" />
                              <div className="border-t border-[#e2e8f0] px-3 py-2 text-[11px] font-semibold text-[#66758b]">Saved image</div>
                            </div>
                          ))}
                          {galleryPreviews.map((item, index) => (
                            <div key={`local-${item.id}-${index}`} className="overflow-hidden rounded-[14px] border border-[#d5dde8] bg-white">
                              <img src={item.url} alt={`New gallery ${index + 1}`} className="h-[170px] w-full object-cover" />
                              <div className="flex items-center justify-between border-t border-[#e2e8f0] px-3 py-2">
                                <span className="min-w-0 truncate text-[11px] font-semibold text-[#66758b]">{item.file?.name || 'New image'}</span>
                                <button type="button" onClick={() => removeLocalGalleryPreview(item.id)} className="ml-2 rounded-full bg-red-50 px-2 py-1 text-[10px] font-bold text-red-600 hover:bg-red-100">Remove</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="sticky bottom-0 mt-5 rounded-[18px] border border-[#d5dde8] bg-white/95 px-5 py-4 shadow-[0_-4px_18px_rgba(15,23,42,0.07)] backdrop-blur">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <button
                        type="button"
                        onClick={handleCancel}
                        disabled={saving}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-[10px] px-4 text-[13px] font-semibold text-[#172033] hover:bg-[#f8fafc] disabled:opacity-60"
                      >
                        <CloseIcon className="h-4 w-4" /> Cancel
                      </button>

                      <div className="flex flex-wrap items-center justify-end gap-2">
                        {editStep > 1 ? (
                          <button
                            type="button"
                            onClick={goToPreviousEditStep}
                            disabled={saving}
                            className="inline-flex h-11 items-center gap-2 rounded-[10px] border border-[#d5dde8] bg-white px-5 text-[13px] font-semibold text-[#172033] hover:bg-[#f8fafc] disabled:opacity-60"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                            Back
                          </button>
                        ) : null}

                        {editStep < 4 ? (
                          <button
                            type="button"
                            onClick={goToNextEditStep}
                            disabled={saving}
                            className="inline-flex h-11 items-center gap-2 rounded-[10px] bg-[#1769c2] px-5 text-[13px] font-semibold text-white hover:bg-[#105aa8] disabled:opacity-60"
                          >
                            Continue
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                          </button>
                        ) : (
                          <button
                            type="submit"
                            disabled={saving || !isDirty}
                            className="inline-flex h-11 items-center gap-2 rounded-[10px] bg-[#1769c2] px-5 text-[13px] font-semibold text-white hover:bg-[#105aa8] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {saving ? <><SpinnerIcon className="h-4 w-4" /> Saving...</> : <><EditIcon className="h-4 w-4" /> Save Changes</>}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </EmployerLayout>
  );
};

export default CompanyProfile;
