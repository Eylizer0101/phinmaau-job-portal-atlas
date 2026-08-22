

// src/pages/employer/dashboard/ApplicationDetails.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import EmployerLayout from '../../../layouts/EmployerLayout';
import { normalizeUserToResumeData } from '../../../components/shared/resumePrintTemplate';
import {
  filterMeaningfulResumeItems,
  hasMeaningfulResumeObject,
  hasMeaningfulResumeRows,
  isMeaningfulResumeValue,
  normalizeAddedResumeSections,
} from '../../../components/shared/resumeDisplayUtils';

const API_HOST = process.env.REACT_APP_API_URL
  ? process.env.REACT_APP_API_URL.replace(/\/api\/?$/, '')
  : 'https://phinmaau-job-portal-atlas.onrender.com';

const cn = (...classes) => classes.filter(Boolean).join(' ');

const FOR_INTERVIEW_DECLINE_REASONS = [
  'Did not meet minimum qualifications',
  'Does not meet screening criteria',
  'Insufficient relevant experience',
  'Skills not aligned with job requirements',
  'Incomplete application information',
  'Position Requirements Have Changed',
  'Position Has Been Filled',
  'Educational Requirement Not Met',
  'Too Many Qualified Applicants',
];

const APPLICANTS_DECLINE_REASONS = [
  'Did not meet minimum qualifications',
  'Does not meet screening criteria',
  'Insufficient relevant experience',
  'Skills not aligned with job requirements',
  'Incomplete application information',
  'Position Requirements Have Changed',
  'Position Has Been Filled',
  'Educational Requirement Not Met',
  'Too Many Qualified Applicants',
];

const PROFICIENCY_STYLES = {
  Basic: 'border-slate-200 bg-slate-100 text-slate-600',
  Novice: 'border-sky-200 bg-sky-50 text-sky-700',
  Intermediate: 'border-amber-200 bg-amber-50 text-amber-700',
  Advanced: 'border-violet-200 bg-violet-50 text-violet-700',
  Expert: 'border-emerald-200 bg-emerald-50 text-emerald-700',
};

const JOB_SEEKER_LEVEL_BADGES = {
  'First Time Job Seeker': '/images/Firstime.png',
  Intermediate: '/images/Intermediate.png',
  Expert: '/images/Expert.png',
  Pro: '/images/Pro.png',
  Legend: '/images/Legend.png',
};

const SvgIcon = ({ name, className = 'h-5 w-5' }) => {
  const common = { className, fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' };
  const paths = {
    back: 'M15 19l-7-7 7-7', calendar: 'M8 7V3m8 4V3M5 11h14M6 5h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2z',
    check: 'M5 13l4 4L19 7', x: 'M6 18L18 6M6 6l12 12', mail: 'M4 6h16v12H4z M4 7l8 6 8-6',
    message: 'M8 10h8m-8 4h5m7-2a8 8 0 01-8 8 8.7 8.7 0 01-3.7-.8L4 20l.8-4.3A8 8 0 1120 12z',
    resume: 'M7 3h7l4 4v14H7z M14 3v5h5 M10 13h5m-5 4h5', activity: 'M12 8v4l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z',
    send: 'M3 11l18-8-8 18-2-7-8-3z M11 14l4-4',
    search: 'M21 21l-4.35-4.35m2.35-5.65a8 8 0 11-16 0 8 8 0 0116 0z',
    paperclip: 'M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48',
    eye: 'M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
    user: 'M16 7a4 4 0 11-8 0 4 4 0 018 0z M5 21a7 7 0 0114 0',
    userMinus: 'M16 7a4 4 0 11-8 0 4 4 0 018 0z M5 21a7 7 0 0114 0 M17 11h5',
  };
  return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.9} d={paths[name] || paths.user} /></svg>;
};

const Spinner = () => <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-r-transparent" />;

const AutoFitApplicationHeaderName = ({ children, maxFontSize = 30, minFontSize = 13 }) => {
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
    const resizeObserver =
      typeof window.ResizeObserver === 'function'
        ? new window.ResizeObserver(fitText)
        : null;

    if (containerRef.current && resizeObserver) {
      resizeObserver.observe(containerRef.current);
    }

    window.addEventListener('resize', fitText);

    return () => {
      window.cancelAnimationFrame(frameId);
      resizeObserver?.disconnect();
      window.removeEventListener('resize', fitText);
    };
  }, [children, maxFontSize, minFontSize]);

  return (
    <div ref={containerRef} className="min-w-0 max-w-full overflow-hidden">
      <h1
        ref={textRef}
        className="whitespace-nowrap font-bold leading-tight text-gray-900"
        style={{ fontSize: `${fontSize}px` }}
      >
        {children}
      </h1>
    </div>
  );
};

const formatDate = (value, options = {}) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value || '');
  return date.toLocaleDateString('en-PH', options.year ? options : { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatRelativeTime = (value) => {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const diffMilliseconds = Date.now() - date.getTime();
  const isFuture = diffMilliseconds < 0;
  const absoluteMilliseconds = Math.abs(diffMilliseconds);

  const minutes = Math.floor(absoluteMilliseconds / (1000 * 60));
  const hours = Math.floor(absoluteMilliseconds / (1000 * 60 * 60));
  const days = Math.floor(absoluteMilliseconds / (1000 * 60 * 60 * 24));
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  let valueText = '';

  if (minutes < 1) valueText = 'just now';
  else if (minutes < 60) valueText = `${minutes} minute${minutes === 1 ? '' : 's'}`;
  else if (hours < 24) valueText = `${hours} hour${hours === 1 ? '' : 's'}`;
  else if (days < 30) valueText = `${days} day${days === 1 ? '' : 's'}`;
  else if (months < 12) valueText = `${months} month${months === 1 ? '' : 's'}`;
  else valueText = `${years} year${years === 1 ? '' : 's'}`;

  if (valueText === 'just now') return valueText;
  return isFuture ? `in ${valueText}` : `${valueText} ago`;
};

const formatDateTime = (value) => {
  if (!value) return { date: '', time: '' };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { date: '', time: '' };
  return {
    date: date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase(),
    time: date.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }),
  };
};

const monthYear = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value || '');
  return date.toLocaleDateString('en-PH', { month: 'short', year: 'numeric' });
};

const entryDate = (item = {}) => {
  if (item.date) return item.date;
  const start = [item.startMonth, item.startYear].filter(Boolean).join(' ') || monthYear(item.startDate);
  const end = item.isPresent ? 'Present' : ([item.endMonth, item.endYear || item.yearGraduated].filter(Boolean).join(' ') || monthYear(item.endDate));
  return [start, end].filter(Boolean).join(' – ');
};

const parseSkills = (value) => {
  const raw = Array.isArray(value) ? value : String(value || '').split(/\|\||,|\n/);
  return raw.map((item) => {
    if (item && typeof item === 'object') return { skill: item.skill || item.name || '', proficiency: item.proficiency || 'Basic' };
    const clean = String(item || '').trim();
    const match = clean.match(/^(.*?)\s+[—-]\s+(Basic|Novice|Intermediate|Advanced|Expert)$/i);
    return match ? { skill: match[1].trim(), proficiency: match[2][0].toUpperCase() + match[2].slice(1).toLowerCase() } : { skill: clean, proficiency: 'Basic' };
  }).filter((item) => isMeaningfulResumeValue(item.skill));
};

const decodeHtmlEntities = (value = '') => {
  const text = String(value || '');
  if (!text) return '';

  // MyProfile stores rich text as real HTML. Do not pass real markup through
  // textContent because that would strip <strong>, <ul>, <ol>, alignment, etc.
  if (/<\/?[a-z][\s\S]*>/i.test(text)) return text;

  if (typeof window === 'undefined' || typeof window.DOMParser === 'undefined') {
    return text
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'");
  }

  const parser = new window.DOMParser();
  return parser.parseFromString(text, 'text/html').documentElement.textContent || '';
};

const sanitizeProfileRichText = (value = '') => {
  const raw = String(value || '').trim();
  if (!raw) return '';

  if (typeof window === 'undefined' || typeof window.DOMParser === 'undefined') {
    return raw
      .replace(/<\/li>\s*<li>/gi, '\n• ')
      .replace(/<li[^>]*>/gi, '• ')
      .replace(/<\/li>/gi, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>|<\/div>|<\/ul>|<\/ol>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  const parser = new window.DOMParser();
  const doc = parser.parseFromString(`<div>${raw}</div>`, 'text/html');
  const wrapper = doc.body.firstElementChild;
  if (!wrapper) return '';

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

const richText = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return null;

  const containsHtml = /<\/?[a-z][\s\S]*>/i.test(raw) || /&(?:lt|gt|nbsp|amp);/i.test(raw);

  if (!containsHtml) {
    const lines = raw
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean);

    const isBulletList = lines.length > 0 && lines.every((line) => /^(?:•|\*|-)\s+/.test(line));
    const isNumberedList = lines.length > 0 && lines.every((line) => /^\d+[.)]\s+/.test(line));

    if (isBulletList) {
      return (
        <ul className="my-1 list-disc space-y-0.5 pl-5">
          {lines.map((line, index) => (
            <li key={`${line}-${index}`}>{line.replace(/^(?:•|\*|-)\s+/, '')}</li>
          ))}
        </ul>
      );
    }

    if (isNumberedList) {
      return (
        <ol className="my-1 list-decimal space-y-0.5 pl-5">
          {lines.map((line, index) => (
            <li key={`${line}-${index}`}>{line.replace(/^\d+[.)]\s+/, '')}</li>
          ))}
        </ol>
      );
    }

    return (
      <div className="space-y-1">
        {lines.map((line, index) => (
          <p key={`${line}-${index}`}>{line}</p>
        ))}
      </div>
    );
  }

  const decoded = decodeHtmlEntities(raw);
  const html = sanitizeProfileRichText(decoded);

  return (
    <div
      className={cn(
        'space-y-1',
        '[&_p]:my-1 [&_div]:my-1',
        '[&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5',
        '[&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-5',
        '[&_li]:my-0.5',
        '[&_h1]:my-1 [&_h1]:text-[13px] [&_h1]:font-bold',
        '[&_h2]:my-1 [&_h2]:text-[11px] [&_h2]:font-bold',
        '[&_blockquote]:ml-5 [&_blockquote]:border-l-2 [&_blockquote]:border-gray-300 [&_blockquote]:pl-3'
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

const hasMeaningfulObjectValue = (item = {}) => hasMeaningfulResumeObject(item);

const calculateJobSeekerLevel = ({
  skills = [],
  certifications = [],
  projects = [],
  seminars = [],
  awards = [],
  workExperiences = [],
}) => {
  const counts = {
    skills: Array.isArray(skills) ? skills.filter(Boolean).length : 0,
    certifications: Array.isArray(certifications)
      ? certifications.filter(hasMeaningfulObjectValue).length
      : 0,
    projects: Array.isArray(projects)
      ? projects.filter(hasMeaningfulObjectValue).length
      : 0,
    seminars: Array.isArray(seminars)
      ? seminars.filter(hasMeaningfulObjectValue).length
      : 0,
    awards: Array.isArray(awards)
      ? awards.filter(hasMeaningfulObjectValue).length
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
    };
  }

  const requirementEntries = Object.entries(nextTier.requirements).filter(
    ([, required]) => required > 0
  );

  const ratios = requirementEntries.map(([key, required]) =>
    Math.min(1, counts[key] / required)
  );

  const percentage = ratios.length
    ? Math.round(
        (ratios.reduce((total, ratio) => total + ratio, 0) / ratios.length) * 100
      )
    : 0;

  return {
    currentRank: currentTier.name,
    nextTier: nextTier.name,
    percentage,
  };
};


const stripHtml = (value = '') =>
  String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();

const normalizeMatchText = (value = '') =>
  stripHtml(value)
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const normalizeEmploymentType = (value = '') =>
  normalizeMatchText(value)
    .replace(/[\s-]+/g, '')
    .trim();

const normalizeWorkMode = (value = '') => {
  const normalized = normalizeMatchText(value)
    .replace(/[\s-]+/g, '')
    .trim();

  if (['onsite', 'on-site'].includes(normalized)) return 'onsite';
  if (['remote', 'workfromhome', 'wfh'].includes(normalized)) return 'remote';
  if (['hybrid'].includes(normalized)) return 'hybrid';
  if (['blended'].includes(normalized)) return 'blended';

  return normalized;
};

const isWorkModeMatch = (applicantWorkMode = '', jobWorkMode = '') => {
  const applicantMode = normalizeWorkMode(applicantWorkMode);
  const requiredMode = normalizeWorkMode(jobWorkMode);

  if (!applicantMode || !requiredMode) return false;

  // Blended means the applicant is flexible/all-around for the available work setup.
  if (applicantMode === 'blended') {
    return ['onsite', 'remote', 'hybrid', 'blended'].includes(requiredMode);
  }

  return applicantMode === requiredMode;
};

const normalizeSkillName = (value = '') =>
  normalizeMatchText(value)
    .replace(/\s[—-]\s(?:basic|novice|intermediate|advanced|expert)$/i, '')
    .trim();

const getRequiredExperienceYears = (value = '') => {
  const normalized = normalizeMatchText(value);
  if (!normalized || normalized.includes('no experience')) return 0;
  const match = normalized.match(/(\d+)/);
  return match ? Number(match[1]) : 0;
};

const getApplicantExperienceYears = (workExperiences = [], profileExperience = '') => {
  const normalized = normalizeMatchText(profileExperience);

  // Use the experience level selected in the applicant profile as the source of truth.
  // Only calculate from work dates when the profile experience field is empty.
  if (normalized) {
    if (normalized.includes('no experience')) return 0;
    if (normalized.includes('less than 1')) return 0.5;

    const rangeMatch = normalized.match(/(\d+)\s*[-–]\s*(\d+)/);
    if (rangeMatch) return Number(rangeMatch[2]);

    const numberMatch = normalized.match(/(\d+)/);
    if (numberMatch) return Number(numberMatch[1]);
  }

  return (Array.isArray(workExperiences) ? workExperiences : []).reduce(
    (total, item) => {
      const start = new Date(item?.startDate);
      const end = item?.isPresent ? new Date() : new Date(item?.endDate);

      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
        return total;
      }

      return total + (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    },
    0
  );
};

const getEducationRank = (value = '') => {
  const normalized = normalizeMatchText(value);
  if (!normalized) return 0;
  if (normalized.includes('doctor') || normalized.includes('phd')) return 5;
  if (normalized.includes('master') || normalized.includes('post graduate')) return 4;
  if (
    normalized.includes('bachelor') ||
    normalized.includes('college') ||
    normalized.includes('degree graduate') ||
    normalized.includes('professional license') ||
    normalized.includes('board exam')
  ) return 3;
  if (
    normalized.includes('associate') ||
    normalized.includes('vocational') ||
    normalized.includes('diploma')
  ) return 2;
  if (normalized.includes('high school') || normalized.includes('secondary')) return 1;
  return 0;
};

const getMatchLabel = (score) => {
  if (score >= 90) return 'Highly Matched';
  if (score >= 75) return 'Strong Match';
  if (score >= 50) return 'Good Match';
  return 'Low Match';
};

const calculateApplicationMatch = ({ job = {}, profile = {}, skills = [], work = [], education = [] }) => {
  const applicantSkills = skills
    .map((item) => normalizeSkillName(item?.skill || item))
    .filter(Boolean);

  const requiredSkills = (Array.isArray(job?.skillsRequired)
    ? job.skillsRequired
    : String(job?.skillsRequired || '').split(',')
  )
    .map(normalizeSkillName)
    .filter(Boolean);

  const matchedSkills = requiredSkills.filter((requiredSkill) =>
    applicantSkills.some(
      (applicantSkill) =>
        applicantSkill === requiredSkill ||
        applicantSkill.includes(requiredSkill) ||
        requiredSkill.includes(applicantSkill)
    )
  );

  const skillRatio = requiredSkills.length
    ? matchedSkills.length / requiredSkills.length
    : applicantSkills.length
      ? 0.75
      : 0;

  const latestEducation = Array.isArray(education) && education.length
    ? education[education.length - 1]
    : {};

  const educationCandidates = [
    profile.educationalAttainment,
    ...(Array.isArray(education)
      ? education.flatMap((entry) => [
          entry?.educationalAttainment,
          entry?.level,
        ])
      : []),
  ]
    .map((value) => String(value || '').trim())
    .filter(Boolean);

  const applicantEducation = educationCandidates.reduce((highest, candidate) => {
    return getEducationRank(candidate) > getEducationRank(highest)
      ? candidate
      : highest;
  }, educationCandidates[0] || '');

  const requiredEducation = job.educationLevel || job.educationalRequirements || '';
  const applicantEducationRank = getEducationRank(applicantEducation);
  const requiredEducationRank = getEducationRank(requiredEducation);
  const educationRatio = requiredEducationRank
    ? Math.min(1, applicantEducationRank / requiredEducationRank)
    : applicantEducationRank
      ? 0.75
      : 0;

  const applicantYears = getApplicantExperienceYears(
    work,
    profile.experience || profile.whatHaveYouDone
  );
  const requiredYears = getRequiredExperienceYears(job.experienceLevel);
  const experienceRatio = requiredYears
    ? Math.min(1, applicantYears / requiredYears)
    : job.openToFreshGraduates || applicantYears >= 0
      ? 1
      : 0;

  const applicantCourseText = normalizeMatchText(
    [
      profile.course,
      profile.studyField,
      profile.educationalAttainment,
      latestEducation.course,
      latestEducation.studyField,
      latestEducation.educationalAttainment,
      latestEducation.level,
    ]
      .filter(Boolean)
      .join(' ')
  );

  const jobContextText = normalizeMatchText(
    [
      job.title,
      job.category,
      job.description,
      job.requirements,
      job.qualification,
      job.educationalRequirements,
    ]
      .filter(Boolean)
      .join(' ')
  );

  const courseWords = applicantCourseText
    .split(' ')
    .filter((word) => word.length >= 4);

  const courseHits = courseWords.filter((word) => jobContextText.includes(word));
  const courseRatio = courseWords.length
    ? Math.min(1, courseHits.length / Math.min(courseWords.length, 4))
    : 0;

  const score = Math.round(
    skillRatio * 45 +
    educationRatio * 20 +
    experienceRatio * 20 +
    courseRatio * 15
  );

  const missingSkills = requiredSkills.filter((requiredSkill) => !matchedSkills.includes(requiredSkill));
  const educationMatched = requiredEducationRank
    ? applicantEducationRank >= requiredEducationRank
    : Boolean(applicantEducationRank);
  const experienceMatched = requiredYears ? applicantYears >= requiredYears : true;
  const courseMatched = courseWords.length ? courseHits.length > 0 : false;

  const formatYears = (years) => {
    if (years >= 1) {
      const value = Number.isInteger(years) ? Math.round(years) : Number(years.toFixed(1));
      return `${value} year${value === 1 ? '' : 's'}`;
    }
    if (years > 0) return 'Less than 1 year';
    return 'No experience';
  };

  return {
    score: Math.max(0, Math.min(100, score)),
    label: getMatchLabel(score),
    skillsLabel: getMatchLabel(Math.round(skillRatio * 100)),
    matchedSkillsCount: matchedSkills.length,
    requiredSkillsCount: requiredSkills.length,
    matchedSkills,
    missingSkills,
    applicantSkills,
    requiredSkills,
    educationDisplay:
      profile.course ||
      latestEducation.course ||
      latestEducation.studyField ||
      profile.studyField ||
      applicantEducation ||
      'Not provided',
    applicantEducationDisplay: applicantEducation || 'Not provided',
    requiredEducationDisplay: requiredEducation || 'Not specified',
    educationMatched,
    experienceDisplay:
      applicantYears >= 1
        ? `${Number.isInteger(applicantYears) ? Math.round(applicantYears) : applicantYears.toFixed(1)} year${applicantYears >= 2 ? 's' : ''}`
        : applicantYears > 0
          ? 'Less than 1 year'
          : profile.experience || profile.whatHaveYouDone || 'No experience',
    applicantExperienceDisplay:
      profile.experience || profile.whatHaveYouDone || formatYears(applicantYears),
    requiredExperienceDisplay: requiredYears ? formatYears(requiredYears) : 'No experience required',
    experienceMatched,
    courseMatched,
    applicantCourseDisplay:
      profile.course ||
      latestEducation.course ||
      latestEducation.studyField ||
      profile.studyField ||
      'Not provided',
    matchedCourseKeywords: [...new Set(courseHits)],
    missingCourseKeywords: [...new Set(courseWords.filter((word) => !courseHits.includes(word)))],
    applicantWorkModeDisplay: profile.preferredWorkMode || 'Not provided',
    requiredWorkModeDisplay: job.workMode || job.workArrangement || job.workSetup || 'Not specified',
    workModeMatched: isWorkModeMatch(
      profile.preferredWorkMode,
      job.workMode || job.workArrangement || job.workSetup
    ),
    applicantEmploymentTypeDisplay: profile.employmentType || 'Not provided',
    requiredEmploymentTypeDisplay: job.jobType || 'Not specified',
    employmentTypeMatched:
      Boolean(profile.employmentType && job.jobType) &&
      normalizeEmploymentType(profile.employmentType) ===
        normalizeEmploymentType(job.jobType),
    applicantLocationDisplay: profile.address || profile.currentAddress || 'Not provided',
    requiredLocationDisplay: job.location || 'Not specified',
    locationMatched:
      Boolean((profile.address || profile.currentAddress) && job.location) &&
      (
        normalizeMatchText(profile.address || profile.currentAddress).includes(normalizeMatchText(job.location)) ||
        normalizeMatchText(job.location).includes(normalizeMatchText(profile.address || profile.currentAddress))
      ),
    willingToRelocateDisplay: profile.willingToRelocate || 'Not provided',
    isWillingToRelocate: ['yes', 'open', 'willing'].some((word) =>
      normalizeMatchText(profile.willingToRelocate).includes(word)
    ),
    acceptsFreshGraduates: Boolean(job.openToFreshGraduates),
    applicantHasExperience: applicantYears > 0,
    hasEducation: Boolean(applicantEducation),
    hasExperience: Boolean(applicantYears > 0 || profile.experience || profile.whatHaveYouDone),
    hasSkills: Boolean(applicantSkills.length),
  };
};

const MatchRing = ({ score }) => {
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.max(0, Math.min(100, score)) / 100) * circumference;

  return (
    <svg className="h-[78px] w-[78px] -rotate-90" viewBox="0 0 72 72" aria-hidden="true">
      <circle
        cx="36"
        cy="36"
        r={radius}
        fill="none"
        stroke="#e7efe9"
        strokeWidth="7"
      />
      <circle
        cx="36"
        cy="36"
        r={radius}
        fill="none"
        stroke="#159447"
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
      />
    </svg>
  );
};


const JobSeekerLevelBadgeCard = ({
  currentRank = 'First Time Job Seeker',
}) => {
  const [showLevelModal, setShowLevelModal] = useState(false);
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
      <div className="flex w-full items-center gap-3 rounded-xl border border-[#e2e8f0] bg-white px-4 py-3 shadow-[0_4px_14px_rgba(15,23,42,0.06)] lg:w-auto lg:min-w-[230px]">
        <button
          type="button"
          onClick={() => setShowLevelModal(true)}
          className="group flex h-[64px] w-[64px] shrink-0 items-center justify-center border-0 bg-transparent p-0 outline-none transition-transform duration-200 hover:scale-105 focus-visible:rounded-xl focus-visible:ring-2 focus-visible:ring-[#2e66a6]/40"
          aria-label="View all job seeker levels"
          aria-haspopup="dialog"
        >
          <img
            src={badgeImage}
            alt={`${currentRank} badge`}
            className="h-full w-full object-contain transition group-hover:drop-shadow-[0_5px_8px_rgba(46,102,166,0.22)]"
          />
        </button>

        <div className="min-w-0">
          <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-gray-500">
            Jobseeker Level
          </div>
          <div className="mt-0.5 truncate text-lg font-bold text-[#2f3b8f]">
            {currentRank}
          </div>
        </div>
      </div>

      {showLevelModal ? (
        <div
          className="fixed inset-0 z-[10060] flex items-center justify-center bg-black/50 px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="employer-job-seeker-levels-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowLevelModal(false);
          }}
        >
          <div className="w-full max-w-[980px] overflow-hidden rounded-[22px] bg-white shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
            <div className="flex items-center justify-between gap-4 bg-[#2e66a6] px-5 py-4 sm:px-7">
              <div>
                <h2
                  id="employer-job-seeker-levels-title"
                  className="text-[21px] font-bold text-white sm:text-[24px]"
                >
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
                      <span
                        className={`absolute left-3 top-3 flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${
                          isCurrentLevel
                            ? 'bg-[#2e66a6] text-white'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
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
        </div>
      ) : null}
    </>
  );
};

const Section = ({ title, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section className="border-b border-[#d8e2ee] last:border-b-0">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        className="flex min-h-[54px] w-full items-center gap-3 py-3 text-left focus:outline-none"
      >
        <svg
          className={cn(
            'h-4 w-4 shrink-0 text-gray-500 transition-transform duration-200',
            isOpen ? 'rotate-0' : '-rotate-90'
          )}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 15l7-7 7 7"
          />
        </svg>

        <h3 className="font-serif text-[17px] font-bold uppercase tracking-[0.01em] text-[#111827] sm:text-[19px]">
          {title}
        </h3>
      </button>

      {isOpen ? children : null}
    </section>
  );
};

const EmptyLine = ({ children }) => <div className="pb-5 pt-1 font-serif text-[13px] italic text-gray-500">{children}</div>;

const ProfileEntries = ({ items = [], type }) => {
  if (!items.length) return <EmptyLine>No information added yet.</EmptyLine>;
  if (type === 'references') {
    return <div className="grid grid-cols-1 gap-x-6 gap-y-5 pb-5 pt-2 font-serif text-[13px] leading-5 text-gray-900 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item, index) => <div key={item._id || index} className="min-w-0 py-1">
        <div className="font-bold">{item.name || item.title || 'Reference'}</div>
        {item.position ? <div>{item.position}</div> : null}{item.company ? <div>{item.company}</div> : null}
        {item.phone ? <div>{item.phone}</div> : null}{item.email ? <div className="break-all text-[#2e66a6]">{item.email}</div> : null}
      </div>)}
    </div>;
  }
  return <div className="space-y-3 pb-5 pt-2 font-serif text-[13px] leading-5 text-gray-900">
    {items.map((item, index) => {
      const title = item.title || item.name || item.organization || 'Untitled';
      const sub = item.issuer || item.role || item.organization || item.company || '';
      return <div key={item._id || index} className="py-1">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0"><div className="font-bold">{title}</div>{sub ? <div className="italic">{sub}</div> : null}</div>
          {entryDate(item) ? <div className="shrink-0 whitespace-nowrap italic text-gray-700">{entryDate(item)}</div> : null}
        </div>
        {item.description ? <div className="mt-2">{richText(item.description)}</div> : null}
      </div>;
    })}
  </div>;
};

const DeclineReasonModal = ({ open, applicantName, reasons, selectedReason, comment, onReasonChange, onCommentChange, onClose, onConfirm, submitting }) => {
  if (!open) return null;

  const commentLength = String(comment || '').length;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="decline-application-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) onClose();
      }}
    >
      <div className="w-full max-w-[560px] overflow-hidden rounded-[22px] bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-5 px-7 pb-4 pt-6">
          <div className="min-w-0">
            <h2 id="decline-application-title" className="text-[20px] font-bold text-gray-900 sm:text-[22px]">
              Do you want to decline this application?
            </h2>
            <p className="mt-2 max-w-[470px] text-[13px] leading-5 text-gray-500">
              If yes, please choose one of the following reasons or leave a comment so the applicant receives feedback.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Close decline application modal"
          >
            <SvgIcon name="x" className="h-4 w-4" />
          </button>
        </div>

        <div className="px-7 pb-5">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {reasons.map((reason) => (
              <button
                key={reason}
                type="button"
                onClick={() => onReasonChange(reason)}
                disabled={submitting}
                className={cn(
                  'min-h-[48px] rounded-lg border px-3 py-2 text-[11px] font-medium leading-4 transition disabled:cursor-not-allowed disabled:opacity-60',
                  selectedReason === reason
                    ? 'border-[#2f67e8] bg-[#2f67e8] text-white shadow-sm'
                    : 'border-gray-200 bg-[#f7f7f8] text-gray-800 hover:border-[#bfd0f8] hover:bg-[#f2f6ff]'
                )}
              >
                {reason}
              </button>
            ))}
          </div>

          <div className="relative mt-3">
            <textarea
              value={comment}
              onChange={(event) => onCommentChange(event.target.value.slice(0, 500))}
              rows={4}
              maxLength={500}
              disabled={submitting}
              className="min-h-[112px] w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-3 pb-8 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#2f67e8] focus:ring-2 focus:ring-[#2f67e8]/10 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-70"
              placeholder="Leave a comment for the applicant..."
            />
            <span className="pointer-events-none absolute bottom-2.5 right-3 text-[10px] text-gray-400">
              {commentLength}/500
            </span>
          </div>

          <p className="mt-2 text-[10px] leading-4 text-gray-500">
            * This feedback will be shared directly with the applicant to help their professional growth.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-7 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="h-10 rounded-lg bg-[#f7f7f8] px-5 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={!selectedReason || submitting}
            onClick={onConfirm}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#c8191f] px-5 text-sm font-semibold text-white transition hover:bg-[#aa151a] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Spinner />
                Declining...
              </>
            ) : (
              <>
                <span>Decline Application</span>
                <SvgIcon name="userMinus" className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};


const StatusConfirmationModal = ({
  open,
  action,
  applicantName,
  onClose,
  onConfirm,
  submitting,
}) => {
  if (!open || !action) return null;

  const isInterview = action === 'for interview';
  const title = isInterview ? 'Move applicant to For Interview?' : 'Mark applicant as hired?';
  const description = isInterview
    ? `Are you sure you want to move ${applicantName} to the For Interview stage?`
    : `Are you sure you want to mark ${applicantName} as hired?`;
  const confirmLabel = isInterview ? 'Move to For Interview' : 'Confirm Hired';
  const iconName = isInterview ? 'calendar' : 'check';

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="status-confirmation-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) onClose();
      }}
    >
      <div className="w-full max-w-md overflow-hidden rounded-[24px] bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-5">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#eef5fc] text-[#174b91]">
              <SvgIcon name={iconName} className="h-6 w-6" />
            </div>
            <div>
              <h2 id="status-confirmation-title" className="text-xl font-bold text-gray-900">
                {title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-gray-500">
                {description}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Close confirmation"
          >
            <SvgIcon name="x" className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col-reverse gap-3 px-6 py-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="h-11 rounded-xl border border-gray-300 bg-white px-5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={submitting}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#102a78] px-5 text-sm font-semibold text-white transition hover:bg-[#0d2365] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? <Spinner /> : <SvgIcon name={iconName} className="h-5 w-5" />}
            {submitting ? 'Updating...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

const MessagePopup = ({ open, onClose, applicant, application }) => {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const [activeMessageTab, setActiveMessageTab] = useState('all');
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);

  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);

  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  }, []);

  const employerId = currentUser?._id || currentUser?.id || application?.employer?._id || application?.employer;
  const token = localStorage.getItem('token');

  const buildName = useCallback((user) => {
    if (!user) return 'Applicant';
    const fullName = String(user.fullName || '').trim();
    if (fullName) return fullName;
    const parts = [user.firstName, user.middleName, user.lastName, user.extensionName]
      .map((part) => String(part || '').trim())
      .filter(Boolean);
    return parts.join(' ') || String(user.email || '').trim() || 'Applicant';
  }, []);

  const getAvatar = useCallback((user) => {
    const raw = String(user?.profileImage || '').trim();
    if (!raw) return '';
    return raw.startsWith('http') ? raw : `${API_HOST}${raw}`;
  }, []);

  const getMessageFileUrl = useCallback((fileData) => {
    const raw = String(
      fileData?.fileUrl ||
      fileData?.url ||
      fileData?.path ||
      ''
    ).trim();

    if (!raw) return '';
    if (raw.startsWith('http')) return raw;
    return `${API_HOST}${raw.startsWith('/') ? raw : `/${raw}`}`;
  }, []);

  const getMessageFileType = useCallback((fileData) => {
    const mime = String(
      fileData?.fileType ||
      fileData?.mimeType ||
      fileData?.mimetype ||
      ''
    ).toLowerCase();

    const name = String(
      fileData?.originalName ||
      fileData?.filename ||
      fileData?.name ||
      ''
    ).toLowerCase();

    const extension = name.includes('.') ? name.split('.').pop() : '';

    if (
      mime.startsWith('image/') ||
      ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)
    ) {
      return 'image';
    }

    if (mime === 'application/pdf' || extension === 'pdf') return 'pdf';

    if (
      mime.includes('word') ||
      mime.includes('msword') ||
      ['doc', 'docx'].includes(extension)
    ) {
      return 'document';
    }

    return 'other';
  }, []);

  const formatConversationTime = useCallback((value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    const diff = Date.now() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return date.toLocaleDateString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, []);

  const currentApplicantId = applicant?._id;
  const currentConversationId =
    currentApplicantId && employerId
      ? [String(currentApplicantId), String(employerId)].sort().join('_')
      : '';

  const selectedOtherUser = selectedConversation?.otherUser || applicant || {};
  const selectedReceiverId = selectedOtherUser?._id || currentApplicantId;
  const selectedApplication = selectedConversation?.application || application || null;
  const selectedConversationId =
    selectedConversation?.__temp
      ? selectedConversation?._id
      : selectedConversation?._id ||
        (selectedReceiverId && employerId
          ? [String(selectedReceiverId), String(employerId)].sort().join('_')
          : '');

  const loadMessages = useCallback(
    async (conversation) => {
      const otherUserId = conversation?.otherUser?._id || currentApplicantId;
      const conversationId =
        conversation?.__temp
          ? conversation?._id
          : conversation?._id ||
            (otherUserId && employerId
              ? [String(otherUserId), String(employerId)].sort().join('_')
              : '');

      if (!open || !conversationId) {
        setMessages([]);
        return;
      }

      if (conversation?.__temp) {
        setMessages([]);
        return;
      }

      try {
        setLoadingMessages(true);
        setError('');

        const res = await axios.get(
          `${API_HOST}/api/messages/conversation/${conversationId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        setMessages(res.data?.data || []);

        await axios
          .put(
            `${API_HOST}/api/messages/mark-read/${conversationId}`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
          )
          .catch(() => {});

        setConversations((previous) =>
          previous.map((item) =>
            item._id === conversationId ? { ...item, unreadCount: 0 } : item
          )
        );

        window.dispatchEvent(new Event('messages:unread-updated'));
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load messages.');
      } finally {
        setLoadingMessages(false);
      }
    },
    [currentApplicantId, employerId, open, token]
  );

  const loadConversations = useCallback(async () => {
    if (!open) return;

    try {
      setLoadingConversations(true);
      setError('');

      const res = await axios.get(`${API_HOST}/api/messages/conversations`, {
        params: { view: 'active' },
        headers: { Authorization: `Bearer ${token}` },
      });

      const received = res.data?.success ? res.data?.data || [] : res.data?.data || [];
      const next = Array.isArray(received) ? [...received] : [];

      let currentEntry = next.find(
        (conversation) =>
          String(conversation?.otherUser?._id || '') === String(currentApplicantId || '')
      );

      if (currentApplicantId && !currentEntry) {
        currentEntry = {
          _id: currentConversationId || `temp_${currentApplicantId}`,
          otherUser: applicant,
          application,
          lastMessage: null,
          lastMessageTime: application?.appliedAt || application?.createdAt || null,
          unreadCount: 0,
          __temp: true,
        };
        next.unshift(currentEntry);
      } else if (currentEntry) {
        currentEntry = {
          ...currentEntry,
          application: currentEntry.application || application,
          otherUser: {
            ...(currentEntry.otherUser || {}),
            ...(applicant || {}),
          },
        };
        const currentIndex = next.findIndex(
          (conversation) => conversation._id === currentEntry._id
        );
        if (currentIndex >= 0) next[currentIndex] = currentEntry;
      }

      setConversations(next);
      setSelectedConversation(currentEntry || next[0] || null);

      if (currentEntry || next[0]) {
        await loadMessages(currentEntry || next[0]);
      } else {
        setMessages([]);
      }
    } catch (err) {
      setConversations([]);
      setMessages([]);
      setError(err.response?.data?.message || 'Failed to load conversations.');
    } finally {
      setLoadingConversations(false);
    }
  }, [
    applicant,
    application,
    currentApplicantId,
    currentConversationId,
    loadMessages,
    open,
    token,
  ]);

  useEffect(() => {
    if (!open) return;
    setSearch('');
    setActiveMessageTab('all');
    setSelectedFile(null);
    setText('');
    loadConversations();
  }, [open, loadConversations]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const totalUnread = useMemo(
    () =>
      conversations.reduce(
        (total, conversation) => total + Number(conversation?.unreadCount || 0),
        0
      ),
    [conversations]
  );

  const filteredConversations = useMemo(() => {
    const query = search.trim().toLowerCase();

    return conversations.filter((conversation) => {
      if (
        activeMessageTab === 'unread' &&
        Number(conversation?.unreadCount || 0) <= 0
      ) {
        return false;
      }

      if (!query) return true;

      const searchable = [
        buildName(conversation?.otherUser),
        conversation?.otherUser?.email,
        conversation?.application?.job?.title,
        conversation?.lastMessage?.content,
      ];

      return searchable.some((value) =>
        String(value || '').toLowerCase().includes(query)
      );
    });
  }, [activeMessageTab, buildName, conversations, search]);

  const handleSelectConversation = async (conversation) => {
    setSelectedConversation({
      ...conversation,
      unreadCount: 0,
    });
    setSelectedFile(null);
    setText('');
    await loadMessages(conversation);
  };

  const send = async () => {
    const content = text.trim();
    if ((!content && !selectedFile) || sending || !selectedReceiverId) return;

    try {
      setSending(true);
      setError('');

      const formData = new FormData();
      formData.append('receiverId', selectedReceiverId);
      formData.append('content', content);

      if (selectedApplication?.job?._id) {
        formData.append('jobId', selectedApplication.job._id);
      }
      if (selectedApplication?._id) {
        formData.append('applicationId', selectedApplication._id);
      }
      if (selectedFile) {
        formData.append('file', selectedFile);
      }

      const res = await axios.post(
        `${API_HOST}/api/messages/send`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      setText('');
      setSelectedFile(null);

      if (res.data?.data) {
        setMessages((previous) => [...previous, res.data.data]);
      } else if (selectedConversation) {
        await loadMessages(selectedConversation);
      }

      try {
        const refreshed = await axios.get(
          `${API_HOST}/api/messages/conversations`,
          {
            params: { view: 'active' },
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (Array.isArray(refreshed.data?.data)) {
          const next = refreshed.data.data;
          setConversations(next);

          const refreshedSelected = next.find(
            (conversation) =>
              String(conversation?.otherUser?._id || '') ===
              String(selectedReceiverId)
          );

          if (refreshedSelected) {
            setSelectedConversation({
              ...refreshedSelected,
              application:
                refreshedSelected.application || selectedApplication || null,
              unreadCount: 0,
            });
          }
        }
      } catch {
        // Message was sent successfully; conversation refresh is optional.
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  const selectedName = buildName(selectedOtherUser);
  const selectedAvatar = getAvatar(selectedOtherUser);
  const selectedJobTitle =
    selectedApplication?.job?.title ||
    selectedConversation?.application?.job?.title ||
    'Job Seeker';
  const selectedStatus = String(selectedApplication?.status || '').trim().toLowerCase();
  const selectedStatusClass =
    selectedStatus === 'hired'
      ? 'bg-green-100 text-green-800'
      : selectedStatus === 'for interview'
        ? 'bg-blue-50 text-[#2e66a6]'
        : selectedStatus === 'declined'
          ? 'bg-red-50 text-red-700'
          : selectedStatus === 'pending'
            ? 'bg-yellow-100 text-yellow-800'
            : 'bg-gray-100 text-gray-700';

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 p-3 sm:p-5">
      <div className="relative flex h-[84vh] min-h-[600px] w-full max-w-6xl overflow-hidden rounded-[24px] border border-[#e6edf5] bg-white shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-30 flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-600 shadow-sm transition hover:bg-gray-100"
          aria-label="Close messages"
        >
          <SvgIcon name="x" className="h-5 w-5" />
        </button>

        <aside className="flex w-[350px] min-w-[310px] flex-col border-r border-[#e6edf5] bg-white">
          <div className="border-b border-[#e6edf5] p-4">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Messages</h2>
              <p className="mt-1 text-sm text-gray-600">
                {totalUnread} {totalUnread === 1 ? 'unread message' : 'unread messages'}
              </p>
            </div>

            <div className="relative mt-3">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <SvgIcon name="search" className="h-4 w-4" />
              </span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-10 w-full rounded-xl border border-gray-200 bg-white px-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#2e66a6] focus:outline-none focus:ring-2 focus:ring-[#2e66a6]/20"
                placeholder="Search conversations..."
                aria-label="Search conversations"
              />
            </div>

            <div className="mt-3 flex items-center gap-1.5">
              {[
                { key: 'all', label: 'All' },
                { key: 'unread', label: 'Unread' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveMessageTab(tab.key)}
                  className={cn(
                    'rounded-full px-3 py-2 text-sm font-semibold transition',
                    activeMessageTab === tab.key
                      ? 'bg-[#eaf3ff] text-[#2e66a6]'
                      : 'text-gray-600 hover:bg-[#f7faff]'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {loadingConversations ? (
              <div className="flex justify-center py-12 text-[#2e66a6]">
                <Spinner />
              </div>
            ) : filteredConversations.length ? (
              <div className="space-y-2">
                {filteredConversations.map((conversation) => {
                  const title = buildName(conversation.otherUser);
                  const avatar = getAvatar(conversation.otherUser);
                  const active =
                    String(selectedConversation?._id || '') ===
                    String(conversation?._id || '');
                  const lastMessage = conversation.__temp
                    ? 'Tap to start chat'
                    : conversation?.lastMessage?.content || 'No messages yet';
                  const time = formatConversationTime(
                    conversation?.lastMessageTime ||
                      conversation?.lastMessage?.createdAt ||
                      conversation?.application?.appliedAt
                  );

                  return (
                    <button
                      key={conversation?._entryId || conversation?._id}
                      type="button"
                      onClick={() => handleSelectConversation(conversation)}
                      className={cn(
                        'w-full rounded-2xl border p-3 text-left transition',
                        active
                          ? 'border-[#2e66a6] bg-[#f7faff] shadow-[0_8px_20px_rgba(46,102,166,0.08)] ring-1 ring-[#2e66a6]/80'
                          : 'border-transparent hover:border-[#d8e2ee] hover:bg-[#f7faff]'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#2e66a6]/20 bg-[#2e66a6]/10">
                          {avatar ? (
                            <img
                              src={avatar}
                              alt={title}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-sm font-bold text-[#2e66a6]">
                              {(title?.[0] || 'U').toUpperCase()}
                            </span>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="truncate font-semibold text-gray-900">
                              {title}
                            </p>
                            <span className="shrink-0 text-xs text-gray-500">
                              {time}
                            </span>
                          </div>

                          <p className="mt-1 truncate text-sm text-gray-600">
                            {lastMessage}
                          </p>

                          {Number(conversation?.unreadCount || 0) > 0 ? (
                            <p className="mt-1.5 text-xs font-semibold text-[#2e66a6]">
                              {conversation.unreadCount}{' '}
                              {Number(conversation.unreadCount) === 1
                                ? 'unread message'
                                : 'unread messages'}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="px-4 py-12 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                  <SvgIcon name="message" className="h-6 w-6" />
                </div>
                <p className="mt-3 font-semibold text-gray-900">
                  {activeMessageTab === 'unread'
                    ? 'No unread conversations'
                    : 'No conversations'}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  {search
                    ? 'Try another search term.'
                    : 'Your applicant conversations will appear here.'}
                </p>
              </div>
            )}
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col bg-white">
          {selectedConversation ? (
            <>
              <header className="flex min-h-[94px] items-center gap-3 border-b border-[#e6edf5] bg-white px-5 pr-16">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#2e66a6]/20 bg-[#2e66a6]/10">
                  {selectedAvatar ? (
                    <img
                      src={selectedAvatar}
                      alt={selectedName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-bold text-[#2e66a6]">
                      {(selectedName?.[0] || 'U').toUpperCase()}
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-gray-900">{selectedName}</p>
                  <p className="truncate text-sm text-gray-600">
                    {selectedJobTitle !== 'Job Seeker'
                      ? `Applied for: ${selectedJobTitle}`
                      : selectedJobTitle}
                  </p>
                </div>

                {selectedStatus ? (
                  <span
                    className={cn(
                      'mr-1 inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold capitalize',
                      selectedStatusClass
                    )}
                  >
                    <span className="h-2 w-2 rounded-full bg-current opacity-80" />
                    {selectedStatus}
                  </span>
                ) : null}
              </header>

              <div className="min-h-0 flex-1 overflow-y-auto bg-[#f8fafc] px-5 py-5 sm:px-6">
                {loadingMessages ? (
                  <div className="flex justify-center py-16 text-[#2e66a6]">
                    <Spinner />
                  </div>
                ) : messages.length ? (
                  <div className="space-y-3 pb-4">
                    {messages.map((msg) => {
                      const mine =
                        String(msg.sender?._id || msg.sender || '') ===
                        String(employerId || '');
                      const file = msg?.file;
                      const fileName =
                        file?.originalName ||
                        file?.filename ||
                        file?.name ||
                        '';
                      const fileType = getMessageFileType(file);
                      const fileUrl = getMessageFileUrl(file);
                      const isImageAttachment = Boolean(fileName) && fileType === 'image';

                      return (
                        <div
                          key={msg._id || `${msg.createdAt}-${msg.content}`}
                          className={cn('flex', mine ? 'justify-end' : 'justify-start')}
                        >
                          <div
                            className={cn(
                              'flex w-full flex-col',
                              mine ? 'items-end' : 'items-start'
                            )}
                          >
                            {isImageAttachment ? (
                              <div className="w-full max-w-[92%] sm:max-w-[70%] lg:max-w-[68%]">
                                {fileUrl ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      window.open(fileUrl, '_blank', 'noopener,noreferrer')
                                    }
                                    className="block w-full overflow-hidden rounded-xl border border-gray-200 bg-white text-left shadow-sm"
                                    title="View image"
                                  >
                                    <img
                                      src={fileUrl}
                                      alt={fileName || 'Attachment'}
                                      className="max-h-80 w-full object-contain"
                                      loading="lazy"
                                      onError={(event) => {
                                        event.currentTarget.style.display = 'none';
                                      }}
                                    />
                                  </button>
                                ) : (
                                  <div className="flex min-h-[120px] w-full items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-6 text-sm text-gray-500">
                                    Image preview unavailable
                                  </div>
                                )}

                                {msg.content ? (
                                  <p className="mt-2 whitespace-pre-wrap break-words text-sm text-gray-800">
                                    {msg.content}
                                  </p>
                                ) : null}
                              </div>
                            ) : fileName ? (
                              <div className="w-full max-w-[92%] sm:max-w-[70%] lg:max-w-[68%]">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (fileUrl) {
                                      window.open(
                                        fileUrl,
                                        '_blank',
                                        'noopener,noreferrer'
                                      );
                                    }
                                  }}
                                  disabled={!fileUrl}
                                  className={cn(
                                    'flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left shadow-sm transition',
                                    mine
                                      ? 'border-[#2e66a6] bg-[#2e66a6]/10'
                                      : 'border-gray-200 bg-white',
                                    fileUrl
                                      ? 'cursor-pointer hover:bg-gray-50'
                                      : 'cursor-default'
                                  )}
                                  title={fileUrl ? 'Open attachment' : fileName}
                                >
                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700">
                                    <SvgIcon name="paperclip" className="h-5 w-5" />
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold text-gray-900">
                                      {fileName}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {fileType === 'pdf'
                                        ? 'PDF file'
                                        : fileType === 'document'
                                          ? 'Document'
                                          : 'Attachment'}
                                    </p>
                                  </div>
                                </button>

                                {msg.content ? (
                                  <p className="mt-2 whitespace-pre-wrap break-words text-sm text-gray-800">
                                    {msg.content}
                                  </p>
                                ) : null}
                              </div>
                            ) : (
                              <div
                                className={cn(
                                  'w-fit max-w-[86%] rounded-2xl px-4 py-3 text-sm shadow-sm',
                                  mine
                                    ? 'rounded-br-md bg-[#2e66a6] text-white'
                                    : 'rounded-bl-md border border-gray-200 bg-white text-gray-900'
                                )}
                              >
                                {msg.content ? (
                                  <p className="whitespace-pre-wrap break-words">
                                    {msg.content}
                                  </p>
                                ) : null}
                              </div>
                            )}

                            <span className="mt-1 px-1 text-[11px] text-gray-400">
                              {formatDateTime(msg.createdAt).time}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={bottomRef} />
                  </div>
                ) : (
                  <div className="flex h-full min-h-[300px] flex-col items-center justify-center text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                      <SvgIcon name="message" className="h-7 w-7" />
                    </div>
                    <p className="mt-4 font-semibold text-gray-900">No messages yet</p>
                    <p className="mt-1 text-sm text-gray-500">
                      Send the first message to start the conversation.
                    </p>
                  </div>
                )}

                {error ? (
                  <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {error}
                  </div>
                ) : null}
              </div>

              {selectedFile ? (
                <div className="border-t border-gray-200 bg-white px-4 pt-3">
                  <div className="flex items-start justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700">
                        <SvgIcon name="paperclip" className="h-5 w-5" />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900">
                          {selectedFile.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>

                        {selectedFile.type?.startsWith('image/') ? (
                          <img
                            src={URL.createObjectURL(selectedFile)}
                            alt="Selected attachment preview"
                            className="mt-2 max-h-32 rounded-xl border border-gray-200 bg-white object-contain"
                          />
                        ) : null}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedFile(null)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-200"
                      aria-label="Remove selected file"
                    >
                      <SvgIcon name="x" className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="border-t border-gray-200 bg-white/95 p-4 backdrop-blur">
                <div className="flex items-end gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.txt"
                    onChange={(event) => {
                      const file = event.target.files?.[0] || null;
                      setSelectedFile(file);
                      event.target.value = '';
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={sending}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-800 transition hover:bg-gray-50 disabled:opacity-50"
                    aria-label="Attach file"
                  >
                    <SvgIcon name="paperclip" className="h-5 w-5" />
                  </button>

                  <textarea
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.isComposing) return;
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        send();
                      }
                    }}
                    rows={1}
                    placeholder="Type a message..."
                    className="min-h-10 max-h-32 min-w-0 flex-1 resize-none rounded-xl border border-gray-200 px-4 py-2 text-sm focus:border-[#2e66a6] focus:outline-none focus:ring-2 focus:ring-[#2e66a6]/20"
                    disabled={sending}
                  />

                  <button
                    type="button"
                    onClick={send}
                    disabled={(!text.trim() && !selectedFile) || sending}
                    className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#2e66a6] px-4 text-sm font-semibold text-white transition hover:bg-[#23508a] disabled:pointer-events-none disabled:opacity-50"
                    aria-label="Send message"
                  >
                    {sending ? (
                      <Spinner />
                    ) : (
                      <>
                        <SvgIcon name="send" className="h-5 w-5" />
                        <span className="hidden sm:inline">Send</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center bg-white p-10 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                <SvgIcon name="message" className="h-8 w-8" />
              </div>
              <p className="mt-4 text-lg font-bold text-gray-900">
                No conversation selected
              </p>
              <p className="mt-1 max-w-md text-sm text-gray-600">
                Select an applicant or conversation from the list to start chatting.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

const ApplicationDetails = () => {
  const navigate = useNavigate();
  const { applicationId } = useParams();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [application, setApplication] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('resume');
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [declineComment, setDeclineComment] = useState('');
  const [messageOpen, setMessageOpen] = useState(false);
  const [confirmationAction, setConfirmationAction] = useState('');
  const [avatarBroken, setAvatarBroken] = useState(false);

  const fetchDetails = useCallback(async () => {
    try { setLoading(true); setError(''); const res = await axios.get(`${API_HOST}/api/applications/${applicationId}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }); setApplication(res.data?.application || null); }
    catch (err) { if (err.response?.status === 401) { localStorage.removeItem('token'); navigate('/employer/login'); } else setError(err.response?.data?.message || 'Failed to load application details.'); }
    finally { setLoading(false); }
  }, [applicationId, navigate]);
  useEffect(() => { fetchDetails(); }, [fetchDetails]);

  const updateStatus = async (status, extra = {}) => {
    try {
      setStatusUpdating(true);
      setError('');
      const res = await axios.put(
        `${API_HOST}/api/applications/${applicationId}/status`,
        { status, ...extra },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setApplication((prev) => ({
        ...prev,
        ...(res.data?.application || {}),
        jobseeker: prev.jobseeker,
        employer: prev.employer,
      }));
      setSuccess(res.data?.message || 'Application status updated.');
      setTimeout(() => setSuccess(''), 3000);
      return true;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update application status.');
      return false;
    } finally {
      setStatusUpdating(false);
    }
  };


  const backDestination = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const source = params.get('from');
    const sourceJobId = params.get('jobId');

    if (source === 'for-interview') return '/employer/for-interview';
    if (source === 'hired') return '/employer/hired';
    if (source === 'declined') return '/employer/declined';
    if (source === 'job-applicants' && sourceJobId) {
      return `/employer/job/${sourceJobId}/applicants`;
    }

    return '/employer/applicants';
  }, [location.search]);

  if (loading) return <EmployerLayout><div className="mx-auto max-w-7xl px-4 py-10"><div className="flex justify-center rounded-2xl border bg-white py-16 text-[#2e66a6]"><Spinner /></div></div></EmployerLayout>;
  if (!application) return <EmployerLayout><div className="mx-auto max-w-7xl px-4 py-10"><div className="rounded-2xl border bg-white p-10 text-center"><p>{error || 'Application not found.'}</p><Link to={backDestination} className="mt-5 inline-block text-[#2e66a6]">Back to Applicants</Link></div></div></EmployerLayout>;

  const liveUser = application.jobseeker || {};
  const resumeSnapshot = application.resumeSnapshot || null;
  const hasResumeSnapshot = Boolean(resumeSnapshot?.profile);
  const user = hasResumeSnapshot
    ? {
        ...liveUser,
        ...(resumeSnapshot.user || {}),
        jobSeekerProfile: resumeSnapshot.profile,
      }
    : liveUser;
  const profile = user.jobSeekerProfile || {};
  const name = user.fullName || [user.firstName, user.middleName, user.lastName, user.extensionName].filter(Boolean).join(' ') || 'Applicant';
  const currentStatus = String(application.status || 'pending').toLowerCase();
  const isAlreadyEmployed = Boolean(application.alreadyEmployed);
  const visibleStatusLabel = isAlreadyEmployed ? 'Already Employed' : currentStatus;
  const image = user.profileImage ? (String(user.profileImage).startsWith('http') ? user.profileImage : `${API_HOST}${user.profileImage}`) : '';
  const education = Array.isArray(profile.educationEntries) ? profile.educationEntries : [];
  const work = Array.isArray(profile.workExperiences) ? profile.workExperiences : [];
  const skills = [...parseSkills(profile.technicalSkills), ...parseSkills(profile.softSkills)];
  const calculatedJobSeekerLevel = calculateJobSeekerLevel({
    skills,
    certifications: profile.certifications || [],
    projects: profile.projects || [],
    seminars: profile.seminars || [],
    awards: profile.awards || [],
    workExperiences: work,
  });
  const jobSeekerLevel = resumeSnapshot?.jobSeekerLevel?.currentRank
    ? {
        ...calculatedJobSeekerLevel,
        ...resumeSnapshot.jobSeekerLevel,
      }
    : calculatedJobSeekerLevel;
  const matchSummary = calculateApplicationMatch({
    job: application.job || {},
    profile,
    skills,
    work,
    education,
  });
  const salary = [profile.minimumSalary, profile.maximumSalary].filter(isMeaningfulResumeValue).join(' - ');
  const resumeAddress = String(profile.address || '').trim();
  const resumeEmail = String(user.email || '').trim();
  const resumePhoneNumber = String(
    profile.phoneNumber ||
      profile.mobileNumber ||
      user.phoneNumber ||
      user.contactNumber ||
      ''
  ).trim();
  const meaningfulWork = filterMeaningfulResumeItems(work);
  const meaningfulEducation = filterMeaningfulResumeItems(education);
  const addedResumeSections = normalizeAddedResumeSections(profile.addedResumeSections, profile);
  const showOptionalResumeSection = (sectionKey, items) =>
    addedResumeSections.includes(sectionKey) && filterMeaningfulResumeItems(items).length > 0;
  const meaningfulProfileSections = [
    ['seminars', 'Seminars and Trainings', profile.seminars || []],
    ['awards', 'Awards and Achievements', profile.awards || []],
    ['certifications', 'Certifications', profile.certifications || []],
    ['projects', 'Projects', profile.projects || []],
    ['affiliations', 'Affiliations', profile.affiliations || []],
    ['cocurricular', 'Co-Curricular Activities', profile.cocurricular || []],
  ].filter(([sectionKey, , items]) => showOptionalResumeSection(sectionKey, items)).map(([, title, items]) => [
    title,
    filterMeaningfulResumeItems(items),
  ]);
  const meaningfulReferences = showOptionalResumeSection('references', profile.references)
    ? filterMeaningfulResumeItems(profile.references)
    : [];
  const personalInformationColumns = [
    [
      ['Preferred Work Mode', profile.preferredWorkMode],
      ['Employment Type', profile.employmentType],
      ['Willing to Relocate', profile.willingToRelocate],
      ['How Soon Can Start', profile.howSoonCanYouStart],
      ['Experience', profile.experience || profile.whatHaveYouDone],
    ],
    [
      ['Preferred Language', profile.preferredLanguage],
      ['Educational Attainment', profile.educationalAttainment],
      ['Double Degree', profile.studyField],
      ['Salary', salary],
      ['Nationality', profile.nationality],
      ['Height', profile.height],
    ],
    [
      ['Weight', profile.weight],
      ['Gender', profile.gender],
      ['Civil Status', profile.civilStatus],
      ['Birthday', profile.birthday],
    ],
  ];
  const hasPersonalInformation = hasMeaningfulResumeRows(personalInformationColumns);
  const activities = Array.isArray(application.activityHistory) && application.activityHistory.length
    ? [...application.activityHistory].sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt))
    : [
        application.reviewedAt ? { type: 'reviewed', title: 'Application reviewed', description: 'The employer reviewed this application.', occurredAt: application.reviewedAt } : null,
        { type: 'submitted', title: 'Application received', description: `${name} applied for ${application.job?.title || 'this position'}.`, occurredAt: application.appliedAt || application.createdAt },
      ].filter(Boolean);
  const declineReasons = currentStatus === 'for interview' ? FOR_INTERVIEW_DECLINE_REASONS : APPLICANTS_DECLINE_REASONS;



  const openFullResumePreview = () => {
    const resumeData = normalizeUserToResumeData({
      userData: user,
      profile,
      workExperiences: work,
    });

    sessionStorage.setItem(
      'resumePreviewData',
      JSON.stringify({
        ...resumeData,
        returnTo: `/employer/application/${applicationId}${location.search || ''}`,
        viewerMode: 'employer',
      })
    );

    navigate('/employer/application/resume-preview');
  };

  return <EmployerLayout>
    <div className="mx-auto max-w-7xl px-1 py-8">
      <Link to={backDestination} className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-[#174b91]"><SvgIcon name="back" className="h-4 w-4" /> Back to Applicants</Link>
      {error ? <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}{success ? <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">{success}</div> : null}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
        <main className="overflow-hidden rounded-[20px] border border-[#d8e2ee] bg-white">
          <div className="flex flex-col gap-5 p-5 sm:p-7 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 flex-1 items-center gap-5">
              <div className="h-[108px] w-[108px] shrink-0 overflow-hidden rounded-full bg-[#eef5fc]">{image && !avatarBroken ? <img src={image} alt={name} onError={() => setAvatarBroken(true)} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-[#2e66a6]">{name[0]}</div>}</div>
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-3 whitespace-nowrap">
                  <AutoFitApplicationHeaderName>{name}</AutoFitApplicationHeaderName>
                  <span className={`shrink-0 whitespace-nowrap rounded-md px-2 py-1 text-xs font-semibold ${isAlreadyEmployed ? 'bg-amber-100 text-amber-800' : 'bg-green-50 text-green-700'}`}>
                    {visibleStatusLabel}
                  </span>
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Applied for{' '}
                  {application.job?._id || application.job ? (
                    <Link
                      to={`/employer/manage-jobs/${application.job?._id || application.job}/view`}
                      className="font-semibold text-[#174b91] transition hover:text-[#2e66a6] hover:underline focus:outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-[#2e66a6]/30"
                    >
                      {application.job?.title || 'Job Position'}
                    </Link>
                  ) : (
                    <span className="font-semibold text-[#174b91]">Job Position</span>
                  )}
                </p>
                <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-500">
                  <SvgIcon name="calendar" className="h-4 w-4" />
                  <span>Applied on {formatDate(application.appliedAt || application.createdAt)}</span>
                  <span aria-hidden="true">•</span>
                  <span>{formatRelativeTime(application.appliedAt || application.createdAt)}</span>
                </p>
              </div>
            </div>
            <JobSeekerLevelBadgeCard currentRank={jobSeekerLevel.currentRank} />
          </div>
          <div className="flex border-t border-[#d8e2ee] px-5 sm:px-7"><button onClick={() => setActiveTab('resume')} className={cn('relative flex h-14 items-center gap-2 px-3 text-sm font-semibold', activeTab === 'resume' ? 'text-[#174b91]' : 'text-gray-500')}><SvgIcon name="resume" className="h-4 w-4" /> Resume<span className={cn('absolute bottom-0 left-0 right-0 h-[3px]', activeTab === 'resume' ? 'bg-[#174b91]' : '')} /></button><button onClick={() => setActiveTab('activity')} className={cn('relative flex h-14 items-center gap-2 px-5 text-sm font-semibold', activeTab === 'activity' ? 'text-[#174b91]' : 'text-gray-500')}><SvgIcon name="activity" className="h-4 w-4" /> Activity<span className={cn('absolute bottom-0 left-0 right-0 h-[3px]', activeTab === 'activity' ? 'bg-[#174b91]' : '')} /></button></div>

          {activeTab === 'resume' ? (
            <div className="border-t border-[#d8e2ee] bg-white px-5 pb-6 pt-3 sm:px-7 lg:px-8">
              <div className="flex justify-end pb-2">
                <button
                  type="button"
                  onClick={openFullResumePreview}
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 hover:text-[#174b91] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6]/30"
                >
                  <SvgIcon name="eye" className="h-4 w-4" />
                  Full Resume
                </button>
              </div>

              <article className="mx-auto w-full bg-white font-serif text-[10px] leading-[1.22] text-black">
                <header className="relative flex min-h-[110px] flex-col items-center justify-center pb-4 text-center">
                  <h2 className="text-[28px] font-bold uppercase leading-tight tracking-[0.02em]">
                    {name}
                  </h2>

                  {resumeAddress ? (
                    <p className="mt-2 break-words text-[10px] leading-relaxed">
                      {resumeAddress}
                    </p>
                  ) : null}

                  {resumeEmail || resumePhoneNumber ? (
                    <p className="mt-0.5 break-words text-[10px] leading-relaxed">
                      {[resumeEmail, resumePhoneNumber].filter(Boolean).join(' • ')}
                    </p>
                  ) : !resumeAddress ? (
                    <p className="mt-2 text-[10px] leading-relaxed text-gray-500">
                      Contact information not provided
                    </p>
                  ) : null}

                  <p className="mt-1 text-[10px] italic">
                    {[profile.campus, profile.course, profile.yearGraduated ? `Class of ${profile.yearGraduated}` : '']
                      .filter(Boolean)
                      .join(', ')}
                  </p>

                  {image && !avatarBroken ? (
                    <img
                      src={image}
                      alt={name}
                      onError={() => setAvatarBroken(true)}
                      className="mt-3 h-[78px] w-[78px] object-cover sm:absolute sm:right-[110px] sm:top-0 sm:mt-0"
                    />
                  ) : null}
                </header>

                {isMeaningfulResumeValue(profile.aboutMe) ? (
                <section className="pt-2">
                  <h3 className="border-b border-black text-[11px] font-bold uppercase">Objective</h3>
                  <div className="pt-1 text-justify">{richText(profile.aboutMe)}</div>
                </section>
                ) : null}

                {hasPersonalInformation ? (
                <section className="pt-2">
                  <h3 className="border-b border-black text-[11px] font-bold uppercase">Personal Information</h3>
                  <div className="grid grid-cols-1 gap-x-7 gap-y-0.5 pt-1 sm:grid-cols-3">
                    {personalInformationColumns.map((column, columnIndex) => (
                      <div key={`personal-column-${columnIndex}`}>
                        {column.map(([label, value]) =>
                          isMeaningfulResumeValue(value) ? (
                            <div key={label}>
                              <b>{label}:</b> {value}
                            </div>
                          ) : null
                        )}
                      </div>
                    ))}
                  </div>
                </section>
                ) : null}

                {meaningfulWork.length ? (
                <section className="pt-2">
                  <h3 className="border-b border-black text-[11px] font-bold uppercase">Work Experience</h3>
                    <div className="space-y-1 pt-1">
                      {meaningfulWork.map((item, index) => (
                        <div key={item._id || index}>
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              {isMeaningfulResumeValue(item.positionTitle || item.title) ? (
                                <div className="font-bold">{item.positionTitle || item.title}</div>
                              ) : null}
                              {isMeaningfulResumeValue(item.companyName || item.company) ? (
                                <div className="italic">{item.companyName || item.company}</div>
                              ) : null}
                            </div>
                            {isMeaningfulResumeValue(entryDate(item)) ? (
                              <div className="shrink-0 whitespace-nowrap italic">{entryDate(item)}</div>
                            ) : null}
                          </div>
                          {isMeaningfulResumeValue(item.description) ? <div className="mt-0.5 text-justify">{richText(item.description)}</div> : null}
                        </div>
                      ))}
                    </div>
                </section>
                ) : null}

                {skills.length ? (
                <section className="pt-2">
                  <h3 className="border-b border-black text-[11px] font-bold uppercase">Skills</h3>
                    <ul className="grid list-disc grid-cols-1 gap-x-8 gap-y-0 pl-4 pt-1 sm:grid-cols-3">
                      {skills.map((item, index) => (
                        <li key={`${item.skill}-${index}`}>
                          {item.skill} — {item.proficiency}
                        </li>
                      ))}
                    </ul>
                </section>
                ) : null}

                {meaningfulEducation.length ? (
                <section className="pt-2">
                  <h3 className="border-b border-black text-[11px] font-bold uppercase">Education</h3>
                    <div className="space-y-1 pt-1">
                      {meaningfulEducation.map((item, index) => (
                        <div key={item._id || index} className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            {isMeaningfulResumeValue(item.educationalAttainment || item.level || item.course) ? (
                              <div className="font-bold">
                                {item.educationalAttainment || item.level || item.course}
                              </div>
                            ) : null}
                            {isMeaningfulResumeValue(item.school || item.campus) ? (
                              <div className="italic">{item.school || item.campus}</div>
                            ) : null}
                            {isMeaningfulResumeValue(item.description) ? <div>{richText(item.description)}</div> : null}
                          </div>
                          {isMeaningfulResumeValue(entryDate(item)) ? (
                            <div className="shrink-0 whitespace-nowrap italic">{entryDate(item)}</div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                </section>
                ) : null}

                {meaningfulProfileSections.length || meaningfulReferences.length ? (
                  <div className="relative max-h-[170px] overflow-hidden">
                    {meaningfulProfileSections.map(([sectionTitle, items]) => (
                      <section key={sectionTitle} className="pt-2">
                        <h3 className="border-b border-black text-[11px] font-bold uppercase">{sectionTitle}</h3>
                        <div className="space-y-1 pt-1">
                          {items.map((item, index) => (
                            <div key={item._id || `${sectionTitle}-${index}`}>
                              <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                  {isMeaningfulResumeValue(item.title || item.name || item.organization) ? (
                                    <div className="font-bold">
                                      {item.title || item.name || item.organization}
                                    </div>
                                  ) : null}
                                  {isMeaningfulResumeValue(item.issuer || item.role || item.company || item.organization) ? (
                                    <div className="italic">
                                      {item.issuer || item.role || item.company || item.organization}
                                    </div>
                                  ) : null}
                                </div>
                                {isMeaningfulResumeValue(entryDate(item)) ? (
                                  <div className="shrink-0 whitespace-nowrap italic">{entryDate(item)}</div>
                                ) : null}
                              </div>
                              {isMeaningfulResumeValue(item.description) ? <div className="mt-0.5 text-justify">{richText(item.description)}</div> : null}
                            </div>
                          ))}
                        </div>
                      </section>
                    ))}

                    {meaningfulReferences.length ? (
                      <section className="pt-2">
                        <h3 className="border-b border-black text-[11px] font-bold uppercase">References</h3>
                        <div className="grid grid-cols-1 gap-x-8 gap-y-2 pt-1 sm:grid-cols-2">
                          {meaningfulReferences.map((item, index) => (
                            <div key={item._id || index}>
                              {isMeaningfulResumeValue(item.name || item.title) ? <div className="font-bold">{item.name || item.title}</div> : null}
                              {isMeaningfulResumeValue(item.position) ? <div className="italic">{item.position}</div> : null}
                              {isMeaningfulResumeValue(item.company) ? <div>{item.company}</div> : null}
                              {isMeaningfulResumeValue(item.phone) ? <div>{item.phone}</div> : null}
                              {isMeaningfulResumeValue(item.email) ? <div className="break-all text-blue-700 underline">{item.email}</div> : null}
                            </div>
                          ))}
                        </div>
                      </section>
                    ) : null}

                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white via-white/90 to-transparent" />
                  </div>
                ) : null}

              </article>
            </div>
          ) : <div className="border-t border-[#d8e2ee] px-6 py-8 sm:px-10"><div className="relative ml-3 border-l-2 border-gray-200 pl-8">{activities.map((item, index) => { const dt = formatDateTime(item.occurredAt || item.createdAt); return <div key={item._id || `${item.type}-${index}`} className="relative pb-10 last:pb-0"><div className="absolute -left-[43px] top-0 flex h-6 w-6 items-center justify-center rounded-full border-4 border-white bg-[#2e66a6] shadow"><SvgIcon name={item.type === 'message' ? 'message' : item.type === 'submitted' ? 'resume' : 'activity'} className="h-3 w-3 text-white" /></div><h3 className="text-lg font-semibold text-gray-900">{item.title || 'Application updated'}</h3><p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500">{item.description || 'The application record was updated.'}</p><div className="mt-2 text-xs font-bold tracking-wide text-gray-500">{dt.date}{dt.time ? ` · ${dt.time}` : ''}</div></div>; })}</div></div>}
        </main>

        <aside className="space-y-5">
          <div className="rounded-[20px] border border-[#d8e2ee] bg-white p-5"><h2 className="text-lg font-bold">Employer Actions</h2>{isAlreadyEmployed ? <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">This applicant is already employed through another job application.</p> : null}<div className="mt-5 space-y-3">{!isAlreadyEmployed && currentStatus === 'pending' ? <button onClick={() => setConfirmationAction('for interview')} disabled={statusUpdating} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#102a78] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"><SvgIcon name="calendar" /> Move to For Interview</button> : null}{!isAlreadyEmployed && currentStatus === 'for interview' ? <button onClick={() => setConfirmationAction('hired')} disabled={statusUpdating} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#102a78] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"><SvgIcon name="check" /> Hired</button> : null}{!isAlreadyEmployed ? <button onClick={() => setMessageOpen(true)} className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#174b91] px-4 py-3 text-sm font-semibold text-[#174b91]"><SvgIcon name="message" /> Send Message</button> : null}{(isAlreadyEmployed || ['pending', 'for interview'].includes(currentStatus)) ? <button onClick={() => setDeclineOpen(true)} className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-400 px-4 py-3 text-sm font-semibold text-red-600"><SvgIcon name="x" /> Decline Application</button> : null}</div></div>
          <div className="rounded-[20px] border border-[#d8e2ee] bg-white p-5 sm:p-6">
            <h2 className="text-[18px] font-bold text-gray-900">Application Summary</h2>

            <div className="mt-5 border-b border-gray-200 pb-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-1.5 text-[13px] text-gray-700">
                    <span>Match Score</span>
                    <span
                      className="flex h-4 w-4 items-center justify-center rounded-full border border-gray-400 text-[10px] text-gray-500"
                      title="Computed from skills, experience, education, course, and job requirements."
                    >
                      i
                    </span>
                  </div>

                  <div className="mt-2 text-[30px] font-semibold leading-none text-[#159447]">
                    {matchSummary.score}%
                  </div>
                  <div className="mt-2 text-[12px] font-medium text-[#159447]">
                    {matchSummary.label}
                  </div>
                </div>

                <div className="relative flex h-[78px] w-[78px] items-center justify-center">
                  <MatchRing score={matchSummary.score} />
                </div>
              </div>
            </div>

            <div className="max-h-[360px] overflow-y-auto pr-2">
              <div className="divide-y divide-gray-200">
                <div className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold text-gray-800">Education</div>
                      <div className="mt-1 text-[12px] leading-5 text-gray-500">
                        Applicant: {matchSummary.applicantEducationDisplay}
                      </div>
                      <div className="text-[12px] leading-5 text-gray-500">
                        Required: {matchSummary.requiredEducationDisplay}
                      </div>
                    </div>
                    <div
                      className={cn(
                        'mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                        matchSummary.educationMatched
                          ? 'border-[#159447] text-[#159447]'
                          : 'border-red-400 text-red-500'
                      )}
                    >
                      <SvgIcon name={matchSummary.educationMatched ? 'check' : 'x'} className="h-3 w-3" />
                    </div>
                  </div>
                  {!matchSummary.educationMatched && (
                    <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-[11px] leading-4 text-red-700">
                      The applicant's education level is below or different from the job requirement.
                    </p>
                  )}
                </div>

                <div className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold text-gray-800">Experience</div>
                      <div className="mt-1 text-[12px] leading-5 text-gray-500">
                        Applicant: {matchSummary.applicantExperienceDisplay}
                      </div>
                      <div className="text-[12px] leading-5 text-gray-500">
                        Required: {matchSummary.requiredExperienceDisplay}
                      </div>
                    </div>
                    <div
                      className={cn(
                        'mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                        matchSummary.experienceMatched
                          ? 'border-[#159447] text-[#159447]'
                          : 'border-red-400 text-red-500'
                      )}
                    >
                      <SvgIcon name={matchSummary.experienceMatched ? 'check' : 'x'} className="h-3 w-3" />
                    </div>
                  </div>
                  {!matchSummary.experienceMatched && (
                    <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-[11px] leading-4 text-red-700">
                      The applicant does not yet meet the required years of experience.
                    </p>
                  )}
                </div>

                <div className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold text-gray-800">Skills Match</div>
                      <div className="mt-1 text-[12px] leading-5 text-gray-500">
                        {matchSummary.skillsLabel}
                        {matchSummary.requiredSkillsCount > 0
                          ? ` · ${matchSummary.matchedSkillsCount}/${matchSummary.requiredSkillsCount} matched`
                          : ' · No required skills listed'}
                      </div>
                    </div>
                    <div
                      className={cn(
                        'mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                        matchSummary.missingSkills.length === 0 && matchSummary.requiredSkillsCount > 0
                          ? 'border-[#159447] text-[#159447]'
                          : 'border-red-400 text-red-500'
                      )}
                    >
                      <SvgIcon
                        name={matchSummary.missingSkills.length === 0 && matchSummary.requiredSkillsCount > 0 ? 'check' : 'x'}
                        className="h-3 w-3"
                      />
                    </div>
                  </div>

                  {matchSummary.matchedSkills.length > 0 && (
                    <div className="mt-3">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Matched skills</div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {matchSummary.matchedSkills.map((skill) => (
                          <span key={`matched-${skill}`} className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-700">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {matchSummary.missingSkills.length > 0 && (
                    <div className="mt-3">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-red-700">Missing skills</div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {matchSummary.missingSkills.map((skill) => (
                          <span key={`missing-${skill}`} className="rounded-full border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-medium text-red-700">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {matchSummary.requiredSkillsCount === 0 && (
                    <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-[11px] leading-4 text-amber-700">
                      The job post has no specific required skills, so the skills score uses the applicant's available profile skills.
                    </p>
                  )}
                </div>

                <div className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold text-gray-800">Course Relevance</div>
                      <div className="mt-1 text-[12px] leading-5 text-gray-500">
                        Applicant course: {matchSummary.applicantCourseDisplay}
                      </div>
                    </div>
                    <div
                      className={cn(
                        'mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                        matchSummary.courseMatched
                          ? 'border-[#159447] text-[#159447]'
                          : 'border-red-400 text-red-500'
                      )}
                    >
                      <SvgIcon name={matchSummary.courseMatched ? 'check' : 'x'} className="h-3 w-3" />
                    </div>
                  </div>

                  {matchSummary.matchedCourseKeywords.length > 0 && (
                    <p className="mt-2 text-[11px] leading-4 text-emerald-700">
                      Relevant keywords: {matchSummary.matchedCourseKeywords.join(', ')}
                    </p>
                  )}

                  {!matchSummary.courseMatched && (
                    <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-[11px] leading-4 text-red-700">
                      The applicant's course or study field has little or no keyword match with the job title, category, description, and requirements.
                    </p>
                  )}
                </div>

                <div className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold text-gray-800">Work Mode</div>
                      <div className="mt-1 text-[12px] leading-5 text-gray-500">
                        Applicant: {matchSummary.applicantWorkModeDisplay}
                      </div>
                      <div className="text-[12px] leading-5 text-gray-500">
                        Job: {matchSummary.requiredWorkModeDisplay}
                      </div>
                    </div>
                    <div className={cn(
                      'mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                      matchSummary.workModeMatched
                        ? 'border-[#159447] text-[#159447]'
                        : 'border-red-400 text-red-500'
                    )}>
                      <SvgIcon name={matchSummary.workModeMatched ? 'check' : 'x'} className="h-3 w-3" />
                    </div>
                  </div>
                  {!matchSummary.workModeMatched && (
                    <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-[11px] leading-4 text-red-700">
                      The applicant's preferred work mode does not match the job setup.
                    </p>
                  )}
                </div>

                <div className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold text-gray-800">Employment Type</div>
                      <div className="mt-1 text-[12px] leading-5 text-gray-500">
                        Applicant: {matchSummary.applicantEmploymentTypeDisplay}
                      </div>
                      <div className="text-[12px] leading-5 text-gray-500">
                        Job: {matchSummary.requiredEmploymentTypeDisplay}
                      </div>
                    </div>
                    <div className={cn(
                      'mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                      matchSummary.employmentTypeMatched
                        ? 'border-[#159447] text-[#159447]'
                        : 'border-red-400 text-red-500'
                    )}>
                      <SvgIcon name={matchSummary.employmentTypeMatched ? 'check' : 'x'} className="h-3 w-3" />
                    </div>
                  </div>
                  {!matchSummary.employmentTypeMatched && (
                    <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-[11px] leading-4 text-red-700">
                      The applicant's preferred employment type is different from the job offer.
                    </p>
                  )}
                </div>

                <div className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold text-gray-800">Location</div>
                      <div className="mt-1 text-[12px] leading-5 text-gray-500">
                        Applicant: {matchSummary.applicantLocationDisplay}
                      </div>
                      <div className="text-[12px] leading-5 text-gray-500">
                        Job: {matchSummary.requiredLocationDisplay}
                      </div>
                      <div className="text-[12px] leading-5 text-gray-500">
                        Relocation: {matchSummary.willingToRelocateDisplay}
                      </div>
                    </div>
                    <div className={cn(
                      'mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                      matchSummary.locationMatched || matchSummary.isWillingToRelocate
                        ? 'border-[#159447] text-[#159447]'
                        : 'border-red-400 text-red-500'
                    )}>
                      <SvgIcon
                        name={matchSummary.locationMatched || matchSummary.isWillingToRelocate ? 'check' : 'x'}
                        className="h-3 w-3"
                      />
                    </div>
                  </div>
                  {!matchSummary.locationMatched && !matchSummary.isWillingToRelocate && (
                    <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-[11px] leading-4 text-red-700">
                      The applicant's location is different and no willingness to relocate was indicated.
                    </p>
                  )}
                </div>

                <div className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold text-gray-800">Fresh Graduate Eligibility</div>
                      <div className="mt-1 text-[12px] leading-5 text-gray-500">
                        Job accepts fresh graduates: {matchSummary.acceptsFreshGraduates ? 'Yes' : 'No'}
                      </div>
                      <div className="text-[12px] leading-5 text-gray-500">
                        Applicant experience: {matchSummary.applicantExperienceDisplay}
                      </div>
                    </div>
                    <div className={cn(
                      'mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                      matchSummary.acceptsFreshGraduates || matchSummary.applicantHasExperience
                        ? 'border-[#159447] text-[#159447]'
                        : 'border-red-400 text-red-500'
                    )}>
                      <SvgIcon
                        name={matchSummary.acceptsFreshGraduates || matchSummary.applicantHasExperience ? 'check' : 'x'}
                        className="h-3 w-3"
                      />
                    </div>
                  </div>
                </div>

                <div className="py-4">
                  <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
                    <div className="text-[12px] font-bold text-[#174b91]">Match Summary</div>
                    <p className="mt-2 text-[11px] leading-5 text-gray-700">
                      The applicant matched {matchSummary.matchedSkillsCount} of {matchSummary.requiredSkillsCount} required skill{matchSummary.requiredSkillsCount === 1 ? '' : 's'}.
                      {!matchSummary.educationMatched ? ' Education requirement is not fully met.' : ' Education requirement is met.'}
                      {!matchSummary.experienceMatched ? ' Required experience is not yet met.' : ' Experience requirement is met.'}
                      {!matchSummary.courseMatched ? ' Course relevance is low.' : ' Course is relevant to the position.'}
                      {!matchSummary.workModeMatched ? ' Preferred work mode differs from the job setup.' : ''}
                      {!matchSummary.employmentTypeMatched ? ' Preferred employment type differs from the offer.' : ''}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
      <DeclineReasonModal open={declineOpen} applicantName={name} reasons={declineReasons} selectedReason={declineReason} comment={declineComment} onReasonChange={setDeclineReason} onCommentChange={setDeclineComment} onClose={() => { setDeclineOpen(false); setDeclineReason(''); setDeclineComment(''); }} onConfirm={async () => { const from = currentStatus === 'for interview' ? 'forInterview' : 'applicants'; setDeclineOpen(false); await updateStatus('declined', { declineReason, declineComment, declinedFrom: from }); }} submitting={statusUpdating} />
      <StatusConfirmationModal
        open={Boolean(confirmationAction)}
        action={confirmationAction}
        applicantName={name}
        submitting={statusUpdating}
        onClose={() => {
          if (!statusUpdating) setConfirmationAction('');
        }}
        onConfirm={async () => {
          if (!confirmationAction || statusUpdating) return;
          const updated = await updateStatus(confirmationAction);
          if (updated) setConfirmationAction('');
        }}
      />
      <MessagePopup open={messageOpen} onClose={() => setMessageOpen(false)} applicant={user} application={application} />
    </div>
  </EmployerLayout>;
};

export default ApplicationDetails;
