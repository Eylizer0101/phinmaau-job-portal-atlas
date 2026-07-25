const fs = require('fs');
const path = require('path');
const Application = require('../models/Application');
const Job = require('../models/Job');
const User = require('../models/User');
const Message = require('../models/Message');
const notificationController = require('./notificationController');
const { createCalendarEvent } = require('../config/googleCalendar');

const ACTIVE_APPLICATION_STATUSES = ['pending', 'for interview', 'hired'];
const INACTIVE_APPLICATION_STATUSES = ['declined', 'withdrawn', 'cancelled', 'vacancy full'];
const VALID_APPLICATION_STATUSES = ['pending', 'for interview', 'hired', 'declined', 'withdrawn', 'cancelled', 'vacancy full'];
const VALID_DECLINE_REASONS = [
  'Did not meet minimum qualifications',
  'Insufficient relevant experience',
  'Skills not aligned with job requirements',
  'Incomplete application information',
  'Unavailable for required work schedule',
  'Does not meet screening criteria',
  'Interview performance did not meet expectations',
  'Skills assessment below required level',
  'Communication skills need improvement',
  'Schedule or availability conflict',
  'Position requirements not fully met',
  'Failed to attend scheduled interview'
];

const VALID_DECLINED_FROM = ['applicants', 'forInterview'];
const DEFAULT_HIRING_STAGES = ['Initial Interview', 'Assessment', 'Final Interview', 'Job Offer'];

const normalizeHiringStage = (value) => String(value || '').replace(/\s+/g, ' ').trim().slice(0, 80);
const sameHiringStage = (first, second) =>
  normalizeHiringStage(first).toLowerCase() === normalizeHiringStage(second).toLowerCase();

const escapeRegExp = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildExactHiringStageRegex = (value) => {
  const normalized = normalizeHiringStage(value);
  if (!normalized) return null;
  const pattern = normalized
    .split(' ')
    .map((part) => escapeRegExp(part))
    .join('\\s+');
  return new RegExp(`^\\s*${pattern}\\s*$`, 'i');
};

const getEmployerCustomHiringStages = async (employerId) => {
  const stages = await Application.distinct('customHiringStages', { employer: employerId });
  return [...new Set((stages || []).map(normalizeHiringStage).filter(Boolean))]
    .filter((stage) => !DEFAULT_HIRING_STAGES.some((defaultStage) => sameHiringStage(defaultStage, stage)))
    .sort((a, b) => a.localeCompare(b));
};

const getEmployerHiddenDefaultHiringStages = async (employerId) => {
  const stages = await Application.distinct('hiddenDefaultHiringStages', { employer: employerId });
  return [...new Set((stages || []).map(normalizeHiringStage).filter(Boolean))]
    .map((stage) => DEFAULT_HIRING_STAGES.find((defaultStage) => sameHiringStage(defaultStage, stage)))
    .filter(Boolean);
};

const getEmployerAvailableDefaultHiringStages = async (employerId) => {
  const hiddenStages = await getEmployerHiddenDefaultHiringStages(employerId);
  return DEFAULT_HIRING_STAGES.filter(
    (defaultStage) => !hiddenStages.some((hiddenStage) => sameHiringStage(hiddenStage, defaultStage))
  );
};

const attachEmploymentStatus = async (applications = []) => {
  const list = Array.isArray(applications) ? applications : [applications];
  const jobseekerIds = [
    ...new Set(
      list
        .map((application) => String(application?.jobseeker?._id || application?.jobseeker || ''))
        .filter(Boolean)
    ),
  ];

  if (!jobseekerIds.length) {
    return list.map((application) => {
      const plain = application?.toObject ? application.toObject() : application;
      return { ...plain, alreadyEmployed: false, employedApplication: null };
    });
  }

  const hiredApplications = await Application.find({
    jobseeker: { $in: jobseekerIds },
    status: 'hired',
  })
    .populate({
      path: 'job',
      select: 'title companyName employer',
    })
    .select('_id job jobseeker employer status hiredAt reviewedAt updatedAt')
    .sort({ reviewedAt: -1, updatedAt: -1 })
    .lean();

  const hiredByJobseeker = new Map();

  hiredApplications.forEach((hiredApplication) => {
    const key = String(hiredApplication.jobseeker || '');
    if (!key) return;
    if (!hiredByJobseeker.has(key)) hiredByJobseeker.set(key, []);
    hiredByJobseeker.get(key).push(hiredApplication);
  });

  return list.map((application) => {
    const plain = application?.toObject ? application.toObject() : application;
    const jobseekerId = String(plain?.jobseeker?._id || plain?.jobseeker || '');
    const currentApplicationId = String(plain?._id || '');
    const currentJobId = String(plain?.job?._id || plain?.job || '');

    const otherHiredApplication = (hiredByJobseeker.get(jobseekerId) || []).find((hiredApplication) => {
      const hiredApplicationId = String(hiredApplication?._id || '');
      const hiredJobId = String(hiredApplication?.job?._id || hiredApplication?.job || '');

      return (
        hiredApplicationId !== currentApplicationId &&
        hiredJobId !== currentJobId
      );
    });

    return {
      ...plain,
      alreadyEmployed: Boolean(otherHiredApplication),
      employedApplication: otherHiredApplication
        ? {
            applicationId: otherHiredApplication._id,
            jobId: otherHiredApplication.job?._id || otherHiredApplication.job || null,
            jobTitle: otherHiredApplication.job?.title || '',
            companyName: otherHiredApplication.job?.companyName || '',
            employerId: otherHiredApplication.employer || otherHiredApplication.job?.employer || null,
          }
        : null,
    };
  });
};


const buildConversationId = (userA, userB) => {
  return [userA.toString(), userB.toString()].sort().join('_');
};

const buildUserDisplayName = (u, fallback = 'User') => {
  if (!u) return fallback;
  const full = String(u.fullName || '').trim();
  if (full) return full;

  const parts = [u.firstName, u.middleName, u.lastName]
    .map((p) => String(p || '').trim())
    .filter(Boolean);

  if (parts.length) return parts.join(' ');
  return String(u.email || '').trim() || fallback;
};

const formatInterviewDateLabel = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'TBS';
  return d.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const formatInterviewTimeLabel = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-PH', {
    hour: 'numeric',
    minute: '2-digit',
  });
};

const escapePdfText = (value) => String(value || '')
  .replace(/\\/g, '\\\\')
  .replace(/\(/g, '\\(')
  .replace(/\)/g, '\\)');

const sanitizeFilename = (value, fallback = 'Applicant_CV') => {
  const clean = String(value || fallback)
    .replace(/[^a-z0-9\s-_]/gi, '')
    .trim()
    .replace(/\s+/g, '_');

  return clean || fallback;
};

const formatResumeDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value || '');
  return date.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
};

const wrapPdfLine = (text, maxLength = 92) => {
  const raw = String(text || '').replace(/\s+/g, ' ').trim();
  if (!raw) return [''];

  const words = raw.split(' ');
  const lines = [];
  let current = '';

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxLength && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  });

  if (current) lines.push(current);
  return lines;
};

const createPdfBufferFromLines = (lines = []) => {
  const pages = [];
  let currentLines = [];
  const maxLinesPerPage = 48;

  lines.forEach((line) => {
    const wrapped = wrapPdfLine(line);
    wrapped.forEach((wrappedLine) => {
      if (currentLines.length >= maxLinesPerPage) {
        pages.push(currentLines);
        currentLines = [];
      }
      currentLines.push(wrappedLine);
    });
  });

  if (currentLines.length) pages.push(currentLines);
  if (!pages.length) pages.push(['No resume data available.']);

  const objects = [];
  const addObject = (body) => {
    objects.push(body);
    return objects.length;
  };

  const catalogId = addObject('<< /Type /Catalog /Pages 2 0 R >>');
  const pagesId = addObject('__PAGES__');
  const fontId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');

  const pageIds = [];

  pages.forEach((pageLines) => {
    let y = 790;
    const streamParts = [];

    pageLines.forEach((line) => {
      const fontSize = line.startsWith('## ') ? 14 : line.startsWith('# ') ? 18 : 10;
      const cleanLine = line.replace(/^##\s*/, '').replace(/^#\s*/, '');
      streamParts.push(`BT /F1 ${fontSize} Tf 50 ${y} Td (${escapePdfText(cleanLine)}) Tj ET`);
      y -= line.startsWith('# ') ? 28 : line.startsWith('## ') ? 22 : 16;
    });

    const stream = streamParts.join('\n');
    const contentId = addObject(`<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}\nendstream`);
    const pageId = addObject(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`);
    pageIds.push(pageId);
  });

  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;

  let pdf = '%PDF-1.4\n';
  const offsets = [0];

  objects.forEach((body, index) => {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';

  for (let i = 1; i <= objects.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, 'utf8');
};

const buildProfileResumeLines = (jobseeker = {}) => {
  const profile = jobseeker.jobSeekerProfile || {};
  const fullName = [
    jobseeker.firstName,
    jobseeker.middleName,
    jobseeker.lastName,
    jobseeker.extensionName
  ].map((part) => String(part || '').trim()).filter(Boolean).join(' ') || jobseeker.fullName || 'Applicant';

  const listFromString = (value) => String(value || '')
    .split(/[\n,•]+/g)
    .map((item) => item.trim())
    .filter(Boolean);

  const profileList = (items = []) => Array.isArray(items) ? items : [];

  const lines = [
    `# ${fullName}`,
    jobseeker.email ? `Email: ${jobseeker.email}` : '',
    profile.phoneNumber ? `Phone: ${profile.phoneNumber}` : '',
    profile.address ? `Address: ${profile.address}` : '',
    profile.course ? `Course: ${profile.course}` : '',
    profile.campus ? `Campus: ${profile.campus}` : '',
    profile.yearGraduated ? `Class of: ${profile.yearGraduated}` : '',
    ''
  ].filter((line) => line !== '');

  if (profile.aboutMe) {
    lines.push('## About Me', profile.aboutMe, '');
  }

  const educationEntries = Array.isArray(profile.educationEntries) && profile.educationEntries.length
    ? profile.educationEntries
    : [
        {
          level: profile.educationalAttainment || 'Education',
          campus: profile.campus,
          course: profile.course,
          studyField: profile.studyField,
          endYear: profile.yearGraduated
        }
      ].filter((item) => item.campus || item.course || item.studyField || item.endYear);

  if (educationEntries.length) {
    lines.push('## Educational Background');
    educationEntries.forEach((edu) => {
      const title = edu.course || edu.level || edu.educationalAttainment || 'Education';
      const school = edu.campus || edu.studyField || '';
      const years = [edu.startYear, edu.endYear || edu.yearGraduated].filter(Boolean).join(' - ');
      lines.push(`- ${title}${school ? `, ${school}` : ''}${years ? ` (${years})` : ''}`);
    });
    lines.push('');
  }

  if (profile.workExperiences?.length) {
    lines.push('## Work Experience');
    profile.workExperiences.forEach((item) => {
      const start = formatResumeDate(item.startDate);
      const end = item.isPresent ? 'Present' : formatResumeDate(item.endDate);
      lines.push(`- ${item.positionTitle || 'Work Experience'}${item.companyName ? `, ${item.companyName}` : ''}${start || end ? ` (${[start, end].filter(Boolean).join(' - ')})` : ''}`);
      if (item.description) lines.push(`  ${item.description}`);
    });
    lines.push('');
  }

  const technicalSkills = listFromString(profile.technicalSkills);
  const softSkills = listFromString(profile.softSkills);

  if (technicalSkills.length || softSkills.length) {
    lines.push('## Skills');
    if (technicalSkills.length) lines.push(`Technical Skills: ${technicalSkills.join(', ')}`);
    if (softSkills.length) lines.push(`Soft Skills: ${softSkills.join(', ')}`);
    lines.push('');
  }

  const moreSections = [
    ['Projects', profileList(profile.projects)],
    ['Certifications', profileList(profile.certifications)],
    ['Seminars and Trainings', profileList(profile.seminars)],
    ['Awards and Achievements', profileList(profile.awards)],
    ['Affiliations', profileList(profile.affiliations)],
    ['Co-curricular Activities', profileList(profile.cocurricular)],
  ];

  moreSections.forEach(([title, items]) => {
    if (!items.length) return;
    lines.push(`## ${title}`);
    items.forEach((item) => {
      const entryTitle = item.title || item.organization || item.name || 'Untitled';
      const subtitle = item.issuer || item.organization || item.role || '';
      const date = item.date || [item.startDate, item.endDate].filter(Boolean).join(' - ');
      lines.push(`- ${entryTitle}${subtitle ? `, ${subtitle}` : ''}${date ? ` (${date})` : ''}`);
      if (item.description) lines.push(`  ${item.description}`);
    });
    lines.push('');
  });

  return { lines, fullName };
};


// ✅ NEW HELPER: build location from employer profile (supports old + new fields)
const buildCompanyLocation = (employerProfile) => {
  const regionCity = String(employerProfile?.regionCity || '').trim();
  const country = String(employerProfile?.country || '').trim();
  const companyAddress = String(employerProfile?.companyAddress || '').trim();

  const parts = [];
  if (regionCity) parts.push(regionCity);
  if (country) parts.push(country);

  const combined = parts.join(', ').trim();
  if (combined) return combined;

  return companyAddress || 'Not specified';
};

// ✅ NEW HELPER: active vs archived declined query
const buildDeclinedQuery = (employerId, jobId, isArchived) => {
  const query = {
    employer: employerId,
    status: 'declined',
  };

  if (isArchived) {
    query.isDeclinedArchived = true;
  } else {
    query.$or = [
      { isDeclinedArchived: false },
      { isDeclinedArchived: { $exists: false } },
      { isDeclinedArchived: null },
    ];
  }

  if (jobId) {
    query.job = jobId;
  }

  return query;
};

// ✅ NEW HELPER: counts for declined tabs

const normalizeJobStatus = (status) => String(status || '').toLowerCase().trim();

const isJobVacancyFull = async (job) => {
  if (!job) return true;

  if (normalizeJobStatus(job.status) === 'filled') return true;

  const vacancyLimit = Number(job.vacancies || 0);
  if (!Number.isFinite(vacancyLimit) || vacancyLimit < 1) return false;

  const hiredCount = await Application.countDocuments({
    job: job._id,
    status: 'hired'
  });

  return hiredCount >= vacancyLimit;
};

const closeJobWhenVacancyIsFull = async (jobId) => {
  const job = await Job.findById(jobId);
  if (!job) return { isFull: false, hiredCount: 0, vacancyLimit: 0, affectedPendingCount: 0 };

  const vacancyLimit = Number(job.vacancies || 0);
  if (!Number.isFinite(vacancyLimit) || vacancyLimit < 1) {
    return { isFull: false, hiredCount: 0, vacancyLimit: 0, affectedPendingCount: 0, job };
  }

  const hiredCount = await Application.countDocuments({
    job: job._id,
    status: 'hired'
  });

  if (hiredCount < vacancyLimit) {
    return { isFull: false, hiredCount, vacancyLimit, affectedPendingCount: 0, job };
  }

  const pendingApplications = await Application.find({
    job: job._id,
    status: 'pending'
  }).select('_id job jobseeker employer status lastActiveStatus');

  if (pendingApplications.length) {
    await Application.updateMany(
      { _id: { $in: pendingApplications.map((app) => app._id) } },
      {
        $set: {
          status: 'vacancy full',
          reviewedAt: new Date(),
          notes: 'The vacancy is already full.',
          isDeclinedArchived: false,
          declinedArchivedAt: null,
          declinedFrom: '',
          declineReason: '',
          declineComment: ''
        }
      }
    );

    await Promise.allSettled(
      pendingApplications.map((app) =>
        notificationController.createVacancyFullNotification(app, job)
      )
    );
  }

  job.status = 'filled';
  job.isActive = false;
  job.isPublished = true;
  job.filledAt = job.filledAt || new Date();
  job.filledReason = 'Vacancy is already full';
  await job.save();

  return {
    isFull: true,
    hiredCount,
    vacancyLimit,
    affectedPendingCount: pendingApplications.length,
    job
  };
};

const getDeclinedCounts = async (employerId, jobId) => {
  const base = {
    employer: employerId,
    status: 'declined',
  };

  if (jobId) {
    base.job = jobId;
  }

  const [activeCount, archivedCount] = await Promise.all([
    Application.countDocuments({
      ...base,
      $or: [
        { isDeclinedArchived: false },
        { isDeclinedArchived: { $exists: false } },
        { isDeclinedArchived: null },
      ],
    }),
    Application.countDocuments({
      ...base,
      isDeclinedArchived: true,
    }),
  ]);

  return { activeCount, archivedCount };
};

// ✅ NEW HELPER: delete uploaded file if needed
const safeDeleteFile = (filePath) => {
  try {
    if (!filePath) return;
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.error('Error deleting uploaded file:', err);
  }
};

// ✅ UPDATED: applyForJob with verification check and AUTO-FETCH resume from Profile Credentials
exports.applyForJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { coverLetter } = req.body;

    if (req.user.role !== 'jobseeker') {
      return res.status(403).json({
        success: false,
        message: 'Only jobseekers can apply for jobs'
      });
    }

    const jobseeker = await User.findById(req.user._id);
    if (!jobseeker) {
      return res.status(404).json({
        success: false,
        message: 'Jobseeker not found'
      });
    }

    const verificationStatus = jobseeker.jobSeekerProfile?.verificationStatus || 'not_submitted';

    if (verificationStatus !== 'verified') {
      return res.status(403).json({
        success: false,
        message: 'Your account is not verified. Please wait for admin approval before applying for jobs.'
      });
    }

    const profileCv = jobseeker.jobSeekerProfile?.verificationDocs?.cv;

    if (!profileCv?.url) {
      return res.status(400).json({
        success: false,
        message: 'Please upload your CV/Resume in your Profile Credentials first.'
      });
    }

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    if (normalizeJobStatus(job.status) === 'filled') {
      return res.status(400).json({ success: false, message: 'The vacancy is already full.' });
    }

    if (!job.isActive || !job.isPublished) {
      return res.status(400).json({ success: false, message: 'This job is no longer accepting applications' });
    }

    if (await isJobVacancyFull(job)) {
      await closeJobWhenVacancyIsFull(job._id);
      return res.status(400).json({ success: false, message: 'The vacancy is already full.' });
    }

    if (job.applicationDeadline && new Date(job.applicationDeadline) < new Date()) {
      return res.status(400).json({ success: false, message: 'Application deadline has passed' });
    }

    const existingApplication = await Application.findOne({
      job: jobId,
      jobseeker: req.user._id
    });

    if (existingApplication) {
      return res.status(400).json({ success: false, message: 'You have already applied for this job' });
    }

    const storedFilename = profileCv?.url
      ? String(profileCv.url).split('/').pop()
      : '';

    const application = new Application({
      job: jobId,
      jobseeker: req.user._id,
      employer: job.employer,
      coverLetter: coverLetter || '',
      status: 'pending',
      lastActiveStatus: 'pending',

      // ✅ NEW: unread by employer on submit
      isViewedByEmployer: false,
      viewedAt: null,

      // ✅ AUTO-COPY resume metadata from Profile > Credentials > CV
      appliedResume: {
        url: profileCv.url || '',
        filename: profileCv.filename || storedFilename || 'resume',
        storedFilename: storedFilename || '',
        mimeType: profileCv.mimeType || '',
        fileSize: Number(profileCv.fileSize || 0),
        uploadedAt: profileCv.uploadedAt || new Date(),
      },
      activityHistory: [{
        type: 'submitted',
        title: 'Application received',
        description: `${buildUserDisplayName(jobseeker, 'Applicant')} applied for ${job.title || 'this position'}.`,
        fromStatus: '',
        toStatus: 'pending',
        occurredAt: new Date(),
        performedBy: req.user._id
      }]
    });

    await application.save();

    await Job.updateOne(
      { _id: jobId },
      {
        $push: { applications: application._id },
        $inc: { applicationCount: 1 }
      }
    );

    try {
      await notificationController.createEmployerNewApplicationNotification(
        job.employer,
        application,
        jobseeker,
        job
      );
    } catch (notifErr) {
      console.error('Error creating employer notification:', notifErr);
    }

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully!',
      application
    });

  } catch (error) {
    console.error('Error applying for job:', error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'You have already applied for this job'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while applying',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// GET JOBSEEKER'S APPLICATIONS
exports.getJobseekerApplications = async (req, res) => {
  try {
    if (req.user.role !== 'jobseeker') {
      return res.status(403).json({
        message: 'Only jobseekers can view applications'
      });
    }

    const applications = await Application.find({ jobseeker: req.user._id })
      .populate({
        path: 'job',
        select: 'title companyName location jobType workMode salaryMin salaryMax applicationDeadline companyLogo'
      })
      .populate({
        path: 'jobseeker',
        select: [
          'fullName',
          'firstName',
          'middleName',
          'lastName',
          'extensionName',
          'email',
          'profileImage',
          'phoneNumber',
          'jobSeekerProfile'
        ].join(' ')
      })
      .populate({
        path: 'employer',
        select: 'fullName employerProfile.companyName employerProfile.companyLogo employerProfile.companyAddress employerProfile.country employerProfile.regionCity'
      })
      .populate({
        path: 'interviewSchedule.interviewer',
        select: 'fullName firstName middleName lastName email'
      })
      .sort({ appliedAt: -1 });

    applications.forEach((app) => {
      const loc = String(app?.job?.location || '').trim();
      if (!loc || loc === 'Not specified') {
        const fallback = buildCompanyLocation(app?.employer?.employerProfile);
        if (app.job) app.job.location = fallback;
      }
    });

    res.status(200).json({
      success: true,
      count: applications.length,
      applications
    });

  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching applications'
    });
  }
};

// ✅ IDINAGDAG: ALIAS FUNCTION PARA SA MY APPLICATIONS ROUTE
exports.getMyApplications = async (req, res) => {
  try {
    if (req.user.role !== 'jobseeker') {
      return res.status(403).json({
        message: 'Only jobseekers can view applications'
      });
    }

    const applications = await Application.find({ jobseeker: req.user._id })
      .populate({
        path: 'job',
        select: 'title companyName location jobType workMode salaryMin salaryMax applicationDeadline companyLogo'
      })
      .populate({
        path: 'jobseeker',
        select: [
          'fullName',
          'firstName',
          'middleName',
          'lastName',
          'extensionName',
          'email',
          'profileImage',
          'jobSeekerProfile'
        ].join(' ')
      })
      .populate({
        path: 'employer',
        select: 'fullName employerProfile.companyName employerProfile.companyLogo employerProfile.companyAddress employerProfile.country employerProfile.regionCity'
      })
      .populate({
        path: 'interviewSchedule.interviewer',
        select: 'fullName firstName middleName lastName email'
      })
      .sort({ appliedAt: -1 });

    applications.forEach((app) => {
      const loc = String(app?.job?.location || '').trim();
      if (!loc || loc === 'Not specified') {
        const fallback = buildCompanyLocation(app?.employer?.employerProfile);
        if (app.job) app.job.location = fallback;
      }
    });

    res.status(200).json({
      success: true,
      count: applications.length,
      applications
    });

  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching applications'
    });
  }
};

// ✅ NEW: JOBSEEKER WITHDRAW OWN APPLICATION
exports.withdrawMyApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;

    if (req.user.role !== 'jobseeker') {
      return res.status(403).json({
        success: false,
        message: 'Only jobseekers can withdraw applications'
      });
    }

    const application = await Application.findById(applicationId)
      .populate({
        path: 'job',
        select: 'title companyName location jobType salaryMin salaryMax applicationDeadline companyLogo'
      })
      .populate({
        path: 'jobseeker',
        select: [
          'fullName',
          'firstName',
          'middleName',
          'lastName',
          'extensionName',
          'email',
          'profileImage',
          'jobSeekerProfile'
        ].join(' ')
      })
      .populate({
        path: 'employer',
        select: 'fullName employerProfile.companyName employerProfile.companyLogo employerProfile.companyAddress employerProfile.country employerProfile.regionCity'
      });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    if (application.jobseeker._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to withdraw this application'
      });
    }

    const currentStatus = String(application.status || '').toLowerCase();

    if (INACTIVE_APPLICATION_STATUSES.includes(currentStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Application is already inactive'
      });
    }

    if (ACTIVE_APPLICATION_STATUSES.includes(currentStatus)) {
      application.lastActiveStatus = currentStatus;
    }

    application.status = 'withdrawn';
    await application.save();

    const loc = String(application?.job?.location || '').trim();
    if (!loc || loc === 'Not specified') {
      const fallback = buildCompanyLocation(application?.employer?.employerProfile);
      if (application.job) application.job.location = fallback;
    }

    res.status(200).json({
      success: true,
      message: 'Application withdrawn successfully',
      application
    });
  } catch (error) {
    console.error('Error withdrawing application:', error);
    res.status(500).json({
      success: false,
      message: 'Error withdrawing application'
    });
  }
};

// ✅ NEW: JOBSEEKER REACTIVATE OWN APPLICATION
exports.reactivateMyApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;

    if (req.user.role !== 'jobseeker') {
      return res.status(403).json({
        success: false,
        message: 'Only jobseekers can reactivate applications'
      });
    }

    const application = await Application.findById(applicationId)
      .populate({
        path: 'job',
        select: 'title companyName location jobType salaryMin salaryMax applicationDeadline companyLogo isActive isPublished status vacancies'
      })
      .populate({
        path: 'jobseeker',
        select: 'fullName firstName middleName lastName extensionName email profileImage jobSeekerProfile'
      })
      .populate({
        path: 'employer',
        select: 'fullName employerProfile.companyName employerProfile.companyLogo employerProfile.companyAddress employerProfile.country employerProfile.regionCity'
      });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    if (application.jobseeker._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to reactivate this application'
      });
    }

    const currentStatus = String(application.status || '').toLowerCase();

    if (!INACTIVE_APPLICATION_STATUSES.includes(currentStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Only inactive applications can be reactivated'
      });
    }

    if (!application.job || normalizeJobStatus(application.job.status) === 'filled') {
      return res.status(400).json({
        success: false,
        message: 'The vacancy is already full.'
      });
    }

    if (!application.job.isActive || !application.job.isPublished) {
      return res.status(400).json({
        success: false,
        message: 'This job is no longer accepting applications'
      });
    }

    if (await isJobVacancyFull(application.job)) {
      await closeJobWhenVacancyIsFull(application.job._id);
      return res.status(400).json({
        success: false,
        message: 'The vacancy is already full.'
      });
    }

    const restoreStatus = ACTIVE_APPLICATION_STATUSES.includes(String(application.lastActiveStatus || '').toLowerCase())
      ? String(application.lastActiveStatus).toLowerCase()
      : 'pending';

    application.status = restoreStatus;
    application.lastActiveStatus = restoreStatus;
    await application.save();

    const loc = String(application?.job?.location || '').trim();
    if (!loc || loc === 'Not specified') {
      const fallback = buildCompanyLocation(application?.employer?.employerProfile);
      if (application.job) application.job.location = fallback;
    }

    res.status(200).json({
      success: true,
      message: 'Application reactivated successfully',
      application
    });
  } catch (error) {
    console.error('Error reactivating application:', error);
    res.status(500).json({
      success: false,
      message: 'Error reactivating application'
    });
  }
};


// ✅ ADMIN: GET ALL APPLICATIONS FOR ADMIN APPLICATIONS PAGE
exports.getAdminApplications = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can view all applications'
      });
    }

    const applications = await Application.find({
      status: { $in: ['pending', 'for interview', 'hired', 'declined'] }
    })
      .populate({
        path: 'job',
        select: 'title jobTitle companyName companyLogo location jobType workMode category salaryMin salaryMax'
      })
      .populate({
        path: 'jobseeker',
        select: 'fullName firstName middleName lastName email profileImage jobSeekerProfile.campus jobSeekerProfile.course jobSeekerProfile.studyField jobSeekerProfile.educationalAttainment jobSeekerProfile.educationEntries'
      })
      .populate({
        path: 'employer',
        select: 'fullName employerProfile.companyName employerProfile.companyLogo employerProfile.companyAddress employerProfile.industry employerProfile.regionCity employerProfile.country'
      })
      .populate({
        path: 'interviewSchedule.interviewer',
        select: 'fullName firstName middleName lastName email'
      })
      .sort({ appliedAt: -1, createdAt: -1 });

    const stats = {
      total: applications.length,
      pending: applications.filter((app) => app.status === 'pending').length,
      forInterview: applications.filter((app) => app.status === 'for interview').length,
      hired: applications.filter((app) => app.status === 'hired').length,
      declined: applications.filter((app) => app.status === 'declined').length,
    };

    return res.status(200).json({
      success: true,
      count: applications.length,
      stats,
      applications
    });
  } catch (error) {
    console.error('Error fetching admin applications:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching admin applications'
    });
  }
};

// GET EMPLOYER'S APPLICATIONS
exports.getEmployerApplications = async (req, res) => {
  try {
    if (req.user.role !== 'employer') {
      return res.status(403).json({
        message: 'Only employers can view job applications'
      });
    }

    const applications = await Application.find({ employer: req.user._id })
      .populate({
        path: 'job',
        select: [
          'title',
          'jobTitle',
          'companyName',
          'companyLogo',
          'salaryMin',
          'salaryMax',
          'location',
          'address',
          'jobType',
          'workMode',
          'experienceLevel',
          'requirements',
          'qualification',
          'description',
          'educationLevel',
          'educationalRequirements',
          'skillsRequired',
          'openToFreshGraduates',
          'category'
        ].join(' ')
      })
      .populate({
        path: 'jobseeker',
        select: [
          'fullName',
          'firstName',
          'middleName',
          'lastName',
          'extensionName',
          'email',
          'profileImage',
          'jobSeekerProfile'
        ].join(' ')
      })
      .populate({
        path: 'interviewSchedule.interviewer',
        select: 'fullName firstName middleName lastName email'
      })
      .sort({ appliedAt: -1 });

    const stats = {
      total: applications.length,
      pending: applications.filter((app) => app.status === 'pending').length,
      forInterview: applications.filter((app) => app.status === 'for interview').length,
      hired: applications.filter((app) => app.status === 'hired').length,
      declined: applications.filter((app) => app.status === 'declined').length,
      new7d: applications.filter((app) => {
        if (!app.appliedAt) return false;
        const now = new Date();
        const appliedDate = new Date(app.appliedAt);
        const diffMs = now - appliedDate;
        return diffMs <= 7 * 24 * 60 * 60 * 1000;
      }).length,
      needsReview: applications.filter((app) => ['pending', 'for interview'].includes(app.status)).length,
    };

    res.status(200).json({
      success: true,
      count: applications.length,
      stats,
      applications: await attachEmploymentStatus(applications)
    });

  } catch (error) {
    console.error('Error fetching employer applications:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching applications'
    });
  }
};

// ✅ NEW: GET HIRED APPLICATIONS OF EMPLOYER
exports.getEmployerHiredApplications = async (req, res) => {
  try {
    if (req.user.role !== 'employer') {
      return res.status(403).json({
        success: false,
        message: 'Only employers can view hired applications'
      });
    }

    const { jobId } = req.query;

    const query = {
      employer: req.user._id,
      status: 'hired'
    };

    if (jobId) {
      query.job = jobId;
    }

    const applications = await Application.find(query)
      .populate({
        path: 'job',
        select: 'title companyName companyLogo salaryMin salaryMax'
      })
      .populate({
        path: 'jobseeker',
        select: 'fullName firstName middleName lastName email profileImage'
      })
      .populate({
        path: 'interviewSchedule.interviewer',
        select: 'fullName firstName middleName lastName email'
      })
      .sort({ appliedAt: -1 });

    return res.status(200).json({
      success: true,
      count: applications.length,
      applications
    });
  } catch (error) {
    console.error('Error fetching hired applications:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching hired applications'
    });
  }
};

// ✅ NEW: GET FOR INTERVIEW APPLICATIONS OF EMPLOYER
exports.getEmployerForInterviewApplications = async (req, res) => {
  try {
    if (req.user.role !== 'employer') {
      return res.status(403).json({
        success: false,
        message: 'Only employers can view for interview applications'
      });
    }

    const { jobId } = req.query;

    const query = {
      employer: req.user._id,
      status: 'for interview'
    };

    if (jobId) {
      query.job = jobId;
    }

    const applications = await Application.find(query)
      .populate({
        path: 'job',
        select: 'title companyName companyLogo'
      })
      .populate({
        path: 'jobseeker',
        select: 'fullName firstName middleName lastName email profileImage phoneNumber contactNumber jobSeekerProfile.phoneNumber jobSeekerProfile.mobileNumber'
      })
      .sort({ appliedAt: -1 });

    const [applicationsWithEmploymentStatus, defaultHiringStages, customHiringStages] = await Promise.all([
      attachEmploymentStatus(applications),
      getEmployerAvailableDefaultHiringStages(req.user._id),
      getEmployerCustomHiringStages(req.user._id)
    ]);

    res.status(200).json({
      success: true,
      count: applications.length,
      applications: applicationsWithEmploymentStatus,
      defaultHiringStages,
      customHiringStages
    });
  } catch (error) {
    console.error('Error fetching for interview applications:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching for interview applications'
    });
  }
};

// ✅ UPDATED: GET ACTIVE DECLINED APPLICATIONS OF EMPLOYER
exports.getEmployerDeclinedApplications = async (req, res) => {
  try {
    if (req.user.role !== 'employer') {
      return res.status(403).json({
        success: false,
        message: 'Only employers can view declined applications'
      });
    }

    const { jobId } = req.query;

    const query = buildDeclinedQuery(req.user._id, jobId, false);

    const [applications, counts] = await Promise.all([
      Application.find(query)
        .populate({
          path: 'job',
          select: 'title companyName companyLogo salaryMin salaryMax'
        })
        .populate({
          path: 'jobseeker',
          select: 'fullName firstName middleName lastName email profileImage'
        })
        .populate({
          path: 'interviewSchedule.interviewer',
          select: 'fullName firstName middleName lastName email'
        })
        .sort({ appliedAt: -1 }),
      getDeclinedCounts(req.user._id, jobId)
    ]);

    return res.status(200).json({
      success: true,
      count: applications.length,
      activeCount: counts.activeCount,
      archivedCount: counts.archivedCount,
      applications
    });
  } catch (error) {
    console.error('Error fetching declined applications:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching declined applications'
    });
  }
};

// ✅ NEW: GET ARCHIVED DECLINED APPLICATIONS OF EMPLOYER
exports.getEmployerArchivedDeclinedApplications = async (req, res) => {
  try {
    if (req.user.role !== 'employer') {
      return res.status(403).json({
        success: false,
        message: 'Only employers can view archived declined applications'
      });
    }

    const { jobId } = req.query;

    const query = buildDeclinedQuery(req.user._id, jobId, true);

    const [applications, counts] = await Promise.all([
      Application.find(query)
        .populate({
          path: 'job',
          select: 'title companyName companyLogo salaryMin salaryMax'
        })
        .populate({
          path: 'jobseeker',
          select: 'fullName firstName middleName lastName email profileImage'
        })
        .populate({
          path: 'interviewSchedule.interviewer',
          select: 'fullName firstName middleName lastName email'
        })
        .sort({ declinedArchivedAt: -1, updatedAt: -1 }),
      getDeclinedCounts(req.user._id, jobId)
    ]);

    return res.status(200).json({
      success: true,
      count: applications.length,
      activeCount: counts.activeCount,
      archivedCount: counts.archivedCount,
      applications
    });
  } catch (error) {
    console.error('Error fetching archived declined applications:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching archived declined applications'
    });
  }
};

// ✅ NEW: ARCHIVE DECLINED APPLICATION OF EMPLOYER
exports.archiveDeclinedApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;

    if (req.user.role !== 'employer') {
      return res.status(403).json({
        success: false,
        message: 'Only employers can archive declined applications'
      });
    }

    const application = await Application.findById(applicationId);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    if (application.employer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to archive this application'
      });
    }

    if (String(application.status || '').toLowerCase() !== 'declined') {
      return res.status(400).json({
        success: false,
        message: 'Only declined applications can be archived'
      });
    }

    if (application.isDeclinedArchived) {
      return res.status(400).json({
        success: false,
        message: 'Declined application is already archived'
      });
    }

    application.isDeclinedArchived = true;
    application.declinedArchivedAt = new Date();

    await application.save();

    return res.status(200).json({
      success: true,
      message: 'Declined application archived successfully',
      application
    });
  } catch (error) {
    console.error('Error archiving declined application:', error);
    return res.status(500).json({
      success: false,
      message: 'Error archiving declined application'
    });
  }
};

// ✅ NEW: RESTORE ARCHIVED DECLINED APPLICATION OF EMPLOYER
exports.restoreDeclinedApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;

    if (req.user.role !== 'employer') {
      return res.status(403).json({
        success: false,
        message: 'Only employers can restore declined applications'
      });
    }

    const application = await Application.findById(applicationId);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    if (application.employer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to restore this application'
      });
    }

    if (String(application.status || '').toLowerCase() !== 'declined') {
      return res.status(400).json({
        success: false,
        message: 'Only declined applications can be restored here'
      });
    }

    if (!application.isDeclinedArchived) {
      return res.status(400).json({
        success: false,
        message: 'Declined application is not archived'
      });
    }

    application.isDeclinedArchived = false;
    application.declinedArchivedAt = null;

    await application.save();

    return res.status(200).json({
      success: true,
      message: 'Declined application restored successfully',
      application
    });
  } catch (error) {
    console.error('Error restoring declined application:', error);
    return res.status(500).json({
      success: false,
      message: 'Error restoring declined application'
    });
  }
};

// ✅ UPDATED: PERMANENT DELETE ONLY FOR ARCHIVED DECLINED APPLICATION
exports.deleteDeclinedApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;

    if (req.user.role !== 'employer') {
      return res.status(403).json({
        success: false,
        message: 'Only employers can delete declined applications'
      });
    }

    const application = await Application.findById(applicationId);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    if (application.employer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this application'
      });
    }

    if (String(application.status || '').toLowerCase() !== 'declined') {
      return res.status(400).json({
        success: false,
        message: 'Only declined applications can be permanently deleted'
      });
    }

    if (!application.isDeclinedArchived) {
      return res.status(400).json({
        success: false,
        message: 'Only archived declined applications can be permanently deleted'
      });
    }

    await Job.updateOne(
      { _id: application.job },
      {
        $pull: { applications: application._id },
        $inc: { applicationCount: -1 }
      }
    );

    if (application?.appliedResume?.storedFilename) {
      const absoluteResumePath = path.join(__dirname, '../uploads/resumes', application.appliedResume.storedFilename);
      safeDeleteFile(absoluteResumePath);
    }

    await Application.findByIdAndDelete(applicationId);

    return res.status(200).json({
      success: true,
      message: 'Archived declined application permanently deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting declined application:', error);
    return res.status(500).json({
      success: false,
      message: 'Error deleting declined application'
    });
  }
};

// ✅ NEW: GET UPCOMING INTERVIEW CALENDAR DATA FOR EMPLOYER DASHBOARD
exports.getEmployerInterviewCalendar = async (req, res) => {
  try {
    if (req.user.role !== 'employer') {
      return res.status(403).json({
        success: false,
        message: 'Only employers can view interview calendar'
      });
    }

    const applications = await Application.find({
      employer: req.user._id,
      status: 'for interview',
      'interviewSchedule.scheduledAt': { $ne: null }
    })
      .populate({
        path: 'job',
        select: 'title companyName companyLogo'
      })
      .populate({
        path: 'jobseeker',
        select: 'fullName firstName middleName lastName email profileImage'
      })
      .populate({
        path: 'interviewSchedule.interviewer',
        select: 'fullName firstName middleName lastName email'
      })
      .sort({ 'interviewSchedule.scheduledAt': 1 });

    const buildApplicantName = (user) => {
      const full = String(user?.fullName || '').trim();
      if (full) return full;

      const parts = [user?.firstName, user?.middleName, user?.lastName]
        .map((part) => String(part || '').trim())
        .filter(Boolean);

      if (parts.length) return parts.join(' ');

      const email = String(user?.email || '').trim();
      if (email && email.includes('@')) return email.split('@')[0];

      return 'Applicant';
    };

    const interviews = applications
      .filter((app) => app?.interviewSchedule?.scheduledAt)
      .map((app) => ({
        _id: app._id,
        applicationId: app._id,
        scheduledAt: app.interviewSchedule.scheduledAt,
        meetingType: app.interviewSchedule.meetingType || '',
        notes: app.interviewSchedule.notes || '',
        interviewerName:
          app.interviewSchedule?.interviewerName ||
          app.interviewSchedule?.interviewer?.fullName ||
          app.interviewSchedule?.interviewer?.email ||
          '',
        applicantName: buildApplicantName(app.jobseeker),
        applicantEmail: app.jobseeker?.email || '',
        jobTitle: app.job?.title || 'Applicant',
        companyName: app.job?.companyName || '',
        profileImage: app.jobseeker?.profileImage || '',
      }));

    return res.status(200).json({
      success: true,
      count: interviews.length,
      interviews
    });
  } catch (error) {
    console.error('Error fetching interview calendar:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching interview calendar'
    });
  }
};

// ✅ NEW: GET EMPLOYER INTERVIEWER OPTIONS
exports.getEmployerInterviewerOptions = async (req, res) => {
  try {
    if (req.user.role !== 'employer') {
      return res.status(403).json({
        success: false,
        message: 'Only employers can view interviewer options'
      });
    }

    const employer = await User.findById(req.user._id).select(
      'firstName middleName lastName email role'
    );

    if (!employer) {
      return res.status(404).json({
        success: false,
        message: 'Employer not found'
      });
    }

    const interviewerName =
      [employer.firstName, employer.middleName, employer.lastName]
        .map((p) => String(p || '').trim())
        .filter(Boolean)
        .join(' ')
        .trim() || String(employer.email || '').trim();

    return res.status(200).json({
      success: true,
      interviewers: [
        {
          _id: String(employer._id),
          fullName: interviewerName || 'Employer',
          email: employer.email || '',
          roleLabel: 'Hiring Manager',
        }
      ]
    });
  } catch (error) {
    console.error('Error fetching interviewer options:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching interviewer options'
    });
  }
};

// ✅ NEW: CREATE / UPDATE INTERVIEW SCHEDULE
exports.updateInterviewSchedule = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { scheduledAt, meetingType, interviewerId, notes } = req.body;

    if (req.user.role !== 'employer') {
      return res.status(403).json({
        success: false,
        message: 'Only employers can schedule interviews'
      });
    }

    const application = await Application.findById(applicationId)
      .populate({
        path: 'job',
        select: 'title companyName companyLogo'
      })
      .populate({
        path: 'jobseeker',
        select: 'fullName firstName middleName lastName email profileImage'
      });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    if (application.employer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this interview schedule'
      });
    }

    const parsedScheduledAt = new Date(scheduledAt);
    if (!scheduledAt || Number.isNaN(parsedScheduledAt.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Valid interview date and time is required'
      });
    }

    if (parsedScheduledAt.getTime() <= Date.now()) {
      return res.status(400).json({
        success: false,
        message: 'Interview schedule must be set to a future date and time'
      });
    }

    const allowedMeetingTypes = ['Video Call', 'On-site'];
    if (!allowedMeetingTypes.includes(String(meetingType || '').trim())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid interview type'
      });
    }

    const finalInterviewerId = interviewerId || req.user._id;

    const interviewer = await User.findById(finalInterviewerId).select(
      'firstName middleName lastName email role googleCalendarAuth.googleEmail googleCalendarAuth.connectedAt +googleCalendarAuth.refreshToken'
    );

    if (!interviewer) {
      return res.status(404).json({
        success: false,
        message: 'Interviewer not found'
      });
    }

    if (interviewer._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only assign your own employer account as interviewer for now'
      });
    }

    const interviewerName =
      [interviewer.firstName, interviewer.middleName, interviewer.lastName]
        .map((p) => String(p || '').trim())
        .filter(Boolean)
        .join(' ')
        .trim() || String(interviewer.email || '').trim();

    const normalizedMeetingType = String(meetingType || '').trim();
    let generatedMeetingLink = '';

    if (normalizedMeetingType === 'Video Call') {
      const employerRefreshToken = String(
        interviewer.googleCalendarAuth?.refreshToken || ''
      ).trim();

      if (!employerRefreshToken) {
        return res.status(428).json({
          success: false,
          code: 'GOOGLE_CALENDAR_NOT_CONNECTED',
          message:
            'Connect your employer Google account first. That Google account will become the meeting organizer, while the jobseeker will join as an attendee.',
        });
      }

      try {
        const calendarEvent = await createCalendarEvent({
          summary: `AGAPAY Interview - ${application?.job?.title || 'Applicant'}`,
          description: `Interview with ${buildUserDisplayName(application.jobseeker, 'Applicant')}`,
          startTime: parsedScheduledAt,
          endTime: new Date(parsedScheduledAt.getTime() + 60 * 60 * 1000),
          attendeeEmail: application.jobseeker.email,
          organizerRefreshToken: employerRefreshToken,
          calendarId: 'primary',
        });

        generatedMeetingLink = String(calendarEvent?.meetingLink || '').trim();

        if (!generatedMeetingLink) {
          return res.status(502).json({
            success: false,
            message: 'Google Meet did not return a meeting link. Please check the Google Calendar credentials and try again.'
          });
        }
      } catch (calendarError) {
        console.error('Google Calendar Error:', calendarError);

        const errorStatus = Number(calendarError?.response?.status || 0);
        const calendarErrorMessage = String(
          calendarError?.response?.data?.error?.message ||
          calendarError?.message ||
          ''
        ).toLowerCase();

        const needsReconnect =
          errorStatus === 400 ||
          errorStatus === 401 ||
          errorStatus === 403 ||
          calendarErrorMessage.includes('insufficient authentication scopes') ||
          calendarErrorMessage.includes('invalid_grant');

        if (needsReconnect) {
          interviewer.googleCalendarAuth = {
            refreshToken: '',
            googleEmail: '',
            connectedAt: null,
          };

          try {
            await interviewer.save();
          } catch (clearTokenError) {
            console.error('Unable to clear invalid Google Calendar connection:', clearTokenError);
          }
        }

        return res.status(needsReconnect ? 428 : 502).json({
          success: false,
          code: needsReconnect ? 'GOOGLE_CALENDAR_RECONNECT_REQUIRED' : 'GOOGLE_CALENDAR_ERROR',
          message: needsReconnect
            ? 'Your Google Calendar connection is missing the required permission or has expired. Please connect it again.'
            : 'Unable to generate the Google Meet link. Please check the Google Calendar configuration and try again.'
        });
      }
    }

    const hadExistingSchedule = !!application?.interviewSchedule?.scheduledAt;

    application.interviewSchedule = {
      ...application.interviewSchedule?.toObject?.(),
      scheduledAt: parsedScheduledAt,
      durationMinutes: application.interviewSchedule?.durationMinutes || 60,
      meetingType: normalizedMeetingType,
      meetingLink: generatedMeetingLink,
      notes: String(notes || '').trim(),
      setBy: req.user._id,
      setAt: new Date(),
      interviewer: interviewer._id,
      interviewerName,
      status: hadExistingSchedule ? 'rescheduled' : 'scheduled',
    };

    application.status = 'for interview';
    application.lastActiveStatus = 'for interview';
    application.reviewedAt = new Date();

    await application.save();

    const actionLabel = hadExistingSchedule ? 'rescheduled' : 'scheduled';
    const dateLabel = formatInterviewDateLabel(parsedScheduledAt);
    const timeLabel = formatInterviewTimeLabel(parsedScheduledAt);
    const applicantName = buildUserDisplayName(application.jobseeker, 'Applicant');
    const jobTitle = application?.job?.title || 'Applicant';

    const interviewDetails = {
      date: parsedScheduledAt,
      time: timeLabel,
      location: normalizedMeetingType === 'On-site' ? 'On-site' : '',
      meetingLink: generatedMeetingLink,
      notes: JSON.stringify({
        confirmationCard: true,
        action: actionLabel,
        applicantName,
        jobTitle,
        dateLabel,
        timeLabel,
        typeLabel: normalizedMeetingType,
        meetingLink: generatedMeetingLink,
        interviewerLabel: interviewerName || 'Employer',
        rawNotes: String(notes || '').trim(),
      }),
    };

    const interviewMessage = await Message.create({
      conversationId: buildConversationId(req.user._id, application.jobseeker._id),
      sender: req.user._id,
      receiver: application.jobseeker._id,
      content: `Interview ${hadExistingSchedule ? 'Rescheduled' : 'Scheduled'}: ${dateLabel} at ${timeLabel}`,
      messageType: 'interview',
      interviewDetails,
      job: application.job?._id || application.job || null,
      application: application._id,
    });

    try {
      await notificationController.createInterviewNotification(
        application.jobseeker._id,
        interviewDetails
      );
    } catch (notifErr) {
      console.error('Error creating interview notification:', notifErr);
    }

    const populatedInterviewMessage = await Message.findById(interviewMessage._id)
      .populate('sender', 'fullName firstName middleName lastName email profileImage role employerProfile.companyName employerProfile.companyLogo')
      .populate('receiver', 'fullName firstName middleName lastName email profileImage role employerProfile.companyName employerProfile.companyLogo')
      .populate('job', 'title companyName');

    const updatedApplication = await Application.findById(application._id)
      .populate({
        path: 'job',
        select: 'title companyName companyLogo'
      })
      .populate({
        path: 'jobseeker',
        select: 'fullName firstName middleName lastName email profileImage'
      })
      .populate({
        path: 'interviewSchedule.interviewer',
        select: 'fullName firstName middleName lastName email'
      });

    return res.status(200).json({
      success: true,
      message: 'Interview schedule saved successfully',
      application: updatedApplication,
      interviewMessage: populatedInterviewMessage
    });
  } catch (error) {
    console.error('Error updating interview schedule:', error);
    return res.status(500).json({
      success: false,
      message: 'Error updating interview schedule'
    });
  }
};

// GET APPLICATIONS FOR SPECIFIC JOB
exports.getJobApplications = async (req, res) => {
  try {
    const { jobId } = req.params;

    if (!['employer', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        message: 'Only employers and admins can view job applications'
      });
    }

    const jobQuery = req.user.role === 'admin'
      ? { _id: jobId }
      : { _id: jobId, employer: req.user._id };

    const job = await Job.findOne(jobQuery);

    if (!job) {
      return res.status(404).json({
        message: 'Job not found or unauthorized'
      });
    }

    const applications = await Application.find({ job: jobId })
      .populate({
        path: 'jobseeker',
        select: 'fullName firstName middleName lastName extensionName email profileImage jobSeekerProfile'
      })
      .populate({
        path: 'interviewSchedule.interviewer',
        select: 'fullName firstName middleName lastName email'
      })
      .sort({ appliedAt: -1 });

    res.status(200).json({
      success: true,
      count: applications.length,
      job: {
        _id: job._id,
        title: job.title,
        vacancies: job.vacancies,
        companyName: job.companyName,
        companyLogo: job.companyLogo,
        skillsRequired: job.skillsRequired,
        educationLevel: job.educationLevel,
        experienceLevel: job.experienceLevel,
        openToFreshGraduates: job.openToFreshGraduates,
        category: job.category,
        description: job.description,
        requirements: job.requirements,
      },
      applications: await attachEmploymentStatus(applications)
    });

  } catch (error) {
    console.error('Error fetching job applications:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching applications for this job'
    });
  }
};

// UPDATE EMPLOYER HIRING STAGE
exports.updateApplicationHiringStage = async (req, res) => {
  try {
    if (req.user.role !== 'employer') {
      return res.status(403).json({
        success: false,
        message: 'Only employers can update hiring stages'
      });
    }

    const { applicationId } = req.params;
    const action = String(req.body?.action || 'set').trim().toLowerCase();
    const requestedStage = normalizeHiringStage(req.body?.hiringStage || req.body?.stage);

    const application = await Application.findById(applicationId)
      .populate({ path: 'job', select: 'title companyName companyLogo' })
      .populate({
        path: 'jobseeker',
        select: 'fullName firstName middleName lastName email profileImage phoneNumber contactNumber jobSeekerProfile.phoneNumber jobSeekerProfile.mobileNumber'
      });

    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    if (String(application.employer) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this application'
      });
    }

    if (application.status !== 'for interview') {
      return res.status(400).json({
        success: false,
        message: 'Hiring stages can only be updated for applicants in For Interview'
      });
    }

    if (action === 'addcustom') {
      if (!requestedStage) {
        return res.status(400).json({ success: false, message: 'Custom stage is required' });
      }

      const matchingDefaultStage = DEFAULT_HIRING_STAGES.find((stage) =>
        sameHiringStage(stage, requestedStage)
      );

      if (matchingDefaultStage) {
        const hiddenDefaultStages = await getEmployerHiddenDefaultHiringStages(req.user._id);
        const wasDeleted = hiddenDefaultStages.some((stage) =>
          sameHiringStage(stage, matchingDefaultStage)
        );

        if (!wasDeleted) {
          return res.status(400).json({ success: false, message: 'This stage already exists' });
        }

        await Application.updateMany(
          { employer: req.user._id },
          { $pull: { hiddenDefaultHiringStages: matchingDefaultStage } }
        );

        const [refreshedApplication, defaultHiringStages, customHiringStages] = await Promise.all([
          Application.findById(applicationId)
            .populate({ path: 'job', select: 'title companyName companyLogo' })
            .populate({
              path: 'jobseeker',
              select: 'fullName firstName middleName lastName email profileImage phoneNumber contactNumber jobSeekerProfile.phoneNumber jobSeekerProfile.mobileNumber'
            }),
          getEmployerAvailableDefaultHiringStages(req.user._id),
          getEmployerCustomHiringStages(req.user._id)
        ]);

        return res.status(200).json({
          success: true,
          message: 'Default hiring stage restored',
          application: refreshedApplication,
          defaultHiringStages,
          customHiringStages
        });
      }

      const existingCustomStages = await getEmployerCustomHiringStages(req.user._id);
      const existingStage = existingCustomStages.find((stage) => sameHiringStage(stage, requestedStage));
      const stageToSave = existingStage || requestedStage;

      await Application.updateMany(
        { employer: req.user._id },
        { $addToSet: { customHiringStages: stageToSave } }
      );

      const [defaultHiringStages, customHiringStages] = await Promise.all([
        getEmployerAvailableDefaultHiringStages(req.user._id),
        getEmployerCustomHiringStages(req.user._id)
      ]);
      application.customHiringStages = customHiringStages;

      return res.status(200).json({
        success: true,
        message: existingStage ? 'Hiring stage already exists' : 'Custom hiring stage added',
        application,
        defaultHiringStages,
        customHiringStages
      });
    }

    if (action === 'delete' || action === 'deletecustom') {
      if (!requestedStage) {
        return res.status(400).json({ success: false, message: 'Hiring stage is required' });
      }

      const matchingDefaultStage = DEFAULT_HIRING_STAGES.find((stage) =>
        sameHiringStage(stage, requestedStage)
      );

      const existingCustomStages = await getEmployerCustomHiringStages(req.user._id);
      const matchingCustomStage = existingCustomStages.find((stage) =>
        sameHiringStage(stage, requestedStage)
      );

      const stageToDelete = matchingDefaultStage || matchingCustomStage;

      if (!stageToDelete) {
        return res.status(404).json({
          success: false,
          message: 'Hiring stage was not found or was already deleted'
        });
      }

      const stageRegex = buildExactHiringStageRegex(stageToDelete);

      if (matchingDefaultStage) {
        await Application.updateMany(
          { employer: req.user._id },
          { $addToSet: { hiddenDefaultHiringStages: matchingDefaultStage } }
        );
      } else {
        await Application.updateMany(
          { employer: req.user._id },
          { $pull: { customHiringStages: matchingCustomStage } }
        );
      }

      if (stageRegex) {
        await Application.updateMany(
          { employer: req.user._id, hiringStage: stageRegex },
          { $set: { hiringStage: '' } }
        );
      }

      const [refreshedApplication, defaultHiringStages, customHiringStages] = await Promise.all([
        Application.findById(applicationId)
          .populate({ path: 'job', select: 'title companyName companyLogo' })
          .populate({
            path: 'jobseeker',
            select: 'fullName firstName middleName lastName email profileImage phoneNumber contactNumber jobSeekerProfile.phoneNumber jobSeekerProfile.mobileNumber'
          }),
        getEmployerAvailableDefaultHiringStages(req.user._id),
        getEmployerCustomHiringStages(req.user._id)
      ]);

      return res.status(200).json({
        success: true,
        message: matchingDefaultStage
          ? 'Default hiring stage deleted'
          : 'Custom hiring stage deleted',
        application: refreshedApplication,
        defaultHiringStages,
        customHiringStages
      });
    }

    const previousStage = normalizeHiringStage(application.hiringStage);

    if (action === 'reset') {
      application.hiringStage = '';
    } else {
      if (!requestedStage) {
        return res.status(400).json({ success: false, message: 'Please select a hiring stage' });
      }

      const [defaultHiringStages, customHiringStages] = await Promise.all([
        getEmployerAvailableDefaultHiringStages(req.user._id),
        getEmployerCustomHiringStages(req.user._id)
      ]);
      const allowedStage = [...defaultHiringStages, ...customHiringStages].find(
        (stage) => sameHiringStage(stage, requestedStage)
      );

      if (!allowedStage) {
        return res.status(400).json({
          success: false,
          message: 'Select an existing stage or add it as a custom stage first'
        });
      }

      application.hiringStage = allowedStage;
    }

    const nextStage = normalizeHiringStage(application.hiringStage);
    if (!sameHiringStage(previousStage, nextStage)) {
      application.activityHistory.push({
        type: 'other',
        title: nextStage ? 'Hiring stage updated' : 'Hiring stage reset',
        description: nextStage
          ? `Hiring stage changed from ${previousStage || 'No stage set'} to ${nextStage}.`
          : `Hiring stage was reset from ${previousStage || 'No stage set'} to No stage set.`,
        fromStatus: previousStage,
        toStatus: nextStage,
        occurredAt: new Date(),
        performedBy: req.user._id
      });
    }

    await application.save();

    const [defaultHiringStages, customHiringStages] = await Promise.all([
      getEmployerAvailableDefaultHiringStages(req.user._id),
      getEmployerCustomHiringStages(req.user._id)
    ]);
    application.customHiringStages = customHiringStages;

    return res.status(200).json({
      success: true,
      message: action === 'reset' ? 'Hiring stage reset' : 'Hiring stage updated',
      application,
      defaultHiringStages,
      customHiringStages
    });
  } catch (error) {
    console.error('Error updating hiring stage:', error);
    return res.status(500).json({
      success: false,
      message: 'Error updating hiring stage'
    });
  }
};
// UPDATE APPLICATION STATUS
exports.updateApplicationStatus = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { status, notes, declineReason, declineComment, declinedFrom } = req.body;

    if (req.user.role !== 'employer') {
      return res.status(403).json({
        message: 'Only employers can update application status'
      });
    }

    const application = await Application.findById(applicationId)
      .populate('job');

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    if (application.employer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: 'Not authorized to update this application'
      });
    }

    const oldStatus = application.status;
    const nextStatus = String(status || '').toLowerCase().trim();

    if (!VALID_APPLICATION_STATUSES.includes(nextStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid application status'
      });
    }

    if (nextStatus !== 'declined') {
      const otherHiredApplication = await Application.findOne({
        _id: { $ne: application._id },
        jobseeker: application.jobseeker,
        job: { $ne: application.job?._id || application.job },
        status: 'hired'
      }).select('_id job employer');

      if (otherHiredApplication) {
        return res.status(409).json({
          success: false,
          code: 'APPLICANT_ALREADY_EMPLOYED',
          message: 'This applicant is already employed through another job application. You may only decline this application.'
        });
      }
    }

    if (nextStatus === 'declined') {
      const normalizedDeclineReason = String(declineReason || '').trim();
      const normalizedDeclineComment = String(declineComment || '').trim();
      const normalizedDeclinedFrom = String(declinedFrom || '').trim();

      if (!normalizedDeclineReason) {
        return res.status(400).json({
          success: false,
          message: 'Decline reason is required when declining an application'
        });
      }

      if (!VALID_DECLINE_REASONS.includes(normalizedDeclineReason)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid decline reason selected'
        });
      }

      if (!normalizedDeclinedFrom) {
        return res.status(400).json({
          success: false,
          message: 'Decline source is required when declining an application'
        });
      }

      if (!VALID_DECLINED_FROM.includes(normalizedDeclinedFrom)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid decline source'
        });
      }

      application.declineReason = normalizedDeclineReason;
      application.declineComment = normalizedDeclineComment;
      application.declinedFrom = normalizedDeclinedFrom;
      application.isDeclinedArchived = false;
      application.declinedArchivedAt = null;
    } else {
      application.declineReason = '';
      application.declineComment = '';
      application.declinedFrom = '';
      application.isDeclinedArchived = false;
      application.declinedArchivedAt = null;
    }

    application.status = nextStatus;
    application.reviewedAt = Date.now();

    if (nextStatus === 'for interview' && oldStatus !== 'for interview') {
      application.hiringStage = '';
    }

    if (ACTIVE_APPLICATION_STATUSES.includes(nextStatus)) {
      application.lastActiveStatus = nextStatus;
    }

    if (notes) application.notes = notes;

    if (oldStatus !== nextStatus) {
      const statusLabels = {
        pending: 'Pending',
        'for interview': 'For Interview',
        hired: 'Hired',
        declined: 'Declined',
        withdrawn: 'Withdrawn',
        cancelled: 'Cancelled',
        'vacancy full': 'Vacancy Full'
      };
      const activityType = nextStatus === 'for interview'
        ? 'interview'
        : nextStatus === 'hired'
          ? 'hired'
          : nextStatus === 'declined'
            ? 'declined'
            : 'status_changed';
      const title = nextStatus === 'for interview'
        ? 'Moved to interview'
        : nextStatus === 'hired'
          ? 'Applicant hired'
          : nextStatus === 'declined'
            ? 'Application declined'
            : 'Application status updated';
      const description = nextStatus === 'declined'
        ? [declineReason, declineComment].filter(Boolean).join(' — ')
        : `Status changed from ${statusLabels[oldStatus] || oldStatus} to ${statusLabels[nextStatus] || nextStatus}.`;

      application.activityHistory.push({
        type: activityType,
        title,
        description,
        fromStatus: oldStatus,
        toStatus: nextStatus,
        occurredAt: new Date(),
        performedBy: req.user._id
      });
    }

    if (nextStatus === 'hired' && oldStatus !== 'hired') {
      const vacancyLimit = Number(application.job?.vacancies || 0);
      if (Number.isFinite(vacancyLimit) && vacancyLimit > 0) {
        const currentHiredCount = await Application.countDocuments({
          job: application.job._id,
          status: 'hired',
          _id: { $ne: application._id }
        });

        if (currentHiredCount >= vacancyLimit || normalizeJobStatus(application.job?.status) === 'filled') {
          await closeJobWhenVacancyIsFull(application.job._id);
          return res.status(400).json({
            success: false,
            message: 'The vacancy is already full.'
          });
        }
      }
    }

    await application.save();

    if (oldStatus !== nextStatus) {
      await notificationController.createApplicationStatusNotification(
        application,
        oldStatus,
        nextStatus
      );
    }

    let vacancyResult = null;
    if (nextStatus === 'hired') {
      vacancyResult = await closeJobWhenVacancyIsFull(application.job._id);
    }

    const responseApplication = await Application.findById(application._id).populate('job');

    res.status(200).json({
      success: true,
      message: vacancyResult?.isFull
        ? `Application updated to ${nextStatus} successfully. The job post is now filled because the vacancy is already full.`
        : `Application updated to ${nextStatus} successfully`,
      application: responseApplication || application,
      vacancy: vacancyResult ? {
        isFull: vacancyResult.isFull,
        hiredCount: vacancyResult.hiredCount,
        vacancyLimit: vacancyResult.vacancyLimit,
        affectedPendingCount: vacancyResult.affectedPendingCount
      } : undefined
    });

  } catch (error) {
    console.error('Error updating application status:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating application status'
    });
  }
};


// GET GENERATED APPLICANT CV PDF FOR EMPLOYER APPLICATION DETAILS
exports.downloadApplicationResume = async (req, res) => {
  try {
    const { applicationId } = req.params;

    const application = await Application.findById(applicationId)
      .populate({
        path: 'jobseeker',
        select: [
          'fullName',
          'firstName',
          'middleName',
          'lastName',
          'extensionName',
          'email',
          'jobSeekerProfile'
        ].join(' ')
      });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    if (req.user.role === 'employer') {
      if (application.employer.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to download this applicant CV'
        });
      }
    } else if (req.user.role === 'jobseeker') {
      if (application.jobseeker._id.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to download this CV'
        });
      }
    } else {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to download this CV'
      });
    }

    const { lines, fullName } = buildProfileResumeLines(application.jobseeker || {});
    const pdfBuffer = createPdfBufferFromLines(lines);
    const filename = `${sanitizeFilename(fullName, 'Applicant')}_CV.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    return res.status(200).send(pdfBuffer);
  } catch (error) {
    console.error('Error downloading applicant CV:', error);
    return res.status(500).json({
      success: false,
      message: 'Error downloading applicant CV'
    });
  }
};

// GET APPLICATION DETAILS
exports.getApplicationDetails = async (req, res) => {
  try {
    const { applicationId } = req.params;

    const application = await Application.findById(applicationId)
      .populate({
        path: 'job',
        select: 'title jobTitle companyName location address jobType workMode experienceLevel requirements qualification description companyLogo salaryMin salaryMax educationLevel educationalRequirements skillsRequired perksAndBenefits otherBenefits vacancies applicationDeadline createdAt locationImage locationLatitude locationLongitude'
      })
      .populate({
        path: 'jobseeker',
        // Full applicant profile is needed by ApplicationDetails.jsx so the employer view can
        // render the same information shown in the jobseeker MyProfile.jsx tabs.
        select: [
          'fullName',
          'firstName',
          'middleName',
          'lastName',
          'extensionName',
          'email',
          'profileImage',
          'jobSeekerProfile'
        ].join(' ')
      })
      .populate({
        path: 'employer',
        select: 'fullName employerProfile.companyName employerProfile.companyWebsiteUrl employerProfile.companyWebsite employerProfile.companyLogo employerProfile.companyAddress companyAddress'
      })
      .populate({
        path: 'interviewSchedule.interviewer',
        select: 'fullName firstName middleName lastName email'
      });

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    if (req.user.role === 'jobseeker') {
      if (application.jobseeker._id.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          message: 'Not authorized to view this application'
        });
      }
    } else if (req.user.role === 'employer') {
      if (application.employer._id.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          message: 'Not authorized to view this application'
        });
      }

      // ✅ NEW: mark application as viewed when employer opens details
      if (!application.isViewedByEmployer) {
        const viewedAt = new Date();
        application.isViewedByEmployer = true;
        application.viewedAt = viewedAt;
        application.reviewedAt = application.reviewedAt || viewedAt;
        application.activityHistory.push({
          type: 'reviewed',
          title: 'Application reviewed',
          description: 'The employer opened and reviewed the applicant profile and resume.',
          fromStatus: application.status || '',
          toStatus: application.status || '',
          occurredAt: viewedAt,
          performedBy: req.user._id
        });
        await application.save();
      }
    }

    const [applicationWithEmploymentStatus] = await attachEmploymentStatus([application]);

    res.status(200).json({
      success: true,
      application: applicationWithEmploymentStatus
    });

  } catch (error) {
    console.error('Error fetching application details:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching application details'
    });
  }
};

// ✅ IDINAGDAG: CHECK IF APPLIED TO JOB FUNCTION
exports.checkIfApplied = async (req, res) => {
  try {
    const { jobId } = req.params;

    if (req.user.role !== 'jobseeker') {
      return res.status(403).json({
        success: false,
        message: 'Only jobseekers can check application status'
      });
    }

    const application = await Application.findOne({
      job: jobId,
      jobseeker: req.user._id
    }).populate({
      path: 'job',
      select: 'title companyName companyLogo'
    });

    res.status(200).json({
      success: true,
      hasApplied: !!application,
      application: application || null
    });

  } catch (error) {
    console.error('Error checking application:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking application status'
    });
  }
};

// ✅ DAGDAG: Get jobseeker application status for employer (FIXED VERSION)
exports.getJobseekerStatus = async (req, res) => {
  try {
    const { jobseekerId } = req.params;

    console.log('Getting status for jobseeker:', jobseekerId, 'Employer:', req.user._id);

    if (req.user.role !== 'employer') {
      return res.status(403).json({
        success: false,
        message: 'Only employers can view jobseeker status'
      });
    }

    const applications = await Application.find({
      jobseeker: jobseekerId,
      employer: req.user._id
    })
    .populate('job', 'title companyName')
    .sort({ appliedAt: -1 });

    console.log('Found applications:', applications.length);

    if (!applications || applications.length === 0) {
      return res.status(200).json({
        success: true,
        status: null,
        message: 'Jobseeker has not applied to any of your jobs',
        hasApplied: false
      });
    }

    const latestApplication = applications[0];
    console.log('Latest application status:', latestApplication.status);

    res.status(200).json({
      success: true,
      status: latestApplication.status,
      hasApplied: true,
      applicationId: latestApplication._id,
      jobTitle: latestApplication.job?.title || 'Unknown Job',
      appliedAt: latestApplication.appliedAt
    });

  } catch (error) {
    console.error('Error fetching jobseeker status:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching jobseeker status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};