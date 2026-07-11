import React, { useState } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/contexts/AuthContext';
import { useFeed } from '@/hooks/usePosts';
import FeedCard from '@/components/FeedCard';

type ProfileTab = 'Updates' | 'Saved';

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { data: posts = [] } = useFeed();
  const [activeTab, setActiveTab] = useState<ProfileTab>('Updates');

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 84 : insets.bottom + 60;

  const initials = user ? getInitials(user.name) : '?';
  const displayName = user?.name ?? '';
  const handle = `@${user?.username ?? ''}`;
  const myPosts = user ? posts.filter((p) => p.author.id === user.id) : [];
  const listData = activeTab === 'Updates' ? myPosts : [];

  const ListHeader = (
    <View>
      {/* Cover */}
      <View style={[styles.cover, { backgroundColor: colors.primary, paddingTop: topInset }]}>
        <Pressable
          style={styles.settingsBtn}
          hitSlop={8}
          onPress={() => router.push('/settings' as any)}
          accessibilityLabel="Settings"
          accessibilityRole="button"
        >
          <Feather name="settings" size={20} color="#FFFFFF" />
        </Pressable>
      </View>

      <View style={[styles.body, { backgroundColor: colors.background }]}>
        {/* Avatar overlapping cover */}
        <View style={styles.avatarRow}>
          <View style={styles.avatarWrap}>
            <View style={[styles.avatar, { backgroundColor: colors.primary, borderColor: colors.background }]}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <Pressable style={[styles.cameraBtn, { backgroundColor: colors.primary, borderColor: colors.background }]}>
              <Feather name="camera" size={11} color="#FFFFFF" />
            </Pressable>
          </View>
          <TouchableOpacity
            style={[styles.editBtn, { backgroundColor: colors.muted, borderColor: colors.primary }]}
            onPress={() => router.push('/edit-profile' as any)}
          >
            <Text style={[styles.editBtnText, { color: colors.primary }]}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Name & handle */}
        <View style={styles.nameRow}>
          <Text style={[styles.name, { color: colors.foreground }]}>{displayName}</Text>
        </View>
        <Text style={[styles.handle, { color: colors.mutedForeground }]}>{handle}</Text>

        {/* Stats — Updates reflects real posts; followers/following have no backend yet */}
        <View style={[styles.statsRow, { borderColor: colors.border }]}>
          {[
            { label: 'Updates', value: String(myPosts.length) },
            { label: 'Followers', value: '0' },
            { label: 'Following', value: '0' },
          ].map((s, i) => (
            <Pressable
              key={s.label}
              style={[styles.stat, i < 2 && { borderRightWidth: 1, borderRightColor: colors.border }]}
            >
              <Text style={[styles.statVal, { color: colors.primary }]}>{s.value}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Share button */}
        <TouchableOpacity style={[styles.shareBtn, { borderColor: colors.border }]}>
          <Feather name="share-2" size={15} color={colors.foreground} />
          <Text style={[styles.shareBtnText, { color: colors.foreground }]}>Share Profile</Text>
        </TouchableOpacity>

        {/* Content tabs */}
        <View style={[styles.profileTabRow, { borderBottomColor: colors.border }]}>
          {(['Updates', 'Saved'] as ProfileTab[]).map((tab) => {
            const active = tab === activeTab;
            return (
              <Pressable
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[styles.profileTab, { borderBottomColor: active ? colors.primary : 'transparent' }]}
              >
                <Text
                  style={[
                    styles.profileTabText,
                    {
                      color: active ? colors.primary : colors.mutedForeground,
                      fontFamily: active ? 'Inter_600SemiBold' : 'Inter_400Regular',
                    },
                  ]}
                >
                  {tab}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );

  return (
    <FlatList
      style={[styles.root, { backgroundColor: colors.background }]}
      data={listData}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <FeedCard post={item} />}
      ListHeaderComponent={ListHeader}
      contentContainerStyle={{ paddingBottom: bottomPad }}
      showsVerticalScrollIndicator={false}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Feather
            name={activeTab === 'Saved' ? 'bookmark' : 'edit-3'}
            size={40}
            color={colors.mutedForeground}
          />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            {activeTab === 'Saved' ? 'No saved updates yet' : 'Nothing posted yet'}
          </Text>
          <Text style={[styles.emptyHint, { color: colors.mutedForeground }]}>
            {activeTab === 'Saved'
              ? 'Updates you save will appear here'
              : 'Your updates will appear here once you post'}
          </Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  cover: {
    height: 130,
    alignItems: 'flex-end',
    paddingRight: 16,
    paddingBottom: 12,
    justifyContent: 'flex-end',
  },
  settingsBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { paddingHorizontal: 16 },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: -38,
    marginBottom: 12,
  },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
  },
  avatarText: { color: '#FFFFFF', fontSize: 26, fontFamily: 'Inter_700Bold' },
  cameraBtn: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  editBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
  },
  editBtnText: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  name: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  handle: { fontSize: 14, fontFamily: 'Inter_400Regular', marginTop: 2, marginBottom: 16 },
  statsRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 14,
    marginBottom: 14,
    overflow: 'hidden',
  },
  stat: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  statVal: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  statLabel: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  shareBtnText: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  profileTabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginHorizontal: -16,
  },
  profileTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 2,
  },
  profileTabText: { fontSize: 14 },
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32, gap: 8 },
  emptyTitle: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  emptyHint: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 20 },
});
