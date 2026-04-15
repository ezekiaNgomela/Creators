import { backendClient } from "./backendClient";

export async function createStream(payload: any) {
  return backendClient.post("/streams/create", payload).then(r => r.data);
}

export async function joinCheck(payload: any) {
  return backendClient.post("/streams/join-check", payload).then(r => r.data);
}
