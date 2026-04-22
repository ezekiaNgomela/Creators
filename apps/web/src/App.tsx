import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  clearStoredToken,
  createPost,
  fetchCurrentUser,
  fetchFeed,
  fetchHealth,
  getGoogleAuthUrl,
  loginAccount,
  logoutAccount,
  registerAccount,
  storeToken,
  type AuthUser,
  type FeedPost,
  type HealthResponse,
  type LiveRoom,
} from "./api";

type AuthMode = "login" | "register";
type HomeView = "feed" | "live" | "posts" | "studio";

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

const moodOptions = ["Update", "Launch", "Question", "Behind the scenes"];

const homeViews: Array<{ id: HomeView; label: string }> = [
  { id: "feed", label: "Feed" },
  { id: "live", label: "Live" },
  { id: "posts", label: "Posts" },
  { id: "studio", label: "Studio" },
];

export default function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode | null>(null);
  const [notice, setNotice] = useState("");
  const [sessionLoading, setSessionLoading] = useState(true);

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
      <Home
        health={health}
        notice={notice}
        serviceLabel={serviceLabel}
        user={user}
        onDismissNotice={() => setNotice("")}
        onLogout={() => void handleLogout()}
        onNotice={setNotice}
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

function Home({
  health,
  notice,
  serviceLabel,
  user,
  onDismissNotice,
  onLogout,
  onNotice,
}: {
  health: HealthResponse | null;
  notice: string;
  serviceLabel: string;
  user: AuthUser;
  onDismissNotice: () => void;
  onLogout: () => void;
  onNotice: (message: string) => void;
}) {
  const [liveRooms, setLiveRooms] = useState<LiveRoom[]>([]);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [body, setBody] = useState("");
  const [mood, setMood] = useState(moodOptions[0]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [feedError, setFeedError] = useState("");
  const [activeView, setActiveView] = useState<HomeView>("feed");

  const activeLabel = homeViews.find((item) => item.id === activeView)?.label ?? "Feed";

  async function loadFeed() {
    setLoading(true);
    setFeedError("");
    try {
      const feed = await fetchFeed();
      setLiveRooms(feed.liveRooms);
      setPosts(feed.posts);
    } catch (err) {
      setFeedError(err instanceof Error ? err.message : "Could not load feed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadFeed();
  }, []);

  async function handlePublish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPublishing(true);
    setFeedError("");
    try {
      const post = await createPost({ body, mood });
      setPosts((current) => [post, ...current]);
      setBody("");
      setMood(moodOptions[0]);
      onNotice("Post published.");
    } catch (err) {
      setFeedError(err instanceof Error ? err.message : "Could not publish post");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <main className="home-shell">
      <aside className="home-sidebar" aria-label="Workspace navigation">
        <a className="home-brand" href="/">
          <span className="brand-mark" aria-hidden="true">C</span>
          <span>Creators</span>
        </a>
        <nav className="home-nav">
          {homeViews.map((item) => (
            <button
              aria-current={activeView === item.id ? "page" : undefined}
              className={activeView === item.id ? "is-active" : ""}
              key={item.id}
              type="button"
              onClick={() => setActiveView(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-status">
          <span className={health?.status === "ok" ? "status-dot is-up" : "status-dot"} />
          <div>
            <strong>{serviceLabel}</strong>
            <span>{health ? `${health.checks.postgres}/${health.checks.redis}/${health.checks.minio}` : "checking"}</span>
          </div>
        </div>
      </aside>

      <section className="home-main" id="feed">
        <header className="home-header">
          <div>
            <p className="section-kicker">Home - {activeLabel}</p>
            <h1>{activeView === "feed" ? "For you" : activeLabel}</h1>
            <p>{homeViewCopy(activeView, user.name)}</p>
          </div>
          <div className="home-actions">
            <button className="ghost-button on-light" type="button" onClick={() => void loadFeed()} disabled={loading}>
              Refresh
            </button>
            <button className="solid-button" type="button" onClick={onLogout}>
              Sign out
            </button>
          </div>
        </header>

        {feedError ? <p className="feed-error">{feedError}</p> : null}

        <div className="home-outlet" aria-live="polite">
          {activeView === "feed" ? (
            <>
              <LiveStoryStrip liveRooms={liveRooms} onOpenLive={() => setActiveView("live")} />
              <Composer
                body={body}
                mood={mood}
                publishing={publishing}
                user={user}
                onBodyChange={setBody}
                onMoodChange={setMood}
                onPublish={handlePublish}
              />
              <PostFeed loading={loading} posts={posts} title="For you" />
            </>
          ) : null}

          {activeView === "live" ? (
            <LiveOutlet liveRooms={liveRooms} />
          ) : null}

          {activeView === "posts" ? (
            <>
              <Composer
                body={body}
                mood={mood}
                publishing={publishing}
                user={user}
                onBodyChange={setBody}
                onMoodChange={setMood}
                onPublish={handlePublish}
              />
              <PostFeed loading={loading} posts={posts} title="Latest posts" />
            </>
          ) : null}

          {activeView === "studio" ? (
            <StudioOutlet health={health} posts={posts} user={user} />
          ) : null}
        </div>
      </section>

      <aside className="live-rail" id="live" aria-label="Live feed">
        <div className="live-rail-header">
          <p className="section-kicker">Now</p>
          <h2>Live rooms</h2>
        </div>
        <LiveRoomList compact liveRooms={liveRooms} />
      </aside>

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

function LiveStoryStrip({ liveRooms, onOpenLive }: { liveRooms: LiveRoom[]; onOpenLive: () => void }) {
  return (
    <section className="live-story-strip" aria-label="Live stories">
      {liveRooms.map((room) => (
        <button className="live-story" key={room.id} type="button" onClick={onOpenLive}>
          <span className="story-ring">
            <img alt={`${room.host} profile`} src={profileImageFor(room.host)} />
          </span>
          <span className="story-name">{room.host}</span>
          <span className="story-time">{room.status === "live" ? timeAgo(room.startsAt) : `in ${timeUntil(room.startsAt)}`}</span>
        </button>
      ))}
    </section>
  );
}

function Composer({
  body,
  mood,
  publishing,
  user,
  onBodyChange,
  onMoodChange,
  onPublish,
}: {
  body: string;
  mood: string;
  publishing: boolean;
  user: AuthUser;
  onBodyChange: (value: string) => void;
  onMoodChange: (value: string) => void;
  onPublish: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
}) {
  return (
    <section className="composer-panel" id="posts" aria-label="Create post">
      <img className="avatar-img" alt="" src={profileImageFor(user.name)} />
      <form className="composer-form" onSubmit={(event) => onPublish(event)}>
        <textarea
          value={body}
          maxLength={500}
          rows={4}
          placeholder="What are you making right now?"
          onChange={(event) => onBodyChange(event.target.value)}
          required
        />
        <div className="composer-tools">
          <label>
            <span>Mood</span>
            <select value={mood} onChange={(event) => onMoodChange(event.target.value)}>
              {moodOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>
          <span className="character-count">{body.length}/500</span>
          <button className="solid-button" type="submit" disabled={publishing || body.trim().length === 0}>
            {publishing ? "Posting..." : "Post"}
          </button>
        </div>
      </form>
    </section>
  );
}

function PostFeed({ loading, posts, title }: { loading: boolean; posts: FeedPost[]; title: string }) {
  return (
    <section className="post-feed" aria-label="Post feed">
      <div className="feed-heading">
        <h2>{title}</h2>
        <span>{posts.length} updates</span>
      </div>
      {loading ? <p className="feed-muted">Loading the latest creator posts...</p> : null}
      {!loading && posts.length === 0 ? (
        <div className="empty-feed">
          <h3>No posts yet</h3>
          <p>Publish the first update and it will appear here for the signed-in home feed.</p>
        </div>
      ) : null}
      {posts.map((post) => (
        <article className="feed-post social-post" key={post.id}>
          <header className="social-post-header">
            <img className="avatar-img" alt="" src={profileImageFor(post.author.name)} />
            <div>
              <strong>{post.author.name}</strong>
              <span>{post.mood} - {timeAgo(post.createdAt)}</span>
            </div>
          </header>
          <div className="post-media" style={{ backgroundImage: `url("${postImageFor(post.id)}")` }}>
            <div className="post-media-overlay">
              <span>{post.mood}</span>
              <p>{post.body}</p>
            </div>
          </div>
          <div className="post-actions" aria-label="Post actions">
            <button type="button" title="Like">Like</button>
            <button type="button" title="Comment">Reply</button>
            <button type="button" title="Share">Share</button>
          </div>
        </article>
      ))}
    </section>
  );
}

function LiveOutlet({ liveRooms }: { liveRooms: LiveRoom[] }) {
  return (
    <section className="live-outlet">
      <LiveStoryStrip liveRooms={liveRooms} onOpenLive={() => undefined} />
      <LiveRoomList liveRooms={liveRooms} />
    </section>
  );
}

function LiveRoomList({ compact = false, liveRooms }: { compact?: boolean; liveRooms: LiveRoom[] }) {
  return (
    <div className={compact ? "live-room-list is-compact" : "live-room-list"}>
      {liveRooms.map((room) => (
        <article className={`live-room accent-${room.accent}`} key={room.id}>
          <img className="live-cover" alt={`${room.host} profile`} src={profileImageFor(room.host)} />
          <div className="live-room-body">
            <div className="live-room-top">
              <span>{room.status}</span>
              <strong>{room.viewers} watching</strong>
            </div>
            <h3>{room.title}</h3>
            <p>{room.host}</p>
            <small>{room.status === "live" ? `Made live ${timeAgo(room.startsAt)}` : `Starts in ${timeUntil(room.startsAt)}`}</small>
          </div>
        </article>
      ))}
    </div>
  );
}

function StudioOutlet({ health, posts, user }: { health: HealthResponse | null; posts: FeedPost[]; user: AuthUser }) {
  return (
    <section className="studio-outlet">
      <div className="studio-profile">
        <img className="studio-cover" alt="" src={postImageFor(user.id)} />
        <img className="studio-avatar" alt="" src={profileImageFor(user.name)} />
        <h2>{user.name}</h2>
        <p>{user.email}</p>
      </div>
      <div className="studio-metrics">
        <div>
          <strong>{posts.length}</strong>
          <span>posts</span>
        </div>
        <div>
          <strong>{health?.status === "ok" ? "Live" : "Syncing"}</strong>
          <span>backend</span>
        </div>
        <div>
          <strong>{user.provider}</strong>
          <span>auth</span>
        </div>
      </div>
    </section>
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

function timeUntil(value: string) {
  const date = new Date(value);
  const seconds = Math.max(0, Math.round((date.getTime() - Date.now()) / 1000));
  if (seconds < 60) {
    return "a moment";
  }
  if (seconds < 3600) {
    return `${Math.round(seconds / 60)} minutes`;
  }
  if (seconds < 86400) {
    return `${Math.round(seconds / 3600)} hours`;
  }
  return `${Math.round(seconds / 86400)} days`;
}

function homeViewCopy(view: HomeView, name: string) {
  switch (view) {
    case "live":
      return "Creators currently live, with profile covers, host names, and when each room started.";
    case "posts":
      return "Write updates and watch the post feed refresh from the backend.";
    case "studio":
      return `Your signed-in profile and service state, ${name}.`;
    default:
      return `Welcome back, ${name}. Swipe the live covers, post an update, and keep moving.`;
  }
}

function profileImageFor(seed: string) {
  const images = [
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=240&q=80",
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=240&q=80",
    "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=240&q=80",
    "https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=240&q=80",
    "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=240&q=80",
  ];
  return images[indexFor(seed, images.length)];
}

function postImageFor(seed: number) {
  const images = [
    "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=1000&q=82",
    "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1000&q=82",
    "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1000&q=82",
    "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1000&q=82",
    "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1000&q=82",
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
