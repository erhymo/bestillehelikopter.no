import "server-only";

import type { NextRequest } from "next/server";
import { verifyAdminSession, ADMIN_SESSION_COOKIE } from "@/lib/admin-session";

/**
 * Verify the admin_session cookie on an incoming API request.
 */
export function verifyAdmin(req: NextRequest): boolean {
  return verifyAdminSession(req.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}
