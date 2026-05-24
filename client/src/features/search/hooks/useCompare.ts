import { useCallback, useSyncExternalStore } from "react";
import type { UnifiedTour } from "../../../types/providers";

const STORAGE_KEY = "skytravel:compare";
const MAX_COMPARE = 4;

interface CompareState {
  tours: { id: string; tour: UnifiedTour }[];
}

function getSnapshot(): CompareState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { tours: [] };
    return JSON.parse(raw) as CompareState;
  } catch {
    return { tours: [] };
  }
}

function save(state: CompareState) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  window.dispatchEvent(new Event("compare-change"));
}

const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  const handler = () => cb();
  window.addEventListener("compare-change", handler);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("compare-change", handler);
  };
}

let cachedSnapshot = getSnapshot();

function getSnapshotMemoized(): CompareState {
  const fresh = getSnapshot();
  if (JSON.stringify(fresh) !== JSON.stringify(cachedSnapshot)) {
    cachedSnapshot = fresh;
  }
  return cachedSnapshot;
}

export interface UseCompareReturn {
  tours: UnifiedTour[];
  count: number;
  isCompared: (tourId: string) => boolean;
  toggle: (tour: UnifiedTour) => void;
  remove: (tourId: string) => void;
  clear: () => void;
  canAdd: boolean;
  isFull: boolean;
}

export function useCompare(): UseCompareReturn {
  const state = useSyncExternalStore(subscribe, getSnapshotMemoized);

  const tours = state.tours.map((entry) => entry.tour);
  const count = tours.length;
  const isFull = count >= MAX_COMPARE;
  const canAdd = !isFull;

  const isCompared = useCallback(
    (tourId: string) => state.tours.some((entry) => entry.id === tourId),
    [state],
  );

  const toggle = useCallback(
    (tour: UnifiedTour) => {
      const id = `${tour.source}-${tour.externalId}`;
      const current = getSnapshot();
      const exists = current.tours.some((entry) => entry.id === id);
      if (exists) {
        save({ tours: current.tours.filter((entry) => entry.id !== id) });
      } else {
        if (current.tours.length >= MAX_COMPARE) return;
        save({ tours: [...current.tours, { id, tour }] });
      }
    },
    [],
  );

  const remove = useCallback((tourId: string) => {
    const current = getSnapshot();
    save({ tours: current.tours.filter((entry) => entry.id !== tourId) });
  }, []);

  const clear = useCallback(() => {
    save({ tours: [] });
  }, []);

  return { tours, count, isCompared, toggle, remove, clear, canAdd, isFull };
}
