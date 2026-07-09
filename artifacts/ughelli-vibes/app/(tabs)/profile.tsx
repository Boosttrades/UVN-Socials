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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import FeedCard from '@/components/FeedCard';
import { MOCK_FEED } from '@/constants/mockData';

type ProfileTab = 'Updates' | 'Saved';

const MY_POSTS = MOCK_FEED.slice(0, 6);
const SAVED_POSTS = MOCK_FEED.filter((p) => p.isBookmarked);

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<ProfileTab>('Updates');

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 84 : insets.bottom + 60;
  const displayPosts = activeTab === 'Updates' ? MY_POSTS : SAVED_POSTS;

  const ListHeader = (
    <View>
      {/* Cover */}
      <View style={[styles.cover, { backgroundColor: colors.primary, paddingTop: topInset }]}>
        <Pressable style={styles.settingsBtn} hitSlop={8}>
          <Feather name="settings" size={20} color="#FFFFFF" />
        </Pressable>
      </View>

      <View style={[styles.body, { backgroundColor: colors.background }]}>
        {/* Avatar overlapping cover */}
        <View style={styles.avatarRow}>
          <View style={styles.avatarWrap}>
            <View style={[styles.avatar, { backgroundColor: colors.secondary, borderColor: colors.background }]}>
              <Text style={styles.avatarText}>JO</Text>
            </View>
            <Pressable style={[styles.cameraBtn, { backgroundColor: colors.primary, borderColor: colors.background }]}>
              <Feather name="camera" size={11} color="#FFFFFF" />
            </Pressable>
          </View>
          <TouchableOpacity style={[styles.editBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Text style={[styles.editBtnText, { color: colors.foreground }]}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Name & handle */}
        <View style={styles.nameRow}>
          <Text style={[styles.name, { color: colors.foreground }]}>John Oghenerukewe</Text>
          <Feather name="check-circle" size={17} color={colors.primary} style={{ marginLeft: 6 }} />
        </View>
        <Text style={[styles.handle, { color: colors.mutedForeground }]}>@john.oghenerukewe</Text>
        <Text style={[styles.bio, { color: colors.foreground }]}>
          Community reporter & local advocate. Sharing what matters in Ughelli since 2019.
        </Text>

        {/* Stats */}
        <View style={[styles.statsRow, { borderColor: colors.border }]}>
          {[
            { label: 'Updates', value: '47' },
            { label: 'Followers', value: '2.1K' },
            { label: 'Following', value: '318' },
          ].map((s, i) => (
            <Pressable
              key={s.label}
              style={[
                styles.stat,
                i < 2 && { borderRightWidth: 1, borderRightColor: colors.border },
              ]}
            >
              <Text style={[styles.statVal, { color: colors.foreground }]}>{s.value}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Verification badge */}
        <View style={[styles.verifiedBadge, { backgroundColor: colors.accent, borderColor: colors.primary + '40' }]}>
          <Feather name="check-circle" size={13} color={colors.primary} />
          <Text style={[styles.verifiedText, { color: colors.primary }]}>Verified Community Reporter</Text>
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
      data={displayPosts}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <FeedCard post={item} />}
      ListHeaderComponent={ListHeader}
      contentContainerStyle={{ paddingBottom: bottomPad }}
      showsVerticalScrollIndicator={false}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Feather
            name={activeTab === 'Saved' ? 'bookmark' : 'edit'}
            size={40}
            color={colors.mutedForeground}
          />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            {activeTab === 'Saved' ? 'No saved updates yet' : 'No updates published yet'}
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
  body: {
    paddingHorizontal: 16,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: -38,
    marginBottom: 12,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 26,
    fontFamily: 'Inter_700Bold',
  },
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
  editBtnText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
  },
  handle: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
    marginBottom: 8,
  },
  bio: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    lineHeight: 20,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 14,
    marginBottom: 14,
    overflow: 'hidden',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  statVal: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
  },
  statLabel: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignSelf: 'flex-start',
    marginBottom: 14,
  },
  verifiedText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
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
  shareBtnText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
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
  profileTabText: {
    fontSize: 14,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
  },
});
