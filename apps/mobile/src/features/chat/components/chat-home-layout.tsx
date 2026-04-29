import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, useWindowDimensions, View } from "react-native";

import { CallActionButton } from "@/src/features/chat/components/call-action-button";
import { ChatContactRow } from "@/src/features/chat/components/chat-contact-row";
import { ChatMessageBubble } from "@/src/features/chat/components/chat-message-bubble";
import { chatAvatar, chatPalette, firstName, presenceLabel, previewBadge } from "@/src/features/chat/chat-theme";
import type { ChatMode } from "@/src/features/chat/chat-screen";
import type { ChatContact, ChatMessage, ChatUser } from "@/src/services/api";
import { radius, spacing } from "@/src/theme/tokens";

type ChatHomeLayoutProps = {
  activeChatId: string;
  chatMessages: ChatMessage[];
  chatUsers: ChatUser[];
  contacts: ChatContact[];
  filteredContacts: ChatContact[];
  mode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
  onCreateDirectChat: (participantId: number) => void;
  onCreateGroupChat: (input: { title: string; participantIds: number[] }) => void;
  onOpenThread: (contactId: string) => void;
  onOpenVideo: (contactId: string) => void;
  onOpenVoice: (contactId: string) => void;
  onQueryChange: (query: string) => void;
  query: string;
  sessionName?: string;
};

export function ChatHomeLayout({
  activeChatId,
  chatMessages,
  chatUsers,
  contacts,
  filteredContacts,
  mode,
  onCreateDirectChat,
  onCreateGroupChat,
  onModeChange,
  onOpenThread,
  onOpenVideo,
  onOpenVoice,
  onQueryChange,
  query,
  sessionName,
}: ChatHomeLayoutProps) {
  const { width } = useWindowDimensions();
  const [groupTitle, setGroupTitle] = useState("Creator circle");
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const isWide = width >= 1040;

  const activeContact = useMemo(
    () => contacts.find((item) => item.id === activeChatId) ?? filteredContacts[0] ?? contacts[0] ?? null,
    [activeChatId, contacts, filteredContacts],
  );

  const previewMessages = useMemo(() => chatMessages.slice(-3), [chatMessages]);

  function toggleUser(userId: number) {
    setSelectedUserIds((current) => (
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId]
    ));
  }

  return (
    <ScrollView
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: 120 }}
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: chatPalette.page }}
    >
      <View
        style={{
          borderRadius: 32,
          borderWidth: 1,
          borderColor: chatPalette.border,
          backgroundColor: chatPalette.shell,
          padding: spacing.lg,
          gap: spacing.md,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm }}>
          <View style={{ gap: 4 }}>
            <Text style={{ color: chatPalette.soft, fontSize: 12, fontWeight: "800" as const }}>Chat layout</Text>
            <Text style={{ color: chatPalette.ink, fontSize: 24, fontWeight: "900" as const }}>Messages</Text>
          </View>

          <View style={{ flexDirection: "row", gap: spacing.xs }}>
            <TopOrb icon="menu" onPress={() => router.push("/settings")} />
            <TopOrb badge="3" icon="notifications-outline" />
          </View>
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.sm,
            borderRadius: 24,
            borderWidth: 1,
            borderColor: chatPalette.border,
            backgroundColor: chatPalette.panel,
            paddingHorizontal: spacing.md,
            minHeight: 48,
          }}
        >
          <Ionicons color={chatPalette.soft} name="search" size={16} />
          <TextInput
            onChangeText={onQueryChange}
            placeholder="Search chat, people, groups"
            placeholderTextColor={chatPalette.soft}
            style={{ flex: 1, color: chatPalette.ink, fontSize: 13 }}
            value={query}
          />
          <Ionicons color={chatPalette.accentAlt} name="options-outline" size={16} />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingRight: spacing.sm }}>
          {contacts.slice(0, 8).map((contact) => (
            <Pressable
              key={contact.id}
              onPress={() => onOpenThread(contact.id)}
              style={{ width: 68, alignItems: "center", gap: 6 }}
            >
              <LinearGradient
                colors={contact.id === activeChatId ? [chatPalette.accent, chatPalette.accentAlt] : ["#20314e", "#172337"]}
                style={{ width: 58, height: 58, borderRadius: radius.pill, padding: 2 }}
              >
                <View
                  style={{
                    flex: 1,
                    borderRadius: radius.pill,
                    backgroundColor: chatPalette.shell,
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                  }}
                >
                  <Image source={chatAvatar(contact.name)} style={{ width: 52, height: 52, borderRadius: radius.pill }} />
                </View>
              </LinearGradient>
              <Text numberOfLines={1} style={{ color: chatPalette.soft, fontSize: 11, fontWeight: "800" as const }}>
                {firstName(contact.name)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

          <View style={{ flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" }}>
            <StatCard label="Rooms" value={`${filteredContacts.length}`} />
            <StatCard label="Call ready" value={activeContact ? firstName(activeContact.name) : "Now"} accent />
            <StatCard label="Groups" value={`${contacts.filter((contact) => contact.type === "group").length}`} />
          </View>

          <View
            style={{
              borderRadius: 24,
              borderWidth: 1,
              borderColor: chatPalette.border,
              backgroundColor: chatPalette.panelSoft,
              padding: spacing.md,
              gap: spacing.sm,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm }}>
              <Text style={{ color: chatPalette.ink, fontSize: 15, fontWeight: "900" as const }}>New chatroom</Text>
              <Text style={{ color: chatPalette.soft, fontSize: 11, fontWeight: "800" as const }}>{selectedUserIds.length} selected</Text>
            </View>

            <TextInput
              onChangeText={setGroupTitle}
              placeholder="Group name"
              placeholderTextColor={chatPalette.soft}
              style={{
                minHeight: 42,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: chatPalette.border,
                backgroundColor: chatPalette.panel,
                color: chatPalette.ink,
                paddingHorizontal: spacing.sm,
                fontSize: 13,
              }}
              value={groupTitle}
            />

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingRight: spacing.sm }}>
              {chatUsers.slice(0, 8).map((user) => {
                const active = selectedUserIds.includes(user.id);
                return (
                  <Pressable
                    key={user.id}
                    onPress={() => toggleUser(user.id)}
                    style={{
                      width: 76,
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
                      {firstName(user.name)}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <Pressable
                disabled={!selectedUserIds[0]}
                onPress={() => selectedUserIds[0] ? onCreateDirectChat(selectedUserIds[0]) : undefined}
                style={{
                  flex: 1,
                  minHeight: 40,
                  borderRadius: radius.pill,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: selectedUserIds[0] ? chatPalette.panel : "rgba(255,255,255,0.04)",
                  borderWidth: 1,
                  borderColor: chatPalette.border,
                }}
              >
                <Text style={{ color: selectedUserIds[0] ? chatPalette.ink : chatPalette.soft, fontSize: 12, fontWeight: "900" as const }}>Direct</Text>
              </Pressable>
              <Pressable
                disabled={selectedUserIds.length < 2}
                onPress={() => {
                  onCreateGroupChat({ title: groupTitle, participantIds: selectedUserIds });
                  setSelectedUserIds([]);
                }}
                style={{
                  flex: 1,
                  minHeight: 40,
                  borderRadius: radius.pill,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: selectedUserIds.length >= 2 ? chatPalette.accent : "rgba(255,255,255,0.04)",
                }}
              >
                <Text style={{ color: selectedUserIds.length >= 2 ? chatPalette.black : chatPalette.soft, fontSize: 12, fontWeight: "900" as const }}>Group</Text>
              </Pressable>
            </View>
          </View>
        </View>

      <View style={{ flexDirection: isWide ? "row" : "column", gap: spacing.md, alignItems: "stretch" }}>
        <View style={{ flex: isWide ? 1.08 : 0, gap: spacing.md }}>
          <View style={{ flexDirection: "row", gap: 4, borderRadius: radius.pill, padding: 4, backgroundColor: chatPalette.panel }}>
            {(["Pinned", "Chats", "Groups"] as const).map((item) => {
              const active = item === mode;
              return (
                <Pressable
                  key={item}
                  onPress={() => onModeChange(item)}
                  style={{
                    flex: 1,
                    minHeight: 36,
                    borderRadius: radius.pill,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: active ? chatPalette.ink : "transparent",
                  }}
                >
                  <Text style={{ color: active ? chatPalette.page : chatPalette.soft, fontSize: 12, fontWeight: "900" as const }}>
                    {item}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={{ gap: spacing.sm }}>
            {filteredContacts.map((contact, index) => (
              <ChatContactRow
                active={contact.id === activeChatId}
                contact={contact}
                key={contact.id}
                onPress={() => onOpenThread(contact.id)}
                pinned={mode === "Pinned" || index < 2}
              />
            ))}
          </View>
        </View>

        <View style={{ flex: 1, gap: spacing.md }}>
          <LinearGradient
            colors={["#152237", "#102031", "#0f1b2a"]}
            style={{
              borderRadius: 30,
              borderWidth: 1,
              borderColor: chatPalette.border,
              padding: spacing.lg,
              gap: spacing.md,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm }}>
              <Text style={{ color: chatPalette.soft, fontSize: 12, fontWeight: "800" as const }}>Chat flow preview</Text>
              <Text style={{ color: chatPalette.accent, fontSize: 12, fontWeight: "900" as const }}>
                {activeContact ? presenceLabel(activeContact.updatedAt) : "Connect now"}
              </Text>
            </View>

            {activeContact ? (
              <View
                style={{
                  flexDirection: width > 640 ? "row" : "column",
                  alignItems: width > 640 ? "center" : "flex-start",
                  gap: spacing.md,
                }}
              >
                <Image source={chatAvatar(activeContact.name)} style={{ width: 78, height: 78, borderRadius: radius.pill }} />

                <View style={{ flex: 1, gap: 6 }}>
                  <Text style={{ color: chatPalette.ink, fontSize: 22, fontWeight: "900" as const }}>
                    {activeContact.name}
                  </Text>
                  <Text style={{ color: chatPalette.soft, fontSize: 13 }}>
                    {activeContact.type === "group" ? `${activeContact.participantCount} members` : activeContact.subtitle}
                  </Text>
                  <Text style={{ color: chatPalette.accentWarm, fontSize: 12, fontWeight: "800" as const }}>
                    {previewBadge(activeContact.id)} shared moments waiting
                  </Text>
                </View>
              </View>
            ) : null}

            <View style={{ flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" }}>
              {activeContact ? (
                <>
                  <CallActionButton icon="chatbubble-ellipses-outline" label="Thread" onPress={() => onOpenThread(activeContact.id)} />
                  <CallActionButton icon="call-outline" label="Voice" onPress={() => onOpenVoice(activeContact.id)} />
                  <CallActionButton icon="videocam-outline" label="Video" onPress={() => onOpenVideo(activeContact.id)} />
                </>
              ) : null}
            </View>

            <View style={{ gap: spacing.sm }}>
              {previewMessages.length ? (
                previewMessages.map((message) => (
                  <ChatMessageBubble
                    author={message.own ? "You" : message.sender.name}
                    body={message.body}
                    key={message.id}
                    own={message.own}
                    timeLabel="now"
                  />
                ))
              ) : (
                <View
                  style={{
                    borderRadius: 22,
                    borderWidth: 1,
                    borderColor: chatPalette.border,
                    backgroundColor: chatPalette.panelSoft,
                    padding: spacing.md,
                    gap: spacing.xs,
                  }}
                >
                  <Text style={{ color: chatPalette.ink, fontSize: 15, fontWeight: "800" as const }}>Your thread pages are ready</Text>
                  <Text style={{ color: chatPalette.soft, fontSize: 13 }}>
                    Tap any contact to open the dedicated chat thread, voice call, or video call page.
                  </Text>
                </View>
              )}
            </View>
          </LinearGradient>

          <View
            style={{
              borderRadius: 28,
              borderWidth: 1,
              borderColor: chatPalette.border,
              backgroundColor: chatPalette.shell,
              padding: spacing.lg,
              gap: spacing.md,
            }}
          >
            <Text style={{ color: chatPalette.ink, fontSize: 18, fontWeight: "900" as const }}>
              Active for {sessionName ?? "you"}
            </Text>

            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              {[1, 2, 3].map((item) => (
                <Image
                  key={item}
                  source={{ uri: `https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80&sig=chat-${item}` }}
                  style={{ flex: 1, aspectRatio: 0.9, borderRadius: 22 }}
                />
              ))}
            </View>

            <Text style={{ color: chatPalette.soft, fontSize: 13 }}>
              A cleaner inbox, quicker jump into calls, and a dedicated thread page when any chat is opened.
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

function TopOrb({
  badge,
  icon,
  onPress,
}: {
  badge?: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        width: 40,
        height: 40,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: chatPalette.border,
        backgroundColor: chatPalette.panel,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Ionicons color={chatPalette.ink} name={icon} size={18} />
      {badge ? (
        <View
          style={{
            position: "absolute",
            right: 1,
            top: 1,
            minWidth: 16,
            height: 16,
            borderRadius: radius.pill,
            backgroundColor: chatPalette.accentWarm,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 4,
          }}
        >
          <Text style={{ color: chatPalette.page, fontSize: 10, fontWeight: "900" as const }}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function StatCard({
  accent,
  label,
  value,
}: {
  accent?: boolean;
  label: string;
  value: string;
}) {
  return (
    <View
      style={{
        flex: 1,
        minWidth: 104,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: chatPalette.border,
        backgroundColor: accent ? chatPalette.spotlight : chatPalette.panel,
        padding: spacing.md,
        gap: 4,
      }}
    >
      <Text style={{ color: chatPalette.soft, fontSize: 11, fontWeight: "800" as const }}>{label}</Text>
      <Text style={{ color: accent ? chatPalette.accent : chatPalette.ink, fontSize: 18, fontWeight: "900" as const }}>
        {value}
      </Text>
    </View>
  );
}
