import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AppProviders } from "@/providers/app-provider";

export default function RootLayout() {
  return (
    <AppProviders>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          animation: "fade",
          headerTransparent: true,
          headerShadowVisible: false,
          headerTitleStyle: {
            fontSize: 16,
            fontWeight: "700",
          },
          contentStyle: {
            backgroundColor: "#050816",
          },
          headerTintColor: "#f8fafc",
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="sign-in" options={{ title: "Sign In" }} />
        <Stack.Screen name="join" options={{ title: "Join Creators" }} />
        <Stack.Screen name="studio" options={{ title: "Creator Studio" }} />
      </Stack>
    </AppProviders>
  );
}
