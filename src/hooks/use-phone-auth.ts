"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
  type User,
} from "firebase/auth";
import { auth } from "@/lib/firebase/client";

export function usePhoneAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  const confirmationRef = useRef<ConfirmationResult | null>(null);
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);

  // Cleanup recaptcha on unmount
  useEffect(() => {
    return () => {
      recaptchaRef.current?.clear();
    };
  }, []);

  const getRecaptcha = useCallback(() => {
    if (!recaptchaRef.current) {
      recaptchaRef.current = new RecaptchaVerifier(auth, "recaptcha-container", {
        size: "invisible",
      });
    }
    return recaptchaRef.current;
  }, []);

  const sendOtp = useCallback(
    async (phone: string) => {
      setError(null);
      setLoading(true);
      try {
        // Enforce +47 prefix
        const formatted = phone.startsWith("+47")
          ? phone
          : `+47${phone.replace(/\s/g, "")}`;

        const verifier = getRecaptcha();
        const result = await signInWithPhoneNumber(auth, formatted, verifier);
        confirmationRef.current = result;
        return { success: true };
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Kunne ikke sende SMS";
        setError(msg);
        // Reset recaptcha on error
        recaptchaRef.current?.clear();
        recaptchaRef.current = null;
        return { success: false };
      } finally {
        setLoading(false);
      }
    },
    [getRecaptcha],
  );

  const verifyOtp = useCallback(async (code: string) => {
    setError(null);
    setLoading(true);
    try {
      if (!confirmationRef.current) {
        throw new Error("Send OTP først");
      }
      const credential = await confirmationRef.current.confirm(code);
      setUser(credential.user);
      setVerified(true);
      // Return the fresh user directly — callers that need to act
      // immediately (e.g. auto-submitting a form right after verifying)
      // can't rely on `verified`/`user` from this hook's own state, since
      // that update won't be reflected in any closures created before this
      // render commits.
      return { success: true as const, user: credential.user };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Feil verifiseringskode";
      setError(msg);
      return { success: false as const };
    } finally {
      setLoading(false);
    }
  }, []);

  return { sendOtp, verifyOtp, loading, error, verified, user };
}

