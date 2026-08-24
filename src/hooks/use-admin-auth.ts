"use client";

import { useState, useCallback, useEffect } from "react";

interface AdminAuthState {
  loading: boolean;
  isAdmin: boolean;
  signInError: string | null;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export function useAdminAuth(): AdminAuthState {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);

  const checkSession = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/session");
      const data = await res.json();
      setIsAdmin(!!data.authenticated);
    } catch {
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Intentional fetch-on-mount; checks the admin_session cookie server-side.
    checkSession();
  }, [checkSession]);

  const signIn = useCallback(async (username: string, password: string) => {
    setSignInError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setSignInError(data.error ?? "Innlogging feilet. Prøv igjen.");
        return;
      }
      setIsAdmin(true);
    } catch {
      setSignInError("Innlogging feilet. Prøv igjen.");
    }
  }, []);

  const signOut = useCallback(async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    setIsAdmin(false);
  }, []);

  return { loading, isAdmin, signInError, signIn, signOut };
}
