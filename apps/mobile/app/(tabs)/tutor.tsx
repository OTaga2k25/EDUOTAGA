import { useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SectionHeading } from '@/components/section-heading';
import { useTutorChat } from '@/hooks/use-tutor-chat';
import { useThemeColors } from '@/hooks/use-theme-colors';
import type { TutorChatMessage } from '@eduotaga/types';

export default function TutorScreen() {
  const theme = useThemeColors();
  const { mutateAsync, isPending } = useTutorChat();
  const [messages, setMessages] = useState<TutorChatMessage[]>([]);
  const [input, setInput] = useState('');
  const listRef = useRef<FlatList>(null);

  async function sendMessage() {
    const trimmed = input.trim();
    if (!trimmed || isPending) return;

    const userMessage: TutorChatMessage = { role: 'user', content: trimmed };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');

    try {
      const result = await mutateAsync({ messages: nextMessages });
      setMessages((prev) => [...prev, { role: 'assistant', content: result.reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: "Sorry, I couldn't reach the tutor. Please try again." },
      ]);
    } finally {
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={{ padding: theme.spacing.md, paddingBottom: 0 }}>
        <SectionHeading eyebrow="AI Tutor" title="Ask a question" />
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(_, index) => String(index)}
        contentContainerStyle={{ gap: theme.spacing.sm, padding: theme.spacing.md }}
        ListEmptyComponent={
          <Text style={{ color: theme.colors.muted, fontSize: theme.typography.sizes.sm }}>
            Ask me anything about the experiment you&apos;re working on.
          </Text>
        }
        renderItem={({ item }) => (
          <View
            style={{
              alignSelf: item.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '85%',
              backgroundColor: item.role === 'user' ? theme.colors.primary : theme.colors.surface,
              borderWidth: 1,
              borderColor: theme.colors.border,
              borderRadius: theme.radii.md,
              padding: theme.spacing.sm,
            }}
          >
            <Text
              style={{
                color: item.role === 'user' ? theme.colors.primaryForeground : theme.colors.foreground,
                fontSize: theme.typography.sizes.sm,
              }}
            >
              {item.content}
            </Text>
          </View>
        )}
      />

      <View
        style={{
          flexDirection: 'row',
          gap: theme.spacing.sm,
          padding: theme.spacing.md,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
        }}
      >
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Ask the tutor..."
          placeholderTextColor={theme.colors.muted}
          style={{
            flex: 1,
            height: 44,
            borderRadius: theme.radii.full,
            borderWidth: 1,
            borderColor: theme.colors.border,
            paddingHorizontal: theme.spacing.md,
            color: theme.colors.foreground,
            backgroundColor: theme.colors.surface,
          }}
          onSubmitEditing={sendMessage}
        />
        <Pressable
          onPress={sendMessage}
          disabled={isPending || !input.trim()}
          style={{
            width: 44,
            height: 44,
            borderRadius: theme.radii.full,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.colors.primary,
            opacity: isPending || !input.trim() ? 0.5 : 1,
          }}
        >
          <Ionicons name="send" size={18} color={theme.colors.primaryForeground} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
