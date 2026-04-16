import { useState } from "react";
import { LandingHeroReal } from "../features/landing/LandingHeroReal";
import { AuthPageConnected } from "../features/auth/AuthPageConnected";
import { HomeFeedConnected } from "../features/home/HomeFeedConnected";
import { VideoPlayerReal } from "../features/video/VideoPlayerReal";
import { ProfilePage } from "../features/profile/ProfilePage";

export function AppFlowV2() {
  const [page, setPage] = useState<"landing" | "auth" | "home" | "video" | "profile">("landing");

  if (page === "auth") return <AuthPageConnected onSuccess={() => setPage("home")} onBack={() => setPage("landing")} />;

  if (page === "home") return (
    <HomeFeedConnected
      onOpenVideo={() => setPage("video")}
      onOpenProfile={() => setPage("profile")}
    />
  );

  if (page === "video") return (
    <VideoPlayerReal
      creator="SarahOcean"
      title="Live rooftop session"
      onBack={() => setPage("home")}
      onOpenProfile={() => setPage("profile")}
    />
  );

  if (page === "profile") return <ProfilePage onBack={() => setPage("home")} />;

  return <LandingHeroReal onGetStarted={() => setPage("auth")} />;
}
