// src/components/shared/resumePrintTemplate.js

const getText = (value, fallback = '') => {
  const text = String(value || '').trim();
  return text || fallback;
};

const escapeHtml = (value = '') =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const toArray = (value) => {
  if (Array.isArray(value)) return value.map((item) => String(item || '').trim()).filter(Boolean);
  if (typeof value === 'string') {
    return value
      .split(/\|\||[\n,•]+/g)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

const joinMonthYear = (month, year) =>
  [month, year].map((item) => String(item || '').trim()).filter(Boolean).join(' ');

const getMonthYearRange = (item = {}) => {
  if (item.date) return item.date;

  const start = joinMonthYear(item.startMonth, item.startYear) || (item.startDate ? formatMonthYear(item.startDate) : '');
  const end = item.isPresent
    ? 'Present'
    : joinMonthYear(item.endMonth, item.endYear || item.yearGraduated) || (item.endDate ? formatMonthYear(item.endDate) : '');

  if (start && end) return `${start} - ${end}`;
  return start || end || '';
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

const getDateRange = (item = {}) => getMonthYearRange(item);

const getEducationDateRange = (entry = {}) => {
  const start = joinMonthYear(entry.startMonth, entry.startYear);
  const end = joinMonthYear(entry.endMonth, entry.endYear || entry.yearGraduated);

  if (start && end) return `${start} - ${end}`;
  return end || start || getText(entry.endYear || entry.yearGraduated || entry.startYear);
};

const getProfileImageUrl = (url = '') => {
  const cleanUrl = String(url || '').trim();
  if (!cleanUrl) return '';
  if (/^https?:\/\//i.test(cleanUrl) || cleanUrl.startsWith('data:') || cleanUrl.startsWith('blob:')) return cleanUrl;

  const apiBase = process.env.REACT_APP_API_URL || 'https://phinmaau-job-portal-atlas.onrender.com/api';
  const serverBase = apiBase.replace(/\/api\/?$/, '');
  return cleanUrl.startsWith('/') ? `${serverBase}${cleanUrl}` : `${serverBase}/${cleanUrl}`;
};

const splitDetails = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return [];

  return raw
    .split(/\n|•|\*|;/)
    .map((item) => item.trim())
    .filter(Boolean);
};

const sectionHtml = (title, children, hidden = false) => {
  if (hidden) return '';
  return `
    <section class="resume-section">
      <h2>${escapeHtml(title)}</h2>
      ${children}
    </section>
  `;
};

const twoColumnRowsHtml = (rows = []) => {
  const cleanRows = rows.filter((row) => getText(row.value));
  if (!cleanRows.length) return '<p class="empty-text">Not provided</p>';

  const middle = Math.ceil(cleanRows.length / 2);
  const columns = [cleanRows.slice(0, middle), cleanRows.slice(middle)];

  return `
    <div class="two-column-rows">
      ${columns
        .map(
          (column) => `
            <div class="info-column">
              ${column
                .map(
                  (row) => `
                    <div class="info-row">
                      <span class="info-label">${escapeHtml(row.label)}:</span>
                      <span class="info-value">${escapeHtml(row.value)}</span>
                    </div>
                  `
                )
                .join('')}
            </div>
          `
        )
        .join('')}
    </div>
  `;
};

const datedItemHtml = ({ title, subtitle, date, description, details, meta }) => {
  const detailItems = Array.isArray(details) && details.length ? details : splitDetails(description);

  return `
    <div class="dated-item">
      <div class="dated-header">
        <div class="dated-main">
          <div class="item-title">${escapeHtml(title)}</div>
          ${subtitle ? `<div class="item-subtitle">${escapeHtml(subtitle)}</div>` : ''}
          ${meta ? `<div class="item-meta">${escapeHtml(meta)}</div>` : ''}
        </div>
        ${date ? `<div class="item-date">${escapeHtml(date)}</div>` : ''}
      </div>

      ${
        detailItems.length
          ? `<ul class="resume-bullets">${detailItems
              .map((detail) => `<li>${escapeHtml(detail)}</li>`)
              .join('')}</ul>`
          : ''
      }
    </div>
  `;
};

const profileListSectionHtml = ({ title, items = [], type = 'default' }) => {
  const cleanItems = Array.isArray(items)
    ? items.filter((item) => Object.values(item || {}).some((value) => getText(value)))
    : [];

  if (!cleanItems.length) return '';

  if (type === 'references') {
    return sectionHtml(
      title,
      `
        <div class="references-grid">
          ${cleanItems
            .map((item) => {
              const subtitle = [item.position, item.company].filter(Boolean).join(' / ');
              return `
                <div class="reference-card">
                  <div class="item-title">${escapeHtml(getText(item.name, 'Reference'))}</div>
                  ${subtitle ? `<div class="item-subtitle">${escapeHtml(subtitle)}</div>` : ''}
                  ${item.phone ? `<div>${escapeHtml(item.phone)}</div>` : ''}
                  ${item.email ? `<div class="link-text">${escapeHtml(item.email)}</div>` : ''}
                </div>
              `;
            })
            .join('')}
        </div>
      `
    );
  }

  return sectionHtml(
    title,
    cleanItems
      .map((item) => {
        const titleText = getText(item.title || item.organization || item.name, 'Untitled');
        const subtitle =
          type === 'awards'
            ? getText(item.issuer ? `Issued by: ${item.issuer}` : '')
            : getText(item.role || item.issuer || item.organization || item.company);

        return datedItemHtml({
          title: titleText,
          subtitle,
          date: getDateRange(item),
          description: item.description,
        });
      })
      .join('')
  );
};

const resumeStyles = `
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
`;

export const buildResumeHtml = ({ userData = {}, formData = {}, workExperiences = [], autoDownload = false } = {}) => {
  const profileImage = userData?.profileImage || formData?.profileImage || '';
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

  const imageUrl = getProfileImageUrl(profileImage);
  const photoHtml = imageUrl
    ? `<div class="resume-photo"><img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(fullName || 'Profile photo')}" /></div>`
    : `<div class="resume-initials">${escapeHtml(initials)}</div>`;

  const workExperienceHtml = sectionHtml(
    'Work Experience',
    workExperiences
      .map((item, index) =>
        datedItemHtml({
          title: getText(item.positionTitle, 'Position not provided'),
          subtitle: getText(item.companyName, 'Company not provided'),
          date: getDateRange(item),
          description: item.description,
        })
      )
      .join(''),
    !workExperiences.length
  );

  const skillsHtml = sectionHtml(
    'Skills',
    `
      <div class="skills-grid">
        <div>
          ${
            technicalSkills.length
              ? technicalSkills
                  .map((skill) => `<div class="skill-row"><span class="skill-label">${escapeHtml(skill)}</span></div>`)
                  .join('')
              : '<p class="empty-text">Not provided</p>'
          }
        </div>
        <div>
          ${
            softSkills.length
              ? softSkills
                  .map((skill) => `<div class="skill-row"><span class="skill-label">${escapeHtml(skill)}</span></div>`)
                  .join('')
              : '<p class="empty-text">Not provided</p>'
          }
        </div>
      </div>
    `
  );

  const educationHtml = sectionHtml(
    'Education',
    educationEntries.length
      ? educationEntries
          .map((entry) =>
            datedItemHtml({
              title: getText(entry.level || entry.educationalAttainment || formData.educationalAttainment, 'Education'),
              subtitle: getText(entry.school || entry.campus || formData.campus),
              meta: getText(entry.description),
              date: getEducationDateRange(entry),
            })
          )
          .join('')
      : datedItemHtml({
          title: getText(formData.educationalAttainment, 'Education'),
          subtitle: getText(formData.campus),
          meta: getText(formData.course),
          date: getText(formData.yearGraduated),
        })
  );

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(fullName)} CV</title>
    <style>${resumeStyles}</style>
  </head>
  <body>
    <div class="page-shell">
      <div class="preview-topbar print-hide">
        <button type="button" onclick="window.close()" class="preview-close-btn" aria-label="Close resume preview">×</button>
        <span>This is what your resume looks like to your employers</span>
      </div>

      <main class="resume-paper">
        <div class="resume-inner">
          <header class="resume-header">
            <h1 class="resume-name">${escapeHtml(fullName)}</h1>
            <div class="resume-contact">
              ${formData.address ? `<span>${escapeHtml(formData.address)}</span>` : ''}
              ${formData.phoneNumber ? `<span>${escapeHtml(formData.phoneNumber)}</span>` : ''}
              ${formData.email ? `<span>${escapeHtml(formData.email)}</span>` : ''}
            </div>
            ${educationSummary ? `<div class="resume-education-summary">${escapeHtml(educationSummary)}</div>` : ''}
            ${photoHtml}
          </header>

          ${sectionHtml('Objective', `<p class="objective-text">${escapeHtml(getText(formData.aboutMe, 'Not provided'))}</p>`)}
          ${sectionHtml('Availability & Preferences', twoColumnRowsHtml(availabilityRows))}
          ${workExperienceHtml}
          ${skillsHtml}
          ${educationHtml}
          ${profileListSectionHtml({ title: 'Certifications', items: certifications })}
          ${profileListSectionHtml({ title: 'Projects', items: projects })}
          ${profileListSectionHtml({ title: 'Seminars and Trainings', items: seminars })}
          ${profileListSectionHtml({ title: 'Awards and Achievements', items: awards, type: 'awards' })}
          ${profileListSectionHtml({ title: 'Affiliations', items: affiliations })}
          ${profileListSectionHtml({ title: 'Co-curricular Activities', items: cocurricular })}
          ${profileListSectionHtml({ title: 'References', items: references, type: 'references' })}
        </div>
      </main>
    </div>

    ${
      autoDownload
        ? `<script>
            window.addEventListener('load', function () {
              setTimeout(function () {
                window.print();
              }, 500);
            });
          </script>`
        : ''
    }
  </body>
</html>`;
};


export const buildResumeFileName = (resumeData = {}) => {
  const formData = resumeData?.formData || {};
  const fullName = buildName(formData) || 'resume';
  const safeName = fullName
    .replace(/[^a-z0-9\s-_]/gi, '')
    .trim()
    .replace(/\s+/g, '_') || 'resume';

  return `${safeName}_CV.pdf`;
};

const loadHtml2Pdf = () =>
  new Promise((resolve, reject) => {
    if (window.html2pdf) {
      resolve(window.html2pdf);
      return;
    }

    const existingScript = document.getElementById('html2pdf-script');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(window.html2pdf), { once: true });
      existingScript.addEventListener('error', reject, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = 'html2pdf-script';
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
    script.async = true;
    script.onload = () => resolve(window.html2pdf);
    script.onerror = () => reject(new Error('Unable to load PDF generator.'));
    document.body.appendChild(script);
  });

export const openResumePrintWindow = async (resumeData = {}) => {
  const existingWrapper = document.getElementById('agapay-resume-pdf-wrapper');
  if (existingWrapper) {
    existingWrapper.remove();
  }

  const wrapper = document.createElement('div');
  wrapper.id = 'agapay-resume-pdf-wrapper';
  wrapper.style.position = 'fixed';
  wrapper.style.left = '-10000px';
  wrapper.style.top = '0';
  wrapper.style.width = '210mm';
  wrapper.style.background = '#ffffff';
  wrapper.style.zIndex = '-1';

  const fullHtml = buildResumeHtml({ ...resumeData, autoDownload: false });
  const bodyMatch = fullHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const styleMatch = fullHtml.match(/<style[^>]*>([\s\S]*?)<\/style>/i);

  const styleTag = document.createElement('style');
  styleTag.textContent = styleMatch ? styleMatch[1] : '';

  const content = document.createElement('div');
  content.innerHTML = bodyMatch ? bodyMatch[1] : fullHtml;

  const topbar = content.querySelector('.preview-topbar');
  if (topbar) {
    topbar.remove();
  }

  wrapper.appendChild(styleTag);
  wrapper.appendChild(content);
  document.body.appendChild(wrapper);

  try {
    const html2pdf = await loadHtml2Pdf();
    const paper = wrapper.querySelector('.resume-paper') || wrapper;

    await html2pdf()
      .set({
        margin: 0,
        filename: buildResumeFileName(resumeData),
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          scrollX: 0,
          scrollY: 0,
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait',
        },
        pagebreak: { mode: ['css', 'legacy'] },
      })
      .from(paper)
      .save();

    wrapper.remove();
    return true;
  } catch (error) {
    console.error('Resume PDF download failed:', error);
    wrapper.remove();
    return false;
  }
};


export const normalizeUserToResumeData = ({ userData = {}, profile = {}, workExperiences = [] } = {}) => ({
  userData,
  formData: {
    firstName: userData.firstName || '',
    middleName: userData.middleName || '',
    lastName: userData.lastName || '',
    extensionName: userData.extensionName || '',
    email: userData.email || '',
    profileImage: userData.profileImage || '',

    phoneNumber: profile.phoneNumber || '',
    aboutMe: profile.aboutMe || '',
    minimumSalary: profile.minimumSalary || '',
    maximumSalary: profile.maximumSalary || '',
    address: profile.address || '',
    birthday: profile.birthday || '',
    gender: profile.gender || '',
    nationality: profile.nationality || '',
    civilStatus: profile.civilStatus || '',
    height: profile.height || '',
    weight: profile.weight || '',
    preferredLanguage: profile.preferredLanguage || '',
    campus: profile.campus || '',
    course: profile.course || '',
    yearGraduated: profile.yearGraduated || '',
    preferredWorkMode: profile.preferredWorkMode || '',
    technicalSkills: profile.technicalSkills || '',
    softSkills: profile.softSkills || '',
    whatHaveYouDone: profile.whatHaveYouDone || '',
    howSoonCanYouStart: profile.howSoonCanYouStart || '',
    employmentType: profile.employmentType || '',
    educationalAttainment: profile.educationalAttainment || '',
    willingToRelocate: profile.willingToRelocate || '',
    studyField: profile.studyField || profile.course || '',

    certifications: Array.isArray(profile.certifications) ? profile.certifications : [],
    projects: Array.isArray(profile.projects) ? profile.projects : [],
    seminars: Array.isArray(profile.seminars) ? profile.seminars : [],
    awards: Array.isArray(profile.awards) ? profile.awards : [],
    affiliations: Array.isArray(profile.affiliations) ? profile.affiliations : [],
    cocurricular: Array.isArray(profile.cocurricular) ? profile.cocurricular : [],
    references: Array.isArray(profile.references) ? profile.references : [],

    educationEntries: Array.isArray(profile.educationEntries) ? profile.educationEntries : [],
  },
  workExperiences: Array.isArray(workExperiences) ? workExperiences : [],
});
