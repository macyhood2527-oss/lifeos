export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("lifeos_token");

  // ✅ Use Railway backend in prod via Vercel env var:
  // VITE_API_URL="https://<your-railway-backend-domain>"
  const API_BASE = import.meta.env.VITE_API_URL || "";
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;

  const res = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  // ✅ Prevent "Unexpected token <" when server returns HTML
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text }; // HTML or non-JSON response
  }

  if (!res.ok) {
    const err = new Error(data?.message || `Request failed (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}
