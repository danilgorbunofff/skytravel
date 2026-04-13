import { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { fetchAdminMe } from "../features/admin/services/adminApi";
import "../site.css";

export default function RequireAdmin({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState<"checking" | "authed" | "unauth">("checking");

  const checkAuth = useCallback(() => {
    setStatus("checking");
    fetchAdminMe()
      .then(() => setStatus("authed"))
      .catch(() => {
        setStatus("unauth");
        navigate("/admin-login", { replace: true });
      });
  }, [navigate]);

  // Re-check auth on route change
  useEffect(() => {
    checkAuth();
  }, [checkAuth, location.pathname]);

  // Re-check auth when window regains focus (catches expired sessions)
  useEffect(() => {
    const onFocus = () => {
      if (status === "authed") checkAuth();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [checkAuth, status]);

  if (status !== "authed") {
    return <div className="admin-guard" aria-busy="true" />;
  }

  return <>{children}</>;
}
