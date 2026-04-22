import { useEffect, useState } from "react";
import { fetchHealth, type HealthResponse } from "./api";

export default function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetchHealth();
      setHealth(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <main className="page">
      <section className="card hero">
        <p className="eyebrow">Creators</p>
        <h1>One frontend. One backend. One command to run the project.</h1>
        <p className="lead">
          This reset keeps the repo simple: React on the frontend, Go on the backend,
          and local Postgres, Redis, and MinIO services behind one runner.
        </p>
        <div className="actions">
          <button onClick={() => void load()} disabled={loading}>
            {loading ? "Checking..." : "Refresh health"}
          </button>
          <a href="http://localhost:18000/api/health" target="_blank" rel="noreferrer">
            Open API
          </a>
        </div>
      </section>

      <section className="grid">
        <article className="card">
          <h2>Project entrypoints</h2>
          <ul>
            <li><code>apps/web/src/main.tsx</code></li>
            <li><code>apps/api/main.go</code></li>
            <li><code>run-project.ps1</code></li>
          </ul>
        </article>

        <article className="card">
          <h2>Service status</h2>
          {error ? <p className="error">{error}</p> : null}
          {health ? (
            <div className="status-list">
              <div className="status-row"><span>overall</span><strong>{health.status}</strong></div>
              <div className="status-row"><span>postgres</span><strong>{health.checks.postgres}</strong></div>
              <div className="status-row"><span>redis</span><strong>{health.checks.redis}</strong></div>
              <div className="status-row"><span>minio</span><strong>{health.checks.minio}</strong></div>
            </div>
          ) : (
            <p>{loading ? "Checking services..." : "No response yet."}</p>
          )}
        </article>
      </section>
    </main>
  );
}
