import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import JobSeekerLayout from '../../../layouts/JobSeekerLayout';
import ProfileMoreDropdown from '../../../components/jobseeker/ProfileMoreDropdown';
import { openResumePrintWindow } from '../../../components/shared/resumePrintTemplate';
import {
  OPTIONAL_RESUME_SECTION_KEYS,
  normalizeAddedResumeSections,
} from '../../../components/shared/resumeDisplayUtils';
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
  FaBold,
  FaItalic,
  FaUnderline,
  FaListOl,
  FaListUl,
  FaAlignLeft,
  FaAlignCenter,
  FaAlignRight,
  FaAlignJustify,
  FaChevronDown,
} from 'react-icons/fa';

const COLORS = {
  primary: '#2e66a6',
  border: '#d8e2ee',
  textPrimary: '#000000',
  textSecondary: '#4b5563',
  muted: '#8a95a3',
  bg: '#ffffff',
};

const JOB_SEEKER_LEVEL_BADGES = {
  'First Time Job Seeker': '/images/Firstime.png',
  Intermediate: '/images/Intermediate.png',
  Expert: '/images/Expert.png',
  Pro: '/images/Pro.png',
  Legend: '/images/Legend.png',
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
  'Contractual',
  'Permanent',
];

const WILLING_TO_RELOCATE_OPTIONS = [
  'Yes',
  'No',
  'Open to discuss',
];

const HOW_SOON_CAN_START_OPTIONS = [
  'Ready to start',
  'Within a few days',
  'Within 1 week',
  'Within 2 week',
  'Within a month',
];

const EXPERIENCE_OPTIONS = [
  'No Experience',
  'Less than 1 Year',
  '1-3 Years Experience',
  '4-5 Years Experience',
  '6+ Years Experience',
];

const GENDER_OPTIONS = [
  'Male',
  'Female',
  'Prefer not to say',
];

const CIVIL_STATUS_OPTIONS = [
  'Single',
  'Married',
  'Divorced',
  'Legally Separated',
  'Prefer not to say',
];

const SALARY_PRIVACY_OPTIONS = [
  {
    value: 'limited',
    label: 'Limited',
    description: 'Only companies you applied to can see your salary.',
    icon: '▦',
  },
  {
    value: 'only_me',
    label: 'Only Me',
    description: 'Only you can see your salary information.',
    icon: '🔒',
  },
];

const normalizeSalaryDigits = (value = '') =>
  String(value || '').replace(/[^\d]/g, '');

const formatSalaryInput = (value = '') => {
  const digits = normalizeSalaryDigits(value);
  return digits ? Number(digits).toLocaleString('en-US') : '';
};

const normalizeEmploymentTypeValue = (value = '') => {
  const clean = String(value || '').trim();
  const normalized = clean.toLowerCase();

  if (normalized === 'contract') return 'Contractual';
  if (normalized === 'full-time') return 'Full time';
  if (normalized === 'part-time') return 'Part time';

  return EMPLOYMENT_TYPE_OPTIONS.includes(clean) ? clean : '';
};

const normalizeExperienceValue = (value = '') => {
  const normalized = String(value || '').trim().toLowerCase();

  if (!normalized) return '';
  if (['no experience', 'no experience required'].includes(normalized)) {
    return 'No Experience';
  }
  if (
    ['less than 1 year', 'less than 1 yr', 'less than 1 year experience'].includes(
      normalized
    )
  ) {
    return 'Less than 1 Year';
  }
  if (
    [
      '1-2 years',
      '2-3 years',
      '1-3 years',
      '1-3 years experience',
      '1 year',
      '2 years',
      '3 years',
    ].includes(normalized)
  ) {
    return '1-3 Years Experience';
  }
  if (
    [
      '3-5 years',
      '4-5 years',
      '4-5 years experience',
      '4 years',
      '5 years',
    ].includes(normalized)
  ) {
    return '4-5 Years Experience';
  }
  if (
    ['5+ years', '6+ years', '6+ years experience', '6 years'].includes(normalized)
  ) {
    return '6+ Years Experience';
  }

  return EXPERIENCE_OPTIONS.find(
    (option) => option.toLowerCase() === normalized
  ) || '';
};

const normalizeEducationalAttainmentValue = (value = '') => {
  const normalized = String(value || '').trim().toLowerCase();

  if (
    [
      "bachelor’s / college degree graduate's",
      "bachelor's / college degree graduate's",
      'bachelor / college degree',
      "bachelor (honor's)",
    ].includes(normalized)
  ) {
    return "Bachelor’s / College degree graduate's";
  }
  if (['master’s degree', "master's degree", 'masters degree'].includes(normalized)) {
    return 'Master’s degree';
  }
  if (
    ['doctorate degree', 'doctorate degree / (phd)', 'doctorate degree / (ph.d.)'].includes(
      normalized
    )
  ) {
    return 'Doctorate Degree';
  }

  return '';
};

const normalizeCivilStatusValue = (value = '') => {
  const clean = String(value || '').trim();
  const normalized = clean.toLowerCase();

  if (normalized === 'separated') return 'Legally Separated';

  return CIVIL_STATUS_OPTIONS.find(
    (option) => option.toLowerCase() === normalized
  ) || '';
};

const PROFICIENCY_LEVEL_OPTIONS = [
  'Basic',
  'Novice',
  'Intermediate',
  'Advanced',
  'Expert',
];

const DEFAULT_PROFICIENCY_LEVEL = 'Basic';

const PROFICIENCY_LEVEL_STYLES = {
  Basic: 'border-slate-200 bg-slate-100 text-slate-600',
  Novice: 'border-sky-200 bg-sky-50 text-sky-700',
  Intermediate: 'border-amber-200 bg-amber-50 text-amber-700',
  Advanced: 'border-violet-200 bg-violet-50 text-violet-700',
  Expert: 'border-emerald-200 bg-emerald-50 text-emerald-700',
};

const getProficiencyLevelStyle = (level = DEFAULT_PROFICIENCY_LEVEL) =>
  PROFICIENCY_LEVEL_STYLES[level] || PROFICIENCY_LEVEL_STYLES[DEFAULT_PROFICIENCY_LEVEL];

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
  if (Array.isArray(raw)) {
    return raw
      .flatMap((item) => {
        if (item && typeof item === 'object') {
          const formatted = formatSkillWithProficiency(item);
          return formatted ? [formatted] : [];
        }

        const cleanItem = String(item || '').trim();
        if (!cleanItem) return [];

        if (cleanItem.includes('||')) {
          return cleanItem
            .split('||')
            .map((value) => value.trim())
            .filter(Boolean);
        }

        return [cleanItem];
      })
      .filter(Boolean);
  }

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
  return hasExistingEntries ? existingEntries : [createEmptyEducationEntry()];
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

const normalizeCourseValue = (value) => {
  const clean = String(value || '').trim();

  if (
    clean === 'BS Information Technology (Business Informatics)' ||
    clean === 'BS Information Technology (System Development)'
  ) {
    return 'BS Information Technology';
  }

  return clean;
};

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
const ADDABLE_MORE_SECTION_KEYS = OPTIONAL_RESUME_SECTION_KEYS;

const MORE_SECTION_MODAL_STYLES = {
  certifications: { icon: <FaGraduationCap />, color: '#f97316', bgColor: '#fff1e6', accentColor: COLORS.primary },
  projects: { icon: <FaFolderOpen />, color: '#22c55e', bgColor: '#eafaf0', accentColor: COLORS.primary },
  seminars: { icon: <FaBookOpen />, color: '#8b5cf6', bgColor: '#f2edff', accentColor: COLORS.primary },
  awards: { icon: <FaAward />, color: '#f59e0b', bgColor: '#fff7df', accentColor: COLORS.primary },
  affiliations: { icon: <FaUsers />, color: '#14b8a6', bgColor: '#e6fffb', accentColor: COLORS.primary },
  cocurricular: { icon: <FaWaveSquare />, color: '#ef4444', bgColor: '#fff0f0', accentColor: COLORS.primary },
  references: { icon: <FaUserCheck />, color: '#0ea5e9', bgColor: '#eaf6ff', accentColor: COLORS.primary },
};

const MORE_SECTION_DESCRIPTIONS = {
  certifications: 'Highlight certifications you’ve earned through school, training programs, or professional organizations. Include the issuing organization and date earned.',
  projects: 'Showcase the work you’ve created, contributed to, or completed—from school projects and portfolios to websites, events, research, and creative work. Give employers a glimpse of what you can bring to the team.',
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

const AutoFitProfileName = ({ children, maxFontSize = 34, minFontSize = 18 }) => {
  const containerRef = useRef(null);
  const textRef = useRef(null);
  const [fontSize, setFontSize] = useState(maxFontSize);

  useEffect(() => {
    const fitText = () => {
      const container = containerRef.current;
      const text = textRef.current;
      if (!container || !text) return;

      let nextSize = maxFontSize;
      text.style.fontSize = `${nextSize}px`;

      while (nextSize > minFontSize && text.scrollWidth > container.clientWidth) {
        nextSize -= 0.5;
        text.style.fontSize = `${nextSize}px`;
      }

      setFontSize(nextSize);
    };

    const frameId = window.requestAnimationFrame(fitText);
    window.addEventListener('resize', fitText);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', fitText);
    };
  }, [children, maxFontSize, minFontSize]);

  return (
    <div ref={containerRef} className="w-full min-w-0 overflow-hidden">
      <h1
        ref={textRef}
        className="whitespace-nowrap font-serif leading-tight font-bold tracking-[0.22em] uppercase text-[#111827]"
        style={{ fontSize: `${fontSize}px` }}
      >
        {children}
      </h1>
    </div>
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
  title = 'Are you sure you want to delete this?',
  message = 'You will not be able to recover it.',
  confirmText = 'Delete',
  cancelText = 'Cancel',
  tone = 'primary',
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;

  const confirmBg = tone === 'danger' ? COLORS.primary : COLORS.primary;

  return (
    <div className="fixed inset-0 z-[10020] flex items-center justify-center bg-black/45 px-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-[420px] overflow-hidden rounded-[6px] bg-white shadow-[0_18px_55px_rgba(0,0,0,0.35)]">
        <div className="flex items-start gap-4 px-6 py-6">
          <div className="mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center">
            <FaExclamationTriangle className="text-[42px] text-[#f4c21b]" />
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="text-[22px] font-medium leading-7 text-gray-800">{title}</h3>
            <p className="mt-1 text-[15px] leading-6 text-gray-700">{message}</p>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-200 bg-white px-5 py-4">
          <button
            type="button"
            onClick={onCancel}
            className="h-11 min-w-[92px] rounded-[4px] border border-[#0b80ff] bg-white px-5 text-[16px] font-semibold text-[#0b80ff] transition hover:bg-blue-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="h-11 min-w-[92px] rounded-[4px] px-5 text-[16px] font-semibold text-white transition hover:opacity-90"
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
  resourceTitle = 'CV/Resume',
  password,
  error,
  verifying,
  onChange,
  onClose,
  onSubmit,
}) => {
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!open) setShowPassword(false);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[10003] bg-black/35 flex items-center justify-center px-4 py-6" role="dialog" aria-modal="true">
      <div className="w-full max-w-md bg-white rounded-[24px] shadow-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between gap-3">
          <div>
            <div className="text-[20px] font-bold text-gray-900">Enter Password</div>
            <div className="text-sm text-gray-500 mt-1">
              {mode === 'preview'
                ? 'For your security, please enter your account password before previewing your CV.'
                : mode === 'credential-export'
                  ? `For your security, please enter your account password before securely previewing your ${resourceTitle}.`
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
          <div>
            <label className="block text-[11px] tracking-[0.16em] uppercase font-bold text-gray-400 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password || ''}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Enter your password"
                disabled={verifying}
                className="w-full h-12 pl-4 pr-12 rounded-xl border border-gray-200 bg-white text-gray-900 outline-none focus:ring-2 focus:ring-[#2e66a6]/20 focus:border-[#2e66a6] disabled:bg-gray-50 disabled:text-gray-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                disabled={verifying}
                className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-gray-500 transition hover:text-[#2e66a6] disabled:cursor-not-allowed disabled:opacity-50"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                <FaEye className={`text-base ${showPassword ? 'text-[#2e66a6]' : ''}`} />
              </button>
            </div>
          </div>

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
              {verifying ? (
                <Spinner size="small" />
              ) : (
                <FaEye className="text-xs" />
              )}
              {verifying
                ? mode === 'download'
                  ? 'Preparing CV...'
                  : mode === 'credential-export'
                    ? 'Preparing Preview...'
                    : 'Verifying...'
                : mode === 'preview'
                  ? 'Continue Preview'
                  : mode === 'credential-export'
                    ? 'Preview'
                    : 'Preview'}
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

const escapeRichText = (value = '') =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const normalizeRichTextValue = (value = '') => {
  const clean = String(value || '');
  if (!clean) return '';
  if (/<\/?[a-z][\s\S]*>/i.test(clean)) return clean;
  return escapeRichText(clean).replace(/\n/g, '<br>');
};

const sanitizeRichText = (value = '') => {
  const clean = String(value || '');
  if (!clean) return '';

  if (typeof window === 'undefined' || typeof window.DOMParser === 'undefined') {
    return clean;
  }

  const allowedTags = new Set([
    'B',
    'STRONG',
    'I',
    'EM',
    'U',
    'P',
    'DIV',
    'BR',
    'UL',
    'OL',
    'LI',
    'H1',
    'H2',
    'BLOCKQUOTE',
  ]);
  const textAlignmentTags = new Set(['P', 'DIV', 'UL', 'OL', 'LI', 'H1', 'H2', 'BLOCKQUOTE']);
  const allowedTextAlignments = new Set(['left', 'center', 'right', 'justify']);

  const parser = new window.DOMParser();
  const doc = parser.parseFromString(`<div>${clean}</div>`, 'text/html');
  const wrapper = doc.body.firstElementChild;
  if (!wrapper) return '';

  const cleanNode = (node) => {
    Array.from(node.childNodes).forEach((child) => {
      if (child.nodeType === window.Node.ELEMENT_NODE) {
        if (!allowedTags.has(child.tagName)) {
          child.replaceWith(...Array.from(child.childNodes));
          return;
        }

        const inlineAlignment = String(child.style?.textAlign || '').toLowerCase();
        const alignAttribute = String(child.getAttribute('align') || '').toLowerCase();
        const textAlignment = allowedTextAlignments.has(inlineAlignment)
          ? inlineAlignment
          : allowedTextAlignments.has(alignAttribute)
            ? alignAttribute
            : '';

        Array.from(child.attributes).forEach((attribute) => {
          child.removeAttribute(attribute.name);
        });

        if (textAlignment && textAlignmentTags.has(child.tagName)) {
          child.style.textAlign = textAlignment;
        }

        cleanNode(child);
      }
    });
  };

  cleanNode(wrapper);
  return wrapper.innerHTML;
};

const RichTextDisplay = ({ value, className = '' }) => {
  const html = sanitizeRichText(normalizeRichTextValue(value));

  if (!html) return null;

  return (
    <div
      className={[
        'rich-profile-text',
        '[&_h1]:text-2xl [&_h1]:font-bold [&_h1]:leading-tight',
        '[&_h2]:text-xl [&_h2]:font-bold [&_h2]:leading-tight',
        '[&_p]:my-1 [&_div]:my-1',
        '[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-1',
        '[&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-1',
        '[&_li]:my-0.5',
        '[&_blockquote]:ml-6 [&_blockquote]:border-l-2 [&_blockquote]:border-gray-300 [&_blockquote]:pl-4',
        className,
      ].join(' ')}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

const RichTextToolbarButton = ({
  title,
  children,
  onMouseDown,
  className = '',
  active = false,
  ariaExpanded,
  ariaHaspopup,
}) => (
  <button
    type="button"
    title={title}
    aria-label={title}
    aria-expanded={ariaExpanded}
    aria-haspopup={ariaHaspopup}
    onMouseDown={(event) => {
      event.preventDefault();
      onMouseDown?.();
    }}
    className={[
      'flex h-8 min-w-8 items-center justify-center rounded px-2',
      'text-[15px] font-semibold text-gray-700 transition hover:bg-gray-100',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6]/30',
      active ? 'bg-[#eaf2fb] text-[#2e66a6]' : '',
      className,
    ].join(' ')}
  >
    {children}
  </button>
);

const RICH_TEXT_ALIGNMENT_OPTIONS = [
  { command: 'justifyLeft', label: 'Align left', icon: <FaAlignLeft /> },
  { command: 'justifyCenter', label: 'Align center', icon: <FaAlignCenter /> },
  { command: 'justifyRight', label: 'Align right', icon: <FaAlignRight /> },
  { command: 'justifyFull', label: 'Justify', icon: <FaAlignJustify /> },
];

const BulletTextArea = ({
  value,
  onChange,
  placeholder = '',
  rows = 5,
  className = '',
  showToolbar = true,
}) => {
  const editorRef = useRef(null);
  const alignmentMenuRef = useRef(null);
  const savedSelectionRef = useRef(null);
  const [alignmentOpen, setAlignmentOpen] = useState(false);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const nextHtml = normalizeRichTextValue(value);
    if (document.activeElement !== editor && editor.innerHTML !== nextHtml) {
      editor.innerHTML = nextHtml;
    }
  }, [value]);

  useEffect(() => {
    if (!alignmentOpen) return undefined;

    const handleOutsideClick = (event) => {
      if (alignmentMenuRef.current && !alignmentMenuRef.current.contains(event.target)) {
        setAlignmentOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') setAlignmentOpen(false);
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [alignmentOpen]);

  const saveSelection = () => {
    const editor = editorRef.current;
    const selection = window.getSelection?.();
    if (!editor || !selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    if (editor.contains(range.commonAncestorContainer)) {
      savedSelectionRef.current = range.cloneRange();
    }
  };

  const restoreSelection = () => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.focus();

    const selection = window.getSelection?.();
    const savedRange = savedSelectionRef.current;
    if (!selection || !savedRange) return;

    selection.removeAllRanges();
    selection.addRange(savedRange);
  };

  const emitChange = () => {
    const nextValue = editorRef.current?.innerHTML || '';
    onChange?.({ target: { value: nextValue } });
  };

  const runCommand = (command, commandValue = null) => {
    restoreSelection();
    document.execCommand(command, false, commandValue);
    saveSelection();
    emitChange();
  };

  const formatHeading = (tagName) => {
    restoreSelection();
    document.execCommand('formatBlock', false, tagName);
    saveSelection();
    emitChange();
  };

  const minHeight = Math.max(112, Number(rows || 5) * 24);

  return (
    <div className="w-full">
      {showToolbar ? (
        <div className="flex min-h-12 flex-wrap items-center gap-1 border border-b-0 border-gray-300 rounded-t-[5px] bg-white px-3 py-1.5">
          <RichTextToolbarButton title="Bold" onMouseDown={() => runCommand('bold')}>
            <FaBold className="text-[14px]" />
          </RichTextToolbarButton>

          <RichTextToolbarButton title="Italic" onMouseDown={() => runCommand('italic')}>
            <FaItalic className="text-[14px]" />
          </RichTextToolbarButton>

          <RichTextToolbarButton title="Underline" onMouseDown={() => runCommand('underline')}>
            <FaUnderline className="text-[14px]" />
          </RichTextToolbarButton>

          <span className="mx-1 h-7 border-l border-gray-300" aria-hidden="true" />

          <RichTextToolbarButton title="Numbered list" onMouseDown={() => runCommand('insertOrderedList')}>
            <FaListOl className="text-[16px]" />
          </RichTextToolbarButton>

          <RichTextToolbarButton title="Bulleted list" onMouseDown={() => runCommand('insertUnorderedList')}>
            <FaListUl className="text-[16px]" />
          </RichTextToolbarButton>

          <div ref={alignmentMenuRef} className="relative">
            <RichTextToolbarButton
              title="Text alignment"
              ariaExpanded={alignmentOpen}
              ariaHaspopup="menu"
              active={alignmentOpen}
              onMouseDown={() => {
                saveSelection();
                setAlignmentOpen((current) => !current);
              }}
              className="gap-1"
            >
              <FaAlignLeft className="text-[16px]" />
              <FaChevronDown className={`text-[9px] transition-transform ${alignmentOpen ? 'rotate-180' : ''}`} />
            </RichTextToolbarButton>

            {alignmentOpen ? (
              <div
                role="menu"
                className="absolute left-0 top-full z-[10050] mt-1 w-44 overflow-hidden rounded-[5px] border border-gray-200 bg-white py-1 shadow-xl"
              >
                {RICH_TEXT_ALIGNMENT_OPTIONS.map((option) => (
                  <button
                    key={option.command}
                    type="button"
                    role="menuitem"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      runCommand(option.command);
                      setAlignmentOpen(false);
                    }}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm font-medium text-gray-700 transition hover:bg-gray-100 hover:text-[#2e66a6]"
                  >
                    <span className="flex w-5 items-center justify-center text-[16px]" aria-hidden="true">
                      {option.icon}
                    </span>
                    <span>{option.label}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <span className="mx-1 h-7 border-l border-gray-300" aria-hidden="true" />

          <RichTextToolbarButton title="Heading 1" onMouseDown={() => formatHeading('H1')}>
            <span className="text-[15px] font-bold">H1</span>
          </RichTextToolbarButton>

          <RichTextToolbarButton title="Heading 2" onMouseDown={() => formatHeading('H2')}>
            <span className="text-[15px] font-bold">H2</span>
          </RichTextToolbarButton>
        </div>
      ) : null}

      <div className="relative">
        {!value ? (
          <div className="pointer-events-none absolute left-4 top-3 text-gray-400">
            {placeholder}
          </div>
        ) : null}

        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          onInput={() => {
            saveSelection();
            emitChange();
          }}
          onBlur={emitChange}
          onFocus={saveSelection}
          onKeyUp={saveSelection}
          onMouseUp={saveSelection}
          className={[
            'w-full overflow-y-auto px-4 py-3 text-gray-900 outline-none',
            'border border-gray-300 bg-white',
            'focus:border-[#2e66a6] focus:ring-1 focus:ring-[#2e66a6]',
            '[&_h1]:text-2xl [&_h1]:font-bold',
            '[&_h2]:text-xl [&_h2]:font-bold',
            '[&_ul]:list-disc [&_ul]:pl-6',
            '[&_ol]:list-decimal [&_ol]:pl-6',
            '[&_blockquote]:ml-6 [&_blockquote]:border-l-2 [&_blockquote]:border-gray-300 [&_blockquote]:pl-4',
            className,
          ].join(' ')}
          style={{ minHeight }}
        />
      </div>
    </div>
  );
};

const TextArea = ({ label, value, onChange, placeholder = '', rows = 4 }) => {
  return (
    <div>
      <label className="block text-[11px] tracking-[0.16em] uppercase font-bold text-gray-400 mb-2">{label}</label>
      <BulletTextArea
        rows={rows}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="rounded-b-xl resize-none"
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
        <option value="" disabled={Boolean(value)}>{placeholder}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
};

const SalaryPrivacySelect = ({ value = 'only_me', onChange }) => {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const selected = SALARY_PRIVACY_OPTIONS.find((option) => option.value === value)
    || SALARY_PRIVACY_OPTIONS[1];

  useEffect(() => {
    if (!open) return undefined;

    const handleOutsideClick = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  return (
    <div ref={wrapperRef} className="relative">
      <label className="block text-[11px] tracking-[0.16em] uppercase font-bold text-gray-400 mb-2">
        Salary Privacy
      </label>

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="w-full min-h-12 px-4 rounded-xl border border-gray-200 bg-white text-left outline-none focus:ring-2 focus:ring-[#2e66a6]/20 focus:border-[#2e66a6] flex items-center justify-between gap-3"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="text-lg leading-none" aria-hidden="true">{selected.icon}</span>
          <span className="min-w-0">
            <span className="block text-[15px] font-semibold text-gray-900">{selected.label}</span>
            <span className="block truncate text-xs text-gray-500">{selected.description}</span>
          </span>
        </span>
        <span className={`text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true">⌄</span>
      </button>

      {open ? (
        <div
          role="listbox"
          className="absolute z-[10040] mt-2 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl"
        >
          {SALARY_PRIVACY_OPTIONS.map((option) => {
            const active = option.value === selected.value;

            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onChange?.(option.value);
                  setOpen(false);
                }}
                className={`w-full px-4 py-3 text-left flex items-start gap-3 transition ${
                  active ? 'bg-blue-50' : 'bg-white hover:bg-gray-50'
                }`}
              >
                <span className="mt-0.5 text-lg leading-none" aria-hidden="true">{option.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold text-gray-900">{option.label}</span>
                  <span className="mt-0.5 block text-xs leading-5 text-gray-500">{option.description}</span>
                </span>
                {active ? <span className="mt-1 font-bold text-[#2e66a6]" aria-hidden="true">✓</span> : null}
              </button>
            );
          })}
        </div>
      ) : null}
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
  onProtectedAction,
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

  const getCredentialPreviewUrl = () => {
    const apiBase = process.env.REACT_APP_API_URL || 'https://phinmaau-job-portal-atlas.onrender.com/api';
    return `${apiBase}/auth/credential/preview/${encodeURIComponent(docType)}`;
  };

  const handleExportFile = async (verifiedPassword) => {
    if (!fileUrl) return;

    const token = localStorage.getItem('token');
    const response = await axios.post(
      getCredentialPreviewUrl(),
      { password: verifiedPassword },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.data?.previewUrl) {
      throw new Error('Credential preview is unavailable.');
    }

    window.open(response.data.previewUrl, '_blank', 'noopener,noreferrer');
    return true;
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
          <div className="text-[12px] leading-5 text-black/65">
            {uploaded
              ? `Uploaded ${title}. You can securely preview and export this credential.`
              : `Upload your ${title} for document compliance and profile processing.`}
          </div>

          <div className="mt-3 flex items-center justify-center">
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
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onClose?.();
                      onProtectedAction?.('credential-export', title, handleExportFile);
                    }}
                    className="h-8 min-w-[138px] px-4 rounded-md border border-[#d8e2ee] bg-white text-[#2e66a6] text-xs font-semibold inline-flex items-center justify-center gap-2 hover:bg-[#f7faff]"
                  >
                    <FaDownload className="text-[10px]" />
                    {`Export ${title}`}
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


const formatBirthdayDisplay = (value = '') => {
  const clean = String(value || '').trim();
  if (!clean) return '';

  const isoMatch = clean.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const date = new Date(Number(year), Number(month) - 1, Number(day));

    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    }
  }

  const parsedDate = new Date(clean);
  if (Number.isNaN(parsedDate.getTime())) return clean;

  return parsedDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
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

const SHORT_MONTH_NAMES = {
  January: 'Jan',
  February: 'Feb',
  March: 'Mar',
  April: 'Apr',
  May: 'May',
  June: 'Jun',
  July: 'Jul',
  August: 'Aug',
  September: 'Sep',
  October: 'Oct',
  November: 'Nov',
  December: 'Dec',
};

const formatShortProfileDate = (value = '') => {
  const clean = String(value || '').trim();
  if (!clean) return '';

  return clean
    .replace(
      /\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/g,
      (month) => SHORT_MONTH_NAMES[month] || month
    )
    .replace(/\s+(?:-|–|—|to)\s+/gi, ' – ')
    .replace(/\s+/g, ' ')
    .trim();
};

const formatProfileEntryDate = (item = {}) => {
  if (item.date) return formatShortProfileDate(item.date);
  if (item.startDate && item.endDate) {
    return `${formatShortProfileDate(item.startDate)} – ${formatShortProfileDate(item.endDate)}`;
  }
  if (item.startDate) return formatShortProfileDate(item.startDate);
  if (item.endDate) return formatShortProfileDate(item.endDate);
  return '';
};

const formatWorkExperienceMonthYear = (value = '') => {
  const clean = String(value || '').trim();
  if (!clean) return '';

  const match = clean.match(/^(\d{4})-(\d{2})/);
  if (!match) return clean;

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;

  if (!Number.isInteger(year) || monthIndex < 0 || monthIndex > 11) return clean;

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, monthIndex, 1)));
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

  if (/^present$/i.test(clean)) {
    return {
      fromMonth: '',
      fromYear: '',
      toMonth: '',
      toYear: '',
      isPresent: true,
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
  <BulletTextArea
    rows={5}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    className="rounded-b-[5px]"
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
    <option value="" disabled={Boolean(value)}>{placeholder}</option>
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
          <BulletTextArea
            rows={5}
            value={item.description}
            onChange={(e) => change('description', e.target.value)}
            className="rounded-b-[5px]"
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
        <div>
          <FormLabel>Description (optional)</FormLabel>
          <BulletTextArea
            rows={5}
            value={item.description}
            onChange={(e) => change('description', e.target.value)}
            className="rounded-b-[5px]"
          />
        </div>
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
          <BulletTextArea
            rows={5}
            value={item.description}
            onChange={(e) => change('description', e.target.value)}
            className="rounded-b-[5px]"
          />
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
          <BulletTextArea
            rows={5}
            value={item.description}
            onChange={(e) => change('description', e.target.value)}
            className="rounded-b-[5px]"
          />
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
                    {item.position ? <div className="mt-1 text-sm text-gray-700">{item.position}</div> : null}
                    {item.company ? <div className="mt-1 text-sm text-gray-700">{item.company}</div> : null}
                    {item.phone ? <div className="mt-1 text-sm text-gray-700">{item.phone}</div> : null}
                    {item.email ? <div className="mt-1 break-all text-sm text-[#2e66a6]">{item.email}</div> : null}
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
                        <RichTextDisplay value={item.description} className="text-sm leading-6 text-gray-600 mt-3" />
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
  error,
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
          {error ? <Alert type="error" message={error} /> : null}
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
                  <label className="text-sm text-gray-500">First Name*</label>
                  <input
                    value={drafts.firstName || ''}
                    required
                    onChange={(e) => onChange('firstName', e.target.value)}
                    className="h-11 px-3 border border-gray-300 rounded-[3px] outline-none focus:border-[#2e66a6] focus:ring-1 focus:ring-[#2e66a6]"
                  />
                </div>

                <input
                  value={drafts.lastName || ''}
                  required
                  onChange={(e) => onChange('lastName', e.target.value)}
                  placeholder="Last Name*"
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
                <label className="text-sm text-gray-500">Region*</label>
                <select
                  value={drafts.region || ''}
                  required
                  onChange={(e) => onChange('region', e.target.value)}
                  className="h-11 px-3 border border-gray-300 rounded-[3px] bg-white outline-none focus:border-[#2e66a6] focus:ring-1 focus:ring-[#2e66a6]"
                >
                  <option value="" disabled={Boolean(drafts.region)}>Select region</option>
                  {regionOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-[120px_1fr] items-center gap-3">
                <label className="text-sm text-gray-500">Province*</label>
                <select
                  value={drafts.province || ''}
                  required
                  onChange={(e) => onChange('province', e.target.value)}
                  disabled={!drafts.region}
                  className="h-11 px-3 border border-gray-300 rounded-[3px] bg-white outline-none focus:border-[#2e66a6] focus:ring-1 focus:ring-[#2e66a6] disabled:bg-gray-50 disabled:text-gray-400"
                >
                  <option value="" disabled={Boolean(drafts.province)}>Select province</option>
                  {provinceOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-[120px_1fr] items-center gap-3">
                <label className="text-sm text-gray-500">City / Municipality*</label>
                <select
                  value={drafts.cityMunicipality || ''}
                  required
                  onChange={(e) => onChange('cityMunicipality', e.target.value)}
                  disabled={!drafts.province}
                  className="h-11 px-3 border border-gray-300 rounded-[3px] bg-white outline-none focus:border-[#2e66a6] focus:ring-1 focus:ring-[#2e66a6] disabled:bg-gray-50 disabled:text-gray-400"
                >
                  <option value="" disabled={Boolean(drafts.cityMunicipality)}>Select city / municipality</option>
                  {cityOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-[120px_1fr] items-center gap-3">
                <label className="text-sm text-gray-500">Street Address*</label>
                <input
                  value={drafts.streetAddress || ''}
                  required
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
                  <label className="text-sm text-gray-500">Mobile Number*</label>
                  <input
                    value={drafts.phoneNumber || ''}
                    required
                    onChange={(e) => onChange('phoneNumber', e.target.value)}
                    className="h-11 px-3 border border-gray-300 rounded-[3px] outline-none focus:border-[#2e66a6] focus:ring-1 focus:ring-[#2e66a6]"
                  />
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm text-gray-500 mb-2">Campus*</label>
                      <select
                        value={drafts.campus || ''}
                        required
                        onChange={(e) => onChange('campus', e.target.value)}
                        className="w-full h-11 px-3 border border-gray-300 rounded-[3px] bg-white outline-none focus:border-[#2e66a6] focus:ring-1 focus:ring-[#2e66a6]"
                      >
                        <option value="" disabled>
                          Select campus
                        </option>

{CAMPUS_OPTIONS.map((opt) => (
  <option key={opt} value={opt}>
    {opt}
  </option>
))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-500 mb-2">Course*</label>
                      <select
                        value={drafts.course || ''}
                        required
                        onChange={(e) => onChange('course', e.target.value)}
                        className="w-full h-11 px-3 border border-gray-300 rounded-[3px] bg-white outline-none focus:border-[#2e66a6] focus:ring-1 focus:ring-[#2e66a6]"
                      >
                        <option value="" disabled>
                          Select course
                        </option>

{MAJOR_COURSE_OPTIONS.map((opt) => (
  <option key={opt} value={opt}>
    {opt}
  </option>
))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-500 mb-2">Year Graduated*</label>
                      <select
                        value={drafts.yearGraduated || ''}
                        required
                        onChange={(e) => onChange('yearGraduated', e.target.value)}
                        className="w-full h-11 px-3 border border-gray-300 rounded-[3px] bg-white outline-none focus:border-[#2e66a6] focus:ring-1 focus:ring-[#2e66a6]"
                      >
                        <option value="" disabled>
                          Select year graduated
                        </option>

{yearOptions.map((opt) => (
  <option key={opt} value={opt}>
    {opt}
  </option>
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


const AddSectionsModal = ({ open, addedSections = [], onAdd, onRemove, onClose }) => {
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

          {ADDABLE_MORE_SECTION_KEYS.map((key) => {
            const config = MORE_PROFILE_SECTIONS[key];
            const alreadyAdded = addedSections.includes(key);
            const style = MORE_SECTION_MODAL_STYLES[key] || { icon: <FaPlus />, color: '#2e66a6', bgColor: '#eaf2fb', accentColor: COLORS.primary };

            return (
              <div key={key} className="grid grid-cols-[62px_1fr_132px] items-center gap-5 py-5 border-b border-gray-200 last:border-b-0">
                <div className="relative flex h-[52px] w-[52px] items-center justify-center shrink-0 rounded-[14px]" style={{ backgroundColor: style.bgColor || '#eaf2fb' }}>
                  <span className="text-[30px] flex items-center justify-center" style={{ color: style.color || COLORS.primary }}>
                    {style.icon}
                  </span>
                  <span
                    className="absolute -right-1 -bottom-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white text-[11px] text-white shadow-sm"
                    style={{ backgroundColor: style.accentColor || COLORS.primary }}
                    aria-hidden="true"
                  >
                    +
                  </span>
                </div>

                <div className="min-w-0">
                  <div className="text-[17px] font-bold text-gray-900">{config.title}</div>
                  <p className="text-[14px] leading-6 text-gray-500 mt-1">
                    {MORE_SECTION_DESCRIPTIONS[key] || 'Add this section to complete your profile.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => (alreadyAdded ? onRemove?.(key) : onAdd(key))}
                  className={`h-11 rounded-[4px] text-[15px] font-bold transition ${alreadyAdded ? 'border border-red-300 bg-white text-red-500 hover:bg-red-50' : 'bg-[#2e66a6] text-white hover:bg-[#2e66a6]/90'}`}
                >
                  {alreadyAdded ? 'REMOVE' : 'ADD'}
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
    { key: 'career', label: 'Personal Information' },
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
  entryMode = 'edit',
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
    career: 'Edit Personal Information',
    skills: 'Edit Skills',
    education: 'Edit Education',
  };

  const moreConfig = MORE_PROFILE_SECTIONS[sectionKey];
  const isEntrySection = sectionKey === 'education' || Boolean(moreConfig);
  const actionWord = isEntrySection && entryMode === 'add' ? 'Add' : 'Edit';
  const title = moreConfig?.title
    ? `${actionWord} ${moreConfig.title}`
    : sectionKey === 'education'
      ? `${actionWord} Education`
      : titleMap[sectionKey] || 'Edit Section';

  const renderContent = () => {
    if (sectionKey === 'about') {
      return (
        <div>
          <div className="mb-3 rounded-[5px] border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
            Write a short paragraph (3–5 sentences) about yourself
          </div>
          <TextArea
            label="Objective"
            rows={8}
            value={drafts.aboutMe}
            onChange={(e) => onChange('aboutMe', e.target.value)}
            placeholder="Insert text here..."
          />
        </div>
      );
    }

    if (sectionKey === 'career') {
      return (
        <div className="grid md:grid-cols-2 gap-5">
          <Select label="Preferred Work Mode" value={drafts.preferredWorkMode} onChange={(e) => onChange('preferredWorkMode', e.target.value)} options={PREFERRED_WORK_MODE_OPTIONS} placeholder="Select preferred work mode" />
          <Select label="Employment Type" value={drafts.employmentType} onChange={(e) => onChange('employmentType', e.target.value)} options={EMPLOYMENT_TYPE_OPTIONS} placeholder="Select employment type" />
          <Select label="Willing to Relocate" value={drafts.willingToRelocate} onChange={(e) => onChange('willingToRelocate', e.target.value)} options={WILLING_TO_RELOCATE_OPTIONS} placeholder="Select relocation preference" />
          <Select label="How Soon Can Start" value={drafts.howSoonCanYouStart} onChange={(e) => onChange('howSoonCanYouStart', e.target.value)} options={HOW_SOON_CAN_START_OPTIONS} placeholder="Select availability" />
          <Select label="Experience" value={drafts.experience} onChange={(e) => onChange('experience', e.target.value)} options={EXPERIENCE_OPTIONS} placeholder="Select experience" />
          <Input label="Preferred Language" value={drafts.preferredLanguage} onChange={(e) => onChange('preferredLanguage', e.target.value)} placeholder="Enter preferred language" />
          <Select label="Educational Attainment" value={drafts.educationalAttainment} onChange={(e) => onChange('educationalAttainment', e.target.value)} options={EDUCATIONAL_ATTAINMENT_OPTIONS} placeholder="Select educational attainment" />
          <Select label="Double Degree" value={drafts.studyField} onChange={(e) => onChange('studyField', e.target.value)} options={FIELD_OF_STUDY_OPTIONS} placeholder="Select study field" />
          <Input label="Minimum Salary" value={drafts.minimumSalary} onChange={(e) => onChange('minimumSalary', formatSalaryInput(e.target.value))} placeholder="Minimum Salary" />
          <Input label="Maximum Salary" value={drafts.maximumSalary} onChange={(e) => onChange('maximumSalary', formatSalaryInput(e.target.value))} placeholder="Maximum Salary" />
          <SalaryPrivacySelect value={drafts.salaryPrivacy} onChange={(value) => onChange('salaryPrivacy', value)} />
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
                  className={`w-full h-12 px-4 rounded-[6px] border outline-none focus:ring-2 focus:ring-[#2e66a6]/20 focus:border-[#2e66a6] ${getProficiencyLevelStyle(item.proficiency || DEFAULT_PROFICIENCY_LEVEL)}`}
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
      const educationRows =
        Array.isArray(drafts.educationEntries) && drafts.educationEntries.length
          ? drafts.educationEntries
          : [createEmptyEducationEntry()];

      return (
        <div className="space-y-5">
          {educationRows.map((entry, index) => (
            <div key={`education-entry-${index}`} className="space-y-4">
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

        </div>
      );
    }

    if (moreConfig) {
      const items = Array.isArray(drafts[sectionKey]) ? drafts[sectionKey] : [];
      const fields = moreConfig.fields || [];

      return (
        <div className="space-y-5">
          {items.map((item, index) => (
            <div key={`${sectionKey}-${index}`} className="space-y-4">
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
          {error ? (
            <div className="sticky top-0 z-20 -mx-1 mb-5 bg-white pb-2">
              <Alert type="error" message={error} />
            </div>
          ) : null}
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


const hasMeaningfulObjectValue = (item = {}) =>
  Boolean(
    item &&
    typeof item === 'object' &&
    Object.entries(item).some(([key, value]) => {
      if (['_id', 'id', 'createdAt', 'updatedAt', '__v'].includes(key)) return false;
      if (Array.isArray(value)) return value.length > 0;
      if (value && typeof value === 'object') return hasMeaningfulObjectValue(value);
      return Boolean(String(value ?? '').trim());
    })
  );

const hasMeaningfulListContent = (items = []) =>
  Array.isArray(items) && items.some((item) => {
    if (item && typeof item === 'object') return hasMeaningfulObjectValue(item);
    return Boolean(String(item || '').trim());
  });

const normalizeComparableValue = (value) => {
  if (Array.isArray(value)) return value.map(normalizeComparableValue);
  if (value && typeof value === 'object') {
    return Object.keys(value)
      .filter((key) => !['_id', 'id', 'createdAt', 'updatedAt', '__v'].includes(key))
      .sort()
      .reduce((result, key) => {
        result[key] = normalizeComparableValue(value[key]);
        return result;
      }, {});
  }
  return String(value ?? '').trim();
};

const areProfileValuesEqual = (left, right) =>
  JSON.stringify(normalizeComparableValue(left)) === JSON.stringify(normalizeComparableValue(right));

const hasCompleteSingleDate = (dateValue = '') => {
  const parts = splitDateLabel(dateValue);
  return Boolean(parts.fromMonth && parts.fromYear);
};

const hasCompleteRangeDate = (dateValue = '', { singleDate = false } = {}) => {
  const parts = splitDateLabel(dateValue);
  if (!parts.fromMonth || !parts.fromYear) return false;
  if (singleDate) return true;
  if (parts.isPresent) return true;
  return Boolean(parts.toMonth && parts.toYear);
};

const getProfileEntryValidationError = (sectionKey, item = {}) => {
  const value = (key) => String(item?.[key] || '').trim();

  if (sectionKey === 'certifications') {
    if (!value('title') || !value('issuer') || !hasCompleteSingleDate(item.date)) {
      return 'Please complete the certification title, issuer, month, and year before saving.';
    }
  }

  if (sectionKey === 'projects') {
    if (!value('title') || !value('role') || !hasCompleteRangeDate(item.date)) {
      return 'Please complete the project name, role, and required date fields before saving.';
    }
  }

  if (sectionKey === 'seminars') {
    const isSingleDate = Boolean(item.isSingleDate);
    if (
      !value('title') ||
      !value('organization') ||
      !hasCompleteRangeDate(item.date, { singleDate: isSingleDate })
    ) {
      return 'Please complete the title, organizer, and required date fields before saving.';
    }
  }

  if (sectionKey === 'awards') {
    if (!value('title') || !value('issuer') || !hasCompleteSingleDate(item.date)) {
      return 'Please complete the title, issuer, month, and year before saving.';
    }
  }

  if (sectionKey === 'affiliations' || sectionKey === 'cocurricular') {
    if (!value('organization') || !value('role') || !hasCompleteRangeDate(item.date)) {
      return 'Please complete the organization, role, and required date fields before saving.';
    }
  }

  if (sectionKey === 'references') {
    if (!value('name') || !value('position') || !value('company') || !value('phone') || !value('email')) {
      return 'Please complete all required reference fields before saving.';
    }
  }

  return '';
};

const isCompletedProfileValue = (value) => {
  const clean = String(value ?? '').trim();

  if (!clean) return false;

  return !/^(not\s+provided|n\/?a|not\s+set|none|null|undefined|course\s+not\s+set\s+yet|year\s+not\s+set|educational\s+attainment)$/i.test(
    clean
  );
};

const isMeaningfulRichTextValue = (value) => {
  const raw = String(value ?? '').trim();
  if (!raw) return false;

  const plainText = raw
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();

  return Boolean(plainText);
};

const isCompleteEducationEntry = (entry = {}) => {
  const normalized = normalizeEducationEntry(entry);

  return Boolean(
    isCompletedProfileValue(normalized.level || normalized.educationalAttainment) &&
    isCompletedProfileValue(normalized.school || normalized.campus)
  );
};

const JobSeekerLevelCard = ({
  currentRank = 'First Time Job Seeker',
  nextTier = 'Intermediate',
  percentage = 0,
  suggestions = [],
}) => {
  const [showLevelModal, setShowLevelModal] = useState(false);
  const safePercentage = Math.min(100, Math.max(0, Number(percentage) || 0));
  const badgeImage = JOB_SEEKER_LEVEL_BADGES[currentRank]
    || JOB_SEEKER_LEVEL_BADGES['First Time Job Seeker'];
  const jobSeekerLevels = Object.entries(JOB_SEEKER_LEVEL_BADGES);

  useEffect(() => {
    if (!showLevelModal) return undefined;

    const handleEscape = (event) => {
      if (event.key === 'Escape') setShowLevelModal(false);
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showLevelModal]);

  return (
    <>
      <section
        className="w-full cursor-pointer rounded-[18px] border border-[#d8e2ee] bg-white p-5 shadow-[0_8px_30px_rgba(46,102,166,0.10)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_34px_rgba(46,102,166,0.16)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6]/40"
        role="button"
        tabIndex={0}
        aria-label="View all job seeker levels"
        aria-haspopup="dialog"
        onClick={() => setShowLevelModal(true)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setShowLevelModal(true);
          }
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500">
              Job Seeker Level
            </p>
            <h2 className="mt-2 text-[22px] font-bold leading-7 text-black">
              {currentRank}
            </h2>
          </div>

          <div
            className="group flex h-[68px] w-[68px] shrink-0 items-center justify-center border-0 bg-transparent p-0 transition-transform duration-200 group-hover:scale-105"
            aria-hidden="true"
          >
            <img
              src={badgeImage}
              alt={`${currentRank} badge`}
              className="h-full w-full object-contain transition group-hover:drop-shadow-[0_5px_8px_rgba(46,102,166,0.22)]"
            />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <p className="min-w-0 text-sm text-gray-500">
            Next Tier: <span className="font-semibold text-black">{nextTier}</span>
          </p>
          <span className="shrink-0 text-sm font-bold text-[#2e66a6]">
            {safePercentage}%
          </span>
        </div>

        <div
          className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-gray-200"
          role="progressbar"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-valuenow={safePercentage}
          aria-label="Job seeker level progress"
        >
          <div
            className="h-full rounded-full bg-[#2e66a6] transition-all duration-500"
            style={{ width: `${safePercentage}%` }}
          />
        </div>

        <div className="mt-5 rounded-xl border border-[#d8e2ee] bg-[#f8fbff] px-4 py-3">
          <div className="flex items-start gap-3">
            <span
              className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[#2e66a6] text-[11px] font-bold text-[#2e66a6]"
              aria-hidden="true"
            >
              i
            </span>

            <div className="min-w-0 text-sm leading-5 text-gray-600">
              {nextTier === 'Completed' ? (
                <p>You reached the highest job seeker level.</p>
              ) : suggestions.length > 1 ? (
                <>
                  <p className="font-medium text-gray-700">To reach {nextTier}:</p>
                  <ul className="mt-1 space-y-1">
                    {suggestions.map((suggestion) => (
                      <li key={suggestion}>• {suggestion}</li>
                    ))}
                  </ul>
                </>
              ) : (
                <p>{suggestions[0] || `Keep improving your profile to reach ${nextTier}.`}</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {showLevelModal && typeof document !== 'undefined'
        ? createPortal(
          <div
            className="fixed inset-0 z-[10060] flex items-center justify-center bg-black/50 px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="job-seeker-levels-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowLevelModal(false);
          }}
        >
          <div className="w-full max-w-[980px] overflow-hidden rounded-[22px] bg-white shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
            <div className="flex items-center justify-between gap-4 bg-[#2e66a6] px-5 py-4 sm:px-7">
              <div>
                <h2 id="job-seeker-levels-title" className="text-[21px] font-bold text-white sm:text-[24px]">
                  Job Seeker Levels
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setShowLevelModal(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full text-[28px] leading-none text-white transition hover:bg-white/15"
                aria-label="Close job seeker levels"
              >
                ×
              </button>
            </div>

            <div className="max-h-[78vh] overflow-y-auto px-5 py-6 sm:px-7 sm:py-7">
              <p className="text-sm leading-6 text-gray-600">
                Improve your profile to progress through each job seeker level.
              </p>

              <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                {jobSeekerLevels.map(([levelName, levelBadge], index) => {
                  const isCurrentLevel = levelName === currentRank;

                  return (
                    <div
                      key={levelName}
                      className={`relative flex min-h-[210px] flex-col items-center rounded-[18px] border px-3 py-5 text-center transition ${
                        isCurrentLevel
                          ? 'border-[#2e66a6] bg-[#f3f8ff] shadow-[0_10px_30px_rgba(46,102,166,0.16)]'
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      <span className={`absolute left-3 top-3 flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${
                        isCurrentLevel ? 'bg-[#2e66a6] text-white' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {index + 1}
                      </span>

                      <img
                        src={levelBadge}
                        alt={`${levelName} badge`}
                        className="h-[112px] w-[112px] object-contain"
                      />

                      <h3 className="mt-3 text-[15px] font-bold leading-5 text-gray-900">
                        {levelName}
                      </h3>

                      {isCurrentLevel ? (
                        <span className="mt-2 inline-flex rounded-full bg-[#2e66a6] px-3 py-1 text-[11px] font-bold text-white">
                          Current Level
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </div>

            </div>
          </div>
        </div>,
          document.body
        )
        : null}
    </>
  );
};

const TodoProgressCard = ({
  percentage = 0,
  credentialItems = [],
  profileItems = [],
  additionalItems = [],
}) => {
  const profileByKey = Object.fromEntries(profileItems.map((item) => [item.key, item]));
  const uploadedCredentialCount = credentialItems.filter((item) => item.completed).length;
  const credentialsComplete =
    credentialItems.length > 0 && uploadedCredentialCount === credentialItems.length;
  const additionalComplete = additionalItems.some((item) => item.completed);

  const items = [
    {
      key: 'basic',
      label: 'Complete Basic Info',
      completed: Boolean(profileByKey.basic?.completed),
      info: 'Basic Information — 2%',
    },
    {
      key: 'objective',
      label: 'Add Career Objectives',
      completed: Boolean(profileByKey.objective?.completed),
      info: 'Career Objectives — 1%',
    },
    {
      key: 'availability',
      label: 'Complete Personal Information',
      completed: Boolean(profileByKey.availability?.completed),
      info: 'Personal Information — 2%',
    },
    {
      key: 'work',
      label: 'Add Work Experiences',
      completed: Boolean(profileByKey.work?.completed),
      info: 'Work Experience — 15%',
    },
    {
      key: 'skills',
      label: 'Add Skills',
      completed: Boolean(profileByKey.skills?.completed),
      info: 'Skills — 10%',
    },
    {
      key: 'education',
      label: 'Add Education',
      completed: Boolean(profileByKey.education?.completed),
      info: 'Education — 8%',
    },
    {
      key: 'credentials',
      label: 'Complete Credentials',
      completed: credentialsComplete,
      info: 'Credentials total — 45%',
    },
    {
      key: 'additional',
      label: 'Add More Sections',
      completed: additionalComplete,
      info: 'Complete any one additional section — 17%',
    },
  ];

  const safePercentage = Math.min(100, Math.max(0, Number(percentage) || 0));

  return (
    <section className="w-full rounded-[18px] border border-[#d8e2ee] bg-white p-5 shadow-[0_8px_30px_rgba(46,102,166,0.10)]">
      <h2 className="text-[20px] font-bold text-black">To-Do List</h2>

      <div className="mt-5 text-center text-[16px] font-bold text-[#2e66a6]">
        {safePercentage}% Done
      </div>

      <div
        className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-gray-200"
        role="progressbar"
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow={safePercentage}
        aria-label="Profile completion progress"
      >
        <div
          className="h-full rounded-full bg-[#2e66a6] transition-all duration-500"
          style={{ width: `${safePercentage}%` }}
        />
      </div>

      <div className="mt-5 space-y-2">
        {items.map((item) => (
          <div key={item.key} className="flex min-h-[38px] items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span
                className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[12px] font-bold ${
                  item.completed
                    ? 'border-[#2e66a6] bg-[#2e66a6] text-white'
                    : 'border-gray-300 bg-white text-transparent'
                }`}
                aria-hidden="true"
              >
                ✓
              </span>

              <span
                className={`text-[14px] leading-5 ${
                  item.completed ? 'font-medium text-black' : 'text-gray-600'
                }`}
              >
                {item.label}
              </span>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {item.key === 'credentials' ? (
                <span className="text-xs font-bold text-[#2e66a6]">
                  {uploadedCredentialCount}/{credentialItems.length || REQUIRED_DOC_TYPES.length}
                </span>
              ) : null}

              <span
                className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-gray-300 text-[11px] font-semibold text-gray-400"
                title={item.info}
                aria-label={item.info}
              >
                i
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

const AddSectionsCard = ({ onAddSections, reminder = '' }) => (
  <section className="w-full rounded-[18px] border border-[#d8e2ee] bg-white p-6 shadow-[0_8px_30px_rgba(46,102,166,0.10)]">
    <h2 className="text-[25px] font-bold leading-tight text-[#0f2545]">
      Showcase your full potential
    </h2>
    <p className="mt-3 text-[16px] leading-6 text-gray-500">
      with additional resume sections.
    </p>
    {reminder ? (
      <p className="mt-3 text-sm font-semibold text-amber-700">{reminder}</p>
    ) : null}
    <div className="mt-6 flex justify-start">
      <button
        type="button"
        onClick={onAddSections}
        className="h-12 rounded-xl bg-[#1658d3] px-6 text-[15px] font-bold text-white shadow-sm transition hover:bg-[#1249b2] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1658d3] focus-visible:ring-offset-2"
      >
        <span className="inline-flex items-center gap-2">
          <FaPlus className="text-sm" />
          Add Sections
        </span>
      </button>
    </div>
  </section>
);

const ProfileRightPanel = ({ jobSeekerLevel, onAddSections, addSectionsReminder }) => (
  <aside className="w-full space-y-6">
    <JobSeekerLevelCard
      currentRank={jobSeekerLevel.currentRank}
      nextTier={jobSeekerLevel.nextTier}
      percentage={jobSeekerLevel.percentage}
      suggestions={jobSeekerLevel.suggestions}
    />

    <AddSectionsCard onAddSections={onAddSections} reminder={addSectionsReminder} />
  </aside>
);

const MyProfile = () => {
  const profileGridRef = useRef(null);
  const sidebarColumnRef = useRef(null);
  const sidebarPanelRef = useRef(null);
  const [sidebarFixedStyle, setSidebarFixedStyle] = useState(null);
  const [sidebarPlaceholderHeight, setSidebarPlaceholderHeight] = useState(0);

  useEffect(() => {
    const STICKY_TOP = 88;
    let frameId = null;

    const updateStickySidebar = () => {
      if (window.innerWidth < 1024) {
        setSidebarFixedStyle(null);
        setSidebarPlaceholderHeight(0);
        return;
      }

      const grid = profileGridRef.current;
      const column = sidebarColumnRef.current;
      const panel = sidebarPanelRef.current;

      if (!grid || !column || !panel) return;

      const gridRect = grid.getBoundingClientRect();
      const columnRect = column.getBoundingClientRect();
      const panelHeight = panel.offsetHeight;

      setSidebarPlaceholderHeight(panelHeight);

      if (gridRect.top > STICKY_TOP) {
        setSidebarFixedStyle(null);
        return;
      }

      const top = Math.min(STICKY_TOP, gridRect.bottom - panelHeight);

      setSidebarFixedStyle({
        position: 'fixed',
        top: `${top}px`,
        left: `${columnRect.left}px`,
        width: `${columnRect.width}px`,
        zIndex: 20,
      });
    };

    const scheduleUpdate = () => {
      if (frameId) window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(updateStickySidebar);
    };

    scheduleUpdate();
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);

    return () => {
      if (frameId) window.cancelAnimationFrame(frameId);
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
    };
  }, []);

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
  const [basicInformationNotice, setBasicInformationNotice] = useState({
    open: false,
    missingFields: [],
  });
  const [savingSection, setSavingSection] = useState('');
  const [successPopup, setSuccessPopup] = useState({ open: false, title: '', message: '' });
  const [downloadPasswordModalOpen, setDownloadPasswordModalOpen] = useState(false);
  const [downloadPassword, setDownloadPassword] = useState('');
  const [downloadPasswordError, setDownloadPasswordError] = useState('');
  const [downloadPasswordVerifying, setDownloadPasswordVerifying] = useState(false);
  const [resumePasswordAction, setResumePasswordAction] = useState('download');
  const [passwordResourceTitle, setPasswordResourceTitle] = useState('CV/Resume');
  const pendingCredentialActionRef = useRef(null);

  const [confirmState, setConfirmState] = useState({
    open: false,
    title: '',
    message: '',
    confirmText: 'Yes',
    cancelText: 'Cancel',
    tone: 'primary',
    onConfirmAction: null,
  });

  const closeConfirmModal = () => {
    setConfirmState({
      open: false,
      title: '',
      message: '',
      confirmText: 'Yes',
      cancelText: 'Cancel',
      tone: 'primary',
      onConfirmAction: null,
    });
  };

  const openDeleteConfirmation = ({ title = 'Are you sure you want to delete this?', message = 'You will not be able to recover it.', confirmText = 'Delete', onConfirm }) => {
    setConfirmState({
      open: true,
      title,
      message,
      confirmText,
      cancelText: 'Cancel',
      tone: 'danger',
      onConfirmAction: onConfirm,
    });
  };

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
  const [profileEntryModalContext, setProfileEntryModalContext] = useState({
    sectionKey: '',
    mode: 'edit',
    index: -1,
    originalItems: [],
  });
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
    salaryPrivacy: 'only_me',

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
    experience: '',
    addedResumeSections: [],

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

  const courseText = useMemo(() => normalizeCourseValue(formData.course) || 'Course not set yet', [formData.course]);

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

  // Used only for rendering the Education section.
  // The To-Do completion check below still uses the stricter educationComplete logic.
  const hasEducationEntries = educationEntries.length > 0;

  const basicInformationMissingFields = useMemo(() => {
    const parsedBasicAddress = parseAddressString(formData.address || '');
    const requiredBasicFields = [
      ['First Name', formData.firstName],
      ['Last Name', formData.lastName],
      ['Email', formData.email],
      ['Mobile Number', formData.phoneNumber],
      ['Campus', formData.campus],
      ['Course', formData.course],
      ['Year Graduated', formData.yearGraduated],
      ['Region', formData.region || parsedBasicAddress.region],
      ['Province', formData.province || parsedBasicAddress.province],
      ['City / Municipality', formData.cityMunicipality || parsedBasicAddress.cityMunicipality],
      ['Street Address', formData.streetAddress || parsedBasicAddress.streetAddress],
    ];

    return requiredBasicFields
      .filter(([, value]) => !isCompletedProfileValue(value))
      .map(([label]) => label);
  }, [formData]);

  const isBasicInformationComplete = basicInformationMissingFields.length === 0;

  useEffect(() => {
    if (isBasicInformationComplete) {
      setBasicInformationNotice({
        open: false,
        missingFields: [],
      });
    }
  }, [isBasicInformationComplete]);

  const todoProgress = useMemo(() => {
    const credentialWeights = {
      validId: 8,
      cv: 12,
      diploma: 8,
      tor: 5,
      sss: 3,
      philhealth: 3,
      pagibig: 3,
      tin: 3,
    };

    const credentialLabels = {
      validId: 'Valid ID',
      cv: 'Resume',
      diploma: 'Diploma',
      tor: 'TOR',
      sss: 'SSS',
      philhealth: 'PhilHealth',
      pagibig: 'Pag-IBIG',
      tin: 'TIN',
    };

    const credentialItems = Object.keys(credentialWeights).map((key) => ({
      key,
      label: credentialLabels[key],
      weight: credentialWeights[key],
      completed: Boolean(String(verificationDocs?.[key]?.url || '').trim()),
    }));

    const basicInformationComplete = isBasicInformationComplete;

    const personalInformationRequiredValues = [
      formData.preferredWorkMode,
      formData.employmentType,
      formData.willingToRelocate,
      formData.howSoonCanYouStart,
      formData.experience,
      formData.preferredLanguage,
      formData.educationalAttainment,
      formData.studyField,
      isCompletedProfileValue(formData.minimumSalary) && isCompletedProfileValue(formData.maximumSalary) ? 'completed' : '',
      formData.nationality,
      formData.height,
      formData.weight,
      formData.gender,
      formData.civilStatus,
      formData.birthday,
    ];

    const availabilityComplete = personalInformationRequiredValues.every(
      isCompletedProfileValue
    );

    const skillsComplete = Boolean(
      normalizeSkillsFromProfile(formData.technicalSkills).length ||
      normalizeSkillsFromProfile(formData.softSkills).length ||
      normalizeSkillRows(formData.skillRows || []).some((item) => String(item.skill || '').trim())
    );

    const educationComplete =
      educationEntries.length > 0 &&
      educationEntries.some(isCompleteEducationEntry);

    const profileItems = [
      { key: 'basic', label: 'Basic Information', weight: 2, completed: basicInformationComplete },
      { key: 'objective', label: 'Career Objectives', weight: 1, completed: isMeaningfulRichTextValue(formData.aboutMe) },
      { key: 'availability', label: 'Personal Information', weight: 2, completed: availabilityComplete },
      { key: 'work', label: 'Work Experience', weight: 15, completed: workExperiences.length > 0 },
      { key: 'skills', label: 'Skills', weight: 10, completed: skillsComplete },
      { key: 'education', label: 'Education', weight: 8, completed: educationComplete },
    ];

    const additionalItems = [
      {
        key: 'certifications',
        label: 'Certifications',
        completed: addedMoreSections.includes('certifications') && hasMeaningfulListContent(formData.certifications),
      },
      {
        key: 'projects',
        label: 'Projects',
        completed: addedMoreSections.includes('projects') && hasMeaningfulListContent(formData.projects),
      },
      {
        key: 'seminars',
        label: 'Seminars and Trainings',
        completed: addedMoreSections.includes('seminars') && hasMeaningfulListContent(formData.seminars),
      },
      {
        key: 'awards',
        label: 'Awards and Achievements',
        completed: addedMoreSections.includes('awards') && hasMeaningfulListContent(formData.awards),
      },
      {
        key: 'affiliations',
        label: 'Affiliations',
        completed: addedMoreSections.includes('affiliations') && hasMeaningfulListContent(formData.affiliations),
      },
      {
        key: 'cocurricular',
        label: 'Co-Curricular Activities',
        completed: addedMoreSections.includes('cocurricular') && hasMeaningfulListContent(formData.cocurricular),
      },
      {
        key: 'references',
        label: 'References',
        completed: addedMoreSections.includes('references') && hasMeaningfulListContent(formData.references),
      },
    ];

    const credentialsProgress = credentialItems.reduce(
      (total, item) => total + (item.completed ? item.weight : 0),
      0
    );
    const resumeProfileProgress = profileItems.reduce(
      (total, item) => total + (item.completed ? item.weight : 0),
      0
    );
    const additionalProgress = additionalItems.some((item) => item.completed) ? 17 : 0;

    return {
      percentage: Math.min(100, credentialsProgress + resumeProfileProgress + additionalProgress),
      credentialItems,
      profileItems,
      additionalItems,
    };
  }, [formData, educationEntries, verificationDocs, workExperiences, isBasicInformationComplete, addedMoreSections]);

  const sectionReminders = useMemo(() => {
    const countMissing = (values = []) => values.filter((value) => !isCompletedProfileValue(value)).length;

    const basicMissingCount = basicInformationMissingFields.length;

    const personalMissingCount = countMissing([
      formData.preferredWorkMode,
      formData.employmentType,
      formData.willingToRelocate,
      formData.howSoonCanYouStart,
      formData.experience,
      formData.preferredLanguage,
      formData.educationalAttainment,
      formData.studyField,
      isCompletedProfileValue(formData.minimumSalary) && isCompletedProfileValue(formData.maximumSalary) ? 'completed' : '',
      formData.nationality,
      formData.height,
      formData.weight,
      formData.gender,
      formData.civilStatus,
      formData.birthday,
    ]);

    const uploadedCredentialCount = todoProgress.credentialItems.filter((item) => item.completed).length;
    const credentialTotal = todoProgress.credentialItems.length || REQUIRED_DOC_TYPES.length;
    const skillsCount = [
      ...normalizeSkillsFromProfile(formData.technicalSkills),
      ...normalizeSkillsFromProfile(formData.softSkills),
    ].filter(Boolean).length;
    const hasAdditionalHighlight = todoProgress.additionalItems.some((item) => item.completed);

    return {
      personal: basicMissingCount > 0 ? `${basicMissingCount} Incomplete Basic Information` : '',
      about: isMeaningfulRichTextValue(formData.aboutMe) ? '' : 'Career objective missing',
      career: personalMissingCount > 0 ? `${personalMissingCount} Missing Personal Information` : '',
      work: workExperiences.length > 0 ? '' : 'Showcase 1 of your Experience',
      skills: skillsCount > 0 ? '' : 'Showcase 1 of your Skills',
      education: educationEntries.some(isCompleteEducationEntry) ? '' : 'Share 1 of your Education',
      credentials: uploadedCredentialCount >= credentialTotal
        ? ''
        : `${uploadedCredentialCount}/${credentialTotal} Credentials Completed`,
      additional: hasAdditionalHighlight ? '' : 'Add 1 More Highlights',
    };
  }, [formData, workExperiences, educationEntries, todoProgress, basicInformationMissingFields]);

  const jobSeekerLevel = useMemo(() => {
    const counts = {
      skills: [
        ...normalizeSkillsFromProfile(formData.technicalSkills),
        ...normalizeSkillsFromProfile(formData.softSkills),
      ].filter(Boolean).length,
      certifications: Array.isArray(formData.certifications)
        ? formData.certifications.filter(hasMeaningfulObjectValue).length
        : 0,
      projects: Array.isArray(formData.projects)
        ? formData.projects.filter(hasMeaningfulObjectValue).length
        : 0,
      seminars: Array.isArray(formData.seminars)
        ? formData.seminars.filter(hasMeaningfulObjectValue).length
        : 0,
      awards: Array.isArray(formData.awards)
        ? formData.awards.filter(hasMeaningfulObjectValue).length
        : 0,
      work: Array.isArray(workExperiences) ? workExperiences.length : 0,
    };

    const tiers = [
      {
        name: 'First Time Job Seeker',
        requirements: {
          skills: 0,
          certifications: 0,
          projects: 0,
          seminars: 0,
          awards: 0,
          work: 0,
        },
      },
      {
        name: 'Intermediate',
        requirements: {
          skills: 5,
          certifications: 1,
          projects: 1,
          seminars: 1,
          awards: 1,
          work: 0,
        },
      },
      {
        name: 'Expert',
        requirements: {
          skills: 9,
          certifications: 2,
          projects: 2,
          seminars: 2,
          awards: 2,
          work: 1,
        },
      },
      {
        name: 'Pro',
        requirements: {
          skills: 13,
          certifications: 5,
          projects: 5,
          seminars: 5,
          awards: 5,
          work: 2,
        },
      },
      {
        name: 'Legend',
        requirements: {
          skills: 17,
          certifications: 7,
          projects: 7,
          seminars: 7,
          awards: 7,
          work: 3,
        },
      },
    ];

    const meetsRequirements = (requirements) =>
      Object.entries(requirements).every(([key, required]) => counts[key] >= required);

    let currentTierIndex = 0;
    tiers.forEach((tier, index) => {
      if (meetsRequirements(tier.requirements)) currentTierIndex = index;
    });

    const currentTier = tiers[currentTierIndex];
    const nextTier = tiers[currentTierIndex + 1];

    if (!nextTier) {
      return {
        currentRank: currentTier.name,
        nextTier: 'Completed',
        percentage: 100,
        suggestions: [],
      };
    }

    const requirementEntries = Object.entries(nextTier.requirements).filter(([, required]) => required > 0);
    const ratios = requirementEntries.map(([key, required]) =>
      Math.min(1, counts[key] / required)
    );
    const percentage = ratios.length
      ? Math.round((ratios.reduce((total, ratio) => total + ratio, 0) / ratios.length) * 100)
      : 0;

    const labelMap = {
      skills: ['skill', 'skills'],
      certifications: ['certification', 'certifications'],
      projects: ['project', 'projects'],
      seminars: ['seminar or training', 'seminars or trainings'],
      awards: ['award or achievement', 'awards or achievements'],
      work: ['work experience', 'work experiences'],
    };

    const suggestions = requirementEntries
      .map(([key, required]) => {
        const remaining = Math.max(0, required - counts[key]);
        if (!remaining) return '';
        const [singular, plural] = labelMap[key];
        return `Add ${remaining} more ${remaining === 1 ? singular : plural} to reach ${nextTier.name}.`;
      })
      .filter(Boolean);

    return {
      currentRank: currentTier.name,
      nextTier: nextTier.name,
      percentage,
      suggestions,
    };
  }, [
    formData.technicalSkills,
    formData.softSkills,
    formData.certifications,
    formData.projects,
    formData.seminars,
    formData.awards,
    workExperiences,
  ]);


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

    const start = formatShortProfileDate(
      [startMonth, startYear].filter(Boolean).join(' ')
    );
    const end = formatShortProfileDate(
      [endMonth, endYear].filter(Boolean).join(' ')
    );

    if (start && end) return `${start} – ${end}`;
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
      formData: { ...formData, addedResumeSections: addedMoreSections },
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
    const resumeData = {
      userData,
      formData: { ...formData, addedResumeSections: addedMoreSections },
      workExperiences,
      verificationDocs,
    };

    const downloaded = await openResumePrintWindow(resumeData);

    if (!downloaded) {
      setError('Failed to generate CV PDF. Please try again.');
      setDownloadPasswordError('Failed to generate CV PDF. Please try again.');
    }

    return downloaded;
  };

  const handleDownloadResume = () => {
    setError('');
    setDownloadPasswordError('');
    setDownloadPassword('');
    setResumePasswordAction('download');
    setDownloadPasswordModalOpen(true);
  };

  const requestCredentialPassword = (action, resourceTitle, executeAction) => {
    setError('');
    setDownloadPasswordError('');
    setDownloadPassword('');
    setResumePasswordAction(action);
    setPasswordResourceTitle(resourceTitle || 'credential');
    pendingCredentialActionRef.current = executeAction;
    setDownloadPasswordModalOpen(true);
  };

  const closeDownloadPasswordModal = () => {
    if (downloadPasswordVerifying) return;
    setDownloadPasswordModalOpen(false);
    setDownloadPassword('');
    setDownloadPasswordError('');
    setPasswordResourceTitle('CV/Resume');
    pendingCredentialActionRef.current = null;
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
        if (resumePasswordAction === 'credential-export') {
          const executeCredentialAction = pendingCredentialActionRef.current;

          if (executeCredentialAction) {
            await executeCredentialAction(downloadPassword);
          }

          setDownloadPasswordModalOpen(false);
          setDownloadPassword('');
          pendingCredentialActionRef.current = null;
          setPasswordResourceTitle('CV/Resume');
          return;
        }

        if (resumePasswordAction === 'preview') {
          setDownloadPasswordModalOpen(false);
          setDownloadPassword('');
          openResumePreview();
          return;
        }

        const previewOpened = await downloadResumePdf();

        if (previewOpened) {
          setDownloadPasswordModalOpen(false);
          setDownloadPassword('');
        }
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
    // Once the user corrects a Basic Information field, remove the old
    // validation message and validate the Basic Information modal again on save.
    if (error) setError('');

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
          minimumSalary: formatSalaryInput(profile.minimumSalary),
          maximumSalary: formatSalaryInput(profile.maximumSalary),
          salaryPrivacy: ['limited', 'only_me'].includes(profile.salaryPrivacy)
            ? profile.salaryPrivacy
            : 'only_me',

          address: profile.address || '',
          region: parsedAddress.region || '',
          province: parsedAddress.province || '',
          cityMunicipality: parsedAddress.cityMunicipality || '',
          streetAddress: parsedAddress.streetAddress || '',

          birthday: profile.birthday || '',
          gender: profile.gender || '',
          nationality: profile.nationality || '',
          civilStatus: normalizeCivilStatusValue(profile.civilStatus),
          height: profile.height || '',
          weight: profile.weight || '',
          preferredLanguage: profile.preferredLanguage || '',

          campus: profile.campus || '',
          course: normalizeCourseValue(profile.course),
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
          employmentType: normalizeEmploymentTypeValue(profile.employmentType),
          educationalAttainment: normalizeEducationalAttainmentValue(
            profile.educationalAttainment
          ),
          willingToRelocate: profile.willingToRelocate || '',
          studyField: profile.studyField || '',
          experience: normalizeExperienceValue(profile.experience),
          addedResumeSections: normalizeAddedResumeSections(
            profile.addedResumeSections,
            profile
          ),

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
        setAddedMoreSections(nextData.addedResumeSections);
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

  const saveSection = async (sectionKey, draftOverride = null) => {
    const activeDrafts = draftOverride || drafts;

    // Every modal validates only its own fields. Clear any message left by a
    // different profile modal before running the current section validation.
    setError('');

    if (sectionKey === 'basic') {
      const requiredBasicFields = [
        ['First Name', activeDrafts.firstName],
        ['Last Name', activeDrafts.lastName],
        ['Email', activeDrafts.email],
        ['Mobile Number', activeDrafts.phoneNumber],
        ['Campus', activeDrafts.campus],
        ['Course', activeDrafts.course],
        ['Year Graduated', activeDrafts.yearGraduated],
        ['Region', activeDrafts.region],
        ['Province', activeDrafts.province],
        ['City / Municipality', activeDrafts.cityMunicipality],
        ['Street Address', activeDrafts.streetAddress],
      ];
      const missingBasicFields = requiredBasicFields
        .filter(([, value]) => !isCompletedProfileValue(value))
        .map(([label]) => label);

      if (missingBasicFields.length) {
        setError(`Please complete the required fields before saving: ${missingBasicFields.join(', ')}.`);
        return false;
      }
    }

    try {
      setSavingSection(sectionKey);
      setError('');

      const token = localStorage.getItem('token');

      let payload = {};

      if (sectionKey === 'about') {
        payload = {
          jobSeekerProfile: {
            aboutMe: isMeaningfulRichTextValue(activeDrafts.aboutMe)
              ? activeDrafts.aboutMe
              : '',
          },
        };
      }

      if (sectionKey === 'basic') {
        payload = {
          firstName: activeDrafts.firstName,
          middleName: activeDrafts.middleName,
          lastName: activeDrafts.lastName,
          extensionName: normalizeExtensionName(activeDrafts.extensionName),
          jobSeekerProfile: {
            phoneNumber: activeDrafts.phoneNumber,
            address: buildAddressString(activeDrafts),
            campus: activeDrafts.campus,
            course: normalizeCourseValue(activeDrafts.course),
            yearGraduated: activeDrafts.yearGraduated,
          },
        };
      }

      if (sectionKey === 'salary') {
        payload = {
          jobSeekerProfile: {
            minimumSalary: normalizeSalaryDigits(activeDrafts.minimumSalary),
            maximumSalary: normalizeSalaryDigits(activeDrafts.maximumSalary),
            salaryPrivacy: activeDrafts.salaryPrivacy || 'only_me',
          },
        };
      }

      if (sectionKey === 'personal') {
        payload = {
          jobSeekerProfile: {
            birthday: activeDrafts.birthday,
            gender: activeDrafts.gender,
            nationality: activeDrafts.nationality,
            civilStatus: activeDrafts.civilStatus,
            height: activeDrafts.height,
            weight: activeDrafts.weight,
            preferredLanguage: activeDrafts.preferredLanguage,
          },
        };
      }

      if (sectionKey === 'career') {
        const savedSkillRows = normalizeSkillRows(activeDrafts.skillRows || [
          ...(activeDrafts.technicalSkills || []),
          ...(activeDrafts.softSkills || []),
        ]).filter((item) => String(item.skill || '').trim());

        payload = {
          jobSeekerProfile: {
            preferredWorkMode: activeDrafts.preferredWorkMode,
            technicalSkills: serializeSkillRows(savedSkillRows),
            softSkills: '',
            whatHaveYouDone: activeDrafts.whatHaveYouDone,
            howSoonCanYouStart: activeDrafts.howSoonCanYouStart,
            employmentType: activeDrafts.employmentType,
            educationalAttainment: activeDrafts.educationalAttainment,
            willingToRelocate: activeDrafts.willingToRelocate,
            studyField: activeDrafts.studyField,
            experience: activeDrafts.experience,
            preferredLanguage: activeDrafts.preferredLanguage,
            minimumSalary: normalizeSalaryDigits(activeDrafts.minimumSalary),
            maximumSalary: normalizeSalaryDigits(activeDrafts.maximumSalary),
            salaryPrivacy: activeDrafts.salaryPrivacy || 'only_me',
            height: activeDrafts.height,
            weight: activeDrafts.weight,
            nationality: activeDrafts.nationality,
            gender: activeDrafts.gender,
            civilStatus: activeDrafts.civilStatus,
            birthday: activeDrafts.birthday,
          },
        };
      }

      if (sectionKey === 'education') {
        const nextEducationEntries = cleanEducationEntriesForSave(activeDrafts.educationEntries || []);

        if (!nextEducationEntries.length) {
          setError('Please add at least one education entry before saving.');
          setSavingSection('');
          return false;
        }

        const incompleteEntry = nextEducationEntries.find((entry) => !(entry.level || entry.educationalAttainment) || !entry.school);
        if (incompleteEntry) {
          setError('Please complete the educational attainment and school / university fields for each education entry.');
          setSavingSection('');
          return false;
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
          return false;
        }

        payload = {
          jobSeekerProfile: {
            educationEntries: nextEducationEntries,
          },
        };
      }

      if (MORE_PROFILE_TAB_KEYS.includes(sectionKey)) {
        const allowedFields = (MORE_PROFILE_SECTIONS[sectionKey]?.fields || []).map((field) => field.key);
        const nextItems = (Array.isArray(activeDrafts[sectionKey]) ? activeDrafts[sectionKey] : [])
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

      const payloadHasChanges = (() => {
        const topLevelPayload = Object.fromEntries(
          Object.entries(payload || {}).filter(([key]) => key !== 'jobSeekerProfile')
        );
        const profilePayload = payload?.jobSeekerProfile || {};

        const topLevelChanged = Object.entries(topLevelPayload).some(([key, value]) =>
          !areProfileValuesEqual(value, formData[key])
        );

        const profileChanged = Object.entries(profilePayload).some(([key, value]) => {
          if (key === 'technicalSkills') {
            return !areProfileValuesEqual(
              normalizeSkillsFromProfile(value),
              normalizeSkillsFromProfile(formData.technicalSkills)
            );
          }
          if (key === 'softSkills') {
            return !areProfileValuesEqual(
              normalizeSkillsFromProfile(value),
              normalizeSkillsFromProfile(formData.softSkills)
            );
          }
          if (key === 'minimumSalary' || key === 'maximumSalary') {
            return normalizeSalaryDigits(value) !== normalizeSalaryDigits(formData[key]);
          }
          return !areProfileValuesEqual(value, formData[key]);
        });

        return topLevelChanged || profileChanged;
      })();

      if (!payloadHasChanges) {
        setError('No changes to save.');
        setSavingSection('');
        return false;
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
            ...activeDrafts,
            technicalSkills: nextTechnicalSkills,
            softSkills: [],
            skillRows: nextSkillRows,
          }));
          setDrafts((prev) => ({
            ...prev,
            ...activeDrafts,
            technicalSkills: nextTechnicalSkills,
            softSkills: [],
            skillRows: nextSkillRows,
          }));
        } else if (sectionKey === 'basic') {
          const combinedAddress = buildAddressString(activeDrafts);
          setFormData((prev) => ({
            ...prev,
            ...activeDrafts,
            address: combinedAddress,
          }));
        } else if (sectionKey === 'about') {
          const savedAboutMe = payload.jobSeekerProfile?.aboutMe || '';
          setFormData((prev) => ({ ...prev, ...activeDrafts, aboutMe: savedAboutMe }));
          setDrafts((prev) => ({ ...prev, ...activeDrafts, aboutMe: savedAboutMe }));
        } else {
          setFormData((prev) => ({ ...prev, ...activeDrafts }));
        }

        setEditing((prev) => ({ ...prev, [sectionKey]: false }));

        if (response.data.user) {
          setUserData(response.data.user);
          localStorage.setItem('user', JSON.stringify(response.data.user));
        }

        showSuccess('Saved Successfully', 'Your profile section has been updated.');
        return true;
      }

      return false;
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to save changes.');
      return false;
    } finally {
      setSavingSection('');
    }
  };

  const cancelEdit = (sectionKey) => {
    // Validation messages belong only to the modal that created them.
    // Closing or cancelling a modal must not leave the message on the page
    // or show it inside another modal later.
    setError('');

    if (sectionKey === 'education') {
      setDrafts(resetEducationDraftFields(formData));
      setEditing((prev) => ({ ...prev, [sectionKey]: false }));
      return;
    }

    setDrafts(formData);
    setEditing((prev) => ({ ...prev, [sectionKey]: false }));
  };


  const requireCompleteBasicInformation = () => {
    if (isBasicInformationComplete) return true;

    // Show a guided modal instead of a page-level warning.
    setError('');
    setBasicInformationNotice({
      open: true,
      missingFields: basicInformationMissingFields,
    });

    return false;
  };

  const openAddSectionsWithBasicCheck = () => {
    if (!requireCompleteBasicInformation()) return;
    setAddSectionsModalOpen(true);
  };


  const openProfileEditModal = (sectionKey, itemIndex = null) => {
    // Basic Information is the prerequisite for every other resume section.
    if (sectionKey !== 'personal' && !requireCompleteBasicInformation()) return;

    // Do not carry a validation message from a previously opened section.
    setError('');
    if (sectionKey === 'personal') {
      setProfileEntryModalContext({ sectionKey: '', mode: 'edit', index: -1, originalItems: [] });
      setDrafts(formData);
      setEditing((prev) => ({ ...prev, basic: true }));
      return;
    }

    if (sectionKey === 'work') {
      openAddWorkExperienceModal();
      return;
    }

    if (sectionKey === 'credentials') return;

    if (sectionKey === 'skills') {
      setProfileEntryModalContext({ sectionKey: '', mode: 'edit', index: -1, originalItems: [] });
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
      const currentItems = cleanEducationEntriesForSave(buildEducationDraftEntries(formData));
      const isEditingEntry = Number.isInteger(itemIndex) && itemIndex >= 0;
      const selectedItem = isEditingEntry
        ? currentItems[itemIndex] || createEmptyEducationEntry()
        : createEmptyEducationEntry();

      setProfileEntryModalContext({
        sectionKey,
        mode: isEditingEntry ? 'edit' : 'add',
        index: isEditingEntry ? itemIndex : -1,
        originalItems: currentItems,
      });
      setDrafts((prev) => ({
        ...prev,
        ...formData,
        educationEntries: [normalizeEducationEntry(selectedItem)],
      }));
      setEditModalSection(sectionKey);
      return;
    }

    if (MORE_PROFILE_TAB_KEYS.includes(sectionKey)) {
      const currentItems = Array.isArray(formData[sectionKey]) ? formData[sectionKey] : [];
      const isEditingEntry = Number.isInteger(itemIndex) && itemIndex >= 0;
      const selectedItem = isEditingEntry
        ? currentItems[itemIndex] || createEmptyProfileEntry(sectionKey)
        : createEmptyProfileEntry(sectionKey);

      setProfileEntryModalContext({
        sectionKey,
        mode: isEditingEntry ? 'edit' : 'add',
        index: isEditingEntry ? itemIndex : -1,
        originalItems: currentItems,
      });
      setDrafts((prev) => ({
        ...prev,
        ...formData,
        [sectionKey]: [{ ...selectedItem }],
      }));
      setEditModalSection(sectionKey);
      return;
    }

    setProfileEntryModalContext({ sectionKey: '', mode: 'edit', index: -1, originalItems: [] });
    setDrafts(formData);
    setEditModalSection(sectionKey);
  };

  const closeProfileEditModal = () => {
    setDrafts(formData);
    setError('');
    setEditModalSection('');
    setProfileEntryModalContext({ sectionKey: '', mode: 'edit', index: -1, originalItems: [] });
  };

  const saveProfileEditModal = async () => {
    if (!editModalSection) return;

    if (
      profileEntryModalContext.sectionKey === editModalSection &&
      (editModalSection === 'education' || MORE_PROFILE_TAB_KEYS.includes(editModalSection))
    ) {
      const originalItems = Array.isArray(profileEntryModalContext.originalItems)
        ? profileEntryModalContext.originalItems
        : [];
      const isEditMode =
        profileEntryModalContext.mode === 'edit' &&
        profileEntryModalContext.index >= 0;

      if (editModalSection === 'education') {
        const selectedEntry = normalizeEducationEntries(drafts.educationEntries || [], true)[0];

        if (!selectedEntry || !hasEducationEntryValue(selectedEntry)) {
          setError('Please complete the education entry before saving.');
          return;
        }

        if (
          !(selectedEntry.level || selectedEntry.educationalAttainment) ||
          !selectedEntry.school ||
          !selectedEntry.startMonth ||
          !selectedEntry.startYear ||
          !selectedEntry.endMonth ||
          !selectedEntry.endYear
        ) {
          setError('Please complete all required education fields before saving.');
          return;
        }

        if (
          isEditMode &&
          areProfileValuesEqual(
            selectedEntry,
            originalItems[profileEntryModalContext.index] || {}
          )
        ) {
          setError('No changes to save.');
          return;
        }

        const nextItems = [...originalItems];
        if (isEditMode) {
          nextItems[profileEntryModalContext.index] = selectedEntry;
        } else {
          nextItems.push(selectedEntry);
        }

        const mergedDrafts = {
          ...drafts,
          educationEntries: nextItems,
        };

        const saved = await saveSection('education', mergedDrafts);
        if (!saved) return;
      } else {
        const selectedEntry = Array.isArray(drafts[editModalSection])
          ? drafts[editModalSection][0]
          : null;

        if (!selectedEntry || !hasMeaningfulObjectValue(selectedEntry)) {
          setError('Please add information before saving.');
          return;
        }

        const validationError = getProfileEntryValidationError(editModalSection, selectedEntry);
        if (validationError) {
          setError(validationError);
          return;
        }

        if (
          isEditMode &&
          areProfileValuesEqual(
            selectedEntry,
            originalItems[profileEntryModalContext.index] || {}
          )
        ) {
          setError('No changes to save.');
          return;
        }

        const nextItems = [...originalItems];
        if (isEditMode) {
          nextItems[profileEntryModalContext.index] = selectedEntry;
        } else {
          nextItems.push(selectedEntry);
        }

        const mergedDrafts = {
          ...drafts,
          [editModalSection]: nextItems,
        };

        const saved = await saveSection(editModalSection, mergedDrafts);
        if (!saved) return;
      }

      setEditModalSection('');
      setProfileEntryModalContext({ sectionKey: '', mode: 'edit', index: -1, originalItems: [] });
      return;
    }

    if (editModalSection === 'skills') {
      const nextSkillRows = normalizeSkillRows(
        drafts.skillRows || [
          ...(drafts.technicalSkills || []),
          ...(drafts.softSkills || []),
        ],
        true
      ).filter((item) => String(item.skill || '').trim());

      if (!nextSkillRows.length) {
        setError('Please add at least one skill before saving.');
        return;
      }

      const currentSkillRows = normalizeSkillRows([
        ...(formData.technicalSkills || []),
        ...(formData.softSkills || []),
      ]).filter((item) => String(item.skill || '').trim());

      if (areProfileValuesEqual(nextSkillRows, currentSkillRows)) {
        setError('No changes to save.');
        return;
      }
    }

    const saved = await saveSection(editModalSection === 'skills' ? 'career' : editModalSection);
    if (saved) {
      setEditModalSection('');
    }
  };

  const handleDeleteEducationEntryFromProfile = (index) => {
    const currentItems = cleanEducationEntriesForSave(buildEducationDraftEntries(formData));
    const selectedItem = currentItems[index];
    if (!selectedItem) return;

    openDeleteConfirmation({
      title: 'Delete this education entry?',
      message: 'You will not be able to recover it.',
      confirmText: 'Delete',
      onConfirm: async () => {
        try {
          setSavingSection('education');
          setError('');

          const nextItems = currentItems.filter((_, itemIndex) => itemIndex !== index);
          const token = localStorage.getItem('token');
          const payload = {
            jobSeekerProfile: {
              educationEntries: nextItems,
            },
          };

          const response = await axios.put(`${API_BASE}/auth/update-profile`, payload, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (response.data?.success) {
            const updatedProfile = response.data.user?.jobSeekerProfile || {};
            const nextFormData = {
              ...formData,
              educationEntries:
                Array.isArray(updatedProfile.educationEntries)
                  ? updatedProfile.educationEntries
                  : payload.jobSeekerProfile.educationEntries,
            };

            setFormData(nextFormData);
            setDrafts(resetEducationDraftFields(nextFormData));

            if (response.data.user) {
              setUserData(response.data.user);
              localStorage.setItem('user', JSON.stringify(response.data.user));
            }

            showSuccess('Deleted Successfully', 'The education entry was removed.');
          }
        } catch (err) {
          console.error(err);
          setError(err.response?.data?.message || 'Failed to delete the education entry.');
        } finally {
          setSavingSection('');
          closeConfirmModal();
        }
      },
    });
  };

  const handleDeleteProfileEntry = (sectionKey, index) => {
    const currentItems = Array.isArray(formData[sectionKey]) ? formData[sectionKey] : [];
    const selectedItem = currentItems[index];
    if (!selectedItem) return;

    openDeleteConfirmation({
      title: `Delete this ${MORE_PROFILE_SECTIONS[sectionKey]?.title || 'entry'}?`,
      message: 'You will not be able to recover it.',
      confirmText: 'Delete',
      onConfirm: async () => {
        try {
          setSavingSection(sectionKey);
          setError('');

          const nextItems = currentItems.filter((_, itemIndex) => itemIndex !== index);
          const token = localStorage.getItem('token');
          const payload = {
            jobSeekerProfile: {
              [sectionKey]: nextItems,
            },
          };

          const response = await axios.put(`${API_BASE}/auth/update-profile`, payload, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (response.data?.success) {
            const savedItems =
              response.data.user?.jobSeekerProfile?.[sectionKey] ||
              payload.jobSeekerProfile[sectionKey];

            setFormData((prev) => ({ ...prev, [sectionKey]: savedItems }));
            setDrafts((prev) => ({ ...prev, [sectionKey]: savedItems }));

            if (response.data.user) {
              setUserData(response.data.user);
              localStorage.setItem('user', JSON.stringify(response.data.user));
            }

            showSuccess('Deleted Successfully', 'The profile entry was removed.');
          }
        } catch (err) {
          console.error(err);
          setError(err.response?.data?.message || 'Failed to delete the profile entry.');
        } finally {
          setSavingSection('');
          closeConfirmModal();
        }
      },
    });
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
    openDeleteConfirmation({
      title: 'Are you sure you want to delete this?',
      message: 'You will not be able to recover it.',
      confirmText: 'Delete',
      onConfirm: () => {
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
        closeConfirmModal();
      },
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
    openDeleteConfirmation({
      title: 'Are you sure you want to delete this?',
      message: 'You will not be able to recover it.',
      confirmText: 'Delete',
      onConfirm: () => {
        setDrafts((prev) => ({
          ...prev,
          [sectionKey]: (Array.isArray(prev[sectionKey]) ? prev[sectionKey] : []).filter((_, itemIndex) => itemIndex !== index),
        }));
        closeConfirmModal();
      },
    });
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
    openDeleteConfirmation({
      title: 'Are you sure you want to delete this?',
      message: 'You will not be able to recover it.',
      confirmText: 'Delete',
      onConfirm: () => {
        setDrafts((prev) => {
          const nextEntries = normalizeEducationEntries(prev.educationEntries || [], true)
            .filter((_, itemIndex) => itemIndex !== index);

          return {
            ...prev,
            educationEntries: nextEntries.length ? nextEntries : [createEmptyEducationEntry()],
          };
        });
        closeConfirmModal();
      },
    });
  };

  const updateEducationEntry = (index, field, value) => {
    setDrafts((prev) => ({
      ...prev,
      educationEntries: (
        Array.isArray(prev.educationEntries) && prev.educationEntries.length
          ? prev.educationEntries
          : [createEmptyEducationEntry()]
      ).map((item, itemIndex) => {
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
    if (!requireCompleteBasicInformation()) return;

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
    if (!requireCompleteBasicInformation()) return;

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

    openDeleteConfirmation({
      title: 'Are you sure you want to delete this?',
      message: 'You will not be able to recover it.',
      confirmText: 'Delete',
      onConfirm: async () => {
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
    const normalizedSections = normalizeAddedResumeSections(
      formData.addedResumeSections,
      formData
    );

    setAddedMoreSections(normalizedSections);
  }, [formData]);

  const handleAddMoreSection = async (sectionKey) => {
    if (!ADDABLE_MORE_SECTION_KEYS.includes(sectionKey) || addedMoreSections.includes(sectionKey)) return;

    const nextSections = ADDABLE_MORE_SECTION_KEYS.filter((key) =>
      [...addedMoreSections, sectionKey].includes(key)
    );

    try {
      setSavingSection(sectionKey);
      setError('');

      const token = localStorage.getItem('token');
      const response = await axios.put(
        `${API_BASE}/auth/update-profile`,
        { jobSeekerProfile: { addedResumeSections: nextSections } },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data?.success) {
        setAddedMoreSections(nextSections);
        setFormData((prev) => ({ ...prev, addedResumeSections: nextSections }));
        setDrafts((prev) => ({ ...prev, addedResumeSections: nextSections }));
        setOpenTabs((prev) => (prev.includes(sectionKey) ? prev : [...prev, sectionKey]));

        if (response.data.user) {
          setUserData(response.data.user);
          localStorage.setItem('user', JSON.stringify(response.data.user));
        }
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to add the resume section.');
    } finally {
      setSavingSection('');
    }
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

    openDeleteConfirmation({
      title: `Delete ${sectionTitle} section?`,
      message: 'You will not be able to recover it.',
      confirmText: 'Delete',
      onConfirm: async () => {
        try {
          setSavingSection(sectionKey);
          setError('');

          const token = localStorage.getItem('token');
          const nextSections = addedMoreSections.filter((key) => key !== sectionKey);
          const payload = {
            jobSeekerProfile: {
              [sectionKey]: [],
              addedResumeSections: nextSections,
            },
          };

          const response = await axios.put(`${API_BASE}/auth/update-profile`, payload, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (response.data?.success) {
            setFormData((prev) => ({ ...prev, [sectionKey]: [], addedResumeSections: nextSections }));
            setDrafts((prev) => ({ ...prev, [sectionKey]: [], addedResumeSections: nextSections }));
            setAddedMoreSections(nextSections);
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
  { label: 'Birthday', value: formatBirthdayDisplay(formData.birthday) },
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
    { label: 'Study Field', value: formData.studyField },
    { label: 'Willing to Relocate', value: formData.willingToRelocate },
    { label: 'How Soon Can You Start', value: formData.howSoonCanYouStart },
    { label: 'Work Experience ', value: formData.whatHaveYouDone },
  ];

  const documentConfig = [
    { type: 'validId', title: 'Valid ID', icon: <FaShieldAlt className="text-sm" /> },
    { type: 'sss', title: 'SSS', icon: <FaFileAlt className="text-sm" /> },
    { type: 'cv', title: 'Resume', icon: <FaFileAlt className="text-sm" /> },
    { type: 'philhealth', title: 'PhilHealth', icon: <FaFileAlt className="text-sm" /> },
    { type: 'diploma', title: 'Diploma', icon: <FaFileAlt className="text-sm" /> },
    { type: 'pagibig', title: 'Pag-IBIG', icon: <FaFileAlt className="text-sm" /> },
    { type: 'tor', title: 'TOR', icon: <FaFileAlt className="text-sm" /> },
    { type: 'tin', title: 'TIN', icon: <FaFileAlt className="text-sm" /> },
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
          <div className="flex items-start justify-center gap-5">
            <div className="flex-1 min-w-0">
              <AutoFitProfileName>{fullName || 'YOUR NAME'}</AutoFitProfileName>
              <div className="mt-2 font-serif text-[16px] leading-7 text-gray-900">
                {buildAddressString(formData) || 'Complete your basic information to get started.'}
              </div>
              {(formData.email || formData.phoneNumber) ? (
                <div className="mt-1 font-serif text-[16px] leading-7 text-gray-900">
                  {[formData.email, formData.phoneNumber].filter(Boolean).join(' • ')}
                </div>
              ) : null}
              <div className="mt-2 font-serif italic text-[16px] leading-7 text-gray-500">
                {[
                  formData.campus,
                  formData.course,
                  formData.yearGraduated ? `Class of ${formData.yearGraduated}` : '',
                ].filter(Boolean).join(', ')}
              </div>
            </div>

            <div className="hidden sm:flex w-[124px] h-[124px] mr-6 bg-[#1f2430] text-white items-center justify-center font-serif text-[32px] font-bold shrink-0 overflow-hidden">
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
        <RichTextDisplay
          value={formData.aboutMe}
          className="px-0 pb-5 pt-2 font-serif text-[13px] leading-5 text-gray-900 text-justify"
        />
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
        formData.experience,
        formData.nationality,
        formData.preferredLanguage,
        formData.gender,
        formData.educationalAttainment,
        formData.civilStatus,
        formData.studyField,
        formData.birthday,
      ].some((value) => String(value || '').trim());

      if (!hasCareerData) return renderEmptyLine(EMPTY_SECTION_MESSAGES.career);

      return (
        <div className="px-0 pb-5 pt-2 grid grid-cols-1 md:grid-cols-3 gap-x-12 gap-y-4 font-serif text-[13px] leading-5 text-gray-900">
          <div className="space-y-1">
            <div><b>Preferred Work Mode:</b> {textOrEmpty(formData.preferredWorkMode, 'Not provided')}</div>
            <div><b>Employment Type:</b> {textOrEmpty(formData.employmentType, 'Not provided')}</div>
            <div><b>Willing to Relocate:</b> {textOrEmpty(formData.willingToRelocate, 'Not provided')}</div>
            <div><b>How Soon Can Start:</b> {textOrEmpty(formData.howSoonCanYouStart, 'Not provided')}</div>
            <div><b>Experience:</b> {textOrEmpty(formData.experience, 'Not provided')}</div>
          </div>

          <div className="space-y-1">
            <div><b>Preferred Language:</b> {textOrEmpty(formData.preferredLanguage, 'Not provided')}</div>
            <div><b>Educational Attainment:</b> {textOrEmpty(formData.educationalAttainment, 'Not provided')}</div>
            <div><b>Double Degree:</b> {textOrEmpty(formData.studyField, 'Not provided')}</div>
            <div><b>Salary:</b> {salaryText || 'Not provided'}</div>
            <div><b>Nationality:</b> {textOrEmpty(formData.nationality, 'Not provided')}</div>
          </div>

          <div className="space-y-1">
            <div><b>Height:</b> {formatDisplayHeight(formData.height)}</div>
            <div><b>Weight:</b> {formatDisplayWeight(formData.weight)}</div>
            <div><b>Gender:</b> {textOrEmpty(formData.gender, 'Not provided')}</div>
            <div><b>Civil Status:</b> {textOrEmpty(formData.civilStatus, 'Not provided')}</div>
            <div><b>Birthday:</b> {textOrEmpty(formatBirthdayDisplay(formData.birthday), 'Not provided')}</div>
          </div>
        </div>
      );
    }

    if (sectionKey === 'work') {
      if (workExperienceLoading) return <div className="pb-5"><Spinner size="small" /></div>;
      if (!workExperiences.length) return renderEmptyLine(EMPTY_SECTION_MESSAGES.work);
      return (
        <div className="px-0 pb-5 pt-2 space-y-4 font-serif text-[13px] leading-5 text-gray-900">
          {workExperiences.map((item, index) => {
            const startDateText = formatWorkExperienceMonthYear(item.startDate);
            const endDateText = item.isPresent
              ? 'Present'
              : formatWorkExperienceMonthYear(item.endDate);
            const dateText = [startDateText, endDateText].filter(Boolean).join(' – ');

            return (
              <div
                key={item._id || item.id || `work-${index}`}
                className="group py-2 first:pt-0 last:pb-0"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="font-bold">{item.companyName || 'Company Name'}</div>
                    <div className="italic">{item.positionTitle || 'Position'}</div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1 sm:justify-end">
                    {dateText ? (
                      <div className="mr-1 whitespace-nowrap italic text-gray-700">
                        {dateText}
                      </div>
                    ) : null}

                    <div className="flex items-center gap-1 font-sans opacity-100">
                      <button
                        type="button"
                        onClick={() => openEditWorkExperienceModal(item)}
                        className="inline-flex h-6 w-6 items-center justify-center text-[#2e66a6] transition hover:text-[#1f4f86]"
                        aria-label={`Edit ${item.companyName || 'work experience'}`}
                        title="Edit"
                      >
                        <FaPen className="text-[11px]" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteWorkExperience(item)}
                        className="inline-flex h-6 w-6 items-center justify-center text-red-500 transition hover:text-red-600"
                        aria-label={`Remove ${item.companyName || 'work experience'}`}
                        title="Remove"
                      >
                        <FaTrash className="text-[11px]" />
                      </button>
                    </div>
                  </div>
                </div>

                {item.description ? (
                  <RichTextDisplay value={item.description} className="mt-2" />
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
          <div className="flex flex-wrap items-center gap-2">
            {allSkills.map((item, index) => {
              const parsedSkill = parseSkillWithProficiency(item);
              return (
                <span
                  key={`skill-display-${index}`}
                  className="inline-flex items-center overflow-hidden whitespace-nowrap rounded-full border border-[#d8e2ee] bg-white text-[12px] font-medium text-gray-700"
                >
                  <span className="px-3 py-1">{parsedSkill.skill}</span>
                  <span className={`border-l px-2.5 py-1 font-semibold ${getProficiencyLevelStyle(parsedSkill.proficiency)}`}>
                    {parsedSkill.proficiency}
                  </span>
                </span>
              );
            })}
          </div>
        </div>
      ) : renderEmptyLine(EMPTY_SECTION_MESSAGES.skills);
    }

    if (sectionKey === 'education') {
      const items = hasEducationEntries ? educationEntries : [];
      const hasAny = items.some((item) => item.school || item.campus || item.level || item.educationalAttainment || item.startMonth || item.startYear || item.endMonth || item.endYear || item.description);
      if (!hasAny) return renderEmptyLine(EMPTY_SECTION_MESSAGES.education);
      return (
        <div className="px-0 pb-5 pt-2 space-y-3 font-serif text-[13px] leading-5 text-gray-900">
          {items.map((item, index) => (
            <div
              key={item._id || `education-${index}`}
              className="group flex flex-col gap-2 py-1 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="min-w-0">
                <div className="font-bold">{item.school || item.campus || 'School / University'}</div>
                <div className="italic">{item.educationalAttainment || item.level || 'Educational Attainment'}</div>
                {item.description ? <RichTextDisplay value={item.description} className="mt-1 text-gray-700" /> : null}
              </div>

              <div className="flex shrink-0 items-center gap-1 sm:justify-end">
                <div className="mr-1 whitespace-nowrap italic text-gray-700">
                  {getEducationYearText(item)}
                </div>

                <div className="flex items-center gap-1 opacity-100">
                  <button
                    type="button"
                    onClick={() => openProfileEditModal('education', index)}
                    className="inline-flex h-6 w-6 items-center justify-center text-[#2e66a6] transition hover:text-[#1f4f86]"
                    aria-label="Edit education entry"
                    title="Edit"
                  >
                    <FaPen className="text-[11px]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteEducationEntryFromProfile(index)}
                    className="inline-flex h-6 w-6 items-center justify-center text-red-500 transition hover:text-red-600"
                    aria-label="Remove education entry"
                    title="Remove"
                  >
                    <FaTrash className="text-[11px]" />
                  </button>
                </div>
              </div>
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
                onProtectedAction={requestCredentialPassword}
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
        <div
          className={
            sectionKey === 'references'
              ? 'grid grid-cols-1 gap-x-6 gap-y-5 px-0 pb-5 pt-2 font-serif text-[13px] leading-5 text-gray-900 sm:grid-cols-2 lg:grid-cols-3'
              : 'px-0 pb-5 pt-2 space-y-3 font-serif text-[13px] leading-5 text-gray-900'
          }
        >
          {items.map((item, index) => {
            const dateText = formatProfileEntryDate(item);
            const subLine = getProfileEntrySubLine(sectionKey, item);

            if (sectionKey === 'references') {
              return (
                <div
                  key={item._id || `${sectionKey}-${index}`}
                  className="group relative min-w-0 py-1 pr-12"
                >
                  <div className="font-bold">{getProfileEntryTitle(sectionKey, item)}</div>

                  <div className="mt-0.5 space-y-0.5 text-gray-800">
                    {item.position ? <div>{item.position}</div> : null}
                    {item.company ? <div>{item.company}</div> : null}
                    {item.phone ? <div>{item.phone}</div> : null}
                    {item.email ? <div className="break-all text-[#2e66a6]">{item.email}</div> : null}
                  </div>

                  <div className="absolute right-0 top-0 flex items-center gap-1 opacity-100">
                    <button
                      type="button"
                      onClick={() => openProfileEditModal(sectionKey, index)}
                      className="inline-flex h-6 w-6 items-center justify-center text-[#2e66a6] transition hover:text-[#1f4f86]"
                      aria-label={`Edit ${getProfileEntryTitle(sectionKey, item)}`}
                      title="Edit"
                    >
                      <FaPen className="text-[11px]" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteProfileEntry(sectionKey, index)}
                      className="inline-flex h-6 w-6 items-center justify-center text-red-500 transition hover:text-red-600"
                      aria-label={`Remove ${getProfileEntryTitle(sectionKey, item)}`}
                      title="Remove"
                    >
                      <FaTrash className="text-[11px]" />
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={item._id || `${sectionKey}-${index}`}
                className="group py-1"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="font-bold">{getProfileEntryTitle(sectionKey, item)}</div>
                    {subLine ? <div className="italic">{subLine}</div> : null}
                  </div>

                  <div className="flex shrink-0 items-center gap-1 sm:justify-end">
                    {dateText ? (
                      <div className="mr-1 whitespace-nowrap italic text-gray-700">
                        {dateText}
                      </div>
                    ) : null}

                    <div className="flex items-center gap-1 opacity-100">
                      <button
                        type="button"
                        onClick={() => openProfileEditModal(sectionKey, index)}
                        className="inline-flex h-6 w-6 items-center justify-center text-[#2e66a6] transition hover:text-[#1f4f86]"
                        aria-label={`Edit ${getProfileEntryTitle(sectionKey, item)}`}
                        title="Edit"
                      >
                        <FaPen className="text-[11px]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteProfileEntry(sectionKey, index)}
                        className="inline-flex h-6 w-6 items-center justify-center text-red-500 transition hover:text-red-600"
                        aria-label={`Remove ${getProfileEntryTitle(sectionKey, item)}`}
                        title="Remove"
                      >
                        <FaTrash className="text-[11px]" />
                      </button>
                    </div>
                  </div>
                </div>

                {item.description ? <RichTextDisplay value={item.description} className="mt-2" /> : null}
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
        onCancel={closeConfirmModal}
        onConfirm={() => confirmState.onConfirmAction?.()}
      />

      <ResumePasswordModal
        open={downloadPasswordModalOpen}
        mode={resumePasswordAction}
        resourceTitle={passwordResourceTitle}
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
        error={error}
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
        onRemove={handleDeleteMoreSection}
        onClose={() => setAddSectionsModalOpen(false)}
      />

      <SkillProficiencyDescriptionModal
        open={skillProficiencyModalOpen}
        onClose={() => setSkillProficiencyModalOpen(false)}
      />

      <ProfileEditModal
        open={Boolean(editModalSection)}
        sectionKey={editModalSection}
        entryMode={profileEntryModalContext.mode}
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

      <div className="min-h-[100dvh] h-auto bg-transparent overflow-visible pb-6">
        <div className="max-w-[1420px] mx-auto px-4 sm:px-6 lg:px-8">
          {basicInformationNotice.open && !isBasicInformationComplete
            ? createPortal(
                <div
                  className="fixed inset-0 z-[10060] flex items-center justify-center bg-black/45 px-4 py-6"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="basic-information-required-title"
                  onMouseDown={(event) => {
                    if (event.target === event.currentTarget) {
                      setBasicInformationNotice({
                        open: false,
                        missingFields: [],
                      });
                    }
                  }}
                >
                  <div className="w-full max-w-[520px] overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.28)]">
                    <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-4 sm:px-6">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                          <FaInfoCircle className="text-lg" />
                        </div>

                        <div className="min-w-0">
                          <h2
                            id="basic-information-required-title"
                            className="text-lg font-bold leading-6 text-gray-900"
                          >
                            Complete your Basic Information first
                          </h2>
                          <p className="mt-1 text-sm leading-5 text-gray-600">
                            You need to complete the required Basic Information fields before adding or editing other resume sections.
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setBasicInformationNotice({
                          open: false,
                          missingFields: [],
                        })}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xl leading-none text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
                        aria-label="Close Basic Information reminder"
                      >
                        ×
                      </button>
                    </div>

                    <div className="px-5 py-5 sm:px-6">
                      {basicInformationNotice.missingFields.length ? (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                          <div className="text-sm font-semibold text-gray-900">
                            Required fields to complete
                          </div>
                          <div className="mt-1 text-sm leading-6 text-gray-700">
                            {basicInformationNotice.missingFields.join(', ')}.
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <div className="flex flex-col-reverse gap-3 border-t border-gray-200 bg-gray-50 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
                      <button
                        type="button"
                        onClick={() => setBasicInformationNotice({
                          open: false,
                          missingFields: [],
                        })}
                        className="inline-flex h-11 items-center justify-center rounded-xl border border-gray-300 bg-white px-5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                      >
                        Cancel
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setBasicInformationNotice({
                            open: false,
                            missingFields: [],
                          });
                          openProfileEditModal('personal');
                        }}
                        className="inline-flex h-11 items-center justify-center rounded-xl bg-[#2e66a6] px-5 text-sm font-semibold text-white transition hover:bg-[#25578f] focus:outline-none focus:ring-2 focus:ring-[#2e66a6]/30"
                      >
                        Complete Basic Information
                      </button>
                    </div>
                  </div>
                </div>,
                document.body
              )
            : null}

          {error && !editModalSection && !editing.basic ? (
            <Alert type="error" title="Error" message={error} onClose={() => setError('')} />
          ) : null}

          {isApplyFlow ? (
            <div className="mb-4 rounded-2xl border border-[#d8e2ee] bg-white px-4 sm:px-6 py-4 shadow-sm">
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
                  Submit Profile
                </button>
              </div>
            </div>
          ) : null}

          <div className="bg-transparent overflow-visible">
            <div className="relative z-0 w-full max-w-full px-0 pt-0 pb-10">
              <div
                ref={profileGridRef}
                className="grid grid-cols-1 lg:grid-cols-[minmax(310px,340px)_minmax(0,1fr)] gap-8 items-start"
              >
                <div
                  ref={sidebarColumnRef}
                  className="order-2 lg:order-1 lg:self-start h-fit"
                  style={sidebarPlaceholderHeight ? { minHeight: `${sidebarPlaceholderHeight}px` } : undefined}
                >
                  <div ref={sidebarPanelRef} style={sidebarFixedStyle || undefined}>
                    <ProfileRightPanel
                      jobSeekerLevel={jobSeekerLevel}
                      onAddSections={openAddSectionsWithBasicCheck}
                      addSectionsReminder={sectionReminders.additional}
                    />
                  </div>
                </div>

                <div className="order-1 lg:order-2 relative bg-white border border-[#d8e2ee] rounded-[18px] shadow-[0_8px_30px_rgba(46,102,166,0.10)] min-h-[760px] px-6 sm:px-10 lg:px-12 py-10">
                  <div
                    className="absolute left-4 top-4 z-10 flex h-16 w-16 items-center justify-center rounded-full p-[5px] shadow-sm sm:left-5 sm:top-5"
                    style={{
                      background: `conic-gradient(#1658d3 ${todoProgress.percentage * 3.6}deg, #dbeafe 0deg)`,
                    }}
                    role="progressbar"
                    aria-valuemin="0"
                    aria-valuemax="100"
                    aria-valuenow={todoProgress.percentage}
                    aria-label="Resume completion percentage"
                    title={`${todoProgress.percentage}% Resume Complete`}
                  >
                    <span className="flex h-full w-full items-center justify-center rounded-full bg-white text-[14px] font-extrabold text-[#1658d3]">
                      {todoProgress.percentage}%
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
                    <div>
                      <h2 className="text-[22px] font-bold text-gray-900 sr-only">Profile</h2>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pl-16 sm:pl-20">
                      <button
                        type="button"
                        onClick={handleDownloadResume}
                        className="h-10 px-4 rounded-md bg-[#2e66a6] text-white text-sm font-bold inline-flex items-center gap-2 hover:bg-[#255484]"
                      >
                        <FaDownload className="text-xs" />
                        Export CV
                      </button>
                    </div>
                  </div>

                  <div className="bg-white">
                    {[
                      { key: 'personal', label: 'Basic Information', actionLabel: 'EDIT' },
                      { key: 'about', label: 'Objective', actionLabel: formData.aboutMe ? 'EDIT' : 'ADD' },
                      {
                        key: 'career',
                        label: 'Personal Information',
                        actionLabel: [
                          formData.preferredWorkMode,
                          formData.employmentType,
                          formData.minimumSalary,
                          formData.maximumSalary,
                          formData.height,
                          formData.willingToRelocate,
                          formData.weight,
                          formData.howSoonCanYouStart,
                          formData.experience,
                          formData.nationality,
                          formData.preferredLanguage,
                          formData.gender,
                          formData.educationalAttainment,
                          formData.civilStatus,
                          formData.studyField,
                          formData.birthday,
                        ].some((value) => String(value || '').trim()) ? 'EDIT' : 'ADD',
                      },
                      { key: 'work', label: 'Work Experience', actionLabel: 'ADD' },
                      {
                        key: 'skills',
                        label: 'Skills',
                        actionLabel: [
                          ...normalizeSkillsFromProfile(formData.technicalSkills),
                          ...normalizeSkillsFromProfile(formData.softSkills),
                        ].length ? 'EDIT' : 'ADD',
                      },
                      { key: 'education', label: 'Education', actionLabel: 'ADD' },
                      { key: 'credentials', label: 'Credentials', actionLabel: '' },
                      ...addedMoreSections
                        .map((key) => ({
                          key,
                          label: MORE_PROFILE_SECTIONS[key]?.title || key,
                          actionLabel: hasMeaningfulListContent(formData[key]) ? 'EDIT' : 'ADD',
                        })),
                    ].map((section) => {
                      const targetTab = section.key === 'about' ? 'about' : section.key === 'work' ? 'work' : section.key === 'skills' ? 'skills' : section.key;
                      const isOpen = openTabs.includes(targetTab);
                      const isMoreProfileSection = MORE_PROFILE_TAB_KEYS.includes(section.key);
                      const canDeleteMoreProfileSection = isMoreProfileSection;

                      return (
                        <div
                          key={section.key}
                          id={section.key === 'personal' ? 'basic-information-section' : undefined}
                          className="mt-2 w-full bg-white first:mt-0"
                        >
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
                              <span className="min-w-0">
                                <span className="block font-serif text-[16px] font-bold uppercase tracking-wide text-gray-900 truncate">{section.label}</span>
                                {sectionReminders[section.key] ? (
                                  <span className="mt-0.5 block text-[12px] font-medium normal-case tracking-normal text-amber-700">
                                    {sectionReminders[section.key]}
                                  </span>
                                ) : null}
                              </span>
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
                              {canDeleteMoreProfileSection ? (
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

          </div>
        </div>
      </div>
    </JobSeekerLayout>
  );
};

export default MyProfile;
