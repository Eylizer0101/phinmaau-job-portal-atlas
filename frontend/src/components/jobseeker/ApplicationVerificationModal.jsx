import React, { useEffect } from 'react';
import { FaInfoCircle } from 'react-icons/fa';

const ApplicationVerificationModal = ({ open, onClose }) => {
  useEffect(() => {
    if (!open) return undefined;

    const timer = setTimeout(() => onClose?.(), 3000);
    return () => clearTimeout(timer);
  }, [open, onClose]);

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
          Your email address or mobile number isn&apos;t verified yet. Please verify both before continuing. You can&apos;t apply for this job until both are verified.
        </div>
      </div>
    </div>
  );
};

export default ApplicationVerificationModal;
