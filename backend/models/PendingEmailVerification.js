const mongoose = require('mongoose');

const pendingEmailVerificationSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    role: { type: String, required: true, enum: ['jobseeker', 'employer'], index: true },
    otpHash: { type: String, required: true, select: false },
    otpExpiresAt: { type: Date, required: true, select: false },
    otpRequestedAt: { type: Date, required: true, default: Date.now },
    verifiedAt: { type: Date, default: null },
    verificationTokenHash: { type: String, default: '', select: false },
    verificationTokenExpiresAt: { type: Date, default: null, select: false },
    consumedAt: { type: Date, default: null, select: false },
    deleteAfterAt: { type: Date, required: true, index: { expires: 0 } },
  },
  { timestamps: true }
);

pendingEmailVerificationSchema.index({ email: 1, role: 1 }, { unique: true });

module.exports = mongoose.model('PendingEmailVerification', pendingEmailVerificationSchema);
