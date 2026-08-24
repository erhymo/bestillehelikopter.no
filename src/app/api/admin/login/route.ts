// POST /api/admin/login — Username/password login for the admin panel

import { NextResponse, type NextRequest } from "next/server";
import {
  verifyAdminCredentials,
  mintAdminSession,
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE_SECONDS,
} from "@/lib/admin-session";
import { z } from "zod";

const LoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const raw = await req.json().catch(() => null);
  const parsed = LoginSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Ugyldig data" }, { status: 400 });
  }

  const { username, password } = parsed.data;
  if (!verifyAdminCredentials(username, password)) {
    return NextResponse.json(
      { ok: false, error: "Feil brukernavn eller passord" },
      { status: 401 },
    );
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_SESSION_COOKIE, mintAdminSession(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
  });
  return res;
}
