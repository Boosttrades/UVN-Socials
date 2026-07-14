import React, { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';
import { useColors } from '@/hooks/useColors';

/**
 * Grey placeholder shown while the feed's first page is loading, instead of
 * a blank screen or a single spinner. Perceived load time drops a lot even
 * though the real network time is unchanged.
 */
function useShimmer() {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return opacity;
}

export default function SkeletonFeedCard() {
  const colors = useColors();
  const opacity = useShimmer();
  const blockStyle = { backgroundColor: colors.muted };

  return (
    <Animated.View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border, opacity },
      ]}
    >
      <View style={styles.topRow}>
        <View style={[styles.badge, blockStyle]} />
      </View>
      <View style={styles.authorRow}>
        <View style={[styles.avatar, blockStyle]} />
        <View style={{ flex: 1, gap: 6 }}>
          <View style={[styles.line, blockStyle, { width: '40%' }]} />
          <View style={[styles.line, blockStyle, { width: '25%', height: 8 }]} />
        </View>
      </View>
      <View style={[styles.line, blockStyle, { width: '90%', marginBottom: 8 }]} />
      <View style={[styles.line, blockStyle, { width: '70%', marginBottom: 12 }]} />
      <View style={[styles.image, blockStyle]} />
    </Animated.View>
  );
}

export function SkeletonFeedList({ count = 4 }: { count?: number }) {
  return (
    <View>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonFeedCard key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 12,
    marginVertical: 5,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  topRow: { marginBottom: 10 },
  badge: { width: 90, height: 18, borderRadius: 20 },
  authorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  avatar: { width: 32, height: 32, borderRadius: 16 },
  line: { height: 12, borderRadius: 6 },
  image: { width: '100%', height: 160, borderRadius: 10 },
});
