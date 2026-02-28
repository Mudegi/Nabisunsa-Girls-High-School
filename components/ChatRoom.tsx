// ──────────────────────────────────────────────
// NafAcademy – Chat Room (WhatsApp-style messages)
// ──────────────────────────────────────────────
import { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/hooks/useAuth';
import {
  onConversationMessages,
  sendMessage,
  markConversationRead,
} from '@/services/firestore';
import { uploadImage } from '@/services/storageUpload';
import { COLORS } from '@/constants';
import type { ChatMessage } from '@/types';

interface Props {
  conversationId: string;
  otherUserName: string;
  otherUserId: string;
  onBack: () => void;
}

export default function ChatRoom({ conversationId, otherUserName, otherUserId, onBack }: Props) {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  // Subscribe to messages
  useEffect(() => {
    const unsub = onConversationMessages(conversationId, (msgs) => {
      setMessages(msgs);
      setLoading(false);
    });
    return unsub;
  }, [conversationId]);

  // Mark as read when opening
  useEffect(() => {
    if (profile) {
      markConversationRead(conversationId, profile.uid);
    }
  }, [conversationId, profile]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const handleSend = useCallback(async () => {
    if (!text.trim() || !profile || sending) return;

    const msgText = text.trim();
    setText('');
    setSending(true);

    try {
      await sendMessage(
        conversationId,
        {
          senderId: profile.uid,
          senderName: profile.displayName,
          text: msgText,
          createdAt: Date.now(),
          read: false,
        },
        otherUserId
      );
    } catch (e) {
      Alert.alert('Error', 'Failed to send message');
      setText(msgText);
    } finally {
      setSending(false);
    }
  }, [text, profile, conversationId, otherUserId, sending]);

  const handlePickImage = useCallback(async () => {
    if (!profile) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.6,
    });

    if (result.canceled || !result.assets[0]) return;

    setSending(true);
    try {
      const downloadUrl = await uploadImage(
        result.assets[0].uri,
        `chat/${conversationId}`
      );

      await sendMessage(
        conversationId,
        {
          senderId: profile.uid,
          senderName: profile.displayName,
          text: '',
          mediaUrl: downloadUrl,
          mediaType: 'image',
          createdAt: Date.now(),
          read: false,
        },
        otherUserId
      );
    } catch (e) {
      Alert.alert('Error', 'Failed to send image');
    } finally {
      setSending(false);
    }
  }, [profile, conversationId, otherUserId]);

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isMyMessage = (msg: ChatMessage) => msg.senderId === profile?.uid;

  const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => {
    const mine = isMyMessage(item);
    const showDate =
      index === 0 ||
      new Date(messages[index - 1].createdAt).toDateString() !==
        new Date(item.createdAt).toDateString();

    return (
      <View>
        {showDate && (
          <View style={styles.dateSeparator}>
            <Text style={styles.dateText}>
              {new Date(item.createdAt).toLocaleDateString([], {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
            </Text>
          </View>
        )}

        <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
          {!mine && <Text style={styles.senderName}>{item.senderName}</Text>}

          {item.mediaUrl && item.mediaType === 'image' && (
            <Image
              source={{ uri: item.mediaUrl }}
              style={styles.mediaImage}
              resizeMode="cover"
            />
          )}

          {item.mediaUrl && item.mediaType === 'pdf' && (
            <View style={styles.pdfAttachment}>
              <Ionicons name="document-outline" size={20} color={COLORS.primary} />
              <Text style={styles.pdfText}>PDF Attachment</Text>
            </View>
          )}

          {item.text ? (
            <Text style={[styles.messageText, mine && styles.messageTextMine]}>
              {item.text}
            </Text>
          ) : null}

          <Text style={[styles.timeText, mine && styles.timeTextMine]}>
            {formatTime(item.createdAt)}
            {mine && (
              <Text> {item.read ? '✓✓' : '✓'}</Text>
            )}
          </Text>
        </View>
      </View>
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {/* Chat header */}
      <View style={styles.chatHeader}>
        <Pressable onPress={onBack} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </Pressable>
        <View style={styles.headerAvatar}>
          <Text style={styles.headerAvatarText}>
            {otherUserName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.headerName} numberOfLines={1}>{otherUserName}</Text>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
      />

      {/* Input bar */}
      <View style={styles.inputBar}>
        <Pressable onPress={handlePickImage} hitSlop={8} style={styles.attachBtn}>
          <Ionicons name="attach-outline" size={24} color={COLORS.textSecondary} />
        </Pressable>

        <TextInput
          style={styles.input}
          placeholder="Type a message…"
          placeholderTextColor={COLORS.textSecondary}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={2000}
        />

        <Pressable
          onPress={handleSend}
          disabled={!text.trim() || sending}
          style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="send" size={20} color="#fff" />
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ECE5DD' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  headerAvatarText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  headerName: { fontSize: 16, fontWeight: '600', color: COLORS.text, flex: 1 },

  messagesList: { padding: 12, paddingBottom: 4 },

  dateSeparator: { alignItems: 'center', marginVertical: 12 },
  dateText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    backgroundColor: 'rgba(255,255,255,0.8)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
  },

  bubble: {
    maxWidth: '78%',
    padding: 10,
    borderRadius: 12,
    marginBottom: 6,
  },
  bubbleMine: {
    backgroundColor: '#DCF8C6',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },

  senderName: { fontSize: 12, fontWeight: '600', color: COLORS.primary, marginBottom: 2 },
  messageText: { fontSize: 15, color: COLORS.text, lineHeight: 20 },
  messageTextMine: { color: '#303030' },
  timeText: { fontSize: 10, color: COLORS.textSecondary, textAlign: 'right', marginTop: 4 },
  timeTextMine: { color: '#7A8A6E' },

  mediaImage: { width: 200, height: 200, borderRadius: 8, marginBottom: 4 },
  pdfAttachment: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 8,
    marginBottom: 4,
  },
  pdfText: { fontSize: 13, color: COLORS.primary, marginLeft: 8 },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 8,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  attachBtn: { paddingHorizontal: 4, paddingBottom: 8 },
  input: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 15,
    maxHeight: 100,
    marginHorizontal: 8,
    color: COLORS.text,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: { opacity: 0.5 },
});
