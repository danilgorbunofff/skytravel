import { useMemo, useState } from "react";
import { Calendar, Moon, Utensils, ArrowUpDown } from "lucide-react";
import { formatPrice } from "../../../utils";
import { fmtDate } from "../../../lib/formatters";
import type { UnifiedTour } from "../../../types/providers";
import type { TranslationKey } from "../../../hooks/useLanguage";

interface Props {
  offers: UnifiedTour[];
  selectedId: string;
  onSelect: (id: string) => void;
  loading: boolean;
  error?: string;
  t: (key: TranslationKey) => string;
  boardLabel: Record<string, string>;
}

type SortKey = "date" | "price" | "nights";

const MAX_INITIAL = 10;

export function OfferComparisonTable({
  offers,
  selectedId,
  onSelect,
  loading,
  error,
  t,
  boardLabel,
}: Props) {
  const [sortBy, setSortBy] = useState<SortKey>("date");
  const [showAll, setShowAll] = useState(false);

  const sorted = useMemo(() => {
    const items = [...offers];
    switch (sortBy) {
      case "price":
        items.sort((a, b) => a.price - b.price);
        break;
      case "nights":
        items.sort((a, b) => (a.nights ?? 0) - (b.nights ?? 0));
        break;
      default:
        items.sort(
          (a, b) =>
            new Date(a.startDate).getTime() - new Date(b.startDate).getTime() ||
            a.price - b.price,
        );
    }
    return items;
  }, [offers, sortBy]);

  const cheapestId = useMemo(() => {
    if (offers.length === 0) return "";
    const cheapest = offers.reduce((min, o) => (o.price < min.price ? o : min), offers[0]);
    return `${cheapest.source}-${cheapest.externalId}`;
  }, [offers]);

  const visible = showAll ? sorted : sorted.slice(0, MAX_INITIAL);
  const hiddenCount = sorted.length - MAX_INITIAL;

  if (loading) {
    return (
      <div className="offer-table__skeleton">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="offer-table__skeleton-row shimmer" />
        ))}
        <p className="offer-table__loading-text">Načítáme dostupné termíny...</p>
      </div>
    );
  }

  if (error) {
    return <p className="offer-table__error">{error}</p>;
  }

  if (offers.length === 0) {
    return <p className="offer-table__empty">{t("sModalNoDates")}</p>;
  }

  function toggleSort(key: SortKey) {
    setSortBy(key);
  }

  return (
    <div className="offer-table">
      <div className="offer-table__header">
        <button type="button" className="offer-table__sort" onClick={() => toggleSort("date")}>
          <Calendar size={12} /> Datum {sortBy === "date" && <ArrowUpDown size={10} />}
        </button>
        <button type="button" className="offer-table__sort" onClick={() => toggleSort("nights")}>
          <Moon size={12} /> Nocí {sortBy === "nights" && <ArrowUpDown size={10} />}
        </button>
        <span className="offer-table__col-label">
          <Utensils size={12} /> Strava
        </span>
        <span className="offer-table__col-label">Pokoj</span>
        <button type="button" className="offer-table__sort" onClick={() => toggleSort("price")}>
          Cena {sortBy === "price" && <ArrowUpDown size={10} />}
        </button>
      </div>

      <div className="offer-table__body">
        {visible.map((offer) => {
          const id = `${offer.source}-${offer.externalId}`;
          const isCheapest = id === cheapestId;
          const isSelected = id === selectedId;
          const nights =
            offer.nights ??
            Math.round(
              (new Date(offer.endDate).getTime() - new Date(offer.startDate).getTime()) / 86_400_000,
            );

          return (
            <button
              key={id}
              type="button"
              className={`offer-table__row${isSelected ? " is-selected" : ""}${isCheapest ? " is-cheapest" : ""}`}
              onClick={() => onSelect(id)}
            >
              <span className="offer-table__cell">
                {fmtDate(offer.startDate)} – {fmtDate(offer.endDate)}
              </span>
              <span className="offer-table__cell">
                {Number.isFinite(nights) && nights > 0 ? nights : "–"}
              </span>
              <span className="offer-table__cell">
                {boardLabel[offer.board] ?? offer.board ?? "–"}
              </span>
              <span className="offer-table__cell">
                {offer.roomType ?? "–"}
              </span>
              <span className="offer-table__cell offer-table__cell--price">
                {formatPrice(offer.price)}
                {isCheapest && <span className="offer-table__badge">Nejlevnější</span>}
              </span>
            </button>
          );
        })}
      </div>

      {!showAll && hiddenCount > 0 && (
        <button
          type="button"
          className="offer-table__show-all"
          onClick={() => setShowAll(true)}
        >
          Zobrazit všech {sorted.length} termínů
        </button>
      )}
    </div>
  );
}
