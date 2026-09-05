// backend/controllers/companyController.js
const User = require('../models/User');
const Job = require('../models/Job');
const Application = require('../models/Application');

// helper: safe regex
const escapeRegex = (s) => String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeBooleanValue = (value, fallback = true) => {
  if (typeof value === 'boolean') return value;

  const normalized = String(value ?? '').trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;

  return fallback;
};

const getApplicationDeadlineStartInManila = (value) => {
  if (!value) return null;

  const deadline = new Date(value);
  if (Number.isNaN(deadline.getTime())) return null;

  const rawValue = String(value).trim();
  const dateMatch = rawValue.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const year = dateMatch ? Number(dateMatch[1]) : deadline.getUTCFullYear();
  const monthIndex = dateMatch ? Number(dateMatch[2]) - 1 : deadline.getUTCMonth();
  const day = dateMatch ? Number(dateMatch[3]) : deadline.getUTCDate();

  return Date.UTC(year, monthIndex, day - 1, 16);
};

const isPublicJobOpen = (job, now = new Date()) => {
  if (!job) return false;
  if (job.isPublished !== true || job.isActive !== true || job.isArchived === true) return false;
  if (String(job.status || '').trim().toLowerCase() !== 'published') return false;

  const deadlineStart = getApplicationDeadlineStartInManila(job.applicationDeadline);
  return deadlineStart === null || now.getTime() < deadlineStart;
};

const buildReviewerName = (user) => {
  const fullName = String(user?.fullName || '').trim();
  if (fullName) return fullName;

  const firstName = String(user?.firstName || '').trim();
  const lastName = String(user?.lastName || '').trim();
  const combined = [firstName, lastName].filter(Boolean).join(' ').trim();
  if (combined) return combined;

  const username = String(user?.username || '').trim();
  if (username) return username;

  const email = String(user?.email || '').trim();
  if (email) return email.split('@')[0];

  return 'Anonymous User';
};

const getReviewerProfileImageMap = async (reviews = []) => {
  const safeReviews = Array.isArray(reviews) ? reviews : [];
  const reviewerIds = Array.from(
    new Set(
      safeReviews
        .map((review) => review?.reviewer)
        .filter(Boolean)
        .map((reviewerId) => String(reviewerId))
    )
  );

  if (!reviewerIds.length) return new Map();

  const reviewers = await User.find({
    _id: { $in: reviewerIds },
    status: { $ne: 'deleted' },
  })
    .select('_id profileImage')
    .lean();

  const profileImageMap = new Map(
    reviewers.map((reviewer) => [
      String(reviewer._id),
      String(reviewer.profileImage || '').trim(),
    ])
  );

  const reviewsWithoutCurrentImage = safeReviews.filter(
    (review) => !profileImageMap.get(String(review?.reviewer || '')) && review?.application
  );

  if (reviewsWithoutCurrentImage.length) {
    const applicationIds = reviewsWithoutCurrentImage.map((review) => review.application);
    const applications = await Application.find({ _id: { $in: applicationIds } })
      .select('_id jobseeker resumeSnapshot')
      .lean();
    const applicationMap = new Map(
      applications.map((application) => [String(application._id), application])
    );

    reviewsWithoutCurrentImage.forEach((review) => {
      const application = applicationMap.get(String(review.application));
      const snapshotImage = String(application?.resumeSnapshot?.user?.profileImage || '').trim();
      const reviewerId = String(review?.reviewer || application?.jobseeker || '');

      if (reviewerId && snapshotImage && !profileImageMap.get(reviewerId)) {
        profileImageMap.set(reviewerId, snapshotImage);
      }
    });
  }

  return profileImageMap;
};

const computeReviewSummary = (reviews = []) => {
  const safeReviews = Array.isArray(reviews) ? reviews : [];
  const reviewCount = safeReviews.length;

  if (!reviewCount) {
    return {
      rating: 0,
      reviewCount: 0,
    };
  }

  const total = safeReviews.reduce((sum, review) => sum + (Number(review?.processRating ?? review?.rating) || 0), 0);
  const rating = total / reviewCount;

  return {
    rating: Number(rating.toFixed(1)),
    reviewCount,
  };
};

const computeRatingBreakdown = (reviews = []) => {
  const safeReviews = Array.isArray(reviews) ? reviews : [];
  const breakdown = {
    5: 0,
    4: 0,
    3: 0,
    2: 0,
    1: 0,
  };

  safeReviews.forEach((review) => {
    const numericRating = Number(review?.processRating ?? review?.rating) || 0;
    const star = Math.max(1, Math.min(5, Math.round(numericRating)));

    if (breakdown[star] !== undefined) {
      breakdown[star] += 1;
    }
  });

  return breakdown;
};

const getReviewEligibility = async (companyId, jobseekerId, reviews = []) => {
  const applications = await Application.find({
    employer: companyId,
    jobseeker: jobseekerId,
  })
    .select('_id job')
    .populate('job', 'title')
    .sort({ createdAt: -1 })
    .lean();

  const jobseekerReviews = (Array.isArray(reviews) ? reviews : []).filter(
    (review) => String(review?.reviewer) === String(jobseekerId)
  );
  const reviewedApplicationIds = new Set(
    jobseekerReviews.map((review) => String(review?.application || '')).filter(Boolean)
  );
  const reviewedJobIds = new Set(
    jobseekerReviews.map((review) => String(review?.job || '')).filter(Boolean)
  );
  const legacyReviewedRoles = new Set(
    jobseekerReviews
      .filter((review) => !review?.application && !review?.job)
      .map((review) => String(review?.roleAppliedFor || '').trim().toLowerCase())
      .filter(Boolean)
  );

  const eligibleApplications = applications
    .filter((application) => application?.job?._id && application?.job?.title)
    .filter((application) => {
      const applicationId = String(application._id);
      const jobId = String(application.job._id);
      const jobTitle = String(application.job.title || '').trim().toLowerCase();

      return !reviewedApplicationIds.has(applicationId)
        && !reviewedJobIds.has(jobId)
        && !legacyReviewedRoles.has(jobTitle);
    })
    .map((application) => ({
      applicationId: String(application._id),
      jobId: String(application.job._id),
      jobTitle: String(application.job.title || '').trim(),
    }));

  return {
    hasApplication: applications.length > 0,
    eligibleApplications,
  };
};

// GET /api/companies/verified/:id/review-eligibility
exports.getCompanyReviewEligibility = async (req, res) => {
  try {
    const company = await User.findOne({
      _id: req.params.id,
      role: 'employer',
      status: { $ne: 'deleted' },
    }).select('_id employerProfile.reviews');

    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found.' });
    }

    const reviewEligibility = await getReviewEligibility(
      company._id,
      req.user._id,
      company?.employerProfile?.reviews
    );
    const eligible = reviewEligibility.eligibleApplications.length > 0;
    const reviewLimitReached = reviewEligibility.hasApplication && !eligible;

    return res.status(200).json({
      success: true,
      eligible,
      hasApplication: reviewEligibility.hasApplication,
      reviewLimitReached,
      eligibleApplications: reviewEligibility.eligibleApplications,
      message: reviewLimitReached
        ? 'You’ve already reviewed all available job posts from this employer.'
        : eligible
          ? 'You can review an application from this company.'
          : 'You can write a review after applying to a job from this company.',
    });
  } catch (error) {
    console.error('Error checking company review eligibility:', error);
    return res.status(500).json({ success: false, message: 'Unable to check review eligibility.' });
  }
};

const mapCompanyFromUser = (user, reviewerProfileImageMap = new Map()) => {
  const ep = user?.employerProfile || {};
  const about = ep.companyDescription || '';

  const reviews = Array.isArray(ep.reviews)
    ? [...ep.reviews]
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
        .map((review) => ({
          _id: review._id,
          reviewer: review.reviewer,
          reviewerName: review.reviewerName || 'Anonymous User',
          reviewerProfileImage:
            reviewerProfileImageMap.get(String(review.reviewer || '')) || '',
          applicationId: review.application || null,
          jobId: review.job || null,
          roleAppliedFor: String(review.roleAppliedFor || '').trim() || null,
          rating: Number(review.processRating ?? review.rating) || 0,
          processRating: Number(review.processRating ?? review.rating) || 0,
          daysToFirstResponse:
            review.daysToFirstResponse === undefined || review.daysToFirstResponse === null
              ? null
              : Number(review.daysToFirstResponse),
          totalProcessDays:
            review.totalProcessDays === undefined || review.totalProcessDays === null
              ? null
              : Number(review.totalProcessDays),
          outcome: review.outcome || null,
          wouldApplyAgain:
            typeof review.wouldApplyAgain === 'boolean' ? review.wouldApplyAgain : null,
          message: review.message || '',
          createdAt: review.createdAt,
          updatedAt: review.updatedAt,
        }))
    : [];

  const summary = computeReviewSummary(reviews);
  const ratingBreakdown = computeRatingBreakdown(reviews);

  return {
    _id: user._id,
    companyName: ep.companyName || '',
    industry: ep.industry || '',
    location: ep.regionCity || '',
    companyAddress: ep.companyAddress || ep.regionCity || '',
    businessEmail: ep.businessEmail || '',
    mobileNumber: ep.mobileNumber || '',
    companyLogo: ep.companyLogo || '',
    companyWebsite: ep.companyWebsiteUrl || '',
    about,
    rating: summary.rating,
    reviewCount: summary.reviewCount,
    ratingBreakdown,
    reviews,

    // ✅ added fields for dynamic tabs
    facebookUrl: ep.facebookUrl || '',
    instagramUrl: ep.instagramUrl || '',
    youtubeUrl: ep.youtubeUrl || '',
    linkedinUrl: ep.linkedinUrl || '',
    xUrl: ep.xUrl || '',
    coverPhoto: ep.coverPhoto || '',
    galleryImages: Array.isArray(ep.galleryImages) ? ep.galleryImages : [],
  };
};

const mapSavedCompanyWithJobs = async (user) => {
  const mappedCompany = mapCompanyFromUser(user);

  const jobs = await Job.find({
    employer: user._id,
    isPublished: true,
    isActive: true,
    status: 'published',
    $or: [
      { isArchived: false },
      { isArchived: { $exists: false } },
    ],
  })
    .sort({ createdAt: -1 })
    .select(
      'title description requirements jobType educationLevel category salaryMin salaryMax location workMode applicationDeadline vacancies skillsRequired experienceLevel openToFreshGraduates perksAndBenefits otherBenefits willingToRelocate locationImage employer companyName companyLogo isUrgent isActive isPublished isArchived status createdAt updatedAt'
    )
    .lean();

  return {
    ...mappedCompany,
    jobs: Array.isArray(jobs) ? jobs.filter((job) => isPublicJobOpen(job)) : [],
  };
};

// ✅ Get verified employers only (public) + supports filters via query params
// GET /api/companies/verified?search=&location=&industry=
exports.getVerifiedCompanies = async (req, res) => {
  try {
    const search = String(req.query.search || '').trim();
    const location = String(req.query.location || '').trim();
    const industry = String(req.query.industry || '').trim();

    const baseQuery = {
      role: 'employer',
      status: { $ne: 'deleted' },
      'employerProfile.verificationDocs.overallStatus': 'verified',
      'employerProfile.profileVisible': true,
    };

    const query = { ...baseQuery, $and: [] };

    if (search) {
      const rx = new RegExp(escapeRegex(search), 'i');
      query.$and.push({
        $or: [
          { 'employerProfile.companyName': rx },
          { 'employerProfile.industry': rx },
          { 'employerProfile.regionCity': rx },
        ],
      });
    }

    if (location) {
      query.$and.push({
        'employerProfile.regionCity': {
          $regex: escapeRegex(location),
          $options: 'i',
        },
      });
    }

    if (industry) {
      query.$and.push({
        'employerProfile.industry': {
          $regex: `^${escapeRegex(industry)}$`,
          $options: 'i',
        },
      });
    }

    if (!query.$and.length) delete query.$and;

    const employers = await User.find(query).select('-password').sort({ createdAt: -1 });
    const employerIds = employers.map((employer) => employer._id);

    const openingsByEmployer = new Map();

    if (employerIds.length > 0) {
      const openingCounts = await Job.aggregate([
        {
          $match: {
            employer: { $in: employerIds },
            isPublished: true,
            isActive: true,
            $or: [
              { isArchived: false },
              { isArchived: { $exists: false } },
            ],
          },
        },
        {
          $group: {
            _id: '$employer',
            count: { $sum: 1 },
          },
        },
      ]);

      openingCounts.forEach((item) => {
        openingsByEmployer.set(String(item._id), Number(item.count) || 0);
      });
    }

    const companies = employers.map((u) => {
      const ep = u.employerProfile || {};
      const reviews = Array.isArray(ep.reviews) ? ep.reviews : [];
      const summary = computeReviewSummary(reviews);
      const ratingBreakdown = computeRatingBreakdown(reviews);

      return {
        _id: u._id,
        companyName: ep.companyName || '',
        industry: ep.industry || '',
        location: ep.regionCity || '',
        businessEmail: ep.businessEmail || '',
        mobileNumber: ep.mobileNumber || '',
        companyLogo: ep.companyLogo || '',
        companyWebsite: ep.companyWebsiteUrl || '',
        about: ep.companyDescription || '',
        openingsCount: openingsByEmployer.get(String(u._id)) || 0,
        rating: summary.rating,
        reviewCount: summary.reviewCount,
        ratingBreakdown,
      };
    });

    const [locationsRaw, industriesRaw] = await Promise.all([
      User.distinct('employerProfile.regionCity', baseQuery),
      User.distinct('employerProfile.industry', baseQuery),
    ]);

    const normalizeList = (arr) =>
      (arr || [])
        .map((v) => String(v || '').trim())
        .filter(Boolean)
        .filter((v, i, self) => self.findIndex((x) => x.toLowerCase() === v.toLowerCase()) === i)
        .sort((a, b) => a.localeCompare(b));

    const locations = normalizeList(locationsRaw);
    const industries = normalizeList(industriesRaw);

    return res.status(200).json({
      success: true,
      companies,
      count: companies.length,
      filters: {
        locations,
        industries,
      },
    });
  } catch (error) {
    console.error('Error fetching verified companies:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching companies',
    });
  }
};

// ✅ Get single verified company details
// GET /api/companies/verified/:id
exports.getVerifiedCompanyDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const company = await User.findOne({
      _id: id,
      role: 'employer',
      status: { $ne: 'deleted' },
      'employerProfile.verificationDocs.overallStatus': 'verified',
      'employerProfile.profileVisible': true,
    }).select('-password');

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Verified company not found',
      });
    }

    const reviewerProfileImageMap = await getReviewerProfileImageMap(
      company?.employerProfile?.reviews
    );

    return res.status(200).json({
      success: true,
      company: mapCompanyFromUser(company, reviewerProfileImageMap),
    });
  } catch (error) {
    console.error('Error fetching verified company details:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching company details',
    });
  }
};

// ✅ Submit company review
// POST /api/companies/verified/:id/reviews
exports.submitCompanyReview = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      applicationId,
      jobId,
      processRating,
      daysToFirstResponse,
      totalProcessDays,
      outcome,
      wouldApplyAgain,
      message,
    } = req.body;

    const numericProcessRating = Number(processRating);
    const numericDaysToFirstResponse = Number(daysToFirstResponse ?? 0);
    const numericTotalProcessDays = Number(totalProcessDays ?? 0);
    const trimmedMessage = String(message || '').trim();

    if (!numericProcessRating || numericProcessRating < 1 || numericProcessRating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Application process rating must be between 1 and 5.',
      });
    }

    if (!applicationId) {
      return res.status(400).json({
        success: false,
        message: 'Please select a job application to review.',
      });
    }

    if (
      !Number.isFinite(numericDaysToFirstResponse) ||
      numericDaysToFirstResponse < 0
    ) {
      return res.status(400).json({
        success: false,
        message: 'Days to first response must be 0 or higher.',
      });
    }

    if (!Number.isFinite(numericTotalProcessDays) || numericTotalProcessDays < 0) {
      return res.status(400).json({
        success: false,
        message: 'Total process length must be 0 or higher.',
      });
    }

    if (!trimmedMessage) {
      return res.status(400).json({
        success: false,
        message: 'Review message is required.',
      });
    }

    const allowedOutcomes = [
      'received_offer',
      'rejected',
      'ghosted',
      'withdrew',
      'still_in_process',
    ];
    const normalizedOutcome = allowedOutcomes.includes(String(outcome || '').trim())
      ? String(outcome).trim()
      : 'still_in_process';

    const company = await User.findOne({
      _id: id,
      role: 'employer',
      status: { $ne: 'deleted' },
      'employerProfile.verificationDocs.overallStatus': 'verified',
      'employerProfile.profileVisible': true,
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Verified company not found',
      });
    }

    if (String(company._id) === String(req.user?._id)) {
      return res.status(400).json({
        success: false,
        message: 'You cannot review your own company.',
      });
    }

    const selectedApplication = await Application.findOne({
      _id: applicationId,
      employer: company._id,
      jobseeker: req.user._id,
    })
      .select('_id job')
      .populate('job', 'title');

    if (!selectedApplication?.job?._id || !selectedApplication?.job?.title) {
      return res.status(403).json({
        success: false,
        message: 'The selected job application is not eligible for review.',
      });
    }

    const selectedJobId = String(selectedApplication.job._id);
    if (jobId && String(jobId) !== selectedJobId) {
      return res.status(400).json({
        success: false,
        message: 'The selected job does not match this application.',
      });
    }

    const trimmedRoleAppliedFor = String(selectedApplication.job.title).trim();

    if (!company.employerProfile) {
      company.employerProfile = {};
    }

    if (!Array.isArray(company.employerProfile.reviews)) {
      company.employerProfile.reviews = [];
    }

    const alreadyReviewed = company.employerProfile.reviews.some(
      (review) => String(review?.reviewer) === String(req.user?._id)
        && (
          String(review?.application || '') === String(selectedApplication._id)
          || String(review?.job || '') === selectedJobId
          || (
            !review?.application
            && !review?.job
            && String(review?.roleAppliedFor || '').trim().toLowerCase()
              === trimmedRoleAppliedFor.toLowerCase()
          )
        )
    );

    if (alreadyReviewed) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this job application.',
      });
    }

    company.employerProfile.reviews.push({
      reviewer: req.user._id,
      reviewerName: buildReviewerName(req.user),
      application: selectedApplication._id,
      job: selectedApplication.job._id,
      roleAppliedFor: trimmedRoleAppliedFor,
      rating: numericProcessRating,
      processRating: numericProcessRating,
      daysToFirstResponse: numericDaysToFirstResponse,
      totalProcessDays: numericTotalProcessDays,
      outcome: normalizedOutcome,
      wouldApplyAgain: normalizeBooleanValue(wouldApplyAgain, true),
      message: trimmedMessage,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    company.markModified('employerProfile.reviews');
    await company.save();

    const reviewerProfileImageMap = await getReviewerProfileImageMap(
      company?.employerProfile?.reviews
    );

    return res.status(201).json({
      success: true,
      message: 'Review submitted successfully.',
      company: mapCompanyFromUser(company, reviewerProfileImageMap),
    });
  } catch (error) {
    console.error('Error submitting company review:', error);

    if (error?.name === 'ValidationError') {
      const validationMessage = Object.values(error.errors || {})
        .map((item) => item?.message)
        .filter(Boolean)
        .join(' ');

      return res.status(400).json({
        success: false,
        message: validationMessage || 'Review data is invalid.',
      });
    }

    return res.status(500).json({
      success: false,
      message: error?.message || 'Server error submitting review',
    });
  }
};

// ✅ SAVE COMPANY
// POST /api/companies/saved/:companyId
exports.saveCompany = async (req, res) => {
  try {
    const { companyId } = req.params;

    if (!req.user || req.user.role !== 'jobseeker') {
      return res.status(403).json({
        success: false,
        message: 'Only job seekers can save companies',
      });
    }

    const company = await User.findOne({
      _id: companyId,
      role: 'employer',
      status: { $ne: 'deleted' },
      'employerProfile.verificationDocs.overallStatus': 'verified',
      'employerProfile.profileVisible': true,
    }).select('_id');

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found or unavailable',
      });
    }

    const user = await User.findById(req.user._id).select('savedCompanies');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const alreadySaved = (user.savedCompanies || []).some(
      (savedCompanyId) => String(savedCompanyId) === String(company._id)
    );

    if (alreadySaved) {
      return res.status(200).json({
        success: true,
        alreadySaved: true,
        message: 'Company already saved',
      });
    }

    user.savedCompanies.push(company._id);
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Company saved successfully',
    });
  } catch (error) {
    console.error('Error saving company:', error);
    return res.status(500).json({
      success: false,
      message: 'Error saving company',
    });
  }
};

// ✅ REMOVE SAVED COMPANY
// DELETE /api/companies/saved/:companyId
exports.removeSavedCompany = async (req, res) => {
  try {
    const { companyId } = req.params;

    if (!req.user || req.user.role !== 'jobseeker') {
      return res.status(403).json({
        success: false,
        message: 'Only job seekers can manage saved companies',
      });
    }

    const user = await User.findById(req.user._id).select('savedCompanies');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    user.savedCompanies = (user.savedCompanies || []).filter(
      (savedCompanyId) => String(savedCompanyId) !== String(companyId)
    );

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Saved company removed successfully',
    });
  } catch (error) {
    console.error('Error removing saved company:', error);
    return res.status(500).json({
      success: false,
      message: 'Error removing saved company',
    });
  }
};

// ✅ REMOVE ALL SAVED COMPANIES
// DELETE /api/companies/saved
exports.removeAllSavedCompanies = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'jobseeker') {
      return res.status(403).json({
        success: false,
        message: 'Only job seekers can manage saved companies',
      });
    }

    const user = await User.findById(req.user._id).select('savedCompanies');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    user.savedCompanies = [];
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'All saved companies removed successfully',
    });
  } catch (error) {
    console.error('Error removing all saved companies:', error);
    return res.status(500).json({
      success: false,
      message: 'Error removing all saved companies',
    });
  }
};

// ✅ GET ALL SAVED COMPANIES
// GET /api/companies/saved
exports.getSavedCompanies = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'jobseeker') {
      return res.status(403).json({
        success: false,
        message: 'Only job seekers can view saved companies',
      });
    }

    const user = await User.findById(req.user._id)
      .populate({
        path: 'savedCompanies',
        match: {
          role: 'employer',
          status: { $ne: 'deleted' },
          'employerProfile.verificationDocs.overallStatus': 'verified',
          'employerProfile.profileVisible': true,
        },
        options: { sort: { createdAt: -1 } },
      })
      .select('savedCompanies');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const savedCompaniesRaw = Array.isArray(user.savedCompanies) ? user.savedCompanies : [];
    const companies = await Promise.all(savedCompaniesRaw.map((companyUser) => mapSavedCompanyWithJobs(companyUser)));

    return res.status(200).json({
      success: true,
      count: companies.length,
      companies,
    });
  } catch (error) {
    console.error('Error fetching saved companies:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching saved companies',
    });
  }
};

// ✅ CHECK IF COMPANY IS SAVED
// GET /api/companies/saved/check/:companyId
exports.checkSavedCompany = async (req, res) => {
  try {
    const { companyId } = req.params;

    if (!req.user || req.user.role !== 'jobseeker') {
      return res.status(403).json({
        success: false,
        message: 'Only job seekers can check saved companies',
      });
    }

    const user = await User.findById(req.user._id).select('savedCompanies');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const isSaved = (user.savedCompanies || []).some(
      (savedCompanyId) => String(savedCompanyId) === String(companyId)
    );

    return res.status(200).json({
      success: true,
      isSaved,
    });
  } catch (error) {
    console.error('Error checking saved company:', error);
    return res.status(500).json({
      success: false,
      message: 'Error checking saved company',
    });
  }
};
