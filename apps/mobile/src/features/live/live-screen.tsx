import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { useState } from "react";
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
  const { activeCall, activeChatId, chatContacts, comments, liveIndex, liveRooms, openLive, selectedLiveRoom, closeLive, addLiveComment, session, startCall } = useApp();
  const [callStatus, setCallStatus] = useState("");

  if (!selectedLiveRoom) {
    return (
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: 120 }} contentInsetAdjustmentBehavior="automatic" style={{ flex: 1, backgroundColor: palette.bg }}>
        <LiveLayout liveIndex={liveIndex} liveRooms={liveRooms} onOpenLive={openLive} sessionName={session?.name} />
      </ScrollView>
    );
  }

  const liveComments = comments.filter((item) => item.targetType === "live" && item.targetId === selectedLiveRoom.id);
  const participantNames = [selectedLiveRoom.host, ...liveRooms.filter((room) => room.id !== selectedLiveRoom.id).map((room) => room.host)].slice(0, 4);

  async function startLiveCall(mode: "voice" | "video") {
    const roomId = activeChatId || chatContacts[0]?.id;
    if (!roomId) {
      setCallStatus("Create or open a chat room before starting a live call.");
      return;
    }

    setCallStatus(`Opening ${mode} room...`);
    try {
      const call = await startCall({ roomId, mode });
      setCallStatus(`${mode === "video" ? "Video meeting" : "Voice room"} #${call.id} is ready.`);
    } catch (error) {
      setCallStatus(error instanceof Error ? error.message : "Could not start the live call.");
    }
  }

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: 120 }} contentInsetAdjustmentBehavior="automatic" style={{ flex: 1, backgroundColor: palette.bg }}>
      <View style={{ overflow: "hidden", borderRadius: radius.xl, borderWidth: 1, borderColor: palette.stroke, backgroundColor: palette.panel }}>
        <Pressable onPress={closeLive}>
          <Image source={{ uri: selectedLiveRoom.coverUrl }} style={{ width: "100%", aspectRatio: 0.68 }} />
          <LinearGradient colors={["transparent", "rgba(0,0,0,0.94)"]} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} />
          <View style={{ position: "absolute", left: spacing.lg, right: spacing.lg, bottom: spacing.lg }}>
            <Text style={{ color: palette.accentWarm, fontWeight: "900", textTransform: "uppercase" }}>Now watching</Text>
            <Text style={{ color: palette.text, fontSize: 30, fontWeight: "900", marginTop: spacing.sm }}>{selectedLiveRoom.title}</Text>
            <Text style={{ color: "rgba(255,255,255,0.7)", marginTop: spacing.xs }}>{selectedLiveRoom.host}</Text>
          </View>
        </Pressable>
      </View>

      <PrimaryButton label="Tap video again to leave focused player" onPress={closeLive} />

      <View style={liveStyles.meetingPanel}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <Text style={liveStyles.eyebrow}>Live room</Text>
            <Text style={liveStyles.meetingTitle}>Creator room is open</Text>
            <Text style={liveStyles.meetingCopy}>{selectedLiveRoom.host} is live with {selectedLiveRoom.topic}.</Text>
          </View>
          <View style={{ flexDirection: "row-reverse", paddingLeft: spacing.sm }}>
            {participantNames.map((name, index) => (
              <Image
                key={name}
                source={{ uri: `https://api.dicebear.com/8.x/avataaars/png?seed=${encodeURIComponent(name)}` }}
                style={[liveStyles.participantAvatar, { marginLeft: index === 0 ? 0 : -12 }]}
              />
            ))}
          </View>
        </View>

        <View style={liveStyles.controlRow}>
          <LiveControl icon="videocam" label="Meeting" primary onPress={() => startLiveCall("video")} />
          <LiveControl icon="call" label="Voice" onPress={() => startLiveCall("voice")} />
          <LiveControl icon="people" label="Group" onPress={() => startLiveCall("video")} />
        </View>

        {callStatus || activeCall ? (
          <View style={liveStyles.callStatus}>
            <Text style={{ color: palette.text, fontWeight: "900" as const }}>{activeCall ? `${activeCall.mode} call #${activeCall.id}` : "Call room"}</Text>
            <Text style={{ color: palette.textMuted, fontSize: 12 }}>{callStatus || activeCall?.status}</Text>
          </View>
        ) : null}
      </View>

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

function LiveControl({
  icon,
  label,
  onPress,
  primary,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  primary?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        minHeight: 46,
        borderRadius: radius.pill,
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        backgroundColor: primary ? palette.accent : palette.panelMuted,
        borderWidth: 1,
        borderColor: primary ? "transparent" : palette.stroke,
      }}
    >
      <Ionicons color={primary ? palette.black : palette.text} name={icon} size={18} />
      <Text style={{ color: primary ? palette.black : palette.text, fontSize: 12, fontWeight: "900" as const }}>{label}</Text>
    </Pressable>
  );
}

const liveStyles = stylex.create({
  sectionTitle: {
    color: palette.text,
    fontSize: 24,
    fontWeight: "900" as const,
  },
  meetingPanel: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: "rgba(109,233,183,0.22)",
    backgroundColor: palette.panel,
    padding: spacing.md,
    gap: spacing.md,
  },
  eyebrow: {
    color: palette.accent,
    fontSize: 11,
    fontWeight: "900" as const,
    textTransform: "uppercase" as const,
    letterSpacing: 1.5,
  },
  meetingTitle: {
    color: palette.text,
    fontSize: 18,
    fontWeight: "900" as const,
    marginTop: 4,
  },
  meetingCopy: {
    color: palette.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  participantAvatar: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: palette.panel,
    backgroundColor: palette.panelRaised,
  },
  controlRow: {
    flexDirection: "row" as const,
    gap: spacing.sm,
  },
  callStatus: {
    borderRadius: radius.lg,
    backgroundColor: "rgba(0,0,0,0.22)",
    borderWidth: 1,
    borderColor: palette.stroke,
    padding: spacing.sm,
    gap: 2,
  },
});
