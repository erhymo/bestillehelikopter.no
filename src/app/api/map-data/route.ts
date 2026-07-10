import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { verifyOfferToken } from "@/lib/tokens";
import { adminDb } from "@/lib/firebase/admin";
import type { GeoPoint, Drop, FlightEstimate } from "@/types";

/**
 * GET /api/map-data?token=xxx
 *
 * Verifies the signed offer token, returns job map data (pickup, drops,
 * estimates), and logs a "map_view" event.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json(
      { error: "Mangler token" },
      { status: 400 },
    );
  }

  // 1. Verify token
  const payload = verifyOfferToken(token);
  if (!payload) {
    return NextResponse.json(
      { error: "Ugyldig eller utløpt lenke" },
      { status: 401 },
    );
  }

  const { jobId, companyId, offerId } = payload;

  // 2. Fetch job document
  const jobSnap = await adminDb.doc(`jobs/${jobId}`).get();
  if (!jobSnap.exists) {
    return NextResponse.json(
      { error: "Forespørselen ble ikke funnet" },
      { status: 404 },
    );
  }

  const jobData = jobSnap.data()!;

  const pickup: GeoPoint = jobData.pickup;
  const drops: Drop[] = jobData.drops ?? [];
  const estimates: FlightEstimate[] = jobData.estimates ?? [];
  const totalFlightTimeMin: number = jobData.totalFlightTimeMin ?? 0;
  const desiredDate: string = jobData.desiredDate ?? "";
  const flexibleDate: boolean = jobData.flexibleDate ?? false;
  const nettbruk: boolean = jobData.nettbruk ?? false;
  const over15m: boolean = jobData.over15m ?? false;

  // 3. Log map_view event (fire-and-forget)
  adminDb
    .collection("events")
    .add({
      type: "map_view",
      jobId,
      companyId,
      offerId,
      createdAt: new Date().toISOString(),
    })
    .catch((err: unknown) =>
      console.error("[map-data] Failed to log map_view event:", err),
    );

  // 4. Return map data
  return NextResponse.json({
    jobId,
    companyId,
    pickup,
    drops,
    estimates,
    totalFlightTimeMin,
    desiredDate,
    flexibleDate,
    nettbruk,
    over15m,
  });
}

