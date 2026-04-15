import "./profile.css";

export function ProfilePage({ onBack }: { onBack?: () => void }) {
  return (
    <div className="profile-root">
      <div className="profile-hero">
        <button className="profile-back" onClick={onBack}>←</button>
        <div className="profile-panel">
          <div className="profile-avatar">S</div>
          <div className="profile-copy">
            <p className="profile-label">Creator profile</p>
            <h1>SarahOcean</h1>
            <p>Live sessions, gallery drops, and promoted video content.</p>
            <div className="profile-stats">
              <div><strong>248K</strong><span>Followers</span></div>
              <div><strong>8.4K</strong><span>Subscribers</span></div>
              <div><strong>152</strong><span>Posts</span></div>
            </div>
          </div>
        </div>
      </div>

      <div className="profile-section">
        <h3>Top activities</h3>
        <div className="activity-strip">
          <button className="activity-card active">Live now</button>
          <button className="activity-card">New post</button>
          <button className="activity-card">Gallery update</button>
          <button className="activity-card">Premium drop</button>
          <button className="activity-card">Promoted clip</button>
        </div>
      </div>
    </div>
  );
}
