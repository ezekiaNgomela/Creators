import { useMemo, useState } from "react";
import "./video-player.css";

type VideoPlayerProps = {
  creator: string;
  title: string;
  canEdit?: boolean;
  onBack?: () => void;
};

const SPEEDS = [0.5, 1, 1.25, 1.5, 2];

export function VideoPlayer({
  creator,
  title,
  canEdit = false,
  onBack,
}: VideoPlayerProps) {
  const [progress, setProgress] = useState(28);
  const [volume, setVolume] = useState(78);
  const [speed, setSpeed] = useState(1);
  const currentSpeedLabel = useMemo(() => `${speed}x`, [speed]);

  return (
    <div className="video-player-root">
      <div className="video-player-stage">
        <div className="video-player-topbar">
          <button className="video-icon-btn" onClick={onBack}>←</button>

          <div className="video-player-topbar-right">
            {canEdit ? <button className="video-icon-btn">✎</button> : null}
            <button className="video-icon-btn">⋮</button>
          </div>
        </div>

        <div className="video-player-center">
          <button className="video-play-orb">▶</button>
        </div>

        <div className="video-player-bottom">
          <div className="video-player-copy">
            <span className="video-creator">@{creator}</span>
            <h2>{title}</h2>
            <p>Feed preview stays minimal. Full click opens timeline, speed, volume, share, and promote controls.</p>
          </div>

          <div className="video-control-stack">
            <label>Timeline</label>
            <input
              type="range"
              min={0}
              max={100}
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
            />
          </div>

          <div className="video-control-grid">
            <div className="video-control-card">
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

            <div className="video-control-card">
              <span>Speed</span>
              <strong>{currentSpeedLabel}</strong>
              <div className="video-speed-row">
                {SPEEDS.map((value) => (
                  <button
                    key={value}
                    className={value === speed ? "video-speed-pill active" : "video-speed-pill"}
                    onClick={() => setSpeed(value)}
                  >
                    {value}x
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="video-actions-row">
            <button className="video-action-pill">Share</button>
            <button className="video-action-pill">Promote</button>
            <button className="video-action-pill">Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}
