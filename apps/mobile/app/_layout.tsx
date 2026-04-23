import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { AppProvider } from "@/src/providers/app-provider";
import { palette } from "@/src/theme/tokens";

export default function RootLayout() {
  return (
    <AppProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: palette.bg },
          headerStyle: { backgroundColor: palette.bg },
          headerTintColor: palette.text,
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ presentation: "modal", title: "Settings" }} />
      </Stack>
    </AppProvider>
  );
}
