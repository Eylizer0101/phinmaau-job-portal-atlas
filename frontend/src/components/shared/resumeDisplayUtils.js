const EMPTY_RESUME_TEXT = /^(?:null|undefined|n\/?a|not\s+provided)$/i;
const NON_DISPLAY_KEYS = new Set(['_id', 'id', 'createdAt', 'updatedAt', '__v']);

const stripMarkup = (value) =>
  String(value ?? '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();

export const isMeaningfulResumeValue = (value) => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'boolean') return false;

  if (Array.isArray(value)) {
    return value.some(isMeaningfulResumeValue);
  }

  if (typeof value === 'object') {
    return hasMeaningfulResumeObject(value);
  }

  const text = stripMarkup(value);
  return Boolean(text) && !EMPTY_RESUME_TEXT.test(text);
};

export const hasMeaningfulResumeObject = (item, fields) => {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return false;

  const entries = Array.isArray(fields)
    ? fields.map((field) => [field, item[field]])
    : Object.entries(item).filter(([key]) => !NON_DISPLAY_KEYS.has(key));

  return entries.some(([, value]) => isMeaningfulResumeValue(value));
};

export const filterMeaningfulResumeItems = (items, fields) =>
  (Array.isArray(items) ? items : []).filter((item) => {
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      return hasMeaningfulResumeObject(item, fields);
    }

    return isMeaningfulResumeValue(item);
  });

export const hasMeaningfulResumeRows = (columns) =>
  (Array.isArray(columns) ? columns : []).some((column) =>
    (Array.isArray(column) ? column : []).some((row) =>
      isMeaningfulResumeValue(Array.isArray(row) ? row[1] : row?.value)
    )
  );

export const getResumeSalaryDisplay = (profile = {}, viewerMode = 'jobseeker') => {
  const privacy = String(profile?.salaryPrivacy || 'only_me').trim().toLowerCase();
  const isEmployerViewer = viewerMode === 'employer';

  if (isEmployerViewer && (profile?.salaryHidden === true || privacy === 'only_me')) {
    return "Salary hidden due to user's privacy settings.";
  }

  return [profile?.minimumSalary, profile?.maximumSalary]
    .filter(isMeaningfulResumeValue)
    .join(' - ');
};

export const OPTIONAL_RESUME_SECTION_KEYS = [
  'seminars',
  'awards',
  'certifications',
  'projects',
  'affiliations',
  'cocurricular',
  'references',
];

export const normalizeAddedResumeSections = (sections = [], profile = {}) => {
  const requestedSections = Array.isArray(sections)
    ? sections.filter((key) => OPTIONAL_RESUME_SECTION_KEYS.includes(key))
    : [];

  const sectionsWithExistingData = OPTIONAL_RESUME_SECTION_KEYS.filter((key) =>
    filterMeaningfulResumeItems(profile?.[key]).length > 0
  );

  return OPTIONAL_RESUME_SECTION_KEYS.filter((key) =>
    requestedSections.includes(key) || sectionsWithExistingData.includes(key)
  );
};

export const isOptionalResumeSectionVisible = (profile = {}, sectionKey) => {
  if (!OPTIONAL_RESUME_SECTION_KEYS.includes(sectionKey)) return false;

  const addedSections = normalizeAddedResumeSections(
    profile?.addedResumeSections,
    profile
  );

  return (
    addedSections.includes(sectionKey) &&
    filterMeaningfulResumeItems(profile?.[sectionKey]).length > 0
  );
};
