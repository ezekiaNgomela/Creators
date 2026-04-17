import { useState } from "react";
import { useSession } from "../hooks/useSession";
import { LandingHeroReal } from "../features/landing/LandingHeroReal";
import { AuthPageConnected } from "../features/auth/AuthPageConnected";
import { HomeFeedReal } from "../features/home/HomeFeedReal";
import { VideoPlayerReal } from "../features/video/VideoPlayerReal";
import { ProfilePage } from "../features/profile/ProfilePage";
import { LiveRoom } from "../features/live/LiveRoom";
import type { FeedItem } from "../services/local-service/feedService";

export function AppFlowV2() {
  const { user, loading } = useSession();
  const [page, setPage] = useState<"landing" | "auth" | "home" | "video" | "profile" | "live">("landing");
  const [selectedItem, setSelectedItem] = useState<FeedItem | null>(null);

  if (loading) return <div style={{ color: "white" }}>Loading...</div>;

  if (!user) {
    if (page === "auth") {
      return <AuthPageConnected onSuccess={() => setPage("home")} onBack={() => setPage("landing")} />;
    }
    return <LandingHeroReal onGetStarted={() => setPage("auth")} />;
  }

  if (page === "home" || page === "landing") {
    return (
      <HomeFeedReal
        onOpenVideo={(item) => {
          setSelectedItem(item);
          setPage(item.live ? "live" : "video");
        }}
      />
    );
  }

  if (page === "live" && selectedItem) {
    return <LiveRoom streamId={selectedItem.id} onBack={() => setPage("home")} />;
  }

  if (page === "video" && selectedItem) {
    return (
      <VideoPlayerReal
        creator={selectedItem.creator}
        title={selectedItem.title}
        src={selectedItem.videoUrl}
        onBack={() => setPage("home")}
        onOpenProfile={() => setPage("profile")}
      />
    );
  }

  if (page === "profile") {
    return <ProfilePage onBack={() => setPage("home")} />;
  }

  return null;
}
