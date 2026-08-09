import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  filterMeaningfulResumeItems,
  hasMeaningfulResumeRows,
  isMeaningfulResumeValue,
  normalizeAddedResumeSections,
} from '../../../components/shared/resumeDisplayUtils';

const getText = (value, fallback = '') => {
  const text = String(value || '').trim();
  return isMeaningfulResumeValue(text) ? text : fallback;
};

const formatBirthdayDisplay = (value = '') => {
  const clean = String(value || '').trim();
  if (!clean) return '';

  const isoMatch = clean.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const date = new Date(Number(year), Number(month) - 1, Number(day));

    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    }
  }

  const parsedDate = new Date(clean);
  if (Number.isNaN(parsedDate.getTime())) return clean;

  return parsedDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

const SHORT_MONTH_NAMES = { January: 'Jan', February: 'Feb', March: 'Mar', April: 'Apr', May: 'May', June: 'Jun', July: 'Jul', August: 'Aug', September: 'Sep', October: 'Oct', November: 'Nov', December: 'Dec' };

const formatShortResumeDate = (value = '') => String(value || '').replace(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/g, (month) => SHORT_MONTH_NAMES[month] || month).replace(/\s+(?:-|–|—|to)\s+/gi, ' – ').replace(/\s+/g, ' ').trim();

const escapeResumeHtml = (value = '') => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const sanitizeResumeRichText = (value = '') => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (!/<\/?[a-z][\s\S]*>/i.test(raw)) return escapeResumeHtml(raw).replace(/\n/g, '<br>');
  if (typeof window === 'undefined' || typeof window.DOMParser === 'undefined') return escapeResumeHtml(raw);

  const allowedTags = new Set(['B','STRONG','I','EM','U','P','DIV','BR','UL','OL','LI','H1','H2','BLOCKQUOTE']);
  const textAlignmentTags = new Set(['P', 'DIV', 'UL', 'OL', 'LI', 'H1', 'H2', 'BLOCKQUOTE']);
  const allowedTextAlignments = new Set(['left', 'center', 'right', 'justify']);
  const parser = new window.DOMParser();
  const doc = parser.parseFromString(`<div>${raw}</div>`, 'text/html');
  const wrapper = doc.body.firstElementChild;
  if (!wrapper) return '';

  const cleanNode = (node) => {
    Array.from(node.childNodes).forEach((child) => {
      if (child.nodeType !== window.Node.ELEMENT_NODE) return;

      if (!allowedTags.has(child.tagName)) {
        child.replaceWith(...Array.from(child.childNodes));
        return;
      }

      const inlineAlignment = String(child.style?.textAlign || '').toLowerCase();
      const alignAttribute = String(child.getAttribute('align') || '').toLowerCase();
      const textAlignment = allowedTextAlignments.has(inlineAlignment)
        ? inlineAlignment
        : allowedTextAlignments.has(alignAttribute)
          ? alignAttribute
          : '';

      Array.from(child.attributes).forEach((attribute) => {
        child.removeAttribute(attribute.name);
      });

      if (textAlignment && textAlignmentTags.has(child.tagName)) {
        child.style.textAlign = textAlignment;
      }

      cleanNode(child);
    });
  };

  cleanNode(wrapper);
  return wrapper.innerHTML;
};

const ResumeRichText = ({ value, className = '' }) => {
  const html = sanitizeResumeRichText(value);
  if (!html) return null;
  return <div className={`resume-rich-text ${className}`} dangerouslySetInnerHTML={{ __html: html }} />;
};

const toArray = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || '').trim())
      .filter(isMeaningfulResumeValue);
  }

  if (typeof value === 'string') {
    const clean = value.trim();
    if (!isMeaningfulResumeValue(clean)) return [];

    const parts = clean.includes('||')
      ? clean.split('||')
      : /\s[—-]\s(Basic|Novice|Intermediate|Advanced|Expert)$/i.test(clean)
        ? [clean]
        : clean.split(',');

    return parts
      .map((item) => item.trim())
      .filter(isMeaningfulResumeValue);
  }

  return [];
};

const buildName = (formData = {}) =>
  [formData.firstName, formData.middleName, formData.lastName, formData.extensionName]
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .join(' ');

const buildInitials = (fullName = '') => {
  const parts = fullName.split(' ').filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return (fullName || 'JA').slice(0, 2).toUpperCase();
};

const formatMonthYear = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return formatShortResumeDate(value);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};

const getDateRange = (item = {}) => {
  if (item.date) return formatShortResumeDate(item.date);

  const start = item.startDate ? formatMonthYear(item.startDate) : '';
  const end = item.isPresent ? 'Present' : item.endDate ? formatMonthYear(item.endDate) : '';

  if (start && end) return `${start} – ${end}`;
  if (start) return start;
  if (end) return end;
  return '';
};

const getEducationDateRange = (entry = {}) => {
  const startMonth = getText(entry.startMonth);
  const startYear = getText(entry.startYear);
  const endMonth = getText(entry.endMonth);
  const endYear = getText(entry.endYear || entry.yearGraduated);

  const start = formatShortResumeDate([startMonth, startYear].filter(Boolean).join(' '));
  const end = formatShortResumeDate([endMonth, endYear].filter(Boolean).join(' '));

  if (start && end) return `${start} – ${end}`;
  return end || start;
};


const getProfileImageUrl = (url = '') => {
  const cleanUrl = String(url || '').trim();
  if (!cleanUrl) return '';
  if (/^https?:\/\//i.test(cleanUrl) || cleanUrl.startsWith('data:') || cleanUrl.startsWith('blob:')) return cleanUrl;

  const apiBase = process.env.REACT_APP_API_URL || 'https://phinmaau-job-portal-atlas.onrender.com/api';
  const serverBase = apiBase.replace(/\/api\/?$/, '');
  return cleanUrl.startsWith('/') ? `${serverBase}${cleanUrl}` : `${serverBase}/${cleanUrl}`;
};

const ResumePhoto = ({ src, initials, fullName }) => {
  const [imageFailed, setImageFailed] = useState(false);
  const imageUrl = getProfileImageUrl(src);

  if (imageUrl && !imageFailed) {
    return (
      <div className="resume-photo">
        <img
          src={imageUrl}
          alt={fullName || 'Profile photo'}
          onError={() => setImageFailed(true)}
        />
      </div>
    );
  }

  return <div className="resume-initials">{initials}</div>;
};

const splitDetails = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return [];

  return raw
    .split(/\n|•|\*|;/)
    .map((item) => item.trim())
    .filter(Boolean);
};

const Section = ({ title, children, hidden = false }) => {
  if (hidden) return null;

  return (
    <section className="resume-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
};

const ThreeColumnRows = ({ columns = [] }) => (
  <div className="three-column-rows">
    {columns.map((column, columnIndex) => (
      <div className="info-column" key={`info-column-${columnIndex}`}>
        {column.map((row) =>
          getText(row.value) ? (
            <div className="info-row" key={row.label}>
              <span className="info-label">{row.label}:</span>
              <span className="info-value">{row.value}</span>
            </div>
          ) : null
        )}
      </div>
    ))}
  </div>
);

const DatedItem = ({ title, subtitle, date, description, details, meta }) => {
  const detailItems = Array.isArray(details) ? details.filter(isMeaningfulResumeValue) : [];
  return (
    <div className="dated-item">
      <div className="dated-header"><div className="dated-main">{isMeaningfulResumeValue(title) ? <div className="item-title">{title}</div> : null}{isMeaningfulResumeValue(subtitle) ? <div className="item-subtitle">{subtitle}</div> : null}{isMeaningfulResumeValue(meta) ? <div className="item-meta">{meta}</div> : null}</div>{isMeaningfulResumeValue(date) ? <div className="item-date">{formatShortResumeDate(date)}</div> : null}</div>
      {detailItems.length ? <ul className="resume-bullets">{detailItems.map((detail, index) => <li key={`${title}-${index}`}>{detail}</li>)}</ul> : <ResumeRichText value={description} />}
    </div>
  );
};

const ProfileListSection = ({ title, items = [], type = 'default' }) => {
  const cleanItems = filterMeaningfulResumeItems(items);

  if (!cleanItems.length) return null;

  return (
    <Section title={title}>
      {type === 'references' ? (
        <div className="references-grid">
          {cleanItems.map((item, index) => (
            <div className="reference-card" key={item._id || `${title}-${index}`}>
              {getText(item.name) ? <div className="item-title">{getText(item.name)}</div> : null}
              {[item.position, item.company].filter(Boolean).join(' / ') ? (
                <div className="item-subtitle">{[item.position, item.company].filter(Boolean).join(' / ')}</div>
              ) : null}
              {getText(item.phone) ? <div>{item.phone}</div> : null}
              {getText(item.email) ? <div className="link-text">{item.email}</div> : null}
            </div>
          ))}
        </div>
      ) : (
        cleanItems.map((item, index) => {
          const titleText = getText(item.title || item.organization || item.name);
          const subtitle =
            type === 'awards'
              ? getText(item.issuer ? `Issued by: ${item.issuer}` : '')
              : getText(item.role || item.issuer || item.organization || item.company);

          return (
            <DatedItem
              key={item._id || `${title}-${index}`}
              title={titleText}
              subtitle={subtitle}
              date={getDateRange(item)}
              description={item.description}
            />
          );
        })
      )}
    </Section>
  );
};

const ResumePreviewPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const storedData = useMemo(() => {
    try {
      return JSON.parse(sessionStorage.getItem('resumePreviewData') || 'null');
    } catch {
      return null;
    }
  }, []);

  const searchParams = new URLSearchParams(location.search);
  const shouldAutoDownload = searchParams.get('download') === '1';

  const userData = storedData?.userData || {};
  const formData = storedData?.formData || {};
  const profileImage = userData?.profileImage || formData?.profileImage || '';
  const returnTo = storedData?.returnTo || '/jobseeker/my-profile';
  const viewerMode = storedData?.viewerMode || 'jobseeker';
  const isEmployerPreview = viewerMode === 'employer';
  const isAdminPreview = viewerMode === 'admin';
  const workExperiences = Array.isArray(storedData?.workExperiences) ? storedData.workExperiences : [];
  const fullName = buildName(formData) || 'Your Name';
  const initials = buildInitials(fullName);

  const educationEntries = Array.isArray(formData.educationEntries) ? formData.educationEntries : [];
  const technicalSkills = toArray(formData.technicalSkills);
  const softSkills = toArray(formData.softSkills);
  const allSkills = [...technicalSkills, ...softSkills].filter(isMeaningfulResumeValue);
  const certifications = Array.isArray(formData.certifications) ? formData.certifications : [];
  const projects = Array.isArray(formData.projects) ? formData.projects : [];
  const seminars = Array.isArray(formData.seminars) ? formData.seminars : [];
  const awards = Array.isArray(formData.awards) ? formData.awards : [];
  const affiliations = Array.isArray(formData.affiliations) ? formData.affiliations : [];
  const cocurricular = Array.isArray(formData.cocurricular) ? formData.cocurricular : [];
  const references = Array.isArray(formData.references) ? formData.references : [];
  const addedResumeSections = normalizeAddedResumeSections(
    formData.addedResumeSections,
    formData
  );
  const showOptionalSection = (sectionKey, items) =>
    addedResumeSections.includes(sectionKey) &&
    filterMeaningfulResumeItems(items).length > 0;
  const meaningfulWorkExperiences = filterMeaningfulResumeItems(workExperiences);
  const meaningfulEducationEntries = filterMeaningfulResumeItems(educationEntries);
  const educationSummary = [
    getText(formData.campus),
    getText(formData.course),
    formData.yearGraduated ? `Class of ${formData.yearGraduated}` : '',
  ]
    .filter(Boolean)
    .join(', ');

  useEffect(() => {
    if (!storedData || !shouldAutoDownload) return;

    const timer = setTimeout(() => window.print(), 500);
    return () => clearTimeout(timer);
  }, [storedData, shouldAutoDownload]);

  if (!storedData) {
    return (
      <div className="min-h-screen bg-[#f4f6f8] px-4 py-8">
        <div className="mx-auto max-w-4xl">
          <button
            type="button"
            onClick={() => navigate(returnTo)}
            className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-xl font-semibold text-gray-700 hover:bg-gray-50"
            aria-label="Close resume preview"
          >
            ×
          </button>

          <div className="rounded-[24px] border border-gray-200 bg-white p-8 shadow-sm">
            <div className="text-2xl font-bold text-gray-900">No resume preview data found</div>
            <div className="mt-2 text-gray-500">Please go back to My Profile and click the Preview button again.</div>
          </div>
        </div>
      </div>
    );
  }

  const personalInformationColumns = [
    [
      { label: 'Preferred Work Mode', value: formData.preferredWorkMode },
      { label: 'Employment Type', value: formData.employmentType },
      { label: 'Willing to Relocate', value: formData.willingToRelocate },
      { label: 'How Soon Can Start', value: formData.howSoonCanYouStart },
      { label: 'Experience', value: formData.experience },
    ],
    [
      { label: 'Preferred Language', value: formData.preferredLanguage },
      { label: 'Educational Attainment', value: formData.educationalAttainment },
      { label: 'Double Degree', value: formData.studyField },
      { label: 'Salary', value: [formData.minimumSalary, formData.maximumSalary].filter(isMeaningfulResumeValue).join(' - ') },
      { label: 'Nationality', value: formData.nationality },
    ],
    [
      { label: 'Height', value: formData.height },
      { label: 'Weight', value: isMeaningfulResumeValue(formData.weight) ? `${String(formData.weight).replace(/\s*(kg|kgs|kilogram|kilograms)$/i, '').trim()} kg` : '' },
      { label: 'Gender', value: formData.gender },
      { label: 'Civil Status', value: formData.civilStatus },
      { label: 'Birthday', value: formatBirthdayDisplay(formData.birthday) },
    ],
  ];

  return (
    <>
      <style>{`
        @page {
          size: A4;
          margin: 0;
        }

        @media print {
          html,
          body {
            width: 210mm;
            min-height: auto;
            background: #ffffff !important;
          }

          .print-hide {
            display: none !important;
          }

          .page-shell {
            padding: 0 !important;
            background: #ffffff !important;
          }

          .preview-document {
            width: 210mm !important;
            margin: 0 !important;
            zoom: 1 !important;
          }

          .resume-paper {
            width: 210mm !important;
            min-height: auto !important;
            margin: 0 !important;
            box-shadow: none !important;
          }

          .resume-inner {
            padding: 16mm 16mm 12mm !important;
          }
        }

        .page-shell {
          min-height: 100vh;
          overflow-x: auto;
          background: #e5e7eb;
          padding: 0 16px 24px;
        }

        .preview-document {
          width: 210mm;
          margin: 0 auto;
          zoom: 1.5;
        }

        .preview-topbar {
          width: 100%;
          margin: 0;
          height: 50px;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0 14px;
          background: #eef0f4;
          border-bottom: 1px solid #d8dbe2;
          color: #111827;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 14px;
          font-weight: 700;
        }

        .preview-close-btn {
          border: 0;
          background: transparent;
          padding: 0;
          margin: 0;
          width: 18px;
          height: 18px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #111827;
          font-size: 20px;
          line-height: 1;
          cursor: pointer;
        }

        .resume-paper {
          width: 100%;
          min-height: 297mm;
          margin: 0;
          background: #ffffff;
          color: #111111;
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 9.2px;
          line-height: 1.18;
          box-shadow: 0 18px 50px rgba(15, 23, 42, 0.18);
        }

        .resume-inner {
          padding: 16mm 16mm 12mm;
          position: relative;
        }

        .resume-header {
          display: flex;
          align-items: flex-start;
          justify-content: center;
          gap: 12px;
          min-height: 62px;
          padding-right: 0;
          text-align: center;
        }

        .resume-header-main {
          flex: 0 1 auto;
          width: fit-content;
          min-width: 0;
          max-width: calc(100% - 73px);
        }

        .resume-name {
          margin: 0;
          padding-top: 5px;
          font-size: 18px;
          line-height: 1;
          font-weight: 700;
          letter-spacing: 0.55px;
          text-transform: uppercase;
        }

        .resume-contact {
          margin-top: 5px;
          color: #222222;
          font-size: 8.7px;
          line-height: 1.4;
          overflow-wrap: anywhere;
        }

        .resume-contact-address {
          display: block;
        }

        .resume-contact-details {
          display: block;
          margin-top: 1px;
        }

        .resume-contact-details span + span::before {
          content: ' • ';
        }

        .resume-education-summary {
          margin-top: 3px;
          color: #222222;
          font-size: 9.2px;
          line-height: 1.35;
          font-style: italic;
        }

        .resume-initials,
        .resume-photo {
          position: static;
          flex: 0 0 61px;
          width: 61px;
          height: 61px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #343434;
          color: #ffffff;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 27px;
          font-weight: 500;
          letter-spacing: 0.8px;
          overflow: hidden;
        }

        .resume-photo img {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
        }

        .resume-section {
          margin-top: 10px;
          break-inside: auto;
        }

        .resume-section h2 {
          margin: 0 0 3px;
          padding-bottom: 2px;
          border-bottom: 1px solid #777777;
          font-size: 8.8px;
          line-height: 1;
          font-weight: 700;
          letter-spacing: 0.25px;
          text-transform: uppercase;
          break-after: avoid-page;
          page-break-after: avoid;
        }

        .resume-section h2 + * {
          break-before: avoid-page;
          page-break-before: avoid;
        }

        .objective-text {
          margin: 0;
          text-align: justify;
        }

        .three-column-rows { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); column-gap: 20px; }
        .references-grid { display: grid; grid-template-columns: 1fr 1fr; column-gap: 35px; }

        .info-row { display: grid; grid-template-columns: max-content minmax(0, 1fr); gap: 4px; min-height: 11px; }

        .info-label,
        .skill-label,
        .item-title {
          font-weight: 700;
        }

        .info-label {
          white-space: nowrap;
          font-size: 8.5px;
        }

        .info-value {
          min-width: 0;
        }

        .dated-item {
          margin-top: 4px;
          break-inside: avoid;
        }

        .dated-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }

        .dated-main {
          min-width: 0;
        }

        .item-title,
        .item-subtitle,
        .item-meta {
          line-height: 1.16;
        }

        .item-subtitle {
          font-style: italic;
        }

        .item-date {
          flex: 0 0 auto;
          max-width: 150px;
          text-align: right;
          font-style: italic;
          white-space: nowrap;
        }

        .resume-bullets {
          margin: 2px 0 0 13px;
          padding: 0;
        }

        .resume-bullets li {
          margin: 0;
          padding-left: 1px;
        }

        .skills-groups { display: flex; flex-direction: column; gap: 3px; }
        .skills-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          grid-template-rows: repeat(3, auto);
          grid-auto-flow: column;
          column-gap: 22px;
          row-gap: 2px;
          margin: 1px 0 0;
          padding: 0;
          list-style: none !important;
        }
        .skill-item {
          position: relative;
          display: block !important;
          color: #111111;
          padding-left: 11px;
          min-width: 0;
          overflow-wrap: anywhere;
        }
        .skill-item::before {
          content: '•';
          position: absolute;
          left: 0;
          top: 0;
          color: #111111;
          font-weight: 700;
        }
        .resume-rich-text { margin-top: 2px; text-align: justify; }
        .resume-rich-text p, .resume-rich-text div { margin: 1px 0; }
        .resume-rich-text ul, .resume-rich-text ol { margin: 2px 0 0 14px; padding-left: 14px; }
        .resume-rich-text ul { list-style-type: disc !important; list-style-position: outside !important; }
        .resume-rich-text ol { list-style-type: decimal !important; list-style-position: outside !important; }
        .resume-rich-text li { display: list-item !important; margin: 0; padding-left: 1px; }
        .resume-rich-text blockquote { margin: 2px 0 2px 14px; padding-left: 8px; border-left: 2px solid #b8b8b8; }
        .resume-rich-text h1, .resume-rich-text h2 { margin: 2px 0 1px; border: 0; padding: 0; text-transform: none; letter-spacing: 0; line-height: 1.15; }
        .resume-rich-text h1 { font-size: 11.5px; }
        .resume-rich-text h2 { font-size: 10.5px; }

        .references-grid {
          row-gap: 7px;
        }

        .reference-card {
          break-inside: avoid;
        }

        .link-text {
          color: #1d4ed8;
          text-decoration: underline;
          word-break: break-all;
        }

        .empty-text {
          margin: 0;
          color: #777777;
        }

        .resume-declaration {
          margin-top: 11px;
          width: 100%;
          break-inside: avoid;
        }

        .declaration-text {
          margin: 0 0 6px;
          text-align: right;
        }

        .declaration-name {
          font-weight: 700;
        }

        .declaration-signature {
          display: block;
          width: max-content;
          min-width: 160px;
          margin-left: auto;
          text-align: center;
          transform: translateX(4mm);
        }

        .declaration-role {
          margin-top: 2px;
        }

        @media screen and (max-width: 1240px) {
          .preview-document {
            zoom: 1.2;
          }
        }

        @media screen and (max-width: 900px) {
          .preview-document {
            width: 100%;
            zoom: 1;
          }

          .preview-topbar,
          .resume-paper {
            width: 100%;
          }

          .resume-paper {
            min-height: auto;
          }

          .resume-inner {
            padding: 28px 24px;
          }

          .resume-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
            padding-right: 0;
            text-align: left;
          }

          .resume-header-main {
            width: 100%;
            max-width: none;
          }

          .resume-initials,
          .resume-photo {
            position: static;
            margin-top: 0;
          }

          .three-column-rows,
          .references-grid {
            grid-template-columns: 1fr;
            row-gap: 2px;
          }
        }
      `}</style>

      <div className="page-shell">
        <div className="preview-document">
          <div className="preview-topbar print-hide">
          <button
            type="button"
            onClick={() => navigate(returnTo)}
            className="preview-close-btn"
            aria-label="Close resume preview"
          >
            ×
          </button>
          <span>
            {isEmployerPreview
              ? 'Full applicant resume preview'
              : isAdminPreview
                ? 'Full jobseeker resume preview'
                : 'This is what your resume looks like to your employers'}
          </span>
        </div>

        <main className="resume-paper">
          <div className="resume-inner">
            <header className="resume-header">
              <div className="resume-header-main">
                <h1 className="resume-name">{fullName}</h1>
                <div className="resume-contact">
                  {formData.address ? (
                    <div className="resume-contact-address">{formData.address}</div>
                  ) : null}
                  {formData.email || formData.phoneNumber ? (
                    <div className="resume-contact-details">
                      {formData.email ? <span>{formData.email}</span> : null}
                      {formData.phoneNumber ? <span>{formData.phoneNumber}</span> : null}
                    </div>
                  ) : null}
                </div>
                {educationSummary ? <div className="resume-education-summary">{educationSummary}</div> : null}
              </div>
              <ResumePhoto src={profileImage} initials={initials} fullName={fullName} />
            </header>

            <Section title="Objective" hidden={!isMeaningfulResumeValue(formData.aboutMe)}>
              <ResumeRichText value={formData.aboutMe} className="objective-text" />
            </Section>

            <Section title="Personal Information" hidden={!hasMeaningfulResumeRows(personalInformationColumns)}>
              <ThreeColumnRows columns={personalInformationColumns} />
            </Section>

            <Section title="Work Experience" hidden={!meaningfulWorkExperiences.length}>
              {meaningfulWorkExperiences.map((item, index) => (
                <DatedItem
                  key={item._id || item.id || `${item.companyName}-${item.positionTitle}-${index}`}
                  title={getText(item.positionTitle)}
                  subtitle={getText(item.companyName)}
                  date={getDateRange(item)}
                  description={item.description}
                />
              ))}
            </Section>

            <Section title="Skills" hidden={!allSkills.length}>
                <div className="skills-groups">
                  {Array.from({ length: Math.ceil(allSkills.length / 9) }, (_, groupIndex) => {
                    const skillGroup = allSkills.slice(groupIndex * 9, groupIndex * 9 + 9);

                    return (
                      <ul className="skills-grid" key={`skill-group-${groupIndex}`}>
                        {skillGroup.map((skill, index) => (
                          <li className="skill-item" key={`skill-${skill}-${groupIndex}-${index}`}>
                            {skill}
                          </li>
                        ))}
                      </ul>
                    );
                  })}
                </div>              </Section>

            <Section title="Education" hidden={!meaningfulEducationEntries.length}>
              {meaningfulEducationEntries.map((entry, index) => (
                  <DatedItem
                    key={`${entry.level || 'education'}-${entry.campus || entry.school || 'campus'}-${index}`}
                    title={getText(entry.level || entry.educationalAttainment)}
                    subtitle={getText(entry.school || entry.campus)}
                    meta=""
                    date={getEducationDateRange(entry)}
                    description={entry.description}
                  />
                ))}
            </Section>

            {showOptionalSection('seminars', seminars) ? <ProfileListSection title="Seminars and Trainings" items={seminars} /> : null}
            {showOptionalSection('awards', awards) ? <ProfileListSection title="Awards and Achievements" items={awards} type="awards" /> : null}
            {showOptionalSection('certifications', certifications) ? <ProfileListSection title="Certifications" items={certifications} /> : null}
            {showOptionalSection('projects', projects) ? <ProfileListSection title="Projects" items={projects} /> : null}
            {showOptionalSection('affiliations', affiliations) ? <ProfileListSection title="Affiliations" items={affiliations} /> : null}
            {showOptionalSection('cocurricular', cocurricular) ? <ProfileListSection title="Co-curricular Activities" items={cocurricular} /> : null}
            {showOptionalSection('references', references) ? <ProfileListSection title="References" items={references} type="references" /> : null}

            <section className="resume-declaration">
              <p className="declaration-text">
                I hereby certify that the above information is true and correct to the best of my knowledge.
              </p>
              <div className="declaration-signature">
                <div className="declaration-name">{fullName}</div>
                <div className="declaration-role">Applicant</div>
              </div>
            </section>
          </div>
          </main>
        </div>
      </div>
    </>
  );
};

export default ResumePreviewPage;
