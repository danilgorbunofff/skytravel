import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { UnifiedTour } from "../types/providers";

const KEY = "skytravel:favorites";
const EMPTY: Record<string, UnifiedTour> = {};

// One store shared by every useFavorites() consumer (header count, cards, favorites page),
// so saving a tour anywhere updates all of them. Backed by localStorage; the parsed map is
// cached by its raw string so the snapshot stays referentially stable between renders.
let cachedRaw: string | null | undefined;
let cachedMap: Record<string, UnifiedTour> = EMPTY;
// Storage blocked or full: keep favourites in memory for this page view.
let memoryOnly = false;
const listeners = new Set<() => void>();

function readMap(): Record<string, UnifiedTour> {
  if (memoryOnly) return cachedMap;
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return cachedMap;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cachedMap = raw ? (JSON.parse(raw) as Record<string, UnifiedTour>) : EMPTY;
    } catch {
      cachedMap = EMPTY;
    }
  }
  return cachedMap;
}

function writeMap(next: Record<string, UnifiedTour>) {
  try {
    const raw = JSON.stringify(next);
    localStorage.setItem(KEY, raw);
    cachedRaw = raw;
  } catch {
    memoryOnly = true;
  }
  cachedMap = next;
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  // Another tab changed favourites.
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY || event.key === null) fn();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(fn);
    window.removeEventListener("storage", onStorage);
  };
}

// Server render and hydration see no favourites; the client snapshot follows right after.
const getServerSnapshot = () => EMPTY;

export function useFavorites() {
  const map = useSyncExternalStore(subscribe, readMap, getServerSnapshot);

  const toggle = useCallback((tour: UnifiedTour) => {
    const id = `${tour.source}-${tour.externalId}`;
    const prev = readMap();
    const { [id]: _removed, ...rest } = prev;
    writeMap(id in prev ? rest : { ...prev, [id]: tour });
  }, []);

  const isFavorite = useCallback((id: string) => id in map, [map]);

  const favorites = useMemo<string[]>(() => Object.keys(map), [map]);
  const favoriteTours = useMemo<UnifiedTour[]>(() => Object.values(map), [map]);

  return { favorites, favoriteTours, toggle, isFavorite };
}
