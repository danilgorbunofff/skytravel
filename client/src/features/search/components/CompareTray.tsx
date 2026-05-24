import { X } from "lucide-react";
import type { UnifiedTour } from "../../../types/providers";

interface Props {
  tours: UnifiedTour[];
  onExpand: () => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}

export function CompareTray({ tours, onExpand, onRemove, onClear }: Props) {
  if (tours.length === 0) return null;

  const countText = tours.length === 1
    ? "1 zájezd k porovnání"
    : tours.length < 5
      ? `${tours.length} zájezdy k porovnání`
      : `${tours.length} zájezdů k porovnání`;

  return (
    <div className="compare-tray" role="region" aria-label="Porovnání zájezdů">
      <div className="compare-tray__thumbs">
        {tours.map((tour) => {
          const id = `${tour.source}-${tour.externalId}`;
          return (
            <button
              key={id}
              type="button"
              className="compare-tray__thumb"
              onClick={() => onRemove(id)}
              aria-label={`Odebrat ${tour.title}`}
            >
              <img
                src={tour.image || "/placeholder-tour.svg"}
                alt={tour.title}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = "/placeholder-tour.svg";
                }}
              />
              <span className="compare-tray__thumb-x"><X size={10} /></span>
            </button>
          );
        })}
      </div>

      <span className="compare-tray__count">{countText}</span>

      <div className="compare-tray__actions">
        <button type="button" className="compare-tray__expand" onClick={onExpand}>
          Porovnat ▲
        </button>
        <button type="button" className="compare-tray__clear" onClick={onClear}>
          Vymazat
        </button>
      </div>
    </div>
  );
}
