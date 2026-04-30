import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { CallActionButton } from "@/src/features/chat/components/call-action-button";
import { chatAvatar, chatPalette, presenceLabel } from "@/src/features/chat/chat-theme";
import { useApp } from "@/src/providers/app-provider";
import { radius, spacing } from "@/src/theme/tokens";

export function VideoCallScreen() {
  const { callId, contactId } = useLocalSearchParams<{ callId?: string; contactId: string }>();
  const { activeCall, chatContacts, endCall, joinCall } = useApp();

  const contact = useMemo(
    () => chatContacts.find((item) => item.id === contactId) ?? null,
    [chatContacts, contactId],
  );
  const currentCallId = Number(callId ?? activeCall?.id ?? 0);
  const participantCount = activeCall?.participants.length ?? contact?.participantCount ?? 1;

  useEffect(() => {
    if (currentCallId) {
      void joinCall(currentCallId);
    }
  }, [currentCallId]);

  async function endCurrentCall() {
    if (currentCallId) {
      await endCall(currentCallId);
    }
    router.back();
  }

  return (
    <>
      <Stack.Screen options={{ animation: "fade", headerShown: false, presentation: "fullScreenModal" }} />
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        contentInsetAdjustmentBehavior="automatic"
        style={{ flex: 1, backgroundColor: chatPalette.page }}
      >
        <View style={{ flex: 1, minHeight: 720 }}>
          <View style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: chatPalette.page }} />
          <Image
            source={chatAvatar(contact?.name ?? contactId ?? "call")}
            style={{ position: "absolute", alignSelf: "center", top: 150, width: 220, height: 220, borderRadius: radius.pill, opacity: 0.42 }}
          />
          <View style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: "rgba(7,13,20,0.58)" }} />

          <View style={{ padding: spacing.lg, gap: spacing.lg }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Pressable onPress={() => router.back()} style={videoAction}>
                <Ionicons color={chatPalette.ink} name="arrow-back" size={18} />
              </Pressable>
              <View style={{ alignItems: "center" }}>
                <Text style={{ color: chatPalette.ink, fontSize: 18, fontWeight: "900" as const }}>
                  {contact?.name ?? "Video call"}
                </Text>
                <Text style={{ color: "rgba(247,251,255,0.74)", fontSize: 12 }}>
                  {activeCall?.status ?? "connecting"} - {participantCount} in room
                </Text>
              </View>
              <Pressable
                onPress={() => router.replace({ pathname: "/conversations/[contactId]/voice", params: { callId: callId ?? "", contactId: contactId ?? "" } })}
                style={videoAction}
              >
                <Ionicons color={chatPalette.ink} name="call-outline" size={18} />
              </Pressable>
            </View>

            <View style={{ alignSelf: "flex-end", marginTop: spacing.md, gap: spacing.sm }}>
              <View
                style={{
                  alignSelf: "flex-end",
                  borderRadius: radius.pill,
                  backgroundColor: "rgba(15, 23, 33, 0.74)",
                  paddingHorizontal: spacing.sm,
                  paddingVertical: 7,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.14)",
                }}
              >
                <Text style={{ color: chatPalette.accent, fontSize: 11, fontWeight: "800" as const }}>
                  {presenceLabel(contact?.updatedAt)}
                </Text>
              </View>
              <View
                style={{
                  width: 112,
                  height: 156,
                  borderRadius: 24,
                  overflow: "hidden",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.14)",
                  backgroundColor: "rgba(15, 23, 33, 0.78)",
                }}
              >
                <Image source={chatAvatar("you-preview")} style={{ width: "100%", height: "100%" }} />
              </View>
            </View>
          </View>

          <View style={{ position: "absolute", left: spacing.lg, right: spacing.lg, bottom: spacing.xxl, gap: spacing.md }}>
            <View
              style={{
                alignSelf: "center",
                borderRadius: radius.pill,
                backgroundColor: "rgba(15, 23, 33, 0.78)",
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.14)",
              }}
            >
              <Text style={{ color: chatPalette.ink, fontSize: 12, fontWeight: "800" as const }}>
                Protected video room with {contact?.name ?? "creator"}
              </Text>
            </View>

            <View style={{ flexDirection: "row", justifyContent: "center", gap: spacing.md, flexWrap: "wrap" }}>
              <CallActionButton glass icon="mic-off-outline" label="Mute" />
              <CallActionButton glass icon="videocam-off-outline" label="Camera" />
              <CallActionButton icon="call" label="End" onPress={() => void endCurrentCall()} tone="danger" />
            </View>
          </View>
        </View>
      </ScrollView>
    </>
  );
}

const videoAction = {
  width: 52,
  height: 52,
  borderRadius: radius.pill,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "rgba(15, 23, 33, 0.78)",
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.14)",
} as const;
