import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo } from "react";
import { Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";

import { CommentComposer } from "@/src/components/ui/comment-composer";
import { CallActionButton } from "@/src/features/chat/components/call-action-button";
import { ChatMessageBubble } from "@/src/features/chat/components/chat-message-bubble";
import { chatAvatar, chatPalette, presenceLabel, shortTime } from "@/src/features/chat/chat-theme";
import { useApp } from "@/src/providers/app-provider";
import { radius, spacing } from "@/src/theme/tokens";

export function ThreadScreen() {
  const { contactId } = useLocalSearchParams<{ contactId: string }>();
  const { chatContacts, chatMessages, loadThread, sendMessage } = useApp();
  const { width } = useWindowDimensions();

  const contact = useMemo(
    () => chatContacts.find((item) => item.id === contactId) ?? null,
    [chatContacts, contactId],
  );

  useEffect(() => {
    if (contactId) {
      void loadThread(contactId);
    }
  }, [contactId]);

  return (
    <>
      <Stack.Screen options={{ animation: "slide_from_right", headerShown: false }} />
      <ScrollView
        contentContainerStyle={{
          alignItems: width > 980 ? "center" : "stretch",
          padding: spacing.lg,
          gap: spacing.lg,
          paddingBottom: 120,
        }}
        contentInsetAdjustmentBehavior="automatic"
        style={{ flex: 1, backgroundColor: chatPalette.page }}
      >
        <View style={{ width: "100%", maxWidth: 920, gap: spacing.lg }}>
          <View
            style={{
              borderRadius: 30,
              borderWidth: 1,
              borderColor: chatPalette.border,
              backgroundColor: chatPalette.shell,
              padding: spacing.lg,
              gap: spacing.md,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm }}>
              <Pressable
                onPress={() => router.back()}
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: radius.pill,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: chatPalette.panel,
                  borderWidth: 1,
                  borderColor: chatPalette.border,
                }}
              >
                <Ionicons color={chatPalette.ink} name="arrow-back" size={18} />
              </Pressable>

              <Text style={{ color: chatPalette.soft, fontSize: 12, fontWeight: "800" as const }}>
                Thread view
              </Text>
            </View>

            <View
              style={{
                flexDirection: width > 680 ? "row" : "column",
                alignItems: width > 680 ? "center" : "flex-start",
                gap: spacing.md,
              }}
            >
              <Image source={chatAvatar(contact?.name ?? "chat")} style={{ width: 76, height: 76, borderRadius: radius.pill }} />

              <View style={{ flex: 1, gap: 6 }}>
                <Text numberOfLines={1} style={{ color: chatPalette.ink, fontSize: 24, fontWeight: "900" as const }}>
                  {contact?.name ?? "Thread"}
                </Text>
                <Text numberOfLines={1} style={{ color: chatPalette.soft, fontSize: 13 }}>
                  {contact?.subtitle ?? "Direct chat"}
                </Text>
                <Text style={{ color: chatPalette.accent, fontSize: 12, fontWeight: "800" as const }}>
                  {presenceLabel(contact?.updatedAt)}
                </Text>
              </View>

              <View style={{ flexDirection: "row", gap: spacing.sm }}>
                <CallActionButton
                  icon="call-outline"
                  label="Voice"
                  onPress={() => router.push({ pathname: "/conversations/[contactId]/voice", params: { contactId: contactId ?? "" } })}
                />
                <CallActionButton
                  icon="videocam-outline"
                  label="Video"
                  onPress={() => router.push({ pathname: "/conversations/[contactId]/video", params: { contactId: contactId ?? "" } })}
                />
              </View>
            </View>

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
              <ThreadPill label="Direct thread" tone="accentAlt" />
              <ThreadPill label={`${chatMessages.length} messages`} tone="soft" />
              <ThreadPill label={`Updated ${shortTime(contact?.updatedAt ?? new Date().toISOString())}`} tone="soft" />
            </View>
          </View>

          <View
            style={{
              borderRadius: 30,
              borderWidth: 1,
              borderColor: chatPalette.border,
              backgroundColor: chatPalette.shell,
              padding: spacing.lg,
              gap: spacing.md,
            }}
          >
            <Text style={{ color: chatPalette.soft, fontSize: 12, fontWeight: "800" as const, textAlign: "center" }}>
              Today
            </Text>
            <View style={{ gap: spacing.sm }}>
              {chatMessages.length ? (
                chatMessages.map((message) => (
                  <ChatMessageBubble
                    author={message.own ? "You" : message.sender.name}
                    body={message.body}
                    key={message.id}
                    own={message.own}
                    timeLabel={shortTime(message.createdAt)}
                  />
                ))
              ) : (
                <View
                  style={{
                    borderRadius: 24,
                    borderWidth: 1,
                    borderColor: chatPalette.border,
                    backgroundColor: chatPalette.panelSoft,
                    padding: spacing.lg,
                    gap: spacing.xs,
                  }}
                >
                  <Text style={{ color: chatPalette.ink, fontSize: 16, fontWeight: "800" as const }}>
                    Start the thread
                  </Text>
                  <Text style={{ color: chatPalette.soft, fontSize: 13 }}>
                    Send the first message and this space turns into the full chat flow.
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View
            style={{
              borderRadius: 24,
              borderWidth: 1,
              borderColor: chatPalette.border,
              backgroundColor: chatPalette.shell,
              padding: spacing.md,
            }}
          >
            <CommentComposer onSubmit={sendMessage} placeholder={`Message ${contact?.name ?? "chat"}`} />
          </View>
        </View>
      </ScrollView>
    </>
  );
}

function ThreadPill({
  label,
  tone,
}: {
  label: string;
  tone: "accentAlt" | "soft";
}) {
  return (
    <View
      style={{
        borderRadius: radius.pill,
        paddingHorizontal: spacing.sm,
        paddingVertical: 7,
        backgroundColor: tone === "accentAlt" ? chatPalette.spotlight : chatPalette.panel,
        borderWidth: 1,
        borderColor: chatPalette.border,
      }}
    >
      <Text style={{ color: tone === "accentAlt" ? chatPalette.accentAlt : chatPalette.soft, fontSize: 11, fontWeight: "900" as const }}>
        {label}
      </Text>
    </View>
  );
}
