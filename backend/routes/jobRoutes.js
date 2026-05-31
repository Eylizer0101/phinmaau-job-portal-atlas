const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { uploadJobLocationImage } = require('../middleware/uploadMiddleware');
const {
  createJob,
  getAllJobs,
  getJobById,
  updateJob,
  deleteJob,
  restoreJob,
  permanentlyDeleteJob,
  getEmployerJobs,
  updateJobStatus,
  saveJob,
  removeSavedJob,
  getSavedJobs,
  checkSavedJob
} = require('../controllers/jobController');

// Public routes
router.get('/', getAllJobs);

// ✅ FIX: put this BEFORE "/:id" or else it becomes id="employer"
router.get('/employer/my-jobs', protect, authorize('employer'), getEmployerJobs);

// ✅ SAVED JOB ROUTES
router.get('/saved', protect, authorize('jobseeker'), getSavedJobs);
router.get('/saved/check/:jobId', protect, authorize('jobseeker'), checkSavedJob);
router.post('/saved/:jobId', protect, authorize('jobseeker'), saveJob);
router.delete('/saved/:jobId', protect, authorize('jobseeker'), removeSavedJob);

// Job by id (public + used by employer edit)
router.get('/:id', getJobById);

// Protected routes
router.post('/', protect, authorize('employer'), uploadJobLocationImage.single('locationImage'), createJob);
router.put('/:id', protect, authorize('employer'), uploadJobLocationImage.single('locationImage'), updateJob);
router.delete('/:id', protect, authorize('employer'), deleteJob);
router.delete('/:id/permanent', protect, authorize('employer'), permanentlyDeleteJob);
router.patch('/:id/restore', protect, authorize('employer'), restoreJob);
router.patch('/:id/status', protect, authorize('employer'), updateJobStatus);

module.exports = router;