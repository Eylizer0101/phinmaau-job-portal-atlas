// src/pages/employer/auth/EmployerLoginPage.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';

const EmployerLoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const API_URL = process.env.REACT_APP_API_URL
    ? `${process.env.REACT_APP_API_URL}/auth/employer/login`
    : 'http://localhost:5000/api/auth/employer/login';

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState({ email: false, password: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [fieldErrors, setFieldErrors] = useState({ email: '', password: '' });

  // Lock popup
  const LOCK_SECONDS = 120;
  const MAX_ATTEMPTS = 3;

  const [attemptCount, setAttemptCount] = useState(0);
  const attemptCountRef = useRef(0);

  const [isLocked, setIsLocked] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);

  const [attemptBanner, setAttemptBanner] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false);

  useEffect(() => {
    const prefillEmail = location?.state?.email;
    if (prefillEmail && typeof prefillEmail === 'string') {
      setFormData((prev) => ({ ...prev, email: prefillEmail }));
    }
  }, [location?.state]);

  const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

  const getLockKey = (email) => `employer_login_lock_${normalizeEmail(email) || 'unknown'}`;
  const getAttemptsKey = (email) => `employer_login_attempts_${normalizeEmail(email) || 'unknown'}`;
  const lockUntilRef = useRef(null);

  const readLockFromStorage = (email) => {
    try {
      const lockRaw = localStorage.getItem(getLockKey(email));
      if (!lockRaw) return null;
      const parsed = JSON.parse(lockRaw);
      if (!parsed?.until) return null;
      return parsed;
    } catch {
      return null;
    }
  };

  const writeLockToStorage = (email, untilEpochMs) => {
    try {
      localStorage.setItem(getLockKey(email), JSON.stringify({ until: untilEpochMs }));
    } catch {}
  };

  const clearLockInStorage = (email) => {
    try {
      localStorage.removeItem(getLockKey(email));
    } catch {}
  };

  const readAttemptsFromStorage = (email) => {
    try {
      const raw = localStorage.getItem(getAttemptsKey(email));
      const n = Number(raw);
      return Number.isFinite(n) && n >= 0 ? n : 0;
    } catch {
      return 0;
    }
  };

  const writeAttemptsToStorage = (email, n) => {
    try {
      localStorage.setItem(getAttemptsKey(email), String(n));
    } catch {}
  };

  const clearAttemptsInStorage = (email) => {
    try {
      localStorage.removeItem(getAttemptsKey(email));
    } catch {}
  };

  useEffect(() => {
    const email = normalizeEmail(formData.email);

    const storedAttempts = readAttemptsFromStorage(email);
    setAttemptCount(storedAttempts);
    attemptCountRef.current = storedAttempts;

    const lock = readLockFromStorage(email);
    if (lock?.until) {
      lockUntilRef.current = lock.until;
      const diffSeconds = Math.ceil((lock.until - Date.now()) / 1000);
      if (diffSeconds > 0) {
        setIsLocked(true);
        setTimeRemaining(diffSeconds);
      } else {
        setIsLocked(false);
        setTimeRemaining(0);
        lockUntilRef.current = null;
        clearLockInStorage(email);
        clearAttemptsInStorage(email);
        setAttemptCount(0);
        attemptCountRef.current = 0;
      }
    } else {
      setIsLocked(false);
      setTimeRemaining(0);
      lockUntilRef.current = null;
    }

    setHasSubmitted(false);
    setAttemptBanner('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.email]);

  useEffect(() => {
    if (!isLocked) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isLocked]);

  useEffect(() => {
    if (!isLocked) return;

    const email = normalizeEmail(formData.email);

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
        lockUntilRef.current = null;
        clearLockInStorage(email);
        clearAttemptsInStorage(email);
        setAttemptBanner('');
        setHasSubmitted(false);
        return;
      }

      setTimeRemaining(diffSeconds);
    };

    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [isLocked, formData.email]);

  const lockNow = (email) => {
    const until = Date.now() + LOCK_SECONDS * 1000;
    lockUntilRef.current = until;

    setIsLocked(true);
    setTimeRemaining(LOCK_SECONDS);

    setAttemptBanner('');
    setError('');

    writeLockToStorage(email, until);
  };

  const registerFailedAttempt = () => {
    const email = normalizeEmail(formData.email);

    const next = attemptCountRef.current + 1;
    attemptCountRef.current = next;
    setAttemptCount(next);
    writeAttemptsToStorage(email, next);

    if (next >= MAX_ATTEMPTS) {
      lockNow(email);
      return { nextAttempt: next, locked: true };
    }

    return { nextAttempt: next, locked: false };
  };

  const resetAttemptsAndLock = () => {
    const email = normalizeEmail(formData.email);
    setAttemptCount(0);
    attemptCountRef.current = 0;
    setIsLocked(false);
    setTimeRemaining(0);
    lockUntilRef.current = null;
    clearLockInStorage(email);
    clearAttemptsInStorage(email);
    setAttemptBanner('');
    setHasSubmitted(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));

    setError('');
    setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    if (hasSubmitted) setAttemptBanner('');
  };

  const handleBack = () => navigate('/employer');

  const storeAuth = (token, user) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  };

  const clearAuth = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const validateRequired = () => {
    const next = { email: '', password: '' };
    const email = normalizeEmail(formData.email);

    if (!email) next.email = 'Email is required.';
    if (!formData.password) next.password = 'Password is required.';

    setFieldErrors(next);

    if (next.email) {
      document.getElementById('email')?.focus?.();
      return false;
    }
    if (next.password) {
      document.getElementById('password')?.focus?.();
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setHasSubmitted(true);

    if (isLocked) return;

    const ok = validateRequired();
    if (!ok) return;

    setLoading(true);

    try {
      const payload = {
        businessEmail: normalizeEmail(formData.email),
        password: formData.password,
      };

      const response = await axios.post(API_URL, payload);

      const token = response.data?.token;
      const user = response.data?.user;

      if (user?.role !== 'employer') {
        clearAuth();
        setError('This account is not an employer account.');
        return;
      }

      resetAttemptsAndLock();
      storeAuth(token, user);
      navigate('/employer/dashboard', { state: { justLoggedIn: true } });
    } catch (err) {
      clearAuth();

      const status = err.response?.status;
      const code = err.response?.data?.code;

      // ✅ Under review / admin approval
      if (status === 403 && code === 'PENDING_ADMIN_APPROVAL') {
        navigate('/employer/register/pending', {
          state: {
            email: normalizeEmail(formData.email),
            message:
              err.response?.data?.message ||
              'Your account is under review. You will be able to log in once admin approves your account.',
          },
        });
        return;
      }

      // ✅ Rejected
      if (status === 403 && code === 'EMPLOYER_REJECTED') {
        navigate('/employer/register/pending', {
          state: {
            email: normalizeEmail(formData.email),
            message:
              err.response?.data?.message ||
              'Your employer account was rejected by admin.',
          },
        });
        return;
      }

      // Wrong creds
      const { nextAttempt, locked } = registerFailedAttempt();
      if (locked) return;

      setAttemptBanner(`Incorrect password. Attempt ${nextAttempt} of ${MAX_ATTEMPTS}.`);
      setError('');
    } finally {
      setLoading(false);
    }
  };

  // ---------- UI Helpers ----------
  const inputBase =
    'block w-full h-11 px-3 text-sm text-gray-900 border border-gray-200 rounded-xl bg-white ' +
    'placeholder:text-gray-400 shadow-sm transition ' +
    'focus:outline-none  focus:border-emerald-700 ' +
    'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed';

  const labelBase = 'block text-sm font-semibold text-gray-800';
  const iconWrap = 'absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none';

  const fieldClass = (hasError) =>
    `${inputBase} ${hasError ? 'border-red-400 focus:ring-red-100/80 focus:border-red-600' : ''}`;

  const helperText = (id, text) => (
    <p id={id} className="text-[11px] text-gray-500 mt-1">
      {text}
    </p>
  );

  const fieldErrorText = (id, msg) =>
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

  const attemptAlert = useMemo(() => {
    if (!attemptBanner || isLocked) return null;
    return (
      <div className="mb-4 px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg text-center" role="status" aria-live="polite">
        <p className="text-sm font-semibold text-red-600">{attemptBanner}</p>
      </div>
    );
  }, [attemptBanner, isLocked]);

  const lockPopup = useMemo(() => {
    if (!isLocked) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40" role="dialog" aria-modal="true" aria-label="Account Locked">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl ring-1 ring-black/10 overflow-hidden">
          <div className="h-1.5 bg-yellow-400" />
          <div className="p-6">
            <div className="flex flex-col items-center text-center">
              <img src="/images/phinma-logo.png" alt="PHINMA Logo" className="w-16 h-16 object-contain" />
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-emerald-50/20 flex items-center justify-center p-4">
      {lockPopup}

      <div className="w-full max-w-6xl">
        <div className="bg-white rounded-2xl shadow-xl ring-1 ring-black/5 overflow-hidden">
          <div className="flex flex-col lg:flex-row">
            {/* Left Side */}
            <div className="lg:w-1/2 p-8 lg:p-12 bg-white relative">
              <button
                type="button"
                onClick={handleBack}
                className="absolute left-4 top-4 w-8 h-8 flex items-center justify-center rounded-full border border-gray-300 bg-white hover:bg-gray-50 transition shadow-sm"
              >
                <svg className="w-4 h-4 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>

              <div className="h-full flex flex-col justify-center">
                <div className="flex flex-col items-center justify-center">
                  <div
                    className="w-full rounded-lg overflow-hidden flex items-center justify-center mb-4"
                    style={{
                      height: '120px',
                      backgroundImage: `url('/images/employer-login.png')`,
                      backgroundSize: 'contain',
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'center',
                      backgroundColor: 'transparent',
                    }}
                  />

                  <div className="text-center w-full">
                    <h1 className="text-5xl font-bold text-black mb-3 tracking-tight">AGAPAY</h1>
                    <div className="w-4/5 mx-auto">
                      <p className="text-lg text-gray-700 leading-relaxed">
                        A Workforce Development–Career Management System for PHINMA AU Graduates
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="hidden lg:flex items-center justify-center" aria-hidden="true">
              <div className="w-px h-[85%] bg-gradient-to-b from-transparent via-gray-200 to-transparent" />
            </div>

            {/* Right Side */}
            <div className="lg:w-1/2 p-8 lg:p-10 bg-white">
              <div className="mx-auto w-full max-w-md">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-extrabold text-gray-900">Employer Login</h2>
                  <p className="mt-1 text-sm text-gray-600">Sign in to access your employer dashboard.</p>
                </div>

                {attemptAlert}
                {errorAlert}

                <form onSubmit={handleSubmit} className="space-y-4" noValidate aria-busy={loading}>
                  {/* Email */}
                  <div className="space-y-1">
                    <label htmlFor="email" className={labelBase}>Business Email</label>

                    <div className="relative">
                      <div className={iconWrap}>
                        <svg aria-hidden="true" className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>

                      <input
                        id="email"
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        onFocus={() => setFocused((p) => ({ ...p, email: true }))}
                        onBlur={() => setFocused((p) => ({ ...p, email: false }))}
                        autoComplete="email"
                        inputMode="email"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        className={`${fieldClass(!!fieldErrors.email)} pl-10`}
                        disabled={loading || isLocked}
                        required
                        aria-invalid={!!fieldErrors.email}
                        aria-describedby={fieldErrors.email ? 'email-error' : focused.email ? 'email-help' : undefined}
                      />
                    </div>

                    {focused.email && helperText('email-help', '')}
                    {fieldErrorText('email-error', fieldErrors.email)}
                  </div>

                  {/* Password */}
                  <div className="space-y-1">
                    <label htmlFor="password" className={labelBase}>Password</label>

                    <div className="relative">
                      <div className={iconWrap}>
                        <svg aria-hidden="true" className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
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
                        className={`${fieldClass(!!fieldErrors.password)} pl-10 pr-20`}
                        disabled={loading || isLocked}
                        required
                        aria-invalid={!!fieldErrors.password}
                      />

                      <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        className="absolute inset-y-0 right-0 px-3 text-xs font-semibold text-gray-700 hover:text-gray-900 focus:outline-none"
                        disabled={loading || isLocked}
                      >
                        {showPassword ? 'Hide' : 'Show'}
                      </button>
                    </div>

                    {fieldErrorText('password-error', fieldErrors.password)}

                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">{focused.password && helperText('password-help', '')}</div>
                      <Link to="/employer/forgot-password" className="text-xs font-semibold text-green-700 hover:text-green-800">
                        Forgot password?
                      </Link>
                    </div>
                  </div>

                  {/* CTA */}
                  <button
                    type="submit"
                    disabled={loading || isLocked}
                    className="w-full h-11 rounded-xl font-semibold text-sm text-white
                      bg-green-700 hover:bg-green-800
                      focus:outline-none
                      disabled:opacity-50 disabled:cursor-not-allowed
                      transition shadow-sm hover:shadow-md"
                  >
                    {loading ? 'Signing in...' : 'Log in'}
                  </button>
                </form>

                <div className="text-center mt-6">
                  <p className="text-sm text-gray-700">
                    Don&apos;t have an account?{' '}
                    <Link to="/employer/register" className="font-semibold text-green-700 hover:text-green-800 transition">
                      Register here
                    </Link>
                  </p>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployerLoginPage;
