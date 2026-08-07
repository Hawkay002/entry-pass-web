// lib/whatsapp.ts — snapshot a ticket element to PNG, auto-download, then
// redirect to wa.me. Uses html-to-image (supports oklch/modern CSS that
// html2canvas cannot parse).

import { toPng } from "html-to-image";

export async function shareTicketViaWhatsApp(
  element: HTMLElement,
  name: string,
  phone: string,
  ticketId?: string
): Promise<void> {
  // Ensure the Outfit font is fully loaded before capturing, so text metrics
  // are identical across devices (avoids fallback-font height differences).
  if (typeof document !== "undefined" && document.fonts) {
    await document.fonts.ready;
  }

  // Clone the element, render the clone off-screen at full 741px width,
  // capture it, then remove. This guarantees a consistent 741px ticket
  // regardless of the on-screen scaled/transformed version.
  const FIXED_WIDTH = 741;
  const clone = element.cloneNode(true) as HTMLElement;
  clone.style.cssText = `position: fixed; top: -99999px; left: 0; width: ${FIXED_WIDTH}px; transform: none; opacity: 1;`;
  document.body.appendChild(clone);

  // Wait a frame for the clone to render.
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

  const rect = clone.getBoundingClientRect();
  const HEIGHT = Math.round(rect.height);

  let dataUrl: string;
  try {
    dataUrl = await toPng(clone, {
      pixelRatio: 4,
      backgroundColor: "#000000",
      cacheBust: true,
      width: FIXED_WIDTH,
      height: HEIGHT,
      style: { lineHeight: "1.25", transform: "none" },
      fontEmbedCSS: undefined,
    });
  } finally {
    clone.remove();
  }

  // Build timestamp filename DDMMYYYYHHmmss.
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const ts =
    `${pad(now.getDate())}${pad(now.getMonth() + 1)}${now.getFullYear()}` +
    `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const filename = `ticket-${ts}.png`;

  // Auto-download the PNG.
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  // Wait briefly for the download to start, then open WhatsApp.
  await new Promise((r) => setTimeout(r, 1500));

  const digits = phone.replace(/\D/g, "");
  const ticketUrl = ticketId
    ? `\n\n🎫 View your interactive ticket: ${window.location.origin}/ticket/${ticketId}`
    : "";
  const message = `Hello ${name}, here is your Entry Pass 🎫.\n*Keep this QR code ready at the entrance.*${ticketUrl}`;
  window.location.href = `https://wa.me/${digits}?text=${encodeURIComponent(
    message
  )}`;
}