import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthProvider";

export default function RequireAuth({ children }) {
  const { user, booting } = useAuth();
  if (booting) return <div className="p-6">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}