import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { Pressable, Text, View } from "react-native";

import type { LiveRoom } from "@/src/services/api";
import { palette, radius, spacing } from "@/src/theme/tokens";

export function ChannelCard({
  room,
  onPress,
}: {
  room: LiveRoom;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={{ width: 178 }}>
      <View
        style={{
          overflow: "hidden",
          borderRadius: radius.xl,
          borderWidth: 1,
          borderColor: palette.stroke,
          backgroundColor: palette.panelRaised,
        }}
      >
        <Image source={{ uri: `https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=80&sig=${room.id}` }} style={{ width: "100%", aspectRatio: 0.86 }} />
        <LinearGradient colors={["transparent", "rgba(0,0,0,0.9)"]} style={{ position: "absolute", left: 0, right: 0, bottom: 0, top: 0 }} />
        <View style={{ position: "absolute", left: spacing.sm, top: spacing.sm, borderRadius: radius.pill, backgroundColor: palette.accent, paddingHorizontal: spacing.sm, paddingVertical: 6 }}>
          <Text style={{ color: palette.black, fontWeight: "900", fontSize: 11 }}>{Math.max(18, Math.floor(room.viewers / 1000))}k viewers</Text>
        </View>
        <View style={{ position: "absolute", left: spacing.sm, right: spacing.sm, bottom: spacing.sm }}>
          <Text numberOfLines={2} style={{ color: palette.text, fontWeight: "900", fontSize: 15 }}>{room.title}</Text>
          <Text style={{ color: "rgba(255,255,255,0.65)", marginTop: 4 }}>{room.host}</Text>
        </View>
      </View>
    </Pressable>
  );
}
