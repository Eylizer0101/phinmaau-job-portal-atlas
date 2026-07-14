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

const JobApplicants = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [job, setJob] = useState(null);
  const [applications, setApplications] = useState([]);

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

  useEffect(() => {
    fetchApplicants();
  }, [fetchApplicants]);

  const applicantCards = useMemo(() => applications.map((application) => {
    const user = application.jobseeker || {};
    const profile = user.jobSeekerProfile || {};
    const work = Array.isArray(profile.workExperiences) ? profile.workExperiences : [];
    const education = Array.isArray(profile.educationEntries) ? profile.educationEntries : [];
    const skills = [...parseSkills(profile.technicalSkills), ...parseSkills(profile.softSkills)];
    return {
      application,
      user,
      profile,
      skills,
      level: calculateJobSeekerLevel({
        skills,
        certifications: profile.certifications || [],
        projects: profile.projects || [],
        seminars: profile.seminars || [],
        awards: profile.awards || [],
        workExperiences: work,
      }),
      matchScore: calculateApplicationMatch({ job: job || {}, profile, skills, work, education }),
    };
  }), [applications, job]);

  const openPositions = Math.max(0, Number(job?.vacancies || 0) - applications.filter((item) => item.status === 'hired').length);

  return (
    <EmployerLayout>
      
        <div className="mmx-auto max-w-7xl px-1 py-8">
          <button
            type="button"
            onClick={() => navigate(`/employer/manage-jobs/${jobId}/view`)}
            className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#111827] shadow-sm hover:bg-gray-50"
          >
            <SvgIcon name="back" />
            Back to job details
          </button>

          <div className="mt-7">
            <p className="text-sm font-bold uppercase tracking-wide text-[#2e66a6]">Applicants</p>
            <h1 className="mt-1 text-3xl font-bold text-[#111827]">{job?.title || 'Job Applicants'}</h1>
            <p className="mt-2 text-lg text-[#6b7280]">
              {applications.length} candidate{applications.length === 1 ? '' : 's'} applied · {openPositions} open position{openPositions === 1 ? '' : 's'}
            </p>
          </div>

          {loading ? (
            <div className="mt-8 rounded-3xl bg-white p-12 text-center text-[#6b7280]">Loading applicants...</div>
          ) : error ? (
            <div className="mt-8 rounded-3xl bg-white p-12 text-center text-red-600">{error}</div>
          ) : applicantCards.length ? (
            <div className="mt-8 space-y-5">
              {applicantCards.map(({ application, user, profile, level, matchScore }) => {
                const name = user.fullName || [user.firstName, user.middleName, user.lastName].filter(Boolean).join(' ') || 'Applicant';
                const image = user.profileImage
                  ? (String(user.profileImage).startsWith('http') ? user.profileImage : `${API_HOST}${user.profileImage}`)
                  : '';
                const phone = profile.phoneNumber || profile.contactNumber || 'Not provided';

                return (
                  <article key={application._id} className="rounded-3xl border border-[#e3e5ef] bg-white p-6 shadow-sm">
                    <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                      <div className="flex min-w-0 items-center gap-5">
                        {image ? (
                          <img src={image} alt={name} className="h-20 w-20 rounded-full object-cover" />
                        ) : (
                          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#e8edff] text-2xl font-bold text-[#2e66a6]">
                            {name.charAt(0).toUpperCase()}
                          </div>
                        )}

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-3">
                            <h2 className="text-xl font-bold text-[#111827]">{name}</h2>
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyle(application.status)}`}>
                              {statusLabel(application.status)}
                            </span>
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[#7b8190]">
                            <span className="inline-flex items-center gap-1.5"><SvgIcon name="mail" />{user.email || 'Not provided'}</span>
                            <span className="hidden text-[#c2c5ce] sm:inline">|</span>
                            <span className="inline-flex items-center gap-1.5"><SvgIcon name="phone" />{phone}</span>
                          </div>

                          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${levelStyle(level)}`}>★ {level}</span>
                            <span className="inline-flex items-center gap-1.5 text-[#7b8190]"><SvgIcon name="calendar" />Applied {formatRelativeTime(application.appliedAt || application.createdAt)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-row items-center gap-3 md:flex-col md:items-stretch">
                        <div className="inline-flex items-center justify-center gap-2 rounded-full bg-[#eaf0ff] px-5 py-2 text-sm font-bold text-[#2e66a6]">
                          <SvgIcon name="sparkle" />
                          {matchScore}% match
                        </div>
                        <button
                          type="button"
                          onClick={() => navigate(`/employer/application/${application._id}`)}
                          className="inline-flex items-center justify-center gap-2 rounded-full bg-[#2e66a6] px-6 py-2.5 text-sm font-bold text-white shadow-md hover:bg-[#25578f]"
                        >
                          View profile
                          <SvgIcon name="arrow" />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="mt-8 rounded-3xl bg-white p-12 text-center text-[#6b7280]">No applicants have applied for this job yet.</div>
          )}
        </div>
      
    </EmployerLayout>
  );
};

export default JobApplicants;
