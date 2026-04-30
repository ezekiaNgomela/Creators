import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { type ReactNode, useMemo, useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, TextInput, useWindowDimensions, View } from "react-native";

import { useApp } from "@/src/providers/app-provider";
import { palette, radius, spacing } from "@/src/theme/tokens";

type CreationMode = "post" | "collab" | "live";
type MediaType = "image" | "video";
type StudioTool = "media" | "adjust" | "text" | "layers" | "timeline" | "publish";

type StudioDraft = {
  body: string;
  mood: string;
  mediaUrl: string;
  mediaType: MediaType;
  filterName: string;
  overlayText: string;
  sticker: string;
  textColor: string;
  backgroundTone: string;
  aspectRatio: string;
  cropZoom: number;
  cropX: number;
  cropY: number;
  rotation: number;
};

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
const ratios = ["4:5", "1:1", "9:16", "16:9"];
const tools: Array<{ id: StudioTool; icon: keyof typeof Ionicons.glyphMap; label: string }> = [
  { id: "media", icon: "images-outline", label: "Media" },
  { id: "adjust", icon: "options-outline", label: "Adjust" },
  { id: "text", icon: "text-outline", label: "Text" },
  { id: "layers", icon: "layers-outline", label: "Layers" },
  { id: "timeline", icon: "film-outline", label: "Timeline" },
  { id: "publish", icon: "send-outline", label: "Publish" },
];

function createDraft(): StudioDraft {
  return {
    body: "",
    mood: "Behind the scenes",
    mediaUrl: "",
    mediaType: "image",
    filterName: filters[0].name,
    overlayText: "New drop",
    sticker: stickers[0],
    textColor: textColors[0],
    backgroundTone: tones[0].id,
    aspectRatio: ratios[0],
    cropZoom: 1,
    cropX: 50,
    cropY: 50,
    rotation: 0,
  };
}

export function StudioScreen() {
  const { createStudioPost, displayPosts, health, uploadStudioMedia } = useApp();
  const { height, width } = useWindowDimensions();
  const [draft, setDraft] = useState<StudioDraft>(() => createDraft());
  const [activeTool, setActiveTool] = useState<StudioTool>("media");
  const [mode, setMode] = useState<CreationMode>("post");
  const [publishing, setPublishing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState("");
  const osName = process.env.EXPO_OS ?? Platform.OS;
  const isLargeSurface = Platform.isTV || (osName === "web" && width >= 900);
  const deviceLabel = Platform.isTV ? "TV editor" : osName === "web" && width >= 900 ? "Desktop editor" : width < 560 ? "Phone editor" : "Tablet editor";
  const topPosts = displayPosts.slice(0, 4);
  const libraryItems = useMemo(() => Array.from(new Set(displayPosts.flatMap((post) => post.gallery))).filter(Boolean), [displayPosts]);
  const selectedFilter = useMemo(() => filters.find((filter) => filter.name === draft.filterName) ?? filters[0], [draft.filterName]);
  const selectedTone = useMemo(() => tones.find((tone) => tone.id === draft.backgroundTone) ?? tones[0], [draft.backgroundTone]);
  const canvasMaxHeight = isLargeSurface ? Math.min(height * 0.62, 600) : Math.min(height * 0.56, 540);
  const activeRatio = ratioValue(draft.aspectRatio);
  const desiredCanvasWidth = isLargeSurface ? Math.min(width * 0.42, 520) : Math.min(width - spacing.md * 2, 390);
  const canvasWidth = Math.min(desiredCanvasWidth, canvasMaxHeight * activeRatio);

  function update<K extends keyof StudioDraft>(key: K, value: StudioDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function pickMedia() {
    if (uploading) {
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setStatus("Media access is required to choose a photo or video from this device.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      mediaTypes: ["images", "videos"],
      quality: 0.92,
      videoMaxDuration: 60,
    });

    if (result.canceled || !result.assets[0]) {
      return;
    }

    const asset = result.assets[0];
    const pickedType: MediaType = asset.type === "video" ? "video" : "image";
    const fallbackExt = pickedType === "video" ? "mp4" : "jpg";
    const uploadName = asset.fileName ?? `studio-${Date.now()}.${fallbackExt}`;
    const uploadType = asset.mimeType ?? (pickedType === "video" ? "video/mp4" : "image/jpeg");

    setUploading(true);
    setStatus("Uploading selected media...");
    try {
      const uploaded = await uploadStudioMedia({ name: uploadName, type: uploadType, uri: asset.uri });
      setDraft((current) => ({
        ...current,
        mediaUrl: uploaded.url,
        mediaType: uploaded.mediaType === "video" ? "video" : "image",
        cropZoom: 1,
        cropX: 50,
        cropY: 50,
        rotation: 0,
      }));
      setActiveTool("adjust");
      setStatus(`${pickedType === "video" ? "Video" : "Image"} ready for editing.`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Could not upload selected media.");
    } finally {
      setUploading(false);
    }
  }

  async function publishPost() {
    if (!draft.body.trim() || publishing) {
      return;
    }

    if (mode === "live") {
      setStatus("Live setup is ready. Opening the Live room area.");
      router.push("/(tabs)/live");
      return;
    }

    setPublishing(true);
    setStatus(mode === "collab" ? "Publishing mutual post..." : "Publishing post...");
    try {
      const post = await createStudioPost({
        ...draft,
        mood: mode === "collab" ? `${draft.mood} collab` : draft.mood,
      });
      setDraft(createDraft());
      setStatus(`Published ${post.mood.toLowerCase()} post.`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Could not publish post.");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={{ padding: isLargeSurface ? spacing.lg : spacing.sm, gap: spacing.md, paddingBottom: 120 }} contentInsetAdjustmentBehavior="automatic" style={{ flex: 1, backgroundColor: "#050507" }}>
      <View style={{ borderRadius: isLargeSurface ? 30 : 0, borderWidth: isLargeSurface ? 1 : 0, borderColor: "rgba(255,255,255,0.08)", backgroundColor: "#0b0b0e", overflow: "hidden" }}>
        <View style={{ minHeight: 46, paddingHorizontal: spacing.xs, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.xs, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)" }}>
          <IconOrb icon="chevron-back" onPress={() => router.back()} />
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text style={{ color: "#fff", fontWeight: "900", fontSize: 14 }}>Studio</Text>
            <Text style={{ color: "rgba(255,255,255,0.46)", fontSize: 11, fontWeight: "800" }}>{deviceLabel} - {health?.status === "ok" ? "backend live" : "syncing"}</Text>
          </View>
          <IconOrb icon="checkmark" onPress={() => void publishPost()} />
        </View>

        <View style={{ padding: spacing.xs, gap: spacing.sm }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.xs, paddingRight: spacing.sm }}>
            <ModeChip active={mode === "post"} icon="images-outline" label="Post" onPress={() => {
              setMode("post");
              update("mood", "Behind the scenes");
            }} />
            <ModeChip active={mode === "collab"} icon="people-outline" label="Mutual" onPress={() => {
              setMode("collab");
              update("mood", "Mutual post");
            }} />
            <ModeChip active={mode === "live"} icon="radio-outline" label="Live" onPress={() => {
              setMode("live");
              update("mood", "Live setup");
            }} />
          </ScrollView>

          <View style={{ flexDirection: isLargeSurface ? "row" : "column", gap: spacing.sm, alignItems: "stretch" }}>
            {isLargeSurface ? <ToolRail activeTool={activeTool} onSelect={setActiveTool} /> : null}

            <View style={{ flex: 1, gap: spacing.sm, alignItems: "center" }}>
              <View style={{ width: "100%", alignItems: "center", justifyContent: "center", backgroundColor: "#151419", borderRadius: isLargeSurface ? 24 : 30, padding: isLargeSurface ? spacing.lg : spacing.sm }}>
                <StudioCanvas
                  draft={draft}
                  maxHeight={canvasMaxHeight}
                  selectedFilter={selectedFilter}
                  selectedTone={selectedTone}
                  width={canvasWidth}
                />
              </View>

              <TimelineStrip draft={draft} mediaItems={libraryItems} onSelectMedia={(uri) => {
                update("mediaUrl", uri);
                update("mediaType", uri.match(/\.(mp4|mov|webm)(\?|$)/i) ? "video" : "image");
              }} />

              {!isLargeSurface ? <ToolDock activeTool={activeTool} onSelect={setActiveTool} /> : null}
            </View>

            <InspectorPanel
              activeTool={activeTool}
              draft={draft}
              libraryItems={libraryItems}
              mode={mode}
              onPickMedia={() => void pickMedia()}
              onPublish={() => void publishPost()}
              publishing={publishing}
              setDraft={setDraft}
              setMode={setMode}
              setTool={setActiveTool}
              status={status}
              update={update}
              uploading={uploading}
            />
          </View>
        </View>
      </View>

      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        <Metric label="Posts" value={`${displayPosts.length}`} />
        <Metric label="Top boost" value={`${topPosts[0]?.promotionScore ?? 0}%`} />
        <Metric label="Stack" value={health?.status === "ok" ? "Live" : "Sync"} />
      </View>
    </ScrollView>
  );
}

function StudioCanvas({
  draft,
  maxHeight,
  selectedFilter,
  selectedTone,
  width,
}: {
  draft: StudioDraft;
  maxHeight: number;
  selectedFilter: { colors: [string, string] };
  selectedTone: { colors: [string, string] };
  width: number;
}) {
  const mediaTransform = [{ scale: draft.cropZoom }, { rotate: `${draft.rotation}deg` }];

  return (
    <View style={{ width, maxHeight, aspectRatio: ratioValue(draft.aspectRatio), overflow: "hidden", borderRadius: 26, backgroundColor: palette.black }}>
      <StudioMedia source={draft.mediaUrl} transform={mediaTransform} type={draft.mediaType} x={draft.cropX} y={draft.cropY} />
      <LinearGradient colors={selectedFilter.colors} style={{ position: "absolute", bottom: 0, left: 0, right: 0, top: 0 }} />
      <LinearGradient colors={selectedTone.colors} style={{ position: "absolute", bottom: 0, left: 0, right: 0, top: 0 }} />
      <LinearGradient colors={["rgba(0,0,0,0.02)", "transparent", "rgba(0,0,0,0.82)"]} locations={[0, 0.46, 1]} style={{ position: "absolute", bottom: 0, left: 0, right: 0, top: 0 }} />
      <View style={{ position: "absolute", top: "9%", left: "9%", right: "9%", bottom: "9%", borderWidth: 1, borderColor: "rgba(255,255,255,0.58)", opacity: 0.42 }} />
      <View style={{ position: "absolute", top: spacing.sm, right: spacing.sm, flexDirection: "row", gap: spacing.xs }}>
        <CanvasBadge icon="crop" label={draft.aspectRatio} />
        <CanvasBadge icon={draft.mediaType === "video" ? "videocam" : "image"} label={draft.mediaType} />
      </View>
      {draft.sticker ? (
        <View style={{ position: "absolute", top: spacing.md, left: spacing.md, borderRadius: radius.pill, borderWidth: 1, borderColor: "rgba(255,255,255,0.45)", backgroundColor: "rgba(0,0,0,0.34)", paddingHorizontal: spacing.sm, paddingVertical: 7 }}>
          <Text style={{ color: "#fff", fontSize: 12, fontWeight: "900" }}>{draft.sticker}</Text>
        </View>
      ) : null}
      {draft.overlayText ? (
        <Text style={{ position: "absolute", left: spacing.md, right: spacing.md, bottom: 86, color: draft.textColor, fontSize: 35, fontWeight: "900", lineHeight: 35 }} numberOfLines={3} adjustsFontSizeToFit>
          {draft.overlayText}
        </Text>
      ) : null}
      <Text style={{ position: "absolute", left: spacing.md, right: spacing.md, bottom: spacing.md, color: "rgba(255,255,255,0.9)", fontSize: 13, fontWeight: "800", lineHeight: 18 }} numberOfLines={3}>
        {draft.body || "Write the caption to preview it here."}
      </Text>
    </View>
  );
}

function InspectorPanel({
  activeTool,
  draft,
  libraryItems,
  mode,
  onPickMedia,
  onPublish,
  publishing,
  setDraft,
  setMode,
  setTool,
  status,
  update,
  uploading,
}: {
  activeTool: StudioTool;
  draft: StudioDraft;
  libraryItems: string[];
  mode: CreationMode;
  onPickMedia: () => void;
  onPublish: () => void;
  publishing: boolean;
  setDraft: (draft: StudioDraft) => void;
  setMode: (mode: CreationMode) => void;
  setTool: (tool: StudioTool) => void;
  status: string;
  update: <K extends keyof StudioDraft>(key: K, value: StudioDraft[K]) => void;
  uploading: boolean;
}) {
  return (
    <View style={{ width: "100%", maxWidth: 390, borderRadius: 26, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", backgroundColor: "#111014", padding: spacing.md, gap: spacing.md, alignSelf: "center" }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm }}>
        <View>
          <Text style={{ color: "#fff", fontSize: 16, fontWeight: "900" }}>{tools.find((tool) => tool.id === activeTool)?.label ?? "Media"}</Text>
          <Text style={{ color: "rgba(255,255,255,0.46)", fontSize: 11, fontWeight: "800" }}>{mode === "live" ? "Live setup" : mode === "collab" ? "Mutual post" : "Post edit"}</Text>
        </View>
        <Pressable onPress={() => setTool("publish")} style={{ borderRadius: radius.pill, backgroundColor: "rgba(255,104,72,0.16)", paddingHorizontal: spacing.sm, paddingVertical: 8 }}>
          <Text style={{ color: "#ff9a82", fontWeight: "900", fontSize: 12 }}>Export</Text>
        </Pressable>
      </View>

      {activeTool === "media" ? (
        <>
          <Pressable disabled={uploading} onPress={onPickMedia} style={{ minHeight: 50, borderRadius: radius.pill, backgroundColor: uploading ? palette.panelMuted : "#ff6848", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: spacing.xs }}>
            {uploading ? <ActivityIndicator color="#fff" /> : <Ionicons color="#fff" name="cloud-upload-outline" size={18} />}
            <Text style={{ color: "#fff", fontWeight: "900" }}>{uploading ? "Uploading" : "Choose from gallery"}</Text>
          </Pressable>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingRight: spacing.sm }}>
            {libraryItems.map((image) => (
              <Pressable key={image} onPress={() => {
                update("mediaUrl", image);
                update("mediaType", image.match(/\.(mp4|mov|webm)(\?|$)/i) ? "video" : "image");
              }} style={{ width: 76, height: 92, overflow: "hidden", borderRadius: 18, borderWidth: 2, borderColor: draft.mediaUrl === image ? "#ff6848" : "transparent", backgroundColor: "#050507" }}>
                <Image source={{ uri: image }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
              </Pressable>
            ))}
          </ScrollView>
        </>
      ) : null}

      {activeTool === "adjust" ? (
        <>
          <EditorGroup label="Crop and position">
            <ControlStepper label="Zoom" max={2.4} min={0.8} onChange={(value) => update("cropZoom", value)} step={0.1} value={draft.cropZoom} />
            <ControlStepper label="Move X" max={100} min={0} onChange={(value) => update("cropX", value)} step={5} suffix="%" value={draft.cropX} />
            <ControlStepper label="Move Y" max={100} min={0} onChange={(value) => update("cropY", value)} step={5} suffix="%" value={draft.cropY} />
          </EditorGroup>
          <EditorGroup label="Filter">
            <ChipRow items={filters.map((filter) => filter.name)} selected={draft.filterName} onSelect={(value) => update("filterName", value)} />
          </EditorGroup>
          <EditorGroup label="Canvas">
            <ChipRow items={ratios} selected={draft.aspectRatio} onSelect={(value) => update("aspectRatio", value)} />
          </EditorGroup>
        </>
      ) : null}

      {activeTool === "text" ? (
        <>
          <StudioInput label={mode === "live" ? "Live title" : "Caption"} multiline onChangeText={(value) => update("body", value)} placeholder="Share the moment, offer, or behind-the-scenes note." value={draft.body} />
          <StudioInput label="Overlay text" onChangeText={(value) => update("overlayText", value)} value={draft.overlayText} />
          <EditorGroup label="Text color">
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
              {textColors.map((color) => (
                <Pressable key={color} onPress={() => update("textColor", color)} style={{ width: 34, height: 34, borderRadius: radius.pill, borderWidth: 3, borderColor: draft.textColor === color ? "#ff6848" : "rgba(255,255,255,0.18)", backgroundColor: color }} />
              ))}
            </View>
          </EditorGroup>
          <EditorGroup label="Sticker">
            <ChipRow items={stickers} selected={draft.sticker} onSelect={(value) => update("sticker", value)} />
          </EditorGroup>
        </>
      ) : null}

      {activeTool === "layers" ? (
        <View style={{ gap: spacing.sm }}>
          <LayerRow icon="image-outline" label="Media" value={draft.mediaType} />
          <LayerRow icon="text-outline" label="Overlay text" value={draft.overlayText || "Hidden"} />
          <LayerRow icon="pricetag-outline" label="Sticker" value={draft.sticker || "Hidden"} />
          <LayerRow icon="chatbox-outline" label="Caption" value={draft.body ? "Visible" : "Empty"} />
        </View>
      ) : null}

      {activeTool === "timeline" ? (
        <View style={{ gap: spacing.md }}>
          <View style={{ flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" }}>
            <SmallAction icon="copy-outline" label="Duplicate" />
            <SmallAction icon="cut-outline" label="Trim" />
            <SmallAction icon="speedometer-outline" label="Speed" />
            <SmallAction icon="trash-outline" label="Delete" />
          </View>
          <Waveform />
        </View>
      ) : null}

      {activeTool === "publish" ? (
        <>
          <StudioInput label="Mood" onChangeText={(value) => update("mood", value)} value={draft.mood} />
          <EditorGroup label="Create as">
            <ChipRow items={["post", "collab", "live"]} labels={{ post: "Post", collab: "Mutual", live: "Live" }} selected={mode} onSelect={(value) => setMode(value as CreationMode)} />
          </EditorGroup>
          <EditorGroup label="Tone">
            <ChipRow items={tones.map((tone) => tone.id)} labels={Object.fromEntries(tones.map((tone) => [tone.id, tone.label]))} selected={draft.backgroundTone} onSelect={(value) => update("backgroundTone", value)} />
          </EditorGroup>
          <Pressable disabled={!draft.body.trim() || publishing || uploading} onPress={onPublish} style={{ minHeight: 52, borderRadius: radius.pill, backgroundColor: !draft.body.trim() || publishing || uploading ? palette.panelMuted : mode === "live" ? palette.accentAlt : "#ff6848", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: spacing.xs }}>
            {publishing ? <ActivityIndicator color="#fff" /> : <Ionicons color="#fff" name={mode === "live" ? "radio-outline" : "send"} size={17} />}
            <Text style={{ color: "#fff", fontWeight: "900" }}>{publishing ? "Publishing" : mode === "live" ? "Prepare live" : "Publish post"}</Text>
          </Pressable>
          <Pressable onPress={() => setDraft(createDraft())} style={{ minHeight: 44, borderRadius: radius.pill, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: "rgba(255,255,255,0.72)", fontWeight: "900" }}>Reset editor</Text>
          </Pressable>
        </>
      ) : null}

      {status ? <Text selectable style={{ color: "rgba(255,255,255,0.52)", fontWeight: "800", fontSize: 12 }}>{status}</Text> : null}
    </View>
  );
}

function TimelineStrip({ draft, mediaItems, onSelectMedia }: { draft: StudioDraft; mediaItems: string[]; onSelectMedia: (uri: string) => void }) {
  return (
    <View style={{ width: "100%", borderRadius: 22, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", backgroundColor: "#0b0b0e", padding: spacing.sm, gap: spacing.xs }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        {["0s", "3s", "6s", "9s", "12s"].map((tick) => <Text key={tick} style={{ color: "rgba(255,255,255,0.38)", fontSize: 10, fontWeight: "900" }}>{tick}</Text>)}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.xs, alignItems: "center", paddingRight: spacing.sm }}>
        {mediaItems.slice(0, 7).map((image, index) => (
          <Pressable key={`${image}-${index}`} onPress={() => onSelectMedia(image)} style={{ width: 72, height: 44, borderRadius: 10, overflow: "hidden", borderWidth: 2, borderColor: draft.mediaUrl === image ? "#ff6848" : "transparent" }}>
            <Image source={{ uri: image }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
          </Pressable>
        ))}
        <View style={{ width: 120, height: 36, borderRadius: 10, backgroundColor: "rgba(126,87,255,0.42)", alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: "#fff", fontSize: 11, fontWeight: "900" }}>{draft.overlayText || "Text layer"}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function ToolDock({ activeTool, onSelect }: { activeTool: StudioTool; onSelect: (tool: StudioTool) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.xs, paddingRight: spacing.sm }}>
      {tools.map((tool) => <ToolButton active={activeTool === tool.id} key={tool.id} tool={tool} onPress={() => onSelect(tool.id)} />)}
    </ScrollView>
  );
}

function ToolRail({ activeTool, onSelect }: { activeTool: StudioTool; onSelect: (tool: StudioTool) => void }) {
  return (
    <View style={{ width: 82, gap: spacing.xs }}>
      {tools.map((tool) => <ToolButton active={activeTool === tool.id} key={tool.id} tool={tool} onPress={() => onSelect(tool.id)} vertical />)}
    </View>
  );
}

function ToolButton({ active, onPress, tool, vertical }: { active: boolean; onPress: () => void; tool: { icon: keyof typeof Ionicons.glyphMap; label: string }; vertical?: boolean }) {
  return (
    <Pressable onPress={onPress} style={{ width: vertical ? "100%" : 74, minHeight: vertical ? 64 : 58, borderRadius: 18, borderWidth: 1, borderColor: active ? "rgba(255,104,72,0.42)" : "rgba(255,255,255,0.08)", backgroundColor: active ? "rgba(255,104,72,0.16)" : "#111014", alignItems: "center", justifyContent: "center", gap: 5, paddingHorizontal: spacing.xs }}>
      <Ionicons color={active ? "#ff9a82" : "rgba(255,255,255,0.62)"} name={tool.icon} size={18} />
      <Text numberOfLines={1} style={{ color: active ? "#ff9a82" : "rgba(255,255,255,0.54)", fontSize: 10, fontWeight: "900" }}>{tool.label}</Text>
    </Pressable>
  );
}

function CanvasBadge({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={{ borderRadius: radius.pill, backgroundColor: "rgba(0,0,0,0.42)", paddingHorizontal: spacing.xs, paddingVertical: 5, flexDirection: "row", alignItems: "center", gap: 4 }}>
      <Ionicons color="#fff" name={icon} size={11} />
      <Text style={{ color: "#fff", fontSize: 10, fontWeight: "900" }}>{label}</Text>
    </View>
  );
}

function IconOrb({ icon, onPress }: { icon: keyof typeof Ionicons.glyphMap; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ width: 34, height: 34, borderRadius: radius.pill, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center" }}>
      <Ionicons color="#fff" name={icon} size={16} />
    </Pressable>
  );
}

function LayerRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={{ minHeight: 54, borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.05)", paddingHorizontal: spacing.sm, flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
      <Ionicons color="#ff9a82" name={icon} size={18} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: "#fff", fontWeight: "900", fontSize: 13 }}>{label}</Text>
        <Text style={{ color: "rgba(255,255,255,0.46)", fontWeight: "800", fontSize: 11 }}>{value}</Text>
      </View>
      <Ionicons color="rgba(255,255,255,0.42)" name="ellipsis-horizontal" size={18} />
    </View>
  );
}

function SmallAction({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <Pressable style={{ width: 78, minHeight: 66, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center", justifyContent: "center", gap: 6 }}>
      <Ionicons color="rgba(255,255,255,0.72)" name={icon} size={18} />
      <Text style={{ color: "rgba(255,255,255,0.64)", fontSize: 10, fontWeight: "900" }}>{label}</Text>
    </Pressable>
  );
}

function Waveform() {
  return (
    <View style={{ minHeight: 74, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.05)", flexDirection: "row", alignItems: "center", gap: 3, padding: spacing.sm }}>
      {Array.from({ length: 32 }, (_, index) => (
        <View key={index} style={{ flex: 1, height: 14 + (index % 7) * 6, borderRadius: radius.pill, backgroundColor: index % 2 ? "#7e57ff" : "#ff6848" }} />
      ))}
    </View>
  );
}

function StudioMedia({
  source,
  transform,
  type,
  x,
  y,
}: {
  source: string;
  transform: Array<{ scale: number } | { rotate: string }>;
  type: MediaType;
  x: number;
  y: number;
}) {
  if (!source) {
    return (
      <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, top: 0, alignItems: "center", justifyContent: "center", padding: spacing.lg }}>
        <Ionicons color="rgba(255,255,255,0.42)" name="images-outline" size={34} />
        <Text style={{ color: "rgba(255,255,255,0.62)", fontSize: 12, fontWeight: "900" as const, marginTop: spacing.sm, textAlign: "center" }}>
          Choose media from your device or profile library
        </Text>
      </View>
    );
  }

  if (type === "video") {
    return <StudioVideo source={source} transform={transform} />;
  }

  return (
    <Image
      source={{ uri: source }}
      style={{ position: "absolute", bottom: 0, left: 0, right: 0, top: 0, width: "100%", height: "100%", transform }}
      contentFit="cover"
      contentPosition={{ left: `${x}%`, top: `${y}%` }}
    />
  );
}

function StudioVideo({
  source,
  transform,
}: {
  source: string;
  transform: Array<{ scale: number } | { rotate: string }>;
}) {
  const player = useVideoPlayer(source, (videoPlayer) => {
    videoPlayer.loop = true;
    videoPlayer.muted = true;
    videoPlayer.play();
  });

  return (
    <VideoView
      contentFit="cover"
      nativeControls={false}
      player={player}
      style={{ position: "absolute", bottom: 0, left: 0, right: 0, top: 0, width: "100%", height: "100%", transform }}
    />
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
      <Text style={{ color: "rgba(255,255,255,0.48)", fontSize: 11, fontWeight: "900", textTransform: "uppercase" }}>{label}</Text>
      <TextInput
        multiline={multiline}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="rgba(255,255,255,0.36)"
        style={{
          minHeight: multiline ? 100 : 48,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.08)",
          backgroundColor: "#0b0b0e",
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
      <Text style={{ color: "rgba(255,255,255,0.48)", fontSize: 11, fontWeight: "900", textTransform: "uppercase" }}>{label}</Text>
      {children}
    </View>
  );
}

function ModeChip({
  active,
  icon,
  label,
  onPress,
}: {
  active: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={{ minHeight: 36, minWidth: 92, borderRadius: radius.pill, borderWidth: 1, borderColor: active ? "transparent" : "rgba(255,255,255,0.08)", backgroundColor: active ? "#f5f5f4" : "#111014", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: spacing.xs, paddingHorizontal: spacing.sm }}>
      <Ionicons color={active ? "#050507" : "#ff9a82"} name={icon} size={15} />
      <Text style={{ color: active ? "#050507" : "rgba(255,255,255,0.58)", fontWeight: "900", fontSize: 12 }}>{label}</Text>
    </Pressable>
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
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingRight: spacing.sm }}>
      {items.map((item) => {
        const active = selected === item;
        return (
          <Pressable key={item} onPress={() => onSelect(item)} style={{ minHeight: 36, borderRadius: radius.pill, borderWidth: 1, borderColor: active ? "transparent" : "rgba(255,255,255,0.08)", backgroundColor: active ? "#fff" : "#0b0b0e", alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.md }}>
            <Text style={{ color: active ? "#050507" : "rgba(255,255,255,0.58)", fontWeight: "900", fontSize: 12 }}>{labels?.[item] ?? item}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function ControlStepper({
  label,
  max,
  min,
  onChange,
  step,
  suffix,
  value,
}: {
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  step: number;
  suffix?: string;
  value: number;
}) {
  const nextDown = Math.max(min, Number((value - step).toFixed(2)));
  const nextUp = Math.min(max, Number((value + step).toFixed(2)));
  return (
    <View style={{ borderRadius: radius.lg, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", backgroundColor: "#0b0b0e", padding: spacing.sm, gap: spacing.xs }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm }}>
        <Text style={{ color: "#fff", fontWeight: "900", fontSize: 13 }}>{label}</Text>
        <Text style={{ color: "#ff9a82", fontWeight: "900", fontSize: 12 }}>{formatControlValue(value, suffix)}</Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
        <StepButton icon="remove" onPress={() => onChange(nextDown)} />
        <View style={{ flex: 1, height: 8, borderRadius: radius.pill, backgroundColor: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
          <View style={{ width: `${((value - min) / (max - min)) * 100}%`, height: "100%", borderRadius: radius.pill, backgroundColor: "#ff6848" }} />
        </View>
        <StepButton icon="add" onPress={() => onChange(nextUp)} />
      </View>
    </View>
  );
}

function StepButton({ icon, onPress }: { icon: keyof typeof Ionicons.glyphMap; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ width: 34, height: 34, borderRadius: radius.pill, backgroundColor: "#17161b", alignItems: "center", justifyContent: "center" }}>
      <Ionicons color="#fff" name={icon} size={16} />
    </Pressable>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, borderRadius: radius.lg, backgroundColor: "#111014", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", padding: spacing.md, alignItems: "center" }}>
      <Text style={{ color: "#fff", fontWeight: "900", fontSize: 18 }}>{value}</Text>
      <Text style={{ color: "rgba(255,255,255,0.46)", fontSize: 11, fontWeight: "800", marginTop: 3 }}>{label}</Text>
    </View>
  );
}

function formatControlValue(value: number, suffix?: string) {
  if (suffix) {
    return `${Math.round(value)}${suffix}`;
  }
  return `${value.toFixed(1)}x`;
}

function ratioValue(value: string) {
  if (value === "1:1") {
    return 1;
  }
  if (value === "9:16") {
    return 9 / 16;
  }
  if (value === "16:9") {
    return 16 / 9;
  }
  return 4 / 5;
}
