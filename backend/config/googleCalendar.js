const crypto = require('crypto');
const { google } = require('googleapis');

const GOOGLE_CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events';

const getGoogleOAuthConfig = ({ requireRefreshToken = true } = {}) => {
  const config = {
    clientId: String(process.env.GOOGLE_CLIENT_ID || '').trim(),
    clientSecret: String(process.env.GOOGLE_CLIENT_SECRET || '').trim(),
    redirectUri: String(process.env.GOOGLE_REDIRECT_URI || '').trim(),
    refreshToken: String(process.env.GOOGLE_REFRESH_TOKEN || '').trim(),
    calendarId: String(process.env.GOOGLE_CALENDAR_ID || 'primary').trim() || 'primary',
  };

  const missing = [];

  if (!config.clientId) missing.push('GOOGLE_CLIENT_ID');
  if (!config.clientSecret) missing.push('GOOGLE_CLIENT_SECRET');
  if (!config.redirectUri) missing.push('GOOGLE_REDIRECT_URI');
  if (requireRefreshToken && !config.refreshToken) missing.push('GOOGLE_REFRESH_TOKEN');

  if (missing.length) {
    throw new Error(`Missing Google OAuth environment variable(s): ${missing.join(', ')}`);
  }

  return config;
};

const createGoogleOAuthClient = ({
  requireRefreshToken = true,
  refreshToken = '',
} = {}) => {
  const config = getGoogleOAuthConfig({
    requireRefreshToken: requireRefreshToken && !String(refreshToken || '').trim(),
  });

  const oauth2Client = new google.auth.OAuth2(
    config.clientId,
    config.clientSecret,
    config.redirectUri
  );

  const finalRefreshToken =
    String(refreshToken || '').trim() || String(config.refreshToken || '').trim();

  if (finalRefreshToken) {
    oauth2Client.setCredentials({
      refresh_token: finalRefreshToken,
    });
  }

  return oauth2Client;
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
  organizerRefreshToken = '',
  calendarId = 'primary',
}) => {
  const config = getGoogleOAuthConfig({
    requireRefreshToken: !String(organizerRefreshToken || '').trim(),
  });
  const auth = createGoogleOAuthClient({
    refreshToken: organizerRefreshToken,
  });
  const targetCalendarId =
    String(calendarId || '').trim() || config.calendarId || 'primary';

  const calendar = google.calendar({
    version: 'v3',
    auth,
  });

  const requestId = `agapay-${crypto.randomUUID()}`;

  const eventResponse = await calendar.events.insert({
    calendarId: targetCalendarId,
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
    };
  }

  if (!eventResponse.data?.id) {
    throw new Error('Google Calendar created no event ID.');
  }

  const completedConference = await waitForGoogleMeetLink({
    calendar,
    calendarId: targetCalendarId,
    eventId: eventResponse.data.id,
  });

  return {
    eventId: completedConference.event.id,
    meetingLink: completedConference.meetingLink,
    htmlLink: completedConference.event.htmlLink || '',
  };
};

module.exports = {
  GOOGLE_CALENDAR_SCOPE,
  createGoogleOAuthClient,
  createCalendarEvent,
};
