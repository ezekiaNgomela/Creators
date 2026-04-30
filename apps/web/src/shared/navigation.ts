import type { HomeTab } from "./types";

export const bottomTabs: Array<{ id: HomeTab; label: string; icon: string }> = [
  { id: "home", label: "Home", icon: "home" },
  { id: "streams", label: "Live", icon: "streams" },
  { id: "messages", label: "Chat", icon: "messages" },
  { id: "studio", label: "Studio", icon: "studio" },
  { id: "profiles", label: "Me", icon: "profiles" },
];
