/**
 * POST /api/analytics — Receive batched analytics events from client
 *
 * Design for cost efficiency:
 * - Client batches events (max 20 per request)
 * - 10% sampling on page_views for high-traffic pages
 * - Events written to raw_analytics collection (auto-TTL 30 days)
 * - Counters incremented on daily aggregate docs (1 write per day per metric)
 */

import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import type { AnalyticsEvent } from "@/types";

const MAX_BATCH_SIZE = 20;

// Valid page names and funnel steps for validation
const VALID_PAGES = new Set<string>([
  "customer_form", "company_map", "company_offer",
  "customer_accept", "customer_rating", "company_public", "admin",
]);
const VALID_FUNNEL = new Set<string>([
  "form_start", "pickup_set", "drops_added", "companies_selected",
  "customer_info_filled", "rfq_submitted", "offer_viewed", "offer_replied",
  "accept_viewed", "accept_confirmed", "rating_viewed", "rating_submitted",
]);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const events: AnalyticsEvent[] = Array.isArray(body.events) ? body.events : [];

    if (events.length === 0 || events.length > MAX_BATCH_SIZE) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    // Validate and bucket events by day
    const dayBuckets = new Map<
      string,
      { pvCounts: Record<string, number>; fnCounts: Record<string, number>; sessions: Set<string> }
    >();

    for (const evt of events) {
      // Basic validation
      if (!evt.t || !evt.n || !evt.sid || !evt.ts) continue;
      if (evt.t === "pv" && !VALID_PAGES.has(evt.n)) continue;
      if (evt.t === "fn" && !VALID_FUNNEL.has(evt.n)) continue;

      const dateKey = evt.ts.slice(0, 10); // YYYY-MM-DD
      if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(dateKey)) continue;

      if (!dayBuckets.has(dateKey)) {
        dayBuckets.set(dateKey, { pvCounts: {}, fnCounts: {}, sessions: new Set() });
      }
      const bucket = dayBuckets.get(dateKey)!;
      bucket.sessions.add(evt.sid);

      if (evt.t === "pv") {
        bucket.pvCounts[evt.n] = (bucket.pvCounts[evt.n] ?? 0) + 1;
      } else {
        bucket.fnCounts[evt.n] = (bucket.fnCounts[evt.n] ?? 0) + 1;
      }
    }

    // Atomically increment daily aggregate docs
    const batch = adminDb.batch();

    for (const [dateKey, bucket] of dayBuckets) {
      const ref = adminDb.collection("analytics_daily").doc(dateKey);

      const updates: Record<string, unknown> = {
        _v: 1,
        date: dateKey,
        updatedAt: FieldValue.serverTimestamp(),
      };

      // Increment page view counters
      for (const [page, count] of Object.entries(bucket.pvCounts)) {
        updates[`pageViews.${page}`] = FieldValue.increment(count);
      }

      // Increment funnel step counters
      for (const [step, count] of Object.entries(bucket.fnCounts)) {
        updates[`funnelSteps.${step}`] = FieldValue.increment(count);
      }

      // Approximate unique sessions using increment (not exact, but cheap)
      // Exact uniqueness tracked via scheduled aggregation
      updates[`_sessionHits`] = FieldValue.increment(bucket.sessions.size);

      batch.set(ref, updates, { merge: true });

      // Store session IDs for daily unique count (in a subcollection to avoid doc size limits)
      for (const sid of bucket.sessions) {
        const sessionRef = ref.collection("sessions").doc(sid);
        batch.set(sessionRef, { ts: FieldValue.serverTimestamp() }, { merge: true });
      }
    }

    await batch.commit();

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[analytics] POST error:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

