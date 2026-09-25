// src/components/shared/JoinAsModal.jsx
import React, { useMemo, useRef, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BookmarksSvgIcon } from "./JobseekerIcons";

const BLUE = {
  primary: "#2e66a6",
  hover: "#285b94",
  active: "#234f81",
  ring: "#2e66a6",
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

    const roleCards = [
      {
        id: "jobseeker",
        title: "Job Seeker",
        description: "Find opportunities, apply for positions, build your profile, and connect with employers.",
        icon: "/images/jobseeker_icons.png",
        illustration: "/images/jobseekerboy.png",
        features: [
          { icon: "search", label: "Browse available jobs" },
          { icon: "file", label: "Submit applications" },
          { icon: "checkCircle", label: "Track applications" },
        ],
      },
      {
        id: "employer",
        title: "Employer",
        description: "Post job opportunities, manage applicants, and find the right candidates for your company.",
        icon: "/images/employer_icons.png",
        illustration: "/images/girlemployer.png",
        features: [
          { icon: "briefcase", label: "Post job vacancies" },
          { icon: "users", label: "Review applicants" },
          { icon: "checkCircle", label: "Connect with candidates" },
        ],
      },
    ];

    return (
      <div
        className="relative w-full overflow-hidden border border-gray-200 bg-white"
        style={{ maxWidth: "1040px", borderRadius: "22px" }}
      >
        <div className="flex items-center justify-between px-5 pt-5 sm:px-7">
          <button
            ref={topButtonRef}
            type="button"
            onClick={() => navigate("/")}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-black transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2"
            style={{ "--tw-ring-color": BLUE.ring }}
            aria-label="Back"
            title="Back"
          >
            <BookmarksSvgIcon name="arrowLeft" className="h-5 w-5" />
          </button>
          <div className="w-10" aria-hidden="true" />
        </div>

        <div className="px-5 pb-6 sm:px-8 sm:pb-8 lg:px-10">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-[26px] font-semibold leading-tight text-black sm:text-[32px]">
              How would you like to use the platform?
            </h2>
            <p className="mx-auto mt-2 max-w-4xl whitespace-nowrap text-sm leading-6 text-gray-600 sm:text-base">
              Choose your role to get started and enjoy a personalized experience tailored to your goals.
            </p>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {roleCards.map((card) => {
              const selected = role === card.id;
              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => setRole(card.id)}
                  className="relative min-h-[300px] overflow-hidden rounded-[18px] border-2 p-5 text-left transition focus:outline-none focus:ring-2 focus:ring-offset-2 sm:p-6"
                  style={{
                    borderColor: selected ? BLUE.primary : "#d9e1e8",
                    background: selected
                      ? "linear-gradient(135deg, #eaf4ff 0%, #ffffff 48%, #dff3fb 100%)"
                      : "linear-gradient(135deg, #ffffff 0%, #f7fbff 55%, #edf7fb 100%)",
                    "--tw-ring-color": BLUE.ring,
                  }}
                  aria-pressed={selected}
                >
                  <span
                    className="absolute right-5 top-5 flex h-6 w-6 items-center justify-center rounded-full border-2 bg-white"
                    style={{ borderColor: selected ? BLUE.primary : "#b9c6d3" }}
                    aria-hidden="true"
                  >
                    {selected && <span className="h-3 w-3 rounded-full" style={{ backgroundColor: BLUE.primary }} />}
                  </span>

                  <div className="relative z-10 max-w-[65%] sm:max-w-[62%]">
                    <img
                      src={card.icon}
                      alt=""
                      className="h-14 w-14 object-contain sm:h-16 sm:w-16"
                      draggable="false"
                    />
                    <h3 className="mt-2 text-xl font-semibold text-black sm:text-2xl">{card.title}</h3>
                    <p className="mt-1.5 text-[13px] leading-5 text-gray-600 sm:text-sm">{card.description}</p>
                  </div>

                  <img
                    src={card.illustration}
                    alt=""
                    className="pointer-events-none absolute bottom-12 right-3 h-[150px] w-[150px] select-none object-contain sm:bottom-10 sm:right-5 sm:h-[180px] sm:w-[180px]"
                    draggable="false"
                  />

                  <div className="relative z-10 mt-5 mr-[155px] space-y-2.5 border-t-2 border-gray-300 pt-4 sm:mr-[185px]">
                    {card.features.map((feature) => (
                      <div key={feature.label} className="flex items-center gap-3 text-sm text-black">
                        <span className="shrink-0" style={{ color: BLUE.primary }}>
                          <BookmarksSvgIcon name={feature.icon} className="h-5 w-5" />
                        </span>
                        <span>{feature.label}</span>
                      </div>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mx-auto mt-5 max-w-[390px]">
            <button
              type="button"
              onClick={proceedFromRole}
              disabled={disabled}
              className="flex h-12 w-full items-center justify-center gap-3 rounded-xl text-sm font-semibold text-white transition focus:outline-none focus:ring-2 focus:ring-offset-2 sm:text-base"
              style={{
                backgroundColor: disabled ? "#9db5cf" : BLUE.primary,
                cursor: disabled ? "not-allowed" : "pointer",
                "--tw-ring-color": BLUE.ring,
              }}
              onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.backgroundColor = BLUE.hover; }}
              onMouseLeave={(e) => { if (!disabled) e.currentTarget.style.backgroundColor = BLUE.primary; }}
              onMouseDown={(e) => { if (!disabled) e.currentTarget.style.backgroundColor = BLUE.active; }}
              onMouseUp={(e) => { if (!disabled) e.currentTarget.style.backgroundColor = BLUE.hover; }}
            >
              <span>Continue</span>
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <p className="mt-3 whitespace-nowrap text-center text-xs text-gray-600 sm:text-sm">
              Select a role to continue • Already have an account?{" "}
              <Link to="/login" className="font-medium underline underline-offset-2" style={{ color: BLUE.primary }}>
                Sign In here
              </Link>
            </p>
          </div>
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
      {step === "role" ? <RolePage /> : <PrivacyPage />}
    </div>

  </div>
);
};

export default JoinAsModal;
