import { useState, useCallback, useMemo } from "react";

interface Tour {
  name: string;
  destination?: string;
  price?: number;
  nights?: number;
  stars?: number;
  image?: string;
  providerId?: string;
  externalId?: string;
}

interface InspireOptions {
  tours: Tour[];
  budget?: number;
  preferredNights?: [number, number];
}

/**
 * "Inspire me" hook — picks random/curated suggestions from available tours.
 * Filters by budget and preference, returns a shuffled subset.
 */
export function useInspireMe({ tours, budget, preferredNights }: InspireOptions) {
  const [seed, setSeed] = useState(0);

  const suggestions = useMemo(() => {
    let pool = tours;

    if (budget) {
      pool = pool.filter((t) => t.price && t.price <= budget);
    }

    if (preferredNights) {
      pool = pool.filter(
        (t) => t.nights && t.nights >= preferredNights[0] && t.nights <= preferredNights[1]
      );
    }

    // Shuffle with seed for consistent re-renders
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 6);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tours, budget, preferredNights, seed]);

  const refresh = useCallback(() => {
    setSeed((s) => s + 1);
  }, []);

  return { suggestions, refresh };
}
