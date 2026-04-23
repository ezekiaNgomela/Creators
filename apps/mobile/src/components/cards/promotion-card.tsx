import { Image } from "expo-image";
import { Text, View } from "react-native";

import { palette, radius, spacing } from "@/src/theme/tokens";

export function PromotionCard({
  body,
  image,
  score,
  title,
}: {
  body: string;
  image: string;
  score: number;
  title: string;
}) {
  return (
    <View
      style={{
        overflow: "hidden",
        borderRadius: radius.xl,
        borderWidth: 1,
        borderColor: palette.stroke,
        backgroundColor: palette.panelRaised,
      }}
    >
      <Image source={{ uri: image }} style={{ width: "100%", aspectRatio: 1.3 }} />
      <View style={{ padding: spacing.md }}>
        <Text style={{ color: palette.text, fontWeight: "900", fontSize: 16 }}>{title}</Text>
        <Text style={{ color: palette.textMuted, marginTop: spacing.xs, lineHeight: 20 }}>{body}</Text>
        <Text style={{ color: palette.accent, fontWeight: "800", marginTop: spacing.sm }}>{score}% promotion pulse</Text>
      </View>
    </View>
  );
}
