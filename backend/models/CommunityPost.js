const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reason: {
    type: String,
    enum: ['spam', 'harassment', 'misleading', 'inappropriate', 'other'],
    required: true,
  },
}, { timestamps: true });

const communityReplySchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true, trim: true, maxlength: 2000 },
}, { timestamps: true });

const communityCommentSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true, trim: true, maxlength: 2000 },
  helpful: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  notHelpful: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  replies: { type: [communityReplySchema], default: [] },
  reports: { type: [reportSchema], default: [] },
}, { timestamps: true });

const communityPostSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true, trim: true, maxlength: 5000 },
  category: {
    type: String,
    enum: ['insight', 'skill', 'question', 'resource'],
    default: 'insight',
  },
  imageUrl: { type: String, default: '' },
  linkUrl: { type: String, default: '' },
  topics: {
    type: [{ type: String, trim: true }],
    validate: {
      validator: (items) => Array.isArray(items) && items.length > 0,
      message: 'At least one topic is required',
    },
  },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: { type: [communityCommentSchema], default: [] },
  commentsCount: { type: Number, default: 0 },
  reports: { type: [reportSchema], default: [] },
}, { timestamps: true });

communityPostSchema.index({ createdAt: -1 });

module.exports = mongoose.model('CommunityPost', communityPostSchema);
