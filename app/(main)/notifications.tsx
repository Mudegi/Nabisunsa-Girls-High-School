// ──────────────────────────────────────────────
// NafAcademy – Notifications Screen
// Real-time notification feed with mark-all-read
// ──────────────────────────────────────────────
import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import {
  onUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '@/services/firestore';
import { COLORS } from '@/constants';
import type { AppNotification } from '@/types';

const ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  assignment: 'document-text-outline',
  mark: 'stats-chart-outline',
  chat: 'chatbubble-outline',
  submission: 'cloud-upload-outline',
  announcement: 'megaphone-outline',
  system: 'information-circle-outline',
};

const COLOR_MAP: Record<string, string> = {
  assignment: COLORS.primary,
  mark: COLORS.success,
  chat: '#9C27B0',
  submission: COLORS.accent,
  announcement: COLORS.warning,
  system: COLORS.textSecondary,
};

export default function NotificationsScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) { setLoading(false); return; }
    const unsub = onUserNotifications(profile.uid, (notifs) => {
      setNotifications(notifs);
      setLoading(false);
    });
    return unsub;
  }, [profile]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleTap = useCallback(
    async (notif: AppNotification) => {
      if (!notif.read) {
        await markNotificationRead(notif.id);
      }
      // Navigate to the linked screen if available
      if (notif.link) {
        router.push(notif.link as any);
      }
    },
    [router]
  );

  const handleMarkAllRead = useCallback(async () => {
    if (!profile) return;
    await markAllNotificationsRead(profile.uid);
  }, [profile]);

  const formatTime = (ts: number) => {
    const now = Date.now();
    const diff = now - ts;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const renderItem = ({ item }: { item: AppNotification }) => {
    const iconName = ICON_MAP[item.type] ?? 'notifications-outline';
    const iconColor = COLOR_MAP[item.type] ?? COLORS.textSecondary;

    return (
      <Pressable
        style={[styles.notifItem, !item.read && styles.notifItemUnread]}
        onPress={() => handleTap(item)}
      >
        <View style={[styles.iconCircle, { backgroundColor: iconColor + '20' }]}>
          <Ionicons name={iconName as any} size={20} color={iconColor} />
        </View>
        <View style={styles.notifBody}>
          <Text style={[styles.notifTitle, !item.read && styles.notifTitleBold]}>
            {item.title}
          </Text>
          <Text style={styles.notifBodyText} numberOfLines={2}>
            {item.body}
          </Text>
          <Text style={styles.notifTime}>{formatTime(item.createdAt)}</Text>
        </View>
        {!item.read && <View style={styles.unreadDot} />}
      </Pressable>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.heading}>Notifications</Text>
        {unreadCount > 0 && (
          <Pressable onPress={handleMarkAllRead} hitSlop={10}>
            <Text style={styles.markAllBtn}>Mark all read</Text>
          </Pressable>
        )}
      </View>

      {notifications.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="notifications-off-outline" size={48} color={COLORS.border} />
          <Text style={styles.emptyText}>No notifications yet</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(n) => n.id}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  heading: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  markAllBtn: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },

  notifItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    backgroundColor: COLORS.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  notifItemUnread: { backgroundColor: '#F0F7FF' },

  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notifBody: { flex: 1 },
  notifTitle: { fontSize: 14, color: COLORS.text },
  notifTitleBold: { fontWeight: '700' },
  notifBodyText: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2, lineHeight: 18 },
  notifTime: { fontSize: 11, color: COLORS.textSecondary, marginTop: 4 },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
    marginTop: 4,
    marginLeft: 6,
  },

  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 15, color: COLORS.textSecondary, marginTop: 12 },
});
