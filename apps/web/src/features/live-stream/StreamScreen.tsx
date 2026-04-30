import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Bell,
  CalendarDays,
  Gamepad2,
  Heart,
  MessageCircle,
  Mic,
  MoreHorizontal,
  Phone,
  Play,
  Plus,
  Search,
  Send,
  Share2,
  Star,
  Users,
  Video,
} from "lucide-react";
import { EmojiComposer, EmojiText, FollowPill } from "../../components/engagement";
import type { CallSession, Comment, LiveIndex, LiveRating, LiveRoom } from "../../api";
import { compactNumber, elapsedTime, firstName, liveCoverFor, profileImageFor, timeAgo } from "../../shared/helpers";

const liveCategories = ["Popular", "Gaming", "Sport", "Music", "Studio"];

export function StreamScreen({
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
  const spotlightRooms = liveIndex?.live ?? liveRooms;
  const scheduledRooms = liveIndex?.scheduled ?? [];
  const previousRooms = liveIndex?.previous ?? [];
  const heroRoom = selectedLive ?? spotlightRooms[0] ?? liveRooms[0] ?? null;
  const [fullPlayer, setFullPlayer] = useState(false);
  const [roomActionStatus, setRoomActionStatus] = useState("");
  const selectedComments = heroRoom ? comments.filter((comment) => comment.targetType === "live" && comment.targetId === heroRoom.id) : [];
  const rating = heroRoom ? ratingsByLiveId.get(heroRoom.id) : undefined;
  const following = heroRoom ? isFollowing(heroRoom.host) : false;

  useEffect(() => {
    if (heroRoom) {
      void onLoadComments(heroRoom.id);
    }
  }, [heroRoom?.id]);

  const profileRooms = useMemo(
    () => (heroRoom ? [heroRoom, ...spotlightRooms.filter((room) => room.id !== heroRoom.id)] : spotlightRooms).slice(0, 4),
    [heroRoom, spotlightRooms],
  );

  if (!heroRoom) {
    return (
      <section className="stream-screen live-reference-page">
        <div className="live-empty-state">
          <Video size={28} />
          <strong>No live rooms yet</strong>
          <span>Start a stream from Studio and it will appear here.</span>
        </div>
      </section>
    );
  }

  return (
    <section className="stream-screen live-reference-page">
      <motion.div className="live-reference-grid" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <LiveLobbyPanel
          activeRoom={heroRoom}
          liveRooms={spotlightRooms}
          onOpenStream={onOpenStream}
          scheduledRooms={scheduledRooms}
        />

        <main className="live-center-player">
          <header className="live-player-header tight">
            <button type="button" onClick={selectedLive ? onClose : undefined} aria-label="Back to live lobby">
              <ArrowLeft size={18} />
            </button>
            <div>
              <img alt="" src={profileImageFor(heroRoom.host)} />
              <span>
                <strong>{heroRoom.host}</strong>
                <small>{compactNumber(followersFor(heroRoom.host))} followers</small>
              </span>
            </div>
            <FollowPill following={following} onClick={() => onToggleFollow(heroRoom.host)} />
            <span className="live-view-pill">{compactNumber(heroRoom.viewers)} <i>Live</i></span>
          </header>

          <button className="live-player-media" type="button" onClick={() => setFullPlayer(true)}>
            <img alt="" src={liveCoverFor(heroRoom)} />
            <span className="live-player-play"><Play size={28} fill="currentColor" /></span>
            <div className="live-player-copy">
              <strong>{heroRoom.title}</strong>
              <small>{heroRoom.topic} - {elapsedTime(heroRoom.startsAt)}</small>
            </div>
          </button>

          <section className="live-floating-chat" aria-label="Live comments">
            {selectedComments.slice(-3).map((comment) => (
              <article key={comment.id}>
                <img alt="" src={profileImageFor(comment.author.name)} />
                <span>
                  <strong>{comment.author.name}</strong>
                  <EmojiText text={comment.body} />
                </span>
              </article>
            ))}
            {!selectedComments.length ? (
              <article>
                <img alt="" src={profileImageFor(heroRoom.host)} />
                <span>
                  <strong>{heroRoom.host}</strong>
                  <small>Welcome to the room.</small>
                </span>
              </article>
            ) : null}
          </section>

          <footer className="live-player-actions">
            <EmojiComposer placeholder="Comment..." onSubmit={(value) => onAddComment(heroRoom.id, value)} />
            <button type="button" onClick={() => void onStartLiveCall(heroRoom, "voice")} aria-label="Voice room"><Mic size={18} /></button>
            <button type="button" onClick={() => {
              void navigator.clipboard?.writeText(`${window.location.origin}/?live=${heroRoom.id}`);
              setRoomActionStatus("Live link copied.");
            }} aria-label="Share live"><Share2 size={18} /></button>
            <button type="button" onClick={() => void onStartLiveCall(heroRoom, "video")} aria-label="Love live"><Heart size={18} fill="currentColor" /></button>
          </footer>

          {(callStatus || activeCall || roomActionStatus) ? (
            <section className="live-session-status">
              <Users size={17} />
              <span>
                <strong>{activeCall ? `${activeCall.mode} room #${activeCall.id}` : "Live room"}</strong>
                <small>{roomActionStatus || callStatus || `${heroRoom.topic} session is ready.`}</small>
              </span>
              <button type="button" onClick={() => void onStartLiveCall(heroRoom, "video")}>Start meeting</button>
            </section>
          ) : null}
        </main>

        <LiveProfilePanel
          followersFor={followersFor}
          liveRooms={profileRooms}
          onOpenStream={onOpenStream}
          onRate={onRate}
          onStartLiveCall={onStartLiveCall}
          onToggleFollow={onToggleFollow}
          previousRooms={previousRooms}
          rating={rating}
          room={heroRoom}
          scheduledRooms={scheduledRooms}
        />
      </motion.div>

      {fullPlayer ? (
        <div className="live-fullscreen-player" role="dialog" aria-modal="true">
          <button type="button" onClick={() => setFullPlayer(false)} aria-label="Close full player">
            <ArrowLeft size={20} />
          </button>
          <img alt="" src={liveCoverFor(heroRoom)} />
          <section>
            <strong>{heroRoom.title}</strong>
            <span>{heroRoom.host} - {compactNumber(heroRoom.viewers)} watching</span>
          </section>
        </div>
      ) : null}
    </section>
  );
}

function LiveLobbyPanel({
  activeRoom,
  liveRooms,
  onOpenStream,
  scheduledRooms,
}: {
  activeRoom: LiveRoom;
  liveRooms: LiveRoom[];
  onOpenStream: (room: LiveRoom) => void;
  scheduledRooms: LiveRoom[];
}) {
  return (
    <aside className="live-lobby-panel">
      <header className="live-lobby-header tight">
        <strong><span /> GoLive</strong>
        <nav>
          <button type="button" aria-label="Calls"><Phone size={16} /></button>
          <button type="button" aria-label="Notifications"><Bell size={16} /></button>
          <button type="button" aria-label="Search"><Search size={16} /></button>
        </nav>
      </header>

      <section className="live-host-strip" aria-label="Live hosts">
        {liveRooms.slice(0, 8).map((room) => (
          <button className={room.id === activeRoom.id ? "active" : ""} key={room.id} type="button" onClick={() => onOpenStream(room)}>
            <img alt="" src={profileImageFor(room.host)} />
            <i>Live</i>
            <span>{firstName(room.host)}</span>
          </button>
        ))}
      </section>

      <section className="live-categories" aria-label="Categories">
        {liveCategories.map((category, index) => (
          <button className={index === 1 ? "active" : ""} key={category} type="button">
            {category === "Gaming" ? <Gamepad2 size={14} /> : <Star size={14} />}
            {category}
          </button>
        ))}
      </section>

      <section className="live-room-card-grid">
        {liveRooms.slice(0, 4).map((room) => (
          <button className={room.id === activeRoom.id ? "active" : ""} key={room.id} type="button" onClick={() => onOpenStream(room)}>
            <img alt="" src={liveCoverFor(room)} />
            <span>{compactNumber(room.viewers)} <i>Live</i></span>
            <strong>{room.title}</strong>
            <small>{room.host}</small>
          </button>
        ))}
      </section>

      <section className="live-schedule-stack">
        <header>
          <h2>Schedules</h2>
          <span>Events</span>
        </header>
        {(scheduledRooms.length ? scheduledRooms : liveRooms).slice(0, 3).map((room) => (
          <button key={room.id} type="button" onClick={() => onOpenStream(room)}>
            <CalendarDays size={16} />
            <span>
              <strong>{room.title}</strong>
              <small>{timeAgo(room.startsAt)} - {room.topic}</small>
            </span>
          </button>
        ))}
      </section>
    </aside>
  );
}

function LiveProfilePanel({
  followersFor,
  liveRooms,
  onOpenStream,
  onRate,
  onStartLiveCall,
  onToggleFollow,
  previousRooms,
  rating,
  room,
  scheduledRooms,
}: {
  followersFor: (name: string) => number;
  liveRooms: LiveRoom[];
  onOpenStream: (room: LiveRoom) => void;
  onRate: (liveRoomId: number, score: number) => Promise<void>;
  onStartLiveCall: (room: LiveRoom, mode: "voice" | "video") => Promise<void>;
  onToggleFollow: (name: string) => void;
  previousRooms: LiveRoom[];
  rating: LiveRating | undefined;
  room: LiveRoom;
  scheduledRooms: LiveRoom[];
}) {
  return (
    <aside className="live-profile-panel">
      <header className="tight">
        <button type="button" aria-label="Back"><ArrowLeft size={17} /></button>
        <button type="button" aria-label="More"><MoreHorizontal size={17} /></button>
      </header>

      <section className="live-profile-card">
        <img alt="" src={profileImageFor(room.host)} />
        <div>
          <h2>{room.host}</h2>
          <small>@{room.host.toLowerCase().replace(/[^a-z0-9]+/g, "_")}</small>
        </div>
        <button type="button" onClick={() => onToggleFollow(room.host)}>Follow</button>
        <p>I am a gamer. I often do live streaming when I play games. My live schedule is from 08:00 AM - 10:00 AM.</p>
      </section>

      <section className="live-profile-stats">
        <span><strong>{compactNumber(Math.max(1, liveRooms.length + previousRooms.length))}</strong><small>Post</small></span>
        <span><strong>{compactNumber(120 + liveRooms.length * 37)}</strong><small>Following</small></span>
        <span><strong>{compactNumber(followersFor(room.host))}</strong><small>Followers</small></span>
      </section>

      <section className="live-rating-card">
        <span>
          <strong>Audience response</strong>
          <small>{rating ? `${rating.average.toFixed(1)} average` : "New stream"}</small>
        </span>
        <div>
          {[1, 2, 3, 4, 5].map((score) => (
            <button className={rating?.userScore === score ? "active" : ""} key={score} type="button" onClick={() => void onRate(room.id, score)}>
              {score}
            </button>
          ))}
        </div>
      </section>

      <nav className="live-profile-tabs" aria-label="Profile live tabs">
        <button className="active" type="button">Live Stream</button>
        <button type="button">Last Live</button>
        <button type="button">Star</button>
        <button type="button">Posts</button>
      </nav>

      <section className="live-profile-grid">
        {[...liveRooms, ...previousRooms].slice(0, 4).map((item) => (
          <button key={item.id} type="button" onClick={() => onOpenStream(item)}>
            <img alt="" src={liveCoverFor(item)} />
            <span>{compactNumber(item.viewers)} <i>Live</i></span>
            <strong>{item.title}</strong>
          </button>
        ))}
      </section>

      <section className="live-event-actions">
        <button type="button" onClick={() => void onStartLiveCall(room, "video")}><Video size={16} /> Start event</button>
        <button type="button"><Plus size={16} /> Add schedule</button>
      </section>

      <section className="live-schedule-stack compact">
        {(scheduledRooms.length ? scheduledRooms : liveRooms).slice(0, 2).map((item) => (
          <button key={item.id} type="button" onClick={() => onOpenStream(item)}>
            <CalendarDays size={15} />
            <span>
              <strong>{item.title}</strong>
              <small>{timeAgo(item.startsAt)}</small>
            </span>
          </button>
        ))}
      </section>
    </aside>
  );
}
