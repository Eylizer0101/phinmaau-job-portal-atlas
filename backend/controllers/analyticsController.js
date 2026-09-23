const User = require('../models/User');
const Job = require('../models/Job');
const Application = require('../models/Application');
const JobEditRequest = require('../models/JobEditRequest');
const SystemLog = require('../models/SystemLog');
const ANALYTICS_MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;
const analyticsText = value => String(value ?? '').trim();
const analyticsLower = value => analyticsText(value).toLowerCase();
const analyticsId = value => analyticsText(value?._id || value);
const analyticsIsAll = value => !analyticsText(value) || analyticsLower(value) === 'all';
const analyticsManilaParts = (value = new Date()) => {
  const shifted = new Date(new Date(value).getTime() + ANALYTICS_MANILA_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate()
  };
};
const analyticsManilaBoundary = ({
  year,
  month,
  day
}, endOfDay = false) => {
  const utc = Date.UTC(year, month, day, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0) - ANALYTICS_MANILA_OFFSET_MS;
  return new Date(utc);
};
const analyticsShiftDateParts = (parts, days) => {
  const date = new Date(Date.UTC(parts.year, parts.month, parts.day + days));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth(),
    day: date.getUTCDate()
  };
};
const analyticsParseDateInput = value => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(analyticsText(value));
  if (!match) return null;
  const parts = {
    year: Number(match[1]),
    month: Number(match[2]) - 1,
    day: Number(match[3])
  };
  const check = new Date(Date.UTC(parts.year, parts.month, parts.day));
  if (check.getUTCFullYear() !== parts.year || check.getUTCMonth() !== parts.month || check.getUTCDate() !== parts.day) return null;
  return parts;
};
const getAdminAnalyticsDateRange = ({
  preset,
  specificDate,
  startDate,
  endDate
}) => {
  const value = analyticsLower(preset || 'overall');
  const today = analyticsManilaParts();
  const dayOfWeek = new Date(Date.UTC(today.year, today.month, today.day)).getUTCDay();
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const thisMonday = analyticsShiftDateParts(today, -mondayOffset);
  const makeDay = (parts, label) => ({
    start: analyticsManilaBoundary(parts),
    end: analyticsManilaBoundary(parts, true),
    label
  });
  if (value === 'today') return makeDay(today, 'Today');
  if (value === 'yesterday') return makeDay(analyticsShiftDateParts(today, -1), 'Yesterday');
  if (value === 'thisweek') {
    return {
      start: analyticsManilaBoundary(thisMonday),
      end: analyticsManilaBoundary(today, true),
      label: 'This Week'
    };
  }
  if (value === 'lastweek') {
    return {
      start: analyticsManilaBoundary(analyticsShiftDateParts(thisMonday, -7)),
      end: analyticsManilaBoundary(analyticsShiftDateParts(thisMonday, -1), true),
      label: 'Last Week'
    };
  }
  if (value === 'thismonth') {
    return {
      start: analyticsManilaBoundary({
        ...today,
        day: 1
      }),
      end: analyticsManilaBoundary(today, true),
      label: 'This Month'
    };
  }
  if (value === 'lastmonth') {
    const firstThisMonth = {
      ...today,
      day: 1
    };
    const lastPreviousMonth = analyticsShiftDateParts(firstThisMonth, -1);
    return {
      start: analyticsManilaBoundary({
        ...lastPreviousMonth,
        day: 1
      }),
      end: analyticsManilaBoundary(lastPreviousMonth, true),
      label: 'Last Month'
    };
  }
  if (value === 'thisyear') {
    return {
      start: analyticsManilaBoundary({
        year: today.year,
        month: 0,
        day: 1
      }),
      end: analyticsManilaBoundary(today, true),
      label: 'This Year'
    };
  }
  if (value === 'lastyear') {
    return {
      start: analyticsManilaBoundary({
        year: today.year - 1,
        month: 0,
        day: 1
      }),
      end: analyticsManilaBoundary({
        year: today.year - 1,
        month: 11,
        day: 31
      }, true),
      label: 'Last Year'
    };
  }
  if (value === 'specific') {
    const selected = analyticsParseDateInput(specificDate);
    if (selected) return makeDay(selected, 'Specific Date');
  }
  if (value === 'range') {
    const from = analyticsParseDateInput(startDate);
    const to = analyticsParseDateInput(endDate);
    if (from && to) {
      const start = analyticsManilaBoundary(from);
      const end = analyticsManilaBoundary(to, true);
      if (start <= end) return {
        start,
        end,
        label: 'Date Range'
      };
    }
  }
  return {
    start: null,
    end: null,
    label: 'Overall'
  };
};
const analyticsInRange = (value, range) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return false;
  if (range.start && date < range.start) return false;
  if (range.end && date > range.end) return false;
  return true;
};
const text = analyticsText;
const lower = analyticsLower;
const id = analyticsId;
const validDate = v => v && Number.isFinite(new Date(v).getTime());
const earliest = values => values.filter(validDate).sort((a, b) => new Date(a) - new Date(b))[0] || null;
const mean = values => values.length ? Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2)) : null;
const percent = (n, d) => d ? Number((100 * n / d).toFixed(1)) : null;
const unique = values => [...new Set(values.map(text).filter(Boolean))].sort();
const profile = u => u?.jobSeekerProfile || {};
const attribute = (u, k) => profile(u)[k] || (profile(u).educationEntries || []).find(e => e[k])?.[k] || 'Unspecified';
const docs = u => (u.role === 'employer' ? u.employerProfile : u.jobSeekerProfile)?.verificationDocs || {};
const verificationStatus = u => ({
  verified: 'Approved',
  approved: 'Approved',
  rejected: 'Declined',
  hold: 'On Hold',
  submitted: 'Pending',
  pending: 'Pending'
})[docs(u).overallStatus] || 'Not Submitted';
const docEntries = u => Object.values(docs(u)).filter(v => v && typeof v === 'object' && !Array.isArray(v) && 'uploadedAt' in v);
const submission = u => earliest(docEntries(u).map(d => d.uploadedAt));
const eventDate = (a, status, type) => earliest((a.activityHistory || []).filter(e => (status && lower(e.toStatus) === status) || e.type === type).map(e => e.occurredAt));
const applied = a => a.appliedAt || a.createdAt;
const reviewed = a => earliest([a.viewedAt, eventDate(a, '', 'reviewed')]);
const interview = a => earliest([eventDate(a, 'for interview', 'interview'), a.interviewSchedule?.setAt]);
const hired = a => earliest([a.hiredAt, eventDate(a, 'hired', 'hired')]);
const count = (rows, fn) => {
  const m = new Map();
  rows.forEach(r => {
    const k = text(fn(r)) || 'Unspecified';
    m.set(k, (m.get(k) || 0) + 1);
  });
  return [...m].map(([name, value]) => ({
    name,
    value
  })).sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
};
const grouped = (rows, dimension, series) => {
  const keys = unique(rows.map(series));
  const m = new Map();
  rows.forEach(r => {
    const name = text(dimension(r)) || 'Unspecified',
      key = text(series(r)) || 'Unspecified';
    if (!m.has(name)) m.set(name, {
      name
    });
    const row = m.get(name);
    row[key] = (row[key] || 0) + 1;
  });
  return {
    rows: [...m.values()].map(r => Object.fromEntries([['name', r.name], ...keys.map(k => [k, r[k] || 0])])),
    series: keys
  };
};
const metric = (label, value, unit, definition) => ({
  label,
  value,
  unit,
  definition
});
const chart = (title, type, rows, series = ['value'], note = '', unit = 'count') => ({
  title,
  type,
  rows,
  series,
  note,
  unit
});
const FILTERS = ['role', 'campus', 'course', 'yearGraduated', 'applicationStatus', 'jobStatus', 'industry', 'jobType', 'workMode', 'educationLevel', 'experienceLevel', 'verificationStatus', 'editRequestStatus'];
const cleanFilters = query => {
  const f = {
    date: text(query.date || 'overall'),
    specificDate: text(query.specificDate),
    startDate: text(query.startDate),
    endDate: text(query.endDate)
  };
  if (!['overall', 'today', 'yesterday', 'thisWeek', 'lastWeek', 'thisMonth', 'lastMonth', 'thisYear', 'lastYear', 'specific', 'range'].includes(f.date)) throw new Error('Choose a valid date range.');
  for (const k of FILTERS) f[k] = unique((Array.isArray(query[k]) ? query[k] : text(query[k]).split('|')).filter(v => v && lower(v) !== 'all'));
  if (f.date === 'specific' && !analyticsParseDateInput(f.specificDate)) throw new Error('Choose a valid specific date.');
  if (f.date === 'range' && (!analyticsParseDateInput(f.startDate) || !analyticsParseDateInput(f.endDate) || f.startDate > f.endDate)) throw new Error('Choose a valid start and end date.');
  return f;
};
function buildReport({
  users: allUsers,
  jobs: allJobs,
  applications: allApplications,
  edits: allEdits
}, f, now = new Date()) {
  const range = getAdminAnalyticsDateRange({
    preset: f.date,
    ...f
  });
  const inRange = v => validDate(v) && analyticsInRange(v, range);
  const same = (v, k) => !f[k].length || f[k].some(x => lower(x) === lower(v));
  const um = new Map(allUsers.map(u => [id(u), u])),
    jm = new Map(allJobs.map(j => [id(j), j]));
  const seekerMatch = u => ['campus', 'course', 'yearGraduated'].every(k => same(attribute(u, k), k));
  const jobMatch = j => j && same(j.status, 'jobStatus') && same(um.get(id(j.employer))?.employerProfile?.industry || 'Unspecified', 'industry') && ['jobType', 'workMode', 'educationLevel', 'experienceLevel'].every(k => same(j[k], k));
  const appMatch = a => same(a.status, 'applicationStatus') && seekerMatch(um.get(id(a.jobseeker))) && jobMatch(jm.get(id(a.job)));
  const users = allUsers.filter(u => same(u.role, 'role') && seekerMatch(u) && inRange(u.createdAt));
  const published = allJobs.filter(j => j.status !== 'draft' && j.isPublished !== false && jobMatch(j));
  const jobs = published.filter(j => inRange(j.publishedAt));
  const apps = allApplications.filter(a => inRange(applied(a)) && appMatch(a));
  const hires = apps.filter(a => a.status === 'hired');
  const eligible = apps.filter(a => a.status !== 'cancelled');
  const seen = apps.filter(a => a.isViewedByEmployer || reviewed(a));
  const interviews = apps.filter(a => interview(a) || a.status === 'for interview');
  const seenInterview = interviews.filter(a => a.isViewedByEmployer || reviewed(a));
  const responseDays = apps.map(a => {
    const first = earliest((a.activityHistory || []).filter(e => ['message', 'interview', 'hired', 'declined', 'status_changed'].includes(e.type) && id(e.performedBy) === id(a.employer)).map(e => e.occurredAt));
    return first && validDate(applied(a)) ? (new Date(first) - new Date(applied(a))) / 86400000 : null;
  }).filter(v => v !== null && v >= 0);
  const firstHire = new Map();
  allApplications.forEach(a => {
    const date = hired(a);
    if (date && (!firstHire.has(id(a.jobseeker)) || new Date(date) < new Date(hired(firstHire.get(id(a.jobseeker)))))) firstHire.set(id(a.jobseeker), a);
  });
  const effort = [...firstHire.values()].filter(a => inRange(hired(a)) && appMatch(a) && validDate(applied(a))).map(a => allApplications.filter(x => id(x.jobseeker) === id(a.jobseeker) && validDate(applied(x)) && new Date(applied(x)) < new Date(applied(a))).length);
  const active = jobs.filter(j => !j.isArchived && j.isActive !== false && j.status === 'published' && validDate(j.applicationDeadline) && new Date(j.applicationDeadline) >= now);
  const edits = allEdits.filter(e => inRange(e.createdAt) && same(e.status, 'editRequestStatus') && jobMatch(jm.get(id(e.job))));
  const vacancyJobs = jobs.filter(j => Number.isFinite(j.vacancies) && j.vacancies > 0);
  const vacancies = vacancyJobs.reduce((n, j) => n + j.vacancies, 0);
  const filled = vacancyJobs.reduce((n, j) => n + Math.min(j.vacancies, allApplications.filter(a => id(a.job) === id(j) && a.status === 'hired').length), 0);
  const ratings = allUsers.filter(u => u.role === 'employer' && same(u.employerProfile?.industry, 'industry')).flatMap(u => u.employerProfile?.reviews || []).filter(r => inRange(r.createdAt) && Number(r.rating) >= 1 && Number(r.rating) <= 5);
  const vUsers = allUsers.filter(u => same(u.role, 'role') && seekerMatch(u) && same(verificationStatus(u), 'verificationStatus') && (f.date === 'overall' || inRange(submission(u))));
  const submitted = vUsers.filter(u => verificationStatus(u) !== 'Not Submitted');
  const approved = submitted.filter(u => verificationStatus(u) === 'Approved'),
    declined = submitted.filter(u => verificationStatus(u) === 'Declined');
  const onHold = submitted.filter(u => verificationStatus(u) === 'On Hold' || docEntries(u).some(d => d.status === 'hold'));
  const verificationNote = 'One account per current verification status; date filter uses earliest retained document upload. Resubmission history is incomplete; this is not a historical decision rate.';
  const appNote = 'Application cohort selected by submission date; current outcomes as of report generation. Cancelled applications excluded from hire-rate denominator.';
  const global = [metric('Total Registered Users', users.length, '', 'Distinct jobseeker/employer accounts by registration date. Role, campus, course and graduation year apply; job/application filters do not.'), metric('Total Job Posts', jobs.length, '', 'Published non-draft jobs by publishedAt, including archived posts. Job filters apply; campus/course/year and application status do not. Missing publication dates excluded.'), metric('Total Applications', apps.length, '', appNote), metric('Hire Rate', percent(hires.length, eligible.length), '%', `${hires.length} currently hired / ${eligible.length} non-cancelled applications. ${appNote}`)];
  const monthly = new Map();
  const bucket = d => {
    if (!validDate(d)) return null;
    const p = analyticsManilaParts(d);
    const k = `${p.year}-${String(p.month + 1).padStart(2, '0')}`;
    if (!monthly.has(k)) monthly.set(k, {
      name: k,
      Users: 0,
      Jobs: 0,
      Applications: 0,
      Jobseekers: 0,
      Employers: 0,
      Hired: 0,
      Eligible: 0
    });
    return monthly.get(k);
  };
  users.forEach(u => {
    const b = bucket(u.createdAt);
    b.Users++;
    b[u.role === 'jobseeker' ? 'Jobseekers' : 'Employers']++;
  });
  jobs.forEach(j => bucket(j.publishedAt).Jobs++);
  apps.forEach(a => {
    const b = bucket(applied(a));
    b.Applications++;
    if (a.status === 'hired') b.Hired++;
    if (a.status !== 'cancelled') b.Eligible++;
  });
  if (monthly.size) {
    const keys = [...monthly.keys()].sort();
    const start = range.start || new Date(keys[0] + '-01T00:00:00+08:00'),
      end = range.end || new Date(keys[keys.length - 1] + '-01T00:00:00+08:00');
    let p = analyticsManilaParts(start),
      q = analyticsManilaParts(end);
    for (let y = p.year, m = p.month; y < q.year || y === q.year && m <= q.month;) {
      bucket(new Date(Date.UTC(y, m, 15)));
      m++;
      if (m === 12) {
        m = 0;
        y++;
      }
    }
  }
  const trend = [...monthly.values()].sort((a, b) => a.name.localeCompare(b.name));
  const campus = count(apps, a => attribute(um.get(id(a.jobseeker)), 'campus')).map(r => {
    const subset = apps.filter(a => attribute(um.get(id(a.jobseeker)), 'campus') === r.name && a.status !== 'cancelled');
    return {
      name: r.name,
      value: percent(subset.filter(a => a.status === 'hired').length, subset.length),
      applications: subset.length
    };
  });
  const course = grouped(apps, a => attribute(um.get(id(a.jobseeker)), 'course'), a => attribute(um.get(id(a.jobseeker)), 'campus'));
  const mode = grouped(apps, a => jm.get(id(a.job))?.workMode || 'Unspecified', a => jm.get(id(a.job))?.jobType || 'Unspecified');
  const vc = grouped(vUsers.filter(u => u.role === 'jobseeker'), u => attribute(u, 'campus'), verificationStatus);
  const vm = grouped(submitted.filter(u => validDate(submission(u))), u => {
    const p = analyticsManilaParts(submission(u));
    return `${p.year}-${String(p.month + 1).padStart(2, '0')}`;
  }, u => u.role);
  vm.rows.sort((a, b) => a.name.localeCompare(b.name));
  const reasons = role => submitted.filter(u => u.role === role).flatMap(u => [...(docs(u).rejectionReasons || []).map(r => ({
    name: `Declined: ${r}`
  })), ...(verificationStatus(u) === 'On Hold' ? (docs(u).resubmitRequest?.documentReasons || []).map(r => ({
    name: `Hold: ${r.reason}`
  })) : [])]);
  const sections = {
    Overview: {
      metrics: [],
      charts: [chart('Activity over time', 'line', trend, ['Users', 'Jobs', 'Applications'], 'Monthly event counts. Months without activity are shown as zero.'), chart('Hire rate over time', 'line', trend.map(r => ({
        name: r.name,
        value: percent(r.Hired, r.Eligible)
      })), ['value'], 'Current hired outcome by application-submission month; gaps mean no eligible applications.', '%'), chart('Hiring outcomes by campus', 'horizontal', campus, ['value'], 'Currently hired / non-cancelled applications in each campus.', '%'), chart('System growth breakdown', 'bar', trend, ['Jobseekers', 'Employers', 'Jobs']), chart('Applications by course and campus', 'stacked', course.rows, course.series)]
    },
    Applications: {
      metrics: [metric('Application Review Rate', percent(seen.length, apps.length), '%', `${seen.length} applications with employer view evidence / ${apps.length} submitted applications.`), metric('Applications Before First Hire', mean(effort), '', 'Average earlier submissions before the successful application, among jobseekers whose first recorded hire is in the date range. Successful application excluded; missing hire dates excluded.'), metric('Time to First Response', mean(responseDays), 'days', `First recorded employer message or stage action minus submission. Views excluded; ${responseDays.length} applications with dated responses.`), metric('Interview Conversion Rate', percent(seenInterview.length, seen.length), '%', `${seenInterview.length} reviewed applications with interview evidence / ${seen.length} reviewed applications. No interview inferred from hire.`), metric('Application Drop-offs', apps.filter(a => ['declined', 'withdrawn', 'cancelled', 'vacancy full'].includes(a.status)).length, '', 'Distinct applications currently declined, withdrawn, cancelled or vacancy full.')],
      charts: [chart('Recruitment progression', 'funnel', [{
        name: 'Applied',
        value: apps.length
      }, {
        name: 'Viewed',
        value: seen.length
      }, {
        name: 'For Interview',
        value: interviews.length
      }, {
        name: 'Hired',
        value: hires.length
      }], ['value'], 'Recorded stage reach, not current-status buckets. Stages may be skipped; missing legacy history can affect counts.'), chart('Application drop-offs', 'horizontal', count(apps.filter(a => ['declined', 'withdrawn', 'cancelled', 'vacancy full'].includes(a.status)), a => a.status)), chart('Applications by work mode and job type', 'bar', mode.rows, mode.series), chart('Employer decline reasons', 'horizontal', count(apps.filter(a => a.status === 'declined'), a => a.declineReason)), chart('Applications by required experience', 'horizontal', count(apps, a => jm.get(id(a.job))?.experienceLevel))]
    },
    'Job Offers': {
      metrics: [metric('Active Job Posts', active.length, '', 'Currently published, active, non-archived and not past deadline, among jobs published in the selected period.'), metric('Vacancy Fill Rate', percent(filled, vacancies), '%', `${filled} filled slots / ${vacancies} vacancies. Uses the existing job-controller rule: current hired applications per job, capped at that job’s vacancies. Publication cohort; not a historical occupancy measure.`), metric('Urgent Postings', percent(active.filter(j => j.isUrgent).length, active.length), '%', 'Urgent current active posts / current active posts in the publication cohort.'), metric('Pending Job Edit Requests', edits.filter(e => e.status === 'pending').length, '', 'Currently pending requests by request creation date, with job and request-status filters.'), metric('Average Employer Rating', mean(ratings.map(r => Number(r.rating))), ' / 5', `${ratings.length} individual ratings by rating creation date. Industry filter applies; job, campus and application filters do not.`)],
      charts: [chart('Job listings by industry', 'horizontal', count(active, j => um.get(id(j.employer))?.employerProfile?.industry)), chart('Edit requests by target section', 'horizontal', count(edits.flatMap(e => unique(e.requestedSections || [])), x => x), ['value'], 'One request can include several sections; section counts may exceed request count.'), chart('Educational requirements', 'horizontal', count(jobs, j => j.educationLevel)), chart('Average salary by work mode', 'bar', [], ['value'], 'Unavailable: salary currency/pay-period metadata is not stored consistently. No salary averages are inferred.', 'salary')]
    },
    Verification: {
      metrics: [metric('Pending Verification', submitted.filter(u => verificationStatus(u) === 'Pending').length, '', verificationNote), metric('Verification Approval Rate', percent(approved.length, approved.length + declined.length), '%', `${approved.length} currently approved / ${approved.length + declined.length} accounts with approved or declined status. ${verificationNote}`), metric('Verification Turnaround Time', null, 'days', 'Unavailable: complete submission-attempt and final-decision histories are required for both roles.'), metric('Verification Declined Rate', percent(declined.length, approved.length + declined.length), '%', verificationNote), metric('Document Hold Rate', percent(onHold.length, submitted.length), '%', `${onHold.length} accounts currently on hold or with held documents / ${submitted.length} submitted accounts. Current state, not historical hold events.`)],
      charts: [chart('Jobseeker verification by campus', 'stacked', vc.rows, vc.series, verificationNote), chart('Employer verification status', 'bar', count(vUsers.filter(u => u.role === 'employer'), verificationStatus)), chart('Employer decline and hold reasons', 'horizontal', count(reasons('employer'), r => r.name), ['value'], 'Recorded reasons only; an account can have multiple reasons.'), chart('Alumni decline and hold reasons', 'horizontal', count(reasons('jobseeker'), r => r.name), ['value'], 'Recorded reasons only; an account can have multiple reasons.'), chart('Verification submissions by role', 'bar', vm.rows, vm.series, 'Earliest retained document upload per account; not a count of resubmission attempts.')]
    }
  };
  const options = {
    role: ['jobseeker', 'employer'],
    applicationStatus: unique(allApplications.map(a => a.status)),
    verificationStatus: ['Pending', 'Approved', 'Declined', 'On Hold', 'Not Submitted'],
    editRequestStatus: unique(allEdits.map(e => e.status)),
    industry: unique(allUsers.filter(u => u.role === 'employer').map(u => u.employerProfile?.industry))
  };
  ['campus', 'course', 'yearGraduated'].forEach(k => options[k] = unique(allUsers.filter(u => u.role === 'jobseeker').map(u => attribute(u, k))));
  ['jobType', 'workMode', 'educationLevel', 'experienceLevel'].forEach(k => options[k] = unique(allJobs.map(j => j[k])));
  options.jobStatus = unique(allJobs.map(j => j.status));
  return {
    generatedAt: now.toISOString(),
    timezone: 'Asia/Manila',
    filters: f,
    range,
    options,
    global,
    sections,
    notes: [appNote, verificationNote, 'Filters apply only to related metrics. Campus/course/year: users, applications and jobseeker verification; role: users and verification; job attributes: jobs, applications and edit requests; application status: applications; verification status: verification; edit status: edit requests.', 'User campus/course/year use current profile attributes. Archived records are retained; deleted users are excluded. Test records cannot be automatically identified without a test flag.', `${published.filter(j => !validDate(j.publishedAt)).length} non-draft jobs lack publication dates and are excluded from publication-date metrics. Missing data is displayed as unavailable, never invented.`]
  };
}
exports.getAnalytics = async (req, res) => {
  let f;
  try {
    f = cleanFilters(req.query);
  } catch (e) {
    return res.status(400).json({
      message: e.message
    });
  }
  try {
    const [users, jobs, applications, edits] = await Promise.all([User.find({
      role: {
        $in: ['jobseeker', 'employer']
      },
      status: {
        $ne: 'deleted'
      },
      deletedAt: null
    }).select('role createdAt jobSeekerProfile.campus jobSeekerProfile.course jobSeekerProfile.yearGraduated jobSeekerProfile.educationEntries jobSeekerProfile.verificationDocs employerProfile.industry employerProfile.verificationDocs employerProfile.reviews').lean(), Job.find({}).select('employer status isPublished isActive isArchived publishedAt applicationDeadline jobType workMode educationLevel experienceLevel isUrgent vacancies').lean(), Application.find({}).select('job jobseeker employer status appliedAt createdAt viewedAt hiredAt isViewedByEmployer activityHistory interviewSchedule.setAt declineReason').lean(), JobEditRequest.find({}).select('job status createdAt requestedSections').lean()]);
    res.json(buildReport({
      users,
      jobs,
      applications,
      edits
    }, f));
  } catch (e) {
    console.error('Analytics report failed:', e);
    res.status(500).json({
      message: 'Unable to load analytics. Please try again.'
    });
  }
};
exports.logExport = async (req, res) => {
  try {
    const sections = req.body.sections,
      format = req.body.format;
    if (!Array.isArray(sections) || !sections.length || sections.some(s => !['Overview', 'Applications', 'Job Offers', 'Verification'].includes(s)) || !['xlsx', 'pdf'].includes(format) || !validDate(req.body.generatedAt)) return res.status(400).json({
      message: 'Invalid export selection.'
    });
    const filters = cleanFilters(req.body.filters || {});
    await SystemLog.create({
      actor: req.user?._id || req.user?.id || null,
      actorRole: 'admin',
      action: 'analytics_export',
      actionLabel: 'Analytics export requested',
      module: 'Analytics',
      status: 'success',
      description: 'Analytics export requested from the displayed snapshot.',
      metadata: {
        sections,
        format,
        generatedAt: req.body.generatedAt,
        filters
      }
    });
    res.json({
      success: true
    });
  } catch (e) {
    res.status(500).json({
      message: 'Unable to record export request. Please try again.'
    });
  }
};
exports._test = {
  buildReport,
  cleanFilters
};
