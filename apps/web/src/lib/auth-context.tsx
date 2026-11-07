"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { RegisterRequest, UserProfile } from "@smart-plant/shared";
import {
  fetchMe,
  login as apiLogin,
  logout as apiLogout,
  onAccessTokenChange,
  refreshSession,
  registerAccount,
} from "./api-client";

export type AuthStatus = "idle" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  status: AuthStatus;
  user: UserProfile | null;
  login: (email: string, password: string) => Promise<void>;
  register: (body: RegisterRequest) => Promise<UserProfile>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("idle");
  const [user, setUser] = useState<UserProfile | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    let cancelled = false;
    (async () => {
      const ok = await refreshSession();
      if (cancelled) return;
      if (!ok) {
        setStatus("unauthenticated");
        return;
      }
      try {
        const profile = await fetchMe();
        if (cancelled) return;
        setUser(profile);
        setStatus("authenticated");
      } catch {
        if (!cancelled) setStatus("unauthenticated");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return onAccessTokenChange((token) => {
      if (!token) {
        setUser(null);
        setStatus("unauthenticated");
      }
    });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    await apiLogin({ email, password });
    const profile = await fetchMe();
    setUser(profile);
    setStatus("authenticated");
  }, []);

  const register = useCallback(async (body: RegisterRequest) => {
    return registerAccount(body);
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, login, register, logout }),
    [status, user, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth harus dipakai di dalam AuthProvider");
  return ctx;
}
