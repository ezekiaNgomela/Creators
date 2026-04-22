import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  clearStoredToken,
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
type HomeView = "home" | "live" | "studio" | "channels" | "profile";

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

const homeViews: Array<{ id: HomeView; label: string }> = [
  { id: "home", label: "Home" },
  { id: "live", label: "Live" },
  { id: "studio", label: "Studio" },
  { id: "channels", label: "Channels" },
  { id: "profile", label: "Profile" },
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
  const [loading, setLoading] = useState(true);
  const [feedError, setFeedError] = useState("");
  const [activeView, setActiveView] = useState<HomeView>("home");
  const [selectedLiveId, setSelectedLiveId] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const activeLabel = homeViews.find((item) => item.id === activeView)?.label ?? "Home";
  const selectedLive = liveRooms.find((room) => room.id === selectedLiveId) ?? liveRooms[0] ?? null;
  const promotedPosts = useMemo(() => posts.map((post, index) => ({
    ...post,
    promotionScore: promotionScoreFor(post, index),
  })).sort((left, right) => right.promotionScore - left.promotionScore), [posts]);

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

  function openLive(room: LiveRoom) {
    setSelectedLiveId(room.id);
    setActiveView("live");
  }

  return (
    <main className="home-shell">
      <header className="mobile-topbar">
        <button className="mini-menu" type="button" aria-label="Open menu" onClick={() => setMenuOpen((open) => !open)}>
          <span />
          <span />
        </button>
        <a className="home-brand" href="/" aria-label="Creators home">
          <span className="brand-mark" aria-hidden="true">C</span>
          <span>Creators</span>
        </a>
        <button className="profile-chip" type="button" onClick={() => setActiveView("profile")}>
          <img alt="" src={profileImageFor(user.name)} />
          <span>{user.name}</span>
        </button>
      </header>

      {menuOpen ? (
        <div className="quick-menu">
          <button type="button" onClick={() => void loadFeed()} disabled={loading}>Refresh feed</button>
          <button type="button" onClick={onLogout}>Sign out</button>
        </div>
      ) : null}

      <section className="home-main">
        <header className="home-header glass-panel">
          <div>
            <p className="section-kicker">{activeLabel}</p>
            <h1>{activeView === "home" ? "Promoted for you" : activeLabel}</h1>
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
          {activeView === "home" ? (
            <>
              <LiveHighlightArea liveRooms={liveRooms} onOpenLive={openLive} />
              <PromotedPostOutlet loading={loading} posts={promotedPosts} />
            </>
          ) : null}

          {activeView === "live" ? (
            <LiveOutlet liveRooms={liveRooms} selectedLive={selectedLive} onOpenLive={openLive} />
          ) : null}

          {activeView === "studio" ? (
            <StudioOutlet health={health} posts={posts} user={user} />
          ) : null}

          {activeView === "channels" ? (
            <ChannelsOutlet liveRooms={liveRooms} posts={posts} />
          ) : null}

          {activeView === "profile" ? (
            <ProfileOutlet health={health} onLogout={onLogout} posts={posts} user={user} />
          ) : null}
        </div>
      </section>

      <nav className="bottom-nav" aria-label="Primary">
        {homeViews.map((item) => (
          <button
            aria-current={activeView === item.id ? "page" : undefined}
            className={activeView === item.id ? "is-active" : ""}
            key={item.id}
            type="button"
            onClick={() => setActiveView(item.id)}
          >
            <span aria-hidden="true">{navIcon(item.id)}</span>
            <small>{item.label}</small>
          </button>
        ))}
      </nav>

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

type PromotedPost = FeedPost & { promotionScore: number };

function LiveHighlightArea({ liveRooms, onOpenLive }: { liveRooms: LiveRoom[]; onOpenLive: (room: LiveRoom) => void }) {
  const featured = liveRooms[0];

  return (
    <section className="live-highlight glass-panel" aria-label="Live feed highlights">
      <div className="highlight-copy">
        <p className="section-kicker">Live now</p>
        <h2>{featured ? featured.title : "No live rooms yet"}</h2>
        <p>{featured ? `${featured.host} - ${featured.status === "live" ? `made live ${timeAgo(featured.startsAt)}` : `starts in ${timeUntil(featured.startsAt)}`}` : "Live highlights will appear here."}</p>
      </div>
      <div className="live-cover-row">
        {liveRooms.map((room) => (
          <button className="live-cover-button" key={room.id} type="button" onClick={() => onOpenLive(room)}>
            <span className="live-avatar-ring">
              <img alt={`${room.host} profile`} src={profileImageFor(room.host)} />
            </span>
            <span>{room.host}</span>
            <small>{room.status === "live" ? timeAgo(room.startsAt) : `in ${timeUntil(room.startsAt)}`}</small>
          </button>
        ))}
      </div>
    </section>
  );
}

function PromotedPostOutlet({ loading, posts }: { loading: boolean; posts: PromotedPost[] }) {
  return (
    <section className="promoted-outlet" aria-label="Promoted posts">
      <div className="feed-heading">
        <h2>Promoted posts</h2>
        <span>{posts.length} ranked</span>
      </div>
      {loading ? <p className="feed-muted">Loading promoted posts...</p> : null}
      {!loading && posts.length === 0 ? (
        <div className="empty-feed glass-panel">
          <h3>No promoted posts yet</h3>
          <p>Posts that receive promotion from other users will rise into this feed.</p>
        </div>
      ) : null}
      {posts.map((post) => (
        <article className="promotion-post glass-panel" key={post.id}>
          <div className="promotion-visual" style={{ backgroundImage: `url("${postImageFor(post.id)}")` }}>
            <span>{post.promotionScore}% promoted</span>
          </div>
          <div className="promotion-body">
            <header>
              <img className="avatar-img" alt="" src={profileImageFor(post.author.name)} />
              <div>
                <strong>{post.author.name}</strong>
                <small>{post.mood} - {timeAgo(post.createdAt)}</small>
              </div>
            </header>
            <p>{post.body}</p>
            <div className="promotion-meter" aria-label={`Promoted ${post.promotionScore} percent`}>
              <span style={{ width: `${post.promotionScore}%` }} />
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}

function LiveOutlet({
  liveRooms,
  selectedLive,
  onOpenLive,
}: {
  liveRooms: LiveRoom[];
  selectedLive: LiveRoom | null;
  onOpenLive: (room: LiveRoom) => void;
}) {
  return (
    <section className="live-outlet">
      {selectedLive ? (
        <article className="live-player glass-panel">
          <img alt={`${selectedLive.host} profile`} src={profileImageFor(selectedLive.host)} />
          <div>
            <span>{selectedLive.status}</span>
            <h2>{selectedLive.title}</h2>
            <p>{selectedLive.host} - made live {timeAgo(selectedLive.startsAt)}</p>
          </div>
        </article>
      ) : null}
      <LiveHighlightArea liveRooms={liveRooms} onOpenLive={onOpenLive} />
    </section>
  );
}

function StudioOutlet({ health, posts, user }: { health: HealthResponse | null; posts: FeedPost[]; user: AuthUser }) {
  return (
    <section className="studio-outlet">
      <div className="studio-profile glass-panel">
        <img className="studio-cover" alt="" src={postImageFor(user.id)} />
        <img className="studio-avatar" alt="" src={profileImageFor(user.name)} />
        <h2>{user.name}</h2>
        <p>{user.email}</p>
      </div>
      <div className="studio-metrics">
        <div className="glass-panel">
          <strong>{posts.length}</strong>
          <span>posts</span>
        </div>
        <div className="glass-panel">
          <strong>{health?.status === "ok" ? "Live" : "Syncing"}</strong>
          <span>backend</span>
        </div>
        <div className="glass-panel">
          <strong>{user.provider}</strong>
          <span>auth</span>
        </div>
      </div>
    </section>
  );
}

function ChannelsOutlet({ liveRooms, posts }: { liveRooms: LiveRoom[]; posts: FeedPost[] }) {
  const channels = [
    { name: "Launch Room", meta: `${posts.length} promoted posts`, image: postImageFor(1) },
    { name: "Live Makers", meta: `${liveRooms.length} live sessions`, image: postImageFor(2) },
    { name: "Studio Notes", meta: "Daily creator updates", image: postImageFor(3) },
  ];

  return (
    <section className="channels-outlet">
      {channels.map((channel) => (
        <article className="channel-row glass-panel" key={channel.name}>
          <img alt="" src={channel.image} />
          <div>
            <h3>{channel.name}</h3>
            <p>{channel.meta}</p>
          </div>
          <button type="button">Open</button>
        </article>
      ))}
    </section>
  );
}

function ProfileOutlet({
  health,
  onLogout,
  posts,
  user,
}: {
  health: HealthResponse | null;
  onLogout: () => void;
  posts: FeedPost[];
  user: AuthUser;
}) {
  return (
    <section className="profile-outlet">
      <StudioOutlet health={health} posts={posts} user={user} />
      <button className="solid-button profile-logout" type="button" onClick={onLogout}>Sign out</button>
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
      return "Tap a live cover to enter that creator's room.";
    case "studio":
      return `Your studio pulse and service state, ${name}.`;
    case "channels":
      return "Follow creator channels and jump into active communities.";
    case "profile":
      return "Your public profile, account state, and sign out control.";
    default:
      return `Welcome back, ${name}. Promoted posts rise here when other users push them up.`;
  }
}

function promotionScoreFor(post: FeedPost, index: number) {
  return Math.max(42, Math.min(99, 96 - index * 7 + (post.id % 11)));
}

function navIcon(view: HomeView) {
  switch (view) {
    case "live":
      return "Live";
    case "studio":
      return "Studio";
    case "channels":
      return "Chan";
    case "profile":
      return "Me";
    default:
      return "Home";
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
