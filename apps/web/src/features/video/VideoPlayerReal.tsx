import { useEffect, useMemo, useRef, useState } from "react";
import { mediaAdapter } from "../../services/local-service/mediaGateway";
import "./video-player-real.css";

type VideoPlayerRealProps = {
  creator: string;
  title: string;
  src?: string;
  canEdit?: boolean;
  onBack?: () => void;
  onOpenProfile?: () => void;
};

const SPEEDS = [0.5, 1, 1.25, 1.5, 2];

export function VideoPlayerReal({
  creator,
  title,
  src = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
  canEdit = false,
  onBack,
  onOpenProfile,
}: VideoPlayerRealProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(80);
  const [speed, setSpeed] = useState(1);

  const currentSpeedLabel = useMemo(() => `${speed}x`, [speed]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = volume / 100;
  }, [volume]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = speed;
  }, [speed]);

  const togglePlay = async () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      await video.play();
      setIsPlaying(true);
      await mediaAdapter.send({ type: "play", payload: { src } });
    } else {
      video.pause();
      setIsPlaying(false);
      await mediaAdapter.send({ type: "pause", payload: { src } });
    }
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || !video.duration) return;
    setProgress((video.currentTime / video.duration) * 100);
  };

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    setDuration(video.duration);
  };

  const handleSeek = async (value: number) => {
    const video = videoRef.current;
    if (!video || !video.duration) return;
    const time = (value / 100) * video.duration;
    video.currentTime = time;
    setProgress(value);
    await mediaAdapter.send({ type: "seek", payload: { time, src } });
  };

  return (
    <div className="video-real-root">
      <div className="video-real-stage">
        <video
          ref={videoRef}
          className="video-real-element"
          src={src}
          playsInline
          onClick={togglePlay}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
        />

        <div className="video-real-topbar">
          <button className="video-real-icon-btn" onClick={onBack}>←</button>
          <div className="video-real-topbar-right">
            {canEdit ? <button className="video-real-icon-btn">✎</button> : null}
            <button className="video-real-icon-btn">⋮</button>
          </div>
        </div>

        <div className="video-real-center">
          <button className="video-real-play-orb" onClick={togglePlay}>
            {isPlaying ? "❚❚" : "▶"}
          </button>
        </div>

        <div className="video-real-bottom">
          <div className="video-real-copy">
            <button className="video-real-creator" onClick={onOpenProfile}>@{creator}</button>
            <h2>{title}</h2>
            <p>Real browser video playback with timeline, speed, volume, and a Rust-ready media gateway.</p>
          </div>

          <div className="video-real-control-stack">
            <label>Timeline</label>
            <input
              type="range"
              min={0}
              max={100}
              value={progress}
              onChange={(e) => handleSeek(Number(e.target.value))}
            />
            <small>{Math.round((progress / 100) * duration)}s / {Math.round(duration)}s</small>
          </div>

          <div className="video-real-control-grid">
            <div className="video-real-control-card">
              <span>Volume</span>
              <strong>{volume}%</strong>
              <input
                type="range"
                min={0}
                max={100}
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
              />
            </div>

            <div className="video-real-control-card">
              <span>Speed</span>
              <strong>{currentSpeedLabel}</strong>
              <div className="video-real-speed-row">
                {SPEEDS.map((value) => (
                  <button
                    key={value}
                    className={value === speed ? "video-real-speed-pill active" : "video-real-speed-pill"}
                    onClick={() => setSpeed(value)}
                  >
                    {value}x
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="video-real-actions-row">
            <button className="video-real-action-pill">Share</button>
            <button className="video-real-action-pill">Promote</button>
            <button className="video-real-action-pill">Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}
