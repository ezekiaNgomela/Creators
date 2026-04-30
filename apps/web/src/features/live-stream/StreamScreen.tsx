import { useEffect, useState } from "react";
import { Avatar, AvatarGroup, Badge, Chip, Fade, IconButton, Paper } from "@mui/material";
import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import AutoAwesomeRounded from "@mui/icons-material/AutoAwesomeRounded";
import FavoriteRounded from "@mui/icons-material/FavoriteRounded";
import GroupsRounded from "@mui/icons-material/GroupsRounded";
import MoreHorizRounded from "@mui/icons-material/MoreHorizRounded";
import NorthEastRounded from "@mui/icons-material/NorthEastRounded";
import PhoneRounded from "@mui/icons-material/PhoneRounded";
import PlayCircleRounded from "@mui/icons-material/PlayCircleRounded";
import ScheduleRounded from "@mui/icons-material/ScheduleRounded";
import VideocamRounded from "@mui/icons-material/VideocamRounded";
import { EmojiComposer, EmojiText, FollowPill } from "../../components/engagement";
import type { CallSession, Comment, LiveIndex, LiveRating, LiveRoom } from "../../api";
import { compactNumber, elapsedTime, firstName, liveCoverFor, profileImageFor, timeAgo } from "../../shared/helpers";

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
  const live = selectedLive;
  const [fullPlayer, setFullPlayer] = useState(false);
  const [roomActionStatus, setRoomActionStatus] = useState("");
  const spotlightRooms = liveIndex?.live ?? liveRooms;
  const popularHosts = (liveIndex?.following ?? liveRooms).slice(0, 4);
  const followingRooms = liveIndex?.following ?? [];
  const globalRooms = spotlightRooms.filter(r => !followingRooms.find(f => f.id === r.id));

  const categories = [
    { label: "Discovery", active: true },
    { label: "Following" },
    { label: "Trending" },
    { label: "Categories" },
  ];
  const heroRoom = spotlightRooms[0] ?? liveRooms[0] ?? null;

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
      <section className="stream-screen" style={{ backgroundImage: `url("${liveCoverFor(heroRoom)}")` }}>
        <div className="relative z-[2] mx-auto flex min-h-screen w-full max-w-6xl items-center px-3 pb-28 pt-4 md:px-5">
          <Fade in timeout={320}>
            <div className="w-full rounded-[34px] border border-white/10 bg-[color:rgba(8,12,20,0.78)] p-4 text-white shadow-2xl backdrop-blur-xl md:p-6">
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr),320px]">
                <div className="overflow-hidden rounded-[30px] border border-white/10 bg-black/20">
                  <div className="relative">
                    <img alt="" className="aspect-[1.08/1] w-full object-cover" src={liveCoverFor(heroRoom)} />
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
                      <div className="live-room-shortcuts" aria-label="Live room shortcuts">
                        <button type="button" onClick={() => spotlightRooms[0] ? onOpenStream(spotlightRooms[0]) : undefined}>
                          <VideocamRounded fontSize="small" />
                          Create stream
                        </button>
                        <button type="button" onClick={() => spotlightRooms[0] ? void onStartLiveCall(spotlightRooms[0], "video") : undefined}>
                          <GroupsRounded fontSize="small" />
                          Group call
                        </button>
                      </div>
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
                        <h2 className="text-lg font-black">Following</h2>
                        <IconButton className="!text-white/70">
                          <MoreHorizRounded />
                        </IconButton>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {(followingRooms.length > 0 ? followingRooms : spotlightRooms).slice(0, 4).map((room) => (
                          <button className="group overflow-hidden rounded-[22px] border border-white/8 text-left transition hover:border-[color:var(--accent)]" key={room.id} type="button" onClick={() => onOpenStream(room)}>
                            <div className="relative">
                              <img alt="" className="aspect-[0.78/1] w-full object-cover transition duration-500 group-hover:scale-105" src={liveCoverFor(room)} />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
                              <Chip
                                label={`${compactNumber(room.viewers)} viewers`}
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
                      <h2 className="text-lg font-black">Global Discovery</h2>
                      <IconButton className="!text-white/70">
                        <MoreHorizRounded />
                      </IconButton>
                    </div>
                    <div className="space-y-3">
                      {globalRooms.slice(0, 5).map((room) => (
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
  const meetingPeople = [live.host, ...spotlightRooms.filter((room) => room.id !== live.id).map((room) => room.host)].slice(0, 5);

  return (
    <section className="stream-screen stream-room-page" style={{ backgroundImage: `url("${liveCoverFor(live)}")` }}>
      <Fade in timeout={320}>
        <div className="live-room-dashboard">
          <aside className="live-room-rail" aria-label="Live room actions">
            <button type="button" onClick={() => onClose()} aria-label="Back to live lobby">
              <ArrowBackRounded />
            </button>
            <button className="active" type="button" onClick={() => setFullPlayer(true)} aria-label="Open large player">
              <PlayCircleRounded />
            </button>
            <button type="button" onClick={() => void onStartLiveCall(live, "video")} aria-label="Start video meeting">
              <VideocamRounded />
            </button>
            <button type="button" onClick={() => void onStartLiveCall(live, "voice")} aria-label="Start voice room">
              <PhoneRounded />
            </button>
            <button type="button" onClick={() => onToggleFollow(live.host)} aria-label="Follow host">
              <FavoriteRounded />
            </button>
          </aside>

          <main className="live-room-main">
            <header className="live-room-header">
              <div>
                <span>{live.status}</span>
                <h1>{live.title}</h1>
                <p>{live.host} hosts {live.topic} - {compactNumber(live.viewers)} watching</p>
              </div>
              <div className="live-room-header-actions">
                <FollowPill following={following} onClick={() => onToggleFollow(live.host)} />
                <button type="button" onClick={() => void onStartLiveCall(live, "video")}>
                  <GroupsRounded fontSize="small" />
                  Add guest
                </button>
              </div>
            </header>

            <div className="live-participant-strip" aria-label="Participants">
              {[live, ...spotlightRooms.filter((room) => room.id !== live.id)].slice(0, 5).map((room) => (
                <button className={room.id === live.id ? "active" : ""} key={room.id} type="button" onClick={() => onOpenStream(room)}>
                  <img alt="" src={liveCoverFor(room)} />
                  <span>{firstName(room.host)}</span>
                  <i />
                </button>
              ))}
            </div>

            <section className="live-stage" aria-label="Live video stage">
              <button className="live-stage-media" type="button" onClick={() => setFullPlayer(true)}>
                <img alt="" src={liveCoverFor(live)} />
              </button>
              <div className="live-stage-top">
                <span className="live-badge"><VideocamRounded fontSize="small" /> Live</span>
                <span>{compactNumber(live.viewers)} viewers</span>
                <span>{elapsedTime(live.startsAt)}</span>
              </div>
              <div className="live-stage-caption">
                <Avatar src={profileImageFor(live.host)} sx={{ width: 48, height: 48 }} />
                <span>
                  <strong>{live.host}</strong>
                  <small>{compactNumber(followersFor(live.host))} followers</small>
                </span>
              </div>
              <div className="live-stage-controls">
                <button type="button" onClick={() => void onStartLiveCall(live, "voice")} aria-label="Voice">
                  <PhoneRounded />
                </button>
                <button className="danger" type="button" onClick={() => onClose()} aria-label="Leave live room">
                  <PhoneRounded />
                </button>
                <button type="button" onClick={() => void onStartLiveCall(live, "video")} aria-label="Video meeting">
                  <VideocamRounded />
                </button>
                <button type="button" onClick={() => void navigator.clipboard?.writeText(`${window.location.origin}/?live=${live.id}`).then(() => setRoomActionStatus("Live link copied."))} aria-label="Copy live link">
                  <NorthEastRounded />
                </button>
              </div>
            </section>

            <div className="live-session-bar">
              <AvatarGroup max={5} sx={{ "& .MuiAvatar-root": { width: 38, height: 38, borderColor: "#181d24" } }}>
                {meetingPeople.map((name) => <Avatar alt={name} key={name} src={profileImageFor(name)} />)}
              </AvatarGroup>
              <div>
                <strong>{activeCall ? `${activeCall.mode} room #${activeCall.id}` : "Creator room"}</strong>
                <span>{roomActionStatus || callStatus || `${live.topic} responses and comments are open.`}</span>
              </div>
              <button type="button" onClick={() => void onStartLiveCall(live, "video")}>Start meeting</button>
            </div>
          </main>

          <aside className="live-room-side">
            <section className="live-response-card">
              <div>
                <strong>Audience response</strong>
                <span>{rating ? `${rating.average.toFixed(1)} average` : "New stream"}</span>
              </div>
              <div className="live-rating-row">
                {[1, 2, 3, 4, 5].map((score) => (
                  <button className={rating?.userScore === score ? "active" : ""} key={score} type="button" onClick={() => void onRate(live.id, score)}>
                    {score}
                  </button>
                ))}
              </div>
            </section>

            <section className="live-pending-card">
              <div>
                <Avatar src={profileImageFor(spotlightRooms.find((room) => room.id !== live.id)?.host ?? live.host)} />
                <span>
                  <strong>{spotlightRooms.find((room) => room.id !== live.id)?.host ?? live.host}</strong>
                  <small>{roomActionStatus || "requested to join"}</small>
                </span>
              </div>
              <div>
                <button type="button" onClick={() => { setRoomActionStatus("Guest admitted to the room."); void onStartLiveCall(live, "video"); }}>Admit</button>
                <button type="button" onClick={() => setRoomActionStatus("Guest request declined.")}>Deny</button>
              </div>
            </section>

            <section className="live-chat-panel">
              <div className="live-side-heading">
                <h2>Comments</h2>
                <AutoAwesomeRounded fontSize="small" />
              </div>
              <div className="live-comment-list">
                {liveComments.slice(-8).map((comment) => (
                  <article key={comment.id}>
                    <strong>{comment.author.name}</strong>
                    <EmojiText text={comment.body} />
                  </article>
                ))}
                {!liveComments.length ? <p>No comments yet. Be the first one in.</p> : null}
              </div>
              <EmojiComposer placeholder="Respond to the room" onSubmit={(value) => onAddComment(live.id, value)} />
            </section>

            <section className="live-schedule-mini">
              <div className="live-side-heading">
                <h2>Up next</h2>
                <ScheduleRounded fontSize="small" />
              </div>
              {(liveIndex?.scheduled ?? []).slice(0, 3).map((room) => (
                <button key={room.id} type="button" onClick={() => onOpenStream(room)}>
                  <span>{room.title}</span>
                  <small>{timeAgo(room.startsAt)}</small>
                </button>
              ))}
            </section>
          </aside>
        </div>
      </Fade>
      {fullPlayer ? (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-black/80 p-4 backdrop-blur-xl">
          <div className="relative w-full max-w-sm overflow-hidden rounded-[40px] border border-white/10 bg-black shadow-2xl">
            <button className="absolute left-4 top-4 z-[2] grid h-10 w-10 place-items-center rounded-full bg-black/40 text-white" type="button" onClick={() => setFullPlayer(false)}>
              <ArrowBackRounded />
            </button>
            <img alt="" className="aspect-[0.57/1] w-full object-cover" src={liveCoverFor(live)} />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-5 text-white">
              <p className="m-0 text-xs font-black uppercase tracking-[0.2em] text-[color:var(--accent-3)]">Now Watching</p>
              <h2 className="mt-2 text-3xl font-black leading-tight">{live.title}</h2>
              <p className="mt-2 text-sm text-white/70">{live.host}</p>
              <div className="mt-4 flex items-center gap-2">
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold">{compactNumber(live.viewers)} viewers</span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold">{rating ? `${rating.average.toFixed(1)} rating` : "New stream"}</span>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
