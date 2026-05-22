import { useEffect } from "react";

const BASE_TITLE = "SkyTravel";

/**
 * Sets the document title on mount and restores the base title on unmount.
 * Usage: usePageTitle("Vyhledávání zájezdů") → "Vyhledávání zájezdů | SkyTravel"
 */
export function usePageTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} | ${BASE_TITLE}` : `${BASE_TITLE} | Dovolená na míru`;
    return () => {
      document.title = `${BASE_TITLE} | Dovolená na míru`;
    };
  }, [title]);
}
