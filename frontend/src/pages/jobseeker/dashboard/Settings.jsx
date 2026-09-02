import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import api from '../../../services/api.js';
import { FaCheckCircle, FaEye, FaEyeSlash, FaInfoCircle } from 'react-icons/fa';

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

const StatusBadge = ({ verified, label = 'contact information' }) => {
  if (verified) {
    return (
      <span
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white"
        title={`Verified ${label}`}
        aria-label={`Verified ${label}`}
      >
        <img
          src="/images/checkmo.png"
          alt=""
          className="h-6 w-6 object-contain"
          draggable="false"
        />
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-1 text-xs font-semibold text-[#2e66a6]">
      Unverified
    </span>
  );
};

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

const TextInput = ({ value, onChange, placeholder, type = 'text', ...props }) => (
  <input
    {...props}
    type={type}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    className={`w-full h-11 px-4 rounded-xl border border-[#d8e2ee] bg-white text-sm text-black placeholder:text-black/40 transition focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/20 ${focusRing}`}
  />
);

const SaveButton = ({ loading, children = 'Save', loadingText = 'Saving...' }) => (
  <button
    type="submit"
    disabled={loading}
    className={`px-7 h-11 rounded-xl bg-[#2e66a6] hover:bg-[#25578f] active:bg-[#1f4b7c] text-white text-sm font-bold shadow-[0_10px_22px_rgba(46,102,166,0.18)] transition disabled:opacity-60 ${focusRing}`}
  >
    {loading ? loadingText : children}
  </button>
);

const InlineMessage = ({ message }) => {
  if (!message?.text) return null;

  const isError = message.type === 'error';

  return (
    <div
      className={`mb-4 rounded-2xl border p-4 text-sm shadow-sm ${
        isError
          ? 'border-red-200 bg-[#fff7f7] text-red-700'
          : 'border-[#d8e2ee] bg-[#f7faff] text-[#2e66a6]'
      }`}
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
    >
      <div>{message.text}</div>
    </div>
  );
};

const SuccessPopup = ({ open, title, message, iconType = 'success', onClose }) => {
  useEffect(() => {
    if (!open) return undefined;

    const timer = setTimeout(() => onClose?.(), 3000);
    return () => clearTimeout(timer);
  }, [open, title, message, iconType, onClose]);

  if (!open) return null;

  const isInformation = iconType === 'info';

  return (
    <div
      className="fixed inset-0 z-[10060] flex items-center justify-center bg-black/25 px-4"
      role="dialog"
      aria-modal="true"
      aria-live="polite"
    >
      <div className="w-full max-w-sm rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#e8f1ff]">
          {isInformation ? (
            <FaInfoCircle className="text-4xl text-[#2e66a6]" />
          ) : (
            <FaCheckCircle className="text-4xl text-green-600" />
          )}
        </div>
        <div className="text-xl font-bold text-gray-900">{title}</div>
        <div className="mt-2 text-sm text-gray-500">{message}</div>
      </div>
    </div>
  );
};

const useAutoDismissError = (message, setMessage) => {
  useEffect(() => {
    if (message?.type !== 'error' || !message?.text) return undefined;

    const timer = setTimeout(() => {
      setMessage({ type: '', text: '' });
    }, 5000);

    return () => clearTimeout(timer);
  }, [message, setMessage]);
};

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

  const [emailPassword, setEmailPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [emailCode, setEmailCode] = useState('');

  const [newMobile, setNewMobile] = useState('');
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
  const [emailChangeMessage, setEmailChangeMessage] = useState({ type: '', text: '' });
  const [emailVerifyMessage, setEmailVerifyMessage] = useState({ type: '', text: '' });
  const [mobileChangeMessage, setMobileChangeMessage] = useState({ type: '', text: '' });
  const [mobileVerifyMessage, setMobileVerifyMessage] = useState({ type: '', text: '' });
  const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' });
  const [emailResendSeconds, setEmailResendSeconds] = useState(0);
  const [mobileResendSeconds, setMobileResendSeconds] = useState(0);
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [showMobileVerification, setShowMobileVerification] = useState(false);
  const [successPopup, setSuccessPopup] = useState({
    open: false,
    title: '',
    message: '',
    iconType: 'success',
  });
  const emailSectionRef = useRef(null);
  const mobileSectionRef = useRef(null);

  const closeSuccessPopup = useCallback(() => {
    setSuccessPopup((current) => ({ ...current, open: false }));
  }, []);

  const showSuccessPopup = useCallback((title, message, iconType = 'success') => {
    setSuccessPopup({ open: true, title, message, iconType });
  }, []);

  useAutoDismissError(emailChangeMessage, setEmailChangeMessage);
  useAutoDismissError(emailVerifyMessage, setEmailVerifyMessage);
  useAutoDismissError(mobileChangeMessage, setMobileChangeMessage);
  useAutoDismissError(mobileVerifyMessage, setMobileVerifyMessage);
  useAutoDismissError(passwordMessage, setPasswordMessage);

  useEffect(() => {
    if (!error) return undefined;

    const timer = setTimeout(() => setError(''), 5000);
    return () => clearTimeout(timer);
  }, [error]);

  const passwordRequirements = [
    { label: 'At least 8 characters', met: newPassword.length >= 8 },
    { label: 'At least one uppercase letter', met: /[A-Z]/.test(newPassword) },
    { label: 'At least one lowercase letter', met: /[a-z]/.test(newPassword) },
    { label: 'At least one number', met: /\d/.test(newPassword) },
    { label: 'At least one special character', met: /[^A-Za-z0-9]/.test(newPassword) },
  ];

  const metPasswordRequirements = passwordRequirements.filter((requirement) => requirement.met).length;
  const passwordStrengthLevels = [
    { label: 'Very Weak', color: 'text-red-700', bar: 'bg-red-600', width: 'w-1/6' },
    { label: 'Weak', color: 'text-red-700', bar: 'bg-red-500', width: 'w-2/6' },
    { label: 'Fair', color: 'text-orange-700', bar: 'bg-orange-500', width: 'w-3/6' },
    { label: 'Good', color: 'text-amber-700', bar: 'bg-amber-500', width: 'w-4/6' },
    { label: 'Strong', color: 'text-lime-700', bar: 'bg-lime-500', width: 'w-5/6' },
    { label: 'Very Strong', color: 'text-green-700', bar: 'bg-green-600', width: 'w-full' },
  ];
  const passwordStrength = passwordStrengthLevels[metPasswordRequirements];

  const fetchMe = useCallback(async () => {
    try {
      setLoadingUser(true);
      const res = await api.get('/auth/me');
      const user = res.data?.user || res.data?.data?.user || null;
      setMe(user);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load settings.');
    } finally {
      setLoadingUser(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  useEffect(() => {
    if (loadingUser) return;

    const section = new URLSearchParams(window.location.search).get('section');
    const target = section === 'mobile' ? mobileSectionRef.current : section === 'email' ? emailSectionRef.current : null;
    if (target) window.requestAnimationFrame(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }, [loadingUser]);

  const verification = me?.settingsVerification || {};
  const displayEmail = me?.email || '—';
  const displayMobile = me?.jobSeekerProfile?.phoneNumber || '—';
  const emailVerified = Boolean(verification.emailVerified);
  const phoneVerified = Boolean(verification.phoneVerified);
  const pendingEmail = verification.pendingEmail || '';
  const pendingPhone = verification.pendingPhoneNumber || '';

  useEffect(() => {
    const requestedAt = verification.emailOtpRequestedAt ? new Date(verification.emailOtpRequestedAt).getTime() : 0;
    setEmailResendSeconds(requestedAt ? Math.max(0, Math.ceil((requestedAt + 180000 - Date.now()) / 1000)) : 0);
  }, [verification.emailOtpRequestedAt]);

  useEffect(() => {
    const requestedAt = verification.phoneOtpRequestedAt ? new Date(verification.phoneOtpRequestedAt).getTime() : 0;
    setMobileResendSeconds(requestedAt ? Math.max(0, Math.ceil((requestedAt + 180000 - Date.now()) / 1000)) : 0);
  }, [verification.phoneOtpRequestedAt]);

  useEffect(() => {
    if (emailResendSeconds <= 0) return undefined;
    const timer = setInterval(() => setEmailResendSeconds((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => clearInterval(timer);
  }, [emailResendSeconds > 0]);

  useEffect(() => {
    if (mobileResendSeconds <= 0) return undefined;
    const timer = setInterval(() => setMobileResendSeconds((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => clearInterval(timer);
  }, [mobileResendSeconds > 0]);

  const formatCountdown = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes} minute${minutes === 1 ? '' : 's'}, ${remainingSeconds} second${remainingSeconds === 1 ? '' : 's'}`;
  };

  const fullName = useMemo(() => buildFullName(me), [me]);

  const handleRequestEmailChange = async (e) => {
    e.preventDefault();
    setEmailChangeMessage({ type: '', text: '' });

    if (!emailPassword || !newEmail) {
      setEmailChangeMessage({ type: 'error', text: 'Please enter your current password and new email address.' });
      return;
    }

    if (!/^[^\s@]+@gmail\.com$/i.test(newEmail.trim())) {
      setEmailChangeMessage({ type: 'error', text: 'Please enter a valid Gmail address ending in @gmail.com.' });
      return;
    }

    try {
      setSavingEmailChange(true);
      await api.post('/auth/settings/request-email-verification', {
        currentPassword: emailPassword,
        newEmail,
      });
      showSuccessPopup(
        'Verification Email Sent!',
        'A verification email has been sent to your new email address. Please check your inbox to verify your email.'
      );
      setEmailPassword('');
      setNewEmail('');
      setEmailResendSeconds(180);
      setShowEmailVerification(true);
      await fetchMe();
    } catch (err) {
      setEmailChangeMessage({ type: 'error', text: err.response?.data?.message || 'Failed to send email verification code.' });
    } finally {
      setSavingEmailChange(false);
    }
  };

  const handleVerifyEmail = async (e) => {
    e.preventDefault();
    setEmailVerifyMessage({ type: '', text: '' });

    if (!emailCode) {
      setEmailVerifyMessage({ type: 'error', text: 'Please enter your email verification code.' });
      return;
    }

    try {
      setVerifyingEmail(true);
      const res = await api.post('/auth/settings/verify-email', { code: emailCode });
      showSuccessPopup(
        'Email Changed Successfully!',
        'Your new email address has been verified and saved.'
      );
      setEmailCode('');
      setShowEmailVerification(false);
      if (res.data?.user) {
        setMe(res.data.user);
        localStorage.setItem('user', JSON.stringify(res.data.user));
      } else {
        await fetchMe();
      }
    } catch (err) {
      setEmailVerifyMessage({ type: 'error', text: err.response?.data?.message || 'Failed to verify email.' });
    } finally {
      setVerifyingEmail(false);
    }
  };

  const handleResendEmail = async () => {
    setEmailVerifyMessage({ type: '', text: '' });
    try {
      await api.post('/auth/settings/resend-email-verification');
      showSuccessPopup(
        'Verification Email Resent!',
        'A new verification email has been sent to your email address. Please check your inbox.'
      );
      setEmailResendSeconds(180);
      await fetchMe();
    } catch (err) {
      setEmailVerifyMessage({ type: 'error', text: err.response?.data?.message || 'Failed to resend email verification code.' });
    }
  };

  const handleRequestMobileChange = async (e) => {
    e.preventDefault();
    setMobileChangeMessage({ type: '', text: '' });

    const cleanMobileNumber = newMobile.trim();
    if (!/^09\d{9}$/.test(cleanMobileNumber)) {
      setMobileChangeMessage({
        type: 'error',
        text: 'Please enter a valid 11-digit Philippine mobile number starting with 09.',
      });
      return;
    }

    try {
      setSavingMobileChange(true);
      await api.post('/auth/settings/request-phone-verification', { phoneNumber: cleanMobileNumber });
      showSuccessPopup(
        'Verification Code Sent!',
        'A verification code has been sent to your new mobile number. Enter the code to verify your number.',
        'info'
      );
      setNewMobile('');
      setMobileResendSeconds(180);
      setShowMobileVerification(true);
      await fetchMe();
    } catch (err) {
      setMobileChangeMessage({ type: 'error', text: err.response?.data?.message || 'Failed to send mobile verification code.' });
    } finally {
      setSavingMobileChange(false);
    }
  };

  const handleVerifyMobile = async (e) => {
    e.preventDefault();
    setMobileVerifyMessage({ type: '', text: '' });

    if (!mobileCode) {
      setMobileVerifyMessage({ type: 'error', text: 'Please enter your mobile verification code.' });
      return;
    }

    try {
      setVerifyingMobile(true);
      const res = await api.post('/auth/settings/verify-phone', { code: mobileCode });
      showSuccessPopup(
        'Mobile Number Changed Successfully!',
        'Your new mobile number has been verified and saved.'
      );
      setMobileCode('');
      setNewMobile('');
      setShowMobileVerification(false);
      if (res.data?.user) {
        setMe(res.data.user);
        localStorage.setItem('user', JSON.stringify(res.data.user));
      } else {
        await fetchMe();
      }
    } catch (err) {
      setMobileVerifyMessage({ type: 'error', text: err.response?.data?.message || 'Failed to verify mobile number.' });
    } finally {
      setVerifyingMobile(false);
    }
  };

  const handleResendMobile = async () => {
    setMobileVerifyMessage({ type: '', text: '' });
    try {
      await api.post('/auth/settings/resend-phone-verification');
      showSuccessPopup(
        'Verification Code Resent!',
        'A new verification code has been sent to your mobile number. Enter the latest code to continue.',
        'info'
      );
      setMobileResendSeconds(180);
      await fetchMe();
    } catch (err) {
      setMobileVerifyMessage({ type: 'error', text: err.response?.data?.message || 'Failed to resend mobile verification code.' });
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordMessage({ type: '', text: '' });

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Please complete all password fields.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New password and retype password do not match.' });
      return;
    }

    if (!passwordRequirements.every((requirement) => requirement.met)) {
      setPasswordMessage({
        type: 'error',
        text: 'New password must contain at least 8 characters, one uppercase letter, one lowercase letter, one number, and one special character.',
      });
      return;
    }

    if (newPassword === currentPassword) {
      setPasswordMessage({ type: 'error', text: 'New password must be different from your current password.' });
      return;
    }

    try {
      setSavingPassword(true);
      const res = await api.put('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      setPasswordMessage({ type: 'success', text: res.data?.message || 'Password changed successfully.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    } catch (err) {
      setPasswordMessage({ type: 'error', text: err.response?.data?.message || 'Failed to change password.' });
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-8">
      <SuccessPopup
        open={successPopup.open}
        title={successPopup.title}
        message={successPopup.message}
        iconType={successPopup.iconType}
        onClose={closeSuccessPopup}
      />
      <div className="max-w-6xl mx-auto">
      <div className="mb-4">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-black">Settings</h1>
        <p className="text-sm sm:text-base text-black/60 mt-2">Manage your email, mobile number, and password.</p>
      </div>

      {error ? (
        <div className="mb-4 bg-[#fff7f7] border border-red-200 rounded-2xl p-4 text-sm text-red-700 shadow-sm">
          <div>{error}</div>
        </div>
      ) : null}

      <div className="space-y-5">
        <div ref={emailSectionRef} className="scroll-mt-24">
        <Panel title="Change Email" blue>
          <form onSubmit={handleRequestEmailChange}>
            <InlineMessage message={emailChangeMessage} />
            <div className="space-y-4 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-black/70">Current Email Address:</span>
                <span className="font-medium text-black">{displayEmail}</span>
                <StatusBadge verified={emailVerified} label="email" />
              </div>
              <p className="text-xs text-black/50">To change your email, please complete the following fields.</p>
              {showEmailVerification && pendingEmail ? <p className="text-xs text-[#2e66a6]">Pending new email verification: {pendingEmail}</p> : null}

              <div className="grid grid-cols-1 sm:grid-cols-[max-content_220px] max-w-xl items-start sm:items-center gap-2 sm:gap-2">
                <label className="text-black/70">Current Password:</label>
                <PasswordInput
                  value={emailPassword}
                  onChange={(e) => {
                    setEmailPassword(e.target.value);
                    if (emailChangeMessage.text) setEmailChangeMessage({ type: '', text: '' });
                  }}
                  placeholder="Enter password here"
                  show={showEmailPassword}
                  onToggle={() => setShowEmailPassword((v) => !v)}
                  autoComplete="current-password"
                />

                <label className="text-black/70">New Email Address:</label>
                <TextInput
                  value={newEmail}
                  onChange={(e) => {
                    setNewEmail(e.target.value);
                    if (emailChangeMessage.text) setEmailChangeMessage({ type: '', text: '' });
                  }}
                  placeholder="Enter new email here"
                  type="email"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <SaveButton loading={savingEmailChange} loadingText="Sending...">Update Email</SaveButton>
            </div>
          </form>
        </Panel>
        </div>

        {showEmailVerification && pendingEmail ? <Panel title="Verify Email" blue>
          <form onSubmit={handleVerifyEmail}>
            <InlineMessage message={emailVerifyMessage} />
            <div className="space-y-4 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-black/70">Current Email Address:</span>
                <span className="font-medium text-black">{pendingEmail || displayEmail}</span>
                <StatusBadge verified={emailVerified && !pendingEmail} label="email" />
              </div>
              <p className="text-xs text-black/50">To verify your email, please enter the code we sent through your email.</p>

              <div className="grid grid-cols-1 sm:grid-cols-[140px_220px] max-w-xl items-start sm:items-center gap-2 sm:gap-1">
                <label className="text-black/70">Verification Code:</label>
                <TextInput
                  value={emailCode}
                  onChange={(e) => {
                    setEmailCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                    if (emailVerifyMessage.text) setEmailVerifyMessage({ type: '', text: '' });
                  }}
                  placeholder="Enter code here"
                  inputMode="numeric"
                  maxLength={6}
                />
              </div>

              <button type="button" onClick={handleResendEmail} disabled={emailResendSeconds > 0} className="inline-flex w-fit text-xs font-semibold text-[#2e66a6] underline underline-offset-4 hover:text-[#25578f] transition disabled:no-underline disabled:opacity-60 disabled:cursor-not-allowed">
                {emailResendSeconds > 0
                  ? `Resend verification in ${formatCountdown(emailResendSeconds)}`
                  : "Didn't get the code? Resend verification email"}
              </button>
            </div>

            <div className="mt-6 flex justify-end">
              <SaveButton loading={verifyingEmail} loadingText="Verifying...">Verify Email</SaveButton>
            </div>
          </form>
        </Panel> : null}

        <div ref={mobileSectionRef} className="scroll-mt-24">
        <Panel title="Change Mobile Number" blue>
          <form onSubmit={handleRequestMobileChange}>
            <InlineMessage message={mobileChangeMessage} />
            <div className="space-y-4 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-black/70">Mobile Number:</span>
                <span className="font-medium text-black">{displayMobile}</span>
                <StatusBadge verified={phoneVerified} label="mobile number" />
              </div>
              <p className="text-xs text-black/50">
                Your mobile number may be used to send important updates about your applications and allow employers to contact you and invite you to interviews.
              </p>
              {showMobileVerification && pendingPhone ? <p className="text-xs text-[#2e66a6]">Pending new mobile verification: {pendingPhone}</p> : null}

              <div className="grid grid-cols-1 sm:grid-cols-[max-content_220px] max-w-xl items-start sm:items-center gap-2 sm:gap-2">
                <label className="text-black/70">Mobile Number:</label>
                <div className="relative">
                  <TextInput
                    value={newMobile}
                    onChange={(e) => {
                      const numbersOnly = e.target.value.replace(/\D/g, '').slice(0, 11);
                      setNewMobile(numbersOnly);
                      if (mobileChangeMessage.text) setMobileChangeMessage({ type: '', text: '' });
                    }}
                    placeholder="e.g. 09000000000"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={11}
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <SaveButton loading={savingMobileChange} loadingText="Sending...">Update Mobile Number</SaveButton>
            </div>
          </form>
        </Panel>
        </div>

        {showMobileVerification && pendingPhone ? <Panel title="Verify Mobile Number" blue>
          <form onSubmit={handleVerifyMobile}>
            <InlineMessage message={mobileVerifyMessage} />
            <div className="space-y-4 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-black/70">Mobile Number:</span>
                <span className="font-medium text-black">{pendingPhone || displayMobile}</span>
                <StatusBadge verified={phoneVerified && !pendingPhone} label="mobile number" />
              </div>
              <p className="text-xs text-black/50">Enter the code we sent to you via SMS to verify your mobile number.</p>

              <div className="grid grid-cols-1 sm:grid-cols-[170px_220px] max-w-xl items-start sm:items-center gap-2 sm:gap-3">
                <label className="text-black/70">Verification Code:</label>
                <TextInput
                  value={mobileCode}
                  onChange={(e) => setMobileCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Enter code here"
                  inputMode="numeric"
                  maxLength={6}
                />
              </div>

              <button type="button" onClick={handleResendMobile} disabled={mobileResendSeconds > 0} className="inline-flex w-fit text-xs font-semibold text-[#2e66a6] underline underline-offset-4 hover:text-[#25578f] transition disabled:no-underline disabled:opacity-60 disabled:cursor-not-allowed">
                {mobileResendSeconds > 0
                  ? `Resend verification in ${formatCountdown(mobileResendSeconds)}`
                  : "Didn't receive the code? Resend verification code"}
              </button>
            </div>

            <div className="mt-6 flex justify-end">
              <SaveButton loading={verifyingMobile} loadingText="Verifying...">Verify Mobile Number</SaveButton>
            </div>
          </form>
        </Panel> : null}

        <Panel title="Password" blue>
          <form onSubmit={handleChangePassword}>
            <InlineMessage message={passwordMessage} />
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
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (passwordMessage.text) setPasswordMessage({ type: '', text: '' });
                    }}
                    placeholder="Enter new password here"
                    show={showNewPassword}
                    onToggle={() => setShowNewPassword((v) => !v)}
                    autoComplete="new-password"
                  />

                  {newPassword ? (
                    <div className="mt-3 rounded-xl border border-[#d8e2ee] bg-[#f7faff] p-4" aria-live="polite">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <span className="text-xs font-semibold text-black/65">Password strength</span>
                        <span className={`text-xs font-bold ${passwordStrength.color}`}>{passwordStrength.label}</span>
                      </div>

                      <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-[#d8e2ee]">
                        <div className={`h-full rounded-full transition-all duration-300 ${passwordStrength.bar} ${passwordStrength.width}`} />
                      </div>

                      <div className="grid gap-2 sm:grid-cols-2">
                        {passwordRequirements.map((requirement) => (
                          <div
                            key={requirement.label}
                            className={`flex items-center gap-2 text-xs ${
                              requirement.met ? 'font-semibold text-green-700' : 'text-black/55'
                            }`}
                          >
                            <span
                              className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${
                                requirement.met
                                  ? 'border-green-600 bg-green-600 text-white'
                                  : 'border-[#b9c7d8] bg-white text-transparent'
                              }`}
                              aria-hidden="true"
                            >
                              ✓
                            </span>
                            <span>{requirement.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
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
