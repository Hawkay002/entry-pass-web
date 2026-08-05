// app/kiosk/page.tsx — public self check-in kiosk for a mounted tablet.
// PIN-gated (admin sets the PIN). After unlock, the guest scans their own QR;
// the check-in is validated via /api/kiosk-checkin (no staff login required).
// Top-level route — intentionally NOT under (app) so it dodges forced auth,
// the app shell, tab locks, and the per-request auto-absent DB write.

"use client";

import { useCallback, useState } from "react";
import { QrScanner, type ScanOutcome } from "@/components/scanner/qr-scanner";
import { cn } from "@/lib/utils";

const SESSION_KEY = "kiosk_pin";

export default function KioskPage() {
  // Lazy init from sessionStorage so a refresh keeps the kiosk unlocked
  // (sessionStorage survives refresh; clears on tab close). Reading once at
  // init avoids setState-in-effect.
  const [storedPin, setStoredPin] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return sessionStorage.getItem(SESSION_KEY);
  });

  const handleUnlock = useCallback((validPin: string) => {
    sessionStorage.setItem(SESSION_KEY, validPin);
    setStoredPin(validPin);
  }, []);

  const handleLock = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    setStoredPin(null);
  }, []);

  if (!storedPin) {
    return <PinGate onUnlock={handleUnlock} />;
  }

  return <KioskScanner pin={storedPin} onLock={handleLock} />;
}

// ---------------- PIN Gate ----------------

function PinGate({ onUnlock }: { onUnlock: (pin: string) => void }) {
  const [entry, setEntry] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  async function submit() {
    if (entry.length < 4) return;
    setChecking(true);
    setError("");
    try {
      // Verify the PIN against the server before unlocking.
      const res = await fetch("/api/kiosk-checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: entry, ticketId: "kiosk-pin-check" }),
      });
      if (res.status === 403) {
        // 403 = PIN missing or wrong. A granted/already/invalid outcome means
        // the PIN was accepted (the dummy id just won't match a real ticket).
        setError("Incorrect PIN or kiosk not enabled.");
      } else if (res.ok) {
        onUnlock(entry);
      } else {
        setError("Unable to reach the server. Check your connection.");
      }
    } catch {
      setError("Network error. Check your connection.");
    }
    setChecking(false);
  }

  function press(d: string) {
    setError("");
    if (d === "del") {
      setEntry((e) => e.slice(0, -1));
      return;
    }
    setEntry((e) => (e.length >= 8 ? e : e + d));
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0f0f0f] px-6 text-white">
      <div className="mb-2 flex items-center gap-2 text-emerald-400">
        <ScanLineIcon className="h-7 w-7" />
        <h1 className="text-2xl font-semibold tracking-tight">Self Check-in</h1>
      </div>
      <p className="mb-8 text-sm text-white/60">Enter the event PIN to begin</p>

      <div className="mb-6 flex h-16 flex-wrap items-center justify-center gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-4 w-4 rounded-full transition-colors",
              i < entry.length ? "bg-emerald-400" : "bg-white/15"
            )}
          />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <KeypadButton key={d} onClick={() => press(d)}>{d}</KeypadButton>
        ))}
        <KeypadButton onClick={() => press("del")} variant="ghost">⌫</KeypadButton>
        <KeypadButton onClick={() => press("0")}>0</KeypadButton>
        <KeypadButton
          onClick={submit}
          disabled={entry.length < 4 || checking}
          variant="primary"
        >
          {checking ? "…" : "OK"}
        </KeypadButton>
      </div>

      {error && <p className="mt-6 text-sm text-red-400">{error}</p>}
    </div>
  );
}

function KeypadButton({
  children,
  onClick,
  disabled,
  variant = "default",
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: "default" | "primary" | "ghost";
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex h-20 w-20 items-center justify-center rounded-2xl text-2xl font-medium transition-all active:scale-95 disabled:opacity-40",
        variant === "default" && "bg-white/10 hover:bg-white/20",
        variant === "primary" && "bg-emerald-500 text-black hover:bg-emerald-400",
        variant === "ghost" && "bg-transparent text-white/70 hover:bg-white/10"
      )}
    >
      {children}
    </button>
  );
}

// ---------------- Kiosk Scanner ----------------

function KioskScanner({ pin, onLock }: { pin: string; onLock: () => void }) {
  async function handleCode(ticketId: string): Promise<ScanOutcome> {
    try {
      const res = await fetch("/api/kiosk-checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin, ticketId }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        // 403 mid-session = admin disabled/changed the PIN → lock out.
        if (res.status === 403) {
          onLock();
          return { kind: "error", message: "Kiosk session ended. Contact staff." };
        }
        return { kind: "error", message: data.error ?? "Check-in failed." };
      }
      if (data.outcome === "granted") {
        return { kind: "granted", name: data.ticket?.name ?? "", id: ticketId };
      }
      if (data.outcome === "already") {
        return {
          kind: "already",
          name: data.ticket?.name ?? "",
          id: ticketId,
          status: data.ticket?.status ?? "",
        };
      }
      return { kind: "invalid", id: ticketId };
    } catch {
      return { kind: "error", message: "Network error. Check your connection." };
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0f0f0f] px-6 py-8 text-white">
      <div className="mb-6 flex items-center gap-2 text-emerald-400">
        <ScanLineIcon className="h-6 w-6" />
        <h1 className="text-xl font-semibold">Self Check-in</h1>
      </div>

      <div className="w-full max-w-md">
        <QrScanner
          onCode={handleCode}
          autoStart
          showControls={false}
          previewClassName="!max-w-[260px]"
        />
        <p className="mt-6 text-center text-sm text-white/50">
          Point your camera at the QR code on your pass
        </p>
      </div>
    </div>
  );
}

// Inline scan-line icon (avoids an extra import for the kiosk bundle).
function ScanLineIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 7V5a2 2 0 0 1 2-2h2" />
      <path d="M17 3h2a2 2 0 0 1 2 2v2" />
      <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
      <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
      <path d="M7 12h10" />
    </svg>
  );
}
