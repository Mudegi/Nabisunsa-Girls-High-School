// ──────────────────────────────────────────────
// NafAcademy – New Chat: Pick a user to start
// ──────────────────────────────────────────────
import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { getUsersBySchool, getOrCreateConversation } from '@/services/firestore';
import { COLORS } from '@/constants';
import type { AppUser } from '@/types';

interface Props {
  onConversationReady: (convId: string, otherUser: { uid: string; name: string }) => void;
  onBack: () => void;
}

export default function NewChatPicker({ onConversationReady, onBack }: Props) {
  const { profile, schoolId } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [filtered, setFiltered] = useState<AppUser[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!schoolId) return;
    getUsersBySchool(schoolId).then((u) => {
      // Filter out self and only show relevant roles
      const eligible = u.filter((usr) => {
        if (usr.uid === profile?.uid) return false;
        // Teachers/admins can chat with everyone
        if (profile?.role === 'teacher' || profile?.role === 'admin') return true;
        // Students can chat with teachers
        if (profile?.role === 'student') return usr.role === 'teacher';
        // Parents can chat with teachers
        if (profile?.role === 'parent') return usr.role === 'teacher';
        return false;
      });
      setUsers(eligible);
      setFiltered(eligible);
      setLoading(false);
    });
  }, [schoolId, profile]);

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(users);
    } else {
      const q = search.toLowerCase();
      setFiltered(users.filter((u) => u.displayName.toLowerCase().includes(q)));
    }
  }, [search, users]);

  const handleSelect = useCallback(
    async (user: AppUser) => {
      if (!profile || creating) return;
      setCreating(true);
      try {
        const convId = await getOrCreateConversation(profile, user, profile.schoolId);
        onConversationReady(convId, { uid: user.uid, name: user.displayName });
      } catch (e) {
        // fallback
      } finally {
        setCreating(false);
      }
    },
    [profile, creating, onConversationReady]
  );

  const renderItem = ({ item }: { item: AppUser }) => (
    <Pressable style={styles.userRow} onPress={() => handleSelect(item)}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {item.displayName.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.displayName}</Text>
        <Text style={styles.userRole}>
          {item.role.charAt(0).toUpperCase() + item.role.slice(1)}
        </Text>
      </View>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </Pressable>
        <Text style={styles.title}>New Message</Text>
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={COLORS.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name…"
          placeholderTextColor={COLORS.textSecondary}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(u) => u.uid}
          renderItem={renderItem}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No contacts found</Text>
          }
        />
      )}

      {creating && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.text },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 12,
    paddingHorizontal: 12,
    height: 40,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: COLORS.text },

  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: COLORS.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  userInfo: { flex: 1 },
  userName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  userRole: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },

  emptyText: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 32 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
