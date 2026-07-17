const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { uploadCommunityImage } = require('../middleware/uploadMiddleware');
const {
  getPosts,
  createPost,
  toggleLike,
  getComments,
  addComment,
} = require('../controllers/communityController');

router.use(protect);
router.get('/posts', getPosts);
router.post('/posts', uploadCommunityImage.single('image'), createPost);
router.post('/posts/:postId/like', toggleLike);
router.get('/posts/:postId/comments', getComments);
router.post('/posts/:postId/comments', addComment);

module.exports = router;
