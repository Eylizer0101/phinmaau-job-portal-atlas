const CommunityPost = require('../models/CommunityPost');
const User = require('../models/User');
const crypto = require('crypto');


const normalizeModerationText = (value) =>
  String(value || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const MODERATION_RULES = [
  {
    flag: 'offensive_language',
    message: 'Offensive or abusive language is not allowed.',
    patterns: [
      /\b(gago|tanga|bobo|ulol|putang\s*ina|puta|pakyu|fuck\s*you|idiot|moron)\b/i,
    ],
  },
  {
    flag: 'hate_speech',
    message: 'Hate speech or discriminatory attacks are not allowed.',
    patterns: [
      /\b(kill|eliminate|exterminate)\s+(all|every)\s+\w+/i,
      /\b(hate|inferior|disgusting)\s+(all\s+)?(muslim|christian|gay|lesbian|trans|black|white|asian|filipino)s?\b/i,
    ],
  },
  {
    flag: 'violent_threat',
    message: 'Threats or violent language are not allowed.',
    patterns: [
      /\b(papatayin|sasaktan|babarilin|sasaksakin|bugbugin)\s+(kita|ka|ko kayo|kayong lahat)\b/i,
      /\b(i('| a)?ll|im going to|gonna)\s+(kill|hurt|shoot|stab|beat)\s+(you|them|him|her)\b/i,
    ],
  },
  {
    flag: 'sexual_content',
    message: 'Sexual or explicit content is not allowed.',
    patterns: [
      /\b(porn|porno|nudes?|naked|sex video|explicit sex|onlyfans)\b/i,
    ],
  },
  {
    flag: 'scam_indicator',
    message: 'Possible scam content was detected. Payment before employment is not allowed.',
    patterns: [
      /\b(pay|payment|bayad|magbayad|gcash|send money|deposit)\b.{0,45}\b(before|bago)\b.{0,30}\b(job|hire|hired|employment|interview|trabaho)\b/i,
      /\b(registration fee|processing fee|placement fee)\b/i,
    ],
  },
];

const SUSPICIOUS_LINK_PATTERNS = [
  /(?:bit\.ly|tinyurl\.com|t\.co|goo\.gl|cutt\.ly|rb\.gy|shorturl\.at)/i,
  /(?:free-money|instant-cash|guaranteed-income|crypto-giveaway)/i,
];

const moderateText = (value) => {
  const text = normalizeModerationText(value);
  const flags = [];

  for (const rule of MODERATION_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(text))) {
      flags.push(rule.flag);
      return { allowed: false, flags, message: rule.message };
    }
  }

  const urls = text.match(/https?:\/\/[^\s]+|www\.[^\s]+/gi) || [];
  if (urls.some((url) => SUSPICIOUS_LINK_PATTERNS.some((pattern) => pattern.test(url)))) {
    return {
      allowed: false,
      flags: ['suspicious_link'],
      message: 'A suspicious or shortened link was detected.',
    };
  }

  const repeatedChunk = text.match(/(.{8,80})(?:\s+\1){2,}/i);
  if (repeatedChunk) {
    return {
      allowed: false,
      flags: ['repeated_message'],
      message: 'Repeated or spam-like text is not allowed.',
    };
  }

  return { allowed: true, flags };
};

const createContentFingerprint = (content) =>
  crypto
    .createHash('sha256')
    .update(normalizeModerationText(content))
    .digest('hex');

const ensureModeratedText = (value, label = 'Content') => {
  const result = moderateText(value);
  if (!result.allowed) {
    const error = new Error(`${label}: ${result.message}`);
    error.statusCode = 400;
    error.moderationFlags = result.flags;
    throw error;
  }
  return result;
};

const getUploadedFiles = (req, fieldName) =>
  Array.isArray(req.files?.[fieldName]) ? req.files[fieldName] : [];

const getUploadedUrl = (file) =>
  [file?.secure_url, file?.url, file?.path, file?.location]
    .find((value) => typeof value === 'string' && value.trim()) || '';

const mapUploadedDocuments = (files) =>
  files.map((file) => ({
    name: String(file.originalname || file.filename || 'document').trim(),
    url: String(getUploadedUrl(file)).trim(),
    mimeType: String(file.mimetype || '').trim(),
    size: Number(file.size || file.bytes || 0),
  }));

const ensurePostingRate = async (userId) => {
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
  const recentPostCount = await CommunityPost.countDocuments({
    author: userId,
    createdAt: { $gte: tenMinutesAgo },
    isDeleted: { $ne: true },
  });

  if (recentPostCount >= 5) {
    const error = new Error('Too many posts. Please wait before posting again.');
    error.statusCode = 429;
    throw error;
  }
};

const ensureNoRecentDuplicatePost = async (userId, fingerprint, excludePostId = null) => {
  const query = {
    author: userId,
    contentFingerprint: fingerprint,
    createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    isDeleted: { $ne: true },
  };

  if (excludePostId) query._id = { $ne: excludePostId };

  const duplicate = await CommunityPost.exists(query);
  if (duplicate) {
    const error = new Error('Duplicate post detected. You already posted the same content recently.');
    error.statusCode = 409;
    throw error;
  }
};

const ensureNoRecentRepeatedInteraction = async ({
  post,
  userId,
  content,
  type,
}) => {
  const normalized = normalizeModerationText(content);
  const cutoff = Date.now() - 60 * 1000;

  const recentMatches = [];

  for (const comment of post.comments || []) {
    if (
      type === 'comment' &&
      String(comment.author) === String(userId) &&
      normalizeModerationText(comment.content) === normalized &&
      new Date(comment.createdAt || 0).getTime() >= cutoff
    ) {
      recentMatches.push(comment);
    }

    for (const reply of comment.replies || []) {
      if (
        type === 'reply' &&
        String(reply.author) === String(userId) &&
        normalizeModerationText(reply.content) === normalized &&
        new Date(reply.createdAt || 0).getTime() >= cutoff
      ) {
        recentMatches.push(reply);
      }
    }
  }

  if (recentMatches.length) {
    const error = new Error(`Repeated ${type} detected. Please avoid sending the same message repeatedly.`);
    error.statusCode = 409;
    throw error;
  }
};

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

  item.comments = (item.comments || []).filter((comment) => comment?.isDeleted !== true);
  item.commentsCount = item.comments.length;
  item.likedByCurrentUser = (item.likes || []).some((id) => String(id) === String(currentUserId || ''));

  if (item.author && typeof item.author === 'object') {
    item.author.jobSeekerLevel = getJobSeekerLevel(item.author);
  }

  item.comments = (item.comments || []).map((comment) => {
    if (comment.author && typeof comment.author === 'object') {
      comment.author.jobSeekerLevel = getJobSeekerLevel(comment.author);
    }
    comment.replies = (comment.replies || [])
      .filter((reply) => reply?.isDeleted !== true)
      .map((reply) => {
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
    const query = { isDeleted: { $ne: true } };

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

    const moderation = ensureModeratedText(
      [content, req.body.linkUrl, topics.join(' ')].filter(Boolean).join(' '),
      'Post'
    );
    await ensurePostingRate(req.user._id);

    const contentFingerprint = createContentFingerprint(content);
    await ensureNoRecentDuplicatePost(req.user._id, contentFingerprint);

    const allowed = ['insight', 'skill', 'question', 'resource'];
    const category = allowed.includes(req.body.category) ? req.body.category : 'insight';

    const imageFiles = getUploadedFiles(req, 'images');
    const videoFile = getUploadedFiles(req, 'video')[0] || null;
    const documentFiles = getUploadedFiles(req, 'documents');

    const imageUrls = imageFiles.map(getUploadedUrl).filter(Boolean);
    const videoUrl = getUploadedUrl(videoFile);
    const videoDuration = Number(videoFile?.duration || req.body.videoDuration || 0);

    if (imageFiles.length > 10) {
      return res.status(400).json({ success: false, message: 'Maximum of 10 images per post.' });
    }

    if (videoDuration > 600) {
      return res.status(400).json({ success: false, message: 'Video must not exceed 10 minutes.' });
    }

    const post = await CommunityPost.create({
      author: req.user._id,
      content,
      category,
      imageUrl: imageUrls[0] || '',
      imageUrls,
      videoUrl,
      videoDuration,
      documents: mapUploadedDocuments(documentFiles),
      isSensitive: String(req.body.isSensitive || '').toLowerCase() === 'true',
      moderationFlags: moderation.flags,
      contentFingerprint,
      linkUrl: String(req.body.linkUrl || '').trim(),
      topics,
    });

    const populatedPost = await populatePost(CommunityPost.findById(post._id));
    res.status(201).json({ success: true, data: decoratePost(populatedPost, req.user._id) });
  } catch (error) {
    console.error('Error creating community post:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Error creating community post',
      moderationFlags: error.moderationFlags || [],
    });
  }
};

exports.updatePost = async (req, res) => {
  try {
    const post = await CommunityPost.findById(req.params.postId).select(
      'author category imageUrl imageUrls videoUrl videoDuration documents isSensitive'
    );
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    if (String(post.author) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'You can only edit your own post' });
    }

    const content = String(req.body.content || '').trim();
    const topics = normalizeTopics(req.body.topics);

    if (!content) {
      return res.status(400).json({ success: false, message: 'Post content is required' });
    }

    if (!topics.length) {
      return res.status(400).json({ success: false, message: 'At least one topic is required' });
    }

    const moderation = ensureModeratedText(
      [content, req.body.linkUrl, topics.join(' ')].filter(Boolean).join(' '),
      'Post'
    );
    const contentFingerprint = createContentFingerprint(content);
    await ensureNoRecentDuplicatePost(req.user._id, contentFingerprint, post._id);

    const allowedCategories = ['insight', 'skill', 'question', 'resource'];
    const requestedCategory = String(req.body.category || '').trim().toLowerCase();
    const category = allowedCategories.includes(requestedCategory)
      ? requestedCategory
      : (allowedCategories.includes(post.category) ? post.category : 'insight');

    const imageFiles = getUploadedFiles(req, 'images');
    const videoFile = getUploadedFiles(req, 'video')[0] || null;
    const documentFiles = getUploadedFiles(req, 'documents');

    const newImageUrls = imageFiles.map(getUploadedUrl).filter(Boolean);
    const videoDuration = Number(videoFile?.duration || req.body.videoDuration || post.videoDuration || 0);

    if (newImageUrls.length > 10) {
      return res.status(400).json({ success: false, message: 'Maximum of 10 images per post.' });
    }

    if (videoDuration > 600) {
      return res.status(400).json({ success: false, message: 'Video must not exceed 10 minutes.' });
    }

    const updateData = {
      content,
      category,
      linkUrl: String(req.body.linkUrl || '').trim(),
      topics,
      moderationFlags: moderation.flags,
      contentFingerprint,
      isSensitive: String(req.body.isSensitive || post.isSensitive).toLowerCase() === 'true',
    };

    if (newImageUrls.length) {
      updateData.imageUrls = newImageUrls;
      updateData.imageUrl = newImageUrls[0];
    }

    if (videoFile) {
      updateData.videoUrl = getUploadedUrl(videoFile);
      updateData.videoDuration = videoDuration;
    }

    if (documentFiles.length) {
      updateData.documents = mapUploadedDocuments(documentFiles);
    }

    await CommunityPost.updateOne(
      { _id: post._id, author: req.user._id },
      { $set: updateData },
      { runValidators: false }
    );

    const populatedPost = await populatePost(CommunityPost.findById(post._id));
    return res.json({
      success: true,
      data: decoratePost(populatedPost, req.user._id),
    });
  } catch (error) {
    console.error('Error updating community post:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Error updating community post',
      moderationFlags: error.moderationFlags || [],
    });
  }
};

exports.deletePost = async (req, res) => {
  try {
    const post = await CommunityPost.findById(req.params.postId);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
    if (String(post.author) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'You can only delete your own post' });
    }

    post.isDeleted = true;
    post.deletedAt = new Date();
    post.deletedBy = req.user._id;
    await post.save({ validateBeforeSave: false });
    res.json({ success: true, message: 'Post moved to archive successfully' });
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
    ensureModeratedText(content, 'Comment');

    const post = await CommunityPost.findById(req.params.postId);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
    await ensureNoRecentRepeatedInteraction({
      post,
      userId: req.user._id,
      content,
      type: 'comment',
    });

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
    res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Error adding comment', moderationFlags: error.moderationFlags || [] });
  }
};


exports.deleteComment = async (req, res) => {
  try {
    const post = await CommunityPost.findOne({ _id: req.params.postId, isDeleted: { $ne: true } });
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    const comment = post.comments.id(req.params.commentId);
    if (!comment || comment.isDeleted === true) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    if (String(comment.author) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'You can only delete your own comment' });
    }

    comment.isDeleted = true;
    comment.deletedAt = new Date();
    comment.deletedBy = req.user._id;
    post.commentsCount = post.comments.filter((item) => item.isDeleted !== true).length;
    await post.save({ validateBeforeSave: false });

    return res.json({
      success: true,
      message: 'Comment moved to archive successfully',
      commentsCount: post.commentsCount,
    });
  } catch (error) {
    console.error('Error deleting community comment:', error);
    return res.status(500).json({ success: false, message: 'Error deleting comment' });
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

exports.reactToReply = async (req, res) => {
  try {
    const reaction = String(req.body.reaction || '');
    if (!['helpful', 'notHelpful'].includes(reaction)) {
      return res.status(400).json({ success: false, message: 'Invalid reaction' });
    }

    const post = await CommunityPost.findById(req.params.postId);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ success: false, message: 'Comment not found' });

    const reply = comment.replies.id(req.params.replyId);
    if (!reply) return res.status(404).json({ success: false, message: 'Reply not found' });

    const userId = String(req.user._id);
    const selected = reaction === 'helpful' ? reply.helpful : reply.notHelpful;
    const opposite = reaction === 'helpful' ? reply.notHelpful : reply.helpful;

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
    console.error('Error reacting to reply:', error);
    res.status(500).json({ success: false, message: 'Error updating reply reaction' });
  }
};

exports.addReply = async (req, res) => {
  try {
    const content = String(req.body.content || '').trim();
    const parentReplyId = String(req.body.parentReplyId || '').trim();
    if (!content) return res.status(400).json({ success: false, message: 'Reply is required' });
    ensureModeratedText(content, 'Reply');

    const post = await CommunityPost.findById(req.params.postId);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ success: false, message: 'Comment not found' });

    if (parentReplyId && !comment.replies.id(parentReplyId)) {
      return res.status(404).json({ success: false, message: 'Parent reply not found' });
    }

    await ensureNoRecentRepeatedInteraction({
      post,
      userId: req.user._id,
      content,
      type: 'reply',
    });

    comment.replies.push({
      author: req.user._id,
      content,
      parentReplyId: parentReplyId || null,
    });
    await post.save();

    const populatedPost = await populatePost(CommunityPost.findById(post._id));
    const decorated = decoratePost(populatedPost, req.user._id);
    const updatedComment = decorated.comments.find((item) => String(item._id) === String(comment._id));

    res.status(201).json({ success: true, data: updatedComment });
  } catch (error) {
    console.error('Error adding comment reply:', error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Error adding reply', moderationFlags: error.moderationFlags || [] });
  }
};


exports.updateComment = async (req, res) => {
  try {
    const content = String(req.body.content || '').trim();
    if (!content) return res.status(400).json({ success: false, message: 'Comment is required' });
    ensureModeratedText(content, 'Comment');

    const post = await CommunityPost.findOne({ _id: req.params.postId, isDeleted: { $ne: true } });
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    const comment = post.comments.id(req.params.commentId);
    if (!comment || comment.isDeleted === true) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    if (String(comment.author) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'You can only edit your own comment' });
    }

    comment.content = content;
    await post.save({ validateBeforeSave: false });

    const populatedPost = await populatePost(CommunityPost.findById(post._id));
    const decorated = decoratePost(populatedPost, req.user._id);
    const updatedComment = decorated.comments.find((item) => String(item._id) === String(comment._id));

    return res.json({ success: true, data: updatedComment });
  } catch (error) {
    console.error('Error updating community comment:', error);
    return res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Error updating comment', moderationFlags: error.moderationFlags || [] });
  }
};

exports.updateReply = async (req, res) => {
  try {
    const content = String(req.body.content || '').trim();
    if (!content) return res.status(400).json({ success: false, message: 'Reply is required' });
    ensureModeratedText(content, 'Reply');

    const post = await CommunityPost.findOne({ _id: req.params.postId, isDeleted: { $ne: true } });
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    const comment = post.comments.id(req.params.commentId);
    if (!comment || comment.isDeleted === true) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    const reply = comment.replies.id(req.params.replyId);
    if (!reply || reply.isDeleted === true) {
      return res.status(404).json({ success: false, message: 'Reply not found' });
    }

    if (String(reply.author) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'You can only edit your own reply' });
    }

    reply.content = content;
    await post.save({ validateBeforeSave: false });

    const populatedPost = await populatePost(CommunityPost.findById(post._id));
    const decorated = decoratePost(populatedPost, req.user._id);
    const updatedComment = decorated.comments.find((item) => String(item._id) === String(comment._id));

    return res.json({ success: true, data: updatedComment });
  } catch (error) {
    console.error('Error updating community reply:', error);
    return res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Error updating reply', moderationFlags: error.moderationFlags || [] });
  }
};

exports.deleteReply = async (req, res) => {
  try {
    const post = await CommunityPost.findOne({ _id: req.params.postId, isDeleted: { $ne: true } });
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    const comment = post.comments.id(req.params.commentId);
    if (!comment || comment.isDeleted === true) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    const reply = comment.replies.id(req.params.replyId);
    if (!reply || reply.isDeleted === true) {
      return res.status(404).json({ success: false, message: 'Reply not found' });
    }

    if (String(reply.author) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'You can only delete your own reply' });
    }

    reply.isDeleted = true;
    reply.deletedAt = new Date();
    reply.deletedBy = req.user._id;
    await post.save({ validateBeforeSave: false });

    const populatedPost = await populatePost(CommunityPost.findById(post._id));
    const decorated = decoratePost(populatedPost, req.user._id);
    const updatedComment = decorated.comments.find((item) => String(item._id) === String(comment._id));

    return res.json({
      success: true,
      message: 'Reply deleted successfully',
      data: updatedComment,
    });
  } catch (error) {
    console.error('Error deleting community reply:', error);
    return res.status(500).json({ success: false, message: 'Error deleting reply' });
  }
};

exports.getArchivedPosts = async (req, res) => {
  try {
    const sort = String(req.query.sort || 'newest');
    const direction = sort === 'oldest' ? 1 : -1;

    const posts = await populatePost(
      CommunityPost.find({ author: req.user._id, isDeleted: true }).sort({ deletedAt: direction })
    );

    const postsWithArchivedComments = await populatePost(
      CommunityPost.find({
        comments: {
          $elemMatch: {
            author: req.user._id,
            isDeleted: true,
          },
        },
      })
    );

    const comments = postsWithArchivedComments.flatMap((post) => {
      const item = post?.toObject ? post.toObject() : post;
      return (item.comments || [])
        .filter((comment) => (
          String(comment.author?._id || comment.author) === String(req.user._id) &&
          comment.isDeleted === true
        ))
        .map((comment) => ({
          postId: item._id,
          postContent: item.content,
          comment,
        }));
    });

    comments.sort((a, b) => {
      const left = new Date(a.comment.deletedAt || a.comment.updatedAt).getTime();
      const right = new Date(b.comment.deletedAt || b.comment.updatedAt).getTime();
      return sort === 'oldest' ? left - right : right - left;
    });

    return res.json({
      success: true,
      posts: posts.map((post) => decoratePost(post, req.user._id)),
      comments,
    });
  } catch (error) {
    console.error('Error fetching archived community posts:', error);
    return res.status(500).json({ success: false, message: 'Error fetching archived posts' });
  }
};


exports.restoreArchivedComment = async (req, res) => {
  try {
    const post = await CommunityPost.findById(req.params.postId);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    const comment = post.comments.id(req.params.commentId);
    if (!comment || comment.isDeleted !== true) {
      return res.status(404).json({ success: false, message: 'Archived comment not found' });
    }

    if (String(comment.author) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'You can only restore your own comment' });
    }

    comment.isDeleted = false;
    comment.deletedAt = null;
    comment.deletedBy = null;
    post.commentsCount = post.comments.filter((item) => item.isDeleted !== true).length;
    await post.save({ validateBeforeSave: false });

    return res.json({ success: true, message: 'Comment restored successfully' });
  } catch (error) {
    console.error('Error restoring archived community comment:', error);
    return res.status(500).json({ success: false, message: 'Error restoring comment' });
  }
};

exports.permanentlyDeleteArchivedComment = async (req, res) => {
  try {
    const post = await CommunityPost.findById(req.params.postId);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    const comment = post.comments.id(req.params.commentId);
    if (!comment || comment.isDeleted !== true) {
      return res.status(404).json({ success: false, message: 'Archived comment not found' });
    }

    if (String(comment.author) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'You can only permanently delete your own comment' });
    }

    comment.deleteOne();
    post.commentsCount = post.comments.filter((item) => item.isDeleted !== true).length;
    await post.save({ validateBeforeSave: false });

    return res.json({ success: true, message: 'Comment permanently deleted' });
  } catch (error) {
    console.error('Error permanently deleting archived community comment:', error);
    return res.status(500).json({ success: false, message: 'Error permanently deleting comment' });
  }
};

exports.restoreArchivedPost = async (req, res) => {
  try {
    const post = await CommunityPost.findOne({
      _id: req.params.postId,
      author: req.user._id,
      isDeleted: true,
    });

    if (!post) return res.status(404).json({ success: false, message: 'Archived post not found' });

    post.isDeleted = false;
    post.deletedAt = null;
    post.deletedBy = null;
    await post.save({ validateBeforeSave: false });

    const populatedPost = await populatePost(CommunityPost.findById(post._id));
    return res.json({
      success: true,
      message: 'Post restored successfully',
      data: decoratePost(populatedPost, req.user._id),
    });
  } catch (error) {
    console.error('Error restoring archived community post:', error);
    return res.status(500).json({ success: false, message: 'Error restoring post' });
  }
};

exports.permanentlyDeleteArchivedPost = async (req, res) => {
  try {
    const deleted = await CommunityPost.findOneAndDelete({
      _id: req.params.postId,
      author: req.user._id,
      isDeleted: true,
    });

    if (!deleted) return res.status(404).json({ success: false, message: 'Archived post not found' });

    return res.json({ success: true, message: 'Post permanently deleted' });
  } catch (error) {
    console.error('Error permanently deleting archived community post:', error);
    return res.status(500).json({ success: false, message: 'Error permanently deleting post' });
  }
};

exports.reportContent = async (req, res) => {
  try {
    const targetType = String(req.body.targetType || '');
    const postId = String(req.body.postId || '');
    const commentId = String(req.body.commentId || '');
    const replyId = String(req.body.replyId || '');
    const reason = String(req.body.reason || '').trim();

    if (!['post', 'comment', 'reply'].includes(targetType) || !postId || !reason) {
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

      if (targetType === 'reply') {
        const reply = comment.replies.id(replyId);
        if (!reply) return res.status(404).json({ success: false, message: 'Reply not found' });
        const alreadyReported = reply.reports.some((item) => String(item.reporter) === String(req.user._id));
        if (!alreadyReported) reply.reports.push(report);
      } else {
        const alreadyReported = comment.reports.some((item) => String(item.reporter) === String(req.user._id));
        if (!alreadyReported) comment.reports.push(report);
      }
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
        CommunityPost.find({ author: req.user._id, isDeleted: { $ne: true } }).sort({ createdAt: direction })
      );
      posts = ownedPosts.map((post) => decoratePost(post, req.user._id));
    }

    if (type === 'all' || type === 'comments') {
      const postsWithComments = await populatePost(
        CommunityPost.find({ isDeleted: { $ne: true }, 'comments.author': req.user._id })
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

exports.getCommunityGuidelinesStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('communityGuidelinesAcceptedAt');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.json({
      success: true,
      accepted: Boolean(user.communityGuidelinesAcceptedAt),
      acceptedAt: user.communityGuidelinesAcceptedAt || null,
    });
  } catch (error) {
    console.error('Error fetching Community Guidelines status:', error);
    return res.status(500).json({ success: false, message: 'Error fetching Community Guidelines status' });
  }
};

exports.acceptCommunityGuidelines = async (req, res) => {
  try {
    const acceptedAt = new Date();
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { communityGuidelinesAcceptedAt: acceptedAt } },
      { new: true }
    ).select('communityGuidelinesAcceptedAt');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.json({
      success: true,
      message: 'Community Guidelines accepted successfully',
      acceptedAt: user.communityGuidelinesAcceptedAt,
    });
  } catch (error) {
    console.error('Error accepting Community Guidelines:', error);
    return res.status(500).json({ success: false, message: 'Error accepting Community Guidelines' });
  }
};

