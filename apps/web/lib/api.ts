const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:8000/api";

type RequestOptions = RequestInit & {
  token?: string;
  idempotencyKey?: string;
};

export type AuthUser = {
  id: string;
  username: string;
  email: string;
  role: string;
  status: string;
  isVerified: boolean;
};

export type AuthResponse = {
  token: string;
  user: AuthUser;
  requiresVerification?: boolean;
  meta?: Record<string, unknown>;
};

export type WalletPricing = {
  coins: {
    base: string;
  };
  streams: {
    perMinute: number;
    featured30Min: number;
  };
  split: {
    creatorPct: number;
    platformPct: number;
    reservePct: number;
  };
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }
  if (options.idempotencyKey) {
    headers.set("Idempotency-Key", options.idempotencyKey);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(String(payload.error ?? "Request failed."));
  }
  return payload as T;
}

export function login(payload: { email: string; password: string }) {
  return request<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function registerUser(payload: { username: string; email: string; password: string }) {
  return request<AuthResponse>("/auth/register/user", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function registerCreator(payload: {
  username: string;
  email: string;
  password: string;
  planBilling: "monthly" | "yearly";
  channelName: string;
  displayName: string;
}) {
  return request<AuthResponse>("/auth/register/super-user", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function verifyEmail(token: string) {
  return request<{ message: string }>(`/auth/verify-email?token=${encodeURIComponent(token)}`);
}

export function fetchMe(token: string) {
  return request<AuthUser>("/auth/me", { token });
}

export function fetchWalletPricing() {
  return request<WalletPricing>("/wallet/pricing");
}

export function createPost(payload: {
  authorUserId: string;
  authorRole: string;
  title: string;
  visibility: string;
  priceCoins: number;
  contentType: string;
  channelId?: string;
}) {
  return request("/posts/create", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function createStream(payload: {
  hostUserId: string;
  hostRole: string;
  hostVerified: boolean;
  title: string;
  visibility: string;
  priceCoins: number;
}) {
  return request("/streams/create", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function joinStream(payload: {
  viewerUserId: string;
  visibility: string;
  subscribed: boolean;
  paymentState: string;
  minutesPlanned: number;
}) {
  return request("/streams/join-check", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function requestLiveKitToken(payload: {
  roomName: string;
  userId: string;
  isHost: boolean;
}) {
  return request("/streams/livekit/token", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function subscriptionAccessCheck(payload: {
  userId: string;
  superUserId: string;
  channelId: string;
  resourceType: string;
  resourceId: string;
  visibility: string;
  paymentState: string;
}) {
  return request("/subscriptions/access-check", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
