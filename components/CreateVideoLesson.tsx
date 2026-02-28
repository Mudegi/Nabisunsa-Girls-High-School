// ──────────────────────────────────────────────
// NafAcademy – Create Video Lesson Form
// ──────────────────────────────────────────────
// Teacher / Admin adds a new video lesson with
// a Google Drive file ID, class, and subject.
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { createVideoLesson, getClasses, getSubjects } from '@/services/firestore';
import { COLORS } from '@/constants';
import type { ClassRoom, Subject } from '@/types';

interface Props {
  onDone: () => void;
}

export default function CreateVideoLesson({ onDone }: Props) {
  const { profile, schoolId } = useAuth();
  const [title, setTitle] = useState('');
  const [driveFileId, setDriveFileId] = useState('');
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');

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

  /**
   * Extract a Google Drive file ID from various URL formats:
   *  - https://drive.google.com/file/d/FILE_ID/view
   *  - https://drive.google.com/open?id=FILE_ID
   *  - Or just the raw FILE_ID
   */
  const parseDriveId = (input: string): string => {
    const trimmed = input.trim();
    // /file/d/ID/
    const match1 = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match1) return match1[1];
    // ?id=ID
    const match2 = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (match2) return match2[1];
    // Raw ID (no slashes/spaces)
    if (/^[a-zA-Z0-9_-]{10,}$/.test(trimmed)) return trimmed;
    return trimmed;
  };

  const handleSave = useCallback(async () => {
    if (!title.trim()) {
      Alert.alert('Validation', 'Please enter a title.');
      return;
    }
    if (!driveFileId.trim()) {
      Alert.alert('Validation', 'Please enter a Google Drive file ID or link.');
      return;
    }
    if (!classId || !subjectId) {
      Alert.alert('Validation', 'Please select a class and subject. Create them in Settings first.');
      return;
    }
    if (!profile || !schoolId) return;

    setSaving(true);
    try {
      const fileId = parseDriveId(driveFileId);
      await createVideoLesson({
        schoolId,
        classId,
        subjectId,
        title: title.trim(),
        driveFileId: fileId,
        createdBy: profile.uid,
        createdAt: Date.now(),
      });
      Alert.alert('Success', 'Video lesson added!');
      onDone();
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to create video lesson.');
    } finally {
      setSaving(false);
    }
  }, [title, driveFileId, classId, subjectId, profile, schoolId, onDone]);

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
        <Text style={styles.backText}>Videos</Text>
      </TouchableOpacity>

      <Text style={styles.heading}>Add Video Lesson</Text>

      {/* Title */}
      <Text style={styles.label}>Title *</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Photosynthesis – Part 1"
        placeholderTextColor={COLORS.textSecondary}
        value={title}
        onChangeText={setTitle}
      />

      {/* Drive link / ID */}
      <Text style={styles.label}>Google Drive Video *</Text>
      <TextInput
        style={styles.input}
        placeholder="Paste Drive link or file ID"
        placeholderTextColor={COLORS.textSecondary}
        autoCapitalize="none"
        value={driveFileId}
        onChangeText={setDriveFileId}
      />
      <Text style={styles.hint}>
        Share your video on Google Drive, set access to "Anyone with the link", then paste the link here.
      </Text>

      {/* Class */}
      <Text style={styles.label}>Class *</Text>
      {classes.length === 0 ? (
        <Text style={styles.hintWarn}>No classes found. Create them in Settings → Classes.</Text>
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
        <Text style={styles.hintWarn}>No subjects found. Create them in Settings → Subjects.</Text>
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
          <Text style={styles.saveBtnText}>Add Video</Text>
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
  hint: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  hintWarn: { fontSize: 13, color: COLORS.error, fontStyle: 'italic' },
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
  saveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 28,
  },
  saveBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
