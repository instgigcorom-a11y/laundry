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

function canvasBlob(canvas) {
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Could not create the order image.")), "image/png", 1));
}

function canvasLines(context, value, width) {
  const words = clean(value).split(" ").filter(Boolean); const lines = []; let line = "";
  words.forEach((word) => { const next = line ? `${line} ${word}` : word; if (context.measureText(next).width <= width) line = next; else { if (line) lines.push(line); line = word; } });
  if (line) lines.push(line); return lines;
}

function invoiceShareText(invoice) {
  const orderNumber = clean(invoice.orderNumber || invoice.number || invoice.sourceOrderId || "N/A");
  return `Thank you for your order\nYour order number is: ${orderNumber}\nVisit our website: https://pplwash.in\nPhone: +91 8146099396`;
}

export async function createInvoicePng(invoice, billing = {}) {
  const canvas = document.createElement("canvas"); canvas.width = 1080; canvas.height = 1350;
  const ctx = canvas.getContext("2d"); const navy = "#073f72", sky = "#3b94d7", ink = "#172a3a", muted = "#687987";
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, 1080, 1350);
  ctx.fillStyle = "#edf7ff"; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(1080, 0); ctx.lineTo(1080, 95); ctx.quadraticCurveTo(650, 175, 0, 65); ctx.fill();
  ctx.fillStyle = navy; ctx.font = "800 38px Archivo, Arial"; ctx.fillText(billing.businessName || "Prem Power Laundry", 60, 105);
  ctx.fillStyle = sky; ctx.font = "700 16px Archivo, Arial"; ctx.fillText("CLEANER CLOTHES, BRIGHTER DAYS", 62, 135);
  ctx.textAlign = "right"; ctx.fillStyle = navy; ctx.font = "700 17px Archivo, Arial"; ctx.fillText("FRESH CARE EVERYDAY", 1020, 88); ctx.fillStyle = muted; ctx.fillText(billing.phone || "+91 81460 99396", 1020, 118); ctx.textAlign = "left";
  ctx.fillStyle = navy; ctx.fillRect(60, 180, 960, 88); ctx.fillStyle = "#fff"; ctx.font = "800 15px Archivo, Arial"; ctx.fillText("ORDER CONFIRMATION", 85, 215); ctx.font = "800 30px Archivo, Arial"; ctx.fillText(clean(invoice.number || "Invoice"), 85, 250);
  ctx.textAlign = "right"; ctx.font = "600 17px Archivo, Arial"; ctx.fillText(new Date(invoice.invoiceDate || Date.now()).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }), 995, 230); ctx.textAlign = "left";
  let y = 325; ctx.fillStyle = sky; ctx.font = "800 14px Archivo, Arial"; ctx.fillText("BILL TO", 65, y); ctx.fillStyle = ink; ctx.font = "800 24px Archivo, Arial"; ctx.fillText(clean(invoice.customer?.name || "Customer"), 65, y + 36);
  ctx.fillStyle = muted; ctx.font = "500 15px Archivo, Arial"; canvasLines(ctx, [invoice.customer?.phone, invoice.customer?.address].filter(Boolean).join(" | ") || "No contact details", 620).slice(0, 2).forEach((entry, index) => ctx.fillText(entry, 65, y + 64 + index * 22));
  ctx.textAlign = "right"; ctx.fillStyle = ink; ctx.font = "700 16px Archivo, Arial"; ctx.fillText(`Order: ${clean(invoice.orderNumber || invoice.number || invoice.sourceOrderId || "-")}`, 1015, y + 35); ctx.fillText(`Garments: ${Number(invoice.garmentCount || 0)}`, 1015, y + 63); ctx.textAlign = "left";
  y += 120; ctx.fillStyle = "#e9f3fb"; ctx.fillRect(60, y, 960, 42); ctx.fillStyle = navy; ctx.font = "800 14px Archivo, Arial"; ctx.fillText("ITEM / SERVICE", 80, y + 27); ctx.textAlign = "center"; ctx.fillText("QTY", 745, y + 27); ctx.fillText("RATE", 855, y + 27); ctx.textAlign = "right"; ctx.fillText("AMOUNT", 995, y + 27); ctx.textAlign = "left"; y += 58;
  (invoice.lines || []).slice(0, 12).forEach((item) => { const note = clean(item.note); const height = note ? 60 : 44; ctx.fillStyle = ink; ctx.font = "700 16px Archivo, Arial"; ctx.fillText(clean(item.name), 80, y + 13); if (note) { ctx.fillStyle = muted; ctx.font = "500 12px Archivo, Arial"; ctx.fillText(canvasLines(ctx, note, 570)[0] || "", 80, y + 35); } ctx.fillStyle = ink; ctx.font = "600 15px Archivo, Arial"; ctx.textAlign = "center"; ctx.fillText(String(item.qty), 745, y + 13); ctx.fillText(money(item.price), 855, y + 13); ctx.textAlign = "right"; ctx.fillText(money(item.amount), 995, y + 13); ctx.textAlign = "left"; ctx.strokeStyle = "#dce8f1"; ctx.beginPath(); ctx.moveTo(60, y + height - 7); ctx.lineTo(1020, y + height - 7); ctx.stroke(); y += height; });
  y += 14; const totals = [["Subtotal", invoice.subtotal], Number(invoice.discount) > 0 && ["Discount", -Number(invoice.discount)], Number(invoice.deliveryCharge) > 0 && ["Pickup & delivery", invoice.deliveryCharge], Number(invoice.extraCharge) > 0 && [invoice.extraChargeLabel || "Additional charges", invoice.extraCharge], Number(invoice.gstAmount) > 0 && [`GST (${Number(invoice.gstPct || 0)}%)`, invoice.gstAmount]].filter(Boolean);
  totals.forEach(([label, value]) => { ctx.fillStyle = muted; ctx.font = "600 15px Archivo, Arial"; ctx.fillText(label, 690, y); ctx.fillStyle = ink; ctx.textAlign = "right"; ctx.fillText(`${Number(value) < 0 ? "-" : ""}${money(Math.abs(Number(value)))}`, 995, y); ctx.textAlign = "left"; y += 27; });
  ctx.fillStyle = navy; ctx.fillRect(665, y + 4, 355, 58); ctx.fillStyle = "#fff"; ctx.font = "800 18px Archivo, Arial"; ctx.fillText("TOTAL", 690, y + 41); ctx.textAlign = "right"; ctx.font = "800 24px Archivo, Arial"; ctx.fillText(money(invoice.total), 995, y + 42); ctx.textAlign = "left";
  ctx.fillStyle = navy; ctx.font = "800 18px Archivo, Arial"; ctx.fillText(`Order number: ${clean(invoice.orderNumber || invoice.number || invoice.sourceOrderId || "-")}`, 65, 1190); ctx.fillStyle = muted; ctx.font = "500 15px Archivo, Arial"; ctx.fillText("Track your order at https://pplwash.in", 65, 1220); ctx.fillStyle = sky; ctx.font = "800 16px Archivo, Arial"; ctx.fillText("THANK YOU FOR CHOOSING PREM POWER LAUNDRY", 65, 1280);
  return canvasBlob(canvas);
}

export async function shareInvoicePng(invoice, billing) {
  const blob = await createInvoicePng(invoice, billing);
  const orderNumber = clean(invoice.orderNumber || invoice.number || invoice.sourceOrderId || "order");
  const file = new File([blob], `${orderNumber.replace(/[^a-z0-9_-]+/gi, "-")}.png`, { type: "image/png" });
  const text = invoiceShareText(invoice); const shareData = { title: `${billing.businessName || "Prem Power Laundry"} ${orderNumber}`, text, files: [file] };
  if (navigator.canShare?.({ files: [file] })) return navigator.share(shareData);
  const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = file.name; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  const recipient = String(invoice.customer?.phone || "").replace(/\D/g, "");
  window.open(`https://wa.me/${recipient}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
}
