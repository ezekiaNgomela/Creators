import { router } from "expo-router";
import { useMemo, useState } from "react";

import { ChatHomeLayout } from "@/src/features/chat/components/chat-home-layout";
import { useApp } from "@/src/providers/app-provider";

export type ChatMode = "Chats" | "Pinned" | "Groups";

export function ChatScreen() {
  const { activeChatId, chatContacts, chatMessages, chatUsers, createDirectChat, createGroupChat, loadThread, session } = useApp();
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

  async function openVoice(contactId: string) {
    await loadThread(contactId);
    router.push({ pathname: "/conversations/[contactId]/voice", params: { contactId } });
  }

  async function openVideo(contactId: string) {
    await loadThread(contactId);
    router.push({ pathname: "/conversations/[contactId]/video", params: { contactId } });
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
      onModeChange={setMode}
      onOpenThread={(contactId) => void openThread(contactId)}
      onOpenVideo={(contactId) => void openVideo(contactId)}
      onOpenVoice={(contactId) => void openVoice(contactId)}
      onQueryChange={setQuery}
      query={query}
      sessionName={session?.name}
    />
  );
}
