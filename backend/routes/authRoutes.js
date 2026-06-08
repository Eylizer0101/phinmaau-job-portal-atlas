// BACKEND/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect, authorize } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// -------------------------------
// JOBSEEKER REGISTER
// -------------------------------
router.post(
  '/register',
  upload.uploadRegisterDocs.fields([
    { name: 'cv', maxCount: 1 },
    { name: 'diploma', maxCount: 1 },
    { name: 'validId', maxCount: 1 },
    { name: 'tor', maxCount: 1 },
    { name: 'sss', maxCount: 1 },
    { name: 'philhealth', maxCount: 1 },
    { name: 'pagibig', maxCount: 1 },
    { name: 'tin', maxCount: 1 },
  ]),
  authController.register
);

// -------------------------------
// JOBSEEKER/ADMIN LOGIN
// -------------------------------
router.post('/login', authController.login);

// -------------------------------
// EMPLOYER REGISTER/LOGIN
// -------------------------------
router.post(
  '/employer/register',
  upload.uploadEmployerRegisterDocs.fields([
    { name: 'secRegistration', maxCount: 1 },
    { name: 'birRegistration', maxCount: 1 },
    { name: 'dtiRegistration', maxCount: 1 },
    { name: 'cityPermit', maxCount: 1 },
    { name: 'businessPermit', maxCount: 1 },
    { name: 'companyLogo', maxCount: 1 },
  ]),
  authController.registerEmployer
);

router.post('/employer/login', authController.loginEmployer);

// -------------------------------
// FORGOT / RESET PASSWORD
// -------------------------------
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// -------------------------------
// RESUBMIT DOCUMENT (PUBLIC TOKEN-BASED)
// -------------------------------
router.get('/resubmit-document/validate', authController.validateResubmitDocumentToken);
router.post(
  '/resubmit-document',
  upload.uploadAlumniResubmit.single('document'),
  authController.resubmitDocument
);

// -------------------------------
// CURRENT USER + PROFILES
// -------------------------------
router.get('/me', protect, authController.getCurrentUser);

router.put('/update-profile', protect, authController.updateProfile);

// -------------------------------
// DOWNLOAD RESUME PDF
// -------------------------------
router.post(
  '/resume/verify-password',
  protect,
  authorize('jobseeker'),
  authController.verifyResumeDownloadPassword
);

router.get(
  '/resume/download',
  protect,
  authorize('jobseeker'),
  authController.downloadResume
);

// -------------------------------
// SALARY EXPECTATION APIs
// -------------------------------
router.get(
  '/salary-expectation',
  protect,
  authorize('jobseeker'),
  authController.getSalaryExpectation
);

router.put(
  '/salary-expectation',
  protect,
  authorize('jobseeker'),
  authController.updateSalaryExpectation
);

// -------------------------------
// WORK EXPERIENCE APIs
// -------------------------------
router.get(
  '/work-experiences',
  protect,
  authorize('jobseeker'),
  authController.getWorkExperiences
);

router.post(
  '/work-experiences',
  protect,
  authorize('jobseeker'),
  authController.createWorkExperience
);

router.put(
  '/work-experiences/:workExperienceId',
  protect,
  authorize('jobseeker'),
  authController.updateWorkExperience
);

router.delete(
  '/work-experiences/:workExperienceId',
  protect,
  authorize('jobseeker'),
  authController.deleteWorkExperience
);

router.post(
  '/upload-resume',
  protect,
  authorize('jobseeker'),
  upload.uploadResume.single('resume'),
  authController.uploadResume
);

router.post(
  '/upload-profile-image',
  protect,
  authorize('jobseeker'),
  upload.uploadProfileImage.single('profileImage'),
  authController.uploadProfileImage
);

// Alumni verification docs
router.post(
  '/upload-alumni-verification/:docType',
  protect,
  authorize('jobseeker'),
  upload.uploadAlumniVerification.single('file'),
  authController.uploadAlumniVerificationDoc
);

router.delete(
  '/delete-alumni-verification/:docType',
  protect,
  authorize('jobseeker'),
  authController.deleteAlumniVerificationDoc
);

router.get(
  '/download-alumni-verification/:docType',
  protect,
  authorize('jobseeker'),
  authController.downloadAlumniVerificationDoc
);

router.get(
  '/alumni-verification-status',
  protect,
  authorize('jobseeker'),
  authController.getAlumniVerificationStatus
);

// Employer company profile
router.put(
  '/update-company-profile',
  protect,
  authorize('employer'),
  upload.uploadEmployerCompanyMedia.fields([
    { name: 'companyLogo', maxCount: 1 },
    { name: 'coverPhotoFile', maxCount: 1 },
    { name: 'galleryImagesFiles', maxCount: 12 },
  ]),
  authController.updateCompanyProfile
);

router.get(
  '/company-profile',
  protect,
  authorize('employer'),
  authController.getCompanyProfile
);

// Employer verification docs
router.post(
  '/upload-verification/:docType',
  protect,
  authorize('employer'),
  upload.uploadEmployerVerification.single('file'),
  authController.uploadEmployerVerificationDoc
);


// -------------------------------
// JOBSEEKER SETTINGS EMAIL / MOBILE VERIFICATION
// -------------------------------
router.post('/settings/request-email-verification', protect, authorize('jobseeker', 'employer'), authController.requestEmailChangeVerification);
router.post('/settings/resend-email-verification', protect, authorize('jobseeker', 'employer'), authController.resendEmailVerificationCode);
router.post('/settings/verify-email', protect, authorize('jobseeker', 'employer'), authController.verifyEmailChangeCode);

router.post('/settings/request-phone-verification', protect, authorize('jobseeker', 'employer'), authController.requestPhoneChangeVerification);
router.post('/settings/resend-phone-verification', protect, authorize('jobseeker', 'employer'), authController.resendPhoneVerificationCode);
router.post('/settings/verify-phone', protect, authorize('jobseeker', 'employer'), authController.verifyPhoneChangeCode);

// ✅ existing general password change
router.put('/change-password', protect, authController.changePassword);

// ✅ NEW forced temp password change route
router.put('/change-temporary-password', protect, authController.changeTemporaryPassword);

router.put('/update-notifications', protect, authController.updateNotifications);
router.put('/update-user-profile', protect, authController.updateUserProfile);

module.exports = router;