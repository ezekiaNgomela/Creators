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

type SessionContextValue = {
  token: string;
  user: AuthUser | null;
  signIn: (payload: { email: string; password: string }) => Promise<void>;
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
  const [token, setToken] = useState("");
  const [user, setUser] = useState<AuthUser | null>(null);

  async function signIn(payload: { email: string; password: string }) {
    const response = await login(payload);
    setToken(response.token);
    setUser(response.user);
  }

  async function handleRegisterUser(payload: {
    username: string;
    email: string;
    password: string;
  }) {
    const response = await registerUser(payload);
    setToken(response.token);
    setUser(response.user);
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
    return response;
  }

  function signOut() {
    setToken("");
    setUser(null);
  }

  const value = useMemo<SessionContextValue>(
    () => ({
      token,
      user,
      signIn,
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
