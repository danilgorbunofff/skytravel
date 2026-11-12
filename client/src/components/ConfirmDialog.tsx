import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { AlertTriangle, HelpCircle, Loader2 } from "lucide-react";
import { cn } from "../lib/utils";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  /** May return a promise; the dialog stays busy until it settles. */
  onConfirm: () => unknown;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  /** "danger" for destructive actions (delete), "default" for e.g. send or import. */
  tone?: "danger" | "default";
  /** External pending state; the confirm button is disabled while true. */
  loading?: boolean;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = "Potvrdit",
  cancelLabel = "Zrušit",
  tone = "danger",
  loading = false,
}: ConfirmDialogProps) {
  const [pending, setPending] = useState(false);
  // A ref (not state) so a second click in the same tick is rejected too.
  const inFlight = useRef(false);
  const mounted = useRef(true);
  const busy = loading || pending;
  const isDanger = tone === "danger";

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  async function handleConfirm() {
    if (busy || inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    try {
      await onConfirm();
    } finally {
      inFlight.current = false;
      if (mounted.current) setPending(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !busy && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                isDanger ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary",
              )}
            >
              {isDanger ? (
                <AlertTriangle className="h-5 w-5" />
              ) : (
                <HelpCircle className="h-5 w-5" />
              )}
            </div>
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription>{message}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button
            variant={isDanger ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={busy}
            aria-busy={busy}
          >
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
