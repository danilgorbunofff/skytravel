import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, X, ZoomIn } from "lucide-react";
import { buildSrcSet } from "../../../lib/images";
import { useLanguage } from "../../../hooks/useLanguage";

interface Props {
  photos: string[];
  alt: string;
}

export function TourGallery({ photos, alt }: Props) {
  const { t } = useLanguage();
  const [index, setIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const thumbsRef = useRef<HTMLDivElement>(null);
  const galleryRef = useRef<HTMLDivElement>(null);

  const hasMultiple = photos.length > 1;
  const currentPhoto = photos[index] ?? "/placeholder-tour.svg";

  const prev = useCallback(() => {
    setIndex((i) => (i - 1 + photos.length) % photos.length);
  }, [photos.length]);

  const next = useCallback(() => {
    setIndex((i) => (i + 1) % photos.length);
  }, [photos.length]);

  // Arrow key navigation on main gallery
  useEffect(() => {
    const el = galleryRef.current;
    if (!el || !hasMultiple) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        next();
      }
    }
    el.addEventListener("keydown", handleKey);
    return () => el.removeEventListener("keydown", handleKey);
  }, [hasMultiple, prev, next]);

  // Scroll active thumb into view
  useEffect(() => {
    const el = thumbsRef.current?.children[index] as HTMLElement | undefined;
    el?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [index]);

  return (
    <>
      <div className="tour-gallery" tabIndex={hasMultiple ? 0 : -1}>
        <div className="tour-gallery__main" onClick={() => setLightbox(true)}>
          <img
            src={currentPhoto}
            srcSet={buildSrcSet(currentPhoto)}
            sizes="(max-width: 768px) 100vw, 800px"
            alt={alt}
            loading="eager"
            decoding="async"
            width={1200}
            height={750}
            onError={(e) => {
              const img = e.currentTarget as HTMLImageElement;
              if (!img.dataset.fallback) {
                img.dataset.fallback = "1";
                img.src = "/placeholder-tour.svg";
              }
            }}
          />
          <button type="button" className="tour-gallery__zoom" aria-label={t("sGalleryZoom")}>
            <ZoomIn size={18} />
          </button>
          {hasMultiple && (
            <div className="tour-gallery__counter">
              {index + 1} / {photos.length}
            </div>
          )}
        </div>

        {hasMultiple && (
          <>
            <button
              type="button"
              className="tour-gallery__nav tour-gallery__nav--prev"
              onClick={(e) => {
                e.stopPropagation();
                prev();
              }}
              aria-label={t("sGalleryPrev")}
            >
              <ArrowLeft size={18} />
            </button>
            <button
              type="button"
              className="tour-gallery__nav tour-gallery__nav--next"
              onClick={(e) => {
                e.stopPropagation();
                next();
              }}
              aria-label={t("sGalleryNext")}
            >
              <ArrowRight size={18} />
            </button>
          </>
        )}

        {hasMultiple && (
          <div className="tour-gallery__thumbs" ref={thumbsRef}>
            {photos.slice(0, 8).map((photo, i) => (
              <button
                key={`${photo}-${i}`}
                type="button"
                className={`tour-gallery__thumb${i === index ? " is-active" : ""}`}
                onClick={() => setIndex(i)}
                aria-label={`Fotka ${i + 1}`}
              >
                <img
                  src={photo}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                    const img = e.currentTarget as HTMLImageElement;
                    if (!img.dataset.fallback) {
                      img.dataset.fallback = "1";
                      img.src = "/placeholder-tour.svg";
                    }
                  }}
                />
              </button>
            ))}
            {photos.length > 8 && (
              <button
                type="button"
                className="tour-gallery__thumb tour-gallery__thumb--more"
                onClick={() => {
                  setIndex(8);
                  setLightbox(true);
                }}
              >
                +{photos.length - 8}
              </button>
            )}
          </div>
        )}
      </div>

      {lightbox && (
        <TourGalleryLightbox
          photos={photos}
          index={index}
          onIndexChange={setIndex}
          onClose={() => setLightbox(false)}
        />
      )}
    </>
  );
}

/* ─── Lightbox ───────────────────────────────────────────── */

interface LightboxProps {
  photos: string[];
  index: number;
  onIndexChange: (i: number) => void;
  onClose: () => void;
}

function TourGalleryLightbox({ photos, index, onIndexChange, onClose }: LightboxProps) {
  const { t } = useLanguage();
  const touchStart = useRef<number | null>(null);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onIndexChange((index - 1 + photos.length) % photos.length);
      if (e.key === "ArrowRight") onIndexChange((index + 1) % photos.length);
    }
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [index, photos.length, onClose, onIndexChange]);

  function handleTouchStart(e: React.TouchEvent) {
    touchStart.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStart.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStart.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0) onIndexChange((index - 1 + photos.length) % photos.length);
      else onIndexChange((index + 1) % photos.length);
    }
    touchStart.current = null;
  }

  return (
    <div
      className="tour-lightbox"
      onClick={onClose}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <button type="button" className="tour-lightbox__close" aria-label={t("sAriaClose")}>
        <X size={24} />
      </button>
      <div className="tour-lightbox__counter">
        {index + 1} / {photos.length}
      </div>
      <img
        className="tour-lightbox__image"
        src={photos[index]}
        alt=""
        onClick={(e) => e.stopPropagation()}
        onError={(e) => {
          const img = e.currentTarget as HTMLImageElement;
          if (!img.dataset.fallback) {
            img.dataset.fallback = "1";
            img.src = "/placeholder-tour.svg";
          }
        }}
      />
      {photos.length > 1 && (
        <>
          <button
            type="button"
            className="tour-lightbox__nav tour-lightbox__nav--prev"
            onClick={(e) => {
              e.stopPropagation();
              onIndexChange((index - 1 + photos.length) % photos.length);
            }}
            aria-label={t("sAriaPrev")}
          >
            <ArrowLeft size={24} />
          </button>
          <button
            type="button"
            className="tour-lightbox__nav tour-lightbox__nav--next"
            onClick={(e) => {
              e.stopPropagation();
              onIndexChange((index + 1) % photos.length);
            }}
            aria-label={t("sAriaNext")}
          >
            <ArrowRight size={24} />
          </button>
        </>
      )}
    </div>
  );
}
