const Job = require('../models/Job');
const JobEditRequest = require('../models/JobEditRequest');
const Notification = require('../models/Notification');
const User = require('../models/User');

const ONE_HOUR_MS = 60 * 60 * 1000;
const ALLOWED_SECTIONS = [
  'Job Details',
  'Requirements & Qualifications',
  'Skills & Benefits',
  'Work Locations',
  'Salary',
  'Deadline',
];

const getPublishedAt = (job) => {
  const value = job?.publishedAt || job?.createdAt;
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
};

const getLockState = (job) => {
  const published =
    job?.isPublished === true ||
    String(job?.status || '').toLowerCase() === 'published';

  if (!published) {
    return { isLocked: false, canEdit: true, unlockUntil: null };
  }

  const publishedAt = getPublishedAt(job);
  const unlockUntil = job?.editUnlockedUntil ? new Date(job.editUnlockedUntil) : null;
  const hasTemporaryAccess =
    unlockUntil &&
    !Number.isNaN(unlockUntil.getTime()) &&
    unlockUntil.getTime() > Date.now();

  const isLocked =
    Boolean(publishedAt) &&
    Date.now() - publishedAt.getTime() >= ONE_HOUR_MS &&
    !hasTemporaryAccess;

  return {
    isLocked,
    canEdit: !isLocked,
    unlockUntil: hasTemporaryAccess ? unlockUntil : null,
  };
};

const serializeRequest = (request) => ({
  _id: request._id,
  job: request.job,
  employer: request.employer,
  requestedSections: request.requestedSections || [],
  reason: request.reason || '',
  status: request.status,
  reviewedBy: request.reviewedBy || null,
  reviewedAt: request.reviewedAt || null,
  unlockUntil: request.unlockUntil || null,
  createdAt: request.createdAt,
  updatedAt: request.updatedAt,
});

exports.createRequest = async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId);

    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found.' });
    }

    if (String(job.employer) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'You do not own this job post.' });
    }

    const lockState = getLockState(job);
    if (!lockState.isLocked) {
      return res.status(400).json({
        success: false,
        code: 'JOB_NOT_LOCKED',
        message: 'This job post is still editable. An edit request is not needed.',
      });
    }

    const existingPending = await JobEditRequest.findOne({
      job: job._id,
      employer: req.user._id,
      status: 'pending',
    }).sort({ createdAt: -1 });

    if (existingPending) {
      return res.status(409).json({
        success: false,
        code: 'EDIT_REQUEST_ALREADY_PENDING',
        message: 'An edit request for this job is already pending.',
        request: serializeRequest(existingPending),
      });
    }

    const requestedSections = [...new Set(
      (Array.isArray(req.body.requestedSections) ? req.body.requestedSections : [])
        .map((value) => String(value || '').trim())
        .filter((value) => ALLOWED_SECTIONS.includes(value))
    )];

    if (!requestedSections.length) {
      return res.status(400).json({
        success: false,
        message: 'Select at least one section that needs to be edited.',
      });
    }

    const request = await JobEditRequest.create({
      job: job._id,
      employer: req.user._id,
      requestedSections,
      reason: String(req.body.reason || '').trim(),
    });

    const employer = await User.findById(req.user._id).select(
      'firstName lastName fullName employerProfile.companyName'
    );
    const companyName =
      employer?.employerProfile?.companyName ||
      employer?.fullName ||
      [employer?.firstName, employer?.lastName].filter(Boolean).join(' ') ||
      job.companyName ||
      'An employer';

    const admins = await User.find({ role: 'admin', status: 'active' }).select('_id');
    if (admins.length) {
      await Notification.insertMany(
        admins.map((admin) => ({
          user: admin._id,
          type: 'job_edit_request',
          title: 'Job Edit Request',
          message: `${companyName} requested permission to edit “${job.title || 'Untitled Job'}”.`,
          relatedId: job._id,
          relatedModel: 'Job',
          link: '/admin/employer-job-edit-requests',
          metadata: {
            requestId: request._id,
            jobId: job._id,
            employerId: req.user._id,
          },
        }))
      );
    }

    return res.status(201).json({
      success: true,
      message: 'Edit request sent. An administrator will review it shortly.',
      request: serializeRequest(request),
    });
  } catch (error) {
    console.error('Create job edit request error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to send the edit request. Please try again.',
    });
  }
};

exports.getEmployerRequests = async (req, res) => {
  try {
    const requests = await JobEditRequest.find({ employer: req.user._id })
      .populate('job', 'title companyName createdAt publishedAt editUnlockedUntil isPublished status')
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      requests: requests.map(serializeRequest),
    });
  } catch (error) {
    console.error('Get employer edit requests error:', error);
    return res.status(500).json({ success: false, message: 'Unable to load edit requests.' });
  }
};

exports.getJobStatus = async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId);

    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found.' });
    }

    const isOwner = String(job.employer) === String(req.user._id);
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    const pendingRequest = await JobEditRequest.findOne({
      job: job._id,
      status: 'pending',
    }).sort({ createdAt: -1 });

    return res.json({
      success: true,
      ...getLockState(job),
      publishedAt: getPublishedAt(job),
      pendingRequest: pendingRequest ? serializeRequest(pendingRequest) : null,
    });
  } catch (error) {
    console.error('Get job edit status error:', error);
    return res.status(500).json({ success: false, message: 'Unable to check edit access.' });
  }
};

exports.getAdminRequests = async (req, res) => {
  try {
    const requests = await JobEditRequest.find({})
      .populate('job', 'title companyName companyLogo category jobType workMode vacancies applicationCount applicationDeadline location createdAt publishedAt editUnlockedUntil')
      .populate('employer', 'firstName lastName fullName employerProfile.companyName employerProfile.companyLogo')
      .populate('reviewedBy', 'firstName lastName fullName')
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      requests: requests.map(serializeRequest),
    });
  } catch (error) {
    console.error('Get admin edit requests error:', error);
    return res.status(500).json({ success: false, message: 'Unable to load job edit requests.' });
  }
};

exports.getAdminRequestDetails = async (req, res) => {
  try {
    const request = await JobEditRequest.findById(req.params.requestId)
      .populate('job')
      .populate('employer', 'firstName lastName fullName email employerProfile')
      .populate('reviewedBy', 'firstName lastName fullName');

    if (!request) {
      return res.status(404).json({ success: false, message: 'Edit request not found.' });
    }

    return res.json({ success: true, request: serializeRequest(request) });
  } catch (error) {
    console.error('Get admin edit request details error:', error);
    return res.status(500).json({ success: false, message: 'Unable to load edit request details.' });
  }
};

exports.approveRequest = async (req, res) => {
  try {
    const request = await JobEditRequest.findById(req.params.requestId).populate('job');

    if (!request) {
      return res.status(404).json({ success: false, message: 'Edit request not found.' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `This request has already been ${request.status}.`,
      });
    }

    const unlockUntil = new Date(Date.now() + ONE_HOUR_MS);

    request.status = 'approved';
    request.reviewedBy = req.user._id;
    request.reviewedAt = new Date();
    request.unlockUntil = unlockUntil;
    await request.save();

    await Job.findByIdAndUpdate(request.job._id, {
      editUnlockedUntil: unlockUntil,
    });

    await Notification.create({
      user: request.employer,
      type: 'system',
      title: 'Edit Request Approved',
      message: `Your request to edit “${request.job.title || 'Untitled Job'}” was approved. You have one hour to make changes.`,
      relatedId: request.job._id,
      relatedModel: 'Job',
      link: `/employer/edit-job/${request.job._id}`,
      metadata: {
        requestId: request._id,
        jobId: request.job._id,
        unlockUntil,
      },
    });

    return res.json({
      success: true,
      message: 'Edit access approved for one hour.',
      request: serializeRequest(request),
      unlockUntil,
    });
  } catch (error) {
    console.error('Approve job edit request error:', error);
    return res.status(500).json({ success: false, message: 'Unable to approve this request.' });
  }
};
