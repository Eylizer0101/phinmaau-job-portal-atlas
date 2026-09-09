import React from 'react';
import { FaInfoCircle } from 'react-icons/fa';

const ApplicationVerificationModal = ({ open, onClose, onTakeMeThere }) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[10070] flex items-center justify-center bg-black/45 px-4"
      role="dialog"
      aria-modal="true"
      aria-live="assertive"
      aria-labelledby="application-verification-title"
    >
      <div className="w-full max-w-sm rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#e8f1ff]">
          <FaInfoCircle className="text-4xl text-[#2e66a6]" />
        </div>
        <div id="application-verification-title" className="text-xl font-bold text-gray-900">
          Action Required!
        </div>
        <div className="mt-2 text-sm leading-6 text-gray-500">
          Looks like your email or contact number isn&apos;t verified yet. Please verify it first to continue. You can&apos;t apply for these job posts until its verified.
        </div>

        <button
          type="button"
          onClick={onTakeMeThere}
          className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#2e66a6] px-5 text-sm font-bold text-white shadow-[0_10px_22px_rgba(46,102,166,0.22)] transition hover:bg-[#25578f] active:bg-[#1f4b7c] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2"
        >
          Take me there
        </button>
      </div>
    </div>
  );
};

export default ApplicationVerificationModal;
