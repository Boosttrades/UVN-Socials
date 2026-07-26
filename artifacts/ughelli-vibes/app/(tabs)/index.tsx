import React, { useCallback, useEffect, useState } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from 'react-native';
import { useColors } from '@/hooks/useColors';
import FeedCard from '@/components/FeedCard';
import EmergencyBanner from '@/components/EmergencyBanner';
import OfflineBanner from '@/components/OfflineBanner';
import { SkeletonFeedList } from '@/components/SkeletonFeedCard';
import { ALL_CATEGORIES, type PostCategory } from '@/constants/mockData';
import { useFeed } from '@/hooks/usePosts';
import { useNotifications } from '@/contexts/NotificationsContext';

type FilterOption = 'All' | PostCategory;
const FILTER_TABS: FilterOption[] = ['All', ...ALL_CATEGORIES];

export default function ForYouScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const { category: categoryParam } = useLocalSearchParams<{ category?: string }>();
  const { unreadCount } = useNotifications();
  const [activeFilter, setActiveFilter] = useState<FilterOption>('All');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (categoryParam && (ALL_CATEGORIES as string[]).includes(categoryParam)) {
      setActiveFilter(categoryParam as PostCategory);
    }
  }, [categoryParam]);

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

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage && activeFilter === 'All') {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, activeFilter, fetchNextPage]);

  // Glass header — always dark-canvas palette since AppBackground is always dark green
  const headerBg = 'rgba(6,26,18,0.72)';
  const headerBorder = 'rgba(34,197,139,0.20)';
  const chipActiveBg = '#22C58B';
  const chipInactiveBg = 'rgba(255,255,255,0.08)';
  const chipInactiveBorder = 'rgba(34,197,139,0.20)';
  const iconBtnBg = 'rgba(255,255,255,0.09)';
  const foreground = '#EDF2F0';
  const mutedFg = 'rgba(255,255,255,0.50)';

  return (
    /* Root is transparent — global AppBackground from _layout.tsx shows through */
    <View style={styles.root}>
      {/* Glass header + filter strip */}
      <View style={[styles.headerContainer, { backgroundColor: headerBg, borderBottomColor: headerBorder }]}>
        {/* Subtle gradient fade for depth */}
        <LinearGradient
          colors={isDark
            ? ['rgba(34,197,139,0.06)', 'transparent']
            : ['rgba(15,138,95,0.04)', 'transparent']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          pointerEvents="none"
        />

        {/* Header row */}
        <View style={[styles.header, { paddingTop: topInset + 8 }]}>
          <View style={styles.logoRow}>
            <LinearGradient
              colors={[colors.primary, colors.secondary ?? colors.primary]}
              style={styles.logoMark}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Feather name="zap" size={15} color="#FFFFFF" />
            </LinearGradient>
            <View>
              <Text style={[styles.logoText, { color: foreground }]}>
                Ughelli <Text style={{ color: colors.primary }}>Vibes</Text>
              </Text>
              <Text style={[styles.logoSub, { color: mutedFg }]}>Local News Network</Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            <View>
              <Pressable
                style={[styles.iconBtn, { backgroundColor: iconBtnBg }]}
                hitSlop={6}
                onPress={() => router.push('/(tabs)/activity' as any)}
                accessibilityRole="button"
                accessibilityLabel="Notifications"
              >
                <Feather name="bell" size={19} color={foreground} />
              </Pressable>
              {unreadCount > 0 && (
                <View style={[styles.notifDot, { backgroundColor: colors.emergency }]} />
              )}
            </View>
            <Pressable
              style={[styles.iconBtn, { backgroundColor: iconBtnBg }]}
              hitSlop={6}
              onPress={() => router.push('/(tabs)/discover' as any)}
              accessibilityRole="button"
              accessibilityLabel="Search"
            >
              <Feather name="search" size={19} color={foreground} />
            </Pressable>
          </View>
        </View>

        {/* Category filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContent}
          style={styles.filterBar}
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
                    backgroundColor: active ? chipActiveBg : chipInactiveBg,
                    borderColor: active ? chipActiveBg : chipInactiveBorder,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: active ? '#FFFFFF' : mutedFg },
                  ]}
                >
                  {tab}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <EmergencyBanner />
      <OfflineBanner />

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
              <Feather name="inbox" size={40} color={mutedFg} />
              <Text style={[styles.emptyTitle, { color: foreground }]}>
                {activeFilter === 'All' ? 'No updates yet' : `No ${activeFilter} posts yet`}
              </Text>
              <Text style={[styles.emptyHint, { color: mutedFg }]}>
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
  root: { flex: 1 }, // transparent — global network background shows through
  headerContainer: {
    borderBottomWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoMark: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { fontSize: 21, fontFamily: 'Inter_700Bold', lineHeight: 24 },
  logoSub: { fontSize: 10, fontFamily: 'Inter_400Regular', letterSpacing: 0.4, marginTop: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  filterBar: { paddingBottom: 12 },
  filterContent: { paddingHorizontal: 14, gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: { fontSize: 12, fontFamily: 'Inter_500Medium', letterSpacing: 0.2 },
  feedPadding: { paddingTop: 10 },
  footerSpinner: { paddingVertical: 20 },
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32, gap: 8 },
  emptyTitle: { fontSize: 16, fontFamily: 'Inter_600SemiBold', marginTop: 4 },
  emptyHint: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 20 },
});
