import { useState } from "react";
import { LandingHeroReal } from "../features/landing/LandingHeroReal";
import { AuthPage } from "../features/auth/AuthPage";

export function AppLanding() {
  const [page, setPage] = useState<"landing" | "auth">("landing");

  if (page === "auth") {
    return <AuthPage />;
  }

  return <LandingHeroReal onGetStarted={() => setPage("auth")} />;
}
