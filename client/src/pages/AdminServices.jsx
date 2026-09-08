import { useEffect, useRef, useState } from "react";
import { Button, Field, Status } from "../components/common";
import { shopService } from "../services/shopService";

const blankService = {
  name: "", baseName: "", service: "", category: "everyday", categoryLabel: "Everyday laundry",
  description: "", price: "", unit: "pc", readyDays: 3, gstRate: 0, hsnSacCode: "", icon: "",
  from: false, active: true, sortOrder: 0
};

function queryString({ search, status, category, page }) {
  const query = new URLSearchParams({ page: String(page), limit: "20", status });
  if (search.trim()) query.set("search", search.trim());
  if (category) query.set("category", category);
  return query.toString();
}

export function AdminServices() {
  const [services, setServices] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const editorRef = useRef(null);

  useEffect(() => {
    if (!form) return undefined;
    const frame = window.requestAnimationFrame(() => {
      editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      editorRef.current?.querySelector("input, select, textarea")?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [form?.id || (form ? "new" : "")]);

  async function reload() {
    setLoading(true); setError("");
    try {
      const result = await shopService.services(queryString({ search, status, category, page }));
      setServices(result.items || []); setPagination(result.pagination || { page: 1, pages: 1, total: 0 });
    } catch (err) { setError(err.message || "Could not load services."); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void reload(); }, 250);
    return () => window.clearTimeout(timer);
  }, [search, status, category, page]);

  function update(key, value) { setForm((current) => ({ ...current, [key]: value })); }
  async function save(event) {
    event.preventDefault(); setSaving(true); setError("");
    try { await shopService.saveService(form); setForm(null); await reload(); }
    catch (err) { setError(err.message || "Could not save the service."); }
    finally { setSaving(false); }
  }
  async function toggle(service) {
    try { await shopService.updateServiceStatus(service.id, !service.active); await reload(); }
    catch (err) { setError(err.message || "Could not update service status."); }
  }
  async function remove(service) {
    if (!window.confirm(`Remove ${service.name}? Services used on invoices will be safely disabled instead.`)) return;
    try { await shopService.deleteService(service.id); await reload(); }
    catch (err) { setError(err.message || "Could not remove the service."); }
  }
  const categories = [...new Set(services.map((service) => service.category).filter(Boolean))];
  const groupedServices = services.reduce((groups, service) => {
    const key = service.category || "other";
    if (!groups[key]) groups[key] = { label: service.categoryLabel || key.replace(/[-_]/g, " "), items: [] };
    groups[key].items.push(service);
    return groups;
  }, {});

  return <section className="admin-page admin-services">
    <div className="title-row"><div><p className="eyebrow">Service catalogue</p><h1>Services</h1><p className="admin-hint">Only active services appear in the customer booking flow.</p></div><Button onClick={() => setForm({ ...blankService })}>New service</Button></div>
    <div className="service-toolbar card">
      <label>Search<input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Name, category, service..." /></label>
      <label>Status<select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="all">All services</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
      <label>Category<select value={category} onChange={(event) => { setCategory(event.target.value); setPage(1); }}><option value="">All categories</option>{categories.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
    </div>
    {form && <form className="card service-form" ref={editorRef} onSubmit={save}>
      <div className="title-row"><h2>{form.id ? "Edit service" : "Create service"}</h2><button type="button" className="text-button" onClick={() => setForm(null)}>Close</button></div>
      <div className="service-form-grid">
        <Field label="Service name" value={form.name} onChange={(event) => update("name", event.target.value)} required />
        <Field label="Garment / base name" value={form.baseName} onChange={(event) => update("baseName", event.target.value)} placeholder="e.g. Shirt / T-shirt" />
        <Field label="Service label" value={form.service} onChange={(event) => update("service", event.target.value)} placeholder="e.g. Dry clean" />
        <Field label="Category key" value={form.category} onChange={(event) => update("category", event.target.value)} required />
        <Field label="Category display name" value={form.categoryLabel} onChange={(event) => update("categoryLabel", event.target.value)} />
        <Field label="Price (Rs)" type="number" min="0" step="0.01" value={form.price} onChange={(event) => update("price", event.target.value)} required />
        <Field label="Unit" value={form.unit} onChange={(event) => update("unit", event.target.value)} required />
        <Field label="Ready in days" type="number" min="1" max="30" value={form.readyDays} onChange={(event) => update("readyDays", event.target.value)} />
        <Field label="GST rate (%)" type="number" min="0" max="100" value={form.gstRate} onChange={(event) => update("gstRate", event.target.value)} />
        <Field label="HSN / SAC code" value={form.hsnSacCode} onChange={(event) => update("hsnSacCode", event.target.value)} />
        <Field label="Icon / image reference" value={form.icon} onChange={(event) => update("icon", event.target.value)} placeholder="Optional icon name" />
        <Field label="Display order" type="number" min="0" value={form.sortOrder} onChange={(event) => update("sortOrder", event.target.value)} />
      </div>
      <label className="service-description">Description<textarea value={form.description} onChange={(event) => update("description", event.target.value)} placeholder="Short customer-facing description" /></label>
      <div className="service-checks"><label><input type="checkbox" checked={!!form.from} onChange={(event) => update("from", event.target.checked)} /> Price starts from this amount</label><label><input type="checkbox" checked={!!form.active} onChange={(event) => update("active", event.target.checked)} /> Active in booking</label></div>
      <div className="actions"><Button loading={saving}>Save service</Button><Button type="button" onClick={() => setForm(null)}>Cancel</Button></div>
    </form>}
    <Status loading={loading} error={error} empty={!loading && !error && !services.length ? "No matching services." : ""}>
      <div className="service-category-list">{Object.entries(groupedServices).map(([key, group]) => <section className="service-category card" key={key}><header className="service-category-head"><div><p>Category</p><h2>{group.label}</h2></div><span>{group.items.length} {group.items.length === 1 ? "service" : "services"}</span></header><div className="service-table"><div className="service-table-head"><span>Service</span><span>Ready in</span><span>Rate</span><span>Status</span><span>Actions</span></div>{group.items.map((service) => <article key={service.id} className="service-table-row"><div><strong>{service.name}</strong><small>{service.service || service.description || "Laundry service"}</small></div><div><span>{service.readyDays || 3} days</span><small>turnaround</small></div><div><b>Rs {Number(service.price || 0).toFixed(0)}{service.from ? "+" : ""}</b><small>/{service.unit}</small></div><button className={`status-badge ${service.active ? "on" : "off"}`} onClick={() => toggle(service)}>{service.active ? "Active" : "Inactive"}</button><div className="actions"><button className="text-button" onClick={() => setForm({ ...service })}>Edit</button><button className="text-button danger" onClick={() => remove(service)}>Remove</button></div></article>)}</div></section>)}</div>
      <div className="service-pagination"><span>{pagination.total} services</span><div><Button disabled={pagination.page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</Button><span>Page {pagination.page} of {pagination.pages}</span><Button disabled={pagination.page >= pagination.pages} onClick={() => setPage((current) => current + 1)}>Next</Button></div></div>
    </Status>
  </section>;
}
