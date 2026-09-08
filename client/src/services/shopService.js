import { api } from "./api";

export const shopService = {
  products: () => api("/api/services/public"),
  orders: () => api("/api/orders"), order: (id) => api(`/api/orders/${id}`),
  createOrder: (booking) => api("/api/orders", { method: "POST", body: JSON.stringify(booking) }),
  payment: (id) => api(`/api/payments/${id}`), submitUpiPayment: (id) => api(`/api/payments/${id}/submit`, { method: "POST", body: JSON.stringify({}) }),
  dashboard: () => api("/api/admin/dashboard"), users: () => api("/api/admin/users"),
  adminOrders: () => api("/api/admin/orders"), orderInvoice: (id) => api(`/api/admin/orders/${id}/invoice`), updateOrder: (id, data) => api(`/api/admin/orders/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  billingSettings: () => api("/api/admin/billing-settings"), saveBillingSettings: (settings) => api("/api/admin/billing-settings", { method: "PUT", body: JSON.stringify({ settings }) }),
  adminItems: () => api("/api/admin/items"), saveItem: (item) => api(item.id ? `/api/admin/items/${item.id}` : "/api/admin/items", { method: item.id ? "PUT" : "POST", body: JSON.stringify({ item }) }), deleteItem: (id) => api(`/api/admin/items/${id}`, { method: "DELETE" }),
  services: (query = "") => api(`/api/admin/services${query ? `?${query}` : ""}`),
  saveService: (service) => api(service.id ? `/api/admin/services/${service.id}` : "/api/admin/services", { method: service.id ? "PUT" : "POST", body: JSON.stringify({ item: service }) }),
  updateServiceStatus: (id, active) => api(`/api/admin/services/${id}/status`, { method: "PATCH", body: JSON.stringify({ active }) }),
  updateServiceOrder: (id, sortOrder) => api(`/api/admin/services/${id}/order`, { method: "PATCH", body: JSON.stringify({ sortOrder }) }),
  deleteService: (id) => api(`/api/admin/services/${id}`, { method: "DELETE" }),
  customers: () => api("/api/admin/customers"), saveCustomer: (customer) => api(customer.id ? `/api/admin/customers/${customer.id}` : "/api/admin/customers", { method: customer.id ? "PUT" : "POST", body: JSON.stringify({ customer }) }), deleteCustomer: (id) => api(`/api/admin/customers/${id}`, { method: "DELETE" }),
  invoices: () => api("/api/admin/invoices"), saveInvoice: (invoice) => api(invoice.id ? `/api/admin/invoices/${invoice.id}` : "/api/admin/invoices", { method: invoice.id ? "PUT" : "POST", body: JSON.stringify({ invoice }) }), deleteInvoice: (id) => api(`/api/admin/invoices/${id}`, { method: "DELETE" })
};
