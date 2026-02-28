// ──────────────────────────────────────────────
// NafAcademy – Conversation List (WhatsApp-style)
// ──────────────────────────────────────────────
import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { onUserConversations, getUsersBySchool } from '@/services/firestore';
import { COLORS } from '@/constants';
import type { Conversation, AppUser } from '@/types';

interface Props {
  onSelectConversation: (convId: string, otherUser: { uid: string; name: string }) => void;
  onNewChat?: () => void;
}

export default function ConversationList({ onSelectConversation, onNewChat }: Props) {
  const { profile } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    const unsub = onUserConversations(profile.uid, (convs) => {
      setConversations(convs);
      setLoading(false);
    });
    return unsub;
  }, [profile]);

  const getOtherUser = useCallback(
    (conv: Conversation) => {
      if (!profile) return { uid: '', name: 'Unknown' };
      const otherUid = conv.participants.find((p) => p !== profile.uid) ?? '';
      return {
        uid: otherUid,
        name: conv.participantNames[otherUid] ?? 'Unknown',
      };
    },
    [profile]
  );

  const getUnread = useCallback(
    (conv: Conversation) => {
      if (!profile) return 0;
      return conv.unreadCount?.[profile.uid] ?? 0;
    },
    [profile]
  );

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getRoleBadge = (conv: Conversation) => {
    if (!profile) return '';
    const otherUid = conv.participants.find((p) => p !== profile.uid) ?? '';
    const role = conv.participantRoles?.[otherUid];
    if (!role) return '';
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  const renderItem = ({ item }: { item: Conversation }) => {
    const other = getOtherUser(item);
    const unreadCount = getUnread(item);
    const roleBadge = getRoleBadge(item);

    return (
      <Pressable
        style={[styles.convItem, unreadCount > 0 && styles.convItemUnread]}
        onPress={() => onSelectConversation(item.id, other)}
      >
        {/* Avatar circle */}
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {other.name.charAt(0).toUpperCase()}
          </Text>
        </View>

        <View style={styles.convBody}>
          <View style={styles.convTopRow}>
            <Text style={[styles.convName, unreadCount > 0 && styles.convNameBold]} numberOfLines={1}>
              {other.name}
            </Text>
            <Text style={styles.convTime}>{formatTime(item.lastMessageAt)}</Text>
          </View>

          <View style={styles.convBottomRow}>
            <Text
              style={[styles.convLastMsg, unreadCount > 0 && styles.convLastMsgBold]}
              numberOfLines={1}
            >
              {item.lastMessage || 'No messages yet'}
            </Text>

            <View style={styles.convBadges}>
              {roleBadge ? (
                <View style={styles.rolePill}>
                  <Text style={styles.roleText}>{roleBadge}</Text>
                </View>
              ) : null}
              {unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadText}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
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
        <Text style={styles.title}>Messages</Text>
        {onNewChat && (
          <Pressable onPress={onNewChat} hitSlop={10}>
            <Ionicons name="create-outline" size={24} color={COLORS.primary} />
          </Pressable>
        )}
      </View>

      {conversations.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="chatbubbles-outline" size={48} color={COLORS.border} />
          <Text style={styles.emptyText}>No conversations yet</Text>
          {onNewChat && (
            <Pressable style={styles.startBtn} onPress={onNewChat}>
              <Text style={styles.startBtnText}>Start a conversation</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(c) => c.id}
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
  title: { fontSize: 20, fontWeight: '700', color: COLORS.text },

  convItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: COLORS.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  convItemUnread: {
    backgroundColor: '#EBF5FF',
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },

  convBody: { flex: 1 },
  convTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  convName: { fontSize: 15, color: COLORS.text, flex: 1 },
  convNameBold: { fontWeight: '700' },
  convTime: { fontSize: 12, color: COLORS.textSecondary, marginLeft: 8 },

  convBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  convLastMsg: { fontSize: 13, color: COLORS.textSecondary, flex: 1 },
  convLastMsgBold: { color: COLORS.text, fontWeight: '600' },

  convBadges: { flexDirection: 'row', alignItems: 'center', marginLeft: 8 },
  rolePill: {
    backgroundColor: COLORS.border,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 6,
  },
  roleText: { fontSize: 10, color: COLORS.textSecondary },
  unreadBadge: {
    backgroundColor: COLORS.primary,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  unreadText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyText: { fontSize: 15, color: COLORS.textSecondary, marginTop: 12 },
  startBtn: {
    marginTop: 16,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  startBtnText: { color: '#fff', fontWeight: '600' },
});
