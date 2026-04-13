import type { OwnTour } from "../types";
import { Button } from "../../../components/ui/button";
import { cn } from "../../../lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
  return (
    <aside className="rounded-xl border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="text-sm font-semibold">Preview šablony</h3>
        <span className="text-xs text-muted-foreground">{previewTransportLabel}</span>
      </div>
      <div className="relative flex items-center">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute left-1 z-10 h-8 w-8 rounded-full bg-white/80"
          onClick={onPrev}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="aspect-[16/10] w-full overflow-hidden">
          <img
            src={previewPhotos[previewIndex]}
            alt="Preview"
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-1 z-10 h-8 w-8 rounded-full bg-white/80"
          onClick={onNext}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex justify-center gap-1.5 py-2">
        {previewPhotos.map((_, index) => (
          <button
            key={index}
            type="button"
            className={cn(
              "h-2 w-2 rounded-full transition-colors",
              index === previewIndex ? "bg-primary" : "bg-muted-foreground/30",
            )}
            onClick={() => setPreviewIndex(index)}
            aria-label={`Slide ${index + 1}`}
          />
        ))}
      </div>
      <div className="space-y-2 px-4 pb-4">
        <span className="inline-block rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">
          {form.title || "SkyTravel Signature"}
        </span>
        <h4 className="text-base font-bold">{form.destination || "Destinace / Hotel"}</h4>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {form.description ||
            "Tady bude krátký popis zájezdu – hlavní benefity, pro koho je určen a proč je zajímavý."}
        </p>
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div>
            <span className="text-xs text-muted-foreground">Termín</span>
            <p className="text-sm font-semibold">{previewTerm}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Cena od</span>
            <p className="text-sm font-semibold">
              {form.price ? formatPrice(Number(form.price)) : "Kč"}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
