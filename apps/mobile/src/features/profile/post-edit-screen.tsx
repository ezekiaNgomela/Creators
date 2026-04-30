import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Share, Text, TextInput, View } from "react-native";

import { useApp } from "@/src/providers/app-provider";
import { radius, spacing } from "@/src/theme/tokens";

const editColors = {
  bg: "#fff9f6",
  card: "#ffffff",
  ink: "#191216",
  muted: "#8c7a74",
  line: "rgba(65, 42, 34, 0.08)",
  accent: "#ff6f5e",
  accentDark: "#d94c61",
};

const stickers = ["LIVE", "DROP", "NEW", "VIP", "Q&A", ""];
const tones = ["midnight", "sunset", "emerald", "violet"];
const textColors = ["#ffffff", "#fff5da", "#d8fff1", "#bfe0ff", "#ffb8cf"];

export function PostEditScreen() {
  const { postId } = useLocalSearchParams<{ postId?: string }>();
  const { displayPosts, updateStudioPost, uploadStudioMedia } = useApp();
  const post = useMemo(() => displayPosts.find((item) => String(item.id) === String(postId)), [displayPosts, postId]);
  const [body, setBody] = useState(post?.body ?? "");
  const [mood, setMood] = useState(post?.mood ?? "Update");
  const [mediaUrl, setMediaUrl] = useState(post?.mediaUrl || post?.gallery[0] || "");
  const [mediaType, setMediaType] = useState<"image" | "video" | string>(post?.mediaType ?? "image");
  const [overlayText, setOverlayText] = useState(post?.overlayText ?? "");
  const [sticker, setSticker] = useState(post?.sticker ?? "NEW");
  const [textColor, setTextColor] = useState(post?.textColor ?? "#ffffff");
  const [backgroundTone, setBackgroundTone] = useState(post?.backgroundTone ?? "midnight");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!post) {
      return;
    }
    setBody(post.body);
    setMood(post.mood);
    setMediaUrl(post.mediaUrl || post.gallery[0] || "");
    setMediaType(post.mediaType);
    setOverlayText(post.overlayText);
    setSticker(post.sticker || "NEW");
    setTextColor(post.textColor || "#ffffff");
    setBackgroundTone(post.backgroundTone || "midnight");
  }, [post?.id]);

  async function chooseMedia() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setStatus("Media access is needed to update this post.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      quality: 0.92,
      videoMaxDuration: 60,
    });
    if (result.canceled || !result.assets[0]) {
      return;
    }
    const asset = result.assets[0];
    const pickedType = asset.type === "video" ? "video" : "image";
    setUploading(true);
    setStatus("Uploading replacement media...");
    try {
      const upload = await uploadStudioMedia({
        uri: asset.uri,
        name: asset.fileName ?? `post-${Date.now()}.${pickedType === "video" ? "mp4" : "jpg"}`,
        type: asset.mimeType ?? (pickedType === "video" ? "video/mp4" : "image/jpeg"),
      });
      setMediaUrl(upload.url);
      setMediaType(upload.mediaType === "video" ? "video" : "image");
      setStatus("Media updated.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Could not upload media.");
    } finally {
      setUploading(false);
    }
  }

  async function save(destination: "profile" | "home") {
    if (!post || saving || !body.trim()) {
      return;
    }
    setSaving(true);
    setStatus(destination === "home" ? "Saving to home feed..." : "Saving post...");
    try {
      const updated = await updateStudioPost(post.id, {
        body,
        mood,
        mediaUrl,
        mediaType,
        filterName: post.filterName || "Original",
        overlayText,
        sticker,
        textColor,
        backgroundTone,
        aspectRatio: post.aspectRatio || "4:5",
        cropZoom: post.cropZoom || 1,
        cropX: post.cropX || 50,
        cropY: post.cropY || 50,
        rotation: post.rotation || 0,
      });
      setStatus("Post updated.");
      if (destination === "home") {
        router.replace("/(tabs)/home");
      } else {
        router.back();
      }
      return updated;
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Could not save post.");
    } finally {
      setSaving(false);
    }
  }

  if (!post) {
    return (
      <View style={{ flex: 1, backgroundColor: editColors.bg, alignItems: "center", justifyContent: "center", padding: spacing.lg }}>
        <Text style={{ color: editColors.ink, fontSize: 20, fontWeight: "900" as const }}>Post not found</Text>
        <Pressable onPress={() => router.back()} style={[pillButton, { marginTop: spacing.md }]}>
          <Text style={pillButtonText}>Back to profile</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: 110 }} contentInsetAdjustmentBehavior="automatic" style={{ flex: 1, backgroundColor: editColors.bg }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Pressable onPress={() => router.back()} style={iconButton}>
          <Ionicons color={editColors.ink} name="chevron-back" size={20} />
        </Pressable>
        <Text style={{ color: editColors.ink, fontSize: 18, fontWeight: "900" as const }}>Edit post</Text>
        <Pressable onPress={() => void Share.share({ message: `${body}\nShared from Creators` })} style={iconButton}>
          <Ionicons color={editColors.ink} name="share-social-outline" size={18} />
        </Pressable>
      </View>

      <View style={{ borderRadius: 30, backgroundColor: "#11131b", padding: spacing.sm, boxShadow: "0 22px 50px rgba(80, 36, 28, 0.18)" }}>
        <View style={{ aspectRatio: 4 / 5, borderRadius: 24, overflow: "hidden", backgroundColor: "#07080e" }}>
          {mediaUrl && mediaType !== "video" ? (
            <Image contentFit="cover" source={{ uri: mediaUrl }} style={{ width: "100%", height: "100%" }} />
          ) : (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.sm }}>
              <Ionicons color="rgba(255,255,255,0.48)" name={mediaType === "video" ? "videocam-outline" : "images-outline"} size={34} />
              <Text style={{ color: "rgba(255,255,255,0.62)", fontWeight: "900" as const }}>{mediaType === "video" ? "Video post" : "No media selected"}</Text>
            </View>
          )}
          <LinearGradient colors={toneColors(backgroundTone)} style={{ position: "absolute", inset: 0 }} />
          <LinearGradient colors={["transparent", "rgba(0,0,0,0.82)"]} style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 180 }} />
          {sticker ? (
            <View style={{ position: "absolute", top: spacing.md, left: spacing.md, borderRadius: radius.pill, backgroundColor: "rgba(0,0,0,0.42)", paddingHorizontal: spacing.sm, paddingVertical: 6 }}>
              <Text style={{ color: "#fff", fontSize: 12, fontWeight: "900" as const }}>{sticker}</Text>
            </View>
          ) : null}
          {overlayText ? (
            <Text style={{ position: "absolute", left: spacing.md, right: spacing.md, bottom: 88, color: textColor, fontSize: 34, lineHeight: 34, fontWeight: "900" as const }} numberOfLines={3} adjustsFontSizeToFit>
              {overlayText}
            </Text>
          ) : null}
          <Text style={{ position: "absolute", left: spacing.md, right: spacing.md, bottom: spacing.md, color: "#fff", fontSize: 13, lineHeight: 18, fontWeight: "800" as const }} numberOfLines={3}>
            {body || "Write a caption to preview it here."}
          </Text>
        </View>
      </View>

      <View style={{ gap: spacing.sm }}>
        <EditorField label="Caption" multiline onChangeText={setBody} value={body} />
        <EditorField label="Mood" onChangeText={setMood} value={mood} />
        <EditorField label="Overlay text" onChangeText={setOverlayText} value={overlayText} />

        <EditorGroup label="Sticker">
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
            {stickers.map((item) => (
              <Chip key={item || "none"} active={sticker === item} label={item || "None"} onPress={() => setSticker(item)} />
            ))}
          </View>
        </EditorGroup>

        <EditorGroup label="Tone">
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
            {tones.map((item) => (
              <Chip key={item} active={backgroundTone === item} label={item} onPress={() => setBackgroundTone(item)} />
            ))}
          </View>
        </EditorGroup>

        <EditorGroup label="Text color">
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            {textColors.map((color) => (
              <Pressable
                key={color}
                onPress={() => setTextColor(color)}
                style={{ width: 36, height: 36, borderRadius: radius.pill, borderWidth: 3, borderColor: textColor === color ? editColors.accent : "#fff", backgroundColor: color }}
              />
            ))}
          </View>
        </EditorGroup>
      </View>

      <Pressable disabled={uploading} onPress={() => void chooseMedia()} style={[pillButton, { backgroundColor: "#fff", borderWidth: 1, borderColor: editColors.line }]}>
        {uploading ? <ActivityIndicator color={editColors.accent} /> : <Ionicons color={editColors.accent} name="cloud-upload-outline" size={18} />}
        <Text style={[pillButtonText, { color: editColors.ink }]}>{uploading ? "Uploading" : "Replace media"}</Text>
      </Pressable>

      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        <Pressable disabled={saving || !body.trim()} onPress={() => void save("profile")} style={[pillButton, { flex: 1, backgroundColor: "#fff", borderWidth: 1, borderColor: editColors.line }]}>
          <Text style={[pillButtonText, { color: editColors.ink }]}>{saving ? "Saving" : "Save"}</Text>
        </Pressable>
        <Pressable disabled={saving || !body.trim()} onPress={() => void save("home")} style={[pillButton, { flex: 1 }]}>
          <Text style={pillButtonText}>Save to Home</Text>
        </Pressable>
      </View>

      {status ? <Text selectable style={{ color: editColors.muted, fontSize: 12, fontWeight: "800" as const, textAlign: "center" }}>{status}</Text> : null}
    </ScrollView>
  );
}

function EditorField({ label, multiline, onChangeText, value }: { label: string; multiline?: boolean; onChangeText: (value: string) => void; value: string }) {
  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={{ color: editColors.muted, fontSize: 11, fontWeight: "900" as const, textTransform: "uppercase" }}>{label}</Text>
      <TextInput
        multiline={multiline}
        onChangeText={onChangeText}
        placeholderTextColor="#b8aaa4"
        style={{ minHeight: multiline ? 110 : 52, borderRadius: 18, borderWidth: 1, borderColor: editColors.line, backgroundColor: editColors.card, color: editColors.ink, padding: spacing.md, textAlignVertical: multiline ? "top" : "center" }}
        value={value}
      />
    </View>
  );
}

function EditorGroup({ children, label }: { children: ReactNode; label: string }) {
  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={{ color: editColors.muted, fontSize: 11, fontWeight: "900" as const, textTransform: "uppercase" }}>{label}</Text>
      {children}
    </View>
  );
}

function Chip({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ minHeight: 36, borderRadius: radius.pill, backgroundColor: active ? editColors.accent : "#fff", borderWidth: 1, borderColor: active ? "transparent" : editColors.line, justifyContent: "center", paddingHorizontal: spacing.md }}>
      <Text style={{ color: active ? "#fff" : editColors.ink, fontSize: 12, fontWeight: "900" as const }}>{label}</Text>
    </Pressable>
  );
}

function toneColors(tone: string): [string, string] {
  if (tone === "sunset") {
    return ["rgba(255,142,104,0.18)", "rgba(61,18,16,0.34)"];
  }
  if (tone === "emerald") {
    return ["rgba(46,213,115,0.14)", "rgba(7,54,48,0.34)"];
  }
  if (tone === "violet") {
    return ["rgba(139,92,246,0.18)", "rgba(55,22,71,0.34)"];
  }
  return ["rgba(9,13,24,0.04)", "rgba(20,27,50,0.42)"];
}

const iconButton = {
  width: 42,
  height: 42,
  borderRadius: radius.pill,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "#fff",
  borderWidth: 1,
  borderColor: editColors.line,
} as const;

const pillButton = {
  minHeight: 50,
  borderRadius: radius.pill,
  alignItems: "center",
  justifyContent: "center",
  flexDirection: "row",
  gap: spacing.xs,
  backgroundColor: editColors.accent,
} as const;

const pillButtonText = {
  color: "#fff",
  fontWeight: "900" as const,
};
