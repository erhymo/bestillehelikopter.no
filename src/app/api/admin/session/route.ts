// GET /api/admin/session — Check whether the admin_session cookie is valid

import { NextResponse, type NextRequest } from "next/server";
import { verifyAdminSession, ADMIN_SESSION_COOKIE } from "@/lib/admin-session";

export async function GET(req: NextRequest) {
  const authenticated = verifyAdminSession(req.cookies.get(ADMIN_SESSION_COOKIE)?.value);
  return NextResponse.json({ ok: true, authenticated });
}
