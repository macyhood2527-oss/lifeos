import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../shared/auth/AuthProvider";

export default function AuthCallbackPage() {
  const nav = useNavigate();
  const { refresh } = useAuth();

  useEffect(() => {
    // URL like: /auth/callback#token=xxxx
    const hash = window.location.hash || "";
    const params = new URLSearchParams(hash.replace(/^#/, ""));
    const token = params.get("token");

    if (token) {
      localStorage.setItem("lifeos_token", token);
    }

    // Clean hash (optional)
    window.history.replaceState({}, document.title, "/auth/callback");

    // refresh user then go home
    refresh().finally(() => nav("/", { replace: true }));
  }, []);

  return (
    <div style={{ padding: 24 }}>
      Logging you in…
    </div>
  );
}
