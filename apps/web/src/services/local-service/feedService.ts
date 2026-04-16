import { backendClient } from "./backendClient";

export type FeedItem = {
  id: string;
  creator: string;
  title: string;
  views?: string;
  live?: boolean;
  thumbnailUrl?: string;
  videoUrl?: string;
};

export async function getHomeFeed(): Promise<FeedItem[]> {
  try {
    return await backendClient.get("/feed/home").then((r) => r.data);
  } catch {
    return [
      { id: "1", creator: "SarahOcean", title: "Sunset rooftop session", views: "48.2K", videoUrl: "/demo/flower.mp4" },
      { id: "2", creator: "MayaLive", title: "Night talk with subscribers", views: "1.8K watching", live: true },
    ];
  }
}
