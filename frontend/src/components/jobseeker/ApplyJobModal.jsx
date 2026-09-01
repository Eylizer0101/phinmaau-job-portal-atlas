import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const COLORS = {
  primary: '#2e66a6',
  primaryHover: '#25578f',
  primaryActive: '#1f4b7c',
  border: '#d8e2ee',
  borderSoft: '#e6edf5',
  text: '#000000',
  subtext: '#4b5563',
  muted: '#8a95a3',
  bg: '#ffffff',
  panel: '#f7faff',
  panelStrong: '#eaf2fb',
  dangerBg: '#fff7f7',
  dangerBorder: '#fecaca',
  dangerText: '#dc2626',
};

const formatLocation = (value) => {
  const v = String(value || '').trim();
  return v || 'Not provided';
};

const formatDisplayDate = (value) => {
  if (!value) return 'Not provided';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const getFullName = (user) => {
  return [
    user?.firstName,
    user?.middleName,
    user?.lastName,
    user?.extensionName,
  ]
    .map((x) => String(x || '').trim())
    .filter(Boolean)
    .join(' ');
};

const getProfileImageFallback = (name) => {
  return (name || 'U').charAt(0).toUpperCase();
};

const getCourseText = (profile) => {
  return profile?.course || 'Course not set yet';
};

const getClassText = (profile) => {
  return profile?.yearGraduated ? `CLASS OF ${profile.yearGraduated}` : 'YEAR NOT SET';
};

const getEducationEntries = (profile) => {
  return Array.isArray(profile?.educationEntries) ? profile.educationEntries : [];
};

const getWorkExperiences = (profile) => {
  return Array.isArray(profile?.workExperiences) ? profile.workExperiences : [];
};

const getEducationYearText = (entry) => {
  const start = String(entry?.startYear || '').trim();
  const end = String(entry?.endYear || entry?.yearGraduated || '').trim();

  if (start && end) return `${start} - ${end}`;
  if (end) return end;
  if (start) return start;
  return 'Year not specified';
};

const getWorkDateRange = (item) => {
  const start = item?.startDate
    ? new Date(item.startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : '';
  const end = item?.isPresent
    ? 'Present'
    : item?.endDate
    ? new Date(item.endDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : '';

  if (start && end) return `${start} — ${end}`;
  if (start) return start;
  if (end) return end;
  return 'Date not specified';
};

const getUploadedResume = (profile) => {
  return (
    profile?.verificationDocs?.cv?.url ||
    profile?.verificationDocs?.cv ||
    profile?.resume ||
    profile?.resumeFile ||
    profile?.resumeUrl ||
    profile?.cv ||
    profile?.cvFile ||
    profile?.cvUrl ||
    profile?.credentials?.resume ||
    profile?.credentials?.resumeFile ||
    profile?.credentials?.resumeUrl ||
    profile?.credentials?.cv ||
    profile?.credentials?.cvFile ||
    profile?.credentials?.cvUrl ||
    null
  );
};

const IconCheckCircle = ({ className = 'w-7 h-7' }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
    <path d="M8.6 12.2l2.3 2.4 4.7-5.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconClose = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
  </svg>
);

const IconInfo = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.12" />
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
    <path d="M12 10.2v5.1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    <circle cx="12" cy="7.3" r="1" fill="currentColor" />
  </svg>
);

const IconLock = ({ className = 'w-7 h-7' }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <rect x="5" y="10" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" />
    <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <circle cx="12" cy="15" r="1.2" fill="currentColor" />
  </svg>
);

const IconBuilding = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path d="M4 20V6.8A.8.8 0 0 1 4.8 6H12v14M12 20h8V10.8a.8.8 0 0 0-.8-.8H12" stroke="currentColor" strokeWidth="1.6" />
    <path d="M7 9h2M7 12h2M7 15h2M15 13h2M15 16h2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const IconLocation = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path d="M12 21s6-4.8 6-10a6 6 0 1 0-12 0c0 5.2 6 10 6 10Z" stroke="currentColor" strokeWidth="1.6" />
    <circle cx="12" cy="11" r="2.1" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);

const IconEmail = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <rect x="4" y="6" width="16" height="12" rx="1.8" stroke="currentColor" strokeWidth="1.6" />
    <path d="M5 8l7 5 7-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconPhone = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path d="M8.2 5.5l2 2.8c.3.4.3.9 0 1.3l-1.2 1.4a12.7 12.7 0 0 0 4 4l1.4-1.2c.4-.3.9-.3 1.3 0l2.8 2c.5.4.6 1.1.2 1.6-.7.9-1.8 1.4-2.9 1.3-2.5-.2-5.3-1.8-7.9-4.5-2.7-2.6-4.3-5.4-4.5-7.9-.1-1.1.4-2.2 1.3-2.9.5-.4 1.2-.3 1.6.2Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
  </svg>
);

const IconPencil = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path d="M4 20l3.8-1 9.3-9.3a1.8 1.8 0 0 0 0-2.6l-.2-.2a1.8 1.8 0 0 0-2.6 0L5 16.2 4 20Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M13 8l3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const PreviewField = ({ label, value }) => {
  const displayValue = value && String(value).trim() ? value : 'Not provided';

  return (
    <div className="py-1">
      <div className="text-[9px] sm:text-[10px] tracking-[0.18em] uppercase font-bold text-black/40 mb-1">
        {label}
      </div>
      <div
        className={`text-[14px] sm:text-[15px] font-semibold leading-6 ${
          displayValue === 'Not provided' ? 'text-black/40' : 'text-black/80'
        }`}
      >
        {displayValue}
      </div>
    </div>
  );
};

const ApplyJobModal = ({ isOpen, onClose, job, onApplicationSubmitted, initialStep = 1 }) => {
  const navigate = useNavigate();
  const modalRef = useRef(null);
  const closeButtonRef = useRef(null);

  const [step, setStep] = useState(1);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  const [userData, setUserData] = useState(null);

  const profile = userData?.jobSeekerProfile || {};
  const workExperiences = useMemo(() => getWorkExperiences(profile), [profile]);
  const educationEntries = useMemo(() => getEducationEntries(profile), [profile]);

  useEffect(() => {
    if (!isOpen) return;

    const safeInitialStep = Number(initialStep) === 3 ? 3 : 1;

    setStep(safeInitialStep);
    setSubmitError('');
    setPrivacyAccepted(false);
    setProfileError('');
    fetchProfile();

    const t = setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 0);

    return () => {
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, job?._id, job?.id, initialStep]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeAndReset();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const fetchProfile = async () => {
    try {
      setProfileLoading(true);
      setProfileError('');

      const response = await api.get('/auth/me');

      if (response.data?.success) {
        setUserData(response.data.user || null);
      } else {
        setProfileError('Failed to load your profile.');
      }
    } catch (error) {
      setProfileError(error.response?.data?.message || 'Failed to load your profile.');
    } finally {
      setProfileLoading(false);
    }
  };

  const closeAndReset = () => {
    setStep(1);
    setSubmitError('');
    setPrivacyAccepted(false);
    setProfileError('');
    onClose?.();
  };

  const handleGoToProfile = () => {
    const pendingApplyFlow = {
      fromApplyFlow: true,
      applyJob: {
        _id: job?._id || job?.id || '',
        id: job?._id || job?.id || '',
        title: job?.title || '',
        companyName: job?.companyName || '',
        location: job?.location || '',
      },
      returnTo: '/jobseeker/job-details/' + (job?._id || job?.id || ''),
    };

    try {
      sessionStorage.setItem('pendingApplyFlow', JSON.stringify(pendingApplyFlow));
    } catch {}

    closeAndReset();
    navigate('/jobseeker/my-profile', {
      state: pendingApplyFlow,
    });
  };

  const handleContinueToPrivacy = () => {
    setSubmitError('');
    setStep(3);
  };

  const handleSubmit = async () => {
    const jobId = job?._id || job?.id;

    if (!privacyAccepted) {
      setSubmitError('Please confirm that you understand the Privacy Notice.');
      return;
    }

    if (!jobId) {
      setSubmitError('Job information is missing.');
      return;
    }

    const uploadedResume = getUploadedResume(profile);

    if (!uploadedResume) {
      setSubmitError('Please upload your CV/Resume in your Profile Credentials first.');
      return;
    }

    try {
      setSubmitLoading(true);
      setSubmitError('');

      const response = await api.post(`/applications/apply/${jobId}`, {
        jobId,
        jobTitle: job.title || '',
        companyName: job.companyName || '',
        location: job.location || '',
        useProfileResume: true,
      });

      if (response.data?.success) {
        setStep(4);
        onApplicationSubmitted?.(response.data);
      } else {
        setSubmitError(response.data?.message || 'Failed to submit application.');
      }
    } catch (error) {
      setSubmitError(error.response?.data?.message || 'Failed to submit application.');
    } finally {
      setSubmitLoading(false);
    }
  };

  if (!isOpen || !job) return null;

  const renderHeader = (titleSize = 'large') => (
    <div className="max-w-[620px] mx-auto">
      <div className="text-[10px] tracking-[0.22em] uppercase font-bold text-black/45">
        Applying for
      </div>

      <div className="mt-4">
        <h2
          id="apply-job-modal-title"
          className={`font-bold text-black leading-tight ${
            titleSize === 'small'
              ? 'text-[28px] sm:text-[34px]'
              : 'text-[30px] sm:text-[40px]'
          }`}
        >
          {job.title || 'Job Title'}
        </h2>

        <div
          id="apply-job-modal-description"
          className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[14px] text-black/55"
        >
          <div className="inline-flex items-center gap-2">
            <IconBuilding className="w-4 h-4 text-[#2e66a6]" />
            <span>{job.companyName || 'Company'}</span>
          </div>

          <span className="hidden sm:inline text-black/25">•</span>

          <div className="inline-flex items-center gap-2">
            <IconLocation className="w-4 h-4 text-[#2e66a6]" />
            <span>{formatLocation(job.location)}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 h-px bg-[#e6edf5]" />
    </div>
  );

  return (
    <div className="fixed inset-0 z-[90]">
      <div
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        onClick={closeAndReset}
        aria-hidden="true"
      />

      <div className="absolute inset-0 flex items-center justify-center px-3 sm:px-4 py-4">
        <div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="apply-job-modal-title"
          aria-describedby="apply-job-modal-description"
          className={`relative w-full overflow-hidden rounded-[32px] border border-[#e6edf5] bg-white shadow-[0_24px_70px_rgba(46,102,166,0.18)] ${
            step === 4 ? 'max-w-[640px]' : 'max-w-[760px]'
          }`}
        >
          <button
            ref={closeButtonRef}
            type="button"
            onClick={closeAndReset}
            className="absolute top-5 right-5 z-20 h-10 w-10 rounded-full flex items-center justify-center text-black/55 hover:text-black hover:bg-[#f7faff] transition"
            aria-label="Close"
          >
            <IconClose className="w-5 h-5" />
          </button>

          <div className={`${step === 4 ? '' : 'max-h-[90vh] overflow-y-auto'}`}>
            <div className={`${step === 4 ? 'px-8 sm:px-10 py-14 sm:py-16' : 'px-6 sm:px-10 pt-8 sm:pt-10 pb-8'}`}>
              {profileLoading ? (
                <div className="min-h-[420px] flex items-center justify-center">
                  <div className="text-center">
                    <div className="mx-auto h-10 w-10 rounded-full border-4 border-[#d8e2ee] border-t-[#2e66a6] animate-spin" />
                    <p className="mt-4 text-sm text-black/55">Loading your profile...</p>
                  </div>
                </div>
              ) : profileError ? (
                <div className="min-h-[420px] flex items-center justify-center">
                  <div className="w-full max-w-md rounded-2xl border border-red-200 bg-[#fff7f7] px-6 py-6 text-center shadow-sm">
                    <div className="text-red-600 text-lg font-bold">Unable to load profile</div>
                    <p className="mt-2 text-sm text-red-600">{profileError}</p>
                    <button
                      type="button"
                      onClick={fetchProfile}
                      className="mt-5 h-11 px-5 rounded-xl text-white font-semibold shadow-[0_10px_22px_rgba(46,102,166,0.18)] hover:opacity-95 transition"
                      style={{ backgroundColor: COLORS.primary }}
                    >
                      Retry
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {step === 1 && (
                    <div className="max-w-[620px] mx-auto">
                      <div className="mt-2">
                        <h3 className="font-bold text-black leading-tight">
                          <span className="inline-flex w-full items-center gap-1 sm:gap-2 whitespace-nowrap">
                            <span className="shrink-0 text-[#2e66a6]">
                              <IconInfo className="w-5 h-5 sm:w-6 sm:h-6" />
                            </span>
                            <span style={{ fontSize: 'clamp(13px, 4.2vw, 24px)' }}>
                              Reminder: Update Your Job seeker Profile!
                            </span>
                          </span>
                        </h3>

                        <p className="mt-5 text-[16px] sm:text-[17px] text-black/65 leading-8 max-w-[600px]">
                          Before you proceed, ensure your profile reflects your current qualifications.
                          <br />
                          A complete profile helps employers learn more about your skills, qualifications,
                          and experience. Update your information to increase your chances of getting hired.{' '}
                          <button
                            type="button"
                            onClick={handleGoToProfile}
                            className="inline-flex items-center gap-1 whitespace-nowrap text-[14px] font-semibold text-[#2e66a6] underline underline-offset-4 transition hover:text-[#25578f]"
                          >
                            Take me there! →
                          </button>
                        </p>
                      </div>

                      <div className="mt-8">
                        {renderHeader('small')}
                      </div>

                      <div className="mt-8">
                        <button
                          type="button"
                          onClick={handleContinueToPrivacy}
                          className="w-full h-[58px] rounded-[16px] text-white text-[18px] font-bold shadow-[0_14px_30px_rgba(46,102,166,0.24)] hover:bg-[#25578f] active:bg-[#1f4b7c] active:scale-[0.99] transition"
                          style={{ backgroundColor: COLORS.primary }}
                        >
                          Continue to Apply
                        </button>
                      </div>
                    </div>
                  )}

                  {step === 3 && (
                    <div className="max-w-[620px] mx-auto py-4 sm:py-6">
                      <div>
                        <div className="mx-auto w-14 h-14 rounded-full bg-[#eaf2fb] flex items-center justify-center text-[#2e66a6]">
                          <IconLock className="w-7 h-7" />
                        </div>

                        <h3 className="mt-4 text-center text-[25px] sm:text-[30px] font-bold tracking-[0.04em] text-black leading-tight">
                          PRIVACY NOTICE
                        </h3>

                        <div className="mt-5 rounded-[18px] border border-[#d8e2ee] bg-[#f7faff] px-5 sm:px-6 py-5 text-black/70 leading-[1.7] text-[13px] sm:text-[14px] text-left shadow-sm">
                          <p className="font-bold text-black/80">
                            After updating your profile and applying to this job, your personal information
                            will be collected and processed for recruitment and hiring purposes.
                          </p>

                          <p className="mt-3">
                            The Personal Information you provide, including your name, contact details,
                            educational background, work experience, will be used to evaluate your
                            qualifications, match you with job requirements, and allow employers to review
                            and contact you regarding your application.
                          </p>

                          <p className="mt-3">
                            All information will be handled securely and kept confidential.{' '}
                            <strong className="text-black/80">
                              By clicking “Submit Application”, you confirm your information is accurate and
                              you consent to its use for recruitment purposes.
                            </strong>
                          </p>
                        </div>

                        <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-[#d8e2ee] bg-white px-4 py-3 text-[13px] text-black/70">
                          <input
                            type="checkbox"
                            checked={privacyAccepted}
                            onChange={(event) => {
                              setPrivacyAccepted(event.target.checked);
                              if (event.target.checked) setSubmitError('');
                            }}
                            className="mt-0.5 h-4 w-4 accent-[#2e66a6]"
                          />
                          <span>I have read and understand the Privacy Notice.</span>
                        </label>

                        {submitError && (
                          <div className="mt-4 rounded-xl border border-red-200 bg-[#fff7f7] px-4 py-3 text-sm font-medium text-red-600 text-left">
                            {submitError}
                          </div>
                        )}

                        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              setSubmitError('');
                              setPrivacyAccepted(false);
                              setStep(1);
                            }}
                            disabled={submitLoading}
                            className="h-[46px] rounded-xl border border-[#d8e2ee] bg-white px-6 text-[15px] font-bold text-black/70 hover:bg-gray-50 transition disabled:opacity-70"
                          >
                            Back
                          </button>
                          <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={submitLoading || !privacyAccepted}
                            className="w-full sm:w-[240px] h-[46px] rounded-xl border border-[#2e66a6] bg-[#2e66a6] text-white text-[15px] font-bold shadow-[0_10px_22px_rgba(46,102,166,0.18)] hover:bg-[#25578f] active:bg-[#1f4b7c] transition disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {submitLoading ? 'Submitting...' : 'Submit Application'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {step === 4 && (
                    <div className="text-center">
                      <div className="mx-auto w-16 h-16 rounded-full border-2 border-[#2e66a6] text-[#2e66a6] flex items-center justify-center">
                        <IconCheckCircle className="w-8 h-8" />
                      </div>

                      <h3 className="mt-8 text-[32px] sm:text-[38px] font-medium text-black leading-tight">
                        Application Submitted
                      </h3>

                      <div className="mt-8 text-[17px] text-black/55 leading-8 max-w-[500px] mx-auto">
                        The team at <span className="font-semibold text-black/75">{job.companyName || 'the company'}</span> has received your application for the{' '}
                        <span className="font-semibold text-black/75">{job.title || 'selected role'}</span> position.
                      </div>

                      <p className="mt-8 text-[15px] text-black/45 leading-7 max-w-[560px] mx-auto text-center">
                        The employer will contact you if your qualifications align with
                        <br className="hidden sm:block" />
                        their hiring needs. In the meantime, your application is on file
                        <br className="hidden sm:block" />
                        and awaiting review.
                      </p>

                      <div className="mt-10 h-px bg-[#e6edf5] max-w-[320px] mx-auto" />

                      <div className="mt-8 max-w-[300px] mx-auto">
                        <button
                          type="button"
                          onClick={() => {
                            closeAndReset();
                            navigate('/jobseeker/job-search');
                          }}
                          className="w-full h-[48px] rounded-xl text-white text-[15px] font-bold shadow-[0_10px_22px_rgba(46,102,166,0.18)] hover:opacity-95 transition"
                          style={{ backgroundColor: COLORS.primary }}
                        >
                          Browse More Opportunities
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApplyJobModal;
