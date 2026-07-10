// POST /api/accept — Customer accepts an offer (signed link)

import { NextResponse, type NextRequest } from "next/server";
import { verifyOfferToken } from "@/lib/tokens";
import { adminDb } from "@/lib/firebase/admin";
import { OfferStatus, JobStatus } from "@/types";
import { z } from "zod";

// ── Zod schema ─────────────────────────────────────────────────

const AcceptPayloadSchema = z.object({
  token: z.string().min(1),
});

// ── POST handler ───────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // 1. Parse + validate body
    const body = await req.json();
    const parsed = AcceptPayloadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Ugyldig data" },
        { status: 400 },
      );
    }

    const { token } = parsed.data;

    // 2. Verify token
    const payload = verifyOfferToken(token);
    if (!payload) {
      return NextResponse.json(
        { ok: false, error: "Ugyldig eller utløpt lenke" },
        { status: 401 },
      );
    }

    const { jobId, companyId, offerId } = payload;

    // 3. Fetch job + offer
    const [jobSnap, offerSnap] = await Promise.all([
      adminDb.doc(`jobs/${jobId}`).get(),
      adminDb.doc(`jobs/${jobId}/offers/${offerId}`).get(),
    ]);

    if (!jobSnap.exists || !offerSnap.exists) {
      return NextResponse.json(
        { ok: false, error: "Forespørselen ble ikke funnet" },
        { status: 404 },
      );
    }

    const jobData = jobSnap.data()!;
    const offerData = offerSnap.data()!;

    // 4. Idempotency — if already accepted, check if same offer
    if (jobData.status === JobStatus.Accepted) {
      if (jobData.acceptedCompanyId === companyId) {
        // Same offer already accepted — return success (idempotent)
        return NextResponse.json({ ok: true, alreadyAccepted: true });
      }
      // Different offer was accepted
      return NextResponse.json(
        { ok: false, error: "Et annet tilbud er allerede akseptert for denne forespørselen" },
        { status: 409 },
      );
    }

    // 5. Offer must be in "replied" status (company has submitted a price)
    if (offerData.status !== OfferStatus.Replied) {
      return NextResponse.json(
        { ok: false, error: "Dette tilbudet er ikke klart til å aksepteres" },
        { status: 400 },
      );
    }

    // 6. Mark the offer as accepted — triggers onOfferAccept Cloud Function
    //    which handles: job update, other offers closure, emails, events
    await adminDb.doc(`jobs/${jobId}/offers/${offerId}`).update({
      status: OfferStatus.Accepted,
    });

    return NextResponse.json({ ok: true, jobId, offerId, companyId });
  } catch (err) {
    console.error("[accept] POST error:", err);
    return NextResponse.json(
      { ok: false, error: "Intern feil" },
      { status: 500 },
    );
  }
}

