const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { uploadMessageAttachment } = require('../middleware/uploadMiddleware');
const {
  sendMessage,
  getConversations,
  getMessages,
  getUnreadCount,
  markAsRead,
  getJobseekersForEmployer,
  getEmployersForJobseeker,
  scheduleInterview,
  uploadFile,
  getFile
} = require('../controllers/messageController');

// All routes are protected
router.use(protect);

// Message routes - persistent Cloudinary storage for attachments
router.post('/send', uploadMessageAttachment.single('file'), sendMessage);
router.post('/upload', uploadMessageAttachment.single('file'), uploadFile);

// Keep this route for legacy messages that still point to old local /uploads/messages files.
router.get('/file/:filename', getFile);

router.get('/conversations', getConversations);
router.get('/conversation/:conversationId', getMessages);
router.get('/unread-count', getUnreadCount);
router.put('/mark-read/:conversationId', markAsRead);
router.post('/schedule-interview', scheduleInterview);

// User lists for messaging
router.get('/employer/jobseekers', authorize('employer'), getJobseekersForEmployer);
router.get('/jobseeker/employers', authorize('jobseeker'), getEmployersForJobseeker);

module.exports = router;
