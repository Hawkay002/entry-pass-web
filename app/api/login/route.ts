// app/api/login/route.ts — receives a Firebase ID token (minted by the browser),
// verifies it server-side, and exchanges it for an httpOnly session cookie.
//
// Cookie creation uses firebase-admin's native createSessionCookie (more
// reliable than next-firebase-auth-edge's wrapper). Cookie verification on
// subsequent requests still uses next-firebase-auth-edge in proxy.ts +
// server-auth.ts.

import { NextResponse, type NextRequest } from "next/server";
import { getAdminAuth } from "@/lib/firebase/admin";
import { authConfig } from "@/lib/env";

export async function POST(req: NextRequest) {
  let idToken: string;
  try {
    const body = await req.json();
    idToken = String(body?.idToken ?? "");
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request body." },
      { status: 400 }
    );
  }

  if (!idToken) {
    return NextResponse.json(
      { ok: false, error: "ID token is required." },
      { status: 400 }
    );
  }

  try {
    // Mint a long-lived session cookie (14 days) via firebase-admin.
    const expiresInMs = 1000 * 60 * 60 * 24 * 14;
    const sessionCookie = await getAdminAuth().createSessionCookie(idToken, {
      expiresIn: expiresInMs,
    });

    const res = NextResponse.json({ ok: true });
    res.cookies.set(authConfig.cookieName, sessionCookie, {
      ...authConfig.cookieSerializeOptions,
      httpOnly: true,
    });
    return res;
  } catch (err) {
    console.error("[login] session cookie creation failed:", err);
    return NextResponse.json(
      { ok: false, error: "Could not create session. Please try again." },
      { status: 401 }
    );
  }
}
