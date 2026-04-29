import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { useMemo, useState } from "react";
import { NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";

import type { LiveRoom } from "@/src/services/api";
import { radius, spacing } from "@/src/theme/tokens";

const showcaseColors = {
  ink: "#f6f8ff",
  soft: "rgba(246,248,255,0.72)",
  accent: "#8da2ff",
  accentStrong: "#ff7b72",
};

type LiveShowcaseSliderProps = {
  label: string;
  rooms: LiveRoom[];
  onOpenLive: (room: LiveRoom) => void;
};

export function LiveShowcaseSlider({ label, rooms, onOpenLive }: LiveShowcaseSliderProps) {
  const { width } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);

  const spotlight = useMemo(
    () => [...rooms].sort((left, right) => right.viewers - left.viewers).slice(0, 5),
    [rooms],
  );

  if (!spotlight.length) {
    return null;
  }

  const cardWidth = width >= 1200 ? 500 : width >= 900 ? 430 : Math.max(272, width - 84);
  const snap = cardWidth + spacing.md;

  function handleScrollEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / snap);
    setActiveIndex(Math.max(0, Math.min(spotlight.length - 1, nextIndex)));
  }

  return (
    <View style={{ gap: spacing.md }}>
      <View style={{ paddingHorizontal: spacing.lg, gap: 2 }}>
        <Text style={{ color: showcaseColors.ink, fontSize: 20, fontWeight: "900" as const }}>{label}</Text>
        <Text style={{ color: showcaseColors.soft, fontSize: 12 }}>
          Search-worthy highlights, featured rooms, and creator showcases with a more cinematic live feel.
        </Text>
      </View>

      <ScrollView
        horizontal
        decelerationRate="fast"
        onMomentumScrollEnd={handleScrollEnd}
        showsHorizontalScrollIndicator={false}
        snapToAlignment="start"
        snapToInterval={snap}
        contentContainerStyle={{ gap: spacing.md, paddingHorizontal: spacing.lg, paddingRight: spacing.xl }}
      >
        {spotlight.map((room, index) => (
          <Pressable
            key={room.id}
            onPress={() => onOpenLive(room)}
            style={{
              width: cardWidth,
              overflow: "hidden",
              borderRadius: 24,
              backgroundColor: "#0f1420",
            }}
          >
            <Image
              source={{ uri: `https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80&sig=showcase-${room.id}` }}
              style={{ width: "100%", aspectRatio: width >= 900 ? 1.64 : 1.02 }}
            />
            <LinearGradient
              colors={["rgba(9,13,22,0.08)", "rgba(9,13,22,0.96)"]}
              style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
            />

            <View style={{ position: "absolute", left: spacing.md, right: spacing.md, top: spacing.md, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View
                style={{
                  borderRadius: radius.pill,
                  backgroundColor: index === 0 ? showcaseColors.accentStrong : "rgba(141,162,255,0.18)",
                  paddingHorizontal: spacing.xs,
                  paddingVertical: 5,
                }}
              >
                <Text style={{ color: showcaseColors.ink, fontSize: 10, fontWeight: "900" as const }}>
                  {index === 0 ? "Top live" : "Showcase"}
                </Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Ionicons color={showcaseColors.ink} name="play-circle" size={14} />
                <Text style={{ color: showcaseColors.ink, fontSize: 11, fontWeight: "800" as const }}>
                  {Math.max(18, Math.floor(room.viewers / 1000))}k
                </Text>
              </View>
            </View>

            <View
              style={{
                position: "absolute",
                left: spacing.md,
                right: spacing.md,
                top: 0,
                bottom: 0,
                justifyContent: "center",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                <Image
                  source={{ uri: `https://api.dicebear.com/8.x/lorelei/png?seed=${encodeURIComponent(room.host)}` }}
                  style={{ width: 46, height: 46, borderRadius: radius.pill, borderWidth: 2, borderColor: "rgba(255,255,255,0.42)" }}
                />
                <View>
                  <Text style={{ color: showcaseColors.soft, fontSize: 11, fontWeight: "800" as const }}>Channel</Text>
                  <Text style={{ color: showcaseColors.ink, fontSize: 16, fontWeight: "900" as const }}>{room.host}</Text>
                </View>
              </View>
            </View>

            <View style={{ position: "absolute", left: spacing.md, right: spacing.md, bottom: spacing.md, gap: spacing.xs }}>
              <Text style={{ color: showcaseColors.ink, fontSize: 22, fontWeight: "900" as const }}>{room.title}</Text>
              <Text numberOfLines={2} style={{ color: showcaseColors.soft, fontSize: 12, lineHeight: 17 }}>
                Explore {room.topic.toLowerCase()} streams, channel showcases, and live rooms built for discovery.
              </Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xs }}>
        {spotlight.map((room, index) => (
          <View
            key={room.id}
            style={{
              width: index === activeIndex ? 24 : 8,
              height: 8,
              borderRadius: radius.pill,
              backgroundColor: index === activeIndex ? showcaseColors.accent : "rgba(255,255,255,0.2)",
            }}
          />
        ))}
      </View>
    </View>
  );
}
