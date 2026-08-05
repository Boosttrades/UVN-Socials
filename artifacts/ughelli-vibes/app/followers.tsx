import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/contexts/AuthContext';
import {
  useFollowersList,
  useFollowingList,
  useFollowUser,
  type ApiFollowUser,
} from '@/hooks/usePosts';

const PRIMARY = '#0F8A5F';
const AVATAR_COLORS = ['#0F8A5F', '#1D4ED8', '#7C3AED', '#DB2777', '#EA580C', '#0D9488', '#D97706'];

function colorForId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ─── Follow button for a single row ─────────────────────────────────────────

function FollowBtn({ username, isFollowing, isMe }: { username: string; isFollowing: boolean; isMe: boolean }) {
  const colors = useColors();
  const { token } = useAuth();
  const router = useRouter();
  const followUser = useFollowUser(username);

  if (isMe) return null;

  function handlePress() {
    if (!token) { router.push('/auth/login' as any); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    followUser.mutate();
  }

  return (
    <Pressable
      onPress={handlePress}
      disabled={followUser.isPending}
      style={[
        styles.followBtn,
        {
          backgroundColor: isFollowing ? 'transparent' : PRIMARY,
          borderWidth: isFollowing ? 1 : 0,
          borderColor: colors.border,
        },
      ]}
    >
      <Text style={[styles.followBtnText, { color: isFollowing ? colors.foreground : '#FFFFFF' }]}>
        {followUser.isPending ? '…' : isFollowing ? 'Following' : 'Follow'}
      </Text>
    </Pressable>
  );
}

// ─── Single user row ─────────────────────────────────────────────────────────

function UserRow({ item }: { item: ApiFollowUser }) {
  const colors = useColors();
  const router = useRouter();
  const bg = colorForId(item.id);

  return (
    <Pressable
      style={[styles.row, { borderBottomColor: colors.border }]}
      onPress={() => router.push(`/user/${item.username}` as any)}
    >
      {/* Avatar */}
      <View style={[styles.avatar, { backgroundColor: bg }]}>
        {item.profileImage ? (
          <Image
            source={{ uri: item.profileImage }}
            style={styles.avatarImg}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        ) : (
          <Text style={styles.avatarText}>{getInitials(item.name || item.username)}</Text>
        )}
      </View>

      {/* Name + handle */}
      <View style={{ flex: 1 }}>
        <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
          {item.name || item.username}
        </Text>
        <Text style={[styles.handle, { color: colors.mutedForeground }]} numberOfLines={1}>
          @{item.username}
        </Text>
      </View>

      {/* Follow / Following button */}
      <FollowBtn username={item.username} isFollowing={item.isFollowing} isMe={item.isMe} />
    </Pressable>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function FollowersScreen() {
  const { username, type } = useLocalSearchParams<{ username: string; type: 'followers' | 'following' }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const isFollowers = type !== 'following';
  const title = isFollowers ? 'Followers' : 'Following';

  const { data: followersList, isLoading: loadingFollowers } = useFollowersList(isFollowers ? username : undefined);
  const { data: followingList, isLoading: loadingFollowing } = useFollowingList(!isFollowers ? username : undefined);

  const list = isFollowers ? (followersList ?? []) : (followingList ?? []);
  const loading = isFollowers ? loadingFollowers : loadingFollowing;

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 84 : insets.bottom + 60;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Nav bar */}
      <View
        style={[
          styles.navbar,
          { paddingTop: topPad, backgroundColor: colors.background, borderBottomColor: colors.border },
        ]}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <View>
          <Text style={[styles.navTitle, { color: colors.foreground }]}>{title}</Text>
          <Text style={[styles.navSub, { color: colors.mutedForeground }]}>@{username}</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={PRIMARY} />
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <UserRow item={item} />}
          contentContainerStyle={{ paddingBottom: bottomPad }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather
                name={isFollowers ? 'users' : 'user-plus'}
                size={44}
                color={colors.mutedForeground}
              />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                {isFollowers ? 'No followers yet' : 'Not following anyone yet'}
              </Text>
              <Text style={[styles.emptyHint, { color: colors.mutedForeground }]}>
                {isFollowers
                  ? 'When people follow this account they'll appear here'
                  : 'When this account follows people they'll appear here'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  navTitle: { fontSize: 17, fontFamily: 'Inter_700Bold', textAlign: 'center' },
  navSub: { fontSize: 12, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: 48, height: 48, borderRadius: 24 },
  avatarText: { color: '#FFFFFF', fontSize: 16, fontFamily: 'Inter_700Bold' },
  name: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  handle: { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 1 },
  followBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
  },
  followBtnText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  empty: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 32,
    gap: 10,
  },
  emptyTitle: { fontSize: 17, fontFamily: 'Inter_600SemiBold' },
  emptyHint: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 20,
  },
});
