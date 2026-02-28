// ──────────────────────────────────────────────
// NafAcademy – Image compression utility
// ──────────────────────────────────────────────
// Uses expo-image-manipulator to resize & compress
// PNG/JPG images before uploading to Firebase Storage.
// ──────────────────────────────────────────────
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { IMAGE_MAX_WIDTH, IMAGE_COMPRESS_QUALITY } from '@/constants';

export interface CompressedImage {
  uri: string;
  width: number;
  height: number;
}

/**
 * Compress and resize an image before upload.
 *
 * @param uri       - Local file URI of the original image.
 * @param maxWidth  - Maximum width in pixels (default 1024).
 * @param quality   - JPEG quality 0–1 (default 0.7).
 * @returns         - A new URI pointing to the compressed file.
 */
export async function compressImage(
  uri: string,
  maxWidth: number = IMAGE_MAX_WIDTH,
  quality: number = IMAGE_COMPRESS_QUALITY
): Promise<CompressedImage> {
  const result = await manipulateAsync(
    uri,
    [{ resize: { width: maxWidth } }],
    {
      compress: quality,
      format: SaveFormat.JPEG,
    }
  );

  return {
    uri: result.uri,
    width: result.width,
    height: result.height,
  };
}

/**
 * Compress multiple images in sequence (avoids memory spikes on 8 GB devices).
 */
export async function compressImages(
  uris: string[],
  maxWidth?: number,
  quality?: number
): Promise<CompressedImage[]> {
  const results: CompressedImage[] = [];
  for (const uri of uris) {
    results.push(await compressImage(uri, maxWidth, quality));
  }
  return results;
}

/**
 * Iteratively compress an image until it is under the given byte limit.
 * Starts at `startWidth` and reduces dimensions / quality on each pass.
 *
 * @param uri         - Local file URI.
 * @param maxBytes    - Target file size in bytes (default 500 KB = 512 000).
 * @param startWidth  - Initial resize width (default 1024).
 * @returns           - CompressedImage with a URI guaranteed ≤ maxBytes.
 */
export async function compressImageUnderSize(
  uri: string,
  maxBytes: number = 500 * 1024,
  startWidth: number = 1024
): Promise<CompressedImage> {
  let width = startWidth;
  let quality = 0.8;
  let result = await compressImage(uri, width, quality);

  // Measure file size via fetch (works on local file URIs)
  const measure = async (fileUri: string): Promise<number> => {
    const res = await fetch(fileUri);
    const blob = await res.blob();
    return blob.size;
  };

  let size = await measure(result.uri);

  // Iteratively shrink until under limit (max 6 passes to avoid infinite loop)
  let pass = 0;
  while (size > maxBytes && pass < 6) {
    pass++;
    // Reduce quality first, then width
    if (quality > 0.3) {
      quality -= 0.15;
    } else {
      width = Math.round(width * 0.75);
      quality = 0.5; // reset quality when shrinking dimensions
    }
    result = await compressImage(uri, width, Math.max(quality, 0.1));
    size = await measure(result.uri);
  }

  return result;
}
