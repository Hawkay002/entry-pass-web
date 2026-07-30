// lib/whatsapp.ts — snapshot a ticket element to PNG, auto-download, then
// redirect to wa.me. Faithful to the original (script.js:1638-1668).

export async function shareTicketViaWhatsApp(
  element: HTMLElement,
  name: string,
  phone: string
): Promise<void> {
  const html2canvas = (await import("html2canvas")).default;

  // Capture at scale 3 with transparent background.
  const canvas = await html2canvas(element, {
    scale: 3,
    backgroundColor: null,
    useCORS: true,
  });

  // Build timestamp filename DDMMYYYYHHmmss.
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const ts =
    `${pad(now.getDate())}${pad(now.getMonth() + 1)}${now.getFullYear()}` +
    `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const filename = `ticket-${ts}.png`;

  // Auto-download the PNG.
  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
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
