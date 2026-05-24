import { useState, useCallback, useEffect, useRef } from "react";

export interface MapPin {
  id: string;
  lat: number;
  lng: number;
  label: string;
  price?: number;
  count?: number;
}

interface UseMapViewOptions {
  pins: MapPin[];
  onPinClick?: (id: string) => void;
}

/**
 * Hook for managing map view state.
 * Provides state management for map pins, clusters, viewport, and selection.
 * Actual map rendering uses a lightweight lib (e.g., leaflet) in the component.
 */
export function useMapView({ pins, onPinClick }: UseMapViewOptions) {
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [viewport, setViewport] = useState({
    center: { lat: 35.0, lng: 25.0 }, // Mediterranean default
    zoom: 5,
  });
  const [isMapVisible, setIsMapVisible] = useState(false);

  const handlePinClick = useCallback(
    (id: string) => {
      setSelectedPinId(id);
      onPinClick?.(id);
    },
    [onPinClick]
  );

  const toggleMap = useCallback(() => {
    setIsMapVisible((v) => !v);
  }, []);

  const fitBounds = useCallback((newPins: MapPin[]) => {
    if (newPins.length === 0) return;
    if (newPins.length === 1) {
      setViewport({ center: { lat: newPins[0].lat, lng: newPins[0].lng }, zoom: 10 });
      return;
    }
    const lats = newPins.map((p) => p.lat);
    const lngs = newPins.map((p) => p.lng);
    setViewport({
      center: {
        lat: (Math.min(...lats) + Math.max(...lats)) / 2,
        lng: (Math.min(...lngs) + Math.max(...lngs)) / 2,
      },
      zoom: 6,
    });
  }, []);

  // Auto-fit when pins change
  useEffect(() => {
    if (isMapVisible && pins.length > 0) {
      fitBounds(pins);
    }
  }, [pins, isMapVisible, fitBounds]);

  return {
    isMapVisible,
    toggleMap,
    viewport,
    setViewport,
    selectedPinId,
    handlePinClick,
    fitBounds,
  };
}
