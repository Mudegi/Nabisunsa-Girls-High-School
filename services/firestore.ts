// ──────────────────────────────────────────────
// Nabisunsa Girls' Secondary School – Firestore helpers
// ──────────────────────────────────────────────
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  increment,
  serverTimestamp,
  DocumentData,
  QueryConstraint,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import { getSecondaryApp } from './firebase';
import { getAuth, createUserWithEmailAndPassword, signOut as fbSignOut } from 'firebase/auth';
import { SCHOOL_ID, SCHOOL_NAME } from '@/constants';
import type {
  AppUser,
  School,
  Assignment,
  Mark,
  VideoLesson,
  Submission,
  Conversation,
  ChatMessage,
  AppNotification,
  Project,
  ProjectFile,
  VideoComment,
  Term,
  ClassRoom,
  Subject,
  Topic,
  Announcement,
  TimetableEntry,
  FeeRecord,
  FeePayment,
} from '@/types';

// ── Generic helpers ────────────────────────────

/** Get a single document by path */
export async function getDocument<T = DocumentData>(
  path: string,
  id: string
): Promise<T | null> {
  const snap = await getDoc(doc(db, path, id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as T) : null;
}

/** Query a collection with optional constraints */
export async function queryCollection<T = DocumentData>(
  path: string,
  ...constraints: QueryConstraint[]
): Promise<T[]> {
  const q = query(collection(db, path), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as T));
}

/** Real-time listener for a collection */
export function onCollection<T = DocumentData>(
  path: string,
  constraints: QueryConstraint[],
  callback: (items: T[]) => void
): Unsubscribe {
  const q = query(collection(db, path), ...constraints);
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as T)));
  });
}

/** Real-time listener for a single document */
export function onDocument<T = DocumentData>(
  path: string,
  id: string,
  callback: (item: T | null) => void
): Unsubscribe {
  return onSnapshot(doc(db, path, id), (snap) => {
    callback(snap.exists() ? ({ id: snap.id, ...snap.data() } as T) : null);
  });
}

// ── User helpers ───────────────────────────────

export async function getUser(uid: string): Promise<AppUser | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  return { uid, id: snap.id, ...snap.data() } as AppUser;
}

export const setUser = (uid: string, data: Omit<AppUser, 'uid'>) =>
  setDoc(doc(db, 'users', uid), { ...data, uid });

export const updateUser = (uid: string, data: Partial<AppUser>) =>
  updateDoc(doc(db, 'users', uid), data);

/** Admin creates a new user without signing out the current session */
export async function adminCreateUser(
  email: string,
  password: string,
  profile: Omit<AppUser, 'uid'>
): Promise<string> {
  const secondaryApp = getSecondaryApp();
  const secondaryAuth = getAuth(secondaryApp);
  const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
  const uid = cred.user.uid;
  await setDoc(doc(db, 'users', uid), { ...profile, uid });
  // Sign out of the secondary app so it doesn't hold a session
  await fbSignOut(secondaryAuth);
  return uid;
}

export const getUsersBySchool = (schoolId: string) =>
  queryCollection<AppUser>(
    'users',
    where('schoolId', '==', schoolId),
    orderBy('displayName')
  );

export const getUsersByRole = (schoolId: string, role: string) =>
  queryCollection<AppUser>(
    'users',
    where('schoolId', '==', schoolId),
    where('role', '==', role),
    orderBy('displayName')
  );

export const getStudentsByClass = (schoolId: string, classId: string) =>
  queryCollection<AppUser>(
    'users',
    where('schoolId', '==', schoolId),
    where('role', '==', 'student'),
    where('classId', '==', classId)
  );

/** Create student + auto-generate parent account if parent phone provided */
export async function createStudentWithParent(
  studentData: Omit<AppUser, 'uid'> & { uid: string },
  parentPhone?: string,
  parentName?: string
): Promise<void> {
  // Save the student
  await setUser(studentData.uid, studentData);

  if (parentPhone && parentName) {
    // Check if a parent with this phone already exists
    const existing = await queryCollection<AppUser>(
      'users',
      where('phone', '==', parentPhone),
      where('role', '==', 'parent'),
      limit(1)
    );

    if (existing.length > 0) {
      // Parent already exists — add this student to their childIds
      const parent = existing[0];
      const childIds = parent.childIds || [];
      if (!childIds.includes(studentData.uid)) {
        await updateUser(parent.uid, { childIds: [...childIds, studentData.uid] });
      }
    }
    // Note: For new parent creation, use Firebase Auth createUser separately
    // then call setUser with role='parent' and childIds=[studentData.uid]
  }
}

// ── School helpers ─────────────────────────────

export const getSchool = (schoolId: string) =>
  getDocument<School>('schools', schoolId);

export const updateSchool = (schoolId: string, data: Partial<School>) =>
  updateDoc(doc(db, 'schools', schoolId), data);

// ── Term / Class / Subject / Topic (school sub-collections) ──

export const getTerms = (schoolId: string) =>
  queryCollection<Term>(
    `schools/${schoolId}/terms`,
    orderBy('startDate', 'desc')
  );

export const getActiveTerm = async (schoolId: string): Promise<Term | null> => {
  const terms = await queryCollection<Term>(
    `schools/${schoolId}/terms`,
    where('active', '==', true),
    limit(1)
  );
  return terms[0] ?? null;
};

export async function createTerm(schoolId: string, data: Omit<Term, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, `schools/${schoolId}/terms`), data);
  return ref.id;
}

export const getClasses = (schoolId: string) =>
  queryCollection<ClassRoom>(
    `schools/${schoolId}/classes`,
    orderBy('name')
  );

export async function createClass(schoolId: string, data: Omit<ClassRoom, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, `schools/${schoolId}/classes`), data);
  return ref.id;
}

export const getSubjects = (schoolId: string) =>
  queryCollection<Subject>(
    `schools/${schoolId}/subjects`,
    orderBy('name')
  );

export async function createSubject(schoolId: string, data: Omit<Subject, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, `schools/${schoolId}/subjects`), data);
  return ref.id;
}

export const getTopics = (schoolId: string, subjectId: string) =>
  queryCollection<Topic>(
    `schools/${schoolId}/subjects/${subjectId}/topics`,
    orderBy('order')
  );

export async function createTopic(
  schoolId: string,
  subjectId: string,
  data: Omit<Topic, 'id'>
): Promise<string> {
  const ref = await addDoc(
    collection(db, `schools/${schoolId}/subjects/${subjectId}/topics`),
    data
  );
  return ref.id;
}

// ── Assignment helpers (scoped to school) ──────

export const getAssignmentsBySchool = (schoolId: string) =>
  queryCollection<Assignment>(
    'assignments',
    where('schoolId', '==', schoolId),
    orderBy('dueDate', 'desc'),
    limit(50)
  );

export const getAssignmentsByClass = (schoolId: string, classId: string) =>
  queryCollection<Assignment>(
    'assignments',
    where('schoolId', '==', schoolId),
    where('classId', '==', classId),
    orderBy('dueDate', 'desc')
  );

export async function createAssignment(data: Omit<Assignment, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'assignments'), data);
  return ref.id;
}

export const deleteAssignment = (id: string) =>
  deleteDoc(doc(db, 'assignments', id));

// ── Marks helpers ──────────────────────────────

export const getMarksByStudent = (studentId: string) =>
  queryCollection<Mark>(
    'marks',
    where('studentId', '==', studentId),
    orderBy('year', 'desc')
  );

export const getMarksBySubject = (schoolId: string, subjectId: string) =>
  queryCollection<Mark>(
    'marks',
    where('schoolId', '==', schoolId),
    where('subjectId', '==', subjectId)
  );

export const getMarksByStudentAndTerm = (studentId: string, termId: string) =>
  queryCollection<Mark>(
    'marks',
    where('studentId', '==', studentId),
    where('termId', '==', termId)
  );

export async function createMark(data: Omit<Mark, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'marks'), data);
  return ref.id;
}

export async function bulkCreateMarks(marks: Omit<Mark, 'id'>[]): Promise<void> {
  const promises = marks.map((m) => addDoc(collection(db, 'marks'), m));
  await Promise.all(promises);
}

export const getMarksBySubjectTermExam = (
  schoolId: string,
  subjectId: string,
  termId: string,
  examType: Mark['examType'],
) =>
  queryCollection<Mark>(
    'marks',
    where('schoolId', '==', schoolId),
    where('subjectId', '==', subjectId),
    where('termId', '==', termId),
    where('examType', '==', examType),
  );

export async function updateMark(markId: string, data: Partial<Omit<Mark, 'id'>>): Promise<void> {
  await updateDoc(doc(db, 'marks', markId), data);
}

// ── Video lesson helpers ───────────────────────

export const getVideoLesson = (lessonId: string) =>
  getDocument<VideoLesson>('videoLessons', lessonId);

export const getVideoLessonsBySchool = (schoolId: string) =>
  queryCollection<VideoLesson>(
    'videoLessons',
    where('schoolId', '==', schoolId),
    orderBy('createdAt', 'desc'),
    limit(50)
  );

export const getVideoLessonsByClass = (schoolId: string, classId: string) =>
  queryCollection<VideoLesson>(
    'videoLessons',
    where('schoolId', '==', schoolId),
    where('classId', '==', classId),
    orderBy('createdAt', 'desc')
  );

export async function createVideoLesson(data: Omit<VideoLesson, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'videoLessons'), data);
  return ref.id;
}

// ── Video Comments ─────────────────────────────

export function onVideoComments(
  lessonId: string,
  callback: (comments: VideoComment[]) => void
): Unsubscribe {
  return onCollection<VideoComment>(
    `videoLessons/${lessonId}/comments`,
    [orderBy('createdAt', 'asc')],
    callback
  );
}

export async function addVideoComment(
  lessonId: string,
  data: Omit<VideoComment, 'id'>
): Promise<string> {
  const ref = await addDoc(
    collection(db, `videoLessons/${lessonId}/comments`),
    data
  );
  // Increment comment count on the video lesson
  await updateDoc(doc(db, 'videoLessons', lessonId), {
    commentCount: increment(1),
  });
  return ref.id;
}

// ── Submission helpers ─────────────────────────

/** Create a new submission (student upload) */
export async function createSubmission(
  data: Omit<Submission, 'id'>
): Promise<string> {
  const ref = await addDoc(collection(db, 'submissions'), data);
  return ref.id;
}

/** Get a single submission */
export const getSubmission = (id: string) =>
  getDocument<Submission>('submissions', id);

/** All submissions for a specific assignment (teacher view) */
export const getSubmissionsByAssignment = (assignmentId: string) =>
  queryCollection<Submission>(
    'submissions',
    where('assignmentId', '==', assignmentId),
    orderBy('submittedAt', 'desc')
  );

/** All submissions by a single student (student view) */
export const getSubmissionsByStudent = (studentId: string) =>
  queryCollection<Submission>(
    'submissions',
    where('studentId', '==', studentId),
    orderBy('submittedAt', 'desc')
  );

/** Teacher grades a submission */
export async function gradeSubmission(
  submissionId: string,
  score: number,
  gradedBy: string
): Promise<void> {
  await updateDoc(doc(db, 'submissions', submissionId), {
    score,
    gradedBy,
    gradedAt: Date.now(),
  });
}

// ── Chat / Conversations ───────────────────────

/** Get or create a conversation between two users */
export async function getOrCreateConversation(
  user1: AppUser,
  user2: AppUser,
  schoolId: string
): Promise<string> {
  const participants = [user1.uid, user2.uid].sort();

  // Check if conversation exists
  const existing = await queryCollection<Conversation>(
    'conversations',
    where('participants', '==', participants),
    limit(1)
  );

  if (existing.length > 0) return existing[0].id;

  // Create new conversation
  const conv: Omit<Conversation, 'id'> = {
    participants,
    participantNames: {
      [user1.uid]: user1.displayName,
      [user2.uid]: user2.displayName,
    },
    participantRoles: {
      [user1.uid]: user1.role,
      [user2.uid]: user2.role,
    },
    schoolId,
    lastMessage: '',
    lastMessageAt: Date.now(),
    unreadCount: { [user1.uid]: 0, [user2.uid]: 0 },
  };

  const ref = await addDoc(collection(db, 'conversations'), conv);
  return ref.id;
}

/** Real-time listener for user's conversations */
export function onUserConversations(
  userId: string,
  callback: (convs: Conversation[]) => void
): Unsubscribe {
  return onCollection<Conversation>(
    'conversations',
    [
      where('participants', 'array-contains', userId),
      orderBy('lastMessageAt', 'desc'),
    ],
    callback
  );
}

/** Real-time listener for messages in a conversation */
export function onConversationMessages(
  conversationId: string,
  callback: (msgs: ChatMessage[]) => void
): Unsubscribe {
  return onCollection<ChatMessage>(
    `conversations/${conversationId}/messages`,
    [orderBy('createdAt', 'asc')],
    callback
  );
}

/** Send a chat message */
export async function sendMessage(
  conversationId: string,
  message: Omit<ChatMessage, 'id'>,
  recipientId: string
): Promise<string> {
  const ref = await addDoc(
    collection(db, `conversations/${conversationId}/messages`),
    message
  );

  // Update conversation metadata
  await updateDoc(doc(db, 'conversations', conversationId), {
    lastMessage: message.text || (message.mediaType ? `[${message.mediaType}]` : ''),
    lastMessageAt: message.createdAt,
    [`unreadCount.${recipientId}`]: increment(1),
  });

  return ref.id;
}

/** Mark all messages in a conversation as read for the user */
export async function markConversationRead(
  conversationId: string,
  userId: string
): Promise<void> {
  await updateDoc(doc(db, 'conversations', conversationId), {
    [`unreadCount.${userId}`]: 0,
  });
}

// ── Notifications ──────────────────────────────

/** Real-time listener for user's notifications */
export function onUserNotifications(
  userId: string,
  callback: (notifs: AppNotification[]) => void
): Unsubscribe {
  return onCollection<AppNotification>(
    'notifications',
    [
      where('recipientId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(50),
    ],
    callback
  );
}

/** Create a notification */
export async function createNotification(
  data: Omit<AppNotification, 'id'>
): Promise<string> {
  const ref = await addDoc(collection(db, 'notifications'), data);
  return ref.id;
}

/** Mark a notification as read */
export async function markNotificationRead(id: string): Promise<void> {
  await updateDoc(doc(db, 'notifications', id), { read: true });
}

/** Mark all notifications as read for a user */
export async function markAllNotificationsRead(userId: string): Promise<void> {
  const unread = await queryCollection<AppNotification>(
    'notifications',
    where('recipientId', '==', userId),
    where('read', '==', false)
  );
  const promises = unread.map((n) =>
    updateDoc(doc(db, 'notifications', n.id), { read: true })
  );
  await Promise.all(promises);
}

// ── Projects ───────────────────────────────────

export const getProjectsBySchool = (schoolId: string) =>
  queryCollection<Project>(
    'projects',
    where('schoolId', '==', schoolId),
    orderBy('dueDate', 'desc')
  );

export const getProjectsByStudent = (studentId: string) =>
  queryCollection<Project>(
    'projects',
    where('studentIds', 'array-contains', studentId),
    orderBy('dueDate', 'desc')
  );

export const getProjectsByTeacher = (teacherId: string) =>
  queryCollection<Project>(
    'projects',
    where('teacherId', '==', teacherId),
    orderBy('dueDate', 'desc')
  );

export async function createProject(data: Omit<Project, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'projects'), data);
  return ref.id;
}

export const updateProject = (id: string, data: Partial<Project>) =>
  updateDoc(doc(db, 'projects', id), data);

export const getProjectFiles = (projectId: string) =>
  queryCollection<ProjectFile>(
    `projects/${projectId}/files`,
    orderBy('createdAt', 'desc')
  );

export async function addProjectFile(
  projectId: string,
  data: Omit<ProjectFile, 'id'>
): Promise<string> {
  const ref = await addDoc(
    collection(db, `projects/${projectId}/files`),
    data
  );
  return ref.id;
}

// ── Timetable ──────────────────────────────────

export const getTimetableByClass = (schoolId: string, classId: string) =>
  queryCollection<TimetableEntry>(
    'timetable',
    where('schoolId', '==', schoolId),
    where('classId', '==', classId),
    orderBy('day'),
    orderBy('startTime')
  );

export async function createTimetableEntry(
  data: Omit<TimetableEntry, 'id'>
): Promise<string> {
  const ref = await addDoc(collection(db, 'timetable'), data);
  return ref.id;
}

export async function deleteTimetableEntry(id: string): Promise<void> {
  await deleteDoc(doc(db, 'timetable', id));
}

// ── Fee Tracking ───────────────────────────────

export const getFeesByStudent = (studentId: string) =>
  queryCollection<FeeRecord>(
    'fees',
    where('studentId', '==', studentId),
    orderBy('createdAt', 'desc')
  );

export const getFeesBySchool = (schoolId: string) =>
  queryCollection<FeeRecord>(
    'fees',
    where('schoolId', '==', schoolId),
    orderBy('createdAt', 'desc')
  );

export const getFeesBySchoolAndTerm = (schoolId: string, termId: string) =>
  queryCollection<FeeRecord>(
    'fees',
    where('schoolId', '==', schoolId),
    where('termId', '==', termId),
    orderBy('createdAt', 'desc')
  );

export async function createFeeRecord(
  data: Omit<FeeRecord, 'id'>
): Promise<string> {
  const ref = await addDoc(collection(db, 'fees'), data);
  return ref.id;
}

export async function updateFeeRecord(
  id: string,
  data: Partial<FeeRecord>
): Promise<void> {
  await updateDoc(doc(db, 'fees', id), data);
}

export async function addFeePayment(
  feeId: string,
  data: Omit<FeePayment, 'id'>,
  newAmountPaid: number,
  newStatus: FeeRecord['status']
): Promise<string> {
  const ref = await addDoc(collection(db, `fees/${feeId}/payments`), data);
  await updateDoc(doc(db, 'fees', feeId), {
    amountPaid: newAmountPaid,
    status: newStatus,
  });
  return ref.id;
}

export const getFeePayments = (feeId: string) =>
  queryCollection<FeePayment>(
    `fees/${feeId}/payments`,
    orderBy('paidAt', 'desc')
  );

// ── Announcements ──────────────────────────────

/** Real-time listener for announcements (newest first) */
export function onAnnouncements(
  schoolId: string,
  cb: (items: Announcement[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'announcements'),
    where('schoolId', '==', schoolId),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Announcement)));
  });
}

export async function createAnnouncement(
  data: Omit<Announcement, 'id'>
): Promise<string> {
  const ref = await addDoc(collection(db, 'announcements'), data);
  return ref.id;
}

export async function deleteAnnouncement(id: string): Promise<void> {
  await deleteDoc(doc(db, 'announcements', id));
}

// ── School bootstrap ───────────────────────────

/** Ensure the single school doc exists in Firestore */
export async function ensureSchoolExists(): Promise<void> {
  const snap = await getDoc(doc(db, 'schools', SCHOOL_ID));
  if (!snap.exists()) {
    await setDoc(doc(db, 'schools', SCHOOL_ID), {
      name: SCHOOL_NAME,
      curriculum: 'A-Level',
      subjects: [],
      active: true,
      createdAt: Date.now(),
    });
  }
}
