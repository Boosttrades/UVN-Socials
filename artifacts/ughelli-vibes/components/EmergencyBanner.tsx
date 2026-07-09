import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { MOCK_FEED } from '@/constants/mockData';

export default function EmergencyBanner() {
  const colors = useColors();
  const emergencyPost = MOCK_FEED.find((p) => p.isEmergency);

  if (!emergencyPost) return null;

  return (
    <TouchableOpacity activeOpacity={0.9} style={[styles.container, { backgroundColor: colors.emergency }]}>
      <View style={styles.iconWrap}>
        <Feather name="alert-triangle" size={13} color="#FFFFFF" />
      </View>
      <View style={styles.textWrap}>
        <Text style={styles.label}>ALERT</Text>
        <Text style={styles.text} numberOfLines={1}>
          {emergencyPost.headline}
        </Text>
      </View>
      <Feather name="chevron-right" size={16} color="rgba(255,255,255,0.7)" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  iconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1.2,
  },
  text: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    flex: 1,
  },
});
