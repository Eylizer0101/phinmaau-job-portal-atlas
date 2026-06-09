// backend/models/User.js
const mongoose = require('mongoose');
const crypto = require('crypto');

const normalizeCampusValue = (value) => {
  const text = String(value || '').trim();
  if (!text) return '';

  const compact = text
    .toLowerCase()
    .replace(/phinma/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!compact) return '';

  if (compact.includes('san jose') || compact.includes('sanjose')) return 'AU San Jose';
  if (compact.includes('south')) return 'AU South';
  if (compact.includes('main')) return 'AU Main';

  return text;
};

// ---------------------------
// Shared document schema
// ---------------------------
const alumniVerificationDocSchema = new mongoose.Schema(
  {
    url: { type: String, default: '' },
    status: {
      type: String,
      enum: ['not_submitted', 'submitted', 'pending', 'approved', 'rejected', 'hold'],
      default: 'not_submitted',
    },
    uploadedAt: { type: Date, default: null },
    filename: { type: String, default: '' },
    fileSize: { type: Number, default: 0 },
    mimeType: { type: String, default: '' },
  },
  { _id: false }
);

const verificationDocSchema = new mongoose.Schema(
  {
    url: { type: String, default: '' },
    status: {
      type: String,
      enum: ['not_submitted', 'submitted', 'pending', 'approved', 'rejected', 'hold'],
      default: 'not_submitted',
    },
    uploadedAt: { type: Date, default: null },
    filename: { type: String, default: '' },
    fileSize: { type: Number, default: 0 },
    mimeType: { type: String, default: '' },
  },
  { _id: false }
);

// ---------------------------
// Employer resubmit request schema
// ---------------------------
const employerResubmitRequestSchema = new mongoose.Schema(
  {
    tokenHash: { type: String, default: '' },
    docType: {
      type: String,
      enum: ['secRegistration', 'birRegistration', 'dtiRegistration', 'cityPermit', 'businessPermit', ''],
      default: '',
    },
    reasonMessage: { type: String, default: '' },
    requestedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
    usedAt: { type: Date, default: null },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { _id: false }
);

// ---------------------------
// Employer verification docs schema
// ---------------------------
const employerVerificationSchema = new mongoose.Schema(
  {
    secRegistration: { type: verificationDocSchema, default: () => ({}) },
    birRegistration: { type: verificationDocSchema, default: () => ({}) },
    dtiRegistration: { type: verificationDocSchema, default: () => ({}) },
    cityPermit: { type: verificationDocSchema, default: () => ({}) },

    businessPermit: { type: verificationDocSchema, default: () => ({}) },

    overallStatus: {
      type: String,
      enum: ['unverified', 'pending', 'verified', 'rejected', 'hold'],
      default: 'unverified',
    },
    remarks: { type: String, default: '' },

    rejectionReasons: { type: [String], default: [] },
    rejectionMessage: { type: String, default: '' },
    rejectedAt: { type: Date, default: null },

    resubmitRequest: { type: employerResubmitRequestSchema, default: () => ({}) },
  },
  { _id: false }
);

// ---------------------------
// Alumni/jobseeker resubmit request schema
// ---------------------------
const alumniResubmitRequestSchema = new mongoose.Schema(
  {
    tokenHash: { type: String, default: '' },
    docType: {
      type: String,
      enum: ['cv', 'tor', 'diploma', 'sss', 'philhealth', 'pagibig', 'tin', 'validId', ''],
      default: '',
    },
    reasonMessage: { type: String, default: '' },
    requestedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
    usedAt: { type: Date, default: null },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { _id: false }
);

// ---------------------------
// Alumni/jobseeker verification docs schema
// ---------------------------
const alumniVerificationSchema = new mongoose.Schema(
  {
    cv: { type: alumniVerificationDocSchema, default: () => ({}) },
    tor: { type: alumniVerificationDocSchema, default: () => ({}) },
    diploma: { type: alumniVerificationDocSchema, default: () => ({}) },
    sss: { type: alumniVerificationDocSchema, default: () => ({}) },
    philhealth: { type: alumniVerificationDocSchema, default: () => ({}) },
    pagibig: { type: alumniVerificationDocSchema, default: () => ({}) },
    tin: { type: alumniVerificationDocSchema, default: () => ({}) },
    validId: { type: alumniVerificationDocSchema, default: () => ({}) },
    overallStatus: {
      type: String,
      enum: ['not_submitted', 'pending', 'verified', 'rejected', 'hold'],
      default: 'not_submitted',
    },
    adminRemarks: { type: String, default: '' },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: { type: Date, default: null },

    rejectionReasons: { type: [String], default: [] },
    rejectionMessage: { type: String, default: '' },
    rejectedAt: { type: Date, default: null },

    resubmitRequest: { type: alumniResubmitRequestSchema, default: () => ({}) },
  },
  { _id: false }
);

// ---------------------------
// Company review schema
// ---------------------------
const companyReviewSchema = new mongoose.Schema(
  {
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reviewerName: {
      type: String,
      default: '',
      trim: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

// ---------------------------
// Education entry schema
// ---------------------------
const educationEntrySchema = new mongoose.Schema(
  {
    level: { type: String, default: '', trim: true },
    educationalAttainment: { type: String, default: '', trim: true },
    school: { type: String, default: '', trim: true },
    campus: { type: String, default: '', trim: true, set: normalizeCampusValue },
    course: { type: String, default: '', trim: true },
    studyField: { type: String, default: '', trim: true },
    startMonth: { type: String, default: '', trim: true },
    startYear: { type: String, default: '', trim: true },
    endMonth: { type: String, default: '', trim: true },
    endYear: { type: String, default: '', trim: true },
    yearGraduated: { type: String, default: '', trim: true },
    description: { type: String, default: '', trim: true },
  },
  { _id: false }
);

// ---------------------------
// Work experience schema
// ---------------------------
const workExperienceSchema = new mongoose.Schema(
  {
    companyName: { type: String, required: true, trim: true, default: '' },
    positionTitle: { type: String, required: true, trim: true, default: '' },
    startDate: { type: Date, required: true },
    endDate: { type: Date, default: null },
    isPresent: { type: Boolean, default: false },
    description: { type: String, default: '', trim: true },
  },
  { _id: true, timestamps: true }
);

// ---------------------------
// Reusable profile more entry schema
// ---------------------------
const profileMoreEntrySchema = new mongoose.Schema(
  {
    title: { type: String, default: '', trim: true },
    organization: { type: String, default: '', trim: true },
    role: { type: String, default: '', trim: true },
    issuer: { type: String, default: '', trim: true },
    date: { type: String, default: '', trim: true },
    startDate: { type: String, default: '', trim: true },
    endDate: { type: String, default: '', trim: true },
    description: { type: String, default: '', trim: true },
    url: { type: String, default: '', trim: true },
    name: { type: String, default: '', trim: true },
    position: { type: String, default: '', trim: true },
    company: { type: String, default: '', trim: true },
    email: { type: String, default: '', trim: true },
    phone: { type: String, default: '', trim: true },
  },
  { _id: true, timestamps: true }
);

// ---------------------------
// Employer gallery image schema
// ---------------------------
const employerGalleryImageSchema = new mongoose.Schema(
  {
    url: { type: String, default: '', trim: true },
    caption: { type: String, default: '', trim: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

// ---------------------------
// User schema
// ---------------------------
const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      required: function () {
        return this.role !== 'admin';
      },
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: { type: String, required: true },

    role: {
      type: String,
      enum: ['jobseeker', 'employer', 'admin'],
      required: true,
      default: 'jobseeker',
    },

    firstName: { type: String, trim: true, default: '' },
    middleName: { type: String, trim: true, default: '' },
    lastName: { type: String, trim: true, default: '' },
    extensionName: { type: String, trim: true, default: '' },

    profileImage: { type: String, default: '' },

    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date, default: null },

    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended', 'pending', 'deleted'],
      default: 'active',
    },

    isVerified: { type: Boolean, default: false },

    // ✅ NEW: force password change flag
    mustChangePassword: { type: Boolean, default: false },

    emailVerification: {
      tokenHash: { type: String, default: '' },
      expiresAt: { type: Date, default: null },
      verifiedAt: { type: Date, default: null },
    },

    passwordReset: {
      tokenHash: { type: String, default: '' },
      expiresAt: { type: Date, default: null },
      requestedAt: { type: Date, default: null },
      usedAt: { type: Date, default: null },
    },

    settingsVerification: {
      emailVerified: { type: Boolean, default: false },
      phoneVerified: { type: Boolean, default: false },

      pendingEmail: { type: String, default: '', lowercase: true, trim: true },
      emailOtpHash: { type: String, default: '' },
      emailOtpExpiresAt: { type: Date, default: null },
      emailOtpRequestedAt: { type: Date, default: null },

      pendingPhoneNumber: { type: String, default: '', trim: true },
      phoneOtpHash: { type: String, default: '' },
      phoneOtpExpiresAt: { type: Date, default: null },
      phoneOtpRequestedAt: { type: Date, default: null },
    },

    deletedAt: { type: Date, default: null },

    // ---------------------------
    // Jobseeker profile
    // ---------------------------
    jobSeekerProfile: {
      course: { type: String, default: '', trim: true },
      campus: { type: String, default: '', trim: true, set: normalizeCampusValue },
      yearGraduated: { type: String, default: '', trim: true },
      preferredWorkMode: { type: String, default: '', trim: true },
      technicalSkills: { type: String, default: '', trim: true },
      softSkills: { type: String, default: '', trim: true },
      whatHaveYouDone: { type: String, default: '', trim: true },
      howSoonCanYouStart: { type: String, default: '', trim: true },

      phoneNumber: { type: String, default: '', trim: true },

      aboutMe: { type: String, default: '', trim: true },
      minimumSalary: { type: String, default: '', trim: true },
      maximumSalary: { type: String, default: '', trim: true },
      salaryCurrency: { type: String, default: 'PHP', trim: true },

      address: { type: String, default: '', trim: true },
      birthday: { type: String, default: '', trim: true },
      gender: { type: String, default: '', trim: true },
      nationality: { type: String, default: '', trim: true },
      civilStatus: { type: String, default: '', trim: true },
      height: { type: String, default: '', trim: true },
      weight: { type: String, default: '', trim: true },
      preferredLanguage: { type: String, default: '', trim: true },

      employmentType: { type: String, default: '', trim: true },
      educationalAttainment: { type: String, default: '', trim: true },
      willingToRelocate: { type: String, default: '', trim: true },
      studyField: { type: String, default: '', trim: true },

      educationEntries: { type: [educationEntrySchema], default: [] },
      workExperiences: { type: [workExperienceSchema], default: [] },

      certifications: { type: [profileMoreEntrySchema], default: [] },
      projects: { type: [profileMoreEntrySchema], default: [] },
      seminars: { type: [profileMoreEntrySchema], default: [] },
      awards: { type: [profileMoreEntrySchema], default: [] },
      affiliations: { type: [profileMoreEntrySchema], default: [] },
      cocurricular: { type: [profileMoreEntrySchema], default: [] },
      references: { type: [profileMoreEntrySchema], default: [] },

      verificationDocs: { type: alumniVerificationSchema, default: () => ({}) },
      verificationStatus: {
        type: String,
        enum: ['not_submitted', 'pending', 'verified', 'rejected', 'hold'],
        default: 'not_submitted',
      },
    },

    // ---------------------------
    // Employer profile
    // ---------------------------
    employerProfile: {
      companyName: { type: String, default: '', trim: true },
      companyWebsiteUrl: { type: String, default: '', trim: true },
      businessEmail: { type: String, default: '', trim: true, lowercase: true },
      mobileNumber: { type: String, default: '', trim: true },
      regionCity: { type: String, default: '', trim: true },
      industry: { type: String, default: '', trim: true },
      position: { type: String, default: '', trim: true },

      companyAddress: { type: String, default: '', trim: true },
      companyDescription: { type: String, default: '', trim: true },
      facebookUrl: { type: String, default: '', trim: true },
      instagramUrl: { type: String, default: '', trim: true },
      linkedinUrl: { type: String, default: '', trim: true },
      xUrl: { type: String, default: '', trim: true },
      coverPhoto: { type: String, default: '', trim: true },
      galleryImages: { type: [employerGalleryImageSchema], default: [] },

      companyLogo: { type: String, default: '' },
      profileVisible: { type: Boolean, default: true },
      verificationDocs: { type: employerVerificationSchema, default: () => ({}) },
      reviews: { type: [companyReviewSchema], default: [] },
    },

    savedJobs: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Job',
      },
    ],

    savedCompanies: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    notificationPreferences: {
      emailNotifications: { type: Boolean, default: true },
      jobAlerts: { type: Boolean, default: true },
      applicationUpdates: { type: Boolean, default: true },
      marketingEmails: { type: Boolean, default: false },
      newsletter: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

userSchema.virtual('fullName').get(function () {
  const parts = [this.firstName, this.middleName, this.lastName, this.extensionName]
    .map((p) => String(p || '').trim())
    .filter(Boolean);

  return parts.join(' ').trim();
});

userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

userSchema.statics.hashToken = (token) =>
  crypto.createHash('sha256').update(String(token)).digest('hex');

module.exports = mongoose.model('User', userSchema);