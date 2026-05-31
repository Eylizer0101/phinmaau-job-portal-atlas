import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const token = searchParams.get('token') || '';
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  const RESET_PASSWORD_API_URL = `${API_BASE_URL}/auth/reset-password`;

  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [fieldErrors, setFieldErrors] = useState({
    newPassword: '',
    confirmPassword: '',
    token: '',
  });

  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');

  const validateForm = () => {
    const next = {
      newPassword: '',
      confirmPassword: '',
      token: '',
    };

    if (!token) {
      next.token = 'Invalid or missing reset token.';
    }

    if (!formData.newPassword) {
      next.newPassword = 'New password is required.';
    } else if (formData.newPassword.length < 6) {
      next.newPassword = 'New password must be at least 6 characters.';
    }

    if (!formData.confirmPassword) {
      next.confirmPassword = 'Please confirm your new password.';
    } else if (formData.newPassword !== formData.confirmPassword) {
      next.confirmPassword = 'Passwords do not match.';
    }

    setFieldErrors(next);
    return !next.newPassword && !next.confirmPassword && !next.token;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
    setSuccessMessage('');
    setFieldErrors((prev) => ({ ...prev, [name]: '', token: prev.token }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!validateForm()) return;

    setLoading(true);

    try {
      const response = await axios.post(RESET_PASSWORD_API_URL, {
        token,
        newPassword: formData.newPassword,
      });

      setSuccessMessage(response.data?.message || 'Password reset successful. Redirecting to login...');
      setFormData({ newPassword: '', confirmPassword: '' });

      setTimeout(() => {
        navigate('/login', {
          replace: true,
          state: { message: 'Password updated successfully. You can now log in.' },
        });
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to reset password. Please request a new reset link.');
    } finally {
      setLoading(false);
    }
  };

  const inputBase =
    'block w-full h-11 px-3 text-sm text-gray-900 border rounded-xl bg-white ' +
    'placeholder:text-gray-400 shadow-sm transition focus:outline-none focus:border-[#2e66a6] ' +
    'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed';

  const fieldClass = (hasError) =>
    `${inputBase} ${hasError ? 'border-red-400 focus:ring-red-100/80 focus:border-red-600' : 'border-gray-200'}`;

  const statusBlock = useMemo(() => {
    if (successMessage) {
      return (
        <div className="mb-4 p-3.5 bg-green-50 border border-green-200 rounded-xl" role="status" aria-live="polite">
          <p className="text-green-800 font-semibold text-sm">{successMessage}</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl" role="alert" aria-live="assertive">
          <p className="text-red-800 font-semibold text-sm">{error}</p>
        </div>
      );
    }

    if (fieldErrors.token) {
      return (
        <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl" role="alert" aria-live="assertive">
          <p className="text-red-800 font-semibold text-sm">{fieldErrors.token}</p>
        </div>
      );
    }

    return null;
  }, [successMessage, error, fieldErrors.token]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-[#2e66a6]/10 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="mx-auto w-full max-w-[550px] bg-white rounded-2xl shadow-xl ring-1 ring-black/5 overflow-hidden">
          <div className="px-8 py-6 lg:px-10 lg:py-8 bg-white">
            <div className="text-center mb-6 pt-2">
              <div className="flex justify-center mb-4">
                <img
                  src="/images/phinma-logo.png"
                  alt="PHINMA Logo"
                  className="w-20 h-20 object-contain"
                />
              </div>

              <h2 className="text-2xl font-extrabold text-gray-900">Reset Password</h2>
              <p className="mt-2 text-[15px] text-gray-700">
                Enter your new password to continue.
              </p>
            </div>

            {statusBlock}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate aria-busy={loading}>
              <div className="space-y-1">
                <label htmlFor="newPassword" className="block text-sm font-semibold text-gray-800">
                  New Password
                </label>

                <div className="relative">
                  <input
                    id="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handleChange}
                    autoComplete="new-password"
                    className={`${fieldClass(!!fieldErrors.newPassword)} pr-20`}
                    disabled={loading || !token || !!successMessage}
                  />

                  <button
                    type="button"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 px-3 text-xs font-semibold text-gray-700 hover:text-gray-900 focus:outline-none rounded-lg"
                    disabled={loading || !token || !!successMessage}
                  >
                    {showNewPassword ? 'Hide' : 'Show'}
                  </button>
                </div>

                {fieldErrors.newPassword ? (
                  <p className="text-xs text-red-600 mt-1" role="alert" aria-live="polite">
                    {fieldErrors.newPassword}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1">
                <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-800">
                  Confirm Password
                </label>

                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    autoComplete="new-password"
                    className={`${fieldClass(!!fieldErrors.confirmPassword)} pr-20`}
                    disabled={loading || !token || !!successMessage}
                  />

                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 px-3 text-xs font-semibold text-gray-700 hover:text-gray-900 focus:outline-none rounded-lg"
                    disabled={loading || !token || !!successMessage}
                  >
                    {showConfirmPassword ? 'Hide' : 'Show'}
                  </button>
                </div>

                {fieldErrors.confirmPassword ? (
                  <p className="text-xs text-red-600 mt-1" role="alert" aria-live="polite">
                    {fieldErrors.confirmPassword}
                  </p>
                ) : null}
              </div>

              <button
                type="submit"
                disabled={loading || !token || !!successMessage}
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
                    Updating Password...
                  </div>
                ) : (
                  'Reset Password'
                )}
              </button>
            </form>

            <div className="mt-6">
              <div className="h-px bg-gray-100 mb-4" />

              <p className="text-center text-sm text-gray-700">
                Back to{' '}
                <Link
                  to="/login"
                  className="font-semibold text-[#2e66a6] hover:text-[#245387] transition underline"
                >
                  Login
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;