import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";

import { useApp } from "@/src/providers/app-provider";
import { radius, spacing } from "@/src/theme/tokens";

type IconName = keyof typeof Ionicons.glyphMap;

type ToolDetail = {
  title: string;
  subtitle: string;
  icon: IconName;
  tint: string;
  actions: Array<{ label: string; icon: IconName; target: "profile" | "settings" | "studio" | "live" | "chat" }>;
};

const toolDetails: Record<string, ToolDetail> = {
  video: {
    title: "Video",
    subtitle: "Clips, replays, and short edits for your public profile.",
    icon: "videocam-outline",
    tint: "#8b7cf6",
    actions: [
      { label: "Upload clip", icon: "cloud-upload-outline", target: "studio" },
      { label: "Review drafts", icon: "film-outline", target: "studio" },
      { label: "Open profile grid", icon: "grid-outline", target: "profile" },
    ],
  },
  dynamic: {
    title: "Dynamic",
    subtitle: "Featured moments, creator highlights, and active profile cards.",
    icon: "star-outline",
    tint: "#f4a62a",
    actions: [
      { label: "Feature a moment", icon: "sparkles-outline", target: "studio" },
      { label: "Pin profile card", icon: "person-circle-outline", target: "profile" },
      { label: "Refresh details", icon: "settings-outline", target: "settings" },
    ],
  },
  grade: {
    title: "Grade",
    subtitle: "Profile completeness and creator growth signals.",
    icon: "diamond-outline",
    tint: "#4f91ff",
    actions: [
      { label: "Improve profile", icon: "create-outline", target: "settings" },
      { label: "Check content", icon: "analytics-outline", target: "profile" },
      { label: "Create stronger post", icon: "add-circle-outline", target: "studio" },
    ],
  },
  "item-store": {
    title: "Item Store",
    subtitle: "Launch items, add-ons, and member collectibles.",
    icon: "bag-handle-outline",
    tint: "#ff7f68",
    actions: [
      { label: "Create item", icon: "add-circle-outline", target: "studio" },
      { label: "Manage shelf", icon: "albums-outline", target: "profile" },
      { label: "Preview store", icon: "storefront-outline", target: "profile" },
    ],
  },
  wallet: {
    title: "Wallet",
    subtitle: "Creator credits, payout readiness, and profile value.",
    icon: "wallet-outline",
    tint: "#ea5fa1",
    actions: [
      { label: "View profile value", icon: "trending-up-outline", target: "profile" },
      { label: "Update details", icon: "create-outline", target: "settings" },
      { label: "Open settings", icon: "settings-outline", target: "settings" },
    ],
  },
  "daily-task": {
    title: "Daily task",
    subtitle: "Small publishing prompts to keep your profile active.",
    icon: "calendar-outline",
    tint: "#26a69a",
    actions: [
      { label: "Start today's task", icon: "checkmark-circle-outline", target: "studio" },
      { label: "Create a post", icon: "add-circle-outline", target: "studio" },
      { label: "View profile", icon: "person-outline", target: "profile" },
    ],
  },
  "live-store": {
    title: "Live store",
    subtitle: "Paid items and featured drops for upcoming live rooms.",
    icon: "storefront-outline",
    tint: "#2f80ed",
    actions: [
      { label: "Open live tab", icon: "radio-outline", target: "live" },
      { label: "Attach product", icon: "bag-add-outline", target: "studio" },
      { label: "Message collaborators", icon: "chatbubble-outline", target: "chat" },
    ],
  },
  "paid-content": {
    title: "Paid content",
    subtitle: "Locked posts, member edits, and paid media previews.",
    icon: "image-outline",
    tint: "#3b82f6",
    actions: [
      { label: "Create paid post", icon: "lock-closed-outline", target: "studio" },
      { label: "Manage profile", icon: "person-outline", target: "profile" },
      { label: "Edit details", icon: "settings-outline", target: "settings" },
    ],
  },
  "room-management": {
    title: "Room Management",
    subtitle: "Chat rooms, collaborators, and live session permissions.",
    icon: "home-outline",
    tint: "#b35cff",
    actions: [
      { label: "Open rooms", icon: "chatbubbles-outline", target: "chat" },
      { label: "Invite collaborators", icon: "person-add-outline", target: "chat" },
      { label: "Review profile", icon: "person-outline", target: "profile" },
    ],
  },
  vip: {
    title: "VIP membership",
    subtitle: "Exclusive edits, private rooms, and member-only profile posts.",
    icon: "diamond",
    tint: "#ff6bd6",
    actions: [
      { label: "Create VIP offer", icon: "diamond-outline", target: "studio" },
      { label: "Preview member page", icon: "person-circle-outline", target: "profile" },
      { label: "Share invite", icon: "share-social-outline", target: "chat" },
    ],
  },
};

export function ProfileToolScreen() {
  const { displayPosts, health, profile } = useApp();
  const { toolId } = useLocalSearchParams<{ toolId?: string }>();
  const detail = toolDetails[toolId ?? ""] ?? {
    title: "Profile tool",
    subtitle: "This profile area is ready for the next creator workflow.",
    icon: "apps-outline" as const,
    tint: "#ff7f68",
    actions: [
      { label: "Open profile", icon: "person-outline" as const, target: "profile" as const },
      { label: "Create post", icon: "add-circle-outline" as const, target: "studio" as const },
      { label: "Edit settings", icon: "settings-outline" as const, target: "settings" as const },
    ],
  };
  const ownPosts = profile ? displayPosts.filter((post) => post.author.id === profile.user.id) : [];
  const reach = ownPosts.reduce((total, post) => total + post.likes + post.comments + post.promotionScore, 0);

  function openTarget(target: ToolDetail["actions"][number]["target"]) {
    if (target === "settings") {
      router.push("/settings");
      return;
    }
    if (target === "studio") {
      router.push("/(tabs)/studio");
      return;
    }
    if (target === "live") {
      router.push("/(tabs)/live");
      return;
    }
    if (target === "chat") {
      router.push("/(tabs)/chat");
      return;
    }
    router.push("/(tabs)/profile");
  }

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.md, paddingTop: spacing.sm, gap: spacing.sm, paddingBottom: 90 }} contentInsetAdjustmentBehavior="automatic" style={{ flex: 1, backgroundColor: "#fff9f6" }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Pressable onPress={() => router.back()} style={iconButton}>
          <Ionicons color="#191216" name="chevron-back" size={20} />
        </Pressable>
        <Text style={{ color: "#191216", fontSize: 18, fontWeight: "900" as const }}>{detail.title}</Text>
        <Pressable onPress={() => router.push("/(tabs)/profile")} style={iconButton}>
          <Ionicons color="#191216" name="person-outline" size={18} />
        </Pressable>
      </View>

      <LinearGradient colors={[`${detail.tint}26`, "#ffffff"]} style={{ minHeight: 170, borderRadius: 24, borderWidth: 1, borderColor: "rgba(65,42,34,0.08)", padding: spacing.md, justifyContent: "space-between" }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm }}>
          <View style={{ width: 52, height: 52, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" }}>
            <Ionicons color={detail.tint} name={detail.icon} size={26} />
          </View>
          <View style={{ borderRadius: radius.pill, backgroundColor: "#fff", paddingHorizontal: spacing.sm, paddingVertical: 7 }}>
            <Text style={{ color: health?.status === "ok" ? "#26a69a" : "#8c7a74", fontSize: 11, fontWeight: "900" as const }}>
              {health?.status === "ok" ? "Backend live" : "Syncing"}
            </Text>
          </View>
        </View>
        <View style={{ gap: 5 }}>
          <Text style={{ color: "#191216", fontSize: 27, fontWeight: "900" as const }}>{detail.title}</Text>
          <Text style={{ color: "#8c7a74", fontSize: 13, lineHeight: 19 }}>{detail.subtitle}</Text>
        </View>
      </LinearGradient>

      <View style={{ flexDirection: "row", gap: spacing.xs }}>
        <Metric label="Posts" value={compact(ownPosts.length)} />
        <Metric label="Reach" value={compact(Math.max(0, reach))} />
        <Metric label="Tools" value={compact(detail.actions.length)} />
      </View>

      <View style={{ borderRadius: 22, backgroundColor: "#fff", borderWidth: 1, borderColor: "rgba(65,42,34,0.08)", padding: spacing.sm, gap: spacing.xs }}>
        <Text style={{ color: "#191216", fontSize: 14, fontWeight: "900" as const }}>Actions</Text>
        {detail.actions.map((action) => (
          <Pressable
            key={action.label}
            onPress={() => openTarget(action.target)}
            style={{ minHeight: 52, borderRadius: 16, backgroundColor: "#fff9f6", paddingHorizontal: spacing.sm, flexDirection: "row", alignItems: "center", gap: spacing.sm }}
          >
            <View style={{ width: 34, height: 34, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", backgroundColor: `${detail.tint}1f` }}>
              <Ionicons color={detail.tint} name={action.icon} size={17} />
            </View>
            <Text style={{ flex: 1, color: "#191216", fontSize: 14, fontWeight: "900" as const }}>{action.label}</Text>
            <Ionicons color="#8c7a74" name="chevron-forward" size={16} />
          </Pressable>
        ))}
      </View>

      <View style={{ borderRadius: 22, backgroundColor: "#fff", borderWidth: 1, borderColor: "rgba(65,42,34,0.08)", padding: spacing.sm, gap: spacing.xs }}>
        <Text style={{ color: "#191216", fontSize: 14, fontWeight: "900" as const }}>Recent profile posts</Text>
        {ownPosts.slice(0, 3).map((post) => (
          <Pressable key={post.id} onPress={() => router.push("/(tabs)/profile")} style={{ minHeight: 46, borderRadius: 14, backgroundColor: "#fff9f6", paddingHorizontal: spacing.sm, flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
            <Ionicons color={detail.tint} name="image-outline" size={16} />
            <Text numberOfLines={1} style={{ flex: 1, color: "#191216", fontSize: 13, fontWeight: "800" as const }}>{post.body}</Text>
          </Pressable>
        ))}
        {!ownPosts.length ? (
          <Pressable onPress={() => router.push("/(tabs)/studio")} style={{ minHeight: 52, borderRadius: 16, backgroundColor: "#fff9f6", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: spacing.xs }}>
            <Ionicons color={detail.tint} name="add-circle-outline" size={18} />
            <Text style={{ color: "#191216", fontSize: 13, fontWeight: "900" as const }}>Create a post for this feature</Text>
          </Pressable>
        ) : null}
      </View>
    </ScrollView>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, minHeight: 58, borderRadius: 16, backgroundColor: "#fff", borderWidth: 1, borderColor: "rgba(65,42,34,0.08)", alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: "#191216", fontSize: 16, fontWeight: "900" as const, fontVariant: ["tabular-nums"] }}>{value}</Text>
      <Text style={{ color: "#8c7a74", fontSize: 10, fontWeight: "800" as const }}>{label}</Text>
    </View>
  );
}

function compact(value: number) {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

const iconButton = {
  width: 40,
  height: 40,
  borderRadius: radius.pill,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "#fff",
  borderWidth: 1,
  borderColor: "rgba(65,42,34,0.08)",
} as const;
