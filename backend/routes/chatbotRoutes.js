const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  getChatbotStatus,
  sendChatbotMessage,
} = require('../controllers/chatbotController');

router.use(protect);
router.use(authorize('jobseeker', 'employer'));

router.get('/status', getChatbotStatus);
router.post('/message', sendChatbotMessage);

module.exports = router;
