// ──────────────────────────────────────────────
// NafAcademy – VideoWorkspace
// ──────────────────────────────────────────────
// Streams a Google Drive video via expo-video,
// shows associated notes from Firestore, and
// offers an offline download via expo-file-system.
// ──────────────────────────────────────────────
import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Linking,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import { getVideoLesson } from '@/services/firestore';
import { COLORS } from '@/constants';
import VideoComments from './VideoComments';
import type { VideoLesson, VideoNote } from '@/types';

// ── Google Drive URL helpers ───────────────────

/**
 * Build a direct-stream URL from a Google Drive file ID.
 * Uses the `export=download` endpoint which Google redirects
 * to the actual media stream – works with the native player.
 */
function driveStreamUrl(fileId: string): string {
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

/** Local path where a downloaded video is stored */
function localVideoPath(fileId: string): string {
  return `${FileSystem.documentDirectory}videos/${fileId}.mp4`;
}

// ── Component ──────────────────────────────────

interface Props {
  /** Firestore document ID for the video lesson */
  lessonId: string;
}

type DownloadStatus = 'idle' | 'checking' | 'downloading' | 'downloaded';

export default function VideoWorkspace({ lessonId }: Props) {
  // ── State ──
  const [lesson, setLesson] = useState<VideoLesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadStatus, setDownloadStatus] = useState<DownloadStatus>('checking');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [videoUri, setVideoUri] = useState<string | null>(null);

  // ── Fetch lesson metadata from Firestore ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getVideoLesson(lessonId);
        if (!cancelled && data) {
          setLesson(data);

          // Determine video source: local file or remote stream
          const localPath = localVideoPath(data.driveFileId);
          const info = await FileSystem.getInfoAsync(localPath);
          if (info.exists) {
            setVideoUri(localPath);
            setDownloadStatus('downloaded');
          } else {
            setVideoUri(driveStreamUrl(data.driveFileId));
            setDownloadStatus('idle');
          }
        }
      } catch (err) {
        console.warn('Failed to load lesson:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [lessonId]);

  // ── Video player (expo-video) ──
  const player = useVideoPlayer(videoUri ?? '', (p) => {
    p.loop = false;
  });

  // ── Download ref for resumable download ──
  const downloadResumable = useRef<FileSystem.DownloadResumable | null>(null);

  // ── Download handler ──
  const handleDownload = useCallback(async () => {
    if (!lesson) return;

    const videosDir = `${FileSystem.documentDirectory}videos/`;
    const dirInfo = await FileSystem.getInfoAsync(videosDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(videosDir, { intermediates: true });
    }

    const remoteUrl = driveStreamUrl(lesson.driveFileId);
    const destPath = localVideoPath(lesson.driveFileId);

    setDownloadStatus('downloading');
    setDownloadProgress(0);

    try {
      downloadResumable.current = FileSystem.createDownloadResumable(
        remoteUrl,
        destPath,
        {},
        (progress) => {
          const pct = progress.totalBytesWritten / progress.totalBytesExpectedToWrite;
          setDownloadProgress(pct);
        }
      );
      const result = await downloadResumable.current.downloadAsync();
      if (result?.uri) {
        setVideoUri(result.uri);
        setDownloadStatus('downloaded');
        Alert.alert('Download Complete', 'Video saved for offline playback.');
      }
    } catch (err: any) {
      Alert.alert('Download Failed', err?.message ?? 'Please try again.');
      setDownloadStatus('idle');
    }
  }, [lesson]);

  // ── Delete local copy ──
  const handleDeleteLocal = useCallback(async () => {
    if (!lesson) return;
    const filePath = localVideoPath(lesson.driveFileId);
    const info = await FileSystem.getInfoAsync(filePath);
    if (info.exists) {
      await FileSystem.deleteAsync(filePath, { idempotent: true });
    }
    setVideoUri(driveStreamUrl(lesson.driveFileId));
    setDownloadStatus('idle');
  }, [lesson]);

  // ── Open a note link ──
  const openNote = (note: VideoNote) => {
    Linking.openURL(note.url).catch(() =>
      Alert.alert('Error', 'Could not open this note.')
    );
  };

  // ── Loading state ──
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!lesson || !videoUri) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={48} color={COLORS.textSecondary} />
        <Text style={styles.emptyText}>Lesson not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      {/* ── Video Player ──────────────────────── */}
      <View style={styles.playerWrapper}>
        <VideoView
          player={player}
          style={styles.player}
        />
      </View>

      {/* ── Title & meta ──────────────────────── */}
      <Text style={styles.title}>{lesson.title}</Text>
      <Text style={styles.meta}>
        {lesson.subjectId} &bull; {lesson.classId}
      </Text>

      {/* ── Download / Offline button ─────────── */}
      <View style={styles.downloadRow}>
        {downloadStatus === 'downloaded' ? (
          <>
            <View style={styles.downloadedBadge}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
              <Text style={styles.downloadedText}>Available Offline</Text>
            </View>
            <TouchableOpacity onPress={handleDeleteLocal} style={styles.deleteBtn}>
              <Ionicons name="trash-outline" size={18} color={COLORS.error} />
              <Text style={styles.deleteBtnText}>Remove</Text>
            </TouchableOpacity>
          </>
        ) : downloadStatus === 'downloading' ? (
          <View style={styles.progressRow}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.progressText}>
              Downloading… {Math.round(downloadProgress * 100)}%
            </Text>
            <View style={styles.progressBarBg}>
              <View
                style={[styles.progressBarFill, { width: `${downloadProgress * 100}%` }]}
              />
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.downloadBtn}
            onPress={handleDownload}
            activeOpacity={0.8}
          >
            <Ionicons name="download-outline" size={20} color="#fff" />
            <Text style={styles.downloadBtnText}>Download for Offline</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Notes Section ─────────────────────── */}
      <View style={styles.notesSection}>
        <Text style={styles.sectionTitle}>Notes</Text>

        {!lesson.notes || lesson.notes.length === 0 ? (
          <Text style={styles.emptyNotes}>No notes attached to this lesson.</Text>
        ) : (
          lesson.notes.map((note, idx) => (
            <TouchableOpacity
              key={`${note.url}-${idx}`}
              style={styles.noteCard}
              onPress={() => openNote(note)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={note.type === 'pdf' ? 'document-text-outline' : 'image-outline'}
                size={24}
                color={COLORS.primary}
              />
              <View style={styles.noteInfo}>
                <Text style={styles.noteLabel} numberOfLines={1}>
                  {note.label}
                </Text>
                <Text style={styles.noteType}>
                  {note.type === 'pdf' ? 'PDF Document' : 'Image'}
                </Text>
              </View>
              <Ionicons name="open-outline" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* ── Comments Section ─────────────────── */}
      <VideoComments lessonId={lessonId} />
    </ScrollView>
  );
}

// ── Styles ─────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingBottom: 40 },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 32,
  },
  emptyText: { marginTop: 12, fontSize: 15, color: COLORS.textSecondary },

  // Player
  playerWrapper: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
  },
  player: { flex: 1 },

  // Title
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 16,
    marginHorizontal: 16,
  },
  meta: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
    marginHorizontal: 16,
  },

  // Download
  downloadRow: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  downloadBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  downloadedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  downloadedText: { color: COLORS.success, fontWeight: '500', fontSize: 14 },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  deleteBtnText: { color: COLORS.error, fontSize: 13 },
  progressRow: { gap: 6 },
  progressText: { color: COLORS.textSecondary, fontSize: 13 },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.border,
    marginTop: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
  },

  // Notes
  notesSection: {
    marginTop: 24,
    marginHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  emptyNotes: { color: COLORS.textSecondary, fontSize: 14 },
  noteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  noteInfo: { flex: 1, marginLeft: 12 },
  noteLabel: { fontSize: 15, fontWeight: '500', color: COLORS.text },
  noteType: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
});
