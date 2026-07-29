// app/api/logout/route.ts — clear the session cookie.

import { NextResponse } from "next/server";
import { authConfig } from "@/lib/env";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(authConfig.cookieName);
  return res;
}
