// ──────────────────────────────────────────────
// NafAcademy – Submission Detail / Grading
// ──────────────────────────────────────────────
// Shows the student's uploaded PNG/PDF and a
// numeric input for the teacher to enter marks.
// ──────────────────────────────────────────────
import { useState } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { gradeSubmission } from '@/services/firestore';
import { useAuth } from '@/hooks/useAuth';
import { COLORS } from '@/constants';
import type { Submission } from '@/types';

interface Props {
  submission: Submission;
  onBack: () => void;
}

export default function SubmissionDetail({ submission, onBack }: Props) {
  const { profile } = useAuth();
  const [marks, setMarks] = useState(
    submission.score !== null ? String(submission.score) : ''
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const score = Number(marks);
    if (isNaN(score) || score < 0 || score > submission.maxScore) {
      Alert.alert(
        'Invalid Marks',
        `Enter a number between 0 and ${submission.maxScore}.`
      );
      return;
    }

    setSaving(true);
    try {
      await gradeSubmission(submission.id, score, profile?.uid ?? '');
      Alert.alert('Saved', `${submission.studentName} scored ${score}/${submission.maxScore}`);
      onBack();
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Could not save marks.');
    } finally {
      setSaving(false);
    }
  };

  const openPdf = () => {
    Linking.openURL(submission.fileUrl).catch(() =>
      Alert.alert('Error', 'Could not open this PDF.')
    );
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      {/* Back */}
      <TouchableOpacity style={styles.backRow} onPress={onBack}>
        <Ionicons name="arrow-back" size={22} color={COLORS.primary} />
        <Text style={styles.backText}>Back to Submissions</Text>
      </TouchableOpacity>

      {/* Student info */}
      <Text style={styles.name}>{submission.studentName}</Text>
      <Text style={styles.meta}>
        Submitted {new Date(submission.submittedAt).toLocaleString()}
      </Text>

      {/* ── File preview ── */}
      {submission.fileType === 'image' ? (
        <Image
          source={{ uri: submission.fileUrl }}
          style={styles.image}
          resizeMode="contain"
        />
      ) : (
        <TouchableOpacity style={styles.pdfCard} onPress={openPdf}>
          <Ionicons name="document-text-outline" size={48} color={COLORS.primary} />
          <Text style={styles.pdfText}>Tap to open PDF</Text>
        </TouchableOpacity>
      )}

      {/* ── Grading input ── */}
      <View style={styles.gradingSection}>
        <Text style={styles.gradingLabel}>
          Marks (out of {submission.maxScore})
        </Text>

        <TextInput
          style={styles.marksInput}
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor={COLORS.textSecondary}
          value={marks}
          onChangeText={setMarks}
          maxLength={4}
        />

        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.saveBtnText}>
              {submission.score !== null ? 'Update Marks' : 'Save Marks'}
            </Text>
          )}
        </TouchableOpacity>

        {submission.score !== null && (
          <Text style={styles.gradedNote}>
            Previously graded: {submission.score}/{submission.maxScore}
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingBottom: 40 },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 6,
  },
  backText: { color: COLORS.primary, fontWeight: '600', fontSize: 15 },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    paddingHorizontal: 20,
  },
  meta: {
    fontSize: 12,
    color: COLORS.textSecondary,
    paddingHorizontal: 20,
    marginTop: 2,
    marginBottom: 16,
  },

  // Image
  image: {
    width: '100%',
    height: 350,
    backgroundColor: '#000',
  },

  // PDF
  pdfCard: {
    marginHorizontal: 20,
    padding: 32,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pdfText: {
    marginTop: 8,
    color: COLORS.primary,
    fontWeight: '500',
    fontSize: 14,
  },

  // Grading
  gradingSection: {
    marginTop: 24,
    marginHorizontal: 20,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  gradingLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 10,
  },
  marksInput: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  gradedNote: {
    marginTop: 12,
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
