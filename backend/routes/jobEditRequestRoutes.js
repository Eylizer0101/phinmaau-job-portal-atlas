const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const controller = require('../controllers/jobEditRequestController');

router.use(protect);

router.get('/employer', authorize('employer'), controller.getEmployerRequests);
router.get('/job/:jobId/status', authorize('employer', 'admin'), controller.getJobStatus);
router.post('/job/:jobId', authorize('employer'), controller.createRequest);

router.get('/admin', authorize('admin'), controller.getAdminRequests);
router.get('/admin/:requestId', authorize('admin'), controller.getAdminRequestDetails);
router.patch('/admin/:requestId/approve', authorize('admin'), controller.approveRequest);

module.exports = router;
