import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import FeedCard from '@/components/FeedCard';
import EmergencyBanner from '@/components/EmergencyBanner';
import OfflineBanner from '@/components/OfflineBanner';
import { SkeletonFeedList } from '@/components/SkeletonFeedCard';
import { ALL_CATEGORIES, type PostCategory } from '@/constants/mockData';
import { useFeed } from '@/hooks/usePosts';

type FilterOption = 'All' | PostCategory;
const FILTER_TABS: FilterOption[] = ['All', ...ALL_CATEGORIES];

export default function ForYouScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState<FilterOption>('All');
  const [refreshing, setRefreshing] = useState(false);
  const {
    data: posts = [],
    isLoading,
    isFetching,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useFeed();

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 84 : insets.bottom + 60;

  const filteredPosts =
    activeFilter === 'All' ? posts : posts.filter((p) => p.category === activeFilter);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    refetch().finally(() => setRefreshing(false));
  }, [refetch]);

  // Infinite scroll (item 4/17): load the next 20 posts only once the user
  // is actually near the bottom, instead of fetching everything up front.
  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage && activeFilter === 'All') {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, activeFilter, fetchNextPage]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Custom header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: topInset + 8,
            backgroundColor: colors.background,
            borderBottomColor: colors.primary,
          },
        ]}
      >
        <View style={styles.logoRow}>
          <View style={[styles.logoMark, { backgroundColor: colors.primary }]}>
            <Feather name="zap" size={15} color="#FFFFFF" />
          </View>
          <Text style={[styles.logoText, { color: colors.foreground }]}>
            Ughelli{' '}
            <Text style={{ color: colors.primary }}>Vibes</Text>
          </Text>
        </View>

        <View style={styles.headerActions}>
          <View style={{ position: 'relative' }}>
            <Pressable style={styles.iconBtn} hitSlop={6}>
              <Feather name="bell" size={22} color={colors.foreground} />
            </Pressable>
            <View style={[styles.notifBadge, { backgroundColor: colors.emergency }]} />
          </View>
          <Pressable style={styles.iconBtn} hitSlop={6}>
            <Feather name="search" size={22} color={colors.foreground} />
          </Pressable>
        </View>
      </View>

      {/* Emergency ticker */}
      <EmergencyBanner />
      <OfflineBanner />

      {/* Category filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterContent}
        style={[styles.filterBar, { backgroundColor: colors.background, borderBottomColor: colors.border }]}
      >
        {FILTER_TABS.map((tab) => {
          const active = tab === activeFilter;
          return (
            <Pressable
              key={tab}
              onPress={() => setActiveFilter(tab)}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? colors.primary : colors.muted,
                  borderColor: active ? colors.primary : colors.border,
                },
              ]}
            >
              <Text style={[styles.chipText, { color: active ? '#FFFFFF' : colors.mutedForeground }]}>
                {tab}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Feed — skeleton placeholders while the first page loads instead of
          a blank screen (item 7/17). */}
      {isLoading ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.feedPadding}>
          <SkeletonFeedList />
        </ScrollView>
      ) : (
        <FlatList
          data={filteredPosts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <FeedCard post={item} />}
          contentContainerStyle={[styles.feedPadding, { paddingBottom: bottomPad }]}
          showsVerticalScrollIndicator={false}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.4}
          // Windowing tuned for entry-level Android hardware (item 17/17):
          // keep only a few off-screen cards mounted at once.
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={7}
          removeClippedSubviews
          refreshControl={
            <RefreshControl
              refreshing={refreshing || (isFetching && !isFetchingNextPage)}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator style={styles.footerSpinner} color={colors.primary} />
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="inbox" size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                {activeFilter === 'All' ? 'No updates yet' : `No ${activeFilter} posts yet`}
              </Text>
              <Text style={[styles.emptyHint, { color: colors.mutedForeground }]}>
                Be the first to post something to the community
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 2,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoMark: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 21,
    fontFamily: 'Inter_700Bold',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBadge: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  filterBar: {
    borderBottomWidth: 1,
  },
  filterContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  feedPadding: {
    paddingTop: 8,
  },
  footerSpinner: {
    paddingVertical: 20,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 32,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginTop: 4,
  },
  emptyHint: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 20,
  },
});
