const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { uploadCommunityMedia } = require('../middleware/uploadMiddleware');
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
  updateComment,
  updateReply,
  deleteReply,
  getArchivedPosts,
  restoreArchivedPost,
  permanentlyDeleteArchivedPost,
  restoreArchivedComment,
  permanentlyDeleteArchivedComment,
  getCommunityGuidelinesStatus,
  acceptCommunityGuidelines,
} = require('../controllers/communityController');

router.use(protect);

router.get('/guidelines/status', getCommunityGuidelinesStatus);
router.post('/guidelines/accept', acceptCommunityGuidelines);

router.get('/posts', getPosts);
router.post(
  '/posts',
  uploadCommunityMedia.fields([
    { name: 'images', maxCount: 10 },
    { name: 'video', maxCount: 1 },
    { name: 'documents', maxCount: 5 },
  ]),
  createPost
);
router.put(
  '/posts/:postId',
  uploadCommunityMedia.fields([
    { name: 'images', maxCount: 10 },
    { name: 'video', maxCount: 1 },
    { name: 'documents', maxCount: 5 },
  ]),
  updatePost
);
router.delete('/posts/:postId', deletePost);

router.post('/posts/:postId/like', toggleLike);
router.get('/posts/:postId/comments', getComments);
router.post('/posts/:postId/comments', addComment);
router.put('/posts/:postId/comments/:commentId', updateComment);
router.delete('/posts/:postId/comments/:commentId', deleteComment);
router.post('/posts/:postId/comments/:commentId/reaction', reactToComment);
router.post('/posts/:postId/comments/:commentId/replies', addReply);
router.put('/posts/:postId/comments/:commentId/replies/:replyId', updateReply);
router.delete('/posts/:postId/comments/:commentId/replies/:replyId', deleteReply);
router.post('/posts/:postId/comments/:commentId/replies/:replyId/reaction', reactToReply);

router.post('/reports', reportContent);
router.get('/managed', getManagedContent);
router.get('/managed/archived', getArchivedPosts);
router.patch('/managed/archived/comments/:postId/:commentId/restore', restoreArchivedComment);
router.delete('/managed/archived/comments/:postId/:commentId', permanentlyDeleteArchivedComment);
router.patch('/managed/archived/:postId/restore', restoreArchivedPost);
router.delete('/managed/archived/:postId', permanentlyDeleteArchivedPost);

module.exports = router;
