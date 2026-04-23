import { ScrollView, Text, View } from "react-native";

import { PromotionCard } from "@/src/components/cards/promotion-card";
import { useApp } from "@/src/providers/app-provider";
import { palette, spacing } from "@/src/theme/tokens";

export function StudioScreen() {
  const { displayPosts, health } = useApp();

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: 120 }} contentInsetAdjustmentBehavior="automatic" style={{ flex: 1, backgroundColor: palette.bg }}>
      <View>
        <Text style={{ color: palette.accent, fontWeight: "900", textTransform: "uppercase", letterSpacing: 1.2 }}>Studio</Text>
        <Text style={{ color: palette.text, fontSize: 34, fontWeight: "900", marginTop: spacing.sm }}>Creator control</Text>
        <Text style={{ color: palette.textMuted, marginTop: spacing.sm }}>
          Backend stack is {health?.status === "ok" ? "live" : "syncing"} and your promotion surfaces are ready.
        </Text>
      </View>
      {displayPosts.slice(0, 4).map((post) => (
        <PromotionCard key={post.id} body={post.body} image={post.gallery[0]} score={post.promotionScore} title={post.author.name} />
      ))}
    </ScrollView>
  );
}
