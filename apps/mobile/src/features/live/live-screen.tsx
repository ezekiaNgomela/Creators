import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { useMemo } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { ChannelCard } from "@/src/components/cards/channel-card";
import { StreamChatBubble } from "@/src/components/cards/stream-chat-bubble";
import { LiveLayout } from "@/src/features/live/components/live-layout";
import { CommentComposer } from "@/src/components/ui/comment-composer";
import { PrimaryButton } from "@/src/components/ui/primary-button";
import { useApp } from "@/src/providers/app-provider";
import { stylex } from "@/src/theme/stylex";
import { palette, radius, spacing } from "@/src/theme/tokens";

export function LiveScreen() {
  const { comments, liveIndex, liveRooms, openLive, selectedLiveRoom, closeLive, addLiveComment, session } = useApp();

  if (!selectedLiveRoom) {
    return (
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: 120 }} contentInsetAdjustmentBehavior="automatic" style={{ flex: 1, backgroundColor: palette.bg }}>
        <LiveLayout liveIndex={liveIndex} liveRooms={liveRooms} onOpenLive={openLive} sessionName={session?.name} />
      </ScrollView>
    );
  }

  const liveComments = comments.filter((item) => item.targetType === "live" && item.targetId === selectedLiveRoom.id);

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: 120 }} contentInsetAdjustmentBehavior="automatic" style={{ flex: 1, backgroundColor: palette.bg }}>
      <View style={{ overflow: "hidden", borderRadius: radius.xl, borderWidth: 1, borderColor: palette.stroke, backgroundColor: palette.panel }}>
        <Pressable onPress={closeLive}>
          <Image source={{ uri: `https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?auto=format&fit=crop&w=1000&q=80&sig=${selectedLiveRoom.id}` }} style={{ width: "100%", aspectRatio: 0.68 }} />
          <LinearGradient colors={["transparent", "rgba(0,0,0,0.94)"]} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} />
          <View style={{ position: "absolute", left: spacing.lg, right: spacing.lg, bottom: spacing.lg }}>
            <Text style={{ color: palette.accentWarm, fontWeight: "900", textTransform: "uppercase" }}>Now watching</Text>
            <Text style={{ color: palette.text, fontSize: 30, fontWeight: "900", marginTop: spacing.sm }}>{selectedLiveRoom.title}</Text>
            <Text style={{ color: "rgba(255,255,255,0.7)", marginTop: spacing.xs }}>{selectedLiveRoom.host}</Text>
          </View>
        </Pressable>
      </View>

      <PrimaryButton label="Tap video again to leave focused player" onPress={closeLive} />

      <View style={{ gap: spacing.md }}>
        <Text style={liveStyles.sectionTitle}>Room chat</Text>
        <View style={{ gap: spacing.sm }}>
          {liveComments.map((comment) => (
            <StreamChatBubble author={comment.author.name} body={comment.body} key={comment.id} />
          ))}
        </View>
        <CommentComposer onSubmit={(value) => addLiveComment(selectedLiveRoom.id, value)} placeholder="Say something in the stream room" />
      </View>

      <View style={{ gap: spacing.md }}>
        <Text style={liveStyles.sectionTitle}>More streams</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md }}>
          {(liveIndex?.live ?? liveRooms).filter((room) => room.id !== selectedLiveRoom.id).map((room) => (
            <ChannelCard key={room.id} onPress={() => openLive(room)} room={room} />
          ))}
        </ScrollView>
      </View>
    </ScrollView>
  );
}

const liveStyles = stylex.create({
  sectionTitle: {
    color: palette.text,
    fontSize: 24,
    fontWeight: "900" as const,
  },
});
