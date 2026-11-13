import { AlertTriangle, CheckCircle2, X, XCircle } from "lucide-react";
import { cn } from "../../lib/utils";
import type { AdminToastItem } from "../../features/admin/hooks/useAdminToast";

type Props = {
  toasts: AdminToastItem[];
  onDismiss: (id: number) => void;
};

/**
 * Single toast region for the admin. The live region is always mounted so
 * screen readers announce messages that are added to it later.
 */
export default function AdminToastViewport({ toasts, onDismiss }: Props) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-relevant="additions"
      className="pointer-events-none fixed right-4 top-20 z-[60] flex max-w-[calc(100vw-2rem)] flex-col gap-2 sm:right-6"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            "pointer-events-auto flex items-start gap-2.5 rounded-lg border bg-white px-4 py-3 text-sm font-medium shadow-lg",
            toast.type === "success" && "border-green-200 bg-green-50 text-green-800",
            toast.type === "error" && "border-red-200 bg-red-50 text-red-800",
            toast.type === "info" && "border-primary/30 bg-primary/10 text-primary",
          )}
        >
          {toast.type === "success" && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
          {toast.type === "error" && <XCircle className="mt-0.5 h-4 w-4 shrink-0" />}
          {toast.type === "info" && <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
          <span className="flex-1">{toast.message}</span>
          <button
            type="button"
            className="-mr-1 rounded p-0.5 opacity-70 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-current"
            onClick={() => onDismiss(toast.id)}
            aria-label="Zavřít oznámení"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
