const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
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
  getFile,
  updateConversationAction
} = require('../controllers/messageController');

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/messages';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'file-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// All routes are protected
router.use(protect);

// Message routes - ADD UPLOAD MIDDLEWARE TO SEND ROUTE
router.post('/send', upload.single('file'), sendMessage); // ✅ FIXED
router.post('/upload', upload.single('file'), uploadFile);
router.get('/file/:filename', getFile);
router.get('/conversations', getConversations);
router.patch('/conversations/action', updateConversationAction);
router.get('/conversation/:conversationId', getMessages);
router.get('/unread-count', getUnreadCount);
router.put('/mark-read/:conversationId', markAsRead);
router.post('/schedule-interview', scheduleInterview);

// User lists for messaging
router.get('/employer/jobseekers', authorize('employer'), getJobseekersForEmployer);
router.get('/jobseeker/employers', authorize('jobseeker'), getEmployersForJobseeker);

module.exports = router;
