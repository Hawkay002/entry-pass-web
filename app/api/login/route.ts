// app/api/login/route.ts — sign in with Firebase client SDK, then mint a
// server session cookie via next-firebase-auth-edge. The ID token never
// persists; only the httpOnly session cookie does.

import { NextResponse, type NextRequest } from "next/server";
import { signInWithEmailAndPassword, getIdToken } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { authConfig } from "@/lib/env";
import { getFirebaseAuth } from "next-firebase-auth-edge";

// Note: this route is a Route Handler (runs on the server), but the Firebase
// *client* SDK sign-in here happens server-side during the request — we only
// use it to obtain a fresh ID token, which we immediately exchange for a
// session cookie. The client never holds the ID token.

const serverAuth = getFirebaseAuth({
  serviceAccount: authConfig.serviceAccount as never,
  apiKey: authConfig.apiKey,
});

export async function POST(req: NextRequest) {
  let email: string;
  let password: string;
  try {
    const body = await req.json();
    email = String(body?.email ?? "");
    password = String(body?.password ?? "");
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request body." },
      { status: 400 }
    );
  }

  if (!email || !password) {
    return NextResponse.json(
      { ok: false, error: "Email and password are required." },
      { status: 400 }
    );
  }

  try {
    // 1. Verify credentials with Firebase Auth (server-side client SDK call).
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const idToken = await getIdToken(credential.user);

    // 2. Mint a long-lived session cookie.
    const expiresInMs = 1000 * 60 * 60 * 24 * 14; // 14 days
    const sessionCookie = await serverAuth.createSessionCookie(
      idToken,
      expiresInMs
    );

    // 3. Set the httpOnly cookie.
    const res = NextResponse.json({ ok: true });
    res.cookies.set(authConfig.cookieName, sessionCookie, {
      ...authConfig.cookieSerializeOptions,
      httpOnly: true,
    });
    return res;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid email or password." },
      { status: 401 }
    );
  }
}
