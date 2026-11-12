/**
 * First-touch UTM attribution.
 *
 * The first visit that carries utm_* parameters wins and is remembered for
 * 30 days (localStorage), so a visitor who arrives from Instagram, browses
 * several pages and only later sends the lead form is still attributed to
 * Instagram. The values are attached to every lead submission.
 */
const STORAGE_KEY = "skytravel:utm";
const TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
] as const;

export type UtmParams = Partial<Record<(typeof UTM_KEYS)[number], string>> & {
  landingPage?: string;
  referrer?: string;
};

interface Stored {
  params: UtmParams;
  savedAt: number;
}

export function parseUtm(search: string): UtmParams {
  const query = new URLSearchParams(search);
  const params: UtmParams = {};
  for (const key of UTM_KEYS) {
    const value = query.get(key)?.trim();
    if (value) params[key] = value.slice(0, 120);
  }
  return params;
}

/** Call once on page load. Stores UTM params when the URL has them. */
export function captureUtm(): void {
  if (typeof window === "undefined") return;
  try {
    const params = parseUtm(window.location.search);
    if (Object.keys(params).length === 0) return;
    const existing = readStored();
    if (existing) return; // first touch wins while it is fresh
    params.landingPage = window.location.pathname;
    if (document.referrer) params.referrer = document.referrer.slice(0, 300);
    const stored: Stored = { params, savedAt: Date.now() };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // storage unavailable — attribution is best effort
  }
}

function readStored(): Stored | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const stored = JSON.parse(raw) as Stored;
    if (!stored?.savedAt || Date.now() - stored.savedAt > TTL_MS) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return stored;
  } catch {
    return null;
  }
}

export function getUtm(): UtmParams {
  if (typeof window === "undefined") return {};
  const stored = readStored();
  if (stored) return stored.params;
  // No stored first touch: fall back to whatever the current URL carries.
  return parseUtm(window.location.search);
}
