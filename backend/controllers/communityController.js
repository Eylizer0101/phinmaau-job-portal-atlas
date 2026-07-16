const CommunityPost = require('../models/CommunityPost');

const authorFields = 'fullName firstName middleName lastName profileImage role employerProfile.companyName';

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

    const posts = await CommunityPost.find(query)
      .populate('author', authorFields)
      .sort({ createdAt: -1 });

    res.json({ success: true, count: posts.length, data: posts });
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
    const topics = Array.isArray(req.body.topics)
      ? req.body.topics.map((item) => String(item).trim()).filter(Boolean).slice(0, 10)
      : String(req.body.topics || '').split(',').map((item) => item.trim()).filter(Boolean).slice(0, 10);

    const post = await CommunityPost.create({
      author: req.user._id,
      content,
      category,
      imageUrl: String(req.body.imageUrl || '').trim(),
      linkUrl: String(req.body.linkUrl || '').trim(),
      topics,
    });

    await post.populate('author', authorFields);
    res.status(201).json({ success: true, data: post });
  } catch (error) {
    console.error('Error creating community post:', error);
    res.status(500).json({ success: false, message: 'Error creating community post' });
  }
};
