"use client";

import { motion } from "framer-motion";

const easeOut = [0.16, 1, 0.3, 1] as const;

const STATS = [
  { value: "21+", label: "Production Features" },
  { value: "0ms", label: "Realtime Sync Delay" },
  { value: "100%", label: "Server-Secured" },
  { value: "∞", label: "Dynamic Roles" },
];

export function StatsBar() {
  return (
    <section className="border-y border-white/5 px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.6, ease: easeOut }}
        className="mx-auto grid max-w-5xl grid-cols-2 gap-8 sm:grid-cols-4"
      >
        {STATS.map((stat, i) => (
          <div key={stat.label} className="text-center">
            <div className="text-4xl font-extrabold text-white sm:text-5xl">
              {stat.value}
            </div>
            <div className="mt-2 text-xs uppercase tracking-wider text-muted-foreground">
              {stat.label}
            </div>
          </div>
        ))}
      </motion.div>
    </section>
  );
}
