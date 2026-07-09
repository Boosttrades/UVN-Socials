import React, { useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import SearchBar from '@/components/SearchBar';
import {
  CATEGORY_COLORS,
  DISCOVER_CATEGORIES,
  TRENDING_TOPICS,
  VERIFIED_ORGS,
} from '@/constants/mockData';

export default function DiscoverScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 84 : insets.bottom + 60;

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: topInset + 16, paddingBottom: bottomPad }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.inner}>
        <Text style={[styles.title, { color: colors.foreground }]}>Discover</Text>

        {/* Search bar */}
        <View style={styles.searchWrap}>
          <SearchBar value={query} onChangeText={setQuery} placeholder="Search news, jobs, events..." />
        </View>

        {/* Trending */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Feather name="trending-up" size={16} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Trending Now</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.trendingScroll}
          >
            {TRENDING_TOPICS.map((topic) => {
              const cat = CATEGORY_COLORS[topic.category];
              return (
                <TouchableOpacity
                  key={topic.id}
                  style={[styles.trendingChip, { backgroundColor: cat.bg, borderColor: cat.dot + '60' }]}
                >
                  <Text style={[styles.trendingTag, { color: cat.text }]}>{topic.tag}</Text>
                  <Text style={[styles.trendingCount, { color: cat.dot }]}>{topic.postsCount}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Categories grid */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Feather name="grid" size={16} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Browse by Category</Text>
          </View>
          <View style={styles.grid}>
            {DISCOVER_CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.catCard, { backgroundColor: cat.bgColor }]}
              >
                <View style={[styles.catIcon, { backgroundColor: cat.color }]}>
                  <Feather name={cat.icon as any} size={18} color="#FFFFFF" />
                </View>
                <Text style={[styles.catName, { color: cat.color }]}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Verified organizations */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Feather name="check-circle" size={16} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Verified Organizations</Text>
          </View>
          {VERIFIED_ORGS.map((org) => (
            <TouchableOpacity
              key={org.id}
              style={[styles.orgCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={[styles.orgAvatar, { backgroundColor: org.color }]}>
                <Text style={styles.orgAvatarText}>{org.initials}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.orgNameRow}>
                  <Text style={[styles.orgName, { color: colors.foreground }]}>{org.name}</Text>
                  <Feather name="check-circle" size={13} color={colors.primary} style={{ marginLeft: 4 }} />
                </View>
                <Text style={[styles.orgHandle, { color: colors.mutedForeground }]}>{org.handle}</Text>
                <Text style={[styles.orgDesc, { color: colors.mutedForeground }]} numberOfLines={1}>
                  {org.description}
                </Text>
              </View>
              <View style={styles.orgRight}>
                <Text style={[styles.orgFollowers, { color: colors.primary }]}>{org.followers}</Text>
                <Text style={[styles.orgFollowersLabel, { color: colors.mutedForeground }]}>followers</Text>
                <TouchableOpacity
                  style={[styles.followBtn, { backgroundColor: colors.primary }]}
                >
                  <Text style={styles.followBtnText}>Follow</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  inner: { paddingHorizontal: 16 },
  title: {
    fontSize: 26,
    fontFamily: 'Inter_700Bold',
    marginBottom: 16,
  },
  searchWrap: { marginBottom: 28 },
  section: { marginBottom: 28 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: 'Inter_600SemiBold',
  },
  trendingScroll: { gap: 10 },
  trendingChip: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
  },
  trendingTag: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
  },
  trendingCount: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    marginTop: 3,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  catCard: {
    width: '47%',
    borderRadius: 14,
    padding: 16,
    gap: 10,
  },
  catIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catName: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  orgCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    gap: 12,
  },
  orgAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orgAvatarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
  },
  orgNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orgName: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  orgHandle: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 1,
  },
  orgDesc: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  orgRight: {
    alignItems: 'center',
    gap: 2,
  },
  orgFollowers: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
  },
  orgFollowersLabel: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
  },
  followBtn: {
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  followBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
});
