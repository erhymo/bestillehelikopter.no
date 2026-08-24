// GET /api/admin/settings — Read the fixed recipient company (Airlift)
// PATCH /api/admin/settings — Update its email address, or regenerate the
// dashboard key
//
// There is exactly one recipient in this phase of the product, stored as a
// single fixed-ID Company doc.

import { NextResponse, type NextRequest } from "next/server";
import { verifyAdminToken } from "@/lib/admin-auth";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { RECIPIENT_COMPANY_ID } from "@/lib/recipientCompany";
import { randomBytes } from "crypto";

function generateDashboardKey(): string {
  return randomBytes(24).toString("base64url");
}

export async function GET(req: NextRequest) {
  const admin = await verifyAdminToken(req.headers.get("authorization"));
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const ref = adminDb.doc(`companies/${RECIPIENT_COMPANY_ID}`);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ ok: true, company: null });
    }
    let d = snap.data()!;

    // Lazily generate a dashboard key the first time it's needed, so the
    // admin page always has a link to show without a separate setup step.
    if (!d.dashboardKey) {
      const dashboardKey = generateDashboardKey();
      await ref.update({ dashboardKey });
      d = { ...d, dashboardKey };
    }

    return NextResponse.json({
      ok: true,
      company: { id: snap.id, name: d.name, email: d.email, dashboardKey: d.dashboardKey },
    });
  } catch (err) {
    console.error("[admin/settings] GET error:", err);
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
    const { email, regenerateDashboardKey } = body as {
      email?: string;
      regenerateDashboardKey?: boolean;
    };

    const ref = adminDb.doc(`companies/${RECIPIENT_COMPANY_ID}`);
    const snap = await ref.get();

    if (regenerateDashboardKey) {
      const dashboardKey = generateDashboardKey();
      if (snap.exists) {
        await ref.update({ dashboardKey });
      } else {
        await ref.set({
          _v: 1,
          name: "Airlift AS",
          email: "",
          dashboardKey,
          createdAt: FieldValue.serverTimestamp(),
        });
      }
      return NextResponse.json({ ok: true, dashboardKey });
    }

    if (!email || !email.trim()) {
      return NextResponse.json({ ok: false, error: "E-post er påkrevd" }, { status: 400 });
    }

    if (snap.exists) {
      await ref.update({ email: email.trim() });
    } else {
      await ref.set({
        _v: 1,
        name: "Airlift AS",
        email: email.trim(),
        dashboardKey: generateDashboardKey(),
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/settings] PATCH error:", err);
    return NextResponse.json({ ok: false, error: "Intern feil" }, { status: 500 });
  }
}
