import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Pressable, Text, View } from "react-native";

import type { LiveRoom } from "@/src/services/api";
import { radius, spacing } from "@/src/theme/tokens";

const rowColors = {
  shell: "#151d2c",
  border: "rgba(132, 150, 188, 0.14)",
  ink: "#f6f8ff",
  soft: "#95a3c4",
  accent: "#69e1c6",
  accentAlt: "#ff7b72",
};

export function LiveListItem({
  room,
  onPress,
}: {
  room: LiveRoom;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: rowColors.border,
        backgroundColor: rowColors.shell,
        padding: spacing.sm,
      }}
    >
      <Image
        source={{ uri: `https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=500&q=80&sig=list-${room.id}` }}
        style={{ width: 72, height: 72, borderRadius: 18 }}
      />

      <View style={{ flex: 1, gap: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <View style={{ width: 8, height: 8, borderRadius: radius.pill, backgroundColor: rowColors.accentAlt }} />
          <Text style={{ color: rowColors.soft, fontSize: 11, fontWeight: "900" as const }}>
            {Math.max(18, Math.floor(room.viewers / 1000))}k live now
          </Text>
        </View>
        <Text numberOfLines={1} style={{ color: rowColors.ink, fontSize: 16, fontWeight: "900" as const }}>
          {room.title}
        </Text>
        <Text numberOfLines={1} style={{ color: rowColors.soft, fontSize: 12 }}>
          {room.host} · {room.topic}
        </Text>
      </View>

      <View style={{ alignItems: "flex-end", gap: 8 }}>
        <View
          style={{
            borderRadius: radius.pill,
            backgroundColor: "rgba(105,225,198,0.16)",
            paddingHorizontal: spacing.sm,
            paddingVertical: 6,
          }}
        >
          <Text style={{ color: rowColors.accent, fontSize: 11, fontWeight: "900" as const }}>Live</Text>
        </View>
        <Ionicons color={rowColors.soft} name="chevron-forward" size={18} />
      </View>
    </Pressable>
  );
}
