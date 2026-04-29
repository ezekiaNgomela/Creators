import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { chatPalette } from "@/src/features/chat/chat-theme";
import { radius, spacing } from "@/src/theme/tokens";

export function CallActionButton({
  glass,
  icon,
  label,
  onPress,
  tone = "default",
}: {
  glass?: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  tone?: "accent" | "danger" | "default";
}) {
  const backgroundColor = glass
    ? "rgba(15, 23, 33, 0.78)"
    : tone === "danger"
      ? chatPalette.danger
      : tone === "accent"
        ? chatPalette.accent
        : chatPalette.panel;
  const textColor = tone === "danger" || tone === "accent" ? chatPalette.black : chatPalette.ink;

  return (
    <Pressable
      onPress={onPress}
      style={{
        minWidth: 88,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: glass && tone === "default" ? "rgba(255,255,255,0.14)" : chatPalette.border,
        backgroundColor,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
      }}
    >
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: radius.pill,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: tone === "danger" || tone === "accent" ? "rgba(5, 7, 12, 0.12)" : "rgba(255,255,255,0.04)",
        }}
      >
        <Ionicons color={textColor} name={icon} size={18} />
      </View>
      <Text style={{ color: textColor, fontSize: 12, fontWeight: "900" as const }}>{label}</Text>
    </Pressable>
  );
}
