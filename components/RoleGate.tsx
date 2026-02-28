// ──────────────────────────────────────────────
// NafAcademy – Role-gate wrapper
// ──────────────────────────────────────────────
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { COLORS } from '@/constants';
import type { UserRole } from '@/types';

interface Props {
  /** Roles allowed to view the children */
  allowed: UserRole[];
  children: React.ReactNode;
}

/**
 * Wraps a screen / section so only users with the right role can see it.
 * Shows a "Not Authorised" fallback otherwise.
 */
export default function RoleGate({ allowed, children }: Props) {
  const { profile } = useAuth();

  if (!profile || !allowed.includes(profile.role)) {
    return (
      <View style={styles.container}>
        <Text style={styles.icon}>🔒</Text>
        <Text style={styles.title}>Access Denied</Text>
        <Text style={styles.body}>
          You do not have permission to view this page.
        </Text>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 32,
  },
  icon: { fontSize: 48, marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  body: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },
});
