// ──────────────────────────────────────────────
// NafAcademy – Term Report Card Screen
// Select student + term → generate & share PDF
// ──────────────────────────────────────────────
import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useAuth } from '@/hooks/useAuth';
import { useChildSwitcher } from '@/hooks/useChildSwitcher';
import {
  getUsersByRole,
  getTerms,
  getClasses,
  getSubjects,
  getMarksByStudentAndTerm,
} from '@/services/firestore';
import { COLORS, SCHOOL_ID } from '@/constants';
import { buildReportData, generateReportCardHTML } from '@/utils/reportCard';
import type { AppUser, Term, ClassRoom, Subject } from '@/types';

export default function ReportCardScreen() {
  const { profile, hasRole } = useAuth();
  const childSwitcher = useChildSwitcher();

  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<AppUser[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  // Selection state
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [selectedTerm, setSelectedTerm] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const isAdminOrTeacher = hasRole('admin') || hasRole('teacher');
  const isParent = hasRole('parent');
  const isStudent = hasRole('student');

  useEffect(() => {
    (async () => {
      try {
        const [t, c, s] = await Promise.all([
          getTerms(SCHOOL_ID),
          getClasses(SCHOOL_ID),
          getSubjects(SCHOOL_ID),
        ]);
        setTerms(t);
        setClasses(c);
        setSubjects(s);

        if (isAdminOrTeacher) {
          const stds = await getUsersByRole(SCHOOL_ID, 'student');
          setStudents(stds);
        } else if (isParent && profile?.childIds?.length) {
          // Parent: use child switcher or first child
          const activeChild = childSwitcher?.activeChildId ?? profile.childIds[0];
          setSelectedStudent(activeChild);
        } else if (isStudent && profile) {
          setSelectedStudent(profile.uid);
        }
      } catch (err) {
        console.warn('ReportCard load error:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [profile, isAdminOrTeacher, isParent, isStudent, childSwitcher?.activeChildId]);

  const handleGenerate = useCallback(async () => {
    if (!selectedStudent || !selectedTerm) {
      Alert.alert('Select', 'Please select a student and term.');
      return;
    }
    setGenerating(true);
    try {
      const marks = await getMarksByStudentAndTerm(selectedStudent, selectedTerm);
      if (marks.length === 0) {
        Alert.alert('No Marks', 'No marks found for this student in the selected term.');
        setGenerating(false);
        return;
      }

      const student =
        students.find((s) => s.uid === selectedStudent) ??
        (profile?.uid === selectedStudent ? profile : null);
      const term = terms.find((t) => t.id === selectedTerm);
      const classroom = classes.find((c) => c.id === (student as any)?.classId) ?? null;

      if (!student || !term) {
        Alert.alert('Error', 'Could not find student or term data.');
        setGenerating(false);
        return;
      }

      const subjectMap = new Map(subjects.map((s) => [s.id, s]));
      const data = buildReportData(student, term, classroom, marks, subjectMap);
      const html = generateReportCardHTML(data);

      const { uri } = await Print.printToFileAsync({ html });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Report Card – ${student.displayName}`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('PDF Saved', `Report card saved to:\n${uri}`);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to generate report card.');
    } finally {
      setGenerating(false);
    }
  }, [selectedStudent, selectedTerm, students, terms, classes, subjects, profile]);

  const selectedStudentName = (() => {
    if (!selectedStudent) return null;
    const s = students.find((s) => s.uid === selectedStudent);
    if (s) return s.displayName;
    if (profile?.uid === selectedStudent) return profile.displayName;
    return selectedStudent;
  })();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.body}>
      <Text style={styles.heading}>Term Report Card</Text>
      <Text style={styles.subheading}>Generate a downloadable PDF report card</Text>

      {/* ── Term Picker ── */}
      <Text style={styles.label}>Select Term</Text>
      <View style={styles.pillRow}>
        {terms.map((t) => (
          <Pressable
            key={t.id}
            style={[styles.pill, selectedTerm === t.id && styles.pillActive]}
            onPress={() => setSelectedTerm(t.id)}
          >
            <Text style={[styles.pillText, selectedTerm === t.id && styles.pillTextActive]}>
              {t.name}
            </Text>
          </Pressable>
        ))}
        {terms.length === 0 && (
          <Text style={styles.emptyNote}>No terms configured yet.</Text>
        )}
      </View>

      {/* ── Student Picker (admin/teacher only) ── */}
      {isAdminOrTeacher && (
        <>
          <Text style={[styles.label, { marginTop: 20 }]}>Select Student</Text>
          <ScrollView
            style={styles.studentList}
            nestedScrollEnabled
            showsVerticalScrollIndicator
          >
            {students.map((s) => (
              <Pressable
                key={s.uid}
                style={[styles.studentRow, selectedStudent === s.uid && styles.studentRowActive]}
                onPress={() => setSelectedStudent(s.uid)}
              >
                <View
                  style={[
                    styles.avatar,
                    {
                      backgroundColor:
                        selectedStudent === s.uid ? COLORS.primary : COLORS.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.avatarText,
                      selectedStudent === s.uid && { color: '#fff' },
                    ]}
                  >
                    {s.displayName.charAt(0)}
                  </Text>
                </View>
                <View style={styles.studentInfo}>
                  <Text style={styles.studentName}>{s.displayName}</Text>
                  <Text style={styles.studentMeta}>
                    {classes.find((c) => c.id === s.classId)?.name ?? 'No class'} · {s.email}
                  </Text>
                </View>
                {selectedStudent === s.uid && (
                  <Ionicons name="checkmark-circle" size={22} color={COLORS.primary} />
                )}
              </Pressable>
            ))}
            {students.length === 0 && (
              <Text style={styles.emptyNote}>No students found.</Text>
            )}
          </ScrollView>
        </>
      )}

      {/* ── Student/Parent: show who the report is for ── */}
      {!isAdminOrTeacher && selectedStudentName && (
        <View style={styles.selectedCard}>
          <Ionicons name="person-circle-outline" size={32} color={COLORS.primary} />
          <View style={{ marginLeft: 10 }}>
            <Text style={styles.selectedLabel}>Report for</Text>
            <Text style={styles.selectedName}>{selectedStudentName}</Text>
          </View>
        </View>
      )}

      {/* ── Generate Button ── */}
      <Pressable
        style={[
          styles.generateBtn,
          (!selectedStudent || !selectedTerm || generating) && { opacity: 0.5 },
        ]}
        onPress={handleGenerate}
        disabled={!selectedStudent || !selectedTerm || generating}
      >
        {generating ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <Ionicons name="document-text" size={20} color="#fff" />
            <Text style={styles.generateBtnText}>Generate PDF Report Card</Text>
          </>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  body: { padding: 16, paddingBottom: 40 },
  heading: { fontSize: 22, fontWeight: '700', color: COLORS.text },
  subheading: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4, marginBottom: 20 },

  label: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  pillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  pillText: { fontSize: 13, color: COLORS.textSecondary },
  pillTextActive: { color: '#fff', fontWeight: '600' },

  studentList: { maxHeight: 260, marginBottom: 8 },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  studentRowActive: { backgroundColor: COLORS.primary + '10' },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 15, fontWeight: '700', color: COLORS.textSecondary },
  studentInfo: { flex: 1, marginLeft: 10 },
  studentName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  studentMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },

  selectedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    marginTop: 20,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  selectedLabel: { fontSize: 12, color: COLORS.textSecondary },
  selectedName: { fontSize: 16, fontWeight: '600', color: COLORS.text },

  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 24,
    gap: 8,
  },
  generateBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  emptyNote: { fontSize: 13, color: COLORS.textSecondary, fontStyle: 'italic' },
});
