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
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { PublicUser } from "@convex/lib";

const KEY = "eduabsen_token";

type AuthValue = {
  token: string | null;
  user: PublicUser | null;
  ready: boolean; // false selama token dari localStorage belum diperiksa server
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const loginMutation = useMutation(api.auth.login);
  const logoutMutation = useMutation(api.auth.logout);

  useEffect(() => {
    setToken(localStorage.getItem(KEY));
    setHydrated(true);
  }, []);

  const me = useQuery(api.auth.me, token ? { token } : "skip");

  // Token tidak valid / kedaluwarsa -> bersihkan, UI otomatis kembali ke login
  useEffect(() => {
    if (hydrated && token && me === null) {
      localStorage.removeItem(KEY);
      setToken(null);
    }
  }, [hydrated, token, me]);

  const login = useCallback(
    async (username: string, password: string) => {
      const res = await loginMutation({ username, password });
      localStorage.setItem(KEY, res.token);
      setToken(res.token);
    },
    [loginMutation],
  );

  const logout = useCallback(async () => {
    if (token) {
      try {
        await logoutMutation({ token });
      } catch {
        /* sesi mungkin sudah habis, abaikan */
      }
    }
    localStorage.removeItem(KEY);
    setToken(null);
  }, [token, logoutMutation]);

  const value = useMemo<AuthValue>(
    () => ({
      token,
      user: token ? (me ?? null) : null,
      ready: hydrated && (!token || me !== undefined),
      login,
      logout,
    }),
    [token, me, hydrated, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth harus dipakai di dalam AuthProvider");
  return ctx;
}