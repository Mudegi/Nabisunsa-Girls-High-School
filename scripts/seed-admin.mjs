/**
 * seed-admin.mjs – Create an admin account for testing.
 *
 * Usage:
 *   node scripts/seed-admin.mjs
 *
 * It will create a Firebase Auth user + Firestore profile with role "admin".
 * Credentials:
 *   Email:    admin@nabisunsa.app
 *   Password: Admin@2026
 */
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyBrZqBekiFiEyJAmHRfi9hJk7jjQ__am-w',
  authDomain: 'nafacademy.firebaseapp.com',
  projectId: 'nafacademy',
  storageBucket: 'nafacademy.firebasestorage.app',
  messagingSenderId: '157756755680',
  appId: '1:157756755680:web:265c97cc32d54e2acc0a85',
};

const EMAIL = 'admin@nabisunsa.app';
const PASSWORD = 'Admin@2026';
const DISPLAY = 'System Admin';
const SCHOOL_ID = 'nabisunsa';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function main() {
  let uid;

  // Try creating the user; if it already exists, sign in instead
  try {
    const cred = await createUserWithEmailAndPassword(auth, EMAIL, PASSWORD);
    uid = cred.user.uid;
    console.log('✔ Created auth user:', uid);
  } catch (err) {
    if (err.code === 'auth/email-already-in-use') {
      console.log('ℹ Auth user already exists – signing in…');
      const cred = await signInWithEmailAndPassword(auth, EMAIL, PASSWORD);
      uid = cred.user.uid;
    } else {
      throw err;
    }
  }

  // Write / overwrite the Firestore profile
  const ref = doc(db, 'users', uid);
  const existing = await getDoc(ref);
  if (existing.exists()) {
    console.log('ℹ Firestore profile already exists – skipping write.');
  } else {
    await setDoc(ref, {
      email: EMAIL,
      displayName: DISPLAY,
      role: 'admin',
      schoolId: SCHOOL_ID,
      createdAt: Date.now(),
    });
    console.log('✔ Firestore profile written.');
  }

  // Also ensure the school doc exists
  const schoolRef = doc(db, 'schools', SCHOOL_ID);
  const schoolSnap = await getDoc(schoolRef);
  if (!schoolSnap.exists()) {
    await setDoc(schoolRef, {
      name: "Nabisunsa Girls' Secondary School",
      curriculum: 'East African',
      createdAt: Date.now(),
    });
    console.log('✔ School document created.');
  }

  console.log('\n🎉 Admin account ready!');
  console.log('   Email:   ', EMAIL);
  console.log('   Password:', PASSWORD);
  process.exit(0);
}

main().catch((err) => {
  console.error('✖ Seed failed:', err.message);
  process.exit(1);
});
