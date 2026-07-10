"use client";

import { useEffect, useRef, useCallback } from "react";
import type { AnalyticsEvent, AnalyticsPageName, FunnelStep } from "@/types";

// ── Session ID (random per browser tab, no PII) ───────
function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let sid = sessionStorage.getItem("_bh_sid");
  if (!sid) {
    sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem("_bh_sid", sid);
  }
  return sid;
}

// ── Batch queue ───────────────────────────────────────
const FLUSH_INTERVAL_MS = 5_000;  // flush every 5s
const MAX_QUEUE = 20;

const queue: AnalyticsEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function flush() {
  if (queue.length === 0) return;
  const batch = queue.splice(0, MAX_QUEUE);
  // Use sendBeacon for reliability (survives page unload)
  const payload = JSON.stringify({ events: batch });
  if (navigator.sendBeacon) {
    navigator.sendBeacon("/api/analytics", payload);
  } else {
    fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  }
}

function enqueue(event: AnalyticsEvent) {
  queue.push(event);
  if (queue.length >= MAX_QUEUE) {
    flush();
  } else if (!flushTimer) {
    flushTimer = setTimeout(() => {
      flushTimer = null;
      flush();
    }, FLUSH_INTERVAL_MS);
  }
}

// Flush on page unload
if (typeof window !== "undefined") {
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });
  window.addEventListener("pagehide", flush);
}

// ── Public hook ───────────────────────────────────────

/**
 * First-party analytics hook.
 * - Automatically tracks page_view on mount
 * - Provides trackFunnel() for funnel step events
 * - Batches and sends via /api/analytics
 */
export function useAnalytics(pageName: AnalyticsPageName) {
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;

    enqueue({
      t: "pv",
      n: pageName,
      sid: getSessionId(),
      ts: new Date().toISOString(),
      ref: typeof document !== "undefined" ? document.referrer || undefined : undefined,
    });
  }, [pageName]);

  const trackFunnel = useCallback(
    (step: FunnelStep, meta?: Record<string, string | number | boolean>) => {
      enqueue({
        t: "fn",
        n: step,
        sid: getSessionId(),
        ts: new Date().toISOString(),
        meta,
      });
    },
    [],
  );

  return { trackFunnel };
}



