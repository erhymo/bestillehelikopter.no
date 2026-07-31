// POST /api/elevation — Live elevation lookup for the RFQ flight-time preview
//
// The customer sees an estimated flight time while filling out the form,
// before phone verification / submission. Without this, that preview used
// elevation = 0 for every point (flat terrain), so it silently ignored
// slope even though the final, server-computed estimate at submission time
// (POST /api/rfq) always has real elevation. This closes that gap using the
// same cached fetchElevations() helper, so the number the customer watches
// update while placing points matches what actually gets stored.

import { NextResponse, type NextRequest } from "next/server";
import { fetchElevations } from "@/lib/googleMaps";
import { z } from "zod";

const PointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

// Matches the RFQ schema's cap (1 pickup + up to 26 drops).
const BodySchema = z.object({
  points: z.array(PointSchema).min(1).max(27),
});

export async function POST(req: NextRequest) {
  try {
    const raw = await req.json();
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Ugyldig forespørsel" },
        { status: 400 },
      );
    }

    const results = await fetchElevations(parsed.data.points);
    return NextResponse.json({
      ok: true,
      elevations: results.map((r) => r.elevation),
    });
  } catch (err) {
    console.error("[elevation] POST error:", err);
    return NextResponse.json(
      { ok: false, error: "Kunne ikke hente høydedata" },
      { status: 500 },
    );
  }
}
