import React from 'react';

const CenteredIndicator = ({ type = 'success', message, onClose }) => {
  if (!message) return null;

  const isError = type === 'error';
  const title = isError ? 'Unable to Complete Action' : 'Action Completed Successfully';

  return (
    <div
      className="fixed inset-0 z-[10080] flex items-center justify-center bg-black/40 px-4"
      role={isError ? 'alertdialog' : 'dialog'}
      aria-modal="true"
      aria-live={isError ? 'assertive' : 'polite'}
    >
      <div className="w-full max-w-[560px] overflow-hidden rounded-2xl bg-white text-center shadow-2xl">
        <div className="px-8 pb-7 pt-9">
          <div
            className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full ${
              isError ? 'bg-red-100 text-red-600' : 'bg-[#2e66a6] text-white'
            }`}
            aria-hidden="true"
          >
            {isError ? (
              <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.3 3.8 2.7 17a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0Z" />
              </svg>
            ) : (
              <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="m5 12 4 4L19 6" />
              </svg>
            )}
          </div>
          <h2 className="mt-6 text-2xl font-semibold text-gray-900">{title}</h2>
          <p className="mt-3 text-base leading-7 text-gray-600">{message}</p>
        </div>
        <div className="border-t border-gray-200 px-10 py-5">
          <button
            type="button"
            onClick={onClose}
            className={`w-full rounded-lg px-5 py-3 text-base font-semibold text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
              isError
                ? 'bg-red-600 hover:bg-red-700 focus-visible:ring-red-600'
                : 'bg-[#2e66a6] hover:bg-[#23508a] focus-visible:ring-[#2e66a6]'
            }`}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export default CenteredIndicator;
