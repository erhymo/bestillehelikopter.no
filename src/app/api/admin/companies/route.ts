// GET /api/admin/companies — List companies
// POST /api/admin/companies — Add new company
// PATCH /api/admin/companies — Edit/disable company

import { NextResponse, type NextRequest } from "next/server";
import { verifyAdminToken } from "@/lib/admin-auth";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

type BaseLocationInput = { lat: number; lng: number } | null | undefined;

function isValidBaseLocation(loc: BaseLocationInput): loc is { lat: number; lng: number } {
  return (
    !!loc &&
    typeof loc.lat === "number" &&
    typeof loc.lng === "number" &&
    Math.abs(loc.lat) <= 90 &&
    Math.abs(loc.lng) <= 180
  );
}

export async function GET(req: NextRequest) {
  const admin = await verifyAdminToken(req.headers.get("authorization"));
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const snap = await adminDb.collection("companies").orderBy("name").get();
    const companies = snap.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        name: d.name,
        email: d.email,
        phone: d.phone,
        region: d.region ?? [],
        baseLocation: d.baseLocation ?? null,
        disabled: d.disabled ?? false,
        avgRating: d.avgRating ?? 0,
        ratingCount: d.ratingCount ?? 0,
        createdAt: d.createdAt?.toDate?.()?.toISOString() ?? "",
      };
    });
    return NextResponse.json({ ok: true, companies });
  } catch (err) {
    console.error("[admin/companies] GET error:", err);
    return NextResponse.json({ ok: false, error: "Intern feil" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const admin = await verifyAdminToken(req.headers.get("authorization"));
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, email, phone, region, baseLocation } = body as {
      name?: string;
      email?: string;
      phone?: string;
      region?: string[];
      baseLocation?: BaseLocationInput;
    };

    if (!name || !email || !phone) {
      return NextResponse.json(
        { ok: false, error: "Navn, e-post og telefon er påkrevd" },
        { status: 400 },
      );
    }

    if (baseLocation !== undefined && baseLocation !== null && !isValidBaseLocation(baseLocation)) {
      return NextResponse.json(
        { ok: false, error: "Ugyldig baseposisjon" },
        { status: 400 },
      );
    }

    const ref = await adminDb.collection("companies").add({
      _v: 1,
      name,
      email,
      phone,
      region: region ?? [],
      baseLocation: isValidBaseLocation(baseLocation) ? baseLocation : null,
      disabled: false,
      avgRating: 0,
      ratingCount: 0,
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true, id: ref.id });
  } catch (err) {
    console.error("[admin/companies] POST error:", err);
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
    const { id, ...updates } = body as {
      id: string;
      name?: string;
      email?: string;
      phone?: string;
      region?: string[];
      baseLocation?: BaseLocationInput;
      disabled?: boolean;
    };

    if (!id) {
      return NextResponse.json({ ok: false, error: "id er påkrevd" }, { status: 400 });
    }

    if (updates.baseLocation !== undefined && updates.baseLocation !== null && !isValidBaseLocation(updates.baseLocation)) {
      return NextResponse.json(
        { ok: false, error: "Ugyldig baseposisjon" },
        { status: 400 },
      );
    }

    // Only allow safe fields
    const allowed: Record<string, unknown> = {};
    if (updates.name !== undefined) allowed.name = updates.name;
    if (updates.email !== undefined) allowed.email = updates.email;
    if (updates.phone !== undefined) allowed.phone = updates.phone;
    if (updates.region !== undefined) allowed.region = updates.region;
    if (updates.baseLocation !== undefined) {
      allowed.baseLocation = updates.baseLocation === null ? null : updates.baseLocation;
    }
    if (updates.disabled !== undefined) allowed.disabled = updates.disabled;

    if (Object.keys(allowed).length === 0) {
      return NextResponse.json({ ok: false, error: "Ingen felt å oppdatere" }, { status: 400 });
    }

    await adminDb.collection("companies").doc(id).update(allowed);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/companies] PATCH error:", err);
    return NextResponse.json({ ok: false, error: "Intern feil" }, { status: 500 });
  }
}

