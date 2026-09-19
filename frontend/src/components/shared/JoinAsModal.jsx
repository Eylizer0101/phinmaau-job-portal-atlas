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
        className="w-full bg-white shadow-lg border border-gray-200"
        style={{
          maxWidth: "900px",
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
        <div className="px-6 pb-8 sm:px-10 sm:pb-10">
          <h2 className="mt-2 text-center text-2xl font-bold text-slate-900 sm:text-3xl">
            How would you like to use the platform?
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-sm leading-6 text-slate-500">
            Choose your role to get started and enjoy a personalized experience tailored to your goals.
          </p>

          <div className="mt-7 grid grid-cols-1 gap-5 md:grid-cols-2">
            {[
              {
                value: "jobseeker",
                title: "Job Seeker",
                description: "Find opportunities, apply for positions, build your profile, and connect with employers.",
                items: ["Browse available jobs", "Submit applications", "Track applications"],
              },
              {
                value: "employer",
                title: "Employer",
                description: "Post job opportunities, manage applicants, and find the right candidates for your company.",
                items: ["Post job vacancies", "Review applicants", "Connect with candidates"],
              },
            ].map((option) => {
              const selected = role === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setRole(option.value)}
                  className={`relative rounded-2xl border-2 p-5 text-left transition focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    selected
                      ? "border-[#2e66a6] bg-[#2e66a6]/[0.03] shadow-[0_10px_28px_rgba(46,102,166,0.12)]"
                      : "border-slate-200 bg-white hover:border-[#2e66a6]/45"
                  }`}
                  style={{ "--tw-ring-color": BLUE.ring }}
                  aria-pressed={selected}
                >
                  <span
                    className={`absolute right-5 top-5 h-5 w-5 rounded-full border-2 ${
                      selected ? "border-[#2e66a6] bg-[#2e66a6] shadow-[inset_0_0_0_4px_white]" : "border-slate-300 bg-white"
                    }`}
                    aria-hidden="true"
                  />
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#2e66a6]/10 text-[#2e66a6]" aria-hidden="true">
                    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2m-9 0h10a2 2 0 012 2v9a2 2 0 01-2 2H7a2 2 0 01-2-2V9a2 2 0 012-2zm3 4h4" />
                    </svg>
                  </span>
                  <h3 className="mt-4 text-lg font-bold text-slate-900">{option.title}</h3>
                  <p className="mt-2 min-h-[48px] text-sm leading-6 text-slate-500">{option.description}</p>
                  <div className="my-4 h-px bg-slate-100" />
                  <ul className="space-y-2 text-sm text-slate-600">
                    {option.items.map((item) => (
                      <li key={item} className="flex items-center gap-2">
                        <span className="text-[#2e66a6]" aria-hidden="true">✓</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={proceedFromRole}
            disabled={disabled}
            className="mx-auto mt-7 block h-11 w-full max-w-md rounded-xl text-sm font-semibold text-white transition
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
            Continue
          </button>

          <p className="mt-4 text-center text-sm text-gray-700">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold" style={{ color: BLUE.primary }}>
              Sign In here
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
        className="relative w-full overflow-hidden border border-gray-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.12)] flex flex-col"
        style={{
          maxWidth: "860px",
          borderRadius: "22px",
        }}
      >
        {/* soft background accents */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-[#2e66ff]/[0.07] blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-[#56b5dc]/[0.12] blur-3xl" />
          <div className="absolute -bottom-24 -right-20 h-56 w-56 rounded-full bg-[#1e4ba0]/[0.10] blur-3xl" />
        </div>

        {/* top buttons */}
        <div className="relative z-10 flex items-start justify-between px-4 pt-4 sm:px-6 sm:pt-5 shrink-0">
          <button
            ref={topButtonRef}
            type="button"
            onClick={() => {
              setAgreePrivacy(false);
              setStep("role");
            }}
            className="h-10 w-10 rounded-full border border-slate-200 bg-white/90 text-[#0f2442] shadow-sm hover:bg-slate-50 flex items-center justify-center transition
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
            className="h-10 w-10 rounded-full border border-slate-200 bg-white/90 text-[#0f2442] shadow-sm hover:bg-slate-50 flex items-center justify-center transition
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

        <div className="relative z-10 px-5 pb-5 sm:px-9 sm:pb-7 lg:px-12">
          {/* icon */}
          <div className="-mt-3 flex justify-center sm:-mt-5">
            <div className="relative flex h-20 w-20 items-center justify-center sm:h-24 sm:w-24" aria-hidden="true">
              <div className="absolute inset-0 rounded-full bg-[#1e4ba0]/[0.06]" />
              <div className="absolute inset-2 rounded-full border border-[#1e4ba0]/15" />
              <div className="absolute left-2 top-5 h-1.5 w-1.5 rounded-full bg-[#2e66ff]" />
              <div className="absolute right-3 top-9 h-1.5 w-1.5 rounded-full bg-[#2e66ff]" />
              <div className="absolute right-7 bottom-2 h-1.5 w-1.5 rounded-full bg-[#2e66ff]/70" />
              <img src="/images/lock.png" alt="Lock" className="relative h-16 w-16 object-contain sm:h-20 sm:w-20" draggable="false" />
            </div>
          </div>

          {/* title */}
          <h2
            className="mt-0 text-center font-extrabold text-[#071b3a] text-[24px] sm:text-[32px] lg:text-[36px] leading-tight"
            style={{
              letterSpacing: "0.08em",
            }}
          >
            PRIVACY NOTICE
          </h2>

          <div className="mx-auto mt-3 flex items-center justify-center gap-3 text-[#1e4ba0]" aria-hidden="true">
            <span className="h-px w-12 bg-gradient-to-r from-transparent to-[#1e4ba0]" />
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3l7 4v5c0 5-3.5 8-7 9-3.5-1-7-4-7-9V7l7-4z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4" />
            </svg>
            <span className="h-px w-12 bg-gradient-to-l from-transparent to-[#1e4ba0]" />
          </div>

          {/* privacy text box - no side icons */}
          <div className="mt-4 sm:mt-5 mx-auto max-w-[760px] rounded-[18px] border border-[#d7e5ff] bg-gradient-to-br from-[#f9fbff] via-white to-[#eef5ff] px-5 py-4 shadow-[0_10px_30px_rgba(30,75,160,0.08)] sm:px-7 sm:py-5">
            <p className="text-center text-[12px] sm:text-[14px] text-[#0f2442] leading-5 sm:leading-6 whitespace-pre-line">
              {privacyNoticeText}
            </p>
          </div>

          {/* checkbox row */}
          <div className="mt-4 sm:mt-5 mx-auto max-w-[760px]">
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={agreePrivacy}
                onChange={(e) => setAgreePrivacy(e.target.checked)}
                className="mt-0.5 h-6 w-6 shrink-0 rounded border-gray-300 focus:ring-2 focus:ring-offset-2"
                style={{ accentColor: BLUE.primary, "--tw-ring-color": BLUE.ring }}
              />
              <span className="text-sm sm:text-base leading-6 text-[#0f2442]">
                I have read and understood the DATA PRIVACY NOTICE
              </span>
            </label>
          </div>

          {/* proceed button */}
          <div className="mt-4 sm:mt-5 flex justify-center pb-0">
            <button
              type="button"
              onClick={proceedFromPrivacy}
              disabled={disabled}
              className="h-11 rounded-xl text-sm sm:text-base font-bold text-white transition shadow-[0_10px_22px_rgba(30,75,160,0.25)]
                         focus:outline-none focus:ring-2 focus:ring-offset-2 inline-flex items-center justify-center gap-4"
              style={{
                backgroundColor: disabled ? "#93a6c9" : BLUE.primary,
                cursor: disabled ? "not-allowed" : "pointer",
                "--tw-ring-color": BLUE.ring,
                minWidth: "220px",
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
  <div className="relative min-h-[100dvh] overflow-hidden px-3 py-3 sm:px-4 sm:py-6 bg-slate-50">

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
    <div className="relative z-10 mx-auto flex min-h-[calc(100dvh-1.5rem)] items-center justify-center sm:min-h-[calc(100dvh-3rem)]">
      <RolePage />
    </div>

    {step === "privacy" && (
      <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/45 p-4 backdrop-blur-[1px]">
        <PrivacyPage />
      </div>
    )}

  </div>
);
};

export default JoinAsModal;
