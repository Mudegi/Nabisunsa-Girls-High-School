// ──────────────────────────────────────────────
// NafAcademy – Shared TypeScript Types
// ──────────────────────────────────────────────

/** Supported user roles in the system */
export type UserRole = 'admin' | 'teacher' | 'student' | 'parent';

/** Firebase Auth + Firestore user profile (/users/{userId}) */
export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  schoolId: string;
  /** Only set when role === 'parent' */
  childIds?: string[];
  /** Student's class (e.g. "S3A") */
  classId?: string;
  /** Student registration number (used as login identifier for students) */
  regNumber?: string;
  /** Phone number (used for parent linking) */
  phone?: string;
  photoURL?: string;
  /** Push notification token */
  pushToken?: string;
  /** Whether the account is active */
  active?: boolean;
  createdAt: number;
}

/** School document (/schools/{schoolId}) */
export interface School {
  id: string;
  name: string;
  motto?: string;
  logoURL?: string;
  curriculum: 'CBC' | 'IGCSE' | '8-4-4' | 'A-Level';
  subjects: string[];
  /** Whether the school subscription is active (Super Admin toggle) */
  active: boolean;
  /** Grading weights set by the school admin */
  weights?: GradingWeights;
  createdAt: number;
}

/** School-configurable grading weights (must sum to 100) */
export interface GradingWeights {
  assignment: number;  // e.g. 20
  midTerm: number;     // e.g. 30
  endTerm: number;     // e.g. 50
}

/** Term document (/schools/{schoolId}/terms/{termId}) */
export interface Term {
  id: string;
  schoolId: string;
  name: string;       // e.g. "Term 1 2026"
  startDate: number;
  endDate: number;
  active: boolean;
  year: number;
}

/** Class / Stream document (/schools/{schoolId}/classes/{classId}) */
export interface ClassRoom {
  id: string;
  schoolId: string;
  name: string;        // e.g. "S3A", "P6"
  level: 'o-level' | 'a-level' | 'primary';
  year: number;        // calendar year
}

/** Subject document (/schools/{schoolId}/subjects/{subjectId}) */
export interface Subject {
  id: string;
  schoolId: string;
  name: string;        // e.g. "Physics", "Luganda"
  code?: string;       // e.g. "PHY"
  category: 'science' | 'arts' | 'language' | 'technical' | 'other';
}

/** Topic within a subject (/schools/{schoolId}/subjects/{subjectId}/topics/{topicId}) */
export interface Topic {
  id: string;
  subjectId: string;
  name: string;        // e.g. "Newton's Laws of Motion"
  order: number;       // for sorting
  termId?: string;     // which term this topic belongs to
}

/** Assignment document (/assignments/{assignmentId}) */
export interface Assignment {
  id: string;
  schoolId: string;
  classId: string;
  subjectId: string;
  title: string;
  description?: string;
  /** 'exercise' | 'activity' | 'exam' */
  type?: 'exercise' | 'activity' | 'exam';
  termId?: string;
  dueDate: number;
  createdBy: string;
  createdAt: number;
}

/** Mark / grade document (/marks/{markId}) */
export interface Mark {
  id: string;
  studentId: string;
  subjectId: string;
  schoolId: string;
  score: number;
  maxScore: number;
  /** Which exam period this mark is for */
  examType: 'bot' | 'mid' | 'eot' | 'assignment';
  term: string;
  termId?: string;
  year: number;
  createdBy?: string;
  createdAt: number;
}

/** Grade computed from marks */
export interface Grade {
  subject: string;
  percentage: number;
  grade: string;
  points: number;
}

/** Career path suggestion (O-Level → A-Level combo recommendations) */
export interface CareerSuggestion {
  aLevelCombination: string[];
  /** Combo code e.g. "PCM", "MEG" */
  comboCode?: string;
  universityCourses: string[];
  /** Number of university courses this combo leads to */
  universityCourseCount?: number;
  confidence: 'high' | 'medium' | 'low';
  /** Average percentage across the subjects that drive this suggestion */
  avgPercentage: number;
}

/** A-Level university course match */
export interface UniversityRecommendation {
  universityName: string;
  universityShort: string;
  universityType: 'public' | 'private';
  location: string;
  course: string;
  faculty: string;
  duration: string;
  studentWeight: number;
  requiredWeight: number;
  weightMargin: number;
  confidence: 'high' | 'medium' | 'low';
}

/** Full result returned by calculateCareerPath */
export interface CareerResult {
  /** Which level was detected / used */
  level: 'o-level' | 'a-level';
  /** Best grades used for the calculation (best 8 for O-Level, all for A-Level) */
  grades: Grade[];
  /** Aggregate score (O-Level: total points best-8, A-Level: weighted score) */
  aggregateScore: number;
  /** Science-stream average percentage (physics, chemistry, biology, mathematics) */
  scienceAvgPct: number;
  /** Arts/humanities average percentage */
  artsAvgPct: number;
  /** Sorted suggestions (O-Level: combo recommendations) */
  suggestions: CareerSuggestion[];

  // ── A-Level specific fields ──
  /** Detected A-Level combination code (e.g. "MEG") */
  detectedCombo?: string;
  /** Detected combination full name (e.g. "Mathematics, Economics, Geography") */
  detectedComboName?: string;
  /** UACE weight = sum of 3 principal subject weights (max 18) */
  uaceWeight?: number;
  /** University course matches for A-Level students */
  universityMatches?: UniversityRecommendation[];
}

/** Video lesson document (/videoLessons/{lessonId}) */
export interface VideoLesson {
  id: string;
  schoolId: string;
  subjectId: string;
  classId: string;
  /** Topic this video belongs to */
  topicId?: string;
  termId?: string;
  title: string;
  /** Google Drive file ID for the video */
  driveFileId: string;
  /** Optional notes: PDF or PNG URLs stored in Firestore */
  notes?: VideoNote[];
  /** Number of comments */
  commentCount?: number;
  createdBy: string;
  createdAt: number;
}

/** A single note attachment (PDF / image) */
export interface VideoNote {
  label: string;
  /** Direct URL to PDF or PNG (Firebase Storage, Drive, etc.) */
  url: string;
  type: 'pdf' | 'image';
}

/** Comment on a video lesson (/videoLessons/{lessonId}/comments/{commentId}) */
export interface VideoComment {
  id: string;
  lessonId: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  text: string;
  /** If replying to another comment */
  parentId?: string;
  createdAt: number;
}

/** Student submission for an assignment (/submissions/{submissionId}) */
export interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName: string;
  schoolId: string;
  /** URL of the uploaded PNG/JPG/PDF in Firebase Storage */
  fileUrl: string;
  fileType: 'image' | 'pdf';
  /** Score given by teacher (null = not yet graded) */
  score: number | null;
  maxScore: number;
  gradedBy: string | null;
  gradedAt: number | null;
  submittedAt: number;
}

// ── Chat / Messaging ───────────────────────────

/** A conversation between two users (/conversations/{conversationId}) */
export interface Conversation {
  id: string;
  /** Sorted array of the two participant UIDs */
  participants: string[];
  /** Display names keyed by UID for quick lookup */
  participantNames: Record<string, string>;
  participantRoles: Record<string, UserRole>;
  schoolId: string;
  lastMessage: string;
  lastMessageAt: number;
  /** Unread count per participant UID */
  unreadCount: Record<string, number>;
}

/** A single chat message (/conversations/{convId}/messages/{msgId}) */
export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  /** Optional media attachment */
  mediaUrl?: string;
  mediaType?: 'image' | 'pdf' | 'audio';
  createdAt: number;
  /** Read by recipient */
  read: boolean;
}

// ── Notifications ──────────────────────────────

/** In-app notification (/notifications/{notifId}) */
export interface AppNotification {
  id: string;
  recipientId: string;
  schoolId: string;
  title: string;
  body: string;
  /** What triggered this notification */
  type: 'assignment' | 'mark' | 'chat' | 'submission' | 'announcement' | 'system';
  /** Deep link target (e.g., '/(main)/assignments') */
  link?: string;
  /** Reference ID (assignmentId, conversationId, etc.) */
  refId?: string;
  read: boolean;
  createdAt: number;
}

// ── Projects ───────────────────────────────────

/** Student project (/projects/{projectId}) */
export interface Project {
  id: string;
  schoolId: string;
  classId: string;
  subjectId: string;
  title: string;
  description?: string;
  teacherId: string;
  /** Student IDs assigned to this project */
  studentIds: string[];
  status: 'pending' | 'in-progress' | 'submitted' | 'graded';
  dueDate: number;
  score?: number;
  maxScore?: number;
  createdAt: number;
}

/** Project milestone / file (/projects/{projectId}/files/{fileId}) */
export interface ProjectFile {
  id: string;
  projectId: string;
  uploadedBy: string;
  uploaderName: string;
  fileUrl: string;
  fileType: 'image' | 'pdf' | 'other';
  label?: string;
  createdAt: number;
}

// ── Timetable ──────────────────────────────────

/** Days of the week used in the timetable */
export type Weekday = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday';

/** A single timetable slot (/timetable/{entryId}) */
export interface TimetableEntry {
  id: string;
  schoolId: string;
  classId: string;
  subjectId: string;
  teacherId?: string;
  teacherName?: string;
  day: Weekday;
  /** Start time in 'HH:mm' 24h format, e.g. '08:00' */
  startTime: string;
  /** End time in 'HH:mm' 24h format, e.g. '08:40' */
  endTime: string;
  /** Room / venue (optional) */
  room?: string;
  createdAt: number;
}

// ── Fee Tracking ───────────────────────────────

export type FeeStatus = 'unpaid' | 'partial' | 'paid';

/** Fee record assigned to a student (/fees/{feeId}) */
export interface FeeRecord {
  id: string;
  schoolId: string;
  studentId: string;
  studentName: string;
  termId: string;
  /** Total amount due in UGX */
  amount: number;
  /** Total paid so far */
  amountPaid: number;
  status: FeeStatus;
  /** Description / category, e.g. 'Tuition', 'Boarding' */
  description: string;
  dueDate: number;
  createdBy: string;
  createdAt: number;
}

/** Individual payment against a fee (/fees/{feeId}/payments/{paymentId}) */
export interface FeePayment {
  id: string;
  feeId: string;
  amount: number;
  /** Payment method, e.g. 'cash', 'mobile_money', 'bank' */
  method: string;
  reference?: string;
  note?: string;
  recordedBy: string;
  recordedByName: string;
  paidAt: number;
}

// ── Announcements ──────────────────────────────

/** School-wide announcement (/announcements/{announcementId}) */
export interface Announcement {
  id: string;
  schoolId: string;
  title: string;
  body: string;
  /** Which roles can see this announcement (empty = everyone) */
  audience: UserRole[];
  /** Pin to top of feed */
  pinned?: boolean;
  createdBy: string;
  createdByName: string;
  createdAt: number;
}

// ── Downloads ──────────────────────────────────

/** Tracked offline download */
export interface OfflineDownload {
  lessonId: string;
  title: string;
  localUri: string;
  /** File size in bytes */
  sizeBytes: number;
  downloadedAt: number;
}

/** Sidebar navigation item */
export interface SidebarItem {
  label: string;
  icon: string;          // Ionicons name
  href: string;
  roles: UserRole[];     // which roles can see this item
}
