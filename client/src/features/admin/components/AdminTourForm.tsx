import type { OwnTour } from "../types";
import type { TranslationKey } from "../../../hooks/useLanguage";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { cn } from "../../../lib/utils";
import { Upload, X, ChevronLeft, ChevronRight, Plus } from "lucide-react";

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
    <form id="tourForm" className="space-y-4" onSubmit={onSubmit}>
      <input id="tourId" type="hidden" value={editingId ?? ""} readOnly />

      <div className="space-y-2">
        <Label htmlFor="destination">{t("labelDestination")}</Label>
        <Input
          id="destination"
          value={form.destination}
          onChange={(e) => setForm({ ...form, destination: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">{t("labelBadge")}</Label>
        <Input
          id="title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="price">{t("labelPrice")}</Label>
        <Input
          id="price"
          type="number"
          min={1000}
          step={10}
          value={form.price || ""}
          onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startDate">Od</Label>
          <Input
            id="startDate"
            type="date"
            value={form.startDate || ""}
            onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endDate">Do</Label>
          <Input
            id="endDate"
            type="date"
            value={form.endDate || ""}
            onChange={(e) => setForm({ ...form, endDate: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Doprava</Label>
        <Select
          value={form.transport || "plane"}
          onValueChange={(value) => setForm({ ...form, transport: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="plane">Letecky</SelectItem>
            <SelectItem value="train">Vlakem</SelectItem>
            <SelectItem value="bus">Autobusem</SelectItem>
            <SelectItem value="car">Vlastní doprava</SelectItem>
            <SelectItem value="boat">Lodí</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Popis</Label>
        <Textarea
          id="description"
          rows={3}
          value={form.description || ""}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </div>

      {/* ── Photo upload ──────────────────────────────── */}
      <div className="space-y-3">
        <Label>Upload fotek</Label>
        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" size="sm" asChild>
            <label htmlFor="upload" className="cursor-pointer">
              <Upload className="mr-2 h-4 w-4" />
              Vybrat soubory
            </label>
          </Button>
          <span className="text-sm text-muted-foreground">nebo přetáhněte fotky sem</span>
          <input
            id="upload"
            className="sr-only"
            type="file"
            accept="image/*"
            multiple
            onChange={onUpload}
          />
        </div>
        {uploading && <p className="text-sm text-muted-foreground">Nahrávám...</p>}
        {photos.length > 0 && (
          <div
            className="flex flex-wrap gap-3"
            onDragOver={onDragOver}
            onDragLeave={() => onDragLeave()}
          >
            {photos.map((photo, index) => (
              <div
                key={photo}
                className={cn(
                  "group relative h-24 w-24 overflow-hidden rounded-lg border-2 border-transparent transition-all",
                  dragIndex === index && "opacity-50",
                  dragOverIndex === index && "border-primary",
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
                <img src={photo} alt={`Photo ${index + 1}`} className="h-full w-full object-cover" />
                <button
                  type="button"
                  className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={() => onRemovePhoto(index)}
                  onPointerDown={(e) => e.stopPropagation()}
                  aria-label="Remove photo"
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
                    aria-label="Move left"
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
                    aria-label="Move right"
                  >
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Translations ─────────────────────────────── */}
      <div className="space-y-3 rounded-lg border p-4">
        <h3 className="text-sm font-semibold">Jazyky</h3>
        {[
          { code: "en", label: "EN" },
          { code: "uk", label: "UK" },
          { code: "ru", label: "RU" },
        ].map((item) => (
          <div key={item.code} className="grid grid-cols-[40px_1fr_1fr_1fr] items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">{item.label}</span>
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
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-3 pt-2">
        <Button type="submit">{t("save")}</Button>
        <Button type="button" variant="ghost" onClick={onReset}>
          <Plus className="mr-2 h-4 w-4" />
          {t("new")}
        </Button>
      </div>
    </form>
  );
}
