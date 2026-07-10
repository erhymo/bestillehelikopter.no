import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";

/**
 * Cron: Daglig kl 04:00 Oslo-tid (europe-west1)
 *
 * 1. Count unique sessions from subcollection for yesterday's daily doc
 * 2. Monthly rollup: aggregate daily docs into analytics_monthly/{YYYY-MM}
 */
export const scheduledAnalyticsRollup = onSchedule(
  {
    schedule: "0 4 * * *",
    timeZone: "Europe/Oslo",
    region: "europe-west1",
    timeoutSeconds: 300,
    memory: "256MiB",
  },
  async () => {
    const db = admin.firestore();

    // Yesterday's date key
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const dateKey = yesterday.toISOString().slice(0, 10); // YYYY-MM-DD
    const monthKey = dateKey.slice(0, 7); // YYYY-MM

    console.log(`[analytics-rollup] Processing date=${dateKey}, month=${monthKey}`);

    // ── 1. Count unique sessions for yesterday ──────────────────────
    const dailyRef = db.collection("analytics_daily").doc(dateKey);
    const dailySnap = await dailyRef.get();

    if (dailySnap.exists) {
      const sessionsSnap = await dailyRef.collection("sessions").count().get();
      const uniqueSessions = sessionsSnap.data().count;

      await dailyRef.update({ uniqueSessions });
      console.log(`[analytics-rollup] ${dateKey}: ${uniqueSessions} unique sessions`);
    } else {
      console.log(`[analytics-rollup] No daily doc for ${dateKey}, skipping`);
    }

    // ── 2. Monthly rollup ───────────────────────────────────────────
    // Get all daily docs for this month
    const startOfMonth = `${monthKey}-01`;
    const endOfMonth = `${monthKey}-31`; // inclusive upper bound is fine
    const dailyDocs = await db
      .collection("analytics_daily")
      .where("date", ">=", startOfMonth)
      .where("date", "<=", endOfMonth)
      .get();

    if (dailyDocs.empty) {
      console.log(`[analytics-rollup] No daily docs for month ${monthKey}`);
      return;
    }

    // Aggregate
    const pageViews: Record<string, number> = {};
    const funnelSteps: Record<string, number> = {};
    let totalUniqueSessions = 0;

    for (const doc of dailyDocs.docs) {
      const data = doc.data();

      // Sum page views
      if (data.pageViews && typeof data.pageViews === "object") {
        for (const [page, count] of Object.entries(data.pageViews)) {
          pageViews[page] = (pageViews[page] ?? 0) + (count as number);
        }
      }

      // Sum funnel steps
      if (data.funnelSteps && typeof data.funnelSteps === "object") {
        for (const [step, count] of Object.entries(data.funnelSteps)) {
          funnelSteps[step] = (funnelSteps[step] ?? 0) + (count as number);
        }
      }

      // Sum unique sessions (approximation — counts across days, not true monthly unique)
      totalUniqueSessions += (data.uniqueSessions as number) ?? 0;
    }

    // Write monthly rollup
    const monthlyRef = db.collection("analytics_monthly").doc(monthKey);
    await monthlyRef.set(
      {
        _v: 1,
        month: monthKey,
        pageViews,
        funnelSteps,
        uniqueSessions: totalUniqueSessions,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    console.log(
      `[analytics-rollup] Monthly rollup for ${monthKey}: ` +
        `${Object.values(pageViews).reduce((s, v) => s + v, 0)} page views, ` +
        `${totalUniqueSessions} sessions (sum of daily)`,
    );
  },
);

