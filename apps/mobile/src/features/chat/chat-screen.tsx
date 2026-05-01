import { router } from "expo-router";
import { useMemo, useState } from "react";

import { ChatHomeLayout } from "@/src/features/chat/components/chat-home-layout";
import { useApp } from "@/src/providers/app-provider";

export type ChatMode = "Inbox" | "Sents" | "Group";

export function ChatScreen() {
  const { activeChatId, chatContacts, loadThread, notifications, markAllNotificationsRead, session } = useApp();
  const [mode, setMode] = useState<ChatMode>("Inbox");
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

    if (mode === "Sents") {
      return base.filter((_, index) => index % 2 === 0);
    }

    if (mode === "Group") {
      return base.filter((contact) => contact.type === "group");
    }

    return base;
  }, [chatContacts, mode, query]);

  async function openThread(contactId: string) {
    await loadThread(contactId);
    router.push({ pathname: "/conversations/[contactId]", params: { contactId } });
  }

  return (
    <ChatHomeLayout
      activeChatId={activeChatId}
      contacts={chatContacts}
      filteredContacts={filteredContacts}
      mode={mode}
      notificationCount={notifications.filter((notification) => !notification.readAt).length}
      onModeChange={setMode}
      onOpenNotifications={() => {
        void markAllNotificationsRead();
        router.push("/notifications" as never);
      }}
      onOpenThread={(contactId) => void openThread(contactId)}
      onQueryChange={setQuery}
      query={query}
      sessionName={session?.name}
    />
  );
}
