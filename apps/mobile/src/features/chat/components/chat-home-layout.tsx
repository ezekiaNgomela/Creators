import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { chatAvatar, chatPalette, firstName, presenceStatus, shortTime } from "@/src/features/chat/chat-theme";
import type { ChatMode } from "@/src/features/chat/chat-screen";
import type { ChatContact } from "@/src/services/api";
import { radius, spacing } from "@/src/theme/tokens";

type ChatHomeLayoutProps = {
  activeChatId: string;
  contacts: ChatContact[];
  filteredContacts: ChatContact[];
  mode: ChatMode;
  notificationCount: number;
  onModeChange: (mode: ChatMode) => void;
  onOpenNotifications: () => void;
  onOpenThread: (contactId: string) => void;
  onQueryChange: (query: string) => void;
  query: string;
  sessionName?: string;
};

const filterItems: ChatMode[] = ["Inbox", "Sents", "Group"];

export function ChatHomeLayout({
  activeChatId,
  contacts,
  filteredContacts,
  mode,
  notificationCount,
  onModeChange,
  onOpenNotifications,
  onOpenThread,
  onQueryChange,
  query,
  sessionName,
}: ChatHomeLayoutProps) {
  return (
    <ScrollView
      contentContainerStyle={{ padding: spacing.sm, gap: spacing.sm, paddingBottom: 104 }}
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: chatPalette.page }}
    >
      <View style={{ minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm }}>
        <Pressable
          onPress={() => router.back()}
          style={{ width: 38, height: 38, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", backgroundColor: chatPalette.shell }}
        >
          <Ionicons color={chatPalette.ink} name="arrow-back" size={18} />
        </Pressable>

        <View style={{ flex: 1 }}>
          <Text style={{ color: chatPalette.ink, fontSize: 22, fontWeight: "900" as const }}>Messages</Text>
          <Text style={{ color: chatPalette.soft, fontSize: 11, fontWeight: "800" as const }}>
            {sessionName ? `${firstName(sessionName)}'s chat home` : "Chat home"}
          </Text>
        </View>

        <View style={{ flexDirection: "row", gap: spacing.xs }}>
          <HeaderIcon icon="search" />
          <HeaderIcon badge={notificationCount ? String(notificationCount) : undefined} icon="notifications-outline" onPress={onOpenNotifications} />
          <HeaderIcon icon="settings-outline" onPress={() => router.push("/settings")} />
        </View>
      </View>

      <View style={{ minHeight: 42, borderRadius: radius.pill, backgroundColor: chatPalette.shell, borderWidth: 1, borderColor: chatPalette.border, flexDirection: "row", alignItems: "center", gap: spacing.xs, paddingHorizontal: spacing.sm }}>
        <Ionicons color={chatPalette.soft} name="search" size={15} />
        <TextInput
          onChangeText={onQueryChange}
          placeholder="Search inbox or contacts"
          placeholderTextColor={chatPalette.soft}
          style={{ flex: 1, color: chatPalette.ink, fontSize: 13, paddingVertical: 0 }}
          value={query}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingRight: spacing.sm }}>
        {contacts.map((contact) => (
          <Pressable key={contact.id} onPress={() => onOpenThread(contact.id)} style={{ width: 64, alignItems: "center", gap: 6 }}>
            <View style={{ width: 56, height: 56, borderRadius: radius.pill, borderWidth: 2, borderColor: contact.id === activeChatId ? chatPalette.accent : chatPalette.border, padding: 2 }}>
              <Image source={chatAvatar(contact.name)} style={{ width: "100%", height: "100%", borderRadius: radius.pill }} />
              <PresenceDot value={contact.updatedAt} />
            </View>
            <Text numberOfLines={1} style={{ color: chatPalette.soft, fontSize: 10, fontWeight: "800" as const }}>{firstName(contact.name)}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={{ flexDirection: "row", borderRadius: radius.pill, backgroundColor: chatPalette.shell, padding: 4, gap: 4 }}>
        {filterItems.map((item) => {
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
                backgroundColor: active ? chatPalette.accent : "transparent",
              }}
            >
              <Text style={{ color: active ? chatPalette.black : chatPalette.soft, fontSize: 12, fontWeight: "900" as const }}>{item}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ gap: spacing.xs }}>
        <View style={{ minHeight: 30, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ color: chatPalette.ink, fontSize: 16, fontWeight: "900" as const }}>{mode}</Text>
          <Text style={{ color: chatPalette.soft, fontSize: 11, fontWeight: "800" as const }}>{filteredContacts.length} chats</Text>
        </View>

        {filteredContacts.map((contact, index) => (
          <ChatCard
            active={contact.id === activeChatId}
            contact={contact}
            key={contact.id}
            mode={mode}
            onPress={() => onOpenThread(contact.id)}
            status={statusFor(contact, index, mode)}
          />
        ))}

        {!filteredContacts.length ? (
          <View style={{ borderRadius: 24, borderWidth: 1, borderColor: chatPalette.border, backgroundColor: chatPalette.shell, padding: spacing.lg, alignItems: "center", gap: spacing.xs }}>
            <Ionicons color={chatPalette.soft} name="chatbubbles-outline" size={24} />
            <Text style={{ color: chatPalette.ink, fontSize: 15, fontWeight: "900" as const }}>No chats here</Text>
            <Text style={{ color: chatPalette.soft, fontSize: 12, textAlign: "center" }}>Try another filter or start a direct room from a user profile.</Text>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

function ChatCard({
  active,
  contact,
  mode,
  onPress,
  status,
}: {
  active: boolean;
  contact: ChatContact;
  mode: ChatMode;
  onPress: () => void;
  status: "received" | "notready" | "pending";
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        minHeight: 78,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: active ? chatPalette.accent : chatPalette.border,
        backgroundColor: active ? chatPalette.glow : chatPalette.shell,
        padding: spacing.sm,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
      }}
    >
      <View style={{ width: 52, height: 52, borderRadius: radius.pill }}>
        <Image source={chatAvatar(contact.name)} style={{ width: "100%", height: "100%", borderRadius: radius.pill }} />
        <PresenceDot value={contact.updatedAt} />
      </View>

      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
          <Text numberOfLines={1} style={{ flex: 1, color: chatPalette.ink, fontSize: 15, fontWeight: "900" as const }}>
            {contact.name}
          </Text>
          <Text style={{ color: chatPalette.soft, fontSize: 10, fontWeight: "800" as const }}>{shortTime(contact.updatedAt)}</Text>
        </View>
        <Text numberOfLines={1} style={{ color: chatPalette.soft, fontSize: 12, fontWeight: "700" as const }}>
          {mode === "Sents" ? `You: ${contact.lastBody || "Message sent"}` : contact.lastBody || contact.subtitle || "Open the chatroom"}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
          <StatusPill status={status} />
          {contact.type === "group" ? <Text style={{ color: chatPalette.accentAlt, fontSize: 10, fontWeight: "900" as const }}>{contact.participantCount} members</Text> : null}
        </View>
      </View>

      <Ionicons color={active ? chatPalette.accent : chatPalette.soft} name="chevron-forward" size={16} />
    </Pressable>
  );
}

function HeaderIcon({ badge, icon, onPress }: { badge?: string; icon: keyof typeof Ionicons.glyphMap; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ width: 36, height: 36, borderRadius: radius.pill, backgroundColor: chatPalette.shell, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: chatPalette.border }}>
      <Ionicons color={chatPalette.ink} name={icon} size={16} />
      {badge ? (
        <View style={{ position: "absolute", right: -1, top: -1, minWidth: 15, height: 15, borderRadius: radius.pill, backgroundColor: chatPalette.accentWarm, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 }}>
          <Text style={{ color: chatPalette.black, fontSize: 9, fontWeight: "900" as const }}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function PresenceDot({ value }: { value?: string }) {
  const status = presenceStatus(value);
  const backgroundColor = status === "online" ? chatPalette.accentStrong : status === "away" ? chatPalette.accentWarm : chatPalette.soft;
  return (
    <View style={{ position: "absolute", right: 2, bottom: 2, width: 12, height: 12, borderRadius: radius.pill, borderWidth: 2, borderColor: chatPalette.shell, backgroundColor }} />
  );
}

function StatusPill({ status }: { status: "received" | "notready" | "pending" }) {
  const tone = status === "received" ? chatPalette.accent : status === "pending" ? chatPalette.accentWarm : chatPalette.soft;
  return (
    <View style={{ borderRadius: radius.pill, backgroundColor: "rgba(255,255,255,0.06)", paddingHorizontal: spacing.xs, paddingVertical: 4 }}>
      <Text style={{ color: tone, fontSize: 10, fontWeight: "900" as const }}>{status}</Text>
    </View>
  );
}

function statusFor(contact: ChatContact, index: number, mode: ChatMode): "received" | "notready" | "pending" {
  if (mode === "Sents") {
    return index % 2 === 0 ? "received" : "pending";
  }
  if (contact.type === "group" && contact.participantCount < 2) {
    return "notready";
  }
  return index % 4 === 0 ? "pending" : "received";
}
