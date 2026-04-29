import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import type { LiveRoom } from "@/src/services/api";
import { radius, spacing } from "@/src/theme/tokens";

const eventColors = {
  shell: "#151d2c",
  border: "rgba(132, 150, 188, 0.14)",
  ink: "#f6f8ff",
  soft: "#95a3c4",
  accent: "#8da2ff",
  accentStrong: "#69e1c6",
};

export function LiveScheduleCard({
  room,
  onPress,
}: {
  room: LiveRoom;
  onPress?: () => void;
}) {
  const countdown = getCountdown(room.startsAt);

  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "stretch",
        gap: spacing.sm,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: eventColors.border,
        backgroundColor: eventColors.shell,
        padding: spacing.sm,
      }}
    >
      <View style={{ flex: 1, justifyContent: "space-between", gap: spacing.xs }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm }}>
          <View
            style={{
              borderRadius: radius.pill,
              backgroundColor: "rgba(141,162,255,0.16)",
              paddingHorizontal: spacing.sm,
              paddingVertical: 5,
            }}
          >
            <Text style={{ color: eventColors.accent, fontSize: 10, fontWeight: "900" as const }}>Scheduled</Text>
          </View>
          <Text style={{ color: eventColors.soft, fontSize: 11, fontWeight: "800" as const }}>{formatStartsAt(room.startsAt)}</Text>
        </View>

        <View style={{ gap: 3 }}>
          <Text numberOfLines={1} style={{ color: eventColors.ink, fontSize: 15, fontWeight: "900" as const }}>{room.title}</Text>
          <Text numberOfLines={1} style={{ color: eventColors.soft, fontSize: 12 }}>{room.host}</Text>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, flexWrap: "wrap" }}>
          <Metric icon="calendar-outline" label={formatEventDay(room.startsAt)} />
          <Metric icon="sparkles" label={room.topic} />
        </View>
      </View>

      <View
        style={{
          width: 84,
          borderRadius: 16,
          backgroundColor: `rgba(141,162,255,${countdown.opacity})`,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: spacing.xs,
          paddingVertical: spacing.sm,
        }}
      >
        <Text style={{ color: eventColors.soft, fontSize: 10, fontWeight: "800" as const }}>Starts in</Text>
        <Text style={{ color: eventColors.ink, fontSize: 18, fontWeight: "900" as const }}>{countdown.label}</Text>
        <Ionicons color={eventColors.accentStrong} name="arrow-forward-circle" size={18} style={{ marginTop: 6 }} />
      </View>
    </Pressable>
  );
}

function Metric({
  icon,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <Ionicons color={eventColors.accentStrong} name={icon} size={14} />
      <Text style={{ color: eventColors.ink, fontSize: 12, fontWeight: "800" as const }}>{label}</Text>
    </View>
  );
}

function formatStartsAt(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatEventDay(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
  }).format(date);
}

function getCountdown(value: string) {
  const diff = Math.max(0, new Date(value).getTime() - Date.now());
  const minutes = Math.ceil(diff / (1000 * 60));
  const hours = Math.ceil(diff / (1000 * 60 * 60));
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

  if (minutes < 60) {
    return { label: `${minutes}m`, opacity: 0.34 };
  }
  if (hours < 24) {
    return { label: `${hours}h`, opacity: 0.26 };
  }
  return { label: `${days}d`, opacity: 0.18 };
}
