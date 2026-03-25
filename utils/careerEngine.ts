// ──────────────────────────────────────────────
// NafAcademy – Career Engine  (v3)
// ──────────────────────────────────────────────
// O-Level : Best-8 aggregation → science % check
//           → suggest A-Level combos (PCM/PCB/BCM…)
//           → preview university courses per combo
// A-Level : UACE weight calculation → match against
//           specific Ugandan universities & courses
// ──────────────────────────────────────────────
import { EA_GRADE_SCALE } from '@/constants';
import type { Mark, Grade, CareerSuggestion, CareerResult, UniversityRecommendation } from '@/types';
import {
  matchUniversityCourses,
  getCoursesForCombo,
  pctToALevelGrade,
  detectCombination,
  type UniversityMatch,
} from './ugandaUniversityData';

// ═══════════════════════════════════════════════
//  Grade conversion helpers
// ═══════════════════════════════════════════════

/** Convert a raw score → East-African letter grade + points. */
export function scoreToGrade(
  score: number,
  maxScore: number
): Omit<Grade, 'subject'> {
  const pct = (score / maxScore) * 100;
  const entry =
    EA_GRADE_SCALE.find((g) => pct >= g.min) ??
    EA_GRADE_SCALE[EA_GRADE_SCALE.length - 1];
  return {
    percentage: Math.round(pct * 10) / 10,
    grade: entry.grade,
    points: entry.points,
  };
}

/** Build a Grade array from raw marks. */
export function marksToGrades(marks: Mark[]): Grade[] {
  return marks.map((m) => ({
    subject: m.subjectId,
    ...scoreToGrade(m.score, m.maxScore),
  }));
}

// ═══════════════════════════════════════════════
//  Subject classification
// ═══════════════════════════════════════════════

const SCIENCE_SUBJECTS = new Set([
  'physics',
  'chemistry',
  'biology',
  'mathematics',
  'math',
  'maths',
  'additional_mathematics',
  'computer_science',
  'computer',
]);

const ARTS_SUBJECTS = new Set([
  'history',
  'geography',
  'economics',
  'commerce',
  'literature',
  'english',
  'kiswahili',
  'cre',
  'ire',
  'french',
  'music',
  'art',
  'business',
]);

function isScience(subjectId: string): boolean {
  return SCIENCE_SUBJECTS.has(subjectId.toLowerCase());
}

// ═══════════════════════════════════════════════
//  O-Level combo rules
// ═══════════════════════════════════════════════

interface ComboRule {
  code: string;         // e.g. "PCM"
  name: string;
  required: string[]; // student must have ≥ grade C
  courses: string[];
  stream: 'science' | 'arts' | 'mixed';
}

const O_LEVEL_COMBOS: ComboRule[] = [
  {
    code: 'PCM',
    name: 'PCM (Physics, Chemistry, Mathematics)',
    required: ['physics', 'chemistry', 'mathematics'],
    stream: 'science',
    courses: [
      'Engineering (Civil, Mechanical, Electrical)',
      'Computer Science',
      'Architecture',
      'Actuarial Science',
      'Quantity Surveying',
    ],
  },
  {
    code: 'PCB',
    name: 'PCB (Physics, Chemistry, Biology)',
    required: ['physics', 'chemistry', 'biology'],
    stream: 'science',
    courses: [
      'Medicine & Surgery',
      'Pharmacy',
      'Nursing',
      'Veterinary Medicine',
      'Biomedical Engineering',
    ],
  },
  {
    code: 'BCM',
    name: 'BCM (Biology, Chemistry, Mathematics)',
    required: ['biology', 'chemistry', 'mathematics'],
    stream: 'science',
    courses: [
      'Biochemistry',
      'Food Science & Technology',
      'Agricultural Engineering',
      'Biotechnology',
    ],
  },
  {
    code: 'MEG',
    name: 'MEG (Mathematics, Economics, Geography)',
    required: ['mathematics', 'economics', 'geography'],
    stream: 'mixed',
    courses: [
      'Economics',
      'Statistics',
      'Land Economics',
      'Urban Planning',
      'Commerce',
    ],
  },
  {
    code: 'HEG',
    name: 'HEG (History, Economics, Geography)',
    required: ['history', 'economics', 'geography'],
    stream: 'arts',
    courses: [
      'Law',
      'Political Science',
      'International Relations',
      'Public Administration',
    ],
  },
  {
    code: 'HEL',
    name: 'HEL (History, Economics, Literature)',
    required: ['history', 'economics', 'literature'],
    stream: 'arts',
    courses: [
      'Journalism & Mass Communication',
      'Social Work',
      'Education Arts',
      'Library Science',
    ],
  },
  {
    code: 'HED',
    name: 'HED (History, Economics, Divinity/CRE)',
    required: ['history', 'economics', 'cre'],
    stream: 'arts',
    courses: [
      'Theology & Religious Studies',
      'Counselling Psychology',
      'Development Studies',
    ],
  },
  {
    code: 'KCA',
    name: 'KCA (Kiswahili, CRE, Agriculture)',
    required: ['kiswahili', 'cre', 'agriculture'],
    stream: 'arts',
    courses: [
      'Agriculture',
      'Environmental Science',
      'Education (Sciences)',
    ],
  },
];

// (A-Level university rules are now in ugandaUniversityData.ts)

// ═══════════════════════════════════════════════
//  Core calculator
// ═══════════════════════════════════════════════

/**
 * Build a map of each subject → its best Grade
 * (keeps only the highest percentage per subject).
 */
function bestGradeMap(grades: Grade[]): Map<string, Grade> {
  const map = new Map<string, Grade>();
  for (const g of grades) {
    const key = g.subject.toLowerCase();
    const existing = map.get(key);
    if (!existing || g.percentage > existing.percentage) {
      map.set(key, g);
    }
  }
  return map;
}

/**
 * Select the best-8 subjects by points (ascending = better).
 * Ties broken by higher percentage.
 */
function bestEight(grades: Grade[]): Grade[] {
  const map = bestGradeMap(grades);
  return [...map.values()]
    .sort((a, b) => a.points - b.points || b.percentage - a.percentage)
    .slice(0, 8);
}

/**
 * Average percentage for subjects that match a filter.
 * Returns 0 when no subjects match.
 */
function avgPct(grades: Grade[], filter: (g: Grade) => boolean): number {
  const filtered = grades.filter(filter);
  if (filtered.length === 0) return 0;
  return (
    Math.round(
      (filtered.reduce((s, g) => s + g.percentage, 0) / filtered.length) * 10
    ) / 10
  );
}

// ── O-Level pathway ────────────────────────────

function oLevelPath(marks: Mark[]): CareerResult {
  const allGrades = marksToGrades(marks);
  const best8 = bestEight(allGrades);
  const best = bestGradeMap(best8);

  const totalPoints = best8.reduce((s, g) => s + g.points, 0);
  const sciAvg = avgPct(best8, (g) => isScience(g.subject));
  const artsAvg = avgPct(best8, (g) => !isScience(g.subject));

  const suggestions: CareerSuggestion[] = [];

  for (const rule of O_LEVEL_COMBOS) {
    // Student must have ≥ C (points ≤ 3) in every required subject
    const allPass = rule.required.every((s) => {
      const g = best.get(s);
      return g && g.points <= 3;
    });
    if (!allPass) continue;

    // If this is a science combo but sciences < 75%, skip it
    if (rule.stream === 'science' && sciAvg < 75) continue;

    // Average percentage across the required subjects
    const reqAvg =
      rule.required.reduce((sum, s) => sum + (best.get(s)?.percentage ?? 0), 0) /
      rule.required.length;

    const avgPts =
      rule.required.reduce((sum, s) => sum + (best.get(s)?.points ?? 7), 0) /
      rule.required.length;

    let confidence: CareerSuggestion['confidence'];
    if (avgPts <= 1.5) confidence = 'high';
    else if (avgPts <= 2.5) confidence = 'medium';
    else confidence = 'low';

    suggestions.push({
      aLevelCombination: [rule.name],
      comboCode: rule.code,
      universityCourses: rule.courses,
      universityCourseCount: getCoursesForCombo(rule.code).length,
      confidence,
      avgPercentage: Math.round(reqAvg * 10) / 10,
    });
  }

  // Sort high → medium → low, then by avgPercentage descending
  const order = { high: 0, medium: 1, low: 2 };
  suggestions.sort(
    (a, b) => order[a.confidence] - order[b.confidence] || b.avgPercentage - a.avgPercentage
  );

  return {
    level: 'o-level',
    grades: best8,
    aggregateScore: totalPoints,
    scienceAvgPct: sciAvg,
    artsAvgPct: artsAvg,
    suggestions,
  };
}

// ── A-Level pathway (Uganda university matching) ─────

function aLevelPath(marks: Mark[]): CareerResult {
  const allGrades = marksToGrades(marks);
  const best = bestGradeMap(allGrades);

  const sciAvg = avgPct([...best.values()], (g) => isScience(g.subject));
  const artsAvg = avgPct([...best.values()], (g) => !isScience(g.subject));

  const sortedGrades = [...best.values()].sort(
    (a, b) => a.points - b.points || b.percentage - a.percentage
  );

  // Build subjectId → percentage map for the university matcher
  const subjectScores = new Map<string, number>();
  for (const [subj, g] of best.entries()) {
    subjectScores.set(subj, g.percentage);
  }

  // Run the Uganda university matching engine
  const { combo, weight, matches } = matchUniversityCourses(subjectScores);

  // Convert UniversityMatch[] → UniversityRecommendation[]
  const universityMatches: UniversityRecommendation[] = matches.map((m) => ({
    universityName: m.university.name,
    universityShort: m.university.shortName,
    universityType: m.university.type,
    location: m.university.location,
    course: m.course,
    faculty: m.faculty,
    duration: m.duration,
    studentWeight: m.studentWeight,
    requiredWeight: m.requiredWeight,
    weightMargin: m.weightMargin,
    confidence: m.confidence,
  }));

  // Also build legacy suggestions array (grouped by university) for backward compat
  const suggestionMap = new Map<string, CareerSuggestion>();
  for (const m of matches) {
    const key = m.university.shortName;
    const existing = suggestionMap.get(key);
    if (existing) {
      existing.universityCourses.push(m.course);
      // Keep the best confidence
      if (m.confidence === 'high' || existing.confidence === 'low') {
        existing.confidence = m.confidence;
      }
    } else {
      suggestionMap.set(key, {
        aLevelCombination: combo ? [combo.name] : [],
        comboCode: combo?.code,
        universityCourses: [m.course],
        confidence: m.confidence,
        avgPercentage: combo
          ? Math.round(
              (combo.subjects.reduce((s, sub) => s + (subjectScores.get(sub) ?? 0), 0) /
                combo.subjects.length) *
                10
            ) / 10
          : 0,
      });
    }
  }

  const suggestions = [...suggestionMap.values()];
  const order = { high: 0, medium: 1, low: 2 };
  suggestions.sort(
    (a, b) => order[a.confidence] - order[b.confidence] || b.avgPercentage - a.avgPercentage
  );

  return {
    level: 'a-level',
    grades: sortedGrades,
    aggregateScore: weight, // UACE weight
    scienceAvgPct: sciAvg,
    artsAvgPct: artsAvg,
    suggestions,
    detectedCombo: combo?.code,
    detectedComboName: combo?.name,
    uaceWeight: weight,
    universityMatches,
  };
}

// ═══════════════════════════════════════════════
//  Public API
// ═══════════════════════════════════════════════

/**
 * Analyse a student's marks and produce career suggestions.
 *
 * @param marks - Array of Mark documents from Firestore.
 * @param level - Force O-Level or A-Level analysis.
 *                If omitted, auto-detects from the number of subjects:
 *                ≤ 5 → A-Level, > 5 → O-Level.
 */
export function calculateCareerPath(
  marks: Mark[],
  level?: 'o-level' | 'a-level'
): CareerResult {
  if (marks.length === 0) {
    return {
      level: level ?? 'o-level',
      grades: [],
      aggregateScore: 0,
      scienceAvgPct: 0,
      artsAvgPct: 0,
      suggestions: [],
    };
  }

  // Auto-detect: O-Level students typically sit 8-10+ subjects;
  // A-Level students sit 3-4 principal subjects.
  const uniqueSubjects = new Set(marks.map((m) => m.subjectId.toLowerCase()));
  const detected = level ?? (uniqueSubjects.size <= 5 ? 'a-level' : 'o-level');

  return detected === 'o-level' ? oLevelPath(marks) : aLevelPath(marks);
}
