import { api } from "./api";
export const authService = {
  register: (data) => api("/api/auth/register", { method: "POST", body: JSON.stringify(data) }),
  login: (data) => api("/api/auth/login", { method: "POST", body: JSON.stringify(data) }),
  forgotPassword: (data) => api("/api/auth/forgot-password", { method: "POST", body: JSON.stringify(data) }),
  changePassword: (currentPassword, password) => api("/api/auth/change-password", { method: "POST", body: JSON.stringify({ currentPassword, password }) }),
  me: () => api("/api/auth/me"),
  logout: () => api("/api/auth/logout", { method: "POST" })
};
