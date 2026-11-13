import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { OwnTour } from "../types";
import {
  fetchAdminMe,
  fetchAdminTours,
  createTour,
  updateTour,
  deleteTour,
  updateTourOrder,
} from "../services/adminApi";

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

export { emptyForm };

export function useAdminTours() {
  const navigate = useNavigate();
  const [tours, setTours] = useState<OwnTour[]>([]);
  const [form, setForm] = useState<OwnTour>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [ordering, setOrdering] = useState<OwnTour[]>([]);
  const [orderDirty, setOrderDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);

  useEffect(() => {
    fetchAdminMe()
      .then(() => fetchAdminTours())
      .then((items) => setTours(items))
      .catch(() => navigate("/admin-login"))
      .finally(() => setLoading(false));
  }, [navigate]);

  const sortedTours = useMemo(
    () => [...tours].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [tours],
  );

  useEffect(() => {
    setOrdering(sortedTours);
    setOrderDirty(false);
  }, [sortedTours]);

  const resetForm = useCallback(() => {
    setForm(emptyForm);
    setEditingId(null);
  }, []);

  const handleSubmit = useCallback(
    async (photos: string[]) => {
      if (submitting) return false;
      setError(null);

      if (
        !form.destination ||
        !form.title ||
        !form.price ||
        !form.startDate ||
        !form.endDate ||
        !form.transport
      ) {
        setError("Vyplňte prosím všechny povinné údaje.");
        return false;
      }

      if (photos.length === 0) {
        setError("Přidejte prosím alespoň jednu fotku.");
        return false;
      }

      const payload: OwnTour = {
        ...form,
        startDate: form.startDate
          ? new Date(`${form.startDate}T00:00:00`).toISOString()
          : undefined,
        endDate: form.endDate ? new Date(`${form.endDate}T00:00:00`).toISOString() : undefined,
        photos,
        image: photos[0],
      };

      setSubmitting(true);
      try {
        if (editingId) {
          const updated = await updateTour(editingId, payload);
          setTours((prev) => prev.map((item) => (item.id === editingId ? updated : item)));
        } else {
          const created = await createTour(payload);
          setTours((prev) => [created, ...prev]);
        }
        resetForm();
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Uložení se nezdařilo.");
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [form, editingId, resetForm, submitting],
  );

  /** Loads a tour into the form. Returns the form and photos it was loaded with. */
  const handleEdit = useCallback((tour: OwnTour): { form: OwnTour; photos: string[] } => {
    const start = tour.startDate ? new Date(tour.startDate) : null;
    const end = tour.endDate ? new Date(tour.endDate) : null;
    const nextForm: OwnTour = {
      destination: tour.destination,
      title: tour.title,
      price: tour.price,
      description: tour.description,
      startDate: start && !Number.isNaN(start.getTime()) ? start.toISOString().slice(0, 10) : "",
      endDate: end && !Number.isNaN(end.getTime()) ? end.toISOString().slice(0, 10) : "",
      transport: tour.transport,
      image: tour.image,
      i18n: tour.i18n ?? {},
    };
    setEditingId(tour.id ?? null);
    setForm(nextForm);
    window.scrollTo({ top: 0, behavior: "smooth" });

    const photos =
      tour.photos && tour.photos.length > 0 ? tour.photos : tour.image ? [tour.image] : [];
    return { form: nextForm, photos };
  }, []);

  const handleDelete = useCallback((id?: number) => {
    if (!id) return;
    setConfirmDeleteId(id);
  }, []);

  /** Deletes the tour awaiting confirmation. Throws on failure so the caller can report it. */
  const performDelete = useCallback(async () => {
    if (!confirmDeleteId) return;
    const id = confirmDeleteId;
    try {
      await deleteTour(id);
      setTours((prev) => prev.filter((item) => item.id !== id));
      if (editingId === id) resetForm();
    } finally {
      setConfirmDeleteId(null);
    }
  }, [confirmDeleteId, editingId, resetForm]);

  const moveOrder = useCallback((index: number, direction: number) => {
    setOrdering((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setOrderDirty(true);
  }, []);

  /** Persists the current order. Throws on failure so the caller can report it. */
  const saveOrder = useCallback(async () => {
    const ids = ordering
      .map((item) => item.id)
      .filter((id): id is number => typeof id === "number" && Number.isFinite(id));
    if (ids.length === 0 || savingOrder) return;
    setSavingOrder(true);
    try {
      await updateTourOrder(ids);
      setOrderDirty(false);
      // The order is saved at this point; a failed refresh only means the list
      // keeps the locally reordered copy, which already matches the server.
      const refreshed = await fetchAdminTours().catch(() => null);
      if (refreshed) setTours(refreshed);
    } finally {
      setSavingOrder(false);
    }
  }, [ordering, savingOrder]);

  const updateI18n = useCallback(
    (langKey: string, field: "destination" | "title" | "description", value: string) => {
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
    },
    [],
  );

  return {
    tours,
    form,
    setForm,
    editingId,
    ordering,
    orderDirty,
    loading,
    submitting,
    savingOrder,
    error,
    setError,
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
  };
}
