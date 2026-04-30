import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import ReactEmoji from "react-emoji";
import {
  Avatar,
  AvatarGroup,
  Badge,
  Button,
  Chip,
  Collapse,
  Fade,
  IconButton,
  InputBase,
  LinearProgress,
  Paper,
} from "@mui/material";
import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import AutoAwesomeRounded from "@mui/icons-material/AutoAwesomeRounded";
import CommentRounded from "@mui/icons-material/CommentRounded";
import ContentCopyRounded from "@mui/icons-material/ContentCopyRounded";
import Crop169Rounded from "@mui/icons-material/Crop169Rounded";
import DeleteRounded from "@mui/icons-material/DeleteRounded";
import EmojiEmotionsRounded from "@mui/icons-material/EmojiEmotionsRounded";
import FavoriteRounded from "@mui/icons-material/FavoriteRounded";
import ForumRounded from "@mui/icons-material/ForumRounded";
import GroupsRounded from "@mui/icons-material/GroupsRounded";
import ImageRounded from "@mui/icons-material/ImageRounded";
import LayersRounded from "@mui/icons-material/LayersRounded";
import MoreHorizRounded from "@mui/icons-material/MoreHorizRounded";
import MovieRounded from "@mui/icons-material/MovieRounded";
import NorthEastRounded from "@mui/icons-material/NorthEastRounded";
import PhoneRounded from "@mui/icons-material/PhoneRounded";
import PersonAddAlt1Rounded from "@mui/icons-material/PersonAddAlt1Rounded";
import PersonRemoveRounded from "@mui/icons-material/PersonRemoveRounded";
import PlayCircleRounded from "@mui/icons-material/PlayCircleRounded";
import SaveRounded from "@mui/icons-material/SaveRounded";
import SearchRounded from "@mui/icons-material/SearchRounded";
import ScheduleRounded from "@mui/icons-material/ScheduleRounded";
import SendRounded from "@mui/icons-material/SendRounded";
import SettingsRounded from "@mui/icons-material/SettingsRounded";
import TextFieldsRounded from "@mui/icons-material/TextFieldsRounded";
import TuneRounded from "@mui/icons-material/TuneRounded";
import UndoRounded from "@mui/icons-material/UndoRounded";
import VideocamOutlined from "@mui/icons-material/VideocamOutlined";
import VideocamRounded from "@mui/icons-material/VideocamRounded";
import {
  clearStoredToken,
  addUsersToChatRoom,
  createChatRoom,
  createComment,
  createCallSession,
  createPost,
  fetchCurrentUser,
  fetchChatContacts,
  fetchChatMessages,
  fetchChatUsers,
  fetchComments,
  fetchFeed,
  fetchHealth,
  fetchLiveIndex,
  fetchNotifications,
  fetchProfile,
  getGoogleAuthUrl,
  loginAccount,
  logoutAccount,
  markNotificationsRead,
  rateLiveRoom,
  registerAccount,
  sendChatMessage,
  storeToken,
  updatePost,
  updateProfile,
  uploadMedia,
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
  type Notification,
  type PostInput,
  type ProfileResponse,
} from "./api";

type AuthMode = "login" | "register";
type HomeTab = "home" | "streams" | "messages" | "studio" | "profiles";
type ProfileView = "profile" | "settings";
type ThemeName = "default" | "dark" | "beautiful" | "blueish" | "greenish" | "whiteish";
type StudioTool = "media" | "adjust" | "text" | "layers" | "timeline" | "publish";
type FeedMode = "Local" | "Global" | "Trend";

type DisplayPost = FeedPost & {
  comments: number;
  gallery: string[];
  likes: number;
  promotionScore: number;
  tags: string[];
};

const bottomTabs: Array<{ id: HomeTab; label: string; icon: string }> = [
  { id: "home", label: "Home", icon: "home" },
  { id: "streams", label: "Live", icon: "streams" },
  { id: "messages", label: "Chat", icon: "messages" },
  { id: "studio", label: "Studio", icon: "studio" },
  { id: "profiles", label: "Me", icon: "profiles" },
];

const themeOptions: Array<{
  id: ThemeName;
  label: string;
  caption: string;
  swatches: [string, string, string];
}> = [
    {
      id: "default",
      label: "Default",
      caption: "Night sky blue",
      swatches: ["#79a7ff", "#1a2951", "#090f1d"],
    },
    {
      id: "dark",
      label: "Dark",
      caption: "Classic dark mood",
      swatches: ["#ff5b7e", "#1b2230", "#0d111a"],
    },
    {
      id: "beautiful",
      label: "Beautiful",
      caption: "Neon dusk glow",
      swatches: ["#ff8e68", "#ff4d86", "#2d234f"],
    },
    {
      id: "blueish",
      label: "Blueish",
      caption: "Cool electric blue",
      swatches: ["#60c7ff", "#3467ff", "#102347"],
    },
    {
      id: "greenish",
      label: "Greenish",
      caption: "Emerald aurora",
      swatches: ["#65f2c4", "#1fb28f", "#0f2630"],
    },
    {
      id: "whiteish",
      label: "Whiteish",
      caption: "Smoke white",
      swatches: ["#ffffff", "#e5e7eb", "#cdd3dc"],
    },
  ];

const THEME_STORAGE_KEY = "creators-theme";
const quickEmoji = [":sparkles:", ":fire:", ":heart:", ":raised_hands:", ":zap:"];

type StudioDraft = {
  body: string;
  mood: string;
  mediaUrl: string;
  mediaType: "image" | "video";
  filterName: string;
  overlayText: string;
  sticker: string;
  textColor: string;
  backgroundTone: string;
  aspectRatio: string;
  cropZoom: number;
  cropX: number;
  cropY: number;
  rotation: number;
};

const studioFilters = [
  { name: "Original", css: "none" },
  { name: "Glow", css: "saturate(1.18) contrast(1.06) brightness(1.06)" },
  { name: "Warm", css: "sepia(0.16) saturate(1.22) contrast(1.04)" },
  { name: "Mono", css: "grayscale(1) contrast(1.12)" },
  { name: "Pop", css: "saturate(1.42) contrast(1.12)" },
];

const studioStickers = ["LIVE", "DROP", "NEW", "VIP", "Q&A"];
const studioTextColors = ["#ffffff", "#fff5da", "#d8fff1", "#bfe0ff", "#ffb8cf"];
const studioTones = [
  { id: "midnight", label: "Midnight" },
  { id: "sunset", label: "Sunset" },
  { id: "emerald", label: "Emerald" },
  { id: "violet", label: "Violet" },
];
const studioAspectRatios = ["4:5", "1:1", "9:16", "16:9"];
const studioTools: Array<{ id: StudioTool; label: string; icon: ReactNode }> = [
  { id: "media", label: "Media", icon: <ImageRounded /> },
  { id: "adjust", label: "Adjust", icon: <TuneRounded /> },
  { id: "text", label: "Text", icon: <TextFieldsRounded /> },
  { id: "layers", label: "Layers", icon: <LayersRounded /> },
  { id: "timeline", label: "Timeline", icon: <MovieRounded /> },
  { id: "publish", label: "Publish", icon: <SendRounded /> },
];
const studioTimelineTicks = ["00:00", "00:03", "00:06", "00:09", "00:12", "00:15"];

function createStudioDraft(): StudioDraft {
  return {
    body: "",
    mood: "Behind the scenes",
    mediaUrl: "",
    mediaType: "image",
    filterName: studioFilters[0].name,
    overlayText: "New drop",
    sticker: studioStickers[0],
    textColor: studioTextColors[0],
    backgroundTone: studioTones[0].id,
    aspectRatio: studioAspectRatios[0],
    cropZoom: 1,
    cropX: 50,
    cropY: 50,
    rotation: 0,
  };
}

const featureRows = [
  {
    title: "Sell the first drop",
    body: "Publish a gated launch, collect members, and keep the audience in one owned workspace.",
  },
  {
    title: "Keep the studio synced",
    body: "The web app checks the Go service directly, so auth and service status stay honest.",
  },
  {
    title: "Bring social sign-in",
    body: "Email accounts and Google OAuth share the same backend session contract.",
  },
];

export default function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode | null>(null);
  const [notice, setNotice] = useState("");
  const [sessionLoading, setSessionLoading] = useState(true);
  const [theme, setTheme] = useState<ThemeName>(() => {
    if (typeof window === "undefined") {
      return "default";
    }
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeName(stored) ? stored : "default";
  });

  async function refreshHealth() {
    try {
      setHealth(await fetchHealth());
    } catch {
      setHealth(null);
    }
  }

  async function refreshSession() {
    setSessionLoading(true);
    try {
      setUser(await fetchCurrentUser());
    } catch {
      clearStoredToken();
      setUser(null);
    } finally {
      setSessionLoading(false);
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthToken = params.get("auth_token");
    const oauthError = params.get("auth_error");

    if (oauthToken) {
      storeToken(oauthToken);
      setNotice("Google sign-in complete.");
    }
    if (oauthError) {
      setNotice(oauthError.replace(/_/g, " "));
    }
    if (oauthToken || oauthError || params.get("auth")) {
      window.history.replaceState({}, "", window.location.pathname);
    }

    void refreshHealth();
    void refreshSession();
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  async function handleLogout() {
    await logoutAccount();
    setUser(null);
    setNotice("Signed out.");
  }

  const serviceLabel = useMemo(() => {
    if (!health) {
      return "Backend connecting";
    }
    return health.status === "ok" ? "Backend live" : "Backend degraded";
  }, [health]);

  if (user) {
    return (
      <HomeApp
        health={health}
        notice={notice}
        onThemeChange={setTheme}
        serviceLabel={serviceLabel}
        theme={theme}
        user={user}
        onDismissNotice={() => setNotice("")}
        onLogout={() => void handleLogout()}
      />
    );
  }

  return (
    <main className="site-shell">
      <header className="topbar" aria-label="Main navigation">
        <a className="brand" href="/">
          <span className="brand-mark" aria-hidden="true">C</span>
          <span>Creators</span>
        </a>

        <div className="nav-actions">
          <button className="ghost-button" type="button" onClick={() => setAuthMode("login")}>
            Log in
          </button>
          <button className="solid-button" type="button" onClick={() => setAuthMode("register")}>
            Register
          </button>
        </div>
      </header>

      <section className="hero-section">
        <div className="hero-shade" />
        <div className="hero-copy">
          <p className="eyebrow">Creator commerce, memberships, and launches</p>
          <h1>Creators</h1>
          <p className="hero-line">A studio-grade home for turning an audience into an owned business.</p>
          <div className="hero-actions">
            <button className="solid-button large" type="button" onClick={() => setAuthMode("register")}>
              Start your studio
            </button>
            <button className="glass-button large" type="button" onClick={() => setAuthMode("login")}>
              Sign in
            </button>
          </div>
          <div className="service-strip" aria-live="polite">
            <span className={health?.status === "ok" ? "status-dot is-up" : "status-dot"} />
            <span>{serviceLabel}</span>
            <span>{health ? `API ${health.checks.postgres}/${health.checks.redis}/${health.checks.minio}` : "Waiting for API"}</span>
          </div>
        </div>
      </section>

      <section className="studio-section" aria-label="Studio promise">
        <div>
          <p className="section-kicker">Built for the first thousand true fans</p>
          <h2>Register, sign in, and come back to the same backend-owned account.</h2>
        </div>
        <div className="feature-list">
          {featureRows.map((feature) => (
            <article className="feature-row" key={feature.title}>
              <h3>{feature.title}</h3>
              <p>{feature.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="conversion-section">
        <div>
          <p className="section-kicker">Authentication ready</p>
          <h2>Your entry point is now the auth landing page.</h2>
        </div>
        <div className="conversion-actions">
          <button className="solid-button" type="button" onClick={() => setAuthMode("register")}>
            Create account
          </button>
          <button className="ghost-button on-light" type="button" onClick={() => setAuthMode("login")}>
            I already have one
          </button>
        </div>
      </section>

      {notice ? (
        <div className="toast" role="status">
          {notice}
          <button type="button" aria-label="Dismiss message" onClick={() => setNotice("")}>
            x
          </button>
        </div>
      ) : null}

      {authMode ? (
        <AuthDialog
          mode={authMode}
          sessionLoading={sessionLoading}
          onClose={() => setAuthMode(null)}
          onModeChange={setAuthMode}
          onAuthenticated={(nextUser) => {
            setUser(nextUser);
            setAuthMode(null);
            setNotice(`Signed in as ${nextUser.name}.`);
          }}
          onNotice={setNotice}
        />
      ) : null}
    </main>
  );
}

function HomeApp({
  health,
  notice,
  onThemeChange,
  serviceLabel,
  theme,
  user,
  onDismissNotice,
  onLogout,
}: {
  health: HealthResponse | null;
  notice: string;
  onThemeChange: (theme: ThemeName) => void;
  serviceLabel: string;
  theme: ThemeName;
  user: AuthUser;
  onDismissNotice: () => void;
  onLogout: () => void;
}) {
  const [activeTab, setActiveTab] = useState<HomeTab>("home");
  const [chatContacts, setChatContacts] = useState<ChatContact[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatUsers, setChatUsers] = useState<ChatUser[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [feedError, setFeedError] = useState("");
  const [feedMode, setFeedMode] = useState<FeedMode>("Trend");
  const [followCounts, setFollowCounts] = useState<Record<string, number>>({});
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});
  const [editingPost, setEditingPost] = useState<DisplayPost | null>(null);
  const [liveIndex, setLiveIndex] = useState<LiveIndex | null>(null);
  const [liveRooms, setLiveRooms] = useState<LiveRoom[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [activeCall, setActiveCall] = useState<CallSession | null>(null);
  const [callStatus, setCallStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [profileView, setProfileView] = useState<ProfileView>("profile");
  const [selectedProfilePost, setSelectedProfilePost] = useState<DisplayPost | null>(null);
  const [selectedLiveId, setSelectedLiveId] = useState<number | null>(null);
  const [selectedThreadId, setSelectedThreadId] = useState("");

  const displayPosts = useMemo(() => createDisplayPosts(posts), [posts]);
  const homePosts = useMemo(() => {
    const sorted = [...displayPosts];
    if (feedMode === "Local") {
      return sorted.sort((left, right) => {
        const leftOwn = left.author.id === user.id ? 1 : 0;
        const rightOwn = right.author.id === user.id ? 1 : 0;
        return rightOwn - leftOwn || new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
      });
    }
    if (feedMode === "Global") {
      return sorted.sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
    }
    return sorted.sort((left, right) => right.promotionScore - left.promotionScore || new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
  }, [displayPosts, feedMode, user.id]);
  const selectedLive = liveRooms.find((room) => room.id === selectedLiveId) ?? liveRooms[0] ?? null;
  const ratingsByLiveId = useMemo(() => {
    const ratings = new Map<number, LiveRating>();
    liveIndex?.ratings.forEach((rating) => ratings.set(rating.liveRoomId, rating));
    return ratings;
  }, [liveIndex]);

  async function loadFeed() {
    setLoading(true);
    setFeedError("");
    try {
      const [feed, nextLiveIndex, nextProfile, nextContacts, nextChatUsers, nextNotifications] = await Promise.all([
        fetchFeed(),
        fetchLiveIndex(),
        fetchProfile(),
        fetchChatContacts(),
        fetchChatUsers(),
        fetchNotifications(),
      ]);
      setLiveRooms(feed.liveRooms);
      setPosts(feed.posts);
      setLiveIndex(nextLiveIndex);
      setProfile(nextProfile);
      setChatContacts(nextContacts);
      setChatUsers(nextChatUsers);
      setNotifications(nextNotifications);

      const nextThreadId = nextContacts.some((contact) => contact.id === selectedThreadId)
        ? selectedThreadId
        : nextContacts[0]?.id ?? "";
      setSelectedThreadId(nextThreadId);
      setChatMessages(nextThreadId ? await fetchChatMessages(nextThreadId) : []);
    } catch (err) {
      setFeedError(err instanceof Error ? err.message : "Could not load feed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadFeed();
  }, []);

  function openStream(room: LiveRoom) {
    setSelectedLiveId(room.id);
    setActiveTab("streams");
  }

  function followKey(value: string) {
    return value.trim().toLowerCase();
  }

  function isFollowing(value: string) {
    return Boolean(followingMap[followKey(value)]);
  }

  function followersFor(value: string) {
    const key = followKey(value);
    return followCounts[key] ?? 1200 + indexFor(value, 8200);
  }

  function toggleFollow(value: string) {
    const key = followKey(value);
    setFollowingMap((current) => {
      const next = !current[key];
      setFollowCounts((counts) => ({
        ...counts,
        [key]: Math.max(1, (counts[key] ?? 1200 + indexFor(value, 8200)) + (next ? 1 : -1)),
      }));
      return { ...current, [key]: next };
    });
  }

  async function loadPostComments(postId: number) {
    setComments(await fetchComments("post", postId));
  }

  async function addPostComment(postId: number, body: string) {
    const comment = await createComment({ targetType: "post", targetId: postId, body });
    setComments((current) => [...current, comment]);
  }

  async function loadLiveComments(liveId: number) {
    setComments(await fetchComments("live", liveId));
  }

  async function addLiveComment(liveId: number, body: string) {
    const comment = await createComment({ targetType: "live", targetId: liveId, body });
    setComments((current) => [...current, comment]);
  }

  async function updateLiveRating(liveRoomId: number, score: number) {
    const rating = await rateLiveRoom({ liveRoomId, score });
    setLiveIndex((current) => {
      if (!current) {
        return current;
      }
      const ratings = current.ratings.filter((item) => item.liveRoomId !== liveRoomId);
      return { ...current, ratings: [...ratings, rating] };
    });
  }

  async function openThread(contactId: string) {
    setSelectedThreadId(contactId);
    setChatMessages(await fetchChatMessages(contactId));
  }

  async function createDirectChat(participantId: number) {
    const room = await createChatRoom({ type: "direct", participantIds: [participantId] });
    setChatContacts(await fetchChatContacts());
    await openThread(room.id);
  }

  async function createGroupChat(title: string, participantIds: number[]) {
    const room = await createChatRoom({ type: "group", title, participantIds });
    setChatContacts(await fetchChatContacts());
    await openThread(room.id);
  }

  async function addUsersToSelectedChat(participantIds: number[]) {
    if (!selectedThreadId) {
      return;
    }
    await addUsersToChatRoom({ roomId: selectedThreadId, participantIds });
    setChatContacts(await fetchChatContacts());
  }

  async function sendMessage(body: string) {
    if (!selectedThreadId) {
      return;
    }
    const message = await sendChatMessage({ contactId: selectedThreadId, body });
    setChatMessages((current) => [...current, message]);
    setChatContacts(await fetchChatContacts());
  }

  async function saveProfile(input: { name: string; bio: string; headline: string; location: string; avatarUrl?: string; coverUrl?: string; websiteUrl?: string }) {
    const nextProfile = await updateProfile(input);
    setProfile(nextProfile);
    setPosts((current) => current.map((post) => (post.author.id === nextProfile.user.id ? { ...post, author: nextProfile.user } : post)));
  }

  async function publishStudioPost(input: PostInput) {
    const post = await createPost(input);
    setPosts((current) => [post, ...current.filter((item) => item.id !== post.id)]);
    setNotifications(await fetchNotifications());
    return post;
  }

  async function updateStudioPost(postId: number, input: PostInput) {
    const post = await updatePost(postId, input);
    setPosts((current) => current.map((item) => (item.id === post.id ? post : item)));
    setNotifications(await fetchNotifications());
    return post;
  }

  async function uploadStudioFile(file: File) {
    return uploadMedia(file);
  }

  async function openNotifications() {
    setNotificationOpen((value) => !value);
    if (!notificationOpen) {
      await markNotificationsRead();
      setNotifications(await fetchNotifications());
    }
  }

  async function startThreadCall(mode: "voice" | "video") {
    if (!selectedThreadId) {
      setCallStatus("Open a chat first.");
      return;
    }
    setCallStatus(`Starting ${mode} call...`);
    try {
      const call = await createCallSession({ roomId: selectedThreadId, mode });
      setActiveCall(call);
      setCallStatus(`${mode === "video" ? "Video" : "Voice"} call room #${call.id} is ready.`);
      setNotifications(await fetchNotifications());
    } catch (err) {
      setCallStatus(err instanceof Error ? err.message : "Could not start call.");
    }
  }

  async function startLiveMeeting(room: LiveRoom, mode: "voice" | "video") {
    const roomId = selectedThreadId || chatContacts[0]?.id || "";
    if (!roomId) {
      setCallStatus("Create a chat room before starting a live meeting.");
      setActiveTab("messages");
      return;
    }

    setCallStatus(`Opening ${mode} room for ${room.title}...`);
    try {
      const call = await createCallSession({ roomId, mode });
      setActiveCall(call);
      setCallStatus(`${mode === "video" ? "Video meeting" : "Voice room"} #${call.id} is ready for ${room.host}.`);
      setNotifications(await fetchNotifications());
    } catch (err) {
      setCallStatus(err instanceof Error ? err.message : "Could not start the live meeting.");
    }
  }

  function changeTab(tab: HomeTab) {
    if (tab === "streams") {
      setSelectedLiveId(null);
    }
    if (tab === "profiles") {
      setProfileView("profile");
    }
    setActiveTab(tab);
  }

  return (
    <main className="social-shell">
      {selectedProfilePost || editingPost ? null : (
        <DesktopSidebar
          activeTab={activeTab}
          health={health}
          notificationCount={notifications.filter((notification) => !notification.readAt).length}
          onTabChange={changeTab}
          user={profile?.user ?? user}
        />
      )}
      <section className="phone-frame">
        {editingPost ? (
          <PostEditPanel
            post={editingPost}
            onBack={() => setEditingPost(null)}
            onSave={updateStudioPost}
            onShareHome={() => {
              setEditingPost(null);
              setActiveTab("home");
            }}
          />
        ) : selectedProfilePost ? (
          <PublicProfileScreen
            post={selectedProfilePost}
            onBack={() => setSelectedProfilePost(null)}
            chatUsers={chatUsers}
            onOpenPost={setSelectedProfilePost}
            posts={displayPosts}
          />
        ) : activeTab === "home" ? (
          <>
            <StoryHeader
              liveRooms={liveRooms}
              notificationCount={notifications.filter((notification) => !notification.readAt).length}
              notifications={notifications}
              notificationOpen={notificationOpen}
              onOpenNotifications={() => void openNotifications()}
              onCreateStory={() => changeTab("studio")}
              onFeedModeChange={setFeedMode}
              onOpenMessages={() => changeTab("messages")}
              onOpenProfile={() => changeTab("profiles")}
              onOpenStream={openStream}
              feedMode={feedMode}
              user={user}
            />
            {feedError ? <p className="feed-error">{feedError}</p> : null}
            <HomeFeed
              comments={comments}
              isFollowing={isFollowing}
              loading={loading}
              onAddComment={addPostComment}
              onLoadComments={loadPostComments}
              onOpenProfile={setSelectedProfilePost}
              onToggleFollow={toggleFollow}
              posts={homePosts}
            />
          </>
        ) : null}

        {activeTab === "streams" ? (
          <StreamScreen
            comments={comments}
            liveIndex={liveIndex}
            liveRooms={liveRooms}
            onAddComment={addLiveComment}
            onClose={() => setActiveTab("home")}
            onLoadComments={loadLiveComments}
            onOpenStream={openStream}
            onRate={updateLiveRating}
            onStartLiveCall={startLiveMeeting}
            onToggleFollow={toggleFollow}
            ratingsByLiveId={ratingsByLiveId}
            selectedLive={selectedLive}
            followersFor={followersFor}
            isFollowing={isFollowing}
            activeCall={activeCall}
            callStatus={callStatus}
          />
        ) : null}

        {activeTab === "messages" ? (
          <SearchMessages
            chatUsers={chatUsers}
            contacts={chatContacts}
            messages={chatMessages}
            onAddUsersToRoom={addUsersToSelectedChat}
            onCreateDirectChat={createDirectChat}
            onCreateGroupChat={createGroupChat}
            onOpenProfile={() => changeTab("profiles")}
            onOpenThread={openThread}
            onSendMessage={sendMessage}
            onStartCall={startThreadCall}
            onToggleFollow={toggleFollow}
            selectedThreadId={selectedThreadId}
            activeCall={activeCall}
            callStatus={callStatus}
            isFollowing={isFollowing}
          />
        ) : null}

        {activeTab === "studio" ? (
          <StudioPanel onCreatePost={publishStudioPost} onUploadMedia={uploadStudioFile} posts={displayPosts} serviceLabel={serviceLabel} />
        ) : null}

        {activeTab === "profiles" && profileView === "profile" ? (
          <ProfilePanel
            health={health}
            chatUsers={chatUsers}
            onEditPost={setEditingPost}
            onLogout={onLogout}
            onOpenSettings={() => setProfileView("settings")}
            onOpenPost={setSelectedProfilePost}
            onStartCreating={() => changeTab("studio")}
            posts={displayPosts}
            profile={profile}
            user={profile?.user ?? user}
            followersCount={followersFor(user.name)}
            followingCount={Object.values(followingMap).filter(Boolean).length + 42}
          />
        ) : null}

        {activeTab === "profiles" && profileView === "settings" ? (
          <ProfileSettingsPanel
            onBack={() => setProfileView("profile")}
            onLogout={onLogout}
            onSaveProfile={saveProfile}
            onUploadMedia={uploadStudioFile}
            profile={profile}
            theme={theme}
            themes={themeOptions}
            onThemeChange={onThemeChange}
            user={profile?.user ?? user}
          />
        ) : null}

        {selectedProfilePost || editingPost ? null : <BottomNav activeTab={activeTab} onTabChange={changeTab} />}
      </section>

      {notice ? (
        <div className="toast" role="status">
          {notice}
          <button type="button" aria-label="Dismiss message" onClick={onDismissNotice}>
            x
          </button>
        </div>
      ) : null}
    </main>
  );
}

function StoryHeader({
  feedMode,
  liveRooms,
  notificationCount,
  notificationOpen,
  notifications,
  onCreateStory,
  onFeedModeChange,
  onOpenMessages,
  onOpenNotifications,
  onOpenProfile,
  onOpenStream,
  user,
}: {
  feedMode: FeedMode;
  liveRooms: LiveRoom[];
  notificationCount: number;
  notificationOpen: boolean;
  notifications: Notification[];
  onCreateStory: () => void;
  onFeedModeChange: (mode: FeedMode) => void;
  onOpenMessages: () => void;
  onOpenNotifications: () => void;
  onOpenProfile: () => void;
  onOpenStream: (room: LiveRoom) => void;
  user: AuthUser;
}) {
  return (
    <header className="home-highlight" aria-label="Home highlight">
      <div className="highlight-topbar">
        <a className="highlight-brand" href="/" aria-label="Creators home">
          <span className="highlight-logo">C</span>
          <strong>Creators</strong>
        </a>
        <div className="highlight-actions">
          <button type="button" aria-label="Search" onClick={onOpenMessages}><span className="highlight-icon search" /></button>
          <button type="button" aria-label="Notifications" onClick={onOpenNotifications}>
            <span className="highlight-icon bell" />
            {notificationCount ? <i>{notificationCount}</i> : null}
          </button>
          <button type="button" aria-label="Menu" onClick={onOpenProfile}><span className="highlight-icon menu" /></button>
        </div>
      </div>
      {notificationOpen ? (
        <section className="notification-drawer" aria-label="Notifications">
          {notifications.length ? notifications.slice(0, 5).map((notification) => (
            <article key={notification.id}>
              <strong>{notification.title}</strong>
              <span>{notification.body}</span>
            </article>
          )) : <p>No notifications yet.</p>}
        </section>
      ) : null}

      <div className="story-header" aria-label="Live streaming channels and users">
        <button className="send-bubble" type="button" aria-label="Create" onClick={onCreateStory}>
          <span>+</span>
          <small>Add story</small>
        </button>
        {liveRooms.map((room, index) => (
          <button className="story-avatar" key={room.id} type="button" onClick={() => onOpenStream(room)}>
            <span className="story-photo">
              <img alt={`${room.host} profile`} src={profileImageFor(room.host)} />
            </span>
            {index === 0 ? <strong>LIVE</strong> : null}
            <small>{firstName(room.host)}</small>
          </button>
        ))}
        <button className="story-avatar" type="button" onClick={onOpenProfile}>
          <span className="story-photo">
            <img alt={`${user.name} profile`} src={profileImageFor(user.name)} />
          </span>
          <small>{firstName(user.name)}</small>
        </button>
      </div>

      <nav className="feed-filter" aria-label="Feed visibility filters">
        {(["Local", "Global", "Trend"] as const).map((mode) => (
          <button className={feedMode === mode ? "active" : ""} key={mode} type="button" onClick={() => onFeedModeChange(mode)}>
            {mode}
          </button>
        ))}
      </nav>
    </header>
  );
}

function HomeFeed({
  comments,
  isFollowing,
  loading,
  onAddComment,
  onLoadComments,
  onOpenProfile,
  onToggleFollow,
  posts,
}: {
  comments: Comment[];
  isFollowing: (name: string) => boolean;
  loading: boolean;
  onAddComment: (postId: number, body: string) => Promise<void>;
  onLoadComments: (postId: number) => Promise<void>;
  onOpenProfile: (post: DisplayPost) => void;
  onToggleFollow: (name: string) => void;
  posts: DisplayPost[];
}) {
  if (loading) {
    return <p className="feed-muted">Loading the home feed...</p>;
  }

  return (
    <section className="home-feed" aria-label="Home feed">
      {posts.map((post) => (
        <FeedCard comments={comments.filter((comment) => comment.targetType === "post" && comment.targetId === post.id)} isFollowing={isFollowing(post.author.name)} key={post.id} onAddComment={onAddComment} onLoadComments={onLoadComments} onOpenProfile={onOpenProfile} onToggleFollow={onToggleFollow} post={post} />
      ))}
    </section>
  );
}

function EmojiText({ className, text }: { className?: string; text: string }) {
  return <span className={className}>{ReactEmoji.emojify(text, { attributes: { width: "18px", height: "18px" } }) as ReactNode}</span>;
}

function FollowPill({ following, onClick }: { following: boolean; onClick: () => void }) {
  return (
    <Button
      onClick={onClick}
      size="small"
      startIcon={following ? <PersonRemoveRounded /> : <PersonAddAlt1Rounded />}
      sx={{
        borderRadius: "999px",
        px: 1.5,
        py: 0.5,
        fontWeight: 800,
        color: "#fff",
        background: following ? "rgba(255,255,255,0.12)" : "linear-gradient(135deg, var(--accent), var(--accent-2))",
        border: following ? "1px solid rgba(255,255,255,0.22)" : "none",
        backdropFilter: "blur(12px)",
      }}
      variant="contained"
    >
      {following ? "Following" : "Follow"}
    </Button>
  );
}

function EmojiComposer({
  onSubmit,
  placeholder,
}: {
  onSubmit: (value: string) => Promise<void> | void;
  placeholder: string;
}) {
  const [value, setValue] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!value.trim()) {
      return;
    }
    await onSubmit(value);
    setValue("");
  }

  return (
    <form className="mt-3 flex flex-col gap-2" onSubmit={(event) => void submit(event)}>
      <Paper
        elevation={0}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          px: 1.25,
          py: 0.5,
          borderRadius: "18px",
          background: "color-mix(in srgb, var(--surface-2) 76%, transparent)",
          border: "1px solid var(--line-soft)",
        }}
      >
        <EmojiEmotionsRounded sx={{ color: "var(--accent)", fontSize: 20 }} />
        <InputBase
          placeholder={placeholder}
          sx={{ color: "var(--text-1)", flex: 1, fontSize: 14 }}
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
        <IconButton sx={{ color: "var(--accent)" }} type="submit">
          <SendRounded fontSize="small" />
        </IconButton>
      </Paper>
      <div className="flex flex-wrap gap-2">
        {quickEmoji.map((emoji) => (
          <Chip
            key={emoji}
            label={<EmojiText text={emoji} />}
            onClick={() => setValue((current) => `${current}${current ? " " : ""}${emoji}`)}
            size="small"
            sx={{
              color: "var(--text-2)",
              background: "var(--chip-bg)",
              border: "1px solid var(--line-soft)",
              borderRadius: "999px",
            }}
            variant="outlined"
          />
        ))}
      </div>
    </form>
  );
}

function FeedCard({
  comments,
  isFollowing,
  onAddComment,
  onLoadComments,
  onOpenProfile,
  onToggleFollow,
  post,
}: {
  comments: Comment[];
  isFollowing: boolean;
  onAddComment: (postId: number, body: string) => Promise<void>;
  onLoadComments: (postId: number) => Promise<void>;
  onOpenProfile: (post: DisplayPost) => void;
  onToggleFollow: (name: string) => void;
  post: DisplayPost;
}) {
  const [promoted, setPromoted] = useState(false);
  const [promoteCount, setPromoteCount] = useState(post.likes);
  const [open, setOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareStatus, setShareStatus] = useState("");
  const imageFilter = webFilterFor(post.filterName);
  const primaryMedia = post.gallery[0] ?? post.mediaUrl;

  function promotePost() {
    setPromoted((current) => {
      setPromoteCount((count) => count + (current ? -1 : 1));
      return !current;
    });
  }

  async function shareToProfile() {
    setShareStatus("Sharing...");
    try {
      await createPost({
        body: `Sharing ${post.author.name}'s post: ${post.body}`,
        mood: post.mood,
        mediaUrl: post.mediaUrl || primaryMedia,
        filterName: post.filterName,
        overlayText: post.overlayText,
        sticker: post.sticker,
        textColor: post.textColor,
        backgroundTone: post.backgroundTone,
        aspectRatio: post.aspectRatio,
      });
      setShareStatus("Shared to your profile.");
    } catch (err) {
      setShareStatus(err instanceof Error ? err.message : "Could not share to profile.");
    }
  }

  async function shareOutsideApp() {
    const shareUrl = `${window.location.origin}/?post=${post.id}`;
    const shareText = `${post.author.name} on Creators: ${post.body}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: `${post.author.name} on Creators`,
          text: shareText,
          url: shareUrl,
        });
        setShareStatus("Share sheet opened.");
        return;
      }
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      setShareStatus("Link copied for external sharing.");
    } catch (err) {
      setShareStatus(err instanceof Error ? err.message : "External share was cancelled.");
    }
  }

  return (
    <article className="feed-card">
      <div className="photo-grid">
        {!primaryMedia ? (
          <div className="photo-grid-main media-placeholder">Media will appear here after upload.</div>
        ) : post.mediaType === "video" ? (
          <video
            autoPlay
            className="photo-grid-main"
            loop
            muted
            playsInline
            src={primaryMedia}
            style={{
              filter: imageFilter,
              objectPosition: `${post.cropX || 50}% ${post.cropY || 50}%`,
              transform: `scale(${post.cropZoom || 1}) rotate(${post.rotation || 0}deg)`,
            }}
          />
        ) : (
          <img
            className="photo-grid-main"
            alt=""
            src={primaryMedia}
            style={{
              filter: imageFilter,
              objectPosition: `${post.cropX || 50}% ${post.cropY || 50}%`,
              transform: `scale(${post.cropZoom || 1}) rotate(${post.rotation || 0}deg)`,
            }}
          />
        )}
        {post.gallery.slice(1, 5).map((image, index) => (
          <div className="photo-tile" key={image}>
            <img alt="" src={image} />
            {index === 3 ? <span>+23</span> : null}
          </div>
        ))}

        {post.overlayText || post.sticker ? (
          <div className={`feed-creative-layer tone-${post.backgroundTone || "midnight"}`}>
            {post.sticker ? <span className="feed-sticker">{post.sticker}</span> : null}
            {post.overlayText ? <strong style={{ color: post.textColor || "#ffffff" }}>{post.overlayText}</strong> : null}
          </div>
        ) : null}

        <div className="feed-image-shade" />
        <header className="feed-card-header">
          <button className="feed-profile-trigger" type="button" onClick={() => onOpenProfile(post)} aria-label={`Open ${post.author.name} profile`}>
            <img alt="" src={profileImageFor(post.author.name)} />
            <span>
              <strong>{post.author.name}</strong>
              <small>{timeAgo(post.createdAt)}</small>
            </span>
          </button>
          <FollowPill following={isFollowing} onClick={() => onToggleFollow(post.author.name)} />
        </header>

        <div className="feed-overlay-copy">
          <div className="tag-row">
            {post.tags.map((tag) => (
              <span key={tag}>#{tag}</span>
            ))}
          </div>
          <p className="feed-copy">{post.body}</p>
        </div>

        <footer className="feed-actions">
          <button className={promoted ? "promote active" : "promote"} type="button" aria-label="Promote post" aria-pressed={promoted} onClick={promotePost}>
            <span className="action-icon trend" aria-hidden="true" />
          </button>
          <span>{promoteCount}</span>
          <button className="share-action" type="button" aria-label="Share post" onClick={() => setShareOpen((value) => !value)}>
            <span className="action-icon share" aria-hidden="true" />
          </button>
          <span>{Math.max(0, Math.round(post.likes / 4))}</span>
          <button className="comment" type="button" aria-label="Open comments" onClick={() => { setOpen((value) => !value); void onLoadComments(post.id); }}>
            <span className="action-icon chat" aria-hidden="true" />
          </button>
          <span>{post.comments + comments.length}</span>
          <div className="reader-stack">
            <img alt="" src={profileImageFor(`${post.author.name}-1`)} />
            <img alt="" src={profileImageFor(`${post.author.name}-2`)} />
            <img alt="" src={profileImageFor(`${post.author.name}-3`)} />
          </div>
        </footer>
      </div>

      {shareOpen ? (
        <section className="share-panel" aria-label="Share post">
          <button type="button" onClick={() => void shareToProfile()}>Share to my profile</button>
          <button type="button" onClick={() => void shareOutsideApp()}>Share outside app</button>
          <button type="button" onClick={() => void navigator.clipboard.writeText(`${window.location.origin}/?post=${post.id}`).then(() => setShareStatus("Post link copied."))}>Copy link</button>
          {shareStatus ? <p>{shareStatus}</p> : null}
        </section>
      ) : null}

      {open ? (
        <Collapse in={open}>
          <section className="comment-panel">
            <div className="flex flex-col gap-3">
              {comments.length ? comments.map((comment) => (
                <Paper
                  elevation={0}
                  key={comment.id}
                  sx={{
                    p: 1.25,
                    borderRadius: "16px",
                    background: "color-mix(in srgb, var(--surface-2) 58%, transparent)",
                    border: "1px solid var(--line-soft)",
                  }}
                >
                  <p className="m-0 text-sm font-semibold text-[color:var(--text-1)]">{comment.author.name}</p>
                  <EmojiText className="mt-1 block text-sm text-[color:var(--text-2)]" text={comment.body} />
                </Paper>
              )) : <p className="text-sm text-[color:var(--text-3)]">No comments yet. Start the conversation.</p>}
            </div>
            <EmojiComposer
              placeholder="Drop a thought with emoji"
              onSubmit={async (value) => {
                await onAddComment(post.id, value);
                setOpen(true);
              }}
            />
          </section>
        </Collapse>
      ) : null}
    </article>
  );
}

function StreamScreen({
  activeCall,
  callStatus,
  comments,
  followersFor,
  isFollowing,
  liveIndex,
  liveRooms,
  onAddComment,
  selectedLive,
  onClose,
  onLoadComments,
  onOpenStream,
  onRate,
  onStartLiveCall,
  onToggleFollow,
  ratingsByLiveId,
}: {
  activeCall: CallSession | null;
  callStatus: string;
  comments: Comment[];
  followersFor: (name: string) => number;
  isFollowing: (name: string) => boolean;
  liveIndex: LiveIndex | null;
  liveRooms: LiveRoom[];
  onAddComment: (liveId: number, body: string) => Promise<void>;
  selectedLive: LiveRoom | null;
  onClose: () => void;
  onLoadComments: (liveId: number) => Promise<void>;
  onOpenStream: (room: LiveRoom) => void;
  onRate: (liveRoomId: number, score: number) => Promise<void>;
  onStartLiveCall: (room: LiveRoom, mode: "voice" | "video") => Promise<void>;
  onToggleFollow: (name: string) => void;
  ratingsByLiveId: Map<number, LiveRating>;
}) {
  const live = selectedLive;
  const [fullPlayer, setFullPlayer] = useState(false);
  const [roomActionStatus, setRoomActionStatus] = useState("");
  const spotlightRooms = liveIndex?.live ?? liveRooms;
  const popularHosts = (liveIndex?.following ?? liveRooms).slice(0, 4);
  const followingRooms = liveIndex?.following ?? [];
  const globalRooms = spotlightRooms.filter(r => !followingRooms.find(f => f.id === r.id));

  const categories = [
    { label: "Discovery", active: true },
    { label: "Following" },
    { label: "Trending" },
    { label: "Categories" },
  ];
  const heroRoom = spotlightRooms[0] ?? liveRooms[0] ?? null;

  useEffect(() => {
    if (live) {
      void onLoadComments(live.id);
    }
  }, [live?.id]);

  useEffect(() => {
    if (!live) {
      setFullPlayer(false);
    }
  }, [live]);

  if (!live) {
    return (
      <section className="stream-screen" style={{ backgroundImage: `url("${liveCoverFor(heroRoom)}")` }}>
        <div className="relative z-[2] mx-auto flex min-h-screen w-full max-w-6xl items-center px-3 pb-28 pt-4 md:px-5">
          <Fade in timeout={320}>
            <div className="w-full rounded-[34px] border border-white/10 bg-[color:rgba(8,12,20,0.78)] p-4 text-white shadow-2xl backdrop-blur-xl md:p-6">
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr),320px]">
                <div className="overflow-hidden rounded-[30px] border border-white/10 bg-black/20">
                  <div className="relative">
                    <img alt="" className="aspect-[1.08/1] w-full object-cover" src={liveCoverFor(heroRoom)} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                    <div className="absolute left-4 top-4 flex items-center gap-2">
                      <IconButton className="!bg-black/35 !text-white" onClick={onClose}>
                        <ArrowBackRounded />
                      </IconButton>
                    </div>
                    <div className="absolute inset-x-0 bottom-0 p-5 md:p-7">
                      <p className="m-0 text-sm font-bold uppercase tracking-[0.22em] text-[color:var(--accent-3)]">Creators Live</p>
                      <h1 className="mt-3 max-w-[12ch] text-4xl font-black leading-none md:text-6xl">
                        Your Favorite <span className="text-[color:var(--accent)]">Streams</span>
                      </h1>
                      <p className="mt-4 max-w-xl text-sm leading-6 text-white/70 md:text-base">
                        Discover what is live now, scan popular creators, then tap any stream card to move into the watch room with live chat and reactions.
                      </p>
                      <div className="live-room-shortcuts" aria-label="Live room shortcuts">
                        <button type="button" onClick={() => spotlightRooms[0] ? onOpenStream(spotlightRooms[0]) : undefined}>
                          <VideocamRounded fontSize="small" />
                          Create stream
                        </button>
                        <button type="button" onClick={() => spotlightRooms[0] ? void onStartLiveCall(spotlightRooms[0], "video") : undefined}>
                          <GroupsRounded fontSize="small" />
                          Group call
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <aside className="flex flex-col justify-between rounded-[30px] border border-white/10 bg-black/25 p-4">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      {categories.map((item) => (
                        <Chip
                          key={item.label}
                          label={item.label}
                          sx={{
                            borderRadius: "999px",
                            color: item.active ? "var(--text-dark)" : "#fff",
                            background: item.active ? "linear-gradient(135deg, var(--accent), var(--accent-3))" : "rgba(255,255,255,0.08)",
                            border: item.active ? "none" : "1px solid rgba(255,255,255,0.08)",
                            fontWeight: 700,
                          }}
                        />
                      ))}
                    </div>

                    <div className="mt-6">
                      <div className="mb-3 flex items-center justify-between">
                        <h2 className="text-lg font-black">Following</h2>
                        <IconButton className="!text-white/70">
                          <MoreHorizRounded />
                        </IconButton>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {(followingRooms.length > 0 ? followingRooms : spotlightRooms).slice(0, 4).map((room) => (
                          <button className="group overflow-hidden rounded-[22px] border border-white/8 text-left transition hover:border-[color:var(--accent)]" key={room.id} type="button" onClick={() => onOpenStream(room)}>
                            <div className="relative">
                              <img alt="" className="aspect-[0.78/1] w-full object-cover transition duration-500 group-hover:scale-105" src={liveCoverFor(room)} />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
                              <Chip
                                label={`${compactNumber(room.viewers)} viewers`}
                                size="small"
                                sx={{
                                  position: "absolute",
                                  left: 8,
                                  bottom: 52,
                                  color: "var(--text-dark)",
                                  background: "linear-gradient(135deg, #68f2bf, #c9ff7a)",
                                  fontWeight: 800,
                                }}
                              />
                              <div className="absolute inset-x-0 bottom-0 p-3">
                                <p className="m-0 truncate text-sm font-black text-white">{room.title}</p>
                                <p className="m-0 mt-1 truncate text-[11px] text-white/60">{room.host}</p>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <div className="mb-3 flex items-center justify-between">
                      <h2 className="text-lg font-black">Global Discovery</h2>
                      <IconButton className="!text-white/70">
                        <MoreHorizRounded />
                      </IconButton>
                    </div>
                    <div className="space-y-3">
                      {globalRooms.slice(0, 5).map((room) => (
                        <button className="flex w-full items-center gap-3 rounded-[22px] border border-white/8 bg-white/5 p-3 text-left transition hover:bg-white/10" key={room.id} type="button" onClick={() => onOpenStream(room)}>
                          <Badge color="success" overlap="circular" variant="dot">
                            <Avatar src={profileImageFor(room.host)} />
                          </Badge>
                          <span className="min-w-0 flex-1">
                            <strong className="block truncate text-sm">{room.host}</strong>
                            <small className="block truncate text-xs text-white/55">{compactNumber(followersFor(room.host))} followers</small>
                          </span>
                          <NorthEastRounded sx={{ fontSize: 18, color: "var(--accent)" }} />
                        </button>
                      ))}
                    </div>
                  </div>
                </aside>
              </div>
            </div>
          </Fade>
        </div>
      </section>
    );
  }

  const rating = ratingsByLiveId.get(live.id);
  const liveComments = comments.filter((comment) => comment.targetType === "live" && comment.targetId === live.id);
  const following = isFollowing(live.host);
  const meetingPeople = [live.host, ...spotlightRooms.filter((room) => room.id !== live.id).map((room) => room.host)].slice(0, 5);

  return (
    <section className="stream-screen stream-room-page" style={{ backgroundImage: `url("${liveCoverFor(live)}")` }}>
      <Fade in timeout={320}>
        <div className="live-room-dashboard">
          <aside className="live-room-rail" aria-label="Live room actions">
            <button type="button" onClick={() => onClose()} aria-label="Back to live lobby">
              <ArrowBackRounded />
            </button>
            <button className="active" type="button" onClick={() => setFullPlayer(true)} aria-label="Open large player">
              <PlayCircleRounded />
            </button>
            <button type="button" onClick={() => void onStartLiveCall(live, "video")} aria-label="Start video meeting">
              <VideocamRounded />
            </button>
            <button type="button" onClick={() => void onStartLiveCall(live, "voice")} aria-label="Start voice room">
              <PhoneRounded />
            </button>
            <button type="button" onClick={() => onToggleFollow(live.host)} aria-label="Follow host">
              <FavoriteRounded />
            </button>
          </aside>

          <main className="live-room-main">
            <header className="live-room-header">
              <div>
                <span>{live.status}</span>
                <h1>{live.title}</h1>
                <p>{live.host} hosts {live.topic} - {compactNumber(live.viewers)} watching</p>
              </div>
              <div className="live-room-header-actions">
                <FollowPill following={following} onClick={() => onToggleFollow(live.host)} />
                <button type="button" onClick={() => void onStartLiveCall(live, "video")}>
                  <GroupsRounded fontSize="small" />
                  Add guest
                </button>
              </div>
            </header>

            <div className="live-participant-strip" aria-label="Participants">
              {[live, ...spotlightRooms.filter((room) => room.id !== live.id)].slice(0, 5).map((room) => (
                <button className={room.id === live.id ? "active" : ""} key={room.id} type="button" onClick={() => onOpenStream(room)}>
                  <img alt="" src={liveCoverFor(room)} />
                  <span>{firstName(room.host)}</span>
                  <i />
                </button>
              ))}
            </div>

            <section className="live-stage" aria-label="Live video stage">
              <button className="live-stage-media" type="button" onClick={() => setFullPlayer(true)}>
                <img alt="" src={liveCoverFor(live)} />
              </button>
              <div className="live-stage-top">
                <span className="live-badge"><VideocamRounded fontSize="small" /> Live</span>
                <span>{compactNumber(live.viewers)} viewers</span>
                <span>{elapsedTime(live.startsAt)}</span>
              </div>
              <div className="live-stage-caption">
                <Avatar src={profileImageFor(live.host)} sx={{ width: 48, height: 48 }} />
                <span>
                  <strong>{live.host}</strong>
                  <small>{compactNumber(followersFor(live.host))} followers</small>
                </span>
              </div>
              <div className="live-stage-controls">
                <button type="button" onClick={() => void onStartLiveCall(live, "voice")} aria-label="Voice">
                  <PhoneRounded />
                </button>
                <button className="danger" type="button" onClick={() => onClose()} aria-label="Leave live room">
                  <PhoneRounded />
                </button>
                <button type="button" onClick={() => void onStartLiveCall(live, "video")} aria-label="Video meeting">
                  <VideocamRounded />
                </button>
                <button type="button" onClick={() => void navigator.clipboard?.writeText(`${window.location.origin}/?live=${live.id}`).then(() => setRoomActionStatus("Live link copied."))} aria-label="Copy live link">
                  <NorthEastRounded />
                </button>
              </div>
            </section>

            <div className="live-session-bar">
              <AvatarGroup max={5} sx={{ "& .MuiAvatar-root": { width: 38, height: 38, borderColor: "#181d24" } }}>
                {meetingPeople.map((name) => <Avatar alt={name} key={name} src={profileImageFor(name)} />)}
              </AvatarGroup>
              <div>
                <strong>{activeCall ? `${activeCall.mode} room #${activeCall.id}` : "Creator room"}</strong>
                <span>{roomActionStatus || callStatus || `${live.topic} responses and comments are open.`}</span>
              </div>
              <button type="button" onClick={() => void onStartLiveCall(live, "video")}>Start meeting</button>
            </div>
          </main>

          <aside className="live-room-side">
            <section className="live-response-card">
              <div>
                <strong>Audience response</strong>
                <span>{rating ? `${rating.average.toFixed(1)} average` : "New stream"}</span>
              </div>
              <div className="live-rating-row">
                {[1, 2, 3, 4, 5].map((score) => (
                  <button className={rating?.userScore === score ? "active" : ""} key={score} type="button" onClick={() => void onRate(live.id, score)}>
                    {score}
                  </button>
                ))}
              </div>
            </section>

            <section className="live-pending-card">
              <div>
                <Avatar src={profileImageFor(spotlightRooms.find((room) => room.id !== live.id)?.host ?? live.host)} />
                <span>
                  <strong>{spotlightRooms.find((room) => room.id !== live.id)?.host ?? live.host}</strong>
                  <small>{roomActionStatus || "requested to join"}</small>
                </span>
              </div>
              <div>
                <button type="button" onClick={() => { setRoomActionStatus("Guest admitted to the room."); void onStartLiveCall(live, "video"); }}>Admit</button>
                <button type="button" onClick={() => setRoomActionStatus("Guest request declined.")}>Deny</button>
              </div>
            </section>

            <section className="live-chat-panel">
              <div className="live-side-heading">
                <h2>Comments</h2>
                <AutoAwesomeRounded fontSize="small" />
              </div>
              <div className="live-comment-list">
                {liveComments.slice(-8).map((comment) => (
                  <article key={comment.id}>
                    <strong>{comment.author.name}</strong>
                    <EmojiText text={comment.body} />
                  </article>
                ))}
                {!liveComments.length ? <p>No comments yet. Be the first one in.</p> : null}
              </div>
              <EmojiComposer placeholder="Respond to the room" onSubmit={(value) => onAddComment(live.id, value)} />
            </section>

            <section className="live-schedule-mini">
              <div className="live-side-heading">
                <h2>Up next</h2>
                <ScheduleRounded fontSize="small" />
              </div>
              {(liveIndex?.scheduled ?? []).slice(0, 3).map((room) => (
                <button key={room.id} type="button" onClick={() => onOpenStream(room)}>
                  <span>{room.title}</span>
                  <small>{timeAgo(room.startsAt)}</small>
                </button>
              ))}
            </section>
          </aside>
        </div>
      </Fade>
      {fullPlayer ? (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-black/80 p-4 backdrop-blur-xl">
          <div className="relative w-full max-w-sm overflow-hidden rounded-[40px] border border-white/10 bg-black shadow-2xl">
            <button className="absolute left-4 top-4 z-[2] grid h-10 w-10 place-items-center rounded-full bg-black/40 text-white" type="button" onClick={() => setFullPlayer(false)}>
              <ArrowBackRounded />
            </button>
            <img alt="" className="aspect-[0.57/1] w-full object-cover" src={liveCoverFor(live)} />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-5 text-white">
              <p className="m-0 text-xs font-black uppercase tracking-[0.2em] text-[color:var(--accent-3)]">Now Watching</p>
              <h2 className="mt-2 text-3xl font-black leading-tight">{live.title}</h2>
              <p className="mt-2 text-sm text-white/70">{live.host}</p>
              <div className="mt-4 flex items-center gap-2">
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold">{compactNumber(live.viewers)} viewers</span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold">{rating ? `${rating.average.toFixed(1)} rating` : "New stream"}</span>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function SearchMessages({
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

function StudioPanel({
  onCreatePost,
  onUploadMedia,
  posts,
  serviceLabel,
}: {
  onCreatePost: (input: PostInput) => Promise<FeedPost>;
  onUploadMedia: (file: File) => Promise<{ url: string; mediaType: "image" | "video" | string }>;
  posts: DisplayPost[];
  serviceLabel: string;
}) {
  const [draft, setDraft] = useState<StudioDraft>(() => createStudioDraft());
  const [activeTool, setActiveTool] = useState<StudioTool>("media");
  const [creationMode, setCreationMode] = useState<"post" | "collab" | "live">("post");
  const [publishing, setPublishing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [publishStatus, setPublishStatus] = useState("");
  const topPosts = posts.slice(0, 3);
  const topBoost = topPosts[0]?.promotionScore ?? 0;
  const totalReach = topPosts.reduce((total, post) => total + post.likes + post.comments, 0);
  const selectedFilter = studioFilters.find((filter) => filter.name === draft.filterName) ?? studioFilters[0];
  const selectedTone = studioTones.find((tone) => tone.id === draft.backgroundTone) ?? studioTones[0];
  const activeToolLabel = studioTools.find((tool) => tool.id === activeTool)?.label ?? "Media";
  const libraryItems = Array.from(new Set(posts.flatMap((post) => post.gallery))).filter(Boolean);

  function updateDraft<K extends keyof StudioDraft>(key: K, value: StudioDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function submitPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.body.trim() || publishing) {
      return;
    }
    if (creationMode === "live") {
      setActiveTool("publish");
      setPublishStatus("Live setup is ready. Open the Live tab to start the stream room.");
      return;
    }

    setPublishing(true);
    setPublishStatus(creationMode === "collab" ? "Publishing mutual post..." : "Publishing...");
    try {
      const post = await onCreatePost({
        body: draft.body,
        mood: creationMode === "collab" ? `${draft.mood} collab` : draft.mood,
        mediaUrl: draft.mediaUrl,
        mediaType: draft.mediaType,
        filterName: draft.filterName,
        overlayText: draft.overlayText,
        sticker: draft.sticker,
        textColor: draft.textColor,
        backgroundTone: draft.backgroundTone,
        aspectRatio: draft.aspectRatio,
        cropZoom: draft.cropZoom,
        cropX: draft.cropX,
        cropY: draft.cropY,
        rotation: draft.rotation,
      });
      setDraft(createStudioDraft());
      setPublishStatus(`Published ${post.mood.toLowerCase()} post.`);
    } catch (err) {
      setPublishStatus(err instanceof Error ? err.message : "Could not publish post.");
    } finally {
      setPublishing(false);
    }
  }

  async function uploadFromDevice(file: File | null) {
    if (!file) {
      return;
    }
    setUploading(true);
    setPublishStatus("Uploading media...");
    try {
      const media = await onUploadMedia(file);
      updateDraft("mediaUrl", media.url);
      updateDraft("mediaType", media.mediaType === "video" ? "video" : "image");
      setActiveTool("adjust");
      setPublishStatus(`${media.mediaType === "video" ? "Video" : "Image"} added to canvas.`);
    } catch (err) {
      setPublishStatus(err instanceof Error ? err.message : "Could not upload media.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="studio-panel">
      <form className="studio-editor-shell" onSubmit={submitPost}>
        <header className="studio-topbar">
          <div className="studio-topbar-left">
            <IconButton aria-label="Back to editor history">
              <ArrowBackRounded />
            </IconButton>
            <span className="studio-project-name">Creator Studio</span>
            <span className="studio-save-state">{serviceLabel}</span>
          </div>
          <div className="studio-mode-tabs" aria-label="Creation type">
            {[
              ["post", "Post"],
              ["collab", "Mutual"],
              ["live", "Live"],
            ].map(([id, label]) => (
              <button className={creationMode === id ? "active" : ""} key={id} type="button" onClick={() => {
                setCreationMode(id as "post" | "collab" | "live");
                updateDraft("mood", id === "post" ? "Behind the scenes" : id === "collab" ? "Mutual post" : "Live setup");
              }}>
                {label}
              </button>
            ))}
          </div>
          <div className="studio-topbar-actions">
            <IconButton aria-label="Undo last edit" onClick={() => setDraft(createStudioDraft())}>
              <UndoRounded />
            </IconButton>
            <IconButton aria-label="Save draft">
              <SaveRounded />
            </IconButton>
            <Button disabled={!draft.body.trim() || publishing} startIcon={<SendRounded />} type="submit" variant="contained">
              {publishing ? "Publishing" : creationMode === "live" ? "Prepare" : "Publish"}
            </Button>
          </div>
        </header>

        <aside className="studio-tool-rail" aria-label="Studio tools">
          {studioTools.map((tool) => (
            <button className={activeTool === tool.id ? "active" : ""} key={tool.id} onClick={() => setActiveTool(tool.id)} title={tool.label} type="button">
              {tool.icon}
              <span>{tool.label}</span>
            </button>
          ))}
        </aside>

        <main className="studio-stage" aria-label="Editor canvas">
          <div className="studio-stage-label">
            <span>Slide 1</span>
            <strong>{draft.aspectRatio}</strong>
          </div>
          <div className="studio-canvas-area">
            <div className={`studio-preview-frame studio-canvas-frame tone-${selectedTone.id}`} style={{ aspectRatio: draft.aspectRatio.replace(":", " / ") }}>
              {!draft.mediaUrl ? (
                <div className="studio-empty-media">
                  <ImageRounded sx={{ animation: 'float-pulse 4s ease-in-out infinite' }} />
                  <span>Choose media from your device or profile library</span>
                </div>
              ) : draft.mediaType === "video" ? (
                <video
                  autoPlay
                  loop
                  muted
                  playsInline
                  src={draft.mediaUrl}
                  style={{
                    filter: selectedFilter.css,
                    objectPosition: `${draft.cropX}% ${draft.cropY}%`,
                    transform: `scale(${draft.cropZoom}) rotate(${draft.rotation}deg)`,
                  }}
                />
              ) : (
                <img
                  alt=""
                  src={draft.mediaUrl}
                  style={{
                    filter: selectedFilter.css,
                    objectPosition: `${draft.cropX}% ${draft.cropY}%`,
                    transform: `scale(${draft.cropZoom}) rotate(${draft.rotation}deg)`,
                  }}
                />
              )}
              <div className="studio-preview-scrim" />
              <div className="studio-selection-outline" aria-hidden="true" />
              {draft.sticker ? <span className="studio-preview-sticker">{draft.sticker}</span> : null}
              {draft.overlayText ? <strong style={{ color: draft.textColor }}>{draft.overlayText}</strong> : null}
              <p>{draft.body || "Write the caption to preview it here."}</p>
            </div>
          </div>

          <div className="studio-quick-strip" aria-label="Quick media strip">
            {libraryItems.slice(0, 6).map((image) => (
              <button
                className={draft.mediaUrl === image ? "active" : ""}
                key={image}
                onClick={() => {
                  updateDraft("mediaUrl", image);
                  updateDraft("mediaType", image.match(/\.(mp4|mov|webm)(\?|$)/i) ? "video" : "image");
                }}
                type="button"
              >
                <img alt="" src={image} />
              </button>
            ))}
          </div>

          <div className="studio-timeline" aria-label="Timeline">
            <div className="studio-timeline-ruler">
              {studioTimelineTicks.map((tick) => <span key={tick}>{tick}</span>)}
            </div>
            <div className="studio-timeline-tracks">
              <span className="playhead" />
              <div className="track video-track"><MovieRounded fontSize="small" /> Main media</div>
              <div className="track text-track"><TextFieldsRounded fontSize="small" /> {draft.overlayText || "Text layer"}</div>
              <div className="track audio-track">Audio / effects</div>
            </div>
          </div>
        </main>

        <aside className="studio-inspector" aria-label={`${activeToolLabel} inspector`}>
          <div className="studio-inspector-head">
            <span>{activeToolLabel}</span>
            <button type="button" onClick={() => setActiveTool("publish")}>Export</button>
          </div>

          {activeTool === "media" ? (
            <div className="studio-inspector-section">
              <label className="studio-upload-button full">
                <input
                  accept="image/*,video/*"
                  disabled={uploading}
                  onChange={(event) => void uploadFromDevice(event.currentTarget.files?.[0] ?? null)}
                  type="file"
                />
                <NorthEastRounded fontSize="small" />
                <span>{uploading ? "Uploading..." : "Upload from device"}</span>
              </label>
              <div className="studio-media-grid">
                {libraryItems.map((image) => (
                  <button
                    className={draft.mediaUrl === image ? "selected" : ""}
                    key={image}
                    onClick={() => {
                      updateDraft("mediaUrl", image);
                      updateDraft("mediaType", image.match(/\.(mp4|mov|webm)(\?|$)/i) ? "video" : "image");
                    }}
                    type="button"
                  >
                    <img alt="" src={image} />
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {activeTool === "adjust" ? (
            <div className="studio-inspector-section">
              <div className="studio-control-group" aria-label="Crop and transform">
                <span>Ratio and crop</span>
                <div className="studio-chip-row">
                  {studioAspectRatios.map((ratio) => (
                    <button className={draft.aspectRatio === ratio ? "selected" : ""} key={ratio} onClick={() => updateDraft("aspectRatio", ratio)} type="button">
                      {ratio}
                    </button>
                  ))}
                </div>
                <div className="studio-slider-stack">
                  <label>Zoom <input min="0.8" max="2.4" step="0.02" type="range" value={draft.cropZoom} onChange={(event) => updateDraft("cropZoom", Number(event.target.value))} /></label>
                  <label>X <input min="0" max="100" type="range" value={draft.cropX} onChange={(event) => updateDraft("cropX", Number(event.target.value))} /></label>
                  <label>Y <input min="0" max="100" type="range" value={draft.cropY} onChange={(event) => updateDraft("cropY", Number(event.target.value))} /></label>
                </div>
              </div>
              <div className="studio-control-group">
                <span>Filter</span>
                <div className="studio-chip-row">
                  {studioFilters.map((filter) => (
                    <button className={draft.filterName === filter.name ? "selected" : ""} key={filter.name} onClick={() => updateDraft("filterName", filter.name)} type="button">
                      {filter.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="studio-control-group">
                <span>Rotate</span>
                <div className="studio-chip-row">
                  {[0, 90, 180, 270].map((rotation) => (
                    <button className={draft.rotation === rotation ? "selected" : ""} key={rotation} onClick={() => updateDraft("rotation", rotation)} type="button">
                      {rotation}deg
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {activeTool === "text" ? (
            <div className="studio-inspector-section">
              <label className="studio-field">
                <span>Overlay text</span>
                <InputBase aria-label="Overlay text" onChange={(event) => updateDraft("overlayText", event.target.value)} value={draft.overlayText} />
              </label>
              <label className="studio-field">
                <span>Caption</span>
                <InputBase aria-label="Caption" multiline minRows={4} onChange={(event) => updateDraft("body", event.target.value)} placeholder="Share the moment, offer, or behind-the-scenes note." value={draft.body} />
              </label>
              <div className="studio-control-group">
                <span>Text color</span>
                <div className="studio-color-row">
                  {studioTextColors.map((color) => (
                    <button aria-label={`Use ${color} text`} className={draft.textColor === color ? "selected" : ""} key={color} onClick={() => updateDraft("textColor", color)} style={{ backgroundColor: color }} type="button" />
                  ))}
                </div>
              </div>
              <div className="studio-control-group">
                <span>Sticker</span>
                <div className="studio-chip-row">
                  {studioStickers.map((sticker) => (
                    <button className={draft.sticker === sticker ? "selected" : ""} key={sticker} onClick={() => updateDraft("sticker", sticker)} type="button">
                      {sticker}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {activeTool === "layers" ? (
            <div className="studio-inspector-section">
              {[
                ["Media", draft.mediaType],
                ["Overlay text", draft.overlayText || "Hidden"],
                ["Sticker", draft.sticker || "Hidden"],
                ["Caption", draft.body ? "Visible" : "Empty"],
              ].map(([name, value]) => (
                <button className="studio-layer-row" key={name} type="button">
                  <LayersRounded fontSize="small" />
                  <span><strong>{name}</strong><small>{value}</small></span>
                  <MoreHorizRounded fontSize="small" />
                </button>
              ))}
            </div>
          ) : null}

          {activeTool === "timeline" ? (
            <div className="studio-inspector-section">
              <div className="studio-control-group">
                <span>Timeline tools</span>
                <div className="studio-action-grid">
                  <button type="button"><ContentCopyRounded fontSize="small" /> Duplicate</button>
                  <button type="button"><Crop169Rounded fontSize="small" /> Crop</button>
                  <button type="button"><DeleteRounded fontSize="small" /> Delete</button>
                  <button type="button"><AutoAwesomeRounded fontSize="small" /> Effects</button>
                </div>
              </div>
              <div className="studio-mini-wave" aria-hidden="true">
                {Array.from({ length: 30 }, (_, index) => <i key={index} style={{ height: `${18 + (index % 6) * 7}px` }} />)}
              </div>
            </div>
          ) : null}

          {activeTool === "publish" ? (
            <div className="studio-inspector-section">
              <label className="studio-field compact">
                <span>Mood</span>
                <InputBase aria-label="Mood" onChange={(event) => updateDraft("mood", event.target.value)} value={draft.mood} />
              </label>
              <div className="studio-control-group">
                <span>Tone</span>
                <div className="studio-chip-row">
                  {studioTones.map((tone) => (
                    <button className={draft.backgroundTone === tone.id ? "selected" : ""} key={tone.id} onClick={() => updateDraft("backgroundTone", tone.id)} type="button">
                      {tone.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="studio-composer-actions">
                <Button disabled={!draft.body.trim() || publishing} startIcon={<SendRounded />} type="submit" variant="contained">
                  {publishing ? "Publishing" : creationMode === "live" ? "Prepare live" : "Publish post"}
                </Button>
                <IconButton aria-label="Reset editor" onClick={() => setDraft(createStudioDraft())}>
                  <AutoAwesomeRounded />
                </IconButton>
              </div>
              {publishStatus ? <p className="studio-publish-status">{publishStatus}</p> : null}
            </div>
          ) : null}
        </aside>
      </form>

      <div className="studio-metrics" aria-label="Studio metrics">
        <span><strong>{posts.length}</strong> Posts</span>
        <span><strong>{topBoost}%</strong> Top boost</span>
        <span><strong>{compactNumber(totalReach)}</strong> Reach</span>
      </div>

      <div className="studio-section-title">
        <h2>Promotion queue</h2>
        <button type="button">New campaign</button>
      </div>

      {topPosts.map((post) => (
        <article className="studio-post-row" key={post.id}>
          {post.gallery[0] ? <img alt="" src={post.gallery[0]} /> : <i aria-hidden="true" className="studio-row-placeholder" />}
          <span>
            <strong>{post.author.name}</strong>
            <small>{post.promotionScore}% trend score - {post.mood}</small>
          </span>
          <button type="button">Promote</button>
        </article>
      ))}
    </section>
  );
}

function PostEditPanel({
  onBack,
  onSave,
  onShareHome,
  post,
}: {
  onBack: () => void;
  onSave: (postId: number, input: PostInput) => Promise<FeedPost>;
  onShareHome: () => void;
  post: DisplayPost;
}) {
  const [body, setBody] = useState(post.body);
  const [mood, setMood] = useState(post.mood);
  const [overlayText, setOverlayText] = useState(post.overlayText);
  const [sticker, setSticker] = useState(post.sticker || "NEW");
  const [textColor, setTextColor] = useState(post.textColor || "#ffffff");
  const [backgroundTone, setBackgroundTone] = useState(post.backgroundTone || "midnight");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const primaryMedia = post.gallery[0] || post.mediaUrl;

  async function savePost(shareHome: boolean) {
    if (!body.trim() || saving) {
      return;
    }
    setSaving(true);
    setStatus(shareHome ? "Saving to Home..." : "Saving changes...");
    try {
      await onSave(post.id, {
        body,
        mood,
        mediaUrl: post.mediaUrl || primaryMedia,
        mediaType: post.mediaType,
        filterName: post.filterName,
        overlayText,
        sticker,
        textColor,
        backgroundTone,
        aspectRatio: post.aspectRatio,
        cropZoom: post.cropZoom,
        cropX: post.cropX,
        cropY: post.cropY,
        rotation: post.rotation,
      });
      setStatus("Post updated.");
      if (shareHome) {
        onShareHome();
      } else {
        onBack();
      }
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Could not update post.");
    } finally {
      setSaving(false);
    }
  }

  async function shareOutsideApp() {
    const url = `${window.location.origin}/?post=${post.id}`;
    const text = `${body}\n${url}`;
    if (navigator.share) {
      await navigator.share({ title: "Creators post", text: body, url });
      return;
    }
    await navigator.clipboard.writeText(text);
    setStatus("Post link copied.");
  }

  return (
    <section className="post-edit-page">
      <header className="post-edit-topbar">
        <button className="round-icon" type="button" onClick={onBack} aria-label="Back to profile">
          <ArrowBackRounded fontSize="small" />
        </button>
        <strong>Edit profile post</strong>
        <button className="round-icon" type="button" onClick={() => void shareOutsideApp()} aria-label="Share post">
          <NorthEastRounded fontSize="small" />
        </button>
      </header>

      <div className="post-edit-shell">
        <div className={`post-edit-preview tone-${backgroundTone}`}>
          {primaryMedia ? (
            post.mediaType === "video" ? (
              <video autoPlay loop muted playsInline src={primaryMedia} />
            ) : (
              <img alt="" src={primaryMedia} />
            )
          ) : (
            <div className="post-edit-empty"><ImageRounded />Media preview</div>
          )}
          <div className="post-edit-scrim" />
          {sticker ? <span>{sticker}</span> : null}
          {overlayText ? <strong style={{ color: textColor }}>{overlayText}</strong> : null}
          <p>{body || "Write your caption to preview it here."}</p>
        </div>

        <form className="post-edit-form" onSubmit={(event) => {
          event.preventDefault();
          void savePost(false);
        }}>
          <label>
            <span>Caption</span>
            <textarea value={body} onChange={(event) => setBody(event.target.value)} />
          </label>
          <label>
            <span>Mood</span>
            <input value={mood} onChange={(event) => setMood(event.target.value)} />
          </label>
          <label>
            <span>Overlay</span>
            <input value={overlayText} onChange={(event) => setOverlayText(event.target.value)} />
          </label>

          <div className="post-edit-control">
            <span>Sticker</span>
            <div>
              {["LIVE", "DROP", "NEW", "VIP", "Q&A", ""].map((item) => (
                <button className={sticker === item ? "active" : ""} key={item || "none"} type="button" onClick={() => setSticker(item)}>
                  {item || "None"}
                </button>
              ))}
            </div>
          </div>

          <div className="post-edit-control">
            <span>Tone</span>
            <div>
              {studioTones.map((tone) => (
                <button className={backgroundTone === tone.id ? "active" : ""} key={tone.id} type="button" onClick={() => setBackgroundTone(tone.id)}>
                  {tone.label}
                </button>
              ))}
            </div>
          </div>

          <div className="post-edit-colors">
            {studioTextColors.map((color) => (
              <button aria-label={`Use ${color}`} className={textColor === color ? "active" : ""} key={color} style={{ backgroundColor: color }} type="button" onClick={() => setTextColor(color)} />
            ))}
          </div>

          <div className="post-edit-actions">
            <Button disabled={!body.trim() || saving} type="submit" variant="outlined">
              {saving ? "Saving" : "Save"}
            </Button>
            <Button disabled={!body.trim() || saving} onClick={() => void savePost(true)} startIcon={<SendRounded />} variant="contained">
              Save to Home
            </Button>
          </div>
          {status ? <p className="post-edit-status">{status}</p> : null}
        </form>
      </div>
    </section>
  );
}

function ProfilePanel({
  chatUsers,
  followersCount,
  followingCount,
  health,
  onEditPost,
  onLogout,
  onOpenSettings,
  onOpenPost,
  onStartCreating,
  posts,
  profile,
  user,
}: {
  chatUsers: ChatUser[];
  followersCount: number;
  followingCount: number;
  health: HealthResponse | null;
  onEditPost: (post: DisplayPost) => void;
  onLogout: () => void;
  onOpenSettings: () => void;
  onOpenPost: (post: DisplayPost) => void;
  onStartCreating: () => void;
  posts: DisplayPost[];
  profile: ProfileResponse | null;
  user: AuthUser;
}) {
  const [profileTab, setProfileTab] = useState<"posts" | "liked" | "groups">("posts");
  const [profileStatus, setProfileStatus] = useState("");
  const [listType, setListType] = useState<"followers" | "following" | null>(null);

  const profilePosts = useMemo(() => posts.filter(p => p.author.id === user.id), [posts, user.id]);
  const coverImage = profile?.coverUrl || (profilePosts.length > 0 ? profilePosts[0].gallery[0] : "");
  const avatarImage = profile?.avatarUrl || user.avatarUrl;
  const handle = `@${user.name.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`;
  const visiblePosts = profileTab === "posts" ? profilePosts : profileTab === "liked" ? [...posts].sort((left, right) => right.likes - left.likes).slice(0, 6) : profilePosts.filter((post) => post.mood.toLowerCase().includes("collab") || post.tags.includes("creator"));

  return (
    <section className="profile-panel">
      <Fade in timeout={450}>
        <div className="mx-auto min-h-[calc(100vh-96px)] max-w-5xl">
          <Paper className="own-profile-card" elevation={0}>
            <div className="own-profile-cover">
              {coverImage ? <img alt="" className="absolute inset-0 h-full w-full object-cover opacity-80" src={coverImage} /> : <div className="profile-cover-empty" />}
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,9,15,0.08),rgba(7,9,15,0.7)_58%,#07090f_100%)]" />
              <div className="relative z-10 flex justify-between p-5">
                <IconButton className="!bg-black/25 !text-white backdrop-blur" onClick={onOpenSettings}>
                  <SettingsRounded />
                </IconButton>
                <IconButton className="!bg-black/25 !text-white backdrop-blur" onClick={onLogout}>
                  <PersonRemoveRounded />
                </IconButton>
              </div>

              <div className="absolute inset-x-0 bottom-0 z-10 px-5 pb-6 text-center">
                <Badge overlap="circular" badgeContent={<AutoAwesomeRounded sx={{ fontSize: 14, color: "#fff" }} />} color="primary">
                  <Avatar src={avatarImage} sx={{ width: 84, height: 84, mx: "auto", border: "3px solid #fff", boxShadow: "0 18px 42px rgba(0,0,0,0.38)", fontWeight: 900 }}>
                    {firstName(user.name).slice(0, 1)}
                  </Avatar>
                </Badge>
                <h1 className="mt-3 text-2xl font-black md:text-3xl">{user.name}</h1>
                <p className="m-0 text-sm font-bold text-white/65">{handle}</p>
                <EmojiText className="mx-auto mt-3 block max-w-xl text-sm leading-6 text-white/70" text={profile?.bio || profile?.headline || "Creator stories, live drops, and studio updates. :sparkles:"} />
                {profile?.websiteUrl ? <a className="profile-web-link" href={profile.websiteUrl} target="_blank" rel="noreferrer">{profile.websiteUrl}</a> : null}
              </div>
            </div>

            <div className="border-y border-white/10 px-4 py-5">
              <div className="mx-auto grid max-w-xl grid-cols-3 text-center">
                <span><strong className="block text-xl">{profilePosts.length}</strong><small className="text-white/50">Posts</small></span>
                <button type="button" onClick={() => setListType("followers")} className="bg-transparent text-white cursor-pointer hover:opacity-80 transition">
                  <strong className="block text-xl">{compactNumber(followersCount)}</strong><small className="text-white/50">Followers</small>
                </button>
                <button type="button" onClick={() => setListType("following")} className="bg-transparent text-white cursor-pointer hover:opacity-80 transition">
                  <strong className="block text-xl">{followingCount}</strong><small className="text-white/50">Following</small>
                </button>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-2 px-5 py-4">
              <Button onClick={onOpenSettings} sx={{ borderRadius: "999px", color: "#07090f", px: 3, background: "#fff", fontWeight: 900 }} variant="contained">
                Edit profile
              </Button>
              <IconButton className="!border !border-white/10 !bg-white/10 !text-white" onClick={onOpenSettings} aria-label="Edit profile components">
                <PersonAddAlt1Rounded />
              </IconButton>
              <IconButton className="!border !border-white/10 !bg-white/10 !text-white" onClick={() => void navigator.clipboard.writeText(`${window.location.origin}/?profile=${user.id}`).then(() => setProfileStatus("Profile link copied."))} aria-label="Copy profile link">
                <NorthEastRounded />
              </IconButton>
              <Chip label={health?.status === "ok" ? "Live" : "Syncing"} sx={{ color: "#fff", background: "rgba(255,255,255,0.1)", fontWeight: 800 }} />
              {profileStatus ? <span className="profile-action-status">{profileStatus}</span> : null}
            </div>

            <nav className="grid grid-cols-3 border-b border-white/10 text-center text-white/45">
              <button className={profileTab === "posts" ? "border-b-2 border-white py-3 text-white" : "py-3"} type="button" onClick={() => setProfileTab("posts")}><PlayCircleRounded fontSize="small" /></button>
              <button className={profileTab === "liked" ? "border-b-2 border-white py-3 text-white" : "py-3"} type="button" onClick={() => setProfileTab("liked")}><FavoriteRounded fontSize="small" /></button>
              <button className={profileTab === "groups" ? "border-b-2 border-white py-3 text-white" : "py-3"} type="button" onClick={() => setProfileTab("groups")}><GroupsRounded fontSize="small" /></button>
            </nav>

            <div className="grid grid-cols-3 gap-0.5 bg-black">
              {visiblePosts.map((post) => (
                <button className="group relative aspect-[0.78] overflow-hidden bg-zinc-950 text-left" key={post.id} type="button" onClick={() => onEditPost(post)}>
                  {post.gallery[0] ? <img alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" src={post.gallery[0]} /> : <span className="profile-post-empty">{post.mood}</span>}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-2 text-white">
                    <span className="flex items-center gap-1 text-[11px] font-black"><TextFieldsRounded sx={{ fontSize: 13 }} />Edit</span>
                  </div>
                </button>
              ))}
              {!visiblePosts.length ? (
                <div className="profile-empty-grid" style={{ gridColumn: 'span 3', padding: '80px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                  <div className="profile-empty-icon-wrap">
                    <PlayCircleRounded sx={{ fontSize: 32, opacity: 0.3 }} />
                  </div>
                  <h3 className="m-0 text-lg font-black">No {profileTab} yet</h3>
                  <p className="mt-2 text-sm text-white/50 max-w-xs">
                    {profileTab === "posts"
                      ? "Your creative space is empty. Share your first story or drop a product room to get started."
                      : profileTab === "liked"
                        ? "Posts you've promoted will appear here for your audience to see."
                        : "Collaborations and group project updates are stored here."
                    }
                  </p>
                  {profileTab === "posts" && (
                    <Button onClick={onStartCreating} sx={{ mt: 3, borderRadius: '999px', textTransform: 'none', fontWeight: 900, px: 4, background: 'var(--accent)', color: 'var(--text-dark)' }} variant="contained">
                      Create first post
                    </Button>
                  )}
                </div>
              ) : null}
            </div>
          </Paper>
        </div>
      </Fade>
      {listType && (
        <UserListModal
          posts={posts}
          type={listType}
          users={chatUsers}
          onClose={() => setListType(null)}
          onSelect={onOpenPost}
        />
      )}
    </section>
  );
}

function ProfileSettingsPanel({
  onBack,
  onLogout,
  onSaveProfile,
  onThemeChange,
  onUploadMedia,
  profile,
  theme,
  themes,
  user,
}: {
  onBack: () => void;
  onLogout: () => void;
  onSaveProfile: (input: { name: string; bio: string; headline: string; location: string; avatarUrl?: string; coverUrl?: string; websiteUrl?: string }) => Promise<void>;
  onThemeChange: (theme: ThemeName) => void;
  onUploadMedia: (file: File) => Promise<{ url: string; mediaType: "image" | "video" | string }>;
  profile: ProfileResponse | null;
  theme: ThemeName;
  themes: typeof themeOptions;
  user: AuthUser;
}) {
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatarUrl ?? user.avatarUrl ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [coverUrl, setCoverUrl] = useState(profile?.coverUrl ?? "");
  const [headline, setHeadline] = useState(profile?.headline ?? "Creator");
  const [location, setLocation] = useState(profile?.location ?? "");
  const [name, setName] = useState(user.name);
  const [saving, setSaving] = useState(false);
  const [uploadingProfileMedia, setUploadingProfileMedia] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState(profile?.websiteUrl ?? "");

  useEffect(() => {
    setName(user.name);
    setAvatarUrl(profile?.avatarUrl ?? user.avatarUrl ?? "");
    setBio(profile?.bio ?? "");
    setCoverUrl(profile?.coverUrl ?? "");
    setHeadline(profile?.headline ?? "Creator");
    setLocation(profile?.location ?? "");
    setWebsiteUrl(profile?.websiteUrl ?? "");
  }, [profile?.avatarUrl, profile?.bio, profile?.coverUrl, profile?.headline, profile?.location, profile?.websiteUrl, user.avatarUrl, user.name]);

  async function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      await onSaveProfile({ name, bio, headline, location, avatarUrl, coverUrl, websiteUrl });
      onBack();
    } finally {
      setSaving(false);
    }
  }

  async function uploadProfileMedia(file: File | null, target: "avatar" | "cover") {
    if (!file) {
      return;
    }
    setUploadingProfileMedia(true);
    try {
      const upload = await onUploadMedia(file);
      if (target === "avatar") {
        setAvatarUrl(upload.url);
      } else {
        setCoverUrl(upload.url);
      }
    } finally {
      setUploadingProfileMedia(false);
    }
  }

  return (
    <section className="settings-screen">
      <header className="settings-topbar">
        <button className="round-icon" type="button" onClick={onBack} aria-label="Back to profile">x</button>
        <strong>Settings</strong>
        <button className="settings-save" form="profile-settings-form" type="submit" disabled={saving}>
          {saving ? "Saving" : "Save"}
        </button>
      </header>

      <div className="settings-profile-card">
        <div className="settings-cover-preview">
          {coverUrl ? <img alt="" src={coverUrl} /> : <span />}
        </div>
        <div className="settings-profile-inline">
          {avatarUrl ? <img alt="" src={avatarUrl} /> : <strong>{firstName(user.name).slice(0, 1)}</strong>}
          <span>
            <h1>{user.name}</h1>
            <p>{user.email}</p>
          </span>
          <button type="button" onClick={onBack}>View</button>
        </div>
      </div>

      <form id="profile-settings-form" className="settings-form" onSubmit={(event) => void submitProfile(event)}>
        <label>Name<input value={name} onChange={(event) => setName(event.target.value)} /></label>
        <label>Headline<input value={headline} onChange={(event) => setHeadline(event.target.value)} /></label>
        <label>Location<input value={location} onChange={(event) => setLocation(event.target.value)} /></label>
        <label>Website<input value={websiteUrl} onChange={(event) => setWebsiteUrl(event.target.value)} placeholder="https://your-site.com" /></label>
        <label>Bio<textarea value={bio} onChange={(event) => setBio(event.target.value)} /></label>
        <div className="profile-media-actions">
          <label>
            <ImageRounded fontSize="small" />
            Avatar
            <input accept="image/*" type="file" onChange={(event) => void uploadProfileMedia(event.target.files?.[0] ?? null, "avatar")} />
          </label>
          <label>
            <Crop169Rounded fontSize="small" />
            Cover
            <input accept="image/*" type="file" onChange={(event) => void uploadProfileMedia(event.target.files?.[0] ?? null, "cover")} />
          </label>
          {uploadingProfileMedia ? <span>Uploading...</span> : null}
        </div>
      </form>

      <div className="settings-list">
        <button type="button" onClick={onBack}><span>My Profile</span><strong>View</strong></button>
        <button type="button" onClick={() => void navigator.clipboard.writeText(`${window.location.origin}/?profile=${user.id}`)}><span>Share Profile</span><strong>Copy</strong></button>
        <button type="button" onClick={() => onThemeChange(theme)}><span>Activity Sync</span><strong>On</strong></button>
      </div>

      <section className="settings-card">
        <div className="theme-section-head">
          <h2>Theme</h2>
          <p>Pick the look for your web and app view.</p>
        </div>
        <div className="theme-options" aria-label="Theme options">
          {themes.map((option) => (
            <label className={option.id === theme ? "theme-option active" : "theme-option"} key={option.id}>
              <input
                checked={option.id === theme}
                name="app-theme"
                type="radio"
                onChange={() => onThemeChange(option.id)}
              />
              <span className="theme-radio" aria-hidden="true">
                <i />
              </span>
              <span className="theme-swatches" aria-hidden="true">
                {option.swatches.map((swatch) => (
                  <i key={swatch} style={{ background: swatch }} />
                ))}
              </span>
              <span className="theme-copy">
                <strong>{option.label}</strong>
                <small>{option.caption}</small>
              </span>
            </label>
          ))}
        </div>
      </section>

      <section className="settings-card">
        <h2>Notifications</h2>
        <div className="setting-toggle"><span>New followers</span><i /></div>
        <div className="setting-toggle"><span>Creator drops</span><i /></div>
        <div className="setting-toggle"><span>Marketing team</span><i /></div>
      </section>

      <button className="logout-link danger" type="button" onClick={onLogout}>Log out</button>
    </section>
  );
}

function PublicProfileScreen({
  post,
  onBack,
  chatUsers,
  onOpenPost,
  posts,
}: {
  post: DisplayPost;
  onBack: () => void;
  chatUsers: ChatUser[];
  onOpenPost: (post: DisplayPost) => void;
  posts: DisplayPost[];
}) {
  const followerCount = compactNumber(1200 + indexFor(post.author.name, 8200));
  const followingCount = compactNumber(indexFor(post.author.name, 400) + 120);
  const creationCount = compactNumber(Math.max(1, post.gallery.length));
  const gallery = post.gallery.length ? post.gallery : [profileImageFor(post.author.name)];
  const handle = `@${post.author.name.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`;
  const [listType, setListType] = useState<"followers" | "following" | null>(null);

  return (
    <section className="public-profile" aria-label={`${post.author.name} profile`}>
      <div className="public-profile-hero" style={{ backgroundImage: `url("${gallery[0]}")` }}>
        <div className="public-profile-shade" />
        <header className="public-profile-topbar">
          <button className="round-icon" type="button" onClick={onBack} aria-label="Back to feed">
            x
          </button>
          <button className="round-icon" type="button" aria-label="More profile actions">
            ...
          </button>
        </header>

        <aside className="public-side-actions" aria-label="Profile actions">
          <button type="button">+</button>
          <button type="button">Like</button>
        </aside>

        <div className="public-profile-card">
          <div className="public-avatar-wrap neon">
            <img alt="" src={profileImageFor(post.author.name)} />
          </div>
          <h1>{post.author.name}</h1>
          <p className="public-handle">{handle}</p>

          <div className="public-profile-stats" aria-label="Profile statistics">
            <button type="button" onClick={() => setListType("following")} className="bg-transparent text-white cursor-pointer hover:opacity-80 transition text-left">
              <strong>{followingCount}</strong> Following
            </button>
            <button type="button" onClick={() => setListType("followers")} className="bg-transparent text-white cursor-pointer hover:opacity-80 transition text-left">
              <strong>{followerCount}</strong> Followers
            </button>
            <span><strong>{creationCount}</strong> Creations</span>
          </div>

          <div className="public-friend-strip">
            {gallery.slice(0, 4).map((image) => <img alt="" key={image} src={image} />)}
          </div>
          <nav className="public-profile-tabs" aria-label="Profile content filters">
            <button className="active" type="button">All</button>
            <button type="button">Live</button>
            <button type="button">Posts</button>
            <button type="button">Music</button>
          </nav>
        </div>
      </div>

      <div className="profile-section-head public">
        <h2>Photos & Videos</h2>
        <button type="button">See all</button>
      </div>
      <div className="public-gallery">
        {gallery.slice(0, 6).map((image, index) => (
          <button className={index === 0 ? "featured" : ""} type="button" key={image}>
            <img alt="" src={image} />
            <span>{index === 0 ? "Latest drop" : (post.tags[index % Math.max(post.tags.length, 1)] ?? post.mediaType)}</span>
          </button>
        ))}
      </div>
      {listType && (
        <UserListModal
          posts={posts}
          type={listType}
          users={chatUsers}
          onClose={() => setListType(null)}
          onSelect={onOpenPost}
        />
      )}
    </section>
  );
}

function DesktopSidebar({
  activeTab,
  health,
  notificationCount,
  onTabChange,
  user,
}: {
  activeTab: HomeTab;
  health: HealthResponse | null;
  notificationCount: number;
  onTabChange: (tab: HomeTab) => void;
  user: AuthUser;
}) {
  return (
    <aside className="desktop-sidebar" aria-label="Desktop navigation">
      <button className="desktop-brand" type="button" onClick={() => onTabChange("home")} aria-label="Creators home">
        <span>C</span>
      </button>
      <nav>
        {bottomTabs.map((tab) => (
          <button
            className={activeTab === tab.id ? "active" : ""}
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            aria-current={activeTab === tab.id ? "page" : undefined}
          >
            <span className={`nav-glyph ${tab.icon}`} aria-hidden="true" />
            <small>{tab.label}</small>
            {tab.id === "messages" && notificationCount ? <i>{notificationCount}</i> : null}
          </button>
        ))}
      </nav>
      <div className="desktop-sidebar-foot">
        <span className={health?.status === "ok" ? "service-dot ok" : "service-dot"} aria-label={`API ${health?.status ?? "checking"}`} />
        <button type="button" onClick={() => onTabChange("profiles")} aria-label="Open profile">
          {user.avatarUrl ? <img alt="" src={user.avatarUrl} /> : <strong>{firstName(user.name).slice(0, 1).toUpperCase()}</strong>}
        </button>
      </div>
    </aside>
  );
}

function BottomNav({ activeTab, onTabChange }: { activeTab: HomeTab; onTabChange: (tab: HomeTab) => void }) {
  return (
    <nav className="social-bottom-nav" aria-label="Primary">
      {bottomTabs.map((tab) => (
        <button
          className={activeTab === tab.id ? "active" : ""}
          aria-current={activeTab === tab.id ? "page" : undefined}
          aria-label={tab.label}
          key={tab.id}
          type="button"
          onClick={() => onTabChange(tab.id)}
        >
          <span className={`nav-glyph ${tab.icon}`} aria-hidden="true" />
          <small>{tab.label}</small>
        </button>
      ))}
    </nav>
  );
}

function AuthDialog({
  mode,
  sessionLoading,
  onAuthenticated,
  onClose,
  onModeChange,
  onNotice,
}: {
  mode: AuthMode;
  sessionLoading: boolean;
  onAuthenticated: (user: AuthUser) => void;
  onClose: () => void;
  onModeChange: (mode: AuthMode) => void;
  onNotice: (message: string) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isRegister = mode === "register";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const response = isRegister
        ? await registerAccount({ name, email, password })
        : await loginAccount({ email, password });
      onAuthenticated(response.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogle() {
    setSubmitting(true);
    setError("");
    try {
      window.location.href = await getGoogleAuthUrl();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Google sign-in failed";
      setError(message);
      onNotice(message);
      setSubmitting(false);
    }
  }

  return (
    <div className="dialog-layer" role="presentation">
      <section className="auth-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <button className="icon-button" type="button" aria-label="Close" title="Close" onClick={onClose}>
          x
        </button>
        <p className="section-kicker">{isRegister ? "Create account" : "Welcome back"}</p>
        <h2 id="auth-title">{isRegister ? "Register for Creators" : "Log in to Creators"}</h2>

        <form className="auth-form" onSubmit={(event) => void handleSubmit(event)}>
          {isRegister ? (
            <label>
              <span>Name</span>
              <input autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} required />
            </label>
          ) : null}
          <label>
            <span>Email</span>
            <input
              autoComplete="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label>
            <span>Password</span>
            <input
              autoComplete={isRegister ? "new-password" : "current-password"}
              minLength={8}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          {error ? <p className="form-error">{error}</p> : null}

          <button className="solid-button full" type="submit" disabled={submitting || sessionLoading}>
            {submitting ? "Working..." : isRegister ? "Create account" : "Log in"}
          </button>
        </form>

        <div className="divider"><span>or</span></div>

        <button className="google-button" type="button" onClick={() => void handleGoogle()} disabled={submitting}>
          <span aria-hidden="true">G</span>
          Continue with Google
        </button>

        <p className="switch-copy">
          {isRegister ? "Already registered?" : "New to Creators?"}
          <button type="button" onClick={() => onModeChange(isRegister ? "login" : "register")}>
            {isRegister ? "Log in" : "Register"}
          </button>
        </p>
      </section>
    </div>
  );
}

function createDisplayPosts(posts: FeedPost[]) {
  const mapped = posts.map<DisplayPost>((post) => {
    const gallery = post.gallery.length ? post.gallery : post.mediaUrl ? [post.mediaUrl] : [];
    return {
      ...post,
      comments: post.commentCount,
      gallery,
      likes: post.likeCount,
      promotionScore: post.promotionScore,
      tags: post.tags.length ? post.tags : [post.mood.toLowerCase().replace(/\s+/g, ""), post.mediaType].filter(Boolean),
    };
  });
  return mapped.sort((left, right) => right.promotionScore - left.promotionScore || new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

function timeAgo(value: string) {
  const date = new Date(value);
  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const absSeconds = Math.abs(seconds);

  if (absSeconds < 60) {
    return seconds >= 0 ? "in a moment" : "just now";
  }

  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  for (const [unit, amount] of units) {
    if (absSeconds >= amount) {
      return formatter.format(Math.round(seconds / amount), unit);
    }
  }
  return formatter.format(seconds, "second");
}

function elapsedTime(value: string) {
  const minutes = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 60000));
  const hours = Math.floor(minutes / 60).toString().padStart(2, "0");
  const mins = (minutes % 60).toString().padStart(2, "0");
  return `${hours}:${mins}:30`;
}

function firstName(value: string) {
  return value.trim().split(/\s+/)[0] || value;
}

function compactNumber(value: number) {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function webFilterFor(filterName: string) {
  return studioFilters.find((filter) => filter.name === filterName)?.css ?? "none";
}

function profileImageFor(seed: string) {
  return `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(seed || "creator")}`;
}

function liveCoverFor(room?: LiveRoom | null) {
  return room?.coverUrl || "";
}

function indexFor(value: string, length: number) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash) % length;
}

function isThemeName(value: string | null): value is ThemeName {
  return value === "default" || value === "dark" || value === "beautiful" || value === "blueish" || value === "greenish" || value === "whiteish";
}

function UserListModal({
  posts,
  type,
  users,
  onClose,
  onSelect,
}: {
  posts: DisplayPost[];
  type: "followers" | "following";
  users: ChatUser[];
  onClose: () => void;
  onSelect: (post: DisplayPost) => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-xl">
      <Paper
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: 400,
          borderRadius: "28px",
          background: "var(--panel-bg)",
          border: "1px solid var(--line-soft)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          maxHeight: "80vh",
        }}
      >
        <header className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="m-0 text-xl font-black capitalize">{type}</h2>
          <IconButton onClick={onClose} sx={{ color: "#fff" }}>
            <ArrowBackRounded />
          </IconButton>
        </header>
        <div className="flex-1 overflow-y-auto p-2">
          {users.map((u) => (
            <div
              key={u.id}
              className="flex cursor-pointer items-center gap-3 rounded-2xl p-3 transition hover:bg-white/5"
              onClick={() => {
                const userPost = posts.find(p => p.author.id === u.id);
                if (userPost) {
                  onSelect(userPost);
                } else {
                  // Create a virtual post for navigation purposes
                  onSelect({
                    id: -(u.id),
                    author: { id: u.id, name: u.name, email: u.email, provider: 'seed', avatarUrl: profileImageFor(u.name), createdAt: new Date().toISOString() },
                    body: "This creator hasn't shared any posts yet.",
                    mood: "New Creator",
                    gallery: [],
                    comments: 0,
                    likes: 0,
                    promotionScore: 0,
                    tags: ["creator"],
                    createdAt: new Date().toISOString(),
                    mediaUrl: "",
                    mediaType: "image",
                    filterName: "Original",
                    overlayText: "",
                    sticker: "",
                    textColor: "#fff",
                    backgroundTone: "midnight",
                    aspectRatio: "4:5",
                    cropZoom: 1,
                    cropX: 50,
                    cropY: 50,
                    rotation: 0,
                    commentCount: 0,
                    likeCount: 0
                  });
                }
                onClose();
              }}
            >
              <Avatar src={profileImageFor(u.name)} sx={{ width: 44, height: 44 }} />
              <div className="min-w-0 flex-1">
                <p className="m-0 font-bold truncate">{u.name}</p>
                <p className="m-0 text-xs text-white/50 truncate">{u.headline}</p>
              </div>
              <Button
                size="small"
                variant="outlined"
                sx={{ borderRadius: '999px', textTransform: 'none', fontWeight: 900, borderColor: 'var(--line-soft)', color: '#fff' }}
              >
                View
              </Button>
            </div>
          ))}
          {!users.length && <p className="p-8 text-center text-white/40">No users found.</p>}
        </div>
      </Paper>
    </div>
  );
}
