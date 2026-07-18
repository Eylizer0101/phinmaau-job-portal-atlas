import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import EmployerLayout from '../../../layouts/EmployerLayout';

const API_HOST = process.env.REACT_APP_API_URL
  ? process.env.REACT_APP_API_URL.replace(/\/api\/?$/, '')
  : 'https://phinmaau-job-portal-atlas.onrender.com';

const SvgIcon = ({ name, className = 'h-4 w-4' }) => {
  const paths = {
    back: 'M15 19l-7-7 7-7',
    mail: 'M4 6h16v12H4z M4 7l8 6 8-6',
    phone: 'M5 4h4l2 5-3 2a16 16 0 007 7l2-3 5 2v4a2 2 0 01-2 2C10 23 1 14 1 4a2 2 0 012-2h2z',
    calendar: 'M8 7V3m8 4V3M5 11h14M6 5h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2z',
    arrow: 'M5 12h14m-5-5 5 5-5 5',
    sparkle: 'M12 3l1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2L12 3z M5 14l.8 2.2L8 17l-2.2.8L5 20l-.8-2.2L2 17l2.2-.8L5 14z',
    search: 'M21 21l-4.3-4.3m1.3-5.2a7 7 0 11-14 0 7 7 0 0114 0z',
    x: 'M6 18L18 6M6 6l12 12',
    chevronLeft: 'M15 19l-7-7 7-7',
    chevronRight: 'M9 5l7 7-7 7',
  };

  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={paths[name] || paths.sparkle} />
    </svg>
  );
};

const stripHtml = (value = '') => String(value || '')
  .replace(/<[^>]*>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/\s+/g, ' ')
  .trim();

const normalizeMatchText = (value = '') => stripHtml(value)
  .toLowerCase()
  .replace(/[^a-z0-9+#.\s-]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const normalizeSkillName = (value = '') => normalizeMatchText(value)
  .replace(/\s[—-]\s(?:basic|novice|intermediate|advanced|expert)$/i, '')
  .trim();

const parseSkills = (value) => {
  const raw = Array.isArray(value) ? value : String(value || '').split(/\|\||,|\n/);
  return raw.map((item) => {
    if (item && typeof item === 'object') {
      return { skill: item.skill || item.name || '', proficiency: item.proficiency || 'Basic' };
    }

    const clean = String(item || '').trim();
    const match = clean.match(/^(.*?)\s+[—-]\s+(Basic|Novice|Intermediate|Advanced|Expert)$/i);
    return match
      ? { skill: match[1].trim(), proficiency: match[2] }
      : { skill: clean, proficiency: 'Basic' };
  }).filter((item) => item.skill);
};

const getRequiredExperienceYears = (value = '') => {
  const normalized = normalizeMatchText(value);
  if (!normalized || normalized.includes('no experience')) return 0;
  const match = normalized.match(/(\d+)/);
  return match ? Number(match[1]) : 0;
};

const getApplicantExperienceYears = (workExperiences = [], profileExperience = '') => {
  const dateBasedYears = (Array.isArray(workExperiences) ? workExperiences : []).reduce((total, item) => {
    const start = new Date(item?.startDate);
    const end = item?.isPresent ? new Date() : new Date(item?.endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return total;
    return total + (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  }, 0);

  if (dateBasedYears > 0) return dateBasedYears;
  const normalized = normalizeMatchText(profileExperience);
  if (!normalized || normalized.includes('no experience')) return 0;
  if (normalized.includes('less than 1')) return 0.5;
  const rangeMatch = normalized.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (rangeMatch) return Number(rangeMatch[2]);
  const numberMatch = normalized.match(/(\d+)/);
  return numberMatch ? Number(numberMatch[1]) : 0;
};

const getEducationRank = (value = '') => {
  const normalized = normalizeMatchText(value);
  if (!normalized) return 0;
  if (normalized.includes('doctor')) return 5;
  if (normalized.includes('master')) return 4;
  if (normalized.includes('bachelor') || normalized.includes('college') || normalized.includes('degree graduate')) return 3;
  if (normalized.includes('associate') || normalized.includes('vocational')) return 2;
  if (normalized.includes('high school')) return 1;
  return 0;
};

const calculateApplicationMatch = ({ job = {}, profile = {}, skills = [], work = [], education = [] }) => {
  const applicantSkills = skills.map((item) => normalizeSkillName(item?.skill || item)).filter(Boolean);
  const requiredSkills = (Array.isArray(job?.skillsRequired) ? job.skillsRequired : String(job?.skillsRequired || '').split(','))
    .map(normalizeSkillName)
    .filter(Boolean);

  const matchedSkills = requiredSkills.filter((requiredSkill) => applicantSkills.some(
    (applicantSkill) => applicantSkill === requiredSkill || applicantSkill.includes(requiredSkill) || requiredSkill.includes(applicantSkill)
  ));

  const skillRatio = requiredSkills.length ? matchedSkills.length / requiredSkills.length : applicantSkills.length ? 0.75 : 0;
  const latestEducation = Array.isArray(education) && education.length ? education[education.length - 1] : {};
  const applicantEducation = latestEducation.educationalAttainment || latestEducation.level || profile.educationalAttainment || profile.course || '';
  const requiredEducation = job.educationLevel || job.educationalRequirements || '';
  const applicantEducationRank = getEducationRank(applicantEducation);
  const requiredEducationRank = getEducationRank(requiredEducation);
  const educationRatio = requiredEducationRank ? Math.min(1, applicantEducationRank / requiredEducationRank) : applicantEducationRank ? 0.75 : 0;
  const applicantYears = getApplicantExperienceYears(work, profile.experience || profile.whatHaveYouDone);
  const requiredYears = getRequiredExperienceYears(job.experienceLevel);
  const experienceRatio = requiredYears ? Math.min(1, applicantYears / requiredYears) : job.openToFreshGraduates || applicantYears >= 0 ? 1 : 0;
  const applicantCourseText = normalizeMatchText([
    profile.course,
    profile.studyField,
    profile.educationalAttainment,
    latestEducation.course,
    latestEducation.studyField,
    latestEducation.educationalAttainment,
    latestEducation.level,
  ].filter(Boolean).join(' '));
  const jobContextText = normalizeMatchText([
    job.title,
    job.category,
    job.description,
    job.requirements,
    job.qualification,
    job.educationalRequirements,
  ].filter(Boolean).join(' '));
  const courseWords = applicantCourseText.split(' ').filter((word) => word.length >= 4);
  const courseHits = courseWords.filter((word) => jobContextText.includes(word));
  const courseRatio = courseWords.length ? Math.min(1, courseHits.length / Math.min(courseWords.length, 4)) : 0;
  const score = Math.round(skillRatio * 45 + educationRatio * 20 + experienceRatio * 20 + courseRatio * 15);
  return Math.max(0, Math.min(100, score));
};

const hasMeaningfulObjectValue = (item = {}) => Boolean(
  item && typeof item === 'object' && Object.entries(item).some(([key, value]) => {
    if (['_id', 'id', 'createdAt', 'updatedAt', '__v'].includes(key)) return false;
    if (Array.isArray(value)) return value.length > 0;
    if (value && typeof value === 'object') return hasMeaningfulObjectValue(value);
    return Boolean(String(value ?? '').trim());
  })
);

const calculateJobSeekerLevel = ({ skills = [], certifications = [], projects = [], seminars = [], awards = [], workExperiences = [] }) => {
  const counts = {
    skills: skills.filter(Boolean).length,
    certifications: certifications.filter(hasMeaningfulObjectValue).length,
    projects: projects.filter(hasMeaningfulObjectValue).length,
    seminars: seminars.filter(hasMeaningfulObjectValue).length,
    awards: awards.filter(hasMeaningfulObjectValue).length,
    work: workExperiences.length,
  };
  const tiers = [
    ['First Time Job Seeker', { skills: 0, certifications: 0, projects: 0, seminars: 0, awards: 0, work: 0 }],
    ['Intermediate', { skills: 5, certifications: 1, projects: 1, seminars: 1, awards: 1, work: 0 }],
    ['Expert', { skills: 9, certifications: 2, projects: 2, seminars: 2, awards: 2, work: 1 }],
    ['Pro', { skills: 13, certifications: 5, projects: 5, seminars: 5, awards: 5, work: 2 }],
    ['Legend', { skills: 17, certifications: 7, projects: 7, seminars: 7, awards: 7, work: 3 }],
  ];
  let rank = tiers[0][0];
  tiers.forEach(([name, requirements]) => {
    if (Object.entries(requirements).every(([key, required]) => counts[key] >= required)) rank = name;
  });
  return rank;
};

const formatRelativeTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'recently';
  const days = Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000));
  if (days < 1) return 'today';
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months === 1 ? '' : 's'} ago`;
};

const statusStyle = (status) => {
  const normalized = String(status || 'pending').toLowerCase();
  if (normalized === 'hired') return 'bg-emerald-100 text-emerald-700';
  if (normalized === 'for interview') return 'bg-blue-100 text-blue-700';
  if (normalized === 'declined') return 'bg-red-100 text-red-700';
  if (normalized === 'vacancy full') return 'bg-amber-100 text-amber-700';
  if (normalized === 'withdrawn' || normalized === 'cancelled') return 'bg-gray-100 text-gray-600';
  return 'bg-[#eef2ff] text-[#4056a1]';
};

const statusLabel = (status) => {
  const normalized = String(status || 'pending').toLowerCase();
  if (normalized === 'for interview') return 'For Interview';
  if (normalized === 'vacancy full') return 'Vacancy Full';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const levelStyle = (level) => {
  if (level === 'Legend') return 'bg-emerald-100 text-emerald-700';
  if (level === 'Pro') return 'bg-amber-100 text-amber-700';
  if (level === 'Expert') return 'bg-violet-100 text-violet-700';
  if (level === 'Intermediate') return 'bg-blue-100 text-blue-700';
  return 'bg-gray-100 text-gray-700';
};


const cn = (...classes) => classes.filter(Boolean).join(' ');

const dateOptions = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: '7days', label: 'Last 7 Days' },
  { value: '30days', label: 'Last 30 Days' },
  { value: 'thisMonth', label: 'This Month' },
  { value: 'lastMonth', label: 'Last Month' },
  { value: 'custom', label: 'Custom Range' },
];

const formatDateInput = (date) => {
  if (!date) return '';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const getPresetDateRange = (value) => {
  const today = new Date();
  const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (value === 'today') return { dateFrom: formatDateInput(endOfToday), dateTo: formatDateInput(endOfToday) };
  if (value === 'yesterday') {
    const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
    return { dateFrom: formatDateInput(yesterday), dateTo: formatDateInput(yesterday) };
  }
  if (value === '7days') return { dateFrom: formatDateInput(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6)), dateTo: formatDateInput(endOfToday) };
  if (value === '30days') return { dateFrom: formatDateInput(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 29)), dateTo: formatDateInput(endOfToday) };
  if (value === 'thisMonth') return { dateFrom: formatDateInput(new Date(today.getFullYear(), today.getMonth(), 1)), dateTo: formatDateInput(endOfToday) };
  if (value === 'lastMonth') return { dateFrom: formatDateInput(new Date(today.getFullYear(), today.getMonth() - 1, 1)), dateTo: formatDateInput(new Date(today.getFullYear(), today.getMonth(), 0)) };
  return { dateFrom: '', dateTo: '' };
};

const formatDateLabel = (value) => {
  if (!value) return 'Select date';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return 'Select date';
  return date.toLocaleDateString('en-PH', { month: 'short', day: '2-digit', year: 'numeric' });
};

const getDateOptionLabel = (value, startDate, endDate) => {
  if (value === 'custom' && startDate && endDate) return `${formatDateLabel(startDate)} - ${formatDateLabel(endDate)}`;
  return dateOptions.find((option) => option.value === value)?.label || 'All Time';
};

const addCalendarMonths = (date, amount) => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + amount);
  return next;
};

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const getYearOptions = () => {
  const startYear = 1950;
  const endYear = new Date().getFullYear();
  return Array.from({ length: endYear - startYear + 1 }, (_, index) => startYear + index);
};

const CalendarMonth = ({ monthDate, startDate, endDate, onPickDate, onChangeMonth }) => {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const gridStart = new Date(year, month, 1 - firstWeekday);
  const start = startDate ? new Date(`${startDate}T00:00:00`) : null;
  const end = endDate ? new Date(`${endDate}T00:00:00`) : null;
  const days = Array.from({ length: 42 }, (_, index) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + index);
    return d;
  });
  const isSameDay = (a, b) => a && b && a.toDateString() === b.toDateString();
  const inRange = (d) => start && end && d >= start && d <= end;

  return (
    <div className="min-w-0 flex-1">
      <div className="mb-4 grid grid-cols-[32px_1fr_32px] items-center gap-2">
        <button type="button" onClick={() => onChangeMonth(addCalendarMonths(monthDate, -1))} className="flex h-8 w-8 items-center justify-center rounded-lg text-2xl text-slate-700 hover:bg-slate-100" aria-label="Previous month">‹</button>
        <div className="grid grid-cols-[1fr_86px] gap-2">
          <select value={month} onChange={(event) => onChangeMonth(new Date(year, Number(event.target.value), 1))} className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-center text-sm font-extrabold text-[#2e66a6] outline-none focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/20">
            {monthNames.map((name, index) => <option key={name} value={index}>{name}</option>)}
          </select>
          <select value={year} onChange={(event) => onChangeMonth(new Date(Number(event.target.value), month, 1))} className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-center text-sm font-extrabold text-[#2e66a6] outline-none focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/20">
            {getYearOptions().map((yearOption) => <option key={yearOption} value={yearOption}>{yearOption}</option>)}
          </select>
        </div>
        <button type="button" onClick={() => onChangeMonth(addCalendarMonths(monthDate, 1))} className="flex h-8 w-8 items-center justify-center rounded-lg text-2xl text-slate-700 hover:bg-slate-100" aria-label="Next month">›</button>
      </div>
      <div className="grid grid-cols-7 gap-y-2 text-center text-xs font-bold text-slate-500">
        {['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'].map((day) => <div key={day}>{day}</div>)}
      </div>
      <div className="mt-3 grid grid-cols-7 gap-y-1 text-center text-sm text-slate-600">
        {days.map((day) => {
          const value = formatDateInput(day);
          const outside = day.getMonth() !== month;
          const selected = isSameDay(day, start) || isSameDay(day, end);
          return (
            <button type="button" key={`${value}-${month}`} onClick={() => onPickDate(value)} className={cn('mx-auto flex h-9 w-full items-center justify-center transition', outside ? 'text-slate-300' : 'text-slate-700', inRange(day) ? 'bg-[#2e66a6]/10 text-[#2e66a6]' : '', selected ? 'rounded-lg bg-[#2e66a6] font-extrabold text-white shadow-md' : 'hover:bg-[#2e66a6]/10')}>
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const CustomDateRangeModal = ({ open, startDate, endDate, onCancel, onApply }) => {
  const todayValue = formatDateInput(new Date());
  const [draftStart, setDraftStart] = useState(startDate || todayValue);
  const [draftEnd, setDraftEnd] = useState(endDate || todayValue);
  const [leftMonth, setLeftMonth] = useState(new Date(`${startDate || todayValue}T00:00:00`));
  const [rightMonth, setRightMonth] = useState(new Date(`${endDate || todayValue}T00:00:00`));

  useEffect(() => {
    if (!open) return;
    const nextStart = startDate || todayValue;
    const nextEnd = endDate || todayValue;
    setDraftStart(nextStart);
    setDraftEnd(nextEnd);
    setLeftMonth(new Date(`${nextStart}T00:00:00`));
    setRightMonth(new Date(`${nextEnd}T00:00:00`));
  }, [open, startDate, endDate, todayValue]);

  if (!open) return null;
  const pickDate = (value) => {
    if (!draftStart || (draftStart && draftEnd)) {
      setDraftStart(value);
      setDraftEnd('');
    } else if (new Date(`${value}T00:00:00`) < new Date(`${draftStart}T00:00:00`)) {
      setDraftEnd(draftStart);
      setDraftStart(value);
    } else {
      setDraftEnd(value);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 px-4 py-6">
      <div className="w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="grid gap-5 px-6 pb-5 pt-5 md:grid-cols-[1fr_auto_1fr] md:items-end">
          <div><div className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-500">Start Date</div><div className="flex h-12 items-center gap-3 rounded-xl bg-slate-100 px-4 text-lg font-bold text-[#2e66a6]"><SvgIcon name="calendar" className="h-5 w-5" />{formatDateLabel(draftStart)}</div></div>
          <div className="hidden pb-3 text-3xl text-slate-500 md:block">→</div>
          <div><div className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-500">End Date</div><div className="flex h-12 items-center gap-3 rounded-xl bg-slate-100 px-4 text-lg font-bold text-[#2e66a6]"><SvgIcon name="calendar" className="h-5 w-5" />{formatDateLabel(draftEnd)}</div></div>
        </div>
        <div className="grid gap-8 px-6 pb-5 md:grid-cols-2">
          <CalendarMonth monthDate={leftMonth} startDate={draftStart} endDate={draftEnd} onPickDate={pickDate} onChangeMonth={setLeftMonth} />
          <CalendarMonth monthDate={rightMonth} startDate={draftStart} endDate={draftEnd} onPickDate={pickDate} onChangeMonth={setRightMonth} />
        </div>
        <div className="flex items-center justify-end gap-4 border-t border-slate-100 px-6 py-5">
          <button type="button" onClick={onCancel} className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">Cancel</button>
          <button type="button" disabled={!draftStart || !draftEnd} onClick={() => onApply(draftStart, draftEnd)} className="rounded-xl bg-[#2e66a6] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#25578f] disabled:cursor-not-allowed disabled:opacity-50">Apply Range</button>
        </div>
      </div>
    </div>
  );
};

const JobApplicants = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [job, setJob] = useState(null);
  const [applications, setApplications] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showCustomDateModal, setShowCustomDateModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const fetchApplicants = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await axios.get(`${API_HOST}/api/applications/job/${jobId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setJob(response.data?.job || null);
      setApplications(Array.isArray(response.data?.applications) ? response.data.applications : []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load job applicants.');
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => { fetchApplicants(); }, [fetchApplicants]);

  const applicantCards = useMemo(() => applications.map((application) => {
    const user = application.jobseeker || {};
    const profile = user.jobSeekerProfile || {};
    const work = Array.isArray(profile.workExperiences) ? profile.workExperiences : [];
    const education = Array.isArray(profile.educationEntries) ? profile.educationEntries : [];
    const skills = [...parseSkills(profile.technicalSkills), ...parseSkills(profile.softSkills)];
    return {
      application, user, profile, skills,
      level: calculateJobSeekerLevel({ skills, certifications: profile.certifications || [], projects: profile.projects || [], seminars: profile.seminars || [], awards: profile.awards || [], workExperiences: work }),
      matchScore: calculateApplicationMatch({ job: job || {}, profile, skills, work, education }),
    };
  }), [applications, job]);

  const filteredApplicants = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return applicantCards.filter(({ application, user, profile }) => {
      const name = user.fullName || [user.firstName, user.middleName, user.lastName].filter(Boolean).join(' ');
      const searchableText = [name, user.email, profile.phoneNumber, profile.contactNumber, job?.title].filter(Boolean).join(' ').toLowerCase();
      if (query && !searchableText.includes(query)) return false;
      if (statusFilter !== 'all' && String(application.status || '').toLowerCase() !== statusFilter) return false;
      if (dateFrom && dateTo) {
        const appliedDate = new Date(application.appliedAt || application.createdAt);
        const start = new Date(`${dateFrom}T00:00:00`);
        const end = new Date(`${dateTo}T23:59:59.999`);
        if (Number.isNaN(appliedDate.getTime()) || appliedDate < start || appliedDate > end) return false;
      }
      return true;
    });
  }, [applicantCards, searchTerm, statusFilter, dateFrom, dateTo, job]);

  const totalPages = Math.max(1, Math.ceil(filteredApplicants.length / itemsPerPage));
  useEffect(() => { if (currentPage > totalPages) setCurrentPage(totalPages); }, [currentPage, totalPages]);
  const paginatedApplicants = filteredApplicants.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const firstShown = filteredApplicants.length ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const lastShown = Math.min(currentPage * itemsPerPage, filteredApplicants.length);

  const changeDateFilter = (value) => {
    if (value === 'custom') {
      setShowCustomDateModal(true);
      return;
    }
    const range = getPresetDateRange(value);
    setDateFilter(value);
    setDateFrom(range.dateFrom);
    setDateTo(range.dateTo);
    setCurrentPage(1);
  };

  const applyCustomDateRange = (startDate, endDate) => {
    setDateFilter('custom');
    setDateFrom(startDate);
    setDateTo(endDate);
    setCurrentPage(1);
    setShowCustomDateModal(false);
  };

  const openPositions = Math.max(0, Number(job?.vacancies || 0) - applications.filter((item) => item.status === 'hired').length);

  return (
    <EmployerLayout>
      <div className="mmx-auto max-w-7xl px-1 py-8">
        <button type="button" onClick={() => navigate(`/employer/manage-jobs/${jobId}/view`)} className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#111827] shadow-sm hover:bg-gray-50">
          <SvgIcon name="back" /> Back to job details
        </button>

        <div className="mt-7">
          <p className="text-sm font-bold uppercase tracking-wide text-[#2e66a6]">Applicants</p>
          <h1 className="mt-1 text-3xl font-bold text-[#111827]">{job?.title || 'Job Applicants'}</h1>
          <p className="mt-2 text-lg text-[#6b7280]">{applications.length} candidate{applications.length === 1 ? '' : 's'} applied · {openPositions} open position{openPositions === 1 ? '' : 's'}</p>
        </div>

        <div className="mt-8 rounded-3xl border border-[#e3e5ef] bg-white p-5 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-[1.45fr_0.8fr_0.9fr]">
            <div className="relative">
              <SvgIcon name="search" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input value={searchTerm} onChange={(event) => { setSearchTerm(event.target.value); setCurrentPage(1); }} placeholder="Search applicant name, email..." className="h-12 w-full rounded-xl border border-gray-200 bg-white pl-12 pr-4 text-sm text-gray-900 outline-none focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/20" />
            </div>
            <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setCurrentPage(1); }} className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/20">
              <option value="all">All Status</option><option value="pending">Pending</option><option value="for interview">For Interview</option><option value="hired">Hired</option><option value="declined">Declined</option>
            </select>
            <div className="relative">
              <SvgIcon name="calendar" className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
              <select value={dateFilter} onChange={(event) => changeDateFilter(event.target.value)} className="h-12 w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 pr-12 text-sm font-medium text-gray-900 outline-none focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/20">
                {dateOptions.map((option) => <option key={option.value} value={option.value}>{option.value === dateFilter ? getDateOptionLabel(option.value, dateFrom, dateTo) : option.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="mt-8 rounded-3xl bg-white p-12 text-center text-[#6b7280]">Loading applicants...</div>
        ) : error ? (
          <div className="mt-8 rounded-3xl bg-white p-12 text-center text-red-600">{error}</div>
        ) : paginatedApplicants.length ? (
          <>
            <div className="mt-8 space-y-5">
              {paginatedApplicants.map(({ application, user, profile, level, matchScore }) => {
                const name = user.fullName || [user.firstName, user.middleName, user.lastName].filter(Boolean).join(' ') || 'Applicant';
                const image = user.profileImage ? (String(user.profileImage).startsWith('http') ? user.profileImage : `${API_HOST}${user.profileImage}`) : '';
                const phone = profile.phoneNumber || profile.contactNumber || 'Not provided';
                return (
                  <article key={application._id} className="rounded-3xl border border-[#e3e5ef] bg-white p-6 shadow-sm">
                    <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                      <div className="flex min-w-0 items-center gap-5">
                        {image ? <img src={image} alt={name} className="h-20 w-20 rounded-full object-cover" /> : <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#e8edff] text-2xl font-bold text-[#2e66a6]">{name.charAt(0).toUpperCase()}</div>}
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-3"><h2 className="text-xl font-bold text-[#111827]">{name}</h2><span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyle(application.status)}`}>{statusLabel(application.status)}</span></div>
                          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[#7b8190]"><span className="inline-flex items-center gap-1.5"><SvgIcon name="mail" />{user.email || 'Not provided'}</span><span className="hidden text-[#c2c5ce] sm:inline">|</span><span className="inline-flex items-center gap-1.5"><SvgIcon name="phone" />{phone}</span></div>
                          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${levelStyle(level)}`}>★ {level}</span><span className="inline-flex items-center gap-1.5 text-[#7b8190]"><SvgIcon name="calendar" />Applied {formatRelativeTime(application.appliedAt || application.createdAt)}</span></div>
                        </div>
                      </div>
                      <div className="flex flex-row items-center gap-3 md:flex-col md:items-stretch">
                        <div className="inline-flex items-center justify-center gap-2 rounded-full bg-[#eaf0ff] px-5 py-2 text-sm font-bold text-[#2e66a6]"><SvgIcon name="sparkle" />{matchScore}% match</div>
                        <button type="button" onClick={() => navigate(`/employer/application/${application._id}?from=job-applicants&jobId=${encodeURIComponent(jobId)}`)} className="inline-flex items-center justify-center gap-2 rounded-full bg-[#2e66a6] px-6 py-2.5 text-sm font-bold text-white shadow-md hover:bg-[#25578f]">View profile <SvgIcon name="arrow" /></button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
            <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-[#e3e5ef] bg-white px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-gray-500">Showing {firstShown} to {lastShown} of {filteredApplicants.length} entries</p>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button type="button" disabled={currentPage === 1} onClick={() => setCurrentPage((page) => page - 1)} className="inline-flex h-9 items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"><SvgIcon name="chevronLeft" />Previous</button>
                <div className="inline-flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, index) => index + 1).slice(Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2)).map((pageNumber) => <button key={pageNumber} type="button" onClick={() => setCurrentPage(pageNumber)} className={cn('inline-flex h-9 min-w-[36px] items-center justify-center rounded-lg border px-3 text-sm font-semibold transition', pageNumber === currentPage ? 'border-[#2e66a6] bg-[#2e66a6] text-white' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50')}>{pageNumber}</button>)}
                </div>
                <button type="button" disabled={currentPage === totalPages} onClick={() => setCurrentPage((page) => page + 1)} className="inline-flex h-9 items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50">Next<SvgIcon name="chevronRight" /></button>
              </div>
            </div>
          </>
        ) : (
          <div className="mt-8 rounded-3xl bg-white p-12 text-center text-[#6b7280]">No applicants found for the selected filters.</div>
        )}
      </div>

      <CustomDateRangeModal open={showCustomDateModal} startDate={dateFrom} endDate={dateTo} onCancel={() => setShowCustomDateModal(false)} onApply={applyCustomDateRange} />
    </EmployerLayout>
  );
};

export default JobApplicants;
