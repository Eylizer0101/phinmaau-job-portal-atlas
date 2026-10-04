// backend/controllers/adminController.js
const User = require('../models/User');
const Job = require('../models/Job');
const Application = require('../models/Application');
const SystemLog = require('../models/SystemLog');
const CommunityPost = require('../models/CommunityPost');
const Notification = require('../models/Notification');
const JobEditRequest = require('../models/JobEditRequest');
const Message = require('../models/Message');
const ConversationPreference = require('../models/ConversationPreference');
const PendingEmailVerification = require('../models/PendingEmailVerification');
const bcrypt = require('bcryptjs');
const ExcelJS = require('exceljs');
const crypto = require('crypto');
const { v2: cloudinary } = require('cloudinary');
const { sendCredentialsEmail, sendResubmitDocumentEmail, sendVerificationResubmissionReminderEmail, sendVerificationRejectedEmail, sendVerificationRestoredEmail } = require('../config/mailer');

const puppeteer = require('puppeteer');

let adminReportBrowserPromise = null;

const getAdminReportBrowser = async () => {
  if (!adminReportBrowserPromise) {
    adminReportBrowserPromise = puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    }).then((browser) => {
      browser.once('disconnected', () => {
        adminReportBrowserPromise = null;
      });
      return browser;
    }).catch((error) => {
      adminReportBrowserPromise = null;
      throw error;
    });
  }

  return adminReportBrowserPromise;
};

const DEFAULT_ADMIN_LOGO = '/images/phinma-logo.png';

const isValidAdminPassword = async (req, rawPassword) => {
  const password = String(rawPassword || req.headers['x-admin-password'] || '');
  if (!password) return false;

  const adminId = req.user?._id || req.userId;
  const admin = await User.findById(adminId).select('password role email +adminProfile.subAdminPasswordHash');
  if (!admin || admin.role !== 'admin') return false;

  const subAdminPasswordHash = String(admin.adminProfile?.subAdminPasswordHash || '');
  if (subAdminPasswordHash && await bcrypt.compare(password, subAdminPasswordHash)) return true;

  const defaultAdminEmail = String(process.env.DEFAULT_ADMIN_EMAIL || '').trim().toLowerCase();
  const defaultAdminPassword = String(process.env.DEFAULT_ADMIN_PASSWORD || '');
  const isDefaultAdmin = Boolean(
    defaultAdminEmail &&
    defaultAdminPassword &&
    String(admin.email || '').trim().toLowerCase() === defaultAdminEmail &&
    password === defaultAdminPassword
  );

  if (isDefaultAdmin) return true;

  if (!defaultAdminPassword && admin.password && await bcrypt.compare(password, admin.password)) return true;

  return false;
};

const serializeAdminProfile = (admin) => ({
  id: admin._id,
  email: admin.adminProfile?.subAdminEmail || admin.email,
  firstName: admin.firstName || '',
  middleName: admin.middleName || '',
  lastName: admin.lastName || '',
  extensionName: admin.extensionName || '',
  organizationName: admin.adminProfile?.organizationName || 'PHINMA Araullo University',
  organizationLogo: admin.adminProfile?.organizationLogo || DEFAULT_ADMIN_LOGO,
  positionRole: admin.adminProfile?.positionRole || 'System Administrator',
  contactNumber: admin.adminProfile?.contactNumber || '',
  departmentOffice: admin.adminProfile?.departmentOffice || '',
});

const getAdminWithPrivateProfileFields = (id) =>
  User.findOne({ _id: id, role: 'admin' }).select('+adminProfile.organizationLogoPublicId');

exports.getAdminProfile = async (req, res) => {
  try {
    const admin = await getAdminWithPrivateProfileFields(req.userId);
    if (!admin) return res.status(404).json({ success: false, message: 'Admin account not found.' });
    return res.json({ success: true, profile: serializeAdminProfile(admin) });
  } catch (error) {
    console.error('Get admin profile error:', error);
    return res.status(500).json({ success: false, message: 'Unable to load the admin profile.' });
  }
};

exports.updateAdminProfile = async (req, res) => {
  try {
    const admin = await getAdminWithPrivateProfileFields(req.userId);
    if (!admin) return res.status(404).json({ success: false, message: 'Admin account not found.' });

    const clean = (value) => String(value ?? '').trim();
    const profileValues = {
      organizationName: clean(req.body.organizationName),
      firstName: clean(req.body.firstName),
      middleName: clean(req.body.middleName),
      lastName: clean(req.body.lastName),
      extensionName: clean(req.body.extensionName),
      positionRole: clean(req.body.positionRole),
      contactNumber: clean(req.body.contactNumber),
      departmentOffice: clean(req.body.departmentOffice),
    };

    const fieldLimits = [
      ['School / Organization Name', profileValues.organizationName, 150],
      ['First Name', profileValues.firstName, 25],
      ['Middle Name', profileValues.middleName, 25],
      ['Last Name', profileValues.lastName, 25],
      ['Role', profileValues.positionRole, 100],
      ['Department Office', profileValues.departmentOffice, 100],
    ];
    const exceededField = fieldLimits.find(([, value, max]) => value.length > max);
    if (exceededField) {
      return res.status(400).json({
        success: false,
        message: `${exceededField[0]} must not exceed ${exceededField[2]} characters.`,
      });
    }

    if (profileValues.contactNumber && !/^\d{11}$/.test(profileValues.contactNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Phone Number must contain exactly 11 digits.',
      });
    }

    if (!admin.adminProfile) admin.adminProfile = {};
    admin.firstName = profileValues.firstName;
    admin.middleName = profileValues.middleName;
    admin.lastName = profileValues.lastName;
    admin.extensionName = profileValues.extensionName.slice(0, 20);
    admin.adminProfile.organizationName = profileValues.organizationName;
    admin.adminProfile.positionRole = profileValues.positionRole;
    admin.adminProfile.contactNumber = profileValues.contactNumber;
    admin.adminProfile.departmentOffice = profileValues.departmentOffice;

    if (req.file) {
      const previousPublicId = admin.adminProfile.organizationLogoPublicId;
      admin.adminProfile.organizationLogo = req.file.secure_url || req.file.path || req.file.url || '';
      admin.adminProfile.organizationLogoPublicId = req.file.public_id || req.file.filename || '';
      if (previousPublicId && previousPublicId !== admin.adminProfile.organizationLogoPublicId) {
        cloudinary.uploader.destroy(previousPublicId).catch((deleteError) => {
          console.error('Old admin logo cleanup error:', deleteError);
        });
      }
    }

    await admin.save();
    return res.json({ success: true, message: 'Admin profile updated successfully.', profile: serializeAdminProfile(admin) });
  } catch (error) {
    console.error('Update admin profile error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Unable to update the admin profile.' });
  }
};

exports.removeAdminProfileLogo = async (req, res) => {
  try {
    const admin = await getAdminWithPrivateProfileFields(req.userId);
    if (!admin) return res.status(404).json({ success: false, message: 'Admin account not found.' });
    if (!admin.adminProfile) admin.adminProfile = {};
    const publicId = admin.adminProfile?.organizationLogoPublicId;
    if (publicId) await cloudinary.uploader.destroy(publicId);
    admin.adminProfile.organizationLogo = '';
    admin.adminProfile.organizationLogoPublicId = '';
    await admin.save();
    return res.json({ success: true, message: 'Organization logo removed.', profile: serializeAdminProfile(admin) });
  } catch (error) {
    console.error('Remove admin logo error:', error);
    return res.status(500).json({ success: false, message: 'Unable to remove the organization logo.' });
  }
};

exports.updateAdminPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmNewPassword } = req.body || {};
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      return res.status(400).json({ success: false, message: 'Complete all password fields.' });
    }
    if (
      String(currentPassword).length > 25 ||
      String(newPassword).length > 25 ||
      String(confirmNewPassword).length > 25
    ) {
      return res.status(400).json({ success: false, message: 'Password must not exceed 25 characters.' });
    }
    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({ success: false, message: 'New passwords do not match.' });
    }
    const passwordValid = /^[A-Z](?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{7,}$/.test(newPassword);
    if (!passwordValid) {
      return res.status(400).json({ success: false, message: 'The new password must start with an uppercase letter and meet all password requirements.' });
    }

    const admin = await User.findOne({ _id: req.userId, role: 'admin' }).select('+password +adminProfile.subAdminPasswordHash');
    if (!admin) return res.status(404).json({ success: false, message: 'Admin account not found.' });

    const currentSubAdminHash = String(admin.adminProfile?.subAdminPasswordHash || '');
    const matchesSubAdmin = Boolean(
      currentSubAdminHash && await bcrypt.compare(String(currentPassword), currentSubAdminHash)
    );
    const defaultAdminEmail = String(process.env.DEFAULT_ADMIN_EMAIL || '').trim().toLowerCase();
    const defaultAdminPassword = String(process.env.DEFAULT_ADMIN_PASSWORD || '');
    const matchesMainAdmin = Boolean(
      defaultAdminEmail &&
      defaultAdminPassword &&
      String(admin.email || '').trim().toLowerCase() === defaultAdminEmail &&
      String(currentPassword) === defaultAdminPassword
    );
    const fallbackMatchesStoredPassword = Boolean(
      !defaultAdminPassword && admin.password && await bcrypt.compare(String(currentPassword), admin.password)
    );

    if (!matchesSubAdmin && !matchesMainAdmin && !fallbackMatchesStoredPassword) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
    }
    if (defaultAdminPassword && String(newPassword) === defaultAdminPassword) {
      return res.status(400).json({ success: false, message: 'Sub Admin password must be different from the Main Admin password.' });
    }
    if (currentSubAdminHash && await bcrypt.compare(newPassword, currentSubAdminHash)) {
      return res.status(400).json({ success: false, message: 'New password must be different from the current Sub Admin password.' });
    }

    if (!admin.adminProfile) admin.adminProfile = {};
    admin.adminProfile.subAdminPasswordHash = await bcrypt.hash(newPassword, 12);
    await admin.save();
    return res.json({ success: true, message: 'Sub Admin password updated successfully.' });
  } catch (error) {
    console.error('Update admin password error:', error);
    return res.status(500).json({ success: false, message: 'Unable to update the password.' });
  }
};

// ==========================
// ✅ HELPERS: username + password generator
// ==========================
const normalizeBase = (v) =>
  String(v || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .trim();

const randomDigits = (len = 4) => {
  let out = '';
  for (let i = 0; i < len; i++) out += Math.floor(Math.random() * 10);
  return out;
};

const escapeRegex = (value = '') =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const generateTempPassword = () => {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const nums = '23456789';
  const symbols = '!@#$%';
  const pick = (s) => s[Math.floor(Math.random() * s.length)];
  let pwd = '';
  pwd += pick(letters);
  pwd += pick(letters);
  pwd += pick(nums);
  pwd += pick(nums);
  pwd += pick(symbols);
  pwd += pick(letters);
  pwd += pick(nums);
  pwd += pick(letters);
  pwd = pwd.split('').sort(() => Math.random() - 0.5).join('');
  return pwd;
};

const generateUniqueUsername = async ({ role, firstName, lastName, companyName }) => {
  let base = '';

  if (role === 'jobseeker') {
    base = normalizeBase(`${firstName}${lastName}`) || 'jobseeker';
  } else if (role === 'employer') {
    base = normalizeBase(companyName) || 'employer';
  } else {
    base = 'user';
  }

  if (base.length < 4) base = `${base}${randomDigits(2)}`;

  let username = base;
  let tries = 0;

  while (tries < 50) {
    const exists = await User.findOne({ username }).select('_id');
    if (!exists) return username;

    username = `${base}${randomDigits(4)}`;
    tries++;
  }

  return `${base}${Date.now()}`.slice(0, 20);
};

const JOBSEEKER_DOC_TYPES = ['cv', 'tor', 'diploma', 'sss', 'philhealth', 'pagibig', 'tin', 'validId'];
const JOBSEEKER_REQUIRED_DOC_TYPES = ['cv', 'tor', 'diploma', 'validId'];

const JOBSEEKER_DOC_LABELS = {
  cv: 'CV / Resume',
  tor: 'Transcript of Records',
  diploma: 'Diploma',
  sss: 'SSS ID/Number',
  philhealth: 'PhilHealth ID',
  pagibig: 'Pag-IBIG ID',
  tin: 'TIN ID',
  validId: 'Valid ID',
};
const JOBSEEKER_NOTIFICATION_LABELS = {
  cv: 'Resume',
  tor: 'TOR',
  diploma: 'Diploma',
  sss: 'SSS',
  philhealth: 'PhilHealth',
  pagibig: 'Pag-IBIG',
  tin: 'TIN',
  validId: 'Valid ID',
};

const isApprovedJobseekerAccount = (user = {}) =>
  user.isVerified === true ||
  String(user.jobSeekerProfile?.verificationStatus || '').toLowerCase() === 'verified' ||
  String(user.jobSeekerProfile?.verificationDocs?.overallStatus || '').toLowerCase() === 'verified';

const getJobseekerCredentialReviewStatus = (docs = {}) => {
  const getStatus = (type) =>
    String(docs?.[type]?.status || 'not_submitted').toLowerCase();

  const statuses = JOBSEEKER_DOC_TYPES.map(getStatus);
  const requiredStatuses = JOBSEEKER_REQUIRED_DOC_TYPES.map(getStatus);
  if (statuses.some((status) => ['pending', 'submitted'].includes(status))) return 'pending';
  if (statuses.some((status) => ['hold', 'rejected'].includes(status))) return 'hold';
  if (requiredStatuses.every((status) => status === 'approved')) return 'verified';
  if (requiredStatuses.some((status) => status === 'approved')) return 'pending';
  return 'not_submitted';
};

const createJobseekerCredentialNotification = async ({ user, docType, action, feedback = '' }) => {
  try {
    if (!user?._id) return;
    const docs = user.jobSeekerProfile?.verificationDocs || {};
    const docLabel = JOBSEEKER_NOTIFICATION_LABELS[docType] || JOBSEEKER_DOC_LABELS[docType] || docType;
    const approvedCount = JOBSEEKER_DOC_TYPES.filter(
      (type) => String(docs?.[type]?.status || '').toLowerCase() === 'approved'
    ).length;
    const allApproved = approvedCount === JOBSEEKER_DOC_TYPES.length;

    let title = 'Credential Approved';
    let message = `Your “${docLabel}” credential has been verified. Continue uploading your remaining credentials to strengthen your profile.`;

    if (action === 'action_needed') {
      title = 'Action Needed';
      message = `Your “${docLabel}” credential wasn't approved during verification. Please check the administrator's feedback, make the necessary corrections, and upload a new copy for review.${feedback ? ` Admin note: ${feedback}` : ''}`;
    } else if (allApproved) {
      title = "You're All Set!";
      message = 'All your credentials have been successfully verified. A fully completed profile can improve your visibility and increase your chances of getting hired.';
    }

    await Notification.create({
      user: user._id,
      type: 'verification',
      title,
      message,
      relatedId: user._id,
      relatedModel: 'User',
      link: '/jobseeker/my-profile#credentials',
      metadata: {
        credentialType: docType,
        credentialName: docLabel,
        credentialStatus: action === 'action_needed' ? 'action_needed' : 'approved',
        approvedCredentials: approvedCount,
        remainingCredentials: Math.max(0, JOBSEEKER_DOC_TYPES.length - approvedCount),
        adminFeedback: feedback || '',
      },
    });
  } catch (notificationError) {
    console.error('Failed to create jobseeker credential notification:', notificationError);
  }
};

const automaticallyApproveJobseekerAccount = async (jobseeker, adminId = null) => {
  const docs = jobseeker?.jobSeekerProfile?.verificationDocs;
  if (
    !docs ||
    isApprovedJobseekerAccount(jobseeker) ||
    getJobseekerCredentialReviewStatus(docs) !== 'verified'
  ) {
    return { approved: false };
  }

  const newUsername = jobseeker.username || await generateUniqueUsername({
    role: 'jobseeker',
    firstName: jobseeker.firstName,
    lastName: jobseeker.lastName,
    companyName: '',
  });
  const temporaryPassword = generateTempPassword();

  docs.overallStatus = 'verified';
  docs.verifiedBy = adminId;
  docs.verifiedAt = new Date();
  docs.adminRemarks = '';
  docs.rejectionReasons = [];
  docs.rejectionMessage = '';
  docs.rejectedAt = null;
  jobseeker.jobSeekerProfile.verificationStatus = 'verified';
  jobseeker.isVerified = true;
  jobseeker.status = 'active';
  jobseeker.username = newUsername;
  jobseeker.password = await bcrypt.hash(temporaryPassword, 12);
  jobseeker.mustChangePassword = true;

  await jobseeker.save();

  sendCredentialsEmail({
    to: jobseeker.email,
    fullName: jobseeker.fullName || jobseeker.email,
    username: newUsername,
    temporaryPassword,
    role: 'Jobseeker',
  }).catch((emailError) => {
    console.error('Failed to send automatically approved jobseeker credentials email:', emailError);
  });

  return { approved: true, username: newUsername };
};

const EMPLOYER_DOC_TYPES = ['secRegistration', 'birRegistration', 'dtiRegistration', 'cityPermit', 'businessPermit'];

const EMPLOYER_DOC_LABELS = {
  secRegistration: 'SEC Registration',
  birRegistration: 'BIR Registration',
  dtiRegistration: 'DTI Registration',
  cityPermit: 'City/Municipality Permit',
  businessPermit: 'Business Permit',
};

const RESUBMIT_DAY_MS = 24 * 60 * 60 * 1000;
const RESUBMIT_REMINDER_DAY_7 = 7 * RESUBMIT_DAY_MS;
const RESUBMIT_REMINDER_DAY_14 = 14 * RESUBMIT_DAY_MS;

const createVerificationResubmitToken = ({ userId, requestedAt, docTypes = [] }) => {
  const secret = process.env.RESUBMIT_TOKEN_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('RESUBMIT_TOKEN_SECRET or JWT_SECRET is required for verification resubmission links.');
  }

  return crypto
    .createHmac('sha256', secret)
    .update([
      String(userId || ''),
      new Date(requestedAt).toISOString(),
      [...docTypes].map((item) => String(item || '').trim()).filter(Boolean).sort().join(','),
    ].join('|'))
    .digest('hex');
};

const verificationResubmitFrontendUrl = (accountType, rawToken) => {
  const frontendUrl = (process.env.FRONTEND_URL || process.env.APP_URL || 'https://agapayy.onrender.com').replace(/\/$/, '');
  const path = accountType === 'employer' ? '/employer/resubmit-document' : '/resubmit-document';
  return `${frontendUrl}${path}?token=${encodeURIComponent(rawToken)}`;
};


const areAllEmployerCredentialsApproved = (docs = {}) =>
  EMPLOYER_DOC_TYPES.every((docType) => {
    const document = docs?.[docType];
    return Boolean(
      document?.url &&
      (document?.checked === true || String(document?.status || '').toLowerCase() === 'approved')
    );
  });

const automaticallyApproveEmployerAccount = async (employer) => {
  const docs = employer?.employerProfile?.verificationDocs;
  if (!docs || docs.overallStatus === 'verified' || !areAllEmployerCredentialsApproved(docs)) {
    return { approved: false };
  }

  const newUsername = employer.username || await generateUniqueUsername({
    role: 'employer',
    companyName: employer?.employerProfile?.companyName || employer?.firstName || 'employer',
    firstName: employer.firstName,
    lastName: employer.lastName,
  });
  const temporaryPassword = generateTempPassword();

  docs.overallStatus = 'verified';
  docs.remarks = '';
  docs.rejectionReasons = [];
  docs.rejectionMessage = '';
  docs.rejectedAt = null;
  employer.username = newUsername;
  employer.status = 'active';
  employer.password = await bcrypt.hash(temporaryPassword, 12);
  employer.mustChangePassword = true;

  await employer.save();

  sendCredentialsEmail({
    to: employer.email,
    fullName: employer.fullName || employer.email,
    username: newUsername,
    temporaryPassword,
    role: 'Employer',
  }).catch((emailError) => {
    console.error('Failed to send automatic employer approval email:', emailError);
  });

  return { approved: true, username: newUsername };
};

// ==========================
// ✅ HELPERS: secure document delivery for Cloudinary credentials
// ==========================
const isCloudinaryConfiguredForDelivery = () =>
  Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);

if (isCloudinaryConfiguredForDelivery()) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

const isCloudinaryUrl = (url = '') => /^https?:\/\/res\.cloudinary\.com\//i.test(String(url || ''));

const getFileNameFromDocumentUrl = (url = '', fallback = 'document') => {
  try {
    const cleanPath = new URL(url).pathname.split('?')[0];
    const lastPart = decodeURIComponent(cleanPath.split('/').filter(Boolean).pop() || '');
    return lastPart || fallback;
  } catch {
    const lastPart = String(url || '').split('?')[0].split('/').filter(Boolean).pop();
    return lastPart || fallback;
  }
};

const toSafeDownloadName = (name = 'document') =>
  String(name || 'document')
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim() || 'document';

const DOCUMENT_EXTENSION_BY_MIME_TYPE = {
  'application/pdf': 'pdf',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
};

const detectDocumentExtensionFromBuffer = (buffer) => {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4) return '';

  if (buffer.subarray(0, 4).toString('ascii') === '%PDF') return 'pdf';
  if (buffer.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]))) return 'png';
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpg';

  const signature = buffer.subarray(0, 4).toString('ascii');
  if (signature === 'GIF8') return 'gif';
  if (signature === 'RIFF' && buffer.length >= 12 && buffer.subarray(8, 12).toString('ascii') === 'WEBP') {
    return 'webp';
  }

  return '';
};

const hasValidPdfStructure = (buffer) => {
  if (!Buffer.isBuffer(buffer) || buffer.length < 20) return false;
  if (buffer.subarray(0, 5).toString('ascii') !== '%PDF-') return false;

  const tail = buffer.subarray(Math.max(0, buffer.length - 2048)).toString('latin1');
  return tail.includes('%%EOF');
};

const isValidVerificationDocumentBuffer = (buffer) => {
  const extension = detectDocumentExtensionFromBuffer(buffer);
  if (extension === 'pdf') return hasValidPdfStructure(buffer);
  return ['png', 'jpg', 'gif', 'webp'].includes(extension);
};

const DOCUMENT_MIME_TYPE_BY_EXTENSION = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
};

const resolveDocumentContentType = ({ upstreamContentType, doc, buffer }) => {
  const detectedExtension = detectDocumentExtensionFromBuffer(buffer);
  if (detectedExtension && DOCUMENT_MIME_TYPE_BY_EXTENSION[detectedExtension]) {
    return DOCUMENT_MIME_TYPE_BY_EXTENSION[detectedExtension];
  }

  const storedMimeType = String(doc?.mimeType || '').split(';')[0].trim().toLowerCase();
  if (storedMimeType && storedMimeType !== 'application/octet-stream') return storedMimeType;

  const cleanUpstreamContentType = String(upstreamContentType || '').split(';')[0].trim().toLowerCase();
  return cleanUpstreamContentType || 'application/octet-stream';
};

const ensureDocumentFileExtension = ({ fileName, contentType, doc, buffer }) => {
  const safeFileName = toSafeDownloadName(fileName);

  if (/\.[a-z0-9]{1,10}$/i.test(safeFileName)) {
    return safeFileName;
  }

  const cleanContentType = String(contentType || '')
    .split(';')[0]
    .trim()
    .toLowerCase();
  const mimeExtension = DOCUMENT_EXTENSION_BY_MIME_TYPE[cleanContentType] || '';
  const storedFormat = String(doc?.format || '')
    .trim()
    .replace(/^\./, '')
    .toLowerCase();
  const safeStoredFormat = ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp'].includes(storedFormat)
    ? storedFormat === 'jpeg' ? 'jpg' : storedFormat
    : '';
  const detectedExtension = detectDocumentExtensionFromBuffer(buffer);
  const extension = mimeExtension || safeStoredFormat || detectedExtension;

  return extension ? `${safeFileName}.${extension}` : safeFileName;
};

const getCloudinaryAssetParts = (doc = {}) => {
  const originalUrl = String(doc?.url || '').trim();
  if (!originalUrl || !isCloudinaryUrl(originalUrl) || !isCloudinaryConfiguredForDelivery()) return null;

  try {
    const parsed = new URL(originalUrl);
    const parts = parsed.pathname.split('/').filter(Boolean);
    const uploadIndex = parts.findIndex((part) => part === 'upload');

    if (uploadIndex < 1) return null;

    const resourceTypeFromUrl = parts[uploadIndex - 1] || '';
    const resourceType = ['image', 'raw', 'video'].includes(resourceTypeFromUrl)
      ? resourceTypeFromUrl
      : String(doc?.resourceType || doc?.resource_type || 'image').trim() || 'image';

    const versionIndex = parts.findIndex((part, index) => index > uploadIndex && /^v\d+$/.test(part));
    const publicParts = parts.slice(versionIndex >= 0 ? versionIndex + 1 : uploadIndex + 1);
    const version = versionIndex >= 0 ? Number(parts[versionIndex].slice(1)) : undefined;
    const publicPathWithFormat = decodeURIComponent(publicParts.join('/'));

    if (!publicPathWithFormat) return null;

    const lastSegment = publicPathWithFormat.split('/').pop() || '';
    const extensionMatch = lastSegment.match(/\.([a-zA-Z0-9]+)$/);
    const format = resourceType === 'raw'
      ? ''
      : String(doc?.format || (extensionMatch ? extensionMatch[1] : '') || '').toLowerCase();
    const publicIdFromUrl = format && resourceType !== 'raw'
      ? publicPathWithFormat.slice(0, -(format.length + 1))
      : publicPathWithFormat;

    const storedPublicId = String(doc?.publicId || doc?.public_id || '').trim();
    const publicId = storedPublicId || publicIdFromUrl;

    return {
      originalUrl,
      resourceType,
      version,
      publicId,
      format,
    };
  } catch (error) {
    console.error('Error parsing Cloudinary document URL:', error);
    return null;
  }
};

const addUniqueUrl = (urls, url) => {
  if (url && !urls.includes(url)) urls.push(url);
};

const buildCloudinaryDeliveryUrls = (doc = {}, disposition = 'inline') => {
  const originalUrl = String(doc?.url || '').trim();
  if (!originalUrl) return [];

  const asset = getCloudinaryAssetParts(doc);
  if (!asset) return [originalUrl];

  const urls = [originalUrl];
  const attachment = disposition === 'attachment';
  const expiresAt = Math.floor(Date.now() / 1000) + 10 * 60;

  const resourceTypesToTry = [asset.resourceType];
  if (asset.format === 'pdf') {
    if (!resourceTypesToTry.includes('raw')) resourceTypesToTry.push('raw');
    if (!resourceTypesToTry.includes('image')) resourceTypesToTry.push('image');
  }

  resourceTypesToTry.forEach((resourceType) => {
    try {
      const signedOptions = {
        resource_type: resourceType,
        type: 'upload',
        secure: true,
        sign_url: true,
      };

      if (asset.version) signedOptions.version = asset.version;
      if (asset.format && resourceType !== 'raw') signedOptions.format = asset.format;
      if (attachment) signedOptions.flags = 'attachment';

      addUniqueUrl(urls, cloudinary.url(asset.publicId, signedOptions));
    } catch (error) {
      console.error('Error creating signed Cloudinary URL:', error);
    }

    try {
      const privateDownloadUrl = cloudinary.utils.private_download_url(
        asset.publicId,
        asset.format || undefined,
        {
          resource_type: resourceType,
          type: 'upload',
          expires_at: expiresAt,
          attachment,
        }
      );

      addUniqueUrl(urls, privateDownloadUrl);
    } catch (error) {
      console.error('Error creating private Cloudinary download URL:', error);
    }
  });

  return urls;
};

const getVerificationDocFromUser = (user, docType) => {
  const cleanDocType = String(docType || '').trim();

  if (user?.role === 'jobseeker') {
    if (!JOBSEEKER_DOC_TYPES.includes(cleanDocType)) return null;
    return user?.jobSeekerProfile?.verificationDocs?.[cleanDocType] || null;
  }

  if (user?.role === 'employer') {
    if (!EMPLOYER_DOC_TYPES.includes(cleanDocType)) return null;
    return user?.employerProfile?.verificationDocs?.[cleanDocType] || null;
  }

  return null;
};

const streamVerificationDocument = async (req, res, userRole) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user || (userRole && user.role !== userRole)) {
      return res.status(404).json({
        success: false,
        message: userRole === 'employer' ? 'Employer not found' : userRole === 'jobseeker' ? 'Jobseeker not found' : 'User not found',
      });
    }

    const docType = String(req.params.docType || '').trim();
    const doc = getVerificationDocFromUser(user, docType);

    if (!doc || !doc.url) {
      return res.status(404).json({
        success: false,
        message: 'Document not found',
      });
    }

    const disposition = String(req.query.disposition || 'inline').toLowerCase() === 'attachment' ? 'attachment' : 'inline';
    const deliveryUrls = buildCloudinaryDeliveryUrls(doc, disposition);

    let fileBuffer = null;
    let upstreamContentType = '';
    let lastStatus = 500;

    for (const deliveryUrl of deliveryUrls) {
      try {
        const response = await fetch(deliveryUrl, {
          headers: {
            'User-Agent': 'AGAPAY-admin-document-delivery/1.0',
          },
        });

        if (response.ok) {
          const candidateBuffer = Buffer.from(await response.arrayBuffer());

          if (isValidVerificationDocumentBuffer(candidateBuffer)) {
            fileBuffer = candidateBuffer;
            upstreamContentType = response.headers.get('content-type') || '';
            break;
          }

          lastStatus = 422;
          console.error('Document delivery returned invalid file content:', deliveryUrl);
          continue;
        }

        lastStatus = response.status;
        console.error('Document delivery failed:', response.status, deliveryUrl);
      } catch (fetchError) {
        console.error('Document delivery request error:', fetchError?.message || fetchError, deliveryUrl);
      }
    }

    if (!fileBuffer) {
      return res.status(lastStatus || 500).json({
        success: false,
        message: lastStatus === 422
          ? 'The stored credential is invalid or corrupted. Please ask the user to resubmit a valid PDF, JPG, JPEG, or PNG file.'
          : 'Unable to access document file. Please check Cloudinary PDF/raw delivery settings or re-upload the document.',
      });
    }

    const buffer = fileBuffer;
    const contentType = resolveDocumentContentType({
      upstreamContentType,
      doc,
      buffer,
    });
    const fallbackName = `${docType}-${user._id}`;
    const filename = ensureDocumentFileExtension({
      fileName: String(doc.filename || '').trim() || getFileNameFromDocumentUrl(doc.url, fallbackName),
      contentType,
      doc,
      buffer,
    });

    const asciiFilename = filename.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_');
    const encodedFilename = encodeURIComponent(filename);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', buffer.length);
    res.setHeader(
      'Content-Disposition',
      `${disposition}; filename="${asciiFilename}"; filename*=UTF-8''${encodedFilename}`
    );
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, max-age=300');

    return res.send(buffer);
  } catch (error) {
    console.error('Error streaming verification document:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error downloading document',
    });
  }
};



// ==========================
// ✅ ADMIN DASHBOARD ANALYTICS
// ==========================
const DASHBOARD_CAMPUSES = ['AU Main', 'AU San Jose', 'AU South'];

const toStartOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const toEndOfDay = (date) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const addMonths = (date, months) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
};

const normalizeDashboardText = (value) => {
  return String(value || '').trim();
};

const normalizeDashboardCampus = (value) => {
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

const getDashboardDateRange = (dateFilter, customStartDate, customEndDate) => {
  const now = new Date();
  const filter = normalizeDashboardText(dateFilter || 'all').toLowerCase();

  if (filter === 'custom') {
    const start = customStartDate ? toStartOfDay(customStartDate) : null;
    const end = customEndDate ? toEndOfDay(customEndDate) : null;

    if (start && end && !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
      return { start, end, label: 'Custom Range' };
    }
  }

  if (filter === 'today') return { start: toStartOfDay(now), end: toEndOfDay(now), label: 'Today' };
  if (filter === 'yesterday') {
    const yesterday = addDays(now, -1);
    return { start: toStartOfDay(yesterday), end: toEndOfDay(yesterday), label: 'Yesterday' };
  }
  if (filter === '7days') return { start: toStartOfDay(addDays(now, -6)), end: toEndOfDay(now), label: 'Last 7 days' };
  if (filter === '30days') return { start: toStartOfDay(addDays(now, -29)), end: toEndOfDay(now), label: 'Last 30 days' };
  if (filter === 'thismonth') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start: toStartOfDay(start), end: toEndOfDay(now), label: 'This Month' };
  }
  if (filter === 'lastmonth') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    return { start: toStartOfDay(start), end: toEndOfDay(end), label: 'Last Month' };
  }
  if (filter === '90days') return { start: toStartOfDay(addDays(now, -89)), end: toEndOfDay(now), label: 'Last 90 days' };
  if (filter === '12months') return { start: toStartOfDay(addMonths(now, -11)), end: toEndOfDay(now), label: 'Last 12 months' };

  return { start: null, end: null, label: 'All Time' };
};

const getMonthKey = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const getMonthLabel = (date) => {
  const d = new Date(date);
  return d.toLocaleString('en-US', { month: 'short', year: '2-digit' });
};

const buildMonthBuckets = (start, end) => {
  const now = new Date();
  const rangeStart = start ? new Date(start) : addMonths(now, -11);
  const rangeEnd = end ? new Date(end) : now;

  const cursor = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
  const last = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), 1);
  const buckets = [];

  while (cursor <= last && buckets.length < 18) {
    buckets.push({ key: getMonthKey(cursor), label: getMonthLabel(cursor) });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return buckets;
};

const getJobseekerCampus = (user) => {
  const profile = user?.jobSeekerProfile || {};
  return (
    normalizeDashboardCampus(profile.campus) ||
    normalizeDashboardCampus(Array.isArray(profile.educationEntries) && profile.educationEntries.find((entry) => entry?.campus)?.campus) ||
    'Unspecified'
  );
};

const applyDateMatch = (field, range) => {
  if (!range.start && !range.end) return {};
  const match = {};
  if (range.start) match.$gte = range.start;
  if (range.end) match.$lte = range.end;
  return { [field]: match };
};

exports.getAdminDashboardAnalytics = async (req, res) => {
  try {
    const dateFilter = normalizeDashboardText(req.query.date || 'all');
    const campusFilter = req.query.campus && String(req.query.campus).toLowerCase() !== 'all' ? normalizeDashboardCampus(req.query.campus) : 'all';
    const applicationStatusFilter = normalizeDashboardText(req.query.applicationStatus || 'all').toLowerCase();
    const employmentTypeFilter = normalizeDashboardText(req.query.employmentType || 'all');
    const workModeFilter = normalizeDashboardText(req.query.workMode || 'all');
    const range = getDashboardDateRange(dateFilter, req.query.startDate, req.query.endDate);

    const [users, jobs, applications, editRequests] = await Promise.all([
      User.find({ status: { $ne: 'deleted' } }).select('-password').lean(),
      Job.find({ isArchived: { $ne: true } }).populate('employer', 'employerProfile companyName firstName lastName').lean(),
      Application.find({}).populate('job').populate('jobseeker', 'jobSeekerProfile').lean(),
      JobEditRequest.find({}).lean(),
    ]);

    const jobseekers = users.filter((user) => user.role === 'jobseeker');
    const employers = users.filter((user) => user.role === 'employer');
    const registeredUsers = [...jobseekers, ...employers];

    const pendingSeekerUsers = jobseekers.filter((user) => {
      const status = String(user?.jobSeekerProfile?.verificationDocs?.overallStatus || user?.jobSeekerProfile?.verificationStatus || '').toLowerCase();
      return status === 'pending';
    });

    const pendingEmployerUsers = employers.filter((user) => {
      const status = String(user?.employerProfile?.verificationDocs?.overallStatus || '').toLowerCase();
      return status === 'pending';
    });

    const pendingEditRequests = editRequests.filter((request) => String(request.status || '').toLowerCase() === 'pending');

    const campusOptions = DASHBOARD_CAMPUSES;
    const employmentTypeOptions = [...new Set(jobs.map((job) => job.jobType).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    const workModeOptions = [...new Set(jobs.map((job) => job.workMode).filter(Boolean))].sort((a, b) => a.localeCompare(b));

    const inRange = (dateValue) => {
      const d = new Date(dateValue);
      if (Number.isNaN(d.getTime())) return false;
      if (range.start && d < range.start) return false;
      if (range.end && d > range.end) return false;
      return true;
    };

    const campusMatches = (campus) => {
      const normalizedCampus = normalizeDashboardCampus(campus);
      return campusFilter.toLowerCase() === 'all' || normalizedCampus.toLowerCase() === campusFilter.toLowerCase();
    };

    const jobMatches = (job) => {
      if (!job) return false;
      if (!inRange(job.createdAt)) return false;
      if (employmentTypeFilter.toLowerCase() !== 'all' && String(job.jobType || '').toLowerCase() !== employmentTypeFilter.toLowerCase()) return false;
      if (workModeFilter.toLowerCase() !== 'all' && String(job.workMode || '').toLowerCase() !== workModeFilter.toLowerCase()) return false;
      return true;
    };

    const applicationMatches = (application) => {
      const job = application.job || {};
      const seekerCampus = getJobseekerCampus(application.jobseeker || {});
      if (!inRange(application.appliedAt || application.createdAt)) return false;
      if (!campusMatches(seekerCampus)) return false;
      if (applicationStatusFilter !== 'all' && String(application.status || '').toLowerCase() !== applicationStatusFilter) return false;
      if (employmentTypeFilter.toLowerCase() !== 'all' && String(job.jobType || '').toLowerCase() !== employmentTypeFilter.toLowerCase()) return false;
      if (workModeFilter.toLowerCase() !== 'all' && String(job.workMode || '').toLowerCase() !== workModeFilter.toLowerCase()) return false;
      return true;
    };

    const filteredJobs = jobs.filter(jobMatches);
    const filteredApplications = applications.filter(applicationMatches);
    const months = buildMonthBuckets(range.start, range.end);

    const makeCampusSeries = (items, dateGetter, campusGetter) => {
      const map = {};
      months.forEach(({ key, label }) => {
        map[key] = { label };
        campusOptions.forEach((campus) => { map[key][campus] = 0; });
      });

      items.forEach((item) => {
        const key = getMonthKey(dateGetter(item));
        const campus = normalizeDashboardCampus(campusGetter(item));
        if (!map[key]) return;
        if (!map[key][campus]) map[key][campus] = 0;
        map[key][campus] += 1;
      });

      return months.map(({ key }) => map[key]);
    };

    const applicationTrends = makeCampusSeries(
      filteredApplications,
      (item) => item.appliedAt || item.createdAt,
      (item) => getJobseekerCampus(item.jobseeker || {})
    );

    const jobPostingTrends = makeCampusSeries(
      filteredJobs,
      (item) => item.createdAt,
      (item) => {
        const employer = item.employer || {};
        return normalizeDashboardCampus(employer?.employerProfile?.campus) || normalizeDashboardCampus(item.campus) || 'Unspecified';
      }
    );

    const registrationTrends = makeCampusSeries(
      jobseekers.filter((user) => inRange(user.createdAt) && campusMatches(getJobseekerCampus(user))),
      (item) => item.createdAt,
      (item) => getJobseekerCampus(item)
    );

    const hireRateByCampus = months.map(({ key, label }) => {
      const row = { label };

      campusOptions.forEach((campus) => {
        const monthCampusApps = filteredApplications.filter((app) => {
          const appMonth = getMonthKey(app.appliedAt || app.createdAt);
          const seekerCampus = normalizeDashboardCampus(getJobseekerCampus(app.jobseeker || {}));
          return appMonth === key && seekerCampus.toLowerCase() === String(campus || '').toLowerCase();
        });

        const hiredCount = monthCampusApps.filter((app) => String(app.status || '').toLowerCase() === 'hired').length;
        row[campus] = monthCampusApps.length ? Math.round((hiredCount / monthCampusApps.length) * 100) : 0;
      });

      return row;
    });

    const applicationStatus = ['pending', 'for interview', 'hired', 'declined'].map((status) => ({
      name: status,
      value: filteredApplications.filter((app) => String(app.status || '').toLowerCase() === status).length,
    }));

    const workModeDistribution = workModeOptions.map((mode) => ({
      name: mode,
      value: filteredJobs.filter((job) => String(job.workMode || '').toLowerCase() === mode.toLowerCase()).length,
    }));

    const employmentTypeDistribution = employmentTypeOptions.map((type) => ({
      name: type,
      value: filteredJobs.filter((job) => String(job.jobType || '').toLowerCase() === type.toLowerCase()).length,
    }));

    const categoryCounts = {};
    filteredJobs.forEach((job) => {
      const category = normalizeDashboardText(job.category) || 'Others';
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });

    const topJobCategories = Object.entries(categoryCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    const companyCounts = {};
    filteredJobs.forEach((job) => {
      const company = normalizeDashboardText(job.companyName) || normalizeDashboardText(job.employer?.employerProfile?.companyName) || 'Unknown Company';
      companyCounts[company] = (companyCounts[company] || 0) + 1;
    });

    const topHiringCompanies = Object.entries(companyCounts)
      .map(([companyName, count]) => ({ companyName, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Compact dashboard data used by the redesigned Admin Dashboard.
    // The latest six complete/current calendar months are intentionally independent
    // from the advanced dashboard filters so the registration traffic card always
    // shows a stable six-month trend, matching the dashboard reference design.
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const countCreatedBetween = (items, start, end) => items.filter((item) => {
      const createdAt = new Date(item.createdAt);
      return !Number.isNaN(createdAt.getTime()) && createdAt >= start && createdAt < end;
    }).length;

    const percentChange = (current, previous) => {
      if (previous === 0) return current === 0 ? 0 : 100;
      return Number((((current - previous) / previous) * 100).toFixed(1));
    };

    const registeredThisMonth = countCreatedBetween(registeredUsers, monthStart, nextMonthStart);
    const registeredLastMonth = countCreatedBetween(registeredUsers, previousMonthStart, monthStart);
    const pendingSeekersThisMonth = countCreatedBetween(pendingSeekerUsers, monthStart, nextMonthStart);
    const pendingSeekersLastMonth = countCreatedBetween(pendingSeekerUsers, previousMonthStart, monthStart);
    const pendingEmployersThisMonth = countCreatedBetween(pendingEmployerUsers, monthStart, nextMonthStart);
    const pendingEmployersLastMonth = countCreatedBetween(pendingEmployerUsers, previousMonthStart, monthStart);
    const pendingEditsThisMonth = countCreatedBetween(pendingEditRequests, monthStart, nextMonthStart);
    const pendingEditsLastMonth = countCreatedBetween(pendingEditRequests, previousMonthStart, monthStart);

    const registrationTraffic = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      const start = new Date(date.getFullYear(), date.getMonth(), 1);
      const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
      const jobSeekerCount = countCreatedBetween(jobseekers, start, end);
      const employerCount = countCreatedBetween(employers, start, end);

      return {
        label: start.toLocaleDateString('en-US', { month: 'short' }),
        month: start.toISOString().slice(0, 7),
        jobSeekers: jobSeekerCount,
        employers: employerCount,
        total: jobSeekerCount + employerCount,
      };
    });

    const recentTotal = registeredThisMonth + registeredLastMonth;
    const growthShare = recentTotal > 0 ? Math.round((registeredThisMonth / recentTotal) * 100) : 0;

    return res.status(200).json({
      success: true,
      filters: {
        selected: {
          date: dateFilter,
          startDate: req.query.startDate || '',
          endDate: req.query.endDate || '',
          campus: campusFilter,
          applicationStatus: applicationStatusFilter,
          employmentType: employmentTypeFilter,
          workMode: workModeFilter,
        },
        options: {
          campuses: campusOptions,
          employmentTypes: employmentTypeOptions,
          workModes: workModeOptions,
          applicationStatuses: ['pending', 'for interview', 'hired', 'declined', 'withdrawn', 'cancelled'],
        },
      },
      stats: {
        totalJobs: jobs.filter((job) => job.isActive !== false && job.isPublished !== false && job.isArchived !== true).length,
        totalJobSeekers: jobseekers.length,
        totalEmployers: employers.length,
        registeredUsers: registeredUsers.length,
        pendingSeekers: pendingSeekerUsers.length,
        pendingEmployers: pendingEmployerUsers.length,
        pendingRequestEdits: pendingEditRequests.length,
        growth: {
          registeredUsers: percentChange(registeredThisMonth, registeredLastMonth),
          pendingSeekers: percentChange(pendingSeekersThisMonth, pendingSeekersLastMonth),
          pendingEmployers: percentChange(pendingEmployersThisMonth, pendingEmployersLastMonth),
          pendingRequestEdits: percentChange(pendingEditsThisMonth, pendingEditsLastMonth),
        },
      },
      overview: {
        registrationTraffic,
        userGrowth: {
          percentChange: percentChange(registeredThisMonth, registeredLastMonth),
          currentMonth: registeredThisMonth,
          previousMonth: registeredLastMonth,
          progress: growthShare,
        },
      },
      charts: {
        applicationTrends,
        jobPostingTrends,
        registrationTrends,
        hireRateByCampus,
        applicationStatus,
        workModeDistribution,
        employmentTypeDistribution,
        topJobCategories,
        topHiringCompanies,
      },
    });
  } catch (error) {
    console.error('Error fetching admin dashboard analytics:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching dashboard analytics',
    });
  }
};

// ==========================
// ADMIN ANALYTICS PAGE
// ==========================
const ANALYTICS_MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;

const analyticsText = (value) => String(value ?? '').trim();
const analyticsLower = (value) => analyticsText(value).toLowerCase();
const analyticsId = (value) => analyticsText(value?._id || value);
const analyticsIsAll = (value) => !analyticsText(value) || analyticsLower(value) === 'all';

const analyticsManilaParts = (value = new Date()) => {
  const shifted = new Date(new Date(value).getTime() + ANALYTICS_MANILA_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
  };
};

const analyticsManilaBoundary = ({ year, month, day }, endOfDay = false) => {
  const utc = Date.UTC(
    year,
    month,
    day,
    endOfDay ? 23 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 999 : 0
  ) - ANALYTICS_MANILA_OFFSET_MS;
  return new Date(utc);
};

const analyticsShiftDateParts = (parts, days) => {
  const date = new Date(Date.UTC(parts.year, parts.month, parts.day + days));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth(), day: date.getUTCDate() };
};

const analyticsParseDateInput = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(analyticsText(value));
  if (!match) return null;
  const parts = { year: Number(match[1]), month: Number(match[2]) - 1, day: Number(match[3]) };
  const check = new Date(Date.UTC(parts.year, parts.month, parts.day));
  if (
    check.getUTCFullYear() !== parts.year ||
    check.getUTCMonth() !== parts.month ||
    check.getUTCDate() !== parts.day
  ) return null;
  return parts;
};

const getAdminAnalyticsDateRange = ({ preset, specificDate, startDate, endDate }) => {
  const value = analyticsLower(preset || 'overall');
  const today = analyticsManilaParts();
  const dayOfWeek = new Date(Date.UTC(today.year, today.month, today.day)).getUTCDay();
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const thisMonday = analyticsShiftDateParts(today, -mondayOffset);

  const makeDay = (parts, label) => ({
    start: analyticsManilaBoundary(parts),
    end: analyticsManilaBoundary(parts, true),
    label,
  });

  if (value === 'today') return makeDay(today, 'Today');
  if (value === 'yesterday') return makeDay(analyticsShiftDateParts(today, -1), 'Yesterday');
  if (value === 'thisweek') {
    return {
      start: analyticsManilaBoundary(thisMonday),
      end: analyticsManilaBoundary(today, true),
      label: 'This Week',
    };
  }
  if (value === 'lastweek') {
    return {
      start: analyticsManilaBoundary(analyticsShiftDateParts(thisMonday, -7)),
      end: analyticsManilaBoundary(analyticsShiftDateParts(thisMonday, -1), true),
      label: 'Last Week',
    };
  }
  if (value === 'thismonth') {
    return {
      start: analyticsManilaBoundary({ ...today, day: 1 }),
      end: analyticsManilaBoundary(today, true),
      label: 'This Month',
    };
  }
  if (value === 'lastmonth') {
    const firstThisMonth = { ...today, day: 1 };
    const lastPreviousMonth = analyticsShiftDateParts(firstThisMonth, -1);
    return {
      start: analyticsManilaBoundary({ ...lastPreviousMonth, day: 1 }),
      end: analyticsManilaBoundary(lastPreviousMonth, true),
      label: 'Last Month',
    };
  }
  if (value === 'thisyear') {
    return {
      start: analyticsManilaBoundary({ year: today.year, month: 0, day: 1 }),
      end: analyticsManilaBoundary(today, true),
      label: 'This Year',
    };
  }
  if (value === 'lastyear') {
    return {
      start: analyticsManilaBoundary({ year: today.year - 1, month: 0, day: 1 }),
      end: analyticsManilaBoundary({ year: today.year - 1, month: 11, day: 31 }, true),
      label: 'Last Year',
    };
  }
  if (value === 'specific') {
    const selected = analyticsParseDateInput(specificDate);
    if (selected) return makeDay(selected, 'Specific Date');
  }
  if (value === 'range') {
    const from = analyticsParseDateInput(startDate);
    const to = analyticsParseDateInput(endDate);
    if (from && to) {
      const start = analyticsManilaBoundary(from);
      const end = analyticsManilaBoundary(to, true);
      if (start <= end) return { start, end, label: 'Date Range' };
    }
  }
  return { start: null, end: null, label: 'Overall' };
};

const analyticsInRange = (value, range) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return false;
  if (range.start && date < range.start) return false;
  if (range.end && date > range.end) return false;
  return true;
};

const analyticsDateFor = (type, record, dateField) => {
  if (dateField === 'created') return record?.createdAt;
  if (dateField === 'outcome') {
    if (type === 'job') return record?.filledAt || record?.archivedAt || record?.updatedAt || record?.createdAt;
    if (type === 'application') return record?.hiredAt || record?.reviewedAt || record?.updatedAt || record?.appliedAt || record?.createdAt;
    if (type === 'editRequest') return record?.reviewedAt || record?.updatedAt || record?.createdAt;
    if (type === 'message') return record?.readAt || record?.updatedAt || record?.createdAt;
    if (type === 'verification') return record?.verifiedAt || record?.consumedAt || record?.updatedAt || record?.createdAt;
    return record?.updatedAt || record?.createdAt;
  }
  if (type === 'job') return record?.publishedAt || record?.createdAt;
  if (type === 'application') return record?.appliedAt || record?.createdAt;
  if (type === 'verification') return record?.otpRequestedAt || record?.createdAt;
  return record?.createdAt;
};

const analyticsCountRows = (items, getter, limit = 20) => {
  const counts = new Map();
  items.forEach((item) => {
    const raw = getter(item);
    const name = analyticsText(raw) || 'Unspecified';
    counts.set(name, (counts.get(name) || 0) + 1);
  });
  return Array.from(counts, ([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name))
    .slice(0, limit);
};

const analyticsUnique = (values) => [...new Set(values.map(analyticsText).filter(Boolean))]
  .sort((a, b) => a.localeCompare(b));

const analyticsVerificationStatus = (user) => {
  if (user?.role === 'jobseeker') {
    return analyticsLower(
      user?.jobSeekerProfile?.verificationDocs?.overallStatus ||
      user?.jobSeekerProfile?.verificationStatus ||
      (user?.isVerified ? 'verified' : 'not_submitted')
    );
  }
  if (user?.role === 'employer') {
    return analyticsLower(
      user?.employerProfile?.verificationDocs?.overallStatus ||
      (user?.isVerified ? 'verified' : 'unverified')
    );
  }
  return user?.isVerified ? 'verified' : 'unverified';
};

const analyticsJobLifecycleStatus = (job = {}) => {
  const rawStatus = analyticsLower(job.status);
  const archivedStatus = analyticsLower(job.statusBeforeArchive);

  if (rawStatus === 'filled' || archivedStatus === 'filled') return 'filled';
  if (rawStatus === 'closed' || archivedStatus === 'closed') return 'closed';
  if (archivedStatus === 'expired') return 'expired';

  const deadline = job.applicationDeadline ? new Date(job.applicationDeadline) : null;
  const deadlineExpired =
    deadline &&
    !Number.isNaN(deadline.getTime()) &&
    deadline.getTime() < Date.now();

  if (
    deadlineExpired &&
    ['published', 'open'].includes(rawStatus) &&
    !job.filledAt &&
    !job.closedAt
  ) {
    return 'expired';
  }

  if (
    ['published', 'open'].includes(rawStatus) &&
    job.isActive !== false &&
    job.isPublished !== false &&
    !job.isArchived
  ) {
    return 'open';
  }

  return '';
};

const analyticsPercentile = (values, percentile) => {
  const sorted = values.map(Number).filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const index = Math.min(sorted.length - 1, Math.ceil((percentile / 100) * sorted.length) - 1);
  return Math.round(sorted[Math.max(0, index)]);
};

const analyticsTrendRows = ({ users, jobs, applications, dateField = 'primary' }) => {
  const buckets = new Map();
  const ensure = (dateValue) => {
    const parts = analyticsManilaParts(dateValue);
    const key = `${parts.year}-${String(parts.month + 1).padStart(2, '0')}`;
    if (!buckets.has(key)) {
      const label = new Date(Date.UTC(parts.year, parts.month, 1)).toLocaleString('en-US', {
        month: 'short', year: '2-digit', timeZone: 'UTC',
      });
      buckets.set(key, { key, label, registrations: 0, jobs: 0, applications: 0, hires: 0 });
    }
    return buckets.get(key);
  };

  users.forEach((item) => { const date = analyticsDateFor('user', item, dateField); if (date) ensure(date).registrations += 1; });
  jobs.forEach((item) => { const date = analyticsDateFor('job', item, dateField); if (date) ensure(date).jobs += 1; });
  applications.forEach((item) => {
    const date = analyticsDateFor('application', item, dateField);
    if (date) ensure(date).applications += 1;
    if (analyticsLower(item.status) === 'hired') {
      const hireDate = dateField === 'outcome' ? date : (item.hiredAt || date);
      if (hireDate) ensure(hireDate).hires += 1;
    }
  });

  return Array.from(buckets.values()).sort((a, b) => a.key.localeCompare(b.key)).slice(-18);
};

exports.getAdminAnalytics = async (req, res) => {
  try {
    const filters = {
      date: analyticsText(req.query.date || 'overall'),
      specificDate: analyticsText(req.query.specificDate),
      startDate: analyticsText(req.query.startDate),
      endDate: analyticsText(req.query.endDate),
      campus: analyticsText(req.query.campus || 'all'),
      verificationStatus: analyticsLower(req.query.verificationStatus || 'all'),
      jobStatus: analyticsLower(req.query.jobStatus || 'all'),
      industry: analyticsText(req.query.industry || 'all'),
      jobType: analyticsText(req.query.jobType || 'all'),
      workMode: analyticsText(req.query.workMode || 'all'),
      applicationStatus: analyticsLower(req.query.applicationStatus || 'all'),
      requestEditStatus: analyticsLower(req.query.requestEditStatus || 'all'),
      yearGraduated: analyticsText(req.query.yearGraduated || 'all'),
      course: analyticsText(req.query.course || 'all'),
      availability: analyticsText(req.query.availability || 'all'),
      experience: analyticsText(req.query.experience || 'all'),
      gender: analyticsText(req.query.gender || 'all'),
      educationLevel: analyticsText(req.query.educationLevel || 'all'),
    };

    const range = getAdminAnalyticsDateRange({
      preset: filters.date,
      specificDate: filters.specificDate,
      startDate: filters.startDate,
      endDate: filters.endDate,
    });

    const [usersAll, jobsAll, applicationsAll, editRequestsAll, messagesAll, conversationPreferencesAll,
      notificationsAll, verificationRequestsAll, systemLogsAll] = await Promise.all([
      User.find({ status: { $ne: 'deleted' } })
        .select('role status isActive isVerified createdAt updatedAt jobSeekerProfile.campus jobSeekerProfile.course jobSeekerProfile.yearGraduated jobSeekerProfile.howSoonCanYouStart jobSeekerProfile.willingToRelocate jobSeekerProfile.gender jobSeekerProfile.educationalAttainment jobSeekerProfile.experience jobSeekerProfile.educationEntries.campus jobSeekerProfile.educationEntries.course jobSeekerProfile.educationEntries.yearGraduated jobSeekerProfile.educationEntries.educationalAttainment jobSeekerProfile.educationEntries.level jobSeekerProfile.verificationStatus jobSeekerProfile.verificationDocs.overallStatus employerProfile.companyName employerProfile.industry employerProfile.regionCity employerProfile.verificationDocs.overallStatus')
        .lean(),
      Job.find({}).select('employer companyName status statusBeforeArchive isActive isPublished isArchived category jobType workMode locationProvince locationCity vacancies views applicationCount applicationDeadline publishedAt filledAt closedAt archivedAt createdAt updatedAt').lean(),
      Application.find({}).select('job jobseeker employer status lastActiveStatus withdrawalCount withdrawnAt appliedAt reviewedAt viewedAt hiredAt employmentStatus employmentStatusRequest.reason employmentStatusRequest.status employmentStatusRequest.requestedAt interviewSchedule activityHistory createdAt updatedAt').lean(),
      JobEditRequest.find({}).select('job employer requestedSections status reviewedAt unlockUntil createdAt updatedAt').lean(),
      Message.find({}).select('conversationId sender receiver messageType isRead readAt job application createdAt updatedAt').lean(),
      ConversationPreference.find({}).select('user conversationId otherUser archived hiddenCompany deleted createdAt updatedAt').lean(),
      Notification.find({}).select('user type relatedModel isRead isArchived createdAt updatedAt').lean(),
      PendingEmailVerification.find({}).select('role otpRequestedAt otpExpiresAt verifiedAt consumedAt deleteAfterAt createdAt updatedAt').lean(),
      SystemLog.find({}).select('actorRole action module status method statusCode durationMs createdAt updatedAt').lean(),
    ]);

    const userById = new Map(usersAll.map((user) => [analyticsId(user._id), user]));
    const jobById = new Map(jobsAll.map((job) => [analyticsId(job._id), job]));
    const dateMatches = (type, item) => !range.start || analyticsInRange(analyticsDateFor(type, item, 'primary'), range);
    const same = (actual, selected) => analyticsIsAll(selected) || analyticsLower(actual) === analyticsLower(selected);

    const verificationDisplayStatus = (user) => {
      const status = analyticsVerificationStatus(user);
      if (status === 'submitted') return 'pending';
      if (status === 'rejected') return 'declined';
      if (status === 'hold') return 'on hold';
      return status;
    };

    const requestEditDisplayStatus = (status) => {
      const value = analyticsLower(status);
      if (value === 'rejected') return 'declined';
      return value;
    };

    const profileValues = (user, field) => {
      const profile = user?.jobSeekerProfile || {};
      const educationEntries = Array.isArray(profile.educationEntries) ? profile.educationEntries : [];
      const values = [];

      if (field === 'campus') {
        values.push(getJobseekerCampus(user));
        educationEntries.forEach((entry) => values.push(entry?.campus));
      } else if (field === 'yearGraduated') {
        values.push(profile.yearGraduated);
        educationEntries.forEach((entry) => values.push(entry?.yearGraduated));
      } else if (field === 'course') {
        values.push(profile.course);
        educationEntries.forEach((entry) => values.push(entry?.course));
      } else if (field === 'educationLevel') {
        values.push(profile.educationalAttainment);
        educationEntries.forEach((entry) => {
          values.push(entry?.educationalAttainment);
          values.push(entry?.level);
        });
      } else if (field === 'availability') {
        values.push(profile.howSoonCanYouStart);
      } else if (field === 'relocation') {
        values.push(profile.willingToRelocate);
      } else if (field === 'experience') {
        values.push(profile.experience);
      } else if (field === 'gender') {
        values.push(profile.gender);
      }

      return analyticsUnique(values);
    };

    const matchesAny = (values, selected) =>
      analyticsIsAll(selected) || values.some((value) => analyticsLower(value) === analyticsLower(selected));

    const personalFilterActive = [
      filters.campus,
      filters.yearGraduated,
      filters.course,
      filters.availability,
      filters.experience,
      filters.gender,
      filters.educationLevel,
    ].some((value) => !analyticsIsAll(value));

    const matchesJobseekerProfile = (user) => {
      if (!personalFilterActive) return true;
      if (analyticsLower(user?.role) !== 'jobseeker') return false;
      if (!matchesAny(profileValues(user, 'campus'), filters.campus)) return false;
      if (!matchesAny(profileValues(user, 'yearGraduated'), filters.yearGraduated)) return false;
      if (!matchesAny(profileValues(user, 'course'), filters.course)) return false;
      if (!matchesAny(profileValues(user, 'availability'), filters.availability)) return false;
      if (!matchesAny(profileValues(user, 'experience'), filters.experience)) return false;
      if (!matchesAny(profileValues(user, 'gender'), filters.gender)) return false;
      if (!matchesAny(profileValues(user, 'educationLevel'), filters.educationLevel)) return false;
      return true;
    };

    const users = usersAll.filter((user) => {
      if (!dateMatches('user', user)) return false;
      if (!analyticsIsAll(filters.verificationStatus) && verificationDisplayStatus(user) !== analyticsLower(filters.verificationStatus)) return false;
      if (!matchesJobseekerProfile(user)) return false;
      return true;
    });

    const jobAttributeMatches = (job) => {
      if (!same(analyticsJobLifecycleStatus(job), filters.jobStatus)) return false;
      const employerIndustry = userById.get(analyticsId(job.employer))?.employerProfile?.industry || job.category;
      if (!same(employerIndustry, filters.industry)) return false;
      if (!same(job.jobType, filters.jobType)) return false;
      if (!same(job.workMode, filters.workMode)) return false;
      return true;
    };

    const jobs = jobsAll.filter((job) => dateMatches('job', job) && jobAttributeMatches(job));
    const allowedJobIds = new Set(jobsAll.filter(jobAttributeMatches).map((job) => analyticsId(job._id)));

    const applications = applicationsAll.filter((application) => {
      if (!dateMatches('application', application)) return false;
      if (!same(application.status, filters.applicationStatus)) return false;
      const job = jobById.get(analyticsId(application.job));
      if ((!analyticsIsAll(filters.jobStatus) || !analyticsIsAll(filters.industry) || !analyticsIsAll(filters.jobType) || !analyticsIsAll(filters.workMode)) && !allowedJobIds.has(analyticsId(job?._id))) return false;
      const seeker = userById.get(analyticsId(application.jobseeker));
      if (!matchesJobseekerProfile(seeker)) return false;
      if (!analyticsIsAll(filters.verificationStatus) && verificationDisplayStatus(seeker) !== analyticsLower(filters.verificationStatus)) return false;
      return true;
    });

    const employmentStatusRequests = applicationsAll.filter((application) => {
      const request = application?.employmentStatusRequest || {};
      const requestStatus = analyticsLower(request.status);
      if (!requestStatus || requestStatus === 'none') return false;

      if (range.start) {
        const requestDate = request.requestedAt || application.updatedAt || application.createdAt;
        if (!analyticsInRange(requestDate, range)) return false;
      }

      const job = jobById.get(analyticsId(application.job));
      if (
        (!analyticsIsAll(filters.jobStatus) ||
          !analyticsIsAll(filters.industry) ||
          !analyticsIsAll(filters.jobType) ||
          !analyticsIsAll(filters.workMode)) &&
        !allowedJobIds.has(analyticsId(job?._id))
      ) {
        return false;
      }

      const seeker = userById.get(analyticsId(application.jobseeker));
      if (!matchesJobseekerProfile(seeker)) return false;
      if (
        !analyticsIsAll(filters.verificationStatus) &&
        verificationDisplayStatus(seeker) !== analyticsLower(filters.verificationStatus)
      ) {
        return false;
      }

      return true;
    });

    const employmentStatusRequestTypes = [
      {
        name: 'Contract Ended',
        value: employmentStatusRequests.filter(
          (item) => analyticsLower(item?.employmentStatusRequest?.reason) === 'contract_ended'
        ).length,
      },
      {
        name: 'Employment Ended',
        value: employmentStatusRequests.filter(
          (item) => analyticsLower(item?.employmentStatusRequest?.reason) === 'employment_ended'
        ).length,
      },
    ];

    const employmentStatusUpdates = [
      {
        name: 'Pending',
        value: employmentStatusRequests.filter((item) =>
          ['pending', 'reviewed'].includes(analyticsLower(item?.employmentStatusRequest?.status))
        ).length,
      },
      {
        name: 'Approved',
        value: employmentStatusRequests.filter(
          (item) => analyticsLower(item?.employmentStatusRequest?.status) === 'approved'
        ).length,
      },
      {
        name: 'Declined',
        value: employmentStatusRequests.filter(
          (item) => analyticsLower(item?.employmentStatusRequest?.status) === 'declined'
        ).length,
      },
      {
        name: 'No Response',
        value: employmentStatusRequests.filter(
          (item) => analyticsLower(item?.employmentStatusRequest?.status) === 'no_response'
        ).length,
      },
    ];

    const editRequests = editRequestsAll.filter((item) => {
      if (!dateMatches('editRequest', item)) return false;
      return analyticsIsAll(filters.requestEditStatus) || requestEditDisplayStatus(item.status) === analyticsLower(filters.requestEditStatus);
    });
    const messages = messagesAll.filter((item) => dateMatches('message', item));
    const notifications = notificationsAll.filter((item) => dateMatches('notification', item));
    const verificationRequests = verificationRequestsAll.filter((item) => dateMatches('verification', item));
    const systemLogs = systemLogsAll.filter((item) => dateMatches('log', item));
    const conversationPreferences = conversationPreferencesAll.filter((item) => dateMatches('conversationPreference', item));

    const hiredApplications = applications.filter((item) => analyticsLower(item.status) === 'hired');
    const pendingVerification = users.filter((item) => ['pending', 'submitted'].includes(analyticsVerificationStatus(item))).length;
    const totalJobseekers = users.filter((item) => analyticsLower(item.role) === 'jobseeker').length;
    const totalEmployers = users.filter((item) => analyticsLower(item.role) === 'employer').length;
    const totalRegisteredUsers = users.filter((item) => analyticsLower(item.role) !== 'admin').length;
    const pendingJobseekers = usersAll.filter((item) => analyticsLower(item.role) === 'jobseeker' && ['pending', 'submitted'].includes(analyticsVerificationStatus(item))).length;
    const pendingEmployers = usersAll.filter((item) => analyticsLower(item.role) === 'employer' && ['pending', 'submitted'].includes(analyticsVerificationStatus(item))).length;
    const pendingEditRequests = editRequestsAll.filter((item) => analyticsLower(item.status) === 'pending').length;
    const activeJobs = jobs.filter((item) => analyticsJobLifecycleStatus(item) === 'open').length;
    const failedLogs = systemLogs.filter((item) => analyticsLower(item.status) === 'failed').length;

    const applicationStatusesForChart = ['pending', 'for interview', 'hired', 'declined', 'withdrawn', 'cancelled', 'vacancy full'];
    const applicationStatusesForFilter = ['pending', 'for interview', 'hired', 'declined', 'withdrawn', 'vacancy full'];
    const applicationFunnel = applicationStatusesForChart.map((name) => ({
      name,
      value: applications.filter((item) => analyticsLower(item.status) === name).length,
    }));
    const verifiedRegistrations = verificationRequests.filter((item) => item.verifiedAt || item.consumedAt).length;

    const jobseekersAll = usersAll.filter((item) => analyticsLower(item.role) === 'jobseeker');
    const flattenProfileOptions = (field) => analyticsUnique(jobseekersAll.flatMap((user) => profileValues(user, field)));
    const yearsGraduated = flattenProfileOptions('yearGraduated').sort((a, b) => Number(b) - Number(a) || String(b).localeCompare(String(a)));

    const filteredJobseekers = users.filter((item) => analyticsLower(item.role) === 'jobseeker');
    const genderDistribution = analyticsCountRows(filteredJobseekers.flatMap((item) => profileValues(item, 'gender')), (item) => item);
    const availabilityDistribution = analyticsCountRows(filteredJobseekers.flatMap((item) => profileValues(item, 'availability')), (item) => item);
    const relocationDistribution = analyticsCountRows(filteredJobseekers.flatMap((item) => profileValues(item, 'relocation')), (item) => item);
    const experienceDistribution = analyticsCountRows(filteredJobseekers.flatMap((item) => profileValues(item, 'experience')), (item) => item);

    const normalizeEducationChartCategory = (value) => {
      const normalized = analyticsLower(value)
        .replace(/[’']/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();

      if (!normalized) return '';
      if (/\b(doctorate|doctoral|phd|doctor of)\b/.test(normalized)) return 'Doctorate';
      if (/\b(master|masters|masteral)\b/.test(normalized)) return 'Master';

      const excludedCollegeValues =
        /\b(undergraduate|undergrad|associate|high school|senior high|junior high)\b/.test(normalized);
      if (!excludedCollegeValues && (
        /\bbachelor\b/.test(normalized) ||
        (/\bcollege\b/.test(normalized) && /\b(degree|graduate|graduated)\b/.test(normalized))
      )) {
        return 'College';
      }

      return '';
    };

    const educationRank = { College: 1, Master: 2, Doctorate: 3 };
    const highestEducationCategory = (user) =>
      profileValues(user, 'educationLevel')
        .map(normalizeEducationChartCategory)
        .filter(Boolean)
        .sort((a, b) => educationRank[b] - educationRank[a])[0] || '';

    const educationDistribution = ['College', 'Master', 'Doctorate'].map((name) => ({
      name,
      value: filteredJobseekers.filter((item) => highestEducationCategory(item) === name).length,
    }));

    const industryRows = analyticsCountRows(
      jobs,
      (job) => userById.get(analyticsId(job.employer))?.employerProfile?.industry || job.category || 'Others',
      10,
    );

    const companyHireCounts = new Map();
    hiredApplications.forEach((application) => {
      const job = jobById.get(analyticsId(application.job));
      const employer = userById.get(analyticsId(application.employer || job?.employer));
      const companyName = analyticsText(job?.companyName || employer?.employerProfile?.companyName || 'Unknown Company');
      if (!companyName) return;
      companyHireCounts.set(companyName, (companyHireCounts.get(companyName) || 0) + 1);
    });
    const topHiringCompanies = [...companyHireCounts.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name))
      .slice(0, 5);

    const hiredDurationsDays = hiredApplications
      .map((item) => {
        const appliedAt = item.appliedAt ? new Date(item.appliedAt) : null;
        const hiredAt = item.hiredAt ? new Date(item.hiredAt) : null;
        if (!appliedAt || !hiredAt || Number.isNaN(appliedAt.getTime()) || Number.isNaN(hiredAt.getTime())) return null;
        const days = Math.max(0, Math.ceil((hiredAt.getTime() - appliedAt.getTime()) / (1000 * 60 * 60 * 24)));
        return days;
      })
      .filter((value) => Number.isFinite(value));

    const processDurationBuckets = [
      { name: '< 1 week', min: 0, max: 6 },
      { name: '1–2 weeks', min: 7, max: 13 },
      { name: '2–4 weeks', min: 14, max: 27 },
      { name: '1–2 months', min: 28, max: 59 },
      { name: '> 2 months', min: 60, max: Infinity },
    ].map((bucket) => ({
      name: bucket.name,
      value: hiredDurationsDays.filter((days) => days >= bucket.min && days <= bucket.max).length,
    }));

    const applicationProcessDuration = {
      averageDays: hiredDurationsDays.length
        ? Math.round(hiredDurationsDays.reduce((sum, days) => sum + days, 0) / hiredDurationsDays.length)
        : 0,
      shortestDays: hiredDurationsDays.length ? Math.min(...hiredDurationsDays) : 0,
      longestDays: hiredDurationsDays.length ? Math.max(...hiredDurationsDays) : 0,
      buckets: processDurationBuckets,
    };

    const withdrawnApplications = applications.filter((item) => analyticsLower(item.status) === 'withdrawn');
    const withdrawalByStage = [
      {
        name: 'Pending',
        value: withdrawnApplications.filter((item) => analyticsLower(item.lastActiveStatus) === 'pending').length,
      },
      {
        name: 'For Interview',
        value: withdrawnApplications.filter((item) => analyticsLower(item.lastActiveStatus) === 'for interview').length,
      },
    ];

    const applicationsByJobseeker = new Map();
    applications.forEach((item) => {
      const seekerId = analyticsId(item.jobseeker);
      if (!seekerId) return;
      if (!applicationsByJobseeker.has(seekerId)) applicationsByJobseeker.set(seekerId, []);
      applicationsByJobseeker.get(seekerId).push(item);
    });

    const applicationCountsBeforeHire = hiredApplications.map((hiredApplication) => {
      const seekerId = analyticsId(hiredApplication.jobseeker);
      const hiredAt = hiredApplication.hiredAt ? new Date(hiredApplication.hiredAt) : null;
      const seekerApplications = applicationsByJobseeker.get(seekerId) || [];
      if (!hiredAt || Number.isNaN(hiredAt.getTime())) return seekerApplications.length || 1;
      const count = seekerApplications.filter((item) => {
        const appliedAt = item.appliedAt ? new Date(item.appliedAt) : null;
        return appliedAt && !Number.isNaN(appliedAt.getTime()) && appliedAt <= hiredAt;
      }).length;
      return Math.max(1, count);
    });

    const applicationsBeforeHire = [
      { name: '1 time', value: applicationCountsBeforeHire.filter((count) => count === 1).length },
      { name: '2 times', value: applicationCountsBeforeHire.filter((count) => count === 2).length },
      { name: '3 times', value: applicationCountsBeforeHire.filter((count) => count === 3).length },
      { name: '4+ times', value: applicationCountsBeforeHire.filter((count) => count >= 4).length },
    ];

    const campusHireRate = DASHBOARD_CAMPUSES.map((campus) => {
      const campusApplications = applications.filter((item) => {
        const seeker = userById.get(analyticsId(item.jobseeker));
        return getJobseekerCampus(seeker) === campus;
      });
      const campusHired = campusApplications.filter((item) => analyticsLower(item.status) === 'hired').length;
      const total = campusApplications.length;
      return {
        name: campus,
        value: total ? Number(((campusHired / total) * 100).toFixed(1)) : 0,
        hired: campusHired,
        total,
      };
    });

    return res.status(200).json({
      success: true,
      generatedAt: new Date().toISOString(),
      timezone: 'Asia/Manila',
      appliedFilters: { ...filters, dateLabel: range.label },
      filters: {
        options: {
          campuses: DASHBOARD_CAMPUSES,
          verificationStatuses: ['pending', 'verified', 'declined', 'on hold'],
          jobStatuses: ['open', 'closed', 'filled', 'expired'],
          industries: analyticsUnique(jobsAll.map((item) => userById.get(analyticsId(item.employer))?.employerProfile?.industry || item.category)),
          jobTypes: analyticsUnique(jobsAll.map((item) => item.jobType)),
          workModes: analyticsUnique(jobsAll.map((item) => item.workMode)),
          applicationStatuses: applicationStatusesForFilter,
          requestEditStatuses: ['pending', 'approved', 'declined'],
          yearsGraduated,
          courses: flattenProfileOptions('course'),
          availabilities: flattenProfileOptions('availability'),
          experiences: flattenProfileOptions('experience'),
          genders: flattenProfileOptions('gender'),
          educationLevels: flattenProfileOptions('educationLevel'),
        },
      },
      kpis: {
        totalUsers: users.length,
        totalJobseekers,
        totalEmployers,
        totalRegisteredUsers,
        totalJobPosts: jobs.length,
        activeJobs,
        applications: applications.length,
        hired: hiredApplications.length,
        hireRate: applications.length ? Number(((hiredApplications.length / applications.length) * 100).toFixed(1)) : 0,
        pendingVerification,
        pendingJobseekers,
        pendingEmployers,
        pendingEditRequests,
        unreadMessages: messages.filter((item) => !item.isRead).length,
        systemFailures: failedLogs,
      },
      trends: analyticsTrendRows({ users, jobs, applications, dateField: 'primary' }),
      sections: {
        users: {
          roles: analyticsCountRows(users, (item) => item.role),
          statuses: analyticsCountRows(users, (item) => item.status),
          verification: [
            { name: 'verified', value: users.filter((item) => item.role !== 'admin' && analyticsVerificationStatus(item) === 'verified').length },
            { name: 'pending', value: users.filter((item) => item.role !== 'admin' && ['pending', 'submitted'].includes(analyticsVerificationStatus(item))).length },
            { name: 'on hold', value: users.filter((item) => item.role !== 'admin' && analyticsVerificationStatus(item) === 'hold').length },
            { name: 'declined', value: users.filter((item) => item.role !== 'admin' && analyticsVerificationStatus(item) === 'rejected').length },
          ],
          campuses: analyticsCountRows(users.filter((item) => item.role === 'jobseeker'), getJobseekerCampus),
          genders: genderDistribution,
          availabilities: availabilityDistribution,
          relocation: relocationDistribution,
          experiences: experienceDistribution,
          educationLevels: educationDistribution,
        },
        jobs: {
          statuses: ['open', 'closed', 'filled', 'expired'].map((name) => ({
            name,
            value: jobs.filter((item) => analyticsJobLifecycleStatus(item) === name).length,
          })),
          categories: analyticsCountRows(jobs, (item) => item.category, 10),
          industries: industryRows,
          employmentTypes: analyticsCountRows(jobs.filter((item) => analyticsText(item.jobType)), (item) => item.jobType),
          workModes: analyticsCountRows(jobs, (item) => item.workMode),
          totalVacancies: jobs.reduce((sum, item) => sum + Number(item.vacancies || 0), 0),
          totalViews: jobs.reduce((sum, item) => sum + Number(item.views || 0), 0),
        },
        applications: {
          funnel: applicationFunnel,
          interviewRate: applications.length ? Number(((applications.filter((item) => ['for interview', 'hired'].includes(analyticsLower(item.status))).length / applications.length) * 100).toFixed(1)) : 0,
          hireRate: applications.length ? Number(((hiredApplications.length / applications.length) * 100).toFixed(1)) : 0,
          employmentStatus: analyticsCountRows(hiredApplications, (item) => item.employmentStatus || 'not recorded'),
          topHiringCompanies,
          applicationProcessDuration,
          withdrawalByStage,
          applicationsBeforeHire,
          hireRateByCampus: campusHireRate,
        },
        verification: {
          emailRequests: verificationRequests.length,
          emailVerified: verifiedRegistrations,
          emailCompletionRate: verificationRequests.length ? Number(((verifiedRegistrations / verificationRequests.length) * 100).toFixed(1)) : 0,
          byRole: analyticsCountRows(verificationRequests, (item) => item.role),
        },
        operations: {
          editRequests: analyticsCountRows(editRequests, (item) => requestEditDisplayStatus(item.status)),
          editRequestSections: analyticsCountRows(editRequests.flatMap((item) => item.requestedSections || []), (item) => item, 10),
          employmentStatusRequestTypes,
          employmentStatusUpdates,
          messages: analyticsCountRows(messages, (item) => item.messageType),
          messageRead: [
            { name: 'Read', value: messages.filter((item) => item.isRead).length },
            { name: 'Unread', value: messages.filter((item) => !item.isRead).length },
          ],
          conversationPreferences: [
            { name: 'Archived', value: conversationPreferences.filter((item) => item.archived).length },
            { name: 'Hidden Company', value: conversationPreferences.filter((item) => item.hiddenCompany).length },
            { name: 'Deleted', value: conversationPreferences.filter((item) => item.deleted).length },
          ],
          notifications: analyticsCountRows(notifications, (item) => item.type, 12),
          notificationRead: [
            { name: 'Read', value: notifications.filter((item) => item.isRead).length },
            { name: 'Unread', value: notifications.filter((item) => !item.isRead).length },
            { name: 'Archived', value: notifications.filter((item) => item.isArchived).length },
          ],
          system: {
            statuses: analyticsCountRows(systemLogs, (item) => item.status),
            modules: analyticsCountRows(systemLogs, (item) => item.module, 10),
            methods: analyticsCountRows(systemLogs, (item) => item.method || 'N/A'),
            p95DurationMs: analyticsPercentile(systemLogs.map((item) => item.durationMs), 95),
            serverErrors: systemLogs.filter((item) => Number(item.statusCode) >= 500).length,
          },
        },
      },
    });
  } catch (error) {
    console.error('Admin analytics error:', error);
    return res.status(500).json({ success: false, message: 'Unable to load analytics data.' });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const rawLimit = String(req.query.limit || '10').trim().toLowerCase();
    const isAll = rawLimit === 'all';
    const limit = isAll
      ? null
      : Math.min(Math.max(parseInt(rawLimit, 10) || 10, 1), 100);

    const status = String(req.query.status || '').trim().toLowerCase();
    const role = String(req.query.role || '').trim().toLowerCase();
    const search = String(req.query.search || '').trim();
    const sort = String(req.query.sort || 'newest').trim().toLowerCase();
    const verificationStatus = String(req.query.verificationStatus || '').trim().toLowerCase();
    const campus = String(req.query.campus || '').trim();
    const course = String(req.query.course || '').trim();
    const company = String(req.query.company || '').trim();
    const industry = String(req.query.industry || '').trim();
    const verifiedParam = req.query.verified;
    const dateFrom = String(req.query.dateFrom || '').trim();
    const dateTo = String(req.query.dateTo || '').trim();
    const includeMeta = String(req.query.includeMeta || 'true').toLowerCase() !== 'false';

    const verifiedUserCondition = {
      $or: [
        {
          role: 'employer',
          'employerProfile.verificationDocs.overallStatus': 'verified',
        },
        {
          role: 'jobseeker',
          $or: [
            { 'jobSeekerProfile.verificationDocs.overallStatus': 'verified' },
            { 'jobSeekerProfile.verificationStatus': 'verified' },
            { isVerified: true },
          ],
        },
      ],
    };

    const baseQuery = {
      status: { $ne: 'deleted' },
      // System-archived inactive employers belong in Admin Archive, not User Management.
      $nor: [{ role: 'employer', inactiveBySystem: true }],
    };
    const andConditions = [verifiedUserCondition];

    if (role && role !== 'all') {
      baseQuery.role = role;
    }

    if (status && status !== 'all') {
      baseQuery.status = status;
    }

    if (campus && campus.toLowerCase() !== 'all') {
      const normalizedCampus = normalizeDashboardCampus(campus);
      const campusRegex = new RegExp(`^${escapeRegex(normalizedCampus)}$`, 'i');

      andConditions.push({
        $or: [
          { 'jobSeekerProfile.campus': campusRegex },
          { 'jobSeekerProfile.educationEntries.campus': campusRegex },
        ],
      });
    }

    if (course && course.toLowerCase() !== 'all') {
      baseQuery['jobSeekerProfile.course'] = course;
    }

    if (company && company.toLowerCase() !== 'all') {
      baseQuery['employerProfile.companyName'] = company;
    }

    if (industry && industry.toLowerCase() !== 'all') {
      baseQuery['employerProfile.industry'] = industry;
    }

    if (typeof verifiedParam !== 'undefined') {
      baseQuery.isVerified = String(verifiedParam) === 'true';
    }

    if (dateFrom || dateTo) {
      baseQuery.createdAt = {};

      if (dateFrom) {
        const start = new Date(`${dateFrom}T00:00:00`);
        if (!Number.isNaN(start.getTime())) baseQuery.createdAt.$gte = start;
      }

      if (dateTo) {
        const end = new Date(`${dateTo}T23:59:59.999`);
        if (!Number.isNaN(end.getTime())) baseQuery.createdAt.$lte = end;
      }

      if (!Object.keys(baseQuery.createdAt).length) {
        delete baseQuery.createdAt;
      }
    }

    if (verificationStatus && verificationStatus !== 'all') {
      if (verificationStatus === 'verified') {
        andConditions.push({
          $or: [
            { role: 'employer', 'employerProfile.verificationDocs.overallStatus': 'verified' },
            { role: 'jobseeker', 'jobSeekerProfile.verificationDocs.overallStatus': 'verified' },
            { role: { $nin: ['employer', 'jobseeker'] }, isVerified: true }
          ]
        });
      } else if (verificationStatus === 'hold' || verificationStatus === 'onhold') {
        andConditions.push({
          $or: [
            { role: 'employer', 'employerProfile.verificationDocs.overallStatus': 'hold' },
            { role: 'jobseeker', 'jobSeekerProfile.verificationDocs.overallStatus': 'hold' }
          ]
        });
      } else if (verificationStatus === 'unverified') {
        andConditions.push({
          $or: [
            { role: 'employer', 'employerProfile.verificationDocs.overallStatus': { $nin: ['verified', 'hold'] } },
            { role: 'employer', 'employerProfile.verificationDocs.overallStatus': { $exists: false } },
            { role: 'jobseeker', 'jobSeekerProfile.verificationDocs.overallStatus': { $nin: ['verified', 'hold'] } },
            { role: 'jobseeker', 'jobSeekerProfile.verificationDocs.overallStatus': { $exists: false } },
            { role: { $nin: ['employer', 'jobseeker'] }, isVerified: { $ne: true } }
          ]
        });
      }
    }

    if (search) {
      const searchRegex = new RegExp(escapeRegex(search), 'i');
      andConditions.push({
        $or: [
          { firstName: searchRegex },
          { middleName: searchRegex },
          { lastName: searchRegex },
          { email: searchRegex },
          { username: searchRegex },
          { 'jobSeekerProfile.studentId': searchRegex },
          { 'jobSeekerProfile.address': searchRegex },
          { 'jobSeekerProfile.cityProvince': searchRegex },
          { 'jobSeekerProfile.region': searchRegex },
          { 'employerProfile.companyName': searchRegex },
          { 'employerProfile.regionCity': searchRegex }
        ]
      });
    }

    if (andConditions.length) {
      baseQuery.$and = andConditions;
    }

    const sortOption = {};
    if (sort === 'oldest') sortOption.createdAt = 1;
    else if (sort === 'name_asc') {
      sortOption.firstName = 1;
      sortOption.lastName = 1;
    } else if (sort === 'name_desc') {
      sortOption.firstName = -1;
      sortOption.lastName = -1;
    } else {
      sortOption.createdAt = -1;
    }

    const metadataQuery = {
      status: { $ne: 'deleted' },
      $nor: [{ role: 'employer', inactiveBySystem: true }],
      $and: [verifiedUserCondition],
    };

    const metadataPromise = includeMeta
      ? User.find(metadataQuery)
          .select([
            'role',
            'employerProfile.companyName',
            'employerProfile.industry',
            'employerProfile.verificationDocs.overallStatus',
            'jobSeekerProfile.campus',
            'jobSeekerProfile.course',
            'jobSeekerProfile.educationEntries.campus',
            'jobSeekerProfile.educationEntries.course',
            'jobSeekerProfile.verificationDocs.overallStatus',
          ].join(' '))
          .lean()
      : Promise.resolve(null);

    const totalItemsPromise = User.countDocuments(baseQuery);

    let usersQuery = User.find(baseQuery)
      .select('-password')
      .sort(sortOption)
      .lean();

    const requestedSkip = isAll ? 0 : (page - 1) * limit;
    if (!isAll) {
      usersQuery = usersQuery.skip(requestedSkip).limit(limit);
    }

    let [allUsersForStats, totalItems, users] = await Promise.all([
      metadataPromise,
      totalItemsPromise,
      usersQuery,
    ]);

    const totalPages = isAll ? 1 : Math.max(Math.ceil(totalItems / limit), 1);
    const safePage = isAll ? 1 : Math.min(page, totalPages);

    // If the requested page became out of range after a delete/filter change,
    // fetch the last valid page once instead of returning an empty table.
    if (!isAll && safePage !== page) {
      users = await User.find(baseQuery)
        .select('-password')
        .sort(sortOption)
        .skip((safePage - 1) * limit)
        .limit(limit)
        .lean();
    }

    let stats;
    let userFilterOptions;

    if (includeMeta && Array.isArray(allUsersForStats)) {
      stats = allUsersForStats.reduce(
        (acc, user) => {
          const userRole = String(user.role || '').toLowerCase();

          acc.total += 1;
          if (userRole === 'jobseeker') acc.jobseekers += 1;
          if (userRole === 'employer') acc.employers += 1;

          const employerVerificationStatus = String(user?.employerProfile?.verificationDocs?.overallStatus || '').toLowerCase();
          const jobseekerVerificationStatus = String(user?.jobSeekerProfile?.verificationDocs?.overallStatus || '').toLowerCase();

          const verificationStatus =
            userRole === 'employer'
              ? employerVerificationStatus
              : userRole === 'jobseeker'
              ? jobseekerVerificationStatus
              : '';

          if (verificationStatus === 'pending') acc.pending += 1;
          else if (verificationStatus === 'verified') acc.verified += 1;
          else if (verificationStatus === 'rejected') acc.rejected += 1;

          return acc;
        },
        {
          total: 0,
          jobseekers: 0,
          employers: 0,
          pending: 0,
          verified: 0,
          rejected: 0
        }
      );

      const uniqueSortedUserOptions = (values = [], normalizer = (value) => String(value || '').trim()) => {
        const optionMap = new Map();
        values.forEach((value) => {
          const normalizedValue = normalizer(value);
          if (!normalizedValue) return;
          const key = normalizedValue.toLocaleLowerCase();
          if (!optionMap.has(key)) optionMap.set(key, normalizedValue);
        });
        return [...optionMap.values()].sort((a, b) => a.localeCompare(b));
      };

      userFilterOptions = {
        campuses: uniqueSortedUserOptions(
          allUsersForStats
            .filter((user) => String(user.role || '').toLowerCase() === 'jobseeker')
            .map((user) =>
              user?.jobSeekerProfile?.campus ||
              user?.jobSeekerProfile?.educationEntries?.find((entry) => entry?.campus)?.campus ||
              ''
            ),
          normalizeDashboardCampus
        ),
        courses: uniqueSortedUserOptions(
          allUsersForStats
            .filter((user) => String(user.role || '').toLowerCase() === 'jobseeker')
            .map((user) =>
              user?.jobSeekerProfile?.course ||
              user?.jobSeekerProfile?.educationEntries?.find((entry) => entry?.course)?.course ||
              ''
            )
        ),
        companies: uniqueSortedUserOptions(
          allUsersForStats
            .filter((user) => String(user.role || '').toLowerCase() === 'employer')
            .map((user) => user?.employerProfile?.companyName || '')
        ),
        industries: uniqueSortedUserOptions(
          allUsersForStats
            .filter((user) => String(user.role || '').toLowerCase() === 'employer')
            .map((user) => user?.employerProfile?.industry || '')
        ),
      };
    }

    const normalizedUsers = users.map((user) => {
      const userObject = user;
      const userRole = String(userObject.role || '').toLowerCase();
      const employerVerificationStatus = String(userObject?.employerProfile?.verificationDocs?.overallStatus || '').toLowerCase();
      const jobseekerVerificationStatus = String(userObject?.jobSeekerProfile?.verificationDocs?.overallStatus || '').toLowerCase();

      const rawVerificationStatus =
        userRole === 'employer'
          ? employerVerificationStatus
          : userRole === 'jobseeker'
          ? jobseekerVerificationStatus
          : '';

      const normalizedVerificationStatus =
        userRole === 'employer' || userRole === 'jobseeker'
          ? rawVerificationStatus === 'verified' || rawVerificationStatus === 'approved'
            ? 'verified'
            : rawVerificationStatus === 'hold' || rawVerificationStatus === 'onhold'
            ? 'hold'
            : 'unverified'
          : userObject.isVerified === true
          ? 'verified'
          : 'unverified';

      return {
        ...userObject,
        verificationStatus: normalizedVerificationStatus,
      };
    });

    res.status(200).json({
      success: true,
      users: normalizedUsers,
      ...(includeMeta ? { stats, options: userFilterOptions } : {}),
      total: totalItems,
      pagination: {
        page: safePage,
        limit: isAll ? 'all' : limit,
        totalItems,
        totalPages,
        hasPrevPage: safePage > 1,
        hasNextPage: safePage < totalPages
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Get single user
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const applications =
      user.role === 'jobseeker'
        ? await Application.find({ jobseeker: user._id })
            .populate('job', 'title jobTitle companyName companyLogo location address workMode jobType industry category salaryMin salaryMax hideSalary employmentType createdAt')
            .populate('employer', 'firstName lastName email employerProfile.companyName employerProfile.regionCity employerProfile.industry employerProfile.companyLogo')
            .sort({ appliedAt: -1, createdAt: -1 })
            .lean()
        : [];

    const activityLogs = user.role === 'jobseeker'
      ? await SystemLog.find({ actor: user._id, status: { $ne: 'failed' } })
          .select('action actionLabel module targetName description metadata createdAt')
          .sort({ createdAt: -1 })
          .limit(500)
          .lean()
      : [];

    const userData = user.toObject();

    let latestEditRequestAt = null;
    if (user.role === 'employer') {
      const latestEditRequest = await JobEditRequest.findOne({ employer: user._id })
        .select('createdAt')
        .sort({ createdAt: -1 })
        .lean();
      latestEditRequestAt = latestEditRequest?.createdAt || null;

      const reviews = Array.isArray(userData?.employerProfile?.reviews)
        ? userData.employerProfile.reviews
        : [];
      const reviewerIds = [...new Set(
        reviews
          .map((review) => String(review?.reviewer || '').trim())
          .filter(Boolean)
      )];

      if (reviewerIds.length) {
        const reviewers = await User.find({ _id: { $in: reviewerIds } })
          .select('_id profileImage')
          .lean();
        const reviewerImageMap = new Map(
          reviewers.map((reviewer) => [
            String(reviewer._id),
            String(reviewer.profileImage || '').trim(),
          ])
        );

        const reviewsWithoutImage = reviews.filter(
          (review) =>
            !reviewerImageMap.get(String(review?.reviewer || '')) &&
            review?.application
        );

        if (reviewsWithoutImage.length) {
          const applicationIds = reviewsWithoutImage.map((review) => review.application);
          const reviewApplications = await Application.find({ _id: { $in: applicationIds } })
            .select('_id jobseeker resumeSnapshot.user.profileImage')
            .lean();
          const applicationMap = new Map(
            reviewApplications.map((application) => [String(application._id), application])
          );

          reviewsWithoutImage.forEach((review) => {
            const application = applicationMap.get(String(review.application));
            const reviewerId = String(review?.reviewer || application?.jobseeker || '');
            const snapshotImage = String(
              application?.resumeSnapshot?.user?.profileImage || ''
            ).trim();
            if (reviewerId && snapshotImage && !reviewerImageMap.get(reviewerId)) {
              reviewerImageMap.set(reviewerId, snapshotImage);
            }
          });
        }

        userData.employerProfile.reviews = reviews.map((review) => ({
          ...review,
          reviewerProfileImage:
            reviewerImageMap.get(String(review?.reviewer || '')) || '',
        }));
      }
    }

    const applicationCount = applications.length;
    const jobPosts =
      user.role === 'employer'
        ? await Job.find({ employer: user._id })
            .select(
              'title jobTitle jobType workMode experienceLevel openToFreshGraduates salaryMin salaryMax hideSalary location companyName companyLogo isUrgent vacancies createdAt validUntil deadline applicationDeadline status isActive isPublished isArchived'
            )
            .sort({ createdAt: -1 })
            .lean()
        : [];

    let jobPostsWithCounts = jobPosts;
    if (user.role === 'employer' && jobPosts.length) {
      const jobIds = jobPosts.map((job) => job._id);
      const applicantCounts = await Application.aggregate([
        { $match: { job: { $in: jobIds } } },
        { $group: { _id: '$job', count: { $sum: 1 } } }
      ]);

      const countMap = applicantCounts.reduce((acc, item) => {
        acc[String(item._id)] = item.count;
        return acc;
      }, {});

      jobPostsWithCounts = jobPosts.map((job) => ({
        ...job,
        applicantCount: countMap[String(job._id)] || 0,
      }));
    }

    const jobPostCount = jobPostsWithCounts.length;

    res.status(200).json({
      success: true,
      user: {
        ...userData,
        applicationCount,
        jobPostCount,
        latestEditRequestAt,
        activityLogs,
      },
      applications,
      jobPosts: jobPostsWithCounts,
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Update user status
exports.updateUserStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['active', 'inactive', 'suspended', 'pending', 'deleted'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (status === 'active') {
      user.isActive = true;
      user.lastLogin = Date.now();
      user.inactiveBySystem = false;
      user.inactiveAt = null;
      user.inactiveReason = '';
      user.inactiveThresholdMonths = null;
      await user.save();
    } else if (status === 'inactive') {
      user.isActive = false;
      await user.save();
    }

    res.status(200).json({
      success: true,
      message: `User status updated to ${status}`,
      user
    });
  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Quick actions
exports.quickAction = async (req, res) => {
  try {
    const { action } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    switch (action) {
      case 'verify':
        user.isVerified = true;
        break;
      case 'unverify':
        user.isVerified = false;
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid action'
        });
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: `User ${action}ed successfully`,
      user: {
        _id: user._id,
        isVerified: user.isVerified
      }
    });
  } catch (error) {
    console.error('Error performing quick action:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Delete user (soft delete)
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.status = 'deleted';
    user.isActive = false;
    user.isVerified = false;
    user.deletedAt = new Date();
    user.passwordReset = {
      tokenHash: '',
      otpHash: '',
      expiresAt: null,
      requestedAt: null,
      usedAt: null,
    };

    await user.save();

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Bulk actions
exports.bulkUpdateStatus = async (req, res) => {
  try {
    const { userIds, status } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user IDs'
      });
    }

    const validStatuses = ['active', 'inactive', 'suspended'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const result = await User.updateMany(
      { _id: { $in: userIds } },
      { $set: { status } }
    );

    res.status(200).json({
      success: true,
      message: `Updated ${result.modifiedCount} user(s) to ${status}`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Error in bulk update:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// ==========================
// ✅ EMPLOYER VERIFICATION
// ==========================

const hasRequiredEmployerDocs = (emp) => {
  const docs = emp?.employerProfile?.verificationDocs || {};

  const hasBusinessReg =
    docs?.secRegistration?.url ||
    docs?.birRegistration?.url ||
    docs?.dtiRegistration?.url;

  const hasCityPermit = docs?.cityPermit?.url;

  return !!(hasBusinessReg && hasCityPermit);
};

const getVerificationStatus = (docs) => {
  const hasBusinessReg =
    docs?.secRegistration?.url ||
    docs?.birRegistration?.url ||
    docs?.dtiRegistration?.url;
  const hasCityPermit = docs?.cityPermit?.url;

  if (!hasBusinessReg && !hasCityPermit) return { status: 'none', message: 'No documents submitted' };
  if (hasBusinessReg && !hasCityPermit) return { status: 'partial', message: 'Missing City Permit' };
  if (!hasBusinessReg && hasCityPermit) return { status: 'partial', message: 'Missing Business Registration' };
  return { status: 'complete', message: 'Documents complete' };
};

const EMPLOYER_STATUS_LABELS = {
  unverified: 'Unverified',
  pending: 'Pending',
  hold: 'On Hold',
  verified: 'Verified',
  rejected: 'Rejected',
};

const normalizeEmployerForList = (user) => {
  const profile = user.employerProfile || {};
  const overallStatus = profile?.verificationDocs?.overallStatus || 'unverified';
  const docs = profile?.verificationDocs || {};
  const docStatus = getVerificationStatus(docs);

  return {
    _id: user._id,
    username: user.username || '',
    email: user.email || '',
    createdAt: user.createdAt,
    fullName: `${user.firstName || ''} ${user.middleName || ''} ${user.lastName || ''}`.replace(/\s+/g, ' ').trim(),
    employerProfile: profile,

    companyName: profile.companyName || '',
    businessEmail: profile.businessEmail || user.email || '',
    industry: profile.industry || '',
    address: profile.regionCity || '',
    companyLogo: profile.companyLogo || '',
    regionCity: profile.regionCity || '',

    overallStatus,
    rejectedAt: docs?.rejectedAt || null,
    docsComplete: docStatus.status === 'complete',
    docStatus: docStatus.message,
    docSummary: {
      secRegistration: !!docs?.secRegistration?.url,
      birRegistration: !!docs?.birRegistration?.url,
      dtiRegistration: !!docs?.dtiRegistration?.url,
      cityPermit: !!docs?.cityPermit?.url
    }
  };
};

// GET list of employers for verification
exports.getEmployersForVerification = async (req, res) => {
  try {
    const search = String(req.query.search || '').trim();
    const status = String(req.query.status || '').trim().toLowerCase();
    const company = String(req.query.company || '').trim();
    const industry = String(req.query.industry || '').trim();
    const address = String(req.query.address || '').trim();
    const sort = String(req.query.sort || 'newest').trim().toLowerCase();

    const rawLimit = String(req.query.limit || '10').trim().toLowerCase();
    const showAll = rawLimit === 'all';
    const page = showAll ? 1 : Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = showAll ? null : Math.min(Math.max(parseInt(rawLimit, 10) || 10, 1), 100);
    const includeMeta = String(req.query.includeMeta || 'true').toLowerCase() !== 'false';

    const dateFrom = String(req.query.dateFrom || '').trim();
    const dateTo = String(req.query.dateTo || '').trim();

    const baseQuery = {
      role: 'employer',
      status: { $ne: 'deleted' }
    };

    const employers = await User.find(baseQuery).select('-password');
    const normalizedAll = employers.map(normalizeEmployerForList);

    // Employer Verification must only contain accounts that still need an
    // admin verification decision. Approved and declined accounts do not
    // belong in this page or in its Company/Industry filter options.
    const verificationQueue = normalizedAll.filter((item) => {
      const currentStatus = String(item.overallStatus || 'unverified').toLowerCase();
      if (status === 'rejected' || status === 'declined') return currentStatus === 'rejected';
      if (search) return true;
      return !['verified', 'approved', 'rejected', 'declined'].includes(currentStatus);
    });

    const stats = normalizedAll.reduce(
      (acc, item) => {
        const currentStatus = String(item.overallStatus || 'unverified').toLowerCase();
        acc.total += 1;
        if (currentStatus === 'pending') acc.pending += 1;
        else if (currentStatus === 'hold') acc.hold += 1;
        else if (currentStatus === 'verified') acc.verified += 1;
        else if (currentStatus === 'rejected') acc.rejected += 1;
        else acc.unverified += 1;
        return acc;
      },
      {
        total: 0,
        pending: 0,
        hold: 0,
        verified: 0,
        rejected: 0,
        unverified: 0,
      }
    );

    const companies = [
      ...new Set(
        verificationQueue
          .map((item) => String(item.companyName || '').trim())
          .filter(Boolean)
      ),
    ].sort((a, b) => a.localeCompare(b));

    const industries = [
      ...new Set(
        verificationQueue
          .map((item) => String(item.industry || '').trim())
          .filter(Boolean)
      ),
    ].sort((a, b) => a.localeCompare(b));

    const addresses = [
      ...new Set(
        verificationQueue
          .map((item) => String(item.address || '').trim())
          .filter(Boolean)
      ),
    ].sort((a, b) => a.localeCompare(b));

    let filtered = verificationQueue;

    if (search) {
      const searchRegex = new RegExp(escapeRegex(search), 'i');
      filtered = filtered.filter((item) => {
        return (
          searchRegex.test(item.companyName || '') ||
          searchRegex.test(item.businessEmail || '') ||
          searchRegex.test(item.email || '') ||
          searchRegex.test(item.username || '') ||
          searchRegex.test(item.address || '')
        );
      });
    }

    if (status && status !== 'all') {
      filtered = filtered.filter((item) => String(item.overallStatus || '').toLowerCase() === status);
    }

    if (company && company.toLowerCase() !== 'all') {
      filtered = filtered.filter(
        (item) =>
          String(item.companyName || '').trim().toLowerCase() ===
          company.toLowerCase()
      );
    }

    if (industry && industry !== 'all') {
      filtered = filtered.filter((item) => String(item.industry || '').toLowerCase() === industry.toLowerCase());
    }

    if (address && address !== 'all') {
      filtered = filtered.filter((item) => String(item.address || '').toLowerCase() === address.toLowerCase());
    }

    if (dateFrom || dateTo) {
      filtered = filtered.filter((item) => {
        const createdAt = new Date(item.createdAt);
        if (Number.isNaN(createdAt.getTime())) return false;

        let matches = true;

        if (dateFrom) {
          const start = new Date(dateFrom);
          start.setHours(0, 0, 0, 0);
          matches = matches && createdAt >= start;
        }

        if (dateTo) {
          const end = new Date(dateTo);
          end.setHours(23, 59, 59, 999);
          matches = matches && createdAt <= end;
        }

        return matches;
      });
    }

    filtered = filtered.sort((a, b) => {
      const aDate = new Date(a.createdAt).getTime();
      const bDate = new Date(b.createdAt).getTime();

      if (sort === 'oldest') return aDate - bDate;
      return bDate - aDate;
    });

    const totalItems = filtered.length;
    const totalPages = showAll ? 1 : Math.max(Math.ceil(totalItems / limit), 1);
    const safePage = showAll ? 1 : Math.min(page, totalPages);
    const skip = showAll ? 0 : (safePage - 1) * limit;
    const paginated = showAll ? filtered : filtered.slice(skip, skip + limit);

    res.status(200).json({
      success: true,
      employers: paginated,
      ...(includeMeta ? {
        stats,
        filters: {
          companies,
          industries,
          addresses,
          statuses: [
            { value: 'unverified', label: EMPLOYER_STATUS_LABELS.unverified },
            { value: 'pending', label: EMPLOYER_STATUS_LABELS.pending },
            { value: 'hold', label: EMPLOYER_STATUS_LABELS.hold },
            { value: 'verified', label: EMPLOYER_STATUS_LABELS.verified },
            { value: 'rejected', label: EMPLOYER_STATUS_LABELS.rejected },
          ],
        },
      } : {}),
      pagination: {
        page: safePage,
        limit: showAll ? 'all' : limit,
        totalItems,
        totalPages,
        hasPrevPage: safePage > 1,
        hasNextPage: safePage < totalPages,
      },
      count: paginated.length
    });
  } catch (error) {
    console.error('Error fetching employers for verification:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// GET employer verification details by id
exports.getEmployerVerificationById = async (req, res) => {
  try {
    const employer = await User.findById(req.params.id).select('-password');

    if (!employer || employer.role !== 'employer') {
      return res.status(404).json({
        success: false,
        message: 'Employer not found'
      });
    }

    const docs = employer?.employerProfile?.verificationDocs || {};
    const docStatus = getVerificationStatus(docs);

    res.status(200).json({
      success: true,
      employer: {
        ...employer.toObject(),
        registrationId: `EM-${new Date(employer.createdAt || Date.now()).getFullYear()}-${String(employer._id).slice(-6).toUpperCase()}`,
        docsComplete: docStatus.status === 'complete',
        docStatus: docStatus.message,
        documentDetails: {
          secRegistration: docs?.secRegistration || {},
          birRegistration: docs?.birRegistration || {},
          dtiRegistration: docs?.dtiRegistration || {},
          cityPermit: docs?.cityPermit || {},
          businessPermit: docs?.businessPermit || {},
        },
        verificationSummary: {
          overallStatus: docs?.overallStatus || 'unverified',
          remarks: docs?.remarks || '',
          rejectionReasons: docs?.rejectionReasons || [],
          rejectionMessage: docs?.rejectionMessage || '',
          rejectedAt: docs?.rejectedAt || null,
          resubmitRequest: docs?.resubmitRequest || {},
        }
      }
    });
  } catch (error) {
    console.error('Error fetching employer verification details:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// UPDATE employer verification status
exports.updateEmployerVerificationStatus = async (req, res) => {
  try {
    const { overallStatus, remarks, rejectionReasons, rejectionMessage, adminPassword } = req.body;

    if (String(rejectionMessage || '').trim().length > 500) {
      return res.status(400).json({ success: false, message: 'Message must not exceed 500 characters.' });
    }

    if (overallStatus === 'verified' && !(await isValidAdminPassword(req, adminPassword))) {
      return res.status(401).json({ success: false, message: 'Incorrect password.' });
    }

    const valid = ['unverified', 'pending', 'hold', 'verified', 'rejected'];
    if (!valid.includes(overallStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid overallStatus'
      });
    }

    const employer = await User.findById(req.params.id);
    if (!employer || employer.role !== 'employer') {
      return res.status(404).json({
        success: false,
        message: 'Employer not found'
      });
    }

    if (overallStatus === 'verified') {
      const docs = employer?.employerProfile?.verificationDocs || {};

      if (!areAllEmployerCredentialsApproved(docs)) {
        return res.status(400).json({
          success: false,
          message: 'Cannot approve employer until all required company credentials are submitted and approved.'
        });
      }
    }

    if (overallStatus === 'rejected') {
      const allowedEmployerDeclineReasons = [
        'Not a PHINMA AU partner company',
        'Organization could not be verified as a legitimate company',
        'Other',
      ];
      const selectedReason = Array.isArray(rejectionReasons) ? String(rejectionReasons[0] || '').trim() : '';
      if (!allowedEmployerDeclineReasons.includes(selectedReason) || !String(rejectionMessage || '').trim()) {
        return res.status(400).json({
          success: false,
          message: 'A valid decline reason and message are required.'
        });
      }
    }

    if (!employer.employerProfile) employer.employerProfile = {};
    if (!employer.employerProfile.verificationDocs) employer.employerProfile.verificationDocs = {};

    const prevStatus = employer.employerProfile.verificationDocs.overallStatus || 'unverified';

    employer.employerProfile.verificationDocs.overallStatus = overallStatus;
    employer.employerProfile.verificationDocs.remarks = remarks || '';

    if (overallStatus === 'verified') {
      employer.employerProfile.verificationDocs.rejectionReasons = [];
      employer.employerProfile.verificationDocs.rejectionMessage = '';
      employer.employerProfile.verificationDocs.rejectedAt = null;
    } else if (overallStatus === 'rejected') {
      employer.employerProfile.verificationDocs.rejectionReasons = rejectionReasons
        .map((item) => String(item || '').trim())
        .filter(Boolean);
      employer.employerProfile.verificationDocs.rejectionMessage = String(rejectionMessage || '').trim();
      employer.employerProfile.verificationDocs.rejectedAt = new Date();
    } else {
      employer.employerProfile.verificationDocs.rejectionReasons = [];
      employer.employerProfile.verificationDocs.rejectionMessage = '';
      employer.employerProfile.verificationDocs.rejectedAt = null;
    }

    if (overallStatus === 'verified' && prevStatus !== 'verified') {
      const newUsername = employer.username || await generateUniqueUsername({
          role: 'employer',
          companyName: employer?.employerProfile?.companyName || employer?.firstName || 'employer',
          firstName: employer.firstName,
          lastName: employer.lastName,
        });

      employer.username = newUsername;
      employer.status = 'active';

      const temporaryPassword = generateTempPassword();
      employer.password = await bcrypt.hash(temporaryPassword, 12);
      employer.mustChangePassword = true;

      await employer.save();

      sendCredentialsEmail({
        to: employer.email,
        fullName: employer.fullName || employer.email,
        username: newUsername,
        temporaryPassword,
        role: 'Employer',
      }).catch((emailError) => {
        console.error('Failed to send employer credentials email:', emailError);
      });

      return res.status(200).json({
        success: true,
        message: `Employer approved. Approval email sent to ${employer.email}`,
        employer: {
          _id: employer._id,
          username: employer.username,
          overallStatus: employer.employerProfile.verificationDocs.overallStatus,
          remarks: employer.employerProfile.verificationDocs.remarks || '',
          rejectionReasons: employer.employerProfile.verificationDocs.rejectionReasons || [],
          rejectionMessage: employer.employerProfile.verificationDocs.rejectionMessage || '',
          rejectedAt: employer.employerProfile.verificationDocs.rejectedAt || null,
          mustChangePassword: employer.mustChangePassword,
        }
      });
    }

    await employer.save();

    if (overallStatus === 'rejected') {
      sendVerificationRejectedEmail({
        to: employer.email,
        fullName: employer.employerProfile?.companyName || employer.fullName || employer.email,
        reasons: employer.employerProfile.verificationDocs.rejectionReasons || [],
        message: employer.employerProfile.verificationDocs.rejectionMessage || '',
      }).catch((emailError) => {
        console.error('Failed to send employer rejection email:', emailError);
      });
    }

    res.status(200).json({
      success: true,
      message: `Employer verification status updated to ${overallStatus}`,
      employer: {
        _id: employer._id,
        username: employer.username,
        overallStatus: employer.employerProfile.verificationDocs.overallStatus,
        remarks: employer.employerProfile.verificationDocs.remarks || '',
        rejectionReasons: employer.employerProfile.verificationDocs.rejectionReasons || [],
        rejectionMessage: employer.employerProfile.verificationDocs.rejectionMessage || '',
        rejectedAt: employer.employerProfile.verificationDocs.rejectedAt || null,
        mustChangePassword: employer.mustChangePassword,
      }
    });
  } catch (error) {
    console.error('Error updating employer verification status:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// HOLD employer verification and send resubmit email
exports.holdEmployerVerification = async (req, res) => {
  try {
    const { docType, docTypes, documentReasons, additionalMessage = '' } = req.body;

    const requestedDocTypes = [...new Set(
      (Array.isArray(docTypes) && docTypes.length ? docTypes : [docType])
        .map((value) => String(value || '').trim())
        .filter((value) => EMPLOYER_DOC_TYPES.includes(value))
    )];

    if (!requestedDocTypes.length) {
      return res.status(400).json({
        success: false,
        message: 'Please select at least one valid document for resubmission'
      });
    }

    const normalizedDocumentReasons = Array.isArray(documentReasons)
      ? documentReasons.map((item) => ({
          docType: String(item?.docType || '').trim(),
          reason: String(item?.reason || '').trim(),
        }))
      : [];
    const reasonByDocType = new Map(normalizedDocumentReasons.map((item) => [item.docType, item.reason]));
    if (requestedDocTypes.some((key) => !reasonByDocType.get(key))) {
      return res.status(400).json({
        success: false,
        message: 'A reason is required for every selected document.'
      });
    }
    if (normalizedDocumentReasons.some((item) => item.reason.length > 300) || String(additionalMessage || '').trim().length > 500) {
      return res.status(400).json({
        success: false,
        message: 'A document reason must not exceed 300 characters and the additional message must not exceed 500 characters.'
      });
    }

    const employer = await User.findById(req.params.id);
    if (!employer || employer.role !== 'employer') {
      return res.status(404).json({
        success: false,
        message: 'Employer not found'
      });
    }

    if (!employer.employerProfile) employer.employerProfile = {};
    if (!employer.employerProfile.verificationDocs) {
      employer.employerProfile.verificationDocs = {};
    }

    const verificationDocs = employer.employerProfile.verificationDocs;
    const invalidRequestedDoc = requestedDocTypes.find((key) => {
      const targetDocument = verificationDocs?.[key];
      return (
        !targetDocument?.url ||
        !['pending', 'submitted', 'hold'].includes(String(targetDocument.status || '').toLowerCase())
      );
    });

    if (invalidRequestedDoc) {
      return res.status(400).json({
        success: false,
        message: 'Only submitted pending credentials can be requested for resubmission.'
      });
    }

    const alreadyOnHoldDoc = requestedDocTypes.find(
      (key) => String(verificationDocs?.[key]?.status || '').toLowerCase() === 'hold'
    );
    if (alreadyOnHoldDoc) {
      return res.status(409).json({
        success: false,
        message: `${EMPLOYER_DOC_LABELS[alreadyOnHoldDoc] || 'This document'} is already on hold and must be resubmitted first.`
      });
    }

    const finalDocumentReasons = requestedDocTypes.map((key) => ({ docType: key, reason: reasonByDocType.get(key) }));
    const reasonMessage = finalDocumentReasons
      .map((item) => `${EMPLOYER_DOC_LABELS[item.docType] || item.docType}: ${item.reason}`)
      .join('\n');

    const now = new Date();
    const rawToken = createVerificationResubmitToken({
      userId: employer._id,
      requestedAt: now,
      docTypes: requestedDocTypes,
    });
    const tokenHash = User.hashToken(rawToken);
    const expiresAt = null;

    verificationDocs.overallStatus = 'hold';
    verificationDocs.remarks = String(reasonMessage).trim();
    verificationDocs.rejectionReasons = [];
    verificationDocs.rejectionMessage = '';
    verificationDocs.rejectedAt = null;

    requestedDocTypes.forEach((key) => {
      if (!verificationDocs[key]) verificationDocs[key] = {};
      verificationDocs[key].status = 'hold';
      verificationDocs[key].checked = false;
      verificationDocs[key].checkedAt = null;
      verificationDocs[key].checkedBy = null;
    });

    verificationDocs.resubmitRequest = {
      tokenHash,
      docType: requestedDocTypes[0],
      docTypes: requestedDocTypes,
      reasonMessage: String(reasonMessage).trim(),
      documentReasons: finalDocumentReasons,
      additionalMessage: String(additionalMessage || '').trim(),
      requestedAt: now,
      expiresAt,
      usedAt: null,
      reminder7SentAt: null,
      reminder14SentAt: null,
      autoDeclinedAt: null,
      autoDeclineEmailSentAt: null,
      requestedBy: req.user?._id || req.userId || null,
    };

    employer.employerProfile.verificationDocs = verificationDocs;
    await employer.save();

    const resubmitUrl = verificationResubmitFrontendUrl('employer', rawToken);
    const docLabels = requestedDocTypes.map((key) => EMPLOYER_DOC_LABELS[key] || key);

    sendResubmitDocumentEmail({
      to: employer.email,
      fullName: employer.employerProfile?.companyName || employer.fullName || employer.email,
      docLabel: docLabels[0],
      docLabels,
      reasonMessage: String(reasonMessage).trim(),
      documentReasons: finalDocumentReasons.map((item) => ({
        docType: item.docType,
        docLabel: EMPLOYER_DOC_LABELS[item.docType] || item.docType,
        reason: item.reason,
      })),
      additionalMessage: String(additionalMessage || '').trim(),
      resubmitUrl,
    }).catch((emailError) => {
      console.error('Failed to send employer resubmit email:', emailError);
    });

    return res.status(200).json({
      success: true,
      message: 'Employer placed on HOLD and resubmit email sent successfully.',
      employer: {
        _id: employer._id,
        email: employer.email,
        overallStatus: verificationDocs.overallStatus,
        remarks: verificationDocs.remarks || '',
        resubmitRequest: {
          docType: requestedDocTypes[0],
          docTypes: requestedDocTypes,
          reasonMessage: String(reasonMessage).trim(),
          documentReasons: finalDocumentReasons,
          additionalMessage: String(additionalMessage || '').trim(),
          requestedAt: now,
          expiresAt,
        }
      }
    });
  } catch (error) {
    console.error('Error placing employer on hold:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error placing employer on HOLD'
    });
  }
};

// Get employer verification document URLs
exports.getEmployerVerificationDocUrls = async (req, res) => {
  try {
    const employer = await User.findById(req.params.id).select('-password');

    if (!employer || employer.role !== 'employer') {
      return res.status(404).json({
        success: false,
        message: 'Employer not found'
      });
    }

    const docs = employer?.employerProfile?.verificationDocs || {};

    res.status(200).json({
      success: true,
      documents: {
        secRegistration: docs?.secRegistration?.url || null,
        birRegistration: docs?.birRegistration?.url || null,
        dtiRegistration: docs?.dtiRegistration?.url || null,
        cityPermit: docs?.cityPermit?.url || null,
        businessPermit: docs?.businessPermit?.url || null,
      }
    });
  } catch (error) {
    console.error('Error fetching employer document URLs:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// ==========================
// ✅ JOBSEEKER VERIFICATION FUNCTIONS
// ==========================

const getJobseekerVerificationStatus = (user) => {
  const verificationDocs = user?.jobSeekerProfile?.verificationDocs || {};
  const overallStatus = verificationDocs.overallStatus || 'not_submitted';

  const docKeys = ['cv', 'tor', 'diploma', 'sss', 'philhealth', 'pagibig', 'tin', 'validId'];
  const submittedCount = docKeys.filter((key) =>
    verificationDocs[key]?.url && verificationDocs[key]?.url.trim() !== ''
  ).length;

  const totalDocs = docKeys.length;

  return {
    overallStatus,
    submittedCount,
    totalDocs,
    isComplete: submittedCount === totalDocs,
    docStatus:
      submittedCount === 0
        ? 'No documents'
        : submittedCount < totalDocs
        ? 'Partial documents'
        : 'All documents submitted'
  };
};

const JOBSEEKER_STATUS_LABELS = {
  not_submitted: 'Not Submitted',
  pending: 'Pending',
  verified: 'Verified',
  rejected: 'Rejected',
  hold: 'On Hold',
};

const normalizeJobseekerForList = (user) => {
  const verificationStatus = getJobseekerVerificationStatus(user);
  const profile = user.jobSeekerProfile || {};

  const fieldOfStudyValue =
    profile.fieldOfStudy ||
    profile.studyField ||
    (Array.isArray(profile.fieldOfStudyList) ? profile.fieldOfStudyList.filter(Boolean).join(', ') : '');

  const campus =
    profile.campus ||
    (Array.isArray(profile.educationEntries) && profile.educationEntries.find((entry) => entry?.campus)?.campus) ||
    '';

  const course =
    profile.course ||
    (Array.isArray(profile.educationEntries) && profile.educationEntries.find((entry) => entry?.course)?.course) ||
    '';

  const address =
    profile.address ||
    [profile.cityProvince, profile.region].filter(Boolean).join(', ');

  return {
    _id: user._id,
    username: user.username,
    email: user.email,
    fullName: `${user.firstName || ''} ${user.middleName || ''} ${user.lastName || ''}`.replace(/\s+/g, ' ').trim(),
    firstName: user.firstName || '',
    middleName: user.middleName || '',
    lastName: user.lastName || '',
    profileImage: user.profileImage || '',
    createdAt: user.createdAt,

    jobSeekerProfile: profile,

    verificationStatus: verificationStatus.overallStatus,
    rejectedAt: profile.verificationDocs?.rejectedAt || null,
    verificationDocs: profile.verificationDocs || {},
    submittedCount: verificationStatus.submittedCount,
    totalDocs: verificationStatus.totalDocs,
    docsComplete: verificationStatus.isComplete,
    docStatus: verificationStatus.docStatus,

    mobileNumber: profile.phoneNumber || profile.mobileNumber || '',
    region: profile.region || '',
    cityProvince: profile.cityProvince || '',
    educationalAttainment: profile.educationalAttainment || '',
    fieldOfStudy: fieldOfStudyValue || '',

    campus,
    course,
    address,
  };
};

// GET list of jobseekers for verification
exports.getJobseekersForVerification = async (req, res) => {
  try {
    const status = String(req.query.status || '').trim().toLowerCase();
    const search = String(req.query.search || '').trim();
    const campus = String(req.query.campus || '').trim();
    const course = String(req.query.course || '').trim();
    const address = String(req.query.address || '').trim();
    const sort = String(req.query.sort || 'newest').trim().toLowerCase();

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limitParam = String(req.query.limit || '10').trim().toLowerCase();
    const showAll = limitParam === 'all';
    const limit = showAll
      ? null
      : Math.min(Math.max(parseInt(limitParam, 10) || 10, 1), 100);
    const includeMeta = String(req.query.includeMeta || 'true').toLowerCase() !== 'false';

    const dateFrom = String(req.query.dateFrom || '').trim();
    const dateTo = String(req.query.dateTo || '').trim();

    const query = {
      role: 'jobseeker',
      status: { $ne: 'deleted' },
    };

    if (status && ['not_submitted', 'pending', 'verified', 'rejected', 'hold'].includes(status)) {
      query['jobSeekerProfile.verificationDocs.overallStatus'] = status;
    } else {
      query['jobSeekerProfile.verificationDocs.overallStatus'] = { $nin: ['verified', 'rejected'] };
    }

    if (search) {
      const searchRegex = new RegExp(escapeRegex(search), 'i');
      query.$or = [
        { firstName: searchRegex },
        { middleName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
        { username: searchRegex },
      ];
    }

    if (dateFrom || dateTo) {
      query.createdAt = {};

      if (dateFrom) {
        const start = new Date(dateFrom);
        if (!Number.isNaN(start.getTime())) {
          start.setHours(0, 0, 0, 0);
          query.createdAt.$gte = start;
        }
      }

      if (dateTo) {
        const end = new Date(dateTo);
        if (!Number.isNaN(end.getTime())) {
          end.setHours(23, 59, 59, 999);
          query.createdAt.$lte = end;
        }
      }

      if (Object.keys(query.createdAt).length === 0) {
        delete query.createdAt;
      }
    }

    const [users, statsUsers] = await Promise.all([
      User.find(query).select('-password'),
      User.find({ role: 'jobseeker', status: { $ne: 'deleted' } }).select('-password'),
    ]);
    const normalized = users.map(normalizeJobseekerForList);
    const normalizedAllJobseekers = statsUsers.map(normalizeJobseekerForList);

    const allStats = normalizedAllJobseekers.reduce(
      (acc, item) => {
        const currentStatus = String(item.verificationStatus || 'not_submitted').toLowerCase();

        acc.total += 1;
        if (currentStatus === 'pending') acc.pending += 1;
        else if (currentStatus === 'verified') acc.verified += 1;
        else if (currentStatus === 'rejected') acc.rejected += 1;
        else if (currentStatus === 'hold') acc.hold += 1;
        else acc.notSubmitted += 1;

        return acc;
      },
      {
        total: 0,
        pending: 0,
        verified: 0,
        rejected: 0,
        hold: 0,
        notSubmitted: 0,
      }
    );

    const uniqueNormalizedOptions = (values, normalizer = (value) => String(value || '').trim()) => {
      const optionMap = new Map();

      values.forEach((value) => {
        const normalizedValue = normalizer(value);
        if (!normalizedValue) return;

        const duplicateKey = normalizedValue.toLocaleLowerCase();
        if (!optionMap.has(duplicateKey)) {
          optionMap.set(duplicateKey, normalizedValue);
        }
      });

      return [...optionMap.values()].sort((a, b) => a.localeCompare(b));
    };

    const campuses = uniqueNormalizedOptions(
      normalizedAllJobseekers.map((item) => item.campus),
      normalizeDashboardCampus
    );
    const courses = uniqueNormalizedOptions(normalizedAllJobseekers.map((item) => item.course));
    const addresses = uniqueNormalizedOptions(normalizedAllJobseekers.map((item) => item.address));

    let filtered = normalized;

    if (campus && campus !== 'all') {
      filtered = filtered.filter((item) => String(item.campus || '').toLowerCase() === campus.toLowerCase());
    }

    if (course && course !== 'all') {
      filtered = filtered.filter((item) => String(item.course || '').toLowerCase() === course.toLowerCase());
    }

    if (address && address !== 'all') {
      filtered = filtered.filter((item) => String(item.address || '').toLowerCase() === address.toLowerCase());
    }

    filtered = filtered.sort((a, b) => {
      const aDate = new Date(a.createdAt).getTime();
      const bDate = new Date(b.createdAt).getTime();

      if (sort === 'oldest') return aDate - bDate;
      return bDate - aDate;
    });

    const totalItems = filtered.length;
    const totalPages = showAll ? 1 : Math.max(Math.ceil(totalItems / limit), 1);
    const safePage = showAll ? 1 : Math.min(page, totalPages);
    const skip = showAll ? 0 : (safePage - 1) * limit;

    const paginated = showAll ? filtered : filtered.slice(skip, skip + limit);

    res.status(200).json({
      success: true,
      jobseekers: paginated,
      ...(includeMeta ? {
        stats: allStats,
        filters: {
          campuses,
          courses,
          addresses,
          statuses: [
            { value: 'not_submitted', label: JOBSEEKER_STATUS_LABELS.not_submitted },
            { value: 'pending', label: JOBSEEKER_STATUS_LABELS.pending },
            { value: 'hold', label: JOBSEEKER_STATUS_LABELS.hold },
            { value: 'verified', label: JOBSEEKER_STATUS_LABELS.verified },
            { value: 'rejected', label: JOBSEEKER_STATUS_LABELS.rejected },
          ],
        },
      } : {}),
      pagination: {
        page: safePage,
        limit: showAll ? 'all' : limit,
        totalItems,
        totalPages,
        hasPrevPage: safePage > 1,
        hasNextPage: safePage < totalPages,
      },
      count: paginated.length
    });
  } catch (error) {
    console.error('Error fetching jobseekers for verification:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching jobseekers'
    });
  }
};

// GET jobseeker verification details by ID
exports.getJobseekerVerificationById = async (req, res) => {
  try {
    const jobseeker = await User.findById(req.params.id).select('-password');

    if (!jobseeker || jobseeker.role !== 'jobseeker') {
      return res.status(404).json({
        success: false,
        message: 'Jobseeker not found'
      });
    }

    const verificationStatus = getJobseekerVerificationStatus(jobseeker);
    const profile = jobseeker.jobSeekerProfile || {};
    const verificationDocs = profile.verificationDocs || {};

    const docDetails = {};
    const docTypes = ['cv', 'tor', 'diploma', 'sss', 'philhealth', 'pagibig', 'tin', 'validId'];

    docTypes.forEach((type) => {
      const storedDocument = verificationDocs[type] || {
        url: '',
        status: 'not_submitted',
        uploadedAt: null,
        filename: '',
        fileSize: 0
      };
      docDetails[type] = {
        ...(storedDocument.toObject ? storedDocument.toObject() : storedDocument),
        status: storedDocument.status,
        checked: storedDocument.checked,
      };
    });

    const fieldOfStudyValue =
      profile.fieldOfStudy ||
      profile.studyField ||
      (Array.isArray(profile.fieldOfStudyList) ? profile.fieldOfStudyList.filter(Boolean).join(', ') : '');

    const campus =
      profile.campus ||
      (Array.isArray(profile.educationEntries) && profile.educationEntries.find((entry) => entry?.campus)?.campus) ||
      '';

    const course =
      profile.course ||
      (Array.isArray(profile.educationEntries) && profile.educationEntries.find((entry) => entry?.course)?.course) ||
      '';

    const address =
      profile.address ||
      [profile.cityProvince, profile.region].filter(Boolean).join(', ');

    res.status(200).json({
      success: true,
      jobseeker: {
        _id: jobseeker._id,
        isVerified: isApprovedJobseekerAccount(jobseeker),
        username: jobseeker.username,
        email: jobseeker.email,
        firstName: jobseeker.firstName,
        middleName: jobseeker.middleName,
        lastName: jobseeker.lastName,
        extensionName: jobseeker.extensionName || '',
        registrationId: `JS-${new Date(jobseeker.createdAt || Date.now()).getFullYear()}-${String(jobseeker._id).slice(-6).toUpperCase()}`,
        profileImage: jobseeker.profileImage,
        createdAt: jobseeker.createdAt,

        jobSeekerProfile: {
          course: course || '',
          campus: campus || '',
          yearGraduated: profile.yearGraduated || '',
          preferredWorkMode: profile.preferredWorkMode || '',
          technicalSkills: profile.technicalSkills || '',
          softSkills: profile.softSkills || '',
          whatHaveYouDone: profile.whatHaveYouDone || '',
          howSoonCanYouStart: profile.howSoonCanYouStart || '',

          phoneNumber: profile.phoneNumber || '',
          mobileNumber: profile.phoneNumber || profile.mobileNumber || '',

          birthday: profile.birthday || null,
          region: profile.region || '',
          cityProvince: profile.cityProvince || '',
          gender: profile.gender || '',
          studentId: profile.studentId || '',
          educationalAttainment: profile.educationalAttainment || '',
          fieldOfStudy: fieldOfStudyValue || '',
          dateGraduated: profile.dateGraduated || null,
          specialization: profile.specialization || '',
          subSpecialization: profile.subSpecialization || '',
          recentExperience: profile.recentExperience || '',
          fieldOfStudyList: profile.fieldOfStudyList || [],
          majorCourse: profile.majorCourse || '',
          hasRecentExperience: typeof profile.hasRecentExperience === 'boolean' ? profile.hasRecentExperience : undefined,
          address: address || '',

          verificationDocs: verificationDocs,
          verificationStatus: profile.verificationStatus || 'not_submitted'
        },

        verificationSummary: {
          overallStatus: verificationStatus.overallStatus,
          submittedCount: verificationStatus.submittedCount,
          totalDocs: verificationStatus.totalDocs,
          isComplete: verificationStatus.isComplete,
          docStatus: verificationStatus.docStatus,
          adminRemarks: verificationDocs.adminRemarks || '',
          verifiedBy: verificationDocs.verifiedBy || null,
          verifiedAt: verificationDocs.verifiedAt || null,
          rejectionReasons: verificationDocs.rejectionReasons || [],
          rejectionMessage: verificationDocs.rejectionMessage || '',
          rejectedAt: verificationDocs.rejectedAt || null,
          resubmitRequest: verificationDocs.resubmitRequest || {}
        },

        documentDetails: docDetails
      }
    });
  } catch (error) {
    console.error('Error fetching jobseeker verification details:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching jobseeker details'
    });
  }
};

// UPDATE jobseeker verification status
exports.updateJobseekerVerificationStatus = async (req, res) => {
  try {
    const { overallStatus, adminRemarks, rejectionReasons, rejectionMessage, adminPassword } = req.body;
    const suppliedAdminPassword = adminPassword || req.headers['x-admin-password'];

    if (String(rejectionMessage || '').trim().length > 500) {
      return res.status(400).json({ success: false, message: 'Message must not exceed 500 characters.' });
    }

    if (overallStatus === 'verified' && !(await isValidAdminPassword(req, suppliedAdminPassword))) {
      return res.status(401).json({ success: false, message: 'Incorrect password.' });
    }
    let adminId = null;
    if (req.user && req.user._id) {
      adminId = req.user._id;
    }
    console.log('Admin ID from request:', adminId);

    const validStatuses = ['not_submitted', 'pending', 'verified', 'rejected', 'hold'];
    if (!validStatuses.includes(overallStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be: not_submitted, pending, verified, rejected, or hold'
      });
    }

    const jobseeker = await User.findById(req.params.id);
    if (!jobseeker || jobseeker.role !== 'jobseeker') {
      return res.status(404).json({
        success: false,
        message: 'Jobseeker not found'
      });
    }

    if (overallStatus === 'rejected') {
      const allowedJobseekerDeclineReasons = [
        'Not a PHINMA Araullo University graduate',
        'Other',
      ];
      const selectedReason = Array.isArray(rejectionReasons) ? String(rejectionReasons[0] || '').trim() : '';
      if (!allowedJobseekerDeclineReasons.includes(selectedReason) || !String(rejectionMessage || '').trim()) {
        return res.status(400).json({
          success: false,
          message: 'A valid decline reason and message are required.'
        });
      }
    }

    const prevStatus = jobseeker?.jobSeekerProfile?.verificationDocs?.overallStatus || 'not_submitted';

    const verificationStatus = getJobseekerVerificationStatus(jobseeker);
    if (overallStatus === 'verified') {
      const verificationDocs = jobseeker?.jobSeekerProfile?.verificationDocs || {};
      const allRequiredCredentialsApproved = JOBSEEKER_REQUIRED_DOC_TYPES.every((docType) => {
        const document = verificationDocs?.[docType];
        return Boolean(
          document?.url &&
          (document?.checked === true || String(document?.status || '').toLowerCase() === 'approved')
        );
      });

      if (!allRequiredCredentialsApproved) {
        return res.status(400).json({
          success: false,
          message: 'Cannot approve jobseeker until all required credentials are submitted and approved.'
        });
      }
    }

    if (!jobseeker.jobSeekerProfile) jobseeker.jobSeekerProfile = {};
    if (!jobseeker.jobSeekerProfile.verificationDocs) {
      jobseeker.jobSeekerProfile.verificationDocs = {};
    }

    jobseeker.jobSeekerProfile.verificationDocs.overallStatus = overallStatus;

    if (adminRemarks) {
      jobseeker.jobSeekerProfile.verificationDocs.adminRemarks = adminRemarks;
    } else if (overallStatus !== 'rejected') {
      jobseeker.jobSeekerProfile.verificationDocs.adminRemarks = '';
    }

    if (overallStatus === 'verified') {
      JOBSEEKER_DOC_TYPES.forEach((docType) => {
        const document = jobseeker.jobSeekerProfile.verificationDocs[docType];
        if (!document?.url) return;
        document.status = 'approved';
        document.checked = true;
        document.checkedAt = new Date();
        document.checkedBy = adminId;
      });
      jobseeker.jobSeekerProfile.verificationDocs.verifiedBy = adminId;
      jobseeker.jobSeekerProfile.verificationDocs.verifiedAt = new Date();
      jobseeker.jobSeekerProfile.verificationDocs.rejectionReasons = [];
      jobseeker.jobSeekerProfile.verificationDocs.rejectionMessage = '';
      jobseeker.jobSeekerProfile.verificationDocs.rejectedAt = null;
      jobseeker.isVerified = true;
    } else {
      jobseeker.jobSeekerProfile.verificationDocs.verifiedBy = null;
      jobseeker.jobSeekerProfile.verificationDocs.verifiedAt = null;

      if (overallStatus === 'rejected') {
        const normalizedRejectionReasons = Array.isArray(rejectionReasons)
          ? rejectionReasons.map((item) => String(item || '').trim()).filter(Boolean)
          : [];

        const finalRejectionMessage = String(rejectionMessage || '').trim();

        jobseeker.jobSeekerProfile.verificationDocs.rejectionReasons = normalizedRejectionReasons;
        jobseeker.jobSeekerProfile.verificationDocs.rejectionMessage = finalRejectionMessage;
        jobseeker.jobSeekerProfile.verificationDocs.rejectedAt = new Date();

        if (!jobseeker.jobSeekerProfile.verificationDocs.adminRemarks) {
          jobseeker.jobSeekerProfile.verificationDocs.adminRemarks = `Declined verification request. Message to user: ${finalRejectionMessage}`;
        }
      } else {
        jobseeker.jobSeekerProfile.verificationDocs.rejectionReasons = [];
        jobseeker.jobSeekerProfile.verificationDocs.rejectionMessage = '';
        jobseeker.jobSeekerProfile.verificationDocs.rejectedAt = null;
      }
    }

    jobseeker.jobSeekerProfile.verificationStatus = overallStatus;

    if (overallStatus === 'verified' && prevStatus !== 'verified') {
      let finalUsername = jobseeker.username;
      if (!finalUsername) {
        finalUsername = await generateUniqueUsername({
          role: 'jobseeker',
          firstName: jobseeker.firstName,
          lastName: jobseeker.lastName,
          companyName: '',
        });
      } else {
        const exists = await User.findOne({ username: finalUsername, _id: { $ne: jobseeker._id } }).select('_id');
        if (exists) {
          finalUsername = await generateUniqueUsername({
            role: 'jobseeker',
            firstName: jobseeker.firstName,
            lastName: jobseeker.lastName,
            companyName: '',
          });
        }
      }

      jobseeker.username = finalUsername;
      jobseeker.status = 'active';

      const temporaryPassword = generateTempPassword();
      jobseeker.password = await bcrypt.hash(temporaryPassword, 12);
      jobseeker.mustChangePassword = true;

      await jobseeker.save();

      sendCredentialsEmail({
        to: jobseeker.email,
        fullName: jobseeker.fullName || jobseeker.email,
        username: finalUsername,
        temporaryPassword,
        role: 'Jobseeker',
      }).catch((emailError) => {
        console.error('Failed to send jobseeker credentials email:', emailError);
      });

      return res.status(200).json({
        success: true,
        message: `Jobseeker approved. Approval email sent to ${jobseeker.email}`,
        jobseeker: {
          _id: jobseeker._id,
          username: jobseeker.username,
          fullName: `${jobseeker.firstName || ''} ${jobseeker.lastName || ''}`.trim(),
          verificationStatus: overallStatus,
          adminRemarks: jobseeker.jobSeekerProfile.verificationDocs.adminRemarks || '',
          verifiedBy: jobseeker.jobSeekerProfile.verificationDocs.verifiedBy,
          verifiedAt: jobseeker.jobSeekerProfile.verificationDocs.verifiedAt,
          rejectionReasons: jobseeker.jobSeekerProfile.verificationDocs.rejectionReasons || [],
          rejectionMessage: jobseeker.jobSeekerProfile.verificationDocs.rejectionMessage || '',
          rejectedAt: jobseeker.jobSeekerProfile.verificationDocs.rejectedAt || null,
          mustChangePassword: jobseeker.mustChangePassword,
        }
      });
    }

    await jobseeker.save();

    if (overallStatus === 'rejected') {
      sendVerificationRejectedEmail({
        to: jobseeker.email,
        fullName: jobseeker.fullName || jobseeker.email,
        reasons: jobseeker.jobSeekerProfile.verificationDocs.rejectionReasons || [],
        message: jobseeker.jobSeekerProfile.verificationDocs.rejectionMessage || '',
      }).catch((emailError) => {
        console.error('Failed to send jobseeker rejection email:', emailError);
      });
    }

    res.status(200).json({
      success: true,
      message: `Jobseeker verification status updated to ${overallStatus}`,
      jobseeker: {
        _id: jobseeker._id,
        username: jobseeker.username,
        fullName: `${jobseeker.firstName || ''} ${jobseeker.lastName || ''}`.trim(),
        verificationStatus: overallStatus,
        adminRemarks: jobseeker.jobSeekerProfile.verificationDocs.adminRemarks || '',
        verifiedBy: jobseeker.jobSeekerProfile.verificationDocs.verifiedBy,
        verifiedAt: jobseeker.jobSeekerProfile.verificationDocs.verifiedAt,
        rejectionReasons: jobseeker.jobSeekerProfile.verificationDocs.rejectionReasons || [],
        rejectionMessage: jobseeker.jobSeekerProfile.verificationDocs.rejectionMessage || '',
        rejectedAt: jobseeker.jobSeekerProfile.verificationDocs.rejectedAt || null,
        mustChangePassword: jobseeker.mustChangePassword,
      }
    });
  } catch (error) {
    console.error('Error updating jobseeker verification status:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating verification status'
    });
  }
};

// HOLD jobseeker verification and send resubmit email
exports.holdJobseekerVerification = async (req, res) => {
  try {
    const { docType, docTypes, documentReasons, additionalMessage = '' } = req.body;

    const requestedDocTypes = [...new Set(
      (Array.isArray(docTypes) && docTypes.length ? docTypes : [docType])
        .map((value) => String(value || '').trim())
        .filter((value) => JOBSEEKER_DOC_TYPES.includes(value))
    )];

    if (!requestedDocTypes.length) {
      return res.status(400).json({
        success: false,
        message: 'Please select at least one valid document for resubmission'
      });
    }

    const normalizedDocumentReasons = Array.isArray(documentReasons)
      ? documentReasons.map((item) => ({
          docType: String(item?.docType || '').trim(),
          reason: String(item?.reason || '').trim(),
        }))
      : [];
    const reasonByDocType = new Map(normalizedDocumentReasons.map((item) => [item.docType, item.reason]));
    if (requestedDocTypes.some((key) => !reasonByDocType.get(key))) {
      return res.status(400).json({
        success: false,
        message: 'A reason is required for every selected document.'
      });
    }
    if (normalizedDocumentReasons.some((item) => item.reason.length > 300) || String(additionalMessage || '').trim().length > 500) {
      return res.status(400).json({
        success: false,
        message: 'A document reason must not exceed 300 characters and the additional message must not exceed 500 characters.'
      });
    }

    const jobseeker = await User.findById(req.params.id);
    if (!jobseeker || jobseeker.role !== 'jobseeker') {
      return res.status(404).json({
        success: false,
        message: 'Jobseeker not found'
      });
    }

    if (!jobseeker.jobSeekerProfile) jobseeker.jobSeekerProfile = {};
    if (!jobseeker.jobSeekerProfile.verificationDocs) {
      jobseeker.jobSeekerProfile.verificationDocs = {};
    }

    const verificationDocs = jobseeker.jobSeekerProfile.verificationDocs;

    const alreadyOnHoldDoc = requestedDocTypes.find(
      (key) => String(verificationDocs?.[key]?.status || '').toLowerCase() === 'hold'
    );
    if (alreadyOnHoldDoc) {
      return res.status(409).json({
        success: false,
        message: `${JOBSEEKER_DOC_LABELS[alreadyOnHoldDoc] || 'This document'} is already on hold and must be resubmitted first.`
      });
    }

    const invalidRequestedDoc = requestedDocTypes.find((key) => {
      const targetDocument = verificationDocs?.[key];
      return (
        !targetDocument?.url ||
        !['pending', 'submitted'].includes(String(targetDocument.status || '').toLowerCase())
      );
    });

    if (invalidRequestedDoc) {
      return res.status(400).json({
        success: false,
        message: 'Only submitted pending credentials can be requested for resubmission.'
      });
    }

    const finalDocumentReasons = requestedDocTypes.map((key) => ({ docType: key, reason: reasonByDocType.get(key) }));
    const reasonMessage = finalDocumentReasons
      .map((item) => `${JOBSEEKER_DOC_LABELS[item.docType] || item.docType}: ${item.reason}`)
      .join('\n');

    const wasAccountVerified = isApprovedJobseekerAccount(jobseeker);
    const now = new Date();
    const rawToken = createVerificationResubmitToken({
      userId: jobseeker._id,
      requestedAt: now,
      docTypes: requestedDocTypes,
    });
    const tokenHash = User.hashToken(rawToken);
    const expiresAt = null;

    verificationDocs.overallStatus = 'hold';
    verificationDocs.adminRemarks = String(reasonMessage).trim();

    if (!wasAccountVerified) {
      verificationDocs.verifiedBy = null;
      verificationDocs.verifiedAt = null;
    }

    verificationDocs.rejectionReasons = [];
    verificationDocs.rejectionMessage = '';
    verificationDocs.rejectedAt = null;

    requestedDocTypes.forEach((key) => {
      if (!verificationDocs[key]) verificationDocs[key] = {};
      verificationDocs[key].status = 'hold';
      verificationDocs[key].checked = false;
      verificationDocs[key].checkedAt = null;
      verificationDocs[key].checkedBy = null;
    });

    verificationDocs.resubmitRequest = {
      tokenHash,
      docType: requestedDocTypes[0],
      docTypes: requestedDocTypes,
      reasonMessage: String(reasonMessage).trim(),
      documentReasons: finalDocumentReasons,
      additionalMessage: String(additionalMessage || '').trim(),
      requestedAt: now,
      expiresAt,
      usedAt: null,
      reminder7SentAt: null,
      reminder14SentAt: null,
      autoDeclinedAt: null,
      autoDeclineEmailSentAt: null,
      requestedBy: req.user?._id || req.userId || null,
    };

    jobseeker.jobSeekerProfile.verificationStatus = wasAccountVerified ? 'verified' : 'hold';
    jobseeker.jobSeekerProfile.verificationDocs = verificationDocs;
    await jobseeker.save();

    for (const requestedDocType of requestedDocTypes) {
      await createJobseekerCredentialNotification({
        user: jobseeker,
        docType: requestedDocType,
        action: 'action_needed',
        feedback: String(reasonMessage).trim(),
      });
    }

    const resubmitUrl = verificationResubmitFrontendUrl('jobseeker', rawToken);
    const docLabels = requestedDocTypes.map((key) => JOBSEEKER_DOC_LABELS[key] || key);

    sendResubmitDocumentEmail({
      to: jobseeker.email,
      fullName: [jobseeker.firstName, jobseeker.lastName].filter(Boolean).join(' ') || jobseeker.fullName || jobseeker.email,
      docLabel: docLabels[0],
      docLabels,
      reasonMessage: String(reasonMessage).trim(),
      documentReasons: finalDocumentReasons.map((item) => ({
        docType: item.docType,
        docLabel: JOBSEEKER_DOC_LABELS[item.docType] || item.docType,
        reason: item.reason,
      })),
      additionalMessage: String(additionalMessage || '').trim(),
      resubmitUrl,
    }).catch((emailError) => {
      console.error('Failed to send jobseeker resubmit email:', emailError);
    });

    return res.status(200).json({
      success: true,
      message: 'Jobseeker placed on HOLD and resubmit email sent successfully.',
      jobseeker: {
        _id: jobseeker._id,
        email: jobseeker.email,
        verificationStatus: jobseeker.jobSeekerProfile.verificationStatus,
        overallStatus: verificationDocs.overallStatus,
        adminRemarks: verificationDocs.adminRemarks || '',
        resubmitRequest: {
          docType: requestedDocTypes[0],
          docTypes: requestedDocTypes,
          reasonMessage: String(reasonMessage).trim(),
          documentReasons: finalDocumentReasons,
          additionalMessage: String(additionalMessage || '').trim(),
          requestedAt: now,
          expiresAt,
        }
      }
    });
  } catch (error) {
    console.error('Error placing jobseeker on hold:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error placing jobseeker on HOLD'
    });
  }
};

// GET jobseeker verification document URLs
exports.getJobseekerVerificationDocUrls = async (req, res) => {
  try {
    const jobseeker = await User.findById(req.params.id).select('-password');

    if (!jobseeker || jobseeker.role !== 'jobseeker') {
      return res.status(404).json({
        success: false,
        message: 'Jobseeker not found'
      });
    }

    const verificationDocs = jobseeker.jobSeekerProfile?.verificationDocs || {};
    const docTypes = ['cv', 'tor', 'diploma', 'sss', 'philhealth', 'pagibig', 'tin', 'validId'];

    const documents = {};
    docTypes.forEach((type) => {
      documents[type] = verificationDocs[type]?.url || null;
    });

    res.status(200).json({
      success: true,
      documents
    });
  } catch (error) {
    console.error('Error fetching jobseeker document URLs:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching document URLs'
    });
  }
};

const markVerificationDocumentChecked = async (req, res, role) => {
  try {
    const allowedTypes = role === 'employer' ? EMPLOYER_DOC_TYPES : JOBSEEKER_DOC_TYPES;
    const docType = String(req.params.docType || '');
    if (!allowedTypes.includes(docType)) {
      return res.status(400).json({ success: false, message: 'Invalid document type.' });
    }

    const user = await User.findById(req.params.id);
    if (!user || user.role !== role) {
      return res.status(404).json({ success: false, message: `${role === 'employer' ? 'Employer' : 'Jobseeker'} not found.` });
    }

    const docs = role === 'employer'
      ? user.employerProfile?.verificationDocs
      : user.jobSeekerProfile?.verificationDocs;
    const document = docs?.[docType];
    if (!document?.url) {
      return res.status(400).json({ success: false, message: 'This document has not been submitted.' });
    }

    if (document.checked === true || String(document.status || '').toLowerCase() === 'approved') {
      return res.status(200).json({
        success: true,
        message: `${role === 'employer' ? EMPLOYER_DOC_LABELS[docType] : JOBSEEKER_DOC_LABELS[docType] || 'Credential'} is already approved.`,
        document: {
          status: 'approved',
          checked: true,
          checkedAt: document.checkedAt || null,
          checkedBy: document.checkedBy || null,
        },
        accountAutoApproved: false,
      });
    }

    const wasAccountVerified = role === 'jobseeker'
      ? isApprovedJobseekerAccount(user)
      : user.isVerified === true;
    document.status = 'approved';
    document.checked = true;
    document.checkedAt = new Date();
    document.checkedBy = req.user?._id || req.userId || null;

    let accountAutoApproved = false;
    if (role === 'jobseeker') {
      if (wasAccountVerified) {
        const credentialReviewStatus = getJobseekerCredentialReviewStatus(docs);
        docs.overallStatus = credentialReviewStatus;
        user.jobSeekerProfile.verificationStatus = credentialReviewStatus;
        user.isVerified = true;
        await user.save();
      } else {
        const credentialReviewStatus = getJobseekerCredentialReviewStatus(docs);
        docs.overallStatus = credentialReviewStatus === 'verified' ? 'pending' : credentialReviewStatus;
        user.jobSeekerProfile.verificationStatus = docs.overallStatus;
        await user.save();
      }
    } else {
      if (areAllEmployerCredentialsApproved(docs) && docs.overallStatus !== 'verified') {
        docs.overallStatus = 'pending';
      }
      await user.save();
    }

    if (role === 'jobseeker') {
      await createJobseekerCredentialNotification({ user, docType, action: 'approved' });
    }

    return res.status(200).json({
      success: true,
      message: role === 'jobseeker'
        ? `${JOBSEEKER_DOC_LABELS[docType] || 'Credential'} approved successfully.`
        : `${EMPLOYER_DOC_LABELS[docType] || 'Company requirement'} approved successfully.`,
      document: { status: document.status, checked: true, checkedAt: document.checkedAt, checkedBy: document.checkedBy },
      accountAutoApproved,
      overallStatus: docs.overallStatus,
    });
  } catch (error) {
    console.error('Error checking verification document:', error);
    return res.status(500).json({ success: false, message: 'Unable to mark document as checked.' });
  }
};

exports.checkJobseekerVerificationDocument = (req, res) => markVerificationDocumentChecked(req, res, 'jobseeker');
exports.checkEmployerVerificationDocument = (req, res) => markVerificationDocumentChecked(req, res, 'employer');

const restoreVerification = async (req, res, role) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || user.role !== role) {
      return res.status(404).json({ success: false, message: `${role === 'employer' ? 'Employer' : 'Jobseeker'} not found.` });
    }

    const docs = role === 'employer'
      ? user.employerProfile?.verificationDocs
      : user.jobSeekerProfile?.verificationDocs;
    if (!docs || docs.overallStatus !== 'rejected') {
      return res.status(400).json({ success: false, message: 'Only declined verification records can be restored.' });
    }

    docs.overallStatus = 'pending';
    docs.rejectionReasons = [];
    docs.rejectionMessage = '';
    docs.rejectedAt = null;
    if (role === 'employer') docs.remarks = '';
    else {
      docs.adminRemarks = '';
      user.jobSeekerProfile.verificationStatus = 'pending';
    }
    await user.save();

    sendVerificationRestoredEmail({
      to: user.email,
      fullName: role === 'employer'
        ? user.employerProfile?.companyName || user.fullName || user.email
        : user.fullName || user.email,
      role,
    }).catch((emailError) => console.error('Failed to send restoration email:', emailError));

    return res.status(200).json({
      success: true,
      message: `${role === 'employer' ? 'Employer' : 'Jobseeker'} restored to pending verification.`,
    });
  } catch (error) {
    console.error('Error restoring verification:', error);
    return res.status(500).json({ success: false, message: 'Unable to restore verification.' });
  }
};

exports.restoreJobseekerVerification = (req, res) => restoreVerification(req, res, 'jobseeker');
exports.restoreEmployerVerification = (req, res) => restoreVerification(req, res, 'employer');

exports.downloadUserVerificationDocument = async (req, res) => streamVerificationDocument(req, res, null);
exports.requireAdminPasswordForCredential = async (req, res, next) => {
  try {
    const password = String(req.headers['x-admin-password'] || '');

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required.',
      });
    }

    const admin = await User.findById(req.userId).select('password role email');

    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access is required.',
      });
    }

    let isPasswordValid = false;

    if (admin.password) {
      isPasswordValid = await bcrypt.compare(password, admin.password);
    }

    const defaultAdminEmail = String(process.env.DEFAULT_ADMIN_EMAIL || '')
      .trim()
      .toLowerCase();
    const defaultAdminPassword = String(process.env.DEFAULT_ADMIN_PASSWORD || '');

    const isDefaultAdmin =
      defaultAdminEmail &&
      String(admin.email || '').trim().toLowerCase() === defaultAdminEmail;

    if (
      !isPasswordValid &&
      isDefaultAdmin &&
      defaultAdminPassword &&
      password === defaultAdminPassword
    ) {
      isPasswordValid = true;

      const salt = await bcrypt.genSalt(10);
      admin.password = await bcrypt.hash(defaultAdminPassword, salt);
      await admin.save();
    }

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect password.',
      });
    }

    return next();
  } catch (error) {
    console.error('Error verifying admin password for credential access:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to verify password.',
    });
  }
};

exports.downloadJobseekerVerificationDocument = async (req, res) => streamVerificationDocument(req, res, 'jobseeker');
exports.downloadEmployerVerificationDocument = async (req, res) => streamVerificationDocument(req, res, 'employer');

// ==========================
// ✅ ADMIN JOB OFFERS
// ==========================
const getAdminJobOfferStatus = (job) => {
  const storedStatus = String(job?.status || '').trim().toLowerCase();
  const deadline = job?.applicationDeadline ? new Date(job.applicationDeadline) : null;
  const isExpired = deadline && !Number.isNaN(deadline.getTime()) && deadline < new Date();

  if (storedStatus === 'filled') return 'Filled';
  if (storedStatus === 'closed') return 'Closed';
  if (storedStatus === 'draft' || job?.isPublished === false) return 'Closed';
  if (isExpired) return 'Expired';
  if (job?.isActive === false) return 'Closed';
  return 'Open';
};

const getAdminJobDateRange = (dateFilter, dateFrom, dateTo) => {
  const now = new Date();
  const filter = String(dateFilter || 'all').trim().toLowerCase();

  const startOfDay = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    date.setHours(0, 0, 0, 0);
    return date;
  };

  const endOfDay = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    date.setHours(23, 59, 59, 999);
    return date;
  };

  let start = null;
  let end = null;

  if (filter === 'custom') {
    start = dateFrom ? startOfDay(`${dateFrom}T00:00:00`) : null;
    end = dateTo ? endOfDay(`${dateTo}T00:00:00`) : null;
  } else if (filter === 'today') {
    start = startOfDay(now);
    end = endOfDay(now);
  } else if (filter === 'yesterday') {
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    start = startOfDay(yesterday);
    end = endOfDay(yesterday);
  } else if (filter === 'thisweek') {
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    start = startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - mondayOffset));
    end = endOfDay(now);
  } else if (filter === '7days') {
    start = startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6));
    end = endOfDay(now);
  } else if (filter === 'thismonth') {
    start = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
    end = endOfDay(now);
  } else if (filter === 'lastmonth') {
    start = startOfDay(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    end = endOfDay(new Date(now.getFullYear(), now.getMonth(), 0));
  } else if (filter === 'thisyear') {
    start = startOfDay(new Date(now.getFullYear(), 0, 1));
    end = endOfDay(now);
  } else if (filter === 'lastyear') {
    start = startOfDay(new Date(now.getFullYear() - 1, 0, 1));
    end = endOfDay(new Date(now.getFullYear() - 1, 11, 31));
  }

  if (!start && !end) return null;

  const range = {};
  if (start) range.$gte = start;
  if (end) range.$lte = end;
  return range;
};

exports.getAdminJobOffers = async (req, res) => {
  try {
    const rawLimit = String(req.query.limit || '10').trim().toLowerCase();
    const showAll = rawLimit === 'all';
    const page = showAll ? 1 : Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = showAll ? null : Math.min(Math.max(parseInt(rawLimit, 10) || 10, 1), 100);
    const includeMeta = String(req.query.includeMeta || 'true').toLowerCase() !== 'false';
    const search = String(req.query.search || '').trim();
    const status = String(req.query.status || '').trim().toLowerCase();
    const company = String(req.query.company || '').trim();
    const industry = String(req.query.industry || '').trim();
    const jobTitle = String(req.query.jobTitle || '').trim();
    const dateFrom = String(req.query.dateFrom || '').trim();
    const dateTo = String(req.query.dateTo || '').trim();
    const dateRange = getAdminJobDateRange(req.query.date, dateFrom, dateTo);

    const baseQuery = {
      isArchived: { $ne: true },
      isPublished: true,
    };

    if (dateRange) baseQuery.createdAt = dateRange;

    if (search) {
      const regex = new RegExp(escapeRegex(search), 'i');
      baseQuery.$or = [
        { title: regex },
        { companyName: regex },
        { category: regex },
        { location: regex },
      ];
    }

    if (company) baseQuery.companyName = { $regex: `^${escapeRegex(company)}$`, $options: 'i' };
    if (industry) baseQuery.category = { $regex: `^${escapeRegex(industry)}$`, $options: 'i' };
    if (jobTitle) baseQuery.title = { $regex: `^${escapeRegex(jobTitle)}$`, $options: 'i' };

    const [allJobs, optionJobs] = await Promise.all([
      Job.find(baseQuery)
        .populate('employer', 'employerProfile.companyLogo employerProfile.industry employerProfile.companyName')
        .sort({ createdAt: -1 })
        .lean(),
      includeMeta
        ? Job.find({ isArchived: { $ne: true }, isPublished: true })
            .populate('employer', 'employerProfile.companyLogo employerProfile.industry employerProfile.companyName')
            .select('title companyName category employer')
            .lean()
        : Promise.resolve([]),
    ]);

    const allJobIds = allJobs.map((job) => job._id);
    const applicationCounts = await Application.aggregate([
      { $match: { job: { $in: allJobIds } } },
      { $group: { _id: '$job', count: { $sum: 1 } } },
    ]);

    const countMap = applicationCounts.reduce((acc, row) => {
      acc[String(row._id)] = row.count;
      return acc;
    }, {});

    const transformedJobs = allJobs.map((job) => {
      const employerProfile = job?.employer?.employerProfile || {};
      const companyLogo = job.companyLogo || employerProfile.companyLogo || '';
      const category = job.category || employerProfile.industry || 'N/A';
      return {
        ...job,
        companyLogo,
        category,
        applicantCount: countMap[String(job._id)] || job.applicationCount || 0,
        adminStatus: getAdminJobOfferStatus(job),
      };
    });

    const optionSourceJobs = optionJobs.map((job) => {
      const employerProfile = job?.employer?.employerProfile || {};
      return {
        ...job,
        category: job.category || employerProfile.industry || 'N/A',
      };
    });

    const stats = transformedJobs.reduce(
      (acc, job) => {
        acc.totalJobs += 1;
        if (job.adminStatus === 'Open') acc.active += 1;
        if (job.adminStatus === 'Closed') acc.closed += 1;
        if (job.adminStatus === 'Expired') acc.expired += 1;
        if (job.adminStatus === 'Filled') acc.filled += 1;
        return acc;
      },
      { totalJobs: 0, active: 0, closed: 0, expired: 0, filled: 0 }
    );

    const statusFilteredJobs = status
      ? transformedJobs.filter((job) => String(job.adminStatus || '').toLowerCase() === status)
      : transformedJobs;

    const total = statusFilteredJobs.length;
    const totalPages = showAll ? 1 : Math.max(1, Math.ceil(total / limit));
    const safePage = showAll ? 1 : Math.min(page, totalPages);
    const paginatedJobs = showAll
      ? statusFilteredJobs
      : statusFilteredJobs.slice((safePage - 1) * limit, safePage * limit);

    const uniqueSorted = (values) => [...new Set(values.map((v) => String(v || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));

    return res.status(200).json({
      success: true,
      jobs: paginatedJobs,
      ...(includeMeta ? {
        stats,
        options: {
          companies: uniqueSorted(optionSourceJobs.map((job) => job.companyName)),
          industries: uniqueSorted(optionSourceJobs.map((job) => job.category)),
          jobTitles: uniqueSorted(optionSourceJobs.map((job) => job.title)),
        },
      } : {}),
      pagination: {
        page: safePage,
        limit: showAll ? 'all' : limit,
        total,
        totalPages,
        hasPrevPage: safePage > 1,
        hasNextPage: safePage < totalPages,
      },
    });
  } catch (error) {
    console.error('Error fetching admin job offers:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching admin job offers',
    });
  }
};


// ==========================
// ✅ ADMIN ARCHIVE MANAGEMENT
// ==========================
const escapeArchiveRegex = (value = '') =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getArchiveUserName = (user = {}) => {
  const employerName = user?.employerProfile?.companyName || user?.companyName || '';
  const fullName = user?.fullName || [user?.firstName, user?.middleName, user?.lastName].filter(Boolean).join(' ');
  return employerName || fullName || user?.email || 'User';
};

const getArchiveAccountHolderName = (user = {}) => {
  const fullName =
    user?.fullName ||
    [user?.firstName, user?.middleName, user?.lastName, user?.extensionName]
      .map((part) => String(part || '').trim())
      .filter(Boolean)
      .join(' ');

  return fullName || user?.email || user?.username || 'Archived account';
};

const getArchiveContactNumber = (user = {}) => {
  if (String(user?.role || '').toLowerCase() === 'employer') {
    return (
      user?.employerProfile?.mobileNumber ||
      user?.mobileNumber ||
      user?.phoneNumber ||
      user?.phone ||
      ''
    );
  }

  return (
    user?.jobSeekerProfile?.phoneNumber ||
    user?.phoneNumber ||
    user?.mobileNumber ||
    user?.phone ||
    ''
  );
};

const getArchiveCompanyName = (source = {}) => {
  const employer = source?.employer || source?.job?.employer || source;
  return (
    source?.companyName ||
    source?.job?.companyName ||
    employer?.employerProfile?.companyName ||
    employer?.companyName ||
    getArchiveUserName(employer)
  );
};

const getArchiveUserStatus = (user = {}) => {
  const role = String(user.role || '').toLowerCase();
  const employerStatus = user?.employerProfile?.verificationDocs?.overallStatus;
  const seekerStatus =
    user?.jobSeekerProfile?.verificationDocs?.overallStatus ||
    user?.jobSeekerProfile?.verificationStatus;
  const raw = role === 'employer' ? employerStatus : seekerStatus;
  const status = String(raw || user.status || '').toLowerCase();

  if (['rejected', 'declined', 'deleted', 'suspended'].includes(status)) return 'Declined';
  return 'Declined';
};

const getArchiveJobStatus = (job = {}) => {
  const now = new Date();
  const deadline = job?.applicationDeadline ? new Date(job.applicationDeadline) : null;
  if (deadline && !Number.isNaN(deadline.getTime()) && deadline < now) return 'Expired';
  return 'Closed';
};


const countArchiveSkills = (value) => {
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => {
        if (item && typeof item === 'object') {
          const skill = String(item.skill || item.name || '').trim();
          return skill ? [skill] : [];
        }

        const clean = String(item || '').trim();
        if (!clean) return [];
        if (clean.includes('||')) {
          return clean.split('||').map((entry) => entry.trim()).filter(Boolean);
        }
        return [clean];
      })
      .filter(Boolean).length;
  }

  const clean = String(value || '').trim();
  if (!clean) return 0;
  if (clean.includes('||')) {
    return clean.split('||').map((entry) => entry.trim()).filter(Boolean).length;
  }
  if (/\s[—-]\s(Basic|Novice|Intermediate|Advanced|Expert)$/i.test(clean)) return 1;
  return clean.split(',').map((entry) => entry.trim()).filter(Boolean).length;
};

const hasMeaningfulArchiveObjectValue = (item = {}) =>
  Boolean(
    item &&
      typeof item === 'object' &&
      Object.entries(item).some(([key, value]) => {
        if (['_id', 'id', 'createdAt', 'updatedAt', '__v'].includes(key)) return false;
        if (Array.isArray(value)) return value.length > 0;
        if (value && typeof value === 'object') return hasMeaningfulArchiveObjectValue(value);
        return Boolean(String(value ?? '').trim());
      })
  );

const getArchiveJobSeekerLevel = (user = {}) => {
  const profile = user.jobSeekerProfile || {};
  const counts = {
    skills:
      countArchiveSkills(profile.technicalSkills) +
      countArchiveSkills(profile.softSkills),
    certifications: Array.isArray(profile.certifications)
      ? profile.certifications.filter(hasMeaningfulArchiveObjectValue).length
      : 0,
    projects: Array.isArray(profile.projects)
      ? profile.projects.filter(hasMeaningfulArchiveObjectValue).length
      : 0,
    seminars: Array.isArray(profile.seminars)
      ? profile.seminars.filter(hasMeaningfulArchiveObjectValue).length
      : 0,
    awards: Array.isArray(profile.awards)
      ? profile.awards.filter(hasMeaningfulArchiveObjectValue).length
      : 0,
    work: Array.isArray(profile.workExperiences) ? profile.workExperiences.length : 0,
  };

  const tiers = [
    {
      name: 'First Time Job Seeker',
      requirements: { skills: 0, certifications: 0, projects: 0, seminars: 0, awards: 0, work: 0 },
    },
    {
      name: 'Intermediate',
      requirements: { skills: 5, certifications: 1, projects: 1, seminars: 1, awards: 1, work: 0 },
    },
    {
      name: 'Expert',
      requirements: { skills: 9, certifications: 2, projects: 2, seminars: 2, awards: 2, work: 1 },
    },
    {
      name: 'Pro',
      requirements: { skills: 13, certifications: 5, projects: 5, seminars: 5, awards: 5, work: 2 },
    },
    {
      name: 'Legend',
      requirements: { skills: 17, certifications: 7, projects: 7, seminars: 7, awards: 7, work: 3 },
    },
  ];

  let currentLevel = tiers[0].name;
  tiers.forEach((tier) => {
    const passed = Object.entries(tier.requirements).every(
      ([key, required]) => counts[key] >= required
    );
    if (passed) currentLevel = tier.name;
  });

  return currentLevel;
};

const buildArchiveDateMatch = (dateFilter, field = 'updatedAt') => {
  const value = String(dateFilter || 'all').toLowerCase();
  if (value === 'all') return {};
  const now = new Date();
  const start = new Date(now);

  if (value === 'today') start.setHours(0, 0, 0, 0);
  else if (value === '7days') start.setDate(start.getDate() - 7);
  else if (value === '30days') start.setDate(start.getDate() - 30);
  else return {};

  return { [field]: { $gte: start, $lte: now } };
};

exports.getAdminArchive = async (req, res) => {
  try {
    const q = String(req.query.q || '').trim().toLowerCase();
    const roleFilter = String(req.query.role || 'all').trim().toLowerCase();
    const typeFilter = String(req.query.type || 'all').trim().toLowerCase();
    const campusFilter = String(req.query.campus || 'all').trim();
    const courseFilter = String(req.query.course || 'all').trim();
    const companyFilter = String(req.query.company || 'all').trim();
    const industryFilter = String(req.query.industry || 'all').trim();
    const dateFilter = String(req.query.date || 'all').trim().toLowerCase();
    const customFrom = String(req.query.dateFrom || '').trim();
    const customTo = String(req.query.dateTo || '').trim();
    const sort = String(req.query.sort || 'newest').trim().toLowerCase();

    const archiveUserFields = [
      'email',
      'username',
      'firstName',
      'middleName',
      'lastName',
      'extensionName',
      'profileImage',
      'role',
      'status',
      'isActive',
      'lastLogin',
      'inactiveBySystem',
      'inactiveAt',
      'inactiveReason',
      'inactiveThresholdMonths',
      'createdAt',
      'updatedAt',
      'jobSeekerProfile.campus',
      'jobSeekerProfile.course',
      'jobSeekerProfile.program',
      'jobSeekerProfile.educationEntries',
      'jobSeekerProfile.address',
      'jobSeekerProfile.phoneNumber',
      'employerProfile.companyName',
      'employerProfile.companyLogo',
      'employerProfile.industry',
      'employerProfile.businessType',
      'employerProfile.companyAddress',
      'employerProfile.regionCity',
      'employerProfile.address',
      'employerProfile.mobileNumber',
      'phoneNumber',
      'mobileNumber',
      'phone',
    ].join(' ');

    const getDateBounds = () => {
      const now = new Date();
      let start = null;
      let end = new Date(now);
      end.setHours(23, 59, 59, 999);

      if (dateFilter === 'today') {
        start = new Date(now);
        start.setHours(0, 0, 0, 0);
      } else if (dateFilter === 'yesterday') {
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
      } else if (dateFilter === 'thisweek') {
        const dayOfWeek = now.getDay();
        const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - mondayOffset);
        start.setHours(0, 0, 0, 0);
      } else if (dateFilter === '7days') {
        start = new Date(now);
        start.setDate(start.getDate() - 6);
        start.setHours(0, 0, 0, 0);
      } else if (dateFilter === 'thismonth') {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        start.setHours(0, 0, 0, 0);
      } else if (dateFilter === 'lastmonth') {
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      } else if (dateFilter === 'thisyear') {
        start = new Date(now.getFullYear(), 0, 1);
        start.setHours(0, 0, 0, 0);
      } else if (dateFilter === 'lastyear') {
        start = new Date(now.getFullYear() - 1, 0, 1);
        end = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
      } else if (dateFilter === 'custom') {
        start = customFrom ? new Date(`${customFrom}T00:00:00`) : null;
        end = customTo ? new Date(`${customTo}T23:59:59.999`) : end;
      }

      return { start, end };
    };

    const { start, end } = getDateBounds();
    const isWithinDate = (value) => {
      if (dateFilter === 'all') return true;
      const date = new Date(value || 0);
      if (Number.isNaN(date.getTime())) return false;
      if (start && date < start) return false;
      if (end && date > end) return false;
      return true;
    };

    const getCourse = (user = {}) => {
      const profile = user.jobSeekerProfile || {};
      const education = Array.isArray(profile.educationEntries) ? profile.educationEntries : [];
      const entry = education.find((item) => item?.course || item?.program || item?.degree);
      return (
        profile.course ||
        profile.program ||
        entry?.course ||
        entry?.program ||
        entry?.degree ||
        ''
      );
    };

    const getCampus = (user = {}) => {
      const profile = user.jobSeekerProfile || {};
      const education = Array.isArray(profile.educationEntries) ? profile.educationEntries : [];
      return profile.campus || education.find((item) => item?.campus)?.campus || '';
    };

    const getSecondaryText = (user = {}) => user?.email || '';

    const typeDefinitions = {
      'inactive-account': {
        key: 'inactive-account',
        label: 'Inactive Account',
        order: 1,
      },
      'job-post': { key: 'job-post', label: 'Job Post', order: 2 },
      'declined-applicants': {
        key: 'declined-applicants',
        label: 'Declined Applicants',
        order: 3,
      },
    };

    const grouped = new Map();

    const ensureGroup = (account) => {
      if (!account?._id || String(account.role || '').toLowerCase() !== 'employer') return null;
      const accountId = String(account._id);

      if (!grouped.has(accountId)) {
        const role = String(account.role || '').toLowerCase();
        const employerProfile = account.employerProfile || {};

        grouped.set(accountId, {
          accountId,
          account,
          displayName: getArchiveAccountHolderName(account),
          secondaryText: getSecondaryText(account),
          contactNumber: getArchiveContactNumber(account),
          role,
          campus: role === 'jobseeker' ? getCampus(account) : '',
          course: role === 'jobseeker' ? getCourse(account) : '',
          company:
            role === 'employer'
              ? employerProfile.companyName || account.companyName || ''
              : '',
          industry:
            role === 'employer'
              ? employerProfile.industry || employerProfile.businessType || ''
              : '',
          records: [],
          searchableText: [],
          latestArchivedAt: null,
        });
      }

      return grouped.get(accountId);
    };

    const addRecord = (account, record) => {
      if (!record?.archiveType || !isWithinDate(record.archivedAt)) return;
      const group = ensureGroup(account);
      if (!group) return;

      group.records.push(record);
      group.searchableText.push(
        [
          record.typeLabel,
          record.title,
          record.content,
          record.postContent,
          record.searchText,
        ]
          .filter(Boolean)
          .join(' ')
      );

      if (
        !group.latestArchivedAt ||
        new Date(record.archivedAt || 0) > new Date(group.latestArchivedAt || 0)
      ) {
        group.latestArchivedAt = record.archivedAt;
      }
    };

    const [archivedJobs, archivedDeclinedApplications, inactiveUsers] =
      await Promise.all([
        Job.find({
          $or: [{ isArchived: true }, { archivedAt: { $ne: null } }],
        })
          .populate('employer', archiveUserFields)
          .select(
            'title companyName companyLogo employer status vacancies isActive isPublished isArchived archivedAt applicationDeadline createdAt updatedAt'
          )
          .lean(),
        Application.find({
          status: 'declined',
          isDeclinedArchived: true,
        })
          .populate('employer', archiveUserFields)
          .populate('job', 'title companyName')
          .populate('jobseeker', 'email firstName middleName lastName fullName')
          .select(
            'employer job jobseeker status hiringStage lastActiveStatus declinedFrom declinedArchivedAt reviewedAt updatedAt'
          )
          .lean(),
        User.find({
          role: 'employer',
          status: 'inactive',
          isActive: false,
          inactiveBySystem: true,
        })
          .select(archiveUserFields)
          .lean(),
      ]);

    archivedJobs.forEach((job) => {
      addRecord(job.employer, {
        archiveType: 'job-post',
        typeLabel: 'Job Post',
        title: job.title || 'Unfinished Posting',
        archivedAt: job.archivedAt || job.updatedAt,
        searchText: [job.companyName, job.status].filter(Boolean).join(' '),
      });
    });

    archivedDeclinedApplications.forEach((application) => {
      const jobTitle = application.job?.title || 'Archived Job';
      const jobseekerName = getArchiveUserName(application.jobseeker || {});
      addRecord(application.employer, {
        archiveType: 'declined-applicants',
        typeLabel: 'Declined Applicants',
        title: jobTitle,
        archivedAt:
          application.declinedArchivedAt || application.reviewedAt || application.updatedAt,
        searchText: [jobTitle, jobseekerName, application.hiringStage].filter(Boolean).join(' '),
      });
    });

    inactiveUsers.forEach((user) => {
      addRecord(user, {
        archiveType: 'inactive-account',
        typeLabel: 'Inactive Account',
        title: 'Inactive Account',
        archivedAt: user.inactiveAt || user.updatedAt || user.lastLogin || user.createdAt,
        searchText: [user.status, user.email, user.inactiveReason].filter(Boolean).join(' '),
      });
    });

    let archiveGroups = Array.from(grouped.values()).map((group) => {
      const archivedTypeKeys = [...new Set(group.records.map((record) => record.archiveType))];
      const hasInactiveAccount = archivedTypeKeys.includes('inactive-account');
      const visibleArchivedTypeKeys = hasInactiveAccount
        ? ['inactive-account']
        : archivedTypeKeys;
      const archivedTypes = visibleArchivedTypeKeys
        .map((key) => typeDefinitions[key])
        .filter(Boolean)
        .sort((first, second) => first.order - second.order)
        .map(({ order, ...type }) => type);

      return {
        accountId: group.accountId,
        account: group.account,
        displayName: group.displayName,
        secondaryText: group.secondaryText,
        contactNumber: group.contactNumber,
        role: group.role,
        campus: group.campus,
        course: group.course,
        company: group.company,
        industry: group.industry,
        archivedTypes,
        latestArchivedAt: group.latestArchivedAt,
        recordCount: group.records.length,
        searchableText: group.searchableText,
      };
    });

    const uniqueSortedArchiveValues = (values = []) =>
      [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))].sort(
        (first, second) => first.localeCompare(second)
      );

    const archiveFilterOptions = {
      campuses: uniqueSortedArchiveValues(
        archiveGroups
          .filter((group) => group.role === 'jobseeker')
          .map((group) => group.campus)
      ),
      courses: uniqueSortedArchiveValues(
        archiveGroups
          .filter((group) => group.role === 'jobseeker')
          .map((group) => group.course)
      ),
      companies: uniqueSortedArchiveValues(
        archiveGroups
          .filter((group) => group.role === 'employer')
          .map((group) => group.company)
      ),
      industries: uniqueSortedArchiveValues(
        archiveGroups
          .filter((group) => group.role === 'employer')
          .map((group) => group.industry)
      ),
    };

    if (roleFilter !== 'all') {
      archiveGroups = archiveGroups.filter((group) => group.role === roleFilter);
    }

    if (campusFilter.toLowerCase() !== 'all') {
      archiveGroups = archiveGroups.filter(
        (group) =>
          String(group.campus || '').toLowerCase() === campusFilter.toLowerCase()
      );
    }

    if (courseFilter.toLowerCase() !== 'all') {
      archiveGroups = archiveGroups.filter(
        (group) =>
          String(group.course || '').toLowerCase() === courseFilter.toLowerCase()
      );
    }

    if (companyFilter.toLowerCase() !== 'all') {
      archiveGroups = archiveGroups.filter(
        (group) =>
          String(group.company || '').toLowerCase() === companyFilter.toLowerCase()
      );
    }

    if (industryFilter.toLowerCase() !== 'all') {
      archiveGroups = archiveGroups.filter(
        (group) =>
          String(group.industry || '').toLowerCase() === industryFilter.toLowerCase()
      );
    }

    if (typeFilter !== 'all') {
      archiveGroups = archiveGroups.filter((group) =>
        group.archivedTypes.some((type) => type.key === typeFilter)
      );
    }

    if (q) {
      archiveGroups = archiveGroups.filter((group) => {
        const searchable = [
          group.displayName,
          group.secondaryText,
          group.role,
          group.campus,
          group.course,
          group.company,
          group.industry,
          group.account?.email,
          group.contactNumber,
          ...group.archivedTypes.map((type) => type.label),
          ...group.searchableText,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return searchable.includes(q);
      });
    }

    archiveGroups.sort((first, second) => {
      if (sort === 'oldest') {
        return new Date(first.latestArchivedAt || 0) - new Date(second.latestArchivedAt || 0);
      }
      if (sort === 'name_asc' || sort === 'name-asc') {
        return first.displayName.localeCompare(second.displayName);
      }
      if (sort === 'name_desc' || sort === 'name-desc') {
        return second.displayName.localeCompare(first.displayName);
      }
      return new Date(second.latestArchivedAt || 0) - new Date(first.latestArchivedAt || 0);
    });

    archiveGroups = archiveGroups.map(({ searchableText, ...group }) => group);

    return res.json({
      success: true,
      archiveGroups,
      total: archiveGroups.length,
      options: {
        roles: ['jobseeker', 'employer'],
        types: Object.values(typeDefinitions)
          .sort((first, second) => first.order - second.order)
          .map(({ order, ...type }) => type),
        campuses: archiveFilterOptions.campuses,
        courses: archiveFilterOptions.courses,
        companies: archiveFilterOptions.companies,
        industries: archiveFilterOptions.industries,
      },
    });
  } catch (error) {
    console.error('Error loading admin archive:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load admin archive',
    });
  }
};



const getAdminArchivedJobStatus = (job = {}) => {
  const statusBeforeArchive = String(job?.statusBeforeArchive || '').trim().toLowerCase();
  if (['open', 'closed', 'filled', 'expired'].includes(statusBeforeArchive)) {
    return statusBeforeArchive;
  }

  const storedStatus = String(job?.status || '').trim().toLowerCase();
  if (storedStatus === 'filled') return 'filled';
  if (storedStatus === 'closed') return 'closed';

  const deadline = new Date(job?.applicationDeadline || 0);
  if (!Number.isNaN(deadline.getTime()) && deadline.getTime() < Date.now()) {
    return 'expired';
  }

  if (storedStatus === 'published' || job?.isPublished === true) {
    return 'open';
  }

  return 'closed';
};

exports.getAdminArchiveDetails = async (req, res) => {
  try {
    const type = String(req.params.type || '').toLowerCase();
    const { id } = req.params;


    if (type === 'account') {
      const archiveUserFields = [
        'email',
        'username',
        'firstName',
        'middleName',
        'lastName',
        'extensionName',
        'profileImage',
        'role',
        'status',
        'isActive',
        'lastLogin',
        'inactiveBySystem',
        'inactiveAt',
        'inactiveReason',
        'inactiveThresholdMonths',
        'createdAt',
        'updatedAt',
        'jobSeekerProfile',
        'employerProfile',
      ].join(' ');

      const account = await User.findById(id).select(archiveUserFields).lean();

      if (!account || account.role === 'admin') {
        return res.status(404).json({
          success: false,
          message: 'Archived account not found',
        });
      }

      const [archivedJobs, archivedDeclinedApplications] = await Promise.all([
        account.role === 'employer'
          ? Job.find({
              employer: id,
              $or: [{ isArchived: true }, { archivedAt: { $ne: null } }],
            })
              .select(
                'title companyName companyLogo employer status statusBeforeArchive vacancies applicationDeadline isActive isPublished isArchived archivedAt createdAt updatedAt'
              )
              .lean()
          : [],
        account.role === 'employer'
          ? Application.find({
              employer: id,
              status: 'declined',
              isDeclinedArchived: true,
            })
              .populate('job', 'title companyName companyLogo vacancies status statusBeforeArchive applicationDeadline isActive isPublished isArchived')
              .select(
                'job jobseeker employer status hiringStage lastActiveStatus declinedFrom declineReason declineComment appliedAt reviewedAt updatedAt activityHistory isDeclinedArchived declinedArchivedAt resumeSnapshot'
              )
              .sort({ declinedArchivedAt: -1, updatedAt: -1 })
              .lean()
          : [],
      ]);

      // Keep the raw Application.jobseeker ObjectId instead of relying on populate().
      // Archived applications can outlive profile changes, so resolve the current
      // Jobseeker account by ObjectId first and then by the stored resume snapshot email.
      const archivedJobseekerIds = [
        ...new Set(
          archivedDeclinedApplications
            .map((application) => String(application?.jobseeker || '').trim())
            .filter(Boolean)
        ),
      ];

      const getSnapshotUser = (application = {}) => {
        const snapshot = application?.resumeSnapshot || {};
        return snapshot?.user && typeof snapshot.user === 'object'
          ? snapshot.user
          : {};
      };

      const snapshotEmails = [
        ...new Set(
          archivedDeclinedApplications
            .map((application) =>
              String(getSnapshotUser(application)?.email || '')
                .trim()
                .toLowerCase()
            )
            .filter(Boolean)
        ),
      ];

      const [archivedJobseekersById, archivedJobseekersByEmail] = await Promise.all([
        archivedJobseekerIds.length
          ? User.find({
              _id: { $in: archivedJobseekerIds },
              role: 'jobseeker',
            })
              .select('email firstName middleName lastName fullName profileImage jobSeekerProfile')
              .lean()
          : [],
        snapshotEmails.length
          ? User.find({
              role: 'jobseeker',
              email: { $in: snapshotEmails },
            })
              .select('email firstName middleName lastName fullName profileImage jobSeekerProfile')
              .lean()
          : [],
      ]);

      const archivedJobseekerByIdMap = new Map(
        archivedJobseekersById.map((user) => [String(user._id), user])
      );
      const archivedJobseekerByEmailMap = new Map(
        archivedJobseekersByEmail.map((user) => [
          String(user.email || '').trim().toLowerCase(),
          user,
        ])
      );

      const archivedJobIds = archivedJobs.map((job) => job._id);
      const applicantCountRows = archivedJobIds.length
        ? await Application.aggregate([
            { $match: { job: { $in: archivedJobIds } } },
            { $group: { _id: '$job', count: { $sum: 1 } } },
          ])
        : [];
      const applicantCountByJob = new Map(
        applicantCountRows.map((row) => [String(row._id), Number(row.count || 0)])
      );

      const records = [];

      archivedJobs.forEach((job) => {
        records.push({
          recordId: `job-${job._id}`,
          archiveType: 'job-post',
          typeLabel: 'Job Post',
          title: job.title || 'Unfinished Posting',
          subtitle: '',
          archivedAt: job.archivedAt || job.updatedAt,
          jobId: String(job._id),
          companyName: job.companyName || getArchiveUserName(account),
          companyLogo: job.companyLogo || account.employerProfile?.companyLogo || '',
          vacancies: Number(job.vacancies || 0),
          applicantCount: applicantCountByJob.get(String(job._id)) || 0,
          status: getAdminArchivedJobStatus(job),
        });
      });

      const declinedByJob = new Map();

      archivedDeclinedApplications.forEach((application) => {
        const jobId = String(application.job?._id || application.job || 'unknown-job');
        const jobTitle = application.job?.title || 'Archived Job';
        const archivedAt =
          application.declinedArchivedAt || application.reviewedAt || application.updatedAt;

        if (!declinedByJob.has(jobId)) {
          declinedByJob.set(jobId, {
            recordId: `declined-${jobId}`,
            archiveType: 'declined-applicants',
            typeLabel: 'Declined Applicants',
            title: jobTitle,
            subtitle: '',
            archivedAt,
            jobId: jobId === 'unknown-job' ? '' : jobId,
            companyName: application.job?.companyName || getArchiveUserName(account),
            companyLogo: application.job?.companyLogo || account.employerProfile?.companyLogo || '',
            vacancies: Number(application.job?.vacancies || 0),
            applicantCount: 0,
            status: getAdminArchivedJobStatus(application.job || {}),
            applicants: [],
          });
        }

        const group = declinedByJob.get(jobId);
        if (new Date(archivedAt || 0) > new Date(group.archivedAt || 0)) {
          group.archivedAt = archivedAt;
        }

        const rawJobseekerId = String(application?.jobseeker || '').trim();
        const snapshotUser = getSnapshotUser(application);
        const snapshotEmail = String(snapshotUser?.email || '').trim().toLowerCase();
        const resolvedJobseeker =
          archivedJobseekerByIdMap.get(rawJobseekerId) ||
          archivedJobseekerByEmailMap.get(snapshotEmail) ||
          null;
        const jobseeker = resolvedJobseeker || snapshotUser || {};
        const profile = jobseeker.jobSeekerProfile || {};
        const resolvedJobseekerId = String(
          resolvedJobseeker?._id || ''
        ).trim();
        const declinedActivity = [...(Array.isArray(application.activityHistory)
          ? application.activityHistory
          : [])]
          .reverse()
          .find(
            (activity) =>
              String(activity?.type || '').toLowerCase() === 'declined' ||
              String(activity?.toStatus || '').toLowerCase() === 'declined'
          );
        const declinedStage =
          application.declinedFrom === 'forInterview' ||
          application.lastActiveStatus === 'for interview'
            ? 'Interview'
            : 'Screening';

        group.applicants.push({
          applicationId: String(application._id),
          _id: String(application._id),
          jobseekerId: resolvedJobseekerId,
          applicantName:
            jobseeker.fullName ||
            [jobseeker.firstName, jobseeker.middleName, jobseeker.lastName]
              .filter(Boolean)
              .join(' ') ||
            jobseeker.email ||
            'Jobseeker',
          email: jobseeker.email || snapshotUser.email || '',
          profileImage: jobseeker.profileImage || profile.profileImage || snapshotUser.profileImage || '',
          jobTitle,
          jobSeekerLevel: getArchiveJobSeekerLevel(jobseeker),
          declinedStage,
          declineReason: application.declineReason || '',
          declineComment: application.declineComment || '',
          appliedAt: application.appliedAt,
          declinedAt:
            declinedActivity?.occurredAt || application.reviewedAt || application.updatedAt,
          archivedAt,
        });

        group.applicantCount = group.applicants.length;
      });

      records.push(...declinedByJob.values());

      const isInactive =
        account.role === 'employer' &&
        account.inactiveBySystem === true &&
        account.status === 'inactive' &&
        account.isActive === false;
      if (isInactive) {
        records.push({
          recordId: `inactive-${account._id}`,
          archiveType: 'inactive-account',
          typeLabel: 'Inactive Account',
          title: 'Account Details',
          subtitle: account.role === 'employer' ? 'Employer account' : 'Jobseeker account',
          archivedAt: account.inactiveAt || account.updatedAt || account.lastLogin || account.createdAt,
          accountId: String(account._id),
          inactiveReason: account.inactiveReason || '',
          inactiveThresholdMonths: account.inactiveThresholdMonths || null,
        });
      }

      records.sort(
        (first, second) =>
          new Date(second.archivedAt || 0) - new Date(first.archivedAt || 0)
      );

      const jobSeekerProfile = account.jobSeekerProfile || {};
      const employerProfile = account.employerProfile || {};
      const educationEntries = Array.isArray(jobSeekerProfile.educationEntries)
        ? jobSeekerProfile.educationEntries
        : [];
      const educationItem = educationEntries.find(
        (entry) => entry?.course || entry?.program || entry?.degree
      );

      const industryOrCourse =
        account.role === 'employer'
          ? employerProfile.industry || employerProfile.businessType || 'Unspecified'
          : jobSeekerProfile.course ||
            jobSeekerProfile.program ||
            educationItem?.course ||
            educationItem?.program ||
            educationItem?.degree ||
            'Unspecified';

      const location =
        account.role === 'employer'
          ? employerProfile.companyAddress ||
            employerProfile.regionCity ||
            employerProfile.address ||
            'Unspecified'
          : jobSeekerProfile.campus ||
            educationEntries.find((entry) => entry?.campus)?.campus ||
            jobSeekerProfile.address ||
            'Unspecified';

      const graduationYear =
        jobSeekerProfile.yearGraduated ||
        educationEntries.find((entry) => entry?.yearGraduated || entry?.endYear)?.yearGraduated ||
        educationEntries.find((entry) => entry?.yearGraduated || entry?.endYear)?.endYear ||
        '';

      const lastActive = account.lastLogin || account.createdAt;
      const lastActiveDate = new Date(lastActive || 0);
      const inactivityDays = Number.isNaN(lastActiveDate.getTime())
        ? 0
        : Math.max(0, Math.floor((Date.now() - lastActiveDate.getTime()) / 86400000));

      return res.json({
        success: true,
        account,
        records,
        summary: {
          industryOrCourse,
          location,
          lastActive,
          inactivityDays,
          graduationYear,
          inactiveAt: account.inactiveAt || null,
          inactiveReason: account.inactiveReason || '',
          inactiveThresholdMonths: account.inactiveThresholdMonths || null,
          latestArchivedAt: records[0]?.archivedAt || null,
        },
      });
    }

    if (type === 'job') {
      let job = await Job.findById(id)
        .populate(
          'employer',
          'email firstName middleName lastName fullName employerProfile.companyName employerProfile.companyLogo employerProfile.companyAddress employerProfile.industry employerProfile.companyWebsiteUrl employerProfile.companyWebsite'
        )
        .lean();

      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Archived job not found',
        });
      }

      const employer = job.employer || {};
      const employerProfile = employer.employerProfile || {};
      job = {
        ...job,
        companyName:
          job.companyName || employerProfile.companyName || getArchiveUserName(employer),
        companyLogo: job.companyLogo || employerProfile.companyLogo || '',
        employerDetails: {
          companyName: employerProfile.companyName || job.companyName || '',
          companyAddress: employerProfile.companyAddress || '',
          industry: employerProfile.industry || '',
          companyWebsite:
            employerProfile.companyWebsiteUrl || employerProfile.companyWebsite || '',
        },
      };

      const applications = await Application.find({
        job: id,
        status: 'declined',
      })
        .populate(
          'jobseeker',
          'email firstName middleName lastName fullName jobSeekerProfile'
        )
        .select(
          'jobseeker lastActiveStatus declinedFrom declineReason declineComment appliedAt reviewedAt updatedAt isDeclinedArchived declinedArchivedAt'
        )
        .sort({ reviewedAt: -1, updatedAt: -1 })
        .lean();

      const isDraft =
        String(job.status || '').toLowerCase() === 'draft' ||
        job.isPublished === false;

      const allApplications = isDraft
        ? []
        : await Application.find({ job: id })
            .populate(
              'jobseeker',
              'email firstName middleName lastName fullName profileImage jobSeekerProfile'
            )
            .sort({ appliedAt: -1, createdAt: -1 })
            .lean();

      const now = new Date();

      const isExpired =
        Boolean(job.applicationDeadline) &&
        new Date(job.applicationDeadline) < now;

      const isClosed =
        job.status === 'closed' ||
        job.isArchived === true ||
        Boolean(job.archivedAt) ||
        (job.isPublished === true && job.isActive === false);

      /*
       * A job with declined applicants must remain viewable even when the job
       * itself is still active and has not yet expired.
       */
      if (!isClosed && !isExpired && applications.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'This job is not part of the Jobs archive',
        });
      }

      const declinedApplicants = applications.map((application) => {
        const jobseeker = application.jobseeker || {};
        const profile = jobseeker.jobSeekerProfile || {};

        return {
          _id: application._id,
          applicantName:
            jobseeker.fullName ||
            [jobseeker.firstName, jobseeker.middleName, jobseeker.lastName]
              .filter(Boolean)
              .join(' ') ||
            jobseeker.email ||
            'Jobseeker',
          jobseekerLevel:
            profile.jobseekerLevel ||
            profile.jobSeekerLevel ||
            profile.experienceLevel ||
            profile.careerLevel ||
            'Not specified',
          declinedStage:
            application.declinedFrom === 'forInterview' ||
            application.lastActiveStatus === 'for interview'
              ? 'Interview'
              : 'Screening',
          declineReason: application.declineReason || '',
          declineComment: application.declineComment || '',
          appliedAt: application.appliedAt,
          declinedAt: application.reviewedAt || application.updatedAt,
          isDeclinedArchived: Boolean(application.isDeclinedArchived),
          declinedArchivedAt: application.declinedArchivedAt,
        };
      });

      return res.json({
        success: true,
        job,
        isClosed,
        isExpired,
        isDraft,
        applicants: allApplications,
        declinedApplicants,
      });
    }

    if (type === 'dormant-user') {
      const user = await User.findById(id)
        .select(
          'email username firstName middleName lastName fullName profileImage role status isActive lastLogin createdAt jobSeekerProfile employerProfile'
        )
        .lean();

      if (!user || user.role === 'admin') {
        return res.status(404).json({
          success: false,
          message: 'Dormant account not found',
        });
      }

      const now = new Date();
      const lastActive = user.lastLogin || user.createdAt;
      const activityDate = new Date(lastActive);

      let inactivityMonths =
        (now.getFullYear() - activityDate.getFullYear()) * 12 +
        (now.getMonth() - activityDate.getMonth());

      if (now.getDate() < activityDate.getDate()) inactivityMonths -= 1;
      inactivityMonths = Math.max(0, inactivityMonths);

      if (inactivityMonths < 6 || inactivityMonths > 12) {
        return res.status(404).json({
          success: false,
          message: 'This account is no longer within the 6–12 month dormant period',
        });
      }

      const jobSeekerProfile = user.jobSeekerProfile || {};
      const employerProfile = user.employerProfile || {};
      const educationEntries = Array.isArray(jobSeekerProfile.educationEntries)
        ? jobSeekerProfile.educationEntries
        : [];
      const educationItem = educationEntries.find(
        (entry) => entry?.course || entry?.program || entry?.degree
      );

      const industryOrCourse =
        user.role === 'employer'
          ? employerProfile.industry ||
            employerProfile.businessType ||
            'Unspecified'
          : jobSeekerProfile.course ||
            jobSeekerProfile.program ||
            educationItem?.course ||
            educationItem?.program ||
            educationItem?.degree ||
            'Unspecified';

      const location =
        user.role === 'employer'
          ? employerProfile.companyAddress ||
            employerProfile.regionCity ||
            employerProfile.address ||
            'Unspecified'
          : jobSeekerProfile.campus ||
            educationEntries.find((entry) => entry?.campus)?.campus ||
            jobSeekerProfile.address ||
            'Unspecified';

      const phoneNumber =
        user.role === 'employer'
          ? employerProfile.mobileNumber ||
            employerProfile.phoneNumber ||
            employerProfile.contactNumber ||
            '—'
          : jobSeekerProfile.mobileNumber ||
            jobSeekerProfile.phoneNumber ||
            user.phoneNumber ||
            '—';

      return res.json({
        success: true,
        user,
        lastActive,
        inactivityMonths,
        industryOrCourse,
        location,
        phoneNumber,
        dormantStatus: 'Dormant Account',
      });
    }

    if (type !== 'community-author') {
      return res.status(400).json({
        success: false,
        message: 'Unsupported archive detail type',
      });
    }

    const author = await User.findById(id)
      .select('email firstName middleName lastName fullName profileImage role jobSeekerProfile')
      .lean();

    if (!author) {
      return res.status(404).json({
        success: false,
        message: 'Community author not found',
      });
    }

    const posts = await CommunityPost.find({
      $or: [
        { author: id, isDeleted: true },
        { comments: { $elemMatch: { author: id, isDeleted: true } } },
      ],
    })
      .populate('deletedBy', 'email firstName middleName lastName fullName')
      .populate('comments.deletedBy', 'email firstName middleName lastName fullName')
      .sort({ deletedAt: -1, updatedAt: -1 })
      .lean();

    const items = [];

    posts.forEach((post) => {
      if (String(post.author) === String(id) && post.isDeleted === true) {
        items.push({
          _id: post._id,
          archiveType: 'post',
          content: post.content,
          category: post.category,
          topics: post.topics || [],
          imageUrl: post.imageUrl || '',
          linkUrl: post.linkUrl || '',
          deletedAt: post.deletedAt || post.updatedAt,
          deletedByName: getArchiveUserName(post.deletedBy || {}),
          postId: post._id,
        });
      }

      (post.comments || []).forEach((comment) => {
        if (String(comment.author) !== String(id) || comment.isDeleted !== true) return;
        items.push({
          _id: comment._id,
          archiveType: 'comment',
          content: comment.content,
          postContent: post.content,
          deletedAt: comment.deletedAt || comment.updatedAt,
          deletedByName: getArchiveUserName(comment.deletedBy || {}),
          postId: post._id,
          commentId: comment._id,
        });
      });
    });

    items.sort((a, b) => new Date(b.deletedAt || 0) - new Date(a.deletedAt || 0));

    const profile = author.jobSeekerProfile || {};
    const educationEntries = Array.isArray(profile.educationEntries)
      ? profile.educationEntries
      : [];
    const educationItem = educationEntries.find(
      (entry) => entry?.course || entry?.program || entry?.degree
    );

    return res.json({
      success: true,
      author: {
        ...author,
        campus:
          profile.campus ||
          educationEntries.find((entry) => entry?.campus)?.campus ||
          'Unspecified',
        course:
          profile.course ||
          profile.program ||
          educationItem?.course ||
          educationItem?.program ||
          educationItem?.degree ||
          'Unspecified',
      },
      items,
    });
  } catch (error) {
    console.error('Error loading admin archive details:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load archive details',
    });
  }
};

exports.restoreAdminArchiveItem = async (req, res) => {
  try {
    const type = String(req.params.type || '').toLowerCase();
    const { id } = req.params;


    if (type === 'community-post') {
      const post = await CommunityPost.findById(id);
      if (!post) return res.status(404).json({ success: false, message: 'Community post not found' });
      post.isDeleted = false;
      post.deletedAt = null;
      post.deletedBy = null;
      await post.save({ validateBeforeSave: false });
      return res.json({ success: true, message: 'Community post restored successfully', item: post });
    }

    if (type === 'community-comment') {
      const post = await CommunityPost.findOne({ 'comments._id': id });
      if (!post) return res.status(404).json({ success: false, message: 'Community comment not found' });
      const comment = post.comments.id(id);
      comment.isDeleted = false;
      comment.deletedAt = null;
      comment.deletedBy = null;
      post.commentsCount = post.comments.filter((item) => item.isDeleted !== true).length;
      await post.save({ validateBeforeSave: false });
      return res.json({ success: true, message: 'Community comment restored successfully', item: comment });
    }

    if (type === 'user') {
      const user = await User.findById(id);
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });

      const wasSystemInactive = user.inactiveBySystem === true;

      user.status = 'active';
      user.isActive = true;
      user.lastLogin = new Date();
      user.inactiveBySystem = false;
      user.inactiveAt = null;
      user.inactiveReason = '';
      user.inactiveThresholdMonths = null;

      if (user.role === 'employer' && !wasSystemInactive) {
        if (user.employerProfile?.verificationDocs) {
          user.employerProfile.verificationDocs.overallStatus = 'pending';
          user.employerProfile.verificationDocs.remarks = '';
          user.employerProfile.verificationDocs.rejectionReasons = [];
          user.employerProfile.verificationDocs.rejectionMessage = '';
        }
      }

      if (user.role === 'jobseeker') {
        if (user.jobSeekerProfile?.verificationDocs) {
          user.jobSeekerProfile.verificationDocs.overallStatus = 'pending';
          user.jobSeekerProfile.verificationDocs.rejectionReasons = [];
          user.jobSeekerProfile.verificationDocs.rejectionMessage = '';
        }
        if (user.jobSeekerProfile) {
          user.jobSeekerProfile.verificationStatus = 'pending';
        }
      }

      await user.save();
      return res.json({ success: true, message: 'User restored successfully', item: user });
    }

    if (type === 'job') {
      const job = await Job.findById(id);
      if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

      job.isArchived = false;
      job.archivedAt = null;
      job.isActive = true;
      job.isPublished = true;
      job.status = 'published';

      await job.save();
      return res.json({ success: true, message: 'Job restored successfully', item: job });
    }

    if (type === 'application') {
      const application = await Application.findById(id);
      if (!application) return res.status(404).json({ success: false, message: 'Application not found' });

      application.status = application.lastActiveStatus || 'pending';
      application.declineReason = '';
      application.declineComment = '';
      application.declinedFrom = '';
      application.reviewedAt = null;
      application.isDeclinedArchived = false;

      await application.save();
      return res.json({ success: true, message: 'Application restored successfully', item: application });
    }

    return res.status(400).json({ success: false, message: 'Invalid archive type' });
  } catch (error) {
    console.error('Error restoring archive item:', error);
    return res.status(500).json({ success: false, message: 'Failed to restore archive item' });
  }
};


exports.permanentlyDeleteAdminArchiveItem = async (req, res) => {
  try {
    const type = String(req.params.type || '').toLowerCase();
    const { id } = req.params;

    if (type === 'community-post') {
      const post = await CommunityPost.findOne({ _id: id, isDeleted: true });
      if (!post) return res.status(404).json({ success: false, message: 'Archived community post not found' });
      await post.deleteOne();
      return res.json({ success: true, message: 'Community post permanently deleted' });
    }

    if (type === 'community-comment') {
      const post = await CommunityPost.findOne({ 'comments._id': id });
      if (!post) return res.status(404).json({ success: false, message: 'Archived community comment not found' });
      const comment = post.comments.id(id);
      if (!comment || comment.isDeleted !== true) {
        return res.status(404).json({ success: false, message: 'Archived community comment not found' });
      }
      post.comments.pull(id);
      post.commentsCount = post.comments.filter((item) => item.isDeleted !== true).length;
      await post.save({ validateBeforeSave: false });
      return res.json({ success: true, message: 'Community comment permanently deleted' });
    }

    return res.status(400).json({ success: false, message: 'Permanent deletion is only available for archived community content' });
  } catch (error) {
    console.error('Error permanently deleting archive item:', error);
    return res.status(500).json({ success: false, message: 'Failed to permanently delete archive item' });
  }
};

// ==========================
// Verification resubmission lifecycle:
// Day 7 and Day 14 reminders. Verification remains on hold until the user resubmits or an admin takes action.
// ==========================
const getVerificationResubmitContext = (user) => {
  if (user?.role === 'jobseeker') {
    return {
      accountType: 'jobseeker',
      docs: user.jobSeekerProfile?.verificationDocs || null,
      labels: JOBSEEKER_DOC_LABELS,
      fullName: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.fullName || user.email,
    };
  }

  if (user?.role === 'employer') {
    return {
      accountType: 'employer',
      docs: user.employerProfile?.verificationDocs || null,
      labels: EMPLOYER_DOC_LABELS,
      fullName: user.employerProfile?.companyName || user.fullName || user.email,
    };
  }

  return null;
};

const getVerificationResubmitDocTypes = (resubmitRequest = {}, labels = {}) =>
  [...new Set(
    (Array.isArray(resubmitRequest.docTypes) && resubmitRequest.docTypes.length
      ? resubmitRequest.docTypes
      : [resubmitRequest.docType])
      .map((value) => String(value || '').trim())
      .filter((value) => labels[value])
  )];

const getVerificationResubmitEmailData = ({ user, context, requestedDocTypes, rawToken }) => {
  const request = context.docs.resubmitRequest || {};
  const documentReasons = Array.isArray(request.documentReasons)
    ? request.documentReasons
        .filter((item) => requestedDocTypes.includes(String(item?.docType || '').trim()))
        .map((item) => ({
          docType: String(item?.docType || '').trim(),
          docLabel: context.labels[String(item?.docType || '').trim()] || String(item?.docType || '').trim(),
          reason: String(item?.reason || '').trim(),
        }))
    : [];

  return {
    to: user.email,
    fullName: context.fullName,
    docLabel: context.labels[requestedDocTypes[0]] || requestedDocTypes[0],
    docLabels: requestedDocTypes.map((docType) => context.labels[docType] || docType),
    documentReasons,
    additionalMessage: String(request.additionalMessage || '').trim(),
    resubmitUrl: verificationResubmitFrontendUrl(context.accountType, rawToken),
  };
};

exports.processVerificationResubmissionLifecycle = async () => {
  const candidates = await User.find({
    $or: [
      {
        role: 'jobseeker',
        'jobSeekerProfile.verificationDocs.overallStatus': 'hold',
        'jobSeekerProfile.verificationDocs.resubmitRequest.requestedAt': { $ne: null },
        'jobSeekerProfile.verificationDocs.resubmitRequest.usedAt': null,
      },
      {
        role: 'employer',
        'employerProfile.verificationDocs.overallStatus': 'hold',
        'employerProfile.verificationDocs.resubmitRequest.requestedAt': { $ne: null },
        'employerProfile.verificationDocs.resubmitRequest.usedAt': null,
      },
    ],
  });

  const now = new Date();
  let reminderCount = 0;

  for (const user of candidates) {
    try {
      const context = getVerificationResubmitContext(user);
      const docs = context?.docs;
      const request = docs?.resubmitRequest;

      if (!context || !docs || !request || request.usedAt) continue;

      const requestedAt = request.requestedAt ? new Date(request.requestedAt) : null;
      if (!requestedAt || Number.isNaN(requestedAt.getTime())) continue;

      const requestedDocTypes = getVerificationResubmitDocTypes(request, context.labels);
      if (!requestedDocTypes.length) continue;

      const elapsedMs = now.getTime() - requestedAt.getTime();
      const rawToken = createVerificationResubmitToken({
        userId: user._id,
        requestedAt,
        docTypes: requestedDocTypes,
      });

      const reminderDay =
        elapsedMs >= RESUBMIT_REMINDER_DAY_14 && !request.reminder14SentAt
          ? 14
          : elapsedMs >= RESUBMIT_REMINDER_DAY_7 && !request.reminder7SentAt
            ? 7
            : 0;

      if (!reminderDay) {
        // Resubmission access no longer expires after 30 days. Clear any legacy
        // expiry value so older on-hold requests remain usable.
        if (request.expiresAt) {
          request.expiresAt = null;
          await user.save();
        }
        continue;
      }

      request.tokenHash = User.hashToken(rawToken);
      request.expiresAt = null;
      await user.save();

      await sendVerificationResubmissionReminderEmail({
        ...getVerificationResubmitEmailData({
          user,
          context,
          requestedDocTypes,
          rawToken,
        }),
        reminderDay,
      });

      if (reminderDay === 14) {
        request.reminder14SentAt = new Date();
      } else {
        request.reminder7SentAt = new Date();
      }

      await user.save();
      reminderCount += 1;
    } catch (error) {
      console.error(`Verification resubmission lifecycle error for user ${user?._id || 'unknown'}:`, error);
    }
  }

  return {
    checked: candidates.length,
    remindersSent: reminderCount,
    automaticallyDeclined: 0,
  };
};

// ==========================
// ✅ ADMIN EXCEL RECORD EXPORTS
// ==========================
const exportText = (value) => String(value ?? '').trim();

const exportDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-PH', {
    timeZone: 'Asia/Manila',
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  });
};

const exportFullName = (user = {}) =>
  [user.firstName, user.middleName, user.lastName, user.extensionName]
    .map(exportText)
    .filter(Boolean)
    .join(' ');

const exportAge = (birthday) => {
  if (!birthday) return '';
  const birthDate = new Date(birthday);
  if (Number.isNaN(birthDate.getTime())) return '';
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDelta = today.getMonth() - birthDate.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birthDate.getDate())) age -= 1;
  return age >= 0 && age <= 120 ? age : '';
};

const exportProfileValues = (user, field) => {
  const profile = user?.jobSeekerProfile || {};
  const entries = Array.isArray(profile.educationEntries) ? profile.educationEntries : [];
  const values = [];
  if (field === 'campus') {
    values.push(getJobseekerCampus(user));
    entries.forEach((entry) => values.push(entry?.campus));
  } else if (field === 'yearGraduated') {
    values.push(profile.yearGraduated);
    entries.forEach((entry) => values.push(entry?.yearGraduated));
  } else if (field === 'course') {
    values.push(profile.course);
    entries.forEach((entry) => values.push(entry?.course));
  } else if (field === 'gender') {
    values.push(profile.gender);
  }
  return [...new Set(values.map(exportText).filter(Boolean))];
};

const exportMatches = (values, selected) => {
  const normalizedSelected = exportText(selected).toLowerCase();
  if (!normalizedSelected || normalizedSelected === 'all') return true;
  return values.some((value) => exportText(value).toLowerCase() === normalizedSelected);
};

const exportInRange = (value, range) => {
  if (!range?.start && !range?.end) return true;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  if (range.start && date < range.start) return false;
  if (range.end && date > range.end) return false;
  return true;
};

const exportProcessingTime = (application = {}) => {
  const start = new Date(application.appliedAt || application.createdAt || '');
  const endValue = application.hiredAt || application.reviewedAt || application.updatedAt;
  const end = new Date(endValue || '');
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return '';
  const days = Math.max(0, Math.ceil((end.getTime() - start.getTime()) / 86400000));
  return `${days} ${days === 1 ? 'day' : 'days'}`;
};

const exportAddressParts = (profile = {}, employer = false) => {
  if (employer) {
    const locationParts = exportText(profile.regionCity)
      .split(' - ')
      .map((part) => exportText(part))
      .filter(Boolean);

    const storedRegion = exportText(profile.region);
    const storedProvince = exportText(profile.province);
    const storedCity = exportText(profile.cityMunicipality || profile.city || profile.municipality);

    return {
      region: storedRegion || locationParts[0] || '',
      province: storedProvince || locationParts[1] || '',
      city: storedCity || locationParts.slice(2).join(' - ') || '',
      street: exportText(profile.streetAddress || profile.companyAddress),
    };
  }

  const storedRegion = exportText(profile.region);
  const storedProvince = exportText(profile.province);
  const storedCity = exportText(profile.cityMunicipality || profile.cityProvince || profile.city || profile.municipality);
  const storedStreet = exportText(profile.streetAddress);

  if (storedRegion || storedProvince || storedCity || storedStreet) {
    return {
      region: storedRegion,
      province: storedProvince,
      city: storedCity,
      street: storedStreet || exportText(profile.address),
    };
  }

  const addressParts = exportText(profile.address)
    .split(',')
    .map((part) => exportText(part))
    .filter(Boolean);

  if (addressParts.length >= 4) {
    return {
      region: addressParts[addressParts.length - 1] || '',
      province: addressParts[addressParts.length - 2] || '',
      city: addressParts[addressParts.length - 3] || '',
      street: addressParts.slice(0, addressParts.length - 3).join(', '),
    };
  }

  return {
    region: '',
    province: '',
    city: '',
    street: exportText(profile.address),
  };
};

const styleExportWorksheet = (worksheet, title, headers, widths, options = {}) => {
  const titleRow = options.titleRow || 1;
  const generatedRow = titleRow + 1;
  const headerRowNumber = options.headerRow || titleRow + 3;

  worksheet.mergeCells(titleRow, 1, titleRow, headers.length);
  const titleCell = worksheet.getCell(titleRow, 1);
  titleCell.value = title;
  titleCell.font = { name: 'Arial', size: 13, bold: true };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(titleRow).height = 21;

  worksheet.mergeCells(generatedRow, 1, generatedRow, headers.length);
  const generatedCell = worksheet.getCell(generatedRow, 1);
  generatedCell.value = `Generated on: ${exportDate(new Date())}`;
  generatedCell.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF666666' } };
  generatedCell.alignment = { horizontal: 'center' };

  const headerRow = worksheet.getRow(headerRowNumber);
  headers.forEach((header, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = header;
    cell.font = { name: 'Arial', size: 9, bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF666666' } },
      left: { style: 'thin', color: { argb: 'FF666666' } },
      bottom: { style: 'thin', color: { argb: 'FF666666' } },
      right: { style: 'thin', color: { argb: 'FF666666' } },
    };
  });
  headerRow.height = 27;

  worksheet.columns = widths.map((width) => ({ width }));
  worksheet.views = [{ state: 'frozen', ySplit: headerRowNumber }];
  worksheet.autoFilter = { from: { row: headerRowNumber, column: 1 }, to: { row: headerRowNumber, column: headers.length } };
};

const addExportDataRows = (worksheet, startRow, rows) => {
  rows.forEach((values, rowIndex) => {
    const row = worksheet.getRow(startRow + rowIndex);
    values.forEach((value, columnIndex) => {
      const cell = row.getCell(columnIndex + 1);
      cell.value = value === undefined || value === null ? '' : value;
      cell.font = { name: 'Arial', size: 9 };
      cell.alignment = { vertical: 'top', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        right: { style: 'thin', color: { argb: 'FFD0D0D0' } },
      };
    });
    row.height = 30;
  });
};


const addApprovedBySection = (worksheet, startRow, columnCount = 3) => {
  const mergeEnd = Math.max(3, Math.min(columnCount, 5));
  worksheet.mergeCells(startRow, 1, startRow, mergeEnd);
  worksheet.mergeCells(startRow + 1, 1, startRow + 1, mergeEnd);
  worksheet.mergeCells(startRow + 2, 1, startRow + 2, mergeEnd);

  const labelCell = worksheet.getCell(startRow, 1);
  labelCell.value = 'APPROVED BY:';
  labelCell.font = { name: 'Arial', size: 9, italic: true };
  labelCell.alignment = { horizontal: 'center' };

  const nameCell = worksheet.getCell(startRow + 1, 1);
  nameCell.value = 'JAN KRISTINE A. INOCENCIO';
  nameCell.font = { name: 'Arial', size: 9, bold: true };
  nameCell.alignment = { horizontal: 'center' };

  const roleCell = worksheet.getCell(startRow + 2, 1);
  roleCell.value = 'LINKAGES MANAGER';
  roleCell.font = { name: 'Arial', size: 9 };
  roleCell.alignment = { horizontal: 'center' };
};

const normalizeAdminFilterRole = (value) => {
  const normalized = exportText(value).toLowerCase().replace(/[_-]+/g, ' ');
  if (!normalized || ['all', 'all roles', 'users'].includes(normalized)) return 'all';
  if (['employer', 'employers'].includes(normalized)) return 'employer';
  if (['job offer', 'job offers', 'joboffer', 'joboffers', 'jobs'].includes(normalized)) return 'jobOffer';
  if (['application', 'applications'].includes(normalized)) return 'application';
  if (['jobseeker', 'job seeker', 'job seekers'].includes(normalized)) return 'jobseeker';
  return 'all';
};

const filterRecordMatches = (value, selected) => {
  const target = exportText(selected).toLowerCase();
  if (!target || target === 'all') return true;
  return exportText(value).toLowerCase() === target;
};

const filterRecordIncludes = (value, selected) => {
  const target = exportText(selected).toLowerCase();
  if (!target || target === 'all') return true;
  return exportText(value).toLowerCase().includes(target);
};

const uniqueFilterValues = (records, key) =>
  [...new Set(records.map((record) => exportText(record?.[key])).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

const buildAdminFilterRecords = async (rawFilters = {}) => {
  const role = normalizeAdminFilterRole(rawFilters.role);
  const [users, jobs, applications] = await Promise.all([
    User.find({ status: { $ne: 'deleted' } }).select('-password').lean(),
    Job.find({}).lean(),
    Application.find({}).lean(),
  ]);

  const userById = new Map(users.map((user) => [String(user._id), user]));
  const jobById = new Map(jobs.map((job) => [String(job._id), job]));
  const applicationsByJob = new Map();
  const applicationsByJobseeker = new Map();

  applications.forEach((application) => {
    const jobId = String(application.job || '');
    const seekerId = String(application.jobseeker || '');
    if (jobId) applicationsByJob.set(jobId, (applicationsByJob.get(jobId) || 0) + 1);
    if (seekerId) applicationsByJobseeker.set(seekerId, (applicationsByJobseeker.get(seekerId) || 0) + 1);
  });

  let records = [];

  if (role === 'all') {
    records = users
      .filter((user) => ['jobseeker', 'employer'].includes(String(user.role || '').toLowerCase()))
      .map((user) => {
        const isEmployer = String(user.role || '').toLowerCase() === 'employer';
        const profile = isEmployer ? (user.employerProfile || {}) : (user.jobSeekerProfile || {});
        const address = exportAddressParts(profile, isEmployer);
        return {
          id: String(user._id),
          role: isEmployer ? 'employer' : 'jobseeker',
          roleLabel: isEmployer ? 'Employer' : 'Job Seeker',
          date: exportDate(user.createdAt),
          fullName: exportFullName(user),
          email: user.email || (isEmployer ? profile.businessEmail || '' : ''),
          contactNumber: isEmployer
            ? (profile.mobileNumber || user.registrationContactNumber || '')
            : (profile.phoneNumber || user.registrationContactNumber || ''),
          region: address.region,
          cityMunicipality: address.city,
        };
      });
  } else if (role === 'jobseeker') {
    records = users
      .filter((user) => String(user.role || '').toLowerCase() === 'jobseeker')
      .map((user) => {
        const profile = user.jobSeekerProfile || {};
        const address = exportAddressParts(profile, false);
        return {
          id: String(user._id),
          role: 'jobseeker',
          date: exportDate(user.createdAt),
          fullName: exportFullName(user),
          email: user.email || '',
          contactNumber: profile.phoneNumber || user.registrationContactNumber || '',
          age: exportAge(profile.birthday),
          civilStatus: profile.civilStatus || '',
          gender: profile.gender || '',
          campus: getJobseekerCampus(user) === 'Unspecified' ? '' : getJobseekerCampus(user),
          course: exportProfileValues(user, 'course')[0] || '',
          yearGraduated: exportProfileValues(user, 'yearGraduated')[0] || '',
          region: address.region,
          province: address.province,
          cityMunicipality: address.city,
        };
      });
  } else if (role === 'employer') {
    records = users
      .filter((user) => String(user.role || '').toLowerCase() === 'employer')
      .map((user) => {
        const profile = user.employerProfile || {};
        const address = exportAddressParts(profile, true);
        return {
          id: String(user._id),
          role: 'employer',
          date: exportDate(user.createdAt),
          fullName: exportFullName(user),
          email: user.email || profile.businessEmail || '',
          contactNumber: profile.mobileNumber || user.registrationContactNumber || '',
          companyName: profile.companyName || '',
          industry: profile.industry || '',
          region: address.region,
          province: address.province,
          cityMunicipality: address.city,
        };
      });
  } else if (role === 'jobOffer') {
    records = jobs.map((job) => {
      const employer = userById.get(String(job.employer || '')) || {};
      return {
        id: String(job._id),
        role: 'jobOffer',
        date: exportDate(job.publishedAt || job.createdAt),
        companyName: job.companyName || employer?.employerProfile?.companyName || '',
        industry: employer?.employerProfile?.industry || job.category || '',
        jobTitle: job.title || '',
        workMode: job.workMode || '',
        employmentType: job.jobType || '',
        vacancy: Number(job.vacancies || 0),
        applicant: applicationsByJob.get(String(job._id)) || Number(job.applicationCount || 0),
        applicationStatus: getAdminJobOfferStatus(job),
        validUntil: exportDate(job.applicationDeadline),
      };
    });
  } else {
    records = applications.map((application) => {
      const seeker = userById.get(String(application.jobseeker || '')) || {};
      const profile = seeker.jobSeekerProfile || {};
      const job = jobById.get(String(application.job || '')) || {};
      const employer = userById.get(String(application.employer || job.employer || '')) || {};
      const address = exportAddressParts(profile, false);
      return {
        id: String(application._id),
        role: 'application',
        date: exportDate(application.appliedAt || application.createdAt),
        fullName: exportFullName(seeker),
        email: seeker.email || '',
        contactNumber: profile.phoneNumber || seeker.registrationContactNumber || '',
        age: exportAge(profile.birthday),
        civilStatus: profile.civilStatus || '',
        gender: profile.gender || '',
        campus: getJobseekerCampus(seeker) === 'Unspecified' ? '' : getJobseekerCampus(seeker),
        course: exportProfileValues(seeker, 'course')[0] || '',
        yearGraduated: exportProfileValues(seeker, 'yearGraduated')[0] || '',
        region: address.region,
        province: address.province,
        cityMunicipality: address.city,
        companyName: job.companyName || employer?.employerProfile?.companyName || '',
        industry: employer?.employerProfile?.industry || job.category || '',
        jobTitle: job.title || '',
        workMode: job.workMode || '',
        employmentType: job.jobType || '',
        applicationStatus: application.status || '',
        processingTime: exportProcessingTime(application),
        timesApplied: applicationsByJobseeker.get(String(application.jobseeker || '')) || 0,
        hiredDate: exportDate(application.hiredAt),
      };
    });
  }

  const optionsSource = records;
  const filters = rawFilters || {};

  records = records.filter((record) => {
    if (!filterRecordMatches(record.campus, filters.campus)) return false;
    if (!filterRecordMatches(record.course, filters.course)) return false;
    if (!filterRecordMatches(record.yearGraduated, filters.yearGraduated)) return false;
    if (!filterRecordMatches(record.gender, filters.gender)) return false;
    if (!filterRecordMatches(record.companyName, filters.companyName)) return false;
    if (!filterRecordMatches(record.industry, filters.industry)) return false;
    if (!filterRecordMatches(record.jobTitle, filters.jobTitle)) return false;
    if (!filterRecordMatches(record.applicationStatus, filters.applicationStatus)) return false;
    if (!filterRecordMatches(record.workMode, filters.workMode)) return false;
    if (!filterRecordMatches(record.employmentType, filters.employmentType)) return false;
    return true;
  });

  return {
    role,
    records,
    options: {
      campuses: uniqueFilterValues(optionsSource, 'campus'),
      courses: uniqueFilterValues(optionsSource, 'course'),
      yearsGraduated: uniqueFilterValues(optionsSource, 'yearGraduated'),
      genders: uniqueFilterValues(optionsSource, 'gender'),
      companyNames: uniqueFilterValues(optionsSource, 'companyName'),
      industries: uniqueFilterValues(optionsSource, 'industry'),
      jobTitles: uniqueFilterValues(optionsSource, 'jobTitle'),
      applicationStatuses: role === 'application' ? uniqueFilterValues(optionsSource, 'applicationStatus') : [],
      jobStatuses: role === 'jobOffer' ? uniqueFilterValues(optionsSource, 'applicationStatus') : [],
      workModes: uniqueFilterValues(optionsSource, 'workMode'),
      employmentTypes: uniqueFilterValues(optionsSource, 'employmentType'),
    },
  };
};

const adminFilterRecordColumns = {
  all: [
    ['date', 'Date Registered'], ['fullName', 'Full Name'], ['email', 'Email'], ['contactNumber', 'Contact Number'],
    ['roleLabel', 'Role'], ['region', 'Region'], ['cityMunicipality', 'City / Municipality'],
  ],
  jobseeker: [
    ['date', 'Date Registered'], ['fullName', 'Full Name'], ['email', 'Email'], ['contactNumber', 'Contact Number'],
    ['age', 'Age'], ['civilStatus', 'Civil Status'], ['gender', 'Gender'], ['campus', 'Campus'], ['course', 'Course'],
    ['yearGraduated', 'Year Graduated'], ['region', 'Region'], ['province', 'Province'], ['cityMunicipality', 'City / Municipality'],
  ],
  employer: [
    ['date', 'Date Registered'], ['fullName', 'Full Name'], ['email', 'Email'], ['contactNumber', 'Contact Number'],
    ['companyName', 'Company Name'], ['industry', 'Industry'], ['region', 'Region'], ['province', 'Province'],
    ['cityMunicipality', 'City / Municipality'],
  ],
  jobOffer: [
    ['date', 'Date Posted'], ['companyName', 'Company Name'], ['industry', 'Industry'], ['jobTitle', 'Job Title'],
    ['workMode', 'Work Mode'], ['employmentType', 'Employment Type'], ['vacancy', 'Vacancy'], ['applicant', 'Applicant'],
    ['applicationStatus', 'Status'], ['validUntil', 'Valid Until'],
  ],
  application: [
    ['date', 'Date Applied'], ['fullName', 'Full Name'], ['email', 'Email'], ['contactNumber', 'Contact Number'], ['age', 'Age'],
    ['civilStatus', 'Civil Status'], ['gender', 'Gender'], ['campus', 'Campus'], ['course', 'Course'], ['yearGraduated', 'Year Graduated'],
    ['region', 'Region'], ['province', 'Province'], ['cityMunicipality', 'City / Municipality'], ['companyName', 'Company Name'],
    ['jobTitle', 'Job Title'], ['workMode', 'Work Mode'], ['employmentType', 'Employment Type'], ['applicationStatus', 'Application Status'],
    ['processingTime', 'Processing Time'], ['timesApplied', 'Times Applied'], ['hiredDate', 'Hired Date'],
  ],
};

exports.getAdminFilterRecords = async (req, res) => {
  try {
    const payload = await buildAdminFilterRecords(req.query || {});
    return res.json({ success: true, ...payload, total: payload.records.length });
  } catch (error) {
    console.error('Admin filter records error:', error);
    return res.status(500).json({ success: false, message: 'Unable to load filter records.' });
  }
};

exports.exportAdminFilterRecordsExcel = async (req, res) => {
  try {
    const payload = await buildAdminFilterRecords(req.body?.filters || {});
    const columns = adminFilterRecordColumns[payload.role] || adminFilterRecordColumns.all;
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'AGAPAY';
    workbook.company = 'PHINMA Araullo University';
    workbook.created = new Date();

    const roleLabel = payload.role === 'jobOffer' ? 'Job Offers' : payload.role === 'application' ? 'Applications' : payload.role === 'employer' ? 'Employer' : payload.role === 'jobseeker' ? 'Job Seeker' : 'All Roles';
    const sheet = workbook.addWorksheet(roleLabel.slice(0, 31));
    styleExportWorksheet(
      sheet,
      `Phinma Araullo University - ${roleLabel} Filter Records`,
      columns.map(([, label]) => label),
      columns.map(([, label]) => Math.min(38, Math.max(14, label.length + 5))),
    );
    addExportDataRows(sheet, 5, payload.records.map((record) => columns.map(([key]) => record[key] ?? '')));
    addApprovedBySection(sheet, 5 + payload.records.length + 2, columns.length);

    const safeRole = payload.role === 'jobOffer' ? 'job-offers' : payload.role;
    const filename = `agapay-filter-records-${safeRole}-${new Date().toISOString().slice(0, 10)}.xlsx`;
    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.setHeader('Cache-Control', 'no-store');
    return res.send(Buffer.from(buffer));
  } catch (error) {
    console.error('Admin filter records Excel export error:', error);
    return res.status(500).json({ success: false, message: 'Unable to generate the Excel export.' });
  }
};

const escapePdfHtml = (value) => exportText(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

exports.exportAdminFilterRecordsPdf = async (req, res) => {
  let browser = null;
  try {
    const payload = await buildAdminFilterRecords(req.body?.filters || {});
    const columns = adminFilterRecordColumns[payload.role] || adminFilterRecordColumns.all;
    const roleLabel = payload.role === 'jobOffer' ? 'Job Offers' : payload.role === 'application' ? 'Applications' : payload.role === 'employer' ? 'Employer' : payload.role === 'jobseeker' ? 'Job Seeker' : 'All Roles';

    const tableHead = columns.map(([, label]) => `<th>${escapePdfHtml(label)}</th>`).join('');
    const tableBody = payload.records.length
      ? payload.records.map((record) => `<tr>${columns.map(([key]) => `<td>${escapePdfHtml(record[key])}</td>`).join('')}</tr>`).join('')
      : `<tr><td colspan="${columns.length}" style="text-align:center;padding:24px;">No matching records.</td></tr>`;

    const html = `<!doctype html><html><head><meta charset="utf-8"><style>
      @page{size:A4 landscape;margin:12mm} body{font-family:Arial,sans-serif;color:#172033;font-size:9px}
      h1{font-size:18px;margin:0;color:#153f73} .sub{margin:5px 0 14px;color:#64748b}
      table{width:100%;border-collapse:collapse;table-layout:auto} th{background:#2e66a6;color:#fff;padding:7px 6px;border:1px solid #dbe4ef;white-space:nowrap}
      td{padding:6px;border:1px solid #dbe4ef;vertical-align:top;word-break:break-word} tr:nth-child(even) td{background:#f8fafc}
      .meta{display:flex;justify-content:space-between;margin-bottom:10px;color:#64748b}
      .approval{margin-top:24px;width:260px;text-align:center;page-break-inside:avoid}.approval .label{font-style:italic;margin-bottom:10px}.approval .name{font-weight:700}.approval .role{margin-top:4px}
    </style></head><body><h1>PHINMA Araullo University - ${escapePdfHtml(roleLabel)} Filter Records</h1>
    <div class="meta"><span>${payload.records.length} record(s)</span><span>Generated: ${escapePdfHtml(exportDate(new Date()))}</span></div>
    <table><thead><tr>${tableHead}</tr></thead><tbody>${tableBody}</tbody></table>
    <div class="approval"><div class="label">APPROVED BY:</div><div class="name">JAN KRISTINE A. INOCENCIO</div><div class="role">LINKAGES MANAGER</div></div>
    </body></html>`;

    const puppeteer = require('puppeteer');
    browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({ format: 'A4', landscape: true, printBackground: true, margin: { top: '12mm', right: '10mm', bottom: '12mm', left: '10mm' } });

    const safeRole = payload.role === 'jobOffer' ? 'job-offers' : payload.role;
    const filename = `agapay-filter-records-${safeRole}-${new Date().toISOString().slice(0, 10)}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.setHeader('Cache-Control', 'no-store');
    return res.send(Buffer.from(pdf));
  } catch (error) {
    console.error('Admin filter records PDF export error:', error);
    return res.status(500).json({ success: false, message: 'Unable to generate the PDF export.' });
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
};


exports.exportAdminAgapayReportPdf = async (req, res) => {
  let page = null;

  try {
    const filters = req.body?.filters || {};
    const range = getAdminAnalyticsDateRange({
      preset: filters.date || 'overall',
      specificDate: filters.specificDate,
      startDate: filters.startDate,
      endDate: filters.endDate,
    });

    const [usersAll, jobsAll, applicationsAll] = await Promise.all([
      User.find({ status: { $ne: 'deleted' } })
        .select('role createdAt jobSeekerProfile.campus jobSeekerProfile.course jobSeekerProfile.yearGraduated jobSeekerProfile.gender jobSeekerProfile.educationEntries.campus jobSeekerProfile.educationEntries.course jobSeekerProfile.educationEntries.yearGraduated')
        .lean(),
      Job.find({}).select('createdAt publishedAt').lean(),
      Application.find({}).select('jobseeker status appliedAt createdAt').lean(),
    ]);

    const userById = new Map(usersAll.map((user) => [String(user._id), user]));
    const selectedCampus = String(filters.campus || 'all').trim();
    const selectedYear = String(filters.yearGraduated || 'all').trim();
    const selectedCourse = String(filters.course || 'all').trim();
    const selectedGender = String(filters.gender || 'all').trim();

    const personalFilterActive = [selectedCampus, selectedYear, selectedCourse, selectedGender]
      .some((value) => value && value.toLowerCase() !== 'all');

    const jobseekerMatchesProfile = (user) => {
      if (!user || String(user.role || '').toLowerCase() !== 'jobseeker') return false;
      if (!exportMatches(exportProfileValues(user, 'campus'), selectedCampus)) return false;
      if (!exportMatches(exportProfileValues(user, 'yearGraduated'), selectedYear)) return false;
      if (!exportMatches(exportProfileValues(user, 'course'), selectedCourse)) return false;
      if (!exportMatches(exportProfileValues(user, 'gender'), selectedGender)) return false;
      return true;
    };

    const users = usersAll.filter((user) => {
      if (!exportInRange(user.createdAt, range)) return false;
      if (personalFilterActive && !jobseekerMatchesProfile(user)) return false;
      return true;
    });

    const jobseekers = users.filter((user) => String(user.role || '').toLowerCase() === 'jobseeker');
    const employers = users.filter((user) => String(user.role || '').toLowerCase() === 'employer');
    const registeredUsers = [...jobseekers, ...employers];

    const jobs = jobsAll.filter((job) => exportInRange(job.publishedAt || job.createdAt, range));
    const applications = applicationsAll.filter((application) => {
      if (!exportInRange(application.appliedAt || application.createdAt, range)) return false;
      const seeker = userById.get(String(application.jobseeker || ''));
      if (personalFilterActive && !jobseekerMatchesProfile(seeker)) return false;
      return true;
    });

    const campusRows = DASHBOARD_CAMPUSES.map((campus) => {
      const campusApplications = applications.filter((application) => {
        const seeker = userById.get(String(application.jobseeker || ''));
        return getJobseekerCampus(seeker) === campus;
      });
      const hired = campusApplications.filter((application) => analyticsLower(application.status) === 'hired').length;
      const total = campusApplications.length;
      const rate = total ? (hired / total) * 100 : 0;
      return { campus, total, hired, rate };
    });

    const totalApplications = campusRows.reduce((sum, row) => sum + row.total, 0);
    const totalHired = campusRows.reduce((sum, row) => sum + row.hired, 0);
    const totalHireRate = totalApplications ? (totalHired / totalApplications) * 100 : 0;

    const formatInteger = (value) => Number(value || 0).toLocaleString('en-US');
    const formatRate = (value) => `${Number(value || 0).toFixed(2).replace(/\.00$/, '')}%`;
    const reportDate = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());

    const frontendUrl = String(
      process.env.FRONTEND_URL || process.env.APP_URL || 'https://agapayy.onrender.com'
    ).replace(/\/$/, '');
    const leftLogo = `${frontendUrl}/images/agapayreports/leftlogo.png`;
    const rightLogo = `${frontendUrl}/images/agapayreports/rightlogo.png`;
    const centerLogo = `${frontendUrl}/images/agapayreports/centerlogos.png`;

    const campusTableRows = campusRows.map((row) => `
      <tr>
        <td>${escapePdfHtml(row.campus.toUpperCase())}</td>
        <td class="center">${formatInteger(row.total)}</td>
        <td class="center">${formatInteger(row.hired)}</td>
        <td class="center">${formatRate(row.rate)}</td>
      </tr>
    `).join('');

    const html = `<!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            @page { size: A4 portrait; margin: 0; }
            * { box-sizing: border-box; }
            body {
              margin: 0;
              background: #ffffff;
              color: #15251f;
              font-family: Arial, Helvetica, sans-serif;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .page {
              position: relative;
              width: 210mm;
              min-height: 297mm;
              padding: 10mm 11mm 12mm;
              overflow: hidden;
              background: #ffffff;
            }
            .watermark {
              position: absolute;
              z-index: 0;
              left: 50%;
              top: 74mm;
              width: 165mm;
              height: 165mm;
              transform: translateX(-50%);
              object-fit: contain;
              opacity: 0.16;
            }
            .content { position: relative; z-index: 1; }
            .logos {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              min-height: 27mm;
            }
            .left-logo { width: 68mm; height: 20mm; object-fit: contain; object-position: left top; }
            .right-logo { width: 76mm; height: 20mm; object-fit: contain; object-position: right top; }
            .header-divider {
              position: relative;
              top: -5mm;
              width: 100%;
              height: 0;
              border-top: 0.45mm solid #9eb2aa;
              margin: 1.5mm 0 0;
            }
            h1 {
              margin: 8mm 0 1.5mm;
              text-align: center;
              color: #123f35;
              font-size: 21pt;
              line-height: 1;
              font-weight: 800;
              letter-spacing: 0.2px;
            }
            .date {
              text-align: center;
              font-size: 11.5pt;
              margin-bottom: 6mm;
              color: #1c3d35;
            }
            .summary {
              border: 0.45mm solid #597b6d;
              border-radius: 2mm;
              padding: 5.5mm 6mm;
              display: grid;
              grid-template-columns: 1fr 1fr;
              column-gap: 13mm;
              font-size: 11pt;
              line-height: 1.72;
              background: transparent;
            }
            .summary p { margin: 0; }
            .table-wrap { margin-top: 5.5mm; }
            table {
              width: 100%;
              border-collapse: separate;
              border-spacing: 0;
              font-size: 10.5pt;
              background: transparent;
            }
            th, td {
              border-right: 0.35mm solid #9eb2aa;
              border-bottom: 0.35mm solid #9eb2aa;
              padding: 4.2mm 4mm;
            }
            th:first-child, td:first-child { border-left: 0.35mm solid #9eb2aa; }
            thead th { border-top: 0.35mm solid #9eb2aa; }
            th {
              text-align: center;
              font-weight: 700;
              color: #123f35;
              background: transparent;
            }
            thead th:first-child { border-top-left-radius: 2mm; }
            thead th:last-child { border-top-right-radius: 2mm; }
            tbody tr:last-child td:first-child { border-bottom-left-radius: 2mm; }
            tbody tr:last-child td:last-child { border-bottom-right-radius: 2mm; }
            td { color: #13211d; background: transparent; }
            .center { text-align: center; }
            .total-row td { font-weight: 700; }
            .approval {
              position: relative;
              z-index: 2;
              width: 75mm;
              margin: 11mm 6mm 0 auto;
              text-align: center;
              color: #111111;
              line-height: 1.45;
            }
            .approval .label { font-weight: 700; font-size: 11pt; margin-bottom: 1.2mm; }
            .approval .name, .approval .role { font-size: 10.8pt; }
          </style>
        </head>
        <body>
          <div class="page">
            <img class="watermark" src="${escapePdfHtml(centerLogo)}" alt="" />
            <div class="content">
              <div class="logos">
                <img class="left-logo" src="${escapePdfHtml(leftLogo)}" alt="PHINMA Education" />
                <img class="right-logo" src="${escapePdfHtml(rightLogo)}" alt="Araullo University" />
              </div>
              <div class="header-divider"></div>

              <h1>AGAPAY RECORDS REPORTS</h1>
              <div class="date">Date: ${escapePdfHtml(reportDate)}</div>

              <div class="summary">
                <div>
                  <p>Total Jobseekers: ${formatInteger(jobseekers.length)}</p>
                  <p>Total Employers: ${formatInteger(employers.length)}</p>
                  <p>Total Registered Users: ${formatInteger(registeredUsers.length)}</p>
                </div>
                <div>
                  <p>Total Job Posts: ${formatInteger(jobs.length)}</p>
                  <p>Total Applications: ${formatInteger(applications.length)}</p>
                </div>
              </div>

              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Campus</th>
                      <th>Total Applications</th>
                      <th>Total Hired</th>
                      <th>Hired Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${campusTableRows}
                    <tr class="total-row">
                      <td>TOTAL</td>
                      <td class="center">${formatInteger(totalApplications)}</td>
                      <td class="center">${formatInteger(totalHired)}</td>
                      <td class="center">${formatRate(totalHireRate)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div class="approval">
              <div class="label">APPROVED BY:</div>
              <div class="name">JAN KRISTINE A. INOCENCIO</div>
              <div class="role">LINKAGES MANAGER</div>
            </div>
          </div>
        </body>
      </html>`;

    const browser = await getAdminReportBrowser();
    page = await browser.newPage();
    await page.setViewport({ width: 1240, height: 1754, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(
      () => Array.from(document.images).every((image) => image.complete),
      { timeout: 3000 }
    ).catch(() => {});

    const pdf = await page.pdf({
      format: 'A4',
      landscape: false,
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });

    const filename = `agapay-records-report-${reportDate}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.setHeader('Cache-Control', 'no-store');
    return res.send(Buffer.from(pdf));
  } catch (error) {
    console.error('AGAPAY report PDF export error:', error);
    return res.status(500).json({ success: false, message: 'Unable to generate the AGAPAY report.' });
  } finally {
    if (page) await page.close().catch(() => {});
  }
};

exports.exportAdminRecordsExcel = async (req, res) => {
  try {
    const mode = ['all', 'filtered', 'report'].includes(String(req.body?.mode || '').toLowerCase())
      ? String(req.body.mode).toLowerCase()
      : 'all';
    const filters = mode === 'all' ? {} : (req.body?.filters || {});
    const range = getAdminAnalyticsDateRange({
      preset: filters.date || 'overall',
      specificDate: filters.specificDate,
      startDate: filters.startDate,
      endDate: filters.endDate,
    });

    const [users, jobs, applications] = await Promise.all([
      User.find({ status: { $ne: 'deleted' } }).select('-password').lean(),
      Job.find({}).lean(),
      Application.find({}).lean(),
    ]);

    const userById = new Map(users.map((user) => [String(user._id), user]));
    const jobById = new Map(jobs.map((job) => [String(job._id), job]));
    const applicationsByJob = new Map();
    const applicationsByJobseeker = new Map();

    applications.forEach((application) => {
      const jobId = String(application.job || '');
      const seekerId = String(application.jobseeker || '');
      if (jobId) applicationsByJob.set(jobId, (applicationsByJob.get(jobId) || 0) + 1);
      if (seekerId) applicationsByJobseeker.set(seekerId, (applicationsByJobseeker.get(seekerId) || 0) + 1);
    });

    const jobseekerMatches = (user, includeDate = true) => {
      if (!user || String(user.role || '').toLowerCase() !== 'jobseeker') return false;
      if (includeDate && !exportInRange(user.createdAt, range)) return false;
      if (!exportMatches(exportProfileValues(user, 'campus'), filters.campus)) return false;
      if (!exportMatches(exportProfileValues(user, 'yearGraduated'), filters.yearGraduated)) return false;
      if (!exportMatches(exportProfileValues(user, 'course'), filters.course)) return false;
      if (!exportMatches(exportProfileValues(user, 'gender'), filters.gender)) return false;
      return true;
    };

    const jobseekers = users.filter((user) => jobseekerMatches(user, true));
    const employers = users.filter((user) =>
      String(user.role || '').toLowerCase() === 'employer' && exportInRange(user.createdAt, range)
    );
    const filteredJobs = jobs.filter((job) => exportInRange(job.publishedAt || job.createdAt, range));
    const filteredApplications = applications.filter((application) => {
      if (!exportInRange(application.appliedAt || application.createdAt, range)) return false;
      const seeker = userById.get(String(application.jobseeker || ''));
      return jobseekerMatches(seeker, false);
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'AGAPAY';
    workbook.company = 'PHINMA Araullo University';
    workbook.created = new Date();

    const jobSeekerHeaders = ['Date Registered', 'Full Name', 'Email', 'Contact Number', 'Age', 'Civil Status', 'Gender', 'Campus', 'Course', 'Year Graduated', 'Region', 'Province', 'City / Municipality'];
    const employerHeaders = ['Date Registered', 'Full Name', 'Email', 'Contact Number', 'Company Name', 'Industry', 'Region', 'Province', 'City / Municipality'];
    const jobOfferHeaders = ['Date Posted', 'Company Name', 'Industry', 'Job Title', 'Work Mode', 'Employment Type', 'Vacancy', 'Applicant', 'Status', 'Valid Until'];
    const applicationHeaders = ['Date Applied', 'Full Name', 'Email', 'Contact Number', 'Age', 'Civil Status', 'Gender', 'Campus', 'Course', 'Year Graduated', 'Region', 'Province', 'City / Municipality', 'Company Name', 'Job Title', 'Work Mode', 'Employment Type', 'Application Status', 'Processing Time', 'Times Applied', 'Hired Date'];

    const jobSeekerSheet = workbook.addWorksheet('Job Seeker');
    styleExportWorksheet(jobSeekerSheet, 'Phinma Araullo University - Job Seeker List', jobSeekerHeaders, [16, 28, 30, 17, 8, 16, 13, 16, 34, 16, 20, 20, 24]);
    addExportDataRows(jobSeekerSheet, 5, jobseekers.map((user) => {
      const profile = user.jobSeekerProfile || {};
      const address = exportAddressParts(profile, false);
      return [exportDate(user.createdAt), exportFullName(user), user.email || '', profile.phoneNumber || user.registrationContactNumber || '', exportAge(profile.birthday), profile.civilStatus || '', profile.gender || '', getJobseekerCampus(user) === 'Unspecified' ? '' : getJobseekerCampus(user), exportProfileValues(user, 'course')[0] || '', exportProfileValues(user, 'yearGraduated')[0] || '', address.region, address.province, address.city];
    }));
    addApprovedBySection(jobSeekerSheet, 5 + jobseekers.length + 2, jobSeekerHeaders.length);

    const employerSheet = workbook.addWorksheet('Employer');
    styleExportWorksheet(employerSheet, 'Phinma Araullo University - Employer List', employerHeaders, [16, 28, 30, 17, 32, 24, 20, 20, 24]);
    addExportDataRows(employerSheet, 5, employers.map((user) => {
      const profile = user.employerProfile || {};
      const address = exportAddressParts(profile, true);
      return [exportDate(user.createdAt), exportFullName(user), user.email || profile.businessEmail || '', profile.mobileNumber || user.registrationContactNumber || '', profile.companyName || '', profile.industry || '', address.region, address.province, address.city];
    }));
    addApprovedBySection(employerSheet, 5 + employers.length + 2, employerHeaders.length);

    const jobOfferSheet = workbook.addWorksheet('Job Offers');
    styleExportWorksheet(jobOfferSheet, 'Phinma Araullo University - Job Offers List', jobOfferHeaders, [16, 30, 24, 32, 18, 22, 12, 12, 14, 16]);
    addExportDataRows(jobOfferSheet, 5, filteredJobs.map((job) => {
      const employer = userById.get(String(job.employer || ''));
      return [exportDate(job.publishedAt || job.createdAt), job.companyName || employer?.employerProfile?.companyName || '', employer?.employerProfile?.industry || job.category || '', job.title || '', job.workMode || '', job.jobType || '', Number(job.vacancies || 0), applicationsByJob.get(String(job._id)) || Number(job.applicationCount || 0), getAdminJobOfferStatus(job), exportDate(job.applicationDeadline)];
    }));
    addApprovedBySection(jobOfferSheet, 5 + filteredJobs.length + 2, jobOfferHeaders.length);

    const applicationSheet = workbook.addWorksheet('Applications');
    styleExportWorksheet(applicationSheet, 'Phinma Araullo University - Applications List', applicationHeaders, [16, 28, 30, 17, 8, 16, 13, 16, 34, 16, 20, 20, 24, 30, 32, 18, 22, 20, 18, 15, 16]);
    addExportDataRows(applicationSheet, 5, filteredApplications.map((application) => {
      const seeker = userById.get(String(application.jobseeker || '')) || {};
      const profile = seeker.jobSeekerProfile || {};
      const job = jobById.get(String(application.job || '')) || {};
      const employer = userById.get(String(application.employer || job.employer || '')) || {};
      const address = exportAddressParts(profile, false);
      return [exportDate(application.appliedAt || application.createdAt), exportFullName(seeker), seeker.email || '', profile.phoneNumber || seeker.registrationContactNumber || '', exportAge(profile.birthday), profile.civilStatus || '', profile.gender || '', getJobseekerCampus(seeker) === 'Unspecified' ? '' : getJobseekerCampus(seeker), exportProfileValues(seeker, 'course')[0] || '', exportProfileValues(seeker, 'yearGraduated')[0] || '', address.region, address.province, address.city, job.companyName || employer?.employerProfile?.companyName || '', job.title || '', job.workMode || '', job.jobType || '', application.status || '', exportProcessingTime(application), applicationsByJobseeker.get(String(application.jobseeker || '')) || 0, exportDate(application.hiredAt)];
    }));
    addApprovedBySection(applicationSheet, 5 + filteredApplications.length + 2, applicationHeaders.length);

    const modeLabel = mode === 'all' ? 'all-records' : mode === 'filtered' ? 'filtered-records' : 'agapay-reports';
    const filename = `agapay-${modeLabel}-${new Date().toISOString().slice(0, 10)}.xlsx`;
    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.setHeader('Cache-Control', 'no-store');
    return res.send(Buffer.from(buffer));
  } catch (error) {
    console.error('Admin Excel export error:', error);
    return res.status(500).json({ success: false, message: 'Unable to generate the Excel export.' });
  }
};

