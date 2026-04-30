import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { type ReactNode, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { useApp } from "@/src/providers/app-provider";
import { radius, spacing } from "@/src/theme/tokens";

type ThemeName = "default" | "dark" | "beautiful";

const settingsColors = {
  bg: "#fff9f6",
  card: "#ffffff",
  ink: "#191216",
  muted: "#8c7a74",
  line: "rgba(65, 42, 34, 0.08)",
  soft: "#fff0ea",
  accent: "#ff6f5e",
  accentDark: "#d94c61",
  mint: "#39c6ad",
};

const themeOptions: Array<{ id: ThemeName; label: string; swatches: [string, string, string] }> = [
  { id: "default", label: "Default", swatches: ["#6de9b7", "#6ea8ff", "#070b14"] },
  { id: "dark", label: "Dark", swatches: ["#ff5b7e", "#202938", "#0d111a"] },
  { id: "beautiful", label: "Glow", swatches: ["#ff8e68", "#ff4d86", "#2d234f"] },
];

export function SettingsScreen() {
  const { profile, saveProfile, setTheme, theme, uploadStudioMedia } = useApp();
  const [name, setName] = useState(profile?.user.name ?? "");
  const [headline, setHeadline] = useState(profile?.headline ?? "");
  const [location, setLocation] = useState(profile?.location ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatarUrl ?? profile?.user.avatarUrl ?? "");
  const [coverUrl, setCoverUrl] = useState(profile?.coverUrl ?? "");
  const [websiteUrl, setWebsiteUrl] = useState(profile?.websiteUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"avatar" | "cover" | null>(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    setName(profile?.user.name ?? "");
    setHeadline(profile?.headline ?? "");
    setLocation(profile?.location ?? "");
    setBio(profile?.bio ?? "");
    setAvatarUrl(profile?.avatarUrl ?? profile?.user.avatarUrl ?? "");
    setCoverUrl(profile?.coverUrl ?? "");
    setWebsiteUrl(profile?.websiteUrl ?? "");
  }, [profile?.avatarUrl, profile?.bio, profile?.coverUrl, profile?.headline, profile?.location, profile?.user.avatarUrl, profile?.user.name, profile?.websiteUrl]);

  async function pickProfileMedia(target: "avatar" | "cover") {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setStatus("Media access is needed to update profile images.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.9,
    });
    if (result.canceled || !result.assets[0]) {
      return;
    }

    setUploading(target);
    setStatus(`Uploading ${target}...`);
    try {
      const asset = result.assets[0];
      const upload = await uploadStudioMedia({
        uri: asset.uri,
        name: asset.fileName ?? `${target}.jpg`,
        type: asset.mimeType ?? "image/jpeg",
      });
      if (target === "avatar") {
        setAvatarUrl(upload.url);
      } else {
        setCoverUrl(upload.url);
      }
      setStatus(`${target === "avatar" ? "Avatar" : "Cover"} ready.`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Could not upload media.");
    } finally {
      setUploading(null);
    }
  }

  async function save() {
    if (saving) {
      return;
    }
    setSaving(true);
    setStatus("Saving profile...");
    try {
      await saveProfile({ name, bio, headline, location, avatarUrl, coverUrl, websiteUrl });
      setStatus("Profile saved.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Could not save profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.md, paddingTop: spacing.sm, gap: spacing.sm, paddingBottom: 90 }} contentInsetAdjustmentBehavior="automatic" style={{ flex: 1, backgroundColor: settingsColors.bg }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Pressable onPress={() => router.back()} style={iconButton}>
          <Ionicons color={settingsColors.ink} name="chevron-back" size={20} />
        </Pressable>
        <Text style={{ color: settingsColors.ink, fontSize: 18, fontWeight: "900" as const }}>Settings</Text>
        <Pressable disabled={saving} onPress={() => void save()} style={[iconButton, { backgroundColor: settingsColors.ink }]}>
          {saving ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons color="#fff" name="checkmark" size={20} />}
        </Pressable>
      </View>

      <View style={{ borderRadius: 24, overflow: "hidden", backgroundColor: settingsColors.card, borderWidth: 1, borderColor: settingsColors.line }}>
        <View style={{ height: 132, backgroundColor: settingsColors.soft }}>
          {coverUrl ? <Image contentFit="cover" source={{ uri: coverUrl }} style={{ width: "100%", height: "100%" }} /> : null}
          <LinearGradient colors={["transparent", "rgba(25,18,22,0.42)"]} style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 80 }} />
          <Pressable onPress={() => void pickProfileMedia("cover")} style={{ position: "absolute", right: spacing.sm, bottom: spacing.sm, borderRadius: radius.pill, backgroundColor: "rgba(255,255,255,0.92)", paddingHorizontal: spacing.sm, paddingVertical: 7, flexDirection: "row", alignItems: "center", gap: 5 }}>
            {uploading === "cover" ? <ActivityIndicator color={settingsColors.accent} size="small" /> : <Ionicons color={settingsColors.accent} name="image-outline" size={14} />}
            <Text style={{ color: settingsColors.ink, fontSize: 11, fontWeight: "900" as const }}>Cover</Text>
          </Pressable>
        </View>

        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: spacing.sm, paddingHorizontal: spacing.md, paddingBottom: spacing.md, marginTop: -30 }}>
          <Pressable onPress={() => void pickProfileMedia("avatar")} style={{ width: 74, height: 74, borderRadius: radius.pill, padding: 3, backgroundColor: "#fff" }}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={{ width: "100%", height: "100%", borderRadius: radius.pill }} />
            ) : (
              <View style={{ width: "100%", height: "100%", borderRadius: radius.pill, alignItems: "center", justifyContent: "center", backgroundColor: settingsColors.accent }}>
                <Text style={{ color: "#fff", fontSize: 26, fontWeight: "900" as const }}>{(name || "C").slice(0, 1).toUpperCase()}</Text>
              </View>
            )}
            <View style={{ position: "absolute", right: 0, bottom: 0, width: 25, height: 25, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", backgroundColor: settingsColors.ink }}>
              {uploading === "avatar" ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons color="#fff" name="camera" size={13} />}
            </View>
          </Pressable>
          <View style={{ flex: 1, gap: 3 }}>
            <Text numberOfLines={1} style={{ color: settingsColors.ink, fontSize: 17, fontWeight: "900" as const }}>{name || "Creator"}</Text>
            <Text numberOfLines={1} style={{ color: settingsColors.muted, fontSize: 12, fontWeight: "800" as const }}>{profile?.user.email ?? "Profile email"}</Text>
          </View>
        </View>
      </View>

      <FormSection title="Profile">
        <Field label="Name" onChangeText={setName} value={name} />
        <Field label="Headline" onChangeText={setHeadline} value={headline} />
        <Field label="Location" onChangeText={setLocation} value={location} />
        <Field label="Website" onChangeText={setWebsiteUrl} value={websiteUrl} />
        <Field label="Bio" multiline onChangeText={setBio} value={bio} />
      </FormSection>

      <FormSection title="Theme">
        <View style={{ flexDirection: "row", gap: spacing.xs }}>
          {themeOptions.map((option) => (
            <Pressable key={option.id} onPress={() => setTheme(option.id)} style={{ flex: 1, minHeight: 64, borderRadius: 16, borderWidth: 1, borderColor: theme === option.id ? settingsColors.accent : settingsColors.line, backgroundColor: theme === option.id ? "#fff4ef" : "#fff", padding: spacing.sm, justifyContent: "space-between" }}>
              <View style={{ flexDirection: "row", gap: 4 }}>
                {option.swatches.map((color) => (
                  <View key={color} style={{ width: 14, height: 20, borderRadius: radius.pill, backgroundColor: color }} />
                ))}
              </View>
              <Text numberOfLines={1} style={{ color: settingsColors.ink, fontSize: 12, fontWeight: "900" as const }}>{option.label}</Text>
            </Pressable>
          ))}
        </View>
      </FormSection>

      <View style={{ flexDirection: "row", gap: spacing.xs }}>
        <Pressable onPress={() => router.push("/(tabs)/profile")} style={[bottomButton, { backgroundColor: "#fff", borderWidth: 1, borderColor: settingsColors.line }]}>
          <Text style={[bottomButtonText, { color: settingsColors.ink }]}>View profile</Text>
        </Pressable>
        <Pressable disabled={saving} onPress={() => void save()} style={bottomButton}>
          <Text style={bottomButtonText}>{saving ? "Saving" : "Save profile"}</Text>
        </Pressable>
      </View>

      {status ? <Text selectable style={{ color: settingsColors.muted, fontSize: 12, fontWeight: "800" as const, textAlign: "center" }}>{status}</Text> : null}
    </ScrollView>
  );
}

function FormSection({ children, title }: { children: ReactNode; title: string }) {
  return (
    <View style={{ gap: spacing.sm, borderRadius: 22, backgroundColor: settingsColors.card, borderWidth: 1, borderColor: settingsColors.line, padding: spacing.sm }}>
      <Text style={{ color: settingsColors.ink, fontSize: 14, fontWeight: "900" as const }}>{title}</Text>
      {children}
    </View>
  );
}

function Field({ label, multiline, onChangeText, value }: { label: string; multiline?: boolean; onChangeText: (value: string) => void; value: string }) {
  return (
    <View style={{ gap: 5 }}>
      <Text style={{ color: settingsColors.muted, fontSize: 10, fontWeight: "900" as const, textTransform: "uppercase" }}>{label}</Text>
      <TextInput
        multiline={multiline}
        onChangeText={onChangeText}
        placeholder={label}
        placeholderTextColor="#b8aaa4"
        style={{
          minHeight: multiline ? 88 : 46,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: settingsColors.line,
          backgroundColor: settingsColors.bg,
          color: settingsColors.ink,
          paddingHorizontal: spacing.sm,
          paddingVertical: multiline ? spacing.sm : 0,
          textAlignVertical: multiline ? "top" : "center",
        }}
        value={value}
      />
    </View>
  );
}

const iconButton = {
  width: 40,
  height: 40,
  borderRadius: radius.pill,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "#fff",
  borderWidth: 1,
  borderColor: settingsColors.line,
} as const;

const bottomButton = {
  flex: 1,
  minHeight: 48,
  borderRadius: radius.pill,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: settingsColors.accent,
} as const;

const bottomButtonText = {
  color: "#fff",
  fontWeight: "900" as const,
};
