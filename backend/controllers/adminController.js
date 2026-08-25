// backend/controllers/adminController.js
const User = require('../models/User');
const Job = require('../models/Job');
const Application = require('../models/Application');
const CommunityPost = require('../models/CommunityPost');
const Notification = require('../models/Notification');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { v2: cloudinary } = require('cloudinary');
const { sendCredentialsEmail, sendResubmitDocumentEmail, sendVerificationRejectedEmail, sendVerificationRestoredEmail } = require('../config/mailer');

const DEFAULT_ADMIN_LOGO = '/images/phinma-logo.png';

const serializeAdminProfile = (admin) => ({
  id: admin._id,
  email: admin.email,
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

    const clean = (value, max) => String(value ?? '').trim().slice(0, max);
    if (!admin.adminProfile) admin.adminProfile = {};
    admin.firstName = clean(req.body.firstName, 50);
    admin.middleName = clean(req.body.middleName, 50);
    admin.lastName = clean(req.body.lastName, 50);
    admin.extensionName = clean(req.body.extensionName, 20);
    admin.adminProfile.organizationName = clean(req.body.organizationName, 120);
    admin.adminProfile.positionRole = clean(req.body.positionRole, 80);
    admin.adminProfile.contactNumber = clean(req.body.contactNumber, 30);
    admin.adminProfile.departmentOffice = clean(req.body.departmentOffice, 120);

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
    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({ success: false, message: 'New passwords do not match.' });
    }
    const passwordValid = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(newPassword);
    if (!passwordValid) {
      return res.status(400).json({ success: false, message: 'The new password does not meet all password requirements.' });
    }

    const admin = await User.findOne({ _id: req.userId, role: 'admin' }).select('+password');
    if (!admin) return res.status(404).json({ success: false, message: 'Admin account not found.' });
    const matches = await bcrypt.compare(currentPassword, admin.password);
    if (!matches) return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
    if (await bcrypt.compare(newPassword, admin.password)) {
      return res.status(400).json({ success: false, message: 'New password must be different from the current password.' });
    }

    admin.password = await bcrypt.hash(newPassword, 12);
    admin.mustChangePassword = false;
    await admin.save();
    return res.json({ success: true, message: 'Password updated successfully.' });
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

const EMPLOYER_DOC_TYPES = ['secRegistration', 'birRegistration', 'dtiRegistration', 'cityPermit', 'businessPermit'];

const EMPLOYER_DOC_LABELS = {
  secRegistration: 'SEC Registration',
  birRegistration: 'BIR Registration',
  dtiRegistration: 'DTI Registration',
  cityPermit: 'City/Municipality Permit',
  businessPermit: 'Business Permit',
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
      : String(doc?.resource_type || 'image').trim() || 'image';

    const versionIndex = parts.findIndex((part, index) => index > uploadIndex && /^v\d+$/.test(part));
    const publicParts = parts.slice(versionIndex >= 0 ? versionIndex + 1 : uploadIndex + 1);
    const version = versionIndex >= 0 ? Number(parts[versionIndex].slice(1)) : undefined;
    const publicPathWithFormat = decodeURIComponent(publicParts.join('/'));

    if (!publicPathWithFormat) return null;

    const lastSegment = publicPathWithFormat.split('/').pop() || '';
    const extensionMatch = lastSegment.match(/\.([a-zA-Z0-9]+)$/);
    const format = String(doc?.format || (extensionMatch ? extensionMatch[1] : '') || '').toLowerCase();
    const publicIdFromUrl = format
      ? publicPathWithFormat.slice(0, -(format.length + 1))
      : publicPathWithFormat;

    const storedPublicId = String(doc?.public_id || doc?.filename || '').trim();
    const publicId = storedPublicId && !storedPublicId.includes('.') ? storedPublicId : publicIdFromUrl;

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

  const urls = [];
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

  addUniqueUrl(urls, originalUrl);
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

    let fileResponse = null;
    let lastStatus = 500;

    for (const deliveryUrl of deliveryUrls) {
      try {
        const response = await fetch(deliveryUrl, {
          headers: {
            'User-Agent': 'AGAPAY-admin-document-delivery/1.0',
          },
        });

        if (response.ok) {
          fileResponse = response;
          break;
        }

        lastStatus = response.status;
        console.error('Document delivery failed:', response.status, deliveryUrl);
      } catch (fetchError) {
        console.error('Document delivery request error:', fetchError?.message || fetchError, deliveryUrl);
      }
    }

    if (!fileResponse) {
      return res.status(lastStatus || 500).json({
        success: false,
        message: 'Unable to access document file. Please check Cloudinary PDF/raw delivery settings or re-upload the document.',
      });
    }

    const arrayBuffer = await fileResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = resolveDocumentContentType({
      upstreamContentType: fileResponse.headers.get('content-type'),
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
const DASHBOARD_CAMPUSES = ['AU Main', 'AU South', 'AU San Jose'];

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

    const [users, jobs, applications] = await Promise.all([
      User.find({ status: { $ne: 'deleted' } }).select('-password').lean(),
      Job.find({ isArchived: { $ne: true } }).populate('employer', 'employerProfile companyName firstName lastName').lean(),
      Application.find({}).populate('job').populate('jobseeker', 'jobSeekerProfile').lean(),
    ]);

    const jobseekers = users.filter((user) => user.role === 'jobseeker');
    const employers = users.filter((user) => user.role === 'employer');

    const pendingSeekers = jobseekers.filter((user) => {
      const status = String(user?.jobSeekerProfile?.verificationDocs?.overallStatus || user?.jobSeekerProfile?.verificationStatus || '').toLowerCase();
      return status === 'pending';
    }).length;

    const pendingEmployers = employers.filter((user) => {
      const status = String(user?.employerProfile?.verificationDocs?.overallStatus || '').toLowerCase();
      return status === 'pending';
    }).length;

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
        pendingSeekers,
        pendingEmployers,
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

exports.getAllUsers = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);

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

    const baseQuery = {
      status: { $ne: 'deleted' },
      // System-archived inactive employers belong in Admin Archive, not User Management.
      $nor: [{ role: 'employer', inactiveBySystem: true }],
    };
    const andConditions = [];

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

    const allUsersForStats = await User.find({
      status: { $ne: 'deleted' },
      $nor: [{ role: 'employer', inactiveBySystem: true }],
    }).select('-password');

    const stats = allUsersForStats.reduce(
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

    const totalItems = await User.countDocuments(baseQuery);
    const totalPages = Math.max(Math.ceil(totalItems / limit), 1);
    const safePage = Math.min(page, totalPages);
    const skip = (safePage - 1) * limit;

    const users = await User.find(baseQuery)
      .select('-password')
      .sort(sortOption)
      .skip(skip)
      .limit(limit);

    const normalizedUsers = users.map((user) => {
      const userObject = user.toObject ? user.toObject() : user;
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
      stats,
      total: totalItems,
      pagination: {
        page: safePage,
        limit,
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
            .populate('job', 'title jobTitle companyName location address workMode jobType')
            .populate('employer', 'firstName lastName email employerProfile.companyName employerProfile.regionCity')
            .sort({ appliedAt: -1, createdAt: -1 })
            .lean()
        : [];

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
        ...user.toObject(),
        applicationCount,
        jobPostCount,
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

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);

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
    const totalPages = Math.max(Math.ceil(totalItems / limit), 1);
    const safePage = Math.min(page, totalPages);
    const skip = (safePage - 1) * limit;
    const paginated = filtered.slice(skip, skip + limit);

    res.status(200).json({
      success: true,
      employers: paginated,
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
      pagination: {
        page: safePage,
        limit,
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
    const { overallStatus, remarks, rejectionReasons, rejectionMessage } = req.body;

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
      const hasBusinessReg =
        docs?.secRegistration?.url ||
        docs?.birRegistration?.url ||
        docs?.dtiRegistration?.url;
      const hasCityPermit = docs?.cityPermit?.url;

      if (!hasBusinessReg || !hasCityPermit) {
        return res.status(400).json({
          success: false,
          message: 'Documents incomplete. Business Registration (SEC/BIR/DTI) and City Permit are required.'
        });
      }
    }

    if (overallStatus === 'rejected') {
      if (!Array.isArray(rejectionReasons) || rejectionReasons.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'At least one rejection reason is required'
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

      await employer.save();

      sendCredentialsEmail({
        to: employer.email,
        fullName: employer.fullName || employer.email,
        username: newUsername,
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
    const { docType, reasonMessage } = req.body;

    if (!EMPLOYER_DOC_TYPES.includes(String(docType || ''))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid document type selected for resubmission'
      });
    }

    if (!String(reasonMessage || '').trim()) {
      return res.status(400).json({
        success: false,
        message: 'Reason/message is required'
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

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = User.hashToken(rawToken);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 1000 * 60 * 60 * 48);

    employer.employerProfile.verificationDocs.overallStatus = 'hold';
    employer.employerProfile.verificationDocs.remarks = String(reasonMessage).trim();
    employer.employerProfile.verificationDocs.rejectionReasons = [];
    employer.employerProfile.verificationDocs.rejectionMessage = '';
    employer.employerProfile.verificationDocs.rejectedAt = null;

    if (!employer.employerProfile.verificationDocs[docType]) {
      employer.employerProfile.verificationDocs[docType] = {};
    }

    employer.employerProfile.verificationDocs[docType].status = 'hold';
    employer.employerProfile.verificationDocs.resubmitRequest = {
      tokenHash,
      docType,
      reasonMessage: String(reasonMessage).trim(),
      requestedAt: now,
      expiresAt,
      usedAt: null,
      requestedBy: req.user?._id || null,
    };

    await employer.save();

    const frontendUrl = process.env.FRONTEND_URL || process.env.APP_URL || 'https://agapayy.onrender.com';
    const resubmitUrl = `${frontendUrl}/resubmit-document?token=${rawToken}`;

    sendResubmitDocumentEmail({
      to: employer.email,
      fullName: employer.fullName || employer.email,
      docLabel: EMPLOYER_DOC_LABELS[docType] || docType,
      reasonMessage: String(reasonMessage).trim(),
      resubmitUrl,
    }).catch((emailError) => {
      console.error('Failed to send employer resubmit email:', emailError);
    });

    res.status(200).json({
      success: true,
      message: 'Employer placed on HOLD and resubmit email sent successfully.',
      employer: {
        _id: employer._id,
        email: employer.email,
        overallStatus: employer.employerProfile.verificationDocs.overallStatus,
        remarks: employer.employerProfile.verificationDocs.remarks || '',
        resubmitRequest: {
          docType,
          reasonMessage: String(reasonMessage).trim(),
          requestedAt: now,
          expiresAt,
        }
      }
    });
  } catch (error) {
    console.error('Error placing employer on hold:', error);
    res.status(500).json({
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
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);

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

    const allStats = statsUsers.map(normalizeJobseekerForList).reduce(
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
      normalized.map((item) => item.campus),
      normalizeDashboardCampus
    );
    const courses = uniqueNormalizedOptions(normalized.map((item) => item.course));
    const addresses = uniqueNormalizedOptions(normalized.map((item) => item.address));

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
    const totalPages = Math.max(Math.ceil(totalItems / limit), 1);
    const safePage = Math.min(page, totalPages);
    const skip = (safePage - 1) * limit;

    const paginated = filtered.slice(skip, skip + limit);

    res.status(200).json({
      success: true,
      jobseekers: paginated,
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
      pagination: {
        page: safePage,
        limit,
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
    const { overallStatus, adminRemarks, rejectionReasons, rejectionMessage } = req.body;
    const DEFAULT_JOBSEEKER_REJECTION_MESSAGE = 'Your verification request was rejected. Please contact support.';

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

    const prevStatus = jobseeker?.jobSeekerProfile?.verificationDocs?.overallStatus || 'not_submitted';

    const verificationStatus = getJobseekerVerificationStatus(jobseeker);
    if (verificationStatus.submittedCount === 0 && overallStatus === 'verified') {
      return res.status(400).json({
        success: false,
        message: 'Cannot verify jobseeker with no uploaded documents'
      });
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

        const finalRejectionMessage = String(rejectionMessage || '').trim() || DEFAULT_JOBSEEKER_REJECTION_MESSAGE;

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

      await jobseeker.save();

      sendCredentialsEmail({
        to: jobseeker.email,
        fullName: jobseeker.fullName || jobseeker.email,
        username: finalUsername,
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
    const { docType, reasonMessage } = req.body;

    if (!JOBSEEKER_DOC_TYPES.includes(String(docType || ''))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid document type selected for resubmission'
      });
    }

    if (!String(reasonMessage || '').trim()) {
      return res.status(400).json({
        success: false,
        message: 'Reason/message is required'
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

    const targetDocument = jobseeker.jobSeekerProfile.verificationDocs[docType];
    if (!targetDocument?.url) {
      return res.status(400).json({ success: false, message: 'Only submitted credentials can be requested for resubmission.' });
    }
    if (!['pending', 'submitted', 'hold'].includes(String(targetDocument.status || '').toLowerCase())) {
      return res.status(400).json({ success: false, message: 'Only pending credentials can be requested for resubmission.' });
    }

    const wasAccountVerified = isApprovedJobseekerAccount(jobseeker);

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = User.hashToken(rawToken);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 1000 * 60 * 60 * 48);

    jobseeker.jobSeekerProfile.verificationDocs.overallStatus = 'hold';
    jobseeker.jobSeekerProfile.verificationDocs.adminRemarks = String(reasonMessage).trim();
    if (!wasAccountVerified) {
      jobseeker.jobSeekerProfile.verificationDocs.verifiedBy = null;
      jobseeker.jobSeekerProfile.verificationDocs.verifiedAt = null;
    }
    jobseeker.jobSeekerProfile.verificationDocs.rejectionReasons = [];
    jobseeker.jobSeekerProfile.verificationDocs.rejectionMessage = '';
    jobseeker.jobSeekerProfile.verificationDocs.rejectedAt = null;

    if (!jobseeker.jobSeekerProfile.verificationDocs[docType]) {
      jobseeker.jobSeekerProfile.verificationDocs[docType] = {};
    }

    jobseeker.jobSeekerProfile.verificationDocs[docType].status = 'hold';
    jobseeker.jobSeekerProfile.verificationDocs[docType].checked = false;
    jobseeker.jobSeekerProfile.verificationDocs[docType].checkedAt = null;
    jobseeker.jobSeekerProfile.verificationDocs[docType].checkedBy = null;
    jobseeker.jobSeekerProfile.verificationDocs.resubmitRequest = {
      tokenHash,
      docType,
      reasonMessage: String(reasonMessage).trim(),
      requestedAt: now,
      expiresAt,
      usedAt: null,
      requestedBy: req.user?._id || null,
    };

    jobseeker.jobSeekerProfile.verificationStatus = wasAccountVerified ? 'verified' : 'hold';

    await jobseeker.save();

    await createJobseekerCredentialNotification({
      user: jobseeker,
      docType,
      action: 'action_needed',
      feedback: String(reasonMessage).trim(),
    });

    const frontendUrl = process.env.FRONTEND_URL || process.env.APP_URL || 'https://agapayy.onrender.com';
    const resubmitUrl = `${frontendUrl}/resubmit-document?token=${rawToken}`;

    sendResubmitDocumentEmail({
      to: jobseeker.email,
      fullName: jobseeker.fullName || jobseeker.email,
      docLabel: JOBSEEKER_DOC_LABELS[docType] || docType,
      reasonMessage: String(reasonMessage).trim(),
      resubmitUrl,
    }).catch((emailError) => {
      console.error('Failed to send jobseeker resubmit email:', emailError);
    });

    res.status(200).json({
      success: true,
      message: 'Jobseeker placed on HOLD and resubmit email sent successfully.',
      jobseeker: {
        _id: jobseeker._id,
        email: jobseeker.email,
        verificationStatus: jobseeker.jobSeekerProfile.verificationStatus,
        overallStatus: jobseeker.jobSeekerProfile.verificationDocs.overallStatus,
        adminRemarks: jobseeker.jobSeekerProfile.verificationDocs.adminRemarks || '',
        resubmitRequest: {
          docType,
          reasonMessage: String(reasonMessage).trim(),
          requestedAt: now,
          expiresAt,
        }
      }
    });
  } catch (error) {
    console.error('Error placing jobseeker on hold:', error);
    res.status(500).json({
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

    const wasAccountVerified = role === 'jobseeker'
      ? isApprovedJobseekerAccount(user)
      : user.isVerified === true;
    document.status = 'approved';
    document.checked = true;
    document.checkedAt = new Date();
    document.checkedBy = req.user?._id || req.userId || null;

    if (role === 'jobseeker' && wasAccountVerified) {
      const nextStatus = getJobseekerCredentialReviewStatus(docs);
      docs.overallStatus = nextStatus;
      user.jobSeekerProfile.verificationStatus = 'verified';
      user.isVerified = true;
    }
    await user.save();

    if (role === 'jobseeker' && wasAccountVerified) {
      await createJobseekerCredentialNotification({ user, docType, action: 'approved' });
    }

    return res.status(200).json({
      success: true,
      message: role === 'jobseeker'
        ? `${JOBSEEKER_DOC_LABELS[docType] || 'Credential'} approved successfully.`
        : 'Document marked as checked.',
      document: { status: document.status, checked: true, checkedAt: document.checkedAt, checkedBy: document.checkedBy },
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
  const deadline = job?.applicationDeadline ? new Date(job.applicationDeadline) : null;
  const isExpired = deadline && !Number.isNaN(deadline.getTime()) && deadline < new Date();

  if (isExpired) return 'Expired';
  if (job?.isActive === false || job?.isPublished === false || job?.status === 'draft') return 'Closed';
  return 'Open';
};

const getAdminJobDateRange = (dateFilter) => {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  const filter = String(dateFilter || 'all').toLowerCase();
  if (filter === 'today') return { $gte: start };
  if (filter === '7days') {
    start.setDate(start.getDate() - 6);
    return { $gte: start };
  }
  if (filter === '30days') {
    start.setDate(start.getDate() - 29);
    return { $gte: start };
  }
  return null;
};

exports.getAdminJobOffers = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 4, 1), 100);
    const search = String(req.query.search || '').trim();
    const status = String(req.query.status || '').trim().toLowerCase();
    const company = String(req.query.company || '').trim();
    const industry = String(req.query.industry || '').trim();
    const jobTitle = String(req.query.jobTitle || '').trim();
    const dateRange = getAdminJobDateRange(req.query.date);

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

    const allJobs = await Job.find(baseQuery)
      .populate('employer', 'employerProfile.companyLogo employerProfile.industry employerProfile.companyName')
      .sort({ createdAt: -1 })
      .lean();

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

    const stats = transformedJobs.reduce(
      (acc, job) => {
        acc.totalJobs += 1;
        if (job.adminStatus === 'Open') acc.active += 1;
        if (job.adminStatus === 'Closed') acc.closed += 1;
        if (job.adminStatus === 'Expired') acc.expired += 1;
        return acc;
      },
      { totalJobs: 0, active: 0, closed: 0, expired: 0 }
    );

    const statusFilteredJobs = status
      ? transformedJobs.filter((job) => String(job.adminStatus || '').toLowerCase() === status)
      : transformedJobs;

    const total = statusFilteredJobs.length;
    const paginatedJobs = statusFilteredJobs.slice((page - 1) * limit, page * limit);

    const uniqueSorted = (values) => [...new Set(values.map((v) => String(v || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));

    return res.status(200).json({
      success: true,
      jobs: paginatedJobs,
      stats,
      options: {
        companies: uniqueSorted(transformedJobs.map((job) => job.companyName)),
        industries: uniqueSorted(transformedJobs.map((job) => job.category)),
        jobTitles: uniqueSorted(transformedJobs.map((job) => job.title)),
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
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
      post: { key: 'post', label: 'Post', order: 1 },
      comment: { key: 'comment', label: 'Comment', order: 2 },
      'job-post': { key: 'job-post', label: 'Job Post', order: 3 },
      'declined-applicants': {
        key: 'declined-applicants',
        label: 'Declined Applicants',
        order: 4,
      },
      'inactive-account': {
        key: 'inactive-account',
        label: 'Inactive Account',
        order: 5,
      },
    };

    const grouped = new Map();

    const ensureGroup = (account) => {
      if (!account?._id) return null;
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

    const [communityPosts, archivedJobs, archivedDeclinedApplications, inactiveUsers] =
      await Promise.all([
        CommunityPost.find({
          $or: [
            { isDeleted: true },
            { comments: { $elemMatch: { isDeleted: true } } },
          ],
        })
          .populate('author', archiveUserFields)
          .populate('comments.author', archiveUserFields)
          .lean(),
        Job.find({
          $or: [{ isArchived: true }, { archivedAt: { $ne: null } }],
        })
          .populate('employer', archiveUserFields)
          .select(
            'title companyName companyLogo employer status isActive isPublished isArchived archivedAt applicationDeadline createdAt updatedAt'
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

    communityPosts.forEach((post) => {
      if (post.isDeleted === true) {
        addRecord(post.author, {
          archiveType: 'post',
          typeLabel: 'Post',
          title: 'Community Post',
          content: post.content || '',
          archivedAt: post.deletedAt || post.updatedAt,
          searchText: [post.category, ...(post.topics || [])].filter(Boolean).join(' '),
        });
      }

      (post.comments || []).forEach((comment) => {
        if (comment.isDeleted !== true) return;
        addRecord(comment.author, {
          archiveType: 'comment',
          typeLabel: 'Comment',
          title: 'Community Comment',
          content: comment.content || '',
          postContent: post.content || '',
          archivedAt: comment.deletedAt || comment.updatedAt,
        });
      });
    });

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
      const archivedTypes = archivedTypeKeys
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

      const [communityPosts, archivedJobs, archivedDeclinedApplications] = await Promise.all([
        CommunityPost.find({
          $or: [
            { author: id, isDeleted: true },
            { comments: { $elemMatch: { author: id, isDeleted: true } } },
          ],
        })
          .populate('deletedBy', 'email firstName middleName lastName fullName')
          .populate('comments.deletedBy', 'email firstName middleName lastName fullName')
          .lean(),
        account.role === 'employer'
          ? Job.find({
              employer: id,
              $or: [{ isArchived: true }, { archivedAt: { $ne: null } }],
            })
              .select(
                'title companyName companyLogo employer status applicationDeadline isActive isPublished isArchived archivedAt createdAt updatedAt'
              )
              .lean()
          : [],
        account.role === 'employer'
          ? Application.find({
              employer: id,
              status: 'declined',
              isDeclinedArchived: true,
            })
              .populate('job', 'title companyName companyLogo')
              .populate(
                'jobseeker',
                'email firstName middleName lastName fullName profileImage jobSeekerProfile'
              )
              .select(
                'job jobseeker employer status hiringStage lastActiveStatus declinedFrom declineReason declineComment appliedAt reviewedAt updatedAt activityHistory isDeclinedArchived declinedArchivedAt'
              )
              .sort({ declinedArchivedAt: -1, updatedAt: -1 })
              .lean()
          : [],
      ]);

      const records = [];

      communityPosts.forEach((post) => {
        if (String(post.author || '') === String(id) && post.isDeleted === true) {
          records.push({
            recordId: `post-${post._id}`,
            archiveType: 'post',
            typeLabel: 'Post',
            title: 'Community Post',
            subtitle: post.category ? `Category: ${post.category}` : '',
            content: post.content || '',
            category: post.category || '',
            topics: post.topics || [],
            imageUrl: post.imageUrl || '',
            linkUrl: post.linkUrl || '',
            archivedAt: post.deletedAt || post.updatedAt,
            archivedBy: getArchiveUserName(post.deletedBy || {}),
            postId: String(post._id),
          });
        }

        (post.comments || []).forEach((comment) => {
          if (String(comment.author || '') !== String(id) || comment.isDeleted !== true) return;

          records.push({
            recordId: `comment-${comment._id}`,
            archiveType: 'comment',
            typeLabel: 'Comment',
            title: 'Community Comment',
            subtitle: post.category ? `Category: ${post.category}` : '',
            content: comment.content || '',
            postContent: post.content || '',
            category: post.category || '',
            topics: post.topics || [],
            archivedAt: comment.deletedAt || comment.updatedAt,
            archivedBy: getArchiveUserName(comment.deletedBy || {}),
            postId: String(post._id),
            commentId: String(comment._id),
          });
        });
      });

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
            applicants: [],
          });
        }

        const group = declinedByJob.get(jobId);
        if (new Date(archivedAt || 0) > new Date(group.archivedAt || 0)) {
          group.archivedAt = archivedAt;
        }

        const jobseeker = application.jobseeker || {};
        const profile = jobseeker.jobSeekerProfile || {};
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
          String(application.hiringStage || '').trim() ||
          (application.declinedFrom === 'forInterview'
            ? 'For Interview'
            : application.declinedFrom === 'applicants'
              ? 'Initial Screening'
              : application.lastActiveStatus === 'for interview'
                ? 'For Interview'
                : 'Application Review');

        group.applicants.push({
          applicationId: String(application._id),
          _id: String(application._id),
          applicantName:
            jobseeker.fullName ||
            [jobseeker.firstName, jobseeker.middleName, jobseeker.lastName]
              .filter(Boolean)
              .join(' ') ||
            jobseeker.email ||
            'Jobseeker',
          email: jobseeker.email || '',
          profileImage: jobseeker.profileImage || profile.profileImage || '',
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
            application.declinedFrom === 'forInterview'
              ? 'For Interview'
              : application.declinedFrom === 'applicants'
                ? 'Initial Screening'
                : application.lastActiveStatus === 'for interview'
                  ? 'For Interview'
                  : 'Application Review',
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
