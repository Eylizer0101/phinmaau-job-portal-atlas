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
  faShareNodes,
  faXmark,
  faPaperPlane,
  faSpinner,
} from '@fortawesome/free-solid-svg-icons';
import api from '../../../services/api';

const categories = [
  { key: 'all', label: 'All' },
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
  { key: 'opportunity', label: 'Opportunity' },
];

const API_ORIGIN = String(
  process.env.REACT_APP_API_URL || 'https://phinmaau-job-portal-atlas.onrender.com/api'
).replace(/\/api\/?$/, '');

const getDisplayName = (user = {}) => {
  const fullName = String(user.fullName || '').trim();
  if (fullName) return fullName;
  return [user.firstName, user.middleName, user.lastName].filter(Boolean).join(' ').trim() || 'Community Member';
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

const getUserId = (user = {}) => String(user._id || user.id || '');

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
  const [posts, setPosts] = useState([]);
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ content: '', category: 'insight', linkUrl: '', topics: '' });
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [showTopicInput, setShowTopicInput] = useState(false);
  const [openComments, setOpenComments] = useState({});
  const [commentDrafts, setCommentDrafts] = useState({});
  const [commentLoading, setCommentLoading] = useState({});
  const [likeLoading, setLikeLoading] = useState({});
  const [notice, setNotice] = useState('');

  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  }, []);

  const currentUserId = getUserId(currentUser);

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/community/posts', { params: { category, search: search.trim() } });
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

  useEffect(() => () => {
    if (photoPreview?.startsWith('blob:')) URL.revokeObjectURL(photoPreview);
  }, [photoPreview]);

  const resetCreateForm = () => {
    if (photoPreview?.startsWith('blob:')) URL.revokeObjectURL(photoPreview);
    setForm({ content: '', category: 'insight', linkUrl: '', topics: '' });
    setSelectedPhoto(null);
    setPhotoPreview('');
    setShowLinkInput(false);
    setShowTopicInput(false);
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  const closeCreateModal = () => {
    if (submitting) return;
    resetCreateForm();
    setShowCreate(false);
  };

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Image files only ang puwedeng i-upload.');
      event.target.value = '';
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      alert('Maximum image size is 8MB.');
      event.target.value = '';
      return;
    }
    if (photoPreview?.startsWith('blob:')) URL.revokeObjectURL(photoPreview);
    setSelectedPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const createPost = async () => {
    if (!form.content.trim()) return;
    try {
      setSubmitting(true);
      const payload = new FormData();
      payload.append('content', form.content.trim());
      payload.append('category', form.category);
      payload.append('linkUrl', normalizeUrl(form.linkUrl));
      payload.append('topics', form.topics);
      if (selectedPhoto) {
        payload.append('image', selectedPhoto, selectedPhoto.name);
      }

      const response = await api.post('/community/posts', payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data?.success) {
        const createdPost = response.data.data;

        if (selectedPhoto && !createdPost?.imageUrl) {
          throw new Error('The post was created, but the uploaded image URL was not returned.');
        }

        setPosts((prev) => [createdPost, ...prev]);
        resetCreateForm();
        setShowCreate(false);
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to create post.');
    } finally {
      setSubmitting(false);
    }
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
      alert(error.response?.data?.message || 'Failed to update like.');
    } finally {
      setLikeLoading((prev) => ({ ...prev, [postId]: false }));
    }
  };

  const toggleComments = (postId) => {
    setOpenComments((prev) => ({ ...prev, [postId]: !prev[postId] }));
  };

  const submitComment = async (postId) => {
    const content = String(commentDrafts[postId] || '').trim();
    if (!content || commentLoading[postId]) return;
    try {
      setCommentLoading((prev) => ({ ...prev, [postId]: true }));
      const response = await api.post(`/community/posts/${postId}/comments`, { content });
      if (response.data?.success) {
        setPosts((prev) => prev.map((post) => (
          post._id === postId
            ? {
                ...post,
                comments: [...(post.comments || []), response.data.data],
                commentsCount: response.data.commentsCount,
              }
            : post
        )));
        setCommentDrafts((prev) => ({ ...prev, [postId]: '' }));
        setOpenComments((prev) => ({ ...prev, [postId]: true }));
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to add comment.');
    } finally {
      setCommentLoading((prev) => ({ ...prev, [postId]: false }));
    }
  };

  const sharePost = async (post) => {
    const shareUrl = `${window.location.origin}/jobseeker/community?post=${post._id}`;
    const shareData = {
      title: 'AGAPAY Community Post',
      text: post.content,
      url: shareUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
      await navigator.clipboard.writeText(shareUrl);
      setNotice('Post link copied successfully.');
    } catch (error) {
      if (error?.name === 'AbortError') return;
      try {
        await navigator.clipboard.writeText(shareUrl);
        setNotice('Post link copied successfully.');
      } catch {
        alert('Hindi ma-copy ang post link.');
      }
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 pb-12 sm:px-6 lg:px-8">
      {notice && (
        <div className="fixed right-5 top-5 z-[150] rounded-xl bg-[#2e66a6] px-4 py-3 text-sm font-semibold text-white shadow-lg">
          {notice}
        </div>
      )}

      <div className="mb-5 flex flex-col gap-4 border-b border-[#e6edf5] pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate('/jobseeker/messages')} className="h-10 w-10 rounded-xl border border-[#d8e2ee] bg-white hover:bg-[#f7faff]" aria-label="Back to messages">
            <FontAwesomeIcon icon={faArrowLeft} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-black">Community Feed</h1>
            <p className="text-sm text-black/55">Discover insights from fellow graduates</p>
          </div>
        </div>

        <div className="relative w-full sm:w-72">
          <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/35" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search posts" className="h-11 w-full rounded-xl border border-[#d8e2ee] bg-white pl-10 pr-4 text-sm outline-none focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/20" />
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {categories.map((item) => (
          <button key={item.key} type="button" onClick={() => setCategory(item.key)} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${category === item.key ? 'bg-[#2e66a6] text-white' : 'bg-white text-black/60 hover:bg-[#f7faff]'}`}>
            {item.label}
          </button>
        ))}
      </div>

      <button type="button" onClick={() => setShowCreate(true)} className="mb-5 flex w-full items-center gap-3 rounded-2xl border border-[#e6edf5] bg-white p-4 text-left shadow-sm hover:border-[#2e66a6]/30">
        <Avatar user={currentUser} />
        <span className="flex-1 rounded-full bg-[#f7faff] px-4 py-3 text-sm text-black/45">Share an insight or skill...</span>
        <span className="hidden gap-3 text-xs text-black/50 sm:flex"><FontAwesomeIcon icon={faImage} /> Photo <FontAwesomeIcon icon={faLink} /> Link <FontAwesomeIcon icon={faHashtag} /> Topic</span>
      </button>

      {loading ? (
        <div className="py-20 text-center text-black/45"><FontAwesomeIcon icon={faSpinner} spin className="mr-2" /> Loading posts...</div>
      ) : posts.length === 0 ? (
        <div className="rounded-2xl border border-[#e6edf5] bg-white py-20 text-center">
          <p className="font-semibold">No community posts yet</p>
          <p className="mt-1 text-sm text-black/50">Be the first to share something with the community.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => {
            const name = getDisplayName(post.author);
            const liked = typeof post.likedByCurrentUser === 'boolean'
              ? post.likedByCurrentUser
              : (post.likes || []).some((id) => String(id?._id || id) === currentUserId);

            return (
              <article key={post._id} className="rounded-2xl border border-[#e6edf5] bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <Avatar user={post.author} />
                  <div className="min-w-0">
                    <p className="truncate font-bold text-black">{name}</p>
                    <p className="text-xs text-black/45">{post.author?.role === 'employer' ? post.author?.employerProfile?.companyName || 'Employer' : 'Community Member'} · {formatTime(post.createdAt)}</p>
                  </div>
                </div>

                <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-black/75">{post.content}</p>
                {post.topics?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {post.topics.map((topic) => <span key={topic} className="rounded-full bg-[#f1edff] px-3 py-1 text-xs font-medium text-[#6350a8]">#{String(topic).replace(/^#/, '')}</span>)}
                  </div>
                )}
                {post.imageUrl && <img src={resolveMediaUrl(post.imageUrl)} alt="Community post" className="mt-4 max-h-[460px] w-full rounded-xl object-cover" />}
                {post.linkUrl && <a href={normalizeUrl(post.linkUrl)} target="_blank" rel="noreferrer" className="mt-3 block truncate text-sm font-semibold text-[#2e66a6] hover:underline">{post.linkUrl}</a>}

                <div className="mt-4 flex items-center gap-6 border-t border-[#eef2f7] pt-4 text-sm text-black/50">
                  <button type="button" onClick={() => toggleLike(post._id)} disabled={likeLoading[post._id]} className={`transition hover:text-[#2e66a6] disabled:opacity-60 ${liked ? 'text-red-500' : ''}`} aria-label={liked ? 'Unlike post' : 'Like post'}>
                    <FontAwesomeIcon icon={faHeart} className="mr-2" />{post.likes?.length || 0}
                  </button>
                  <button type="button" onClick={() => toggleComments(post._id)} className="transition hover:text-[#2e66a6]" aria-label="Show comments">
                    <FontAwesomeIcon icon={faComment} className="mr-2" />{post.commentsCount ?? post.comments?.length ?? 0}
                  </button>
                  <button type="button" onClick={() => sharePost(post)} className="transition hover:text-[#2e66a6]" aria-label="Share post">
                    <FontAwesomeIcon icon={faShareNodes} />
                  </button>
                </div>

                {openComments[post._id] && (
                  <div className="mt-4 border-t border-[#eef2f7] pt-4">
                    <div className="space-y-3">
                      {(post.comments || []).length === 0 ? (
                        <p className="text-sm text-black/45">No comments yet. Be the first to comment.</p>
                      ) : (
                        post.comments.map((comment) => (
                          <div key={comment._id} className="flex gap-3">
                            <Avatar user={comment.author} size="h-9 w-9" />
                            <div className="min-w-0 flex-1 rounded-xl bg-[#f7faff] px-4 py-3">
                              <div className="flex flex-wrap items-center gap-x-2">
                                <p className="text-sm font-bold text-black">{getDisplayName(comment.author)}</p>
                                <span className="text-xs text-black/40">{formatTime(comment.createdAt)}</span>
                              </div>
                              <p className="mt-1 whitespace-pre-wrap text-sm text-black/70">{comment.content}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="mt-4 flex items-center gap-3">
                      <Avatar user={currentUser} size="h-9 w-9" />
                      <input
                        value={commentDrafts[post._id] || ''}
                        onChange={(event) => setCommentDrafts((prev) => ({ ...prev, [post._id]: event.target.value }))}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' && !event.shiftKey) {
                            event.preventDefault();
                            submitComment(post._id);
                          }
                        }}
                        placeholder="Write a comment..."
                        className="h-10 min-w-0 flex-1 rounded-full border border-[#d8e2ee] bg-white px-4 text-sm outline-none focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/20"
                      />
                      <button type="button" onClick={() => submitComment(post._id)} disabled={!String(commentDrafts[post._id] || '').trim() || commentLoading[post._id]} className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2e66a6] text-white disabled:opacity-50" aria-label="Post comment">
                        <FontAwesomeIcon icon={commentLoading[post._id] ? faSpinner : faPaperPlane} spin={Boolean(commentLoading[post._id])} />
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4">
          <div className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#e6edf5] bg-white px-6 py-5">
              <h2 className="text-xl font-bold">Create Post</h2>
              <button type="button" onClick={closeCreateModal} className="h-9 w-9 rounded-full hover:bg-[#f7faff]" aria-label="Close"><FontAwesomeIcon icon={faXmark} /></button>
            </div>

            <div className="p-6">
              <div className="mb-4 flex items-center gap-3">
                <Avatar user={currentUser} />
                <div><p className="font-bold">{getDisplayName(currentUser)}</p><p className="text-sm text-black/45">Posting to Community</p></div>
              </div>

              <textarea autoFocus value={form.content} onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))} placeholder="What insight or skill would you like to share with the community?" className="min-h-40 w-full resize-none rounded-xl border border-[#e6edf5] p-4 text-sm outline-none focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/20" />

              {photoPreview && (
                <div className="relative mt-4 overflow-hidden rounded-xl border border-[#e6edf5] bg-[#f7faff]">
                  <img src={photoPreview} alt="Selected post preview" className="max-h-80 w-full object-contain" />
                  <button type="button" onClick={() => {
                    if (photoPreview.startsWith('blob:')) URL.revokeObjectURL(photoPreview);
                    setSelectedPhoto(null);
                    setPhotoPreview('');
                    if (photoInputRef.current) photoInputRef.current.value = '';
                  }} className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow" aria-label="Remove photo">
                    <FontAwesomeIcon icon={faXmark} />
                  </button>
                </div>
              )}

              <p className="mt-5 text-sm font-semibold">Category</p>
              <div className="mt-2 flex flex-wrap gap-2">{createCategories.map((item) => <button key={item.key} type="button" onClick={() => setForm((prev) => ({ ...prev, category: item.key }))} className={`rounded-full px-4 py-2 text-sm font-semibold ${form.category === item.key ? 'bg-[#2e66a6] text-white' : 'bg-[#f7faff] text-black/65'}`}>{item.label}</button>)}</div>

              <div className="mt-5 flex items-center gap-2 border-t border-[#eef2f7] pt-4">
                <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={handlePhotoChange} className="hidden" />
                <button type="button" onClick={() => photoInputRef.current?.click()} className={`flex h-10 w-10 items-center justify-center rounded-xl transition ${selectedPhoto ? 'bg-[#2e66a6] text-white' : 'text-black/55 hover:bg-[#f7faff]'}`} aria-label="Add photo" title="Photo">
                  <FontAwesomeIcon icon={faImage} />
                </button>
                <button type="button" onClick={() => setShowLinkInput((prev) => !prev)} className={`flex h-10 w-10 items-center justify-center rounded-xl transition ${showLinkInput || form.linkUrl ? 'bg-[#2e66a6] text-white' : 'text-black/55 hover:bg-[#f7faff]'}`} aria-label="Add link" title="Link">
                  <FontAwesomeIcon icon={faLink} />
                </button>
                <button type="button" onClick={() => setShowTopicInput((prev) => !prev)} className={`flex h-10 w-10 items-center justify-center rounded-xl transition ${showTopicInput || form.topics ? 'bg-[#2e66a6] text-white' : 'text-black/55 hover:bg-[#f7faff]'}`} aria-label="Add topics" title="Topic">
                  <FontAwesomeIcon icon={faHashtag} />
                </button>
              </div>

              {showLinkInput && (
                <div className="relative mt-3">
                  <FontAwesomeIcon icon={faLink} className="absolute left-4 top-1/2 -translate-y-1/2 text-black/35" />
                  <input value={form.linkUrl} onChange={(e) => setForm((prev) => ({ ...prev, linkUrl: e.target.value }))} placeholder="Paste a link (optional)" className="h-11 w-full rounded-xl border border-[#d8e2ee] pl-11 pr-4 text-sm outline-none focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/20" />
                </div>
              )}

              {showTopicInput && (
                <div className="relative mt-3">
                  <FontAwesomeIcon icon={faHashtag} className="absolute left-4 top-1/2 -translate-y-1/2 text-black/35" />
                  <input value={form.topics} onChange={(e) => setForm((prev) => ({ ...prev, topics: e.target.value }))} placeholder="Topics separated by commas" className="h-11 w-full rounded-xl border border-[#d8e2ee] pl-11 pr-4 text-sm outline-none focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/20" />
                </div>
              )}
            </div>

            <div className="sticky bottom-0 flex justify-end border-t border-[#e6edf5] bg-white px-6 py-4">
              <button type="button" disabled={!form.content.trim() || submitting} onClick={createPost} className="rounded-full bg-[#2e66a6] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#25578f] disabled:opacity-50">
                <FontAwesomeIcon icon={submitting ? faSpinner : faPaperPlane} spin={submitting} className="mr-2" /> Post
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommunityPage;
