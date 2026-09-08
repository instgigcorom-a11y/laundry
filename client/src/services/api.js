const API_URL = import.meta.env.VITE_API_URL || "";
export async function api(path, options = {}) {
  const token = localStorage.getItem("ppl_token");
  const response = await fetch(API_URL + path, { credentials: "include", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers }, ...options });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || "Something went wrong.");
  return body;
}
