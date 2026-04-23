import { router } from "expo-router";
import { Image } from "expo-image";
import { ScrollView, Text, View } from "react-native";

import { ProfileStatCard } from "@/src/components/cards/profile-stat-card";
import { PrimaryButton } from "@/src/components/ui/primary-button";
import { useApp } from "@/src/providers/app-provider";
import { palette, radius, spacing } from "@/src/theme/tokens";

export function ProfileScreen() {
  const { displayPosts, profile, session, signOut } = useApp();

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: 120 }} contentInsetAdjustmentBehavior="automatic" style={{ flex: 1, backgroundColor: palette.bg }}>
      <View
        style={{
          borderRadius: radius.xl,
          borderWidth: 1,
          borderColor: palette.stroke,
          backgroundColor: palette.panel,
          padding: spacing.xl,
        }}
      >
        <Image source={{ uri: `https://api.dicebear.com/8.x/lorelei/png?seed=${encodeURIComponent(session?.name ?? "creator")}` }} style={{ width: 104, height: 104, borderRadius: 999 }} />
        <Text style={{ color: palette.text, fontSize: 30, fontWeight: "900", marginTop: spacing.md }}>{session?.name}</Text>
        <Text style={{ color: palette.textMuted, marginTop: spacing.xs }}>{profile?.headline ?? "Digital creator"}</Text>
        <Text style={{ color: palette.textMuted, marginTop: spacing.md, lineHeight: 22 }}>{profile?.bio ?? "Shape your creator identity and stay close to your audience."}</Text>
        <View style={{ flexDirection: "row", gap: spacing.sm, flexWrap: "wrap", marginTop: spacing.lg }}>
          <ProfileStatCard label="Posts" value={`${displayPosts.length}`} />
          <ProfileStatCard label="Followers" value="24k" />
          <ProfileStatCard label="Following" value="182" />
        </View>
      </View>

      <PrimaryButton label="Open settings" onPress={() => router.push("/settings")} />
      <PrimaryButton label="Sign out" onPress={() => void signOut()} />
    </ScrollView>
  );
}
