// ──────────────────────────────────────────────
// NafAcademy – Downloads Manager
// Manage offline-downloaded videos + storage usage
// ──────────────────────────────────────────────
import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '@/constants';
import type { OfflineDownload } from '@/types';

const DOWNLOADS_KEY = '@naf_downloads';

/** Read the downloads manifest from AsyncStorage */
async function loadDownloads(): Promise<OfflineDownload[]> {
  try {
    const raw = await AsyncStorage.getItem(DOWNLOADS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Save the downloads manifest */
async function saveDownloads(list: OfflineDownload[]): Promise<void> {
  await AsyncStorage.setItem(DOWNLOADS_KEY, JSON.stringify(list));
}

/** Format bytes into human-readable */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1073741824).toFixed(2)} GB`;
}

export default function DownloadsScreen() {
  const [downloads, setDownloads] = useState<OfflineDownload[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const list = await loadDownloads();

    // Verify files still exist on disk
    const verified: OfflineDownload[] = [];
    for (const dl of list) {
      const info = await FileSystem.getInfoAsync(dl.localUri);
      if (info.exists) {
        verified.push({ ...dl, sizeBytes: info.size ?? dl.sizeBytes });
      }
    }

    // Clean up stale entries
    if (verified.length !== list.length) {
      await saveDownloads(verified);
    }

    setDownloads(verified);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const totalSize = downloads.reduce((sum, d) => sum + d.sizeBytes, 0);

  const handleDelete = useCallback(
    (dl: OfflineDownload) => {
      Alert.alert(
        'Delete Download',
        `Remove "${dl.title}" from offline storage?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await FileSystem.deleteAsync(dl.localUri, { idempotent: true });
              } catch {}
              const updated = downloads.filter((d) => d.lessonId !== dl.lessonId);
              await saveDownloads(updated);
              setDownloads(updated);
            },
          },
        ]
      );
    },
    [downloads]
  );

  const handleDeleteAll = useCallback(() => {
    if (downloads.length === 0) return;
    Alert.alert(
      'Delete All Downloads',
      'Remove all offline videos? This will free up space on your device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            for (const dl of downloads) {
              try {
                await FileSystem.deleteAsync(dl.localUri, { idempotent: true });
              } catch {}
            }
            await saveDownloads([]);
            setDownloads([]);
          },
        },
      ]
    );
  }, [downloads]);

  const renderItem = ({ item }: { item: OfflineDownload }) => (
    <View style={styles.dlItem}>
      <Ionicons name="film-outline" size={28} color={COLORS.primary} />
      <View style={styles.dlInfo}>
        <Text style={styles.dlTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.dlMeta}>
          {formatBytes(item.sizeBytes)} • Downloaded{' '}
          {new Date(item.downloadedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
        </Text>
      </View>
      <Pressable onPress={() => handleDelete(item)} hitSlop={10}>
        <Ionicons name="trash-outline" size={22} color={COLORS.error} />
      </Pressable>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.heading}>Downloads</Text>
        {downloads.length > 0 && (
          <Pressable onPress={handleDeleteAll} hitSlop={10}>
            <Text style={styles.deleteAllBtn}>Delete All</Text>
          </Pressable>
        )}
      </View>

      {/* Storage summary */}
      <View style={styles.storageCard}>
        <Ionicons name="folder-outline" size={22} color={COLORS.primary} />
        <View style={styles.storageInfo}>
          <Text style={styles.storageTitle}>
            {downloads.length} video{downloads.length !== 1 ? 's' : ''} downloaded
          </Text>
          <Text style={styles.storageSize}>
            Total: {formatBytes(totalSize)}
          </Text>
        </View>
      </View>

      {downloads.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="cloud-download-outline" size={48} color={COLORS.border} />
          <Text style={styles.emptyTitle}>No offline videos</Text>
          <Text style={styles.emptyText}>
            Download videos from the Classroom tab to watch without internet
          </Text>
        </View>
      ) : (
        <FlatList
          data={downloads}
          keyExtractor={(d) => d.lessonId}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  heading: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  deleteAllBtn: { fontSize: 13, color: COLORS.error, fontWeight: '600' },

  storageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 12,
    padding: 14,
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
  },
  storageInfo: { marginLeft: 12 },
  storageTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  storageSize: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },

  dlItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: COLORS.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  dlInfo: { flex: 1, marginHorizontal: 12 },
  dlTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  dlMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },

  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginTop: 12 },
  emptyText: { fontSize: 13, color: COLORS.textSecondary, marginTop: 6, textAlign: 'center' },
});
