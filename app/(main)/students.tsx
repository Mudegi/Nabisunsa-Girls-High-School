// ──────────────────────────────────────────────
// NafAcademy – Students Management Screen
// Admin/Teacher view: list, search, manage students
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
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RoleGate } from '@/components';
import { useAuth } from '@/hooks/useAuth';
import { getUsersByRole, getClasses } from '@/services/firestore';
import { COLORS } from '@/constants';
import type { AppUser, ClassRoom } from '@/types';

export default function StudentsScreen() {
  const { schoolId, hasRole } = useAuth();
  const [students, setStudents] = useState<AppUser[]>([]);
  const [filtered, setFiltered] = useState<AppUser[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<AppUser | null>(null);

  // Load students and classes
  useEffect(() => {
    if (!schoolId) return;
    setLoading(true);
    Promise.all([
      getUsersByRole(schoolId, 'student'),
      getClasses(schoolId),
    ]).then(([s, c]) => {
      setStudents(s);
      setFiltered(s);
      setClasses(c);
      setLoading(false);
    });
  }, [schoolId]);

  // Filter by search + class
  useEffect(() => {
    let result = students;

    if (selectedClass) {
      result = result.filter((s) => s.classId === selectedClass);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.displayName.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q)
      );
    }

    setFiltered(result);
  }, [search, selectedClass, students]);

  const renderStudent = ({ item }: { item: AppUser }) => (
    <Pressable style={styles.studentCard} onPress={() => setSelectedStudent(item)}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {item.displayName.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.studentInfo}>
        <Text style={styles.studentName}>{item.displayName}</Text>
        <Text style={styles.studentMeta}>
          {item.classId ?? 'No class'} • {item.email}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
    </Pressable>
  );

  return (
    <RoleGate allowed={['admin', 'teacher']}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.heading}>Students</Text>
          <Text style={styles.count}>{filtered.length} total</Text>
        </View>

        {/* Search bar */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color={COLORS.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name or email…"
              placeholderTextColor={COLORS.textSecondary}
              value={search}
              onChangeText={setSearch}
            />
          </View>
        </View>

        {/* Class filter */}
        {classes.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.classFilter}>
            <Pressable
              style={[styles.classPill, !selectedClass && styles.classPillActive]}
              onPress={() => setSelectedClass(null)}
            >
              <Text style={[styles.classPillText, !selectedClass && styles.classPillTextActive]}>
                All
              </Text>
            </Pressable>
            {classes.map((c) => (
              <Pressable
                key={c.id}
                style={[styles.classPill, selectedClass === c.id && styles.classPillActive]}
                onPress={() => setSelectedClass(c.id)}
              >
                <Text style={[styles.classPillText, selectedClass === c.id && styles.classPillTextActive]}>
                  {c.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {/* Student list */}
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(s) => s.uid}
            renderItem={renderStudent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.center}>
                <Ionicons name="people-outline" size={48} color={COLORS.border} />
                <Text style={styles.emptyText}>No students found</Text>
              </View>
            }
          />
        )}

        {/* Student detail modal */}
        <Modal visible={!!selectedStudent} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modal}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Student Details</Text>
                <Pressable onPress={() => setSelectedStudent(null)}>
                  <Ionicons name="close" size={24} color={COLORS.text} />
                </Pressable>
              </View>

              {selectedStudent && (
                <ScrollView style={styles.modalBody}>
                  {/* Large avatar */}
                  <View style={styles.modalAvatar}>
                    <Text style={styles.modalAvatarText}>
                      {selectedStudent.displayName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.modalName}>{selectedStudent.displayName}</Text>

                  <View style={styles.detailRow}>
                    <Ionicons name="mail-outline" size={18} color={COLORS.textSecondary} />
                    <Text style={styles.detailText}>{selectedStudent.email}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="school-outline" size={18} color={COLORS.textSecondary} />
                    <Text style={styles.detailText}>
                      Class: {selectedStudent.classId ?? 'Not assigned'}
                    </Text>
                  </View>
                  {selectedStudent.phone && (
                    <View style={styles.detailRow}>
                      <Ionicons name="call-outline" size={18} color={COLORS.textSecondary} />
                      <Text style={styles.detailText}>{selectedStudent.phone}</Text>
                    </View>
                  )}
                  <View style={styles.detailRow}>
                    <Ionicons name="calendar-outline" size={18} color={COLORS.textSecondary} />
                    <Text style={styles.detailText}>
                      Joined: {new Date(selectedStudent.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="shield-checkmark-outline" size={18} color={COLORS.textSecondary} />
                    <Text style={styles.detailText}>
                      Status: {selectedStudent.active !== false ? 'Active' : 'Inactive'}
                    </Text>
                  </View>
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>
      </View>
    </RoleGate>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },

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
  count: { fontSize: 13, color: COLORS.textSecondary },

  searchRow: { padding: 12, paddingBottom: 0 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    paddingHorizontal: 12,
    height: 40,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: COLORS.text },

  classFilter: { flexGrow: 0, paddingHorizontal: 12, paddingVertical: 10 },
  classPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 6,
  },
  classPillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  classPillText: { fontSize: 13, color: COLORS.textSecondary },
  classPillTextActive: { color: '#fff', fontWeight: '600' },

  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: COLORS.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  studentMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },

  emptyText: { fontSize: 15, color: COLORS.textSecondary, marginTop: 12 },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modal: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '75%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  modalBody: { padding: 20 },
  modalAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalAvatarText: { color: '#fff', fontSize: 24, fontWeight: '700' },
  modalName: { fontSize: 18, fontWeight: '700', color: COLORS.text, textAlign: 'center', marginBottom: 20 },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  detailText: { fontSize: 14, color: COLORS.text, marginLeft: 12 },
});
