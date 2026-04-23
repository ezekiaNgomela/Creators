import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { ScrollView, Text, View } from "react-native";

import { ChannelCard } from "@/src/components/cards/channel-card";
import { NotificationPill } from "@/src/components/cards/notification-pill";
import { PromotionCard } from "@/src/components/cards/promotion-card";
import { UserCard } from "@/src/components/cards/user-card";
import { useApp } from "@/src/providers/app-provider";
import { stylex } from "@/src/theme/stylex";
import { palette, spacing } from "@/src/theme/tokens";

export function HomeScreen() {
  const { displayPosts, liveRooms, openLive, profile, session } = useApp();

  return (
    <ScrollView
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: 120 }}
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: palette.bg }}
    >
      <LinearGradient
        colors={["#091222", "#12314d", "#0b111d"]}
        style={{ borderRadius: 34, overflow: "hidden", padding: spacing.xl }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View>
            <Text style={{ color: palette.accent, fontWeight: "900", textTransform: "uppercase", letterSpacing: 1.2 }}>Creators home</Text>
            <Text style={{ color: palette.text, fontSize: 34, fontWeight: "900", marginTop: spacing.sm }}>Wild social feed</Text>
          </View>
          <Image source={{ uri: `https://api.dicebear.com/8.x/lorelei/png?seed=${encodeURIComponent(session?.name ?? "creator")}` }} style={{ width: 56, height: 56, borderRadius: 999 }} />
        </View>
        <Text style={{ color: "rgba(255,255,255,0.72)", lineHeight: 22, marginTop: spacing.md }}>
          Highlights, promotions, live rooms, and creator energy in one mobile-native feed.
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.lg }}>
          <NotificationPill label={profile?.headline ?? "Digital creator"} />
          <NotificationPill label="Live rooms ready" />
          <NotificationPill label="Promotion active" />
        </View>
      </LinearGradient>

      <View>
        <Text style={[styles.title, { marginBottom: spacing.md }]}>Highlights</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md }}>
          {liveRooms.map((room) => (
            <ChannelCard key={room.id} onPress={() => openLive(room)} room={room} />
          ))}
        </ScrollView>
      </View>

      <View>
        <Text style={[styles.title, { marginBottom: spacing.md }]}>Connected creators</Text>
        <View style={{ gap: spacing.sm }}>
          {liveRooms.slice(0, 3).map((room) => (
            <UserCard key={room.id} name={room.host} onPress={() => openLive(room)} subtitle={`${Math.max(18, Math.floor(room.viewers / 1000))}k viewers live now`} />
          ))}
        </View>
      </View>

      <View style={{ gap: spacing.md }}>
        <Text style={styles.title}>Promoted posts</Text>
        {displayPosts.slice(0, 3).map((post) => (
          <PromotionCard
            key={post.id}
            body={post.body}
            image={post.gallery[0]}
            score={post.promotionScore}
            title={`${post.author.name} · ${post.mood}`}
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
