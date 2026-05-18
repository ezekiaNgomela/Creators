import Constants from "expo-constants";

import { clearToken, getToken, setToken } from "@/src/services/storage";

const API_PATH = "/api";
const manifestUrl = Constants.expoConfig?.hostUri?.split(":")[0];
const productionBaseUrl = "https://creators-api.onrender.com/api";
const localBaseUrl = manifestUrl ? `http://${manifestUrl}:18000/api` : "http://localhost:18000/api";

const defaultBaseUrl = process.env.NODE_ENV === "production" ? productionBaseUrl : localBaseUrl;

function withApiPath(url: string) {
  const normalized = url.replace(/\/$/, "");
  return normalized.endsWith(API_PATH) ? normalized : `${normalized}${API_PATH}`;
}

function resolveApiBaseUrl() {
  const explicitBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (explicitBaseUrl) {
    return withApiPath(explicitBaseUrl);
  }

  const renderApiOrigin = process.env.EXPO_PUBLIC_API_ORIGIN?.trim();
  if (renderApiOrigin) {
    return withApiPath(renderApiOrigin);
  }

  return defaultBaseUrl;
}

const API_BASE_URL = resolveApiBaseUrl();
const REALTIME_BASE_URL = API_BASE_URL.replace(/^http/i, (value) => (value.toLowerCase() === "https" ? "wss" : "ws"));

export type HealthResponse = {
  service: string;
  status: string;
  checks: {
    postgres: string;
    redis: string;
    minio: string;
  };
  timestamp: string;
};

export type AuthUser = {
  id: number;
  email: string;
  name: string;
  provider: string;
  avatarUrl: string;
  createdAt: string;
};

export type AuthResponse = {
  token: string;
  user: AuthUser;
};

export type LiveRoom = {
  id: number;
  title: string;
  host: string;
  topic: string;
  coverUrl: string;
  viewers: number;
  startsAt: string;
  status: "live" | "scheduled" | string;
  accent: string;
  updatedAt: string;
};

export type FeedPost = {
  id: number;
  body: string;
  mood: string;
  mediaUrl: string;
  mediaType: "image" | "video" | string;
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
  commentCount: number;
  likeCount: number;
  promotionScore: number;
  tags: string[];
  gallery: string[];
  author: AuthUser;
  createdAt: string;
};

export type PostInput = {
  body: string;
  mood: string;
  mediaUrl?: string;
  mediaType?: "image" | "video" | string;
  filterName?: string;
  overlayText?: string;
  sticker?: string;
  textColor?: string;
  backgroundTone?: string;
  aspectRatio?: string;
  cropZoom?: number;
  cropX?: number;
  cropY?: number;
  rotation?: number;
};

export type MediaUploadResponse = {
  url: string;
  mediaType: "image" | "video" | string;
  mimeType: string;
  fileName: string;
};

export type Notification = {
  id: number;
  title: string;
  body: string;
  type: string;
  link: string;
  readAt: string | null;
  createdAt: string;
};

export type CallSession = {
  id: number;
  roomId: string;
  mode: "voice" | "video" | string;
  status: "ringing" | "active" | "ended" | string;
  createdBy: AuthUser;
  participants: ChatParticipant[];
  createdAt: string;
  endedAt: string | null;
};

export type FeedResponse = {
  user: AuthUser;
  liveRooms: LiveRoom[];
  posts: FeedPost[];
};

export type ProfileResponse = {
  user: AuthUser;
  bio: string;
  headline: string;
  location: string;
  avatarUrl: string;
  coverUrl: string;
  websiteUrl: string;
};

export type Comment = {
  id: number;
  targetId: number;
  targetType: "post" | "live" | string;
  body: string;
  author: AuthUser;
  createdAt: string;
};

export type LiveRating = {
  liveRoomId: number;
  average: number;
  count: number;
  userScore: number;
};

export type LiveIndex = {
  live: LiveRoom[];
  scheduled: LiveRoom[];
  previous: LiveRoom[];
  following: LiveRoom[];
  ratings: LiveRating[];
};

export type ChatContact = {
  id: string;
  name: string;
  subtitle: string;
  lastBody: string;
  updatedAt: string;
  type: "direct" | "group" | string;
  participantCount: number;
  participants: ChatParticipant[];
};

export type ChatParticipant = {
  id: number;
  name: string;
  email: string;
};

export type ChatMessage = {
  id: number;
  contactId: string;
  roomId: string;
  body: string;
  sender: AuthUser;
  createdAt: string;
  own: boolean;
};

export type RealtimeEvent =
  | { type: "connected"; data: { userId: number; channels: string[] } }
  | { type: "notification"; data: Notification }
  | { type: "chat_message"; data: ChatMessage }
  | { type: "call_signal"; callId?: number; fromId?: number; data: unknown }
  | { type: "pong"; data: string }
  | { type: string; data?: unknown };

export type ChatUser = {
  id: number;
  name: string;
  email: string;
  headline: string;
};

type ApiError = { message?: string };

async function apiRequest<T>(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  const token = await getToken();

  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let payload: ApiError = {};
    try {
      payload = (await response.json()) as ApiError;
    } catch {
      payload = {};
    }
    throw new Error(payload.message ?? "Request failed");
  }

  return response.json() as Promise<T>;
}

export async function fetchHealth() {
  return apiRequest<HealthResponse>("/health");
}

export async function registerAccount(input: { name: string; email: string; password: string }) {
  const response = await apiRequest<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
  await setToken(response.token);
  return response;
}

export async function loginAccount(input: { email: string; password: string }) {
  const response = await apiRequest<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
  await setToken(response.token);
  return response;
}

export async function fetchCurrentUser() {
  const response = await apiRequest<{ user: AuthUser }>("/auth/me");
  return response.user;
}

export async function logoutAccount() {
  await apiRequest<{ status: string }>("/auth/logout", { method: "POST" });
  await clearToken();
}

export async function fetchFeed() {
  return apiRequest<FeedResponse>("/feed");
}

export async function uploadMedia(input: { uri: string; name: string; type: string }) {
  const formData = new FormData();
  formData.append("file", input as unknown as Blob);
  return apiRequest<MediaUploadResponse>("/media", {
    method: "POST",
    body: formData,
  });
}

export async function createPost(input: PostInput) {
  const response = await apiRequest<{ post: FeedPost }>("/posts", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return response.post;
}

export async function updatePost(id: number, input: PostInput) {
  const response = await apiRequest<{ post: FeedPost }>("/posts", {
    method: "PATCH",
    body: JSON.stringify({ ...input, id }),
  });
  return response.post;
}

export async function fetchNotifications() {
  const response = await apiRequest<{ notifications: Notification[] }>("/notifications");
  return response.notifications;
}

export async function markNotificationsRead() {
  await apiRequest<{ status: string }>("/notifications", { method: "PATCH" });
}

export async function createCallSession(input: { roomId: string; mode: "voice" | "video" }) {
  const response = await apiRequest<{ call: CallSession }>("/calls", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return response.call;
}

export async function updateCallSession(input: { id: number; action: "join" | "leave" | "end" }) {
  const response = await apiRequest<{ call: CallSession }>("/calls", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return response.call;
}

export async function fetchProfile() {
  return apiRequest<ProfileResponse>("/profile");
}

export async function updateProfile(input: { name: string; bio: string; headline: string; location: string; avatarUrl?: string; coverUrl?: string; websiteUrl?: string }) {
  return apiRequest<ProfileResponse>("/profile", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function fetchLiveIndex() {
  return apiRequest<LiveIndex>("/live");
}

export async function rateLiveRoom(input: { liveRoomId: number; score: number }) {
  return apiRequest<LiveRating>("/live/rate", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function fetchComments(targetType: "post" | "live", targetId: number) {
  const response = await apiRequest<{ comments: Comment[] }>(`/comments?targetType=${encodeURIComponent(targetType)}&targetId=${targetId}`);
  return response.comments;
}

export async function createComment(input: { targetType: "post" | "live"; targetId: number; body: string }) {
  const response = await apiRequest<{ comment: Comment }>("/comments", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return response.comment;
}

export async function fetchChatContacts() {
  const response = await apiRequest<{ contacts: ChatContact[] }>("/chats");
  return response.contacts;
}

export async function fetchChatUsers() {
  const response = await apiRequest<{ users: ChatUser[] }>("/users");
  return response.users;
}

export async function createChatRoom(input: { type: "direct" | "group"; title?: string; participantIds: number[] }) {
  const response = await apiRequest<{ room: ChatContact }>("/chats", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return response.room;
}

export async function addUsersToChatRoom(input: { roomId: string; participantIds: number[] }) {
  const response = await apiRequest<{ room: ChatContact }>("/chats/participants", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return response.room;
}

export async function fetchChatMessages(contactId: string) {
  const response = await apiRequest<{ messages: ChatMessage[] }>(`/chats/messages?roomId=${encodeURIComponent(contactId)}`);
  return response.messages;
}

export async function sendChatMessage(input: { contactId: string; body: string }) {
  const response = await apiRequest<{ message: ChatMessage }>("/chats/messages", {
    method: "POST",
    body: JSON.stringify({ roomId: input.contactId, body: input.body }),
  });
  return response.message;
}

export async function createRealtimeSocket(input?: { callId?: number }) {
  const token = await getToken();
  if (!token) {
    return null;
  }
  const params = new URLSearchParams({ token });
  if (input?.callId) {
    params.set("callId", String(input.callId));
  }
  return new WebSocket(`${REALTIME_BASE_URL}/realtime?${params.toString()}`);
}
