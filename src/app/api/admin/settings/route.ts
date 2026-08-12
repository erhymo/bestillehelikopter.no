// GET /api/admin/settings — Read the fixed recipient company (Airlift)
// PATCH /api/admin/settings — Update its email address
//
// There is exactly one recipient in this phase of the product, stored as a
// single fixed-ID Company doc. This endpoint intentionally only exposes the
// one field an admin should ever need to change here.

import { NextResponse, type NextRequest } from "next/server";
import { verifyAdminToken } from "@/lib/admin-auth";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { RECIPIENT_COMPANY_ID } from "@/lib/recipientCompany";

export async function GET(req: NextRequest) {
  const admin = await verifyAdminToken(req.headers.get("authorization"));
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const snap = await adminDb.doc(`companies/${RECIPIENT_COMPANY_ID}`).get();
    if (!snap.exists) {
      return NextResponse.json({ ok: true, company: null });
    }
    const d = snap.data()!;
    return NextResponse.json({
      ok: true,
      company: { id: snap.id, name: d.name, email: d.email },
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
    const { email } = body as { email?: string };

    if (!email || !email.trim()) {
      return NextResponse.json({ ok: false, error: "E-post er påkrevd" }, { status: 400 });
    }

    const ref = adminDb.doc(`companies/${RECIPIENT_COMPANY_ID}`);
    const snap = await ref.get();
    if (snap.exists) {
      await ref.update({ email: email.trim() });
    } else {
      await ref.set({
        _v: 1,
        name: "Airlift AS",
        email: email.trim(),
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/settings] PATCH error:", err);
    return NextResponse.json({ ok: false, error: "Intern feil" }, { status: 500 });
  }
}
