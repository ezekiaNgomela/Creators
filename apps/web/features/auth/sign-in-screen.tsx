import { useEffect, useRef, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, Button, Snackbar, Text, TextInput } from "react-native-paper";
import { ScrollView, useWindowDimensions, View } from "react-native";
import { GlassPanel } from "@/components/glass-panel";
import { ScreenBackground } from "@/components/screen-background";
import { getGoogleAuthURL, type AuthResponse } from "@/lib/api";
import { useSession } from "@/providers/session-provider";

function decodeAuthPayload(encoded: string): AuthResponse {
  const normalized = encoded.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const json = typeof atob === "function" ? atob(padded) : "";
  return JSON.parse(json) as AuthResponse;
}

export function SignInScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ auth?: string | string[]; oauthError?: string | string[] }>();
  const { width } = useWindowDimensions();
  const compact = width < 920;
  const handledOAuth = useRef(false);
  const { signIn, applyAuthResponse } = useSession();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const oauthError = Array.isArray(params.oauthError) ? params.oauthError[0] : params.oauthError;
    if (oauthError) {
      setMessage(oauthError);
    }
  }, [params.oauthError]);

  useEffect(() => {
    if (handledOAuth.current) {
      return;
    }
    const authPayload = Array.isArray(params.auth) ? params.auth[0] : params.auth;
    if (!authPayload) {
      return;
    }

    handledOAuth.current = true;
    try {
      const response = decodeAuthPayload(authPayload);
      applyAuthResponse(response);
      router.replace("/studio");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to finish Google sign-in.");
    }
  }, [applyAuthResponse, params.auth, router]);

  async function handleSubmit() {
    setBusy(true);
    try {
      await signIn({ email, password });
      router.replace("/studio");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to sign in.");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogleSignIn() {
    setGoogleBusy(true);
    try {
      const response = await getGoogleAuthURL();
      if (typeof window !== "undefined") {
        window.location.href = response.url;
        return;
      }
      setMessage("Google sign-in is currently wired for the web flow.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to start Google sign-in.");
    } finally {
      setGoogleBusy(false);
    }
  }

  return (
    <ScreenBackground>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          paddingHorizontal: compact ? 18 : 28,
          paddingVertical: 88,
        }}
      >
        <View
          style={{
            marginHorizontal: "auto",
            width: "100%",
            maxWidth: 1080,
            flexDirection: compact ? "column" : "row",
            gap: 22,
          }}
        >
          <GlassPanel
            style={{
              flex: compact ? 0 : 1,
            }}
          >
            <Text selectable style={{ color: "#fbbf24", fontSize: 12, fontWeight: "700", letterSpacing: 1.1, textTransform: "uppercase" }}>
              Unified access
            </Text>
            <Text selectable style={{ color: "#f8fafc", fontSize: compact ? 34 : 50, fontWeight: "800", lineHeight: compact ? 40 : 56 }}>
              One login path for creators, viewers, and the studio controls behind them.
            </Text>
            <Text selectable style={{ color: "#cbd5e1", fontSize: 16, lineHeight: 24 }}>
              The rebuilt app signs in through the gateway first, then uses the token for the studio workspace and account lookup.
            </Text>
          </GlassPanel>

          <GlassPanel
            style={{
              flex: compact ? 0 : 1,
            }}
          >
            <TextInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              mode="outlined"
            />
            <TextInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              mode="outlined"
            />
            <Button
              mode="contained"
              onPress={handleSubmit}
              disabled={busy || googleBusy}
              contentStyle={{ paddingVertical: 8 }}
              buttonColor="#f59e0b"
              textColor="#111827"
            >
              {busy ? "Signing in..." : "Sign in"}
            </Button>
            <Button
              mode="outlined"
              onPress={handleGoogleSignIn}
              disabled={busy || googleBusy}
            >
              {googleBusy ? "Opening Google..." : "Continue with Google"}
            </Button>
            {busy ? <ActivityIndicator animating color="#fbbf24" /> : null}
            <Button mode="text" onPress={() => router.replace("/join")}>
              Need an account? Create one
            </Button>
          </GlassPanel>
        </View>
      </ScrollView>
      <Snackbar visible={Boolean(message)} onDismiss={() => setMessage("")}>
        {message}
      </Snackbar>
    </ScreenBackground>
  );
}
