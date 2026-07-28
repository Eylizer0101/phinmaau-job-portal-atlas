import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSearch,
  faPaperPlane,
  faCalendarAlt,
  faClock,
  faMapMarkerAlt,
  faVideo,
  faPaperclip,
  faCheckDouble,
  faCheck,
  faComments,
  faEnvelope,
  faFilePdf,
  faFileImage,
  faFileWord,
  faFile,
  faDownload,
  faTimes,
  faSpinner,
  faArrowLeft,
  faEye,
  faUser,
} from '@fortawesome/free-solid-svg-icons';
import JobSeekerLayout from '../../../layouts/JobSeekerLayout';

const UI = {
  // Page
 
  container: 'max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 -mt-8',
  shell: 'bg-white border border-[#e6edf5] rounded-[24px] shadow-[0_18px_45px_rgba(46,102,166,0.08)] overflow-hidden',

  // Layout
  grid: 'flex min-h-[660px] h-[calc(100vh-205px)]',
  sidebar: 'w-full sm:w-[320px] md:w-[350px] lg:w-[380px] border-r border-[#e6edf5] flex flex-col bg-white',
  main: 'flex-1 flex flex-col bg-white min-w-0',

  // Text
  textPrimary: 'text-black',
  textSecondary: 'text-black/70',
  textMuted: 'text-black/50',

  // Typography
  h1: 'text-2xl sm:text-3xl font-bold tracking-tight',
  h2: 'text-base font-bold',
  caption: 'text-xs',

  // Surfaces
  panelPad: 'p-4',
  inset: 'bg-[#f7faff] border border-[#e6edf5] rounded-xl',

  // Inputs / focus
  ring: 'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2',
  input:
    'w-full h-11 px-10 pr-4 border border-[#d8e2ee] rounded-xl bg-white text-sm text-black placeholder:text-black/40 focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6] focus:ring-opacity-20',

  // Buttons
  btnBase:
    'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition disabled:opacity-60 disabled:pointer-events-none active:scale-[0.99] motion-reduce:transition-none motion-reduce:transform-none',
  btnSm: 'h-9 px-3 text-sm',
  btnMd: 'h-10 px-4 text-sm',
  btnIcon: 'h-11 w-11',
  btnPrimary: 'bg-[#2e66a6] text-white hover:bg-[#25578f] active:bg-[#1f4b7c] shadow-[0_10px_22px_rgba(46,102,166,0.20)]',
  btnSecondary: 'bg-white text-black border border-[#d8e2ee] hover:bg-[#f7faff] hover:border-[#2e66a6]/35',
  btnGhost: 'bg-transparent text-black/70 hover:bg-[#f7faff]',
  btnDangerGhost: 'bg-transparent text-black/60 hover:bg-[#f7faff]',

  // Conversation item
  convItem:
    'relative p-3 rounded-2xl border border-transparent hover:bg-[#f7faff] hover:border-[#d8e2ee] transition cursor-pointer',
  convActive: 'bg-[#f7faff] border-[#2e66a6] ring-1 ring-[#2e66a6]/80 shadow-[0_8px_20px_rgba(46,102,166,0.08)]',

  // Chat
  chatHeader: 'p-4 border-b border-[#e6edf5] bg-white',
  chatBody: 'flex-1 overflow-y-auto px-4 sm:px-6 py-5 bg-[#f8fafc] pb-32',
  chatInputWrap:
    'sticky bottom-0 border-t border-[#e6edf5] bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85',

  // Text bubbles only
  bubbleBase: 'w-fit max-w-[86%] sm:max-w-[66%] lg:max-w-[58%] rounded-2xl px-4 py-3 shadow-sm',
  bubbleTextMe: 'bg-[#2e66a6] text-white rounded-br-md',
  bubbleTextOther: 'bg-white border border-[#e6edf5] text-black rounded-bl-md',

  // Attachment wrapper
  attachWrap: 'w-full max-w-[86%] sm:max-w-[66%] lg:max-w-[58%]',
  attachBar: 'inline-flex w-full items-center gap-3 rounded-xl px-3 py-2 border shadow-sm',
  attachBarMe: 'border-[#d8e2ee] bg-[#f7faff] text-black',
  attachBarOther: 'border-[#e6edf5] bg-white text-black',

  attachIconWrapMe: 'h-10 w-10 rounded-xl bg-white border border-[#d8e2ee] flex items-center justify-center flex-shrink-0',
  attachIconWrapOther: 'h-10 w-10 rounded-xl bg-[#f7faff] border border-[#e6edf5] flex items-center justify-center flex-shrink-0',

  attachBtn: 'h-9 w-9 rounded-xl border transition flex items-center justify-center',
  attachBtnMe: 'border-[#d8e2ee] bg-white hover:bg-[#f7faff]',
  attachBtnOther: 'border-[#e6edf5] bg-[#f7faff] hover:bg-[#f7faff]',

  // Minimal image attachment
  imgWrap: 'relative w-full max-w-[86%] sm:max-w-[66%] lg:max-w-[58%] group',
  imgOnly: 'w-full max-h-80 object-contain rounded-xl border border-[#e6edf5] bg-white',
  imgOverlay: 'absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition',
  imgOverlayBtn:
    'h-9 w-9 rounded-lg bg-white/90 backdrop-blur border border-[#e6edf5] shadow-sm flex items-center justify-center hover:bg-white',

  // Interview card
  interviewWrap: 'w-full max-w-[86%] sm:max-w-[66%] lg:max-w-[58%]',
  interviewCard: 'rounded-[24px] bg-white border border-[#e6edf5] shadow-[0_12px_28px_rgba(46,102,166,0.06)] px-5 py-4 text-left',
  interviewHeaderLabel: 'text-[10px] font-bold tracking-[0.18em] uppercase text-black/40',
  interviewProfileBadge:
    'h-10 w-10 rounded-full bg-[#2e66a6] text-white flex items-center justify-center font-bold text-sm flex-shrink-0',
  interviewName: 'text-base font-bold text-black leading-tight',
  interviewRole: 'text-xs text-black/50 leading-tight',
  interviewDivider: 'border-t border-[#e6edf5] my-3',
  interviewGrid: 'grid grid-cols-2 gap-x-6 gap-y-4',
  interviewLabel: 'text-[10px] font-semibold tracking-[0.14em] uppercase text-black/40 mb-1',
  interviewValue: 'text-sm text-black leading-snug flex items-center gap-2',
  interviewNotes: 'mt-3 text-xs text-black/50 leading-relaxed',

  divider: 'border-t border-[#e6edf5]',
};

const MAX_FILE_MB = 10;
const CONVERSATIONS_PER_PAGE = 7;

const ALLOWED_MIMES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];

const JobseekerMessages = () => {
  const navigate = useNavigate();

  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const [convSearch, setConvSearch] = useState('');
  const [visibleConversationCount, setVisibleConversationCount] = useState(CONVERSATIONS_PER_PAGE);

  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);

  const [showSidebar, setShowSidebar] = useState(true);

  const [logoError, setLogoError] = useState({});
  const [activeTab, setActiveTab] = useState('all');

  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const chatBodyRef = useRef(null);

  // ---------- Helpers ----------
  const getUserId = useCallback(() => {
    const userData = localStorage.getItem('user');
    if (!userData) return null;
    try {
      const user = JSON.parse(userData);
      return user.id || user._id || null;
    } catch {
      return null;
    }
  }, []);

  const currentUserId = useMemo(() => getUserId(), [getUserId]);
  const getToken = () => localStorage.getItem('token');
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://phinmaau-job-portal-atlas.onrender.com/api';
  const API_ORIGIN = String(API_BASE_URL).replace(/\/api\/?$/, '');

  const getFileUrl = (fileUrl) => {
    if (!fileUrl) return '';
    if (fileUrl.startsWith('http')) return fileUrl;
    return `${API_ORIGIN}${fileUrl}`;
  };

  const getCompanyLogoUrl = (logoPath) => {
    if (!logoPath || logoPath === '') return null;
    if (logoPath.startsWith('http')) return logoPath;
    return `${API_ORIGIN}${logoPath.startsWith('/') ? logoPath : '/' + logoPath}`;
  };

  const getEmployerKey = (employerData) => {
    return (
      employerData?._id ||
      employerData?.employerId ||
      employerData?.id ||
      employerData?.employerProfile?.companyName ||
      employerData?.companyName ||
      employerData?.fullName ||
      'unknown'
    );
  };

  const renderCompanyLogo = (employerData, size = 'h-10 w-10', textSize = 'text-sm') => {
    const companyName =
      employerData?.employerProfile?.companyName ||
      employerData?.companyName ||
      employerData?.fullName ||
      'Company';

    const logoPath =
      employerData?.employerProfile?.companyLogo ||
      employerData?.companyLogo ||
      employerData?.logo;

    const logoUrl = getCompanyLogoUrl(logoPath);
    const initial = companyName?.trim()?.charAt(0)?.toUpperCase() || 'C';
    const key = getEmployerKey(employerData);

    const showImage = !!logoUrl && !logoError[key];

    if (showImage) {
      return (
        <div className={`${size} rounded-xl overflow-hidden border border-[#e6edf5] bg-white flex-shrink-0`}>
          <img
            src={logoUrl}
            alt={companyName}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={() => setLogoError((prev) => ({ ...prev, [key]: true }))}
          />
        </div>
      );
    }

    return (
      <div
        className={`${size} rounded-xl bg-[#f7faff] border border-blue-100 flex items-center justify-center flex-shrink-0`}
        aria-label={`${companyName} logo`}
      >
        <span className={`text-[#2e66a6] font-bold ${textSize}`}>{initial}</span>
      </div>
    );
  };

  const openFile = (fileData) => {
    const url = getFileUrl(fileData?.fileUrl);
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const downloadFile = (fileData) => {
    const url = getFileUrl(fileData?.fileUrl);
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;

    const diffMinutes = Math.floor(diff / (1000 * 60));
    const diffHours = Math.floor(diff / (1000 * 60 * 60));
    const diffDays = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatMessageTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '';

    return date.toLocaleTimeString('en-PH', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const normalizeFileType = (mimeOrType, name = '') => {
    const lower = (mimeOrType || '').toLowerCase();
    const ext = name.split('.').pop()?.toLowerCase();

    if (lower.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif'].includes(ext)) return 'image';
    if (lower === 'application/pdf' || ext === 'pdf') return 'pdf';
    if (lower.includes('word') || lower.includes('msword') || ['doc', 'docx'].includes(ext)) return 'document';
    return 'other';
  };

  const getFileIcon = (type) => {
    if (type === 'image') return faFileImage;
    if (type === 'pdf') return faFilePdf;
    if (type === 'document') return faFileWord;
    return faFile;
  };

  const isNearBottom = () => {
    const el = chatBodyRef.current;
    if (!el) return true;
    const threshold = 160;
    return el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
  };

  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  const safeJsonParse = (value) => {
    if (!value || typeof value !== 'string') return null;
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  };

  const formatInterviewDate = (value) => {
    if (!value) return 'TBD';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString('en-PH', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatInterviewTime = (value) => {
    if (!value) return 'TBD';

    if (/[AP]M/i.test(value)) return value;

    const raw = String(value).trim();
    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(raw)) {
      const [h, m] = raw.split(':');
      const temp = new Date();
      temp.setHours(Number(h), Number(m), 0, 0);

      return temp.toLocaleTimeString('en-PH', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    }

    return value;
  };

  const getInterviewCardData = (msg) => {
    const details = msg?.interviewDetails || {};
    const parsedContent = safeJsonParse(msg?.content);
    const parsedNotes = safeJsonParse(details?.notes);
    const cardData = parsedNotes?.confirmationCard ? parsedNotes : parsedContent;

    const applicantName =
      details.applicantName ||
      cardData?.applicantName ||
      selectedConversation?.otherUser?.fullName ||
      'Applicant';

    const position =
      details.jobTitle ||
      cardData?.jobTitle ||
      'Interview Candidate';

    const interviewDate =
      cardData?.dateLabel ||
      details.date ||
      cardData?.date ||
      '';

    const interviewTime =
      cardData?.timeLabel ||
      details.time ||
      cardData?.time ||
      '';

    const interviewType =
      details.type ||
      cardData?.typeLabel ||
      (details.meetingLink ? 'Virtual' : details.location ? 'On-site' : 'Interview');

    const interviewer =
      details.interviewer ||
      cardData?.interviewerLabel ||
      'You';

    const location =
      details.location ||
      cardData?.location ||
      '';

    const meetingLink =
      details.meetingLink ||
      cardData?.meetingLink ||
      msg?.application?.interviewSchedule?.meetingLink ||
      '';

    const notes =
      cardData?.rawNotes ||
      (!parsedNotes ? details.notes : '') ||
      '';

    const firstLetter = applicantName?.trim()?.charAt(0)?.toUpperCase() || 'A';

    return {
      firstLetter,
      applicantName,
      position,
      interviewDate,
      interviewTime,
      interviewType,
      interviewer,
      location,
      meetingLink,
      notes,
    };
  };

  // ---------- API ----------
  const fetchConversations = useCallback(async (view = 'active') => {
    try {
      const token = getToken();
      const response = await axios.get(`${API_BASE_URL}/messages/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { view },
      });

      if (response.data?.success) setConversations(response.data.data || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  }, []);

  const fetchMessages = useCallback(
    async (conversationId) => {
      try {
        const token = getToken();
        const response = await axios.get(`${API_BASE_URL}/messages/conversation/${conversationId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.data?.success) {
          setMessages(response.data.data || []);
          setConversations((previous) =>
            previous.map((conversation) =>
              conversation._id === conversationId
                ? { ...conversation, unreadCount: 0 }
                : conversation
            )
          );
          setSelectedConversation((previous) =>
            previous?._id === conversationId
              ? { ...previous, unreadCount: 0 }
              : previous
          );
          window.dispatchEvent(new Event('messages:unread-updated'));
          setTimeout(() => scrollToBottom(false), 0);
        }
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    },
    [scrollToBottom]
  );

  useEffect(() => {
    const boot = async () => {
      setLoading(true);
      await fetchConversations('active');
      setLoading(false);
    };
    boot();
  }, [fetchConversations]);

  useEffect(() => {
    if (selectedConversation?._id) fetchMessages(selectedConversation._id);
  }, [selectedConversation?._id, fetchMessages]);

  useEffect(() => {
    if (isNearBottom()) scrollToBottom(true);
  }, [messages, scrollToBottom]);

  // ---------- Derived ----------
  const filteredConversations = useMemo(() => {
    const q = convSearch.trim().toLowerCase();
    return conversations.filter((conv) => {
      if (activeTab === 'unread' && Number(conv.unreadCount || 0) <= 0) return false;
      if (!q) return true;

      const company =
        conv.otherUser?.employerProfile?.companyName?.toLowerCase() ||
        conv.otherUser?.companyName?.toLowerCase() ||
        '';
      const industry =
        conv.otherUser?.employerProfile?.industry?.toLowerCase() ||
        conv.otherUser?.industry?.toLowerCase() ||
        '';
      const name = conv.otherUser?.fullName?.toLowerCase() || '';
      const last = conv.lastMessage?.content?.toLowerCase() || '';
      return company.includes(q) || industry.includes(q) || name.includes(q) || last.includes(q);
    });
  }, [conversations, convSearch, activeTab]);

  const totalUnreadMessages = useMemo(
    () =>
      conversations.reduce(
        (total, conversation) => total + Number(conversation.unreadCount || 0),
        0
      ),
    [conversations]
  );

  const visibleConversations = useMemo(
    () => filteredConversations.slice(0, visibleConversationCount),
    [filteredConversations, visibleConversationCount]
  );

  const hasMoreConversations = visibleConversationCount < filteredConversations.length;

  useEffect(() => {
    setVisibleConversationCount(CONVERSATIONS_PER_PAGE);
  }, [convSearch, activeTab]);

  const selectedHeaderTitle = useMemo(() => {
    if (!selectedConversation) return '';
    return (
      selectedConversation.otherUser?.employerProfile?.companyName ||
      selectedConversation.otherUser?.companyName ||
      selectedConversation.otherUser?.fullName ||
      'Unknown Employer'
    );
  }, [selectedConversation]);

  const selectedHeaderSub = useMemo(() => {
    if (!selectedConversation) return '';
    return (
      selectedConversation.otherUser?.employerProfile?.industry ||
      selectedConversation.otherUser?.industry ||
      'Industry not specified'
    );
  }, [selectedConversation]);

  const canReplyToSelectedConversation = useMemo(() => {
    return messages.length > 0;
  }, [messages]);

  const shouldDisableComposer = useMemo(() => {
    if (!selectedConversation) return true;
    if (canReplyToSelectedConversation) return false;
    return true;
  }, [selectedConversation, canReplyToSelectedConversation]);

  // ---------- Actions ----------
  const handleSelectConversation = (conv) => {
    const openedConversation = { ...conv, unreadCount: 0 };

    setSelectedConversation(openedConversation);
    setConversations((previous) =>
      previous.map((conversation) =>
        conversation._id === conv._id
          ? openedConversation
          : conversation
      )
    );
    setShowSidebar(false);
  };

  const handleCompanyHeaderClick = () => {
    const companyId = selectedConversation?.otherUser?._id;
    if (companyId) navigate(`/jobseeker/company-details/${companyId}`);
  };

  const handleFileSelect = (e) => {
    if (shouldDisableComposer) {
      alert('Wait for the employer to message you first.');
      e.target.value = '';
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      alert(`File too large. Maximum size is ${MAX_FILE_MB}MB.`);
      e.target.value = '';
      return;
    }

    if (!ALLOWED_MIMES.includes(file.type)) {
      alert('Only images, PDFs, DOC/DOCX, and TXT are allowed.');
      e.target.value = '';
      return;
    }

    setSelectedFile(file);

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => setFilePreview(ev.target.result);
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }

    e.target.value = '';
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
  };

  const handleSendMessage = async () => {
    if (shouldDisableComposer) {
      alert('Wait for the employer to message you first.');
      return;
    }

    if ((!newMessage.trim() && !selectedFile) || !selectedConversation) return;

    try {
      setSending(true);
      const token = getToken();
      const receiverId = selectedConversation.otherUser?._id;

      if (!token) {
        alert('Session expired. Please login again.');
        navigate('/login');
        return;
      }
      if (!receiverId) {
        alert('Receiver not found.');
        return;
      }

      const formData = new FormData();
      if (selectedFile) formData.append('file', selectedFile);
      formData.append('receiverId', receiverId);
      formData.append('content', newMessage || '');

      const response = await axios.post(`${API_BASE_URL}/messages/send`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
      });

      if (response.data?.success) {
        setMessages((prev) => [...prev, response.data.data]);
        setNewMessage('');
        removeSelectedFile();
        fetchConversations('active');
        window.dispatchEvent(new Event('messages:unread-updated'));
        setTimeout(() => scrollToBottom(true), 0);
      }
    } catch (error) {
      console.error('Error sending message:', error.response?.data || error.message);
      alert('Failed to send message: ' + (error.response?.data?.message || error.message));
    } finally {
      setSending(false);
    }
  };

  const renderInterviewCard = (msg, me) => {
    const data = getInterviewCardData(msg);

    return (
      <div className={UI.interviewWrap}>
        <div className={UI.interviewCard}>
          <p className={UI.interviewHeaderLabel}>Confirmation</p>

          <div className="mt-3 flex items-center gap-3">
            <div className={UI.interviewProfileBadge}>{data.firstLetter}</div>

            <div className="min-w-0">
              <p className={UI.interviewName}>{data.applicantName}</p>
              <p className={UI.interviewRole}>{data.position}</p>
            </div>
          </div>

          <div className={UI.interviewDivider} />

          <div className={UI.interviewGrid}>
            <div>
              <p className={UI.interviewLabel}>Date</p>
              <p className={UI.interviewValue}>
                <FontAwesomeIcon icon={faCalendarAlt} className="text-black/40 w-3.5 h-3.5" />
                <span>{formatInterviewDate(data.interviewDate)}</span>
              </p>
            </div>

            <div>
              <p className={UI.interviewLabel}>Time</p>
              <p className={UI.interviewValue}>
                <FontAwesomeIcon icon={faClock} className="text-black/40 w-3.5 h-3.5" />
                <span>{formatInterviewTime(data.interviewTime)}</span>
              </p>
            </div>

            <div>
              <p className={UI.interviewLabel}>Type</p>
              <p className={UI.interviewValue}>
                <FontAwesomeIcon
                  icon={data.meetingLink ? faVideo : faMapMarkerAlt}
                  className="text-black/40 w-3.5 h-3.5"
                />
                <span>{data.interviewType}</span>
              </p>
            </div>

            <div>
              <p className={UI.interviewLabel}>Interviewer</p>
              <p className={UI.interviewValue}>
                <FontAwesomeIcon icon={faUser} className="text-black/40 w-3.5 h-3.5" />
                <span>{data.interviewer}</span>
              </p>
            </div>
          </div>

          {data.location && !data.meetingLink && (
            <div className="mt-3">
              <p className={UI.interviewLabel}>Location</p>
              <p className={`${UI.interviewValue} break-words`}>
                <FontAwesomeIcon icon={faMapMarkerAlt} className="text-black/40 w-3.5 h-3.5" />
                <span>{data.location}</span>
              </p>
            </div>
          )}

          {data.meetingLink && (
            <a
              href={data.meetingLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#2e66a6] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#25578f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2"
            >
              <FontAwesomeIcon icon={faVideo} className="h-4 w-4" aria-hidden="true" />
              Join Google Meet
            </a>
          )}

          {data.notes && <p className={UI.interviewNotes}>{data.notes}</p>}
        </div>

      </div>
    );
  };

  // ---------- Loading ----------
  if (loading) {
    return (
      <JobSeekerLayout>
        <div className={UI.container}>
          <div className={`${UI.shell} p-10`}>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[#f7faff] animate-pulse" />
              <div className="space-y-2">
                <div className="h-4 w-56 bg-[#f7faff] rounded animate-pulse" />
                <div className="h-3 w-80 bg-[#f7faff] rounded animate-pulse" />
              </div>
            </div>
            <div className="mt-6 h-[520px] bg-[#f7faff] border border-[#e6edf5] rounded-2xl animate-pulse" />
          </div>
        </div>
      </JobSeekerLayout>
    );
  }

  return (
    <JobSeekerLayout>
      <div className={UI.pageBg}>
        <div className={UI.container}>
          <div className="mb-6">
            <h1 className="text-[33px] leading-[40px] font-semibold text-black">Messages</h1>
            <p className="mt-2 text-black/70">
              Communicate with employers for interviews and follow-ups
            </p>
          </div>

          <div className={UI.shell}>
            <div className={UI.grid}>
              {/* SIDEBAR */}
              <div
                className={[UI.sidebar, showSidebar ? 'block' : 'hidden', 'sm:block'].join(' ')}
                aria-label="Conversations sidebar"
              >
                <div className={`${UI.panelPad} ${UI.divider}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className={`${UI.h2} ${UI.textPrimary}`}>Messages</p>
                      <p className={`mt-1 text-sm ${UI.textSecondary}`}>
                        {totalUnreadMessages} {totalUnreadMessages === 1 ? 'unread message' : 'unread messages'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowSidebar(false)}
                      className={`sm:hidden ${UI.btnBase} ${UI.btnIcon} ${UI.btnGhost} ${UI.ring}`}
                      aria-label="Close sidebar"
                    >
                      <FontAwesomeIcon icon={faTimes} />
                    </button>
                  </div>

                  <div className="mt-3 relative">
                    <FontAwesomeIcon
                      icon={faSearch}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40"
                      aria-hidden="true"
                    />
                    <input
                      value={convSearch}
                      onChange={(e) => setConvSearch(e.target.value)}
                      className={`${UI.input} ${UI.ring}`}
                      placeholder="Search conversations..."
                      aria-label="Search conversations"
                    />
                  </div>

                  <div className="mt-3 flex items-center gap-1.5">
                    {[
                      { key: 'all', label: 'All' },
                      { key: 'unread', label: 'Unread' },
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setActiveTab(tab.key)}
                        className={`rounded-full px-3 py-2 text-sm font-semibold transition ${
                          activeTab === tab.key
                            ? 'bg-[#eaf3ff] text-[#2e66a6]'
                            : 'text-black/65 hover:bg-[#f7faff]'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}

                    <button
                      type="button"
                      onClick={() => navigate('/jobseeker/community')}
                      className="rounded-full px-3 py-2 text-sm font-semibold text-black/65 transition hover:bg-[#f7faff]"
                    >
                      Community
                    </button>

                  </div>

                </div>

                <div className="flex-1 overflow-y-auto p-3">
                  {filteredConversations.length === 0 ? (
                    <div className="text-center py-10">
                      <FontAwesomeIcon icon={faComments} className="w-10 h-10 text-black/25 mx-auto mb-3" />
                      <p className={`font-semibold ${UI.textPrimary}`}>No conversations</p>
                      <p className={`text-sm ${UI.textMuted} mt-1`}>
                        Wait for the employer to start the conversation.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {visibleConversations.map((conv) => {
                        const active = selectedConversation?._id === conv._id;
                        const title =
                          conv.otherUser?.employerProfile?.companyName ||
                          conv.otherUser?.companyName ||
                          conv.otherUser?.fullName ||
                          'Unknown Employer';
                        const time = formatTime(conv.lastMessageTime || conv.lastMessage?.createdAt);
                        const last = conv.lastMessage?.content || 'No messages yet';

                        return (
                          <div
                            key={conv._id}
                            role="button"
                            tabIndex={0}
                            onClick={() => handleSelectConversation(conv)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleSelectConversation(conv);
                              }
                            }}
                            className={['group w-full text-left', UI.convItem, active ? UI.convActive : '', UI.ring].join(' ')}
                            aria-current={active ? 'page' : undefined}
                          >
                            <div className="flex items-start gap-3">
                              {renderCompanyLogo(conv.otherUser, 'h-10 w-10', 'text-sm')}

                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className={`font-semibold ${UI.textPrimary} truncate`} title={title}>
                                      {title}
                                    </p>
                                  </div>

                                  <span className={`flex-shrink-0 text-xs ${UI.textMuted}`}>{time}</span>
                                </div>

                                <p className={`text-sm ${UI.textSecondary} truncate mt-0.5`} title={last}>
                                  {last}
                                </p>

                                {conv.unreadCount > 0 && (
                                  <p className="mt-1.5 text-xs font-semibold text-[#2e66a6]">
                                    {conv.unreadCount}{' '}
                                    {conv.unreadCount === 1 ? 'unread message' : 'unread messages'}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {hasMoreConversations && (
                        <div className="flex justify-center px-2 pb-2 pt-3">
                          <button
                            type="button"
                            onClick={() =>
                              setVisibleConversationCount((current) =>
                                Math.min(
                                  current + CONVERSATIONS_PER_PAGE,
                                  filteredConversations.length
                                )
                              )
                            }
                            className={`w-full rounded-xl border border-[#d8e2ee] bg-white px-4 py-2.5 text-sm font-semibold text-[#2e66a6] transition hover:border-[#2e66a6]/40 hover:bg-[#f7faff] ${UI.ring}`}
                          >
                            View More
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* MAIN */}
              <div className={[UI.main, showSidebar ? 'hidden sm:flex' : 'flex'].join(' ')}>
                {selectedConversation ? (
                  <>

                    <div className={UI.chatHeader}>
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          type="button"
                          onClick={() => setShowSidebar(true)}
                          className={`sm:hidden ${UI.btnBase} ${UI.btnIcon} ${UI.btnGhost} ${UI.ring}`}
                          aria-label="Back to conversations"
                        >
                          <FontAwesomeIcon icon={faArrowLeft} />
                        </button>

                        <button
                          type="button"
                          onClick={handleCompanyHeaderClick}
                          className={`flex min-w-0 items-center gap-3 rounded-xl px-2 py-1 text-left hover:bg-[#f7faff] ${UI.ring}`}
                          title="View company details"
                        >
                          {renderCompanyLogo(selectedConversation.otherUser, 'h-10 w-10', 'text-sm')}

                          <span className="min-w-0">
                            <span className={`block font-bold ${UI.textPrimary} truncate`} title={selectedHeaderTitle}>
                              {selectedHeaderTitle}
                            </span>
                            <span className={`block text-sm ${UI.textSecondary} truncate`} title={selectedHeaderSub}>
                              {selectedHeaderSub}
                            </span>
                          </span>
                        </button>
                      </div>
                    </div>

                    <div ref={chatBodyRef} className={UI.chatBody} role="log" aria-live="polite" aria-relevant="additions">
                      {messages.length === 0 ? (
                        <div className="text-center py-14">
                          <FontAwesomeIcon icon={faEnvelope} className="w-14 h-14 text-black/25 mx-auto mb-4" />
                          <p className={`font-semibold ${UI.textPrimary}`}>No messages yet</p>
                          <p className={`text-sm ${UI.textMuted} mt-1`}>Wait for the employer to message you first.</p>
                        </div>
                      ) : (
                        <div className="mx-auto w-full max-w-[920px] space-y-3">
                          {messages.map((msg) => {
                            const me = msg.sender?._id === currentUserId;
                            const hasFile = msg.messageType === 'file' && msg.file;
                            const isInterview = msg.messageType === 'interview';

                            const bubbleClass = `${UI.bubbleBase} ${me ? UI.bubbleTextMe : UI.bubbleTextOther}`;

                            return (
                              <div key={msg._id} className={`flex ${me ? 'justify-end' : 'justify-start'}`}>
                                <div className={`flex w-full flex-col ${me ? 'items-end' : 'items-start'}`}>
                                  {hasFile ? (
                                  <div className={UI.attachWrap}>
                                    {(() => {
                                      const f = msg.file;
                                      const fType = normalizeFileType(f.fileType, f.originalName);

                                      if (fType === 'image') {
                                        return (
                                          <>
                                            <div className={UI.imgWrap}>
                                              <img
                                                src={getFileUrl(f.fileUrl)}
                                                alt={f.originalName}
                                                className={UI.imgOnly}
                                                loading="lazy"
                                              />

                                              <div className={UI.imgOverlay}>
                                                <button
                                                  type="button"
                                                  onClick={() => openFile(f)}
                                                  className={UI.imgOverlayBtn}
                                                  aria-label="View image"
                                                  title="View"
                                                >
                                                  <FontAwesomeIcon icon={faEye} />
                                                </button>

                                                <button
                                                  type="button"
                                                  onClick={() => downloadFile(f)}
                                                  className={UI.imgOverlayBtn}
                                                  aria-label="Download image"
                                                  title="Download"
                                                >
                                                  <FontAwesomeIcon icon={faDownload} />
                                                </button>
                                              </div>
                                            </div>

                                            {msg.content &&
                                              msg.content !== `Sent a ${msg.file.fileType} file: ${msg.file.originalName}` && (
                                                <p className="mt-2 text-sm text-black break-words">{msg.content}</p>
                                              )}

                                          </>
                                        );
                                      }

                                      const icon = getFileIcon(fType);
                                      const barClass = `${UI.attachBar} ${me ? UI.attachBarMe : UI.attachBarOther}`;
                                      const iconWrap = me ? UI.attachIconWrapMe : UI.attachIconWrapOther;
                                      const btnClass = `${UI.attachBtn} ${me ? UI.attachBtnMe : UI.attachBtnOther}`;

                                      return (
                                        <>
                                          <div className={barClass}>
                                            <div className={iconWrap}>
                                              <FontAwesomeIcon icon={icon} className="text-black/75" />
                                            </div>

                                            <div className="min-w-0 flex-1">
                                              <p className="text-sm font-semibold truncate" title={f.originalName}>
                                                {f.originalName}
                                              </p>
                                              <p className="text-xs text-black/50">{formatFileSize(f.fileSize)}</p>
                                            </div>

                                            <button
                                              type="button"
                                              onClick={() => openFile(f)}
                                              className={btnClass}
                                              title="View"
                                              aria-label="View"
                                            >
                                              <FontAwesomeIcon icon={faEye} className="text-black" />
                                            </button>

                                            <button
                                              type="button"
                                              onClick={() => downloadFile(f)}
                                              className={btnClass}
                                              title="Download"
                                              aria-label="Download"
                                            >
                                              <FontAwesomeIcon icon={faDownload} className="text-black" />
                                            </button>
                                          </div>

                                          {msg.content &&
                                            msg.content !== `Sent a ${msg.file.fileType} file: ${msg.file.originalName}` && (
                                              <p className="mt-2 text-sm text-black break-words">{msg.content}</p>
                                            )}

                                        </>
                                      );
                                    })()}
                                  </div>
                                ) : isInterview ? (
                                  renderInterviewCard(msg, me)
                                  ) : (
                                    <div className={bubbleClass}>
                                      <p className={`${me ? 'text-white' : 'text-black'} text-sm break-words`}>
                                        {msg.content}
                                      </p>
                                    </div>
                                  )}

                                  <div className="mt-1 flex items-center gap-2 px-1">
                                    <span className="text-[11px] text-black/45">
                                      {formatMessageTime(msg.createdAt)}
                                    </span>
                                    {me && (
                                      <FontAwesomeIcon
                                        icon={msg.isRead ? faCheckDouble : faCheck}
                                        className={`text-[11px] ${
                                          msg.isRead ? 'text-[#2e66a6]/90' : 'text-black/35'
                                        }`}
                                        aria-label={msg.isRead ? 'Read' : 'Sent'}
                                      />
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}

                          <div ref={messagesEndRef} />
                        </div>
                      )}
                    </div>

                    {selectedFile && (
                      <div className="px-4 pt-3 border-t border-[#e6edf5] bg-white">
                        <div className={`${UI.inset} p-3 flex items-start justify-between gap-3`}>
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="h-10 w-10 rounded-xl bg-white border border-[#e6edf5] flex items-center justify-center flex-shrink-0">
                              <FontAwesomeIcon
                                icon={getFileIcon(normalizeFileType(selectedFile.type, selectedFile.name))}
                                className="text-black/75"
                              />
                            </div>

                            <div className="min-w-0">
                              <p className={`text-sm font-semibold ${UI.textPrimary} truncate`} title={selectedFile.name}>
                                {selectedFile.name}
                              </p>
                              <p className={`text-xs ${UI.textMuted}`}>{formatFileSize(selectedFile.size)}</p>

                              {filePreview && (
                                <div className="mt-2">
                                  <img
                                    src={filePreview}
                                    alt="Selected preview"
                                    className="max-h-32 rounded-xl border border-[#e6edf5] object-contain bg-white"
                                  />
                                </div>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={removeSelectedFile}
                            className={`${UI.btnBase} ${UI.btnIcon} ${UI.btnDangerGhost} ${UI.ring}`}
                            aria-label="Remove selected file"
                          >
                            <FontAwesomeIcon icon={faTimes} />
                          </button>
                        </div>
                      </div>
                    )}

                    <div className={UI.chatInputWrap}>
                      <div className="p-4">
                        <div className="flex items-center gap-2 w-full overflow-x-hidden">
                          <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            className="hidden"
                            accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.txt"
                          />

                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className={`${UI.btnBase} ${UI.btnIcon} ${UI.btnSecondary} ${UI.ring}`}
                            aria-label="Attach file"
                            disabled={sending || shouldDisableComposer}
                          >
                            <FontAwesomeIcon icon={faPaperclip} />
                          </button>

                          <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.isComposing) return;
                              if (e.key === 'Enter') handleSendMessage();
                            }}
                            placeholder={shouldDisableComposer ? 'Wait for the employer to message you first' : 'Type a message...'}
                            className={`flex-1 min-w-0 h-11 px-4 border border-[#d8e2ee] rounded-xl text-sm text-black placeholder:text-black/40 ${UI.ring} focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6] focus:ring-opacity-20`}
                            disabled={sending || shouldDisableComposer}
                            aria-label="Message input"
                          />

                          <button
                            type="button"
                            onClick={handleSendMessage}
                            disabled={(!newMessage.trim() && !selectedFile) || sending || shouldDisableComposer}
                            className={`${UI.btnBase} h-11 px-4 sm:px-5 ${UI.btnPrimary} ${UI.ring} shrink-0`}
                            aria-label="Send message"
                          >
                            {sending ? (
                              <>
                                <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                                <span className="hidden sm:inline">Sending</span>
                              </>
                            ) : (
                              <>
                                <FontAwesomeIcon icon={faPaperPlane} />
                                <span className="hidden sm:inline">Send</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-10 bg-white">
                    <FontAwesomeIcon icon={faComments} className="w-16 h-16 text-black/25 mb-4" />
                    <p className={`text-lg font-bold ${UI.textPrimary}`}>No conversation selected</p>
                    <p className={`mt-1 text-sm ${UI.textSecondary} text-center max-w-md`}>
                      Select a conversation from the list to continue chatting.
                    </p>
                   

                    <div className="mt-6 flex flex-col sm:flex-row gap-3">
                      <button
                        type="button"
                        onClick={() => setShowSidebar(true)}
                        className={`sm:hidden ${UI.btnBase} ${UI.btnMd} ${UI.btnPrimary} ${UI.ring}`}
                      >
                        Open Conversations
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </JobSeekerLayout>
  );
};

export default JobseekerMessages;