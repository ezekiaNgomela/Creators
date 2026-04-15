import { backendClient } from "./backendClient";

export async function login(email: string, password: string) {
  return backendClient.post("/auth/login", { email, password }).then(r => r.data);
}

export async function register(data: {
  email: string;
  password: string;
  username: string;
}) {
  return backendClient.post("/auth/register", data).then(r => r.data);
}

export async function getMe() {
  return backendClient.get("/auth/me").then(r => r.data);
}

export async function logout() {
  return backendClient.post("/auth/logout").then(r => r.data);
}
