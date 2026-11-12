import { useEffect, useRef, useState } from "react";
import type { UnifiedTour } from "../../types/providers";
import { formatPrice } from "../../utils";
import { fmtDate, starsDisplay } from "../../lib/formatters";
import ConfirmDialog from "../ConfirmDialog";

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

const SOURCE_COLORS: Record<string, string> = {
  alexandria: "#2563eb",
};

type Props = {
  tour: UnifiedTour | null;
  onClose: () => void;
  onImport?: (externalId: string) => unknown;
  importing?: boolean;
};

export default function TourDetailDrawer({ tour, onClose, onImport, importing }: Props) {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [confirmImportOpen, setConfirmImportOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Close on Esc (the confirm dialog handles its own Esc)
  useEffect(() => {
    if (!tour && !lightboxSrc) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || confirmImportOpen) return;
      if (lightboxSrc) setLightboxSrc(null);
      else onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tour, lightboxSrc, onClose, confirmImportOpen]);

  // Move focus into the drawer when it opens, and back to where it was on close
  const tourId = tour?.externalId;
  useEffect(() => {
    if (!tourId) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();
    return () => previouslyFocused?.focus?.();
  }, [tourId]);

  if (!tour) return null;

  return (
    <>
      <div className="alex-drawer-backdrop" onClick={onClose} />
      <aside
        className="alex-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="alex-drawer-title"
      >
        <div className="alex-drawer-header">
          <div>
            <span
              className="alex-badge"
              style={{
                background: SOURCE_COLORS[tour.source] ?? "#6b7280",
                color: "#fff",
                padding: "2px 8px",
                borderRadius: "4px",
                fontSize: "0.75rem",
                marginBottom: "0.25rem",
                display: "inline-block",
              }}
            >
              {tour.source}
            </span>
            <h2 id="alex-drawer-title">{tour.destination}</h2>
            <p>{tour.title}</p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="alex-drawer-close"
            onClick={onClose}
            aria-label="Zavřít detail"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        {/* Primary image */}
        {tour.image && (
          <div style={{ padding: "0 1rem" }}>
            <img
              src={tour.image}
              alt={tour.title}
              loading="lazy"
              style={{
                width: "100%",
                borderRadius: "8px",
                maxHeight: "220px",
                objectFit: "cover",
              }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
        )}

        {/* Photo gallery */}
        {tour.photos && tour.photos.length > 0 && (
          <div className="alex-drawer-gallery">
            <h3 style={{ padding: "0 1rem", margin: "0.75rem 0 0.25rem" }}>
              Fotografie ({tour.photos.length})
            </h3>
            <div style={{ display: "flex", gap: "0.5rem", overflowX: "auto", padding: "0 1rem" }}>
              {tour.photos.map((src, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setLightboxSrc(src)}
                  aria-label={`Zvětšit foto ${i + 1}`}
                  style={{ padding: 0, border: 0, background: "none", flexShrink: 0 }}
                >
                  <img
                    src={src}
                    alt={`${tour.title} foto ${i + 1}`}
                    loading="lazy"
                    style={{
                      width: "100px",
                      height: "75px",
                      objectFit: "cover",
                      borderRadius: "4px",
                      cursor: "pointer",
                      display: "block",
                    }}
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="alex-drawer-meta">
          <div className="alex-drawer-meta-row">
            <span>Cena</span>
            <strong className="alex-drawer-price">{formatPrice(tour.price)}</strong>
            {tour.originalPrice > tour.price && (
              <small className="alex-price-orig">{formatPrice(tour.originalPrice)}</small>
            )}
          </div>
          <div className="alex-drawer-meta-row">
            <span>Termín</span>
            <strong>
              {fmtDate(tour.startDate)} – {fmtDate(tour.endDate)}
            </strong>
          </div>
          {tour.nights !== undefined && (
            <div className="alex-drawer-meta-row">
              <span>Počet nocí</span>
              <strong>{tour.nights}</strong>
            </div>
          )}
          <div className="alex-drawer-meta-row">
            <span>Doprava</span>
            <strong>{transportLabel[tour.transport] ?? tour.transport}</strong>
          </div>
          {tour.board && (
            <div className="alex-drawer-meta-row">
              <span>Strava</span>
              <strong>{boardLabel[tour.board] ?? tour.board}</strong>
            </div>
          )}
          {tour.roomType && (
            <div className="alex-drawer-meta-row">
              <span>Typ pokoje</span>
              <strong>{tour.roomType}</strong>
            </div>
          )}
          {starsDisplay(tour.stars) && (
            <div className="alex-drawer-meta-row">
              <span>Kategorie</span>
              <strong>{starsDisplay(tour.stars)}</strong>
            </div>
          )}
          {tour.adults !== undefined && (
            <div className="alex-drawer-meta-row">
              <span>Dospělí / Děti</span>
              <strong>
                {tour.adults} + {tour.children ?? 0}
              </strong>
            </div>
          )}
          {tour.offersCount !== undefined && tour.offersCount > 1 && (
            <div className="alex-drawer-meta-row">
              <span>Nabídek</span>
              <strong>{tour.offersCount}</strong>
            </div>
          )}
        </div>

        {/* Description */}
        {tour.description && (
          <div className="alex-drawer-desc">
            <h3>Popis</h3>
            <p>{tour.description}</p>
          </div>
        )}

        {/* Actions */}
        <div className="alex-drawer-actions">
          {tour.url && (
            <a
              href={tour.url}
              target="_blank"
              rel="noopener noreferrer"
              className="alex-drawer-btn alex-drawer-btn--link"
            >
              ↗ Zobrazit na {tour.source}
            </a>
          )}
          {onImport && (
            <button
              type="button"
              className="alex-drawer-btn alex-drawer-btn--import"
              disabled={importing}
              onClick={() => setConfirmImportOpen(true)}
            >
              {importing ? "Importuji…" : "Importovat tento zájezd"}
            </button>
          )}
        </div>
      </aside>

      {/* Lightbox */}
      {lightboxSrc && (
        <div className="alex-lightbox" onClick={() => setLightboxSrc(null)}>
          <img src={lightboxSrc} alt={`${tour.title} – zvětšená fotografie`} />
          <button type="button" className="alex-lightbox-close" aria-label="Zavřít fotografii">
            <span aria-hidden="true">×</span>
          </button>
        </div>
      )}

      {/* Confirm import */}
      <ConfirmDialog
        isOpen={confirmImportOpen}
        title="Importovat zájezd?"
        message="Opravdu chcete importovat tento zájezd do databáze SkyTravel? Zájezd bude dostupný na hlavním webu."
        confirmLabel="Importovat"
        tone="default"
        loading={importing}
        onConfirm={async () => {
          await onImport?.(tour.externalId);
          setConfirmImportOpen(false);
        }}
        onCancel={() => setConfirmImportOpen(false)}
      />
    </>
  );
}
