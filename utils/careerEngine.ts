// ──────────────────────────────────────────────
// NafAcademy – Career Engine  (v2)
// ──────────────────────────────────────────────
// O-Level : Best-8 aggregation → science % check
//           → suggest A-Level combos (PCM/PCB/BCM…)
// A-Level : University weighting system → suggest
//           degree courses (Engineering, Law, …)
// ──────────────────────────────────────────────
import { EA_GRADE_SCALE } from '@/constants';
import type { Mark, Grade, CareerSuggestion, CareerResult } from '@/types';

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
  name: string;
  required: string[]; // student must have ≥ grade C
  courses: string[];
  stream: 'science' | 'arts' | 'mixed';
}

const O_LEVEL_COMBOS: ComboRule[] = [
  {
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

// ═══════════════════════════════════════════════
//  A-Level university weighting rules
// ═══════════════════════════════════════════════

interface UniWeightRule {
  course: string;
  /** Subject IDs whose scores are weighted. Order = weight priority. */
  subjects: string[];
  /** Minimum weighted score (out of 100) to suggest */
  minWeighted: number;
}

const A_LEVEL_UNI_RULES: UniWeightRule[] = [
  {
    course: 'Medicine & Surgery',
    subjects: ['biology', 'chemistry', 'physics', 'mathematics'],
    minWeighted: 65,
  },
  {
    course: 'Engineering (All branches)',
    subjects: ['mathematics', 'physics', 'chemistry'],
    minWeighted: 60,
  },
  {
    course: 'Computer Science',
    subjects: ['mathematics', 'physics', 'computer_science'],
    minWeighted: 55,
  },
  {
    course: 'Law (LLB)',
    subjects: ['history', 'economics', 'english', 'literature'],
    minWeighted: 55,
  },
  {
    course: 'Pharmacy',
    subjects: ['chemistry', 'biology', 'physics'],
    minWeighted: 60,
  },
  {
    course: 'Architecture',
    subjects: ['mathematics', 'physics', 'art'],
    minWeighted: 55,
  },
  {
    course: 'Economics & Statistics',
    subjects: ['mathematics', 'economics', 'geography'],
    minWeighted: 55,
  },
  {
    course: 'Business Administration',
    subjects: ['economics', 'mathematics', 'commerce', 'english'],
    minWeighted: 50,
  },
  {
    course: 'Education (Arts)',
    subjects: ['history', 'literature', 'english', 'kiswahili'],
    minWeighted: 45,
  },
  {
    course: 'Education (Sciences)',
    subjects: ['mathematics', 'physics', 'chemistry', 'biology'],
    minWeighted: 45,
  },
  {
    course: 'Journalism & Mass Communication',
    subjects: ['english', 'literature', 'history', 'kiswahili'],
    minWeighted: 50,
  },
  {
    course: 'Agriculture & Veterinary Sciences',
    subjects: ['biology', 'chemistry', 'agriculture', 'mathematics'],
    minWeighted: 50,
  },
];

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
      universityCourses: rule.courses,
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

// ── A-Level pathway (university weighting) ─────

function aLevelPath(marks: Mark[]): CareerResult {
  const allGrades = marksToGrades(marks);
  const best = bestGradeMap(allGrades);

  const sciAvg = avgPct([...best.values()], (g) => isScience(g.subject));
  const artsAvg = avgPct([...best.values()], (g) => !isScience(g.subject));

  // Weighted aggregate: sum of (3-subject best points) — lower is better
  const sortedGrades = [...best.values()].sort(
    (a, b) => a.points - b.points || b.percentage - a.percentage
  );
  const top3Points = sortedGrades.slice(0, 3).reduce((s, g) => s + g.points, 0);

  const suggestions: CareerSuggestion[] = [];

  for (const rule of A_LEVEL_UNI_RULES) {
    // Compute weighted average: earlier subjects get higher weight
    let weightedSum = 0;
    let weightTotal = 0;
    let matched = 0;

    rule.subjects.forEach((subj, idx) => {
      const g = best.get(subj);
      if (g) {
        const weight = rule.subjects.length - idx; // first subject = highest weight
        weightedSum += g.percentage * weight;
        weightTotal += weight;
        matched++;
      }
    });

    // Must have at least 2 matching subjects
    if (matched < 2 || weightTotal === 0) continue;

    const weightedPct = weightedSum / weightTotal;
    if (weightedPct < rule.minWeighted) continue;

    let confidence: CareerSuggestion['confidence'];
    if (weightedPct >= 80) confidence = 'high';
    else if (weightedPct >= 65) confidence = 'medium';
    else confidence = 'low';

    suggestions.push({
      aLevelCombination: rule.subjects.map((s) => s.replace(/_/g, ' ')),
      universityCourses: [rule.course],
      confidence,
      avgPercentage: Math.round(weightedPct * 10) / 10,
    });
  }

  const order = { high: 0, medium: 1, low: 2 };
  suggestions.sort(
    (a, b) => order[a.confidence] - order[b.confidence] || b.avgPercentage - a.avgPercentage
  );

  return {
    level: 'a-level',
    grades: sortedGrades,
    aggregateScore: top3Points,
    scienceAvgPct: sciAvg,
    artsAvgPct: artsAvg,
    suggestions,
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
