import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";

import type { LiveRoom } from "@/src/services/api";
import { palette, radius, spacing } from "@/src/theme/tokens";

type HomeHighlightProps = {
  activeFilter: string;
  filters: string[];
  liveRooms: LiveRoom[];
  onChangeFilter: (value: string) => void;
  onOpenLive: (room: LiveRoom) => void;
  sessionName?: string;
  title?: string;
};

export function HomeHighlight({
  activeFilter,
  filters,
  liveRooms,
  onChangeFilter,
  onOpenLive,
  sessionName,
  title = "Creators",
}: HomeHighlightProps) {
  return (
    <View
      style={{
        borderRadius: radius.xl,
        borderWidth: 1,
        borderColor: palette.stroke,
        backgroundColor: palette.headerGlass,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: spacing.sm,
          minHeight: 58,
          paddingHorizontal: spacing.md,
          paddingTop: spacing.sm,
          paddingBottom: spacing.xs,
        }}
      >
        <Pressable
          onPress={() => router.replace("/(tabs)/home")}
          style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, flexShrink: 1 }}
        >
          <LinearGradient
            colors={[palette.accentWarm, palette.accentHot]}
            style={{
              width: 34,
              height: 34,
              borderRadius: 12,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: palette.text, fontWeight: "900", fontSize: 16 }}>C</Text>
          </LinearGradient>
          <View style={{ flexShrink: 1 }}>
            <Text style={{ color: palette.text, fontWeight: "900", fontSize: 17 }} numberOfLines={1}>
              {title}
            </Text>
            <Text style={{ color: palette.textMuted, fontSize: 12 }} numberOfLines={1}>
              top-bar + highlight-live
            </Text>
          </View>
        </Pressable>

        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
          <HeaderAction icon="search" />
          <HeaderAction badge="2" icon="notifications-outline" onPress={() => router.push("/settings")} />
          <Pressable
            onPress={() => router.push("/(tabs)/profile")}
            style={{
              width: 38,
              height: 38,
              borderRadius: radius.pill,
              borderWidth: 1,
              borderColor: palette.stroke,
              overflow: "hidden",
              backgroundColor: palette.panelRaised,
            }}
          >
            <Image
              source={{ uri: `https://api.dicebear.com/8.x/lorelei/png?seed=${encodeURIComponent(sessionName ?? "creator")}` }}
              style={{ width: "100%", height: "100%" }}
            />
          </Pressable>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          gap: spacing.sm,
          paddingHorizontal: spacing.sm,
          paddingTop: spacing.xs,
          paddingBottom: spacing.sm,
          alignItems: "flex-start",
        }}
      >
        <Pressable style={{ width: 66, alignItems: "center", gap: 6 }}>
          <LinearGradient
            colors={[palette.storyAdd, palette.accentHot]}
            style={{
              width: 56,
              height: 56,
              borderRadius: radius.pill,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons color={palette.text} name="add" size={24} />
          </LinearGradient>
          <Text style={{ color: palette.textMuted, fontSize: 11, fontWeight: "900" }} numberOfLines={1}>
            Add live
          </Text>
        </Pressable>

        {liveRooms.map((room, index) => (
          <StoryBubble
            key={room.id}
            label={firstName(room.host)}
            live={room.status === "live" || index === 0}
            onPress={() => onOpenLive(room)}
            seed={room.host}
          />
        ))}

        <StoryBubble label="You" seed={sessionName ?? "you"} />
      </ScrollView>

      <View
        style={{
          flexDirection: "row",
          gap: 4,
          marginHorizontal: spacing.md,
          marginBottom: spacing.md,
          borderRadius: radius.pill,
          padding: 4,
          backgroundColor: palette.filterBg,
        }}
      >
        {filters.map((item) => {
          const active = item === activeFilter;
          return (
            <Pressable
              key={item}
              onPress={() => onChangeFilter(item)}
              style={{
                flex: 1,
                minHeight: 32,
                borderRadius: radius.pill,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: active ? palette.filterActive : "transparent",
              }}
            >
              <Text
                style={{
                  color: active ? palette.filterActiveText : palette.filterText,
                  fontSize: 12,
                  fontWeight: "900",
                }}
              >
                {item}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function HeaderAction({
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
        borderWidth: 1,
        borderColor: palette.stroke,
        backgroundColor: "rgba(255,255,255,0.08)",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Ionicons color={palette.text} name={icon} size={18} />
      {badge ? (
        <View
          style={{
            position: "absolute",
            right: 2,
            top: 2,
            minWidth: 16,
            height: 16,
            borderRadius: radius.pill,
            backgroundColor: palette.accentHot,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 4,
          }}
        >
          <Text style={{ color: palette.text, fontSize: 10, fontWeight: "900" }}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function StoryBubble({
  label,
  live,
  onPress,
  seed,
}: {
  label: string;
  live?: boolean;
  onPress?: () => void;
  seed: string;
}) {
  return (
    <Pressable onPress={onPress} style={{ width: 66, alignItems: "center", gap: 6 }}>
      <LinearGradient
        colors={live ? [palette.accentWarm, palette.accentHot] : ["#5d6c92", "#33476d"]}
        style={{
          width: 58,
          height: 58,
          borderRadius: radius.pill,
          padding: 2,
        }}
      >
        <View
          style={{
            flex: 1,
            borderRadius: radius.pill,
            backgroundColor: palette.bg,
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          <Image
            source={{ uri: `https://api.dicebear.com/8.x/lorelei/png?seed=${encodeURIComponent(seed)}` }}
            style={{ width: 52, height: 52, borderRadius: radius.pill }}
          />
        </View>
      </LinearGradient>

      {live ? (
        <View
          style={{
            position: "absolute",
            bottom: 20,
            minWidth: 42,
            borderRadius: radius.pill,
            paddingHorizontal: 8,
            paddingVertical: 3,
            backgroundColor: palette.accentHot,
          }}
        >
          <Text style={{ color: palette.text, fontSize: 10, fontWeight: "900", textAlign: "center" }}>LIVE</Text>
        </View>
      ) : null}

      <Text style={{ color: palette.textMuted, fontSize: 11, fontWeight: "900" }} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

function firstName(value: string) {
  return value.split(/\s+/)[0] ?? value;
}
