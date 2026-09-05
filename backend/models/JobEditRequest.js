const mongoose = require('mongoose');

const jobEditRequestSchema = new mongoose.Schema({
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true,
    index: true,
  },
  employer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  requestedSections: [{
    type: String,
    trim: true,
  }],
  reason: {
    type: String,
    trim: true,
    required: [true, 'Reason for the edit request is required.'],
    maxlength: 1000,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'expired'],
    default: 'pending',
    index: true,
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  reviewedAt: {
    type: Date,
    default: null,
  },
  unlockUntil: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

jobEditRequestSchema.index({ job: 1, status: 1, createdAt: -1 });
jobEditRequestSchema.index({ employer: 1, createdAt: -1 });

module.exports = mongoose.model('JobEditRequest', jobEditRequestSchema);
