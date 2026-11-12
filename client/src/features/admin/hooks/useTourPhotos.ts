import { useCallback, useState } from "react";
import { uploadAdminImages } from "../services/adminApi";

const API_BASE = import.meta.env.VITE_API_URL || "";

export function useTourPhotos(initialPhotos: string[] = []) {
  const [photos, setPhotos] = useState<string[]>(initialPhotos);
  const [uploading, setUploading] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const resetPhotos = useCallback((newPhotos: string[]) => {
    setPhotos(newPhotos);
  }, []);

  /**
   * Uploads image files and appends them to the gallery.
   * Resolves to an error message (Czech) or null on success.
   */
  const uploadFiles = useCallback(async (files: File[]): Promise<string | null> => {
    const images = files.filter((file) => file.type.startsWith("image/"));
    if (images.length === 0) {
      return files.length > 0 ? "Vyberte prosím obrázky (JPG, PNG, WebP)." : null;
    }
    setUploading(true);
    try {
      // uploadAdminImages goes through csrfFetch; a plain fetch is rejected by
      // the CSRF middleware on /api/admin.
      const { urls } = await uploadAdminImages(images);
      const normalized = urls.map((url) => (url.startsWith("/") ? `${API_BASE}${url}` : url));
      setPhotos((prev) => [...prev, ...normalized]);
      return null;
    } catch (err) {
      return err instanceof Error ? err.message : "Nahrání fotek se nezdařilo.";
    } finally {
      setUploading(false);
    }
  }, []);

  const handleUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>): Promise<string | null> => {
      const files = Array.from(event.target.files ?? []);
      event.target.value = "";
      return uploadFiles(files);
    },
    [uploadFiles],
  );

  const movePhoto = useCallback((index: number, direction: "left" | "right") => {
    setPhotos((prev) => {
      const next = [...prev];
      const target = direction === "left" ? index - 1 : index + 1;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }, []);

  const removePhoto = useCallback((index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleDragStart = useCallback((index: number, event: React.DragEvent<HTMLDivElement>) => {
    setDragIndex(index);
    event.dataTransfer.setData("text/plain", String(index));
    event.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  const handleDragEnd = useCallback(() => {
    setDragIndex(null);
    setDragOverIndex(null);
  }, []);

  const handleDrop = useCallback(
    (targetIndex: number, event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const sourceIndex =
        dragIndex !== null ? dragIndex : Number(event.dataTransfer.getData("text/plain"));
      if (!Number.isFinite(sourceIndex) || sourceIndex === targetIndex) return;
      setPhotos((prev) => {
        const next = [...prev];
        const [moved] = next.splice(sourceIndex, 1);
        next.splice(targetIndex, 0, moved);
        return next;
      });
      setDragIndex(null);
      setDragOverIndex(null);
    },
    [dragIndex],
  );

  return {
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
  };
}
