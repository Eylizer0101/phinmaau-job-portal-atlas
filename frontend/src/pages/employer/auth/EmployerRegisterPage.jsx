// src/pages/employer/auth/EmployerRegisterPage.jsx
import React, { useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

// ✅ ADDED: region/city mapping (Option A separate file)
import { PH_REGIONS, PH_CITIES_BY_REGION } from '../../../constants/phLocations';

const EMPLOYER_DOC_KEYS = ['secRegistration', 'birRegistration', 'dtiRegistration', 'cityPermit', 'businessPermit'];
const ALLOWED_DOC_EXTENSIONS = new Set(['pdf', 'jpg', 'jpeg', 'png']);
const ALLOWED_DOC_MIME_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']);
const MAX_DOC_SIZE = 5 * 1024 * 1024;
const INVALID_DOC_MESSAGE = 'Invalid file. Upload PDF, JPG, JPEG, or PNG only, up to 5MB.';
const PERSON_NAME_PATTERN = /^[\p{L}\s'-]+$/u;
const SAFE_INDUSTRY_PATTERN = /^[^<>\u0000-\u001F\u007F]+$/u;
const MAX_INDUSTRY_LENGTH = 100;
const BUSINESS_EMAIL_PATTERN = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;

const normalizeIndustryValue = (value) =>
  String(value || '')
    .trim()
    .replace(/\s+/g, ' ');

const normalizeWebsiteUrl = (value) => {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  if (/\s|<|>|["'`]/.test(trimmed) || /^(?:javascript|data):/i.test(trimmed)) return null;

  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(candidate);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    if (parsed.username || parsed.password || !parsed.hostname || !parsed.hostname.includes('.')) return null;
    if (!/^[a-z0-9.-]+$/i.test(parsed.hostname) || parsed.hostname.startsWith('.') || parsed.hostname.endsWith('.')) return null;
    return parsed.toString();
  } catch {
    return null;
  }
};

const getDocumentSignatureType = async (file) => {
  const bytes = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  if (
    bytes.length >= 5
    && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44
    && bytes[3] === 0x46 && bytes[4] === 0x2d
  ) return 'pdf';
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpeg';
  const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length >= 8 && pngSignature.every((byte, index) => bytes[index] === byte)) return 'png';
  return null;
};

const validateEmployerDocument = async (file) => {
  if (!file || file.size > MAX_DOC_SIZE) return false;
  const extension = String(file.name || '').split('.').pop()?.toLowerCase() || '';
  const mimeType = String(file.type || '').toLowerCase();
  if (!ALLOWED_DOC_EXTENSIONS.has(extension) || !ALLOWED_DOC_MIME_TYPES.has(mimeType)) return false;

  try {
    const signatureType = await getDocumentSignatureType(file);
    const expectedType = extension === 'jpg' ? 'jpeg' : extension;
    const expectedMime = signatureType === 'pdf'
      ? 'application/pdf'
      : signatureType === 'png'
        ? 'image/png'
        : 'image/jpeg';
    return signatureType === expectedType
      && (mimeType === expectedMime || (signatureType === 'jpeg' && mimeType === 'image/jpg'));
  } catch {
    return false;
  }
};

const EmployerRegisterPage = () => {
  const navigate = useNavigate();

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://phinmaau-job-portal-atlas.onrender.com/api';
  const API_URL = `${API_BASE_URL.replace(/\/$/, '')}/auth/employer/register`;
  const REQUEST_EMAIL_OTP_API_URL = `${API_BASE_URL.replace(/\/$/, '')}/auth/request-registration-email-otp`;
  const VERIFY_EMAIL_API_URL = `${API_BASE_URL.replace(/\/$/, '')}/auth/verify-registration-email`;
  const RESEND_EMAIL_OTP_API_URL = `${API_BASE_URL.replace(/\/$/, '')}/auth/resend-registration-email-otp`;

  // ✅ NEW ORDER:
  // 1 = Company Info
  // 2 = Basic Info
  // 3 = Documents
  const [step, setStep] = useState(1);
  const [currentHowItWorksSlide, setCurrentHowItWorksSlide] = useState(0);

  const [formData, setFormData] = useState({
    // Primary user information (Basic Info)
    firstName: '',
    middleName: '',
    lastName: '',
    extensionName: '',
    mobileNumber: '',

    // Company information (Company Info)
    companyName: '',
    companyWebsiteUrl: '',
    businessEmail: '',
    regionCity: '',
    industry: '',
  });

  // ✅ ADDED: separate region + city states (optional)
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedCity, setSelectedCity] = useState('');

  const [docs, setDocs] = useState({
    secRegistration: null,
    birRegistration: null,
    dtiRegistration: null,
    cityPermit: null,
    businessPermit: null,
  });

  const [companyLogo, setCompanyLogo] = useState(null);
  const [companyLogoPreview, setCompanyLogoPreview] = useState('');

  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  // ✅ show helper text only when focused
  const [focused, setFocused] = useState({});
  const [industryOpen, setIndustryOpen] = useState(false);

  // ✅ NEW: Popups
  const [showReadyModal, setShowReadyModal] = useState(false);
  const [showThanksModal, setShowThanksModal] = useState(false);
  const [showEmailVerificationModal, setShowEmailVerificationModal] = useState(false);
  const [emailOtp, setEmailOtp] = useState('');
  const [emailOtpError, setEmailOtpError] = useState('');
  const [emailOtpMessage, setEmailOtpMessage] = useState('');

  const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

  // ---------- file picker refs (for custom upload UI) ----------
  const companyLogoRef = useRef(null);

  const docRefs = {
    secRegistration: useRef(null),
    birRegistration: useRef(null),
    dtiRegistration: useRef(null),
    cityPermit: useRef(null),
    businessPermit: useRef(null),
  };

  const DOC_KEYS = EMPLOYER_DOC_KEYS;

  // ✅ UPDATED STEP FIELDS (3 steps only) - NEW ORDER
  const STEP_FIELDS = {
    1: ['companyName', 'companyWebsiteUrl', 'companyLogo', 'industry', 'regionCity'],
    2: ['firstName', 'middleName', 'lastName', 'extensionName', 'businessEmail', 'mobileNumber'],
    3: ['secRegistration', 'birRegistration', 'dtiRegistration', 'cityPermit', 'businessPermit'],
  };

  const steps = [
    { id: 1, label: 'Company Info', title: 'Company information' },
    { id: 2, label: 'Primary Contact', title: 'Primary user' },
    { id: 3, label: 'Company Requirements', title: 'Company documents' },
  ];

  const EXTENSION_OPTIONS = ['', 'Jr.', 'Sr.', 'II', 'III', 'IV', 'V'];

  const setFieldFocus = (name, isFocused) => {
    setFocused((prev) => ({ ...prev, [name]: isFocused }));
  };

  const clearFieldError = (name) => {
    if (!fieldErrors?.[name]) return;
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const focusField = (key) => {
    const targetId =
      key === 'regionCity'
        ? 'region'
        : key === 'companyLogo'
        ? 'companyLogo-btn'
        : DOC_KEYS.includes(key)
        ? `${key}-btn`
        : key;

    const el = document.getElementById(targetId);
    if (el?.focus) el.focus();
  };

  // ✅ Industry options (exact list you provided)
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

  const industrySearch = formData.industry.trim();
  const filteredIndustryOptions = useMemo(() => {
    const query = industrySearch.toLowerCase();
    if (!query) return INDUSTRY_OPTIONS;
    return INDUSTRY_OPTIONS.filter((option) => option.toLowerCase().includes(query));
  }, [industrySearch]);
  const hasExactIndustryMatch = INDUSTRY_OPTIONS.some(
    (option) => option.toLowerCase() === industrySearch.toLowerCase()
  );
  const isCustomIndustryValue = Boolean(industrySearch && !hasExactIndustryMatch);
  const industryCharacterCount = formData.industry.length;

  const getValidationErrors = (onlyKeys = null) => {
    const check = (k) => !onlyKeys || onlyKeys.includes(k);
    const next = {};
    // Basic Info
    if (check('firstName')) {
      const value = formData.firstName.trim();
      if (!value) next.firstName = 'First name is required.';
      else if (value.length > 50) next.firstName = 'Maximum of 50 characters only.';
      else if (!PERSON_NAME_PATTERN.test(value)) next.firstName = "Use letters, spaces, hyphens, and apostrophes only.";
    }

    if (check('middleName')) {
      const value = formData.middleName.trim();
      if (value.length > 50) next.middleName = 'Maximum of 50 characters only.';
      else if (value && !PERSON_NAME_PATTERN.test(value)) next.middleName = "Use letters, spaces, hyphens, and apostrophes only.";
    }

    if (check('lastName')) {
      const value = formData.lastName.trim();
      if (!value) next.lastName = 'Last name is required.';
      else if (value.length > 50) next.lastName = 'Maximum of 50 characters only.';
      else if (!PERSON_NAME_PATTERN.test(value)) next.lastName = "Use letters, spaces, hyphens, and apostrophes only.";
    }

    if (check('extensionName')) {
      if (formData.extensionName && !EXTENSION_OPTIONS.includes(formData.extensionName)) {
        next.extensionName = 'Invalid suffix/extension.';
      }
    }

    if (check('businessEmail')) {
      const businessEmail = normalizeEmail(formData.businessEmail);
      if (!businessEmail) next.businessEmail = 'Business email is required.';
      else if (!BUSINESS_EMAIL_PATTERN.test(businessEmail))
        next.businessEmail = 'Please enter a valid email address.';
    }

    if (check('mobileNumber')) {
      const v = formData.mobileNumber.trim();
      if (!v) next.mobileNumber = 'Phone / Mobile number is required.';
      else if (!/^09\d{9}$/.test(v)) {
        next.mobileNumber = 'Please enter a valid 11-digit Philippine mobile number starting with 09.';
      }
    }

    // Company info
    if (check('companyName')) {
      const value = formData.companyName.trim();
      if (!value) next.companyName = 'Company name is required.';
      else if (value.length < 2) next.companyName = 'Company name must contain at least 2 characters.';
      else if (value.length > 200) next.companyName = 'Company name must not exceed 200 characters.';
    }

    if (check('companyWebsiteUrl')) {
      const v = formData.companyWebsiteUrl.trim();
      if (v && !normalizeWebsiteUrl(v)) next.companyWebsiteUrl = 'Enter a valid company website URL.';
    }

    if (check('companyLogo') && companyLogo) {
      const allowedLogoTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      const maxLogoSize = 5 * 1024 * 1024;

      if (!allowedLogoTypes.includes(companyLogo.type)) {
        next.companyLogo = 'Only JPG, JPEG, PNG, GIF, or WEBP images are allowed.';
      } else if (companyLogo.size > maxLogoSize) {
        next.companyLogo = 'Company logo must be 5MB or smaller.';
      }
    }

    if (check('industry')) {
      const value = normalizeIndustryValue(formData.industry);
      if (!value) next.industry = 'Industry is required.';
      else if (value.length > MAX_INDUSTRY_LENGTH) next.industry = 'Industry must not exceed 100 characters.';
      else if (!SAFE_INDUSTRY_PATTERN.test(value) || /^\s*(?:javascript|data):/i.test(value)) {
        next.industry = 'Enter a valid industry without HTML or script content.';
      }
    }

    if (check('regionCity')) {
      if (!selectedRegion) next.regionCity = 'Region is required.';
      else if (!selectedCity) next.regionCity = 'Province is required.';
      else if (!formData.regionCity.trim()) next.regionCity = 'Region and Province are required.';
    }

    // Documents (now 5 required)
    if (check('secRegistration') && !docs.secRegistration) next.secRegistration = 'SEC registration document is required.';
    if (check('birRegistration') && !docs.birRegistration) next.birRegistration = 'BIR registration document is required.';
    if (check('dtiRegistration') && !docs.dtiRegistration) next.dtiRegistration = 'DTI registration document is required.';
    if (check('cityPermit') && !docs.cityPermit) next.cityPermit = 'City / Municipality permit document is required.';
    if (check('businessPermit') && !docs.businessPermit) next.businessPermit = 'Business permit document is required.';
    return next;
  };

  const validate = (onlyKeys = null) => {
    const next = getValidationErrors(onlyKeys);

    setFieldErrors((prev) => {
      if (!onlyKeys) return next;
      const cleaned = { ...prev };
      onlyKeys.forEach((k) => delete cleaned[k]);
      return { ...cleaned, ...next };
    });

    const firstKey = Object.keys(next)[0];
    if (firstKey) focusField(firstKey);

    return Object.keys(next).length === 0;
  };

  const isStepComplete = (stepId) => {
    const keys = STEP_FIELDS[stepId] || [];
    if (!keys.length) return false;
    return Object.keys(getValidationErrors(keys)).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'mobileNumber') {
      if (!/^\d*$/.test(value)) return;
      if (value.length > 11) return;
    }

    if (name === 'industry') {
      const limitedValue = value.slice(0, MAX_INDUSTRY_LENGTH);

      setFormData((prev) => ({
        ...prev,
        industry: limitedValue,
      }));

      setServerError('');

      if (value.length > MAX_INDUSTRY_LENGTH) {
        setFieldErrors((prev) => ({
          ...prev,
          industry: 'Industry must not exceed 100 characters.',
        }));
      } else {
        clearFieldError('industry');
      }

      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setServerError('');
    clearFieldError(name);
  };

  const handleRegionChange = (e) => {
    const region = e.target.value;

    setSelectedRegion(region);
    setSelectedCity('');

    const combined = region ? region : '';
    setFormData((prev) => ({ ...prev, regionCity: combined }));

    setServerError('');
    clearFieldError('regionCity');
  };

  const handleCityChange = (e) => {
    const city = e.target.value;

    setSelectedCity(city);

    const combined =
      selectedRegion && city ? `${selectedRegion} - ${city}` : selectedRegion ? `${selectedRegion}` : city ? `${city}` : '';

    setFormData((prev) => ({ ...prev, regionCity: combined }));

    setServerError('');
    clearFieldError('regionCity');
  };

  const handleCompanyLogoChange = (e) => {
    const file = e.target.files?.[0] || null;

    if (companyLogoPreview) {
      URL.revokeObjectURL(companyLogoPreview);
    }

    setCompanyLogo(file);
    setCompanyLogoPreview(file ? URL.createObjectURL(file) : '');
    setServerError('');
    clearFieldError('companyLogo');
  };

  const openCompanyLogoPicker = () => {
    if (loading) return;
    companyLogoRef.current?.click?.();
  };

  const clearCompanyLogo = () => {
    if (loading) return;

    if (companyLogoPreview) {
      URL.revokeObjectURL(companyLogoPreview);
    }

    setCompanyLogo(null);
    setCompanyLogoPreview('');
    clearFieldError('companyLogo');

    if (companyLogoRef.current) {
      companyLogoRef.current.value = '';
    }
  };

  const handleDocChange = async (e) => {
    const input = e.target;
    const { name, files } = input;
    const file = files?.[0] || null;

    if (file && !(await validateEmployerDocument(file))) {
      setDocs((prev) => ({ ...prev, [name]: null }));
      setFieldErrors((prev) => ({ ...prev, [name]: INVALID_DOC_MESSAGE }));
      input.value = '';
      return;
    }

    setDocs((prev) => ({ ...prev, [name]: file }));
    setServerError('');
    clearFieldError(name);
  };

  const openDocPicker = (key) => {
    if (loading) return;
    docRefs[key]?.current?.click?.();
  };

  const clearDoc = (key) => {
    if (loading) return;
    setDocs((prev) => ({ ...prev, [key]: null }));
    clearFieldError(key);
    if (docRefs[key]?.current) docRefs[key].current.value = '';
  };

  const stepHasError = (stepId) => {
    const keys = STEP_FIELDS[stepId] || [];
    return keys.some((k) => Boolean(fieldErrors?.[k]));
  };

  const handleBackStep = () => setStep((s) => Math.max(1, s - 1));

  const submitVerifiedRegistration = async (registrationVerificationToken) => {
      const fd = new FormData();

      fd.append('role', 'employer');

      // Basic Info
      fd.append('firstName', formData.firstName.trim());
      fd.append('middleName', formData.middleName.trim());
      fd.append('lastName', formData.lastName.trim());
      fd.append('extensionName', formData.extensionName.trim());
      fd.append('businessEmail', normalizeEmail(formData.businessEmail));
      fd.append('mobileNumber', formData.mobileNumber.trim());

      // Company Info
      fd.append('companyName', formData.companyName.trim());
      fd.append('companyWebsiteUrl', normalizeWebsiteUrl(formData.companyWebsiteUrl) || '');
      fd.append('regionCity', formData.regionCity.trim());
      fd.append('industry', normalizeIndustryValue(formData.industry));
      if (companyLogo) fd.append('companyLogo', companyLogo);

      // Documents (5)
      fd.append('secRegistration', docs.secRegistration);
      fd.append('birRegistration', docs.birRegistration);
      fd.append('dtiRegistration', docs.dtiRegistration);
      fd.append('cityPermit', docs.cityPermit);
      fd.append('businessPermit', docs.businessPermit);

      await axios.post(API_URL, fd, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${registrationVerificationToken}`,
        },
      });
  };

  const handleSubmit = async () => {
    setServerError('');

    const ok = validate(null);
    if (!ok) return;

    setLoading(true);
    try {
      const response = await axios.post(REQUEST_EMAIL_OTP_API_URL, {
        email: normalizeEmail(formData.businessEmail),
        role: 'employer',
      });

      setShowReadyModal(false);
      setEmailOtp('');
      setEmailOtpError('');
      setEmailOtpMessage(response.data?.message || 'We sent a 6-digit verification code to your business email.');
      setShowEmailVerificationModal(true);
    } catch (err) {
      setServerError(err.response?.data?.message || 'Registration failed. Please try again.');
      setShowReadyModal(false);
    } finally {
      setLoading(false);
    }
  };

  const verifyRegistrationEmail = async () => {
    if (!/^\d{6}$/.test(emailOtp)) {
      setEmailOtpError('Enter the 6-digit OTP sent to your email.');
      return;
    }
    setLoading(true);
    setEmailOtpError('');
    try {
      const response = await axios.post(VERIFY_EMAIL_API_URL, {
        email: normalizeEmail(formData.businessEmail),
        role: 'employer',
        otp: emailOtp,
      });
      const registrationVerificationToken = response.data?.registrationVerificationToken;
      if (!registrationVerificationToken) throw new Error('Missing registration verification token.');
      await submitVerifiedRegistration(registrationVerificationToken);
      setShowEmailVerificationModal(false);
      setShowThanksModal(true);
    } catch (err) {
      setEmailOtpError(err.response?.data?.message || 'Unable to verify the code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resendRegistrationEmailOtp = async () => {
    setLoading(true);
    setEmailOtpError('');
    try {
      const response = await axios.post(RESEND_EMAIL_OTP_API_URL, {
        email: normalizeEmail(formData.businessEmail),
        role: 'employer',
      });
      setEmailOtp('');
      setEmailOtpMessage(response.data?.message || 'A new verification code has been sent.');
    } catch (err) {
      setEmailOtpError(err.response?.data?.message || 'Unable to send a new code right now.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => navigate('/employer/login');

  const labelBase = 'block text-sm font-semibold text-gray-800';

  const inputBase =
    'block w-full h-11 px-3 text-sm text-gray-900 border border-gray-200 rounded-xl bg-white ' +
    'shadow-sm transition ' +
    'focus:outline-none focus:border-[#2e66a6]  ' +
    'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed';

  const fieldClass = (hasError) => `${inputBase} ${hasError ? 'border-red-400 focus:border-red-600 ' : ''}`;

  const iconWrap = 'absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10';
  const selectWithLeftIconClass = (hasError) => `${fieldClass(hasError)} pl-3 pr-10 sm:pl-10`;

  const helperText = (id, text) => (
    <p id={id} className="text-[11px] text-gray-500 mt-1">
      {text}
    </p>
  );

  const errorText = (id, msg) =>
    msg ? (
      <p id={id} className="text-xs text-red-600 mt-1" role="alert" aria-live="assertive">
        {msg}
      </p>
    ) : null;

  const describedBy = (...ids) => ids.filter(Boolean).join(' ') || undefined;

  const serverAlert = useMemo(() => {
    if (!serverError) return null;
    return (
      <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl" role="alert" aria-live="assertive">
        <div className="flex items-start">
          <svg aria-hidden="true" className="w-4 h-4 text-red-600 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          <p className="text-red-900 font-semibold text-sm">{serverError}</p>
        </div>
      </div>
    );
  }, [serverError]);

  const Stepper = () => (
    <div className="mt-3 sm:mt-4">
      <div className="grid grid-cols-3 items-start">
        {steps.map((s, idx) => {
          const isActive = s.id === step;
          const isDone = s.id < step && isStepComplete(s.id);
          const isError = stepHasError(s.id);

          const leftLine =
            idx === 0 ? 'bg-transparent' : s.id <= step ? 'bg-[#2e66a6]' : 'bg-gray-200';

          const rightLine =
            idx === steps.length - 1 ? 'bg-transparent' : s.id < step ? 'bg-[#2e66a6]' : 'bg-gray-200';

          const circleBase =
            'w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs sm:text-sm font-extrabold transition ' +
            'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2e66a6]/20';

          const circleClass = isDone
            ? 'bg-green-600 text-white'
            : isActive
            ? 'bg-[#2e66a6] text-white'
            : 'bg-gray-100 text-gray-600';

          const labelClass = isDone
            ? 'text-green-600'
            : isActive
            ? 'text-[#2e66a6]'
            : 'text-gray-500';

          return (
            <div key={s.id} className="min-w-0">
              <div className="flex items-center">
                <div className={`h-px flex-1 ${leftLine}`} />
                <button
                  type="button"
                  onClick={() => {
                    if (s.id <= step) setStep(s.id);
                  }}
                  className={`${circleBase} ${circleClass} ${
                    isError ? 'ring-2 ring-red-500 ring-offset-2 ring-offset-white' : ''
                  }`}
                  aria-current={isActive ? 'step' : undefined}
                  aria-label={`Step ${s.id}: ${s.label}`}
                  disabled={loading}
                >
                  {isDone ? (
                    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-7.5 7.5a1 1 0 01-1.414 0l-3.5-3.5a1 1 0 011.414-1.414l2.793 2.793 6.793-6.793a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    s.id
                  )}
                </button>
                <div className={`h-px flex-1 ${rightLine}`} />
              </div>

              <p className={`mt-1.5 sm:mt-2 min-h-[30px] sm:min-h-0 px-1 text-[10px] sm:text-[11px] font-semibold leading-tight text-center ${labelClass}`}>{s.label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );

  const IconDoc = () => (
    <svg aria-hidden="true" className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h7l5 5v11a2 2 0 01-2 2z" />
    </svg>
  );

  const IconUser = () => (
    <svg aria-hidden="true" className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    </svg>
  );

  const IconMail = () => (
    <svg aria-hidden="true" className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  );

  const IconBuilding = () => (
    <svg aria-hidden="true" className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M3 21h18M5 21V5a2 2 0 012-2h10a2 2 0 012 2v16M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5"
      />
    </svg>
  );

  const IconGlobe = () => (
    <svg aria-hidden="true" className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 21a9 9 0 100-18 9 9 0 000 18zm0 0c2.5-2.5 4-5.5 4-9s-1.5-6.5-4-9m0 18c-2.5-2.5-4-5.5-4-9s1.5-6.5 4-9M3 12h18" />
    </svg>
  );

  const IconPhone = () => (
    <svg aria-hidden="true" className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h2l2 5-2 1c1.5 3 4 5.5 7 7l1-2 5 2v2a2 2 0 01-2 2h-1C9.82 20 4 14.18 4 7V6a1 1 0 01-1-1z" />
    </svg>
  );

  const IconLocation = () => (
    <svg aria-hidden="true" className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 11.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.5 10c0 7-7.5 11-7.5 11S4.5 17 4.5 10a7.5 7.5 0 1115 0z" />
    </svg>
  );

  const FileRow = ({ k, title }) => {
    const file = docs[k];
    return (
      <div className="space-y-1">
        <label className={labelBase} htmlFor={k}>
          {title}
        </label>

        <input
          id={k}
          ref={docRefs[k]}
          name={k}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
          onChange={handleDocChange}
          disabled={loading}
          className="sr-only"
        />

        <div
          className={`flex items-center justify-between gap-3 rounded-xl border bg-white px-3 py-2 shadow-sm ${
            fieldErrors?.[k] ? 'border-red-300' : 'border-gray-200'
          }`}
        >
          <p className="text-xs text-gray-700 truncate min-w-0">{file ? file.name : 'No file selected'}</p>

          <div className="flex items-center gap-2 shrink-0">
            {file && (
              <button
                type="button"
                onClick={() => clearDoc(k)}
                disabled={loading}
                className="h-9 px-3 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-100
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6]/20 disabled:opacity-50"
              >
                Remove
              </button>
            )}

            <button
              id={`${k}-btn`}
              type="button"
              onClick={() => openDocPicker(k)}
              disabled={loading}
              className="h-9 px-4 rounded-lg text-xs font-semibold text-white bg-[#2e66a6] hover:bg-[#255489]
                focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2e66a6]/20 disabled:opacity-50"
            >
              {file ? 'Replace' : 'Upload'}
            </button>
          </div>
        </div>

        {errorText(`${k}-error`, fieldErrors?.[k])}
      </div>
    );
  };

  const onFormSubmit = (e) => {
    e.preventDefault();

    const ok = validate(STEP_FIELDS[step]);
    if (!ok) return;

    if (step < 3) {
      setStep((s) => Math.min(3, s + 1));
      return;
    }

    setShowReadyModal(true);
  };

  const cityOptions = useMemo(() => {
    if (!selectedRegion) return [];
    return PH_CITIES_BY_REGION[selectedRegion] || [];
  }, [selectedRegion]);

  const ModalShell = ({ children, onClose }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/20"
        onClick={() => {
          if (!loading) onClose?.();
        }}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-2xl">{children}</div>
    </div>
  );

  const ReadyToGoModal = () => {
    if (!showReadyModal) return null;

    return (
      <ModalShell
        onClose={() => {
          if (!loading) setShowReadyModal(false);
        }}
      >
        <div className="bg-white rounded-2xl shadow-2xl ring-1 ring-black/5">
          <div className="p-8 sm:p-10">
            <div className="flex justify-center">
              <div className="w-14 h-14 rounded-full flex items-center justify-center">
                <img src="/images/check.png" alt="Check" className="w-20 h-20 object-contain" draggable="false" />
              </div>
            </div>

            <h3 className="mt-5 text-center text-3xl font-extrabold text-gray-900">READY TO GO?</h3>

            <div className="mt-5 rounded-xl bg-[#eaf1fb] px-6 py-4 text-center">
              <p className="text-sm text-gray-800">
                Before submitting your registration, please ensure that your company information is accurate, complete, and officially authorized. By clicking Submit Registration, you confirm that the details provided are true and legitimate. You also authorize AGAPAY to display your company profile and job postings within the system to facilitate recruitment, talent matching, and communication with qualified graduates.
              </p>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-5">
              <button
                type="button"
                onClick={() => setShowReadyModal(false)}
                disabled={loading}
                className="h-12 w-full sm:w-56 rounded-xl border border-gray-300 bg-white text-sm font-semibold text-gray-900
                hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2e66a6]/20
                disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Go Back
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="h-12 w-full sm:w-56 rounded-xl text-sm font-semibold text-white bg-[#2e66a6] hover:bg-[#245387]
                focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2e66a6]/20
                disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {loading ? 'Submitting...' : 'Submit Registration'}
              </button>
            </div>
          </div>
        </div>
      </ModalShell>
    );
  };


  // ---------- How it Works Carousel ----------
  const howItWorksSlides = [
    {
      id: 1,
      title: 'Provide your official company details',
      description: [
        'Make sure all information is accurate, complete, and legitimate.',
        'This ensures that graduates can identify your company properly',
        'and trust the opportunities you post on the platform.',
      ],
      icon: 'details',
    },
    {
      id: 2,
      title: 'Provide Primary Contact Information',
      description: [
        'This allows our team and potential applicants to communicate',
        'with the right representative regarding job postings, updates,',
        'and application matters.',
      ],
      icon: 'profile',
    },
    {
      id: 3,
      title: 'Submit the necessary company documents',
      description: [
        'This helps verify the legitimacy of your organization and',
        'maintains a secure and professional environment for both',
        'employers and graduates.',
      ],
      icon: 'documents',
    },
    {
      id: 4,
      title: 'Account Review',
      description: ['Before submitting, carefully review all provided information.'],
      checklist: [
        'Is the company information correct and updated?',
        'Is the primary contact person accurate?',
        'Are all required documents uploaded?',
      ],
      footer: 'Once everything is complete and verified, submit your registration.',
      icon: 'review',
    },
    {
      id: 5,
      title: 'AGAPAY team carefully reviews all',
      description: [
        'submitted information to ensure authenticity, accuracy, and',
        'credibility. This process typically takes 24 to 48 hours.',
        'Once approved, you will receive a confirmation email containing',
        'your login details. Please keep an eye on your inbox if we need',
        'any additional information, our team will contact you directly.',
      ],
      icon: 'approval',
    },
  ];

  const totalHowItWorksSlides = howItWorksSlides.length;

  const goToHowItWorksSlide = (index) => {
    setCurrentHowItWorksSlide((index + totalHowItWorksSlides) % totalHowItWorksSlides);
  };

  const activeHowItWorksSlide = howItWorksSlides[currentHowItWorksSlide];

  const renderHowItWorksIcon = (icon) => {
    if (icon === 'profile') {
      return (
        <svg className="w-7 h-7 text-[#1f67b7]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 21a7 7 0 0114 0" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11h4v4h-4zM18 10v6" />
        </svg>
      );
    }

    if (icon === 'documents') {
      return (
        <svg className="w-7 h-7 text-[#1f67b7]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h7l5 5v11a2 2 0 01-2 2z" />
        </svg>
      );
    }

    if (icon === 'review') {
      return (
        <svg className="w-7 h-7 text-[#1f67b7]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 11l3 3L22 4" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
        </svg>
      );
    }

    if (icon === 'approval') {
      return (
        <svg className="w-7 h-7 text-[#1f67b7]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 22a10 10 0 100-20 10 10 0 000 20z" />
        </svg>
      );
    }

    return (
      <svg className="w-7 h-7 text-[#1f67b7]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    );
  };

  const HowItWorksCarousel = () => (
    <section
      className="relative w-full overflow-hidden rounded-[24px] sm:rounded-[28px] bg-gradient-to-br from-[#092762] via-[#1f5ea4] to-[#56b5dc] text-white shadow-[0_12px_28px_rgba(20,74,129,0.28)]"
      aria-label="How it Works carousel"
    >
      <div className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
      <div className="pointer-events-none absolute -left-16 bottom-20 h-36 w-36 rounded-full bg-[#52b2db]/30 blur-3xl" />

      <div className="relative z-10 px-3 py-4 sm:px-7 sm:py-6 lg:px-7">
        <div className="text-center">
          <h3 className="text-xl sm:text-3xl font-extrabold text-white leading-tight">How it Works</h3>
          <div className="mt-8 sm:mt-9" aria-hidden="true" />
        </div>

        <div className="mt-4 sm:mt-5 flex items-center justify-center px-1 sm:px-2" aria-label="How it Works step progress">
          {howItWorksSlides.map((slide, index) => {
            const isActive = index === currentHowItWorksSlide;
            return (
              <React.Fragment key={slide.id}>
                <button
                  type="button"
                  onClick={() => goToHowItWorksSlide(index)}
                  className={`flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full border text-xs sm:text-sm font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/25 ${
                    isActive
                      ? 'scale-110 border-white bg-white text-[#1f5ea4] shadow-lg'
                      : 'border-white/55 bg-white/5 text-white hover:bg-white/15'
                  }`}
                  aria-label={`Go to how it works step ${slide.id}`}
                  aria-current={isActive ? 'step' : undefined}
                >
                  {slide.id}
                </button>

                {index !== howItWorksSlides.length - 1 && <div className="h-px flex-1 max-w-[48px] sm:max-w-[64px] bg-white/45" aria-hidden="true" />}
              </React.Fragment>
            );
          })}
        </div>

        <div className="relative mt-4 sm:mt-5">
          <button
            type="button"
            onClick={() => goToHowItWorksSlide(currentHowItWorksSlide - 1)}
            className="absolute -left-2 sm:-left-3 top-1/2 z-30 flex h-11 w-11 sm:h-12 sm:w-12 -translate-y-1/2 items-center justify-center bg-transparent text-[#225d9f] transition hover:-translate-y-1/2 hover:scale-110 focus-visible:outline-none"
            aria-label="Previous how it works step"
          >
            <svg className="w-7 h-7 sm:w-8 sm:h-8" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => goToHowItWorksSlide(currentHowItWorksSlide + 1)}
            className="absolute -right-2 sm:-right-3 top-1/2 z-30 flex h-11 w-11 sm:h-12 sm:w-12 -translate-y-1/2 items-center justify-center bg-transparent text-[#225d9f] transition hover:-translate-y-1/2 hover:scale-110 focus-visible:outline-none"
            aria-label="Next how it works step"
          >
            <svg className="w-7 h-7 sm:w-8 sm:h-8" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          <div className="pointer-events-none absolute left-9 right-5 -top-8 z-0 h-[315px] rounded-3xl bg-white/14 shadow-[0_10px_28px_rgba(8,34,88,0.12)] ring-1 ring-white/15 rotate-[3deg] sm:left-16 sm:right-8 sm:-top-10 sm:h-[335px] lg:h-[345px]" />
          <div className="pointer-events-none absolute left-5 right-9 -top-3 z-0 h-[315px] rounded-3xl bg-white/10 shadow-[0_10px_28px_rgba(8,34,88,0.10)] ring-1 ring-white/10 rotate-[-5deg] sm:left-10 sm:right-16 sm:-top-5 sm:h-[335px] lg:h-[345px]" />

          <div className="relative z-10 overflow-hidden rounded-3xl">
            <div
              className="flex transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(-${currentHowItWorksSlide * 100}%)` }}
            >
              {howItWorksSlides.map((slide) => (
                <div key={slide.id} className="w-full shrink-0 px-1">
                  <div className="h-[315px] sm:h-[335px] lg:h-[345px] overflow-hidden rounded-3xl bg-white px-5 sm:px-7 py-4 sm:py-5 text-center text-[#10233f] shadow-[0_12px_35px_rgba(8,34,88,0.18)] ring-1 ring-white/70 flex flex-col items-center justify-center">
                    <div className="mb-2 sm:mb-3 flex h-11 w-11 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-[#edf5ff] ring-4 sm:ring-6 ring-[#f4f8fd]">
                      {renderHowItWorksIcon(slide.icon)}
                    </div>

                    <h4 className="text-sm sm:text-lg font-extrabold leading-snug text-[#0f2442] break-words">{slide.title}</h4>

                    <div className="mt-2 sm:mt-3 space-y-0.5 text-[11px] sm:text-[14px] font-medium leading-relaxed text-[#31415a] break-words">
                      {slide.description.map((line) => (
                        <p key={`${slide.id}-${line}`}>{line}</p>
                      ))}
                    </div>

                    {slide.checklist ? (
                      <div className="mt-2 sm:mt-3 w-full max-w-[360px] space-y-1.5 sm:space-y-2 text-left">
                        {slide.checklist.map((item) => (
                          <div key={item} className="flex items-start gap-2 sm:gap-3 text-[11px] sm:text-[15px] font-semibold text-[#173253] break-words">
                            <span className="mt-0.5 text-[#1f67b7]">✓</span>
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {slide.footer ? <p className="mt-2 sm:mt-3 text-[11px] sm:text-[14px] font-semibold leading-relaxed text-[#173253] break-words">{slide.footer}</p> : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-3 sm:mt-4 flex items-center justify-center gap-2 sm:gap-3" aria-label="How it Works slide indicators">
          {howItWorksSlides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              onClick={() => goToHowItWorksSlide(index)}
              className={`h-2.5 w-2.5 rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/25 ${
                currentHowItWorksSlide === index ? 'bg-white' : 'bg-white/40 hover:bg-white/70'
              }`}
              aria-label={`Go to how it works step ${slide.id}`}
              aria-current={currentHowItWorksSlide === index ? 'step' : undefined}
            />
          ))}
        </div>
      </div>
    </section>
  );


  const ThankYouModal = () => {
    if (!showThanksModal) return null;

    return (
      <ModalShell
        onClose={() => {
          if (!loading) setShowThanksModal(false);
        }}
      >
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div
            className="bg-white rounded-2xl shadow-2xl ring-1 ring-black/5 
                  w-full max-w-[620px] max-h-[90vh] overflow-y-auto"
          >
            <div className="px-8 pt-10 pb-8 text-center">
              <div className="mx-auto mb-5 w-12 h-12 rounded-full flex items-center justify-center">
                <img src="/images/check.png" alt="Check" className="w-20 h-20 object-contain" draggable="false" />
              </div>

              <h3 className="text-2xl font-extrabold text-gray-900 tracking-tight">Thank you for signing up!</h3>

              <div className="mt-5 bg-[#eef3fb] rounded-xl px-6 py-5">
                <p className="text-sm font-semibold text-gray-900 mb-3">You're account is under review</p>
                <p className="text-sm text-gray-800">
                  Our team is reviewing the information and credentials you submitted to ensure everything is complete and accurate. This verification process usually takes 24 to 48 hours.

                  Once your account is approved, you’ll receive a confirmation email with your login details. Keep an eye on your inbox if we require any additional information, our team will contact you directly.
                </p>
                <p className="text-sm text-gray-800 mt-4">
                  After verification, you’ll gain full access as an employer, allowing you to post job opportunities, connect with top PHINMA AU graduates, and manage applications efficiently.

                  If you don’t receive a confirmation email within 48 hours or have any questions during this process, please contact us at
                  agapay@gmail.com
                </p>
              </div>

              <div className="mt-8 flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => {
                    setShowThanksModal(false);
                    navigate('/employer/login', { replace: true });
                  }}
                  disabled={loading}
                  className="h-12 w-full sm:w-56 rounded-xl border border-gray-300 bg-white text-sm font-semibold text-gray-900
            hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2e66a6]/20 disabled:opacity-50"
                >
                  Got it!
                </button>
              </div>
            </div>
          </div>
        </div>
      </ModalShell>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-[#2e66a6]/10 flex items-center justify-center p-4">
      <ReadyToGoModal />
      <ThankYouModal />
      {showEmailVerificationModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-2xl bg-white p-7 shadow-2xl">
            <h3 className="text-center text-2xl font-extrabold text-gray-900">Verify your email</h3>
            <p className="mt-2 text-center text-sm text-gray-600">{emailOtpMessage}</p>
            <input value={emailOtp} onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="000000" className="mt-6 h-12 w-full rounded-xl border border-gray-300 text-center font-mono text-xl tracking-[0.35em] focus:border-[#2e66a6] focus:outline-none" />
            {emailOtpError && <p className="mt-2 text-center text-sm text-red-600" role="alert">{emailOtpError}</p>}
            <button type="button" onClick={verifyRegistrationEmail} disabled={loading} className="mt-5 h-12 w-full rounded-xl bg-[#2e66a6] text-sm font-semibold text-white disabled:opacity-50">{loading ? 'Verifying...' : 'Verify Email'}</button>
            <button type="button" onClick={resendRegistrationEmailOtp} disabled={loading} className="mt-3 w-full text-sm font-semibold text-[#2e66a6] disabled:opacity-50">Resend code</button>
          </div>
        </div>
      )}

      <div className="w-full max-w-[1340px]">
        <div className="bg-white rounded-2xl shadow-xl ring-1 ring-black/5 overflow-hidden min-h-[90vh]">
          <div className="flex flex-col lg:flex-row">
            <div className="relative lg:w-5/12 p-4 pt-12 sm:p-6 sm:pt-14 lg:p-10 bg-white flex items-center justify-center">
              <button
                type="button"
                onClick={handleBack}
                className="absolute left-6 top-6 z-50 w-9 h-9 flex items-center justify-center rounded-full border border-gray-200 bg-white hover:bg-gray-50 transition
    focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2e66a6]/20"
                aria-label="Go back"
                title="Go back"
              >
                <svg className="w-4 h-4 text-gray-700" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path
                    fillRule="evenodd"
                    d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>

              <div className="h-full w-full flex flex-col justify-center">
                <div className="w-full max-w-[520px] mx-auto relative lg:mt-10">
                  <div className="pointer-events-none absolute inset-0 z-0">
                    <div
                      className="
        absolute
        w-[70px]
        h-[70px]
        rounded-full
        blur-[35px]
        top-[15%]
        right-[15%]
        opacity-70
      "
                      style={{
                        background:
                          'radial-gradient(circle, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.18) 45%, transparent 75%)',
                      }}
                    />
                  </div>

                  <div className="relative z-10">
                    <HowItWorksCarousel />
                  </div>
                </div>
              </div>
            </div>
            <div className="hidden lg:flex items-center justify-center" aria-hidden="true">
              <div className="w-px h-[85%] bg-gradient-to-b from-transparent via-gray-200 to-transparent" />
            </div>

            <div className="lg:w-7/12 p-8 lg:p-10 bg-white flex flex-col justify-center">
              <div className="mx-auto w-full max-w-[760px]">
                <div className="text-center">
                  <h2 className="text-3xl font-bold text-gray-600 tracking-tight">Create Employer Account</h2>
                </div>

                <Stepper />

                <div className="mt-6">
                  {serverAlert}

                  <form onSubmit={onFormSubmit} className="space-y-5" noValidate aria-busy={loading}>
                    {/* STEP 1: COMPANY INFO */}
                    {step === 1 && (
                      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Company name */}
                          <div className="space-y-1">
                            <label htmlFor="companyName" className={labelBase}>
                              Company name
                            </label>
                            <div className="relative">
                              <div className={iconWrap}>
                                <IconBuilding />
                              </div>
                              <input
                                id="companyName"
                                name="companyName"
                                value={formData.companyName}
                                onChange={handleChange}
                                onFocus={() => setFieldFocus('companyName', true)}
                                onBlur={() => setFieldFocus('companyName', false)}
                                className={`${fieldClass(!!fieldErrors.companyName)} pl-10`}
                                disabled={loading}
                                aria-invalid={!!fieldErrors.companyName}
                                aria-describedby={describedBy(
                                  fieldErrors.companyName ? 'companyName-error' : null,
                                  focused.companyName && !fieldErrors.companyName ? 'companyName-help' : null
                                )}
                                placeholder="Enter registered company name"
                              />
                            </div>
                            {focused.companyName && !fieldErrors.companyName && helperText('companyName-help')}
                            {errorText('companyName-error', fieldErrors.companyName)}
                          </div>

                          {/* Website - OPTIONAL */}
                          <div className="space-y-1">
                            <label htmlFor="companyWebsiteUrl" className={labelBase}>
                              Website <span className="text-gray-400 font-semibold">(optional)</span>
                            </label>
                            <div className="relative">
                              <div className={iconWrap}>
                                <IconGlobe />
                              </div>
                              <input
                                id="companyWebsiteUrl"
                                name="companyWebsiteUrl"
                                value={formData.companyWebsiteUrl}
                                onChange={handleChange}
                                onFocus={() => setFieldFocus('companyWebsiteUrl', true)}
                                onBlur={() => setFieldFocus('companyWebsiteUrl', false)}
                                className={`${fieldClass(!!fieldErrors.companyWebsiteUrl)} pl-10`}
                                disabled={loading}
                                aria-invalid={!!fieldErrors.companyWebsiteUrl}
                                aria-describedby={describedBy(
                                  fieldErrors.companyWebsiteUrl ? 'companyWebsiteUrl-error' : null,
                                  focused.companyWebsiteUrl && !fieldErrors.companyWebsiteUrl ? 'companyWebsiteUrl-help' : null
                                )}
                                inputMode="url"
                                autoCapitalize="none"
                                spellCheck={false}
                                maxLength={2048}
                                placeholder="https://www.company.com"
                              />
                            </div>
                            {focused.companyWebsiteUrl && !fieldErrors.companyWebsiteUrl &&
                              helperText('companyWebsiteUrl-help', 'Optional. Enter your company website if available.')}
                            {errorText('companyWebsiteUrl-error', fieldErrors.companyWebsiteUrl)}
                          </div>

                          {/* Company Logo */}
                          <div className="space-y-1">
                            <label htmlFor="companyLogo" className={labelBase}>
                              Company Logo <span className="text-gray-400 font-semibold">(optional)</span>
                            </label>

                            <input
                              ref={companyLogoRef}
                              id="companyLogo"
                              name="companyLogo"
                              type="file"
                              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                              onChange={handleCompanyLogoChange}
                              className="sr-only"
                              disabled={loading}
                            />

                            <div
                              className={`flex h-11 items-center gap-3 rounded-xl border bg-white px-3 shadow-sm ${
                                fieldErrors.companyLogo ? 'border-red-400' : 'border-gray-200'
                              }`}
                            >
                              {companyLogoPreview ? (
                                <img
                                  src={companyLogoPreview}
                                  alt="Company logo preview"
                                  className="h-8 w-8 shrink-0 rounded-lg border border-gray-200 object-contain"
                                />
                              ) : (
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-50 text-gray-500">
                                  <IconBuilding />
                                </div>
                              )}

                              <button
                                id="companyLogo-btn"
                                type="button"
                                onClick={openCompanyLogoPicker}
                                disabled={loading}
                                className="min-w-0 flex-1 truncate text-left text-sm text-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {companyLogo ? companyLogo.name : 'Choose company logo'}
                              </button>

                              {companyLogo ? (
                                <button
                                  type="button"
                                  onClick={clearCompanyLogo}
                                  disabled={loading}
                                  className="shrink-0 text-xs font-semibold text-red-600 hover:underline disabled:opacity-60"
                                >
                                  Remove
                                </button>
                              ) : null}
                            </div>

                            {errorText('companyLogo-error', fieldErrors.companyLogo)}
                          </div>

                          {/* Industry */}
                          <div className="space-y-1">
                            <label htmlFor="industry" className={labelBase}>
                              Industry
                            </label>
                            <div className="relative">
                              <input
                                id="industry"
                                name="industry"
                                value={formData.industry}
                                onChange={handleChange}
                                maxLength={MAX_INDUSTRY_LENGTH}
                                onFocus={() => {
                                  setFieldFocus('industry', true);
                                  setIndustryOpen(true);
                                }}
                                onBlur={() => {
                                  const normalizedIndustry = normalizeIndustryValue(formData.industry);
                                  setFormData((prev) =>
                                    prev.industry === normalizedIndustry
                                      ? prev
                                      : { ...prev, industry: normalizedIndustry }
                                  );
                                  setFieldFocus('industry', false);
                                  window.setTimeout(() => setIndustryOpen(false), 120);
                                }}
                                className={`${fieldClass(!!fieldErrors.industry)} pr-10`}
                                disabled={loading}
                                placeholder="Select or enter an industry"
                                autoComplete="off"
                                role="combobox"
                                aria-autocomplete="list"
                                aria-expanded={industryOpen}
                                aria-controls="industry-options"
                                aria-invalid={!!fieldErrors.industry}
                                aria-describedby={describedBy(
                                  fieldErrors.industry ? 'industry-error' : null,
                                  focused.industry && !fieldErrors.industry ? 'industry-help' : null
                                )}
                              />
                              <button
                                type="button"
                                aria-label="Show industry options"
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => setIndustryOpen((open) => !open)}
                                disabled={loading}
                                className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-gray-500"
                              >
                                <svg
                                  aria-hidden="true"
                                  className="h-4 w-4"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" d="m7 10 5 5 5-5" />
                                </svg>
                              </button>
                              {industryOpen && (
                                <div
                                  id="industry-options"
                                  role="listbox"
                                  className="absolute z-30 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white p-1 shadow-lg"
                                >
                                  {filteredIndustryOptions.map((option) => (
                                    <button
                                      key={option}
                                      type="button"
                                      role="option"
                                      aria-selected={formData.industry === option}
                                      onMouseDown={(event) => event.preventDefault()}
                                      onClick={() => {
                                        setFormData((prev) => ({ ...prev, industry: option }));
                                        clearFieldError('industry');
                                        setIndustryOpen(false);
                                      }}
                                      className="block w-full rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-blue-50"
                                    >
                                      {option}
                                    </button>
                                  ))}
                                  {industrySearch && !hasExactIndustryMatch && (
                                    <button
                                      type="button"
                                      role="option"
                                      aria-selected="false"
                                      onMouseDown={(event) => event.preventDefault()}
                                      onClick={() => {
                                        const normalizedIndustry = normalizeIndustryValue(industrySearch);
                                        setFormData((prev) => ({ ...prev, industry: normalizedIndustry }));
                                        clearFieldError('industry');
                                        setIndustryOpen(false);
                                      }}
                                      className="block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-[#2e66a6] hover:bg-blue-50"
                                    >
                                      Add “{industrySearch}”
                                    </button>
                                  )}
                                  {!filteredIndustryOptions.length && !industrySearch && (
                                    <p className="px-3 py-2 text-sm text-gray-500">No industries available.</p>
                                  )}
                                </div>
                              )}
                            </div>
                            {isCustomIndustryValue ? (
                              <div className="flex justify-end">
                                <span className="text-xs text-gray-500">
                                  {industryCharacterCount} / {MAX_INDUSTRY_LENGTH}
                                </span>
                              </div>
                            ) : null}
                            {focused.industry && !fieldErrors.industry && helperText('industry-help')}
                            {errorText('industry-error', fieldErrors.industry)}
                          </div>

                          {/* Region */}
                          <div className="space-y-1">
                            <label htmlFor="region" className={labelBase}>
                              Region
                            </label>
                            <div className="relative">
                              <div className="hidden sm:flex absolute inset-y-0 left-0 pl-3 items-center pointer-events-none z-10">
                                <IconLocation />
                              </div>
                              <select
                                id="region"
                                name="region"
                                value={selectedRegion}
                                onChange={handleRegionChange}
                                onFocus={() => setFieldFocus('regionCity', true)}
                                onBlur={() => setFieldFocus('regionCity', false)}
                                className={selectWithLeftIconClass(!!fieldErrors.regionCity)}
                                disabled={loading}
                                aria-invalid={!!fieldErrors.regionCity}
                                aria-describedby={describedBy(
                                  fieldErrors.regionCity ? 'regionCity-error' : null,
                                  focused.regionCity && !fieldErrors.regionCity ? 'regionCity-help' : null
                                )}
                              >
                                <option value="">Select Region</option>
                                {PH_REGIONS.map((r) => (
                                  <option key={r} value={r}>
                                    {r}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {/* City */}
                          <div className="space-y-1">
                            <label htmlFor="city" className={labelBase}>
                              Province
                            </label>
                            <div className="relative">
                              <div className="hidden sm:flex absolute inset-y-0 left-0 pl-3 items-center pointer-events-none z-10">
                                <IconLocation />
                              </div>
                              <select
                                id="city"
                                name="city"
                                value={selectedCity}
                                onChange={handleCityChange}
                                onFocus={() => setFieldFocus('regionCity', true)}
                                onBlur={() => setFieldFocus('regionCity', false)}
                                className={selectWithLeftIconClass(!!fieldErrors.regionCity)}
                                disabled={loading || !selectedRegion}
                              >
                                <option value="">{selectedRegion ? 'Select Province' : 'Select Region first'}</option>
                                {cityOptions.map((c) => (
                                  <option key={c} value={c}>
                                    {c}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <input type="hidden" name="regionCity" value={formData.regionCity} />
                          {focused.regionCity && !fieldErrors.regionCity && helperText('regionCity-help', 'Select your region and province.')}
                          {errorText('regionCity-error', fieldErrors.regionCity)}
                        </div>
                      </div>
                    )}

                    {/* STEP 2: BASIC INFO */}
                    {step === 2 && (
                      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* First name */}
                          <div className="space-y-1">
                            <label htmlFor="firstName" className={labelBase}>
                              First name
                            </label>
                            <div className="relative">
                              <div className={iconWrap}>
                                <IconUser />
                              </div>
                              <input
                                id="firstName"
                                name="firstName"
                                value={formData.firstName}
                                onChange={handleChange}
                                onFocus={() => setFieldFocus('firstName', true)}
                                onBlur={() => setFieldFocus('firstName', false)}
                                className={`${fieldClass(!!fieldErrors.firstName)} pl-10`}
                                disabled={loading}
                                aria-invalid={!!fieldErrors.firstName}
                                aria-describedby={describedBy(
                                  fieldErrors.firstName ? 'firstName-error' : null,
                                  focused.firstName && !fieldErrors.firstName ? 'firstName-help' : null
                                )}
                                autoComplete="given-name"
                                placeholder="Enter first name"
                              />
                            </div>
                            {focused.firstName && !fieldErrors.firstName && helperText('firstName-help')}
                            {errorText('firstName-error', fieldErrors.firstName)}
                          </div>

                          {/* Middle name */}
                          <div className="space-y-1">
                            <label htmlFor="middleName" className={labelBase}>
                              Middle name <span className="text-gray-400 font-semibold">(optional)</span>
                            </label>
                            <div className="relative">
                              <input
                                id="middleName"
                                name="middleName"
                                value={formData.middleName}
                                onChange={handleChange}
                                onFocus={() => setFieldFocus('middleName', true)}
                                onBlur={() => setFieldFocus('middleName', false)}
                                className={`${fieldClass(!!fieldErrors.middleName)}`}
                                disabled={loading}
                                aria-invalid={!!fieldErrors.middleName}
                                aria-describedby={describedBy(
                                  fieldErrors.middleName ? 'middleName-error' : null,
                                  focused.middleName && !fieldErrors.middleName ? 'middleName-help' : null
                                )}
                                placeholder="Enter middle name"
                              />
                            </div>
                            {focused.middleName && !fieldErrors.middleName && helperText('middleName-help')}
                            {errorText('middleName-error', fieldErrors.middleName)}
                          </div>

                          {/* Last name */}
                          <div className="space-y-1">
                            <label htmlFor="lastName" className={labelBase}>
                              Last name
                            </label>
                            <div className="relative">
                              <input
                                id="lastName"
                                name="lastName"
                                value={formData.lastName}
                                onChange={handleChange}
                                onFocus={() => setFieldFocus('lastName', true)}
                                onBlur={() => setFieldFocus('lastName', false)}
                                className={`${fieldClass(!!fieldErrors.lastName)}`}
                                disabled={loading}
                                aria-invalid={!!fieldErrors.lastName}
                                aria-describedby={describedBy(
                                  fieldErrors.lastName ? 'lastName-error' : null,
                                  focused.lastName && !fieldErrors.lastName ? 'lastName-help' : null
                                )}
                                autoComplete="family-name"
                                placeholder="Enter last name"
                              />
                            </div>
                            {focused.lastName && !fieldErrors.lastName && helperText('lastName-help')}
                            {errorText('lastName-error', fieldErrors.lastName)}
                          </div>

                          {/* Suffix / Extension */}
                          <div className="space-y-1">
                            <label htmlFor="extensionName" className={labelBase}>
                              Suffix <span className="text-gray-400 font-semibold">(optional)</span>
                            </label>
                            <select
                              id="extensionName"
                              name="extensionName"
                              value={formData.extensionName}
                              onChange={handleChange}
                              onFocus={() => setFieldFocus('extensionName', true)}
                              onBlur={() => setFieldFocus('extensionName', false)}
                              className={`${fieldClass(!!fieldErrors.extensionName)}`}
                              disabled={loading}
                              aria-invalid={!!fieldErrors.extensionName}
                            >
                              {EXTENSION_OPTIONS.map((opt) => (
                                <option key={opt || 'none'} value={opt}>
                                  {opt || 'None'}
                                </option>
                              ))}
                            </select>
                            {errorText('extensionName-error', fieldErrors.extensionName)}
                          </div>

                          {/* Contact Number */}
                          <div className="space-y-1">
                            <label htmlFor="mobileNumber" className={labelBase}>
                              Contact Number
                            </label>
                            <div className="relative">
                              <div className={iconWrap}>
                                <IconPhone />
                              </div>
                              <input
                                id="mobileNumber"
                                name="mobileNumber"
                                value={formData.mobileNumber}
                                onChange={handleChange}
                                onFocus={() => setFieldFocus('mobileNumber', true)}
                                onBlur={() => setFieldFocus('mobileNumber', false)}
                                className={`${fieldClass(!!fieldErrors.mobileNumber)} pl-10`}
                                disabled={loading}
                                aria-invalid={!!fieldErrors.mobileNumber}
                                aria-describedby={describedBy(
                                  fieldErrors.mobileNumber ? 'mobileNumber-error' : null,
                                  focused.mobileNumber && !fieldErrors.mobileNumber ? 'mobileNumber-help' : null
                                )}
                                inputMode="numeric"
                                autoComplete="tel"
                                maxLength={11}
                                placeholder="e.g., 09XXXXXXXXX"
                              />
                            </div>
                            {focused.mobileNumber && !fieldErrors.mobileNumber && helperText('mobileNumber-help')}
                            {errorText('mobileNumber-error', fieldErrors.mobileNumber)}
                          </div>

                          {/* Employee / Company email */}
                          <div className="space-y-1">
                            <label htmlFor="businessEmail" className={labelBase}>
                              Employee / Company email
                            </label>
                            <div className="relative">
                              <div className={iconWrap}>
                                <IconMail />
                              </div>
                              <input
                                id="businessEmail"
                                type="email"
                                name="businessEmail"
                                value={formData.businessEmail}
                                onChange={handleChange}
                                onFocus={() => setFieldFocus('businessEmail', true)}
                                onBlur={() => setFieldFocus('businessEmail', false)}
                                className={`${fieldClass(!!fieldErrors.businessEmail)} pl-10`}
                                disabled={loading}
                                aria-invalid={!!fieldErrors.businessEmail}
                                aria-describedby={describedBy(
                                  fieldErrors.businessEmail ? 'businessEmail-error' : null,
                                  focused.businessEmail && !fieldErrors.businessEmail ? 'businessEmail-help' : null
                                )}
                                autoComplete="email"
                                inputMode="email"
                                autoCapitalize="none"
                                spellCheck={false}
                                maxLength={80}
                                placeholder="Enter company email address"
                              />
                            </div>
                            {focused.businessEmail && !fieldErrors.businessEmail &&
                              helperText('businessEmail-help', 'Use an active company email for verification.')}
                            {errorText('businessEmail-error', fieldErrors.businessEmail)}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* STEP 3: DOCUMENTS */}
                    {step === 3 && (
                      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5">
                        <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5">
                              <IconDoc />
                            </div>
                            <div className="w-full">
                              <p className="text-sm font-semibold text-gray-800">Quick Upload Rules:</p>
                              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-relaxed text-gray-600">
                                <li><strong>Accepted Formats:</strong> PDF or photos in JPG, JPEG, or PNG format.</li>
                                <li><strong>File Size:</strong> Keep each file under 5MB.</li>
                                <li><strong>Clarity:</strong> If uploading a photo, make sure the text is clear and readable—no blurry images.</li>
                                <li><strong>No Cropped Edges:</strong> Make sure names, dates, signatures, stamps, and other important details are visible.</li>
                                <li><strong>Check Before Uploading:</strong> Make sure the document is the latest, complete, and correct version.</li>
                                <li><strong>Before You Submit:</strong> Double-check every document before submitting to avoid verification delays.</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-sm font-semibold text-gray-700">Upload required documents</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FileRow k="secRegistration" title="SEC registration" />
                          <FileRow k="birRegistration" title="BIR registration" />
                          <FileRow k="dtiRegistration" title="DTI registration" />
                          <FileRow k="cityPermit" title="City / Municipality permit" />
                          <FileRow k="businessPermit" title="Business permit" />
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-center pt-2">
                      <div className="flex items-center gap-3">
                        {step > 1 && (
                          <button
                            type="button"
                            onClick={handleBackStep}
                            disabled={loading}
                            className="h-11 px-8 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-800 hover:bg-gray-50
                              focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2e66a6]/20
                              disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Previous
                          </button>
                        )}

                        <button
                          type="submit"
                          disabled={loading}
                          className="h-11 px-8 rounded-xl text-sm font-semibold text-white bg-[#2e66a6] hover:bg-[#255489]
                            focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2e66a6]/20
                            disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </form>

                  <div className="mt-7">
                    <div className="h-px bg-gray-100 mb-4" />
                    <p className="text-center text-sm text-gray-700">
                      Already have an account?{' '}
                      <Link to="/employer/login" className="font-semibold text-[#2e66a6] hover:text-[#255489] underline">
                        Sign In
                      </Link>
                    </p>
                  </div>
                </div>
              </div>
            </div>
            {/* end right */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployerRegisterPage;
