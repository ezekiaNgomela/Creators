import { useMemo, useState } from "react";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Button,
  SegmentedButtons,
  Snackbar,
  Text,
  TextInput,
} from "react-native-paper";
import { ScrollView, useWindowDimensions, View } from "react-native";
import { GlassPanel } from "@/components/glass-panel";
import { ScreenBackground } from "@/components/screen-background";
import { verifyEmail } from "@/lib/api";
import { useSession } from "@/providers/session-provider";

type JoinMode = "user" | "creator";

export function JoinScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const compact = width < 920;
  const { registerCreator, registerUser } = useSession();

  const [mode, setMode] = useState<JoinMode>("user");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [channelName, setChannelName] = useState("");
  const [planBilling, setPlanBilling] = useState<"monthly" | "yearly">("monthly");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [verificationToken, setVerificationToken] = useState("");
  const [verificationBusy, setVerificationBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const roleCopy = useMemo(() => {
    if (mode === "creator") {
      return "Creator setup opens channel-ready registration and exposes the verification token so you can complete the loop immediately.";
    }
    return "Viewer setup creates a ready-to-use account and moves you straight into the studio flow.";
  }, [mode]);

  async function handleSubmit() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (mode === "creator") {
        const response = await registerCreator({
          username,
          email,
          password,
          displayName,
          channelName,
          planBilling,
        });
        const token = String(response.meta?.verificationToken ?? "");
        setVerificationToken(token);
        setNotice("Creator account created. Complete verification below, then sign in.");
        return;
      }

      await registerUser({
        username,
        email,
        password,
      });
      router.replace("/studio");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to create account.");
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify() {
    if (!verificationToken) {
      return;
    }
    setVerificationBusy(true);
    setError("");
    try {
      await verifyEmail(verificationToken);
      setNotice("Email verified. You can sign in as the creator account now.");
      router.replace("/sign-in");
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : "Verification failed.");
    } finally {
      setVerificationBusy(false);
    }
  }

  return (
    <ScreenBackground>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: compact ? 18 : 28,
          paddingVertical: 88,
        }}
      >
        <View
          style={{
            marginHorizontal: "auto",
            width: "100%",
            maxWidth: 1120,
            flexDirection: compact ? "column" : "row",
            gap: 22,
          }}
        >
          <GlassPanel
            style={{
              flex: compact ? 0 : 1,
            }}
          >
            <Text
              selectable
              style={{
                color: "#fbbf24",
                fontSize: 12,
                fontWeight: "700",
                letterSpacing: 1.2,
                textTransform: "uppercase",
              }}
            >
              Live onboarding
            </Text>
            <Text
              selectable
              style={{
                color: "#f8fafc",
                fontSize: compact ? 34 : 48,
                fontWeight: "800",
                lineHeight: compact ? 40 : 56,
              }}
            >
              Build the audience path before the visuals get crowded.
            </Text>
            <Text
              selectable
              style={{
                color: "#cbd5e1",
                fontSize: 16,
                lineHeight: 24,
              }}
            >
              {roleCopy}
            </Text>
            <View
              style={{
                gap: 12,
              }}
            >
              <Text selectable style={{ color: "#dbe4ff", fontSize: 16, fontWeight: "700" }}>
                The rebuilt flow keeps one clean path:
              </Text>
              <Text selectable style={{ color: "#cbd5e1", lineHeight: 23 }}>
                Register, verify if you are a creator, sign in through the gateway, then operate posts, subscriptions, stream access, and LiveKit token creation from one studio.
              </Text>
            </View>
          </GlassPanel>

          <GlassPanel
            style={{
              flex: compact ? 0 : 1,
            }}
          >
            <SegmentedButtons
              value={mode}
              onValueChange={(value) => setMode(value as JoinMode)}
              buttons={[
                { value: "user", label: "Viewer" },
                { value: "creator", label: "Creator" },
              ]}
            />
            <TextInput
              label="Username"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              mode="outlined"
            />
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
            {mode === "creator" ? (
              <>
                <TextInput
                  label="Display name"
                  value={displayName}
                  onChangeText={setDisplayName}
                  mode="outlined"
                />
                <TextInput
                  label="Channel name"
                  value={channelName}
                  onChangeText={setChannelName}
                  mode="outlined"
                />
                <SegmentedButtons
                  value={planBilling}
                  onValueChange={(value) => setPlanBilling(value as "monthly" | "yearly")}
                  buttons={[
                    { value: "monthly", label: "Monthly" },
                    { value: "yearly", label: "Yearly" },
                  ]}
                />
              </>
            ) : null}

            <Button
              mode="contained"
              onPress={handleSubmit}
              disabled={busy}
              contentStyle={{ paddingVertical: 8 }}
              buttonColor="#f59e0b"
              textColor="#111827"
            >
              {busy ? "Creating account..." : mode === "creator" ? "Create creator account" : "Create viewer account"}
            </Button>

            {busy ? <ActivityIndicator animating color="#fbbf24" /> : null}

            {verificationToken ? (
              <GlassPanel
                style={{
                  backgroundColor: "rgba(15, 23, 42, 0.72)",
                }}
              >
                <Text selectable style={{ color: "#f8fafc", fontSize: 17, fontWeight: "700" }}>
                  Creator verification
                </Text>
                <Text selectable style={{ color: "#cbd5e1", lineHeight: 22 }}>
                  The backend returns the verification token until an email sender is added. Use it now to finish creator activation.
                </Text>
                <TextInput label="Verification token" value={verificationToken} editable={false} mode="outlined" />
                <Button
                  mode="contained-tonal"
                  onPress={handleVerify}
                  disabled={verificationBusy}
                >
                  {verificationBusy ? "Verifying..." : "Verify creator email"}
                </Button>
              </GlassPanel>
            ) : null}

            <Button mode="text" onPress={() => router.replace("/sign-in")}>
              Already have an account? Sign in
            </Button>
          </GlassPanel>
        </View>
      </ScrollView>
      <Snackbar visible={Boolean(error || notice)} onDismiss={() => { setError(""); setNotice(""); }}>
        {error || notice}
      </Snackbar>
    </ScreenBackground>
  );
}
