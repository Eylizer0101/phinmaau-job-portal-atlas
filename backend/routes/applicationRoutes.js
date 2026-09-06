const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');

const {
  applyForJob,
  getJobseekerApplications,
  getAdminApplications,
  getEmployerApplications,
  getEmployerForInterviewApplications,
  getEmployerHiredApplications,
  getEmployerInterviewCalendar,
  getEmployerInterviewerOptions,
  getJobApplications,
  updateApplicationStatus,
  updateApplicationHiringStage,
  updateInterviewSchedule,
  getApplicationDetails,
  downloadApplicationResume,
  getMyApplications,
  checkIfApplied,
  getJobseekerStatus,
  withdrawMyApplication,
  reactivateMyApplication,
  requestEmploymentStatusChange,
  reviewEmploymentStatusChange,

  // ✅ DECLINED / ARCHIVE FLOW
  getEmployerDeclinedApplications,
  getEmployerArchivedDeclinedApplications,
  archiveDeclinedApplication,
  restoreDeclinedApplication,
  deleteDeclinedApplication

} = require('../controllers/applicationController');

// Jobseeker routes
router.post(
  '/apply/:jobId',
  protect,
  authorize('jobseeker'),
  applyForJob
);

router.get('/my-applications', protect, authorize('jobseeker'), getMyApplications);
router.get('/jobseeker/all', protect, authorize('jobseeker'), getJobseekerApplications);
router.get('/job/:jobId/check', protect, authorize('jobseeker'), checkIfApplied);
router.put('/:applicationId/withdraw', protect, authorize('jobseeker'), withdrawMyApplication);
router.put('/:applicationId/reactivate', protect, authorize('jobseeker'), reactivateMyApplication);
router.post('/:applicationId/employment-status-request', protect, authorize('jobseeker'), requestEmploymentStatusChange);

// Admin routes
router.get('/admin/all', protect, authorize('admin'), getAdminApplications);

// Employer routes
router.get('/employer/all', protect, authorize('employer'), getEmployerApplications);
router.get('/employer/for-interview', protect, authorize('employer'), getEmployerForInterviewApplications);
router.get('/employer/hired', protect, authorize('employer'), getEmployerHiredApplications);
router.get('/employer/interview-calendar', protect, authorize('employer'), getEmployerInterviewCalendar);
router.get('/employer/interviewer-options', protect, authorize('employer'), getEmployerInterviewerOptions);
router.put('/:applicationId/employment-status-request/review', protect, authorize('employer'), reviewEmploymentStatusChange);

// ✅ DECLINED ROUTES
router.get('/employer/declined', protect, authorize('employer'), getEmployerDeclinedApplications);
router.get('/employer/declined/archived', protect, authorize('employer'), getEmployerArchivedDeclinedApplications);
router.patch('/:applicationId/archive-declined', protect, authorize('employer'), archiveDeclinedApplication);
router.patch('/:applicationId/restore-declined', protect, authorize('employer'), restoreDeclinedApplication);
router.delete('/:applicationId/permanent', protect, authorize('employer'), deleteDeclinedApplication);

router.get('/job/:jobId', protect, authorize('employer', 'admin'), getJobApplications);
router.put('/:applicationId/status', protect, authorize('employer'), updateApplicationStatus);
router.put('/:applicationId/hiring-stage', protect, authorize('employer'), updateApplicationHiringStage);
router.put('/:applicationId/interview-schedule', protect, authorize('employer'), updateInterviewSchedule);
router.get('/jobseeker/:jobseekerId/status', protect, authorize('employer'), getJobseekerStatus);

// Shared route
router.get('/:applicationId/resume/download', protect, downloadApplicationResume);
router.get('/:applicationId', protect, getApplicationDetails);

module.exports = router;
