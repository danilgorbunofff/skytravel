import { useState } from "react";
import AdminLayout from "../components/AdminLayout";
import ConfirmDialog from "../components/ConfirmDialog";
import AdminToastViewport from "../components/admin/AdminToastViewport";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { emptyForm, useAdminTours } from "../features/admin/hooks/useAdminTours";
import { useTourPhotos } from "../features/admin/hooks/useTourPhotos";
import { useTourPreview } from "../features/admin/hooks/useTourPreview";
import { useAdminToast } from "../features/admin/hooks/useAdminToast";
import AdminTourForm from "../features/admin/components/AdminTourForm";
import AdminTourPreview from "../features/admin/components/AdminTourPreview";
import AdminTourOrderList from "../features/admin/components/AdminTourOrderList";
import type { OwnTour } from "../features/admin/types";

type Snapshot = { form: OwnTour; photos: string[] };

/**
 * Stable string for dirty checks: sorted keys, and empty strings / empty
 * objects dropped so typing and then clearing a field does not count as a change.
 */
function snapshotKey(value: unknown): string {
  const clean = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(clean);
    if (v && typeof v === "object") {
      const entries = Object.entries(v as Record<string, unknown>)
        .map(([k, val]) => [k, clean(val)] as const)
        .filter(([, val]) => val !== "" && val !== undefined && val !== null)
        .filter(([, val]) => !(typeof val === "object" && Object.keys(val as object).length === 0))
        .sort(([a], [b]) => a.localeCompare(b));
      return Object.fromEntries(entries);
    }
    return v;
  };
  return JSON.stringify(clean(value));
}

export default function AdminPage() {
  const { toasts, showToast, dismissToast } = useAdminToast(3500);

  const {
    form,
    setForm,
    editingId,
    ordering,
    orderDirty,
    loading,
    submitting,
    savingOrder,
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
    uploadFiles,
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

  // ── Unsaved-changes guard ──
  const [baseline, setBaseline] = useState<Snapshot>({ form: emptyForm, photos: [] });
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const isDirty = snapshotKey({ form, photos }) !== snapshotKey(baseline);

  /** Runs `action` now, or after the admin confirms discarding unsaved changes. */
  function guardDirty(action: () => void) {
    if (isDirty) setPendingAction(() => action);
    else action();
  }

  async function onFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    const wasEditing = editingId !== null;
    const ok = await handleSubmit(photos);
    if (ok) {
      resetPhotos([]);
      setBaseline({ form: emptyForm, photos: [] });
      showToast(wasEditing ? "Nabídka byla aktualizována." : "Nabídka byla vytvořena.");
    }
  }

  function onFormReset() {
    guardDirty(() => {
      resetForm();
      resetPhotos([]);
      setBaseline({ form: emptyForm, photos: [] });
    });
  }

  function onEdit(tour: OwnTour) {
    guardDirty(() => {
      const loaded = handleEdit(tour);
      resetPhotos(loaded.photos);
      setBaseline(loaded);
    });
  }

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const err = await handleUpload(e);
    if (err) showToast(err, "error");
  }

  async function onDropFiles(files: File[]) {
    const err = await uploadFiles(files);
    if (err) showToast(err, "error");
  }

  async function onSaveOrder() {
    try {
      await saveOrder();
      showToast("Pořadí bylo uloženo.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Uložení pořadí se nezdařilo.", "error");
    }
  }

  async function onConfirmDelete() {
    const deletingEdited = confirmDeleteId !== null && confirmDeleteId === editingId;
    try {
      await performDelete();
      if (deletingEdited) {
        resetPhotos([]);
        setBaseline({ form: emptyForm, photos: [] });
      }
      showToast("Nabídka byla smazána.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Smazání se nezdařilo.", "error");
    }
  }

  return (
    <AdminLayout title="Správa nabídek">
      <AdminToastViewport toasts={toasts} onDismiss={dismissToast} />

      {/* ── Section 1: Tour Builder ────────────────── */}
      <section>
        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-muted/30 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <span className="text-lg font-bold">1</span>
              </div>
              <div>
                <CardTitle className="text-lg">
                  {editingId ? "Upravit nabídku" : "Editace exkluzivních nabídek"}
                </CardTitle>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Změny se ihned projeví na hlavní stránce v sekci exkluzivních nabídek.
                </p>
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
                submitting={submitting}
                photos={photos}
                uploading={uploading}
                dragIndex={dragIndex}
                dragOverIndex={dragOverIndex}
                onSubmit={onFormSubmit}
                onReset={onFormReset}
                onUpload={onUpload}
                onDropFiles={onDropFiles}
                onMovePhoto={movePhoto}
                onRemovePhoto={removePhoto}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
                onDragEnter={(index) => setDragOverIndex(index)}
                onDragLeave={() => setDragOverIndex(null)}
                onDrop={handleDrop}
                onUpdateI18n={updateI18n}
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
                <CardTitle className="text-lg">Vaše SkyTravel nabídky</CardTitle>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Správa pořadí a nabídek na hlavní stránce
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-5">
            <AdminTourOrderList
              ordering={ordering}
              loading={loading}
              orderDirty={orderDirty}
              savingOrder={savingOrder}
              onSaveOrder={onSaveOrder}
              onMoveOrder={moveOrder}
              onEdit={onEdit}
              onDelete={handleDelete}
            />
          </CardContent>
        </Card>
      </section>

      <ConfirmDialog
        isOpen={confirmDeleteId !== null}
        title="Smazat nabídku?"
        message="Opravdu chcete tuto nabídku smazat? Tato akce je nevratná."
        confirmLabel="Smazat"
        onConfirm={onConfirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />

      <ConfirmDialog
        isOpen={pendingAction !== null}
        title="Zahodit neuložené změny?"
        message="Formulář obsahuje neuložené změny. Pokud budete pokračovat, budou ztraceny."
        confirmLabel="Zahodit změny"
        cancelLabel="Pokračovat v úpravách"
        onConfirm={() => {
          pendingAction?.();
          setPendingAction(null);
        }}
        onCancel={() => setPendingAction(null)}
      />
    </AdminLayout>
  );
}
