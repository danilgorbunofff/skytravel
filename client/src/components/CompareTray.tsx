import { useState } from "react";
import type { UnifiedTour } from "../types/providers";
import { formatPrice } from "../utils";

const boardLabel: Record<string, string> = {
  AI: "All Inclusive", UAI: "Ultra AI", FB: "Plná penze",
  HB: "Polopenze", BB: "Snídaně", RO: "Bez stravy", SC: "Bez stravy",
};
const transportLabel: Record<string, string> = {
  plane: "Letecky", bus: "Autobusem", train: "Vlakem", car: "Vlastní", boat: "Lodí",
};

function fmtDate(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString("cs-CZ");
}

function starsDisplay(value: string | undefined): string {
  const s = Number(value);
  if (!Number.isFinite(s) || s < 1 || s > 5) return "—";
  return "★".repeat(s) + "☆".repeat(5 - s);
}

function nightsOf(t: UnifiedTour): number {
  return t.nights ??
    Math.round((new Date(t.endDate).getTime() - new Date(t.startDate).getTime()) / 86_400_000);
}

interface Props {
  tours: UnifiedTour[];
  onRemove: (id: string) => void;
  onClear: () => void;
}

export function CompareTray({ tours, onRemove, onClear }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (tours.length === 0) return null;

  const rows: [string, (t: UnifiedTour) => string][] = [
    ["Cena", (t) => formatPrice(t.price)],
    ["Destinace", (t) => t.destination],
    ["Odlet", (t) => fmtDate(t.startDate)],
    ["Nocí", (t) => String(nightsOf(t))],
    ["Strava", (t) => boardLabel[t.board] ?? t.board],
    ["Hvězdy", (t) => starsDisplay(t.stars)],
    ["Doprava", (t) => transportLabel[t.transport] ?? t.transport],
  ];

  return (
    <div className="compare-tray">
      <div className="compare-tray__bar">
        <span>{tours.length} {tours.length === 1 ? "zájezd" : tours.length < 5 ? "zájezdy" : "zájezdů"} k porovnání</span>
        <button type="button" onClick={() => setExpanded((v) => !v)}>
          {expanded ? "Skrýt ▼" : "Porovnat ▲"}
        </button>
        <button type="button" className="compare-tray__clear" onClick={onClear}>
          Vymazat
        </button>
      </div>

      {expanded && (
        <div className="compare-table-wrap">
          <table className="compare-table">
            <thead>
              <tr>
                <th>Vlastnost</th>
                {tours.map((t) => (
                  <th key={t.externalId}>
                    <span className="compare-table__title">{t.title}</span>
                    <button
                      type="button"
                      className="compare-table__remove"
                      onClick={() => onRemove(`${t.source}-${t.externalId}`)}
                      aria-label="Odebrat"
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
                  {tours.map((t) => <td key={t.externalId}>{val(t)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
