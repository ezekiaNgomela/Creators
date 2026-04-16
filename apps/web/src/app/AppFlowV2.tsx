import { useState } from "react";
import { useSession } from "../hooks/useSession";
import { LandingHeroReal } from "../features/landing/LandingHeroReal";
import { AuthPageConnected } from "../features/auth/AuthPageConnected";
import { HomeFeedReal } from "../features/home/HomeFeedReal";
import { VideoPlayerReal } from "../features/video/VideoPlayerReal";
import { ProfilePage } from "../features/profile/ProfilePage";

export function AppFlowV2() {
  const { user, loading } = useSession();
  const [page, setPage] = useState<"auth" | "home" | "video" | "profile">("home");

  if (loading) return <div style={{ color: "white" }}>Loading...</div>;

  if (!user) {
    return <AuthPageConnected onSuccess={() => setPage("home")} />;
  }

  if (page === "home") {
    return (
      <HomeFeedReal
        onOpenVideo={() => setPage("video")}
      />
    );
  }

  if (page === "video") {
    return (
      <VideoPlayerReal
        creator="..."
        title="..."
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
