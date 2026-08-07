// app/api/wallet-pass/route.ts — generates a Google Wallet "Save" URL.
// POST { ticketId, name, typeLabel, eventName, venue, gender, age }
// Uses inline class+object JWT (no pre-created pass class needed).
// Requires GOOGLE_WALLET_ISSUER_ID env var.

import { NextResponse } from "next/server";
import { generateWalletUrl } from "@/lib/google-wallet";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID ?? "";

  if (body.checkOnly) {
    return NextResponse.json({ ok: !!issuerId });
  }

  if (!issuerId) {
    return NextResponse.json({ ok: false, error: "Wallet not configured" });
  }

  const ticketId = String(body.ticketId ?? "");
  if (!ticketId) {
    return NextResponse.json({ ok: false, error: "Missing ticketId" }, { status: 400 });
  }

  const url = generateWalletUrl({
    ticketId,
    name: String(body.name ?? ""),
    typeLabel: String(body.typeLabel ?? ""),
    eventName: String(body.eventName ?? ""),
    venue: String(body.venue ?? ""),
    gender: String(body.gender ?? ""),
    age: String(body.age ?? ""),
    issuerId,
  });

  if (!url) {
    return NextResponse.json({ ok: false, error: "Failed to generate pass" });
  }

  return NextResponse.json({ ok: true, url });
}
