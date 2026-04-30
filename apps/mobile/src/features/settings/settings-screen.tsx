import { useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { PrimaryButton } from "@/src/components/ui/primary-button";
import { useApp } from "@/src/providers/app-provider";
import { palette, radius, spacing } from "@/src/theme/tokens";

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

  async function pickProfileMedia(target: "avatar" | "cover") {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
    });
    if (result.canceled || !result.assets[0]) {
      return;
    }
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
  }

  async function save() {
    setSaving(true);
    try {
      await saveProfile({ name, bio, headline, location, avatarUrl, coverUrl, websiteUrl });
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: 60 }} contentInsetAdjustmentBehavior="automatic" style={{ flex: 1, backgroundColor: palette.bg }}>
      <Text style={{ color: palette.text, fontSize: 30, fontWeight: "900" }}>Settings</Text>
      <View style={{ borderRadius: radius.xl, overflow: "hidden", borderWidth: 1, borderColor: palette.stroke, backgroundColor: palette.panel }}>
        {coverUrl ? <Image source={{ uri: coverUrl }} style={{ width: "100%", height: 116 }} /> : <View style={{ height: 116, backgroundColor: palette.panelRaised }} />}
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md }}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={{ width: 58, height: 58, borderRadius: radius.lg }} />
          ) : (
            <View style={{ width: 58, height: 58, borderRadius: radius.lg, alignItems: "center", justifyContent: "center", backgroundColor: palette.accent }}>
              <Text style={{ color: palette.black, fontSize: 22, fontWeight: "900" as const }}>{name.slice(0, 1) || "C"}</Text>
            </View>
          )}
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ color: palette.text, fontWeight: "900" as const }}>{name || "Creator"}</Text>
            <Text style={{ color: palette.textMuted, fontSize: 12 }}>{profile?.user.email}</Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: spacing.sm, padding: spacing.md, paddingTop: 0 }}>
          <Pressable onPress={() => pickProfileMedia("avatar")} style={mediaButton}><Text style={mediaText}>Avatar</Text></Pressable>
          <Pressable onPress={() => pickProfileMedia("cover")} style={mediaButton}><Text style={mediaText}>Cover</Text></Pressable>
        </View>
      </View>
      {[
        { value: name, setValue: setName, placeholder: "Name" },
        { value: headline, setValue: setHeadline, placeholder: "Headline" },
        { value: location, setValue: setLocation, placeholder: "Location" },
        { value: websiteUrl, setValue: setWebsiteUrl, placeholder: "Website" },
        { value: bio, setValue: setBio, placeholder: "Bio", multiline: true },
      ].map((field) => (
        <TextInput
          key={field.placeholder}
          multiline={field.multiline}
          onChangeText={field.setValue}
          placeholder={field.placeholder}
          placeholderTextColor={palette.textMuted}
          style={{
            minHeight: field.multiline ? 120 : 52,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: palette.stroke,
            backgroundColor: palette.panelRaised,
            color: palette.text,
            padding: spacing.md,
            textAlignVertical: field.multiline ? "top" : "center",
          }}
          value={field.value}
        />
      ))}
      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        {(["default", "dark", "beautiful"] as const).map((item) => (
          <PrimaryButton key={item} label={item === theme ? `${item} active` : item} onPress={() => setTheme(item)} />
        ))}
      </View>
      <PrimaryButton label={saving ? "Saving" : "Save profile"} onPress={() => void save()} />
    </ScrollView>
  );
}

const mediaButton = {
  flex: 1,
  minHeight: 42,
  borderRadius: radius.pill,
  alignItems: "center",
  justifyContent: "center",
  borderWidth: 1,
  borderColor: palette.stroke,
  backgroundColor: palette.panelRaised,
} as const;

const mediaText = {
  color: palette.text,
  fontWeight: "900" as const,
};
