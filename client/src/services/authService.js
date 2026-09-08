import { api } from "./api";
export const authService = { register: (data) => api("/api/auth/register", { method: "POST", body: JSON.stringify(data) }), login: (data) => api("/api/auth/login", { method: "POST", body: JSON.stringify(data) }), me: () => api("/api/auth/me"), logout: () => api("/api/auth/logout", { method: "POST" }) };
