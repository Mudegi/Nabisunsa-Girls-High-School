// ──────────────────────────────────────────────
// Nabisunsa Girls HS – Root Layout
// ──────────────────────────────────────────────
import { useEffect } from 'react';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '@/hooks/useAuth';
import { ensureSchoolExists } from '@/services/firestore';

export default function RootLayout() {
  useEffect(() => {
    ensureSchoolExists().catch(() => {});
  }, []);

  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Slot />
    </AuthProvider>
  );
}
