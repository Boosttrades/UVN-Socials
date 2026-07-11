import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFeed } from '@/hooks/usePosts';

// Renders a pinned alert strip when there is an active emergency post in the real feed.
export default function EmergencyBanner() {
  const router = useRouter();
  const { data: posts = [] } = useFeed();
  const emergencyPost = posts.find((p) => p.isEmergency);

  if (!emergencyPost) return null;

  return (
    <Pressable
      style={styles.banner}
      onPress={() => router.push(`/post/${emergencyPost.id}` as any)}
      accessibilityLabel="View emergency alert"
      accessibilityRole="button"
    >
      <Feather name="alert-circle" size={15} color="#FFFFFF" />
      <Text style={styles.text} numberOfLines={1}>
        {emergencyPost.headline}
      </Text>
      <Feather name="chevron-right" size={16} color="#FFFFFF" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#DC2626',
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  text: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
});
