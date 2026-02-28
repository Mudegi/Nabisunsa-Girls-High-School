// ──────────────────────────────────────────────
// NafAcademy – Submission List (Teacher View)
// ──────────────────────────────────────────────
// Lists all student submissions for a given
// assignment. Tapping one opens SubmissionDetail.
// ──────────────────────────────────────────────
import { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getSubmissionsByAssignment } from '@/services/firestore';
import { COLORS } from '@/constants';
import type { Assignment, Submission } from '@/types';
import SubmissionDetail from './SubmissionDetail';

interface Props {
  assignment: Assignment;
  onBack: () => void;
}

export default function SubmissionList({ assignment, onBack }: Props) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSub, setSelectedSub] = useState<Submission | null>(null);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const data = await getSubmissionsByAssignment(assignment.id);
      setSubmissions(data);
    } catch (err) {
      console.warn('Failed to load submissions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [assignment.id]);

  // ── Grading detail view ──
  if (selectedSub) {
    return (
      <SubmissionDetail
        submission={selectedSub}
        onBack={() => {
          setSelectedSub(null);
          fetchSubmissions(); // refresh to show updated score
        }}
      />
    );
  }

  // ── List view ──
  return (
    <View style={styles.root}>
      {/* Header */}
      <TouchableOpacity style={styles.backRow} onPress={onBack}>
        <Ionicons name="arrow-back" size={22} color={COLORS.primary} />
        <Text style={styles.backText}>Assignments</Text>
      </TouchableOpacity>

      <Text style={styles.title}>{assignment.title}</Text>
      <Text style={styles.subtitle}>
        {submissions.length} submission{submissions.length !== 1 ? 's' : ''}
      </Text>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 32 }} />
      ) : submissions.length === 0 ? (
        <Text style={styles.empty}>No submissions yet.</Text>
      ) : (
        <FlatList
          data={submissions}
          keyExtractor={(s) => s.id}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item }) => {
            const graded = item.score !== null;
            return (
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.7}
                onPress={() => setSelectedSub(item)}
              >
                <Ionicons
                  name={graded ? 'checkmark-circle' : 'ellipse-outline'}
                  size={24}
                  color={graded ? COLORS.success : COLORS.warning}
                />
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName}>{item.studentName}</Text>
                  <Text style={styles.cardDate}>
                    {new Date(item.submittedAt).toLocaleDateString()}
                  </Text>
                </View>
                {graded ? (
                  <Text style={styles.score}>
                    {item.score}/{item.maxScore}
                  </Text>
                ) : (
                  <Text style={styles.pending}>Grade</Text>
                )}
                <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 6,
  },
  backText: { color: COLORS.primary, fontWeight: '600', fontSize: 15 },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    paddingHorizontal: 20,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    paddingHorizontal: 20,
    marginTop: 2,
    marginBottom: 12,
  },
  empty: { padding: 20, color: COLORS.textSecondary },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginTop: 10,
    padding: 14,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardInfo: { flex: 1, marginLeft: 12 },
  cardName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  cardDate: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  score: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.success,
    marginRight: 8,
  },
  pending: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.warning,
    marginRight: 8,
  },
});
