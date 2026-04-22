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
          <a className="is-active" href="#feed">Feed</a>
          <a href="#live">Live</a>
          <a href="#posts">Posts</a>
          <a href="#studio">Studio</a>
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
            <p className="section-kicker">Home</p>
            <h1>Live feed</h1>
            <p>Welcome back, {user.name}. See what creators are doing now and publish your next update.</p>
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

        <section className="composer-panel" id="posts" aria-label="Create post">
          <div>
            <span className="avatar" aria-hidden="true">{initials(user.name)}</span>
          </div>
          <form className="composer-form" onSubmit={(event) => void handlePublish(event)}>
            <textarea
              value={body}
              maxLength={500}
              rows={4}
              placeholder="Share a launch note, live thought, or studio update..."
              onChange={(event) => setBody(event.target.value)}
              required
            />
            <div className="composer-tools">
              <label>
                <span>Mood</span>
                <select value={mood} onChange={(event) => setMood(event.target.value)}>
                  {moodOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
              <span className="character-count">{body.length}/500</span>
              <button className="solid-button" type="submit" disabled={publishing || body.trim().length === 0}>
                {publishing ? "Publishing..." : "Publish"}
              </button>
            </div>
          </form>
        </section>

        <section className="post-feed" aria-label="Post feed">
          <div className="feed-heading">
            <h2>Post feed</h2>
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
            <article className="feed-post" key={post.id}>
              <span className="avatar" aria-hidden="true">{initials(post.author.name)}</span>
              <div className="post-content">
                <div className="post-meta">
                  <strong>{post.author.name}</strong>
                  <span>{post.mood}</span>
                  <span>{timeAgo(post.createdAt)}</span>
                </div>
                <p>{post.body}</p>
              </div>
            </article>
          ))}
        </section>
      </section>

      <aside className="live-rail" id="live" aria-label="Live feed">
        <div className="live-rail-header">
          <p className="section-kicker">Now</p>
          <h2>Live rooms</h2>
        </div>
        {liveRooms.map((room) => (
          <article className={`live-room accent-${room.accent}`} key={room.id}>
            <div className="live-room-top">
              <span>{room.status}</span>
              <strong>{room.viewers}</strong>
            </div>
            <h3>{room.title}</h3>
            <p>{room.host} · {room.topic}</p>
            <small>{room.status === "live" ? `Started ${timeAgo(room.startsAt)}` : `Starts ${timeAgo(room.startsAt)}`}</small>
          </article>
        ))}
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

function initials(name: string) {
  const letters = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  return letters || "C";
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
