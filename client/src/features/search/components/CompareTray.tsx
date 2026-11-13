import { X } from "lucide-react";
import type { UnifiedTour } from "../../../types/providers";
import { useLanguage } from "../../../hooks/useLanguage";
import { countLabel } from "../../../lib/formatters";

interface Props {
  tours: UnifiedTour[];
  onExpand: () => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}

const MAX_COMPARE = 4;

export function CompareTray({ tours, onExpand, onRemove, onClear }: Props) {
  const { t } = useLanguage();
  if (tours.length === 0) return null;

  const isMaxed = tours.length >= MAX_COMPARE;
  const countText = `${countLabel(t, tours.length, "sCompareTours")} ${t("sCompareTo")}`;

  return (
    <div className="compare-tray" role="region" aria-label={t("sCompareTitle")}>
      <div className="compare-tray__thumbs">
        {tours.map((tour) => {
          const id = `${tour.source}-${tour.externalId}`;
          return (
            <button
              key={id}
              type="button"
              className="compare-tray__thumb"
              onClick={() => onRemove(id)}
              aria-label={`${t("sCompareRemove")}: ${tour.title}`}
            >
              <img
                src={tour.image || "/placeholder-tour.svg"}
                alt={tour.title}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = "/placeholder-tour.svg";
                }}
              />
              <span className="compare-tray__thumb-x">
                <X size={10} aria-hidden="true" />
              </span>
            </button>
          );
        })}
        {isMaxed && <div className="compare-tray__max-badge">max 4</div>}
      </div>

      <span className="compare-tray__count">{countText}</span>

      <div className="compare-tray__actions">
        <button type="button" className="compare-tray__expand" onClick={onExpand}>
          {t("sCompareExpand")}
        </button>
        <button type="button" className="compare-tray__clear" onClick={onClear}>
          {t("sCompareClearAll")}
        </button>
      </div>
    </div>
  );
}
