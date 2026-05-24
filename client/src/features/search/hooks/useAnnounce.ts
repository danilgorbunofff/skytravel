import { useCallback, useRef } from "react";

/**
 * Hook for accessible screen reader announcements via ARIA live regions.
 * Creates an off-screen live region and provides announce functions.
 */
export function useAnnounce() {
  const regionRef = useRef<HTMLDivElement | null>(null);

  const getRegion = useCallback(() => {
    if (regionRef.current) return regionRef.current;

    const el = document.createElement("div");
    el.setAttribute("role", "status");
    el.setAttribute("aria-live", "polite");
    el.setAttribute("aria-atomic", "true");
    el.className = "sr-only";
    el.style.cssText =
      "position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0";
    document.body.appendChild(el);
    regionRef.current = el;
    return el;
  }, []);

  const announce = useCallback(
    (message: string, priority: "polite" | "assertive" = "polite") => {
      const region = getRegion();
      region.setAttribute("aria-live", priority);
      // Clear then set to trigger announcement
      region.textContent = "";
      requestAnimationFrame(() => {
        region.textContent = message;
      });
    },
    [getRegion]
  );

  return { announce };
}
