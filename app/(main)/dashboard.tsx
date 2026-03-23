// ──────────────────────────────────────────────
// Dashboard Screen – Overview widgets
// ──────────────────────────────────────────────
import { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useChildSwitcher } from '@/hooks/useChildSwitcher';
import {
  getAssignmentsBySchool,
  getMarksByStudent,
  getSubmissionsByStudent,
  onUserNotifications,
} from '@/services/firestore';
import { COLORS, EA_GRADE_SCALE, SCHOOL_NAME } from '@/constants';
import type { Assignment, Mark, AppNotification } from '@/types';

function gradeFromPct(pct: number) {
  for (const g of EA_GRADE_SCALE) {
    if (pct >= g.min) return g;
  }
  return EA_GRADE_SCALE[EA_GRADE_SCALE.length - 1];
}

export default function DashboardScreen() {
  const { profile, hasRole, schoolId } = useAuth();
  const { activeChildId } = useChildSwitcher();
  const router = useRouter();

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [pendingSubmissions, setPendingSubmissions] = useState(0);
  const [loading, setLoading] = useState(true);

  // Determine student ID (student=self, parent=active child)
  const studentId = useMemo(() => {
    if (hasRole('student')) return profile?.uid ?? null;
    if (hasRole('parent')) return activeChildId;
    return null;
  }, [profile, hasRole, activeChildId]);

  // Fetch data
  useEffect(() => {
    if (!profile || !schoolId) { setLoading(false); return; }
    setLoading(true);

    const promises: Promise<void>[] = [];

    // Assignments
    promises.push(
      getAssignmentsBySchool(schoolId).then((a) => {
        const upcoming = a.filter((x) => x.dueDate >= Date.now()).slice(0, 5);
        setAssignments(upcoming);
      })
    );

    // Student/parent: load marks
    if (studentId) {
      promises.push(
        getMarksByStudent(studentId).then((m) => {
          setMarks(m.slice(0, 20));
        })
      );
      promises.push(
        getSubmissionsByStudent(studentId).then((subs) => {
          setPendingSubmissions(subs.filter((s) => s.score === null).length);
        })
      );
    }

    Promise.all(promises).then(() => setLoading(false));
  }, [profile, schoolId, studentId]);

  // Real-time unread notifications count
  useEffect(() => {
    if (!profile) return;
    const unsub = onUserNotifications(profile.uid, (notifs) => {
      setUnreadNotifs(notifs.filter((n) => !n.read).length);
    });
    return unsub;
  }, [profile]);

  // Compute overall average for student/parent
  const overallAvg = useMemo(() => {
    if (marks.length === 0) return null;
    const total = marks.reduce((sum, m) => sum + (m.maxScore > 0 ? (m.score / m.maxScore) * 100 : 0), 0);
    return Math.round(total / marks.length);
  }, [marks]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const isStudentOrParent = hasRole('student', 'parent');
  const isTeacherOrAdmin = hasRole('teacher', 'admin');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Greeting */}
      <Text style={styles.greeting}>
        Welcome, {profile?.displayName ?? 'User'} 👋
      </Text>
      <Text style={styles.role}>
        {profile?.role?.toUpperCase()} • {SCHOOL_NAME}
      </Text>

      {/* Admin setup checklist */}
      {hasRole('admin') && (
        <Pressable style={styles.setupCard} onPress={() => router.push('/(main)/settings')}>
          <Ionicons name="construct-outline" size={20} color={COLORS.accent} />
          <Text style={styles.setupText}>
            Set up your school: add Terms, Classes, and Subjects in Settings to get started.
          </Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
        </Pressable>
      )}

      {/* Quick stat cards */}
      <View style={styles.statsRow}>
        <Pressable style={styles.statCard} onPress={() => router.push('/(main)/assignments')}>
          <Ionicons name="document-text-outline" size={24} color={COLORS.primary} />
          <Text style={styles.statNumber}>{assignments.length}</Text>
          <Text style={styles.statLabel}>Upcoming</Text>
        </Pressable>

        {isStudentOrParent && (
          <Pressable style={styles.statCard} onPress={() => router.push('/(main)/marks')}>
            <Ionicons name="stats-chart-outline" size={24} color={COLORS.success} />
            <Text style={styles.statNumber}>
              {overallAvg !== null ? `${overallAvg}%` : '—'}
            </Text>
            <Text style={styles.statLabel}>Average</Text>
          </Pressable>
        )}

        <Pressable style={styles.statCard} onPress={() => router.push('/(main)/notifications')}>
          <Ionicons name="notifications-outline" size={24} color={COLORS.accent} />
          <Text style={styles.statNumber}>{unreadNotifs}</Text>
          <Text style={styles.statLabel}>Unread</Text>
        </Pressable>

        {isStudentOrParent && (
          <Pressable style={styles.statCard} onPress={() => router.push('/(main)/assignments')}>
            <Ionicons name="hourglass-outline" size={24} color={COLORS.warning} />
            <Text style={styles.statNumber}>{pendingSubmissions}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </Pressable>
        )}
      </View>

      {/* Upcoming assignments */}
      <Text style={styles.sectionTitle}>Upcoming Assignments</Text>
      {assignments.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No upcoming assignments</Text>
        </View>
      ) : (
        <View style={styles.card}>
          {assignments.map((a, i) => {
            const due = new Date(a.dueDate);
            const daysLeft = Math.ceil((a.dueDate - Date.now()) / 86400000);
            return (
              <Pressable
                key={a.id}
                style={[styles.assignmentRow, i < assignments.length - 1 && styles.borderBottom]}
                onPress={() => router.push('/(main)/assignments')}
              >
                <View style={styles.assignmentLeft}>
                  <Text style={styles.assignmentTitle} numberOfLines={1}>{a.title}</Text>
                  <Text style={styles.assignmentMeta}>{a.subjectId} • {a.classId}</Text>
                </View>
                <View style={styles.assignmentRight}>
                  <Text style={[styles.dueText, daysLeft <= 2 && { color: COLORS.error }]}>
                    {daysLeft === 0 ? 'Today' : daysLeft === 1 ? 'Tomorrow' : `${daysLeft}d left`}
                  </Text>
                  <Text style={styles.dueDate}>
                    {due.toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Recent marks (student/parent) */}
      {isStudentOrParent && marks.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Recent Marks</Text>
          <View style={styles.card}>
            {marks.slice(0, 6).map((m, i) => {
              const pct = m.maxScore > 0 ? (m.score / m.maxScore) * 100 : 0;
              const g = gradeFromPct(pct);
              return (
                <View
                  key={m.id}
                  style={[styles.markRow, i < Math.min(marks.length - 1, 5) && styles.borderBottom]}
                >
                  <View style={styles.markLeft}>
                    <Text style={styles.markSubject}>{m.subjectId}</Text>
                    <Text style={styles.markType}>
                      {m.examType === 'bot' ? 'Beginning of Term' :
                       m.examType === 'mid' ? 'Mid Term' :
                       m.examType === 'eot' ? 'End of Term' : 'Assignment'}
                    </Text>
                  </View>
                  <View style={styles.markRight}>
                    <Text style={styles.markScore}>{m.score}/{m.maxScore}</Text>
                    <Text style={[styles.markGrade, { color: pct >= 50 ? COLORS.success : COLORS.error }]}>
                      {g.grade} ({Math.round(pct)}%)
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </>
      )}

      {/* Quick actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsRow}>
        <Pressable style={styles.actionBtn} onPress={() => router.push('/(main)/videos')}>
          <Ionicons name="play-circle-outline" size={28} color={COLORS.primary} />
          <Text style={styles.actionText}>Watch Videos</Text>
        </Pressable>

        <Pressable style={styles.actionBtn} onPress={() => router.push('/(main)/chat')}>
          <Ionicons name="chatbubbles-outline" size={28} color={COLORS.primary} />
          <Text style={styles.actionText}>Messages</Text>
        </Pressable>

        {isStudentOrParent && (
          <Pressable style={styles.actionBtn} onPress={() => router.push('/(main)/career')}>
            <Ionicons name="rocket-outline" size={28} color={COLORS.primary} />
            <Text style={styles.actionText}>Career Path</Text>
          </Pressable>
        )}

        {isTeacherOrAdmin && (
          <Pressable style={styles.actionBtn} onPress={() => router.push('/(main)/students')}>
            <Ionicons name="people-outline" size={28} color={COLORS.primary} />
            <Text style={styles.actionText}>Students</Text>
          </Pressable>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  greeting: { fontSize: 22, fontWeight: '700', color: COLORS.text },
  role: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },

  setupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent + '12',
    borderRadius: 12,
    padding: 14,
    marginTop: 10,
    gap: 10,
  },
  setupText: { flex: 1, fontSize: 13, color: COLORS.text, lineHeight: 18 },

  statsRow: { flexDirection: 'row', gap: 10, marginTop: 18, flexWrap: 'wrap' },
  statCard: {
    flex: 1,
    minWidth: 70,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  statNumber: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginTop: 6 },
  statLabel: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginTop: 22, marginBottom: 10 },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  emptyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: { color: COLORS.textSecondary, fontSize: 14 },

  assignmentRow: { flexDirection: 'row', padding: 14, alignItems: 'center' },
  assignmentLeft: { flex: 1 },
  assignmentTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  assignmentMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  assignmentRight: { alignItems: 'flex-end', marginLeft: 8 },
  dueText: { fontSize: 13, fontWeight: '600', color: COLORS.accent },
  dueDate: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  borderBottom: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border },

  markRow: { flexDirection: 'row', padding: 14, alignItems: 'center' },
  markLeft: { flex: 1 },
  markSubject: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  markType: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  markRight: { alignItems: 'flex-end' },
  markScore: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  markGrade: { fontSize: 12, marginTop: 2 },

  actionsRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  actionBtn: {
    flex: 1,
    minWidth: 90,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  actionText: { fontSize: 12, color: COLORS.text, marginTop: 6, textAlign: 'center' },
});
