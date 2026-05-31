import { useEffect } from 'react';

const isRecaptchaRuntimeError = (message = '', filename = '') => {
  const text = `${message} ${filename}`.toLowerCase();

  return (
    text.includes('recaptcha') &&
    (text.includes('timeout') ||
      text.includes('error') ||
      text.includes('www.gstatic.com/recaptcha') ||
      text.includes('google.com/recaptcha'))
  );
};

const RecaptchaRuntimeGuard = () => {
  useEffect(() => {
    const handleWindowError = (event) => {
      const message = event?.message || '';
      const filename = event?.filename || '';

      if (isRecaptchaRuntimeError(message, filename)) {
        event.preventDefault?.();
        event.stopImmediatePropagation?.();
        return true;
      }

      return false;
    };

    const handleUnhandledRejection = (event) => {
      const reason =
        typeof event?.reason === 'string'
          ? event.reason
          : event?.reason?.message || '';

      if (isRecaptchaRuntimeError(reason)) {
        event.preventDefault?.();
        event.stopImmediatePropagation?.();
        return true;
      }

      return false;
    };

    window.addEventListener('error', handleWindowError, true);
    window.addEventListener('unhandledrejection', handleUnhandledRejection, true);

    return () => {
      window.removeEventListener('error', handleWindowError, true);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection, true);
    };
  }, []);

  return null;
};

export default RecaptchaRuntimeGuard;