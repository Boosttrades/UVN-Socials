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
import { DISCOVER_CATEGORIES } from '@/constants/mockData';
import { useFeed } from '@/hooks/usePosts';

export default function DiscoverScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const { data: posts = [] } = useFeed();

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 84 : insets.bottom + 60;

  const filteredPosts = query.trim()
    ? posts.filter((p) => p.headline.toLowerCase().includes(query.trim().toLowerCase()))
    : [];

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

        {query.trim() ? (
          /* Search results */
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 14 }]}>
              {filteredPosts.length} result{filteredPosts.length === 1 ? '' : 's'}
            </Text>
            {filteredPosts.length === 0 ? (
              <View style={styles.emptySearch}>
                <Feather name="search" size={32} color={colors.mutedForeground} />
                <Text style={[styles.emptyHint, { color: colors.mutedForeground }]}>
                  No posts match "{query.trim()}"
                </Text>
              </View>
            ) : (
              filteredPosts.map((post) => (
                <View
                  key={post.id}
                  style={[styles.searchResult, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <Text style={[styles.searchResultHeadline, { color: colors.foreground }]} numberOfLines={2}>
                    {post.headline}
                  </Text>
                  <Text style={[styles.searchResultMeta, { color: colors.mutedForeground }]}>
                    {post.author.name} · {post.timeAgo}
                  </Text>
                </View>
              ))
            )}
          </View>
        ) : (
          /* Categories grid */
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
        )}
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
  emptySearch: {
    alignItems: 'center',
    paddingTop: 40,
    gap: 10,
  },
  emptyHint: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
  searchResult: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  searchResultHeadline: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    lineHeight: 20,
    marginBottom: 4,
  },
  searchResultMeta: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
});
