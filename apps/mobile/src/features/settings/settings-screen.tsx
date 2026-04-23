import { useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";

import { PrimaryButton } from "@/src/components/ui/primary-button";
import { useApp } from "@/src/providers/app-provider";
import { palette, radius, spacing } from "@/src/theme/tokens";

export function SettingsScreen() {
  const { profile, saveProfile, setTheme, theme } = useApp();
  const [name, setName] = useState(profile?.user.name ?? "");
  const [headline, setHeadline] = useState(profile?.headline ?? "");
  const [location, setLocation] = useState(profile?.location ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: 60 }} contentInsetAdjustmentBehavior="automatic" style={{ flex: 1, backgroundColor: palette.bg }}>
      <Text style={{ color: palette.text, fontSize: 30, fontWeight: "900" }}>Settings</Text>
      {[
        { value: name, setValue: setName, placeholder: "Name" },
        { value: headline, setValue: setHeadline, placeholder: "Headline" },
        { value: location, setValue: setLocation, placeholder: "Location" },
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
      <PrimaryButton label="Save profile" onPress={() => void saveProfile({ name, bio, headline, location })} />
    </ScrollView>
  );
}
