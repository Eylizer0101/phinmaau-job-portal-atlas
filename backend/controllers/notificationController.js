const Notification = require('../models/Notification');
const User = require('../models/User');
const Job = require('../models/Job');
const Application = require('../models/Application');
const Message = require('../models/Message');

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

// Create job match notification (IMPROVED MATCHING LOGIC)
exports.createJobMatchNotification = async (jobseekerId, job) => {
  try {
    const user = await User.findById(jobseekerId);
    if (!user || !user.jobSeekerProfile || !user.jobSeekerProfile.skills) return;

    const jobseekerSkills = user.jobSeekerProfile.skills.map(skill => skill.toLowerCase().trim());
    const jobSkills = (job.skillsRequired || []).map(skill => skill.toLowerCase().trim());

    const matchingSkills = [];

    for (const jobseekerSkill of jobseekerSkills) {
      for (const jobSkill of jobSkills) {
        if (jobseekerSkill === jobSkill ||
            jobseekerSkill.includes(jobSkill) ||
            jobSkill.includes(jobseekerSkill)) {
          matchingSkills.push(jobseekerSkill);
          break;
        }
      }
    }

    if (matchingSkills.length === 0) {
      console.log(`No skill match for jobseeker ${jobseekerId} and job ${job.title}`);
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

    let message;
    if (matchingSkills.length > 2) {
      message = `A new job "${job.title}" at ${job.companyName} matches ${matchingSkills.length} of your skills.`;
    } else if (matchingSkills.length > 1) {
      message = `A new job "${job.title}" at ${job.companyName} matches your skills: ${matchingSkills.join(', ')}.`;
    } else {
      message = `A new job "${job.title}" at ${job.companyName} matches your skill: ${matchingSkills[0]}.`;
    }

    const notification = new Notification({
      user: jobseekerId,
      type: 'job_match',
      title: 'New Job Match!',
      message: message,
      relatedId: job._id,
      relatedModel: 'Job',
      link: `/jobseeker/job-details/${job._id}`,
      metadata: {
        jobId: job._id,
        companyName: job.companyName,
        jobTitle: job.title,
        matchingSkills: matchingSkills,
        matchCount: matchingSkills.length
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
            existingNotification.message = `New message from ${sender.fullName || sender.companyName || 'User'}: ${message.content.substring(0, 50)}...`;
            existingNotification.metadata.lastMessage = message.content;
            existingNotification.link = conversationLink;
            await existingNotification.save();
            return existingNotification;
        }

        const notification = new Notification({
            user: receiverId,
            type: 'new_message',
            title: 'New Message',
            message: `New message from ${sender.fullName || sender.companyName || 'User'}: ${message.content.substring(0, 50)}...`,
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