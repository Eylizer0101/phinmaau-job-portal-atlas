// src/pages/jobseeker/dashboard/JobSeekerDashboard.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faClock,
  faCheckCircle,
  faTimes,
  faTimesCircle,
  faCalendarAlt,
  faMapMarkerAlt,
} from '@fortawesome/free-solid-svg-icons';

const TOP_CARD_HEIGHT = 'lg:h-[460px]';
const PROFILE_REMINDER_ICON = '/images/clock.png';

const normalizeBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  const v = String(value || '').trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes' || v === 'on';
};

const normalizeExperienceLevelValue = (value) => String(value || '').trim().toLowerCase();

const isFreshGraduateJob = (job) => {
  return normalizeBoolean(job?.openToFreshGraduates);
};

const getExperienceBadgeLabel = (experienceLevel) => {
  const raw = String(experienceLevel || '').trim();
  if (!raw) return '';

  const normalized = normalizeExperienceLevelValue(raw);

  if (normalized === 'no experience required') {
    return 'No experience required';
  }

  if (normalized === '1 year') return '1 Year Experience';
  if (normalized === '2 years') return '2 Years Experience';
  if (normalized === '3 years') return '3 Years Experience';
  if (normalized === '4 years') return '4 Years Experience';
  if (normalized === '5 years') return '5 Years Experience';
  if (normalized === '6+ years') return '6+ Years Experience';

  return raw;
};

const hasNonEmptyValue = (value) => {
  if (Array.isArray(value)) return value.length > 0;
  return Boolean(String(value || '').trim());
};

const parseSkillsToArray = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || '').trim()).filter(Boolean);
  }

  return String(value || '')
    .split(',')
    .map((item) => String(item || '').trim())
    .filter(Boolean);
};

const getProfileCompletionStatus = (user = {}) => {
  const profile = user?.jobSeekerProfile || {};
  const educationEntries = Array.isArray(profile?.educationEntries) ? profile.educationEntries : [];
  const technicalSkills = parseSkillsToArray(profile?.technicalSkills);
  const softSkills = parseSkillsToArray(profile?.softSkills);
  const combinedSkills = [...technicalSkills, ...softSkills].filter(Boolean);

  const checks = {
    profileImage: hasNonEmptyValue(user?.profileImage),
    resume: hasNonEmptyValue(profile?.verificationDocs?.cv?.url) || hasNonEmptyValue(profile?.resumeUrl),
    skills: combinedSkills.length > 0,
    education: educationEntries.length > 0,
    location: hasNonEmptyValue(profile?.address),
    phoneNumber: hasNonEmptyValue(profile?.phoneNumber),
    aboutBio: hasNonEmptyValue(profile?.aboutMe),
  };

  const missingFields = Object.entries(checks)
    .filter(([, isComplete]) => !isComplete)
    .map(([key]) => key);

  return {
    isComplete: missingFields.length === 0,
    checks,
    missingFields,
  };
};

const JobSeekerDashboard = () => {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState({
    pending: 0,
    forInterview: 0,
    hired: 0,
    declined: 0,
    total: 0,
  });
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState({
    name: 'Job Seeker',
    profileComplete: false,
    profileScore: 0,
    profileChecks: {},
    missingProfileFields: [],
  });

  const [showProfileReminderBanner, setShowProfileReminderBanner] = useState(false);

  const [companies, setCompanies] = useState([]);
  const [companiesLoading, setCompaniesLoading] = useState(true);
  const [jobCountByEmployerId, setJobCountByEmployerId] = useState({});
  const [expandedCompanyCardId, setExpandedCompanyCardId] = useState(null);

  const [jobOffers, setJobOffers] = useState([]);
  const [jobOffersLoading, setJobOffersLoading] = useState(true);

  // ✅ FORCE CHANGE PASSWORD STATES
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });
  const [passwordErrors, setPasswordErrors] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
    general: '',
  });
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    currentPassword: false,
    newPassword: false,
    confirmNewPassword: false,
  });

  const apiOrigin = useMemo(() => {
    const base = api?.defaults?.baseURL || process.env.REACT_APP_API_URL || 'https://phinmaau-job-portal-atlas.onrender.com/api';
    return String(base).replace(/\/api\/?$/, '');
  }, []);

  const resolveLogoUrl = (logo) => {
    if (!logo) return '';
    const v = String(logo).trim();
    if (!v) return '';
    if (/^https?:\/\//i.test(v)) return v;
    if (v.startsWith('/uploads')) return `${apiOrigin}${v}`;
    return `${apiOrigin}/${v.replace(/^\/+/, '')}`;
  };

  const formatCompanyLocation = (loc) => {
    const v = String(loc || '').trim();
    if (!v) return '';
    if (v.includes(' - ')) {
      const parts = v.split(' - ');
      const last = parts[parts.length - 1]?.trim();
      return last || v;
    }
    if (v.includes(',')) {
      const first = v.split(',')[0]?.trim();
      return first || v;
    }
    return v;
  };

  const shortenIndustry = (value, max = 26) => {
    const v = String(value || '').trim();
    if (!v) return '';
    if (v.length <= max) return v;
    return `${v.slice(0, max).trim()}...`;
  };

  const normalizeJobsResponse = (response) => {
    let jobsData = [];
    if (response?.data?.success && response.data?.jobs) jobsData = response.data.jobs;
    else if (response?.data?.data) jobsData = response.data.data;
    else if (Array.isArray(response?.data)) jobsData = response.data;
    else if (response?.data?.success && response.data?.data) jobsData = response.data.data;
    return jobsData || [];
  };

  const formatRatingValue = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return '0.0';
    return numeric.toFixed(1);
  };

  const formatReviewText = (rating, reviewCount) => {
    const safeRating = formatRatingValue(rating);
    const safeReviewCount = Number(reviewCount) || 0;
    return `${safeRating} • ${safeReviewCount} review${safeReviewCount === 1 ? '' : 's'}`;
  };

  const StarRating = ({ rating = 0, size = 'w-[15px] h-[15px]' }) => {
    const normalized = Math.max(0, Math.min(5, Number(rating) || 0));
    const fullStars = Math.round(normalized);

    return (
      <div className="flex items-center gap-[6px]">
        {[0, 1, 2, 3, 4].map((idx) => {
          const filled = idx < fullStars;
          return (
            <svg
              key={idx}
              className={`${size} text-[#2e66a6]`}
              viewBox="0 0 20 20"
              fill={filled ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth="1.6"
              aria-hidden="true"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.539 1.118l-2.8-2.034a1 1 0 00-1.176 0l-2.8 2.034c-.783.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81H7.03a1 1 0 00.95-.69l1.07-3.292z" />
            </svg>
          );
        })}
      </div>
    );
  };

  const getBreakdownRows = (company) => {
    const breakdown = company?.ratingBreakdown || {};
    const total = Number(company?.reviewCount) || 0;

    return [5, 4, 3, 2, 1].map((star) => {
      const count = Number(breakdown?.[star] || 0);
      const percent = total > 0 ? (count / total) * 100 : 0;

      return {
        star,
        count,
        percent,
      };
    });
  };

  const fetchCompaniesPreview = async () => {
    try {
      setCompaniesLoading(true);

      const res = await api.get('/companies/verified');
      const list = res?.data?.companies || [];
      console.log('Verified companies:', list);
      const preview = list.slice(0, 4);
      setCompanies(preview);

      try {
        const jobsRes = await api.get('/jobs');
        const jobs = normalizeJobsResponse(jobsRes);

        const countMap = {};
        (jobs || []).forEach((job) => {
          const employerId =
            typeof job?.employer === 'string'
              ? job.employer
              : job?.employer?._id || job?.employer?.id;

          if (!employerId) return;
          countMap[employerId] = (countMap[employerId] || 0) + 1;
        });

        setJobCountByEmployerId(countMap);
      } catch (e) {
        console.error('Error fetching jobs for company counts:', e);
        setJobCountByEmployerId({});
      }
    } catch (e) {
      console.error('Error fetching companies:', e);
      setCompanies([]);
      setJobCountByEmployerId({});
    } finally {
      setCompaniesLoading(false);
    }
  };

  const fetchJobOffersPreview = async () => {
    try {
      setJobOffersLoading(true);

      let jobsRes;
      try {
        jobsRes = await api.get('/jobs/recommended');
      } catch (recommendedError) {
        console.error('Error fetching recommended job offers, falling back to all jobs:', recommendedError);
        jobsRes = await api.get('/jobs');
      }
      const jobs = normalizeJobsResponse(jobsRes);

      const now = new Date();

      const filteredJobs = (jobs || []).filter((job) => {
        if (!job) return false;
        if (job.isPublished === false) return false;
        if (job.isActive === false) return false;

        if (!job.applicationDeadline) return true;
        const deadline = new Date(job.applicationDeadline);
        if (Number.isNaN(deadline.getTime())) return true;

        return deadline >= now;
      });

      setJobOffers(filteredJobs.slice(0, 2));
    } catch (error) {
      console.error('Error fetching job offers preview:', error);
      setJobOffers([]);
    } finally {
      setJobOffersLoading(false);
    }
  };

  const handleStatsCardClick = (filter) => {
    if (filter === 'total') {
      navigate('/jobseeker/my-applications');
      return;
    }

    if (filter === 'declined') {
      navigate('/jobseeker/my-applications?tab=inactive');
      return;
    }

    navigate(`/jobseeker/my-applications?status=${filter}`);
  };

  const getCompanyLogo = (application) => {
    if (application.job?.companyLogo) {
      const logo = application.job.companyLogo;
      if (logo.startsWith('http')) return logo;
      if (logo.startsWith('/')) return `${apiOrigin}${logo}`;
      return `${apiOrigin}/uploads/logos/${logo}`;
    }

    if (application.employer?.employerProfile?.companyLogo) {
      const logo = application.employer.employerProfile.companyLogo;
      if (logo.startsWith('http')) return logo;
      if (logo.startsWith('/')) return `${apiOrigin}${logo}`;
      return `${apiOrigin}/uploads/logos/${logo}`;
    }

    return null;
  };

  const getCompanyInitials = (companyName) => {
    if (!companyName) return 'CO';
    return companyName.charAt(0).toUpperCase();
  };

  const formatLocationDisplay = (loc) => {
    const v = String(loc || '').trim();
    return v || '—';
  };

  const formatSalary = (min, max) => {
    if (!min && !max) return 'Salary not specified';
    const formattedMin = min ? `₱${Number(min).toLocaleString()}` : '';
    const formattedMax = max ? `₱${Number(max).toLocaleString()}` : '';

    if (formattedMin && formattedMax) return `${formattedMin} - ${formattedMax}`;
    if (formattedMin) return `From ${formattedMin}`;
    return `Up to ${formattedMax}`;
  };

  const normalizeWorkModeLabel = (value) => {
    const v = String(value || '').trim().toLowerCase();

    if (!v) return '';

    if (v.includes('hybrid') || v.includes('blended')) return 'Blended';
    if (v.includes('work from home') || v.includes('wfh')) return 'Work from Home';
    if (v.includes('remote')) return 'Remote';
    if (v.includes('on-site') || v.includes('onsite') || v.includes('on site')) return 'On-site';

    return String(value || '').trim();
  };

  const normalizeEmploymentTypeLabel = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return '';

    const normalized = raw.toLowerCase().replace(/[_\s]+/g, '-');

    if (normalized === 'full-time' || normalized === 'fulltime') return 'Full-Time';
    if (normalized === 'part-time' || normalized === 'parttime') return 'Part-Time';
    if (normalized === 'contractual') return 'Contractual';
    if (normalized === 'permanent') return 'Permanent';
    if (normalized === 'internship') return 'Internship';
    if (normalized === 'freelance') return 'Freelance';
    if (normalized === 'temporary') return 'Temporary';

    return raw;
  };

  const getRecentApplicationJobSummary = (job = {}) => {
    const parts = [];

    if (job?.salaryMin || job?.salaryMax) {
      parts.push(formatSalary(job.salaryMin, job.salaryMax));
    }

    const workMode = normalizeWorkModeLabel(job?.workMode);
    const employmentType = normalizeEmploymentTypeLabel(job?.jobType);

    if (workMode) parts.push(workMode);
    if (employmentType) parts.push(employmentType);

    return parts.join(' | ');
  };

  const isCompanyVerified = (job) => {
    return Boolean(job?.companyVerified ?? job?.isCompanyVerified ?? job?.isVerified ?? job?.verified);
  };

  const getJobOfferTags = (job) => {
    const tags = [];
    const wmLabel = normalizeWorkModeLabel(job?.workMode);
    const experienceBadgeLabel = getExperienceBadgeLabel(job?.experienceLevel);
    const freshGraduate = isFreshGraduateJob(job);

    if (experienceBadgeLabel) {
      tags.push({
        label: experienceBadgeLabel,
        className: 'px-2 bg-[#EAF2FB] text-[#2e66a6] border border-[#BFD4EA]',
      });
    }

    if (wmLabel === 'Blended') {
      tags.push({
        label: 'Blended',
        className: 'bg-[#EAF2FB] text-[#2e66a6] border border-[#BFD4EA]',
      });
    }

    if (wmLabel === 'On-site') {
      tags.push({
        label: 'On-site',
        className: 'bg-[#EAF2FB] text-[#2e66a6] border border-[#BFD4EA]',
      });
    }

    if (wmLabel === 'Remote') {
      tags.push({
        label: 'Remote',
        className: 'bg-[#EAF2FB] text-[#2e66a6] border border-[#BFD4EA]',
      });
    }

    if (wmLabel === 'Work from Home') {
      tags.push({
        label: 'Work from Home',
        className: 'bg-[#EAF2FB] text-[#2e66a6] border border-[#BFD4EA]',
      });
    }

    if (freshGraduate) {
      tags.push({
        label: 'Open to Fresh Graduate',
        className: 'px-2 bg-[#EAF2FB] text-[#2e66a6] border border-[#BFD4EA]',
      });
    }

    return tags.slice(0, 3);
  };

  const handleViewJobDetails = (job) => {
    navigate(`/jobseeker/job-details/${job._id || job.id}`);
  };

  const handleViewCompanyDetails = (company) => {
    const companyId = company?._id || company?.id;
    if (!companyId) return;
    navigate(`/jobseeker/company-details/${companyId}`);
  };

  const handleToggleCompanyBreakdown = (companyId) => {
    setExpandedCompanyCardId((prev) => (prev === companyId ? null : companyId));
  };

  // ✅ MUST CHANGE PASSWORD CHECK
  const syncMustChangePasswordState = () => {
    try {
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      const flag = Boolean(
        storedUser?.mustChangePassword ??
          storedUser?.isTempPassword ??
          storedUser?.firstLogin
      );

      setMustChangePassword(flag);
      setPasswordModalOpen(flag);
    } catch (error) {
      console.error('Error reading mustChangePassword flag:', error);
      setMustChangePassword(false);
      setPasswordModalOpen(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    fetchUserData();
    fetchCompaniesPreview();
    fetchJobOffersPreview();
    syncMustChangePasswordState();
  }, []);

  useEffect(() => {
    if (!passwordModalOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [passwordModalOpen]);

  const fetchUserData = async () => {
    try {
      const response = await api.get('/auth/me');
      const user = response?.data?.user || {};

      const firstName = String(user.firstName || '').trim();
      const lastName = String(user.lastName || '').trim();
      const builtFullName = [firstName, lastName].filter(Boolean).join(' ').trim();

      const completion = getProfileCompletionStatus(user);
      const completedCount = Object.values(completion.checks).filter(Boolean).length;
      const totalCount = Object.keys(completion.checks).length;
      const profileScore = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

      setUserData({
        name: builtFullName || user.fullName || 'Job Seeker',
        profileComplete: completion.isComplete,
        profileScore,
        profileChecks: completion.checks,
        missingProfileFields: completion.missingFields,
      });

      setShowProfileReminderBanner(!completion.isComplete);
      localStorage.setItem('user', JSON.stringify(user));
    } catch (error) {
      console.error('Error fetching current user profile:', error);

      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const firstName = String(user.firstName || '').trim();
      const lastName = String(user.lastName || '').trim();
      const builtFullName = [firstName, lastName].filter(Boolean).join(' ').trim();

      const completion = getProfileCompletionStatus(user);
      const completedCount = Object.values(completion.checks).filter(Boolean).length;
      const totalCount = Object.keys(completion.checks).length;
      const profileScore = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

      setUserData({
        name: builtFullName || user.fullName || 'Job Seeker',
        profileComplete: completion.isComplete,
        profileScore,
        profileChecks: completion.checks,
        missingProfileFields: completion.missingFields,
      });

      setShowProfileReminderBanner(!completion.isComplete);
    }
  };

  const normalizeApplicationStatus = (status) => {
    return String(status || '')
      .trim()
      .toLowerCase()
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ');
  };

  const isFilledJob = (job) => {
    const jobStatus = normalizeApplicationStatus(job?.status || job?.jobStatus || job?.postingStatus);
    const closeReason = normalizeApplicationStatus(job?.closeReason || job?.closureReason || job?.closedReason);

    return Boolean(
      jobStatus === 'filled' ||
        jobStatus === 'vacancy full' ||
        jobStatus === 'full' ||
        closeReason === 'vacancy full' ||
        closeReason === 'filled' ||
        job?.isFilled === true ||
        job?.filled === true
    );
  };

  const getApplicationJobId = (application = {}) => {
    const job = application?.job || {};
    return String(
      job?._id ||
        job?.id ||
        application?.jobId ||
        application?.job?._id ||
        application?.job?.id ||
        ''
    ).trim();
  };

  const hasVacancyFullNotification = (application = {}) => {
    const jobTitle = String(application?.job?.title || '').trim().toLowerCase();
    const companyName = String(
      application?.job?.companyName ||
        application?.employer?.employerProfile?.companyName ||
        ''
    ).trim().toLowerCase();
    const jobId = getApplicationJobId(application);
    const applicationId = String(application?._id || application?.id || '').trim();

    return (notifications || []).some((notification) => {
      const title = String(notification?.title || '').trim().toLowerCase();
      const message = String(notification?.message || '').trim().toLowerCase();
      const metadataJobId = String(notification?.metadata?.jobId || '').trim();
      const metadataApplicationId = String(notification?.metadata?.applicationId || '').trim();
      const relatedId = String(notification?.relatedId || '').trim();

      const isVacancyFullNotice =
        title.includes('vacancy full') ||
        message.includes('vacancy is already full') ||
        message.includes('vacancy full');

      if (!isVacancyFullNotice) return false;
      if (applicationId && (metadataApplicationId === applicationId || relatedId === applicationId)) return true;
      if (jobId && (metadataJobId === jobId || relatedId === jobId)) return true;
      if (jobTitle && message.includes(jobTitle)) return true;
      if (jobTitle && companyName && message.includes(jobTitle) && message.includes(companyName)) return true;

      return false;
    });
  };

  const getEffectiveApplicationStatus = (application = {}) => {
    const normalizedStatus = normalizeApplicationStatus(application?.status);

    if (
      normalizedStatus === 'vacancy full' ||
      normalizedStatus === 'vacancy filled' ||
      normalizedStatus === 'position filled' ||
      normalizedStatus === 'filled'
    ) {
      return 'vacancy full';
    }

    if (
      normalizedStatus === 'pending' &&
      (isFilledJob(application?.job) || hasVacancyFullNotification(application))
    ) {
      return 'vacancy full';
    }

    return normalizedStatus || 'pending';
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const [appsResponse, notifResponse] = await Promise.all([
        api.get('/applications/my-applications'),
        api.get('/notifications'),
      ]);

      if (appsResponse.data.success) {
        const allApplications = appsResponse.data.applications || [];
        setApplications(allApplications);

        const pending = allApplications.filter(
          (app) => getEffectiveApplicationStatus(app) === 'pending'
        ).length;

        const forInterview = allApplications.filter(
          (app) => getEffectiveApplicationStatus(app) === 'for interview'
        ).length;

        const hired = allApplications.filter(
          (app) => getEffectiveApplicationStatus(app) === 'hired'
        ).length;

        const declined = allApplications.filter(
          (app) => getEffectiveApplicationStatus(app) === 'declined'
        ).length;

        setStats({
          pending,
          forInterview,
          hired,
          declined,
          total: allApplications.length,
        });
      }

      if (notifResponse.data.success) {
        setNotifications(notifResponse.data.notifications.slice(0, 3) || []);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setMockData();
    } finally {
      setLoading(false);
    }
  };

  const setMockData = () => {
    const mockApplications = [
      {
        _id: '1',
        job: {
          title: 'Frontend Developer',
          companyName: 'TechCorp Inc.',
          location: 'Manila, NCR, Philippines',
          salaryMin: 60000,
          salaryMax: 80000,
          workMode: 'Remote',
          jobType: 'Full-time',
          companyLogo: '/uploads/logos/techcorp.png',
        },
        employer: {
          employerProfile: {
            companyName: 'TechCorp Inc.',
            companyLogo: '/uploads/logos/techcorp.png',
          },
        },
        status: 'pending',
        appliedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        _id: '2',
        job: {
          title: 'Backend Engineer',
          companyName: 'DataSys Solutions',
          location: 'Cebu, Philippines',
          salaryMin: 70000,
          salaryMax: 90000,
          workMode: 'Blended',
          jobType: 'Full-time',
          companyLogo: '/uploads/logos/datasys.png',
        },
        employer: {
          employerProfile: {
            companyName: 'DataSys Solutions',
            companyLogo: '/uploads/logos/datasys.png',
          },
        },
        status: 'for interview',
        appliedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        interviewDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        _id: '3',
        job: {
          title: 'Junior Web Developer',
          companyName: 'BDO Unibank, Inc.',
          location: 'Cebu City',
          salaryMin: 40000,
          salaryMax: 50000,
          workMode: 'On-site',
          jobType: 'Contractual',
          companyLogo: '/uploads/logos/bdo.png',
        },
        employer: {
          employerProfile: {
            companyName: 'BDO Unibank, Inc.',
            companyLogo: '/uploads/logos/bdo.png',
          },
        },
        status: 'hired',
        appliedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        _id: '4',
        job: {
          title: 'Customer Service',
          companyName: 'Sample Corp',
          location: 'Manila',
          salaryMin: 30000,
          salaryMax: 35000,
          workMode: 'Work from Home',
          jobType: 'Permanent',
          companyLogo: '/uploads/logos/sample.png',
        },
        employer: {
          employerProfile: {
            companyName: 'Sample Corp',
            companyLogo: '/uploads/logos/sample.png',
          },
        },
        status: 'declined',
        appliedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];

    setApplications(mockApplications);
    setStats({
      pending: 1,
      forInterview: 1,
      hired: 1,
      declined: 1,
      total: 4,
    });
    setNotifications([]);
  };

  const getStatusConfig = (status) => {
    const normalized = normalizeApplicationStatus(status);

    const configs = {
      pending: {
        icon: faClock,
        label: 'Pending',
        bg: 'bg-yellow-50',
        text: 'text-yellow-800',
        border: 'border-yellow-200',
      },
      'for interview': {
        icon: faCalendarAlt,
        label: 'For Interview',
        bg: 'bg-[#EAF2FB]',
        text: 'text-[#2e66a6]',
        border: 'border-[#BFD4EA]',
      },
      hired: {
        icon: faCheckCircle,
        label: 'Hired',
        bg: 'bg-green-50',
        text: 'text-green-800',
        border: 'border-green-200',
      },
      'vacancy full': {
        icon: faTimesCircle,
        label: 'Vacancy Full',
        bg: 'bg-orange-50',
        text: 'text-orange-800',
        border: 'border-orange-200',
      },
      declined: {
        icon: faTimesCircle,
        label: 'Declined',
        bg: 'bg-red-50',
        text: 'text-red-800',
        border: 'border-red-200',
      },
    };

    return configs[normalized] || configs.pending;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Recently';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // ✅ PASSWORD VALIDATION
  const passwordRuleChecks = useMemo(() => {
    const password = String(passwordForm.newPassword || '');
    return {
      minLength: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[^A-Za-z0-9]/.test(password),
    };
  }, [passwordForm.newPassword]);

  const validatePasswordForm = () => {
    const errors = {
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
      general: '',
    };

    if (!String(passwordForm.currentPassword || '').trim()) {
      errors.currentPassword = 'Current password is required.';
    }

    if (!String(passwordForm.newPassword || '').trim()) {
      errors.newPassword = 'New password is required.';
    } else {
      const failedRules = [];
      if (!passwordRuleChecks.minLength) failedRules.push('at least 8 characters');
      if (!passwordRuleChecks.uppercase) failedRules.push('one uppercase letter');
      if (!passwordRuleChecks.lowercase) failedRules.push('one lowercase letter');
      if (!passwordRuleChecks.number) failedRules.push('At least one number');
      if (!passwordRuleChecks.special) failedRules.push('one special character');

      if (failedRules.length > 0) {
        errors.newPassword = `Password must contain ${failedRules.join(', ')}.`;
      }
    }

    if (!String(passwordForm.confirmNewPassword || '').trim()) {
      errors.confirmNewPassword = 'Please confirm your new password.';
    } else if (passwordForm.newPassword !== passwordForm.confirmNewPassword) {
      errors.confirmNewPassword = 'Confirm password does not match.';
    }

    if (
      passwordForm.currentPassword &&
      passwordForm.newPassword &&
      passwordForm.currentPassword === passwordForm.newPassword
    ) {
      errors.newPassword = 'New password must be different from your current password.';
    }

    setPasswordErrors(errors);
    return !errors.currentPassword && !errors.newPassword && !errors.confirmNewPassword;
  };

  const handlePasswordInputChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    setPasswordErrors((prev) => ({
      ...prev,
      [name]: '',
      general: '',
    }));
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleForcedPasswordChangeSubmit = async (e) => {
    e.preventDefault();

    if (passwordSubmitting) return;
    if (!validatePasswordForm()) return;

    try {
      setPasswordSubmitting(true);
      setPasswordErrors((prev) => ({ ...prev, general: '' }));

      // ✅ Ito ang gagamitan natin sa backend part 2
      const response = await api.put('/auth/change-temporary-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
        confirmNewPassword: passwordForm.confirmNewPassword,
      });

      const updatedUser =
        response?.data?.user ||
        response?.data?.data ||
        null;

      if (updatedUser) {
        localStorage.setItem('user', JSON.stringify(updatedUser));
      } else {
        const rawUser = JSON.parse(localStorage.getItem('user') || '{}');
        const mergedUser = {
          ...rawUser,
          mustChangePassword: false,
          isTempPassword: false,
          firstLogin: false,
        };
        localStorage.setItem('user', JSON.stringify(mergedUser));
      }

      setMustChangePassword(false);
      setPasswordModalOpen(false);
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: '',
      });
      setPasswordErrors({
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: '',
        general: '',
      });
      setShowPasswords({
        currentPassword: false,
        newPassword: false,
        confirmNewPassword: false,
      });

      fetchUserData();
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        'Unable to update password right now. Please try again.';

      setPasswordErrors((prev) => ({
        ...prev,
        general: message,
      }));
    } finally {
      setPasswordSubmitting(false);
    }
  };

  const handleForcedPasswordLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const passwordRequirementRow = (label, passed) => (
    <div className="flex items-center gap-2" key={label}>
      <span
        className={`inline-flex h-5 w-5 items-center justify-center rounded-full border text-[11px] font-bold ${
          passed
            ? 'border-[#2e66a6] bg-[#2e66a6] text-white'
            : 'border-[#D9E3F2] bg-white text-gray-400'
        }`}
      >
        ✓
      </span>
      <span className={`${passed ? 'text-black' : 'text-gray-600'}`}>{label}</span>
    </div>
  );

  const forcedPasswordModal = passwordModalOpen ? (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/10 px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="forced-password-modal-title"
      aria-describedby="forced-password-modal-description"
    >
      <div className="w-full max-w-4xl overflow-hidden rounded-[28px] border border-[#D9E3F2] bg-white shadow-2xl">
        <div className="grid grid-cols-1 md:grid-cols-[1.05fr_1.2fr]">
          {/* LEFT PANEL */}
          <div className="bg-white">
            <div className="bg-[#2f2b2b] px-6 py-4 text-white">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.8"
                      d="M12 11c1.657 0 3-1.567 3-3.5S13.657 4 12 4 9 5.567 9 7.5 10.343 11 12 11zm0 0c-2.761 0-5 2.239-5 5v1h10v-1c0-2.761-2.239-5-5-5z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.8"
                      d="M7 10V8a5 5 0 0110 0v2"
                    />
                  </svg>
                </div>

                <div>
                  <p className="text-sm font-bold tracking-wide">SECURITY REQUIRED</p>
                  <p className="text-xs text-white/80">Mandatory Password Update</p>
                </div>
              </div>
            </div>

            <div className="px-6 py-7 md:px-8 md:py-8">
              <h2
                id="forced-password-modal-title"
                className="text-[32px] font-extrabold leading-tight text-black"
              >
                CHANGE YOUR PASSWORD
              </h2>

              <p
                id="forced-password-modal-description"
                className="mt-3 max-w-md text-[16px] leading-7 text-black"
              >
                For your security, a mandatory password update is required for all accounts.
                This helps protect your personal information and account access.
              </p>

              <div className="mt-7 rounded-2xl bg-white p-5 ring-1 ring-gray-200">
                <p className="text-sm font-bold uppercase tracking-wide text-black">
                  Password Requirements
                </p>

                <div className="mt-4 space-y-3 text-sm">
                  {passwordRequirementRow('At least 8 characters', passwordRuleChecks.minLength)}
                  {passwordRequirementRow('One uppercase letter', passwordRuleChecks.uppercase)}
                  {passwordRequirementRow('One lowercase letter', passwordRuleChecks.lowercase)}
                  {passwordRequirementRow('At least One number', passwordRuleChecks.number)}
                  {passwordRequirementRow('One special character', passwordRuleChecks.special)}
                </div>
              </div>

              <div className="mt-5 flex items-start gap-2 text-sm text-gray-500">
                <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p>
                  This is a one-time required security measure for your account&apos;s protection.
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT PANEL */}
          <div className="border-t border-[#D9E3F2] bg-white px-6 py-7 md:border-l md:border-t-0 md:px-8 md:py-8 mt-16">
            <form onSubmit={handleForcedPasswordChangeSubmit} className="space-y-5" noValidate>
              <div>
                <label htmlFor="currentPassword" className="mb-2 block text-sm font-bold text-black">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    id="currentPassword"
                    name="currentPassword"
                    type={showPasswords.currentPassword ? 'text' : 'password'}
                    value={passwordForm.currentPassword}
                    onChange={handlePasswordInputChange}
                    disabled={passwordSubmitting}
                    className={`block h-12 w-full rounded-xl border bg-white px-4 pr-12 text-sm text-black shadow-sm outline-none transition ${
                      passwordErrors.currentPassword
                        ? 'border-red-400 focus:border-red-500'
                        : 'border-[#D9E3F2] focus:border-[#2e66a6]'
                    }`}
                    placeholder="Enter your current password"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('currentPassword')}
                    className="absolute inset-y-0 right-0 inline-flex items-center px-4 text-gray-500"
                    tabIndex={-1}
                  >
                    {showPasswords.currentPassword ? (
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4-10-7 0-1.657 1.343-3.157 3.515-4.37M9.88 9.88A3 3 0 0114.12 14.12M6.1 6.1L3 3m18 18-3.1-3.1M9.88 9.88L6.1 6.1m8.02 8.02 3.78 3.78M14.12 14.12l-4.24-4.24"
                        />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    )}
                  </button>
                </div>
                <p className="mt-2 text-xs text-gray-500">Enter your temporary password.</p>
                {passwordErrors.currentPassword ? (
                  <p className="mt-1 text-xs text-red-600">{passwordErrors.currentPassword}</p>
                ) : null}
              </div>

              <div>
                <label htmlFor="newPassword" className="mb-2 block text-sm font-bold text-black">
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="newPassword"
                    name="newPassword"
                    type={showPasswords.newPassword ? 'text' : 'password'}
                    value={passwordForm.newPassword}
                    onChange={handlePasswordInputChange}
                    disabled={passwordSubmitting}
                    className={`block h-12 w-full rounded-xl border bg-white px-4 pr-12 text-sm text-black shadow-sm outline-none transition ${
                      passwordErrors.newPassword
                        ? 'border-red-400 focus:border-red-500'
                        : 'border-[#D9E3F2] focus:border-[#2e66a6]'
                    }`}
                    placeholder="Create a strong new password"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('newPassword')}
                    className="absolute inset-y-0 right-0 inline-flex items-center px-4 text-gray-500"
                    tabIndex={-1}
                  >
                    {showPasswords.newPassword ? (
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4-10-7 0-1.657 1.343-3.157 3.515-4.37M9.88 9.88A3 3 0 0114.12 14.12M6.1 6.1L3 3m18 18-3.1-3.1M9.88 9.88L6.1 6.1m8.02 8.02 3.78 3.78M14.12 14.12l-4.24-4.24"
                        />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    )}
                  </button>
                </div>
                <p className="mt-2 text-xs text-gray-500">Select a new, strong password.</p>
                {passwordErrors.newPassword ? (
                  <p className="mt-1 text-xs text-red-600">{passwordErrors.newPassword}</p>
                ) : null}
              </div>

              <div>
                <label htmlFor="confirmNewPassword" className="mb-2 block text-sm font-bold text-black">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    id="confirmNewPassword"
                    name="confirmNewPassword"
                    type={showPasswords.confirmNewPassword ? 'text' : 'password'}
                    value={passwordForm.confirmNewPassword}
                    onChange={handlePasswordInputChange}
                    disabled={passwordSubmitting}
                    className={`block h-12 w-full rounded-xl border bg-white px-4 pr-12 text-sm text-black shadow-sm outline-none transition ${
                      passwordErrors.confirmNewPassword
                        ? 'border-red-400 focus:border-red-500'
                        : 'border-[#D9E3F2] focus:border-[#2e66a6]'
                    }`}
                    placeholder="Verify your new password"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('confirmNewPassword')}
                    className="absolute inset-y-0 right-0 inline-flex items-center px-4 text-gray-500"
                    tabIndex={-1}
                  >
                    {showPasswords.confirmNewPassword ? (
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4-10-7 0-1.657 1.343-3.157 3.515-4.37M9.88 9.88A3 3 0 0114.12 14.12M6.1 6.1L3 3m18 18-3.1-3.1M9.88 9.88L6.1 6.1m8.02 8.02 3.78 3.78M14.12 14.12l-4.24-4.24"
                        />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    )}
                  </button>
                </div>
                <p className="mt-2 text-xs text-gray-500">Re-enter to confirm your new password.</p>
                {passwordErrors.confirmNewPassword ? (
                  <p className="mt-1 text-xs text-red-600">{passwordErrors.confirmNewPassword}</p>
                ) : null}
              </div>

              {passwordErrors.general ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                  <p className="text-sm font-medium text-red-700">{passwordErrors.general}</p>
                </div>
              ) : null}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={passwordSubmitting}
                  className="inline-flex h-12 w-full items-center justify-center rounded-full bg-[#2e66a6] px-6 text-sm font-bold text-white transition hover:bg-[#245387] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {passwordSubmitting ? 'UPDATING PASSWORD...' : 'UPDATE PASSWORD'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  if (loading) {
    return (
      <>
        {forcedPasswordModal}

        <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse mb-8">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 xl:gap-8 mb-8">
            <div className={`bg-white rounded-2xl border border-[#D9E3F2] p-4 ${TOP_CARD_HEIGHT}`}>
              <div className="h-6 bg-gray-200 rounded w-40 mb-4"></div>
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="h-32 bg-[#F8FAFC] rounded-xl" />
                ))}
              </div>
            </div>

            <div className={`bg-white rounded-2xl border border-[#D9E3F2] p-4 ${TOP_CARD_HEIGHT}`}>
              <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[1, 2].map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl p-5 animate-pulse h-full min-h-[250px] bg-white border border-[#D9E3F2]"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-gray-200"></div>
                      <div className="flex-1">
                        <div className="h-5 bg-gray-200 rounded w-3/4 mb-3"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                    <div className="mt-4 rounded-xl bg-[#F8FAFC] p-4">
                      <div className="h-4 bg-gray-200 rounded w-2/3 mb-3"></div>
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <div className="h-5 w-24 rounded-full bg-[#F8FAFC]"></div>
                      <div className="h-5 w-20 rounded-full bg-[#F8FAFC]"></div>
                      <div className="h-5 w-28 rounded-full bg-[#F8FAFC]"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#D9E3F2] p-4">
            <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="rounded-[24px] p-6 animate-pulse bg-white border border-[#D9E3F2] min-h-[320px]"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-[18px] bg-gray-200" />
                    <div className="flex-1">
                      <div className="h-5 w-3/4 rounded bg-gray-200" />
                    </div>
                    <div className="w-8 h-8 rounded-full bg-gray-200" />
                  </div>

                  <div className="mt-4 h-20 rounded-[16px] bg-[#F8FAFC]" />

                  <div className="mt-6 flex items-center justify-between">
                    <div className="h-12 w-32 rounded bg-gray-200" />
                    <div className="h-8 w-8 rounded-[9px] bg-gray-200" />
                  </div>

                  <div className="mt-6 h-px w-full bg-gray-200" />

                  <div className="mt-6 flex items-center justify-between">
                    <div className="h-5 w-24 rounded bg-gray-200" />
                    <div className="h-10 w-28 rounded-full bg-[#F8FAFC]" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {forcedPasswordModal}

      <div
        className={`max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 ${
          passwordModalOpen ? 'pointer-events-none select-none blur-[1px]' : ''
        }`}
        aria-hidden={passwordModalOpen ? 'true' : 'false'}
      >
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold text-black">
              Welcome back, <span className="text-[#2e66a6]">{userData.name.split(' ')[0]}</span>
            </h1>
            <p className="text-gray-600 mt-1">Here's your job search overview for today</p>
          </div>

          {showProfileReminderBanner && !userData.profileComplete ? (
            <div className="w-full lg:w-auto lg:min-w-[560px] lg:max-w-[640px]">
              <div className="relative flex items-center justify-between gap-4 rounded-[28px] border border-[#D9E3F2] bg-white px-5 py-4 shadow-sm">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center">
                    <img
                      src={PROFILE_REMINDER_ICON}
                      alt="Reminder"
                      className="h-8 w-8 object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>

                  <div className="min-w-0">
                    <p className="text-[14px] leading-5 text-black">
                      <span className="font-semibold">Reminder:</span> Update your profile to increase your chances of being hired.
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <button
                    type="button"
                    onClick={() => navigate('/jobseeker/my-profile')}
                    className="inline-flex h-10 items-center justify-center rounded-[10px] bg-[#2e66a6] px-4 text-[12px] font-bold uppercase tracking-[0.03em] text-white transition hover:bg-[#245387]"
                  >
                    Go to Profile
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowProfileReminderBanner(false)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition hover:bg-white hover:text-black"
                    aria-label="Dismiss reminder"
                  >
                    <FontAwesomeIcon icon={faTimes} className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 xl:gap-8 mb-8">
          {/* RECENT APPLICATIONS */}
          <div className={`bg-white rounded-3xl shadow-sm border border-[#D9E3F2] overflow-hidden transition-all duration-300 hover:shadow-lg flex flex-col ${TOP_CARD_HEIGHT}`}>
            <div className="px-6 py-5 border-b border-[#D9E3F2] flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-lg font-bold text-black">Recent Application</h3>
              </div>
              <Link
                to="/jobseeker/my-applications"
                className="text-sm font-medium text-[#2e66a6] hover:text-[#245387] transition-colors flex items-center gap-1"
              >
                View all
                <svg className="w-4 h-4 transition-transform duration-300 hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            <div className="flex-1">
              {applications.length > 0 ? (
                <div className="divide-y divide-gray-50">
                  {applications.slice(0, 2).map((app) => {
                    const effectiveStatus = getEffectiveApplicationStatus(app);
                    const status = getStatusConfig(effectiveStatus);
                    const logoUrl = getCompanyLogo(app);
                    const companyName = app.job?.companyName || app.employer?.employerProfile?.companyName || 'Company';
                    const companyInitials = getCompanyInitials(companyName);

                    return (
                      <div
                        key={app._id}
                        className="px-6 py-5 transition-all duration-300 ease-out hover:bg-gray-50/80 group cursor-pointer active:bg-[#F8FAFC]"
                        onClick={() => navigate('/jobseeker/my-applications')}
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0">
                            <div className="w-14 h-14 rounded-xl overflow-hidden border border-[#D9E3F2] bg-white shadow-xs transition-all duration-300 group-hover:shadow-sm group-hover:border-[#D9E3F2]">
                              {logoUrl ? (
                                <img
                                  src={logoUrl}
                                  alt={companyName}
                                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                    const fallbackDiv = document.createElement('div');
                                    fallbackDiv.className =
                                      'w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200';
                                    fallbackDiv.innerHTML = `<span class="font-bold text-lg text-black">${companyInitials}</span>`;
                                    e.target.parentElement.appendChild(fallbackDiv);
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                                  <span className="font-bold text-lg text-black">{companyInitials}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                              <div className="min-w-0">
                                <h4 className="font-semibold text-black text-base leading-snug mb-1 line-clamp-1">
                                  {app.job?.title}
                                </h4>
                                <p className="text-sm text-gray-600 line-clamp-1">{companyName}</p>
                              </div>
                              <div className="flex-shrink-0">
                                <span
                                  className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium ${status.bg} ${status.text} border ${status.border}`}
                                >
                                  <FontAwesomeIcon icon={status.icon} className="w-3 h-3 mr-1.5" />
                                  {status.label}
                                </span>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-4 text-sm mb-4 min-w-0">
                              {app.job?.location && (
                                <div className="flex items-center gap-2 text-gray-600 min-w-0 w-full max-w-full">
                                  <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center text-gray-400">
                                    <FontAwesomeIcon icon={faMapMarkerAlt} className="w-3.5 h-3.5 flex-shrink-0" />
                                  </div>
                                  <span className="leading-none block min-w-0 max-w-full truncate">{formatLocationDisplay(app.job.location)}</span>
                                </div>
                              )}

                              {getRecentApplicationJobSummary(app.job) && (
                                <div className="flex min-w-0 items-center gap-2">
                                  <span className="ml-1 block min-w-0 truncate font-semibold leading-none text-[#2e66a6]">
                                    {getRecentApplicationJobSummary(app.job)}
                                  </span>
                                </div>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-3 text-sm pt-3 border-t border-[#D9E3F2]">
                              <div className="flex items-center gap-2 text-gray-500">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={1.5}
                                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                  />
                                </svg>
                                <span>Applied {formatDate(app.appliedAt)}</span>
                              </div>

                              {getEffectiveApplicationStatus(app) === 'for interview' && app.interviewDate && (
                                <div className="flex items-center gap-2 text-[#2D9CDB] font-medium">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={1.5}
                                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                    />
                                  </svg>
                                  <span>Interview {formatDate(app.interviewDate)}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex-shrink-0 ml-2">
                            <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-full px-8 py-12 text-center flex flex-col items-center justify-center">
                  <p className="text-sm text-gray-500">No applications yet</p>

                  <button
                    type="button"
                    className="mt-5 inline-flex items-center justify-center px-5 py-2 rounded-lg bg-[#2e66a6] text-white text-sm font-semibold hover:bg-[#245387] transition-colors"
                    onClick={() => navigate('/jobseeker/job-search')}
                  >
                    Apply now
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* JOB OFFERS */}
          <div className={`bg-white rounded-3xl shadow-sm border border-[#D9E3F2] overflow-hidden transition-all duration-300 hover:shadow-lg flex flex-col ${TOP_CARD_HEIGHT}`}>
            <div className="px-6 py-5 border-b border-[#D9E3F2] flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-lg font-bold text-black">Job Offers</h3>
              </div>
              <button
                type="button"
                onClick={() => navigate('/jobseeker/job-search')}
                className="text-sm font-medium text-[#2e66a6] hover:text-[#245387] transition-colors"
              >
                Explore more
              </button>
            </div>

            <div className="flex-1 px-6 py-2">
              {jobOffersLoading ? (
                <div className="h-full divide-y divide-[#D9E3F2]">
                  {[1, 2].map((item) => (
                    <div
                      key={item}
                      className="flex min-h-[160px] animate-pulse items-center gap-4 py-4"
                    >
                      <div className="h-20 w-20 shrink-0 rounded-2xl bg-gray-200" />

                      <div className="min-w-0 flex-1">
                        <div className="h-5 w-3/5 rounded bg-gray-200" />
                        <div className="mt-3 h-4 w-2/5 rounded bg-gray-200" />
                        <div className="mt-4 h-4 w-4/5 rounded bg-gray-200" />
                        <div className="mt-3 h-4 w-3/5 rounded bg-gray-200" />
                        <div className="mt-4 flex gap-2">
                          <div className="h-6 w-24 rounded-full bg-gray-200" />
                          <div className="h-6 w-20 rounded-full bg-gray-200" />
                        </div>
                      </div>

                      <div className="hidden h-10 w-28 rounded-xl bg-gray-200 sm:block" />
                    </div>
                  ))}
                </div>
              ) : jobOffers.length === 0 ? (
                <div className="h-full flex items-center justify-center text-center">
                  <p className="text-sm text-gray-500">No job offers available right now</p>
                </div>
              ) : (
                <div className="h-full divide-y divide-[#D9E3F2]">
                  {jobOffers.map((job) => {
                    const jobId = job._id || job.id;
                    const logoUrl = resolveLogoUrl(job.companyLogo);
                    const companyInitials = getCompanyInitials(job.companyName || 'Company');
                    const tags = getJobOfferTags(job);
                    const verified = isCompanyVerified(job) || job?.companyVerified == null;

                    return (
                      <div
                        key={jobId}
                        className="group flex min-h-[160px] cursor-pointer items-center gap-4 py-4 transition-colors hover:bg-[#F8FAFC] sm:gap-5 sm:px-1"
                        onClick={() => handleViewJobDetails(job)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            handleViewJobDetails(job);
                          }
                        }}
                      >
                        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-[#D9E3F2] bg-white sm:h-24 sm:w-24">
                          {logoUrl ? (
                            <img
                              src={logoUrl}
                              alt={job.companyName || 'Company logo'}
                              className="h-full w-full object-cover"
                              onError={(event) => {
                                event.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-[#F8FAFC]">
                              <span className="text-xl font-bold text-[#2e66a6]">
                                {companyInitials}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h3 className="truncate text-base font-bold leading-snug text-black sm:text-lg">
                                {String(job.title || 'Job Title').replaceAll('"', '')}
                              </h3>

                              <div className="mt-1 flex min-w-0 items-center gap-2">
                                <span className="truncate text-sm font-medium text-gray-600">
                                  {job.companyName || 'Company'}
                                </span>

                                {verified && (
                                  <span
                                    className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                                    title="Verified"
                                    aria-label="Verified company"
                                  >
                                    <img
                                      src="/images/checkmo.png"
                                      alt="Verified"
                                      className="h-5 w-5 object-contain"
                                      draggable="false"
                                    />
                                  </span>
                                )}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                navigate('/jobseeker/bookmarks');
                              }}
                              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#D9E3F2] bg-white text-[#2e66a6] transition hover:bg-[#EAF2FB]"
                              title="Open saved jobs"
                              aria-label="Open saved jobs"
                            >
                              <svg
                                className="h-5 w-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="1.8"
                                  d="M6 4.75A1.75 1.75 0 017.75 3h8.5A1.75 1.75 0 0118 4.75V21l-6-3.5L6 21V4.75z"
                                />
                              </svg>
                            </button>
                          </div>

                          <div className="mt-3 space-y-2 text-sm text-black">
                            <div className="flex min-w-0 items-center gap-2">
                              <svg
                                className="h-4 w-4 shrink-0 text-gray-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                              </svg>
                              <span className="truncate">
                                {formatLocationDisplay(job.location)}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="flex h-4 w-4 shrink-0 items-center justify-center text-sm font-extrabold text-gray-600">
                                ₱
                              </span>
                              <span className="truncate">
                                {formatSalary(job.salaryMin, job.salaryMax)}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <svg
                                className="h-4 w-4 shrink-0 text-gray-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                />
                              </svg>
                              <span className="truncate">
                                {job.jobType || 'Full Time Work'}
                              </span>
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            {tags.length > 0
                              ? tags.map((tag, index) => (
                                  <span
                                    key={`${jobId}-tag-${index}`}
                                    className={`rounded-full px-2.5 py-1 text-[10px] font-semibold whitespace-nowrap ${tag.className}`}
                                  >
                                    {tag.label}
                                  </span>
                                ))
                              : null}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleViewJobDetails(job);
                          }}
                          className="hidden shrink-0 items-center gap-3 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-semibold text-[#2e66a6] transition hover:bg-[#EAF2FB] sm:inline-flex"
                        >
                          View Details
                          <svg
                            className="h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* COMPANIES */}
        <div className="bg-white rounded-3xl shadow-sm border border-[#D9E3F2] overflow-visible transition-all duration-300 hover:shadow-lg flex flex-col">
          <div className="px-6 py-5 border-b border-[#D9E3F2] flex items-center justify-between shrink-0">
            <div>
              <h3 className="text-lg font-bold text-black">Companies</h3>
            </div>
            <Link
              to="/jobseeker/companies"
              className="text-sm font-medium text-[#2e66a6] hover:text-[#245387] transition-colors flex items-center gap-1"
            >
              View more
              <svg className="w-4 h-4 transition-transform duration-300 hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          <div className="p-5 overflow-visible">
            {companiesLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="rounded-[24px] p-6 animate-pulse bg-white border border-[#D9E3F2] min-h-[320px]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-[18px] bg-gray-200" />
                      <div className="flex-1">
                        <div className="h-5 w-3/4 rounded bg-gray-200" />
                      </div>
                      <div className="w-8 h-8 rounded-full bg-gray-200" />
                    </div>

                    <div className="mt-4 h-20 rounded-[16px] bg-[#F8FAFC]" />

                    <div className="mt-6 flex items-center justify-between">
                      <div className="h-12 w-32 rounded bg-gray-200" />
                      <div className="h-8 w-8 rounded-[9px] bg-gray-200" />
                    </div>

                    <div className="mt-6 h-px w-full bg-gray-200" />

                    <div className="mt-6 flex items-center justify-between">
                      <div className="h-5 w-24 rounded bg-gray-200" />
                      <div className="h-10 w-28 rounded-full bg-[#F8FAFC]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : companies.length === 0 ? (
              <div className="px-8 py-12 text-center h-full flex items-center justify-center">
                <p className="text-sm text-gray-500">No companies available</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
                {companies.map((c) => {
                  const logoUrl = resolveLogoUrl(c.companyLogo);
                  const employerId = c?._id || c?.id;
                  const jobCount = employerId ? Number(jobCountByEmployerId?.[employerId] || 0) : 0;
                  const averageRating = Number(c?.rating) || 0;
                  const reviewCount = Number(c?.reviewCount) || 0;
                  const isExpanded = expandedCompanyCardId === employerId;
                  const breakdownRows = getBreakdownRows(c);

                  return (
                    <div
                      key={c._id}
                      className="rounded-[24px] bg-white border shadow-sm hover:shadow-lg transition flex flex-col px-6 pt-6 pb-7 cursor-pointer min-h-[320px] h-auto"
                      style={{ borderColor: '#E5E7EB' }}
                      onClick={() => handleViewCompanyDetails(c)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleViewCompanyDetails(c);
                        }
                      }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-12 h-12 rounded-[14px] overflow-hidden border border-[#E5E7EB] bg-[#F8FAFC] shrink-0">
                            {logoUrl ? (
                              <img
                                src={logoUrl}
                                alt={c.companyName || 'Company logo'}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className="w-full h-full bg-gray-200" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <h3 className="text-[19px] leading-[1.2] font-semibold text-black truncate">
                              {c.companyName || 'Company'}
                            </h3>
                          </div>
                        </div>

                        <span
                          className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white shrink-0"
                          title="Verified"
                          aria-label="Verified company"
                        >
                          <img
                            src="/images/checkmo.png"
                            alt="Verified"
                            className="w-7 h-7 object-contain"
                            draggable="false"
                          />
                        </span>
                      </div>

                      <div className="mt-4 rounded-[16px] px-4 py-4 bg-[#F8FAFC]">
                        <div className="flex items-center gap-2 text-[13px] text-black leading-none">
                          <svg
                            className="w-[16px] h-[16px] text-black shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="1.9"
                              d="M3 21h18M5 21V7l7-4v18M19 21V11l-6-4M9 9h.01M9 13h.01M9 17h.01M15 13h.01M15 17h.01"
                            />
                          </svg>
                          <span className="font-semibold">Industry:</span>
                          <span className="truncate" title={c.industry || 'Industry'}>
                            {shortenIndustry(c.industry, 22)}
                          </span>
                        </div>

                        <div className="mt-3 flex items-center gap-2 text-[13px] text-black leading-none">
                          <svg
                            className="w-[16px] h-[16px] text-black shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="1.9"
                              d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z"
                            />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="font-semibold">Location:</span>
                          <span className="truncate">{formatCompanyLocation(c.location)}</span>
                        </div>
                      </div>

                      {/* RATING SECTION - laging visible */}
                      <div className="mt-6 flex items-center justify-between gap-3 shrink-0">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="text-[22px] leading-none font-semibold text-black shrink-0">
                            {formatRatingValue(averageRating)}
                          </div>

                          <div className="w-px h-[46px] bg-[#D6D6D6] shrink-0" />

                          <div className="min-w-0">
                            <StarRating rating={averageRating} size="w-[15px] h-[15px]" />
                            <p className="mt-2 text-[12px] leading-none text-black whitespace-nowrap">
                              {formatReviewText(averageRating, reviewCount)}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleCompanyBreakdown(employerId);
                          }}
                          className="w-[30px] h-[30px] rounded-[9px] border border-[#CFCFCF] flex items-center justify-center shrink-0 bg-white"
                          aria-label={isExpanded ? 'Hide rating breakdown' : 'Show rating breakdown'}
                          aria-expanded={isExpanded}
                        >
                          <svg
                            className={`w-[16px] h-[16px] text-[#999999] transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 10l5 5 5-5" />
                          </svg>
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="mt-5 pt-4 border-t border-[#E8E8E8]">
                          <div className="space-y-[8px]">
                            {breakdownRows.map((row) => (
                              <div
                                key={row.star}
                                className="flex items-center gap-[10px]"
                                aria-label={`${row.star}.0 stars, ${row.count} ${row.count === 1 ? 'review' : 'reviews'}`}
                              >
                                <div className="w-[30px] shrink-0 text-[12px] font-medium text-black/70">
                                  {row.star}.0
                                </div>

                                <div className="h-[10px] flex-1 overflow-hidden rounded-full bg-[#EFEFEF]">
                                  <div
                                    className="h-full rounded-full bg-[#2e66a6] transition-all duration-300"
                                    style={{ width: `${row.percent}%` }}
                                  />
                                </div>

                                <div
                                  className="w-[28px] shrink-0 text-right text-[12px] font-semibold text-black/70"
                                  title={`${row.count} ${row.count === 1 ? 'review' : 'reviews'}`}
                                >
                                  {row.count}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="mt-5 pt-5 border-t border-transparent flex items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewCompanyDetails(c);
                          }}
                          className="text-[15px] font-medium text-[#4B5563] inline-flex items-center gap-2 leading-none transition hover:text-black"
                        >
                          <span className="leading-none">View Details</span>
                          <svg
                            className="w-[18px] h-[18px] shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                          </svg>
                        </button>

                        <span className="px-4 h-[38px] rounded-full text-[12px] font-medium bg-[#EAF2FB] text-[#2e66a6] border border-[#BFD4EA] whitespace-nowrap inline-flex items-center">
                          {jobCount} New Job Offer{jobCount === 1 ? '' : 's'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default JobSeekerDashboard;