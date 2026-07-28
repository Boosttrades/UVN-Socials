import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useTheme } from '@/contexts/ThemeContext';
import { useNotifications } from '@/contexts/NotificationsContext';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';

export default function TabLayout() {
  const colors = useColors();
  const { resolvedScheme } = useTheme();
  const isDark = resolvedScheme === 'dark';
  const { unreadCount } = useNotifications();
  const isIOS = Platform.OS === 'ios';

  // Tab-bar glass tint adapts to mode
  const tabBarBg = isDark ? 'rgba(4,14,9,0.80)' : 'rgba(240,250,244,0.88)';
  const tabBarBorder = isDark ? 'rgba(34,197,139,0.18)' : 'rgba(15,138,95,0.20)';
  const blurTint = isDark ? 'dark' : 'light';

  return (
    /**
     * Transparent root — the global AppBackground from _layout.tsx shows through.
     * Every tab screen should also use a transparent root so the network is visible.
     */
    <View style={styles.root}>
      <Tabs
        sceneContainerStyle={{ backgroundColor: 'transparent' }}
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: isDark ? 'rgba(255,255,255,0.38)' : 'rgba(0,0,0,0.38)',
          tabBarStyle: {
            position: 'absolute',
            backgroundColor: 'transparent',
            borderTopWidth: 1,
            borderTopColor: tabBarBorder,
            elevation: 0,
          },
          tabBarBackground: () => (
            <BlurView
              intensity={isIOS ? 90 : 60}
              tint={blurTint}
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: tabBarBg },
              ]}
            />
          ),
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'For You',
            tabBarIcon: ({ color }) =>
              isIOS ? (
                <SymbolView name="house" tintColor={color} size={24} />
              ) : (
                <Feather name="home" size={22} color={color} />
              ),
          }}
        />
        <Tabs.Screen
          name="discover"
          options={{
            title: 'Discover',
            tabBarIcon: ({ color }) =>
              isIOS ? (
                <SymbolView name="magnifyingglass" tintColor={color} size={24} />
              ) : (
                <Feather name="search" size={22} color={color} />
              ),
          }}
        />
        <Tabs.Screen
          name="create"
          options={{
            title: 'Create',
            tabBarIcon: ({ color }) =>
              isIOS ? (
                <SymbolView name="plus.circle" tintColor={color} size={24} />
              ) : (
                <Feather name="plus-circle" size={22} color={color} />
              ),
          }}
        />
        <Tabs.Screen
          name="activity"
          options={{
            title: 'Activity',
            tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
            tabBarBadgeStyle: { backgroundColor: '#22C58B', fontSize: 10 },
            tabBarIcon: ({ color }) =>
              isIOS ? (
                <SymbolView name="bell" tintColor={color} size={24} />
              ) : (
                <Feather name="bell" size={22} color={color} />
              ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color }) =>
              isIOS ? (
                <SymbolView name="person" tintColor={color} size={24} />
              ) : (
                <Feather name="user" size={22} color={color} />
              ),
          }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
