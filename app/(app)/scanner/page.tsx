// app/(app)/scanner/page.tsx — QR scanner with camera + jsQR decoding.
// Faithful to the original (script.js:2504-2617): environment camera,
// frame decode with inversionAttempts:"dontInvert", 4s cooldown between
// scans, and the three outcome branches (granted / already / invalid).

"use client";

import { useEffect, useRef, useState } from "react";
import { LockedTab } from "@/components/layout/locked-tab";
import { useLockedTabs } from "@/components/layout/locked-tabs-context";
import jsQR from "jsqr";
import {
  Camera,
  CameraOff,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { validateTicket } from "@/app/actions/tickets";

type ScanOutcome =
  | { kind: "idle" }
  | { kind: "searching" }
  | { kind: "granted"; name: string; id: string }
  | { kind: "already"; name: string; id: string; status: string }
  | { kind: "invalid"; id: string }
  | { kind: "error"; message: string };

interface ScanCtx {
  video: HTMLVideoElement | null;
  stream: MediaStream | null;
  rafId: number | null;
  cooldown: boolean;
  onCode: (data: string) => void;
}

// Module-scope frame loop. Takes explicit deps via ctx so there are no
// closures over component state and no ref writes during render — satisfying
// the strict react-hooks rules.
const scanCanvas = document.createElement("canvas");
const scanCtx2d = scanCanvas.getContext("2d", { willReadFrequently: true });
// Cap the decode resolution — jsQR is much faster on smaller images, and
// 480px is plenty for QR codes. Aspect ratio preserved from the video.
const MAX_SCAN_DIM = 480;

function frameLoop(ctx: ScanCtx) {
  const video = ctx.video;
  if (!video || !ctx.stream) return;

  if (video.readyState === video.HAVE_ENOUGH_DATA && scanCtx2d) {
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (vw > 0 && vh > 0) {
      // Downscale to max 480px on the longest side for faster decoding.
      const scale = Math.min(1, MAX_SCAN_DIM / Math.max(vw, vh));
      const sw = Math.round(vw * scale);
      const sh = Math.round(vh * scale);
      scanCanvas.width = sw;
      scanCanvas.height = sh;
      scanCtx2d.drawImage(video, 0, 0, sw, sh);
      const imageData = scanCtx2d.getImageData(0, 0, sw, sh);
      const code = jsQR(imageData.data, sw, sh, {
        inversionAttempts: "dontInvert",
      });
      if (code && !ctx.cooldown) {
        ctx.cooldown = true;
        ctx.onCode(code.data);
        setTimeout(() => {
          ctx.cooldown = false;
        }, 3000);
      }
    }
  }
  if (ctx.stream) {
    ctx.rafId = requestAnimationFrame(() => frameLoop(ctx));
  }
}

export default function ScannerPage() {
  const lockedTabs = useLockedTabs();
  const videoRef = useRef<HTMLVideoElement>(null);
  const ctxRef = useRef<ScanCtx>({
    video: null,
    stream: null,
    rafId: null,
    cooldown: false,
    onCode: () => {},
  });
  const [active, setActive] = useState(false);
  const [outcome, setOutcome] = useState<ScanOutcome>({ kind: "idle" });

  // Keep the decode handler fresh on the context without re-creating the loop.
  useEffect(() => {
    ctxRef.current.onCode = async (ticketId: string) => {
      setOutcome({ kind: "searching" });
      const res = await validateTicket(ticketId);
      if (!res.ok) {
        setOutcome({ kind: "error", message: res.error });
        playError();
        return;
      }
      if (res.outcome === "granted") {
        setOutcome({
          kind: "granted",
          name: res.ticket?.name ?? "",
          id: ticketId,
        });
        playSuccess();
      } else if (res.outcome === "already") {
        setOutcome({
          kind: "already",
          name: res.ticket?.name ?? "",
          id: ticketId,
          status: res.ticket?.status ?? "",
        });
        playError();
      } else {
        setOutcome({ kind: "invalid", id: ticketId });
        playError();
      }
    };
  }, []);

  async function startScan() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      const ctx = ctxRef.current;
      ctx.stream = stream;
      ctx.video = videoRef.current;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play();
      }
      setActive(true);
      setOutcome({ kind: "searching" });
      ctx.rafId = requestAnimationFrame(() => frameLoop(ctx));
    } catch (err) {
      setOutcome({
        kind: "error",
        message: "Camera error: " + (err as Error).message,
      });
    }
  }

  function stopScan() {
    const ctx = ctxRef.current;
    if (ctx.rafId) cancelAnimationFrame(ctx.rafId);
    ctx.rafId = null;
    ctx.stream?.getTracks().forEach((t) => t.stop());
    ctx.stream = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setActive(false);
    setOutcome({ kind: "idle" });
  }

  useEffect(() => {
    const ctx = ctxRef.current;
    return () => {
      if (ctx.rafId) cancelAnimationFrame(ctx.rafId);
      ctx.stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  if (lockedTabs.includes("scanner")) {
    return <LockedTab tabName="Scanner" />;
  }

  return (
    <div className="glass-panel mx-auto max-w-lg p-6 text-center">
      <h2 className="mb-4 text-lg font-semibold">Entry Validation</h2>
      <div className="relative mx-auto aspect-square w-full max-w-[200px] overflow-hidden rounded-2xl border border-white/10 bg-black">
        <video ref={videoRef} className="h-full w-full object-cover" muted />
        {!active && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            <CameraOff className="h-10 w-10" />
          </div>
        )}
      </div>

      <Button
        onClick={active ? stopScan : startScan}
        className="mx-auto mt-4"
        variant={active ? "destructive" : "default"}
      >
        {active ? (
          <>
            <CameraOff className="mr-2 h-4 w-4" /> Deactivate Camera
          </>
        ) : (
          <>
            <Camera className="mr-2 h-4 w-4" /> Activate Camera
          </>
        )}
      </Button>

      <ScanResult outcome={outcome} />
    </div>
  );
}

function playSuccess() {
  const audio = new Audio("/success.mp3");
  audio.play().catch(() => {});
}
function playError() {
  const audio = new Audio("/error.mp3");
  audio.play().catch(() => {});
}

function ScanResult({ outcome }: { outcome: ScanOutcome }) {
  if (outcome.kind === "idle") return null;

  const styleMap: Record<string, string> = {
    searching: "bg-white/10 text-white border-white/20",
    granted: "bg-success-green/20 text-success-green border-success-green/40",
    already: "bg-amber-500/20 text-amber-400 border-amber-500/40",
    invalid: "bg-destructive/20 text-destructive border-destructive/40",
    error: "bg-destructive/20 text-destructive border-destructive/40",
  };
  const key = outcome.kind === "searching" ? "searching" : outcome.kind;

  return (
    <div className={cn("mt-5 rounded-xl border p-4 text-left", styleMap[key])}>
      {outcome.kind === "searching" && <p>Searching for QR Code...</p>}
      {outcome.kind === "granted" && (
        <div className="flex items-start gap-2">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">✅ ACCESS GRANTED</p>
            <p>{outcome.name}</p>
            <p className="font-mono text-xs opacity-70">ID: {outcome.id}</p>
          </div>
        </div>
      )}
      {outcome.kind === "already" && (
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">⚠️ ALREADY SCANNED</p>
            <p>{outcome.name}</p>
            <p className="font-mono text-xs opacity-70">ID: {outcome.id}</p>
            <p className="text-xs opacity-70">
              Current status: {outcome.status}
            </p>
          </div>
        </div>
      )}
      {outcome.kind === "invalid" && (
        <div className="flex items-start gap-2">
          <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">❌ INVALID TICKET</p>
            <p className="font-mono text-xs opacity-70">{outcome.id}</p>
            <p className="text-xs opacity-70">Not found in database</p>
          </div>
        </div>
      )}
      {outcome.kind === "error" && <p>{outcome.message}</p>}
    </div>
  );
}
