import React, { useState } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { MOCK_NOTIFICATIONS, type Notification } from '@/constants/mockData';

type FilterTab = 'All' | 'Reactions' | 'Follows' | 'Mentions' | 'System';
const TABS: FilterTab[] = ['All', 'Reactions', 'Follows', 'Mentions', 'System'];

const NOTIF_ICON: Record<Notification['type'], string> = {
  like: 'thumbs-up',
  comment: 'message-circle',
  follow: 'user-plus',
  mention: 'at-sign',
  verification: 'check-circle',
  system: 'bell',
};

const NOTIF_COLOR: Record<Notification['type'], string> = {
  like: '#0F8A5F',
  comment: '#1D4ED8',
  follow: '#7C3AED',
  mention: '#DB2777',
  verification: '#0F8A5F',
  system: '#DC2626',
};

export default function ActivityScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<FilterTab>('All');
  const [notifications, setNotifications] = useState<typeof MOCK_NOTIFICATIONS>([]);

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 84 : insets.bottom + 60;

  const filtered =
    activeTab === 'All'
      ? notifications
      : activeTab === 'Reactions'
      ? notifications.filter((n) => n.type === 'like' || n.type === 'comment')
      : activeTab === 'Follows'
      ? notifications.filter((n) => n.type === 'follow')
      : activeTab === 'Mentions'
      ? notifications.filter((n) => n.type === 'mention')
      : notifications.filter((n) => n.type === 'system' || n.type === 'verification');

  const unread = notifications.filter((n) => !n.read).length;

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: topInset + 10, backgroundColor: colors.background, borderBottomColor: colors.border },
        ]}
      >
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>Activity</Text>
          {unread > 0 && (
            <Text style={[styles.unreadCount, { color: colors.mutedForeground }]}>
              {unread} unread
            </Text>
          )}
        </View>
        {unread > 0 && (
          <Pressable onPress={markAllRead} hitSlop={8}>
            <Text style={[styles.markRead, { color: colors.primary }]}>Mark all read</Text>
          </Pressable>
        )}
      </View>

      {/* Filter tabs */}
      <View style={[styles.tabRow, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        {TABS.map((tab) => {
          const active = tab === activeTab;
          return (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[
                styles.tab,
                { borderBottomColor: active ? colors.primary : 'transparent' },
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  {
                    color: active ? colors.primary : colors.mutedForeground,
                    fontFamily: active ? 'Inter_600SemiBold' : 'Inter_400Regular',
                  },
                ]}
              >
                {tab}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: bottomPad }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const accent = NOTIF_COLOR[item.type];
          return (
            <Pressable
              style={[
                styles.notifItem,
                {
                  backgroundColor: item.read ? colors.background : colors.accent,
                  borderBottomColor: colors.border,
                },
              ]}
            >
              {/* Avatar or icon */}
              {item.actorInitials ? (
                <View style={[styles.actorAvatar, { backgroundColor: item.actorColor }]}>
                  <Text style={styles.actorInitials}>{item.actorInitials}</Text>
                </View>
              ) : (
                <View style={[styles.iconCircle, { backgroundColor: accent + '18' }]}>
                  <Feather name={NOTIF_ICON[item.type] as any} size={16} color={accent} />
                </View>
              )}

              {/* Text */}
              <View style={{ flex: 1 }}>
                {item.actor ? (
                  <Text style={[styles.notifText, { color: colors.foreground }]}>
                    <Text style={{ fontFamily: 'Inter_600SemiBold' }}>{item.actor} </Text>
                    <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }}>
                      {item.message}
                    </Text>
                  </Text>
                ) : (
                  <Text style={[styles.notifText, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>
                    {item.message}
                  </Text>
                )}
                <Text style={[styles.notifTime, { color: colors.mutedForeground }]}>{item.timeAgo}</Text>
              </View>

              {/* Unread dot */}
              {!item.read && (
                <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
              )}
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="bell-off" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Nothing here yet</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 26,
    fontFamily: 'Inter_700Bold',
  },
  unreadCount: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  markRead: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    paddingBottom: 2,
  },
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 12,
  },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 1,
  },
  actorAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actorInitials: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifText: {
    fontSize: 14,
    lineHeight: 20,
  },
  notifTime: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
  },
});
