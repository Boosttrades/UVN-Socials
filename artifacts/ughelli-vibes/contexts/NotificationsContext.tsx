import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/utils/api';

// ─── Types ────────────────────────────────────────────────────────────────────

export type NotifType =
  | 'like'
  | 'comment'
  | 'follow'
  | 'mention'
  | 'verification'
  | 'system';

export interface ApiNotification {
  id: string;
  type: NotifType;
  postId: string | null;
  message: string;
  read: boolean;
  createdAt: string;
  actor: {
    id: string;
    name: string;
    username: string;
    profileImage: string | null;
  } | null;
}

interface NotificationsContextValue {
  notifications: ApiNotification[];
  unreadCount: number;
  loading: boolean;
  refreshing: boolean;
  refresh: () => void;
  markAllRead: () => Promise<void>;
  markOneRead: (id: string) => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue>({
  notifications: [],
  unreadCount: 0,
  loading: false,
  refreshing: false,
  refresh: () => {},
  markAllRead: async () => {},
  markOneRead: async () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 30_000; // re-fetch every 30 s while app is active

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchNotifications = useCallback(
    async (opts: { silent?: boolean } = {}) => {
      if (!token) {
        setNotifications([]);
        setLoading(false);
        return;
      }
      if (!opts.silent) setLoading((prev) => (notifications.length === 0 ? true : prev));
      try {
        const data = await apiRequest<{ notifications: ApiNotification[] }>(
          '/notifications',
          { token }
        );
        setNotifications(data.notifications ?? []);
      } catch {
        // leave existing list intact on network errors
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Initial fetch + refetch when token changes
  useEffect(() => {
    setLoading(true);
    fetchNotifications();
  }, [fetchNotifications]);

  // Poll while app is foregrounded
  useEffect(() => {
    if (!token) return;
    intervalRef.current = setInterval(() => fetchNotifications({ silent: true }), POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [token, fetchNotifications]);

  // Re-fetch when app comes back to the foreground
  useEffect(() => {
    const handler = (state: AppStateStatus) => {
      if (state === 'active') fetchNotifications({ silent: true });
    };
    const sub = AppState.addEventListener('change', handler);
    return () => sub.remove();
  }, [fetchNotifications]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    fetchNotifications();
  }, [fetchNotifications]);

  const markAllRead = useCallback(async () => {
    if (!token) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await apiRequest('/notifications/read-all', { method: 'POST', token });
    } catch {
      fetchNotifications({ silent: true });
    }
  }, [token, fetchNotifications]);

  const markOneRead = useCallback(
    async (id: string) => {
      if (!token) return;
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      try {
        await apiRequest(`/notifications/${id}/read`, { method: 'POST', token });
      } catch {/* ignore */}
    },
    [token]
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationsContext.Provider
      value={{ notifications, unreadCount, loading, refreshing, refresh, markAllRead, markOneRead }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useNotifications() {
  return useContext(NotificationsContext);
}
