import { createContext, useContext } from "react";
import { SSR_DATA_ELEMENT_ID, type SsrPayload } from "./types";

/**
 * Data rendered into the page by the server. Present for the first render
 * after a server-rendered load only; client-side navigations get `null` and
 * fall back to fetching.
 */
export const SsrDataContext = createContext<SsrPayload | null>(null);

export function useSsrData(): SsrPayload | null {
  return useContext(SsrDataContext);
}

/** Reads the JSON payload the server embedded in the HTML (browser only). */
export function readSsrPayload(): SsrPayload | null {
  if (typeof document === "undefined") return null;
  const el = document.getElementById(SSR_DATA_ELEMENT_ID);
  if (!el?.textContent) return null;
  try {
    return JSON.parse(el.textContent) as SsrPayload;
  } catch {
    return null;
  }
}

const LINE_SEP = new RegExp(String.fromCharCode(0x2028), "g");
const PARA_SEP = new RegExp(String.fromCharCode(0x2029), "g");

/** Serialises the payload safely for embedding inside a <script> tag. */
export function serializeSsrPayload(payload: SsrPayload): string {
  return JSON.stringify(payload)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(LINE_SEP, "\\u2028")
    .replace(PARA_SEP, "\\u2029");
}
