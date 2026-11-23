"use strict";
function clampNumber(value, min, max, fallback = 0) { const n = Number(value); return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback; }
function orderPaymentAmounts(order) {
  const total = Number(order.total) || 0;
  const requested = clampNumber(order.advanceAmount, 0, total);
  // Older orders stored the recorded advance directly on advanceAmount.
  const advanceReceived = clampNumber(order.verifiedAdvanceAmount ?? requested, 0, total);
  const paidAmount = order.paymentStatus === "paid" ? total : advanceReceived;
  const balance = Math.round((total - paidAmount) * 100) / 100;
  return { advanceReceived, paidAmount, balance, paymentDue: advanceReceived === 0 && requested > 0 ? Math.min(requested, balance) : balance };
}
function sanitiseLine(line) {
  const l = line || {};
  return { name: String(l.name || "").slice(0,120), meta: String(l.meta || "").slice(0,120), unit: String(l.unit || "").slice(0,40), qty: clampNumber(l.qty,0,999,0), price: clampNumber(l.price,0,1e7,0) };
}
function sanitiseInvoice(inv, fallbackLines) {
  const x = inv || {}; const lines = Array.isArray(x.lines) && x.lines.length ? x.lines.slice(0,200).map(sanitiseLine) : (fallbackLines || []);
  return { no: String(x.no || "").slice(0,40), date: Number(x.date) || Date.now(), name: String(x.name || "").slice(0,80), phone: String(x.phone || "").replace(/\D+/g,"").slice(0,12), email: String(x.email || "").slice(0,160), addr: String(x.addr || "").slice(0,400), lines, fee: clampNumber(x.fee,0,1e6,0), drop: clampNumber(x.drop,0,1e6,0), gstPct: clampNumber(x.gstPct,0,100,0), adjust: clampNumber(x.adjust,-1e6,1e6,0), adjustNote: String(x.adjustNote || "").slice(0,200), paid: !!x.paid, note: String(x.note || "").slice(0,500) };
}
function orderToClient(order) {
  const o = typeof order.toObject === "function" ? order.toObject() : order;
  return { id:o.id, token:o.token, createdAt:o.createdAtMs, items:o.items||[], total:o.total||0, mode:o.mode||"pickup", dateLabel:o.dateLabel||"", slot:o.slot||"", readyBy:o.readyBy||"", addrText:o.addrText||"", deliveryAddress:o.deliveryAddress||{}, paidVia:o.paidVia||"", advanceAmount:o.advanceAmount||0, ...orderPaymentAmounts(o), gst:o.gst||{}, paymentStatus:o.paymentStatus||"pending", status:o.status||"pending", invoice:o.invoice||{} };
}
module.exports = { clampNumber, sanitiseLine, sanitiseInvoice, orderToClient, orderPaymentAmounts };
