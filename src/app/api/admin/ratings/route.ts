// GET /api/admin/ratings — List ratings (pending first)
// PATCH /api/admin/ratings — Approve/reject rating + recalc company stats

import { NextResponse, type NextRequest } from "next/server";
import { verifyAdminToken } from "@/lib/admin-auth";
import { adminDb } from "@/lib/firebase/admin";

export async function GET(req: NextRequest) {
  const admin = await verifyAdminToken(req.headers.get("authorization"));
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const onlyPending = searchParams.get("pending") === "true";

  try {
    let query: FirebaseFirestore.Query = adminDb
      .collection("ratings")
      .orderBy("createdAt", "desc")
      .limit(200);

    if (onlyPending) {
      query = query.where("approved", "==", false);
    }

    const snap = await query.get();
    const ratings = snap.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        jobId: d.jobId,
        companyId: d.companyId,
        score: d.score,
        comment: d.comment ?? "",
        approved: d.approved,
        createdAt: d.createdAt?.toDate?.()?.toISOString() ?? "",
      };
    });

    return NextResponse.json({ ok: true, ratings });
  } catch (err) {
    console.error("[admin/ratings] GET error:", err);
    return NextResponse.json({ ok: false, error: "Intern feil" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const admin = await verifyAdminToken(req.headers.get("authorization"));
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, approved } = body as { id?: string; approved?: boolean };

    if (!id || typeof approved !== "boolean") {
      return NextResponse.json(
        { ok: false, error: "id og approved er påkrevd" },
        { status: 400 },
      );
    }

    const ratingRef = adminDb.collection("ratings").doc(id);
    const ratingSnap = await ratingRef.get();
    if (!ratingSnap.exists) {
      return NextResponse.json({ ok: false, error: "Vurdering ikke funnet" }, { status: 404 });
    }

    const ratingData = ratingSnap.data()!;
    await ratingRef.update({ approved });

    // Recalculate company stats
    const companyId = ratingData.companyId as string;
    const allRatings = await adminDb
      .collection("ratings")
      .where("companyId", "==", companyId)
      .get();

    let sum = 0;
    let count = 0;
    for (const r of allRatings.docs) {
      const rd = r.data();
      // Count approved ratings (use new value for the one we just updated)
      const isApproved = r.id === id ? approved : rd.approved;
      if (isApproved) {
        sum += rd.score;
        count++;
      }
    }

    await adminDb.collection("companies").doc(companyId).update({
      avgRating: count > 0 ? Math.round((sum / count) * 10) / 10 : 0,
      ratingCount: count,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/ratings] PATCH error:", err);
    return NextResponse.json({ ok: false, error: "Intern feil" }, { status: 500 });
  }
}

