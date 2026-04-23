import { Image } from "expo-image";
import { ScrollView, Text, View, Pressable } from "react-native";

import { StreamChatBubble } from "@/src/components/cards/stream-chat-bubble";
import { CommentComposer } from "@/src/components/ui/comment-composer";
import { useApp } from "@/src/providers/app-provider";
import { stylex } from "@/src/theme/stylex";
import { palette, radius, spacing } from "@/src/theme/tokens";

export function ChatScreen() {
  const { activeChatId, chatContacts, chatMessages, loadThread, sendMessage } = useApp();

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: 120 }} contentInsetAdjustmentBehavior="automatic" style={{ flex: 1, backgroundColor: palette.bg }}>
      <View style={{ gap: spacing.md }}>
        <Text style={chatStyles.title}>Messages</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md }}>
          {chatContacts.slice(0, 5).map((contact) => (
            <Pressable key={contact.id} onPress={() => void loadThread(contact.id)} style={{ alignItems: "center", gap: spacing.xs }}>
              <View style={{ borderRadius: radius.pill, padding: 2, backgroundColor: palette.accent }}>
                <Image source={{ uri: `https://api.dicebear.com/8.x/lorelei/png?seed=${encodeURIComponent(contact.name)}` }} style={{ width: 58, height: 58, borderRadius: 999 }} />
              </View>
              <Text style={{ color: palette.textMuted }}>{contact.name.split(" ")[0]}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={{ gap: spacing.sm }}>
        {chatContacts.map((contact) => (
          <Pressable
            key={contact.id}
            onPress={() => void loadThread(contact.id)}
            style={{
              flexDirection: "row",
              gap: spacing.sm,
              alignItems: "center",
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: activeChatId === contact.id ? palette.accent : palette.stroke,
              backgroundColor: palette.panel,
              padding: spacing.md,
            }}
          >
            <Image source={{ uri: `https://api.dicebear.com/8.x/lorelei/png?seed=${encodeURIComponent(contact.name)}` }} style={{ width: 52, height: 52, borderRadius: 999 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: palette.text, fontWeight: "800" }}>{contact.name}</Text>
              <Text style={{ color: palette.textMuted, marginTop: 2 }}>{contact.lastBody || contact.subtitle}</Text>
            </View>
            <View style={{ width: 10, height: 10, borderRadius: 999, backgroundColor: palette.accentStrong }} />
          </Pressable>
        ))}
      </View>

      <View
        style={{
          borderRadius: radius.xl,
          borderWidth: 1,
          borderColor: palette.stroke,
          backgroundColor: "#14181f",
          padding: spacing.lg,
          gap: spacing.md,
        }}
      >
        <Text style={{ color: palette.text, fontWeight: "900", fontSize: 22 }}>Thread</Text>
        <View style={{ gap: spacing.sm }}>
          {chatMessages.map((message) => (
            <StreamChatBubble author={message.own ? "You" : message.sender.name} body={message.body} key={message.id} own={message.own} />
          ))}
        </View>
        <CommentComposer onSubmit={sendMessage} placeholder="Type a message" />
      </View>
    </ScrollView>
  );
}

const chatStyles = stylex.create({
  title: {
    color: palette.text,
    fontSize: 32,
    fontWeight: "900" as const,
  },
});
