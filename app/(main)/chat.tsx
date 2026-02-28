// ──────────────────────────────────────────────
// NafAcademy – Chat Screen (conversations + room)
// ──────────────────────────────────────────────
import { useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import ConversationList from '@/components/ConversationList';
import ChatRoom from '@/components/ChatRoom';
import NewChatPicker from '@/components/NewChatPicker';
import { COLORS } from '@/constants';

type Screen = 'list' | 'room' | 'new';

export default function ChatScreen() {
  const [screen, setScreen] = useState<Screen>('list');
  const [activeConv, setActiveConv] = useState<{
    id: string;
    otherUid: string;
    otherName: string;
  } | null>(null);

  const openRoom = useCallback((convId: string, other: { uid: string; name: string }) => {
    setActiveConv({ id: convId, otherUid: other.uid, otherName: other.name });
    setScreen('room');
  }, []);

  const backToList = useCallback(() => {
    setScreen('list');
    setActiveConv(null);
  }, []);

  return (
    <View style={styles.container}>
      {screen === 'list' && (
        <ConversationList
          onSelectConversation={openRoom}
          onNewChat={() => setScreen('new')}
        />
      )}

      {screen === 'new' && (
        <NewChatPicker
          onConversationReady={openRoom}
          onBack={backToList}
        />
      )}

      {screen === 'room' && activeConv && (
        <ChatRoom
          conversationId={activeConv.id}
          otherUserName={activeConv.otherName}
          otherUserId={activeConv.otherUid}
          onBack={backToList}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
});
