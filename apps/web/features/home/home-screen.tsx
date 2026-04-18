import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { Button, Text } from "react-native-paper";
import { ScrollView, useWindowDimensions, View } from "react-native";
import { GlassPanel } from "@/components/glass-panel";
import { ScreenBackground } from "@/components/screen-background";
import { fetchWalletPricing, type WalletPricing } from "@/lib/api";
import { useSession } from "@/providers/session-provider";

export function HomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const compact = width < 920;
  const { user } = useSession();
  const [pricing, setPricing] = useState<WalletPricing | null>(null);
  const [pricingError, setPricingError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchWalletPricing()
      .then((response) => {
        if (!cancelled) {
          setPricing(response);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setPricingError(error instanceof Error ? error.message : "Unable to load pricing.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ScreenBackground>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          paddingBottom: 64,
        }}
      >
        <View
          style={{
            minHeight: compact ? undefined : 760,
            paddingHorizontal: compact ? 18 : 28,
            paddingTop: compact ? 92 : 116,
            paddingBottom: compact ? 42 : 72,
          }}
        >
          <View
            style={{
              marginHorizontal: "auto",
              width: "100%",
              maxWidth: 1180,
              gap: 24,
            }}
          >
            <GlassPanel>
              <Text selectable style={{ color: "#fbbf24", fontSize: 12, fontWeight: "700", letterSpacing: 1.2, textTransform: "uppercase" }}>
                Creators
              </Text>
              <Text selectable style={{ color: "#f8fafc", fontSize: compact ? 40 : 68, fontWeight: "900", lineHeight: compact ? 44 : 72 }}>
                A clean creator flow, rebuilt around the services that actually run.
              </Text>
              <Text selectable style={{ color: "#dbe4ff", fontSize: 18, lineHeight: 28, maxWidth: 760 }}>
                Register real accounts, route every API call through one gateway, manage paid posts and streams, and generate LiveKit room access without the old placeholder web track.
              </Text>
              <View
                style={{
                  flexDirection: compact ? "column" : "row",
                  gap: 14,
                }}
              >
                <Button
                  mode="contained"
                  onPress={() => router.push(user ? "/studio" : "/join")}
                  buttonColor="#f59e0b"
                  textColor="#111827"
                  contentStyle={{ paddingVertical: 8 }}
                >
                  {user ? "Open studio" : "Start the flow"}
                </Button>
                <Button mode="outlined" onPress={() => router.push("/sign-in")}>
                  Sign in
                </Button>
              </View>
            </GlassPanel>

            <View
              style={{
                flexDirection: compact ? "column" : "row",
                gap: 20,
              }}
            >
              <GlassPanel style={{ flex: 1 }}>
                <Text selectable style={{ color: "#f8fafc", fontSize: 20, fontWeight: "700" }}>
                  What changed
                </Text>
                <Text selectable style={{ color: "#cbd5e1", lineHeight: 24 }}>
                  The rebuilt frontend is Expo-based, route-driven, responsive, and ready to grow into Android and iOS. The backend path is narrowed to the active `*-next` services and a real gateway.
                </Text>
              </GlassPanel>
              <GlassPanel style={{ flex: 1 }}>
                <Text selectable style={{ color: "#f8fafc", fontSize: 20, fontWeight: "700" }}>
                  Wallet pricing
                </Text>
                <Text selectable style={{ color: "#cbd5e1", lineHeight: 24 }}>
                  {pricing
                    ? `${pricing.coins.base}. Stream pricing is ${pricing.streams.perMinute} coin per minute with a ${pricing.streams.featured30Min}-coin featured session.`
                    : pricingError || "Loading pricing from the wallet service..."}
                </Text>
              </GlassPanel>
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenBackground>
  );
}
