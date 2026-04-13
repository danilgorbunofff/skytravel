import { useEffect, useMemo, useState } from "react";
import type { OwnTour } from "../types";

export function useTourPreview(form: OwnTour, photos: string[]) {
  const [previewIndex, setPreviewIndex] = useState(0);

  const previewPhotos = useMemo(
    () =>
      photos.length > 0
        ? photos
        : ["https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1800&q=80"],
    [photos],
  );

  const previewTransportLabel = useMemo(() => {
    const map: Record<string, string> = {
      plane: "Letecky",
      train: "Vlakem",
      bus: "Autobusem",
      car: "Vlastní doprava",
      boat: "Lodí",
    };
    return map[form.transport || "plane"] || "Dle nabídky";
  }, [form.transport]);

  const previewTerm = useMemo(() => {
    if (!form.startDate || !form.endDate) return "Vyberte termín";
    const start = new Date(form.startDate);
    const end = new Date(form.endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "Vyberte termín";
    return `${start.toLocaleDateString("cs-CZ")} – ${end.toLocaleDateString("cs-CZ")}`;
  }, [form.startDate, form.endDate]);

  useEffect(() => {
    if (previewIndex >= previewPhotos.length) {
      setPreviewIndex(0);
    }
  }, [previewPhotos, previewIndex]);

  const prevSlide = () =>
    setPreviewIndex((prev) => (prev - 1 + previewPhotos.length) % previewPhotos.length);

  const nextSlide = () =>
    setPreviewIndex((prev) => (prev + 1) % previewPhotos.length);

  return {
    previewPhotos,
    previewIndex,
    setPreviewIndex,
    previewTransportLabel,
    previewTerm,
    prevSlide,
    nextSlide,
  };
}
