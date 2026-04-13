import type { OwnTour } from "../types";
import type { TranslationKey } from "../../../hooks/useLanguage";
import { Button } from "../../../components/ui/button";
import { formatPrice } from "../../../utils";
import { ArrowUp, ArrowDown, Pencil, Trash2, GripVertical, Save, PackagePlus } from "lucide-react";
import { cn } from "../../../lib/utils";

type Props = {
  ordering: OwnTour[];
  loading: boolean;
  orderDirty: boolean;
  onSaveOrder: () => void;
  onMoveOrder: (index: number, direction: number) => void;
  onEdit: (tour: OwnTour) => void;
  onDelete: (id?: number) => void;
  t: (key: TranslationKey) => string;
};

export default function AdminTourOrderList({
  ordering,
  loading,
  orderDirty,
  onSaveOrder,
  onMoveOrder,
  onEdit,
  onDelete,
  t,
}: Props) {
  return (
    <div className="space-y-4">
      {/* Header with count and save */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {ordering.length} {ordering.length === 1 ? "nabídka" : ordering.length < 5 ? "nabídky" : "nabídek"}
          </span>
        </div>
        <Button
          size="sm"
          onClick={onSaveOrder}
          disabled={!orderDirty}
          className={cn("gap-2 transition-all", orderDirty && "animate-pulse")}
        >
          <Save className="h-3.5 w-3.5" />
          Uložit pořadí
        </Button>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 rounded-xl border p-3">
              <div className="h-14 w-20 animate-pulse rounded-lg bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                <div className="h-3 w-48 animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && ordering.length === 0 && (
        <div className="flex flex-col items-center rounded-xl border-2 border-dashed border-muted-foreground/20 py-16 text-center">
          <PackagePlus className="mb-3 h-12 w-12 text-muted-foreground/30" />
          <p className="text-lg font-semibold">Zatím žádné nabídky</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Začněte vytvořením nové nabídky v sekci nahoře.
          </p>
        </div>
      )}

      {/* Tour list */}
      {!loading && ordering.length > 0 && (
        <div className="space-y-2">
          {ordering.map((tour, index) => (
            <div
              key={tour.id}
              className="group flex items-center gap-3 rounded-xl border bg-card p-3 transition-all hover:border-primary/20 hover:shadow-sm sm:gap-4"
            >
              {/* Grip handle */}
              <div className="flex flex-col items-center text-muted-foreground/40">
                <GripVertical className="h-5 w-5" />
                <span className="mt-0.5 text-[10px] font-bold">{index + 1}</span>
              </div>

              {/* Thumbnail */}
              <img
                src={tour.image}
                alt={tour.destination}
                className="h-14 w-20 shrink-0 rounded-lg object-cover"
              />

              {/* Info */}
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold leading-tight">{tour.destination}</p>
                <p className="mt-0.5 truncate text-sm text-muted-foreground">{tour.title}</p>
              </div>

              {/* Price */}
              <span className="hidden whitespace-nowrap text-sm font-semibold text-primary sm:block">
                od {formatPrice(Number(tour.price))}
              </span>

              {/* Reorder buttons */}
              <div className="flex flex-col gap-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={() => onMoveOrder(index, -1)}
                  disabled={index === 0}
                  aria-label="Posunout nahoru"
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={() => onMoveOrder(index, 1)}
                  disabled={index === ordering.length - 1}
                  aria-label="Posunout dolů"
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
              </div>

              {/* Action buttons */}
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:bg-primary/10 hover:text-primary"
                  onClick={() => onEdit(tour)}
                  aria-label="Upravit nabídku"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => onDelete(tour.id)}
                  aria-label="Smazat nabídku"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
