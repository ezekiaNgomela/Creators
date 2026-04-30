import { Tabs } from "expo-router";

import { TabIcon } from "@/src/components/navigation/tab-icon";
import { palette } from "@/src/theme/tokens";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#ff6f5e",
        tabBarInactiveTintColor: palette.textMuted,
        tabBarStyle: {
          position: "absolute",
          left: 14,
          right: 14,
          bottom: 12,
          height: 70,
          borderTopWidth: 0,
          borderRadius: 28,
          backgroundColor: "rgba(255,255,255,0.94)",
          borderColor: "rgba(65,42,34,0.08)",
          borderWidth: 1,
          paddingTop: 8,
          paddingBottom: 8,
        },
      }}
    >
      <Tabs.Screen name="home" options={{ title: "Home", tabBarIcon: ({ color }) => <TabIcon color={color} name="home" /> }} />
      <Tabs.Screen name="live" options={{ title: "Live", tabBarIcon: ({ color }) => <TabIcon color={color} name="radio" /> }} />
      <Tabs.Screen name="chat" options={{ title: "Chat", tabBarIcon: ({ color }) => <TabIcon color={color} name="chatbubble" /> }} />
      <Tabs.Screen name="studio" options={{ title: "Studio", tabBarIcon: ({ color }) => <TabIcon color={color} name="sparkles" /> }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: ({ color }) => <TabIcon color={color} name="person" /> }} />
    </Tabs>
  );
}
