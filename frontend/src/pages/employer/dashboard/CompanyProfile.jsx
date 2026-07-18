// src/pages/employer/dashboard/CompanyProfile.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import EmployerLayout from '../../../layouts/EmployerLayout';
import { useLocation, useNavigate } from 'react-router-dom';
import { PH_REGIONS, PH_CITIES_BY_REGION } from '../../../constants/phLocations';
import api from '../../../services/api';

const cx = (...classes) => classes.filter(Boolean).join(' ');

const MAX_LOGO_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_COVER_SIZE_BYTES = 8 * 1024 * 1024;
const MAX_GALLERY_SIZE_BYTES = 8 * 1024 * 1024;
const MAX_GALLERY_IMAGES = 12;

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

const parseRegionCity = (regionCity) => {
  const s = String(regionCity || '').trim();
  if (!s) return { region: '', city: '' };

  const parts = s.split(' - ').map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const region = parts[0];
    const city = parts.slice(1).join(' - ').trim();
    return { region, city };
  }

  return { region: s, city: '' };
};

const composeRegionCity = (region, city) => {
  const r = String(region || '').trim();
  const c = String(city || '').trim();
  if (!r && !c) return '';
  if (!r) return c;
  if (!c) return r;
  return `${r} - ${c}`;
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

const CredentialRow = ({
  item,
  uploading,
  inputRef,
  onUpload,
  onView,
  onDownload,
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
          <>
            <button
              type="button"
              onClick={() => onView?.(item.key)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#d1d5db] bg-white text-[#2e66a6] transition hover:bg-[#f9fafb] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6]/30"
              aria-label={`View ${item.label}`}
              title="View"
            >
              <EyeIcon className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => onDownload?.(item.key)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#d1d5db] bg-white text-[#2e66a6] transition hover:bg-[#f9fafb] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6]/30"
              aria-label={`Download ${item.label}`}
              title="Download"
            >
              <DownloadIcon className="h-4 w-4" />
            </button>
          </>
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
    linkedinUrl: '',
    xUrl: '',
    coverPhoto: '',
    galleryImages: [],
  });

  const [initialData, setInitialData] = useState(companyData);
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [industryDropdownOpen, setIndustryDropdownOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('about');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [previewLogo, setPreviewLogo] = useState(null);
  const [logoFile, setLogoFile] = useState(null);

  const [previewCover, setPreviewCover] = useState(null);
  const [coverFile, setCoverFile] = useState(null);

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
  const location = useLocation();
  const navigate = useNavigate();

  const defaultBanner = '/images/jobback.png';

  const logoFallback = useMemo(() => {
    const name = encodeURIComponent(companyData.companyName || 'Company');
    return `https://ui-avatars.com/api/?name=${name}&background=e8eefc&color=24416b&size=256&bold=true`;
  }, [companyData.companyName]);

  const requiredComplete = useMemo(() => Boolean(companyData.companyName?.trim()), [companyData.companyName]);

  const cityOptions = useMemo(() => {
    const r = String(selectedRegion || '').trim();
    if (!r) return [];
    return PH_CITIES_BY_REGION?.[r] || [];
  }, [selectedRegion]);

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
        { key: 'linkedinUrl', label: 'LinkedIn', url: companyData.linkedinUrl },
        { key: 'xUrl', label: 'X / Twitter', url: companyData.xUrl },
      ].filter((item) => String(item.url || '').trim()),
    [companyData.facebookUrl, companyData.instagramUrl, companyData.linkedinUrl, companyData.xUrl]
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
          companyDescription: p?.companyDescription || p?.aboutCompany || p?.description || '',
          facebookUrl: p?.facebookUrl || '',
          instagramUrl: p?.instagramUrl || '',
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

        const parsed = parseRegionCity(next.regionCity);
        setSelectedRegion(parsed.region);
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
    const combined = composeRegionCity(selectedRegion, selectedCity);
    setCompanyData((prev) => ({ ...prev, regionCity: combined }));
  }, [selectedRegion, selectedCity, isEditOpen]);

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

        if (previewLogo?.startsWith('blob:')) URL.revokeObjectURL(previewLogo);

        setLogoFile(file);
        setPreviewLogo(blobUrl);
      } catch (err) {
        console.error(err);
        setError(err.message || 'Could not read image.');
      } finally {
        e.target.value = '';
      }
    },
    [clearFieldErrors, clearMessages, previewLogo, validateImageDimensions]
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
        setError('Cover photo must be less than 8MB.');
        return;
      }

      const blobUrl = URL.createObjectURL(file);
      if (previewCover?.startsWith('blob:')) URL.revokeObjectURL(previewCover);

      setCoverFile(file);
      setPreviewCover(blobUrl);
      e.target.value = '';
    },
    [clearFieldErrors, clearMessages, previewCover]
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
        setError('Each gallery image must be less than 8MB.');
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

    const parsed = parseRegionCity(companyData.regionCity);
    setSelectedRegion(parsed.region);
    setSelectedCity(parsed.city);
    setIndustryDropdownOpen(false);
    setIsEditOpen(true);
  }, [clearFieldErrors, clearMessages, companyData.regionCity]);

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

    if (!companyData.companyName?.trim()) next.companyName = 'Company name is required.';
    if (!selectedRegion?.trim()) next.regionCity = 'Region is required.';
    if (!selectedCity?.trim()) next.regionCity = 'City / Province is required.';
    if (!companyData.industry?.trim()) next.industry = 'Industry is required.';

    setFieldErrors(next);
    return { ok: Object.keys(next).length === 0 };
  }, [companyData.companyName, companyData.industry, selectedCity, selectedRegion]);

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

        fd.set('regionCity', composeRegionCity(selectedRegion, selectedCity));
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

  const downloadVerificationDoc = useCallback(
    (docType) => openCredentialAccess(docType, 'download'),
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

  const saveDisabled = saving || !requiredComplete || !isDirty;

  const coverImage = previewCover || companyData.coverPhoto || defaultBanner;
  const hasAbout = Boolean(String(companyData.companyDescription || '').trim());
  const hasGallery = galleryDisplayItems.length > 0;
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
            <div className="relative h-[260px] sm:h-[320px] lg:h-[360px] overflow-hidden rounded-t-[16px] border border-b-0 border-[#d1d5db] bg-white">
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
                        <span>{companyData.companyAddress || companyData.regionCity || 'Location not provided'}</span>
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
                    <TabButton active={activeTab === 'credentials'} onClick={() => setActiveTab('credentials')}>
                      Credentials
                    </TabButton>
                    <TabButton active={activeTab === 'social'} onClick={() => setActiveTab('social')}>
                      Social Media
                    </TabButton>
                    <TabButton active={activeTab === 'gallery'} onClick={() => setActiveTab('gallery')}>
                      Gallery
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
                            onDownload={downloadVerificationDoc}
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

                        <button
                          type="button"
                          onClick={openEditModal}
                          className="inline-flex h-[38px] items-center justify-center gap-2 rounded-[12px] border border-[#d1d5db] bg-white px-4 text-[13px] font-semibold text-[#374151] transition hover:bg-[#f9fafb]"
                        >
                          <MiniPencilIcon className="h-3.5 w-3.5" />
                          Manage Gallery
                        </button>
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
                </div>
              </div>
            </div>
          </div>
        </div>


        {credentialAccess.isOpen ? (
          <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 px-4 py-6" role="dialog" aria-modal="true">
            <div className="w-full max-w-md overflow-hidden rounded-[22px] border border-gray-100 bg-white shadow-2xl">
              <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-5">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Enter Password</h3>
                  <p className="mt-1 text-sm leading-5 text-gray-500">
                    For your security, enter your account password before
                    {credentialAccess.mode === 'download' ? ' downloading' : ' viewing'} this credential.
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
                  <input
                    type="password"
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
                    className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-gray-900 outline-none focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/20 disabled:bg-gray-50"
                  />
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
                    className="inline-flex h-10 min-w-[110px] items-center justify-center gap-2 rounded-xl bg-[#2e66a6] px-4 text-sm font-semibold text-white hover:bg-[#255487] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {credentialAccess.verifying ? (
                      <>
                        <SpinnerIcon className="h-4 w-4" />
                        Verifying
                      </>
                    ) : credentialAccess.mode === 'download' ? (
                      'Download'
                    ) : (
                      'View'
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
          <div className="fixed inset-0 z-[70]">
            <div className="absolute inset-0 bg-black/35" onClick={handleCancel} aria-hidden="true" />

            <div className="absolute inset-0 overflow-y-auto">
              <div className="mx-auto min-h-full max-w-[1180px] px-4 py-8">
                <div className="rounded-[18px] border border-[#d1d5db] bg-white shadow-[0_20px_60px_rgba(15,23,42,0.18)]">
                  <div className="flex items-start justify-between gap-4 px-8 pb-4 pt-6">
                    <div>
                      <h2 className="text-[34px] font-bold leading-tight text-[#000000]">Edit Company Profile</h2>
                      <p className="mt-1 text-[14px] text-[#6b7280]">
                        Fill in the details to set up your company page.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleCancel}
                      disabled={saving}
                      className="rounded-full p-2 text-[#000000] transition hover:bg-[#f3f4f6] disabled:opacity-60"
                      aria-label="Close"
                    >
                      <CloseIcon className="h-6 w-6" />
                    </button>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4 px-4 pb-5">
                    <div className="rounded-[14px] border border-[#d1d5db] bg-white px-6 py-6">
                      <div className="mb-5 flex items-start gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#f3f4f6] text-[#6b7280]">
                          <BuildingIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="text-[28px] font-semibold leading-tight text-[#000000]">Company Identity</h3>
                          <p className="text-[14px] text-[#6b7280]">Your brand and location details</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[90px_minmax(0,1fr)]">
                        <div className="space-y-2">
                          <button
                            type="button"
                            onClick={() => modalLogoInputRef.current?.click()}
                            className="flex h-[112px] w-[90px] flex-col items-center justify-center rounded-[12px] border border-dashed border-[#d1d5db] bg-[#FFFFFF] text-[#6b7280] transition hover:bg-[#FFFFFF]"
                          >
                            {previewLogo ? (
                              <img
                                src={previewLogo}
                                alt="Selected logo"
                                className="h-full w-full rounded-[12px] object-cover"
                              />
                            ) : (
                              <>
                                <UploadIcon className="h-6 w-6" />
                                <span className="mt-2 text-[10px] font-semibold tracking-[0.04em]">UPLOAD</span>
                              </>
                            )}
                          </button>
                          <p className="text-center text-[10px] font-medium text-[#6b7280]">
                            Company
                            <br />
                            Logo
                          </p>

                          <input
                            ref={modalLogoInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleLogoChange}
                            disabled={saving}
                          />
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div className="md:col-span-2">
                            <FormField label="Company Name" required error={fieldErrors.companyName}>
                              <input
                                type="text"
                                name="companyName"
                                value={companyData.companyName}
                                onChange={handleInputChange}
                                className={cx(
                                  'w-full rounded-[10px] border px-4 py-3 text-[14px] outline-none transition',
                                  fieldErrors.companyName
                                    ? 'border-red-300 focus:border-red-500'
                                    : 'border-[#d1d5db] focus:border-[#2e66a6]'
                                )}
                                placeholder="Enter company name"
                                disabled={saving}
                              />
                            </FormField>
                          </div>

                          <FormField label="Region" required error={fieldErrors.regionCity}>
                            <select
                              value={selectedRegion}
                              onChange={(e) => {
                                setSelectedRegion(e.target.value);
                                setSelectedCity('');
                                clearMessages();
                                setFieldErrors((prev) => ({ ...prev, regionCity: undefined }));
                              }}
                              className={cx(
                                'w-full rounded-[10px] border bg-white px-4 py-3 text-[14px] outline-none transition',
                                fieldErrors.regionCity
                                  ? 'border-red-300 focus:border-red-500'
                                  : 'border-[#d1d5db] focus:border-[#2e66a6]'
                              )}
                              disabled={saving}
                            >
                              <option value="">Select region</option>
                              {PH_REGIONS.map((region) => (
                                <option key={region} value={region}>
                                  {region}
                                </option>
                              ))}
                            </select>
                          </FormField>

                          <FormField label="City / Provinces" required error={fieldErrors.regionCity}>
                            <select
                              value={selectedCity}
                              onChange={(e) => {
                                setSelectedCity(e.target.value);
                                clearMessages();
                                setFieldErrors((prev) => ({ ...prev, regionCity: undefined }));
                              }}
                              className={cx(
                                'w-full rounded-[10px] border bg-white px-4 py-3 text-[14px] outline-none transition',
                                fieldErrors.regionCity
                                  ? 'border-red-300 focus:border-red-500'
                                  : 'border-[#d1d5db] focus:border-[#2e66a6]'
                              )}
                              disabled={saving || !selectedRegion}
                            >
                              <option value="">{selectedRegion ? 'Select city / province' : 'Select region first'}</option>
                              {cityOptions.map((city) => (
                                <option key={city} value={city}>
                                  {city}
                                </option>
                              ))}
                            </select>
                          </FormField>

                          <div className="md:col-span-2">
                            <FormField label="Company Address" required={false} error={fieldErrors.companyAddress}>
                              <input
                                type="text"
                                name="companyAddress"
                                value={companyData.companyAddress}
                                onChange={handleInputChange}
                                className="w-full rounded-[10px] border border-[#d1d5db] px-4 py-3 text-[14px] outline-none transition focus:border-[#2e66a6]"
                                placeholder="Unit / Floor No. / Street Address"
                                disabled={saving}
                              />
                            </FormField>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[14px] border border-[#d1d5db] bg-white px-6 py-6">
                      <div className="mb-5 flex items-start gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#f3f4f6] text-[#6b7280]">
                          <BuildingIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="text-[28px] font-semibold leading-tight text-[#000000]">Business Details</h3>
                          <p className="text-[14px] text-[#6b7280]">Industry, website, and description.</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4">
                        <FormField label="Industry" required error={fieldErrors.industry}>
                          <div ref={industryComboboxRef} className="relative">
                            <div className="relative">
                              <input
                                type="text"
                                name="industry"
                                value={companyData.industry}
                                onChange={(event) => {
                                  handleInputChange(event);
                                  setIndustryDropdownOpen(true);
                                }}
                                onFocus={() => setIndustryDropdownOpen(true)}
                                onBlur={() => {
                                  window.setTimeout(() => {
                                    const normalizedIndustry = normalizeIndustryValue(companyData.industry);
                                    setCompanyData((prev) => ({
                                      ...prev,
                                      industry: normalizedIndustry,
                                    }));
                                  }, 0);
                                }}
                                autoComplete="off"
                                className={cx(
                                  'w-full rounded-[10px] border bg-white px-4 py-3 pr-11 text-[14px] outline-none transition',
                                  fieldErrors.industry
                                    ? 'border-red-300 focus:border-red-500'
                                    : 'border-[#d1d5db] focus:border-[#2e66a6]'
                                )}
                                placeholder="Select or type an industry"
                                disabled={saving}
                                role="combobox"
                                aria-expanded={industryDropdownOpen}
                                aria-controls="company-industry-options"
                                aria-autocomplete="list"
                              />

                              <button
                                type="button"
                                onClick={() => setIndustryDropdownOpen((prev) => !prev)}
                                disabled={saving}
                                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-[#374151] disabled:opacity-60"
                                aria-label="Toggle industry options"
                              >
                                <svg
                                  className={cx(
                                    'h-4 w-4 transition-transform',
                                    industryDropdownOpen ? 'rotate-180' : ''
                                  )}
                                  viewBox="0 0 20 20"
                                  fill="currentColor"
                                  aria-hidden="true"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.51a.75.75 0 01-1.08 0l-4.25-4.51a.75.75 0 01.02-1.06z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              </button>
                            </div>

                            {industryDropdownOpen ? (
                              <div
                                id="company-industry-options"
                                role="listbox"
                                className="absolute left-0 right-0 top-full z-[120] mt-2 max-h-64 overflow-y-auto rounded-[12px] border border-[#d1d5db] bg-white py-1 shadow-[0_12px_30px_rgba(15,23,42,0.16)]"
                              >
                                {filteredIndustryOptions.length > 0 ? (
                                  filteredIndustryOptions.map((option) => (
                                    <button
                                      key={option}
                                      type="button"
                                      role="option"
                                      aria-selected={
                                        option.toLowerCase() ===
                                        String(companyData.industry || '').trim().toLowerCase()
                                      }
                                      onMouseDown={(event) => event.preventDefault()}
                                      onClick={() => {
                                        setCompanyData((prev) => ({
                                          ...prev,
                                          industry: option,
                                        }));
                                        setFieldErrors((prev) => ({
                                          ...prev,
                                          industry: undefined,
                                        }));
                                        clearMessages();
                                        setIndustryDropdownOpen(false);
                                      }}
                                      className={cx(
                                        'block w-full px-4 py-3 text-left text-[14px] transition hover:bg-[#f3f6fb]',
                                        option.toLowerCase() ===
                                          String(companyData.industry || '').trim().toLowerCase()
                                          ? 'bg-[#eef4fb] font-semibold text-[#2e66a6]'
                                          : 'text-[#111827]'
                                      )}
                                    >
                                      {option}
                                    </button>
                                  ))
                                ) : (
                                  <div className="px-4 py-3 text-[13px] text-[#6b7280]">
                                    No matching option. Your typed industry can still be saved.
                                  </div>
                                )}
                              </div>
                            ) : null}
                          </div>
                        </FormField>

                        <FormField label="Company Website" required={false} error={fieldErrors.companyWebsiteUrl}>
                          <input
                            type="text"
                            name="companyWebsiteUrl"
                            value={companyData.companyWebsiteUrl}
                            onChange={handleInputChange}
                            className="w-full rounded-[10px] border border-[#d1d5db] px-4 py-3 text-[14px] outline-none transition focus:border-[#2e66a6]"
                            placeholder="https://example.com"
                            disabled={saving}
                          />
                        </FormField>

                        <FormField label="Company Description" required={false} error={fieldErrors.companyDescription}>
                          <textarea
                            name="companyDescription"
                            value={companyData.companyDescription}
                            onChange={handleInputChange}
                            rows={5}
                            className="w-full rounded-[10px] border border-[#d1d5db] px-4 py-3 text-[14px] outline-none transition focus:border-[#2e66a6]"
                            placeholder="Tell jobseekers about your company."
                            disabled={saving}
                          />
                        </FormField>
                      </div>
                    </div>

                    <div className="rounded-[14px] border border-[#d1d5db] bg-white px-6 py-6">
                      <div className="mb-5 flex items-start gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#f3f4f6] text-[#6b7280]">
                          <CoverPhotoIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="text-[28px] font-semibold leading-tight text-[#000000]">Cover Photo</h3>
                          <p className="text-[14px] text-[#6b7280]">Upload a header image for your company profile.</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="overflow-hidden rounded-[16px] border border-[#d1d5db] bg-[#FFFFFF]">
                          <img
                            src={previewCover || companyData.coverPhoto || defaultBanner}
                            alt="Cover preview"
                            className="h-[220px] w-full object-cover"
                          />
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          <input
                            ref={modalCoverInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleCoverChange}
                            disabled={saving}
                          />
                          <button
                            type="button"
                            onClick={() => modalCoverInputRef.current?.click()}
                            className="inline-flex h-[42px] items-center justify-center gap-2 rounded-[12px] border border-[#d1d5db] bg-white px-4 text-sm font-semibold text-[#374151] transition hover:bg-[#f9fafb]"
                            disabled={saving}
                          >
                            <UploadIcon className="h-4 w-4" />
                            Upload Cover Photo
                          </button>
                          <p className="text-[12px] text-[#6b7280]">Recommended: wide image, max 8MB</p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[14px] border border-[#d1d5db] bg-white px-6 py-6">
                      <div className="mb-5 flex items-start gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#f3f4f6] text-[#6b7280]">
                          <LinkIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="text-[28px] font-semibold leading-tight text-[#000000]">Social Media</h3>
                          <p className="text-[14px] text-[#6b7280]">Connect your official company accounts.</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <FormField label="Facebook" error={fieldErrors.facebookUrl}>
                          <input
                            type="text"
                            name="facebookUrl"
                            value={companyData.facebookUrl}
                            onChange={handleInputChange}
                            className="w-full rounded-[10px] border border-[#d1d5db] px-4 py-3 text-[14px] outline-none transition focus:border-[#2e66a6]"
                            placeholder="https://facebook.com/yourcompany"
                            disabled={saving}
                          />
                        </FormField>

                        <FormField label="Instagram" error={fieldErrors.instagramUrl}>
                          <input
                            type="text"
                            name="instagramUrl"
                            value={companyData.instagramUrl}
                            onChange={handleInputChange}
                            className="w-full rounded-[10px] border border-[#d1d5db] px-4 py-3 text-[14px] outline-none transition focus:border-[#2e66a6]"
                            placeholder="https://instagram.com/yourcompany"
                            disabled={saving}
                          />
                        </FormField>

                        <FormField label="LinkedIn" error={fieldErrors.linkedinUrl}>
                          <input
                            type="text"
                            name="linkedinUrl"
                            value={companyData.linkedinUrl}
                            onChange={handleInputChange}
                            className="w-full rounded-[10px] border border-[#d1d5db] px-4 py-3 text-[14px] outline-none transition focus:border-[#2e66a6]"
                            placeholder="https://linkedin.com/company/yourcompany"
                            disabled={saving}
                          />
                        </FormField>

                        <FormField label="X / Twitter" error={fieldErrors.xUrl}>
                          <input
                            type="text"
                            name="xUrl"
                            value={companyData.xUrl}
                            onChange={handleInputChange}
                            className="w-full rounded-[10px] border border-[#d1d5db] px-4 py-3 text-[14px] outline-none transition focus:border-[#2e66a6]"
                            placeholder="https://x.com/yourcompany"
                            disabled={saving}
                          />
                        </FormField>
                      </div>
                    </div>

                    <div className="rounded-[14px] border border-[#d1d5db] bg-white px-6 py-6">
                      <div className="mb-5 flex items-start gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#f3f4f6] text-[#6b7280]">
                          <PhotoStackIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="text-[28px] font-semibold leading-tight text-[#000000]">Gallery Photos</h3>
                          <p className="text-[14px] text-[#6b7280]">Upload company images for your gallery tab.</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex flex-wrap items-center gap-3">
                          <input
                            ref={modalGalleryInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={handleGalleryPick}
                            disabled={saving}
                          />

                          <button
                            type="button"
                            onClick={() => modalGalleryInputRef.current?.click()}
                            className="inline-flex h-[42px] items-center justify-center gap-2 rounded-[12px] border border-[#d1d5db] bg-white px-4 text-sm font-semibold text-[#374151] transition hover:bg-[#f9fafb]"
                            disabled={saving}
                          >
                            <UploadIcon className="h-4 w-4" />
                            Upload Gallery Images
                          </button>

                          <p className="text-[12px] text-[#6b7280]">
                            Max {MAX_GALLERY_IMAGES} images total, 8MB each
                          </p>
                        </div>

                        {galleryDisplayItems.length > 0 ? (
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {persistedGalleryItems.map((item, index) => (
                              <div
                                key={`persisted-${item._id || item.url}-${index}`}
                                className="overflow-hidden rounded-[16px] border border-[#d1d5db] bg-[#FFFFFF]"
                              >
                                <img
                                  src={item.url}
                                  alt={`Saved gallery ${index + 1}`}
                                  className="h-[180px] w-full object-cover"
                                />
                                <div className="flex items-center justify-between border-t border-[#d1d5db] bg-white px-3 py-2">
                                  <span className="truncate text-[12px] font-medium text-[#4b5563]">
                                    {item.caption || 'Saved image'}
                                  </span>
                                  <span className="rounded-full bg-[#f3f4f6] px-2.5 py-1 text-[11px] font-semibold text-[#2e66a6]">
                                    Saved
                                  </span>
                                </div>
                              </div>
                            ))}

                            {galleryPreviews.map((item, index) => (
                              <div
                                key={`local-${item.id}-${index}`}
                                className="overflow-hidden rounded-[16px] border border-[#d1d5db] bg-[#FFFFFF]"
                              >
                                <img
                                  src={item.url}
                                  alt={`New gallery ${index + 1}`}
                                  className="h-[180px] w-full object-cover"
                                />
                                <div className="flex items-center justify-between border-t border-[#d1d5db] bg-white px-3 py-2">
                                  <span className="truncate text-[12px] font-medium text-[#4b5563]">
                                    {item.file?.name || 'New image'}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => removeLocalGalleryPreview(item.id)}
                                    className="rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-100"
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="rounded-[16px] border border-dashed border-[#d1d5db] bg-[#FFFFFF] px-6 py-12 text-center">
                            <ImageIcon className="mx-auto h-10 w-10 text-[#6b7280]" />
                            <p className="mt-3 text-sm font-medium text-[#4b5563]">No gallery images selected yet.</p>
                            <p className="mt-1 text-[13px] text-[#6b7280]">Upload images to show them in the Gallery tab.</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col-reverse gap-3 border-t border-[#d1d5db] px-2 pt-5 sm:flex-row sm:items-center sm:justify-end">
                      <button
                        type="button"
                        onClick={handleCancel}
                        disabled={saving}
                        className="inline-flex h-[46px] items-center justify-center rounded-[12px] border border-[#d1d5db] bg-white px-5 text-sm font-semibold text-[#374151] transition hover:bg-[#f9fafb] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Cancel
                      </button>

                      <button
                        type="submit"
                        disabled={saveDisabled}
                        className="inline-flex h-[46px] items-center justify-center gap-2 rounded-[12px] bg-[#2e66a6] px-6 text-sm font-semibold text-white transition hover:bg-[#255487] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {saving ? (
                          <>
                            <SpinnerIcon className="h-4 w-4" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <EditIcon className="h-4 w-4" />
                            Save Changes
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </EmployerLayout>
  );
};

export default CompanyProfile;