const crypto = require('crypto');
const SystemLog = require('../models/SystemLog');

const MAX_TEXT = 500;
const SENSITIVE_KEY_PATTERN = /(password|passcode|token|secret|authorization|cookie|otp|code|captcha|document|file|resume|coverletter|message|content)/i;
const SAFE_REQUEST_VALUE_KEYS = new Set([
  'status',
  'role',
  'action',
  'hiringStage',
  'declinedFrom',
  'docType',
  'category',
  'meetingType',
  'isPublished',
  'isActive',
]);

const cleanText = (value, maxLength = MAX_TEXT) =>
  String(value ?? '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);

const normalizeRole = (value) => {
  const role = cleanText(value, 30).toLowerCase();
  return ['admin', 'employer', 'jobseeker', 'system'].includes(role) ? role : 'unknown';
};

const maskIpAddress = (value) => {
  const raw = cleanText(value, 120).replace(/^::ffff:/, '');
  if (!raw) return '';

  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(raw)) {
    const parts = raw.split('.');
    return `${parts[0]}.${parts[1]}.${parts[2]}.x`;
  }

  if (raw.includes(':')) {
    const parts = raw.split(':').filter(Boolean);
    return `${parts.slice(0, 4).join(':')}::`;
  }

  return raw.slice(0, 80);
};

const makeRequestId = () =>
  typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : crypto.randomBytes(16).toString('hex');

const firstText = (...values) => {
  for (const value of values) {
    const text = cleanText(value, 240);
    if (text) return text;
  }
  return '';
};

const getDisplayName = (user = {}) =>
  firstText(
    user?.employerProfile?.companyName,
    user?.companyName,
    user?.fullName,
    [user?.firstName, user?.middleName, user?.lastName, user?.extensionName]
      .filter(Boolean)
      .join(' '),
    user?.username,
    user?.email
  ) || 'Unknown user';

const getResponseObject = (payload) => {
  if (!payload || typeof payload !== 'object' || Buffer.isBuffer(payload)) return {};
  return payload;
};

const getResponseEntity = (payload = {}) => {
  const response = getResponseObject(payload);
  return (
    response.user ||
    response.job ||
    response.application ||
    response.company ||
    response.employer ||
    response.jobseeker ||
    response.data ||
    response.result ||
    {}
  );
};

const getChangedFields = (body = {}) =>
  Object.keys(body || {})
    .filter((key) => !SENSITIVE_KEY_PATTERN.test(key))
    .slice(0, 20);

const getSafeRequestedValues = (body = {}) => {
  const values = {};

  Object.entries(body || {}).forEach(([key, value]) => {
    if (!SAFE_REQUEST_VALUE_KEYS.has(key) || SENSITIVE_KEY_PATTERN.test(key)) return;
    if (['string', 'number', 'boolean'].includes(typeof value)) {
      values[key] = typeof value === 'string' ? cleanText(value, 120) : value;
    }
  });

  return values;
};

const getErrorMessage = (payload) => {
  const response = getResponseObject(payload);
  const message = firstText(response.message, response.error, response.code);
  if (!message || SENSITIVE_KEY_PATTERN.test(message)) return '';
  return message.slice(0, 300);
};

const getIdFromPath = (pathValue) => {
  const matches = String(pathValue || '').match(/[a-f\d]{24}/gi);
  return matches?.[matches.length - 1] || '';
};

const buildTargetName = ({ req, responseBody, definition }) => {
  const body = req.body || {};
  const entity = getResponseEntity(responseBody);

  return firstText(
    entity?.employerProfile?.companyName,
    entity?.companyName,
    entity?.title,
    entity?.jobTitle,
    entity?.fullName,
    entity?.name,
    [entity?.firstName, entity?.middleName, entity?.lastName].filter(Boolean).join(' '),
    body.companyName,
    body.title,
    body.jobTitle,
    body.fullName,
    [body.firstName, body.middleName, body.lastName].filter(Boolean).join(' '),
    body.businessEmail,
    body.email,
    body.username,
    definition?.fallbackTarget
  );
};

const rule = (action, actionLabel, module, targetType, successDescription, options = {}) => ({
  action,
  actionLabel,
  module,
  targetType,
  successDescription,
  ...options,
});

const resolveAuditDefinition = (method, pathValue) => {
  const path = String(pathValue || '').replace(/\?.*$/, '');

  if (path.startsWith('/api/admin/system-logs')) return null;
  if (path.startsWith('/api/messages') || path.startsWith('/api/chatbot') || path.startsWith('/api/notifications')) return null;
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) return null;

  // Authentication and account settings
  if (method === 'POST' && path === '/api/auth/login') {
    return rule('auth.login', 'Account login', 'Authentication', 'Session', 'Signed in to the system.', {
      fallbackTarget: 'User session',
      securityEvent: true,
    });
  }
  if (method === 'POST' && path === '/api/auth/employer/login') {
    return rule('auth.login', 'Employer login', 'Authentication', 'Session', 'Signed in to the employer portal.', {
      fallbackTarget: 'Employer session',
      securityEvent: true,
    });
  }
  if (method === 'POST' && path === '/api/auth/register') {
    return rule('auth.register_jobseeker', 'Jobseeker registration', 'Authentication', 'Account', 'Created a jobseeker registration request.');
  }
  if (method === 'POST' && path === '/api/auth/employer/register') {
    return rule('auth.register_employer', 'Employer registration', 'Authentication', 'Account', 'Created an employer registration request.');
  }
  if (method === 'POST' && path === '/api/auth/forgot-password') {
    return rule('auth.password_reset_requested', 'Password reset requested', 'Authentication', 'Account', 'Requested a password reset.', { securityEvent: true });
  }
  if (method === 'POST' && path === '/api/auth/reset-password') {
    return rule('auth.password_reset_completed', 'Password reset completed', 'Authentication', 'Account', 'Reset an account password.', { securityEvent: true });
  }
  if (method === 'PUT' && ['/api/auth/change-password', '/api/auth/change-temporary-password'].includes(path)) {
    return rule('auth.password_changed', 'Password changed', 'Authentication', 'Account', 'Changed the account password.', { securityEvent: true });
  }
  if (method === 'POST' && path === '/api/auth/resubmit-document') {
    return rule('verification.document_resubmitted', 'Verification document resubmitted', 'Verification', 'Document', 'Resubmitted a verification document.');
  }
  if (method === 'PUT' && path === '/api/auth/update-profile') {
    return rule('profile.updated', 'Profile updated', 'Profile', 'User profile', 'Updated profile information.');
  }
  if (method === 'PUT' && path === '/api/auth/update-company-profile') {
    return rule('company.profile_updated', 'Company profile updated', 'Company', 'Company profile', 'Updated company profile information.');
  }
  if (method === 'PUT' && path === '/api/auth/salary-expectation') {
    return rule('profile.salary_expectation_updated', 'Salary expectation updated', 'Profile', 'Jobseeker profile', 'Updated salary expectations.');
  }
  if (path.startsWith('/api/auth/work-experiences')) {
    if (method === 'POST') return rule('profile.work_experience_created', 'Work experience added', 'Profile', 'Work experience', 'Added work experience.');
    if (method === 'PUT') return rule('profile.work_experience_updated', 'Work experience updated', 'Profile', 'Work experience', 'Updated work experience.');
    if (method === 'DELETE') return rule('profile.work_experience_deleted', 'Work experience deleted', 'Profile', 'Work experience', 'Deleted work experience.');
  }
  if (method === 'POST' && path === '/api/auth/upload-resume') {
    return rule('profile.resume_uploaded', 'Resume uploaded', 'Profile', 'Resume', 'Uploaded a resume.');
  }
  if (method === 'POST' && path === '/api/auth/upload-profile-image') {
    return rule('profile.photo_uploaded', 'Profile photo uploaded', 'Profile', 'Profile image', 'Uploaded a profile image.');
  }
  if (path.startsWith('/api/auth/upload-alumni-verification/')) {
    return rule('verification.jobseeker_document_uploaded', 'Jobseeker document uploaded', 'Verification', 'Document', 'Uploaded a jobseeker verification document.');
  }
  if (path.startsWith('/api/auth/delete-alumni-verification/')) {
    return rule('verification.jobseeker_document_deleted', 'Jobseeker document deleted', 'Verification', 'Document', 'Deleted a jobseeker verification document.');
  }
  if (path.startsWith('/api/auth/upload-verification/')) {
    return rule('verification.employer_document_uploaded', 'Employer document uploaded', 'Verification', 'Document', 'Uploaded an employer verification document.');
  }
  if (path.includes('/settings/verify-email')) {
    return rule('settings.email_changed', 'Email address changed', 'Settings', 'Account', 'Verified and changed the account email address.', { securityEvent: true });
  }
  if (path.includes('/settings/verify-phone')) {
    return rule('settings.phone_changed', 'Phone number changed', 'Settings', 'Account', 'Verified and changed the account phone number.', { securityEvent: true });
  }

  // Admin user management and verification
  if (method === 'PUT' && /^\/api\/admin\/users\/[^/]+\/status$/.test(path)) {
    return rule('admin.user_status_updated', 'User status updated', 'User Management', 'User account', 'Updated a user account status.');
  }
  if (method === 'PUT' && /^\/api\/admin\/users\/[^/]+\/quick-action$/.test(path)) {
    return rule('admin.user_quick_action', 'User quick action completed', 'User Management', 'User account', 'Completed an account management action.');
  }
  if (method === 'DELETE' && /^\/api\/admin\/users\/[^/]+$/.test(path)) {
    return rule('admin.user_deleted', 'User account deleted', 'User Management', 'User account', 'Deleted a user account.');
  }
  if (method === 'PUT' && path === '/api/admin/users/bulk-status') {
    return rule('admin.users_bulk_updated', 'User accounts bulk updated', 'User Management', 'User accounts', 'Updated multiple user accounts.');
  }
  if (method === 'PUT' && /^\/api\/admin\/employers\/verification\/[^/]+\/status$/.test(path)) {
    return rule('verification.employer_status_updated', 'Employer verification updated', 'Employer Verification', 'Employer', 'Updated employer verification status.');
  }
  if (method === 'PUT' && /^\/api\/admin\/employers\/verification\/[^/]+\/hold$/.test(path)) {
    return rule('verification.employer_held', 'Employer verification placed on hold', 'Employer Verification', 'Employer', 'Placed employer verification on hold.');
  }
  if (method === 'PUT' && /^\/api\/admin\/jobseekers\/verification\/[^/]+\/status$/.test(path)) {
    return rule('verification.jobseeker_status_updated', 'Jobseeker verification updated', 'Jobseeker Verification', 'Jobseeker', 'Updated jobseeker verification status.');
  }
  if (method === 'PUT' && /^\/api\/admin\/jobseekers\/verification\/[^/]+\/hold$/.test(path)) {
    return rule('verification.jobseeker_held', 'Jobseeker verification placed on hold', 'Jobseeker Verification', 'Jobseeker', 'Placed jobseeker verification on hold.');
  }
  if (method === 'PATCH' && /^\/api\/admin\/archive\/[^/]+\/[^/]+\/restore$/.test(path)) {
    return rule('archive.item_restored', 'Archived item restored', 'Archive', 'Archived record', 'Restored an archived record.');
  }
  if (method === 'DELETE' && /^\/api\/admin\/archive\/[^/]+\/[^/]+$/.test(path)) {
    return rule('archive.item_permanently_deleted', 'Archived item permanently deleted', 'Archive', 'Archived record', 'Permanently deleted an archived record.');
  }

  // Job management
  if (path === '/api/jobs' && method === 'POST') {
    return rule('job.created', 'Job created', 'Job Management', 'Job', 'Created a job post.');
  }
  if (/^\/api\/jobs\/[^/]+$/.test(path) && method === 'PUT') {
    return rule('job.updated', 'Job updated', 'Job Management', 'Job', 'Updated a job post.');
  }
  if (/^\/api\/jobs\/[^/]+$/.test(path) && method === 'DELETE') {
    return rule('job.archived', 'Job archived', 'Job Management', 'Job', 'Moved a job post to the archive.');
  }
  if (/^\/api\/jobs\/[^/]+\/permanent$/.test(path) && method === 'DELETE') {
    return rule('job.permanently_deleted', 'Job permanently deleted', 'Job Management', 'Job', 'Permanently deleted a job post.');
  }
  if (/^\/api\/jobs\/[^/]+\/restore$/.test(path) && method === 'PATCH') {
    return rule('job.restored', 'Job restored', 'Job Management', 'Job', 'Restored an archived job post.');
  }
  if (/^\/api\/jobs\/[^/]+\/status$/.test(path) && method === 'PATCH') {
    return rule('job.status_updated', 'Job status updated', 'Job Management', 'Job', 'Updated a job post status.');
  }

  // Application workflow
  if (/^\/api\/applications\/apply\/[^/]+$/.test(path) && method === 'POST') {
    return rule('application.submitted', 'Application submitted', 'Applications', 'Application', 'Submitted a job application.');
  }
  if (/^\/api\/applications\/[^/]+\/withdraw$/.test(path) && method === 'PUT') {
    return rule('application.withdrawn', 'Application withdrawn', 'Applications', 'Application', 'Withdrew a job application.');
  }
  if (/^\/api\/applications\/[^/]+\/reactivate$/.test(path) && method === 'PUT') {
    return rule('application.reactivated', 'Application reactivated', 'Applications', 'Application', 'Reactivated a withdrawn application.');
  }
  if (/^\/api\/applications\/[^/]+\/archive-declined$/.test(path) && method === 'PATCH') {
    return rule('application.declined_archived', 'Declined application archived', 'Applications', 'Application', 'Archived a declined application.');
  }
  if (/^\/api\/applications\/[^/]+\/restore-declined$/.test(path) && method === 'PATCH') {
    return rule('application.declined_restored', 'Declined application restored', 'Applications', 'Application', 'Restored an archived declined application.');
  }
  if (/^\/api\/applications\/[^/]+\/permanent$/.test(path) && method === 'DELETE') {
    return rule('application.permanently_deleted', 'Application permanently deleted', 'Applications', 'Application', 'Permanently deleted an application.');
  }
  if (/^\/api\/applications\/[^/]+\/interview-schedule$/.test(path) && method === 'PUT') {
    return rule('application.interview_scheduled', 'Interview schedule updated', 'Applications', 'Application', 'Updated the interview schedule.');
  }
  if (/^\/api\/applications\/[^/]+\/hiring-stage$/.test(path) && method === 'PUT') {
    return rule('application.hiring_stage_updated', 'Hiring stage updated', 'Applications', 'Application', 'Updated the application hiring stage.');
  }
  if (/^\/api\/applications\/[^/]+\/status$/.test(path) && method === 'PUT') {
    return rule('application.status_updated', 'Application status updated', 'Applications', 'Application', 'Updated the application status.');
  }

  // Community content. Likes and reactions are intentionally excluded to avoid noisy logs.
  if (path === '/api/community/posts' && method === 'POST') {
    return rule('community.post_created', 'Community post created', 'Community', 'Post', 'Created a community post.');
  }
  if (/^\/api\/community\/posts\/[^/]+$/.test(path) && method === 'PUT') {
    return rule('community.post_updated', 'Community post updated', 'Community', 'Post', 'Updated a community post.');
  }
  if (/^\/api\/community\/posts\/[^/]+$/.test(path) && method === 'DELETE') {
    return rule('community.post_archived', 'Community post archived', 'Community', 'Post', 'Moved a community post to the archive.');
  }
  if (/^\/api\/community\/posts\/[^/]+\/comments$/.test(path) && method === 'POST') {
    return rule('community.comment_created', 'Comment added', 'Community', 'Comment', 'Added a community comment.');
  }
  if (/^\/api\/community\/posts\/[^/]+\/comments\/[^/]+$/.test(path) && method === 'PUT') {
    return rule('community.comment_updated', 'Comment updated', 'Community', 'Comment', 'Updated a community comment.');
  }
  if (/^\/api\/community\/posts\/[^/]+\/comments\/[^/]+$/.test(path) && method === 'DELETE') {
    return rule('community.comment_archived', 'Comment archived', 'Community', 'Comment', 'Moved a community comment to the archive.');
  }
  if (/\/replies$/.test(path) && method === 'POST') {
    return rule('community.reply_created', 'Reply added', 'Community', 'Reply', 'Added a community reply.');
  }
  if (/\/replies\/[^/]+$/.test(path) && method === 'PUT') {
    return rule('community.reply_updated', 'Reply updated', 'Community', 'Reply', 'Updated a community reply.');
  }
  if (/\/replies\/[^/]+$/.test(path) && method === 'DELETE') {
    return rule('community.reply_archived', 'Reply archived', 'Community', 'Reply', 'Moved a community reply to the archive.');
  }
  if (/^\/api\/community\/managed\/archived\/comments\/[^/]+\/[^/]+\/restore$/.test(path) && method === 'PATCH') {
    return rule('community.comment_restored', 'Archived comment restored', 'Community', 'Comment', 'Restored an archived comment.');
  }
  if (/^\/api\/community\/managed\/archived\/comments\/[^/]+\/[^/]+$/.test(path) && method === 'DELETE') {
    return rule('community.comment_permanently_deleted', 'Comment permanently deleted', 'Community', 'Comment', 'Permanently deleted an archived comment.');
  }
  if (/^\/api\/community\/managed\/archived\/[^/]+\/restore$/.test(path) && method === 'PATCH') {
    return rule('community.post_restored', 'Archived post restored', 'Community', 'Post', 'Restored an archived community post.');
  }
  if (/^\/api\/community\/managed\/archived\/[^/]+$/.test(path) && method === 'DELETE') {
    return rule('community.post_permanently_deleted', 'Post permanently deleted', 'Community', 'Post', 'Permanently deleted an archived community post.');
  }
  if (path === '/api/community/reports' && method === 'POST') {
    return rule('community.content_reported', 'Community content reported', 'Community', 'Community content', 'Reported community content for review.');
  }

  // Company reviews are retained as a meaningful public-facing action. Saves are excluded as low-risk noise.
  if (/^\/api\/companies\/verified\/[^/]+\/reviews$/.test(path) && method === 'POST') {
    return rule('company.review_submitted', 'Company review submitted', 'Company', 'Company review', 'Submitted a company review.');
  }

  return null;
};

const createSystemLog = async (payload = {}) => {
  try {
    return await SystemLog.create({
      requestId: cleanText(payload.requestId, 120),
      actor: payload.actor || null,
      actorName: cleanText(payload.actorName || 'Unknown user', 180),
      actorEmail: cleanText(payload.actorEmail, 180).toLowerCase(),
      actorRole: normalizeRole(payload.actorRole),
      action: cleanText(payload.action, 100),
      actionLabel: cleanText(payload.actionLabel, 180),
      module: cleanText(payload.module, 120),
      targetType: cleanText(payload.targetType || 'System', 100),
      targetId: cleanText(payload.targetId, 180),
      targetName: cleanText(payload.targetName, 240),
      status: ['success', 'failed', 'warning'].includes(payload.status) ? payload.status : 'success',
      description: cleanText(payload.description, 1500),
      method: cleanText(payload.method, 12).toUpperCase(),
      path: cleanText(payload.path, 500),
      statusCode: Number(payload.statusCode) || 200,
      durationMs: Math.max(0, Number(payload.durationMs) || 0),
      ipAddress: maskIpAddress(payload.ipAddress),
      userAgent: cleanText(payload.userAgent, 500),
      metadata: payload.metadata && typeof payload.metadata === 'object' ? payload.metadata : {},
    });
  } catch (error) {
    // Logging must never break the user's original request.
    console.error('System log write failed:', error?.message || error);
    return null;
  }
};

const systemAuditMiddleware = (req, res, next) => {
  const startedAt = Date.now();
  const method = String(req.method || '').toUpperCase();
  const path = String(req.originalUrl || req.url || '').replace(/\?.*$/, '');
  const definition = resolveAuditDefinition(method, path);

  if (!definition) return next();

  const requestId = cleanText(req.headers['x-request-id'], 120) || makeRequestId();
  let responseBody = null;

  const originalJson = res.json.bind(res);
  res.json = (body) => {
    responseBody = body;
    return originalJson(body);
  };

  const originalSend = res.send.bind(res);
  res.send = (body) => {
    if (responseBody === null && body && typeof body === 'object' && !Buffer.isBuffer(body)) {
      responseBody = body;
    }
    return originalSend(body);
  };

  res.once('finish', () => {
    const response = getResponseObject(responseBody);
    const responseUser = response.user && typeof response.user === 'object' ? response.user : {};
    const actorSource = req.user || responseUser || {};
    const hasAuthenticatedActor = Boolean(req.user || responseUser?.id || responseUser?._id);
    const anonymousActorName = firstText(
      req.body?.fullName,
      [req.body?.firstName, req.body?.middleName, req.body?.lastName].filter(Boolean).join(' '),
      req.body?.companyName,
      req.body?.businessEmail,
      req.body?.email,
      req.body?.username
    );
    const actorName = hasAuthenticatedActor
      ? getDisplayName(actorSource)
      : anonymousActorName || 'Unauthenticated user';
    const actorEmail = firstText(actorSource?.email, req.body?.businessEmail, req.body?.email);
    const actorRole = normalizeRole(
      actorSource?.role ||
        req.body?.role ||
        (path.includes('/employer/') ? 'employer' : '') ||
        (definition.action === 'auth.register_jobseeker' ? 'jobseeker' : '') ||
        (definition.module === 'Authentication' ? 'unknown' : 'system')
    );
    const actorId = actorSource?._id || actorSource?.id || null;
    const targetId = firstText(
      getResponseEntity(responseBody)?._id,
      getResponseEntity(responseBody)?.id,
      req.params?.id,
      req.params?.userId,
      req.params?.jobId,
      req.params?.applicationId,
      req.params?.postId,
      req.params?.commentId,
      getIdFromPath(path)
    );
    const success = res.statusCode >= 200 && res.statusCode < 400;
    const errorMessage = success ? '' : getErrorMessage(responseBody);
    const targetName = buildTargetName({ req, responseBody, definition });
    const requestedValues = getSafeRequestedValues(req.body || {});
    const metadata = {
      changedFields: getChangedFields(req.body || {}),
      ...(Object.keys(requestedValues).length ? { requestedValues } : {}),
      ...(errorMessage ? { errorMessage } : {}),
      ...(definition.securityEvent ? { securityEvent: true } : {}),
    };

    const description = success
      ? definition.successDescription
      : `${definition.actionLabel} failed${errorMessage ? `: ${errorMessage}` : '.'}`;

    void createSystemLog({
      requestId,
      actor: actorId,
      actorName,
      actorEmail,
      actorRole,
      action: definition.action,
      actionLabel: definition.actionLabel,
      module: definition.module,
      targetType: definition.targetType,
      targetId,
      targetName,
      status: success ? 'success' : 'failed',
      description,
      method,
      path,
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt,
      ipAddress: req.headers['x-forwarded-for']?.split(',')[0] || req.ip || req.socket?.remoteAddress || '',
      userAgent: req.headers['user-agent'] || '',
      metadata,
    });
  });

  return next();
};

module.exports = {
  createSystemLog,
  systemAuditMiddleware,
};
