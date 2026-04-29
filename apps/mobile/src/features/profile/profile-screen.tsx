import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";

import { useApp } from "@/src/providers/app-provider";
import { palette, radius, spacing } from "@/src/theme/tokens";

export function ProfileScreen() {
  const { displayPosts, profile, session, signOut } = useApp();
  const cover = displayPosts[0]?.gallery[0] ?? "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1200&q=80";
  const handle = `@${(session?.name ?? "creator").toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.+|\.+$/g, "")}`;
  const profilePosts = displayPosts.slice(0, 9);

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 120 }} contentInsetAdjustmentBehavior="automatic" style={{ flex: 1, backgroundColor: "#080b10" }}>
      <View style={{ minHeight: 380 }}>
        <Image source={{ uri: cover }} style={{ position: "absolute", left: 0, right: 0, top: 0, height: 360, width: "100%" }} />
        <LinearGradient colors={["rgba(8,11,16,0.08)", "rgba(8,11,16,0.66)", "#080b10"]} style={{ position: "absolute", left: 0, right: 0, top: 0, height: 380 }} />

        <View style={{ padding: spacing.lg, gap: spacing.lg }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Pressable onPress={() => router.push("/settings")} style={iconButton}>
              <Ionicons color="#fff" name="settings-outline" size={18} />
            </Pressable>
            <Pressable onPress={() => void signOut()} style={iconButton}>
              <Ionicons color="#fff" name="log-out-outline" size={18} />
            </Pressable>
          </View>

          <View style={{ alignItems: "center", marginTop: 116 }}>
            <View style={{ borderRadius: radius.pill, borderWidth: 4, borderColor: "#fff", shadowColor: "#000", shadowOpacity: 0.34, shadowRadius: 22 }}>
              <Image
                source={{ uri: `https://api.dicebear.com/8.x/lorelei/png?seed=${encodeURIComponent(session?.name ?? "creator")}` }}
                style={{ width: 112, height: 112, borderRadius: radius.pill }}
              />
            </View>
            <Text style={{ color: "#fff", fontSize: 28, fontWeight: "900" as const, marginTop: spacing.sm, textAlign: "center" }}>{session?.name}</Text>
            <Text style={{ color: "rgba(255,255,255,0.72)", fontSize: 13, fontWeight: "800" as const }}>{handle}</Text>
            <Text style={{ color: "rgba(255,255,255,0.72)", fontSize: 13, lineHeight: 20, textAlign: "center", marginTop: spacing.sm, maxWidth: 330 }}>
              {profile?.bio || profile?.headline || "Creator stories, live drops, and studio updates."}
            </Text>
          </View>
        </View>
      </View>

      <View style={{ paddingHorizontal: spacing.lg, gap: spacing.lg }}>
        <View style={{ flexDirection: "row", justifyContent: "space-around", borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)", paddingBottom: spacing.md }}>
          <ProfileStat value={`${profilePosts.length}`} label="Posts" />
          <ProfileStat value="24K" label="Followers" />
          <ProfileStat value="182" label="Following" />
        </View>

        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <Pressable onPress={() => router.push("/settings")} style={[actionButton, { backgroundColor: "#fff" }]}>
            <Text style={{ color: "#0a0d12", fontWeight: "900" as const }}>Edit profile</Text>
          </Pressable>
          <Pressable style={actionButton}>
            <Ionicons color="#fff" name="share-social-outline" size={17} />
          </Pressable>
          <Pressable style={actionButton}>
            <Ionicons color="#fff" name="person-add-outline" size={17} />
          </Pressable>
        </View>

        <View style={{ flexDirection: "row", justifyContent: "space-around", borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)" }}>
          {["grid", "play", "heart"].map((icon, index) => (
            <View key={icon} style={{ alignItems: "center", flex: 1, paddingBottom: spacing.sm }}>
              <Ionicons color={index === 0 ? "#fff" : "rgba(255,255,255,0.42)"} name={icon as keyof typeof Ionicons.glyphMap} size={20} />
              {index === 0 ? <View style={{ marginTop: spacing.xs, width: 28, height: 3, borderRadius: radius.pill, backgroundColor: "#fff" }} /> : null}
            </View>
          ))}
        </View>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 2 }}>
          {profilePosts.map((post, index) => (
            <View key={post.id} style={{ width: "32.9%", aspectRatio: index === 0 ? 0.72 : 0.82, overflow: "hidden", backgroundColor: palette.panel }}>
              <Image source={{ uri: post.gallery[0] }} style={{ width: "100%", height: "100%" }} />
              <LinearGradient colors={["transparent", "rgba(0,0,0,0.55)"]} style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 70 }} />
              <View style={{ position: "absolute", left: 6, bottom: 6, flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Ionicons color="#fff" name="play" size={11} />
                <Text style={{ color: "#fff", fontSize: 10, fontWeight: "900" as const }}>{post.promotionScore}K</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

function ProfileStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ alignItems: "center", gap: 4 }}>
      <Text style={{ color: "#fff", fontSize: 19, fontWeight: "900" as const }}>{value}</Text>
      <Text style={{ color: "rgba(255,255,255,0.58)", fontSize: 12, fontWeight: "800" as const }}>{label}</Text>
    </View>
  );
}

const iconButton = {
  width: 42,
  height: 42,
  borderRadius: radius.pill,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "rgba(0,0,0,0.34)",
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.16)",
} as const;

const actionButton = {
  flex: 1,
  minHeight: 44,
  borderRadius: radius.pill,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "rgba(255,255,255,0.12)",
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.12)",
} as const;
