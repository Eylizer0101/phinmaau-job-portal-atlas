const express = require('express');
const router = express.Router();
const { rateLimit } = require('express-rate-limit');

// Limit requests per authenticated account, not by a shared school/network IP.
const chatbotMessageLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 15,
  keyGenerator: (req) => String(req.user?._id || req.ip),
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { success: false, message: 'Too many chatbot messages. Please wait a minute and try again.' },
});
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  getChatbotStatus,
  sendChatbotMessage,
} = require('../controllers/chatbotController');

router.use(protect);
router.use(authorize('jobseeker', 'employer'));

router.get('/status', getChatbotStatus);
router.post('/message', chatbotMessageLimiter, sendChatbotMessage);

module.exports = router;
