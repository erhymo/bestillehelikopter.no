"use client";

import { useEffect, useState, useCallback } from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { auth } from "@/lib/firebase/client";

interface AdminAuthState {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  idToken: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const googleProvider = new GoogleAuthProvider();

export function useAdminAuth(): AdminAuthState {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [idToken, setIdToken] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        // Get ID token and check custom claims
        const tokenResult = await firebaseUser.getIdTokenResult(true);
        const adminClaim = tokenResult.claims.admin === true;
        setIsAdmin(adminClaim);
        setIdToken(tokenResult.token);
      } else {
        setUser(null);
        setIsAdmin(false);
        setIdToken(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const signIn = useCallback(async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error("[admin-auth] Sign-in failed:", err);
    }
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
  }, []);

  return { user, loading, isAdmin, idToken, signIn, signOut };
}

