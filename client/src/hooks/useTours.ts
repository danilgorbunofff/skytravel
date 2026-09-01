import { useEffect, useState } from "react";
import { fetchTours } from "../api";
import { defaultOwnTours, type OwnTour } from "../data";

export function useTours() {
  const [tours, setTours] = useState<OwnTour[]>(defaultOwnTours);

  useEffect(() => {
    const controller = new AbortController();
    fetchTours({ signal: controller.signal })
      .then((items) => {
        if (items.length > 0) {
          const sorted = [...items].sort((a, b) => {
            const orderA = a.sortOrder ?? 0;
            const orderB = b.sortOrder ?? 0;
            if (orderA !== orderB) return orderA - orderB;
            const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
            const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
            return dateB - dateA;
          });
          setTours(sorted.slice(0, 3));
        } else {
          setTours(defaultOwnTours.slice(0, 3));
        }
      })
      .catch((err) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setTours(defaultOwnTours.slice(0, 3));
      });
    return () => controller.abort();
  }, []);

  return tours;
}
