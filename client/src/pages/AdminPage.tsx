import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createTour, deleteTour, fetchAdminMe, fetchAdminTours, importAlexandria, updateTour, updateTourOrder } from "../api";
import { type OwnTour } from "../data";
import { formatPrice } from "../utils";
import { useLanguage } from "../hooks/useLanguage";
import AdminLayout from "../components/AdminLayout";
import ConfirmDialog from "../components/ConfirmDialog";
import "../admin.css";

const API_BASE = import.meta.env.VITE_API_URL || "";

const emptyForm: OwnTour = {
  destination: "",
  title: "SkyTravel Signature",
  price: 0,
  startDate: "",
  endDate: "",
  transport: "plane",
  description: "",
  image: "",
  i18n: {},
};

export default function AdminPage() {
  const { t } = useLanguage();
  const [tours, setTours] = useState<OwnTour[]>([]);
  const [form, setForm] = useState<OwnTour>(emptyForm);
  const [photos, setPhotos] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [ordering, setOrdering] = useState<OwnTour[]>([]);
  const [orderDirty, setOrderDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [alexImporting, setAlexImporting] = useState(false);
  const [alexResult, setAlexResult] = useState<string | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    fetchAdminMe()
      .then(() => fetchAdminTours())
      .then((items) => setTours(items))
      .catch(() => {
        navigate("/admin-login");
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  const sortedTours = useMemo(() => {
    return [...tours].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }, [tours]);

  useEffect(() => {
    setOrdering(sortedTours);
    setOrderDirty(false);
  }, [sortedTours]);

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setPhotos([]);
  }

  async function handleAlexandriaImport() {
    setAlexImporting(true);
    setAlexResult(null);
    try {
      const result = await importAlexandria();
      if (result.ok && result.total !== undefined) {
        setAlexResult(
          `Import dokončen: ${result.created ?? 0} nových, ${result.updated ?? 0} aktualizovaných (celkem ${result.total}).`
        );
        const refreshed = await fetchAdminTours();
        setTours(refreshed);
      } else {
        setAlexResult(result.message ?? "Import se nezdařil – zkontrolujte strukturu XML.");
      }
    } catch (err) {
      setAlexResult(err instanceof Error ? err.message : "Chyba při importu.");
    } finally {
      setAlexImporting(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!form.destination || !form.title || !form.price || !form.startDate || !form.endDate || !form.transport) {
      setError("Vyplňte prosím všechny povinné údaje.");
      return;
    }

    if (photos.length === 0) {
      setError("Přidejte prosím alespoň jednu fotku.");
      return;
    }

    const payload: OwnTour = {
      ...form,
      startDate: form.startDate ? new Date(`${form.startDate}T00:00:00`).toISOString() : undefined,
      endDate: form.endDate ? new Date(`${form.endDate}T00:00:00`).toISOString() : undefined,
      photos,
      image: photos[0],
    };

    try {
      if (editingId) {
        const updated = await updateTour(editingId, payload);
        setTours((prev) => prev.map((item) => (item.id === editingId ? updated : item)));
      } else {
        const created = await createTour(payload);
        setTours((prev) => [created, ...prev]);
      }
      resetForm();
    } catch {
      setError("Uložení se nezdařilo.");
    }
  }

  function handleEdit(tour: OwnTour) {
    const start = tour.startDate ? new Date(tour.startDate) : null;
    const end = tour.endDate ? new Date(tour.endDate) : null;
    setEditingId(tour.id ?? null);
    setForm({
      destination: tour.destination,
      title: tour.title,
      price: tour.price,
      description: tour.description,
      startDate: start && !Number.isNaN(start.getTime()) ? start.toISOString().slice(0, 10) : "",
      endDate: end && !Number.isNaN(end.getTime()) ? end.toISOString().slice(0, 10) : "",
      transport: tour.transport,
      image: tour.image,
      i18n: tour.i18n ?? {},
    });
    if (tour.photos && tour.photos.length > 0) {
      setPhotos(tour.photos);
    } else if (tour.image) {
      setPhotos([tour.image]);
    } else {
      setPhotos([]);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id?: number) {
    if (!id) return;
    setConfirmDeleteId(id);
  }

  async function performDelete() {
    if (!confirmDeleteId) return;
    try {
      await deleteTour(confirmDeleteId);
      setTours((prev) => prev.filter((item) => item.id !== confirmDeleteId));
      if (editingId === confirmDeleteId) {
        resetForm();
      }
      setConfirmDeleteId(null);
    } catch {
      setError("Smazání se nezdařilo.");
      setConfirmDeleteId(null);
    }
  }

  function moveOrder(index: number, direction: number) {
    setOrdering((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setOrderDirty(true);
  }

  async function saveOrder() {
    const ids = ordering
      .map((item) => item.id)
      .filter((id): id is number => typeof id === "number" && Number.isFinite(id));
    if (ids.length === 0) return;
    try {
      await updateTourOrder(ids);
      setOrderDirty(false);
      const refreshed = await fetchAdminTours();
      setTours(refreshed);
    } catch {
      setError("Uložení pořadí se nezdařilo.");
    }
  }

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      Array.from(files).forEach((file) => formData.append("images", file));
      const res = await fetch(
        `${API_BASE}/api/admin/uploads`,
        {
          method: "POST",
          body: formData,
          credentials: "include",
        }
      );
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      const urls = (data.urls || []) as string[];
      const normalized = urls.map((url) => (url.startsWith("/") ? `${API_BASE}${url}` : url));
      setPhotos((prev) => [...prev, ...normalized]);
    } catch {
      setError("Upload se nezdařil.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  function updateI18n(langKey: string, field: "destination" | "title" | "description", value: string) {
    setForm((prev) => ({
      ...prev,
      i18n: {
        ...(prev.i18n || {}),
        [langKey]: {
          ...(prev.i18n?.[langKey] || {}),
          [field]: value,
        },
      },
    }));
  }

  const previewPhotos = useMemo(() => {
    return photos.length > 0
      ? photos
      : ["https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1800&q=80"];
  }, [photos]);

  const previewTransportLabel = useMemo(() => {
    const map: Record<string, string> = {
      plane: "Letecky",
      train: "Vlakem",
      bus: "Autobusem",
      car: "Vlastní doprava",
      boat: "Lodí",
    };
    return map[form.transport || "plane"] || "Dle nabídky";
  }, [form.transport]);

  const previewTerm = useMemo(() => {
    if (!form.startDate || !form.endDate) return "Vyberte termín";
    const start = new Date(form.startDate);
    const end = new Date(form.endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "Vyberte termín";
    return `${start.toLocaleDateString("cs-CZ")} – ${end.toLocaleDateString("cs-CZ")}`;
  }, [form.startDate, form.endDate]);

  useEffect(() => {
    if (previewIndex >= previewPhotos.length) {
      setPreviewIndex(0);
    }
  }, [previewPhotos, previewIndex]);

  return (
    <AdminLayout title="Admin panel nabídek">
        <section className="admin-card builder-card">
          <h2>{t("editOwn")}</h2>
          <p className="note">{t("editNote")}</p>

          <div className="builder-grid">
            <form id="tourForm" className="tour-form" onSubmit={handleSubmit}>
              <input id="tourId" type="hidden" value={editingId ?? ""} readOnly />

            <label htmlFor="destination">{t("labelDestination")}</label>
            <input
              id="destination"
              value={form.destination}
              onChange={(event) => setForm({ ...form, destination: event.target.value })}
              required
            />

            <label htmlFor="title">{t("labelBadge")}</label>
            <input
              id="title"
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              required
            />

            <label htmlFor="price">{t("labelPrice")}</label>
            <input
              id="price"
              type="number"
              min={1000}
              step={10}
              value={form.price || ""}
              onChange={(event) => setForm({ ...form, price: Number(event.target.value) })}
              required
            />

            <div className="form-row">
              <div>
                <label htmlFor="startDate">Od</label>
                <input
                  id="startDate"
                  type="date"
                  value={form.startDate || ""}
                  onChange={(event) => setForm({ ...form, startDate: event.target.value })}
                  required
                />
              </div>
              <div>
                <label htmlFor="endDate">Do</label>
                <input
                  id="endDate"
                  type="date"
                  value={form.endDate || ""}
                  onChange={(event) => setForm({ ...form, endDate: event.target.value })}
                  required
                />
              </div>
            </div>

            <label htmlFor="transport">Doprava</label>
            <select
              id="transport"
              value={form.transport || "plane"}
              onChange={(event) => setForm({ ...form, transport: event.target.value })}
              required
            >
              <option value="plane">Letecky</option>
              <option value="train">Vlakem</option>
              <option value="bus">Autobusem</option>
              <option value="car">Vlastní doprava</option>
              <option value="boat">Lodí</option>
            </select>

            <label htmlFor="description">Popis</label>
            <textarea
              id="description"
              rows={3}
              value={form.description || ""}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
            />

            <div className="upload-row">
              <label htmlFor="upload">Upload fotek</label>
              <div className="file-upload">
                <label className="file-button" htmlFor="upload">Vybrat soubory</label>
                <span className="file-hint">nebo přetáhněte fotky sem</span>
                <input
                  id="upload"
                  className="file-input"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleUpload}
                />
              </div>
              {uploading && <span className="note">Nahrávám...</span>}
              {photos.length > 0 && (
                <div
                  className="photo-row"
                  onDragOver={handleDragOver}
                  onDragLeave={() => setDragOverIndex(null)}
                >
                  {photos.map((photo, index) => (
                    <div
                      key={photo}
                      className={`photo-chip${dragIndex === index ? " is-dragging" : ""}${dragOverIndex === index ? " is-drop-target" : ""}`}
                      draggable
                      onDragStart={(event) => handleDragStart(index, event)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(event) => {
                        handleDragOver(event);
                        setDragOverIndex(index);
                      }}
                      onDrop={(event) => handleDrop(index, event)}
                      onDragEnter={() => setDragOverIndex(index)}
                    >
                      <img src={photo} alt={`Photo ${index + 1}`} />
                      <button
                        type="button"
                        className="chip-remove"
                        onClick={() => removePhoto(index)}
                        onPointerDown={(event) => event.stopPropagation()}
                        aria-label="Remove photo"
                      >
                        ×
                      </button>
                      <div className="chip-actions">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            movePhoto(index, "left");
                          }}
                          onPointerDown={(event) => event.stopPropagation()}
                          disabled={index === 0}
                          aria-label="Move left"
                        >
                          ←
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            movePhoto(index, "right");
                          }}
                          onPointerDown={(event) => event.stopPropagation()}
                          disabled={index === photos.length - 1}
                          aria-label="Move right"
                        >
                          →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="translation-block">
              <h3>Jazyky</h3>
              {[
                { code: "en", label: "EN" },
                { code: "uk", label: "UK" },
                { code: "ru", label: "RU" },
              ].map((item) => (
                <div key={item.code} className="translation-row">
                  <span>{item.label}</span>
                  <input
                    type="text"
                    placeholder="Destinace"
                    value={form.i18n?.[item.code]?.destination || ""}
                    onChange={(event) => updateI18n(item.code, "destination", event.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Badge"
                    value={form.i18n?.[item.code]?.title || ""}
                    onChange={(event) => updateI18n(item.code, "title", event.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Popis"
                    value={form.i18n?.[item.code]?.description || ""}
                    onChange={(event) => updateI18n(item.code, "description", event.target.value)}
                  />
                </div>
              ))}
            </div>

            {error && <p className="note">{error}</p>}

              <div className="form-actions">
                <button type="submit" id="saveBtn">
                  {t("save")}
                </button>
                <button type="button" id="resetBtn" className="ghost" onClick={resetForm}>
                  {t("new")}
                </button>
              </div>
            </form>

            <aside className="preview-panel">
              <div className="preview-header">
                <h3>Preview šablony</h3>
                <span>{previewTransportLabel}</span>
              </div>
              <div className="preview-carousel">
                <button
                  type="button"
                  className="carousel-btn"
                  onClick={() =>
                    setPreviewIndex((prev) => (prev - 1 + previewPhotos.length) % previewPhotos.length)
                  }
                >
                  ‹
                </button>
                <div className="preview-image">
                  <img src={previewPhotos[previewIndex]} alt="Preview" loading="lazy" />
                </div>
                <button
                  type="button"
                  className="carousel-btn"
                  onClick={() => setPreviewIndex((prev) => (prev + 1) % previewPhotos.length)}
                >
                  ›
                </button>
              </div>
              <div className="preview-dots">
                {previewPhotos.map((_, index) => (
                  <button
                    key={index}
                    type="button"
                    className={index === previewIndex ? "is-active" : ""}
                    onClick={() => setPreviewIndex(index)}
                    aria-label={`Slide ${index + 1}`}
                  />
                ))}
              </div>
              <div className="preview-body">
                <div className="preview-pill">{form.title || "SkyTravel Signature"}</div>
                <h4>{form.destination || "Destinace / Hotel"}</h4>
                <p>
                  {form.description ||
                    "Tady bude krátký popis zájezdu – hlavní benefity, pro koho je určen a proč je zajímavý."}
                </p>
                <div className="preview-meta">
                  <div>
                    <span>Termín</span>
                    <strong>{previewTerm}</strong>
                  </div>
                  <div>
                    <span>Cena od</span>
                    <strong>{form.price ? `${formatPrice(Number(form.price))}` : "Kč"}</strong>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </section>

        <section className="admin-card">
          <h2>Import CK Alexandria</h2>
          <p className="note">
            Načte nabídky z XML feedu CK Alexandria a uloží je jako zájezdy. Stávající zájezdy se aktualizují, nové se přidají.
          </p>
          <div className="form-actions">
            <button
              type="button"
              onClick={handleAlexandriaImport}
              disabled={alexImporting}
            >
              {alexImporting ? "Importuji…" : "Importovat nabídky z Alexandrie"}
            </button>
          </div>
          {alexResult && <p className="note">{alexResult}</p>}
        </section>

        <section className="admin-card">
          <h2>{t("listOwn")}</h2>
          <div className="order-controls">
            <span>Pořadí nabídek na hlavní stránce</span>
            <button type="button" onClick={saveOrder} disabled={!orderDirty}>
              Uložit pořadí
            </button>
          </div>
          {loading && (
            <div className="table-skeleton">
              <div className="skeleton-row" />
              <div className="skeleton-row" />
              <div className="skeleton-row" />
            </div>
          )}
          {!loading && ordering.length === 0 && (
            <div className="empty-state">
              <strong>Zatím žádné nabídky</strong>
              <p>Začněte vytvořením nové nabídky nahoře.</p>
            </div>
          )}
          {!loading && ordering.length > 0 && (
            <div className="table-wrap">
              <div className="table-header">
                <span>Nabídka</span>
                <span>Cena</span>
                <span>Pořadí</span>
                <span>Akce</span>
              </div>
              {ordering.map((tour, index) => (
                <div key={tour.id} className="table-row">
                  <div className="table-cell table-offer">
                    <img src={tour.image} alt={tour.destination} />
                    <div>
                      <h3>{tour.destination}</h3>
                      <p>{tour.title}</p>
                    </div>
                  </div>
                  <div className="table-cell">
                    <strong>od {formatPrice(Number(tour.price))}</strong>
                  </div>
                  <div className="table-cell table-order">
                    <button type="button" onClick={() => moveOrder(index, -1)}>▲</button>
                    <button type="button" onClick={() => moveOrder(index, 1)}>▼</button>
                  </div>
                  <div className="table-cell table-actions">
                    <button className="edit" type="button" onClick={() => handleEdit(tour)}>
                      Edit
                    </button>
                    <button className="remove" type="button" onClick={() => handleDelete(tour.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

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

  function movePhoto(index: number, direction: "left" | "right") {
    setPhotos((prev) => {
      const next = [...prev];
      const target = direction === "left" ? index - 1 : index + 1;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  function handleDragStart(index: number, event: React.DragEvent<HTMLDivElement>) {
    setDragIndex(index);
    event.dataTransfer.setData("text/plain", String(index));
    event.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
  }

  function handleDragEnd() {
    setDragIndex(null);
    setDragOverIndex(null);
  }

  function handleDrop(targetIndex: number, event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const sourceIndex =
      dragIndex !== null ? dragIndex : Number(event.dataTransfer.getData("text/plain"));
    if (!Number.isFinite(sourceIndex)) return;
    if (sourceIndex === targetIndex) return;
    setPhotos((prev) => {
      const next = [...prev];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
    setDragIndex(null);
    setDragOverIndex(null);
  }

}
