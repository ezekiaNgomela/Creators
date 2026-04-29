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
  Stack,
} from "@mui/material";
import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import AutoAwesomeRounded from "@mui/icons-material/AutoAwesomeRounded";
import CommentRounded from "@mui/icons-material/CommentRounded";
import EmojiEmotionsRounded from "@mui/icons-material/EmojiEmotionsRounded";
import FavoriteRounded from "@mui/icons-material/FavoriteRounded";
import ForumRounded from "@mui/icons-material/ForumRounded";
import GroupsRounded from "@mui/icons-material/GroupsRounded";
import MoreHorizRounded from "@mui/icons-material/MoreHorizRounded";
import NorthEastRounded from "@mui/icons-material/NorthEastRounded";
import PhoneRounded from "@mui/icons-material/PhoneRounded";
import PersonAddAlt1Rounded from "@mui/icons-material/PersonAddAlt1Rounded";
import PersonRemoveRounded from "@mui/icons-material/PersonRemoveRounded";
import PlayCircleRounded from "@mui/icons-material/PlayCircleRounded";
import SearchRounded from "@mui/icons-material/SearchRounded";
import ScheduleRounded from "@mui/icons-material/ScheduleRounded";
import SendRounded from "@mui/icons-material/SendRounded";
import SettingsRounded from "@mui/icons-material/SettingsRounded";
import VideocamOutlined from "@mui/icons-material/VideocamOutlined";
import VideocamRounded from "@mui/icons-material/VideocamRounded";
import {
  clearStoredToken,
  createComment,
  createPost,
  fetchCurrentUser,
  fetchChatContacts,
  fetchChatMessages,
  fetchComments,
  fetchFeed,
  fetchHealth,
  fetchLiveIndex,
  fetchProfile,
  getGoogleAuthUrl,
  loginAccount,
  logoutAccount,
  rateLiveRoom,
  registerAccount,
  sendChatMessage,
  storeToken,
  updateProfile,
  type AuthUser,
  type ChatContact,
  type ChatMessage,
  type Comment,
  type FeedPost,
  type HealthResponse,
  type LiveIndex,
  type LiveRating,
  type LiveRoom,
  type ProfileResponse,
} from "./api";

type AuthMode = "login" | "register";
type HomeTab = "home" | "streams" | "messages" | "studio" | "profiles";
type ProfileView = "profile" | "settings";
type ThemeName = "default" | "dark" | "beautiful" | "blueish" | "greenish" | "whiteish";

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
  const [comments, setComments] = useState<Comment[]>([]);
  const [feedError, setFeedError] = useState("");
  const [followCounts, setFollowCounts] = useState<Record<string, number>>({});
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});
  const [liveIndex, setLiveIndex] = useState<LiveIndex | null>(null);
  const [liveRooms, setLiveRooms] = useState<LiveRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [profileView, setProfileView] = useState<ProfileView>("profile");
  const [selectedProfilePost, setSelectedProfilePost] = useState<DisplayPost | null>(null);
  const [selectedLiveId, setSelectedLiveId] = useState<number | null>(null);
  const [selectedThreadId, setSelectedThreadId] = useState("");

  const displayPosts = useMemo(() => createDisplayPosts(posts), [posts]);
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
      const [feed, nextLiveIndex, nextProfile, nextContacts] = await Promise.all([
        fetchFeed(),
        fetchLiveIndex(),
        fetchProfile(),
        fetchChatContacts(),
      ]);
      setLiveRooms(feed.liveRooms);
      setPosts(feed.posts);
      setLiveIndex(nextLiveIndex);
      setProfile(nextProfile);
      setChatContacts(nextContacts);

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

  async function sendMessage(body: string) {
    if (!selectedThreadId) {
      return;
    }
    const message = await sendChatMessage({ contactId: selectedThreadId, body });
    setChatMessages((current) => [...current, message]);
    setChatContacts(await fetchChatContacts());
  }

  async function saveProfile(input: { name: string; bio: string; headline: string; location: string }) {
    setProfile(await updateProfile(input));
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
      <section className="phone-frame">
        {selectedProfilePost ? (
          <PublicProfileScreen post={selectedProfilePost} onBack={() => setSelectedProfilePost(null)} />
        ) : activeTab === "home" ? (
          <>
            <StoryHeader liveRooms={liveRooms} onOpenStream={openStream} user={user} />
            {feedError ? <p className="feed-error">{feedError}</p> : null}
            <HomeFeed
              comments={comments}
              isFollowing={isFollowing}
              loading={loading}
              onAddComment={addPostComment}
              onLoadComments={loadPostComments}
              onOpenProfile={setSelectedProfilePost}
              onToggleFollow={toggleFollow}
              posts={displayPosts}
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
            onToggleFollow={toggleFollow}
            ratingsByLiveId={ratingsByLiveId}
            selectedLive={selectedLive}
            followersFor={followersFor}
            isFollowing={isFollowing}
          />
        ) : null}

        {activeTab === "messages" ? (
          <SearchMessages
            contacts={chatContacts}
            messages={chatMessages}
            onOpenProfile={() => changeTab("profiles")}
            onOpenThread={openThread}
            onSendMessage={sendMessage}
            onToggleFollow={toggleFollow}
            selectedThreadId={selectedThreadId}
            isFollowing={isFollowing}
          />
        ) : null}

        {activeTab === "studio" ? (
          <StudioPanel posts={displayPosts} serviceLabel={serviceLabel} />
        ) : null}

        {activeTab === "profiles" && profileView === "profile" ? (
          <ProfilePanel
            health={health}
            onLogout={onLogout}
            onOpenSettings={() => setProfileView("settings")}
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
            profile={profile}
            theme={theme}
            themes={themeOptions}
            onThemeChange={onThemeChange}
            user={profile?.user ?? user}
          />
        ) : null}

        {selectedProfilePost ? null : <BottomNav activeTab={activeTab} onTabChange={changeTab} />}
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

function StoryHeader({ liveRooms, onOpenStream, user }: { liveRooms: LiveRoom[]; onOpenStream: (room: LiveRoom) => void; user: AuthUser }) {
  return (
    <header className="home-highlight" aria-label="Home highlight">
      <div className="highlight-topbar">
        <a className="highlight-brand" href="/" aria-label="Creators home">
          <span className="highlight-logo">C</span>
          <strong>Creators</strong>
        </a>
        <div className="highlight-actions">
          <button type="button" aria-label="Search"><span className="highlight-icon search" /></button>
          <button type="button" aria-label="Notifications"><span className="highlight-icon bell" /><i>2</i></button>
          <button type="button" aria-label="Menu"><span className="highlight-icon menu" /></button>
        </div>
      </div>

      <div className="story-header" aria-label="Live streaming channels and users">
        <button className="send-bubble" type="button" aria-label="Create">
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
        <button className="story-avatar" type="button">
          <span className="story-photo">
            <img alt={`${user.name} profile`} src={profileImageFor(user.name)} />
          </span>
          <small>{firstName(user.name)}</small>
        </button>
      </div>

      <nav className="feed-filter" aria-label="Feed visibility filters">
        <button type="button">Local</button>
        <button type="button">Global</button>
        <button className="active" type="button">Trend</button>
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
        <img className="photo-grid-main" alt="" src={post.gallery[0]} />
        {post.gallery.slice(1, 5).map((image, index) => (
          <div className="photo-tile" key={image}>
            <img alt="" src={image} />
            {index === 3 ? <span>+23</span> : null}
          </div>
        ))}

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
  onToggleFollow,
  ratingsByLiveId,
}: {
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
  onToggleFollow: (name: string) => void;
  ratingsByLiveId: Map<number, LiveRating>;
}) {
  const live = selectedLive;
  const [fullPlayer, setFullPlayer] = useState(false);
  const spotlightRooms = liveIndex?.live ?? liveRooms;
  const popularHosts = (liveIndex?.following ?? liveRooms).slice(0, 4);
  const categories = [
    { label: "All", active: true },
    { label: "Esport" },
    { label: "Channels" },
    { label: "Categories" },
    { label: "Top" },
  ];

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
      <section className="stream-screen" style={{ backgroundImage: `url("${streamImageFor((spotlightRooms[0] ?? liveRooms[0])?.id ?? 1)}")` }}>
        <div className="relative z-[2] mx-auto flex min-h-screen w-full max-w-6xl items-center px-3 pb-28 pt-4 md:px-5">
          <Fade in timeout={320}>
            <div className="w-full rounded-[34px] border border-white/10 bg-[color:rgba(8,12,20,0.78)] p-4 text-white shadow-2xl backdrop-blur-xl md:p-6">
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr),320px]">
                <div className="overflow-hidden rounded-[30px] border border-white/10 bg-black/20">
                  <div className="relative">
                    <img alt="" className="aspect-[1.08/1] w-full object-cover" src={streamImageFor((spotlightRooms[0] ?? liveRooms[0])?.id ?? 1)} />
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
                        <h2 className="text-lg font-black">Live Now</h2>
                        <IconButton className="!text-white/70">
                          <MoreHorizRounded />
                        </IconButton>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {spotlightRooms.slice(0, 4).map((room) => (
                          <button className="group overflow-hidden rounded-[22px] border border-white/8 text-left transition hover:border-[color:var(--accent)]" key={room.id} type="button" onClick={() => onOpenStream(room)}>
                            <div className="relative">
                              <img alt="" className="aspect-[0.78/1] w-full object-cover transition duration-500 group-hover:scale-105" src={streamImageFor(room.id)} />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
                              <Chip
                                label={`${compactNumber(55000 + room.id * 11)} viewers`}
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
                      <h2 className="text-lg font-black">Popular Streamers</h2>
                      <IconButton className="!text-white/70">
                        <MoreHorizRounded />
                      </IconButton>
                    </div>
                    <div className="space-y-3">
                      {popularHosts.map((room) => (
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

  return (
    <section className="stream-screen" style={{ backgroundImage: `url("${streamImageFor(live.id)}")` }}>
      <div className="relative z-[2] mx-auto flex min-h-screen max-w-6xl items-center px-3 pb-28 pt-4 md:px-4">
        <Fade in timeout={320}>
          <div className="w-full rounded-[34px] border border-white/10 bg-[color:rgba(8,12,20,0.78)] p-3 text-white shadow-2xl backdrop-blur-xl md:p-4">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr),340px]">
              <div className="overflow-hidden rounded-[30px] border border-white/10 bg-black/20">
                <div className="relative">
                  <button className="block w-full text-left" type="button" onClick={() => setFullPlayer(true)}>
                    <img alt="" className="aspect-[1.3/1] w-full object-cover object-center transition duration-500 hover:scale-[1.02]" src={streamImageFor(live.id)} />
                  </button>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/88 via-black/18 to-black/10" />
                  <div className="absolute left-3 top-3 flex items-center gap-2">
                    <IconButton className="!bg-black/35 !text-white" onClick={() => onClose()}>
                      <ArrowBackRounded />
                    </IconButton>
                    <Chip icon={<VideocamRounded />} label="Live" sx={{ color: "#fff", background: "rgba(219,46,67,0.88)", fontWeight: 800 }} />
                    <Chip label={`${compactNumber(55000 + live.id * 11)} viewers`} sx={{ color: "var(--text-dark)", background: "#68f2bf", fontWeight: 800 }} />
                  </div>
                  <div className="absolute inset-x-0 bottom-0 p-4 md:p-5">
                    <h1 className="max-w-[16ch] text-3xl font-black leading-tight text-white md:text-4xl">{live.title}</h1>
                    <p className="mt-2 text-sm text-white/70">{live.status === "live" ? "Counter-Strike • Global Offensive" : "Scheduled creator event"}</p>
                  </div>
                </div>

                <div className="p-4 md:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-white/8 bg-white/5 p-3">
                    <div className="flex items-center gap-3">
                      <Badge color="success" overlap="circular" variant="dot">
                        <Avatar src={profileImageFor(live.host)} sx={{ width: 48, height: 48 }} />
                      </Badge>
                      <div>
                        <strong className="block text-white">{live.host}</strong>
                        <small className="text-white/60">{compactNumber(followersFor(live.host))} followers</small>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <FollowPill following={following} onClick={() => onToggleFollow(live.host)} />
                      <IconButton className="!bg-white/8 !text-white">
                        <FavoriteRounded />
                      </IconButton>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {[1, 2, 3, 4, 5].map((score) => (
                      <Chip
                        clickable
                        key={score}
                        label={`${score}`}
                        onClick={() => void onRate(live.id, score)}
                        sx={{
                          width: 42,
                          color: "#fff",
                          fontWeight: 800,
                          borderRadius: "999px",
                          background: rating?.userScore === score ? "linear-gradient(135deg, var(--accent), var(--accent-2))" : "rgba(255,255,255,0.08)",
                          border: "1px solid rgba(255,255,255,0.08)",
                        }}
                      />
                    ))}
                  </div>

                  <div className="mt-5">
                    <div className="mb-3 flex items-center justify-between">
                      <h2 className="text-sm font-black uppercase tracking-[0.18em] text-white/60">More live now</h2>
                      <IconButton className="!text-white/70">
                        <MoreHorizRounded />
                      </IconButton>
                    </div>
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                      {spotlightRooms.filter((room) => room.id !== live.id).slice(0, 3).map((room) => (
                        <button className="overflow-hidden rounded-[22px] border border-white/8 text-left transition hover:border-[color:var(--accent)]" key={room.id} type="button" onClick={() => onOpenStream(room)}>
                          <div className="relative">
                            <img alt="" className="aspect-[0.95/1] w-full object-cover" src={streamImageFor(room.id)} />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
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
              </div>

              <aside className="rounded-[30px] border border-white/10 bg-[color:rgba(5,8,16,0.48)] p-4 text-white">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-black">Chat</h2>
                  <IconButton className="!text-white/70">
                    <AutoAwesomeRounded />
                  </IconButton>
                </div>
                <div className="mt-4 space-y-3">
                  {liveComments.slice(-6).map((comment) => (
                    <div className="rounded-[20px] border border-white/8 bg-white/5 p-3" key={comment.id}>
                      <p className="m-0 text-sm font-black text-[color:var(--accent-3)]">{comment.author.name}</p>
                      <EmojiText className="mt-1 block text-sm text-white/80" text={comment.body} />
                    </div>
                  ))}
                  {!liveComments.length ? <p className="text-sm text-white/55">No chat yet. Be the first one in.</p> : null}
                </div>
                <EmojiComposer
                  placeholder="Say something in chat"
                  onSubmit={(value) => onAddComment(live.id, value)}
                />

                <div className="mt-6 space-y-3">
                  <div className="rounded-[22px] border border-white/8 bg-white/5 p-3">
                    <p className="m-0 text-xs font-black uppercase tracking-[0.18em] text-white/50">Average rate</p>
                    <strong className="mt-2 block text-2xl">{rating ? rating.average.toFixed(1) : "New"}</strong>
                    <small className="text-white/60">{rating?.count ?? 0} total votes</small>
                  </div>
                  <div className="rounded-[22px] border border-white/8 bg-white/5 p-3">
                    <p className="m-0 text-xs font-black uppercase tracking-[0.18em] text-white/50">Event schedule</p>
                    <Stack spacing={1.25} sx={{ mt: 1.5 }}>
                      {(liveIndex?.scheduled ?? []).slice(0, 3).map((room) => (
                        <div className="rounded-2xl border border-white/8 bg-black/10 px-3 py-2" key={room.id}>
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-sm font-semibold">{room.title}</span>
                            <ScheduleRounded sx={{ fontSize: 16, color: "var(--accent)" }} />
                          </div>
                          <small className="text-white/60">{timeAgo(room.startsAt)}</small>
                        </div>
                      ))}
                    </Stack>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </Fade>
      </div>
      <div className="heart-float" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
      {fullPlayer ? (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-black/80 p-4 backdrop-blur-xl">
          <div className="relative w-full max-w-sm overflow-hidden rounded-[40px] border border-white/10 bg-black shadow-2xl">
            <button className="absolute left-4 top-4 z-[2] grid h-10 w-10 place-items-center rounded-full bg-black/40 text-white" type="button" onClick={() => setFullPlayer(false)}>
              <ArrowBackRounded />
            </button>
            <img alt="" className="aspect-[0.57/1] w-full object-cover" src={streamImageFor(live.id)} />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-5 text-white">
              <p className="m-0 text-xs font-black uppercase tracking-[0.2em] text-[color:var(--accent-3)]">Now Watching</p>
              <h2 className="mt-2 text-3xl font-black leading-tight">{live.title}</h2>
              <p className="mt-2 text-sm text-white/70">{live.host}</p>
              <div className="mt-4 flex items-center gap-2">
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold">{compactNumber(55000 + live.id * 11)} viewers</span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold">{rating ? `${rating.average.toFixed(1)} rating` : "New stream"}</span>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function StreamList({ title, rooms, onOpenStream }: { title: string; rooms: LiveRoom[]; onOpenStream: (room: LiveRoom) => void }) {
  return (
    <div>
      <h2>{title}</h2>
      {rooms.map((room) => (
        <button key={room.id} type="button" onClick={() => onOpenStream(room)}>
          <img alt="" src={profileImageFor(room.host)} />
          <span>{room.title}</span>
        </button>
      ))}
    </div>
  );
}

function SearchMessages({
  contacts,
  isFollowing,
  messages,
  onOpenProfile,
  onOpenThread,
  onSendMessage,
  onToggleFollow,
  selectedThreadId,
}: {
  contacts: ChatContact[];
  isFollowing: (name: string) => boolean;
  messages: ChatMessage[];
  onOpenProfile: () => void;
  onOpenThread: (contactId: string) => Promise<void>;
  onSendMessage: (body: string) => Promise<void>;
  onToggleFollow: (name: string) => void;
  selectedThreadId: string;
}) {
  const [search, setSearch] = useState("");
  const activeContact = contacts.find((contact) => contact.id === selectedThreadId);
  const visibleContacts = contacts.filter((contact) => {
    const query = search.trim().toLowerCase();
    return !query || contact.name.toLowerCase().includes(query) || (contact.subtitle ?? "").toLowerCase().includes(query);
  });
  const tabs = [
    { label: "Pinned", count: 0 },
    { label: "Chats", count: visibleContacts.length, active: true },
    { label: "Groups", count: 8 },
  ];

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
                  sx={{
                    borderRadius: "999px",
                    fontWeight: 800,
                    color: tab.active ? "var(--text-dark)" : "var(--text-3)",
                    background: tab.active ? "linear-gradient(135deg, #49d17d, #84f7a5)" : "var(--surface-3)",
                    border: tab.active ? "none" : "1px solid var(--line-soft)",
                  }}
                />
              ))}
            </div>

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
                        <small className="block truncate text-xs text-[color:var(--text-3)]">{contact.lastBody || contact.subtitle}</small>
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
                  <p className="m-0 text-sm text-white/50">{activeContact?.subtitle ?? "Direct conversation"}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <IconButton className="!text-white/75">
                  <PhoneRounded />
                </IconButton>
                <IconButton className="!text-white/75">
                  <VideocamOutlined />
                </IconButton>
                <IconButton className="!text-white/75">
                  <MoreHorizRounded />
                </IconButton>
              </div>
            </div>

            <div className="mt-4 rounded-[28px] border border-white/6 bg-black/10 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white/40">
                <CommentRounded sx={{ fontSize: 18 }} />
                WhatsApp-style thread flow
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

function StudioPanel({ posts, serviceLabel }: { posts: DisplayPost[]; serviceLabel: string }) {
  const topPosts = posts.slice(0, 3);
  const topBoost = topPosts[0]?.promotionScore ?? 0;
  const totalReach = topPosts.reduce((total, post) => total + post.likes + post.comments, 0);

  return (
    <section className="studio-panel">
      <header className="studio-panel-head">
        <p>Creator workspace</p>
        <h1>Studio</h1>
      </header>

      <article className="studio-status-card">
        <span>Live stack</span>
        <strong>{serviceLabel}</strong>
        <p>Your creator tools are ready for posts, promotions, comments, and profile updates.</p>
      </article>

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
          <img alt="" src={post.gallery[0]} />
          <span>
            <strong>{post.author.name}</strong>
            <small>{post.promotionScore}% trend score · {post.mood}</small>
          </span>
          <button type="button">Promote</button>
        </article>
      ))}
    </section>
  );
}

function ProfilePanel({
  followersCount,
  followingCount,
  health,
  onLogout,
  onOpenSettings,
  posts,
  profile,
  user,
}: {
  followersCount: number;
  followingCount: number;
  health: HealthResponse | null;
  onLogout: () => void;
  onOpenSettings: () => void;
  posts: DisplayPost[];
  profile: ProfileResponse | null;
  user: AuthUser;
}) {
  const profilePosts = posts.slice(0, 4);
  const streak = 7 + (posts.length % 5);

  return (
    <section className="profile-panel">
      <Fade in timeout={450}>
        <div className="mx-auto grid min-h-[calc(100vh-96px)] max-w-6xl gap-4 lg:grid-cols-[minmax(0,1.35fr),360px]">
          <div className="space-y-4">
            <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, borderRadius: "32px", background: "linear-gradient(180deg, color-mix(in srgb, var(--surface-1) 82%, transparent), color-mix(in srgb, var(--surface-3) 92%, transparent))", color: "var(--text-1)", border: "1px solid var(--line-soft)" }}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-4">
                  <Badge overlap="circular" badgeContent={<AutoAwesomeRounded sx={{ fontSize: 14, color: "#fff" }} />} color="primary">
                    <Avatar src={profileImageFor(user.name)} sx={{ width: 96, height: 96, border: "3px solid color-mix(in srgb, var(--accent) 45%, transparent)" }} />
                  </Badge>
                  <div>
                    <h1 className="text-2xl font-black md:text-3xl">{user.name}</h1>
                    <p className="mt-1 text-sm font-semibold text-[color:var(--text-3)]">{profile?.headline || "Digital creator"}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Chip icon={<GroupsRounded />} label={`${compactNumber(followersCount)} followers`} sx={{ color: "var(--text-1)", background: "var(--chip-bg)", border: "1px solid var(--line-soft)" }} />
                      <Chip icon={<FavoriteRounded />} label={`${streak} day streak`} sx={{ color: "var(--text-1)", background: "var(--chip-bg)", border: "1px solid var(--line-soft)" }} />
                    </div>
                  </div>
                </div>
                <IconButton className="!text-[color:var(--accent)]" onClick={onOpenSettings}>
                  <SettingsRounded />
                </IconButton>
              </div>

              <EmojiText className="mt-5 block max-w-3xl text-sm leading-7 text-[color:var(--text-2)]" text={profile?.bio || "Shape your creator identity, publish drops, and keep your audience close. :sparkles:"} />

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <Paper elevation={0} sx={{ p: 1.75, borderRadius: "22px", background: "var(--surface-2)", border: "1px solid var(--line-soft)" }}>
                  <p className="m-0 text-xs font-black uppercase tracking-[0.16em] text-[color:var(--text-3)]">Posts</p>
                  <strong className="mt-2 block text-xl">{posts.length}</strong>
                </Paper>
                <Paper elevation={0} sx={{ p: 1.75, borderRadius: "22px", background: "var(--surface-2)", border: "1px solid var(--line-soft)" }}>
                  <p className="m-0 text-xs font-black uppercase tracking-[0.16em] text-[color:var(--text-3)]">Following</p>
                  <strong className="mt-2 block text-xl">{followingCount}</strong>
                </Paper>
                <Paper elevation={0} sx={{ p: 1.75, borderRadius: "22px", background: "var(--surface-2)", border: "1px solid var(--line-soft)" }}>
                  <p className="m-0 text-xs font-black uppercase tracking-[0.16em] text-[color:var(--text-3)]">Service</p>
                  <strong className="mt-2 block text-xl">{health?.status === "ok" ? "Live" : "Syncing"}</strong>
                </Paper>
              </div>
            </Paper>

            <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, borderRadius: "32px", background: "var(--panel-elevated)", color: "var(--text-1)", border: "1px solid var(--line-soft)" }}>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="m-0 text-xs font-black uppercase tracking-[0.16em] text-[color:var(--text-3)]">Portfolio</p>
                  <h2 className="mt-1 text-xl font-black">Photos, videos, and promoted drops</h2>
                </div>
                <Button onClick={onOpenSettings} sx={{ borderRadius: "999px", color: "#fff", px: 2, background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }} variant="contained">
                  Edit profile
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {profilePosts.map((post, index) => (
                  <div className={`group relative overflow-hidden rounded-[26px] border border-[color:var(--line-soft)] ${index === 0 ? "sm:col-span-2" : ""}`} key={post.id}>
                    <img alt="" className={`h-full w-full object-cover transition duration-500 group-hover:scale-105 ${index === 0 ? "aspect-[1.8/1]" : "aspect-square"}`} src={post.gallery[0]} />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 text-white">
                      <p className="m-0 text-sm font-black">{post.mood}</p>
                      <p className="m-0 mt-1 text-xs text-white/75">{post.promotionScore}% trend score</p>
                    </div>
                  </div>
                ))}
              </div>
            </Paper>
          </div>

          <div className="space-y-4">
            <Paper elevation={0} sx={{ p: 2.5, borderRadius: "30px", background: "var(--panel-elevated)", color: "var(--text-1)", border: "1px solid var(--line-soft)" }}>
              <p className="m-0 text-xs font-black uppercase tracking-[0.16em] text-[color:var(--text-3)]">Creator pulse</p>
              <div className="mt-4 space-y-4">
                <div>
                  <div className="mb-2 flex items-center justify-between text-sm font-semibold">
                    <span>Audience warmth</span>
                    <span>{Math.min(96, 74 + posts.length)}%</span>
                  </div>
                  <LinearProgress sx={{ height: 10, borderRadius: "999px", background: "rgba(255,255,255,0.08)", "& .MuiLinearProgress-bar": { borderRadius: "999px", background: "linear-gradient(135deg, var(--accent), var(--accent-2))" } }} value={Math.min(96, 74 + posts.length)} variant="determinate" />
                </div>
                <div className="rounded-[24px] border border-[color:var(--line-soft)] bg-[color:var(--surface-3)] p-4">
                  <p className="m-0 text-sm font-bold">Profile flow</p>
                  <p className="m-0 mt-1 text-sm text-[color:var(--text-3)]">Responsive cards, smoother transitions, and stronger hierarchy now anchor the profile experience.</p>
                </div>
              </div>
            </Paper>

            <Button className="!rounded-[18px]" fullWidth onClick={onLogout} sx={{ minHeight: 52, color: "var(--accent)", background: "var(--chip-bg)", border: "1px solid var(--line-soft)" }}>
              Sign out
            </Button>
          </div>
        </div>
      </Fade>
    </section>
  );
}

function ProfileSettingsPanel({
  onBack,
  onLogout,
  onSaveProfile,
  onThemeChange,
  profile,
  theme,
  themes,
  user,
}: {
  onBack: () => void;
  onLogout: () => void;
  onSaveProfile: (input: { name: string; bio: string; headline: string; location: string }) => Promise<void>;
  onThemeChange: (theme: ThemeName) => void;
  profile: ProfileResponse | null;
  theme: ThemeName;
  themes: typeof themeOptions;
  user: AuthUser;
}) {
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [headline, setHeadline] = useState(profile?.headline ?? "Creator");
  const [location, setLocation] = useState(profile?.location ?? "");
  const [name, setName] = useState(user.name);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(user.name);
    setBio(profile?.bio ?? "");
    setHeadline(profile?.headline ?? "Creator");
    setLocation(profile?.location ?? "");
  }, [profile?.bio, profile?.headline, profile?.location, user.name]);

  async function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      await onSaveProfile({ name, bio, headline, location });
      onBack();
    } finally {
      setSaving(false);
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
        <img alt="" src={profileImageFor(user.name)} />
        <h1>{user.name}</h1>
        <p>{user.email}</p>
        <button type="button">View profile</button>
      </div>

      <form id="profile-settings-form" className="settings-form" onSubmit={(event) => void submitProfile(event)}>
        <label>Name<input value={name} onChange={(event) => setName(event.target.value)} /></label>
        <label>Headline<input value={headline} onChange={(event) => setHeadline(event.target.value)} /></label>
        <label>Location<input value={location} onChange={(event) => setLocation(event.target.value)} /></label>
        <label>Bio<textarea value={bio} onChange={(event) => setBio(event.target.value)} /></label>
      </form>

      <div className="settings-list">
        <button type="button"><span>Show me away</span><strong>Off</strong></button>
        <button type="button"><span>My Profile</span><strong>Edit</strong></button>
        <button type="button"><span>Join a Team</span><strong>New</strong></button>
        <button type="button"><span>Share Profile</span><strong>Copy</strong></button>
        <button type="button"><span>Activity Sync</span><strong>On</strong></button>
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

function PublicProfileScreen({ post, onBack }: { post: DisplayPost; onBack: () => void }) {
  const followerCount = compactNumber(24000 + post.id * 7);
  const followingCount = compactNumber(180 + (post.id % 90));
  const creationCount = compactNumber(680 + (post.id % 160));
  const gallery = post.gallery.length >= 3 ? post.gallery : [postImageFor(post.id), postImageFor(post.id + 1), postImageFor(post.id + 2)];
  const handle = `@${post.author.name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")}`;

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
            <span><strong>{followingCount}</strong> Following</span>
            <span><strong>{followerCount}</strong> Followers</span>
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
            <span>{index === 0 ? "Latest drop" : post.tags[index % post.tags.length]}</span>
          </button>
        ))}
      </div>
    </section>
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
  const mapped = posts.map<DisplayPost>((post, index) => ({
    ...post,
    comments: 348 - index * 32,
    gallery: [postImageFor(post.id), postImageFor(post.id + 1), postImageFor(post.id + 2), postImageFor(post.id + 3), postImageFor(post.id + 4)],
    likes: 1125 - index * 121,
    promotionScore: Math.max(44, Math.min(99, 96 - index * 6 + (post.id % 7))),
    tags: [post.mood.toLowerCase().replace(/\s+/g, ""), "creator"],
  }));
  return mapped.sort((left, right) => right.promotionScore - left.promotionScore);
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

function profileImageFor(seed: string) {
  const images = [
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=240&q=80",
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=240&q=80",
    "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=240&q=80",
    "https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=240&q=80",
    "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=240&q=80",
    "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=240&q=80",
  ];
  return images[indexFor(seed, images.length)];
}

function postImageFor(seed: number) {
  const images = [
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1000&q=82",
    "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1000&q=82",
    "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1000&q=82",
    "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1000&q=82",
    "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&w=1000&q=82",
    "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=1000&q=82",
    "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1000&q=82",
    "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1000&q=82",
  ];
  return images[Math.abs(seed) % images.length];
}

function streamImageFor(seed: number) {
  const images = [
    "https://images.unsplash.com/photo-1509967419530-da38b4704bc6?auto=format&fit=crop&w=1000&q=82",
    "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1000&q=82",
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1000&q=82",
  ];
  return images[Math.abs(seed) % images.length];
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
