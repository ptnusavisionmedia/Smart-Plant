"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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

  useEffect(() => {
    // Deliberately no "already ran" ref guard: in dev, React StrictMode
    // mounts this effect, cleans it up, then mounts it again. A ref guard
    // would make the second mount a no-op while the *first* mount's cleanup
    // had already set `cancelled`, permanently stranding the status at
    // "idle" (infinite "Memeriksa sesi..." spinner). The `cancelled` flag
    // alone is the correct cancellation pattern for a double-invoked effect.
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
