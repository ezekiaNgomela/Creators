import type { FeedPost, LiveRoom } from "../api";
import { studioFilters } from "./studio";
import type { DisplayPost } from "./types";

export function createDisplayPosts(posts: FeedPost[]) {
  const mapped = posts.map<DisplayPost>((post) => {
    const gallery = post.gallery.length ? post.gallery : post.mediaUrl ? [post.mediaUrl] : [];
    return {
      ...post,
      comments: post.commentCount,
      gallery,
      likes: post.likeCount,
      promotionScore: post.promotionScore,
      tags: post.tags.length ? post.tags : [post.mood.toLowerCase().replace(/\s+/g, ""), post.mediaType].filter(Boolean),
    };
  });
  return mapped.sort((left, right) => right.promotionScore - left.promotionScore || new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

export function timeAgo(value: string) {
  const date = new Date(value);
  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const absSeconds = Math.abs(seconds);

  if (absSeconds < 60) {
    return seconds >= 0 ? "in a moment" : "just now";
  }

  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  for (const [unit, amount] of units) {
    if (absSeconds >= amount) {
      return formatter.format(Math.round(seconds / amount), unit);
    }
  }
  return formatter.format(seconds, "second");
}

export function elapsedTime(value: string) {
  const minutes = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 60000));
  const hours = Math.floor(minutes / 60).toString().padStart(2, "0");
  const mins = (minutes % 60).toString().padStart(2, "0");
  return `${hours}:${mins}:30`;
}

export function firstName(value: string) {
  return value.trim().split(/\s+/)[0] || value;
}

export function compactNumber(value: number) {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function webFilterFor(filterName: string) {
  return studioFilters.find((filter) => filter.name === filterName)?.css ?? "none";
}

export function profileImageFor(seed: string) {
  return `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(seed || "creator")}`;
}

export function liveCoverFor(room?: LiveRoom | null) {
  return room?.coverUrl || "";
}

export function indexFor(value: string, length: number) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash) % length;
}
