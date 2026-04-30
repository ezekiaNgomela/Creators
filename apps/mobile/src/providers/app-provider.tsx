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
  type CallSession,
  type MediaUploadResponse,
  type Notification,
  type PostInput,
  type ProfileResponse,
  addUsersToChatRoom,
  createCallSession,
  createChatRoom,
  createComment,
  createPost,
  fetchChatContacts,
  fetchChatMessages,
  fetchChatUsers,
  fetchComments,
  fetchCurrentUser,
  fetchFeed,
  fetchHealth,
  fetchLiveIndex,
  fetchNotifications,
  fetchProfile,
  loginAccount,
  logoutAccount,
  markNotificationsRead,
  rateLiveRoom,
  registerAccount,
  sendChatMessage,
  updateCallSession,
  updatePost,
  updateProfile,
  uploadMedia,
} from "@/src/services/api";

type ThemeName = "default" | "dark" | "beautiful";

type AppContextValue = {
  activeChatId: string;
  chatContacts: ChatContact[];
  chatMessages: ChatMessage[];
  chatUsers: ChatUser[];
  comments: Comment[];
  activeCall: CallSession | null;
  displayPosts: DisplayPost[];
  health: HealthResponse | null;
  isBooting: boolean;
  isLoading: boolean;
  liveIndex: LiveIndex | null;
  liveRooms: LiveRoom[];
  notifications: Notification[];
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
  createStudioPost: (input: PostInput) => Promise<FeedPost>;
  updateStudioPost: (id: number, input: PostInput) => Promise<FeedPost>;
  uploadStudioMedia: (input: { uri: string; name: string; type: string }) => Promise<MediaUploadResponse>;
  startCall: (input: { roomId: string; mode: "voice" | "video" }) => Promise<CallSession>;
  joinCall: (id: number) => Promise<CallSession>;
  endCall: (id: number) => Promise<CallSession>;
  markAllNotificationsRead: () => Promise<void>;
  addPostComment: (postId: number, body: string) => Promise<void>;
  addLiveComment: (liveId: number, body: string) => Promise<void>;
  loadPostComments: (postId: number) => Promise<void>;
  loadLiveComments: (liveId: number) => Promise<void>;
  saveProfile: (input: { name: string; bio: string; headline: string; location: string; avatarUrl?: string; coverUrl?: string; websiteUrl?: string }) => Promise<void>;
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
  const [activeCall, setActiveCall] = useState<CallSession | null>(null);
  const [chatContacts, setChatContacts] = useState<ChatContact[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatUsers, setChatUsers] = useState<ChatUser[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [isBooting, setIsBooting] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [liveIndex, setLiveIndex] = useState<LiveIndex | null>(null);
  const [liveRooms, setLiveRooms] = useState<LiveRoom[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
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
    const mapped = posts.map<DisplayPost>((post) => ({
      ...post,
      comments: post.commentCount,
      gallery: post.gallery.length ? post.gallery : post.mediaUrl ? [post.mediaUrl] : [],
      likes: post.likeCount,
      promotionScore: post.promotionScore,
      tags: post.tags.length ? post.tags : [post.mood.toLowerCase().replace(/\s+/g, ""), post.mediaType].filter(Boolean),
    }));
    return mapped.sort((left, right) => right.promotionScore - left.promotionScore || new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
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
      const [nextFeed, nextHealth, nextLive, nextProfile, nextContacts, nextChatUsers, nextNotifications] = await Promise.all([
        fetchFeed(),
        fetchHealth().catch(() => null),
        fetchLiveIndex(),
        fetchProfile(),
        fetchChatContacts(),
        fetchChatUsers(),
        fetchNotifications(),
      ]);
      setLiveRooms(nextFeed.liveRooms);
      setPosts(nextFeed.posts);
      setHealth(nextHealth);
      setLiveIndex(nextLive);
      setProfile(nextProfile);
      setChatContacts(nextContacts);
      setChatUsers(nextChatUsers);
      setNotifications(nextNotifications);
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
    setActiveCall(null);
    setLiveIndex(null);
    setLiveRooms([]);
    setNotifications([]);
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

  async function createStudioPost(input: PostInput) {
    const post = await createPost(input);
    setPosts((current) => [post, ...current.filter((item) => item.id !== post.id)]);
    setNotifications(await fetchNotifications());
    return post;
  }

  async function updateStudioPost(id: number, input: PostInput) {
    const post = await updatePost(id, input);
    setPosts((current) => current.map((item) => (item.id === post.id ? post : item)));
    setNotifications(await fetchNotifications());
    return post;
  }

  async function uploadStudioMedia(input: { uri: string; name: string; type: string }) {
    return uploadMedia(input);
  }

  async function startCall(input: { roomId: string; mode: "voice" | "video" }) {
    const call = await createCallSession(input);
    setActiveCall(call);
    setNotifications(await fetchNotifications());
    return call;
  }

  async function joinCall(id: number) {
    const call = await updateCallSession({ id, action: "join" });
    setActiveCall(call);
    return call;
  }

  async function endCall(id: number) {
    const call = await updateCallSession({ id, action: "end" });
    setActiveCall(call);
    return call;
  }

  async function markAllNotificationsRead() {
    await markNotificationsRead();
    setNotifications(await fetchNotifications());
  }

  async function saveProfile(input: { name: string; bio: string; headline: string; location: string; avatarUrl?: string; coverUrl?: string; websiteUrl?: string }) {
    const nextProfile = await updateProfile(input);
    setProfile(nextProfile);
    setSession(nextProfile.user);
    setPosts((current) => current.map((post) => (post.author.id === nextProfile.user.id ? { ...post, author: nextProfile.user } : post)));
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
        activeCall,
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
        createStudioPost,
        displayPosts,
        endCall,
        health,
        isBooting,
        isLoading,
        liveIndex,
        liveRooms,
        notifications,
        joinCall,
        loadLiveComments,
        loadPostComments,
        loadThread,
        markAllNotificationsRead,
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
        startCall,
        theme,
        updateStudioPost,
        uploadStudioMedia,
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
