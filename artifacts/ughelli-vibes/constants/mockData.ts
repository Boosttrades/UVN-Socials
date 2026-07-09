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
}

export interface FeedPost {
  id: string;
  category: PostCategory;
  author: Author;
  headline: string;
  body?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  imageSource?: any;
  timeAgo: string;
  likes: number;
  comments: number;
  shares: number;
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

const ORGS: Author[] = [
  { id: 'a1', name: 'Delta State Govt', handle: 'deltagovt', verified: true, isOrg: true, initials: 'DG', avatarColor: '#0F8A5F' },
  { id: 'a2', name: 'Ughelli North LGA', handle: 'ughellinorth', verified: true, isOrg: true, initials: 'UN', avatarColor: '#066A46' },
  { id: 'a3', name: 'Niger Delta Petroleum', handle: 'ndpetroleum', verified: true, isOrg: true, initials: 'NP', avatarColor: '#0D9488' },
  { id: 'a4', name: 'Ughelli FC', handle: 'ughellfc', verified: true, isOrg: true, initials: 'UF', avatarColor: '#16A34A' },
  { id: 'a5', name: 'Delta Health Ministry', handle: 'deltahealth', verified: true, isOrg: true, initials: 'DH', avatarColor: '#10B981' },
  { id: 'a6', name: 'Ughelli Vibes TV', handle: 'ughellivibetv', verified: true, isOrg: true, initials: 'UV', avatarColor: '#0F8A5F' },
];

const INDIVIDUALS: Author[] = [
  { id: 'i1', name: 'Emeka Okafor', handle: 'emekaokafor', verified: false, isOrg: false, initials: 'EO', avatarColor: '#7C3AED' },
  { id: 'i2', name: 'Chioma Eze', handle: 'chiomaeze', verified: true, isOrg: false, initials: 'CE', avatarColor: '#DB2777' },
  { id: 'i3', name: 'Festus Ovuede', handle: 'festusovuede', verified: false, isOrg: false, initials: 'FO', avatarColor: '#EA580C' },
  { id: 'i4', name: 'Ngozi Agbor', handle: 'ngoziagbor', verified: false, isOrg: false, initials: 'NA', avatarColor: '#1D4ED8' },
  { id: 'i5', name: 'Kelechi Amadi', handle: 'kelechiamadi', verified: true, isOrg: false, initials: 'KA', avatarColor: '#D97706' },
];

export const MOCK_FEED: FeedPost[] = [
  {
    id: 'post-emergency-1',
    category: 'Emergency',
    author: ORGS[1],
    headline: 'FLOOD ALERT: Rivers rising in Agbarho — residents in low-lying areas should evacuate immediately',
    body: 'Following heavy overnight rainfall, water levels in the Ethiope River have risen significantly. Ughelli North LGA emergency management urges all residents near Agbarho to move to higher ground now.',
    imageSource: require('../assets/images/hero-city.jpg'),
    timeAgo: '12m ago',
    likes: 84,
    comments: 47,
    shares: 213,
    isBookmarked: false,
    isSponsored: false,
    isBreaking: true,
    isEmergency: true,
  },
  {
    id: 'post-news-1',
    category: 'News',
    author: ORGS[0],
    headline: 'Governor approves ₦4.2 billion for Ughelli–Warri expressway rehabilitation',
    body: 'The rehabilitation will cover 48 km of road and is expected to begin next month. Contractors have been shortlisted and mobilisation funds released.',
    timeAgo: '1h ago',
    likes: 312,
    comments: 89,
    shares: 145,
    isBookmarked: false,
    isSponsored: false,
    isBreaking: true,
    isEmergency: false,
  },
  {
    id: 'post-jobs-1',
    category: 'Jobs',
    author: ORGS[2],
    headline: 'Chevron Nigeria is hiring Production Engineers — apply before August 15',
    body: 'We are seeking qualified petroleum engineers with 3+ years of upstream operations experience. Competitive salary and full benefits package.',
    timeAgo: '2h ago',
    likes: 156,
    comments: 34,
    shares: 98,
    isBookmarked: true,
    isSponsored: false,
    isBreaking: false,
    isEmergency: false,
    jobDetails: { company: 'Chevron Nigeria Ltd', location: 'Ughelli, Delta State', salary: '₦480K/month' },
  },
  {
    id: 'post-events-1',
    category: 'Events',
    author: ORGS[5],
    headline: 'Ughelli Cultural & Arts Festival 2026 — three days of music, food, and heritage',
    body: 'The annual festival returns bigger than ever with 14 local artists, traditional dance groups, craft exhibitions, and a food fair.',
    imageSource: require('../assets/images/hero-city.jpg'),
    timeAgo: '3h ago',
    likes: 445,
    comments: 112,
    shares: 278,
    isBookmarked: false,
    isSponsored: false,
    isBreaking: false,
    isEmergency: false,
    eventDetails: { date: 'Fri Aug 1 – Sun Aug 3', venue: 'Ughelli Township Stadium' },
  },
  {
    id: 'post-sports-1',
    category: 'Sports',
    author: ORGS[3],
    headline: 'Ughelli FC storms into the NPFL playoff with a dominant 3-1 win over Warri Wolves',
    body: 'Goals from Chukwudi, Adeyemi (×2), and a late Warri own-goal sealed the result. The win keeps survival hopes alive.',
    imageSource: require('../assets/images/sports-placeholder.jpg'),
    timeAgo: '5h ago',
    likes: 892,
    comments: 203,
    shares: 412,
    isBookmarked: false,
    isSponsored: false,
    isBreaking: false,
    isEmergency: false,
  },
  {
    id: 'post-business-1',
    category: 'Business',
    author: INDIVIDUALS[0],
    headline: 'New shopping complex opens on Airport Road — 60 shops, food court, and multiplex cinema',
    body: 'The development creates over 400 direct jobs. Grand opening ceremony is Saturday morning with free entry.',
    timeAgo: '6h ago',
    likes: 567,
    comments: 134,
    shares: 189,
    isBookmarked: false,
    isSponsored: false,
    isBreaking: false,
    isEmergency: false,
  },
  {
    id: 'post-sponsored-1',
    category: 'Business',
    author: { id: 's1', name: 'Ughelli Market Online', handle: 'ughellimkt', verified: false, isOrg: true, initials: 'UM', avatarColor: '#0D9488' },
    headline: 'Shop fresh electronics, phones, and accessories at guaranteed lowest prices in Delta State',
    body: 'Visit us on Market Road or order online for next-day delivery anywhere in Ughelli.',
    timeAgo: '8h ago',
    likes: 23,
    comments: 7,
    shares: 12,
    isBookmarked: false,
    isSponsored: true,
    isBreaking: false,
    isEmergency: false,
  },
  {
    id: 'post-health-1',
    category: 'Health',
    author: ORGS[4],
    headline: 'Free medical outreach at General Hospital Ughelli — eye, dental, and BP checks this Saturday',
    body: 'Services include free medications, eye screening, dental consultation, malaria testing, and hypertension checks. Open to all residents, no appointment needed.',
    timeAgo: '10h ago',
    likes: 334,
    comments: 56,
    shares: 201,
    isBookmarked: false,
    isSponsored: false,
    isBreaking: false,
    isEmergency: false,
  },
  {
    id: 'post-traffic-1',
    category: 'Traffic',
    author: INDIVIDUALS[2],
    headline: 'Major gridlock on Ughelli–Sapele Road after tanker accident at Aghalokpe junction',
    body: 'Police and FRSC are on scene. Commuters advised to use Oweh or alternate routes. Clearance expected within 2 hours.',
    timeAgo: '11h ago',
    likes: 78,
    comments: 92,
    shares: 310,
    isBookmarked: false,
    isSponsored: false,
    isBreaking: false,
    isEmergency: false,
  },
  {
    id: 'post-entertainment-1',
    category: 'Entertainment',
    author: INDIVIDUALS[1],
    headline: 'Nollywood star Odunlade Adekola arrives in Ughelli for week-long film shoot at historic sites',
    body: 'The acclaimed actor is filming a new Delta-set feature exploring Niger Delta culture. Locals are invited as paid extras.',
    timeAgo: '1d ago',
    likes: 1204,
    comments: 287,
    shares: 534,
    isBookmarked: false,
    isSponsored: false,
    isBreaking: false,
    isEmergency: false,
  },
  {
    id: 'post-jobs-2',
    category: 'Jobs',
    author: ORGS[1],
    headline: 'Ughelli North LGA seeks secondary school teachers in Maths, English, and Biology',
    body: 'Minimum NCE qualification required. Preference given to indigenes. Application deadline: July 31, 2026.',
    timeAgo: '1d ago',
    likes: 89,
    comments: 43,
    shares: 167,
    isBookmarked: false,
    isSponsored: false,
    isBreaking: false,
    isEmergency: false,
    jobDetails: { company: 'Ughelli North LGA', location: 'Ughelli, Delta State', salary: '₦85K/month' },
  },
  {
    id: 'post-community-1',
    category: 'Community',
    author: INDIVIDUALS[3],
    headline: 'Ughelli Youths Association kicks off campaign to plant 1,000 trees across the LGA by December',
    body: 'The initiative, backed by UNDP, will target schools, hospitals, and roadsides across three LGAs in Delta State.',
    timeAgo: '2d ago',
    likes: 423,
    comments: 78,
    shares: 221,
    isBookmarked: false,
    isSponsored: false,
    isBreaking: false,
    isEmergency: false,
  },
  {
    id: 'post-news-2',
    category: 'News',
    author: ORGS[5],
    headline: 'NNPC restores crude pumping at Ughelli Flow Station after 3-week force majeure',
    body: 'Production is back at approximately 65% capacity. Full resumption expected within two weeks pending pipeline repairs.',
    timeAgo: '2d ago',
    likes: 267,
    comments: 61,
    shares: 88,
    isBookmarked: false,
    isSponsored: false,
    isBreaking: false,
    isEmergency: false,
  },
  {
    id: 'post-sports-2',
    category: 'Sports',
    author: INDIVIDUALS[4],
    headline: 'Ughelli native Oghenerukewe Iyamu qualifies for National Youth Athletics Championships in Abuja',
    body: 'The 17-year-old sprinter clocked a personal best 10.41s in the 100m at the Delta State Trials yesterday.',
    timeAgo: '3d ago',
    likes: 734,
    comments: 95,
    shares: 312,
    isBookmarked: false,
    isSponsored: false,
    isBreaking: false,
    isEmergency: false,
  },
];

export const MOCK_NOTIFICATIONS: Notification[] = [
  { id: 'n1', type: 'system', message: 'Emergency flood alert issued for Agbarho area. Stay safe and follow LGA instructions.', timeAgo: '12m ago', read: false },
  { id: 'n2', type: 'like', actor: 'Chioma Eze', actorInitials: 'CE', actorColor: '#DB2777', message: 'liked your update about the Warri road accident', timeAgo: '1h ago', read: false },
  { id: 'n3', type: 'follow', actor: 'Delta State Govt', actorInitials: 'DG', actorColor: '#0F8A5F', message: 'started following you', timeAgo: '2h ago', read: false },
  { id: 'n4', type: 'comment', actor: 'Festus Ovuede', actorInitials: 'FO', actorColor: '#EA580C', message: 'commented: "This is really needed in our area, thanks for sharing!"', timeAgo: '3h ago', read: true },
  { id: 'n5', type: 'mention', actor: 'Emeka Okafor', actorInitials: 'EO', actorColor: '#7C3AED', message: 'mentioned you in a post about Ughelli FC match results', timeAgo: '5h ago', read: true },
  { id: 'n6', type: 'verification', message: 'Your verification request is under review. Expected response within 48 hours.', timeAgo: '1d ago', read: true },
  { id: 'n7', type: 'like', actor: 'Ughelli North LGA', actorInitials: 'UN', actorColor: '#066A46', message: 'and 47 others liked your post about the Cultural Festival', timeAgo: '1d ago', read: true },
  { id: 'n8', type: 'follow', actor: 'Kelechi Amadi', actorInitials: 'KA', actorColor: '#D97706', message: 'started following you', timeAgo: '2d ago', read: true },
  { id: 'n9', type: 'system', message: 'New: Discover verified local businesses near you in the Discover tab.', timeAgo: '3d ago', read: true },
  { id: 'n10', type: 'comment', actor: 'Ngozi Agbor', actorInitials: 'NA', actorColor: '#1D4ED8', message: 'replied to your comment on the expressway rehabilitation post', timeAgo: '3d ago', read: true },
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

export const MOCK_COMMENTS: Comment[] = [
  // Emergency flood post
  { id: 'c1', postId: 'post-emergency-1', author: INDIVIDUALS[0], body: 'Please everyone in Agbarho, take this seriously. The water rose very fast last time.', timeAgo: '8m ago', likes: 23 },
  { id: 'c2', postId: 'post-emergency-1', author: INDIVIDUALS[3], body: 'My family is already moving. Thank you for the alert Ughelli North LGA.', timeAgo: '6m ago', likes: 14, replyTo: 'emekaokafor' },
  { id: 'c3', postId: 'post-emergency-1', author: ORGS[1], body: 'Emergency shelter is available at the Agbarho Community Hall. Please bring your ID. We are here to help.', timeAgo: '4m ago', likes: 78 },
  { id: 'c4', postId: 'post-emergency-1', author: INDIVIDUALS[2], body: 'Road to Agbarho from Ughelli junction is still passable but drive carefully, there is water on the road.', timeAgo: '2m ago', likes: 9 },
  // News - expressway
  { id: 'c5', postId: 'post-news-1', author: INDIVIDUALS[4], body: 'This road has needed fixing for over 10 years. Let us hope they actually complete it this time.', timeAgo: '45m ago', likes: 88 },
  { id: 'c6', postId: 'post-news-1', author: INDIVIDUALS[1], body: 'Mobilisation funds released is the first step. Monitoring execution is what matters now.', timeAgo: '38m ago', likes: 34 },
  { id: 'c7', postId: 'post-news-1', author: ORGS[5], body: 'We will be tracking this project and reporting updates every two weeks. Follow us for coverage.', timeAgo: '20m ago', likes: 56 },
  // Jobs - Chevron
  { id: 'c8', postId: 'post-jobs-1', author: INDIVIDUALS[2], body: 'What qualifications are required? Is HND accepted or only B.Eng?', timeAgo: '1h ago', likes: 5 },
  { id: 'c9', postId: 'post-jobs-1', author: ORGS[2], body: 'B.Eng minimum is required for this role. Full requirements are on our careers page.', timeAgo: '50m ago', likes: 12, replyTo: 'festusovuede' },
  { id: 'c10', postId: 'post-jobs-1', author: INDIVIDUALS[0], body: 'Finally some oil & gas jobs in Ughelli itself rather than having to relocate to Port Harcourt!', timeAgo: '30m ago', likes: 41 },
];

export const TRENDING_TOPICS: TrendingTopic[] = [
  { id: 't1', tag: '#UghelliFloods', postsCount: '1.2K posts', category: 'Emergency' },
  { id: 't2', tag: '#UghelliFC', postsCount: '890 posts', category: 'Sports' },
  { id: 't3', tag: '#DeltaRoads', postsCount: '654 posts', category: 'News' },
  { id: 't4', tag: '#UghelliJobs2026', postsCount: '432 posts', category: 'Jobs' },
  { id: 't5', tag: '#CulturalFestival', postsCount: '398 posts', category: 'Events' },
  { id: 't6', tag: '#NigerDeltaNews', postsCount: '287 posts', category: 'News' },
  { id: 't7', tag: '#UghelliHealth', postsCount: '201 posts', category: 'Health' },
  { id: 't8', tag: '#DeltaEntertainment', postsCount: '178 posts', category: 'Entertainment' },
];

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

export const VERIFIED_ORGS: Organization[] = [
  { id: 'o1', name: 'Delta State Government', handle: '@deltagovt', description: 'Official Delta State Government communications', initials: 'DG', color: '#0F8A5F', followers: '42.1K' },
  { id: 'o2', name: 'Ughelli North LGA', handle: '@ughellinorth', description: 'Local Government Area official updates and services', initials: 'UN', color: '#066A46', followers: '18.7K' },
  { id: 'o3', name: 'Niger Delta Petroleum', handle: '@ndpetroleum', description: 'Oil & gas industry news for the Niger Delta region', initials: 'NP', color: '#0D9488', followers: '31.4K' },
  { id: 'o4', name: 'Ughelli FC', handle: '@ughellfc', description: 'Official account of Ughelli Football Club — NPFL', initials: 'UF', color: '#16A34A', followers: '24.9K' },
  { id: 'o5', name: 'Delta Health Ministry', handle: '@deltahealth', description: 'Public health alerts, outreach, and wellness programs', initials: 'DH', color: '#10B981', followers: '15.2K' },
];
