// POST /api/webhooks/sendgrid — SendGrid event webhook (open/click tracking)

import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ ok: false, error: "Not implemented" }, { status: 501 });
}

