// ──────────────────────────────────────────────
// NafAcademy – Upload Assignment (Student)
// ──────────────────────────────────────────────
// Students pick an image via expo-image-picker,
// it's auto-compressed to < 500 KB via
// compressImageUnderSize, then uploaded to
// Firebase Storage and a Submission doc is created.
// ──────────────────────────────────────────────
import { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/services/firebase';
import { createSubmission } from '@/services/firestore';
import { compressImageUnderSize } from '@/utils/imageCompressor';
import { useAuth } from '@/hooks/useAuth';
import { COLORS } from '@/constants';
import type { Assignment } from '@/types';

interface Props {
  assignment: Assignment;
  onComplete: () => void;
}

export default function UploadAssignment({ assignment, onComplete }: Props) {
  const { profile } = useAuth();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState('');

  // ── Pick image ──
  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photo library.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets.length > 0) {
      setImageUri(result.assets[0].uri);
    }
  };

  // ── Take photo with camera ──
  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission Required', 'Please allow camera access.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 1,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets.length > 0) {
      setImageUri(result.assets[0].uri);
    }
  };

  // ── Compress + upload ──
  const handleSubmit = async () => {
    if (!imageUri || !profile) return;

    setUploading(true);
    try {
      // 1. Compress to under 500 KB
      setStatus('Compressing image…');
      const compressed = await compressImageUnderSize(imageUri, 500 * 1024);

      // 2. Upload to Firebase Storage
      setStatus('Uploading…');
      const storagePath = `submissions/${assignment.schoolId}/${assignment.id}/${profile.uid}_${Date.now()}.jpg`;
      const response = await fetch(compressed.uri);
      const blob = await response.blob();
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, blob);
      const downloadUrl = await getDownloadURL(storageRef);

      // 3. Create Firestore submission doc
      setStatus('Saving submission…');
      await createSubmission({
        assignmentId: assignment.id,
        studentId: profile.uid,
        studentName: profile.displayName,
        schoolId: assignment.schoolId,
        fileUrl: downloadUrl,
        fileType: 'image',
        score: null,
        maxScore: 100,
        gradedBy: null,
        gradedAt: null,
        submittedAt: Date.now(),
      });

      Alert.alert('Success', 'Your assignment has been submitted!');
      onComplete();
    } catch (err: any) {
      Alert.alert('Upload Failed', err.message ?? 'Please try again.');
    } finally {
      setUploading(false);
      setStatus('');
    }
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Submit: {assignment.title}</Text>
      <Text style={styles.subtitle}>
        {assignment.subjectId} &bull; Due{' '}
        {new Date(assignment.dueDate).toLocaleDateString()}
      </Text>

      {/* ── Image preview ── */}
      {imageUri ? (
        <View style={styles.previewWrapper}>
          <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="contain" />
          <TouchableOpacity
            style={styles.removeBtn}
            onPress={() => setImageUri(null)}
          >
            <Ionicons name="close-circle" size={28} color={COLORS.error} />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.placeholder}>
          <Ionicons name="image-outline" size={64} color={COLORS.border} />
          <Text style={styles.placeholderText}>
            Pick or capture your assignment
          </Text>
        </View>
      )}

      {/* ── Picker buttons ── */}
      <View style={styles.pickerRow}>
        <TouchableOpacity style={styles.pickerBtn} onPress={pickImage}>
          <Ionicons name="images-outline" size={22} color={COLORS.primary} />
          <Text style={styles.pickerBtnText}>Gallery</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.pickerBtn} onPress={takePhoto}>
          <Ionicons name="camera-outline" size={22} color={COLORS.primary} />
          <Text style={styles.pickerBtnText}>Camera</Text>
        </TouchableOpacity>
      </View>

      {/* ── Submit button ── */}
      <TouchableOpacity
        style={[
          styles.submitBtn,
          (!imageUri || uploading) && styles.submitBtnDisabled,
        ]}
        onPress={handleSubmit}
        disabled={!imageUri || uploading}
        activeOpacity={0.8}
      >
        {uploading ? (
          <View style={styles.uploadingRow}>
            <ActivityIndicator color="#fff" size="small" />
            <Text style={styles.submitBtnText}>{status}</Text>
          </View>
        ) : (
          <Text style={styles.submitBtnText}>Submit Assignment</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.hint}>
        Images are automatically compressed to under 500 KB before upload.
      </Text>
    </ScrollView>
  );
}

// ── Styles ─────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  subtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4, marginBottom: 20 },

  previewWrapper: { position: 'relative', marginBottom: 16 },
  preview: {
    width: '100%',
    height: 280,
    borderRadius: 12,
    backgroundColor: '#000',
  },
  removeBtn: { position: 'absolute', top: 8, right: 8 },

  placeholder: {
    height: 200,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    marginBottom: 16,
  },
  placeholderText: { marginTop: 8, color: COLORS.textSecondary, fontSize: 14 },

  pickerRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  pickerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.surface,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pickerBtnText: { fontSize: 15, fontWeight: '500', color: COLORS.primary },

  submitBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  uploadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },

  hint: {
    marginTop: 12,
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
