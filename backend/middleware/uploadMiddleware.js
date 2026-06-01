const multer = require('multer');
const path = require('path');
const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const ALLOWED_ALUMNI_DOC_TYPES = ['cv', 'tor', 'diploma', 'sss', 'philhealth', 'pagibig', 'tin', 'validId'];
const ALLOWED_EMPLOYER_DOC_TYPES = ['secRegistration', 'birRegistration', 'dtiRegistration', 'cityPermit', 'businessPermit'];

const EMPLOYER_DOC_FOLDER_MAP = {
  secRegistration: 'sec',
  birRegistration: 'bir',
  dtiRegistration: 'dti',
  cityPermit: 'city',
  businessPermit: 'business',
};

const CLOUDINARY_ROOT_FOLDER = process.env.CLOUDINARY_ROOT_FOLDER || 'agapay-job-portal';

const isCloudinaryConfigured = () =>
  Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);

if (isCloudinaryConfigured()) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
} else {
  console.warn('Cloudinary is not fully configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.');
}

const sanitizePublicIdPart = (value, fallback = 'file') => {
  const clean = String(value || fallback)
    .trim()
    .toLowerCase()
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return clean || fallback;
};

const getOwnerId = (req) => String(req.user?._id || req.body?.userId || 'anon');

const getEmailPrefix = (req, fallback = 'user') =>
  sanitizePublicIdPart(req.body?.businessEmail || req.body?.email || fallback, fallback);

const getCloudinaryStorage = ({ folderResolver, publicIdResolver, resourceType = 'auto' }) =>
  new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => ({
      folder: `${CLOUDINARY_ROOT_FOLDER}/${folderResolver(req, file)}`,
      public_id: publicIdResolver(req, file),
      resource_type: resourceType,
    }),
  });

const createUniquePublicId = (prefix, file) => {
  const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const original = sanitizePublicIdPart(path.parse(file.originalname || 'file').name, 'file');
  return `${sanitizePublicIdPart(prefix)}-${original}-${uniqueSuffix}`;
};

const getResubmitDocConfig = (docType) => {
  const cleanDocType = String(docType || '').trim();

  if (ALLOWED_ALUMNI_DOC_TYPES.includes(cleanDocType)) {
    return {
      kind: 'alumni',
      folder: `verification/alumni/${cleanDocType}`,
      docType: cleanDocType,
    };
  }

  if (ALLOWED_EMPLOYER_DOC_TYPES.includes(cleanDocType)) {
    const employerFolder = EMPLOYER_DOC_FOLDER_MAP[cleanDocType];
    return {
      kind: 'employer',
      folder: `verification/employer/${employerFolder}`,
      docType: cleanDocType,
    };
  }

  return null;
};

const resumeStorage = getCloudinaryStorage({
  folderResolver: () => 'resumes',
  publicIdResolver: (req, file) => createUniquePublicId(getOwnerId(req), file),
});

const logoStorage = getCloudinaryStorage({
  folderResolver: () => 'logos',
  publicIdResolver: (req, file) => createUniquePublicId(getOwnerId(req), file),
  resourceType: 'image',
});

const coverPhotoStorage = getCloudinaryStorage({
  folderResolver: () => 'company-cover-photos',
  publicIdResolver: (req, file) => createUniquePublicId(`${getOwnerId(req)}-cover`, file),
  resourceType: 'image',
});

const galleryStorage = getCloudinaryStorage({
  folderResolver: () => 'company-gallery',
  publicIdResolver: (req, file) => createUniquePublicId(`${getOwnerId(req)}-gallery`, file),
  resourceType: 'image',
});

const profileImageStorage = getCloudinaryStorage({
  folderResolver: () => 'profile-images',
  publicIdResolver: (req, file) => createUniquePublicId(getOwnerId(req), file),
  resourceType: 'image',
});

const jobLocationImageStorage = getCloudinaryStorage({
  folderResolver: () => 'job-location-images',
  publicIdResolver: (req, file) => createUniquePublicId(`${getOwnerId(req)}-location`, file),
  resourceType: 'image',
});

const alumniVerificationStorage = getCloudinaryStorage({
  folderResolver: (req) => {
    const docType = req.params.docType || 'tor';
    if (!ALLOWED_ALUMNI_DOC_TYPES.includes(docType)) throw new Error('Invalid document type');
    return `verification/alumni/${docType}`;
  },
  publicIdResolver: (req, file) => {
    const docType = req.params.docType || 'tor';
    return createUniquePublicId(`${getOwnerId(req)}-${docType}`, file);
  },
});

const alumniResubmitStorage = getCloudinaryStorage({
  folderResolver: (req) => {
    const docType = String(req.body?.docType || '').trim();
    const config = getResubmitDocConfig(docType);
    if (!config) throw new Error('Invalid document type');
    return config.folder;
  },
  publicIdResolver: (req, file) => {
    const docType = String(req.body?.docType || '').trim();
    const config = getResubmitDocConfig(docType);
    if (!config) throw new Error('Invalid document type');
    return createUniquePublicId(`resubmit-${config.docType}`, file);
  },
});

const registerDocsStorage = getCloudinaryStorage({
  folderResolver: (req, file) => {
    const allowedFields = ['cv', 'diploma', 'validId', 'tor', 'sss', 'philhealth', 'pagibig', 'tin'];
    const field = String(file.fieldname || '').trim();
    if (!allowedFields.includes(field)) throw new Error('Invalid upload field');
    return `verification/alumni/${field}`;
  },
  publicIdResolver: (req, file) => {
    const field = String(file.fieldname || 'doc').trim();
    return createUniquePublicId(`${getEmailPrefix(req)}-${field}`, file);
  },
});

const employerVerificationStorage = getCloudinaryStorage({
  folderResolver: (req) => {
    const docType = req.params.docType || 'secRegistration';
    const folder = EMPLOYER_DOC_FOLDER_MAP[docType] || 'sec';
    return `verification/employer/${folder}`;
  },
  publicIdResolver: (req, file) => {
    const docType = req.params.docType || 'secRegistration';
    return createUniquePublicId(`${getOwnerId(req)}-${docType}`, file);
  },
});

const employerRegisterDocsStorage = getCloudinaryStorage({
  folderResolver: (req, file) => {
    const allowedFields = ['secRegistration', 'birRegistration', 'dtiRegistration', 'cityPermit', 'businessPermit', 'companyLogo'];
    const field = String(file.fieldname || '').trim();
    if (!allowedFields.includes(field)) throw new Error('Invalid employer upload field');

    if (field === 'companyLogo') return 'logos';

    const folder = EMPLOYER_DOC_FOLDER_MAP[field] || 'sec';
    return `verification/employer/${folder}`;
  },
  publicIdResolver: (req, file) => {
    const field = String(file.fieldname || 'doc').trim();
    return createUniquePublicId(`${getEmailPrefix(req, 'employer')}-${field}`, file);
  },
});

const employerCompanyMediaStorage = getCloudinaryStorage({
  folderResolver: (req, file) => {
    if (file.fieldname === 'companyLogo') return 'logos';
    if (file.fieldname === 'coverPhotoFile') return 'company-cover-photos';
    if (file.fieldname === 'galleryImagesFiles') return 'company-gallery';
    throw new Error('Invalid employer media upload field');
  },
  publicIdResolver: (req, file) => {
    if (file.fieldname === 'companyLogo') return createUniquePublicId(getOwnerId(req), file);
    if (file.fieldname === 'coverPhotoFile') return createUniquePublicId(`${getOwnerId(req)}-cover`, file);
    if (file.fieldname === 'galleryImagesFiles') return createUniquePublicId(`${getOwnerId(req)}-gallery`, file);
    throw new Error('Invalid employer media upload field');
  },
  resourceType: 'image',
});

const resumeFileFilter = (req, file, cb) => {
  const allowed = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Only PDF and Word documents are allowed for resumes'), false);
};

const imageFileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Only image files (JPG, JPEG, PNG, GIF, WEBP) are allowed'), false);
};

const jobLocationImageFileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png'];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Only image files (JPG, JPEG, PNG) are allowed for location image'), false);
};

const verificationFileFilter = (req, file, cb) => {
  const allowed = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Only PDF, Word, or image files (JPG, PNG, WEBP) are allowed'), false);
};

const uploadResume = multer({
  storage: resumeStorage,
  fileFilter: resumeFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

const uploadLogo = multer({
  storage: logoStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

const uploadProfileImage = multer({
  storage: profileImageStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

const uploadEmployerCompanyMedia = multer({
  storage: employerCompanyMediaStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 8 * 1024 * 1024 },
});

const uploadJobLocationImage = multer({
  storage: jobLocationImageStorage,
  fileFilter: jobLocationImageFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

const uploadAlumniVerification = multer({
  storage: alumniVerificationStorage,
  fileFilter: verificationFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

const uploadAlumniResubmit = multer({
  storage: alumniResubmitStorage,
  fileFilter: verificationFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

const uploadRegisterDocs = multer({
  storage: registerDocsStorage,
  fileFilter: verificationFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

const uploadEmployerVerification = multer({
  storage: employerVerificationStorage,
  fileFilter: verificationFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

const uploadEmployerRegisterDocs = multer({
  storage: employerRegisterDocsStorage,
  fileFilter: verificationFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

module.exports = {
  uploadResume,
  uploadLogo,
  uploadProfileImage,
  uploadJobLocationImage,
  uploadAlumniVerification,
  uploadAlumniResubmit,
  uploadEmployerVerification,
  uploadRegisterDocs,
  uploadEmployerRegisterDocs,
  uploadEmployerCompanyMedia,
};
