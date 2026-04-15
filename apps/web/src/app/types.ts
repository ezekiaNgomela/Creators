export type Route =
  | "landing"
  | "login"
  | "register"
  | "home"
  | "video"
  | "profile"
  | "live"
  | "become-creator"
  | "dashboard";

export type Role = "guest" | "user" | "creator";

export type Story = {
  id: number;
  name: string;
  live?: boolean;
};

export type FeedPost = {
  id: number;
  creator: string;
  title: string;
  subtitle: string;
  duration: string;
  views: string;
  promoted?: boolean;
  live?: boolean;
};

export type AppState = {
  route: Route;
  role: Role;
  currentPost: FeedPost;
  videoProgress: number;
  videoSpeed: number;
  videoVolume: number;
};
