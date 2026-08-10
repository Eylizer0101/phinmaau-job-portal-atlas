// backend/config/mailer.js
const nodemailer = require('nodemailer');

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.BREVO_SMTP_HOST || process.env.EMAIL_HOST,
    port: Number(process.env.BREVO_SMTP_PORT || process.env.EMAIL_PORT || 587),
    secure: Number(process.env.BREVO_SMTP_PORT || process.env.EMAIL_PORT || 587) === 465,
    auth: {
      user: process.env.BREVO_SMTP_USERNAME || process.env.EMAIL_USER,
      pass: process.env.BREVO_SMTP_PASSWORD || process.env.EMAIL_PASS,
    },
    disableFileAccess: true,
    disableUrlAccess: true,
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
  });
};

const escapeHtml = (unsafe) => {
  return String(unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const getSender = () => {
  const email = process.env.BREVO_FROM_EMAIL || process.env.EMAIL_USER;
  const name = process.env.BREVO_FROM_NAME || 'AGAPAY';

  if (!email) {
    throw new Error('Sender email missing. Set BREVO_FROM_EMAIL or EMAIL_USER.');
  }

  return { email, name };
};

const getFromHeader = () => {
  const sender = getSender();
  return `"${sender.name}" <${sender.email}>`;
};

const sendMail = async ({ to, subject, html }) => {
  if (!to) throw new Error('Recipient email missing');

  const sender = getSender();

  if (process.env.BREVO_API_KEY) {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': process.env.BREVO_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender,
        to: [{ email: to }],
        subject,
        htmlContent: html,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Brevo API email failed: ${response.status} ${errorText}`);
    }

    return;
  }

  const transporter = createTransporter();

  await transporter.sendMail({
    from: getFromHeader(),
    to,
    subject,
    html,
  });
};

const sendCredentialsEmail = async ({ to, fullName, username, password, role }) => {
  if (!to) throw new Error("Recipient email missing");

  const safeName = escapeHtml(fullName || 'User');
  const safeUsername = escapeHtml(username);
  const safePassword = escapeHtml(password);
  const safeRole = escapeHtml(role || 'User');

  const appUrl = process.env.FRONTEND_URL || process.env.APP_URL || 'https://agapayy.onrender.com';
  const loginUrl = `${appUrl}/login`;

  await sendMail({
    to,
    subject: `AGAPAY Account Approved`,
    html: `
      <div style="background:#f4f6f9; padding:40px 15px; font-family:Arial, sans-serif;">
        <div style="max-width:520px; margin:auto; background:#ffffff; padding:30px; border-radius:8px; border:1px solid #e5e7eb;">

          <h2 style="margin:0; color:#1e3a8a; font-weight:600;">
            AGAPAY
          </h2>

          <p style="margin-top:25px; font-size:15px; color:#111827;">
            Hello <strong>${safeName}</strong>,
          </p>

          <p style="font-size:14px; color:#374151; line-height:1.6;">
            Your ${safeRole} account has been approved.  
            You may now log in using the credentials below:
          </p>

          <div style="margin-top:20px; padding:15px; background:#f9fafb; border:1px solid #e5e7eb; border-radius:6px;">
            <p style="margin:0 0 12px 0; font-size:14px;">
              <strong>Username:</strong><br/>
              <span style="font-family:monospace; font-size:15px;">${safeUsername}</span>
            </p>

            <p style="margin:0; font-size:14px;">
              <strong>Temporary Password:</strong><br/>
              <span style="font-family:monospace; font-size:15px;">${safePassword}</span>
            </p>
          </div>

          <p style="margin-top:20px; font-size:13px; color:#6b7280;">
            For security purposes, please change your password after logging in.
          </p>

          <div style="margin-top:25px;">
            <a href="${loginUrl}"
              style="display:inline-block; background:#1e3a8a; color:#ffffff; padding:10px 18px;
                     text-decoration:none; border-radius:5px; font-size:14px;">
              Login
            </a>
          </div>

          <p style="margin-top:30px; font-size:12px; color:#9ca3af;">
            This is an automated message from AGAPAY. Please do not reply.
          </p>

        </div>
      </div>
    `,
  });
};

const sendPasswordResetEmail = async ({ to, fullName, resetUrl, expiresInMinutes }) => {
  if (!to) throw new Error('Recipient email missing');

  const safeName = escapeHtml(fullName || 'User');
  const safeResetUrl = escapeHtml(resetUrl);
  const safeExpiry = escapeHtml(expiresInMinutes);

  await sendMail({
    to,
    subject: 'AGAPAY Password Reset Request',
    html: `
      <div style="background:#f4f6f9; padding:40px 15px; font-family:Arial, sans-serif;">
        <div style="max-width:520px; margin:auto; background:#ffffff; padding:30px; border-radius:8px; border:1px solid #e5e7eb;">

          <h2 style="margin:0; color:#1e3a8a; font-weight:600;">
            AGAPAY
          </h2>

          <p style="margin-top:25px; font-size:15px; color:#111827;">
            Hello <strong>${safeName}</strong>,
          </p>

          <p style="font-size:14px; color:#374151; line-height:1.6;">
            We received a request to reset your password.
          </p>

          <p style="font-size:14px; color:#374151; line-height:1.6;">
            Click the button below to set a new password. This link will expire in <strong>${safeExpiry} minutes</strong>.
          </p>

          <div style="margin-top:25px;">
            <a href="${safeResetUrl}"
              style="display:inline-block; background:#1e3a8a; color:#ffffff; padding:12px 20px;
                     text-decoration:none; border-radius:6px; font-size:14px; font-weight:600;">
              Reset Password
            </a>
          </div>

          <p style="margin-top:20px; font-size:13px; color:#6b7280; line-height:1.6;">
            If the button above does not work, copy and paste this link into your browser:
          </p>

          <p style="font-size:12px; color:#374151; word-break:break-all;">
            ${safeResetUrl}
          </p>

          <p style="margin-top:20px; font-size:13px; color:#6b7280;">
            If you did not request this, you can safely ignore this email.
          </p>

          <p style="margin-top:30px; font-size:12px; color:#9ca3af;">
            This is an automated message from AGAPAY. Please do not reply.
          </p>

        </div>
      </div>
    `,
  });
};

const sendPasswordResetOtpEmail = async ({ to, fullName, otp, expiresInMinutes }) => {
  if (!to) throw new Error('Recipient email missing');

  const safeName = escapeHtml(fullName || 'User');
  const safeOtp = escapeHtml(otp);
  const safeExpiry = escapeHtml(expiresInMinutes);
  const appUrl = process.env.FRONTEND_URL || process.env.APP_URL || 'https://agapayy.onrender.com';
  const logoUrl = escapeHtml(`${String(appUrl).replace(/\/$/, '')}/images/agpay.png`);

  await sendMail({
    to,
    subject: 'Your AGAPAY Password Reset Code',
    html: `
      <div style="margin:0; padding:32px 14px; background:#f3f6fa; font-family:Arial,Helvetica,sans-serif; color:#111827;">
        <div style="max-width:560px; margin:0 auto; overflow:hidden; background:#ffffff; border:1px solid #e2e8f0; border-radius:18px; box-shadow:0 12px 30px rgba(15,23,42,0.08);">
          <div style="padding:30px 28px 24px; text-align:center; border-bottom:1px solid #edf2f7; background:#ffffff;">
            <img src="${logoUrl}" alt="AGAPAY" style="display:block; width:auto; max-width:190px; height:58px; margin:0 auto; object-fit:contain;" />
            <h1 style="margin:18px 0 0; font-size:24px; line-height:1.25; color:#111827; font-weight:700;">Reset Your Password</h1>
            <p style="margin:9px auto 0; max-width:430px; font-size:14px; line-height:1.65; color:#64748b;">
              Use the verification code below to continue your AGAPAY password reset.
            </p>
          </div>

          <div style="padding:28px;">
            <p style="margin:0; font-size:15px; line-height:1.6; color:#334155;">
              Hi <strong style="color:#111827;">${safeName}</strong>,
            </p>
            <p style="margin:12px 0 0; font-size:14px; line-height:1.7; color:#475569;">
              We received a request to reset the password for your AGAPAY account. Enter this one-time verification code on the password reset screen:
            </p>

            <div style="margin:24px 0; padding:22px 18px; text-align:center; background:#eef5ff; border:1px solid #cfe0f5; border-radius:14px;">
              <p style="margin:0 0 10px; font-size:12px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:#2e66a6;">Your verification code</p>
              <div style="font-family:'Courier New',monospace; font-size:34px; line-height:1.2; font-weight:700; letter-spacing:8px; color:#163d6b;">${safeOtp}</div>
            </div>

            <div style="padding:14px 16px; background:#f8fafc; border-left:4px solid #2e66a6; border-radius:8px;">
              <p style="margin:0; font-size:13px; line-height:1.6; color:#475569;">
                This code will expire in <strong>${safeExpiry} minutes</strong>. For your security, do not share this code with anyone.
              </p>
            </div>

            <p style="margin:22px 0 0; font-size:13px; line-height:1.7; color:#64748b;">
              If you did not request a password reset, you can safely ignore this email. Your current password will remain unchanged.
            </p>
          </div>

          <div style="padding:18px 28px 24px; text-align:center; background:#f8fafc; border-top:1px solid #edf2f7;">
            <p style="margin:0; font-size:12px; line-height:1.6; color:#94a3b8;">
              This is an automated message from AGAPAY. Please do not reply to this email.
            </p>
          </div>
        </div>
      </div>
    `,
  });
};

const sendResubmitDocumentEmail = async ({ to, fullName, docLabel, reasonMessage, resubmitUrl }) => {
  if (!to) throw new Error('Recipient email missing');

  const safeName = escapeHtml(fullName || 'User');
  const safeDocLabel = escapeHtml(docLabel || 'Document');
  const safeReason = escapeHtml(reasonMessage || 'Please upload a clearer and valid document.');
  const safeResubmitUrl = escapeHtml(resubmitUrl);

  await sendMail({
    to,
    subject: 'AGAPAY Document Resubmission Request',
    html: `
      <div style="background:#f4f6f9; padding:40px 15px; font-family:Arial, sans-serif;">
        <div style="max-width:520px; margin:auto; background:#ffffff; padding:30px; border-radius:8px; border:1px solid #e5e7eb;">

          <h2 style="margin:0; color:#1e3a8a; font-weight:600;">
            AGAPAY
          </h2>

          <p style="margin-top:25px; font-size:15px; color:#111827;">
            Hello <strong>${safeName}</strong>,
          </p>

          <p style="font-size:14px; color:#374151; line-height:1.6;">
            One of your verification documents needs to be resubmitted.
          </p>

          <div style="margin-top:20px; padding:15px; background:#fff8eb; border:1px solid #f5d7a1; border-radius:6px;">
            <p style="margin:0 0 10px 0; font-size:14px; color:#111827;">
              <strong>Document to resubmit:</strong> ${safeDocLabel}
            </p>

            <p style="margin:0; font-size:14px; color:#6b4b00; line-height:1.6;">
              <strong>Reason:</strong> ${safeReason}
            </p>
          </div>

          <p style="margin-top:20px; font-size:14px; color:#374151; line-height:1.6;">
            Click the button below to upload a new document.
          </p>

          <div style="margin-top:25px;">
            <a href="${safeResubmitUrl}"
              style="display:inline-block; background:#1e3a8a; color:#ffffff; padding:12px 20px;
                     text-decoration:none; border-radius:6px; font-size:14px; font-weight:600;">
              Resubmit Document
            </a>
          </div>

          <p style="margin-top:20px; font-size:13px; color:#6b7280; line-height:1.6;">
            If the button above does not work, copy and paste this link into your browser:
          </p>

          <p style="font-size:12px; color:#374151; word-break:break-all;">
            ${safeResubmitUrl}
          </p>

          <p style="margin-top:30px; font-size:12px; color:#9ca3af;">
            This is an automated message from AGAPAY. Please do not reply.
          </p>

        </div>
      </div>
    `,
  });
};

const sendVerificationRejectedEmail = async ({ to, fullName, reasons = [], message = '' }) => {
  if (!to) throw new Error('Recipient email missing');

  const safeName = escapeHtml(fullName || 'User');
  const safeMessage = escapeHtml(message || '');
  const safeReasons = Array.isArray(reasons) ? reasons.map((reason) => escapeHtml(reason)).filter(Boolean) : [];

  const reasonsHtml = safeReasons.length
    ? `<ul style="margin:10px 0 0 18px; padding:0; color:#374151; font-size:14px; line-height:1.8;">
        ${safeReasons.map((reason) => `<li>${reason}</li>`).join('')}
      </ul>`
    : `<p style="margin:10px 0 0 0; font-size:14px; color:#374151;">No specific reasons were provided.</p>`;

  const messageHtml = safeMessage
    ? `
      <div style="margin-top:20px; padding:15px; background:#f9fafb; border:1px solid #e5e7eb; border-radius:6px;">
        <p style="margin:0 0 8px 0; font-size:14px; color:#111827;"><strong>Message from Admin:</strong></p>
        <p style="margin:0; font-size:14px; color:#374151; line-height:1.7;">${safeMessage}</p>
      </div>
    `
    : '';

  await sendMail({
    to,
    subject: 'Verification Request Rejected',
    html: `
      <div style="background:#f4f6f9; padding:40px 15px; font-family:Arial, sans-serif;">
        <div style="max-width:520px; margin:auto; background:#ffffff; padding:30px; border-radius:8px; border:1px solid #e5e7eb;">

          <h2 style="margin:0; color:#1e3a8a; font-weight:600;">
            AGAPAY
          </h2>

          <p style="margin-top:25px; font-size:15px; color:#111827;">
            Hello <strong>${safeName}</strong>,
          </p>

          <p style="font-size:14px; color:#374151; line-height:1.6;">
            Your verification request has been rejected.
          </p>

          <div style="margin-top:20px; padding:15px; background:#fff5f5; border:1px solid #f3d1d1; border-radius:6px;">
            <p style="margin:0; font-size:14px; color:#111827;">
              <strong>Reason(s) for rejection:</strong>
            </p>
            ${reasonsHtml}
          </div>

          ${messageHtml}

          <p style="margin-top:20px; font-size:13px; color:#6b7280; line-height:1.6;">
            Please review the details above and update your submission if needed.
          </p>

          <p style="margin-top:30px; font-size:12px; color:#9ca3af;">
            This is an automated message from AGAPAY. Please do not reply.
          </p>

        </div>
      </div>
    `,
  });
};

const sendSettingsEmailVerificationCode = async ({ to, fullName, code, expiresInMinutes = 10 }) => {
  if (!to) throw new Error('Recipient email missing');

  const safeName = escapeHtml(fullName || 'User');
  const safeCode = escapeHtml(code);
  const safeExpiry = escapeHtml(expiresInMinutes);

  await sendMail({
    to,
    subject: 'AGAPAY Email Verification Code',
    html: `
      <div style="background:#f4f6f9; padding:40px 15px; font-family:Arial, sans-serif;">
        <div style="max-width:520px; margin:auto; background:#ffffff; padding:30px; border-radius:8px; border:1px solid #e5e7eb;">
          <h2 style="margin:0; color:#1e3a8a; font-weight:600;">AGAPAY</h2>
          <p style="margin-top:25px; font-size:15px; color:#111827;">Hello <strong>${safeName}</strong>,</p>
          <p style="font-size:14px; color:#374151; line-height:1.6;">Use this verification code to verify your email address:</p>
          <div style="margin-top:20px; padding:18px; background:#f9fafb; border:1px solid #e5e7eb; border-radius:6px; text-align:center;">
            <div style="font-size:32px; letter-spacing:8px; font-weight:700; color:#1e3a8a; font-family:monospace;">${safeCode}</div>
          </div>
          <p style="margin-top:18px; font-size:13px; color:#6b7280;">This code will expire in ${safeExpiry} minutes.</p>
          <p style="margin-top:30px; font-size:12px; color:#9ca3af;">This is an automated message from AGAPAY. Please do not reply.</p>
        </div>
      </div>
    `,
  });
};

const sendJobseekerRegistrationSummaryEmail = async ({
  to,
  fullName,
  contactNumber,
  campus,
  course,
  yearGraduated,
  preferredWorkMode,
  availabilityToStart,
  uploadedCredentialTypes = [],
  registeredAt = new Date(),
}) => {
  if (!to) throw new Error('Recipient email missing');

  const digits = String(contactNumber || '').replace(/\D/g, '');
  const maskedContact = digits.length >= 4
    ? `${'*'.repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`
    : 'Not provided';
  const safeCredentials = Array.isArray(uploadedCredentialTypes)
    ? uploadedCredentialTypes.map((item) => escapeHtml(item)).filter(Boolean)
    : [];
  const formattedDate = new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Manila',
  }).format(new Date(registeredAt));
  const rows = [
    ['Full Name', fullName],
    ['Email Address', to],
    ['Contact Number', maskedContact],
    ['Campus', campus],
    ['Course', course],
    ['Year Graduated', yearGraduated],
    ['Preferred Work Mode', preferredWorkMode],
    ['Availability to Start', availabilityToStart],
    ['Registration Date and Time', formattedDate],
  ];

  await sendMail({
    to,
    subject: 'AGAPAY Jobseeker Registration Summary',
    html: `
      <div style="background:#f4f6f9; padding:40px 15px; font-family:Arial, sans-serif;">
        <div style="max-width:620px; margin:auto; background:#ffffff; padding:30px; border-radius:8px; border:1px solid #e5e7eb;">
          <h2 style="margin:0; color:#1e3a8a; font-weight:600;">AGAPAY</h2>
          <p style="margin-top:25px; font-size:15px; color:#111827;">
            Hello <strong>${escapeHtml(fullName || 'Jobseeker')}</strong>,
          </p>
          <p style="font-size:14px; color:#374151; line-height:1.6;">
            Your jobseeker registration was submitted successfully. Below is a safe summary of the information you provided.
          </p>
          <table role="presentation" style="width:100%; margin-top:20px; border-collapse:collapse; font-size:14px;">
            <tbody>
              ${rows.map(([label, value]) => `
                <tr>
                  <td style="padding:10px; border:1px solid #e5e7eb; background:#f9fafb; font-weight:600; width:38%;">${escapeHtml(label)}</td>
                  <td style="padding:10px; border:1px solid #e5e7eb; color:#374151;">${escapeHtml(value || 'Not provided')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div style="margin-top:20px; padding:15px; background:#f9fafb; border:1px solid #e5e7eb; border-radius:6px;">
            <p style="margin:0 0 8px; font-size:14px; font-weight:600; color:#111827;">Successfully uploaded credential types</p>
            ${safeCredentials.length
              ? `<ul style="margin:0; padding-left:20px; color:#374151; font-size:14px; line-height:1.7;">${safeCredentials.map((item) => `<li>${item}</li>`).join('')}</ul>`
              : '<p style="margin:0; color:#6b7280; font-size:14px;">No credential type recorded.</p>'}
          </div>
          <p style="margin-top:20px; font-size:13px; color:#6b7280; line-height:1.6;">
            Your uploaded files, password, authentication tokens, and sensitive identification details are not included in this email.
          </p>
          <p style="margin-top:30px; font-size:12px; color:#9ca3af;">This is an automated message from AGAPAY. Please do not reply.</p>
        </div>
      </div>
    `,
  });
};

const sendEmployerRegistrationSummaryEmail = async ({
  to,
  companyName,
  website,
  industry,
  region,
  province,
  primaryContactFullName,
  contactNumber,
  uploadedCredentialTypes = [],
  registeredAt = new Date(),
  verificationStatus = 'Pending Verification',
}) => {
  if (!to) throw new Error('Recipient email missing');

  const digits = String(contactNumber || '').replace(/\D/g, '');
  const maskedContact = digits.length >= 4
    ? `${'*'.repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`
    : 'Not provided';
  const safeCredentials = Array.isArray(uploadedCredentialTypes)
    ? uploadedCredentialTypes.map((item) => escapeHtml(item)).filter(Boolean)
    : [];
  const formattedDate = new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Manila',
  }).format(new Date(registeredAt));
  const rows = [
    ['Company Name', companyName],
    ['Website', website || 'Not provided'],
    ['Industry', industry],
    ['Region', region],
    ['Province', province],
    ['Primary Contact', primaryContactFullName],
    ['Contact Number', maskedContact],
    ['Employee/Company Email', to],
    ['Registration Date and Time', formattedDate],
    ['Verification Status', verificationStatus],
  ];

  await sendMail({
    to,
    subject: 'AGAPAY Employer Registration Summary',
    html: `
      <div style="background:#f4f6f9; padding:40px 15px; font-family:Arial, sans-serif;">
        <div style="max-width:620px; margin:auto; background:#ffffff; padding:30px; border-radius:8px; border:1px solid #e5e7eb;">
          <h2 style="margin:0; color:#1e3a8a; font-weight:600;">AGAPAY</h2>
          <p style="margin-top:25px; font-size:15px; color:#111827;">
            Hello <strong>${escapeHtml(primaryContactFullName || 'Employer')}</strong>,
          </p>
          <p style="font-size:14px; color:#374151; line-height:1.6;">
            Your employer registration was submitted successfully. Below is a safe summary of the information you provided.
          </p>
          <table role="presentation" style="width:100%; margin-top:20px; border-collapse:collapse; font-size:14px;">
            <tbody>
              ${rows.map(([label, value]) => `
                <tr>
                  <td style="padding:10px; border:1px solid #e5e7eb; background:#f9fafb; font-weight:600; width:38%;">${escapeHtml(label)}</td>
                  <td style="padding:10px; border:1px solid #e5e7eb; color:#374151;">${escapeHtml(value || 'Not provided')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div style="margin-top:20px; padding:15px; background:#f9fafb; border:1px solid #e5e7eb; border-radius:6px;">
            <p style="margin:0 0 8px; font-size:14px; font-weight:600; color:#111827;">Successfully uploaded credential types</p>
            ${safeCredentials.length
              ? `<ul style="margin:0; padding-left:20px; color:#374151; font-size:14px; line-height:1.7;">${safeCredentials.map((item) => `<li>${item}</li>`).join('')}</ul>`
              : '<p style="margin:0; color:#6b7280; font-size:14px;">No credential type recorded.</p>'}
          </div>
          <p style="margin-top:20px; font-size:13px; color:#6b7280; line-height:1.6;">
            Passwords, authentication or verification tokens, uploaded files, registration numbers, and internal IDs are not included in this email.
          </p>
          <p style="margin-top:30px; font-size:12px; color:#9ca3af;">This is an automated message from AGAPAY. Please do not reply.</p>
        </div>
      </div>
    `,
  });
};

module.exports = {
  sendCredentialsEmail,
  sendPasswordResetEmail,
  sendPasswordResetOtpEmail,
  sendResubmitDocumentEmail,
  sendVerificationRejectedEmail,
  sendSettingsEmailVerificationCode,
  sendJobseekerRegistrationSummaryEmail,
  sendEmployerRegistrationSummaryEmail,
};
