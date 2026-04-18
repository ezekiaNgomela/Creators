import { ReactNode } from "react";
import { BlurView } from "expo-blur";
import { View, type ViewStyle } from "react-native";

type GlassPanelProps = {
  children: ReactNode;
  style?: ViewStyle;
};

export function GlassPanel({ children, style }: GlassPanelProps) {
  return (
    <BlurView
      intensity={45}
      tint="dark"
      style={[
        {
          overflow: "hidden",
          borderRadius: 28,
          borderWidth: 1,
          borderColor: "rgba(255, 255, 255, 0.08)",
          backgroundColor: "rgba(8, 15, 31, 0.74)",
        },
        style,
      ]}
    >
      <View
        style={{
          gap: 18,
          padding: 20,
        }}
      >
        {children}
      </View>
    </BlurView>
  );
}
