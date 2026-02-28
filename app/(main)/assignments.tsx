// ──────────────────────────────────────────────
// NafAcademy – Assignments Screen
// ──────────────────────────────────────────────
// Shows a list of assignments for the current
// school. Teachers tap → see submissions.
// Students tap → upload their work.
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
import { RoleGate } from '@/components';
import SubmissionList from '@/components/SubmissionList';
import UploadAssignment from '@/components/UploadAssignment';
import CreateAssignment from '@/components/CreateAssignment';
import { useAuth } from '@/hooks/useAuth';
import { getAssignmentsBySchool } from '@/services/firestore';
import { COLORS } from '@/constants';
import type { Assignment } from '@/types';

type SubScreen =
  | { kind: 'list' }
  | { kind: 'submissions'; assignment: Assignment }
  | { kind: 'upload'; assignment: Assignment }
  | { kind: 'create' };

export default function AssignmentsScreen() {
  const { profile, schoolId, hasRole } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [screen, setScreen] = useState<SubScreen>({ kind: 'list' });

  useEffect(() => {
    if (!schoolId) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await getAssignmentsBySchool(schoolId);
        if (!cancelled) setAssignments(data);
      } catch (err) {
        console.warn('Failed to load assignments:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [schoolId]);

  // ── Teacher → Submission list ──
  if (screen.kind === 'submissions') {
    return (
      <RoleGate allowed={['admin', 'teacher']}>
        <SubmissionList
          assignment={screen.assignment}
          onBack={() => setScreen({ kind: 'list' })}
        />
      </RoleGate>
    );
  }

  // ── Student → Upload ──
  if (screen.kind === 'upload') {
    return (
      <RoleGate allowed={['student']}>
        <View style={styles.root}>
          <TouchableOpacity
            style={styles.backRow}
            onPress={() => setScreen({ kind: 'list' })}
          >
            <Ionicons name="arrow-back" size={22} color={COLORS.primary} />
            <Text style={styles.backText}>Assignments</Text>
          </TouchableOpacity>
          <UploadAssignment
            assignment={screen.assignment}
            onComplete={() => setScreen({ kind: 'list' })}
          />
        </View>
      </RoleGate>
    );
  }

  // ── Teacher → Create assignment ──
  if (screen.kind === 'create') {
    return (
      <RoleGate allowed={['admin', 'teacher']}>
        <CreateAssignment onDone={() => {
          setScreen({ kind: 'list' });
          // Reload assignments
          if (schoolId) {
            getAssignmentsBySchool(schoolId).then(setAssignments);
          }
        }} />
      </RoleGate>
    );
  }

  // ── Assignment list ──
  const isTeacher = hasRole('admin', 'teacher');

  return (
    <RoleGate allowed={['admin', 'teacher', 'student']}>
      <View style={styles.root}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Assignments</Text>
          {isTeacher && (
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => setScreen({ kind: 'create' })}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.addBtnText}>New</Text>
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 32 }} />
        ) : assignments.length === 0 ? (
          <Text style={styles.empty}>No assignments yet.</Text>
        ) : (
          <FlatList
            data={assignments}
            keyExtractor={(a) => a.id}
            contentContainerStyle={{ paddingBottom: 24 }}
            renderItem={({ item }) => {
              const overdue = item.dueDate < Date.now();
              return (
                <TouchableOpacity
                  style={styles.card}
                  activeOpacity={0.7}
                  onPress={() =>
                    setScreen(
                      isTeacher
                        ? { kind: 'submissions', assignment: item }
                        : { kind: 'upload', assignment: item }
                    )
                  }
                >
                  <View
                    style={[
                      styles.iconCircle,
                      overdue && styles.iconCircleOverdue,
                    ]}
                  >
                    <Ionicons
                      name="document-text-outline"
                      size={22}
                      color={overdue ? COLORS.error : COLORS.primary}
                    />
                  </View>

                  <View style={styles.cardInfo}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.cardMeta}>
                      {item.subjectId} &bull;{' '}
                      {overdue ? 'Overdue' : `Due ${new Date(item.dueDate).toLocaleDateString()}`}
                    </Text>
                  </View>

                  <Ionicons
                    name={isTeacher ? 'people-outline' : 'cloud-upload-outline'}
                    size={20}
                    color={COLORS.textSecondary}
                  />
                  <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>
    </RoleGate>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
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
  empty: { padding: 20, color: COLORS.textSecondary },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 6,
  },
  backText: { color: COLORS.primary, fontWeight: '600', fontSize: 15 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    gap: 6,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${COLORS.primary}12`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircleOverdue: {
    backgroundColor: `${COLORS.error}12`,
  },
  cardInfo: { flex: 1, marginLeft: 10 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  cardMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 3 },
});
