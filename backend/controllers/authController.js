// BACKEND/controllers/authController.js
const User = require('../models/User');
const Notification = require('../models/Notification');
const notificationController = require('./notificationController');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const https = require('https');
const querystring = require('querystring');
const { sendCredentialsEmail, sendPasswordResetEmail, sendSettingsEmailVerificationCode } = require('../config/mailer');
const puppeteer = require('puppeteer');
const { v2: cloudinary } = require('cloudinary');

if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

// Optional email sending
let nodemailer = null;
try {
  nodemailer = require('nodemailer');
} catch {
  nodemailer = null;
}

const makePublicUrl = (req, relativePath) => {
  const base = process.env.PUBLIC_BASE_URL || 'https://phinmaau-job-portal-atlas.onrender.com';
  if (/^https?:\/\//i.test(relativePath)) return relativePath;
  if (!relativePath.startsWith('/')) return `${base}/${relativePath}`;
  return `${base}${relativePath}`;
};

const getUploadedFileUrl = (req, file, fallbackRelativePath) => {
  if (file?.path && /^https?:\/\//i.test(file.path)) {
    return file.path;
  }

  if (file?.secure_url && /^https?:\/\//i.test(file.secure_url)) {
    return file.secure_url;
  }

  return makePublicUrl(req, fallbackRelativePath);
};

const boolFromBody = (v) => String(v || '').toLowerCase() === 'true';

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const signToken = (payload, expiresIn = '7d') =>
  jwt.sign(payload, process.env.JWT_SECRET || 'your_super_secret_jwt_key_here_change_this', { expiresIn });

const generateEmailVerifyToken = () => crypto.randomBytes(32).toString('hex');
const generatePasswordResetToken = () => crypto.randomBytes(32).toString('hex');
const hashToken = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');
const generateNumericOtp = () => String(crypto.randomInt(100000, 1000000));
const SETTINGS_OTP_EXPIRES_MINUTES = 10;

const normalizePhoneNumber = (phoneNumber) => {
  const raw = String(phoneNumber || '').trim();
  if (!raw) return '';

  let clean = raw.replace(/[\s()-]/g, '');
  if (clean.startsWith('+')) return clean;
  if (clean.startsWith('63')) return `+${clean}`;
  if (clean.startsWith('09')) return `+63${clean.slice(1)}`;
  if (clean.startsWith('9') && clean.length === 10) return `+63${clean}`;
  return clean;
};

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

const normalizeExtensionName = (value) => {
  const clean = String(value || '').trim();
  return clean.toLowerCase() === 'none' ? '' : clean;
};

const sendBrevoSms = async ({ to, message }) => {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey || apiKey === 'your_brevo_api_key_here') {
    throw new Error('Brevo SMS API key is not configured. Please set BREVO_API_KEY in your backend .env.');
  }

  const recipient = normalizePhoneNumber(to);
  if (!recipient) throw new Error('Recipient phone number is required.');

  const payload = JSON.stringify({
    sender: 'AGAPAY',
    recipient,
    content: message,
    type: 'transactional',
  });

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'api.brevo.com',
        path: '/v3/transactionalSMS/sms',
        method: 'POST',
        headers: {
          accept: 'application/json',
          'api-key': apiKey,
          'content-type': 'application/json',
          'content-length': Buffer.byteLength(payload),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) return resolve(body);
          return reject(new Error(`Brevo SMS failed: ${body || res.statusCode}`));
        });
      }
    );

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
};


const verifyRecaptchaToken = (token, remoteIp) =>
  new Promise((resolve, reject) => {
    const secret = process.env.RECAPTCHA_SECRET_KEY;

    if (!secret) {
      return resolve({
        ok: false,
        code: 'RECAPTCHA_NOT_CONFIGURED',
        message: 'reCAPTCHA is not configured on the server.',
      });
    }

    if (!token || !String(token).trim()) {
      return resolve({
        ok: false,
        code: 'RECAPTCHA_REQUIRED',
        message: 'Please complete the CAPTCHA.',
      });
    }

    const postData = querystring.stringify({
      secret,
      response: String(token).trim(),
      remoteip: remoteIp || '',
    });

    const req = https.request(
      {
        hostname: 'www.google.com',
        path: '/recaptcha/api/siteverify',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData),
        },
      },
      (res) => {
        let body = '';

        res.on('data', (chunk) => {
          body += chunk;
        });

        res.on('end', () => {
          try {
            const parsed = JSON.parse(body || '{}');

            if (parsed.success) {
              return resolve({ ok: true, data: parsed });
            }

            return resolve({
              ok: false,
              code: 'RECAPTCHA_FAILED',
              message: 'CAPTCHA verification failed. Please try again.',
              data: parsed,
            });
          } catch (error) {
            return reject(error);
          }
        });
      }
    );

    req.on('error', (error) => reject(error));
    req.write(postData);
    req.end();
  });

const sendEmailIfConfigured = async ({ to, subject, html }) => {
  if (!nodemailer) return { ok: false, reason: 'nodemailer_not_installed' };

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 0);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  if (!host || !port || !user || !pass || !from) {
    return { ok: false, reason: 'smtp_not_configured' };
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({ from, to, subject, html });
  return { ok: true };
};

// Alumni doc meta
const buildAlumniDocMeta = (req, file, fieldName) => {
  if (!file) return null;
  const rel = `/uploads/verification/alumni/${fieldName}/${file.filename}`;
  return {
    url: getUploadedFileUrl(req, file, rel),
    status: 'pending',
    uploadedAt: new Date(),
    filename: file.originalname,
    fileSize: file.size,
    mimeType: file.mimetype,
  };
};

// Employer doc meta
const buildEmployerDocMeta = (req, file, folder) => {
  if (!file) return null;
  const rel = `/uploads/verification/employer/${folder}/${file.filename}`;
  return {
    url: getUploadedFileUrl(req, file, rel),
    status: 'pending',
    uploadedAt: new Date(),
    filename: file.originalname,
    fileSize: file.size,
    mimeType: file.mimetype,
  };
};

const generateRandomPassword = () => crypto.randomBytes(16).toString('hex');

// Generate username from email local-part
const baseUsernameFromEmail = (email) => {
  const local = String(email || '').split('@')[0] || 'user';
  return local.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 24) || 'user';
};

const makeUniqueUsername = async (base) => {
  let candidate = base;
  let i = 0;
  while (true) {
    const exists = await User.findOne({ username: candidate });
    if (!exists) return candidate;
    i += 1;
    candidate = `${base}_${i}`.slice(0, 30);
  }
};

const normalizeWorkExperienceOutput = (entry) => ({
  _id: entry?._id,
  companyName: entry?.companyName || '',
  positionTitle: entry?.positionTitle || '',
  startDate: entry?.startDate || null,
  endDate: entry?.endDate || null,
  isPresent: Boolean(entry?.isPresent),
  description: entry?.description || '',
  createdAt: entry?.createdAt || null,
  updatedAt: entry?.updatedAt || null,
});

const sortWorkExperiences = (items = []) => {
  return [...items].sort((a, b) => {
    const aDate = a?.startDate ? new Date(a.startDate).getTime() : 0;
    const bDate = b?.startDate ? new Date(b.startDate).getTime() : 0;
    return bDate - aDate;
  });
};

const isStrongPassword = (value) => {
  const password = String(value || '');
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
};

// NEW helpers for employer media
const buildEmployerCoverPhotoMeta = (req, file) => {
  if (!file) return '';
  return getUploadedFileUrl(req, file, `/uploads/company-cover-photos/${file.filename}`);
};

const buildEmployerGalleryImageMeta = (req, file) => {
  if (!file) return null;
  return {
    url: getUploadedFileUrl(req, file, `/uploads/company-gallery/${file.filename}`),
    caption: '',
    uploadedAt: new Date(),
  };
};

const normalizeGalleryImagesInput = (incoming, current = []) => {
  if (incoming === undefined || incoming === null || incoming === '') return current;

  let parsed = incoming;

  if (typeof incoming === 'string') {
    const trimmed = incoming.trim();

    if (!trimmed) return [];

    try {
      parsed = JSON.parse(trimmed);
    } catch {
      parsed = trimmed
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  if (!Array.isArray(parsed)) return current;

  return parsed
    .map((item) => {
      if (typeof item === 'string') {
        const url = item.trim();
        if (!url) return null;
        return { url, caption: '', uploadedAt: new Date() };
      }

      if (item && typeof item === 'object') {
        const url = String(item.url || '').trim();
        if (!url) return null;
        return {
          url,
          caption: String(item.caption || '').trim(),
          uploadedAt: item.uploadedAt || new Date(),
        };
      }

      return null;
    })
    .filter(Boolean);
};

// ✅ NEW: required docs for jobseeker registration/verification
const REQUIRED_ALUMNI_DOC_TYPES = ['cv', 'diploma', 'validId', 'tor'];
const OPTIONAL_ALUMNI_DOC_TYPES = ['sss', 'philhealth', 'pagibig', 'tin'];
const ALL_ALUMNI_DOC_TYPES = [...REQUIRED_ALUMNI_DOC_TYPES, ...OPTIONAL_ALUMNI_DOC_TYPES];

const getAlumniOverallStatus = (verificationDocs = {}, forceVerified = false) => {
  if (forceVerified) return 'verified';

  const overallStatus = String(verificationDocs?.overallStatus || '').toLowerCase();
  if (overallStatus === 'hold') return 'hold';

  const requiredStatuses = REQUIRED_ALUMNI_DOC_TYPES.map((type) =>
    String(verificationDocs?.[type]?.status || 'not_submitted')
  );

  const hasHoldRequired = requiredStatuses.some((status) => status === 'hold');
  if (hasHoldRequired) return 'hold';

  const hasRejectedRequired = requiredStatuses.some((status) => status === 'rejected');
  if (hasRejectedRequired) return 'rejected';

  const allRequiredApproved = requiredStatuses.every((status) => status === 'approved');
  if (allRequiredApproved) return 'verified';

  const hasAnyRequiredSubmitted = requiredStatuses.some((status) =>
    ['pending', 'submitted', 'approved'].includes(status)
  );
  if (hasAnyRequiredSubmitted) return 'pending';

  return 'not_submitted';
};

const ALUMNI_DOC_LABELS = {
  cv: 'CV / Resume',
  tor: 'Transcript of Records',
  diploma: 'Diploma',
  sss: 'SSS ID/Number',
  philhealth: 'PhilHealth ID',
  pagibig: 'Pag-IBIG ID',
  tin: 'TIN ID',
  validId: 'Valid ID',
};


const ALUMNI_VERIFICATION_DOWNLOAD_DOC_TYPES = ['cv', 'tor', 'diploma', 'sss', 'philhealth', 'pagibig', 'tin', 'validId'];

const sanitizeDownloadFileName = (value, fallback = 'credential') => {
  const clean = String(value || fallback)
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, ' ');

  return clean || fallback;
};

const parseCloudinaryDeliveryUrl = (rawUrl = '') => {
  try {
    const parsed = new URL(rawUrl);
    if (!/res\.cloudinary\.com$/i.test(parsed.hostname)) return null;

    const pathParts = parsed.pathname.split('/').filter(Boolean);
    const resourceType = pathParts[1] || 'image';
    const deliveryType = pathParts[2] || 'upload';
    const versionIndex = pathParts.findIndex((part) => /^v\d+$/.test(part));
    const publicParts = versionIndex >= 0 ? pathParts.slice(versionIndex + 1) : pathParts.slice(3);
    const publicIdWithExtension = publicParts.join('/');

    if (!publicIdWithExtension) return null;

    const lastSlashIndex = publicIdWithExtension.lastIndexOf('/');
    const filePart = lastSlashIndex >= 0 ? publicIdWithExtension.slice(lastSlashIndex + 1) : publicIdWithExtension;
    const dotIndex = filePart.lastIndexOf('.');
    const format = dotIndex > 0 ? filePart.slice(dotIndex + 1) : '';
    const publicId = format ? publicIdWithExtension.slice(0, -(format.length + 1)) : publicIdWithExtension;

    return { resourceType, deliveryType, publicId, format, originalUrl: rawUrl };
  } catch {
    return null;
  }
};

const getContentTypeFromFileName = (fileName = '', fallback = 'application/octet-stream') => {
  const lower = String(fileName || '').toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  return fallback;
};

const fetchUrlBuffer = (rawUrl, redirectCount = 0) => new Promise((resolve, reject) => {
  if (redirectCount > 5) return reject(new Error('Too many redirects while downloading file.'));

  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch (error) {
    return reject(error);
  }

  const client = parsed.protocol === 'http:' ? require('http') : https;
  const request = client.get(parsed, (response) => {
    const statusCode = response.statusCode || 0;

    if ([301, 302, 303, 307, 308].includes(statusCode) && response.headers.location) {
      response.resume();
      const redirectUrl = new URL(response.headers.location, rawUrl).toString();
      return resolve(fetchUrlBuffer(redirectUrl, redirectCount + 1));
    }

    if (statusCode < 200 || statusCode >= 300) {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { body += chunk; });
      response.on('end', () => reject(new Error(`File source responded with ${statusCode}${body ? `: ${body.slice(0, 160)}` : ''}`)));
      return;
    }

    const chunks = [];
    response.on('data', (chunk) => chunks.push(chunk));
    response.on('end', () => resolve({
      buffer: Buffer.concat(chunks),
      contentType: response.headers['content-type'] || '',
    }));
  });

  request.on('error', reject);
  request.setTimeout(45000, () => {
    request.destroy(new Error('File download timed out.'));
  });
});

const buildCredentialDownloadCandidates = ({ rawUrl, fileName, disposition }) => {
  const candidates = [];
  const cloudinaryInfo = parseCloudinaryDeliveryUrl(rawUrl);
  const attachmentFlag = disposition === 'attachment'
    ? `attachment:${sanitizeDownloadFileName(fileName || 'credential')}`
    : undefined;

  if (cloudinaryInfo && process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
    const { publicId, format, resourceType, deliveryType } = cloudinaryInfo;

    try {
      if (typeof cloudinary.utils.private_download_url === 'function' && format) {
        candidates.push(cloudinary.utils.private_download_url(publicId, format, {
          resource_type: resourceType,
          type: deliveryType,
          attachment: disposition === 'attachment',
        }));
      }
    } catch (error) {
      console.warn('Unable to build Cloudinary private download URL:', error.message);
    }

    try {
      candidates.push(cloudinary.url(publicId, {
        resource_type: resourceType,
        type: deliveryType,
        secure: true,
        sign_url: true,
        format: format || undefined,
        flags: attachmentFlag || undefined,
      }));
    } catch (error) {
      console.warn('Unable to build signed Cloudinary URL:', error.message);
    }
  }

  if (rawUrl) {
    if (disposition === 'attachment' && /\/upload\//.test(rawUrl)) {
      candidates.push(rawUrl.replace('/upload/', `/upload/fl_attachment:${encodeURIComponent(sanitizeDownloadFileName(fileName || 'credential'))}/`));
      candidates.push(rawUrl.replace('/upload/', '/upload/fl_attachment/'));
    }
    candidates.push(rawUrl);
  }

  return [...new Set(candidates.filter(Boolean))];
};

const EMPLOYER_DOC_LABELS = {
  secRegistration: 'SEC Registration',
  birRegistration: 'BIR Registration',
  dtiRegistration: 'DTI Registration',
  cityPermit: 'City/Municipality Permit',
  businessPermit: 'Business Permit',
};

const EMPLOYER_DOC_FOLDERS = {
  secRegistration: 'sec',
  birRegistration: 'bir',
  dtiRegistration: 'dti',
  cityPermit: 'city',
  businessPermit: 'business',
};

const findResubmitRequestByToken = async (tokenHash) => {
  const jobseeker = await User.findOne({
    role: 'jobseeker',
    'jobSeekerProfile.verificationDocs.resubmitRequest.tokenHash': tokenHash,
  });

  if (jobseeker) {
    return {
      accountType: 'jobseeker',
      user: jobseeker,
      docs: jobseeker?.jobSeekerProfile?.verificationDocs || {},
      resubmitRequest: jobseeker?.jobSeekerProfile?.verificationDocs?.resubmitRequest || {},
      labels: ALUMNI_DOC_LABELS,
    };
  }

  const employer = await User.findOne({
    role: 'employer',
    'employerProfile.verificationDocs.resubmitRequest.tokenHash': tokenHash,
  });

  if (employer) {
    return {
      accountType: 'employer',
      user: employer,
      docs: employer?.employerProfile?.verificationDocs || {},
      resubmitRequest: employer?.employerProfile?.verificationDocs?.resubmitRequest || {},
      labels: EMPLOYER_DOC_LABELS,
    };
  }

  return null;
};

const createAdminResubmissionNotifications = async ({ subjectUser, accountType, docType, docLabel }) => {
  try {
    const admins = await User.find({ role: 'admin', status: { $ne: 'deleted' } }).select('_id');
    if (!admins.length) return;

    const displayName =
      accountType === 'employer'
        ? subjectUser?.employerProfile?.companyName ||
          subjectUser.fullName ||
          subjectUser.email
        : subjectUser.fullName ||
          `${subjectUser.firstName || ''} ${subjectUser.lastName || ''}`.replace(/\s+/g, ' ').trim() ||
          subjectUser.email;

    const link =
      accountType === 'employer'
        ? `/admin/employer-verification/${subjectUser._id}`
        : `/admin/jobseeker-verification/${subjectUser._id}`;

    const notifications = admins.map((admin) => ({
      user: admin._id,
      type: 'system',
      title: 'Verification Resubmission',
      message: `${displayName} has resubmitted a new ${docLabel || docType}.`,
      relatedId: subjectUser._id,
      relatedModel: 'User',
      link,
      isRead: false,
      isArchived: false,
      metadata: {
        accountType,
        docType,
        docLabel: docLabel || docType,
        subjectUserId: subjectUser._id,
      },
    }));

    await Notification.insertMany(notifications);
  } catch (notificationError) {
    console.error('Error creating admin notifications for resubmission:', notificationError);
  }
};

// ---------------------------
// JOBSEEKER REGISTER (AGAPAY UPDATED)
// ---------------------------
exports.register = async (req, res) => {
  try {
    const {
      // Step 1
      course,
      campus,
      yearGraduated,
      preferredWorkMode,
      technicalSkills,
      softSkills,
      whatHaveYouDone,
      howSoonCanYouStart,

      // Step 2
      firstName,
      middleName,
      lastName,
      extensionName,
      email,
      phoneNumber,
    } = req.body;

    const emailLower = normalizeEmail(email);
    if (!emailLower) return res.status(400).json({ message: 'Email is required' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLower)) {
      return res.status(400).json({ message: 'Invalid email address' });
    }

    if (
      !course ||
      !campus ||
      !yearGraduated ||
      !preferredWorkMode ||
      !howSoonCanYouStart
    ) {
      return res.status(400).json({ message: 'Please complete Career Profile fields' });
    }

    if (!firstName || !lastName || !phoneNumber) {
      return res.status(400).json({ message: 'Please complete Basic Information fields' });
    }

    const files = req.files || {};
    const requiredDocs = ['cv', 'diploma', 'validId', 'tor'];
    const missing = requiredDocs.filter((k) => !(files?.[k]?.[0]));
    if (missing.length) {
      return res.status(400).json({ message: `Missing required documents: ${missing.join(', ')}` });
    }

    const existingEmail = await User.findOne({ email: emailLower });
    if (existingEmail) return res.status(400).json({ message: 'User already exists with this email' });

    const baseUsername = baseUsernameFromEmail(emailLower);
    const usernameUnique = await makeUniqueUsername(baseUsername);

    const rawPassword = generateRandomPassword();
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(rawPassword, salt);

    const cvMeta = buildAlumniDocMeta(req, files?.cv?.[0], 'cv');
    const diplomaMeta = buildAlumniDocMeta(req, files?.diploma?.[0], 'diploma');
    const validIdMeta = buildAlumniDocMeta(req, files?.validId?.[0], 'validId');
    const torMeta = buildAlumniDocMeta(req, files?.tor?.[0], 'tor');

    const sssMeta = buildAlumniDocMeta(req, files?.sss?.[0], 'sss');
    const philhealthMeta = buildAlumniDocMeta(req, files?.philhealth?.[0], 'philhealth');
    const pagibigMeta = buildAlumniDocMeta(req, files?.pagibig?.[0], 'pagibig');
    const tinMeta = buildAlumniDocMeta(req, files?.tin?.[0], 'tin');
    const profileImageFile = files?.profileImage?.[0];
    const profileImage = profileImageFile
      ? getUploadedFileUrl(
          req,
          profileImageFile,
          `/uploads/profile-images/${profileImageFile.filename}`
        )
      : '';

    const verificationDocs = {
      cv: cvMeta,
      diploma: diplomaMeta,
      validId: validIdMeta,
      tor: torMeta,
      sss: sssMeta,
      philhealth: philhealthMeta,
      pagibig: pagibigMeta,
      tin: tinMeta,
      overallStatus: 'pending',
    };

    const userData = {
      username: usernameUnique,
      email: emailLower,
      password: hashedPassword,
      role: 'jobseeker',

      firstName: String(firstName || '').trim(),
      middleName: String(middleName || '').trim(),
      lastName: String(lastName || '').trim(),
      extensionName: normalizeExtensionName(extensionName),
      profileImage,

      jobSeekerProfile: {
        course: normalizeCourseValue(course),
        campus: String(campus || '').trim(),
        yearGraduated: String(yearGraduated || '').trim(),
        preferredWorkMode: String(preferredWorkMode || '').trim(),
        technicalSkills: String(technicalSkills || '').trim(),
        softSkills: String(softSkills || '').trim(),
        whatHaveYouDone: String(whatHaveYouDone || '').trim(),
        howSoonCanYouStart: String(howSoonCanYouStart || '').trim(),
        phoneNumber: String(phoneNumber || '').trim(),
        salaryCurrency: 'PHP',

        verificationDocs,
        verificationStatus: 'pending',
      },
    };

    const user = new User(userData);
    await user.save();
    await notificationController.createAdminUserRegistrationNotification(user, 'jobseeker');

    const token = signToken({ userId: user._id, role: user.role });

    res.status(201).json({
      message: 'Registration submitted successfully!',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        middleName: user.middleName,
        lastName: user.lastName,
        extensionName: user.extensionName,
        profileImage: user.profileImage,
        mustChangePassword: user.mustChangePassword,
        jobSeekerProfile: user.jobSeekerProfile,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      message: 'Server error. Please try again later.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// ---------------------------
// EMPLOYER REGISTER
// ---------------------------
exports.registerEmployer = async (req, res) => {
  try {
    const {
      firstName,
      middleName,
      lastName,
      extensionName,
      companyName,
      companyWebsiteUrl,
      businessEmail,
      mobileNumber,
      regionCity,
      industry,
    } = req.body;

    if (!firstName || !String(firstName).trim()) return res.status(400).json({ message: 'First name is required.' });
    if (!lastName || !String(lastName).trim()) return res.status(400).json({ message: 'Last name is required.' });

    if (!companyName || !String(companyName).trim()) return res.status(400).json({ message: 'Company name is required.' });

    const emailLower = normalizeEmail(businessEmail);
    if (!emailLower) return res.status(400).json({ message: 'Business email is required.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLower)) {
      return res.status(400).json({ message: 'Invalid business email address.' });
    }

    if (!mobileNumber || !String(mobileNumber).trim()) {
      return res.status(400).json({ message: 'Phone / Mobile number is required.' });
    }

    if (!industry || !String(industry).trim()) {
      return res.status(400).json({ message: 'Industry is required.' });
    }

    const files = req.files || {};
    const required = ['secRegistration', 'birRegistration', 'dtiRegistration', 'cityPermit', 'businessPermit'];
    const missing = required.filter((k) => !(files?.[k]?.[0]));
    if (missing.length) {
      return res.status(400).json({ message: `Missing required documents: ${missing.join(', ')}` });
    }

    const existingEmail = await User.findOne({ email: emailLower });
    if (existingEmail) return res.status(400).json({ message: 'User already exists with this email.' });

    const baseFromCompany = String(companyName || '')
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '')
      .slice(0, 20);

    const base = baseFromCompany || baseUsernameFromEmail(emailLower) || 'employer';
    const tempUsername = await makeUniqueUsername(`emp_${base}`.slice(0, 24));

    const tempRawPassword = generateRandomPassword();
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(tempRawPassword, salt);

    const secMeta = buildEmployerDocMeta(req, files?.secRegistration?.[0], 'sec');
    const birMeta = buildEmployerDocMeta(req, files?.birRegistration?.[0], 'bir');
    const dtiMeta = buildEmployerDocMeta(req, files?.dtiRegistration?.[0], 'dti');
    const cityMeta = buildEmployerDocMeta(req, files?.cityPermit?.[0], 'city');
    const businessPermitMeta = buildEmployerDocMeta(req, files?.businessPermit?.[0], 'business');

    let companyLogoUrl = '';
    if (files?.companyLogo?.[0]) {
      const logoRel = `/uploads/logos/${files.companyLogo[0].filename}`;
      companyLogoUrl = getUploadedFileUrl(req, files.companyLogo[0], logoRel);
    }

    const userData = {
      username: tempUsername,
      role: 'employer',

      email: emailLower,
      password: hashedPassword,

      firstName: String(firstName || '').trim(),
      middleName: String(middleName || '').trim(),
      lastName: String(lastName || '').trim(),
      extensionName: normalizeExtensionName(extensionName),

      status: 'pending',
      isVerified: true,

      employerProfile: {
        companyName: String(companyName || '').trim(),
        companyWebsiteUrl: String(companyWebsiteUrl || '').trim(),
        businessEmail: emailLower,
        mobileNumber: String(mobileNumber || '').trim(),
        regionCity: String(regionCity || '').trim(),
        industry: String(industry || '').trim(),
        companyLogo: companyLogoUrl,

        verificationDocs: {
          secRegistration: secMeta,
          birRegistration: birMeta,
          dtiRegistration: dtiMeta,
          cityPermit: cityMeta,
          businessPermit: businessPermitMeta,
          overallStatus: 'pending',
        },
      },
    };

    const user = new User(userData);
    await user.save();
    await notificationController.createAdminUserRegistrationNotification(user, 'employer');

    return res.status(201).json({
      message: 'Thank you for signing up! Your account is under review.',
      businessEmail: emailLower,
    });
  } catch (error) {
    console.error('Employer registration error:', error);
    res.status(500).json({
      message: 'Server error. Please try again later.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// ---------------------------
// LOGIN
// ---------------------------
exports.login = async (req, res) => {
  try {
    const { username, password, role, recaptchaToken } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Please provide username and password' });
    }

    const recaptcha = await verifyRecaptchaToken(recaptchaToken, req.ip);
    if (!recaptcha.ok) {
      const status = recaptcha.code === 'RECAPTCHA_NOT_CONFIGURED' ? 500 : 400;
      return res.status(status).json({
        code: recaptcha.code,
        message: recaptcha.message,
      });
    }

    const raw = String(username).trim();
    const looksLikeEmail = raw.includes('@');

    let user = null;

    if (looksLikeEmail) {
      const emailLower = normalizeEmail(raw);
      user = await User.findOne({ email: emailLower });
    } else {
      const usernameNorm = raw.toLowerCase();
      user = await User.findOne({ username: usernameNorm });
    }

    if (!user) return res.status(400).json({ message: 'Invalid username or password' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid username or password' });

    if (role && user.role !== role) {
      return res.status(403).json({ message: `Invalid account type for this login page.` });
    }

    if (!user.isActive) return res.status(400).json({ message: 'Account is deactivated. Please contact support.' });

    if (user.role === 'employer') {
      const overall = String(user?.employerProfile?.verificationDocs?.overallStatus || 'unverified');

      if (overall !== 'verified') {
        if (overall === 'rejected') {
          return res.status(403).json({
            code: 'EMPLOYER_REJECTED',
            message: user?.employerProfile?.verificationDocs?.remarks
              ? `Your employer account was rejected. Remarks: ${user.employerProfile.verificationDocs.remarks}`
              : 'Your employer account was rejected by admin.',
          });
        }

        return res.status(403).json({
          code: 'PENDING_ADMIN_APPROVAL',
          message: 'Your account is under review. You will be able to log in once admin approves your account.',
        });
      }

      if (user.status === 'pending') {
        user.status = 'active';
      }
    }

    user.lastLogin = Date.now();
    await user.save();

    const token = signToken({ userId: user._id, role: user.role });

    return res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        profileImage: user.profileImage,
        firstName: user.firstName,
        middleName: user.middleName,
        lastName: user.lastName,
        extensionName: user.extensionName,
        mustChangePassword: Boolean(user.mustChangePassword),
        jobSeekerProfile: user.role === 'jobseeker' ? user.jobSeekerProfile : undefined,
        employerProfile: user.role === 'employer' ? user.employerProfile : undefined,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
};

// ---------------------------
// EMPLOYER LOGIN
// ---------------------------
exports.loginEmployer = async (req, res) => {
  try {
    const emailLower = normalizeEmail(req.body?.businessEmail || req.body?.email);
    const password = req.body?.password;

    if (!emailLower || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email: emailLower, role: 'employer' });
    if (!user) return res.status(400).json({ message: 'Invalid email or password' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid email or password' });

    if (!user.isActive) return res.status(400).json({ message: 'Account is deactivated. Please contact support.' });

    const overall = String(user?.employerProfile?.verificationDocs?.overallStatus || 'unverified');

    if (overall !== 'verified') {
      if (overall === 'rejected') {
        return res.status(403).json({
          code: 'EMPLOYER_REJECTED',
          message: user?.employerProfile?.verificationDocs?.remarks
            ? `Your employer account was rejected. Remarks: ${user.employerProfile.verificationDocs.remarks}`
            : 'Your employer account was rejected by admin.',
        });
      }

      return res.status(403).json({
        code: 'PENDING_ADMIN_APPROVAL',
        message: 'Your account is under review. You will be able to log in once admin approves your account.',
      });
    }

    if (user.status === 'pending') {
      user.status = 'active';
    }

    user.lastLogin = Date.now();
    await user.save();

    const token = signToken({ userId: user._id, role: user.role });

    return res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        middleName: user.middleName,
        lastName: user.lastName,
        extensionName: user.extensionName,
        mustChangePassword: Boolean(user.mustChangePassword),
        employerProfile: user.employerProfile,
      },
    });
  } catch (error) {
    console.error('Employer login error:', error);
    res.status(500).json({ message: 'Server error', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
};

// ---------------------------
// FORGOT PASSWORD
// ---------------------------
exports.forgotPassword = async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);

    if (!email) {
      return res.status(400).json({
        message: 'Email is required.',
      });
    }

    const genericMessage = 'If the email exists, we sent a reset link.';

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(200).json({ message: genericMessage });
    }

    const resetToken = generatePasswordResetToken();
    const tokenHash = hashToken(resetToken);

    const expiresInMinutes = Number(process.env.PASSWORD_RESET_EXPIRES_MINUTES || 30);
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

    user.passwordReset = {
      tokenHash,
      expiresAt,
      requestedAt: new Date(),
      usedAt: null,
    };

    await user.save();

    const appUrl = process.env.FRONTEND_URL || process.env.APP_URL || 'https://phinmaau-job-portal-atlas-1.onrender.com';
    const resetUrl = `${appUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;

    try {
      await sendPasswordResetEmail({
        to: user.email,
        fullName: user.fullName || user.firstName || user.username || 'User',
        resetUrl,
        expiresInMinutes,
      });
    } catch (mailError) {
      console.error('Forgot password email sending error:', mailError);
    }

    return res.status(200).json({
      message: genericMessage,
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({
      message: 'Server error. Please try again later.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// ---------------------------
// RESET PASSWORD
// ---------------------------
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !String(token).trim()) {
      return res.status(400).json({ message: 'Reset token is required.' });
    }

    if (!newPassword || String(newPassword).trim().length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long.' });
    }

    const tokenHash = hashToken(String(token).trim());

    const user = await User.findOne({
      'passwordReset.tokenHash': tokenHash,
      'passwordReset.expiresAt': { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token.' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(String(newPassword).trim(), salt);
    user.mustChangePassword = false;

    user.passwordReset = {
      tokenHash: '',
      expiresAt: null,
      requestedAt: null,
      usedAt: new Date(),
    };

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Password reset successful. You can now log in with your new password.',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({
      message: 'Server error. Please try again later.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// ---------------------------
// UPDATE PROFILE
// ---------------------------
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const updateData = req.body;

    delete updateData.email;
    delete updateData.password;
    delete updateData.role;
    delete updateData.username;
    delete updateData.mustChangePassword;

    if (Object.prototype.hasOwnProperty.call(updateData, 'extensionName')) {
      updateData.extensionName = normalizeExtensionName(updateData.extensionName);
    }

    if (updateData.jobSeekerProfile) {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      const existingProfile = user.jobSeekerProfile || {};
      updateData.jobSeekerProfile = {
        ...(existingProfile.toObject?.() || existingProfile),
        ...updateData.jobSeekerProfile,
      };

      if (Object.prototype.hasOwnProperty.call(updateData.jobSeekerProfile, 'course')) {
        updateData.jobSeekerProfile.course = normalizeCourseValue(updateData.jobSeekerProfile.course);
      }

      const cleanRequiredValue = (value) => String(value ?? '').trim();
      const requestedProfileKeys = Object.keys(req.body?.jobSeekerProfile || {});
      const basicProfileKeys = ['phoneNumber', 'address', 'campus', 'course', 'yearGraduated'];
      const personalProfileKeys = [
        'preferredWorkMode', 'employmentType', 'willingToRelocate', 'howSoonCanYouStart',
        'experience', 'preferredLanguage', 'educationalAttainment', 'studyField',
        'minimumSalary', 'maximumSalary', 'height', 'weight', 'nationality',
        'gender', 'civilStatus', 'birthday',
      ];

      const isBasicProfileUpdate = basicProfileKeys.some((key) => requestedProfileKeys.includes(key))
        || ['firstName', 'lastName'].some((key) => Object.prototype.hasOwnProperty.call(req.body || {}, key));

      if (isBasicProfileUpdate) {
        const requiredBasicValues = {
          'First Name': updateData.firstName ?? user.firstName,
          'Last Name': updateData.lastName ?? user.lastName,
          Email: user.email,
          'Mobile Number': updateData.jobSeekerProfile.phoneNumber,
          Campus: updateData.jobSeekerProfile.campus,
          Course: updateData.jobSeekerProfile.course,
          'Year Graduated': updateData.jobSeekerProfile.yearGraduated,
          Address: updateData.jobSeekerProfile.address,
        };
        const missingBasic = Object.entries(requiredBasicValues)
          .filter(([, value]) => !cleanRequiredValue(value))
          .map(([label]) => label);
        const addressParts = cleanRequiredValue(updateData.jobSeekerProfile.address)
          .split(',')
          .map((part) => part.trim())
          .filter(Boolean);
        if (addressParts.length < 4 && !missingBasic.includes('Address')) {
          missingBasic.push('Region, Province, City / Municipality, and Street Address');
        }

        if (missingBasic.length) {
          return res.status(400).json({
            success: false,
            message: `Please complete the required fields before saving: ${missingBasic.join(', ')}.`,
          });
        }
      }

      const isPersonalProfileUpdate = personalProfileKeys.some((key) => requestedProfileKeys.includes(key));
      if (isPersonalProfileUpdate) {
        const personalLabels = {
          preferredWorkMode: 'Preferred Work Mode', employmentType: 'Employment Type',
          willingToRelocate: 'Willing to Relocate', howSoonCanYouStart: 'How Soon Can Start',
          experience: 'Experience', preferredLanguage: 'Preferred Language',
          educationalAttainment: 'Educational Attainment', studyField: 'Field of Study',
          minimumSalary: 'Minimum Salary', maximumSalary: 'Maximum Salary',
          height: 'Height', weight: 'Weight', nationality: 'Nationality', gender: 'Gender',
          civilStatus: 'Civil Status', birthday: 'Birthday',
        };
        const missingPersonal = personalProfileKeys
          .filter((key) => !cleanRequiredValue(updateData.jobSeekerProfile[key]))
          .map((key) => personalLabels[key]);

        if (missingPersonal.length) {
          return res.status(400).json({
            success: false,
            message: `Please complete the required personal information before saving: ${missingPersonal.join(', ')}.`,
          });
        }
      }

      if (!updateData.jobSeekerProfile.salaryCurrency) {
        updateData.jobSeekerProfile.salaryCurrency = existingProfile.salaryCurrency || 'PHP';
      }

      if (Object.prototype.hasOwnProperty.call(updateData.jobSeekerProfile, 'salaryPrivacy')) {
        const requestedPrivacy = String(updateData.jobSeekerProfile.salaryPrivacy || '').trim();
        updateData.jobSeekerProfile.salaryPrivacy = ['limited', 'only_me'].includes(requestedPrivacy)
          ? requestedPrivacy
          : 'only_me';
      } else {
        updateData.jobSeekerProfile.salaryPrivacy = existingProfile.salaryPrivacy || 'only_me';
      }
    }

    const updatedUser = await User.findByIdAndUpdate(userId, { $set: updateData }, { new: true, runValidators: true }).select('-password');

    res.status(200).json({ success: true, message: 'Profile updated successfully', user: updatedUser });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ success: false, message: 'Error updating profile' });
  }
};

// ---------------------------
// SALARY EXPECTATION APIs
// ---------------------------
exports.getSalaryExpectation = async (req, res) => {
  try {
    if (req.user.role !== 'jobseeker') {
      return res.status(403).json({ success: false, message: 'Only job seekers can access salary expectation.' });
    }

    const user = await User.findById(req.user._id).select('jobSeekerProfile');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const profile = user.jobSeekerProfile || {};

    return res.status(200).json({
      success: true,
      salaryExpectation: {
        userId: req.user._id,
        minSalary: profile.minimumSalary || '',
        maxSalary: profile.maximumSalary || '',
        currency: profile.salaryCurrency || 'PHP',
        privacy: profile.salaryPrivacy || 'only_me',
      },
    });
  } catch (error) {
    console.error('Error fetching salary expectation:', error);
    res.status(500).json({ success: false, message: 'Error fetching salary expectation' });
  }
};

exports.updateSalaryExpectation = async (req, res) => {
  try {
    if (req.user.role !== 'jobseeker') {
      return res.status(403).json({ success: false, message: 'Only job seekers can update salary expectation.' });
    }

    const { minSalary, maxSalary, currency, privacy } = req.body;
    const normalizedPrivacy = ['limited', 'only_me'].includes(String(privacy || '').trim())
      ? String(privacy).trim()
      : 'only_me';

    const payload = {
      'jobSeekerProfile.minimumSalary': minSalary !== undefined && minSalary !== null ? String(minSalary).trim() : '',
      'jobSeekerProfile.maximumSalary': maxSalary !== undefined && maxSalary !== null ? String(maxSalary).trim() : '',
      'jobSeekerProfile.salaryCurrency': currency ? String(currency).trim() : 'PHP',
      'jobSeekerProfile.salaryPrivacy': normalizedPrivacy,
    };

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: payload },
      { new: true, runValidators: true }
    ).select('-password');

    return res.status(200).json({
      success: true,
      message: 'Salary expectation updated successfully',
      salaryExpectation: {
        userId: req.user._id,
        minSalary: updatedUser?.jobSeekerProfile?.minimumSalary || '',
        maxSalary: updatedUser?.jobSeekerProfile?.maximumSalary || '',
        currency: updatedUser?.jobSeekerProfile?.salaryCurrency || 'PHP',
        privacy: updatedUser?.jobSeekerProfile?.salaryPrivacy || 'only_me',
      },
      user: updatedUser,
    });
  } catch (error) {
    console.error('Error updating salary expectation:', error);
    res.status(500).json({ success: false, message: 'Error updating salary expectation' });
  }
};

// ---------------------------
// WORK EXPERIENCE APIs
// ---------------------------
exports.getWorkExperiences = async (req, res) => {
  try {
    if (req.user.role !== 'jobseeker') {
      return res.status(403).json({ success: false, message: 'Only job seekers can access work experiences.' });
    }

    const user = await User.findById(req.user._id).select('jobSeekerProfile.workExperiences');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const items = Array.isArray(user?.jobSeekerProfile?.workExperiences)
      ? sortWorkExperiences(user.jobSeekerProfile.workExperiences).map(normalizeWorkExperienceOutput)
      : [];

    return res.status(200).json({
      success: true,
      workExperiences: items,
    });
  } catch (error) {
    console.error('Error fetching work experiences:', error);
    res.status(500).json({ success: false, message: 'Error fetching work experiences' });
  }
};

exports.createWorkExperience = async (req, res) => {
  try {
    if (req.user.role !== 'jobseeker') {
      return res.status(403).json({ success: false, message: 'Only job seekers can create work experiences.' });
    }

    const { companyName, positionTitle, startDate, endDate, isPresent, description } = req.body;

    if (!String(companyName || '').trim()) {
      return res.status(400).json({ success: false, message: 'Company / Organization name is required.' });
    }

    if (!String(positionTitle || '').trim()) {
      return res.status(400).json({ success: false, message: 'Position / Role title is required.' });
    }

    if (!startDate) {
      return res.status(400).json({ success: false, message: 'Start date is required.' });
    }

    const start = new Date(startDate);
    if (Number.isNaN(start.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid start date.' });
    }

    let normalizedEndDate = null;
    const present = Boolean(isPresent);

    if (!present && endDate) {
      normalizedEndDate = new Date(endDate);
      if (Number.isNaN(normalizedEndDate.getTime())) {
        return res.status(400).json({ success: false, message: 'Invalid end date.' });
      }
    }

    if (!present && !normalizedEndDate) {
      return res.status(400).json({ success: false, message: 'End date is required unless the role is marked as Present.' });
    }

    if (normalizedEndDate && start > normalizedEndDate) {
      return res.status(400).json({ success: false, message: 'Start date cannot be later than end date.' });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (!user.jobSeekerProfile) {
      user.jobSeekerProfile = {};
    }

    if (!Array.isArray(user.jobSeekerProfile.workExperiences)) {
      user.jobSeekerProfile.workExperiences = [];
    }

    const newEntry = {
      companyName: String(companyName || '').trim(),
      positionTitle: String(positionTitle || '').trim(),
      startDate: start,
      endDate: present ? null : normalizedEndDate,
      isPresent: present,
      description: String(description || '').trim(),
    };

    user.jobSeekerProfile.workExperiences.push(newEntry);
    await user.save();

    const createdEntry = user.jobSeekerProfile.workExperiences[user.jobSeekerProfile.workExperiences.length - 1];

    return res.status(201).json({
      success: true,
      message: 'Work experience created successfully',
      workExperience: normalizeWorkExperienceOutput(createdEntry),
      workExperiences: sortWorkExperiences(user.jobSeekerProfile.workExperiences).map(normalizeWorkExperienceOutput),
    });
  } catch (error) {
    console.error('Error creating work experience:', error);
    res.status(500).json({ success: false, message: 'Error creating work experience' });
  }
};

exports.updateWorkExperience = async (req, res) => {
  try {
    if (req.user.role !== 'jobseeker') {
      return res.status(403).json({ success: false, message: 'Only job seekers can update work experiences.' });
    }

    const { workExperienceId } = req.params;
    const { companyName, positionTitle, startDate, endDate, isPresent, description } = req.body;

    if (!String(companyName || '').trim()) {
      return res.status(400).json({ success: false, message: 'Company / Organization name is required.' });
    }

    if (!String(positionTitle || '').trim()) {
      return res.status(400).json({ success: false, message: 'Position / Role title is required.' });
    }

    if (!startDate) {
      return res.status(400).json({ success: false, message: 'Start date is required.' });
    }

    const start = new Date(startDate);
    if (Number.isNaN(start.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid start date.' });
    }

    let normalizedEndDate = null;
    const present = Boolean(isPresent);

    if (!present && endDate) {
      normalizedEndDate = new Date(endDate);
      if (Number.isNaN(normalizedEndDate.getTime())) {
        return res.status(400).json({ success: false, message: 'Invalid end date.' });
      }
    }

    if (!present && !normalizedEndDate) {
      return res.status(400).json({ success: false, message: 'End date is required unless the role is marked as Present.' });
    }

    if (normalizedEndDate && start > normalizedEndDate) {
      return res.status(400).json({ success: false, message: 'Start date cannot be later than end date.' });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const items = user?.jobSeekerProfile?.workExperiences || [];
    const target = items.id(workExperienceId);

    if (!target) {
      return res.status(404).json({ success: false, message: 'Work experience not found.' });
    }

    target.companyName = String(companyName || '').trim();
    target.positionTitle = String(positionTitle || '').trim();
    target.startDate = start;
    target.endDate = present ? null : normalizedEndDate;
    target.isPresent = present;
    target.description = String(description || '').trim();

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Work experience updated successfully',
      workExperience: normalizeWorkExperienceOutput(target),
      workExperiences: sortWorkExperiences(user.jobSeekerProfile.workExperiences).map(normalizeWorkExperienceOutput),
    });
  } catch (error) {
    console.error('Error updating work experience:', error);
    res.status(500).json({ success: false, message: 'Error updating work experience' });
  }
};

exports.deleteWorkExperience = async (req, res) => {
  try {
    if (req.user.role !== 'jobseeker') {
      return res.status(403).json({ success: false, message: 'Only job seekers can delete work experiences.' });
    }

    const { workExperienceId } = req.params;

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const items = user?.jobSeekerProfile?.workExperiences || [];
    const target = items.id(workExperienceId);

    if (!target) {
      return res.status(404).json({ success: false, message: 'Work experience not found.' });
    }

    target.deleteOne();
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Work experience deleted successfully',
      workExperiences: sortWorkExperiences(user.jobSeekerProfile.workExperiences).map(normalizeWorkExperienceOutput),
    });
  } catch (error) {
    console.error('Error deleting work experience:', error);
    res.status(500).json({ success: false, message: 'Error deleting work experience' });
  }
};

// ---------------------------
// UPLOAD RESUME
// ---------------------------
exports.uploadResume = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'Please upload a resume file' });

    const resumeUrl = `/uploads/resumes/${req.file.filename}`;
    const fullResumeUrl = getUploadedFileUrl(req, req.file, resumeUrl);

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { 'jobSeekerProfile.resumeUrl': fullResumeUrl } },
      { new: true }
    ).select('-password');

    res.status(200).json({ success: true, message: 'Resume uploaded successfully', resumeUrl: fullResumeUrl, user: updatedUser });
  } catch (error) {
    console.error('Error uploading resume:', error);
    res.status(500).json({ success: false, message: error.message || 'Error uploading resume' });
  }
};

// ---------------------------
// UPLOAD PROFILE IMAGE
// ---------------------------
exports.uploadProfileImage = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'Please upload an image file' });

    const imageUrl = `/uploads/profile-images/${req.file.filename}`;
    const fullImageUrl = getUploadedFileUrl(req, req.file, imageUrl);

    const updatedUser = await User.findByIdAndUpdate(req.user._id, { $set: { profileImage: fullImageUrl } }, { new: true }).select('-password');

    res.status(200).json({ success: true, message: 'Profile image uploaded successfully', profileImage: fullImageUrl, user: updatedUser });
  } catch (error) {
    console.error('Error uploading profile image:', error);
    res.status(500).json({ success: false, message: error.message || 'Error uploading profile image' });
  }
};

// ---------------------------
// GET CURRENT USER
// ---------------------------
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        middleName: user.middleName,
        lastName: user.lastName,
        extensionName: user.extensionName,
        profileImage: user.profileImage,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        mustChangePassword: Boolean(user.mustChangePassword),
        notificationPreferences: user.notificationPreferences,
        settingsVerification: user.settingsVerification,
        jobSeekerProfile: user.role === 'jobseeker' ? user.jobSeekerProfile : undefined,
        employerProfile: user.role === 'employer' ? user.employerProfile : undefined,
      },
    });
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).json({ success: false, message: 'Error fetching user data' });
  }
};

// ---------------------------
// Alumni verification functions + employer functions
// ---------------------------

exports.uploadAlumniVerificationDoc = async (req, res) => {
  try {
    const userId = req.user._id;

    if (req.user.role !== 'jobseeker') {
      return res.status(403).json({ success: false, message: 'Only job seekers can upload verification documents' });
    }

    const docType = String(req.params.docType || '').trim();
    const allowed = ['cv', 'tor', 'diploma', 'sss', 'philhealth', 'pagibig', 'tin', 'validId'];
    if (!allowed.includes(docType)) return res.status(400).json({ success: false, message: 'Invalid document type.' });

    if (!req.file) return res.status(400).json({ success: false, message: 'Please upload a file' });

    const docUrl = `/uploads/verification/alumni/${docType}/${req.file.filename}`;
    const fullDocUrl = getUploadedFileUrl(req, req.file, docUrl);

    const user = await User.findById(userId);
    const currentProfile = user.jobSeekerProfile || {};
    const currentDocs = currentProfile.verificationDocs || {};

    const now = new Date();
    currentDocs[docType] = {
      url: fullDocUrl,
      status: 'pending',
      uploadedAt: now,
      filename: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
    };

    if (
      currentDocs?.resubmitRequest &&
      String(currentDocs.resubmitRequest.docType || '') === docType &&
      !currentDocs.resubmitRequest.usedAt
    ) {
      currentDocs.resubmitRequest.usedAt = null;
    }

    const alreadyVerified =
      user.isVerified === true ||
      String(currentProfile.verificationStatus || '').toLowerCase() === 'verified' ||
      String(currentDocs.overallStatus || '').toLowerCase() === 'verified';

    const overallStatus = getAlumniOverallStatus(currentDocs, alreadyVerified);

    currentDocs.overallStatus = overallStatus;

    const updateFields = {
      'jobSeekerProfile.verificationDocs': currentDocs,
      'jobSeekerProfile.verificationStatus': overallStatus,
    };

    if (alreadyVerified || overallStatus === 'verified') {
      updateFields.isVerified = true;
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateFields },
      { new: true }
    ).select('-password');

    res.status(200).json({
      success: true,
      message: 'Verification document uploaded successfully',
      docType: docType.toUpperCase(),
      url: fullDocUrl,
      status: 'pending',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Error uploading alumni verification document:', error);
    res.status(500).json({ success: false, message: error.message || 'Error uploading verification document' });
  }
};

exports.deleteAlumniVerificationDoc = async (req, res) => {
  try {
    const userId = req.user._id;
    const docType = req.params.docType;

    if (req.user.role !== 'jobseeker') return res.status(403).json({ success: false, message: 'Only job seekers can delete verification documents' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const updatePath = `jobSeekerProfile.verificationDocs.${docType}`;

    const updatedUser = await User.findByIdAndUpdate(userId, { $unset: { [updatePath]: 1 } }, { new: true }).select('-password');

    const currentDocs = updatedUser.jobSeekerProfile?.verificationDocs || {};
    const overallStatus = getAlumniOverallStatus(currentDocs, false);

    const finalUser = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          'jobSeekerProfile.verificationDocs.overallStatus': overallStatus,
          'jobSeekerProfile.verificationStatus': overallStatus,
        },
      },
      { new: true }
    ).select('-password');

    res.status(200).json({ success: true, message: 'Document deleted successfully', docType, user: finalUser });
  } catch (error) {
    console.error('Error deleting verification document:', error);
    res.status(500).json({ success: false, message: error.message || 'Error deleting document' });
  }
};


exports.downloadAlumniVerificationDoc = async (req, res) => {
  try {
    const userId = req.user._id;
    const docType = String(req.params.docType || '').trim();
    const disposition = String(req.query.disposition || 'attachment').toLowerCase() === 'inline' ? 'inline' : 'attachment';

    if (req.user.role !== 'jobseeker') {
      return res.status(403).json({ success: false, message: 'Only job seekers can download verification documents' });
    }

    if (!ALUMNI_VERIFICATION_DOWNLOAD_DOC_TYPES.includes(docType)) {
      return res.status(400).json({ success: false, message: 'Invalid document type.' });
    }

    const user = await User.findById(userId).select('jobSeekerProfile');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const doc = user.jobSeekerProfile?.verificationDocs?.[docType] || {};
    const rawUrl = String(doc.url || '').trim();

    if (!rawUrl) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    const fallbackFileName = `${ALUMNI_DOC_LABELS[docType] || docType}.pdf`;
    const fileName = sanitizeDownloadFileName(doc.filename || fallbackFileName, fallbackFileName);
    const sourceUrl = /^https?:\/\//i.test(rawUrl) ? rawUrl : makePublicUrl(req, rawUrl);
    const candidates = buildCredentialDownloadCandidates({ rawUrl: sourceUrl, fileName, disposition });

    let downloaded = null;
    let lastError = null;

    for (const candidate of candidates) {
      try {
        downloaded = await fetchUrlBuffer(candidate);
        if (downloaded?.buffer?.length) break;
      } catch (error) {
        lastError = error;
      }
    }

    if (!downloaded?.buffer?.length) {
      console.error('Credential download failed:', lastError);
      return res.status(502).json({ success: false, message: 'Unable to download credential file from storage.' });
    }

    const contentType = downloaded.contentType || doc.mimeType || getContentTypeFromFileName(fileName);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', downloaded.buffer.length);
    res.setHeader('Content-Disposition', `${disposition}; filename="${fileName.replace(/"/g, '')}"`);
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');

    return res.send(downloaded.buffer);
  } catch (error) {
    console.error('Error downloading alumni verification document:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error downloading verification document' });
  }
};

exports.getAlumniVerificationStatus = async (req, res) => {
  try {
    const userId = req.user._id;

    if (req.user.role !== 'jobseeker') return res.status(403).json({ success: false, message: 'Only job seekers can view verification status' });

    const user = await User.findById(userId).select('jobSeekerProfile');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const verificationDocs = user.jobSeekerProfile?.verificationDocs || {};
    const verificationStatus = user.jobSeekerProfile?.verificationStatus || 'not_submitted';

    const totalDocuments = REQUIRED_ALUMNI_DOC_TYPES.length;
    const submittedDocuments = REQUIRED_ALUMNI_DOC_TYPES.filter((docType) => {
      const status = String(verificationDocs?.[docType]?.status || 'not_submitted');
      return status !== 'not_submitted';
    }).length;

    res.status(200).json({ success: true, verificationDocs, verificationStatus, overallProgress: { submitted: submittedDocuments, total: totalDocuments } });
  } catch (error) {
    console.error('Error fetching verification status:', error);
    res.status(500).json({ success: false, message: 'Error fetching verification status' });
  }
};

exports.updateCompanyProfile = async (req, res) => {
  try {
    const userId = req.user._id;

    if (req.user.role !== 'employer') {
      return res.status(403).json({ success: false, message: 'Only employers can update company profile' });
    }

    const updateData = req.body || {};

    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const currentProfile = currentUser.employerProfile || {};

    const pickText = (incoming, fallback = '') => {
      if (incoming === undefined || incoming === null) return fallback;
      return String(incoming).trim();
    };

    const nextGallery = normalizeGalleryImagesInput(updateData.galleryImages, currentProfile.galleryImages || []);
    const newGalleryFiles = Array.isArray(req.files?.galleryImagesFiles) ? req.files.galleryImagesFiles : [];
    const newGalleryItems = newGalleryFiles.map((file) => buildEmployerGalleryImageMeta(req, file)).filter(Boolean);

    const employerProfileUpdate = {
      companyName: pickText(updateData.companyName, currentProfile.companyName),
      companyWebsiteUrl: pickText(updateData.companyWebsiteUrl, currentProfile.companyWebsiteUrl),
      businessEmail: normalizeEmail(pickText(updateData.businessEmail, currentProfile.businessEmail)),
      mobileNumber: pickText(updateData.mobileNumber, currentProfile.mobileNumber),
      regionCity: pickText(updateData.regionCity, currentProfile.regionCity),
      industry: pickText(updateData.industry, currentProfile.industry),
      position: pickText(updateData.position, currentProfile.position),

      companyAddress: pickText(updateData.companyAddress, currentProfile.companyAddress),
      companyDescription: pickText(updateData.companyDescription, currentProfile.companyDescription),
      facebookUrl: pickText(updateData.facebookUrl, currentProfile.facebookUrl),
      instagramUrl: pickText(updateData.instagramUrl, currentProfile.instagramUrl),
      linkedinUrl: pickText(updateData.linkedinUrl, currentProfile.linkedinUrl),
      xUrl: pickText(updateData.xUrl, currentProfile.xUrl),

      coverPhoto: currentProfile.coverPhoto || '',
      galleryImages: [...nextGallery, ...newGalleryItems],
      companyLogo: currentProfile.companyLogo || '',

      profileVisible:
        updateData.profileVisible !== undefined
          ? boolFromBody(updateData.profileVisible)
          : currentProfile.profileVisible !== false,

      verificationDocs: currentProfile.verificationDocs || {},
      reviews: Array.isArray(currentProfile.reviews) ? currentProfile.reviews : [],
    };

    if (req.files?.companyLogo?.[0]) {
      const logoUrl = `/uploads/logos/${req.files.companyLogo[0].filename}`;
      employerProfileUpdate.companyLogo = getUploadedFileUrl(req, req.files.companyLogo[0], logoUrl);
    }

    if (req.files?.coverPhotoFile?.[0]) {
      employerProfileUpdate.coverPhoto = buildEmployerCoverPhotoMeta(req, req.files.coverPhotoFile[0]);
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: { employerProfile: employerProfileUpdate } },
      { new: true, runValidators: true }
    ).select('-password');

    return res.status(200).json({
      success: true,
      message: 'Company profile updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Error updating company profile:', error);
    return res.status(500).json({ success: false, message: 'Error updating company profile' });
  }
};

exports.uploadEmployerVerificationDoc = async (req, res) => {
  try {
    const userId = req.user._id;

    if (req.user.role !== 'employer') return res.status(403).json({ success: false, message: 'Only employers can upload verification documents' });

    const docType = String(req.params.docType || '').trim();
    const allowed = ['secRegistration', 'birRegistration', 'dtiRegistration', 'cityPermit', 'businessPermit'];
    if (!allowed.includes(docType)) {
      return res.status(400).json({ success: false, message: 'Invalid document type. Allowed: SEC, BIR, DTI, City Permit' });
    }

    if (!req.file) return res.status(400).json({ success: false, message: 'Please upload a file' });

    let folder = 'sec';
    if (docType === 'birRegistration') folder = 'bir';
    else if (docType === 'dtiRegistration') folder = 'dti';
    else if (docType === 'cityPermit') folder = 'city';
    else if (docType === 'businessPermit') folder = 'business';

    const docUrl = `/uploads/verification/employer/${folder}/${req.file.filename}`;
    const fullDocUrl = getUploadedFileUrl(req, req.file, docUrl);

    const user = await User.findById(userId);
    const currentProfile = user.employerProfile || {};
    const currentDocs = currentProfile.verificationDocs || {};

    const now = new Date();
    currentDocs[docType] = {
      url: fullDocUrl,
      status: 'pending',
      uploadedAt: now,
      filename: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
    };

    const statuses = allowed.map((type) => String(currentDocs[type]?.status || 'not_submitted'));
    const anyPending = statuses.some((s) => ['pending', 'submitted'].includes(s));
    const allApproved = statuses.every((s) => s === 'approved');
    const anyRejected = statuses.some((s) => s === 'rejected');

    currentDocs.overallStatus = allApproved ? 'verified' : anyRejected ? 'rejected' : anyPending ? 'pending' : 'unverified';

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: { 'employerProfile.verificationDocs': currentDocs } },
      { new: true }
    ).select('-password');

    res.status(200).json({ success: true, message: 'Verification document uploaded successfully', docType, url: fullDocUrl, user: updatedUser });
  } catch (error) {
    console.error('Error uploading verification document:', error);
    res.status(500).json({ success: false, message: error.message || 'Error uploading verification document' });
  }
};

exports.getCompanyProfile = async (req, res) => {
  try {
    const userId = req.user._id;

    if (req.user.role !== 'employer') return res.status(403).json({ success: false, message: 'Only employers can view company profile' });

    const user = await User.findById(userId).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.status(200).json({
      success: true,
      companyProfile: user.employerProfile || {},
      user: { id: user._id, email: user.email, username: user.username },
    });
  } catch (error) {
    console.error('Error fetching company profile:', error);
    res.status(500).json({ success: false, message: 'Error fetching company profile' });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const userId = req.user._id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) return res.status(400).json({ success: false, message: 'Please provide current and new password' });

    if (newPassword.length < 6) return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ success: false, message: 'Current password is incorrect' });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.mustChangePassword = false;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        middleName: user.middleName,
        lastName: user.lastName,
        extensionName: user.extensionName,
        profileImage: user.profileImage,
        mustChangePassword: Boolean(user.mustChangePassword),
        jobSeekerProfile: user.role === 'jobseeker' ? user.jobSeekerProfile : undefined,
        employerProfile: user.role === 'employer' ? user.employerProfile : undefined,
      }
    });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ success: false, message: 'Error changing password' });
  }
};

// ✅ NEW: FORCED TEMP PASSWORD CHANGE
exports.changeTemporaryPassword = async (req, res) => {
  try {
    const userId = req.user._id;
    const { currentPassword, newPassword, confirmNewPassword } = req.body;

    if (!currentPassword || !String(currentPassword).trim()) {
      return res.status(400).json({ success: false, message: 'Current password is required.' });
    }

    if (!newPassword || !String(newPassword).trim()) {
      return res.status(400).json({ success: false, message: 'New password is required.' });
    }

    if (!confirmNewPassword || !String(confirmNewPassword).trim()) {
      return res.status(400).json({ success: false, message: 'Confirm new password is required.' });
    }

    if (String(newPassword) !== String(confirmNewPassword)) {
      return res.status(400).json({ success: false, message: 'Confirm password does not match.' });
    }

    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.',
      });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const isMatch = await bcrypt.compare(String(currentPassword), user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
    }

    const isSameAsCurrent = await bcrypt.compare(String(newPassword), user.password);
    if (isSameAsCurrent) {
      return res.status(400).json({ success: false, message: 'New password must be different from your current password.' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(String(newPassword), salt);
    user.mustChangePassword = false;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Password updated successfully.',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        middleName: user.middleName,
        lastName: user.lastName,
        extensionName: user.extensionName,
        profileImage: user.profileImage,
        mustChangePassword: Boolean(user.mustChangePassword),
        jobSeekerProfile: user.role === 'jobseeker' ? user.jobSeekerProfile : undefined,
        employerProfile: user.role === 'employer' ? user.employerProfile : undefined,
      },
    });
  } catch (error) {
    console.error('Error changing temporary password:', error);
    return res.status(500).json({
      success: false,
      message: 'Error changing temporary password',
    });
  }
};


exports.secureAccessEmployerVerificationDoc = async (req, res) => {
  try {
    const userId = req.user._id;
    const docType = String(req.params.docType || '').trim();
    const password = String(req.body?.password || '');
    const disposition =
      String(req.body?.disposition || 'inline').toLowerCase() === 'attachment'
        ? 'attachment'
        : 'inline';

    if (req.user.role !== 'employer') {
      return res.status(403).json({
        success: false,
        message: 'Only employers can access verification documents.',
      });
    }

    if (!Object.keys(EMPLOYER_DOC_LABELS).includes(docType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid document type.',
      });
    }

    if (!password.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please enter your password.',
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return res.status(400).json({
        success: false,
        message: 'Incorrect password. Please try again.',
      });
    }

    const doc = user.employerProfile?.verificationDocs?.[docType] || {};
    const rawUrl = String(doc.url || '').trim();

    if (!rawUrl) {
      return res.status(404).json({
        success: false,
        message: 'Document not found.',
      });
    }

    const fallbackFileName = `${EMPLOYER_DOC_LABELS[docType] || docType}.pdf`;
    const fileName = sanitizeDownloadFileName(
      doc.filename || fallbackFileName,
      fallbackFileName
    );
    const sourceUrl = /^https?:\/\//i.test(rawUrl)
      ? rawUrl
      : makePublicUrl(req, rawUrl);
    const candidates = buildCredentialDownloadCandidates({
      rawUrl: sourceUrl,
      fileName,
      disposition,
    });

    let downloaded = null;
    let lastError = null;

    for (const candidate of candidates) {
      try {
        downloaded = await fetchUrlBuffer(candidate);
        if (downloaded?.buffer?.length) break;
      } catch (error) {
        lastError = error;
      }
    }

    if (!downloaded?.buffer?.length) {
      console.error('Secure employer credential delivery failed:', lastError);
      return res.status(502).json({
        success: false,
        message: 'Unable to download credential file from storage.',
      });
    }

    const contentType =
      downloaded.contentType ||
      doc.mimeType ||
      getContentTypeFromFileName(fileName);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', downloaded.buffer.length);
    res.setHeader(
      'Content-Disposition',
      `${disposition}; filename="${fileName.replace(/"/g, '')}"`
    );
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');

    return res.send(downloaded.buffer);
  } catch (error) {
    console.error('Error securely accessing employer verification document:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error accessing verification document.',
    });
  }
};


exports.downloadEmployerVerificationDoc = async (req, res) => {
  try {
    const userId = req.user._id;
    const docType = String(req.params.docType || '').trim();
    const disposition = String(req.query.disposition || 'inline').toLowerCase() === 'attachment' ? 'attachment' : 'inline';

    if (req.user.role !== 'employer') {
      return res.status(403).json({ success: false, message: 'Only employers can view verification documents' });
    }

    if (!Object.keys(EMPLOYER_DOC_LABELS).includes(docType)) {
      return res.status(400).json({ success: false, message: 'Invalid document type.' });
    }

    const user = await User.findById(userId).select('employerProfile');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const doc = user.employerProfile?.verificationDocs?.[docType] || {};
    const rawUrl = String(doc.url || '').trim();

    if (!rawUrl) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    const fallbackFileName = `${EMPLOYER_DOC_LABELS[docType] || docType}.pdf`;
    const fileName = sanitizeDownloadFileName(doc.filename || fallbackFileName, fallbackFileName);
    const sourceUrl = /^https?:\/\//i.test(rawUrl) ? rawUrl : makePublicUrl(req, rawUrl);
    const candidates = buildCredentialDownloadCandidates({ rawUrl: sourceUrl, fileName, disposition });

    let downloaded = null;
    let lastError = null;

    for (const candidate of candidates) {
      try {
        downloaded = await fetchUrlBuffer(candidate);
        if (downloaded?.buffer?.length) break;
      } catch (error) {
        lastError = error;
      }
    }

    if (!downloaded?.buffer?.length) {
      console.error('Employer credential delivery failed:', lastError);
      return res.status(502).json({ success: false, message: 'Unable to download credential file from storage.' });
    }

    const contentType = downloaded.contentType || doc.mimeType || getContentTypeFromFileName(fileName);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', downloaded.buffer.length);
    res.setHeader('Content-Disposition', `${disposition}; filename="${fileName.replace(/"/g, '')}"`);
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');

    return res.send(downloaded.buffer);
  } catch (error) {
    console.error('Error downloading employer verification document:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error downloading verification document' });
  }
};


// ---------------------------
// JOBSEEKER SETTINGS: EMAIL / PHONE VERIFICATION
// ---------------------------
exports.requestEmailChangeVerification = async (req, res) => {
  try {
    const userId = req.user._id;
    const { currentPassword, newEmail } = req.body;

    const emailLower = normalizeEmail(newEmail);
    if (!currentPassword || !String(currentPassword).trim()) {
      return res.status(400).json({ success: false, message: 'Current password is required.' });
    }

    if (!emailLower || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLower)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid new email address.' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const isMatch = await bcrypt.compare(String(currentPassword), user.password);
    if (!isMatch) return res.status(400).json({ success: false, message: 'Current password is incorrect.' });

    if (String(user.email || '').toLowerCase() === emailLower) {
      return res.status(400).json({ success: false, message: 'New email must be different from your current email.' });
    }

    const existing = await User.findOne({ email: emailLower, _id: { $ne: userId } });
    if (existing) return res.status(400).json({ success: false, message: 'Email is already used by another account.' });

    const code = generateNumericOtp();
    const expiresAt = new Date(Date.now() + SETTINGS_OTP_EXPIRES_MINUTES * 60 * 1000);

    user.settingsVerification = {
      ...(user.settingsVerification?.toObject?.() || user.settingsVerification || {}),
      pendingEmail: emailLower,
      emailOtpHash: hashToken(code),
      emailOtpExpiresAt: expiresAt,
      emailOtpRequestedAt: new Date(),
      emailVerified: false,
    };

    await user.save();

    await sendSettingsEmailVerificationCode({
      to: emailLower,
      fullName: user.fullName || user.firstName || user.username || 'User',
      code,
      expiresInMinutes: SETTINGS_OTP_EXPIRES_MINUTES,
    });

    return res.status(200).json({
      success: true,
      message: 'Verification code sent to your new email address.',
      pendingEmail: emailLower,
    });
  } catch (error) {
    console.error('Error requesting email verification:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error sending email verification code.' });
  }
};

exports.resendEmailVerificationCode = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const targetEmail = normalizeEmail(user.settingsVerification?.pendingEmail || user.email);
    if (!targetEmail) return res.status(400).json({ success: false, message: 'No email address available for verification.' });

    const code = generateNumericOtp();
    const expiresAt = new Date(Date.now() + SETTINGS_OTP_EXPIRES_MINUTES * 60 * 1000);

    user.settingsVerification = {
      ...(user.settingsVerification?.toObject?.() || user.settingsVerification || {}),
      pendingEmail: user.settingsVerification?.pendingEmail || '',
      emailOtpHash: hashToken(code),
      emailOtpExpiresAt: expiresAt,
      emailOtpRequestedAt: new Date(),
    };

    await user.save();

    await sendSettingsEmailVerificationCode({
      to: targetEmail,
      fullName: user.fullName || user.firstName || user.username || 'User',
      code,
      expiresInMinutes: SETTINGS_OTP_EXPIRES_MINUTES,
    });

    return res.status(200).json({ success: true, message: 'Verification code sent.' });
  } catch (error) {
    console.error('Error resending email verification:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error resending verification code.' });
  }
};

exports.verifyEmailChangeCode = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code || !String(code).trim()) {
      return res.status(400).json({ success: false, message: 'Verification code is required.' });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const verification = user.settingsVerification || {};
    if (!verification.emailOtpHash || !verification.emailOtpExpiresAt) {
      return res.status(400).json({ success: false, message: 'Please request a verification code first.' });
    }

    if (new Date(verification.emailOtpExpiresAt).getTime() < Date.now()) {
      return res.status(400).json({ success: false, message: 'Verification code has expired. Please resend code.' });
    }

    if (hashToken(String(code).trim()) !== verification.emailOtpHash) {
      return res.status(400).json({ success: false, message: 'Invalid verification code.' });
    }

    const nextEmail = normalizeEmail(verification.pendingEmail || user.email);
    if (verification.pendingEmail) {
      const existing = await User.findOne({ email: nextEmail, _id: { $ne: user._id } });
      if (existing) return res.status(400).json({ success: false, message: 'Email is already used by another account.' });
      user.email = nextEmail;
      if (user.role === 'employer') {
        if (!user.employerProfile) user.employerProfile = {};
        user.employerProfile.businessEmail = nextEmail;
      }
    }

    user.settingsVerification = {
      ...(verification.toObject?.() || verification),
      emailVerified: true,
      pendingEmail: '',
      emailOtpHash: '',
      emailOtpExpiresAt: null,
      emailOtpRequestedAt: null,
    };

    await user.save();

    const updatedUser = await User.findById(user._id).select('-password');
    return res.status(200).json({ success: true, message: 'Email verified successfully.', user: updatedUser });
  } catch (error) {
    console.error('Error verifying email code:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error verifying email.' });
  }
};

exports.requestPhoneChangeVerification = async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    const cleanPhone = normalizePhoneNumber(phoneNumber);

    if (!cleanPhone) return res.status(400).json({ success: false, message: 'Mobile number is required.' });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const code = generateNumericOtp();
    const expiresAt = new Date(Date.now() + SETTINGS_OTP_EXPIRES_MINUTES * 60 * 1000);

    user.settingsVerification = {
      ...(user.settingsVerification?.toObject?.() || user.settingsVerification || {}),
      pendingPhoneNumber: cleanPhone,
      phoneOtpHash: hashToken(code),
      phoneOtpExpiresAt: expiresAt,
      phoneOtpRequestedAt: new Date(),
      phoneVerified: false,
    };

    await user.save();

    await sendBrevoSms({
      to: cleanPhone,
      message: `Your AGAPAY mobile verification code is ${code}. This code expires in ${SETTINGS_OTP_EXPIRES_MINUTES} minutes.`,
    });

    return res.status(200).json({ success: true, message: 'Verification code sent to your mobile number.', pendingPhoneNumber: cleanPhone });
  } catch (error) {
    console.error('Error requesting phone verification:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error sending mobile verification code.' });
  }
};

exports.resendPhoneVerificationCode = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const targetPhone = normalizePhoneNumber(
      user.settingsVerification?.pendingPhoneNumber ||
      (user.role === 'employer' ? user.employerProfile?.mobileNumber : user.jobSeekerProfile?.phoneNumber)
    );
    if (!targetPhone) return res.status(400).json({ success: false, message: 'No mobile number available for verification.' });

    const code = generateNumericOtp();
    const expiresAt = new Date(Date.now() + SETTINGS_OTP_EXPIRES_MINUTES * 60 * 1000);

    user.settingsVerification = {
      ...(user.settingsVerification?.toObject?.() || user.settingsVerification || {}),
      pendingPhoneNumber: user.settingsVerification?.pendingPhoneNumber || targetPhone,
      phoneOtpHash: hashToken(code),
      phoneOtpExpiresAt: expiresAt,
      phoneOtpRequestedAt: new Date(),
    };

    await user.save();

    await sendBrevoSms({
      to: targetPhone,
      message: `Your AGAPAY mobile verification code is ${code}. This code expires in ${SETTINGS_OTP_EXPIRES_MINUTES} minutes.`,
    });

    return res.status(200).json({ success: true, message: 'Mobile verification code sent.' });
  } catch (error) {
    console.error('Error resending phone verification:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error resending mobile verification code.' });
  }
};

exports.verifyPhoneChangeCode = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code || !String(code).trim()) return res.status(400).json({ success: false, message: 'Verification code is required.' });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const verification = user.settingsVerification || {};
    if (!verification.phoneOtpHash || !verification.phoneOtpExpiresAt) {
      return res.status(400).json({ success: false, message: 'Please request a mobile verification code first.' });
    }

    if (new Date(verification.phoneOtpExpiresAt).getTime() < Date.now()) {
      return res.status(400).json({ success: false, message: 'Verification code has expired. Please resend code.' });
    }

    if (hashToken(String(code).trim()) !== verification.phoneOtpHash) {
      return res.status(400).json({ success: false, message: 'Invalid verification code.' });
    }

    if (user.role === 'employer') {
      if (!user.employerProfile) user.employerProfile = {};
      user.employerProfile.mobileNumber = verification.pendingPhoneNumber || user.employerProfile.mobileNumber || '';
    } else {
      if (!user.jobSeekerProfile) user.jobSeekerProfile = {};
      user.jobSeekerProfile.phoneNumber = verification.pendingPhoneNumber || user.jobSeekerProfile.phoneNumber || '';
    }

    user.settingsVerification = {
      ...(verification.toObject?.() || verification),
      phoneVerified: true,
      pendingPhoneNumber: '',
      phoneOtpHash: '',
      phoneOtpExpiresAt: null,
      phoneOtpRequestedAt: null,
    };

    await user.save();

    const updatedUser = await User.findById(user._id).select('-password');
    return res.status(200).json({ success: true, message: 'Mobile number verified successfully.', user: updatedUser });
  } catch (error) {
    console.error('Error verifying phone code:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error verifying mobile number.' });
  }
};

exports.updateNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    const notificationData = req.body;

    const notificationPreferences = {
      emailNotifications: notificationData.emailNotifications !== false,
      jobAlerts: notificationData.jobAlerts !== false,
      applicationUpdates: notificationData.applicationUpdates !== false,
      marketingEmails: notificationData.marketingEmails === true,
      newsletter: notificationData.newsletter !== false,
    };

    const updatedUser = await User.findByIdAndUpdate(userId, { $set: { notificationPreferences } }, { new: true }).select('-password');

    res.status(200).json({
      success: true,
      message: 'Notification preferences updated successfully',
      notificationPreferences: updatedUser.notificationPreferences,
    });
  } catch (error) {
    console.error('Error updating notifications:', error);
    res.status(500).json({ success: false, message: 'Error updating notification preferences' });
  }
};

exports.updateUserProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const updateData = req.body;

    delete updateData.email;
    delete updateData.password;
    delete updateData.role;
    delete updateData.username;
    delete updateData.mustChangePassword;

    if (Object.prototype.hasOwnProperty.call(updateData, 'extensionName')) {
      updateData.extensionName = normalizeExtensionName(updateData.extensionName);
    }

    const updatedUser = await User.findByIdAndUpdate(userId, { $set: updateData }, { new: true, runValidators: true }).select('-password');

    res.status(200).json({ success: true, message: 'Profile updated successfully', user: updatedUser });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ success: false, message: 'Error updating profile' });
  }
};

// ---------------------------
// RESUBMIT DOCUMENT - VALIDATE TOKEN
// ---------------------------
exports.validateResubmitDocumentToken = async (req, res) => {
  try {
    const token = String(req.query?.token || '').trim();

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Invalid resubmit link. Missing token.',
      });
    }

    const tokenHash = hashToken(token);
    const found = await findResubmitRequestByToken(tokenHash);

    if (!found) {
      return res.status(400).json({
        success: false,
        message: 'This resubmit link is invalid or expired.',
      });
    }

    const { accountType, resubmitRequest, labels } = found;

    const docType = String(resubmitRequest.docType || '').trim();
    const reasonMessage = String(resubmitRequest.reasonMessage || '').trim();
    const expiresAt = resubmitRequest.expiresAt ? new Date(resubmitRequest.expiresAt) : null;
    const usedAt = resubmitRequest.usedAt ? new Date(resubmitRequest.usedAt) : null;

    if (!docType || !labels[docType]) {
      return res.status(400).json({
        success: false,
        message: 'This resubmit link is invalid or expired.',
      });
    }

    if (usedAt) {
      return res.status(400).json({
        success: false,
        message: 'This resubmit link has already been used.',
      });
    }

    if (!expiresAt || Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() < Date.now()) {
      return res.status(400).json({
        success: false,
        message: 'This resubmit link is invalid or expired.',
      });
    }

    return res.status(200).json({
      success: true,
      accountType,
      docType,
      docLabel: labels[docType] || docType,
      reasonMessage,
      expiresAt,
    });
  } catch (error) {
    console.error('Error validating resubmit document token:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error validating resubmit link.',
    });
  }
};

// ---------------------------
// RESUBMIT DOCUMENT - SUBMIT NEW FILE
// ---------------------------
exports.resubmitDocument = async (req, res) => {
  try {
    const token = String(req.body?.token || '').trim();

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Invalid resubmit request. Missing token.',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please choose a file to upload.',
      });
    }

    const tokenHash = hashToken(token);
    const found = await findResubmitRequestByToken(tokenHash);

    if (!found) {
      return res.status(400).json({
        success: false,
        message: 'This resubmit link is invalid or expired.',
      });
    }

    const { accountType, user, resubmitRequest, labels } = found;

    const docType = String(resubmitRequest.docType || '').trim();
    const expiresAt = resubmitRequest.expiresAt ? new Date(resubmitRequest.expiresAt) : null;
    const usedAt = resubmitRequest.usedAt ? new Date(resubmitRequest.usedAt) : null;

    if (!docType || !labels[docType]) {
      return res.status(400).json({
        success: false,
        message: 'This resubmit link is invalid or expired.',
      });
    }

    if (usedAt) {
      return res.status(400).json({
        success: false,
        message: 'This resubmit link has already been used.',
      });
    }

    if (!expiresAt || Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() < Date.now()) {
      return res.status(400).json({
        success: false,
        message: 'This resubmit link is invalid or expired.',
      });
    }

    if (accountType === 'jobseeker') {
      if (!user.jobSeekerProfile) user.jobSeekerProfile = {};
      if (!user.jobSeekerProfile.verificationDocs) user.jobSeekerProfile.verificationDocs = {};

      const verificationDocs = user.jobSeekerProfile.verificationDocs;

      const fileUrl = getUploadedFileUrl(req, req.file, `/uploads/verification/alumni/${docType}/${req.file.filename}`);

      verificationDocs[docType] = {
        url: fileUrl,
        status: 'pending',
        uploadedAt: new Date(),
        filename: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
      };

      verificationDocs.overallStatus = 'pending';
      verificationDocs.adminRemarks = '';
      verificationDocs.verifiedBy = null;
      verificationDocs.verifiedAt = null;
      verificationDocs.resubmitRequest = {
        ...resubmitRequest,
        usedAt: new Date(),
      };

      user.jobSeekerProfile.verificationDocs = verificationDocs;
      user.jobSeekerProfile.verificationStatus = 'pending';

      await user.save();

      await createAdminResubmissionNotifications({
        subjectUser: user,
        accountType: 'jobseeker',
        docType,
        docLabel: labels[docType],
      });

      return res.status(200).json({
        success: true,
        message: 'Document resubmitted successfully. Redirecting to login...',
        accountType: 'jobseeker',
        docType,
        docLabel: labels[docType] || docType,
      });
    }

    if (accountType === 'employer') {
      if (!user.employerProfile) user.employerProfile = {};
      if (!user.employerProfile.verificationDocs) user.employerProfile.verificationDocs = {};

      const verificationDocs = user.employerProfile.verificationDocs;
      const folder = EMPLOYER_DOC_FOLDERS[docType];

      if (!folder) {
        return res.status(400).json({
          success: false,
          message: 'Invalid document type for employer resubmission.',
        });
      }

      const fileUrl = getUploadedFileUrl(req, req.file, `/uploads/verification/employer/${folder}/${req.file.filename}`);

      verificationDocs[docType] = {
        url: fileUrl,
        status: 'pending',
        uploadedAt: new Date(),
        filename: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
      };

      verificationDocs.overallStatus = 'pending';
      verificationDocs.remarks = '';
      verificationDocs.resubmitRequest = {
        ...resubmitRequest,
        usedAt: new Date(),
      };

      user.employerProfile.verificationDocs = verificationDocs;

      await user.save();

      await createAdminResubmissionNotifications({
        subjectUser: user,
        accountType: 'employer',
        docType,
        docLabel: labels[docType],
      });

      return res.status(200).json({
        success: true,
        message: 'Document resubmitted successfully. Redirecting to login...',
        accountType: 'employer',
        docType,
        docLabel: labels[docType] || docType,
      });
    }

    return res.status(400).json({
      success: false,
      message: 'Unsupported resubmit account type.',
    });
  } catch (error) {
    console.error('Error resubmitting document:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to resubmit document.',
    });
  }
};

// ---------------------------
// DOWNLOAD RESUME AS PDF
// ---------------------------
const resumeEscapeHtml = (value = '') =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const isMeaningfulResumeValue = (value) => {
  const text = String(value ?? '').trim();
  return Boolean(text) && !/^(not\s+provided|n\/?a)$/i.test(text);
};

const resumeText = (value = '', fallback = '') => {
  const text = String(value || '').trim();
  return isMeaningfulResumeValue(text) ? text : fallback;
};

const resumeArray = (value = '') => {
  if (Array.isArray(value)) {
    return value
      .map((item) => resumeText(item))
      .filter(isMeaningfulResumeValue);
  }

  if (typeof value === 'string') {
    const clean = value.trim();
    if (!isMeaningfulResumeValue(clean)) return [];

    const parts = clean.includes('||')
      ? clean.split('||')
      : /\s[—-]\s(Basic|Novice|Intermediate|Advanced|Expert)$/i.test(clean)
        ? [clean]
        : clean.split(',');

    return parts
      .map((item) => resumeText(item))
      .filter(isMeaningfulResumeValue);
  }

  return [];
};

const resumeMonthYear = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value || '');
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};

const resumeDateRange = (item = {}) => {
  if (item.date) return resumeText(item.date);

  const start = item.startDate ? resumeMonthYear(item.startDate) : '';
  const end = item.isPresent ? 'Present' : item.endDate ? resumeMonthYear(item.endDate) : '';

  if (start && end) return `${start} - ${end}`;
  if (start) return start;
  if (end) return end;
  return '';
};

const resumeEducationDateRange = (entry = {}) => {
  const startMonth = resumeText(entry.startMonth);
  const startYear = resumeText(entry.startYear);
  const endMonth = resumeText(entry.endMonth);
  const endYear = resumeText(entry.endYear || entry.yearGraduated);

  const start = [startMonth, startYear].filter(Boolean).join(' ');
  const end = [endMonth, endYear].filter(Boolean).join(' ');

  if (start && end) return `${start} - ${end}`;
  return end || start;
};

const resumeWeight = (value = '') => {
  const clean = resumeText(value);
  if (!clean) return '';
  return /kg$/i.test(clean) ? clean : `${clean} kg`;
};

const resumeFullName = (user = {}) =>
  [user.firstName, user.middleName, user.lastName, user.extensionName]
    .map((item) => resumeText(item))
    .filter(Boolean)
    .join(' ');

const resumeInitials = (fullName = '') => {
  const parts = String(fullName || '').split(' ').filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return (fullName || 'JA').slice(0, 2).toUpperCase();
};

const renderResumeSection = (title, content) => {
  if (!content || !String(content).trim()) return '';
  return `
    <section class="resume-section">
      <h2>${resumeEscapeHtml(title)}</h2>
      ${content}
    </section>
  `;
};

const renderResumeRows = (rows = []) => {
  const cleanRows = rows.filter((row) => resumeText(row.value));
  if (!cleanRows.length) return '';

  const middle = Math.ceil(cleanRows.length / 2);
  const columns = [cleanRows.slice(0, middle), cleanRows.slice(middle)];

  return `
    <div class="two-column-rows">
      ${columns
        .map(
          (column) => `
            <div class="info-column">
              ${column
                .map(
                  (row) => `
                    <div class="info-row">
                      <span class="info-label">${resumeEscapeHtml(row.label)}:</span>
                      <span class="info-value">${resumeEscapeHtml(row.value)}</span>
                    </div>
                  `
                )
                .join('')}
            </div>
          `
        )
        .join('')}
    </div>
  `;
};

const renderResumeBullets = (description = '') => {
  const items = String(description || '')
    .split(/\n|•|\*|;/)
    .map((item) => resumeText(item))
    .filter(Boolean);

  if (!items.length) return '';

  return `
    <ul class="resume-bullets">
      ${items.map((item) => `<li>${resumeEscapeHtml(item)}</li>`).join('')}
    </ul>
  `;
};

const renderResumeDatedItem = ({ title, subtitle, date, description, meta }) => {
  const titleText = resumeText(title, 'Untitled');

  return `
    <div class="dated-item">
      <div class="dated-header">
        <div class="dated-main">
          <div class="item-title">${resumeEscapeHtml(titleText)}</div>
          ${subtitle ? `<div class="item-subtitle">${resumeEscapeHtml(subtitle)}</div>` : ''}
          ${meta ? `<div class="item-meta">${resumeEscapeHtml(meta)}</div>` : ''}
        </div>
        ${date ? `<div class="item-date">${resumeEscapeHtml(date)}</div>` : ''}
      </div>
      ${renderResumeBullets(description)}
    </div>
  `;
};

const renderResumeProfileList = (title, items = [], type = 'default') => {
  const cleanItems = Array.isArray(items)
    ? items.filter((item) => Object.values(item || {}).some((value) => resumeText(value)))
    : [];

  if (!cleanItems.length) return '';

  if (type === 'references') {
    return renderResumeSection(
      title,
      `
        <div class="references-grid">
          ${cleanItems
            .map((item) => {
              const subtitle = [item.position, item.company].map((value) => resumeText(value)).filter(Boolean).join(' / ');
              return `
                <div class="reference-card">
                  <div class="item-title">${resumeEscapeHtml(resumeText(item.name, 'Reference'))}</div>
                  ${subtitle ? `<div class="item-subtitle">${resumeEscapeHtml(subtitle)}</div>` : ''}
                  ${item.phone ? `<div>${resumeEscapeHtml(item.phone)}</div>` : ''}
                  ${item.email ? `<div class="link-text">${resumeEscapeHtml(item.email)}</div>` : ''}
                </div>
              `;
            })
            .join('')}
        </div>
      `
    );
  }

  return renderResumeSection(
    title,
    cleanItems
      .map((item) => {
        const itemTitle = resumeText(item.title || item.organization || item.name, 'Untitled');
        const subtitle =
          type === 'awards'
            ? resumeText(item.issuer ? `Issued by: ${item.issuer}` : '')
            : resumeText(item.role || item.issuer || item.organization || item.company);

        return renderResumeDatedItem({
          title: itemTitle,
          subtitle,
          date: resumeDateRange(item),
          description: item.description,
        });
      })
      .join('')
  );
};

const buildResumeHtmlForPdf = (user = {}) => {
  const profile = user.jobSeekerProfile || {};
  const fullName = resumeFullName(user) || 'Your Name';
  const initials = resumeInitials(fullName);
  const profileImage = resumeText(user.profileImage);

  const educationSummary = [
    resumeText(profile.campus),
    resumeText(profile.course),
    profile.yearGraduated ? `Class of ${profile.yearGraduated}` : '',
  ]
    .filter(Boolean)
    .join(', ');

  const availabilityRows = [
    { label: 'Preferred Work Mode', value: profile.preferredWorkMode },
    { label: 'Employment Type', value: profile.employmentType },
    { label: 'Educational Attainment', value: profile.educationalAttainment },
    { label: 'Field / Study', value: profile.studyField },
    { label: 'Civil Status', value: profile.civilStatus },
    { label: 'Birthday', value: profile.birthday },
    { label: 'Salary', value: [profile.minimumSalary, profile.maximumSalary].filter(Boolean).join(' - ') },
    { label: 'How Soon Can Start', value: profile.howSoonCanYouStart },
    { label: 'Willing to Relocate', value: profile.willingToRelocate },
    { label: 'Nationality', value: profile.nationality },
    { label: 'Gender', value: profile.gender },
    { label: 'Weight', value: resumeWeight(profile.weight) },
    { label: 'Preferred Language', value: profile.preferredLanguage },
  ];

  const technicalSkills = resumeArray(profile.technicalSkills);
  const softSkills = resumeArray(profile.softSkills);
  const workExperiences = Array.isArray(profile.workExperiences) ? sortWorkExperiences(profile.workExperiences) : [];
  const educationEntries = Array.isArray(profile.educationEntries) ? profile.educationEntries : [];

  const photoHtml = profileImage
    ? `<img class="resume-photo" src="${resumeEscapeHtml(profileImage)}" alt="${resumeEscapeHtml(fullName)}" />`
    : `<div class="resume-initials">${resumeEscapeHtml(initials)}</div>`;

  const workExperienceHtml = workExperiences.length
    ? renderResumeSection(
        'Work Experience',
        workExperiences
          .map((item) =>
            renderResumeDatedItem({
              title: resumeText(item.positionTitle, 'Position not provided'),
              subtitle: resumeText(item.companyName, 'Company not provided'),
              date: resumeDateRange(item),
              description: item.description,
            })
          )
          .join('')
      )
    : '';

  const allSkills = [...technicalSkills, ...softSkills].filter(isMeaningfulResumeValue);

  const skillsHtml = allSkills.length
    ? renderResumeSection(
        'Skills',
        `
          <div class="skills-grid">
            ${allSkills
              .map((skill) => `<div class="skill-row"><span class="skill-label">${resumeEscapeHtml(skill)}</span></div>`)
              .join('')}
          </div>
        `
      )
    : '';

  const educationHtml = educationEntries.length
    ? renderResumeSection(
        'Education',
        educationEntries
          .map((entry) =>
            renderResumeDatedItem({
              title: resumeText(entry.level || entry.educationalAttainment, 'Education'),
              subtitle: resumeText(entry.school || entry.campus),
              meta: '',
              date: resumeEducationDateRange(entry),
              description: entry.description,
            })
          )
          .join('')
      )
    : '';

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          @page { size: A4; margin: 0; }
          * { box-sizing: border-box; }
          body { margin: 0; background: #ffffff; color: #111111; font-family: Georgia, 'Times New Roman', serif; font-size: 8.7px; line-height: 1.18; }
          .resume-paper { width: 210mm; min-height: 297mm; background: #ffffff; }
          .resume-inner { padding: 16mm 16mm 12mm; position: relative; }
          .resume-header { position: relative; min-height: 62px; padding-right: 98px; text-align: center; }
          .resume-name { margin: 0; padding-top: 5px; font-size: 17px; line-height: 1; font-weight: 700; letter-spacing: 0.55px; text-transform: uppercase; }
          .resume-contact { margin-top: 5px; color: #222222; font-size: 6.7px; line-height: 1.35; }
          .resume-contact span + span::before { content: ' | '; }
          .resume-education-summary { margin-top: 3px; color: #222222; font-size: 7.2px; line-height: 1.25; font-style: italic; }
          .resume-initials, .resume-photo { position: absolute; top: 0; right: 3px; width: 61px; height: 61px; display: flex; align-items: center; justify-content: center; background: #343434; color: #ffffff; font-family: Arial, Helvetica, sans-serif; font-size: 27px; font-weight: 500; letter-spacing: 0.8px; overflow: hidden; object-fit: cover; }
          .resume-section { margin-top: 7px; break-inside: avoid; }
          .resume-section h2 { margin: 0 0 3px; padding-bottom: 2px; border-bottom: 1px solid #777777; font-size: 8.8px; line-height: 1; font-weight: 700; letter-spacing: 0.25px; text-transform: uppercase; }
          .objective-text { margin: 0; text-align: justify; }
          .two-column-rows, .skills-grid, .references-grid { display: grid; grid-template-columns: 1fr 1fr; column-gap: 35px; }
          .info-row { display: grid; grid-template-columns: 112px 1fr; gap: 4px; min-height: 11px; }
          .info-label, .skill-label, .item-title { font-weight: 700; }
          .info-label { white-space: nowrap; font-size: 8.1px; }
          .info-value { min-width: 0; }
          .dated-item { margin-top: 4px; break-inside: avoid; }
          .dated-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
          .dated-main { min-width: 0; }
          .item-title, .item-subtitle, .item-meta { line-height: 1.16; }
          .item-subtitle { font-style: italic; }
          .item-date { flex: 0 0 auto; max-width: 150px; text-align: right; font-style: italic; white-space: nowrap; }
          .resume-bullets { margin: 2px 0 0 13px; padding: 0; }
          .resume-bullets li { margin: 0; padding-left: 1px; }
          .skill-row { display: block; min-height: 10px; }
          .skill-label { white-space: nowrap; }
          .references-grid { row-gap: 7px; }
          .reference-card { break-inside: avoid; }
          .link-text { color: #1d4ed8; text-decoration: underline; word-break: break-all; }
          .empty-text { margin: 0; color: #777777; }
        </style>
      </head>
      <body>
        <main class="resume-paper">
          <div class="resume-inner">
            <header class="resume-header">
              <h1 class="resume-name">${resumeEscapeHtml(fullName)}</h1>
              <div class="resume-contact">
                ${profile.address ? `<span>${resumeEscapeHtml(profile.address)}</span>` : ''}
                ${profile.phoneNumber ? `<span>${resumeEscapeHtml(profile.phoneNumber)}</span>` : ''}
                ${user.email ? `<span>${resumeEscapeHtml(user.email)}</span>` : ''}
              </div>
              ${educationSummary ? `<div class="resume-education-summary">${resumeEscapeHtml(educationSummary)}</div>` : ''}
              ${photoHtml}
            </header>
            ${resumeText(profile.aboutMe) ? renderResumeSection('Objective', `<p class="objective-text">${resumeEscapeHtml(resumeText(profile.aboutMe))}</p>`) : ''}
            ${renderResumeRows(availabilityRows) ? renderResumeSection('Availability & Preferences', renderResumeRows(availabilityRows)) : ''}
            ${workExperienceHtml}
            ${skillsHtml}
            ${educationHtml}
            ${renderResumeProfileList('Certifications', profile.certifications)}
            ${renderResumeProfileList('Projects', profile.projects)}
            ${renderResumeProfileList('Seminars and Trainings', profile.seminars)}
            ${renderResumeProfileList('Awards and Achievements', profile.awards, 'awards')}
            ${renderResumeProfileList('Affiliations', profile.affiliations)}
            ${renderResumeProfileList('Co-curricular Activities', profile.cocurricular)}
            ${renderResumeProfileList('References', profile.references, 'references')}
          </div>
        </main>
      </body>
    </html>
  `;
};


exports.verifyResumeDownloadPassword = async (req, res) => {
  try {
    if (req.user.role !== 'jobseeker') {
      return res.status(403).json({ success: false, message: 'Only job seekers can download generated resumes.' });
    }

    const { password } = req.body;

    if (!password || !String(password).trim()) {
      return res.status(400).json({ success: false, message: 'Please enter your password.' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const isMatch = await bcrypt.compare(String(password), user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Incorrect password. Please try again.' });
    }

    return res.status(200).json({ success: true, message: 'Password verified successfully.' });
  } catch (error) {
    console.error('Error verifying resume download password:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error verifying password',
    });
  }
};

exports.downloadResume = async (req, res) => {
  let browser;

  try {
    if (req.user.role !== 'jobseeker') {
      return res.status(403).json({ success: false, message: 'Only job seekers can download generated resumes.' });
    }

    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const html = buildResumeHtmlForPdf(user);
    const fullName = resumeFullName(user) || 'Resume';
    const safeFileName = `${fullName.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '') || 'Resume'}_CV.pdf`;

    const launchOptions = {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-zygote',
        '--single-process',
      ],
    };

    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    }

    browser = await puppeteer.launch(launchOptions);

    const page = await browser.newPage();

    page.setDefaultNavigationTimeout(60000);
    page.setDefaultTimeout(60000);

    await page.setViewport({
      width: 1240,
      height: 1754,
      deviceScaleFactor: 1,
    });

    await page.setContent(html, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });

    try {
      await page.evaluateHandle('document.fonts.ready');
    } catch (fontError) {
      console.warn('Resume PDF font loading warning:', fontError?.message || fontError);
    }

    try {
      await page.waitForNetworkIdle({
        idleTime: 500,
        timeout: 10000,
      });
    } catch (networkError) {
      console.warn('Resume PDF network idle warning:', networkError?.message || networkError);
    }

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
    });

    const pdfBuffer = Buffer.from(pdf);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${safeFileName}"`,
      'Content-Length': pdfBuffer.length,
      'Cache-Control': 'no-store',
    });

    return res.end(pdfBuffer);
  } catch (error) {
    console.error('Error generating resume PDF:', {
      message: error?.message,
      name: error?.name,
      stack: error?.stack,
    });

    return res.status(500).json({
      success: false,
      message: error.message || 'Error generating resume PDF',
    });
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.warn('Resume PDF browser close warning:', closeError?.message || closeError);
      }
    }
  }
};
