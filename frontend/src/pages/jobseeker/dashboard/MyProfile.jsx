import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import JobSeekerLayout from '../../../layouts/JobSeekerLayout';
import ProfileMoreDropdown from '../../../components/jobseeker/ProfileMoreDropdown';
import {
  MAJOR_COURSE_OPTIONS,
  CAMPUS_OPTIONS,
} from '../../../constants/jobseekerEducationOptions';
import { TECHNICAL_SKILLS } from '../../../constants/technicalSkills';
import { SOFT_SKILLS } from '../../../constants/softSkills';
import {
  PH_REGIONS,
  PH_PROVINCES_BY_REGION,
  PH_CITIES_BY_PROVINCE,
} from '../../../constants/phLocations';
import {
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationTriangle,
  FaInfoCircle,
  FaEnvelope,
  FaPhoneAlt,
  FaGraduationCap,
  FaMapMarkerAlt,
  FaDownload,
  FaEye,
  FaPen,
  FaFileAlt,
  FaShieldAlt,
  FaUniversity,
  FaUser,
  FaBriefcase,
  FaTrash,
  FaPlus,
  FaArrowLeft,
  FaCamera,
} from 'react-icons/fa';

const COLORS = {
  primary: '#2e66a6',
  border: '#d8e2ee',
  textPrimary: '#000000',
  textSecondary: '#4b5563',
  muted: '#8a95a3',
  bg: '#ffffff',
};

const REQUIRED_DOC_TYPES = ['cv', 'tor', 'diploma', 'validId', 'sss', 'philhealth', 'pagibig', 'tin'];

const EDUCATION_LEVEL_OPTIONS = [
  'College',
  'Senior High School',
  'High School',
  'Junior High School',
  'Elementary',
  'Vocational',
  'Master’s Degree',
  'Doctorate',
];

const EXTENSION_NAME_OPTIONS = ['Jr', 'Sr', 'II', 'III', 'IV', 'V'];

const normalizeExtensionName = (value) => {
  const clean = String(value || '').trim();
  return clean.toLowerCase() === 'none' ? '' : clean;
};

const MORE_PROFILE_SECTIONS = {
  certifications: {
    title: 'Certifications',
    emptyTitle: 'No certifications added yet',
    fields: [
      { key: 'title', label: 'Certification Name', placeholder: 'e.g. AWS Cloud Practitioner Certification' },
      { key: 'issuer', label: 'Issued By / Provider', placeholder: 'e.g. Amazon Web Services' },
      { key: 'date', label: 'Date / Validity', placeholder: 'e.g. March 2023 — March 2026' },
    ],
  },
  projects: {
    title: 'Projects',
    emptyTitle: 'No projects added yet',
    fields: [
      { key: 'title', label: 'Project Title', placeholder: 'e.g. HealthTrack — Patient Management System' },
      { key: 'role', label: 'Role', placeholder: 'e.g. Full Stack Developer' },
      { key: 'date', label: 'Date / Duration', placeholder: 'e.g. June 2023 — November 2023' },
      { key: 'description', label: 'Description', type: 'textarea', placeholder: 'Add project details, tools used, and achievements.' },
    ],
  },
  seminars: {
    title: 'Seminars and Trainings',
    emptyTitle: 'No seminars and trainings added yet',
    fields: [
      { key: 'title', label: 'Seminar / Training Title', placeholder: 'e.g. AWS Cloud Computing Workshop' },
      { key: 'organization', label: 'Organizer / Provider', placeholder: 'e.g. Amazon Web Services Philippines' },
      { key: 'date', label: 'Date', placeholder: 'e.g. March 2023' },
    ],
  },
  awards: {
    title: 'Awards and Achievements',
    emptyTitle: 'No awards and achievements added yet',
    fields: [
      { key: 'title', label: 'Award / Achievement Title', placeholder: 'e.g. Best Thesis Award' },
      { key: 'issuer', label: 'Issued By', placeholder: 'e.g. DLSU Computer Science Department' },
      { key: 'date', label: 'Date', placeholder: 'e.g. May 2024' },
      { key: 'description', label: 'Description', type: 'textarea', placeholder: 'Add details about the award or achievement.' },
    ],
  },
  affiliations: {
    title: 'Affiliations',
    emptyTitle: 'No affiliations added yet',
    fields: [
      { key: 'organization', label: 'Organization / Club', placeholder: 'e.g. Google Developer Student Club' },
      { key: 'role', label: 'Role', placeholder: 'e.g. Technical Lead' },
      { key: 'date', label: 'Date / Duration', placeholder: 'e.g. August 2022 — May 2024' },
      { key: 'description', label: 'Description', type: 'textarea', placeholder: 'Add your responsibilities or participation details.' },
    ],
  },
  cocurricular: {
    title: 'Co-curricular Activities',
    emptyTitle: 'No co-curricular activities added yet',
    fields: [
      { key: 'organization', label: 'Organization / Activity', placeholder: 'e.g. DLSU Volunteer Corps' },
      { key: 'role', label: 'Role', placeholder: 'e.g. Member' },
      { key: 'date', label: 'Date / Duration', placeholder: 'e.g. June 2021 — May 2024' },
      { key: 'description', label: 'Description', type: 'textarea', placeholder: 'Add activity details or contributions.' },
    ],
  },
  references: {
    title: 'References',
    emptyTitle: 'No references added yet',
    fields: [
      { key: 'name', label: 'Reference Name', placeholder: 'e.g. Dr. Maria Santos' },
      { key: 'position', label: 'Position / Title', placeholder: 'e.g. Associate Professor' },
      { key: 'company', label: 'Company / School', placeholder: 'e.g. De La Salle University' },
      { key: 'phone', label: 'Phone Number', placeholder: 'e.g. +63 917 555 1234' },
      { key: 'email', label: 'Email', placeholder: 'e.g. maria.santos@dlsu.edu.ph' },
    ],
  },
};

const MORE_PROFILE_TAB_KEYS = Object.keys(MORE_PROFILE_SECTIONS);


const MORE_SECTION_DESCRIPTIONS = {
  certifications: 'There are jobs that require certain certifications or licensure. Being officially qualified is a plus.',
  projects: 'Showcase your personal or professional projects that demonstrate your skills and initiative.',
  seminars: 'Tell employers that you have certain skills and insights from trainings or other professionals.',
  awards: 'Highlight recognitions, awards, and achievements that set you apart from other candidates.',
  affiliations: 'Share organizations, memberships, or affiliations that help employers understand your background.',
  cocurricular: 'Add extracurricular and co-curricular activities that show leadership and personality.',
  references: 'Add professional references who can vouch for your skills, work ethic, and character.',
};


const buildAddressString = (source = {}) => {
  const parts = [
    source.streetAddress,
    source.cityMunicipality,
    source.province,
    source.region,
  ]
    .map((item) => String(item || '').trim())
    .filter(Boolean);

  return parts.join(', ');
};

const parseAddressString = (rawAddress = '') => {
  const clean = String(rawAddress || '').trim();
  if (!clean) {
    return {
      region: '',
      province: '',
      cityMunicipality: '',
      streetAddress: '',
    };
  }

  const parts = clean
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  if (parts.length >= 4) {
    return {
      streetAddress: parts.slice(0, parts.length - 3).join(', '),
      cityMunicipality: parts[parts.length - 3] || '',
      province: parts[parts.length - 2] || '',
      region: parts[parts.length - 1] || '',
    };
  }

  if (parts.length === 3) {
    return {
      streetAddress: parts[0] || '',
      cityMunicipality: parts[1] || '',
      province: parts[2] || '',
      region: '',
    };
  }

  if (parts.length === 2) {
    return {
      streetAddress: parts[0] || '',
      cityMunicipality: parts[1] || '',
      province: '',
      region: '',
    };
  }

  return {
    streetAddress: clean,
    cityMunicipality: '',
    province: '',
    region: '',
  };
};

const Spinner = ({ size = 'medium' }) => {
  const sizes = {
    small: 'w-4 h-4 border-2',
    medium: 'w-6 h-6 border-[3px]',
    large: 'w-8 h-8 border-4',
  };

  return (
    <div
      className={`animate-spin rounded-full ${sizes[size]}`}
      style={{
        borderTopColor: 'transparent',
        borderRightColor: COLORS.primary,
        borderBottomColor: COLORS.primary,
        borderLeftColor: COLORS.primary,
      }}
    />
  );
};

const Alert = ({ type = 'info', title, message, onClose }) => {
  const styles = {
    info: { bg: '#eff6ff', text: '#1d4ed8', icon: <FaInfoCircle className="text-blue-600" /> },
    success: { bg: '#ecfdf5', text: '#047857', icon: <FaCheckCircle className="text-emerald-600" /> },
    warning: { bg: '#fffbeb', text: '#b45309', icon: <FaExclamationTriangle className="text-amber-600" /> },
    error: { bg: '#fef2f2', text: '#b91c1c', icon: <FaTimesCircle className="text-red-600" /> },
  };

  const style = styles[type] || styles.info;

  return (
    <div className="rounded-xl px-4 py-3 flex items-start gap-3 mb-4" style={{ backgroundColor: style.bg, color: style.text }}>
      <div className="mt-0.5">{style.icon}</div>
      <div className="flex-1">
        {title ? <div className="font-semibold">{title}</div> : null}
        <div className="text-sm">{message}</div>
      </div>
      {onClose ? (
        <button
          onClick={onClose}
          className="text-lg leading-none opacity-70 hover:opacity-100"
          aria-label="Close alert"
        >
          ×
        </button>
      ) : null}
    </div>
  );
};

const SuccessPopup = ({ open, title, message, onClose }) => {
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => onClose?.(), 2200);
    return () => clearTimeout(timer);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/25 flex items-center justify-center px-4" role="dialog" aria-modal="true" aria-live="polite">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 text-center">
        <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-4" style={{ backgroundColor: '#e8f1ff' }}>
          <FaCheckCircle className="text-4xl" style={{ color: COLORS.primary }} />
        </div>
        <div className="text-xl font-bold text-gray-900">{title || 'Success'}</div>
        <div className="text-sm text-gray-500 mt-2">{message}</div>
      </div>
    </div>
  );
};

const ConfirmModal = ({
  open,
  title = 'Confirm',
  message = 'Are you sure?',
  confirmText = 'Yes',
  cancelText = 'Cancel',
  tone = 'primary',
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;

  const confirmBg = tone === 'danger' ? '#ef4444' : COLORS.primary;

  return (
    <div className="fixed inset-0 z-[10000] bg-black/30 flex items-center justify-center px-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 p-6">
        <div className="text-lg font-bold text-gray-900">{title}</div>
        <div className="text-sm text-gray-600 mt-2">{message}</div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 rounded-xl text-white font-semibold"
            style={{ backgroundColor: confirmBg }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};


const ResumePasswordModal = ({
  open,
  mode = 'download',
  password,
  error,
  verifying,
  onChange,
  onClose,
  onSubmit,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[10003] bg-black/35 flex items-center justify-center px-4 py-6" role="dialog" aria-modal="true">
      <div className="w-full max-w-md bg-white rounded-[24px] shadow-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between gap-3">
          <div>
            <div className="text-[20px] font-bold text-gray-900">Enter Password</div>
            <div className="text-sm text-gray-500 mt-1">
              {mode === 'preview'
                ? 'Please enter your account password before previewing your CV.'
                : 'Please enter your account password before downloading your CV.'}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={verifying}
            className="w-10 h-10 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-70"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        <form onSubmit={onSubmit} className="px-6 py-6 space-y-4">
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Enter your password"
          />

          {error ? <Alert type="error" message={error} /> : null}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={verifying}
              className="px-4 h-11 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 disabled:opacity-70"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={verifying}
              className="px-5 h-11 rounded-xl text-white font-semibold disabled:opacity-70 inline-flex items-center gap-2"
              style={{ backgroundColor: COLORS.primary }}
            >
              {verifying ? <Spinner size="small" /> : mode === 'preview' ? <FaEye className="text-xs" /> : <FaDownload className="text-xs" />}
              {verifying ? 'Verifying...' : mode === 'preview' ? 'Continue Preview' : 'Continue Download'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Input = ({ label, value, onChange, placeholder = '', disabled = false, type = 'text' }) => {
  return (
    <div>
      <label className="block text-[11px] tracking-[0.16em] uppercase font-bold text-gray-400 mb-2">{label}</label>
      <input
        type={type}
        value={value || ''}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white text-gray-900 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 disabled:bg-gray-50 disabled:text-gray-500"
      />
    </div>
  );
};

const TextArea = ({ label, value, onChange, placeholder = '', rows = 4 }) => {
  return (
    <div>
      <label className="block text-[11px] tracking-[0.16em] uppercase font-bold text-gray-400 mb-2">{label}</label>
      <textarea
        rows={rows}
        value={value || ''}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 resize-none"
      />
    </div>
  );
};

const Select = ({ label, value, onChange, options = [], placeholder = 'Select option', disabled = false }) => {
  return (
    <div>
      <label className="block text-[11px] tracking-[0.16em] uppercase font-bold text-gray-400 mb-2">{label}</label>
      <select
        value={value || ''}
        onChange={onChange}
        disabled={disabled}
        className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white text-gray-900 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 disabled:bg-gray-50 disabled:text-gray-500"
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
};

const DisplayField = ({ label, value }) => {
  const displayValue = value && String(value).trim() ? value : 'Not provided';

  return (
    <div className="py-1">
      <div className="text-[10px] sm:text-[11px] tracking-[0.16em] uppercase font-bold text-gray-400 mb-2">{label}</div>
      <div className={`text-[15px] sm:text-[16px] font-semibold leading-6 ${displayValue === 'Not provided' ? 'text-gray-400' : 'text-gray-800'}`}>
        {displayValue}
      </div>
    </div>
  );
};

const EditIconButton = ({ onClick, label = 'Edit section' }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="h-10 px-3 rounded-xl border border-gray-200 flex items-center justify-center gap-2 text-gray-600 hover:bg-gray-50"
    >
      <FaPen className="text-sm" />
      <span className="hidden sm:inline text-sm font-semibold">Edit</span>
    </button>
  );
};

const SectionHeader = ({ title, onEdit, editLabel }) => {
  return (
    <div className="px-6 sm:px-10 py-5 flex items-center justify-between gap-3">
      <h2 className="text-[18px] sm:text-[20px] font-bold text-gray-900">{title}</h2>
      <EditIconButton onClick={onEdit} label={editLabel || `Edit ${title}`} />
    </div>
  );
};

const TinyChip = ({ children }) => (
  <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#efefef] text-[#4b5563] text-xs font-semibold border border-[#e5e7eb]">
    {children}
  </span>
);

const NavTab = ({ active, icon, label, onClick, panelId }) => {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      aria-controls={panelId}
      onClick={onClick}
      className={`relative h-11 shrink-0 inline-flex items-center justify-center gap-1.5 px-2 sm:px-3 text-xs sm:text-sm font-medium whitespace-nowrap transition-colors ${
        active ? 'text-[#1658d3]' : 'text-gray-500 hover:text-gray-700'
      }`}
    >
      <span className="text-[12px] sm:text-[13px] shrink-0">{icon}</span>
      <span>{label}</span>
      <span className={`absolute left-0 right-0 -bottom-[11px] h-[2px] ${active ? 'bg-[#1658d3]' : 'bg-transparent'}`} />
    </button>
  );
};

const CredentialItem = ({
  docType,
  title,
  uploaded,
  icon,
  onUpload,
  uploading,
  fileName,
  fileUrl,
  popoverOpen,
  onOpen,
  onClose,
}) => {
  const inputRef = useRef(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (!popoverOpen) return undefined;

    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        onClose?.();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [popoverOpen, onClose]);

  const handleUploadClick = () => {
    inputRef.current?.click();
  };

  const handleViewFile = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!fileUrl) return;
    window.open(fileUrl, '_blank', 'noopener,noreferrer');
  };

  const handleDownloadFile = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!fileUrl) return;

    const link = document.createElement('a');
    link.href = fileUrl;
    link.target = '_blank';
    link.rel = 'noreferrer';
    link.download = fileName || title;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div
      ref={wrapperRef}
      onMouseEnter={onOpen}
      className={`relative rounded-[18px] border px-4 py-4 flex items-center justify-between gap-4 transition-colors ${
        uploaded
          ? 'border-[#d8e2ee] bg-[#f7faff]'
          : 'border-[#e6edf5] bg-white hover:bg-[#f7faff]'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept=".pdf,.png,.jpg,.jpeg"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
          e.target.value = '';
        }}
      />

      <div className="min-w-0 flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${uploaded ? 'bg-[#eaf2fb] text-[#2e66a6]' : 'bg-[#f7faff] text-black/40'}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <div className={`text-[16px] sm:text-[18px] font-medium truncate ${uploaded ? 'text-black' : 'text-black/50'}`}>{title}</div>
          {fileName ? <div className="text-xs text-black/50 truncate">{fileName}</div> : null}
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
            uploaded
              ? 'bg-[#eaf2fb] text-[#2e66a6]'
              : 'bg-white text-black/50'
          }`}
        >
          {uploaded ? 'Uploaded' : 'Not uploaded'}
        </span>
      </div>

      {popoverOpen ? (
        <div
          className="absolute left-4 top-1/2 -translate-y-1/2 z-[80] w-[245px] rounded-lg border border-[#d8e2ee] bg-white shadow-xl px-4 py-3 pointer-events-auto"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose?.();
            }}
            className="absolute right-2 top-2 text-red-500 hover:text-red-700 text-sm leading-none"
            aria-label={`Close ${title} popup`}
          >
            ×
          </button>

          <div className="pr-5 text-[12px] leading-5 text-black/65">
            {uploaded
              ? `Uploaded ${title}. You can view or download this credential.`
              : `Upload your ${title} for document compliance and profile processing.`}
          </div>

          <div className="mt-3 flex items-center gap-2">
            {!uploaded ? (
              <button
                type="button"
                onClick={handleUploadClick}
                disabled={uploading}
                className="h-8 px-3 rounded-md border border-[#d8e2ee] bg-white text-[#2e66a6] text-xs font-semibold inline-flex items-center justify-center gap-2 hover:bg-[#f7faff] disabled:opacity-70"
              >
                <FaDownload className="text-[10px]" />
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
            ) : (
              <>
                {fileUrl ? (
                  <button
                    type="button"
                    onClick={handleViewFile}
                    className="h-8 px-3 rounded-md border border-[#d8e2ee] bg-white text-[#2e66a6] text-xs font-semibold inline-flex items-center justify-center gap-2 hover:bg-[#f7faff]"
                  >
                    <FaEye className="text-[10px]" />
                    View
                  </button>
                ) : null}

                {fileUrl ? (
                  <button
                    type="button"
                    onClick={handleDownloadFile}
                    className="h-8 px-3 rounded-md border border-[#d8e2ee] bg-white text-[#2e66a6] text-xs font-semibold inline-flex items-center justify-center gap-2 hover:bg-[#f7faff]"
                  >
                    <FaDownload className="text-[10px]" />
                    Download
                  </button>
                ) : null}
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};

const ReadSectionCard = ({ items }) => {
  return (
    <div className="rounded-[20px] border border-gray-200 bg-[#fcfcfd] p-5 sm:p-6">
      <div className="grid md:grid-cols-2 gap-x-10 gap-y-4">
        {items.map((item) => (
          <DisplayField key={item.label} label={item.label} value={item.value} />
        ))}
      </div>
    </div>
  );
};

const EmptyProfileSection = ({ title, message }) => {
  return (
    <div className="px-4 sm:px-10 pb-8">
      <div className="rounded-[20px] border border-gray-200 bg-[#fcfcfd] p-5 sm:p-6">
        <div className="rounded-[18px] border border-dashed border-gray-300 bg-white px-6 py-10 text-center">
          <div className="text-[18px] font-bold text-gray-900">{title}</div>
          <div className="text-sm text-gray-500 mt-2">
            {message || 'No data added yet.'}
          </div>
        </div>
      </div>
    </div>
  );
};


const formatDisplayHeight = (height) => {
  if (!height) return 'N/A';

  const heightText = String(height).trim();

  if (heightText.includes('cm')) return heightText;

  const feetInchesMatch = heightText.match(/^(\d+)\s*'\s*(\d+)?\s*(?:"|in|inches)?$/i);
  if (feetInchesMatch) {
    const feet = Number(feetInchesMatch[1]);
    const inches = Number(feetInchesMatch[2] || 0);
    const cm = Math.round(((feet * 12) + inches) * 2.54);
    return `${feet}'${inches}" (${cm} cm)`;
  }

  const numericHeight = Number(heightText);
  if (!Number.isNaN(numericHeight)) {
    if (numericHeight > 100) {
      const totalInches = Math.round(numericHeight / 2.54);
      const feet = Math.floor(totalInches / 12);
      const inches = totalInches % 12;
      return `${feet}'${inches}" (${numericHeight} cm)`;
    }

    return `${numericHeight} cm`;
  }

  return heightText;
};

const formatDisplayWeight = (weight) => {
  if (!weight) return 'N/A';

  const weightText = String(weight).trim();

  if (weightText.toLowerCase().includes('kg')) return weightText;

  return `${weightText} kg`;
};

const formatProfileEntryDate = (item = {}) => {
  if (item.date) return item.date;
  if (item.startDate && item.endDate) return `${item.startDate} — ${item.endDate}`;
  if (item.startDate) return item.startDate;
  if (item.endDate) return item.endDate;
  return '';
};

const getProfileEntryTitle = (sectionKey, item = {}) => {
  if (sectionKey === 'references') return item.name || 'Unnamed Reference';
  if (sectionKey === 'affiliations' || sectionKey === 'cocurricular') return item.organization || item.title || 'Untitled';
  return item.title || item.organization || 'Untitled';
};

const getProfileEntrySubLine = (sectionKey, item = {}) => {
  if (sectionKey === 'certifications') return item.issuer || '';
  if (sectionKey === 'projects') return item.role || '';
  if (sectionKey === 'seminars') return item.organization || '';
  if (sectionKey === 'awards') return item.issuer ? `Issued by: ${item.issuer}` : '';
  if (sectionKey === 'affiliations' || sectionKey === 'cocurricular') return item.role ? `Role: ${item.role}` : '';
  if (sectionKey === 'references') {
    return [item.position, item.company].map((value) => String(value || '').trim()).filter(Boolean).join(' · ');
  }
  return '';
};

const createEmptyProfileEntry = (sectionKey) => {
  const fields = MORE_PROFILE_SECTIONS[sectionKey]?.fields || [];
  return fields.reduce((entry, field) => {
    entry[field.key] = '';
    return entry;
  }, {});
};

const EditableProfileListSection = ({
  sectionKey,
  config,
  items = [],
  drafts = [],
  editing,
  saving,
  onEdit,
  onCancel,
  onSave,
  onAddItem,
  onRemoveItem,
  onChangeItem,
}) => {
  const displayItems = Array.isArray(items) ? items : [];
  const draftItems = Array.isArray(drafts) ? drafts : [];
  const fields = Array.isArray(config.fields) ? config.fields : [];

  return (
    <>
      <SectionHeader title={config.title} editLabel={`Edit ${config.title}`} onEdit={onEdit} />

      <div className="px-4 sm:px-10 pb-8">
        {!editing ? (
          <div className="rounded-[20px] border border-gray-200 bg-[#fcfcfd] p-5 sm:p-6">
            {displayItems.length === 0 ? (
              <div className="rounded-[18px] border border-dashed border-gray-300 bg-white px-6 py-10 text-center">
                <div className="text-[18px] font-bold text-gray-900">{config.emptyTitle}</div>
                <div className="text-sm text-gray-500 mt-2">No data added yet.</div>
              </div>
            ) : sectionKey === 'references' ? (
              <div className="grid md:grid-cols-2 gap-4">
                {displayItems.map((item, index) => (
                  <div key={item._id || `${config.title}-${index}`} className="rounded-[18px] border border-gray-200 bg-white px-5 py-4">
                    <div className="text-[17px] font-bold text-gray-900">{getProfileEntryTitle(sectionKey, item)}</div>
                    {getProfileEntrySubLine(sectionKey, item) ? (
                      <div className="text-sm text-gray-600 mt-1">{getProfileEntrySubLine(sectionKey, item)}</div>
                    ) : null}
                    {item.phone ? <div className="text-sm text-gray-600 mt-3">{item.phone}</div> : null}
                    {item.email ? <div className="text-sm text-[#1658d3] mt-1 break-all">{item.email}</div> : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {displayItems.map((item, index) => {
                  const dateText = formatProfileEntryDate(item);
                  const subLine = getProfileEntrySubLine(sectionKey, item);

                  return (
                    <div key={item._id || `${config.title}-${index}`} className="rounded-[18px] border border-gray-200 bg-white px-5 py-4">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-[17px] font-bold text-gray-900">{getProfileEntryTitle(sectionKey, item)}</div>
                          {subLine ? <div className="text-sm text-gray-600 italic mt-1">{subLine}</div> : null}
                        </div>
                        {dateText ? <div className="text-sm text-gray-400 italic shrink-0">{dateText}</div> : null}
                      </div>

                      {item.description ? (
                        <div className="text-sm leading-6 text-gray-600 mt-3">{item.description}</div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-5 rounded-[20px] border border-gray-200 bg-[#fcfcfd] p-5 sm:p-6">
            {draftItems.map((item, index) => (
              <div key={item._id || `${config.title}-draft-${index}`} className="rounded-[18px] border border-gray-200 bg-white p-4 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-bold text-gray-700">Entry {index + 1}</div>
                  <button
                    type="button"
                    onClick={() => onRemoveItem(index)}
                    className="h-9 px-3 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 inline-flex items-center gap-2 text-sm font-semibold"
                  >
                    <FaTrash className="text-xs" />
                    Remove
                  </button>
                </div>

                <div className="grid md:grid-cols-2 gap-5">
                  {fields.map((field) => (
                    <div key={field.key} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                      {field.type === 'textarea' ? (
                        <TextArea
                          label={field.label}
                          rows={3}
                          value={item[field.key]}
                          onChange={(e) => onChangeItem(index, field.key, e.target.value)}
                          placeholder={field.placeholder}
                        />
                      ) : (
                        <Input
                          label={field.label}
                          value={item[field.key]}
                          onChange={(e) => onChangeItem(index, field.key, e.target.value)}
                          placeholder={field.placeholder}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={onAddItem}
              className="h-11 px-5 rounded-xl text-white font-semibold inline-flex items-center gap-2"
              style={{ backgroundColor: COLORS.primary }}
            >
              <FaPlus className="text-xs" />
              Add Entry
            </button>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 h-11 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onSave}
                disabled={saving}
                className="px-5 h-11 rounded-xl text-white font-semibold disabled:opacity-70"
                style={{ backgroundColor: COLORS.primary }}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

const WorkExperienceModal = ({
  open,
  mode,
  form,
  onChange,
  onClose,
  onSave,
  saving,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[10001] bg-black/35 flex items-center justify-center px-4 py-6" role="dialog" aria-modal="true">
      <div className="w-full max-w-3xl bg-white rounded-[24px] shadow-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 sm:px-8 py-5 border-b border-gray-200 flex items-center justify-between gap-3">
          <div>
            <div className="text-[20px] font-bold text-gray-900">
              {mode === 'edit' ? 'Edit Work Experience' : 'Add Work Experience'}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              Add your company, role, dates, and responsibilities.
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        <div className="px-6 sm:px-8 py-6 space-y-5 max-h-[80vh] overflow-y-auto">
          <div className="grid md:grid-cols-2 gap-6">
            <Input
              label="Company / Organization Name"
              value={form.companyName}
              onChange={(e) => onChange('companyName', e.target.value)}
              placeholder="e.g. Phinma Araullo University"
            />
            <Input
              label="Position / Role Title"
              value={form.positionTitle}
              onChange={(e) => onChange('positionTitle', e.target.value)}
              placeholder="e.g. UI / UX Designer"
            />
            <Input
              label="Start Date"
              type="date"
              value={form.startDate}
              onChange={(e) => onChange('startDate', e.target.value)}
            />
            {!form.isPresent ? (
              <Input
                label="End Date"
                type="date"
                value={form.endDate}
                onChange={(e) => onChange('endDate', e.target.value)}
              />
            ) : (
              <div>
                <label className="block text-[11px] tracking-[0.16em] uppercase font-bold text-gray-400 mb-2">End Date</label>
                <div className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 flex items-center">
                  Present
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <input
              id="isPresent"
              type="checkbox"
              checked={form.isPresent}
              onChange={(e) => onChange('isPresent', e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="isPresent" className="text-sm font-medium text-gray-700">
              I am currently working here
            </label>
          </div>

          <TextArea
            label="Description / Responsibilities"
            rows={5}
            value={form.description}
            onChange={(e) => onChange('description', e.target.value)}
            placeholder="Describe your responsibilities, achievements, and the work you handled."
          />
        </div>

        <div className="px-6 sm:px-8 py-5 border-t border-gray-200 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 h-11 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="px-5 h-11 rounded-xl text-white font-semibold disabled:opacity-70"
            style={{ backgroundColor: COLORS.primary }}
          >
            {saving ? 'Saving...' : mode === 'edit' ? 'Save Changes' : 'Add Work Experience'}
          </button>
        </div>
      </div>
    </div>
  );
};

const BasicInfoModal = ({
  open,
  drafts,
  fullName,
  userData,
  profileImageUploading,
  profileImageInputRef,
  onImageChange,
  onImageClick,
  onChange,
  onClose,
  onSave,
  saving,
  regionOptions,
  provinceOptions,
  cityOptions,
  onEmailUpdate,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[10002] bg-black/35 flex items-center justify-center px-4 py-6" role="dialog" aria-modal="true">
      <div className="w-full max-w-4xl bg-white rounded-[4px] shadow-2xl border border-gray-200 overflow-hidden">
        <div className="h-12 px-5 sm:px-6 bg-[#0b8ee8] flex items-center justify-between gap-3">
          <div className="text-white font-bold text-[15px]">Edit Basic Information</div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-md text-white/90 hover:bg-white/15 text-2xl leading-none"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        <div className="px-5 sm:px-7 py-7 max-h-[80vh] overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-[150px_1fr] gap-6">
            <div className="flex lg:block justify-center">
              <div className="relative w-[92px] h-[92px]">
                <div className="w-[92px] h-[92px] rounded-full bg-white overflow-hidden shadow border border-gray-200">
                  {userData?.profileImage ? (
                    <img src={userData.profileImage} alt={fullName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-blue-100 text-[#2e66a6] font-bold text-3xl flex items-center justify-center">
                      {(fullName || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                <input
                  ref={profileImageInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={onImageChange}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={onImageClick}
                  disabled={profileImageUploading}
                  className="absolute -right-1 bottom-1 w-8 h-8 rounded-full bg-white border border-gray-200 shadow flex items-center justify-center text-[#0b8ee8] disabled:opacity-70"
                  title="Update photo"
                >
                  {profileImageUploading ? <Spinner size="small" /> : <FaCamera className="text-xs" />}
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-4">
                <div className="grid grid-cols-[120px_1fr] items-center gap-3">
                  <label className="text-sm text-gray-500">First Name</label>
                  <input
                    value={drafts.firstName || ''}
                    onChange={(e) => onChange('firstName', e.target.value)}
                    className="h-11 px-3 border border-gray-300 rounded-[3px] outline-none focus:border-[#0b8ee8] focus:ring-1 focus:ring-[#0b8ee8]"
                  />
                </div>

                <input
                  value={drafts.lastName || ''}
                  onChange={(e) => onChange('lastName', e.target.value)}
                  placeholder="Last Name"
                  className="h-11 px-3 border border-gray-300 rounded-[3px] outline-none focus:border-[#0b8ee8] focus:ring-1 focus:ring-[#0b8ee8]"
                />

                <div className="grid grid-cols-[120px_1fr] items-center gap-3 md:col-start-1">
                  <label className="text-sm text-gray-500">Middle Name</label>
                  <input
                    value={drafts.middleName || ''}
                    onChange={(e) => onChange('middleName', e.target.value)}
                    className="h-11 px-3 border border-gray-300 rounded-[3px] outline-none focus:border-[#0b8ee8] focus:ring-1 focus:ring-[#0b8ee8]"
                  />
                </div>

                <select
                  value={drafts.extensionName || ''}
                  onChange={(e) => onChange('extensionName', e.target.value)}
                  className="h-11 px-3 border border-gray-300 rounded-[3px] bg-white outline-none focus:border-[#0b8ee8] focus:ring-1 focus:ring-[#0b8ee8]"
                >
                  <option value="">None</option>
                  {EXTENSION_NAME_OPTIONS.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-[120px_1fr] items-center gap-3">
                <label className="text-sm text-gray-500">Region</label>
                <select
                  value={drafts.region || ''}
                  onChange={(e) => onChange('region', e.target.value)}
                  className="h-11 px-3 border border-gray-300 rounded-[3px] bg-white outline-none focus:border-[#0b8ee8] focus:ring-1 focus:ring-[#0b8ee8]"
                >
                  <option value="">Select region</option>
                  {regionOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-[120px_1fr] items-center gap-3">
                <label className="text-sm text-gray-500">Province*</label>
                <select
                  value={drafts.province || ''}
                  onChange={(e) => onChange('province', e.target.value)}
                  disabled={!drafts.region}
                  className="h-11 px-3 border border-gray-300 rounded-[3px] bg-white outline-none focus:border-[#0b8ee8] focus:ring-1 focus:ring-[#0b8ee8] disabled:bg-gray-50 disabled:text-gray-400"
                >
                  <option value="">Select province</option>
                  {provinceOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-[120px_1fr] items-center gap-3">
                <label className="text-sm text-gray-500">City / Municipality*</label>
                <select
                  value={drafts.cityMunicipality || ''}
                  onChange={(e) => onChange('cityMunicipality', e.target.value)}
                  disabled={!drafts.province}
                  className="h-11 px-3 border border-gray-300 rounded-[3px] bg-white outline-none focus:border-[#0b8ee8] focus:ring-1 focus:ring-[#0b8ee8] disabled:bg-gray-50 disabled:text-gray-400"
                >
                  <option value="">Select city / municipality</option>
                  {cityOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-[120px_1fr] items-center gap-3">
                <label className="text-sm text-gray-500">Street Address</label>
                <input
                  value={drafts.streetAddress || ''}
                  onChange={(e) => onChange('streetAddress', e.target.value)}
                  placeholder="e.g. #89 Garcia St"
                  className="h-11 px-3 border border-gray-300 rounded-[3px] outline-none focus:border-[#0b8ee8] focus:ring-1 focus:ring-[#0b8ee8]"
                />
              </div>

              <div className="pt-8 space-y-4">
                <div className="grid grid-cols-[120px_1fr_auto] items-center gap-3">
                  <label className="text-sm text-gray-500">Email*</label>
                  <input
                    value={drafts.email || ''}
                    disabled
                    className="h-11 px-3 border border-gray-300 rounded-[3px] bg-gray-100 text-gray-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={onEmailUpdate}
                    className="h-11 px-4 text-[#0b8ee8] font-bold text-sm hover:underline"
                  >
                    UPDATE
                  </button>
                </div>

                <div className="grid grid-cols-[120px_1fr] items-center gap-3">
                  <label className="text-sm text-gray-500">Mobile Number</label>
                  <input
                    value={drafts.phoneNumber || ''}
                    onChange={(e) => onChange('phoneNumber', e.target.value)}
                    className="h-11 px-3 border border-gray-300 rounded-[3px] outline-none focus:border-[#0b8ee8] focus:ring-1 focus:ring-[#0b8ee8]"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 sm:px-7 py-5 border-t border-gray-200 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 h-10 rounded-[3px] border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="px-6 h-10 rounded-[3px] bg-[#0b8ee8] text-white font-semibold disabled:opacity-70"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

const EmailUpdateModal = ({
  open,
  step,
  form,
  error,
  loading,
  onChange,
  onClose,
  onRequestCode,
  onVerifyCode,
  onResendCode,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[10004] bg-black/35 flex items-center justify-center px-4 py-6" role="dialog" aria-modal="true">
      <div className="w-full max-w-md bg-white rounded-[4px] shadow-2xl border border-gray-200 overflow-hidden">
        <div className="h-12 px-5 bg-[#0b8ee8] flex items-center justify-between gap-3">
          <div className="text-white font-bold text-[15px]">Update Email</div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="w-8 h-8 rounded-md text-white/90 hover:bg-white/15 text-2xl leading-none disabled:opacity-70"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        <form onSubmit={step === 'verify' ? onVerifyCode : onRequestCode} className="px-6 py-6 space-y-4">
          {step === 'request' ? (
            <>
              <Input
                label="New Email"
                type="email"
                value={form.newEmail}
                onChange={(e) => onChange('newEmail', e.target.value)}
                placeholder="Enter new email address"
              />
              <Input
                label="Current Password"
                type="password"
                value={form.currentPassword}
                onChange={(e) => onChange('currentPassword', e.target.value)}
                placeholder="Enter your current password"
              />
              <p className="text-xs text-gray-500 leading-5">
                A verification code will be sent to your new email through Brevo.
              </p>
            </>
          ) : (
            <>
              <div className="text-sm text-gray-600 leading-6">
                Enter the verification code sent to <span className="font-semibold text-gray-800">{form.newEmail}</span>.
              </div>
              <Input
                label="Verification Code"
                value={form.code}
                onChange={(e) => onChange('code', e.target.value)}
                placeholder="Enter 6-digit code"
              />
              <button
                type="button"
                onClick={onResendCode}
                disabled={loading}
                className="text-sm font-semibold text-[#0b8ee8] hover:underline disabled:opacity-70"
              >
                Resend code
              </button>
            </>
          )}

          {error ? <Alert type="error" message={error} /> : null}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 h-10 rounded-[3px] border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 disabled:opacity-70"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 h-10 rounded-[3px] bg-[#0b8ee8] text-white font-semibold disabled:opacity-70"
            >
              {loading ? 'Please wait...' : step === 'verify' ? 'Verify Email' : 'Send Code'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


const AddSectionsModal = ({ open, addedSections = [], onAdd, onClose }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[10005] bg-black/65 flex items-center justify-center px-4 py-6" role="dialog" aria-modal="true">
      <div className="w-full max-w-[640px] bg-white rounded-[4px] shadow-2xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 flex items-center justify-between gap-3 border-b border-gray-100">
          <h2 className="text-[22px] font-bold text-gray-900">Add More Sections</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full text-gray-500 hover:bg-gray-100 text-2xl leading-none"
            aria-label="Close add sections modal"
          >
            ×
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-2">
          {MORE_PROFILE_TAB_KEYS.map((key) => {
            const config = MORE_PROFILE_SECTIONS[key];
            const alreadyAdded = addedSections.includes(key);

            return (
              <div key={key} className="flex items-center gap-5 py-5 border-b border-gray-200 last:border-b-0">
                <div className="w-11 h-11 rounded-xl bg-[#f0f7ff] text-[#0b8ee8] flex items-center justify-center shrink-0">
                  <FaPlus className="text-lg" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-[17px] font-bold text-gray-900">{config.title}</div>
                  <p className="text-sm leading-6 text-gray-500 mt-1">
                    {MORE_SECTION_DESCRIPTIONS[key] || 'Add this section to complete your profile.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onAdd(key)}
                  disabled={alreadyAdded}
                  className={`h-11 min-w-[92px] px-5 rounded-lg text-sm font-bold text-white ${alreadyAdded ? 'bg-gray-300 cursor-not-allowed' : 'bg-[#27a69a] hover:bg-[#208d83]'}`}
                >
                  {alreadyAdded ? 'ADDED' : 'ADD'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const MyProfile = () => {
  useEffect(() => {
    const previousHtmlOverflowY = document.documentElement.style.overflowY;
    const previousBodyOverflowY = document.body.style.overflowY;
    const previousBodyPosition = document.body.style.position;

    document.documentElement.style.overflowY = 'auto';
    document.body.style.overflowY = 'auto';
    document.body.style.position = 'static';

    return () => {
      document.documentElement.style.overflowY = previousHtmlOverflowY;
      document.body.style.overflowY = previousBodyOverflowY;
      document.body.style.position = previousBodyPosition;
    };
  }, []);

  const API_BASE = process.env.REACT_APP_API_URL ? `${process.env.REACT_APP_API_URL}` : 'https://phinmaau-job-portal-atlas.onrender.com/api';
  const navigate = useNavigate();
  const location = useLocation();

  const getStoredApplyFlowState = () => {
    try {
      return JSON.parse(sessionStorage.getItem('pendingApplyFlow') || 'null') || {};
    } catch {
      return {};
    }
  };

  const applyFlowState = useMemo(() => {
    if (location.state?.fromApplyFlow) return location.state;
    return getStoredApplyFlowState();
  }, [location.state]);

  const isApplyFlow = Boolean(applyFlowState?.fromApplyFlow);
  const applyJob = applyFlowState?.applyJob || null;
  const returnTo = applyFlowState?.returnTo || '/jobseeker/job-search';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingSection, setSavingSection] = useState('');
  const [successPopup, setSuccessPopup] = useState({ open: false, title: '', message: '' });
  const [downloadPasswordModalOpen, setDownloadPasswordModalOpen] = useState(false);
  const [downloadPassword, setDownloadPassword] = useState('');
  const [downloadPasswordError, setDownloadPasswordError] = useState('');
  const [downloadPasswordVerifying, setDownloadPasswordVerifying] = useState(false);
  const [resumePasswordAction, setResumePasswordAction] = useState('download');

  const [confirmState, setConfirmState] = useState({
    open: false,
    title: '',
    message: '',
    confirmText: 'Yes',
    cancelText: 'Cancel',
    tone: 'primary',
    onConfirmAction: null,
  });

  const [userData, setUserData] = useState(null);
  const [profileImageUploading, setProfileImageUploading] = useState(false);
  const profileImageInputRef = useRef(null);

  const [emailUpdateModalOpen, setEmailUpdateModalOpen] = useState(false);
  const [emailUpdateStep, setEmailUpdateStep] = useState('request');
  const [emailUpdateForm, setEmailUpdateForm] = useState({ newEmail: '', currentPassword: '', code: '' });
  const [emailUpdateError, setEmailUpdateError] = useState('');
  const [emailUpdateLoading, setEmailUpdateLoading] = useState(false);

  const [editing, setEditing] = useState({
    about: false,
    salary: false,
    basic: false,
    personal: false,
    career: false,
    education: false,
    certifications: false,
    projects: false,
    seminars: false,
    awards: false,
    affiliations: false,
    cocurricular: false,
    references: false,
  });

  const [activeTab, setActiveTab] = useState('personal');
  const [addSectionsModalOpen, setAddSectionsModalOpen] = useState(false);
  const [addedMoreSections, setAddedMoreSections] = useState([]);

  const [uploadingDocs, setUploadingDocs] = useState({});
  const [docErrors, setDocErrors] = useState({});
  const [activeCredentialPopover, setActiveCredentialPopover] = useState('');

  const [verificationDocs, setVerificationDocs] = useState({
    cv: { status: 'not_submitted', url: '', filename: '', fileSize: 0, uploadedAt: null },
    tor: { status: 'not_submitted', url: '', filename: '', fileSize: 0, uploadedAt: null },
    diploma: { status: 'not_submitted', url: '', filename: '', fileSize: 0, uploadedAt: null },
    validId: { status: 'not_submitted', url: '', filename: '', fileSize: 0, uploadedAt: null },
    sss: { status: 'not_submitted', url: '', filename: '', fileSize: 0, uploadedAt: null },
    philhealth: { status: 'not_submitted', url: '', filename: '', fileSize: 0, uploadedAt: null },
    pagibig: { status: 'not_submitted', url: '', filename: '', fileSize: 0, uploadedAt: null },
    tin: { status: 'not_submitted', url: '', filename: '', fileSize: 0, uploadedAt: null },
  });

  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    extensionName: '',
    email: '',
    phoneNumber: '',

    aboutMe: '',
    minimumSalary: '',
    maximumSalary: '',

    address: '',
    region: '',
    province: '',
    cityMunicipality: '',
    streetAddress: '',

    birthday: '',
    gender: '',
    nationality: '',
    civilStatus: '',
    height: '',
    weight: '',
    preferredLanguage: '',

    campus: '',
    course: '',
    yearGraduated: '',
    preferredWorkMode: '',
    technicalSkills: [],
    softSkills: [],
    whatHaveYouDone: '',
    howSoonCanYouStart: '',
    employmentType: '',
    educationalAttainment: '',
    willingToRelocate: '',
    studyField: '',

    certifications: [],
    projects: [],
    seminars: [],
    awards: [],
    affiliations: [],
    cocurricular: [],
    references: [],

    educationEntries: [],
    eduLevel: '',
    eduCampus: '',
    eduCourse: '',
    eduStudyField: '',
    eduEducationalAttainment: '',
    eduStartYear: '',
    eduEndYear: '',
  });

  const [drafts, setDrafts] = useState(formData);
  const [techInput, setTechInput] = useState('');
  const [softInput, setSoftInput] = useState('');

  const [workExperiences, setWorkExperiences] = useState([]);
  const [workExperienceLoading, setWorkExperienceLoading] = useState(false);
  const [workExperienceModalOpen, setWorkExperienceModalOpen] = useState(false);
  const [workExperienceModalMode, setWorkExperienceModalMode] = useState('add');
  const [savingWorkExperience, setSavingWorkExperience] = useState(false);
  const [editingWorkExperienceId, setEditingWorkExperienceId] = useState('');
  const [workExperienceForm, setWorkExperienceForm] = useState({
    companyName: '',
    positionTitle: '',
    startDate: '',
    endDate: '',
    isPresent: false,
    description: '',
  });

  const showSuccess = (title, message) => setSuccessPopup({ open: true, title, message });
  const closeSuccess = () => setSuccessPopup({ open: false, title: '', message: '' });

  const normalizeStatus = (raw, hasUrl) => {
    const s = (raw || '').toString().trim().toLowerCase();
    if (s === 'verified') return 'approved';
    if (s === 'submitted') return 'pending';
    if (s === 'not submitted') return 'not_submitted';
    if (['not_submitted', 'pending', 'approved', 'rejected', 'submitted'].includes(s)) return s;
    if (!s && hasUrl) return 'pending';
    return 'not_submitted';
  };

  const normalizeVerificationDocs = (rawDocs) => {
    const keys = ['cv', 'tor', 'diploma', 'validId', 'sss', 'philhealth', 'pagibig', 'tin'];
    const result = {};
    keys.forEach((k) => {
      const d = rawDocs?.[k] || {};
      const url = d.url || '';
      result[k] = {
        status: normalizeStatus(d.status, Boolean(url)),
        url,
        filename: d.filename || '',
        fileSize: Number(d.fileSize || 0),
        uploadedAt: d.uploadedAt || null,
      };
    });
    return result;
  };

  const fullName = useMemo(() => {
    return [formData.firstName, formData.middleName, formData.lastName, normalizeExtensionName(formData.extensionName)]
      .map((x) => String(x || '').trim())
      .filter(Boolean)
      .join(' ');
  }, [formData.firstName, formData.middleName, formData.lastName, formData.extensionName]);

  const courseText = useMemo(() => formData.course || 'Course not set yet', [formData.course]);

  const classOfText = useMemo(() => {
    return formData.yearGraduated ? `CLASS OF ${formData.yearGraduated}` : 'YEAR NOT SET';
  }, [formData.yearGraduated]);

  const verificationBadge = useMemo(() => {
    const docs = Object.values(verificationDocs || {});
    const hasRejected = docs.some((d) => d?.status === 'rejected');
    const hasPending = docs.some((d) => ['pending', 'submitted'].includes(d?.status));
    const hasApproved = docs.some((d) => d?.status === 'approved');

    if (hasRejected) return { text: 'Rejected', cls: 'bg-red-100 text-red-700' };
    if (hasPending) return { text: 'In Review', cls: 'bg-yellow-100 text-yellow-700' };
    if (hasApproved) return { text: 'Verified', cls: 'bg-green-100 text-green-700' };
    return { text: 'Not Submitted', cls: 'bg-gray-100 text-gray-700' };
  }, [verificationDocs]);

  const yearOptions = useMemo(() => {
    const now = new Date().getFullYear();
    const arr = [];
    for (let y = now; y >= 1950; y--) arr.push(String(y));
    return arr;
  }, []);

  const techSuggestions = useMemo(() => {
    const q = techInput.trim().toLowerCase();
    if (!q) return TECHNICAL_SKILLS.slice(0, 8);
    return TECHNICAL_SKILLS.filter((s) => s.toLowerCase().includes(q)).slice(0, 8);
  }, [techInput]);

  const softSuggestions = useMemo(() => {
    const q = softInput.trim().toLowerCase();
    if (!q) return SOFT_SKILLS.slice(0, 8);
    return SOFT_SKILLS.filter((s) => s.toLowerCase().includes(q)).slice(0, 8);
  }, [softInput]);

  const educationEntries = useMemo(() => {
    return Array.isArray(formData.educationEntries) ? formData.educationEntries : [];
  }, [formData.educationEntries]);

  const hasEducationEntries = educationEntries.length > 0;

  const regionOptions = useMemo(() => PH_REGIONS, []);
  const provinceOptions = useMemo(() => {
    return drafts.region ? (PH_PROVINCES_BY_REGION[drafts.region] || []) : [];
  }, [drafts.region]);

  const cityOptions = useMemo(() => {
    return drafts.province ? (PH_CITIES_BY_PROVINCE[drafts.province] || []) : [];
  }, [drafts.province]);

  const displayedAddress = useMemo(() => {
    const built = buildAddressString(formData);
    return built || formData.address || '';
  }, [formData]);

  const getEducationYearText = (entry) => {
    const start = String(entry?.startYear || '').trim();
    const end = String(entry?.endYear || entry?.yearGraduated || '').trim();

    if (start && end) return `${start} - ${end}`;
    if (end) return end;
    if (start) return start;
    return 'Year not specified';
  };

  const resetEducationDraftFields = (baseState) => ({
    ...baseState,
    eduLevel: '',
    eduCampus: '',
    eduCourse: '',
    eduStudyField: '',
    eduEducationalAttainment: '',
    eduStartYear: '',
    eduEndYear: '',
  });

  const createEmptyWorkExperienceForm = () => ({
    companyName: '',
    positionTitle: '',
    startDate: '',
    endDate: '',
    isPresent: false,
    description: '',
  });

  const formatWorkDate = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const getWorkExperienceDateRange = (item) => {
    const start = formatWorkDate(item?.startDate);
    const end = item?.isPresent ? 'Present' : formatWorkDate(item?.endDate);

    if (start && end) return `${start} — ${end}`;
    if (start) return start;
    if (end) return end;
    return 'Date not specified';
  };

  const openResumePreview = () => {
    const resumeData = {
      userData,
      formData,
      workExperiences,
      verificationDocs,
    };

    sessionStorage.setItem('resumePreviewData', JSON.stringify(resumeData));
    navigate('/jobseeker/my-profile/preview-resume');
  };

  const handlePreviewResume = () => {
    setError('');
    setDownloadPasswordError('');
    setDownloadPassword('');
    setResumePasswordAction('preview');
    setDownloadPasswordModalOpen(true);
  };

  const downloadResumePdf = async () => {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_BASE}/auth/resume/download`, {
      headers: { Authorization: `Bearer ${token}` },
      responseType: 'blob',
    });

    const contentType = response.headers?.['content-type'] || '';

    if (!contentType.includes('application/pdf')) {
      const errorText = await response.data.text();
      console.error('Resume download error:', errorText);
      setError('Failed to generate CV PDF. Please check your backend terminal.');
      return;
    }

    const blob = new Blob([response.data], { type: 'application/pdf' });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeName = (fullName || 'resume')
      .replace(/[^a-z0-9\s-_]/gi, '')
      .trim()
      .replace(/\s+/g, '_') || 'resume';

    link.href = downloadUrl;
    link.download = `${safeName}_CV.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
  };

  const handleDownloadResume = () => {
    setError('');
    setDownloadPasswordError('');
    setDownloadPassword('');
    setResumePasswordAction('download');
    setDownloadPasswordModalOpen(true);
  };

  const closeDownloadPasswordModal = () => {
    if (downloadPasswordVerifying) return;
    setDownloadPasswordModalOpen(false);
    setDownloadPassword('');
    setDownloadPasswordError('');
  };

  const handleDownloadPasswordSubmit = async (e) => {
    e.preventDefault();

    if (!downloadPassword.trim()) {
      setDownloadPasswordError('Please enter your password.');
      return;
    }

    try {
      setDownloadPasswordVerifying(true);
      setDownloadPasswordError('');
      setError('');

      const token = localStorage.getItem('token');
      const verifyResponse = await axios.post(
        `${API_BASE}/auth/resume/verify-password`,
        { password: downloadPassword },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (verifyResponse.data?.success) {
        setDownloadPasswordModalOpen(false);
        setDownloadPassword('');

        if (resumePasswordAction === 'preview') {
          openResumePreview();
          return;
        }

        await downloadResumePdf();
      }
    } catch (err) {
      console.error(err);

      if (err.response?.data instanceof Blob) {
        const errorText = await err.response.data.text();
        console.error('Resume download error:', errorText);
      }

      setDownloadPasswordError(err.response?.data?.message || 'Incorrect password. Please try again.');
    } finally {
      setDownloadPasswordVerifying(false);
    }
  };

  const handleApplyFlowBack = () => {
    const reopenState = {
      reopenApplyModal: true,
      reopenApplyStep: 1,
      applyJob,
      flowKey: Date.now(),
    };

    try {
      sessionStorage.setItem('pendingApplyReopen', JSON.stringify(reopenState));
    } catch {}

    navigate(returnTo, {
      state: reopenState,
    });
  };

  const handleApplyFlowContinue = () => {
    const reopenState = {
      reopenApplyModal: true,
      reopenApplyStep: 3,
      applyJob,
      flowKey: Date.now(),
    };

    try {
      sessionStorage.setItem('pendingApplyReopen', JSON.stringify(reopenState));
    } catch {}

    navigate(returnTo, {
      state: reopenState,
    });
  };

  const handleLocalChange = (field, value) => {
    setDrafts((prev) => ({ ...prev, [field]: value }));
  };

  const handleBasicInfoChange = (field, value) => {
    setDrafts((prev) => {
      if (field === 'region') {
        return {
          ...prev,
          region: value,
          province: '',
          cityMunicipality: '',
        };
      }

      if (field === 'province') {
        return {
          ...prev,
          province: value,
          cityMunicipality: '',
        };
      }

      return {
        ...prev,
        [field]: value,
      };
    });
  };

  const syncDrafts = (nextData) => {
    setFormData(nextData);
    setDrafts(nextData);
  };

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const response = await axios.get(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data?.success) {
        const user = response.data.user;
        const profile = user.jobSeekerProfile || {};

        const parseSkills = (raw) =>
          String(raw || '')
            .split(',')
            .map((x) => String(x || '').trim())
            .filter(Boolean);

        const normalizeProfileList = (items) =>
          Array.isArray(items)
            ? items.map((item) => ({
                _id: item?._id || '',
                title: item?.title || '',
                organization: item?.organization || '',
                role: item?.role || '',
                issuer: item?.issuer || '',
                date: item?.date || '',
                startDate: item?.startDate || '',
                endDate: item?.endDate || '',
                description: item?.description || '',
                url: item?.url || '',
                name: item?.name || '',
                position: item?.position || '',
                company: item?.company || '',
                email: item?.email || '',
                phone: item?.phone || '',
              }))
            : [];

        const parsedAddress = parseAddressString(profile.address || '');

        const nextData = {
          firstName: user.firstName || '',
          middleName: user.middleName || '',
          lastName: user.lastName || '',
          extensionName: normalizeExtensionName(user.extensionName),
          email: user.email || '',
          phoneNumber: profile.phoneNumber || '',

          aboutMe: profile.aboutMe || '',
          minimumSalary: profile.minimumSalary || '',
          maximumSalary: profile.maximumSalary || '',

          address: profile.address || '',
          region: parsedAddress.region || '',
          province: parsedAddress.province || '',
          cityMunicipality: parsedAddress.cityMunicipality || '',
          streetAddress: parsedAddress.streetAddress || '',

          birthday: profile.birthday || '',
          gender: profile.gender || '',
          nationality: profile.nationality || '',
          civilStatus: profile.civilStatus || '',
          height: profile.height || '',
          weight: profile.weight || '',
          preferredLanguage: profile.preferredLanguage || '',

          campus: profile.campus || '',
          course: profile.course || '',
          yearGraduated: profile.yearGraduated || '',
          preferredWorkMode: profile.preferredWorkMode || '',
          technicalSkills: parseSkills(profile.technicalSkills),
          softSkills: parseSkills(profile.softSkills),
          whatHaveYouDone: profile.whatHaveYouDone || '',
          howSoonCanYouStart: profile.howSoonCanYouStart || '',
          employmentType: profile.employmentType || '',
          educationalAttainment: profile.educationalAttainment || '',
          willingToRelocate: profile.willingToRelocate || '',
          studyField: profile.studyField || profile.course || '',

          certifications: normalizeProfileList(profile.certifications),
          projects: normalizeProfileList(profile.projects),
          seminars: normalizeProfileList(profile.seminars),
          awards: normalizeProfileList(profile.awards),
          affiliations: normalizeProfileList(profile.affiliations),
          cocurricular: normalizeProfileList(profile.cocurricular),
          references: normalizeProfileList(profile.references),

          educationEntries: Array.isArray(profile.educationEntries) ? profile.educationEntries : [],
          eduLevel: '',
          eduCampus: '',
          eduCourse: '',
          eduStudyField: '',
          eduEducationalAttainment: '',
          eduStartYear: '',
          eduEndYear: '',
        };

        syncDrafts(nextData);
        setUserData(user);
        setVerificationDocs(normalizeVerificationDocs(profile.verificationDocs || {}));
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load profile. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkExperiences = async () => {
    try {
      setWorkExperienceLoading(true);
      const token = localStorage.getItem('token');

      const response = await axios.get(`${API_BASE}/auth/work-experiences`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data?.success) {
        setWorkExperiences(Array.isArray(response.data.workExperiences) ? response.data.workExperiences : []);
      }
    } catch (err) {
      console.error(err);
      setWorkExperiences([]);
    } finally {
      setWorkExperienceLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchWorkExperiences();
  }, []);

  const openEmailUpdateModal = () => {
    setEmailUpdateForm({ newEmail: '', currentPassword: '', code: '' });
    setEmailUpdateStep('request');
    setEmailUpdateError('');
    setEmailUpdateModalOpen(true);
  };

  const closeEmailUpdateModal = () => {
    if (emailUpdateLoading) return;
    setEmailUpdateModalOpen(false);
    setEmailUpdateError('');
  };

  const handleEmailUpdateFormChange = (field, value) => {
    setEmailUpdateForm((prev) => ({ ...prev, [field]: value }));
    setEmailUpdateError('');
  };

  const handleRequestEmailUpdateCode = async (e) => {
    e.preventDefault();

    try {
      setEmailUpdateLoading(true);
      setEmailUpdateError('');

      const token = localStorage.getItem('token');
      await axios.post(
        `${API_BASE}/auth/settings/request-email-verification`,
        {
          newEmail: emailUpdateForm.newEmail,
          currentPassword: emailUpdateForm.currentPassword,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setEmailUpdateStep('verify');
      showSuccess('Verification Code Sent', 'Please check your new email address for the verification code.');
    } catch (err) {
      console.error(err);
      setEmailUpdateError(err.response?.data?.message || 'Failed to send verification code.');
    } finally {
      setEmailUpdateLoading(false);
    }
  };

  const handleResendEmailUpdateCode = async () => {
    try {
      setEmailUpdateLoading(true);
      setEmailUpdateError('');

      const token = localStorage.getItem('token');
      await axios.post(
        `${API_BASE}/auth/settings/resend-email-verification`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      showSuccess('Code Resent', 'A new verification code has been sent.');
    } catch (err) {
      console.error(err);
      setEmailUpdateError(err.response?.data?.message || 'Failed to resend verification code.');
    } finally {
      setEmailUpdateLoading(false);
    }
  };

  const handleVerifyEmailUpdateCode = async (e) => {
    e.preventDefault();

    try {
      setEmailUpdateLoading(true);
      setEmailUpdateError('');

      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_BASE}/auth/settings/verify-email`,
        { code: emailUpdateForm.code },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const updatedUser = response.data?.user;
      const nextEmail = updatedUser?.email || emailUpdateForm.newEmail;

      setFormData((prev) => ({ ...prev, email: nextEmail }));
      setDrafts((prev) => ({ ...prev, email: nextEmail }));

      if (updatedUser) {
        setUserData(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }

      setEmailUpdateModalOpen(false);
      showSuccess('Email Updated', 'Your email address has been updated successfully.');
    } catch (err) {
      console.error(err);
      setEmailUpdateError(err.response?.data?.message || 'Failed to verify email code.');
    } finally {
      setEmailUpdateLoading(false);
    }
  };

  const saveSection = async (sectionKey) => {
    try {
      setSavingSection(sectionKey);
      setError('');

      const token = localStorage.getItem('token');

      let payload = {};

      if (sectionKey === 'about') {
        payload = {
          jobSeekerProfile: {
            aboutMe: drafts.aboutMe,
          },
        };
      }

      if (sectionKey === 'basic') {
        payload = {
          firstName: drafts.firstName,
          middleName: drafts.middleName,
          lastName: drafts.lastName,
          extensionName: normalizeExtensionName(drafts.extensionName),
          jobSeekerProfile: {
            phoneNumber: drafts.phoneNumber,
            address: buildAddressString(drafts),
          },
        };
      }

      if (sectionKey === 'salary') {
        payload = {
          jobSeekerProfile: {
            minimumSalary: drafts.minimumSalary,
            maximumSalary: drafts.maximumSalary,
          },
        };
      }

      if (sectionKey === 'personal') {
        payload = {
          jobSeekerProfile: {
            birthday: drafts.birthday,
            gender: drafts.gender,
            nationality: drafts.nationality,
            civilStatus: drafts.civilStatus,
            height: drafts.height,
            weight: drafts.weight,
            preferredLanguage: drafts.preferredLanguage,
          },
        };
      }

      if (sectionKey === 'career') {
        payload = {
          jobSeekerProfile: {
            preferredWorkMode: drafts.preferredWorkMode,
            technicalSkills: (drafts.technicalSkills || []).join(', '),
            softSkills: (drafts.softSkills || []).join(', '),
            whatHaveYouDone: drafts.whatHaveYouDone,
            howSoonCanYouStart: drafts.howSoonCanYouStart,
            employmentType: drafts.employmentType,
            educationalAttainment: drafts.educationalAttainment,
            willingToRelocate: drafts.willingToRelocate,
            studyField: drafts.studyField,
            minimumSalary: drafts.minimumSalary,
            maximumSalary: drafts.maximumSalary,
          },
        };
      }

      if (sectionKey === 'education') {
        if (
          !drafts.eduLevel ||
          !drafts.eduCampus ||
          !drafts.eduCourse ||
          !drafts.eduStartYear ||
          !drafts.eduEndYear
        ) {
          setError('Please complete all education fields before saving.');
          setSavingSection('');
          return;
        }

        if (Number(drafts.eduStartYear) > Number(drafts.eduEndYear)) {
          setError('Start year cannot be later than year graduated.');
          setSavingSection('');
          return;
        }

        const nextEducationEntries = [
          ...(Array.isArray(formData.educationEntries) ? formData.educationEntries : []),
          {
            level: drafts.eduLevel,
            campus: drafts.eduCampus,
            course: drafts.eduCourse,
            startYear: drafts.eduStartYear,
            endYear: drafts.eduEndYear,
            yearGraduated: drafts.eduEndYear,
          },
        ];

        payload = {
          jobSeekerProfile: {
            educationEntries: nextEducationEntries,
          },
        };
      }

      if (MORE_PROFILE_TAB_KEYS.includes(sectionKey)) {
        const allowedFields = (MORE_PROFILE_SECTIONS[sectionKey]?.fields || []).map((field) => field.key);
        const nextItems = (Array.isArray(drafts[sectionKey]) ? drafts[sectionKey] : [])
          .map((item) => {
            const cleaned = {};
            allowedFields.forEach((fieldKey) => {
              cleaned[fieldKey] = String(item?.[fieldKey] || '').trim();
            });
            return cleaned;
          })
          .filter((item) => allowedFields.some((fieldKey) => item[fieldKey]));

        payload = {
          jobSeekerProfile: {
            [sectionKey]: nextItems,
          },
        };
      }

      const response = await axios.put(`${API_BASE}/auth/update-profile`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.data?.success) {
        if (sectionKey === 'education') {
          const nextEducationEntries =
            response.data.user?.jobSeekerProfile?.educationEntries ||
            payload.jobSeekerProfile?.educationEntries ||
            [];

          const nextFormData = {
            ...formData,
            educationEntries: nextEducationEntries,
          };

          const nextDrafts = resetEducationDraftFields({
            ...drafts,
            educationEntries: nextEducationEntries,
          });

          setFormData(nextFormData);
          setDrafts(nextDrafts);
        } else if (MORE_PROFILE_TAB_KEYS.includes(sectionKey)) {
          const nextItems =
            response.data.user?.jobSeekerProfile?.[sectionKey] ||
            payload.jobSeekerProfile?.[sectionKey] ||
            [];

          setFormData((prev) => ({ ...prev, [sectionKey]: nextItems }));
          setDrafts((prev) => ({ ...prev, [sectionKey]: nextItems }));
        } else if (sectionKey === 'basic') {
          const combinedAddress = buildAddressString(drafts);
          setFormData((prev) => ({
            ...prev,
            ...drafts,
            address: combinedAddress,
          }));
        } else {
          setFormData((prev) => ({ ...prev, ...drafts }));
        }

        setEditing((prev) => ({ ...prev, [sectionKey]: false }));

        if (response.data.user) {
          setUserData(response.data.user);
          localStorage.setItem('user', JSON.stringify(response.data.user));
        }

        showSuccess('Saved Successfully', 'Your profile section has been updated.');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to save changes.');
    } finally {
      setSavingSection('');
    }
  };

  const cancelEdit = (sectionKey) => {
    if (sectionKey === 'education') {
      setDrafts(resetEducationDraftFields(formData));
      setEditing((prev) => ({ ...prev, [sectionKey]: false }));
      return;
    }

    setDrafts(formData);
    setEditing((prev) => ({ ...prev, [sectionKey]: false }));
  };

  const startEditingProfileList = (sectionKey) => {
    setDrafts((prev) => ({
      ...prev,
      [sectionKey]: Array.isArray(formData[sectionKey]) ? formData[sectionKey] : [],
    }));
    setEditing((prev) => ({ ...prev, [sectionKey]: true }));
  };

  const addProfileListItem = (sectionKey) => {
    setDrafts((prev) => ({
      ...prev,
      [sectionKey]: [
        ...(Array.isArray(prev[sectionKey]) ? prev[sectionKey] : []),
        createEmptyProfileEntry(sectionKey),
      ],
    }));
  };

  const removeProfileListItem = (sectionKey, index) => {
    setDrafts((prev) => ({
      ...prev,
      [sectionKey]: (Array.isArray(prev[sectionKey]) ? prev[sectionKey] : []).filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const updateProfileListItem = (sectionKey, index, field, value) => {
    setDrafts((prev) => ({
      ...prev,
      [sectionKey]: (Array.isArray(prev[sectionKey]) ? prev[sectionKey] : []).map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const handleProfileImageClick = () => {
    profileImageInputRef.current?.click();
  };

  const handleProfileImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Please upload a JPG, PNG, or WEBP image only.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Profile image must be less than 5MB.');
      return;
    }

    try {
      setProfileImageUploading(true);
      const token = localStorage.getItem('token');
      const fd = new FormData();
      fd.append('profileImage', file);

      const response = await axios.post(`${API_BASE}/auth/upload-profile-image`, fd, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data?.success) {
        const updatedUser = response.data.user;
        setUserData(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        showSuccess('Profile Photo Updated', 'Your profile photo has been updated successfully.');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to upload profile photo.');
    } finally {
      setProfileImageUploading(false);
    }
  };

  const handleVerificationUpload = async (docType, file) => {
    if (!file) return;

    const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      setDocErrors((prev) => ({ ...prev, [docType]: 'Accepted formats: PDF, JPG, PNG' }));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setDocErrors((prev) => ({ ...prev, [docType]: 'File size limit is 5MB' }));
      return;
    }

    try {
      setUploadingDocs((prev) => ({ ...prev, [docType]: true }));
      setDocErrors((prev) => ({ ...prev, [docType]: '' }));

      const token = localStorage.getItem('token');
      const fd = new FormData();
      fd.append('file', file);

      const response = await axios.post(`${API_BASE}/auth/upload-alumni-verification/${docType}`, fd, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data?.success) {
        setVerificationDocs((prev) => ({
          ...prev,
          [docType]: {
            status: 'pending',
            url: response.data.url,
            filename: file.name,
            fileSize: file.size,
            uploadedAt: new Date().toISOString(),
          },
        }));
        showSuccess('Document Uploaded', 'Your credential has been uploaded successfully.');
      }
    } catch (err) {
      console.error(err);
      setDocErrors((prev) => ({
        ...prev,
        [docType]: err.response?.data?.message || 'Failed to upload document.',
      }));
    } finally {
      setUploadingDocs((prev) => ({ ...prev, [docType]: false }));
    }
  };

  const addSkill = (type, value) => {
    const clean = String(value || '').trim();
    if (!clean) return;

    if (type === 'technical') {
      const exists = drafts.technicalSkills.some((s) => s.toLowerCase() === clean.toLowerCase());
      if (exists) return;
      setDrafts((prev) => ({ ...prev, technicalSkills: [...prev.technicalSkills, clean] }));
    }

    if (type === 'soft') {
      const exists = drafts.softSkills.some((s) => s.toLowerCase() === clean.toLowerCase());
      if (exists) return;
      setDrafts((prev) => ({ ...prev, softSkills: [...prev.softSkills, clean] }));
    }
  };

  const removeSkill = (type, value) => {
    if (type === 'technical') {
      setDrafts((prev) => ({
        ...prev,
        technicalSkills: prev.technicalSkills.filter((s) => s !== value),
      }));
    }

    if (type === 'soft') {
      setDrafts((prev) => ({
        ...prev,
        softSkills: prev.softSkills.filter((s) => s !== value),
      }));
    }
  };

  const handleWorkExperienceFormChange = (field, value) => {
    setWorkExperienceForm((prev) => {
      if (field === 'isPresent') {
        return {
          ...prev,
          isPresent: value,
          endDate: value ? '' : prev.endDate,
        };
      }

      return {
        ...prev,
        [field]: value,
      };
    });
  };

  const openAddWorkExperienceModal = () => {
    setEditingWorkExperienceId('');
    setWorkExperienceModalMode('add');
    setWorkExperienceForm(createEmptyWorkExperienceForm());
    setWorkExperienceModalOpen(true);
  };

  const openEditWorkExperienceModal = (item) => {
    setEditingWorkExperienceId(item?._id || item?.id || '');
    setWorkExperienceModalMode('edit');
    setWorkExperienceForm({
      companyName: item?.companyName || '',
      positionTitle: item?.positionTitle || '',
      startDate: item?.startDate ? String(item.startDate).slice(0, 10) : '',
      endDate: item?.endDate ? String(item.endDate).slice(0, 10) : '',
      isPresent: Boolean(item?.isPresent),
      description: item?.description || '',
    });
    setWorkExperienceModalOpen(true);
  };

  const closeWorkExperienceModal = () => {
    if (savingWorkExperience) return;
    setWorkExperienceModalOpen(false);
    setEditingWorkExperienceId('');
    setWorkExperienceModalMode('add');
    setWorkExperienceForm(createEmptyWorkExperienceForm());
  };

  const handleSaveWorkExperience = async () => {
    try {
      setError('');

      if (!workExperienceForm.companyName.trim()) {
        setError('Company / Organization name is required.');
        return;
      }

      if (!workExperienceForm.positionTitle.trim()) {
        setError('Position / Role title is required.');
        return;
      }

      if (!workExperienceForm.startDate) {
        setError('Start date is required.');
        return;
      }

      if (!workExperienceForm.isPresent && !workExperienceForm.endDate) {
        setError('End date is required unless the role is marked as Present.');
        return;
      }

      if (
        workExperienceForm.startDate &&
        workExperienceForm.endDate &&
        !workExperienceForm.isPresent &&
        new Date(workExperienceForm.startDate) > new Date(workExperienceForm.endDate)
      ) {
        setError('Start date cannot be later than end date.');
        return;
      }

      setSavingWorkExperience(true);
      const token = localStorage.getItem('token');

      const payload = {
        companyName: workExperienceForm.companyName.trim(),
        positionTitle: workExperienceForm.positionTitle.trim(),
        startDate: workExperienceForm.startDate,
        endDate: workExperienceForm.isPresent ? null : workExperienceForm.endDate,
        isPresent: Boolean(workExperienceForm.isPresent),
        description: workExperienceForm.description.trim(),
      };

      if (workExperienceModalMode === 'edit' && editingWorkExperienceId) {
        await axios.put(`${API_BASE}/auth/work-experiences/${editingWorkExperienceId}`, payload, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        showSuccess('Updated Successfully', 'Work experience has been updated.');
      } else {
        await axios.post(`${API_BASE}/auth/work-experiences`, payload, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        showSuccess('Added Successfully', 'Work experience has been added.');
      }

      closeWorkExperienceModal();
      fetchWorkExperiences();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to save work experience.');
    } finally {
      setSavingWorkExperience(false);
    }
  };

  const handleDeleteWorkExperience = (item) => {
    const workId = item?._id || item?.id;
    if (!workId) return;

    setConfirmState({
      open: true,
      title: 'Delete Work Experience',
      message: 'Are you sure you want to delete this work experience entry?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      tone: 'danger',
      onConfirmAction: async () => {
        try {
          const token = localStorage.getItem('token');
          await axios.delete(`${API_BASE}/auth/work-experiences/${workId}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          setConfirmState({
            open: false,
            title: '',
            message: '',
            confirmText: 'Yes',
            cancelText: 'Cancel',
            tone: 'primary',
            onConfirmAction: null,
          });

          showSuccess('Deleted Successfully', 'Work experience has been removed.');
          fetchWorkExperiences();
        } catch (err) {
          console.error(err);
          setError(err.response?.data?.message || 'Failed to delete work experience.');
          setConfirmState({
            open: false,
            title: '',
            message: '',
            confirmText: 'Yes',
            cancelText: 'Cancel',
            tone: 'primary',
            onConfirmAction: null,
          });
        }
      },
    });
  };


  useEffect(() => {
    const filledSections = MORE_PROFILE_TAB_KEYS.filter((key) => Array.isArray(formData[key]) && formData[key].length > 0);
    if (filledSections.length === 0) return;
    setAddedMoreSections((prev) => Array.from(new Set([...prev, ...filledSections])));
  }, [formData]);

  const handleAddMoreSection = (sectionKey) => {
    setAddedMoreSections((prev) => (prev.includes(sectionKey) ? prev : [...prev, sectionKey]));
    setActiveTab(sectionKey);
    setAddSectionsModalOpen(false);
  };

 const personalDisplayItems = [
  { label: 'Birthday', value: formData.birthday },
  { label: 'Civil Status', value: formData.civilStatus },
  { label: 'Height', value: formatDisplayHeight(formData.height) },
  { label: 'Weight', value: formatDisplayWeight(formData.weight) },
  { label: 'Nationality', value: formData.nationality },
  { label: 'Preferred Language', value: formData.preferredLanguage },
  { label: 'Gender', value: formData.gender },
];

  const careerDisplayItems = [
    { label: 'Preferred Work Mode', value: formData.preferredWorkMode },
    { label: 'Employment Type', value: formData.employmentType },
    { label: 'Educational Attainment', value: formData.educationalAttainment },
    { label: 'Study Field', value: formData.studyField || formData.course },
    { label: 'Willing to Relocate', value: formData.willingToRelocate },
    { label: 'How Soon Can You Start', value: formData.howSoonCanYouStart },
    { label: 'Work Experience ', value: formData.whatHaveYouDone },
  ];

  const documentConfig = [
    { type: 'cv', title: 'CV / Resume', icon: <FaFileAlt className="text-sm" /> },
    { type: 'validId', title: 'Valid ID', icon: <FaShieldAlt className="text-sm" /> },
    { type: 'diploma', title: 'Diploma', icon: <FaFileAlt className="text-sm" /> },
    { type: 'tin', title: 'TIN', icon: <FaFileAlt className="text-sm" /> },
    { type: 'sss', title: 'SSS', icon: <FaFileAlt className="text-sm" /> },
    { type: 'tor', title: 'TOR (Transcript of Records)', icon: <FaFileAlt className="text-sm" /> },
    { type: 'philhealth', title: 'PhilHealth', icon: <FaFileAlt className="text-sm" /> },
    { type: 'pagibig', title: 'Pag-IBIG', icon: <FaFileAlt className="text-sm" /> },
  ];

  const uploadedRequiredCount = REQUIRED_DOC_TYPES.filter((key) => verificationDocs[key]?.url).length;

  if (loading) {
    return (
      <JobSeekerLayout>
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="animate-pulse rounded-[24px] bg-white border border-gray-200 overflow-hidden">
            <div className="h-40 bg-gray-200" />
            <div className="h-[900px] bg-gray-100" />
          </div>
        </div>
      </JobSeekerLayout>
    );
  }

  return (
    <JobSeekerLayout>
      <SuccessPopup open={successPopup.open} title={successPopup.title} message={successPopup.message} onClose={closeSuccess} />

      <ConfirmModal
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        tone={confirmState.tone}
        onCancel={() =>
          setConfirmState({
            open: false,
            title: '',
            message: '',
            confirmText: 'Yes',
            cancelText: 'Cancel',
            tone: 'primary',
            onConfirmAction: null,
          })
        }
        onConfirm={() => confirmState.onConfirmAction?.()}
      />

      <ResumePasswordModal
        open={downloadPasswordModalOpen}
        mode={resumePasswordAction}
        password={downloadPassword}
        error={downloadPasswordError}
        verifying={downloadPasswordVerifying}
        onChange={(value) => {
          setDownloadPassword(value);
          setDownloadPasswordError('');
        }}
        onClose={closeDownloadPasswordModal}
        onSubmit={handleDownloadPasswordSubmit}
      />

      <WorkExperienceModal
        open={workExperienceModalOpen}
        mode={workExperienceModalMode}
        form={workExperienceForm}
        onChange={handleWorkExperienceFormChange}
        onClose={closeWorkExperienceModal}
        onSave={handleSaveWorkExperience}
        saving={savingWorkExperience}
      />

      <BasicInfoModal
        open={editing.basic}
        drafts={drafts}
        fullName={fullName}
        userData={userData}
        profileImageUploading={profileImageUploading}
        profileImageInputRef={profileImageInputRef}
        onImageChange={handleProfileImageChange}
        onImageClick={handleProfileImageClick}
        onChange={handleBasicInfoChange}
        onClose={() => cancelEdit('basic')}
        onSave={() => saveSection('basic')}
        saving={savingSection === 'basic'}
        regionOptions={regionOptions}
        provinceOptions={provinceOptions}
        cityOptions={cityOptions}
        onEmailUpdate={openEmailUpdateModal}
      />

      <EmailUpdateModal
        open={emailUpdateModalOpen}
        step={emailUpdateStep}
        form={emailUpdateForm}
        error={emailUpdateError}
        loading={emailUpdateLoading}
        onChange={handleEmailUpdateFormChange}
        onClose={closeEmailUpdateModal}
        onRequestCode={handleRequestEmailUpdateCode}
        onVerifyCode={handleVerifyEmailUpdateCode}
        onResendCode={handleResendEmailUpdateCode}
      />


      <AddSectionsModal
        open={addSectionsModalOpen}
        addedSections={addedMoreSections}
        onAdd={handleAddMoreSection}
        onClose={() => setAddSectionsModalOpen(false)}
      />

      <div className={`min-h-[100dvh] h-auto pt-2 bg-gray-50 overflow-x-hidden overflow-y-visible ${isApplyFlow ? 'pb-28 sm:pb-32' : 'pb-6'}`}>
        <div className="max-w-6xl mx-auto px-0 sm:px-6">
          {error ? <Alert type="error" title="Error" message={error} onClose={() => setError('')} /> : null}

          {isApplyFlow && applyJob ? (
            <div className="mb-4 rounded-2xl border border-[#d8e2ee] bg-[#f7faff] px-4 py-3 text-sm text-black/65 shadow-sm">
              Applying for <span className="font-semibold text-black">{applyJob.title || 'Job Title'}</span>
            </div>
          ) : null}

          <div className="bg-white border border-[#d7dbe3] rounded-[18px] sm:rounded-[24px] overflow-hidden sm:overflow-visible shadow-sm">
            <div className="bg-gradient-to-r from-[#4a9fc3] via-[#336eb2] to-[#0f3e9c] min-h-[126px] sm:min-h-[106px] px-4 sm:px-8 relative">
              <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex flex-wrap justify-end gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={handlePreviewResume}
                  className="h-9 sm:h-10 px-3 sm:px-4 rounded-full bg-white text-gray-700 border border-gray-200 text-xs sm:text-sm font-semibold inline-flex items-center gap-2 hover:bg-gray-50"
                >
                  <FaEye className="text-xs" />
                  Preview
                </button>

                <button
                  type="button"
                  onClick={handleDownloadResume}
                  className="h-9 sm:h-10 px-3 sm:px-4 rounded-full text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-2"
                  style={{ backgroundColor: '#0f5fe0' }}
                >
                  <FaDownload className="text-xs" />
                  Download CV
                </button>
              </div>
            </div>

            <div className="px-4 sm:px-8 pt-0 pb-5">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div className="flex flex-col sm:flex-row gap-4 flex-1 min-w-0">
                  <div className="relative -mt-12 sm:-mt-11 shrink-0 self-center sm:self-auto">
                    <div className="w-[104px] h-[104px] sm:w-[116px] sm:h-[116px] rounded-full border-[5px] border-white bg-white overflow-hidden shadow-md">
                      {userData?.profileImage ? (
                        <img src={userData.profileImage} alt={fullName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-blue-100 text-[#2e66a6] font-bold text-4xl flex items-center justify-center">
                          {(fullName || 'U').charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-1 sm:pt-5 flex-1 min-w-0 text-center sm:text-left">
                    <div className="relative flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 min-w-0">
                      <div className="min-w-0">
                        <h1 className="text-[24px] sm:text-[31px] font-bold text-[#1f2937] leading-tight break-words">
                          {fullName || 'Your Name'}
                        </h1>

                       
                       <div className="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-3 text-gray-700 min-w-0">
  <div className="inline-flex items-center gap-2 text-[13px] sm:text-[15px] font-medium min-w-0 max-w-full">
    <FaGraduationCap className="text-gray-500" />
    <span className="break-words">{courseText}</span>
  </div>

  <div className="inline-flex items-center gap-2 text-[13px] sm:text-[15px] font-medium min-w-0 max-w-full">
    <FaUniversity className="text-gray-500" />
    <span className="break-words">{formData.campus || 'Campus not set'}</span>
  </div>

  <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold tracking-wide bg-[#dfe8ff] text-[#4766c2]">
    {classOfText}
  </span>
</div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setDrafts(formData);
                          setEditing((prev) => ({ ...prev, basic: true }));
                        }}
                        className="absolute right-0 top-1 sm:top-0 w-11 h-11 rounded-full bg-white border border-gray-200 shadow-md flex items-center justify-center text-gray-700 hover:bg-gray-50"
                        aria-label="Edit basic information"
                      >
                        <FaPen className="text-sm" />
                      </button>
                    </div>

                    <div className="mt-3 mx-auto sm:mx-0 flex w-full max-w-[320px] flex-col items-stretch gap-2 text-sm text-gray-500 min-w-0 text-left sm:max-w-none sm:flex-row sm:flex-wrap sm:items-start sm:gap-x-6">
                      <div className="flex w-full items-start gap-2 min-w-0 sm:w-auto sm:max-w-full">
                        <FaEnvelope className="mt-0.5 text-gray-400 shrink-0" />
                        <span className="min-w-0 flex-1 break-all text-left leading-5">{formData.email || 'Not provided'}</span>
                      </div>

                      <div className="flex w-full items-start gap-2 min-w-0 sm:w-auto sm:max-w-full">
                        <FaPhoneAlt className="mt-0.5 text-gray-400 shrink-0" />
                        <span className="min-w-0 flex-1 break-all text-left leading-5">{formData.phoneNumber || 'Not provided'}</span>
                      </div>

                      <div className="flex w-full items-start gap-2 min-w-0 sm:w-auto sm:max-w-[360px]">
                        <FaMapMarkerAlt className="mt-0.5 text-gray-400 shrink-0" />
                        <span className="min-w-0 flex-1 break-words text-left leading-5">
                          {displayedAddress || 'Address not provided'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-[#d7dbe3]" />

            <div>
              <SectionHeader title="Objective" editLabel="Edit Objective" onEdit={() => setEditing((prev) => ({ ...prev, about: !prev.about }))} />
              <div className="px-6 sm:px-10 pb-6">
                {!editing.about ? (
                  <div className="rounded-[20px] border border-gray-200 bg-[#fcfcfd] p-5 sm:p-6">
                    <p className={`text-[16px] leading-8 ${formData.aboutMe ? 'text-gray-600' : 'text-gray-400'}`}>
                      {formData.aboutMe || 'Add a short professional summary about yourself.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 rounded-[20px] border border-gray-200 bg-[#fcfcfd] p-5 sm:p-6">
                    <TextArea
                      label="Objective"
                      rows={5}
                      value={drafts.aboutMe}
                      onChange={(e) => handleLocalChange('aboutMe', e.target.value)}
                      placeholder="Write a short professional introduction..."
                    />
                    <div className="flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => cancelEdit('about')}
                        className="px-4 h-11 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => saveSection('about')}
                        disabled={savingSection === 'about'}
                        className="px-5 h-11 rounded-xl text-white font-semibold disabled:opacity-70"
                        style={{ backgroundColor: COLORS.primary }}
                      >
                        {savingSection === 'about' ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-[#d7dbe3]" />

            <div>
              <div className="px-6 sm:px-10 py-5 flex items-center justify-between gap-3">
                <h2 className="text-[18px] sm:text-[20px] font-bold text-gray-900">WORK EXPERIENCE</h2>
              </div>
              <div className="px-6 sm:px-10 pb-6">
                <div className="rounded-[20px] border border-gray-200 bg-[#fcfcfd] p-5 sm:p-6">
                  {workExperienceLoading ? (
                    <div className="flex items-center justify-center py-10">
                      <Spinner />
                    </div>
                  ) : workExperiences.length === 0 ? (
                    <div className="rounded-[18px] border border-dashed border-gray-300 bg-white px-6 py-10 text-center">
                      <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
                        <FaBriefcase className="text-xl" />
                      </div>
                      <div className="text-[18px] font-bold text-gray-900">No work experience added yet</div>
                      <div className="text-sm text-gray-500 mt-2">
                        Add your work experience so employers can better see your background.
                      </div>
                      <button
                        type="button"
                        onClick={openAddWorkExperienceModal}
                        className="mt-5 h-11 px-5 rounded-xl text-white font-semibold inline-flex items-center gap-2"
                        style={{ backgroundColor: COLORS.primary }}
                      >
                        <FaPlus className="text-xs" />
                        Add Work Experience
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {workExperiences.map((item, index) => (
                        <div
                          key={item._id || item.id || `${item.companyName}-${item.positionTitle}-${index}`}
                          className="rounded-[18px] border border-gray-200 bg-white px-5 py-5"
                        >
                          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                            <div className="min-w-0">
                              <div className="text-[24px] font-bold text-gray-900 leading-tight">
                                {item.companyName || 'Company not provided'}
                              </div>
                              <div className="text-[17px] text-gray-600 font-medium mt-2">
                                {item.positionTitle || 'Position not provided'}
                              </div>
                            </div>

                            <div className="flex flex-col items-start md:items-end gap-3 shrink-0">
                              <div className="text-sm text-gray-400 italic">
                                {getWorkExperienceDateRange(item)}
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => openEditWorkExperienceModal(item)}
                                  className="h-10 px-3 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 inline-flex items-center gap-2"
                                >
                                  <FaPen className="text-xs" />
                                  <span className="text-sm font-semibold">Edit</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteWorkExperience(item)}
                                  className="h-10 px-3 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 inline-flex items-center gap-2"
                                >
                                  <FaTrash className="text-xs" />
                                  <span className="text-sm font-semibold">Delete</span>
                                </button>
                              </div>
                            </div>
                          </div>

                          <div className="text-[15px] leading-7 text-gray-600 mt-4">
                            {item.description || 'No description provided.'}
                          </div>
                        </div>
                      ))}

                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={openAddWorkExperienceModal}
                          className="h-11 px-5 rounded-xl text-white font-semibold inline-flex items-center gap-2"
                          style={{ backgroundColor: COLORS.primary }}
                        >
                          <FaPlus className="text-xs" />
                          Add Another Work Experience
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t border-[#d7dbe3]" />

            <div className="relative z-50 w-full max-w-full px-4 sm:px-10 py-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-[22px] font-bold text-gray-900">Profile</h2>
                  <p className="text-sm text-gray-500 mt-1">Open each section below, edit your details, or add more sections.</p>
                </div>

                <button
                  type="button"
                  onClick={() => setAddSectionsModalOpen(true)}
                  className="h-11 px-5 rounded-xl border border-gray-200 bg-white text-gray-800 font-bold inline-flex items-center justify-center gap-2 hover:bg-gray-50"
                >
                  <FaPlus className="text-sm" />
                  Add Sections
                </button>
              </div>

              <div className="rounded-[18px] border border-gray-200 bg-white overflow-hidden">
                {[
                  { key: 'personal', label: 'Basic Information', actionLabel: 'EDIT' },
                  { key: 'about', label: 'Objective', actionLabel: formData.aboutMe ? 'EDIT' : 'ADD' },
                  { key: 'career', label: 'Availability & Preferences', actionLabel: 'ADD' },
                  { key: 'work', label: 'Work Experience', actionLabel: workExperiences.length ? 'EDIT' : 'ADD' },
                  { key: 'skills', label: 'Skills', actionLabel: 'ADD' },
                  { key: 'education', label: 'Education', actionLabel: hasEducationEntries ? 'EDIT' : 'ADD' },
                  { key: 'credentials', label: 'Credentials', actionLabel: '' },
                  ...addedMoreSections.map((key) => ({ key, label: MORE_PROFILE_SECTIONS[key]?.title || key, actionLabel: (formData[key] || []).length ? 'EDIT' : 'ADD' })),
                ].map((section) => {
                  const targetTab = section.key === 'about' ? 'about' : section.key === 'work' ? 'work' : section.key === 'skills' ? 'skills' : section.key;
                  const isOpen = activeTab === targetTab;

                  return (
                    <button
                      key={section.key}
                      type="button"
                      onClick={() => {
                        if (section.key === 'about') setActiveTab('about');
                        else if (section.key === 'work') setActiveTab('work');
                        else if (section.key === 'skills') setActiveTab('skills');
                        else setActiveTab(section.key);
                      }}
                      className={`w-full min-h-[50px] px-4 sm:px-6 border-b border-gray-200 last:border-b-0 flex items-center justify-between gap-4 text-left transition ${isOpen ? 'bg-[#f7faff]' : 'bg-white hover:bg-gray-50'}`}
                    >
                      <span className="inline-flex items-center gap-3 min-w-0">
                        <span className="text-gray-500 text-xs">{isOpen ? '⌃' : '⌄'}</span>
                        <span className="text-[15px] sm:text-[16px] font-bold uppercase tracking-wide text-gray-900 truncate">{section.label}</span>
                      </span>
                      {section.actionLabel ? <span className="text-[#0b73ff] text-sm font-bold shrink-0">{section.actionLabel}</span> : null}
                    </button>
                  );
                })}
              </div>
            </div>

            {activeTab === 'personal' && (
              <div id="panel-personal" role="tabpanel">
                <SectionHeader title="Personal Information" editLabel="Edit personal information" onEdit={() => setEditing((prev) => ({ ...prev, personal: !prev.personal }))} />
                <div className="px-4 sm:px-10 pb-8">
                  {!editing.personal ? (
                    <ReadSectionCard items={personalDisplayItems} />
                  ) : (
                    <div className="space-y-5 rounded-[20px] border border-gray-200 bg-[#fcfcfd] p-5 sm:p-6">
                      <div className="grid md:grid-cols-2 gap-6">
                        <Input label="Birthday" type="date" value={drafts.birthday} onChange={(e) => handleLocalChange('birthday', e.target.value)} />
                        <Input label="Height" value={drafts.height} onChange={(e) => handleLocalChange('height', e.target.value)} placeholder={`e.g. 5'7" (170 cm)`} />
                        <Input label="Nationality" value={drafts.nationality} onChange={(e) => handleLocalChange('nationality', e.target.value)} placeholder="e.g. Filipino" />
                        <Select
                          label="Gender"
                          value={drafts.gender}
                          onChange={(e) => handleLocalChange('gender', e.target.value)}
                          options={['Male', 'Female', 'Prefer not to say']}
                        />
                        <Select
                          label="Civil Status"
                          value={drafts.civilStatus}
                          onChange={(e) => handleLocalChange('civilStatus', e.target.value)}
                          options={['Single', 'Married', 'Separated', 'Widowed']}
                        />
                        <Input label="Weight" value={drafts.weight} onChange={(e) => handleLocalChange('weight', e.target.value)} placeholder="e.g. 65 kg" />
                        <Input label="Preferred Language" value={drafts.preferredLanguage} onChange={(e) => handleLocalChange('preferredLanguage', e.target.value)} placeholder="e.g. English, Filipino" />
                      </div>

                      <div className="flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => cancelEdit('personal')}
                          className="px-4 h-11 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => saveSection('personal')}
                          disabled={savingSection === 'personal'}
                          className="px-5 h-11 rounded-xl text-white font-semibold disabled:opacity-70"
                          style={{ backgroundColor: COLORS.primary }}
                        >
                          {savingSection === 'personal' ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'career' && (
              <div id="panel-career" role="tabpanel">
                <SectionHeader title="Career Profile" editLabel="Edit career profile" onEdit={() => setEditing((prev) => ({ ...prev, career: !prev.career }))} />
                <div className="px-4 sm:px-10 pb-8">
                  {!editing.career ? (
                    <div className="space-y-6 rounded-[20px] border border-gray-200 bg-[#fcfcfd] p-5 sm:p-6">
                      <div className="rounded-[18px] border border-gray-200 bg-white p-5 sm:p-6">
                        <div className="text-[12px] tracking-[0.16em] uppercase font-bold text-gray-400 mb-4">
                          Salary Expectation
                        </div>

                        <div className="grid md:grid-cols-2 gap-8">
                          <div>
                            <div className="text-[10px] sm:text-[11px] tracking-[0.16em] uppercase font-bold text-gray-400 mb-2">Minimum Salary (PHP)</div>
                            <div className={`text-[36px] font-bold ${formData.minimumSalary ? 'text-gray-900' : 'text-gray-300'}`}>
                              {formData.minimumSalary ? `₱ ${Number(formData.minimumSalary).toLocaleString()}` : 'Not set'}
                            </div>
                            <div className="text-sm text-gray-400 mt-1">Philippine Peso (PHP) only</div>
                          </div>

                          <div>
                            <div className="text-[10px] sm:text-[11px] tracking-[0.16em] uppercase font-bold text-gray-400 mb-2">Maximum Salary (PHP)</div>
                            <div className={`text-[36px] font-bold ${formData.maximumSalary ? 'text-gray-900' : 'text-gray-300'}`}>
                              {formData.maximumSalary ? `₱ ${Number(formData.maximumSalary).toLocaleString()}` : 'Not set'}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] sm:text-[11px] tracking-[0.16em] uppercase font-bold text-gray-400 mb-3">Technical Skills</div>
                        <div className="flex flex-wrap gap-2">
                          {(formData.technicalSkills || []).length > 0 ? (
                            (formData.technicalSkills || []).map((skill) => <TinyChip key={`tech-${skill}`}>{skill}</TinyChip>)
                          ) : (
                            <span className="text-gray-400">Not provided</span>
                          )}
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] sm:text-[11px] tracking-[0.16em] uppercase font-bold text-gray-400 mb-3">Soft Skills</div>
                        <div className="flex flex-wrap gap-2">
                          {(formData.softSkills || []).length > 0 ? (
                            (formData.softSkills || []).map((skill) => <TinyChip key={`soft-${skill}`}>{skill}</TinyChip>)
                          ) : (
                            <span className="text-gray-400">Not provided</span>
                          )}
                        </div>
                      </div>

                      <ReadSectionCard items={careerDisplayItems} />
                    </div>
                  ) : (
                    <div className="space-y-6 rounded-[20px] border border-gray-200 bg-[#fcfcfd] p-5 sm:p-6">
                      <div className="rounded-2xl border border-gray-200 p-4 bg-white">
                        <div className="text-[11px] tracking-[0.16em] uppercase font-bold text-gray-400 mb-4">Salary Expectation</div>
                        <div className="grid md:grid-cols-2 gap-6">
                          <Input
                            label="Minimum Salary (PHP)"
                            type="number"
                            value={drafts.minimumSalary}
                            onChange={(e) => handleLocalChange('minimumSalary', e.target.value)}
                            placeholder="25000"
                          />
                          <Input
                            label="Maximum Salary (PHP)"
                            type="number"
                            value={drafts.maximumSalary}
                            onChange={(e) => handleLocalChange('maximumSalary', e.target.value)}
                            placeholder="40000"
                          />
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-6">
                        <Select
                          label="Preferred Work Mode"
                          value={drafts.preferredWorkMode}
                          onChange={(e) => handleLocalChange('preferredWorkMode', e.target.value)}
                          options={['On-site', 'Blended', 'Remote', 'Work from home']}
                        />
                        <Select
                          label="Employment Type"
                          value={drafts.employmentType}
                          onChange={(e) => handleLocalChange('employmentType', e.target.value)}
                          options={['Full time', 'Part time', 'Contractual', 'Permanent']}
                        />
                        <Select
                          label="Educational Attainment"
                          value={drafts.educationalAttainment}
                          onChange={(e) => handleLocalChange('educationalAttainment', e.target.value)}
                          options={["Bachelor’s / College degree graduate's", 'Master’s degree', 'Doctorate', 'Vocational / Trade Course', 'Senior High Diploma']}
                        />
                        <Input
                          label="Study Field"
                          value={drafts.studyField}
                          onChange={(e) => handleLocalChange('studyField', e.target.value)}
                          placeholder="e.g. Information Technology"
                        />
                        <Select
                          label="Willing to Relocate"
                          value={drafts.willingToRelocate}
                          onChange={(e) => handleLocalChange('willingToRelocate', e.target.value)}
                          options={['Yes — willing to relocate', 'No — position is fixed location', 'Open to relocation if necessary']}
                        />
                        <Select
                          label="How Soon Can You Start"
                          value={drafts.howSoonCanYouStart}
                          onChange={(e) => handleLocalChange('howSoonCanYouStart', e.target.value)}
                          options={['Ready to start', 'Within a few days', 'Within 1 week', 'Within 2 week', 'Within a month']}
                        />
                      </div>

                      <div className="grid lg:grid-cols-2 gap-6">
                        <div className="rounded-2xl border border-gray-200 p-4 bg-white">
                          <div className="text-[11px] tracking-[0.16em] uppercase font-bold text-gray-400 mb-3">Technical Skills</div>
                          <div className="flex gap-2">
                            <input
                              value={techInput}
                              onChange={(e) => setTechInput(e.target.value)}
                              placeholder="Search or type a skill"
                              className="flex-1 h-11 px-4 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                addSkill('technical', techInput);
                                setTechInput('');
                              }}
                              className="px-4 h-11 rounded-xl text-white font-semibold"
                              style={{ backgroundColor: COLORS.primary }}
                            >
                              Add
                            </button>
                          </div>

                          <div className="flex flex-wrap gap-2 mt-4">
                            {(drafts.technicalSkills || []).map((skill) => (
                              <span
                                key={skill}
                                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 border border-gray-200 text-xs font-semibold text-gray-700"
                              >
                                {skill}
                                <button type="button" aria-label={`Remove ${skill} technical skill`} onClick={() => removeSkill('technical', skill)}>
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>

                          <div className="flex flex-wrap gap-2 mt-4">
                            {techInput.trim()
                              ? techSuggestions
                                  .filter((skill) => !drafts.technicalSkills.includes(skill))
                                  .map((skill) => (
                                    <button
                                      key={skill}
                                      type="button"
                                      onClick={() => addSkill('technical', skill)}
                                      className="px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-xs font-semibold text-blue-700"
                                    >
                                      {skill}
                                    </button>
                                  ))
                              : null}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-gray-200 p-4 bg-white">
                          <div className="text-[11px] tracking-[0.16em] uppercase font-bold text-gray-400 mb-3">Soft Skills</div>
                          <div className="flex gap-2">
                            <input
                              value={softInput}
                              onChange={(e) => setSoftInput(e.target.value)}
                              placeholder="Search or type a skill"
                              className="flex-1 h-11 px-4 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                addSkill('soft', softInput);
                                setSoftInput('');
                              }}
                              className="px-4 h-11 rounded-xl text-white font-semibold"
                              style={{ backgroundColor: COLORS.primary }}
                            >
                              Add
                            </button>
                          </div>

                          <div className="flex flex-wrap gap-2 mt-4">
                            {(drafts.softSkills || []).map((skill) => (
                              <span
                                key={skill}
                                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 border border-gray-200 text-xs font-semibold text-gray-700"
                              >
                                {skill}
                                <button type="button" aria-label={`Remove ${skill} soft skill`} onClick={() => removeSkill('soft', skill)}>
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>

                          <div className="flex flex-wrap gap-2 mt-4">
                            {softInput.trim()
                              ? softSuggestions
                                  .filter((skill) => !drafts.softSkills.includes(skill))
                                  .map((skill) => (
                                    <button
                                      key={skill}
                                      type="button"
                                      onClick={() => addSkill('soft', skill)}
                                      className="px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-xs font-semibold text-blue-700"
                                    >
                                      {skill}
                                    </button>
                                  ))
                              : null}
                          </div>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-6">
                        <Select
                          label="What Have You Done?"
                          value={drafts.whatHaveYouDone}
                          onChange={(e) => handleLocalChange('whatHaveYouDone', e.target.value)}
                          options={['Internships / OJT', 'Freelance projects', 'Academic projects', "Volunteer work's", 'I have done something that is not listed here']}
                        />
                      </div>

                      <div className="flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => cancelEdit('career')}
                          className="px-4 h-11 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => saveSection('career')}
                          disabled={savingSection === 'career'}
                          className="px-5 h-11 rounded-xl text-white font-semibold disabled:opacity-70"
                          style={{ backgroundColor: COLORS.primary }}
                        >
                          {savingSection === 'career' ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'credentials' && (
              <div id="panel-credentials" role="tabpanel">
                <div className="px-6 sm:px-10 py-5 flex items-center justify-between gap-4 flex-wrap">
                  <h2 className="text-[18px] sm:text-[20px] font-bold text-black">Credentials</h2>
                  <div className="text-sm text-black/50">{uploadedRequiredCount}/{REQUIRED_DOC_TYPES.length} required uploaded</div>
                </div>

                <div className="px-4 sm:px-10 pb-8">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {documentConfig.map((doc) => (
                      <div key={doc.type}>
                        <CredentialItem
                          docType={doc.type}
                          title={doc.title}
                          icon={doc.icon}
                          uploaded={Boolean(verificationDocs[doc.type]?.url)}
                          fileName={verificationDocs[doc.type]?.filename}
                          fileUrl={verificationDocs[doc.type]?.url}
                          uploading={uploadingDocs[doc.type]}
                          popoverOpen={activeCredentialPopover === doc.type}
                          onOpen={() => setActiveCredentialPopover(doc.type)}
                          onClose={() => setActiveCredentialPopover('')}
                          onUpload={(file) => handleVerificationUpload(doc.type, file)}
                        />
                        {docErrors[doc.type] ? <div className="text-xs text-red-600 mt-2">{docErrors[doc.type]}</div> : null}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'education' && (
              <div id="panel-education" role="tabpanel">
                <div className="px-6 sm:px-10 py-5 flex items-center justify-between gap-3 flex-wrap">
                  <h2 className="text-[18px] sm:text-[20px] font-bold text-gray-900">Educational Background</h2>

                  {!editing.education ? (
                    <button
                      type="button"
                      onClick={() => {
                        setDrafts(resetEducationDraftFields(drafts));
                        setEditing((prev) => ({ ...prev, education: true }));
                      }}
                      className="h-11 px-5 rounded-xl text-white font-semibold"
                      style={{ backgroundColor: COLORS.primary }}
                    >
                      + Add Educational Background
                    </button>
                  ) : null}
                </div>

                <div className="px-6 sm:px-10 pb-8 space-y-6">
                  {!hasEducationEntries && !editing.education ? (
                    <div className="rounded-[20px] border border-dashed border-gray-300 bg-[#fcfcfd] p-8 sm:p-10 text-center">
                      <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
                        <FaGraduationCap className="text-xl" />
                      </div>
                      <div className="text-[18px] font-bold text-gray-900">No educational background added yet</div>
                      <div className="text-sm text-gray-500 mt-2">Click the button below to add your educational background.</div>

                      <button
                        type="button"
                        onClick={() => {
                          setDrafts(resetEducationDraftFields(drafts));
                          setEditing((prev) => ({ ...prev, education: true }));
                        }}
                        className="mt-5 h-11 px-5 rounded-xl text-white font-semibold"
                        style={{ backgroundColor: COLORS.primary }}
                      >
                        + Add Educational Background
                      </button>
                    </div>
                  ) : null}

                  {editing.education ? (
                    <div className="space-y-5 rounded-[20px] border border-gray-200 bg-[#fcfcfd] p-5 sm:p-6">
                      <div className="grid md:grid-cols-2 gap-6">
                        <Select
                          label="Education Level"
                          value={drafts.eduLevel}
                          onChange={(e) => handleLocalChange('eduLevel', e.target.value)}
                          options={EDUCATION_LEVEL_OPTIONS}
                          placeholder="Select education level"
                        />
                        <Select
                          label="Campus"
                          value={drafts.eduCampus}
                          onChange={(e) => handleLocalChange('eduCampus', e.target.value)}
                          options={CAMPUS_OPTIONS}
                          placeholder="Select campus"
                        />
                        <Select
                          label="Course"
                          value={drafts.eduCourse}
                          onChange={(e) => handleLocalChange('eduCourse', e.target.value)}
                          options={MAJOR_COURSE_OPTIONS}
                          placeholder="Select course"
                        />

                        <Select
                          label="Start Year"
                          value={drafts.eduStartYear}
                          onChange={(e) => handleLocalChange('eduStartYear', e.target.value)}
                          options={yearOptions}
                          placeholder="Select start year"
                        />
                        <Select
                          label="Year Graduated"
                          value={drafts.eduEndYear}
                          onChange={(e) => handleLocalChange('eduEndYear', e.target.value)}
                          options={yearOptions}
                          placeholder="Select year graduated"
                        />
                      </div>

                      <div className="flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => cancelEdit('education')}
                          className="px-4 h-11 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => saveSection('education')}
                          disabled={savingSection === 'education'}
                          className="px-5 h-11 rounded-xl text-white font-semibold disabled:opacity-70"
                          style={{ backgroundColor: COLORS.primary }}
                        >
                          {savingSection === 'education' ? 'Saving...' : 'Save Education'}
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {hasEducationEntries ? (
                    <div className="space-y-4">
                      {educationEntries.map((entry, index) => (
                        <div
                          key={`${entry.level || 'education'}-${entry.campus || 'campus'}-${entry.course || 'course'}-${index}`}
                          className="rounded-[20px] border border-gray-200 bg-[#fcfcfd] p-4 sm:p-5"
                        >
                          <div className="rounded-[18px] border border-gray-200 bg-white px-5 py-4 flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                              <FaUniversity />
                            </div>

                            <div className="min-w-0">
                              <div className="text-[12px] tracking-[0.16em] uppercase font-bold text-gray-400 mb-1">
                                {entry.level || 'Educational Background'}
                              </div>
                              <div className="text-[20px] font-bold text-gray-900 leading-tight">
                                {entry.campus || 'Campus not provided'}
                              </div>
                              <div className="text-gray-700 font-medium mt-2">
                                {entry.course || 'Course not provided'}
                              </div>
                              <div className="text-gray-500 mt-1">{getEducationYearText(entry)}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            )}

            {MORE_PROFILE_TAB_KEYS.includes(activeTab) && addedMoreSections.includes(activeTab) && (
              <div id={`panel-${activeTab}`} role="tabpanel">
                <EditableProfileListSection
                  sectionKey={activeTab}
                  config={MORE_PROFILE_SECTIONS[activeTab]}
                  items={formData[activeTab]}
                  drafts={drafts[activeTab]}
                  editing={editing[activeTab]}
                  saving={savingSection === activeTab}
                  onEdit={() => startEditingProfileList(activeTab)}
                  onCancel={() => cancelEdit(activeTab)}
                  onSave={() => saveSection(activeTab)}
                  onAddItem={() => addProfileListItem(activeTab)}
                  onRemoveItem={(index) => removeProfileListItem(activeTab, index)}
                  onChangeItem={(index, field, value) => updateProfileListItem(activeTab, index, field, value)}
                />
              </div>
            )}

            {isApplyFlow && (
              <div className="sticky bottom-0 z-[120] -mx-px mt-6 border-t border-[#d8e2ee] bg-white/95 px-6 sm:px-8 py-4 shadow-[0_-14px_34px_rgba(46,102,166,0.10)] backdrop-blur supports-[backdrop-filter]:bg-white/85">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={handleApplyFlowBack}
                    className="h-12 w-full sm:w-[170px] rounded-xl border border-[#d8e2ee] bg-white text-sm font-bold text-black/75 shadow-sm transition hover:bg-[#f7faff] hover:border-[#2e66a6]/35 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2"
                  >
                    Back
                  </button>

                  <button
                    type="button"
                    onClick={handleApplyFlowContinue}
                    className="h-12 w-full flex-1 rounded-xl bg-[#2e66a6] text-sm font-bold text-white shadow-[0_12px_26px_rgba(46,102,166,0.20)] transition hover:bg-[#25578f] active:bg-[#1f4b7c] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2"
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </JobSeekerLayout>
  );
};

export default MyProfile;