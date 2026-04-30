import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { type Href, router } from "expo-router";
import { Pressable, ScrollView, Share, Text, View } from "react-native";

import type { DisplayPost } from "@/src/providers/app-provider";
import { useApp } from "@/src/providers/app-provider";
import { radius, spacing } from "@/src/theme/tokens";

type IconName = keyof typeof Ionicons.glyphMap;

const profileColors = {
  bg: "#fff9f6",
  ink: "#191216",
  muted: "#8c7a74",
  line: "rgba(65, 42, 34, 0.08)",
  peach: "#ff7f68",
  coral: "#ff5d6f",
  mint: "#39c6ad",
  lavender: "#8b7cf6",
  card: "#ffffff",
  soft: "#fff0ea",
};

const accountItems: Array<{ id: string; label: string; icon: IconName; tint: string }> = [
  { id: "video", label: "Video", icon: "videocam-outline", tint: "#8b7cf6" },
  { id: "dynamic", label: "Dynamic", icon: "star-outline", tint: "#f4a62a" },
  { id: "grade", label: "Grade", icon: "diamond-outline", tint: "#4f91ff" },
  { id: "item-store", label: "Item Store", icon: "bag-handle-outline", tint: "#ff7f68" },
  { id: "wallet", label: "Wallet", icon: "wallet-outline", tint: "#ea5fa1" },
  { id: "daily-task", label: "Daily task", icon: "calendar-outline", tint: "#26a69a" },
  { id: "live-store", label: "Live store", icon: "storefront-outline", tint: "#2f80ed" },
  { id: "paid-content", label: "Paid content", icon: "image-outline", tint: "#3b82f6" },
  { id: "room-management", label: "Room Management", icon: "home-outline", tint: "#b35cff" },
];

export function ProfileScreen() {
  const { displayPosts, health, profile, session, signOut } = useApp();
  const currentUser = profile?.user ?? session;
  const avatar = profile?.avatarUrl || currentUser?.avatarUrl || "";
  const profilePosts = currentUser ? displayPosts.filter((post) => post.author.id === currentUser.id) : [];
  const cover = profile?.coverUrl || profilePosts[0]?.gallery[0] || "";
  const totalReactions = profilePosts.reduce((total, post) => total + post.likes + post.comments + post.promotionScore, 0);
  const handle = `@${(currentUser?.name ?? "creator").toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.+|\.+$/g, "")}`;
  const creatorId = currentUser ? `Id - ${String(450000 + currentUser.id).padStart(6, "0")}` : "Id - syncing";

  function openTool(toolId: string) {
    router.push(`/profile-tools/${toolId}` as Href);
  }

  function openPostEditor(post: DisplayPost) {
    router.push(`/posts/${post.id}/edit` as Href);
  }

  async function shareProfile() {
    await Share.share({
      message: `${currentUser?.name ?? "Creator"} on Creators ${handle}`,
    });
  }

  return (
    <ScrollView
      contentContainerStyle={{ paddingBottom: 118 }}
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: profileColors.bg }}
    >
      <LinearGradient colors={["#fff0ec", "#fff8f4", "#fff9f6"]} style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.lg }}>
        {cover ? (
          <Image
            contentFit="cover"
            source={{ uri: cover }}
            style={{ position: "absolute", left: 0, right: 0, top: 0, height: 210, opacity: 0.14 }}
          />
        ) : null}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ color: profileColors.ink, fontSize: 22, fontWeight: "900" as const }}>Profile</Text>
          <View style={{ flexDirection: "row", gap: spacing.xs }}>
            <RoundIcon icon="chatbubble-ellipses-outline" onPress={() => router.push("/notifications")} />
            <RoundIcon icon="settings-outline" onPress={() => router.push("/settings")} />
          </View>
        </View>

        <View style={{ marginTop: spacing.lg, flexDirection: "row", alignItems: "center", gap: spacing.md }}>
          <View style={{ width: 72, height: 72, borderRadius: radius.pill, padding: 3, backgroundColor: "#fff", boxShadow: "0 12px 34px rgba(255, 118, 93, 0.22)" }}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={{ width: "100%", height: "100%", borderRadius: radius.pill }} />
            ) : (
              <View style={{ width: "100%", height: "100%", borderRadius: radius.pill, alignItems: "center", justifyContent: "center", backgroundColor: profileColors.peach }}>
                <Text style={{ color: "#fff", fontSize: 26, fontWeight: "900" as const }}>{(currentUser?.name ?? "C").slice(0, 1).toUpperCase()}</Text>
              </View>
            )}
          </View>
          <View style={{ flex: 1, gap: 5 }}>
            <Text numberOfLines={1} style={{ color: profileColors.ink, fontSize: 18, fontWeight: "900" as const }}>
              {currentUser?.name ?? "Creator"}
            </Text>
            <Text selectable style={{ color: profileColors.muted, fontSize: 12, fontWeight: "800" as const }}>
              {creatorId}
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 5 }}>
              <TinyBadge label="Creator" color="#4f91ff" />
              <TinyBadge label={`${profilePosts.length}`} color={profileColors.coral} />
              <TinyBadge label={health?.status === "ok" ? "Live" : "Sync"} color={profileColors.mint} />
            </View>
          </View>
          <Ionicons color={profileColors.muted} name="chevron-forward" size={18} />
        </View>

        <Text numberOfLines={2} style={{ color: profileColors.muted, fontSize: 13, lineHeight: 19, marginTop: spacing.md }}>
          {profile?.bio || profile?.headline || "Creator stories, live drops, and studio updates."}
        </Text>

        <View style={{ marginTop: spacing.lg, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.78)", borderWidth: 1, borderColor: profileColors.line, flexDirection: "row" }}>
          <ProfileStat value={compact(profilePosts.length)} label="Posts" />
          <ProfileStat value={compact(Math.max(10, totalReactions + 10))} label="Fans" />
          <ProfileStat value={compact(Math.max(50, displayPosts.length * 12))} label="Collect" />
        </View>
      </LinearGradient>

      <View style={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
        <LinearGradient colors={["#181b31", "#101827"]} style={{ borderRadius: 12, padding: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.md }}>
          <View style={{ width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.12)" }}>
            <Ionicons color="#ff6bd6" name="diamond" size={22} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#fff", fontSize: 14, fontWeight: "900" as const }}>Join as a member</Text>
            <Text style={{ color: "rgba(255,255,255,0.58)", fontSize: 11, marginTop: 2 }}>Member-only edits and post boosts</Text>
          </View>
          <Pressable onPress={() => openTool("vip")} style={{ borderRadius: radius.pill, backgroundColor: "#fff", paddingHorizontal: spacing.md, paddingVertical: 9 }}>
            <Text style={{ color: "#111827", fontSize: 11, fontWeight: "900" as const }}>Open now</Text>
          </Pressable>
        </LinearGradient>

        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <QuickCard title="Edit" body="Profile" icon="create-outline" onPress={() => router.push("/settings")} />
          <QuickCard title="Share" body="Profile" icon="share-social-outline" onPress={() => void shareProfile()} />
          <QuickCard title="New" body="Post" icon="add-circle-outline" onPress={() => router.push("/(tabs)/studio")} />
        </View>

        <SectionTitle title="My Account" />
        <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: spacing.lg }}>
          {accountItems.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => openTool(item.id)}
              style={{ width: "25%", minHeight: 72, alignItems: "center", justifyContent: "flex-start", gap: spacing.xs, paddingHorizontal: 4 }}
            >
              <View style={{ width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#fff", borderWidth: 1, borderColor: profileColors.line }}>
                <Ionicons color={item.tint} name={item.icon} size={20} />
              </View>
              <Text numberOfLines={2} style={{ color: profileColors.ink, fontSize: 11, fontWeight: "800" as const, lineHeight: 14, textAlign: "center" }}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <SectionTitle action="Edit posts" onPress={() => router.push("/(tabs)/studio")} title="Home Feed Posts" />
        {profilePosts.length ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {profilePosts.slice(0, 9).map((post, index) => (
              <Pressable
                key={post.id}
                onPress={() => openPostEditor(post)}
                style={{ width: "32%", aspectRatio: index === 0 ? 0.72 : 0.86, overflow: "hidden", borderRadius: 14, backgroundColor: profileColors.soft }}
              >
                {post.gallery[0] ? <Image contentFit="cover" source={{ uri: post.gallery[0] }} style={{ width: "100%", height: "100%" }} /> : null}
                <LinearGradient colors={["transparent", "rgba(0,0,0,0.62)"]} style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 76 }} />
                <View style={{ position: "absolute", left: 7, right: 7, bottom: 7, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <Text numberOfLines={1} style={{ color: "#fff", fontSize: 10, fontWeight: "900" as const, flex: 1 }}>
                    {post.mood}
                  </Text>
                  <Ionicons color="#fff" name="create-outline" size={13} />
                </View>
              </Pressable>
            ))}
          </View>
        ) : (
          <Pressable
            onPress={() => router.push("/(tabs)/studio")}
            style={{ minHeight: 132, borderRadius: 24, alignItems: "center", justifyContent: "center", gap: spacing.xs, backgroundColor: "#fff", borderWidth: 1, borderColor: profileColors.line, padding: spacing.lg }}
          >
            <Ionicons color={profileColors.peach} name="images-outline" size={28} />
            <Text style={{ color: profileColors.ink, fontSize: 16, fontWeight: "900" as const }}>Create your first feed post</Text>
            <Text style={{ color: profileColors.muted, textAlign: "center", fontSize: 12 }}>Published and edited posts show here and on Home.</Text>
          </Pressable>
        )}

        <Pressable onPress={() => void signOut()} style={{ minHeight: 46, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", backgroundColor: "#fff", borderWidth: 1, borderColor: profileColors.line }}>
          <Text style={{ color: profileColors.coral, fontWeight: "900" as const }}>Log out</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function RoundIcon({ icon, onPress }: { icon: IconName; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ width: 38, height: 38, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.86)", borderWidth: 1, borderColor: profileColors.line }}>
      <Ionicons color={profileColors.ink} name={icon} size={18} />
    </Pressable>
  );
}

function TinyBadge({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ borderRadius: radius.pill, backgroundColor: color, paddingHorizontal: 7, paddingVertical: 3 }}>
      <Text style={{ color: "#fff", fontSize: 9, fontWeight: "900" as const }}>{label}</Text>
    </View>
  );
}

function ProfileStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, alignItems: "center", paddingVertical: spacing.md }}>
      <Text style={{ color: profileColors.ink, fontSize: 17, fontWeight: "900" as const, fontVariant: ["tabular-nums"] }}>
        {value}
      </Text>
      <Text style={{ color: profileColors.muted, fontSize: 11, fontWeight: "800" as const, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

function QuickCard({ body, icon, onPress, title }: { body: string; icon: IconName; onPress: () => void; title: string }) {
  return (
    <Pressable onPress={onPress} style={{ flex: 1, minHeight: 72, borderRadius: 14, backgroundColor: "#fff", borderWidth: 1, borderColor: profileColors.line, padding: spacing.sm, gap: spacing.xs }}>
      <Ionicons color={profileColors.peach} name={icon} size={18} />
      <Text style={{ color: profileColors.ink, fontSize: 12, fontWeight: "900" as const }}>{title}</Text>
      <Text style={{ color: profileColors.muted, fontSize: 10, fontWeight: "700" as const }}>{body}</Text>
    </Pressable>
  );
}

function SectionTitle({ action, onPress, title }: { action?: string; onPress?: () => void; title: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing.xs }}>
      <Text style={{ color: profileColors.ink, fontSize: 15, fontWeight: "900" as const }}>{title}</Text>
      {action && onPress ? (
        <Pressable onPress={onPress}>
          <Text style={{ color: profileColors.peach, fontSize: 12, fontWeight: "900" as const }}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function compact(value: number) {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}
