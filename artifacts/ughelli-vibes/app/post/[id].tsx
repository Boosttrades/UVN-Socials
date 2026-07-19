import React, { useRef, useState, useCallback } from 'react';
import ImageLightbox from '@/components/ImageLightbox';
import {
  FlatList,
  Keyboard,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useColors } from '@/hooks/useColors';
import { CATEGORY_COLORS } from '@/constants/mockData';
import { useAuth } from '@/contexts/AuthContext';
import {
  useBookmarkPost,
  useComments,
  useCreateComment,
  useFeed,
  useFollowUser,
  useLikePost,
  useSharePost,
  useUserProfile,
} from '@/hooks/usePosts';

function formatCount(n: number) {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toString();
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, token } = useAuth();
  const { data: posts = [] } = useFeed();

  const post = posts.find((p) => p.id === id);

  const [replyText, setReplyText] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [likedCommentIds, setLikedCommentIds] = useState<Set<string>>(new Set());
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const replyInputRef = useRef<TextInput>(null);

  const { data: comments = [], isLoading: commentsLoading } = useComments(id);
  const createComment = useCreateComment(id);
  const likePost = useLikePost();
  const bookmarkPost = useBookmarkPost();
  const sharePost = useSharePost();
  const { data: authorProfile } = useUserProfile(post?.author.handle);
  const followUser = useFollowUser(post?.author.handle);

  const liked = post?.isLiked ?? false;
  const bookmarked = post?.isBookmarked ?? false;
  const likeCount = post?.likes ?? 0;
  const isOwnPost = !!user && post?.author.id === user.id;

  if (!post) {
    return (
      <View style={[styles.notFound, { backgroundColor: colors.background }]}>
        <Feather name="alert-circle" size={40} color={colors.mutedForeground} />
        <Text style={[styles.notFoundText, { color: colors.mutedForeground }]}>Post not found</Text>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.muted }]}>
          <Text style={[styles.backBtnText, { color: colors.foreground }]}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  // Bind to a guaranteed-non-null const so TS narrows correctly inside closures
  const safePost = post;
  const catColors = CATEGORY_COLORS[safePost.category];
  const isEmergency = safePost.isEmergency;
  const bottomInset = Platform.OS === 'web' ? 0 : insets.bottom;

  function handleLike() {
    if (!token) {
      router.push('/auth/login' as any);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    likePost.mutate(safePost.id);
  }

  function handleBookmark() {
    if (!token) {
      router.push('/auth/login' as any);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    bookmarkPost.mutate(safePost.id);
  }

  function handleFollow() {
    if (!token) {
      router.push('/auth/login' as any);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    followUser.mutate();
  }

  async function handleShare() {
    sharePost.mutate(safePost.id);
    try {
      await Share.share({
        message: `${safePost.headline}\n\nShared via Ughelli Vibes TV`,
        title: safePost.headline,
      });
    } catch {}
  }

  function handleSendReply() {
    const body = replyText.trim();
    if (!body || !user) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    createComment.mutate(
      { body, replyToHandle: replyingTo ?? undefined },
      {
        onError: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        },
      }
    );
    setReplyText('');
    setReplyingTo(null);
    Keyboard.dismiss();
  }

  const ListHeader = (
    <View>
      {/* Post header */}
      <View style={[styles.postHeader, { backgroundColor: isEmergency ? '#FEF2F2' : colors.card, borderBottomColor: colors.border }]}>
        {/* Category */}
        <View style={[styles.categoryBadge, { backgroundColor: catColors.bg }]}>
          {isEmergency && <Feather name="alert-circle" size={11} color={catColors.dot} />}
          <Text style={[styles.categoryText, { color: catColors.text }]}>
            {isEmergency ? 'EMERGENCY' : safePost.isBreaking ? `BREAKING · ${safePost.category.toUpperCase()}` : safePost.category.toUpperCase()}
          </Text>
        </View>

        {/* Author */}
        <View style={styles.authorRow}>
          <Pressable
            onPress={() => router.push(`/user/${safePost.author.handle}` as any)}
            style={[styles.avatar, { backgroundColor: safePost.author.avatarColor }]}
          >
            {safePost.author.profileImage ? (
              <Image
                source={{ uri: safePost.author.profileImage }}
                style={styles.avatarImg}
                contentFit="cover"
                cachePolicy="memory-disk"
              />
            ) : (
              <Text style={styles.avatarText}>{safePost.author.initials}</Text>
            )}
          </Pressable>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[styles.authorName, { color: colors.foreground }]}>{safePost.author.name}</Text>
              {safePost.author.verified && (
                <Feather name="check-circle" size={13} color={colors.primary} style={{ marginLeft: 4 }} />
              )}
            </View>
            <Text style={[styles.handle, { color: colors.mutedForeground }]}>@{safePost.author.handle} · {safePost.timeAgo}</Text>
          </View>
          {!isOwnPost && (
            <TouchableOpacity
              style={[
                styles.followBtn,
                {
                  backgroundColor: authorProfile?.isFollowing ? colors.muted : colors.primary,
                  borderWidth: authorProfile?.isFollowing ? 1 : 0,
                  borderColor: colors.border,
                },
              ]}
              onPress={handleFollow}
              disabled={followUser.isPending}
            >
              <Text
                style={[
                  styles.followBtnText,
                  { color: authorProfile?.isFollowing ? colors.foreground : '#FFFFFF' },
                ]}
              >
                {authorProfile?.isFollowing ? 'Following' : 'Follow'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Full headline */}
        <Text style={[styles.headline, { color: isEmergency ? '#7F1D1D' : colors.foreground }]}>
          {safePost.headline}
        </Text>

        {/* Full body */}
        {safePost.body ? (
          <Text style={[styles.body, { color: isEmergency ? '#991B1B' : colors.mutedForeground }]}>
            {safePost.body}
          </Text>
        ) : null}

        {/* Images (up to 3) — tap to view full screen */}
        {safePost.imageSources && safePost.imageSources.length > 0 ? (
          safePost.imageSources.length === 1 ? (
            <Pressable onPress={() => setLightboxIndex(0)}>
              <Image
                source={safePost.imageSources[0]}
                style={styles.image}
                contentFit="contain"
                transition={150}
                cachePolicy="memory-disk"
                recyclingKey={`${safePost.id}-0`}
              />
            </Pressable>
          ) : (
            <View style={styles.multiImageRow}>
              {safePost.imageSources.map((src, i) => (
                <Pressable key={i} style={safePost.imageSources!.length === 2 ? styles.multiImage2 : styles.multiImage3} onPress={() => setLightboxIndex(i)}>
                  <Image
                    source={src}
                    style={[styles.multiImage, { width: '100%', height: '100%' }]}
                    contentFit="cover"
                    transition={150}
                    cachePolicy="memory-disk"
                    recyclingKey={`${safePost.id}-${i}`}
                  />
                </Pressable>
              ))}
            </View>
          )
        ) : null}

        <ImageLightbox
          visible={lightboxIndex !== null}
          uris={(safePost.imageSources ?? []).map((s) => (typeof s === 'string' ? s : s?.uri ?? ''))}
          initialIndex={lightboxIndex ?? 0}
          onClose={() => setLightboxIndex(null)}
        />

        {/* Job / Event details */}
        {safePost.jobDetails ? (
          <View style={[styles.detailsCard, { backgroundColor: colors.muted }]}>
            <View style={styles.detailRow}><Feather name="briefcase" size={13} color={colors.mutedForeground} /><Text style={[styles.detailText, { color: colors.mutedForeground }]}>{safePost.jobDetails.company}</Text></View>
            <View style={styles.detailRow}><Feather name="map-pin" size={13} color={colors.mutedForeground} /><Text style={[styles.detailText, { color: colors.mutedForeground }]}>{safePost.jobDetails.location}</Text></View>
            {safePost.jobDetails.salary && <View style={styles.detailRow}><Feather name="tag" size={13} color={colors.primary} /><Text style={[styles.detailText, { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}>{safePost.jobDetails.salary}</Text></View>}
            <TouchableOpacity
              style={[styles.applyBtn, { backgroundColor: colors.primary }]}
              onPress={() => {
                const company = safePost.jobDetails?.company ?? 'the company';
                Share.share({
                  message: `Job opportunity at ${company}: ${safePost.headline}\n\nShared via Ughelli Vibes TV`,
                  title: safePost.headline,
                });
              }}
            >
              <Text style={styles.applyBtnText}>Apply Now</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        {safePost.eventDetails ? (
          <View style={[styles.detailsCard, { backgroundColor: colors.muted }]}>
            <View style={styles.detailRow}><Feather name="calendar" size={13} color={colors.mutedForeground} /><Text style={[styles.detailText, { color: colors.mutedForeground }]}>{safePost.eventDetails.date}</Text></View>
            <View style={styles.detailRow}><Feather name="map-pin" size={13} color={colors.mutedForeground} /><Text style={[styles.detailText, { color: colors.mutedForeground }]}>{safePost.eventDetails.venue}</Text></View>
          </View>
        ) : null}

        {/* Stat row */}
        <View style={[styles.statBar, { borderTopColor: colors.border, borderBottomColor: colors.border }]}>
          <Text style={[styles.statText, { color: colors.mutedForeground }]}>
            <Text style={{ color: colors.foreground, fontFamily: 'Inter_600SemiBold' }}>{formatCount(likeCount)}</Text> likes
          </Text>
          <Text style={[styles.statText, { color: colors.mutedForeground }]}>
            <Text style={{ color: colors.foreground, fontFamily: 'Inter_600SemiBold' }}>{formatCount(comments.length)}</Text> comments
          </Text>
          <Text style={[styles.statText, { color: colors.mutedForeground }]}>
            <Text style={{ color: colors.foreground, fontFamily: 'Inter_600SemiBold' }}>{formatCount(safePost.shares)}</Text> shares
          </Text>
        </View>

        {/* Action row */}
        <View style={styles.actionRow}>
          <Pressable style={styles.actionBtn} onPress={handleLike} accessibilityLabel="Like post" accessibilityRole="button">
            <Ionicons name={liked ? 'thumbs-up' : 'thumbs-up-outline'} size={20} color={liked ? colors.primary : colors.mutedForeground} />
            <Text style={[styles.actionText, { color: liked ? colors.primary : colors.mutedForeground }]}>Like</Text>
          </Pressable>
          <Pressable style={styles.actionBtn} onPress={() => replyInputRef.current?.focus()} accessibilityLabel="Comment" accessibilityRole="button">
            <Ionicons name="chatbubble-outline" size={19} color={colors.mutedForeground} />
            <Text style={[styles.actionText, { color: colors.mutedForeground }]}>Comment</Text>
          </Pressable>
          <Pressable style={styles.actionBtn} onPress={handleShare} accessibilityLabel="Share post" accessibilityRole="button">
            <Feather name="share-2" size={19} color={colors.mutedForeground} />
            <Text style={[styles.actionText, { color: colors.mutedForeground }]}>Share</Text>
          </Pressable>
          <Pressable style={styles.actionBtn} onPress={handleBookmark} accessibilityLabel="Bookmark post" accessibilityRole="button">
            <Ionicons name={bookmarked ? 'bookmark' : 'bookmark-outline'} size={20} color={bookmarked ? colors.primary : colors.mutedForeground} />
            <Text style={[styles.actionText, { color: bookmarked ? colors.primary : colors.mutedForeground }]}>Save</Text>
          </Pressable>
        </View>
      </View>

      {/* Comments header */}
      <View style={[styles.commentsHeader, { borderBottomColor: colors.border }]}>
        <Text style={[styles.commentsTitle, { color: colors.foreground }]}>
          {comments.length} Comments
        </Text>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Nav bar */}
      <View style={[styles.navbar, { paddingTop: Platform.OS === 'web' ? 67 : insets.top, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backIcon} hitSlop={8} accessibilityLabel="Go back" accessibilityRole="button">
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.navTitle, { color: colors.foreground }]}>Post</Text>
        <Pressable onPress={handleShare} hitSlop={8} accessibilityLabel="Share" accessibilityRole="button">
          <Feather name="share-2" size={20} color={colors.foreground} />
        </Pressable>
      </View>

      <FlatList
        data={comments}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          commentsLoading ? (
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Loading comments…</Text>
          ) : (
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No comments yet — be the first to reply.</Text>
          )
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomInset + 80 }}
        renderItem={({ item }) => (
          <View style={[styles.commentItem, { borderBottomColor: colors.border }]}>
            <View style={[styles.commentAvatar, { backgroundColor: item.author.avatarColor }]}>
              <Text style={styles.commentAvatarText}>{item.author.initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.commentNameRow}>
                <Text style={[styles.commentName, { color: colors.foreground }]}>{item.author.name}</Text>
                {item.author.verified && <Feather name="check-circle" size={11} color={colors.primary} style={{ marginLeft: 3 }} />}
                <Text style={[styles.commentTime, { color: colors.mutedForeground }]}> · {item.timeAgo}</Text>
              </View>
              {item.replyTo && (
                <Text style={[styles.replyToLabel, { color: colors.mutedForeground }]}>
                  Replying to @{item.replyTo}
                </Text>
              )}
              <Text style={[styles.commentBody, { color: colors.foreground }]}>{item.body}</Text>
              <View style={styles.commentActions}>
                <Pressable style={styles.commentActionBtn} onPress={() => setReplyingTo(item.author.handle)}>
                  <Feather name="corner-up-left" size={13} color={colors.mutedForeground} />
                  <Text style={[styles.commentActionText, { color: colors.mutedForeground }]}>Reply</Text>
                </Pressable>
                <Pressable
                  style={styles.commentActionBtn}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setLikedCommentIds((prev) => {
                      const next = new Set(prev);
                      next.has(item.id) ? next.delete(item.id) : next.add(item.id);
                      return next;
                    });
                  }}
                >
                  <Ionicons
                    name={likedCommentIds.has(item.id) ? 'thumbs-up' : 'thumbs-up-outline'}
                    size={13}
                    color={likedCommentIds.has(item.id) ? colors.primary : colors.mutedForeground}
                  />
                  <Text style={[styles.commentActionText, { color: likedCommentIds.has(item.id) ? colors.primary : colors.mutedForeground }]}>
                    {item.likes + (likedCommentIds.has(item.id) ? 1 : 0)}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
      />

      {/* Reply input */}
      <View style={[styles.replyBar, { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: bottomInset + 8 }]}>
        {replyingTo && (
          <View style={[styles.replyingToBar, { backgroundColor: colors.muted }]}>
            <Text style={[styles.replyingToText, { color: colors.mutedForeground }]}>
              Replying to <Text style={{ color: colors.primary }}>@{replyingTo}</Text>
            </Text>
            <Pressable onPress={() => setReplyingTo(null)} hitSlop={8}>
              <Feather name="x" size={14} color={colors.mutedForeground} />
            </Pressable>
          </View>
        )}
        <View style={styles.replyRow}>
          <View style={[styles.myAvatar, { backgroundColor: '#066A46' }]}>
            <Text style={styles.myAvatarText}>{user ? getInitials(user.name) : '?'}</Text>
          </View>
          <TextInput
            ref={replyInputRef}
            value={replyText}
            onChangeText={setReplyText}
            placeholder="Add a comment..."
            placeholderTextColor={colors.mutedForeground}
            style={[styles.replyInput, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
            multiline
            maxLength={500}
          />
          <Pressable
            onPress={handleSendReply}
            disabled={!replyText.trim() || createComment.isPending}
            style={[styles.sendBtn, { backgroundColor: replyText.trim() && !createComment.isPending ? colors.primary : colors.muted }]}
            accessibilityLabel="Send comment"
            accessibilityRole="button"
          >
            <Feather name="send" size={16} color={replyText.trim() && !createComment.isPending ? '#FFFFFF' : colors.mutedForeground} />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backIcon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  navTitle: { fontSize: 17, fontFamily: 'Inter_700Bold' },
  postHeader: { padding: 16 },
  categoryBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20,
    alignSelf: 'flex-start', marginBottom: 14,
  },
  categoryText: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 0.4 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImg: { width: 44, height: 44, borderRadius: 22 },
  avatarText: { color: '#FFFFFF', fontSize: 14, fontFamily: 'Inter_700Bold' },
  authorName: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  handle: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  followBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  followBtnText: { color: '#FFFFFF', fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  headline: { fontSize: 20, fontFamily: 'Inter_700Bold', lineHeight: 28, marginBottom: 10 },
  body: { fontSize: 15, fontFamily: 'Inter_400Regular', lineHeight: 22, marginBottom: 14 },
  image: { width: '100%', aspectRatio: 4 / 3, borderRadius: 12, marginBottom: 14 },
  multiImageRow: { flexDirection: 'row', gap: 4, marginBottom: 14, borderRadius: 12, overflow: 'hidden' },
  multiImage: { aspectRatio: 1, borderRadius: 0 },
  multiImage2: { flex: 1 },
  multiImage3: { flex: 1 },
  detailsCard: { borderRadius: 12, padding: 12, marginBottom: 14, gap: 8 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  applyBtn: { marginTop: 4, padding: 12, borderRadius: 10, alignItems: 'center' },
  applyBtnText: { color: '#FFFFFF', fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  statBar: {
    flexDirection: 'row', gap: 16,
    borderTopWidth: 1, borderBottomWidth: 1,
    paddingVertical: 10, marginVertical: 6,
  },
  statText: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  actionRow: { flexDirection: 'row', paddingTop: 6 },
  actionBtn: { flex: 1, alignItems: 'center', gap: 5, paddingVertical: 6 },
  actionText: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  commentsHeader: {
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1,
  },
  commentsTitle: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  emptyText: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center', paddingVertical: 24, paddingHorizontal: 16 },
  commentItem: {
    flexDirection: 'row', gap: 10, padding: 14, borderBottomWidth: 1,
  },
  commentAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  commentAvatarText: { color: '#FFFFFF', fontSize: 12, fontFamily: 'Inter_700Bold' },
  commentNameRow: { flexDirection: 'row', alignItems: 'center' },
  commentName: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  commentTime: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  replyToLabel: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 1, marginBottom: 3 },
  commentBody: { fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 20, marginTop: 3 },
  commentActions: { flexDirection: 'row', gap: 16, marginTop: 6 },
  commentActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  commentActionText: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  replyBar: { borderTopWidth: 1, paddingHorizontal: 12, paddingTop: 10 },
  replyingToBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginBottom: 8,
  },
  replyingToText: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  replyRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingBottom: 4 },
  myAvatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  myAvatarText: { color: '#FFFFFF', fontSize: 11, fontFamily: 'Inter_700Bold' },
  replyInput: {
    flex: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, fontFamily: 'Inter_400Regular', borderWidth: 1, maxHeight: 100,
  },
  sendBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  notFoundText: { fontSize: 16, fontFamily: 'Inter_400Regular' },
  backBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, marginTop: 8 },
  backBtnText: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
});
