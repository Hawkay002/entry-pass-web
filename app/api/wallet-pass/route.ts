// app/api/wallet-pass/route.ts — generates a Google Wallet "Save" URL.
// POST { ticketId, name, typeLabel, eventName } → { ok, url }
// If pass class not configured → { ok: false }
// { checkOnly: true } → just checks if Wallet is configured.

import { NextResponse } from "next/server";
import { GOOGLE_WALLET_PASS_CLASS_ID } from "@/lib/env";
import { generateWalletUrl } from "@/lib/google-wallet";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { ticketId?: unknown; name?: unknown; typeLabel?: unknown; eventName?: unknown; checkOnly?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  // Just checking if Wallet is configured.
  if (body.checkOnly) {
    return NextResponse.json({ ok: !!GOOGLE_WALLET_PASS_CLASS_ID });
  }

  if (!GOOGLE_WALLET_PASS_CLASS_ID) {
    return NextResponse.json({ ok: false, error: "Wallet not configured" });
  }

  const ticketId = String(body.ticketId ?? "");
  const name = String(body.name ?? "");
  const typeLabel = String(body.typeLabel ?? "");
  const eventName = String(body.eventName ?? "");

  if (!ticketId) {
    return NextResponse.json({ ok: false, error: "Missing ticketId" }, { status: 400 });
  }

  const url = generateWalletUrl(ticketId, name, typeLabel, eventName, GOOGLE_WALLET_PASS_CLASS_ID);

  if (!url) {
    return NextResponse.json({ ok: false, error: "Failed to generate pass" });
  }

  return NextResponse.json({ ok: true, url });
}
