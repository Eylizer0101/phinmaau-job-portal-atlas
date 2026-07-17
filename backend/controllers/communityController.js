const CommunityPost = require('../models/CommunityPost');

const authorFields = 'fullName firstName middleName lastName profileImage role employerProfile.companyName';

const populatePost = (query) => query
  .populate('author', authorFields)
  .populate('comments.author', authorFields);

const normalizeTopics = (value) => {
  const items = Array.isArray(value) ? value : String(value || '').split(',');
  return [...new Set(
    items
      .map((item) => String(item || '').trim().replace(/^#+/, ''))
      .filter(Boolean)
      .slice(0, 10)
  )];
};

exports.getPosts = async (req, res) => {
  try {
    const category = String(req.query.category || 'all').toLowerCase();
    const search = String(req.query.search || '').trim();
    const query = {};
    if (category !== 'all') query.category = category;
    if (search) {
      query.$or = [
        { content: { $regex: search, $options: 'i' } },
        { topics: { $elemMatch: { $regex: search, $options: 'i' } } },
      ];
    }

    const posts = await populatePost(
      CommunityPost.find(query).sort({ createdAt: -1 })
    );

    const currentUserId = String(req.user?._id || '');
    const data = posts.map((post) => {
      const item = post.toObject();
      item.commentsCount = Array.isArray(item.comments) ? item.comments.length : Number(item.commentsCount || 0);
      item.likedByCurrentUser = (item.likes || []).some((id) => String(id) === currentUserId);
      return item;
    });

    res.json({ success: true, count: data.length, data });
  } catch (error) {
    console.error('Error fetching community posts:', error);
    res.status(500).json({ success: false, message: 'Error fetching community posts' });
  }
};

exports.createPost = async (req, res) => {
  try {
    const content = String(req.body.content || '').trim();
    if (!content) {
      return res.status(400).json({ success: false, message: 'Post content is required' });
    }

    const allowed = ['insight', 'skill', 'question', 'resource', 'opportunity'];
    const category = allowed.includes(req.body.category) ? req.body.category : 'insight';
    const uploadedImageUrl = [
      req.file?.secure_url,
      req.file?.url,
      req.file?.path,
      req.file?.location,
    ].find((value) => typeof value === 'string' && value.trim());

    const imageUrl = String(uploadedImageUrl || req.body.imageUrl || '').trim();

    if (req.file && !imageUrl) {
      return res.status(500).json({
        success: false,
        message: 'Image upload finished, but no image URL was generated.',
      });
    }

    const post = await CommunityPost.create({
      author: req.user._id,
      content,
      category,
      imageUrl,
      linkUrl: String(req.body.linkUrl || '').trim(),
      topics: normalizeTopics(req.body.topics),
    });

    const populatedPost = await populatePost(CommunityPost.findById(post._id));
    const responsePost = populatedPost?.toObject ? populatedPost.toObject() : populatedPost;

    res.status(201).json({
      success: true,
      data: responsePost,
    });
  } catch (error) {
    console.error('Error creating community post:', error);
    res.status(500).json({ success: false, message: error.message || 'Error creating community post' });
  }
};

exports.toggleLike = async (req, res) => {
  try {
    const post = await CommunityPost.findById(req.params.postId);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    const userId = String(req.user._id);
    const existingIndex = post.likes.findIndex((id) => String(id) === userId);
    let liked = false;

    if (existingIndex >= 0) {
      post.likes.splice(existingIndex, 1);
    } else {
      post.likes.push(req.user._id);
      liked = true;
    }

    await post.save();
    res.json({ success: true, liked, likes: post.likes, count: post.likes.length });
  } catch (error) {
    console.error('Error toggling community post like:', error);
    res.status(500).json({ success: false, message: 'Error updating like' });
  }
};

exports.getComments = async (req, res) => {
  try {
    const post = await populatePost(CommunityPost.findById(req.params.postId));
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
    res.json({ success: true, count: post.comments.length, data: post.comments });
  } catch (error) {
    console.error('Error fetching community post comments:', error);
    res.status(500).json({ success: false, message: 'Error fetching comments' });
  }
};

exports.addComment = async (req, res) => {
  try {
    const content = String(req.body.content || '').trim();
    if (!content) return res.status(400).json({ success: false, message: 'Comment is required' });

    const post = await CommunityPost.findById(req.params.postId);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    post.comments.push({ author: req.user._id, content });
    post.commentsCount = post.comments.length;
    await post.save();

    const populatedPost = await populatePost(CommunityPost.findById(post._id));
    const comment = populatedPost.comments[populatedPost.comments.length - 1];

    res.status(201).json({
      success: true,
      data: comment,
      commentsCount: populatedPost.comments.length,
    });
  } catch (error) {
    console.error('Error adding community post comment:', error);
    res.status(500).json({ success: false, message: 'Error adding comment' });
  }
};
