import type { OwnTour } from "../types";
import type { TranslationKey } from "../../../hooks/useLanguage";
import { Button } from "../../../components/ui/button";
import { formatPrice } from "../../../utils";
import { ArrowUp, ArrowDown, Pencil, Trash2 } from "lucide-react";

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
    <>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{t("listOwn")}</h3>
        <Button size="sm" onClick={onSaveOrder} disabled={!orderDirty}>
          Uložit pořadí
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">Pořadí nabídek na hlavní stránce</p>

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      )}

      {!loading && ordering.length === 0 && (
        <div className="py-12 text-center">
          <p className="font-semibold">Zatím žádné nabídky</p>
          <p className="text-sm text-muted-foreground">Začněte vytvořením nové nabídky nahoře.</p>
        </div>
      )}

      {!loading && ordering.length > 0 && (
        <div className="divide-y rounded-lg border">
          {ordering.map((tour, index) => (
            <div key={tour.id} className="flex items-center gap-4 p-3">
              <img
                src={tour.image}
                alt={tour.destination}
                className="h-14 w-20 rounded-md object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{tour.destination}</p>
                <p className="truncate text-sm text-muted-foreground">{tour.title}</p>
              </div>
              <span className="whitespace-nowrap text-sm font-medium">
                od {formatPrice(Number(tour.price))}
              </span>
              <div className="flex flex-col gap-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onMoveOrder(index, -1)}
                  disabled={index === 0}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onMoveOrder(index, 1)}
                  disabled={index === ordering.length - 1}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onEdit(tour)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => onDelete(tour.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
