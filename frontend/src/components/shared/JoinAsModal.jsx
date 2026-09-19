// src/components/shared/JoinAsModal.jsx
import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const PRIMARY = "#2e66a6";
const icons = {
  jobseeker:
    "M9 7V5.8A1.8 1.8 0 0110.8 4h2.4A1.8 1.8 0 0115 5.8V7m-9 0h12a2 2 0 012 2v8.5a2 2 0 01-2 2H6a2 2 0 01-2-2V9a2 2 0 012-2zm-2 5h16",
  employer:
    "M5 21V5a2 2 0 012-2h8a2 2 0 012 2v16M3 21h18M9 7h1m3 0h1M9 11h1m3 0h1M9 15h1m3 0h1",
};
const RoleIcon = ({ type }) => (
  <svg
    className="h-5 w-5"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      d={icons[type]}
    />
  </svg>
);
const BulletIcon = () => (
  <svg
    className="h-4 w-4 shrink-0 text-[#7b8ca6]"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      d="M5 12h14M12 5l7 7-7 7"
    />
  </svg>
);

const ROLES = {
  jobseeker: {
    title: "Job Seeker",
    description:
      "Find opportunities, apply for positions, build your profile, and connect with employers.",
    features: [
      "Browse available jobs",
      "Submit applications",
      "Track applications",
    ],
  },
  employer: {
    title: "Employer",
    description:
      "Post job opportunities, manage applicants, and find the right candidates for your company.",
    features: [
      "Post job vacancies",
      "Review applicants",
      "Connect with candidates",
    ],
  },
};

const JoinAsModal = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState("role");
  const [role, setRole] = useState("");
  const [agreePrivacy, setAgreePrivacy] = useState(false);

  const privacyNoticeText = useMemo(
    () =>
      role === "employer"
        ? "AGAPAY prioritizes the protection and responsible handling of your company's information. The data you provide, including company details, contact information, and verification documents, is collected solely to verify your organization, create a secure account, and connect your company with qualified graduates. All data is securely stored and can only be accessed by authorized AGAPAY personnel. We will never share your information with third parties without your explicit consent."
        : "AGAPAY prioritizes the protection and responsible handling of your personal information. The data you provide including your basic information, career profile, and uploaded credentials is collected solely to create a secure, personalized account, verify your qualifications, and facilitate meaningful connections with potential employers. This information allows us to match you with suitable career opportunities, keep you informed of relevant updates, and enhance your overall experience on the platform. All data is securely stored and can only be accessed by authorized AGAPAY personnel. We will never share your personal information with third parties without your explicit consent.",
    [role],
  );

  const continueToPrivacy = () => {
    if (!role) return;
    setAgreePrivacy(false);
    setStep("privacy");
  };

  return (
    <main className="min-h-[100dvh] bg-white px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100dvh-5rem)] max-w-[1000px] items-center justify-center">
        <section className="w-full" aria-label="Choose how to use AGAPAY">
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-[#101828] sm:text-[30px]">
              How would you like to use the platform?
            </h1>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#71809a]">
              Choose your role to get started and enjoy a personalized
              experience tailored to your goals.
            </p>
          </div>

          <div className="mx-auto mt-8 grid max-w-[760px] gap-5 md:grid-cols-2">
            {Object.entries(ROLES).map(([key, item]) => {
              const selected = role === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setRole(key)}
                  className={`relative rounded-2xl border-2 bg-white p-5 text-left transition focus:outline-none focus:ring-4 focus:ring-[#2e66a6]/15 ${selected ? "border-[#2e66a6] shadow-[0_10px_30px_rgba(46,102,166,0.10)]" : "border-[#e4eaf2] hover:border-[#a9bfda]"}`}
                  aria-pressed={selected}
                >
                  <span
                    className={`absolute right-5 top-5 h-[18px] w-[18px] rounded-full border ${selected ? "border-[5px] border-[#2e66a6]" : "border-[#bdcadd]"}`}
                  />
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#d9e7f7] bg-[#f2f7fd] text-[#2e66a6]">
                    <RoleIcon type={key} />
                  </span>
                  <h2 className="mt-4 text-base font-semibold text-[#101828]">
                    {item.title}
                  </h2>
                  <p className="mt-1 min-h-[42px] text-xs leading-5 text-[#71809a]">
                    {item.description}
                  </p>
                  <div className="mt-4 border-t border-[#edf1f5] pt-3">
                    {item.features.map((label) => (
                      <span
                        key={label}
                        className="mt-2 flex items-center gap-2 text-xs text-[#42526a]"
                      >
                        <BulletIcon />
                        {label}
                      </span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mx-auto mt-7 max-w-[390px]">
            <button
              type="button"
              onClick={continueToPrivacy}
              disabled={!role}
              className="h-12 w-full rounded-xl bg-[#2e66a6] text-sm font-semibold text-white shadow-[0_8px_18px_rgba(46,102,166,0.22)] transition hover:bg-[#245387] disabled:cursor-not-allowed disabled:bg-[#9eb4ce]"
            >
              Continue
            </button>
            <p className="mt-3 text-center text-xs text-[#71809a]">
              Select a role to continue <span aria-hidden="true">•</span>{" "}
              Already have an account?{" "}
              <Link
                to="/login"
                className="font-medium text-[#2e66a6] hover:underline"
              >
                Sign In here
              </Link>
            </p>
          </div>
        </section>
      </div>

      {step === "privacy" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="privacy-title"
        >
          <div className="w-full max-w-[520px] rounded-2xl border border-[#e1e7ef] bg-white p-6 shadow-2xl sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[#2e66a6]">
              Privacy Notice
            </p>
            <h2
              id="privacy-title"
              className="mt-1 text-2xl font-bold text-[#101828]"
            >
              Your privacy matters
            </h2>
            <p className="mt-1 text-xs tracking-wide text-[#7b879b]">
              Review how AGAPAY collects, uses, and protects your information.
            </p>
            <p className="mt-5 text-sm leading-[1.55] text-[#242b36]">
              {privacyNoticeText} By registering on AGAPAY, you acknowledge and
              agree to our careful handling of your information in line with
              this Privacy Notice, ensuring your privacy is respected at every
              step of your professional journey.
            </p>
            <label className="mt-5 flex cursor-pointer items-center gap-3 text-sm text-[#242b36]">
              <input
                type="checkbox"
                checked={agreePrivacy}
                onChange={(event) => setAgreePrivacy(event.target.checked)}
                className="h-5 w-5 rounded border-gray-300"
                style={{ accentColor: PRIMARY }}
              />
              I agree to the AGAPAY Privacy Policy
            </label>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setStep("role")}
                className="h-11 rounded-xl border border-[#d7dee8] px-5 text-sm font-medium text-[#344054] hover:bg-gray-50"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() =>
                  navigate(
                    role === "employer" ? "/employer/register" : "/register",
                  )
                }
                disabled={!agreePrivacy}
                className="h-11 flex-1 rounded-xl bg-[#2e66a6] px-5 text-sm font-semibold text-white shadow-[0_7px_16px_rgba(46,102,166,0.20)] hover:bg-[#245387] disabled:cursor-not-allowed disabled:bg-[#9eb4ce] sm:max-w-[260px]"
              >
                I Understand &amp; Accept
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default JoinAsModal;
