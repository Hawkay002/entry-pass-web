export function LandingFooter() {
  return (
    <footer className="border-t border-white/5 px-4 py-10">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 text-center">
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold">
            Ticketing<span className="font-bold">System</span>.
          </span>
        </div>
        <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
          Next.js 16 · React 19 · Tailwind v4 · Firebase Admin SDK · Upstash Redis · Framer Motion
        </p>
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} Shovith Debnath
        </p>
      </div>
    </footer>
  );
}
