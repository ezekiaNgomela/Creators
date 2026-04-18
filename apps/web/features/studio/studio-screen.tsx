import { startTransition, useEffect, useMemo, useState } from "react";
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
import { JsonPreview } from "@/components/json-preview";
import { ScreenBackground } from "@/components/screen-background";
import {
  createPost,
  createStream,
  fetchMe,
  fetchWalletPricing,
  joinStream,
  requestLiveKitToken,
  subscriptionAccessCheck,
  type WalletPricing,
} from "@/lib/api";
import { useSession } from "@/providers/session-provider";

export function StudioScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const compact = width < 1080;
  const { token, user, signOut } = useSession();

  const [me, setMe] = useState(user);
  const [walletPricing, setWalletPricing] = useState<WalletPricing | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [resultLabel, setResultLabel] = useState("Last response");
  const [result, setResult] = useState<unknown>(null);

  const [postTitle, setPostTitle] = useState("Paid drop");
  const [postVisibility, setPostVisibility] = useState("paid");
  const [postPrice, setPostPrice] = useState("15");

  const [streamTitle, setStreamTitle] = useState("Launch room");
  const [streamVisibility, setStreamVisibility] = useState("public");
  const [streamPrice, setStreamPrice] = useState("10");
  const [minutesPlanned, setMinutesPlanned] = useState("30");
  const [roomName, setRoomName] = useState("launch-room");

  const [channelId, setChannelId] = useState("channel-1");
  const [resourceId, setResourceId] = useState("launch-room");
  const [accessVisibility, setAccessVisibility] = useState("subscriber_only");
  const [paymentState, setPaymentState] = useState("settled");

  useEffect(() => {
    if (!token) {
      return;
    }
    let cancelled = false;

    Promise.all([fetchMe(token), fetchWalletPricing()])
      .then(([meResponse, pricingResponse]) => {
        if (cancelled) {
          return;
        }
        startTransition(() => {
          setMe(meResponse);
          setWalletPricing(pricingResponse);
        });
      })
      .catch((error) => {
        if (!cancelled) {
          setMessage(error instanceof Error ? error.message : "Unable to load studio data.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const creatorRole = useMemo(() => me?.role ?? user?.role ?? "user", [me?.role, user?.role]);

  if (!token || !user) {
    return (
      <ScreenBackground>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            paddingHorizontal: 18,
            paddingVertical: 88,
          }}
        >
          <View style={{ marginHorizontal: "auto", width: "100%", maxWidth: 920 }}>
            <GlassPanel>
              <Text selectable style={{ color: "#f8fafc", fontSize: 34, fontWeight: "800", lineHeight: 40 }}>
                Sign in first to operate the real studio flow.
              </Text>
              <Text selectable style={{ color: "#cbd5e1", lineHeight: 24 }}>
                The studio is now a live control surface for the gateway-backed auth, post, subscription, wallet, and stream actions. It opens once the session token exists.
              </Text>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <Button mode="contained" onPress={() => router.replace("/sign-in")} buttonColor="#f59e0b" textColor="#111827">
                  Sign in
                </Button>
                <Button mode="outlined" onPress={() => router.replace("/join")}>
                  Create account
                </Button>
              </View>
            </GlassPanel>
          </View>
        </ScrollView>
      </ScreenBackground>
    );
  }

  async function runAction(label: string, action: () => Promise<unknown>) {
    setBusy(true);
    setMessage("");
    try {
      const response = await action();
      startTransition(() => {
        setResultLabel(label);
        setResult(response);
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScreenBackground>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          paddingHorizontal: compact ? 18 : 28,
          paddingTop: 88,
          paddingBottom: 56,
        }}
      >
        <View
          style={{
            marginHorizontal: "auto",
            width: "100%",
            maxWidth: 1260,
            gap: 20,
          }}
        >
          <View
            style={{
              flexDirection: compact ? "column" : "row",
              gap: 20,
            }}
          >
            <GlassPanel style={{ flex: compact ? 0 : 1.25 }}>
              <Text selectable style={{ color: "#fbbf24", fontSize: 12, fontWeight: "700", letterSpacing: 1.2, textTransform: "uppercase" }}>
                Unified studio
              </Text>
              <Text selectable style={{ color: "#f8fafc", fontSize: compact ? 30 : 42, fontWeight: "800", lineHeight: compact ? 36 : 48 }}>
                Real service controls, one gateway, zero placeholder dashboard cards.
              </Text>
              <Text selectable style={{ color: "#cbd5e1", lineHeight: 24 }}>
                Signed in as {me?.email}. Role: {creatorRole}. Verified: {String(me?.isVerified ?? false)}.
              </Text>
              <View style={{ flexDirection: compact ? "column" : "row", gap: 12 }}>
                <Button mode="contained" buttonColor="#f59e0b" textColor="#111827" onPress={() => router.push("/")}>
                  Back to landing
                </Button>
                <Button
                  mode="outlined"
                  onPress={() => {
                    signOut();
                    router.replace("/sign-in");
                  }}
                >
                  Sign out
                </Button>
              </View>
            </GlassPanel>

            <GlassPanel style={{ flex: 1 }}>
              <Text selectable style={{ color: "#f8fafc", fontSize: 19, fontWeight: "700" }}>
                Wallet snapshot
              </Text>
              <Text selectable style={{ color: "#cbd5e1", lineHeight: 24 }}>
                {walletPricing
                  ? `${walletPricing.coins.base}. Creator split is ${walletPricing.split.creatorPct}% / ${walletPricing.split.platformPct}% / ${walletPricing.split.reservePct}%.`
                  : "Fetching live pricing from the wallet service..."}
              </Text>
              {busy ? <ActivityIndicator animating color="#fbbf24" /> : null}
            </GlassPanel>
          </View>

          <View
            style={{
              flexDirection: compact ? "column" : "row",
              gap: 20,
              alignItems: "flex-start",
            }}
          >
            <View style={{ flex: compact ? 0 : 1.3, gap: 20 }}>
              <GlassPanel>
                <Text selectable style={{ color: "#f8fafc", fontSize: 19, fontWeight: "700" }}>
                  Creator publishing
                </Text>
                <TextInput label="Post title" value={postTitle} onChangeText={setPostTitle} mode="outlined" />
                <SegmentedButtons
                  value={postVisibility}
                  onValueChange={setPostVisibility}
                  buttons={[
                    { value: "public", label: "Public" },
                    { value: "subscriber_only", label: "Subscribers" },
                    { value: "paid", label: "Paid" },
                  ]}
                />
                <TextInput label="Paid price (coins)" value={postPrice} onChangeText={setPostPrice} keyboardType="numeric" mode="outlined" />
                <Button
                  mode="contained-tonal"
                  onPress={() =>
                    runAction("Create post", () =>
                      createPost({
                        authorUserId: me?.id ?? user.id,
                        authorRole: creatorRole,
                        title: postTitle,
                        visibility: postVisibility,
                        priceCoins: Number(postPrice || 0),
                        contentType: "post",
                      })
                    )
                  }
                >
                  Create post
                </Button>
              </GlassPanel>

              <GlassPanel>
                <Text selectable style={{ color: "#f8fafc", fontSize: 19, fontWeight: "700" }}>
                  Live stream access
                </Text>
                <TextInput label="Stream title" value={streamTitle} onChangeText={setStreamTitle} mode="outlined" />
                <TextInput label="Room name" value={roomName} onChangeText={setRoomName} mode="outlined" />
                <SegmentedButtons
                  value={streamVisibility}
                  onValueChange={setStreamVisibility}
                  buttons={[
                    { value: "public", label: "Public" },
                    { value: "subscriber_only", label: "Subscribers" },
                    { value: "paid", label: "Paid" },
                  ]}
                />
                <TextInput label="Paid ticket (coins)" value={streamPrice} onChangeText={setStreamPrice} keyboardType="numeric" mode="outlined" />
                <TextInput label="Minutes planned" value={minutesPlanned} onChangeText={setMinutesPlanned} keyboardType="numeric" mode="outlined" />
                <View style={{ flexDirection: compact ? "column" : "row", gap: 12 }}>
                  <Button
                    mode="contained-tonal"
                    onPress={() =>
                      runAction("Create stream", () =>
                        createStream({
                          hostUserId: me?.id ?? user.id,
                          hostRole: creatorRole,
                          hostVerified: Boolean(me?.isVerified ?? user.isVerified),
                          title: streamTitle,
                          visibility: streamVisibility,
                          priceCoins: Number(streamPrice || 0),
                        })
                      )
                    }
                  >
                    Create stream
                  </Button>
                  <Button
                    mode="outlined"
                    onPress={() =>
                      runAction("Generate LiveKit token", () =>
                        requestLiveKitToken({
                          roomName,
                          userId: me?.id ?? user.id,
                          isHost: creatorRole !== "user",
                        })
                      )
                    }
                  >
                    Generate room token
                  </Button>
                </View>
              </GlassPanel>
            </View>

            <View style={{ flex: compact ? 0 : 1, gap: 20 }}>
              <GlassPanel>
                <Text selectable style={{ color: "#f8fafc", fontSize: 19, fontWeight: "700" }}>
                  Viewer gate checks
                </Text>
                <TextInput label="Channel ID" value={channelId} onChangeText={setChannelId} mode="outlined" />
                <TextInput label="Resource ID" value={resourceId} onChangeText={setResourceId} mode="outlined" />
                <SegmentedButtons
                  value={accessVisibility}
                  onValueChange={setAccessVisibility}
                  buttons={[
                    { value: "public", label: "Public" },
                    { value: "subscriber_only", label: "Subscribers" },
                    { value: "paid", label: "Paid" },
                  ]}
                />
                <TextInput label="Payment state" value={paymentState} onChangeText={setPaymentState} autoCapitalize="none" mode="outlined" />
                <View style={{ flexDirection: "column", gap: 12 }}>
                  <Button
                    mode="contained-tonal"
                    onPress={() =>
                      runAction("Subscription access check", () =>
                        subscriptionAccessCheck({
                          userId: me?.id ?? user.id,
                          superUserId: me?.id ?? user.id,
                          channelId,
                          resourceType: "stream",
                          resourceId,
                          visibility: accessVisibility,
                          paymentState,
                        })
                      )
                    }
                  >
                    Check subscription access
                  </Button>
                  <Button
                    mode="outlined"
                    onPress={() =>
                      runAction("Stream join check", () =>
                        joinStream({
                          viewerUserId: me?.id ?? user.id,
                          visibility: accessVisibility,
                          subscribed: accessVisibility !== "subscriber_only" ? false : true,
                          paymentState,
                          minutesPlanned: Number(minutesPlanned || 0),
                        })
                      )
                    }
                  >
                    Check stream join
                  </Button>
                </View>
              </GlassPanel>

              {result ? <JsonPreview label={resultLabel} value={result} /> : null}
            </View>
          </View>
        </View>
      </ScrollView>
      <Snackbar visible={Boolean(message)} onDismiss={() => setMessage("")}>
        {message}
      </Snackbar>
    </ScreenBackground>
  );
}
