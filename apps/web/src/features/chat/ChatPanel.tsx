import { useState, useEffect, useRef, ChangeEvent } from "react";
import { IconButton, InputBase, Avatar, Badge } from "@mui/material";
import {
    SendRounded,
    AddCircleOutlineRounded,
    EmojiEmotionsRounded,
    MoreVertRounded,
    SearchRounded,
    CheckCircleRounded,
    AttachFileRounded,
    CloseRounded,
    PlayCircleOutlineRounded
} from "@mui/icons-material";
import type { ChatContact as ApiChatContact, ChatMessage as ApiChatMessage } from "../../api";

type ChatContact = ApiChatContact & {
    participants: Array<ApiChatContact["participants"][number] & { avatarUrl?: string }>;
};

type ChatMessage = ApiChatMessage & {
    attachmentType?: "image" | "video" | "audio" | string;
    attachmentUrl?: string;
};

const LIVE_EMOJIS = ["❤️", "🔥", "🙌", "😂", "😮", "😢", "💯"];

export function ChatPanel({
    contacts,
    activeContactId,
    onSelectContact,
    onSendMessage,
    messages,
    currentUserId
}: {
    contacts: ChatContact[];
    activeContactId: string | null;
    onSelectContact: (id: string) => void;
    onSendMessage: (body: string, file?: File) => void;
    messages: ChatMessage[];
    currentUserId: number;
}) {
    const [text, setText] = useState("");
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) setSelectedFile(file);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleSend = () => {
        if (!text.trim() && !selectedFile) return;
        onSendMessage(text, selectedFile || undefined);
        setText("");
        setSelectedFile(null);
    };

    const activeContact = contacts.find(c => c.id === activeContactId);

    return (
        <div className="chat-panel-root">
            {/* Sharp Sidebar - 1:3 Ratio Aspect View Logic */}
            <aside className="chat-sidebar">
                <div className="sidebar-header">
                    <h2>Messages</h2>
                    <IconButton size="small"><AddCircleOutlineRounded fontSize="small" /></IconButton>
                </div>
                <div className="sidebar-search">
                    <SearchRounded fontSize="small" />
                    <InputBase placeholder="Search chats..." fullWidth />
                </div>
                <div className="contact-list">
                    {contacts.map(contact => (
                        <button
                            key={contact.id}
                            className={`contact-item ${activeContactId === contact.id ? 'active' : ''}`}
                            onClick={() => onSelectContact(contact.id)}
                        >
                            <Badge variant="dot" color="success" overlap="circular" invisible={Math.random() > 0.3}>
                                <Avatar src={contact.participants[0]?.avatarUrl} sx={{ width: 44, height: 44 }} />
                            </Badge>
                            <div className="contact-info">
                                <strong>{contact.name}</strong>
                                <p>{contact.lastBody || "No messages yet"}</p>
                            </div>
                            <span className="contact-time">12:45</span>
                        </button>
                    ))}
                </div>
            </aside>

            {/* Main Chat Area */}
            <main className="chat-main">
                {activeContact ? (
                    <>
                        <header className="chat-header">
                            <div className="header-user">
                                <Avatar src={activeContact.participants[0]?.avatarUrl} sx={{ width: 32, height: 32 }} />
                                <div>
                                    <strong>{activeContact.name}</strong>
                                    <span>{activeContact.subtitle}</span>
                                </div>
                            </div>
                            <IconButton size="small"><MoreVertRounded /></IconButton>
                        </header>

                        <div className="message-container" ref={scrollRef}>
                            {messages.map((msg, i) => (
                                <div key={msg.id || i} className={`message-row ${msg.own ? 'own' : ''}`}>
                                    {!msg.own && <Avatar sx={{ width: 28, height: 28, mt: 'auto' }} />}
                                    <div className={`message-bubble ${msg.attachmentUrl ? 'has-attachment' : ''}`}>
                                        {msg.attachmentUrl && (
                                            <div className="message-attachment">
                                                {msg.attachmentType === 'video' ? (
                                                    <div className="video-thumbnail">
                                                        <img alt="" src={msg.attachmentUrl} />
                                                        <div className="play-overlay">
                                                            <PlayCircleOutlineRounded />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <img className="attachment-image" alt="" src={msg.attachmentUrl} />
                                                )}
                                            </div>
                                        )}
                                        {msg.body && <p>{msg.body}</p>}
                                        <span className="message-meta">
                                            12:46 {msg.own && <CheckCircleRounded sx={{ fontSize: 10, ml: 0.5 }} />}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <footer className="chat-footer">
                            {selectedFile && (
                                <div className="attachment-preview">
                                    <div className="file-info">
                                        <AttachFileRounded fontSize="small" />
                                        <span>{selectedFile.name}</span>
                                    </div>
                                    <IconButton size="small" onClick={() => setSelectedFile(null)}>
                                        <CloseRounded fontSize="small" />
                                    </IconButton>
                                </div>
                            )}
                            {showEmojiPicker && (
                                <div className="live-emoji-bar">
                                    {LIVE_EMOJIS.map(emoji => (
                                        <button key={emoji} onClick={() => setText(prev => prev + emoji)}>{emoji}</button>
                                    ))}
                                </div>
                            )}
                            <div className="input-wrapper">
                                <input
                                    type="file"
                                    hidden
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    accept="image/*,video/*,audio/*,.pdf,.zip"
                                />
                                <IconButton onClick={() => fileInputRef.current?.click()}>
                                    <AttachFileRounded />
                                </IconButton>
                                <IconButton onClick={() => setShowEmojiPicker(!showEmojiPicker)}>
                                    <EmojiEmotionsRounded sx={{ color: showEmojiPicker ? '#ff6848' : 'inherit' }} />
                                </IconButton>
                                <InputBase
                                    placeholder="Write a message..."
                                    fullWidth
                                    value={text}
                                    onChange={(e) => setText(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                />
                                <IconButton onClick={handleSend} color="primary" disabled={!text.trim() && !selectedFile}>
                                    <SendRounded />
                                </IconButton>
                            </div>
                        </footer>
                    </>
                ) : (
                    <div className="chat-empty-state">
                        <div className="empty-icon">💬</div>
                        <h3>Your Workspace Chat</h3>
                        <p>Select a conversation to start collaborating with other creators.</p>
                    </div>
                )}
            </main>

            <style>{`
        .chat-panel-root { display: flex; height: 100%; background: #0a0a0a; color: #fff; overflow: hidden; }
        .chat-sidebar { width: 320px; border-right: 1px solid rgba(255,255,255,0.05); display: flex; flexDirection: column; }
        .chat-main { flex: 1; display: flex; flexDirection: column; position: relative; }
        .message-bubble { padding: 10px 14px; border-radius: 18px; max-width: 70%; position: relative; font-size: 0.9rem; }
        .message-row.own .message-bubble { background: #ff6848; color: white; border-bottom-right-radius: 4px; margin-left: auto; }
        .message-row:not(.own) .message-bubble { background: #1e1e1e; color: #eee; border-bottom-left-radius: 4px; }
        .message-bubble.has-attachment { padding: 4px; overflow: hidden; }
        .message-bubble.has-attachment p { padding: 6px 10px 2px; }
        .message-attachment { border-radius: 14px; overflow: hidden; display: flex; max-width: 300px; max-height: 400px; }
        .attachment-image { width: 100%; height: 100%; object-fit: cover; display: block; }
        .video-thumbnail { position: relative; width: 100%; height: 100%; }
        .video-thumbnail img { width: 100%; height: 100%; object-fit: cover; display: block; opacity: 0.8; }
        .play-overlay { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; background: rgba(0,0,0,0.4); border-radius: 50%; display: flex; padding: 8px; }
        .live-emoji-bar { position: absolute; bottom: 80px; left: 20px; background: #1a1a1a; padding: 8px; border-radius: 30px; display: flex; gap: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.5); }
        .attachment-preview { position: absolute; bottom: 80px; left: 20px; right: 20px; background: #1e1e1e; padding: 8px 12px; border-radius: 8px; display: flex; align-items: center; justify-content: space-between; border: 1px solid rgba(255,255,255,0.1); z-index: 10; }
        .attachment-preview .file-info { display: flex; align-items: center; gap: 8px; font-size: 0.8rem; color: #ff6848; overflow: hidden; }
        .attachment-preview .file-info span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      `}</style>
        </div>
    );
}
