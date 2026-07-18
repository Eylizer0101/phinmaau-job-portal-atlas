const express = require('express');
const router = express.Router();

const communityController = require('../controllers/communityController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { uploadCommunityImage } = require('../middleware/uploadMiddleware');

router.use(protect);
router.use(authorize('jobseeker', 'employer'));

router.get('/posts', communityController.getPosts);
router.post('/posts', uploadCommunityImage.single('image'), communityController.createPost);
router.put('/posts/:postId', uploadCommunityImage.single('image'), communityController.updatePost);
router.delete('/posts/:postId', communityController.deletePost);

router.post('/posts/:postId/like', communityController.toggleLike);
router.get('/posts/:postId/comments', communityController.getComments);
router.post('/posts/:postId/comments', communityController.addComment);
router.post('/posts/:postId/comments/:commentId/reaction', communityController.reactToComment);
router.post('/posts/:postId/comments/:commentId/replies', communityController.addReply);

router.post('/reports', communityController.reportContent);
router.get('/managed', communityController.getManagedContent);

module.exports = router;
