import { useEffect, useState } from "react";
import { getHomeFeed, FeedItem } from "../../services/local-service/feedService";

export function HomeFeedReal({ onOpenVideo }: { onOpenVideo: (item: FeedItem) => void }) {
  const [feed, setFeed] = useState<FeedItem[]>([]);

  useEffect(() => {
    getHomeFeed().then(setFeed);
  }, []);

  return (
    <div style={{ padding: 20, color: "white" }}>
      {feed.map((item) => (
        <div key={item.id} onClick={() => onOpenVideo(item)} style={{ marginBottom: 20 }}>
          <div style={{ height: 200, background: "#111" }}>
            {item.live && <span>🔴 LIVE</span>}
          </div>
          <h3>{item.creator}</h3>
          <p>{item.title}</p>
        </div>
      ))}
    </div>
  );
}
