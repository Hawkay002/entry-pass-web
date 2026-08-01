"use client";

import { motion } from "framer-motion";
import { BadgePlus, Users, ScanQrCode, Lock, Wrench, MessageCircle, FileDown, Zap, ShieldCheck, QrCode } from "lucide-react";

const easeOut = [0.16, 1, 0.3, 1] as const;

export function Features() {
  return (
    <section id="features" className="px-4 py-24">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: easeOut }}
          className="mb-16 max-w-2xl"
        >
          <p className="mb-3 text-sm font-medium text-accent-secondary">Capabilities</p>
          <h2 className="text-4xl font-bold tracking-tight sm:text-5xl" style={{ textWrap: "balance" as never }}>
            Every tool, engineered for speed
          </h2>
        </motion.div>

        {/* Bento grid — asymmetric, varied sizes */}
        <div className="grid auto-rows-[180px] grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Large: Scanner */}
          <BentoCard className="sm:col-span-2 lg:row-span-2">
            <div className="relative flex h-full flex-col justify-between p-7">
              <div>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent-secondary/10 text-accent-secondary">
                  <ScanQrCode className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-white">Scanner</h3>
                <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
                  Camera QR decode at 480px for maximum speed. Three-way validation: granted, already scanned, invalid.
                </p>
              </div>
              {/* Animated scan line mockup */}
              <div className="relative mt-4 h-20 overflow-hidden rounded-lg border border-white/5 bg-black/50">
                <div
                  className="absolute inset-x-0 top-0 h-0.5 bg-accent-secondary/40"
                  style={{ animation: "scan-line 2s linear infinite", boxShadow: "0 0 15px 2px rgba(59,130,246,0.3)" }}
                />
                <div className="flex h-full items-center justify-center">
                  <QrCode className="h-12 w-12 text-white/10" />
                </div>
              </div>
            </div>
          </BentoCard>

          {/* Medium: Issue Tickets */}
          <BentoCard>
            <div className="flex h-full flex-col justify-between p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success-green/10 text-success-green">
                <BadgePlus className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-white">Issue Tickets</h3>
                <p className="mt-1 text-xs text-muted-foreground">Live QR preview + WhatsApp share at 4x resolution.</p>
              </div>
            </div>
          </BentoCard>

          {/* Medium: Guest List */}
          <BentoCard>
            <div className="flex h-full flex-col justify-between p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-white">Guest List</h3>
                <p className="mt-1 text-xs text-muted-foreground">7 sort modes, 4 filters, search. Bulk delete with live progress.</p>
              </div>
            </div>
          </BentoCard>

          {/* Wide: Remote Lock */}
          <BentoCard className="sm:col-span-2">
            <div className="flex h-full items-center justify-between p-6">
              <div className="flex-1">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10 text-red-400">
                  <Lock className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-white">Remote Lock</h3>
                <p className="mt-1 text-xs text-muted-foreground">Lock or unlock specific tabs per staff member, in real time.</p>
              </div>
              {/* Lock state badges */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5 rounded-full bg-red-500/10 px-2 py-1 text-[0.65rem] font-medium text-red-400">
                  <Lock className="h-2.5 w-2.5" /> 3 locked
                </div>
                <div className="flex items-center gap-1.5 rounded-full bg-success-green/10 px-2 py-1 text-[0.65rem] font-medium text-success-green">
                  Free
                </div>
              </div>
            </div>
          </BentoCard>

          {/* Medium: Maintenance */}
          <BentoCard>
            <div className="flex h-full flex-col justify-between p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
                <Wrench className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-white">Maintenance Mode</h3>
                <p className="mt-1 text-xs text-muted-foreground">Lock all staff at once with auto-unlock timer.</p>
              </div>
            </div>
          </BentoCard>

          {/* Medium: Comms */}
          <BentoCard>
            <div className="flex h-full flex-col justify-between p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400">
                <MessageCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-white">Comms Center</h3>
                <p className="mt-1 text-xs text-muted-foreground">Global, team, private channels with typing indicators.</p>
              </div>
            </div>
          </BentoCard>

          {/* Medium: Import/Export */}
          <BentoCard>
            <div className="flex h-full flex-col justify-between p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
                <FileDown className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-white">Import / Export</h3>
                <p className="mt-1 text-xs text-muted-foreground">CSV, XLSX, PDF, TXT, DOC, JSON. Auto-dedupe on import.</p>
              </div>
            </div>
          </BentoCard>

          {/* Wide: Security + Auto-Absent */}
          <BentoCard className="sm:col-span-2">
            <div className="flex h-full items-center gap-6 p-6">
              <div className="flex flex-1 flex-col gap-2">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-accent-secondary" />
                  <h3 className="font-bold text-white">Server-Secured</h3>
                </div>
                <p className="text-xs text-muted-foreground">Firebase Admin SDK + httpOnly cookies. Zero client-side role checks.</p>
              </div>
              <div className="h-12 w-px bg-white/5" />
              <div className="flex flex-1 flex-col gap-2">
                <div className="flex items-center gap-3">
                  <Zap className="h-5 w-5 text-amber-400" />
                  <h3 className="font-bold text-white">Auto-Absent</h3>
                </div>
                <p className="text-xs text-muted-foreground">Deadline-based automation via realtime onSnapshot. Zero page reload.</p>
              </div>
            </div>
          </BentoCard>
        </div>
      </div>
    </section>
  );
}

function BentoCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, ease: easeOut }}
      className={`group relative overflow-hidden rounded-xl border border-white/8 bg-[#080808] transition-colors hover:border-white/15 hover:bg-[#0c0c0c] ${className}`}
    >
      {children}
      {/* Hover glow */}
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" style={{ background: "radial-gradient(600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(59,130,246,0.04), transparent 40%)" }} />
    </motion.div>
  );
}
