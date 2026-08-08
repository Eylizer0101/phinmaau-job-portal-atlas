const multer = require('multer');
const path = require('path');
const { v2: cloudinary } = require('cloudinary');

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
const MAX_JOBSEEKER_CREDENTIAL_SIZE = 5 * 1024 * 1024;
const INVALID_JOBSEEKER_CREDENTIAL_MESSAGE = 'Invalid file. Upload PDF, JPG, JPEG, or PNG only, up to 5MB.';
const INVALID_EMPLOYER_CREDENTIAL_MESSAGE = 'Invalid file. Upload PDF, JPG, JPEG, or PNG only, up to 5MB.';
const JOBSEEKER_CREDENTIAL_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
]);
const JOBSEEKER_CREDENTIAL_EXTENSIONS = new Set(['.pdf', '.jpg', '.jpeg', '.png']);

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

const sanitizeOriginalFileName = (value, fallback = 'file') => {
  const baseName = path.basename(String(value || fallback)).replace(/\0/g, '');
  const extension = path.extname(baseName).toLowerCase();
  const name = path.basename(baseName, path.extname(baseName))
    .normalize('NFKC')
    .replace(/[^a-zA-Z0-9._ -]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);

  return `${name || fallback}${extension}`;
};

const detectCredentialSignature = (buffer) => {
  if (!Buffer.isBuffer(buffer)) return '';
  if (buffer.length >= 5 && buffer.subarray(0, 5).toString('ascii') === '%PDF-') return 'pdf';
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpeg';
  if (
    buffer.length >= 8
    && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) return 'png';
  return '';
};

const validateJobseekerCredentialBuffer = (file) => {
  if (file.fieldname === 'profileImage') return null;

  const signature = detectCredentialSignature(file.buffer);
  const mimeType = String(file.mimetype || '').toLowerCase();
  const extension = path.extname(String(file.originalname || '')).toLowerCase();
  const signatureMatches = (
    (signature === 'pdf' && mimeType === 'application/pdf' && extension === '.pdf')
    || (signature === 'jpeg' && ['image/jpeg', 'image/jpg'].includes(mimeType) && ['.jpg', '.jpeg'].includes(extension))
    || (signature === 'png' && mimeType === 'image/png' && extension === '.png')
  );

  if (!signatureMatches || file.buffer.length > MAX_JOBSEEKER_CREDENTIAL_SIZE) {
    return INVALID_JOBSEEKER_CREDENTIAL_MESSAGE;
  }

  return null;
};

const validateEmployerCredentialBuffer = (file) => {
  if (file.fieldname === 'companyLogo') return null;

  const signature = detectCredentialSignature(file.buffer);
  const mimeType = String(file.mimetype || '').toLowerCase();
  const extension = path.extname(String(file.originalname || '')).toLowerCase();
  const signatureMatches = (
    (signature === 'pdf' && mimeType === 'application/pdf' && extension === '.pdf')
    || (signature === 'jpeg' && ['image/jpeg', 'image/jpg'].includes(mimeType) && ['.jpg', '.jpeg'].includes(extension))
    || (signature === 'png' && mimeType === 'image/png' && extension === '.png')
  );

  if (!signatureMatches || file.buffer.length > MAX_JOBSEEKER_CREDENTIAL_SIZE) {
    return INVALID_EMPLOYER_CREDENTIAL_MESSAGE;
  }

  return null;
};

const getOwnerId = (req) => String(req.user?._id || req.body?.userId || 'anon');

const getEmailPrefix = (req, fallback = 'user') =>
  sanitizePublicIdPart(req.body?.businessEmail || req.body?.email || fallback, fallback);

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

const uploadBufferToCloudinary = ({ file, folder, publicId, resourceType = 'auto' }) =>
  new Promise((resolve, reject) => {
    if (!isCloudinaryConfigured()) {
      return reject(new Error('Cloudinary is not fully configured.'));
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `${CLOUDINARY_ROOT_FOLDER}/${folder}`,
        public_id: publicId,
        resource_type: resourceType,
      },
      (error, result) => {
        if (error) return reject(error);
        return resolve(result);
      }
    );

    uploadStream.end(file.buffer);
  });

const createCloudinaryStorage = ({
  folderResolver,
  publicIdResolver,
  resourceType = 'auto',
  bufferValidator,
  sanitizeFileName = false,
}) => ({
  _handleFile: async (req, file, cb) => {
    try {
      const chunks = [];

      file.stream.on('data', (chunk) => {
        chunks.push(chunk);
      });

      file.stream.on('error', cb);

      file.stream.on('end', async () => {
        try {
          const buffer = Buffer.concat(chunks);
          const fileForUpload = {
            ...file,
            buffer,
            originalname: sanitizeFileName
              ? sanitizeOriginalFileName(file.originalname)
              : file.originalname,
          };

          const validationError = bufferValidator?.(fileForUpload);
          if (validationError) throw new Error(validationError);

          const folder = folderResolver(req, fileForUpload);
          const publicId = publicIdResolver(req, fileForUpload);

          const result = await uploadBufferToCloudinary({
            file: fileForUpload,
            folder,
            publicId,
            resourceType,
          });

          cb(null, {
            path: result.secure_url,
            secure_url: result.secure_url,
            url: result.secure_url,
            filename: result.public_id,
            public_id: result.public_id,
            asset_id: result.asset_id,
            bytes: result.bytes,
            size: result.bytes || buffer.length,
            format: result.format,
            resource_type: result.resource_type,
            originalname: fileForUpload.originalname,
            mimetype: file.mimetype,
          });
        } catch (error) {
          cb(error);
        }
      });
    } catch (error) {
      cb(error);
    }
  },

  _removeFile: async (req, file, cb) => {
    try {
      if (file?.public_id) {
        await cloudinary.uploader.destroy(file.public_id, {
          resource_type: file.resource_type || 'image',
        });
      }

      cb(null);
    } catch (error) {
      cb(error);
    }
  },
});

const resumeStorage = createCloudinaryStorage({
  folderResolver: () => 'resumes',
  publicIdResolver: (req, file) => createUniquePublicId(getOwnerId(req), file),
});

const logoStorage = createCloudinaryStorage({
  folderResolver: () => 'logos',
  publicIdResolver: (req, file) => createUniquePublicId(getOwnerId(req), file),
  resourceType: 'image',
});

const profileImageStorage = createCloudinaryStorage({
  folderResolver: () => 'profile-images',
  publicIdResolver: (req, file) => createUniquePublicId(getOwnerId(req), file),
  resourceType: 'image',
});

const jobLocationImageStorage = createCloudinaryStorage({
  folderResolver: () => 'job-location-images',
  publicIdResolver: (req, file) => createUniquePublicId(`${getOwnerId(req)}-location`, file),
  resourceType: 'image',
});

const communityImageStorage = createCloudinaryStorage({
  folderResolver: () => 'community-posts',
  publicIdResolver: (req, file) => createUniquePublicId(`${getOwnerId(req)}-community`, file),
  resourceType: 'image',
});


const createStreamingCloudinaryStorage = ({ folderResolver, publicIdResolver }) => ({
  _handleFile: async (req, file, cb) => {
    try {
      if (!isCloudinaryConfigured()) {
        return cb(new Error('Cloudinary is not fully configured.'));
      }

      const folder = folderResolver(req, file);
      const publicId = publicIdResolver(req, file);
      const resourceType = file.mimetype.startsWith('video/') ? 'video'
        : file.mimetype.startsWith('image/') ? 'image'
        : 'raw';

      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `${CLOUDINARY_ROOT_FOLDER}/${folder}`,
          public_id: publicId,
          resource_type: resourceType,
        },
        (error, result) => {
          if (error) return cb(error);
          return cb(null, {
            path: result.secure_url,
            secure_url: result.secure_url,
            url: result.secure_url,
            filename: result.public_id,
            public_id: result.public_id,
            asset_id: result.asset_id,
            bytes: result.bytes,
            size: result.bytes || 0,
            format: result.format,
            resource_type: result.resource_type,
            duration: Number(result.duration || 0),
            originalname: file.originalname,
            mimetype: file.mimetype,
          });
        }
      );

      file.stream.on('error', cb);
      file.stream.pipe(uploadStream);
    } catch (error) {
      cb(error);
    }
  },

  _removeFile: async (req, file, cb) => {
    try {
      if (file?.public_id) {
        await cloudinary.uploader.destroy(file.public_id, {
          resource_type: file.resource_type || 'raw',
        });
      }
      cb(null);
    } catch (error) {
      cb(error);
    }
  },
});

const communityMediaStorage = createStreamingCloudinaryStorage({
  folderResolver: (req, file) => {
    if (file.fieldname === 'video') return 'community-posts/videos';
    if (file.fieldname === 'documents') return 'community-posts/documents';
    return 'community-posts/images';
  },
  publicIdResolver: (req, file) =>
    createUniquePublicId(`${getOwnerId(req)}-community-${file.fieldname}`, file),
});

const alumniVerificationStorage = createCloudinaryStorage({
  resourceType: 'raw',
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

const alumniResubmitStorage = createCloudinaryStorage({
  resourceType: 'raw',
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

const registerDocsStorage = createCloudinaryStorage({
  resourceType: 'auto',
  bufferValidator: validateJobseekerCredentialBuffer,
  sanitizeFileName: true,
  folderResolver: (req, file) => {
    const allowedFields = ['cv', 'diploma', 'validId', 'tor', 'sss', 'philhealth', 'pagibig', 'tin', 'profileImage'];
    const field = String(file.fieldname || '').trim();
    if (!allowedFields.includes(field)) throw new Error('Invalid upload field');
    if (field === 'profileImage') return 'profile-images';
    return `verification/alumni/${field}`;
  },
  publicIdResolver: (req, file) => {
    const field = String(file.fieldname || 'doc').trim();
    return createUniquePublicId(`${getEmailPrefix(req)}-${field}`, file);
  },
});

const employerVerificationStorage = createCloudinaryStorage({
  resourceType: 'raw',
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

const employerRegisterDocsStorage = createCloudinaryStorage({
  resourceType: 'raw',
  bufferValidator: validateEmployerCredentialBuffer,
  sanitizeFileName: true,
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

const employerCompanyMediaStorage = createCloudinaryStorage({
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


const COMMUNITY_DOCUMENT_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);

const communityMediaFileFilter = (req, file, cb) => {
  if (file.fieldname === 'images' && file.mimetype.startsWith('image/')) {
    return cb(null, true);
  }

  if (file.fieldname === 'video' && file.mimetype.startsWith('video/')) {
    return cb(null, true);
  }

  if (file.fieldname === 'documents' && COMMUNITY_DOCUMENT_MIME_TYPES.has(file.mimetype)) {
    return cb(null, true);
  }

  return cb(new Error('Unsupported Community attachment type.'));
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

const uploadCommunityImage = multer({
  storage: communityImageStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 8 * 1024 * 1024 },
});

const uploadCommunityMedia = multer({
  storage: communityMediaStorage,
  fileFilter: communityMediaFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 * 1024,
    files: 16,
  },
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

const registerFileFilter = (req, file, cb) => {
  if (file.fieldname === 'profileImage') {
    return imageFileFilter(req, file, cb);
  }

  const mimeType = String(file.mimetype || '').toLowerCase();
  const extension = path.extname(String(file.originalname || '')).toLowerCase();
  if (
    JOBSEEKER_CREDENTIAL_MIME_TYPES.has(mimeType)
    && JOBSEEKER_CREDENTIAL_EXTENSIONS.has(extension)
  ) return cb(null, true);

  return cb(new Error(INVALID_JOBSEEKER_CREDENTIAL_MESSAGE), false);
};

const uploadRegisterDocs = multer({
  storage: registerDocsStorage,
  fileFilter: registerFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

const jobseekerRegisterFields = uploadRegisterDocs.fields([
  { name: 'cv', maxCount: 1 },
  { name: 'diploma', maxCount: 1 },
  { name: 'validId', maxCount: 1 },
  { name: 'tor', maxCount: 1 },
  { name: 'sss', maxCount: 1 },
  { name: 'philhealth', maxCount: 1 },
  { name: 'pagibig', maxCount: 1 },
  { name: 'tin', maxCount: 1 },
  { name: 'profileImage', maxCount: 1 },
]);

const handleJobseekerRegisterUploads = (req, res, next) => {
  jobseekerRegisterFields(req, res, (error) => {
    if (!error) return next();

    const isFileSizeError = error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE';
    const message = isFileSizeError
      ? INVALID_JOBSEEKER_CREDENTIAL_MESSAGE
      : (error.message || INVALID_JOBSEEKER_CREDENTIAL_MESSAGE);

    return res.status(400).json({ message });
  });
};

const uploadEmployerVerification = multer({
  storage: employerVerificationStorage,
  fileFilter: verificationFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

const employerRegisterFileFilter = (req, file, cb) => {
  if (file.fieldname === 'companyLogo') {
    return imageFileFilter(req, file, cb);
  }

  const mimeType = String(file.mimetype || '').toLowerCase();
  const extension = path.extname(String(file.originalname || '')).toLowerCase();
  if (
    JOBSEEKER_CREDENTIAL_MIME_TYPES.has(mimeType)
    && JOBSEEKER_CREDENTIAL_EXTENSIONS.has(extension)
  ) return cb(null, true);

  return cb(new Error(INVALID_EMPLOYER_CREDENTIAL_MESSAGE), false);
};

const uploadEmployerRegisterDocs = multer({
  storage: employerRegisterDocsStorage,
  fileFilter: employerRegisterFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

const employerRegisterFields = uploadEmployerRegisterDocs.fields([
  { name: 'secRegistration', maxCount: 1 },
  { name: 'birRegistration', maxCount: 1 },
  { name: 'dtiRegistration', maxCount: 1 },
  { name: 'cityPermit', maxCount: 1 },
  { name: 'businessPermit', maxCount: 1 },
  { name: 'companyLogo', maxCount: 1 },
]);

const handleEmployerRegisterUploads = (req, res, next) => {
  employerRegisterFields(req, res, (error) => {
    if (!error) return next();

    const isFileSizeError = error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE';
    const message = isFileSizeError && error.field === 'companyLogo'
      ? 'Company logo must be 5MB or smaller.'
      : isFileSizeError
      ? INVALID_EMPLOYER_CREDENTIAL_MESSAGE
      : (error.message || INVALID_EMPLOYER_CREDENTIAL_MESSAGE);

    return res.status(400).json({ message });
  });
};

module.exports = {
  uploadResume,
  uploadLogo,
  uploadProfileImage,
  uploadJobLocationImage,
  uploadCommunityImage,
  uploadCommunityMedia,
  uploadAlumniVerification,
  uploadAlumniResubmit,
  uploadEmployerVerification,
  uploadRegisterDocs,
  handleJobseekerRegisterUploads,
  uploadEmployerRegisterDocs,
  handleEmployerRegisterUploads,
  uploadEmployerCompanyMedia,
};
