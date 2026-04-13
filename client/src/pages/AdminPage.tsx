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
import AdminAlexandriaImport from "../features/admin/components/AdminAlexandriaImport";

export default function AdminPage() {
  const { t } = useLanguage();

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
    setTours,
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
      if (ok) resetPhotos([]);
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
    <AdminLayout title="Admin panel nabídek">
        {/* ── Tour Builder ─────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>{t("editOwn")}</CardTitle>
            <p className="text-sm text-muted-foreground">{t("editNote")}</p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
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

        {/* ── Alexandria Import ─────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>Import CK Alexandria</CardTitle>
            <p className="text-sm text-muted-foreground">
              Načte nabídky z XML feedu CK Alexandria a uloží je jako zájezdy. Stávající zájezdy se aktualizují, nové se přidají.
            </p>
          </CardHeader>
          <CardContent>
            <AdminAlexandriaImport onToursRefreshed={setTours} />
          </CardContent>
        </Card>

        {/* ── Tour Listing ──────────────────────────────── */}
        <Card>
          <CardHeader>
            <AdminTourOrderList
              ordering={ordering}
              loading={loading}
              orderDirty={orderDirty}
              onSaveOrder={saveOrder}
              onMoveOrder={moveOrder}
              onEdit={onEdit}
              onDelete={handleDelete}
              t={t}
            />
          </CardHeader>
        </Card>

        <ConfirmDialog
          isOpen={confirmDeleteId !== null}
          title="Smazat nabídku?"
          message="Opravdu chcete tuto nabídku smazat? Tato akce je nevratná."
          confirmLabel="Smazat"
          onConfirm={performDelete}
          onCancel={() => setConfirmDeleteId(null)}
        />
    </AdminLayout>
  );
}
