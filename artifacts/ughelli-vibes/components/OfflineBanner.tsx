import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { useColors } from '@/hooks/useColors';

/**
 * Friendly "No connection" strip, shown instead of letting requests fail
 * silently or crash the screen. Already-downloaded posts stay visible
 * underneath (react-query keeps serving cached data) — this just tells the
 * user why nothing new is loading.
 */
export default function OfflineBanner() {
  const colors = useColors();
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOffline(state.isConnected === false || state.isInternetReachable === false);
    });
    return unsubscribe;
  }, []);

  if (!isOffline) return null;

  return (
    <View style={[styles.banner, { backgroundColor: colors.warning }]}>
      <Feather name="wifi-off" size={13} color={colors.warningForeground} />
      <Text style={[styles.text, { color: colors.warningForeground }]}>
        No connection — showing saved posts
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  text: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
});
