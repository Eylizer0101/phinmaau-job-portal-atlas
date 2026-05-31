const Job = require('../models/Job');
const User = require('../models/User');
const notificationController = require('./notificationController');

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

const applyIfDefined = (obj, key, value) => {
  if (value !== undefined) obj[key] = value;
};

const normalizeExperienceLevel = (level) => {
  return String(level || '').trim();
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
      workMode,
      applicationDeadline,
      vacancies,
      skillsRequired,
      experienceLevel,
      status,
      location,
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
    if (!isDraft && !manualLocation) {
      return res.status(400).json({
        success: false,
        message: 'Location (City) is required.'
      });
    }

    const edu = String(educationLevel || '').trim();
    const allowedEducation = [
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

    const allowedExperienceLevels = [
      'No experience required',
      '1 year',
      '2 years',
      '3 years',
      '4 years',
      '5 years',
      '6+ years',
    ];
    const normalizedExperience = normalizeExperienceLevel(experienceLevel);
    if (normalizedExperience && !allowedExperienceLevels.includes(normalizedExperience)) {
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
    const relocateValue = String(willingToRelocate || 'No - position is fixed location').trim() || 'No - position is fixed location';
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
      location: manualLocation || (isDraft ? buildCompanyLocation(employer.employerProfile) : manualLocation),

      openToFreshGraduates: parseBool(openToFreshGraduates),
      perksAndBenefits: perksArray,
      otherBenefits: String(otherBenefits || '').trim(),
      willingToRelocate: relocateValue,
      locationImage: locationImagePath,
    };

    applyIfDefined(jobData, 'title', title);
    applyIfDefined(jobData, 'description', description);
    applyIfDefined(jobData, 'requirements', requirements);
    applyIfDefined(jobData, 'jobType', jobType);
    applyIfDefined(jobData, 'workMode', workMode);
    applyIfDefined(jobData, 'applicationDeadline', applicationDeadline);
    applyIfDefined(jobData, 'vacancies', vacancies);

    jobData.experienceLevel = normalizedExperience || 'No experience required';
    jobData.educationLevel = edu || "Bachelor / College degree graduate's";

    if (salaryMin !== undefined && salaryMin !== '') jobData.salaryMin = salaryMin;
    if (salaryMax !== undefined && salaryMax !== '') jobData.salaryMax = salaryMax;

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

    if (!job.skillsRequired || job.skillsRequired.length === 0) {
      console.log('No skills required for this job, skipping notifications');
      return;
    }

    const jobseekers = await User.find({
      role: 'jobseeker',
      isActive: true,
      'jobSeekerProfile.skills': { $exists: true, $ne: [] }
    }).select('_id jobSeekerProfile.skills');

    console.log(`Found ${jobseekers.length} active jobseekers with skills`);

    let notificationCount = 0;
    const jobSkills = job.skillsRequired.map(skill => skill.toLowerCase().trim());

    for (const jobseeker of jobseekers) {
      const jobseekerSkills = jobseeker.jobSeekerProfile?.skills || [];

      if (jobseekerSkills.length === 0) continue;

      const jobseekerSkillsLower = jobseekerSkills.map(skill => skill.toLowerCase().trim());

      const hasMatch = jobseekerSkillsLower.some(jobseekerSkill => {
        return jobSkills.some(jobSkill => {
          return jobseekerSkill === jobSkill ||
            jobseekerSkill.includes(jobSkill) ||
            jobSkill.includes(jobseekerSkill);
        });
      });

      if (hasMatch) {
        try {
          await notificationController.createJobMatchNotification(jobseeker._id, job);
          notificationCount++;
          console.log(`Notification sent to jobseeker: ${jobseeker._id}`);
        } catch (notifError) {
          console.error(`Error sending notification to ${jobseeker._id}:`, notifError);
        }
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
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { title: { $regex: req.query.search, $options: 'i' } },
          { description: { $regex: req.query.search, $options: 'i' } },
          { companyName: { $regex: req.query.search, $options: 'i' } },
          { skillsRequired: { $regex: req.query.search, $options: 'i' } }
        ]
      });
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
    if (req.query.location) query.location = { $regex: req.query.location, $options: 'i' };
    if (req.query.experienceLevel) query.experienceLevel = req.query.experienceLevel;

    const wantFreshGraduate = parseBool(req.query.freshGraduate);
    const wantNoExperience = parseBool(req.query.noExperience);

    if (wantFreshGraduate || wantNoExperience) {
      const orConditions = [];

      if (wantFreshGraduate) {
        orConditions.push({ openToFreshGraduates: true });
      }

      if (wantNoExperience) {
        orConditions.push({ experienceLevel: 'No experience required' });
      }

      query.$and = query.$and || [];
      query.$and.push({ $or: orConditions });
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
    const employerLocation = buildCompanyLocation(employer?.employerProfile);

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
          'title location jobType workMode category isActive isPublished status createdAt updatedAt companyLogo companyName applicationCount applicationDeadline salaryMin salaryMax vacancies openToFreshGraduates perksAndBenefits otherBenefits willingToRelocate locationImage educationLevel experienceLevel isArchived archivedAt'
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

      const loc = String(jobObj.location || '').trim();
      if (!loc || loc === 'Not specified') {
        jobObj.location = employerLocation;
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
      if (!manualLocation) {
        return res.status(400).json({
          success: false,
          message: 'Location (City) is required.'
        });
      }
    }

    if (wantsToPublish) {
      const edu = String(req.body.educationLevel || job.educationLevel || '').trim();
      const allowedEducation = [
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

    if (req.body.experienceLevel !== undefined) {
      const allowedExperienceLevels = [
        'No experience required',
        '1 year',
        '2 years',
        '3 years',
        '4 years',
        '5 years',
        '6+ years',
      ];
      const expValue = String(req.body.experienceLevel || '').trim();
      if (expValue && !allowedExperienceLevels.includes(expValue)) {
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

    Object.keys(req.body).forEach(key => {
      if (key === 'companyLogo') return;
      if (key === 'skillsRequired') return;
      if (key === 'perksAndBenefits') return;
      if (key === 'status') return;

      if (key === 'experienceLevel') {
        job.experienceLevel = normalizeExperienceLevel(req.body.experienceLevel);
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

    job.isArchived = true;
    job.archivedAt = new Date();

    if (job.isPublished) {
      job.isActive = false;
    }

    await job.save();

    res.status(200).json({
      success: true,
      message: 'Job archived successfully',
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

    job.isArchived = false;
    job.archivedAt = null;

    if (job.isPublished) {
      job.isActive = true;
      job.status = 'published';
    } else {
      job.isActive = false;
      job.status = 'draft';
    }

    await job.save();

    res.status(200).json({
      success: true,
      message: 'Job restored successfully',
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

    job.isActive = req.body.isActive;

    await job.save();

    res.status(200).json({
      success: true,
      message: `Job ${req.body.isActive ? 'activated' : 'closed'} successfully`,
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