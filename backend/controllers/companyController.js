// backend/controllers/companyController.js
const User = require('../models/User');
const Job = require('../models/Job');

// helper: safe regex
const escapeRegex = (s) => String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeBooleanValue = (value, fallback = true) => {
  if (typeof value === 'boolean') return value;

  const normalized = String(value ?? '').trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;

  return fallback;
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

const computeReviewSummary = (reviews = []) => {
  const safeReviews = Array.isArray(reviews) ? reviews : [];
  const reviewCount = safeReviews.length;

  if (!reviewCount) {
    return {
      rating: 0,
      reviewCount: 0,
    };
  }

  const total = safeReviews.reduce((sum, review) => sum + (Number(review?.rating) || 0), 0);
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
    const numericRating = Number(review?.rating) || 0;
    const star = Math.max(1, Math.min(5, Math.round(numericRating)));

    if (breakdown[star] !== undefined) {
      breakdown[star] += 1;
    }
  });

  return breakdown;
};

const mapCompanyFromUser = (user) => {
  const ep = user?.employerProfile || {};
  const about =
    ep.companyDescription ||
    ep.aboutCompany ||
    ep.description ||
    '';

  const reviews = Array.isArray(ep.reviews)
    ? [...ep.reviews]
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
        .map((review) => ({
          _id: review._id,
          reviewer: review.reviewer,
          reviewerName: review.reviewerName || 'Anonymous User',
          roleAppliedFor: review.roleAppliedFor || 'Role not specified',
          rating: Number(review.rating) || 0,
          processRating: Number(review.processRating) || 0,
          daysToFirstResponse: Number(review.daysToFirstResponse) || 0,
          totalProcessDays: Number(review.totalProcessDays) || 0,
          outcome: review.outcome || 'still_in_process',
          wouldApplyAgain:
            typeof review.wouldApplyAgain === 'boolean' ? review.wouldApplyAgain : true,
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
  })
    .sort({ createdAt: -1 })
    .select(
      'title description requirements jobType educationLevel category salaryMin salaryMax location workMode applicationDeadline vacancies skillsRequired experienceLevel openToFreshGraduates perksAndBenefits otherBenefits willingToRelocate locationImage employer companyName companyLogo isActive isPublished createdAt updatedAt'
    )
    .lean();

  return {
    ...mappedCompany,
    jobs: Array.isArray(jobs) ? jobs : [],
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
          $regex: `^${escapeRegex(location)}$`,
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

    return res.status(200).json({
      success: true,
      company: mapCompanyFromUser(company),
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
      rating,
      processRating,
      roleAppliedFor,
      daysToFirstResponse,
      totalProcessDays,
      outcome,
      wouldApplyAgain,
      message,
      reviewerName,
    } = req.body;

    const numericRating = Number(rating);
    const numericProcessRating = Number(processRating);
    const numericDaysToFirstResponse = Number(daysToFirstResponse ?? 0);
    const numericTotalProcessDays = Number(totalProcessDays ?? 0);
    const trimmedRoleAppliedFor = String(roleAppliedFor || '').trim();
    const trimmedMessage = String(message || '').trim();
    const trimmedReviewerName = String(reviewerName || '').trim();

    if (!numericRating || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Overall rating must be between 1 and 5.',
      });
    }

    if (!numericProcessRating || numericProcessRating < 1 || numericProcessRating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Application process rating must be between 1 and 5.',
      });
    }

    if (!trimmedRoleAppliedFor) {
      return res.status(400).json({
        success: false,
        message: 'Role applied for is required.',
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

    if (!company.employerProfile) {
      company.employerProfile = {};
    }

    if (!Array.isArray(company.employerProfile.reviews)) {
      company.employerProfile.reviews = [];
    }

    const alreadyReviewed = company.employerProfile.reviews.some(
      (review) => String(review?.reviewer) === String(req.user?._id)
    );

    if (alreadyReviewed) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this company.',
      });
    }

    company.employerProfile.reviews.push({
      reviewer: req.user._id,
      reviewerName: trimmedReviewerName || buildReviewerName(req.user),
      roleAppliedFor: trimmedRoleAppliedFor,
      rating: numericRating,
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

    return res.status(201).json({
      success: true,
      message: 'Review submitted successfully.',
      company: mapCompanyFromUser(company),
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