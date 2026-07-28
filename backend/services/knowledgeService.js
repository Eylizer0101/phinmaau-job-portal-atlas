const fs = require('fs');
const path = require('path');

const KNOWLEDGE_DIRECTORY = path.join(__dirname, '..', 'knowledge');
const MAX_FILE_SIZE_BYTES = 250 * 1024;

const STOP_WORDS = new Set([
  'a', 'about', 'after', 'all', 'also', 'an', 'and', 'any', 'are', 'as', 'at', 'be',
  'because', 'before', 'but', 'by', 'can', 'do', 'does', 'for', 'from', 'get', 'give',
  'how', 'i', 'if', 'in', 'is', 'it', 'me', 'my', 'of', 'on', 'or', 'our', 'please',
  'should', 'so', 'that', 'the', 'their', 'them', 'there', 'this', 'to', 'use', 'using',
  'was', 'we', 'what', 'when', 'where', 'which', 'who', 'why', 'will', 'with', 'you',
  'your',
]);

let knowledgeCache = {
  signature: '',
  documents: [],
};

const normalizeText = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const tokenize = (value) =>
  [...new Set(
    normalizeText(value)
      .split(' ')
      .map((word) => word.trim())
      .filter((word) => word.length >= 2 && !STOP_WORDS.has(word))
  )];

const isHeading = (value) => {
  const line = String(value || '').trim();
  if (!line || line.length > 120) return false;
  if (/^#{1,6}\s+/.test(line)) return true;
  if (/^[A-Z0-9][A-Z0-9 &/()'’.,:?-]{3,}$/.test(line)) return true;
  return false;
};

const splitKnowledgeIntoChunks = (content, fileName) => {
  const lines = String(content || '').replace(/\r\n/g, '\n').split('\n');
  const chunks = [];
  let currentTitle = fileName.replace(/\.txt$/i, '').replace(/[-_]+/g, ' ');
  let currentLines = [];

  const flush = () => {
    const text = currentLines.join('\n').trim();
    if (!text) return;

    const maxChunkLength = 2600;
    if (text.length <= maxChunkLength) {
      chunks.push({ title: currentTitle, text });
    } else {
      const paragraphs = text.split(/\n{2,}/).map((item) => item.trim()).filter(Boolean);
      let buffer = '';

      paragraphs.forEach((paragraph) => {
        const next = buffer ? `${buffer}\n\n${paragraph}` : paragraph;
        if (next.length > maxChunkLength && buffer) {
          chunks.push({ title: currentTitle, text: buffer });
          buffer = paragraph;
        } else {
          buffer = next;
        }
      });

      if (buffer) chunks.push({ title: currentTitle, text: buffer });
    }

    currentLines = [];
  };

  lines.forEach((line) => {
    if (isHeading(line)) {
      flush();
      currentTitle = line.replace(/^#{1,6}\s+/, '').trim();
      return;
    }

    if (!line.trim() && currentLines.length && currentLines[currentLines.length - 1] === '') {
      return;
    }

    currentLines.push(line.trimEnd());
  });

  flush();

  return chunks.map((chunk, index) => ({
    id: `${fileName}:${index + 1}`,
    fileName,
    title: chunk.title,
    text: chunk.text,
    normalized: normalizeText(`${chunk.title} ${chunk.text}`),
  }));
};

const getKnowledgeFiles = () => {
  try {
    if (!fs.existsSync(KNOWLEDGE_DIRECTORY)) return [];

    return fs
      .readdirSync(KNOWLEDGE_DIRECTORY)
      .filter((fileName) => fileName.toLowerCase().endsWith('.txt'))
      .sort((a, b) => a.localeCompare(b));
  } catch (error) {
    console.error('Unable to read AGAPAY knowledge directory:', error);
    return [];
  }
};

const loadKnowledgeDocuments = () => {
  const files = getKnowledgeFiles();
  const signatureParts = [];

  files.forEach((fileName) => {
    try {
      const fullPath = path.join(KNOWLEDGE_DIRECTORY, fileName);
      const stat = fs.statSync(fullPath);
      signatureParts.push(`${fileName}:${stat.size}:${stat.mtimeMs}`);
    } catch {
      signatureParts.push(`${fileName}:unavailable`);
    }
  });

  const signature = signatureParts.join('|');
  if (knowledgeCache.signature === signature && knowledgeCache.documents.length) {
    return knowledgeCache.documents;
  }

  const documents = [];

  files.forEach((fileName) => {
    try {
      const fullPath = path.join(KNOWLEDGE_DIRECTORY, fileName);
      const stat = fs.statSync(fullPath);
      if (!stat.isFile() || stat.size > MAX_FILE_SIZE_BYTES) return;

      const content = fs.readFileSync(fullPath, 'utf8');
      documents.push(...splitKnowledgeIntoChunks(content, fileName));
    } catch (error) {
      console.error(`Unable to load AGAPAY knowledge file ${fileName}:`, error);
    }
  });

  knowledgeCache = { signature, documents };
  return documents;
};

const getRoleBoost = (fileName, role) => {
  const normalizedFile = normalizeText(fileName);
  if (role === 'employer' && normalizedFile.includes('employer')) return 3;
  if (role === 'jobseeker' && normalizedFile.includes('jobseeker')) return 3;
  return 0;
};

const getDomainBoost = (fileName, normalizedQuery, role) => {
  const file = String(fileName || '').toLowerCase();
  const groups = [
    { terms: ['message', 'messages', 'chat', 'conversation'], files: ['messaging-guide.txt'] },
    { terms: ['interview', 'google meet', 'video call', 'on-site', 'onsite'], files: ['interview-guide.txt'] },
    { terms: ['hiring stage', 'assessment', 'final interview', 'job offer stage'], files: ['hiring-process.txt'] },
    { terms: ['application status', 'pending', 'declined', 'withdrawn', 'cancelled', 'vacancy full', 'reactivate application'], files: ['application-status-guide.txt'] },
    { terms: ['verification', 'credential', 'credentials', 'approve account', 'hold account', 'resubmit'], files: ['verification-guide.txt'] },
    { terms: ['notification', 'notifications', 'unread'], files: ['notification-guide.txt'] },
    { terms: ['community', 'post', 'comment', 'reply', 'report content'], files: ['community-guide.txt'] },
    { terms: ['company', 'companies', 'company review', 'saved company'], files: ['company-guide.txt'] },
    { terms: ['draft', 'published', 'filled', 'closed job', 'archive job', 'saved job', 'recommended job', 'post a job'], files: ['job-management-guide.txt'] },
    { terms: ['developer', 'developers', 'developed agapay', 'who made agapay', 'who created agapay', 'what is agapay', 'about agapay'], files: ['agapay-overview.txt', 'frequently-asked-questions.txt'] },
  ];

  let boost = 0;
  groups.forEach((group) => {
    if (group.terms.some((term) => normalizedQuery.includes(term)) && group.files.includes(file)) {
      boost += 12;
    }
  });

  if (role === 'jobseeker' && ['apply', 'resume', 'profile', 'registration'].some((term) => normalizedQuery.includes(term)) && file === 'jobseeker-guide.txt') {
    boost += 10;
  }

  if (role === 'employer' && ['applicant', 'company profile', 'registration', 'employer', 'manage applicants'].some((term) => normalizedQuery.includes(term)) && file === 'employer-guide.txt') {
    boost += 10;
  }

  return boost;
};

const scoreKnowledgeChunk = ({ chunk, query, queryTokens, role }) => {
  const normalizedQuery = normalizeText(query);
  let score = getRoleBoost(chunk.fileName, role) + getDomainBoost(chunk.fileName, normalizedQuery, role);

  if (!normalizedQuery) return score;

  if (chunk.normalized.includes(normalizedQuery)) score += 12;

  const titleText = normalizeText(`${chunk.fileName} ${chunk.title}`);
  queryTokens.forEach((token) => {
    if (titleText.includes(token)) score += 3.5;
    if (chunk.normalized.includes(token)) score += 1.25;
  });

  const importantPhrases = [
    'what is agapay',
    'who developed agapay',
    'developer of agapay',
    'application status',
    'hiring stage',
    'schedule interview',
    'verification status',
    'post a job',
    'apply for a job',
    'message employer',
    'saved job',
    'community post',
  ];

  importantPhrases.forEach((phrase) => {
    if (normalizedQuery.includes(phrase) && chunk.normalized.includes(phrase)) score += 8;
  });

  if (chunk.fileName === 'agapay-overview.txt') score += 0.75;
  if (chunk.fileName === 'frequently-asked-questions.txt') score += 0.5;

  return score;
};

const getRelevantKnowledge = ({
  query,
  role = 'jobseeker',
  maxChunks = 7,
  maxCharacters = 12000,
  minimumScore = 4.5,
} = {}) => {
  const documents = loadKnowledgeDocuments();
  const queryTokens = tokenize(query);

  const scored = documents
    .map((chunk) => ({
      ...chunk,
      score: scoreKnowledgeChunk({ chunk, query, queryTokens, role }),
    }))
    .sort((a, b) => b.score - a.score || a.fileName.localeCompare(b.fileName));

  const maxScore = Number(scored[0]?.score || 0);
  const numericMinimumScore = Number(minimumScore);
  const baseMinimumScore = Number.isFinite(numericMinimumScore)
    ? Math.max(0, numericMinimumScore)
    : 4.5;
  const effectiveMinimumScore = Math.max(baseMinimumScore, maxScore * 0.3);

  const selected = [];
  let characterCount = 0;

  scored.forEach((chunk) => {
    if (selected.length >= maxChunks) return;
    if (chunk.score < effectiveMinimumScore) return;

    const formatted = `[Knowledge file: ${chunk.fileName} | Section: ${chunk.title}]\n${chunk.text}`;
    if (characterCount + formatted.length > maxCharacters && selected.length > 0) return;

    selected.push({ ...chunk, formatted });
    characterCount += formatted.length;
  });

  return {
    context: selected.map((item) => item.formatted).join('\n\n---\n\n'),
    sources: [...new Set(selected.map((item) => item.fileName))],
    chunkCount: selected.length,
    matched: selected.length > 0,
    maxScore,
  };
};

const getKnowledgeStats = () => {
  const documents = loadKnowledgeDocuments();
  return {
    fileCount: new Set(documents.map((item) => item.fileName)).size,
    chunkCount: documents.length,
    ready: documents.length > 0,
  };
};

module.exports = {
  getRelevantKnowledge,
  getKnowledgeStats,
};
