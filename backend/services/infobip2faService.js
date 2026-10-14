// Infobip 2FA integration. Never expose the API key to the React frontend.
const https = require('https');

const configured = () => {
  const key = process.env.INFOBIP_API_KEY;
  const base = process.env.INFOBIP_BASE_URL;
  const applicationId = process.env.INFOBIP_2FA_APPLICATION_ID;
  const messageId = process.env.INFOBIP_2FA_MESSAGE_ID;
  if (![key, base, applicationId, messageId].every(Boolean)) {
    const error = new Error('Infobip SMS OTP is not configured on the backend.');
    error.status = 503;
    error.safeMessage = 'SMS verification is temporarily unavailable. Please contact support.';
    throw error;
  }
  return { applicationId, messageId };
};

const infobipRequest = async (path, data) => {
  const apiKey = process.env.INFOBIP_API_KEY;
  const domain = String(process.env.INFOBIP_BASE_URL || '').trim();
  let origin;
  try {
    origin = new URL(domain.startsWith('https://') ? domain : `https://${domain}`);
    if (origin.protocol !== 'https:' || !/^[a-z0-9.-]+\.api\.infobip\.com$/i.test(origin.hostname)) throw new Error('Invalid API URL');
  } catch (_) {
    const error = new Error('Invalid INFOBIP_BASE_URL configuration.');
    error.status = 503;
    error.safeMessage = 'SMS verification is temporarily unavailable. Please contact support.';
    throw error;
  }
  const payload = JSON.stringify(data);
  return new Promise((resolve, reject) => {
    const request = https.request({
      hostname: origin.hostname, method: 'POST', path,
      timeout: 15000,
      headers: { Authorization: `App ${apiKey}`, Accept: 'application/json', 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
    }, (response) => {
      let text = '';
      response.on('data', (piece) => { if (text.length < 20000) text += piece; });
      response.on('end', () => {
        let parsed = {};
        try { parsed = JSON.parse(text); } catch (_) { /* Unstructured upstream error */ }
        if (response.statusCode >= 200 && response.statusCode < 300) return resolve(parsed);
        // Log only a provider status/code, never the API key, phone number, or OTP.
        const providerCode = String(
          parsed.requestError?.serviceException?.messageId ||
          parsed.requestError?.serviceException?.errorCode ||
          parsed.requestError?.serviceException?.code ||
          parsed.errorCode ||
          parsed.code ||
          'UNKNOWN'
        ).replace(/[^a-zA-Z0-9_.-]/g, '').slice(0, 60);
        const error = new Error(`Infobip SMS request failed (HTTP ${response.statusCode}, provider code ${providerCode}).`);
        error.status = response.statusCode;
        error.providerCode = providerCode;
        error.safeMessage = response.statusCode === 429
          ? 'Too many SMS requests. Please wait before trying again.'
          : 'SMS verification could not be completed. Please try again later.';
        return reject(error);
      });
    });
    request.on('timeout', () => request.destroy(new Error('Infobip request timed out')));
    request.on('error', reject);
    request.end(payload);
  });
};

const sendPin = async (phone) => {
  const { applicationId, messageId } = configured();
  const response = await infobipRequest('/2fa/2/pin', { applicationId, messageId, from: 'Infobip 2FA', to: phone.replace(/^\+/, '') });
  if (!response.pinId) throw new Error('Infobip did not return a PIN ID.');
  return { pinId: response.pinId };
};
const verifyPin = async (pinId, pin) => {
  configured();
  const response = await infobipRequest(`/2fa/2/pin/${encodeURIComponent(pinId)}/verify`, { pin });
  return { verified: response.verified === true };
};
module.exports = { sendPin, verifyPin, infobipRequest };
