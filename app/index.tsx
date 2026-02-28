// ──────────────────────────────────────────────
// NafAcademy – Landing / Auth gate
// ──────────────────────────────────────────────
import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { COLORS } from '@/constants';

export default function Index() {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // Not authenticated → show login
  if (!profile) {
    return <Redirect href="/(auth)/login" />;
  }

  // Authenticated → main workspace
  return <Redirect href="/(main)/dashboard" />;
}
