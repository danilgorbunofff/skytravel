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
      setError(null);

      if (!form.destination || !form.title || !form.price || !form.startDate || !form.endDate || !form.transport) {
        setError("Vyplňte prosím všechny povinné údaje.");
        return false;
      }

      if (photos.length === 0) {
        setError("Přidejte prosím alespoň jednu fotku.");
        return false;
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
        return true;
      } catch {
        setError("Uložení se nezdařilo.");
        return false;
      }
    },
    [form, editingId, resetForm],
  );

  const handleEdit = useCallback((tour: OwnTour): string[] => {
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
    window.scrollTo({ top: 0, behavior: "smooth" });

    if (tour.photos && tour.photos.length > 0) return tour.photos;
    if (tour.image) return [tour.image];
    return [];
  }, []);

  const handleDelete = useCallback((id?: number) => {
    if (!id) return;
    setConfirmDeleteId(id);
  }, []);

  const performDelete = useCallback(async () => {
    if (!confirmDeleteId) return;
    try {
      await deleteTour(confirmDeleteId);
      setTours((prev) => prev.filter((item) => item.id !== confirmDeleteId));
      if (editingId === confirmDeleteId) resetForm();
      setConfirmDeleteId(null);
    } catch {
      setError("Smazání se nezdařilo.");
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

  const saveOrder = useCallback(async () => {
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
  }, [ordering]);

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
