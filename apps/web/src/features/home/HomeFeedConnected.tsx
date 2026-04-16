import { HomeFeed } from "./HomeFeed";

export function HomeFeedConnected({ onOpenVideo, onOpenProfile }: { onOpenVideo: () => void; onOpenProfile: () => void }) {
  return (
    <div onClick={onOpenVideo} onDoubleClick={onOpenProfile}>
      <HomeFeed />
    </div>
  );
}
