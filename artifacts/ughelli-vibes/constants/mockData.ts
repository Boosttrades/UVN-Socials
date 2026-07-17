export type PostCategory =
  | 'News'
  | 'Jobs'
  | 'Events'
  | 'Business'
  | 'Sports'
  | 'Entertainment'
  | 'Health'
  | 'Traffic'
  | 'Emergency'
  | 'Community';

export interface Author {
  id: string;
  name: string;
  handle: string;
  verified: boolean;
  isOrg: boolean;
  initials: string;
  avatarColor: string;
  /** Supabase Storage public URL for the author's profile photo, or null */
  profileImage?: string | null;
}

export interface FeedPost {
  id: string;
  category: PostCategory;
  author: Author;
  headline: string;
  body?: string;
  /** Array of image sources for multi-image posts (up to 3) */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  imageSources?: any[];
  /** @deprecated use imageSources[0] — kept so old callsites don't break */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  imageSource?: any;
  timeAgo: string;
  likes: number;
  comments: number;
  shares: number;
  isLiked: boolean;
  isBookmarked: boolean;
  isSponsored: boolean;
  isBreaking: boolean;
  isEmergency: boolean;
  jobDetails?: { company: string; location: string; salary?: string };
  eventDetails?: { date: string; venue: string };
}

export interface Notification {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'mention' | 'verification' | 'system';
  actor?: string;
  actorInitials?: string;
  actorColor?: string;
  message: string;
  timeAgo: string;
  read: boolean;
}

export interface TrendingTopic {
  id: string;
  tag: string;
  postsCount: string;
  category: PostCategory;
}

export interface DiscoverCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  bgColor: string;
}

export interface Organization {
  id: string;
  name: string;
  handle: string;
  description: string;
  initials: string;
  color: string;
  followers: string;
}

export const CATEGORY_COLORS: Record<PostCategory, { bg: string; text: string; dot: string }> = {
  News: { bg: '#EFF6FF', text: '#1D4ED8', dot: '#3B82F6' },
  Jobs: { bg: '#F5F3FF', text: '#6D28D9', dot: '#7C3AED' },
  Events: { bg: '#FFF7ED', text: '#C2410C', dot: '#EA580C' },
  Business: { bg: '#F0FDFA', text: '#0F766E', dot: '#0D9488' },
  Sports: { bg: '#F0FDF4', text: '#15803D', dot: '#16A34A' },
  Entertainment: { bg: '#FDF2F8', text: '#BE185D', dot: '#DB2777' },
  Health: { bg: '#ECFDF5', text: '#065F46', dot: '#10B981' },
  Traffic: { bg: '#FFFBEB', text: '#B45309', dot: '#D97706' },
  Emergency: { bg: '#FEF2F2', text: '#DC2626', dot: '#DC2626' },
  Community: { bg: '#F0FDF4', text: '#065F46', dot: '#0F8A5F' },
};

export const ALL_CATEGORIES: PostCategory[] = [
  'News', 'Jobs', 'Events', 'Business', 'Sports',
  'Entertainment', 'Health', 'Traffic', 'Emergency', 'Community',
];

export interface Comment {
  id: string;
  postId: string;
  author: Author;
  body: string;
  timeAgo: string;
  likes: number;
  replyTo?: string;
}

// Real comments have no backend yet — new replies on a post are session-local only.

export const DISCOVER_CATEGORIES: DiscoverCategory[] = [
  { id: 'dc1', name: 'News', icon: 'file-text', color: '#1D4ED8', bgColor: '#EFF6FF' },
  { id: 'dc2', name: 'Jobs', icon: 'briefcase', color: '#6D28D9', bgColor: '#F5F3FF' },
  { id: 'dc3', name: 'Events', icon: 'calendar', color: '#C2410C', bgColor: '#FFF7ED' },
  { id: 'dc4', name: 'Business', icon: 'trending-up', color: '#0F766E', bgColor: '#F0FDFA' },
  { id: 'dc5', name: 'Sports', icon: 'activity', color: '#15803D', bgColor: '#F0FDF4' },
  { id: 'dc6', name: 'Entertainment', icon: 'music', color: '#BE185D', bgColor: '#FDF2F8' },
  { id: 'dc7', name: 'Health', icon: 'heart', color: '#065F46', bgColor: '#ECFDF5' },
  { id: 'dc8', name: 'Traffic', icon: 'map', color: '#B45309', bgColor: '#FFFBEB' },
  { id: 'dc9', name: 'Emergency', icon: 'alert-triangle', color: '#DC2626', bgColor: '#FEF2F2' },
  { id: 'dc10', name: 'Community', icon: 'users', color: '#0F8A5F', bgColor: '#F0FDF4' },
];
