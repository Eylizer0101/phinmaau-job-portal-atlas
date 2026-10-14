// One-time setup: run locally with INFOBIP_API_KEY and INFOBIP_BASE_URL in the environment.
// It only creates an Infobip 2FA application and SMS message template; it does NOT send SMS.
const https = require('https');
const key = process.env.INFOBIP_API_KEY;
const base = process.env.INFOBIP_BASE_URL;
if (!key || !base) { console.error('Set INFOBIP_API_KEY and INFOBIP_BASE_URL before running.'); process.exit(1); }
let hostname;
try {
  hostname = new URL(base.startsWith('https://') ? base : `https://${base}`).hostname;
  if (!/^[a-z0-9.-]+\.api\.infobip\.com$/i.test(hostname)) throw new Error('Invalid host');
} catch (_) { console.error('Invalid INFOBIP_BASE_URL'); process.exit(1); }
const send = (path, payload) => new Promise((resolve, reject) => {
  const body = JSON.stringify(payload);
  const req = https.request({ hostname, path, method: 'POST', headers: { Authorization: `App ${key}`, 'Content-Type': 'application/json', Accept: 'application/json', 'Content-Length': Buffer.byteLength(body) } }, (res) => {
    let result = '';
    res.on('data', x => result += x);
    res.on('end', () => {
      try { const json = JSON.parse(result); if (res.statusCode < 200 || res.statusCode >= 300) throw Error(`HTTP ${res.statusCode}: ${result}`); resolve(json); }
      catch (err) { reject(err); }
    });
  });
  req.on('error', reject); req.end(body);
});
(async () => {
  const app = await send('/2fa/2/applications', { name: 'AGAPAY Mobile OTP', enabled: true, configuration: { pinAttempts: 5, allowMultiplePinVerifications: false, pinTimeToLive: '10m', verifyPinLimit: '1/3s', sendPinPerApplicationLimit: '100/1d', sendPinPerPhoneNumberLimit: '5/1d' } });
  const appId = app.applicationId || app.id;
  if (!appId) throw Error('No application ID returned');
  console.log('INFOBIP_2FA_APPLICATION_ID=' + appId);
  const template = await send(`/2fa/2/applications/${encodeURIComponent(appId)}/messages`, { pinType: 'NUMERIC', pinLength: 6, messageText: 'Your AGAPAY mobile verification code is {{pin}}. Do not share this code.', senderId: 'Infobip 2FA' });
  const msgId = template.messageId || template.id;
  if (!msgId) throw Error('No message ID returned. Create the SMS template manually for application ' + appId);
  console.log('INFOBIP_2FA_MESSAGE_ID=' + msgId);
  console.log('Add these two IDs as Render backend environment variables.');
})().catch(err => { console.error(err.message); process.exitCode = 1; });
