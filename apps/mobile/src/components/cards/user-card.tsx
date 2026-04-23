import { Image } from "expo-image";
import { Pressable, Text, View } from "react-native";

import { palette, radius, spacing } from "@/src/theme/tokens";

export function UserCard({
  name,
  subtitle,
  onPress,
}: {
  name: string;
  subtitle: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: palette.stroke,
        backgroundColor: palette.panelRaised,
        padding: spacing.md,
      }}
    >
      <Image
        source={{ uri: `https://api.dicebear.com/8.x/lorelei/png?seed=${encodeURIComponent(name)}` }}
        style={{ width: 52, height: 52, borderRadius: 999 }}
      />
      <View style={{ flex: 1 }}>
        <Text style={{ color: palette.text, fontWeight: "800" }}>{name}</Text>
        <Text style={{ color: palette.textMuted, marginTop: 2 }}>{subtitle}</Text>
      </View>
    </Pressable>
  );
}
