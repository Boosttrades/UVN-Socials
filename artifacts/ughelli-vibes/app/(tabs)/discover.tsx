import React, { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import SearchBar from '@/components/SearchBar';
import { DISCOVER_CATEGORIES } from '@/constants/mockData';
import { useFeed, useSearchUsers } from '@/hooks/usePosts';

type SearchTab = 'Posts' | 'People';

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function DiscoverScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [searchTab, setSearchTab] = useState<SearchTab>('Posts');
  const { data: posts = [] } = useFeed();
  const { data: people = [], isFetching: peopleLoading } = useSearchUsers(searchTab === 'People' ? query : '');

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 84 : insets.bottom + 60;

  const q = query.trim().toLowerCase();
  const filteredPosts = q
    ? posts.filter(
        (p) =>
          p.headline.toLowerCase().includes(q) ||
          (p.body ?? '').toLowerCase().includes(q) ||
          p.author.name.toLowerCase().includes(q) ||
          p.author.username.toLowerCase().includes(q)
      )
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
          <SearchBar value={query} onChangeText={setQuery} placeholder="Search updates or people..." />
        </View>

        {query.trim() ? (
          /* Search results */
          <View style={styles.section}>
            {/* Posts / People tab switcher */}
            <View style={[styles.searchTabRow, { borderColor: colors.border }]}>
              {(['Posts', 'People'] as SearchTab[]).map((tab) => {
                const active = tab === searchTab;
                return (
                  <Pressable
                    key={tab}
                    onPress={() => setSearchTab(tab)}
                    style={[styles.searchTab, active && { backgroundColor: colors.primary }]}
                  >
                    <Text
                      style={[
                        styles.searchTabText,
                        { color: active ? '#FFFFFF' : colors.mutedForeground },
                      ]}
                    >
                      {tab}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {searchTab === 'Posts' ? (
              <>
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
              </>
            ) : (
              <>
                <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 14 }]}>
                  {peopleLoading ? 'Searching…' : `${people.length} result${people.length === 1 ? '' : 's'}`}
                </Text>
                {peopleLoading ? (
                  <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
                ) : people.length === 0 ? (
                  <View style={styles.emptySearch}>
                    <Feather name="users" size={32} color={colors.mutedForeground} />
                    <Text style={[styles.emptyHint, { color: colors.mutedForeground }]}>
                      No people match "{query.trim()}"
                    </Text>
                  </View>
                ) : (
                  people.map((person) => (
                    <TouchableOpacity
                      key={person.id}
                      style={[styles.personRow, { backgroundColor: colors.card, borderColor: colors.border }]}
                      onPress={() => router.push(`/user/${person.username}` as any)}
                    >
                      <View style={[styles.personAvatar, { backgroundColor: colors.primary }]}>
                        <Text style={styles.personAvatarText}>{getInitials(person.name)}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.personName, { color: colors.foreground }]} numberOfLines={1}>
                          {person.name}
                        </Text>
                        <Text style={[styles.personHandle, { color: colors.mutedForeground }]} numberOfLines={1}>
                          @{person.username}
                        </Text>
                      </View>
                      {person.isFollowing && (
                        <View style={[styles.followingPill, { backgroundColor: colors.muted }]}>
                          <Text style={[styles.followingPillText, { color: colors.mutedForeground }]}>Following</Text>
                        </View>
                      )}
                      <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
                    </TouchableOpacity>
                  ))
                )}
              </>
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
  searchTabRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  searchTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  searchTabText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  personAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  personAvatarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
  },
  personName: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  personHandle: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 1,
  },
  followingPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  followingPillText: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
  },
});
