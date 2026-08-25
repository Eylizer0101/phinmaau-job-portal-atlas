import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';

const createMathChallenge = () => {
  const left = Math.floor(Math.random() * 40) + 10;
  const right = Math.floor(Math.random() * 9) + 1;
  return { left, right, answer: left + right };
};

const getPasswordStrength = (password) => {
  if (!password) return null;

  let score = 0;
  if (password.length >= 6) score += 1;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /^[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  const levels = [
    { label: 'Very Weak', textClass: 'text-red-600', barClass: 'bg-red-500', width: 'w-1/6' },
    { label: 'Weak', textClass: 'text-red-600', barClass: 'bg-red-500', width: 'w-2/6' },
    { label: 'Fair', textClass: 'text-orange-600', barClass: 'bg-orange-500', width: 'w-3/6' },
    { label: 'Good', textClass: 'text-amber-600', barClass: 'bg-amber-500', width: 'w-4/6' },
    { label: 'Strong', textClass: 'text-green-600', barClass: 'bg-green-500', width: 'w-5/6' },
    { label: 'Very Strong', textClass: 'text-green-700', barClass: 'bg-green-600', width: 'w-full' },
  ];

  return levels[Math.max(0, Math.min(score - 1, levels.length - 1))];
};

const ResetPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://phinmaau-job-portal-atlas.onrender.com/api';
  const FORGOT_PASSWORD_API_URL = `${API_BASE_URL}/auth/forgot-password`;
  const RESET_PASSWORD_API_URL = `${API_BASE_URL}/auth/reset-password`;

  const recoveryEmail = useMemo(() => {
    const stateEmail = String(location?.state?.email || '').trim().toLowerCase();
    if (stateEmail) return stateEmail;
    return String(sessionStorage.getItem('password_reset_email') || '').trim().toLowerCase();
  }, [location?.state?.email]);

  const initialExpiresAt = useMemo(() => {
    const stateValue = Number(location?.state?.expiresAt || 0);
    if (stateValue > Date.now()) return stateValue;

    const storedValue = Number(sessionStorage.getItem('password_reset_expires_at') || 0);
    return storedValue > 0 ? storedValue : 0;
  }, [location?.state?.expiresAt]);

  const [formData, setFormData] = useState({
    otp: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [mathChallenge, setMathChallenge] = useState(() => createMathChallenge());
  const [mathAnswer, setMathAnswer] = useState('');
  const [fieldErrors, setFieldErrors] = useState({
    otp: '',
    newPassword: '',
    confirmPassword: '',
    math: '',
  });
  const [expiresAt, setExpiresAt] = useState(initialExpiresAt);
  const [secondsRemaining, setSecondsRemaining] = useState(() =>
    initialExpiresAt ? Math.max(0, Math.ceil((initialExpiresAt - Date.now()) / 1000)) : 0
  );
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!expiresAt) {
      setSecondsRemaining(0);
      return undefined;
    }

    const tick = () => {
      setSecondsRemaining(Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)));
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  const refreshMathChallenge = () => {
    setMathChallenge(createMathChallenge());
    setMathAnswer('');
    setFieldErrors((prev) => ({ ...prev, math: '' }));
  };

  const clearRecoverySession = () => {
    sessionStorage.removeItem('password_reset_email');
    sessionStorage.removeItem('password_reset_expires_at');
  };

  const handleBackToSignIn = () => {
    clearRecoverySession();
    navigate('/login', { replace: true });
  };

  const validateForm = () => {
    const next = {
      otp: '',
      newPassword: '',
      confirmPassword: '',
      math: '',
    };

    if (!recoveryEmail) {
      next.otp = 'Your password reset session is missing. Please request a new OTP.';
    } else if (secondsRemaining <= 0) {
      next.otp = 'Your OTP has expired. Please request a new code.';
    } else if (!formData.otp) {
      next.otp = 'OTP is required.';
    } else if (!/^\d{6}$/.test(formData.otp)) {
      next.otp = 'Enter the 6-digit OTP sent to your email.';
    }

    if (!formData.newPassword) {
      next.newPassword = 'New password is required.';
    } else if (!/^[A-Z](?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{7,}$/.test(formData.newPassword)) {
      next.newPassword = 'Password must start with an uppercase letter and contain at least 8 characters, lowercase, number, and special character.';
    }

    if (!formData.confirmPassword) {
      next.confirmPassword = 'Please confirm your new password.';
    } else if (formData.newPassword !== formData.confirmPassword) {
      next.confirmPassword = 'Passwords do not match.';
    }

    if (!String(mathAnswer).trim()) {
      next.math = 'Please answer the math verification.';
    } else if (Number(mathAnswer) !== mathChallenge.answer) {
      next.math = 'Incorrect answer. Please try again.';
    }

    setFieldErrors(next);
    return !next.otp && !next.newPassword && !next.confirmPassword && !next.math;
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    const nextValue = name === 'otp' ? value.replace(/[^0-9]/g, '').slice(0, 6) : value;

    setFormData((prev) => ({ ...prev, [name]: nextValue }));
    setError('');
    setSuccessMessage('');
    setFieldErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleResendOtp = async () => {
    if (!recoveryEmail || resendLoading || loading) {
      if (!recoveryEmail) {
        navigate('/login', {
          replace: true,
          state: { openForgotPassword: true },
        });
      }
      return;
    }

    setResendLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await axios.post(FORGOT_PASSWORD_API_URL, { email: recoveryEmail });
      const expiresInSeconds = Math.min(180, Math.max(60, Number(response.data?.expiresInSeconds || 180)));
      const nextExpiresAt = Date.now() + expiresInSeconds * 1000;

      sessionStorage.setItem('password_reset_email', recoveryEmail);
      sessionStorage.setItem('password_reset_expires_at', String(nextExpiresAt));
      setExpiresAt(nextExpiresAt);
      setFormData((prev) => ({ ...prev, otp: '' }));
      setFieldErrors((prev) => ({ ...prev, otp: '' }));
      setSuccessMessage('A new OTP has been sent to your registered email.');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to send a new OTP right now. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!validateForm()) return;

    setLoading(true);

    try {
      const response = await axios.post(RESET_PASSWORD_API_URL, {
        email: recoveryEmail,
        otp: formData.otp,
        newPassword: formData.newPassword,
        confirmPassword: formData.confirmPassword,
      });

      setSuccessMessage(response.data?.message || 'Password reset successful. Redirecting to Sign In...');
      setFormData({ otp: '', newPassword: '', confirmPassword: '' });
      setMathAnswer('');
      clearRecoverySession();

      setTimeout(() => {
        navigate('/login', {
          replace: true,
          state: { successMessage: 'Password updated successfully. You can now sign in.' },
        });
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to reset password. Please check your OTP and try again.');
      refreshMathChallenge();
    } finally {
      setLoading(false);
    }
  };

  const inputBase =
    'block h-11 w-full rounded-lg border bg-white px-3 text-sm text-gray-900 shadow-sm transition ' +
    'placeholder:text-gray-400 focus:border-[#2e66a6] focus:outline-none focus:ring-2 focus:ring-[#2e66a6]/10 ' +
    'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500';

  const fieldClass = (hasError) =>
    `${inputBase} ${hasError ? 'border-red-400' : 'border-gray-200'}`;

  const eyeIcon = (visible) => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      {visible ? (
        <>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M3 3l18 18" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M10.6 10.7a2 2 0 002.7 2.7M9.9 4.2A10.7 10.7 0 0112 4c5 0 8.7 4.4 9 8-.1 1.3-.7 2.7-1.7 3.9M6.2 6.2C4.3 7.6 3.2 9.8 3 12c.3 3.6 4 8 9 8 1.6 0 3-.4 4.2-1" />
        </>
      ) : (
        <>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z" />
          <circle cx="12" cy="12" r="2.5" strokeWidth="1.8" />
        </>
      )}
    </svg>
  );

  const isExpired = secondsRemaining <= 0;
  const passwordStrength = getPasswordStrength(formData.newPassword);

  return (
    <div className="min-h-screen bg-[#f4f7fb] px-4 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-[480px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
        <div className="relative border-b border-gray-200 px-6 pb-5 pt-6 text-center">
          <button
            type="button"
            onClick={handleBackToSignIn}
            disabled={loading || resendLoading}
            className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 transition hover:bg-gray-50 hover:text-gray-700 focus:outline-none focus:ring-4 focus:ring-[#2e66a6]/10 disabled:opacity-50"
            aria-label="Close reset password"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <img src="/images/agpay.png" alt="AGAPAY" className="mx-auto h-24 w-auto max-w-[280px] object-contain" />
          <h1 className="mt-4 text-xl font-extrabold text-gray-950">Reset Password</h1>
          <p className="mx-auto mt-2 max-w-[360px] text-sm leading-5 text-gray-600">
            Enter the OTP sent to your email and choose a new password.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5" noValidate aria-busy={loading}>
          {successMessage ? (
            <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800" role="status" aria-live="polite">
              {successMessage}
            </div>
          ) : null}

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700" role="alert" aria-live="assertive">
              {error}
            </div>
          ) : null}

          <div className="flex justify-center">
            <span
              className={`inline-flex min-h-8 items-center rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                isExpired ? 'border-red-300 bg-red-50 text-red-700' : 'border-green-500 bg-green-50 text-green-700'
              }`}
            >
              {isExpired ? 'OTP expired' : `${secondsRemaining} seconds remaining`}
            </span>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="otp" className="block text-xs font-bold text-gray-900">Enter OTP</label>
            <input
              id="otp"
              name="otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={formData.otp}
              onChange={handleChange}
              placeholder="Enter 6-digit OTP"
              disabled={loading || resendLoading || !!successMessage || !recoveryEmail}
              className={`${fieldClass(!!fieldErrors.otp)} text-center font-mono tracking-[0.3em]`}
            />
            {fieldErrors.otp ? <p className="text-xs text-red-600">{fieldErrors.otp}</p> : null}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="newPassword" className="block text-xs font-bold text-gray-900">New Password</label>
            <div className="relative">
              <input
                id="newPassword"
                name="newPassword"
                type={showNewPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={formData.newPassword}
                onChange={handleChange}
                placeholder="Enter New Password"
                disabled={loading || !!successMessage || !recoveryEmail}
                className={`${fieldClass(!!fieldErrors.newPassword)} pr-11`}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((prev) => !prev)}
                disabled={loading || !!successMessage || !recoveryEmail}
                className="absolute inset-y-0 right-0 inline-flex w-10 items-center justify-center text-gray-500 hover:text-[#2e66a6] disabled:opacity-50"
                aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
              >
                {eyeIcon(showNewPassword)}
              </button>
            </div>
            {fieldErrors.newPassword ? <p className="text-xs text-red-600">{fieldErrors.newPassword}</p> : null}
            {passwordStrength ? (
              <div className="space-y-1.5" aria-live="polite">
                <div className="h-1.5 overflow-hidden rounded-full bg-gray-200">
                  <div
                    className={`h-full rounded-full transition-all duration-200 ${passwordStrength.width} ${passwordStrength.barClass}`}
                  />
                </div>
                <p className={`text-xs font-semibold ${passwordStrength.textClass}`}>
                  {passwordStrength.label}
                </p>
              </div>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="confirmPassword" className="block text-xs font-bold text-gray-900">Confirm Password</label>
            <div className="relative">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm New Password"
                disabled={loading || !!successMessage || !recoveryEmail}
                className={`${fieldClass(!!fieldErrors.confirmPassword)} pr-11`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                disabled={loading || !!successMessage || !recoveryEmail}
                className="absolute inset-y-0 right-0 inline-flex w-10 items-center justify-center text-gray-500 hover:text-[#2e66a6] disabled:opacity-50"
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
              >
                {eyeIcon(showConfirmPassword)}
              </button>
            </div>
            {fieldErrors.confirmPassword ? <p className="text-xs text-red-600">{fieldErrors.confirmPassword}</p> : null}
          </div>

          <div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <div className="flex h-10 min-w-[48px] items-center justify-center rounded-lg border border-gray-200 px-3 text-sm font-semibold text-gray-900">
                {mathChallenge.left}
              </div>
              <span className="text-sm font-semibold text-gray-500">+</span>
              <div className="flex h-10 min-w-[48px] items-center justify-center rounded-lg border border-gray-200 px-3 text-sm font-semibold text-gray-900">
                {mathChallenge.right}
              </div>
              <span className="text-sm font-semibold text-gray-500">=</span>
              <input
                type="text"
                inputMode="numeric"
                value={mathAnswer}
                onChange={(event) => {
                  setMathAnswer(event.target.value.replace(/[^0-9]/g, '').slice(0, 3));
                  setFieldErrors((prev) => ({ ...prev, math: '' }));
                }}
                disabled={loading || !!successMessage || !recoveryEmail}
                aria-label="Math verification answer"
                className={`h-10 w-14 rounded-lg border px-2 text-center text-sm font-semibold outline-none focus:ring-2 ${
                  fieldErrors.math
                    ? 'border-red-400 bg-white text-gray-900 focus:border-red-400 focus:ring-red-100'
                    : String(mathAnswer).trim() && Number(mathAnswer) === mathChallenge.answer
                      ? 'border-green-500 bg-green-50 text-green-700 focus:border-green-500 focus:ring-green-100'
                      : 'border-gray-200 bg-white text-gray-900 focus:border-[#2e66a6] focus:ring-[#2e66a6]/10'
                }`}
              />
              <button
                type="button"
                onClick={refreshMathChallenge}
                disabled={loading || !!successMessage || !recoveryEmail}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-[#2e66a6] disabled:opacity-50"
                aria-label="Refresh math verification"
                title="New math question"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4 4v6h6M20 20v-6h-6M5.1 15A7 7 0 0017 18.9L20 16M18.9 9A7 7 0 007 5.1L4 8" />
                </svg>
              </button>
            </div>
            {fieldErrors.math ? <p className="mt-2 text-center text-xs text-red-600">{fieldErrors.math}</p> : null}
          </div>

          {isExpired ? (
            <p className="text-center text-sm text-red-600" role="alert" aria-live="assertive">
              Your OTP has expired.{' '}
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resendLoading || loading}
                className="font-semibold text-[#2e66a6] underline underline-offset-2 hover:text-[#245387] disabled:opacity-50"
              >
                {resendLoading ? 'Sending a new OTP...' : 'Please request a new one.'}
              </button>
            </p>
          ) : null}

          <div className="flex items-center justify-center gap-3 pt-1">
            <button
              type="button"
              onClick={handleBackToSignIn}
              disabled={loading || resendLoading}
              className="inline-flex h-10 min-w-[96px] items-center justify-center rounded-lg border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || resendLoading || isExpired || !!successMessage || !recoveryEmail}
              className="inline-flex h-10 min-w-[130px] items-center justify-center rounded-lg bg-[#2e66a6] px-4 text-sm font-bold text-white hover:bg-[#245387] focus:outline-none focus:ring-4 focus:ring-[#2e66a6]/15 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </div>

          <button
            type="button"
            onClick={handleBackToSignIn}
            disabled={loading || resendLoading}
            className="mx-auto block text-sm font-semibold text-[#2e66a6] hover:text-[#245387] disabled:opacity-50"
          >
            Back to Sign In
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
