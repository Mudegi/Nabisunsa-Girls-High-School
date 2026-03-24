// ──────────────────────────────────────────────
// NafAcademy – Career Path Workspace
// ──────────────────────────────────────────────
// Displays the output of calculateCareerPath in
// a clean UI with progress bars for every grade,
// stream averages, and sorted recommendations.
// ──────────────────────────────────────────────
import { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { getMarksByStudent } from '@/services/firestore';
import { calculateCareerPath } from '@/utils/careerEngine';
import { COLORS } from '@/constants';
import type { Mark, CareerResult, CareerSuggestion, Grade } from '@/types';

// ═══════════════════════════════════════════════
//  Sub-components
// ═══════════════════════════════════════════════

/** Horizontal progress bar */
function ProgressBar({
  value,
  max = 100,
  color = COLORS.primary,
  height = 8,
}: {
  value: number;
  max?: number;
  color?: string;
  height?: number;
}) {
  const pct = Math.min(Math.max((value / max) * 100, 0), 100);
  return (
    <View style={[styles.barBg, { height }]}>
      <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: color, height }]} />
    </View>
  );
}

/** Colour for a percentage value */
function pctColor(pct: number): string {
  if (pct >= 80) return COLORS.success;
  if (pct >= 60) return COLORS.primary;
  if (pct >= 40) return COLORS.warning;
  return COLORS.error;
}

/** Confidence badge */
function ConfidenceBadge({ level }: { level: CareerSuggestion['confidence'] }) {
  const map = {
    high: { bg: '#E8F5E9', fg: COLORS.success, label: 'Strong Match' },
    medium: { bg: '#FFF8E1', fg: '#F9A825', label: 'Good Match' },
    low: { bg: '#FBE9E7', fg: COLORS.error, label: 'Possible' },
  };
  const { bg, fg, label } = map[level];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color: fg }]}>{label}</Text>
    </View>
  );
}

// ═══════════════════════════════════════════════
//  Main component
// ═══════════════════════════════════════════════

interface Props {
  /** Override: pass marks directly instead of fetching */
  marks?: Mark[];
  /** Override: force analysis level */
  level?: 'o-level' | 'a-level';
  /** When role=parent, pass the child's uid */
  studentId?: string;
}

export default function CareerPathWorkspace({ marks: propMarks, level, studentId }: Props) {
  const { profile } = useAuth();
  const [marks, setMarks] = useState<Mark[]>(propMarks ?? []);
  const [loading, setLoading] = useState(!propMarks);

  // Fetch marks from Firestore if not provided
  useEffect(() => {
    if (propMarks) return;
    const uid = studentId ?? profile?.uid;
    if (!uid) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      try {
        const data = await getMarksByStudent(uid);
        if (!cancelled) setMarks(data);
      } catch (err) {
        console.warn('Failed to load marks:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [propMarks, studentId, profile?.uid]);

  // Run the career engine
  const result: CareerResult | null = useMemo(() => {
    if (marks.length === 0) return null;
    return calculateCareerPath(marks, level);
  }, [marks, level]);

  // ── Loading ──
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // ── No data ──
  if (!result || result.grades.length === 0) {
    return (
      <View style={styles.center}>
        <Ionicons name="school-outline" size={56} color={COLORS.border} />
        <Text style={styles.emptyTitle}>No grades yet</Text>
        <Text style={styles.emptyBody}>
          Once your marks are recorded, career recommendations will appear here.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.scroll}>
      {/* ── Header ── */}
      <Text style={styles.heading}>Career Path Analysis</Text>
      <View style={styles.levelBadge}>
        <Text style={styles.levelText}>
          {result.level === 'o-level' ? 'O-Level (Best 8)' : 'A-Level (Weighted)'}
        </Text>
      </View>

      {/* ── Stream averages ── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Stream Averages</Text>

        <View style={styles.streamRow}>
          <View style={styles.streamLabel}>
            <Ionicons name="flask-outline" size={18} color={COLORS.primary} />
            <Text style={styles.streamName}>Sciences</Text>
          </View>
          <Text style={[styles.streamPct, { color: pctColor(result.scienceAvgPct) }]}>
            {result.scienceAvgPct}%
          </Text>
        </View>
        <ProgressBar value={result.scienceAvgPct} color={pctColor(result.scienceAvgPct)} />

        <View style={[styles.streamRow, { marginTop: 14 }]}>
          <View style={styles.streamLabel}>
            <Ionicons name="book-outline" size={18} color={COLORS.accent} />
            <Text style={styles.streamName}>Arts / Humanities</Text>
          </View>
          <Text style={[styles.streamPct, { color: pctColor(result.artsAvgPct) }]}>
            {result.artsAvgPct}%
          </Text>
        </View>
        <ProgressBar value={result.artsAvgPct} color={pctColor(result.artsAvgPct)} />

        {result.level === 'o-level' && (
          <Text style={styles.aggregateNote}>
            Aggregate (Best 8): {result.aggregateScore} pts
            {result.scienceAvgPct >= 75
              ? '  —  Qualifies for Science combos'
              : '  —  Science avg below 75%'}
          </Text>
        )}
        {result.level === 'a-level' && (
          <Text style={styles.aggregateNote}>
            Best-3 weighted points: {result.aggregateScore}
          </Text>
        )}
      </View>

      {/* ── Subject grades ── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          {result.level === 'o-level' ? 'Best 8 Subjects' : 'Your Subjects'}
        </Text>

        {result.grades.map((g, i) => (
          <View key={`${g.subject}-${i}`} style={styles.subjectRow}>
            <View style={styles.subjectInfo}>
              <Text style={styles.subjectName}>
                {g.subject.charAt(0).toUpperCase() + g.subject.slice(1).replace(/_/g, ' ')}
              </Text>
              <Text style={styles.subjectGrade}>
                {g.grade} &bull; {g.percentage}%
              </Text>
            </View>
            <View style={styles.subjectBarWrap}>
              <ProgressBar value={g.percentage} color={pctColor(g.percentage)} height={6} />
            </View>
          </View>
        ))}
      </View>

      {/* ── Recommendations ── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          {result.level === 'o-level'
            ? 'Recommended A-Level Combinations'
            : 'Recommended University Courses'}
        </Text>

        {result.suggestions.length === 0 ? (
          <Text style={styles.noSuggestions}>
            No strong matches found with your current grades. Keep improving!
          </Text>
        ) : (
          result.suggestions.map((s, idx) => (
            <View key={idx} style={styles.recCard}>
              {/* Combo / Course name */}
              <View style={styles.recHeader}>
                <Ionicons
                  name={s.confidence === 'high' ? 'star' : s.confidence === 'medium' ? 'star-half' : 'star-outline'}
                  size={20}
                  color={s.confidence === 'high' ? COLORS.success : s.confidence === 'medium' ? COLORS.accent : COLORS.textSecondary}
                />
                <Text style={styles.recCombo}>
                  {s.aLevelCombination.join(', ')}
                </Text>
                <ConfidenceBadge level={s.confidence} />
              </View>

              {/* Fit bar */}
              <View style={styles.fitRow}>
                <Text style={styles.fitLabel}>Fit</Text>
                <View style={styles.fitBar}>
                  <ProgressBar
                    value={s.avgPercentage}
                    color={pctColor(s.avgPercentage)}
                    height={10}
                  />
                </View>
                <Text style={[styles.fitPct, { color: pctColor(s.avgPercentage) }]}>
                  {s.avgPercentage}%
                </Text>
              </View>

              {/* Linked courses */}
              <View style={styles.courseList}>
                {s.universityCourses.map((c, ci) => (
                  <View key={ci} style={styles.courseChip}>
                    <Text style={styles.courseChipText}>{c}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))
        )}
      </View>

      {/* Footer tip */}
      <Text style={styles.footer}>
        Recommendations are based on the East-African grading system. Consult a
        career counsellor for personalised guidance.
      </Text>
    </ScrollView>
  );
}

// ═══════════════════════════════════════════════
//  Styles
// ═══════════════════════════════════════════════

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: 16, paddingBottom: 40 },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: COLORS.background,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginTop: 12 },
  emptyBody: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginTop: 6 },

  heading: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  levelBadge: {
    alignSelf: 'flex-start',
    backgroundColor: `${COLORS.primary}14`,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 6,
    marginBottom: 16,
  },
  levelText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },

  // Cards
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 14 },

  // Stream averages
  streamRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  streamLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  streamName: { fontSize: 14, fontWeight: '500', color: COLORS.text },
  streamPct: { fontSize: 15, fontWeight: '700' },
  aggregateNote: {
    marginTop: 14,
    fontSize: 12,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },

  // Progress bar
  barBg: {
    borderRadius: 4,
    backgroundColor: COLORS.border,
    overflow: 'hidden',
  },
  barFill: {
    borderRadius: 4,
  },

  // Subject rows
  subjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  subjectInfo: { width: 130 },
  subjectName: { fontSize: 14, fontWeight: '500', color: COLORS.text },
  subjectGrade: { fontSize: 11, color: COLORS.textSecondary, marginTop: 1 },
  subjectBarWrap: { flex: 1, marginLeft: 12 },

  // Recommendation cards
  recCard: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  recHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  recCombo: { flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.text },

  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: '700' },

  fitRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 8 },
  fitLabel: { fontSize: 12, fontWeight: '500', color: COLORS.textSecondary, width: 26 },
  fitBar: { flex: 1 },
  fitPct: { fontSize: 13, fontWeight: '700', width: 44, textAlign: 'right' },

  courseList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  courseChip: {
    backgroundColor: `${COLORS.primary}10`,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  courseChipText: { fontSize: 12, color: COLORS.primary, fontWeight: '500' },

  noSuggestions: { fontSize: 14, color: COLORS.textSecondary, fontStyle: 'italic' },

  footer: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 16,
  },
});
