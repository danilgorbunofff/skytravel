import { useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { CacheStatus, UnifiedTour } from "../../types/providers";
import { formatPrice } from "../../utils";
import { fmtDate, starsDisplay } from "../../lib/formatters";

// ── Labels ────────────────────────────────────────────────────────────────
const boardLabel: Record<string, string> = {
  AI: "All Inclusive",
  UAI: "Ultra All Inclusive",
  FB: "Plná penze",
  HB: "Polopenze",
  BB: "Pouze snídaně",
  RO: "Bez stravy",
  SC: "Bez stravy",
};

const transportLabel: Record<string, string> = {
  plane: "✈ Letecky",
  bus: "🚌 Autobusem",
  train: "🚆 Vlakem",
  car: "🚗 Vlastní",
  boat: "🚢 Lodí",
};

const PLACEHOLDER_COLORS = [
  "#e74c3c",
  "#3498db",
  "#2ecc71",
  "#e67e22",
  "#9b59b6",
  "#1abc9c",
  "#f39c12",
  "#d35400",
  "#2980b9",
  "#c0392b",
];

const placeholderColor = (dest: string) =>
  PLACEHOLDER_COLORS[dest.charCodeAt(0) % PLACEHOLDER_COLORS.length];

// ── Types ─────────────────────────────────────────────────────────────────
type VisibleColumns = {
  nights: boolean;
  pax: boolean;
  stars: boolean;
  board: boolean;
};

type Props = {
  tours: UnifiedTour[];
  loading: boolean;
  error: string | null;
  selected: Set<string>;
  visibleColumns: VisibleColumns;
  sortBy: "price" | "date";
  sortDir: "asc" | "desc";
  page: number;
  totalPages: number;
  limit: number;
  filteredCount: number;
  cacheStatus: CacheStatus | null;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onSortToggle: (field: "price" | "date") => void;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  onTourClick: (tour: UnifiedTour) => void;
};

// ── Helpers ────────────────────────────────────────────────────────────────
function pageNumbers(current: number, total: number): (number | "…")[] {
  const pages: (number | "…")[] = [];
  const range = 2;
  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= current - range && i <= current + range)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "…") {
      pages.push("…");
    }
  }
  return pages;
}

function sortIcon(sortBy: string, sortDir: string, field: string): string {
  return sortBy === field ? (sortDir === "asc" ? " ↑" : " ↓") : "";
}

// ── Component ──────────────────────────────────────────────────────────────
export default function TourDataTable({
  tours,
  loading,
  error,
  selected,
  visibleColumns,
  sortBy,
  sortDir,
  page,
  totalPages,
  limit,
  filteredCount,
  cacheStatus,
  onToggleSelect,
  onToggleSelectAll,
  onSortToggle,
  onPageChange,
  onLimitChange,
  onTourClick,
}: Props) {
  const gridCols = useMemo(() => {
    const c = ["40px", "56px", "1.4fr", "90px", "160px"];
    if (visibleColumns.nights) c.push("50px");
    if (visibleColumns.pax) c.push("55px");
    if (visibleColumns.board) c.push("110px");
    if (visibleColumns.stars) c.push("50px");
    c.push("110px"); // transport (always)
    c.push("44px"); // link (always)
    return c.join(" ");
  }, [visibleColumns]);

  const parentRef = useRef<HTMLDivElement>(null);
  const useVirtual = tours.length > 100;
  const virtualizer = useVirtual
    ? useVirtualizer({
        count: tours.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 72,
        overscan: 10,
      })
    : null;

  return (
    <section className="admin-card">
      <h2>Výsledky</h2>

      {/* Error */}
      {error && (
        <p className="note" style={{ color: "#d32f2f" }}>
          {error}
        </p>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="table-skeleton">
          <div className="skeleton-row" />
          <div className="skeleton-row" />
          <div className="skeleton-row" />
          <div className="skeleton-row" />
        </div>
      )}

      {/* Empty state */}
      {!loading && tours.length === 0 && (
        <div className="empty-state">
          <strong>Žádné nabídky</strong>
          <p>
            {!cacheStatus?.warm
              ? "Data se načítají… Zkuste obnovit feed tlačítkem ↻."
              : "Zkuste změnit filtry nebo obnovte feed tlačítkem ↻."}
          </p>
        </div>
      )}

      {/* Tour table */}
      {!loading && tours.length > 0 && (
        <div
          className="alex-table-wrap"
          style={{ "--alex-grid-cols": gridCols } as React.CSSProperties}
        >
          <div className="alex-table-header">
            <span className="alex-col-check">
              <input
                type="checkbox"
                checked={selected.size === tours.length && tours.length > 0}
                onChange={onToggleSelectAll}
              />
            </span>
            <span className="alex-col-img">Foto</span>
            <span className="alex-col-dest">Destinace / Hotel</span>
            <button
              type="button"
              className="alex-col-price alex-sort-btn"
              onClick={() => onSortToggle("price")}
            >
              Cena{sortIcon(sortBy, sortDir, "price")}
            </button>
            <button
              type="button"
              className="alex-col-dates alex-sort-btn"
              onClick={() => onSortToggle("date")}
            >
              Termín{sortIcon(sortBy, sortDir, "date")}
            </button>
            {visibleColumns.nights && <span className="alex-col-transport">Nocí</span>}
            {visibleColumns.pax && <span className="alex-col-people">Osoby</span>}
            {visibleColumns.board && <span className="alex-col-transport">Strava</span>}
            {visibleColumns.stars && <span className="alex-col-transport">Hvězdy</span>}
            <span className="alex-col-transport">Doprava</span>
            <span className="alex-col-link" />
          </div>

          {useVirtual && virtualizer ? (
            <div
              ref={parentRef}
              style={{ gridColumn: "1 / -1", height: "600px", overflow: "auto" }}
            >
              <div
                style={{
                  height: `${virtualizer.getTotalSize()}px`,
                  width: "100%",
                  position: "relative",
                }}
              >
                {virtualizer.getVirtualItems().map((virtualRow) => {
                  const tour = tours[virtualRow.index];
                  return (
                    <div
                      key={virtualRow.key}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: `${virtualRow.size}px`,
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    >
                      <div
                        className={`alex-table-row${selected.has(tour.externalId) ? " is-selected" : ""}`}
                        onClick={(e) => {
                          const target = e.target as HTMLElement;
                          if (target.closest("input, a")) return;
                          onTourClick(tour);
                        }}
                        style={{ cursor: "pointer" }}
                      >
                        <span className="alex-col-check">
                          <input
                            type="checkbox"
                            checked={selected.has(tour.externalId)}
                            onChange={() => onToggleSelect(tour.externalId)}
                          />
                        </span>
                        <span className="alex-col-img">
                          {tour.image ? (
                            <img
                              src={tour.image}
                              alt={tour.destination}
                              loading="lazy"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                              }}
                            />
                          ) : (
                            <div
                              className="alex-no-img"
                              style={{ background: placeholderColor(tour.destination) }}
                            >
                              {tour.destination.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </span>
                        <span className="alex-col-dest">
                          <strong>{tour.destination}</strong>
                          <small>{tour.title}</small>
                          <span className="alex-row-meta">
                            <span
                              className="alex-badge"
                              style={{
                                background: tour.source === "alexandria" ? "#dbeafe" : "#dcfce7",
                                color: tour.source === "alexandria" ? "#1d4ed8" : "#15803d",
                                fontSize: "0.65rem",
                              }}
                            >
                              {tour.source}
                            </span>
                            {tour.offersCount && tour.offersCount > 1 && (
                              <span className="alex-badge alex-badge--offers">
                                {tour.offersCount} nabídek
                              </span>
                            )}
                            {starsDisplay(tour.stars) && (
                              <span className="alex-badge alex-badge--stars">
                                {starsDisplay(tour.stars)}
                              </span>
                            )}
                            {tour.board && (
                              <span className="alex-badge alex-badge--board">
                                {boardLabel[tour.board] ?? tour.board}
                              </span>
                            )}
                          </span>
                        </span>
                        <span className="alex-col-price">
                          <strong>{formatPrice(tour.price)}</strong>
                          {tour.originalPrice > tour.price && (
                            <small className="alex-price-orig">{formatPrice(tour.originalPrice)}</small>
                          )}
                        </span>
                        <span className="alex-col-dates">
                          {fmtDate(tour.startDate)} – {fmtDate(tour.endDate)}
                        </span>
                        {visibleColumns.nights && (
                          <span className="alex-col-transport">{tour.nights ?? "–"}</span>
                        )}
                        {visibleColumns.pax && (
                          <span className="alex-col-people">
                            {tour.adults !== undefined ? `${tour.adults}+${tour.children ?? 0}` : "–"}
                          </span>
                        )}
                        {visibleColumns.board && (
                          <span className="alex-col-transport">
                            {(boardLabel[tour.board] ?? tour.board) || "–"}
                          </span>
                        )}
                        {visibleColumns.stars && (
                          <span className="alex-col-transport">{starsDisplay(tour.stars) || "–"}</span>
                        )}
                        <span className="alex-col-transport">
                          {transportLabel[tour.transport] ?? tour.transport}
                        </span>
                        <span className="alex-col-link">
                          {tour.url && (
                            <a
                              href={tour.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="alex-link-btn"
                              title="Otevřít nabídku"
                            >
                              ↗
                            </a>
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            tours.map((tour) => (
              <div
                key={tour.externalId || `${tour.destination}-${tour.startDate}`}
                className={`alex-table-row${selected.has(tour.externalId) ? " is-selected" : ""}`}
                onClick={(e) => {
                  const target = e.target as HTMLElement;
                  if (target.closest("input, a")) return;
                  onTourClick(tour);
                }}
                style={{ cursor: "pointer" }}
              >
                <span className="alex-col-check">
                  <input
                    type="checkbox"
                    checked={selected.has(tour.externalId)}
                    onChange={() => onToggleSelect(tour.externalId)}
                  />
                </span>
                <span className="alex-col-img">
                  {tour.image ? (
                    <img
                      src={tour.image}
                      alt={tour.destination}
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div
                      className="alex-no-img"
                      style={{ background: placeholderColor(tour.destination) }}
                    >
                      {tour.destination.charAt(0).toUpperCase()}
                    </div>
                  )}
                </span>
                <span className="alex-col-dest">
                  <strong>{tour.destination}</strong>
                  <small>{tour.title}</small>
                  <span className="alex-row-meta">
                    <span
                      className="alex-badge"
                      style={{
                        background: tour.source === "alexandria" ? "#dbeafe" : "#dcfce7",
                        color: tour.source === "alexandria" ? "#1d4ed8" : "#15803d",
                        fontSize: "0.65rem",
                      }}
                    >
                      {tour.source}
                    </span>
                    {tour.offersCount && tour.offersCount > 1 && (
                      <span className="alex-badge alex-badge--offers">
                        {tour.offersCount} nabídek
                      </span>
                    )}
                    {starsDisplay(tour.stars) && (
                      <span className="alex-badge alex-badge--stars">
                        {starsDisplay(tour.stars)}
                      </span>
                    )}
                    {tour.board && (
                      <span className="alex-badge alex-badge--board">
                        {boardLabel[tour.board] ?? tour.board}
                      </span>
                    )}
                  </span>
                </span>
                <span className="alex-col-price">
                  <strong>{formatPrice(tour.price)}</strong>
                  {tour.originalPrice > tour.price && (
                    <small className="alex-price-orig">{formatPrice(tour.originalPrice)}</small>
                  )}
                </span>
                <span className="alex-col-dates">
                  {fmtDate(tour.startDate)} – {fmtDate(tour.endDate)}
                </span>
                {visibleColumns.nights && (
                  <span className="alex-col-transport">{tour.nights ?? "–"}</span>
                )}
                {visibleColumns.pax && (
                  <span className="alex-col-people">
                    {tour.adults !== undefined ? `${tour.adults}+${tour.children ?? 0}` : "–"}
                  </span>
                )}
                {visibleColumns.board && (
                  <span className="alex-col-transport">
                    {(boardLabel[tour.board] ?? tour.board) || "–"}
                  </span>
                )}
                {visibleColumns.stars && (
                  <span className="alex-col-transport">{starsDisplay(tour.stars) || "–"}</span>
                )}
                <span className="alex-col-transport">
                  {transportLabel[tour.transport] ?? tour.transport}
                </span>
                <span className="alex-col-link">
                  {tour.url && (
                    <a
                      href={tour.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="alex-link-btn"
                      title="Otevřít nabídku"
                    >
                      ↗
                    </a>
                  )}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Pagination / rows-per-page */}
      {!loading && tours.length > 0 && (
        <div className="alex-pagination">
          {totalPages > 1 && (
            <>
              <button
                type="button"
                className="alex-page-btn"
                disabled={page <= 1}
                onClick={() => onPageChange(page - 1)}
              >
                ← Předchozí
              </button>

              <div className="alex-page-numbers">
                {pageNumbers(page, totalPages).map((p, i) =>
                  p === "…" ? (
                    <span key={`ellipsis-${i}`} className="alex-page-ellipsis">
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      type="button"
                      className={`alex-page-num${p === page ? " is-active" : ""}`}
                      onClick={() => onPageChange(p)}
                    >
                      {p}
                    </button>
                  ),
                )}
              </div>

              <button
                type="button"
                className="alex-page-btn"
                disabled={page >= totalPages}
                onClick={() => onPageChange(page + 1)}
              >
                Další →
              </button>
            </>
          )}

          <select
            className="alex-page-limit"
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
          >
            <option value={25}>25 / stránka</option>
            <option value={50}>50 / stránka</option>
            <option value={100}>100 / stránka</option>
          </select>
        </div>
      )}
    </section>
  );
}
