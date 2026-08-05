const Notification = require('../models/Notification');
const User = require('../models/User');
const Job = require('../models/Job');
const Application = require('../models/Application');
const Message = require('../models/Message');


const tokenizeNotificationProfileValue = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value.flatMap((item) => tokenizeNotificationProfileValue(item));
    if (typeof value === 'object') return Object.values(value).flatMap((item) => tokenizeNotificationProfileValue(item));

    return String(value || '')
        .split(/\|\||,|\n|;/g)
        .map((item) => String(item || '').replace(/\s[—-]\s(?:Basic|Novice|Intermediate|Advanced|Expert)$/i, '').trim())
        .filter(Boolean);
};

const normalizeNotificationKeyword = (value) => String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const buildNotificationJobseekerKeywords = (user = {}) => {
    const profile = user?.jobSeekerProfile || {};
    const rawKeywords = [];

    rawKeywords.push(profile.course, profile.studyField, profile.educationalAttainment, profile.employmentType, profile.preferredWorkMode);
    rawKeywords.push(...tokenizeNotificationProfileValue(profile.technicalSkills));
    rawKeywords.push(...tokenizeNotificationProfileValue(profile.softSkills));
    rawKeywords.push(...tokenizeNotificationProfileValue(profile.whatHaveYouDone));
    rawKeywords.push(...tokenizeNotificationProfileValue(profile.aboutMe));

    (profile.workExperiences || []).forEach((item) => {
        rawKeywords.push(item?.positionTitle, item?.description, item?.companyName);
    });

    ['certifications', 'projects', 'seminars', 'awards', 'affiliations', 'cocurricular'].forEach((key) => {
        (profile[key] || []).forEach((item) => {
            rawKeywords.push(item?.title, item?.role, item?.organization, item?.issuer, item?.description);
        });
    });

    const normalizedBase = rawKeywords
        .flatMap((item) => tokenizeNotificationProfileValue(item))
        .map(normalizeNotificationKeyword)
        .filter((item) => item.length >= 3 || ['c#', 'c++'].includes(item));

    const expanded = [...normalizedBase];
    const baseText = normalizedBase.join(' ');

    const courseGroups = [
        {
            test: ['information technology', 'computer science', 'computer engineering', 'it', 'ict'],
            keywords: ['information technology', 'it staff', 'technical support', 'programmer', 'software developer', 'web developer', 'frontend', 'backend', 'database', 'systems', 'network', 'computer', 'developer', 'coding', 'web development']
        },
        {
            test: ['business administration', 'business management', 'management'],
            keywords: ['business', 'management', 'administrative', 'office staff', 'operations', 'business development', 'supervisor']
        },
        {
            test: ['accountancy', 'accounting', 'financial management', 'finance'],
            keywords: ['accounting', 'accountant', 'finance', 'bookkeeper', 'audit', 'payroll', 'billing', 'financial']
        },
        {
            test: ['hospitality', 'tourism', 'hotel restaurant', 'hrm'],
            keywords: ['hospitality', 'hotel', 'restaurant', 'tourism', 'front desk', 'food service', 'service crew', 'cashier']
        }
    ];

    courseGroups.forEach((group) => {
        if (group.test.some((term) => baseText.includes(term))) {
            expanded.push(...group.keywords.map(normalizeNotificationKeyword));
        }
    });

    return [...new Set(expanded)].filter(Boolean);
};

const calculateNotificationJobMatch = (job = {}, user = {}) => {
    const keywords = buildNotificationJobseekerKeywords(user);
    const jobText = normalizeNotificationKeyword([
        job.title,
        job.companyName,
        job.category,
        Array.isArray(job.skillsRequired) ? job.skillsRequired.join(' ') : job.skillsRequired,
        job.description,
        job.requirements,
        job.jobType,
        job.workMode,
        job.experienceLevel,
        job.educationLevel,
        job.location
    ].filter(Boolean).join(' '));

    const matchedKeywords = keywords.filter((keyword) => jobText.includes(keyword)).slice(0, 10);

    return {
        score: matchedKeywords.length,
        matchedKeywords
    };
};

// Get all notifications for user
exports.getNotifications = async (req, res) => {
    try {
        const userId = req.user._id;

        // ✅ If employer: auto-generate "job expiring soon" notifications (backend-based)
        if (req.user.role === 'employer') {
            const now = new Date();
            const msInDay = 24 * 60 * 60 * 1000;

            const withinNextDays = (dateString, days) => {
                if (!dateString) return false;
                const d = new Date(dateString);
                const diff = d - now;
                return diff >= 0 && diff <= days * msInDay;
            };

            const myJobs = await Job.find({
                employer: userId,
                isActive: true,
                isPublished: true,
                status: 'published'
            }).select('_id title applicationDeadline');

            const expiringJobs = (myJobs || []).filter((j) => withinNextDays(j.applicationDeadline, 3));

            // Create (or prevent duplicates) expiring notifications
            for (const job of expiringJobs) {
                const existing = await Notification.findOne({
                    user: userId,
                    type: 'job_expiring',
                    'metadata.jobId': job._id,
                    isArchived: false,
                    createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // last 24 hours
                });

                if (!existing) {
                    const daysLeft = Math.ceil((new Date(job.applicationDeadline) - now) / msInDay);
                    const safeDaysLeft = Number.isFinite(daysLeft) ? Math.max(daysLeft, 0) : 0;

                    const notification = new Notification({
                        user: userId,
                        type: 'job_expiring',
                        title: 'Job Expiring Soon',
                        message: `"${job.title}" is expiring in ${safeDaysLeft} day${safeDaysLeft === 1 ? '' : 's'}.`,
                        relatedId: job._id,
                        relatedModel: 'Job',
                        link: `/employer/manage-jobs`,
                        metadata: {
                            jobId: job._id,
                            jobTitle: job.title,
                            deadline: job.applicationDeadline,
                            daysLeft: safeDaysLeft
                        }
                    });

                    await notification.save();
                }
            }
        }

        const notifications = await Notification.find({
            user: userId,
            isArchived: false
        })
        .sort({ createdAt: -1 })
        .limit(50);

        const unreadCount = await Notification.countDocuments({
            user: userId,
            isRead: false,
            isArchived: false
        });

        res.json({
            success: true,
            notifications,
            unreadCount
        });
    } catch (error) {
        console.error('Error getting notifications:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching notifications'
        });
    }
};

// Mark notification as read
exports.markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        const notification = await Notification.findOneAndUpdate(
            { _id: id, user: userId },
            { isRead: true },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }

        res.json({
            success: true,
            notification
        });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating notification'
        });
    }
};

// Mark all as read
exports.markAllAsRead = async (req, res) => {
    try {
        const userId = req.user._id;

        await Notification.updateMany(
            { user: userId, isRead: false },
            { isRead: true }
        );

        res.json({
            success: true,
            message: 'All notifications marked as read'
        });
    } catch (error) {
        console.error('Error marking all as read:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating notifications'
        });
    }
};

// Delete notification
exports.deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        const notification = await Notification.findOneAndDelete({
            _id: id,
            user: userId
        });

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }

        res.json({
            success: true,
            message: 'Notification deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting notification:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting notification'
        });
    }
};

// Clear all notifications
exports.clearAll = async (req, res) => {
    try {
        const userId = req.user._id;

        await Notification.updateMany(
            { user: userId },
            { isArchived: true }
        );

        res.json({
            success: true,
            message: 'All notifications cleared'
        });
    } catch (error) {
        console.error('Error clearing notifications:', error);
        res.status(500).json({
            success: false,
            message: 'Error clearing notifications'
        });
    }
};

// Get unread count
exports.getUnreadCount = async (req, res) => {
    try {
        const userId = req.user._id;

        const count = await Notification.countDocuments({
            user: userId,
            isRead: false,
            isArchived: false
        });

        res.json({
            success: true,
            count
        });
    } catch (error) {
        console.error('Error getting unread count:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching notification count'
        });
    }
};

// HELPER FUNCTIONS - To be called from other controllers


exports.createAdminUserRegistrationNotification = async (registeredUser, accountType = 'jobseeker') => {
  try {
    if (!registeredUser?._id) return;

    const admins = await User.find({ role: 'admin', status: { $ne: 'deleted' } }).select('_id');
    if (!admins.length) return;

    const displayName =
      accountType === 'employer'
        ? registeredUser?.employerProfile?.companyName || registeredUser.fullName || registeredUser.email
        : registeredUser.fullName ||
          [registeredUser.firstName, registeredUser.middleName, registeredUser.lastName].filter(Boolean).join(' ').trim() ||
          registeredUser.email;

    const link = accountType === 'employer'
      ? `/admin/employer-verification/${registeredUser._id}`
      : `/admin/jobseeker-verification/${registeredUser._id}`;

    const notifications = admins.map((admin) => ({
      user: admin._id,
      type: 'system',
      title: 'New User Registration',
      message: `${displayName} registered as ${accountType === 'employer' ? 'an employer' : 'a jobseeker'}.`,
      relatedId: registeredUser._id,
      relatedModel: 'User',
      link,
      isRead: false,
      isArchived: false,
      metadata: {
        adminCategory: 'new_registration',
        accountType,
        subjectUserId: registeredUser._id,
      },
    }));

    await Notification.insertMany(notifications);
  } catch (error) {
    console.error('Error creating admin registration notification:', error);
  }
};

exports.createAdminJobPostedNotification = async (job, employer) => {
  try {
    if (!job?._id) return;

    const admins = await User.find({ role: 'admin', status: { $ne: 'deleted' } }).select('_id');
    if (!admins.length) return;

    const companyName = job.companyName || employer?.employerProfile?.companyName || employer?.fullName || 'An employer';

    const notifications = admins.map((admin) => ({
      user: admin._id,
      type: 'system',
      title: 'New Job Posted',
      message: `${companyName} has posted a new opening for ${job.title}.`,
      relatedId: job._id,
      relatedModel: 'Job',
      link: `/admin/jobs/${job._id}`,
      isRead: false,
      isArchived: false,
      metadata: {
        adminCategory: 'new_job_posted',
        jobId: job._id,
        jobTitle: job.title,
        employerId: job.employer,
        companyName,
      },
    }));

    await Notification.insertMany(notifications);
  } catch (error) {
    console.error('Error creating admin job posted notification:', error);
  }
};

// ✅ NEW: Create employer notification when someone applies
exports.createEmployerNewApplicationNotification = async (employerId, application, jobseekerUser, job) => {
  try {
    if (!employerId || !application || !job) return;

    const jobseekerName =
      (jobseekerUser?.fullName || '').trim() ||
      [jobseekerUser?.firstName, jobseekerUser?.middleName, jobseekerUser?.lastName].filter(Boolean).join(' ').trim() ||
      'Someone';

    const notification = new Notification({
      user: employerId,
      type: 'new_application',
      title: 'New Application',
      message: `${jobseekerName} applied for ${job.title}.`,
      relatedId: application._id,
      relatedModel: 'Application',
      link: `/employer/application/${application._id}`,
      metadata: {
        applicationId: application._id,
        jobId: job._id,
        jobTitle: job.title,
        jobseekerId: application.jobseeker,
        jobseekerName
      }
    });

    await notification.save();
    return notification;
  } catch (error) {
    console.error('Error creating employer application notification:', error);
  }
};

// Create job match notification (profile-based matching logic)
exports.createJobMatchNotification = async (jobseekerId, job, precomputedMatch = null) => {
  try {
    const user = await User.findById(jobseekerId).select('jobSeekerProfile');
    if (!user || !user.jobSeekerProfile) return;

    const match = precomputedMatch || calculateNotificationJobMatch(job, user);
    const matchingKeywords = Array.isArray(match?.matchedKeywords) ? match.matchedKeywords : [];

    if (!Number(match?.score || 0) || matchingKeywords.length === 0) {
      console.log(`No profile match for jobseeker ${jobseekerId} and job ${job.title}`);
      return;
    }

    const existingNotification = await Notification.findOne({
      user: jobseekerId,
      type: 'job_match',
      'metadata.jobId': job._id,
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });

    if (existingNotification) {
      console.log(`Duplicate notification prevented for jobseeker ${jobseekerId} and job ${job.title}`);
      return;
    }

    const displayMatches = matchingKeywords.slice(0, 3);
    const message = displayMatches.length > 0
      ? `New job opportunity matched your skills: ${job.title}. Matched with: ${displayMatches.join(', ')}.`
      : `New job opportunity matched your skills: ${job.title}.`;

    const notification = new Notification({
      user: jobseekerId,
      type: 'job_match',
      title: 'New Job Match!',
      message,
      relatedId: job._id,
      relatedModel: 'Job',
      link: `/jobseeker/job-details/${job._id}`,
      metadata: {
        jobId: job._id,
        companyName: job.companyName,
        jobTitle: job.title,
        matchingSkills: matchingKeywords,
        matchCount: matchingKeywords.length,
        matchScore: Number(match?.score || 0)
      }
    });

    await notification.save();
    console.log(`✅ Notification created for jobseeker ${jobseekerId} - Job: ${job.title}`);
    return notification;

  } catch (error) {
    console.error('Error creating job match notification:', error);
  }
};

// Create application status update notification
exports.createApplicationStatusNotification = async (application, oldStatus, newStatus) => {
    try {
        const statusMessages = {
            'for interview': 'Your application has been moved to For Interview!',
            'hired': 'Congratulations! You have been hired!',
            'declined': 'Your application has been declined.',
            'vacancy full': 'The vacancy is already full.'
        };

        const message = statusMessages[newStatus] || `Your application status changed to ${newStatus}`;

        const notification = new Notification({
            user: application.jobseeker,
            type: 'application_update',
            title: 'Application Update',
            message: `${message} for "${application.job?.title || 'the job'}" at ${application.job?.companyName || 'the company'}.`,
            relatedId: application._id,
            relatedModel: 'Application',
            link: `/jobseeker/my-applications`,
            metadata: {
                applicationId: application._id,
                jobId: application.job,
                oldStatus,
                newStatus
            }
        });

        await notification.save();
        return notification;
    } catch (error) {
        console.error('Error creating application status notification:', error);
    }
};



exports.createVacancyFullNotification = async (application, job) => {
    try {
        if (!application?.jobseeker) return null;

        const notification = new Notification({
            user: application.jobseeker,
            type: 'application_update',
            title: 'Vacancy Full',
            message: `The vacancy is already full for "${job?.title || application.job?.title || 'the job'}" at ${job?.companyName || application.job?.companyName || 'the company'}.`,
            relatedId: application._id,
            relatedModel: 'Application',
            link: `/jobseeker/my-applications`,
            metadata: {
                applicationId: application._id,
                jobId: job?._id || application.job,
                oldStatus: 'pending',
                newStatus: 'vacancy full',
                reason: 'vacancy_full'
            }
        });

        await notification.save();
        return notification;
    } catch (error) {
        console.error('Error creating vacancy full notification:', error);
        return null;
    }
};

// Create new message notification
exports.createMessageNotification = async (senderId, receiverId, message) => {
    try {
        const sender = await User.findById(senderId);
        if (!sender) return;

        const receiver = await User.findById(receiverId).select('role');
        const isEmployerReceiver = receiver?.role === 'employer';

        const conversationLink = isEmployerReceiver
          ? `/employer/messages?conversation=${message.conversationId}`
          : `/jobseeker/messages?conversation=${message.conversationId}`;

        const existingNotification = await Notification.findOne({
            user: receiverId,
            type: 'new_message',
            'metadata.senderId': senderId,
            isRead: false,
            createdAt: { $gte: new Date(Date.now() - 10 * 60 * 1000) }
        });

        if (existingNotification) {
            existingNotification.message = `New message from ${sender.fullName || sender.companyName || 'User'}: ${String(message.content || '').trim()}`;
            existingNotification.metadata.lastMessage = message.content;
            existingNotification.link = conversationLink;
            await existingNotification.save();
            return existingNotification;
        }

        const notification = new Notification({
            user: receiverId,
            type: 'new_message',
            title: 'New Message',
            message: `New message from ${sender.fullName || sender.companyName || 'User'}: ${String(message.content || '').trim()}`,
            relatedId: message._id,
            relatedModel: 'Message',
            link: conversationLink,
            metadata: {
                senderId: sender._id,
                senderName: sender.fullName || sender.companyName,
                conversationId: message.conversationId,
                lastMessage: message.content
            }
        });

        await notification.save();
        return notification;
    } catch (error) {
        console.error('Error creating message notification:', error);
    }
};

// Create interview scheduled notification
exports.createInterviewNotification = async (jobseekerId, interviewDetails) => {
    try {
        const notification = new Notification({
            user: jobseekerId,
            type: 'interview',
            title: 'Interview Scheduled!',
            message: `An interview has been scheduled for ${interviewDetails.date} at ${interviewDetails.time}. Location: ${interviewDetails.location || 'Online'}`,
            link: `/jobseeker/messages`,
            metadata: {
                interviewDate: interviewDetails.date,
                interviewTime: interviewDetails.time,
                location: interviewDetails.location,
                meetingLink: interviewDetails.meetingLink
            }
        });

        await notification.save();
        return notification;
    } catch (error) {
        console.error('Error creating interview notification:', error);
    }
};