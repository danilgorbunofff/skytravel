import { useEffect, useState } from "react";
import { fetchTours } from "../api";
import { defaultOwnTours, type OwnTour } from "../data";

export function useTours() {
  const [tours, setTours] = useState<OwnTour[]>(defaultOwnTours);

  useEffect(() => {
    fetchTours()
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
          setTours(sorted);
        } else {
          setTours(defaultOwnTours);
        }
      })
      .catch(() => {
        setTours(defaultOwnTours);
      });
  }, []);

  return tours;
}
