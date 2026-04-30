import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, useWindowDimensions, View } from "react-native";

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
  notificationCount: number;
  onModeChange: (mode: ChatMode) => void;
  onCreateDirectChat: (participantId: number) => void;
  onCreateGroupChat: (input: { title: string; participantIds: number[] }) => void;
  onOpenNotifications: () => void;
  onOpenThread: (contactId: string) => void;
  onOpenVideo: (contactId: string) => void;
  onOpenVoice: (contactId: string) => void;
  onQueryChange: (query: string) => void;
  query: string;
  sessionName?: string;
};

type MobilePane = "activity" | "room" | "info";

export function ChatHomeLayout({
  activeChatId,
  chatMessages,
  chatUsers,
  contacts,
  filteredContacts,
  mode,
  notificationCount,
  onCreateDirectChat,
  onCreateGroupChat,
  onModeChange,
  onOpenNotifications,
  onOpenThread,
  onOpenVideo,
  onOpenVoice,
  onQueryChange,
  query,
  sessionName,
}: ChatHomeLayoutProps) {
  const { width } = useWindowDimensions();
  const [groupTitle, setGroupTitle] = useState("Creator circle");
  const [mobilePane, setMobilePane] = useState<MobilePane>("activity");
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const isWide = width >= 980;

  const activeContact = useMemo(
    () => contacts.find((item) => item.id === activeChatId) ?? filteredContacts[0] ?? contacts[0] ?? null,
    [activeChatId, contacts, filteredContacts],
  );
  const previewMessages = useMemo(() => chatMessages.slice(-4), [chatMessages]);

  function toggleUser(userId: number) {
    setSelectedUserIds((current) => (
      current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId]
    ));
  }

  function openThread(contactId: string) {
    onOpenThread(contactId);
    setMobilePane("room");
  }

  return (
    <ScrollView
      contentContainerStyle={{ padding: spacing.sm, gap: spacing.sm, paddingBottom: 104 }}
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: chatPalette.page }}
    >
      {!isWide ? (
        <View style={{ flexDirection: "row", borderRadius: radius.pill, backgroundColor: chatPalette.shell, padding: 4, gap: 4 }}>
          {(["activity", "room", "info"] as const).map((pane) => (
            <Pressable
              key={pane}
              onPress={() => setMobilePane(pane)}
              style={{
                flex: 1,
                minHeight: 34,
                borderRadius: radius.pill,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: mobilePane === pane ? chatPalette.accent : "transparent",
              }}
            >
              <Text style={{ color: mobilePane === pane ? chatPalette.black : chatPalette.soft, fontSize: 11, fontWeight: "900" as const }}>
                {pane === "activity" ? "Activity" : pane === "room" ? "Chatroom" : "Info"}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={{ flexDirection: isWide ? "row" : "column", gap: spacing.sm, alignItems: "stretch" }}>
        {(isWide || mobilePane === "activity") ? (
          <ActivityPane
            activeChatId={activeChatId}
            chatUsers={chatUsers}
            contacts={contacts}
            filteredContacts={filteredContacts}
            groupTitle={groupTitle}
            mode={mode}
            notificationCount={notificationCount}
            onCreateDirectChat={onCreateDirectChat}
            onCreateGroupChat={onCreateGroupChat}
            onModeChange={onModeChange}
            onOpenNotifications={onOpenNotifications}
            onOpenThread={openThread}
            onQueryChange={onQueryChange}
            query={query}
            selectedUserIds={selectedUserIds}
            sessionName={sessionName}
            setGroupTitle={setGroupTitle}
            setSelectedUserIds={setSelectedUserIds}
            toggleUser={toggleUser}
          />
        ) : null}

        {(isWide || mobilePane === "room") ? (
          <ChatRoomPane
            activeContact={activeContact}
            messages={previewMessages}
            onOpenThread={openThread}
            onOpenVideo={onOpenVideo}
            onOpenVoice={onOpenVoice}
          />
        ) : null}

        {(isWide || mobilePane === "info") ? (
          <InfoPane
            activeContact={activeContact}
            chatMessages={chatMessages}
            contacts={contacts}
            onOpenThread={openThread}
            sessionName={sessionName}
          />
        ) : null}
      </View>
    </ScrollView>
  );
}

function ActivityPane({
  activeChatId,
  chatUsers,
  contacts,
  filteredContacts,
  groupTitle,
  mode,
  notificationCount,
  onCreateDirectChat,
  onCreateGroupChat,
  onModeChange,
  onOpenNotifications,
  onOpenThread,
  onQueryChange,
  query,
  selectedUserIds,
  sessionName,
  setGroupTitle,
  setSelectedUserIds,
  toggleUser,
}: {
  activeChatId: string;
  chatUsers: ChatUser[];
  contacts: ChatContact[];
  filteredContacts: ChatContact[];
  groupTitle: string;
  mode: ChatMode;
  notificationCount: number;
  onCreateDirectChat: (participantId: number) => void;
  onCreateGroupChat: (input: { title: string; participantIds: number[] }) => void;
  onModeChange: (mode: ChatMode) => void;
  onOpenNotifications: () => void;
  onOpenThread: (contactId: string) => void;
  onQueryChange: (query: string) => void;
  query: string;
  selectedUserIds: number[];
  sessionName?: string;
  setGroupTitle: (value: string) => void;
  setSelectedUserIds: (value: number[]) => void;
  toggleUser: (userId: number) => void;
}) {
  return (
    <View style={{ flex: 0.9, minWidth: 0, borderRadius: 28, borderWidth: 1, borderColor: chatPalette.border, backgroundColor: chatPalette.shell, padding: spacing.sm, gap: spacing.sm }}>
      <View style={{ minHeight: 42, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
          <View style={{ width: 32, height: 32, borderRadius: 12, backgroundColor: chatPalette.panel, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: chatPalette.ink, fontSize: 14, fontWeight: "900" as const }}>{sessionName?.slice(0, 1).toUpperCase() ?? "C"}</Text>
          </View>
          <Text style={{ color: chatPalette.ink, fontSize: 22, fontWeight: "900" as const }}>Chats</Text>
        </View>
        <View style={{ flexDirection: "row", gap: spacing.xs }}>
          <TopOrb icon="search" />
          <TopOrb badge={notificationCount ? String(notificationCount) : undefined} icon="notifications-outline" onPress={onOpenNotifications} />
          <TopOrb icon="settings-outline" onPress={() => router.push("/settings")} />
        </View>
      </View>

      <View style={{ minHeight: 42, borderRadius: radius.pill, borderWidth: 1, borderColor: chatPalette.border, backgroundColor: chatPalette.panel, flexDirection: "row", alignItems: "center", gap: spacing.xs, paddingHorizontal: spacing.sm }}>
        <Ionicons color={chatPalette.soft} name="search" size={15} />
        <TextInput
          onChangeText={onQueryChange}
          placeholder="Search chat, people, inbox"
          placeholderTextColor={chatPalette.soft}
          style={{ flex: 1, color: chatPalette.ink, fontSize: 13, paddingVertical: 0 }}
          value={query}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingRight: spacing.sm }}>
        {contacts.slice(0, 8).map((contact) => (
          <Pressable key={contact.id} onPress={() => onOpenThread(contact.id)} style={{ width: 58, alignItems: "center", gap: 5 }}>
            <LinearGradient colors={contact.id === activeChatId ? [chatPalette.accent, chatPalette.accentAlt] : ["#20314e", "#172337"]} style={{ width: 50, height: 50, borderRadius: radius.pill, padding: 2 }}>
              <Image source={chatAvatar(contact.name)} style={{ width: "100%", height: "100%", borderRadius: radius.pill }} />
            </LinearGradient>
            <Text numberOfLines={1} style={{ color: chatPalette.soft, fontSize: 10, fontWeight: "800" as const }}>{firstName(contact.name)}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={{ flexDirection: "row", gap: 4, borderRadius: radius.pill, padding: 4, backgroundColor: chatPalette.panel }}>
        {(["Pinned", "Chats", "Groups"] as const).map((item) => {
          const active = item === mode;
          return (
            <Pressable key={item} onPress={() => onModeChange(item)} style={{ flex: 1, minHeight: 34, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", backgroundColor: active ? chatPalette.ink : "transparent" }}>
              <Text style={{ color: active ? chatPalette.page : chatPalette.soft, fontSize: 11, fontWeight: "900" as const }}>{item}</Text>
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

      <View style={{ borderRadius: 22, borderWidth: 1, borderColor: chatPalette.border, backgroundColor: chatPalette.panelSoft, padding: spacing.sm, gap: spacing.sm }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ color: chatPalette.ink, fontSize: 14, fontWeight: "900" as const }}>New room</Text>
          <Text style={{ color: chatPalette.soft, fontSize: 11, fontWeight: "800" as const }}>{selectedUserIds.length} selected</Text>
        </View>
        <TextInput
          onChangeText={setGroupTitle}
          placeholder="Group name"
          placeholderTextColor={chatPalette.soft}
          style={{ minHeight: 40, borderRadius: 16, borderWidth: 1, borderColor: chatPalette.border, backgroundColor: chatPalette.panel, color: chatPalette.ink, paddingHorizontal: spacing.sm, fontSize: 12 }}
          value={groupTitle}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.xs, paddingRight: spacing.sm }}>
          {chatUsers.slice(0, 8).map((user) => {
            const active = selectedUserIds.includes(user.id);
            return (
              <Pressable key={user.id} onPress={() => toggleUser(user.id)} onLongPress={() => onCreateDirectChat(user.id)} style={{ width: 56, borderRadius: 17, borderWidth: 1, borderColor: active ? chatPalette.accent : chatPalette.border, backgroundColor: active ? chatPalette.glow : chatPalette.panel, padding: 5, alignItems: "center", gap: 5 }}>
                <Image source={chatAvatar(user.name)} style={{ width: 32, height: 32, borderRadius: radius.pill }} />
                <Text numberOfLines={1} style={{ color: active ? chatPalette.accent : chatPalette.soft, fontSize: 9, fontWeight: "900" as const }}>{firstName(user.name)}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <View style={{ flexDirection: "row", gap: spacing.xs }}>
          <Pressable disabled={!selectedUserIds[0]} onPress={() => selectedUserIds[0] ? onCreateDirectChat(selectedUserIds[0]) : undefined} style={{ flex: 1, minHeight: 38, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", backgroundColor: selectedUserIds[0] ? chatPalette.panel : "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: chatPalette.border }}>
            <Text style={{ color: selectedUserIds[0] ? chatPalette.ink : chatPalette.soft, fontSize: 11, fontWeight: "900" as const }}>Direct</Text>
          </Pressable>
          <Pressable disabled={selectedUserIds.length < 2} onPress={() => { onCreateGroupChat({ title: groupTitle, participantIds: selectedUserIds }); setSelectedUserIds([]); }} style={{ flex: 1, minHeight: 38, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", backgroundColor: selectedUserIds.length >= 2 ? chatPalette.accent : "rgba(255,255,255,0.04)" }}>
            <Text style={{ color: selectedUserIds.length >= 2 ? chatPalette.black : chatPalette.soft, fontSize: 11, fontWeight: "900" as const }}>Group</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function ChatRoomPane({
  activeContact,
  messages,
  onOpenThread,
  onOpenVideo,
  onOpenVoice,
}: {
  activeContact: ChatContact | null;
  messages: ChatMessage[];
  onOpenThread: (contactId: string) => void;
  onOpenVideo: (contactId: string) => void;
  onOpenVoice: (contactId: string) => void;
}) {
  return (
    <LinearGradient colors={["#30394e", "#252b3c", "#202536"]} style={{ flex: 1.25, minWidth: 0, borderRadius: 28, borderWidth: 1, borderColor: chatPalette.border, padding: spacing.sm, gap: spacing.sm }}>
      <View style={{ minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, flex: 1 }}>
          <Image source={chatAvatar(activeContact?.name ?? "chat")} style={{ width: 42, height: 42, borderRadius: radius.pill }} />
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={{ color: chatPalette.ink, fontSize: 16, fontWeight: "900" as const }}>{activeContact?.name ?? "Chatroom"}</Text>
            <Text numberOfLines={1} style={{ color: chatPalette.soft, fontSize: 11, fontWeight: "800" as const }}>{activeContact?.type === "group" ? `${activeContact.participantCount} members` : activeContact?.subtitle ?? "Online"}</Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: spacing.xs }}>
          {activeContact ? <HeaderCallButton icon="call-outline" onPress={() => onOpenVoice(activeContact.id)} /> : null}
          {activeContact ? <HeaderCallButton icon="videocam-outline" onPress={() => onOpenVideo(activeContact.id)} /> : null}
        </View>
      </View>

      <View style={{ borderRadius: 20, backgroundColor: "rgba(255,255,255,0.07)", padding: spacing.sm, gap: spacing.xs }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm }}>
          <Text style={{ color: chatPalette.ink, fontSize: 14, fontWeight: "900" as const }}>Design System Meeting</Text>
          <Pressable disabled={!activeContact} onPress={() => activeContact ? onOpenThread(activeContact.id) : undefined} style={{ borderRadius: radius.pill, backgroundColor: chatPalette.accent, paddingHorizontal: spacing.sm, paddingVertical: 7 }}>
            <Text style={{ color: chatPalette.black, fontSize: 11, fontWeight: "900" as const }}>Join</Text>
          </Pressable>
        </View>
        <Text style={{ color: chatPalette.soft, fontSize: 11, fontWeight: "800" as const }}>teleport.video/creators/live-room</Text>
      </View>

      <View style={{ gap: spacing.sm, minHeight: 280 }}>
        {messages.length ? (
          messages.map((message) => (
            <ChatMessageBubble
              author={message.own ? "You" : message.sender.name}
              body={message.body}
              key={message.id}
              own={message.own}
              timeLabel="now"
            />
          ))
        ) : (
          <View style={{ borderRadius: 22, borderWidth: 1, borderColor: chatPalette.border, backgroundColor: chatPalette.panelSoft, padding: spacing.md, gap: spacing.xs }}>
            <Text style={{ color: chatPalette.ink, fontSize: 15, fontWeight: "800" as const }}>Your chatroom is ready</Text>
            <Text style={{ color: chatPalette.soft, fontSize: 12 }}>Tap any contact to open their full thread and call history.</Text>
          </View>
        )}
      </View>
    </LinearGradient>
  );
}

function HeaderCallButton({ icon, onPress }: { icon: keyof typeof Ionicons.glyphMap; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ width: 36, height: 36, borderRadius: radius.pill, backgroundColor: chatPalette.panel, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: chatPalette.border }}>
      <Ionicons color={chatPalette.ink} name={icon} size={17} />
    </Pressable>
  );
}

function InfoPane({
  activeContact,
  chatMessages,
  contacts,
  onOpenThread,
  sessionName,
}: {
  activeContact: ChatContact | null;
  chatMessages: ChatMessage[];
  contacts: ChatContact[];
  onOpenThread: (contactId: string) => void;
  sessionName?: string;
}) {
  return (
    <View style={{ flex: 0.82, minWidth: 0, borderRadius: 28, borderWidth: 1, borderColor: chatPalette.border, backgroundColor: chatPalette.shell, padding: spacing.sm, gap: spacing.sm }}>
      <View style={{ alignItems: "center", gap: 6, paddingVertical: spacing.xs }}>
        <Image source={chatAvatar(activeContact?.name ?? sessionName ?? "creator")} style={{ width: 72, height: 72, borderRadius: radius.pill }} />
        <Text numberOfLines={1} style={{ color: chatPalette.ink, fontSize: 18, fontWeight: "900" as const }}>{activeContact?.name ?? "Connection info"}</Text>
        <Text numberOfLines={1} style={{ color: chatPalette.soft, fontSize: 12 }}>{activeContact?.type === "group" ? `${activeContact.participantCount} members` : activeContact?.subtitle ?? "Tap a conversation"}</Text>
        <Text style={{ color: chatPalette.accentWarm, fontSize: 11, fontWeight: "800" as const }}>{activeContact ? previewBadge(activeContact.id) : "History, media, files"}</Text>
      </View>

      <View style={{ flexDirection: "row", gap: spacing.xs }}>
        {[1, 2, 3, 4].map((item) => (
          <Image key={item} source={{ uri: `https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80&sig=mobile-chat-${item}` }} style={{ flex: 1, aspectRatio: 0.9, borderRadius: 16 }} />
        ))}
      </View>

      <View style={{ gap: spacing.xs }}>
        <InfoRow icon="images-outline" label="Media exchanges" value={`${Math.max(chatMessages.length, 4)} items`} />
        <InfoRow icon="document-text-outline" label="Shared files" value="15 total" />
        <InfoRow icon="time-outline" label="History" value={activeContact ? presenceLabel(activeContact.updatedAt) : "No active room"} />
      </View>

      <View style={{ gap: spacing.xs }}>
        <Text style={{ color: chatPalette.soft, fontSize: 11, fontWeight: "900" as const }}>Recent inbox</Text>
        {contacts.slice(0, 3).map((contact) => (
          <Pressable key={contact.id} onPress={() => onOpenThread(contact.id)} style={{ minHeight: 44, borderRadius: 16, backgroundColor: chatPalette.panel, paddingHorizontal: spacing.sm, flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
            <Image source={chatAvatar(contact.name)} style={{ width: 30, height: 30, borderRadius: radius.pill }} />
            <Text numberOfLines={1} style={{ flex: 1, color: chatPalette.ink, fontSize: 12, fontWeight: "800" as const }}>{contact.name}</Text>
            <Ionicons color={chatPalette.soft} name="chevron-forward" size={14} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function InfoRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={{ minHeight: 44, borderRadius: 16, backgroundColor: chatPalette.panel, paddingHorizontal: spacing.sm, flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
      <Ionicons color={chatPalette.accent} name={icon} size={17} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: chatPalette.ink, fontSize: 12, fontWeight: "900" as const }}>{label}</Text>
        <Text style={{ color: chatPalette.soft, fontSize: 11 }}>{value}</Text>
      </View>
    </View>
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
        width: 34,
        height: 34,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: chatPalette.border,
        backgroundColor: chatPalette.panel,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Ionicons color={chatPalette.ink} name={icon} size={16} />
      {badge ? (
        <View style={{ position: "absolute", right: -1, top: -1, minWidth: 15, height: 15, borderRadius: radius.pill, backgroundColor: chatPalette.accentWarm, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 }}>
          <Text style={{ color: chatPalette.page, fontSize: 9, fontWeight: "900" as const }}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}
