import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";

import { radius, spacing } from "@/src/theme/tokens";

type ToolDetail = {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  actions: string[];
};

const toolDetails: Record<string, ToolDetail> = {
  video: {
    title: "Video",
    subtitle: "Manage clips, replays, and short edits that appear on your profile.",
    icon: "videocam-outline",
    tint: "#8b7cf6",
    actions: ["Upload clip", "Review drafts", "Open replay library"],
  },
  dynamic: {
    title: "Dynamic",
    subtitle: "Tune your public moments, featured rooms, and audience highlights.",
    icon: "star-outline",
    tint: "#f4a62a",
    actions: ["Feature a moment", "Pin profile card", "Refresh highlights"],
  },
  grade: {
    title: "Grade",
    subtitle: "Track creator levels, profile completeness, and growth signals.",
    icon: "diamond-outline",
    tint: "#4f91ff",
    actions: ["View score", "Improve profile", "Check content health"],
  },
  "item-store": {
    title: "Item Store",
    subtitle: "Prepare profile add-ons, launch items, and member collectibles.",
    icon: "bag-handle-outline",
    tint: "#ff7f68",
    actions: ["Create item", "Manage shelf", "Preview store"],
  },
  wallet: {
    title: "Wallet",
    subtitle: "Review balances, creator credits, and creator payout readiness.",
    icon: "wallet-outline",
    tint: "#ea5fa1",
    actions: ["View balance", "Add payout details", "Export activity"],
  },
  "daily-task": {
    title: "Daily task",
    subtitle: "Keep your profile active with small daily publishing prompts.",
    icon: "calendar-outline",
    tint: "#26a69a",
    actions: ["Start today's task", "View streak", "Schedule reminder"],
  },
  "live-store": {
    title: "Live store",
    subtitle: "Attach paid items and featured drops to upcoming live rooms.",
    icon: "storefront-outline",
    tint: "#2f80ed",
    actions: ["Open live tab", "Attach product", "Preview room shelf"],
  },
  "paid-content": {
    title: "Paid content",
    subtitle: "Organize locked posts, member edits, and paid media previews.",
    icon: "image-outline",
    tint: "#3b82f6",
    actions: ["Create paid post", "Manage access", "Preview paywall"],
  },
  "room-management": {
    title: "Room Management",
    subtitle: "Control chat rooms, collaborators, and live session permissions.",
    icon: "home-outline",
    tint: "#b35cff",
    actions: ["Open rooms", "Invite collaborators", "Review roles"],
  },
  vip: {
    title: "VIP membership",
    subtitle: "Package exclusive edits, private rooms, and member-only profile posts.",
    icon: "diamond",
    tint: "#ff6bd6",
    actions: ["Create VIP offer", "Preview member page", "Share invite"],
  },
};

export function ProfileToolScreen() {
  const { toolId } = useLocalSearchParams<{ toolId?: string }>();
  const detail = toolDetails[toolId ?? ""] ?? {
    title: "Profile tool",
    subtitle: "This profile area is ready for your next creator workflow.",
    icon: "apps-outline" as const,
    tint: "#ff7f68",
    actions: ["Open profile", "Create post", "Share profile"],
  };

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: 80 }} contentInsetAdjustmentBehavior="automatic" style={{ flex: 1, backgroundColor: "#fff9f6" }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Pressable onPress={() => router.back()} style={iconButton}>
          <Ionicons color="#191216" name="chevron-back" size={20} />
        </Pressable>
        <Pressable onPress={() => router.push("/(tabs)/profile")} style={iconButton}>
          <Ionicons color="#191216" name="person-outline" size={18} />
        </Pressable>
      </View>

      <LinearGradient colors={[`${detail.tint}24`, "#ffffff"]} style={{ minHeight: 220, borderRadius: 28, borderWidth: 1, borderColor: "rgba(65,42,34,0.08)", padding: spacing.lg, justifyContent: "space-between" }}>
        <View style={{ width: 58, height: 58, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" }}>
          <Ionicons color={detail.tint} name={detail.icon} size={28} />
        </View>
        <View style={{ gap: spacing.xs }}>
          <Text style={{ color: "#191216", fontSize: 30, fontWeight: "900" as const }}>{detail.title}</Text>
          <Text style={{ color: "#8c7a74", fontSize: 14, lineHeight: 21 }}>{detail.subtitle}</Text>
        </View>
      </LinearGradient>

      <View style={{ gap: spacing.sm }}>
        {detail.actions.map((action, index) => (
          <Pressable
            key={action}
            onPress={() => {
              if (action.toLowerCase().includes("post") || action.toLowerCase().includes("clip")) {
                router.push("/(tabs)/studio");
              }
            }}
            style={{ minHeight: 58, borderRadius: 18, backgroundColor: "#fff", borderWidth: 1, borderColor: "rgba(65,42,34,0.08)", paddingHorizontal: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.md }}
          >
            <View style={{ width: 34, height: 34, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", backgroundColor: `${detail.tint}1f` }}>
              <Text style={{ color: detail.tint, fontWeight: "900" as const }}>{index + 1}</Text>
            </View>
            <Text style={{ flex: 1, color: "#191216", fontSize: 15, fontWeight: "900" as const }}>{action}</Text>
            <Ionicons color="#8c7a74" name="chevron-forward" size={16} />
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const iconButton = {
  width: 42,
  height: 42,
  borderRadius: radius.pill,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "#fff",
  borderWidth: 1,
  borderColor: "rgba(65,42,34,0.08)",
} as const;
