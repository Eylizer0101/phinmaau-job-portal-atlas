const Message = require('../models/Message');
const User = require('../models/User');
const Job = require('../models/Job');
const Application = require('../models/Application');
const ConversationPreference = require('../models/ConversationPreference');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
// ✅ IDINAGDAG: Import notification controller
const notificationController = require('./notificationController');

// Configure storage for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/messages';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only images, PDFs and documents are allowed!'));
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: fileFilter
});

// ✅ DAGDAG: helper to compute full name safely (backend fallback)
const computeFullName = (u) => {
  if (!u) return '';
  const existing = (u.fullName || '').toString().trim();
  if (existing) return existing;

  const first = (u.firstName || '').toString().trim();
  const middle = (u.middleName || '').toString().trim();
  const last = (u.lastName || '').toString().trim();

  const parts = [first, middle, last].filter(Boolean);
  return parts.join(' ').trim();
};

const attachFullName = (u) => {
  if (!u) return u;
  const name = computeFullName(u);
  // attach computed fullName so existing frontend usage works
  u.fullName = name || u.fullName || '';
  return u;
};

const buildConversationId = (userA, userB) => {
  return [userA.toString(), userB.toString()].sort().join('_');
};

const findApplicationBetweenUsers = async (senderId, receiverId, jobId = null, applicationId = null) => {
  const query = {
    $or: [
      { jobseeker: senderId, employer: receiverId },
      { jobseeker: receiverId, employer: senderId }
    ]
  };

  if (jobId) {
    query.job = jobId;
  }

  if (applicationId) {
    query._id = applicationId;
  }

  return Application.findOne(query).sort({ createdAt: -1 });
};

// ✅ NEW RULE:
// 1) Employer can start chat anytime
// 2) Jobseeker cannot send first message
// 3) Jobseeker can only reply once thread already exists
const checkMessagingAccess = async (senderId, receiverId, jobId = null, applicationId = null) => {
  try {
    if (!senderId || !receiverId) {
      return {
        allowed: false,
        reason: 'Sender and receiver are required'
      };
    }

    if (senderId.toString() === receiverId.toString()) {
      return {
        allowed: false,
        reason: 'You cannot message yourself'
      };
    }

    const [senderUser, receiverUser] = await Promise.all([
      User.findById(senderId).select('role fullName firstName middleName lastName email'),
      User.findById(receiverId).select('role fullName firstName middleName lastName email')
    ]);

    if (!senderUser || !receiverUser) {
      return {
        allowed: false,
        reason: 'Sender or receiver not found'
      };
    }

    const application = await findApplicationBetweenUsers(senderId, receiverId, jobId, applicationId);

    if (!application) {
      return {
        allowed: false,
        reason: 'No application found between users'
      };
    }

    const conversationId = buildConversationId(senderId, receiverId);
    const firstMessage = await Message.findOne({ conversationId })
      .sort({ createdAt: 1 })
      .select('sender createdAt');

    // Existing thread = both sides can continue
    if (firstMessage) {
      return {
        allowed: true,
        conversationId,
        application,
        threadExists: true,
        startedByEmployer: true
      };
    }

    // No thread yet: employer lang pwede mauna
    if (senderUser.role === 'employer') {
      return {
        allowed: true,
        conversationId,
        application,
        threadExists: false,
        startedByEmployer: true
      };
    }

    return {
      allowed: false,
      reason: 'Wait for the employer to message you first',
      conversationId,
      application,
      threadExists: false,
      startedByEmployer: false
    };
  } catch (error) {
    console.error('Error checking messaging access:', error);
    return {
      allowed: false,
      reason: 'Server error while checking messaging access'
    };
  }
};

// ✅ SIMPLIFIED SEND MESSAGE FUNCTION
exports.sendMessage = async (req, res) => {
  try {
    const { receiverId, content, messageType, interviewDetails, jobId, applicationId } = req.body;

    // Validate required fields
    if (!receiverId) {
      return res.status(400).json({
        success: false,
        message: 'Receiver ID is required'
      });
    }

    if (!content && !req.file && messageType !== 'interview') {
      return res.status(400).json({
        success: false,
        message: 'Message content or file is required'
      });
    }

    // Check if receiver exists
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: 'Receiver not found'
      });
    }

    // ✅ NEW ACCESS RULE
    const access = await checkMessagingAccess(req.user._id, receiverId, jobId, applicationId);

    if (!access.allowed) {
      return res.status(403).json({
        success: false,
        message: access.reason || 'Messaging is not allowed'
      });
    }

    // Generate conversation ID
    const conversationId = access.conversationId || buildConversationId(req.user._id, receiverId);

    // Create message object
    const messageData = {
      conversationId,
      sender: req.user._id,
      receiver: receiverId,
      content: content || '',
      messageType: messageType || 'text',
      interviewDetails: interviewDetails || {},
      job: jobId || access.application?.job || null,
      application: applicationId || access.application?._id || null
    };

    // If there's a file upload
    if (req.file) {
      console.log('File uploaded:', req.file);

      // Determine file type
      let fileType = 'other';
      const fileExt = path.extname(req.file.originalname).toLowerCase();
      if (['.jpg', '.jpeg', '.png', '.gif'].includes(fileExt)) {
        fileType = 'image';
      } else if (fileExt === '.pdf') {
        fileType = 'pdf';
      } else if (['.doc', '.docx', '.txt'].includes(fileExt)) {
        fileType = 'document';
      }

      // Add file data to message
      messageData.messageType = 'file';
      messageData.content = content || `Sent a ${fileType} file: ${req.file.originalname}`;
      messageData.file = {
        filename: req.file.filename,
        originalName: req.file.originalname,
        fileType: fileType,
        fileUrl: `/uploads/messages/${req.file.filename}`,
        fileSize: req.file.size
      };
    }

    // Create and save message
    const message = new Message(messageData);
    await message.save();

    // Populate sender details
    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'fullName firstName middleName lastName email profileImage role employerProfile.companyName employerProfile.companyLogo')
      .populate('receiver', 'fullName firstName middleName lastName email profileImage role employerProfile.companyName employerProfile.companyLogo');

    // ✅ attach computed fullName fallback
    if (populatedMessage?.sender) attachFullName(populatedMessage.sender);
    if (populatedMessage?.receiver) attachFullName(populatedMessage.receiver);

    // ✅ FIX: use FINAL message type (messageData.messageType), not req.body messageType
    const finalMessageType = messageData.messageType;

    // ✅ IDINAGDAG: Create notification for receiver (exclude interview + notification)
    if (finalMessageType !== 'interview' && finalMessageType !== 'notification') {
      await notificationController.createMessageNotification(
        req.user._id,
        receiverId,
        message
      );
    }

    // ✅ (optional) if someone sends interview via /send route (not typical), support it
    if (finalMessageType === 'interview' && messageData.interviewDetails) {
      await notificationController.createInterviewNotification(
        receiverId,
        messageData.interviewDetails
      );
    }

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: populatedMessage
    });

  } catch (error) {
    console.error('Error sending message:', error);

    // Delete uploaded file if error occurred
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      message: 'Error sending message'
    });
  }
};

// ✅ UPLOAD FILE
exports.uploadFile = (req, res) => {
  const uploadSingle = upload.single('file');

  uploadSingle(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    try {
      const fileExt = path.extname(req.file.originalname).toLowerCase();
      let fileType = 'other';

      if (['.jpg', '.jpeg', '.png', '.gif'].includes(fileExt)) {
        fileType = 'image';
      } else if (fileExt === '.pdf') {
        fileType = 'pdf';
      } else if (['.doc', '.docx', '.txt'].includes(fileExt)) {
        fileType = 'document';
      }

      res.status(200).json({
        success: true,
        message: 'File uploaded successfully',
        data: {
          filename: req.file.filename,
          originalName: req.file.originalname,
          fileType: fileType,
          fileUrl: `/uploads/messages/${req.file.filename}`,
          fileSize: req.file.size
        }
      });
    } catch (error) {
      console.error('Error processing file upload:', error);
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({
        success: false,
        message: 'Error processing file upload'
      });
    }
  });
};

// ✅ GET FILE
exports.getFile = async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '../uploads/messages', filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    res.sendFile(filePath);
  } catch (error) {
    console.error('Error getting file:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting file'
    });
  }
};

// ✅ GET CONVERSATIONS LIST
exports.getConversations = async (req, res) => {
  try {
    const userId = req.user._id;
    const view = String(req.query.view || 'active').toLowerCase();

    // Get distinct conversations where user is either sender or receiver
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [
            { sender: userId },
            { receiver: userId }
          ]
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: "$conversationId",
          lastMessage: { $first: "$$ROOT" },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$receiver", userId] },
                    { $eq: ["$isRead", false] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'lastMessage.sender',
          foreignField: '_id',
          as: 'senderDetails'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'lastMessage.receiver',
          foreignField: '_id',
          as: 'receiverDetails'
        }
      },
      {
        $addFields: {
          otherUser: {
            $cond: [
              { $eq: [{ $arrayElemAt: ["$senderDetails._id", 0] }, userId] },
              { $arrayElemAt: ["$receiverDetails", 0] },
              { $arrayElemAt: ["$senderDetails", 0] }
            ]
          }
        }
      },

      // ✅ ADD: compute fullName fallback from first/middle/last (if fullName missing)
      {
        $addFields: {
          otherUserComputedFullName: {
            $let: {
              vars: {
                existing: { $ifNull: ["$otherUser.fullName", ""] },
                first: { $ifNull: ["$otherUser.firstName", ""] },
                middle: { $ifNull: ["$otherUser.middleName", ""] },
                last: { $ifNull: ["$otherUser.lastName", ""] }
              },
              in: {
                $cond: [
                  { $gt: [{ $strLenCP: { $trim: { input: "$$existing" } } }, 0] },
                  { $trim: { input: "$$existing" } },
                  {
                    $trim: {
                      input: {
                        $reduce: {
                          input: ["$$first", "$$middle", "$$last"],
                          initialValue: "",
                          in: {
                            $cond: [
                              { $gt: [{ $strLenCP: { $trim: { input: "$$this" } } }, 0] },
                              {
                                $concat: [
                                  "$$value",
                                  { $cond: [{ $gt: [{ $strLenCP: "$$value" }, 0] }, " ", ""] },
                                  { $trim: { input: "$$this" } }
                                ]
                              },
                              "$$value"
                            ]
                          }
                        }
                      }
                    }
                  }
                ]
              }
            }
          }
        }
      },

      {
        $project: {
          _id: 1,
          lastMessage: 1,
          unreadCount: 1,
          otherUser: {
            _id: "$otherUser._id",

            // ✅ fullName ALWAYS present now (computed fallback)
            fullName: "$otherUserComputedFullName",

            // ✅ ADD: names + email so frontend can build too
            firstName: "$otherUser.firstName",
            middleName: "$otherUser.middleName",
            lastName: "$otherUser.lastName",
            email: "$otherUser.email",

            profileImage: "$otherUser.profileImage",
            role: "$otherUser.role",

            // ✅ KEEP OLD FIELD (para di masira existing frontend usage)
            companyName: "$otherUser.employerProfile.companyName",

            // ✅ FIX: include employerProfile with companyLogo
            employerProfile: {
              companyName: "$otherUser.employerProfile.companyName",
              companyLogo: "$otherUser.employerProfile.companyLogo"
            },

            // ✅ OPTIONAL: add top-level companyLogo too (extra safe for frontend)
            companyLogo: "$otherUser.employerProfile.companyLogo"
          },
          lastMessageTime: "$lastMessage.createdAt"
        }
      },
      {
        $sort: { lastMessageTime: -1 }
      }
    ]);

    const preferences = await ConversationPreference.find({
      user: userId,
      conversationId: { $in: conversations.map((conversation) => conversation._id) },
    }).lean();

    const preferenceMap = new Map(preferences.map((preference) => [preference.conversationId, preference]));
    const visibleConversations = conversations.filter((conversation) => {
      const preference = preferenceMap.get(conversation._id);

      if (view === 'archived') {
        return preference?.archived === true && preference?.deleted !== true;
      }

      return !preference?.archived && !preference?.hiddenCompany && !preference?.deleted;
    });

    res.status(200).json({
      success: true,
      count: visibleConversations.length,
      data: visibleConversations
    });

  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching conversations'
    });
  }
};

// ✅ GET MESSAGES FOR A CONVERSATION
exports.getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;

    // Verify user is part of the conversation
    const participants = conversationId.split('_');
    if (!participants.includes(userId.toString())) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this conversation'
      });
    }

    // Get messages
    const messages = await Message.find({ conversationId })
      .populate('sender', 'fullName firstName middleName lastName email profileImage role employerProfile.companyName employerProfile.companyLogo')
      .populate('receiver', 'fullName firstName middleName lastName email profileImage role employerProfile.companyName employerProfile.companyLogo')
      .populate('job', 'title companyName')
      .populate('application')
      .sort({ createdAt: 1 });

    // Mark messages as read
    await Message.updateMany(
      {
        conversationId,
        receiver: userId,
        isRead: false
      },
      {
        $set: { isRead: true, readAt: Date.now() }
      }
    );

    // ✅ Attach computed names and ensure interview messages expose
    // the latest saved Google Meet link from the related application.
    const safeMessages = (messages || []).map((messageDoc) => {
      if (messageDoc?.sender) attachFullName(messageDoc.sender);
      if (messageDoc?.receiver) attachFullName(messageDoc.receiver);

      const message = messageDoc.toObject();
      const savedApplicationMeetingLink =
        message?.application?.interviewSchedule?.meetingLink || '';
      const messageMeetingLink =
        message?.interviewDetails?.meetingLink || '';

      if (
        message.messageType === 'interview' &&
        !messageMeetingLink &&
        savedApplicationMeetingLink
      ) {
        message.interviewDetails = {
          ...(message.interviewDetails || {}),
          meetingLink: savedApplicationMeetingLink,
        };
      }

      return message;
    });

    res.status(200).json({
      success: true,
      count: safeMessages.length,
      data: safeMessages
    });

  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching messages'
    });
  }
};

// ✅ GET UNREAD MESSAGE COUNT
exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user._id;

    const unreadCount = await Message.countDocuments({
      receiver: userId,
      isRead: false
    });

    res.status(200).json({
      success: true,
      data: { unreadCount }
    });

  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching unread count'
    });
  }
};

// ✅ MARK MESSAGES AS READ
exports.markAsRead = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;

    await Message.updateMany(
      {
        conversationId,
        receiver: userId,
        isRead: false
      },
      {
        $set: { isRead: true, readAt: Date.now() }
      }
    );

    res.status(200).json({
      success: true,
      message: 'Messages marked as read'
    });

  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking messages as read'
    });
  }
};

// ✅ GET JOBSEEKERS FOR EMPLOYER (Only jobseekers who have applied to employer's jobs)
exports.getJobseekersForEmployer = async (req, res) => {
  try {
    const employerId = req.user._id;

    // Get jobseekers who have applied to employer's jobs
    const jobseekers = await Application.aggregate([
      {
        $lookup: {
          from: 'jobs',
          localField: 'job',
          foreignField: '_id',
          as: 'jobDetails'
        }
      },
      {
        $unwind: '$jobDetails'
      },
      {
        $match: {
          'jobDetails.employer': employerId
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'jobseeker',
          foreignField: '_id',
          as: 'jobseekerDetails'
        }
      },
      {
        $unwind: '$jobseekerDetails'
      },
      {
        $group: {
          _id: '$jobseeker',
          jobseeker: { $first: '$jobseekerDetails' },
          jobsApplied: { $addToSet: '$jobDetails.title' },
          lastApplicationDate: { $max: '$appliedAt' }
        }
      },

      // ✅ ADD: compute jobseeker.fullName fallback
      {
        $addFields: {
          jobseekerComputedFullName: {
            $let: {
              vars: {
                existing: { $ifNull: ["$jobseeker.fullName", ""] },
                first: { $ifNull: ["$jobseeker.firstName", ""] },
                middle: { $ifNull: ["$jobseeker.middleName", ""] },
                last: { $ifNull: ["$jobseeker.lastName", ""] }
              },
              in: {
                $cond: [
                  { $gt: [{ $strLenCP: { $trim: { input: "$$existing" } } }, 0] },
                  { $trim: { input: "$$existing" } },
                  {
                    $trim: {
                      input: {
                        $reduce: {
                          input: ["$$first", "$$middle", "$$last"],
                          initialValue: "",
                          in: {
                            $cond: [
                              { $gt: [{ $strLenCP: { $trim: { input: "$$this" } } }, 0] },
                              {
                                $concat: [
                                  "$$value",
                                  { $cond: [{ $gt: [{ $strLenCP: "$$value" }, 0] }, " ", ""] },
                                  { $trim: { input: "$$this" } }
                                ]
                              },
                              "$$value"
                            ]
                          }
                        }
                      }
                    }
                  }
                ]
              }
            }
          }
        }
      },

      {
        $project: {
          _id: 1,
          'jobseeker._id': 1,

          // ✅ ensure frontend gets jobseeker.fullName
          'jobseeker.fullName': '$jobseekerComputedFullName',

          // ✅ also send components
          'jobseeker.firstName': 1,
          'jobseeker.middleName': 1,
          'jobseeker.lastName': 1,

          'jobseeker.profileImage': 1,
          'jobseeker.email': 1,
          'jobseeker.jobSeekerProfile.skills': 1,
          jobsApplied: 1,
          lastApplicationDate: 1
        }
      },
      {
        $sort: { lastApplicationDate: -1 }
      }
    ]);

    res.status(200).json({
      success: true,
      count: jobseekers.length,
      data: jobseekers
    });

  } catch (error) {
    console.error('Error fetching jobseekers:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching jobseekers'
    });
  }
};

// ✅ GET EMPLOYERS FOR JOBSEEKER (Only employers whose jobs jobseeker has applied to)
exports.getEmployersForJobseeker = async (req, res) => {
  try {
    const jobseekerId = req.user._id;

    // Get employers whose jobs jobseeker has applied to
    const employers = await Application.aggregate([
      {
        $match: { jobseeker: jobseekerId }
      },
      {
        $lookup: {
          from: 'jobs',
          localField: 'job',
          foreignField: '_id',
          as: 'jobDetails'
        }
      },
      {
        $unwind: '$jobDetails'
      },
      {
        $lookup: {
          from: 'users',
          localField: 'jobDetails.employer',
          foreignField: '_id',
          as: 'employerDetails'
        }
      },
      {
        $unwind: '$employerDetails'
      },
      {
        $group: {
          _id: '$employerDetails._id',
          employer: { $first: '$employerDetails' },
          jobsApplied: { $addToSet: '$jobDetails.title' },
          lastApplicationDate: { $max: '$appliedAt' }
        }
      },

      // ✅ ADD: compute employer.fullName fallback
      {
        $addFields: {
          employerComputedFullName: {
            $let: {
              vars: {
                existing: { $ifNull: ["$employer.fullName", ""] },
                first: { $ifNull: ["$employer.firstName", ""] },
                middle: { $ifNull: ["$employer.middleName", ""] },
                last: { $ifNull: ["$employer.lastName", ""] }
              },
              in: {
                $cond: [
                  { $gt: [{ $strLenCP: { $trim: { input: "$$existing" } } }, 0] },
                  { $trim: { input: "$$existing" } },
                  {
                    $trim: {
                      input: {
                        $reduce: {
                          input: ["$$first", "$$middle", "$$last"],
                          initialValue: "",
                          in: {
                            $cond: [
                              { $gt: [{ $strLenCP: { $trim: { input: "$$this" } } }, 0] },
                              {
                                $concat: [
                                  "$$value",
                                  { $cond: [{ $gt: [{ $strLenCP: "$$value" }, 0] }, " ", ""] },
                                  { $trim: { input: "$$this" } }
                                ]
                              },
                              "$$value"
                            ]
                          }
                        }
                      }
                    }
                  }
                ]
              }
            }
          }
        }
      },

      {
        $project: {
          _id: 1,
          'employer._id': 1,

          // ✅ ensure frontend gets employer.fullName
          'employer.fullName': '$employerComputedFullName',

          'employer.firstName': 1,
          'employer.middleName': 1,
          'employer.lastName': 1,

          'employer.profileImage': 1,
          'employer.email': 1,
          'employer.employerProfile.companyName': 1,
          'employer.employerProfile.companyLogo': 1,
          jobsApplied: 1,
          lastApplicationDate: 1
        }
      },
      {
        $sort: { lastApplicationDate: -1 }
      }
    ]);

    res.status(200).json({
      success: true,
      count: employers.length,
      data: employers
    });

  } catch (error) {
    console.error('Error fetching employers:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching employers'
    });
  }
};

// ✅ SCHEDULE INTERVIEW
exports.scheduleInterview = async (req, res) => {
  try {
    const { receiverId, jobId, applicationId, interviewDetails } = req.body;

    if (!receiverId || !interviewDetails) {
      return res.status(400).json({
        success: false,
        message: 'Receiver ID and interview details are required'
      });
    }

    if (req.user.role !== 'employer') {
      return res.status(403).json({
        success: false,
        message: 'Only employers can schedule interviews'
      });
    }

    // ✅ NEW ACCESS RULE
    const access = await checkMessagingAccess(req.user._id, receiverId, jobId, applicationId);

    if (!access.allowed) {
      return res.status(403).json({
        success: false,
        message: access.reason || 'Cannot schedule interview'
      });
    }

    const conversationId = access.conversationId || buildConversationId(req.user._id, receiverId);

    const message = new Message({
      conversationId,
      sender: req.user._id,
      receiver: receiverId,
      content: `Interview Scheduled: ${interviewDetails.date} at ${interviewDetails.time}`,
      messageType: 'interview',
      interviewDetails,
      job: jobId || access.application?.job || null,
      application: applicationId || access.application?._id || null
    });

    await message.save();

    // ✅ IDINAGDAG: Create interview notification
    await notificationController.createInterviewNotification(
      receiverId,
      interviewDetails
    );

    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'fullName firstName middleName lastName email profileImage role')
      .populate('receiver', 'fullName firstName middleName lastName email profileImage role')
      .populate('job', 'title companyName');

    // ✅ attach computed fullName fallback
    if (populatedMessage?.sender) attachFullName(populatedMessage.sender);
    if (populatedMessage?.receiver) attachFullName(populatedMessage.receiver);

    res.status(201).json({
      success: true,
      message: 'Interview scheduled successfully',
      data: populatedMessage
    });

  } catch (error) {
    console.error('Error scheduling interview:', error);
    res.status(500).json({
      success: false,
      message: 'Error scheduling interview'
    });
  }
};

// ✅ NEW: GET INTERVIEWS COUNT (NEXT N DAYS) — used by dashboard
exports.getInterviewsCount = async (req, res) => {
  try {
    const userId = req.user._id;

    const days = Number(req.query.days || 7);
    const safeDays = Number.isFinite(days) && days > 0 ? days : 7;

    const now = new Date();
    const end = new Date(now.getTime() + safeDays * 24 * 60 * 60 * 1000);

    const count = await Message.countDocuments({
      messageType: 'interview',
      $or: [{ sender: userId }, { receiver: userId }],
      'interviewDetails.date': { $gte: now, $lte: end }
    });

    res.status(200).json({
      success: true,
      data: { count }
    });
  } catch (error) {
    console.error('Error fetching interviews count:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching interviews count'
    });
  }
};

// Archive, unarchive, hide, or delete one or more conversations for the current user.
exports.updateConversationAction = async (req, res) => {
  try {
    const action = String(req.body.action || '').toLowerCase();
    const conversationIds = Array.isArray(req.body.conversationIds)
      ? [...new Set(req.body.conversationIds.map((id) => String(id).trim()).filter(Boolean))]
      : [];

    if (!['archive', 'unarchive', 'hide', 'delete'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Invalid conversation action' });
    }
    if (!conversationIds.length) {
      return res.status(400).json({ success: false, message: 'Select at least one conversation' });
    }

    const userId = req.user._id;
    for (const conversationId of conversationIds) {
      const participants = conversationId.split('_');
      if (!participants.includes(userId.toString())) {
        return res.status(403).json({ success: false, message: 'Not authorized for one or more conversations' });
      }

      const otherUserId = participants.find((id) => id !== userId.toString()) || null;
      const update = { otherUser: otherUserId };
      if (action === 'archive') {
        update.archived = true;
        update.hiddenCompany = false;
        update.deleted = false;
      }
      if (action === 'unarchive') {
        update.archived = false;
        update.hiddenCompany = false;
        update.deleted = false;
      }
      if (action === 'hide') update.hiddenCompany = true;
      if (action === 'delete') update.deleted = true;

      await ConversationPreference.findOneAndUpdate(
        { user: userId, conversationId },
        { $set: update },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    res.json({ success: true, message: `Conversation action '${action}' completed` });
  } catch (error) {
    console.error('Error updating conversation action:', error);
    res.status(500).json({ success: false, message: 'Error updating conversations' });
  }
};
