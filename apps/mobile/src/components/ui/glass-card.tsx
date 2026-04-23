import { BlurView } from "expo-blur";
import { View } from "react-native";

import { palette, radius, spacing } from "@/src/theme/tokens";

export function GlassCard({ children }: { children: React.ReactNode }) {
  return (
    <BlurView
      intensity={24}
      style={{
        overflow: "hidden",
        borderRadius: radius.xl,
        borderWidth: 1,
        borderColor: palette.stroke,
      }}
      tint="dark"
    >
      <View
        style={{
          backgroundColor: "rgba(10,14,24,0.66)",
          padding: spacing.lg,
        }}
      >
        {children}
      </View>
    </BlurView>
  );
}
