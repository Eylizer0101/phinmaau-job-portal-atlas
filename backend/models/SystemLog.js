const mongoose = require('mongoose');

const systemLogSchema = new mongoose.Schema(
  {
    requestId: {
      type: String,
      default: '',
      trim: true,
      maxlength: 120,
      index: true,
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    actorName: {
      type: String,
      default: 'Unknown user',
      trim: true,
      maxlength: 180,
      index: true,
    },
    actorEmail: {
      type: String,
      default: '',
      trim: true,
      lowercase: true,
      maxlength: 180,
    },
    actorRole: {
      type: String,
      enum: ['admin', 'employer', 'jobseeker', 'system', 'unknown'],
      default: 'unknown',
      index: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      index: true,
    },
    actionLabel: {
      type: String,
      required: true,
      trim: true,
      maxlength: 180,
      index: true,
    },
    module: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
      index: true,
    },
    targetType: {
      type: String,
      default: 'System',
      trim: true,
      maxlength: 100,
    },
    targetId: {
      type: String,
      default: '',
      trim: true,
      maxlength: 180,
      index: true,
    },
    targetName: {
      type: String,
      default: '',
      trim: true,
      maxlength: 240,
      index: true,
    },
    status: {
      type: String,
      enum: ['success', 'failed', 'warning'],
      default: 'success',
      index: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: 1500,
    },
    method: {
      type: String,
      default: '',
      trim: true,
      uppercase: true,
      maxlength: 12,
    },
    path: {
      type: String,
      default: '',
      trim: true,
      maxlength: 500,
    },
    statusCode: {
      type: Number,
      default: 200,
      min: 100,
      max: 599,
    },
    durationMs: {
      type: Number,
      default: 0,
      min: 0,
    },
    ipAddress: {
      type: String,
      default: '',
      trim: true,
      maxlength: 120,
    },
    userAgent: {
      type: String,
      default: '',
      trim: true,
      maxlength: 500,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
    minimize: true,
  }
);

systemLogSchema.index({ createdAt: -1 });
systemLogSchema.index({ module: 1, createdAt: -1 });
systemLogSchema.index({ actorRole: 1, createdAt: -1 });
systemLogSchema.index({ status: 1, createdAt: -1 });
systemLogSchema.index({ action: 1, createdAt: -1 });
systemLogSchema.index({
  actorName: 'text',
  actorEmail: 'text',
  actionLabel: 'text',
  module: 'text',
  targetName: 'text',
  description: 'text',
});

module.exports = mongoose.model('SystemLog', systemLogSchema);
