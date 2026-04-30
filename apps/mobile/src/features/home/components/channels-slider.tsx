import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { useMemo, useState } from "react";
import { NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";

import type { LiveRoom } from "@/src/services/api";
import { radius, spacing } from "@/src/theme/tokens";

const sliderColors = {
  shell: "#fff6ec",
  border: "rgba(255, 161, 110, 0.16)",
  ink: "#352821",
  soft: "#9a8474",
  accent: "#ff986f",
  accentStrong: "#ff5f66",
};

type ChannelsSliderProps = {
  channels: LiveRoom[];
  onOpenChannel: (room: LiveRoom) => void;
};

export function ChannelsSlider({ channels, onOpenChannel }: ChannelsSliderProps) {
  const { width } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);

  const paidChannels = useMemo(() => {
    const sorted = [...channels].sort((left, right) => right.viewers - left.viewers);
    return sorted.slice(0, 5).map((room, index) => ({
      room,
      copy: premiumCopy[index % premiumCopy.length],
      price: premiumPrices[index % premiumPrices.length],
    }));
  }, [channels]);

  if (!paidChannels.length) {
    return null;
  }

  const cardWidth = width >= 1200 ? 520 : width >= 900 ? 460 : Math.max(280, width - 72);
  const snap = cardWidth + spacing.md;

  function handleScrollEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / snap);
    setActiveIndex(Math.max(0, Math.min(paidChannels.length - 1, nextIndex)));
  }

  return (
    <View
      style={{
        borderRadius: 30,
        borderWidth: 1,
        borderColor: sliderColors.border,
        backgroundColor: sliderColors.shell,
        paddingVertical: spacing.md,
        gap: spacing.md,
      }}
    >
      <View style={{ paddingHorizontal: spacing.lg, gap: 4 }}>
        <Text style={{ color: sliderColors.ink, fontSize: 22, fontWeight: "900" as const }}>Channels slider</Text>
        <Text style={{ color: sliderColors.soft, fontSize: 13 }}>
          Paid streaming channel highlights with premium access and featured creator rooms.
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
        {paidChannels.map(({ room, copy, price }) => (
          <Pressable
            key={room.id}
            onPress={() => onOpenChannel(room)}
            style={{
              width: cardWidth, // Keep responsive width
              minHeight: 380,
              overflow: "hidden",
              borderRadius: 28,
              backgroundColor: "#fff",
            }}
          >
            <Image
              source={{ uri: `https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80&sig=channel-${room.id}` }}
              style={{ width: "100%", aspectRatio: width >= 900 ? 1.76 : 1.12 }}
            />
            <LinearGradient
              colors={["rgba(255,255,255,0.06)", "rgba(38,20,10,0.84)"]}
              style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
            />

            <View style={{ position: "absolute", left: spacing.lg, right: spacing.lg, top: spacing.lg, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View
                style={{
                  borderRadius: radius.pill,
                  backgroundColor: "rgba(255,255,255,0.88)",
                  paddingHorizontal: spacing.sm,
                  paddingVertical: 6,
                }}
              >
                <Text style={{ color: sliderColors.accentStrong, fontSize: 11, fontWeight: "900" as const }}>Paid channel</Text>
              </View>
              <View
                style={{
                  borderRadius: radius.pill,
                  backgroundColor: "rgba(255,255,255,0.18)",
                  paddingHorizontal: spacing.sm,
                  paddingVertical: 6,
                }}
              >
                <Text style={{ color: "#fff", fontSize: 11, fontWeight: "900" as const }}>{price}</Text>
              </View>
            </View>

            <Pressable
              onPress={() => onOpenChannel(room)}
              style={{
                position: 'absolute', right: spacing.lg, bottom: spacing.lg, // Move button to bottom
                backgroundColor: sliderColors.accent, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10,
                shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4.65, elevation: 8
              }}>
              <Text style={{ color: '#fff', fontWeight: '900' }}>JOIN LIVE</Text>
            </Pressable>

            <View
              style={{
                position: "absolute",
                left: spacing.lg,
                right: spacing.lg,
                top: 0,
                bottom: 0,
                justifyContent: "center",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                <Image
                  source={{ uri: `https://api.dicebear.com/8.x/lorelei/png?seed=${encodeURIComponent(room.host)}` }}
                  style={{ width: 52, height: 52, borderRadius: radius.pill, borderWidth: 2, borderColor: "rgba(255,255,255,0.52)" }}
                />
                <View>
                  <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: "800" as const }}>
                    Channel ID
                  </Text>
                  <Text style={{ color: "#fff", fontSize: 18, fontWeight: "900" as const }}>{room.host}</Text>
                </View>
              </View>
            </View>

            <View style={{ position: "absolute", left: spacing.lg, right: spacing.lg, bottom: spacing.lg, gap: spacing.xs }}>
              <Text style={{ color: "#fff", fontSize: 24, fontWeight: "900" as const }}>{room.title}</Text>
              <Text style={{ color: "rgba(255,255,255,0.84)", fontSize: 13, lineHeight: 19 }}>{copy}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: spacing.xs }}>
                <Metric icon="play-circle" label={`${Math.max(18, Math.floor(room.viewers / 1000))}k`} />
                <Metric icon="sparkles" label={room.topic} />
              </View>
            </View>
          </Pressable>
        ))}
      </ScrollView>

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xs }}>
        {paidChannels.map((item, index) => (
          <View
            key={item.room.id}
            style={{
              width: index === activeIndex ? 24 : 8,
              height: 8,
              borderRadius: radius.pill,
              backgroundColor: index === activeIndex ? sliderColors.accentStrong : "rgba(154, 132, 116, 0.36)",
            }}
          />
        ))}
      </View>
    </View>
  );
}

function Metric({
  icon,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <Ionicons color="#fff" name={icon} size={14} />
      <Text style={{ color: "#fff", fontSize: 12, fontWeight: "800" as const }}>{label}</Text>
    </View>
  );
}

const premiumPrices = ["$12 / month", "$18 access", "$24 VIP", "$16 pass", "$20 pro"];

const premiumCopy = [
  "Subscriber-only rooms with bonus stream drops and closer creator access.",
  "Premium channel highlights built for paid viewers and deeper live sessions.",
  "Exclusive streaming windows, special events, and gated creator showcases.",
  "A curated paid feed for members who want the strongest live channel picks.",
  "Featured premium broadcasts with community access and boosted visibility.",
];
