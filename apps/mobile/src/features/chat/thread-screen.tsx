import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { chatAvatar, chatPalette, presenceLabel, shortTime } from "@/src/features/chat/chat-theme";
import { useApp } from "@/src/providers/app-provider";
import type { ChatMessage } from "@/src/services/api";
import { radius, spacing } from "@/src/theme/tokens";

type IconName = keyof typeof Ionicons.glyphMap;

export function ThreadScreen() {
  const { contactId } = useLocalSearchParams<{ contactId: string }>();
  const { chatContacts, chatMessages, loadThread, sendMessage, startCall } = useApp();
  const [callStatus, setCallStatus] = useState("");
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [messageStatus, setMessageStatus] = useState("");
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  const contact = useMemo(
    () => chatContacts.find((item) => item.id === contactId) ?? null,
    [chatContacts, contactId],
  );
  const title = contact?.name ?? "Chatroom";
  const subtitle = contact?.type === "group"
    ? `${contact.participantCount} members`
    : presenceLabel(contact?.updatedAt);

  useEffect(() => {
    if (contactId) {
      void loadThread(contactId);
    }
  }, [contactId]);

  useEffect(() => {
    const scrollTimer = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 80);
    return () => clearTimeout(scrollTimer);
  }, [chatMessages.length, contactId]);

  async function openCall(mode: "voice" | "video") {
    if (!contactId) {
      return;
    }
    setCallStatus(`Starting ${mode} call...`);
    try {
      const call = await startCall({ mode, roomId: contactId });
      setCallStatus("");
      router.push({
        pathname: mode === "voice" ? "/conversations/[contactId]/voice" : "/conversations/[contactId]/video",
        params: { callId: String(call.id), contactId },
      });
    } catch (err) {
      setCallStatus(err instanceof Error ? err.message : "Could not start call.");
    }
  }

  async function submitMessage() {
    const body = draft.trim();
    if (!body || isSending) {
      return;
    }
    setDraft("");
    setIsSending(true);
    setMessageStatus("");
    try {
      await sendMessage(body);
    } catch (err) {
      setDraft(body);
      setMessageStatus(err instanceof Error ? err.message : "Message could not send.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ animation: "slide_from_right", headerShown: false }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1, backgroundColor: chatPalette.page }}
      >
        <View style={{ flex: 1, paddingTop: insets.top + 4 }}>
          <View
            style={{
              height: 40,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: spacing.xs,
              paddingHorizontal: spacing.xs,
              borderBottomWidth: 1,
              borderBottomColor: chatPalette.border,
              backgroundColor: chatPalette.page,
            }}
          >
            <View style={{ flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
              <HeaderButton icon="chevron-back" onPress={() => router.back()} />
              <Image source={chatAvatar(title)} style={{ width: 30, height: 30, borderRadius: radius.pill }} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={{ color: chatPalette.ink, fontSize: 13, fontWeight: "900" as const }}>
                  {title}
                </Text>
                <Text numberOfLines={1} style={{ color: chatPalette.soft, fontSize: 10, fontWeight: "800" as const }}>
                  {subtitle}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
              <HeaderButton icon="call-outline" onPress={() => void openCall("voice")} />
              <HeaderButton icon="videocam-outline" onPress={() => void openCall("video")} />
              <HeaderButton icon="ellipsis-vertical" />
            </View>
          </View>

          {callStatus ? (
            <Text
              numberOfLines={1}
              style={{ color: chatPalette.accentWarm, fontSize: 11, fontWeight: "800" as const, paddingHorizontal: spacing.sm, paddingTop: spacing.xs }}
            >
              {callStatus}
            </Text>
          ) : null}

          <ScrollView
            contentContainerStyle={{
              gap: spacing.xs,
              paddingHorizontal: spacing.sm,
              paddingTop: spacing.xs,
              paddingBottom: spacing.sm,
            }}
            keyboardShouldPersistTaps="handled"
            ref={scrollRef}
            showsVerticalScrollIndicator={false}
            style={{ flex: 1 }}
          >
            {chatMessages.length ? (
              chatMessages.map((message) => (
                <MessageRow
                  key={message.id}
                  message={message}
                  peerName={contact?.name ?? message.sender.name}
                />
              ))
            ) : (
              <EmptyThread title={title} />
            )}
          </ScrollView>

          {messageStatus ? (
            <Text
              numberOfLines={2}
              style={{ color: chatPalette.danger, fontSize: 11, fontWeight: "800" as const, paddingHorizontal: spacing.sm, paddingBottom: 4 }}
            >
              {messageStatus}
            </Text>
          ) : null}

          <ComposerBar
            bottomInset={insets.bottom}
            disabled={!draft.trim() || isSending}
            draft={draft}
            onChangeDraft={setDraft}
            onSubmit={() => void submitMessage()}
            placeholder={`Message ${title}`}
          />
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

function MessageRow({
  message,
  peerName,
}: {
  message: ChatMessage;
  peerName: string;
}) {
  const own = message.own;
  const senderName = own ? "You" : message.sender.name || peerName;

  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: own ? "flex-end" : "flex-start",
        alignItems: "flex-end",
        gap: 6,
      }}
    >
      {!own ? (
        <Image source={chatAvatar(senderName)} style={{ width: 26, height: 26, borderRadius: radius.pill }} />
      ) : null}

      <View style={{ maxWidth: "78%", alignItems: own ? "flex-end" : "flex-start", gap: 3 }}>
        {!own ? (
          <Text numberOfLines={1} style={{ color: chatPalette.soft, fontSize: 10, fontWeight: "800" as const, paddingLeft: 2 }}>
            {senderName}
          </Text>
        ) : null}
        <View
          style={{
            borderRadius: 20,
            borderBottomLeftRadius: own ? 20 : 6,
            borderBottomRightRadius: own ? 6 : 20,
            backgroundColor: own ? chatPalette.accent : chatPalette.shellRaised,
            paddingHorizontal: spacing.sm,
            paddingVertical: 9,
          }}
        >
          <Text style={{ color: own ? chatPalette.black : chatPalette.ink, fontSize: 14, lineHeight: 20 }}>
            {message.body}
          </Text>
        </View>
        <Text style={{ color: chatPalette.soft, fontSize: 9, fontWeight: "800" as const }}>
          {shortTime(message.createdAt)}
        </Text>
      </View>
    </View>
  );
}

function ComposerBar({
  bottomInset,
  disabled,
  draft,
  onChangeDraft,
  onSubmit,
  placeholder,
}: {
  bottomInset: number;
  disabled: boolean;
  draft: string;
  onChangeDraft: (value: string) => void;
  onSubmit: () => void;
  placeholder: string;
}) {
  return (
    <View
      style={{
        borderTopWidth: 1,
        borderTopColor: chatPalette.border,
        backgroundColor: chatPalette.page,
        paddingHorizontal: spacing.xs,
        paddingTop: spacing.xs,
        paddingBottom: Math.max(bottomInset, spacing.xs),
      }}
    >
      <View
        style={{
          minHeight: 48,
          borderRadius: radius.pill,
          borderWidth: 1,
          borderColor: chatPalette.border,
          backgroundColor: chatPalette.shell,
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          paddingHorizontal: 5,
        }}
      >
        <ComposerIcon icon="camera-outline" />
        <ComposerIcon icon="mic-outline" />
        <TextInput
          multiline
          onChangeText={onChangeDraft}
          placeholder={placeholder}
          placeholderTextColor={chatPalette.soft}
          style={{
            flex: 1,
            minHeight: 38,
            maxHeight: 88,
            color: chatPalette.ink,
            fontSize: 14,
            paddingHorizontal: spacing.xs,
            paddingVertical: Platform.OS === "ios" ? 9 : 6,
          }}
          value={draft}
        />
        <ComposerIcon icon="attach-outline" />
        <ComposerIcon icon="image-outline" />
        <ComposerIcon active={!disabled} disabled={disabled} icon="send" onPress={onSubmit} />
      </View>
    </View>
  );
}

function EmptyThread({ title }: { title: string }) {
  return (
    <View
      style={{
        alignItems: "center",
        gap: spacing.xs,
        marginTop: spacing.xxl,
        paddingHorizontal: spacing.lg,
      }}
    >
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: radius.pill,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: chatPalette.shell,
          borderWidth: 1,
          borderColor: chatPalette.border,
        }}
      >
        <Ionicons color={chatPalette.accent} name="chatbubble-ellipses-outline" size={22} />
      </View>
      <Text style={{ color: chatPalette.ink, fontSize: 15, fontWeight: "900" as const }}>Start chatting</Text>
      <Text style={{ color: chatPalette.soft, fontSize: 12, lineHeight: 18, textAlign: "center" }}>
        Messages with {title} will appear here as soon as the room opens through the API.
      </Text>
    </View>
  );
}

function HeaderButton({ icon, onPress }: { icon: IconName; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        width: 30,
        height: 30,
        borderRadius: radius.pill,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: chatPalette.shell,
        borderWidth: 1,
        borderColor: chatPalette.border,
      }}
    >
      <Ionicons color={chatPalette.ink} name={icon} size={15} />
    </Pressable>
  );
}

function ComposerIcon({
  active,
  disabled,
  icon,
  onPress,
}: {
  active?: boolean;
  disabled?: boolean;
  icon: IconName;
  onPress?: () => void;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={{
        width: 31,
        height: 31,
        borderRadius: radius.pill,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: active ? chatPalette.accent : "transparent",
        opacity: disabled ? 0.42 : 1,
      }}
    >
      <Ionicons color={active ? chatPalette.black : chatPalette.soft} name={icon} size={17} />
    </Pressable>
  );
}
