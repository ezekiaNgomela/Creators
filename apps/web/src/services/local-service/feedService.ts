import { MEDIA_BASE_URL } from "./config";

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
  const res = await fetch(`${MEDIA_BASE_URL}/api/feed/home`);
  return res.json();
}
