const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { uploadCommunityImage } = require('../middleware/uploadMiddleware');
const {
  getPosts,
  createPost,
  updatePost,
  deletePost,
  toggleLike,
  getComments,
  addComment,
  deleteComment,
  reactToComment,
  reactToReply,
  addReply,
  reportContent,
  getManagedContent,
} = require('../controllers/communityController');

router.use(protect);

router.get('/posts', getPosts);
router.post('/posts', uploadCommunityImage.single('image'), createPost);
router.put('/posts/:postId', uploadCommunityImage.single('image'), updatePost);
router.delete('/posts/:postId', deletePost);

router.post('/posts/:postId/like', toggleLike);
router.get('/posts/:postId/comments', getComments);
router.post('/posts/:postId/comments', addComment);
router.delete('/posts/:postId/comments/:commentId', deleteComment);
router.post('/posts/:postId/comments/:commentId/reaction', reactToComment);
router.post('/posts/:postId/comments/:commentId/replies', addReply);
router.post('/posts/:postId/comments/:commentId/replies/:replyId/reaction', reactToReply);

router.post('/reports', reportContent);
router.get('/managed', getManagedContent);

module.exports = router;
