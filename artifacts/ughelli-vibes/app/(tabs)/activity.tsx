import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications, type NotifType } from '@/contexts/NotificationsContext';

// ─── Types ────────────────────────────────────────────────────────────────────

type FilterTab = 'All' | 'Reactions' | 'Follows' | 'Mentions' | 'System';
const TABS: FilterTab[] = ['All', 'Reactions', 'Follows', 'Mentions', 'System'];

const NOTIF_ICON: Record<NotifType, string> = {
  like: 'thumbs-up',
  comment: 'message-circle',
  follow: 'user-plus',
  mention: 'at-sign',
  verification: 'check-circle',
  system: 'bell',
};

const NOTIF_COLOR: Record<NotifType, string> = {
  like: '#0F8A5F',
  comment: '#1D4ED8',
  follow: '#7C3AED',
  mention: '#DB2777',
  verification: '#0F8A5F',
  system: '#DC2626',
};

// Avatar background colours cycled by actor id
const AVATAR_COLORS = [
  '#0F8A5F', '#1D4ED8', '#7C3AED', '#DB2777',
  '#DC2626', '#D97706', '#0891B2', '#059669',
];
function avatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function timeAgo(isoString: string): string {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diff = Math.max(0, now - then);
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(isoString).toLocaleDateString();
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ActivityScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const { notifications, unreadCount: unread, loading, refreshing, refresh, markAllRead, markOneRead } = useNotifications();

  const [activeTab, setActiveTab] = useState<FilterTab>('All');

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 84 : insets.bottom + 60;

  // ── Filter ─────────────────────────────────────────────────────────────────

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

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: topInset + 10, backgroundColor: colors.background, borderBottomColor: colors.primary },
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
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: bottomPad }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          renderItem={({ item }) => {
            const accent = NOTIF_COLOR[item.type];
            const actor = item.actor;
            return (
              <Pressable
                onPress={() => !item.read && markOneRead(item.id)}
                style={[
                  styles.notifItem,
                  {
                    backgroundColor: item.read ? colors.background : colors.accent,
                    borderBottomColor: colors.border,
                  },
                ]}
              >
                {/* Avatar or icon */}
                {actor ? (
                  <View style={[styles.actorAvatar, { backgroundColor: avatarColor(actor.id) }]}>
                    <Text style={styles.actorInitials}>{initials(actor.name || actor.username)}</Text>
                  </View>
                ) : (
                  <View style={[styles.iconCircle, { backgroundColor: accent + '18' }]}>
                    <Feather name={NOTIF_ICON[item.type] as any} size={16} color={accent} />
                  </View>
                )}

                {/* Text */}
                <View style={{ flex: 1 }}>
                  {actor ? (
                    <Text style={[styles.notifText, { color: colors.foreground }]}>
                      <Text style={{ fontFamily: 'Inter_600SemiBold' }}>{actor.name || actor.username} </Text>
                      <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }}>
                        {item.message}
                      </Text>
                    </Text>
                  ) : (
                    <Text style={[styles.notifText, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>
                      {item.message}
                    </Text>
                  )}
                  <Text style={[styles.notifTime, { color: colors.mutedForeground }]}>
                    {timeAgo(item.createdAt)}
                  </Text>
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
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                {token ? 'Nothing here yet' : 'Sign in to see your activity'}
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 2,
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
