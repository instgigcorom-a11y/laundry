import { useEffect, useRef, useState } from "react";
import { Button, Field, Status } from "../components/common";
import { shopService } from "../services/shopService";
import { showToast } from "../utils/toast";

const blankService = {
  name: "", baseName: "", service: "", category: "laundry", categoryLabel: "Laundry",
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
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [newCategory, setNewCategory] = useState("");
  const [categorySaving, setCategorySaving] = useState(false);
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
      const [result, categoryData] = await Promise.all([shopService.services(queryString({ search, status, category, page })), shopService.serviceCategories()]);
      setServices(result.items || []); setPagination(result.pagination || { page: 1, pages: 1, total: 0 });
      setCategoryOptions(categoryData.categories || []);
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
  async function addCategory(event) {
    event.preventDefault();
    const name = newCategory.trim();
    if (!name) return;
    setCategorySaving(true);
    try { const result = await shopService.createServiceCategory(name); setCategoryOptions(result.categories || []); setNewCategory(""); showToast("Service category created."); }
    catch (err) { showToast(err.message || "Could not create category.", "error"); }
    finally { setCategorySaving(false); }
  }
  const categories = [...new Map([
    ...categoryOptions,
    ...services.map((service) => ({ key: service.category || "other", label: service.categoryLabel || "Other" }))
  ].map((entry) => [entry.key, entry])).values()];
  const groupedServices = services.reduce((groups, service) => {
    const key = service.category || "other";
    if (!groups[key]) groups[key] = { label: service.categoryLabel || key.replace(/[-_]/g, " "), items: [] };
    groups[key].items.push(service);
    return groups;
  }, {});

  return <section className="admin-page admin-services">
    <div className="title-row"><div><p className="eyebrow">Service catalogue</p><h1>Services</h1><p className="admin-hint">Only active services appear in the customer booking flow.</p></div><Button onClick={() => setForm({ ...blankService })}>New service</Button></div>
    <section className="service-controls card" aria-labelledby="service-filter-title">
      <div className="service-controls-head">
        <div>
          <span className="service-controls-kicker">Service directory</span>
          <h2 id="service-filter-title">Search and filter</h2>
          <p>Quickly find a service by its name, type, or category.</p>
        </div>
        {(search || status !== "all" || category) && <button type="button" className="service-clear-filters" onClick={() => { setSearch(""); setStatus("all"); setCategory(""); setPage(1); }}>Clear filters</button>}
      </div>
      <div className="service-toolbar">
        <label className="service-search-field">
          <span>Search services</span>
          <div className="service-input-shell service-search-shell"><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search by name or category" /></div>
        </label>
        <label>
          <span>Status</span>
          <div className="service-select-shell"><select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="all">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
        </label>
        <label>
          <span>Category</span>
          <div className="service-select-shell"><select value={category} onChange={(event) => { setCategory(event.target.value); setPage(1); }}><option value="">All categories</option>{categories.map((entry) => <option key={entry.key} value={entry.key}>{entry.label}</option>)}</select></div>
        </label>
      </div>
    </section>
    <form className="category-creator card" onSubmit={addCategory}>
      <div className="category-creator-copy"><span className="service-controls-kicker">Categories</span><b>Create a new category</b><small>Add it once, then select it on any service.</small></div>
      <label className="category-name-field"><span>Category name</span><input value={newCategory} onChange={(event) => setNewCategory(event.target.value)} placeholder="For example, Curtains & carpets" maxLength={80} required /></label>
      <Button loading={categorySaving} disabled={categorySaving || !newCategory.trim()}>Create category</Button>
    </form>
    {form && <form className="card service-form" ref={editorRef} onSubmit={save}>
      <div className="title-row"><h2>{form.id ? "Edit service" : "Create service"}</h2><button type="button" className="text-button" onClick={() => setForm(null)}>Close</button></div>
      <div className="service-form-grid">
        <Field label="Service name" value={form.name} onChange={(event) => update("name", event.target.value)} required />
        <Field label="Garment / base name" value={form.baseName} onChange={(event) => update("baseName", event.target.value)} placeholder="e.g. Shirt / T-shirt" />
        <Field label="Service label" value={form.service} onChange={(event) => update("service", event.target.value)} placeholder="e.g. Dry clean" />
        <label className="field"><span>Category</span><select required value={form.category} onChange={(event) => { const selected = categories.find((entry) => entry.key === event.target.value); setForm((current) => ({ ...current, category: selected?.key || "", categoryLabel: selected?.label || "" })); }}><option value="">Select category</option>{categories.map((entry) => <option key={entry.key} value={entry.key}>{entry.label}</option>)}</select></label>
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
