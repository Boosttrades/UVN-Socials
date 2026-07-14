import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { apiRequest } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import type { Comment, FeedPost, PostCategory } from '@/constants/mockData';

// ─── API shapes ──────────────────────────────────────────────────────────────

export interface ApiPost {
  id: string;
  type: string;
  category: PostCategory | null;
  headline: string;
  body: string | null;
  imageUrl: string | null;
  isEmergency: boolean;
  sharesCount: number;
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  isBookmarked: boolean;
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
  imageUrl?: string;
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
    imageSource: post.imageUrl ? { uri: post.imageUrl } : undefined,
    timeAgo: timeAgo(post.createdAt),
    likes: post.likesCount,
    comments: post.commentsCount,
    shares: post.sharesCount,
    isLiked: post.isLiked,
    isBookmarked: post.isBookmarked,
    isSponsored: false,
    isBreaking: false,
    isEmergency: post.isEmergency,
  };
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

export const POSTS_QUERY_KEY = ['posts'];

interface PostsPage {
  posts: ApiPost[];
  nextCursor: string | null;
}

type PostsInfiniteData = InfiniteData<PostsPage, string | undefined>;

// Feed is paginated (20 posts per page) with keyset cursors so scrolling to
// the bottom loads the next page instead of ever fetching the whole table.
// `select` flattens all loaded pages into a single array, so existing
// callers that just read `data` as a flat list of posts keep working
// unchanged; call `fetchNextPage()` to load more.
export function useFeed() {
  const { token } = useAuth();
  return useInfiniteQuery({
    queryKey: [...POSTS_QUERY_KEY, token ?? null],
    queryFn: ({ pageParam }: { pageParam?: string }) =>
      apiRequest<PostsPage>(`/posts${pageParam ? `?cursor=${encodeURIComponent(pageParam)}` : ''}`, {
        token,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    select: (data) => data.pages.flatMap((page) => page.posts.map(apiPostToFeedPost)),
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

// ─── Likes / bookmarks / shares ──────────────────────────────────────────────

function patchPostInCache(
  queryClient: ReturnType<typeof useQueryClient>,
  postId: string,
  patch: Partial<ApiPost>
) {
  queryClient.setQueriesData<PostsInfiniteData | undefined>(
    { queryKey: POSTS_QUERY_KEY },
    (data) => {
      if (!data) return data;
      return {
        ...data,
        pages: data.pages.map((page) => ({
          ...page,
          posts: page.posts.map((p) => (p.id === postId ? { ...p, ...patch } : p)),
        })),
      };
    }
  );
}

export function useLikePost() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: string) =>
      apiRequest<{ liked: boolean; likesCount: number }>(`/posts/${postId}/like`, {
        method: 'POST',
        token,
      }),
    onMutate: async (postId: string) => {
      // Optimistic toggle so the UI feels instant.
      queryClient.setQueriesData<PostsInfiniteData | undefined>(
        { queryKey: POSTS_QUERY_KEY },
        (data) => {
          if (!data) return data;
          return {
            ...data,
            pages: data.pages.map((page) => ({
              ...page,
              posts: page.posts.map((p) =>
                p.id === postId
                  ? { ...p, isLiked: !p.isLiked, likesCount: p.likesCount + (p.isLiked ? -1 : 1) }
                  : p
              ),
            })),
          };
        }
      );
    },
    onSuccess: (result, postId) => {
      patchPostInCache(queryClient, postId, { isLiked: result.liked, likesCount: result.likesCount });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: POSTS_QUERY_KEY });
    },
  });
}

export function useBookmarkPost() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: string) =>
      apiRequest<{ bookmarked: boolean }>(`/posts/${postId}/bookmark`, {
        method: 'POST',
        token,
      }),
    onMutate: async (postId: string) => {
      queryClient.setQueriesData<PostsInfiniteData | undefined>(
        { queryKey: POSTS_QUERY_KEY },
        (data) => {
          if (!data) return data;
          return {
            ...data,
            pages: data.pages.map((page) => ({
              ...page,
              posts: page.posts.map((p) => (p.id === postId ? { ...p, isBookmarked: !p.isBookmarked } : p)),
            })),
          };
        }
      );
    },
    onSuccess: (result, postId) => {
      patchPostInCache(queryClient, postId, { isBookmarked: result.bookmarked });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: POSTS_QUERY_KEY });
    },
  });
}

export function useSharePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: string) =>
      apiRequest<{ sharesCount: number }>(`/posts/${postId}/share`, { method: 'POST' }),
    onSuccess: (result, postId) => {
      patchPostInCache(queryClient, postId, { sharesCount: result.sharesCount });
    },
  });
}

// ─── Comments ────────────────────────────────────────────────────────────────

export interface ApiComment {
  id: string;
  postId: string;
  body: string;
  replyToHandle: string | null;
  createdAt: string;
  author: {
    id: string;
    name: string;
    username: string;
  };
}

interface CreateCommentInput extends Record<string, unknown> {
  body: string;
  replyToHandle?: string;
}

export function apiCommentToComment(comment: ApiComment): Comment {
  return {
    id: comment.id,
    postId: comment.postId,
    author: {
      id: comment.author.id,
      name: comment.author.name,
      handle: comment.author.username,
      verified: false,
      isOrg: false,
      initials: getInitials(comment.author.name),
      avatarColor: colorForId(comment.author.id),
    },
    body: comment.body,
    timeAgo: timeAgo(comment.createdAt),
    likes: 0,
    replyTo: comment.replyToHandle ?? undefined,
  };
}

export function commentsQueryKey(postId: string) {
  return ['comments', postId];
}

export function useComments(postId: string | undefined) {
  return useQuery({
    queryKey: commentsQueryKey(postId ?? ''),
    queryFn: () => apiRequest<{ comments: ApiComment[] }>(`/posts/${postId}/comments`),
    select: (data) => data.comments.map(apiCommentToComment),
    enabled: !!postId,
  });
}

export function useCreateComment(postId: string | undefined) {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateCommentInput) =>
      apiRequest<{ comment: ApiComment }>(`/posts/${postId}/comments`, {
        method: 'POST',
        body: input,
        token,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: commentsQueryKey(postId ?? '') });
    },
  });
}

// ─── Follow ──────────────────────────────────────────────────────────────────

export interface ApiUserProfile {
  id: string;
  name: string;
  username: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  isFollowing: boolean;
}

export function useUserProfile(username: string | undefined) {
  const { token } = useAuth();
  return useQuery({
    queryKey: ['userProfile', username],
    queryFn: () => apiRequest<{ user: ApiUserProfile }>(`/users/${username}`, { token }),
    select: (data) => data.user,
    enabled: !!username,
  });
}

export function useFollowUser(username: string | undefined) {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiRequest<{ following: boolean; followersCount: number }>(`/users/${username}/follow`, {
        method: 'POST',
        token,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProfile', username] });
    },
  });
}
