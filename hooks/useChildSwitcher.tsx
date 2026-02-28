// ──────────────────────────────────────────────
// NafAcademy – useChildSwitcher hook
// Global state for parents to switch between children
// ──────────────────────────────────────────────
import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from './useAuth';
import { getUser } from '@/services/firestore';
import type { AppUser } from '@/types';

interface ChildSwitcherValue {
  /** The currently active child's UID (null if not a parent or no children) */
  activeChildId: string | null;
  /** The active child's profile (fetched from Firestore) */
  activeChild: AppUser | null;
  /** All child IDs */
  childIds: string[];
  /** Switch to a different child */
  switchChild: (childId: string) => void;
  /** Whether the current user is a parent with multiple children */
  hasMultipleChildren: boolean;
  /** Loading state while fetching child profile */
  loadingChild: boolean;
}

const ChildSwitcherContext = createContext<ChildSwitcherValue | null>(null);

export function ChildSwitcherProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const [activeChildId, setActiveChildId] = useState<string | null>(null);
  const [activeChild, setActiveChild] = useState<AppUser | null>(null);
  const [loadingChild, setLoadingChild] = useState(false);

  const childIds = useMemo(
    () => (profile?.role === 'parent' ? profile.childIds ?? [] : []),
    [profile]
  );

  // Auto-select first child when profile loads
  useEffect(() => {
    if (childIds.length > 0 && !activeChildId) {
      setActiveChildId(childIds[0]);
    }
  }, [childIds, activeChildId]);

  // Fetch the active child's profile
  useEffect(() => {
    if (!activeChildId) {
      setActiveChild(null);
      return;
    }
    setLoadingChild(true);
    getUser(activeChildId).then((p) => {
      setActiveChild(p);
      setLoadingChild(false);
    });
  }, [activeChildId]);

  const switchChild = useCallback((childId: string) => {
    if (childIds.includes(childId)) {
      setActiveChildId(childId);
    }
  }, [childIds]);

  const value = useMemo<ChildSwitcherValue>(
    () => ({
      activeChildId,
      activeChild,
      childIds,
      switchChild,
      hasMultipleChildren: childIds.length > 1,
      loadingChild,
    }),
    [activeChildId, activeChild, childIds, switchChild, loadingChild]
  );

  return (
    <ChildSwitcherContext.Provider value={value}>
      {children}
    </ChildSwitcherContext.Provider>
  );
}

export function useChildSwitcher(): ChildSwitcherValue {
  const ctx = useContext(ChildSwitcherContext);
  if (!ctx) {
    // Return safe defaults if used outside provider (non-parent users)
    return {
      activeChildId: null,
      activeChild: null,
      childIds: [],
      switchChild: () => {},
      hasMultipleChildren: false,
      loadingChild: false,
    };
  }
  return ctx;
}
