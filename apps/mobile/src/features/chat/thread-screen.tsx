import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";

import { CommentComposer } from "@/src/components/ui/comment-composer";
import { CallActionButton } from "@/src/features/chat/components/call-action-button";
import { ChatMessageBubble } from "@/src/features/chat/components/chat-message-bubble";
import { chatAvatar, chatPalette, presenceLabel, shortTime } from "@/src/features/chat/chat-theme";
import { useApp } from "@/src/providers/app-provider";
import { radius, spacing } from "@/src/theme/tokens";

export function ThreadScreen() {
  const { contactId } = useLocalSearchParams<{ contactId: string }>();
  const { addUsersToActiveChat, chatContacts, chatMessages, chatUsers, loadThread, sendMessage, startCall } = useApp();
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [callStatus, setCallStatus] = useState("");
  const { width } = useWindowDimensions();

  const contact = useMemo(
    () => chatContacts.find((item) => item.id === contactId) ?? null,
    [chatContacts, contactId],
  );
  const addableUsers = useMemo(
    () => chatUsers.filter((user) => !contact?.participants.some((participant) => participant.id === user.id)),
    [chatUsers, contact],
  );

  function toggleUser(userId: number) {
    setSelectedUserIds((current) => (
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId]
    ));
  }

  async function openCall(mode: "voice" | "video") {
    if (!contactId) {
      return;
    }
    setCallStatus(`Starting ${mode} call...`);
    try {
      const call = await startCall({ mode, roomId: contactId });
      if (mode === "voice") {
        router.push({ pathname: "/conversations/[contactId]/voice", params: { callId: String(call.id), contactId } });
        return;
      }
      router.push({ pathname: "/conversations/[contactId]/video", params: { callId: String(call.id), contactId } });
    } catch (err) {
      setCallStatus(err instanceof Error ? err.message : "Could not start call.");
    }
  }

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
                  {contact?.type === "group" ? `${contact.participantCount} members` : contact?.subtitle ?? "Direct chat"}
                </Text>
                <Text style={{ color: chatPalette.accent, fontSize: 12, fontWeight: "800" as const }}>
                  {presenceLabel(contact?.updatedAt)}
                </Text>
              </View>

              <View style={{ flexDirection: "row", gap: spacing.sm }}>
                <CallActionButton
                  icon="call-outline"
                  label="Voice"
                  onPress={() => void openCall("voice")}
                />
                <CallActionButton
                  icon="videocam-outline"
                  label="Video"
                  onPress={() => void openCall("video")}
                />
              </View>
            </View>

            {callStatus ? (
              <Text style={{ color: chatPalette.soft, fontSize: 12, fontWeight: "800" as const }}>{callStatus}</Text>
            ) : null}

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
              <ThreadPill label={contact?.type === "group" ? "Group room" : "Direct thread"} tone="accentAlt" />
              <ThreadPill label={`${chatMessages.length} messages`} tone="soft" />
              <ThreadPill label={`Updated ${shortTime(contact?.updatedAt ?? new Date().toISOString())}`} tone="soft" />
            </View>
          </View>

          {contact?.type === "group" ? (
            <View
              style={{
                borderRadius: 26,
                borderWidth: 1,
                borderColor: chatPalette.border,
                backgroundColor: chatPalette.shell,
                padding: spacing.md,
                gap: spacing.sm,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm }}>
                <Text style={{ color: chatPalette.ink, fontSize: 16, fontWeight: "900" as const }}>Group members</Text>
                <Text style={{ color: chatPalette.soft, fontSize: 12, fontWeight: "800" as const }}>{contact.participantCount} total</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingRight: spacing.sm }}>
                {contact.participants.map((participant) => (
                  <View key={participant.id} style={{ width: 72, alignItems: "center", gap: 6 }}>
                    <Image source={chatAvatar(participant.name)} style={{ width: 44, height: 44, borderRadius: radius.pill }} />
                    <Text numberOfLines={1} style={{ color: chatPalette.soft, fontSize: 11, fontWeight: "800" as const }}>
                      {participant.name.split(/\s+/)[0]}
                    </Text>
                  </View>
                ))}
              </ScrollView>

              {addableUsers.length ? (
                <>
                  <Text style={{ color: chatPalette.soft, fontSize: 12, fontWeight: "800" as const }}>Add users</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingRight: spacing.sm }}>
                    {addableUsers.slice(0, 8).map((user) => {
                      const active = selectedUserIds.includes(user.id);
                      return (
                        <Pressable
                          key={user.id}
                          onPress={() => toggleUser(user.id)}
                          style={{
                            width: 78,
                            borderRadius: 20,
                            borderWidth: 1,
                            borderColor: active ? chatPalette.accent : chatPalette.border,
                            backgroundColor: active ? chatPalette.glow : chatPalette.panel,
                            padding: spacing.xs,
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <Image source={chatAvatar(user.name)} style={{ width: 38, height: 38, borderRadius: radius.pill }} />
                          <Text numberOfLines={1} style={{ color: active ? chatPalette.accent : chatPalette.soft, fontSize: 11, fontWeight: "900" as const }}>
                            {user.name.split(/\s+/)[0]}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                  <Pressable
                    disabled={!selectedUserIds.length}
                    onPress={() => {
                      void addUsersToActiveChat(selectedUserIds);
                      setSelectedUserIds([]);
                    }}
                    style={{
                      minHeight: 42,
                      borderRadius: radius.pill,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: selectedUserIds.length ? chatPalette.accent : "rgba(255,255,255,0.05)",
                    }}
                  >
                    <Text style={{ color: selectedUserIds.length ? chatPalette.black : chatPalette.soft, fontSize: 12, fontWeight: "900" as const }}>
                      Add to group
                    </Text>
                  </Pressable>
                </>
              ) : null}
            </View>
          ) : null}

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
