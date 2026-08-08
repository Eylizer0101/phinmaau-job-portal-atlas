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
