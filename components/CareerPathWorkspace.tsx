// ──────────────────────────────────────────────
// NafAcademy – Career Path Workspace
// ──────────────────────────────────────────────
// O-Level: Best-8 grades → A-Level combo recommendations
//          with university course previews.
// A-Level: UACE weight → specific university course
//          matches across Ugandan universities.
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
import { getMarksByStudent } from '@/services/firestore';
import { calculateCareerPath } from '@/utils/careerEngine';
import { COLORS } from '@/constants';
import type { Mark, CareerResult, CareerSuggestion, Grade, UniversityRecommendation } from '@/types';

// ═══════════════════════════════════════════════
//  Sub-components
// ═══════════════════════════════════════════════

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

function pctColor(pct: number): string {
  if (pct >= 80) return COLORS.success;
  if (pct >= 60) return COLORS.primary;
  if (pct >= 40) return COLORS.warning;
  return COLORS.error;
}

function ConfidenceBadge({ level }: { level: 'high' | 'medium' | 'low' }) {
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

function WeightBadge({ weight, max = 18 }: { weight: number; max?: number }) {
  let color: string = COLORS.error;
  if (weight >= 15) color = COLORS.success;
  else if (weight >= 12) color = COLORS.primary;
  else if (weight >= 9) color = COLORS.warning;
  return (
    <View style={[styles.weightBadge, { borderColor: color }]}>
      <Text style={[styles.weightBadgeNum, { color }]}>{weight}</Text>
      <Text style={styles.weightBadgeMax}>/{max}</Text>
    </View>
  );
}

// ═══════════════════════════════════════════════
//  Main component
// ═══════════════════════════════════════════════

interface Props {
  marks?: Mark[];
  level?: 'o-level' | 'a-level';
  studentId?: string;
}

export default function CareerPathWorkspace({ marks: propMarks, level, studentId }: Props) {
  const { profile } = useAuth();
  const [marks, setMarks] = useState<Mark[]>(propMarks ?? []);
  const [loading, setLoading] = useState(!propMarks);
  const [expandedUni, setExpandedUni] = useState<string | null>(null);

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

  const result: CareerResult | null = useMemo(() => {
    if (marks.length === 0) return null;
    return calculateCareerPath(marks, level);
  }, [marks, level]);

  // Group A-Level university matches by university
  const uniGroups = useMemo(() => {
    if (!result?.universityMatches?.length) return [];
    const map = new Map<string, { uni: UniversityRecommendation; courses: UniversityRecommendation[] }>();
    for (const m of result.universityMatches) {
      const key = m.universityShort;
      if (!map.has(key)) map.set(key, { uni: m, courses: [] });
      map.get(key)!.courses.push(m);
    }
    return [...map.values()];
  }, [result?.universityMatches]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

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

  const isALevel = result.level === 'a-level';

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.scroll}>
      {/* ── Header ── */}
      <Text style={styles.heading}>
        {isALevel ? 'University Course Finder' : 'Career Path Analysis'}
      </Text>
      <View style={styles.levelBadge}>
        <Text style={styles.levelText}>
          {isALevel ? 'A-Level (UACE)' : 'O-Level (UCE Best 8)'}
        </Text>
      </View>

      {/* ── A-Level: Combination & Weight summary ── */}
      {isALevel && result.detectedCombo && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your A-Level Profile</Text>
          <View style={styles.comboHeader}>
            <View style={styles.comboInfo}>
              <Text style={styles.comboCode}>{result.detectedCombo}</Text>
              <Text style={styles.comboName}>{result.detectedComboName}</Text>
            </View>
            <WeightBadge weight={result.uaceWeight ?? 0} />
          </View>
          <View style={styles.weightExplainer}>
            <Ionicons name="information-circle-outline" size={16} color={COLORS.textSecondary} />
            <Text style={styles.weightExplainerText}>
              UACE Weight = sum of your 3 principal subjects (A=6, B=5, C=4, D=3, E=2, O=1, F=0). Max 18. Universities set minimum cut-off weights for each course.
            </Text>
          </View>
        </View>
      )}

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

        {!isALevel && (
          <Text style={styles.aggregateNote}>
            Aggregate (Best 8): {result.aggregateScore} pts
            {result.scienceAvgPct >= 75 ? '  —  Qualifies for Science combos' : '  —  Science avg below 75%'}
          </Text>
        )}
      </View>

      {/* ── Subject grades ── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          {isALevel ? 'Your Subjects & Grades' : 'Best 8 Subjects'}
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

      {/* ══════════════════════════════════════════ */}
      {/*  A-LEVEL: University course matches       */}
      {/* ══════════════════════════════════════════ */}
      {isALevel && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            <Ionicons name="school" size={18} color={COLORS.primary} />{' '}
            University Courses You Qualify For
          </Text>

          {uniGroups.length === 0 ? (
            <Text style={styles.noSuggestions}>
              No university matches found. Improve your grades to unlock more options.
            </Text>
          ) : (
            <>
              <Text style={styles.matchSummary}>
                {result.universityMatches!.length} course{result.universityMatches!.length !== 1 ? 's' : ''}{' '}
                across {uniGroups.length} universit{uniGroups.length !== 1 ? 'ies' : 'y'}
              </Text>

              {uniGroups.map((group) => {
                const isExpanded = expandedUni === group.uni.universityShort;
                const bestConfidence = group.courses.reduce(
                  (best, c) => (c.confidence === 'high' ? 'high' : c.confidence === 'medium' && best !== 'high' ? 'medium' : best),
                  'low' as 'high' | 'medium' | 'low',
                );

                return (
                  <View key={group.uni.universityShort} style={styles.uniCard}>
                    <Pressable
                      style={styles.uniHeader}
                      onPress={() => setExpandedUni(isExpanded ? null : group.uni.universityShort)}
                    >
                      <View style={styles.uniHeaderLeft}>
                        <View style={[
                          styles.uniTypeBadge,
                          { backgroundColor: group.uni.universityType === 'public' ? COLORS.primary + '20' : COLORS.accent + '20' },
                        ]}>
                          <Text style={[
                            styles.uniTypeBadgeText,
                            { color: group.uni.universityType === 'public' ? COLORS.primary : COLORS.accent },
                          ]}>
                            {group.uni.universityType === 'public' ? 'PUBLIC' : 'PRIVATE'}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.uniName}>{group.uni.universityName}</Text>
                          <Text style={styles.uniLocation}>
                            <Ionicons name="location-outline" size={12} color={COLORS.textSecondary} /> {group.uni.location}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.uniHeaderRight}>
                        <View style={styles.uniCourseCount}>
                          <Text style={styles.uniCourseCountNum}>{group.courses.length}</Text>
                          <Text style={styles.uniCourseCountLabel}>courses</Text>
                        </View>
                        <Ionicons
                          name={isExpanded ? 'chevron-up' : 'chevron-down'}
                          size={20}
                          color={COLORS.textSecondary}
                        />
                      </View>
                    </Pressable>

                    {isExpanded && (
                      <View style={styles.uniCourses}>
                        {group.courses.map((course, ci) => (
                          <View key={ci} style={styles.courseCard}>
                            <View style={styles.courseCardHeader}>
                              <Text style={styles.courseCardName}>{course.course}</Text>
                              <ConfidenceBadge level={course.confidence} />
                            </View>
                            <Text style={styles.courseCardFaculty}>{course.faculty}</Text>
                            <View style={styles.courseCardDetails}>
                              <View style={styles.courseCardDetail}>
                                <Ionicons name="time-outline" size={13} color={COLORS.textSecondary} />
                                <Text style={styles.courseCardDetailText}>{course.duration}</Text>
                              </View>
                              <View style={styles.courseCardDetail}>
                                <Ionicons name="bar-chart-outline" size={13} color={COLORS.textSecondary} />
                                <Text style={styles.courseCardDetailText}>
                                  Cut-off: {course.requiredWeight}/18
                                </Text>
                              </View>
                              <View style={styles.courseCardDetail}>
                                <Ionicons
                                  name={course.weightMargin >= 0 ? 'arrow-up-circle' : 'arrow-down-circle'}
                                  size={13}
                                  color={course.weightMargin >= 2 ? COLORS.success : course.weightMargin >= 0 ? COLORS.warning : COLORS.error}
                                />
                                <Text style={[
                                  styles.courseCardDetailText,
                                  { color: course.weightMargin >= 2 ? COLORS.success : course.weightMargin >= 0 ? COLORS.warning : COLORS.error },
                                ]}>
                                  You: {course.studentWeight} ({course.weightMargin >= 0 ? '+' : ''}{course.weightMargin})
                                </Text>
                              </View>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}
            </>
          )}
        </View>
      )}

      {/* ══════════════════════════════════════════ */}
      {/*  O-LEVEL: Recommended A-Level combos      */}
      {/* ══════════════════════════════════════════ */}
      {!isALevel && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Recommended A-Level Combinations</Text>

          {result.suggestions.length === 0 ? (
            <Text style={styles.noSuggestions}>
              No strong matches found with your current grades. Keep improving!
            </Text>
          ) : (
            result.suggestions.map((s, idx) => (
              <View key={idx} style={styles.recCard}>
                <View style={styles.recHeader}>
                  <Ionicons
                    name={s.confidence === 'high' ? 'star' : s.confidence === 'medium' ? 'star-half' : 'star-outline'}
                    size={20}
                    color={s.confidence === 'high' ? COLORS.success : s.confidence === 'medium' ? COLORS.accent : COLORS.textSecondary}
                  />
                  <Text style={styles.recCombo}>{s.aLevelCombination.join(', ')}</Text>
                  <ConfidenceBadge level={s.confidence} />
                </View>

                <View style={styles.fitRow}>
                  <Text style={styles.fitLabel}>Fit</Text>
                  <View style={styles.fitBar}>
                    <ProgressBar value={s.avgPercentage} color={pctColor(s.avgPercentage)} height={10} />
                  </View>
                  <Text style={[styles.fitPct, { color: pctColor(s.avgPercentage) }]}>
                    {s.avgPercentage}%
                  </Text>
                </View>

                {/* University courses this combo leads to */}
                {s.universityCourseCount !== undefined && s.universityCourseCount > 0 && (
                  <View style={styles.comboUniPreview}>
                    <Ionicons name="school-outline" size={14} color={COLORS.textSecondary} />
                    <Text style={styles.comboUniPreviewText}>
                      Opens {s.universityCourseCount} university course{s.universityCourseCount !== 1 ? 's' : ''} across Uganda
                    </Text>
                  </View>
                )}

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
      )}

      {/* Footer */}
      <Text style={styles.footer}>
        {isALevel
          ? 'Cut-off weights are approximate and vary yearly. Consult PUJAB or individual universities for official admission requirements.'
          : 'Recommendations are based on the Uganda grading system. Consult a career counsellor for personalised guidance.'}
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
    flex: 1, justifyContent: 'center', alignItems: 'center',
    padding: 32, backgroundColor: COLORS.background,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginTop: 12 },
  emptyBody: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginTop: 6 },

  heading: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  levelBadge: {
    alignSelf: 'flex-start', backgroundColor: `${COLORS.primary}14`,
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20,
    marginTop: 6, marginBottom: 16,
  },
  levelText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },

  // Cards
  card: {
    backgroundColor: COLORS.surface, borderRadius: 14, padding: 18,
    marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.05,
    shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 14 },

  // A-Level combo header
  comboHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  comboInfo: { flex: 1 },
  comboCode: { fontSize: 28, fontWeight: '800', color: COLORS.primary },
  comboName: { fontSize: 14, color: COLORS.textSecondary, marginTop: 2 },
  weightBadge: {
    borderWidth: 2, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6,
    alignItems: 'center', justifyContent: 'center',
  },
  weightBadgeNum: { fontSize: 22, fontWeight: '800' },
  weightBadgeMax: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600' },
  weightExplainer: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  weightExplainerText: { fontSize: 12, color: COLORS.textSecondary, flex: 1, lineHeight: 18 },

  // Stream averages
  streamRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  streamLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  streamName: { fontSize: 14, fontWeight: '500', color: COLORS.text },
  streamPct: { fontSize: 15, fontWeight: '700' },
  aggregateNote: { marginTop: 14, fontSize: 12, color: COLORS.textSecondary, fontStyle: 'italic' },

  // Progress bar
  barBg: { borderRadius: 4, backgroundColor: COLORS.border, overflow: 'hidden' },
  barFill: { borderRadius: 4 },

  // Subject rows
  subjectRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  subjectInfo: { width: 130 },
  subjectName: { fontSize: 14, fontWeight: '500', color: COLORS.text },
  subjectGrade: { fontSize: 11, color: COLORS.textSecondary, marginTop: 1 },
  subjectBarWrap: { flex: 1, marginLeft: 12 },

  // ── University match cards (A-Level) ──
  matchSummary: {
    fontSize: 13, color: COLORS.textSecondary, marginBottom: 12, fontStyle: 'italic',
  },
  uniCard: {
    backgroundColor: COLORS.background, borderRadius: 12, marginBottom: 10,
    overflow: 'hidden',
  },
  uniHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14,
  },
  uniHeaderLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  uniTypeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  uniTypeBadgeText: { fontSize: 9, fontWeight: '800' },
  uniName: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  uniLocation: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  uniHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  uniCourseCount: { alignItems: 'center' },
  uniCourseCountNum: { fontSize: 18, fontWeight: '800', color: COLORS.primary },
  uniCourseCountLabel: { fontSize: 10, color: COLORS.textSecondary },

  uniCourses: { paddingHorizontal: 14, paddingBottom: 14 },
  courseCard: {
    backgroundColor: COLORS.surface, borderRadius: 10, padding: 12, marginBottom: 8,
    borderLeftWidth: 3, borderLeftColor: COLORS.primary,
  },
  courseCardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  courseCardName: { fontSize: 14, fontWeight: '700', color: COLORS.text, flex: 1, marginRight: 8 },
  courseCardFaculty: { fontSize: 12, color: COLORS.textSecondary, marginTop: 3 },
  courseCardDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
  courseCardDetail: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  courseCardDetailText: { fontSize: 12, color: COLORS.textSecondary },

  // ── O-Level recommendation cards ──
  recCard: {
    backgroundColor: COLORS.background, borderRadius: 12, padding: 14, marginBottom: 12,
  },
  recHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  recCombo: { flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.text },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  fitRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 8 },
  fitLabel: { fontSize: 12, fontWeight: '500', color: COLORS.textSecondary, width: 26 },
  fitBar: { flex: 1 },
  fitPct: { fontSize: 13, fontWeight: '700', width: 44, textAlign: 'right' },

  comboUniPreview: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10,
    paddingTop: 8, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  comboUniPreviewText: { fontSize: 12, color: COLORS.textSecondary, fontStyle: 'italic' },

  courseList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  courseChip: {
    backgroundColor: `${COLORS.primary}10`, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16,
  },
  courseChipText: { fontSize: 12, color: COLORS.primary, fontWeight: '500' },

  noSuggestions: { fontSize: 14, color: COLORS.textSecondary, fontStyle: 'italic' },

  footer: {
    fontSize: 11, color: COLORS.textSecondary, textAlign: 'center',
    marginTop: 8, lineHeight: 16,
  },
});
