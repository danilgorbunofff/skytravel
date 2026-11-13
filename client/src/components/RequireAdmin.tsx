import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { fetchAdminMe } from "../features/admin/services/adminApi";
import "../site.css";

/**
 * Guards the admin routes. Only the very first check blocks rendering; later
 * re-checks (route change, window focus) run in the background so the page
 * stays mounted and unsaved drafts survive switching browser tabs.
 */
export default function RequireAdmin({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState<"checking" | "authed" | "unauth">("checking");
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const checkAuth = useCallback(() => {
    fetchAdminMe()
      .then(() => {
        if (mountedRef.current) setStatus("authed");
      })
      .catch(() => {
        if (!mountedRef.current) return;
        setStatus("unauth");
        navigate("/admin-login", { replace: true });
      });
  }, [navigate]);

  // Re-check auth on route change (in the background once authed)
  useEffect(() => {
    checkAuth();
  }, [checkAuth, location.pathname]);

  // Re-check auth when window regains focus (catches expired sessions)
  useEffect(() => {
    if (status !== "authed") return;
    window.addEventListener("focus", checkAuth);
    return () => window.removeEventListener("focus", checkAuth);
  }, [checkAuth, status]);

  if (status !== "authed") {
    return (
      <div className="flex min-h-screen items-center justify-center" role="status" aria-busy="true">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <span className="sr-only">Ověřuji přihlášení…</span>
      </div>
    );
  }

  return <>{children}</>;
}
