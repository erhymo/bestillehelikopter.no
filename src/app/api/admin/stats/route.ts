// GET /api/admin/stats — Aggregated statistics from events collection

import { NextResponse, type NextRequest } from "next/server";
import { verifyAdminToken } from "@/lib/admin-auth";
import { adminDb } from "@/lib/firebase/admin";

interface EventRow {
  type: string;
  companyId?: string;
  timestamp: FirebaseFirestore.Timestamp;
  metadata?: Record<string, unknown>;
}

export async function GET(req: NextRequest) {
  const admin = await verifyAdminToken(req.headers.get("authorization"));
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Gather all events from last 12 months
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const eventsSnap = await adminDb
      .collectionGroup("events")
      .where("timestamp", ">=", twelveMonthsAgo)
      .orderBy("timestamp", "desc")
      .limit(10000)
      .get();

    // Aggregate by month and type
    const monthlyMap = new Map<
      string,
      { rfq: number; offersSent: number; offersReceived: number; accepted: number; completed: number; closed: number }
    >();
    // Company response times
    const companyResponseTimes = new Map<string, number[]>();

    for (const doc of eventsSnap.docs) {
      const e = doc.data() as EventRow;
      const ts = e.timestamp?.toDate?.();
      if (!ts) continue;

      const monthKey = `${ts.getFullYear()}-${String(ts.getMonth() + 1).padStart(2, "0")}`;
      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, { rfq: 0, offersSent: 0, offersReceived: 0, accepted: 0, completed: 0, closed: 0 });
      }
      const m = monthlyMap.get(monthKey)!;

      switch (e.type) {
        case "rfq_created":
          m.rfq++;
          break;
        case "offer_sent":
          m.offersSent++;
          break;
        case "offer_replied":
          m.offersReceived++;
          // Track response time
          if (e.companyId && e.metadata?.responseTimeH) {
            if (!companyResponseTimes.has(e.companyId)) {
              companyResponseTimes.set(e.companyId, []);
            }
            companyResponseTimes.get(e.companyId)!.push(Number(e.metadata.responseTimeH));
          }
          break;
        case "offer_accepted":
          m.accepted++;
          break;
        case "job_completed":
          m.completed++;
          break;
      }
    }

    // Convert to sorted array
    const monthly = Array.from(monthlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({ month, ...data }));

    // Company avg response times
    const companyStats = Array.from(companyResponseTimes.entries()).map(([companyId, times]) => ({
      companyId,
      avgResponseTimeH: Math.round((times.reduce((a, b) => a + b, 0) / times.length) * 10) / 10,
      offerCount: times.length,
    }));

    // Totals
    const totals = {
      rfq: 0,
      offersSent: 0,
      offersReceived: 0,
      accepted: 0,
      completed: 0,
    };
    for (const m of monthly) {
      totals.rfq += m.rfq;
      totals.offersSent += m.offersSent;
      totals.offersReceived += m.offersReceived;
      totals.accepted += m.accepted;
      totals.completed += m.completed;
    }

    // ── Analytics data (page views & funnel) ──────────────────────
    const analyticsMonthlySnap = await adminDb
      .collection("analytics_monthly")
      .orderBy("month", "desc")
      .limit(12)
      .get();

    const analyticsMonthly = analyticsMonthlySnap.docs.map((doc) => {
      const d = doc.data();
      return {
        month: d.month as string,
        pageViews: (d.pageViews ?? {}) as Record<string, number>,
        funnelSteps: (d.funnelSteps ?? {}) as Record<string, number>,
        uniqueSessions: (d.uniqueSessions ?? 0) as number,
      };
    }).sort((a, b) => a.month.localeCompare(b.month));

    // Today's daily doc for real-time view
    const todayKey = new Date().toISOString().slice(0, 10);
    const todaySnap = await adminDb.collection("analytics_daily").doc(todayKey).get();
    const todayAnalytics = todaySnap.exists
      ? {
          date: todayKey,
          pageViews: (todaySnap.data()?.pageViews ?? {}) as Record<string, number>,
          funnelSteps: (todaySnap.data()?.funnelSteps ?? {}) as Record<string, number>,
        }
      : null;

    return NextResponse.json({ ok: true, totals, monthly, companyStats, analyticsMonthly, todayAnalytics });
  } catch (err) {
    console.error("[admin/stats] GET error:", err);
    return NextResponse.json({ ok: false, error: "Intern feil" }, { status: 500 });
  }
}

