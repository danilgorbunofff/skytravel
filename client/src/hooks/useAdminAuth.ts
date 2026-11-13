import { useCallback, useEffect, useState } from "react";
import { hasAdminHint, setAdminHint } from "../lib/adminHint";

const API_URL = import.meta.env.VITE_API_URL || "";

/**
 * Admin session check for the public header. Skipped entirely unless this browser has
 * signed in as admin before (see `lib/adminHint`), so visitors never hit `/api/admin/me`.
 */
export function useAdminAuth() {
  const [enabled] = useState(hasAdminHint);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(enabled);

  const check = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/me`, {
        credentials: "include",
      });
      setIsAdmin(res.ok);
      // Session gone (expired, logged out elsewhere): stop checking on public pages.
      if (res.status === 401 || res.status === 403) setAdminHint(false);
    } catch {
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    check();
    function onFocus() {
      // Re-validate session when tab regains focus (expired cookie, login elsewhere)
      check();
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [check, enabled]);

  return { isAdmin, loading, refresh: check };
}
