import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { type ReactNode, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { PromotionCard } from "@/src/components/cards/promotion-card";
import { useApp } from "@/src/providers/app-provider";
import { palette, radius, spacing } from "@/src/theme/tokens";

type StudioDraft = {
  body: string;
  mood: string;
  mediaUrl: string;
  filterName: string;
  overlayText: string;
  sticker: string;
  textColor: string;
  backgroundTone: string;
  aspectRatio: string;
};

const mediaOptions = [
  "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=84",
  "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=84",
  "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=84",
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=84",
  "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=1200&q=84",
];

const filters: Array<{ name: string; colors: [string, string] }> = [
  { name: "Original", colors: ["rgba(0,0,0,0)", "rgba(0,0,0,0.52)"] },
  { name: "Glow", colors: ["rgba(109,233,183,0.14)", "rgba(255,77,134,0.38)"] },
  { name: "Warm", colors: ["rgba(255,142,104,0.26)", "rgba(81,33,20,0.58)"] },
  { name: "Mono", colors: ["rgba(255,255,255,0.1)", "rgba(0,0,0,0.7)"] },
  { name: "Pop", colors: ["rgba(110,168,255,0.22)", "rgba(255,91,126,0.46)"] },
];

const stickers = ["LIVE", "DROP", "NEW", "VIP", "Q&A"];
const textColors = ["#ffffff", "#fff5da", "#d8fff1", "#bfe0ff", "#ffb8cf"];
const tones: Array<{ id: string; label: string; colors: [string, string] }> = [
  { id: "midnight", label: "Midnight", colors: ["rgba(9,13,24,0.08)", "rgba(20,27,50,0.72)"] },
  { id: "sunset", label: "Sunset", colors: ["rgba(255,142,104,0.24)", "rgba(61,18,16,0.72)"] },
  { id: "emerald", label: "Emerald", colors: ["rgba(46,213,115,0.18)", "rgba(7,54,48,0.72)"] },
  { id: "violet", label: "Violet", colors: ["rgba(139,92,246,0.22)", "rgba(55,22,71,0.72)"] },
];
const ratios = ["4:5", "1:1", "9:16"];

function createDraft(): StudioDraft {
  return {
    body: "",
    mood: "Behind the scenes",
    mediaUrl: mediaOptions[0],
    filterName: filters[0].name,
    overlayText: "New drop",
    sticker: stickers[0],
    textColor: textColors[0],
    backgroundTone: tones[0].id,
    aspectRatio: ratios[0],
  };
}

export function StudioScreen() {
  const { createStudioPost, displayPosts, health } = useApp();
  const [draft, setDraft] = useState<StudioDraft>(() => createDraft());
  const [publishing, setPublishing] = useState(false);
  const [status, setStatus] = useState("");

  const selectedFilter = useMemo(() => filters.find((filter) => filter.name === draft.filterName) ?? filters[0], [draft.filterName]);
  const selectedTone = useMemo(() => tones.find((tone) => tone.id === draft.backgroundTone) ?? tones[0], [draft.backgroundTone]);
  const topPosts = displayPosts.slice(0, 4);

  function update<K extends keyof StudioDraft>(key: K, value: StudioDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function publishPost() {
    if (!draft.body.trim() || publishing) {
      return;
    }

    setPublishing(true);
    setStatus("Publishing...");
    try {
      const post = await createStudioPost(draft);
      setDraft(createDraft());
      setStatus(`Published ${post.mood.toLowerCase()} post.`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Could not publish post.");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: 120 }} contentInsetAdjustmentBehavior="automatic" style={{ flex: 1, backgroundColor: palette.bg }}>
      <View>
        <Text style={{ color: palette.accent, fontWeight: "900", textTransform: "uppercase", letterSpacing: 1.2 }}>Studio</Text>
        <Text style={{ color: palette.text, fontSize: 34, fontWeight: "900", marginTop: spacing.sm }}>Creator control</Text>
        <Text style={{ color: palette.textMuted, marginTop: spacing.sm }}>
          Backend stack is {health?.status === "ok" ? "live" : "syncing"} and your post editor is connected.
        </Text>
      </View>

      <View style={{ borderRadius: radius.xl, borderWidth: 1, borderColor: palette.stroke, backgroundColor: palette.panelRaised, padding: spacing.md, gap: spacing.md }}>
        <View style={{ alignItems: "center" }}>
          <View style={{ width: "100%", maxWidth: 340, aspectRatio: ratioValue(draft.aspectRatio), overflow: "hidden", borderRadius: 30, backgroundColor: palette.black }}>
            <Image source={{ uri: draft.mediaUrl }} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} contentFit="cover" />
            <LinearGradient colors={selectedFilter.colors} style={{ position: "absolute", inset: 0 }} />
            <LinearGradient colors={selectedTone.colors} style={{ position: "absolute", inset: 0 }} />
            <LinearGradient colors={["rgba(0,0,0,0.02)", "transparent", "rgba(0,0,0,0.82)"]} locations={[0, 0.46, 1]} style={{ position: "absolute", inset: 0 }} />
            {draft.sticker ? (
              <View style={{ position: "absolute", top: spacing.md, left: spacing.md, borderRadius: radius.pill, borderWidth: 1, borderColor: "rgba(255,255,255,0.45)", backgroundColor: "rgba(0,0,0,0.34)", paddingHorizontal: spacing.sm, paddingVertical: 7 }}>
                <Text style={{ color: "#fff", fontSize: 12, fontWeight: "900" }}>{draft.sticker}</Text>
              </View>
            ) : null}
            {draft.overlayText ? (
              <Text style={{ position: "absolute", left: spacing.md, right: spacing.md, bottom: 86, color: draft.textColor, fontSize: 36, fontWeight: "900", lineHeight: 34 }} numberOfLines={3}>
                {draft.overlayText}
              </Text>
            ) : null}
            <Text style={{ position: "absolute", left: spacing.md, right: spacing.md, bottom: spacing.md, color: "rgba(255,255,255,0.9)", fontSize: 13, fontWeight: "800", lineHeight: 18 }} numberOfLines={3}>
              {draft.body || "Write the caption to preview it here."}
            </Text>
          </View>
        </View>

        <StudioInput label="Caption" multiline onChangeText={(value) => update("body", value)} placeholder="Share the moment, offer, or behind-the-scenes note." value={draft.body} />
        <StudioInput label="Mood" onChangeText={(value) => update("mood", value)} value={draft.mood} />
        <StudioInput label="Overlay text" onChangeText={(value) => update("overlayText", value)} value={draft.overlayText} />

        <EditorGroup label="Media">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
            {mediaOptions.map((image) => (
              <Pressable key={image} onPress={() => update("mediaUrl", image)} style={{ width: 64, height: 64, overflow: "hidden", borderRadius: 18, borderWidth: 2, borderColor: draft.mediaUrl === image ? palette.accent : "transparent" }}>
                <Image source={{ uri: image }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
              </Pressable>
            ))}
          </ScrollView>
        </EditorGroup>

        <EditorGroup label="Filters">
          <ChipRow items={filters.map((filter) => filter.name)} selected={draft.filterName} onSelect={(value) => update("filterName", value)} />
        </EditorGroup>

        <EditorGroup label="Sticker">
          <ChipRow items={stickers} selected={draft.sticker} onSelect={(value) => update("sticker", value)} />
        </EditorGroup>

        <EditorGroup label="Text color">
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            {textColors.map((color) => (
              <Pressable key={color} onPress={() => update("textColor", color)} style={{ width: 34, height: 34, borderRadius: radius.pill, borderWidth: 3, borderColor: draft.textColor === color ? palette.accent : "rgba(255,255,255,0.18)", backgroundColor: color }} />
            ))}
          </View>
        </EditorGroup>

        <EditorGroup label="Tone">
          <ChipRow items={tones.map((tone) => tone.id)} labels={Object.fromEntries(tones.map((tone) => [tone.id, tone.label]))} selected={draft.backgroundTone} onSelect={(value) => update("backgroundTone", value)} />
        </EditorGroup>

        <EditorGroup label="Canvas">
          <ChipRow items={ratios} selected={draft.aspectRatio} onSelect={(value) => update("aspectRatio", value)} />
        </EditorGroup>

        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
          <Pressable
            disabled={!draft.body.trim() || publishing}
            onPress={() => void publishPost()}
            style={{
              flex: 1,
              minHeight: 50,
              borderRadius: radius.pill,
              backgroundColor: !draft.body.trim() || publishing ? palette.panelMuted : palette.accentStrong,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: spacing.xs,
            }}
          >
            {publishing ? <ActivityIndicator color="#fff" /> : <Ionicons color="#fff" name="send" size={16} />}
            <Text style={{ color: "#fff", fontWeight: "900" }}>{publishing ? "Publishing" : "Publish post"}</Text>
          </Pressable>
          <Pressable onPress={() => setDraft(createDraft())} style={{ width: 50, height: 50, borderRadius: radius.pill, borderWidth: 1, borderColor: palette.stroke, alignItems: "center", justifyContent: "center" }}>
            <Ionicons color={palette.accent} name="sparkles" size={18} />
          </Pressable>
        </View>
        {status ? <Text style={{ color: palette.textMuted, fontWeight: "800" }}>{status}</Text> : null}
      </View>

      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        <Metric label="Posts" value={`${displayPosts.length}`} />
        <Metric label="Top boost" value={`${topPosts[0]?.promotionScore ?? 0}%`} />
        <Metric label="Stack" value={health?.status === "ok" ? "Live" : "Sync"} />
      </View>

      {topPosts.map((post) => (
        <PromotionCard key={post.id} body={post.body} image={post.gallery[0]} score={post.promotionScore} title={post.author.name} />
      ))}
    </ScrollView>
  );
}

function StudioInput({
  label,
  multiline,
  onChangeText,
  placeholder,
  value,
}: {
  label: string;
  multiline?: boolean;
  onChangeText: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={{ color: palette.textMuted, fontSize: 11, fontWeight: "900", textTransform: "uppercase" }}>{label}</Text>
      <TextInput
        multiline={multiline}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={palette.textMuted}
        style={{
          minHeight: multiline ? 100 : 48,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: palette.stroke,
          backgroundColor: palette.panel,
          color: palette.text,
          padding: spacing.md,
          textAlignVertical: multiline ? "top" : "center",
        }}
        value={value}
      />
    </View>
  );
}

function EditorGroup({ children, label }: { children: ReactNode; label: string }) {
  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={{ color: palette.textMuted, fontSize: 11, fontWeight: "900", textTransform: "uppercase" }}>{label}</Text>
      {children}
    </View>
  );
}

function ChipRow({
  items,
  labels,
  onSelect,
  selected,
}: {
  items: string[];
  labels?: Record<string, string>;
  onSelect: (value: string) => void;
  selected: string;
}) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
      {items.map((item) => {
        const active = selected === item;
        return (
          <Pressable key={item} onPress={() => onSelect(item)} style={{ minHeight: 36, borderRadius: radius.pill, borderWidth: 1, borderColor: active ? "transparent" : palette.stroke, backgroundColor: active ? "#fff" : palette.panel, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.md }}>
            <Text style={{ color: active ? palette.black : palette.textMuted, fontWeight: "900", fontSize: 12 }}>{labels?.[item] ?? item}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, borderRadius: radius.lg, backgroundColor: palette.panelRaised, borderWidth: 1, borderColor: palette.stroke, padding: spacing.md, alignItems: "center" }}>
      <Text style={{ color: palette.text, fontWeight: "900", fontSize: 18 }}>{value}</Text>
      <Text style={{ color: palette.textMuted, fontSize: 11, fontWeight: "800", marginTop: 3 }}>{label}</Text>
    </View>
  );
}

function ratioValue(value: string) {
  if (value === "1:1") {
    return 1;
  }
  if (value === "9:16") {
    return 9 / 16;
  }
  return 4 / 5;
}
