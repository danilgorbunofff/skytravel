import { useEffect, useRef, useCallback } from "react";

/**
 * Manages focus trapping within a container (for modals, drawers).
 * Returns a ref to attach to the container element.
 */
export function useFocusTrap(isOpen: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current = document.activeElement as HTMLElement;

    const container = containerRef.current;
    if (!container) return;

    // Focus first focusable element
    const focusFirst = () => {
      const focusable = getFocusableElements(container);
      if (focusable.length > 0) {
        (focusable[0] as HTMLElement).focus();
      }
    };

    // Delay to allow render
    requestAnimationFrame(focusFirst);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      const focusable = getFocusableElements(container);
      if (focusable.length === 0) return;

      const first = focusable[0] as HTMLElement;
      const last = focusable[focusable.length - 1] as HTMLElement;

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      // Return focus to previously focused element
      previousFocusRef.current?.focus();
    };
  }, [isOpen]);

  return containerRef;
}

function getFocusableElements(container: HTMLElement): NodeListOf<Element> {
  return container.querySelectorAll(
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );
}

/**
 * Hook to handle Escape key to close modals/drawers.
 */
export function useEscapeKey(onClose: () => void, isActive = true) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isActive) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isActive]);
}

/**
 * Returns focus to a specific element when called.
 */
export function useReturnFocus() {
  const targetRef = useRef<HTMLElement | null>(null);

  const save = useCallback(() => {
    targetRef.current = document.activeElement as HTMLElement;
  }, []);

  const restore = useCallback(() => {
    targetRef.current?.focus();
    targetRef.current = null;
  }, []);

  return { save, restore };
}
