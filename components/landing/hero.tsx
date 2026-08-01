"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, QrCode, Zap, Lock, ScanLine, Radio, Cpu } from "lucide-react";

const easeOut = [0.16, 1, 0.3, 1] as const;

const ORBIT_ICONS = [
  { icon: QrCode, color: "#3b82f6", angle: 0 },
  { icon: Lock, color: "#10b981", angle: 60 },
  { icon: Zap, color: "#f59e0b", angle: 120 },
  { icon: ScanLine, color: "#8b5cf6", angle: 180 },
  { icon: Radio, color: "#ec4899", angle: 240 },
  { icon: Cpu, color: "#06b6d4", angle: 300 },
];

export function LandingHero() {
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center px-4 pt-24 pb-16">
      {/* Nav */}
      <motion.nav
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: easeOut }}
        className="fixed left-1/2 top-5 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full border border-white/10 bg-black/60 px-3 py-1.5 backdrop-blur-xl"
      >
        <span className="px-2 text-xs font-bold tracking-tight">
          Ticketing<span className="text-accent-secondary">System</span>.
        </span>
        <Link href="/login" className="rounded-full bg-white px-4 py-1 text-xs font-semibold text-black transition-transform hover:scale-105">
          Sign In
        </Link>
      </motion.nav>

      {/* Orbiting icon system behind text */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -z-[1] hidden -translate-x-1/2 -translate-y-1/2 lg:block">
        <svg className="absolute inset-0 size-full" xmlns="http://www.w3.org/2000/svg">
          {[180, 260, 340].map((r) => (
            <circle key={r} className="fill-none stroke-white/[0.04] stroke-1" cx="50%" cy="50%" r={r} strokeDasharray="3 8" />
          ))}
        </svg>
        {ORBIT_ICONS.map((item, i) => (
          <div key={i} className="absolute left-1/2 top-1/2" style={{ marginLeft: -16, marginTop: -16 }}>
            <div
              className="orbit-item flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/80 backdrop-blur"
              style={{
                ["--angle" as string]: item.angle,
                ["--radius" as string]: i < 2 ? 180 : i < 4 ? 260 : 340,
                ["--duration" as string]: `${20 + i * 3}s`,
              }}
            >
              <item.icon className="h-4 w-4" style={{ color: item.color }} />
            </div>
          </div>
        ))}
      </div>

      {/* Center content */}
      <div className="relative z-10 flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: easeOut }}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent-secondary/20 bg-accent-secondary/5 px-4 py-1.5"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute h-full w-full animate-ping rounded-full bg-success-green opacity-75" />
            <span className="relative h-2 w-2 rounded-full bg-success-green" />
          </span>
          <span className="text-xs font-medium text-accent-secondary">Server-Secured · Real-Time · Production Ready</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: easeOut, delay: 0.1 }}
          className="text-6xl font-extrabold leading-[0.95] tracking-tight text-white sm:text-7xl lg:text-[7rem]"
          style={{ textWrap: "balance" as never }}
        >
          Run events
          <br />
          like <span className="text-accent-secondary">machinery</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: easeOut, delay: 0.3 }}
          className="mt-8 max-w-lg text-center text-lg leading-relaxed text-muted-foreground"
        >
          Issue tickets with instant QR. Scan at the door in milliseconds. Lock staff remotely. Track everything — live, secured, zero compromise.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: easeOut, delay: 0.45 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-4"
        >
          <Link href="/login">
            <button className="group inline-flex items-center gap-2 rounded-xl bg-accent-secondary px-8 py-4 text-base font-bold text-white transition-all hover:brightness-110 hover:shadow-[0_0_50px_-5px_rgba(59,130,246,0.6)]">
              Launch Dashboard
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </button>
          </Link>
          <a href="#features">
            <button className="rounded-xl border border-white/10 px-8 py-4 text-base font-semibold text-white transition-colors hover:bg-white/5">
              See Features
            </button>
          </a>
        </motion.div>
      </div>

      {/* Terminal-style live preview */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: easeOut, delay: 0.6 }}
        className="relative z-10 mt-16 w-full max-w-2xl"
      >
        <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0a0a0a] shadow-2xl">
          {/* Terminal header */}
          <div className="flex items-center gap-2 border-b border-white/5 px-4 py-2.5">
            <span className="h-3 w-3 rounded-full bg-[#ff5f56]" />
            <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
            <span className="h-3 w-3 rounded-full bg-[#27c93f]" />
            <span className="ml-2 text-xs text-muted-foreground">live-activity-feed</span>
            <span className="ml-auto flex items-center gap-1 text-[0.65rem] text-success-green">
              <span className="h-1.5 w-1.5 rounded-full bg-success-green" />
              CONNECTED
            </span>
          </div>
          {/* Terminal body */}
          <div className="space-y-1.5 p-4 font-mono text-xs">
            <TerminalLine time="14:23:01" color="text-success-green" action="TICKET_CREATE" text="Issued pass for Jane Doe (ID: 5YKH3B)" />
            <TerminalLine time="14:23:04" color="text-accent-secondary" action="SCAN_ENTRY" text="✓ Access Granted — Guest: Jane Doe" />
            <TerminalLine time="14:23:09" color="text-amber-400" action="LOCK_ACTION" text="Locked [create, scanner] for staff: rakesh01" />
            <TerminalLine time="14:23:12" color="text-purple-400" action="CONFIG_CHANGE" text="Settings updated: Summer Gala · Grand Hall" />
            <TerminalLine time="14:23:15" color="text-pink-400" action="IMPORT_DATA" text="Imported 24 guests (3 duplicates skipped)" />
            <motion.div
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="flex items-center gap-2 pt-1"
            >
              <span className="text-muted-foreground">14:23:18</span>
              <span className="h-3.5 w-1.5 bg-success-green" />
            </motion.div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

function TerminalLine({ time, color, action, text }: { time: string; color: string; action: string; text: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className="flex items-center gap-2"
    >
      <span className="text-muted-foreground">{time}</span>
      <span className={`font-semibold ${color}`}>{action}</span>
      <span className="text-muted-foreground">{text}</span>
    </motion.div>
  );
}
