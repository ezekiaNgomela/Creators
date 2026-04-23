import { ScrollView } from "react-native";

import { HomeLayout } from "@/src/features/home/components/home-layout";
import { useApp } from "@/src/providers/app-provider";
import { spacing } from "@/src/theme/tokens";

export function HomeScreen() {
  const { displayPosts, health, liveRooms, openLive, profile, session } = useApp();

  return (
    <ScrollView
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: "#f8efe5" }}
    >
      <HomeLayout
        displayPosts={displayPosts}
        health={health}
        liveRooms={liveRooms}
        onOpenLive={openLive}
        profile={profile}
        sessionName={session?.name}
      />
    </ScrollView>
  );
}
