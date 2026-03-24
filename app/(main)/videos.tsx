// ──────────────────────────────────────────────
// NafAcademy – Video Lessons Screen
// ──────────────────────────────────────────────
import { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RoleGate, VideoWorkspace } from '@/components';
import CreateVideoLesson from '@/components/CreateVideoLesson';
import { useAuth } from '@/hooks/useAuth';
import { getVideoLessonsBySchool } from '@/services/firestore';
import { COLORS } from '@/constants';
import type { VideoLesson } from '@/types';

export default function VideosScreen() {
  const { schoolId, hasRole } = useAuth();
  const [lessons, setLessons] = useState<VideoLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const loadLessons = () => {
    if (!schoolId) { setLoading(false); return; }
    setLoading(true);
    getVideoLessonsBySchool(schoolId)
      .then(setLessons)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadLessons();
  }, [schoolId]);

  // ── If a lesson is selected, show the full VideoWorkspace ──
  if (selectedId) {
    return (
      <RoleGate allowed={['admin', 'teacher', 'student']}>
        <View style={styles.container}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => setSelectedId(null)}
          >
            <Ionicons name="arrow-back" size={22} color={COLORS.primary} />
            <Text style={styles.backText}>All Videos</Text>
          </TouchableOpacity>
          <VideoWorkspace lessonId={selectedId} />
        </View>
      </RoleGate>
    );
  }

  // ── Teacher create form ──
  if (showCreate) {
    return (
      <RoleGate allowed={['admin', 'teacher']}>
        <CreateVideoLesson onDone={() => { setShowCreate(false); loadLessons(); }} />
      </RoleGate>
    );
  }

  const isTeacher = hasRole('admin', 'teacher');

  // ── Lesson list ──
  return (
    <RoleGate allowed={['admin', 'teacher', 'student']}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Video Lessons</Text>
          {isTeacher && (
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => setShowCreate(true)}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.addBtnText}>Add</Text>
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <ActivityIndicator
            size="large"
            color={COLORS.primary}
            style={{ marginTop: 40 }}
          />
        ) : lessons.length === 0 ? (
          <Text style={styles.empty}>
            No video lessons yet. Check back soon!
          </Text>
        ) : (
          <FlatList
            data={lessons}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 24 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.7}
                onPress={() => setSelectedId(item.id)}
              >
                <View style={styles.thumb}>
                  <Ionicons name="play-circle-outline" size={36} color={COLORS.primary} />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text style={styles.cardMeta}>
                    {item.subjectId} &bull; {item.classId}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </RoleGate>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  empty: { padding: 20, color: COLORS.textSecondary },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 6,
  },
  backText: { color: COLORS.primary, fontWeight: '600', fontSize: 15 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: `${COLORS.primary}10`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: { flex: 1, marginLeft: 14 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  cardMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
});
