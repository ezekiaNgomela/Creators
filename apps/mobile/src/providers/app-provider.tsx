import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

import {
  type AuthUser,
  type ChatContact,
  type ChatMessage,
  type ChatUser,
  type Comment,
  type FeedPost,
  type HealthResponse,
  type LiveIndex,
  type LiveRating,
  type LiveRoom,
  type ProfileResponse,
  addUsersToChatRoom,
  createChatRoom,
  createComment,
  fetchChatContacts,
  fetchChatMessages,
  fetchChatUsers,
  fetchComments,
  fetchCurrentUser,
  fetchFeed,
  fetchHealth,
  fetchLiveIndex,
  fetchProfile,
  loginAccount,
  logoutAccount,
  rateLiveRoom,
  registerAccount,
  sendChatMessage,
  updateProfile,
} from "@/src/services/api";

type ThemeName = "default" | "dark" | "beautiful";

type AppContextValue = {
  activeChatId: string;
  chatContacts: ChatContact[];
  chatMessages: ChatMessage[];
  chatUsers: ChatUser[];
  comments: Comment[];
  displayPosts: DisplayPost[];
  health: HealthResponse | null;
  isBooting: boolean;
  isLoading: boolean;
  liveIndex: LiveIndex | null;
  liveRooms: LiveRoom[];
  profile: ProfileResponse | null;
  selectedLiveId: number | null;
  selectedLiveRoom: LiveRoom | null;
  session: AuthUser | null;
  theme: ThemeName;
  signIn: (input: { email: string; password: string }) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (input: { name: string; email: string; password: string }) => Promise<void>;
  createDirectChat: (participantId: number) => Promise<void>;
  createGroupChat: (input: { title: string; participantIds: number[] }) => Promise<void>;
  addUsersToActiveChat: (participantIds: number[]) => Promise<void>;
  loadThread: (contactId: string) => Promise<void>;
  sendMessage: (body: string) => Promise<void>;
  openLive: (room: LiveRoom) => void;
  closeLive: () => void;
  setTheme: (theme: ThemeName) => void;
  addPostComment: (postId: number, body: string) => Promise<void>;
  addLiveComment: (liveId: number, body: string) => Promise<void>;
  loadPostComments: (postId: number) => Promise<void>;
  loadLiveComments: (liveId: number) => Promise<void>;
  saveProfile: (input: { name: string; bio: string; headline: string; location: string }) => Promise<void>;
  rateLive: (liveRoomId: number, score: number) => Promise<void>;
};

export type DisplayPost = FeedPost & {
  comments: number;
  gallery: string[];
  likes: number;
  promotionScore: number;
  tags: string[];
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [activeChatId, setActiveChatId] = useState("");
  const [chatContacts, setChatContacts] = useState<ChatContact[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatUsers, setChatUsers] = useState<ChatUser[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [isBooting, setIsBooting] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [liveIndex, setLiveIndex] = useState<LiveIndex | null>(null);
  const [liveRooms, setLiveRooms] = useState<LiveRoom[]>([]);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [selectedLiveId, setSelectedLiveId] = useState<number | null>(null);
  const [session, setSession] = useState<AuthUser | null>(null);
  const [theme, setTheme] = useState<ThemeName>("default");

  const selectedLiveRoom = useMemo(
    () => liveRooms.find((room) => room.id === selectedLiveId) ?? null,
    [liveRooms, selectedLiveId],
  );

  const displayPosts = useMemo(() => {
    const mapped = posts.map<DisplayPost>((post, index) => ({
      ...post,
      comments: 348 - index * 27,
      gallery: [postImageFor(post.id), postImageFor(post.id + 1), postImageFor(post.id + 2), postImageFor(post.id + 3)],
      likes: 1125 - index * 109,
      promotionScore: Math.max(42, Math.min(99, 96 - index * 5 + (post.id % 6))),
      tags: [post.mood.toLowerCase().replace(/\s+/g, ""), "creator"],
    }));
    return mapped.sort((left, right) => right.promotionScore - left.promotionScore);
  }, [posts]);

  async function loadSession() {
    try {
      setSession(await fetchCurrentUser());
    } catch {
      setSession(null);
    }
  }

  async function refreshData() {
    if (!session) {
      return;
    }
    setIsLoading(true);
    try {
      const [nextFeed, nextHealth, nextLive, nextProfile, nextContacts, nextChatUsers] = await Promise.all([
        fetchFeed(),
        fetchHealth().catch(() => null),
        fetchLiveIndex(),
        fetchProfile(),
        fetchChatContacts(),
        fetchChatUsers(),
      ]);
      setLiveRooms(nextFeed.liveRooms);
      setPosts(nextFeed.posts);
      setHealth(nextHealth);
      setLiveIndex(nextLive);
      setProfile(nextProfile);
      setChatContacts(nextContacts);
      setChatUsers(nextChatUsers);
      if (!selectedLiveId && nextFeed.liveRooms[0]) {
        setSelectedLiveId(null);
      }
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    Promise.all([loadSession(), fetchHealth().catch(() => null)]).then(([, nextHealth]) => {
      setHealth(nextHealth);
      setIsBooting(false);
    });
  }, []);

  useEffect(() => {
    void refreshData();
  }, [session]);

  useEffect(() => {
    if (chatContacts.length && !chatMessages.length) {
      void loadThread(chatContacts[0].id);
    }
  }, [chatContacts.length]);

  async function signIn(input: { email: string; password: string }) {
    const response = await loginAccount(input);
    setSession(response.user);
  }

  async function signUp(input: { name: string; email: string; password: string }) {
    const response = await registerAccount(input);
    setSession(response.user);
  }

  async function signOut() {
    await logoutAccount();
    setSession(null);
    setActiveChatId("");
    setChatContacts([]);
    setChatMessages([]);
    setChatUsers([]);
    setComments([]);
    setLiveIndex(null);
    setLiveRooms([]);
    setPosts([]);
    setProfile(null);
  }

  async function loadThread(contactId: string) {
    setActiveChatId(contactId);
    setChatMessages(await fetchChatMessages(contactId));
  }

  async function createDirectChat(participantId: number) {
    const room = await createChatRoom({ type: "direct", participantIds: [participantId] });
    setChatContacts(await fetchChatContacts());
    await loadThread(room.id);
  }

  async function createGroupChat(input: { title: string; participantIds: number[] }) {
    const room = await createChatRoom({ type: "group", title: input.title, participantIds: input.participantIds });
    setChatContacts(await fetchChatContacts());
    await loadThread(room.id);
  }

  async function addUsersToActiveChat(participantIds: number[]) {
    if (!activeChatId) {
      return;
    }
    await addUsersToChatRoom({ roomId: activeChatId, participantIds });
    setChatContacts(await fetchChatContacts());
  }

  async function sendMessage(body: string) {
    if (!activeChatId) {
      return;
    }
    const message = await sendChatMessage({ contactId: activeChatId, body });
    setChatMessages((current) => [...current, message]);
    setChatContacts(await fetchChatContacts());
  }

  function openLive(room: LiveRoom) {
    setSelectedLiveId(room.id);
  }

  function closeLive() {
    setSelectedLiveId(null);
  }

  async function loadPostComments(postId: number) {
    setComments(await fetchComments("post", postId));
  }

  async function loadLiveComments(liveId: number) {
    setComments(await fetchComments("live", liveId));
  }

  async function addPostComment(postId: number, body: string) {
    const comment = await createComment({ targetType: "post", targetId: postId, body });
    setComments((current) => [...current, comment]);
  }

  async function addLiveComment(liveId: number, body: string) {
    const comment = await createComment({ targetType: "live", targetId: liveId, body });
    setComments((current) => [...current, comment]);
  }

  async function saveProfile(input: { name: string; bio: string; headline: string; location: string }) {
    setProfile(await updateProfile(input));
  }

  async function rateLive(liveRoomId: number, score: number) {
    const rating = await rateLiveRoom({ liveRoomId, score });
    setLiveIndex((current) => {
      if (!current) {
        return current;
      }
      const ratings = current.ratings.filter((item) => item.liveRoomId !== liveRoomId);
      return { ...current, ratings: [...ratings, rating] };
    });
  }

  return (
    <AppContext.Provider
      value={{
        activeChatId,
        addUsersToActiveChat,
        addLiveComment,
        addPostComment,
        chatContacts,
        chatMessages,
        chatUsers,
        closeLive,
        comments,
        createDirectChat,
        createGroupChat,
        displayPosts,
        health,
        isBooting,
        isLoading,
        liveIndex,
        liveRooms,
        loadLiveComments,
        loadPostComments,
        loadThread,
        openLive,
        profile,
        rateLive,
        saveProfile,
        selectedLiveId,
        selectedLiveRoom,
        sendMessage,
        session,
        setTheme,
        signIn,
        signOut,
        signUp,
        theme,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used inside AppProvider");
  }
  return context;
}

function postImageFor(seed: number) {
  const images = [
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1000&q=82",
    "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1000&q=82",
    "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1000&q=82",
    "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1000&q=82",
    "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1000&q=82",
  ];
  return images[Math.abs(seed) % images.length];
}
