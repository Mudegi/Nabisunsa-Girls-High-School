// ──────────────────────────────────────────────
// NafAcademy – Registration Screen
// ──────────────────────────────────────────────
// Supports Admin (creates school), Teacher,
// Student, and Parent registration.
// ──────────────────────────────────────────────
import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { COLORS } from '@/constants';
import type { UserRole } from '@/types';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/services/firebase';

const ROLES: { value: UserRole; label: string; icon: string; desc: string }[] = [
  { value: 'admin', label: 'Admin', icon: 'shield-checkmark', desc: 'Create & manage a school' },
  { value: 'teacher', label: 'Teacher', icon: 'school', desc: 'Join an existing school' },
  { value: 'student', label: 'Student', icon: 'person', desc: 'Join your school class' },
  { value: 'parent', label: 'Parent', icon: 'people', desc: 'Track your children' },
];

export default function RegisterScreen() {
  const { register, loading } = useAuth();
  const router = useRouter();

  // Step 1: role selection, Step 2: details
  const [step, setStep] = useState<1 | 2>(1);
  const [role, setRole] = useState<UserRole>('student');

  // Form fields
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [schoolId, setSchoolId] = useState('');
  // Admin-only: new school name
  const [schoolName, setSchoolName] = useState('');
  const [curriculum, setCurriculum] = useState<'CBC' | 'IGCSE' | '8-4-4' | 'A-Level'>('A-Level');

  const handleRegister = async () => {
    if (!displayName.trim() || !email.trim() || !password) {
      Alert.alert('Validation', 'Please fill in all required fields.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Validation', 'Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Validation', 'Passwords do not match.');
      return;
    }

    try {
      let finalSchoolId = schoolId.trim();

      // Admin creates a new school
      if (role === 'admin') {
        if (!schoolName.trim()) {
          Alert.alert('Validation', 'Please enter a school name.');
          return;
        }
        const schoolRef = await addDoc(collection(db, 'schools'), {
          name: schoolName.trim(),
          curriculum,
          subjects: [],
          active: true,
          createdAt: Date.now(),
        });
        finalSchoolId = schoolRef.id;
      } else if (!finalSchoolId) {
        Alert.alert('Validation', 'Please enter your School ID (get this from your admin).');
        return;
      }

      await register(email.trim(), password, displayName.trim(), role, finalSchoolId);
      router.replace('/(main)/dashboard');
    } catch (err: any) {
      Alert.alert('Registration Failed', err.message ?? 'Something went wrong.');
    }
  };

  // ── Step 1: Role selection ──
  if (step === 1) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>NafAcademy</Text>
          <Text style={styles.subtitle}>Choose your role</Text>

          {ROLES.map((r) => (
            <TouchableOpacity
              key={r.value}
              style={[styles.roleCard, role === r.value && styles.roleCardActive]}
              onPress={() => setRole(r.value)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={r.icon as any}
                size={24}
                color={role === r.value ? COLORS.primary : COLORS.textSecondary}
              />
              <View style={styles.roleInfo}>
                <Text
                  style={[styles.roleLabel, role === r.value && { color: COLORS.primary }]}
                >
                  {r.label}
                </Text>
                <Text style={styles.roleDesc}>{r.desc}</Text>
              </View>
              {role === r.value && (
                <Ionicons name="checkmark-circle" size={22} color={COLORS.primary} />
              )}
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={styles.btn} onPress={() => setStep(2)} activeOpacity={0.8}>
            <Text style={styles.btnText}>Continue</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.back()} style={styles.linkRow}>
            <Text style={styles.linkText}>Already have an account? Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Step 2: Details form ──
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <TouchableOpacity onPress={() => setStep(1)} style={styles.backRow}>
            <Ionicons name="arrow-back" size={20} color={COLORS.primary} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          <Text style={styles.title}>NafAcademy</Text>
          <Text style={styles.subtitle}>
            Register as {role.charAt(0).toUpperCase() + role.slice(1)}
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Full Name"
            placeholderTextColor={COLORS.textSecondary}
            value={displayName}
            onChangeText={setDisplayName}
          />
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={COLORS.textSecondary}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="Password (min 6 chars)"
            placeholderTextColor={COLORS.textSecondary}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <TextInput
            style={styles.input}
            placeholder="Confirm Password"
            placeholderTextColor={COLORS.textSecondary}
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />

          {/* Admin creates a school */}
          {role === 'admin' && (
            <>
              <Text style={styles.sectionLabel}>Create Your School</Text>
              <TextInput
                style={styles.input}
                placeholder="School Name"
                placeholderTextColor={COLORS.textSecondary}
                value={schoolName}
                onChangeText={setSchoolName}
              />
              <Text style={styles.fieldLabel}>Curriculum</Text>
              <View style={styles.curriculumRow}>
                {(['A-Level', '8-4-4', 'CBC', 'IGCSE'] as const).map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.currPill, curriculum === c && styles.currPillActive]}
                    onPress={() => setCurriculum(c)}
                  >
                    <Text
                      style={[
                        styles.currPillText,
                        curriculum === c && styles.currPillTextActive,
                      ]}
                    >
                      {c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* Non-admin joins a school */}
          {role !== 'admin' && (
            <>
              <Text style={styles.sectionLabel}>Join a School</Text>
              <TextInput
                style={styles.input}
                placeholder="School ID (get from your admin)"
                placeholderTextColor={COLORS.textSecondary}
                autoCapitalize="none"
                value={schoolId}
                onChangeText={setSchoolId}
              />
            </>
          )}

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Create Account</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/(auth)/login')} style={styles.linkRow}>
            <Text style={styles.linkText}>Already have an account? Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 },
  backText: { color: COLORS.primary, fontWeight: '600' },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.primary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    marginTop: 4,
  },
  // Role cards
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    marginBottom: 10,
    gap: 12,
  },
  roleCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '08',
  },
  roleInfo: { flex: 1 },
  roleLabel: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  roleDesc: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  // Form
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 8,
    marginBottom: 10,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  curriculumRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  currPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  currPillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  currPillText: { fontSize: 13, fontWeight: '500', color: COLORS.textSecondary },
  currPillTextActive: { color: '#fff' },
  btn: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  linkRow: { alignItems: 'center', marginTop: 16 },
  linkText: { color: COLORS.primary, fontSize: 14 },
});
