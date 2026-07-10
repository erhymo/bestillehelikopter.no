// POST /api/admin/email — Send email to customer from admin

import { NextResponse, type NextRequest } from "next/server";
import { verifyAdminToken } from "@/lib/admin-auth";

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY ?? "";
const FROM_EMAIL = process.env.FROM_EMAIL ?? "noreply@bestillehelikopter.no";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@bestillehelikopter.no";

export async function POST(req: NextRequest) {
  const admin = await verifyAdminToken(req.headers.get("authorization"));
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { to, subject, text } = body as {
      to?: string;
      subject?: string;
      text?: string;
    };

    if (!to || !subject || !text) {
      return NextResponse.json(
        { ok: false, error: "to, subject og text er påkrevd" },
        { status: 400 },
      );
    }

    const sgRes = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: FROM_EMAIL, name: "BestilleHelikopter.no" },
        reply_to: { email: ADMIN_EMAIL, name: "Admin" },
        subject,
        content: [
          {
            type: "text/plain",
            value: text,
          },
          {
            type: "text/html",
            value: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">
              <h2 style="color:#1e3a5f;">${subject}</h2>
              <p style="white-space:pre-wrap;">${text}</p>
              <hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb;" />
              <p style="font-size:12px;color:#9ca3af;">Denne e-posten ble sendt fra BestilleHelikopter.no</p>
            </div>`,
          },
        ],
      }),
    });

    if (!sgRes.ok) {
      const errText = await sgRes.text();
      console.error("[admin/email] SendGrid error:", sgRes.status, errText);
      return NextResponse.json(
        { ok: false, error: "Feil ved sending av e-post" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/email] POST error:", err);
    return NextResponse.json({ ok: false, error: "Intern feil" }, { status: 500 });
  }
}

