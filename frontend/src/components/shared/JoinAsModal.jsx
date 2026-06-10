// src/components/shared/JoinAsModal.jsx
import React, { useMemo, useRef, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

const BLUE = {
  primary: "#1e4ba0",
  hover: "#1b4290",
  active: "#163879",
  ring: "#1e4ba0",
};

const JoinAsModal = () => {
  const navigate = useNavigate();

  const topButtonRef = useRef(null);

  // steps: "role" -> "privacy"
  const [step, setStep] = useState("role");

  // roles: "jobseeker" | "employer"
  const [role, setRole] = useState("");

  // privacy checkbox
  const [agreePrivacy, setAgreePrivacy] = useState(false);

  const routes = useMemo(
    () => ({
      jobseeker: "/register",
      employer: "/employer/register",
    }),
    []
  );

  const privacyNoticeText = useMemo(() => {
    if (role === "jobseeker") {
      return `AGAPAY prioritize the protection of your personal information. The details you provide, such as your basic information, career profile, and uploaded documents, will be used to create your account, verify your qualifications, and connect you with possible employers.
Your information also helps us match you with suitable job opportunities and keep you updated with important announcements. All data is securely stored and can only be accessed by authorized AGAPAY personnel. We will not share your personal information with others without your permission.
By registering on AGAPAY, you agree that your information will be handled carefully and used only for the purposes stated above.`;
    }

    if (role === "employer") {
      return `AGAPAY is committed to protecting your company’s information. The data you provide during registration—including company details, contact information, and verification documents—will be used to verify your organization, create a secure company account, and connect your company with qualified graduates.
This information also allows your company to post job opportunities and communicate with potential candidates. All company data is securely stored and accessible only to authorized AGAPAY personnel, and will not be shared with third parties without your consent.
By registering your organization on AGAPAY, you agree to the secure and responsible handling of your company information in accordance with this Privacy Notice.`;
    }

    return "";
  }, [role]);

  useEffect(() => {
    setStep("role");
    setRole("");
    setAgreePrivacy(false);
    setTimeout(() => topButtonRef.current?.focus?.(), 0);
  }, []);

  const proceedFromRole = () => {
    if (!role) return;
    setAgreePrivacy(false);
    setStep("privacy");
    setTimeout(() => topButtonRef.current?.focus?.(), 0);
  };

  const proceedFromPrivacy = () => {
    if (!role || !agreePrivacy) return;
    navigate(routes[role]);
  };

  // ---------- ROLE PAGE ----------
  const RolePage = () => {
    const disabled = !role;

    return (
      <div
        className="w-full bg-white shadow-lg border border-gray-200 sm:-mt-16"
        style={{
          maxWidth: "520px",
          borderRadius: "18px",
        }}
      >
        {/* header */}
        <div className="flex items-center justify-between px-6 pt-5">
          <button
            ref={topButtonRef}
            type="button"
            onClick={() => navigate("/")}
            className="h-10 w-10 rounded-full border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center
                       focus:outline-none focus:ring-2 focus:ring-offset-2"
            style={{ "--tw-ring-color": BLUE.ring }}
            aria-label="Back"
            title="Back"
          >
            <svg className="h-5 w-5 text-gray-700" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          <div className="w-10" aria-hidden="true" />
        </div>

        {/* body */}
        <div className="px-7 pb-7">
          <div className="mt-2 flex justify-center">
            <img
              src="/images/createacc.png"
              alt="Create account"
              className="h-[200px] w-auto object-contain select-none pointer-events-none"
              draggable="false"
            />
          </div>

          <h2 className="mt-3 text-center text-xl font-semibold text-gray-900">Create Account As</h2>

          <div className="mt-4">
            <div className="relative">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 shadow-sm
                 focus:outline-none focus:ring-2 focus:ring-offset-2"
                style={{ "--tw-ring-color": BLUE.ring }}
                aria-label="Choose role"
              >
                <option value="">Choose Role</option>
                <option value="jobseeker">Jobseeker</option>
                <option value="employer">Employer</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={proceedFromRole}
            disabled={disabled}
            className="mt-4 w-full h-11 rounded-xl text-sm font-semibold text-white transition
                       focus:outline-none focus:ring-2 focus:ring-offset-2"
            style={{
              backgroundColor: disabled ? "#93a6c9" : BLUE.primary,
              cursor: disabled ? "not-allowed" : "pointer",
              "--tw-ring-color": BLUE.ring,
            }}
            onMouseEnter={(e) => {
              if (!disabled) e.currentTarget.style.backgroundColor = BLUE.hover;
            }}
            onMouseLeave={(e) => {
              if (!disabled) e.currentTarget.style.backgroundColor = BLUE.primary;
            }}
            onMouseDown={(e) => {
              if (!disabled) e.currentTarget.style.backgroundColor = BLUE.active;
            }}
            onMouseUp={(e) => {
              if (!disabled) e.currentTarget.style.backgroundColor = BLUE.hover;
            }}
          >
            Proceed
          </button>

          <p className="mt-4 text-center text-sm text-gray-700">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold" style={{ color: BLUE.primary }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    );
  };

  // ---------- PRIVACY PAGE ----------
  const PrivacyPage = () => {
    const disabled = !agreePrivacy;

    return (
      <div
        className="relative w-full overflow-hidden border border-gray-200 bg-white shadow-[0_22px_70px_rgba(15,23,42,0.12)] flex max-h-[calc(100dvh-2rem)] flex-col"
        style={{
          maxWidth: "980px",
          borderRadius: "26px",
        }}
      >
        {/* soft background accents */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-[#2e66ff]/[0.07] blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-[#56b5dc]/[0.12] blur-3xl" />
          <div className="absolute -bottom-24 -right-20 h-56 w-56 rounded-full bg-[#1e4ba0]/[0.10] blur-3xl" />
        </div>

        {/* top buttons */}
        <div className="relative z-10 flex items-start justify-between px-4 pt-4 sm:px-7 sm:pt-7 shrink-0">
          <button
            ref={topButtonRef}
            type="button"
            onClick={() => {
              setAgreePrivacy(false);
              setStep("role");
            }}
            className="h-11 w-11 rounded-full border border-slate-200 bg-white/90 text-[#0f2442] shadow-sm hover:bg-slate-50 flex items-center justify-center transition
                       focus:outline-none focus:ring-2 focus:ring-offset-2"
            style={{ "--tw-ring-color": BLUE.ring }}
            aria-label="Go back"
            title="Go back"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => navigate("/")}
            className="h-11 w-11 rounded-full border border-slate-200 bg-white/90 text-[#0f2442] shadow-sm hover:bg-slate-50 flex items-center justify-center transition
                       focus:outline-none focus:ring-2 focus:ring-offset-2"
            style={{ "--tw-ring-color": BLUE.ring }}
            aria-label="Close dialog"
            title="Close"
          >
            <span className="text-2xl leading-none" aria-hidden="true">
              ×
            </span>
          </button>
        </div>

        <div className="relative z-10 overflow-y-auto px-5 pb-6 sm:px-10 sm:pb-9 lg:px-14">
          {/* icon */}
          <div className="-mt-2 flex justify-center sm:-mt-4">
            <div className="relative flex h-24 w-24 items-center justify-center sm:h-28 sm:w-28" aria-hidden="true">
              <div className="absolute inset-0 rounded-full bg-[#1e4ba0]/[0.06]" />
              <div className="absolute inset-2 rounded-full border border-[#1e4ba0]/15" />
              <div className="absolute left-2 top-5 h-1.5 w-1.5 rounded-full bg-[#2e66ff]" />
              <div className="absolute right-3 top-9 h-1.5 w-1.5 rounded-full bg-[#2e66ff]" />
              <div className="absolute right-7 bottom-2 h-1.5 w-1.5 rounded-full bg-[#2e66ff]/70" />
              <img src="/images/lock.png" alt="Lock" className="relative h-20 w-20 object-contain sm:h-24 sm:w-24" draggable="false" />
            </div>
          </div>

          {/* title */}
          <h2
            className="mt-1 text-center font-extrabold text-[#071b3a] text-[28px] sm:text-[38px] lg:text-[42px] leading-tight"
            style={{
              letterSpacing: "0.08em",
            }}
          >
            PRIVACY NOTICE
          </h2>

          <div className="mx-auto mt-4 flex items-center justify-center gap-3 text-[#1e4ba0]" aria-hidden="true">
            <span className="h-px w-12 bg-gradient-to-r from-transparent to-[#1e4ba0]" />
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3l7 4v5c0 5-3.5 8-7 9-3.5-1-7-4-7-9V7l7-4z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4" />
            </svg>
            <span className="h-px w-12 bg-gradient-to-l from-transparent to-[#1e4ba0]" />
          </div>

          {/* privacy text box - no side icons */}
          <div className="mt-5 sm:mt-6 mx-auto max-w-[820px] rounded-[20px] border border-[#d7e5ff] bg-gradient-to-br from-[#f9fbff] via-white to-[#eef5ff] px-5 py-5 shadow-[0_10px_35px_rgba(30,75,160,0.08)] sm:px-8 sm:py-7">
            <p className="text-center text-[13px] sm:text-[15px] text-[#0f2442] leading-6 sm:leading-7 whitespace-pre-line">
              {privacyNoticeText}
            </p>
          </div>

          {/* checkbox row */}
          <div className="mt-5 sm:mt-6 mx-auto max-w-[820px]">
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={agreePrivacy}
                onChange={(e) => setAgreePrivacy(e.target.checked)}
                className="mt-0.5 h-6 w-6 shrink-0 rounded border-gray-300 focus:ring-2 focus:ring-offset-2"
                style={{ accentColor: BLUE.primary, "--tw-ring-color": BLUE.ring }}
              />
              <span className="text-sm sm:text-base leading-6 text-[#0f2442]">
                I agree to the AGAPAY <span className="font-semibold" style={{ color: BLUE.primary }}>Privacy Policy</span>
              </span>
            </label>
          </div>

          {/* proceed button */}
          <div className="mt-6 sm:mt-8 flex justify-center pb-1">
            <button
              type="button"
              onClick={proceedFromPrivacy}
              disabled={disabled}
              className="h-12 rounded-xl text-base font-bold text-white transition shadow-[0_12px_26px_rgba(30,75,160,0.25)]
                         focus:outline-none focus:ring-2 focus:ring-offset-2 inline-flex items-center justify-center gap-4"
              style={{
                backgroundColor: disabled ? "#93a6c9" : BLUE.primary,
                cursor: disabled ? "not-allowed" : "pointer",
                "--tw-ring-color": BLUE.ring,
                minWidth: "240px",
                borderRadius: "12px",
              }}
              onMouseEnter={(e) => {
                if (!disabled) e.currentTarget.style.backgroundColor = BLUE.hover;
              }}
              onMouseLeave={(e) => {
                if (!disabled) e.currentTarget.style.backgroundColor = BLUE.primary;
              }}
              onMouseDown={(e) => {
                if (!disabled) e.currentTarget.style.backgroundColor = BLUE.active;
              }}
              onMouseUp={(e) => {
                if (!disabled) e.currentTarget.style.backgroundColor = BLUE.hover;
              }}
            >
              <span>Proceed</span>
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
  <div className="relative min-h-[100dvh] overflow-y-auto px-4 pt-4 pb-4 sm:pt-24 bg-slate-50">

    {/* SOFT GLOW LIGHT */}
    <div className="pointer-events-none absolute inset-0 z-0">
      <div
        className="
          absolute
          w-[110px]
          h-[110px]
          rounded-full
          blur-[38px]
          bottom-[-70px]
          right-[-120px]
          opacity-40
        "
        style={{
          background:
            "radial-gradient(circle, rgba(46,102,166,0.25) 0%, rgba(46,102,166,0.12) 45%, transparent 75%)"
        }}
      />
    </div>

 
    {/* CONTENT */}
    <div className="relative z-10 mx-auto flex min-h-[calc(100dvh-2rem)] items-center justify-center sm:min-h-[calc(100dvh-7rem)]">
      {step === "role" ? <RolePage /> : <PrivacyPage />}
    </div>

  </div>
);
};

export default JoinAsModal;