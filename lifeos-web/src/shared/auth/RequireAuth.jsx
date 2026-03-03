import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import Loader from "../ui/loader"; // adjust path if needed

export default function RequireAuth({ children }) {
  const { user, booting } = useAuth();

  if (booting) {
    return <Loader label="Checking your session…" />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
