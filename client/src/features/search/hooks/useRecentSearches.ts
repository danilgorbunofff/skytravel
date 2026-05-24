import { useCallback, useSyncExternalStore } from "react";

const RECENT_SEARCHES_KEY = "skytravel:recentSearches";
const MAX_RECENT = 10;

export interface RecentSearch {
  query: string;
  timestamp: number;
  resultCount?: number;
  filters?: Record<string, string>;
}

let listeners: (() => void)[] = [];
function notifyListeners() {
  listeners.forEach((l) => l());
}

function getSnapshot(): RecentSearch[] {
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

function subscribe(listener: () => void) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

export function useRecentSearches() {
  const searches = useSyncExternalStore(subscribe, getSnapshot, () => []);

  const save = useCallback((query: string, resultCount?: number, filters?: Record<string, string>) => {
    if (!query.trim()) return;
    try {
      const existing = getSnapshot();
      const filtered = existing.filter(
        (s) => s.query.toLowerCase() !== query.trim().toLowerCase(),
      );
      filtered.unshift({ query: query.trim(), timestamp: Date.now(), resultCount, filters });
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(filtered.slice(0, MAX_RECENT)));
      notifyListeners();
    } catch {
      // localStorage unavailable
    }
  }, []);

  const clear = useCallback(() => {
    try {
      localStorage.removeItem(RECENT_SEARCHES_KEY);
      notifyListeners();
    } catch {
      // ignore
    }
  }, []);

  const remove = useCallback((query: string) => {
    try {
      const existing = getSnapshot();
      const filtered = existing.filter(
        (s) => s.query.toLowerCase() !== query.toLowerCase(),
      );
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(filtered));
      notifyListeners();
    } catch {
      // ignore
    }
  }, []);

  return { searches, save, clear, remove };
}
