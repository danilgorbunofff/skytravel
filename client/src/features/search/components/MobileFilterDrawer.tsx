import { useCallback, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import type { TranslationKey } from "../../../hooks/useLanguage";
import type { SearchFilterState } from "../hooks/useSearchFilters";
import type { PublicDestinationSummary } from "../../../types/providers";
import { SearchFilters } from "./SearchFilters";
import { useFocusTrap, useEscapeKey } from "../hooks/useFocusTrap";

interface Props {
  t: (key: TranslationKey) => string;
  open: boolean;
  onClose: () => void;
  filters: SearchFilterState;
  destinations: PublicDestinationSummary[];
  destinationsStatus: "loading" | "error" | "ready";
  destinationsError: string | null;
  onRetryDestinations: () => void;
  naturalPriceRange: { min: number; max: number };
  priceRange: { min: number; max: number };
  priceMin: number;
  priceMax: number;
  hasResults: boolean;
  favoritesCount: number;
  showFavoritesOnly: boolean;
  onToggleFavoritesOnly: () => void;
  onReset: () => void;
  filteredCount: number | null;
}

export function MobileFilterDrawer({
  t,
  open,
  onClose,
  filters,
  destinations,
  destinationsStatus,
  destinationsError,
  onRetryDestinations,
  naturalPriceRange,
  priceRange,
  priceMin,
  priceMax,
  hasResults,
  favoritesCount,
  showFavoritesOnly,
  onToggleFavoritesOnly,
  onReset,
  filteredCount,
}: Props) {
  const drawerRef = useFocusTrap(open);
  useEscapeKey(() => onClose(), open);
  const startY = useRef(0);
  const currentTranslate = useRef(0);
  const isDragging = useRef(false);
  const [translateY, setTranslateY] = useState(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches[0].clientY < 60) {
      isDragging.current = true;
      startY.current = e.touches[0].clientY;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current) return;
    const deltaY = e.touches[0].clientY - startY.current;
    if (deltaY <= 0) return;
    const percent = Math.min(80, (deltaY / window.innerHeight) * 100);
    setTranslateY(percent);
    currentTranslate.current = percent;
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    if (currentTranslate.current > 25) {
      onClose();
    }
    setTranslateY(0);
    currentTranslate.current = 0;
  }, [onClose]);

  if (!open) return null;

  return (
    <>
      <div
        className="mobile-filter-backdrop"
        onClick={onClose}
        aria-hidden="true"
        style={{ animation: "fadeIn 0.2s ease" }}
      />
      <div
        ref={drawerRef}
        className="mobile-filter-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={t("sDrawerTitle")}
        style={{ transform: `translateY(${translateY}%)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="mobile-filter-drawer__swipe-handle">
          <div className="mobile-filter-drawer__swipe-bar" />
        </div>
        <div className="mobile-filter-drawer__header">
          <h2>{t("sDrawerTitle")}</h2>
          <button type="button" onClick={onClose} aria-label={t("sDrawerClose")}>
            ✕
          </button>
        </div>
        <div className="mobile-filter-drawer__body">
          <SearchFilters
            t={t}
            filters={filters}
            destinations={destinations}
            destinationsStatus={destinationsStatus}
            destinationsError={destinationsError}
            onRetryDestinations={onRetryDestinations}
            naturalPriceRange={naturalPriceRange}
            priceRange={priceRange}
            priceMin={priceMin}
            priceMax={priceMax}
            hasResults={hasResults}
            favoritesCount={favoritesCount}
            showFavoritesOnly={showFavoritesOnly}
            onToggleFavoritesOnly={onToggleFavoritesOnly}
            onReset={() => {
              onReset();
              onClose();
            }}
            showContactCta={false}
          />
        </div>
        <div className="mobile-filter-drawer__footer">
          <div className="mobile-filter-drawer__footer-actions">
            <button
              type="button"
              className="mobile-filter-drawer__reset"
              onClick={() => { onReset(); onClose(); }}
            >
              <RotateCcw size={14} />
              {t("sFilterReset")}
            </button>
            <button type="button" className="btn-primary" onClick={onClose}>
              {t("sDrawerApplyPrefix")}{" "}
              {filteredCount != null ? filteredCount.toLocaleString("cs-CZ") : ""}{" "}
              {t("sStickyOffers")}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
