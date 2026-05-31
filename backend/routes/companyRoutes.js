// backend/routes/companyRoutes.js
const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');
const { protect, authorize } = require('../middleware/authMiddleware');

// ✅ Public: Verified companies only
router.get('/verified', companyController.getVerifiedCompanies);

// ✅ Saved companies routes
router.get('/saved', protect, authorize('jobseeker'), companyController.getSavedCompanies);
router.get('/saved/check/:companyId', protect, authorize('jobseeker'), companyController.checkSavedCompany);
router.post('/saved/:companyId', protect, authorize('jobseeker'), companyController.saveCompany);
router.delete('/saved/:companyId', protect, authorize('jobseeker'), companyController.removeSavedCompany);
router.delete('/saved', protect, authorize('jobseeker'), companyController.removeAllSavedCompanies);

// ✅ Public: Single verified company details
router.get('/verified/:id', companyController.getVerifiedCompanyDetails);

// ✅ Protected: Jobseeker can submit company review
router.post('/verified/:id/reviews', protect, authorize('jobseeker'), companyController.submitCompanyReview);

module.exports = router;