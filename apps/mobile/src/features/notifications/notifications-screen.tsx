import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";

import { useApp } from "@/src/providers/app-provider";
import type { Notification } from "@/src/services/api";
import { palette, radius, spacing } from "@/src/theme/tokens";

export function NotificationsScreen() {
  const { markAllNotificationsRead, notifications } = useApp();
  const unreadCount = notifications.filter((notification) => !notification.readAt).length;

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: 80 }} contentInsetAdjustmentBehavior="automatic" style={{ flex: 1, backgroundColor: palette.bg }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm }}>
        <View style={{ gap: spacing.xs, flex: 1 }}>
          <Text style={{ color: palette.accent, fontSize: 12, fontWeight: "900", letterSpacing: 1.1, textTransform: "uppercase" }}>Notifications</Text>
          <Text style={{ color: palette.text, fontSize: 30, fontWeight: "900" }}>Activity inbox</Text>
          <Text style={{ color: palette.textMuted, fontSize: 13 }}>{unreadCount ? `${unreadCount} unread updates` : "Everything is caught up"}</Text>
        </View>
        <Pressable onPress={() => void markAllNotificationsRead()} style={{ width: 46, height: 46, borderRadius: radius.pill, backgroundColor: palette.panelRaised, borderWidth: 1, borderColor: palette.stroke, alignItems: "center", justifyContent: "center" }}>
          <Ionicons color={palette.accent} name="checkmark-done" size={19} />
        </Pressable>
      </View>

      <View style={{ gap: spacing.sm }}>
        {notifications.length ? (
          notifications.map((notification) => (
            <NotificationRow key={notification.id} notification={notification} />
          ))
        ) : (
          <View style={{ borderRadius: radius.xl, backgroundColor: palette.panelRaised, borderWidth: 1, borderColor: palette.stroke, padding: spacing.lg, gap: spacing.xs }}>
            <Text style={{ color: palette.text, fontSize: 18, fontWeight: "900" }}>No updates yet</Text>
            <Text style={{ color: palette.textMuted, fontSize: 13, lineHeight: 19 }}>Publishing posts, calls, comments, and live activity will appear here from the backend.</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function NotificationRow({ notification }: { notification: Notification }) {
  const unread = !notification.readAt;
  return (
    <Pressable
      onPress={() => openNotification(notification)}
      style={{
        borderRadius: 24,
        borderWidth: 1,
        borderColor: unread ? "rgba(109,233,183,0.34)" : palette.stroke,
        backgroundColor: unread ? "rgba(109,233,183,0.1)" : palette.panelRaised,
        padding: spacing.md,
        gap: spacing.xs,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
        <View style={{ width: 38, height: 38, borderRadius: radius.pill, backgroundColor: palette.panel, alignItems: "center", justifyContent: "center" }}>
          <Ionicons color={palette.accent} name={iconFor(notification.type)} size={18} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: palette.text, fontSize: 15, fontWeight: "900" }}>{notification.title}</Text>
          <Text style={{ color: palette.textMuted, fontSize: 12 }}>{relativeTime(notification.createdAt)}</Text>
        </View>
        <Ionicons color={palette.textMuted} name="chevron-forward" size={17} />
      </View>
      <Text style={{ color: palette.textMuted, fontSize: 13, lineHeight: 19 }}>{notification.body}</Text>
    </Pressable>
  );
}

function openNotification(notification: Notification) {
  if (notification.link.startsWith("/studio")) {
    router.push("/(tabs)/studio");
    return;
  }
  if (notification.link.startsWith("/calls")) {
    router.push("/(tabs)/chat");
    return;
  }
  router.push("/(tabs)/home");
}

function iconFor(type: string) {
  if (type === "call") {
    return "call-outline";
  }
  if (type === "post") {
    return "images-outline";
  }
  return "notifications-outline";
}

function relativeTime(value: string) {
  const then = new Date(value).getTime();
  const diffMinutes = Math.max(1, Math.round((Date.now() - then) / (1000 * 60)));
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  return `${Math.round(diffHours / 24)}d ago`;
}
