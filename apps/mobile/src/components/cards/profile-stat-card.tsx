import { Text, View } from "react-native";

import { palette, radius, spacing } from "@/src/theme/tokens";

export function ProfileStatCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View
      style={{
        flex: 1,
        minWidth: 98,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: palette.stroke,
        backgroundColor: palette.panelRaised,
        padding: spacing.md,
      }}
    >
      <Text style={{ color: palette.textMuted, fontWeight: "700", textTransform: "uppercase", fontSize: 11 }}>{label}</Text>
      <Text style={{ color: palette.text, fontWeight: "900", fontSize: 22, marginTop: spacing.xs }}>{value}</Text>
    </View>
  );
}
