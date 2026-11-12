export const SITE_BASE_URL = "https://sky-travel.tours";

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** Escape the five HTML-significant characters. Used for every interpolation. */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char] as string);
}

/** Local paths become absolute site URLs; already-absolute URLs pass through. */
export function absoluteUrl(src: string): string {
  return /^https?:\/\//i.test(src) ? src : `${SITE_BASE_URL}${src}`;
}

const MONTHS_CS = [
  "ledna",
  "února",
  "března",
  "dubna",
  "května",
  "června",
  "července",
  "srpna",
  "září",
  "října",
  "listopadu",
  "prosince",
];

/** "2026-03-01" → "1. března 2026" (Czech long date). */
export function formatDateCs(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso;
  return `${day}. ${MONTHS_CS[month - 1]} ${year}`;
}

/** "2026-03-01" → "1. 3. 2026" (compact, for dense meta rows). */
export function formatDateShortCs(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso;
  return `${day}. ${month}. ${year}`;
}

/** Czech plural forms: plural(3, "článek", "články", "článků") → "3 články". */
export function plural(count: number, one: string, few: string, many: string): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  const word =
    count === 1 ? one : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? few : many;
  return `${count} ${word}`;
}

/** "min" reading time label, e.g. "7 min čtení". */
export function readingLabel(minutes: number): string {
  return `${minutes} min čtení`;
}

/**
 * Serialise JSON-LD for a <script> tag. `<`, `>` and `&` are escaped so the
 * payload can never terminate the script element early.
 */
export function jsonLdScript(data: unknown): string {
  const json = JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
  return `<script type="application/ld+json">${json}</script>`;
}

/** Truncate on a word boundary without leaving a dangling space. */
export function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  const cut = value.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > max * 0.6 ? lastSpace : cut.length).trimEnd()}…`;
}

/** Attributes for an <img>/<source> from a resolved image. */
export function srcsetAttr(value: string): string {
  return value ? ` srcset="${escapeHtml(value)}"` : "";
}
