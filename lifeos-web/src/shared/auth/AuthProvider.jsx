import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiFetch } from "../api/http";
import { endpoints } from "../api/endpoints";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);

  async function refresh() {
    try {
      const data = await apiFetch(endpoints.me);
      setUser(data?.user ?? null);
    } catch {
      setUser(null);
    } finally {
      setBooting(false);
    }
  }

  async function logout() {
    await apiFetch(endpoints.logout, { method: "POST" });
    setUser(null);
  }

  useEffect(() => { refresh(); }, []);

  const value = useMemo(() => ({ user, booting, refresh, logout }), [user, booting]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}