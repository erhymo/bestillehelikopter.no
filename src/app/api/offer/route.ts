// POST /api/offer — Submit offer reply from company

import { NextResponse, type NextRequest } from "next/server";
import { verifyOfferToken, buildAcceptUrl } from "@/lib/tokens";
import { adminDb, adminStorage } from "@/lib/firebase/admin";
import { OfferStatus } from "@/types";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";

// ── Zod schema ─────────────────────────────────────────────────

const OfferPayloadSchema = z.object({
  token: z.string().min(1),
  price: z.number().positive("Totalpris må være positiv"),
  hourlyRate: z.number().positive("Timepris må være positiv").optional(),
  hivRate: z.number().positive("Hivpris må være positiv").optional(),
  comment: z.string().max(2000).optional(),
});

// Max attachment size: 5 MB
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    // 1. Parse multipart form data
    const formData = await req.formData();
    const jsonStr = formData.get("json");
    if (typeof jsonStr !== "string") {
      return NextResponse.json(
        { ok: false, error: "Mangler JSON-data" },
        { status: 400 },
      );
    }

    const parsed = OfferPayloadSchema.safeParse(JSON.parse(jsonStr));
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Ugyldig data" },
        { status: 400 },
      );
    }

    const { token, price, hourlyRate, hivRate, comment } = parsed.data;

    // 2. Verify token
    const payload = verifyOfferToken(token);
    if (!payload) {
      return NextResponse.json(
        { ok: false, error: "Ugyldig eller utløpt token" },
        { status: 401 },
      );
    }

    const { jobId, companyId, offerId } = payload;

    // 3. Fetch offer doc — check status
    const offerRef = adminDb.doc(`jobs/${jobId}/offers/${offerId}`);
    const offerSnap = await offerRef.get();
    if (!offerSnap.exists) {
      return NextResponse.json(
        { ok: false, error: "Tilbudet ble ikke funnet" },
        { status: 404 },
      );
    }

    const offerData = offerSnap.data()!;
    if (
      offerData.status === OfferStatus.Replied ||
      offerData.status === OfferStatus.Accepted ||
      offerData.status === OfferStatus.Closed
    ) {
      return NextResponse.json(
        { ok: false, error: "Tilbud er allerede sendt. Du kan ikke endre det." },
        { status: 409 },
      );
    }

    // 4. Handle optional PDF attachment
    let attachmentRef: string | null = null;
    const file = formData.get("attachment");
    if (file && file instanceof File && file.size > 0) {
      if (file.size > MAX_ATTACHMENT_BYTES) {
        return NextResponse.json(
          { ok: false, error: "Vedlegg kan ikke være større enn 5 MB" },
          { status: 400 },
        );
      }
      if (file.type !== "application/pdf") {
        return NextResponse.json(
          { ok: false, error: "Kun PDF-vedlegg er tillatt" },
          { status: 400 },
        );
      }

      const storagePath = `offers/${jobId}/${offerId}/attachment.pdf`;
      const bucket = adminStorage.bucket();
      const fileRef = bucket.file(storagePath);
      const buffer = Buffer.from(await file.arrayBuffer());
      await fileRef.save(buffer, {
        contentType: "application/pdf",
        metadata: { companyId },
      });
      attachmentRef = storagePath;
    }

    // 5. Update offer document
    const now = FieldValue.serverTimestamp();
    await offerRef.update({
      price,
      hourlyRate: hourlyRate ?? null,
      hivRate: hivRate ?? null,
      comment: comment?.trim() || null,
      attachmentRef,
      status: OfferStatus.Replied,
      repliedAt: now,
    });

    // 6. Fetch job + company for email to customer
    const [jobSnap, companySnap] = await Promise.all([
      adminDb.doc(`jobs/${jobId}`).get(),
      adminDb.doc(`companies/${companyId}`).get(),
    ]);

    const jobData = jobSnap.data();
    const companyData = companySnap.data();

    if (jobData?.customer?.email && companyData?.name) {
      // Send customer notification email with accept link via SendGrid REST API
      const acceptUrl = buildAcceptUrl(token);
      const sgApiKey = process.env.SENDGRID_API_KEY;
      if (sgApiKey) {
        const customerName = jobData.customer.name ?? "Kunde";
        const compName = companyData.name as string;
        const html = `<!DOCTYPE html>
<html lang="no"><head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;padding:20px;background:#f9f9f9">
<div style="background:#fff;border-radius:8px;padding:32px;border:1px solid #e5e5e5">
<h2 style="color:#1e3a5f;margin-top:0">Nytt tilbud mottatt</h2>
<p>Hei ${customerName},</p>
<p><strong>${compName}</strong> har sendt deg et tilbud på <strong>${price.toLocaleString("nb-NO")} NOK</strong>.</p>
${comment ? `<p style="color:#555"><em>"${comment.trim()}"</em></p>` : ""}
<div style="margin:24px 0;text-align:center">
<a href="${acceptUrl}" style="display:inline-block;padding:14px 28px;background:#16a34a;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;font-size:16px">Se og aksepter tilbud</a>
</div>
<p style="font-size:13px;color:#888">Denne lenken er gyldig i 14 dager.</p>
</div></body></html>`;
        fetch("https://api.sendgrid.com/v3/mail/send", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${sgApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            personalizations: [
              {
                to: [{ email: jobData.customer.email }],
                custom_args: { jobId, companyId, offerId },
              },
            ],
            from: {
              email: process.env.SENDGRID_FROM_EMAIL ?? "post@bestillehelikopter.no",
              name: "BestilleHelikopter.no",
            },
            subject: `Tilbud mottatt fra ${compName} — ${price.toLocaleString("nb-NO")} NOK`,
            content: [{ type: "text/html", value: html }],
          }),
        }).catch((err: unknown) =>
          console.error("[offer] Failed to send customer email:", err),
        );
      }
    }

    // 7. Log event
    adminDb
      .collection("events")
      .add({
        type: "offer_replied",
        jobId,
        companyId,
        offerId,
        metadata: { price, hourlyRate: hourlyRate ?? 0, hivRate: hivRate ?? 0 },
        createdAt: new Date().toISOString(),
      })
      .catch((err: unknown) =>
        console.error("[offer] Failed to log offer_replied event:", err),
      );

    return NextResponse.json({ ok: true, offerId });
  } catch (err) {
    console.error("[offer] POST error:", err);
    return NextResponse.json(
      { ok: false, error: "Intern feil" },
      { status: 500 },
    );
  }
}

