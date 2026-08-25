import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../../../services/api.js';
import { FaEye, FaEyeSlash, FaInfoCircle } from 'react-icons/fa';

const focusRing =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2 focus-visible:ring-offset-white';

const Panel = ({ title, blue = false, children }) => (
  <div className="bg-white border border-[#e6edf5] rounded-2xl shadow-[0_12px_30px_rgba(46,102,166,0.06)] overflow-hidden">
    <div
      className={`px-5 py-3 text-sm font-bold border-b ${
        blue
          ? 'bg-[#2e66a6] text-white border-[#2e66a6]'
          : 'bg-[#f7faff] text-black border-[#e6edf5]'
      }`}
    >
      {title}
    </div>
    <div className="px-5 py-5 sm:px-6 sm:py-6">{children}</div>
  </div>
);

const StatusBadge = ({ verified }) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${
      verified
        ? 'bg-[#eaf2fb] text-[#2e66a6] border-[#d8e2ee]'
        : 'bg-[#f7faff] text-black/55 border-[#e6edf5]'
    }`}
  >
    <span className={`w-2 h-2 rounded-full ${verified ? 'bg-[#2e66a6]' : 'bg-black/35'}`} />
    {verified ? 'verified' : 'unverified'}
  </span>
);

const PasswordInput = ({ value, onChange, placeholder, show, onToggle, autoComplete }) => (
  <div className="relative">
    <input
      type={show ? 'text' : 'password'}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      autoComplete={autoComplete}
      className={`w-full h-11 px-4 pr-11 rounded-xl border border-[#d8e2ee] bg-white text-sm text-black placeholder:text-black/40 transition focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/20 ${focusRing}`}
    />
    <button
      type="button"
      onClick={onToggle}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-black/40 hover:text-[#2e66a6] transition"
      aria-label={show ? 'Hide password' : 'Show password'}
    >
      {show ? <FaEyeSlash /> : <FaEye />}
    </button>
  </div>
);

const TextInput = ({ value, onChange, placeholder, type = 'text' }) => (
  <input
    type={type}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    className={`w-full h-11 px-4 rounded-xl border border-[#d8e2ee] bg-white text-sm text-black placeholder:text-black/40 transition focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/20 ${focusRing}`}
  />
);

const SaveButton = ({ loading, children = 'Save' }) => (
  <button
    type="submit"
    disabled={loading}
    className={`px-7 h-11 rounded-xl bg-[#2e66a6] hover:bg-[#25578f] active:bg-[#1f4b7c] text-white text-sm font-bold shadow-[0_10px_22px_rgba(46,102,166,0.18)] transition disabled:opacity-60 ${focusRing}`}
  >
    {loading ? 'Saving...' : children}
  </button>
);

function buildFullName(user) {
  if (!user) return 'User';
  const parts = [user.firstName, user.middleName, user.lastName, user.extensionName]
    .map((p) => String(p || '').trim())
    .filter(Boolean);
  if (parts.length) return parts.join(' ');
  return user.email || user.username || 'User';
}

const Settings = () => {
  const [me, setMe] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [emailPassword, setEmailPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [emailCode, setEmailCode] = useState('');

  const [newMobile, setNewMobile] = useState('+63');
  const [mobileCode, setMobileCode] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showEmailPassword, setShowEmailPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [savingEmailChange, setSavingEmailChange] = useState(false);
  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const [savingMobileChange, setSavingMobileChange] = useState(false);
  const [verifyingMobile, setVerifyingMobile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const clearAlerts = () => {
    setError('');
    setSuccess('');
  };

  const fetchMe = useCallback(async () => {
    try {
      setLoadingUser(true);
      const res = await api.get('/auth/me');
      const user = res.data?.user || res.data?.data?.user || null;
      setMe(user);
      if (user?.jobSeekerProfile?.phoneNumber) setNewMobile(user.jobSeekerProfile.phoneNumber);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load settings.');
    } finally {
      setLoadingUser(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const verification = me?.settingsVerification || {};
  const displayEmail = me?.email || '—';
  const displayMobile = me?.jobSeekerProfile?.phoneNumber || '—';
  const emailVerified = Boolean(verification.emailVerified);
  const phoneVerified = Boolean(verification.phoneVerified);
  const pendingEmail = verification.pendingEmail || '';
  const pendingPhone = verification.pendingPhoneNumber || '';

  const fullName = useMemo(() => buildFullName(me), [me]);

  const handleRequestEmailChange = async (e) => {
    e.preventDefault();
    clearAlerts();

    if (!emailPassword || !newEmail) {
      setError('Please enter your current password and new email address.');
      return;
    }

    try {
      setSavingEmailChange(true);
      const res = await api.post('/auth/settings/request-email-verification', {
        currentPassword: emailPassword,
        newEmail,
      });
      setSuccess(res.data?.message || 'Verification code sent to your new email address.');
      setEmailPassword('');
      await fetchMe();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send email verification code.');
    } finally {
      setSavingEmailChange(false);
    }
  };

  const handleVerifyEmail = async (e) => {
    e.preventDefault();
    clearAlerts();

    if (!emailCode) {
      setError('Please enter your email verification code.');
      return;
    }

    try {
      setVerifyingEmail(true);
      const res = await api.post('/auth/settings/verify-email', { code: emailCode });
      setSuccess(res.data?.message || 'Email verified successfully.');
      setEmailCode('');
      if (res.data?.user) {
        setMe(res.data.user);
        localStorage.setItem('user', JSON.stringify(res.data.user));
      } else {
        await fetchMe();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to verify email.');
    } finally {
      setVerifyingEmail(false);
    }
  };

  const handleResendEmail = async () => {
    clearAlerts();
    try {
      const res = await api.post('/auth/settings/resend-email-verification');
      setSuccess(res.data?.message || 'Verification code sent.');
      await fetchMe();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend email verification code.');
    }
  };

  const handleRequestMobileChange = async (e) => {
    e.preventDefault();
    clearAlerts();

    if (!newMobile || newMobile === '+63') {
      setError('Please enter your new mobile number.');
      return;
    }

    try {
      setSavingMobileChange(true);
      const res = await api.post('/auth/settings/request-phone-verification', { phoneNumber: newMobile });
      setSuccess(res.data?.message || 'Verification code sent to your mobile number.');
      await fetchMe();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send mobile verification code.');
    } finally {
      setSavingMobileChange(false);
    }
  };

  const handleVerifyMobile = async (e) => {
    e.preventDefault();
    clearAlerts();

    if (!mobileCode) {
      setError('Please enter your mobile verification code.');
      return;
    }

    try {
      setVerifyingMobile(true);
      const res = await api.post('/auth/settings/verify-phone', { code: mobileCode });
      setSuccess(res.data?.message || 'Mobile number verified successfully.');
      setMobileCode('');
      if (res.data?.user) {
        setMe(res.data.user);
        localStorage.setItem('user', JSON.stringify(res.data.user));
      } else {
        await fetchMe();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to verify mobile number.');
    } finally {
      setVerifyingMobile(false);
    }
  };

  const handleResendMobile = async () => {
    clearAlerts();
    try {
      const res = await api.post('/auth/settings/resend-phone-verification');
      setSuccess(res.data?.message || 'Mobile verification code sent.');
      await fetchMe();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend mobile verification code.');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    clearAlerts();

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Please complete all password fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New password and retype password do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    try {
      setSavingPassword(true);
      const res = await api.put('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      setSuccess(res.data?.message || 'Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change password.');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-8"><div className="max-w-6xl mx-auto">
      <div className="mb-4">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-black">Settings</h1>
        <p className="text-sm sm:text-base text-black/60 mt-2">Manage your email, mobile number, and password.</p>
      </div>

      {loadingUser ? (
        <div className="bg-[#f7faff] border border-[#e6edf5] rounded-2xl p-5 text-sm text-black/60 shadow-sm">Loading settings...</div>
      ) : null}

      {error ? (
        <div className="mb-4 bg-[#fff7f7] border border-red-200 rounded-2xl p-4 text-sm text-red-700 shadow-sm">
          <div className="font-semibold">Error</div>
          <div>{error}</div>
        </div>
      ) : null}

      {success ? (
        <div className="mb-4 bg-[#f7faff] border border-[#d8e2ee] rounded-2xl p-4 text-sm text-[#2e66a6] shadow-sm">
          <div className="font-semibold">Success</div>
          <div>{success}</div>
        </div>
      ) : null}

      <div className="space-y-5">
        <Panel title="Change Email">
          <form onSubmit={handleRequestEmailChange}>
            <div className="space-y-4 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-black/70">Current Email Address:</span>
                <span className="font-medium text-black">{displayEmail}</span>
                <StatusBadge verified={emailVerified} />
              </div>
              <p className="text-xs text-black/50">To change your email, please complete the following fields.</p>
              {pendingEmail ? <p className="text-xs text-[#2e66a6]">Pending new email verification: {pendingEmail}</p> : null}

              <div className="grid grid-cols-1 sm:grid-cols-[170px_1fr] max-w-xl items-start sm:items-center gap-2 sm:gap-3">
                <label className="text-black/70">Current Password:</label>
                <PasswordInput
                  value={emailPassword}
                  onChange={(e) => setEmailPassword(e.target.value)}
                  placeholder="Enter password here"
                  show={showEmailPassword}
                  onToggle={() => setShowEmailPassword((v) => !v)}
                  autoComplete="current-password"
                />

                <label className="text-black/70">New Email Address:</label>
                <TextInput
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="Enter new email here"
                  type="email"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <SaveButton loading={savingEmailChange} />
            </div>
          </form>
        </Panel>

        <Panel title="Verify Email" blue>
          <form onSubmit={handleVerifyEmail}>
            <div className="space-y-4 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-black/70">Current Email Address:</span>
                <span className="font-medium text-black">{pendingEmail || displayEmail}</span>
                <StatusBadge verified={emailVerified && !pendingEmail} />
              </div>
              <p className="text-xs text-black/50">To verify your email, please enter the code we sent through your email.</p>

              <div className="grid grid-cols-1 sm:grid-cols-[170px_1fr] max-w-xl items-start sm:items-center gap-2 sm:gap-3">
                <label className="text-black/70">Verification Code:</label>
                <TextInput
                  value={emailCode}
                  onChange={(e) => setEmailCode(e.target.value)}
                  placeholder="Enter code here"
                />
              </div>

              <button type="button" onClick={handleResendEmail} className="inline-flex w-fit text-xs font-semibold text-[#2e66a6] underline underline-offset-4 hover:text-[#25578f] transition">
                Can't find our email? Resend verification email
              </button>
            </div>

            <div className="mt-6 flex justify-end">
              <SaveButton loading={verifyingEmail} />
            </div>
          </form>
        </Panel>

        <Panel title="Change Mobile Number">
          <form onSubmit={handleRequestMobileChange}>
            <div className="space-y-4 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-black/70">Mobile Number:</span>
                <span className="font-medium text-black">{displayMobile}</span>
                <StatusBadge verified={phoneVerified} />
              </div>
              <p className="text-xs text-black/50">
                Your mobile number will be used to send important updates on your applications, and allow recruiters to contact you and invite you to interviews.
              </p>
              {pendingPhone ? <p className="text-xs text-[#2e66a6]">Pending new mobile verification: {pendingPhone}</p> : null}

              <div className="grid grid-cols-1 sm:grid-cols-[170px_1fr] max-w-xl items-start sm:items-center gap-2 sm:gap-3">
                <label className="text-black/70">Mobile Number:</label>
                <div className="relative">
                  <TextInput
                    value={newMobile}
                    onChange={(e) => setNewMobile(e.target.value)}
                    placeholder="+63"
                  />
                  <FaInfoCircle className="absolute right-3 top-1/2 -translate-y-1/2 text-[#2e66a6]" />
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <SaveButton loading={savingMobileChange} />
            </div>
          </form>
        </Panel>

        <Panel title="Verify Mobile Number" blue>
          <form onSubmit={handleVerifyMobile}>
            <div className="space-y-4 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-black/70">Mobile Number:</span>
                <span className="font-medium text-black">{pendingPhone || displayMobile}</span>
                <StatusBadge verified={phoneVerified && !pendingPhone} />
              </div>
              <p className="text-xs text-black/50">Enter the code we sent to you via SMS to verify your mobile number.</p>

              <div className="grid grid-cols-1 sm:grid-cols-[170px_1fr] max-w-xl items-start sm:items-center gap-2 sm:gap-3">
                <label className="text-black/70">Verification Code:</label>
                <TextInput
                  value={mobileCode}
                  onChange={(e) => setMobileCode(e.target.value)}
                  placeholder="Enter code here"
                />
              </div>

              <button type="button" onClick={handleResendMobile} className="inline-flex w-fit text-xs font-semibold text-[#2e66a6] underline underline-offset-4 hover:text-[#25578f] transition">
                Send verification code
              </button>
            </div>

            <div className="mt-6 flex justify-end">
              <SaveButton loading={verifyingMobile} />
            </div>
          </form>
        </Panel>

        <Panel title="Password">
          <form onSubmit={handleChangePassword}>
            <div className="space-y-4 text-sm">
              <p className="text-xs text-black/50">To change your password, please complete the following fields.</p>

              <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] max-w-2xl items-start sm:items-center gap-2 sm:gap-3">
                <label className="text-black/70">Current Password:</label>
                <PasswordInput
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password here"
                  show={showCurrentPassword}
                  onToggle={() => setShowCurrentPassword((v) => !v)}
                  autoComplete="current-password"
                />

                <label className="text-black/70">New Password:</label>
                <div>
                  <PasswordInput
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password here"
                    show={showNewPassword}
                    onToggle={() => setShowNewPassword((v) => !v)}
                    autoComplete="new-password"
                  />
                  <div className="mt-2 h-1.5 bg-[#2e66a6] rounded-full w-full" />
                  <p className="text-[11px] text-black/50 mt-2 max-w-lg">
                    Enter passwords are handled securely. Use uppercase/lowercase letters, numbers/special characters, and avoid common words.
                  </p>
                </div>

                <label className="text-black/70">Retype New Password:</label>
                <PasswordInput
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Retype new password here"
                  show={showConfirmPassword}
                  onToggle={() => setShowConfirmPassword((v) => !v)}
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <SaveButton loading={savingPassword} />
            </div>
          </form>
        </Panel>
      </div>
    </div>
    </div>
  );
};

export default Settings;
