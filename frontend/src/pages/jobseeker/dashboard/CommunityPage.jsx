import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faSearch,
  faImage,
  faLink,
  faHashtag,
  faHeart,
  faComment,
  faXmark,
  faPaperPlane,
  faSpinner,
  faEllipsisVertical,
  faPen,
  faTrash,
  faFlag,
  faThumbsUp,
  faThumbsDown,
  faReply,
  faSliders,
  faChevronDown,
  faChevronUp,
  faArrowUpRightFromSquare,
  faRotateLeft,
  faBoxArchive,
  faTriangleExclamation,
  faBookOpen,
  faShieldHalved,
  faCircleCheck,
  faLock,
  faBan,
  faBriefcase,
  faVideo,
  faFileArrowUp,
} from '@fortawesome/free-solid-svg-icons';
import api from '../../../services/api';

const categories = [
  { key: 'all', label: 'All' },
  { key: 'you', label: 'You' },
  { key: 'insight', label: 'Insights' },
  { key: 'skill', label: 'Skills' },
  { key: 'question', label: 'Questions' },
  { key: 'resource', label: 'Resources' },
];

const createCategories = [
  { key: 'insight', label: 'Insight' },
  { key: 'skill', label: 'Skill Share' },
  { key: 'question', label: 'Question' },
  { key: 'resource', label: 'Resource' },
];

const reportReasons = [
  { key: 'spam', label: 'Spam or scam', description: 'Misleading or repetitive promotional content' },
  { key: 'harassment', label: 'Harassment or bullying', description: 'Targeting or intimidating another community member' },
  { key: 'misleading', label: 'False or misleading info', description: 'Inaccurate claims presented as fact' },
  { key: 'inappropriate', label: 'Inappropriate content', description: 'Offensive, violent, or unsafe material' },
  { key: 'other', label: 'Something else', description: 'A different issue not listed above' },
];

const API_ORIGIN = String(
  process.env.REACT_APP_API_URL || 'https://phinmaau-job-portal-atlas.onrender.com/api'
).replace(/\/api\/?$/, '');

const getDisplayName = (user) => {
  const safeUser = user && typeof user === 'object' ? user : {};
  const fullName = String(safeUser.fullName || '').trim();
  if (fullName) return fullName;
  return [safeUser.firstName, safeUser.middleName, safeUser.lastName].filter(Boolean).join(' ').trim() || 'Community Member';
};

const getInitials = (name) => {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  return `${parts[0]?.[0] || 'C'}${parts[1]?.[0] || ''}`.toUpperCase();
};

const resolveMediaUrl = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^(https?:|data:|blob:)/i.test(raw)) return raw;
  return `${API_ORIGIN}${raw.startsWith('/') ? raw : `/${raw}`}`;
};

const normalizeUrl = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
};

const getLinkDetails = (value) => {
  const normalized = normalizeUrl(value);
  if (!normalized) return { url: '', host: '', label: '' };

  try {
    const parsed = new URL(normalized);
    const host = parsed.hostname.replace(/^www\./i, '');
    return {
      url: normalized,
      host,
      label: host || normalized,
    };
  } catch {
    return {
      url: normalized,
      host: normalized,
      label: normalized,
    };
  }
};

const formatTime = (date) => {
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return '';
  const diff = Date.now() - value.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return value.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatArchivedDate = (date) => {
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return 'Date unavailable';

  const datePart = value.toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const timePart = value.toLocaleTimeString('en-PH', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return `${datePart} • ${timePart}`;
};

const getUserId = (user) => {
  const safeUser = user && typeof user === 'object' ? user : {};
  return String(safeUser._id || safeUser.id || '');
};

const Avatar = ({ user, size = 'h-11 w-11' }) => {
  const name = getDisplayName(user);
  const imageUrl = resolveMediaUrl(user?.profileImage);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [imageUrl]);

  return (
    <div className={`flex ${size} shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#eaf3ff] font-bold text-[#2e66a6]`}>
      {imageUrl && !imageError ? (
        <img src={imageUrl} alt={name} className="h-full w-full object-cover" onError={() => setImageError(true)} />
      ) : (
        getInitials(name)
      )}
    </div>
  );
};

const CommunityPage = () => {
  const navigate = useNavigate();
  const photoInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const documentInputRef = useRef(null);
  const linkInputRef = useRef(null);
  const topicInputRef = useRef(null);

  const [posts, setPosts] = useState([]);
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [showCreate, setShowCreate] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    content: '',
    category: 'insight',
    linkUrl: '',
    topics: '',
  });
  const [topicDraft, setTopicDraft] = useState('');
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [videoPreview, setVideoPreview] = useState('');
  const [videoDuration, setVideoDuration] = useState(0);
  const [selectedDocuments, setSelectedDocuments] = useState([]);
  const [existingDocuments, setExistingDocuments] = useState([]);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [showTopicInput, setShowTopicInput] = useState(false);

  const [activeMenu, setActiveMenu] = useState('');
  const [commentsPost, setCommentsPost] = useState(null);
  const [commentDraft, setCommentDraft] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [replyTarget, setReplyTarget] = useState(null);
  const [expandedReplies, setExpandedReplies] = useState({});
  const [reactionLoading, setReactionLoading] = useState('');

  const [reportTarget, setReportTarget] = useState(null);
  const [reportReason, setReportReason] = useState('');
  const [reportLoading, setReportLoading] = useState(false);

  const [showManaged, setShowManaged] = useState(false);
  const [managedType, setManagedType] = useState('all');
  const [managedSort, setManagedSort] = useState('newest');
  const [managedData, setManagedData] = useState({ posts: [], comments: [] });
  const [managedLoading, setManagedLoading] = useState(false);
  const [managedView, setManagedView] = useState('active');
  const [archivedPosts, setArchivedPosts] = useState([]);
  const [commentActionMenu, setCommentActionMenu] = useState('');
  const [editingComment, setEditingComment] = useState(null);
  const [editingReply, setEditingReply] = useState(null);
  const [editingPostFromManaged, setEditingPostFromManaged] = useState(false);
  const [managedCategory, setManagedCategory] = useState('all');
  const [managedSearch, setManagedSearch] = useState('');
  const [managedPage, setManagedPage] = useState(1);
  const [archivedPage, setArchivedPage] = useState(1);
  const [managedCommentPage, setManagedCommentPage] = useState(1);
  const [archivedComments, setArchivedComments] = useState([]);
  const [archivedTypeFilter, setArchivedTypeFilter] = useState('all');
  const [editTextModal, setEditTextModal] = useState(null);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState(null);
  const [modalActionLoading, setModalActionLoading] = useState(false);

  const [likeLoading, setLikeLoading] = useState({});
  const [notice, setNotice] = useState('');
  const [uiAlert, setUiAlert] = useState(null);

  const showUiAlert = (message, title = 'Unable to Continue') => {
    setUiAlert({
      title,
      message: String(message || 'Something went wrong. Please try again.'),
    });
  };

  const [guidelinesStatusLoading, setGuidelinesStatusLoading] = useState(true);
  const [showFirstTimeGuidelines, setShowFirstTimeGuidelines] = useState(false);
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [guidelinesAccepted, setGuidelinesAccepted] = useState(false);
  const [guidelinesSubmitting, setGuidelinesSubmitting] = useState(false);

  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  }, []);

  const currentUserId = getUserId(currentUser);

  useEffect(() => {
    let active = true;

    const fetchGuidelinesStatus = async () => {
      try {
        setGuidelinesStatusLoading(true);
        const response = await api.get('/community/guidelines/status');
        if (!active) return;

        const hasAccepted = Boolean(response.data?.accepted);
        setShowFirstTimeGuidelines(!hasAccepted);
      } catch (error) {
        console.error('Error checking community guidelines status:', error);
      } finally {
        if (active) setGuidelinesStatusLoading(false);
      }
    };

    fetchGuidelinesStatus();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const shouldLockScroll = showFirstTimeGuidelines || showGuidelines;
    if (!shouldLockScroll) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [showFirstTimeGuidelines, showGuidelines]);

  const acceptCommunityGuidelines = async () => {
    if (!guidelinesAccepted || guidelinesSubmitting) return;

    try {
      setGuidelinesSubmitting(true);
      const response = await api.post('/community/guidelines/accept');
      if (response.data?.success) {
        setShowFirstTimeGuidelines(false);
        setGuidelinesAccepted(false);
        setNotice('Community Guidelines accepted.');

        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        localStorage.setItem('user', JSON.stringify({
          ...storedUser,
          communityGuidelinesAcceptedAt: response.data.acceptedAt,
        }));
      }
    } catch (error) {
      showUiAlert(error.response?.data?.message || 'Failed to accept the Community Guidelines.');
    } finally {
      setGuidelinesSubmitting(false);
    }
  };

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/community/posts', {
        params: { category, search: search.trim() },
      });
      if (response.data?.success) setPosts(response.data.data || []);
    } catch (error) {
      console.error('Error fetching community posts:', error);
    } finally {
      setLoading(false);
    }
  }, [category, search]);

  useEffect(() => {
    const timer = setTimeout(fetchPosts, 250);
    return () => clearTimeout(timer);
  }, [fetchPosts]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(''), 2500);
    return () => clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!uiAlert) return undefined;

    const handleEscape = (event) => {
      if (event.key === 'Escape') setUiAlert(null);
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [uiAlert]);

  useEffect(() => () => {
    photoPreviews.forEach((preview) => {
      if (preview?.url?.startsWith('blob:')) URL.revokeObjectURL(preview.url);
    });
    if (videoPreview?.startsWith('blob:')) URL.revokeObjectURL(videoPreview);
  }, [photoPreviews, videoPreview]);

  const resetCreateForm = () => {
    photoPreviews.forEach((preview) => {
      if (preview?.url?.startsWith('blob:')) URL.revokeObjectURL(preview.url);
    });
    if (videoPreview?.startsWith('blob:')) URL.revokeObjectURL(videoPreview);

    setForm({
      content: '',
      category: 'insight',
      linkUrl: '',
      topics: '',
    });
    setTopicDraft('');
    setSelectedPhotos([]);
    setPhotoPreviews([]);
    setSelectedVideo(null);
    setVideoPreview('');
    setVideoDuration(0);
    setSelectedDocuments([]);
    setExistingDocuments([]);
    setShowLinkInput(false);
    setShowTopicInput(false);
    setEditingPost(null);

    if (photoInputRef.current) photoInputRef.current.value = '';
    if (videoInputRef.current) videoInputRef.current.value = '';
    if (documentInputRef.current) documentInputRef.current.value = '';
  };

  const closeCreateModal = () => {
    if (submitting) return;

    const shouldReturnToManaged = editingPostFromManaged;
    resetCreateForm();
    setEditingPostFromManaged(false);
    setShowCreate(false);

    if (shouldReturnToManaged) {
      setShowManaged(true);
    }
  };

  const openCreateWith = (type = 'content') => {
    resetCreateForm();

    if (type === 'link') {
      setShowLinkInput(true);
    }

    if (type === 'topic') {
      setShowTopicInput(true);
    }

    setShowCreate(true);

    window.setTimeout(() => {
      if (type === 'photo') {
        photoInputRef.current?.click();
      } else if (type === 'link') {
        linkInputRef.current?.focus();
      } else if (type === 'topic') {
        topicInputRef.current?.focus();
      }
    }, 100);
  };

  const openEditPost = (post, fromManaged = false) => {
    setEditingPostFromManaged(fromManaged);
    if (fromManaged) setShowManaged(false);

    setEditingPost(post);
    setForm({
      content: post.content || '',
      category: post.category || 'insight',
      linkUrl: post.linkUrl || '',
      topics: (post.topics || []).join(', '),
    });

    const existingImages = (
      Array.isArray(post.imageUrls) && post.imageUrls.length
        ? post.imageUrls
        : [post.imageUrl].filter(Boolean)
    ).map((url) => ({
      url: resolveMediaUrl(url),
      existing: true,
      name: 'Existing image',
    }));

    setPhotoPreviews(existingImages);
    setSelectedPhotos([]);
    setVideoPreview(resolveMediaUrl(post.videoUrl));
    setVideoDuration(Number(post.videoDuration || 0));
    setSelectedVideo(null);
    setSelectedDocuments([]);
    setExistingDocuments(Array.isArray(post.documents) ? post.documents : []);
    setShowLinkInput(Boolean(post.linkUrl));
    setShowTopicInput(true);
    setShowCreate(true);
    setActiveMenu('');
  };

  const handlePhotoChange = (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const remainingSlots = Math.max(0, 10 - selectedPhotos.length);
    const acceptedFiles = files.slice(0, remainingSlots);

    if (files.length > remainingSlots) {
      showUiAlert('Maximum of 10 images per post.');
    }

    const validFiles = acceptedFiles.filter((file) => {
      if (!file.type.startsWith('image/')) {
        showUiAlert(`${file.name}: Image files only ang puwedeng i-upload.`);
        return false;
      }

      if (file.size > 8 * 1024 * 1024) {
        showUiAlert(`${file.name}: Maximum image size is 8MB.`);
        return false;
      }

      return true;
    });

    const nextPreviews = validFiles.map((file) => ({
      url: URL.createObjectURL(file),
      name: file.name,
      existing: false,
    }));

    setSelectedPhotos((prev) => [...prev, ...validFiles].slice(0, 10));
    setPhotoPreviews((prev) => [...prev, ...nextPreviews].slice(0, 10));
    event.target.value = '';
  };

  const removePhotoPreview = (index) => {
    setPhotoPreviews((prev) => {
      const target = prev[index];
      if (target?.url?.startsWith('blob:')) URL.revokeObjectURL(target.url);
      return prev.filter((_, itemIndex) => itemIndex !== index);
    });

    setSelectedPhotos((prev) => {
      const selectedIndex = photoPreviews
        .slice(0, index)
        .filter((preview) => !preview.existing).length;

      if (photoPreviews[index]?.existing) return prev;
      return prev.filter((_, itemIndex) => itemIndex !== selectedIndex);
    });
  };

  const handleVideoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      showUiAlert('Video files only ang puwedeng i-upload.');
      event.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024 * 1024) {
      showUiAlert('Maximum video file size is 5GB.');
      event.target.value = '';
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = previewUrl;

    video.onloadedmetadata = () => {
      const duration = Number(video.duration || 0);

      if (duration > 600) {
        URL.revokeObjectURL(previewUrl);
        showUiAlert('Maximum video duration is 10 minutes.');
        event.target.value = '';
        return;
      }

      if (videoPreview?.startsWith('blob:')) URL.revokeObjectURL(videoPreview);
      setSelectedVideo(file);
      setVideoPreview(previewUrl);
      setVideoDuration(duration);
      event.target.value = '';
    };

    video.onerror = () => {
      URL.revokeObjectURL(previewUrl);
      showUiAlert('Unable to read the selected video.');
      event.target.value = '';
    };
  };

  const handleDocumentChange = (event) => {
    const files = Array.from(event.target.files || []);
    const allowedExtensions = ['pdf', 'doc', 'docx', 'ppt', 'pptx'];
    const remainingSlots = Math.max(0, 5 - selectedDocuments.length);

    const validFiles = files.slice(0, remainingSlots).filter((file) => {
      const extension = String(file.name || '').split('.').pop().toLowerCase();

      if (!allowedExtensions.includes(extension)) {
        showUiAlert(`${file.name}: PDF, DOC, DOCX, PPT, at PPTX files lamang.`);
        return false;
      }

      return true;
    });

    if (files.length > remainingSlots) {
      showUiAlert('Maximum of 5 documents per post.');
    }

    setSelectedDocuments((prev) => [...prev, ...validFiles].slice(0, 5));
    event.target.value = '';
  };

  const getTopicList = () => (
    String(form.topics || '')
      .split(',')
      .map((topic) => topic.trim().replace(/^#+/, ''))
      .filter(Boolean)
  );

  const addTopic = () => {
    const nextTopic = topicDraft.trim().replace(/^#+/, '');
    if (!nextTopic) return;

    const currentTopics = getTopicList();
    const alreadyExists = currentTopics.some(
      (topic) => topic.toLowerCase() === nextTopic.toLowerCase()
    );

    if (alreadyExists) {
      setTopicDraft('');
      return;
    }

    setForm((prev) => ({
      ...prev,
      topics: [...currentTopics, nextTopic].join(', '),
    }));
    setTopicDraft('');
  };

  const removeTopic = (topicToRemove) => {
    const nextTopics = getTopicList().filter(
      (topic) => topic.toLowerCase() !== String(topicToRemove).toLowerCase()
    );

    setForm((prev) => ({
      ...prev,
      topics: nextTopics.join(', '),
    }));
  };

  const savePost = async () => {
    if (!form.content.trim()) {
      showUiAlert('Post content is required.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = new FormData();
      payload.append('content', form.content.trim());
      payload.append('category', form.category);
      payload.append('linkUrl', normalizeUrl(form.linkUrl));
      payload.append('topics', form.topics);
      payload.append('videoDuration', String(videoDuration || 0));

      if (editingPost) {
        const retainedImageUrls = photoPreviews
          .filter((preview) => preview.existing)
          .map((preview) => preview.url);
        payload.append('retainedImageUrls', JSON.stringify(retainedImageUrls));
        payload.append('retainVideo', String(Boolean(videoPreview && !selectedVideo)));
        payload.append('retainedDocuments', JSON.stringify(existingDocuments));
      }

      selectedPhotos.forEach((photo) => {
        payload.append('images', photo, photo.name);
      });

      if (selectedVideo) {
        payload.append('video', selectedVideo, selectedVideo.name);
      }

      selectedDocuments.forEach((documentFile) => {
        payload.append('documents', documentFile, documentFile.name);
      });

      const response = editingPost
        ? await api.put(`/community/posts/${editingPost._id}`, payload, {
            headers: { 'Content-Type': 'multipart/form-data' },
          })
        : await api.post('/community/posts', payload, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });

      if (response.data?.success) {
        const savedPost = response.data.data;
        const shouldReturnToManaged = Boolean(editingPost && editingPostFromManaged);

        setPosts((prev) => (
          editingPost
            ? prev.map((post) => (post._id === savedPost._id ? savedPost : post))
            : [savedPost, ...prev]
        ));

        if (editingPost) {
          setManagedData((prev) => ({
            ...prev,
            posts: prev.posts.map((post) => (
              post._id === savedPost._id ? savedPost : post
            )),
          }));
        }

        setNotice(editingPost ? 'Post updated successfully.' : 'Post created successfully.');
        resetCreateForm();
        setEditingPostFromManaged(false);
        setShowCreate(false);

        if (shouldReturnToManaged) {
          setShowManaged(true);
        }
      }
    } catch (error) {
      showUiAlert(error.response?.data?.message || 'Failed to save post.');
    } finally {
      setSubmitting(false);
    }
  };

  const deletePost = (post) => {
    setActiveMenu('');
    setDeleteConfirmModal({
      type: 'post',
      title: 'Delete Post?',
      message: 'This post will be moved to Archived and hidden from the Community Feed.',
      confirmLabel: 'Move to Archived',
      post,
    });
  };

  const toggleLike = async (postId) => {
    if (likeLoading[postId]) return;
    try {
      setLikeLoading((prev) => ({ ...prev, [postId]: true }));
      const response = await api.post(`/community/posts/${postId}/like`);
      if (response.data?.success) {
        setPosts((prev) => prev.map((post) => (
          post._id === postId
            ? { ...post, likes: response.data.likes || [], likedByCurrentUser: response.data.liked }
            : post
        )));
      }
    } catch (error) {
      showUiAlert(error.response?.data?.message || 'Failed to update like.');
    } finally {
      setLikeLoading((prev) => ({ ...prev, [postId]: false }));
    }
  };

  const openCommentsModal = async (post) => {
    setCommentsPost(post);
    setReplyTarget(null);
    setCommentDraft('');
    try {
      const response = await api.get(`/community/posts/${post._id}/comments`);
      if (response.data?.success) {
        const nextPost = { ...post, comments: response.data.data || [], commentsCount: response.data.count || 0 };
        setCommentsPost(nextPost);
        setPosts((prev) => prev.map((item) => (item._id === post._id ? nextPost : item)));
      }
    } catch (error) {
      showUiAlert(error.response?.data?.message || 'Failed to load comments.');
    }
  };

  const submitComment = async () => {
    const content = commentDraft.trim();
    if (!content || !commentsPost || commentLoading) return;

    try {
      setCommentLoading(true);

      if (replyTarget?.commentId) {
        const response = await api.post(
          `/community/posts/${commentsPost._id}/comments/${replyTarget.commentId}/replies`,
          {
            content,
            parentReplyId: replyTarget.parentReplyId || '',
          }
        );

        if (response.data?.success) {
          const nextComments = (commentsPost.comments || []).map((comment) => (
            comment._id === replyTarget.commentId ? response.data.data : comment
          ));
          const nextPost = { ...commentsPost, comments: nextComments };
          setCommentsPost(nextPost);
          setPosts((prev) => prev.map((post) => (post._id === nextPost._id ? nextPost : post)));
          setExpandedReplies((prev) => ({ ...prev, [replyTarget.commentId]: true }));
          setReplyTarget(null);
          setCommentDraft('');
        }
        return;
      }

      const response = await api.post(`/community/posts/${commentsPost._id}/comments`, { content });
      if (response.data?.success) {
        const nextComments = [...(commentsPost.comments || []), response.data.data];
        const nextPost = { ...commentsPost, comments: nextComments, commentsCount: response.data.commentsCount };
        setCommentsPost(nextPost);
        setPosts((prev) => prev.map((post) => (post._id === nextPost._id ? nextPost : post)));
        setCommentDraft('');
      }
    } catch (error) {
      showUiAlert(error.response?.data?.message || (replyTarget ? 'Failed to add reply.' : 'Failed to add comment.'));
    } finally {
      setCommentLoading(false);
    }
  };


  const deleteComment = (commentId) => {
    if (!commentsPost) return;
    setCommentActionMenu('');
    setDeleteConfirmModal({
      type: 'comment',
      title: 'Delete Comment?',
      message: 'This comment will be moved to Archived. You can restore it later.',
      confirmLabel: 'Move to Archived',
      commentId,
      postId: commentsPost._id,
    });
  };

  const reactToComment = async (commentId, reaction) => {
    if (!commentsPost || reactionLoading) return;
    try {
      setReactionLoading(`${commentId}-${reaction}`);
      const response = await api.post(
        `/community/posts/${commentsPost._id}/comments/${commentId}/reaction`,
        { reaction }
      );

      if (response.data?.success) {
        const nextComments = (commentsPost.comments || []).map((comment) => (
          comment._id === commentId ? response.data.data : comment
        ));
        const nextPost = { ...commentsPost, comments: nextComments };
        setCommentsPost(nextPost);
        setPosts((prev) => prev.map((post) => (post._id === nextPost._id ? nextPost : post)));
      }
    } catch (error) {
      showUiAlert(error.response?.data?.message || 'Failed to update comment reaction.');
    } finally {
      setReactionLoading('');
    }
  };

  const reactToReply = async (commentId, replyId, reaction) => {
    if (!commentsPost || reactionLoading) return;

    try {
      setReactionLoading(`${replyId}-${reaction}`);
      const response = await api.post(
        `/community/posts/${commentsPost._id}/comments/${commentId}/replies/${replyId}/reaction`,
        { reaction }
      );

      if (response.data?.success) {
        const nextComments = (commentsPost.comments || []).map((comment) => (
          comment._id === commentId ? response.data.data : comment
        ));
        const nextPost = { ...commentsPost, comments: nextComments };
        setCommentsPost(nextPost);
        setPosts((prev) => prev.map((post) => (post._id === nextPost._id ? nextPost : post)));
      }
    } catch (error) {
      showUiAlert(error.response?.data?.message || 'Failed to update reply reaction.');
    } finally {
      setReactionLoading('');
    }
  };

  const submitReport = async () => {
    if (!reportTarget || !reportReason || reportLoading) return;

    try {
      setReportLoading(true);
      const response = await api.post('/community/reports', {
        targetType: reportTarget.type,
        postId: reportTarget.postId,
        commentId: reportTarget.commentId || '',
        replyId: reportTarget.replyId || '',
        reason: reportReason,
      });
      if (response.data?.success) {
        setNotice('Report submitted successfully.');
        setReportTarget(null);
        setReportReason('');
      }
    } catch (error) {
      showUiAlert(error.response?.data?.message || 'Failed to submit report.');
    } finally {
      setReportLoading(false);
    }
  };

  const fetchManagedContent = useCallback(async () => {
    if (!showManaged) return;
    try {
      setManagedLoading(true);

      if (managedView === 'archived') {
        const response = await api.get('/community/managed/archived', {
          params: { sort: managedSort },
        });
        if (response.data?.success) {
          setArchivedPosts(response.data.posts || []);
          setArchivedComments(response.data.comments || []);
        }
        return;
      }

      const response = await api.get('/community/managed', {
        params: { type: managedType, sort: managedSort },
      });
      if (response.data?.success) {
        setManagedData({
          posts: response.data.posts || [],
          comments: response.data.comments || [],
        });
      }
    } catch (error) {
      showUiAlert(error.response?.data?.message || 'Failed to load managed content.');
    } finally {
      setManagedLoading(false);
    }
  }, [showManaged, managedType, managedSort, managedView]);

  useEffect(() => {
    fetchManagedContent();
  }, [fetchManagedContent]);

  useEffect(() => {
    setManagedCommentPage(1);
    setManagedPage(1);
    setArchivedPage(1);
  }, [
    managedSort,
    managedType,
    managedCategory,
    managedSearch,
    archivedTypeFilter,
    managedView,
    showManaged,
  ]);



  const editManagedComment = (item) => {
    setEditTextModal({
      type: 'managed-comment',
      title: 'Edit Comment',
      label: 'Comment',
      value: item.comment.content || '',
      item,
    });
  };

  const deleteManagedComment = (item) => {
    setDeleteConfirmModal({
      type: 'managed-comment',
      title: 'Delete Comment?',
      message: 'This comment will be moved to Archived. You can restore it later.',
      confirmLabel: 'Move to Archived',
      item,
    });
  };

  const restoreArchivedComment = async (item) => {
    try {
      const response = await api.patch(
        `/community/managed/archived/comments/${item.postId}/${item.comment._id}/restore`
      );

      if (response.data?.success) {
        setArchivedComments((prev) => prev.filter((entry) => (
          !(entry.postId === item.postId && entry.comment._id === item.comment._id)
        )));
        setNotice('Comment restored successfully.');
      }
    } catch (error) {
      showUiAlert(error.response?.data?.message || 'Failed to restore comment.');
    }
  };

  const permanentlyDeleteArchivedComment = (item) => {
    setDeleteConfirmModal({
      type: 'permanent-comment',
      title: 'Delete Comment Permanently?',
      message: 'This action cannot be undone. The comment will be removed forever.',
      confirmLabel: 'Delete Permanently',
      item,
    });
  };

  const editComment = (commentId, currentContent) => {
    if (!commentsPost) return;
    setCommentActionMenu('');
    setEditTextModal({
      type: 'comment',
      title: 'Edit Comment',
      label: 'Comment',
      value: currentContent || '',
      commentId,
      postId: commentsPost._id,
    });
  };

  const editReply = (commentId, replyId, currentContent) => {
    if (!commentsPost) return;
    setCommentActionMenu('');
    setEditTextModal({
      type: 'reply',
      title: 'Edit Reply',
      label: 'Reply',
      value: currentContent || '',
      commentId,
      replyId,
      postId: commentsPost._id,
    });
  };

  const deleteReply = (commentId, replyId) => {
    if (!commentsPost) return;
    setCommentActionMenu('');
    setDeleteConfirmModal({
      type: 'reply',
      title: 'Delete Reply?',
      message: 'This reply will be removed from the conversation.',
      confirmLabel: 'Delete Reply',
      commentId,
      replyId,
      postId: commentsPost._id,
    });
  };

  const restoreArchivedPost = async (postId) => {
    try {
      const response = await api.patch(`/community/managed/archived/${postId}/restore`);
      if (response.data?.success) {
        setArchivedPosts((prev) => prev.filter((post) => post._id !== postId));
        setNotice('Post restored successfully.');
        fetchPosts();
      }
    } catch (error) {
      showUiAlert(error.response?.data?.message || 'Failed to restore post.');
    }
  };

  const permanentlyDeleteArchivedPost = (postId) => {
    setDeleteConfirmModal({
      type: 'permanent-post',
      title: 'Delete Post Permanently?',
      message: 'This action cannot be undone. The post will be removed forever.',
      confirmLabel: 'Delete Permanently',
      postId,
    });
  };


  const saveEditTextModal = async () => {
    if (!editTextModal || !String(editTextModal.value || '').trim() || modalActionLoading) return;

    try {
      setModalActionLoading(true);
      const content = String(editTextModal.value).trim();

      if (editTextModal.type === 'managed-comment') {
        const { item } = editTextModal;
        const response = await api.put(
          `/community/posts/${item.postId}/comments/${item.comment._id}`,
          { content }
        );

        if (response.data?.success) {
          setManagedData((prev) => ({
            ...prev,
            comments: prev.comments.map((entry) => (
              entry.postId === item.postId && entry.comment._id === item.comment._id
                ? { ...entry, comment: response.data.data }
                : entry
            )),
          }));
          setNotice('Comment updated successfully.');
        }
      }

      if (editTextModal.type === 'comment') {
        const response = await api.put(
          `/community/posts/${editTextModal.postId}/comments/${editTextModal.commentId}`,
          { content }
        );

        if (response.data?.success && commentsPost) {
          const nextComments = (commentsPost.comments || []).map((comment) => (
            comment._id === editTextModal.commentId ? response.data.data : comment
          ));
          const nextPost = { ...commentsPost, comments: nextComments };
          setCommentsPost(nextPost);
          setPosts((prev) => prev.map((post) => (post._id === nextPost._id ? nextPost : post)));
          setNotice('Comment updated successfully.');
        }
      }

      if (editTextModal.type === 'reply') {
        const response = await api.put(
          `/community/posts/${editTextModal.postId}/comments/${editTextModal.commentId}/replies/${editTextModal.replyId}`,
          { content }
        );

        if (response.data?.success && commentsPost) {
          const nextComments = (commentsPost.comments || []).map((comment) => (
            comment._id === editTextModal.commentId ? response.data.data : comment
          ));
          const nextPost = { ...commentsPost, comments: nextComments };
          setCommentsPost(nextPost);
          setPosts((prev) => prev.map((post) => (post._id === nextPost._id ? nextPost : post)));
          setNotice('Reply updated successfully.');
        }
      }

      setEditTextModal(null);
    } catch (error) {
      showUiAlert(error.response?.data?.message || 'Failed to save changes.');
    } finally {
      setModalActionLoading(false);
    }
  };

  const confirmDeleteAction = async () => {
    if (!deleteConfirmModal || modalActionLoading) return;

    try {
      setModalActionLoading(true);

      if (deleteConfirmModal.type === 'managed-comment') {
        const { item } = deleteConfirmModal;
        const response = await api.delete(
          `/community/posts/${item.postId}/comments/${item.comment._id}`
        );

        if (response.data?.success) {
          setManagedData((prev) => ({
            ...prev,
            comments: prev.comments.filter((entry) => (
              !(entry.postId === item.postId && entry.comment._id === item.comment._id)
            )),
          }));
          setNotice('Comment moved to Archived successfully.');
        }
      }

      if (deleteConfirmModal.type === 'comment') {
        const response = await api.delete(
          `/community/posts/${deleteConfirmModal.postId}/comments/${deleteConfirmModal.commentId}`
        );

        if (response.data?.success && commentsPost) {
          const nextComments = (commentsPost.comments || []).filter(
            (comment) => comment._id !== deleteConfirmModal.commentId
          );
          const nextPost = {
            ...commentsPost,
            comments: nextComments,
            commentsCount: response.data.commentsCount ?? nextComments.length,
          };
          setCommentsPost(nextPost);
          setPosts((prev) => prev.map((post) => (post._id === nextPost._id ? nextPost : post)));
          setNotice('Comment moved to Archived successfully.');
        }
      }

      if (deleteConfirmModal.type === 'reply') {
        const response = await api.delete(
          `/community/posts/${deleteConfirmModal.postId}/comments/${deleteConfirmModal.commentId}/replies/${deleteConfirmModal.replyId}`
        );

        if (response.data?.success && commentsPost) {
          const nextComments = (commentsPost.comments || []).map((comment) => (
            comment._id === deleteConfirmModal.commentId ? response.data.data : comment
          ));
          const nextPost = { ...commentsPost, comments: nextComments };
          setCommentsPost(nextPost);
          setPosts((prev) => prev.map((post) => (post._id === nextPost._id ? nextPost : post)));
          setNotice('Reply deleted successfully.');
        }
      }

      if (deleteConfirmModal.type === 'post') {
        const { post } = deleteConfirmModal;
        const response = await api.delete(`/community/posts/${post._id}`);

        if (response.data?.success) {
          setPosts((prev) => prev.filter((item) => item._id !== post._id));
          setManagedData((prev) => ({
            ...prev,
            posts: prev.posts.filter((item) => item._id !== post._id),
          }));
          if (commentsPost?._id === post._id) setCommentsPost(null);
          setNotice('Post moved to Archived successfully.');
        }
      }

      if (deleteConfirmModal.type === 'permanent-post') {
        const response = await api.delete(
          `/community/managed/archived/${deleteConfirmModal.postId}`
        );

        if (response.data?.success) {
          setArchivedPosts((prev) => prev.filter(
            (post) => post._id !== deleteConfirmModal.postId
          ));
          setNotice('Post permanently deleted.');
        }
      }

      if (deleteConfirmModal.type === 'permanent-comment') {
        const { item } = deleteConfirmModal;
        const response = await api.delete(
          `/community/managed/archived/comments/${item.postId}/${item.comment._id}`
        );

        if (response.data?.success) {
          setArchivedComments((prev) => prev.filter((entry) => (
            !(entry.postId === item.postId && entry.comment._id === item.comment._id)
          )));
          setNotice('Comment permanently deleted.');
        }
      }

      setDeleteConfirmModal(null);
    } catch (error) {
      showUiAlert(error.response?.data?.message || 'Failed to complete delete action.');
    } finally {
      setModalActionLoading(false);
    }
  };

  const startReply = (commentId, parentReplyId, name) => {
    setReplyTarget({ commentId, parentReplyId: parentReplyId || '', name });
    setCommentDraft('');
    window.setTimeout(() => {
      document.getElementById('community-comment-input')?.focus();
    }, 0);
  };

  const renderReplyThread = (comment) => {
    const allReplies = comment.replies || [];
    const flattenedReplies = [];

    const collectReplies = (parentReplyId = '', depth = 0) => {
      allReplies
        .filter((reply) => String(reply.parentReplyId || '') === String(parentReplyId || ''))
        .forEach((reply) => {
          flattenedReplies.push({ reply, depth });
          collectReplies(reply._id, depth + 1);
        });
    };

    collectReplies();

    return flattenedReplies.map(({ reply, depth }) => {
      const replyAuthorName = getDisplayName(reply.author);
      const isReplyOwner = getUserId(reply.author) === currentUserId;
      const helpful = (reply.helpful || []).some((id) => String(id?._id || id) === currentUserId);
      const notHelpful = (reply.notHelpful || []).some((id) => String(id?._id || id) === currentUserId);
      const indentation = Math.min(depth, 2) * 18;

      return (
        <div
          key={reply._id}
          className="mt-3 min-w-0"
          style={{
            marginLeft: `${indentation}px`,
            width: `calc(100% - ${indentation}px)`,
          }}
        >
          <div className={`flex min-w-0 gap-2 ${depth > 0 ? 'border-l-2 border-[#e6edf5] pl-3' : ''}`}>
            <Avatar user={reply.author} size="h-8 w-8" />

            <div className="min-w-0 flex-1">
              <div className="relative w-fit max-w-full rounded-xl bg-white px-3 py-2 pr-10 shadow-sm ring-1 ring-[#e6edf5]">
                <p className="break-words text-xs font-bold">
                  {replyAuthorName}{isReplyOwner ? ' (You)' : ''}
                </p>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm text-black/70">
                  {reply.content}
                </p>

                {isReplyOwner && (
                  <div className="absolute right-1 top-1">
                    <button
                      type="button"
                      onClick={() => setCommentActionMenu((value) => (
                        value === `reply-${reply._id}` ? '' : `reply-${reply._id}`
                      ))}
                      className="flex h-7 w-7 items-center justify-center rounded-full text-black/40 hover:bg-[#f7faff]"
                      aria-label="Reply actions"
                    >
                      <FontAwesomeIcon icon={faEllipsisVertical} />
                    </button>

                    {commentActionMenu === `reply-${reply._id}` && (
                      <div className="absolute right-0 top-8 z-40 w-36 rounded-xl border border-[#e6edf5] bg-white p-1.5 shadow-xl">
                        <button type="button" onClick={() => editReply(comment._id, reply._id, reply.content)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs hover:bg-[#f7faff]">
                          <FontAwesomeIcon icon={faPen} /> Edit
                        </button>
                        <button type="button" onClick={() => deleteReply(comment._id, reply._id)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50">
                          <FontAwesomeIcon icon={faTrash} /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 px-2 text-[11px] text-black/45">
                <span className="shrink-0">{formatTime(reply.createdAt)}</span>

                <button
                  type="button"
                  onClick={() => reactToReply(comment._id, reply._id, 'helpful')}
                  className={`shrink-0 ${helpful ? 'font-semibold text-[#2e66a6]' : 'hover:text-[#2e66a6]'}`}
                  aria-label="Helpful"
                >
                  <FontAwesomeIcon icon={faThumbsUp} className="mr-1" /> {reply.helpful?.length || 0}
                </button>

                <button
                  type="button"
                  onClick={() => reactToReply(comment._id, reply._id, 'notHelpful')}
                  className={`shrink-0 ${notHelpful ? 'font-semibold text-red-500' : 'hover:text-red-500'}`}
                  aria-label="Not helpful"
                >
                  <FontAwesomeIcon icon={faThumbsDown} className="mr-1" /> {reply.notHelpful?.length || 0}
                </button>

                <button
                  type="button"
                  onClick={() => startReply(comment._id, reply._id, replyAuthorName)}
                  className="shrink-0 hover:text-[#2e66a6]"
                >
                  <FontAwesomeIcon icon={faReply} className="mr-1" /> Reply
                </button>

                {!isReplyOwner && (
                  <button
                    type="button"
                    onClick={() => setReportTarget({
                      type: 'reply',
                      postId: commentsPost._id,
                      commentId: comment._id,
                      replyId: reply._id,
                      name: replyAuthorName,
                    })}
                    className="shrink-0 hover:text-red-500"
                  >
                    <FontAwesomeIcon icon={faFlag} className="mr-1" /> Report
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    });
  };

  const filteredArchivedPosts = archivedTypeFilter === 'comments' ? [] : archivedPosts;
  const filteredArchivedComments = archivedTypeFilter === 'posts' ? [] : archivedComments;

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 pb-12 sm:px-6 lg:px-8">
      {uiAlert && (
        <div
          className="fixed inset-0 z-[10080] flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-[2px]"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="community-alert-title"
          aria-describedby="community-alert-message"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setUiAlert(null);
          }}
        >
          <div className="w-full max-w-[460px] overflow-hidden rounded-[24px] border border-white/70 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.35)]">
            <div className="relative bg-gradient-to-r from-[#fff7ed] via-white to-[#fff7ed] px-6 pb-5 pt-7 text-center">
              <button
                type="button"
                onClick={() => setUiAlert(null)}
                className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close message"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>

              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-2xl text-red-500 ring-8 ring-red-50/60">
                <FontAwesomeIcon icon={faTriangleExclamation} />
              </div>

              <h2
                id="community-alert-title"
                className="mt-5 text-xl font-extrabold text-slate-900"
              >
                {uiAlert.title}
              </h2>

              <p
                id="community-alert-message"
                className="mx-auto mt-2 max-w-[360px] text-sm leading-6 text-slate-600"
              >
                {uiAlert.message}
              </p>
            </div>

            <div className="border-t border-slate-100 bg-slate-50 px-6 py-4">
              <button
                type="button"
                onClick={() => setUiAlert(null)}
                autoFocus
                className="flex h-11 w-full items-center justify-center rounded-xl bg-[#2e66a6] px-5 text-sm font-bold text-white shadow-sm transition hover:bg-[#24578f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2"
              >
                Okay, I Understand
              </button>
            </div>
          </div>
        </div>
      )}

      {guidelinesStatusLoading && (
        <div className="fixed inset-0 z-[240] flex items-center justify-center bg-white/70">
          <FontAwesomeIcon icon={faSpinner} spin className="text-2xl text-[#2e66a6]" />
        </div>
      )}

      {notice && (
        <div className="fixed right-5 top-5 z-[170] rounded-xl bg-[#2e66a6] px-4 py-3 text-sm font-semibold text-white shadow-lg">
          {notice}
        </div>
      )}

      <div className="mb-5 flex flex-col gap-4 border-b border-[#e6edf5] pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/jobseeker/messages')}
            className="h-10 w-10 rounded-xl border border-[#d8e2ee] bg-white hover:bg-[#f7faff]"
            aria-label="Back to messages"
          >
            <FontAwesomeIcon icon={faArrowLeft} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-black">Community Feed</h1>
            <p className="text-sm text-black/55">Discover insights from fellow graduates</p>
          </div>
        </div>

        <div className="flex w-full gap-2 sm:w-auto">
          <div className="relative min-w-0 flex-1 sm:w-72">
            <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/35" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search posts"
              className="h-11 w-full rounded-xl border border-[#d8e2ee] bg-white pl-10 pr-4 text-sm outline-none focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/20"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowGuidelines(true)}
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-[#d8e2ee] bg-white px-4 text-sm font-semibold text-black transition hover:border-[#2e66a6]/40 hover:bg-[#f7faff]"
          >
            <FontAwesomeIcon icon={faBookOpen} />
            <span className="hidden md:inline">Community Guidelines</span>
            <span className="md:hidden">Guidelines</span>
          </button>
        </div>
      </div>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {categories.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setCategory(item.key)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                category === item.key
                  ? 'bg-[#2e66a6] text-white'
                  : 'bg-white text-black/60 hover:bg-[#f7faff]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {category === 'you' && (
          <button
            type="button"
            onClick={() => setShowManaged(true)}
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 self-start rounded-xl border border-[#d8e2ee] bg-white px-4 text-sm font-semibold hover:bg-[#f7faff] sm:self-auto"
          >
            <FontAwesomeIcon icon={faSliders} />
            <span>Managed Posts</span>
          </button>
        )}
      </div>

      <div className="mb-5 flex w-full items-center gap-3 rounded-2xl border border-[#e6edf5] bg-white p-4 shadow-sm hover:border-[#2e66a6]/30">
        <Avatar user={currentUser} />

        <button
          type="button"
          onClick={() => openCreateWith('content')}
          className="min-w-0 flex-1 rounded-full bg-[#f7faff] px-4 py-3 text-left text-sm text-black/45 hover:bg-[#eef5fd]"
        >
          Share an insight or skill...
        </button>

        <div className="hidden items-center gap-1 text-xs text-black/50 sm:flex">
          <button
            type="button"
            onClick={() => openCreateWith('photo')}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-2 hover:bg-[#f7faff] hover:text-[#2e66a6]"
          >
            <FontAwesomeIcon icon={faImage} /> Photo
          </button>

          <button
            type="button"
            onClick={() => openCreateWith('link')}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-2 hover:bg-[#f7faff] hover:text-[#2e66a6]"
          >
            <FontAwesomeIcon icon={faLink} /> Link
          </button>

          <button
            type="button"
            onClick={() => openCreateWith('topic')}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-2 hover:bg-[#f7faff] hover:text-[#2e66a6]"
          >
            <FontAwesomeIcon icon={faHashtag} /> Topic
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-black/45">
          <FontAwesomeIcon icon={faSpinner} spin className="mr-2" /> Loading posts...
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-2xl border border-[#e6edf5] bg-white py-20 text-center">
          <p className="font-semibold">No community posts yet</p>
          <p className="mt-1 text-sm text-black/50">Be the first to share something with the community.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => {
            const name = getDisplayName(post.author);
            const authorId = getUserId(post.author);
            const isOwner = authorId === currentUserId;
            const liked = typeof post.likedByCurrentUser === 'boolean'
              ? post.likedByCurrentUser
              : (post.likes || []).some((id) => String(id?._id || id) === currentUserId);

            return (
              <article key={post._id} className="relative rounded-2xl border border-[#e6edf5] bg-white p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <Avatar user={post.author} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-black">
                      {name}{isOwner ? ' (You)' : ''}
                    </p>
                    <p className="text-xs text-black/45">
                      {post.author?.role === 'employer'
                        ? post.author?.employerProfile?.companyName || 'Employer'
                        : post.author?.jobSeekerLevel || 'First Time Job Seeker'}
                      {' · '}
                      {formatTime(post.createdAt)}
                    </p>
                  </div>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setActiveMenu((value) => (value === post._id ? '' : post._id))}
                      className="flex h-9 w-9 items-center justify-center rounded-full text-black/50 hover:bg-[#f7faff]"
                      aria-label="Post actions"
                    >
                      <FontAwesomeIcon icon={faEllipsisVertical} />
                    </button>

                    {activeMenu === post._id && (
                      <div className="absolute right-0 top-10 z-20 w-40 rounded-xl border border-[#e6edf5] bg-white p-1.5 shadow-xl">
                        {isOwner ? (
                          <>
                            <button type="button" onClick={() => openEditPost(post)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-[#f7faff]">
                              <FontAwesomeIcon icon={faPen} className="w-4" /> Edit Post
                            </button>
                            <button type="button" onClick={() => deletePost(post)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50">
                              <FontAwesomeIcon icon={faTrash} className="w-4" /> Delete Post
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setReportTarget({ type: 'post', postId: post._id, name });
                              setActiveMenu('');
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                          >
                            <FontAwesomeIcon icon={faFlag} className="w-4" /> Report Post
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-black/75">{post.content}</p>

                {post.topics?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {post.topics.map((topic) => (
                      <span key={topic} className="rounded-full bg-[#f1edff] px-3 py-1 text-xs font-medium text-[#6350a8]">
                        #{String(topic).replace(/^#/, '')}
                      </span>
                    ))}
                  </div>
                )}

                {post.linkUrl && (() => {
                  const link = getLinkDetails(post.linkUrl);
                  return (
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex max-w-full items-center gap-2 text-sm font-medium text-[#6f5bd3] transition hover:text-[#5140b5] hover:underline"
                      title={link.url}
                    >
                      <FontAwesomeIcon
                        icon={faArrowUpRightFromSquare}
                        className="shrink-0 text-sm"
                      />
                      <span className="min-w-0 truncate">
                        Source: {link.label}
                      </span>
                    </a>
                  );
                })()}
                {(() => {
                  const postImages = (
                    Array.isArray(post.imageUrls) && post.imageUrls.length
                      ? post.imageUrls
                      : [post.imageUrl].filter(Boolean)
                  );

                  if (!postImages.length && !post.videoUrl && !(post.documents || []).length) {
                    return null;
                  }

                  return (
                    <div className="mt-4">
                      {postImages.length > 0 && (
                        <div className={`grid gap-2 ${postImages.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                          {postImages.slice(0, 10).map((image, imageIndex) => (
                            <img
                              key={`${image}-${imageIndex}`}
                              src={resolveMediaUrl(image)}
                              alt={`Community post ${imageIndex + 1}`}
                              className="max-h-[460px] h-full w-full rounded-xl object-cover"
                            />
                          ))}
                        </div>
                      )}

                      {post.videoUrl && (
                        <video
                          src={resolveMediaUrl(post.videoUrl)}
                          controls
                          preload="metadata"
                          className="mt-3 max-h-[520px] w-full rounded-xl bg-black"
                        />
                      )}

                      {(post.documents || []).length > 0 && (
                        <div className="mt-3 space-y-2">
                          {post.documents.map((documentItem, documentIndex) => (
                            <a
                              key={`${documentItem.url}-${documentIndex}`}
                              href={resolveMediaUrl(documentItem.url)}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-3 rounded-xl border border-[#d8e2ee] bg-[#f8fbff] px-4 py-3 text-sm font-semibold text-[#2e66a6] hover:border-[#2e66a6]"
                            >
                              <FontAwesomeIcon icon={faFileArrowUp} />
                              <span className="min-w-0 truncate">
                                {documentItem.name || `Document ${documentIndex + 1}`}
                              </span>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}

                <div className="mt-4 flex items-center gap-6 border-t border-[#eef2f7] pt-4 text-sm text-black/50">
                  <button
                    type="button"
                    onClick={() => toggleLike(post._id)}
                    disabled={likeLoading[post._id]}
                    className={`transition hover:text-[#2e66a6] disabled:opacity-60 ${liked ? 'text-red-500' : ''}`}
                    aria-label={liked ? 'Unlike post' : 'Like post'}
                  >
                    <FontAwesomeIcon icon={faHeart} className="mr-2" />
                    {post.likes?.length || 0}
                  </button>

                  <button type="button" onClick={() => openCommentsModal(post)} className="transition hover:text-[#2e66a6]" aria-label="Show comments">
                    <FontAwesomeIcon icon={faComment} className="mr-2" />
                    {post.commentsCount ?? post.comments?.length ?? 0}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 p-4">
          <div className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#e6edf5] bg-white px-6 py-5">
              <h2 className="text-xl font-bold">{editingPost ? 'Edit Post' : 'Create Post'}</h2>
              <button type="button" onClick={closeCreateModal} className="h-9 w-9 rounded-full hover:bg-[#f7faff]" aria-label="Close">
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>

            <div className="p-6">
              <div className="mb-5 flex items-center gap-3">
                <Avatar user={currentUser} />
                <div>
                  <p className="font-bold">{getDisplayName(currentUser)}</p>
                  <p className="text-sm text-black/45">Posting to Community</p>
                </div>
              </div>

              <p className="mb-2 text-sm font-semibold">Category</p>
              <div className="mb-5 flex flex-wrap gap-2">
                {createCategories.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, category: item.key }))}
                    className={`rounded-full px-4 py-2 text-sm ${
                      form.category === item.key ? 'bg-[#2e66a6] text-white' : 'bg-[#f7faff] text-black/65'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <label className="mb-2 block text-sm font-semibold">Post</label>
              <textarea
                value={form.content}
                onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))}
                placeholder="Share something with the community..."
                rows={6}
                className="w-full resize-none rounded-xl border border-[#d8e2ee] p-4 text-sm outline-none focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/20"
              />

              {photoPreviews.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {photoPreviews.map((preview, index) => (
                    <div
                      key={`${preview.url}-${index}`}
                      className="relative overflow-hidden rounded-xl border border-[#e6edf5]"
                    >
                      <img
                        src={preview.url}
                        alt={preview.name || `Post preview ${index + 1}`}
                        className="h-36 w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removePhotoPreview(index)}
                        className="absolute right-2 top-2 h-8 w-8 rounded-full bg-white/95 shadow"
                        aria-label={`Remove image ${index + 1}`}
                      >
                        <FontAwesomeIcon icon={faXmark} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {videoPreview && (
                <div className="relative mt-4 overflow-hidden rounded-xl border border-[#e6edf5] bg-black">
                  <video src={videoPreview} controls className="max-h-80 w-full" />
                  <button
                    type="button"
                    onClick={() => {
                      if (videoPreview?.startsWith('blob:')) URL.revokeObjectURL(videoPreview);
                      setVideoPreview('');
                      setSelectedVideo(null);
                      setVideoDuration(0);
                    }}
                    className="absolute right-2 top-2 h-9 w-9 rounded-full bg-white/95 shadow"
                    aria-label="Remove video"
                  >
                    <FontAwesomeIcon icon={faXmark} />
                  </button>
                </div>
              )}

              {(existingDocuments.length > 0 || selectedDocuments.length > 0) && (
                <div className="mt-4 space-y-2">
                  {existingDocuments.map((documentItem, index) => (
                    <div
                      key={`${documentItem.url}-${index}`}
                      className="flex items-center justify-between gap-3 rounded-xl border border-[#d8e2ee] bg-[#f8fbff] px-4 py-3"
                    >
                      <a
                        href={resolveMediaUrl(documentItem.url)}
                        target="_blank"
                        rel="noreferrer"
                        className="min-w-0 truncate text-sm font-medium text-[#2e66a6] hover:underline"
                      >
                        {documentItem.name || 'Existing document'}
                      </a>
                      <button
                        type="button"
                        onClick={() => setExistingDocuments((prev) => (
                          prev.filter((_, itemIndex) => itemIndex !== index)
                        ))}
                        className="h-8 w-8 shrink-0 rounded-full hover:bg-red-50 hover:text-red-600"
                        aria-label={`Remove ${documentItem.name || 'document'}`}
                      >
                        <FontAwesomeIcon icon={faXmark} />
                      </button>
                    </div>
                  ))}
                  {selectedDocuments.map((documentFile, index) => (
                    <div
                      key={`${documentFile.name}-${index}`}
                      className="flex items-center justify-between gap-3 rounded-xl border border-[#d8e2ee] bg-[#f8fbff] px-4 py-3"
                    >
                      <span className="min-w-0 truncate text-sm font-medium">
                        {documentFile.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedDocuments((prev) => (
                          prev.filter((_, itemIndex) => itemIndex !== index)
                        ))}
                        className="h-8 w-8 shrink-0 rounded-full hover:bg-red-50 hover:text-red-600"
                        aria-label={`Remove ${documentFile.name}`}
                      >
                        <FontAwesomeIcon icon={faXmark} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {showLinkInput && (
                <div className="mt-4">
                  <label className="mb-1.5 block text-sm font-semibold">Link</label>
                  <input
                    ref={linkInputRef}
                    value={form.linkUrl}
                    onChange={(event) => setForm((prev) => ({ ...prev, linkUrl: event.target.value }))}
                    placeholder="Paste website or article link"
                    className="h-11 w-full rounded-xl border border-[#d8e2ee] px-4 text-sm outline-none focus:border-[#2e66a6]"
                  />
                </div>
              )}

              {showTopicInput && (
                <div className="mt-4">
                  <label className="mb-1 block text-sm font-semibold">Topic <span className="font-normal text-black/45">(Optional)</span></label>

                  <div className="flex overflow-hidden rounded-xl border border-[#d8e2ee] bg-white focus-within:border-[#2e66a6] focus-within:ring-2 focus-within:ring-[#2e66a6]/20">
                    <input
                      ref={topicInputRef}
                      value={topicDraft}
                      onChange={(event) => setTopicDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          addTopic();
                        }
                      }}
                      placeholder="Type a topic"
                      className="h-11 min-w-0 flex-1 px-4 text-sm outline-none"
                    />
                    <button
                      type="button"
                      onClick={addTopic}
                      disabled={!topicDraft.trim()}
                      className="m-1 rounded-lg bg-[#2e66a6] px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Add
                    </button>
                  </div>

                  {getTopicList().length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {getTopicList().map((topic) => (
                        <span
                          key={topic}
                          className="inline-flex items-center gap-2 rounded-full border border-[#cfe0f4] bg-[#eef5fd] px-3 py-1.5 text-sm font-medium text-[#2e66a6]"
                        >
                          #{topic}
                          <button
                            type="button"
                            onClick={() => removeTopic(topic)}
                            className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-[#d9e9fa]"
                            aria-label={`Remove ${topic}`}
                          >
                            <FontAwesomeIcon icon={faXmark} className="text-[10px]" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="mt-5 flex items-center gap-2 border-t border-[#e6edf5] pt-4">
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoChange}
                  className="hidden"
                />
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleVideoChange}
                  className="hidden"
                />
                <input
                  ref={documentInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.ppt,.pptx"
                  multiple
                  onChange={handleDocumentChange}
                  className="hidden"
                />
                <button type="button" onClick={() => photoInputRef.current?.click()} className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-[#f7faff]" aria-label="Add photo" title="Up to 10 images">
                  <FontAwesomeIcon icon={faImage} />
                </button>
                <button
                  type="button"
                  onClick={() => videoInputRef.current?.click()}
                  className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-[#f7faff]"
                  aria-label="Add video"
                  title="Upload 1 video, maximum 10 minutes"
                >
                  <FontAwesomeIcon icon={faVideo} />
                </button>
                <button
                  type="button"
                  onClick={() => documentInputRef.current?.click()}
                  className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-[#f7faff]"
                  aria-label="Add document"
                  title="Upload PDF, DOC, DOCX, PPT, or PPTX"
                >
                  <FontAwesomeIcon icon={faFileArrowUp} />
                </button>
                <button type="button" onClick={() => setShowLinkInput((value) => !value)} className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-[#f7faff]" aria-label="Add link">
                  <FontAwesomeIcon icon={faLink} />
                </button>
                <button type="button" onClick={() => setShowTopicInput(true)} className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-[#f7faff]" aria-label="Add topic">
                  <FontAwesomeIcon icon={faHashtag} />
                </button>
              </div>
            </div>

            <div className="flex justify-end border-t border-[#e6edf5] px-6 py-4">
              <button
                type="button"
                onClick={savePost}
                disabled={submitting || !form.content.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-[#2e66a6] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                <FontAwesomeIcon icon={submitting ? faSpinner : faPaperPlane} spin={submitting} />
                {editingPost ? 'Save Changes' : 'Post'}
              </button>
            </div>
          </div>
        </div>
      )}

      {commentsPost && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/55 p-4">
          <div className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#e6edf5] px-5 py-4">
              <h2 className="font-bold">Comments ({commentsPost.commentsCount ?? commentsPost.comments?.length ?? 0})</h2>
              <button
                type="button"
                onClick={() => {
                  setCommentsPost(null);
                  setReplyTarget(null);
                  setCommentDraft('');
                }}
                className="h-9 w-9 rounded-full hover:bg-[#f7faff]"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              {(commentsPost.comments || []).length === 0 ? (
                <p className="py-10 text-center text-sm text-black/45">No comments yet. Be the first to comment.</p>
              ) : (
                commentsPost.comments.map((comment) => {
                  const commentAuthorName = getDisplayName(comment.author);
                  const isCommentOwner = getUserId(comment.author) === currentUserId;
                  const helpful = (comment.helpful || []).some((id) => String(id?._id || id) === currentUserId);
                  const notHelpful = (comment.notHelpful || []).some((id) => String(id?._id || id) === currentUserId);
                  const replyCount = comment.replies?.length || 0;
                  const repliesAreExpanded = Boolean(expandedReplies[comment._id]);

                  return (
                    <div key={comment._id} className="flex gap-3">
                      <Avatar user={comment.author} size="h-9 w-9" />
                      <div className="min-w-0 flex-1">
                        <div className="rounded-xl bg-[#f7faff] px-4 py-3">
                          <p className="text-sm font-bold">{commentAuthorName}{isCommentOwner ? ' (You)' : ''}</p>
                          <p className="mt-1 whitespace-pre-wrap text-sm text-black/70">{comment.content}</p>
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-3 px-2 text-[11px] text-black/45">
                          <span>{formatTime(comment.createdAt)}</span>
                          <button
                            type="button"
                            onClick={() => reactToComment(comment._id, 'helpful')}
                            className={helpful ? 'font-semibold text-[#2e66a6]' : 'hover:text-[#2e66a6]'}
                            aria-label="Helpful"
                          >
                            <FontAwesomeIcon icon={faThumbsUp} className="mr-1" /> {comment.helpful?.length || 0}
                          </button>
                          <button
                            type="button"
                            onClick={() => reactToComment(comment._id, 'notHelpful')}
                            className={notHelpful ? 'font-semibold text-red-500' : 'hover:text-red-500'}
                            aria-label="Not helpful"
                          >
                            <FontAwesomeIcon icon={faThumbsDown} className="mr-1" /> {comment.notHelpful?.length || 0}
                          </button>
                          <button type="button" onClick={() => startReply(comment._id, '', commentAuthorName)} className="hover:text-[#2e66a6]">
                            <FontAwesomeIcon icon={faReply} className="mr-1" /> Reply
                          </button>
                          {isCommentOwner ? (
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => setCommentActionMenu((value) => (
                                  value === `comment-${comment._id}` ? '' : `comment-${comment._id}`
                                ))}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-full hover:bg-[#f7faff]"
                                aria-label="Comment actions"
                              >
                                <FontAwesomeIcon icon={faEllipsisVertical} />
                              </button>

                              {commentActionMenu === `comment-${comment._id}` && (
                                <div className="absolute right-0 top-8 z-40 w-36 rounded-xl border border-[#e6edf5] bg-white p-1.5 shadow-xl">
                                  <button type="button" onClick={() => editComment(comment._id, comment.content)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs hover:bg-[#f7faff]">
                                    <FontAwesomeIcon icon={faPen} /> Edit
                                  </button>
                                  <button type="button" onClick={() => deleteComment(comment._id)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50">
                                    <FontAwesomeIcon icon={faTrash} /> Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setReportTarget({
                                type: 'comment',
                                postId: commentsPost._id,
                                commentId: comment._id,
                                name: commentAuthorName,
                              })}
                              className="hover:text-red-500"
                            >
                              <FontAwesomeIcon icon={faFlag} className="mr-1" /> Report
                            </button>
                          )}
                        </div>

                        {replyCount > 0 && (
                          <button
                            type="button"
                            onClick={() => setExpandedReplies((prev) => ({
                              ...prev,
                              [comment._id]: !prev[comment._id],
                            }))}
                            className="ml-2 mt-2 inline-flex min-h-8 items-center gap-2 rounded-lg px-2 text-sm font-semibold leading-none text-[#2e66a6] transition hover:bg-[#eef5fd]"
                          >
                            <FontAwesomeIcon
                              icon={repliesAreExpanded ? faChevronUp : faChevronDown}
                              className="w-4 shrink-0 text-base"
                            />
                            <span className="leading-none">
                              {repliesAreExpanded
                                ? 'Hide replies'
                                : `View ${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}`}
                            </span>
                          </button>
                        )}

                        {repliesAreExpanded && renderReplyThread(comment)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="border-t border-[#e6edf5] p-4">
              {replyTarget && (
                <div className="mb-2 flex items-center justify-between rounded-lg bg-[#f7faff] px-3 py-2 text-xs text-black/55">
                  <span>
                    Replying to <strong className="text-black/75">{replyTarget.name}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setReplyTarget(null);
                      setCommentDraft('');
                    }}
                    className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-white"
                    aria-label="Cancel reply"
                  >
                    <FontAwesomeIcon icon={faXmark} />
                  </button>
                </div>
              )}

              <div className="flex items-center gap-3">
                <Avatar user={currentUser} size="h-9 w-9" />
                <input
                  id="community-comment-input"
                  value={commentDraft}
                  onChange={(event) => setCommentDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      submitComment();
                    }
                  }}
                  placeholder={replyTarget ? `Reply to ${replyTarget.name}...` : 'Write a comment...'}
                  className="h-10 min-w-0 flex-1 rounded-full border border-[#d8e2ee] px-4 text-sm outline-none focus:border-[#2e66a6]"
                />
                <button type="button" onClick={submitComment} disabled={!commentDraft.trim() || commentLoading} className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2e66a6] text-white disabled:opacity-50">
                  <FontAwesomeIcon icon={commentLoading ? faSpinner : faPaperPlane} spin={commentLoading} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {reportTarget && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#e6edf5] px-5 py-4">
              <div>
                <h2 className="font-bold">Report {reportTarget.type === 'post' ? 'Post' : reportTarget.type === 'reply' ? 'Reply' : 'Comment'}</h2>
                <p className="mt-1 text-xs text-black/45">Why are you reporting this content by {reportTarget.name}?</p>
              </div>
              <button type="button" onClick={() => setReportTarget(null)} className="h-9 w-9 rounded-full hover:bg-[#f7faff]">
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>

            <div className="space-y-3 p-5">
              {reportReasons.map((reason) => (
                <label key={reason.key} className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#e6edf5] p-4 hover:bg-[#f7faff]">
                  <input type="radio" name="reportReason" value={reason.key} checked={reportReason === reason.key} onChange={() => setReportReason(reason.key)} className="mt-1" />
                  <span>
                    <span className="block text-sm font-semibold">{reason.label}</span>
                    <span className="block text-xs text-black/45">{reason.description}</span>
                  </span>
                </label>
              ))}
            </div>

            <div className="flex justify-end gap-3 border-t border-[#e6edf5] px-5 py-4">
              <button type="button" onClick={() => setReportTarget(null)} className="rounded-xl px-4 py-2 text-sm font-semibold hover:bg-[#f7faff]">Cancel</button>
              <button type="button" onClick={submitReport} disabled={!reportReason || reportLoading} className="rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {reportLoading ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showManaged && (
        <div
          className="fixed inset-0 z-[140] flex items-center justify-center bg-black/60 p-3 backdrop-blur-[2px] sm:p-5"
          role="dialog"
          aria-modal="true"
          aria-labelledby="managed-posts-title"
        >
          <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:rounded-3xl">
            <header className="flex shrink-0 items-start justify-between gap-4 border-b border-black/10 bg-white px-5 py-4 sm:px-7 sm:py-5">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#2e66a6] text-white sm:flex">
                    <FontAwesomeIcon icon={managedView === 'archived' ? faBoxArchive : faSliders} />
                  </div>
                  <div className="min-w-0">
                    <h2 id="managed-posts-title" className="text-xl font-bold tracking-tight text-black sm:text-2xl">
                      {managedView === 'archived' ? 'Archive' : 'Manage Your Content'}
                    </h2>
                    <p className="mt-0.5 text-sm text-black/55">
                      {managedView === 'archived'
                        ? 'Hidden from the community feed until restored.'
                        : 'Review, update, or archive your community activity.'}
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowManaged(false)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-transparent text-black/55 transition hover:border-black/10 hover:bg-black/[0.04] hover:text-black"
                aria-label="Close managed content"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </header>

            <div className="shrink-0 border-b border-black/10 bg-[#fbfdff] px-5 py-4 sm:px-7">
              {managedView === 'archived' && (
                <button
                  type="button"
                  onClick={() => setManagedView('active')}
                  className="mb-3 inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-black/15 bg-white px-4 text-sm font-semibold text-black/70 transition hover:border-[#2e66a6]/35 hover:text-[#2e66a6]"
                >
                  <FontAwesomeIcon icon={faArrowLeft} />
                  Back to Active Content
                </button>
              )}

              <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                <label className="block min-w-0 flex-1">
                  <span className="mb-1.5 block text-xs font-semibold text-black/55">Search</span>
                  <div className="relative">
                    <FontAwesomeIcon icon={faSearch} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-black/35" />
                    <input
                      value={managedSearch}
                      onChange={(event) => setManagedSearch(event.target.value)}
                      placeholder={managedView === 'archived' ? 'Search archived posts and comments' : 'Search your posts and comments'}
                      className="h-11 w-full rounded-xl border border-black/15 bg-white pl-10 pr-4 text-sm outline-none transition focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/15"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-black/55">Sort Order</span>
                  <select
                    value={managedSort}
                    onChange={(event) => setManagedSort(event.target.value)}
                    className="h-11 w-full rounded-xl border border-black/15 bg-white px-3.5 text-sm font-medium outline-none focus:border-[#2e66a6] sm:min-w-[145px]"
                  >
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-black/55">Content Type</span>
                  <select
                    value={managedView === 'archived' ? archivedTypeFilter : managedType}
                    onChange={(event) => (
                      managedView === 'archived'
                        ? setArchivedTypeFilter(event.target.value)
                        : setManagedType(event.target.value)
                    )}
                    className="h-11 w-full rounded-xl border border-black/15 bg-white px-3.5 text-sm font-medium outline-none focus:border-[#2e66a6] sm:min-w-[150px]"
                  >
                    <option value="all">All content</option>
                    <option value="posts">Posts only</option>
                    <option value="comments">Comments only</option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-black/55">Category</span>
                  <select
                    value={managedCategory}
                    onChange={(event) => setManagedCategory(event.target.value)}
                    className="h-11 w-full rounded-xl border border-black/15 bg-white px-3.5 text-sm font-medium outline-none focus:border-[#2e66a6] sm:min-w-[145px]"
                  >
                    <option value="all">All categories</option>
                    <option value="insight">Insight</option>
                    <option value="skill">Skill</option>
                    <option value="question">Question</option>
                    <option value="resource">Resource</option>
                  </select>
                </label>

                {managedView === 'active' && (
                  <button
                    type="button"
                    onClick={() => setManagedView('archived')}
                    className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-[#2e66a6]/25 bg-white px-3 text-xs font-semibold text-[#2e66a6] transition hover:bg-[#2e66a6]/[0.05]"
                  >
                    <FontAwesomeIcon icon={faBoxArchive} />
                    View Archived
                    <span className="rounded-full bg-[#2e66a6]/10 px-1.5 py-0.5 text-[10px]">
                      {archivedPosts.length + archivedComments.length}
                    </span>
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-white px-5 py-5 sm:px-7 sm:py-6">
              {managedLoading ? (
                <div className="flex min-h-[320px] flex-col items-center justify-center text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#2e66a6]/10 text-[#2e66a6]">
                    <FontAwesomeIcon icon={faSpinner} spin className="text-lg" />
                  </div>
                  <p className="mt-4 font-semibold text-black">Loading your content</p>
                  <p className="mt-1 text-sm text-black/50">Please wait for a moment.</p>
                </div>
              ) : (
                (() => {
                  const searchValue = managedSearch.trim().toLowerCase();
                  const itemsPerPage = 7;

                  const activeItems = [
                    ...(managedData.posts || []).map((post) => ({
                      key: `post-${post._id}`,
                      type: 'post',
                      category: post.category || '',
                      date: new Date(post.createdAt || 0).getTime(),
                      searchable: [
                        post.content,
                        post.linkUrl,
                        ...(post.topics || []),
                      ].join(' ').toLowerCase(),
                      post,
                    })),
                    ...(managedData.comments || []).map((item) => ({
                      key: `comment-${item.postId}-${item.comment._id}`,
                      type: 'comment',
                      category: item.postCategory || '',
                      date: new Date(item.comment.createdAt || 0).getTime(),
                      searchable: [item.comment.content, item.postContent].join(' ').toLowerCase(),
                      item,
                    })),
                  ]
                    .filter((entry) => managedType === 'all' || entry.type === managedType.replace(/s$/, ''))
                    .filter((entry) => managedCategory === 'all' || entry.category === managedCategory)
                    .filter((entry) => !searchValue || entry.searchable.includes(searchValue))
                    .sort((a, b) => managedSort === 'oldest' ? a.date - b.date : b.date - a.date);

                  const archivedItems = [
                    ...(archivedPosts || []).map((post) => ({
                      key: `archived-post-${post._id}`,
                      type: 'post',
                      category: post.category || '',
                      date: new Date(post.deletedAt || post.updatedAt || 0).getTime(),
                      searchable: [
                        post.content,
                        post.linkUrl,
                        ...(post.topics || []),
                      ].join(' ').toLowerCase(),
                      post,
                    })),
                    ...(archivedComments || []).map((item) => ({
                      key: `archived-comment-${item.postId}-${item.comment._id}`,
                      type: 'comment',
                      category: item.postCategory || '',
                      date: new Date(item.comment.deletedAt || item.comment.updatedAt || 0).getTime(),
                      searchable: [item.comment.content, item.postContent].join(' ').toLowerCase(),
                      item,
                    })),
                  ]
                    .filter((entry) => archivedTypeFilter === 'all' || entry.type === archivedTypeFilter.replace(/s$/, ''))
                    .filter((entry) => managedCategory === 'all' || entry.category === managedCategory)
                    .filter((entry) => !searchValue || entry.searchable.includes(searchValue))
                    .sort((a, b) => managedSort === 'oldest' ? a.date - b.date : b.date - a.date);

                  const sourceItems = managedView === 'archived' ? archivedItems : activeItems;
                  const requestedPage = managedView === 'archived' ? archivedPage : managedPage;
                  const pageCount = Math.max(1, Math.ceil(sourceItems.length / itemsPerPage));
                  const safePage = Math.min(requestedPage, pageCount);
                  const visibleItems = sourceItems.slice(
                    (safePage - 1) * itemsPerPage,
                    safePage * itemsPerPage
                  );
                  const setPage = managedView === 'archived' ? setArchivedPage : setManagedPage;

                  return (
                    <section aria-labelledby="combined-community-content-heading">
                      <div className="mb-4">
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#2e66a6]">
                          {managedView === 'archived' ? 'Archive' : 'Community Activity'}
                        </p>
                        <h3 id="combined-community-content-heading" className="mt-1 text-xl font-bold tracking-tight text-black">
                          {managedView === 'archived'
                            ? (
                              archivedTypeFilter === 'posts'
                                ? 'Archived Posts'
                                : archivedTypeFilter === 'comments'
                                  ? 'Archived Comments'
                                  : 'Archived Posts & Comments'
                            )
                            : (
                              managedType === 'posts'
                                ? 'Your Posts'
                                : managedType === 'comments'
                                  ? 'Your Comments'
                                  : 'Your Posts & Comments'
                            )}
                          <span className="ml-2 rounded-full bg-black/[0.06] px-2.5 py-1 align-middle text-xs font-semibold text-black/55">
                            {sourceItems.length}
                          </span>
                        </h3>
                        <p className="mt-1 text-sm text-black/50">
                          {managedView === 'archived'
                            ? 'Posts and comments you archive will appear here.'
                            : 'Your community posts and comments will appear here.'}
                        </p>
                      </div>

                      <div className="space-y-3">
                        {visibleItems.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-black/15 bg-black/[0.015] px-6 py-12 text-center">
                            <p className="font-semibold text-black">
                              {managedView === 'archived'
                                ? 'No archived posts and comments'
                                : 'No posts and comments found'}
                            </p>
                            <p className="mt-1 text-sm text-black/50">
                              {managedView === 'archived'
                                ? 'Posts and comments you archive will appear here.'
                                : 'Your community posts and comments will appear here.'}
                            </p>
                          </div>
                        ) : visibleItems.map((entry) => {
                          if (entry.type === 'post') {
                            const post = entry.post;
                            const images = (
                              Array.isArray(post.imageUrls) && post.imageUrls.length
                                ? post.imageUrls
                                : [post.imageUrl].filter(Boolean)
                            );

                            return (
                              <article key={entry.key} className="rounded-2xl border border-black/10 bg-white p-4 transition hover:border-[#2e66a6]/25 hover:shadow-[0_5px_20px_rgba(0,0,0,0.05)] sm:p-5">
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                  <div className="min-w-0 flex-1">
                                    <div className="mb-2 flex flex-wrap items-center gap-2">
                                      <span className="rounded-full bg-[#2e66a6]/10 px-2.5 py-1 text-[11px] font-bold text-[#2e66a6]">Post</span>
                                      <span className="rounded-full bg-black/[0.05] px-2.5 py-1 text-[11px] font-semibold capitalize text-black/55">{post.category}</span>
                                    </div>
                                    <p className="whitespace-pre-wrap text-sm leading-6 text-black/75">{post.content}</p>

                                    {(images.length > 0 || post.videoUrl || (post.documents || []).length > 0 || post.linkUrl) && (
                                      <div className="mt-3 rounded-xl border border-[#e6edf5] bg-[#f8fbff] p-3">
                                        {images.length > 0 && (
                                          <div className="flex gap-2 overflow-x-auto">
                                            {images.slice(0, 10).map((image, index) => (
                                              <img
                                                key={`${image}-${index}`}
                                                src={resolveMediaUrl(image)}
                                                alt={`Archived attachment ${index + 1}`}
                                                className="h-20 w-24 shrink-0 rounded-lg object-cover"
                                              />
                                            ))}
                                          </div>
                                        )}
                                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-black/55">
                                          {post.videoUrl && <span className="rounded-full bg-white px-2.5 py-1">1 video</span>}
                                          {(post.documents || []).length > 0 && (
                                            <span className="rounded-full bg-white px-2.5 py-1">{post.documents.length} document(s)</span>
                                          )}
                                          {post.linkUrl && <span className="rounded-full bg-white px-2.5 py-1">Link included</span>}
                                        </div>
                                      </div>
                                    )}

                                    {(post.topics || []).length > 0 && (
                                      <div className="mt-3 flex flex-wrap gap-2">
                                        {post.topics.map((topic) => (
                                          <span key={topic} className="rounded-full bg-[#eef5fd] px-2.5 py-1 text-[11px] font-semibold text-[#2e66a6]">#{topic}</span>
                                        ))}
                                      </div>
                                    )}

                                    <p className="mt-3 text-xs text-black/45">
                                      {managedView === 'archived'
                                        ? `Archived on ${formatArchivedDate(post.deletedAt)}`
                                        : formatTime(post.createdAt)}
                                    </p>
                                  </div>

                                  <div className="flex shrink-0 items-center gap-2 border-t border-black/10 pt-3 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
                                    {managedView === 'archived' ? (
                                      <button
                                        type="button"
                                        onClick={() => restoreArchivedPost(post._id)}
                                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#2e66a6]/25 bg-white px-4 text-sm font-semibold text-[#2e66a6] hover:bg-[#2e66a6]/[0.05]"
                                      >
                                        <FontAwesomeIcon icon={faRotateLeft} /> Restore
                                      </button>
                                    ) : (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => openEditPost(post, true)}
                                          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-black/15 bg-white px-4 text-sm font-semibold text-black/70 hover:text-[#2e66a6]"
                                        >
                                          <FontAwesomeIcon icon={faPen} /> Edit
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => deletePost(post)}
                                          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 text-sm font-semibold text-red-600 hover:bg-red-50"
                                        >
                                          <FontAwesomeIcon icon={faBoxArchive} /> Archive
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </article>
                            );
                          }

                          const item = entry.item;
                          return (
                            <article key={entry.key} className="rounded-2xl border border-black/10 bg-white p-4 transition hover:border-[#2e66a6]/25 hover:shadow-[0_5px_20px_rgba(0,0,0,0.05)] sm:p-5">
                              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0 flex-1">
                                  <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-bold text-violet-700">Comment</span>
                                  <p className="mt-3 text-sm leading-6 text-black/75">{item.comment.content}</p>
                                  <p className="mt-2 line-clamp-2 text-xs text-black/45">
                                    <span className="font-medium text-black/55">On post:</span>{' '}
                                    <span className="text-[#2e66a6]">{item.postContent}</span>
                                  </p>
                                  <p className="mt-2 text-xs text-black/45">
                                    {managedView === 'archived'
                                      ? `Archived on ${formatArchivedDate(item.comment.deletedAt)}`
                                      : formatTime(item.comment.createdAt)}
                                  </p>
                                </div>

                                <div className="flex shrink-0 items-center gap-2 border-t border-black/10 pt-3 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
                                  {managedView === 'archived' ? (
                                    <button
                                      type="button"
                                      onClick={() => restoreArchivedComment(item)}
                                      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#2e66a6]/25 bg-white px-4 text-sm font-semibold text-[#2e66a6] hover:bg-[#2e66a6]/[0.05]"
                                    >
                                      <FontAwesomeIcon icon={faRotateLeft} /> Restore
                                    </button>
                                  ) : (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => editManagedComment(item)}
                                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-black/15 bg-white px-4 text-sm font-semibold text-black/70 hover:text-[#2e66a6]"
                                      >
                                        <FontAwesomeIcon icon={faPen} /> Edit
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => deleteManagedComment(item)}
                                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 text-sm font-semibold text-red-600 hover:bg-red-50"
                                      >
                                        <FontAwesomeIcon icon={faBoxArchive} /> Archive
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </article>
                          );
                        })}
                      </div>

                      {pageCount > 1 && (
                        <nav className="mt-5 flex flex-wrap items-center justify-center gap-2" aria-label="Community content pagination">
                          <button
                            type="button"
                            disabled={safePage === 1}
                            onClick={() => setPage((current) => Math.max(1, current - 1))}
                            className="h-9 rounded-xl border border-black/15 bg-white px-3 text-xs font-semibold text-black/65 disabled:cursor-not-allowed disabled:opacity-35"
                          >
                            Previous
                          </button>
                          {Array.from({ length: pageCount }, (_, index) => index + 1).map((pageNumber) => (
                            <button
                              key={pageNumber}
                              type="button"
                              onClick={() => setPage(pageNumber)}
                              className={`h-9 min-w-9 rounded-xl px-3 text-xs font-semibold ${
                                safePage === pageNumber
                                  ? 'bg-[#2e66a6] text-white'
                                  : 'border border-black/15 bg-white text-black/65'
                              }`}
                            >
                              {pageNumber}
                            </button>
                          ))}
                          <button
                            type="button"
                            disabled={safePage === pageCount}
                            onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
                            className="h-9 rounded-xl border border-black/15 bg-white px-3 text-xs font-semibold text-black/65 disabled:cursor-not-allowed disabled:opacity-35"
                          >
                            Next
                          </button>
                        </nav>
                      )}
                    </section>
                  );
                })()
              )}
            </div>
          </div>
        </div>
      )}

      {editTextModal && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#e6edf5] px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-black">{editTextModal.title}</h2>
                <p className="mt-1 text-sm text-black/45">Update your text, then save the changes.</p>
              </div>
              <button
                type="button"
                onClick={() => !modalActionLoading && setEditTextModal(null)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-black/55 hover:bg-[#f7faff]"
                aria-label="Close edit modal"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>

            <div className="p-6">
              <label className="mb-2 block text-sm font-semibold text-black/75">
                {editTextModal.label}
              </label>
              <textarea
                value={editTextModal.value}
                onChange={(event) => setEditTextModal((prev) => ({
                  ...prev,
                  value: event.target.value,
                }))}
                rows={5}
                autoFocus
                maxLength={2000}
                className="w-full resize-none rounded-xl border border-[#d8e2ee] p-4 text-sm text-black outline-none transition focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/20"
                placeholder={`Write your ${String(editTextModal.label || 'text').toLowerCase()}...`}
              />
              <div className="mt-2 text-right text-xs text-black/40">
                {String(editTextModal.value || '').length}/2000
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-[#e6edf5] bg-[#fbfdff] px-6 py-4">
              <button
                type="button"
                onClick={() => setEditTextModal(null)}
                disabled={modalActionLoading}
                className="h-10 rounded-xl border border-[#d8e2ee] bg-white px-5 text-sm font-semibold text-black/65 hover:bg-[#f7faff] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveEditTextModal}
                disabled={modalActionLoading || !String(editTextModal.value || '').trim()}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#2e66a6] px-5 text-sm font-semibold text-white hover:bg-[#285b94] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FontAwesomeIcon icon={modalActionLoading ? faSpinner : faPaperPlane} spin={modalActionLoading} />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {showFirstTimeGuidelines && (
        <div className="fixed inset-0 z-[260] flex items-center justify-center bg-black/60 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="community-welcome-title"
            className="w-full max-w-[640px] overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="relative px-6 pb-6 pt-7 sm:px-8">
              <button
                type="button"
                onClick={() => navigate('/jobseeker/dashboard')}
                className="absolute right-5 top-4 flex h-9 w-9 items-center justify-center rounded-full text-black/55 hover:bg-black/5"
                aria-label="Leave Community page"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>

              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#eef0ff] text-2xl text-[#4f46e5]">
                <FontAwesomeIcon icon={faShieldHalved} />
              </div>

              <h2 id="community-welcome-title" className="mt-4 text-center text-2xl font-bold text-black">
                Welcome to the Community
              </h2>
              <p className="mt-2 text-center text-sm text-black/55">
                Please help us maintain a safe and professional environment.
              </p>

              <div className="mt-6 space-y-3 rounded-2xl bg-[#f7f9fc] p-5">
                {[
                  'Be respectful to other members.',
                  'Keep discussions career-related.',
                  'Do not post spam, scams, or misleading information.',
                  'Protect your personal information.',
                  'Report content that violates our guidelines.',
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3 text-sm text-black/75">
                    <FontAwesomeIcon icon={faCircleCheck} className="mt-0.5 text-[#5b61ff]" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <p className="mt-6 text-sm leading-6 text-black/50">
                By continuing in the Community, you agree to follow the Community Guidelines. Violations may result in content removal or account restrictions.
              </p>

              <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-2xl border border-[#dfe5ee] p-4 text-sm text-black/75">
                <input
                  type="checkbox"
                  checked={guidelinesAccepted}
                  onChange={(event) => setGuidelinesAccepted(event.target.checked)}
                  className="mt-0.5 h-5 w-5 rounded border-gray-300 accent-[#5b61ff]"
                />
                <span>I have read and agree to follow the Community Guidelines.</span>
              </label>
            </div>

            <div className="flex justify-end gap-3 border-t border-[#e6edf5] bg-[#fbfdff] px-6 py-4 sm:px-8">
              <button
                type="button"
                onClick={() => navigate('/jobseeker/dashboard')}
                disabled={guidelinesSubmitting}
                className="h-11 rounded-xl border border-[#d8e2ee] bg-white px-5 text-sm font-semibold text-black/70 hover:bg-[#f7faff] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={acceptCommunityGuidelines}
                disabled={!guidelinesAccepted || guidelinesSubmitting}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#5b61e6] px-5 text-sm font-semibold text-white hover:bg-[#4f55d5] disabled:cursor-not-allowed disabled:opacity-45"
              >
                {guidelinesSubmitting && <FontAwesomeIcon icon={faSpinner} spin />}
                Agree &amp; Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {showGuidelines && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/60 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="community-guidelines-title"
            className="w-full max-w-[760px] overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="relative max-h-[90vh] overflow-y-auto px-6 pb-7 pt-7 sm:px-8">
              <button
                type="button"
                onClick={() => setShowGuidelines(false)}
                className="absolute right-5 top-4 flex h-9 w-9 items-center justify-center rounded-full text-black/55 hover:bg-black/5"
                aria-label="Close Community Guidelines"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>

              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#eef0ff] text-2xl text-[#4f46e5]">
                <FontAwesomeIcon icon={faShieldHalved} />
              </div>
              <h2 id="community-guidelines-title" className="mt-4 text-center text-2xl font-bold text-black">
                Community Guidelines
              </h2>
              <p className="mt-2 text-center text-sm text-black/55">
                Please help us maintain a safe and professional environment.
              </p>

              <div className="mt-6 grid gap-5 rounded-2xl bg-[#f7f9fc] p-5 sm:grid-cols-2 sm:p-6">
                {[
                  { icon: faShieldHalved, title: 'Be Respectful', text: 'Treat everyone with courtesy. Harassment, hate speech, discrimination, or personal attacks are not allowed.' },
                  { icon: faBriefcase, title: 'Keep It Career-Related', text: 'Share content related to jobs, internships, career advice, interviews, skills, and professional development.' },
                  { icon: faLock, title: 'Protect Your Privacy', text: 'Do not post personal or confidential information such as passwords, bank details, or sensitive personal data.' },
                  { icon: faBan, title: 'No Spam or Promotions', text: 'Avoid excessive self-promotion, advertisements, scams, or misleading content.' },
                  { icon: faCircleCheck, title: 'Share Accurate Information', text: 'Only post information you believe is accurate. Avoid spreading false or misleading job opportunities.' },
                  { icon: faFlag, title: 'Report Inappropriate Content', text: 'Help keep the community safe by reporting posts or comments that violate the guidelines.' },
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-3">
                    <FontAwesomeIcon icon={item.icon} className="mt-1 w-5 shrink-0 text-[#5b61ff]" />
                    <div>
                      <h3 className="font-bold text-black">{item.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-black/55">{item.text}</p>
                    </div>
                  </div>
                ))}
              </div>

              <p className="mt-6 text-sm leading-6 text-black/50">
                By continuing in the Community, you agree to follow the Community Guidelines. Violations may result in content removal or account restrictions.
              </p>
            </div>

            <div className="flex justify-end border-t border-[#e6edf5] bg-[#fbfdff] px-6 py-4 sm:px-8">
              <button
                type="button"
                onClick={() => setShowGuidelines(false)}
                className="h-11 rounded-xl border border-[#d8e2ee] bg-white px-5 text-sm font-semibold text-black/70 hover:bg-[#f7faff]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirmModal && (
        <div className="fixed inset-0 z-[230] flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="p-6 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-2xl text-red-500">
                <FontAwesomeIcon icon={faTriangleExclamation} />
              </div>

              <h2 className="mt-5 text-xl font-bold text-black">
                {deleteConfirmModal.title}
              </h2>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-black/55">
                {deleteConfirmModal.message}
              </p>
            </div>

            <div className="flex justify-center gap-3 border-t border-[#e6edf5] bg-[#fbfdff] px-6 py-4">
              <button
                type="button"
                onClick={() => setDeleteConfirmModal(null)}
                disabled={modalActionLoading}
                className="h-10 min-w-28 rounded-xl border border-[#d8e2ee] bg-white px-5 text-sm font-semibold text-black/65 hover:bg-[#f7faff] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteAction}
                disabled={modalActionLoading}
                className="inline-flex h-10 min-w-36 items-center justify-center gap-2 rounded-xl bg-red-500 px-5 text-sm font-semibold text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FontAwesomeIcon icon={modalActionLoading ? faSpinner : faTrash} spin={modalActionLoading} />
                {deleteConfirmModal.confirmLabel || 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommunityPage;
