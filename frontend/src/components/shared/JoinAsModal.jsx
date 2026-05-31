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
        className="w-full bg-white shadow-lg border border-gray-200 -mt-16"
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
  className="w-full bg-white shadow-lg border border-gray-200 -mt-16"
  style={{
    maxWidth: "760px",
    borderRadius: "18px",
  }}
>
        {/* close */}
        <div className="flex items-start justify-between px-6 pt-6">
          <button
            ref={topButtonRef}
            type="button"
            onClick={() => {
              setAgreePrivacy(false);
              setStep("role");
            }}
            className="h-10 w-10 rounded-full border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center
                       focus:outline-none focus:ring-2 focus:ring-offset-2"
            style={{ "--tw-ring-color": BLUE.ring }}
            aria-label="Go back"
            title="Go back"
          >
            <svg className="h-5 w-5 text-gray-700" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
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
            className="h-10 w-10 rounded-full border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center
                       focus:outline-none focus:ring-2 focus:ring-offset-2"
            style={{ "--tw-ring-color": BLUE.ring }}
            aria-label="Close dialog"
            title="Close"
          >
            <span className="text-xl leading-none text-gray-700" aria-hidden="true">
              ×
            </span>
          </button>
        </div>

        <div className="px-10 pb-10">
          {/* icon */}
          <div className="flex justify-center">
            <div
              className="flex items-center justify-center rounded-full"
              style={{
                width: 64,
                height: 64,
              }}
            >
              <div
                className="flex items-center justify-center rounded-full"
                style={{ width: 160, height: 160 }}
              >
                <img
                  src="/images/lock.png"
                  alt="Lock"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                  }}
                  draggable="false"
                />
              </div>
            </div>
          </div>

          {/* title */}
          <h2
            className="mt-4 text-center font-extrabold text-gray-900"
            style={{
              fontSize: "26px",
              letterSpacing: "0.08em",
            }}
          >
            PRIVACY NOTICE
          </h2>

          {/* purple box */}
          <div
            className="mt-5 mx-auto text-center"
            style={{
              maxWidth: "650px",
              backgroundColor: "#e9e9ff",
              borderRadius: "14px",
              padding: "18px 22px",
            }}
          >
            <p className="text-sm text-gray-800 leading-6 whitespace-pre-line">
              {privacyNoticeText}
            </p>
          </div>

          {/* checkbox row */}
          <div className="mt-6 mx-auto" style={{ maxWidth: "650px" }}>
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={agreePrivacy}
                onChange={(e) => setAgreePrivacy(e.target.checked)}
                className="h-6 w-6 rounded border-gray-300"
                style={{ accentColor: BLUE.primary }}
              />
              <span className="text-sm text-gray-900">I agree to the AGAPAY Privacy Policy</span>
            </label>
          </div>

          {/* proceed button */}
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={proceedFromPrivacy}
              disabled={disabled}
              className="h-11 px-10 rounded-xl text-sm font-semibold text-white transition
                         focus:outline-none focus:ring-2 focus:ring-offset-2 inline-flex items-center gap-3"
              style={{
                backgroundColor: disabled ? "#93a6c9" : BLUE.primary,
                cursor: disabled ? "not-allowed" : "pointer",
                "--tw-ring-color": BLUE.ring,
                minWidth: "170px",
                borderRadius: "10px",
              }}
              onMouseEnter={(e) => {
                if (!disabled) e.currentTarget.style.backgroundColor = BLUE.hover;
              }}
              onMouseLeave={(e) => {
                if (!disabled) e.currentTarget.style.backgroundColor = BLUE.primary;
              }}
            >
              <span>Proceed</span>
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
  <div className="relative h-screen overflow-hidden px-4 pt-24 pb-4 bg-slate-50">

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
    <div className="relative z-10 mx-auto h-full flex items-center justify-center">
      {step === "role" ? <RolePage /> : <PrivacyPage />}
    </div>

  </div>
);
};

export default JoinAsModal;