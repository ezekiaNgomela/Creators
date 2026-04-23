import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";

import type { DisplayPost } from "@/src/providers/app-provider";
import type { HealthResponse, LiveRoom, ProfileResponse } from "@/src/services/api";
import { HomePostCard } from "@/src/features/home/components/home-post-card";
import { radius, spacing } from "@/src/theme/tokens";

const homeColors = {
  page: "#f8efe5",
  section: "#fff6ec",
  sectionBorder: "rgba(255, 161, 110, 0.16)",
  ink: "#352821",
  soft: "#9a8474",
  accent: "#ff986f",
  accentStrong: "#ff5f66",
  accentGlow: "rgba(255, 152, 111, 0.22)",
  actionBg: "rgba(255,255,255,0.72)",
  filterBg: "#f3e3d6",
  filterActive: "#ffffff",
};

type HomeLayoutProps = {
  displayPosts: DisplayPost[];
  health: HealthResponse | null;
  liveRooms: LiveRoom[];
  onOpenLive: (room: LiveRoom) => void;
  profile: ProfileResponse | null;
  sessionName?: string;
};

export function HomeLayout({
  displayPosts,
  health,
  liveRooms,
  onOpenLive,
  profile,
  sessionName,
}: HomeLayoutProps) {
  const [activeFilter, setActiveFilter] = useState<"Local" | "Global" | "Trend">("Trend");
  const { width } = useWindowDimensions();

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

  const columns = useMemo(() => {
    const count = width >= 1320 ? 3 : width >= 900 ? 2 : 1;
    return distributeIntoColumns(filteredPosts.slice(0, 9), count);
  }, [filteredPosts, width]);

  return (
    <View style={{ gap: spacing.lg }}>
      <View
        style={{
          borderRadius: 34,
          borderWidth: 1,
          borderColor: homeColors.sectionBorder,
          backgroundColor: homeColors.section,
          padding: spacing.lg,
          gap: spacing.md,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
            <LinearGradient
              colors={[homeColors.accent, homeColors.accentStrong]}
              style={{
                width: 34,
                height: 34,
                borderRadius: 14,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "900" as const, fontSize: 15 }}>C</Text>
            </LinearGradient>
            <View>
              <Text style={{ color: homeColors.soft, fontSize: 12, fontWeight: "800" as const }}>Discover</Text>
              <Text style={{ color: homeColors.ink, fontSize: 18, fontWeight: "900" as const }}>Creators</Text>
            </View>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
            <TopAction icon="menu" onPress={() => router.push("/settings")} />
            <TopAction icon="notifications-outline" badge="2" />
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing.sm, alignItems: "flex-start", paddingRight: spacing.sm }}
        >
          <StoryBubble kind="add" label="Add story" />
          {liveRooms.map((room, index) => (
            <StoryBubble
              key={room.id}
              label={firstName(room.host)}
              live={room.status === "live" || index === 0}
              onPress={() => onOpenLive(room)}
              seed={room.host}
            />
          ))}
          <StoryBubble label="You" seed={sessionName ?? "creator"} />
        </ScrollView>

        {featuredRoom ? (
          <Pressable
            onPress={() => onOpenLive(featuredRoom)}
            style={{
              overflow: "hidden",
              borderRadius: 28,
              backgroundColor: "#fff",
            }}
          >
            <Image
              source={{ uri: `https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=1200&q=80&sig=hero-${featuredRoom.id}` }}
              style={{ width: "100%", aspectRatio: width >= 900 ? 1.85 : 1.1 }}
            />
            <LinearGradient
              colors={["rgba(255,255,255,0.02)", "rgba(38,20,10,0.82)"]}
              style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
            />
            <View style={{ position: "absolute", left: spacing.lg, right: spacing.lg, top: spacing.lg }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View
                  style={{
                    borderRadius: radius.pill,
                    backgroundColor: "rgba(255,255,255,0.84)",
                    paddingHorizontal: spacing.sm,
                    paddingVertical: 6,
                  }}
                >
                  <Text style={{ color: homeColors.accentStrong, fontSize: 11, fontWeight: "900" as const }}>
                    {activeFilter} feed
                  </Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Ionicons color="#fff" name="heart" size={14} />
                  <Text style={{ color: "#fff", fontWeight: "800" as const, fontSize: 12 }}>
                    {Math.max(18, Math.floor(featuredRoom.viewers / 1000))}k
                  </Text>
                </View>
              </View>
            </View>
            <View style={{ position: "absolute", left: spacing.lg, right: spacing.lg, bottom: spacing.lg, gap: spacing.xs }}>
              <Text style={{ color: "#fff", fontSize: 26, fontWeight: "900" as const }}>{featuredRoom.title}</Text>
              <Text style={{ color: "rgba(255,255,255,0.84)", fontSize: 13 }}>
                {featuredRoom.host} is live in {featuredRoom.topic.toLowerCase()}
              </Text>
            </View>
          </Pressable>
        ) : null}

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm }}>
          <Text style={{ color: homeColors.soft, fontSize: 12, fontWeight: "800" as const }}>
            {profile?.headline ?? "Creator stories"}
          </Text>
          <Text style={{ color: homeColors.soft, fontSize: 12, fontWeight: "800" as const }}>
            {health?.status === "ok" ? "Backend live" : "Syncing"}
          </Text>
        </View>
      </View>

      <View
        style={{
          flexDirection: "row",
          gap: 4,
          borderRadius: radius.pill,
          padding: 4,
          backgroundColor: homeColors.filterBg,
        }}
      >
        {(["Local", "Global", "Trend"] as const).map((item) => {
          const active = item === activeFilter;
          return (
            <Pressable
              key={item}
              onPress={() => setActiveFilter(item)}
              style={{
                flex: 1,
                minHeight: 36,
                borderRadius: radius.pill,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: active ? homeColors.filterActive : "transparent",
              }}
            >
              <Text style={{ color: active ? homeColors.ink : homeColors.soft, fontSize: 13, fontWeight: "900" as const }}>
                {item}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ gap: spacing.sm }}>
        <Text style={{ color: homeColors.ink, fontSize: 22, fontWeight: "900" as const }}>Home feed</Text>
        <Text style={{ color: homeColors.soft, fontSize: 13 }}>
          A softer editorial layout with better spacing, live discovery, and a cleaner gallery rhythm for posts.
        </Text>
      </View>

      <View style={{ flexDirection: columns.length > 1 ? "row" : "column", gap: spacing.md, alignItems: "flex-start" }}>
        {columns.map((column, index) => (
          <View
            key={`column-${index}`}
            style={{ flex: columns.length > 1 ? 1 : 0, gap: spacing.md, width: columns.length > 1 ? undefined : "100%" }}
          >
            {column.map((post) => (
              <HomePostCard key={post.id} post={post} />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

function TopAction({
  badge,
  icon,
  onPress,
}: {
  badge?: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        width: 38,
        height: 38,
        borderRadius: radius.pill,
        backgroundColor: homeColors.actionBg,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Ionicons color={homeColors.ink} name={icon} size={18} />
      {badge ? (
        <View
          style={{
            position: "absolute",
            right: 2,
            top: 2,
            minWidth: 16,
            height: 16,
            borderRadius: radius.pill,
            backgroundColor: homeColors.accentStrong,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 4,
          }}
        >
          <Text style={{ color: "#fff", fontSize: 10, fontWeight: "900" as const }}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function StoryBubble({
  kind,
  label,
  live,
  onPress,
  seed,
}: {
  kind?: "add";
  label: string;
  live?: boolean;
  onPress?: () => void;
  seed?: string;
}) {
  if (kind === "add") {
    return (
      <Pressable style={{ width: 64, alignItems: "center", gap: 6 }}>
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: radius.pill,
            backgroundColor: "rgba(255, 152, 111, 0.18)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons color={homeColors.accent} name="add" size={22} />
        </View>
        <Text numberOfLines={1} style={{ color: homeColors.soft, fontSize: 11, fontWeight: "800" as const }}>
          {label}
        </Text>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={onPress} style={{ width: 64, alignItems: "center", gap: 6 }}>
      <LinearGradient
        colors={live ? [homeColors.accent, homeColors.accentStrong] : ["#e8d3c4", "#d5c0b0"]}
        style={{
          width: 56,
          height: 56,
          borderRadius: radius.pill,
          padding: 2,
        }}
      >
        <View
          style={{
            flex: 1,
            borderRadius: radius.pill,
            backgroundColor: "#fff8f1",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          <Image
            source={{ uri: `https://api.dicebear.com/8.x/lorelei/png?seed=${encodeURIComponent(seed ?? label)}` }}
            style={{ width: 50, height: 50, borderRadius: radius.pill }}
          />
        </View>
      </LinearGradient>
      {live ? (
        <View
          style={{
            position: "absolute",
            bottom: 20,
            borderRadius: radius.pill,
            paddingHorizontal: 7,
            paddingVertical: 3,
            backgroundColor: homeColors.accentStrong,
          }}
        >
          <Text style={{ color: "#fff", fontSize: 9, fontWeight: "900" as const }}>LIVE</Text>
        </View>
      ) : null}
      <Text numberOfLines={1} style={{ color: homeColors.soft, fontSize: 11, fontWeight: "800" as const }}>
        {label}
      </Text>
    </Pressable>
  );
}

function firstName(value: string) {
  return value.split(/\s+/)[0] ?? value;
}

function distributeIntoColumns(posts: DisplayPost[], count: number) {
  const columns = Array.from({ length: count }, () => [] as DisplayPost[]);
  posts.forEach((post, index) => {
    columns[index % count].push(post);
  });
  return columns;
}
