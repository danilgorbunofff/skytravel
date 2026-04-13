import type { OwnTour } from "../types";
import type { TranslationKey } from "../../../hooks/useLanguage";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { cn } from "../../../lib/utils";
import { Upload, X, ChevronLeft, ChevronRight, Plus, ImagePlus, Save, RotateCcw } from "lucide-react";

type Props = {
  form: OwnTour;
  setForm: React.Dispatch<React.SetStateAction<OwnTour>>;
  editingId: number | null;
  error: string | null;
  photos: string[];
  uploading: boolean;
  dragIndex: number | null;
  dragOverIndex: number | null;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onReset: () => void;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onMovePhoto: (index: number, direction: "left" | "right") => void;
  onRemovePhoto: (index: number) => void;
  onDragStart: (index: number, e: React.DragEvent<HTMLDivElement>) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  onDragEnter: (index: number) => void;
  onDragLeave: () => void;
  onDrop: (index: number, e: React.DragEvent<HTMLDivElement>) => void;
  onUpdateI18n: (langKey: string, field: "destination" | "title" | "description", value: string) => void;
  t: (key: TranslationKey) => string;
};

export default function AdminTourForm({
  form,
  setForm,
  editingId,
  error,
  photos,
  uploading,
  dragIndex,
  dragOverIndex,
  onSubmit,
  onReset,
  onUpload,
  onMovePhoto,
  onRemovePhoto,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDragEnter,
  onDragLeave,
  onDrop,
  onUpdateI18n,
  t,
}: Props) {
  return (
    <form id="tourForm" className="space-y-6" onSubmit={onSubmit}>
      <input id="tourId" type="hidden" value={editingId ?? ""} readOnly />

      {/* ── Basic Info ───────────────────────────────── */}
      <fieldset className="space-y-4">
        <legend className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          Základní údaje
          <span className="h-px flex-1 bg-border" />
        </legend>

        <div className="space-y-1.5">
          <Label htmlFor="destination">{t("labelDestination")}</Label>
          <Input
            id="destination"
            placeholder="např. Řecko – Korfu"
            value={form.destination}
            onChange={(e) => setForm({ ...form, destination: e.target.value })}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="title">{t("labelBadge")}</Label>
          <Input
            id="title"
            placeholder="SkyTravel Signature"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
          <p className="text-xs text-muted-foreground">Zobrazí se jako štítek na kartě nabídky</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="price">{t("labelPrice")}</Label>
          <div className="relative">
            <Input
              id="price"
              type="number"
              min={1000}
              step={10}
              className="pr-12"
              placeholder="12 990"
              value={form.price || ""}
              onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
              required
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              Kč
            </span>
          </div>
        </div>
      </fieldset>

      {/* ── Date & Transport ─────────────────────────── */}
      <fieldset className="space-y-4">
        <legend className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          Termín a doprava
          <span className="h-px flex-1 bg-border" />
        </legend>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="startDate">Datum od</Label>
            <Input
              id="startDate"
              type="date"
              value={form.startDate || ""}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="endDate">Datum do</Label>
            <Input
              id="endDate"
              type="date"
              value={form.endDate || ""}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              required
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Doprava</Label>
          <Select
            value={form.transport || "plane"}
            onValueChange={(value) => setForm({ ...form, transport: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="plane">✈️ Letecky</SelectItem>
              <SelectItem value="train">🚆 Vlakem</SelectItem>
              <SelectItem value="bus">🚌 Autobusem</SelectItem>
              <SelectItem value="car">🚗 Vlastní doprava</SelectItem>
              <SelectItem value="boat">🚢 Lodí</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </fieldset>

      {/* ── Description ──────────────────────────────── */}
      <fieldset className="space-y-4">
        <legend className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          Popis
          <span className="h-px flex-1 bg-border" />
        </legend>

        <div className="space-y-1.5">
          <Label htmlFor="description">Popis nabídky</Label>
          <Textarea
            id="description"
            rows={4}
            placeholder="Hlavní benefity, pro koho je nabídka určena, co je zajímavého..."
            value={form.description || ""}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            {(form.description || "").length}/500 znaků
          </p>
        </div>
      </fieldset>

      {/* ── Photo upload ─────────────────────────────── */}
      <fieldset className="space-y-4">
        <legend className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          Fotografie
          <span className="h-px flex-1 bg-border" />
        </legend>

        <div className="rounded-xl border-2 border-dashed border-muted-foreground/25 bg-muted/30 p-6 text-center transition-colors hover:border-primary/40 hover:bg-muted/50">
          <ImagePlus className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
          <Button type="button" variant="outline" size="sm" asChild>
            <label htmlFor="upload" className="cursor-pointer">
              <Upload className="mr-2 h-4 w-4" />
              Vybrat soubory
            </label>
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">
            Přetáhněte fotky sem nebo klikněte pro výběr • JPG, PNG, WebP
          </p>
          <input
            id="upload"
            className="sr-only"
            type="file"
            accept="image/*"
            multiple
            onChange={onUpload}
          />
        </div>

        {uploading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            Nahrávám fotky...
          </div>
        )}

        {photos.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              {photos.length} {photos.length === 1 ? "fotka" : photos.length < 5 ? "fotky" : "fotek"} • přetažením změníte pořadí
            </p>
            <div
              className="flex flex-wrap gap-3"
              onDragOver={onDragOver}
              onDragLeave={() => onDragLeave()}
            >
              {photos.map((photo, index) => (
                <div
                  key={photo}
                  className={cn(
                    "group relative h-24 w-24 overflow-hidden rounded-lg border-2 transition-all",
                    dragIndex === index && "scale-95 opacity-50",
                    dragOverIndex === index && "border-primary ring-2 ring-primary/20",
                    dragIndex !== index && dragOverIndex !== index && "border-transparent",
                    index === 0 && "ring-2 ring-primary/30",
                  )}
                  draggable
                  onDragStart={(e) => onDragStart(index, e)}
                  onDragEnd={onDragEnd}
                  onDragOver={(e) => {
                    onDragOver(e);
                    onDragEnter(index);
                  }}
                  onDrop={(e) => onDrop(index, e)}
                  onDragEnter={() => onDragEnter(index)}
                >
                  <img src={photo} alt={`Photo ${index + 1}`} className="h-full w-full cursor-grab object-cover active:cursor-grabbing" />
                  {index === 0 && (
                    <span className="absolute left-1 top-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                      Hlavní
                    </span>
                  )}
                  <button
                    type="button"
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={() => onRemovePhoto(index)}
                    onPointerDown={(e) => e.stopPropagation()}
                    aria-label="Odebrat fotku"
                  >
                    <X className="h-3 w-3" />
                  </button>
                  <div className="absolute bottom-1 left-1/2 flex -translate-x-1/2 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMovePhoto(index, "left");
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                      disabled={index === 0}
                      aria-label="Posunout vlevo"
                    >
                      <ChevronLeft className="h-3 w-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMovePhoto(index, "right");
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                      disabled={index === photos.length - 1}
                      aria-label="Posunout vpravo"
                    >
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </fieldset>

      {/* ── Translations ─────────────────────────────── */}
      <fieldset className="space-y-3 rounded-xl border bg-muted/20 p-4">
        <legend className="mb-1 flex items-center gap-2 px-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          🌐 Jazyky
        </legend>
        <div className="grid grid-cols-[40px_1fr_1fr_1fr] items-center gap-2 text-xs font-medium text-muted-foreground">
          <span />
          <span>Destinace</span>
          <span>Badge</span>
          <span>Popis</span>
        </div>
        {[
          { code: "en", label: "EN", flag: "🇬🇧" },
          { code: "uk", label: "UK", flag: "🇺🇦" },
          { code: "ru", label: "RU", flag: "🇷🇺" },
        ].map((item) => (
          <div key={item.code} className="grid grid-cols-[40px_1fr_1fr_1fr] items-center gap-2">
            <span className="text-center text-sm" title={item.label}>{item.flag}</span>
            <Input
              placeholder="Destinace"
              value={form.i18n?.[item.code]?.destination || ""}
              onChange={(e) => onUpdateI18n(item.code, "destination", e.target.value)}
            />
            <Input
              placeholder="Badge"
              value={form.i18n?.[item.code]?.title || ""}
              onChange={(e) => onUpdateI18n(item.code, "title", e.target.value)}
            />
            <Input
              placeholder="Popis"
              value={form.i18n?.[item.code]?.description || ""}
              onChange={(e) => onUpdateI18n(item.code, "description", e.target.value)}
            />
          </div>
        ))}
      </fieldset>

      {/* ── Error & Actions ──────────────────────────── */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3 border-t pt-4">
        <Button type="submit" className="gap-2">
          <Save className="h-4 w-4" />
          {editingId ? "Aktualizovat nabídku" : t("save")}
        </Button>
        <Button type="button" variant="outline" onClick={onReset} className="gap-2">
          <RotateCcw className="h-4 w-4" />
          {t("new")}
        </Button>
      </div>
    </form>
  );
}
