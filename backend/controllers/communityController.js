const CommunityPost = require('../models/CommunityPost');

const authorFields = [
  'fullName',
  'firstName',
  'middleName',
  'lastName',
  'profileImage',
  'role',
  'employerProfile.companyName',
  'jobSeekerProfile.technicalSkills',
  'jobSeekerProfile.softSkills',
  'jobSeekerProfile.certifications',
  'jobSeekerProfile.projects',
  'jobSeekerProfile.seminars',
  'jobSeekerProfile.awards',
  'jobSeekerProfile.workExperiences',
].join(' ');

const populatePost = (query) => query
  .populate('author', authorFields)
  .populate('comments.author', authorFields)
  .populate('comments.replies.author', authorFields);

const normalizeTopics = (value) => {
  const items = Array.isArray(value) ? value : String(value || '').split(',');
  return [...new Set(
    items
      .map((item) => String(item || '').trim().replace(/^#+/, ''))
      .filter(Boolean)
      .slice(0, 10)
  )];
};

const countSkills = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean).length;
  return String(value || '')
    .split(/\|\||,/)
    .map((item) => item.trim())
    .filter(Boolean)
    .length;
};

const hasMeaningfulObjectValue = (item) => {
  if (!item || typeof item !== 'object') return false;
  return Object.entries(item).some(([key, value]) => (
    key !== '_id' && key !== 'createdAt' && key !== 'updatedAt' && String(value || '').trim()
  ));
};

const getJobSeekerLevel = (user = {}) => {
  if (user.role === 'employer') return 'Employer';

  const profile = user.jobSeekerProfile || {};
  const counts = {
    skills: countSkills(profile.technicalSkills) + countSkills(profile.softSkills),
    certifications: Array.isArray(profile.certifications) ? profile.certifications.filter(hasMeaningfulObjectValue).length : 0,
    projects: Array.isArray(profile.projects) ? profile.projects.filter(hasMeaningfulObjectValue).length : 0,
    seminars: Array.isArray(profile.seminars) ? profile.seminars.filter(hasMeaningfulObjectValue).length : 0,
    awards: Array.isArray(profile.awards) ? profile.awards.filter(hasMeaningfulObjectValue).length : 0,
    work: Array.isArray(profile.workExperiences) ? profile.workExperiences.length : 0,
  };

  const tiers = [
    { name: 'First Time Job Seeker', requirements: { skills: 0, certifications: 0, projects: 0, seminars: 0, awards: 0, work: 0 } },
    { name: 'Intermediate', requirements: { skills: 5, certifications: 1, projects: 1, seminars: 1, awards: 1, work: 0 } },
    { name: 'Expert', requirements: { skills: 9, certifications: 2, projects: 2, seminars: 2, awards: 2, work: 1 } },
    { name: 'Pro', requirements: { skills: 13, certifications: 5, projects: 5, seminars: 5, awards: 5, work: 2 } },
    { name: 'Legend', requirements: { skills: 17, certifications: 7, projects: 7, seminars: 7, awards: 7, work: 3 } },
  ];

  let current = tiers[0].name;
  tiers.forEach((tier) => {
    const passed = Object.entries(tier.requirements).every(([key, required]) => counts[key] >= required);
    if (passed) current = tier.name;
  });

  return current;
};

const decoratePost = (post, currentUserId) => {
  const item = post?.toObject ? post.toObject() : post;
  if (!item) return item;

  item.commentsCount = Array.isArray(item.comments) ? item.comments.length : Number(item.commentsCount || 0);
  item.likedByCurrentUser = (item.likes || []).some((id) => String(id) === String(currentUserId || ''));

  if (item.author && typeof item.author === 'object') {
    item.author.jobSeekerLevel = getJobSeekerLevel(item.author);
  }

  item.comments = (item.comments || []).map((comment) => {
    if (comment.author && typeof comment.author === 'object') {
      comment.author.jobSeekerLevel = getJobSeekerLevel(comment.author);
    }
    comment.replies = (comment.replies || []).map((reply) => {
      if (reply.author && typeof reply.author === 'object') {
        reply.author.jobSeekerLevel = getJobSeekerLevel(reply.author);
      }
      return reply;
    });
    return comment;
  });

  return item;
};

exports.getPosts = async (req, res) => {
  try {
    const category = String(req.query.category || 'all').toLowerCase();
    const search = String(req.query.search || '').trim();
    const query = {};

    if (category === 'you') {
      query.author = req.user._id;
    } else if (category !== 'all') {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { content: { $regex: search, $options: 'i' } },
        { topics: { $elemMatch: { $regex: search, $options: 'i' } } },
      ];
    }

    const posts = await populatePost(CommunityPost.find(query).sort({ createdAt: -1 }));
    const data = posts.map((post) => decoratePost(post, req.user?._id));

    res.json({ success: true, count: data.length, data });
  } catch (error) {
    console.error('Error fetching community posts:', error);
    res.status(500).json({ success: false, message: 'Error fetching community posts' });
  }
};

exports.createPost = async (req, res) => {
  try {
    const content = String(req.body.content || '').trim();
    const topics = normalizeTopics(req.body.topics);

    if (!content) {
      return res.status(400).json({ success: false, message: 'Post content is required' });
    }

    if (!topics.length) {
      return res.status(400).json({ success: false, message: 'At least one topic is required' });
    }

    const allowed = ['insight', 'skill', 'question', 'resource'];
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
      topics,
    });

    const populatedPost = await populatePost(CommunityPost.findById(post._id));
    res.status(201).json({ success: true, data: decoratePost(populatedPost, req.user._id) });
  } catch (error) {
    console.error('Error creating community post:', error);
    res.status(500).json({ success: false, message: error.message || 'Error creating community post' });
  }
};

exports.updatePost = async (req, res) => {
  try {
    const post = await CommunityPost.findById(req.params.postId);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
    if (String(post.author) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'You can only edit your own post' });
    }

    const content = String(req.body.content || '').trim();
    const topics = normalizeTopics(req.body.topics);
    if (!content) return res.status(400).json({ success: false, message: 'Post content is required' });
    if (!topics.length) return res.status(400).json({ success: false, message: 'At least one topic is required' });

    const allowed = ['insight', 'skill', 'question', 'resource'];
    post.content = content;
    post.category = allowed.includes(req.body.category) ? req.body.category : post.category;
    post.linkUrl = String(req.body.linkUrl || '').trim();
    post.topics = topics;

    const uploadedImageUrl = [
      req.file?.secure_url,
      req.file?.url,
      req.file?.path,
      req.file?.location,
    ].find((value) => typeof value === 'string' && value.trim());

    if (uploadedImageUrl) post.imageUrl = String(uploadedImageUrl).trim();
    await post.save();

    const populatedPost = await populatePost(CommunityPost.findById(post._id));
    res.json({ success: true, data: decoratePost(populatedPost, req.user._id) });
  } catch (error) {
    console.error('Error updating community post:', error);
    res.status(500).json({ success: false, message: 'Error updating community post' });
  }
};

exports.deletePost = async (req, res) => {
  try {
    const post = await CommunityPost.findById(req.params.postId);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
    if (String(post.author) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'You can only delete your own post' });
    }

    await post.deleteOne();
    res.json({ success: true, message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting community post:', error);
    res.status(500).json({ success: false, message: 'Error deleting community post' });
  }
};

exports.toggleLike = async (req, res) => {
  try {
    const post = await CommunityPost.findById(req.params.postId);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    const userId = String(req.user._id);
    const existingIndex = post.likes.findIndex((id) => String(id) === userId);
    let liked = false;

    if (existingIndex >= 0) post.likes.splice(existingIndex, 1);
    else {
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

    const decorated = decoratePost(post, req.user._id);
    res.json({ success: true, count: decorated.comments.length, data: decorated.comments });
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
    const decorated = decoratePost(populatedPost, req.user._id);
    const comment = decorated.comments[decorated.comments.length - 1];

    res.status(201).json({
      success: true,
      data: comment,
      commentsCount: decorated.comments.length,
    });
  } catch (error) {
    console.error('Error adding community post comment:', error);
    res.status(500).json({ success: false, message: 'Error adding comment' });
  }
};

exports.reactToComment = async (req, res) => {
  try {
    const reaction = String(req.body.reaction || '');
    if (!['helpful', 'notHelpful'].includes(reaction)) {
      return res.status(400).json({ success: false, message: 'Invalid reaction' });
    }

    const post = await CommunityPost.findById(req.params.postId);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ success: false, message: 'Comment not found' });

    const userId = String(req.user._id);
    const selected = reaction === 'helpful' ? comment.helpful : comment.notHelpful;
    const opposite = reaction === 'helpful' ? comment.notHelpful : comment.helpful;

    const selectedIndex = selected.findIndex((id) => String(id) === userId);
    if (selectedIndex >= 0) selected.splice(selectedIndex, 1);
    else {
      selected.push(req.user._id);
      const oppositeIndex = opposite.findIndex((id) => String(id) === userId);
      if (oppositeIndex >= 0) opposite.splice(oppositeIndex, 1);
    }

    await post.save();
    const populatedPost = await populatePost(CommunityPost.findById(post._id));
    const decorated = decoratePost(populatedPost, req.user._id);
    const updatedComment = decorated.comments.find((item) => String(item._id) === String(comment._id));

    res.json({ success: true, data: updatedComment });
  } catch (error) {
    console.error('Error reacting to comment:', error);
    res.status(500).json({ success: false, message: 'Error updating comment reaction' });
  }
};

exports.addReply = async (req, res) => {
  try {
    const content = String(req.body.content || '').trim();
    if (!content) return res.status(400).json({ success: false, message: 'Reply is required' });

    const post = await CommunityPost.findById(req.params.postId);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ success: false, message: 'Comment not found' });

    comment.replies.push({ author: req.user._id, content });
    await post.save();

    const populatedPost = await populatePost(CommunityPost.findById(post._id));
    const decorated = decoratePost(populatedPost, req.user._id);
    const updatedComment = decorated.comments.find((item) => String(item._id) === String(comment._id));

    res.status(201).json({ success: true, data: updatedComment });
  } catch (error) {
    console.error('Error adding comment reply:', error);
    res.status(500).json({ success: false, message: 'Error adding reply' });
  }
};

exports.reportContent = async (req, res) => {
  try {
    const targetType = String(req.body.targetType || '');
    const postId = String(req.body.postId || '');
    const commentId = String(req.body.commentId || '');
    const reason = String(req.body.reason || '').trim();

    if (!['post', 'comment'].includes(targetType) || !postId || !reason) {
      return res.status(400).json({ success: false, message: 'Incomplete report details' });
    }

    const allowedReasons = ['spam', 'harassment', 'misleading', 'inappropriate', 'other'];
    if (!allowedReasons.includes(reason)) {
      return res.status(400).json({ success: false, message: 'Invalid report reason' });
    }

    const post = await CommunityPost.findById(postId);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    const report = { reporter: req.user._id, reason };

    if (targetType === 'post') {
      const alreadyReported = post.reports.some((item) => String(item.reporter) === String(req.user._id));
      if (!alreadyReported) post.reports.push(report);
    } else {
      const comment = post.comments.id(commentId);
      if (!comment) return res.status(404).json({ success: false, message: 'Comment not found' });
      const alreadyReported = comment.reports.some((item) => String(item.reporter) === String(req.user._id));
      if (!alreadyReported) comment.reports.push(report);
    }

    await post.save();
    res.status(201).json({ success: true, message: 'Report submitted successfully' });
  } catch (error) {
    console.error('Error reporting community content:', error);
    res.status(500).json({ success: false, message: 'Error submitting report' });
  }
};

exports.getManagedContent = async (req, res) => {
  try {
    const type = String(req.query.type || 'all');
    const sort = String(req.query.sort || 'newest');
    const direction = sort === 'oldest' ? 1 : -1;
    const userId = String(req.user._id);

    let posts = [];
    let comments = [];

    if (type === 'all' || type === 'posts') {
      const ownedPosts = await populatePost(
        CommunityPost.find({ author: req.user._id }).sort({ createdAt: direction })
      );
      posts = ownedPosts.map((post) => decoratePost(post, req.user._id));
    }

    if (type === 'all' || type === 'comments') {
      const postsWithComments = await populatePost(
        CommunityPost.find({ 'comments.author': req.user._id })
      );

      comments = postsWithComments.flatMap((post) => {
        const decorated = decoratePost(post, req.user._id);
        return (decorated.comments || [])
          .filter((comment) => String(comment.author?._id || comment.author) === userId)
          .map((comment) => ({
            postId: decorated._id,
            postContent: decorated.content,
            comment,
          }));
      });

      comments.sort((a, b) => {
        const left = new Date(a.comment.createdAt).getTime();
        const right = new Date(b.comment.createdAt).getTime();
        return sort === 'oldest' ? left - right : right - left;
      });
    }

    res.json({ success: true, posts, comments });
  } catch (error) {
    console.error('Error fetching managed community content:', error);
    res.status(500).json({ success: false, message: 'Error fetching managed content' });
  }
};
