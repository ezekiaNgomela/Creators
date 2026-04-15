import { useState } from "react";
import { LandingHeroReal } from "../features/landing/LandingHeroReal";
import { AuthPage } from "../features/auth/AuthPage";
import { HomeFeed } from "../features/home/HomeFeed";
import { VideoPlayer } from "../features/video/VideoPlayer";

export function AppCreatorFlow() {
  const [page, setPage] = useState<"landing" | "auth" | "home" | "video">("landing");

  if (page === "auth") return <AuthPage />;
  if (page === "home") return <HomeFeed />;
  if (page === "video") {
    return <VideoPlayer creator="SarahOcean" title="Sunset rooftop session" canEdit onBack={() => setPage("home")} />;
  }

  return <LandingHeroReal onGetStarted={() => setPage("auth")} />;
}
