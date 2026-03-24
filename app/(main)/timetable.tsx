// ──────────────────────────────────────────────
// NafAcademy – Timetable / Schedule Screen
// Weekly class timetable grid.
// Admin/teacher can add lessons; students see
// their class schedule; parents see child's.
// ──────────────────────────────────────────────
import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { useChildSwitcher } from '@/hooks/useChildSwitcher';
import {
  getClasses,
  getSubjects,
  getUsersByRole,
  getTimetableByClass,
  createTimetableEntry,
  deleteTimetableEntry,
  getUser,
} from '@/services/firestore';
import { COLORS, SCHOOL_ID } from '@/constants';
import type { ClassRoom, Subject, TimetableEntry, Weekday, AppUser } from '@/types';

const DAYS: Weekday[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const DAY_SHORT: Record<Weekday, string> = {
  Monday: 'Mon',
  Tuesday: 'Tue',
  Wednesday: 'Wed',
  Thursday: 'Thu',
  Friday: 'Fri',
};

const SLOT_COLORS = [
  '#E3F2FD', '#FFF3E0', '#E8F5E9', '#F3E5F5', '#FBE9E7',
  '#E0F7FA', '#FFF9C4', '#F1F8E9', '#FCE4EC', '#E8EAF6',
];

export default function TimetableScreen() {
  const { profile, hasRole } = useAuth();
  const childSwitcher = useChildSwitcher();

  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<AppUser[]>([]);
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [activeDay, setActiveDay] = useState<Weekday>(
    () => {
      const d = new Date().getDay();
      return d >= 1 && d <= 5 ? DAYS[d - 1] : 'Monday';
    }
  );

  // Add modal
  const [showModal, setShowModal] = useState(false);
  const [newSubjectId, setNewSubjectId] = useState('');
  const [newTeacherId, setNewTeacherId] = useState('');
  const [newDay, setNewDay] = useState<Weekday>('Monday');
  const [newStart, setNewStart] = useState('08:00');
  const [newEnd, setNewEnd] = useState('08:40');
  const [newRoom, setNewRoom] = useState('');
  const [creating, setCreating] = useState(false);

  const canEdit = hasRole('admin') || hasRole('teacher');

  // Load base data
  useEffect(() => {
    (async () => {
      try {
        const [c, s, t] = await Promise.all([
          getClasses(SCHOOL_ID),
          getSubjects(SCHOOL_ID),
          canEdit ? getUsersByRole(SCHOOL_ID, 'teacher') : Promise.resolve([]),
        ]);
        setClasses(c);
        setSubjects(s);
        setTeachers(t);

        // Auto-select class
        if (hasRole('student') && profile?.classId) {
          setSelectedClassId(profile.classId);
        } else if (hasRole('parent') && profile?.childIds?.length) {
          const childId = childSwitcher?.activeChildId ?? profile.childIds[0];
          const child = await getUser(childId);
          if (child?.classId) setSelectedClassId(child.classId);
        } else if (c.length > 0) {
          setSelectedClassId(c[0].id);
        }
      } catch (err) {
        console.warn('Timetable load error:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [profile, canEdit, childSwitcher?.activeChildId]);

  // Load entries when class changes
  useEffect(() => {
    if (!selectedClassId) { setEntries([]); return; }
    (async () => {
      try {
        const e = await getTimetableByClass(SCHOOL_ID, selectedClassId);
        setEntries(e);
      } catch {
        setEntries([]);
      }
    })();
  }, [selectedClassId]);

  // Subject color map (consistent per subject)
  const subjectColorMap = useMemo(() => {
    const map = new Map<string, string>();
    subjects.forEach((s, i) => map.set(s.id, SLOT_COLORS[i % SLOT_COLORS.length]));
    return map;
  }, [subjects]);

  const subjectName = (id: string) => subjects.find((s) => s.id === id)?.name ?? id;
  const className = (id: string) => classes.find((c) => c.id === id)?.name ?? id;

  // Entries for active day
  const dayEntries = entries
    .filter((e) => e.day === activeDay)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const handleCreate = useCallback(async () => {
    if (!newSubjectId || !selectedClassId) {
      Alert.alert('Validation', 'Please select a subject.');
      return;
    }
    setCreating(true);
    try {
      const teacher = teachers.find((t) => t.uid === newTeacherId);
      await createTimetableEntry({
        schoolId: SCHOOL_ID,
        classId: selectedClassId,
        subjectId: newSubjectId,
        teacherId: newTeacherId || undefined,
        teacherName: teacher?.displayName,
        day: newDay,
        startTime: newStart,
        endTime: newEnd,
        room: newRoom.trim() || undefined,
        createdAt: Date.now(),
      });
      // Refresh
      const e = await getTimetableByClass(SCHOOL_ID, selectedClassId);
      setEntries(e);
      setShowModal(false);
      setNewSubjectId('');
      setNewTeacherId('');
      setNewRoom('');
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to add slot');
    } finally {
      setCreating(false);
    }
  }, [newSubjectId, newTeacherId, newDay, newStart, newEnd, newRoom, selectedClassId, teachers]);

  const handleDelete = useCallback(
    (id: string) => {
      Alert.alert('Delete Slot', 'Remove this timetable entry?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteTimetableEntry(id);
            setEntries((prev) => prev.filter((e) => e.id !== id));
          },
        },
      ]);
    },
    []
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
        <Text style={styles.heading}>Timetable</Text>
        {canEdit && (
          <Pressable style={styles.addBtn} onPress={() => { setNewDay(activeDay); setShowModal(true); }}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addBtnText}>Add</Text>
          </Pressable>
        )}
      </View>

      {/* Class picker (admin/teacher) */}
      {canEdit && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.classPicker}>
          {classes.map((c) => (
            <Pressable
              key={c.id}
              style={[styles.classPill, selectedClassId === c.id && styles.classPillActive]}
              onPress={() => setSelectedClassId(c.id)}
            >
              <Text style={[styles.classPillText, selectedClassId === c.id && styles.classPillTextActive]}>
                {c.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* Day tabs */}
      <View style={styles.dayRow}>
        {DAYS.map((d) => {
          const count = entries.filter((e) => e.day === d).length;
          return (
            <Pressable
              key={d}
              style={[styles.dayTab, activeDay === d && styles.dayTabActive]}
              onPress={() => setActiveDay(d)}
            >
              <Text style={[styles.dayText, activeDay === d && styles.dayTextActive]}>
                {DAY_SHORT[d]}
              </Text>
              {count > 0 && (
                <View style={[styles.dayBadge, activeDay === d && styles.dayBadgeActive]}>
                  <Text style={[styles.dayBadgeText, activeDay === d && { color: COLORS.primary }]}>
                    {count}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Selected class label */}
      {selectedClassId && (
        <Text style={styles.classLabel}>
          {className(selectedClassId)} — {activeDay}
        </Text>
      )}

      {/* Empty state */}
      {dayEntries.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={48} color={COLORS.border} />
          <Text style={styles.emptyText}>No lessons on {activeDay}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.slotList} showsVerticalScrollIndicator={false}>
          {dayEntries.map((entry, i) => (
            <View
              key={entry.id}
              style={[
                styles.slotCard,
                { backgroundColor: subjectColorMap.get(entry.subjectId) ?? '#f5f5f5' },
              ]}
            >
              <View style={styles.slotTimeCol}>
                <Text style={styles.slotStart}>{entry.startTime}</Text>
                <View style={styles.slotTimeLine} />
                <Text style={styles.slotEnd}>{entry.endTime}</Text>
              </View>
              <View style={styles.slotContent}>
                <Text style={styles.slotSubject}>{subjectName(entry.subjectId)}</Text>
                {entry.teacherName && (
                  <Text style={styles.slotMeta}>
                    <Ionicons name="person-outline" size={12} color={COLORS.textSecondary} />{' '}
                    {entry.teacherName}
                  </Text>
                )}
                {entry.room && (
                  <Text style={styles.slotMeta}>
                    <Ionicons name="location-outline" size={12} color={COLORS.textSecondary} />{' '}
                    {entry.room}
                  </Text>
                )}
              </View>
              {canEdit && (
                <Pressable onPress={() => handleDelete(entry.id)} hitSlop={8} style={styles.slotDelete}>
                  <Ionicons name="trash-outline" size={16} color={COLORS.error} />
                </Pressable>
              )}
            </View>
          ))}
        </ScrollView>
      )}

      {/* ── Add Slot Modal ── */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView style={{ maxHeight: '85%', width: '90%' }} contentContainerStyle={{ flexGrow: 1 }}>
            <View style={[styles.modal, { width: '100%' }]}>
              <Text style={styles.modalTitle}>Add Timetable Slot</Text>

              {/* Day */}
              <Text style={styles.fieldLabel}>Day</Text>
              <View style={styles.pillRow}>
                {DAYS.map((d) => (
                  <Pressable
                    key={d}
                    style={[styles.pill, newDay === d && styles.pillActive]}
                    onPress={() => setNewDay(d)}
                  >
                    <Text style={[styles.pillText, newDay === d && styles.pillTextActive]}>
                      {DAY_SHORT[d]}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Subject */}
              <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Subject</Text>
              <View style={styles.pillRow}>
                {subjects.map((s) => (
                  <Pressable
                    key={s.id}
                    style={[styles.pill, newSubjectId === s.id && styles.pillActive]}
                    onPress={() => setNewSubjectId(s.id)}
                  >
                    <Text style={[styles.pillText, newSubjectId === s.id && styles.pillTextActive]}>
                      {s.name}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Teacher */}
              {teachers.length > 0 && (
                <>
                  <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Teacher (optional)</Text>
                  <View style={styles.pillRow}>
                    {teachers.map((t) => (
                      <Pressable
                        key={t.uid}
                        style={[styles.pill, newTeacherId === t.uid && styles.pillActive]}
                        onPress={() => setNewTeacherId(newTeacherId === t.uid ? '' : t.uid)}
                      >
                        <Text style={[styles.pillText, newTeacherId === t.uid && styles.pillTextActive]}>
                          {t.displayName}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              )}

              {/* Time */}
              <View style={styles.timeRow}>
                <View style={styles.timeField}>
                  <Text style={styles.fieldLabel}>Start</Text>
                  <TextInput
                    style={styles.input}
                    value={newStart}
                    onChangeText={setNewStart}
                    placeholder="08:00"
                    placeholderTextColor={COLORS.textSecondary}
                  />
                </View>
                <View style={styles.timeField}>
                  <Text style={styles.fieldLabel}>End</Text>
                  <TextInput
                    style={styles.input}
                    value={newEnd}
                    onChangeText={setNewEnd}
                    placeholder="08:40"
                    placeholderTextColor={COLORS.textSecondary}
                  />
                </View>
              </View>

              {/* Room */}
              <Text style={styles.fieldLabel}>Room (optional)</Text>
              <TextInput
                style={styles.input}
                value={newRoom}
                onChangeText={setNewRoom}
                placeholder="e.g. Lab 2"
                placeholderTextColor={COLORS.textSecondary}
              />

              <View style={styles.modalActions}>
                <Pressable style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.saveBtn, creating && { opacity: 0.5 }]}
                  onPress={handleCreate}
                  disabled={creating}
                >
                  {creating ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.saveBtnText}>Add Slot</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </ScrollView>
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
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  addBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  classPicker: { flexGrow: 0, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: COLORS.surface },
  classPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8,
  },
  classPillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  classPillText: { fontSize: 13, color: COLORS.textSecondary },
  classPillTextActive: { color: '#fff', fontWeight: '600' },

  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: COLORS.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  dayTab: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  dayTabActive: { backgroundColor: COLORS.primary + '15' },
  dayText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  dayTextActive: { color: COLORS.primary },
  dayBadge: {
    marginTop: 3,
    backgroundColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  dayBadgeActive: { backgroundColor: COLORS.primary + '20' },
  dayBadgeText: { fontSize: 10, fontWeight: '700', color: COLORS.textSecondary },

  classLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 15, color: COLORS.textSecondary },

  slotList: { padding: 16, paddingBottom: 40 },
  slotCard: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    alignItems: 'center',
  },
  slotTimeCol: { alignItems: 'center', width: 50 },
  slotStart: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  slotTimeLine: { width: 2, height: 14, backgroundColor: COLORS.border, marginVertical: 2 },
  slotEnd: { fontSize: 12, color: COLORS.textSecondary },
  slotContent: { flex: 1, marginLeft: 12 },
  slotSubject: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  slotMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  slotDelete: { padding: 6 },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' },
  modal: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 16 },
  fieldLabel: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 6 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  pillText: { fontSize: 12, color: COLORS.textSecondary },
  pillTextActive: { color: '#fff', fontWeight: '600' },
  timeRow: { flexDirection: 'row', gap: 12, marginTop: 12, marginBottom: 12 },
  timeField: { flex: 1 },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 12,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 4 },
  cancelBtn: { padding: 10 },
  cancelBtnText: { color: COLORS.textSecondary, fontWeight: '600' },
  saveBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  saveBtnText: { color: '#fff', fontWeight: '600' },
});
