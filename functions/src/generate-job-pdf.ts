/**
 * generateJobPdf(jobId)
 *
 * Cloud Function helper that:
 * 1. Fetches job data from Firestore
 * 2. Builds a Static Maps URL and fetches the image
 * 3. Downloads customer-uploaded images from Storage (max 5), resizes for PDF
 * 4. Generates a PDF with pdf-lib:
 *    - Header, customer info, pickup/drop table, estimates, map, images
 * 5. Saves PDF to Storage, returns { pdfBytes, pdfRef, downloadUrl }
 */

import * as admin from "firebase-admin";
import { Bucket } from "@google-cloud/storage";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import sharp from "sharp";

// ── Types (mirrored from src/types — avoids client SDK dependency) ──────────

interface GeoPoint {
  lat: number;
  lng: number;
  elevation: number;
  address?: string;
}

interface LoadItem {
  count: number;
  weightKg: number;
  type: string;
}

interface Drop extends GeoPoint {
  hpieces: number;
  loadItems: LoadItem[];
}

interface FlightEstimate {
  dropIndex: number;
  distanceKm: number;
  elevGainM: number;
  slopeDeg: number;
  speedKn: number;
  flightTimeMin: number;
}

interface Customer {
  name: string;
  company?: string;
  email: string;
  phone: string;
  invoiceAddress: string;
  orgnr?: string;
}

interface JobData {
  customer: Customer;
  pickup: GeoPoint;
  drops: Drop[];
  estimates: FlightEstimate[];
  totalFlightTimeMin: number;
  nettbruk: boolean;
  over15m: boolean;
  desiredDate: string;
  flexibleDate: boolean;
  notes: string;
  imageRefs: string[];
}

// ── Constants ───────────────────────────────────────────────────────────────

const PAGE_W = 595.28; // A4 width in points
const PAGE_H = 841.89; // A4 height in points
const MARGIN = 50;
const LINE_H = 14;
const SECTION_GAP = 20;
const CONTENT_W = PAGE_W - 2 * MARGIN;

const COLOR_HEADER = rgb(0.12, 0.25, 0.45);
const COLOR_TEXT = rgb(0.15, 0.15, 0.15);
const COLOR_LABEL = rgb(0.4, 0.4, 0.4);
const COLOR_LINE = rgb(0.82, 0.82, 0.82);

// ── PDF generation result ───────────────────────────────────────────────────

export interface PdfResult {
  pdfBytes: Uint8Array;
  pdfRef: string; // Storage path
  downloadUrl: string; // signed URL
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function fmtCoord(lat: number, lng: number): string {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

function fmtElev(m: number): string {
  return `${Math.round(m)} m`;
}

function fmtTime(min: number): string {
  if (min < 1) return `${Math.round(min * 60)}s`;
  return `${min.toFixed(1)} min`;
}

/** Build a Static Maps URL with pickup + drops + straight lines. */
function buildMapUrl(pickup: GeoPoint, drops: Drop[]): string {
  const apiKey = process.env.GOOGLE_MAPS_SERVER_KEY;
  if (!apiKey) throw new Error("Missing GOOGLE_MAPS_SERVER_KEY");

  const params = new URLSearchParams();
  params.set("size", "580x300");
  params.set("maptype", "terrain");
  params.set("key", apiKey);
  params.set("language", "no");
  params.set("region", "NO");

  // Pickup marker (green)
  params.append(
    "markers",
    `color:green|label:P|${pickup.lat},${pickup.lng}`,
  );

  // Drop markers (red, labeled A-Z)
  drops.forEach((d, i) => {
    const label = String.fromCharCode(65 + (i % 26));
    params.append("markers", `color:red|label:${label}|${d.lat},${d.lng}`);
  });

  // Straight lines from pickup to each drop
  drops.forEach((d) => {
    params.append(
      "path",
      `color:0x4285F480|weight:2|${pickup.lat},${pickup.lng}|${d.lat},${d.lng}`,
    );
  });

  return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
}

/** Fetch image from URL and return PNG buffer suitable for pdf-lib. */
async function fetchImageAsPng(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
  const arrayBuf = await res.arrayBuffer();
  return sharp(Buffer.from(arrayBuf)).png().toBuffer();
}

/** Download from Storage, resize, convert to PNG. */
async function downloadStorageImage(
  bucket: Bucket,
  ref: string,
  maxWidth: number,
): Promise<Buffer | null> {
  try {
    const [data] = await bucket.file(ref).download();
    return sharp(data)
      .resize({ width: maxWidth, withoutEnlargement: true })
      .png()
      .toBuffer();
  } catch {
    return null; // skip broken images
  }
}

// ── Page helper ─────────────────────────────────────────────────────────────

class PdfWriter {
  private doc: PDFDocument;
  private page: ReturnType<PDFDocument["addPage"]>;
  private y: number;
  private font!: Awaited<ReturnType<PDFDocument["embedFont"]>>;
  private fontBold!: Awaited<ReturnType<PDFDocument["embedFont"]>>;

  constructor(doc: PDFDocument) {
    this.doc = doc;
    this.page = doc.addPage([PAGE_W, PAGE_H]);
    this.y = PAGE_H - MARGIN;
  }

  async init() {
    this.font = await this.doc.embedFont(StandardFonts.Helvetica);
    this.fontBold = await this.doc.embedFont(StandardFonts.HelveticaBold);
  }

  /** Ensure enough vertical space; add new page if needed. */
  private ensureSpace(needed: number) {
    if (this.y - needed < MARGIN) {
      this.page = this.doc.addPage([PAGE_W, PAGE_H]);
      this.y = PAGE_H - MARGIN;
    }
  }

  /** Draw header text (bold, larger). */
  drawHeader(text: string, size = 16) {
    this.ensureSpace(size + SECTION_GAP);
    this.y -= SECTION_GAP;
    this.page.drawText(text, {
      x: MARGIN,
      y: this.y,
      size,
      font: this.fontBold,
      color: COLOR_HEADER,
    });
    this.y -= size + 4;
  }

  /** Draw a label: value pair. */
  drawField(label: string, value: string) {
    this.ensureSpace(LINE_H);
    this.page.drawText(`${label}:`, {
      x: MARGIN,
      y: this.y,
      size: 9,
      font: this.fontBold,
      color: COLOR_LABEL,
    });
    this.page.drawText(value, {
      x: MARGIN + 120,
      y: this.y,
      size: 9,
      font: this.font,
      color: COLOR_TEXT,
    });
    this.y -= LINE_H;
  }

  /** Draw a horizontal line. */
  drawLine() {
    this.ensureSpace(8);
    this.y -= 4;
    this.page.drawLine({
      start: { x: MARGIN, y: this.y },
      end: { x: PAGE_W - MARGIN, y: this.y },
      thickness: 0.5,
      color: COLOR_LINE,
    });
    this.y -= 4;
  }

  /** Draw a table with headers and rows. */
  drawTable(headers: string[], rows: string[][], colWidths: number[]) {
    const rowH = LINE_H + 2;
    this.ensureSpace(rowH * (rows.length + 1) + 4);

    // Header row
    let x = MARGIN;
    for (let c = 0; c < headers.length; c++) {
      this.page.drawText(headers[c], {
        x,
        y: this.y,
        size: 8,
        font: this.fontBold,
        color: COLOR_LABEL,
      });
      x += colWidths[c];
    }
    this.y -= rowH;

    // Data rows
    for (const row of rows) {
      this.ensureSpace(rowH);
      x = MARGIN;
      for (let c = 0; c < row.length; c++) {
        this.page.drawText(row[c], {
          x,
          y: this.y,
          size: 8,
          font: this.font,
          color: COLOR_TEXT,
        });
        x += colWidths[c];
      }
      this.y -= rowH;
    }
  }

  /** Embed a PNG image on the current page. */
  async drawImage(pngBuffer: Buffer, maxW: number, maxH: number) {
    const img = await this.doc.embedPng(pngBuffer);
    const scaled = img.scaleToFit(maxW, maxH);
    this.ensureSpace(scaled.height + 10);
    this.page.drawImage(img, {
      x: MARGIN,
      y: this.y - scaled.height,
      width: scaled.width,
      height: scaled.height,
    });
    this.y -= scaled.height + 10;
  }

  /** Draw plain text (wraps manually at ~90 chars). */
  drawText(text: string, size = 9) {
    const maxChars = Math.floor(CONTENT_W / (size * 0.5));
    const lines = text.split("\n");
    for (const raw of lines) {
      // Simple word-wrap
      const words = raw.split(" ");
      let line = "";
      for (const word of words) {
        if ((line + " " + word).length > maxChars && line.length > 0) {
          this.ensureSpace(LINE_H);
          this.page.drawText(line, {
            x: MARGIN,
            y: this.y,
            size,
            font: this.font,
            color: COLOR_TEXT,
          });
          this.y -= LINE_H;
          line = word;
        } else {
          line = line ? `${line} ${word}` : word;
        }
      }
      if (line) {
        this.ensureSpace(LINE_H);
        this.page.drawText(line, {
          x: MARGIN,
          y: this.y,
          size,
          font: this.font,
          color: COLOR_TEXT,
        });
        this.y -= LINE_H;
      }
    }
  }

  getY() {
    return this.y;
  }
}

// ── Main export ─────────────────────────────────────────────────────────────

/**
 * Generate a PDF for a job and save it to Storage.
 *
 * @param jobId - Firestore document ID in the `jobs` collection
 * @returns PdfResult with bytes, storage path, and signed download URL
 */
export async function generateJobPdf(jobId: string): Promise<PdfResult> {
  const db = admin.firestore();
  const jobSnap = await db.doc(`jobs/${jobId}`).get();
  if (!jobSnap.exists) throw new Error(`Job ${jobId} not found`);
  const job = jobSnap.data() as JobData;

  // ── Create PDF ──
  const doc = await PDFDocument.create();
  const w = new PdfWriter(doc);
  await w.init();

  // 1. Header
  w.drawHeader("BestilleHelikopter.no — Forespørsel");
  w.drawLine();

  // 2. Customer info
  w.drawHeader("Kundeinformasjon", 12);
  w.drawField("Navn", job.customer.name);
  if (job.customer.company) w.drawField("Firma", job.customer.company);
  w.drawField("E-post", job.customer.email);
  w.drawField("Telefon", job.customer.phone);
  w.drawField("Fakturaadresse", job.customer.invoiceAddress);
  if (job.customer.orgnr) w.drawField("Org.nr", job.customer.orgnr);
  w.drawLine();

  // 3. Job details
  w.drawHeader("Oppdragsdetaljer", 12);
  w.drawField("Ønsket dato", job.desiredDate || "Ikke spesifisert");
  w.drawField("Fleksibel dato", job.flexibleDate ? "Ja" : "Nei");
  w.drawField("Nettbruk", job.nettbruk ? "Ja" : "Nei");
  w.drawField("Last over 15 m", job.over15m ? "Ja" : "Nei");
  if (job.notes) {
    w.drawField("Kommentarer", "");
    w.drawText(job.notes);
  }
  w.drawLine();

  // 4. Pickup
  w.drawHeader("Hentested (Pickup)", 12);
  w.drawField("Koordinater", fmtCoord(job.pickup.lat, job.pickup.lng));
  w.drawField("Høyde", fmtElev(job.pickup.elevation));
  if (job.pickup.address) w.drawField("Adresse", job.pickup.address);
  w.drawLine();

  // 5. Drops table
  w.drawHeader("Slippsoner", 12);
  const dropHeaders = ["#", "Koordinater", "Høyde", "Hiv", "Last"];
  const dropColWidths = [30, 140, 60, 40, CONTENT_W - 270];
  const dropRows = job.drops.map((d, i) => {
    const label = String.fromCharCode(65 + (i % 26));
    const loadStr = d.loadItems
      .map((l) => `${l.count}×${l.weightKg}kg ${l.type}`)
      .join(", ");
    return [
      label,
      fmtCoord(d.lat, d.lng),
      fmtElev(d.elevation),
      String(d.hpieces),
      loadStr || "—",
    ];
  });
  w.drawTable(dropHeaders, dropRows, dropColWidths);
  w.drawLine();

  // 6. Flight estimates table
  w.drawHeader("Flyestimater", 12);
  const estHeaders = ["Drop", "Avstand", "Høydeforskj.", "Helling", "Fart", "Tid"];
  const estColWidths = [40, 70, 80, 60, 60, CONTENT_W - 310];
  const estRows = job.estimates.map((e) => {
    const label = String.fromCharCode(65 + (e.dropIndex % 26));
    return [
      label,
      `${e.distanceKm.toFixed(1)} km`,
      `${Math.round(e.elevGainM)} m`,
      `${e.slopeDeg.toFixed(1)}°`,
      `${Math.round(e.speedKn)} kn`,
      fmtTime(e.flightTimeMin),
    ];
  });
  w.drawTable(estHeaders, estRows, estColWidths);
  w.drawField("Total flytid", fmtTime(job.totalFlightTimeMin));
  w.drawLine();

  // 7. Static map image
  try {
    const mapUrl = buildMapUrl(job.pickup, job.drops);
    const mapPng = await fetchImageAsPng(mapUrl);
    w.drawHeader("Kart", 12);
    await w.drawImage(mapPng, CONTENT_W, 280);
  } catch {
    // Map fetch failed — skip silently
  }

  // 8. Customer images (at the end)
  if (job.imageRefs.length > 0) {
    w.drawHeader("Kundebilder", 12);
    const bucket = admin.storage().bucket();
    for (const ref of job.imageRefs) {
      const imgBuf = await downloadStorageImage(bucket, ref, 500);
      if (imgBuf) {
        await w.drawImage(imgBuf, CONTENT_W, 300);
      }
    }
  }

  // ── Save to Storage ──
  const pdfBytes = await doc.save();
  const bucket = admin.storage().bucket();
  const pdfRef = `pdfs/${jobId}.pdf`;
  await bucket.file(pdfRef).save(Buffer.from(pdfBytes), {
    contentType: "application/pdf",
    metadata: { cacheControl: "private, max-age=31536000" },
  });

  // Signed URL — valid 7 days (for internal use / email attachment link)
  const [downloadUrl] = await bucket.file(pdfRef).getSignedUrl({
    action: "read",
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
  });

  // Update job doc with pdfRef
  await db.doc(`jobs/${jobId}`).update({ pdfRef });

  return { pdfBytes, pdfRef, downloadUrl };
}

