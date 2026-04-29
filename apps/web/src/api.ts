const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:18000/api").replace(/\/$/, "");
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
  author: AuthUser;
  createdAt: string;
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

  if (options.body && !headers.has("Content-Type")) {
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

export async function createPost(input: { body: string; mood: string }): Promise<FeedPost> {
  const response = await apiRequest<{ post: FeedPost }>("/posts", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return response.post;
}

export async function fetchProfile(): Promise<ProfileResponse> {
  return apiRequest<ProfileResponse>("/profile");
}

export async function updateProfile(input: { name: string; bio: string; headline: string; location: string }): Promise<ProfileResponse> {
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
