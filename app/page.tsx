// app/page.tsx — industrial-grade marketing landing page.
// Public route (no auth). Showcases all features.

import { Starfield } from "@/components/layout/starfield";
import { LandingHero } from "@/components/landing/hero";
import { StatsBar } from "@/components/landing/stats-bar";
import { Features } from "@/components/landing/features";
import { SecuritySection } from "@/components/landing/security-section";
import { CTASection } from "@/components/landing/cta-section";
import { LandingFooter } from "@/components/landing/footer";

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#050505]">
      <Starfield />

      {/* Ambient gradient field */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div
          className="absolute left-[5%] top-[10%] h-[500px] w-[500px] rounded-full opacity-20"
          style={{
            background: "radial-gradient(circle, #3b82f6 0%, transparent 70%)",
            animation: "orb-float 20s ease-in-out infinite",
          }}
        />
        <div
          className="absolute right-[0%] top-[50%] h-[450px] w-[450px] rounded-full opacity-15"
          style={{
            background: "radial-gradient(circle, #10b981 0%, transparent 70%)",
            animation: "orb-float 28s ease-in-out infinite reverse",
          }}
        />
        <div
          className="absolute left-[40%] bottom-[5%] h-[400px] w-[400px] rounded-full opacity-10"
          style={{
            background: "radial-gradient(circle, #8b5cf6 0%, transparent 70%)",
            animation: "orb-float 25s ease-in-out infinite",
          }}
        />
      </div>

      {/* Grid overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "50px 50px",
          animation: "grid-move 8s linear infinite",
        }}
      />

      <div className="relative z-10">
        <LandingHero />
        <StatsBar />
        <Features />
        <SecuritySection />
        <CTASection />
        <LandingFooter />
      </div>
    </div>
  );
}
