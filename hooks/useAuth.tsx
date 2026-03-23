// ──────────────────────────────────────────────
// Nabisunsa Girls HS – useAuth hook (RBAC)
// ──────────────────────────────────────────────
import { useEffect, useState, useCallback, useMemo, createContext, useContext } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  createUserWithEmailAndPassword,
  User,
} from 'firebase/auth';
import { auth } from '@/services/firebase';
import { getUser, setUser } from '@/services/firestore';
import { SCHOOL_ID } from '@/constants';
import type { AppUser, UserRole } from '@/types';

// ── Context ────────────────────────────────────

interface AuthContextValue {
  /** Firebase user object (null while loading / logged-out) */
  firebaseUser: User | null;
  /** Full app profile from Firestore */
  profile: AppUser | null;
  /** True while we're resolving the initial auth state */
  loading: boolean;
  /** Sign in with email + password */
  signIn: (email: string, password: string) => Promise<void>;
  /** Register a new user and write their profile */
  register: (
    email: string,
    password: string,
    displayName: string,
    role: UserRole,
    childIds?: string[]
  ) => Promise<void>;
  /** Sign out and clear state */
  signOut: () => Promise<void>;
  /** Check if the current user has one of the given roles */
  hasRole: (...roles: UserRole[]) => boolean;
  /** Convenience: the school ID (always Nabisunsa) */
  schoolId: string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider (wrap in _layout) ─────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        const p = await getUser(user.uid);
        setProfile(p);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  // ── Auth actions ──

  const signIn = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const p = await getUser(cred.user.uid);
      setProfile(p);
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(
    async (
      email: string,
      password: string,
      displayName: string,
      role: UserRole,
      childIds?: string[]
    ) => {
      setLoading(true);
      try {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        const newProfile: Omit<AppUser, 'uid'> = {
          email,
          displayName,
          role,
          schoolId: SCHOOL_ID,
          createdAt: Date.now(),
          ...(role === 'parent' && childIds ? { childIds } : {}),
        };
        await setUser(cred.user.uid, newProfile);
        setProfile({ uid: cred.user.uid, ...newProfile });
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const signOut = useCallback(async () => {
    await fbSignOut(auth);
    setProfile(null);
  }, []);

  // ── RBAC helper ──

  const hasRole = useCallback(
    (...roles: UserRole[]) => {
      if (!profile) return false;
      return roles.includes(profile.role);
    },
    [profile]
  );

  const schoolId = SCHOOL_ID;

  const value = useMemo<AuthContextValue>(
    () => ({
      firebaseUser,
      profile,
      loading,
      signIn,
      register,
      signOut,
      hasRole,
      schoolId,
    }),
    [firebaseUser, profile, loading, signIn, register, signOut, hasRole, schoolId]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ── Consumer hook ──────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
}
