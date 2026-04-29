import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";

import { CallActionButton } from "@/src/features/chat/components/call-action-button";
import { chatAvatar, chatPalette, presenceLabel } from "@/src/features/chat/chat-theme";
import { useApp } from "@/src/providers/app-provider";
import { radius, spacing } from "@/src/theme/tokens";

export function VoiceCallScreen() {
  const { contactId } = useLocalSearchParams<{ contactId: string }>();
  const { chatContacts } = useApp();
  const { width } = useWindowDimensions();

  const contact = useMemo(
    () => chatContacts.find((item) => item.id === contactId) ?? null,
    [chatContacts, contactId],
  );

  return (
    <>
      <Stack.Screen options={{ animation: "fade", headerShown: false }} />
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, padding: spacing.lg }}
        contentInsetAdjustmentBehavior="automatic"
        style={{ flex: 1, backgroundColor: chatPalette.page }}
      >
        <LinearGradient
          colors={["#101a2d", "#0b1220", "#081019"]}
          style={{
            flex: 1,
            justifyContent: "space-between",
            borderRadius: 34,
            borderWidth: 1,
            borderColor: chatPalette.border,
            padding: spacing.lg,
            gap: spacing.lg,
          }}
        >
          <View style={{ gap: spacing.lg }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Pressable onPress={() => router.back()} style={callAction}>
                <Ionicons color={chatPalette.ink} name="arrow-back" size={18} />
              </Pressable>
              <Text style={{ color: chatPalette.soft, fontSize: 12, fontWeight: "800" as const }}>Voice call</Text>
              <Pressable
                onPress={() => router.replace({ pathname: "/conversations/[contactId]/video", params: { contactId: contactId ?? "" } })}
                style={callAction}
              >
                <Ionicons color={chatPalette.ink} name="videocam-outline" size={18} />
              </Pressable>
            </View>

            <View
              style={{
                alignSelf: "center",
                width: "100%",
                maxWidth: Math.min(460, width - spacing.xl * 2),
                gap: spacing.lg,
                alignItems: "center",
              }}
            >
              <View
                style={{
                  width: 174,
                  height: 174,
                  borderRadius: radius.pill,
                  borderWidth: 10,
                  borderColor: "rgba(109, 233, 183, 0.12)",
                  backgroundColor: chatPalette.glow,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Image source={chatAvatar(contact?.name ?? "voice")} style={{ width: 142, height: 142, borderRadius: radius.pill }} />
              </View>

              <View style={{ alignItems: "center", gap: 6 }}>
                <Text style={{ color: chatPalette.ink, fontSize: 28, fontWeight: "900" as const, textAlign: "center" }}>
                  {contact?.name ?? "Voice call"}
                </Text>
                <Text style={{ color: chatPalette.soft, fontSize: 14 }}>
                  Crystal audio - 02:18
                </Text>
                <Text style={{ color: chatPalette.accent, fontSize: 12, fontWeight: "800" as const }}>
                  {presenceLabel(contact?.updatedAt)}
                </Text>
              </View>

              <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: spacing.sm }}>
                <CallTag label="Encrypted" />
                <CallTag label="Low latency" />
              </View>

              <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 6, marginTop: spacing.md }}>
                {[18, 26, 36, 22, 42, 28, 16, 34, 24].map((height, index) => (
                  <View
                    key={`bar-${index}`}
                    style={{
                      width: 10,
                      height,
                      borderRadius: radius.pill,
                      backgroundColor: index % 2 === 0 ? chatPalette.accent : "rgba(109,233,183,0.34)",
                    }}
                  />
                ))}
              </View>
            </View>
          </View>

          <View style={{ flexDirection: "row", justifyContent: "center", gap: spacing.md, flexWrap: "wrap" }}>
            <CallActionButton icon="mic-off-outline" label="Mute" />
            <CallActionButton icon="call" label="End" tone="danger" />
            <CallActionButton icon="volume-high-outline" label="Speaker" />
          </View>
        </LinearGradient>
      </ScrollView>
    </>
  );
}

function CallTag({ label }: { label: string }) {
  return (
    <View
      style={{
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: chatPalette.border,
        backgroundColor: chatPalette.panelSoft,
        paddingHorizontal: spacing.sm,
        paddingVertical: 7,
      }}
    >
      <Text style={{ color: chatPalette.soft, fontSize: 11, fontWeight: "800" as const }}>{label}</Text>
    </View>
  );
}

const callAction = {
  width: 52,
  height: 52,
  borderRadius: radius.pill,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: chatPalette.panelSoft,
  borderWidth: 1,
  borderColor: chatPalette.border,
} as const;
