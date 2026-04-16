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
  const res = await backendClient.get("/feed/home");
  return res.data;

}
