const API_PATH = "/api";

const DEFAULT_RENDER_API_BASE_URL = "https://creators-api.onrender.com/api";

function renderApiBaseUrlFromPage() {
  if (typeof window === "undefined") {
    return null;
  }

  const match = window.location.hostname.match(/^creators-(?:web|mobile-web)(-[^.]+)?\.onrender\.com$/);
  if (!match) {
    return null;
  }

  return `https://creators-api${match[1] ?? ""}.onrender.com/api`;
}

const FALLBACK_API_BASE_URL =
  renderApiBaseUrlFromPage() ??
  (typeof window !== "undefined" && window.location.hostname.endsWith(".onrender.com")
    ? DEFAULT_RENDER_API_BASE_URL
    : "http://localhost:18000/api");

function withApiPath(url: string) {
  const normalized = url.replace(/\/$/, "");
  return normalized.endsWith(API_PATH) ? normalized : `${normalized}${API_PATH}`;
}

function resolveApiBaseUrl() {
  const explicitBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
  if (explicitBaseUrl) {
    return withApiPath(explicitBaseUrl);
  }

  const renderApiOrigin = import.meta.env.VITE_API_ORIGIN?.trim();
  if (renderApiOrigin) {
    return withApiPath(renderApiOrigin);
  }

  return FALLBACK_API_BASE_URL;
}

export const API_BASE_URL = resolveApiBaseUrl();
const TOKEN_KEY = "creators.authToken";

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
  provider: "email" | "google" | string;
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

export type StudioRenderClipInput = {
  id: string;
  type: "text" | "video" | "image" | "effect" | "audio" | string;
  track: string;
  title: string;
  url?: string;
  start: number;
  inPoint: number;
  outPoint: number;
  sourceDuration: number;
  format: string;
  gain?: number;
  audioEffect?: string;
};

export type StudioRenderInput = {
  clips: StudioRenderClipInput[];
  outputFormat: string;
  aspectRatio: string;
  filterName: string;
  cropZoom: number;
  rotation: number;
};

export type StudioRendererHealth = {
  available: boolean;
  binary: string;
  version: string;
  message: string;
  supportedInputs: string[];
  supportedOutputs: string[];
};

export type StudioRenderJob = {
  id: string;
  status: "queued" | "running" | "completed" | "failed" | string;
  message: string;
  outputUrl: string;
  outputFormat: string;
  rendererAvailable: boolean;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  input?: StudioRenderInput;
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

export type ChatUser = {
  id: number;
  name: string;
  email: string;
  headline: string;
};

type ApiError = {
  message?: string;
};

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  const token = getStoredToken();

  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  if (!response.ok) {
    let payload: ApiError = {};
    try {
      payload = (await response.json()) as ApiError;
    } catch {
      payload = {};
    }
    throw new Error(payload.message || "Request failed");
  }

  return response.json() as Promise<T>;
}

export function getStoredToken() {
  return window.localStorage.getItem(TOKEN_KEY);
}

export function storeToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken() {
  window.localStorage.removeItem(TOKEN_KEY);
}

export async function fetchHealth(): Promise<HealthResponse> {
  return apiRequest<HealthResponse>("/health");
}

export async function registerAccount(input: { name: string; email: string; password: string }): Promise<AuthResponse> {
  const response = await apiRequest<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
  storeToken(response.token);
  return response;
}

export async function loginAccount(input: { email: string; password: string }): Promise<AuthResponse> {
  const response = await apiRequest<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
  storeToken(response.token);
  return response;
}

export async function fetchCurrentUser(): Promise<AuthUser> {
  const response = await apiRequest<{ user: AuthUser }>("/auth/me");
  return response.user;
}

export async function logoutAccount() {
  await apiRequest<{ status: string }>("/auth/logout", { method: "POST" });
  clearStoredToken();
}

export async function getGoogleAuthUrl(): Promise<string> {
  const response = await apiRequest<{ authUrl: string }>("/auth/google/start?format=json", {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });
  return response.authUrl;
}

export async function fetchFeed(): Promise<FeedResponse> {
  return apiRequest<FeedResponse>("/feed");
}

export async function uploadMedia(file: File): Promise<MediaUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  return apiRequest<MediaUploadResponse>("/media", {
    method: "POST",
    body: formData,
  });
}

export async function fetchStudioRendererHealth(): Promise<StudioRendererHealth> {
  return apiRequest<StudioRendererHealth>("/studio/render");
}

export async function startStudioRender(input: StudioRenderInput): Promise<StudioRenderJob> {
  const response = await apiRequest<{ job: StudioRenderJob }>("/studio/render", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return normalizeStudioRenderJob(response.job);
}

export async function fetchStudioRenderJob(id: string): Promise<StudioRenderJob> {
  const response = await apiRequest<{ job: StudioRenderJob }>(`/studio/render/jobs?id=${encodeURIComponent(id)}`);
  return normalizeStudioRenderJob(response.job);
}

export async function createPost(input: PostInput): Promise<FeedPost> {
  const response = await apiRequest<{ post: FeedPost }>("/posts", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return response.post;
}

export async function fetchPost(id: number): Promise<FeedPost> {
  const response = await apiRequest<{ post?: FeedPost; posts?: FeedPost[] }>(`/posts?id=${id}`);
  const post = response.post ?? response.posts?.find((item) => item.id === id);
  if (!post) {
    throw new Error("Post not found");
  }
  return post;
}

export async function updatePost(id: number, input: PostInput): Promise<FeedPost> {
  const response = await apiRequest<{ post: FeedPost }>("/posts", {
    method: "PATCH",
    body: JSON.stringify({ ...input, id }),
  });
  return response.post;
}

export async function fetchNotifications(): Promise<Notification[]> {
  const response = await apiRequest<{ notifications: Notification[] }>("/notifications");
  return response.notifications;
}

export async function markNotificationsRead(): Promise<void> {
  await apiRequest<{ status: string }>("/notifications", { method: "PATCH" });
}

export async function createCallSession(input: { roomId: string; mode: "voice" | "video" }): Promise<CallSession> {
  const response = await apiRequest<{ call: CallSession }>("/calls", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return response.call;
}

export async function updateCallSession(input: { id: number; action: "join" | "leave" | "end" }): Promise<CallSession> {
  const response = await apiRequest<{ call: CallSession }>("/calls", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return response.call;
}

export async function fetchProfile(): Promise<ProfileResponse> {
  return apiRequest<ProfileResponse>("/profile");
}

export async function updateProfile(input: { name: string; bio: string; headline: string; location: string; avatarUrl?: string; coverUrl?: string; websiteUrl?: string }): Promise<ProfileResponse> {
  return apiRequest<ProfileResponse>("/profile", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function fetchLiveIndex(): Promise<LiveIndex> {
  return apiRequest<LiveIndex>("/live");
}

export async function rateLiveRoom(input: { liveRoomId: number; score: number }): Promise<LiveRating> {
  return apiRequest<LiveRating>("/live/rate", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function fetchComments(targetType: "post" | "live", targetId: number): Promise<Comment[]> {
  const response = await apiRequest<{ comments: Comment[] }>(`/comments?targetType=${encodeURIComponent(targetType)}&targetId=${targetId}`);
  return response.comments;
}

export async function createComment(input: { targetType: "post" | "live"; targetId: number; body: string }): Promise<Comment> {
  const response = await apiRequest<{ comment: Comment }>("/comments", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return response.comment;
}

export async function fetchChatContacts(): Promise<ChatContact[]> {
  const response = await apiRequest<{ contacts: ChatContact[] }>("/chats");
  return response.contacts;
}

export async function fetchChatUsers(): Promise<ChatUser[]> {
  const response = await apiRequest<{ users: ChatUser[] }>("/users");
  return response.users;
}

export async function createChatRoom(input: { type: "direct" | "group"; title?: string; participantIds: number[] }): Promise<ChatContact> {
  const response = await apiRequest<{ room: ChatContact }>("/chats", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return response.room;
}

export async function addUsersToChatRoom(input: { roomId: string; participantIds: number[] }): Promise<ChatContact> {
  const response = await apiRequest<{ room: ChatContact }>("/chats/participants", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return response.room;
}

export async function fetchChatMessages(contactId: string): Promise<ChatMessage[]> {
  const response = await apiRequest<{ messages: ChatMessage[] }>(`/chats/messages?roomId=${encodeURIComponent(contactId)}`);
  return response.messages;
}

export async function sendChatMessage(input: { contactId: string; body: string }): Promise<ChatMessage> {
  const response = await apiRequest<{ message: ChatMessage }>("/chats/messages", {
    method: "POST",
    body: JSON.stringify({ roomId: input.contactId, body: input.body }),
  });
  return response.message;
}

function normalizeStudioRenderJob(job: StudioRenderJob): StudioRenderJob {
  if (!job.outputUrl || /^https?:\/\//i.test(job.outputUrl)) {
    return job;
  }
  const apiOrigin = API_BASE_URL.replace(/\/api$/i, "");
  return {
    ...job,
    outputUrl: `${apiOrigin}${job.outputUrl.startsWith("/") ? "" : "/"}${job.outputUrl}`,
  };
}
