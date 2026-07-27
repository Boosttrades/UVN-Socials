import React from 'react';
import { Dimensions, Platform, StyleSheet, useColorScheme, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useNotifications } from '@/contexts/NotificationsContext';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import NetworkBackground from '@/components/NetworkBackground';

const { width: SW, height: SH } = Dimensions.get('window');

export default function TabLayout() {
  const colors = useColors();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const { unreadCount } = useNotifications();
  const isIOS = Platform.OS === 'ios';

  return (
    /**
     * Dark forest-green canvas + animated network fills the entire tab area.
     * Every tab screen has a transparent (or glass) root so this shows through.
     */
    <View style={styles.root}>
      {/* Base colour */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#061A12' }]} />

      {/* Animated 3-D network */}
      <NetworkBackground
        color="#22C58B"
        opacity={0.28}
        nodeCount={34}
        maxDistance={165}
        width={SW}
        height={SH}
      />

      <Tabs
        sceneContainerStyle={{ backgroundColor: 'transparent' }}
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#22C58B',
          tabBarInactiveTintColor: 'rgba(255,255,255,0.38)',
          tabBarStyle: {
            position: 'absolute',
            backgroundColor: 'transparent',
            borderTopWidth: 1,
            borderTopColor: 'rgba(34,197,139,0.18)',
            elevation: 0,
          },
          tabBarBackground: () => (
            <BlurView
              intensity={isIOS ? 90 : 60}
              tint="dark"
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: 'rgba(4,14,9,0.72)' },
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
