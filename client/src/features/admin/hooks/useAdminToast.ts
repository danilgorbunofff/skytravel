import { useCallback, useEffect, useRef, useState } from "react";

export type AdminToastType = "success" | "error" | "info";

export type AdminToastItem = {
  id: number;
  type: AdminToastType;
  message: string;
};

const DEFAULT_DURATION = 5000;

/**
 * Toast queue shared by all admin pages. Render the returned `toasts` with
 * `<AdminToastViewport>` so every page gets the same look and the same
 * aria-live announcements.
 */
export function useAdminToast(duration = DEFAULT_DURATION) {
  const [toasts, setToasts] = useState<AdminToastItem[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
  }, []);

  const showToast = useCallback(
    (message: string, type: AdminToastType = "success") => {
      const id = ++nextId.current;
      setToasts((prev) => [...prev, { id, type, message }]);
      timers.current.set(
        id,
        setTimeout(() => dismissToast(id), duration),
      );
    },
    [dismissToast, duration],
  );

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach((timer) => clearTimeout(timer));
      pending.clear();
    };
  }, []);

  return { toasts, showToast, dismissToast };
}
