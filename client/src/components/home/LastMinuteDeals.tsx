import { useCallback, useEffect, useMemo, useRef } from "react";
import type { AlexandriaLastMinuteItem } from "../../api";
import type { TranslationKey } from "../../hooks/useLanguage";
import { formatPrice } from "../../utils";
import { EmptyState } from "../EmptyState";
import { Skeleton } from "../Skeleton";

interface Props {
  lastMinuteItems: AlexandriaLastMinuteItem[];
  loading?: boolean;
  onItemClick: (item: AlexandriaLastMinuteItem) => void;
  t: (key: TranslationKey) => string;
}

/** Inline SVG fallback when a hotel image is missing or broken */
const FALLBACK_IMG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='240' viewBox='0 0 400 240'%3E%3Crect fill='%23eef1f6' width='400' height='240'/%3E%3Ctext fill='%239aa4b8' font-family='Manrope,sans-serif' font-size='16' font-weight='600' text-anchor='middle' x='200' y='120'%3ESkyTravel%3C/text%3E%3Ctext fill='%23bcc5d4' font-family='Manrope,sans-serif' font-size='12' text-anchor='middle' x='200' y='142'%3EHotel photo%3C/text%3E%3C/svg%3E";

const AUTO_SCROLL_MS = 5000;

/** Format start/end ISO date strings as compact "DD.MM. – DD.MM." */
function formatRange(start: string, end: string): string {
  try {
    const s = new Date(start);
    const e = new Date(end);
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return "";
    const fmt = (d: Date) =>
      d.toLocaleDateString("cs-CZ", { day: "2-digit", month: "2-digit" });
    return `${fmt(s)} – ${fmt(e)}`;
  } catch {
    return "";
  }
}

/** Group items into pairs of 2 */
function chunkPairs(items: AlexandriaLastMinuteItem[]): AlexandriaLastMinuteItem[][] {
  const pairs: AlexandriaLastMinuteItem[][] = [];
  for (let i = 0; i < items.length; i += 2) {
    pairs.push(items.slice(i, i + 2));
  }
  return pairs;
}

function CardSkeleton() {
  return (
    <div className="lm-card" aria-hidden="true">
      <div className="lm-card__photo">
        <Skeleton className="h-full w-full rounded-none" />
      </div>
      <div className="lm-card__body">
        <div className="hotel-topline">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>
        <Skeleton className="mt-1 h-5 w-3/4" />
        <Skeleton className="mt-0.5 h-4 w-1/2" />
        <Skeleton className="mt-2 h-3 w-2/3" />
        <Skeleton className="mt-auto h-9 w-full rounded-lg" />
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="lm-carousel" aria-busy="true">
      <div className="lm-track">
        <div className="lm-slide">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    </div>
  );
}

function renderCard(
  item: AlexandriaLastMinuteItem,
  t: (key: TranslationKey) => string,
  onClick: (item: AlexandriaLastMinuteItem) => void,
  isClone?: boolean,
) {
  const starsNum = Number(item.stars) || 0;
  const hasOriginalPrice = item.originalPrice > 0 && item.originalPrice > item.price;

  return (
    <article
      className="lm-card"
      role="button"
      tabIndex={isClone ? -1 : 0}
      aria-hidden={isClone || undefined}
      onClick={() => onClick(item)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick(item);
        }
      }}
    >
      <div className="lm-card__photo">
        <img
          src={item.image || FALLBACK_IMG}
          alt={item.title}
          loading="lazy"
          decoding="async"
          width={400}
          height={240}
          onError={(e) => {
            const el = e.currentTarget;
            if (el.src !== FALLBACK_IMG) {
              el.src = FALLBACK_IMG;
              el.classList.add("lm-card__img-fallback");
            }
          }}
        />
      </div>

      <div className="lm-card__body">
        <div className="hotel-topline">
          <span
            className="stars"
            aria-label={starsNum > 0 ? `${starsNum} out of 5 stars` : undefined}
          >
            {starsNum > 0
              ? "\u2605".repeat(starsNum) + "\u2606".repeat(5 - starsNum)
              : ""}
          </span>
          {item.board ? (
            <span className="hotel-board-badge">{item.board}</span>
          ) : null}
        </div>

        <h3 title={item.title}>{item.title}</h3>

        <p className="hotel-meta" title={item.destination}>
          {item.destination}
        </p>

        <div className="hotel-info">
          <div className="hotel-line">
            <span>{formatRange(item.startDate, item.endDate)}</span>
          </div>
          {item.transport ? (
            <div className="hotel-line">
              <span>{item.transport}</span>
            </div>
          ) : null}
        </div>

        <div className="hotel-price">
          {t("from")} {formatPrice(item.price)}
          {hasOriginalPrice ? (
            <span className="hotel-price__original">
              {formatPrice(item.originalPrice)}
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export default function LastMinuteDeals({
  lastMinuteItems,
  loading,
  onItemClick,
  t,
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);
  const rAFRef = useRef<number | null>(null);
  const cooldownRef = useRef(0);

  // Split into pairs
  const pairs = useMemo(() => chunkPairs(lastMinuteItems), [lastMinuteItems]);

  // Clone-sandwich: [cloneLastPair, ...realPairs, cloneFirstPair]
  const slides = useMemo(() => {
    if (pairs.length === 0) return [];
    if (pairs.length === 1) return pairs;
    return [pairs[pairs.length - 1], ...pairs, pairs[0]];
  }, [pairs]);

  // Hover pause handlers
  const pauseAuto = useCallback(() => { pausedRef.current = true; }, []);
  const resumeAuto = useCallback(() => { pausedRef.current = false; }, []);

  // Safe rAF helper that gets cleaned up on unmount
  const scheduleRAF = useCallback((fn: () => void) => {
    rAFRef.current = requestAnimationFrame(() => {
      rAFRef.current = null;
      fn();
    });
  }, []);

  // Manual navigation (with cooldown to prevent auto-scroll race)
  const goNext = useCallback(() => {
    cooldownRef.current = Date.now();
    trackRef.current?.scrollBy({ left: trackRef.current.clientWidth, behavior: "smooth" });
  }, []);

  const goPrev = useCallback(() => {
    cooldownRef.current = Date.now();
    trackRef.current?.scrollBy({ left: -trackRef.current!.clientWidth, behavior: "smooth" });
  }, []);

  // Initialize scroll position to first real slide (past clone)
  useEffect(() => {
    const track = trackRef.current;
    if (!track || slides.length < 3) return;
    track.classList.add("no-smooth");
    track.scrollLeft = track.clientWidth;
    scheduleRAF(() => track.classList.remove("no-smooth"));
  }, [slides, scheduleRAF]);

  // Auto-scroll interval
  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mql.matches) return;
    if (slides.length < 3) return;

    const id = setInterval(() => {
      if (pausedRef.current) return;
      if (Date.now() - cooldownRef.current < 2000) return;
      goNext();
    }, AUTO_SCROLL_MS);

    return () => clearInterval(id);
  }, [slides.length, goNext]);

  // Infinite loop boundary detection
  const handleScroll = useCallback(() => {
    const track = trackRef.current;
    if (!track || slides.length < 3) return;

    const sw = track.clientWidth;
    const left = track.scrollLeft;

    // Clones are at index 0 (last pair clone) and slides.length-1 (first pair clone)
    const realFirstAt = sw;                        // scrollLeft for real pair 0
    const realLastAt = sw * (slides.length - 2);    // scrollLeft for real last pair

    if (left < sw / 2) {
      // Scrolled into clone at start → jump to real last pair
      track.classList.add("no-smooth");
      track.scrollLeft = realLastAt;
      scheduleRAF(() => track.classList.remove("no-smooth"));
    } else if (left > realLastAt + sw / 2) {
      // Scrolled into clone at end → jump to real first pair (always, not gated)
      track.classList.add("no-smooth");
      track.scrollLeft = realFirstAt;
      scheduleRAF(() => track.classList.remove("no-smooth"));
    }
  }, [slides.length, scheduleRAF]);

  // Disable snap during jumps to prevent browser fighting
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const observer = new MutationObserver(() => {
      if (track.classList.contains("no-smooth")) {
        track.style.scrollSnapType = "none";
      } else {
        track.style.scrollSnapType = "";
      }
    });
    observer.observe(track, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  // Cleanup rAF on unmount
  useEffect(() => {
    return () => {
      if (rAFRef.current !== null) {
        cancelAnimationFrame(rAFRef.current);
        rAFRef.current = null;
      }
    };
  }, []);

  // ── Render ──────────────────────────────────────────────────
  if (loading) {
    return (
      <section id="lastminute" className="section section-soft">
        <div className="container">
          <article className="last-minute-card">
            <h3>{t("sectionLastMinute")}</h3>
            <LoadingState />
          </article>
        </div>
      </section>
    );
  }

  if (pairs.length === 0) {
    return (
      <section id="lastminute" className="section section-soft">
        <div className="container">
          <article className="last-minute-card">
            <h3>{t("sectionLastMinute")}</h3>
            <EmptyState title={t("emptyState")} />
          </article>
        </div>
      </section>
    );
  }

  const showArrows = pairs.length > 1;

  return (
    <section id="lastminute" className="section section-soft">
      <div className="container">
        <article className="last-minute-card">
          <h3>{t("sectionLastMinute")}</h3>

          <div
            className="lm-carousel"
            onMouseEnter={pauseAuto}
            onMouseLeave={resumeAuto}
          >
            {showArrows && (
              <button
                type="button"
                className="lm-nav lm-nav--prev"
                onClick={goPrev}
                aria-label="Previous"
              >
                ‹
              </button>
            )}

            <div
              className="lm-track"
              ref={trackRef}
              onScroll={handleScroll}
            >
              {slides.map((pair, slideIdx) => {
                const isClone = slides.length > 2 && (slideIdx === 0 || slideIdx === slides.length - 1);
                return (
                  <div
                    className="lm-slide"
                    key={isClone ? `clone-${slideIdx}` : `real-${slideIdx}`}
                    aria-hidden={isClone || undefined}
                  >
                    {pair.map((item, cardIdx) =>
                      cardIdx < pair.length ? (
                        <div
                          key={`${isClone ? "clone-" : "real-"}${item.externalId}`}
                          style={{ flex: "1 1 0", minWidth: 0 }}
                        >
                          {renderCard(item, t, onItemClick, isClone)}
                        </div>
                      ) : (
                        <div
                          key={`empty-${cardIdx}`}
                          className="lm-card lm-card--empty"
                          aria-hidden="true"
                          style={{ flex: "1 1 0", minWidth: 0 }}
                        />
                      ),
                    )}
                  </div>
                );
              })}
            </div>

            {showArrows && (
              <button
                type="button"
                className="lm-nav lm-nav--next"
                onClick={goNext}
                aria-label="Next"
              >
                ›
              </button>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}
