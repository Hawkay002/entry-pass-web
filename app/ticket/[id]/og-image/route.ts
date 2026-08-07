// app/ticket/[id]/opengraph-image.tsx — dynamic OG image per ticket.
// Renders an SVG server-side, converts to WebP via sharp (~40-60KB instead of 300KB+ PNG).
// Shows up in WhatsApp/social link previews with guest name, type, and event.

import { getAdminDb } from "@/lib/firebase/admin";
import { paths } from "@/lib/paths";
import sharp from "sharp";

export const runtime = "nodejs";

const TYPE_COLORS: Record<string, { bg: string; accent: string }> = {
  Classic: { bg: "#0a0a14", accent: "#10b981" },
  Diamond: { bg: "#1e293b", accent: "#cbd5e1" },
  SVIP: { bg: "#3d2f0a", accent: "#fcf6ba" },
  Gold: { bg: "#2d1810", accent: "#ef671c" },
};

const TYPE_LABELS: Record<string, string> = {
  Classic: "CLASSIC",
  Diamond: "VIP",
  SVIP: "SVIP",
  Gold: "VVIP",
};

function escapeXml(s: string): string {
  return s.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" }[c]!));
}

function buildSvg(name: string, typeLabel: string, eventName: string, bg: string, accent: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${bg}"/>
      <stop offset="1" stop-color="#050505"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>

  <!-- Ticket shape -->
  <g transform="translate(150 80)">
    <!-- Main body -->
    <rect x="0" y="0" width="720" height="470" rx="20" fill="${bg}" stroke="${accent}" stroke-opacity="0.3" stroke-width="2"/>
    <!-- Perforation -->
    <line x1="540" y1="0" x2="540" y2="470" stroke="${accent}" stroke-opacity="0.3" stroke-width="2" stroke-dasharray="8 8"/>
    <circle cx="540" cy="0" r="10" fill="#050505"/>
    <circle cx="540" cy="470" r="10" fill="#050505"/>

    <!-- Header -->
    <text x="50" y="60" font-family="Arial, sans-serif" font-size="26" font-weight="700" fill="${accent}" letter-spacing="2">ENTRY PASS — ${typeLabel}</text>
    <text x="50" y="95" font-family="Arial, sans-serif" font-size="20" fill="#ffffff" fill-opacity="0.5">${escapeXml(eventName)}</text>

    <!-- Divider -->
    <line x1="50" y1="120" x2="480" y2="120" stroke="${accent}" stroke-opacity="0.2" stroke-width="1"/>

    <!-- Guest name -->
    <text x="50" y="220" font-family="Arial, sans-serif" font-size="68" font-weight="700" fill="#ffffff">${escapeXml(name)}</text>

    <!-- Divider -->
    <line x1="50" y1="260" x2="480" y2="260" stroke="${accent}" stroke-opacity="0.2" stroke-width="1"/>

    <!-- Footer -->
    <text x="50" y="310" font-family="Arial, sans-serif" font-size="18" fill="#ffffff" fill-opacity="0.4">Scan your QR code at the entrance for admission</text>

    <!-- Stub -->
    <text x="640" y="235" font-family="Arial, sans-serif" font-size="36" font-weight="700" fill="${accent}" fill-opacity="0.6" transform="rotate(-90 640 235)" text-anchor="middle">ADMIT ONE</text>
  </g>
</svg>`;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getAdminDb();

  const [ticketSnap, settingsSnap] = await Promise.all([
    db.collection(paths.ticketsCollection).doc(id).get(),
    db.doc(paths.settingsDoc).get(),
  ]);

  const data = ticketSnap.exists ? (ticketSnap.data() as Record<string, unknown>) : {};
  const name = String(data.name ?? "Guest");
  const ticketType = String(data.ticketType ?? "Classic");
  const eventName = String(settingsSnap.data()?.name ?? "Event");

  const colors = TYPE_COLORS[ticketType] ?? TYPE_COLORS.Classic;
  const typeLabel = TYPE_LABELS[ticketType] ?? "CLASSIC";

  // Build SVG → convert to JPEG via sharp. WebP isn't supported by WhatsApp OG.
  // Resize to 800x420 and quality 60 to keep under 30KB.
  const svg = buildSvg(name, typeLabel, eventName, colors.bg, colors.accent);
  const jpeg = await sharp(Buffer.from(svg))
    .resize(800, 420)
    .jpeg({ quality: 55, progressive: true, mozjpeg: true })
    .toBuffer();

  return new Response(jpeg, {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
