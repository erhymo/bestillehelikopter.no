// POST /api/register — Company registers the agreed date/time for an accepted job

import { NextResponse, type NextRequest } from "next/server";
import { verifyOfferToken } from "@/lib/tokens";
import { adminDb } from "@/lib/firebase/admin";
import { JobStatus } from "@/types";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";

// ── Zod schema ─────────────────────────────────────────────────

const RegisterPayloadSchema = z.object({
  token: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ugyldig dato"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Ugyldig klokkeslett"),
});

function formatDateNorwegian(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`);
  return date.toLocaleDateString("nb-NO", { day: "numeric", month: "long", year: "numeric" });
}

export async function POST(req: NextRequest) {
  try {
    const parsed = RegisterPayloadSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Ugyldig data" },
        { status: 400 },
      );
    }

    const { token, date, time } = parsed.data;

    // 1. Verify token
    const payload = verifyOfferToken(token);
    if (!payload) {
      return NextResponse.json(
        { ok: false, error: "Ugyldig eller utløpt token" },
        { status: 401 },
      );
    }

    const { jobId, companyId, offerId } = payload;

    // 2. Fetch job + company
    const [jobSnap, companySnap] = await Promise.all([
      adminDb.doc(`jobs/${jobId}`).get(),
      adminDb.doc(`companies/${companyId}`).get(),
    ]);

    if (!jobSnap.exists) {
      return NextResponse.json(
        { ok: false, error: "Forespørselen ble ikke funnet" },
        { status: 404 },
      );
    }

    const jobData = jobSnap.data()!;
    const companyData = companySnap.data();

    // 3. Job must be accepted by this company before a date/time can be registered
    if (jobData.status !== JobStatus.Accepted || jobData.acceptedCompanyId !== companyId) {
      return NextResponse.json(
        { ok: false, error: "Kunden har ikke akseptert tilbudet ennå" },
        { status: 409 },
      );
    }

    // 4. Update job document
    await adminDb.doc(`jobs/${jobId}`).update({
      confirmedDate: date,
      confirmedTime: time,
      confirmedAt: FieldValue.serverTimestamp(),
    });

    // 5. Send confirmation email to customer
    if (jobData.customer?.email && companyData?.name) {
      const sgApiKey = process.env.SENDGRID_API_KEY;
      if (sgApiKey) {
        const customerName = jobData.customer.name ?? "Kunde";
        const compName = companyData.name as string;
        const pickupAddress = jobData.pickup?.address as string | undefined;
        const dateStr = formatDateNorwegian(date);

        const html = `<!DOCTYPE html>
<html lang="no"><head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;padding:20px;background:#f9f9f9">
<div style="background:#fff;border-radius:8px;padding:32px;border:1px solid #e5e5e5">
<h2 style="color:#1e3a5f;margin-top:0">Oppdraget er bekreftet</h2>
<p>Hei ${customerName},</p>
<p><strong>${compName}</strong> har bekreftet oppdraget ditt:</p>
<table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:14px">
<tr><td style="padding:4px 0;color:#555">Dato</td><td style="padding:4px 0;text-align:right;font-weight:600">${dateStr}</td></tr>
<tr><td style="padding:4px 0;color:#555">Oppmøtetidspunkt</td><td style="padding:4px 0;text-align:right;font-weight:600">kl. ${time}</td></tr>
${pickupAddress ? `<tr><td style="padding:4px 0;color:#555">Oppmøtested</td><td style="padding:4px 0;text-align:right;font-weight:600">${pickupAddress}</td></tr>` : ""}
</table>
<p style="font-size:13px;color:#888">Denne e-posten er sendt fra BestilleHelikopter.no.</p>
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
            subject: `Oppdraget er bekreftet — ${dateStr}`,
            content: [{ type: "text/html", value: html }],
          }),
        }).catch((err: unknown) =>
          console.error("[register] Failed to send customer email:", err),
        );
      }
    }

    // 6. Log event
    adminDb
      .collection("events")
      .add({
        type: "job_confirmed",
        jobId,
        companyId,
        offerId,
        metadata: { date, time },
        createdAt: new Date().toISOString(),
      })
      .catch((err: unknown) =>
        console.error("[register] Failed to log job_confirmed event:", err),
      );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[register] POST error:", err);
    return NextResponse.json(
      { ok: false, error: "Intern feil" },
      { status: 500 },
    );
  }
}
