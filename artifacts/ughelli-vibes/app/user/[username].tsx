import React from 'react';
import { FlatList, Platform, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/contexts/AuthContext';
import { useFeed, useFollowUser, useUserProfile } from '@/hooks/usePosts';
import FeedCard from '@/components/FeedCard';

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function UserProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, token } = useAuth();

  const { data: profile, isLoading } = useUserProfile(username);
  const { data: posts = [] } = useFeed();
  const followUser = useFollowUser(username);

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 84 : insets.bottom + 60;

  const isOwnProfile = !!user && !!profile && user.username === profile.username;
  const userPosts = profile ? posts.filter((p) => p.author.handle === profile.username) : [];
  const initials = profile ? getInitials(profile.name) : '?';

  function handleFollow() {
    if (!token) {
      router.push('/auth/login' as any);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    followUser.mutate();
  }

  if (!isLoading && !profile) {
    return (
      <View style={[styles.notFound, { backgroundColor: colors.background, paddingTop: topInset }]}>
        <Feather name="user-x" size={40} color={colors.mutedForeground} />
        <Text style={[styles.notFoundText, { color: colors.mutedForeground }]}>User not found</Text>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.muted }]}>
          <Text style={[styles.backBtnText, { color: colors.foreground }]}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const ListHeader = (
    <View>
      <View style={[styles.cover, { backgroundColor: colors.primary, paddingTop: topInset }]}>
        <Pressable
          style={styles.backNavBtn}
          hitSlop={8}
          onPress={() => router.back()}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Feather name="arrow-left" size={20} color="#FFFFFF" />
        </Pressable>
      </View>

      <View style={[styles.body, { backgroundColor: colors.background }]}>
        <View style={styles.avatarRow}>
          <View style={[styles.avatar, { backgroundColor: colors.primary, borderColor: colors.background }]}>
            {profile?.profileImage ? (
              <Image
                source={{ uri: profile.profileImage }}
                style={styles.avatarImg}
                contentFit="cover"
                cachePolicy="memory-disk"
              />
            ) : (
              <Text style={styles.avatarText}>{initials}</Text>
            )}
          </View>
          {!isOwnProfile && (
            <TouchableOpacity
              style={[
                styles.followBtn,
                {
                  backgroundColor: profile?.isFollowing ? colors.muted : colors.primary,
                  borderWidth: profile?.isFollowing ? 1 : 0,
                  borderColor: colors.border,
                },
              ]}
              onPress={handleFollow}
              disabled={followUser.isPending}
            >
              <Text style={[styles.followBtnText, { color: profile?.isFollowing ? colors.foreground : '#FFFFFF' }]}>
                {profile?.isFollowing ? 'Following' : 'Follow'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={[styles.name, { color: colors.foreground }]}>{profile?.name}</Text>
        <Text style={[styles.handle, { color: colors.mutedForeground }]}>@{profile?.username}</Text>

        <View style={[styles.statsRow, { borderColor: colors.border }]}>
          {[
            { label: 'Updates', value: String(profile?.postsCount ?? 0) },
            { label: 'Followers', value: String(profile?.followersCount ?? 0) },
            { label: 'Following', value: String(profile?.followingCount ?? 0) },
          ].map((s, i) => (
            <View key={s.label} style={[styles.stat, i < 2 && { borderRightWidth: 1, borderRightColor: colors.border }]}>
              <Text style={[styles.statVal, { color: colors.primary }]}>{s.value}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Updates</Text>
      </View>
    </View>
  );

  return (
    <FlatList
      style={[styles.root, { backgroundColor: colors.background }]}
      data={userPosts}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <FeedCard post={item} />}
      ListHeaderComponent={ListHeader}
      contentContainerStyle={{ paddingBottom: bottomPad }}
      showsVerticalScrollIndicator={false}
      ListEmptyComponent={
        !isLoading ? (
          <View style={styles.empty}>
            <Feather name="edit-3" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyHint, { color: colors.mutedForeground }]}>
              {profile ? `${profile.name} hasn't posted anything yet` : ''}
            </Text>
          </View>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  cover: {
    height: 110,
    justifyContent: 'flex-start',
    paddingLeft: 16,
    paddingBottom: 12,
  },
  backNavBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  body: { paddingHorizontal: 16 },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: -38,
    marginBottom: 12,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    overflow: 'hidden',
  },
  avatarImg: { width: 80, height: 80, borderRadius: 40 },
  avatarText: { color: '#FFFFFF', fontSize: 26, fontFamily: 'Inter_700Bold' },
  followBtn: {
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: 20,
  },
  followBtnText: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  name: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  handle: { fontSize: 14, fontFamily: 'Inter_400Regular', marginTop: 2, marginBottom: 16 },
  statsRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 14,
    marginBottom: 20,
    overflow: 'hidden',
  },
  stat: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  statVal: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  statLabel: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },
  sectionTitle: { fontSize: 17, fontFamily: 'Inter_600SemiBold', marginBottom: 12 },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 32 },
  notFoundText: { fontSize: 15, fontFamily: 'Inter_500Medium' },
  backBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, marginTop: 4 },
  backBtnText: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  empty: { alignItems: 'center', paddingTop: 40, paddingHorizontal: 32, gap: 10 },
  emptyHint: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 20 },
});
