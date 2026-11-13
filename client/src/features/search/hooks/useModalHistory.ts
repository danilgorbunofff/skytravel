import { useEffect, useRef } from "react";

interface ModalHistoryState {
  modal?: string;
}

function currentModalId(): string | undefined {
  return (window.history.state as ModalHistoryState | null)?.modal;
}

/**
 * Gives a full-screen modal its own browser-history entry, so the phone's Back button
 * closes the modal instead of leaving the page.
 *
 * - On mount it pushes an entry (optionally at `url`, e.g. `?tourId=…`).
 * - Back (popstate) calls `onClose`.
 * - Closing any other way (✕, Esc, backdrop) removes the entry again with history.back().
 * - While open, a changed `url` replaces the entry instead of adding more.
 *
 * Mount the hook only while the modal is open (i.e. inside the modal component).
 */
export function useModalHistory(onClose: () => void, url?: string): void {
  const idRef = useRef(`m-${Math.random().toString(36).slice(2)}`);
  const onCloseRef = useRef(onClose);
  const urlRef = useRef(url);
  const pendingBackRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const id = idRef.current;
    // StrictMode re-runs this effect right after its cleanup; cancel that cleanup's back().
    if (pendingBackRef.current !== undefined) {
      window.clearTimeout(pendingBackRef.current);
      pendingBackRef.current = undefined;
    }
    if (currentModalId() !== id) {
      const state = { ...(window.history.state as object | null), modal: id };
      window.history.pushState(state, "", urlRef.current ?? window.location.href);
    }

    let closedByBack = false;
    function onPopState(event: PopStateEvent) {
      if ((event.state as ModalHistoryState | null)?.modal === id) return;
      closedByBack = true;
      onCloseRef.current();
    }
    window.addEventListener("popstate", onPopState);

    return () => {
      window.removeEventListener("popstate", onPopState);
      if (closedByBack) return;
      pendingBackRef.current = window.setTimeout(() => {
        pendingBackRef.current = undefined;
        if (currentModalId() === id) window.history.back();
      }, 0);
    };
  }, []);

  useEffect(() => {
    urlRef.current = url;
    if (!url || currentModalId() !== idRef.current) return;
    const next = new URL(url, window.location.href);
    if (next.href !== window.location.href) {
      window.history.replaceState(window.history.state, "", next.href);
    }
  }, [url]);
}
