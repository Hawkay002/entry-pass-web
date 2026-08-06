// app/api/login/route.ts — receives a Firebase ID token (minted by the browser),
// verifies it server-side, and exchanges it for an httpOnly session cookie.
//
// Cookie creation uses firebase-admin's native createSessionCookie (more
// reliable than next-firebase-auth-edge's wrapper). Cookie verification on
// subsequent requests still uses next-firebase-auth-edge in proxy.ts +
// server-auth.ts.
//
// Also auto-assigns the admin role claim to designated admin emails on first
// login (so they don't need a pre-existing Firebase Auth account).

import { NextResponse, type NextRequest } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { authConfig } from "@/lib/env";
import { paths } from "@/lib/paths";
import { logActionToRedis } from "@/lib/redis-log";
import type { AppUser } from "@/lib/auth";

/** Admin emails that auto-receive the admin role claim on login. */
const ADMIN_EMAILS = ["admin.test@gmail.com", "shovith2@gmail.com"];

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
    const auth = getAdminAuth();
    // Verify the token and get user info.
    const decoded = await auth.verifyIdToken(idToken);
    const email = decoded.email ?? "";

    // Auto-assign admin role for designated emails.
    if (ADMIN_EMAILS.includes(email.toLowerCase())) {
      const user = await auth.getUser(decoded.uid);
      if (!user.customClaims?.role) {
        await auth.setCustomUserClaims(decoded.uid, {
          ...user.customClaims,
          role: "admin",
        });
      }
      // Always treat designated admin emails as admin, even on first login
      // before the claim propagates to a fresh token.
    } else {
      // Staff: verify email exists in the roles collection.
      const rolesSnap = await getAdminDb().collection(paths.rolesCollection).get();
      const allStaff = rolesSnap.docs.flatMap((d) => {
        const data = d.data();
        return (data.staff as { email: string }[]) ?? [];
      });
      const found = allStaff.some(
        (s) => s.email.toLowerCase() === email.toLowerCase()
      );
      if (!found) {
        return NextResponse.json(
          { ok: false, error: "This email is not authorized. Contact admin." },
          { status: 403 }
        );
      }
    }

    // Mint a long-lived session cookie (14 days) via firebase-admin.
    const expiresInMs = 1000 * 60 * 60 * 24 * 14;
    const sessionCookie = await auth.createSessionCookie(idToken, {
      expiresIn: expiresInMs,
    });

    // Log the login. The username is "ADMIN" for admin emails; for staff we
    // use their display name or email (matching how getAppUser derives it).
    const isAdminLogin = ADMIN_EMAILS.includes(email.toLowerCase());
    const logUser: AppUser = {
      uid: decoded.uid,
      email,
      username: isAdminLogin ? "ADMIN" : (decoded.name || email),
      role: isAdminLogin ? "admin" : "staff",
    };
    await logActionToRedis(logUser, "LOGIN", `${logUser.username} signed in`);

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
