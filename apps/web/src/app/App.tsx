import { useState } from "react";
import type { Route } from "./types";

export default function App(){
  const [route,setRoute]=useState<Route>("landing");

  const go=(r:Route)=>setRoute(r);

  return (
    <div className="app">
      {route==="landing" && <Landing go={go}/>}
      {route==="login" && <Auth go={go}/>}
      {route==="home" && <Home go={go}/>}
      {route==="video" && <Video go={go}/>}
      {route==="profile" && <Profile go={go}/>}
      {route==="live" && <Live go={go}/>}
      {route==="dashboard" && <Dashboard go={go}/>}
    </div>
  )
}

function Landing({go}:{go:(r:Route)=>void}){
  return <div className="screen center" onClick={()=>go("login")}>Creators</div>
}
function Auth({go}:{go:(r:Route)=>void}){
  return <div className="screen center" onClick={()=>go("home")}>Login</div>
}
function Home({go}:{go:(r:Route)=>void}){
  return <div className="screen" onClick={()=>go("video")}>Home Feed</div>
}
function Video({go}:{go:(r:Route)=>void}){
  return <div className="screen" onClick={()=>go("profile")}>Video Player</div>
}
function Profile({go}:{go:(r:Route)=>void}){
  return <div className="screen" onClick={()=>go("live")}>Profile</div>
}
function Live({go}:{go:(r:Route)=>void}){
  return <div className="screen" onClick={()=>go("dashboard")}>Live</div>
}
function Dashboard({go}:{go:(r:Route)=>void}){
  return <div className="screen" onClick={()=>go("home")}>Dashboard</div>
}
