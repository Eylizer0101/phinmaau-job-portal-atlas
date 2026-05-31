// src/pages/employer/auth/EmployerRegistrationPendingPage.jsx
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const EmployerRegistrationPendingPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const email = location?.state?.email || '';
  const message =
    location?.state?.message ||
    'Our team is reviewing the details you provided and will notify you once your account has been verified.';

  const onBack = () => navigate('/employer');

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-white to-black/5 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        <div className="bg-white rounded-2xl shadow-xl ring-1 ring-black/10 overflow-hidden p-10">
          <div className="text-center">
            <div className="mx-auto w-20 h-20 rounded-full bg-[#2e66a6]/10 flex items-center justify-center">
              <svg className="w-10 h-10 text-[#2e66a6]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm4.3 7.3l-5 6a1 1 0 01-1.5.1l-2-2a1 1 0 011.4-1.4l1.2 1.2 4.3-5.1a1 1 0 011.6 1.2z" />
              </svg>
            </div>

            <h1 className="mt-6 text-4xl font-extrabold text-black">Thank you for signing up!</h1>
            <p className="mt-4 text-xl font-bold text-black">Your account is under review.</p>

            <p className="mt-4 text-sm text-black/70">{message}</p>

            <div className="mt-8 text-left max-w-xl mx-auto">
              <h2 className="text-lg font-bold text-black">What’s Next?</h2>
              <ol className="mt-3 list-decimal pl-6 text-black/80 space-y-1">
                <li>Keep an eye on your inbox—we’ll notify you once the review is complete.</li>
                <li>If we need any additional documentation, our team will contact you directly.</li>
                <li>Once verified, you’ll gain full access to the Employer Hub to post jobs and connect with top talent.</li>
              </ol>
            </div>

            {email ? (
              <p className="mt-6 text-sm text-black/80">
                Email: <span className="font-semibold text-black">{email}</span>
              </p>
            ) : null}

            <div className="mt-10 flex justify-center">
              <button
                type="button"
                onClick={onBack}
                className="h-11 px-8 rounded-xl font-semibold text-sm text-white
                  bg-[#2e66a6] hover:bg-[#2e66a6]/90
                  focus:outline-none
                  transition shadow-sm hover:shadow-md"
              >
                Back to Employer Home
              </button>
            </div>

            <p className="mt-8 text-sm text-black/80">
              If you have any questions in the meantime, contact us at{' '}
              <span className="font-bold text-black">support@yourdomain.com</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployerRegistrationPendingPage;
