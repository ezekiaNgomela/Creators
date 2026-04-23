import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { palette, radius, spacing } from "@/src/theme/tokens";

const quickEmoji = [":sparkles:", ":fire:", ":heart:", ":raised_hands:"];

export function CommentComposer({
  onSubmit,
  placeholder,
}: {
  onSubmit: (value: string) => Promise<void> | void;
  placeholder: string;
}) {
  const [value, setValue] = useState("");

  async function submit() {
    if (!value.trim()) {
      return;
    }
    await onSubmit(value);
    setValue("");
  }

  return (
    <View style={{ gap: spacing.sm }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.sm,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: palette.stroke,
          backgroundColor: palette.panelRaised,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
        }}
      >
        <TextInput
          onChangeText={setValue}
          placeholder={placeholder}
          placeholderTextColor={palette.textMuted}
          style={{ color: palette.text, flex: 1, minHeight: 42 }}
          value={value}
        />
        <Pressable onPress={() => void submit()}>
          <Text style={{ color: palette.accent, fontWeight: "800" }}>Send</Text>
        </Pressable>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
        {quickEmoji.map((emoji) => (
          <Pressable
            key={emoji}
            onPress={() => setValue((current) => `${current}${current ? " " : ""}${emoji}`)}
            style={{
              borderRadius: radius.pill,
              borderWidth: 1,
              borderColor: palette.stroke,
              backgroundColor: palette.panel,
              paddingHorizontal: spacing.sm,
              paddingVertical: spacing.xs,
            }}
          >
            <Text style={{ color: palette.textMuted }}>{emoji}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
