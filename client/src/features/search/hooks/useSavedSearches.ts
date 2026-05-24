import { useState, useCallback } from "react";

const STORAGE_KEY = "skytravel:savedSearches";
const MAX_SAVED = 10;

export interface SavedSearch {
  id: string;
  label: string;
  params: Record<string, string>;
  savedAt: number;
}

/**
 * Manages saved search filter combinations in localStorage.
 */
export function useSavedSearches() {
  const [searches, setSearches] = useState<SavedSearch[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const save = useCallback(
    (label: string, params: Record<string, string>) => {
      setSearches((prev) => {
        const entry: SavedSearch = {
          id: crypto.randomUUID(),
          label,
          params,
          savedAt: Date.now(),
        };
        const updated = [entry, ...prev].slice(0, MAX_SAVED);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });
    },
    []
  );

  const remove = useCallback((id: string) => {
    setSearches((prev) => {
      const updated = prev.filter((s) => s.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clear = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setSearches([]);
  }, []);

  return { savedSearches: searches, save, remove, clear };
}
