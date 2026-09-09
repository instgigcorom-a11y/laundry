import { createContext, useEffect, useState } from "react";
import { authService } from "../services/authService";
export const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); const [loading, setLoading] = useState(true);
  useEffect(() => { authService.me().then(({ user: next }) => setUser(next)).catch(() => localStorage.removeItem("ppl_token")).finally(() => setLoading(false)); }, []);
  async function login(data) { const result = await authService.login(data); localStorage.setItem("ppl_token", result.token); setUser(result.user); return result.user; }
  async function register(data) { const result = await authService.register(data); localStorage.setItem("ppl_token", result.token); setUser(result.user); return result.user; }
  async function forgotPassword(data) { const result = await authService.forgotPassword(data); localStorage.setItem("ppl_token", result.token); setUser(result.user); return result.user; }
  async function changePassword(currentPassword, password) { const result = await authService.changePassword(currentPassword, password); localStorage.setItem("ppl_token", result.token); setUser(result.user); return result.user; }
  async function logout() { try { await authService.logout(); } finally { localStorage.removeItem("ppl_token"); setUser(null); } }
  return <AuthContext.Provider value={{ user, loading, login, register, forgotPassword, changePassword, logout }}>{children}</AuthContext.Provider>;
}
