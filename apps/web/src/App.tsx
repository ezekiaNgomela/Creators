import { FormEvent, useEffect, useMemo, useState } from "react";
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

const fallbackPosts: DisplayPost[] = [
  {
    id: 901,
    author: {
      id: 901,
      createdAt: new Date().toISOString(),
      email: "christina@creators.local",
      name: "Christina Kennedy",
      provider: "seed",
    },
    body: "The state of Utah in the United States is home to lots of beautiful National Parks, and Bryce Canyon National Park ranks as three of the most magnificent.",
    comments: 348,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    gallery: [postImageFor(1), postImageFor(2), postImageFor(3), postImageFor(4), postImageFor(5)],
    likes: 1125,
    mood: "Travel",
    promotionScore: 94,
    tags: ["relax", "travel"],
  },
  {
    id: 902,
    author: {
      id: 902,
      createdAt: new Date().toISOString(),
      email: "gerald@creators.local",
      name: "Gerald Thomas",
      provider: "seed",
    },
    body: "St. Urber is one of the biggest superstars to have emerged from the professional maker world this year.",
    comments: 128,
    createdAt: new Date(Date.now() - 2.6 * 60 * 60 * 1000).toISOString(),
    gallery: [postImageFor(6), postImageFor(7), postImageFor(8), postImageFor(9)],
    likes: 784,
    mood: "Creators",
    promotionScore: 88,
    tags: ["studio", "creator"],
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
  const [liveIndex, setLiveIndex] = useState<LiveIndex | null>(null);
  const [liveRooms, setLiveRooms] = useState<LiveRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [profileView, setProfileView] = useState<ProfileView>("profile");
  const [selectedProfilePost, setSelectedProfilePost] = useState<DisplayPost | null>(null);
  const [selectedLiveId, setSelectedLiveId] = useState<number | null>(null);
  const [selectedThreadId, setSelectedThreadId] = useState("alejandro-hicks");

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
      const feed = await fetchFeed();
      setLiveRooms(feed.liveRooms);
      setPosts(feed.posts);
      setLiveIndex(await fetchLiveIndex());
      setProfile(await fetchProfile());
      setChatContacts(await fetchChatContacts());
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
    const message = await sendChatMessage({ contactId: selectedThreadId, body });
    setChatMessages((current) => [...current, message]);
    setChatContacts(await fetchChatContacts());
  }

  async function saveProfile(input: { name: string; bio: string; headline: string; location: string }) {
    setProfile(await updateProfile(input));
  }

  function changeTab(tab: HomeTab) {
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
              loading={loading}
              onAddComment={addPostComment}
              onLoadComments={loadPostComments}
              onOpenProfile={setSelectedProfilePost}
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
            ratingsByLiveId={ratingsByLiveId}
            selectedLive={selectedLive}
          />
        ) : null}

        {activeTab === "messages" ? (
          <SearchMessages
            contacts={chatContacts}
            messages={chatMessages}
            onOpenProfile={() => changeTab("profiles")}
            onOpenThread={openThread}
            onSendMessage={sendMessage}
            selectedThreadId={selectedThreadId}
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
  loading,
  onAddComment,
  onLoadComments,
  onOpenProfile,
  posts,
}: {
  comments: Comment[];
  loading: boolean;
  onAddComment: (postId: number, body: string) => Promise<void>;
  onLoadComments: (postId: number) => Promise<void>;
  onOpenProfile: (post: DisplayPost) => void;
  posts: DisplayPost[];
}) {
  if (loading) {
    return <p className="feed-muted">Loading the home feed...</p>;
  }

  return (
    <section className="home-feed" aria-label="Home feed">
      {posts.map((post) => (
        <FeedCard comments={comments.filter((comment) => comment.targetType === "post" && comment.targetId === post.id)} key={post.id} onAddComment={onAddComment} onLoadComments={onLoadComments} onOpenProfile={onOpenProfile} post={post} />
      ))}
    </section>
  );
}

function FeedCard({
  comments,
  onAddComment,
  onLoadComments,
  onOpenProfile,
  post,
}: {
  comments: Comment[];
  onAddComment: (postId: number, body: string) => Promise<void>;
  onLoadComments: (postId: number) => Promise<void>;
  onOpenProfile: (post: DisplayPost) => void;
  post: DisplayPost;
}) {
  const [commentText, setCommentText] = useState("");
  const [promoted, setPromoted] = useState(false);
  const [promoteCount, setPromoteCount] = useState(post.likes);
  const [open, setOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareStatus, setShareStatus] = useState("");

  async function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!commentText.trim()) {
      return;
    }
    await onAddComment(post.id, commentText);
    setCommentText("");
    setOpen(true);
  }

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
          <button type="button">FOLLOW</button>
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
        <section className="comment-panel">
          {comments.map((comment) => (
            <p key={comment.id}><strong>{comment.author.name}</strong> {comment.body}</p>
          ))}
          <form onSubmit={(event) => void submitComment(event)}>
            <input value={commentText} placeholder="Write a comment" onChange={(event) => setCommentText(event.target.value)} />
            <button type="submit">Send</button>
          </form>
        </section>
      ) : null}
    </article>
  );
}

function StreamScreen({
  comments,
  liveIndex,
  liveRooms,
  onAddComment,
  selectedLive,
  onClose,
  onLoadComments,
  onOpenStream,
  onRate,
  ratingsByLiveId,
}: {
  comments: Comment[];
  liveIndex: LiveIndex | null;
  liveRooms: LiveRoom[];
  onAddComment: (liveId: number, body: string) => Promise<void>;
  selectedLive: LiveRoom | null;
  onClose: () => void;
  onLoadComments: (liveId: number) => Promise<void>;
  onOpenStream: (room: LiveRoom) => void;
  onRate: (liveRoomId: number, score: number) => Promise<void>;
  ratingsByLiveId: Map<number, LiveRating>;
}) {
  const live = selectedLive ?? liveRooms[0];
  const [commentText, setCommentText] = useState("");

  useEffect(() => {
    if (live) {
      void onLoadComments(live.id);
    }
  }, [live?.id]);

  if (!live) {
    return (
      <section className="empty-stream">
        <button type="button" onClick={onClose}>x</button>
        <h1>No streams yet</h1>
      </section>
    );
  }

  async function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!live || !commentText.trim()) {
      return;
    }
    await onAddComment(live.id, commentText);
    setCommentText("");
  }

  const rating = ratingsByLiveId.get(live.id);

  return (
    <section className="stream-screen" style={{ backgroundImage: `url("${streamImageFor(live.id)}")` }}>
      <button className="stream-close" type="button" onClick={onClose}>x</button>
      <header className="stream-host">
        <img alt="" src={profileImageFor(live.host)} />
        <div>
          <strong>{live.host}</strong>
          <span>{elapsedTime(live.startsAt)}</span>
        </div>
      </header>

      <aside className="stream-switcher" aria-label="Other streams">
        {(liveIndex?.following ?? liveRooms).map((room) => (
          <button key={room.id} type="button" onClick={() => onOpenStream(room)}>
            <img alt="" src={profileImageFor(room.host)} />
          </button>
        ))}
      </aside>

      <div className="stream-share">Share with friends</div>
      <div className="stream-comments">
        <p><strong>Rating</strong> {rating ? `${rating.average.toFixed(1)} from ${rating.count}` : "No ratings yet"}</p>
        {comments.filter((comment) => comment.targetType === "live" && comment.targetId === live.id).slice(-3).map((comment) => (
          <p key={comment.id}><strong>{comment.author.name}</strong> {comment.body}</p>
        ))}
        <form onSubmit={(event) => void submitComment(event)}>
          <input value={commentText} placeholder="Comment live" onChange={(event) => setCommentText(event.target.value)} />
          <button type="submit">Send</button>
        </form>
      </div>
      <div className="stream-rate" aria-label="Rate stream">
        {[1, 2, 3, 4, 5].map((score) => (
          <button className={rating?.userScore === score ? "active" : ""} key={score} type="button" onClick={() => void onRate(live.id, score)}>{score}</button>
        ))}
      </div>
      <section className="stream-lists">
        <StreamList title="Live" rooms={liveIndex?.live ?? liveRooms} onOpenStream={onOpenStream} />
        <StreamList title="Events" rooms={liveIndex?.scheduled ?? []} onOpenStream={onOpenStream} />
        <StreamList title="Previous" rooms={liveIndex?.previous ?? []} onOpenStream={onOpenStream} />
      </section>
      <div className="heart-float" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
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
  messages,
  onOpenProfile,
  onOpenThread,
  onSendMessage,
  selectedThreadId,
}: {
  contacts: ChatContact[];
  messages: ChatMessage[];
  onOpenProfile: () => void;
  onOpenThread: (contactId: string) => Promise<void>;
  onSendMessage: (body: string) => Promise<void>;
  selectedThreadId: string;
}) {
  const [messageText, setMessageText] = useState("");
  const activeContact = contacts.find((contact) => contact.id === selectedThreadId);

  async function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!messageText.trim()) {
      return;
    }
    await onSendMessage(messageText);
    setMessageText("");
  }

  return (
    <section className="search-panel">
      <button className="panel-close" type="button">x</button>
      <h1>Messages</h1>
      <label className="search-box">
        <span>Search</span>
        <input placeholder="Search" />
      </label>
      <div className="recent-head">
        <h2>Connected people</h2>
        <button type="button" onClick={onOpenProfile}>Profile</button>
      </div>
      <div className="people-list">
        {contacts.map((contact) => (
          <article className={contact.id === selectedThreadId ? "active" : ""} key={contact.id}>
            <button className="person-button" type="button" onClick={() => void onOpenThread(contact.id)}>
              <img alt="" src={profileImageFor(contact.name)} />
              <span>
                <strong>{contact.name}</strong>
                <small>{contact.lastBody || contact.subtitle}</small>
              </span>
            </button>
            <button className="follow-pill" type="button">FOLLOW</button>
          </article>
        ))}
      </div>
      <section className="chat-thread">
        <h2>{activeContact?.name ?? "Chat"}</h2>
        <div className="chat-bubbles">
          {messages.map((message) => (
            <p className={message.own ? "own" : ""} key={message.id}>{message.body}</p>
          ))}
        </div>
        <form onSubmit={(event) => void submitMessage(event)}>
          <input value={messageText} placeholder="Message" onChange={(event) => setMessageText(event.target.value)} />
          <button type="submit">Send</button>
        </form>
      </section>
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
  health,
  onLogout,
  onOpenSettings,
  posts,
  profile,
  user,
}: {
  health: HealthResponse | null;
  onLogout: () => void;
  onOpenSettings: () => void;
  posts: DisplayPost[];
  profile: ProfileResponse | null;
  user: AuthUser;
}) {
  const profilePosts = posts.slice(0, 4);

  return (
    <section className="profile-panel">
      <header className="profile-top-actions">
        <span>Profile</span>
        <button className="round-icon settings" type="button" onClick={onOpenSettings} aria-label="Open profile settings">
          Settings
        </button>
      </header>

      <div className="own-profile-hero">
        <div className="own-profile-avatar">
          <img alt="" src={profileImageFor(user.name)} />
        </div>
        <h1>{user.name}</h1>
        <p>{profile?.headline || "Digital creator"}</p>
        <button className="mini-follow" type="button" onClick={onOpenSettings}>
          Edit profile
        </button>
      </div>

      <div className="profile-stats">
        <span><strong>{posts.length}</strong> Posts</span>
        <span><strong>{health?.status === "ok" ? "Live" : "Sync"}</strong> API</span>
        <span><strong>{user.provider}</strong> Auth</span>
      </div>

      <p className="profile-summary">{profile?.bio || "Shape your creator identity, publish drops, and keep your audience close."}</p>

      <div className="profile-section-head">
        <h2>Photos & Videos</h2>
        <button type="button">View all</button>
      </div>
      <div className="profile-mini-gallery">
        {profilePosts.map((post) => (
          <img alt="" key={post.id} src={post.gallery[0]} />
        ))}
      </div>
      <button className="logout-link" type="button" onClick={onLogout}>Sign out</button>
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
  return [...mapped, ...fallbackPosts].sort((left, right) => right.promotionScore - left.promotionScore);
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




