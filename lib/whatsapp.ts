// lib/whatsapp.ts — snapshot a ticket element to PNG, auto-download, then
// redirect to wa.me. Uses html-to-image (supports oklch/modern CSS that
// html2canvas cannot parse).

import { toPng } from "html-to-image";

export async function shareTicketViaWhatsApp(
  element: HTMLElement,
  name: string,
  phone: string
): Promise<void> {
  // Ensure the Outfit font is fully loaded before capturing, so text metrics
  // are identical across devices (avoids fallback-font height differences).
  if (typeof document !== "undefined" && document.fonts) {
    await document.fonts.ready;
  }

  // Temporarily lock the element's inline width so html-to-image renders
  // it at exactly 380px regardless of layout. This prevents desktop columns
  // from making the captured area wider than the card itself.
  const FIXED_WIDTH = 380;
  const rect = element.getBoundingClientRect();
  const HEIGHT = Math.round(rect.height);
  const prev = {
    width: element.style.width,
    height: element.style.height,
    display: element.style.display,
  };
  element.style.width = `${FIXED_WIDTH}px`;
  element.style.height = `${HEIGHT}px`;
  element.style.display = "block";

  let dataUrl: string;
  try {
    dataUrl = await toPng(element, {
      pixelRatio: 4,
      backgroundColor: "#000000",
      cacheBust: true,
      width: FIXED_WIDTH,
      height: HEIGHT,
      style: { lineHeight: "1.25" },
      fontEmbedCSS: undefined,
    });
  } finally {
    element.style.width = prev.width;
    element.style.height = prev.height;
    element.style.display = prev.display;
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
  const message = `Hello ${name}, here is your Entry Pass 🎫.\n*Keep this QR code ready at the entrance.*`;
  window.location.href = `https://wa.me/${digits}?text=${encodeURIComponent(
    message
  )}`;
}
