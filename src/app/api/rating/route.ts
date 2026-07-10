// POST /api/rating — Customer submits a rating for the accepted company

import { NextResponse, type NextRequest } from "next/server";
import { verifyOfferToken } from "@/lib/tokens";
import { adminDb } from "@/lib/firebase/admin";
import { JobStatus } from "@/types";
import { z } from "zod";
import { createHash } from "crypto";

// ── Zod schema ─────────────────────────────────────────────────

const RatingPayloadSchema = z.object({
  token: z.string().min(1),
  score: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).default(""),
});

// ── POST handler ───────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // 1. Parse + validate body
    const body = await req.json();
    const parsed = RatingPayloadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Ugyldig data" },
        { status: 400 },
      );
    }

    const { token, score, comment } = parsed.data;

    // 2. Verify token
    const payload = verifyOfferToken(token);
    if (!payload) {
      return NextResponse.json(
        { ok: false, error: "Ugyldig eller utløpt lenke" },
        { status: 401 },
      );
    }

    const { jobId, companyId, offerId } = payload;

    // 3. Fetch job — must be accepted or completed
    const jobSnap = await adminDb.doc(`jobs/${jobId}`).get();
    if (!jobSnap.exists) {
      return NextResponse.json(
        { ok: false, error: "Forespørselen ble ikke funnet" },
        { status: 404 },
      );
    }

    const jobData = jobSnap.data()!;
    if (
      jobData.status !== JobStatus.Accepted &&
      jobData.status !== JobStatus.Completed
    ) {
      return NextResponse.json(
        { ok: false, error: "Oppdraget er ikke i en tilstand der du kan gi vurdering" },
        { status: 400 },
      );
    }

    // Must be the accepted company
    if (jobData.acceptedCompanyId !== companyId) {
      return NextResponse.json(
        { ok: false, error: "Denne vurderingen gjelder ikke det aksepterte selskapet" },
        { status: 400 },
      );
    }

    // 4. Duplicate check — one rating per job
    const customerId = createHash("sha256")
      .update(jobData.customer?.phone ?? "")
      .digest("hex")
      .slice(0, 16);

    const existingRating = await adminDb
      .collection("ratings")
      .where("jobId", "==", jobId)
      .where("customerId", "==", customerId)
      .limit(1)
      .get();

    if (!existingRating.empty) {
      return NextResponse.json(
        { ok: false, error: "Du har allerede gitt en vurdering for dette oppdraget" },
        { status: 409 },
      );
    }

    // 5. Create rating doc (on-rating-create trigger handles approval + stats)
    const ratingRef = await adminDb.collection("ratings").add({
      _v: 1,
      jobId,
      companyId,
      offerId,
      customerId,
      score,
      comment,
      approved: false, // trigger sets this based on score
      createdAt: new Date(),
    });

    // 6. Log event
    adminDb
      .collection("events")
      .add({
        type: "rating_submitted",
        jobId,
        companyId,
        offerId,
        metadata: { score, ratingId: ratingRef.id },
        createdAt: new Date().toISOString(),
      })
      .catch((err: unknown) =>
        console.error("[rating] Failed to log event:", err),
      );

    return NextResponse.json({
      ok: true,
      ratingId: ratingRef.id,
      autoApproved: score >= 3,
    });
  } catch (err) {
    console.error("[rating] POST error:", err);
    return NextResponse.json(
      { ok: false, error: "Intern feil" },
      { status: 500 },
    );
  }
}

