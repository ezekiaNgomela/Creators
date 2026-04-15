import { useState } from "react";
import { LandingHeroReal } from "../features/landing/LandingHeroReal";
import { AuthPage } from "../features/auth/AuthPage";
import { HomeFeed } from "../features/home/HomeFeed";

export function AppLanding(){
  const [page,setPage]=useState<"landing"|"auth"|"home">("landing");

  if(page==="auth") return <AuthPage/>;
  if(page==="home") return <HomeFeed/>;

  return (
    <div>
      <LandingHeroReal onGetStarted={()=>setPage("auth")} />
      <div
        onClick={()=>setPage("home")}
        style={{textAlign:"center",marginTop:20,cursor:"pointer"}}
      >
        Skip → Home
      </div>
    </div>
  );
}
