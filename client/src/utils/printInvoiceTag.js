import { showToast } from "./toast";

const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[char]);

export function printInvoiceTag(invoice) {
  const lines = invoice.lines || [];
  const garments = new Map();
  for (const { name, unit, qty } of lines) {
    if (!name) continue;
    const label = unit && unit !== "pcs" ? `${name} (${unit})` : name;
    garments.set(label, (garments.get(label) || 0) + Number(qty || 0));
  }
  const total = Number(invoice.garmentCount) || lines.reduce((sum, line) => sum + Number(line.qty || 0), 0);
  const clothList = Array.from(garments, ([name, quantity]) =>
    `<li>${escapeHtml(name)} × ${quantity}</li>`
  ).join("");
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    showToast("Please allow pop-ups to print the tag.", "error");
    return;
  }
  printWindow.document.write(`<!doctype html>
    <html><head><title>Tag ${escapeHtml(invoice.number)}</title>
    <style>
      @page { size: 100mm 70mm; margin: 4mm }
      body { font: 11pt Arial, sans-serif; margin: 0; color: #111; overflow-wrap: anywhere }
      main { border: 2px solid; border-radius: 3mm; padding: 4mm }
      h1 { font-size: 18pt; margin: 0; border-bottom: 1px solid; padding-bottom: 2mm }
      p { margin: 2mm 0 }
      ul { margin: 0; padding-left: 5mm }
      li { break-inside: avoid }
    </style></head>
    <body><main><h1>${escapeHtml(invoice.number)}</h1>
    <p><strong>${escapeHtml(invoice.customer?.name || "Customer")}</strong></p>
    <p>Total quantity: ${total}</p><ul>${clothList}</ul></main></body></html>`);
  printWindow.addEventListener("load", () => printWindow.print(), { once: true });
  printWindow.document.close();
}
