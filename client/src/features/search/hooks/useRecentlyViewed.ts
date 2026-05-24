import { useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "skytravel:recentlyViewed";
const MAX_ITEMS = 20;

export interface RecentTour {
  providerId: string;
  externalId: string;
  name: string;
  destination: string;
  price?: number;
  image?: string;
  viewedAt: number;
}

/**
 * Tracks recently viewed tours in localStorage.
 * Stores up to MAX_ITEMS, newest first.
 */
export function useRecentlyViewed() {
  const [items, setItems] = useState<RecentTour[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const addTour = useCallback(
    (tour: Omit<RecentTour, "viewedAt">) => {
      setItems((prev) => {
        const filtered = prev.filter(
          (t) => !(t.providerId === tour.providerId && t.externalId === tour.externalId)
        );
        const updated = [{ ...tour, viewedAt: Date.now() }, ...filtered].slice(0, MAX_ITEMS);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });
    },
    []
  );

  const clear = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setItems([]);
  }, []);

  return { recentlyViewed: items, addTour, clear };
}
