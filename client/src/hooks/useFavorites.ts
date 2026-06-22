import { useState, useCallback, useMemo } from "react";
import type { UnifiedTour } from "../types/providers";

const KEY = "skytravel:favorites";

function load(): Record<string, UnifiedTour> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}");
  } catch {
    return {};
  }
}

export function useFavorites() {
  const [map, setMap] = useState<Record<string, UnifiedTour>>(load);

  const toggle = useCallback((tour: UnifiedTour) => {
    const id = `${tour.source}-${tour.externalId}`;
    setMap((prev) => {
      const next = { ...prev };
      if (id in next) {
        delete next[id];
      } else {
        next[id] = tour;
      }
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        // storage full or blocked
      }
      return next;
    });
  }, []);

  const isFavorite = useCallback(
    (id: string) => id in map,
    [map],
  );

  const favorites = useMemo<string[]>(() => Object.keys(map), [map]);
  const favoriteTours = useMemo<UnifiedTour[]>(() => Object.values(map), [map]);

  return { favorites, favoriteTours, toggle, isFavorite };
}
