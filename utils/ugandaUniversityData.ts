// ──────────────────────────────────────────────
// NafAcademy – Uganda University Admission Data
// ──────────────────────────────────────────────
// Comprehensive database of Ugandan universities,
// courses, required A-Level combinations, and
// minimum UACE weight cut-offs.
//
// UACE Weight System:
//   Principal: A=6, B=5, C=4, D=3, E=2, O=1, F=0
//   Weight = sum of 3 principal subjects (max 18)
//
// O-Level Aggregate (UCE):
//   D1=1, D2=2, C3=3, C4=4, P5=5, C6=6, P7=7, P8=8, F9=9
//   Aggregate = sum of best 8 subjects (lower = better)
// ──────────────────────────────────────────────

// ═══════════════════════════════════════════════
//  A-Level Grade Scale (UACE)
// ═══════════════════════════════════════════════

export interface ALevelGrade {
  min: number;       // minimum percentage
  grade: string;     // letter grade
  weight: number;    // UACE weight (higher = better)
  label: string;
}

export const A_LEVEL_GRADE_SCALE: ALevelGrade[] = [
  { min: 80, grade: 'A', weight: 6, label: 'Distinction' },
  { min: 70, grade: 'B', weight: 5, label: 'Very Good' },
  { min: 60, grade: 'C', weight: 4, label: 'Good' },
  { min: 50, grade: 'D', weight: 3, label: 'Credit' },
  { min: 40, grade: 'E', weight: 2, label: 'Pass' },
  { min: 35, grade: 'O', weight: 1, label: 'Subsidiary' },
  { min: 0,  grade: 'F', weight: 0, label: 'Fail' },
];

/** Convert percentage → A-Level grade and weight */
export function pctToALevelGrade(pct: number): ALevelGrade {
  return (
    A_LEVEL_GRADE_SCALE.find((g) => pct >= g.min) ??
    A_LEVEL_GRADE_SCALE[A_LEVEL_GRADE_SCALE.length - 1]
  );
}

// ═══════════════════════════════════════════════
//  A-Level Combinations (Uganda)
// ═══════════════════════════════════════════════

export interface ALevelCombo {
  code: string;         // e.g. "PCM"
  name: string;         // e.g. "Physics, Chemistry, Mathematics"
  subjects: string[];   // normalised subject IDs
  stream: 'science' | 'arts' | 'mixed';
}

export const A_LEVEL_COMBINATIONS: ALevelCombo[] = [
  // Science
  { code: 'PCM', name: 'Physics, Chemistry, Mathematics',           subjects: ['physics', 'chemistry', 'mathematics'], stream: 'science' },
  { code: 'PCB', name: 'Physics, Chemistry, Biology',               subjects: ['physics', 'chemistry', 'biology'],    stream: 'science' },
  { code: 'BCM', name: 'Biology, Chemistry, Mathematics',           subjects: ['biology', 'chemistry', 'mathematics'], stream: 'science' },
  { code: 'PEM', name: 'Physics, Economics, Mathematics',           subjects: ['physics', 'economics', 'mathematics'], stream: 'science' },
  { code: 'MCE', name: 'Mathematics, Computer, Economics',          subjects: ['mathematics', 'computer_science', 'economics'], stream: 'science' },

  // Arts
  { code: 'HEG', name: 'History, Economics, Geography',             subjects: ['history', 'economics', 'geography'],  stream: 'arts' },
  { code: 'HEL', name: 'History, Economics, Literature',            subjects: ['history', 'economics', 'literature'], stream: 'arts' },
  { code: 'HED', name: 'History, Economics, Divinity/CRE',          subjects: ['history', 'economics', 'cre'],        stream: 'arts' },
  { code: 'LEG', name: 'Literature, Economics, Geography',          subjects: ['literature', 'economics', 'geography'], stream: 'arts' },
  { code: 'LED', name: 'Literature, Economics, Divinity/CRE',       subjects: ['literature', 'economics', 'cre'],      stream: 'arts' },
  { code: 'HLK', name: 'History, Literature, Kiswahili',            subjects: ['history', 'literature', 'kiswahili'],  stream: 'arts' },
  { code: 'HEK', name: 'History, Economics, Kiswahili',             subjects: ['history', 'economics', 'kiswahili'],   stream: 'arts' },

  // Mixed
  { code: 'MEG', name: 'Mathematics, Economics, Geography',         subjects: ['mathematics', 'economics', 'geography'], stream: 'mixed' },
  { code: 'MED', name: 'Mathematics, Economics, Divinity/CRE',      subjects: ['mathematics', 'economics', 'cre'],       stream: 'mixed' },
];

/**
 * Detect a student's A-Level combination from their subjects.
 * Returns the best-matching combo or null.
 */
export function detectCombination(subjectIds: string[]): ALevelCombo | null {
  const lower = new Set(subjectIds.map((s) => s.toLowerCase()));
  // Find the combo where the student has all 3 principal subjects
  return (
    A_LEVEL_COMBINATIONS.find((c) => c.subjects.every((s) => lower.has(s))) ??
    null
  );
}

// ═══════════════════════════════════════════════
//  University Database
// ═══════════════════════════════════════════════

export type UniversityType = 'public' | 'private';

export interface UniversityInfo {
  name: string;
  shortName: string;
  type: UniversityType;
  location: string;
}

export interface UniversityCourse {
  university: string;       // matches UniversityInfo.shortName
  course: string;           // full course name
  faculty: string;          // faculty / school / college
  /** Accepted A-Level combo codes (e.g. ['PCM', 'PCB']) */
  acceptedCombos: string[];
  /** Essential subject IDs — must have at least a pass (E+) in these */
  essentialSubjects: string[];
  /** Minimum UACE weight (3 principals) to be competitive */
  minWeight: number;
  /** Duration of the programme */
  duration: string;
}

// ── Universities ───────────────────────────────

export const UNIVERSITIES: UniversityInfo[] = [
  { name: 'Makerere University',                          shortName: 'MAK',    type: 'public',  location: 'Kampala' },
  { name: 'Kyambogo University',                          shortName: 'KYU',    type: 'public',  location: 'Kampala' },
  { name: 'Mbarara University of Science and Technology', shortName: 'MUST',   type: 'public',  location: 'Mbarara' },
  { name: 'Gulu University',                              shortName: 'GU',     type: 'public',  location: 'Gulu' },
  { name: 'Busitema University',                          shortName: 'BU',     type: 'public',  location: 'Busia' },
  { name: 'Lira University',                              shortName: 'LU',     type: 'public',  location: 'Lira' },
  { name: 'Soroti University',                            shortName: 'SU',     type: 'public',  location: 'Soroti' },
  { name: 'Kabale University',                            shortName: 'KAB',    type: 'public',  location: 'Kabale' },
  { name: 'Uganda Christian University',                  shortName: 'UCU',    type: 'private', location: 'Mukono' },
  { name: 'Kampala International University',             shortName: 'KIU',    type: 'private', location: 'Kampala' },
  { name: 'Uganda Martyrs University',                    shortName: 'UMU',    type: 'private', location: 'Nkozi' },
  { name: 'Ndejje University',                            shortName: 'NDU',    type: 'private', location: 'Luwero' },
  { name: 'Nkumba University',                            shortName: 'NKU',    type: 'private', location: 'Entebbe' },
  { name: 'Islamic University in Uganda',                 shortName: 'IUIU',   type: 'private', location: 'Mbale' },
  { name: 'Bishop Stuart University',                     shortName: 'BSU',    type: 'private', location: 'Mbarara' },
];

/** Quick lookup by shortName */
export function getUniversity(shortName: string): UniversityInfo | undefined {
  return UNIVERSITIES.find((u) => u.shortName === shortName);
}

// ── Courses with Requirements ──────────────────
// Cut-off weights are approximate and represent a competitive baseline.
// Actual cut-offs shift yearly depending on applicant pool.

export const UNIVERSITY_COURSES: UniversityCourse[] = [
  // ─────────────── MAKERERE UNIVERSITY ───────────────
  // Science / Health
  { university: 'MAK', course: 'Medicine & Surgery (MBChB)',        faculty: 'School of Medicine',         acceptedCombos: ['PCB', 'BCM'],                               essentialSubjects: ['biology', 'chemistry'],                  minWeight: 17, duration: '5 years' },
  { university: 'MAK', course: 'Pharmacy',                          faculty: 'School of Health Sciences',  acceptedCombos: ['PCB', 'BCM'],                               essentialSubjects: ['chemistry', 'biology'],                  minWeight: 16, duration: '4 years' },
  { university: 'MAK', course: 'Nursing Science',                   faculty: 'School of Health Sciences',  acceptedCombos: ['PCB', 'BCM'],                               essentialSubjects: ['biology'],                               minWeight: 13, duration: '4 years' },
  { university: 'MAK', course: 'Dentistry (BDS)',                   faculty: 'School of Medicine',         acceptedCombos: ['PCB', 'BCM'],                               essentialSubjects: ['biology', 'chemistry'],                  minWeight: 16, duration: '5 years' },
  { university: 'MAK', course: 'Biomedical Sciences',               faculty: 'School of Biomedical Sci.',  acceptedCombos: ['PCB', 'BCM'],                               essentialSubjects: ['biology', 'chemistry'],                  minWeight: 14, duration: '3 years' },
  { university: 'MAK', course: 'Veterinary Medicine',               faculty: 'College of Vet. Medicine',   acceptedCombos: ['PCB', 'BCM'],                               essentialSubjects: ['biology', 'chemistry'],                  minWeight: 15, duration: '5 years' },

  // Engineering
  { university: 'MAK', course: 'Civil Engineering',                 faculty: 'College of Engineering',     acceptedCombos: ['PCM'],                                      essentialSubjects: ['mathematics', 'physics'],                minWeight: 16, duration: '4 years' },
  { university: 'MAK', course: 'Electrical Engineering',            faculty: 'College of Engineering',     acceptedCombos: ['PCM'],                                      essentialSubjects: ['mathematics', 'physics'],                minWeight: 16, duration: '4 years' },
  { university: 'MAK', course: 'Mechanical Engineering',            faculty: 'College of Engineering',     acceptedCombos: ['PCM'],                                      essentialSubjects: ['mathematics', 'physics'],                minWeight: 15, duration: '4 years' },
  { university: 'MAK', course: 'Computer Engineering',              faculty: 'College of Engineering',     acceptedCombos: ['PCM', 'MCE'],                               essentialSubjects: ['mathematics'],                           minWeight: 15, duration: '4 years' },
  { university: 'MAK', course: 'Telecommunications Engineering',    faculty: 'College of Engineering',     acceptedCombos: ['PCM'],                                      essentialSubjects: ['mathematics', 'physics'],                minWeight: 15, duration: '4 years' },
  { university: 'MAK', course: 'Architecture',                      faculty: 'College of Engineering',     acceptedCombos: ['PCM'],                                      essentialSubjects: ['mathematics', 'physics'],                minWeight: 14, duration: '5 years' },
  { university: 'MAK', course: 'Quantity Surveying',                faculty: 'College of Engineering',     acceptedCombos: ['PCM', 'MEG'],                               essentialSubjects: ['mathematics'],                           minWeight: 13, duration: '4 years' },

  // Computing & Technology
  { university: 'MAK', course: 'Computer Science',                  faculty: 'College of Computing & IS',  acceptedCombos: ['PCM', 'MCE', 'PEM'],                        essentialSubjects: ['mathematics'],                           minWeight: 14, duration: '4 years' },
  { university: 'MAK', course: 'Information Technology',            faculty: 'College of Computing & IS',  acceptedCombos: ['PCM', 'MCE', 'PEM', 'MEG'],                 essentialSubjects: ['mathematics'],                           minWeight: 12, duration: '3 years' },
  { university: 'MAK', course: 'Information Systems',               faculty: 'College of Computing & IS',  acceptedCombos: ['PCM', 'MCE', 'PEM', 'MEG'],                 essentialSubjects: ['mathematics'],                           minWeight: 12, duration: '3 years' },

  // Business & Economics
  { university: 'MAK', course: 'Bachelor of Commerce',              faculty: 'MUBS',                       acceptedCombos: ['MEG', 'HEG', 'PEM', 'MCE'],                 essentialSubjects: ['economics'],                             minWeight: 13, duration: '3 years' },
  { university: 'MAK', course: 'Business Administration (BBA)',     faculty: 'MUBS',                       acceptedCombos: ['MEG', 'HEG', 'HEL', 'PEM'],                 essentialSubjects: ['economics'],                             minWeight: 13, duration: '3 years' },
  { university: 'MAK', course: 'Economics (BA)',                    faculty: 'College of Business',        acceptedCombos: ['MEG', 'HEG', 'PEM'],                        essentialSubjects: ['economics', 'mathematics'],              minWeight: 14, duration: '3 years' },
  { university: 'MAK', course: 'Statistics',                        faculty: 'College of Natural Sciences', acceptedCombos: ['PCM', 'MEG', 'PEM'],                       essentialSubjects: ['mathematics'],                           minWeight: 13, duration: '3 years' },
  { university: 'MAK', course: 'Actuarial Science',                 faculty: 'College of Natural Sciences', acceptedCombos: ['PCM', 'MEG', 'PEM'],                       essentialSubjects: ['mathematics'],                           minWeight: 15, duration: '3 years' },
  { university: 'MAK', course: 'Land Economics',                    faculty: 'College of Engineering',     acceptedCombos: ['MEG', 'HEG'],                               essentialSubjects: ['economics', 'geography'],                minWeight: 13, duration: '4 years' },

  // Law & Social Sciences
  { university: 'MAK', course: 'Law (LLB)',                         faculty: 'School of Law',              acceptedCombos: ['HEG', 'HEL', 'HED', 'LEG', 'MEG'],         essentialSubjects: ['history'],                               minWeight: 15, duration: '4 years' },
  { university: 'MAK', course: 'Social Sciences (BA)',              faculty: 'College of Humanities',      acceptedCombos: ['HEG', 'HEL', 'HED', 'LEG', 'LED', 'MEG'],  essentialSubjects: [],                                        minWeight: 11, duration: '3 years' },
  { university: 'MAK', course: 'Political Science',                 faculty: 'College of Humanities',      acceptedCombos: ['HEG', 'HEL', 'HED', 'LEG'],                 essentialSubjects: ['history'],                               minWeight: 12, duration: '3 years' },
  { university: 'MAK', course: 'Mass Communication',                faculty: 'College of Humanities',      acceptedCombos: ['HEL', 'HEG', 'LEG', 'HEK', 'HLK'],         essentialSubjects: [],                                        minWeight: 12, duration: '3 years' },
  { university: 'MAK', course: 'Development Studies',               faculty: 'College of Humanities',      acceptedCombos: ['HEG', 'HEL', 'HED', 'MEG'],                 essentialSubjects: [],                                        minWeight: 11, duration: '3 years' },
  { university: 'MAK', course: 'Urban Planning',                    faculty: 'College of Engineering',     acceptedCombos: ['MEG', 'HEG'],                               essentialSubjects: ['geography'],                             minWeight: 12, duration: '4 years' },
  { university: 'MAK', course: 'Leisure & Hospitality Management',  faculty: 'College of Humanities',      acceptedCombos: ['HEG', 'HEL', 'MEG', 'LEG'],                 essentialSubjects: [],                                        minWeight: 10, duration: '3 years' },

  // Education
  { university: 'MAK', course: 'Education (Arts)',                  faculty: 'College of Education',       acceptedCombos: ['HEG', 'HEL', 'HED', 'LEG', 'HEK', 'HLK'], essentialSubjects: [],                                        minWeight: 10, duration: '3 years' },
  { university: 'MAK', course: 'Education (Sciences)',              faculty: 'College of Education',       acceptedCombos: ['PCM', 'PCB', 'BCM'],                        essentialSubjects: [],                                        minWeight: 10, duration: '3 years' },

  // Agriculture & Environment
  { university: 'MAK', course: 'Agriculture',                       faculty: 'College of Agriculture',     acceptedCombos: ['PCB', 'BCM'],                               essentialSubjects: ['biology'],                               minWeight: 10, duration: '4 years' },
  { university: 'MAK', course: 'Food Science & Technology',         faculty: 'College of Agriculture',     acceptedCombos: ['PCB', 'BCM'],                               essentialSubjects: ['chemistry'],                             minWeight: 11, duration: '4 years' },
  { university: 'MAK', course: 'Environmental Science',             faculty: 'College of Agriculture',     acceptedCombos: ['PCB', 'BCM', 'MEG'],                        essentialSubjects: [],                                        minWeight: 10, duration: '3 years' },
  { university: 'MAK', course: 'Forestry',                          faculty: 'College of Agriculture',     acceptedCombos: ['PCB', 'BCM'],                               essentialSubjects: ['biology'],                               minWeight: 10, duration: '4 years' },

  // ─────────────── KYAMBOGO UNIVERSITY ───────────────
  { university: 'KYU', course: 'Civil Engineering',                 faculty: 'Faculty of Engineering',     acceptedCombos: ['PCM'],                                      essentialSubjects: ['mathematics', 'physics'],                minWeight: 13, duration: '4 years' },
  { university: 'KYU', course: 'Electrical Engineering',            faculty: 'Faculty of Engineering',     acceptedCombos: ['PCM'],                                      essentialSubjects: ['mathematics', 'physics'],                minWeight: 12, duration: '4 years' },
  { university: 'KYU', course: 'Mechanical Engineering',            faculty: 'Faculty of Engineering',     acceptedCombos: ['PCM'],                                      essentialSubjects: ['mathematics', 'physics'],                minWeight: 12, duration: '4 years' },
  { university: 'KYU', course: 'Computer Science',                  faculty: 'Faculty of Science',         acceptedCombos: ['PCM', 'MCE', 'PEM'],                        essentialSubjects: ['mathematics'],                           minWeight: 11, duration: '3 years' },
  { university: 'KYU', course: 'Economics',                         faculty: 'Faculty of Arts & Social Sci.', acceptedCombos: ['MEG', 'HEG', 'PEM'],                     essentialSubjects: ['economics'],                             minWeight: 10, duration: '3 years' },
  { university: 'KYU', course: 'Education (Arts)',                  faculty: 'Faculty of Education',       acceptedCombos: ['HEG', 'HEL', 'HED', 'LEG', 'HEK', 'HLK'], essentialSubjects: [],                                        minWeight: 9,  duration: '3 years' },
  { university: 'KYU', course: 'Education (Sciences)',              faculty: 'Faculty of Education',       acceptedCombos: ['PCM', 'PCB', 'BCM'],                        essentialSubjects: [],                                        minWeight: 9,  duration: '3 years' },
  { university: 'KYU', course: 'Business Administration',           faculty: 'Faculty of Arts & Social Sci.', acceptedCombos: ['MEG', 'HEG', 'HEL'],                     essentialSubjects: [],                                        minWeight: 10, duration: '3 years' },
  { university: 'KYU', course: 'Special Needs Education',           faculty: 'Faculty of Education',       acceptedCombos: ['HEG', 'HEL', 'HED', 'PCB', 'BCM'],         essentialSubjects: [],                                        minWeight: 9,  duration: '3 years' },
  { university: 'KYU', course: 'Art & Industrial Design',           faculty: 'Faculty of Vocational St.',  acceptedCombos: ['PCM', 'HEG', 'MEG'],                        essentialSubjects: [],                                        minWeight: 9,  duration: '3 years' },

  // ─────────────── MBARARA (MUST) ───────────────
  { university: 'MUST', course: 'Medicine & Surgery (MBChB)',       faculty: 'Faculty of Medicine',        acceptedCombos: ['PCB', 'BCM'],                               essentialSubjects: ['biology', 'chemistry'],                  minWeight: 16, duration: '5 years' },
  { university: 'MUST', course: 'Pharmacy',                         faculty: 'Faculty of Medicine',        acceptedCombos: ['PCB', 'BCM'],                               essentialSubjects: ['chemistry'],                             minWeight: 14, duration: '4 years' },
  { university: 'MUST', course: 'Nursing Science',                  faculty: 'Faculty of Medicine',        acceptedCombos: ['PCB', 'BCM'],                               essentialSubjects: ['biology'],                               minWeight: 11, duration: '4 years' },
  { university: 'MUST', course: 'Computer Science',                 faculty: 'Faculty of Science',         acceptedCombos: ['PCM', 'MCE', 'PEM'],                        essentialSubjects: ['mathematics'],                           minWeight: 11, duration: '3 years' },
  { university: 'MUST', course: 'Development Studies',              faculty: 'Faculty of Humanities',      acceptedCombos: ['HEG', 'HEL', 'MEG'],                        essentialSubjects: [],                                        minWeight: 10, duration: '3 years' },
  { university: 'MUST', course: 'Science Education',                faculty: 'Faculty of Science',         acceptedCombos: ['PCM', 'PCB', 'BCM'],                        essentialSubjects: [],                                        minWeight: 9,  duration: '3 years' },

  // ─────────────── GULU UNIVERSITY ───────────────
  { university: 'GU', course: 'Medicine & Surgery (MBChB)',         faculty: 'Faculty of Medicine',        acceptedCombos: ['PCB', 'BCM'],                               essentialSubjects: ['biology', 'chemistry'],                  minWeight: 14, duration: '5 years' },
  { university: 'GU', course: 'Agriculture',                        faculty: 'Faculty of Agriculture',     acceptedCombos: ['PCB', 'BCM'],                               essentialSubjects: ['biology'],                               minWeight: 9,  duration: '4 years' },
  { university: 'GU', course: 'Development Studies',                faculty: 'Faculty of Social Sciences', acceptedCombos: ['HEG', 'HEL', 'HED', 'MEG'],                 essentialSubjects: [],                                        minWeight: 9,  duration: '3 years' },
  { university: 'GU', course: 'Education (Arts)',                   faculty: 'Faculty of Education',       acceptedCombos: ['HEG', 'HEL', 'HED', 'LEG', 'HEK'],         essentialSubjects: [],                                        minWeight: 8,  duration: '3 years' },
  { university: 'GU', course: 'Education (Sciences)',               faculty: 'Faculty of Education',       acceptedCombos: ['PCM', 'PCB', 'BCM'],                        essentialSubjects: [],                                        minWeight: 8,  duration: '3 years' },
  { university: 'GU', course: 'Law (LLB)',                          faculty: 'Faculty of Law',             acceptedCombos: ['HEG', 'HEL', 'LEG'],                        essentialSubjects: ['history'],                               minWeight: 12, duration: '4 years' },

  // ─────────────── BUSITEMA UNIVERSITY ───────────────
  { university: 'BU', course: 'Medicine & Surgery (MBChB)',         faculty: 'Faculty of Health Sciences', acceptedCombos: ['PCB', 'BCM'],                               essentialSubjects: ['biology', 'chemistry'],                  minWeight: 14, duration: '5 years' },
  { university: 'BU', course: 'Civil Engineering',                  faculty: 'Faculty of Engineering',     acceptedCombos: ['PCM'],                                      essentialSubjects: ['mathematics', 'physics'],                minWeight: 12, duration: '4 years' },
  { university: 'BU', course: 'Mechanical Engineering',             faculty: 'Faculty of Engineering',     acceptedCombos: ['PCM'],                                      essentialSubjects: ['mathematics', 'physics'],                minWeight: 11, duration: '4 years' },
  { university: 'BU', course: 'Computer Engineering',               faculty: 'Faculty of Engineering',     acceptedCombos: ['PCM', 'MCE'],                               essentialSubjects: ['mathematics'],                           minWeight: 11, duration: '4 years' },
  { university: 'BU', course: 'Textile Engineering',                faculty: 'Faculty of Engineering',     acceptedCombos: ['PCM', 'PCB'],                               essentialSubjects: ['chemistry'],                             minWeight: 10, duration: '4 years' },
  { university: 'BU', course: 'Education (Sciences)',               faculty: 'Faculty of Education',       acceptedCombos: ['PCM', 'PCB', 'BCM'],                        essentialSubjects: [],                                        minWeight: 8,  duration: '3 years' },
  { university: 'BU', course: 'Agriculture',                        faculty: 'Faculty of Agriculture',     acceptedCombos: ['PCB', 'BCM'],                               essentialSubjects: ['biology'],                               minWeight: 9,  duration: '4 years' },

  // ─────────────── LIRA UNIVERSITY ───────────────
  { university: 'LU', course: 'Education (Arts)',                   faculty: 'Faculty of Education',       acceptedCombos: ['HEG', 'HEL', 'HED', 'LEG'],                 essentialSubjects: [],                                        minWeight: 8,  duration: '3 years' },
  { university: 'LU', course: 'Education (Sciences)',               faculty: 'Faculty of Education',       acceptedCombos: ['PCM', 'PCB', 'BCM'],                        essentialSubjects: [],                                        minWeight: 8,  duration: '3 years' },
  { university: 'LU', course: 'Business Administration',            faculty: 'Faculty of Management Sci.', acceptedCombos: ['MEG', 'HEG', 'HEL'],                        essentialSubjects: [],                                        minWeight: 9,  duration: '3 years' },
  { university: 'LU', course: 'Development Studies',                faculty: 'Faculty of Management Sci.', acceptedCombos: ['HEG', 'HEL', 'MEG'],                        essentialSubjects: [],                                        minWeight: 8,  duration: '3 years' },

  // ─────────────── KABALE UNIVERSITY ───────────────
  { university: 'KAB', course: 'Medicine & Surgery (MBChB)',        faculty: 'Faculty of Medicine',        acceptedCombos: ['PCB', 'BCM'],                               essentialSubjects: ['biology', 'chemistry'],                  minWeight: 13, duration: '5 years' },
  { university: 'KAB', course: 'Computer Science',                  faculty: 'Faculty of Science',         acceptedCombos: ['PCM', 'MCE'],                               essentialSubjects: ['mathematics'],                           minWeight: 10, duration: '3 years' },
  { university: 'KAB', course: 'Education (Arts)',                  faculty: 'Faculty of Education',       acceptedCombos: ['HEG', 'HEL', 'HED', 'LEG'],                 essentialSubjects: [],                                        minWeight: 8,  duration: '3 years' },

  // ═══════════════ PRIVATE UNIVERSITIES ═══════════════

  // ─────────────── UCU ───────────────
  { university: 'UCU', course: 'Law (LLB)',                         faculty: 'Faculty of Law',             acceptedCombos: ['HEG', 'HEL', 'HED', 'LEG', 'MEG'],         essentialSubjects: ['history'],                               minWeight: 12, duration: '4 years' },
  { university: 'UCU', course: 'Business Administration',           faculty: 'Faculty of Business',        acceptedCombos: ['MEG', 'HEG', 'HEL', 'PEM'],                 essentialSubjects: [],                                        minWeight: 10, duration: '3 years' },
  { university: 'UCU', course: 'Mass Communication',                faculty: 'Faculty of Social Sciences', acceptedCombos: ['HEL', 'HEG', 'LEG', 'HEK'],                 essentialSubjects: [],                                        minWeight: 10, duration: '3 years' },
  { university: 'UCU', course: 'Social Work & Social Admin.',       faculty: 'Faculty of Social Sciences', acceptedCombos: ['HEG', 'HEL', 'HED', 'LEG'],                 essentialSubjects: [],                                        minWeight: 9,  duration: '3 years' },
  { university: 'UCU', course: 'Computer Science',                  faculty: 'Faculty of Engineering',     acceptedCombos: ['PCM', 'MCE', 'PEM'],                        essentialSubjects: ['mathematics'],                           minWeight: 10, duration: '4 years' },
  { university: 'UCU', course: 'Nursing',                           faculty: 'Faculty of Health Sciences', acceptedCombos: ['PCB', 'BCM'],                               essentialSubjects: ['biology'],                               minWeight: 10, duration: '4 years' },
  { university: 'UCU', course: 'Education (Arts)',                  faculty: 'Faculty of Education',       acceptedCombos: ['HEG', 'HEL', 'HED', 'LEG'],                 essentialSubjects: [],                                        minWeight: 8,  duration: '3 years' },
  { university: 'UCU', course: 'Theology & Divinity',               faculty: 'Faculty of Divinity',       acceptedCombos: ['HED', 'HEL', 'HEG'],                        essentialSubjects: [],                                        minWeight: 8,  duration: '3 years' },

  // ─────────────── KIU ───────────────
  { university: 'KIU', course: 'Medicine & Surgery (MBChB)',        faculty: 'School of Health Sciences',  acceptedCombos: ['PCB', 'BCM'],                               essentialSubjects: ['biology', 'chemistry'],                  minWeight: 12, duration: '5 years' },
  { university: 'KIU', course: 'Computer Science',                  faculty: 'Faculty of Science & Tech.', acceptedCombos: ['PCM', 'MCE', 'PEM'],                       essentialSubjects: ['mathematics'],                           minWeight: 9,  duration: '4 years' },
  { university: 'KIU', course: 'Law (LLB)',                         faculty: 'Faculty of Law',             acceptedCombos: ['HEG', 'HEL', 'LEG', 'MEG'],                 essentialSubjects: [],                                        minWeight: 10, duration: '4 years' },
  { university: 'KIU', course: 'Business Administration',           faculty: 'Faculty of Business',        acceptedCombos: ['MEG', 'HEG', 'HEL', 'PEM'],                 essentialSubjects: [],                                        minWeight: 8,  duration: '3 years' },
  { university: 'KIU', course: 'Pharmacy',                          faculty: 'School of Health Sciences',  acceptedCombos: ['PCB', 'BCM'],                               essentialSubjects: ['chemistry'],                             minWeight: 11, duration: '4 years' },
  { university: 'KIU', course: 'Education (Arts)',                  faculty: 'Faculty of Education',       acceptedCombos: ['HEG', 'HEL', 'HED', 'LEG'],                 essentialSubjects: [],                                        minWeight: 7,  duration: '3 years' },
  { university: 'KIU', course: 'Education (Sciences)',              faculty: 'Faculty of Education',       acceptedCombos: ['PCM', 'PCB', 'BCM'],                        essentialSubjects: [],                                        minWeight: 7,  duration: '3 years' },
  { university: 'KIU', course: 'Mass Communication',                faculty: 'Faculty of Social Sciences', acceptedCombos: ['HEL', 'HEG', 'LEG'],                        essentialSubjects: [],                                        minWeight: 8,  duration: '3 years' },
  { university: 'KIU', course: 'Nursing',                           faculty: 'School of Health Sciences',  acceptedCombos: ['PCB', 'BCM'],                               essentialSubjects: ['biology'],                               minWeight: 9,  duration: '4 years' },

  // ─────────────── UGANDA MARTYRS (UMU) ───────────────
  { university: 'UMU', course: 'Business Administration',           faculty: 'Faculty of Business',        acceptedCombos: ['MEG', 'HEG', 'HEL'],                        essentialSubjects: [],                                        minWeight: 9,  duration: '3 years' },
  { university: 'UMU', course: 'Agriculture',                       faculty: 'Faculty of Agriculture',     acceptedCombos: ['PCB', 'BCM'],                               essentialSubjects: ['biology'],                               minWeight: 8,  duration: '4 years' },
  { university: 'UMU', course: 'Education (Arts)',                  faculty: 'Faculty of Education',       acceptedCombos: ['HEG', 'HEL', 'HED'],                        essentialSubjects: [],                                        minWeight: 8,  duration: '3 years' },
  { university: 'UMU', course: 'Development Studies',               faculty: 'Faculty of Social Sciences', acceptedCombos: ['HEG', 'HEL', 'MEG'],                        essentialSubjects: [],                                        minWeight: 8,  duration: '3 years' },
  { university: 'UMU', course: 'Information Technology',            faculty: 'Faculty of Science',         acceptedCombos: ['PCM', 'MCE', 'PEM', 'MEG'],                  essentialSubjects: [],                                       minWeight: 8,  duration: '3 years' },

  // ─────────────── NKUMBA UNIVERSITY ───────────────
  { university: 'NKU', course: 'Law (LLB)',                         faculty: 'School of Law',              acceptedCombos: ['HEG', 'HEL', 'LEG', 'MEG'],                 essentialSubjects: [],                                        minWeight: 10, duration: '4 years' },
  { university: 'NKU', course: 'Business Administration',           faculty: 'School of Business',         acceptedCombos: ['MEG', 'HEG', 'HEL'],                        essentialSubjects: [],                                        minWeight: 8,  duration: '3 years' },
  { university: 'NKU', course: 'Mass Communication',                faculty: 'School of Social Sciences',  acceptedCombos: ['HEL', 'HEG', 'LEG'],                        essentialSubjects: [],                                        minWeight: 8,  duration: '3 years' },
  { university: 'NKU', course: 'Computer Science',                  faculty: 'School of Science & Tech.',  acceptedCombos: ['PCM', 'MCE', 'PEM'],                        essentialSubjects: ['mathematics'],                           minWeight: 9,  duration: '3 years' },
  { university: 'NKU', course: 'Procurement & Logistics',           faculty: 'School of Business',         acceptedCombos: ['MEG', 'HEG', 'HEL'],                        essentialSubjects: [],                                        minWeight: 8,  duration: '3 years' },
  { university: 'NKU', course: 'Peace & Conflict Studies',          faculty: 'School of Social Sciences',  acceptedCombos: ['HEG', 'HEL', 'HED'],                        essentialSubjects: [],                                        minWeight: 8,  duration: '3 years' },

  // ─────────────── NDEJJE UNIVERSITY ───────────────
  { university: 'NDU', course: 'Business Administration',           faculty: 'Faculty of Business',        acceptedCombos: ['MEG', 'HEG', 'HEL'],                        essentialSubjects: [],                                        minWeight: 8,  duration: '3 years' },
  { university: 'NDU', course: 'Computer Science',                  faculty: 'Faculty of Science',         acceptedCombos: ['PCM', 'MCE'],                               essentialSubjects: ['mathematics'],                           minWeight: 8,  duration: '3 years' },
  { university: 'NDU', course: 'Education (Arts)',                  faculty: 'Faculty of Education',       acceptedCombos: ['HEG', 'HEL', 'HED', 'LEG'],                 essentialSubjects: [],                                        minWeight: 7,  duration: '3 years' },
  { university: 'NDU', course: 'Education (Sciences)',              faculty: 'Faculty of Education',       acceptedCombos: ['PCM', 'PCB', 'BCM'],                        essentialSubjects: [],                                        minWeight: 7,  duration: '3 years' },

  // ─────────────── IUIU ───────────────
  { university: 'IUIU', course: 'Law (LLB)',                        faculty: 'Faculty of Law',            acceptedCombos: ['HEG', 'HEL', 'HED', 'LEG'],                 essentialSubjects: [],                                        minWeight: 10, duration: '4 years' },
  { university: 'IUIU', course: 'Education (Arts)',                 faculty: 'Faculty of Education',       acceptedCombos: ['HEG', 'HEL', 'HED', 'LEG'],                 essentialSubjects: [],                                        minWeight: 8,  duration: '3 years' },
  { university: 'IUIU', course: 'Business Administration',          faculty: 'Faculty of Management St.', acceptedCombos: ['MEG', 'HEG', 'HEL'],                         essentialSubjects: [],                                        minWeight: 8,  duration: '3 years' },
  { university: 'IUIU', course: 'Islamic Studies',                  faculty: 'Faculty of Islamic Studies', acceptedCombos: ['HED', 'HEL', 'HEG'],                         essentialSubjects: [],                                        minWeight: 7,  duration: '3 years' },

  // ─────────────── BISHOP STUART UNIVERSITY ───────────────
  { university: 'BSU', course: 'Education (Arts)',                  faculty: 'Faculty of Education',       acceptedCombos: ['HEG', 'HEL', 'HED', 'LEG'],                 essentialSubjects: [],                                        minWeight: 8,  duration: '3 years' },
  { university: 'BSU', course: 'Education (Sciences)',              faculty: 'Faculty of Education',       acceptedCombos: ['PCM', 'PCB', 'BCM'],                        essentialSubjects: [],                                        minWeight: 8,  duration: '3 years' },
  { university: 'BSU', course: 'Business Administration',           faculty: 'Faculty of Business',        acceptedCombos: ['MEG', 'HEG', 'HEL'],                        essentialSubjects: [],                                        minWeight: 8,  duration: '3 years' },
  { university: 'BSU', course: 'Agriculture',                       faculty: 'Faculty of Agriculture',     acceptedCombos: ['PCB', 'BCM'],                               essentialSubjects: ['biology'],                               minWeight: 8,  duration: '4 years' },
  { university: 'BSU', course: 'Nursing',                           faculty: 'Faculty of Health Sciences', acceptedCombos: ['PCB', 'BCM'],                               essentialSubjects: ['biology'],                               minWeight: 9,  duration: '4 years' },
];

// ═══════════════════════════════════════════════
//  Matching Engine
// ═══════════════════════════════════════════════

export interface UniversityMatch {
  university: UniversityInfo;
  course: string;
  faculty: string;
  duration: string;
  /** Student's calculated UACE weight (3 principals) */
  studentWeight: number;
  /** Minimum weight required for this course */
  requiredWeight: number;
  /** How far above (positive) or below (negative) the cut-off */
  weightMargin: number;
  /** Confidence based on margin */
  confidence: 'high' | 'medium' | 'low';
  /** Student's detected A-Level combination code */
  comboCode: string;
}

/**
 * Given a student's subjects and their A-Level percentages,
 * find all university courses they qualify for.
 *
 * @param subjectScores Map of normalised subjectId → percentage
 * @returns Sorted array of university matches (best first)
 */
export function matchUniversityCourses(
  subjectScores: Map<string, number>
): { combo: ALevelCombo | null; weight: number; matches: UniversityMatch[] } {
  // Detect combination
  const combo = detectCombination([...subjectScores.keys()]);
  if (!combo) {
    return { combo: null, weight: 0, matches: [] };
  }

  // Calculate UACE weight from 3 principal subjects
  const principalWeights = combo.subjects.map((s) => {
    const pct = subjectScores.get(s) ?? 0;
    return pctToALevelGrade(pct).weight;
  });
  const totalWeight = principalWeights.reduce((a, b) => a + b, 0);

  // Find matching courses
  const matches: UniversityMatch[] = [];

  for (const course of UNIVERSITY_COURSES) {
    // Check if student's combo is accepted
    if (!course.acceptedCombos.includes(combo.code)) continue;

    // Check essential subjects — student must have at least a pass (≥40% → E)
    const hasEssentials = course.essentialSubjects.every((s) => {
      const pct = subjectScores.get(s);
      return pct !== undefined && pct >= 40;
    });
    if (!hasEssentials) continue;

    const uni = getUniversity(course.university);
    if (!uni) continue;

    const margin = totalWeight - course.minWeight;

    let confidence: 'high' | 'medium' | 'low';
    if (margin >= 2) confidence = 'high';
    else if (margin >= 0) confidence = 'medium';
    else if (margin >= -2) confidence = 'low';
    else continue; // Too far below cut-off, don't show

    matches.push({
      university: uni,
      course: course.course,
      faculty: course.faculty,
      duration: course.duration,
      studentWeight: totalWeight,
      requiredWeight: course.minWeight,
      weightMargin: margin,
      confidence,
      comboCode: combo.code,
    });
  }

  // Sort: high confidence first, then by weight margin descending
  const order = { high: 0, medium: 1, low: 2 };
  matches.sort(
    (a, b) =>
      order[a.confidence] - order[b.confidence] ||
      b.weightMargin - a.weightMargin ||
      a.requiredWeight - b.requiredWeight
  );

  return { combo, weight: totalWeight, matches };
}

/**
 * For O-Level students: given a combo code, return the university
 * courses that combo leads to (grouped by university).
 */
export function getCoursesForCombo(comboCode: string): UniversityCourse[] {
  return UNIVERSITY_COURSES.filter((c) => c.acceptedCombos.includes(comboCode));
}
