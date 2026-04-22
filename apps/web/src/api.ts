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
