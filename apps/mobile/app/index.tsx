import { Redirect, router } from "expo-router";
import { useState } from "react";
import { ImageBackground, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { GlassCard } from "@/src/components/ui/glass-card";
import { PrimaryButton } from "@/src/components/ui/primary-button";
import { useApp } from "@/src/providers/app-provider";
import { palette, radius, spacing } from "@/src/theme/tokens";

export default function LandingScreen() {
  const { isBooting, session, signIn, signUp } = useApp();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  if (session) {
    return <Redirect href="/(tabs)/home" />;
  }

  if (isBooting) {
    return <View style={{ flex: 1, backgroundColor: palette.bg }} />;
  }

  async function submit() {
    try {
      setError("");
      if (mode === "register") {
        await signUp({ name, email, password });
      } else {
        await signIn({ email, password });
      }
      router.replace("/(tabs)/home");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not continue");
    }
  }

  return (
    <ImageBackground
      source={{ uri: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80" }}
      style={{ flex: 1 }}
    >
      <View style={{ flex: 1, backgroundColor: "rgba(4,7,14,0.72)" }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "flex-end", padding: spacing.lg }}>
          <Text style={{ color: palette.accent, fontSize: 12, fontWeight: "900", letterSpacing: 1.4, textTransform: "uppercase" }}>
            Creator studio
          </Text>
          <Text style={{ color: palette.text, fontSize: 44, fontWeight: "900", marginTop: spacing.sm }}>
            Creators
          </Text>
          <Text style={{ color: palette.textMuted, fontSize: 16, lineHeight: 24, marginTop: spacing.sm, marginBottom: spacing.xl }}>
            Wild social storytelling, live rooms, studio tools, and creator messaging in one mobile-native flow.
          </Text>

          <GlassCard>
            <View style={{ flexDirection: "row", gap: spacing.sm, marginBottom: spacing.lg }}>
              {(["login", "register"] as const).map((item) => (
                <Pressable
                  key={item}
                  onPress={() => setMode(item)}
                  style={{
                    flex: 1,
                    minHeight: 42,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: radius.pill,
                    backgroundColor: mode === item ? palette.accent : palette.panelRaised,
                  }}
                >
                  <Text style={{ color: mode === item ? palette.black : palette.text, fontWeight: "800" }}>
                    {item === "login" ? "Login" : "Register"}
                  </Text>
                </Pressable>
              ))}
            </View>

            {mode === "register" ? (
              <TextInput
                onChangeText={setName}
                placeholder="Name"
                placeholderTextColor={palette.textMuted}
                style={fieldStyle}
                value={name}
              />
            ) : null}
            <TextInput onChangeText={setEmail} placeholder="Email" placeholderTextColor={palette.textMuted} style={fieldStyle} value={email} />
            <TextInput onChangeText={setPassword} placeholder="Password" placeholderTextColor={palette.textMuted} secureTextEntry style={fieldStyle} value={password} />
            {error ? <Text style={{ color: palette.danger, marginBottom: spacing.sm }}>{error}</Text> : null}
            <PrimaryButton label={mode === "login" ? "Continue to app" : "Create account"} onPress={() => void submit()} />
          </GlassCard>
        </ScrollView>
      </View>
    </ImageBackground>
  );
}

const fieldStyle = {
  minHeight: 48,
  borderRadius: radius.lg,
  borderWidth: 1,
  borderColor: palette.stroke,
  backgroundColor: palette.panelRaised,
  color: palette.text,
  paddingHorizontal: spacing.md,
  marginBottom: spacing.sm,
} as const;
