import React, { useState } from 'react';
import ImageLightbox from '@/components/ImageLightbox';
import ShareSheet from '@/components/ShareSheet';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useColors } from '@/hooks/useColors';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { CATEGORY_COLORS, type FeedPost } from '@/constants/mockData';
import { commentsQueryKey, useBookmarkPost, useLikePost } from '@/hooks/usePosts';
import { apiRequest } from '@/utils/api';

const IMAGE_CACHE_POLICY = 'memory-disk' as const;
const BLURHASH_PLACEHOLDER = 'L6PZfSi_.AyE_3t7t7R**0o#DgR4';

interface FeedCardProps {
  post: FeedPost;
  onPress?: (post: FeedPost) => void;
}

function formatCount(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toString();
}

export default function FeedCard({ post, onPress }: FeedCardProps) {
  const colors = useColors();
  const { resolvedScheme } = useTheme();
  const isDark = resolvedScheme === 'dark';
  const router = useRouter();
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const likePost = useLikePost();
  const bookmarkPost = useBookmarkPost();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [shareSheetVisible, setShareSheetVisible] = useState(false);

  const liked = post.isLiked;
  const bookmarked = post.isBookmarked;
  const likeCount = post.likes;
  const catColors = CATEGORY_COLORS[post.category];
  const isEmergency = post.isEmergency;

  function handleLike() {
    if (!token) { router.push('/auth/login' as any); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    likePost.mutate(post.id);
  }

  function handleBookmark() {
    if (!token) { router.push('/auth/login' as any); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    bookmarkPost.mutate(post.id);
  }

  function handleCardPress() {
    if (onPress) { onPress(post); return; }
    router.push(`/post/${post.id}` as any);
  }

  function handleComment() {
    router.push(`/post/${post.id}` as any);
  }

  function handlePressIn() {
    queryClient.prefetchQuery({
      queryKey: commentsQueryKey(post.id),
      queryFn: () => apiRequest<{ comments: unknown[] }>(`/posts/${post.id}/comments`),
    });
  }

  function handleShare() {
    if (!token) { router.push('/auth/login' as any); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShareSheetVisible(true);
  }

  // ── Card colours ─────────────────────────────────────────────────────────────
  const cardBg = isEmergency
    ? colors.emergencyBg
    : isDark
    ? 'rgba(15,138,95,0.07)'
    : 'rgba(223,245,234,0.55)';
  const cardBorder = isEmergency
    ? colors.emergency
    : isDark
    ? 'rgba(34,197,139,0.22)'
    : 'rgba(15,138,95,0.25)';
  const divider = isDark ? 'rgba(34,197,139,0.12)' : 'rgba(15,138,95,0.14)';
  const foreground = colors.foreground;
  const mutedFg = colors.mutedForeground;

  // Like button — desaturated sage, distinct from the card green
  const likeActiveBg   = isDark ? 'rgba(143,218,188,0.15)' : 'rgba(95,184,143,0.14)';
  const likeActiveBorder = isDark ? 'rgba(143,218,188,0.35)' : 'rgba(95,184,143,0.38)';
  const likeActiveColor  = isDark ? '#8EDABC' : '#3A8C68';

  return (
    <TouchableOpacity
      activeOpacity={0.95}
      onPress={handleCardPress}
      onPressIn={handlePressIn}
      style={[
        styles.card,
        {
          backgroundColor: cardBg,
          borderColor: cardBorder,
          borderWidth: isEmergency ? 2 : 1,
        },
      ]}

    >
      {/* Left accent strip — WhatsApp bubble feel */}
      {!isEmergency && (
        <View
          style={[
            styles.accentStrip,
            { backgroundColor: isDark ? 'rgba(34,197,139,0.55)' : 'rgba(15,138,95,0.45)' },
          ]}
          pointerEvents="none"
        />
      )}

      {/* Top row: category badge */}
      <View style={styles.topRow}>
        <View style={[styles.categoryBadge, { backgroundColor: catColors.bg }]}>
          {isEmergency && <Feather name="alert-circle" size={10} color={catColors.dot} />}
          {post.isBreaking && !isEmergency && (
            <View style={[styles.dot, { backgroundColor: catColors.dot }]} />
          )}
          <Text style={[styles.categoryText, { color: catColors.text }]}>
            {isEmergency
              ? 'EMERGENCY'
              : post.isBreaking
              ? `BREAKING · ${post.category.toUpperCase()}`
              : post.category.toUpperCase()}
          </Text>
        </View>
        {post.isSponsored && (
          <View style={[styles.sponsoredBadge, {
            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
            borderColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)',
          }]}>
            <Text style={[styles.sponsoredText, { color: mutedFg }]}>Sponsored</Text>
          </View>
        )}
      </View>

      {/* Author */}
      <View style={styles.authorRow}>
        <Pressable
          onPress={() => router.push(`/user/${post.author.handle}` as any)}
          style={[styles.avatar, { backgroundColor: post.author.avatarColor }]}
        >
          {post.author.profileImage ? (
            <Image
              source={{ uri: post.author.profileImage }}
              style={styles.avatarImg}
              contentFit="cover"
              cachePolicy={IMAGE_CACHE_POLICY}
              recyclingKey={`avatar-${post.author.id}`}
            />
          ) : (
            <Text style={styles.avatarText}>{post.author.initials}</Text>
          )}
        </Pressable>
        <View style={styles.authorMeta}>
          <View style={styles.authorNameRow}>
            <Text style={[styles.authorName, { color: foreground }]} numberOfLines={1}>
              {post.author.name}
            </Text>
            {post.author.verified && (
              <View style={[styles.verifiedBadge, { backgroundColor: colors.primary }]}>
                <Feather name="check" size={9} color="#FFFFFF" />
              </View>
            )}
          </View>
          <Text style={[styles.timeAgo, { color: mutedFg }]}>{post.timeAgo}</Text>
        </View>
      </View>

      {/* Headline */}
      <Text
        style={[styles.headline, { color: isEmergency ? (isDark ? '#FCA5A5' : '#7F1D1D') : foreground }]}
        numberOfLines={3}
      >
        {post.headline}
      </Text>

      {/* Body */}
      {post.body ? (
        <Text
          style={[styles.body, { color: isEmergency ? (isDark ? '#F87171' : '#991B1B') : mutedFg }]}
          numberOfLines={2}
        >
          {post.body}
        </Text>
      ) : null}

      {/* Images */}
      {post.imageSources && post.imageSources.length > 0 ? (
        post.imageSources.length === 1 ? (
          <Pressable onPress={(e) => { e.stopPropagation?.(); setLightboxIndex(0); }}>
            <Image
              source={post.imageSources[0]}
              style={styles.image}
              contentFit="contain"
              transition={150}
              cachePolicy={IMAGE_CACHE_POLICY}
              placeholder={{ blurhash: BLURHASH_PLACEHOLDER }}
              recyclingKey={`${post.id}-0`}
            />
          </Pressable>
        ) : (
          <View style={styles.multiImageRow}>
            {post.imageSources.map((src, i) => (
              <Pressable
                key={i}
                style={post.imageSources!.length === 2 ? styles.multiImage2 : styles.multiImage3}
                onPress={(e) => { e.stopPropagation?.(); setLightboxIndex(i); }}
              >
                <Image
                  source={src}
                  style={[styles.multiImage, { width: '100%', height: '100%' }]}
                  contentFit="cover"
                  transition={150}
                  cachePolicy={IMAGE_CACHE_POLICY}
                  placeholder={{ blurhash: BLURHASH_PLACEHOLDER }}
                  recyclingKey={`${post.id}-${i}`}
                />
              </Pressable>
            ))}
          </View>
        )
      ) : null}

      <ImageLightbox
        visible={lightboxIndex !== null}
        uris={(post.imageSources ?? []).map((s) => (typeof s === 'string' ? s : s?.uri ?? ''))}
        initialIndex={lightboxIndex ?? 0}
        onClose={() => setLightboxIndex(null)}
      />

      <ShareSheet
        visible={shareSheetVisible}
        onClose={() => setShareSheetVisible(false)}
        postId={post.id}
        headline={post.headline}
        body={post.body}
      />

      {/* Job details */}
      {post.jobDetails ? (
        <View style={[styles.detailsCard, {
          backgroundColor: isDark ? 'rgba(34,197,139,0.06)' : 'rgba(15,138,95,0.05)',
          borderColor: isDark ? 'rgba(34,197,139,0.15)' : 'rgba(15,138,95,0.12)',
        }]}>
          <View style={styles.detailItem}>
            <Feather name="briefcase" size={12} color={mutedFg} />
            <Text style={[styles.detailText, { color: mutedFg }]}>{post.jobDetails.company}</Text>
          </View>
          <View style={styles.detailItem}>
            <Feather name="map-pin" size={12} color={mutedFg} />
            <Text style={[styles.detailText, { color: mutedFg }]}>{post.jobDetails.location}</Text>
          </View>
          {post.jobDetails.salary ? (
            <View style={styles.detailItem}>
              <Feather name="tag" size={12} color={colors.primary} />
              <Text style={[styles.detailText, { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}>
                {post.jobDetails.salary}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Event details */}
      {post.eventDetails ? (
        <View style={[styles.detailsCard, {
          backgroundColor: isDark ? 'rgba(34,197,139,0.06)' : 'rgba(15,138,95,0.05)',
          borderColor: isDark ? 'rgba(34,197,139,0.15)' : 'rgba(15,138,95,0.12)',
        }]}>
          <View style={styles.detailItem}>
            <Feather name="calendar" size={12} color={mutedFg} />
            <Text style={[styles.detailText, { color: mutedFg }]}>{post.eventDetails.date}</Text>
          </View>
          <View style={styles.detailItem}>
            <Feather name="map-pin" size={12} color={mutedFg} />
            <Text style={[styles.detailText, { color: mutedFg }]}>{post.eventDetails.venue}</Text>
          </View>
        </View>
      ) : null}

      {/* Reaction row */}
      <View style={[styles.reactionRow, { borderTopColor: divider }]}>
        {/* Like — desaturated sage glass, clearly distinct from card tint */}
        <Pressable
          style={[
            styles.reactionBtn,
            liked && {
              backgroundColor: likeActiveBg,
              borderWidth: 1,
              borderColor: likeActiveBorder,
            },
          ]}
          onPress={handleLike}
        >
          <Ionicons
            name={liked ? 'thumbs-up' : 'thumbs-up-outline'}
            size={15}
            color={liked ? likeActiveColor : mutedFg}
          />
          <Text style={[styles.reactionCount, { color: liked ? likeActiveColor : mutedFg }]}>
            {formatCount(likeCount)}
          </Text>
        </Pressable>

        <Pressable style={styles.reactionBtn} onPress={handleComment}>
          <Ionicons name="chatbubble-outline" size={14} color={mutedFg} />
          <Text style={[styles.reactionCount, { color: mutedFg }]}>{formatCount(post.comments)}</Text>
        </Pressable>

        <Pressable style={styles.reactionBtn} onPress={handleShare}>
          <Feather name="share-2" size={14} color={mutedFg} />
          <Text style={[styles.reactionCount, { color: mutedFg }]}>{formatCount(post.shares)}</Text>
        </Pressable>

        <View style={{ flex: 1 }} />

        <Pressable
          style={[styles.reactionBtn, bookmarked && {
            backgroundColor: likeActiveBg,
            borderWidth: 1,
            borderColor: likeActiveBorder,
          }]}
          onPress={handleBookmark}
        >
          <Ionicons
            name={bookmarked ? 'bookmark' : 'bookmark-outline'}
            size={15}
            color={bookmarked ? likeActiveColor : mutedFg}
          />
        </Pressable>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 14,
    marginVertical: 6,
    borderRadius: 20,
    paddingTop: 16,
    paddingBottom: 16,
    paddingLeft: 20,   // extra left room for the accent strip
    paddingRight: 16,
    borderWidth: 1,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#0F8A5F',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.10,
        shadowRadius: 12,
      },
      android: { elevation: 3 },
    }),
  },
  accentStrip: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  categoryBadge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 9, paddingVertical: 4,
    borderRadius: 20, gap: 5,
  },
  dot: { width: 5, height: 5, borderRadius: 2.5 },
  categoryText: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 0.5 },
  sponsoredBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, borderWidth: 1 },
  sponsoredText: { fontSize: 10, fontFamily: 'Inter_400Regular' },
  authorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 9 },
  avatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImg: { width: 34, height: 34, borderRadius: 17 },
  avatarText: { color: '#FFFFFF', fontSize: 11, fontFamily: 'Inter_700Bold' },
  authorMeta: { flex: 1 },
  authorNameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  authorName: { fontSize: 13, fontFamily: 'Inter_600SemiBold', maxWidth: '80%' },
  verifiedBadge: { width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  timeAgo: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 1 },
  headline: { fontSize: 15, fontFamily: 'Inter_700Bold', lineHeight: 22, marginBottom: 5 },
  body: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 19, marginBottom: 10 },
  image: { width: '100%', borderRadius: 14, marginVertical: 10, aspectRatio: 4 / 3 },
  multiImageRow: { flexDirection: 'row', gap: 3, marginVertical: 10, borderRadius: 14, overflow: 'hidden' },
  multiImage: { borderRadius: 0, aspectRatio: 1 },
  multiImage2: { flex: 1 },
  multiImage3: { flex: 1 },
  detailsCard: { borderRadius: 12, borderWidth: 1, padding: 10, marginBottom: 10, gap: 6 },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailText: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  reactionRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTopWidth: 1 },
  reactionBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, paddingHorizontal: 9, borderRadius: 10, gap: 5 },
  reactionCount: { fontSize: 13, fontFamily: 'Inter_500Medium' },
});
