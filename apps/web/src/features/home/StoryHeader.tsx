import type { AuthUser, LiveRoom } from "../../api";
import { firstName, profileImageFor } from "../../shared/helpers";
import type { FeedMode } from "../../shared/types";

export function StoryHeader({
  feedMode,
  liveRooms,
  onCreateStory,
  onFeedModeChange,
  onOpenProfile,
  onOpenStream,
  user,
}: {
  feedMode: FeedMode;
  liveRooms: LiveRoom[];
  onCreateStory: () => void;
  onFeedModeChange: (mode: FeedMode) => void;
  onOpenProfile: () => void;
  onOpenStream: (room: LiveRoom) => void;
  user: AuthUser;
}) {
  return (
    <header className="home-highlight" aria-label="Home highlight">
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
