import React, { useCallback, useEffect, useMemo, useState } from 'react';
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

const getDisplayName = (user = {}) => {
  const fullName = String(user.fullName || '').trim();
  if (fullName) return fullName;
  return [user.firstName, user.middleName, user.lastName].filter(Boolean).join(' ').trim() || 'Community Member';
};

const getInitials = (name) => {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  return `${parts[0]?.[0] || 'C'}${parts[1]?.[0] || ''}`.toUpperCase();
};

const formatTime = (date) => {
  const value = new Date(date);
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

const CommunityPage = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ content: '', category: 'insight', imageUrl: '', linkUrl: '', topics: '' });

  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  }, []);

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

  const createPost = async () => {
    if (!form.content.trim()) return;
    try {
      setSubmitting(true);
      const response = await api.post('/community/posts', form);
      if (response.data?.success) {
        setPosts((prev) => [response.data.data, ...prev]);
        setForm({ content: '', category: 'insight', imageUrl: '', linkUrl: '', topics: '' });
        setShowCreate(false);
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to create post.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 pb-12 sm:px-6 lg:px-8">
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
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#eaf3ff] font-bold text-[#2e66a6]">{getInitials(getDisplayName(currentUser))}</div>
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
            return (
              <article key={post._id} className="rounded-2xl border border-[#e6edf5] bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-[#eaf3ff] font-bold text-[#2e66a6]">
                    {post.author?.profileImage ? <img src={post.author.profileImage} alt={name} className="h-full w-full object-cover" /> : getInitials(name)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-bold text-black">{name}</p>
                    <p className="text-xs text-black/45">{post.author?.role === 'employer' ? post.author?.employerProfile?.companyName || 'Employer' : 'Community Member'} · {formatTime(post.createdAt)}</p>
                  </div>
                </div>

                <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-black/75">{post.content}</p>
                {post.topics?.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{post.topics.map((topic) => <span key={topic} className="rounded-full bg-[#f1edff] px-3 py-1 text-xs font-medium text-[#6350a8]">{topic}</span>)}</div>}
                {post.imageUrl && <img src={post.imageUrl} alt="Community post" className="mt-4 max-h-[460px] w-full rounded-xl object-cover" />}
                {post.linkUrl && <a href={post.linkUrl} target="_blank" rel="noreferrer" className="mt-3 block truncate text-sm font-semibold text-[#2e66a6] hover:underline">{post.linkUrl}</a>}

                <div className="mt-4 flex items-center gap-6 border-t border-[#eef2f7] pt-4 text-sm text-black/50">
                  <button type="button" className="hover:text-[#2e66a6]"><FontAwesomeIcon icon={faHeart} className="mr-2" />{post.likes?.length || 0}</button>
                  <button type="button" className="hover:text-[#2e66a6]"><FontAwesomeIcon icon={faComment} className="mr-2" />{post.commentsCount || 0}</button>
                  <button type="button" className="hover:text-[#2e66a6]"><FontAwesomeIcon icon={faShareNodes} /></button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#e6edf5] px-6 py-5">
              <h2 className="text-xl font-bold">Create Post</h2>
              <button type="button" onClick={() => setShowCreate(false)} className="h-9 w-9 rounded-full hover:bg-[#f7faff]" aria-label="Close"><FontAwesomeIcon icon={faXmark} /></button>
            </div>

            <div className="p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#eaf3ff] font-bold text-[#2e66a6]">{getInitials(getDisplayName(currentUser))}</div>
                <div><p className="font-bold">{getDisplayName(currentUser)}</p><p className="text-sm text-black/45">Posting to Community</p></div>
              </div>

              <textarea autoFocus value={form.content} onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))} placeholder="What insight or skill would you like to share with the community?" className="min-h-40 w-full resize-none rounded-xl border border-[#e6edf5] p-4 text-sm outline-none focus:border-[#2e66a6] focus:ring-2 focus:ring-[#2e66a6]/20" />

              <p className="mt-5 text-sm font-semibold">Category</p>
              <div className="mt-2 flex flex-wrap gap-2">{createCategories.map((item) => <button key={item.key} type="button" onClick={() => setForm((prev) => ({ ...prev, category: item.key }))} className={`rounded-full px-4 py-2 text-sm font-semibold ${form.category === item.key ? 'bg-[#2e66a6] text-white' : 'bg-[#f7faff] text-black/65'}`}>{item.label}</button>)}</div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <input value={form.imageUrl} onChange={(e) => setForm((prev) => ({ ...prev, imageUrl: e.target.value }))} placeholder="Image URL (optional)" className="h-11 rounded-xl border border-[#d8e2ee] px-4 text-sm outline-none focus:border-[#2e66a6]" />
                <input value={form.linkUrl} onChange={(e) => setForm((prev) => ({ ...prev, linkUrl: e.target.value }))} placeholder="Link URL (optional)" className="h-11 rounded-xl border border-[#d8e2ee] px-4 text-sm outline-none focus:border-[#2e66a6]" />
              </div>
              <input value={form.topics} onChange={(e) => setForm((prev) => ({ ...prev, topics: e.target.value }))} placeholder="Topics separated by commas" className="mt-3 h-11 w-full rounded-xl border border-[#d8e2ee] px-4 text-sm outline-none focus:border-[#2e66a6]" />
            </div>

            <div className="flex justify-end border-t border-[#e6edf5] px-6 py-4">
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
