const express = require('express');
const router = express.Router();

const companyController = require('../controllers/companyController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Public verified-company routes
router.get('/verified', companyController.getVerifiedCompanies);
router.get('/verified/:id', companyController.getVerifiedCompanyDetails);

router.get(
  '/verified/:id/review-eligibility',
  protect,
  authorize('jobseeker'),
  companyController.getCompanyReviewEligibility
);

// Job seeker review route
router.post(
  '/verified/:id/reviews',
  protect,
  authorize('jobseeker'),
  companyController.submitCompanyReview
);

// Saved-company routes for authenticated job seekers
router.get(
  '/saved',
  protect,
  authorize('jobseeker'),
  companyController.getSavedCompanies
);

router.delete(
  '/saved',
  protect,
  authorize('jobseeker'),
  companyController.removeAllSavedCompanies
);

router.get(
  '/saved/check/:companyId',
  protect,
  authorize('jobseeker'),
  companyController.checkSavedCompany
);

router.post(
  '/saved/:companyId',
  protect,
  authorize('jobseeker'),
  companyController.saveCompany
);

router.delete(
  '/saved/:companyId',
  protect,
  authorize('jobseeker'),
  companyController.removeSavedCompany
);

module.exports = router;
