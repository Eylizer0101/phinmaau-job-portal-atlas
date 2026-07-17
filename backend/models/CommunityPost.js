const mongoose = require('mongoose');

const communityCommentSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true, trim: true, maxlength: 2000 },
}, { timestamps: true });

const communityPostSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true, trim: true, maxlength: 5000 },
  category: {
    type: String,
    enum: ['insight', 'skill', 'question', 'resource', 'opportunity'],
    default: 'insight',
  },
  imageUrl: { type: String, default: '' },
  linkUrl: { type: String, default: '' },
  topics: [{ type: String, trim: true }],
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: { type: [communityCommentSchema], default: [] },
  commentsCount: { type: Number, default: 0 },
}, { timestamps: true });

communityPostSchema.index({ createdAt: -1 });
module.exports = mongoose.model('CommunityPost', communityPostSchema);
