const crypto = require('crypto');
const { google } = require('googleapis');

const GOOGLE_CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events';
const GOOGLE_IDENTITY_SCOPES = ['openid', 'email'];

const getGoogleOAuthConfig = () => {
  const config = {
    clientId: String(process.env.GOOGLE_CLIENT_ID || '').trim(),
    clientSecret: String(process.env.GOOGLE_CLIENT_SECRET || '').trim(),
    redirectUri: String(process.env.GOOGLE_REDIRECT_URI || '').trim(),
    calendarId: String(process.env.GOOGLE_CALENDAR_ID || 'primary').trim() || 'primary',
  };

  const missing = [];

  if (!config.clientId) missing.push('GOOGLE_CLIENT_ID');
  if (!config.clientSecret) missing.push('GOOGLE_CLIENT_SECRET');
  if (!config.redirectUri) missing.push('GOOGLE_REDIRECT_URI');

  if (missing.length) {
    throw new Error(`Missing Google OAuth environment variable(s): ${missing.join(', ')}`);
  }

  return config;
};

const createGoogleOAuthClient = ({ refreshToken = '', requireRefreshToken = false } = {}) => {
  const config = getGoogleOAuthConfig();
  const normalizedRefreshToken = String(refreshToken || '').trim();

  if (requireRefreshToken && !normalizedRefreshToken) {
    throw new Error('The employer has not connected a Google Calendar account.');
  }

  const oauth2Client = new google.auth.OAuth2(
    config.clientId,
    config.clientSecret,
    config.redirectUri
  );

  if (normalizedRefreshToken) {
    oauth2Client.setCredentials({
      refresh_token: normalizedRefreshToken,
    });
  }

  return oauth2Client;
};

const getTokenEncryptionKey = () => {
  const secret = String(
    process.env.GOOGLE_TOKEN_ENCRYPTION_KEY ||
      process.env.JWT_SECRET ||
      ''
  ).trim();

  if (!secret) {
    throw new Error(
      'Missing GOOGLE_TOKEN_ENCRYPTION_KEY or JWT_SECRET for Google token encryption.'
    );
  }

  return crypto.createHash('sha256').update(secret).digest();
};

const encryptGoogleRefreshToken = (refreshToken) => {
  const normalizedToken = String(refreshToken || '').trim();
  if (!normalizedToken) return '';

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getTokenEncryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(normalizedToken, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    'v1',
    iv.toString('base64url'),
    authTag.toString('base64url'),
    encrypted.toString('base64url'),
  ].join('.');
};

const decryptGoogleRefreshToken = (encryptedValue) => {
  const normalizedValue = String(encryptedValue || '').trim();
  if (!normalizedValue) return '';

  const parts = normalizedValue.split('.');

  // Backward-compatible fallback for an already stored plain refresh token.
  if (parts.length !== 4 || parts[0] !== 'v1') {
    return normalizedValue;
  }

  const [, ivValue, authTagValue, encryptedTokenValue] = parts;
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    getTokenEncryptionKey(),
    Buffer.from(ivValue, 'base64url')
  );

  decipher.setAuthTag(Buffer.from(authTagValue, 'base64url'));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedTokenValue, 'base64url')),
    decipher.final(),
  ]);

  return decrypted.toString('utf8').trim();
};

const sleep = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const getGoogleMeetLink = (eventData) => {
  const directLink = String(eventData?.hangoutLink || '').trim();
  if (directLink) return directLink;

  const videoEntryPoint = eventData?.conferenceData?.entryPoints?.find(
    (entryPoint) => entryPoint?.entryPointType === 'video' && entryPoint?.uri
  );

  return String(videoEntryPoint?.uri || '').trim();
};

const waitForGoogleMeetLink = async ({ calendar, calendarId, eventId }) => {
  const maxAttempts = 10;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const response = await calendar.events.get({
      calendarId,
      eventId,
      conferenceDataVersion: 1,
    });

    const meetingLink = getGoogleMeetLink(response.data);
    if (meetingLink) {
      return {
        event: response.data,
        meetingLink,
      };
    }

    const conferenceStatus =
      response.data?.conferenceData?.createRequest?.status?.statusCode || '';

    if (conferenceStatus === 'failure') {
      throw new Error('Google Calendar failed to create the Google Meet conference.');
    }

    if (attempt < maxAttempts) {
      await sleep(1000);
    }
  }

  throw new Error('Google Meet conference creation is still pending. Please try again.');
};

const createCalendarEvent = async ({
  summary,
  description,
  startTime,
  endTime,
  attendeeEmail,
  refreshToken,
  calendarId,
}) => {
  const config = getGoogleOAuthConfig();
  const selectedCalendarId = String(calendarId || config.calendarId || 'primary').trim() || 'primary';
  const auth = createGoogleOAuthClient({
    refreshToken,
    requireRefreshToken: true,
  });

  const calendar = google.calendar({
    version: 'v3',
    auth,
  });

  const requestId = `agapay-${crypto.randomUUID()}`;

  const eventResponse = await calendar.events.insert({
    calendarId: selectedCalendarId,
    conferenceDataVersion: 1,
    sendUpdates: attendeeEmail ? 'all' : 'none',
    requestBody: {
      summary: String(summary || 'AGAPAY Interview').trim(),
      description: String(description || '').trim(),
      start: {
        dateTime: new Date(startTime).toISOString(),
      },
      end: {
        dateTime: new Date(endTime).toISOString(),
      },
      attendees: attendeeEmail
        ? [{ email: String(attendeeEmail).trim() }]
        : [],
      conferenceData: {
        createRequest: {
          requestId,
          conferenceSolutionKey: {
            type: 'hangoutsMeet',
          },
        },
      },
    },
  });

  const immediateMeetingLink = getGoogleMeetLink(eventResponse.data);

  if (immediateMeetingLink) {
    return {
      eventId: eventResponse.data.id,
      meetingLink: immediateMeetingLink,
      htmlLink: eventResponse.data.htmlLink || '',
      organizerEmail: eventResponse.data?.organizer?.email || '',
    };
  }

  if (!eventResponse.data?.id) {
    throw new Error('Google Calendar created no event ID.');
  }

  const completedConference = await waitForGoogleMeetLink({
    calendar,
    calendarId: selectedCalendarId,
    eventId: eventResponse.data.id,
  });

  return {
    eventId: completedConference.event.id,
    meetingLink: completedConference.meetingLink,
    htmlLink: completedConference.event.htmlLink || '',
    organizerEmail: completedConference.event?.organizer?.email || '',
  };
};

module.exports = {
  GOOGLE_CALENDAR_SCOPE,
  GOOGLE_IDENTITY_SCOPES,
  createGoogleOAuthClient,
  encryptGoogleRefreshToken,
  decryptGoogleRefreshToken,
  createCalendarEvent,
};
