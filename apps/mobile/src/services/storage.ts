import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const TOKEN_KEY = "creators.mobile.auth-token";

export async function getToken() {
  if (Platform.OS === "web") {
    try {
      return globalThis.localStorage?.getItem(TOKEN_KEY) ?? null;
    } catch {
      return null;
    }
  }

  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string) {
  if (Platform.OS === "web") {
    try {
      globalThis.localStorage?.setItem(TOKEN_KEY, token);
    } catch {
      // ignore storage failures in the browser
    }
    return;
  }

  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken() {
  if (Platform.OS === "web") {
    try {
      globalThis.localStorage?.removeItem(TOKEN_KEY);
    } catch {
      // ignore storage failures in the browser
    }
    return;
  }

  await SecureStore.deleteItemAsync(TOKEN_KEY);
}
