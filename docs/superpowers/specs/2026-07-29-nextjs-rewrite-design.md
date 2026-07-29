# Design Spec: Next.js Rewrite of Entry-pass

**Date:** 2026-07-29
**Status:** Approved → Implementing
**Source project:** `Entry-pass-revamped` (vanilla JS SPA, Firebase client-only)
**Target project:** `entry-pass-web` (Next.js App Router, server-secured)

## 1. Goal

Migrate the existing event ticketing & entry-management app from HTML/CSS/vanilla-JS
to Next.js + React + Tailwind, preserving **all 21 current working features**, while
upgrading the security model from client-side-only to proper server-secured.

## 2. Pinned Stack (npm-verified 2026-07-29)

| Layer | Package | Version |
|---|---|---|
| Framework | `next` | 16.2.12 |
| UI | `react` / `react-dom` | 19.2.8 |
| Lang | `typescript` | 7.0.2 |
| Firebase client | `firebase` | 12.16.0 |
| Firebase server | `firebase-admin` | 14.2.0 |
| Auth cookies | `next-firebase-auth-edge` | 1.12.0 |
| Styling | `tailwindcss` + `@tailwindcss/postcss` | 4.3.3 |
| Components | shadcn/ui (Radix primitives) | — |
| Icons | `lucide-react` 1.27.0, `react-icons` 5.7.0, `@hugeicons/react` 1.1.9 | — |
| Forms | `react-hook-form` 7.83.0, `zod` 4.4.3, `@hookform/resolvers` 5.5.7 | — |
| Tables | `@tanstack/react-table` | 8.21.3 |
| Export | `jspdf` 4.2.1, `jspdf-autotable` 5.0.8, `xlsx` 0.18.5 | — |
| QR/scan | `qrcode` 1.5.4, `html2canvas` 1.4.1, `jsqr` 1.4.0 | — |
| Toasts | `sonner` | 2.0.7 |
| High-end pieces | 21st.dev CLI (free tier: 2 retrievals/day — reserve for hero pieces) | — |

## 3. Decisions (locked)

- **Hosting:** Vercel (local build/debug first; push only after user approval).
- **Security:** proper server-secured rewrite (Admin SDK, session cookies, Firestore Rules).
- **UI:** modernize with shadcn/ui + Tailwind v4, same dark "command-center" theme.
- **Strategy:** greenfield in `entry-pass-web/` sibling dir; old app stays untouched.
- **Firebase project:** unchanged — `ticket-backend-5ee83`, same schema, no data loss.
- **Realtime:** stays client-side (`onSnapshot`) gated by Firestore Rules.
- **TypeScript** strict throughout.

## 4. Architecture

### Project layout
```
entry-pass-web/
  app/
    (auth)/login/page.tsx
    (app)/layout.tsx              # guard + header + nav + presence + help tray
    (app)/tickets/page.tsx        # Issue Ticket
    (app)/guests/page.tsx         # Guest List
    (app)/scanner/page.tsx
    (app)/settings/page.tsx
    (app)/logs/page.tsx           # admin only
    api/login/route.ts            # verify pw → createSessionCookie
    api/logout/route.ts
    api/admin/lock/route.ts       # remote-lock writes (admin only)
    api/admin/reset/route.ts      # factory reset (admin only)
    api/admin/staff/route.ts      # staff-user CRUD (admin only)
  lib/
    firebase/{admin,client}.ts
    auth.ts                        # claim types, role helpers
    types.ts                       # shared TS types (Ticket, Log, etc.)
  components/
    ui/                            # shadcn primitives
    tickets/, guests/, scanner/, chat/, admin/
  hooks/
    useTickets, useChat, usePresence, useRemoteLock, useSettings.ts
  middleware.ts                    # cookie verification + route guard
  firestore.rules                  # NEW security rules
  .env.local                       # Admin SDK JSON, cookie secret, fb config
```

### Auth & authorization
- Firebase Auth accounts (admin + 3 staff). Roles as **custom claims** via Admin SDK:
  `admin`, `event_manager`, `registration_desk`, `security_head`.
- Login: email/password → Admin SDK `createSessionCookie(14d)` → **httpOnly cookie**.
- `middleware.ts` verifies cookie on every protected route via
  `next-firebase-auth-edge`; redirects to `/login` if absent/expired.
- Server Components/Actions read claims → enforce roles server-side.
- **Removed:** hardcoded `email === 'admin.test@gmail.com'` client check; plaintext
  `admin123` passwords in Firestore.
- Staff **username/gatekeeper** selection preserved (server-verified against
  `allowed_usernames.email == user.email`); stored in session; used for
  `createdBy` / `scannedBy` audit fields.

### Data layer (9 Firestore collections — unchanged schema)
- **Realtime reads** (`onSnapshot`) in hooks: tickets, settings, chat,
  communications, presence, remote-lock, typing — gated by **firestore.rules**.
- **Privileged writes** via Admin SDK Route Handlers:
  factory reset, admin lock, log deletion, staff-user CRUD, batch import, chat
  cleanup.
- **New `firestore.rules`** — see §6.

## 5. Security hardening (behavioral changes)

| Current (insecure) | New (server-secured) |
|---|---|
| Client-side role check on email | Custom claims verified server-side |
| `admin123` plaintext in `admin_settings/security` | Removed; factory reset & lock are admin-claim-gated Server Actions (+ optional Firebase re-auth) |
| Tab-lock = CSS class only | Server-enforced: Firestore Rules make locked tabs' data unreadable even if UI bypassed |
| Chat `innerHTML` (XSS risk) | React auto-escapes; sanitized |
| No input validation | zod schemas (client + server) |
| Factory reset deletes its own audit log | Write immutable `FACTORY_RESET` record to reset-proof audit collection *before* wipe |
| Chat 36h cleanup = silent side-effect on admin send | Scheduled/cron cleanup (Vercel Cron or Cloud Function) |

## 6. Firestore Rules (new)

```
tickets, settings:       authed read; staff write; admin delete
activity_logs:           authed create; admin read/delete
global_presence:         self write; admin read
allowed_usernames:       self read (by email); admin write
global_locks:            self read; admin write (+ rules enforce locked-tab data unreadability)
admin_settings/security: admin only
communications:          authed read/write (scoped by role)
typing_status:           authed read/write
```

## 7. Feature mapping (all 21 areas preserved)

| # | Feature | Implementation |
|---|---|---|
| 1 | Issue Ticket | RHF+zod form → Server Action → live ticket card + QR (qrcode lib) |
| 2 | Ticket preview/QR | client QRCode; ticket card component |
| 3 | Guest List | TanStack Table: search/filter(type,status,gender)/sort/select |
| 4 | Delete tickets | Server Action batch delete w/ progress (Sonner toasts) |
| 5 | Import | client parse (CSV/JSON/TXT/XLSX) → Admin SDK batch write |
| 6 | Export | client libs (CSV/XLSX/PDF/TXT/DOC/JSON) |
| 7 | Scanner | client component, getUserMedia + jsQR → validate action |
| 8 | Validate/scan-in | Admin/SDK action flips status, logs SCAN_ENTRY |
| 9 | Settings | form → merge settings/config; live onSnapshot display |
| 10 | Remote Lock | admin UI → action writes global_locks; staff onSnapshot + Rules |
| 11 | Lock popups (basic/maint/suspension) | dialog components + duration |
| 12 | Activity Logs | admin Server Component (Admin SDK) + TanStack Table |
| 13 | Factory Reset | admin action: log first → wipe → preserve audit |
| 14 | Staff-user management | admin action → allowed_usernames CRUD |
| 15 | Heartbeat/presence | client writes global_presence every 10s; admin dashboard |
| 16 | Notifications | derived from chat messages, badge, mark-read/clear |
| 17 | Chat (global/team/private) | onSnapshot + actions; reply/edit/delete/multiselect |
| 18 | Typing indicators | onSnapshot typing_status |
| 19 | Help tray | slide-out contact card component |
| 20 | WhatsApp share | html2canvas snapshot → wa.me |
| 21 | Easter egg | konami/sequence → music.mp3 (kept for fun) |

## 8. Build phasing

- **Phase 0 — Foundation:** scaffold Next 16, Tailwind v4 theme, design tokens,
  Firebase client+admin, auth (login/logout/cookie/middleware), custom claims,
  firestore.rules, base layout (header/nav/toasts/starfield), shadcn setup.
- **Phase 1 — Core loop:** Issue Ticket, Guest List (table+filter+sort+select+delete), Scanner + validation.
- **Phase 2 — Admin:** Remote Lock (UI + Rules + popups), Activity Logs, Settings, Factory Reset, staff-user mgmt.
- **Phase 3 — Comms:** Chat (channels, reply/edit/delete, typing), Notifications, Presence.
- **Phase 4 — Polish:** Import/Export, WhatsApp/QR, Help tray, Easter egg, PWA manifest, final theme, cutover.

## 9. Definition of done (local)

- `pnpm build` passes with zero errors.
- `pnpm lint` clean.
- Each phase verified against original app behavior.
- User reviews & approves before any push to GitHub.

## 10. Open notes

- Admin SDK service-account JSON + cookie secret must be supplied as
  `.env.local` before auth features can run locally — will prompt user at Phase 0.
- Existing Firebase project has **no security rules yet** (open). Rules will be
  deployed to the same project; user must confirm timing since it also affects
  the *old* still-live app.
