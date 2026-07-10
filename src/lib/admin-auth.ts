import "server-only";

import { adminAuth } from "@/lib/firebase/admin";

/**
 * Verify admin Authorization header.
 * Expects: Authorization: Bearer <Firebase ID token>
 * Returns the decoded token if valid admin, null otherwise.
 */
export async function verifyAdminToken(
  authHeader: string | null,
): Promise<{ uid: string; email?: string } | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;

  const idToken = authHeader.slice(7);
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    if (decoded.admin !== true) return null;
    return { uid: decoded.uid, email: decoded.email };
  } catch {
    return null;
  }
}

