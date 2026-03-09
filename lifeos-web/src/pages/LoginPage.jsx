// lifeos-web/src/pages/LoginPage.jsx
import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { endpoints } from "../shared/api/endpoints";
import { apiFetch } from "../shared/api/http";
import { useAuth } from "../shared/auth/useAuth";
import bgTile from "../assets/bg-tile.jpg";

export default function LoginPage() {
  const { user, booting } = useAuth();
  const [googleBusy, setGoogleBusy] = useState(false);
  const [emailBusy, setEmailBusy] = useState(false);
  const [mode, setMode] = useState("login");
  const [resetToken, setResetToken] = useState("");
  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
  });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // ✅ redirect AFTER render (avoid side effects during render)
  useEffect(() => {
    if (!booting && user) {
      window.location.replace("/");
    }
  }, [booting, user]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedMode = params.get("mode");
    const token = params.get("token");

    if (requestedMode === "reset" && token) {
      setMode("reset");
      setResetToken(token);
    }
  }, []);

  // While auth is booting, keep it calm
  const disabledGoogle = booting || googleBusy || emailBusy;
  const disabledEmail = booting || emailBusy || googleBusy;

  function onChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function onEmailSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    setEmailBusy(true);

    try {
      if (mode === "signup" || mode === "login") {
        if (mode === "signup") {
          if (form.password !== form.confirmPassword) {
            throw new Error("Passwords do not match.");
          }
          if (!/[A-Za-z]/.test(form.password) || !/[0-9]/.test(form.password)) {
            throw new Error("Password must include at least one letter and one number.");
          }
        }

        const payload = {
          email: form.email,
          password: form.password,
          ...(mode === "signup" && form.name.trim() ? { name: form.name.trim() } : {}),
        };

        const endpoint = mode === "signup" ? endpoints.signup : endpoints.login;
        const data = await apiFetch(endpoint, {
          method: "POST",
          body: JSON.stringify(payload),
        });

        if (data?.token) {
          localStorage.setItem("lifeos_token", data.token);
        }

        window.location.replace("/");
      }
      if (mode === "forgot") {
        await apiFetch(endpoints.forgotPassword, {
          method: "POST",
          body: JSON.stringify({ email: form.email }),
        });
        setMessage("If your account exists, reset instructions have been sent.");
      }

      if (mode === "reset") {
        if (form.password !== form.confirmPassword) {
          throw new Error("Passwords do not match.");
        }
        if (!/[A-Za-z]/.test(form.password) || !/[0-9]/.test(form.password)) {
          throw new Error("Password must include at least one letter and one number.");
        }
        if (!resetToken) {
          throw new Error("Reset token is missing.");
        }

        await apiFetch(endpoints.resetPassword, {
          method: "POST",
          body: JSON.stringify({ token: resetToken, password: form.password }),
        });
        setMessage("Password updated. You can now log in.");
        setMode("login");
        setForm((prev) => ({ ...prev, password: "", confirmPassword: "" }));
      }
    } catch (err) {
      setError(err?.data?.error || "Could not continue. Please try again.");
    } finally {
      setEmailBusy(false);
    }
  }

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundImage: `url(${bgTile})`,
        backgroundRepeat: "repeat",
        backgroundSize: "auto",
        backgroundPosition: "top left",
        backgroundAttachment: "fixed", // ✅ bg not scrollable
      }}
    >
      <div className="min-h-screen grid place-items-center bg-gradient-to-b from-emerald-50/80 via-rose-50/70 to-stone-50/80 backdrop-blur-[1px] p-6">
        <div className="w-full max-w-md">
          <div className="rounded-3xl border border-black/5 bg-white/70 p-6 shadow-sm backdrop-blur transition-all duration-300 hover:shadow-md hover:-translate-y-[2px]">
            <h1 className="text-2xl font-semibold text-stone-900">LifeOS</h1>

            <p className="mt-2 text-sm text-stone-600">
              A gentle productivity journal 🌸 habits, tasks, reflections, reminders.
            </p>

            <a
              href={endpoints.google}
              onClick={() => setGoogleBusy(true)}
              aria-disabled={disabledGoogle}
              className={`mt-6 inline-flex w-full items-center justify-center rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-medium shadow-sm transition-all duration-200 ${
                disabledGoogle
                  ? "opacity-60 pointer-events-none"
                  : "hover:bg-white/90 hover:-translate-y-[1px] hover:shadow-md"
              }`}
            >
              {booting
                ? "Checking session…"
                : googleBusy
                ? "Signing in…"
                : "Continue with Google"}
            </a>

            <div className="my-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-black/10" />
              <span className="text-[11px] uppercase tracking-wide text-stone-400">or</span>
              <div className="h-px flex-1 bg-black/10" />
            </div>

            <div className="flex rounded-xl bg-stone-100 p-1 text-xs">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError("");
                  setMessage("");
                }}
                className={`flex-1 rounded-lg px-2 py-1.5 transition ${
                  mode === "login" ? "bg-white text-stone-900 shadow-sm" : "text-stone-600"
                }`}
              >
                Log in
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setError("");
                  setMessage("");
                }}
                className={`flex-1 rounded-lg px-2 py-1.5 transition ${
                  mode === "signup" ? "bg-white text-stone-900 shadow-sm" : "text-stone-600"
                }`}
              >
                Sign up
              </button>
            </div>

            <form className="mt-4 space-y-3" onSubmit={onEmailSubmit}>
              {mode === "signup" && (
                <input
                  name="name"
                  value={form.name}
                  onChange={onChange}
                  autoComplete="name"
                  placeholder="Name (optional)"
                  className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none ring-emerald-200 transition focus:ring"
                />
              )}

              {mode !== "reset" && (
                <input
                  required
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={onChange}
                  autoComplete="email"
                  placeholder="Email"
                  className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none ring-emerald-200 transition focus:ring"
                />
              )}

              {mode !== "forgot" && (
                <input
                  required
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={onChange}
                  autoComplete={mode === "signup" || mode === "reset" ? "new-password" : "current-password"}
                  placeholder="Password (min 8 chars, include letter + number)"
                  className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none ring-emerald-200 transition focus:ring"
                />
              )}

              {(mode === "signup" || mode === "reset") && (
                <input
                  required
                  type="password"
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={onChange}
                  autoComplete="new-password"
                  placeholder="Confirm password"
                  className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none ring-emerald-200 transition focus:ring"
                />
              )}

              {mode === "login" && (
                <button
                  type="button"
                  className="text-xs text-stone-600 underline decoration-black/20 hover:text-stone-800"
                  onClick={() => {
                    setMode("forgot");
                    setError("");
                    setMessage("");
                  }}
                >
                  Forgot password?
                </button>
              )}

              {error ? <p className="text-xs text-rose-600">{error}</p> : null}
              {message ? <p className="text-xs text-emerald-700">{message}</p> : null}

              <button
                type="submit"
                disabled={disabledEmail}
                className={`inline-flex w-full items-center justify-center rounded-2xl border border-black/10 bg-stone-900 px-4 py-3 text-sm font-medium text-white shadow-sm transition-all duration-200 ${
                  disabledEmail
                    ? "opacity-60 pointer-events-none"
                    : "hover:bg-stone-800 hover:-translate-y-[1px] hover:shadow-md"
                }`}
              >
                {emailBusy
                  ? mode === "signup"
                    ? "Creating account…"
                    : mode === "forgot"
                    ? "Sending…"
                    : mode === "reset"
                    ? "Updating password…"
                    : "Logging in…"
                  : mode === "signup"
                  ? "Create account"
                  : mode === "forgot"
                  ? "Send reset link"
                  : mode === "reset"
                  ? "Reset password"
                  : "Continue with Email"}
              </button>
            </form>

            <div className="mt-3 text-xs text-stone-500">
              Your timezone and gentle tone help personalize reminders.
            </div>

            {/* ✅ Privacy + Terms */}
            <div className="mt-4 text-[11px] text-center text-stone-500">
              By continuing, you agree to our{" "}
              <NavLink
                to="/terms"
                className="underline decoration-black/20 hover:decoration-black/40 hover:text-stone-700"
              >
                Terms
              </NavLink>{" "}
              and{" "}
              <NavLink
                to="/privacy"
                className="underline decoration-black/20 hover:decoration-black/40 hover:text-stone-700"
              >
                Privacy Policy
              </NavLink>
              .
            </div>
          </div>

          <div className="mt-4 text-center text-xs text-stone-500">
            ✨ Calm. Simple. Consistent.
          </div>
        </div>
      </div>
    </div>
  );
}
