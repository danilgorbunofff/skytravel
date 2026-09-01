import { useCallback, useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "";

export function useAdminAuth() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const check = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/me`, {
        credentials: "include",
      });
      setIsAdmin(res.ok);
    } catch {
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  useEffect(() => {
    function onFocus() {
      // Re-validate session when tab regains focus (expired cookie, login elsewhere)
      check();
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [check]);

  return { isAdmin, loading, refresh: check };
}
