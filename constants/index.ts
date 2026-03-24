// ──────────────────────────────────────────────
// Nabisunsa Girls' Secondary School – App-wide constants
// ──────────────────────────────────────────────
import { SidebarItem } from '@/types';

/** Hard-coded single-school identity */
export const SCHOOL_ID = 'nabisunsa';
export const SCHOOL_NAME = "Nabisunsa Girls' Secondary School";

/** Brand colours */
export const COLORS = {
  primary: '#1A73E8',
  primaryDark: '#0D47A1',
  accent: '#FF9800',
  background: '#F5F7FA',
  surface: '#FFFFFF',
  text: '#212121',
  textSecondary: '#757575',
  border: '#E0E0E0',
  success: '#4CAF50',
  error: '#F44336',
  warning: '#FFC107',
} as const;

/** East-African grading scale (Uganda / Kenya / Tanzania) */
export const EA_GRADE_SCALE = [
  { min: 80, grade: 'A', points: 1, label: 'Distinction' },
  { min: 70, grade: 'B', points: 2, label: 'Credit' },
  { min: 60, grade: 'C', points: 3, label: 'Credit' },
  { min: 50, grade: 'D', points: 4, label: 'Pass' },
  { min: 40, grade: 'E', points: 5, label: 'Pass' },
  { min: 30, grade: 'O', points: 6, label: 'Subsidiary' },
  { min: 0,  grade: 'F', points: 7, label: 'Failure' },
] as const;

/** Items shown in the sidebar – filtered by role at render time */
export const SIDEBAR_ITEMS: SidebarItem[] = [
  { label: 'Dashboard',     icon: 'home-outline',           href: '/(main)/dashboard',     roles: ['admin', 'teacher', 'student', 'parent'] },
  { label: 'Announcements', icon: 'megaphone-outline',      href: '/(main)/announcements', roles: ['admin', 'teacher', 'student', 'parent'] },
  { label: 'Classroom',     icon: 'videocam-outline',       href: '/(main)/videos',        roles: ['admin', 'teacher', 'student'] },
  { label: 'Assignments',   icon: 'document-text-outline',  href: '/(main)/assignments',   roles: ['admin', 'teacher', 'student'] },
  { label: 'Performance',   icon: 'stats-chart-outline',    href: '/(main)/marks',         roles: ['admin', 'teacher', 'student', 'parent'] },
  { label: 'Bulk Marks',     icon: 'create-outline',         href: '/(main)/bulk-marks',    roles: ['admin', 'teacher'] },
  { label: 'Report Card',   icon: 'document-text-outline',  href: '/(main)/report-card',   roles: ['admin', 'teacher', 'student', 'parent'] },
  { label: 'Timetable',     icon: 'calendar-outline',       href: '/(main)/timetable',     roles: ['admin', 'teacher', 'student', 'parent'] },
  { label: 'Career Path',   icon: 'rocket-outline',         href: '/(main)/career',        roles: ['student', 'parent'] },
  { label: 'Chat',          icon: 'chatbubbles-outline',    href: '/(main)/chat',          roles: ['admin', 'teacher', 'student', 'parent'] },
  { label: 'Projects',      icon: 'folder-open-outline',    href: '/(main)/projects',      roles: ['admin', 'teacher', 'student'] },
  { label: 'Notifications', icon: 'notifications-outline',  href: '/(main)/notifications', roles: ['admin', 'teacher', 'student', 'parent'] },
  { label: 'Fees',          icon: 'wallet-outline',         href: '/(main)/fees',          roles: ['admin', 'student', 'parent'] },
  { label: 'Downloads',     icon: 'download-outline',       href: '/(main)/downloads',     roles: ['student'] },
  { label: 'Students',      icon: 'people-outline',         href: '/(main)/students',      roles: ['admin', 'teacher'] },
  { label: 'Settings',      icon: 'settings-outline',       href: '/(main)/settings',      roles: ['admin'] },
];

/** Max image dimensions before upload (pixels) */
export const IMAGE_MAX_WIDTH = 1024;
export const IMAGE_COMPRESS_QUALITY = 0.7;
