import { Text, View } from "react-native";

import { palette, radius, spacing } from "@/src/theme/tokens";

export function NotificationPill({ label }: { label: string }) {
  return (
    <View
      style={{
        borderRadius: radius.pill,
        backgroundColor: palette.panelRaised,
        borderWidth: 1,
        borderColor: palette.stroke,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
      }}
    >
      <Text style={{ color: palette.textMuted, fontWeight: "800", fontSize: 12 }}>{label}</Text>
    </View>
  );
}
