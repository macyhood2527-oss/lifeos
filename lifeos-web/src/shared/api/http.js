export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("lifeos_token");

  const res = await fetch(path, {
    ...options,
    credentials: "include", // can stay; not required anymore
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const err = new Error(data?.message || "Request failed");
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}
