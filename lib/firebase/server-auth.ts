// lib/firebase/server-auth.ts — resolve the session cookie into an AppUser.
//
// Used by Server Components, Route Handlers, and Server Actions to enforce
// authorization on the server (replacing the old client-side email check).

import { cookies } from "next/headers";
import { getTokens } from "next-firebase-auth-edge";
import { authConfig, paths } from "@/lib/env";
import { ROLE_CLAIM, USERNAME_CLAIM, type AppUser } from "@/lib/auth";
import type { Role } from "@/lib/types";
import { adminDb } from "@/lib/firebase/admin";

/** Decode the role claim, falling back to a safe non-admin default. */
function decodeRole(claim: unknown): Role {
  const roles: Role[] = [
    "admin",
    "event_manager",
    "registration_desk",
    "security_head",
  ];
  return roles.includes(claim as Role) ? (claim as Role) : "event_manager";
}

/**
 * Read the current authenticated user from the request's session cookie.
 * Returns null if there is no valid session (caller should redirect to /login).
 *
 * For staff, also confirms the username still exists in allowed_usernames
 * and matches this account's email — mirroring the original gatekeeper check,
 * but enforced server-side.
 */
export async function getAppUser(): Promise<AppUser | null> {
  const cookieStore = await cookies();
  const tokens = await getTokens(cookieStore, {
    apiKey: authConfig.apiKey,
    cookieName: authConfig.cookieName,
    cookieSignatureKeys: authConfig.cookieSignatureKeys,
    serviceAccount: authConfig.serviceAccount as never,
  });

  const decoded = tokens?.decodedToken;
  if (!decoded) return null;

  const role = decodeRole(decoded[ROLE_CLAIM]);
  let username = (decoded[USERNAME_CLAIM] as string | undefined) ?? "";

  // Admins always use the reserved "ADMIN" username.
  if (role === "admin") {
    username = "ADMIN";
  } else if (username) {
    // Staff: verify the username profile still exists and is bound to this email.
    try {
      const snap = await adminDb
        .collection(paths.usernamesCollection)
        .doc(username)
        .get();
      const data = snap.data();
      if (!data || data.email !== decoded.email) {
        // Profile no longer valid — treat as not fully authenticated.
        username = "";
      }
    } catch {
      username = "";
    }
  }

  return {
    uid: decoded.uid,
    email: decoded.email ?? null,
    username,
    role,
  };
}
