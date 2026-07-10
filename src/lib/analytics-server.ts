import "server-only";

import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import type { AnalyticsPageName, FunnelStep } from "@/types";

const hasFirebaseConfig = !!(
  process.env.FIREBASE_PROJECT_ID &&
  process.env.FIREBASE_CLIENT_EMAIL &&
  process.env.FIREBASE_PRIVATE_KEY
);

/**
 * Server-side page view logging (for server components).
 * Fire-and-forget — increments daily aggregate counter.
 * Silently skips if Firebase credentials are not configured.
 */
export function trackServerPageView(pageName: AnalyticsPageName) {
  if (!hasFirebaseConfig) return;

  const dateKey = new Date().toISOString().slice(0, 10);
  const ref = adminDb.collection("analytics_daily").doc(dateKey);

  ref.set(
    {
      _v: 1,
      date: dateKey,
      [`pageViews.${pageName}`]: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  ).catch((err: unknown) => console.error("[analytics] server pv error:", err));
}

/**
 * Server-side funnel step logging.
 * Fire-and-forget — increments daily aggregate counter.
 * Silently skips if Firebase credentials are not configured.
 */
export function trackServerFunnel(step: FunnelStep) {
  if (!hasFirebaseConfig) return;

  const dateKey = new Date().toISOString().slice(0, 10);
  const ref = adminDb.collection("analytics_daily").doc(dateKey);

  ref.set(
    {
      _v: 1,
      date: dateKey,
      [`funnelSteps.${step}`]: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  ).catch((err: unknown) => console.error("[analytics] server funnel error:", err));
}

