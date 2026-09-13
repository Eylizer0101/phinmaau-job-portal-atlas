const Application = require('../models/Application');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { sendEmploymentStatusNoResponseEmail } = require('../config/mailer');

const REQUEST_SELECT = [
  { path: 'job', select: 'title companyName companyLogo industry category jobType workMode' },
  { path: 'jobseeker', select: 'fullName firstName middleName lastName email profileImage jobSeekerProfile.campus jobSeekerProfile.course jobSeekerProfile.yearGraduated' },
  { path: 'employer', select: 'fullName firstName middleName lastName email employerProfile.companyName employerProfile.companyLogo employerProfile.industry' },
  { path: 'employmentStatusRequest.employerResponse.respondedBy', select: 'fullName firstName middleName lastName email' },
  { path: 'employmentStatusRequest.adminDecision.decidedBy', select: 'fullName firstName middleName lastName email' }
];

const populateRequest = (query) => REQUEST_SELECT.reduce((result, item) => result.populate(item), query);
const requestQuery = { status: 'hired', 'employmentStatusRequest.status': { $ne: 'none' } };
const fullName = (user = {}) => String(user.fullName || [user.firstName, user.middleName, user.lastName].filter(Boolean).join(' ')).trim() || 'Job Seeker';

exports.getAllStatusRequests = async (req, res) => {
  try {
    const requests = await populateRequest(Application.find(requestQuery)).sort({ 'employmentStatusRequest.requestedAt': -1 });
    return res.json({ success: true, requests });
  } catch (error) {
    console.error('Admin status request list error:', error);
    return res.status(500).json({ success: false, message: 'Unable to load employment status requests.' });
  }
};

exports.getJobseekerStatusRequestHistory = async (req, res) => {
  try {
    const jobseeker = await User.findOne({ _id: req.params.jobseekerId, role: 'jobseeker' })
      .select('fullName firstName middleName lastName email profileImage jobSeekerProfile.campus jobSeekerProfile.course jobSeekerProfile.yearGraduated');
    if (!jobseeker) return res.status(404).json({ success: false, message: 'Jobseeker not found.' });
    const requests = await populateRequest(Application.find({ ...requestQuery, jobseeker: jobseeker._id }))
      .sort({ 'employmentStatusRequest.requestedAt': -1 });
    return res.json({ success: true, jobseeker, requests });
  } catch (error) {
    console.error('Jobseeker status request history error:', error);
    return res.status(500).json({ success: false, message: 'Unable to load request history.' });
  }
};

exports.getStatusRequestDetails = async (req, res) => {
  try {
    const application = await populateRequest(Application.findOne({
      _id: req.params.requestId,
      jobseeker: req.params.jobseekerId,
      ...requestQuery
    }));
    if (!application) return res.status(404).json({ success: false, message: 'Employment status request not found.' });
    return res.json({ success: true, request: application });
  } catch (error) {
    console.error('Status request details error:', error);
    return res.status(500).json({ success: false, message: 'Unable to load request details.' });
  }
};

exports.finalizeStatusRequest = async (req, res) => {
  try {
    const decision = String(req.body?.decision || '').toLowerCase();
    if (!['approved', 'declined'].includes(decision)) {
      return res.status(400).json({ success: false, message: 'Decision must be approved or declined.' });
    }
    const application = await Application.findOne({ _id: req.params.requestId, ...requestQuery });
    if (!application) return res.status(404).json({ success: false, message: 'Employment status request not found.' });
    const employerDecision = application.employmentStatusRequest?.employerResponse?.decision;
    if (!['approved', 'declined', 'no_response'].includes(employerDecision) && application.employmentStatusRequest.status !== 'no_response') {
      return res.status(409).json({ success: false, message: 'Wait for the Employer response before making a final decision.' });
    }
    if (['approved', 'declined'].includes(application.employmentStatusRequest?.adminDecision?.decision)) {
      return res.status(409).json({ success: false, message: 'This request already has a final Admin decision.' });
    }

    const decidedAt = new Date();
    application.employmentStatusRequest.status = decision;
    application.employmentStatusRequest.adminDecision = { decision, decidedAt, decidedBy: req.user._id };
    if (decision === 'approved') {
      application.employmentStatus = 'inactive';
      application.employmentEndReason = application.employmentStatusRequest.reason;
      application.employmentEndedAt = decidedAt;
      application.employmentUpdatedBy = application.employmentStatusRequest.employerResponse?.respondedBy ? 'employer' : 'jobseeker';
    } else {
      application.employmentStatus = 'active';
      application.employmentStatusCheckedAt = decidedAt;
    }
    await application.save();

    await Notification.create({
      user: application.jobseeker,
      type: 'employment_status_update',
      title: decision === 'approved' ? 'Employment Status Request Approved' : 'Employment Status Request Declined',
      message: decision === 'approved'
        ? "The Admin approved your employment status request. Your status is now Inactive."
        : 'The Admin declined your employment status request. Your status remains Active.',
      relatedId: application._id,
      relatedModel: 'Application',
      link: `/jobseeker/my-applications?status=hired&application=${application._id}`,
      metadata: { applicationId: application._id, decision, finalDecision: true }
    });

    const populated = await populateRequest(Application.findById(application._id));
    return res.json({
      success: true,
      message: decision === 'approved' ? 'Request Approved Successfully' : 'Request Declined Successfully',
      application: populated
    });
  } catch (error) {
    console.error('Admin final status request decision error:', error);
    return res.status(500).json({ success: false, message: 'Unable to save the final Admin decision.' });
  }
};

exports.processNoResponseRequests = async () => {
  const deadline = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000));
  const pending = await populateRequest(Application.find({
    status: 'hired',
    'employmentStatusRequest.status': 'pending',
    'employmentStatusRequest.requestedAt': { $lte: deadline }
  }));

  for (const application of pending) {
    const now = new Date();
    if (!application.employmentStatusRequest.employerResponse) {
      application.employmentStatusRequest.employerResponse = {};
    }
    application.employmentStatusRequest.status = 'no_response';
    application.employmentStatusRequest.noResponseAt = now;
    application.employmentStatusRequest.employerResponse.decision = 'no_response';
    await application.save();

    const admins = await User.find({ role: 'admin', status: { $ne: 'deleted' } }).select('_id');
    const name = fullName(application.jobseeker);
    if (admins.length) await Notification.insertMany(admins.map((admin) => ({
      user: admin._id,
      type: 'employment_status_request',
      title: 'Employer Response Overdue',
      message: `The employer did not respond to ${name}'s employment status update request within 7 days.`,
      relatedId: application._id,
      relatedModel: 'Application',
      link: `/admin/jobseeker-status-requests/${application.jobseeker._id}/${application._id}`
    })));

    const employer = application.employer || {};
    if (employer.email) {
      await sendEmploymentStatusNoResponseEmail({
        to: employer.email,
        companyName: employer.employerProfile?.companyName || employer.fullName,
        jobseekerName: name,
        jobTitle: application.job?.title,
        industry: application.job?.industry || employer.employerProfile?.industry
      });
      application.employmentStatusRequest.followUpEmailSentAt = new Date();
      await application.save();
    }
  }
  return pending.length;
};
