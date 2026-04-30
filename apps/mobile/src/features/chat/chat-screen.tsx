import { router } from "expo-router";
import { useMemo, useState } from "react";

import { ChatHomeLayout } from "@/src/features/chat/components/chat-home-layout";
import { useApp } from "@/src/providers/app-provider";

export type ChatMode = "Chats" | "Pinned" | "Groups";

export function ChatScreen() {
  const { activeChatId, chatContacts, chatMessages, chatUsers, createDirectChat, createGroupChat, loadThread, notifications, markAllNotificationsRead, session, startCall } = useApp();
  const [mode, setMode] = useState<ChatMode>("Chats");
  const [query, setQuery] = useState("");

  const filteredContacts = useMemo(() => {
    const term = query.trim().toLowerCase();
    const base = chatContacts.filter((contact) => {
      if (!term) {
        return true;
      }
      const haystack = `${contact.name} ${contact.subtitle} ${contact.lastBody}`.toLowerCase();
      return haystack.includes(term);
    });

    if (mode === "Pinned") {
      return base.slice(0, 3);
    }

    if (mode === "Groups") {
      return base.filter((contact) => contact.type === "group");
    }

    return base;
  }, [chatContacts, mode, query]);

  async function openThread(contactId: string) {
    await loadThread(contactId);
    router.push({ pathname: "/conversations/[contactId]", params: { contactId } });
  }

  async function openCall(contactId: string, mode: "voice" | "video") {
    await loadThread(contactId);
    const call = await startCall({ mode, roomId: contactId });
    if (mode === "voice") {
      router.push({ pathname: "/conversations/[contactId]/voice", params: { callId: String(call.id), contactId } });
      return;
    }
    router.push({ pathname: "/conversations/[contactId]/video", params: { callId: String(call.id), contactId } });
  }

  return (
    <ChatHomeLayout
      activeChatId={activeChatId}
      chatMessages={chatMessages}
      chatUsers={chatUsers}
      contacts={chatContacts}
      filteredContacts={filteredContacts}
      mode={mode}
      onCreateDirectChat={(participantId) => void createDirectChat(participantId)}
      onCreateGroupChat={(input) => void createGroupChat(input)}
      notificationCount={notifications.filter((notification) => !notification.readAt).length}
      onModeChange={setMode}
      onOpenNotifications={() => {
        void markAllNotificationsRead();
        router.push("/notifications" as never);
      }}
      onOpenThread={(contactId) => void openThread(contactId)}
      onOpenVideo={(contactId) => void openCall(contactId, "video")}
      onOpenVoice={(contactId) => void openCall(contactId, "voice")}
      onQueryChange={setQuery}
      query={query}
      sessionName={session?.name}
    />
  );
}
