// ──────────────────────────────────────────────
// NafAcademy – Announcements Feed
// Real-time school-wide announcements with
// role-based audience filtering.
// Admins & teachers can create; admins can delete.
// ──────────────────────────────────────────────
import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import {
  onAnnouncements,
  createAnnouncement,
  deleteAnnouncement,
} from '@/services/firestore';
import { notifyByRoles } from '@/services/pushNotifications';
import { COLORS, SCHOOL_ID } from '@/constants';
import type { Announcement, UserRole } from '@/types';

const AUDIENCE_OPTIONS: { label: string; value: UserRole }[] = [
  { label: 'Students', value: 'student' },
  { label: 'Teachers', value: 'teacher' },
  { label: 'Parents', value: 'parent' },
  { label: 'Admins', value: 'admin' },
];

export default function AnnouncementsScreen() {
  const { profile } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  // Create modal state
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<UserRole[]>([]);
  const [pinned, setPinned] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const unsub = onAnnouncements(SCHOOL_ID, (items) => {
      setAnnouncements(items);
      setLoading(false);
    });
    return unsub;
  }, []);

  // Filter announcements to only those visible to the current user's role
  const visibleAnnouncements = announcements.filter((a) => {
    if (!a.audience || a.audience.length === 0) return true; // empty = everyone
    return profile ? a.audience.includes(profile.role) : false;
  });

  // Sort: pinned first, then by date
  const sorted = [...visibleAnnouncements].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return b.createdAt - a.createdAt;
  });

  const canCreate = profile?.role === 'admin' || profile?.role === 'teacher';
  const canDelete = profile?.role === 'admin';

  const handleCreate = useCallback(async () => {
    if (!title.trim() || !body.trim() || !profile) return;
    setCreating(true);
    try {
      await createAnnouncement({
        schoolId: SCHOOL_ID,
        title: title.trim(),
        body: body.trim(),
        audience,
        pinned,
        createdBy: profile.uid,
        createdByName: profile.displayName,
        createdAt: Date.now(),
      });

      // Send push notifications to the audience
      notifyByRoles(audience, {
        title: `📢 ${title.trim()}`,
        body: body.trim().slice(0, 200),
        type: 'announcement',
        link: '/(main)/announcements',
      }).catch(() => {});

      setShowModal(false);
      setTitle('');
      setBody('');
      setAudience([]);
      setPinned(false);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to create announcement');
    } finally {
      setCreating(false);
    }
  }, [title, body, audience, pinned, profile]);

  const handleDelete = useCallback((id: string) => {
    Alert.alert('Delete Announcement', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteAnnouncement(id).catch(() => {}),
      },
    ]);
  }, []);

  const toggleAudience = (role: UserRole) => {
    setAudience((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const formatTime = (ts: number) => {
    const diff = Date.now() - ts;
    if (diff < 60_000) return 'Just now';
    if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
    return new Date(ts).toLocaleDateString();
  };

  const renderItem = ({ item }: { item: Announcement }) => (
    <View style={[styles.card, item.pinned && styles.pinnedCard]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          {item.pinned && (
            <Ionicons name="pin" size={14} color={COLORS.accent} style={{ marginRight: 4 }} />
          )}
          <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
        </View>
        {canDelete && (
          <Pressable onPress={() => handleDelete(item.id)} hitSlop={8}>
            <Ionicons name="trash-outline" size={18} color={COLORS.error} />
          </Pressable>
        )}
      </View>
      <Text style={styles.cardBody}>{item.body}</Text>
      <View style={styles.cardFooter}>
        <Text style={styles.cardMeta}>
          {item.createdByName} · {formatTime(item.createdAt)}
        </Text>
        {item.audience && item.audience.length > 0 && (
          <View style={styles.audienceTags}>
            {item.audience.map((r) => (
              <Text key={r} style={styles.audienceTag}>{r}</Text>
            ))}
          </View>
        )}
      </View>
    </View>
  );

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
        <Text style={styles.heading}>Announcements</Text>
        {canCreate && (
          <Pressable style={styles.createBtn} onPress={() => setShowModal(true)}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.createBtnText}>New</Text>
          </Pressable>
        )}
      </View>

      {sorted.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="megaphone-outline" size={48} color={COLORS.border} />
          <Text style={styles.emptyText}>No announcements yet</Text>
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Create Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>New Announcement</Text>

            <TextInput
              style={styles.input}
              placeholder="Title"
              value={title}
              onChangeText={setTitle}
              placeholderTextColor={COLORS.textSecondary}
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Message body..."
              value={body}
              onChangeText={setBody}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              placeholderTextColor={COLORS.textSecondary}
            />

            {/* Audience selector */}
            <Text style={styles.fieldLabel}>Audience (leave empty for everyone)</Text>
            <View style={styles.audienceRow}>
              {AUDIENCE_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value}
                  style={[
                    styles.audiencePill,
                    audience.includes(opt.value) && styles.audiencePillActive,
                  ]}
                  onPress={() => toggleAudience(opt.value)}
                >
                  <Text
                    style={[
                      styles.audiencePillText,
                      audience.includes(opt.value) && styles.audiencePillTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Pin toggle */}
            <Pressable style={styles.pinRow} onPress={() => setPinned(!pinned)}>
              <Ionicons
                name={pinned ? 'checkbox' : 'square-outline'}
                size={20}
                color={pinned ? COLORS.primary : COLORS.textSecondary}
              />
              <Text style={styles.pinLabel}>Pin to top</Text>
            </Pressable>

            <View style={styles.modalActions}>
              <Pressable
                style={styles.cancelBtn}
                onPress={() => {
                  setShowModal(false);
                  setTitle('');
                  setBody('');
                  setAudience([]);
                  setPinned(false);
                }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.saveBtn, creating && { opacity: 0.5 }]}
                onPress={handleCreate}
                disabled={creating || !title.trim() || !body.trim()}
              >
                {creating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>Publish</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  heading: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  createBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 15, color: COLORS.textSecondary },

  // Cards
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  pinnedCard: {
    borderLeftWidth: 3,
    borderLeftColor: COLORS.accent,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, flex: 1 },
  cardBody: { fontSize: 14, color: COLORS.text, lineHeight: 21, marginBottom: 10 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardMeta: { fontSize: 12, color: COLORS.textSecondary },
  audienceTags: { flexDirection: 'row', gap: 4 },
  audienceTag: {
    fontSize: 10,
    color: COLORS.primary,
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    fontWeight: '600',
    textTransform: 'capitalize',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modal: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    width: '90%',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 16 },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 12,
  },
  textArea: { minHeight: 100 },
  fieldLabel: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 6 },
  audienceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  audiencePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  audiencePillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  audiencePillText: { fontSize: 12, color: COLORS.textSecondary },
  audiencePillTextActive: { color: '#fff', fontWeight: '600' },
  pinRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  pinLabel: { fontSize: 14, color: COLORS.text },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  cancelBtn: { padding: 10 },
  cancelBtnText: { color: COLORS.textSecondary, fontWeight: '600' },
  saveBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  saveBtnText: { color: '#fff', fontWeight: '600' },
});
