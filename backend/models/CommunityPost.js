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
  parentReplyId: { type: mongoose.Schema.Types.ObjectId, default: null },
  helpful: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  notHelpful: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  reports: { type: [reportSchema], default: [] },
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date, default: null },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

const communityCommentSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true, trim: true, maxlength: 2000 },
  helpful: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  notHelpful: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  replies: { type: [communityReplySchema], default: [] },
  reports: { type: [reportSchema], default: [] },
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date, default: null },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
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
  imageUrls: { type: [String], default: [] },
  videoUrl: { type: String, default: '' },
  videoDuration: { type: Number, default: 0, min: 0, max: 600 },
  documents: {
    type: [{
      name: { type: String, default: '' },
      url: { type: String, default: '' },
      mimeType: { type: String, default: '' },
      size: { type: Number, default: 0 },
    }],
    default: [],
  },
  isSensitive: { type: Boolean, default: false },
  moderationFlags: { type: [String], default: [] },
  contentFingerprint: { type: String, default: '', index: true },
  linkUrl: { type: String, default: '' },
  // New posts are still required to have a topic by communityController.
  // The schema allows an empty array so older posts without topics can still
  // receive comments, replies, reactions, reports, and likes.
  topics: {
    type: [{ type: String, trim: true }],
    default: [],
  },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: { type: [communityCommentSchema], default: [] },
  commentsCount: { type: Number, default: 0 },
  reports: { type: [reportSchema], default: [] },
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date, default: null },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

communityPostSchema.index({ createdAt: -1 });

module.exports = mongoose.model('CommunityPost', communityPostSchema);
