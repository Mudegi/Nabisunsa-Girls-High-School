// ──────────────────────────────────────────────
// NafAcademy – Projects Screen
// Teacher creates projects, students view & upload
// ──────────────────────────────────────────────
import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import {
  getProjectsByTeacher,
  getProjectsByStudent,
  getProjectsBySchool,
  createProject,
  updateProject,
} from '@/services/firestore';
import { COLORS } from '@/constants';
import type { Project } from '@/types';

const STATUS_COLORS: Record<Project['status'], string> = {
  pending: COLORS.textSecondary,
  'in-progress': COLORS.primary,
  submitted: COLORS.accent,
  graded: COLORS.success,
};

const STATUS_LABELS: Record<Project['status'], string> = {
  pending: 'Pending',
  'in-progress': 'In Progress',
  submitted: 'Submitted',
  graded: 'Graded',
};

export default function ProjectsScreen() {
  const { profile, hasRole, schoolId } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const isTeacher = hasRole('teacher', 'admin');

  const loadProjects = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      let p: Project[];
      if (hasRole('teacher')) {
        p = await getProjectsByTeacher(profile.uid);
      } else if (hasRole('student')) {
        p = await getProjectsByStudent(profile.uid);
      } else if (hasRole('admin') && schoolId) {
        p = await getProjectsBySchool(schoolId);
      } else {
        p = [];
      }
      setProjects(p);
    } catch {
      setProjects([]);
    }
    setLoading(false);
  }, [profile, hasRole, schoolId]);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  const handleCreateProject = useCallback(async () => {
    if (!newTitle.trim() || !profile || !schoolId) return;
    try {
      await createProject({
        schoolId,
        classId: '',
        subjectId: '',
        title: newTitle.trim(),
        description: newDesc.trim() || undefined,
        teacherId: profile.uid,
        studentIds: [],
        status: 'pending',
        dueDate: Date.now() + 30 * 86400000,
        createdAt: Date.now(),
      });
      setNewTitle('');
      setNewDesc('');
      setShowCreate(false);
      loadProjects();
    } catch {
      Alert.alert('Error', 'Failed to create project');
    }
  }, [newTitle, newDesc, profile, schoolId, loadProjects]);

  const handleStatusChange = useCallback(
    async (project: Project, status: Project['status']) => {
      try {
        await updateProject(project.id, { status });
        setSelectedProject(null);
        loadProjects();
      } catch {
        Alert.alert('Error', 'Failed to update status');
      }
    },
    [loadProjects]
  );

  const renderProject = ({ item }: { item: Project }) => {
    const statusColor = STATUS_COLORS[item.status];
    const daysLeft = Math.ceil((item.dueDate - Date.now()) / 86400000);
    const overdue = daysLeft < 0;

    return (
      <Pressable style={styles.projectCard} onPress={() => setSelectedProject(item)}>
        <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />
        <View style={styles.projectBody}>
          <Text style={styles.projectTitle} numberOfLines={1}>{item.title}</Text>
          {item.description ? (
            <Text style={styles.projectDesc} numberOfLines={2}>{item.description}</Text>
          ) : null}
          <View style={styles.projectMeta}>
            <View style={[styles.statusPill, { backgroundColor: statusColor + '20' }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>
                {STATUS_LABELS[item.status]}
              </Text>
            </View>
            <Text style={[styles.dueText, overdue && { color: COLORS.error }]}>
              {overdue ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left`}
            </Text>
            <Text style={styles.studentCount}>
              {item.studentIds.length} student{item.studentIds.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  };

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
        <Text style={styles.heading}>Projects</Text>
        {isTeacher && (
          <Pressable style={styles.createBtn} onPress={() => setShowCreate(true)}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.createBtnText}>New</Text>
          </Pressable>
        )}
      </View>

      {projects.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="folder-open-outline" size={48} color={COLORS.border} />
          <Text style={styles.emptyTitle}>No projects yet</Text>
          <Text style={styles.emptyText}>
            {isTeacher
              ? 'Create a project to assign collaborative work to students'
              : 'Your teachers will assign projects here'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={projects}
          keyExtractor={(p) => p.id}
          renderItem={renderProject}
          contentContainerStyle={styles.list}
        />
      )}

      {/* Create project modal */}
      <Modal visible={showCreate} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>New Project</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Project title"
              value={newTitle}
              onChangeText={setNewTitle}
              placeholderTextColor={COLORS.textSecondary}
            />
            <TextInput
              style={[styles.modalInput, { height: 80, textAlignVertical: 'top' }]}
              placeholder="Description (optional)"
              value={newDesc}
              onChangeText={setNewDesc}
              multiline
              placeholderTextColor={COLORS.textSecondary}
            />
            <View style={styles.modalActions}>
              <Pressable onPress={() => setShowCreate(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleCreateProject} style={styles.saveBtn}>
                <Text style={styles.saveBtnText}>Create</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Project detail modal */}
      <Modal visible={!!selectedProject} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { maxHeight: '60%' }]}>
            {selectedProject && (
              <>
                <View style={styles.detailHeader}>
                  <Text style={styles.modalTitle} numberOfLines={2}>{selectedProject.title}</Text>
                  <Pressable onPress={() => setSelectedProject(null)}>
                    <Ionicons name="close" size={24} color={COLORS.text} />
                  </Pressable>
                </View>
                {selectedProject.description && (
                  <Text style={styles.detailDesc}>{selectedProject.description}</Text>
                )}
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <Text style={[styles.detailValue, { color: STATUS_COLORS[selectedProject.status] }]}>
                    {STATUS_LABELS[selectedProject.status]}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Due Date</Text>
                  <Text style={styles.detailValue}>
                    {new Date(selectedProject.dueDate).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Students</Text>
                  <Text style={styles.detailValue}>{selectedProject.studentIds.length}</Text>
                </View>

                {/* Status actions */}
                {hasRole('student') && selectedProject.status === 'pending' && (
                  <Pressable
                    style={[styles.saveBtn, { marginTop: 16, alignSelf: 'stretch', alignItems: 'center' }]}
                    onPress={() => handleStatusChange(selectedProject, 'in-progress')}
                  >
                    <Text style={styles.saveBtnText}>Start Working</Text>
                  </Pressable>
                )}
                {hasRole('student') && selectedProject.status === 'in-progress' && (
                  <Pressable
                    style={[styles.saveBtn, { marginTop: 16, alignSelf: 'stretch', alignItems: 'center', backgroundColor: COLORS.accent }]}
                    onPress={() => handleStatusChange(selectedProject, 'submitted')}
                  >
                    <Text style={styles.saveBtnText}>Submit Project</Text>
                  </Pressable>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>
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
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  createBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  list: { padding: 12 },
  projectCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  statusIndicator: { width: 5, borderTopLeftRadius: 12, borderBottomLeftRadius: 12 },
  projectBody: { flex: 1, padding: 14 },
  projectTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  projectDesc: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
  projectMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 10 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '600' },
  dueText: { fontSize: 12, color: COLORS.textSecondary },
  studentCount: { fontSize: 12, color: COLORS.textSecondary },

  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginTop: 12 },
  emptyText: { fontSize: 13, color: COLORS.textSecondary, marginTop: 6, textAlign: 'center' },

  // Modals
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' },
  modal: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 20, width: '85%' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  modalInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 12,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  cancelBtn: { padding: 10 },
  cancelBtnText: { color: COLORS.textSecondary, fontWeight: '600' },
  saveBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  saveBtnText: { color: '#fff', fontWeight: '600' },

  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  detailDesc: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 16, lineHeight: 20 },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  detailLabel: { fontSize: 13, color: COLORS.textSecondary },
  detailValue: { fontSize: 14, fontWeight: '600', color: COLORS.text },
});
