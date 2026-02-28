// ──────────────────────────────────────────────
// NafAcademy – VideoComments
// ──────────────────────────────────────────────
// Threaded comment section under a video lesson.
// Real-time via onSnapshot, supports replies.
// ──────────────────────────────────────────────
import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { onVideoComments, addVideoComment } from '@/services/firestore';
import { COLORS } from '@/constants';
import type { VideoComment } from '@/types';

// ── Role badge color mapping ───────────────────

const ROLE_COLORS: Record<string, string> = {
  admin: COLORS.error,
  teacher: COLORS.accent,
  student: COLORS.primary,
  parent: COLORS.success,
};

interface Props {
  lessonId: string;
}

export default function VideoComments({ lessonId }: Props) {
  const { profile } = useAuth();
  const [comments, setComments] = useState<VideoComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<VideoComment | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const unsub = onVideoComments(lessonId, (c) => {
      setComments(c);
      setLoading(false);
    });
    return unsub;
  }, [lessonId]);

  const handleSend = useCallback(async () => {
    if (!text.trim() || !profile) return;
    setSending(true);
    try {
      await addVideoComment(lessonId, {
        lessonId,
        userId: profile.uid,
        userName: profile.displayName,
        userRole: profile.role,
        text: text.trim(),
        parentId: replyTo?.id,
        createdAt: Date.now(),
      });
      setText('');
      setReplyTo(null);
    } catch {
      /* silent */
    }
    setSending(false);
  }, [text, profile, lessonId, replyTo]);

  // Build a top-level + replies structure
  const topLevel = comments.filter((c) => !c.parentId);
  const repliesMap = new Map<string, VideoComment[]>();
  comments
    .filter((c) => !!c.parentId)
    .forEach((c) => {
      const list = repliesMap.get(c.parentId!) || [];
      list.push(c);
      repliesMap.set(c.parentId!, list);
    });

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    const now = Date.now();
    const diff = now - ts;
    if (diff < 60_000) return 'Just now';
    if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
    return d.toLocaleDateString();
  };

  const renderComment = (comment: VideoComment, isReply = false) => {
    const roleColor = ROLE_COLORS[comment.userRole] || COLORS.textSecondary;
    const replies = repliesMap.get(comment.id) || [];

    return (
      <View key={comment.id} style={[styles.commentWrapper, isReply && styles.replyIndent]}>
        <View style={styles.commentRow}>
          <View style={[styles.avatar, { backgroundColor: roleColor + '30' }]}>
            <Text style={[styles.avatarLetter, { color: roleColor }]}>
              {comment.userName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.commentBody}>
            <View style={styles.nameRow}>
              <Text style={styles.commentName}>{comment.userName}</Text>
              <Text style={[styles.roleBadge, { color: roleColor }]}>{comment.userRole}</Text>
              <Text style={styles.commentTime}>{formatTime(comment.createdAt)}</Text>
            </View>
            <Text style={styles.commentText}>{comment.text}</Text>
            {!isReply && (
              <Pressable onPress={() => setReplyTo(comment)} style={styles.replyBtn}>
                <Ionicons name="return-down-forward" size={14} color={COLORS.textSecondary} />
                <Text style={styles.replyBtnText}>Reply</Text>
              </Pressable>
            )}
          </View>
        </View>
        {replies.map((r) => renderComment(r, true))}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>
        Comments{comments.length > 0 ? ` (${comments.length})` : ''}
      </Text>

      {topLevel.length === 0 ? (
        <Text style={styles.emptyText}>No comments yet. Be the first!</Text>
      ) : (
        <View>{topLevel.map((c) => renderComment(c))}</View>
      )}

      {/* Reply indicator */}
      {replyTo && (
        <View style={styles.replyIndicator}>
          <Text style={styles.replyIndicatorText} numberOfLines={1}>
            Replying to {replyTo.userName}
          </Text>
          <Pressable onPress={() => setReplyTo(null)}>
            <Ionicons name="close-circle" size={18} color={COLORS.textSecondary} />
          </Pressable>
        </View>
      )}

      {/* Input */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder={replyTo ? `Reply to ${replyTo.userName}...` : 'Add a comment...'}
          placeholderTextColor={COLORS.textSecondary}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={500}
        />
        <Pressable
          style={[styles.sendBtn, (!text.trim() || sending) && { opacity: 0.5 }]}
          onPress={handleSend}
          disabled={!text.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="send" size={18} color="#fff" />
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 20, marginHorizontal: 16, paddingBottom: 20 },
  loadingContainer: { padding: 20, alignItems: 'center' },
  heading: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  emptyText: { color: COLORS.textSecondary, fontSize: 14, marginBottom: 16 },

  commentWrapper: { marginBottom: 12 },
  replyIndent: { marginLeft: 40, marginTop: 6 },
  commentRow: { flexDirection: 'row' },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  avatarLetter: { fontSize: 14, fontWeight: '700' },
  commentBody: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  commentName: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  roleBadge: { fontSize: 10, fontWeight: '600', textTransform: 'capitalize' },
  commentTime: { fontSize: 11, color: COLORS.textSecondary },
  commentText: { fontSize: 14, color: COLORS.text, marginTop: 3, lineHeight: 20 },
  replyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  replyBtnText: { fontSize: 12, color: COLORS.textSecondary },

  replyIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  replyIndicatorText: { fontSize: 13, color: COLORS.primary, fontWeight: '500', flex: 1 },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 10,
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
    maxHeight: 80,
    backgroundColor: COLORS.surface,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
