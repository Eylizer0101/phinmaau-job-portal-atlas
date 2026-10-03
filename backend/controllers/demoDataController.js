const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const Job = require('../models/Job');
const Application = require('../models/Application');
const JobEditRequest = require('../models/JobEditRequest');
const Notification = require('../models/Notification');
const SystemLog = require('../models/SystemLog');
const CommunityPost = require('../models/CommunityPost');
const Message = require('../models/Message');
const ConversationPreference = require('../models/ConversationPreference');
const PendingEmailVerification = require('../models/PendingEmailVerification');

const DEMO_EMAIL_DOMAIN = 'agapay-demo.invalid';
const DEMO_EMAIL_REGEX = new RegExp(`@${DEMO_EMAIL_DOMAIN.replace('.', '\\.')}$`, 'i');
const DEMO_PASSWORD = 'AgapayDemo#2026';

const firstNames = [
  'Adrian', 'Alyssa', 'Angela', 'Bianca', 'Carlo', 'Christian', 'Daniel', 'Denise', 'Elaine', 'Erica',
  'Francis', 'Gabriel', 'Hannah', 'Janine', 'Jerome', 'Joshua', 'Katrina', 'Kenneth', 'Kristine', 'Lance',
  'Leah', 'Marco', 'Marian', 'Miguel', 'Nicole', 'Paolo', 'Patricia', 'Rafael', 'Rica', 'Samuel',
  'Sophia', 'Trisha', 'Vincent', 'Yanna', 'Zachary', 'Clarisse', 'Dominic', 'Faith', 'Gian', 'Hazel',
];

const lastNames = [
  'Aguilar', 'Bautista', 'Castillo', 'Cruz', 'Del Rosario', 'Diaz', 'Domingo', 'Fernandez', 'Flores', 'Garcia',
  'Gonzales', 'Hernandez', 'Lim', 'Lopez', 'Mendoza', 'Navarro', 'Ocampo', 'Pascual', 'Reyes', 'Rivera',
  'Santos', 'Soriano', 'Tan', 'Torres', 'Valdez', 'Villanueva', 'Aquino', 'Bernardo', 'Cabrera', 'Dela Peña',
];

const companies = [
  ['Northfield Logistics Inc.', 'Logistics & Supply Chain'],
  ['BrightPath Solutions Corp.', 'Information Technology'],
  ['Nueva Ecija Prime Foods', 'Food Manufacturing'],
  ['Central Plains Medical Center', 'Healthcare'],
  ['Vertex Business Services', 'Business Process Outsourcing'],
  ['Harborline Retail Group', 'Retail'],
  ['Greenstone Construction Services', 'Construction'],
  ['Suncrest Hospitality Group', 'Hospitality'],
  ['BluePeak Financial Services', 'Financial Services'],
  ['Everlink Communications', 'Telecommunications'],
  ['Cabanatuan Digital Works', 'Information Technology'],
  ['Golden Harvest Agri Ventures', 'Agriculture'],
  ['MetroCore Property Management', 'Real Estate'],
  ['PrimeAxis Accounting Services', 'Accounting'],
  ['SilverOak Learning Center', 'Education'],
  ['New Horizon Consumer Goods', 'Consumer Goods'],
  ['Lakeside Pharmacy Network', 'Healthcare'],
  ['Pioneer Auto Services', 'Automotive'],
  ['Crestline Engineering Works', 'Engineering'],
  ['Pacific Ridge Distribution', 'Wholesale & Distribution'],
  ['Apex Community Bank', 'Banking'],
  ['CloudBridge Technology Services', 'Information Technology'],
  ['FirstChoice Human Resources', 'Human Resources'],
  ['CitySquare Merchandising', 'Retail'],
  ['Momentum Marketing Studio', 'Marketing & Advertising'],
  ['Eastgate Manufacturing Corp.', 'Manufacturing'],
  ['Cedarline Hotel and Events', 'Hospitality'],
  ['Progressive Health Diagnostics', 'Healthcare'],
  ['Workwell Office Solutions', 'Business Services'],
  ['Summitline Trading Corporation', 'Trading'],
];

const jobTemplates = [
  ['Software Developer', 'Information Technology', ['JavaScript', 'React', 'Node.js']],
  ['Technical Support Specialist', 'Information Technology', ['Troubleshooting', 'Networking', 'Customer Support']],
  ['Accounting Assistant', 'Accounting', ['Bookkeeping', 'Microsoft Excel', 'Financial Reporting']],
  ['Human Resources Assistant', 'Human Resources', ['Recruitment', 'Employee Relations', 'Microsoft Office']],
  ['Marketing Associate', 'Marketing', ['Social Media', 'Content Writing', 'Market Research']],
  ['Sales Representative', 'Sales', ['Communication', 'Negotiation', 'Customer Service']],
  ['Administrative Assistant', 'Administration', ['Microsoft Office', 'Documentation', 'Scheduling']],
  ['Customer Service Representative', 'Customer Service', ['Communication', 'Problem Solving', 'Customer Support']],
  ['Warehouse Coordinator', 'Logistics', ['Inventory Management', 'Documentation', 'Coordination']],
  ['Operations Assistant', 'Operations', ['Process Improvement', 'Documentation', 'Coordination']],
  ['Junior Graphic Designer', 'Creative Services', ['Graphic Design', 'Canva', 'Adobe Photoshop']],
  ['Recruitment Associate', 'Human Resources', ['Recruitment', 'Interviewing', 'Documentation']],
  ['Finance Associate', 'Financial Services', ['Financial Analysis', 'Microsoft Excel', 'Reporting']],
  ['Front Desk Associate', 'Hospitality', ['Customer Service', 'Communication', 'Scheduling']],
  ['Quality Assurance Assistant', 'Manufacturing', ['Quality Control', 'Documentation', 'Attention to Detail']],
];

const campuses = ['AU Main', 'AU San Jose', 'AU South'];
const courses = [
  'BS Information Technology',
  'BS Business Administration',
  'BS Accountancy',
  'BS Hospitality Management',
  'BS Criminology',
  'Bachelor of Secondary Education',
];
const workModes = ['On-site', 'Remote', 'Blended', 'Work from Home'];
const jobTypes = ['Full-time', 'Part-time', 'Contractual', 'Permanent'];
const experienceLevels = ['No experience required', 'Less than 1 Yr Exp', '1-3 Years Exp', '4-5 Years Exp'];
const educationLevels = ["Bachelor’s / College degree graduate's", 'Master’s degree'];

const pick = (items, index) => items[index % items.length];
const pad = (value, length = 2) => String(value).padStart(length, '0');
const cleanName = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '');
const demoImage = (seed, style = 'initials') => `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}`;
const makeLongText = (sentence, minimum = 560) => {
  let text = '';
  while (text.length < minimum) text += `${sentence} `;
  return text.trim().slice(0, 1200);
};

const daysAgo = (days, hour = 9, minute = 0) => {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  date.setDate(date.getDate() - days);
  return date;
};

const distributedDate = (index) => {
  const offsets = [0, 1, 2, 4, 6, 8, 10, 13, 18, 24, 32, 45, 60, 90, 125, 170, 220, 285, 345, 380, 430, 500, 575];
  const offset = offsets[index % offsets.length] + Math.floor(index / offsets.length) * 3;
  return daysAgo(offset, 8 + (index % 9), (index * 7) % 60);
};

const buildVerificationDocument = (kind, ownerIndex, status, uploadedAt) => ({
  url: `https://example.com/agapay-demo/${kind}-${ownerIndex}.pdf`,
  status,
  uploadedAt,
  filename: `${kind}-${ownerIndex}.pdf`,
  fileSize: 150000 + ownerIndex * 137,
  mimeType: 'application/pdf',
  checked: ['approved', 'rejected'].includes(status),
  checkedAt: ['approved', 'rejected'].includes(status) ? uploadedAt : null,
});

const employerDocsFor = (overallStatus, index, createdAt) => {
  const docStatus = overallStatus === 'verified'
    ? 'approved'
    : overallStatus === 'rejected'
      ? 'rejected'
      : overallStatus === 'hold'
        ? 'hold'
        : 'pending';
  const base = {
    secRegistration: buildVerificationDocument('sec', index, docStatus, createdAt),
    birRegistration: buildVerificationDocument('bir', index, docStatus, createdAt),
    dtiRegistration: buildVerificationDocument('dti', index, docStatus, createdAt),
    cityPermit: buildVerificationDocument('city', index, docStatus, createdAt),
    businessPermit: buildVerificationDocument('business', index, docStatus, createdAt),
    overallStatus,
    remarks: overallStatus === 'hold' ? 'One or more documents require clearer supporting copies.' : '',
    rejectionReasons: overallStatus === 'rejected' ? ['Organization could not be verified as a legitimate company'] : [],
    rejectionMessage: overallStatus === 'rejected' ? 'Please submit updated and verifiable company registration documents.' : '',
    rejectedAt: overallStatus === 'rejected' ? createdAt : null,
  };
  return base;
};

const jobseekerDocsFor = (overallStatus, index, createdAt) => {
  if (overallStatus === 'not_submitted') return { overallStatus };
  const docStatus = overallStatus === 'verified'
    ? 'approved'
    : overallStatus === 'rejected'
      ? 'rejected'
      : overallStatus === 'hold'
        ? 'hold'
        : 'pending';
  const result = { overallStatus };
  ['cv', 'tor', 'diploma', 'sss', 'philhealth', 'pagibig', 'tin', 'validId'].forEach((key) => {
    result[key] = buildVerificationDocument(key, index, docStatus, createdAt);
  });
  result.rejectionReasons = overallStatus === 'rejected' ? ['Document information could not be verified'] : [];
  result.rejectionMessage = overallStatus === 'rejected' ? 'Please resubmit clear and valid supporting documents.' : '';
  result.rejectedAt = overallStatus === 'rejected' ? createdAt : null;
  return result;
};

const getDemoUsers = () => User.find({ email: DEMO_EMAIL_REGEX }).select('_id role email').lean();

const getDemoScope = async () => {
  const users = await getDemoUsers();
  const userIds = users.map((item) => item._id);
  const employerIds = users.filter((item) => item.role === 'employer').map((item) => item._id);
  const jobseekerIds = users.filter((item) => item.role === 'jobseeker').map((item) => item._id);
  const jobs = employerIds.length ? await Job.find({ employer: { $in: employerIds } }).select('_id').lean() : [];
  const jobIds = jobs.map((item) => item._id);
  const applications = (jobIds.length || userIds.length)
    ? await Application.find({
        $or: [
          ...(jobIds.length ? [{ job: { $in: jobIds } }] : []),
          ...(jobseekerIds.length ? [{ jobseeker: { $in: jobseekerIds } }] : []),
          ...(employerIds.length ? [{ employer: { $in: employerIds } }] : []),
        ],
      }).select('_id').lean()
    : [];
  return { users, userIds, employerIds, jobseekerIds, jobIds, applicationIds: applications.map((item) => item._id) };
};

const getDemoCounts = async (scope = null) => {
  const current = scope || await getDemoScope();
  const { userIds, employerIds, jobseekerIds, jobIds, applicationIds } = current;
  const [editRequests, messages, notifications, posts, preferences, logs, pendingEmailRequests] = await Promise.all([
    jobIds.length || employerIds.length ? JobEditRequest.countDocuments({ $or: [{ job: { $in: jobIds } }, { employer: { $in: employerIds } }] }) : 0,
    userIds.length ? Message.countDocuments({ $or: [{ sender: { $in: userIds } }, { receiver: { $in: userIds } }] }) : 0,
    userIds.length || applicationIds.length || jobIds.length ? Notification.countDocuments({
      $or: [
        ...(userIds.length ? [{ user: { $in: userIds } }] : []),
        ...(applicationIds.length ? [{ relatedId: { $in: applicationIds } }] : []),
        ...(jobIds.length ? [{ relatedId: { $in: jobIds } }] : []),
      ],
    }) : 0,
    userIds.length ? CommunityPost.countDocuments({ author: { $in: userIds } }) : 0,
    userIds.length ? ConversationPreference.countDocuments({ $or: [{ user: { $in: userIds } }, { otherUser: { $in: userIds } }] }) : 0,
    SystemLog.countDocuments({ $or: [{ 'metadata.demoData': true }, ...(userIds.length ? [{ actor: { $in: userIds } }] : [])] }),
    PendingEmailVerification.countDocuments({ email: DEMO_EMAIL_REGEX }),
  ]);

  return {
    users: current.users.length,
    employers: employerIds.length,
    jobseekers: jobseekerIds.length,
    jobs: jobIds.length,
    applications: applicationIds.length,
    editRequests,
    messages,
    notifications,
    communityPosts: posts,
    conversationPreferences: preferences,
    systemLogs: logs,
    pendingEmailRequests,
  };
};

const removeDemoData = async () => {
  const scope = await getDemoScope();
  const { userIds, employerIds, jobseekerIds, jobIds, applicationIds } = scope;

  await Promise.all([
    JobEditRequest.deleteMany({ $or: [{ job: { $in: jobIds } }, { employer: { $in: employerIds } }] }),
    Message.deleteMany({ $or: [{ sender: { $in: userIds } }, { receiver: { $in: userIds } }] }),
    Notification.deleteMany({
      $or: [
        { user: { $in: userIds } },
        { relatedId: { $in: applicationIds } },
        { relatedId: { $in: jobIds } },
      ],
    }),
    CommunityPost.deleteMany({ author: { $in: userIds } }),
    ConversationPreference.deleteMany({ $or: [{ user: { $in: userIds } }, { otherUser: { $in: userIds } }] }),
    PendingEmailVerification.deleteMany({ email: DEMO_EMAIL_REGEX }),
    SystemLog.deleteMany({ $or: [{ 'metadata.demoData': true }, { actor: { $in: userIds } }] }),
  ]);

  await Application.deleteMany({
    $or: [
      { _id: { $in: applicationIds } },
      { job: { $in: jobIds } },
      { jobseeker: { $in: jobseekerIds } },
      { employer: { $in: employerIds } },
    ],
  });
  await Job.deleteMany({ _id: { $in: jobIds } });
  await User.deleteMany({ _id: { $in: userIds } });

  return scope;
};

const nextDemoPhones = async (count) => {
  const existingUsers = await User.find({
    $or: [
      { registrationContactNumber: { $exists: true, $ne: '' } },
      { 'jobSeekerProfile.phoneNumber': { $exists: true, $ne: '' } },
      { 'employerProfile.mobileNumber': { $exists: true, $ne: '' } },
    ],
  }).select('registrationContactNumber jobSeekerProfile.phoneNumber employerProfile.mobileNumber').lean();
  const used = new Set();
  existingUsers.forEach((user) => {
    [user.registrationContactNumber, user.jobSeekerProfile?.phoneNumber, user.employerProfile?.mobileNumber]
      .filter(Boolean)
      .forEach((value) => used.add(String(value)));
  });

  const phones = [];
  let cursor = 0;
  while (phones.length < count && cursor < 10000000) {
    const phone = `0998${pad(cursor, 7)}`;
    cursor += 1;
    if (!used.has(phone)) {
      used.add(phone);
      phones.push(phone);
    }
  }
  if (phones.length < count) throw new Error('Unable to allocate unique demo contact numbers.');
  return phones;
};

const injectDemoData = async () => {
  const batchId = `agapay-demo-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
  const employerCount = 30;
  const jobseekerCount = 140;
  const phones = await nextDemoPhones(employerCount + jobseekerCount);
  const password = await bcrypt.hash(DEMO_PASSWORD, 10);

  const employers = [];
  for (let index = 0; index < employerCount; index += 1) {
    const [companyName, industry] = companies[index];
    const createdAt = distributedDate(index + 5);
    const overallStatus = pick(['verified', 'verified', 'verified', 'pending', 'pending', 'hold', 'rejected', 'unverified'], index);
    const contactFirst = pick(firstNames, index + 3);
    const contactLast = pick(lastNames, index + 7);
    const slug = cleanName(companyName);
    employers.push({
      username: `demo_${slug.replace(/\./g, '_')}_${index + 1}`.slice(0, 60),
      email: `${slug}.${index + 1}@${DEMO_EMAIL_DOMAIN}`,
      registrationContactNumber: phones[index],
      password,
      role: 'employer',
      firstName: contactFirst,
      middleName: '',
      lastName: contactLast,
      profileImage: demoImage(`${contactFirst} ${contactLast}`, 'personas'),
      isActive: overallStatus === 'verified',
      status: overallStatus === 'verified' ? 'active' : 'pending',
      isVerified: overallStatus === 'verified',
      lastLogin: overallStatus === 'verified' ? daysAgo(index % 45) : null,
      createdAt,
      updatedAt: createdAt,
      settingsVerification: {
        emailVerified: overallStatus === 'verified',
        phoneVerified: overallStatus === 'verified',
      },
      employerProfile: {
        companyName,
        companyWebsiteUrl: `https://www.${slug.replace(/\./g, '')}.example.com`,
        businessEmail: `careers.${index + 1}@${DEMO_EMAIL_DOMAIN}`,
        mobileNumber: phones[index],
        regionCity: `${pick(['Cabanatuan City, Nueva Ecija', 'San Jose City, Nueva Ecija', 'Gapan City, Nueva Ecija', 'Palayan City, Nueva Ecija'], index)}`,
        industry,
        position: pick(['HR Manager', 'Recruitment Officer', 'Talent Acquisition Specialist', 'Operations Manager'], index),
        companyAddress: pick([
          'Maharlika Highway, Cabanatuan City',
          'General Tinio Street, Cabanatuan City',
          'Rizal Street, San Jose City',
          'National Highway, Gapan City',
        ], index),
        companyDescription: makeLongText(`${companyName} is a growing organization that provides reliable services, supports local employment, and develops career opportunities for qualified professionals and fresh graduates.`),
        companyLogo: demoImage(companyName, 'initials'),
        coverPhoto: demoImage(`${companyName} cover`, 'shapes'),
        profileVisible: true,
        verificationDocs: employerDocsFor(overallStatus, index + 1, createdAt),
        reviews: [],
      },
    });
  }

  const insertedEmployers = await User.insertMany(employers, { ordered: true });

  const jobseekers = [];
  for (let index = 0; index < jobseekerCount; index += 1) {
    const firstName = pick(firstNames, index + 11);
    const lastName = pick(lastNames, index + 17);
    const createdAt = distributedDate(index);
    const overallStatus = pick(['verified', 'verified', 'verified', 'verified', 'pending', 'pending', 'hold', 'rejected', 'not_submitted'], index);
    const phone = phones[employerCount + index];
    const campus = pick(campuses, index);
    const course = pick(courses, index + Math.floor(index / 7));
    const gradYear = String(2018 + (index % 9));
    const workStart = daysAgo(500 + (index % 400));
    const workEnd = daysAgo(120 + (index % 100));
    jobseekers.push({
      username: `demo_${cleanName(firstName)}_${cleanName(lastName)}_${index + 1}`.replace(/\./g, '_').slice(0, 60),
      email: `${cleanName(firstName)}.${cleanName(lastName)}.${index + 1}@${DEMO_EMAIL_DOMAIN}`,
      registrationContactNumber: phone,
      password,
      role: 'jobseeker',
      firstName,
      middleName: index % 4 === 0 ? pick(['Mae', 'Anne', 'Luis', 'Rey'], index) : '',
      lastName,
      profileImage: demoImage(`${firstName} ${lastName}`, 'personas'),
      isActive: overallStatus === 'verified',
      status: overallStatus === 'verified' ? 'active' : overallStatus === 'rejected' ? 'inactive' : 'pending',
      isVerified: overallStatus === 'verified',
      lastLogin: daysAgo(index % 80),
      createdAt,
      updatedAt: createdAt,
      settingsVerification: {
        emailVerified: overallStatus === 'verified',
        phoneVerified: overallStatus === 'verified',
      },
      jobSeekerProfile: {
        course,
        campus,
        yearGraduated: gradYear,
        preferredWorkMode: pick(workModes, index),
        technicalSkills: pick(['JavaScript, React, Microsoft Office', 'Microsoft Excel, Bookkeeping, Reporting', 'Customer Service, Communication, Sales', 'Graphic Design, Canva, Social Media', 'Recruitment, Documentation, Interviewing'], index),
        softSkills: pick(['Communication, Teamwork, Adaptability', 'Problem Solving, Time Management, Leadership', 'Attention to Detail, Collaboration, Initiative'], index),
        whatHaveYouDone: 'Completed academic projects, internships, and community activities relevant to professional workplace responsibilities.',
        howSoonCanYouStart: pick(['Immediately', 'Within 1 week', 'Within 2 weeks', 'Within 1 month'], index),
        phoneNumber: phone,
        aboutMe: `Motivated ${course} graduate from ${campus} seeking opportunities to apply practical skills, contribute to team goals, and continue professional development.`,
        minimumSalary: String(15000 + (index % 8) * 1000),
        maximumSalary: String(22000 + (index % 10) * 1500),
        address: `${10 + (index % 80)} Demo Street, ${pick(['Cabanatuan City', 'San Jose City', 'Gapan City', 'Palayan City'], index)}, Nueva Ecija, Central Luzon`,
        birthday: `${1995 + (index % 7)}-${pad((index % 12) + 1)}-${pad((index % 27) + 1)}`,
        gender: pick(['Male', 'Female'], index),
        nationality: 'Filipino',
        civilStatus: pick(['Single', 'Single', 'Married'], index),
        preferredLanguage: pick(['English', 'Filipino', 'English and Filipino'], index),
        employmentType: pick(jobTypes, index),
        educationalAttainment: "Bachelor’s Degree",
        willingToRelocate: pick(['Yes - willing to relocate', 'No - position is fixed location', 'Open to relocation if necessary'], index),
        experience: pick(['No experience required', 'Less than 1 Yr Exp', '1-3 Years Exp', '4-5 Years Exp'], index),
        educationEntries: [{
          level: "Bachelor’s Degree",
          educationalAttainment: "Bachelor’s Degree",
          school: 'PHINMA Araullo University',
          campus,
          course,
          startMonth: 'June',
          startYear: String(Number(gradYear) - 4),
          endMonth: 'May',
          endYear: gradYear,
          yearGraduated: gradYear,
        }],
        workExperiences: index % 3 === 0 ? [] : [{
          companyName: pick(['Local Business Services', 'Nueva Ecija Enterprise', 'Community Retail Center', 'Regional Support Office'], index),
          positionTitle: pick(['Intern', 'Office Assistant', 'Service Associate', 'Junior Staff'], index),
          startDate: workStart,
          endDate: workEnd,
          isPresent: false,
          description: 'Supported daily operations, documentation, customer coordination, and team activities while developing practical workplace skills.',
        }],
        verificationDocs: jobseekerDocsFor(overallStatus, index + 1, createdAt),
        verificationStatus: overallStatus,
      },
    });
  }

  const insertedJobseekers = await User.insertMany(jobseekers, { ordered: true });

  const verifiedEmployers = insertedEmployers.filter((item) => item.employerProfile?.verificationDocs?.overallStatus === 'verified');
  const jobDocs = [];
  verifiedEmployers.forEach((employer, employerIndex) => {
    for (let slot = 0; slot < 5; slot += 1) {
      const index = employerIndex * 5 + slot;
      const [title, category, skills] = pick(jobTemplates, index);
      const lifecycle = pick(['open', 'open', 'open', 'filled', 'closed', 'expired'], index);
      const createdAt = distributedDate(index + 2);
      const deadline = lifecycle === 'expired'
        ? daysAgo(8 + (index % 45))
        : new Date(Date.now() + (10 + (index % 50)) * 24 * 60 * 60 * 1000);
      const status = lifecycle === 'filled' ? 'filled' : lifecycle === 'closed' ? 'closed' : 'published';
      const active = lifecycle === 'open';
      jobDocs.push({
        status,
        title,
        description: makeLongText(`${title} will support day-to-day business operations, collaborate with team members, follow established processes, communicate clearly with stakeholders, and deliver accurate work that contributes to the company’s service and growth objectives.`),
        requirements: makeLongText(`Applicants for the ${title} position should demonstrate relevant educational preparation, dependable communication skills, professional work habits, willingness to learn, attention to detail, teamwork, and the ability to complete assigned responsibilities within agreed timelines.`),
        jobType: pick(jobTypes, index),
        educationLevel: pick(educationLevels, index),
        category,
        salaryMin: 15000 + (index % 12) * 1500,
        salaryMax: 23000 + (index % 12) * 2000,
        hideSalary: index % 9 === 0,
        isUrgent: index % 6 === 0,
        location: `${pick(['Maharlika Highway', 'General Tinio Street', 'Rizal Street', 'National Highway'], index)}, ${pick(['Cabanatuan City', 'San Jose City', 'Gapan City', 'Palayan City'], index)}, Nueva Ecija`,
        locationProvince: 'Nueva Ecija',
        locationCity: pick(['Cabanatuan City', 'San Jose City', 'Gapan City', 'Palayan City'], index),
        workMode: pick(workModes, index),
        applicationDeadline: deadline,
        vacancies: lifecycle === 'filled' ? 2 : 3 + (index % 4),
        skillsRequired: skills,
        experienceLevel: pick(experienceLevels, index),
        openToFreshGraduates: index % 2 === 0,
        perksAndBenefits: ['Health insurance', 'Training and development', 'Performance incentives'],
        willingToRelocate: pick(['Yes - willing to relocate', 'No - position is fixed location', 'Open to relocation if necessary'], index),
        publishedAt: createdAt,
        employer: employer._id,
        companyName: employer.employerProfile.companyName,
        companyLogo: employer.employerProfile.companyLogo,
        isActive: active,
        isPublished: true,
        isArchived: false,
        views: 25 + ((index * 37) % 480),
        applicationCount: 0,
        filledAt: lifecycle === 'filled' ? new Date(createdAt.getTime() + 18 * 24 * 60 * 60 * 1000) : null,
        closedAt: lifecycle === 'closed' ? new Date(createdAt.getTime() + 24 * 24 * 60 * 60 * 1000) : null,
        filledReason: lifecycle === 'filled' ? 'Vacancy is already full' : '',
        createdAt,
        updatedAt: lifecycle === 'filled' || lifecycle === 'closed' ? daysAgo(index % 20) : createdAt,
      });
    }
  });

  const insertedJobs = await Job.insertMany(jobDocs, { ordered: true });

  const applicationDocs = [];
  insertedJobs.forEach((job, jobIndex) => {
    const deadlineExpired = job.applicationDeadline && new Date(job.applicationDeadline).getTime() < Date.now();
    const applicationsForJob = 2 + (jobIndex % 4);
    for (let slot = 0; slot < applicationsForJob; slot += 1) {
      const seeker = insertedJobseekers[(jobIndex * 7 + slot * 13) % insertedJobseekers.length];
      const appliedAt = distributedDate(jobIndex * 3 + slot + 1);
      let status;
      if (job.status === 'filled') status = slot < 2 ? 'hired' : 'vacancy full';
      else if (job.status === 'closed') status = pick(['declined', 'withdrawn', 'cancelled'], slot + jobIndex);
      else if (deadlineExpired) status = pick(['declined', 'withdrawn', 'pending'], slot + jobIndex);
      else status = pick(['pending', 'for interview', 'pending', 'for interview', 'hired', 'declined', 'withdrawn'], slot + jobIndex);

      const hiredAt = status === 'hired' ? new Date(appliedAt.getTime() + (5 + (slot % 14)) * 24 * 60 * 60 * 1000) : null;
      const interviewAt = status === 'for interview' || status === 'hired'
        ? new Date(appliedAt.getTime() + (3 + slot) * 24 * 60 * 60 * 1000)
        : null;
      const lastActiveStatus = ['declined', 'withdrawn', 'cancelled', 'vacancy full'].includes(status)
        ? pick(['pending', 'for interview'], slot)
        : status === 'hired' ? 'hired' : status;

      applicationDocs.push({
        job: job._id,
        jobseeker: seeker._id,
        employer: job.employer,
        status,
        lastActiveStatus,
        withdrawalCount: status === 'withdrawn' ? 1 : 0,
        withdrawnAt: status === 'withdrawn' ? new Date(appliedAt.getTime() + 4 * 24 * 60 * 60 * 1000) : null,
        withdrawnBy: status === 'withdrawn' ? 'jobseeker' : '',
        coverLetter: `I am interested in the ${job.title} opportunity and would welcome the chance to contribute my skills and experience to ${job.companyName}.`,
        resumeSnapshot: {
          user: {
            firstName: seeker.firstName,
            middleName: seeker.middleName,
            lastName: seeker.lastName,
            email: seeker.email,
            profileImage: seeker.profileImage,
          },
          jobSeekerProfile: seeker.jobSeekerProfile,
        },
        resumeSnapshotVersion: 1,
        resumeSnapshotCreatedAt: appliedAt,
        appliedAt,
        reviewedAt: status !== 'pending' ? new Date(appliedAt.getTime() + 2 * 24 * 60 * 60 * 1000) : null,
        employmentStatus: status === 'hired' ? 'active' : 'active',
        hiredAt,
        isViewedByEmployer: status !== 'pending' || slot % 2 === 0,
        viewedAt: status !== 'pending' || slot % 2 === 0 ? new Date(appliedAt.getTime() + 24 * 60 * 60 * 1000) : null,
        declineReason: status === 'declined' ? 'Does not meet screening criteria' : '',
        declineComment: status === 'declined' ? 'Profile reviewed.' : '',
        declinedFrom: status === 'declined' ? pick(['applicants', 'forInterview'], slot) : '',
        interviewSchedule: interviewAt ? {
          scheduledAt: interviewAt,
          durationMinutes: 60,
          meetingType: pick(['On-site', 'Video Call', 'Phone'], slot),
          location: 'Company recruitment office',
          meetingLink: slot % 2 ? 'https://meet.google.com/demo-agapay' : '',
          notes: 'Please prepare a copy of your resume and arrive ten minutes early.',
          setBy: job.employer,
          setAt: new Date(appliedAt.getTime() + 2 * 24 * 60 * 60 * 1000),
          interviewer: job.employer,
          interviewerName: 'Recruitment Team',
          status: status === 'hired' ? 'completed' : 'scheduled',
        } : {},
        hiringStage: status === 'for interview' ? pick(['Initial Interview', 'Assessment', 'Final Interview'], slot) : status === 'hired' ? 'Job Offer' : '',
        activityHistory: [
          { type: 'submitted', title: 'Application submitted', description: 'Application successfully submitted.', occurredAt: appliedAt, performedBy: seeker._id },
          ...(status !== 'pending' ? [{ type: 'status_changed', title: 'Application status updated', description: `Application moved to ${status}.`, fromStatus: 'pending', toStatus: status, occurredAt: new Date(appliedAt.getTime() + 2 * 24 * 60 * 60 * 1000), performedBy: job.employer }] : []),
        ],
        createdAt: appliedAt,
        updatedAt: hiredAt || new Date(appliedAt.getTime() + 2 * 24 * 60 * 60 * 1000),
      });
    }
  });

  const insertedApplications = await Application.insertMany(applicationDocs, { ordered: true });

  const applicationsByJob = new Map();
  insertedApplications.forEach((application) => {
    const key = String(application.job);
    if (!applicationsByJob.has(key)) applicationsByJob.set(key, []);
    applicationsByJob.get(key).push(application._id);
  });
  await Job.bulkWrite(insertedJobs.map((job) => {
    const applicationIds = applicationsByJob.get(String(job._id)) || [];
    return {
      updateOne: {
        filter: { _id: job._id },
        update: { $set: { applications: applicationIds, applicationCount: applicationIds.length } },
      },
    };
  }));

  const editRequests = insertedJobs.slice(0, 75).map((job, index) => {
    const createdAt = distributedDate(index + 4);
    const status = pick(['pending', 'pending', 'approved', 'rejected', 'expired'], index);
    return {
      job: job._id,
      employer: job.employer,
      requestedSections: [pick(['Job Details', 'Requirements & Qualifications', 'Skills & Benefits', 'Work Locations', 'Salary', 'Deadline'], index)],
      reason: pick([
        'We need to update the role details to reflect the current hiring requirements.',
        'The recruitment team needs to revise the qualifications based on the latest department request.',
        'The salary and benefits information needs to be updated before the next applicant review.',
        'The work location details changed after the original job post was published.',
      ], index),
      status,
      reviewedAt: ['approved', 'rejected'].includes(status) ? new Date(createdAt.getTime() + 2 * 24 * 60 * 60 * 1000) : null,
      unlockUntil: status === 'approved' ? new Date(Date.now() + 60 * 60 * 1000) : null,
      createdAt,
      updatedAt: createdAt,
    };
  });
  await JobEditRequest.insertMany(editRequests, { ordered: true });

  const messageDocs = [];
  insertedApplications.slice(0, 220).forEach((application, index) => {
    const createdAt = distributedDate(index + 1);
    const conversationId = `${application.employer}_${application.jobseeker}_${application._id}`;
    messageDocs.push({
      conversationId,
      sender: application.employer,
      receiver: application.jobseeker,
      content: pick([
        'Thank you for your application. Our recruitment team is currently reviewing your profile.',
        'We would like to invite you to the next stage of the hiring process.',
        'Please confirm your availability for the scheduled interview.',
        'We appreciate your interest in the position and will provide an update after the assessment.',
      ], index),
      messageType: index % 6 === 0 ? 'interview' : 'text',
      isRead: index % 3 !== 0,
      readAt: index % 3 !== 0 ? new Date(createdAt.getTime() + 60 * 60 * 1000) : null,
      job: application.job,
      application: application._id,
      createdAt,
      updatedAt: createdAt,
    });
  });
  const insertedMessages = await Message.insertMany(messageDocs, { ordered: true });

  const preferenceDocs = insertedMessages.map((message, index) => ({
    user: index % 2 === 0 ? message.sender : message.receiver,
    conversationId: message.conversationId,
    otherUser: index % 2 === 0 ? message.receiver : message.sender,
    archived: index % 15 === 0,
    hiddenCompany: false,
    deleted: false,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
  }));
  await ConversationPreference.insertMany(preferenceDocs, { ordered: false });

  const notificationDocs = [];
  insertedApplications.slice(0, 320).forEach((application, index) => {
    const createdAt = distributedDate(index + 3);
    notificationDocs.push({
      user: application.jobseeker,
      type: pick(['application_update', 'interview', 'new_message', 'job_match'], index),
      title: pick(['Application update', 'Interview schedule', 'New message', 'New job match'], index),
      message: pick([
        'There is a new update on one of your job applications.',
        'An employer has updated your interview schedule.',
        'You received a new message from an employer.',
        'A recently posted job matches your profile and skills.',
      ], index),
      relatedId: index % 4 === 3 ? application.job : application._id,
      relatedModel: index % 4 === 3 ? 'Job' : 'Application',
      isRead: index % 4 !== 0,
      isArchived: index % 18 === 0,
      metadata: { demoData: true, batchId },
      createdAt,
      updatedAt: createdAt,
    });
  });
  await Notification.insertMany(notificationDocs, { ordered: true });

  const communityDocs = insertedJobseekers.slice(0, 60).map((user, index) => {
    const createdAt = distributedDate(index + 6);
    return {
      author: user._id,
      content: pick([
        'Sharing a reminder for fellow applicants: review the job requirements carefully and tailor your resume before submitting an application.',
        'What interview preparation techniques have helped you communicate your skills more clearly to employers?',
        'A useful job search habit is to keep a simple tracker of applications, interview dates, and follow-up schedules.',
        'For fresh graduates, project experience can be a good way to demonstrate practical skills when formal work experience is still limited.',
      ], index),
      category: pick(['insight', 'question', 'resource', 'skill'], index),
      topics: [pick(['Job Search', 'Interview', 'Career Tips', 'Resume'], index)],
      imageUrl: index % 5 === 0 ? demoImage(`community-${index}`, 'shapes') : '',
      commentsCount: 0,
      createdAt,
      updatedAt: createdAt,
    };
  });
  await CommunityPost.insertMany(communityDocs, { ordered: true });

  const logActions = [
    ['user_login', 'User signed in', 'Authentication'],
    ['job_created', 'Job post created', 'Jobs'],
    ['application_reviewed', 'Application reviewed', 'Applications'],
    ['verification_reviewed', 'Verification reviewed', 'Verification'],
    ['job_edit_request', 'Job edit request reviewed', 'Job Edit Requests'],
  ];
  const systemLogDocs = Array.from({ length: 220 }, (_, index) => {
    const actor = index % 3 === 0 ? insertedEmployers[index % insertedEmployers.length] : insertedJobseekers[index % insertedJobseekers.length];
    const [action, actionLabel, moduleName] = pick(logActions, index);
    const createdAt = distributedDate(index);
    return {
      requestId: `demo-${batchId}-${index + 1}`,
      actor: actor._id,
      actorName: actor.role === 'employer' ? actor.employerProfile?.companyName : `${actor.firstName} ${actor.lastName}`,
      actorEmail: actor.email,
      actorRole: actor.role,
      action,
      actionLabel,
      module: moduleName,
      targetType: 'Demo Record',
      targetId: batchId,
      targetName: 'AGAPAY Presentation Data',
      status: index % 17 === 0 ? 'warning' : index % 31 === 0 ? 'failed' : 'success',
      description: 'Generated presentation activity used to populate AGAPAY analytics and system monitoring views.',
      method: pick(['GET', 'POST', 'PUT', 'PATCH'], index),
      path: '/api/demo/presentation',
      statusCode: index % 31 === 0 ? 500 : 200,
      durationMs: 40 + ((index * 29) % 980),
      metadata: { demoData: true, batchId },
      createdAt,
      updatedAt: createdAt,
    };
  });
  await SystemLog.insertMany(systemLogDocs, { ordered: true });

  const pendingEmailDocs = Array.from({ length: 45 }, (_, index) => {
    const createdAt = distributedDate(index + 2);
    const role = index % 3 === 0 ? 'employer' : 'jobseeker';
    const verified = index % 4 !== 0;
    return {
      email: `pending.${role}.${batchId}.${index + 1}@${DEMO_EMAIL_DOMAIN}`,
      role,
      otpHash: crypto.createHash('sha256').update(`${batchId}-${index}`).digest('hex'),
      otpExpiresAt: new Date(createdAt.getTime() + 10 * 60 * 1000),
      otpRequestedAt: createdAt,
      verifiedAt: verified ? new Date(createdAt.getTime() + 4 * 60 * 1000) : null,
      consumedAt: verified ? new Date(createdAt.getTime() + 5 * 60 * 1000) : null,
      deleteAfterAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      createdAt,
      updatedAt: createdAt,
    };
  });
  await PendingEmailVerification.insertMany(pendingEmailDocs, { ordered: true });

  const reviewUpdates = [];
  verifiedEmployers.forEach((employer, employerIndex) => {
    const employerApplications = insertedApplications.filter((application) => String(application.employer) === String(employer._id));
    const candidates = employerApplications.filter((application) => ['hired', 'declined'].includes(application.status)).slice(0, 3);
    if (!candidates.length) return;
    reviewUpdates.push({
      updateOne: {
        filter: { _id: employer._id },
        update: {
          $set: {
            'employerProfile.reviews': candidates.map((application, index) => {
              const reviewer = insertedJobseekers.find((user) => String(user._id) === String(application.jobseeker));
              const job = insertedJobs.find((item) => String(item._id) === String(application.job));
              const createdAt = distributedDate(employerIndex + index + 12);
              return {
                reviewer: application.jobseeker,
                reviewerName: reviewer ? `${reviewer.firstName} ${reviewer.lastName}` : 'AGAPAY Jobseeker',
                application: application._id,
                job: application.job,
                roleAppliedFor: job?.title || 'Job Applicant',
                rating: 4 + ((employerIndex + index) % 2),
                processRating: 4 + ((employerIndex + index) % 2),
                daysToFirstResponse: 1 + ((employerIndex + index) % 5),
                totalProcessDays: 7 + ((employerIndex + index) % 18),
                outcome: application.status === 'hired' ? 'received_offer' : 'rejected',
                wouldApplyAgain: true,
                message: pick([
                  'The recruitment process was organized and communication was clear throughout the application.',
                  'The employer provided timely updates and the interview instructions were easy to follow.',
                  'The overall application experience was professional and the recruitment team was responsive.',
                ], employerIndex + index),
                createdAt,
                updatedAt: createdAt,
              };
            }),
          },
        },
      },
    });
  });
  if (reviewUpdates.length) await User.bulkWrite(reviewUpdates);

  return { batchId, counts: await getDemoCounts() };
};

exports.manageDemoData = async (req, res) => {
  const action = String(req.body?.action || 'status').trim().toLowerCase();
  if (!['status', 'enable', 'disable'].includes(action)) {
    return res.status(400).json({ success: false, message: 'Action must be status, enable, or disable.' });
  }

  try {
    if (action === 'status') {
      const counts = await getDemoCounts();
      return res.json({ success: true, enabled: counts.users > 0, counts });
    }

    if (action === 'disable') {
      const before = await getDemoCounts();
      await removeDemoData();
      return res.json({
        success: true,
        enabled: false,
        counts: before,
        message: before.users ? 'Demo data removed. Real records were not changed.' : 'Demo data is already off.',
      });
    }

    const current = await getDemoCounts();
    if (current.users > 0) {
      return res.json({ success: true, enabled: true, counts: current, message: 'Demo data is already enabled.' });
    }

    try {
      const result = await injectDemoData();
      return res.status(201).json({
        success: true,
        enabled: true,
        batchId: result.batchId,
        counts: result.counts,
        message: 'Presentation demo data was injected successfully.',
      });
    } catch (error) {
      console.error('Demo data injection failed:', error);
      try {
        await removeDemoData();
      } catch (cleanupError) {
        console.error('Demo data cleanup after failed injection also failed:', cleanupError);
      }
      return res.status(500).json({
        success: false,
        enabled: false,
        message: `Unable to inject demo data: ${error.message}`,
      });
    }
  } catch (error) {
    console.error('Manage demo data error:', error);
    return res.status(500).json({ success: false, message: 'Unable to manage demo data.' });
  }
};
