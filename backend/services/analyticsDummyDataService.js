const mongoose = require('mongoose');

const COLLECTIONS = {
  state: 'analytics_dummy_state',
  users: 'analytics_dummy_users',
  jobs: 'analytics_dummy_jobs',
  applications: 'analytics_dummy_applications',
  editRequests: 'analytics_dummy_edit_requests',
};

const collection = (key) => mongoose.connection.collection(COLLECTIONS[key]);

const isEnabled = async () => {
  const state = await collection('state').findOne({ _id: 'admin-analytics-dummy-mode' });
  return Boolean(state?.enabled);
};

const clearData = async () => {
  await Promise.all([
    collection('users').deleteMany({}),
    collection('jobs').deleteMany({}),
    collection('applications').deleteMany({}),
    collection('editRequests').deleteMany({}),
  ]);
};

const getCounts = async () => {
  const [users, jobs, applications, editRequests] = await Promise.all([
    collection('users').countDocuments({}),
    collection('jobs').countDocuments({}),
    collection('applications').countDocuments({}),
    collection('editRequests').countDocuments({}),
  ]);
  return { users, jobs, applications, editRequests };
};

const buildDataset = () => {
  const now = new Date();
  const monthDate = (monthsAgo, day = 12, hour = 9) => {
    const value = new Date(now);
    value.setHours(hour, 0, 0, 0);
    value.setDate(1);
    value.setMonth(value.getMonth() - monthsAgo);
    const lastDay = new Date(value.getFullYear(), value.getMonth() + 1, 0).getDate();
    value.setDate(Math.min(day, lastDay));
    return value;
  };

  const campuses = ['AU Main', 'AU San Jose', 'AU South'];
  const courses = [
    'BS Information Technology',
    'BS Business Administration',
    'BS Accountancy',
    'BS Criminology',
    'BS Hospitality Management',
    'BS Education',
  ];
  const years = ['2026', '2025', '2024', '2023'];
  const verificationStatuses = ['verified', 'pending', 'hold', 'rejected'];
  const industries = [
    'Banking / Financial Services',
    'Information Technology',
    'Retail / Consumer Products',
    'Food & Beverage',
    'Manufacturing',
    'Education',
  ];

  const employers = Array.from({ length: 9 }, (_, index) => {
    const _id = new mongoose.Types.ObjectId();
    const verification = verificationStatuses[index % verificationStatuses.length];
    const createdAt = monthDate(11 - (index % 9), 4 + (index % 18));
    return {
      _id,
      role: 'employer',
      status: 'active',
      isActive: true,
      isVerified: verification === 'verified',
      createdAt,
      updatedAt: monthDate(Math.max(0, 10 - (index % 9)), 15),
      employerProfile: {
        companyName: `AGAPAY Demo Company ${index + 1}`,
        industry: industries[index % industries.length],
        verificationDocs: {
          overallStatus: verification,
          verifiedAt: verification === 'verified' ? monthDate(Math.max(0, 10 - (index % 9)), 18) : null,
          rejectedAt: verification === 'rejected' ? monthDate(Math.max(0, 10 - (index % 9)), 18) : null,
          secRegistration: { status: verification === 'hold' ? 'hold' : 'approved', uploadedAt: createdAt },
          birRegistration: { status: verification === 'pending' ? 'pending' : 'approved', uploadedAt: createdAt },
          rejectionReasons: verification === 'rejected' ? ['Blurry or unreadable document'] : [],
        },
        reviews: [{ rating: 4 }, { rating: 4.5 }],
      },
    };
  });

  const jobseekers = Array.from({ length: 36 }, (_, index) => {
    const _id = new mongoose.Types.ObjectId();
    const verification = verificationStatuses[index % verificationStatuses.length];
    const createdAt = monthDate(11 - (index % 12), 3 + (index % 22));
    return {
      _id,
      role: 'jobseeker',
      status: 'active',
      isActive: true,
      isVerified: verification === 'verified',
      createdAt,
      updatedAt: monthDate(Math.max(0, 10 - (index % 11)), 14),
      jobSeekerProfile: {
        campus: campuses[index % campuses.length],
        course: courses[index % courses.length],
        yearGraduated: years[index % years.length],
        verificationStatus: verification,
        verificationDocs: {
          overallStatus: verification,
          verifiedAt: verification === 'verified' ? monthDate(Math.max(0, 10 - (index % 11)), 17) : null,
          rejectedAt: verification === 'rejected' ? monthDate(Math.max(0, 10 - (index % 11)), 17) : null,
          validId: { status: verification === 'hold' ? 'hold' : 'approved', uploadedAt: createdAt },
          cv: { status: verification === 'pending' ? 'pending' : 'approved', uploadedAt: createdAt },
          diploma: { status: 'approved', uploadedAt: createdAt },
          tor: { status: 'approved', uploadedAt: createdAt },
          rejectionReasons: verification === 'rejected' ? ['Document information could not be verified'] : [],
        },
      },
    };
  });

  const jobTypes = ['Full-time', 'Part-time', 'Contractual', 'Permanent'];
  const workModes = ['On-site', 'Remote', 'Blended', 'Work from Home'];
  const educationLevels = ["Bachelor’s / College degree graduate's", 'Master’s degree', 'Doctorate Degree'];
  const experienceLevels = ['No experience required', 'Less than 1 Yr Exp', '1-3 Years Exp', '4-5 Years Exp', '6+ Years Exp'];
  const jobStatuses = ['published', 'published', 'filled', 'closed'];

  const jobs = Array.from({ length: 36 }, (_, index) => {
    const _id = new mongoose.Types.ObjectId();
    const employer = employers[index % employers.length];
    const status = jobStatuses[index % jobStatuses.length];
    const publishedAt = monthDate(11 - (index % 12), 6 + (index % 19));
    return {
      _id,
      employer: employer._id,
      companyName: employer.employerProfile.companyName,
      status,
      isActive: status === 'published',
      isPublished: true,
      isArchived: false,
      category: industries[index % industries.length],
      jobType: jobTypes[index % jobTypes.length],
      workMode: workModes[index % workModes.length],
      educationLevel: educationLevels[index % educationLevels.length],
      experienceLevel: experienceLevels[index % experienceLevels.length],
      salaryMin: 18000 + ((index % 8) * 2500),
      salaryMax: 28000 + ((index % 8) * 3500),
      hideSalary: index % 7 === 0,
      isUrgent: index % 5 === 0,
      vacancies: 1 + (index % 6),
      publishedAt,
      filledAt: status === 'filled' ? monthDate(Math.max(0, 10 - (index % 11)), 22) : null,
      createdAt: publishedAt,
      updatedAt: monthDate(Math.max(0, 10 - (index % 11)), 25),
    };
  });

  const applicationStatuses = ['pending', 'for interview', 'hired', 'declined', 'withdrawn', 'hired', 'for interview', 'pending', 'declined'];
  const applications = Array.from({ length: 108 }, (_, index) => {
    const job = jobs[index % jobs.length];
    const seeker = jobseekers[(index * 5 + (index % 7)) % jobseekers.length];
    const employer = employers.find((item) => String(item._id) === String(job.employer)) || employers[0];
    const status = applicationStatuses[index % applicationStatuses.length];
    const appliedAt = monthDate(11 - (index % 12), 7 + (index % 18));
    const responseAt = new Date(appliedAt.getTime() + ((index % 5) + 1) * 86400000);
    const hiredAt = status === 'hired' ? new Date(responseAt.getTime() + ((index % 4) + 1) * 86400000) : null;
    return {
      _id: new mongoose.Types.ObjectId(),
      job: job._id,
      jobseeker: seeker._id,
      employer: employer._id,
      status,
      appliedAt,
      reviewedAt: ['for interview', 'hired', 'declined'].includes(status) ? responseAt : null,
      viewedAt: ['for interview', 'hired', 'declined'].includes(status) ? responseAt : null,
      isViewedByEmployer: ['for interview', 'hired', 'declined'].includes(status),
      hiredAt,
      declineReason: status === 'declined' ? ['Not qualified', 'Position filled', 'Experience mismatch'][index % 3] : '',
      activityHistory: [
        { type: 'submitted', title: 'Application submitted', occurredAt: appliedAt },
        ...(['for interview', 'hired', 'declined'].includes(status) ? [{ type: 'reviewed', title: 'Application reviewed', occurredAt: responseAt }] : []),
        ...(status === 'for interview' ? [{ type: 'interview', title: 'Interview scheduled', occurredAt: responseAt }] : []),
        ...(status === 'hired' ? [{ type: 'interview', title: 'Interview completed', occurredAt: responseAt }, { type: 'hired', title: 'Applicant hired', occurredAt: hiredAt }] : []),
        ...(status === 'declined' ? [{ type: 'declined', title: 'Application declined', occurredAt: responseAt }] : []),
      ],
      createdAt: appliedAt,
      updatedAt: hiredAt || responseAt || appliedAt,
    };
  });

  const editStatuses = ['pending', 'approved', 'rejected', 'expired'];
  const editSections = [['title'], ['salary'], ['description'], ['workMode', 'location'], ['requirements']];
  const editRequests = Array.from({ length: 18 }, (_, index) => {
    const job = jobs[(index * 2) % jobs.length];
    const employer = employers.find((item) => String(item._id) === String(job.employer)) || employers[0];
    const createdAt = monthDate(11 - (index % 12), 10 + (index % 15));
    const status = editStatuses[index % editStatuses.length];
    return {
      _id: new mongoose.Types.ObjectId(),
      job: job._id,
      employer: employer._id,
      requestedSections: editSections[index % editSections.length],
      status,
      reviewedAt: status === 'pending' ? null : new Date(createdAt.getTime() + 2 * 86400000),
      createdAt,
      updatedAt: status === 'pending' ? createdAt : new Date(createdAt.getTime() + 2 * 86400000),
    };
  });

  return { users: [...jobseekers, ...employers], jobs, applications, editRequests };
};

const enable = async ({ userId = null } = {}) => {
  await clearData();
  const dataset = buildDataset();
  await Promise.all([
    collection('users').insertMany(dataset.users),
    collection('jobs').insertMany(dataset.jobs),
    collection('applications').insertMany(dataset.applications),
    collection('editRequests').insertMany(dataset.editRequests),
  ]);
  await collection('state').updateOne(
    { _id: 'admin-analytics-dummy-mode' },
    { $set: { enabled: true, enabledAt: new Date(), enabledBy: userId } },
    { upsert: true }
  );
  return getCounts();
};

const disable = async ({ userId = null } = {}) => {
  await clearData();
  await collection('state').updateOne(
    { _id: 'admin-analytics-dummy-mode' },
    { $set: { enabled: false, disabledAt: new Date(), disabledBy: userId } },
    { upsert: true }
  );
  return { users: 0, jobs: 0, applications: 0, editRequests: 0 };
};

const getData = async () => {
  if (!(await isEnabled())) return { enabled: false, users: [], jobs: [], applications: [], editRequests: [] };
  const [users, jobs, applications, editRequests] = await Promise.all([
    collection('users').find({}).toArray(),
    collection('jobs').find({}).toArray(),
    collection('applications').find({}).toArray(),
    collection('editRequests').find({}).toArray(),
  ]);
  return { enabled: true, users, jobs, applications, editRequests };
};

module.exports = { isEnabled, getCounts, enable, disable, getData };
