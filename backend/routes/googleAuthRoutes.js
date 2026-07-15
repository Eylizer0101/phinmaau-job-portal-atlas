const crypto = require('crypto');
const express = require('express');
const { google } = require('googleapis');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  GOOGLE_CALENDAR_SCOPE,
  GOOGLE_IDENTITY_SCOPES,
  createGoogleOAuthClient,
  encryptGoogleRefreshToken,
} = require('../config/googleCalendar');

const apiRouter = express.Router();
const callbackRouter = express.Router();

const getStateSecret = () => {
  const secret = String(
    process.env.GOOGLE_OAUTH_STATE_SECRET ||
      process.env.JWT_SECRET ||
      ''
  ).trim();

  if (!secret) {
    throw new Error('Missing GOOGLE_OAUTH_STATE_SECRET or JWT_SECRET.');
  }

  return secret;
};

const secureEqual = (leftValue, rightValue) => {
  const left = Buffer.from(String(leftValue || ''));
  const right = Buffer.from(String(rightValue || ''));

  if (!left.length || left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
};

const createSignedState = ({ userId }) => {
  const payload = Buffer.from(
    JSON.stringify({
      userId: String(userId || ''),
      nonce: crypto.randomBytes(16).toString('hex'),
      expiresAt: Date.now() + 10 * 60 * 1000,
    })
  ).toString('base64url');

  const signature = crypto
    .createHmac('sha256', getStateSecret())
    .update(payload)
    .digest('base64url');

  return `${payload}.${signature}`;
};

const verifySignedState = (state) => {
  const [payload, suppliedSignature] = String(state || '').split('.');
  if (!payload || !suppliedSignature) return null;

  const expectedSignature = crypto
    .createHmac('sha256', getStateSecret())
    .update(payload)
    .digest('base64url');

  if (!secureEqual(suppliedSignature, expectedSignature)) return null;

  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));

    if (!decoded?.userId || Number(decoded?.expiresAt || 0) <= Date.now()) {
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
};

const getFrontendBaseUrl = () =>
  String(
    process.env.FRONTEND_URL ||
      process.env.APP_URL ||
      'https://phinmaau-job-portal-atlas-1.onrender.com'
  )
    .trim()
    .replace(/\/$/, '');

const buildSettingsRedirect = ({ status, message = '' }) => {
  const params = new URLSearchParams({ googleCalendar: status });
  if (message) params.set('message', message);
  return `${getFrontendBaseUrl()}/employer/settings?${params.toString()}`;
};

const getEmployerWithGoogleToken = (employerId) =>
  User.findById(employerId).select(
    '+employerProfile.googleCalendar.refreshToken role employerProfile.googleCalendar.connected employerProfile.googleCalendar.email employerProfile.googleCalendar.connectedAt employerProfile.googleCalendar.updatedAt'
  );

apiRouter.use(protect, authorize('employer'));

apiRouter.get('/status', async (req, res) => {
  try {
    const employer = await getEmployerWithGoogleToken(req.user._id);

    if (!employer) {
      return res.status(404).json({
        success: false,
        message: 'Employer not found',
      });
    }

    const connection = employer?.employerProfile?.googleCalendar || {};
    const connected = Boolean(connection.connected && connection.refreshToken);

    return res.status(200).json({
      success: true,
      connected,
      email: connected ? String(connection.email || '').trim() : '',
      connectedAt: connected ? connection.connectedAt || null : null,
    });
  } catch (error) {
    console.error('Google Calendar status error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to check Google Calendar connection.',
    });
  }
});

apiRouter.post('/connect-url', async (req, res) => {
  try {
    const oauth2Client = createGoogleOAuthClient();
    const state = createSignedState({ userId: req.user._id });

    const authorizationUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      include_granted_scopes: true,
      scope: [GOOGLE_CALENDAR_SCOPE, ...GOOGLE_IDENTITY_SCOPES],
      state,
      login_hint: String(req.user.email || '').trim() || undefined,
    });

    return res.status(200).json({
      success: true,
      authorizationUrl,
    });
  } catch (error) {
    console.error('Google Calendar connect URL error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Unable to start Google Calendar connection.',
    });
  }
});

apiRouter.delete('/disconnect', async (req, res) => {
  try {
    const employer = await getEmployerWithGoogleToken(req.user._id);

    if (!employer) {
      return res.status(404).json({
        success: false,
        message: 'Employer not found',
      });
    }

    employer.employerProfile.googleCalendar = {
      connected: false,
      email: '',
      refreshToken: '',
      connectedAt: null,
      updatedAt: new Date(),
    };

    await employer.save();

    return res.status(200).json({
      success: true,
      message: 'Google Calendar disconnected successfully.',
    });
  } catch (error) {
    console.error('Google Calendar disconnect error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to disconnect Google Calendar.',
    });
  }
});

callbackRouter.get('/connect', (req, res) => {
  return res.redirect(
    buildSettingsRedirect({
      status: 'error',
      message: 'Open Employer Settings and use Connect Google Calendar.',
    })
  );
});

callbackRouter.get('/callback', async (req, res) => {
  try {
    if (req.query.error) {
      return res.redirect(
        buildSettingsRedirect({
          status: 'error',
          message: `Google authorization was not completed: ${String(req.query.error)}`,
        })
      );
    }

    const stateData = verifySignedState(req.query.state);
    if (!stateData) {
      return res.redirect(
        buildSettingsRedirect({
          status: 'error',
          message: 'The Google authorization request is invalid or expired.',
        })
      );
    }

    const authorizationCode = String(req.query.code || '').trim();
    if (!authorizationCode) {
      return res.redirect(
        buildSettingsRedirect({
          status: 'error',
          message: 'Google did not return an authorization code.',
        })
      );
    }

    const employer = await getEmployerWithGoogleToken(stateData.userId);

    if (!employer || employer.role !== 'employer') {
      return res.redirect(
        buildSettingsRedirect({
          status: 'error',
          message: 'The employer account for this Google connection was not found.',
        })
      );
    }

    const oauth2Client = createGoogleOAuthClient();
    const { tokens } = await oauth2Client.getToken(authorizationCode);
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({
      version: 'v2',
      auth: oauth2Client,
    });
    const userInfoResponse = await oauth2.userinfo.get();
    const googleEmail = String(userInfoResponse?.data?.email || '').trim().toLowerCase();
    const newRefreshToken = String(tokens?.refresh_token || '').trim();
    const existingConnection = employer?.employerProfile?.googleCalendar || {};
    const existingEmail = String(existingConnection.email || '').trim().toLowerCase();

    let encryptedRefreshToken = '';

    if (newRefreshToken) {
      encryptedRefreshToken = encryptGoogleRefreshToken(newRefreshToken);
    } else if (
      existingConnection.refreshToken &&
      googleEmail &&
      existingEmail === googleEmail
    ) {
      encryptedRefreshToken = existingConnection.refreshToken;
    }

    if (!encryptedRefreshToken) {
      return res.redirect(
        buildSettingsRedirect({
          status: 'error',
          message: 'Google did not return a refresh token. Remove AGAPAY access from your Google Account and connect again.',
        })
      );
    }

    employer.employerProfile.googleCalendar = {
      connected: true,
      email: googleEmail,
      refreshToken: encryptedRefreshToken,
      connectedAt: new Date(),
      updatedAt: new Date(),
    };

    await employer.save();

    return res.redirect(
      buildSettingsRedirect({
        status: 'connected',
      })
    );
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    return res.redirect(
      buildSettingsRedirect({
        status: 'error',
        message: error.message || 'Google Calendar connection failed.',
      })
    );
  }
});

module.exports = {
  apiRouter,
  callbackRouter,
};
