import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';


const getText = (value, fallback = '') => {
  const text = String(value || '').trim();
  return text || fallback;
};

const toArray = (value) => {
  if (Array.isArray(value)) return value.map((item) => String(item || '').trim()).filter(Boolean);
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
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
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};

const getDateRange = (item = {}) => {
  if (item.date) return item.date;

  const start = item.startDate ? formatMonthYear(item.startDate) : '';
  const end = item.isPresent ? 'Present' : item.endDate ? formatMonthYear(item.endDate) : '';

  if (start && end) return `${start} - ${end}`;
  if (start) return start;
  if (end) return end;
  return '';
};

const getEducationDateRange = (entry = {}) => {
  const start = getText(entry.startYear);
  const end = getText(entry.endYear || entry.yearGraduated);

  if (start && end) return `${start} - ${end}`;
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

const TwoColumnRows = ({ rows = [] }) => {
  const cleanRows = rows.filter((row) => getText(row.value));
  if (!cleanRows.length) return <p className="empty-text">Not provided</p>;

  const middle = Math.ceil(cleanRows.length / 2);
  const columns = [cleanRows.slice(0, middle), cleanRows.slice(middle)];

  return (
    <div className="two-column-rows">
      {columns.map((column, columnIndex) => (
        <div className="info-column" key={`info-column-${columnIndex}`}>
          {column.map((row) => (
            <div className="info-row" key={row.label}>
              <span className="info-label">{row.label}:</span>
              <span className="info-value">{row.value}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

const DatedItem = ({ title, subtitle, date, description, details, meta }) => {
  const detailItems = Array.isArray(details) && details.length ? details : splitDetails(description);

  return (
    <div className="dated-item">
      <div className="dated-header">
        <div className="dated-main">
          <div className="item-title">{title}</div>
          {subtitle ? <div className="item-subtitle">{subtitle}</div> : null}
          {meta ? <div className="item-meta">{meta}</div> : null}
        </div>
        {date ? <div className="item-date">{date}</div> : null}
      </div>

      {detailItems.length ? (
        <ul className="resume-bullets">
          {detailItems.map((detail, index) => (
            <li key={`${title}-${index}`}>{detail}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
};

const ProfileListSection = ({ title, items = [], type = 'default' }) => {
  const cleanItems = Array.isArray(items)
    ? items.filter((item) => Object.values(item || {}).some((value) => getText(value)))
    : [];

  if (!cleanItems.length) return null;

  return (
    <Section title={title}>
      {type === 'references' ? (
        <div className="references-grid">
          {cleanItems.map((item, index) => (
            <div className="reference-card" key={item._id || `${title}-${index}`}>
              <div className="item-title">{getText(item.name, 'Reference')}</div>
              {[item.position, item.company].filter(Boolean).join(' / ') ? (
                <div className="item-subtitle">{[item.position, item.company].filter(Boolean).join(' / ')}</div>
              ) : null}
              {item.phone ? <div>{item.phone}</div> : null}
              {item.email ? <div className="link-text">{item.email}</div> : null}
            </div>
          ))}
        </div>
      ) : (
        cleanItems.map((item, index) => {
          const titleText = getText(item.title || item.organization || item.name, 'Untitled');
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
  const workExperiences = Array.isArray(storedData?.workExperiences) ? storedData.workExperiences : [];
  const fullName = buildName(formData) || 'Your Name';
  const initials = buildInitials(fullName);

  const educationEntries = Array.isArray(formData.educationEntries) ? formData.educationEntries : [];
  const technicalSkills = toArray(formData.technicalSkills);
  const softSkills = toArray(formData.softSkills);
  const certifications = Array.isArray(formData.certifications) ? formData.certifications : [];
  const projects = Array.isArray(formData.projects) ? formData.projects : [];
  const seminars = Array.isArray(formData.seminars) ? formData.seminars : [];
  const awards = Array.isArray(formData.awards) ? formData.awards : [];
  const affiliations = Array.isArray(formData.affiliations) ? formData.affiliations : [];
  const cocurricular = Array.isArray(formData.cocurricular) ? formData.cocurricular : [];
  const references = Array.isArray(formData.references) ? formData.references : [];
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
            onClick={() => navigate('/jobseeker/my-profile')}
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

  const availabilityRows = [
    { label: 'Preferred Work Mode', value: formData.preferredWorkMode },
    { label: 'Employment Type', value: formData.employmentType },
    { label: 'Educational Attainment', value: formData.educationalAttainment },
    { label: 'Field / Study', value: formData.studyField },
    { label: 'Civil Status', value: formData.civilStatus },
    { label: 'Birthday', value: formData.birthday },
    { label: 'Salary', value: [formData.minimumSalary, formData.maximumSalary].filter(Boolean).join(' - ') },
    {
      label: 'Weight',
      value: formData.weight ? `${String(formData.weight).replace(/\s*(kg|kgs|kilogram|kilograms)$/i, '').trim()} kg` : '',
    },
    { label: 'How Soon Can Start', value: formData.howSoonCanYouStart },
    { label: 'Willing to Relocate', value: formData.willingToRelocate },
    { label: 'Nationality', value: formData.nationality },
    { label: 'Gender', value: formData.gender },
    { label: 'Preferred Language', value: formData.preferredLanguage },
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
            min-height: 297mm;
            background: #ffffff !important;
          }

          .print-hide {
            display: none !important;
          }

          .page-shell {
            padding: 0 !important;
            background: #ffffff !important;
          }

          .resume-paper {
            width: 210mm !important;
            min-height: 297mm !important;
            margin: 0 !important;
            box-shadow: none !important;
          }

          .resume-inner {
            padding: 16mm 16mm 12mm !important;
          }
        }

        .page-shell {
          min-height: 100vh;
          background: #e5e7eb;
          padding: 0 16px 24px;
        }

        .preview-topbar {
          width: 210mm;
          margin: 0 auto;
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
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto;
          background: #ffffff;
          color: #111111;
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 8.7px;
          line-height: 1.18;
          box-shadow: 0 18px 50px rgba(15, 23, 42, 0.18);
        }

        .resume-inner {
          padding: 16mm 16mm 12mm;
          position: relative;
        }

        .resume-header {
          position: relative;
          min-height: 62px;
          padding-right: 98px;
          text-align: center;
        }

        .resume-name {
          margin: 0;
          padding-top: 5px;
          font-size: 17px;
          line-height: 1;
          font-weight: 700;
          letter-spacing: 0.55px;
          text-transform: uppercase;
        }

        .resume-contact {
          margin-top: 5px;
          color: #222222;
          font-size: 6.7px;
          line-height: 1.35;
        }

        .resume-contact span + span::before {
          content: ' | ';
        }

        .resume-education-summary {
          margin-top: 3px;
          color: #222222;
          font-size: 7.2px;
          line-height: 1.25;
          font-style: italic;
        }

        .resume-initials,
        .resume-photo {
          position: absolute;
          top: 0;
          right: 3px;
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
          margin-top: 7px;
          break-inside: avoid;
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
        }

        .objective-text {
          margin: 0;
          text-align: justify;
        }

        .two-column-rows,
        .skills-grid,
        .references-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          column-gap: 35px;
        }

        .info-row,
        .skill-row {
          display: grid;
          grid-template-columns: 112px 1fr;
          gap: 4px;
          min-height: 11px;
        }

        .info-label,
        .skill-label,
        .item-title {
          font-weight: 700;
        }

        .info-label {
          white-space: nowrap;
          font-size: 8.1px;
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

        .skill-row {
          display: block;
          min-height: 10px;
        }

        .skill-label {
          white-space: nowrap;
        }

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

        @media screen and (max-width: 900px) {
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
            padding-right: 0;
            text-align: left;
          }

          .resume-initials,
          .resume-photo {
            position: static;
            margin-top: 12px;
          }

          .two-column-rows,
          .skills-grid,
          .references-grid {
            grid-template-columns: 1fr;
            row-gap: 2px;
          }
        }
      `}</style>

      <div className="page-shell">
        <div className="preview-topbar print-hide">
          <button
            type="button"
            onClick={() => navigate('/jobseeker/my-profile')}
            className="preview-close-btn"
            aria-label="Close resume preview"
          >
            ×
          </button>
          <span>This is what your resume looks like to your employers</span>
        </div>

        <main className="resume-paper">
          <div className="resume-inner">
            <header className="resume-header">
              <h1 className="resume-name">{fullName}</h1>
              <div className="resume-contact">
                {formData.address ? <span>{formData.address}</span> : null}
                {formData.phoneNumber ? <span>{formData.phoneNumber}</span> : null}
                {formData.email ? <span>{formData.email}</span> : null}
              </div>
              {educationSummary ? <div className="resume-education-summary">{educationSummary}</div> : null}
              <ResumePhoto src={profileImage} initials={initials} fullName={fullName} />
            </header>

            <Section title="Objective">
              <p className="objective-text">{getText(formData.aboutMe, 'Not provided')}</p>
            </Section>

            <Section title="Availability & Preferences">
              <TwoColumnRows rows={availabilityRows} />
            </Section>

            <Section title="Work Experience" hidden={!workExperiences.length}>
              {workExperiences.map((item, index) => (
                <DatedItem
                  key={item._id || item.id || `${item.companyName}-${item.positionTitle}-${index}`}
                  title={getText(item.positionTitle, 'Position not provided')}
                  subtitle={getText(item.companyName, 'Company not provided')}
                  date={getDateRange(item)}
                  description={item.description}
                />
              ))}
            </Section>

            {[...technicalSkills, ...softSkills].length ? (
              <Section title="Skills">
                <div className="skills-grid">
                  {[...technicalSkills, ...softSkills].map((skill, index) => (
                    <div className="skill-row" key={`skill-${skill}-${index}`}>
                      <span className="skill-label">{skill}</span>
                    </div>
                  ))}
                </div>
              </Section>
            ) : null}

            <Section title="Education">
              {educationEntries.length ? (
                educationEntries.map((entry, index) => (
                  <DatedItem
                    key={`${entry.level || 'education'}-${entry.campus || 'campus'}-${entry.course || 'course'}-${index}`}
                    title={getText(entry.level || entry.educationalAttainment || formData.educationalAttainment, 'Education')}
                    subtitle={getText(entry.campus || formData.campus)}
                    meta={[entry.course || formData.course, entry.studyField || formData.studyField].filter(Boolean).join(' / ')}
                    date={getEducationDateRange(entry)}
                  />
                ))
              ) : (
                <DatedItem
                  title={getText(formData.educationalAttainment, 'Education')}
                  subtitle={getText(formData.campus)}
                  meta={getText(formData.course)}
                  date={getText(formData.yearGraduated)}
                />
              )}
            </Section>

            <ProfileListSection title="Certifications" items={certifications} />
            <ProfileListSection title="Projects" items={projects} />
            <ProfileListSection title="Seminars and Trainings" items={seminars} />
            <ProfileListSection title="Awards and Achievements" items={awards} type="awards" />
            <ProfileListSection title="Affiliations" items={affiliations} />
            <ProfileListSection title="Co-curricular Activities" items={cocurricular} />
            <ProfileListSection title="References" items={references} type="references" />
          </div>
        </main>
      </div>
    </>
  );
};

export default ResumePreviewPage;
