import { useState, useCallback } from "react";
import { useLanguage } from "../hooks/useLanguage";
import AdminLayout from "../components/AdminLayout";
import ConfirmDialog from "../components/ConfirmDialog";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { useAdminTours } from "../features/admin/hooks/useAdminTours";
import { useTourPhotos } from "../features/admin/hooks/useTourPhotos";
import { useTourPreview } from "../features/admin/hooks/useTourPreview";
import AdminTourForm from "../features/admin/components/AdminTourForm";
import AdminTourPreview from "../features/admin/components/AdminTourPreview";
import AdminTourOrderList from "../features/admin/components/AdminTourOrderList";
import { Check } from "lucide-react";

export default function AdminPage() {
  const { t } = useLanguage();
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const {
    form,
    setForm,
    editingId,
    ordering,
    orderDirty,
    loading,
    error,
    confirmDeleteId,
    setConfirmDeleteId,
    resetForm,
    handleSubmit,
    handleEdit,
    handleDelete,
    performDelete,
    moveOrder,
    saveOrder,
    updateI18n,
  } = useAdminTours();

  const {
    photos,
    uploading,
    dragIndex,
    dragOverIndex,
    setDragOverIndex,
    resetPhotos,
    handleUpload,
    movePhoto,
    removePhoto,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDrop,
  } = useTourPhotos();

  const {
    previewPhotos,
    previewIndex,
    setPreviewIndex,
    previewTransportLabel,
    previewTerm,
    prevSlide,
    nextSlide,
  } = useTourPreview(form, photos);

  function onFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    handleSubmit(photos).then((ok) => {
      if (ok) {
        resetPhotos([]);
        showToast(editingId ? "Nabídka byla aktualizována." : "Nabídka byla vytvořena.");
      }
    });
  }

  function onFormReset() {
    resetForm();
    resetPhotos([]);
  }

  function onEdit(tour: import("../features/admin/types").OwnTour) {
    const newPhotos = handleEdit(tour);
    resetPhotos(newPhotos);
  }

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const err = await handleUpload(e);
    if (err) setForm((prev) => ({ ...prev })); // trigger re-render if needed
  }

  return (
    <AdminLayout title="Správa nabídek">
        {/* ── Toast ──────────────────────────────────── */}
        {toast && (
          <div
            className={`fixed right-4 top-4 z-50 flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium shadow-lg transition-all animate-in fade-in slide-in-from-top-2 ${
              toast.type === "success"
                ? "border-green-200 bg-green-50 text-green-800"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            {toast.type === "success" && <Check className="h-4 w-4" />}
            {toast.message}
          </div>
        )}

        {/* ── Section 1: Tour Builder ────────────────── */}
        <section>
          <Card className="overflow-hidden">
            <CardHeader className="border-b bg-muted/30 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <span className="text-lg font-bold">1</span>
                </div>
                <div>
                  <CardTitle className="text-lg">{editingId ? "Upravit nabídku" : t("editOwn")}</CardTitle>
                  <p className="mt-0.5 text-sm text-muted-foreground">{t("editNote")}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid gap-8 xl:grid-cols-[1fr_380px]">
                <AdminTourForm
                  form={form}
                  setForm={setForm}
                  editingId={editingId}
                  error={error}
                  photos={photos}
                  uploading={uploading}
                  dragIndex={dragIndex}
                  dragOverIndex={dragOverIndex}
                  onSubmit={onFormSubmit}
                  onReset={onFormReset}
                  onUpload={onUpload}
                  onMovePhoto={movePhoto}
                  onRemovePhoto={removePhoto}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDragEnd={handleDragEnd}
                  onDragEnter={(index) => setDragOverIndex(index)}
                  onDragLeave={() => setDragOverIndex(null)}
                  onDrop={handleDrop}
                  onUpdateI18n={updateI18n}
                  t={t}
                />

                <AdminTourPreview
                  form={form}
                  previewPhotos={previewPhotos}
                  previewIndex={previewIndex}
                  setPreviewIndex={setPreviewIndex}
                  previewTransportLabel={previewTransportLabel}
                  previewTerm={previewTerm}
                  onPrev={prevSlide}
                  onNext={nextSlide}
                />
              </div>
            </CardContent>
          </Card>
        </section>

        {/* ── Section 2: Tour Listing ────────────────── */}
        <section>
          <Card>
            <CardHeader className="border-b bg-muted/30 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <span className="text-lg font-bold">2</span>
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">{t("listOwn")}</CardTitle>
                  <p className="mt-0.5 text-sm text-muted-foreground">Správa pořadí a nabídek na hlavní stránce</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-5">
              <AdminTourOrderList
                ordering={ordering}
                loading={loading}
                orderDirty={orderDirty}
                onSaveOrder={() => {
                  saveOrder();
                  showToast("Pořadí bylo uloženo.");
                }}
                onMoveOrder={moveOrder}
                onEdit={onEdit}
                onDelete={handleDelete}
                t={t}
              />
            </CardContent>
          </Card>
        </section>

        <ConfirmDialog
          isOpen={confirmDeleteId !== null}
          title="Smazat nabídku?"
          message="Opravdu chcete tuto nabídku smazat? Tato akce je nevratná."
          confirmLabel="Smazat"
          onConfirm={() => {
            performDelete();
            showToast("Nabídka byla smazána.");
          }}
          onCancel={() => setConfirmDeleteId(null)}
        />
    </AdminLayout>
  );
}
