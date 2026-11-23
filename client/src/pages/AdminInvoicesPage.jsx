import '../app.css';
import { useEffect, useRef, useState } from "react";
import { Button, Field, Status } from "../components/common";
import { shopService } from "../services/shopService";
import { showToast } from "../utils/toast";
import { downloadInvoicePdf, shareInvoicePng } from "../utils/invoicePdf";

const money = (value) => `Rs ${Number(value || 0).toFixed(2)}`;
const dateValue = (value) => new Date(value || Date.now()).toISOString().slice(0, 10);
const blankLine = () => ({ itemId: "", name: "", unit: "pcs", qty: 1, price: 0, note: "" });
const blankInvoice = (settings = {}) => ({ customerId: "", invoiceDate: dateValue(), lines: [blankLine()], garmentCount: 1, discount: 0, deliveryCharge: Number(settings.pickupFee || 0), extraCharge: 0, extraChargeLabel: "", gstPct: Number(settings.gstPct || 0), adjustment: 0, paid: false, paidAmount: 0, note: settings.defaultInvoiceNotes || "", terms: settings.defaultInvoiceTerms || "" });
const extraLabel = (invoice) => invoice.extraChargeLabel ? `Additional - ${invoice.extraChargeLabel}` : "Additional charges";

function estimatedInvoiceTotal(form) {
  const subtotal = (form?.lines || []).reduce((sum, line) => sum + Number(line.qty || 0) * Number(line.price || 0), 0);
  const taxable = Math.max(0, subtotal - Number(form?.discount || 0) + Number(form?.deliveryCharge || 0) + Number(form?.extraCharge || 0));
  return Math.round((taxable * (1 + Number(form?.gstPct || 0) / 100) + Number(form?.adjustment || 0)) * 100) / 100;
}

function printTag(invoice) {
  const clothNames = [...new Set((invoice.lines || []).map((line) => line.name).filter(Boolean))].join(", ");
  const escape = (value) => String(value == null ? "" : value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  const html = `<!doctype html><html><head><title>Tag ${escape(invoice.number)}</title><style>@page{size:100mm 70mm;margin:4mm}body{font-family:Arial,sans-serif;margin:0;color:#111}.tag{border:2px solid #111;border-radius:3mm;padding:5mm}.invoice{font-size:18pt;font-weight:900;border-bottom:1px solid #111;padding-bottom:3mm}.customer{font-size:13pt;font-weight:800;margin-top:3mm}.quantity{font-size:11pt;margin-top:2mm}.cloth{font-size:11pt;margin-top:2mm;font-weight:700} @media print{body{width:92mm}}</style></head><body><main class="tag"><div class="invoice">${escape(invoice.number)}</div><div class="customer">${escape(invoice.customer?.name || "Customer")}</div><div class="quantity">Total quantity: ${Number(invoice.garmentCount || (invoice.lines || []).reduce((sum, line) => sum + Number(line.qty || 0), 0))}</div><div class="cloth">${escape(clothNames || "Clothes")}</div></main><script>window.onload=()=>setTimeout(()=>window.print(),200)</script></body></html>`;
  const printWindow = window.open("", "_blank");
  if (!printWindow) return showToast("Please allow pop-ups to print the tag.", "error");
  printWindow.document.write(html);
  printWindow.document.close();
}

function InvoicePreview({ invoice, billing, close }) {
  async function act(type) {
    try { if (type === "share") await shareInvoicePng(invoice, billing); else await downloadInvoicePdf(invoice, billing); }
    catch (error) { if (error.name !== "AbortError") showToast(error.message || "Could not prepare invoice.", "error"); }
  }
  return <section className="invoice-preview card"><div className="title-row"><div><p className="eyebrow">{billing.businessName || "Prem Power Laundry"}</p><h2>{invoice.number}</h2><small>{billing.businessAddress} | {billing.phone}</small></div><div className="actions"><Button onClick={() => printTag(invoice)}>Print Tag</Button><Button onClick={() => void act("download")}>Download PDF</Button><Button onClick={() => void act("share")}>Share invoice</Button><Button onClick={close}>Close</Button></div></div><p><b>Bill to</b>{invoice.customer?.name || "Customer"}<br /><small>{invoice.customer?.address || invoice.customer?.phone || invoice.customer?.email || "No contact"}</small>{invoice.customer?.gstin && <><br /><small>GSTIN: {invoice.customer.gstin}</small></>}<br /><small>Total garments: {Number(invoice.garmentCount || 0)}</small></p><div className="invoice-preview-lines">{invoice.lines.map((line, index) => <div key={index}><span>{line.name}{line.note && <small className="invoice-line-description">{line.note}</small>}<small>{line.qty} {line.unit} x {money(line.price)}</small></span><b>{money(line.amount)}</b></div>)}</div><div className="invoice-preview-total"><span>Subtotal <b>{money(invoice.subtotal)}</b></span>{Number(invoice.discount) > 0 && <span>Discount <b>-{money(invoice.discount)}</b></span>}{Number(invoice.deliveryCharge) > 0 && <span>Pickup & delivery <b>{money(invoice.deliveryCharge)}</b></span>}{Number(invoice.extraCharge) > 0 && <span>{extraLabel(invoice)} <b>{money(invoice.extraCharge)}</b></span>}{Number(invoice.gstAmount) > 0 && <span>GST <b>{money(invoice.gstAmount)}</b></span>}<strong>Total <b>{money(invoice.total)}</b></strong>{Number(invoice.paidAmount) > 0 && <span>Advance received <b>{money(invoice.paidAmount)}</b></span>}<span>Balance due <b>{money(Math.max(0, Number(invoice.total || 0) - Number(invoice.paidAmount || 0)))}</b></span></div><p className="admin-hint">{invoice.paid ? "Payment received" : invoice.paidAmount > 0 ? "Advance received - payment pending" : "Payment pending"}{invoice.note ? ` | ${invoice.note}` : ""}</p></section>;
}

export function AdminInvoicesPage() {
  const [invoices, setInvoices] = useState([]); const [customers, setCustomers] = useState([]); const [items, setItems] = useState([]); const [billing, setBilling] = useState({});
  const [form, setForm] = useState(null); const [preview, setPreview] = useState(null); const [search, setSearch] = useState(""); const [error, setError] = useState(""); const [working, setWorking] = useState(false);
  const [partySearch, setPartySearch] = useState("");
  const [itemSearch, setItemSearch] = useState({});
  const editor = useRef(null);
  async function reload() { try { const [a, b, c, d] = await Promise.all([shopService.invoices(), shopService.customers(), shopService.adminItems(), shopService.billingSettings()]); setInvoices(a.invoices || []); setCustomers(b.customers || []); setItems(c.items || []); setBilling(d.settings || {}); } catch (err) { setError(err.message); } }
  useEffect(() => { void reload(); }, []);
  useEffect(() => { if (form) { const customer = customers.find((entry) => entry.id === form.customerId); setPartySearch(customer ? `${customer.name}${customer.phone ? ` (${customer.phone})` : ""}` : ""); window.requestAnimationFrame(() => editor.current?.scrollIntoView({ behavior: "smooth", block: "start" })); } }, [form?.id, !!form]);
  function changeLine(index, patch) { setForm((current) => ({ ...current, lines: current.lines.map((line, i) => i === index ? { ...line, ...patch } : line) })); }
  function selectItem(index, id) { const item = items.find((entry) => entry.id === id); changeLine(index, item ? { itemId: id, name: item.name, unit: item.unit, price: item.price, note: item.description || item.service || "" } : { itemId: "" }); }
  async function save(event) {
    event.preventDefault(); setWorking(true); setError("");
    const invoice = { ...form, invoiceDate: new Date(form.invoiceDate).getTime(), lines: form.lines.map((line) => ({ ...line, qty: Number(line.qty), price: Number(line.price) })), garmentCount: Number(form.garmentCount || 0), discount: Number(form.discount || 0), deliveryCharge: Number(form.deliveryCharge || 0), extraCharge: Number(form.extraCharge || 0), extraChargeLabel: String(form.extraChargeLabel || "").trim(), gstPct: Number(form.gstPct || 0), adjustment: Number(form.adjustment || 0), paidAmount: Number(form.paidAmount || 0) };
    try { const result = await shopService.saveInvoice(invoice); setForm(null); setPreview(result.invoice); await reload(); showToast(invoice.id ? "Invoice updated." : "Invoice created."); }
    catch (err) { setError(err.message); showToast(err.message || "Could not save invoice.", "error"); }
    finally { setWorking(false); }
  }
  async function remove(invoice) { if (!window.confirm(`Delete invoice ${invoice.number}?`)) return; try { await shopService.deleteInvoice(invoice.id); await reload(); showToast("Invoice deleted."); } catch (err) { showToast(err.message, "error"); } }
  async function act(invoice, type) { try { if (type === "share") await shareInvoicePng(invoice, billing); else await downloadInvoicePdf(invoice, billing); } catch (error) { if (error.name !== "AbortError") showToast(error.message, "error"); } }
  const visible = invoices.filter((invoice) => [
    invoice.number,
    invoice.customer?.name,
    invoice.customer?.phone,
    invoice.customer?.email,
    new Date(invoice.invoiceDate).toLocaleDateString("en-IN"),
    Number(invoice.total || 0).toFixed(2),
    invoice.paid ? "paid" : "unpaid",
  ].join(" ").toLowerCase().includes(search.trim().toLowerCase()));
  return <section className="admin-page invoice-admin-page">
    <div className="title-row invoice-page-heading">
      <div><p className="eyebrow">Billing</p><h1>Invoices</h1><p className="admin-hint">Automatic order invoices and manual walk-in billing in one place.</p></div>
      <Button onClick={() => { setPreview(null); setForm(blankInvoice(billing)); }}>Create invoice</Button>
    </div>
    <section className="invoice-search card" aria-label="Invoice search">
      <div className="invoice-search-heading">
        <div><span className="invoice-search-kicker">Find an invoice</span><h2>Search invoices</h2></div>
        <span className="invoice-result-count" aria-live="polite">{visible.length} of {invoices.length}</span>
      </div>
      <label className="invoice-search-field">
        <span>Search by invoice, customer or status</span>
        <div className="invoice-search-input">
          <input
            type="search"
            aria-label="Search invoices"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Escape") setSearch(""); }}
            placeholder="Invoice number, name, phone, paid or unpaid"
            autoComplete="off"
          />
          {search && <button type="button" className="invoice-search-clear" onClick={() => setSearch("")}>Clear</button>}
        </div>
      </label>
    </section>
    {preview && <InvoicePreview invoice={preview} billing={billing} close={() => setPreview(null)} />}
    {form && <form ref={editor} className="invoice-editor card" onSubmit={save}>
      <div className="title-row"><h2>{form.id ? `Edit ${form.number}` : "New manual invoice"}</h2><div className="actions"><Button type="button" onClick={() => printTag(form)}>Print Tag</Button><button type="button" className="text-button" onClick={() => setForm(null)}>Close</button></div></div>
<div className="grid"><label className="field"><span>Search & select party</span><input list="invoice-party-list" placeholder="Search name or phone" value={partySearch} onChange={(event) => { const value = event.target.value; setPartySearch(value); const match = customers.find((entry) => `${entry.name}${entry.phone ? ` (${entry.phone})` : ""}`.toLowerCase() === value.trim().toLowerCase()); setForm((current) => ({ ...current, customerId: match?.id || "", gstin: match?.gstin || "", gstName: match?.gstName || "", gstAddress: match?.gstAddress || "" })); }} /><datalist id="invoice-party-list">{customers.filter((entry) => entry.active).map((entry) => <option key={entry.id} value={`${entry.name}${entry.phone ? ` (${entry.phone})` : ""}`} />)}</datalist></label><Field label="Invoice date" type="date" value={dateValue(form.invoiceDate)} onChange={(event) => setForm({ ...form, invoiceDate: event.target.value })} required /><Field label="Total garments / items" type="number" min="0" step="any" value={form.garmentCount} onChange={(event) => setForm({ ...form, garmentCount: event.target.value })} /></div>{!form.customerId && partySearch && <p className="error">Select a matching party from the suggestions.</p>}<div className="invoice-lines"><div className="invoice-line-head"><b>Item</b><b>Qty</b><b>Rate</b><span /></div>{form.lines.map((line, index) => <div className="invoice-line-edit" key={index}><div><input list={`invoice-item-list-${index}`} aria-label="Search item" placeholder="Search catalog item or custom item" value={itemSearch[index] ?? (line.itemId ? items.find((item) => item.id === line.itemId)?.name || line.name : line.name)} onChange={(event) => { const value = event.target.value; setItemSearch((current) => ({ ...current, [index]: value })); const match = items.find((item) => item.name.toLowerCase() === value.trim().toLowerCase()); if (match) selectItem(index, match.id); else changeLine(index, { itemId: "", name: value }); }} /><datalist id={`invoice-item-list-${index}`}>{items.map((item) => <option key={item.id} value={item.name}>{money(item.price)} / {item.unit}</option>)}</datalist><input aria-label="Item name" required value={line.name} placeholder="Item name" onChange={(event) => changeLine(index, { name: event.target.value })} /><input className="invoice-line-note-input" aria-label="Item description" value={line.note || ""} placeholder="Description shown on invoice" onChange={(event) => changeLine(index, { note: event.target.value })} /></div><input aria-label="Quantity" type="number" min="0.001" step="any" value={line.qty} onChange={(event) => changeLine(index, { qty: event.target.value })} /><input aria-label="Rate" type="number" min="0" step="any" value={line.price} onChange={(event) => changeLine(index, { price: event.target.value })} /><button className="line-remove" type="button" disabled={form.lines.length === 1} onClick={() => setForm({ ...form, lines: form.lines.filter((_, i) => i !== index) })}>Remove</button></div>)}</div><Button type="button" onClick={() => setForm({ ...form, lines: [...form.lines, blankLine()] })}>Add line</Button><div className="grid"><Field label="Discount" type="number" min="0" step="any" value={form.discount} onChange={(event) => setForm({ ...form, discount: event.target.value })} /><Field label="Pickup / delivery charge" type="number" min="0" step="any" value={form.deliveryCharge} onChange={(event) => setForm({ ...form, deliveryCharge: event.target.value })} /><Field label="Additional charges" type="number" min="0" step="any" value={form.extraCharge} onChange={(event) => setForm({ ...form, extraCharge: event.target.value })} /><Field label="Additional charge description" required={Number(form.extraCharge) > 0} value={form.extraChargeLabel || ""} placeholder="e.g. Stain treatment" onChange={(event) => setForm({ ...form, extraChargeLabel: event.target.value })} /><Field label="GST %" type="number" min="0" max="100" step="any" value={form.gstPct} onChange={(event) => setForm({ ...form, gstPct: event.target.value })} /><Field label="Adjustment" type="number" step="any" value={form.adjustment} onChange={(event) => setForm({ ...form, adjustment: event.target.value })} /></div><Field label="Note" value={form.note || ""} onChange={(event) => setForm({ ...form, note: event.target.value })} /><Field label="Terms and conditions" value={form.terms || ""} onChange={(event) => setForm({ ...form, terms: event.target.value })} /><div className="grid"><Field label="GSTIN (optional)" value={form.gstin || ""} maxLength="15" placeholder="22AAAAA0000A1Z5" onChange={(event) => setForm({ ...form, gstin: event.target.value.toUpperCase() })} /><Field label="GST customer / business name" value={form.gstName || ""} maxLength="120" onChange={(event) => setForm({ ...form, gstName: event.target.value })} /><Field label="GST billing address" value={form.gstAddress || ""} maxLength="400" onChange={(event) => setForm({ ...form, gstAddress: event.target.value })} /></div>
<section className="invoice-payment card"><div className="title-row"><h3>Payment status</h3><span className={`payment-live payment-${estimatedInvoiceTotal(form) <= Number(form.paidAmount || 0) ? "paid" : Number(form.paidAmount || 0) > 0 ? "partial" : "pending"}`}>{estimatedInvoiceTotal(form) <= Number(form.paidAmount || 0) ? "Paid" : Number(form.paidAmount || 0) > 0 ? "Advance / pending" : "Pending"}</span></div><Field label="Advance / amount received (Rs)" type="number" min="0" step="0.01" value={form.paidAmount || 0} onChange={(event) => setForm({ ...form, paidAmount: event.target.value, paid: Number(event.target.value) >= estimatedInvoiceTotal(form) && estimatedInvoiceTotal(form) > 0 })} /><div className="invoice-payment-balance"><span>Invoice total: <b>{money(estimatedInvoiceTotal(form))}</b></span><span>Balance due: <b>{money(Math.max(0, estimatedInvoiceTotal(form) - Number(form.paidAmount || 0)))}</b></span></div><div className="actions"><Button type="button" onClick={() => setForm({ ...form, paidAmount: estimatedInvoiceTotal(form), paid: true })}>Mark paid</Button><Button type="button" onClick={() => setForm({ ...form, paidAmount: 0, paid: false })}>Mark pending</Button></div></section>
<div className="actions"><Button loading={working}>Save invoice</Button><Button type="button" onClick={() => setForm(null)}>Cancel</Button></div></form>}<Status error={error} empty={!error && !visible.length ? "No matching invoices." : ""}><div className="list">{visible.map((invoice) => <article className="line invoice-row" key={invoice.id}><div><strong>{invoice.number}</strong>{invoice.sourceOrderId && <span className="auto-tag">Order invoice</span>}<small>{invoice.customer?.name || "Deleted party"} | {new Date(invoice.invoiceDate).toLocaleDateString("en-IN")} | {invoice.paid ? "Paid" : "Unpaid"}</small></div><strong>{money(invoice.total)}</strong><div className="actions"><Button onClick={() => { setForm(null); setPreview(invoice); }}>View</Button><Button onClick={() => void act(invoice, "download")}>Download</Button><Button onClick={() => void act(invoice, "share")}>Share</Button>{!invoice.sourceOrderId && <Button onClick={() => { setPreview(null); setForm({ ...invoice, invoiceDate: dateValue(invoice.invoiceDate) }); }}>Edit</Button>}{!invoice.sourceOrderId && <Button onClick={() => void remove(invoice)}>Delete</Button>}</div></article>)}</div></Status></section>;
}
