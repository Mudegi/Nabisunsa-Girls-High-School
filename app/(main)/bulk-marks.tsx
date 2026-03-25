// ──────────────────────────────────────────────
// NafAcademy – Bulk Marks Entry
// ──────────────────────────────────────────────
// Teachers & admins enter/edit marks for an entire
// class at once: class → subject → term → exam type.
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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { RoleGate } from '@/components';
import {
  getClasses,
  getSubjects,
  getTerms,
  getStudentsByClass,
  getMarksBySubjectTermExam,
  bulkCreateMarks,
  updateMark,
} from '@/services/firestore';
import { COLORS, SCHOOL_ID } from '@/constants';
import { notifyUsers } from '@/services/pushNotifications';
import type { ClassRoom, Subject, Term, AppUser, Mark } from '@/types';

const EXAM_TYPES: { value: Mark['examType']; label: string }[] = [
  { value: 'bot', label: 'BOT' },
  { value: 'mid', label: 'MID' },
  { value: 'eot', label: 'EOT' },
  { value: 'assignment', label: 'Assignment' },
];

interface ScoreRow {
  student: AppUser;
  score: string;          // kept as string for TextInput
  existingMarkId?: string; // if editing an existing mark
}

export default function BulkMarksScreen() {
  return (
    <RoleGate allowed={['admin', 'teacher']}>
      <BulkMarksInner />
    </RoleGate>
  );
}

function BulkMarksInner() {
  const { profile } = useAuth();

  // Picker data
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [loadingPickers, setLoadingPickers] = useState(true);

  // Selections
  const [selClass, setSelClass] = useState<string>('');
  const [selSubject, setSelSubject] = useState<string>('');
  const [selTerm, setSelTerm] = useState<string>('');
  const [selExam, setSelExam] = useState<Mark['examType']>('bot');
  const [maxScore, setMaxScore] = useState('100');

  // Student rows
  const [rows, setRows] = useState<ScoreRow[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Load picker data
  useEffect(() => {
    Promise.all([
      getClasses(SCHOOL_ID),
      getSubjects(SCHOOL_ID),
      getTerms(SCHOOL_ID),
    ]).then(([c, s, t]) => {
      setClasses(c);
      setSubjects(s);
      setTerms(t);
    })
    .catch((err) => console.warn('Bulk marks picker load error:', err))
    .finally(() => setLoadingPickers(false));
  }, []);

  // Load students & existing marks when selection changes
  const handleLoad = useCallback(async () => {
    if (!selClass || !selSubject || !selTerm) {
      Alert.alert('Select all fields', 'Please pick a class, subject, and term first.');
      return;
    }
    setLoadingStudents(true);
    setLoaded(false);

    try {
      const [students, existingMarks] = await Promise.all([
        getStudentsByClass(SCHOOL_ID, selClass),
        getMarksBySubjectTermExam(SCHOOL_ID, selSubject, selTerm, selExam),
      ]);

      // Map existing marks by studentId for quick lookup
      const markMap = new Map<string, Mark>();
      existingMarks.forEach((m) => markMap.set(m.studentId, m));

      const sorted = [...students].sort((a, b) =>
        a.displayName.localeCompare(b.displayName),
      );

      setRows(
        sorted.map((s) => {
          const existing = markMap.get(s.uid);
          return {
            student: s,
            score: existing ? String(existing.score) : '',
            existingMarkId: existing?.id,
          };
        }),
      );
      setLoaded(true);
    } catch (e) {
      Alert.alert('Error', 'Failed to load students.');
    }
    setLoadingStudents(false);
  }, [selClass, selSubject, selTerm, selExam]);

  const updateScore = (index: number, value: string) => {
    // Allow only numeric input and empty string
    if (value !== '' && !/^\d+\.?\d*$/.test(value)) return;
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], score: value };
      return next;
    });
  };

  const handleSave = useCallback(async () => {
    const max = Number(maxScore);
    if (!max || max <= 0) {
      Alert.alert('Invalid max score', 'Please enter a valid maximum score.');
      return;
    }

    const term = terms.find((t) => t.id === selTerm);
    const filledRows = rows.filter((r) => r.score !== '');
    if (filledRows.length === 0) {
      Alert.alert('No scores', 'Enter at least one score before saving.');
      return;
    }

    // Validate all filled scores
    const invalid = filledRows.find((r) => {
      const n = Number(r.score);
      return isNaN(n) || n < 0 || n > max;
    });
    if (invalid) {
      Alert.alert(
        'Invalid score',
        `${invalid.student.displayName} has an invalid score. Must be 0–${max}.`,
      );
      return;
    }

    setSaving(true);
    try {
      const toCreate: Omit<Mark, 'id'>[] = [];
      const updatePromises: Promise<void>[] = [];

      for (const row of filledRows) {
        const score = Number(row.score);
        if (row.existingMarkId) {
          // Update existing mark
          updatePromises.push(
            updateMark(row.existingMarkId, { score, maxScore: max }),
          );
        } else {
          // New mark
          toCreate.push({
            studentId: row.student.uid,
            subjectId: selSubject,
            schoolId: SCHOOL_ID,
            score,
            maxScore: max,
            examType: selExam,
            term: term?.name ?? '',
            termId: selTerm,
            year: term?.year ?? new Date().getFullYear(),
            createdBy: profile?.uid,
            createdAt: Date.now(),
          });
        }
      }

      await Promise.all([
        toCreate.length > 0 ? bulkCreateMarks(toCreate) : Promise.resolve(),
        ...updatePromises,
      ]);

      Alert.alert(
        'Saved',
        `${filledRows.length} mark(s) saved successfully.`,
      );

      // Notify students that marks have been posted
      const subject = subjects.find((s) => s.id === selSubject);
      const examLabel = EXAM_TYPES.find((e) => e.value === selExam)?.label ?? selExam;
      const studentIds = filledRows.map((r) => r.student.uid);
      const studentTokens = filledRows
        .map((r) => r.student.pushToken)
        .filter(Boolean) as string[];
      notifyUsers(studentIds, studentTokens, {
        title: `📊 New ${examLabel} marks posted`,
        body: `${subject?.name ?? 'Subject'} marks have been recorded. Check your performance.`,
        type: 'mark',
        link: '/(main)/marks',
      }).catch(() => {});

      // Reload to get fresh IDs for newly created marks
      handleLoad();
    } catch (e) {
      Alert.alert('Error', 'Failed to save marks. Please try again.');
    }
    setSaving(false);
  }, [rows, maxScore, selSubject, selTerm, selExam, terms, profile, handleLoad]);

  // ── Render helpers ─────────────────
  const filledCount = rows.filter((r) => r.score !== '').length;

  if (loadingPickers) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Bulk Marks Entry</Text>
        <Text style={styles.sub}>
          Enter marks for an entire class at once
        </Text>

        {/* ── Pickers ─────────────────── */}
        <View style={styles.card}>
          {/* Class */}
          <Text style={styles.label}>Class</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillRow}>
            {classes.map((c) => (
              <Pressable
                key={c.id}
                style={[styles.pill, selClass === c.id && styles.pillActive]}
                onPress={() => { setSelClass(c.id); setLoaded(false); }}
              >
                <Text style={[styles.pillText, selClass === c.id && styles.pillTextActive]}>
                  {c.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Subject */}
          <Text style={[styles.label, { marginTop: 14 }]}>Subject</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillRow}>
            {subjects.map((s) => (
              <Pressable
                key={s.id}
                style={[styles.pill, selSubject === s.id && styles.pillActive]}
                onPress={() => { setSelSubject(s.id); setLoaded(false); }}
              >
                <Text style={[styles.pillText, selSubject === s.id && styles.pillTextActive]}>
                  {s.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Term */}
          <Text style={[styles.label, { marginTop: 14 }]}>Term</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillRow}>
            {terms.map((t) => (
              <Pressable
                key={t.id}
                style={[styles.pill, selTerm === t.id && styles.pillActive]}
                onPress={() => { setSelTerm(t.id); setLoaded(false); }}
              >
                <Text style={[styles.pillText, selTerm === t.id && styles.pillTextActive]}>
                  {t.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Exam Type */}
          <Text style={[styles.label, { marginTop: 14 }]}>Exam Type</Text>
          <View style={styles.examRow}>
            {EXAM_TYPES.map((e) => (
              <Pressable
                key={e.value}
                style={[styles.examPill, selExam === e.value && styles.examPillActive]}
                onPress={() => { setSelExam(e.value); setLoaded(false); }}
              >
                <Text style={[styles.examPillText, selExam === e.value && styles.examPillTextActive]}>
                  {e.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Max Score */}
          <Text style={[styles.label, { marginTop: 14 }]}>Max Score</Text>
          <TextInput
            style={styles.maxScoreInput}
            value={maxScore}
            onChangeText={(v) => { if (/^\d*$/.test(v)) setMaxScore(v); }}
            keyboardType="numeric"
            placeholder="100"
            placeholderTextColor={COLORS.textSecondary}
          />

          {/* Load Students button */}
          <Pressable
            style={[styles.loadBtn, loadingStudents && { opacity: 0.6 }]}
            onPress={handleLoad}
            disabled={loadingStudents}
          >
            {loadingStudents ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="people" size={18} color="#fff" />
                <Text style={styles.loadBtnText}>Load Students</Text>
              </>
            )}
          </Pressable>
        </View>

        {/* ── Score Grid ─────────────── */}
        {loaded && (
          <>
            {rows.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="alert-circle-outline" size={40} color={COLORS.border} />
                <Text style={styles.emptyText}>No students found in this class</Text>
              </View>
            ) : (
              <View style={styles.card}>
                <View style={styles.gridHeader}>
                  <Text style={[styles.gridHeaderText, { flex: 1 }]}>Student</Text>
                  <Text style={[styles.gridHeaderText, { width: 90, textAlign: 'center' }]}>
                    Score / {maxScore || '?'}
                  </Text>
                </View>

                {rows.map((row, idx) => (
                  <View key={row.student.uid} style={styles.gridRow}>
                    <View style={styles.studentInfo}>
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                          {row.student.displayName.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <Text style={styles.studentName} numberOfLines={1}>
                        {row.student.displayName}
                      </Text>
                      {row.existingMarkId && (
                        <Ionicons
                          name="checkmark-circle"
                          size={14}
                          color={COLORS.success}
                          style={{ marginLeft: 4 }}
                        />
                      )}
                    </View>
                    <TextInput
                      style={[
                        styles.scoreInput,
                        row.existingMarkId ? styles.scoreInputExisting : null,
                      ]}
                      value={row.score}
                      onChangeText={(v) => updateScore(idx, v)}
                      keyboardType="numeric"
                      placeholder="—"
                      placeholderTextColor={COLORS.border}
                      maxLength={6}
                    />
                  </View>
                ))}

                {/* Summary + Save */}
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryText}>
                    {filledCount} / {rows.length} filled
                  </Text>
                  <Pressable
                    style={[styles.saveBtn, (saving || filledCount === 0) && { opacity: 0.5 }]}
                    onPress={handleSave}
                    disabled={saving || filledCount === 0}
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="save" size={18} color="#fff" />
                        <Text style={styles.saveBtnText}>Save Marks</Text>
                      </>
                    )}
                  </Pressable>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Styles ──────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  heading: { fontSize: 22, fontWeight: '700', color: COLORS.text },
  sub: { fontSize: 14, color: COLORS.textSecondary, marginTop: 2, marginBottom: 16 },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },

  label: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6 },

  pillRow: { flexGrow: 0, marginBottom: 2 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: COLORS.background,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  pillText: { fontSize: 13, color: COLORS.textSecondary },
  pillTextActive: { color: '#fff', fontWeight: '600' },

  examRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  examPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.background,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  examPillActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  examPillText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  examPillTextActive: { color: '#fff', fontWeight: '700' },

  maxScoreInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.text,
    backgroundColor: COLORS.background,
    width: 100,
  },

  loadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 18,
    gap: 8,
  },
  loadBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },

  // Grid
  gridHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 6,
  },
  gridHeaderText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase' },

  gridRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  studentInfo: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  studentName: { fontSize: 14, color: COLORS.text, flex: 1 },

  scoreInput: {
    width: 80,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
    backgroundColor: COLORS.background,
  },
  scoreInputExisting: {
    borderColor: COLORS.success,
    backgroundColor: COLORS.success + '10',
  },

  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  summaryText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },

  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 6,
  },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  emptyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 40,
    alignItems: 'center',
    gap: 10,
  },
  emptyText: { fontSize: 14, color: COLORS.textSecondary },
});
