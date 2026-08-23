// backend/routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');
const uploadMiddleware = require('../middleware/uploadMiddleware');

// Protect all admin routes
router.use(authMiddleware.verifyToken);
router.use(authMiddleware.isAdmin);

// Admin profile routes
router.get('/profile', adminController.getAdminProfile);
router.put('/profile', uploadMiddleware.uploadProfileImage.single('organizationLogo'), adminController.updateAdminProfile);
router.delete('/profile/logo', adminController.removeAdminProfileLogo);
router.put('/profile/password', adminController.updateAdminPassword);

// Dashboard analytics route
router.get('/dashboard', adminController.getAdminDashboardAnalytics);

// Admin job offers route
router.get('/job-offers', adminController.getAdminJobOffers);

// Admin archive routes
router.get('/archive', adminController.getAdminArchive);
router.get('/archive/:type/:id', adminController.getAdminArchiveDetails);
router.patch('/archive/:type/:id/restore', adminController.restoreAdminArchiveItem);
router.delete('/archive/:type/:id', adminController.permanentlyDeleteAdminArchiveItem);

// User management routes
router.get('/users', adminController.getAllUsers);
router.get('/users/:id', adminController.getUserById);
router.get('/users/:id/documents/:docType', adminController.downloadUserVerificationDocument);
router.put('/users/:id/status', adminController.updateUserStatus);
router.put('/users/:id/quick-action', adminController.quickAction);
router.delete('/users/:id', adminController.deleteUser);
router.put('/users/bulk-status', adminController.bulkUpdateStatus);

// ✅ EMPLOYER VERIFICATION ROUTES (UPDATED)
router.get('/employers/verification', adminController.getEmployersForVerification);
router.get('/employers/verification/:id', adminController.getEmployerVerificationById);
router.put('/employers/verification/:id/status', adminController.updateEmployerVerificationStatus);
router.put('/employers/verification/:id/hold', adminController.holdEmployerVerification);
router.patch('/employers/verification/:id/restore', adminController.restoreEmployerVerification);
router.patch('/employers/verification/:id/docs/:docType/check', adminController.checkEmployerVerificationDocument);
router.get('/employers/verification/:id/docs', adminController.getEmployerVerificationDocUrls);
router.get(
  '/employers/verification/:id/docs/:docType',
  adminController.requireAdminPasswordForCredential,
  adminController.downloadEmployerVerificationDocument
);

// ✅ JOBSEEKER VERIFICATION ROUTES
router.get('/jobseekers/verification', adminController.getJobseekersForVerification);
router.get('/jobseekers/verification/:id', adminController.getJobseekerVerificationById);
router.put('/jobseekers/verification/:id/status', adminController.updateJobseekerVerificationStatus);
router.put('/jobseekers/verification/:id/hold', adminController.holdJobseekerVerification);
router.patch('/jobseekers/verification/:id/restore', adminController.restoreJobseekerVerification);
router.patch('/jobseekers/verification/:id/docs/:docType/check', adminController.checkJobseekerVerificationDocument);
router.get('/jobseekers/verification/:id/docs', adminController.getJobseekerVerificationDocUrls);
router.get(
  '/jobseekers/verification/:id/docs/:docType',
  adminController.requireAdminPasswordForCredential,
  adminController.downloadJobseekerVerificationDocument
);

module.exports = router;
