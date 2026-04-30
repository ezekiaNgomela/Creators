import { FormEvent, useMemo, useState } from "react";
import { Avatar, AvatarGroup, Badge, Button, Chip, Collapse, Fade, IconButton, InputBase, LinearProgress, Paper } from "@mui/material";
import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import AutoAwesomeRounded from "@mui/icons-material/AutoAwesomeRounded";
import ContentCopyRounded from "@mui/icons-material/ContentCopyRounded";
import CommentRounded from "@mui/icons-material/CommentRounded";
import ForumRounded from "@mui/icons-material/ForumRounded";
import GroupsRounded from "@mui/icons-material/GroupsRounded";
import MoreHorizRounded from "@mui/icons-material/MoreHorizRounded";
import NorthEastRounded from "@mui/icons-material/NorthEastRounded";
import PhoneRounded from "@mui/icons-material/PhoneRounded";
import SearchRounded from "@mui/icons-material/SearchRounded";
import SendRounded from "@mui/icons-material/SendRounded";
import SettingsRounded from "@mui/icons-material/SettingsRounded";
import VideocamOutlined from "@mui/icons-material/VideocamOutlined";
import VideocamRounded from "@mui/icons-material/VideocamRounded";
import type { CallSession, ChatContact, ChatMessage, ChatUser } from "../../api";
import { EmojiComposer, EmojiText, FollowPill } from "../../components/engagement";
import { compactNumber, firstName, profileImageFor, timeAgo } from "../../shared/helpers";

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
  const [search, setSearch] = useState("");
  const [activeChatTab, setActiveChatTab] = useState<"Chats" | "Groups" | "Pinned">("Chats");
  const [groupTitle, setGroupTitle] = useState("Creator circle");
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [savingRoom, setSavingRoom] = useState(false);
  const activeContact = contacts.find((contact) => contact.id === selectedThreadId);
  const visibleContacts = contacts.filter((contact) => {
    const query = search.trim().toLowerCase();
    const matchesQuery = !query || contact.name.toLowerCase().includes(query) || (contact.subtitle ?? "").toLowerCase().includes(query);
    if (!matchesQuery) {
      return false;
    }
    if (activeChatTab === "Groups") {
      return contact.type === "group";
    }
    if (activeChatTab === "Pinned") {
      return contacts.indexOf(contact) < 3;
    }
    return true;
  });
  const tabs = [
    { label: "Pinned" as const, count: contacts.slice(0, 3).length },
    { label: "Chats" as const, count: contacts.length },
    { label: "Groups" as const, count: contacts.filter((contact) => contact.type === "group").length },
  ];
  const availableUsers = chatUsers.filter((user) => !activeContact?.participants.some((participant) => participant.id === user.id));
  const selectedUsers = chatUsers.filter((user) => selectedUserIds.includes(user.id));

  function toggleSelectedUser(userId: number) {
    setSelectedUserIds((current) => (
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId]
    ));
  }

  async function submitGroupRoom() {
    if (selectedUserIds.length < 2) {
      return;
    }
    setSavingRoom(true);
    try {
      await onCreateGroupChat(groupTitle, selectedUserIds);
      setSelectedUserIds([]);
      setGroupTitle("Creator circle");
      setActiveChatTab("Groups");
    } finally {
      setSavingRoom(false);
    }
  }

  async function addSelectedUsersToRoom() {
    if (!selectedUserIds.length || activeContact?.type !== "group") {
      return;
    }
    setSavingRoom(true);
    try {
      await onAddUsersToRoom(selectedUserIds);
      setSelectedUserIds([]);
    } finally {
      setSavingRoom(false);
    }
  }

  return (
    <section className="search-panel">
      <div className="mx-auto grid min-h-[calc(100vh-80px)] max-w-6xl gap-4 lg:grid-cols-[340px,minmax(0,1fr)]">
        <Fade in timeout={350}>
          <Paper elevation={0} sx={{ p: 2, borderRadius: "28px", background: "linear-gradient(180deg, color-mix(in srgb, var(--surface-3) 94%, transparent), color-mix(in srgb, var(--panel-bg) 92%, transparent))", border: "1px solid var(--line-soft)", color: "var(--text-1)" }}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="m-0 text-xs font-black uppercase tracking-[0.2em] text-[color:var(--text-3)]">Direct</p>
                <h1 className="mt-1 text-3xl font-black">Messages</h1>
              </div>
              <div className="flex items-center gap-1">
                <IconButton className="!text-[color:var(--accent)]">
                  <SearchRounded />
                </IconButton>
                <IconButton className="!text-[color:var(--accent)]" onClick={onOpenProfile}>
                  <SettingsRounded />
                </IconButton>
              </div>
            </div>

            <div className="mb-4 flex gap-3 overflow-x-auto pb-1">
              {contacts.slice(0, 5).map((contact) => (
                <button className="flex min-w-[62px] flex-col items-center gap-2 text-center" key={contact.id} type="button" onClick={() => void onOpenThread(contact.id)}>
                  <div className="rounded-full bg-[linear-gradient(135deg,var(--accent),#49d17d)] p-[2px]">
                    <Avatar src={profileImageFor(contact.name)} sx={{ width: 54, height: 54, border: "3px solid var(--panel-bg)" }} />
                  </div>
                  <span className="max-w-[64px] truncate text-[11px] font-semibold text-[color:var(--text-3)]">{firstName(contact.name)}</span>
                </button>
              ))}
            </div>

            <Paper elevation={0} sx={{ px: 1.5, py: 0.75, display: "flex", alignItems: "center", gap: 1, borderRadius: "18px", background: "var(--surface-3)", border: "1px solid var(--line-soft)" }}>
              <ForumRounded sx={{ color: "var(--accent)", fontSize: 18 }} />
              <InputBase placeholder="Search conversations" sx={{ color: "var(--text-1)", flex: 1 }} value={search} onChange={(event) => setSearch(event.target.value)} />
            </Paper>

            <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1">
              {tabs.map((tab) => (
                <Chip
                  key={tab.label}
                  label={`${tab.label}${tab.count ? ` ${tab.count}` : ""}`}
                  onClick={() => setActiveChatTab(tab.label)}
                  sx={{
                    borderRadius: "999px",
                    fontWeight: 800,
                    color: activeChatTab === tab.label ? "var(--text-dark)" : "var(--text-3)",
                    background: activeChatTab === tab.label ? "linear-gradient(135deg, #49d17d, #84f7a5)" : "var(--surface-3)",
                    border: activeChatTab === tab.label ? "none" : "1px solid var(--line-soft)",
                    cursor: "pointer",
                  }}
                />
              ))}
            </div>

            <Paper elevation={0} sx={{ mt: 2, p: 1.5, borderRadius: "22px", background: "rgba(73,209,125,0.08)", border: "1px solid rgba(73,209,125,0.18)" }}>
              <div className="mb-2 flex items-center justify-between gap-2">
                <strong className="text-sm">Start a room</strong>
                <small className="text-[color:var(--text-3)]">{selectedUsers.length} selected</small>
              </div>
              <InputBase
                fullWidth
                placeholder="Group name"
                sx={{ mb: 1, px: 1.5, py: 0.5, borderRadius: "14px", color: "var(--text-1)", background: "var(--surface-3)" }}
                value={groupTitle}
                onChange={(event) => setGroupTitle(event.target.value)}
              />
              <div className="flex gap-2 overflow-x-auto pb-2">
                {chatUsers.slice(0, 8).map((user) => (
                  <button
                    className={`min-w-[72px] rounded-[18px] border px-2 py-2 text-center text-xs font-bold ${selectedUserIds.includes(user.id) ? "border-[#49d17d] bg-[#49d17d]/20 text-white" : "border-[color:var(--line-soft)] bg-[color:var(--surface-3)] text-[color:var(--text-3)]"}`}
                    key={user.id}
                    type="button"
                    onClick={() => {
                      toggleSelectedUser(user.id);
                    }}
                    onDoubleClick={() => void onCreateDirectChat(user.id)}
                  >
                    <Avatar src={profileImageFor(user.name)} sx={{ width: 34, height: 34, mx: "auto", mb: 0.5 }} />
                    <span className="block truncate">{firstName(user.name)}</span>
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Button disabled={savingRoom || selectedUserIds.length < 1} onClick={() => selectedUserIds[0] ? void onCreateDirectChat(selectedUserIds[0]) : undefined} sx={{ flex: 1, borderRadius: "14px", color: "var(--text-1)", borderColor: "var(--line-soft)" }} variant="outlined">
                  Direct
                </Button>
                <Button disabled={savingRoom || selectedUserIds.length < 2} onClick={() => void submitGroupRoom()} sx={{ flex: 1, borderRadius: "14px", color: "#07130d", background: "#49d17d" }} variant="contained">
                  Group
                </Button>
              </div>
            </Paper>

            <div className="mt-4 space-y-3">
              {visibleContacts.map((contact) => (
                <article
                  className={`rounded-[24px] border p-3 transition ${contact.id === selectedThreadId ? "border-[color:var(--accent)] bg-[color:var(--accent-soft)]" : "border-[color:var(--line-soft)] bg-[color:var(--surface-3)] hover:bg-[color:var(--chip-bg)]"}`}
                  key={contact.id}
                >
                  <div className="flex items-center gap-3">
                    <button className="flex min-w-0 flex-1 items-center gap-3 text-left" type="button" onClick={() => void onOpenThread(contact.id)}>
                      <Avatar src={profileImageFor(contact.name)} sx={{ width: 50, height: 50 }} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <strong className="block truncate text-sm">{contact.name}</strong>
                          <small className="shrink-0 text-[11px] text-[color:var(--text-3)]">25m</small>
                        </span>
                        <small className="block truncate text-xs text-[color:var(--text-3)]">{contact.type === "group" ? `${contact.participantCount} members` : contact.subtitle}</small>
                        <small className="block truncate text-xs text-[color:var(--text-3)]">{contact.lastBody || "No messages yet"}</small>
                      </span>
                    </button>
                    <div className="flex flex-col items-end gap-2">
                      <FollowPill following={isFollowing(contact.name)} onClick={() => onToggleFollow(contact.name)} />
                      <span className="h-2.5 w-2.5 rounded-full bg-[#49d17d]" />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </Paper>
        </Fade>

        <Fade in timeout={500}>
          <Paper elevation={0} sx={{ p: 2, borderRadius: "32px", background: "linear-gradient(180deg, rgba(14,18,24,0.96), rgba(25,31,39,0.98))", border: "1px solid rgba(255,255,255,0.08)", color: "#fff" }}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Avatar src={profileImageFor(activeContact?.name ?? "chat")} sx={{ width: 58, height: 58 }} />
                <div>
                  <h2 className="m-0 text-xl font-black">{activeContact?.name ?? "Chat"}</h2>
                  <p className="m-0 text-sm text-white/50">
                    {activeContact?.type === "group" ? `${activeContact.participantCount} members` : activeContact?.subtitle ?? "Direct conversation"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <IconButton className="!text-white/75" onClick={() => void onStartCall("voice")}>
                  <PhoneRounded />
                </IconButton>
                <IconButton className="!text-white/75" onClick={() => void onStartCall("video")}>
                  <VideocamOutlined />
                </IconButton>
                <IconButton className="!text-white/75">
                  <MoreHorizRounded />
                </IconButton>
              </div>
            </div>
            {callStatus || activeCall ? (
              <div className="call-status-strip">
                <strong>{activeCall ? `${activeCall.mode} call #${activeCall.id}` : "Call"}</strong>
                <span>{callStatus || activeCall?.status}</span>
              </div>
            ) : null}

            {activeContact?.type === "group" ? (
              <Paper elevation={0} sx={{ mt: 3, p: 1.5, borderRadius: "22px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <strong className="text-sm">Add people</strong>
                  <small className="text-white/45">{activeContact.participants.map((participant) => firstName(participant.name)).join(", ")}</small>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {availableUsers.slice(0, 8).map((user) => (
                    <button
                      className={`min-w-[72px] rounded-[18px] border px-2 py-2 text-center text-xs font-bold ${selectedUserIds.includes(user.id) ? "border-[#49d17d] bg-[#49d17d]/20 text-white" : "border-white/10 bg-white/5 text-white/60"}`}
                      key={user.id}
                      type="button"
                      onClick={() => toggleSelectedUser(user.id)}
                    >
                      <Avatar src={profileImageFor(user.name)} sx={{ width: 32, height: 32, mx: "auto", mb: 0.5 }} />
                      <span className="block truncate">{firstName(user.name)}</span>
                    </button>
                  ))}
                </div>
                <Button disabled={savingRoom || selectedUserIds.length === 0} onClick={() => void addSelectedUsersToRoom()} sx={{ borderRadius: "14px", color: "#07130d", background: "#49d17d" }} variant="contained">
                  Add to group
                </Button>
              </Paper>
            ) : null}

            <div className="mt-4 rounded-[28px] border border-white/6 bg-black/10 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white/40">
                <CommentRounded sx={{ fontSize: 18 }} />
                Thread
              </div>
              <div className="chat-bubbles min-h-[320px]">
                {messages.map((message) => (
                  <Paper
                    className={message.own ? "own" : ""}
                    elevation={0}
                    key={message.id}
                    sx={{
                      p: 1.5,
                      borderRadius: message.own ? "22px 22px 8px 22px" : "22px 22px 22px 8px",
                      background: message.own ? "linear-gradient(135deg, #2ec866, #50df82)" : "rgba(255,255,255,0.08)",
                      color: "#fff",
                    }}
                  >
                    <EmojiText className="text-sm" text={message.body} />
                  </Paper>
                ))}
              </div>

              <EmojiComposer
                placeholder={`Message ${activeContact?.name ?? "your contact"}`}
                onSubmit={onSendMessage}
              />
            </div>
          </Paper>
        </Fade>
      </div>
    </section>
  );
}
