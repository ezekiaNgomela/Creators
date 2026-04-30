import { FormEvent, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Bell,
  Camera,
  ChevronDown,
  FileText,
  Image as ImageIcon,
  Info,
  MessageCircle,
  MoreHorizontal,
  Phone,
  Plus,
  Search,
  Send,
  Settings,
  UserPlus,
  Video,
  Zap,
} from "lucide-react";
import type { CallSession, ChatContact, ChatMessage, ChatUser } from "../../api";
import { EmojiText, FollowPill } from "../../components/engagement";
import { firstName, profileImageFor, timeAgo } from "../../shared/helpers";

type ChatPane = "activity" | "room" | "info";

export function SearchMessages({
  activeCall,
  callStatus,
  chatUsers,
  contacts,
  isFollowing,
  messages,
  onAddUsersToRoom,
  onCreateDirectChat,
  onCreateGroupChat,
  onOpenProfile,
  onOpenThread,
  onSendMessage,
  onStartCall,
  onToggleFollow,
  selectedThreadId,
}: {
  activeCall: CallSession | null;
  callStatus: string;
  chatUsers: ChatUser[];
  contacts: ChatContact[];
  isFollowing: (name: string) => boolean;
  messages: ChatMessage[];
  onAddUsersToRoom: (participantIds: number[]) => Promise<void>;
  onCreateDirectChat: (participantId: number) => Promise<void>;
  onCreateGroupChat: (title: string, participantIds: number[]) => Promise<void>;
  onOpenProfile: () => void;
  onOpenThread: (contactId: string) => Promise<void>;
  onSendMessage: (body: string) => Promise<void>;
  onStartCall: (mode: "voice" | "video") => Promise<void>;
  onToggleFollow: (name: string) => void;
  selectedThreadId: string;
}) {
  const [activeChatTab, setActiveChatTab] = useState<"Chats" | "Groups" | "Pinned">("Chats");
  const [draft, setDraft] = useState("");
  const [groupTitle, setGroupTitle] = useState("Design System Meeting");
  const [mobilePane, setMobilePane] = useState<ChatPane>("room");
  const [query, setQuery] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [savingRoom, setSavingRoom] = useState(false);

  const activeContact = contacts.find((contact) => contact.id === selectedThreadId) ?? contacts[0] ?? null;
  const availableUsers = chatUsers.filter((user) => !activeContact?.participants.some((participant) => participant.id === user.id));
  const filteredContacts = useMemo(() => {
    const term = query.trim().toLowerCase();
    return contacts.filter((contact, index) => {
      const matches = !term || `${contact.name} ${contact.subtitle} ${contact.lastBody}`.toLowerCase().includes(term);
      if (!matches) return false;
      if (activeChatTab === "Groups") return contact.type === "group";
      if (activeChatTab === "Pinned") return index < 3;
      return true;
    });
  }, [activeChatTab, contacts, query]);

  function toggleSelectedUser(userId: number) {
    setSelectedUserIds((current) => (
      current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId]
    ));
  }

  async function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.trim()) return;
    await onSendMessage(draft);
    setDraft("");
  }

  async function submitGroupRoom() {
    if (selectedUserIds.length < 2) return;
    setSavingRoom(true);
    try {
      await onCreateGroupChat(groupTitle, selectedUserIds);
      setSelectedUserIds([]);
      setActiveChatTab("Groups");
      setMobilePane("room");
    } finally {
      setSavingRoom(false);
    }
  }

  async function addSelectedUsersToRoom() {
    if (!selectedUserIds.length || activeContact?.type !== "group") return;
    setSavingRoom(true);
    try {
      await onAddUsersToRoom(selectedUserIds);
      setSelectedUserIds([]);
    } finally {
      setSavingRoom(false);
    }
  }

  return (
    <section className="chat-template-screen">
      <div className="chat-mobile-switch" aria-label="Chat sections">
        {(["activity", "room", "info"] as const).map((pane) => (
          <button className={mobilePane === pane ? "active" : ""} key={pane} type="button" onClick={() => setMobilePane(pane)}>
            {pane === "activity" ? "Activity" : pane === "room" ? "Chatroom" : "Info"}
          </button>
        ))}
      </div>

      <motion.div className="chat-template-grid" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.32 }}>
        <aside className={`chat-activity-pane ${mobilePane === "activity" ? "mobile-active" : ""}`}>
          <header className="chat-pane-header tight">
            <span className="chat-brand-mark">C</span>
            <h1>Chats</h1>
            <button type="button" aria-label="Search">
              <Search size={18} />
            </button>
          </header>

          <div className="chat-search-row">
            <Search size={16} />
            <input placeholder="Search users, inbox, groups" value={query} onChange={(event) => setQuery(event.target.value)} />
            <Settings size={16} />
          </div>

          <section className="chat-avatar-strip" aria-label="Online profiles">
            {contacts.slice(0, 7).map((contact) => (
              <button key={contact.id} type="button" onClick={() => { void onOpenThread(contact.id); setMobilePane("room"); }}>
                <img alt="" src={profileImageFor(contact.name)} />
                <span>{firstName(contact.name)}</span>
              </button>
            ))}
          </section>

          <ChatModeTabs active={activeChatTab} contacts={contacts} onChange={setActiveChatTab} />

          <section className="chat-contact-list" aria-label="Inbox list">
            {filteredContacts.map((contact, index) => (
              <button
                className={contact.id === activeContact?.id ? "active" : ""}
                key={contact.id}
                type="button"
                onClick={() => {
                  void onOpenThread(contact.id);
                  setMobilePane("room");
                }}
              >
                <span className="contact-avatar">
                  <img alt="" src={profileImageFor(contact.name)} />
                  <i />
                </span>
                <span className="contact-copy">
                  <strong>{contact.name}</strong>
                  <small>{contact.lastBody || contact.subtitle || "Tap to open chatroom"}</small>
                </span>
                <em>{index < 2 ? "New" : timeAgo(contact.updatedAt)}</em>
              </button>
            ))}
          </section>

          <section className="chat-create-room">
            <div>
              <strong>New chatroom</strong>
              <span>{selectedUserIds.length} selected</span>
            </div>
            <input value={groupTitle} onChange={(event) => setGroupTitle(event.target.value)} />
            <div className="chat-user-picks">
              {chatUsers.slice(0, 7).map((user) => {
                const active = selectedUserIds.includes(user.id);
                return (
                  <button className={active ? "active" : ""} key={user.id} type="button" onClick={() => toggleSelectedUser(user.id)} onDoubleClick={() => void onCreateDirectChat(user.id)}>
                    <img alt="" src={profileImageFor(user.name)} />
                    <span>{firstName(user.name)}</span>
                  </button>
                );
              })}
            </div>
            <button disabled={savingRoom || selectedUserIds.length < 2} type="button" onClick={() => void submitGroupRoom()}>
              <UserPlus size={15} />
              Create group
            </button>
          </section>
        </aside>

        <main className={`chat-room-pane ${mobilePane === "room" ? "mobile-active" : ""}`}>
          <header className="chat-room-header tight">
            <div>
              <img alt="" src={profileImageFor(activeContact?.name ?? "chat")} />
              <span>
                <strong>{activeContact?.name ?? "Chatroom"}</strong>
                <small>{activeContact?.type === "group" ? `${activeContact.participantCount} members` : activeContact?.subtitle ?? "Online"}</small>
              </span>
            </div>
            <nav aria-label="Chat room actions">
              <button type="button" onClick={() => void onStartCall("video")} aria-label="Video call"><Video size={18} /></button>
              <button type="button" onClick={() => void onStartCall("voice")} aria-label="Voice call"><Phone size={18} /></button>
              <button type="button" onClick={() => setMobilePane("info")} aria-label="Open user information"><Info size={18} /></button>
              <button type="button" aria-label="More actions"><MoreHorizontal size={18} /></button>
            </nav>
          </header>

          {activeCall || callStatus ? (
            <section className="chat-call-strip">
              <Zap size={16} />
              <span>
                <strong>{activeCall ? `${activeCall.mode} call #${activeCall.id}` : "Call room"}</strong>
                <small>{callStatus || activeCall?.status}</small>
              </span>
            </section>
          ) : null}

          <section className="chat-meeting-card">
            <span>
              <Video size={20} />
              <strong>{groupTitle}</strong>
              <small>teleport.video/creators/live-room</small>
            </span>
            <button type="button" onClick={() => void onStartCall("video")}>Join</button>
          </section>

          <section className="chat-message-lane" aria-label="Chat messages">
            {messages.length ? messages.map((message) => (
              <article className={message.own ? "own" : ""} key={message.id}>
                {!message.own ? <img alt="" src={profileImageFor(message.sender.name)} /> : null}
                <span>
                  {!message.own ? <strong>{message.sender.name}</strong> : null}
                  <EmojiText text={message.body} />
                  <small>{timeAgo(message.createdAt)}</small>
                </span>
              </article>
            )) : (
              <div className="chat-empty-room">
                <MessageCircle size={24} />
                <strong>No messages yet</strong>
                <small>Pick a contact or send the first message.</small>
              </div>
            )}
          </section>

          <form className="chat-composer-bar" onSubmit={(event) => void submitMessage(event)}>
            <button type="button" aria-label="Add attachment"><Plus size={18} /></button>
            <input placeholder={`Type something to ${firstName(activeContact?.name ?? "chat")}...`} value={draft} onChange={(event) => setDraft(event.target.value)} />
            <button type="submit" disabled={!draft.trim()} aria-label="Send message"><Send size={18} /></button>
          </form>
        </main>

        <aside className={`chat-info-pane ${mobilePane === "info" ? "mobile-active" : ""}`}>
          <header className="chat-pane-header tight">
            <h2>Images</h2>
            <span>{Math.max(messages.length, 6)} total</span>
            <ChevronDown size={16} />
          </header>

          <section className="chat-user-card">
            <img alt="" src={profileImageFor(activeContact?.name ?? "chat")} />
            <strong>{activeContact?.name ?? "Creator"}</strong>
            <small>{activeContact?.type === "group" ? "Group conversation" : activeContact?.subtitle ?? "Connected creator"}</small>
            <FollowPill following={isFollowing(activeContact?.name ?? "")} onClick={() => activeContact ? onToggleFollow(activeContact.name) : undefined} />
          </section>

          <section className="chat-media-grid" aria-label="Media exchanges">
            {Array.from({ length: 6 }, (_, index) => (
              <img alt="" key={index} src={`https://images.unsplash.com/photo-${[
                "1500530855697-b586d89ba3ee",
                "1500534314209-a25ddb2bd429",
                "1516321318423-f06f85e504b3",
                "1506744038136-46273834b3fb",
                "1519681393784-d120267933ba",
                "1500534314209-a25ddb2bd429",
              ][index]}?auto=format&fit=crop&w=320&q=80`} />
            ))}
          </section>

          <section className="chat-files-list">
            <header>
              <h2>Files</h2>
              <span>History</span>
            </header>
            {[
              { icon: ImageIcon, label: "Media exchanges", value: `${messages.length} items` },
              { icon: FileText, label: "Shared notes", value: "3 docs" },
              { icon: Bell, label: "Activity", value: activeContact ? timeAgo(activeContact.updatedAt) : "Now" },
              { icon: Camera, label: "Calls", value: activeCall ? "Active" : "Ready" },
            ].map(({ icon: Icon, label, value }) => (
              <article key={label}>
                <Icon size={17} />
                <span>
                  <strong>{label}</strong>
                  <small>{value}</small>
                </span>
              </article>
            ))}
          </section>

          {activeContact?.type === "group" ? (
            <section className="chat-add-users">
              <strong>Add people</strong>
              <div className="chat-user-picks">
                {availableUsers.slice(0, 5).map((user) => {
                  const active = selectedUserIds.includes(user.id);
                  return (
                    <button className={active ? "active" : ""} key={user.id} type="button" onClick={() => toggleSelectedUser(user.id)}>
                      <img alt="" src={profileImageFor(user.name)} />
                      <span>{firstName(user.name)}</span>
                    </button>
                  );
                })}
              </div>
              <button disabled={!selectedUserIds.length || savingRoom} type="button" onClick={() => void addSelectedUsersToRoom()}>
                Add to room
              </button>
            </section>
          ) : null}

          <button className="chat-profile-link" type="button" onClick={onOpenProfile}>Open my profile</button>
        </aside>
      </motion.div>
    </section>
  );
}

function ChatModeTabs({
  active,
  contacts,
  onChange,
}: {
  active: "Chats" | "Groups" | "Pinned";
  contacts: ChatContact[];
  onChange: (value: "Chats" | "Groups" | "Pinned") => void;
}) {
  const items = [
    { label: "Pinned" as const, value: Math.min(3, contacts.length) },
    { label: "Chats" as const, value: contacts.length },
    { label: "Groups" as const, value: contacts.filter((contact) => contact.type === "group").length },
  ];
  return (
    <nav className="chat-mode-tabs" aria-label="Inbox mode">
      {items.map((item) => (
        <button className={active === item.label ? "active" : ""} key={item.label} type="button" onClick={() => onChange(item.label)}>
          {item.label}
          <span>{item.value}</span>
        </button>
      ))}
    </nav>
  );
}
