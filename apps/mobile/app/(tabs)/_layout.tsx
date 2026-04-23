import { Tabs } from "expo-router";

import { TabIcon } from "@/src/components/navigation/tab-icon";
import { palette } from "@/src/theme/tokens";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.accent,
        tabBarInactiveTintColor: palette.textMuted,
        tabBarStyle: {
          backgroundColor: "#0a101b",
          borderTopColor: palette.stroke,
          height: 72,
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
