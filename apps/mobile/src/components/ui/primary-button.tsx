import { LinearGradient } from "expo-linear-gradient";
import { Pressable, Text } from "react-native";

import { radius, spacing } from "@/src/theme/tokens";

export function PrimaryButton({
  label,
  onPress,
}: {
  label: string;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress}>
      <LinearGradient
        colors={["#6de9b7", "#6ea8ff"]}
        style={{
          borderRadius: radius.pill,
          minHeight: 52,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: spacing.lg,
        }}
      >
        <Text style={{ color: "#081018", fontWeight: "800", fontSize: 15 }}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}
