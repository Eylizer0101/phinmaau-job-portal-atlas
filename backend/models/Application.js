// models/Application.js
const mongoose = require('mongoose');

const interviewScheduleSchema = new mongoose.Schema(
  {
    scheduledAt: {
      type: Date,
      default: null,
    },
    durationMinutes: {
      type: Number,
      default: 60,
      min: 1,
    },
    meetingType: {
      type: String,
      enum: ['On-site', 'Phone', 'Video', 'Video Call', 'Other', ''],
      default: '',
    },
    location: {
      type: String,
      default: '',
      trim: true,
    },
    meetingLink: {
      type: String,
      default: '',
      trim: true,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    setBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    setAt: {
      type: Date,
      default: null,
    },
    interviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    interviewerName: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: ['scheduled', 'rescheduled', 'completed', 'cancelled', ''],
      default: '',
    },
  },
  { _id: false }
);

const appliedResumeSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      default: '',
      trim: true
    },
    filename: {
      type: String,
      default: '',
      trim: true
    },
    storedFilename: {
      type: String,
      default: '',
      trim: true
    },
    mimeType: {
      type: String,
      default: '',
      trim: true
    },
    fileSize: {
      type: Number,
      default: 0
    },
    uploadedAt: {
      type: Date,
      default: null
    }
  },
  { _id: false }
);

const applicationSchema = new mongoose.Schema({
    job: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Job',
        required: true
    },
    jobseeker: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    employer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'for interview', 'hired', 'declined', 'withdrawn', 'cancelled', 'vacancy full'],
        default: 'pending'
    },
    lastActiveStatus: {
        type: String,
        enum: ['pending', 'for interview', 'hired'],
        default: 'pending'
    },
    coverLetter: {
        type: String,
        default: ''
    },
    appliedResume: {
        type: appliedResumeSchema,
        default: () => ({})
    },
    appliedAt: {
        type: Date,
        default: Date.now
    },
    reviewedAt: Date,
    notes: String,

    // ✅ NEW: track if employer already viewed the application details
    isViewedByEmployer: {
        type: Boolean,
        default: false
    },
    viewedAt: {
        type: Date,
        default: null
    },

    // ✅ NEW: decline feedback fields
    declineReason: {
        type: String,
        default: '',
        trim: true
    },
    declineComment: {
        type: String,
        default: '',
        trim: true
    },

    // ✅ NEW: save where the application was declined from
    declinedFrom: {
        type: String,
        enum: ['applicants', 'forInterview', ''],
        default: '',
        trim: true
    },

    // ✅ NEW: declined archive fields
    isDeclinedArchived: {
        type: Boolean,
        default: false
    },
    declinedArchivedAt: {
        type: Date,
        default: null
    },

    // ✅ NEW: interview schedule data for dashboard + future scheduling use
    interviewSchedule: {
        type: interviewScheduleSchema,
        default: () => ({})
    }
}, {
    timestamps: true
});

// Index for better query performance
applicationSchema.index({ job: 1, jobseeker: 1 }, { unique: true });
applicationSchema.index({ employer: 1, status: 1 });
applicationSchema.index({ jobseeker: 1, status: 1 });
applicationSchema.index({ employer: 1, 'interviewSchedule.scheduledAt': 1 });
applicationSchema.index({ employer: 1, status: 1, isDeclinedArchived: 1 });

module.exports = mongoose.model('Application', applicationSchema);