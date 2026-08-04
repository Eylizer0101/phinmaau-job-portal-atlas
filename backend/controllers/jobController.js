const Job = require('../models/Job');
const User = require('../models/User');
const notificationController = require('./notificationController');


const escapeRegExp = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const tokenizeProfileValue = (value) => {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.flatMap((item) => tokenizeProfileValue(item));
  }

  if (typeof value === 'object') {
    return Object.values(value).flatMap((item) => tokenizeProfileValue(item));
  }

  return String(value || '')
    .split(/\|\||,|\n|;/g)
    .map((item) => String(item || '').replace(/\s[—-]\s(?:Basic|Novice|Intermediate|Advanced|Expert)$/i, '').trim())
    .filter(Boolean);
};

const normalizeKeyword = (value) => String(value || '')
  .toLowerCase()
  .replace(/[^a-z0-9+#.\s-]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const COURSE_KEYWORD_MAP = [
  {
    test: ['information technology', 'computer science', 'computer engineering', 'it', 'ict'],
    keywords: ['information technology', 'it staff', 'technical support', 'programmer', 'software developer', 'web developer', 'frontend', 'backend', 'database', 'systems', 'network', 'computer', 'developer', 'coding', 'web development']
  },
  {
    test: ['business administration', 'business management', 'management'],
    keywords: ['business', 'management', 'administrative', 'office staff', 'operations', 'business development', 'supervisor']
  },
  {
    test: ['accountancy', 'accounting', 'financial management', 'finance'],
    keywords: ['accounting', 'accountant', 'finance', 'bookkeeper', 'audit', 'payroll', 'billing', 'financial']
  },
  {
    test: ['hospitality', 'tourism', 'hotel restaurant', 'hrm'],
    keywords: ['hospitality', 'hotel', 'restaurant', 'tourism', 'front desk', 'food service', 'service crew', 'cashier']
  },
  {
    test: ['education', 'teacher', 'teaching'],
    keywords: ['teacher', 'teaching', 'education', 'instructor', 'tutor', 'academic']
  },
  {
    test: ['nursing', 'medical', 'healthcare', 'health care'],
    keywords: ['nurse', 'medical', 'healthcare', 'clinic', 'patient', 'caregiver', 'health']
  },
  {
    test: ['criminology'],
    keywords: ['security', 'safety', 'investigator', 'loss prevention', 'criminology']
  }
];

const buildJobseekerMatchKeywords = (user = {}) => {
  const profile = user?.jobSeekerProfile || {};
  const rawKeywords = [];

  rawKeywords.push(profile.course, profile.studyField, profile.educationalAttainment, profile.employmentType, profile.preferredWorkMode);
  rawKeywords.push(...tokenizeProfileValue(profile.technicalSkills));
  rawKeywords.push(...tokenizeProfileValue(profile.softSkills));
  rawKeywords.push(...tokenizeProfileValue(profile.whatHaveYouDone));
  rawKeywords.push(...tokenizeProfileValue(profile.aboutMe));

  (profile.workExperiences || []).forEach((item) => {
    rawKeywords.push(item?.positionTitle, item?.description, item?.companyName);
  });

  ['certifications', 'projects', 'seminars', 'awards', 'affiliations', 'cocurricular'].forEach((key) => {
    (profile[key] || []).forEach((item) => {
      rawKeywords.push(item?.title, item?.role, item?.organization, item?.issuer, item?.description);
    });
  });

  const normalizedBase = rawKeywords
    .flatMap((item) => tokenizeProfileValue(item))
    .map(normalizeKeyword)
    .filter((item) => item.length >= 3 || ['c#', 'c++'].includes(item));

  const expanded = [...normalizedBase];
  const baseText = normalizedBase.join(' ');

  COURSE_KEYWORD_MAP.forEach((group) => {
    if (group.test.some((term) => baseText.includes(term))) {
      expanded.push(...group.keywords.map(normalizeKeyword));
    }
  });

  return [...new Set(expanded)].filter(Boolean);
};

const getJobSearchFields = (job = {}) => {
  const skills = Array.isArray(job.skillsRequired) ? job.skillsRequired.join(' ') : String(job.skillsRequired || '');
  const title = normalizeKeyword(job.title);
  const category = normalizeKeyword(job.category);
  const skillText = normalizeKeyword(skills);
  const combined = normalizeKeyword([
    job.title,
    job.companyName,
    job.category,
    skills,
    job.description,
    job.requirements,
    job.jobType,
    job.workMode,
    job.experienceLevel,
    job.educationLevel,
    job.location
  ].filter(Boolean).join(' '));

  return { title, category, skillText, combined };
};

const calculateJobMatchForUser = (job = {}, user = {}) => {
  const keywords = buildJobseekerMatchKeywords(user);
  if (!keywords.length) {
    return { score: 0, matchedKeywords: [] };
  }

  const fields = getJobSearchFields(job);
  let score = 0;
  const matched = [];

  keywords.forEach((keyword) => {
    if (!keyword || (keyword.length < 3 && !['c#', 'c++'].includes(keyword))) return;

    let keywordScore = 0;
    if (fields.skillText.includes(keyword)) keywordScore += 6;
    if (fields.title.includes(keyword)) keywordScore += 5;
    if (fields.category.includes(keyword)) keywordScore += 4;
    if (fields.combined.includes(keyword)) keywordScore += 2;

    if (!keywordScore && keyword.includes(' ')) {
      const parts = keyword.split(' ').filter((part) => part.length >= 3);
      const partialHits = parts.filter((part) => fields.combined.includes(part)).length;
      if (partialHits >= Math.min(2, parts.length)) keywordScore += partialHits;
    }

    if (keywordScore > 0) {
      score += keywordScore;
      matched.push(keyword);
    }
  });

  return {
    score,
    matchedKeywords: [...new Set(matched)].slice(0, 10)
  };
};

const attachRecommendationData = (jobs = [], user = null) => {
  return (jobs || []).map((job) => {
    const jobObj = typeof job.toObject === 'function' ? job.toObject() : { ...job };
    const match = user ? calculateJobMatchForUser(jobObj, user) : { score: 0, matchedKeywords: [] };

    return {
      ...jobObj,
      matchScore: match.score,
      matchedKeywords: match.matchedKeywords,
      isRecommended: match.score > 0
    };
  });
};

const normalizeSkills = (skillsRequired) => {
  if (!skillsRequired) return [];
  if (Array.isArray(skillsRequired)) {
    return skillsRequired.map(s => String(s).trim()).filter(Boolean);
  }
  if (typeof skillsRequired === 'string') {
    return skillsRequired.split(',').map(s => s.trim()).filter(Boolean);
  }
  return [];
};

const normalizePerksAndBenefits = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map(item => String(item).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map(item => String(item).trim()).filter(Boolean);
      }
    } catch {
      return value.split(',').map(item => String(item).trim()).filter(Boolean);
    }
  }
  return [];
};


const normalizeSalaryAmount = (value) => {
  if (value === undefined || value === null || value === '') return undefined;

  const numericValue = Number(String(value).replace(/[^\d.-]/g, ''));
  if (!Number.isFinite(numericValue)) return undefined;

  const roundedValue = Math.round(numericValue);

  if (roundedValue >= 1000 && roundedValue % 1000 === 998) {
    return roundedValue + 2;
  }

  return roundedValue;
};

const applyIfDefined = (obj, key, value) => {
  if (value !== undefined) obj[key] = value;
};

const applyIfNotBlank = (obj, key, value) => {
  if (value === undefined || value === null) return;
  if (typeof value === 'string' && !value.trim()) return;
  obj[key] = value;
};

const isPastApplicationDeadline = (value, now = new Date()) => {
  if (!value) return false;
  const deadline = new Date(value);
  if (Number.isNaN(deadline.getTime())) return false;
  return deadline.getTime() < now.getTime();
};

const getStatusBeforeArchive = (job = {}) => {
  const explicitStatus = String(job.status || '').trim().toLowerCase();

  if (explicitStatus === 'draft' || job.isPublished === false) return 'draft';
  if (explicitStatus === 'filled') return 'filled';
  if (explicitStatus === 'closed') return 'closed';
  if (isPastApplicationDeadline(job.applicationDeadline)) return 'expired';
  if (explicitStatus === 'published' && job.isArchived === true) return 'open';
  if (job.isActive === true && job.isPublished === true) return 'open';
  return 'closed';
};

const EXPERIENCE_LEVEL_GROUPS = [
  {
    value: 'No experience required',
    aliases: ['No experience required'],
  },
  {
    value: 'Less than 1 Yr Exp',
    aliases: ['Less than 1 Yr Exp', 'Less than 1 Yr', 'Less than 1 year', 'Less than 1 year Exp'],
  },
  {
    value: '1-3 Years Exp',
    aliases: ['1-3 Years Exp', '1-3 Years', '1 year', '1 years', '2 year', '2 years', '3 year', '3 years'],
  },
  {
    value: '4-5 Years Exp',
    aliases: ['4-5 Years Exp', '4-5 years', '4 year', '4 years', '5 year', '5 years'],
  },
  {
    value: '6+ Years Exp',
    aliases: ['6+ Years Exp', '6+ Years', '6+ year', '6+ years'],
  },
];

const ALLOWED_EXPERIENCE_LEVELS = EXPERIENCE_LEVEL_GROUPS.map((group) => group.value);

const normalizeExperienceLevel = (level) => {
  const clean = String(level || '').trim();
  const normalized = clean.toLowerCase();

  const matchedGroup = EXPERIENCE_LEVEL_GROUPS.find((group) =>
    group.aliases.some((alias) => alias.toLowerCase() === normalized)
  );

  return matchedGroup?.value || clean;
};

const buildExperienceLevelQuery = (level) => {
  const canonicalValue = normalizeExperienceLevel(level);
  const matchedGroup = EXPERIENCE_LEVEL_GROUPS.find((group) => group.value === canonicalValue);

  if (!matchedGroup) return canonicalValue;

  return {
    $in: matchedGroup.aliases.map(
      (alias) => new RegExp(`^${escapeRegExp(alias)}$`, 'i')
    ),
  };
};

const normalizeCategory = (industry) => {
  const v = String(industry || '').trim();
  if (!v) return 'Others';
  if (v === 'Other') return 'Others';
  if (v === 'Others') return 'Others';
  return v;
};

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

const parseBool = (v) => {
  const s = String(v || '').trim().toLowerCase();
  return s === 'true' || s === '1' || s === 'yes' || s === 'on';
};

const buildComprehensiveJobSearchCondition = (searchValue) => {
  const rawSearch = String(searchValue || '').trim();
  if (!rawSearch) return null;

  const escapedSearch = escapeRegExp(rawSearch);
  const normalizedSearch = normalizeKeyword(rawSearch);
  const searchRegex = { $regex: escapedSearch, $options: 'i' };

  const conditions = [
    { title: searchRegex },
    { description: searchRegex },
    { requirements: searchRegex },
    { companyName: searchRegex },
    { skillsRequired: searchRegex },
    { category: searchRegex },
    { jobType: searchRegex },
    { workMode: searchRegex },
    { experienceLevel: searchRegex },
    { educationLevel: searchRegex },
    { location: searchRegex },
    { locationCity: searchRegex },
    { locationProvince: searchRegex },
    { perksAndBenefits: searchRegex },
    { otherBenefits: searchRegex },
    { willingToRelocate: searchRegex },
  ];

  if (
    normalizedSearch.includes('fresh grad') ||
    normalizedSearch.includes('fresh graduate') ||
    normalizedSearch.includes('open fresh')
  ) {
    conditions.push({ openToFreshGraduates: true });
  }

  if (
    normalizedSearch.includes('no experience') ||
    normalizedSearch.includes('without experience')
  ) {
    conditions.push({ experienceLevel: 'No experience required' });
  }

  if (normalizedSearch.includes('blended') || normalizedSearch.includes('hybrid')) {
    conditions.push({ workMode: { $regex: 'blended|hybrid', $options: 'i' } });
  }

  if (
    normalizedSearch.includes('work from home') ||
    normalizedSearch === 'wfh'
  ) {
    conditions.push({ workMode: { $regex: 'work from home|wfh', $options: 'i' } });
  }

  if (normalizedSearch.includes('remote')) {
    conditions.push({ workMode: { $regex: 'remote', $options: 'i' } });
  }

  if (
    normalizedSearch.includes('on site') ||
    normalizedSearch.includes('onsite') ||
    normalizedSearch.includes('on-site')
  ) {
    conditions.push({ workMode: { $regex: 'on[- ]?site|onsite', $options: 'i' } });
  }

  if (normalizedSearch.includes('salary undisclosed') || normalizedSearch.includes('hidden salary')) {
    conditions.push({ hideSalary: true });
  }

  if (normalizedSearch.includes('urgent')) {
    conditions.push({ isUrgent: true });
  }

  const hasOneToThreeYears = /1\s*[-–—]\s*3\s*(?:year|years|yr|yrs)/i.test(normalizedSearch);
  const hasFourToFiveYears = /4\s*[-–—]\s*5\s*(?:year|years|yr|yrs)/i.test(normalizedSearch);
  const experienceMatch = normalizedSearch.match(/(?:less than\s*)?(\d+|6\+)\s*(?:year|years|yr|yrs)(?:\s*exp(?:erience)?)?/i);

  if (hasOneToThreeYears) {
    conditions.push({ experienceLevel: buildExperienceLevelQuery('1-3 Years Exp') });
  } else if (hasFourToFiveYears) {
    conditions.push({ experienceLevel: buildExperienceLevelQuery('4-5 Years Exp') });
  } else if (experienceMatch) {
    const experienceNumber = experienceMatch[1];

    if (normalizedSearch.includes('less than')) {
      conditions.push({ experienceLevel: buildExperienceLevelQuery('Less than 1 Yr Exp') });
    } else if (experienceNumber === '6+') {
      conditions.push({ experienceLevel: buildExperienceLevelQuery('6+ Years Exp') });
    } else if (['1', '2', '3'].includes(experienceNumber)) {
      conditions.push({ experienceLevel: buildExperienceLevelQuery('1-3 Years Exp') });
    } else if (['4', '5'].includes(experienceNumber)) {
      conditions.push({ experienceLevel: buildExperienceLevelQuery('4-5 Years Exp') });
    }
  }

  const numericSearch = Number(rawSearch.replace(/[^\d.-]/g, ''));
  if (Number.isFinite(numericSearch) && /\d/.test(rawSearch)) {
    conditions.push(
      { salaryMin: numericSearch },
      { salaryMax: numericSearch },
      {
        $and: [
          { salaryMin: { $lte: numericSearch } },
          { salaryMax: { $gte: numericSearch } }
        ]
      }
    );
  }

  return { $or: conditions };
};

const isCompanyProfileComplete = (employer) => {
  const profile = employer?.employerProfile || {};

  return Boolean(
    String(profile.companyName || '').trim() &&
      String(profile.businessEmail || '').trim() &&
      String(profile.mobileNumber || '').trim() &&
      String(profile.regionCity || '').trim() &&
      String(profile.industry || '').trim() &&
      String(profile.companyAddress || '').trim() &&
      String(profile.companyDescription || '').trim() &&
      String(profile.companyLogo || '').trim()
  );
};

exports.createJob = async (req, res) => {
  try {
    console.log('User creating job:', req.user);

    const {
      title,
      description,
      requirements,
      jobType,
      salaryMin,
      salaryMax,
      hideSalary,
      isUrgent,
      workMode,
      applicationDeadline,
      vacancies,
      skillsRequired,
      experienceLevel,
      status,
      location,
      locationProvince,
      locationCity,
      educationLevel,
      category,
      openToFreshGraduates,
      perksAndBenefits,
      otherBenefits,
      willingToRelocate
    } = req.body;

    if (req.user.role !== 'employer') {
      return res.status(403).json({
        message: 'Only employers can post jobs'
      });
    }

    const employer = await User.findById(req.user._id);
    if (!employer) {
      return res.status(404).json({ message: 'Employer not found' });
    }

    const isDraft = status === 'draft';

    if (!isDraft && !isCompanyProfileComplete(employer)) {
      return res.status(403).json({
        success: false,
        code: 'COMPANY_PROFILE_INCOMPLETE',
        message: 'You have not yet completed your company profile. A complete company profile is required to post a job.',
      });
    }

    const employerVerificationStatus =
      employer?.employerProfile?.verificationDocs?.overallStatus || 'unverified';

    const isEmployerVerified = employerVerificationStatus === 'verified';

    if (!isEmployerVerified && !isDraft) {
      return res.status(403).json({
        success: false,
        code: 'EMPLOYER_NOT_VERIFIED',
        message: 'You can save jobs as draft, but you cannot publish until your company is verified by admin.',
        verificationStatus: employerVerificationStatus
      });
    }

    const manualLocation = String(location || '').trim();
    const provinceValue = String(locationProvince || '').trim();
    const cityValue = String(locationCity || '').trim();
    if (!isDraft && !manualLocation) {
      return res.status(400).json({
        success: false,
        message: 'Location (City) is required.'
      });
    }

    if (!isDraft && (!provinceValue || !cityValue)) {
      return res.status(400).json({
        success: false,
        message: 'Province and City / Municipality are required.'
      });
    }

    const edu = String(educationLevel || '').trim();
    const allowedEducation = [
      "Bachelor’s / College degree graduate's",
      'Master’s degree',
      'Doctorate Degree',
      "Bachelor / College degree graduate's",
      'Master degree',
      'Doctorate degree'
    ];

    if (!isDraft && (!edu || !allowedEducation.includes(edu))) {
      return res.status(400).json({
        success: false,
        message: 'Education level is required and must be valid.'
      });
    }

    const normalizedExperience = normalizeExperienceLevel(experienceLevel);
    if (!isDraft && !normalizedExperience) {
      return res.status(400).json({
        success: false,
        message: 'Experience level is required.'
      });
    }
    if (normalizedExperience && !ALLOWED_EXPERIENCE_LEVELS.includes(normalizedExperience)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid experience level.'
      });
    }

    const allowedRelocateOptions = [
      'Yes - willing to relocate',
      'No - position is fixed location',
      'Open to relocation if necessary',
    ];
    const relocateValue = String(willingToRelocate || '').trim();
    if (!isDraft && !relocateValue) {
      return res.status(400).json({
        success: false,
        message: 'Willing to relocate option is required.'
      });
    }
    if (relocateValue && !allowedRelocateOptions.includes(relocateValue)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid willing to relocate option.'
      });
    }

    const skillsArray = normalizeSkills(skillsRequired);
    const perksArray = normalizePerksAndBenefits(perksAndBenefits);

    const companyLogo = employer.employerProfile?.companyLogo || '';
    const categoryFromEmployer = normalizeCategory(employer.employerProfile?.industry);
    const categoryFromBody = normalizeCategory(category);
    const companyCategory = categoryFromEmployer || categoryFromBody || 'Others';

    const locationImagePath = req.file ? `/uploads/job-location-images/${req.file.filename}` : '';

    const jobData = {
      employer: req.user._id,
      companyName: employer.employerProfile?.companyName || employer.fullName,
      companyLogo: companyLogo,
      status: isDraft ? 'draft' : 'published',
      isPublished: !isDraft,
      isActive: !isDraft,
      isArchived: false,
      archivedAt: null,
      category: companyCategory,
      location: manualLocation,
      locationProvince: provinceValue,
      locationCity: cityValue,

      openToFreshGraduates: parseBool(openToFreshGraduates),
      perksAndBenefits: perksArray,
      otherBenefits: String(otherBenefits || '').trim(),
      locationImage: locationImagePath,
      hideSalary: parseBool(hideSalary),
      isUrgent: parseBool(isUrgent),
    };

    applyIfDefined(jobData, 'title', title);
    applyIfDefined(jobData, 'description', description);
    applyIfDefined(jobData, 'requirements', requirements);
    applyIfNotBlank(jobData, 'jobType', jobType);
    applyIfNotBlank(jobData, 'workMode', workMode);
    applyIfNotBlank(jobData, 'applicationDeadline', applicationDeadline);
    applyIfNotBlank(jobData, 'originalApplicationDeadline', applicationDeadline);
    applyIfNotBlank(jobData, 'vacancies', vacancies);
    applyIfNotBlank(jobData, 'experienceLevel', normalizedExperience);
    applyIfNotBlank(jobData, 'educationLevel', edu);
    applyIfNotBlank(jobData, 'willingToRelocate', relocateValue);

    if (salaryMin !== undefined && salaryMin !== '') jobData.salaryMin = normalizeSalaryAmount(salaryMin);
    if (salaryMax !== undefined && salaryMax !== '') jobData.salaryMax = normalizeSalaryAmount(salaryMax);

    if (skillsArray.length > 0) jobData.skillsRequired = skillsArray;

    const job = new Job(jobData);
    await job.save();

    if (!isDraft) {
      await notificationController.createAdminJobPostedNotification(job, employer);
      await sendJobMatchNotifications(job);
    }

    res.status(201).json({
      success: true,
      message: isDraft ? 'Draft saved successfully!' : 'Job posted successfully!',
      job
    });

  } catch (error) {
    console.error('Error creating job:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating job',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const sendJobMatchNotifications = async (job) => {
  try {
    console.log(`Starting job match notifications for job: ${job.title}`);

    const jobseekers = await User.find({
      role: 'jobseeker',
      isActive: true
    }).select('_id jobSeekerProfile');

    console.log(`Found ${jobseekers.length} active jobseekers for matching`);

    let notificationCount = 0;

    for (const jobseeker of jobseekers) {
      const match = calculateJobMatchForUser(job, jobseeker);

      if (match.score <= 0) continue;

      try {
        await notificationController.createJobMatchNotification(jobseeker._id, job, match);
        notificationCount++;
        console.log(`Notification sent to jobseeker: ${jobseeker._id}`);
      } catch (notifError) {
        console.error(`Error sending notification to ${jobseeker._id}:`, notifError);
      }
    }

    console.log(`✅ Job match notifications completed. Sent ${notificationCount} notifications for job: ${job.title}`);

  } catch (error) {
    console.error('Error in sendJobMatchNotifications:', error);
  }
};

exports.getAllJobs = async (req, res) => {
  try {
    let query = {
      isPublished: true,
      isActive: true,
      $or: [
        { isArchived: false },
        { isArchived: { $exists: false } }
      ]
    };

    if (req.query.search) {
      const searchCondition = buildComprehensiveJobSearchCondition(req.query.search);
      if (searchCondition) {
        query.$and = query.$and || [];
        query.$and.push(searchCondition);
      }
    }

    if (req.query.title) {
      query.title = { $regex: `^${String(req.query.title).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' };
    }

    if (req.query.company) {
      query.companyName = { $regex: `^${String(req.query.company).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' };
    }

    if (req.query.jobType) query.jobType = req.query.jobType;
    if (req.query.educationLevel) query.educationLevel = req.query.educationLevel;

    if (req.query.industry) query.category = normalizeCategory(req.query.industry);
    else if (req.query.category) query.category = normalizeCategory(req.query.category);

    if (req.query.workMode) query.workMode = req.query.workMode;
    if (req.query.location) {
      const rawLocation = String(req.query.location || '').trim();
      const escapedLocation = escapeRegExp(rawLocation);
      const locationPattern = `(^|,\\s*)${escapedLocation}(?:\\s+City)?(\\s*,|$)`;

      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { locationCity: { $regex: `^${escapedLocation}$`, $options: 'i' } },
          { locationProvince: { $regex: `^${escapedLocation}$`, $options: 'i' } },
          { location: { $regex: locationPattern, $options: 'i' } }
        ]
      });
    }
    if (req.query.experienceLevel) query.experienceLevel = buildExperienceLevelQuery(req.query.experienceLevel);

    const wantFreshGraduate = parseBool(req.query.freshGraduate);
    const wantNoExperience = parseBool(req.query.noExperience);

    if (wantFreshGraduate) {
      query.openToFreshGraduates = true;
    }

    if (wantNoExperience) {
      query.experienceLevel = 'No experience required';
    }

    const hasMin = req.query.minSalary !== undefined && req.query.minSalary !== '';
    const hasMax = req.query.maxSalary !== undefined && req.query.maxSalary !== '';

    if (hasMin || hasMax) {
      let min = hasMin ? Number(req.query.minSalary) : null;
      let max = hasMax ? Number(req.query.maxSalary) : null;

      if (min !== null && max !== null && !Number.isNaN(min) && !Number.isNaN(max) && min > max) {
        const temp = min;
        min = max;
        max = temp;
      }

      query.$and = query.$and || [];

      if (min !== null && !Number.isNaN(min)) {
        query.$and.push({
          $or: [
            { salaryMax: { $gte: min } },
            { salaryMax: { $exists: false } },
            { salaryMax: null }
          ]
        });
      }

      if (max !== null && !Number.isNaN(max)) {
        query.$and.push({
          $or: [
            { salaryMin: { $lte: max } },
            { salaryMin: { $exists: false } },
            { salaryMin: null }
          ]
        });
      }
    }

    const jobs = await Job.find(query)
      .populate({
        path: 'employer',
        select: 'fullName email employerProfile.companyLogo employerProfile.companyAddress employerProfile.country employerProfile.regionCity employerProfile.companyWebsiteUrl'
      })
      .sort({ createdAt: -1 });

    const transformedJobs = jobs.map(job => {
      const jobObj = job.toObject();

      if (!jobObj.companyLogo && jobObj.employer?.employerProfile?.companyLogo) {
        jobObj.companyLogo = jobObj.employer.employerProfile.companyLogo;
      }
      if (!jobObj.companyLogo) jobObj.companyLogo = '';

      const loc = String(jobObj.location || '').trim();
      if (!loc || loc === 'Not specified') {
        const employerProfile = jobObj.employer?.employerProfile;
        jobObj.location = buildCompanyLocation(employerProfile);
      }

      return jobObj;
    });

    res.status(200).json({
      success: true,
      count: transformedJobs.length,
      jobs: transformedJobs
    });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching jobs'
    });
  }
};


exports.getRecommendedJobs = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('jobSeekerProfile role isActive');

    if (!user || user.role !== 'jobseeker') {
      return res.status(403).json({
        success: false,
        message: 'Only jobseekers can access recommended jobs'
      });
    }

    let query = {
      isPublished: true,
      isActive: true,
      status: 'published',
      $or: [
        { isArchived: false },
        { isArchived: { $exists: false } }
      ]
    };

    if (req.query.search) {
      const searchCondition = buildComprehensiveJobSearchCondition(req.query.search);
      if (searchCondition) {
        query.$and = query.$and || [];
        query.$and.push(searchCondition);
      }
    }

    if (req.query.title) {
      query.title = { $regex: `^${escapeRegExp(req.query.title)}$`, $options: 'i' };
    }

    if (req.query.company) {
      query.companyName = { $regex: `^${escapeRegExp(req.query.company)}$`, $options: 'i' };
    }

    if (req.query.jobType) query.jobType = req.query.jobType;
    if (req.query.educationLevel) query.educationLevel = req.query.educationLevel;
    if (req.query.industry) query.category = normalizeCategory(req.query.industry);
    else if (req.query.category) query.category = normalizeCategory(req.query.category);
    if (req.query.workMode) query.workMode = req.query.workMode;
    if (req.query.location) query.location = { $regex: req.query.location, $options: 'i' };
    if (req.query.experienceLevel) query.experienceLevel = buildExperienceLevelQuery(req.query.experienceLevel);

    const wantFreshGraduate = parseBool(req.query.freshGraduate);
    const wantNoExperience = parseBool(req.query.noExperience);

    if (wantFreshGraduate) {
      query.openToFreshGraduates = true;
    }

    if (wantNoExperience) {
      query.experienceLevel = 'No experience required';
    }

    const hasMin = req.query.minSalary !== undefined && req.query.minSalary !== '';
    const hasMax = req.query.maxSalary !== undefined && req.query.maxSalary !== '';

    if (hasMin || hasMax) {
      let min = hasMin ? Number(req.query.minSalary) : null;
      let max = hasMax ? Number(req.query.maxSalary) : null;

      if (min !== null && max !== null && !Number.isNaN(min) && !Number.isNaN(max) && min > max) {
        const temp = min;
        min = max;
        max = temp;
      }

      query.$and = query.$and || [];

      if (min !== null && !Number.isNaN(min)) {
        query.$and.push({
          $or: [
            { salaryMax: { $gte: min } },
            { salaryMax: { $exists: false } },
            { salaryMax: null }
          ]
        });
      }

      if (max !== null && !Number.isNaN(max)) {
        query.$and.push({
          $or: [
            { salaryMin: { $lte: max } },
            { salaryMin: { $exists: false } },
            { salaryMin: null }
          ]
        });
      }
    }

    const jobs = await Job.find(query)
      .populate({
        path: 'employer',
        select: 'fullName email employerProfile.companyLogo employerProfile.companyAddress employerProfile.country employerProfile.regionCity employerProfile.companyWebsiteUrl'
      })
      .sort({ createdAt: -1 });

    const transformedJobs = attachRecommendationData(jobs, user).map((jobObj) => {
      if (!jobObj.companyLogo && jobObj.employer?.employerProfile?.companyLogo) {
        jobObj.companyLogo = jobObj.employer.employerProfile.companyLogo;
      }
      if (!jobObj.companyLogo) jobObj.companyLogo = '';

      const loc = String(jobObj.location || '').trim();
      if (!loc || loc === 'Not specified') {
        const employerProfile = jobObj.employer?.employerProfile;
        jobObj.location = buildCompanyLocation(employerProfile);
      }

      return jobObj;
    }).sort((a, b) => {
      const scoreDiff = Number(b.matchScore || 0) - Number(a.matchScore || 0);
      if (scoreDiff !== 0) return scoreDiff;
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });

    res.status(200).json({
      success: true,
      count: transformedJobs.length,
      jobs: transformedJobs,
      recommendationContext: {
        hasProfileKeywords: buildJobseekerMatchKeywords(user).length > 0
      }
    });
  } catch (error) {
    console.error('Error fetching recommended jobs:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching recommended jobs'
    });
  }
};


exports.getJobById = async (req, res) => {
  try {
    console.log('Fetching job by ID:', req.params.id);

    const job = await Job.findById(req.params.id);

    if (!job) {
      console.log('Job not found:', req.params.id);
      return res.status(404).json({ message: 'Job not found' });
    }

    console.log('Job found:', job.title);

    let employerDetails = null;
    try {
      const employer = await User.findById(job.employer).select('employerProfile');
      if (employer && employer.employerProfile) {
        employerDetails = {
          companyLogo: employer.employerProfile.companyLogo || '',
          coverPhoto: employer.employerProfile.coverPhoto || '',
          companyAddress: employer.employerProfile.companyAddress || '',
          industry: employer.employerProfile.industry || '',
          companyWebsite: employer.employerProfile.companyWebsiteUrl || '',
          country: employer.employerProfile.country || '',
          regionCity: employer.employerProfile.regionCity || ''
        };
      }
    } catch (employerError) {
      console.error('Error fetching employer details:', employerError);
    }

    const jobResponse = job.toObject();

    if (employerDetails) {
      if (!jobResponse.companyLogo && employerDetails.companyLogo) {
        jobResponse.companyLogo = employerDetails.companyLogo;
      }
      jobResponse.employerDetails = employerDetails;
    }

    res.status(200).json({
      success: true,
      job: jobResponse
    });
  } catch (error) {
    console.error('Error fetching job by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching job'
    });
  }
};

exports.getEmployerJobs = async (req, res) => {
  try {
    const employer = await User.findById(req.user._id);
    const employerLogo = employer?.employerProfile?.companyLogo || '';

    const archivedFilter = parseBool(req.query.archived);

    const baseQuery = { employer: req.user._id };

    const filterQuery = archivedFilter
      ? { employer: req.user._id, isArchived: true }
      : {
          employer: req.user._id,
          $or: [
            { isArchived: false },
            { isArchived: { $exists: false } }
          ]
        };

    const [jobs, activeCount, archivedCount] = await Promise.all([
      Job.find(filterQuery)
        .select(
          'title location jobType workMode category isActive isPublished status createdAt updatedAt companyLogo companyName applicationCount applicationDeadline originalApplicationDeadline deadlineExtendedAt salaryMin salaryMax vacancies openToFreshGraduates perksAndBenefits otherBenefits willingToRelocate locationImage educationLevel experienceLevel isArchived statusBeforeArchive archivedAt'
        )
        .sort({ createdAt: -1 }),
      Job.countDocuments({
        ...baseQuery,
        $or: [
          { isArchived: false },
          { isArchived: { $exists: false } }
        ]
      }),
      Job.countDocuments({ ...baseQuery, isArchived: true }),
    ]);

    const jobsWithLogo = jobs.map(job => {
      const jobObj = job.toObject();

      if (!jobObj.companyLogo && employerLogo) {
        jobObj.companyLogo = employerLogo;
      }

      return jobObj;
    });

    res.status(200).json({
      success: true,
      count: jobsWithLogo.length,
      activeCount,
      archivedCount,
      jobs: jobsWithLogo
    });
  } catch (error) {
    console.error('Error fetching employer jobs:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching your jobs'
    });
  }
};

exports.updateJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    if (job.employer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this job' });
    }

    const employer = await User.findById(req.user._id);
    const currentLogo = employer?.employerProfile?.companyLogo || '';

    const wasDraft = job.isPublished === false;
    const previousApplicationDeadline = job.applicationDeadline
      ? new Date(job.applicationDeadline)
      : null;

    if (req.body.applicationDeadline !== undefined) {
      const cleanDeadline = String(req.body.applicationDeadline || '').trim();
      const nextApplicationDeadline = cleanDeadline ? new Date(cleanDeadline) : null;
      const previousDeadlineIsValid =
        previousApplicationDeadline &&
        !Number.isNaN(previousApplicationDeadline.getTime());
      const nextDeadlineIsValid =
        nextApplicationDeadline &&
        !Number.isNaN(nextApplicationDeadline.getTime());

      if (nextDeadlineIsValid) {
        if (!job.originalApplicationDeadline) {
          job.originalApplicationDeadline = previousDeadlineIsValid
            ? previousApplicationDeadline
            : nextApplicationDeadline;
        }

        if (
          previousDeadlineIsValid &&
          previousApplicationDeadline.getTime() < Date.now() &&
          nextApplicationDeadline.getTime() > previousApplicationDeadline.getTime()
        ) {
          job.deadlineExtendedAt = new Date();
        }
      }
    }

    if (req.body.skillsRequired !== undefined) {
      job.skillsRequired = normalizeSkills(req.body.skillsRequired);
    }

    if (req.body.perksAndBenefits !== undefined) {
      job.perksAndBenefits = normalizePerksAndBenefits(req.body.perksAndBenefits);
    }

    const employerVerificationStatus =
      employer?.employerProfile?.verificationDocs?.overallStatus || 'unverified';
    const isEmployerVerified = employerVerificationStatus === 'verified';
    const wantsToPublish =
      req.body.status === 'published' ||
      req.body.isPublished === true;

    if (wantsToPublish && !isCompanyProfileComplete(employer)) {
      return res.status(403).json({
        success: false,
        code: 'COMPANY_PROFILE_INCOMPLETE',
        message: 'You have not yet completed your company profile. A complete company profile is required to post a job.',
      });
    }

    if (wantsToPublish && !isEmployerVerified) {
      return res.status(403).json({
        success: false,
        code: 'EMPLOYER_NOT_VERIFIED',
        message: 'You cannot publish jobs until your company is verified by admin.',
        verificationStatus: employerVerificationStatus
      });
    }

    if (wantsToPublish) {
      const manualLocation = String(req.body.location || job.location || '').trim();
      const provinceValue = String(req.body.locationProvince || job.locationProvince || '').trim();
      const cityValue = String(req.body.locationCity || job.locationCity || '').trim();
      if (!manualLocation) {
        return res.status(400).json({
          success: false,
          message: 'Complete work address is required.'
        });
      }
      if (!provinceValue || !cityValue) {
        return res.status(400).json({
          success: false,
          message: 'Province and City / Municipality are required.'
        });
      }
    }

    if (wantsToPublish) {
      const edu = String(req.body.educationLevel || job.educationLevel || '').trim();
      const allowedEducation = [
        "Bachelor’s / College degree graduate's",
        'Master’s degree',
        'Doctorate Degree',
        "Bachelor / College degree graduate's",
        'Master degree',
        'Doctorate degree'
      ];

      if (!edu || !allowedEducation.includes(edu)) {
        return res.status(400).json({
          success: false,
          message: 'Education level is required and must be valid.'
        });
      }
    }

    if (wantsToPublish) {
      const experienceValue = normalizeExperienceLevel(
        req.body.experienceLevel !== undefined ? req.body.experienceLevel : job.experienceLevel
      );

      if (!experienceValue || !ALLOWED_EXPERIENCE_LEVELS.includes(experienceValue)) {
        return res.status(400).json({
          success: false,
          message: 'Experience level is required and must be valid.'
        });
      }

      const allowedRelocateOptions = [
        'Yes - willing to relocate',
        'No - position is fixed location',
        'Open to relocation if necessary',
      ];
      const relocateValue = String(
        req.body.willingToRelocate !== undefined
          ? req.body.willingToRelocate
          : job.willingToRelocate || ''
      ).trim();

      if (!relocateValue || !allowedRelocateOptions.includes(relocateValue)) {
        return res.status(400).json({
          success: false,
          message: 'Willing to relocate option is required and must be valid.'
        });
      }
    }

    if (req.body.experienceLevel !== undefined) {
      const expValue = normalizeExperienceLevel(req.body.experienceLevel);
      if (expValue && !ALLOWED_EXPERIENCE_LEVELS.includes(expValue)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid experience level.'
        });
      }
    }

    if (req.body.willingToRelocate !== undefined) {
      const allowedRelocateOptions = [
        'Yes - willing to relocate',
        'No - position is fixed location',
        'Open to relocation if necessary',
      ];
      const relocateValue = String(req.body.willingToRelocate || '').trim();
      if (relocateValue && !allowedRelocateOptions.includes(relocateValue)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid willing to relocate option.'
        });
      }
    }

    if (req.body.status) {
      if (req.body.status === 'draft') {
        job.status = 'draft';
        job.isPublished = false;
        job.isActive = false;
      } else if (req.body.status === 'published') {
        job.status = 'published';
        job.isPublished = true;
        if (req.body.isActive === undefined) job.isActive = true;
      }
    }

    if (req.body.salaryMin !== undefined) {
      job.salaryMin = req.body.salaryMin === '' ? undefined : normalizeSalaryAmount(req.body.salaryMin);
    }

    if (req.body.salaryMax !== undefined) {
      job.salaryMax = req.body.salaryMax === '' ? undefined : normalizeSalaryAmount(req.body.salaryMax);
    }

    Object.keys(req.body).forEach(key => {
      if (key === 'companyLogo') return;
      if (key === 'skillsRequired') return;
      if (key === 'perksAndBenefits') return;
      if (key === 'status') return;
      if (key === 'salaryMin') return;
      if (key === 'salaryMax') return;
      if (key === 'statusBeforeArchive') return;

      if (key === 'experienceLevel') {
        const normalizedValue = normalizeExperienceLevel(req.body.experienceLevel);
        job.set('experienceLevel', normalizedValue || undefined);
        return;
      }

      if (['jobType', 'workMode', 'educationLevel', 'willingToRelocate'].includes(key)) {
        const cleanValue = String(req.body[key] || '').trim();
        job.set(key, cleanValue || undefined);
        return;
      }

      if (key === 'applicationDeadline') {
        const cleanValue = String(req.body.applicationDeadline || '').trim();
        job.set('applicationDeadline', cleanValue || undefined);
        return;
      }

      if (key === 'vacancies') {
        const cleanValue = String(req.body.vacancies || '').trim();
        job.set('vacancies', cleanValue ? Number(cleanValue) : undefined);
        return;
      }

      if (key === 'category') {
        job.category = normalizeCategory(req.body.category);
        return;
      }

      if (key === 'openToFreshGraduates') {
        job.openToFreshGraduates = parseBool(req.body.openToFreshGraduates);
        return;
      }

      if (key === 'hideSalary' || key === 'isUrgent') {
        job[key] = parseBool(req.body[key]);
        return;
      }

      job[key] = req.body[key];
    });

    if (req.file) {
      job.locationImage = `/uploads/job-location-images/${req.file.filename}`;
    }

    if (currentLogo && currentLogo !== job.companyLogo) {
      job.companyLogo = currentLogo;
    }

    if (employer?.employerProfile?.companyName && employer.employerProfile.companyName !== job.companyName) {
      job.companyName = employer.employerProfile.companyName;
    }

    if (
      job.statusBeforeArchive === null ||
      String(job.statusBeforeArchive || '').trim() === ''
    ) {
      job.statusBeforeArchive = undefined;
    }

    await job.save();

    const nowPublished = job.isPublished === true;
    if (wasDraft && nowPublished) {
      await sendJobMatchNotifications(job);
    }

    res.status(200).json({
      success: true,
      message: 'Job updated successfully',
      job
    });
  } catch (error) {
    console.error('Error updating job:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating job'
    });
  }
};

exports.deleteJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    if (job.employer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to archive this job' });
    }

    const statusBeforeArchive = getStatusBeforeArchive(job);

    job.statusBeforeArchive = statusBeforeArchive;
    job.isArchived = true;
    job.archivedAt = new Date();
    job.isActive = false;

    await job.save();

    res.status(200).json({
      success: true,
      message: 'Job archived successfully',
      archivedStatus: statusBeforeArchive,
      job
    });
  } catch (error) {
    console.error('Error archiving job:', error);
    res.status(500).json({
      success: false,
      message: 'Error archiving job'
    });
  }
};

exports.restoreJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    if (job.employer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to restore this job' });
    }

    const archivedStatus =
      String(job.statusBeforeArchive || '').trim().toLowerCase() ||
      getStatusBeforeArchive(job);

    const restoredStatus = archivedStatus === 'open' ? 'closed' : archivedStatus;

    job.isArchived = false;
    job.archivedAt = null;

    if (restoredStatus === 'draft') {
      job.status = 'draft';
      job.isPublished = false;
      job.isActive = false;
    } else if (restoredStatus === 'expired') {
      job.status = 'published';
      job.isPublished = true;
      job.isActive = false;
    } else if (restoredStatus === 'filled') {
      job.status = 'filled';
      job.isPublished = true;
      job.isActive = false;
    } else {
      job.status = 'closed';
      job.isPublished = true;
      job.isActive = false;
    }

    await job.save();

    res.status(200).json({
      success: true,
      message: `Job restored as ${restoredStatus === 'draft' ? 'Draft' : restoredStatus.charAt(0).toUpperCase() + restoredStatus.slice(1)}`,
      restoredStatus,
      job
    });
  } catch (error) {
    console.error('Error restoring job:', error);
    res.status(500).json({
      success: false,
      message: 'Error restoring job'
    });
  }
};

exports.updateJobStatus = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    if (job.employer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update job status' });
    }

    const shouldActivate = Boolean(req.body.isActive);

    job.isActive = shouldActivate;

    if (shouldActivate) {
      job.status = 'published';
      job.isPublished = true;
      job.filledAt = null;
      job.filledReason = '';
    } else if (String(job.status || '').toLowerCase() !== 'filled') {
      job.status = 'closed';
    }

    await job.save();

    res.status(200).json({
      success: true,
      message: `Job ${shouldActivate ? 'activated' : 'closed'} successfully`,
      job
    });
  } catch (error) {
    console.error('Error updating job status:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating job status'
    });
  }
};

// ✅ SAVE JOB
exports.saveJob = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'jobseeker') {
      return res.status(403).json({
        success: false,
        message: 'Only job seekers can save jobs'
      });
    }

    const job = await Job.findById(req.params.jobId);
    if (!job || !job.isPublished || !job.isActive || job.isArchived) {
      return res.status(404).json({
        success: false,
        message: 'Job not found or unavailable'
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const alreadySaved = (user.savedJobs || []).some(
      savedJobId => savedJobId.toString() === job._id.toString()
    );

    if (alreadySaved) {
      return res.status(200).json({
        success: true,
        alreadySaved: true,
        message: 'Job already saved'
      });
    }

    user.savedJobs.push(job._id);
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Job saved successfully'
    });
  } catch (error) {
    console.error('Error saving job:', error);
    return res.status(500).json({
      success: false,
      message: 'Error saving job'
    });
  }
};

// ✅ REMOVE SAVED JOB
exports.removeSavedJob = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'jobseeker') {
      return res.status(403).json({
        success: false,
        message: 'Only job seekers can manage saved jobs'
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.savedJobs = (user.savedJobs || []).filter(
      savedJobId => savedJobId.toString() !== req.params.jobId
    );

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Saved job removed successfully'
    });
  } catch (error) {
    console.error('Error removing saved job:', error);
    return res.status(500).json({
      success: false,
      message: 'Error removing saved job'
    });
  }
};

// ✅ GET ALL SAVED JOBS
exports.getSavedJobs = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'jobseeker') {
      return res.status(403).json({
        success: false,
        message: 'Only job seekers can view saved jobs'
      });
    }

    const user = await User.findById(req.user._id).populate({
      path: 'savedJobs',
      match: {
        isPublished: true,
        isActive: true,
        $or: [
          { isArchived: false },
          { isArchived: { $exists: false } }
        ]
      },
      populate: {
        path: 'employer',
        select: 'fullName email employerProfile.companyLogo employerProfile.companyAddress employerProfile.country employerProfile.regionCity employerProfile.companyWebsiteUrl'
      },
      options: { sort: { createdAt: -1 } }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const jobs = (user.savedJobs || []).map(job => {
      const jobObj = job.toObject ? job.toObject() : job;

      if (!jobObj.companyLogo && jobObj.employer?.employerProfile?.companyLogo) {
        jobObj.companyLogo = jobObj.employer.employerProfile.companyLogo;
      }
      if (!jobObj.companyLogo) jobObj.companyLogo = '';

      const loc = String(jobObj.location || '').trim();
      if (!loc || loc === 'Not specified') {
        const employerProfile = jobObj.employer?.employerProfile;
        jobObj.location = buildCompanyLocation(employerProfile);
      }

      return jobObj;
    });

    return res.status(200).json({
      success: true,
      count: jobs.length,
      jobs
    });
  } catch (error) {
    console.error('Error fetching saved jobs:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching saved jobs'
    });
  }
};

// ✅ CHECK IF JOB IS SAVED
exports.checkSavedJob = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'jobseeker') {
      return res.status(403).json({
        success: false,
        message: 'Only job seekers can check saved jobs'
      });
    }

    const user = await User.findById(req.user._id).select('savedJobs');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const isSaved = (user.savedJobs || []).some(
      savedJobId => savedJobId.toString() === req.params.jobId
    );

    return res.status(200).json({
      success: true,
      isSaved
    });
  } catch (error) {
    console.error('Error checking saved job:', error);
    return res.status(500).json({
      success: false,
      message: 'Error checking saved job'
    });
  }
};

exports.permanentlyDeleteJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    if (job.employer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to permanently delete this job' });
    }

    await job.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Job permanently deleted successfully'
    });
  } catch (error) {
    console.error('Error permanently deleting job:', error);
    res.status(500).json({
      success: false,
      message: 'Error permanently deleting job'
    });
  }
};