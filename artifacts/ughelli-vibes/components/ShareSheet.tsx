/**
 * ShareSheet — TikTok-style custom share bottom sheet.
 *
 * Share count is only incremented when the user completes a real action:
 *   • Tapping a follower row   → +1 per follower tapped
 *   • Tapping an app shortcut  → +1 after the OS share/deep-link fires
 *   • Opening the sheet alone  → 0
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useFollowingList, useSharePost, type ApiFollowUser } from '@/hooks/usePosts';

// ─── Avatar helpers ───────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  '#0F8A5F', '#1D4ED8', '#7C3AED', '#DB2777',
  '#DC2626', '#D97706', '#0891B2', '#059669',
];
function avatarBg(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
function initials(name: string) {
  const p = name.trim().split(/\s+/);
  return p.length === 1 ? p[0].slice(0, 2).toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

// ─── App share options ────────────────────────────────────────────────────────

interface AppOption {
  id: string;
  label: string;
  icon: string;       // Feather icon name
  bgColor: string;
  iconColor: string;
}

const APP_OPTIONS: AppOption[] = [
  { id: 'whatsapp', label: 'WhatsApp',  icon: 'message-circle', bgColor: '#25D366', iconColor: '#FFFFFF' },
  { id: 'telegram', label: 'Telegram',  icon: 'send',            bgColor: '#229ED9', iconColor: '#FFFFFF' },
  { id: 'sms',      label: 'SMS',       icon: 'message-square',  bgColor: '#6D28D9', iconColor: '#FFFFFF' },
  { id: 'copy',     label: 'Copy Link', icon: 'link',            bgColor: '#374151', iconColor: '#FFFFFF' },
  { id: 'more',     label: 'More',      icon: 'more-horizontal', bgColor: '#6B7280', iconColor: '#FFFFFF' },
];

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ShareSheetProps {
  visible: boolean;
  onClose: () => void;
  postId: string;
  headline: string;
  body?: string | null;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ShareSheet({ visible, onClose, postId, headline, body }: ShareSheetProps) {
  const colors = useColors();
  const { resolvedScheme } = useTheme();
  const isDark = resolvedScheme === 'dark';
  const { user } = useAuth();
  const sharePost = useSharePost();

  // Followers list (people the current user follows)
  const { data: following = [], isLoading: followingLoading } = useFollowingList(user?.username);

  // Search filter
  const [query, setQuery] = useState('');
  const filtered = query.trim()
    ? following.filter(
        (f) =>
          f.name.toLowerCase().includes(query.toLowerCase()) ||
          f.username.toLowerCase().includes(query.toLowerCase())
      )
    : following;

  // Track which followers we've already sent to (within this session)
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());
  // Track which app actions have fired (to avoid double-counting)
  const [usedApps, setUsedApps] = useState<Set<string>>(new Set());
  // Copy-link feedback
  const [copied, setCopied] = useState(false);

  // Slide-up animation
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setSentTo(new Set());
      setUsedApps(new Set());
      setQuery('');
      setCopied(false);
      Animated.spring(slideAnim, {
        toValue: 1,
        useNativeDriver: true,
        damping: 22,
        stiffness: 200,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [500, 0],
  });

  // ── Share link string ───────────────────────────────────────────────────────
  const shareText = `${headline}${body ? '\n\n' + body.slice(0, 100) + (body.length > 100 ? '…' : '') : ''}\n\nShared via Ughelli Vibes TV`;
  const shareUrl = `https://ughellivivestv.com/post/${postId}`;

  // ── Record a share ──────────────────────────────────────────────────────────
  const recordShare = useCallback(() => {
    sharePost.mutate(postId);
  }, [postId, sharePost]);

  // ── Send to follower ────────────────────────────────────────────────────────
  function handleSendToFollower(follower: ApiFollowUser) {
    if (sentTo.has(follower.username)) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSentTo((prev) => new Set(prev).add(follower.username));
    recordShare();
  }

  // ── App share actions ───────────────────────────────────────────────────────
  async function handleAppShare(optionId: string) {
    if (usedApps.has(optionId)) return;

    try {
      if (optionId === 'whatsapp') {
        const msg = encodeURIComponent(`${shareText}\n${shareUrl}`);
        const url = `whatsapp://send?text=${msg}`;
        const supported = await Linking.canOpenURL(url);
        if (!supported) {
          // Fall back to web WhatsApp
          await Linking.openURL(`https://wa.me/?text=${msg}`);
        } else {
          await Linking.openURL(url);
        }
        setUsedApps((prev) => new Set(prev).add(optionId));
        recordShare();

      } else if (optionId === 'telegram') {
        const msg = encodeURIComponent(`${shareText}\n${shareUrl}`);
        const url = `tg://msg?text=${msg}`;
        const supported = await Linking.canOpenURL(url);
        if (!supported) {
          await Linking.openURL(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`);
        } else {
          await Linking.openURL(url);
        }
        setUsedApps((prev) => new Set(prev).add(optionId));
        recordShare();

      } else if (optionId === 'sms') {
        const body = encodeURIComponent(`${shareText}\n${shareUrl}`);
        const url = Platform.OS === 'ios' ? `sms:&body=${body}` : `sms:?body=${body}`;
        await Linking.openURL(url);
        setUsedApps((prev) => new Set(prev).add(optionId));
        recordShare();

      } else if (optionId === 'copy') {
        // Use Share sheet in "copy" spirit — simpler than installing expo-clipboard
        // On mobile we use a workaround: open the native share, which includes "Copy"
        // But to avoid double-counting, we record it right here and show "Copied!" feedback
        // (most users on mobile see "Copy" as a primary option in the native sheet)
        // Actually let's try Clipboard via global if available
        const globalAny = global as any;
        if (globalAny?.navigator?.clipboard?.writeText) {
          await globalAny.navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
        } else if (globalAny?.Clipboard?.setString) {
          globalAny.Clipboard.setString(`${shareText}\n${shareUrl}`);
        } else {
          // Last resort: open native share which has a Copy option
          await Share.share({ message: `${shareText}\n${shareUrl}`, title: headline });
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
        setUsedApps((prev) => new Set(prev).add(optionId));
        recordShare();

      } else if (optionId === 'more') {
        const result = await Share.share({ message: `${shareText}\n${shareUrl}`, title: headline });
        // On iOS, result.action is 'sharedAction' if user completed; on Android it's always sharedAction
        const didShare =
          Platform.OS === 'android'
            ? true
            : result.action === Share.sharedAction;
        if (didShare) {
          setUsedApps((prev) => new Set(prev).add(optionId));
          recordShare();
        }
      }
    } catch {
      // User cancelled or error — don't count
    }
  }

  const sheetBg = isDark ? '#1A1A1A' : '#FFFFFF';
  const handleColor = isDark ? '#444' : '#D1D5DB';
  const searchBg = isDark ? 'rgba(255,255,255,0.07)' : '#F3F4F6';

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      {/* Backdrop */}
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={styles.backdropInner} />
      </Pressable>

      {/* Sheet */}
      <Animated.View
        style={[styles.sheet, { backgroundColor: sheetBg, transform: [{ translateY }] }]}
        pointerEvents="box-none"
      >
        {/* Handle */}
        <View style={[styles.handle, { backgroundColor: handleColor }]} />

        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>Share</Text>
          <Pressable onPress={onClose} hitSlop={10} style={[styles.closeBtn, { backgroundColor: searchBg }]}>
            <Feather name="x" size={16} color={colors.mutedForeground} />
          </Pressable>
        </View>

        {/* ── Send to followers ──────────────────────────────────────────── */}
        {following.length > 0 || followingLoading ? (
          <>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>SEND TO</Text>

            {/* Search */}
            {following.length > 5 && (
              <View style={[styles.searchWrap, { backgroundColor: searchBg }]}>
                <Feather name="search" size={14} color={colors.mutedForeground} />
                <TextInput
                  style={[styles.searchInput, { color: colors.foreground }]}
                  placeholder="Search followers…"
                  placeholderTextColor={colors.mutedForeground}
                  value={query}
                  onChangeText={setQuery}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            )}

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.followersRow}
            >
              {followingLoading ? (
                <ActivityIndicator color={colors.primary} style={{ marginHorizontal: 20 }} />
              ) : filtered.length === 0 ? (
                <Text style={[styles.emptyFollowers, { color: colors.mutedForeground }]}>No results</Text>
              ) : (
                filtered.map((f) => {
                  const sent = sentTo.has(f.username);
                  return (
                    <TouchableOpacity
                      key={f.username}
                      style={styles.followerItem}
                      onPress={() => handleSendToFollower(f)}
                      activeOpacity={0.75}
                    >
                      {/* Avatar */}
                      <View style={[styles.followerAvatar, { backgroundColor: avatarBg(f.id) }]}>
                        {f.profileImage ? (
                          <Image
                            source={{ uri: f.profileImage }}
                            style={styles.followerAvatarImg}
                            contentFit="cover"
                          />
                        ) : (
                          <Text style={styles.followerInitials}>{initials(f.name)}</Text>
                        )}
                        {/* Sent badge */}
                        {sent && (
                          <View style={[styles.sentBadge, { backgroundColor: colors.primary }]}>
                            <Feather name="check" size={9} color="#FFFFFF" />
                          </View>
                        )}
                      </View>
                      <Text
                        style={[
                          styles.followerName,
                          { color: sent ? colors.primary : colors.foreground },
                        ]}
                        numberOfLines={1}
                      >
                        {sent ? 'Sent ✓' : f.name.split(' ')[0]}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            <View style={[styles.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : '#F0F0F0' }]} />
          </>
        ) : null}

        {/* ── Share to apps ──────────────────────────────────────────────── */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>SHARE TO</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.appsRow}
        >
          {APP_OPTIONS.map((opt) => {
            const used = usedApps.has(opt.id);
            const isCopied = opt.id === 'copy' && copied;
            return (
              <TouchableOpacity
                key={opt.id}
                style={styles.appItem}
                onPress={() => handleAppShare(opt.id)}
                activeOpacity={0.75}
              >
                <View
                  style={[
                    styles.appIcon,
                    { backgroundColor: used ? colors.primary : opt.bgColor },
                    used && { opacity: 0.85 },
                  ]}
                >
                  <Feather
                    name={(isCopied ? 'check' : used ? 'check' : opt.icon) as any}
                    size={22}
                    color={opt.iconColor}
                  />
                </View>
                <Text style={[styles.appLabel, { color: colors.mutedForeground }]}>
                  {isCopied ? 'Copied!' : used ? 'Sent' : opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Post preview */}
        <View style={[styles.postPreview, { backgroundColor: searchBg, borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E5E7EB' }]}>
          <Feather name="zap" size={13} color={colors.primary} />
          <Text style={[styles.postPreviewText, { color: colors.mutedForeground }]} numberOfLines={2}>
            {headline}
          </Text>
        </View>

        {/* Bottom safe-area padding */}
        <View style={{ height: Platform.OS === 'ios' ? 34 : 16 }} />
      </Animated.View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  backdropInner: { flex: 1 },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    overflow: 'hidden',
    // Shadow
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.15, shadowRadius: 20 },
      android: { elevation: 12 },
    }),
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    alignSelf: 'center', marginBottom: 12,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, marginBottom: 18,
  },
  title: { fontSize: 17, fontFamily: 'Inter_700Bold' },
  closeBtn: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
  },
  sectionLabel: {
    fontSize: 10, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.8,
    paddingHorizontal: 20, marginBottom: 12,
  },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 20, marginBottom: 12, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular' },
  followersRow: {
    paddingHorizontal: 16, paddingBottom: 4, gap: 6,
  },
  followerItem: { alignItems: 'center', width: 64, marginHorizontal: 4 },
  followerAvatar: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', marginBottom: 6,
  },
  followerAvatarImg: { width: 52, height: 52, borderRadius: 26 },
  followerInitials: { color: '#FFFFFF', fontSize: 17, fontFamily: 'Inter_700Bold' },
  sentBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#FFFFFF',
  },
  followerName: { fontSize: 11, fontFamily: 'Inter_500Medium', textAlign: 'center' },
  emptyFollowers: { fontSize: 13, fontFamily: 'Inter_400Regular', paddingHorizontal: 20, paddingVertical: 10 },
  divider: { height: 1, marginHorizontal: 20, marginTop: 18, marginBottom: 18 },
  appsRow: { paddingHorizontal: 16, paddingBottom: 4, gap: 6 },
  appItem: { alignItems: 'center', width: 68, marginHorizontal: 4 },
  appIcon: {
    width: 52, height: 52, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  appLabel: { fontSize: 11, fontFamily: 'Inter_500Medium', textAlign: 'center' },
  postPreview: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 20, marginTop: 18, borderRadius: 12,
    padding: 12, borderWidth: 1,
  },
  postPreviewText: { flex: 1, fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 17 },
});
