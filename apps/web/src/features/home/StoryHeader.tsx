import { NotificationDrawer } from "../notifications/NotificationDrawer";
import type { AuthUser, LiveRoom, Notification } from "../../api";
import { firstName, profileImageFor } from "../../shared/helpers";
import type { FeedMode } from "../../shared/types";

export function StoryHeader({
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
      {notificationOpen ? <NotificationDrawer notifications={notifications} /> : null}

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
