// ──────────────────────────────────────────────
// NafAcademy – Firebase initialisation
// ──────────────────────────────────────────────
// Replace the values below with your own Firebase project config.
// For security, move these to environment variables before production.

import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getAuth } from 'firebase/auth';
// @ts-ignore – exported from the React Native entry point at runtime
import { getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: 'AIzaSyBrZqBekiFiEyJAmHRfi9hJk7jjQ__am-w',
  authDomain: 'nafacademy.firebaseapp.com',
  projectId: 'nafacademy',
  storageBucket: 'nafacademy.firebasestorage.app',
  messagingSenderId: '157756755680',
  appId: '1:157756755680:web:265c97cc32d54e2acc0a85',
};

/** Singleton Firebase app */
const alreadyInitialised = getApps().length > 0;
const app = alreadyInitialised ? getApp() : initializeApp(firebaseConfig);

/**
 * Auth – Uses AsyncStorage-backed persistence so login
 * survives app restarts on React Native / Expo Go.
 */
export const auth = alreadyInitialised
  ? getAuth(app)
  : initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });

/** Firestore database */
export const db = getFirestore(app);

/** Firebase Storage (for images / files) */
export const storage = getStorage(app);

export default app;
