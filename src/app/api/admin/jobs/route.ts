// GET /api/admin/jobs — List jobs with optional status filter

import { NextResponse, type NextRequest } from "next/server";
import { verifyAdminToken } from "@/lib/admin-auth";
import { adminDb } from "@/lib/firebase/admin";

export async function GET(req: NextRequest) {
  const admin = await verifyAdminToken(req.headers.get("authorization"));
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status");
  const limitParam = parseInt(searchParams.get("limit") ?? "50", 10);
  const limit = Math.min(Math.max(limitParam, 1), 200);

  try {
    let query: FirebaseFirestore.Query = adminDb
      .collection("jobs")
      .orderBy("createdAt", "desc")
      .limit(limit);

    if (status) {
      query = query.where("status", "==", status);
    }

    const snap = await query.get();

    const jobs = await Promise.all(
      snap.docs.map(async (doc) => {
        const d = doc.data();
        const offersSnap = await adminDb.collection(`jobs/${doc.id}/offers`).get();
        const offers = offersSnap.docs.map((o) => {
          const od = o.data();
          return {
            id: o.id,
            companyId: od.companyId,
            status: od.status,
            price: od.price,
            emailOpens: od.emailOpens ?? 0,
            linkClicks: od.linkClicks ?? 0,
            sentAt: od.sentAt?.toDate?.()?.toISOString() ?? null,
            viewedAt: od.viewedAt?.toDate?.()?.toISOString() ?? null,
            repliedAt: od.repliedAt?.toDate?.()?.toISOString() ?? null,
          };
        });

        return {
          id: doc.id,
          status: d.status,
          customerName: d.customer?.name ?? "",
          customerEmail: d.customer?.email ?? "",
          customerPhone: d.customer?.phone ?? "",
          pickup: d.pickup?.address ?? "",
          dropCount: d.drops?.length ?? 0,
          totalFlightTimeMin: d.totalFlightTimeMin ?? 0,
          selectedCompanyIds: d.selectedCompanyIds ?? [],
          acceptedCompanyId: d.acceptedCompanyId ?? null,
          createdAt: d.createdAt?.toDate?.()?.toISOString() ?? "",
          acceptedAt: d.acceptedAt?.toDate?.()?.toISOString() ?? null,
          offers,
        };
      }),
    );

    return NextResponse.json({ ok: true, jobs });
  } catch (err) {
    console.error("[admin/jobs] GET error:", err);
    return NextResponse.json({ ok: false, error: "Intern feil" }, { status: 500 });
  }
}

