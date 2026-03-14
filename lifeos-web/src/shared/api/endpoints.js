const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "";

export const endpoints = {
  signup: `${API_BASE}/api/auth/signup`,
  login: `${API_BASE}/api/auth/login`,
  forgotPassword: `${API_BASE}/api/auth/forgot-password`,
  resetPassword: `${API_BASE}/api/auth/reset-password`,
  me: `${API_BASE}/api/auth/me`,
  logout: `${API_BASE}/api/auth/logout`,
  google: `${API_BASE}/api/auth/google`,
};
