// ──────────────────────────────────────────────
// NafAcademy – Performance / Marks Screen
// Automated grade reports + progress visualization
// ──────────────────────────────────────────────
import { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { getMarksByStudent, getUser } from '@/services/firestore';
import { COLORS, EA_GRADE_SCALE } from '@/constants';
import type { Mark, AppUser } from '@/types';

// ── Helper: compute grade letter from percentage ──
function gradeFromPct(pct: number): { grade: string; label: string; color: string } {
  for (const g of EA_GRADE_SCALE) {
    if (pct >= g.min) {
      const color =
        g.grade === 'A' ? '#4CAF50' :
        g.grade === 'B' ? '#66BB6A' :
        g.grade === 'C' ? '#FFC107' :
        g.grade === 'D' ? '#FF9800' :
        g.grade === 'E' ? '#FF5722' :
        g.grade === 'O' ? '#E91E63' : '#F44336';
      return { grade: g.grade, label: g.label, color };
    }
  }
  return { grade: 'F', label: 'Failure', color: '#F44336' };
}

// ── Simple ProgressBar component ──
function ProgressBar({ value, max, color, label, right }: {
  value: number;
  max: number;
  color: string;
  label: string;
  right?: string;
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <View style={styles.barRow}>
      <Text style={styles.barLabel} numberOfLines={1}>{label}</Text>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.barValue}>{right ?? `${Math.round(pct)}%`}</Text>
    </View>
  );
}

// ── Subject aggregate ──
interface SubjectAgg {
  subjectId: string;
  avgPct: number;
  count: number;
  bot?: number;
  mid?: number;
  eot?: number;
}

export default function PerformanceScreen() {
  const { profile, hasRole } = useAuth();
  const [marks, setMarks] = useState<Mark[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [childProfile, setChildProfile] = useState<AppUser | null>(null);

  // Determine whose marks to show
  const targetId = useMemo(() => {
    if (hasRole('parent')) {
      return selectedChild ?? profile?.childIds?.[0] ?? null;
    }
    return profile?.uid ?? null;
  }, [profile, hasRole, selectedChild]);

  // Parent child list
  const childIds = profile?.role === 'parent' ? (profile.childIds ?? []) : [];
  const showChildSwitcher = childIds.length > 1;

  // Load child profile for parent
  useEffect(() => {
    if (profile?.role === 'parent' && targetId) {
      getUser(targetId).then(setChildProfile);
    }
  }, [profile, targetId]);

  // Load marks
  useEffect(() => {
    if (!targetId) { setLoading(false); return; }
    setLoading(true);
    getMarksByStudent(targetId).then((m) => {
      setMarks(m);
      setLoading(false);
    });
  }, [targetId]);

  // Aggregate marks by subject
  const subjectAggs = useMemo<SubjectAgg[]>(() => {
    const map = new Map<string, { total: number; count: number; bot: number[]; mid: number[]; eot: number[] }>();

    for (const m of marks) {
      const pct = m.maxScore > 0 ? (m.score / m.maxScore) * 100 : 0;
      const existing = map.get(m.subjectId) ?? { total: 0, count: 0, bot: [], mid: [], eot: [] };
      existing.total += pct;
      existing.count += 1;
      if (m.examType === 'bot') existing.bot.push(pct);
      if (m.examType === 'mid') existing.mid.push(pct);
      if (m.examType === 'eot') existing.eot.push(pct);
      map.set(m.subjectId, existing);
    }

    const aggs: SubjectAgg[] = [];
    map.forEach((val, key) => {
      const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : undefined;
      aggs.push({
        subjectId: key,
        avgPct: val.total / val.count,
        count: val.count,
        bot: avg(val.bot),
        mid: avg(val.mid),
        eot: avg(val.eot),
      });
    });

    return aggs.sort((a, b) => b.avgPct - a.avgPct);
  }, [marks]);

  // Overall stats
  const overallAvg = useMemo(() => {
    if (subjectAggs.length === 0) return 0;
    return subjectAggs.reduce((sum, s) => sum + s.avgPct, 0) / subjectAggs.length;
  }, [subjectAggs]);

  const overallGrade = gradeFromPct(overallAvg);

  // Best & worst subjects
  const bestSubject = subjectAggs[0] ?? null;
  const worstSubject = subjectAggs[subjectAggs.length - 1] ?? null;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!targetId) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>No student selected</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <Text style={styles.heading}>Performance</Text>
      {profile?.role === 'parent' && childProfile && (
        <Text style={styles.subheading}>
          Viewing: {childProfile.displayName}
        </Text>
      )}

      {/* Child switcher for parents */}
      {showChildSwitcher && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.childSwitcher}>
          {childIds.map((cid, i) => (
            <Pressable
              key={cid}
              style={[styles.childPill, (targetId === cid) && styles.childPillActive]}
              onPress={() => setSelectedChild(cid)}
            >
              <Text style={[styles.childPillText, (targetId === cid) && styles.childPillTextActive]}>
                Child {i + 1}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {marks.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="bar-chart-outline" size={48} color={COLORS.border} />
          <Text style={styles.emptyText}>No marks recorded yet</Text>
        </View>
      ) : (
        <>
          {/* Overview card */}
          <View style={styles.overviewCard}>
            <View style={styles.overviewLeft}>
              <View style={[styles.gradeCircle, { borderColor: overallGrade.color }]}>
                <Text style={[styles.gradeText, { color: overallGrade.color }]}>
                  {overallGrade.grade}
                </Text>
              </View>
              <View style={{ marginLeft: 14 }}>
                <Text style={styles.overviewAvg}>{Math.round(overallAvg)}%</Text>
                <Text style={styles.overviewLabel}>{overallGrade.label}</Text>
              </View>
            </View>
            <View style={styles.overviewRight}>
              <Text style={styles.statValue}>{subjectAggs.length}</Text>
              <Text style={styles.statLabel}>Subjects</Text>
              <Text style={[styles.statValue, { marginTop: 8 }]}>{marks.length}</Text>
              <Text style={styles.statLabel}>Total marks</Text>
            </View>
          </View>

          {/* Best / Worst */}
          {bestSubject && worstSubject && bestSubject.subjectId !== worstSubject.subjectId && (
            <View style={styles.highlightRow}>
              <View style={[styles.highlightCard, { borderLeftColor: COLORS.success }]}>
                <Ionicons name="trophy" size={18} color={COLORS.success} />
                <View style={{ marginLeft: 8 }}>
                  <Text style={styles.highlightLabel}>Best Subject</Text>
                  <Text style={styles.highlightValue}>{bestSubject.subjectId}</Text>
                  <Text style={styles.highlightPct}>{Math.round(bestSubject.avgPct)}%</Text>
                </View>
              </View>
              <View style={[styles.highlightCard, { borderLeftColor: COLORS.error }]}>
                <Ionicons name="alert-circle" size={18} color={COLORS.error} />
                <View style={{ marginLeft: 8 }}>
                  <Text style={styles.highlightLabel}>Needs Work</Text>
                  <Text style={styles.highlightValue}>{worstSubject.subjectId}</Text>
                  <Text style={styles.highlightPct}>{Math.round(worstSubject.avgPct)}%</Text>
                </View>
              </View>
            </View>
          )}

          {/* Subject bars */}
          <Text style={styles.sectionTitle}>Subject Averages</Text>
          <View style={styles.card}>
            {subjectAggs.map((s) => {
              const g = gradeFromPct(s.avgPct);
              return (
                <ProgressBar
                  key={s.subjectId}
                  label={s.subjectId}
                  value={s.avgPct}
                  max={100}
                  color={g.color}
                  right={`${Math.round(s.avgPct)}% (${g.grade})`}
                />
              );
            })}
          </View>

          {/* Exam breakdown */}
          <Text style={styles.sectionTitle}>Exam Breakdown</Text>
          <View style={styles.card}>
            <View style={styles.examHeader}>
              <Text style={[styles.examCol, { flex: 2 }]}>Subject</Text>
              <Text style={styles.examCol}>BOT</Text>
              <Text style={styles.examCol}>MID</Text>
              <Text style={styles.examCol}>EOT</Text>
              <Text style={styles.examCol}>Avg</Text>
            </View>
            {subjectAggs.map((s) => (
              <View key={s.subjectId} style={styles.examRow}>
                <Text style={[styles.examCell, { flex: 2 }]} numberOfLines={1}>
                  {s.subjectId}
                </Text>
                <Text style={styles.examCell}>
                  {s.bot !== undefined ? `${Math.round(s.bot)}%` : '—'}
                </Text>
                <Text style={styles.examCell}>
                  {s.mid !== undefined ? `${Math.round(s.mid)}%` : '—'}
                </Text>
                <Text style={styles.examCell}>
                  {s.eot !== undefined ? `${Math.round(s.eot)}%` : '—'}
                </Text>
                <Text style={[styles.examCell, { fontWeight: '700' }]}>
                  {Math.round(s.avgPct)}%
                </Text>
              </View>
            ))}
          </View>

          {/* Weekly digest style summary for parents */}
          {profile?.role === 'parent' && (
            <View style={styles.digestCard}>
              <Ionicons name="newspaper-outline" size={22} color={COLORS.primary} />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={styles.digestTitle}>Performance Summary</Text>
                <Text style={styles.digestBody}>
                  {childProfile?.displayName ?? 'Your child'} has an overall average of{' '}
                  <Text style={{ fontWeight: '700' }}>{Math.round(overallAvg)}%</Text> across{' '}
                  {subjectAggs.length} subjects.
                  {bestSubject && ` Best performance: ${bestSubject.subjectId} (${Math.round(bestSubject.avgPct)}%).`}
                  {worstSubject && bestSubject?.subjectId !== worstSubject.subjectId &&
                    ` Area to improve: ${worstSubject.subjectId} (${Math.round(worstSubject.avgPct)}%).`}
                </Text>
              </View>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  heading: { fontSize: 22, fontWeight: '700', color: COLORS.text },
  subheading: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },

  childSwitcher: { marginTop: 12, flexGrow: 0 },
  childPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  childPillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  childPillText: { fontSize: 13, color: COLORS.textSecondary },
  childPillTextActive: { color: '#fff', fontWeight: '600' },

  overviewCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 18,
    marginTop: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  overviewLeft: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  gradeCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradeText: { fontSize: 22, fontWeight: '800' },
  overviewAvg: { fontSize: 24, fontWeight: '700', color: COLORS.text },
  overviewLabel: { fontSize: 13, color: COLORS.textSecondary },
  overviewRight: { alignItems: 'center', paddingLeft: 16, borderLeftWidth: 1, borderLeftColor: COLORS.border },
  statValue: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  statLabel: { fontSize: 11, color: COLORS.textSecondary },

  highlightRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  highlightCard: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 4,
    alignItems: 'center',
  },
  highlightLabel: { fontSize: 11, color: COLORS.textSecondary },
  highlightValue: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  highlightPct: { fontSize: 12, color: COLORS.textSecondary },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginTop: 20, marginBottom: 8 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },

  barRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 6 },
  barLabel: { width: 80, fontSize: 12, color: COLORS.text },
  barTrack: { flex: 1, height: 10, backgroundColor: '#f0f0f0', borderRadius: 5, overflow: 'hidden', marginHorizontal: 8 },
  barFill: { height: '100%', borderRadius: 5 },
  barValue: { width: 70, fontSize: 11, color: COLORS.textSecondary, textAlign: 'right' },

  examHeader: {
    flexDirection: 'row',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 4,
  },
  examCol: { flex: 1, fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, textAlign: 'center' },
  examRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  examCell: { flex: 1, fontSize: 13, color: COLORS.text, textAlign: 'center' },

  digestCard: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    alignItems: 'flex-start',
  },
  digestTitle: { fontSize: 14, fontWeight: '700', color: COLORS.primary, marginBottom: 4 },
  digestBody: { fontSize: 13, color: COLORS.text, lineHeight: 19 },

  emptyCard: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 15, color: COLORS.textSecondary, marginTop: 12 },
});
