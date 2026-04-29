import { Image } from "expo-image";
import { Pressable, Text, View } from "react-native";

import {
  chatAvatar,
  chatPalette,
  presenceLabel,
  presenceStatus,
  previewBadge,
  shortTime
} from "@/src/features/chat/chat-theme";
import type { ChatContact } from "@/src/services/api";
import { radius, spacing } from "@/src/theme/tokens";

export function ChatContactRow({
  active,
  contact,
  onPress,
  pinned,
}: {
  active: boolean;
  contact: ChatContact;
  onPress: () => void;
  pinned?: boolean;
}) {
  const badgeCount = previewBadge(contact.id);
  const status = presenceStatus(contact.updatedAt);
  const statusColor =
    status === "online"
      ? chatPalette.accentStrong
      : status === "away"
        ? chatPalette.accentWarm
        : chatPalette.soft;

  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
        borderRadius: 26,
        borderWidth: 1,
        borderColor: active ? chatPalette.accent : chatPalette.border,
        backgroundColor: active ? chatPalette.shellRaised : chatPalette.shell,
        padding: spacing.md,
      }}
    >
      <View>
        <Image source={chatAvatar(contact.name)} style={{ width: 56, height: 56, borderRadius: radius.pill }} />
        <View
          style={{
            position: "absolute",
            right: 1,
            bottom: 1,
            width: 14,
            height: 14,
            borderRadius: radius.pill,
            backgroundColor: statusColor,
            borderWidth: 2,
            borderColor: chatPalette.shell,
          }}
        />
      </View>

      <View style={{ flex: 1, gap: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm }}>
          <Text numberOfLines={1} style={{ color: chatPalette.ink, fontSize: 15, fontWeight: "900" as const }}>
            {contact.name}
          </Text>
          <Text style={{ color: chatPalette.soft, fontSize: 11, fontWeight: "800" as const }}>
            {shortTime(contact.updatedAt)}
          </Text>
        </View>

        <Text numberOfLines={1} style={{ color: chatPalette.soft, fontSize: 13 }}>
          {contact.lastBody || (contact.type === "group" ? `${contact.participantCount} members` : contact.subtitle)}
        </Text>

        <Text numberOfLines={1} style={{ color: statusColor, fontSize: 11, fontWeight: "800" as const }}>
          {presenceLabel(contact.updatedAt)}
        </Text>
      </View>

      <View style={{ alignItems: "flex-end", gap: 8 }}>
        <View
          style={{
            minWidth: 24,
            height: 24,
            borderRadius: radius.pill,
            backgroundColor: pinned ? "rgba(124, 168, 255, 0.18)" : "rgba(109, 233, 183, 0.18)",
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 8,
          }}
        >
          <Text
            style={{
              color: pinned ? chatPalette.accentAlt : chatPalette.accent,
              fontSize: 10,
              fontWeight: "900" as const,
            }}
          >
            {pinned ? "Pinned" : badgeCount}
          </Text>
        </View>
        <Text style={{ color: chatPalette.soft, fontSize: 10, fontWeight: "800" as const }}>
          {contact.type === "group" ? "Group" : contact.subtitle}
        </Text>
      </View>
    </Pressable>
  );
}
