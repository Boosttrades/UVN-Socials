import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useTheme } from '@/contexts/ThemeContext';
import { useNotifications } from '@/contexts/NotificationsContext';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';

// Reusable circular tab icon wrapper
function CircleTabIcon({
  focused,
  primaryColor,
  borderColor,
  children,
}: {
  focused: boolean;
  primaryColor: string;
  borderColor: string;
  children: React.ReactNode;
}) {
  return (
    <View
      style={[
        circleStyles.circle,
        focused
          ? { backgroundColor: primaryColor, borderColor: primaryColor }
          : { backgroundColor: 'transparent', borderColor },
      ]}
    >
      {children}
    </View>
  );
}

const circleStyles = StyleSheet.create({
  circle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default function TabLayout() {
  const colors = useColors();
  const { resolvedScheme } = useTheme();
  const isDark = resolvedScheme === 'dark';
  const { unreadCount } = useNotifications();
  const isIOS = Platform.OS === 'ios';

  const tabBarBg = isDark ? 'rgba(4,14,9,0.80)' : 'rgba(240,250,244,0.88)';
  const tabBarBorder = isDark ? 'rgba(34,197,139,0.18)' : 'rgba(15,138,95,0.20)';
  const blurTint = isDark ? 'dark' : 'light';
  // Inactive circle border: subtle green ring
  const inactiveBorder = isDark
    ? 'rgba(34,197,139,0.30)'
    : 'rgba(15,138,95,0.25)';

  // Icon color: white when active (sits on filled green circle), green when inactive
  const activeIconColor = '#FFFFFF';
  const inactiveIconColor = colors.primary;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Tabs
        sceneContainerStyle={{ backgroundColor: colors.background }}
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#ffffff',
          tabBarInactiveTintColor: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.40)',
          tabBarStyle: {
            position: 'absolute',
            backgroundColor: 'transparent',
            borderTopWidth: 1,
            borderTopColor: tabBarBorder,
            elevation: 0,
            height: 72,
            paddingBottom: 10,
          },
          tabBarBackground: () => (
            <BlurView
              intensity={isIOS ? 90 : 60}
              tint={blurTint}
              style={[StyleSheet.absoluteFill, { backgroundColor: tabBarBg }]}
            />
          ),
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '500',
            marginTop: 2,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'For You',
            tabBarIcon: ({ color, focused }) => (
              <CircleTabIcon
                focused={focused}
                primaryColor={colors.primary}
                borderColor={inactiveBorder}
              >
                {isIOS ? (
                  <SymbolView name="house" tintColor={focused ? activeIconColor : color} size={22} />
                ) : (
                  <Feather name="home" size={20} color={focused ? activeIconColor : inactiveIconColor} />
                )}
              </CircleTabIcon>
            ),
          }}
        />
        <Tabs.Screen
          name="discover"
          options={{
            title: 'Discover',
            tabBarIcon: ({ color, focused }) => (
              <CircleTabIcon
                focused={focused}
                primaryColor={colors.primary}
                borderColor={inactiveBorder}
              >
                {isIOS ? (
                  <SymbolView name="magnifyingglass" tintColor={focused ? activeIconColor : color} size={22} />
                ) : (
                  <Feather name="search" size={20} color={focused ? activeIconColor : inactiveIconColor} />
                )}
              </CircleTabIcon>
            ),
          }}
        />
        <Tabs.Screen
          name="create"
          options={{
            title: 'Create',
            tabBarIcon: ({ color, focused }) => (
              <CircleTabIcon
                focused={focused}
                primaryColor={colors.primary}
                borderColor={inactiveBorder}
              >
                {isIOS ? (
                  <SymbolView name="plus.circle" tintColor={focused ? activeIconColor : color} size={22} />
                ) : (
                  <Feather name="plus" size={20} color={focused ? activeIconColor : inactiveIconColor} />
                )}
              </CircleTabIcon>
            ),
          }}
        />
        <Tabs.Screen
          name="activity"
          options={{
            title: 'Activity',
            tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
            tabBarBadgeStyle: { backgroundColor: '#22C58B', fontSize: 10 },
            tabBarIcon: ({ color, focused }) => (
              <CircleTabIcon
                focused={focused}
                primaryColor={colors.primary}
                borderColor={inactiveBorder}
              >
                {isIOS ? (
                  <SymbolView name="bell" tintColor={focused ? activeIconColor : color} size={22} />
                ) : (
                  <Feather name="bell" size={20} color={focused ? activeIconColor : inactiveIconColor} />
                )}
              </CircleTabIcon>
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, focused }) => (
              <CircleTabIcon
                focused={focused}
                primaryColor={colors.primary}
                borderColor={inactiveBorder}
              >
                {isIOS ? (
                  <SymbolView name="person" tintColor={focused ? activeIconColor : color} size={22} />
                ) : (
                  <Feather name="user" size={20} color={focused ? activeIconColor : inactiveIconColor} />
                )}
              </CircleTabIcon>
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
