import {
  createContext,
  ReactNode,
  useContext,
  useMemo,
  useState,
} from "react";
import {
  login,
  registerCreator,
  registerUser,
  type AuthResponse,
  type AuthUser,
} from "@/lib/api";

const SESSION_STORAGE_KEY = "creators.session";

type StoredSession = {
  token: string;
  user: AuthUser | null;
};

function readStoredSession(): StoredSession {
  if (typeof window === "undefined") {
    return { token: "", user: null };
  }

  const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) {
    return { token: "", user: null };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<StoredSession>;
    return {
      token: typeof parsed.token === "string" ? parsed.token : "",
      user: parsed.user ?? null,
    };
  } catch {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    return { token: "", user: null };
  }
}

function persistSession(session: StoredSession) {
  if (typeof window === "undefined") {
    return;
  }

  if (!session.token || !session.user) {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

type SessionContextValue = {
  token: string;
  user: AuthUser | null;
  signIn: (payload: { email: string; password: string }) => Promise<void>;
  applyAuthResponse: (response: AuthResponse) => void;
  registerUser: (payload: { username: string; email: string; password: string }) => Promise<void>;
  registerCreator: (payload: {
    username: string;
    email: string;
    password: string;
    planBilling: "monthly" | "yearly";
    channelName: string;
    displayName: string;
  }) => Promise<AuthResponse>;
  signOut: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

type SessionProviderProps = {
  children: ReactNode;
};

export function SessionProvider({ children }: SessionProviderProps) {
  const [token, setToken] = useState(() => readStoredSession().token);
  const [user, setUser] = useState<AuthUser | null>(() => readStoredSession().user);

  function applyAuthResponse(response: AuthResponse) {
    setToken(response.token);
    setUser(response.user);
    persistSession({ token: response.token, user: response.user });
  }

  async function signIn(payload: { email: string; password: string }) {
    const response = await login(payload);
    applyAuthResponse(response);
  }

  async function handleRegisterUser(payload: {
    username: string;
    email: string;
    password: string;
  }) {
    const response = await registerUser(payload);
    applyAuthResponse(response);
  }

  async function handleRegisterCreator(payload: {
    username: string;
    email: string;
    password: string;
    planBilling: "monthly" | "yearly";
    channelName: string;
    displayName: string;
  }) {
    const response = await registerCreator(payload);
    setToken("");
    setUser(null);
    persistSession({ token: "", user: null });
    return response;
  }

  function signOut() {
    setToken("");
    setUser(null);
    persistSession({ token: "", user: null });
  }

  const value = useMemo<SessionContextValue>(
    () => ({
      token,
      user,
      signIn,
      applyAuthResponse,
      registerUser: handleRegisterUser,
      registerCreator: handleRegisterCreator,
      signOut,
    }),
    [token, user]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within SessionProvider");
  }
  return context;
}
