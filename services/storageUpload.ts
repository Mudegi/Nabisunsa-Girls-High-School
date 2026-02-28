// ──────────────────────────────────────────────
// NafAcademy – Firebase Storage upload helper
// ──────────────────────────────────────────────
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';
import { compressImage } from '@/utils/imageCompressor';

/**
 * Upload an image to Firebase Storage.
 * Automatically compresses before upload to save bandwidth / cost.
 *
 * @param localUri    - Local file URI (from camera / picker).
 * @param storagePath - Firebase Storage path, e.g. `schools/{id}/photos/pic.jpg`.
 * @returns           - The public download URL.
 */
export async function uploadImage(
  localUri: string,
  storagePath: string
): Promise<string> {
  // 1. Compress
  const compressed = await compressImage(localUri);

  // 2. Fetch blob
  const response = await fetch(compressed.uri);
  const blob = await response.blob();

  // 3. Upload
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, blob);

  // 4. Return download URL
  return getDownloadURL(storageRef);
}
