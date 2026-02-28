// ──────────────────────────────────────────────
// NafAcademy – School Admin Settings
// Manage school profile, terms, classes, subjects
// ──────────────────────────────────────────────
import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RoleGate } from '@/components';
import { useAuth } from '@/hooks/useAuth';
import {
  getSchool,
  updateSchool,
  getTerms,
  createTerm,
  getClasses,
  createClass,
  getSubjects,
  createSubject,
  getUsersBySchool,
} from '@/services/firestore';
import { COLORS } from '@/constants';
import type { School, Term, ClassRoom, Subject, AppUser } from '@/types';

type Tab = 'school' | 'terms' | 'classes' | 'subjects' | 'users';

export default function SettingsScreen() {
  const { schoolId, signOut } = useAuth();
  const [tab, setTab] = useState<Tab>('school');
  const [school, setSchool] = useState<School | null>(null);
  const [terms, setTerms] = useState<Term[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state for adding items
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<Subject['category']>('other');

  const refresh = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    const [s, t, c, sub, u] = await Promise.all([
      getSchool(schoolId),
      getTerms(schoolId),
      getClasses(schoolId),
      getSubjects(schoolId),
      getUsersBySchool(schoolId),
    ]);
    setSchool(s);
    setTerms(t);
    setClasses(c);
    setSubjects(sub);
    setUsers(u);
    setLoading(false);
  }, [schoolId]);

  useEffect(() => { refresh(); }, [refresh]);

  const handleAddItem = useCallback(async () => {
    if (!newName.trim() || !schoolId) return;

    try {
      if (tab === 'terms') {
        await createTerm(schoolId, {
          schoolId,
          name: newName.trim(),
          startDate: Date.now(),
          endDate: Date.now() + 90 * 86400000,
          active: false,
          year: new Date().getFullYear(),
        });
      } else if (tab === 'classes') {
        await createClass(schoolId, {
          schoolId,
          name: newName.trim(),
          level: 'o-level',
          year: new Date().getFullYear(),
        });
      } else if (tab === 'subjects') {
        await createSubject(schoolId, {
          schoolId,
          name: newName.trim(),
          category: newCategory,
        });
      }
      setNewName('');
      setShowAddModal(false);
      refresh();
    } catch (e) {
      Alert.alert('Error', 'Failed to add item');
    }
  }, [tab, newName, newCategory, schoolId, refresh]);

  const roleCounts = {
    admin: users.filter((u) => u.role === 'admin').length,
    teacher: users.filter((u) => u.role === 'teacher').length,
    student: users.filter((u) => u.role === 'student').length,
    parent: users.filter((u) => u.role === 'parent').length,
  };

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'school', label: 'School', icon: 'business-outline' },
    { key: 'terms', label: 'Terms', icon: 'calendar-outline' },
    { key: 'classes', label: 'Classes', icon: 'grid-outline' },
    { key: 'subjects', label: 'Subjects', icon: 'book-outline' },
    { key: 'users', label: 'Users', icon: 'people-outline' },
  ];

  if (loading) {
    return (
      <RoleGate allowed={['admin']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </RoleGate>
    );
  }

  return (
    <RoleGate allowed={['admin']}>
      <View style={styles.container}>
        {/* Tab bar */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar}>
          {tabs.map((t) => (
            <Pressable
              key={t.key}
              style={[styles.tab, tab === t.key && styles.tabActive]}
              onPress={() => setTab(t.key)}
            >
              <Ionicons
                name={t.icon as any}
                size={18}
                color={tab === t.key ? COLORS.primary : COLORS.textSecondary}
              />
              <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>
                {t.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <ScrollView contentContainerStyle={styles.body}>
          {/* ── School Profile Tab ── */}
          {tab === 'school' && school && (
            <>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>School Profile</Text>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Name</Text>
                  <Text style={styles.fieldValue}>{school.name}</Text>
                </View>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Curriculum</Text>
                  <Text style={styles.fieldValue}>{school.curriculum}</Text>
                </View>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Motto</Text>
                  <Text style={styles.fieldValue}>{school.motto ?? '—'}</Text>
                </View>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Status</Text>
                  <View style={[styles.statusBadge, { backgroundColor: school.active ? '#E8F5E9' : '#FFEBEE' }]}>
                    <Text style={{ color: school.active ? COLORS.success : COLORS.error, fontWeight: '600', fontSize: 12 }}>
                      {school.active ? 'Active' : 'Inactive'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Logout button */}
              <Pressable style={styles.logoutBtn} onPress={signOut}>
                <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
                <Text style={styles.logoutText}>Sign Out</Text>
              </Pressable>
            </>
          )}

          {/* ── Terms Tab ── */}
          {tab === 'terms' && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{terms.length} Terms</Text>
                <Pressable style={styles.addBtn} onPress={() => setShowAddModal(true)}>
                  <Ionicons name="add" size={20} color="#fff" />
                  <Text style={styles.addBtnText}>Add Term</Text>
                </Pressable>
              </View>
              {terms.map((t) => (
                <View key={t.id} style={styles.listItem}>
                  <View style={styles.listItemLeft}>
                    <Text style={styles.listItemName}>{t.name}</Text>
                    <Text style={styles.listItemMeta}>
                      {new Date(t.startDate).toLocaleDateString()} — {new Date(t.endDate).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: t.active ? '#E8F5E9' : '#f5f5f5' }]}>
                    <Text style={{ color: t.active ? COLORS.success : COLORS.textSecondary, fontSize: 11, fontWeight: '600' }}>
                      {t.active ? 'Active' : 'Ended'}
                    </Text>
                  </View>
                </View>
              ))}
            </>
          )}

          {/* ── Classes Tab ── */}
          {tab === 'classes' && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{classes.length} Classes</Text>
                <Pressable style={styles.addBtn} onPress={() => setShowAddModal(true)}>
                  <Ionicons name="add" size={20} color="#fff" />
                  <Text style={styles.addBtnText}>Add Class</Text>
                </Pressable>
              </View>
              {classes.map((c) => (
                <View key={c.id} style={styles.listItem}>
                  <View style={styles.listItemLeft}>
                    <Text style={styles.listItemName}>{c.name}</Text>
                    <Text style={styles.listItemMeta}>{c.level} • {c.year}</Text>
                  </View>
                </View>
              ))}
            </>
          )}

          {/* ── Subjects Tab ── */}
          {tab === 'subjects' && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{subjects.length} Subjects</Text>
                <Pressable style={styles.addBtn} onPress={() => setShowAddModal(true)}>
                  <Ionicons name="add" size={20} color="#fff" />
                  <Text style={styles.addBtnText}>Add Subject</Text>
                </Pressable>
              </View>
              {subjects.map((s) => (
                <View key={s.id} style={styles.listItem}>
                  <View style={styles.listItemLeft}>
                    <Text style={styles.listItemName}>{s.name}</Text>
                    <Text style={styles.listItemMeta}>{s.category} {s.code ? `• ${s.code}` : ''}</Text>
                  </View>
                </View>
              ))}
            </>
          )}

          {/* ── Users Tab ── */}
          {tab === 'users' && (
            <>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>User Summary</Text>
                <View style={styles.userStatsRow}>
                  {(['admin', 'teacher', 'student', 'parent'] as const).map((role) => (
                    <View key={role} style={styles.userStatItem}>
                      <Text style={styles.userStatNumber}>{roleCounts[role]}</Text>
                      <Text style={styles.userStatLabel}>{role}s</Text>
                    </View>
                  ))}
                </View>
              </View>
              <Text style={[styles.sectionTitle, { marginTop: 16 }]}>All Users ({users.length})</Text>
              {users.map((u) => (
                <View key={u.uid} style={styles.listItem}>
                  <View style={[styles.smallAvatar, {
                    backgroundColor: u.role === 'admin' ? COLORS.error :
                                     u.role === 'teacher' ? COLORS.primary :
                                     u.role === 'student' ? COLORS.success : COLORS.accent
                  }]}>
                    <Text style={styles.smallAvatarText}>{u.displayName.charAt(0)}</Text>
                  </View>
                  <View style={styles.listItemLeft}>
                    <Text style={styles.listItemName}>{u.displayName}</Text>
                    <Text style={styles.listItemMeta}>{u.role} • {u.email}</Text>
                  </View>
                </View>
              ))}
            </>
          )}
        </ScrollView>

        {/* Add Modal */}
        <Modal visible={showAddModal} animationType="fade" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modal}>
              <Text style={styles.modalTitle}>
                Add {tab === 'terms' ? 'Term' : tab === 'classes' ? 'Class' : 'Subject'}
              </Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Name…"
                value={newName}
                onChangeText={setNewName}
                placeholderTextColor={COLORS.textSecondary}
              />

              {tab === 'subjects' && (
                <View style={styles.categoryRow}>
                  {(['science', 'arts', 'language', 'technical', 'other'] as const).map((cat) => (
                    <Pressable
                      key={cat}
                      style={[styles.catPill, newCategory === cat && styles.catPillActive]}
                      onPress={() => setNewCategory(cat)}
                    >
                      <Text style={[styles.catPillText, newCategory === cat && styles.catPillTextActive]}>
                        {cat}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}

              <View style={styles.modalActions}>
                <Pressable style={styles.cancelBtn} onPress={() => { setShowAddModal(false); setNewName(''); }}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.saveBtn} onPress={handleAddItem}>
                  <Text style={styles.saveBtnText}>Save</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </RoleGate>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  tabBar: { flexGrow: 0, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 6,
  },
  tabActive: { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  tabText: { fontSize: 13, color: COLORS.textSecondary },
  tabTextActive: { color: COLORS.primary, fontWeight: '600' },

  body: { padding: 16, paddingBottom: 40 },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 12 },

  field: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  fieldLabel: { fontSize: 13, color: COLORS.textSecondary },
  fieldValue: { fontSize: 14, fontWeight: '500', color: COLORS.text },

  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: COLORS.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
    borderRadius: 0,
  },
  listItemLeft: { flex: 1, marginLeft: 0 },
  listItemName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  listItemMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },

  smallAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  smallAvatarText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  userStatsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  userStatItem: { alignItems: 'center' },
  userStatNumber: { fontSize: 22, fontWeight: '700', color: COLORS.text },
  userStatLabel: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2, textTransform: 'capitalize' },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    padding: 14,
    backgroundColor: '#FFEBEE',
    borderRadius: 10,
    gap: 8,
  },
  logoutText: { fontSize: 15, fontWeight: '600', color: COLORS.error },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' },
  modal: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 20, width: '85%' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 16 },
  modalInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 12,
  },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
  catPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  catPillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  catPillText: { fontSize: 12, color: COLORS.textSecondary },
  catPillTextActive: { color: '#fff', fontWeight: '600' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 4 },
  cancelBtn: { padding: 10 },
  cancelBtnText: { color: COLORS.textSecondary, fontWeight: '600' },
  saveBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  saveBtnText: { color: '#fff', fontWeight: '600' },
});
