const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

export const endpoints = {
  me: `${API_BASE}/api/auth/me`,
  logout: `${API_BASE}/api/auth/logout`,
  google: `${API_BASE}/api/auth/google`,
};
