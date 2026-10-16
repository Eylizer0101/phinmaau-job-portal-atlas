// Shared evidence-based job recommendations and notifications. No generic objective matching.
const clean = (value) => String(value || '').toLowerCase().replace(/<[^>]*>/g, ' ')
  .replace(/[^a-z0-9+#\s-]/g, ' ').replace(/\s+/g, ' ').trim();
const words = (value) => clean(value).split(' ').filter((word) => word.length >= 4 &&
  !['staff','assistant','office','work','with','from','this','that','team','company','skills','degree','master','bachelor','graduate','experience','years','requirements','position'].includes(word));
const values = (value) => Array.isArray(value) ? value.flatMap(values) : value == null ? [] :
  typeof value === 'object' ? [value.skill, value.name, value.title].filter(Boolean).flatMap(values) :
  String(value).split(/[,;\n|]+/).map(clean).filter(Boolean);
const exact = (a, b) => clean(a) === clean(b);
const calculateJobMatchForUser = (job = {}, user = {}) => {
  const profile = user.jobSeekerProfile || {};
  const required = [...new Set(values(job.skillsRequired))];
  const applicant = [...new Set([...values(profile.skillRows), ...values(profile.technicalSkills), ...values(profile.softSkills)])];
  const matchedSkills = required.filter((skill) => applicant.some((item) => exact(item, skill)));
  const roleWords = words(`${job.title || ''} ${job.category || ''}`);
  const experiences = Array.isArray(profile.workExperiences) ? profile.workExperiences : [];
  const relevantExperience = experiences.some((item) => {
    const titleWords = words(item.positionTitle || item.title);
    return roleWords.some((word) => titleWords.includes(word));
  });
  const courseWords = words(`${profile.course || ''} ${profile.studyField || ''}`);
  const courseRelevant = courseWords.some((word) => roleWords.includes(word));
  // Match notifications need role-specific evidence, not just equal work arrangements or generic prose.
  const relevantEvidence = matchedSkills.length > 0 || relevantExperience || courseRelevant;
  const score = Math.min(100, Math.round(
    (required.length ? 65 * matchedSkills.length / required.length : 0) +
    (relevantExperience ? 25 : 0) + (courseRelevant ? 10 : 0)
  ));
  return { score, matchedKeywords: [...matchedSkills, ...(relevantExperience ? ['relevant job experience'] : []), ...(courseRelevant ? ['relevant course'] : [])].slice(0, 10), relevantEvidence };
};
module.exports = { calculateJobMatchForUser };
