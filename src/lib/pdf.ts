import "server-only";

// PDF-generering for RFQ (server-only)
// TODO: implementer med jsPDF

import type { Job } from "@/types";

export async function generateRfqPdf(_job: Job): Promise<Buffer> {
  // TODO: implementer
  throw new Error("Not implemented");
}

