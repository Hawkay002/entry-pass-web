// lib/firebase/server-auth.ts — resolve the session cookie into an AppUser.
//
// Uses firebase-admin's verifySessionCookie (matches the cookie created in
// /api/login via firebase-admin). Custom claims (role, username) are read
// from the decoded token.

import { cookies } from "next/headers";
import { getAdminAuth } from "@/lib/firebase/admin";
import { authConfig } from "@/lib/env";
import { paths } from "@/lib/paths";
import { getAdminDb } from "@/lib/firebase/admin";
import { ROLE_CLAIM, USERNAME_CLAIM, type AppUser } from "@/lib/auth";
import type { Role } from "@/lib/types";

function decodeRole(claim: unknown): Role {
  const roles: Role[] = [
    "admin",
    "event_manager",
    "registration_desk",
    "security_head",
  ];
  return roles.includes(claim as Role) ? (claim as Role) : "event_manager";
}

export async function getAppUser(): Promise<AppUser | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(authConfig.cookieName)?.value;
  if (!cookie) return null;

  let decoded;
  try {
    decoded = await getAdminAuth().verifySessionCookie(cookie, true);
  } catch (err) {
    console.error("[server-auth] session cookie invalid:", err);
    return null;
  }

  const role = decodeRole(decoded[ROLE_CLAIM]);
  let username = (decoded[USERNAME_CLAIM] as string | undefined) ?? "";

  if (role === "admin") {
    username = "ADMIN";
  } else if (username) {
    // Staff: confirm the username profile still exists and is bound to this email.
    try {
      const snap = await getAdminDb()
        .collection(paths.usernamesCollection)
        .doc(username)
        .get();
      const data = snap.data();
      if (!data || data.email !== decoded.email) {
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
