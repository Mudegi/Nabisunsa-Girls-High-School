// ──────────────────────────────────────────────
// NafAcademy – Create Assignment Form
// ──────────────────────────────────────────────
// Teacher / Admin creates assignments for a class.
// ──────────────────────────────────────────────
import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '@/hooks/useAuth';
import { createAssignment, getClasses, getSubjects } from '@/services/firestore';
import { COLORS } from '@/constants';
import type { ClassRoom, Subject } from '@/types';

interface Props {
  onDone: () => void;
}

const TYPES = [
  { value: 'exercise', label: 'Exercise' },
  { value: 'activity', label: 'Activity' },
  { value: 'exam', label: 'Exam' },
] as const;

export default function CreateAssignment({ onDone }: Props) {
  const { profile, schoolId } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'exercise' | 'activity' | 'exam'>('exercise');
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 7 * 86400000));
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!schoolId) return;
    Promise.all([getClasses(schoolId), getSubjects(schoolId)])
      .then(([c, s]) => {
        setClasses(c);
        setSubjects(s);
        if (c.length > 0) setClassId(c[0].id);
        if (s.length > 0) setSubjectId(s[0].id);
      })
      .finally(() => setLoadingData(false));
  }, [schoolId]);

  const handleSave = useCallback(async () => {
    if (!title.trim()) {
      Alert.alert('Validation', 'Please enter a title.');
      return;
    }
    if (!classId || !subjectId) {
      Alert.alert('Validation', 'Please select a class and subject. Create them in Settings first.');
      return;
    }
    if (!profile || !schoolId) return;

    setSaving(true);
    try {
      await createAssignment({
        schoolId,
        classId,
        subjectId,
        title: title.trim(),
        description: description.trim() || undefined,
        type,
        dueDate: dueDate.getTime(),
        createdBy: profile.uid,
        createdAt: Date.now(),
      });
      Alert.alert('Success', 'Assignment created!');
      onDone();
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to create assignment.');
    } finally {
      setSaving(false);
    }
  }, [title, description, type, classId, subjectId, dueDate, profile, schoolId, onDone]);

  if (loadingData) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={onDone} style={styles.backRow}>
        <Ionicons name="arrow-back" size={22} color={COLORS.primary} />
        <Text style={styles.backText}>Assignments</Text>
      </TouchableOpacity>

      <Text style={styles.heading}>New Assignment</Text>

      {/* Title */}
      <Text style={styles.label}>Title *</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Chapter 5 Exercises"
        placeholderTextColor={COLORS.textSecondary}
        value={title}
        onChangeText={setTitle}
      />

      {/* Description */}
      <Text style={styles.label}>Description</Text>
      <TextInput
        style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
        placeholder="Optional instructions..."
        placeholderTextColor={COLORS.textSecondary}
        value={description}
        onChangeText={setDescription}
        multiline
      />

      {/* Type */}
      <Text style={styles.label}>Type</Text>
      <View style={styles.pillRow}>
        {TYPES.map((t) => (
          <TouchableOpacity
            key={t.value}
            style={[styles.pill, type === t.value && styles.pillActive]}
            onPress={() => setType(t.value)}
          >
            <Text style={[styles.pillText, type === t.value && styles.pillTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Class */}
      <Text style={styles.label}>Class *</Text>
      {classes.length === 0 ? (
        <Text style={styles.hint}>No classes found. Create them in Settings → Classes.</Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hScroll}>
          {classes.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={[styles.pill, classId === c.id && styles.pillActive]}
              onPress={() => setClassId(c.id)}
            >
              <Text style={[styles.pillText, classId === c.id && styles.pillTextActive]}>
                {c.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Subject */}
      <Text style={styles.label}>Subject *</Text>
      {subjects.length === 0 ? (
        <Text style={styles.hint}>No subjects found. Create them in Settings → Subjects.</Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hScroll}>
          {subjects.map((s) => (
            <TouchableOpacity
              key={s.id}
              style={[styles.pill, subjectId === s.id && styles.pillActive]}
              onPress={() => setSubjectId(s.id)}
            >
              <Text style={[styles.pillText, subjectId === s.id && styles.pillTextActive]}>
                {s.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Due Date */}
      <Text style={styles.label}>Due Date</Text>
      <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
        <Ionicons name="calendar-outline" size={18} color={COLORS.primary} />
        <Text style={styles.dateText}>{dueDate.toLocaleDateString()}</Text>
      </TouchableOpacity>
      {showDatePicker && (
        <DateTimePicker
          value={dueDate}
          mode="date"
          minimumDate={new Date()}
          onChange={(_, date) => {
            setShowDatePicker(Platform.OS === 'ios');
            if (date) setDueDate(date);
          }}
        />
      )}

      {/* Save */}
      <TouchableOpacity
        style={[styles.saveBtn, saving && { opacity: 0.6 }]}
        onPress={handleSave}
        disabled={saving}
        activeOpacity={0.8}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveBtnText}>Create Assignment</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  backText: { color: COLORS.primary, fontWeight: '600', fontSize: 15 },
  heading: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: 20 },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
    backgroundColor: COLORS.surface,
  },
  hint: { fontSize: 13, color: COLORS.textSecondary, fontStyle: 'italic' },
  pillRow: { flexDirection: 'row', gap: 8 },
  hScroll: { flexGrow: 0, marginBottom: 4 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8,
  },
  pillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  pillText: { fontSize: 13, fontWeight: '500', color: COLORS.textSecondary },
  pillTextActive: { color: '#fff' },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
  },
  dateText: { fontSize: 15, color: COLORS.text },
  saveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 28,
  },
  saveBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
