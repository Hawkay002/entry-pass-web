// components/tickets/phone-gate.tsx — phone verification overlay for the
// public guest ticket page. Blocks the ticket until the guest enters the
// phone number matching the ticket.

"use client";

import { useState } from "react";
import { Loader2, Lock, ArrowRight } from "lucide-react";

export function PhoneGate({ ticketId, onVerified }: { ticketId: string; onVerified: () => void }) {
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (phone.replace(/\D/g, "").length < 4) return;
    setChecking(true);
    setError("");
    try {
      const res = await fetch("/api/ticket-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId, phone }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        onVerified();
        return;
      }
      if (res.status === 429) {
        setError(data.error ?? "Too many attempts. Try again later.");
      } else {
        setError(data.error ?? "Phone number does not match.");
      }
    } catch {
      setError("Network error. Check your connection.");
    }
    setChecking(false);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#050505] px-6 text-white">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent-secondary/15">
            <Lock className="h-7 w-7 text-accent-secondary" />
          </div>
          <h1 className="text-2xl font-semibold">Verify Your Ticket</h1>
          <p className="mt-2 text-sm text-white/50">
            Enter your full phone number with country code (e.g. +91XXXXXXXXXX) to view your pass.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            value={phone}
            onChange={(e) => { setPhone(e.target.value); setError(""); }}
            placeholder="+91XXXXXXXXXX"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center text-lg tracking-wider outline-none transition-colors placeholder:text-white/30 focus:border-accent-secondary"
            autoFocus
          />
          {error && (
            <p className="text-center text-sm text-red-400">{error}</p>
          )}
          <button
            type="submit"
            disabled={checking || phone.replace(/\D/g, "").length < 4}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent-secondary py-3 font-semibold text-black transition-colors hover:bg-accent-secondary/90 disabled:opacity-40"
          >
            {checking ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                Verify <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
