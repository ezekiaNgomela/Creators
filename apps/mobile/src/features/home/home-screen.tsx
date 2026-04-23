import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { ChannelCard } from "@/src/components/cards/channel-card";
import { NotificationPill } from "@/src/components/cards/notification-pill";
import { PromotionCard } from "@/src/components/cards/promotion-card";
import { HomeHighlight } from "@/src/components/highlights/home-highlight";
import { useApp } from "@/src/providers/app-provider";
import { stylex } from "@/src/theme/stylex";
import { palette, radius, spacing } from "@/src/theme/tokens";

export function HomeScreen() {
  const { displayPosts, health, liveRooms, openLive, profile, session } = useApp();
  const [activeFilter, setActiveFilter] = useState("Trend");

  const featuredRoom = useMemo(() => {
    if (!liveRooms.length) {
      return null;
    }
    if (activeFilter === "Local") {
      return liveRooms[liveRooms.length - 1];
    }
    if (activeFilter === "Global") {
      return [...liveRooms].sort((left, right) => right.viewers - left.viewers)[0];
    }
    return liveRooms[0];
  }, [activeFilter, liveRooms]);

  const filteredPosts = useMemo(() => {
    if (activeFilter === "Local") {
      return [...displayPosts].reverse();
    }
    if (activeFilter === "Global") {
      return [...displayPosts].sort((left, right) => right.likes - left.likes);
    }
    return [...displayPosts].sort((left, right) => right.promotionScore - left.promotionScore);
  }, [activeFilter, displayPosts]);

  return (
    <ScrollView
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: 120 }}
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: palette.bg }}
    >
      <HomeHighlight
        activeFilter={activeFilter}
        filters={["Local", "Global", "Trend"]}
        liveRooms={liveRooms}
        onChangeFilter={setActiveFilter}
        onOpenLive={openLive}
        sessionName={session?.name}
        title="Creators"
      />

      {featuredRoom ? (
        <Pressable
          onPress={() => openLive(featuredRoom)}
          style={{
            overflow: "hidden",
            borderRadius: radius.xl,
            borderWidth: 1,
            borderColor: palette.stroke,
            backgroundColor: palette.panelRaised,
          }}
        >
          <Image
            source={{ uri: `https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?auto=format&fit=crop&w=1000&q=80&sig=home-${featuredRoom.id}` }}
            style={{ width: "100%", aspectRatio: 1.12 }}
          />
          <LinearGradient colors={["transparent", "rgba(6,8,14,0.96)"]} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} />
          <View style={{ position: "absolute", left: spacing.lg, right: spacing.lg, bottom: spacing.lg, gap: spacing.sm }}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
              <NotificationPill label={profile?.headline ?? "Digital creator"} />
              <NotificationPill label={health?.status === "ok" ? "Backend live" : "Backend syncing"} />
              <NotificationPill label={`${Math.max(18, Math.floor(featuredRoom.viewers / 1000))}k watching`} />
            </View>
            <Text style={{ color: palette.accentWarm, fontWeight: "900", textTransform: "uppercase", letterSpacing: 1.1 }}>Highlight live</Text>
            <Text style={{ color: palette.text, fontSize: 30, fontWeight: "900" }}>{featuredRoom.title}</Text>
            <Text style={{ color: "rgba(255,255,255,0.75)", lineHeight: 22 }}>
              {featuredRoom.host} is streaming {featuredRoom.topic.toLowerCase()} right now. Tap in and keep the same visual flow from web to mobile.
            </Text>
          </View>
        </Pressable>
      ) : null}

      <View style={{ gap: spacing.md }}>
        <Text style={styles.title}>Highlight live</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md }}>
          {liveRooms.map((room) => (
            <ChannelCard key={room.id} onPress={() => openLive(room)} room={room} />
          ))}
        </ScrollView>
      </View>

      <View style={{ gap: spacing.md }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={styles.title}>Home feed</Text>
          <Text style={{ color: palette.textMuted, fontWeight: "800" }}>{activeFilter}</Text>
        </View>
        {filteredPosts.slice(0, 3).map((post) => (
          <PromotionCard
            key={post.id}
            body={post.body}
            image={post.gallery[0]}
            score={post.promotionScore}
            title={`${post.author.name} - ${post.mood}`}
          />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = stylex.create({
  title: {
    color: palette.text,
    fontSize: 24,
    fontWeight: "900" as const,
  },
});
