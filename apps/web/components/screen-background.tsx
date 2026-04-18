import { ReactNode } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { View } from "react-native";

type ScreenBackgroundProps = {
  children: ReactNode;
};

export function ScreenBackground({ children }: ScreenBackgroundProps) {
  return (
    <LinearGradient
      colors={["#020617", "#111827", "#170b1d"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        flex: 1,
      }}
    >
      <View
        style={{
          position: "absolute",
          top: 80,
          right: -40,
          height: 180,
          width: 180,
          borderRadius: 999,
          backgroundColor: "rgba(251, 191, 36, 0.16)",
        }}
      />
      <View
        style={{
          position: "absolute",
          bottom: 100,
          left: -60,
          height: 220,
          width: 220,
          borderRadius: 999,
          backgroundColor: "rgba(56, 189, 248, 0.12)",
        }}
      />
      {children}
    </LinearGradient>
  );
}
