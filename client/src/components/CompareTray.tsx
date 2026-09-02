import { useState } from "react";
import type { UnifiedTour } from "../types/providers";
import { formatPrice } from "../utils";
import { fmtDate, starsDisplay } from "../lib/formatters";
import { useLanguage } from "../hooks/useLanguage";
import { getBoardLabel, getTransportLabel } from "../features/search/constants";

function nightsOf(t: UnifiedTour): number {
  return (
    t.nights ??
    Math.round((new Date(t.endDate).getTime() - new Date(t.startDate).getTime()) / 86_400_000)
  );
}

interface Props {
  tours: UnifiedTour[];
  onRemove: (id: string) => void;
  onClear: () => void;
}

export function CompareTray({ tours, onRemove, onClear }: Props) {
  const [expanded, setExpanded] = useState(false);
  const { t } = useLanguage();

  if (tours.length === 0) return null;

  const boardLabel = getBoardLabel(t);
  const transportLabel = getTransportLabel(t);

  const rows: [string, (tour: UnifiedTour) => string][] = [
    [t("sCompareRowPrice"), (tour) => formatPrice(tour.price)],
    [t("sCompareRowDest"), (tour) => tour.destination],
    [t("sCompareRowDepart"), (tour) => fmtDate(tour.startDate)],
    [t("sCompareRowNights"), (tour) => String(nightsOf(tour))],
    [t("sCompareRowBoard"), (tour) => boardLabel[tour.board] ?? tour.board],
    [t("sCompareRowStars"), (tour) => starsDisplay(tour.stars) || "—"],
    [t("sCompareRowTransport"), (tour) => transportLabel[tour.transport] ?? tour.transport],
  ];

  return (
    <div className="compare-tray">
      <div className="compare-tray__bar">
        <span>
          {tours.length}{" "}
          {tours.length === 1
            ? t("sCompareToursOne")
            : tours.length < 5
              ? t("sCompareToursFew")
              : t("sCompareToursMany")}{" "}
          {t("sCompareTo")}
        </span>
        <button type="button" onClick={() => setExpanded((v) => !v)}>
          {expanded ? `${t("sCompareCollapse")} ▼` : `${t("sCompareExpand")} ▲`}
        </button>
        <button type="button" className="compare-tray__clear" onClick={onClear}>
          {t("sRecentSearchesClear")}
        </button>
      </div>

      {expanded && (
        <div className="compare-table-wrap">
          <table className="compare-table">
            <thead>
              <tr>
                <th>{t("sCompareLabel")}</th>
                {tours.map((tour) => (
                  <th key={tour.externalId}>
                    <span className="compare-table__title">{tour.title}</span>
                    <button
                      type="button"
                      className="compare-table__remove"
                      onClick={() => onRemove(`${tour.source}-${tour.externalId}`)}
                      aria-label={t("sCompareRemove")}
                    >
                      ✕
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(([label, val]) => (
                <tr key={label}>
                  <td>{label}</td>
                  {tours.map((t) => (
                    <td key={t.externalId}>{val(t)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
