// POST /api/offer — Submit offer reply from company

import { NextResponse, type NextRequest } from "next/server";
import { verifyOfferToken, buildAcceptUrl } from "@/lib/tokens";
import { adminDb } from "@/lib/firebase/admin";
import { OfferStatus, type OfferAddon } from "@/types";
import {
  OFFER_PRICE_DISCLAIMER,
  TILFLYGNING_ADDON_KEY,
  TILFLYGNING_ADDON_LABEL,
} from "@/lib/offerAddons";
import { FieldValue } from "firebase-admin/firestore";
import { formatDateNorwegian } from "@/lib/formatDate";
import { z } from "zod";

// ── Zod schema ─────────────────────────────────────────────────

const OfferPayloadSchema = z.object({
  token: z.string().min(1),
  hourlyRate: z.number().positive("Timepris må være positiv"),
  tilflygningPrice: z.number().min(0).default(0),
  totalPrice: z.number().positive("Totalpris må være positiv"),
  comment: z.string().max(1000).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const parsed = OfferPayloadSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Ugyldig data" },
        { status: 400 },
      );
    }

    const { token, hourlyRate, tilflygningPrice, totalPrice, comment } = parsed.data;
    const trimmedComment = comment?.trim() || null;
    const addons: OfferAddon[] =
      tilflygningPrice > 0
        ? [{ key: TILFLYGNING_ADDON_KEY, label: TILFLYGNING_ADDON_LABEL, price: tilflygningPrice }]
        : [];

    // 2. Verify token
    const payload = verifyOfferToken(token);
    if (!payload) {
      return NextResponse.json(
        { ok: false, error: "Ugyldig eller utløpt token" },
        { status: 401 },
      );
    }

    const { jobId, companyId, offerId } = payload;

    // 3. Fetch offer + job doc (need job's flight-time estimate to compute price)
    const offerRef = adminDb.doc(`jobs/${jobId}/offers/${offerId}`);
    const [offerSnap, jobSnap] = await Promise.all([
      offerRef.get(),
      adminDb.doc(`jobs/${jobId}`).get(),
    ]);
    if (!offerSnap.exists || !jobSnap.exists) {
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

    const jobData = jobSnap.data()!;
    // Flytidskostnad = totalpris minus tillegg — utledet fra totalprisen
    // (som kan være rundet av selskapet), ikke regnet uavhengig fra
    // timepris × flytid. Slik stemmer linjene alltid overens med totalen
    // kunden faktisk ser og aksepterer.
    const price = totalPrice - tilflygningPrice;

    // 4. Update offer document
    const now = FieldValue.serverTimestamp();
    await offerRef.update({
      price,
      hourlyRate,
      addons,
      totalPrice,
      comment: trimmedComment,
      attachmentRef: null,
      status: OfferStatus.Replied,
      repliedAt: now,
    });

    // 5. Fetch company for email to customer
    const companySnap = await adminDb.doc(`companies/${companyId}`).get();
    const companyData = companySnap.data();

    if (jobData?.customer?.email && companyData?.name) {
      // Send customer notification email with accept link via SendGrid REST API.
      // Reply-To is set to the company's own email so replies reach them
      // directly, even though the email itself is sent from our system.
      const acceptUrl = buildAcceptUrl(token);
      const sgApiKey = process.env.SENDGRID_API_KEY;
      if (sgApiKey) {
        const customerName = jobData.customer.name ?? "Kunde";
        const compName = companyData.name as string;
        const desiredDate = jobData.desiredDate as string | undefined;
        const desiredTime = jobData.desiredTime as string | undefined;
        const dateLine = desiredDate
          ? `${formatDateNorwegian(desiredDate)}${desiredTime ? ` kl. ${desiredTime}` : ""}${jobData.flexibleDate ? " (fleksibel)" : ""}`
          : null;
        const addonRows = addons
          .map(
            (a) =>
              `<tr><td style="padding:4px 0;color:#555">${a.label}</td><td style="padding:4px 0;text-align:right;color:#555">${a.price.toLocaleString("nb-NO")} NOK</td></tr>`,
          )
          .join("");
        const html = `<!DOCTYPE html>
<html lang="no"><head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;padding:20px;background:#f9f9f9">
<div style="background:#fff;border-radius:8px;padding:32px;border:1px solid #e5e5e5">
<h2 style="color:#1e3a5f;margin-top:0">Nytt tilbud mottatt</h2>
<p>Hei ${customerName},</p>
<p><strong>${compName}</strong> har sendt deg et tilbud på <strong>${totalPrice.toLocaleString("nb-NO")} NOK</strong>.</p>
${dateLine ? `<p style="color:#555">Ønsket dato: <strong>${dateLine}</strong></p>` : ""}
${trimmedComment ? `<div style="background:#f0f4f8;border-radius:6px;padding:12px 16px;margin:12px 0"><p style="margin:0;color:#555;font-size:13px">Melding fra ${compName}:</p><p style="margin:4px 0 0;white-space:pre-wrap">${trimmedComment.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p></div>` : ""}
<table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:14px">
<tr><td style="padding:4px 0;color:#555">Flytidskostnad</td><td style="padding:4px 0;text-align:right;color:#555">${price.toLocaleString("nb-NO")} NOK</td></tr>
${addonRows}
<tr><td style="padding:8px 0;border-top:1px solid #e5e5e5;font-weight:600">Totalt</td><td style="padding:8px 0;border-top:1px solid #e5e5e5;text-align:right;font-weight:600">${totalPrice.toLocaleString("nb-NO")} NOK</td></tr>
</table>
<p style="font-size:13px;color:#888">${OFFER_PRICE_DISCLAIMER}</p>
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
            reply_to: { email: companyData.email as string, name: compName },
            subject: `Tilbud mottatt fra ${compName} — ${totalPrice.toLocaleString("nb-NO")} NOK`,
            content: [{ type: "text/html", value: html }],
          }),
        }).catch((err: unknown) =>
          console.error("[offer] Failed to send customer email:", err),
        );
      }
    }

    // 6. Log event
    adminDb
      .collection("events")
      .add({
        type: "offer_replied",
        jobId,
        companyId,
        offerId,
        metadata: { price, hourlyRate },
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
