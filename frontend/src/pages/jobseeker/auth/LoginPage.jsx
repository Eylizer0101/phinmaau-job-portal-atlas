import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import ReCAPTCHA from 'react-google-recaptcha';

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://phinmaau-job-portal-atlas.onrender.com/api';
  const LOGIN_API_URL = `${API_BASE_URL}/auth/login`;
  const FORGOT_PASSWORD_API_URL = `${API_BASE_URL}/auth/forgot-password`;
  const RECAPTCHA_SITE_KEY = process.env.REACT_APP_RECAPTCHA_SITE_KEY || '';

  const [formData, setFormData] = useState({ username: '', password: '' });
  const [focused, setFocused] = useState({ username: false, password: false });
  const [fieldErrors, setFieldErrors] = useState({ username: '', password: '' });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState('');
  const [pageSuccessMessage, setPageSuccessMessage] = useState('');

  const LOCK_SECONDS = 120;
  const MAX_ATTEMPTS = 3;

  const [attemptCount, setAttemptCount] = useState(0);
  const attemptCountRef = useRef(0);

  const [isLocked, setIsLocked] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);

  const [attemptBanner, setAttemptBanner] = useState('');

  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaError, setCaptchaError] = useState('');
  const [captchaRenderKey, setCaptchaRenderKey] = useState(0);
  const [showCaptcha, setShowCaptcha] = useState(Boolean(RECAPTCHA_SITE_KEY));
  const recaptchaRef = useRef(null);

  // Forgot Password states
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordError, setForgotPasswordError] = useState('');
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState('');
  const forgotPasswordInputRef = useRef(null);

  const normalizeUsername = (u) => String(u || '').trim().toLowerCase();
  const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

  const getLockKey = (username) => `login_lock_${normalizeUsername(username) || 'unknown'}`;
  const getAttemptsKey = (username) => `login_attempts_${normalizeUsername(username) || 'unknown'}`;

  const lockUntilRef = useRef(null);

  const readLockFromStorage = (username) => {
    try {
      const lockRaw = localStorage.getItem(getLockKey(username));
      if (!lockRaw) return null;
      const parsed = JSON.parse(lockRaw);
      if (!parsed?.until) return null;
      return parsed;
    } catch {
      return null;
    }
  };

  const writeLockToStorage = (username, untilEpochMs) => {
    try {
      localStorage.setItem(getLockKey(username), JSON.stringify({ until: untilEpochMs }));
    } catch {}
  };

  const clearLockInStorage = (username) => {
    try {
      localStorage.removeItem(getLockKey(username));
    } catch {}
  };

  const readAttemptsFromStorage = (username) => {
    try {
      const raw = localStorage.getItem(getAttemptsKey(username));
      const n = Number(raw);
      return Number.isFinite(n) && n >= 0 ? n : 0;
    } catch {
      return 0;
    }
  };

  const writeAttemptsToStorage = (username, n) => {
    try {
      localStorage.setItem(getAttemptsKey(username), String(n));
    } catch {}
  };

  const clearAttemptsInStorage = (username) => {
    try {
      localStorage.removeItem(getAttemptsKey(username));
    } catch {}
  };

  const clearAuth = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const storeAuth = (token, user) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  };

  useEffect(() => {
    const prefillUsername = location?.state?.username || location?.state?.email;
    if (prefillUsername && typeof prefillUsername === 'string') {
      setFormData((prev) => ({ ...prev, username: prefillUsername }));
    }

    const successMessage = location?.state?.successMessage;
    if (successMessage && typeof successMessage === 'string') {
      setPageSuccessMessage(successMessage);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location?.state, location.pathname, navigate]);

  useEffect(() => {
    const username = normalizeUsername(formData.username);
    const storedAttempts = readAttemptsFromStorage(username);

    setAttemptCount(storedAttempts);
    attemptCountRef.current = storedAttempts;

    const lock = readLockFromStorage(username);
    if (lock?.until) {
      lockUntilRef.current = lock.until;
      const diffSeconds = Math.ceil((lock.until - Date.now()) / 1000);
      if (diffSeconds > 0) {
        setIsLocked(true);
        setTimeRemaining(diffSeconds);
        setAttemptBanner('');
      } else {
        setIsLocked(false);
        setTimeRemaining(0);
        lockUntilRef.current = null;
        clearLockInStorage(username);
        clearAttemptsInStorage(username);
        setAttemptCount(0);
        attemptCountRef.current = 0;
      }
    } else {
      setIsLocked(false);
      setTimeRemaining(0);
      lockUntilRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.username]);

  useEffect(() => {
    if (!isLocked && !showForgotPasswordModal) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isLocked, showForgotPasswordModal]);

  useEffect(() => {
    if (!showForgotPasswordModal) return;
    const t = setTimeout(() => {
      forgotPasswordInputRef.current?.focus();
    }, 50);
    return () => clearTimeout(t);
  }, [showForgotPasswordModal]);

  useEffect(() => {
    if (!showForgotPasswordModal) return;

    const onKeyDown = (e) => {
      if (e.key === 'Escape' && !forgotPasswordLoading) {
        closeForgotPasswordModal();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showForgotPasswordModal, forgotPasswordLoading]);

  useEffect(() => {
    if (!isLocked) return;

    const username = normalizeUsername(formData.username);

    const tick = () => {
      const until = lockUntilRef.current;
      if (!until) {
        setIsLocked(false);
        setTimeRemaining(0);
        return;
      }

      const diffSeconds = Math.ceil((until - Date.now()) / 1000);

      if (diffSeconds <= 0) {
        setIsLocked(false);
        setAttemptCount(0);
        attemptCountRef.current = 0;
        setTimeRemaining(0);
        setAttemptBanner('');
        lockUntilRef.current = null;
        clearLockInStorage(username);
        clearAttemptsInStorage(username);
        return;
      }

      setTimeRemaining(diffSeconds);
    };

    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [isLocked, formData.username]);

  const lockNow = (username) => {
    const until = Date.now() + LOCK_SECONDS * 1000;
    lockUntilRef.current = until;

    setIsLocked(true);
    setTimeRemaining(LOCK_SECONDS);
    setError('');
    setAttemptBanner('');
    writeLockToStorage(username, until);
  };

  const registerFailedAttempt = () => {
    const username = normalizeUsername(formData.username);

    const next = attemptCountRef.current + 1;
    attemptCountRef.current = next;
    setAttemptCount(next);
    writeAttemptsToStorage(username, next);

    if (next >= MAX_ATTEMPTS) {
      lockNow(username);
      return { nextAttempt: next, locked: true };
    }

    return { nextAttempt: next, locked: false };
  };

  const handleBack = () => {
    navigate('/');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
    setAttemptBanner('');
    setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    setPageSuccessMessage('');
  };

  const validateBasic = () => {
    const next = { username: '', password: '' };
    const username = normalizeUsername(formData.username);

    if (!username) next.username = 'Username is required.';
    else if (username.length < 3) next.username = 'Username must be at least 3 characters.';

    if (!formData.password) next.password = 'Password is required.';

    setFieldErrors(next);
    return !next.username && !next.password;
  };

  const validateForgotPasswordEmail = () => {
    const email = normalizeEmail(forgotPasswordEmail);
    if (!email) return 'Email is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please enter a valid email address.';
    return '';
  };

  const resetAttemptsAndLock = () => {
    const username = normalizeUsername(formData.username);
    setAttemptCount(0);
    attemptCountRef.current = 0;
    setAttemptBanner('');
    setIsLocked(false);
    setTimeRemaining(0);
    lockUntilRef.current = null;
    clearLockInStorage(username);
    clearAttemptsInStorage(username);
  };

  const openForgotPasswordModal = () => {
    const usernameOrEmail = normalizeUsername(formData.username);
    const initialEmail = usernameOrEmail.includes('@') ? usernameOrEmail : '';

    setForgotPasswordEmail(initialEmail);
    setForgotPasswordError('');
    setForgotPasswordSuccess('');
    setShowForgotPasswordModal(true);
  };

  const closeForgotPasswordModal = () => {
    if (forgotPasswordLoading) return;
    setShowForgotPasswordModal(false);
    setForgotPasswordError('');
    setForgotPasswordSuccess('');
  };

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    setForgotPasswordError('');
    setForgotPasswordSuccess('');

    const emailError = validateForgotPasswordEmail();
    if (emailError) {
      setForgotPasswordError(emailError);
      return;
    }

    setForgotPasswordLoading(true);

    try {
      await axios.post(FORGOT_PASSWORD_API_URL, {
        email: normalizeEmail(forgotPasswordEmail),
      });

      setForgotPasswordSuccess('If the email exists, we sent a reset link.');
    } catch (err) {
      const message =
        err.response?.data?.message || 'Unable to process your request right now. Please try again.';
      setForgotPasswordError(message);
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const handleCaptchaChange = (token) => {
    setCaptchaToken(token || '');
    setCaptchaError('');
    setError('');
  };

  const resetCaptcha = () => {
    setCaptchaToken('');
    if (recaptchaRef.current) {
      try {
        recaptchaRef.current.reset();
      } catch {}
    }
  };

  const remountCaptcha = () => {
    setCaptchaToken('');
    setCaptchaError('');
    setShowCaptcha(false);

    setTimeout(() => {
      setCaptchaRenderKey((prev) => prev + 1);
      setShowCaptcha(true);
    }, 250);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setCaptchaError('');

    if (isLocked) return;
    if (!validateBasic()) return;

    if (!RECAPTCHA_SITE_KEY) {
      setError('reCAPTCHA site key is missing. Please check frontend environment settings.');
      return;
    }

    if (!captchaToken) {
      setCaptchaError('Please complete the CAPTCHA.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        username: normalizeUsername(formData.username),
        password: formData.password,
        recaptchaToken: captchaToken,
      };

      const response = await axios.post(LOGIN_API_URL, payload);

      const role = response.data?.user?.role;
      const token = response.data?.token;
      const user = response.data?.user;

      resetAttemptsAndLock();
      storeAuth(token, user);
      resetCaptcha();
      if (role === 'admin') {
        navigate('/admin/dashboard');
        return;
      }

      if (role === 'employer') {
        navigate('/employer/dashboard', { state: { justLoggedIn: true } });
        return;
      }

      navigate('/jobseeker/dashboard', {
        state: {
          justLoggedIn: true,
          mustChangePassword: Boolean(user?.mustChangePassword),
        },
      });
    } catch (err) {
      clearAuth();

      const status = err.response?.status;
      const code = err.response?.data?.code;
      const message = err.response?.data?.message || 'Unable to log in. Please try again.';

      if (status === 403 && (code === 'PENDING_ADMIN_APPROVAL' || code === 'EMPLOYER_REJECTED')) {
        navigate('/employer/register/pending', {
          state: {
            email: normalizeUsername(formData.username),
            message:
              err.response?.data?.message ||
              'Your account is under review. You will be able to log in once admin approves your account.',
          },
        });
        return;
      }

      if (code === 'RECAPTCHA_REQUIRED' || code === 'RECAPTCHA_FAILED' || code === 'RECAPTCHA_NOT_CONFIGURED') {
        setError(message);
        setCaptchaError(message);
        resetCaptcha();
        remountCaptcha();
        return;
      }

      const { nextAttempt, locked } = registerFailedAttempt();
      resetCaptcha();
      remountCaptcha();
      if (locked) return;

      setAttemptBanner(`Incorrect password. Attempt ${nextAttempt} of ${MAX_ATTEMPTS}.`);
    } finally {
      setLoading(false);
    }
  };

  const inputBase =
    'block w-full h-11 px-3 text-sm text-gray-900 border rounded-xl bg-white ' +
    'placeholder:text-gray-400 shadow-sm transition ' +
    'focus:outline-none focus:border-[#2e66a6] focus:ring-4 focus:ring-[#2e66a6]/10 ' +
    'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed';

  const labelBase = 'block text-sm font-semibold text-gray-800';
  const iconWrap = 'absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none';

  const fieldClass = (hasError) =>
    `${inputBase} ${
      hasError ? 'border-red-400 focus:ring-red-100/80 focus:border-red-600' : 'border-gray-200'
    }`;

  const helperText = (id, text = '') => (
    <p id={id} className="text-[11px] text-gray-500 mt-1">
      {text}
    </p>
  );

  const errorText = (id, msg) =>
    msg ? (
      <p id={id} className="text-xs text-red-600 mt-1" role="alert" aria-live="polite">
        {msg}
      </p>
    ) : null;

  const errorAlert = useMemo(() => {
    if (!error) return null;
    return (
      <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl" role="alert" aria-live="assertive">
        <div className="flex items-start">
          <svg aria-hidden="true" className="w-4 h-4 text-red-600 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          <p className="text-red-900 font-semibold text-sm">{error}</p>
        </div>
      </div>
    );
  }, [error]);

  const successAlert = useMemo(() => {
    if (!pageSuccessMessage) return null;
    return (
      <div className="mb-4 p-3.5 bg-green-50 border border-green-200 rounded-xl" role="status" aria-live="polite">
        <div className="flex items-start">
          <svg aria-hidden="true" className="w-4 h-4 text-green-700 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.707a1 1 0 00-1.414-1.414L9 10.172 7.707 8.879a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          <p className="text-green-900 font-semibold text-sm">{pageSuccessMessage}</p>
        </div>
      </div>
    );
  }, [pageSuccessMessage]);

  const attemptAlert = useMemo(() => {
    if (!attemptBanner || isLocked) return null;
    return (
      <div
        className="mb-4 px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg text-center"
        role="status"
        aria-live="polite"
      >
        <p className="text-sm font-semibold text-red-600">{attemptBanner}</p>
      </div>
    );
  }, [attemptBanner, isLocked]);

  const lockPopup = useMemo(() => {
    if (!isLocked) return null;

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40"
        role="dialog"
        aria-modal="true"
        aria-label="Account Locked"
      >
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl ring-1 ring-black/10 overflow-hidden">
          <div className="p-6">
            <div className="flex flex-col items-center text-center">
              <img src="/images/secure.png" alt="PHINMA Logo" className="w-16 h-16 object-contain" />

              <h3 className="mt-4 text-2xl font-extrabold text-gray-900">Account Locked</h3>

              <p className="mt-2 text-sm text-gray-600">
                Too many failed attempts. Please wait <br />
                before trying again.
              </p>

              <p className="mt-4 text-base font-extrabold text-red-600">Time remaining: {timeRemaining} seconds</p>
            </div>
          </div>
        </div>
      </div>
    );
  }, [isLocked, timeRemaining]);

  const forgotPasswordModal = useMemo(() => {
    if (!showForgotPasswordModal) return null;

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-[2px]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="forgot-password-title"
        aria-describedby="forgot-password-description"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget && !forgotPasswordLoading) {
            closeForgotPasswordModal();
          }
        }}
      >
        <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/5">
          <div className="relative border-b border-gray-100 px-6 py-5 sm:px-7">
            <button
              type="button"
              onClick={closeForgotPasswordModal}
              disabled={forgotPasswordLoading}
              className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition hover:bg-gray-50 hover:text-gray-700 focus:outline-none focus:ring-4 focus:ring-[#2e66a6]/10 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Close forgot password modal"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="pr-12">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2e66a6]/10">
                <svg
                  aria-hidden="true"
                  className="h-6 w-6 text-[#2e66a6]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8m-16 9h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </div>

              <h3 id="forgot-password-title" className="text-xl font-extrabold tracking-tight text-gray-900">
                Forgot Password
              </h3>
              <p id="forgot-password-description" className="mt-1.5 text-sm leading-6 text-gray-600">
                Enter the email address linked to your account and we’ll send you a password reset link.
              </p>
            </div>
          </div>

          <div className="px-6 py-6 sm:px-7">
            {forgotPasswordSuccess ? (
              <div className="space-y-5">
                <div
                  className="rounded-2xl border border-green-200 bg-green-50 p-4"
                  role="status"
                  aria-live="polite"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-100">
                      <svg
                        aria-hidden="true"
                        className="h-5 w-5 text-green-700"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2.5"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>

                    <div>
                      <p className="text-sm font-bold text-green-800">Reset link request sent</p>
                      <p className="mt-1 text-sm text-green-700">
                        If the email exists, we sent a reset link. Please check your inbox and spam folder.
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeForgotPasswordModal}
                  className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#2e66a6] px-4 text-sm font-semibold text-white transition hover:bg-[#245387] focus:outline-none focus:ring-4 focus:ring-[#2e66a6]/15"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-5" noValidate>
                <div className="space-y-1.5">
                  <label htmlFor="forgot-password-email" className={labelBase}>
                    Email address
                  </label>

                  <input
                    ref={forgotPasswordInputRef}
                    id="forgot-password-email"
                    type="email"
                    value={forgotPasswordEmail}
                    onChange={(e) => {
                      setForgotPasswordEmail(e.target.value);
                      setForgotPasswordError('');
                    }}
                    autoComplete="email"
                    className={fieldClass(!!forgotPasswordError)}
                    disabled={forgotPasswordLoading}
                    placeholder="name@example.com"
                    aria-invalid={!!forgotPasswordError}
                    aria-describedby={forgotPasswordError ? 'forgot-password-email-error' : 'forgot-password-email-help'}
                  />

                  {forgotPasswordError ? (
                    <p
                      id="forgot-password-email-error"
                      className="text-xs text-red-600 mt-1"
                      role="alert"
                      aria-live="polite"
                    >
                      {forgotPasswordError}
                    </p>
                  ) : (
                    <p id="forgot-password-email-help" className="text-xs text-gray-500 mt-1">
                      Make sure you enter the same email used during registration.
                    </p>
                  )}
                </div>

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeForgotPasswordModal}
                    disabled={forgotPasswordLoading}
                    className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 focus:outline-none focus:ring-4 focus:ring-gray-200 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:min-w-[120px]"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={forgotPasswordLoading}
                    className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#2e66a6] px-4 text-sm font-semibold text-white transition hover:bg-[#245387] focus:outline-none focus:ring-4 focus:ring-[#2e66a6]/15 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:min-w-[160px]"
                  >
                    {forgotPasswordLoading ? (
                      <span className="flex items-center justify-center">
                        <svg
                          aria-hidden="true"
                          className="mr-2 h-4 w-4 animate-spin text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        Sending link...
                      </span>
                    ) : (
                      'Send Reset Link'
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }, [
    showForgotPasswordModal,
    forgotPasswordSuccess,
    forgotPasswordError,
    forgotPasswordEmail,
    forgotPasswordLoading,
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-[#2e66a6]/10 flex items-center justify-center p-4">
      {lockPopup}
      {forgotPasswordModal}

      <div className="w-full max-w-2xl">
        <div className="mx-auto w-full max-w-[550px] bg-white rounded-2xl shadow-xl ring-1 ring-black/5 overflow-hidden">
          <div className="px-8 py-4 lg:px-10 lg:py-5 bg-white">
            <div className="mb-4">
              <button
                type="button"
                onClick={handleBack}
                className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-300 bg-white hover:bg-gray-50 transition shadow-sm"
                aria-label="Back"
              >
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            </div>

            <div className="text-center mb-6 pt-2">
              <div className="flex justify-center mb-4">
                <img
                  src="/images/phinma-logo.png"
                  alt="PHINMA Logo"
                  className="w-20 h-20 object-contain"
                />
              </div>

              <h2 className="text-2xl font-extrabold text-gray-900">Welcome</h2>
              <p className="mt-2 text-[15px] text-gray-700">Sign in to continue to your account</p>
            </div>

            {successAlert}
            {attemptAlert}

            <div className="mx-auto w-full">
              <form onSubmit={handleSubmit} className="space-y-4" noValidate aria-busy={loading}>
                <div className="space-y-1">
                  <label htmlFor="username" className={labelBase}>
                    Username
                  </label>

                  <div className="relative">
                    <div className={iconWrap}>
                      <svg
                        aria-hidden="true"
                        className="h-4 w-4 text-gray-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                    </div>

                    <input
                      id="username"
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      onFocus={() => setFocused((p) => ({ ...p, username: true }))}
                      onBlur={() => setFocused((p) => ({ ...p, username: false }))}
                      autoComplete="username"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      placeholder="Enter your username"
                      className={`${fieldClass(!!fieldErrors.username)} pl-10`}
                      disabled={loading || isLocked}
                      required
                      aria-invalid={!!fieldErrors.username}
                      aria-describedby={
                        fieldErrors.username
                          ? 'username-error'
                          : focused.username
                          ? 'username-help'
                          : undefined
                      }
                    />
                  </div>

                  {focused.username && !fieldErrors.username && helperText('username-help')}
                  {errorText('username-error', fieldErrors.username)}
                </div>

                <div className="space-y-1">
                  <label htmlFor="password" className={labelBase}>
                    Password
                  </label>

                  <div className="relative">
                    <div className={iconWrap}>
                      <svg
                        aria-hidden="true"
                        className="h-4 w-4 text-gray-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                      </svg>
                    </div>

                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      onFocus={() => setFocused((p) => ({ ...p, password: true }))}
                      onBlur={() => setFocused((p) => ({ ...p, password: false }))}
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      className={`${fieldClass(!!fieldErrors.password)} pl-10 pr-20`}
                      disabled={loading || isLocked}
                      required
                      aria-invalid={!!fieldErrors.password}
                      aria-describedby={
                        fieldErrors.password
                          ? 'password-error'
                          : focused.password
                          ? 'password-help'
                          : undefined
                      }
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute inset-y-0 right-0 px-3 text-xs font-semibold text-gray-700 hover:text-gray-900 focus:outline-none rounded-lg"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      title={showPassword ? 'Hide password' : 'Show password'}
                      disabled={loading || isLocked}
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>

                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      {focused.password && !fieldErrors.password && helperText('password-help')}
                      {errorText('password-error', fieldErrors.password)}
                    </div>

                    <button
                      type="button"
                      onClick={openForgotPasswordModal}
                      className="mt-1 text-xs font-semibold text-[#2e66a6] hover:text-[#245387] whitespace-nowrap"
                    >
                      Forgot password?
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-center sm:justify-start -mt-5">
                    <div className="origin-center scale-90 min-h-[86px] flex items-center">
                      {RECAPTCHA_SITE_KEY ? (
                        showCaptcha ? (
                          <ReCAPTCHA
                            key={captchaRenderKey}
                            ref={recaptchaRef}
                            sitekey={RECAPTCHA_SITE_KEY}
                            onChange={handleCaptchaChange}
                            onExpired={() => setCaptchaToken('')}
                            onErrored={() => {
                              setCaptchaToken('');
                              setCaptchaError('reCAPTCHA failed to load. Please click retry and try again.');
                              setShowCaptcha(false);
                            }}
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={remountCaptcha}
                            className="h-11 px-4 rounded-xl border border-gray-300 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
                          >
                            Retry CAPTCHA
                          </button>
                        )
                      ) : null}
                    </div>
                  </div>

                  {captchaError ? (
                    <p className="text-xs text-red-600 mt-1 text-center sm:text-left" role="alert" aria-live="polite">
                      {captchaError}
                    </p>
                  ) : null}
                </div>

                <button
                  type="submit"
                  disabled={loading || isLocked}
                  className="w-full h-11 rounded-xl font-semibold text-sm text-white
                    bg-[#2e66a6] hover:bg-[#245387]
                    focus:outline-none
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition shadow-sm hover:shadow-md"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <svg
                        aria-hidden="true"
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Signing in...
                    </div>
                  ) : (
                    'Sign in'
                  )}
                </button>
              </form>

              <div className="mt-6">
                <div className="h-px bg-gray-100 mb-4" />

                <p className="text-center text-sm text-gray-700">
                  Don&apos;t have an account?{' '}
                  <button
                    type="button"
                    onClick={() => navigate('/join-as')}
                    className="font-semibold text-[#2e66a6] hover:text-[#245387] transition underline"
                  >
                    Sign Up here
                  </button>
                </p>
              </div>
            </div>

            {errorAlert}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;