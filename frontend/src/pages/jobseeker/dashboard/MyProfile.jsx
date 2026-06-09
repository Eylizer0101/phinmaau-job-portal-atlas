import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import JobSeekerLayout from '../../../layouts/JobSeekerLayout';
import ProfileMoreDropdown from '../../../components/jobseeker/ProfileMoreDropdown';
import {
  MAJOR_COURSE_OPTIONS,
  CAMPUS_OPTIONS,
  EDUCATIONAL_ATTAINMENT_OPTIONS,
  FIELD_OF_STUDY_OPTIONS,
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
  FaFolderOpen,
  FaBookOpen,
  FaAward,
  FaUsers,
  FaWaveSquare,
  FaUserCheck,
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
  'High School',
  'Vocational',
  'Associate',
  "Bachelor's Degree",
  "Master's Degree",
  'Doctorate',
];

const MONTH_OPTIONS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const PROFILE_YEAR_OPTIONS = Array.from(
  { length: 81 },
  (_, index) => String(new Date().getFullYear() + 5 - index)
);

const CERTIFICATION_YEAR_OPTIONS = Array.from(
  { length: new Date().getFullYear() - 1950 + 1 },
  (_, index) => String(new Date().getFullYear() - index)
);

const EXTENSION_NAME_OPTIONS = ['Jr', 'Sr', 'II', 'III', 'IV', 'V'];

const PREFERRED_WORK_MODE_OPTIONS = [
  'On-site',
  'Blended',
  'Remote',
  'Work from home',
];

const EMPLOYMENT_TYPE_OPTIONS = [
  'Full time',
  'Part time',
  'Contract',
  'Internship',
  'Freelance',
  'Temporary',
];

const WILLING_TO_RELOCATE_OPTIONS = [
  'Yes — willing to relocate',
  'No — not willing to relocate',
  'Open to discuss',
];

const HOW_SOON_CAN_START_OPTIONS = [
  'Ready to start',
  'Within a few days',
  'Within 1 week',
  'Within 2 week',
  'Within a month',
];

const PREFERRED_LANGUAGE_OPTIONS = [
  'English',
  'Filipino',
  'English and Filipino',
];

const GENDER_OPTIONS = [
  'Male',
  'Female',
  'Prefer not to say',
];

const CIVIL_STATUS_OPTIONS = [
  'Single',
  'Married',
  'Widowed',
  'Separated',
];

const PROFICIENCY_LEVEL_OPTIONS = [
  'Basic',
  'Novice',
  'Intermediate',
  'Advanced',
  'Expert',
];

const DEFAULT_PROFICIENCY_LEVEL = 'Basic';

const parseSkillWithProficiency = (value = '') => {
  const clean = String(value || '').trim();
  if (!clean) return { skill: '', proficiency: DEFAULT_PROFICIENCY_LEVEL };

  const separatorMatch = clean.match(/\s[—-]\s(?=(Basic|Novice|Intermediate|Advanced|Expert)$)/i);
  if (!separatorMatch) return { skill: clean, proficiency: DEFAULT_PROFICIENCY_LEVEL };

  const separatorIndex = separatorMatch.index;
  const skill = clean.slice(0, separatorIndex).trim();
  const proficiency = clean.slice(separatorIndex).replace(/^[\s—-]+/, '').trim();

  return {
    skill,
    proficiency: PROFICIENCY_LEVEL_OPTIONS.includes(proficiency) ? proficiency : DEFAULT_PROFICIENCY_LEVEL,
  };
};

const formatSkillWithProficiency = (item = {}) => {
  const skill = String(item.skill || '').trim().replace(/[\s,]+$/, '');
  if (!skill) return '';
  const proficiency = PROFICIENCY_LEVEL_OPTIONS.includes(item.proficiency) ? item.proficiency : DEFAULT_PROFICIENCY_LEVEL;
  return `${skill} — ${proficiency}`;
};

const normalizeSkillRows = (items = [], keepEmpty = false) => {
  const source = Array.isArray(items) ? items : [];
  const rows = source
    .map((item) => {
      if (item && typeof item === 'object') {
        return {
          skill: String(item.skill || item.name || '').trim(),
          proficiency: PROFICIENCY_LEVEL_OPTIONS.includes(item.proficiency) ? item.proficiency : DEFAULT_PROFICIENCY_LEVEL,
        };
      }

      return parseSkillWithProficiency(item);
    })
    .filter((item) => keepEmpty || item.skill);

  return rows.length ? rows : [{ skill: '', proficiency: DEFAULT_PROFICIENCY_LEVEL }];
};

const serializeSkillRows = (rows = []) =>
  normalizeSkillRows(rows)
    .map(formatSkillWithProficiency)
    .filter(Boolean)
    .join(' || ');

const normalizeSkillsFromProfile = (raw) => {
  const clean = String(raw || '').trim();
  if (!clean) return [];

  if (clean.includes('||')) {
    return clean
      .split('||')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (/\s[—-]\s(Basic|Novice|Intermediate|Advanced|Expert)$/i.test(clean)) {
    return [clean];
  }

  return clean
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const createEmptyEducationEntry = () => ({
  level: '',
  educationalAttainment: '',
  school: '',
  campus: '',
  startMonth: '',
  startYear: '',
  endMonth: '',
  endYear: '',
  yearGraduated: '',
  description: '',
});

const normalizeEducationEntry = (entry = {}) => {
  const level = String(entry.level || entry.educationalAttainment || '').trim();
  const school = String(entry.school || entry.campus || '').trim();
  const endYear = String(entry.endYear || entry.yearGraduated || '').trim();

  return {
    level,
    educationalAttainment: String(entry.educationalAttainment || level || '').trim(),
    school,
    campus: school,
    startMonth: String(entry.startMonth || '').trim(),
    startYear: String(entry.startYear || '').trim(),
    endMonth: String(entry.endMonth || '').trim(),
    endYear,
    yearGraduated: String(entry.yearGraduated || endYear || '').trim(),
    description: String(entry.description || '').trim(),
  };
};

const hasEducationEntryValue = (entry = {}) => (
  Boolean(
    String(entry.level || '').trim() ||
    String(entry.educationalAttainment || '').trim() ||
    String(entry.school || '').trim() ||
    String(entry.campus || '').trim() ||
    String(entry.startMonth || '').trim() ||
    String(entry.startYear || '').trim() ||
    String(entry.endMonth || '').trim() ||
    String(entry.endYear || '').trim() ||
    String(entry.yearGraduated || '').trim() ||
    String(entry.description || '').trim()
  )
);

const normalizeEducationEntries = (entries = [], keepEmpty = false) => {
  const rows = (Array.isArray(entries) ? entries : [])
    .map(normalizeEducationEntry)
    .filter((entry) => keepEmpty || hasEducationEntryValue(entry));

  return rows.length ? rows : [createEmptyEducationEntry()];
};

const buildEducationDraftEntries = (baseState = {}) => {
  const existingEntries = normalizeEducationEntries(baseState.educationEntries || [], false);
  const hasExistingEntries = existingEntries.some(hasEducationEntryValue);
  if (hasExistingEntries) return existingEntries;

  const fallbackEntry = normalizeEducationEntry({
    level: baseState.eduLevel || baseState.educationalAttainment || '',
    educationalAttainment: baseState.eduEducationalAttainment || baseState.educationalAttainment || '',
    school: baseState.eduSchool || baseState.eduCampus || baseState.campus || '',
    startMonth: baseState.eduStartMonth || '',
    startYear: baseState.eduStartYear || '',
    endMonth: baseState.eduEndMonth || '',
    endYear: baseState.eduEndYear || baseState.yearGraduated || '',
    yearGraduated: baseState.eduEndYear || baseState.yearGraduated || '',
    description: baseState.eduDescription || '',
  });

  return hasEducationEntryValue(fallbackEntry) ? [fallbackEntry] : [createEmptyEducationEntry()];
};

const cleanEducationEntriesForSave = (entries = []) =>
  normalizeEducationEntries(entries, true)
    .map((entry) => {
      const normalized = normalizeEducationEntry(entry);
      return {
        level: normalized.level || normalized.educationalAttainment,
        educationalAttainment: normalized.educationalAttainment || normalized.level,
        school: normalized.school,
        campus: normalized.school,
        startMonth: normalized.startMonth,
        startYear: normalized.startYear,
        endMonth: normalized.endMonth,
        endYear: normalized.endYear,
        yearGraduated: normalized.endYear || normalized.yearGraduated,
        description: normalized.description,
      };
    })
    .filter(hasEducationEntryValue);

const normalizeExtensionName = (value) => {
  const clean = String(value || '').trim();
  return clean.toLowerCase() === 'none' ? '' : clean;
};


const getProfileImageUrl = (url = '') => {
  const cleanUrl = String(url || '').trim();
  if (!cleanUrl) return '';
  if (/^https?:\/\//i.test(cleanUrl) || cleanUrl.startsWith('data:') || cleanUrl.startsWith('blob:')) return cleanUrl;

  const apiBase = process.env.REACT_APP_API_URL || 'https://phinmaau-job-portal-atlas.onrender.com/api';
  const serverBase = apiBase.replace(/\/api\/?$/, '');
  return cleanUrl.startsWith('/') ? `${serverBase}${cleanUrl}` : `${serverBase}/${cleanUrl}`;
};

const MORE_PROFILE_SECTIONS = {
  certifications: {
    title: 'Certifications',
    emptyTitle: 'No certifications added yet',
    fields: [
      { key: 'title', label: 'Certification Title', placeholder: 'Search or enter licenses' },
      { key: 'issuer', label: 'Issuer', placeholder: 'Who authorized the certificate' },
      { key: 'date', label: 'Issuance Date', placeholder: 'Month Year' },
    ],
  },
  projects: {
    title: 'Projects',
    emptyTitle: 'No projects added yet',
    fields: [
      { key: 'title', label: 'Project Name', placeholder: 'Project name' },
      { key: 'role', label: 'Role', placeholder: 'Role on the Project' },
      { key: 'date', label: 'Date', placeholder: 'Month Year — Month Year' },
      { key: 'description', label: 'Description (optional)', type: 'textarea', placeholder: '' },
    ],
  },
  seminars: {
    title: 'Seminars and Trainings',
    emptyTitle: 'No seminars and trainings added yet',
    fields: [
      { key: 'title', label: 'Title', placeholder: 'e.g. Leadership training' },
      { key: 'organization', label: 'Organizer', placeholder: 'Who is the Organizer?' },
      { key: 'date', label: 'Date', placeholder: 'Month Year — Month Year' },
      { key: 'description', label: 'Description (optional)', type: 'textarea', placeholder: '' },
    ],
  },
  awards: {
    title: 'Awards and Achievements',
    emptyTitle: 'No awards and achievements added yet',
    fields: [
      { key: 'title', label: 'Title', placeholder: 'Title' },
      { key: 'issuer', label: 'Issuer', placeholder: 'Who issued the award?' },
      { key: 'date', label: 'Date', placeholder: 'Month Year' },
      { key: 'description', label: 'Description (optional)', type: 'textarea', placeholder: '' },
    ],
  },
  affiliations: {
    title: 'Affiliations',
    emptyTitle: 'No affiliations added yet',
    fields: [
      { key: 'organization', label: 'Organization', placeholder: 'Name of Organization' },
      { key: 'role', label: 'Role', placeholder: 'Role on the Organization' },
      { key: 'date', label: 'Date', placeholder: 'Month Year — Month Year' },
      { key: 'description', label: 'Description (optional)', type: 'textarea', placeholder: '' },
    ],
  },
  cocurricular: {
    title: 'Co-curricular Activities',
    emptyTitle: 'No co-curricular activities added yet',
    fields: [
      { key: 'organization', label: 'Organization', placeholder: 'Name of Organization' },
      { key: 'role', label: 'Role', placeholder: 'Role on the Organization' },
      { key: 'date', label: 'Date', placeholder: 'Month Year — Month Year' },
      { key: 'description', label: 'Description (optional)', type: 'textarea', placeholder: '' },
    ],
  },
  references: {
    title: 'References',
    emptyTitle: 'No references added yet',
    fields: [
      { key: 'name', label: 'Name', placeholder: 'Reference name' },
      { key: 'position', label: 'Occupation / Position', placeholder: 'Occupation / Position' },
      { key: 'company', label: 'Company', placeholder: 'Company' },
      { key: 'phone', label: 'Contact Number', placeholder: 'Phone number' },
      { key: 'email', label: 'Email', placeholder: 'Email address' },
    ],
  },
};

const MORE_PROFILE_TAB_KEYS = Object.keys(MORE_PROFILE_SECTIONS);

const MORE_SECTION_MODAL_STYLES = {
  certifications: { icon: <FaGraduationCap />, color: COLORS.primary },
  projects: { icon: <FaFolderOpen />, color: COLORS.primary },
  seminars: { icon: <FaBookOpen />, color: COLORS.primary },
  awards: { icon: <FaAward />, color: COLORS.primary },
  affiliations: { icon: <FaUsers />, color: COLORS.primary },
  cocurricular: { icon: <FaWaveSquare />, color: COLORS.primary },
  references: { icon: <FaUserCheck />, color: COLORS.primary },
};

const MORE_SECTION_DESCRIPTIONS = {
  certifications: "There are jobs that require certain certifications. For those that don't, being officially qualified or skilled in a certain area is a plus. Don’t forget to include dates. Click Add at the top right corner to add Certifications.",
  projects: "Projects include anything from portfolios, blogs, and websites to organizing events and building a robot. Showing work that you've already accomplished lets employers visualize your place in their company. Click Add at the top right corner to add Projects.",
  seminars: 'This section is another way of telling employers that you have certain skills and insights from other professionals. Attending these events also says that you are a proactive learner. Click Add at the top right corner to add Seminars and Trainings.',
  awards: "Assess the industry you are looking to enter and include related or noteworthy awards and recognition you've received in the past. Click Add at the top right corner to add Awards and Achievements.",
  affiliations: 'Whether or not you have work experience, building your resume with co-curricular activities outside of work will help employers understand the type of worker you might be. Click Add at the top right corner to add Affiliations.',
  cocurricular: 'Whether or not you have work experience, building your resume with co-curricular activities outside of work will help employers understand the type of worker you might be. Click Add at the top right corner to add Co-curricular Activities.',
  references: 'Reference previous employers & co-workers who know you and your work ethic so your future employer can contact them about you. Click Add at the top right corner to add References.',
};

const EMPTY_SECTION_MESSAGES = {
  about: 'This is your chance to show who you are. If an employer is skimming, you want to include skills, competencies, and information about yourself that are most relevant to the job. Click Add at the top right corner to add Summary.',
  career: 'Set your work preferences and availability.',
  work: "You've declared that you don't have work experience. Click Add at the top right corner to add Work History.",
  skills: 'Enumerate your skills, competencies, and talents relevant to the position and industry you are applying to. Indicate proficiency levels (Basic, Novice, Intermediate, Advanced, Expert) for each skill. Click Add at the top right corner to add Skills.',
  education: "You've declared that you don't have education. Click Add at the top right corner to add Educational Attainment.",
  ...MORE_SECTION_DESCRIPTIONS,
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
                ? 'For your security, Please enter your account password before previewing your CV.'
                : 'For your security, please enter your password to download your CV/Resume as PDF.'}
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
        className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white text-gray-900 outline-none focus:ring-2 focus:ring-[#2e66a6]/20 focus:border-[#2e66a6] disabled:bg-gray-50 disabled:text-gray-500"
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
        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 outline-none focus:ring-2 focus:ring-[#2e66a6]/20 focus:border-[#2e66a6] resize-none"
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
        className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white text-gray-900 outline-none focus:ring-2 focus:ring-[#2e66a6]/20 focus:border-[#2e66a6] disabled:bg-gray-50 disabled:text-gray-500"
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
        active ? 'text-[#2e66a6]' : 'text-gray-500 hover:text-gray-700'
      }`}
    >
      <span className="text-[12px] sm:text-[13px] shrink-0">{icon}</span>
      <span>{label}</span>
      <span className={`absolute left-0 right-0 -bottom-[11px] h-[2px] ${active ? 'bg-[#2e66a6]' : 'bg-transparent'}`} />
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

  const getCredentialDownloadUrl = (disposition = 'attachment') => {
    const apiBase = process.env.REACT_APP_API_URL || 'https://phinmaau-job-portal-atlas.onrender.com/api';
    return `${apiBase}/auth/download-alumni-verification/${encodeURIComponent(docType)}?disposition=${encodeURIComponent(disposition)}`;
  };

  const handleViewFile = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!fileUrl) return;

    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(getCredentialDownloadUrl('inline'), {
        responseType: 'blob',
        headers: { Authorization: `Bearer ${token}` },
      });

      const blobUrl = window.URL.createObjectURL(new Blob([response.data], { type: response.headers['content-type'] || 'application/octet-stream' }));
      window.open(blobUrl, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => window.URL.revokeObjectURL(blobUrl), 60000);
    } catch (error) {
      console.error('Error viewing credential file:', error);
      window.open(fileUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleDownloadFile = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!fileUrl) return;

    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(getCredentialDownloadUrl('attachment'), {
        responseType: 'blob',
        headers: { Authorization: `Bearer ${token}` },
      });

      const blobUrl = window.URL.createObjectURL(new Blob([response.data], { type: response.headers['content-type'] || 'application/octet-stream' }));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName || `${title}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Error downloading credential file:', error);
    }
  };

  return (
    <div
      ref={wrapperRef}
      onMouseEnter={onOpen}
      className={`relative rounded-[10px] border px-4 py-3 flex items-center justify-between gap-4 transition-colors ${
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
        <div className={`w-7 h-7 rounded-md flex items-center justify-center ${uploaded ? 'bg-[#eaf2fb] text-[#2e66a6]' : 'bg-[#f7faff] text-black/40'}`}>
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

const splitDateLabel = (value = '') => {
  const clean = String(value || '').trim();
  if (!clean) {
    return {
      fromMonth: '',
      fromYear: '',
      toMonth: '',
      toYear: '',
      isPresent: false,
      isSingleDate: false,
    };
  }

  const normalized = clean.replace(/\s+to\s+/i, ' — ').replace(/\s+-\s+/g, ' — ');
  const [fromRaw = '', toRaw = ''] = normalized.split('—').map((item) => item.trim());

  const parsePart = (part = '') => {
    const tokens = String(part || '').trim().split(/\s+/).filter(Boolean);
    const month = tokens.find((item) => MONTH_OPTIONS.includes(item)) || '';
    const year = tokens.find((item) => /^\d{4}$/.test(item)) || '';
    return { month, year };
  };

  const from = parsePart(fromRaw);
  const isPresent = /^present$/i.test(toRaw);
  const to = isPresent ? { month: '', year: '' } : parsePart(toRaw);

  return {
    fromMonth: from.month,
    fromYear: from.year,
    toMonth: to.month,
    toYear: to.year,
    isPresent,
    isSingleDate: !toRaw,
  };
};

const composeSingleDateLabel = ({ month = '', year = '' } = {}) => [month, year].filter(Boolean).join(' ').trim();

const composeRangeDateLabel = ({ fromMonth = '', fromYear = '', toMonth = '', toYear = '', isPresent = false } = {}) => {
  const fromText = composeSingleDateLabel({ month: fromMonth, year: fromYear });
  const toText = isPresent ? 'Present' : composeSingleDateLabel({ month: toMonth, year: toYear });

  if (fromText && toText) return `${fromText} — ${toText}`;
  return fromText || toText;
};

const getYearNumber = (year) => {
  const number = Number(year);
  return Number.isFinite(number) ? number : null;
};

const getMonthIndex = (month) => MONTH_OPTIONS.findIndex((item) => item === month);

const getValidEndYearOptions = (yearOptions = [], startYear = '') => {
  const startYearNumber = getYearNumber(startYear);
  if (!startYearNumber) return yearOptions;

  return yearOptions.filter((year) => {
    const yearNumber = getYearNumber(year);
    return !yearNumber || yearNumber >= startYearNumber;
  });
};

const getValidEndMonthOptions = (startMonth = '', startYear = '', endYear = '') => {
  if (!startMonth || !startYear || !endYear || String(startYear) !== String(endYear)) {
    return MONTH_OPTIONS;
  }

  const startMonthIndex = getMonthIndex(startMonth);
  if (startMonthIndex < 0) return MONTH_OPTIONS;

  return MONTH_OPTIONS.filter((month) => getMonthIndex(month) >= startMonthIndex);
};

const normalizeRangeDateParts = (parts = {}) => {
  const nextParts = { ...parts };

  if (nextParts.isPresent) {
    nextParts.toMonth = '';
    nextParts.toYear = '';
    return nextParts;
  }

  const fromYearNumber = getYearNumber(nextParts.fromYear);
  const toYearNumber = getYearNumber(nextParts.toYear);

  if (fromYearNumber && toYearNumber && toYearNumber < fromYearNumber) {
    nextParts.toYear = '';
    nextParts.toMonth = '';
    return nextParts;
  }

  if (nextParts.fromYear && nextParts.toYear && String(nextParts.fromYear) === String(nextParts.toYear)) {
    const fromMonthIndex = getMonthIndex(nextParts.fromMonth);
    const toMonthIndex = getMonthIndex(nextParts.toMonth);

    if (fromMonthIndex >= 0 && toMonthIndex >= 0 && toMonthIndex < fromMonthIndex) {
      nextParts.toMonth = '';
    }
  }

  return nextParts;
};

const RequiredMark = () => <span className="text-red-500"> *</span>;

const FormLabel = ({ children, required = false }) => (
  <label className="block text-[16px] text-gray-600 mb-1">
    {children}{required ? <RequiredMark /> : null}
  </label>
);

const PlainInput = ({ value, onChange, placeholder = '' }) => (
  <input
    value={value || ''}
    onChange={onChange}
    placeholder={placeholder}
    className="w-full h-11 px-3 border border-gray-300 rounded-[5px] bg-white text-gray-900 outline-none focus:border-[#2e66a6] focus:ring-1 focus:ring-[#2e66a6]"
  />
);

const PlainTextArea = ({ value, onChange, placeholder = '' }) => (
  <textarea
    rows={5}
    value={value || ''}
    onChange={onChange}
    placeholder={placeholder}
    className="w-full px-3 py-3 border border-gray-300 rounded-[5px] bg-white text-gray-900 outline-none focus:border-[#2e66a6] focus:ring-1 focus:ring-[#2e66a6] resize-y"
  />
);

const SmallSelect = ({ value, onChange, options = [], placeholder = 'Select', disabled = false }) => (
  <select
    value={value || ''}
    onChange={onChange}
    disabled={disabled}
    className={`h-11 min-w-[108px] px-3 border border-gray-300 rounded-[5px] outline-none focus:border-[#2e66a6] focus:ring-1 focus:ring-[#2e66a6] ${
      disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-900'
    }`}
  >
    <option value="">{placeholder}</option>
    {options.map((option) => (
      <option key={option} value={option}>{option}</option>
    ))}
  </select>
);

const DatePickerRow = ({
  value,
  onChange,
  mode = 'range',
  allowPresent = false,
  allowSingleDate = false,
  singleDateLabel = 'Single Date',
  yearOptions = PROFILE_YEAR_OPTIONS,
  singleDateChecked,
  onSingleDateCheckedChange,
}) => {
  const parts = splitDateLabel(value);
  const hasDateValue = Boolean(parts.fromMonth || parts.fromYear || parts.toMonth || parts.toYear);
  const isSingleDateMode = allowSingleDate
    ? (typeof singleDateChecked === 'boolean' ? singleDateChecked : Boolean(parts.isSingleDate && hasDateValue))
    : false;

  const updateSingle = (key, nextValue) => {
    const next = { month: parts.fromMonth, year: parts.fromYear, [key]: nextValue };
    onChange(composeSingleDateLabel(next));
  };

  const updateRange = (patch) => {
    const nextParts = normalizeRangeDateParts({ ...parts, ...patch });
    if (allowSingleDate && isSingleDateMode) {
      onChange(composeSingleDateLabel({ month: nextParts.fromMonth, year: nextParts.fromYear }));
      return;
    }
    onChange(composeRangeDateLabel(nextParts));
  };

  const endYearOptions = getValidEndYearOptions(yearOptions, parts.fromYear);
  const endMonthOptions = getValidEndMonthOptions(parts.fromMonth, parts.fromYear, parts.toYear);

  if (mode === 'single') {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <SmallSelect value={parts.fromMonth} onChange={(e) => updateSingle('month', e.target.value)} options={MONTH_OPTIONS} placeholder="Month" />
        <SmallSelect value={parts.fromYear} onChange={(e) => updateSingle('year', e.target.value)} options={yearOptions} placeholder="Year" />
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[16px] text-gray-600">From<RequiredMark /></span>
        <SmallSelect value={parts.fromMonth} onChange={(e) => updateRange({ fromMonth: e.target.value })} options={MONTH_OPTIONS} placeholder="Month" />
        <SmallSelect value={parts.fromYear} onChange={(e) => updateRange({ fromYear: e.target.value })} options={yearOptions} placeholder="Year" />

        <span className="ml-1 text-[16px] text-gray-600">To<RequiredMark /></span>
        <SmallSelect
          value={parts.toMonth}
          onChange={(e) => updateRange({ toMonth: e.target.value })}
          options={endMonthOptions}
          placeholder="Month"
          disabled={parts.isPresent || isSingleDateMode}
        />
        <SmallSelect
          value={parts.toYear}
          onChange={(e) => updateRange({ toYear: e.target.value })}
          options={endYearOptions}
          placeholder="Year"
          disabled={parts.isPresent || isSingleDateMode}
        />
      </div>

      {allowPresent ? (
        <label className="mt-3 inline-flex items-center gap-2 text-[16px] text-gray-900">
          <input
            type="checkbox"
            checked={parts.isPresent}
            onChange={(e) => updateRange({ isPresent: e.target.checked, toMonth: '', toYear: '' })}
            className="w-4 h-4 rounded border-gray-300 accent-[#2e66a6]"
          />
          Present
        </label>
      ) : null}

      {allowSingleDate ? (
        <label className="mt-3 inline-flex items-center gap-2 text-[16px] text-gray-900">
          <input
            type="checkbox"
            checked={isSingleDateMode}
            onChange={(e) => {
              const checked = e.target.checked;
              onSingleDateCheckedChange?.(checked);
              if (checked) {
                onChange(composeSingleDateLabel({ month: parts.fromMonth, year: parts.fromYear }));
              } else {
                onChange(composeRangeDateLabel({ ...parts, toMonth: '', toYear: '' }));
              }
            }}
            className="w-4 h-4 rounded border-gray-300 accent-[#2e66a6]"
          />
          {singleDateLabel}
        </label>
      ) : null}
    </>
  );
};

const RichDescriptionToolbar = () => (
  <div className="h-12 border border-b-0 border-gray-300 rounded-t-[5px] bg-white flex items-center gap-5 px-6 text-[11px] font-bold text-gray-800 uppercase">
    <span>B</span>
    <span className="italic">I</span>
    <span className="underline">U</span>
    <span className="h-7 border-l border-gray-300" />
    <span>•</span>
    <span>1.</span>
    <span className="h-7 border-l border-gray-300" />
    <span>Left</span>
    <span>Ctr</span>
    <span>Rght</span>
  </div>
);

const MoreSectionFieldSet = ({ sectionKey, item, index, onChangeItem }) => {
  const change = (fieldKey, value) => onChangeItem(index, fieldKey, value);

  if (sectionKey === 'certifications') {
    return (
      <>
        <div>
          <FormLabel required>Certification Title</FormLabel>
          <PlainInput value={item.title} onChange={(e) => change('title', e.target.value)} placeholder="Search or enter licenses" />
        </div>
        <div>
          <FormLabel required>Issuer</FormLabel>
          <PlainInput value={item.issuer} onChange={(e) => change('issuer', e.target.value)} placeholder="Who authorized the certificate" />
        </div>
        <div>
          <FormLabel required>Issuance Date</FormLabel>
          <DatePickerRow mode="single" value={item.date} onChange={(value) => change('date', value)} yearOptions={CERTIFICATION_YEAR_OPTIONS} />
        </div>
      </>
    );
  }

  if (sectionKey === 'projects') {
    return (
      <>
        <div>
          <FormLabel required>Project Name</FormLabel>
          <PlainInput value={item.title} onChange={(e) => change('title', e.target.value)} placeholder="Project name" />
        </div>
        <div>
          <FormLabel required>Role</FormLabel>
          <PlainInput value={item.role} onChange={(e) => change('role', e.target.value)} placeholder="Role on the Project" />
        </div>
        <DatePickerRow
          value={item.date}
          onChange={(value) => change('date', value)}
          allowPresent
          yearOptions={CERTIFICATION_YEAR_OPTIONS}
        />
        <div>
          <FormLabel>Description (optional)</FormLabel>
          <RichDescriptionToolbar />
          <textarea
            rows={5}
            value={item.description || ''}
            onChange={(e) => change('description', e.target.value)}
            className="w-full px-3 py-3 border border-gray-300 rounded-b-[5px] bg-white text-gray-900 outline-none focus:border-[#2e66a6] focus:ring-1 focus:ring-[#2e66a6] resize-y"
          />
        </div>
      </>
    );
  }

  if (sectionKey === 'seminars') {
    return (
      <>
        <div>
          <FormLabel required>Title</FormLabel>
          <PlainInput value={item.title} onChange={(e) => change('title', e.target.value)} placeholder="e.g. Leadership training" />
        </div>
        <div>
          <FormLabel required>Organizer</FormLabel>
          <PlainInput value={item.organization} onChange={(e) => change('organization', e.target.value)} placeholder="Who is the Organizer?" />
        </div>
        <DatePickerRow
          value={item.date}
          onChange={(value) => {
            if (typeof item.isSingleDate !== 'boolean') change('isSingleDate', false);
            change('date', value);
          }}
          allowSingleDate
          singleDateLabel="Single Date"
          yearOptions={CERTIFICATION_YEAR_OPTIONS}
          singleDateChecked={Boolean(item.isSingleDate)}
          onSingleDateCheckedChange={(checked) => change('isSingleDate', checked)}
        />
      </>
    );
  }

  if (sectionKey === 'awards') {
    return (
      <>
        <div>
          <FormLabel required>Title</FormLabel>
          <PlainInput value={item.title} onChange={(e) => change('title', e.target.value)} placeholder="Title" />
        </div>
        <div>
          <FormLabel required>Issuer</FormLabel>
          <PlainInput value={item.issuer} onChange={(e) => change('issuer', e.target.value)} placeholder="Who issued the award?" />
        </div>
        <div>
          <FormLabel required>Date</FormLabel>
          <DatePickerRow mode="single" value={item.date} onChange={(value) => change('date', value)} yearOptions={CERTIFICATION_YEAR_OPTIONS} />
        </div>
        <div>
          <FormLabel>Description (optional)</FormLabel>
          <PlainTextArea value={item.description} onChange={(e) => change('description', e.target.value)} />
        </div>
      </>
    );
  }

  if (sectionKey === 'affiliations' || sectionKey === 'cocurricular') {
    return (
      <>
        <div>
          <FormLabel required>Organization</FormLabel>
          <PlainInput value={item.organization} onChange={(e) => change('organization', e.target.value)} placeholder="Name of Organization" />
        </div>
        <div>
          <FormLabel required>Role</FormLabel>
          <PlainInput value={item.role} onChange={(e) => change('role', e.target.value)} placeholder="Role on the Organization" />
        </div>
        <DatePickerRow value={item.date} onChange={(value) => change('date', value)} allowPresent yearOptions={CERTIFICATION_YEAR_OPTIONS} />
        <div>
          <FormLabel>Description (optional)</FormLabel>
          <PlainTextArea value={item.description} onChange={(e) => change('description', e.target.value)} />
        </div>
      </>
    );
  }

  if (sectionKey === 'references') {
    return (
      <>
        <div>
          <FormLabel required>Name</FormLabel>
          <PlainInput value={item.name} onChange={(e) => change('name', e.target.value)} placeholder="Reference name" />
        </div>
        <div>
          <FormLabel required>Occupation / Position</FormLabel>
          <PlainInput value={item.position} onChange={(e) => change('position', e.target.value)} placeholder="Occupation / Position" />
        </div>
        <div>
          <FormLabel required>Company</FormLabel>
          <PlainInput value={item.company} onChange={(e) => change('company', e.target.value)} placeholder="Company" />
        </div>
        <div>
          <FormLabel required>Contact Number</FormLabel>
          <PlainInput value={item.phone} onChange={(e) => change('phone', e.target.value)} placeholder="Phone number" />
        </div>
        <div>
          <FormLabel required>Email</FormLabel>
          <PlainInput value={item.email} onChange={(e) => change('email', e.target.value)} placeholder="Email address" />
        </div>
      </>
    );
  }

  const fields = MORE_PROFILE_SECTIONS[sectionKey]?.fields || [];
  return fields.map((field) => (
    <div key={field.key}>
      {field.type === 'textarea' ? (
        <TextArea
          label={field.label}
          rows={3}
          value={item[field.key]}
          onChange={(e) => change(field.key, e.target.value)}
          placeholder={field.placeholder}
        />
      ) : (
        <Input
          label={field.label}
          value={item[field.key]}
          onChange={(e) => change(field.key, e.target.value)}
          placeholder={field.placeholder}
        />
      )}
    </div>
  ));
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

  return (
    <>
      {!editing ? <SectionHeader title={config.title} editLabel={`Edit ${config.title}`} onEdit={onEdit} /> : null}

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
                    {item.email ? <div className="text-sm text-[#2e66a6] mt-1 break-all">{item.email}</div> : null}
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
          <div className="rounded-[4px] border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="h-12 px-7 bg-[#2e66a6] text-white flex items-center gap-2 font-bold text-[14px] uppercase">
              <span>Edit</span>
              <span>{config.title}</span>
            </div>

            <div className="px-7 py-7 space-y-7">
              {draftItems.map((item, index) => (
                <div key={item._id || `${config.title}-draft-${index}`} className="space-y-5 border-b border-gray-200 last:border-b-0 pb-7 last:pb-0">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-bold text-gray-700">{draftItems.length > 1 ? `${config.title} ${index + 1}` : ''}</div>
                    {draftItems.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => onRemoveItem(index)}
                        className="h-9 px-3 rounded-[5px] border border-red-200 text-red-600 hover:bg-red-50 inline-flex items-center gap-2 text-sm font-semibold"
                      >
                        <FaTrash className="text-xs" />
                        Remove
                      </button>
                    ) : null}
                  </div>

                  <MoreSectionFieldSet
                    sectionKey={sectionKey}
                    item={item}
                    index={index}
                    onChangeItem={onChangeItem}
                  />
                </div>
              ))}

              <button
                type="button"
                onClick={onAddItem}
                className="h-10 px-4 rounded-[5px] border border-[#2e66a6] text-[#2e66a6] font-semibold inline-flex items-center gap-2 hover:bg-[#f7faff]"
              >
                <FaPlus className="text-xs" />
                Add {config.title.replace(/s$/, '')}
              </button>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-5 h-10 rounded-[3px] border border-[#2e66a6] text-[#2e66a6] font-semibold hover:bg-blue-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onSave}
                  disabled={saving}
                  className="px-6 h-10 rounded-[3px] bg-[#2e66a6] text-white font-semibold disabled:opacity-70"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
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
  onDelete,
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
              label="Company"
              value={form.companyName}
              onChange={(e) => onChange('companyName', e.target.value)}
              placeholder="e.g. Phinma Araullo University"
            />
            <Input
              label="Job Title"
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

        <div className="px-6 sm:px-8 py-5 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {mode === 'edit' && onDelete ? (
            <button
              type="button"
              onClick={onDelete}
              disabled={saving}
              className="px-4 h-11 rounded-xl border border-red-200 text-red-600 font-semibold hover:bg-red-50 disabled:opacity-70"
            >
              Remove
            </button>
          ) : (
            <div className="hidden sm:block" />
          )}

          <div className="flex justify-end gap-3">
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
  yearOptions,
  onEmailUpdate,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[10002] bg-black/35 flex items-center justify-center px-4 py-6" role="dialog" aria-modal="true">
      <div className="w-full max-w-4xl bg-white rounded-[4px] shadow-2xl border border-gray-200 overflow-hidden">
        <div className="h-12 px-5 sm:px-6 bg-[#2e66a6] flex items-center justify-between gap-3">
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
                    <div className="w-full h-full bg-[#e8f1ff] text-[#2e66a6] font-bold text-3xl flex items-center justify-center">
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
                  className="absolute -right-1 bottom-1 w-8 h-8 rounded-full bg-white border border-gray-200 shadow flex items-center justify-center text-[#2e66a6] disabled:opacity-70"
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
                    className="h-11 px-3 border border-gray-300 rounded-[3px] outline-none focus:border-[#2e66a6] focus:ring-1 focus:ring-[#2e66a6]"
                  />
                </div>

                <input
                  value={drafts.lastName || ''}
                  onChange={(e) => onChange('lastName', e.target.value)}
                  placeholder="Last Name"
                  className="h-11 px-3 border border-gray-300 rounded-[3px] outline-none focus:border-[#2e66a6] focus:ring-1 focus:ring-[#2e66a6]"
                />

                <div className="grid grid-cols-[120px_1fr] items-center gap-3 md:col-start-1">
                  <label className="text-sm text-gray-500">Middle Name</label>
                  <input
                    value={drafts.middleName || ''}
                    onChange={(e) => onChange('middleName', e.target.value)}
                    className="h-11 px-3 border border-gray-300 rounded-[3px] outline-none focus:border-[#2e66a6] focus:ring-1 focus:ring-[#2e66a6]"
                  />
                </div>

                <select
                  value={drafts.extensionName || ''}
                  onChange={(e) => onChange('extensionName', e.target.value)}
                  className="h-11 px-3 border border-gray-300 rounded-[3px] bg-white outline-none focus:border-[#2e66a6] focus:ring-1 focus:ring-[#2e66a6]"
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
                  className="h-11 px-3 border border-gray-300 rounded-[3px] bg-white outline-none focus:border-[#2e66a6] focus:ring-1 focus:ring-[#2e66a6]"
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
                  className="h-11 px-3 border border-gray-300 rounded-[3px] bg-white outline-none focus:border-[#2e66a6] focus:ring-1 focus:ring-[#2e66a6] disabled:bg-gray-50 disabled:text-gray-400"
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
                  className="h-11 px-3 border border-gray-300 rounded-[3px] bg-white outline-none focus:border-[#2e66a6] focus:ring-1 focus:ring-[#2e66a6] disabled:bg-gray-50 disabled:text-gray-400"
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
                  className="h-11 px-3 border border-gray-300 rounded-[3px] outline-none focus:border-[#2e66a6] focus:ring-1 focus:ring-[#2e66a6]"
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
                    className="h-11 px-4 text-[#2e66a6] font-bold text-sm hover:underline"
                  >
                    UPDATE
                  </button>
                </div>

                <div className="grid grid-cols-[120px_1fr] items-center gap-3">
                  <label className="text-sm text-gray-500">Mobile Number</label>
                  <input
                    value={drafts.phoneNumber || ''}
                    onChange={(e) => onChange('phoneNumber', e.target.value)}
                    className="h-11 px-3 border border-gray-300 rounded-[3px] outline-none focus:border-[#2e66a6] focus:ring-1 focus:ring-[#2e66a6]"
                  />
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm text-gray-500 mb-2">Campus</label>
                      <select
                        value={drafts.campus || ''}
                        onChange={(e) => onChange('campus', e.target.value)}
                        className="w-full h-11 px-3 border border-gray-300 rounded-[3px] bg-white outline-none focus:border-[#2e66a6] focus:ring-1 focus:ring-[#2e66a6]"
                      >
                        <option value="">Select campus</option>
                        {CAMPUS_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-500 mb-2">Course</label>
                      <select
                        value={drafts.course || ''}
                        onChange={(e) => onChange('course', e.target.value)}
                        className="w-full h-11 px-3 border border-gray-300 rounded-[3px] bg-white outline-none focus:border-[#2e66a6] focus:ring-1 focus:ring-[#2e66a6]"
                      >
                        <option value="">Select course</option>
                        {MAJOR_COURSE_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-500 mb-2">Year Graduated</label>
                      <select
                        value={drafts.yearGraduated || ''}
                        onChange={(e) => onChange('yearGraduated', e.target.value)}
                        className="w-full h-11 px-3 border border-gray-300 rounded-[3px] bg-white outline-none focus:border-[#2e66a6] focus:ring-1 focus:ring-[#2e66a6]"
                      >
                        <option value="">Select year</option>
                        {yearOptions.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                  </div>
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
            className="px-6 h-10 rounded-[3px] bg-[#2e66a6] text-white font-semibold disabled:opacity-70"
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
        <div className="h-12 px-5 bg-[#2e66a6] flex items-center justify-between gap-3">
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
                className="text-sm font-semibold text-[#2e66a6] hover:underline disabled:opacity-70"
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
              className="px-5 h-10 rounded-[3px] bg-[#2e66a6] text-white font-semibold disabled:opacity-70"
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
    <div className="fixed inset-0 z-[10005] bg-black/75 flex items-start justify-center px-4 py-20" role="dialog" aria-modal="true">
      <div className="relative w-full max-w-[625px] max-h-[78vh] bg-white rounded-[6px] shadow-2xl overflow-hidden">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-4 z-10 text-gray-500 hover:text-gray-800 text-2xl leading-none"
          aria-label="Close add sections modal"
        >
          ×
        </button>

        <div className="max-h-[78vh] overflow-y-auto px-8 pt-7 pb-4">
          <h2 className="text-[24px] font-bold text-gray-900 mb-4">Add More Sections</h2>

          {MORE_PROFILE_TAB_KEYS.map((key) => {
            const config = MORE_PROFILE_SECTIONS[key];
            const alreadyAdded = addedSections.includes(key);
            const style = MORE_SECTION_MODAL_STYLES[key] || { icon: <FaPlus />, color: '#2e66a6' };

            return (
              <div key={key} className="grid grid-cols-[48px_1fr_104px] items-center gap-5 py-5 border-b border-gray-200 last:border-b-0">
                <div className="text-[38px] flex items-center justify-center shrink-0" style={{ color: style.color }}>
                  {style.icon}
                </div>

                <div className="min-w-0">
                  <div className="text-[17px] font-bold text-gray-900">{config.title}</div>
                  <p className="text-[14px] leading-6 text-gray-500 mt-1">
                    {MORE_SECTION_DESCRIPTIONS[key] || 'Add this section to complete your profile.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onAdd(key)}
                  disabled={alreadyAdded}
                  className={`h-11 rounded-[7px] text-[15px] font-bold text-white transition ${alreadyAdded ? 'bg-gray-300 cursor-not-allowed' : 'bg-[#2e66a6] hover:bg-[#2e66a6]/90'}`}
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



const SkillProficiencyDescriptionModal = ({ open, onClose }) => {
  if (!open) return null;

  const levels = [
    {
      title: 'Basic',
      subtitle: 'Basic knowledge / Fundamental awareness',
      paragraphs: [
        'You have a common knowledge or an understanding of basic techniques and concepts.',
        'Focus is on learning.',
      ],
    },
    {
      title: 'Novice',
      subtitle: 'Limited experience',
      paragraphs: [
        'You have the level of experience gained in a classroom and/or experimental scenarios or as a trainee-on-the-job. You are expected to need help when performing this skill.',
        'Focus is on developing through on-the-job experience.',
        'You understand and can discuss terminology, concepts, principles, and issues related to this competency.',
        'You utilize the full range of reference and resource materials in this competency.',
      ],
    },
    {
      title: 'Intermediate',
      subtitle: 'Practical application',
      paragraphs: [
        'You are able to successfully complete tasks in this competency as requested. Help from an expert may be required from time to time, but you can usually perform this skill independently.',
        'Focus is on applying and enhancing knowledge or skill.',
        'You have applied this competency to situations occasionally while needing minimal guidance to perform successfully.',
        'You understand and can discuss the application and implications of changes to processes, policies, and procedures in this area.',
      ],
    },
    {
      title: 'Advanced',
      subtitle: 'Applied Theory',
      paragraphs: [
        'You can perform the actions associated with this skill without assistance. You are certainly recognized within your immediate organization as a person to ask when difficult questions arise regarding this skill.',
        'Focus is on broad organizational/professional issues.',
        'You have consistently provided practical/relevant ideas and perspectives on process or practice improvements which may be implemented easily.',
        'You are capable of coaching others in the application of this competency by translating complex nuances relating to this competency into easy to understand terms.',
        'You participate in senior level discussions regarding this competency.',
        'You assist in the development of reference and resource materials in this competency.',
      ],
    },
    {
      title: 'Expert',
      subtitle: 'Recognized Authority',
      paragraphs: [
        'You are known as an expert in this area. You can provide guidance, troubleshoot, and answer questions related to this area of expertise and the field where the skill is used.',
        'Focus is strategic.',
        'You have demonstrated consistent excellence in applying this competency across multiple projects and/or organizations.',
        'You are considered the go to person in this area within and/or outside organizations.',
        'You create new applications for and/or lead the development of reference and resource materials for this competency.',
        'You are able to diagram or explain the relevant process elements and issues in relation to organizational issues and trends in sufficient detail during discussions and presentations, to foster a greater understanding among internal and external colleagues and constituents.',
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-[10008] bg-black/75 flex items-center justify-center px-4 py-6" role="dialog" aria-modal="true" aria-labelledby="skill-proficiency-title">
      <div className="relative w-full max-w-[720px] max-h-[78vh] bg-white rounded-[6px] shadow-2xl border border-[#d8e2ee] overflow-hidden">
        <div className="sticky top-0 z-10 bg-white px-6 sm:px-8 pt-7 pb-4 border-b border-[#d8e2ee]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="skill-proficiency-title" className="text-[21px] font-bold text-black">Skill Proficiency Description</h2>
              <p className="mt-4 text-[15px] leading-6 text-[#4b5563]">
                Our skills proficiency level is based on the NIH Proficiency Scale which is used to measure one's ability to demonstrate competency on the job. The scale captures a wide range of ability levels and organizes them into five steps.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-md border border-[#2e66a6]/40 text-[#2e66a6] hover:bg-[#f7faff] text-2xl leading-none flex items-center justify-center shrink-0"
              aria-label="Close skill proficiency description modal"
            >
              ×
            </button>
          </div>
        </div>

        <div className="max-h-[calc(78vh-132px)] overflow-y-auto px-6 sm:px-8 py-5 space-y-7 bg-white">
          {levels.map((level) => (
            <section key={level.title}>
              <h3 className="text-[18px] font-bold text-black">{level.title}</h3>
              <div className="mt-1 text-[15px] font-bold italic text-[#008f80]">{level.subtitle}</div>
              <div className="mt-2 space-y-5 text-[15px] leading-7 text-[#4b5563]">
                {level.paragraphs.map((paragraph, index) => (
                  <p key={`${level.title}-${index}`}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
};

const ProfileTodoList = ({ completed = [] }) => {
  const items = [
    { key: 'basic', label: 'Complete Basic Info' },
    { key: 'career', label: 'Availability and Preferences' },
    { key: 'work', label: 'Work Experience' },
    { key: 'skills', label: 'Skills' },
    { key: 'education', label: 'Education' },
    { key: 'certifications', label: 'Certifications' },
    { key: 'projects', label: 'Projects' },
    { key: 'seminars', label: 'Seminars and Trainings' },
    { key: 'awards', label: 'Awards and Achievements' },
    { key: 'affiliations', label: 'Affiliations' },
    { key: 'cocurricular', label: 'Co-curricular Activities' },
    { key: 'references', label: 'References' },
  ];

  const doneCount = items.filter((item) => completed.includes(item.key)).length;
  const percent = Math.round((doneCount / items.length) * 100);

  return (
    <aside className="w-full rounded-[14px] border border-gray-200 bg-white px-5 py-5 shadow-sm lg:sticky lg:top-24">
      <h3 className="text-[18px] font-bold text-gray-900 mb-4">To-Do List</h3>
      <div className="text-center text-[#008f80] font-bold text-sm mb-2">{percent}% Done</div>
      <div className="h-2 rounded-full bg-[#ecebea] overflow-hidden mb-4">
        <div className="h-full bg-[#0f9f91] transition-all" style={{ width: `${percent}%` }} />
      </div>
      <div className="space-y-3">
        {items.map((item) => {
          const done = completed.includes(item.key);
          return (
            <div key={item.key} className="flex items-center gap-3 text-[15px] text-gray-900">
              <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${done ? 'border-[#0f9f91] bg-[#0f9f91]' : 'border-gray-300 bg-white'}`}>
                {done ? <FaCheckCircle className="text-white text-[10px]" /> : null}
              </span>
              <span className="flex-1 leading-5">{item.label}</span>
              <FaInfoCircle className="text-gray-300 text-[15px] shrink-0" />
            </div>
          );
        })}
      </div>
    </aside>
  );
};


const ProfileEditModal = ({
  open,
  sectionKey,
  drafts,
  saving,
  error,
  yearOptions = [],
  onChange,
  onArrayTextChange,
  onSkillRowChange,
  onAddSkillRow,
  onRemoveSkillRow,
  onOpenSkillProficiencyDescription,
  onAddEducationEntry,
  onRemoveEducationEntry,
  onChangeEducationEntry,
  onSave,
  onClose,
  onAddProfileItem,
  onRemoveProfileItem,
  onChangeProfileItem,
}) => {
  if (!open || !sectionKey) return null;

  const titleMap = {
    about: 'Edit Objective',
    career: 'Edit Availability & Preferences',
    skills: 'Edit Skills',
    education: 'Edit Education',
  };

  const moreConfig = MORE_PROFILE_SECTIONS[sectionKey];
  const title = moreConfig?.title ? `Edit ${moreConfig.title}` : titleMap[sectionKey] || 'Edit Section';

  const renderContent = () => {
    if (sectionKey === 'about') {
      return (
        <TextArea
          label="Objective"
          rows={8}
          value={drafts.aboutMe}
          onChange={(e) => onChange('aboutMe', e.target.value)}
          placeholder="Write a short paragraph (3-5 sentences) about yourself"
        />
      );
    }

    if (sectionKey === 'career') {
      return (
        <div className="grid md:grid-cols-2 gap-5">
          <Select label="Preferred Work Mode" value={drafts.preferredWorkMode} onChange={(e) => onChange('preferredWorkMode', e.target.value)} options={PREFERRED_WORK_MODE_OPTIONS} placeholder="Select preferred work mode" />
          <Select label="Employment Type" value={drafts.employmentType} onChange={(e) => onChange('employmentType', e.target.value)} options={EMPLOYMENT_TYPE_OPTIONS} placeholder="Select employment type" />
          <Select label="Willing to Relocate" value={drafts.willingToRelocate} onChange={(e) => onChange('willingToRelocate', e.target.value)} options={WILLING_TO_RELOCATE_OPTIONS} placeholder="Select relocation preference" />
          <Select label="How Soon Can Start" value={drafts.howSoonCanYouStart} onChange={(e) => onChange('howSoonCanYouStart', e.target.value)} options={HOW_SOON_CAN_START_OPTIONS} placeholder="Select availability" />
          <Select label="Preferred Language" value={drafts.preferredLanguage} onChange={(e) => onChange('preferredLanguage', e.target.value)} options={PREFERRED_LANGUAGE_OPTIONS} placeholder="Select preferred language" />
          <Select label="Educational Attainment" value={drafts.educationalAttainment} onChange={(e) => onChange('educationalAttainment', e.target.value)} options={EDUCATIONAL_ATTAINMENT_OPTIONS} placeholder="Select educational attainment" />
          <Select label="Double Degree" value={drafts.studyField} onChange={(e) => onChange('studyField', e.target.value)} options={FIELD_OF_STUDY_OPTIONS} placeholder="Select study field" />
          <Input label="Minimum Salary" value={drafts.minimumSalary} onChange={(e) => onChange('minimumSalary', e.target.value)} placeholder="Minimum Salary" />
          <Input label="Maximum Salary" value={drafts.maximumSalary} onChange={(e) => onChange('maximumSalary', e.target.value)} placeholder="Maximum Salary" />
          <Input label="Height" value={drafts.height} onChange={(e) => onChange('height', e.target.value)} placeholder="Height" />
          <Input label="Weight" value={drafts.weight} onChange={(e) => onChange('weight', e.target.value)} placeholder="Weight" />
          <Input label="Nationality" value={drafts.nationality} onChange={(e) => onChange('nationality', e.target.value)} placeholder="Nationality" />
          <Select label="Gender" value={drafts.gender} onChange={(e) => onChange('gender', e.target.value)} options={GENDER_OPTIONS} placeholder="Select gender" />
          <Select label="Civil Status" value={drafts.civilStatus} onChange={(e) => onChange('civilStatus', e.target.value)} options={CIVIL_STATUS_OPTIONS} placeholder="Select civil status" />
          <Input label="Birthday" type="date" value={drafts.birthday} onChange={(e) => onChange('birthday', e.target.value)} />
        </div>
      );
    }

    if (sectionKey === 'skills') {
      const skillRows = normalizeSkillRows(drafts.skillRows || [
        ...(drafts.technicalSkills || []),
        ...(drafts.softSkills || []),
      ], true);

      return (
        <div className="space-y-5">
          <div className="space-y-4">
            {skillRows.map((item, index) => (
              <div key={`skill-row-${index}`} className="grid grid-cols-1 md:grid-cols-[1fr_170px_36px] gap-3 items-center">
                <input
                  type="text"
                  value={item.skill || ''}
                  onChange={(e) => onSkillRowChange(index, 'skill', e.target.value)}
                  placeholder="e.g. Communication, Canva, Figma, Coding"
                  className="w-full h-12 px-4 rounded-[6px] border border-gray-300 bg-white text-black outline-none focus:ring-2 focus:ring-[#2e66a6]/20 focus:border-[#2e66a6]"
                />

                <select
                  value={item.proficiency || DEFAULT_PROFICIENCY_LEVEL}
                  onChange={(e) => onSkillRowChange(index, 'proficiency', e.target.value)}
                  className="w-full h-12 px-4 rounded-[6px] border border-gray-300 bg-white text-black outline-none focus:ring-2 focus:ring-[#2e66a6]/20 focus:border-[#2e66a6]"
                >
                  {PROFICIENCY_LEVEL_OPTIONS.map((level) => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => onRemoveSkillRow(index)}
                  className="w-9 h-9 rounded-md text-red-500 hover:bg-red-50 inline-flex items-center justify-center"
                  aria-label="Remove skill"
                  title="Remove skill"
                >
                  <FaTrash className="text-sm" />
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={onAddSkillRow}
            className="h-10 px-4 rounded-[6px] border border-gray-300 bg-white text-black font-medium hover:bg-gray-50 inline-flex items-center gap-2"
          >
            <FaPlus className="text-xs" />
            Add Skill
          </button>

          <div className="border-t border-gray-200 pt-4">
            <button
              type="button"
              onClick={onOpenSkillProficiencyDescription}
              className="inline-flex items-center gap-2 text-[#2e66a6] font-medium hover:underline"
            >
              <FaInfoCircle className="text-sm" />
              Proficiency Level Description
            </button>
          </div>
        </div>
      );
    }

    if (sectionKey === 'education') {
      const educationRows = normalizeEducationEntries(drafts.educationEntries || [], true);

      return (
        <div className="space-y-5">
          {educationRows.map((entry, index) => (
            <div key={`education-entry-${index}`} className="rounded-[14px] border border-gray-200 bg-[#fcfcfd] p-4 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-bold text-gray-700">Education {index + 1}</div>
                <button
                  type="button"
                  onClick={() => onRemoveEducationEntry(index)}
                  className="h-9 px-3 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 inline-flex items-center gap-2 text-sm font-semibold"
                >
                  <FaTrash className="text-xs" />
                  Remove
                </button>
              </div>

              <div className="space-y-4">
                <Select
                  label="Educational Attainment *"
                  value={entry.level || entry.educationalAttainment}
                  onChange={(e) => onChangeEducationEntry(index, 'level', e.target.value)}
                  options={EDUCATION_LEVEL_OPTIONS}
                  placeholder="Select educational attainment"
                />

                <Input
                  label="School / University *"
                  value={entry.school || entry.campus}
                  onChange={(e) => onChangeEducationEntry(index, 'school', e.target.value)}
                  placeholder="Enter school / university"
                />

                {(() => {
                  const endYearValue = entry.endYear || entry.yearGraduated;
                  const endYearOptions = getValidEndYearOptions(yearOptions, entry.startYear);
                  const endMonthOptions = getValidEndMonthOptions(entry.startMonth, entry.startYear, endYearValue);

                  return (
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-[16px] text-gray-600">From<span className="text-red-500">*</span></span>
                      <SmallSelect
                        value={entry.startMonth}
                        onChange={(e) => onChangeEducationEntry(index, 'startMonth', e.target.value)}
                        options={MONTH_OPTIONS}
                        placeholder="Month"
                      />
                      <SmallSelect
                        value={entry.startYear}
                        onChange={(e) => onChangeEducationEntry(index, 'startYear', e.target.value)}
                        options={yearOptions}
                        placeholder="Year"
                      />

                      <span className="text-[16px] text-gray-600">To</span>
                      <SmallSelect
                        value={entry.endMonth}
                        onChange={(e) => onChangeEducationEntry(index, 'endMonth', e.target.value)}
                        options={endMonthOptions}
                        placeholder="Month"
                      />
                      <SmallSelect
                        value={endYearValue}
                        onChange={(e) => onChangeEducationEntry(index, 'endYear', e.target.value)}
                        options={endYearOptions}
                        placeholder="Year"
                      />
                    </div>
                  );
                })()}

                <TextArea
                  label="Description (optional)"
                  rows={4}
                  value={entry.description}
                  onChange={(e) => onChangeEducationEntry(index, 'description', e.target.value)}
                  placeholder="Add education details, honors, activities, or relevant notes."
                />
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={onAddEducationEntry}
            className="h-10 px-4 rounded-[6px] border border-gray-300 bg-white text-black font-medium hover:bg-gray-50 inline-flex items-center gap-2"
          >
            <FaPlus className="text-xs" />
            Add Education
          </button>
        </div>
      );
    }

    if (moreConfig) {
      const items = Array.isArray(drafts[sectionKey]) ? drafts[sectionKey] : [];
      const fields = moreConfig.fields || [];

      return (
        <div className="space-y-5">
          {items.map((item, index) => (
            <div key={`${sectionKey}-${index}`} className="rounded-[14px] border border-gray-200 bg-gray-50 p-4 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-bold text-gray-700">Entry {index + 1}</div>
                <button
                  type="button"
                  onClick={() => onRemoveProfileItem(sectionKey, index)}
                  className="h-9 px-3 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-sm font-semibold"
                >
                  Remove
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {fields.map((field) => {
                  const isWideField = field.type === 'textarea' || field.key === 'date';

                  return (
                    <div key={field.key} className={isWideField ? 'md:col-span-2' : ''}>
                      {sectionKey === 'certifications' && field.key === 'date' ? (
                        <div>
                          <label className="block text-[11px] tracking-[0.16em] uppercase font-bold text-gray-400 mb-2">{field.label}</label>
                          <DatePickerRow
                            mode="single"
                            value={item[field.key]}
                            onChange={(value) => onChangeProfileItem(sectionKey, index, field.key, value)}
                            yearOptions={CERTIFICATION_YEAR_OPTIONS}
                          />
                        </div>
                      ) : sectionKey === 'projects' && field.key === 'date' ? (
                        <div>
                          <label className="block text-[11px] tracking-[0.16em] uppercase font-bold text-gray-400 mb-2">{field.label}</label>
                          <DatePickerRow
                            value={item[field.key]}
                            onChange={(value) => onChangeProfileItem(sectionKey, index, field.key, value)}
                            allowPresent
                            yearOptions={CERTIFICATION_YEAR_OPTIONS}
                          />
                        </div>
                      ) : sectionKey === 'seminars' && field.key === 'date' ? (
                        <div>
                          <label className="block text-[11px] tracking-[0.16em] uppercase font-bold text-gray-400 mb-2">{field.label}</label>
                          <DatePickerRow
                            value={item[field.key]}
                            onChange={(value) => {
                              if (typeof item.isSingleDate !== 'boolean') onChangeProfileItem(sectionKey, index, 'isSingleDate', false);
                              onChangeProfileItem(sectionKey, index, field.key, value);
                            }}
                            allowSingleDate
                            singleDateLabel="Single Date"
                            yearOptions={CERTIFICATION_YEAR_OPTIONS}
                            singleDateChecked={Boolean(item.isSingleDate)}
                            onSingleDateCheckedChange={(checked) => onChangeProfileItem(sectionKey, index, 'isSingleDate', checked)}
                          />
                        </div>
                      ) : sectionKey === 'awards' && field.key === 'date' ? (
                        <div>
                          <label className="block text-[11px] tracking-[0.16em] uppercase font-bold text-gray-400 mb-2">{field.label}</label>
                          <DatePickerRow
                            mode="single"
                            value={item[field.key]}
                            onChange={(value) => onChangeProfileItem(sectionKey, index, field.key, value)}
                            yearOptions={CERTIFICATION_YEAR_OPTIONS}
                          />
                        </div>
                      ) : (sectionKey === 'affiliations' || sectionKey === 'cocurricular') && field.key === 'date' ? (
                        <div>
                          <label className="block text-[11px] tracking-[0.16em] uppercase font-bold text-gray-400 mb-2">{field.label}</label>
                          <DatePickerRow
                            value={item[field.key]}
                            onChange={(value) => onChangeProfileItem(sectionKey, index, field.key, value)}
                            allowPresent
                            yearOptions={CERTIFICATION_YEAR_OPTIONS}
                          />
                        </div>
                      ) : field.type === 'textarea' ? (
                        <TextArea
                          label={field.label}
                          rows={5}
                          value={item[field.key]}
                          onChange={(e) => onChangeProfileItem(sectionKey, index, field.key, e.target.value)}
                          placeholder={field.placeholder}
                        />
                      ) : (
                        <Input
                          label={field.label}
                          value={item[field.key]}
                          onChange={(e) => onChangeProfileItem(sectionKey, index, field.key, e.target.value)}
                          placeholder={field.placeholder}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={() => onAddProfileItem(sectionKey)}
            className="h-11 px-5 rounded-lg text-white font-semibold inline-flex items-center gap-2 bg-[#2e66a6]"
          >
            <FaPlus className="text-xs" /> Add Entry
          </button>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="fixed inset-0 z-[10006] bg-black/45 flex items-center justify-center px-4 py-6" role="dialog" aria-modal="true">
      <div className="w-full max-w-4xl max-h-[86vh] bg-white rounded-[6px] shadow-2xl border border-gray-200 overflow-hidden">
        <div className="h-12 px-6 bg-[#2e66a6] flex items-center justify-between gap-3">
          <div className="text-white font-bold text-[15px] uppercase">{title}</div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-md text-white/90 hover:bg-white/15 text-2xl leading-none" aria-label="Close edit modal">×</button>
        </div>

        <div className="px-6 py-6 max-h-[calc(86vh-112px)] overflow-y-auto">
          {error ? <Alert type="error" message={error} /> : null}
          {renderContent()}
        </div>

        <div className="px-6 py-5 border-t border-gray-200 flex justify-end gap-3 bg-white">
          <button type="button" onClick={onClose} className="px-5 h-10 rounded-[3px] border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50">Cancel</button>
          <button type="button" onClick={onSave} disabled={saving} className="px-6 h-10 rounded-[3px] bg-[#2e66a6] text-white font-semibold disabled:opacity-70">{saving ? 'Saving...' : 'Save'}</button>
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

  const [openTabs, setOpenTabs] = useState(['personal']);
  const [editModalSection, setEditModalSection] = useState('');
  const [addSectionsModalOpen, setAddSectionsModalOpen] = useState(false);
  const [skillProficiencyModalOpen, setSkillProficiencyModalOpen] = useState(false);
  const [addedMoreSections, setAddedMoreSections] = useState([]);
  const [moreSectionMenuOpen, setMoreSectionMenuOpen] = useState('');

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
    skillRows: [{ skill: '', proficiency: DEFAULT_PROFICIENCY_LEVEL }],
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
    eduSchool: '',
    eduEducationalAttainment: '',
    eduStartMonth: '',
    eduStartYear: '',
    eduEndMonth: '',
    eduEndYear: '',
    eduDescription: '',
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
    const startMonth = String(entry?.startMonth || '').trim();
    const startYear = String(entry?.startYear || '').trim();
    const endMonth = String(entry?.endMonth || '').trim();
    const endYear = String(entry?.endYear || entry?.yearGraduated || '').trim();

    const start = [startMonth, startYear].filter(Boolean).join(' ');
    const end = [endMonth, endYear].filter(Boolean).join(' ');

    if (start && end) return `${start} - ${end}`;
    if (end) return end;
    if (start) return start;
    return 'Year not specified';
  };

  const resetEducationDraftFields = (baseState) => ({
    ...baseState,
    educationEntries: normalizeEducationEntries(baseState.educationEntries || [], false).filter(hasEducationEntryValue),
    eduLevel: '',
    eduSchool: '',
    eduEducationalAttainment: '',
    eduStartMonth: '',
    eduStartYear: '',
    eduEndMonth: '',
    eduEndYear: '',
    eduDescription: '',
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

        const parseSkills = (raw) => normalizeSkillsFromProfile(raw);

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
          skillRows: normalizeSkillRows([
            ...parseSkills(profile.technicalSkills),
            ...parseSkills(profile.softSkills),
          ]),
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
          eduSchool: '',
          eduEducationalAttainment: '',
          eduStartMonth: '',
          eduStartYear: '',
          eduEndMonth: '',
          eduEndYear: '',
          eduDescription: '',
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
            campus: drafts.campus,
            course: drafts.course,
            yearGraduated: drafts.yearGraduated,
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
        const savedSkillRows = normalizeSkillRows(drafts.skillRows || [
          ...(drafts.technicalSkills || []),
          ...(drafts.softSkills || []),
        ]).filter((item) => String(item.skill || '').trim());

        payload = {
          jobSeekerProfile: {
            preferredWorkMode: drafts.preferredWorkMode,
            technicalSkills: serializeSkillRows(savedSkillRows),
            softSkills: '',
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
        const nextEducationEntries = cleanEducationEntriesForSave(drafts.educationEntries || []);

        if (!nextEducationEntries.length) {
          setError('Please add at least one education entry before saving.');
          setSavingSection('');
          return;
        }

        const incompleteEntry = nextEducationEntries.find((entry) => !(entry.level || entry.educationalAttainment) || !entry.school);
        if (incompleteEntry) {
          setError('Please complete the educational attainment and school / university fields for each education entry.');
          setSavingSection('');
          return;
        }

        const monthNumber = (value) => MONTH_OPTIONS.indexOf(value) + 1;
        const invalidYearEntry = nextEducationEntries.find((entry) => {
          const startYear = Number(entry.startYear || 0);
          const endYear = Number(entry.endYear || 0);
          if (startYear && endYear && startYear > endYear) return true;
          if (startYear && endYear && startYear === endYear && entry.startMonth && entry.endMonth) {
            return monthNumber(entry.startMonth) > monthNumber(entry.endMonth);
          }
          return false;
        });
        if (invalidYearEntry) {
          setError('From date cannot be later than To date.');
          setSavingSection('');
          return;
        }

        const primaryEducation = nextEducationEntries[0] || {};

        payload = {
          jobSeekerProfile: {
            educationEntries: nextEducationEntries,
            campus: primaryEducation.school || primaryEducation.campus || drafts.campus,
            course: drafts.course,
            yearGraduated: primaryEducation.endYear || primaryEducation.yearGraduated || drafts.yearGraduated,
            educationalAttainment: primaryEducation.educationalAttainment || primaryEducation.level || drafts.educationalAttainment,
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
          const updatedProfile = response.data.user?.jobSeekerProfile || {};
          const nextEducationEntries =
            updatedProfile.educationEntries ||
            payload.jobSeekerProfile?.educationEntries ||
            [];

          const nextFormData = {
            ...formData,
            educationEntries: nextEducationEntries,
            campus: updatedProfile.campus || payload.jobSeekerProfile?.campus || formData.campus,
            course: updatedProfile.course || payload.jobSeekerProfile?.course || formData.course,
            yearGraduated: updatedProfile.yearGraduated || payload.jobSeekerProfile?.yearGraduated || formData.yearGraduated,
            educationalAttainment: updatedProfile.educationalAttainment || payload.jobSeekerProfile?.educationalAttainment || formData.educationalAttainment,
            studyField: updatedProfile.studyField || payload.jobSeekerProfile?.studyField || formData.studyField,
          };

          const nextDrafts = resetEducationDraftFields(nextFormData);

          setFormData(nextFormData);
          setDrafts(nextDrafts);
        } else if (MORE_PROFILE_TAB_KEYS.includes(sectionKey)) {
          const nextItems =
            response.data.user?.jobSeekerProfile?.[sectionKey] ||
            payload.jobSeekerProfile?.[sectionKey] ||
            [];

          setFormData((prev) => ({ ...prev, [sectionKey]: nextItems }));
          setDrafts((prev) => ({ ...prev, [sectionKey]: nextItems }));
        } else if (sectionKey === 'career') {
          const nextTechnicalSkills = normalizeSkillsFromProfile(payload.jobSeekerProfile?.technicalSkills);
          const nextSkillRows = normalizeSkillRows(nextTechnicalSkills);

          setFormData((prev) => ({
            ...prev,
            ...drafts,
            technicalSkills: nextTechnicalSkills,
            softSkills: [],
            skillRows: nextSkillRows,
          }));
          setDrafts((prev) => ({
            ...prev,
            ...drafts,
            technicalSkills: nextTechnicalSkills,
            softSkills: [],
            skillRows: nextSkillRows,
          }));
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


  const openProfileEditModal = (sectionKey) => {
    if (sectionKey === 'personal') {
      setDrafts(formData);
      setEditing((prev) => ({ ...prev, basic: true }));
      return;
    }

    if (sectionKey === 'work') {
      if (workExperiences.length > 0) {
        openEditWorkExperienceModal(workExperiences[0]);
      } else {
        openAddWorkExperienceModal();
      }
      return;
    }

    if (sectionKey === 'credentials') return;

    if (sectionKey === 'skills') {
      setDrafts((prev) => ({
        ...prev,
        ...formData,
        skillRows: normalizeSkillRows([
          ...(formData.technicalSkills || []),
          ...(formData.softSkills || []),
        ], true),
      }));
      setEditModalSection(sectionKey);
      return;
    }

    if (sectionKey === 'education') {
      setDrafts((prev) => ({
        ...prev,
        ...formData,
        educationEntries: buildEducationDraftEntries(formData),
      }));
      setEditModalSection(sectionKey);
      return;
    }

    setDrafts((prev) => {
      const next = { ...formData };

      if (MORE_PROFILE_TAB_KEYS.includes(sectionKey)) {
        const currentItems = Array.isArray(formData[sectionKey]) ? formData[sectionKey] : [];
        next[sectionKey] = currentItems.length > 0 ? currentItems : [createEmptyProfileEntry(sectionKey)];
      }

      return next;
    });

    setEditModalSection(sectionKey);
  };

  const closeProfileEditModal = () => {
    setDrafts(formData);
    setError('');
    setEditModalSection('');
  };

  const saveProfileEditModal = async () => {
    if (!editModalSection) return;
    await saveSection(editModalSection === 'skills' ? 'career' : editModalSection);
    setEditModalSection('');
  };

  const handleArrayTextChange = (field, rawValue) => {
    const nextValues = String(rawValue || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    setDrafts((prev) => ({ ...prev, [field]: nextValues }));
  };

  const handleSkillRowChange = (index, field, value) => {
    setDrafts((prev) => {
      const rows = normalizeSkillRows(prev.skillRows || [
        ...(prev.technicalSkills || []),
        ...(prev.softSkills || []),
      ], true);

      return {
        ...prev,
        skillRows: rows.map((item, itemIndex) =>
          itemIndex === index ? { ...item, [field]: value } : item
        ),
      };
    });
  };

  const addSkillRow = () => {
    setDrafts((prev) => ({
      ...prev,
      skillRows: [
        ...normalizeSkillRows(prev.skillRows || [
          ...(prev.technicalSkills || []),
          ...(prev.softSkills || []),
        ], true),
        { skill: '', proficiency: DEFAULT_PROFICIENCY_LEVEL },
      ],
    }));
  };

  const removeSkillRow = (index) => {
    setDrafts((prev) => {
      const rows = normalizeSkillRows(prev.skillRows || [
        ...(prev.technicalSkills || []),
        ...(prev.softSkills || []),
      ], true).filter((_, itemIndex) => itemIndex !== index);

      return {
        ...prev,
        skillRows: rows.length ? rows : [{ skill: '', proficiency: DEFAULT_PROFICIENCY_LEVEL }],
      };
    });
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

  const addEducationEntry = () => {
    setDrafts((prev) => ({
      ...prev,
      educationEntries: [
        ...normalizeEducationEntries(prev.educationEntries || [], true),
        createEmptyEducationEntry(),
      ],
    }));
  };

  const removeEducationEntry = (index) => {
    setDrafts((prev) => {
      const nextEntries = normalizeEducationEntries(prev.educationEntries || [], true)
        .filter((_, itemIndex) => itemIndex !== index);

      return {
        ...prev,
        educationEntries: nextEntries.length ? nextEntries : [createEmptyEducationEntry()],
      };
    });
  };

  const updateEducationEntry = (index, field, value) => {
    setDrafts((prev) => ({
      ...prev,
      educationEntries: normalizeEducationEntries(prev.educationEntries || [], true).map((item, itemIndex) => {
        if (itemIndex !== index) return item;

        const nextItem = { ...item, [field]: value };
        if (field === 'level') nextItem.educationalAttainment = value;
        if (field === 'school') nextItem.campus = value;
        if (field === 'endYear') nextItem.yearGraduated = value;

        if (['startMonth', 'startYear', 'endMonth', 'endYear'].includes(field)) {
          const normalizedDate = normalizeRangeDateParts({
            fromMonth: nextItem.startMonth,
            fromYear: nextItem.startYear,
            toMonth: nextItem.endMonth,
            toYear: nextItem.endYear || nextItem.yearGraduated,
          });

          nextItem.startMonth = normalizedDate.fromMonth;
          nextItem.startYear = normalizedDate.fromYear;
          nextItem.endMonth = normalizedDate.toMonth;
          nextItem.endYear = normalizedDate.toYear;
          nextItem.yearGraduated = normalizedDate.toYear;
        }

        return nextItem;
      }),
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
    setOpenTabs((prev) => (prev.includes(sectionKey) ? prev : [...prev, sectionKey]));
    setAddSectionsModalOpen(false);
  };

  useEffect(() => {
    if (!moreSectionMenuOpen) return undefined;

    const closeMenu = () => setMoreSectionMenuOpen('');
    document.addEventListener('mousedown', closeMenu);
    document.addEventListener('touchstart', closeMenu);

    return () => {
      document.removeEventListener('mousedown', closeMenu);
      document.removeEventListener('touchstart', closeMenu);
    };
  }, [moreSectionMenuOpen]);

  const handleDeleteMoreSection = (sectionKey) => {
    const sectionTitle = MORE_PROFILE_SECTIONS[sectionKey]?.title || 'Section';
    setMoreSectionMenuOpen('');

    setConfirmState({
      open: true,
      title: `Delete ${sectionTitle}?`,
      message: `This will remove all saved data under ${sectionTitle}. This action will also update your database.`,
      confirmText: 'Delete Section',
      cancelText: 'Cancel',
      tone: 'danger',
      onConfirmAction: async () => {
        try {
          setSavingSection(sectionKey);
          setError('');

          const token = localStorage.getItem('token');
          const payload = {
            jobSeekerProfile: {
              [sectionKey]: [],
            },
          };

          const response = await axios.put(`${API_BASE}/auth/update-profile`, payload, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (response.data?.success) {
            setFormData((prev) => ({ ...prev, [sectionKey]: [] }));
            setDrafts((prev) => ({ ...prev, [sectionKey]: [] }));
            setAddedMoreSections((prev) => prev.filter((key) => key !== sectionKey));
            setOpenTabs((prev) => prev.filter((key) => key !== sectionKey));
            setEditing((prev) => ({ ...prev, [sectionKey]: false }));
            setEditModalSection((current) => (current === sectionKey ? '' : current));

            if (response.data.user) {
              setUserData(response.data.user);
              localStorage.setItem('user', JSON.stringify(response.data.user));
            }

            showSuccess('Deleted Successfully', `${sectionTitle} has been removed.`);
          }
        } catch (err) {
          console.error(err);
          setError(err.response?.data?.message || `Failed to delete ${sectionTitle}.`);
        } finally {
          setSavingSection('');
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
    { type: 'sss', title: 'SSS', icon: <FaFileAlt className="text-sm" /> },
    { type: 'diploma', title: 'Diploma', icon: <FaFileAlt className="text-sm" /> },
    { type: 'tin', title: 'TIN', icon: <FaFileAlt className="text-sm" /> },
    { type: 'validId', title: 'Valid ID', icon: <FaShieldAlt className="text-sm" /> },
    { type: 'tor', title: 'TOR', icon: <FaFileAlt className="text-sm" /> },
    { type: 'philhealth', title: 'PhilHealth', icon: <FaFileAlt className="text-sm" /> },
    { type: 'pagibig', title: 'Pag-IBIG', icon: <FaFileAlt className="text-sm" /> },
  ];

  const uploadedRequiredCount = REQUIRED_DOC_TYPES.filter((key) => verificationDocs[key]?.url).length;


  const renderAccordionContent = (sectionKey) => {
    const textOrEmpty = (value, empty = '') => (String(value || '').trim() ? value : empty);
    const renderEmptyLine = (message) => (
      <div className="px-0 pb-4 text-[14px] italic text-gray-500">
        {message}
      </div>
    );
    const profileImageUrl = getProfileImageUrl(userData?.profileImage || formData.profileImage || '');

    if (sectionKey === 'personal') {
      return (
        <div className="px-0 pb-8 pt-5 text-center">
          <div className="flex items-start justify-center gap-8">
            <div className="flex-1 min-w-0">
              <h1 className="font-serif text-[26px] sm:text-[34px] leading-tight font-bold tracking-[0.22em] uppercase text-[#111827]">
                {fullName || 'YOUR NAME'}
              </h1>
              <div className="mt-2 font-serif text-[13px] text-gray-900">
                {[buildAddressString(formData), formData.email, formData.phoneNumber].filter(Boolean).join(' • ') || 'Complete your basic information to get started.'}
              </div>
              <div className="mt-2 font-serif italic text-[13px] text-gray-500">
                {[formData.course, formData.yearGraduated ? `Class of ${formData.yearGraduated}` : ''].filter(Boolean).join(', ')}
              </div>
            </div>

            <div className="hidden sm:flex w-[92px] h-[92px] bg-[#1f2430] text-white items-center justify-center font-serif text-[28px] font-bold shrink-0 overflow-hidden">
              {profileImageUrl ? (
                <img
                  src={profileImageUrl}
                  alt={fullName || 'Profile photo'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>
                  {(formData.firstName?.[0] || 'U').toUpperCase()}{(formData.lastName?.[0] || '').toUpperCase()}
                </span>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (sectionKey === 'about') {
      return formData.aboutMe ? (
        <div className="px-0 pb-5 pt-2 font-serif text-[13px] leading-5 text-gray-900 text-justify">
          {formData.aboutMe}
        </div>
      ) : renderEmptyLine(EMPTY_SECTION_MESSAGES.about);
    }

    if (sectionKey === 'career') {
      const salaryText = [formData.minimumSalary, formData.maximumSalary].filter(Boolean).join(' - ');
      const hasCareerData = [
        formData.preferredWorkMode,
        formData.employmentType,
        salaryText,
        formData.height,
        formData.willingToRelocate,
        formData.weight,
        formData.howSoonCanYouStart,
        formData.nationality,
        formData.preferredLanguage,
        formData.gender,
        formData.educationalAttainment,
        formData.civilStatus,
        formData.studyField || formData.course,
        formData.birthday,
      ].some((value) => String(value || '').trim());

      if (!hasCareerData) return renderEmptyLine(EMPTY_SECTION_MESSAGES.career);

      return (
        <div className="px-0 pb-5 pt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-16 gap-y-1 font-serif text-[13px] leading-5 text-gray-900">
          <div><b>Preferred Work Mode:</b> {textOrEmpty(formData.preferredWorkMode, 'Not provided')}</div>
          <div><b>Salary:</b> {salaryText || 'Not provided'}</div>
          <div><b>Employment Type:</b> {textOrEmpty(formData.employmentType, 'Not provided')}</div>
          <div><b>Height:</b> {formatDisplayHeight(formData.height)}</div>
          <div><b>Willing to Relocate:</b> {textOrEmpty(formData.willingToRelocate, 'Not provided')}</div>
          <div><b>Weight:</b> {formatDisplayWeight(formData.weight)}</div>
          <div><b>How Soon Can Start:</b> {textOrEmpty(formData.howSoonCanYouStart, 'Not provided')}</div>
          <div><b>Nationality:</b> {textOrEmpty(formData.nationality, 'Not provided')}</div>
          <div><b>Preferred Language:</b> {textOrEmpty(formData.preferredLanguage, 'Not provided')}</div>
          <div><b>Gender:</b> {textOrEmpty(formData.gender, 'Not provided')}</div>
          <div><b>Educational Attainment:</b> {textOrEmpty(formData.educationalAttainment, 'Not provided')}</div>
          <div><b>Civil Status:</b> {textOrEmpty(formData.civilStatus, 'Not provided')}</div>
          <div><b>Double Degree:</b> {textOrEmpty(formData.studyField || formData.course, 'Not provided')}</div>
          <div><b>Birthday:</b> {textOrEmpty(formData.birthday, 'Not provided')}</div>
        </div>
      );
    }

    if (sectionKey === 'work') {
      if (workExperienceLoading) return <div className="pb-5"><Spinner size="small" /></div>;
      if (!workExperiences.length) return renderEmptyLine(EMPTY_SECTION_MESSAGES.work);
      return (
        <div className="px-0 pb-5 pt-2 space-y-4 font-serif text-[13px] leading-5 text-gray-900">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={openAddWorkExperienceModal}
              className="inline-flex items-center gap-2 rounded-lg border border-[#d8e2ee] bg-white px-3 py-2 text-xs font-bold text-[#2e66a6] hover:bg-[#f7faff]"
            >
              <FaPlus className="text-[10px]" />
              Add Work Experience
            </button>
          </div>

          {workExperiences.map((item, index) => {
            const dateText = [item.startDate ? String(item.startDate).slice(0, 10) : '', item.isPresent ? 'Present' : item.endDate ? String(item.endDate).slice(0, 10) : ''].filter(Boolean).join(' – ');
            const descriptionLines = String(item.description || '').split('\n').map((line) => line.trim()).filter(Boolean);
            return (
              <div key={item._id || item.id || `work-${index}`} className="rounded-xl border border-gray-200 bg-white px-4 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="font-bold">{item.companyName || 'Company Name'}</div>
                    <div className="italic">{item.positionTitle || 'Position'}</div>
                  </div>
                  <div className="flex flex-col items-start gap-2 sm:items-end shrink-0">
                    <div className="italic text-gray-700">{dateText}</div>
                    <div className="flex items-center gap-2 font-sans">
                      <button
                        type="button"
                        onClick={() => openEditWorkExperienceModal(item)}
                        className="rounded-lg border border-[#d8e2ee] bg-white px-3 py-1.5 text-xs font-bold text-[#2e66a6] hover:bg-[#f7faff]"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteWorkExperience(item)}
                        className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
                {descriptionLines.length ? (
                  <ul className="list-disc pl-7 mt-2 space-y-1">
                    {descriptionLines.map((line, lineIndex) => <li key={lineIndex}>{line}</li>)}
                  </ul>
                ) : null}
              </div>
            );
          })}
        </div>
      );
    }

    if (sectionKey === 'skills') {
      const allSkills = [...(formData.technicalSkills || []), ...(formData.softSkills || [])]
        .map((item) => String(item || '').trim())
        .filter(Boolean);
      return allSkills.length ? (
        <div className="px-0 pb-5 pt-2 font-serif text-[13px] leading-5 text-gray-900">
          <div className="space-y-1">
            {allSkills.map((item, index) => (
              <div key={`skill-display-${index}`}><b>{item}</b></div>
            ))}
          </div>
        </div>
      ) : renderEmptyLine(EMPTY_SECTION_MESSAGES.skills);
    }

    if (sectionKey === 'education') {
      const items = hasEducationEntries ? educationEntries : [{
        school: formData.eduSchool || formData.campus,
        campus: formData.eduSchool || formData.campus,
        level: formData.eduEducationalAttainment || formData.educationalAttainment,
        educationalAttainment: formData.eduEducationalAttainment || formData.educationalAttainment,
        startMonth: formData.eduStartMonth,
        startYear: formData.eduStartYear,
        endMonth: formData.eduEndMonth,
        endYear: formData.eduEndYear || formData.yearGraduated,
        description: formData.eduDescription,
      }];
      const hasAny = items.some((item) => item.school || item.campus || item.level || item.educationalAttainment || item.startMonth || item.startYear || item.endMonth || item.endYear || item.description);
      if (!hasAny) return renderEmptyLine(EMPTY_SECTION_MESSAGES.education);
      return (
        <div className="px-0 pb-5 pt-2 space-y-3 font-serif text-[13px] leading-5 text-gray-900">
          {items.map((item, index) => (
            <div key={item._id || `education-${index}`} className="flex justify-between gap-4">
              <div>
                <div className="font-bold">{item.school || item.campus || 'School / University'}</div>
                <div className="italic">{item.educationalAttainment || item.level || 'Educational Attainment'}</div>
                {item.description ? <div className="mt-1 text-gray-700">{item.description}</div> : null}
              </div>
              <div className="italic text-gray-700 shrink-0">{getEducationYearText(item)}</div>
            </div>
          ))}
        </div>
      );
    }

    if (sectionKey === 'credentials') {
      return (
        <div className="px-0 pb-6 pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {documentConfig.map((doc) => {
            const docData = verificationDocs[doc.type] || {};
            return (
              <CredentialItem
                key={doc.type}
                docType={doc.type}
                title={doc.title}
                uploaded={Boolean(docData.url)}
                icon={doc.icon}
                onUpload={(file) => handleVerificationUpload(doc.type, file)}
                uploading={Boolean(uploadingDocs[doc.type])}
                fileName={docData.filename}
                fileUrl={docData.url}
                popoverOpen={activeCredentialPopover === doc.type}
                onOpen={() => setActiveCredentialPopover(doc.type)}
                onClose={() => setActiveCredentialPopover('')}
              />
            );
          })}
        </div>
      );
    }

    if (MORE_PROFILE_TAB_KEYS.includes(sectionKey)) {
      const config = MORE_PROFILE_SECTIONS[sectionKey];
      const items = Array.isArray(formData[sectionKey]) ? formData[sectionKey] : [];
      if (!items.length) return renderEmptyLine(EMPTY_SECTION_MESSAGES[sectionKey] || config.emptyTitle || 'No data added yet.');
      return (
        <div className="px-0 pb-5 pt-2 space-y-3 font-serif text-[13px] leading-5 text-gray-900">
          {items.map((item, index) => {
            const dateText = formatProfileEntryDate(item);
            const subLine = getProfileEntrySubLine(sectionKey, item);
            return (
              <div key={item._id || `${sectionKey}-${index}`}>
                <div className="flex justify-between gap-4">
                  <div>
                    <div className="font-bold">{getProfileEntryTitle(sectionKey, item)}</div>
                    {subLine ? <div className="italic">{subLine}</div> : null}
                    {sectionKey === 'references' ? (
                      <div className="mt-1 text-gray-700">{[item.phone, item.email].filter(Boolean).join(' • ')}</div>
                    ) : null}
                  </div>
                  {dateText ? <div className="italic text-gray-700 shrink-0">{dateText}</div> : null}
                </div>
                {item.description ? <div className="mt-2">{item.description}</div> : null}
              </div>
            );
          })}
        </div>
      );
    }

    return null;
  };

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
        onDelete={() => {
          const selectedWorkExperience = workExperiences.find((item) => (item?._id || item?.id) === editingWorkExperienceId);
          if (selectedWorkExperience) {
            handleDeleteWorkExperience(selectedWorkExperience);
          }
        }}
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
        yearOptions={yearOptions}
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

      <SkillProficiencyDescriptionModal
        open={skillProficiencyModalOpen}
        onClose={() => setSkillProficiencyModalOpen(false)}
      />

      <ProfileEditModal
        open={Boolean(editModalSection)}
        sectionKey={editModalSection}
        drafts={drafts}
        saving={savingSection === editModalSection || (editModalSection === 'skills' && savingSection === 'career')}
        error={error}
        yearOptions={yearOptions}
        onChange={handleLocalChange}
        onArrayTextChange={handleArrayTextChange}
        onSkillRowChange={handleSkillRowChange}
        onAddSkillRow={addSkillRow}
        onRemoveSkillRow={removeSkillRow}
        onOpenSkillProficiencyDescription={() => setSkillProficiencyModalOpen(true)}
        onAddEducationEntry={addEducationEntry}
        onRemoveEducationEntry={removeEducationEntry}
        onChangeEducationEntry={updateEducationEntry}
        onSave={saveProfileEditModal}
        onClose={closeProfileEditModal}
        onAddProfileItem={addProfileListItem}
        onRemoveProfileItem={removeProfileListItem}
        onChangeProfileItem={updateProfileListItem}
      />

      <div className={`min-h-[100dvh] h-auto bg-transparent overflow-x-hidden overflow-y-visible ${isApplyFlow ? 'pb-28 sm:pb-32' : 'pb-6'}`}>
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          {error ? <Alert type="error" title="Error" message={error} onClose={() => setError('')} /> : null}

          {isApplyFlow && applyJob ? (
            <div className="mb-4 rounded-2xl border border-[#d8e2ee] bg-[#f7faff] px-4 py-3 text-sm text-black/65 shadow-sm">
              Applying for <span className="font-semibold text-black">{applyJob.title || 'Job Title'}</span>
            </div>
          ) : null}

          <div className="bg-transparent overflow-visible">
            <div className="relative z-0 w-full max-w-full px-0 pt-0 pb-10">
              <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1040px)] justify-center gap-10 items-start">
                <div className="bg-white border border-[#d8e2ee] rounded-[18px] shadow-[0_8px_30px_rgba(46,102,166,0.10)] min-h-[760px] px-6 sm:px-10 lg:px-14 py-10">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
                    <div>
                      <h2 className="text-[22px] font-bold text-gray-900 sr-only">Profile</h2>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={handlePreviewResume}
                        className="h-10 px-4 rounded-md bg-white text-gray-500 text-sm font-semibold inline-flex items-center gap-2 hover:bg-gray-50"
                      >
                        <FaEye className="text-xs" />
                        Preview
                      </button>

                      <button
                        type="button"
                        onClick={handleDownloadResume}
                        className="h-10 px-4 rounded-md bg-[#2e66a6] text-white text-sm font-bold inline-flex items-center gap-2 hover:bg-[#255484]"
                      >
                        <FaDownload className="text-xs" />
                        Download CV
                      </button>

                      <button
                        type="button"
                        onClick={() => setAddSectionsModalOpen(true)}
                        className="h-10 px-4 rounded-md border border-[#d8e2ee] bg-white text-black font-semibold inline-flex items-center justify-center gap-2 hover:bg-[#f7faff]"
                      >
                        <FaPlus className="text-sm" />
                        Add Sections
                      </button>
                    </div>
                  </div>

                  <div className="bg-white">
                    {[
                      { key: 'personal', label: 'Basic Information', actionLabel: 'EDIT' },
                      { key: 'about', label: 'Objective', actionLabel: formData.aboutMe ? 'EDIT' : 'ADD' },
                      { key: 'career', label: 'Availability & Preferences', actionLabel: 'ADD' },
                      { key: 'work', label: 'Work Experience', actionLabel: workExperiences.length ? 'EDIT' : 'ADD' },
                      { key: 'skills', label: 'Skills', actionLabel: 'ADD' },
                      { key: 'education', label: 'Education', actionLabel: (hasEducationEntries || formData.campus || formData.course || formData.yearGraduated) ? 'EDIT' : 'ADD' },
                      { key: 'credentials', label: 'Credentials', actionLabel: '' },
                      ...addedMoreSections.map((key) => ({ key, label: MORE_PROFILE_SECTIONS[key]?.title || key, actionLabel: (formData[key] || []).length ? 'EDIT' : 'ADD' })),
                    ].map((section) => {
                      const targetTab = section.key === 'about' ? 'about' : section.key === 'work' ? 'work' : section.key === 'skills' ? 'skills' : section.key;
                      const isOpen = openTabs.includes(targetTab);
                      const isMoreProfileSection = MORE_PROFILE_TAB_KEYS.includes(section.key);

                      return (
                        <div key={section.key} className="w-full bg-white">
                          <div className="w-full min-h-[44px] px-1 border-b border-gray-200 flex items-center justify-between gap-4 text-left bg-white">
                            <button
                              type="button"
                              onClick={() => {
                                setOpenTabs((currentTabs) =>
                                  currentTabs.includes(targetTab)
                                    ? currentTabs.filter((tab) => tab !== targetTab)
                                    : [...currentTabs, targetTab]
                                );
                              }}
                              className="flex-1 min-h-[44px] inline-flex items-center gap-3 min-w-0 text-left"
                            >
                              <span className="w-5 h-5 inline-flex items-center justify-center text-gray-500 shrink-0">
                                <svg
                                  className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                                  viewBox="0 0 20 20"
                                  fill="none"
                                  xmlns="http://www.w3.org/2000/svg"
                                  aria-hidden="true"
                                >
                                  <path
                                    d="M5 7.5L10 12.5L15 7.5"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              </span>
                              <span className="font-serif text-[16px] font-bold uppercase tracking-wide text-gray-900 truncate">{section.label}</span>
                            </button>

                            <div className="relative flex items-center gap-3 shrink-0">
                              {section.key === 'skills' ? (
                                <button
                                  type="button"
                                  onClick={() => setSkillProficiencyModalOpen(true)}
                                  className="hidden sm:inline-flex items-center gap-1 text-[#2e66a6] text-sm hover:underline"
                                  aria-haspopup="dialog"
                                >
                                  <FaInfoCircle className="text-sm" /> Proficiency Level Description
                                </button>
                              ) : null}
                              {section.actionLabel ? (
                                <button
                                  type="button"
                                  onClick={() => openProfileEditModal(section.key)}
                                  className="h-9 px-2 text-[#2e66a6] text-sm font-bold shrink-0 hover:underline"
                                >
                                  {section.actionLabel}
                                </button>
                              ) : null}
                              {isMoreProfileSection ? (
                                <div
                                  className="relative"
                                  onMouseDown={(event) => event.stopPropagation()}
                                  onTouchStart={(event) => event.stopPropagation()}
                                >
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.preventDefault();
                                      event.stopPropagation();
                                      setMoreSectionMenuOpen((current) => (current === section.key ? '' : section.key));
                                    }}
                                    className="h-8 w-7 rounded-md text-gray-400 hover:bg-gray-50 hover:text-gray-700 inline-flex items-center justify-center text-[22px] leading-none"
                                    aria-label={`More options for ${section.label}`}
                                    aria-haspopup="menu"
                                    aria-expanded={moreSectionMenuOpen === section.key}
                                  >
                                    ⋮
                                  </button>

                                  {moreSectionMenuOpen === section.key ? (
                                    <div
                                      className="absolute right-0 top-9 z-[120] w-[150px] rounded-md border border-gray-200 bg-white py-2 shadow-lg"
                                      role="menu"
                                      onClick={(event) => event.stopPropagation()}
                                    >
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteMoreSection(section.key)}
                                        disabled={savingSection === section.key}
                                        className="w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-red-50 disabled:opacity-60"
                                        role="menuitem"
                                      >
                                        Delete Section
                                      </button>
                                    </div>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>
                          </div>
                          {isOpen ? renderAccordionContent(section.key) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>


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