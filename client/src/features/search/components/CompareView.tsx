import { X, Trophy } from "lucide-react";
import type { UnifiedTour } from "../../../types/providers";
import type { TranslationKey } from "../../../hooks/useLanguage";
import { formatPrice } from "../../../utils";
import { fmtDate, starsDisplay } from "../../../lib/formatters";
import { isPlausibleTourPrice } from "../../../lib/prices";
import { getBoardLabel, getTransportLabel } from "../constants";

interface Props {
  tours: UnifiedTour[];
  onRemove: (id: string) => void;
  onClear: () => void;
  onClose: () => void;
  onOpenDetail: (tour: UnifiedTour) => void;
  t: (key: TranslationKey) => string;
}

const BOARD_RANK: Record<string, number> = {
  AI: 6, UAI: 5, FB: 4, HB: 3, BB: 2, RO: 1, SC: 0,
};

function findBest(tours: UnifiedTour[], field: "price" | "stars" | "board"): Set<string> {
  if (tours.length === 0) return new Set();
  const ids = new Set<string>();

  switch (field) {
    case "price": {
      const valid = tours.filter((t) => isPlausibleTourPrice(t.price));
      if (valid.length === 0) return ids;
      const min = Math.min(...valid.map((t) => t.price));
      valid.filter((t) => t.price === min).forEach((t) => ids.add(`${t.source}-${t.externalId}`));
      break;
    }
    case "stars": {
      const max = Math.max(...tours.map((t) => Number(t.stars) || 0));
      if (max === 0) return ids;
      tours.filter((t) => Number(t.stars) === max).forEach((t) => ids.add(`${t.source}-${t.externalId}`));
      break;
    }
    case "board": {
      const max = Math.max(...tours.map((t) => BOARD_RANK[t.board] ?? -1));
      if (max < 0) return ids;
      tours.filter((t) => (BOARD_RANK[t.board] ?? -1) === max).forEach((t) => ids.add(`${t.source}-${t.externalId}`));
      break;
    }
  }
  return ids;
}

export function CompareView({ tours, onRemove, onClear, onClose, onOpenDetail, t }: Props) {
  const transportLabels = getTransportLabel(t);
  const boardLabels = getBoardLabel(t);
  const bestPrice = findBest(tours, "price");
  const bestStars = findBest(tours, "stars");
  const bestBoard = findBest(tours, "board");

  const cheapest = tours.reduce((min, tour) =>
    isPlausibleTourPrice(tour.price) && tour.price < (min?.price ?? Infinity) ? tour : min,
    null as UnifiedTour | null,
  );

  return (
    <div className="compare-view">
      <div className="compare-view__header">
        <h2>Porovnání zájezdů</h2>
        <div className="compare-view__header-actions">
          <button type="button" onClick={onClear}>Vymazat vše</button>
          <button type="button" className="compare-view__close" onClick={onClose} aria-label="Zavřít">
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="compare-view__grid" style={{ gridTemplateColumns: `repeat(${tours.length}, 1fr)` }}>
        {/* Card headers */}
        {tours.map((tour) => {
          const id = `${tour.source}-${tour.externalId}`;
          return (
            <div key={id} className="compare-view__card-header">
              <img
                src={tour.image || "/placeholder-tour.svg"}
                alt={tour.title}
                className="compare-view__image"
                onError={(e) => { const img = e.currentTarget as HTMLImageElement; if (!img.dataset.fallback) { img.dataset.fallback = "1"; img.src = "/placeholder-tour.svg"; } }}
              />
              <h3>{tour.title}</h3>
              <p>{tour.destination}</p>
              {tour.stars && <span className="compare-view__stars">{starsDisplay(tour.stars)}</span>}
              <button type="button" className="compare-view__remove" onClick={() => onRemove(id)}>
                <X size={14} /> Odebrat
              </button>
            </div>
          );
        })}

        {/* Price row */}
        <div className="compare-view__row-label">Cena</div>
        {tours.map((tour) => {
          const id = `${tour.source}-${tour.externalId}`;
          const isBest = bestPrice.has(id);
          const diff = cheapest && isPlausibleTourPrice(tour.price) ? tour.price - cheapest.price : 0;
          return (
            <div key={id} className={`compare-view__cell${isBest ? " is-best" : ""}`}>
              <strong>{isPlausibleTourPrice(tour.price) ? formatPrice(tour.price) : "–"}</strong>
              {isBest && <Trophy size={14} className="compare-view__trophy" />}
              {diff > 0 && <span className="compare-view__diff">+{formatPrice(diff)}</span>}
            </div>
          );
        })}

        {/* Dates row */}
        <div className="compare-view__row-label">Termín</div>
        {tours.map((tour) => (
          <div key={`${tour.source}-${tour.externalId}`} className="compare-view__cell">
            {fmtDate(tour.startDate)} – {fmtDate(tour.endDate)}
          </div>
        ))}

        {/* Nights row */}
        <div className="compare-view__row-label">Nocí</div>
        {tours.map((tour) => (
          <div key={`${tour.source}-${tour.externalId}`} className="compare-view__cell">
            {tour.nights ?? "–"}
          </div>
        ))}

        {/* Board row */}
        <div className="compare-view__row-label">Strava</div>
        {tours.map((tour) => {
          const id = `${tour.source}-${tour.externalId}`;
          const isBest = bestBoard.has(id);
          return (
            <div key={id} className={`compare-view__cell${isBest ? " is-best" : ""}`}>
              {boardLabels[tour.board] ?? tour.board ?? "–"}
              {isBest && <Trophy size={14} className="compare-view__trophy" />}
            </div>
          );
        })}

        {/* Transport row */}
        <div className="compare-view__row-label">Doprava</div>
        {tours.map((tour) => (
          <div key={`${tour.source}-${tour.externalId}`} className="compare-view__cell">
            {transportLabels[tour.transport] ?? tour.transport}
          </div>
        ))}

        {/* Stars row */}
        <div className="compare-view__row-label">Hvězdy</div>
        {tours.map((tour) => {
          const id = `${tour.source}-${tour.externalId}`;
          const isBest = bestStars.has(id);
          return (
            <div key={id} className={`compare-view__cell${isBest ? " is-best" : ""}`}>
              {starsDisplay(tour.stars) || "–"}
              {isBest && <Trophy size={14} className="compare-view__trophy" />}
            </div>
          );
        })}

        {/* Actions row */}
        <div className="compare-view__row-label">Akce</div>
        {tours.map((tour) => (
          <div key={`${tour.source}-${tour.externalId}`} className="compare-view__cell compare-view__cell--actions">
            <button type="button" onClick={() => onOpenDetail(tour)}>Detail</button>
          </div>
        ))}
      </div>
    </div>
  );
}
