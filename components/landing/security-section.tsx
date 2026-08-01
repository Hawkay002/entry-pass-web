"use client";

import { motion } from "framer-motion";
import { ShieldCheck, Cookie, KeyRound, Database } from "lucide-react";

const easeOut = [0.16, 1, 0.3, 1] as const;

const SECURITY = [
  { icon: KeyRound, title: "Firebase Admin SDK", desc: "Every privileged operation runs server-side. Zero client-side role checks." },
  { icon: Cookie, title: "httpOnly Session Cookies", desc: "14-day encrypted sessions. No exposed tokens. Cookie verified on every request." },
  { icon: Database, title: "Firestore Security Rules", desc: "Role-based collection access. Default deny on everything not explicitly allowed." },
  { icon: ShieldCheck, title: "Custom Claims", desc: "Admin role via Firebase Auth custom claims. Auto-assigned on designated emails." },
];

export function SecuritySection() {
  return (
    <section className="px-4 py-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: easeOut }}
        className="mx-auto max-w-5xl"
      >
        <div className="mb-14">
          <div
            className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-secondary/10"
            style={{ animation: "glow-pulse 3s ease-in-out infinite" }}
          >
            <ShieldCheck className="h-7 w-7 text-accent-secondary" />
          </div>
          <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Security isn't an add-on
          </h2>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            The original app had client-side email checks and plaintext passwords.
            This rewrite fixes every vulnerability at the architecture level.
          </p>
        </div>

        <div className="grid gap-px overflow-hidden rounded-2xl border border-white/8 bg-white/8 sm:grid-cols-2">
          {SECURITY.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="flex items-start gap-4 bg-[#080808] p-6"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-success-green/8 text-success-green">
                <item.icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-white">{item.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
