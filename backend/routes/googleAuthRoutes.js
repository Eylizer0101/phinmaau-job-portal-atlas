const crypto = require('crypto');
const express = require('express');
const {
  GOOGLE_CALENDAR_SCOPE,
  createGoogleOAuthClient,
} = require('../config/googleCalendar');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

const getSetupKey = () => String(process.env.GOOGLE_OAUTH_SETUP_KEY || '').trim();

const secureEqual = (leftValue, rightValue) => {
  const left = Buffer.from(String(leftValue || ''));
  const right = Buffer.from(String(rightValue || ''));

  if (!left.length || left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
};

const getStateSecret = () =>
  String(process.env.GOOGLE_OAUTH_STATE_SECRET || process.env.JWT_SECRET || getSetupKey()).trim();

const createSignedState = (secret, extraPayload = {}) => {
  const payload = Buffer.from(
    JSON.stringify({
      nonce: crypto.randomBytes(16).toString('hex'),
      expiresAt: Date.now() + 10 * 60 * 1000,
      ...extraPayload,
    })
  ).toString('base64url');

  const signature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('base64url');

  return `${payload}.${signature}`;
};

const verifyAndDecodeSignedState = (state, secret) => {
  const [payload, suppliedSignature] = String(state || '').split('.');
  if (!payload || !suppliedSignature) return null;

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('base64url');

  if (!secureEqual(suppliedSignature, expectedSignature)) return null;

  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return Number(decoded?.expiresAt || 0) > Date.now() ? decoded : null;
  } catch {
    return null;
  }
};

const verifySignedState = (state, secret) =>
  Boolean(verifyAndDecodeSignedState(state, secret));

const escapeHtml = (value) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const sendHtml = (res, statusCode, title, bodyHtml) => {
  res.set({
    'Cache-Control': 'no-store, max-age=0',
    Pragma: 'no-cache',
    'X-Content-Type-Options': 'nosniff',
  });

  return res.status(statusCode).send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="font-family:Arial,sans-serif;max-width:850px;margin:40px auto;padding:0 20px;line-height:1.55;color:#172033;">
  <h1>${escapeHtml(title)}</h1>
  ${bodyHtml}
</body>
</html>`);
};


// Returns a Google authorization URL for the currently logged-in employer.
// The employer must approve using the Google account that should own/host the Meet.
router.get(
  '/employer/connect-url',
  protect,
  authorize('employer'),
  async (req, res) => {
    try {
      const stateSecret = getStateSecret();

      if (!stateSecret) {
        return res.status(503).json({
          success: false,
          message: 'Google OAuth state secret is not configured.',
        });
      }

      const oauth2Client = createGoogleOAuthClient({
        requireRefreshToken: false,
      });

      const state = createSignedState(stateSecret, {
        flow: 'employer-calendar',
        userId: req.user._id.toString(),
      });

      const authorizationUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent select_account',
        include_granted_scopes: true,
        scope: [GOOGLE_CALENDAR_SCOPE, 'openid', 'email'],
        state,
        login_hint: String(req.user.email || '').trim() || undefined,
      });

      return res.json({
        success: true,
        authorizationUrl,
      });
    } catch (error) {
      console.error('Employer Google OAuth connect URL error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Unable to start Google Calendar connection.',
      });
    }
  }
);

router.get('/connect', (req, res) => {
  try {
    const setupKey = getSetupKey();
    const providedKey = String(req.query.key || '').trim();

    if (!setupKey) {
      return sendHtml(
        res,
        503,
        'Google OAuth setup is disabled',
        '<p>Add <code>GOOGLE_OAUTH_SETUP_KEY</code> to the backend environment, redeploy, and try again.</p>'
      );
    }

    if (!secureEqual(providedKey, setupKey)) {
      return sendHtml(
        res,
        403,
        'Access denied',
        '<p>The Google OAuth setup key is missing or invalid.</p>'
      );
    }

    const oauth2Client = createGoogleOAuthClient({ requireRefreshToken: false });
    const state = createSignedState(setupKey);

    const authorizationUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      include_granted_scopes: true,
      scope: [GOOGLE_CALENDAR_SCOPE],
      state,
      login_hint: String(process.env.GOOGLE_CALENDAR_ACCOUNT_EMAIL || '').trim() || undefined,
    });

    return res.redirect(authorizationUrl);
  } catch (error) {
    console.error('Google OAuth connect error:', error);
    return sendHtml(
      res,
      500,
      'Google OAuth setup error',
      `<p>${escapeHtml(error.message)}</p>`
    );
  }
});

router.get('/callback', async (req, res) => {
  try {
    const stateSecret = getStateSecret();
    const decodedState = stateSecret
      ? verifyAndDecodeSignedState(req.query.state, stateSecret)
      : null;

    if (decodedState?.flow === 'employer-calendar') {
      if (req.query.error) {
        return sendHtml(
          res,
          400,
          'Google authorization was not completed',
          `<p>Google returned: <code>${escapeHtml(req.query.error)}</code></p>`
        );
      }

      const authorizationCode = String(req.query.code || '').trim();
      if (!authorizationCode) {
        return sendHtml(
          res,
          400,
          'Missing authorization code',
          '<p>Google did not return an authorization code.</p>'
        );
      }

      const employer = await User.findOne({
        _id: decodedState.userId,
        role: 'employer',
      }).select('+googleCalendarAuth.refreshToken');

      if (!employer) {
        return sendHtml(
          res,
          404,
          'Employer account not found',
          '<p>The employer account connected to this request no longer exists.</p>'
        );
      }

      const oauth2Client = createGoogleOAuthClient({
        requireRefreshToken: false,
      });
      const { tokens } = await oauth2Client.getToken(authorizationCode);
      oauth2Client.setCredentials(tokens);

      let googleEmail = '';
      try {
        const oauth2 = require('googleapis').google.oauth2({
          version: 'v2',
          auth: oauth2Client,
        });
        const profileResponse = await oauth2.userinfo.get();
        googleEmail = String(profileResponse.data?.email || '').trim().toLowerCase();
      } catch (profileError) {
        console.warn('Unable to read connected Google email:', profileError.message);
      }

      const refreshToken =
        String(tokens?.refresh_token || '').trim() ||
        String(employer.googleCalendarAuth?.refreshToken || '').trim();

      if (!refreshToken) {
        return sendHtml(
          res,
          400,
          'No refresh token was returned',
          '<p>Remove the app access from your Google Account, then connect again and approve Calendar access.</p>'
        );
      }

      employer.googleCalendarAuth = {
        refreshToken,
        googleEmail,
        connectedAt: new Date(),
      };
      await employer.save();

      const frontendUrl = String(
        process.env.FRONTEND_URL ||
        process.env.APP_URL ||
        'http://localhost:3000'
      )
        .split(',')[0]
        .trim()
        .replace(/\/$/, '');

      return res.redirect(
        `${frontendUrl}/employer/for-interview?googleCalendar=connected`
      );
    }

    const setupKey = getSetupKey();

    if (!setupKey) {
      return sendHtml(
        res,
        503,
        'Google OAuth setup is disabled',
        '<p>The setup key is missing from the backend environment.</p>'
      );
    }

    if (req.query.error) {
      return sendHtml(
        res,
        400,
        'Google authorization was not completed',
        `<p>Google returned: <code>${escapeHtml(req.query.error)}</code></p>`
      );
    }

    if (!verifySignedState(req.query.state, setupKey)) {
      return sendHtml(
        res,
        400,
        'Invalid or expired OAuth request',
        '<p>Start the connection again using the Google OAuth connect URL.</p>'
      );
    }

    const authorizationCode = String(req.query.code || '').trim();
    if (!authorizationCode) {
      return sendHtml(
        res,
        400,
        'Missing authorization code',
        '<p>Google did not return an authorization code.</p>'
      );
    }

    const oauth2Client = createGoogleOAuthClient({ requireRefreshToken: false });
    const { tokens } = await oauth2Client.getToken(authorizationCode);
    const refreshToken = String(tokens?.refresh_token || '').trim();

    if (!refreshToken) {
      return sendHtml(
        res,
        400,
        'No refresh token was returned',
        '<p>Remove the app access from your Google Account, then open the connect URL again and approve Calendar access.</p>'
      );
    }

    return sendHtml(
      res,
      200,
      'Google Calendar connected successfully',
      `<p>Copy the token below and save it as <code>GOOGLE_REFRESH_TOKEN</code> in Render Environment Variables.</p>
       <textarea readonly style="width:100%;min-height:150px;padding:12px;font-family:monospace;box-sizing:border-box;">${escapeHtml(refreshToken)}</textarea>
       <p><strong>After saving it:</strong> redeploy the backend, test a new Video Call interview, then remove <code>GOOGLE_OAUTH_SETUP_KEY</code> from Render to disable this setup route.</p>
       <p>Do not commit or share this refresh token.</p>`
    );
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    return sendHtml(
      res,
      500,
      'Google OAuth callback failed',
      `<p>${escapeHtml(error.message)}</p>`
    );
  }
});

module.exports = router;
