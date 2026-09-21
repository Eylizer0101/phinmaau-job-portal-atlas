// backend/models/User.js
const mongoose = require('mongoose');
const crypto = require('crypto');

const normalizeCourseValue = (value) => {
  const clean = String(value || '').trim();

  if (
    clean === 'BS Information Technology (Business Informatics)' ||
    clean === 'BS Information Technology (System Development)'
  ) {
    return 'BS Information Technology';
  }

  return clean;
};

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

const getRichTextPlainLength = (value) =>
  String(value || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(div|p|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .length;

const richTextLengthValidator = (maximum, message) => ({
  validator: (value) => getRichTextPlainLength(value) <= maximum,
  message,
});

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
    publicId: { type: String, default: '' },
    resourceType: { type: String, default: '' },
    format: { type: String, default: '' },
    checked: { type: Boolean, default: false },
    checkedAt: { type: Date, default: null },
    checkedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
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
    publicId: { type: String, default: '' },
    resourceType: { type: String, default: '' },
    format: { type: String, default: '' },
    checked: { type: Boolean, default: false },
    checkedAt: { type: Date, default: null },
    checkedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { _id: false }
);

// ---------------------------
// Employer resubmit request schema
// ---------------------------
const resubmitDocumentReasonSchema = new mongoose.Schema(
  {
    docType: { type: String, required: true },
    reason: { type: String, required: true, trim: true, maxlength: 300 },
  },
  { _id: false }
);

const employerResubmitRequestSchema = new mongoose.Schema(
  {
    tokenHash: { type: String, default: '' },
    docType: {
      type: String,
      enum: ['secRegistration', 'birRegistration', 'dtiRegistration', 'cityPermit', 'businessPermit', ''],
      default: '',
    },
    docTypes: {
      type: [String],
      enum: ['secRegistration', 'birRegistration', 'dtiRegistration', 'cityPermit', 'businessPermit'],
      default: [],
    },
    reasonMessage: { type: String, default: '', maxlength: 500 },
    documentReasons: { type: [resubmitDocumentReasonSchema], default: [] },
    additionalMessage: { type: String, default: '', maxlength: 500 },
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
    rejectionMessage: { type: String, default: '', maxlength: 500 },
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
    docTypes: {
      type: [String],
      enum: ['cv', 'tor', 'diploma', 'sss', 'philhealth', 'pagibig', 'tin', 'validId'],
      default: [],
    },
    reasonMessage: { type: String, default: '', maxlength: 500 },
    documentReasons: { type: [resubmitDocumentReasonSchema], default: [] },
    additionalMessage: { type: String, default: '', maxlength: 500 },
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
    rejectionMessage: { type: String, default: '', maxlength: 500 },
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
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      default: null,
    },
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      default: null,
    },
    roleAppliedFor: {
      type: String,
      default: 'Role not specified',
      trim: true,
      maxlength: 100,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    processRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    daysToFirstResponse: {
      type: Number,
      default: 0,
      min: 0,
      max: 99,
    },
    totalProcessDays: {
      type: Number,
      default: 0,
      min: 0,
      max: 99,
    },
    outcome: {
      type: String,
      enum: ['received_offer', 'rejected', 'ghosted', 'withdrew', 'still_in_process'],
      default: 'still_in_process',
    },
    wouldApplyAgain: {
      type: Boolean,
      default: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
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
    educationalAttainment: { type: String, default: '', trim: true, maxlength: 100 },
    school: { type: String, default: '', trim: true, maxlength: 100 },
    campus: { type: String, default: '', trim: true, set: normalizeCampusValue },
    course: { type: String, default: '', trim: true, set: normalizeCourseValue },
    studyField: { type: String, default: '', trim: true, maxlength: 50 },
    startMonth: { type: String, default: '', trim: true },
    startYear: { type: String, default: '', trim: true },
    endMonth: { type: String, default: '', trim: true },
    endYear: { type: String, default: '', trim: true },
    yearGraduated: { type: String, default: '', trim: true },
    description: {
      type: String,
      default: '',
      trim: true,
      validate: richTextLengthValidator(500, 'Description must not exceed 500 characters.'),
    },
  },
  { _id: false }
);

// ---------------------------
// Work experience schema
// ---------------------------
const getWorkExperienceToday = () => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const part = (type) => parts.find((item) => item.type === type).value;
  return `${part('year')}-${part('month')}-${part('day')}`;
};

const isValidWorkExperienceDate = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '0001-01-01') return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

const isPastOrCurrentWorkDate = (value) => {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return false;
  const day = value.toISOString().slice(0, 10);
  return isValidWorkExperienceDate(day) && day <= getWorkExperienceToday();
};

const workExperienceSchema = new mongoose.Schema(
  {
    companyName: { type: String, required: true, trim: true, maxlength: 120, default: '' },
    positionTitle: { type: String, required: true, trim: true, maxlength: 100, default: '' },
    startDate: {
      type: Date,
      required: true,
      validate: { validator: isPastOrCurrentWorkDate, message: 'Start date must be a valid date on or before today.' },
    },
    endDate: {
      type: Date,
      default: null,
      required: function () { return !this.isPresent; },
      validate: {
        validator: function (value) {
          return this.isPresent || (isPastOrCurrentWorkDate(value) && (!this.startDate || value >= this.startDate));
        },
        message: 'End date must be on or after start date and on or before today.',
      },
    },
    isPresent: { type: Boolean, default: false },
    description: {
      type: String,
      default: '',
      trim: true,
      validate: richTextLengthValidator(500, 'Description must not exceed 500 characters.'),
    },
  },
  { _id: true, timestamps: true }
);

// ---------------------------
// Reusable profile more entry schema
// ---------------------------
const profileMoreEntrySchema = new mongoose.Schema(
  {
    title: { type: String, default: '', trim: true, maxlength: 100 },
    organization: { type: String, default: '', trim: true, maxlength: 100 },
    role: { type: String, default: '', trim: true, maxlength: 100 },
    issuer: { type: String, default: '', trim: true, maxlength: 100 },
    date: { type: String, default: '', trim: true },
    startDate: { type: String, default: '', trim: true },
    endDate: { type: String, default: '', trim: true },
    description: {
      type: String,
      default: '',
      trim: true,
      validate: richTextLengthValidator(500, 'Description must not exceed 500 characters.'),
    },
    url: { type: String, default: '', trim: true },
    name: { type: String, default: '', trim: true, maxlength: 100 },
    position: { type: String, default: '', trim: true, maxlength: 100 },
    company: { type: String, default: '', trim: true, maxlength: 120 },
    email: { type: String, default: '', trim: true, validate: { validator: (value) => !value || (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && /[a-zA-Z]/.test(value.split('@')[0])), message: 'Please enter a valid reference email address with a letter before @ and a complete domain.' } },
    phone: { type: String, default: '', trim: true, maxlength: 11, match: [/^09\d{9}$/, 'Contact number must be an 11-digit number starting with 09.'] },
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
      maxlength: 100,
    },

    // Canonical registration contact number. The unique sparse index protects
    // new Jobseeker and Employer registrations from concurrent duplicate
    // submissions while the role-specific profile fields remain unchanged.
    registrationContactNumber: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      match: [/^09\d{9}$/, 'Contact Number must be an 11-digit Philippine mobile number starting with 09.'],
    },

    password: { type: String, required: true },

    role: {
      type: String,
      enum: ['jobseeker', 'employer', 'admin'],
      required: true,
      default: 'jobseeker',
    },

    firstName: { type: String, trim: true, maxlength: 25, default: '' },
    middleName: { type: String, trim: true, maxlength: 25, default: '' },
    lastName: { type: String, trim: true, maxlength: 25, default: '' },
    extensionName: { type: String, trim: true, default: '' },

    profileImage: { type: String, default: '' },

    // Profile information shown on the administrator profile page.
    adminProfile: {
      organizationName: { type: String, trim: true, maxlength: 150, default: 'PHINMA Araullo University' },
      organizationLogo: { type: String, trim: true, default: '' },
      organizationLogoPublicId: { type: String, trim: true, default: '', select: false },
      positionRole: { type: String, trim: true, maxlength: 100, default: 'System Administrator' },
      contactNumber: { type: String, trim: true, maxlength: 11, match: [/^\d{11}$/, 'Phone Number must contain exactly 11 digits.'], default: '' },
      departmentOffice: { type: String, trim: true, maxlength: 100, default: '' },
    },

    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date, default: null },
    // Intentionally changed profile/resume content; unlike generic updatedAt.
    lastProfileUpdateAt: { type: Date, default: null },

    // Server-side failed-login tracking. This cannot be bypassed by clearing browser storage.
    loginSecurity: {
      failedAttempts: { type: Number, default: 0, min: 0, select: false },
      lockedUntil: { type: Date, default: null, select: false },
    },

    // Automatically set when an employer has not logged in for the configured period.
    inactiveBySystem: { type: Boolean, default: false, index: true },
    inactiveAt: { type: Date, default: null },
    inactiveReason: { type: String, default: '', trim: true },
    inactiveThresholdMonths: { type: Number, default: null, min: 6, max: 12 },

    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended', 'pending', 'deleted'],
      default: 'active',
    },

    isVerified: { type: Boolean, default: false },

    // Google Calendar connection used when this employer creates interview meetings.
    // select:false prevents the refresh token from being returned in normal user queries.
    googleCalendarAuth: {
      refreshToken: { type: String, default: '', select: false },
      googleEmail: { type: String, default: '', lowercase: true, trim: true },
      connectedAt: { type: Date, default: null },
    },

    // ✅ NEW: force password change flag
    mustChangePassword: { type: Boolean, default: false },

    // Saved once the user agrees to the Community Guidelines.
    communityGuidelinesAcceptedAt: { type: Date, default: null },

    emailVerification: {
      tokenHash: { type: String, default: '', select: false },
      expiresAt: { type: Date, default: null, select: false },
      verifiedAt: { type: Date, default: null },
    },

    passwordReset: {
      // tokenHash is kept for backward compatibility with older stored records.
      tokenHash: { type: String, default: '' },
      otpHash: { type: String, default: '' },
      expiresAt: { type: Date, default: null },
      requestedAt: { type: Date, default: null },
      usedAt: { type: Date, default: null },
    },

    settingsVerification: {
      emailVerified: { type: Boolean, default: false },
      phoneVerified: { type: Boolean, default: false },

      pendingEmail: { type: String, default: '', lowercase: true, trim: true, maxlength: 100 },
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
      course: { type: String, default: '', trim: true, set: normalizeCourseValue },
      campus: { type: String, default: '', trim: true, set: normalizeCampusValue },
      yearGraduated: { type: String, default: '', trim: true },
      preferredWorkMode: { type: String, default: '', trim: true },
      technicalSkills: { type: String, default: '', trim: true },
      softSkills: { type: String, default: '', trim: true },
      whatHaveYouDone: { type: String, default: '', trim: true },
      howSoonCanYouStart: { type: String, default: '', trim: true },

      phoneNumber: { type: String, default: '', trim: true, maxlength: 11 },

      aboutMe: {
        type: String,
        default: '',
        trim: true,
        validate: richTextLengthValidator(500, 'Objective must not exceed 500 characters.'),
      },
      minimumSalary: { type: String, default: '', trim: true, maxlength: 6, match: [/^\d{0,6}$/, 'Minimum Salary must contain numbers only and must not exceed 6 digits.'] },
      maximumSalary: { type: String, default: '', trim: true, maxlength: 6, match: [/^\d{0,6}$/, 'Maximum Salary must contain numbers only and must not exceed 6 digits.'] },
      salaryCurrency: { type: String, default: 'PHP', trim: true },
      salaryPrivacy: {
        type: String,
        enum: ['public', 'limited', 'only_me'],
        default: 'only_me',
        trim: true,
      },

      address: { type: String, default: '', trim: true, maxlength: [250, 'Address must not exceed 250 characters.'] },
      birthday: { type: String, default: '', trim: true },
      gender: { type: String, default: '', trim: true },
      nationality: { type: String, default: '', trim: true, maxlength: 50 },
      civilStatus: { type: String, default: '', trim: true },
      height: { type: String, default: '', trim: true, maxlength: 3, match: [/^\d{0,3}$/, 'Height must contain numbers only and must not exceed 3 digits.'] },
      weight: { type: String, default: '', trim: true, maxlength: 3, match: [/^\d{0,3}$/, 'Weight must contain numbers only and must not exceed 3 digits.'] },
      preferredLanguage: { type: String, default: '', trim: true, maxlength: 50 },

      employmentType: { type: String, default: '', trim: true },
      educationalAttainment: { type: String, default: '', trim: true },
      willingToRelocate: { type: String, default: '', trim: true },
      studyField: { type: String, default: '', trim: true },
      experience: { type: String, default: '', trim: true },

      educationEntries: { type: [educationEntrySchema], default: [] },
      workExperiences: { type: [workExperienceSchema], default: [] },

      addedResumeSections: {
        type: [{
          type: String,
          enum: [
            'seminars',
            'awards',
            'certifications',
            'projects',
            'affiliations',
            'cocurricular',
            'references',
          ],
        }],
        default: [],
      },

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
      companyName: {
        type: String,
        default: '',
        trim: true,
        maxlength: [150, 'Company name must not exceed 150 characters.'],
      },
      companyWebsiteUrl: { type: String, default: '', trim: true, maxlength: 255 },
      businessEmail: { type: String, default: '', trim: true, lowercase: true, maxlength: 100 },
      mobileNumber: { type: String, default: '', trim: true, maxlength: 11 },
      regionCity: { type: String, default: '', trim: true },
      industry: {
        type: String,
        default: '',
        trim: true,
        maxlength: [100, 'Industry must not exceed 100 characters.'],
      },
      position: { type: String, default: '', trim: true, maxlength: 100 },

      companyAddress: {
        type: String,
        default: '',
        trim: true,
        maxlength: [100, 'Office address must not exceed 100 characters.'],
      },
      companyDescription: {
        type: String,
        default: '',
        trim: true,
        validate: {
          validator: function (value) {
            const cleanValue = String(value || '').trim();
            return cleanValue.length === 0 || cleanValue.length >= 100;
          },
          message: 'Company description must contain at least 100 characters.',
        },
        maxlength: [1000, 'Company description must not exceed 1000 characters.'],
      },
      facebookUrl: { type: String, default: '', trim: true, maxlength: 255 },
      instagramUrl: { type: String, default: '', trim: true, maxlength: 255 },
      youtubeUrl: { type: String, default: '', trim: true, maxlength: 255 },
      linkedinUrl: { type: String, default: '', trim: true, maxlength: 255 },
      xUrl: { type: String, default: '', trim: true, maxlength: 255 },
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
