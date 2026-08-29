import { useCallback, useSyncExternalStore } from "react";

const RECENT_SEARCHES_KEY = "skytravel:recentSearches";
const MAX_RECENT = 10;

export interface RecentSearch {
  query: string;
  timestamp: number;
  resultCount?: number;
  filters?: Record<string, string>;
}

const EMPTY: RecentSearch[] = [];

let listeners: (() => void)[] = [];
function notifyListeners() {
  listeners.forEach((l) => l());
}

// `useSyncExternalStore` re-reads getSnapshot on every render and compares the
// result by identity. Returning a freshly parsed array each call makes React
// believe the store changed forever → "The result of getSnapshot should be
// cached to avoid an infinite loop". Cache keyed on the raw string instead.
let cachedRaw: string | null = null;
let cachedValue: RecentSearch[] = EMPTY;

function parseRaw(raw: string | null): RecentSearch[] {
  if (!raw) return EMPTY;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, MAX_RECENT) : EMPTY;
  } catch {
    return EMPTY;
  }
}

function readRaw(): string | null {
  try {
    return localStorage.getItem(RECENT_SEARCHES_KEY);
  } catch {
    return cachedRaw;
  }
}

function writeRaw(value: RecentSearch[]) {
  const raw = JSON.stringify(value);
  cachedRaw = raw;
  cachedValue = value;
  try {
    localStorage.setItem(RECENT_SEARCHES_KEY, raw);
  } catch {
    // storage full or blocked — in-memory cache stays consistent regardless
  }
  notifyListeners();
}

function getSnapshot(): RecentSearch[] {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedValue = parseRaw(raw);
  }
  return cachedValue;
}

// Must return a stable reference, never a fresh [].
function getServerSnapshot(): RecentSearch[] {
  return EMPTY;
}

function subscribe(listener: () => void) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

export function useRecentSearches() {
  const searches = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const save = useCallback(
    (query: string, resultCount?: number, filters?: Record<string, string>) => {
      if (!query.trim()) return;
      const existing = getSnapshot();
      const filtered = existing.filter((s) => s.query.toLowerCase() !== query.trim().toLowerCase());
      filtered.unshift({ query: query.trim(), timestamp: Date.now(), resultCount, filters });
      writeRaw(filtered.slice(0, MAX_RECENT));
    },
    [],
  );

  const clear = useCallback(() => {
    writeRaw([]);
  }, []);

  const remove = useCallback((query: string) => {
    const existing = getSnapshot();
    const filtered = existing.filter((s) => s.query.toLowerCase() !== query.toLowerCase());
    writeRaw(filtered);
  }, []);

  return { searches, save, clear, remove };
}
