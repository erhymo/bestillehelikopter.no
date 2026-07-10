// POST /api/rfq — Submit a new RFQ

import { NextResponse, type NextRequest } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase/admin";
import { fetchElevations } from "@/lib/googleMaps";
import { estimateAll } from "@/lib/flight";
import { JobStatus } from "@/types";
import { validateEmail } from "@/lib/disposableEmail";
import { Timestamp } from "firebase-admin/firestore";
import { z } from "zod";

// ── Zod schema for strict RFQ payload validation ──────────────────────────

const LoadItemSchema = z.object({
  count: z.number().int().min(1),
  weightKg: z.number().min(0),
  type: z.string().min(1).max(100),
});

const DropInputSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  hpieces: z.number().int().min(1).default(1),
  loadItems: z.array(LoadItemSchema).default([]),
});

const RfqPayloadSchema = z.object({
  customer: z.object({
    name: z.string().trim().min(1, "Navn er påkrevd"),
    company: z.string().trim().optional(),
    email: z.string().trim().min(1, "E-post er påkrevd"),
    phone: z
      .string()
      .trim()
      .regex(/^\+47\d{8}$/, "Ugyldig norsk telefonnummer"),
    invoiceAddress: z.string().trim().min(1, "Fakturaadresse er påkrevd"),
    orgnr: z.string().trim().optional(),
  }),
  pickup: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    address: z.string().optional(),
  }),
  drops: z
    .array(DropInputSchema)
    .min(1, "Minst ett leveringspunkt kreves")
    .max(26, "Maks 26 leveringspunkter"),
  nettbruk: z.boolean().default(false),
  over15m: z.boolean().default(false),
  desiredDate: z.string().default(""),
  flexibleDate: z.boolean().default(false),
  notes: z.string().max(2000).default(""),
  selectedCompanyIds: z
    .array(z.string().min(1))
    .min(1, "Velg minst ett selskap")
    .max(50),
  imageRefs: z.array(z.string()).max(5).default([]),
});

export type RfqPayload = z.infer<typeof RfqPayloadSchema>;

export async function POST(req: NextRequest) {
  try {
    // 1. Verify Firebase Auth token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { ok: false, error: "Mangler autorisasjon" },
        { status: 401 },
      );
    }

    const idToken = authHeader.slice(7);
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch {
      return NextResponse.json(
        { ok: false, error: "Ugyldig token" },
        { status: 401 },
      );
    }

    // 2. Parse and validate body with zod
    const raw = await req.json();
    const parsed = RfqPayloadSchema.safeParse(raw);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return NextResponse.json(
        {
          ok: false,
          error: firstError?.message ?? "Ugyldig forespørsel",
          details: parsed.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        },
        { status: 400 },
      );
    }

    const {
      customer,
      pickup,
      drops,
      nettbruk,
      over15m,
      desiredDate,
      flexibleDate,
      notes,
      selectedCompanyIds,
      imageRefs,
    } = parsed.data;

    // Validate email format + disposable check
    const emailCheck = validateEmail(customer.email);
    if (!emailCheck.valid) {
      return NextResponse.json(
        { ok: false, error: emailCheck.message },
        { status: 400 },
      );
    }

    // 3. Fetch elevations server-side
    const allPoints = [
      { lat: pickup.lat, lng: pickup.lng },
      ...drops.map((d) => ({ lat: d.lat, lng: d.lng })),
    ];

    const elevations = await fetchElevations(allPoints);
    const pickupWithElev = {
      lat: pickup.lat,
      lng: pickup.lng,
      elevation: elevations[0].elevation,
      ...(pickup.address ? { address: pickup.address } : {}),
    };

    const dropsWithElev = drops.map((d, i) => ({
      lat: d.lat,
      lng: d.lng,
      elevation: elevations[i + 1].elevation,
      hpieces: d.hpieces,
      loadItems: d.loadItems,
    }));

    // 4. Compute flight estimates
    const { estimates, totalFlightTimeMin } = estimateAll(
      pickupWithElev,
      dropsWithElev,
    );

    // 5. Create Job document
    const now = Timestamp.now();
    const sixMonths = Timestamp.fromMillis(
      now.toMillis() + 180 * 24 * 60 * 60 * 1000,
    );

    const jobData = {
      _v: 1,
      status: JobStatus.Open,
      customer: {
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        invoiceAddress: customer.invoiceAddress,
        ...(customer.company ? { company: customer.company } : {}),
        ...(customer.orgnr ? { orgnr: customer.orgnr } : {}),
        firebaseUid: decodedToken.uid,
      },
      pickup: pickupWithElev,
      drops: dropsWithElev,
      nettbruk,
      over15m,
      desiredDate,
      flexibleDate,
      notes: notes.trim(),
      selectedCompanyIds,
      imageRefs,
      estimates,
      totalFlightTimeMin,
      pdfRef: null,
      acceptedCompanyId: null,
      acceptedAt: null,
      createdAt: now,
      expiresAt: sixMonths,
    };

    const docRef = await adminDb.collection("jobs").add(jobData);

    return NextResponse.json({ ok: true, jobId: docRef.id });
  } catch (err) {
    console.error("POST /api/rfq error:", err);
    return NextResponse.json(
      {
        ok: false,
        error:
          err instanceof Error ? err.message : "Intern feil ved opprettelse",
      },
      { status: 500 },
    );
  }
}

