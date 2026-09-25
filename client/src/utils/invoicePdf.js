import { PDFArray, PDFDocument, StandardFonts, rgb, PDFName, PDFString } from "pdf-lib";

const TEMPLATE_URL = "/prem-power-laundry-letterhead.pdf";
const blue = rgb(0.03, 0.25, 0.48);
const ink = rgb(0.09, 0.16, 0.22);
const muted = rgb(0.36, 0.43, 0.49);
const pale = rgb(0.93, 0.97, 1);

const money = (value) => `Rs ${Number(value || 0).toFixed(2)}`;
const clean = (value) => String(value == null ? "" : value).replace(/[^\x20-\x7E]/g, " ").replace(/\s+/g, " ").trim();

function fitText(text, maxWidth, font, size) {
  const words = clean(text).split(" ").filter(Boolean);
  const lines = [];
  let line = "";
  words.forEach((word) => {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= maxWidth) line = next;
    else { if (line) lines.push(line); line = word; }
  });
  if (line) lines.push(line);
  return lines;
}

function addLink(document, page, text, url, x, y, width, height) {
  const annotation = document.context.register(document.context.obj({
    Type: "Annot", Subtype: "Link", Rect: [x, y, x + width, y + height], Border: [0, 0, 0],
    A: { Type: "Action", S: "URI", URI: PDFString.of(url) }
  }));
  const annots = page.node.lookupMaybe(PDFName.of("Annots"), PDFArray);
  if (annots?.push) annots.push(annotation);
  else page.node.set(PDFName.of("Annots"), document.context.obj([annotation]));
  return text;
}

export async function createInvoicePdf(invoice, billing = {}) {
  const response = await fetch(TEMPLATE_URL, { cache: "force-cache" });
  if (!response.ok) throw new Error("Invoice letterhead could not be loaded.");
  const document = await PDFDocument.load(await response.arrayBuffer());
  const page = document.getPages()[0];
  const { width, height } = page.getSize();
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const left = width * 0.065;
  const right = width * 0.935;
  const contentWidth = right - left;
  let y = height * 0.735;
  const draw = (text, x, yy, size = 9, font = regular, color = ink) => page.drawText(clean(text), { x, y: yy, size, font, color });
  const line = (yy, color = rgb(0.78, 0.86, 0.93)) => page.drawLine({ start: { x: left, y: yy }, end: { x: right, y: yy }, thickness: 0.7, color });

  page.drawRectangle({ x: left, y: y - 39, width: contentWidth, height: 48, color: pale, borderColor: rgb(0.75, 0.85, 0.94), borderWidth: 0.7 });
  draw("INVOICE", left + 12, y - 8, 8, bold, blue);
  draw(invoice.number || "Invoice", left + 12, y - 27, 16, bold, ink);
  const date = new Date(invoice.invoiceDate || Date.now()).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const dateText = `Date: ${date}`;
  draw(dateText, right - regular.widthOfTextAtSize(dateText, 9) - 12, y - 13, 9, regular, muted);
  const status = invoice.paid ? "PAID" : "PAYMENT PENDING";
  draw(status, right - bold.widthOfTextAtSize(status, 9) - 12, y - 29, 9, bold, invoice.paid ? rgb(0.08, 0.45, 0.28) : rgb(0.78, 0.24, 0.12));
  y -= 65;

  draw("BILL TO", left, y, 7.5, bold, blue);
  draw(invoice.customer?.name || "Customer", left, y - 16, 11, bold);
  const customerLines = fitText([invoice.customer?.phone, invoice.customer?.email, invoice.customer?.address].filter(Boolean).join(" | ") || "No contact details", contentWidth * 0.66, regular, 8);
  customerLines.slice(0, 2).forEach((text, index) => draw(text, left, y - 30 - index * 11, 8, regular, muted));
  draw(`Total garments: ${Number(invoice.garmentCount || 0)}`, right - 125, y - 16, 9, bold, ink);
  if (invoice.sourceOrderId) draw(`Order: ${clean(invoice.orderNumber || invoice.sourceOrderId)}`, right - 125, y - 31, 8, regular, muted);
  y -= 58;

  page.drawRectangle({ x: left, y: y - 20, width: contentWidth, height: 20, color: blue });
  draw("ITEM / SERVICE", left + 8, y - 14, 7.5, bold, rgb(1, 1, 1));
  draw("QTY", right - 142, y - 14, 7.5, bold, rgb(1, 1, 1));
  draw("RATE", right - 92, y - 14, 7.5, bold, rgb(1, 1, 1));
  draw("AMOUNT", right - 46, y - 14, 7.5, bold, rgb(1, 1, 1));
  y -= 29;

  (invoice.lines || []).slice(0, 12).forEach((item, index) => {
    const rowHeight = item.note ? 31 : 23;
    if (index % 2) page.drawRectangle({ x: left, y: y - rowHeight + 5, width: contentWidth, height: rowHeight, color: rgb(0.975, 0.985, 0.995) });
    draw(item.name, left + 8, y - 7, 8.5, bold);
    if (item.note) draw(fitText(item.note, contentWidth * 0.54, regular, 6.8)[0] || "", left + 8, y - 18, 6.8, regular, muted);
    draw(item.qty, right - 138, y - 7, 8, regular);
    draw(money(item.price), right - 100, y - 7, 8, regular);
    const amount = money(item.amount);
    draw(amount, right - regular.widthOfTextAtSize(amount, 8), y - 7, 8, regular);
    y -= rowHeight;
    line(y + 4, rgb(0.86, 0.9, 0.93));
  });

  y -= 8;
  const summaries = [
    ["Subtotal", invoice.subtotal],
    Number(invoice.discount) > 0 && ["Discount", -Number(invoice.discount)],
    Number(invoice.deliveryCharge) > 0 && ["Pickup & delivery", invoice.deliveryCharge],
    Number(invoice.extraCharge) > 0 && [invoice.extraChargeLabel ? `Additional - ${invoice.extraChargeLabel}` : "Additional charges", invoice.extraCharge],
    Number(invoice.gstAmount) > 0 && [`GST (${Number(invoice.gstPct || 0)}%)`, invoice.gstAmount],
    Number(invoice.adjustment) !== 0 && ["Adjustment", invoice.adjustment]
  ].filter(Boolean);
  summaries.forEach(([label, value]) => {
    draw(label, right - 160, y, 8, regular, muted);
    const valueText = `${Number(value) < 0 ? "-" : ""}${money(Math.abs(Number(value)))}`;
    draw(valueText, right - regular.widthOfTextAtSize(valueText, 8), y, 8, regular, ink);
    y -= 14;
  });
  page.drawRectangle({ x: right - 176, y: y - 24, width: 176, height: 29, color: blue });
  draw("TOTAL", right - 165, y - 14, 9, bold, rgb(1, 1, 1));
  const total = money(invoice.total);
  draw(total, right - bold.widthOfTextAtSize(total, 12) - 9, y - 15, 12, bold, rgb(1, 1, 1));

  const footerY = height * 0.105;
  const orderNumber = invoice.orderNumber || (invoice.sourceOrderId ? invoice.sourceOrderId : "Manual invoice");
  draw(`Order number: ${orderNumber}`, left, footerY + 24, 8.5, bold, blue);
  const trackingUrl = invoice.sourceOrderId ? `${window.location.origin}/orders?order=${encodeURIComponent(invoice.sourceOrderId)}` : window.location.origin;
  const trackLabel = invoice.sourceOrderId ? "Track your order" : "Visit Prem Power Laundry";
  draw(trackLabel, left, footerY + 8, 8.5, bold, blue);
  page.drawLine({ start: { x: left, y: footerY + 6 }, end: { x: left + bold.widthOfTextAtSize(trackLabel, 8.5), y: footerY + 6 }, thickness: 0.5, color: blue });
  addLink(document, page, trackLabel, trackingUrl, left, footerY + 4, bold.widthOfTextAtSize(trackLabel, 8.5), 12);
  const contact = [billing.phone, billing.upiId && `UPI: ${billing.upiId}`].filter(Boolean).join(" | ");
  if (contact) draw(contact, left, footerY - 8, 7.5, regular, muted);
  return new Blob([await document.save()], { type: "application/pdf" });
}

export async function downloadInvoicePdf(invoice, billing) {
  const blob = await createInvoicePdf(invoice, billing);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${invoice.number || "invoice"}.pdf`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function shareInvoicePdf(invoice, billing) {
  const blob = await createInvoicePdf(invoice, billing);
  const file = new File([blob], `${invoice.number || "invoice"}.pdf`, { type: "application/pdf" });
  const trackingUrl = invoice.sourceOrderId ? `${window.location.origin}/orders?order=${encodeURIComponent(invoice.sourceOrderId)}` : window.location.origin;
  const shareData = { title: `${billing.businessName || "Prem Power Laundry"} ${invoice.number}`, text: `Invoice ${invoice.number} - ${money(invoice.total)}. Track: ${trackingUrl}`, files: [file] };
  if (navigator.canShare?.({ files: [file] })) return navigator.share(shareData);
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(shareData.text)}`;
  window.open(whatsapp, "_blank", "noopener,noreferrer");
}
