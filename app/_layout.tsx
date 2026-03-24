// ──────────────────────────────────────────────
// Nabisunsa Girls' Secondary School – Root Layout
// ──────────────────────────────────────────────
import { useEffect, useRef } from 'react';
import { Slot, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { ensureSchoolExists } from '@/services/firestore';
import { registerForPushNotifications } from '@/services/pushNotifications';

function PushNotificationManager() {
  const { profile } = useAuth();
  const router = useRouter();
  const responseListener = useRef<Notifications.Subscription>();

  // Register for push notifications when user logs in
  useEffect(() => {
    if (profile?.uid) {
      registerForPushNotifications(profile.uid).catch(() => {});
    }
  }, [profile?.uid]);

  // Handle notification taps → navigate to linked screen
  useEffect(() => {
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        if (data?.link && typeof data.link === 'string') {
          router.push(data.link as any);
        }
      },
    );
    return () => {
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [router]);

  return null;
}

export default function RootLayout() {
  useEffect(() => {
    ensureSchoolExists().catch(() => {});
  }, []);

  return (
    <AuthProvider>
      <PushNotificationManager />
      <StatusBar style="dark" />
      <Slot />
    </AuthProvider>
  );
}
