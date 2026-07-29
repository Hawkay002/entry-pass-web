# Entry-pass Next.js Rewrite — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the Entry-pass event ticketing app as a server-secured Next.js 16 + React 19 + Tailwind v4 app, preserving all 21 features.

**Architecture:** Greenfield Next.js App Router project (`entry-pass-web/`) using Firebase client SDK for realtime (`onSnapshot`) and Firebase Admin SDK for privileged server actions. Auth via `next-firebase-auth-edge` session cookies + middleware. shadcn/ui + Tailwind v4 for UI. Old app stays untouched in `Entry-pass-revamped/`.

**Tech Stack:** Next 16.2.12, React 19.2.8, TS 7.0.2, Tailwind 4.3.3, firebase 12.16.0, firebase-admin 14.2.0, next-firebase-auth-edge 1.12.0, shadcn/ui, lucide-react, react-icons, @hugeicons/react, react-hook-form, zod 4, @tanstack/react-table, sonner, jspdf, xlsx, qrcode, html2canvas, jsqr.

**Verification model:** Frontend rewrite — primary gates are `pnpm lint`, `tsc --noEmit`, `pnpm build`, and runtime behavior checks (dev server renders, auth flow works). Unit tests added for pure utility logic (CSV parse, date parse, normalize).

---

## File Structure (Phase 0)

```
entry-pass-web/
  package.json                    # deps + scripts
  tsconfig.json
  next.config.ts
  postcss.config.mjs              # tailwind v4 postcss plugin
  app/globals.css                 # tailwind v4 import + theme tokens
  app/layout.tsx                  # root: fonts, ThemeProvider, Toaster
  app/(auth)/login/page.tsx       # login form
  app/(app)/layout.tsx            # auth guard + header + nav + starfield
  app/(app)/tickets/page.tsx      # placeholder -> Phase 1
  app/(app)/guests/page.tsx       # placeholder -> Phase 1
  app/(app)/scanner/page.tsx      # placeholder -> Phase 1
  app/(app)/settings/page.tsx     # placeholder -> Phase 2
  app/(app)/logs/page.tsx         # placeholder -> Phase 2
  app/page.tsx                    # redirect to /tickets or /login
  app/api/login/route.ts          # POST email+pw -> session cookie
  app/api/logout/route.ts         # clear cookie
  middleware.ts                   # verify cookie, guard routes
  components/ui/                  # shadcn primitives (button, input, card, ...)
  components/layout/app-header.tsx
  components/layout/app-nav.tsx
  components/layout/starfield.tsx
  components/layout/loading-screen.tsx
  lib/firebase/client.ts          # client SDK init + onSnapshot helpers
  lib/firebase/admin.ts           # Admin SDK init (singleton)
  lib/firebase/server-auth.ts     # getAuthenticatedUser(request)
  lib/auth-config.ts              # next-firebase-auth-edge config
  lib/auth.ts                     # role types, claim helpers
  lib/types.ts                    # Ticket, Log, Settings, ChatMsg, etc.
  lib/utils.ts                    # cn() helper
  lib/env.ts                      # typed env access
  firestore.rules                 # security rules (draft)
  .env.local.example              # template for secrets
  .env.local                      # actual secrets (gitignored, user-provided)
```

---

## Phase 0 Tasks

### Task 0.1: Scaffold Next.js project

**Files:** `entry-pass-web/` (whole project root)

- [ ] **Step 1: Scaffold**

Run:
```bash
cd /c/Users/Santita/ZCodeProject
pnpm create next-app@16.2.12 entry-pass-web --ts --tailwind --eslint --app --src-dir=false --import-alias "@/*" --use-pnpm --no-turbopack
```
If the create wizard prompts interactively, answer: TypeScript yes, ESLint yes, Tailwind yes, `src/` no, App Router yes, import alias `@/*`, turbopack no.

- [ ] **Step 2: Verify scaffold builds**

Run:
```bash
cd entry-pass-web && pnpm build
```
Expected: Build succeeds (default Next template page).

- [ ] **Step 3: Clean default template cruft**

Replace `app/page.tsx` content with a minimal redirect stub:
```tsx
import { redirect } from "next/navigation";
export default function Home() {
  redirect("/tickets");
}
```
Remove default `app/favicon.ico` if present, clear boilerplate from `app/globals.css` (will rewrite in Task 0.4).

- [ ] **Step 4: Commit**
```bash
git init && git add -A && git commit -m "chore: scaffold Next.js 16 project"
```

---

### Task 0.2: Install dependencies

**Files:** `package.json`

- [ ] **Step 1: Install Firebase + auth**

```bash
pnpm add firebase@12.16.0 firebase-admin@14.2.0 next-firebase-auth-edge@1.12.0
```

- [ ] **Step 2: Install UI / icons / forms / data**

```bash
pnpm add class-variance-authority clsx tailwind-merge tailwindcss-animate next-themes sonner cmdk vaul lucide-react@1.27.0 react-icons@5.7.0 @hugeicons/react@1.1.9 react-hook-form@7.83.0 zod@4.4.3 @hookform/resolvers@5.5.7 @tanstack/react-table@8.21.3
```

- [ ] **Step 3: Install export/scan client libs**

```bash
pnpm add jspdf@4.2.1 jspdf-autotable@5.0.8 xlsx@0.18.5 qrcode@1.5.4 html2canvas@1.4.1 jsqr@1.4.0
```

- [ ] **Step 4: Install Radix primitives (shadcn deps) + dev types**

```bash
pnpm add @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-checkbox @radix-ui/react-label @radix-ui/react-slot @radix-ui/react-tooltip @radix-ui/react-select @radix-ui/react-progress @radix-ui/react-radio-group @radix-ui/react-avatar
pnpm add -D @types/qrcode
```

- [ ] **Step 5: Verify install**

```bash
pnpm build
```
Expected: still builds (no breaking deps).

- [ ] **Step 6: Commit**
```bash
git add -A && git commit -m "chore: install all dependencies"
```

---

### Task 0.3: shadcn/ui setup + base components

**Files:** `components/ui/*`, `lib/utils.ts`, `components.json`

- [ ] **Step 1: Init shadcn**

```bash
pnpm dlx shadcn@latest init -d
```
Use defaults: style "new-york", base color "neutral", CSS variables yes. If it asks about Tailwind v4 / PostCSS, accept.

- [ ] **Step 2: Add base primitives**

```bash
pnpm dlx shadcn@latest add button input label card dialog dropdown-menu checkbox select table badge toast progress separator avatar tooltip radio-group sheet
```

- [ ] **Step 3: Verify `lib/utils.ts` exists** with `cn()`:
```ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 4: Verify build**
```bash
pnpm build
```
Expected: builds clean.

- [ ] **Step 5: Commit**
```bash
git add -A && git commit -m "feat(ui): init shadcn/ui + base components"
```

---

### Task 0.4: Tailwind v4 theme — dark command-center design tokens

**Files:** `app/globals.css`

- [ ] **Step 1: Write theme**

Replace `app/globals.css` with the dark theme matching the original design tokens:

```css
@import "tailwindcss";

@theme {
  --color-bg-deep: #050505;
  --color-bg-surface: #0f0f0f;
  --color-border-subtle: rgba(255, 255, 255, 0.08);
  --color-accent-secondary: #3b82f6;
  --color-success-green: #10b981;
  --color-danger-red: #ef4444;
  --font-sans: "Outfit", ui-sans-serif, system-ui, sans-serif;
}

:root {
  --background: 5 5 5;            /* bg-deep #050505 */
  --foreground: 255 255 255;
  --card: 20 20 20;
  --card-foreground: 255 255 255;
  --muted: 136 136 136;
  --muted-foreground: 136 136 136;
  --border: 255 255 255 / 0.08;
  --input: 255 255 255 / 0.08;
  --ring: 59 130 246;
  --primary: 255 255 255;
  --primary-foreground: 5 5 5;
  --secondary: 59 130 246;
  --secondary-foreground: 255 255 255;
  --accent: 59 130 246;
  --destructive: 239 68 68;
  --destructive-foreground: 255 255 255;
  --radius: 0.75rem;
}

@layer base {
  * { border-color: rgb(var(--border)); }
  body {
    background-color: rgb(var(--background));
    color: rgb(var(--foreground));
    font-family: var(--font-sans);
    -webkit-font-smoothing: antialiased;
  }
}

@utility glass-panel {
  background: rgba(20, 20, 20, 0.6);
  backdrop-filter: blur(20px);
  border: 1px solid rgb(var(--border));
  border-radius: var(--radius);
}
```

- [ ] **Step 2: Add Outfit font in root layout (Task 0.8)** — note here, implement in layout task.

- [ ] **Step 3: Verify build + visual**
```bash
pnpm build
```
Expected: builds; dev server shows dark background.

- [ ] **Step 4: Commit**
```bash
git add -A && git commit -m "feat(theme): dark command-center design tokens"
```

---

### Task 0.5: TypeScript types for the data model

**Files:** `lib/types.ts`

- [ ] **Step 1: Write shared types**

```ts
// lib/types.ts — mirrors the existing Firestore schema

export type TicketType = "Classic" | "Diamond" | "Gold";
export type TicketStatus = "coming-soon" | "arrived" | "absent";
export type Role = "admin" | "event_manager" | "registration_desk" | "security_head";

export interface Ticket {
  id: string;
  name: string;
  gender: "Male" | "Female" | "Other";
  age: number;
  phone: string;          // stored as +91XXXXXXXXXX
  ticketType: TicketType;
  status: TicketStatus;
  scanned: boolean;
  scannedAt: number | null;
  scannedBy: string | null;
  createdBy: string;
  createdAt: number;
}

export interface EventSettings {
  name: string;
  place: string;
  deadline: string;       // ISO datetime string
}

export type LogAction =
  | "LOGIN" | "TICKET_CREATE" | "SCAN_ENTRY" | "CONFIG_CHANGE"
  | "HELP_CALL" | "TICKET_DELETE" | "FACTORY_RESET" | "LOCK_ACTION"
  | "LOG_DELETE" | "EXPORT_DATA" | "IMPORT_DATA";

export interface ActivityLog {
  id: string;
  timestamp: number;
  userEmail: string;
  username: string;
  action: LogAction;
  details: string;
}

export interface StaffUser {
  username: string;
  realName: string;
  role: Role;
  email: string;
  createdAt: number;
}

export type LockReasonType = "basic" | "maintenance" | "suspension";

export interface LockMetadata {
  type: LockReasonType;
  duration: string | null;   // e.g. "2 hr 30 min"
  updatedAt: number;
}

export interface GlobalLockDoc {
  userSpecificLocks: Record<string, string[]>;      // username -> tab names
  lockMetadata: Record<string, LockMetadata>;        // username -> metadata
  lockedTabs?: string[];                              // legacy fallback
  updatedAt: number;
}

export type ChannelType = "GLOBAL" | "TEAM" | "PRIVATE";

export interface ChatMessage {
  id: string;
  text: string;
  senderEmail: string;
  senderDisplay: string;
  channelType: ChannelType;
  target: string;
  timestamp: number;
  replyTo: { id: string; sender: string; text: string } | null;
  isEdited: boolean;
}

export type TabName = "create" | "booked" | "scanner" | "settings" | "logs";
```

- [ ] **Step 2: Verify typecheck**
```bash
pnpm tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**
```bash
git add -A && git commit -m "feat(types): shared data model types"
```

---

### Task 0.6: Firebase client + admin + auth config

**Files:** `lib/firebase/client.ts`, `lib/firebase/admin.ts`, `lib/auth-config.ts`, `lib/env.ts`, `.env.local.example`

- [ ] **Step 1: Write env template (`.env.local.example`)**

```bash
# Firebase client config (public — same as current app)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyBYzmAZQ8sKHjXgVh_t-vbtYN_gRzBstw8
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=ticket-backend-5ee83.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=ticket-backend-5ee83
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=ticket-backend-5ee83.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=370130815796
NEXT_PUBLIC_FIREBASE_APP_ID=1:370130815796:web:33df8249fcc68ddc0f7361

# next-firebase-auth-edge
AUTH_COOKIE_NAME=session
COOKIE_SIGNATURE_KEY_CURRENT=  # 32+ char random string — generate with: openssl rand -base64 32

# Firebase Admin SDK (server only — paste full service account JSON on one line)
FIREBASE_SERVICE_ACCOUNT_KEY=  # the JSON downloaded from Firebase console
```

- [ ] **Step 2: Write `lib/env.ts`** — typed env access with validation

```ts
// lib/env.ts
function required(name: string, val: string | undefined): string {
  if (!val) throw new Error(`Missing env var: ${name}`);
  return val;
}

export const clientEnv = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

export const authConfig = {
  cookieName: process.env.AUTH_COOKIE_NAME ?? "session",
  cookieSignatureKeys: required(
    "COOKIE_SIGNATURE_KEY_CURRENT",
    process.env.COOKIE_SIGNATURE_KEY_CURRENT
  ).split(","),
  serviceAccount: JSON.parse(
    required("FIREBASE_SERVICE_ACCOUNT_KEY", process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
  ),
  apiKey: clientEnv.apiKey,
  projectId: clientEnv.projectId,
};

export const APP_COLLECTION_ROOT = "ticket_events_data";
export const SHARED_DATA_ID = "shared_event_db";
```

- [ ] **Step 3: Write `lib/firebase/client.ts`**

```ts
// lib/firebase/client.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { clientEnv } from "@/lib/env";

const app = getApps().length ? getApp() : initializeApp(clientEnv);
export const auth = getAuth(app);
export const db = getFirestore(app);
export { clientEnv };
```

- [ ] **Step 4: Write `lib/firebase/admin.ts`** — server-only singleton

```ts
// lib/firebase/admin.ts
import { getApp, getApps, initializeApp, cert, type App } from "firebase-admin/app";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import { getFirestore as getAdminFirestore } from "firebase-admin/firestore";
import { authConfig } from "@/lib/env";

function adminApp(): App {
  if (getApps().length) return getApp();
  return initializeApp({ credential: cert(authConfig.serviceAccount) });
}

export const adminAuth = getAdminAuth(adminApp());
export const adminDb = getAdminFirestore(adminApp());
```

- [ ] **Step 5: Verify typecheck**
```bash
pnpm tsc --noEmit
```
Expected: no errors (env vars not needed at typecheck time; they throw at runtime only).

- [ ] **Step 6: Commit**
```bash
git add -A && git commit -m "feat(firebase): client + admin SDK + auth config"
```

---

### Task 0.7: Auth — login/logout routes + middleware

**Files:** `app/api/login/route.ts`, `app/api/logout/route.ts`, `middleware.ts`, `lib/auth.ts`, `lib/firebase/server-auth.ts`

- [ ] **Step 1: Write role/claim helpers (`lib/auth.ts`)**

```ts
// lib/auth.ts
import type { Role } from "@/lib/types";

export interface AppUser {
  uid: string;
  email: string | null;
  username: string;          // "ADMIN" for admin, else staff username
  role: Role;
}

export const ROLE_CLAIM = "role";

export function isAdmin(user: AppUser): boolean {
  return user.role === "admin";
}
```

- [ ] **Step 2: Write server-auth helper (`lib/firebase/server-auth.ts`)**

```ts
// lib/firebase/server-auth.ts — reads session cookie -> AppUser
import { getAuthenticatedRequestData } from "next-firebase-auth-edge";
import { authConfig } from "@/lib/env";
import type { AppUser } from "@/lib/auth";
import type { Role } from "@/lib/types";

export async function getAppUser(): Promise<AppUser | null> {
  const data = await getAuthenticatedRequestData({
    request: undefined as never, // placeholder; real usage passes request from route
    options: authConfig,
  });
  return null; // replaced in Step 3
}
```
Note: the exact `next-firebase-auth-edge` server helper is `getTokens`/`getAuthenticatedRequestData`; finalized in the login route + middleware integration below.

- [ ] **Step 3: Write login route (`app/api/login/route.ts`)**

```ts
// app/api/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import { signInWithEmailAndPassword, getIdToken } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { authConfig } from "@/lib/env";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const idToken = await getIdToken(cred.user);
    const res = NextResponse.json({ ok: true });
    res.cookies.set(authConfig.cookieName, idToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 14,
    });
    return res;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid credentials" }, { status: 401 });
  }
}
```

- [ ] **Step 4: Write logout route (`app/api/logout/route.ts`)**

```ts
// app/api/logout/route.ts
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/env";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(authConfig.cookieName);
  return res;
}
```

- [ ] **Step 5: Write middleware (`middleware.ts`)**

```ts
// middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import { authenticate, refreshApiResponse } from "next-firebase-auth-edge";
import { authConfig, clientEnv } from "@/lib/env";

const PUBLIC_PATHS = ["/login", "/api/login", "/api/logout"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  await authenticate(request, response, {
    ...authConfig,
    loginPath: "/login",
    enableMultipleCookies: false,
  });

  const tokens = response.headers.get("x-mw-token");
  if (!tokens && !pathname.startsWith("/api/")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return refreshApiResponse(request, response, authConfig);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:mp3|png|svg|jpg)$).*)"],
};
```

- [ ] **Step 6: Verify build**
```bash
pnpm build
```
Expected: builds (auth routes compile).

- [ ] **Step 7: Commit**
```bash
git add -A && git commit -m "feat(auth): login/logout routes + middleware guard"
```

---

### Task 0.8: Login page

**Files:** `app/(auth)/login/page.tsx`

- [ ] **Step 1: Write login page**

```tsx
// app/(auth)/login/page.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);
    if (res.ok) {
      router.push("/tickets");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Authentication failed.");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm glass-panel">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-accent-secondary/20">
            <ShieldCheck className="h-6 w-6 text-accent-secondary" />
          </div>
          <CardTitle className="text-2xl">Authorized Access</CardTitle>
          <p className="text-sm text-muted-foreground">Verify your identity to continue.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Administrator Email</Label>
              <Input id="email" type="email" value={email}
                onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password}
                onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Authenticate
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**
```bash
pnpm build
```

- [ ] **Step 3: Commit**
```bash
git add -A && git commit -m "feat(auth): login page"
```

---

### Task 0.9: App layout — header, nav, starfield, provider

**Files:** `app/layout.tsx`, `app/(app)/layout.tsx`, `components/layout/app-header.tsx`, `components/layout/app-nav.tsx`, `components/layout/starfield.tsx`, `components/layout/loading-screen.tsx`

- [ ] **Step 1: Root layout (`app/layout.tsx`)** — fonts + Toaster

```tsx
// app/layout.tsx
import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"], weight: ["200", "300", "400", "500", "600", "700"], variable: "--font-outfit" });

export const metadata: Metadata = {
  title: "Event Ticketing System",
  description: "Secure real-time event logistics and entry management.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={outfit.variable} suppressHydrationWarning>
      <body className="font-sans antialiased">
        {children}
        <Toaster theme="dark" position="top-right" richColors />
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Starfield component (`components/layout/starfield.tsx`)**

```tsx
"use client";
import { useEffect, useRef } from "react";

export function Starfield() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = ref.current;
    if (!container) return;
    const stars = 80;
    container.innerHTML = "";
    for (let i = 0; i < stars; i++) {
      const s = document.createElement("div");
      const size = Math.random() * 2 + 1;
      Object.assign(s.style, {
        position: "absolute",
        width: `${size}px`, height: `${size}px`,
        background: "white", borderRadius: "50%",
        opacity: String(Math.random() * 0.5 + 0.1),
        left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
        animation: `twinkle ${2 + Math.random() * 3}s ease-in-out infinite`,
      });
      container.appendChild(s);
    }
  }, []);
  return (
    <>
      <style>{`@keyframes twinkle{0%,100%{opacity:0.1}50%{opacity:0.6}}`}</style>
      <div ref={ref} className="pointer-events-none fixed inset-0 z-0" aria-hidden />
    </>
  );
}
```

- [ ] **Step 3: App nav (`components/layout/app-nav.tsx`)**

```tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/tickets", label: "Issue Ticket", admin: false },
  { href: "/guests", label: "Guest List", admin: false },
  { href: "/scanner", label: "Scanner", admin: false },
  { href: "/settings", label: "Configuration", admin: false },
  { href: "/logs", label: "Activity Logs", admin: true },
];

export function AppNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  return (
    <nav className="flex gap-2 overflow-x-auto pb-1">
      {TABS.filter((t) => !t.admin || isAdmin).map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={cn(
            "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            pathname === tab.href
              ? "bg-white text-black"
              : "text-muted-foreground hover:bg-white/5 hover:text-white"
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
```

- [ ] **Step 4: App header (`components/layout/app-header.tsx`)**

```tsx
import { AppNav } from "./app-nav";

export function AppHeader({ isAdmin, userEmail }: { isAdmin: boolean; userEmail: string }) {
  return (
    <header className="relative z-10 border-b border-white/5 px-6 py-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-light tracking-tight">
          Ticketing<span className="font-semibold">System</span>.
        </h1>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-success-green" />
          <span>User: <span className="font-semibold text-accent-secondary">{userEmail}</span></span>
        </div>
      </div>
      <div className="mt-4">
        <AppNav isAdmin={isAdmin} />
      </div>
    </header>
  );
}
```

- [ ] **Step 5: App layout (`app/(app)/layout.tsx`)** — server component reads session, guards

```tsx
// app/(app)/layout.tsx
import { getTokens } from "next-firebase-auth-edge";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authConfig } from "@/lib/env";
import { Starfield } from "@/components/layout/starfield";
import { AppHeader } from "@/components/layout/app-header";
import type { Role } from "@/lib/types";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = await getTokens(cookieStore, { ...authConfig });
  if (!token?.decodedToken) redirect("/login");

  const role = (token.decodedToken[ROLE_CLAIM] as Role) ?? "event_manager";
  const isAdmin = role === "admin";
  const email = token.decodedToken.email ?? "";

  return (
    <div className="relative min-h-screen">
      <Starfield />
      <div className="relative z-10">
        <AppHeader isAdmin={isAdmin} userEmail={email} />
        <main className="mx-auto max-w-6xl p-6">{children}</main>
      </div>
    </div>
  );
}

const ROLE_CLAIM = "role"; // matches lib/auth.ts
```

- [ ] **Step 6: Add placeholder pages** for `/tickets`, `/guests`, `/scanner`, `/settings`, `/logs`

Each is a minimal stub, e.g. `app/(app)/tickets/page.tsx`:
```tsx
export default function TicketsPage() {
  return <div className="glass-panel p-8 text-muted-foreground">Issue Ticket — coming in Phase 1.</div>;
}
```
Repeat for guests, scanner, settings, logs.

- [ ] **Step 7: Verify build**
```bash
pnpm build
```
Expected: builds clean; nav appears; protected routes redirect to /login when unauthenticated.

- [ ] **Step 8: Commit**
```bash
git add -A && git commit -m "feat(layout): header, nav, starfield, auth-guarded app shell"
```

---

### Task 0.10: firestore.rules draft + env prompt

**Files:** `firestore.rules`, `.gitignore` update

- [ ] **Step 1: Write `firestore.rules` (draft — Phase 0 enforces auth; full field rules added in later phases)**

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isSignedIn() { return request.auth != null; }
    function isAdmin() { return isSignedIn() && request.auth.token.role == 'admin'; }

    // Tickets + settings — authed read, staff write, admin delete
    match /ticket_events_data/{docId=**} {
      allow read: if isSignedIn();
      allow write: if isSignedIn();
      allow delete: if isAdmin();
    }

    // Activity logs — authed create, admin read/delete
    match /activity_logs/{logId} {
      allow create: if isSignedIn();
      allow read, update, delete: if isAdmin();
    }

    // Staff registry
    match /allowed_usernames/{username} {
      allow read: if isSignedIn();
      allow write: if isAdmin();
    }

    // Remote locks — self read, admin write
    match /global_locks/{userEmail} {
      allow read: if isSignedIn() && request.auth.token.email == userEmail;
      allow write: if isAdmin();
    }

    // Presence — self write, admin read
    match /global_presence/{email}/devices/{deviceId} {
      allow read: if isAdmin();
      allow write: if isSignedIn() && request.auth.token.email == email;
    }

    // Admin security settings — admin only
    match /admin_settings/{doc} {
      allow read, write: if isAdmin();
    }

    // Chat + typing — authed
    match /communications/{msgId} {
      allow read, write: if isSignedIn();
    }
    match /typing_status/{channelId} {
      allow read, write: if isSignedIn();
    }
  }
}
```

- [ ] **Step 2: Ensure `.env.local` is gitignored**

Verify `.gitignore` contains `.env.local`. Add if missing.

- [ ] **Step 3: Commit**
```bash
git add -A && git commit -m "feat(rules): firestore security rules draft + gitignore"
```

---

## Phase 0 Verification Gate

After Task 0.10:
- [ ] `pnpm lint` → clean
- [ ] `pnpm tsc --noEmit` → no errors
- [ ] `pnpm build` → succeeds
- [ ] Dev server: `/login` renders, unauthenticated access to `/tickets` redirects to `/login`
- [ ] User provides `.env.local` values (service account JSON + cookie signature key) to test full auth

**⏸ PAUSE: request `.env.local` secrets from user before proceeding to auth runtime testing.**

---

## Phases 1–4 (outline — detailed plans written per-phase)

### Phase 1 — Core Ticket Loop
- Task 1.1: `useSettings` hook (onSnapshot settings/config)
- Task 1.2: `useTickets` hook (onSnapshot tickets collection)
- Task 1.3: Issue Ticket form (RHF+zod) + Server Action create + ticket card + QR
- Task 1.4: Guest List (TanStack Table, search, filter type/status/gender, sort, select)
- Task 1.5: Delete tickets (Server Action batch + progress toast)
- Task 1.6: Scanner (getUserMedia + jsQR client component)
- Task 1.7: Validate/scan-in (Server Action flips status, logs SCAN_ENTRY)

### Phase 2 — Admin
- Task 2.1: Activity Logs page (Admin SDK + TanStack Table, filter, search, delete)
- Task 2.2: Settings page (form → merge config, live display)
- Task 2.3: Remote Lock UI (select user → usernames → tabs → reason/duration → action)
- Task 2.4: Remote Lock enforcement (staff onSnapshot + Rules + lock popups)
- Task 2.5: Factory Reset (admin action: log first → wipe → preserve audit)
- Task 2.6: Staff-user management (allowed_usernames CRUD)

### Phase 3 — Comms
- Task 3.1: Presence (heartbeat + admin dashboard)
- Task 3.2: Chat channels (global/team/private list + active chat view)
- Task 3.3: Chat actions (send/reply/edit/delete + context menu + multi-select)
- Task 3.4: Typing indicators
- Task 3.5: Notifications (badge, dropdown, mark-read/clear)

### Phase 4 — Polish
- Task 4.1: Import (CSV/JSON/TXT/XLSX parse → batch write) + unit tests for parsers
- Task 4.2: Export (CSV/XLSX/PDF/TXT/DOC/JSON)
- Task 4.3: WhatsApp share (html2canvas → wa.me) + ticket view modal
- Task 4.4: Help tray (slide-out contacts) + notifications panel in header
- Task 4.5: Easter egg (sequence → music.mp3)
- Task 4.6: PWA manifest + final theme polish
- Task 4.7: Final lint/typecheck/build → ready for user approval + push
