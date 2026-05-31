const multer = require('multer');
const path = require('path');
const fs = require('fs');

const ALLOWED_ALUMNI_DOC_TYPES = ['cv', 'tor', 'diploma', 'sss', 'philhealth', 'pagibig', 'tin', 'validId'];
const ALLOWED_EMPLOYER_DOC_TYPES = ['secRegistration', 'birRegistration', 'dtiRegistration', 'cityPermit', 'businessPermit'];

const EMPLOYER_DOC_FOLDER_MAP = {
  secRegistration: 'sec',
  birRegistration: 'bir',
  dtiRegistration: 'dti',
  cityPermit: 'city',
  businessPermit: 'business',
};

const createDirectories = () => {
  const directories = [
    path.join(__dirname, '../uploads'),
    path.join(__dirname, '../uploads/resumes'),
    path.join(__dirname, '../uploads/logos'),
    path.join(__dirname, '../uploads/profile-images'),
    path.join(__dirname, '../uploads/job-location-images'),
    path.join(__dirname, '../uploads/company-cover-photos'),
    path.join(__dirname, '../uploads/company-gallery'),
    path.join(__dirname, '../uploads/verification'),
    path.join(__dirname, '../uploads/verification/alumni'),

    path.join(__dirname, '../uploads/verification/alumni/cv'),
    path.join(__dirname, '../uploads/verification/alumni/tor'),
    path.join(__dirname, '../uploads/verification/alumni/diploma'),
    path.join(__dirname, '../uploads/verification/alumni/sss'),
    path.join(__dirname, '../uploads/verification/alumni/philhealth'),
    path.join(__dirname, '../uploads/verification/alumni/pagibig'),
    path.join(__dirname, '../uploads/verification/alumni/tin'),
    path.join(__dirname, '../uploads/verification/alumni/validId'),

    path.join(__dirname, '../uploads/verification/employer'),
    path.join(__dirname, '../uploads/verification/employer/sec'),
    path.join(__dirname, '../uploads/verification/employer/bir'),
    path.join(__dirname, '../uploads/verification/employer/dti'),
    path.join(__dirname, '../uploads/verification/employer/city'),
    path.join(__dirname, '../uploads/verification/employer/business'),
  ];

  directories.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`✅ Created directory: ${dir}`);
    }
  });
};

createDirectories();

const getResubmitDocConfig = (docType) => {
  const cleanDocType = String(docType || '').trim();

  if (ALLOWED_ALUMNI_DOC_TYPES.includes(cleanDocType)) {
    return {
      kind: 'alumni',
      folder: path.join(__dirname, `../uploads/verification/alumni/${cleanDocType}`),
      docType: cleanDocType,
    };
  }

  if (ALLOWED_EMPLOYER_DOC_TYPES.includes(cleanDocType)) {
    const employerFolder = EMPLOYER_DOC_FOLDER_MAP[cleanDocType];
    return {
      kind: 'employer',
      folder: path.join(__dirname, `../uploads/verification/employer/${employerFolder}`),
      docType: cleanDocType,
    };
  }

  return null;
};

const resumeStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads/resumes')),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const filename = req.user?._id ? `${req.user._id}-${uniqueSuffix}${ext}` : `anon-${uniqueSuffix}${ext}`;
    cb(null, filename);
  },
});

const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads/logos')),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const filename = req.user?._id ? `${req.user._id}-${uniqueSuffix}${ext}` : `anon-${uniqueSuffix}${ext}`;
    cb(null, filename);
  },
});

const coverPhotoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads/company-cover-photos')),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const filename = req.user?._id
      ? `${req.user._id}-cover-${uniqueSuffix}${ext}`
      : `anon-cover-${uniqueSuffix}${ext}`;
    cb(null, filename);
  },
});

const galleryStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads/company-gallery')),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const filename = req.user?._id
      ? `${req.user._id}-gallery-${uniqueSuffix}${ext}`
      : `anon-gallery-${uniqueSuffix}${ext}`;
    cb(null, filename);
  },
});

const profileImageStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads/profile-images')),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const filename = req.user?._id ? `${req.user._id}-${uniqueSuffix}${ext}` : `anon-${uniqueSuffix}${ext}`;
    cb(null, filename);
  },
});

// ✅ NEW
const jobLocationImageStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads/job-location-images')),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const filename = req.user?._id
      ? `${req.user._id}-location-${uniqueSuffix}${ext}`
      : `anon-location-${uniqueSuffix}${ext}`;
    cb(null, filename);
  },
});

const alumniVerificationStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const docType = req.params.docType || 'tor';
    if (!ALLOWED_ALUMNI_DOC_TYPES.includes(docType)) return cb(new Error('Invalid document type'), null);

    const docFolder = path.join(__dirname, `../uploads/verification/alumni/${docType}`);
    if (!fs.existsSync(docFolder)) fs.mkdirSync(docFolder, { recursive: true });
    cb(null, docFolder);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const docType = req.params.docType || 'tor';
    const ownerId = req.user?._id || req.body?.userId || 'anon';
    const filename = `${ownerId}-${docType}-${uniqueSuffix}${ext}`;
    cb(null, filename);
  },
});

const alumniResubmitStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const docType = String(req.body?.docType || '').trim();
    const config = getResubmitDocConfig(docType);

    if (!config) return cb(new Error('Invalid document type'), null);

    if (!fs.existsSync(config.folder)) fs.mkdirSync(config.folder, { recursive: true });
    cb(null, config.folder);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const docType = String(req.body?.docType || '').trim();
    const config = getResubmitDocConfig(docType);

    if (!config) return cb(new Error('Invalid document type'), null);

    const filename = `resubmit-${config.docType}-${uniqueSuffix}${ext}`;
    cb(null, filename);
  },
});

const registerDocsStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const allowedFields = ['cv', 'diploma', 'validId', 'tor', 'sss', 'philhealth', 'pagibig', 'tin'];
    const field = String(file.fieldname || '').trim();
    if (!allowedFields.includes(field)) return cb(new Error('Invalid upload field'), null);

    const docFolder = path.join(__dirname, `../uploads/verification/alumni/${field}`);
    if (!fs.existsSync(docFolder)) fs.mkdirSync(docFolder, { recursive: true });
    cb(null, docFolder);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const field = String(file.fieldname || 'doc').trim();

    const email = String(req.body?.email || 'user')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '') || 'user';

    cb(null, `${email}-${field}-${uniqueSuffix}${ext}`);
  },
});

const employerVerificationStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const docType = req.params.docType || 'secRegistration';
    let folder = 'sec';
    if (docType === 'birRegistration') folder = 'bir';
    else if (docType === 'dtiRegistration') folder = 'dti';
    else if (docType === 'cityPermit') folder = 'city';
    else if (docType === 'businessPermit') folder = 'business';

    const docFolder = path.join(__dirname, `../uploads/verification/employer/${folder}`);
    if (!fs.existsSync(docFolder)) fs.mkdirSync(docFolder, { recursive: true });
    cb(null, docFolder);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const docType = req.params.docType || 'secRegistration';
    cb(null, `${req.user._id}-${docType}-${uniqueSuffix}${ext}`);
  },
});

const employerRegisterDocsStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const allowedFields = ['secRegistration', 'birRegistration', 'dtiRegistration', 'cityPermit', 'businessPermit', 'companyLogo'];
    const field = String(file.fieldname || '').trim();
    if (!allowedFields.includes(field)) return cb(new Error('Invalid employer upload field'), null);

    if (field === 'companyLogo') {
      const folder = path.join(__dirname, '../uploads/logos');
      if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });
      return cb(null, folder);
    }

    let folder = 'sec';
    if (field === 'birRegistration') folder = 'bir';
    else if (field === 'dtiRegistration') folder = 'dti';
    else if (field === 'cityPermit') folder = 'city';
    else if (field === 'businessPermit') folder = 'business';

    const docFolder = path.join(__dirname, `../uploads/verification/employer/${folder}`);
    if (!fs.existsSync(docFolder)) fs.mkdirSync(docFolder, { recursive: true });
    cb(null, docFolder);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);

    const email = String(req.body?.businessEmail || req.body?.email || 'employer')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '') || 'employer';

    const field = String(file.fieldname || 'doc').trim();

    if (field === 'companyLogo') {
      return cb(null, `${email}-companyLogo-${uniqueSuffix}${ext}`);
    }

    cb(null, `${email}-${field}-${uniqueSuffix}${ext}`);
  },
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

// ✅ NEW strict filter for job location image
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

const uploadResume = multer({ storage: resumeStorage, fileFilter: resumeFileFilter, limits: { fileSize: 10 * 1024 * 1024 } });
const uploadLogo = multer({ storage: logoStorage, fileFilter: imageFileFilter, limits: { fileSize: 5 * 1024 * 1024 } });
const uploadProfileImage = multer({ storage: profileImageStorage, fileFilter: imageFileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

const uploadEmployerCompanyMedia = multer({
  storage: (req, file, cb) => {
    if (file.fieldname === 'companyLogo') {
      return logoStorage._handleFile ? logoStorage.getDestination?.(req, file, cb) : cb(null, path.join(__dirname, '../uploads/logos'));
    }
    if (file.fieldname === 'coverPhotoFile') {
      return coverPhotoStorage._handleFile ? coverPhotoStorage.getDestination?.(req, file, cb) : cb(null, path.join(__dirname, '../uploads/company-cover-photos'));
    }
    if (file.fieldname === 'galleryImagesFiles') {
      return galleryStorage._handleFile ? galleryStorage.getDestination?.(req, file, cb) : cb(null, path.join(__dirname, '../uploads/company-gallery'));
    }
    return cb(new Error('Invalid employer media upload field'), null);
  },
  fileFilter: imageFileFilter,
  limits: { fileSize: 8 * 1024 * 1024 },
});

uploadEmployerCompanyMedia.storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'companyLogo') {
      return cb(null, path.join(__dirname, '../uploads/logos'));
    }
    if (file.fieldname === 'coverPhotoFile') {
      return cb(null, path.join(__dirname, '../uploads/company-cover-photos'));
    }
    if (file.fieldname === 'galleryImagesFiles') {
      return cb(null, path.join(__dirname, '../uploads/company-gallery'));
    }
    return cb(new Error('Invalid employer media upload field'), null);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);

    if (file.fieldname === 'companyLogo') {
      return cb(null, `${req.user?._id || 'anon'}-${uniqueSuffix}${ext}`);
    }

    if (file.fieldname === 'coverPhotoFile') {
      return cb(null, `${req.user?._id || 'anon'}-cover-${uniqueSuffix}${ext}`);
    }

    if (file.fieldname === 'galleryImagesFiles') {
      return cb(null, `${req.user?._id || 'anon'}-gallery-${uniqueSuffix}${ext}`);
    }

    return cb(new Error('Invalid employer media upload field'), null);
  },
});

// ✅ NEW
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