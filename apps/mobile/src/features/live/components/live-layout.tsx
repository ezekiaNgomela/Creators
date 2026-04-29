import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { ChannelCard } from "@/src/components/cards/channel-card";
import { LiveListItem } from "@/src/features/live/components/live-list-item";
import { LiveScheduleCard } from "@/src/features/live/components/live-schedule-card";
import { LiveShowcaseSlider } from "@/src/features/live/components/live-showcase-slider";
import type { LiveIndex, LiveRoom } from "@/src/services/api";
import { radius, spacing } from "@/src/theme/tokens";

const liveColors = {
  page: "#0b111a",
  shell: "#101722",
  panel: "#151d2c",
  border: "rgba(132, 150, 188, 0.14)",
  ink: "#f6f8ff",
  soft: "#95a3c4",
  accent: "#8da2ff",
  accentStrong: "#69e1c6",
  accentAlt: "#ff7b72",
  chipBg: "#1a2434",
  chipActive: "#f6f8ff",
  chipActiveText: "#101722",
  field: "#141d2d",
};

type LiveLayoutProps = {
  liveIndex: LiveIndex | null;
  liveRooms: LiveRoom[];
  onOpenLive: (room: LiveRoom) => void;
  sessionName?: string;
};

export function LiveLayout({ liveIndex, liveRooms, onOpenLive, sessionName }: LiveLayoutProps) {
  const [mode, setMode] = useState<"Explore" | "Showcase" | "Schedule">("Explore");
  const [query, setQuery] = useState("");

  const liveNow = liveIndex?.live ?? liveRooms;
  const following = liveIndex?.following ?? [];
  const scheduled = liveIndex?.scheduled ?? [];
  const replays = liveIndex?.previous ?? [];

  const searchable = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) {
      return {
        live: liveNow,
        following,
        scheduled,
        replays,
      };
    }

    const matches = (room: LiveRoom) => {
      const haystack = `${room.title} ${room.host} ${room.topic}`.toLowerCase();
      return haystack.includes(term);
    };

    return {
      live: liveNow.filter(matches),
      following: following.filter(matches),
      scheduled: scheduled.filter(matches),
      replays: replays.filter(matches),
    };
  }, [following, liveNow, query, replays, scheduled]);

  const exploreRooms = mode === "Schedule" ? searchable.scheduled : searchable.live;
  const showcaseRooms = mode === "Showcase"
    ? (searchable.following.length ? searchable.following : searchable.live)
    : searchable.live;

  return (
    <View style={{ gap: spacing.lg }}>
      <View
        style={{
          borderRadius: 28,
          borderWidth: 1,
          borderColor: liveColors.border,
          backgroundColor: liveColors.shell,
          padding: spacing.md,
          gap: spacing.sm,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm }}>
          <View>
            <Text style={{ color: liveColors.soft, fontSize: 12, fontWeight: "800" as const }}>Search and explore</Text>
            <Text style={{ color: liveColors.ink, fontSize: 20, fontWeight: "900" as const }}>Live</Text>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
            <TopAction icon="compass-outline" />
            <TopAction icon="person-circle-outline" label={sessionName ? sessionName.slice(0, 1).toUpperCase() : "Y"} />
          </View>
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.sm,
            borderRadius: 22,
            backgroundColor: liveColors.field,
            borderWidth: 1,
            borderColor: liveColors.border,
            paddingHorizontal: spacing.sm,
            minHeight: 46,
          }}
        >
          <Ionicons color={liveColors.soft} name="search" size={16} />
          <TextInput
            onChangeText={setQuery}
            placeholder="Search live, host, topic"
            placeholderTextColor={liveColors.soft}
            style={{ flex: 1, color: liveColors.ink, fontSize: 13 }}
            value={query}
          />
          <Ionicons color={liveColors.accent} name="options-outline" size={16} />
        </View>

        <View style={{ flexDirection: "row", gap: 4, borderRadius: radius.pill, padding: 4, backgroundColor: liveColors.chipBg }}>
          {(["Explore", "Showcase", "Schedule"] as const).map((item) => {
            const active = item === mode;
            return (
              <Pressable
                key={item}
                onPress={() => setMode(item)}
                style={{
                  flex: 1,
                  minHeight: 32,
                  borderRadius: radius.pill,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: active ? liveColors.chipActive : "transparent",
                }}
              >
                <Text style={{ color: active ? liveColors.chipActiveText : liveColors.soft, fontSize: 12, fontWeight: "900" as const }}>
                  {item}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={{ flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" }}>
          <StatPill label={`${searchable.live.length} live now`} tone="accent" />
          <StatPill label={`${searchable.scheduled.length} scheduled`} tone="soft" />
          <StatPill label={`${searchable.following.length} following`} tone="soft" />
        </View>
      </View>

      <View style={{ gap: spacing.sm }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm }}>
          <Text style={{ color: liveColors.ink, fontSize: 20, fontWeight: "900" as const }}>Live now</Text>
          <Text style={{ color: liveColors.soft, fontSize: 12, fontWeight: "800" as const }}>
            {(searchable.live.length ? searchable.live : liveNow).length} rooms
          </Text>
        </View>
        <View style={{ gap: spacing.sm }}>
          {(searchable.live.length ? searchable.live : liveNow).slice(0, 3).map((room) => (
            <LiveListItem key={room.id} onPress={() => onOpenLive(room)} room={room} />
          ))}
        </View>
      </View>

      <LiveShowcaseSlider label={mode === "Schedule" ? "Event highlights" : "Showcase highlights"} rooms={showcaseRooms.length ? showcaseRooms : liveNow} onOpenLive={onOpenLive} />

      <View style={{ gap: spacing.md }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm }}>
          <Text style={{ color: liveColors.ink, fontSize: 20, fontWeight: "900" as const }}>Explore more</Text>
          <Text style={{ color: liveColors.soft, fontSize: 12, fontWeight: "800" as const }}>
            {query ? `${exploreRooms.length} matches` : "Search, swipe, enter"}
          </Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md }}>
          {(exploreRooms.length ? exploreRooms : liveNow).map((room) => (
            <ChannelCard compact key={room.id} onPress={() => onOpenLive(room)} room={room} />
          ))}
        </ScrollView>
      </View>

      <View style={{ gap: spacing.md }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm }}>
          <Text style={{ color: liveColors.ink, fontSize: 20, fontWeight: "900" as const }}>Events schedule</Text>
          <Text style={{ color: liveColors.soft, fontSize: 12, fontWeight: "800" as const }}>Upcoming live sessions</Text>
        </View>
        <View style={{ gap: spacing.sm }}>
          {(searchable.scheduled.length ? searchable.scheduled : scheduled).slice(0, 3).map((room) => (
            <LiveScheduleCard key={room.id} onPress={() => onOpenLive(room)} room={room} />
          ))}
        </View>
      </View>

      <View style={{ gap: spacing.md }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm }}>
          <Text style={{ color: liveColors.ink, fontSize: 20, fontWeight: "900" as const }}>Watch again</Text>
          <Text style={{ color: liveColors.soft, fontSize: 12, fontWeight: "800" as const }}>Highlights and replay rooms</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md }}>
          {(searchable.replays.length ? searchable.replays : replays).map((room) => (
            <ChannelCard compact key={room.id} onPress={() => onOpenLive(room)} room={room} />
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

function TopAction({
  icon,
  label,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  label?: string;
}) {
  return (
    <View
      style={{
        width: 36,
        height: 36,
        borderRadius: radius.pill,
        backgroundColor: liveColors.panel,
        borderWidth: 1,
        borderColor: liveColors.border,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {icon ? <Ionicons color={liveColors.ink} name={icon} size={18} /> : null}
      {!icon && label ? <Text style={{ color: liveColors.ink, fontSize: 14, fontWeight: "900" as const }}>{label}</Text> : null}
    </View>
  );
}

function StatPill({
  label,
  tone,
}: {
  label: string;
  tone: "accent" | "soft";
}) {
  return (
    <View
      style={{
        borderRadius: radius.pill,
        backgroundColor: tone === "accent" ? "rgba(141,162,255,0.18)" : liveColors.panel,
        borderWidth: 1,
        borderColor: liveColors.border,
        paddingHorizontal: spacing.sm,
        paddingVertical: 6,
      }}
    >
      <Text style={{ color: tone === "accent" ? liveColors.accent : liveColors.soft, fontSize: 11, fontWeight: "900" as const }}>
        {label}
      </Text>
    </View>
  );
}
