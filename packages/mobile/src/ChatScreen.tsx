import { useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View, Pressable } from 'react-native';
import { useChat } from './chat';
import { useAuth } from './auth';
import { Loading } from './ui';
import { colors, font, radius, spacing } from './theme';

/** Order chat (pass orderId) or the client's support chat (pass support). */
export function ChatScreen({ orderId, support }: { orderId?: string; support?: boolean }) {
  const isSupport = !!support;
  const { userId } = useAuth();
  const { chat, messages, loading, send } = useChat(isSupport ? { support: true } : { orderId });
  const [text, setText] = useState('');
  const list = useRef<FlatList>(null);

  if (loading) return <Loading />;

  const submit = () => {
    const body = text.trim();
    if (!body) return;
    setText('');
    send.mutate(body);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <FlatList
        ref={list}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm }}
        onContentSizeChange={() => list.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => {
          const mine = item.sender_id === userId;
          return (
            <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
              <Text style={{ color: mine ? colors.white : colors.text, fontSize: font.md }}>{item.body}</Text>
              <Text style={[styles.time, mine && { color: 'rgba(255,255,255,0.7)' }]}>
                {new Date(item.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          );
        }}
      />
      {chat && !chat.is_closed ? (
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="…"
            placeholderTextColor={colors.textMuted}
            multiline
          />
          <Pressable style={styles.send} onPress={submit} disabled={!text.trim()}>
            <Text style={{ color: colors.white, fontSize: font.lg }}>➤</Text>
          </Pressable>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  bubble: { maxWidth: '80%', padding: spacing.md, borderRadius: radius.lg, gap: 2 },
  mine: { alignSelf: 'flex-end', backgroundColor: colors.primary },
  theirs: { alignSelf: 'flex-start', backgroundColor: colors.surface },
  time: { fontSize: 11, color: colors.textMuted, alignSelf: 'flex-end' },
  inputRow: {
    flexDirection: 'row', gap: spacing.sm, padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm, fontSize: font.md, maxHeight: 120, color: colors.text,
  },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
});
