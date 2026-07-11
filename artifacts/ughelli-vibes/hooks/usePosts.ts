import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import type { FeedPost, PostCategory } from '@/constants/mockData';

// ─── API shapes ──────────────────────────────────────────────────────────────

export interface ApiPost {
  id: string;
  type: string;
  category: PostCategory | null;
  headline: string;
  body: string | null;
  isEmergency: boolean;
  createdAt: string;
  author: {
    id: string;
    name: string;
    username: string;
  };
}

interface CreatePostInput extends Record<string, unknown> {
  type: string;
  category?: PostCategory;
  headline: string;
  body?: string;
  isEmergency?: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const AVATAR_COLORS = ['#0F8A5F', '#1D4ED8', '#7C3AED', '#DB2777', '#EA580C', '#0D9488', '#D97706'];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function colorForId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function apiPostToFeedPost(post: ApiPost): FeedPost {
  return {
    id: post.id,
    category: post.isEmergency ? 'Emergency' : post.category ?? 'News',
    author: {
      id: post.author.id,
      name: post.author.name,
      handle: post.author.username,
      verified: false,
      isOrg: false,
      initials: getInitials(post.author.name),
      avatarColor: colorForId(post.author.id),
    },
    headline: post.headline,
    body: post.body ?? undefined,
    timeAgo: timeAgo(post.createdAt),
    likes: 0,
    comments: 0,
    shares: 0,
    isBookmarked: false,
    isSponsored: false,
    isBreaking: false,
    isEmergency: post.isEmergency,
  };
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

export const POSTS_QUERY_KEY = ['posts'];

export function useFeed() {
  return useQuery({
    queryKey: POSTS_QUERY_KEY,
    queryFn: () => apiRequest<{ posts: ApiPost[] }>('/posts'),
    select: (data) => data.posts.map(apiPostToFeedPost),
  });
}

export function useCreatePost() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreatePostInput) =>
      apiRequest<{ post: ApiPost }>('/posts', {
        method: 'POST',
        body: input,
        token,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: POSTS_QUERY_KEY });
    },
  });
}
