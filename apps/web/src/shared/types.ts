import type { FeedPost } from "../api";

export type AuthMode = "login" | "register";
export type HomeTab = "home" | "streams" | "messages" | "studio" | "profiles";
export type ProfileView = "profile" | "settings" | "service";
export type ThemeName = "default" | "dark" | "beautiful" | "blueish" | "greenish" | "whiteish";
export type StudioTool = "media" | "audio" | "text" | "elements" | "transitions" | "effects" | "filters" | "adjust" | "speed" | "templates";
export type FeedMode = "Local" | "Global" | "Trend";

export type DisplayPost = FeedPost & {
  comments: number;
  gallery: string[];
  likes: number;
  promotionScore: number;
  tags: string[];
};

export type StudioDraft = {
  body: string;
  mood: string;
  mediaUrl: string;
  mediaType: "image" | "video";
  filterName: string;
  overlayText: string;
  sticker: string;
  textColor: string;
  backgroundTone: string;
  aspectRatio: string;
  cropZoom: number;
  cropX: number;
  cropY: number;
  rotation: number;
};

export type ThemeOption = {
  id: ThemeName;
  label: string;
  caption: string;
  swatches: [string, string, string];
};
