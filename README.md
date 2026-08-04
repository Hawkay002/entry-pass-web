# TicketingSystem.

> **Server-secured event ticketing & entry management.** Issue QR-coded tickets, scan guests at the door in milliseconds, lock staff tabs remotely, and track every action in real time — all with zero compromise on security.

Built with Next.js 16, React 19, Tailwind v4, Firebase Admin SDK, and Upstash Redis. A complete rewrite of a Firebase client-only app into a server-secured architecture.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Self-Hosting Guide](#self-hosting-guide)
- [Environment Variables](#environment-variables)
- [Firebase Setup](#firebase-setup)
- [Upstash Redis Setup](#upstash-redis-setup)
- [Firestore Security Rules](#firestore-security-rules)
- [Deployment](#deployment)
- [Project Structure](#project-structure)
- [Data Model](#data-model)
- [API Reference](#api-reference)
- [How It Works](#how-it-works)
- [Contributing](#contributing)
- [License](#license)

---

## Features

### Core Ticket Loop
- **Issue Tickets** — Form with live QR preview, instant WhatsApp share with auto-snapshot at 4x resolution
- **Guest List** — 7 sort options, 4 filters (type/status/gender + search), bulk delete, import/export
- **Scanner** — Camera QR decode at 480px for maximum speed, three-way validation (granted / already scanned / invalid)

### Admin & Security
- **Dynamic Roles** — Admin creates roles and adds staff. Google Sign-In maps emails automatically
- **Remote Lock** — Lock or unlock specific tabs per staff member with live status badges. Selective unlock
- **Maintenance Mode** — Lock all staff instantly with duration timer. Auto-unlock when time expires
- **Staff Auto-Logout** — Removing a staff member instantly revokes their session and kicks them out
- **Auto-Absent** — Deadline-based status automation via realtime onSnapshot. Zero page reload
- **Activity Logs** — 11 colored action types. Redis-backed for zero Firestore quota usage
- **Factory Reset** — Nukes the database with an immutable audit trail preserved

### Help & Support
- **Help Tray** — Slide-out contact directory. Admin can add/edit/delete contacts from the tray or Configuration page. Firestore-backed, realtime updates.

### UX
- **Import / Export** — CSV, XLSX, PDF, TXT, DOC, JSON. Auto-dedupe by phone on import
- **Mobile-First** — Fully responsive. 2-row nav on mobile. Fixed 380px ticket dimensions across devices
- **Landing Page** — Industrial-grade marketing page with orbiting tech icons, live terminal feed, bento grid

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| **Framework** | [Next.js](https://nextjs.org) (App Router) | 16.2.12 |
| **UI** | [React](https://react.dev) | 19.2.8 |
| **Language** | [TypeScript](https://www.typescriptlang.org) | 6.0.3 |
| **Styling** | [Tailwind CSS](https://tailwindcss.com) v4 | 4.3.3 |
| **Components** | [shadcn/ui](https://ui.shadcn.com) (Base UI / base-nova style) | — |
| **Icons** | [lucide-react](https://lucide.dev), [react-icons](https://react-icons.github.io/react-icons), [@hugeicons/react](https://hugeicons.com) | 1.27 / 5.7 / 1.1.9 |
| **Backend** | [Firebase](https://firebase.google.com) (Auth + Firestore + Admin SDK) | 12.16 / 14.2 |
| **Auth Edge** | [next-firebase-auth-edge](https://github.com/awinogrd/next-firebase-auth-edge) | 1.12.0 |
| **Logs** | [Upstash Redis](https://upstash.com) | @upstash/redis |
| **Forms** | [react-hook-form](https://react-hook-form.com) + [zod](https://zod.dev) | 7.83 / 4.4 |
| **Tables** | [TanStack Table](https://tanstack.com/table) | 8.21.3 |
| **QR** | [qrcode](https://github.com/soldair/node-qrcode) + [jsQR](https://github.com/cozmo/jsQR) | 1.5.4 / 1.4.0 |
| **Export** | [jsPDF](https://github.com/parallax/jsPDF), [xlsx](https://github.com/SheetJS/sheetjs) | 4.2 / 0.18 |
| **WhatsApp** | [html-to-image](https://github.com/bubkoo/html-to-image) | 1.11.13 |
| **Motion** | [Framer Motion](https://www.framer.com/motion) | 12.43 |
| **Toasts** | [Sonner](https://sonner.emilkowal.ski) | 2.0.7 |

---

## Architecture

```
+-------------------------------------------------------------+
|                    Browser (Client)                         |
|  +----------+  +----------+  +----------+  +---------+    |
|  |  React   |  | Firebase |  |  Camera  |  |  html   |    |
|  |  Pages   |  |  Client  |  |  jsQR    |  |  to     |    |
|  | (RSC +   |  |  SDK     |  |  Decode  |  |  Image  |    |
|  |  Client) |  | onSnapshot| |          |  |         |    |
|  +----+-----+  +----+-----+  +----------+  +---------+    |
|       |             |                                      |
+-------+-------------+--------------------------------------+
        |             |
        v             v
+-------------------------------------------------------------+
|              Next.js Server (Vercel / Node)                 |
|                                                             |
|  +---------+  +----------+  +----------+  +-----------+    |
|  |  Proxy  |  |  Server  |  |  Route   |  |  Server   |    |
|  |(Edge MW)|  | Components| | Handlers |  |  Actions  |    |
|  | Cookie  |  | getAppUser| | /api/*   |  |  CRUD +   |    |
|  |  Gate   |  |  verify  | |  login   |  |  biz logic|    |
|  +---------+  +----+-----+  +----+-----+  +-----+-----+    |
|                    |             |              |          |
|                    v             v              v          |
|              +--------------------------------------+      |
|              |     Firebase Admin SDK (server)     |      |
|              |  verifySessionCookie - createCookie |      |
|              |  Firestore CRUD - revokeTokens      |      |
|              |  setCustomClaims - getUserByEmail   |      |
|              +------------------+-------------------+      |
+--------------------------------+----------------------------+
                                 |
              +------------------+------------------+
              v                  v                  v
     +--------------+   +--------------+   +------------+
     |  Firestore   |   | Firebase Auth|   |  Upstash   |
     |              |   |              |   |   Redis    |
     | - tickets    |   | - users      |   |            |
     | - settings   |   | - claims     |   | - activity |
     | - roles      |   | - sessions   |   |   logs     |
     | - locks      |   | - revocation |   | (1000 max) |
     | - locks      |   |              |   |            |
     | - contacts   |   |              |   |            |
     +--------------+   +--------------+   +------------+
```

**Security model:** All role checks happen server-side via custom claims + session cookie verification. No client-side email checks. No plaintext passwords. Staff removed from roles are instantly logged out via token revocation + realtime listener.

---

## Quick Start

```bash
# Clone
git clone https://github.com/Hawkay002/entry-pass-web.git
cd entry-pass-web

# Install
pnpm install

# Copy env template
cp .env.local.example .env.local
# Fill in your Firebase + Redis credentials (see below)

# Run
pnpm dev
```

Open `http://localhost:3000`

---

## Self-Hosting Guide

### Prerequisites

- **Node.js** 20+ (tested on 24.x)
- **pnpm** 10+ (`npm install -g pnpm`)
- A **Firebase** project (Blaze plan recommended for Auth + Firestore)
- An **Upstash Redis** database (free tier is fine)

### Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com) -> **Create Project**
2. Enable **Authentication** -> Sign-in method -> enable **Email/Password** and **Google**
3. Create **Firestore Database** (production mode)
4. Go to **Project Settings -> Service Accounts** -> **Generate new private key** -> download JSON
5. Copy the **Web App config** (apiKey, authDomain, etc.) from Project Settings -> General

### Step 2: Create an Upstash Redis Database

1. Go to [Upstash](https://console.upstash.com) -> **Create Database**
2. Copy the **REST URL** and **REST Token**

### Step 3: Configure Environment Variables

Create `.env.local` in the project root:

```bash
# Firebase client config (from Project Settings -> General -> Web App)
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Session cookies
AUTH_COOKIE_NAME=session
# Generate with: openssl rand -base64 32
COOKIE_SIGNATURE_KEY_CURRENT=your_random_32_char_secret

# Firebase Admin SDK (paste the ENTIRE service account JSON on ONE line)
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}

# Upstash Redis (for activity logs)
KV_REST_API_URL=https://your-db.upstash.io
KV_REST_API_TOKEN=your_token
```

### Step 4: Set Admin Email

In `app/api/login/route.ts` and `lib/firebase/server-auth.ts`, update the `ADMIN_EMAILS` array:

```ts
const ADMIN_EMAILS = ["your-email@gmail.com"];
```

### Step 5: Deploy Firestore Security Rules

```bash
# Install Firebase CLI
npm install -g firebase-tools
firebase login

# Deploy rules
firebase deploy --only firestore:rules
```

Or paste the contents of [`firestore.rules`](./firestore.rules) into the Firebase Console -> Firestore -> Rules.

### Step 6: Set Custom Claims (one-time)

Create a script to set admin role on your Firebase Auth account:

```js
const admin = require("firebase-admin");
const sa = require("./service-account.json");
const app = admin.initializeApp({ credential: admin.cert(sa) });

admin.auth(app).getUserByEmail("your-email@gmail.com")
  .then(user => admin.auth(app).setCustomUserClaims(user.uid, { role: "admin" }))
  .then(() => { console.log("Admin role set"); return app.delete(); });
```

Run: `node set-admin.js`

### Step 7: Run Locally

```bash
pnpm dev
```

### Step 8: Deploy to Vercel

1. Push to GitHub
2. Go to [Vercel](https://vercel.com/new) -> Import the repo
3. Add all environment variables (same as `.env.local`)
4. Deploy
5. Add your Vercel domain to **Firebase Console -> Authentication -> Settings -> Authorized domains**

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Yes | Firebase Web API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Yes | `project.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Yes | Firebase project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Yes | `project.firebasestorage.app` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Yes | Firebase messaging sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Yes | Firebase app ID |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | Yes | Full service account JSON (one line) |
| `AUTH_COOKIE_NAME` | No | Default: `session` |
| `COOKIE_SIGNATURE_KEY_CURRENT` | Yes | Random 32+ char string for cookie signing |
| `KV_REST_API_URL` | Yes | Upstash Redis REST URL |
| `KV_REST_API_TOKEN` | Yes | Upstash Redis REST token |

---

## Firebase Setup

### Authentication

1. **Enable Email/Password** - For admin login
2. **Enable Google** - For staff Google Sign-In
3. **Add authorized domains** - Add localhost + your deployment URL

### Firestore Collections

Collections are created automatically on first write. The app uses:

| Collection | Purpose |
|---|---|
| `ticket_events_data/shared_event_db/tickets` | Guest tickets |
| `ticket_events_data/shared_event_db/settings/config` | Event settings (name, venue, deadline) |
| `roles/{roleName}` | Dynamic staff roles |
| `global_locks/{userEmail}` | Remote tab locks per staff |
| `global_locks/{userEmail}` | Remote tab locks per staff |
| `help_contacts` | Admin-managed help tray contacts |
| `audit_trail` | Reset-proof audit records |

---

## Upstash Redis Setup

Activity logs are stored in [Upstash Redis](https://upstash.com) (not Firestore) to save write quota.

1. Create a free account at [Upstash](https://console.upstash.com)
2. **Create Database** -> choose a region close to your deployment
3. Copy the **REST URL** (`https://xxx.upstash.io`) and **REST Token**
4. Add them to your environment variables

**Free tier limits:** 500K commands/month, 256MB storage, 10GB transfer - more than enough for activity logs (auto-pruned to last 1000 entries).

---

## Firestore Security Rules

The complete rules are in [`firestore.rules`](./firestore.rules). Key principles:

- **Default deny** - anything not explicitly allowed is blocked
- **Admin-gated** - destructive operations require `request.auth.token.role == 'admin'`
- **Self-only** - users read their own locks
- **Authenticated reads** - all app data requires sign-in

Deploy with:
```bash
firebase deploy --only firestore:rules
```

---

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import at [vercel.com/new](https://vercel.com/new)
3. Framework preset: **Next.js** (auto-detected)
4. Add all [environment variables](#environment-variables)
5. Deploy

**Note:** The `jose` ESM compatibility issue is handled via:
- `pnpm-workspace.yaml` override: `jose: 5.10.0`
- `scripts/fix-jose.mjs` prebuild script (patches any jose@6 -> jose@5)

### Self-Host (Docker / VPS / Other)

```bash
# Build
pnpm build

# Start production server
pnpm start

# Or with a process manager
pm2 start "pnpm start" --name entry-pass
```

Requirements:
- Node.js 20+
- The server needs to be reachable from Firebase Auth (for session cookie verification)
- Add your domain to Firebase Authorized Domains

---

## Project Structure

```
entry-pass-web/
|-- app/
|   |-- (app)/              # Authenticated routes (gated by layout)
|   |   |-- layout.tsx      # Server-side auth check + auto-absent
|   |   |-- tickets/        # Issue Ticket (form + QR + WhatsApp)
|   |   |-- guests/         # Guest List (table + filter + import/export)
|   |   |-- scanner/        # Camera QR scanner
|   |   |-- settings/       # Configuration + admin panels
|   |   `-- logs/           # Activity Logs (admin only)
|   |-- (auth)/login/       # Login page (email + Google)
|   |-- actions/            # Server Actions (CRUD + business logic)
|   |-- api/                # Route Handlers (login, logout, auto-absent)
|   |-- layout.tsx          # Root layout (fonts, toaster, theme)
|   `-- page.tsx            # Landing page (public)
|-- components/
|   |-- admin/              # Admin panels (roles, RDM, maintenance, factory reset)
|   |-- chat/               # (removed — chat feature deprecated)
|   |-- guests/             # Import/Export modals
|   |-- landing/            # Marketing page sections
|   |-- layout/             # App shell, header, nav, starfield, help tray
|   |-- logs/               # Activity logs table
|   |-- tickets/            # Ticket card + view modal
|   `-- ui/                 # shadcn/ui primitives (16 components)
|-- hooks/                  # React hooks (realtime Firestore listeners)
|-- lib/
|   |-- firebase/           # Admin SDK, client SDK, server-auth, logging
|   |-- auth.ts             # AppUser type, role helpers
|   |-- env.ts              # Typed + validated env access
|   |-- types.ts            # Shared data model
|   |-- paths.ts            # Firestore collection paths
|   |-- redis-log.ts        # Upstash activity logging
|   |-- guest-list.ts       # Filter/sort helpers (pure)
|   |-- import-export.ts    # Parse + format (CSV/XLSX/PDF/TXT/DOC/JSON)
|   `-- whatsapp.ts         # Ticket snapshot -> WhatsApp share
|-- public/                 # Static assets (SVGs, audio)
|-- scripts/                # Dev utilities (jose fix, claim setup)
|-- firestore.rules         # Security rules
|-- proxy.ts                # Edge middleware (cookie gate)
|-- next.config.ts          # Next.js config
|-- vercel.json             # Vercel deployment config
`-- package.json
```

---

## Data Model

### Ticket
```typescript
interface Ticket {
  id: string;              // Firestore auto-id
  name: string;
  gender: "Male" | "Female" | "Other";
  age: number;
  phone: string;           // +91XXXXXXXXXX
  ticketType: "Classic" | "Diamond" | "Gold";  // Diamond=VIP, Gold=VVIP
  status: "coming-soon" | "arrived" | "absent";
  scanned: boolean;
  scannedAt: number | null;
  scannedBy: string | null;
  createdBy: string;       // username
  createdAt: number;       // epoch ms
}
```

### Staff Role
```typescript
interface StaffRole {
  id: string;              // document id = role name
  name: string;
  staff: { name: string; email: string }[];
  createdAt: number;
}
```

### Remote Lock
```typescript
interface GlobalLockDoc {
  userSpecificLocks: Record<string, string[]>;  // username -> locked tab names
  lockMetadata: Record<string, {
    type: "basic" | "maintenance" | "suspension";
    duration: string | null;
    updatedAt: number;
  }>;
  updatedAt: number;
}
```

---

## API Reference

### Authentication

| Endpoint | Method | Description |
|---|---|---|
| `/api/login` | POST | Verify Firebase ID token, create httpOnly session cookie |
| `/api/logout` | POST | Clear session cookie |
| `/api/auto-absent` | POST | Check deadline, mark coming-soon tickets as absent |

**Login flow:**
1. Client signs in with Firebase (email/password or Google popup)
2. Gets Firebase ID token
3. POSTs to `/api/login` with `{ idToken }`
4. Server verifies token, creates 14-day session cookie
5. Client redirects to dashboard

### Server Actions

| Action | File | Description |
|---|---|---|
| `createTicket` | `actions/tickets.ts` | Create a new ticket with QR |
| `validateTicket` | `actions/tickets.ts` | Scan validation (granted/already/invalid) |
| `deleteOneTicket` | `actions/tickets.ts` | Delete a single ticket |
| `autoMarkAbsent` | `actions/tickets.ts` | Deadline-based absent marking |
| `saveSettings` | `actions/admin.ts` | Save event configuration |
| `clearSettings` | `actions/admin.ts` | Clear event settings |
| `factoryReset` | `actions/admin.ts` | Wipe database (preserves audit trail) |
| `applyRemoteLocks` | `actions/admin.ts` | Lock/unlock staff tabs |
| `unlockStaff` | `actions/admin.ts` | Fully unlock a staff member |
| `createRole` | `actions/roles.ts` | Create a new staff role |
| `addStaffToRole` | `actions/roles.ts` | Add staff member to a role |
| `removeStaffFromRole` | `actions/roles.ts` | Remove staff + revoke tokens |
| `deleteRole` | `actions/roles.ts` | Delete a role entirely |
| `importTickets` | `actions/import.ts` | Bulk import with phone dedupe |
| `sendMessage` | `actions/chat.ts` | *(deprecated — comms removed)* |

---

## How It Works

### Authentication & Authorization

```
Browser                    Server                      Firebase
  |                          |                            |
  |-- Firebase Sign-in ---------------------------------->  |
  |<-- ID Token ------------------------------------------|
  |                          |                            |
  |-- POST /api/login ----->|                            |
  |   { idToken }            |-- verifyIdToken --------->|
  |                          |<-- decoded token ---------|
  |                          |-- createSessionCookie --->|
  |                          |<-- session cookie --------|
  |<-- Set-Cookie: session --|                            |
  |                          |                            |
  |-- GET /tickets --------->|                            |
  |   Cookie: session=xxx    |-- verifySessionCookie --->|
  |                          |<-- decoded claims --------|
  |                          |-- read roles collection ->|
  |                          |<-- staff data -------------|
  |<-- Rendered page --------|                            |
```

### Remote Lock Enforcement

1. Admin selects staff -> chooses tabs -> clicks Lock
2. Server writes to `global_locks/{email}` via Admin SDK
3. Staff's `useRemoteLocks` hook fires `onSnapshot` instantly
4. `LockedTabsProvider` context updates
5. Locked pages render `<LockedTab />` component (fully blocked, not just hidden)
6. Unlocking removes the entry -> pages restore instantly

### Staff Removal (Instant Kick)

1. Admin removes staff from role -> confirmation modal
2. `removeStaffFromRole` action:
   - Removes email from role's staff array
   - If email not in any other role -> `revokeRefreshTokens(uid)`
3. Staff's `useStaffCheck` hook fires `onSnapshot` instantly
4. Email not found in roles -> `fetch("/api/logout")` + redirect to `/login`
5. Login attempt -> `/api/login` checks roles -> email not found -> rejected

### Auto-Absent

1. Deadline stored with timezone offset (e.g., `2026-08-04T17:00:00+05:30`)
2. Guest List page polls `/api/auto-absent` every 10s (only when deadline set + coming-soon tickets exist)
3. Server checks `Date.now() > deadline` with correct timezone
4. Batch updates all `coming-soon` -> `absent`
5. `onSnapshot` picks up the change -> table updates live (no refresh)

---

## Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit: `git commit -m 'Add amazing feature'`
4. Push: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development

```bash
pnpm dev          # Start dev server (http://localhost:3000)
pnpm build        # Production build
pnpm lint         # ESLint
pnpm typecheck    # TypeScript check (no emit)
```

---

## License

(c) 2026 **Shovith Debnath**. All rights reserved.

---

**Built with:** Next.js - React - Tailwind CSS - Firebase - Upstash Redis - Framer Motion
