// ──────────────────────────────────────────────
// NafAcademy – Push Notification Service
// ──────────────────────────────────────────────
// Registers for push tokens, listens for incoming
// notifications, and sends via Expo Push API.
// ──────────────────────────────────────────────
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { updateUser, getUsersByRole, getUsersBySchool, createNotification } from './firestore';
import { SCHOOL_ID } from '@/constants';
import type { AppNotification, UserRole } from '@/types';

// ── Configure notification behaviour ───────────

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ── Push token registration ────────────────────

/** Request permission & get the Expo push token, save it to Firestore */
export async function registerForPushNotifications(uid: string): Promise<string | null> {
  if (!Device.isDevice) {
    // Push notifications don't work on emulators/simulators
    return null;
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  // Android notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1A73E8',
    });
  }

  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: 'e274f660-fd88-4fab-a63e-946e0994c8d3',
  });

  const token = tokenData.data;

  // Save token to user's Firestore document
  await updateUser(uid, { pushToken: token });

  return token;
}

// ── Send push notifications ────────────────────

interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
}

/** Send push notifications via Expo Push API */
async function sendExpoPush(messages: PushMessage[]): Promise<void> {
  if (messages.length === 0) return;

  // Expo Push API accepts batches of up to 100
  const chunks: PushMessage[][] = [];
  for (let i = 0; i < messages.length; i += 100) {
    chunks.push(messages.slice(i, i + 100));
  }

  for (const chunk of chunks) {
    try {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(chunk),
      });
    } catch {
      // Silent fail — push is best-effort
    }
  }
}

// ── High-level notification helpers ────────────

/** Notify specific users by their push tokens + create in-app notification */
export async function notifyUsers(
  recipientIds: string[],
  pushTokens: string[],
  notification: {
    title: string;
    body: string;
    type: AppNotification['type'];
    link?: string;
    refId?: string;
  },
): Promise<void> {
  // 1. Create in-app notifications in Firestore
  const inAppPromises = recipientIds.map((rid) =>
    createNotification({
      recipientId: rid,
      schoolId: SCHOOL_ID,
      title: notification.title,
      body: notification.body,
      type: notification.type,
      link: notification.link,
      refId: notification.refId,
      read: false,
      createdAt: Date.now(),
    }),
  );

  // 2. Send push notifications
  const pushMessages: PushMessage[] = pushTokens
    .filter((t) => t && t.startsWith('ExponentPushToken'))
    .map((token) => ({
      to: token,
      title: notification.title,
      body: notification.body,
      sound: 'default' as const,
      data: {
        type: notification.type,
        link: notification.link,
        refId: notification.refId,
      },
    }));

  await Promise.all([
    ...inAppPromises,
    sendExpoPush(pushMessages),
  ]);
}

/** Notify all users with specific roles (e.g. all students, all parents) */
export async function notifyByRoles(
  roles: UserRole[],
  notification: {
    title: string;
    body: string;
    type: AppNotification['type'];
    link?: string;
    refId?: string;
  },
): Promise<void> {
  const userPromises = roles.map((r) => getUsersByRole(SCHOOL_ID, r));
  const userArrays = await Promise.all(userPromises);
  const allUsers = userArrays.flat();

  const recipientIds = allUsers.map((u) => u.uid);
  const pushTokens = allUsers.map((u) => u.pushToken).filter(Boolean) as string[];

  await notifyUsers(recipientIds, pushTokens, notification);
}

/** Notify all users in the school */
export async function notifyAllUsers(
  notification: {
    title: string;
    body: string;
    type: AppNotification['type'];
    link?: string;
    refId?: string;
  },
): Promise<void> {
  const allUsers = await getUsersBySchool(SCHOOL_ID);
  const recipientIds = allUsers.map((u) => u.uid);
  const pushTokens = allUsers.map((u) => u.pushToken).filter(Boolean) as string[];
  await notifyUsers(recipientIds, pushTokens, notification);
}
