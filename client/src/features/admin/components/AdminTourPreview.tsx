import type { OwnTour } from "../types";
import { Button } from "../../../components/ui/button";
import { cn } from "../../../lib/utils";
import { ChevronLeft, ChevronRight, ImageOff, Eye } from "lucide-react";
import { formatPrice } from "../../../utils";

type Props = {
  form: OwnTour;
  previewPhotos: string[];
  previewIndex: number;
  setPreviewIndex: (index: number) => void;
  previewTransportLabel: string;
  previewTerm: string;
  onPrev: () => void;
  onNext: () => void;
};

export default function AdminTourPreview({
  form,
  previewPhotos,
  previewIndex,
  setPreviewIndex,
  previewTransportLabel,
  previewTerm,
  onPrev,
  onNext,
}: Props) {
  const hasPhotos = previewPhotos.length > 0;

  return (
    <aside className="sticky top-24 self-start rounded-xl border bg-card shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Náhled karty</h3>
        </div>
        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
          {previewTransportLabel}
        </span>
      </div>

      {/* Image carousel */}
      <div className="relative">
        {hasPhotos ? (
          <>
            <div className="aspect-[16/10] w-full overflow-hidden">
              <img
                src={previewPhotos[previewIndex]}
                alt="Preview"
                className="h-full w-full object-cover transition-opacity duration-300"
                loading="lazy"
              />
            </div>
            {previewPhotos.length > 1 && (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute left-1.5 top-1/2 z-10 h-8 w-8 -translate-y-1/2 rounded-full bg-white/80 shadow-sm backdrop-blur-sm hover:bg-white"
                  onClick={onPrev}
                  aria-label="Předchozí fotka"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1.5 top-1/2 z-10 h-8 w-8 -translate-y-1/2 rounded-full bg-white/80 shadow-sm backdrop-blur-sm hover:bg-white"
                  onClick={onNext}
                  aria-label="Další fotka"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/30 px-2 py-1 backdrop-blur-sm">
                  <span className="text-[10px] font-medium text-white">
                    {previewIndex + 1} / {previewPhotos.length}
                  </span>
                </div>
              </>
            )}
          </>
        ) : (
          <div className="flex aspect-[16/10] w-full flex-col items-center justify-center bg-muted/50 text-muted-foreground">
            <ImageOff className="mb-2 h-10 w-10 opacity-40" />
            <span className="text-xs">Žádné fotky</span>
          </div>
        )}
      </div>

      {/* Dot indicators */}
      {hasPhotos && previewPhotos.length > 1 && (
        <div className="flex justify-center gap-1.5 py-2">
          {previewPhotos.map((_, index) => (
            <button
              key={index}
              type="button"
              className={cn(
                "h-1.5 rounded-full transition-all",
                index === previewIndex ? "w-4 bg-primary" : "w-1.5 bg-muted-foreground/25 hover:bg-muted-foreground/40",
              )}
              onClick={() => setPreviewIndex(index)}
              aria-label={`Fotka ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Content */}
      <div className="space-y-3 px-4 pb-5 pt-3">
        <span className="inline-block rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground shadow-sm">
          {form.title || "SkyTravel Signature"}
        </span>
        <h4 className="text-base font-bold leading-snug">{form.destination || "Destinace / Hotel"}</h4>
        <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
          {form.description ||
            "Tady bude krátký popis zájezdu – hlavní benefity, pro koho je určen a proč je zajímavý."}
        </p>
        <div className="grid grid-cols-2 gap-3 rounded-lg bg-muted/40 p-3">
          <div>
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Termín</span>
            <p className="mt-0.5 text-sm font-semibold">{previewTerm}</p>
          </div>
          <div>
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Cena od</span>
            <p className="mt-0.5 text-sm font-bold text-primary">
              {form.price ? formatPrice(Number(form.price)) : "— Kč"}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
