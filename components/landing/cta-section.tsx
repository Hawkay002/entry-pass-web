"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const easeOut = [0.16, 1, 0.3, 1] as const;

export function CTASection() {
  return (
    <section className="px-4 py-32">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.7, ease: easeOut }}
        className="relative mx-auto max-w-3xl text-center"
      >
        {/* Glow */}
        <div
          className="absolute inset-0 -z-10 rounded-full opacity-30 blur-3xl"
          style={{
            background: "radial-gradient(circle at center, #3b82f6 0%, transparent 60%)",
            animation: "glow-pulse 4s ease-in-out infinite",
          }}
        />

        <h2 className="text-4xl font-bold tracking-tight sm:text-5xl" style={{ textWrap: "balance" } as never}>
          Ready to run your event?
        </h2>
        <p className="mx-auto mt-5 max-w-md text-lg text-muted-foreground">
          Sign in with your admin account or Google to access the dashboard.
        </p>

        <div className="mt-10">
          <Link href="/login">
            <button className="group inline-flex items-center gap-2 rounded-xl bg-accent-secondary px-8 py-4 text-base font-semibold text-white transition-all hover:brightness-110 hover:shadow-[0_0_50px_-5px_rgba(59,130,246,0.6)]">
              Get Started
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </button>
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
