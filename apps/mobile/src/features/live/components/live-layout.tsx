import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { ChannelCard } from "@/src/components/cards/channel-card";
import { LiveScheduleCard } from "@/src/features/live/components/live-schedule-card";
import type { LiveIndex, LiveRoom } from "@/src/services/api";
import { radius, spacing } from "@/src/theme/tokens";

const liveColors = {
  page: "#080b13",
  shell: "#101522",
  panel: "#151d2c",
  border: "rgba(255,255,255,0.09)",
  ink: "#f8fbff",
  soft: "#98a4bd",
  accent: "#ff4fd8",
  accentBlue: "#8364ff",
  accentGreen: "#6de9b7",
  chip: "rgba(255,255,255,0.08)",
};

type LiveLayoutProps = {
  liveIndex: LiveIndex | null;
  liveRooms: LiveRoom[];
  onOpenLive: (room: LiveRoom) => void;
  sessionName?: string;
};

export function LiveLayout({ liveIndex, liveRooms, onOpenLive, sessionName }: LiveLayoutProps) {
  const [mode, setMode] = useState<"Popular" | "Gaming" | "Sport" | "Music">("Gaming");
  const [query, setQuery] = useState("");

  const liveNow = liveIndex?.live ?? liveRooms;
  const following = liveIndex?.following ?? [];
  const scheduled = liveIndex?.scheduled ?? [];
  const replays = liveIndex?.previous ?? [];

  const searchable = useMemo(() => {
    const term = query.trim().toLowerCase();
    const matches = (room: LiveRoom) => `${room.title} ${room.host} ${room.topic}`.toLowerCase().includes(term);
    return {
      live: term ? liveNow.filter(matches) : liveNow,
      following: term ? following.filter(matches) : following,
      scheduled: term ? scheduled.filter(matches) : scheduled,
      replays: term ? replays.filter(matches) : replays,
    };
  }, [following, liveNow, query, replays, scheduled]);

  const heroRoom = searchable.live[0] ?? liveNow[0] ?? null;
  const liveGrid = searchable.live.length ? searchable.live : liveNow;
  const eventRooms = searchable.scheduled.length ? searchable.scheduled : scheduled;

  return (
    <View style={{ gap: spacing.sm }}>
      <View
        style={{
          borderRadius: 28,
          borderWidth: 1,
          borderColor: liveColors.border,
          backgroundColor: liveColors.shell,
          padding: spacing.sm,
          gap: spacing.sm,
        }}
      >
        <View style={{ minHeight: 42, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
            <View style={{ width: 18, height: 10, borderRadius: radius.pill, backgroundColor: liveColors.accent }} />
            <Text style={{ color: liveColors.ink, fontSize: 18, fontWeight: "900" as const }}>GoLive</Text>
          </View>

          <View style={{ flexDirection: "row", gap: spacing.xs }}>
            <TopAction icon="moon-outline" />
            <TopAction icon="notifications-outline" />
            <TopAction icon="search" />
            <TopAction label={sessionName ? sessionName.slice(0, 1).toUpperCase() : "Y"} />
          </View>
        </View>

        <View
          style={{
            minHeight: 40,
            borderRadius: radius.pill,
            borderWidth: 1,
            borderColor: liveColors.border,
            backgroundColor: "rgba(255,255,255,0.05)",
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.xs,
            paddingHorizontal: spacing.sm,
          }}
        >
          <Ionicons color={liveColors.soft} name="search" size={15} />
          <TextInput
            onChangeText={setQuery}
            placeholder="Search streams"
            placeholderTextColor={liveColors.soft}
            style={{ flex: 1, color: liveColors.ink, fontSize: 13, paddingVertical: 0 }}
            value={query}
          />
          <Ionicons color={liveColors.accentGreen} name="options-outline" size={15} />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingRight: spacing.sm }}>
          {(following.length ? following : liveNow).slice(0, 9).map((room) => (
            <Pressable key={room.id} onPress={() => onOpenLive(room)} style={{ width: 58, alignItems: "center", gap: 5 }}>
              <View style={{ width: 50, height: 50, borderRadius: radius.pill, padding: 2, backgroundColor: liveColors.accentBlue }}>
                <Image source={{ uri: avatarFor(room.host) }} style={{ width: "100%", height: "100%", borderRadius: radius.pill }} />
                <View style={{ position: "absolute", right: -2, top: -2, borderRadius: radius.pill, backgroundColor: "#ff315f", paddingHorizontal: 5, paddingVertical: 2 }}>
                  <Text style={{ color: "#fff", fontSize: 8, fontWeight: "900" as const }}>Live</Text>
                </View>
              </View>
              <Text numberOfLines={1} style={{ color: liveColors.soft, fontSize: 10, fontWeight: "800" as const }}>{firstName(room.host)}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={{ flexDirection: "row", gap: spacing.xs }}>
          {(["Popular", "Gaming", "Sport", "Music"] as const).map((item) => {
            const active = mode === item;
            return (
              <Pressable
                key={item}
                onPress={() => setMode(item)}
                style={{
                  minHeight: 34,
                  borderRadius: radius.pill,
                  backgroundColor: active ? liveColors.accent : liveColors.chip,
                  paddingHorizontal: spacing.sm,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <Ionicons color={active ? "#fff" : liveColors.soft} name={item === "Gaming" ? "game-controller" : "star"} size={13} />
                <Text style={{ color: active ? "#fff" : liveColors.soft, fontSize: 11, fontWeight: "900" as const }}>{item}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {heroRoom ? (
        <Pressable onPress={() => onOpenLive(heroRoom)} style={{ overflow: "hidden", borderRadius: 30, borderWidth: 1, borderColor: liveColors.border, backgroundColor: liveColors.panel }}>
          <Image source={{ uri: heroRoom.coverUrl }} style={{ width: "100%", aspectRatio: 0.72 }} />
          <LinearGradient colors={["transparent", "rgba(0,0,0,0.9)"]} style={{ position: "absolute", bottom: 0, left: 0, right: 0, top: 0 }} />
          <View style={{ position: "absolute", left: spacing.md, right: spacing.md, bottom: spacing.md, gap: 5 }}>
            <Text style={{ color: liveColors.accentGreen, fontSize: 11, fontWeight: "900" as const }}>{compact(heroRoom.viewers)} watching</Text>
            <Text numberOfLines={2} style={{ color: liveColors.ink, fontSize: 28, lineHeight: 29, fontWeight: "900" as const }}>{heroRoom.title}</Text>
            <Text style={{ color: "rgba(255,255,255,0.68)", fontSize: 12, fontWeight: "800" as const }}>{heroRoom.host} - {heroRoom.topic}</Text>
          </View>
        </Pressable>
      ) : null}

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        {liveGrid.slice(0, 4).map((room) => (
          <StreamTile key={room.id} onPress={() => onOpenLive(room)} room={room} />
        ))}
      </View>

      <View style={{ gap: spacing.sm }}>
        <View style={{ minHeight: 32, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ color: liveColors.ink, fontSize: 17, fontWeight: "900" as const }}>Schedules & events</Text>
          <Text style={{ color: liveColors.soft, fontSize: 11, fontWeight: "800" as const }}>{eventRooms.length || liveGrid.length} upcoming</Text>
        </View>
        <View style={{ gap: spacing.sm }}>
          {(eventRooms.length ? eventRooms : liveGrid).slice(0, 3).map((room) => (
            <LiveScheduleCard key={room.id} onPress={() => onOpenLive(room)} room={room} />
          ))}
        </View>
      </View>

      <View style={{ gap: spacing.sm }}>
        <Text style={{ color: liveColors.ink, fontSize: 17, fontWeight: "900" as const }}>Watch again</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingRight: spacing.sm }}>
          {(searchable.replays.length ? searchable.replays : replays).map((room) => (
            <ChannelCard compact key={room.id} onPress={() => onOpenLive(room)} room={room} />
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

function StreamTile({ onPress, room }: { onPress: () => void; room: LiveRoom }) {
  return (
    <Pressable onPress={onPress} style={{ flexBasis: "47.5%", flexGrow: 1, overflow: "hidden", borderRadius: 22, borderWidth: 1, borderColor: liveColors.border, backgroundColor: liveColors.panel }}>
      <Image source={{ uri: room.coverUrl }} style={{ width: "100%", aspectRatio: 0.8 }} />
      <LinearGradient colors={["transparent", "rgba(0,0,0,0.86)"]} style={{ position: "absolute", bottom: 0, left: 0, right: 0, top: 0 }} />
      <View style={{ position: "absolute", left: spacing.xs, right: spacing.xs, top: spacing.xs, flexDirection: "row", justifyContent: "space-between" }}>
        <View style={{ borderRadius: radius.pill, backgroundColor: "rgba(0,0,0,0.42)", paddingHorizontal: 7, paddingVertical: 4 }}>
          <Text style={{ color: liveColors.accentGreen, fontSize: 10, fontWeight: "900" as const }}>{compact(room.viewers)}</Text>
        </View>
        <View style={{ borderRadius: radius.pill, backgroundColor: "#ff315f", paddingHorizontal: 7, paddingVertical: 4 }}>
          <Text style={{ color: "#fff", fontSize: 10, fontWeight: "900" as const }}>Live</Text>
        </View>
      </View>
      <View style={{ position: "absolute", left: spacing.xs, right: spacing.xs, bottom: spacing.xs }}>
        <Text numberOfLines={1} style={{ color: liveColors.ink, fontSize: 12, fontWeight: "900" as const }}>{room.title}</Text>
        <Text numberOfLines={1} style={{ color: liveColors.soft, fontSize: 10, fontWeight: "800" as const }}>{room.host}</Text>
      </View>
    </Pressable>
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
        width: 32,
        height: 32,
        borderRadius: radius.pill,
        backgroundColor: liveColors.chip,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {icon ? <Ionicons color={liveColors.ink} name={icon} size={15} /> : null}
      {!icon && label ? <Text style={{ color: liveColors.ink, fontSize: 12, fontWeight: "900" as const }}>{label}</Text> : null}
    </View>
  );
}

function avatarFor(value: string) {
  return `https://api.dicebear.com/8.x/avataaars/png?seed=${encodeURIComponent(value)}`;
}

function firstName(value: string) {
  return value.trim().split(/\s+/)[0] || value;
}

function compact(value: number) {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}
