import React from 'react';

export { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

export {
  faArrowLeft,
  faArrowUpRightFromSquare,
  faBan,
  faBell,
  faBookOpen,
  faBoxArchive,
  faBriefcase,
  faCalendarAlt,
  faCheck,
  faCheckCircle,
  faChevronDown,
  faChevronLeft,
  faChevronRight,
  faChevronUp,
  faCircle,
  faCircleCheck,
  faClock,
  faComment,
  faComments,
  faDownload,
  faEllipsisVertical,
  faEnvelope,
  faEye,
  faFile,
  faFileAlt,
  faFileArrowUp,
  faFileImage,
  faFilePdf,
  faFileWord,
  faFlag,
  faHashtag,
  faHeart,
  faImage,
  faLink,
  faLock,
  faMapMarkerAlt,
  faPaperPlane,
  faPaperclip,
  faPen,
  faReply,
  faRotateLeft,
  faSearch,
  faShieldHalved,
  faSliders,
  faSpinner,
  faThumbsDown,
  faThumbsUp,
  faTimes,
  faTimesCircle,
  faTrash,
  faTriangleExclamation,
  faUser,
  faVideo,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';

export {
  FaAlignCenter,
  FaAlignJustify,
  FaAlignLeft,
  FaAlignRight,
  FaArrowLeft,
  FaAward,
  FaBold,
  FaBookOpen,
  FaBriefcase,
  FaCamera,
  FaCheckCircle,
  FaChevronDown,
  FaDownload,
  FaEnvelope,
  FaExclamationTriangle,
  FaEye,
  FaEyeSlash,
  FaFileAlt,
  FaFolderOpen,
  FaGraduationCap,
  FaInfoCircle,
  FaItalic,
  FaListOl,
  FaListUl,
  FaMapMarkerAlt,
  FaPen,
  FaPhoneAlt,
  FaPlus,
  FaTimesCircle,
  FaTrash,
  FaUnderline,
  FaUniversity,
  FaUser,
  FaUserCheck,
  FaUsers,
  FaWaveSquare,
} from 'react-icons/fa';

export const EditIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M16.862 3.487a2.1 2.1 0 112.97 2.97L8.75 17.54 4 19l1.46-4.75 11.402-10.763z" />
  </svg>
);

export const CloseIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
  </svg>
);

export const UploadIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M12 16V5m0 0l-4 4m4-4l4 4M5 19h14" />
  </svg>
);

export const SaveIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
    <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M5 3h11l3 3v15H5V3z" />
    <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M8 3v6h8V3M8 21v-7h8v7" />
  </svg>
);

export const CompanyLogoUploadIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
    <rect x="4" y="6" width="12" height="11" rx="1.8" strokeWidth="1.7" />
    <circle cx="8" cy="10" r="1.35" strokeWidth="1.7" />
    <path strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" d="M5.5 15l3.2-3.1 2.35 2.15 2.15-2.05 2.8 3" />
    <circle cx="17.5" cy="7.5" r="3.5" fill="white" />
    <path strokeWidth="1.7" strokeLinecap="round" d="M17.5 5.7v3.6M15.7 7.5h3.6" />
  </svg>
);

export const EyeIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z" />
    <circle cx="12" cy="12" r="2.75" strokeWidth="1.8" />
  </svg>
);

export const EyeOffIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M10.58 10.58a2 2 0 002.83 2.83M9.88 4.24A10.8 10.8 0 0112 4c5.5 0 9.5 4.5 10.5 8a13.7 13.7 0 01-2.08 3.87M6.61 6.61C3.9 8.32 2.25 10.67 1.5 12c1 3.5 5 8 10.5 8 1.5 0 2.88-.33 4.12-.9" />
  </svg>
);

export const DownloadIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0l-4-4m4 4l4-4M5 20h14" />
  </svg>
);

export const BuildingIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M6 21V7l6-3v17M18 21V11l-6-2" />
    <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M9 10h.01M9 13h.01M9 16h.01M15 13h.01M15 16h.01" />
  </svg>
);

export const GlobeIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M3 12h18M12 3c3.5 4 3.5 14 0 18m0-18c-3.5 4-3.5 14 0 18M4.5 7.5h15M4.5 16.5h15" />
    <circle cx="12" cy="12" r="9" strokeWidth="1.8" />
  </svg>
);

export const LocationIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" />
    <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

export const LinkIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M10 13a5 5 0 007.07 0l2.12-2.12a5 5 0 10-7.07-7.07L10.7 5.22" />
    <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M14 11a5 5 0 00-7.07 0L4.81 13.12a5 5 0 107.07 7.07l1.41-1.41" />
  </svg>
);

export const ExternalIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M14 3h7v7M10 14L21 3M21 14v6a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6" />
  </svg>
);

export const FileIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5z" />
    <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M14 3v5h5" />
  </svg>
);

export const ImageIcon = ({ className = 'w-14 h-14' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <rect x="3" y="4" width="18" height="16" rx="2" strokeWidth="1.8" />
    <circle cx="8.5" cy="9" r="1.5" strokeWidth="1.8" />
    <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M21 15l-5-5L5 20" />
  </svg>
);

export const AboutEmptyIcon = ({ className = 'w-14 h-14' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5z" />
    <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M14 3v5h5M9 13h6M9 17h6" />
  </svg>
);

export const BriefcaseIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
    <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2m3 0H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2zM3 12h18" />
  </svg>
);

export const StarIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
    <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M12 3.5l2.63 5.33 5.88.85-4.25 4.15 1 5.85L12 16.91l-5.26 2.77 1-5.85-4.25-4.15 5.88-.85L12 3.5z" />
  </svg>
);

export const SpinnerIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={`${className} animate-spin`} viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9M20 20v-5h-.581m0 0a8.003 8.003 0 01-15.357-2" />
  </svg>
);

export const WarningIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 4h.01m-7.938 4h15.876c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.34 17.5c-.77.833.192 2.5 1.732 2.5z" />
  </svg>
);

export const CheckCircleIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export const MiniPencilIcon = ({ className = 'w-3.5 h-3.5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M16.862 3.487a2.1 2.1 0 112.97 2.97L8.75 17.54 4 19l1.46-4.75 11.402-10.763z" />
  </svg>
);

export const PhotoStackIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <rect x="4" y="7" width="14" height="12" rx="2" strokeWidth="1.8" />
    <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M8 13l2.5-2.5 2 2 3.5-3.5L18 11" />
    <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M9 7V5a2 2 0 012-2h7a2 2 0 012 2v10a2 2 0 01-2 2h-2" />
  </svg>
);

export const CoverPhotoIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <rect x="3" y="5" width="18" height="14" rx="2" strokeWidth="1.8" />
    <circle cx="9" cy="10" r="1.5" strokeWidth="1.8" />
    <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M21 15l-4.5-4.5L9 18" />
  </svg>
);

export const SocialBrandIcon = ({ name, className = 'h-4 w-4' }) => {
  const common = { className, viewBox: '0 0 24 24', fill: 'currentColor', 'aria-hidden': true };
  if (name === 'facebook') return <svg {...common}><path d="M13.5 22v-8h2.8l.4-3.2h-3.2V8.7c0-.9.3-1.6 1.7-1.6H17V4.2c-.3 0-1.4-.2-2.6-.2-2.6 0-4.4 1.6-4.4 4.5v2.3H7V14h3v8h3.5z" /></svg>;
  if (name === 'instagram') return <svg {...common}><path d="M7.2 2h9.6A5.2 5.2 0 0122 7.2v9.6a5.2 5.2 0 01-5.2 5.2H7.2A5.2 5.2 0 012 16.8V7.2A5.2 5.2 0 017.2 2zm-.2 2A3 3 0 004 7v10a3 3 0 003 3h10a3 3 0 003-3V7a3 3 0 00-3-3H7zm10.5 1.5a1.25 1.25 0 110 2.5 1.25 1.25 0 010-2.5zM12 7a5 5 0 110 10 5 5 0 010-10zm0 2a3 3 0 100 6 3 3 0 000-6z" /></svg>;
  if (name === 'youtube') return <svg {...common}><path d="M21.6 7.2a2.7 2.7 0 00-1.9-1.9C18 4.8 12 4.8 12 4.8s-6 0-7.7.5a2.7 2.7 0 00-1.9 1.9A28 28 0 002 12a28 28 0 00.4 4.8 2.7 2.7 0 001.9 1.9c1.7.5 7.7.5 7.7.5s6 0 7.7-.5a2.7 2.7 0 001.9-1.9A28 28 0 0022 12a28 28 0 00-.4-4.8zM10 15.2V8.8l5.5 3.2-5.5 3.2z" /></svg>;
  return <svg {...common}><path d="M18.9 2H22l-6.8 7.8L23.2 22H17l-4.9-6.4L6.5 22H3.4l7.2-8.3L.8 2h6.4l4.4 5.8L18.9 2zm-1.1 17.8h1.7L6.3 4.1H4.5l13.3 15.7z" /></svg>;
};


export const BookmarksSvgIcon = ({ name, className = 'w-4 h-4' }) => {
  switch (name) {
    case 'search':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="7" strokeWidth={1.75} />
          <path strokeLinecap="round" strokeWidth={1.75} d="m20 20-4-4" />
        </svg>
      );
    case 'arrowLeft':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 19l-7-7 7-7" />
        </svg>
      );
    case 'building':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.75}
            d="M3 21h18M6 21V5a2 2 0 012-2h8a2 2 0 012 2v16M9 7h.01M9 11h.01M9 15h.01M12 7h.01M12 11h.01M12 15h.01M15 7h.01M15 11h.01M15 15h.01"
          />
        </svg>
      );
    case 'location':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.75}
            d="M12 21s7-4.438 7-11a7 7 0 10-14 0c0 6.562 7 11 7 11z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 10a2 2 0 100-4 2 2 0 000 4z" />
        </svg>
      );
    case 'briefcase':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.75}
            d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m-3 0h14a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9a2 2 0 012-2z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 13h18" />
        </svg>
      );
    case 'users':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.75}
            d="M17 20h5v-1a4 4 0 00-4-4h-1M9 20H2v-1a4 4 0 014-4h1m7-4a4 4 0 10-8 0 4 4 0 008 0zm8 2a3 3 0 10-6 0 3 3 0 006 0z"
          />
        </svg>
      );
    case 'laptop':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M5 5h14a1 1 0 011 1v9H4V6a1 1 0 011-1z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M2.5 18h19M8 18h8" />
        </svg>
      );
    case 'tools':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M14.7 6.3a4 4 0 01-5.657 5.657l-5.04 5.04a2 2 0 102.829 2.828l5.04-5.04A4 4 0 0114.7 6.3z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-3 3" />
        </svg>
      );
    case 'star':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M11.48 3.499a1 1 0 011.04 0l2.4 1.384a1 1 0 00.75.105l2.74-.7a1 1 0 011.21 1.21l-.7 2.74a1 1 0 00.105.75l1.384 2.4a1 1 0 010 1.04l-1.384 2.4a1 1 0 00-.105.75l.7 2.74a1 1 0 01-1.21 1.21l-2.74-.7a1 1 0 00-.75.105l-2.4 1.384a1 1 0 01-1.04 0l-2.4-1.384a1 1 0 00-.75-.105l-2.74.7A1 1 0 013.5 19.3l.7-2.74a1 1 0 00-.105-.75l-1.384-2.4a1 1 0 010-1.04l1.384-2.4a1 1 0 00-.105-.75l-.7-2.74A1 1 0 014.71 3.594l2.74.7a1 1 0 00.75-.105l2.28-1.31z"
          />
        </svg>
      );
    case 'starOutline':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="m12 3.5 2.63 5.33 5.88.85-4.25 4.15 1 5.85L12 16.91l-5.26 2.77 1-5.85-4.25-4.15 5.88-.85L12 3.5Z"
          />
        </svg>
      );
    case 'bookmark':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.75}
            d="M17 21l-5-3-5 3V5a2 2 0 012-2h6a2 2 0 012 2v16z"
          />
        </svg>
      );
    case 'bookmarkFilled':
      return (
        <svg className={className} fill="currentColor" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.75}
            d="M17 21l-5-3-5 3V5a2 2 0 012-2h6a2 2 0 012 2v16z"
          />
        </svg>
      );
    case 'xmark':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M6 6l12 12M18 6L6 18" />
        </svg>
      );
    case 'clock':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'money':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.75}
            d="M3 7.5A1.5 1.5 0 014.5 6h15A1.5 1.5 0 0121 7.5v9A1.5 1.5 0 0119.5 18h-15A1.5 1.5 0 013 16.5v-9z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 9.25v5.5M14.25 10.5c0-.69-1.007-1.25-2.25-1.25s-2.25.56-2.25 1.25 1.007 1.25 2.25 1.25 2.25.56 2.25 1.25-1.007 1.25-2.25 1.25-2.25-.56-2.25-1.25" />
        </svg>
      );
    case 'graduation':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 14l9-5-9-5-9 5 9 5z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M6 12v5c0 1.657 2.686 3 6 3s6-1.343 6-3v-5" />
        </svg>
      );
    case 'file':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.75}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      );
    case 'checkCircle':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.75}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
    case 'minusCircle':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 12h8m5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'xCircle':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 9l6 6m0-6l-6 6m12-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'calendarCheck':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 3v3m8-3v3M4 9h16M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 14l2 2 4-4" />
        </svg>
      );
    case 'calendar':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.75}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      );
    case 'exclamation':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 9v4m0 4h.01" />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.75}
            d="M10.29 3.86l-7.4 12.82A2 2 0 004.62 20h14.76a2 2 0 001.73-3.32l-7.4-12.82a2 2 0 00-3.42 0z"
          />
        </svg>
      );
    case 'share':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 16V3" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M7 8l5-5 5 5" />
        </svg>
      );
    case 'external':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M14 3h7v7" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M10 14L21 3" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M21 14v6a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6" />
        </svg>
      );
    case 'globe':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" d="M3 12h18M12 3c3.5 4 3.5 14 0 18m0-18c-3.5 4-3.5 14 0 18M4.5 7.5h15M4.5 16.5h15" />
          <circle cx="12" cy="12" r="9" strokeWidth={1.8} />
        </svg>
      );
    case 'sparkles':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8L12 3zM19 16l.9 2.1L22 19l-2.1.9L19 22l-.9-2.1L16 19l2.1-.9L19 16zM5 14l.9 2.1L8 17l-2.1.9L5 20l-.9-2.1L2 17l2.1-.9L5 14z" />
        </svg>
      );
    case 'industry':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 21h18" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M5 21V8l7-4v17" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 21V12l7-4v13" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 10h.01M8 14h.01M8 18h.01M15 12h.01M15 16h.01" />
        </svg>
      );
    case 'link':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.75}
            d="M10 13a5 5 0 007.07 0l2.12-2.12a5 5 0 00-7.07-7.07L10.7 5.22"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.75}
            d="M14 11a5 5 0 00-7.07 0L4.81 13.12a5 5 0 107.07 7.07l1.41-1.41"
          />
        </svg>
      );
    case 'edit':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.75}
            d="M16.862 3.487a2.1 2.1 0 112.97 2.97L8.75 17.54 4 19l1.46-4.75 11.402-10.763z"
          />
        </svg>
      );
    case 'image':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <rect x="3" y="5" width="18" height="14" rx="2" strokeWidth="1.75" />
          <circle cx="8.5" cy="10" r="1.5" strokeWidth="1.75" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M21 15l-5-5-7 7" />
        </svg>
      );
    case 'facebook':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M13.5 21v-7h2.4l.4-3h-2.8V9.1c0-.9.3-1.5 1.6-1.5H16V4.9c-.2 0-.9-.1-1.8-.1-1.8 0-3.1 1.1-3.1 3.2V11H9v3h2.3v7h2.2z" />
        </svg>
      );
    case 'instagram':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" strokeWidth="1.75" />
          <circle cx="12" cy="12" r="3.75" strokeWidth="1.75" />
          <circle cx="17.3" cy="6.7" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'youtube':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M21.58 7.19a2.9 2.9 0 00-2.04-2.05C17.74 4.65 12 4.65 12 4.65s-5.74 0-7.54.49A2.9 2.9 0 002.42 7.2C1.94 9 1.94 12 1.94 12s0 3 .48 4.81a2.9 2.9 0 002.04 2.05c1.8.49 7.54.49 7.54.49s5.74 0 7.54-.49a2.9 2.9 0 002.04-2.05C22.02 15 22.02 12 22.02 12s0-3-.44-4.81zM9.95 15.13V8.87L15.18 12l-5.23 3.13z" />
        </svg>
      );
    case 'linkedin':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M6.94 8.5a1.44 1.44 0 110-2.88 1.44 1.44 0 010 2.88zM5.7 18.5h2.47v-8H5.7v8zm4.03-8h2.37v1.1h.03c.33-.63 1.14-1.3 2.35-1.3 2.52 0 2.99 1.66 2.99 3.81v4.39H15v-3.89c0-.93-.02-2.12-1.29-2.12-1.3 0-1.49 1.01-1.49 2.06v3.95H9.73v-8z" />
        </svg>
      );
    case 'twitter':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.9 5H16.5l-3.1 3.5L10.9 5H5l5.3 6.8L5.2 19h2.4l3.8-4.3 3.3 4.3H20l-5.5-7L18.9 5z" />
        </svg>
      );
    default:
      return null;
  }
};


export const CompanyViewSvgIcon = ({ name, className = "w-4 h-4" }) => {
  switch (name) {
    case "arrowLeft":
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15 19l-7-7 7-7" />
        </svg>
      );
    case "location":
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
            d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      );
    case "industry":
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M3 21h18" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M5 21V8l7-4v17" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 21V12l7-4v13" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M8 10h.01M8 14h.01M8 18h.01M15 12h.01M15 16h.01" />
        </svg>
      );
    case "link":
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
            d="M10 13a5 5 0 007.07 0l2.12-2.12a5 5 0 00-7.07-7.07L10.7 5.22"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
            d="M14 11a5 5 0 00-7.07 0L4.81 13.12a5 5 0 107.07 7.07l1.41-1.41"
          />
        </svg>
      );
    case "globe":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M3 12h18M12 3c3.5 4 3.5 14 0 18m0-18c-3.5 4-3.5 14 0 18M4.5 7.5h15M4.5 16.5h15" />
          <circle cx="12" cy="12" r="9" strokeWidth="1.8" />
        </svg>
      );
    case "external":
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M14 3h7v7" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M10 14L21 3" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M21 14v6a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6" />
        </svg>
      );
    case "bookmark":
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
            d="M6 4.75A1.75 1.75 0 017.75 3h8.5A1.75 1.75 0 0118 4.75V21l-5-3-5 3V4.75z"
          />
        </svg>
      );
    case "share":
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 6l-4-4-4 4" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 2v14" />
        </svg>
      );
    case "edit":
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
            d="M16.862 3.487a2.1 2.1 0 112.97 2.97L8.75 17.54 4 19l1.46-4.75 11.402-10.763z"
          />
        </svg>
      );
    case "briefcase":
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
            d="M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2m-9 0h12a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2V9a2 2 0 012-2z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4 13h16" />
        </svg>
      );
    case "money":
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
            d="M12 8c-1.657 0-3 1.12-3 2.5S10.343 13 12 13s3 1.12 3 2.5S13.657 18 12 18m0-10v10m9-6a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
    case "contract":
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
            d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2m3 0H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2z"
          />
        </svg>
      );
    case "facebook":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M13.5 21v-7h2.4l.4-3h-2.8V9.1c0-.9.3-1.5 1.6-1.5H16V4.9c-.2 0-.9-.1-1.8-.1-1.8 0-3.1 1.1-3.1 3.2V11H9v3h2.3v7h2.2z" />
        </svg>
      );
    case "instagram":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" strokeWidth="1.75" />
          <circle cx="12" cy="12" r="3.75" strokeWidth="1.75" />
          <circle cx="17.3" cy="6.7" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case "youtube":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M21.58 7.19a2.9 2.9 0 00-2.04-2.05C17.74 4.65 12 4.65 12 4.65s-5.74 0-7.54.49A2.9 2.9 0 002.42 7.2C1.94 9 1.94 12 1.94 12s0 3 .48 4.81a2.9 2.9 0 002.04 2.05c1.8.49 7.54.49 7.54.49s5.74 0 7.54-.49a2.9 2.9 0 002.04-2.05C22.02 15 22.02 12 22.02 12s0-3-.44-4.81zM9.95 15.13V8.87L15.18 12l-5.23 3.13z" />
        </svg>
      );
    case "linkedin":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M6.94 8.5a1.44 1.44 0 110-2.88 1.44 1.44 0 010 2.88zM5.7 18.5h2.47v-8H5.7v8zm4.03-8h2.37v1.1h.03c.33-.63 1.14-1.3 2.35-1.3 2.52 0 2.99 1.66 2.99 3.81v4.39H15v-3.89c0-.93-.02-2.12-1.29-2.12-1.3 0-1.49 1.01-1.49 2.06v3.95H9.73v-8z" />
        </svg>
      );
    case "twitter":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.9 5H16.5l-3.1 3.5L10.9 5H5l5.3 6.8L5.2 19h2.4l3.8-4.3 3.3 4.3H20l-5.5-7L18.9 5z" />
        </svg>
      );
    case "image":
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <rect x="3" y="4" width="18" height="16" rx="2" strokeWidth="1.8" />
          <circle cx="8.5" cy="9" r="1.5" strokeWidth="1.8" />
          <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M21 15l-5-5L5 20" />
        </svg>
      );
    case "file":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5z" />
          <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M14 3v5h5M9 13h6M9 17h6" />
        </svg>
      );
    case "paperPlane":
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M21 3L10 14" />
          <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M21 3L14.5 21l-4.5-7-7-4.5L21 3z" />
        </svg>
      );
    case "starOutline":
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
            d="M11.48 4.15a.6.6 0 011.04 0l2.18 4.42 4.88.71a.6.6 0 01.33 1.02l-3.53 3.44.83 4.86a.6.6 0 01-.87.63L12 16.95l-4.36 2.29a.6.6 0 01-.87-.63l.83-4.86-3.53-3.44a.6.6 0 01.33-1.02l4.88-.71 2.2-4.43z"
          />
        </svg>
      );
    default:
      return null;
  }
};


export const JobDetailsSvgIcon = ({ name, className = 'w-4 h-4' }) => {
  switch (name) {
    case 'arrowLeft':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
        </svg>
      );
    case 'briefcase':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m-3 0h14a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9a2 2 0 012-2z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13h18" />
        </svg>
      );
    case 'location':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 21s7-4.438 7-11a7 7 0 10-14 0c0 6.562 7 11 7 11z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10a2 2 0 100-4 2 2 0 000 4z" />
        </svg>
      );
    case 'calendar':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      );
    case 'users':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M17 20h5v-1a4 4 0 00-4-4h-1M9 20H2v-1a4 4 0 014-4h1m7-4a4 4 0 10-8 0 4 4 0 008 0zm8 2a3 3 0 10-6 0 3 3 0 006 0z"
          />
        </svg>
      );
    case 'laptop':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M5 5h14a1 1 0 011 1v9H4V6a1 1 0 011-1z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M2.5 18h19M8 18h8"
          />
        </svg>
      );
    case 'building':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.6}
            d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3.75h1.5m-1.5 3.75h1.5m3-7.5H15m-1.5 3.75H15m-1.5 3.75H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21"
          />
        </svg>
      );
    case 'file':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      );
    case 'checkCircle':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
    case 'exclamation':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v4m0 4h.01" />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M10.29 3.86l-7.4 12.82A2 2 0 004.62 20h14.76a2 2 0 001.73-3.32l-7.4-12.82a2 2 0 00-3.42 0z"
          />
        </svg>
      );
    case 'calendarCheck':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 14l2 2 4-4" />
        </svg>
      );
    case 'tag':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M7 7h.01M3 11l8.586 8.586a2 2 0 002.828 0L21 13a2 2 0 000-2.828L13.414 3.586A2 2 0 0012 3H5a2 2 0 00-2 2v6z"
          />
        </svg>
      );
    case 'userTie':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 12a4 4 0 100-8 4 4 0 000 8z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 20a8 8 0 0116 0" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 14l2 2 2-2" />
        </svg>
      );
    case 'graduation':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l9-5-9-5-9 5 9 5z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 12v5c0 1.657 2.686 3 6 3s6-1.343 6-3v-5" />
        </svg>
      );
    case 'tools':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M14.7 6.3a4 4 0 01-5.657 5.657l-5.04 5.04a2 2 0 102.829 2.828l5.04-5.04A4 4 0 0114.7 6.3z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-3 3" />
        </svg>
      );
    case 'external':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 3h7v7" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 14L21 3" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 14v6a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6" />
        </svg>
      );
    case 'globe':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" d="M3 12h18M12 3c3.5 4 3.5 14 0 18m0-18c-3.5 4-3.5 14 0 18M4.5 7.5h15M4.5 16.5h15" />
          <circle cx="12" cy="12" r="9" strokeWidth={1.8} />
        </svg>
      );
    case 'share':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 16V3" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 8l5-5 5 5" />
        </svg>
      );
    case 'bookmark':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M17 21l-5-3-5 3V5a2 2 0 012-2h6a2 2 0 012 2v16z"
          />
        </svg>
      );
    case 'bookmarkSolid':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 4.75A2.75 2.75 0 018.75 2h6.5A2.75 2.75 0 0118 4.75V21a.75.75 0 01-1.154.638L12 18.58l-4.846 3.058A.75.75 0 016 21V4.75z" />
        </svg>
      );
    case 'xmark':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 6l12 12M18 6L6 18" />
        </svg>
      );
    case 'clock':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'money':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M3 7.5A1.5 1.5 0 014.5 6h15A1.5 1.5 0 0121 7.5v9A1.5 1.5 0 0119.5 18h-15A1.5 1.5 0 013 16.5v-9z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9.25v5.5M14.25 10.5c0-.69-1.007-1.25-2.25-1.25s-2.25.56-2.25 1.25 1.007 1.25 2.25 1.25 2.25.56 2.25 1.25-1.007 1.25-2.25 1.25-2.25-.56-2.25-1.25" />
        </svg>
      );
    default:
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6l4 2" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
  }
};


export const MyApplicationsSvgIcon = ({ name, className = 'w-4 h-4' }) => {
  switch (name) {
    case 'search':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="m21 21-4.35-4.35m1.35-5.65a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"
          />
        </svg>
      );
    case 'file':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      );
    case 'clock':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
    case 'checkCircle':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
    case 'timesCircle':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M15 9l-6 6m0-6l6 6m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
    case 'minusCircle':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M8 12h8m5 0a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
    case 'eye':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      );
    case 'briefcase':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m-3 0h14a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9a2 2 0 012-2z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 13h18" />
        </svg>
      );
    case 'laptop':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M5 5h14a1 1 0 011 1v9H4V6a1 1 0 011-1z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M2.5 18h19M8 18h8"
          />
        </svg>
      );
    case 'building':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.6}
            d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3.75h1.5m-1.5 3.75h1.5m3-7.5H15m-1.5 3.75H15m-1.5 3.75H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21"
          />
        </svg>
      );
    case 'industry':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.9}
            d="M3 21h18M5 21V7l7-4v18M19 21V11l-6-4M9 9h.01M9 13h.01M9 17h.01M15 13h.01M15 17h.01"
          />
        </svg>
      );
    case 'calendar':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      );
    case 'location':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.9}
            d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.9}
            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      );
    case 'download':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 3v12m0 0l4-4m-4 4l-4-4" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 21h14" />
        </svg>
      );
    case 'refresh':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 4v6h6M20 20v-6h-6" />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M20 10a8 8 0 00-14.657-4.657L4 10m0 4a8 8 0 0014.657 4.657L20 14"
          />
        </svg>
      );
    case 'login':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10 17l5-5-5-5" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12H3" />
        </svg>
      );
    case 'star':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M11.48 3.499a1 1 0 011.04 0l2.4 1.384a1 1 0 00.75.105l2.74-.7a1 1 0 011.21 1.21l-.7 2.74a1 1 0 00.105.75l1.384 2.4a1 1 0 010 1.04l-1.384 2.4a1 1 0 00-.105.75l.7 2.74a1 1 0 01-1.21 1.21l-2.74-.7a1 1 0 00-.75.105l-2.4 1.384a1 1 0 01-1.04 0l-2.4-1.384a1 1 0 00-.75-.105l-2.74.7A1 1 0 013.5 19.3l.7-2.74a1 1 0 00-.105-.75l-1.384-2.4a1 1 0 010-1.04l1.384-2.4a1 1 0 00.105-.75l-.7-2.74A1 1 0 014.71 3.594l2.74.7a1 1 0 00.75-.105l2.28-1.31z"
          />
        </svg>
      );
    case 'dots':
      return (
        <svg className={className} fill="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="5" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="12" cy="19" r="1.8" />
        </svg>
      );
    case 'arrowPath':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 4v6h6" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20 20v-6h-6" />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M20 10a8 8 0 00-13.657-4.657L4 10m0 4a8 8 0 0013.657 4.657L20 14"
          />
        </svg>
      );
    default:
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 6v6l4 2" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
  }
};

export const ApplicationStatusIcon = ({ name, className = 'h-4 w-4' }) => {
  if (name === 'forInterview') {
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    );
  }

  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M8 12h8m5 0a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
};
