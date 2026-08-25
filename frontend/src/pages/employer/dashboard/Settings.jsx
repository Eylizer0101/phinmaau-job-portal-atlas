// src/pages/employer/dashboard/Settings.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import EmployerLayout from '../../../layouts/EmployerLayout';

const API_BASE = process.env.REACT_APP_API_URL || 'https://phinmaau-job-portal-atlas.onrender.com/api';

const suffixOptions = ['', 'Jr.', 'Sr.', 'I', 'II', 'III', 'IV', 'V'];

const initialMessages = {
  name: '',
  position: '',
  email: '',
  phone: '',
  password: '',
  general: '',
};

const cx = (...classes) => classes.filter(Boolean).join(' ');

const focusRing =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2 focus-visible:ring-offset-white';

const Section = ({ title, description, actionText, actionType = 'button', onAction, loading, children }) => (
  <section className="overflow-hidden rounded-2xl border border-[#e6edf5] bg-white shadow-[0_12px_30px_rgba(46,102,166,0.06)]">
    <div className="flex flex-col gap-3 border-b border-[#e6edf5] bg-[#f7faff] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-sm font-bold text-black">{title}</h2>
        {description ? <p className="mt-1 text-xs text-black/55">{description}</p> : null}
      </div>

      {actionText ? (
        <button
          type={actionType}
          onClick={onAction}
          disabled={loading}
          className={cx(
            'inline-flex h-11 items-center justify-center rounded-xl bg-[#2e66a6] px-6 text-sm font-bold text-white shadow-[0_10px_22px_rgba(46,102,166,0.18)] transition hover:bg-[#25578f] active:bg-[#1f4b7c] disabled:cursor-not-allowed disabled:opacity-60',
            focusRing
          )}
        >
          {loading ? 'Saving...' : actionText}
        </button>
      ) : null}
    </div>

    <div className="px-5 py-5 sm:px-6 sm:py-6">{children}</div>
  </section>
);

const TextInput = ({ label, className = '', ...props }) => (
  <label className={cx('block', className)}>
    <span className="mb-2 block text-xs font-semibold text-black/65">{label}</span>
    <input
      {...props}
      className={cx(
        'h-11 w-full rounded-xl border border-[#d8e2ee] bg-white px-4 text-sm text-black outline-none transition placeholder:text-black/40 focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/20 disabled:cursor-not-allowed disabled:bg-[#f7faff] disabled:text-black/45',
        focusRing,
        props.readOnly ? 'cursor-default bg-[#f7faff] text-black/70' : ''
      )}
    />
  </label>
);

const SelectInput = ({ label, className = '', children, ...props }) => (
  <label className={cx('block', className)}>
    <span className="mb-2 block text-xs font-semibold text-black/65">{label}</span>
    <select
      {...props}
      className={cx(
        'h-11 w-full rounded-xl border border-[#d8e2ee] bg-white px-4 text-sm text-black outline-none transition focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/20 disabled:cursor-not-allowed disabled:bg-[#f7faff] disabled:text-black/45',
        focusRing
      )}
    >
      {children}
    </select>
  </label>
);

const Message = ({ type = 'success', children }) => {
  if (!children) return null;

  const isError = type === 'error';

  return (
    <div
      className={cx(
        'mb-5 rounded-2xl border px-4 py-3 text-sm shadow-sm',
        isError
          ? 'border-red-200 bg-[#fff7f7] text-red-700'
          : 'border-[#d8e2ee] bg-[#f7faff] text-[#2e66a6]'
      )}
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
    >
      <div className="font-semibold">{isError ? 'Error' : 'Success'}</div>
      <div>{children}</div>
    </div>
  );
};

const InlineActionButton = ({ children, className = '', ...props }) => (
  <button
    type="button"
    className={cx(
      'inline-flex w-fit items-center text-xs font-semibold text-[#2e66a6] underline underline-offset-4 transition hover:text-[#25578f]',
      focusRing,
      className
    )}
    {...props}
  >
    {children}
  </button>
);

const SecondaryButton = ({ children, className = '', ...props }) => (
  <button
    type="button"
    className={cx(
      'inline-flex h-11 items-center justify-center rounded-xl border border-[#d8e2ee] bg-white px-5 text-sm font-bold text-black/70 transition hover:border-[#2e66a6] hover:text-[#2e66a6] disabled:cursor-not-allowed disabled:opacity-60',
      focusRing,
      className
    )}
    {...props}
  >
    {children}
  </button>
);

const Settings = () => {
  const navigate = useNavigate();

  const [loadingPage, setLoadingPage] = useState(true);
  const [saving, setSaving] = useState({ name: false, position: false, email: false, phone: false, password: false });
  const [messages, setMessages] = useState(initialMessages);
  const [messageType, setMessageType] = useState(initialMessages);

  const [nameForm, setNameForm] = useState({ firstName: '', middleName: '', lastName: '', extensionName: '' });
  const [positionForm, setPositionForm] = useState({ position: '' });
  const [emailForm, setEmailForm] = useState({ currentEmail: '', currentPassword: '', newEmail: '', verificationCode: '', pendingEmail: '' });
  const [phoneForm, setPhoneForm] = useState({ mobileNumber: '', newMobileNumber: '', verificationCode: '', pendingPhoneNumber: '' });
  const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '', retypeNewPassword: '' });

  const passwordRequirements = [
    { label: 'At least 8 characters', met: passwordForm.newPassword.length >= 8 },
    { label: 'At least one uppercase letter', met: /[A-Z]/.test(passwordForm.newPassword) },
    { label: 'At least one lowercase letter', met: /[a-z]/.test(passwordForm.newPassword) },
    { label: 'At least one number', met: /\d/.test(passwordForm.newPassword) },
    { label: 'At least one special character', met: /[^A-Za-z0-9]/.test(passwordForm.newPassword) },
  ];

  const metPasswordRequirements = passwordRequirements.filter((requirement) => requirement.met).length;
  const passwordStrength =
    metPasswordRequirements === passwordRequirements.length
      ? { label: 'Strong password', color: 'text-green-700', bar: 'bg-green-600', width: 'w-full' }
      : metPasswordRequirements >= 3
        ? { label: 'Good password, but still incomplete', color: 'text-amber-700', bar: 'bg-amber-500', width: 'w-2/3' }
        : { label: 'Weak password', color: 'text-red-700', bar: 'bg-red-500', width: 'w-1/3' };

  const authHeaders = useMemo(() => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  const showMessage = (key, text, type = 'success') => {
    setMessages((prev) => ({ ...prev, [key]: text }));
    setMessageType((prev) => ({ ...prev, [key]: type }));
  };

  const clearMessage = (key) => {
    setMessages((prev) => ({ ...prev, [key]: '' }));
    setMessageType((prev) => ({ ...prev, [key]: '' }));
  };

  const refreshUserCache = (user) => {
    if (!user) return;
    const stored = JSON.parse(localStorage.getItem('user') || '{}');
    localStorage.setItem('user', JSON.stringify({ ...stored, ...user }));
  };

  const fetchUserData = async () => {
    try {
      setLoadingPage(true);
      clearMessage('general');

      const { data } = await axios.get(`${API_BASE}/auth/me`, { headers: authHeaders });
      const user = data?.user || {};
      const employerProfile = user.employerProfile || {};

      setNameForm({
        firstName: user.firstName || '',
        middleName: user.middleName || '',
        lastName: user.lastName || '',
        extensionName: user.extensionName || '',
      });

      setPositionForm({ position: employerProfile.position || '' });

      setEmailForm((prev) => ({
        ...prev,
        currentEmail: user.email || employerProfile.businessEmail || '',
        pendingEmail: user.settingsVerification?.pendingEmail || '',
      }));

      setPhoneForm((prev) => ({
        ...prev,
        mobileNumber: employerProfile.mobileNumber || '',
        pendingPhoneNumber: user.settingsVerification?.pendingPhoneNumber || '',
      }));
    } catch (error) {
      showMessage('general', error.response?.data?.message || 'Unable to load settings data.', 'error');
    } finally {
      setLoadingPage(false);
    }
  };

  useEffect(() => {
    fetchUserData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNameSave = async () => {
    const firstName = nameForm.firstName.trim();
    const lastName = nameForm.lastName.trim();

    if (!firstName || !lastName) {
      showMessage('name', 'First name and last name are required.', 'error');
      return;
    }

    try {
      setSaving((prev) => ({ ...prev, name: true }));
      clearMessage('name');

      const payload = {
        firstName,
        middleName: nameForm.middleName.trim(),
        lastName,
        extensionName: nameForm.extensionName.trim(),
      };

      const { data } = await axios.put(`${API_BASE}/auth/update-profile`, payload, { headers: authHeaders });
      refreshUserCache(data?.user || payload);
      setNameForm(payload);
      showMessage('name', 'Name updated successfully.');
    } catch (error) {
      showMessage('name', error.response?.data?.message || 'Unable to update name.', 'error');
    } finally {
      setSaving((prev) => ({ ...prev, name: false }));
    }
  };

  const handlePositionSave = async () => {
    const position = positionForm.position.trim();

    if (!position) {
      showMessage('position', 'Position is required.', 'error');
      return;
    }

    try {
      setSaving((prev) => ({ ...prev, position: true }));
      clearMessage('position');

      const formData = new FormData();
      formData.append('position', position);

      const { data } = await axios.put(`${API_BASE}/auth/update-company-profile`, formData, {
        headers: { ...authHeaders, 'Content-Type': 'multipart/form-data' },
      });

      refreshUserCache(data?.user);
      showMessage('position', 'Position updated successfully.');
    } catch (error) {
      showMessage('position', error.response?.data?.message || 'Unable to update position.', 'error');
    } finally {
      setSaving((prev) => ({ ...prev, position: false }));
    }
  };

  const handleEmailRequest = async () => {
    if (!emailForm.currentPassword.trim() || !emailForm.newEmail.trim()) {
      showMessage('email', 'Current password and new email address are required.', 'error');
      return;
    }

    try {
      setSaving((prev) => ({ ...prev, email: true }));
      clearMessage('email');

      const { data } = await axios.post(
        `${API_BASE}/auth/settings/request-email-verification`,
        { currentPassword: emailForm.currentPassword, newEmail: emailForm.newEmail },
        { headers: authHeaders }
      );

      setEmailForm((prev) => ({ ...prev, pendingEmail: data?.pendingEmail || prev.newEmail }));
      showMessage('email', data?.message || 'Verification code sent to your new email address.');
    } catch (error) {
      showMessage('email', error.response?.data?.message || 'Unable to send email verification code.', 'error');
    } finally {
      setSaving((prev) => ({ ...prev, email: false }));
    }
  };

  const handleEmailVerify = async () => {
    if (!emailForm.verificationCode.trim()) {
      showMessage('email', 'Email verification code is required.', 'error');
      return;
    }

    try {
      setSaving((prev) => ({ ...prev, email: true }));
      clearMessage('email');

      const { data } = await axios.post(
        `${API_BASE}/auth/settings/verify-email`,
        { code: emailForm.verificationCode },
        { headers: authHeaders }
      );

      const nextEmail = data?.user?.email || emailForm.pendingEmail || emailForm.newEmail;
      setEmailForm({ currentEmail: nextEmail, currentPassword: '', newEmail: '', verificationCode: '', pendingEmail: '' });
      refreshUserCache(data?.user);
      showMessage('email', data?.message || 'Email verified successfully.');
    } catch (error) {
      showMessage('email', error.response?.data?.message || 'Unable to verify email code.', 'error');
    } finally {
      setSaving((prev) => ({ ...prev, email: false }));
    }
  };

  const handlePhoneRequest = async () => {
    const targetNumber = phoneForm.newMobileNumber.trim() || phoneForm.mobileNumber.trim();
    if (!/^09\d{9}$/.test(targetNumber)) {
      showMessage('phone', 'Please enter a valid 11-digit Philippine mobile number starting with 09.', 'error');
      return;
    }

    try {
      setSaving((prev) => ({ ...prev, phone: true }));
      clearMessage('phone');

      const { data } = await axios.post(
        `${API_BASE}/auth/settings/request-phone-verification`,
        { phoneNumber: targetNumber },
        { headers: authHeaders }
      );

      setPhoneForm((prev) => ({ ...prev, pendingPhoneNumber: data?.pendingPhoneNumber || targetNumber }));
      showMessage('phone', data?.message || 'Verification code sent to your mobile number.');
    } catch (error) {
      showMessage('phone', error.response?.data?.message || 'Unable to send mobile verification code.', 'error');
    } finally {
      setSaving((prev) => ({ ...prev, phone: false }));
    }
  };

  const handlePhoneVerify = async () => {
    if (!phoneForm.verificationCode.trim()) {
      showMessage('phone', 'Mobile verification code is required.', 'error');
      return;
    }

    try {
      setSaving((prev) => ({ ...prev, phone: true }));
      clearMessage('phone');

      const { data } = await axios.post(
        `${API_BASE}/auth/settings/verify-phone`,
        { code: phoneForm.verificationCode },
        { headers: authHeaders }
      );

      const nextMobile = data?.user?.employerProfile?.mobileNumber || phoneForm.pendingPhoneNumber || phoneForm.newMobileNumber;
      setPhoneForm({ mobileNumber: nextMobile, newMobileNumber: '', verificationCode: '', pendingPhoneNumber: '' });
      refreshUserCache(data?.user);
      showMessage('phone', data?.message || 'Mobile number verified successfully.');
    } catch (error) {
      showMessage('phone', error.response?.data?.message || 'Unable to verify mobile code.', 'error');
    } finally {
      setSaving((prev) => ({ ...prev, phone: false }));
    }
  };

  const handlePhoneResend = async () => {
    try {
      setSaving((prev) => ({ ...prev, phone: true }));
      clearMessage('phone');
      const { data } = await axios.post(`${API_BASE}/auth/settings/resend-phone-verification`, {}, { headers: authHeaders });
      showMessage('phone', data?.message || 'Mobile verification code sent.');
    } catch (error) {
      showMessage('phone', error.response?.data?.message || 'Unable to resend mobile verification code.', 'error');
    } finally {
      setSaving((prev) => ({ ...prev, phone: false }));
    }
  };

  const handlePasswordSubmit = async () => {
    if (!passwordForm.oldPassword || !passwordForm.newPassword || !passwordForm.retypeNewPassword) {
      showMessage('password', 'Please complete all password fields.', 'error');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.retypeNewPassword) {
      showMessage('password', 'New password and retype new password do not match.', 'error');
      return;
    }

    const isStrongPassword =
      passwordForm.newPassword.length >= 8 &&
      /[A-Z]/.test(passwordForm.newPassword) &&
      /[a-z]/.test(passwordForm.newPassword) &&
      /\d/.test(passwordForm.newPassword) &&
      /[^A-Za-z0-9]/.test(passwordForm.newPassword);

    if (!isStrongPassword) {
      showMessage(
        'password',
        'New password must be at least 8 characters and include uppercase, lowercase, number, and special character.',
        'error'
      );
      return;
    }

    if (passwordForm.newPassword === passwordForm.oldPassword) {
      showMessage('password', 'New password must be different from your current password.', 'error');
      return;
    }

    try {
      setSaving((prev) => ({ ...prev, password: true }));
      clearMessage('password');

      const { data } = await axios.put(
        `${API_BASE}/auth/change-password`,
        { currentPassword: passwordForm.oldPassword, newPassword: passwordForm.newPassword },
        { headers: authHeaders }
      );

      refreshUserCache(data?.user);
      setPasswordForm({ oldPassword: '', newPassword: '', retypeNewPassword: '' });
      showMessage('password', data?.message || 'Password changed successfully.');
    } catch (error) {
      showMessage('password', error.response?.data?.message || 'Unable to change password.', 'error');
    } finally {
      setSaving((prev) => ({ ...prev, password: false }));
    }
  };

  return (
    <EmployerLayout>
      <div className="mx-auto max-w-7xl px-1 py-8">
      
          <button
            type="button"
            onClick={() => navigate(-1)}
            className={cx(
              'mb-5 inline-flex h-11 items-center justify-center rounded-xl border border-[#d8e2ee] bg-white px-5 text-sm font-semibold text-black/70 transition hover:border-[#2e66a6] hover:text-[#2e66a6]',
              focusRing
            )}
          >
            ← Back
          </button>

          <div className="mb-6">
            <h1 className="text-3xl font-bold tracking-tight text-black sm:text-4xl">Settings</h1>
            <p className="mt-2 text-sm text-black/60 sm:text-base">
              Manage your account settings, contact details, and security.
            </p>
          </div>

          {loadingPage ? (
            <div className="rounded-2xl border border-[#e6edf5] bg-[#f7faff] p-5 text-sm text-black/60 shadow-sm">
              Loading settings...
            </div>
          ) : (
            <div className="space-y-5">
              <Message type={messageType.general}>{messages.general}</Message>

              <Section
                title="Change Name"
                description="Keep your employer account identity accurate."
                actionText="Save"
                onAction={handleNameSave}
                loading={saving.name}
              >
                <Message type={messageType.name}>{messages.name}</Message>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <TextInput
                    label="First Name"
                    placeholder="e.g. Juan"
                    value={nameForm.firstName}
                    onChange={(e) => setNameForm((prev) => ({ ...prev, firstName: e.target.value }))}
                  />
                  <TextInput
                    label="Last Name"
                    placeholder="e.g. De La Cruz"
                    value={nameForm.lastName}
                    onChange={(e) => setNameForm((prev) => ({ ...prev, lastName: e.target.value }))}
                  />
                  <TextInput
                    label="Middle Name (Optional)"
                    placeholder="e.g. Santos"
                    value={nameForm.middleName}
                    onChange={(e) => setNameForm((prev) => ({ ...prev, middleName: e.target.value }))}
                  />
                  <SelectInput
                    label="Suffix (Optional)"
                    value={nameForm.extensionName}
                    onChange={(e) => setNameForm((prev) => ({ ...prev, extensionName: e.target.value }))}
                  >
                    {suffixOptions.map((suffix) => (
                      <option key={suffix || 'none'} value={suffix}>
                        {suffix || 'None'}
                      </option>
                    ))}
                  </SelectInput>
                </div>
              </Section>

              <Section
                title="Position"
                description="Update your role or job title inside the company."
                actionText="Save"
                onAction={handlePositionSave}
                loading={saving.position}
              >
                <Message type={messageType.position}>{messages.position}</Message>
                <div className="max-w-xl">
                  <TextInput
                    label="Role"
                    placeholder="e.g. HR Manager"
                    value={positionForm.position}
                    onChange={(e) => setPositionForm({ position: e.target.value })}
                  />
                </div>
              </Section>

              <Section
                title="Email"
                description="Change your login email with password confirmation and verification."
                actionText="Save"
                onAction={handleEmailRequest}
                loading={saving.email}
              >
                <Message type={messageType.email}>{messages.email}</Message>
                <div className="space-y-5 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-black/70">Current Email Address:</span>
                    <span className="font-medium text-black">{emailForm.currentEmail || 'No email found'}</span>
                  </div>

                  <p className="text-xs text-black/50">To change your email, please complete the following fields.</p>

                  <div className="grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-[180px_1fr] sm:items-center">
                    <label className="text-sm text-black/70">Current Password:</label>
                    <TextInput
                      label=""
                      type="password"
                      value={emailForm.currentPassword}
                      onChange={(e) => setEmailForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                    />

                    <label className="text-sm text-black/70">New Email Address:</label>
                    <TextInput
                      label=""
                      type="email"
                      value={emailForm.newEmail}
                      onChange={(e) => setEmailForm((prev) => ({ ...prev, newEmail: e.target.value }))}
                    />
                  </div>

                  {emailForm.pendingEmail ? (
                    <div className="rounded-2xl border border-[#d8e2ee] bg-[#f7faff] p-4">
                      <TextInput
                        label={`Verification Code sent to ${emailForm.pendingEmail}`}
                        value={emailForm.verificationCode}
                        onChange={(e) => setEmailForm((prev) => ({ ...prev, verificationCode: e.target.value }))}
                      />
                      <div className="mt-4 flex justify-end">
                        <button
                          type="button"
                          onClick={handleEmailVerify}
                          disabled={saving.email}
                          className={cx(
                            'inline-flex h-11 items-center justify-center rounded-xl bg-[#2e66a6] px-5 text-sm font-bold text-white transition hover:bg-[#25578f] disabled:opacity-60',
                            focusRing
                          )}
                        >
                          Verify Email Code
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </Section>

              <Section
                title="Mobile Number"
                description="Verify the contact number used for notifications and recruitment updates."
                actionText="Verify"
                onAction={handlePhoneRequest}
                loading={saving.phone}
              >
                <Message type={messageType.phone}>{messages.phone}</Message>
                <div className="space-y-5 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-black/70">Current Mobile Number:</span>
                    <strong className="font-medium text-black">{phoneForm.mobileNumber || 'No mobile number'}</strong>
                    <InlineActionButton onClick={() => setPhoneForm((prev) => ({ ...prev, newMobileNumber: prev.mobileNumber }))}>
                      change
                    </InlineActionButton>
                  </div>

                  <div className="max-w-xl">
                    <TextInput
                      label="New Mobile Number"
                      placeholder="e.g. 09000000000"
                      value={phoneForm.newMobileNumber}
                      onChange={(e) => setPhoneForm((prev) => ({ ...prev, newMobileNumber: e.target.value }))}
                    />
                  </div>

                  <p className="text-xs font-semibold text-black/65">
                    Enter the code we sent to you via SMS to verify your mobile number.
                  </p>

                  <div className="max-w-xl">
                    <TextInput
                      label="Verification Code"
                      value={phoneForm.verificationCode}
                      onChange={(e) => setPhoneForm((prev) => ({ ...prev, verificationCode: e.target.value }))}
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <InlineActionButton onClick={handlePhoneVerify}>Verify code</InlineActionButton>
                    <InlineActionButton onClick={handlePhoneResend}>Didn't get code? Send code again</InlineActionButton>
                  </div>
                </div>
              </Section>

              <Section
                title="Password"
                description="Protect your account by updating your password regularly."
                actionText="Submit"
                onAction={handlePasswordSubmit}
                loading={saving.password}
              >
                <Message type={messageType.password}>{messages.password}</Message>
                <div className="space-y-5 text-sm">
                  <p className="text-xs text-black/50">To change your password, please complete the following fields.</p>

                  <div className="grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-[180px_1fr] sm:items-center">
                    <label className="text-sm text-black/70">Old Password:</label>
                    <TextInput
                      label=""
                      type="password"
                      value={passwordForm.oldPassword}
                      onChange={(e) => setPasswordForm((prev) => ({ ...prev, oldPassword: e.target.value }))}
                    />

                    <label className="text-sm text-black/70">New Password:</label>
                    <div>
                      <TextInput
                        label=""
                        type="password"
                        value={passwordForm.newPassword}
                        onChange={(e) => {
                          setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }));
                          if (messages.password) clearMessage('password');
                        }}
                        aria-describedby="new-password-requirements"
                      />

                      {passwordForm.newPassword ? (
                        <div
                          id="new-password-requirements"
                          className="mt-3 rounded-xl border border-[#d8e2ee] bg-[#f7faff] p-4"
                          aria-live="polite"
                        >
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <span className="text-xs font-semibold text-black/65">Password strength</span>
                            <span className={cx('text-xs font-bold', passwordStrength.color)}>{passwordStrength.label}</span>
                          </div>

                          <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-[#d8e2ee]">
                            <div className={cx('h-full rounded-full transition-all duration-300', passwordStrength.bar, passwordStrength.width)} />
                          </div>

                          <div className="grid gap-2 sm:grid-cols-2">
                            {passwordRequirements.map((requirement) => (
                              <div
                                key={requirement.label}
                                className={cx(
                                  'flex items-center gap-2 text-xs',
                                  requirement.met ? 'font-semibold text-green-700' : 'text-black/55'
                                )}
                              >
                                <span
                                  className={cx(
                                    'inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold',
                                    requirement.met
                                      ? 'border-green-600 bg-green-600 text-white'
                                      : 'border-[#b9c7d8] bg-white text-transparent'
                                  )}
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

                    <label className="text-sm text-black/70">Retype New Password:</label>
                    <TextInput
                      label=""
                      type="password"
                      value={passwordForm.retypeNewPassword}
                      onChange={(e) => setPasswordForm((prev) => ({ ...prev, retypeNewPassword: e.target.value }))}
                    />
                  </div>
                </div>
              </Section>
            </div>
          )}
        </div>
      
    </EmployerLayout>
  );
};

export default Settings;
