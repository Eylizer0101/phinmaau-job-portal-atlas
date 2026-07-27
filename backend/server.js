
// backend/server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const applicationRoutes = require('./routes/applicationRoutes');
const path = require('path');
const fs = require('fs');

dotenv.config();

const app = express();

const getAllowedOrigins = () => {
  const origins = [
    process.env.FRONTEND_URL,
    process.env.APP_URL,
    'https://phinmaau-job-portal-atlas-1.onrender.com',
    'http://localhost:3000',
  ]
    .filter(Boolean)
    .flatMap((origin) => String(origin).split(','))
    .map((origin) => origin.trim())
    .filter(Boolean);

  return [...new Set(origins)];
};

const getPublicBaseUrl = (req) => {
  if (process.env.PUBLIC_BASE_URL) {
    return process.env.PUBLIC_BASE_URL.replace(/\/$/, '');
  }

  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  return `${protocol}://${req.get('host')}`;
};

// ✅ CREATE ALL UPLOADS DIRECTORIES IF THEY DON'T EXIST
const createUploadsDirectories = () => {
  const directories = [
    path.join(__dirname, 'uploads'),
    path.join(__dirname, 'uploads/resumes'),
    path.join(__dirname, 'uploads/logos'),
    path.join(__dirname, 'uploads/profile-images'),
    path.join(__dirname, 'uploads/messages'),
    path.join(__dirname, 'uploads/notifications'),
    path.join(__dirname, 'uploads/job-location-images'),
    path.join(__dirname, 'uploads/company-cover-photos'),
    path.join(__dirname, 'uploads/company-gallery'),
    path.join(__dirname, 'uploads/verification'),
    path.join(__dirname, 'uploads/verification/alumni'),
    path.join(__dirname, 'uploads/verification/alumni/cv'),
    path.join(__dirname, 'uploads/verification/alumni/tor'),
    path.join(__dirname, 'uploads/verification/alumni/diploma'),
    path.join(__dirname, 'uploads/verification/alumni/sss'),
    path.join(__dirname, 'uploads/verification/alumni/philhealth'),
    path.join(__dirname, 'uploads/verification/alumni/pagibig'),
    path.join(__dirname, 'uploads/verification/alumni/tin'),
    path.join(__dirname, 'uploads/verification/alumni/validId'),
    path.join(__dirname, 'uploads/verification/employer'),
    path.join(__dirname, 'uploads/verification/employer/sec'),
    path.join(__dirname, 'uploads/verification/employer/bir'),
    path.join(__dirname, 'uploads/verification/employer/dti'),
    path.join(__dirname, 'uploads/verification/employer/city'),
    path.join(__dirname, 'uploads/verification/employer/business'),
  ];

  directories.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(` Created directory: ${dir}`);
    }
  });
};

createUploadsDirectories();

// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = getAllowedOrigins();

      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ SERVE STATIC FILES FROM UPLOADS DIRECTORY
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ✅ JOBSEEKER COUNT ENDPOINT
// Keep this only if ginagamit mo pa sa Employer Dashboard card
const authMiddleware = require('./middleware/authMiddleware');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

// ✅ DEFAULT ADMIN ACCOUNT SEEDER
// Backend lang ang gumagawa nito. Hindi ito dumadaan sa frontend registration.
const createDefaultAdminAccount = async () => {
  const adminEmail = String(process.env.DEFAULT_ADMIN_EMAIL || '').trim().toLowerCase();
  const adminPassword = String(process.env.DEFAULT_ADMIN_PASSWORD || '');

  if (!adminEmail || !adminPassword) {
    console.log(' Default admin account not created: DEFAULT_ADMIN_EMAIL or DEFAULT_ADMIN_PASSWORD is missing.');
    return;
  }

  if (adminPassword.length < 8) {
    console.log(' Default admin account not created: DEFAULT_ADMIN_PASSWORD must be at least 8 characters.');
    return;
  }

  const existingUser = await User.findOne({ email: adminEmail });

  if (existingUser) {
    if (existingUser.role !== 'admin') {
      console.log(' Default admin account not created: email is already used by a non-admin account.');
      return;
    }

    let changed = false;

    if (existingUser.status !== 'active') {
      existingUser.status = 'active';
      changed = true;
    }

    if (existingUser.isActive !== true) {
      existingUser.isActive = true;
      changed = true;
    }

    if (process.env.DEFAULT_ADMIN_RESET_PASSWORD === 'true') {
      const salt = await bcrypt.genSalt(10);
      existingUser.password = await bcrypt.hash(adminPassword, salt);
      changed = true;
    }

    if (changed) await existingUser.save();
    console.log(' Default admin account is ready.');
    return;
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(adminPassword, salt);

  await User.create({
    email: adminEmail,
    password: hashedPassword,
    role: 'admin',
    firstName: 'System',
    lastName: 'Admin',
    isActive: true,
    status: 'active',
    isVerified: true,
    mustChangePassword: false,
  });

  console.log(' Default admin account created successfully.');
};

// Database connection
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/phinma-jobportal';

mongoose
  .connect(mongoUri, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  })
  .then(async () => {
    console.log(' MongoDB connected successfully');
    await createDefaultAdminAccount();
  })
  .catch((err) => {
    console.log(' MongoDB connection error:', err.message);
    console.log(' Check MONGODB_URI, MongoDB Atlas Database User, and Network Access.');
  });

app.get('/api/stats/jobseekers/count', authMiddleware.verifyToken, async (req, res) => {
  try {
    // allow employer + admin
    if (!req.user || !['employer', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const count = await User.countDocuments({
      role: 'jobseeker',
      status: { $ne: 'deleted' },
    });

    return res.status(200).json({ success: true, count });
  } catch (error) {
    console.error('Error counting jobseekers:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Basic route
app.get('/', (req, res) => {
  const baseUrl = getPublicBaseUrl(req);

  res.json({
    message: 'Phinma Job Portal API is running 🚀',
    version: '1.0.0',
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    endpoints: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        forgotPassword: 'POST /api/auth/forgot-password',
        resetPassword: 'POST /api/auth/reset-password',
        me: 'GET /api/auth/me',
        updateProfile: 'PUT /api/auth/update-profile',
        uploadResume: 'POST /api/auth/upload-resume',
        updateCompanyProfile: 'PUT /api/auth/update-company-profile',
        getCompanyProfile: 'GET /api/auth/company-profile',
        uploadVerification: 'POST /api/auth/upload-verification/:docType',
      },
      admin: {
        getAllUsers: 'GET /api/admin/users',
        getUserById: 'GET /api/admin/users/:id',
        updateUserStatus: 'PUT /api/admin/users/:id/status',
        quickAction: 'PUT /api/admin/users/:id/quick-action',
        deleteUser: 'DELETE /api/admin/users/:id',
        bulkUpdateStatus: 'PUT /api/admin/users/bulk-status',
      },
      jobs: {
        getJobs: 'GET /api/jobs',
        createJob: 'POST /api/jobs',
        getJob: 'GET /api/jobs/:id',
        employerJobs: 'GET /api/jobs/employer/my-jobs',
      },
      applications: {
        apply: 'POST /api/applications/apply/:jobId',
        myApplications: 'GET /api/applications/my-applications',
        employerApplications: 'GET /api/applications/employer/all',
        jobApplications: 'GET /api/applications/job/:jobId',
        updateStatus: 'PUT /api/applications/:applicationId/status',
      },
      messages: {
        sendMessage: 'POST /api/messages/send',
        uploadFile: 'POST /api/messages/upload',
        getFile: 'GET /api/messages/file/:filename',
        conversations: 'GET /api/messages/conversations',
        conversation: 'GET /api/messages/conversation/:conversationId',
        unreadCount: 'GET /api/messages/unread-count',
        markAsRead: 'PUT /api/messages/mark-read/:conversationId',
        employerJobseekers: 'GET /api/messages/employer/jobseekers',
        jobseekerEmployers: 'GET /api/messages/jobseeker/employers',
        scheduleInterview: 'POST /api/messages/schedule-interview',
      },
      notifications: {
        getNotifications: 'GET /api/notifications',
        unreadCount: 'GET /api/notifications/unread-count',
        markAsRead: 'PUT /api/notifications/:id/read',
        markAllAsRead: 'PUT /api/notifications/mark-all-read',
        delete: 'DELETE /api/notifications/:id',
        clearAll: 'DELETE /api/notifications/clear-all',
      },
      stats: {
        jobseekersCount: 'GET /api/stats/jobseekers/count',
      },
    },
    uploads: {
      resumes: `${baseUrl}/uploads/resumes/`,
      logos: `${baseUrl}/uploads/logos/`,
      profileImages: `${baseUrl}/uploads/profile-images/`,
      messages: `${baseUrl}/uploads/messages/`,
      notifications: `${baseUrl}/uploads/notifications/`,
      verification: `${baseUrl}/uploads/verification/`,
    },
  });
});

// Google Calendar OAuth setup routes
const googleAuthRoutes = require('./routes/googleAuthRoutes');
app.use('/auth/google', googleAuthRoutes);
app.use('/api/auth/google', googleAuthRoutes);

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/jobs', require('./routes/jobRoutes'));
app.use('/api/applications', applicationRoutes);
app.use('/api/messages', require('./routes/messageRoutes'));
app.use('/api/chatbot', require('./routes/chatbotRoutes'));
app.use('/api/community', require('./routes/communityRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));

// ✅ ADD ADMIN ROUTES
app.use('/api/admin', require('./routes/adminRoutes'));

// ✅ ADD PUBLIC COMPANY ROUTES (VERIFIED ONLY)
app.use('/api/companies', require('./routes/companyRoutes'));

// Health check
app.get('/health', (req, res) => {
  const directories = {
    uploads: fs.existsSync(path.join(__dirname, 'uploads')),
    resumes: fs.existsSync(path.join(__dirname, 'uploads/resumes')),
    logos: fs.existsSync(path.join(__dirname, 'uploads/logos')),
    profileImages: fs.existsSync(path.join(__dirname, 'uploads/profile-images')),
    messages: fs.existsSync(path.join(__dirname, 'uploads/messages')),
    notifications: fs.existsSync(path.join(__dirname, 'uploads/notifications')),
    jobLocationImages: fs.existsSync(path.join(__dirname, 'uploads/job-location-images')),
    companyCoverPhotos: fs.existsSync(path.join(__dirname, 'uploads/company-cover-photos')),
    companyGallery: fs.existsSync(path.join(__dirname, 'uploads/company-gallery')),
    verification: fs.existsSync(path.join(__dirname, 'uploads/verification')),
  };

  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    directories: directories,
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    message: 'Endpoint not found',
    requestedUrl: req.originalUrl,
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(' Server Error Details:', {
    message: err?.message,
    code: err?.code,
    name: err?.name,
    stack: err?.stack,
  });

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      message: 'File too large. Maximum size is 10MB for resumes/docs, 5MB for images',
      error: err.message,
    });
  }

  if (err.name === 'MulterError') {
    return res.status(400).json({
      message: 'Upload error',
      error: err.message,
      code: err.code,
    });
  }

  res.status(500).json({
    message: 'Something went wrong!',
    error: err?.message || 'Unknown server error',
    code: err?.code,
  });
});

const PORT = process.env.PORT || 5000;
const allowedOrigins = getAllowedOrigins();

app.listen(PORT, () => {
  const publicBaseUrl = (process.env.PUBLIC_BASE_URL || `http://localhost:${PORT}`).replace(/\/$/, '');

  console.log(` Server is running on port ${PORT}`);
  console.log(` API: ${publicBaseUrl}`);
  console.log(` Health check: ${publicBaseUrl}/health`);
  console.log(` Frontend allowed origins: ${allowedOrigins.join(', ')}`);
  console.log(` Uploads available at: ${publicBaseUrl}/uploads/`);
  console.log(` Cloudinary configured: ${process.env.CLOUDINARY_CLOUD_NAME ? 'YES' : 'NO'}`);
  console.log(` Admin API: ${publicBaseUrl}/api/admin/users`);
});
