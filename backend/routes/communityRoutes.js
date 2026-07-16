const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getPosts, createPost } = require('../controllers/communityController');

router.use(protect);
router.get('/posts', getPosts);
router.post('/posts', createPost);

module.exports = router;
