// src/pages/jobseeker/auth/RegisterPage.jsx
import React, { useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

// ✅ Use existing dropdown options (course dropdown)
import { MAJOR_COURSE_OPTIONS } from '../../../constants/jobseekerEducationOptions';

const RegisterPage = () => {
  const navigate = useNavigate();

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://phinmaau-job-portal-atlas.onrender.com/api';
  const API_URL = `${API_BASE_URL.replace(/\/$/, '')}/auth/register`;

  // ✅ 3 steps na lang (Step 4 removed; replaced with modal confirmations)
  const [currentStep, setCurrentStep] = useState(1);

  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [focused, setFocused] = useState({});

  // ✅ NEW: Modal states
  const [showConfirmModal, setShowConfirmModal] = useState(false); // "READY TO GO?"
  const [showSuccessModal, setShowSuccessModal] = useState(false); // "Thank you for signing up!"

  const [formData, setFormData] = useState({
    // Step 1: Basic Information
    firstName: '',
    middleName: '',
    lastName: '',
    extensionName: '',
    email: '',
    phoneNumber: '',

    // Step 2: Career Profile
    course: '',
    campus: '',
    yearGraduated: '',
    preferredWorkMode: '',

    howSoonCanYouStart: '',

    // Step 3: Credentials Upload
    cvFile: null,
    diplomaFile: null,
    validIdFile: null,
    torFile: null,

    // ✅ NEW: government credentials
    sssFile: null,
    philhealthFile: null,
    pagibigFile: null,
    tinFile: null,
  });

  const setFieldFocus = (name, isFocused) => setFocused((p) => ({ ...p, [name]: isFocused }));

  const clearError = (k) =>
    setFormErrors((p) => {
      if (!p?.[k]) return p;
      const n = { ...p };
      delete n[k];
      return n;
    });

  const describedBy = (...ids) => ids.filter(Boolean).join(' ') || undefined;

  const helperText = (id, text) => (
    <p id={id} className="text-[12px] text-gray-500 mt-1">
      {text}
    </p>
  );

  const errorText = (id, msg) =>
    msg ? (
      <p id={id} className="text-[13px] text-red-600 mt-1" role="alert" aria-live="assertive">
        {msg}
      </p>
    ) : null;

  // Name rules
  const stripDigits = (v) => String(v || '').replace(/[0-9]/g, '');
  const hasDigits = (v) => /\d/.test(String(v || ''));

  // Email rules
  const isValidEmailFormat = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim());

  // Year dropdown list (years only)
  const yearOptions = useMemo(() => {
    const nowYear = new Date().getFullYear();
    const startYear = nowYear; // include current year
    const endYear = 1950;
    const out = [];
    for (let y = startYear; y >= endYear; y--) out.push(String(y));
    return out;
  }, []);

  // ✅ NEW: Ext Name dropdown options
  const extNameOptions = ['None', 'Jr.', 'Sr.', 'II', 'III', 'IV', 'V'];

  // ---------- File picker refs (custom upload UI) ----------
  const fileRefs = {
    cvFile: useRef(null),
    diplomaFile: useRef(null),
    validIdFile: useRef(null),
    torFile: useRef(null),

    // ✅ NEW
    sssFile: useRef(null),
    philhealthFile: useRef(null),
    pagibigFile: useRef(null),
    tinFile: useRef(null),
  };

  const openFilePicker = (key) => {
    if (loading) return;
    fileRefs[key]?.current?.click?.();
  };

  const clearFile = (key) => {
    if (loading) return;
    setFormData((p) => ({ ...p, [key]: null }));
    clearError(key);
    if (fileRefs[key]?.current) fileRefs[key].current.value = '';
  };

  // -------- Handlers --------
  const handleChange = (e) => {
    const { name, value, type, files } = e.target;

    if (type === 'file') {
      const file = files?.[0] || null;
      setFormData((prev) => ({ ...prev, [name]: file }));
      clearError(name);
      setServerError('');
      return;
    }

    // Prevent typing numbers on name fields
    if (name === 'firstName' || name === 'middleName' || name === 'lastName') {
      const cleaned = stripDigits(value);
      setFormData((prev) => ({ ...prev, [name]: cleaned }));
      clearError(name);
      setServerError('');
      return;
    }

    // ✅ Phone number: numbers only, EXACT 11 max
    if (name === 'phoneNumber') {
      const digits = String(value || '').replace(/\D/g, '').slice(0, 11);
      setFormData((prev) => ({ ...prev, [name]: digits }));
      clearError(name);
      setServerError('');
      return;
    }

    // ✅ Ext Name dropdown: save empty string when "None"
    if (name === 'extensionName') {
      setFormData((prev) => ({ ...prev, extensionName: value === 'None' ? '' : value }));
      clearError(name);
      setServerError('');
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
    clearError(name);
    setServerError('');
  };

  const handleNameKeyDown = (e) => {
    if (e.key >= '0' && e.key <= '9') e.preventDefault();
  };

  // -------- Validations per step --------
  // ✅ Step 1 is now Basic Information
  const validateStep1 = () => {
    const errors = {};

    const fn = String(formData.firstName || '').trim();
    const mn = String(formData.middleName || '').trim();
    const ln = String(formData.lastName || '').trim();
    const ext = String(formData.extensionName || '').trim();

    if (!fn) errors.firstName = 'First name is required';
    else if (hasDigits(fn)) errors.firstName = 'First Name should not contain numbers';

    if (mn && hasDigits(mn)) errors.middleName = 'Middle Name should not contain numbers';

    if (!ln) errors.lastName = 'Last name is required';
    else if (hasDigits(ln)) errors.lastName = 'Last Name should not contain numbers';

    if (ext && hasDigits(ext)) errors.extensionName = 'Extension Name should not contain numbers';

    const email = String(formData.email || '').trim();
    if (!email) errors.email = 'Email is required';
    else if (!isValidEmailFormat(email)) errors.email = 'Please enter a valid email address';

    // ✅ Phone number: REQUIRED EXACT 11 digits
    const phone = String(formData.phoneNumber || '').trim();
    if (!phone) errors.phoneNumber = 'Phone number is required';
    else if (!/^\d{11}$/.test(phone)) errors.phoneNumber = 'Phone number must be exactly 11 digits';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ✅ Step 2 sub-step validations
  const validateCareerMain = () => {
    const errors = {};

    if (!String(formData.campus || '').trim()) errors.campus = 'Campus is required';
    if (!String(formData.course || '').trim()) errors.course = 'Course is required';
    if (!String(formData.yearGraduated || '').trim()) errors.yearGraduated = 'Year Graduated is required';
    if (!String(formData.preferredWorkMode || '').trim()) errors.preferredWorkMode = 'Preferred Work Mode is required';
    if (!String(formData.howSoonCanYouStart || '').trim()) errors.howSoonCanYouStart = 'This field is required';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };


  // ✅ Step 2 is now Career Profile
  const validateStep2 = () => validateCareerMain();

  // ✅ UPDATED: Step 3 validation
  // Required lang: CV, Diploma, Valid ID
  // Optional: TOR, SSS, PhilHealth, Pag-IBIG, TIN
  const validateStep3 = () => {
    const errors = {};

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    const maxSize = 5 * 1024 * 1024;

    const validateFileIfExists = (file, key) => {
      if (!file) return;
      if (!allowedTypes.includes(file.type)) errors[key] = 'Accepted formats: PDF, JPG, PNG';
      else if (file.size > maxSize) errors[key] = 'File size limit is 5MB';
    };

    // ✅ Required documents
    if (!formData.cvFile) errors.cvFile = 'CV/Resume is required';
    else validateFileIfExists(formData.cvFile, 'cvFile');

    if (!formData.diplomaFile) errors.diplomaFile = 'Diploma is required';
    else validateFileIfExists(formData.diplomaFile, 'diplomaFile');

    if (!formData.validIdFile) errors.validIdFile = 'Valid ID is required';
    else validateFileIfExists(formData.validIdFile, 'validIdFile');

    // ✅ Optional documents
    validateFileIfExists(formData.torFile, 'torFile');
    validateFileIfExists(formData.sssFile, 'sssFile');
    validateFileIfExists(formData.philhealthFile, 'philhealthFile');
    validateFileIfExists(formData.pagibigFile, 'pagibigFile');
    validateFileIfExists(formData.tinFile, 'tinFile');

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ✅ NEW: actual registration submit (called from modal)
  const submitRegistration = async () => {
    setServerError('');

    const okAll = validateStep1() && validateStep2() && validateStep3();
    if (!okAll) {
      setShowConfirmModal(false);
      if (!validateStep1()) {
        setCurrentStep(1);
        return;
      }

      if (!validateCareerMain()) {
        setCurrentStep(2);
        return;
      }

      setCurrentStep(3);
      return;
    }

    setLoading(true);

    try {
      const fd = new FormData();

      // Step 1: Career Profile
      fd.append('course', String(formData.course).trim());
      fd.append('campus', String(formData.campus).trim());
      fd.append('yearGraduated', String(formData.yearGraduated).trim());
      fd.append('preferredWorkMode', String(formData.preferredWorkMode).trim());

      fd.append('howSoonCanYouStart', String(formData.howSoonCanYouStart).trim());

      // Step 2: Basic Info
      fd.append('firstName', String(formData.firstName).trim());
      fd.append('middleName', String(formData.middleName || '').trim());
      fd.append('lastName', String(formData.lastName).trim());
      fd.append('extensionName', String(formData.extensionName || '').trim());
      fd.append('email', String(formData.email).trim().toLowerCase());
      fd.append('phoneNumber', String(formData.phoneNumber).trim());

      // ✅ Required files only
      fd.append('cv', formData.cvFile);
      fd.append('diploma', formData.diplomaFile);
      fd.append('validId', formData.validIdFile);

      // ✅ Optional files (append only if meron)
      if (formData.torFile) fd.append('tor', formData.torFile);
      if (formData.sssFile) fd.append('sss', formData.sssFile);
      if (formData.philhealthFile) fd.append('philhealth', formData.philhealthFile);
      if (formData.pagibigFile) fd.append('pagibig', formData.pagibigFile);
      if (formData.tinFile) fd.append('tin', formData.tinFile);

      await axios.post(API_URL, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // ✅ close confirm modal then show success modal
      setShowConfirmModal(false);
      setShowSuccessModal(true);
    } catch (err) {
      setServerError(err.response?.data?.message || 'Registration failed. Please try again.');
      setShowConfirmModal(false);
    } finally {
      setLoading(false);
    }
  };

  // ---------- UI helpers ----------
  const labelBase = 'block text-sm font-semibold text-gray-800';

  const inputBase =
    'block w-full h-11 px-3.5 text-[15px] text-gray-900 border border-gray-200 rounded-xl bg-white ' +
    'shadow-sm transition ' +
    'focus:outline-none focus:border-[#2e66a6] ' +
    'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed';

  const selectBase =
    'block w-full h-11 px-3.5 pr-10 text-[15px] text-gray-900 border border-gray-200 rounded-xl bg-white ' +
    'shadow-sm transition appearance-none ' +
    'focus:outline-none focus:border-[#2e66a6] ' +
    'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed';

  const fieldClass = (hasError) => `${inputBase} ${hasError ? 'border-red-400 focus:border-red-600' : ''}`;
  const selectClass = (hasError) => `${selectBase} ${hasError ? 'border-red-400 focus:border-red-600' : ''}`;

  const iconWrap = 'absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none';

  // ---------- Icons ----------
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

  const IconPhone = () => (
    <svg aria-hidden="true" className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M3 5a2 2 0 012-2h2l2 5-2 1c1.5 3 4 5.5 7 7l1-2 5 2v2a2 2 0 01-2 2h-1C9.82 20 4 14.18 4 7V6a1 1 0 01-1-1z"
      />
    </svg>
  );

  const IconCap = () => (
    <svg aria-hidden="true" className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5zm0 0v6m-7-3l7 3 7-3" />
    </svg>
  );

  const IconDoc = () => (
    <svg aria-hidden="true" className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h7l5 5v11a2 2 0 01-2 2z" />
    </svg>
  );

  // ---------- Stepper ----------
  const steps = [
    { id: 1, label: 'Basic Information' },
    { id: 2, label: 'Career Profile' },
    { id: 3, label: 'Credentials' },
  ];

  const STEP_FIELDS = {
    1: ['firstName', 'middleName', 'lastName', 'extensionName', 'email', 'phoneNumber'],
    2: ['course', 'campus', 'yearGraduated', 'preferredWorkMode', 'howSoonCanYouStart'],
    3: ['cvFile', 'diplomaFile', 'validIdFile', 'torFile', 'sssFile', 'philhealthFile', 'pagibigFile', 'tinFile'],
  };

  const stepHasError = (stepId) => {
    const keys = STEP_FIELDS[stepId] || [];
    return keys.some((k) => Boolean(formErrors?.[k]));
  };

 const Stepper = () => (
    <div className="mt-4">
      <nav aria-label="Progress">
        <ol className="flex items-center justify-center flex-wrap">
          {steps.map((s, idx) => {
            const isDone = s.id < currentStep;
            const isActive = s.id === currentStep;

            const textClass = isDone ? 'text-green-600' : isActive ? 'text-gray-600' : 'text-gray-300';
            const sepClass = 'text-gray-300';

            return (
              <li key={s.id} className="flex items-center">
                <span className={`inline-flex items-center text-lg font-semibold ${textClass}`}>
                  {isDone && (
                    <svg className="w-6 h-6 mr-2" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.707a1 1 0 00-1.414-1.414L9 10.172 7.707 8.879a1 1 0 10-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                  {s.label}
                </span>

                {idx !== steps.length - 1 && <span className={`mx-4 text-2xl font-semibold ${sepClass}`}>›</span>}
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );


  // ---------- Custom File Row ----------
  const FileRow = ({ k, title, subtitle }) => {
    const file = formData[k];

    return (
      <div className="space-y-1">
        <label className={labelBase} htmlFor={k}>
          {title}
        </label>

        {subtitle ? <p className="text-[11px] text-gray-500 -mt-0.5">{subtitle}</p> : null}

        <input
          id={k}
          ref={fileRefs[k]}
          name={k}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          onChange={handleChange}
          disabled={loading}
          className="sr-only"
        />

        <div
          className={`flex items-center justify-between gap-3 rounded-xl border bg-white px-3 py-2 shadow-sm ${
            formErrors?.[k] ? 'border-red-300' : 'border-gray-200'
          }`}
        >
          <div className="min-w-0">
            <p className="text-sm text-gray-700 truncate">{file ? file.name : 'No file selected'}</p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {file && (
              <button
                type="button"
                onClick={() => clearFile(k)}
                disabled={loading}
                className="h-9 px-3 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-100
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6]/20 disabled:opacity-50"
              >
                Remove
              </button>
            )}

            <button
              id={`${k}-btn`}
              type="button"
              onClick={() => openFilePicker(k)}
              disabled={loading}
              className="h-9 px-4 rounded-xl text-sm font-semibold text-white bg-[#2e66a6] hover:bg-[#245387]
                focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2e66a6]/20 disabled:opacity-50"
            >
              {file ? 'Replace' : 'Upload'}
            </button>
          </div>
        </div>

        {errorText(`${k}-error`, formErrors?.[k])}
      </div>
    );
  };

  // ---------- Server alert ----------
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

  // ---------- Step content ----------
  const renderStepContent = () => {
    switch (currentStep) {
      // ✅ Step 1: Basic Information
      case 1:
        return (
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className={labelBase} htmlFor="firstName">
                  First Name
                </label>
                <div className="relative">
                  <div className={iconWrap}>
                    <IconUser />
                  </div>
                  <input
                    id="firstName"
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    onKeyDown={handleNameKeyDown}
                    onFocus={() => setFieldFocus('firstName', true)}
                    onBlur={() => setFieldFocus('firstName', false)}
                    className={`${fieldClass(!!formErrors.firstName)} pl-10`}
                    disabled={loading}
                    aria-invalid={!!formErrors.firstName}
                    aria-describedby={describedBy(formErrors.firstName ? 'firstName-error' : null)}
                    maxLength={60}
                  />
                </div>
                {errorText('firstName-error', formErrors.firstName)}
              </div>

              <div className="space-y-1">
                <label className={labelBase} htmlFor="middleName">
                  Middle Name <span className="text-gray-400 font-semibold">(optional)</span>
                </label>
                <input
                  id="middleName"
                  type="text"
                  name="middleName"
                  value={formData.middleName}
                  onChange={handleChange}
                  onKeyDown={handleNameKeyDown}
                  onFocus={() => setFieldFocus('middleName', true)}
                  onBlur={() => setFieldFocus('middleName', false)}
                  className={inputBase}
                  disabled={loading}
                  maxLength={60}
                />
                {errorText('middleName-error', formErrors.middleName)}
              </div>

              <div className="space-y-1">
                <label className={labelBase} htmlFor="lastName">
                  Last Name
                </label>
                <div className="relative">
                  <div className={iconWrap}>
                    <IconUser />
                  </div>
                  <input
                    id="lastName"
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    onKeyDown={handleNameKeyDown}
                    onFocus={() => setFieldFocus('lastName', true)}
                    onBlur={() => setFieldFocus('lastName', false)}
                    className={`${fieldClass(!!formErrors.lastName)} pl-10`}
                    disabled={loading}
                    aria-invalid={!!formErrors.lastName}
                    aria-describedby={describedBy(formErrors.lastName ? 'lastName-error' : null)}
                    maxLength={60}
                  />
                </div>
                {errorText('lastName-error', formErrors.lastName)}
              </div>

              <div className="space-y-1">
                <label className={labelBase} htmlFor="extensionName">
                  Suffix <span className="text-gray-400 font-semibold">(optional)</span>
                </label>
                <select
                  id="extensionName"
                  name="extensionName"
                  value={formData.extensionName || 'None'}
                  onChange={handleChange}
                  className={selectClass(!!formErrors.extensionName)}
                  disabled={loading}
                  aria-invalid={!!formErrors.extensionName}
                  aria-describedby={describedBy(formErrors.extensionName ? 'extensionName-error' : null)}
                >
                  {extNameOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                {errorText('extensionName-error', formErrors.extensionName)}
              </div>

              <div className="space-y-1">
                <label className={labelBase} htmlFor="email">
                  Email Address
                </label>
                <div className="relative">
                  <div className={iconWrap}>
                    <IconMail />
                  </div>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    onFocus={() => setFieldFocus('email', true)}
                    onBlur={() => setFieldFocus('email', false)}
                    className={`${fieldClass(!!formErrors.email)} pl-10`}
                    disabled={loading}
                    aria-invalid={!!formErrors.email}
                    aria-describedby={describedBy(formErrors.email ? 'email-error' : null)}
                    maxLength={80}
                  />
                </div>
                {errorText('email-error', formErrors.email)}
              </div>

              <div className="space-y-1">
                <label className={labelBase} htmlFor="phoneNumber">
                  Contact Number
                </label>
                <div className="relative">
                  <div className={iconWrap}>
                    <IconPhone />
                  </div>
                  <input
                    id="phoneNumber"
                    type="tel"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    onFocus={() => setFieldFocus('phoneNumber', true)}
                    onBlur={() => setFieldFocus('phoneNumber', false)}
                    className={`${fieldClass(!!formErrors.phoneNumber)} pl-10`}
                    disabled={loading}
                    aria-invalid={!!formErrors.phoneNumber}
                    aria-describedby={describedBy(formErrors.phoneNumber ? 'phoneNumber-error' : null)}
                    inputMode="numeric"
                    maxLength={11}
                    placeholder="e.g., 09xxxxxxxxx"
                  />
                </div>
                {errorText('phoneNumber-error', formErrors.phoneNumber)}
              </div>
            </div>
          </div>
        );

      // ✅ Step 2: Career Profile
      case 2:
        return (
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5">
            <div className="space-y-4">
                {/* Campus */}
                <div className="space-y-1 md:col-span-2">
                  <label className={labelBase} htmlFor="campus">
                    What is your campus?
                  </label>
                  <div className="relative">
                    <div className={iconWrap}>
                      <IconCap />
                    </div>
                    <select
                      id="campus"
                      name="campus"
                      value={formData.campus}
                      onChange={handleChange}
                      className={`${selectClass(!!formErrors.campus)} pl-10`}
                      disabled={loading}
                      aria-invalid={!!formErrors.campus}
                      aria-describedby={formErrors.campus ? 'campus-error' : undefined}
                    >
                      <option value="" disabled>
                        Choose your campus
                      </option>
                      <option value="Au Main">Au Main</option>
                      <option value="Au South">Au South</option>
                      <option value="Au San jose">Au San jose</option>
                    </select>
                  </div>
                  {errorText('campus-error', formErrors.campus)}
                </div>

                {/* Course */}
                <div className="space-y-1 md:col-span-2">
                  <label className={labelBase} htmlFor="course">
                    What is your course?
                  </label>
                  <div className="relative">
                    <div className={iconWrap}>
                      <IconCap />
                    </div>
                    <select
                      id="course"
                      name="course"
                      value={formData.course}
                      onChange={handleChange}
                      className={`${selectClass(!!formErrors.course)} pl-10`}
                      disabled={loading}
                      aria-invalid={!!formErrors.course}
                      aria-describedby={formErrors.course ? 'course-error' : undefined}
                    >
                      <option value="" disabled>
                        Choose your course
                      </option>
                      {MAJOR_COURSE_OPTIONS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                  {errorText('course-error', formErrors.course)}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Year Graduated */}
                  <div className="space-y-1">
                    <label className={labelBase} htmlFor="yearGraduated">
                      Year Graduated
                    </label>
                    <div className="relative">
                      <div className={iconWrap}>
                        <IconCap />
                      </div>
                      <select
                        id="yearGraduated"
                        name="yearGraduated"
                        value={formData.yearGraduated}
                        onChange={handleChange}
                        className={`${selectClass(!!formErrors.yearGraduated)} pl-10`}
                        disabled={loading}
                        aria-invalid={!!formErrors.yearGraduated}
                        aria-describedby={formErrors.yearGraduated ? 'yearGraduated-error' : undefined}
                      >
                        <option value="" disabled>
                          Select Year
                        </option>
                        {yearOptions.map((y) => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        ))}
                      </select>
                    </div>
                    {errorText('yearGraduated-error', formErrors.yearGraduated)}
                  </div>

                  {/* Preferred Work Mode */}
                  <div className="space-y-1">
                    <label className={labelBase} htmlFor="preferredWorkMode">
                      Preferred Work Mode
                    </label>
                    <div className="relative">
                      <div className={iconWrap}>
                        <IconCap />
                      </div>
                      <select
                        id="preferredWorkMode"
                        name="preferredWorkMode"
                        value={formData.preferredWorkMode}
                        onChange={handleChange}
                        className={`${selectClass(!!formErrors.preferredWorkMode)} pl-10`}
                        disabled={loading}
                        aria-invalid={!!formErrors.preferredWorkMode}
                        aria-describedby={formErrors.preferredWorkMode ? 'preferredWorkMode-error' : undefined}
                      >
                        <option value="" disabled>
                          Select option
                        </option>
                        <option value="On-site">On-site</option>
                        <option value="Blended">Blended</option>
                        <option value="Remote">Remote</option>
                        <option value="Work from home">Work from home</option>
                      </select>
                    </div>
                    {errorText('preferredWorkMode-error', formErrors.preferredWorkMode)}
                  </div>
                </div>

                {/* How soon */}
                <div className="space-y-1 md:col-span-2">
                  <label className={labelBase} htmlFor="howSoonCanYouStart">
                    How soon can you start?
                  </label>
                  <div className="relative">
                    <div className={iconWrap}>
                      <IconCap />
                    </div>
                    <select
                      id="howSoonCanYouStart"
                      name="howSoonCanYouStart"
                      value={formData.howSoonCanYouStart}
                      onChange={handleChange}
                      className={`${selectClass(!!formErrors.howSoonCanYouStart)} pl-10`}
                      disabled={loading}
                      aria-invalid={!!formErrors.howSoonCanYouStart}
                      aria-describedby={formErrors.howSoonCanYouStart ? 'howSoonCanYouStart-error' : undefined}
                    >
                      <option value="" disabled>
                        Select option
                      </option>
                      <option value="Ready to start">Ready to start</option>
                      <option value="Within a few days">Within a few days</option>
                      <option value="Within 1 week">Within 1 week</option>
                      <option value="Within 2 week">Within 2 week</option>
                      <option value="Within a month">Within a month</option>
                    </select>
                  </div>
                  {errorText('howSoonCanYouStart-error', formErrors.howSoonCanYouStart)}
                </div>
              </div>

          </div>
        );

      // ✅ UPDATED: Step 3 with correct required/optional docs
      case 3:
        return (
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5 space-y-4">
            {/* Upload rules (Instruction Text Only) */}
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <IconDoc />
                </div>

                <div className="w-full">
                  <p className="text-sm font-semibold text-gray-900">Quick Upload Rules:</p>

                  <ul className="mt-2 text-xs text-gray-700 list-disc pl-5 space-y-1">
                    <li>Accepted Formats: PDF (preferred for resumes) or Photos (JPG, PNG).</li>
                    <li>File Size: Please keep files under 5MB.</li>
                    <li>Clarity: If uploading a photo, ensure the text is clear and readable—no blurry shots!</li>
                  </ul>

                 

                  <p className="mt-4 text-sm font-semibold text-gray-900">Pro-Tips for Fresh Grads:</p>

                  <ul className="mt-2 text-xs text-gray-700 list-disc pl-5 space-y-1">
                    <li>
                      For your Resume: We highly recommend using a PDF format. It keeps your layout looking perfect on every recruiter's
                      screen!
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FileRow k="cvFile" title="Upload CV or Resume (Required)" />
              <FileRow k="diplomaFile" title="Diploma (Required)" />
              <FileRow k="validIdFile" title="Valid ID (Required)" />
              <FileRow k="torFile" title="Transcript of Records (TOR) (Optional)" />

              <FileRow k="sssFile" title="SSS (Optional)" />
              <FileRow k="philhealthFile" title="PhilHealth (Optional)" />
              <FileRow k="pagibigFile" title="Pag-IBIG (Optional)" />
              <FileRow k="tinFile" title="TIN (Optional)" />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // ✅ FORM submit handler:
  // - Step 1: validate -> step2 (substep resets to 0)
  // - Step 2: main->skills subsection, then skills subsection->step3
  // - Step 3: show modal
  const onFormSubmit = (e) => {
    e.preventDefault();

    if (loading) return;

    if (currentStep === 1) {
      if (validateStep1()) {
        setCurrentStep(2);
      }
      return;
    }

    if (currentStep === 2) {
      if (validateCareerMain()) {
        setCurrentStep(3);
      }
      return;
    }

    if (validateStep3()) {
      setShowConfirmModal(true);
    }
  };

  // ✅ Simple modal wrapper
  const ModalShell = ({ children, onClose }) => (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !loading) onClose?.();
      }}
    >
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative w-full max-w-2xl">{children}</div>
    </div>
  );

  const ConfirmModal = () => {
    if (!showConfirmModal) return null;

    return (
      <ModalShell onClose={() => setShowConfirmModal(false)}>
        {showConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="bg-white rounded-2xl shadow-2xl ring-1 ring-black/5 w-full max-w-[620px] max-h-[90vh] overflow-y-auto">
              <div className="p-8 sm:p-10">
                <div className="flex justify-center">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center">
                    <img src="/images/check.png" alt="Check" className="w-20 h-20 object-contain" draggable="false" />
                  </div>
                </div>

                <h3 className="mt-5 text-center text-3xl font-extrabold text-gray-900">READY TO GO?</h3>

                <div className="mt-5 rounded-xl bg-[#eaf1fb] px-6 py-4 text-center">
                  <p className="text-sm text-gray-800">
                    Before submitting your registration, please carefully review all the information you have provided to ensure it is accurate, complete, and valid. By clicking Submit Registration, you confirm that all details entered are true and correct. You also authorize AGAPAY to use your information for career matching purposes and to share your professional profile, credentials, and relevant details with verified employers to help connect you with suitable job opportunities.
                  </p>
                </div>

                <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-5">
                  <button
                    type="button"
                    onClick={() => setShowConfirmModal(false)}
                    disabled={loading}
                    className="h-12 w-full sm:w-56 rounded-xl border border-gray-300 bg-white text-sm font-semibold text-gray-900
                      hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2e66a6]/20
                      disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Go Back
                  </button>

                  <button
                    type="button"
                    onClick={submitRegistration}
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
          </div>
        )}
      </ModalShell>
    );
  };

  const SuccessModal = () => {
    if (!showSuccessModal) return null;

    return (
      <ModalShell
        onClose={() => {
          if (!loading) setShowSuccessModal(false);
        }}
      >
        {showSuccessModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="bg-white rounded-2xl shadow-2xl ring-1 ring-black/5 w-full max-w-[620px] max-h-[90vh] overflow-y-auto">
              <div className="p-8 sm:p-10">
                <div className="flex justify-center">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center">
                    <img src="/images/like.png" alt="Success" className="w-20 h-20 object-contain" draggable="false" />
                  </div>
                </div>

                <h3 className="mt-5 text-center text-3xl font-extrabold text-gray-900">Thank you for signing up!</h3>

                <div className="mt-5 rounded-xl bg-[#eaf1fb] px-6 py-5 text-center">
                  <p className="text-sm font-semibold text-gray-900">Your account is under review</p>

                  <p className="mt-3 text-sm text-gray-800">
                    Our team is reviewing the information and credentials you submitted to ensure everything is complete and accurate. This verification process usually takes 24 to 48 hours.
                    Once your account is approved, you’ll receive a confirmation email with your login details.
                    Keep an eye on your inbox if we require any additional information, our team will contact you directly.
                  </p>

                  <p className="mt-4 text-sm text-gray-800">
                    After verification, you’ll gain full access as an employer, allowing you to post job opportunities, connect with top PHINMA AU graduates, and manage applications efficiently.

                    If you don’t receive a confirmation email within 48 hours or have any questions during this process, please contact us at
                    agapay@gmail.com
                  </p>
                </div>

                <div className="mt-8 flex justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      setShowSuccessModal(false);
                      navigate('/login', {
                        state: {
                          message: 'Registration submitted successfully! Please wait for admin approval.',
                          email: String(formData.email).trim().toLowerCase(),
                        },
                      });
                    }}
                    className="h-12 w-full sm:w-56 rounded-xl border border-gray-300 bg-white text-sm font-semibold text-gray-900
                      hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2e66a6]/20"
                  >
                    Got it!
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </ModalShell>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-[#2e66a6]/10 flex items-center justify-center p-4">
      {/* ✅ Modals */}
      <ConfirmModal />
      <SuccessModal />

      <div className="w-full max-w-7xl">
        <div className="bg-white rounded-2xl shadow-xl ring-1 ring-black/5 overflow-hidden min-h-[90vh]">
          <div className="flex flex-col lg:flex-row">
            {/* LEFT BRAND PANEL */}
            <div className="relative lg:w-5/12 p-8 lg:p-12 bg-white flex items-center justify-center">
              <button
                type="button"
                onClick={() => {
                  if (window.history.length > 1) navigate(-1);
                  else navigate('/');
                }}
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

              <div className="h-full flex flex-col justify-center">
                <div className="mt-2 w-full max-w-[420px] mx-auto relative">
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

                  <div
                    className="
      relative z-10
      p-6
      rounded-2xl
      overflow-hidden
      text-white
      bg-gradient-to-br
      from-[#072258]
      via-[#2d63a0]
      to-[#52b2db]
      shadow-[0_8px_24px_rgba(0,0,0,0.18)]
    "
                  >
                    <h3 className="text-xl font-extrabold text-white text-center mb-6 leading-snug">How it Works</h3>

                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 flex items-center justify-center rounded-full border-2 border-white text-white font-bold text-sm shrink-0">
                          1
                        </div>
                        <div className="flex-1 rounded-xl bg-white/10 backdrop-blur-sm px-4 py-3">
                          <p className="text-base font-bold leading-snug">Provide Your Details</p>
                          <p className="text-sm text-white/80 mt-1.5 leading-relaxed">
                            Enter accurate and complete information based on your selected role so employers can properly identify and
                            contact you.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 flex items-center justify-center rounded-full border-2 border-white text-white font-bold text-sm shrink-0">
                          2
                        </div>
                        <div className="flex-1 rounded-xl bg-white/10 backdrop-blur-sm px-4 py-3">
                          <p className="text-base font-bold leading-snug">Build Your Profile</p>
                          <p className="text-sm text-white/80 mt-1.5 leading-relaxed">Share your academic background and career goals.</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 flex items-center justify-center rounded-full border-2 border-white text-white font-bold text-sm shrink-0">
                          3
                        </div>
                        <div className="flex-1 rounded-xl bg-white/10 backdrop-blur-sm px-4 py-3">
                          <p className="text-base font-bold leading-snug">Submit Documents</p>
                          <p className="text-sm text-white/80 mt-1.5 leading-relaxed">
                            Submit the required documents to validate your qualifications and strengthen your profile.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 flex items-center justify-center rounded-full border-2 border-white text-white font-bold text-sm shrink-0">
                          4
                        </div>
                        <div className="flex-1 rounded-xl bg-white/10 backdrop-blur-sm px-4 py-3">
                          <p className="text-base font-bold leading-snug">Account Review</p>
                          <p className="text-sm text-white/80 mt-1.5 leading-relaxed">
                            The AGAPAY team reviews your submission within 24–48 hours. Once approved, your login details will be sent via
                            email.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* CENTER DIVIDER */}
            <div className="hidden lg:flex items-center justify-center" aria-hidden="true">
              <div className="w-px h-[85%] bg-gradient-to-b from-transparent via-gray-200 to-transparent" />
            </div>

            {/* RIGHT FORM PANEL */}
            <div className="lg:w-7/12 p-8 lg:p-10 bg-white flex flex-col justify-center">
              <div className="mx-auto w-full max-w-2xl">
                <div className="text-center">
                  <h2 className="text-3xl font-bold text-gray-600 tracking-tight">Let's set up your profile!</h2>
                </div>

                <Stepper />

                <div className="mt-6">
                  {serverAlert}

                  <form onSubmit={onFormSubmit} className="space-y-5" noValidate aria-busy={loading}>
                    {renderStepContent()}

                    {/* ACTIONS (Step 1-3 buttons only) */}
                    <div className="flex items-center justify-center pt-2">
                      <div className="flex items-center gap-3">
                        {currentStep > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              if (loading) return;
                              setCurrentStep((s) => Math.max(s - 1, 1));
                            }}
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
                          className="h-11 px-8 rounded-xl text-sm font-semibold text-white bg-[#2e66a6] hover:bg-[#245387]
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
                      <Link to="/login" className="font-semibold text-[#2e66a6] hover:text-[#245387] underline">
                        Sign in
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

export default RegisterPage;